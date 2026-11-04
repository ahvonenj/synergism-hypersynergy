const { app, BrowserWindow, ipcMain, dialog, shell, clipboard } = require('electron')
const path = require('path')
const fs = require('fs')
const { createStartupDiagnostics } = require('./lib/startupDiagnostics')
const diagnostics = createStartupDiagnostics({ app, dialog, shell })
diagnostics.log(`Starting loader ${app.getVersion()}; Electron ${process.versions.electron}; ${process.platform} ${process.arch}`)
const { autoUpdater } = require('electron-updater')

const { loadConfig, saveConfig, DEFAULTS, resolveChannel, listChannels, setLocalChannelEnabled } = require('./lib/config')
const { detectSteamPathWindows, findGameDir, detectSevenZip, getBundledSevenZipPath } = require('./lib/steamLocator')
const { patchGame, buildModUrl, buildPatcherUrl, PATCH_FORMAT } = require('./lib/patchGame')
const { checkPatcherChanged } = require('./lib/patcherSource')
const { injectorHash } = require('./lib/injectorTemplate')
const { createLauncherUpdater } = require('./lib/launcherUpdater')
const { listModRefs } = require('./lib/modRefs')
const { rememberedRefs } = require('./lib/modRefCache')
const { launchGame } = require('./lib/gameLauncher')
const { cleanupOldWorkspaces, ensureNoRunningWorkGames } = require('./lib/workspaceManager')

// The hidden "local" channel: only when running from source (npm start) or started with HS_LOADER_DEV=1.
setLocalChannelEnabled(!app.isPackaged || process.env.HS_LOADER_DEV === '1')

const PATCHER_CHECK_TIMEOUT_MS = 5000

let mainWindow
let patchInProgress = false
let legacyCleanupPromise = null
const launcherUpdater = createLauncherUpdater({
    app,
    updater: autoUpdater,
    notify: status => {
        if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('launcher-update:status', status)
        }
    }
})

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 880,
        height: 680,
        minWidth: 720,
        minHeight: 560,
        title: 'Hypersynergism Loader',
        backgroundColor: '#14131a',
        icon: path.join(__dirname, 'assets', 'favicon.ico'),
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            contextIsolation: true,
            nodeIntegration: false,
            sandbox: false
        }
    })
    mainWindow.setMenuBarVisibility(false)
    diagnostics.watchWindow(mainWindow)
    mainWindow.on('closed', () => { mainWindow = null })
    mainWindow.loadFile(path.join(__dirname, 'renderer', 'index.html'))
        .catch(error => diagnostics.report('Could not load the launcher page', error))
}

// One loader at a time: they share the user data folder (browser caches, loader-config.json) and would patch the same
// game folder. npm start and the installed loader count as the same one.
if (app.requestSingleInstanceLock()) {
    app.on('second-instance', () => {
        if (!mainWindow || mainWindow.isDestroyed()) return
        if (mainWindow.isMinimized()) mainWindow.restore()
        mainWindow.focus()
    })
    app.whenReady().then(() => {
        createWindow()
        diagnostics.log(`GPU features: ${JSON.stringify(app.getGPUFeatureStatus())}`)
        setTimeout(() => { void launcherUpdater.check() }, 2000)
    }).catch(error => diagnostics.report('Could not start the launcher', error))
} else {
    const refused = 'Another loader is already open (installed or npm start): it comes to the front, this one closes'
    diagnostics.log(refused)
    console.log(refused)
    app.quit()
}
app.on('window-all-closed', () => {
    diagnostics.log('All windows closed; quitting')
    app.quit()
})
app.on('child-process-gone', (_event, details) => diagnostics.log(`Child process stopped: ${JSON.stringify(details)}`))

function sendLog(line) {
    if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send('patch:log', line)
}

// ─── Launcher updates ──────────────────────────────────────────────────
ipcMain.handle('launcher-update:status', () => launcherUpdater.getStatus())
ipcMain.handle('launcher-update:check', () => launcherUpdater.check())
ipcMain.handle('launcher-update:install', () => {
    if (patchInProgress) return { ok: false, error: 'Wait for game patching to finish before restarting.' }
    return launcherUpdater.install()
})

// ─── Config ─────────────────────────────────────────────────────────────
ipcMain.handle('startup:failed', (_event, message) => diagnostics.report('Could not initialize the launcher interface', new Error(String(message))))

async function resolvedConfig() {
    diagnostics.log('Resolving game and 7-Zip paths')
    const cfg = loadConfig(app)
    if (!cfg.steamPath || !fs.existsSync(cfg.steamPath)) {
        cfg.steamPath = await detectSteamPathWindows() || ''
    }
    if (!cfg.gameDir || !fs.existsSync(path.join(cfg.gameDir, DEFAULTS.exeName))) {
        cfg.gameDir = findGameDir(cfg.steamPath, DEFAULTS.steamAppName) || ''
    }
    if (!cfg.sevenZipPath || !fs.existsSync(cfg.sevenZipPath)) {
        cfg.sevenZipPath = getBundledSevenZipPath(app) || await detectSevenZip() || ''
    }
    diagnostics.log('Path detection finished')
    return cfg
}

