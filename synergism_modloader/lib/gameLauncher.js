const fs = require('fs')
const path = require('path')
const { spawn } = require('child_process')
const { DEFAULTS, LOCAL_CHANNEL_ID, loadConfig, saveConfig } = require('./config')

async function launchGame({ app, exePath, modUrl, channel, modRef, spawnProcess = spawn }) {
    if (!exePath || !fs.existsSync(exePath)) {
        return { ok: false, error: 'Patched exe not found — run the patch step first.' }
    }

    try {
        const env = modUrl ? { ...process.env, HS_MOD_URL: modUrl } : process.env
        const child = spawnProcess(exePath, [], {
            cwd: path.dirname(exePath), detached: true, stdio: 'ignore', env
        })
        await new Promise((resolve, reject) => {
            child.once('spawn', resolve)
            child.once('error', reject)
        })
        child.unref()
    } catch (error) {
        return { ok: false, error: error.message }
    }

    // Public channels only: the hidden local channel is never remembered as "last played".
    // It only sets lastPlayedLocal, so that the loader run from source selects it again at start.
    const isPublic = DEFAULTS.channels[channel] && typeof modRef === 'string' && modRef
    if (isPublic || channel === LOCAL_CHANNEL_ID) {
        try {
            const cfg = loadConfig(app)
            saveConfig(app, isPublic
                ? { ...cfg, lastPlayedChannel: channel, lastPlayedModRef: modRef, lastPlayedLocal: false }
                : { ...cfg, lastPlayedLocal: true })
        } catch (error) {
            return { ok: true, warning: `Game launched, but the loader could not remember this version: ${error.message}` }
        }
    }
    return { ok: true }
}

module.exports = { launchGame }
