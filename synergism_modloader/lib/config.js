const fs = require('fs')
const path = require('path')

// ─── Channels ────────────────────────────────────────────────────────────
// The mod is published from two different forks: an in-progress "dev" build
// and the stabilized "live" build. Each fork hosts BOTH the in-page mod
// script and its matching shared patcher.js at the same path, so a
// given channel+ref always resolves both files from the SAME repo — never
// mixing a mod script from one fork with a patcher.js from another.
const CHANNELS = {
    live: {
        label: 'Live',
        repo: 'Ferlieloi/synergism-hypersynergy',
        defaultRef: 'master',
        description: 'Stable, released builds.'
    },
    dev: {
        label: 'Dev',
        repo: 'maenhiir/synergism-hypersynergy',
        defaultRef: 'master',
        description: 'In-progress / experimental builds.'
    }
}

// Hidden "local" channel: the mod's dev server (start-dev-server.bat) on this
// machine, like the browser dev userscript. Never offered to players: main.js
// enables it only when running from source or with HS_LOADER_DEV=1.
const LOCAL_CHANNEL_ID = 'local'
const LOCAL_CHANNEL = {
    label: 'Local',
    repo: '127.0.0.1:8080',
    defaultRef: 'local',
    description: 'Local dev server (start-dev-server.bat).',
    local: true,
    modUrl: 'http://127.0.0.1:8080/hypersynergism.js',
    patcherUrl: 'http://127.0.0.1:8080/synergism_modloader/lib/patcher.js'
}
let localChannelEnabled = false

// ─── Defaults ────────────────────────────────────────────────────────────
const DEFAULTS = {
    steamAppName: 'Synergism',
    exeName: 'Synergism-win-x64.exe',

    channels: CHANNELS,
    defaultChannel: 'live',

    // Paths are the same inside every channel's repo (same project, two forks).
    modReleasePath: 'release/mod/hypersynergism_release.js',
    patcherPath: 'synergism_modloader/lib/patcher.js'
}

function setLocalChannelEnabled(enabled) {
    localChannelEnabled = Boolean(enabled)
}

function availableChannels() {
    return localChannelEnabled
        ? { ...DEFAULTS.channels, [LOCAL_CHANNEL_ID]: LOCAL_CHANNEL }
        : DEFAULTS.channels
}

// An unknown or hidden channel (e.g. "local" saved by a dev session) resolves to the default one.
function resolveChannel(channelId) {
    return availableChannels()[channelId] || DEFAULTS.channels[DEFAULTS.defaultChannel]
}

function listChannels() {
    return Object.entries(availableChannels()).map(([id, c]) => ({
        id,
        label: c.label,
        repo: c.repo,
        description: c.description,
        defaultRef: c.defaultRef,
        local: Boolean(c.local)
    }))
}

function configFilePath(app) {
    return path.join(app.getPath('userData'), 'loader-config.json')
}

function loadConfig(app) {
    const file = configFilePath(app)
    try {
        const raw = fs.readFileSync(file, 'utf-8')
        return { ...emptyConfig(), ...JSON.parse(raw) }
    } catch {
        return emptyConfig()
    }
}

function saveConfig(app, config) {
    const file = configFilePath(app)
    fs.mkdirSync(path.dirname(file), { recursive: true })
    fs.writeFileSync(file, JSON.stringify(config, null, 2), 'utf-8')
}

function emptyConfig() {
    return {
        steamPath: '',     // root Steam install, e.g. C:\Program Files (x86)\Steam
        gameDir: '',       // resolved .../steamapps/common/Synergism
        sevenZipPath: '',  // path to 7z.exe (full version, needed for NSIS extraction)
        channel: DEFAULTS.defaultChannel, // 'live' or 'dev' — picks which fork everything comes from
        modRef: '',        // branch/tag within that channel's repo ('' = let the UI pick the channel default)
        lastPlayedChannel: '',
        lastPlayedModRef: '',
        lastPlayedLocal: false, // the last launch used the hidden local channel (lib/gameLauncher.js)
        refDateCache: {},   // commit dates keyed by SHA, to limit GitHub API requests
        refListCache: {},   // last successful branch/tag list for each channel
        lastPatchedExe: '',     // launchable exe produced by the last successful patch
        lastPatchedSourceStat: null, // { size, mtimeMs } of the original exe at patch time
        lastPatchedPatcherHash: '',  // patcher.js used by that patch (lib/patcherSource.js); '' = patched by a loader up to 0.2.8
        lastPatchedInjectorHash: '', // injector written by that patch (lib/injectorTemplate.js)
        lastPatchedFormat: 0,        // PATCH_FORMAT of that patch (lib/patchGame.js); 0 = patched by a loader up to 0.2.9
        lastPatchedChannel: '',
        lastPatchedModRef: ''
    }
}

module.exports = {
    DEFAULTS, CHANNELS, LOCAL_CHANNEL_ID, setLocalChannelEnabled,
    resolveChannel, listChannels, loadConfig, saveConfig, configFilePath
}