ipcMain.handle('config:load', resolvedConfig)
ipcMain.handle('config:save', (_e, partial) => {
    const current = loadConfig(app)
    const next = { ...current, ...partial }
    saveConfig(app, next)
    return next
})

ipcMain.handle('legacy:cleanup', () => {
    if (legacyCleanupPromise) return legacyCleanupPromise
    legacyCleanupPromise = (async () => {
        if (patchInProgress) return { found: 0, removed: 0, failed: 0, error: 'Wait for patching to finish, then retry cleanup.' }
        const gameDir = (await resolvedConfig()).gameDir
        if (!gameDir) return { found: 0, removed: 0, failed: 0, error: null }
        try {
            return await cleanupOldWorkspaces(gameDir, sendLog, {
                beforeRemove: () => ensureNoRunningWorkGames(gameDir)
            })
        } catch (error) {
            const message = error.message.startsWith('Close the running patched Synergism game')
                ? 'Close the patched Synergism game, then retry old folder cleanup.'
                : error.message
            return { found: 0, removed: 0, failed: 0, error: message }
        }
    })().finally(() => { legacyCleanupPromise = null })
    return legacyCleanupPromise
})

// ─── Steam / game / 7-Zip detection ─────────────────────────────────────
ipcMain.handle('steam:autodetect', async () => {
    const steamPath = await detectSteamPathWindows()
    const gameDir = steamPath ? findGameDir(steamPath, DEFAULTS.steamAppName) : null
    return { steamPath, gameDir }
})

ipcMain.handle('steam:locate-game', (_e, steamPath) => {
    return { gameDir: findGameDir(steamPath, DEFAULTS.steamAppName) }
})

ipcMain.handle('dialog:select-steam-folder', async () => {
    const result = await dialog.showOpenDialog(mainWindow, {
        title: 'Select your Steam install folder',
        properties: ['openDirectory']
    })
    if (result.canceled || result.filePaths.length === 0) return null
    return result.filePaths[0]
})

ipcMain.handle('dialog:select-7z', async () => {
    const result = await dialog.showOpenDialog(mainWindow, {
        title: 'Select 7z.exe',
        properties: ['openFile'],
        filters: [{ name: '7z.exe', extensions: ['exe'] }]
    })
    if (result.canceled || result.filePaths.length === 0) return null
    return result.filePaths[0]
})

ipcMain.handle('sevenzip:autodetect', async () => getBundledSevenZipPath(app) || await detectSevenZip())

// ─── Mod channels (dev/live), each its own repo ─────────────────────────
ipcMain.handle('channels:list', () => listChannels())

ipcMain.handle('mod:get-refs', async (_e, channelId) => {
    const ch = resolveChannel(channelId)
    if (ch.local) {
        return {
            refs: [{ name: ch.defaultRef, type: 'dev server', date: null }],
            branchCount: 0,
            tagCount: 0,
            defaultRef: ch.defaultRef,
            datesIncomplete: false,
            message: `Local build from http://${ch.repo} — keep start-dev-server.bat running while patching and playing.`,
            error: null
        }
    }
    try {
        const cfg = loadConfig(app)
        const signal = AbortSignal.timeout(8000)
        const result = await listModRefs(ch.repo, cfg.refDateCache,
            (url, options) => fetch(url, { ...options, signal }))
        const latest = loadConfig(app)
        const cachedDates = latest.refDateCache || {}
        try {
            saveConfig(app, {
                ...latest,
                refDateCache: { ...cachedDates, ...result.dates },
                refListCache: { ...latest.refListCache, [channelId]: result.refs }
            })
        } catch {
            // A cache write failure should not hide the refs that were fetched.
        }
        const { dates, ...visibleResult } = result
        return { ...visibleResult, defaultRef: ch.defaultRef, error: null }
    } catch (e) {
        const refs = rememberedRefs(loadConfig(app), channelId, ch.defaultRef)
        return {
            refs,
            branchCount: refs.filter(ref => ref.type === 'branch').length,
            tagCount: refs.filter(ref => ref.type === 'tag').length,
            defaultRef: ch.defaultRef,
            datesIncomplete: true,
            error: e.message
        }
    }
})

ipcMain.handle('mod:resolve-url', (_e, channelId, ref) => buildModUrl(channelId, ref))
ipcMain.handle('patcher:resolve-url', (_e, channelId, ref) => buildPatcherUrl(channelId, ref))

