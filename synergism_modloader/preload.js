const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('loader', {
    reportStartupError: message => ipcRenderer.invoke('startup:failed', message),
    loadConfig: () => ipcRenderer.invoke('config:load'),
    saveConfig: (partial) => ipcRenderer.invoke('config:save', partial),
    cleanupLegacyWorkspaces: () => ipcRenderer.invoke('legacy:cleanup'),

    getLauncherUpdateStatus: () => ipcRenderer.invoke('launcher-update:status'),
    checkLauncherUpdate: () => ipcRenderer.invoke('launcher-update:check'),
    installLauncherUpdate: () => ipcRenderer.invoke('launcher-update:install'),
    onLauncherUpdate: (callback) => {
        const listener = (_e, status) => callback(status)
        ipcRenderer.on('launcher-update:status', listener)
        return () => ipcRenderer.removeListener('launcher-update:status', listener)
    },

    autodetectSteam: () => ipcRenderer.invoke('steam:autodetect'),
    locateGame: (steamPath) => ipcRenderer.invoke('steam:locate-game', steamPath),
    selectSteamFolder: () => ipcRenderer.invoke('dialog:select-steam-folder'),

    autodetect7z: () => ipcRenderer.invoke('sevenzip:autodetect'),
    select7z: () => ipcRenderer.invoke('dialog:select-7z'),

    getChannels: () => ipcRenderer.invoke('channels:list'),
    getModRefs: (channel) => ipcRenderer.invoke('mod:get-refs', channel),
    resolveModUrl: (channel, ref) => ipcRenderer.invoke('mod:resolve-url', channel, ref),
    resolvePatcherUrl: (channel, ref) => ipcRenderer.invoke('patcher:resolve-url', channel, ref),

    runPatch: (args) => ipcRenderer.invoke('patch:run', args),
    checkUpdateNeeded: (args) => ipcRenderer.invoke('game:check-update-needed', args),
    checkPatcherChanged: (args) => ipcRenderer.invoke('patcher:check-changed', args),
    checkVersionMismatch: (args) => ipcRenderer.invoke('mod:check-version-mismatch', args),
    quickSwitchMod: (args) => ipcRenderer.invoke('mod:quick-switch', args),
    launchGame: (exePath, modUrl, channel, modRef) => ipcRenderer.invoke('game:launch', exePath, modUrl, channel, modRef),

    openPath: (target) => ipcRenderer.invoke('shell:open-path', target),
    openExternal: (url) => ipcRenderer.invoke('shell:open-external', url),
    copyText: (text) => ipcRenderer.invoke('clipboard:write', text),

    onPatchLog: (callback) => {
        const listener = (_e, line) => callback(line)
        ipcRenderer.on('patch:log', listener)
        return () => ipcRenderer.removeListener('patch:log', listener)
    }
})
