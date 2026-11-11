const fs = require('fs')
const path = require('path')
const { execFile } = require('child_process')
const asar = require('@electron/asar')
const { buildInjectorCode, injectorHash } = require('./injectorTemplate')
const { createPackageAndWait, readUnpackedDirs } = require('./archiveWriter')
const { DEFAULTS, resolveChannel } = require('./config')
const { loadPatcher } = require('./patcherSource')
const {
    ensureNoRunningWorkGames,
    prepareWorkspace,
    promoteWorkspace,
    renameWithRetry,
    discardExtractionInputs,
    cleanupOldWorkspaces,
    removeBestEffort
} = require('./workspaceManager')

// A download that hangs must not hang the patch: past this, the bundled patcher is used.
const PATCHER_DOWNLOAD_TIMEOUT_MS = 15000

// How a patcher warning starts in the patch log; the window shows these lines apart.
const PATCH_WARNING_PREFIX = '[PATCH] WARNING:'

// How the patched copy is built, apart from the patcher and the injector, which have their own hashes.
// Raise it when a loader change needs the game patched again: a copy with another number asks for a patch.
// 1: the game's native modules stay outside app.asar, as in the original (loader 0.2.10).
const PATCH_FORMAT = 1

const quoteArg = (arg) => (/[\s"]/.test(arg) || arg === '' ? `"${arg.replace(/"/g, '\\"')}"` : arg)

function run(cmd, args, onLog) {
    return new Promise((resolve, reject) => {
        onLog?.(`$ ${[cmd, ...args].map(quoteArg).join(' ')}`)
        execFile(cmd, args, { maxBuffer: 1024 * 1024 * 64 }, (err, stdout, stderr) => {
            if (stdout) onLog?.(stdout.trim())
            if (stderr) onLog?.(stderr.trim())
            if (err) return reject(err)
            resolve()
        })
    })
}

// Electron treats .asar files as virtual folders and can keep the game archive
// open until the launcher exits. Access it as a normal file while patching.
async function withRawArchiveAccess(action) {
    const previous = process.noAsar
    process.noAsar = true
    try {
        return await action()
    } finally {
        process.noAsar = previous
    }
}

// Picks the most likely launchable exe inside the extracted, patched app dir.
// electron-builder NSIS payloads put the runtime exe at the root of the
// extracted folder, named after productName.
function findLaunchableExe(extractedAppDir) {
    const entries = fs.readdirSync(extractedAppDir, { withFileTypes: true })
    const exeCandidates = entries
        .filter(e => e.isFile() && e.name.toLowerCase().endsWith('.exe'))
        .map(e => e.name)
        .filter(name => !/^uninstall/i.test(name))

    if (exeCandidates.length === 0) return null
    // Prefer an exe that is NOT a generic electron.exe leftover, if multiple exist
    const preferred = exeCandidates.find(n => !/^electron\.exe$/i.test(n))
    return path.join(extractedAppDir, preferred ?? exeCandidates[0])
}

/**
 * Runs a patcher.js source on the game bundle, with the patcher's own messages sent to the log.
 * A warning is a patch step the patcher could not apply, usually after a game update: the patch
 * still succeeds, and the mod lacks that hook.
 *
 * @param {string} patcherCode
 * @param {string} original  The game's out.js
 * @param {(line: string) => void} [log]
 * @returns {{ patched: string, warnings: number }}
 */
function runPatcher(patcherCode, original, log) {
    const moduleShim = { exports: {} }
    const fn = new Function('module', 'exports', patcherCode + '\nreturn module.exports')
    const patcher = fn(moduleShim, moduleShim.exports)
    const patchBundle = typeof patcher === 'function' ? patcher : patcher.patchBundle
    if (typeof patchBundle !== 'function') throw new Error('patcher.js did not export patchBundle')

    const text = parts => parts.map(part => (part instanceof Error ? part.message : String(part))).join(' ')
    let warnings = 0
    const patched = patchBundle(original, {
        steam: true,
        log: (...parts) => log?.(`[PATCH] ${text(parts)}`),
        warn: (...parts) => {
            warnings++
            log?.(`${PATCH_WARNING_PREFIX} ${text(parts)}`)
        }
    })
    return { patched, warnings }
}

/**
 * Runs the full extract → patch → repack pipeline.
 *
 * @param {object} opts
 * @param {string} opts.gameDir        Steam install dir for the game (contains the original exe)
 * @param {string} opts.exeName        Name of the original game exe inside gameDir
 * @param {string} opts.sevenZipPath   Full path to 7z.exe or 7za.exe (the loader's own)
 * @param {string} opts.modUrl         Resolved URL for the mod script to inject
 * @param {string} [opts.patcherUrl]   Optional remote URL for patcher.js; falls back to the bundled copy
 * @param {(line: string) => void} [opts.onLog]
 * @returns {Promise<{ launchExePath: string, sourceStat: { size: number, mtimeMs: number }, patcherHash: string, injectorHash: string, patchFormat: number, patchWarnings: number }>}
 *          `patcherHash` and `injectorHash` identify what was written into the game (lib/patcherSource.js,
 *          lib/injectorTemplate.js), `patchFormat` how the copy was built (PATCH_FORMAT);
 *          `patchWarnings` counts the patch steps that could not be applied
 */
async function patchGame(opts) {
    const { gameDir, exeName, sevenZipPath, modUrl, patcherUrl, onLog } = opts
    const log = (msg) => onLog?.(msg)

    const exePath = path.join(gameDir, exeName)
    if (!fs.existsSync(exePath)) {
        throw new Error(`Game exe not found at: ${exePath}`)
    }
    if (!sevenZipPath || !fs.existsSync(sevenZipPath)) {
        throw new Error('7-Zip not found. Reinstall the loader, or choose a 7z.exe on the first screen.')
    }

    const sourceStat = fs.statSync(exePath)

    // Build in a fixed staging folder, then swap it into place only after
    // patching succeeds. Repeated failures cannot accumulate numbered copies.
    await ensureNoRunningWorkGames(gameDir)
    const dirs = prepareWorkspace(gameDir)
    const workDir = dirs.staging
    const exeExtractDir = path.join(workDir, 'exe')
    const app7zPath = path.join(exeExtractDir, '$PLUGINSDIR', 'app-64.7z')
    const extractedAppDir = path.join(workDir, 'app')
    const asarPath = path.join(extractedAppDir, 'resources', 'app.asar')
    const extractAsarDir = path.join(workDir, 'asar')
    const preloadPath = path.join(extractAsarDir, 'electron', 'preload.js')

    log('Starting full patch process')

    try {
        // 1. Extract the NSIS-packaged exe. The full 7-Zip opens it as an installer and gives its files,
        // app-64.7z among them. 7za has no NSIS module: it finds app-64.7z, stored uncompressed in the exe,
        // and gives the app itself.
        log('Extracting game exe...')
        await run(sevenZipPath, ['x', exePath, `-o${exeExtractDir}`, '-y'], log)

        // 2. Extract the embedded app archive, when the first step didn't
        if (fs.existsSync(app7zPath)) {
            log('Extracting app-64.7z...')
            await run(sevenZipPath, ['x', app7zPath, `-o${extractedAppDir}`, '-y'], log)
        } else if (await withRawArchiveAccess(() => fs.existsSync(path.join(exeExtractDir, 'resources', 'app.asar')))) {
            // Raw access: Electron would open the archive to check it, and keep it open, locking the folder.
            await renameWithRetry(exeExtractDir, extractedAppDir, log)
        } else {
            throw new Error('Neither app-64.7z nor the game app found after exe extraction — installer layout may have changed')
        }
        // 3. Extract app.asar as a real file, without Electron holding it open.
        log('Extracting app.asar...')
        let unpackedDirs = []
        await withRawArchiveAccess(async () => {
            if (!fs.existsSync(asarPath)) {
                throw new Error('app.asar not found — installer layout may have changed')
            }
            // The library keeps each archive's file list by path, and the staging path never changes:
            // without this, a second patch would read the game with the first patch's list.
            asar.uncache(asarPath)
            unpackedDirs = readUnpackedDirs(asar, asarPath)
            await asar.extractAll(asarPath, extractAsarDir)
        })

        const outJsPath = path.join(extractAsarDir, 'dist', 'dist', 'out.js')
        if (!fs.existsSync(outJsPath)) {
            throw new Error(`out.js not found at: ${outJsPath}`)
        }

        // 4. Get the bundle patcher: the selected ref's own, or the copy shipped with the loader.
        log('Loading bundle patcher...')
        const { code: patcherCode, hash: patcherHash } = await loadPatcher(patcherUrl, {
            onLog: log, timeoutMs: PATCHER_DOWNLOAD_TIMEOUT_MS
        })

        log('Patching out.js...')
        const original = fs.readFileSync(outJsPath, 'utf-8')
        const { patched, warnings: patchWarnings } = runPatcher(patcherCode, original, log)
        fs.writeFileSync(outJsPath, patched)
        log(patchWarnings
            ? `out.js patched with ${patchWarnings} warning(s): the mod will lack what those steps add`
            : 'out.js patched successfully')

        // 5. Append the mod injector to preload.js
        if (!fs.existsSync(preloadPath)) {
            throw new Error('preload.js not found inside extracted asar')
        }
        let preloadContent = fs.readFileSync(preloadPath, 'utf-8')
        if (!preloadContent.includes('HYPERSYNERGISM INJECTOR')) {
            preloadContent += buildInjectorCode(modUrl)
            fs.writeFileSync(preloadPath, preloadContent)
            log('Injector appended to preload.js')
        } else {
            log('preload.js already patched, skipping')
        }

        // 6. Repack app.asar, with the same directories outside it as in the original
        log('Repacking app.asar...')
        if (unpackedDirs.length) log(`Kept outside app.asar, as in the original: ${unpackedDirs.join(', ')}`)
        await withRawArchiveAccess(() => createPackageAndWait(asar, extractAsarDir, asarPath, unpackedDirs))

        // 7. Locate the exe to launch
        const launchExePath = findLaunchableExe(extractedAppDir)
        if (!launchExePath) {
            throw new Error('Patch finished, but no launchable .exe was found in the extracted app folder')
        }

        discardExtractionInputs(dirs.staging)
        // A game launched while extraction was running would still lock the
        // current copy. Check again before replacing it.
        await ensureNoRunningWorkGames(gameDir)
        await promoteWorkspace(dirs, log)
        removeBestEffort(dirs.previous, log)
        await cleanupOldWorkspaces(gameDir, log)
        const installedExePath = path.join(dirs.active, 'app', path.basename(launchExePath))
        log(`Patch complete — launch exe: ${installedExePath}`)
        return {
            launchExePath: installedExePath,
            sourceStat: { size: sourceStat.size, mtimeMs: sourceStat.mtimeMs },
            patcherHash,
            injectorHash: injectorHash(),
            patchFormat: PATCH_FORMAT,
            patchWarnings
        }
    } finally {
        if (fs.existsSync(dirs.staging)) removeBestEffort(dirs.staging, log)
    }
}

// Each mod URL is made unique: the game keeps the downloaded mod in its browser cache, for one hour
// from the local dev server (http-server) and up to 7 days from a jsDelivr branch (@master), and a
// jsDelivr purge doesn't reach that cache.
function buildModUrl(channelId, ref) {
    const ch = resolveChannel(channelId)
    if (ch.local) return `${ch.modUrl}?t=${Date.now()}`
    const r = ref || ch.defaultRef
    return `https://cdn.jsdelivr.net/gh/${ch.repo}@${r}/${DEFAULTS.modReleasePath}?t=${Date.now()}`
}

// The loader downloads the patcher itself, outside any browser cache: only the local URL is made unique.
function buildPatcherUrl(channelId, ref) {
    const ch = resolveChannel(channelId)
    if (ch.local) return `${ch.patcherUrl}?t=${Date.now()}`
    const r = ref || ch.defaultRef
    return `https://cdn.jsdelivr.net/gh/${ch.repo}@${r}/${DEFAULTS.patcherPath}`
}

module.exports = {
    patchGame, runPatcher, findLaunchableExe, buildModUrl, buildPatcherUrl, withRawArchiveAccess,
    PATCH_WARNING_PREFIX, PATCH_FORMAT
}
