const fs = require('fs')
const rawFs = process.versions.electron ? require('original-fs') : fs
const path = require('path')
const { execFile } = require('child_process')
const { setTimeout: delay } = require('timers/promises')

const ACTIVE_NAME = '__hs_work_current'
const STAGING_NAME = '__hs_work_staging'
const PREVIOUS_NAME = '__hs_work_previous'
const LEGACY_NAME = /^__hs_work_\d+_\d+$/

function workspacePaths(gameDir) {
    return {
        active: path.join(gameDir, ACTIVE_NAME),
        staging: path.join(gameDir, STAGING_NAME),
        previous: path.join(gameDir, PREVIOUS_NAME)
    }
}

function removeDirectory(dir) {
    rawFs.rmSync(dir, { recursive: true, force: true, maxRetries: 8, retryDelay: 250 })
}

function removeRequired(dir) {
    try {
        removeDirectory(dir)
    } catch (error) {
        throw new Error(`Could not clear ${path.basename(dir)}: ${error.message}. Close Synergism and try again; if it is already closed, check the file named in this error.`)
    }
}

function removeBestEffort(dir, log) {
    try {
        removeDirectory(dir)
        return true
    } catch (error) {
        log?.(`Could not remove ${path.basename(dir)} yet: ${error.message}`)
        return false
    }
}

async function ensureNoRunningWorkGames(gameDir, { platform = process.platform, run = execFile } = {}) {
    if (platform !== 'win32') return

    const root = `${path.resolve(gameDir)}${path.sep}`.replace(/'/g, "''")
    const script = `$root = '${root}'; $count = @(Get-Process -ErrorAction Stop | Where-Object { $_.Path -and $_.Path.StartsWith($root, [StringComparison]::OrdinalIgnoreCase) -and $_.Path.Substring($root.Length) -match '^__hs_work' }).Count; Write-Output $count`
    const count = await new Promise((resolve, reject) => {
        run('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', script], { windowsHide: true, timeout: 15000 }, (error, stdout) => {
            if (error) return reject(new Error(`Could not check whether a patched game is running: ${error.message}`))
            const value = Number.parseInt(stdout.trim(), 10)
            if (!Number.isInteger(value)) return reject(new Error('Could not determine whether a patched game is running.'))
            resolve(value)
        })
    })
    if (count > 0) {
        throw new Error(`Close the running patched Synergism game before patching again (${count} game process${count === 1 ? '' : 'es'} found). You can still use Launch to play the current patch.`)
    }
}

function prepareWorkspace(gameDir) {
    const dirs = workspacePaths(gameDir)

    // A crash between the two renames below must not lose the last good build.
    if (!fs.existsSync(dirs.active) && fs.existsSync(dirs.previous)) {
        fs.renameSync(dirs.previous, dirs.active)
    }
    removeRequired(dirs.previous)
    removeRequired(dirs.staging)
    fs.mkdirSync(dirs.staging)
    return dirs
}

async function renameWithRetry(source, destination, log) {
    for (let attempt = 0; attempt < 20; attempt++) {
        try {
            await fs.promises.rename(source, destination)
            return
        } catch (error) {
            if (!['EPERM', 'EACCES', 'EBUSY', 'ENOTEMPTY'].includes(error.code) || attempt === 19) throw error
            if (attempt === 0) log?.('Waiting for Windows to release the patched game files...')
            await delay(500)
        }
    }
}

async function promoteWorkspace(dirs, log) {
    const hadActive = fs.existsSync(dirs.active)
    if (hadActive) await renameWithRetry(dirs.active, dirs.previous, log)
    try {
        await renameWithRetry(dirs.staging, dirs.active, log)
    } catch (error) {
        if (hadActive) {
            try {
                await renameWithRetry(dirs.previous, dirs.active, log)
            } catch (restoreError) {
                throw new Error(`Could not install the new patch (${error.message}) or restore the previous one (${restoreError.message}). The previous copy is in ${dirs.previous}.`)
            }
        }
        throw new Error(`Could not move the finished patch into place (${error.message}). Close Synergism and retry; if this keeps happening, check write access to the game folder.`)
    }
}

function discardExtractionInputs(stagingDir) {
    // The launchable game is entirely inside app/. NSIS payloads and the
    // unpacked asar sources are large and are no longer needed after repack.
    for (const name of fs.readdirSync(stagingDir)) {
        if (name === 'app') continue
        removeRequired(path.join(stagingDir, name))
    }
}

async function cleanupOldWorkspaces(gameDir, log, {
    remove = dir => rawFs.promises.rm(dir, { recursive: true, force: true, maxRetries: 8, retryDelay: 250 }),
    beforeRemove = async () => {}
} = {}) {
    let entries
    try {
        entries = fs.readdirSync(gameDir, { withFileTypes: true })
    } catch (error) {
        log?.(`Could not scan old work folders: ${error.message}`)
        return { found: 0, removed: 0, failed: 0, error: error.message }
    }
    const oldDirs = entries.filter(entry => entry.isDirectory() && LEGACY_NAME.test(entry.name))
    if (oldDirs.length) await beforeRemove()
    const failures = []
    for (const entry of oldDirs) {
        try {
            await remove(path.join(gameDir, entry.name))
        } catch (error) {
            failures.push({ name: entry.name, error })
        }
    }
    if (oldDirs.length) {
        log?.(`Old patch folders: removed ${oldDirs.length - failures.length}; ${failures.length} could not be removed. No new numbered folders will be created.`)
        for (const failure of failures) {
            log?.(`${failure.name}: ${failure.error.code || 'error'} — ${failure.error.message}`)
        }
    }
    return { found: oldDirs.length, removed: oldDirs.length - failures.length, failed: failures.length, error: null }
}

module.exports = {
    workspacePaths,
    ensureNoRunningWorkGames,
    prepareWorkspace,
    promoteWorkspace,
    renameWithRetry,
    discardExtractionInputs,
    cleanupOldWorkspaces,
    removeBestEffort
}