// ─── Patch + launch ──────────────────────────────────────────────────────
ipcMain.handle('patch:run', async (_e, { gameDir, sevenZipPath, channel, modRef }) => {
    if (patchInProgress) return { ok: false, error: 'A game patch is already running.' }
    patchInProgress = true
    try {
        if (legacyCleanupPromise) {
            sendLog('Finishing old folder cleanup before patching...')
            await legacyCleanupPromise
        }
        const { launchExePath, sourceStat, patcherHash, injectorHash: patchedInjectorHash, patchFormat, patchWarnings } = await patchGame({
            gameDir,
            exeName: DEFAULTS.exeName,
            sevenZipPath,
            modUrl: buildModUrl(channel, modRef),
            patcherUrl: buildPatcherUrl(channel, modRef),
            onLog: sendLog
        })

        const cfg = loadConfig(app)
        saveConfig(app, {
            ...cfg,
            gameDir,
            sevenZipPath,
            channel,
            modRef,
            lastPatchedExe: launchExePath,
            lastPatchedSourceStat: sourceStat,
            lastPatchedPatcherHash: patcherHash,
            lastPatchedInjectorHash: patchedInjectorHash,
            lastPatchedFormat: patchFormat,
            lastPatchedChannel: channel,
            lastPatchedModRef: modRef
        })

        return { ok: true, launchExePath, patchWarnings }
    } catch (e) {
        sendLog(`ERROR: ${e.message}`)
        return { ok: false, error: e.message }
    } finally {
        patchInProgress = false
    }
})

ipcMain.handle('game:check-update-needed', (_e, { gameDir, exeName }) => {
    const cfg = loadConfig(app)
    const exePath = path.join(gameDir, exeName)
    if (!cfg.lastPatchedSourceStat || !fs.existsSync(exePath)) return { needsRepatch: true }
    // The patched copy is gone: the game was reinstalled, or moved to another Steam library.
    if (!cfg.lastPatchedExe || !fs.existsSync(cfg.lastPatchedExe)) return { needsRepatch: true, reason: 'missing' }
    const stat = fs.statSync(exePath)
    const changed = stat.size !== cfg.lastPatchedSourceStat.size || stat.mtimeMs !== cfg.lastPatchedSourceStat.mtimeMs
    if (changed) return { needsRepatch: true }
    // The copy was built by a loader that patched another way (no number: a loader up to 0.2.9).
    if (cfg.lastPatchedFormat !== PATCH_FORMAT) return { needsRepatch: true, reason: 'format' }
    return { needsRepatch: false }
})

// The patcher is only applied by a patch: "Launch only", "Launch last played" and "Quick switch" reuse
// the game as last patched. So a build whose patcher isn't the one the game was patched with needs a
// patch, like a game update does. A check that can't be done never asks for one.
// The same goes for the injector, which comes from the loader itself: it is compared without a download.
ipcMain.handle('patcher:check-changed', async (_e, { channel, modRef }) => {
    if (patchInProgress) return { needsRepatch: false, reason: 'busy' }
    const cfg = loadConfig(app)
    if (!cfg.lastPatchedExe) return { needsRepatch: false, reason: 'not-patched' }
    if (cfg.lastPatchedPatcherHash && cfg.lastPatchedInjectorHash !== injectorHash()) {
        return { needsRepatch: true, reason: 'injector' }
    }
    try {
        return await checkPatcherChanged({
            lastHash: cfg.lastPatchedPatcherHash,
            patcherUrl: buildPatcherUrl(channel, modRef),
            timeoutMs: PATCHER_CHECK_TIMEOUT_MS
        })
    } catch (e) {
        return { needsRepatch: false, reason: 'unknown', error: e.message }
    }
})

ipcMain.handle('mod:quick-switch', (_e, { modUrl, channel, modRef }) => {
    if (patchInProgress) return { ok: false, error: 'Wait for game patching to finish before switching builds.' }
    const cfg = loadConfig(app)
    if (!cfg.lastPatchedExe || !fs.existsSync(cfg.lastPatchedExe)) {
        return { ok: false, error: 'No patched game found — run the full patch first.' }
    }
    try {
        saveConfig(app, { ...cfg, lastPatchedChannel: channel, lastPatchedModRef: modRef })
        return { ok: true }
    } catch (e) {
        return { ok: false, error: e.message }
    }
})

ipcMain.handle('mod:check-version-mismatch', (_e, { channel, modRef }) => {
    const cfg = loadConfig(app)
    if (!cfg.lastPatchedExe) return { mismatch: false }
    const mismatch = cfg.lastPatchedChannel !== channel || cfg.lastPatchedModRef !== modRef
    return { mismatch, lastChannel: cfg.lastPatchedChannel, lastModRef: cfg.lastPatchedModRef }
})

ipcMain.handle('game:launch', (_e, exePath, modUrl, channel, modRef) => {
    if (patchInProgress) return { ok: false, error: 'Wait for game patching to finish before launching.' }
    return launchGame({ app, exePath, modUrl, channel, modRef })
})

ipcMain.handle('shell:open-path', (_e, target) => shell.openPath(target))
ipcMain.handle('shell:open-external', (_e, url) => shell.openExternal(url))
ipcMain.handle('clipboard:write', (_e, text) => clipboard.writeText(String(text)))
