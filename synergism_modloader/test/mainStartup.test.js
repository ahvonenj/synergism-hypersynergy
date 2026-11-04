const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')
const { EventEmitter } = require('node:events')

function loadMain(overrides = {}, { hasLock = true } = {}) {
    const handlers = new Map()
    const app = new EventEmitter()
    const windows = []
    let quits = 0
    let completeDetection
    let cleanedGameDir
    Object.assign(app, {
        requestSingleInstanceLock: () => hasLock,
        whenReady: () => Promise.resolve(),
        getVersion: () => 'test',
        getGPUFeatureStatus: () => ({}),
        quit: () => { quits++ }
    })
    class BrowserWindow extends EventEmitter {
        constructor() { super(); this.webContents = { send: () => {} }; this.minimized = true; this.focused = 0; windows.push(this) }
        setMenuBarVisibility() {}
        loadFile() { return Promise.resolve() }
        isDestroyed() { return false }
        isMinimized() { return this.minimized }
        restore() { this.minimized = false }
        focus() { this.focused++ }
    }
    const modules = {
        electron: { app, BrowserWindow, ipcMain: { handle: (name, handler) => handlers.set(name, handler) } },
        path,
        fs: { existsSync: () => false },
        'electron-updater': { autoUpdater: {} },
        './lib/startupDiagnostics': { createStartupDiagnostics: () => ({ log() {}, report() {}, watchWindow() {} }) },
        './lib/config': {
            loadConfig: () => ({}),
            // main.js calls it when it loads (the hidden "local" channel)
            setLocalChannelEnabled: () => {},
            DEFAULTS: { exeName: 'game.exe', steamAppName: 'Synergism' }
        },
        './lib/steamLocator': {
            detectSteamPathWindows: () => new Promise(resolve => { completeDetection = resolve }),
            findGameDir: steamPath => { assert.equal(steamPath, '/steam'); return '/game' },
            getBundledSevenZipPath: () => null,
            detectSevenZip: async () => '/7zip/7z.exe'
        },
        './lib/launcherUpdater': { createLauncherUpdater: () => ({}) },
        './lib/workspaceManager': {
            cleanupOldWorkspaces: async gameDir => { cleanedGameDir = gameDir; return { removed: 1 } }
        },
        './lib/patchGame': {}, './lib/patcherSource': {}, './lib/injectorTemplate': {},
        './lib/modRefs': {}, './lib/modRefCache': {}, './lib/gameLauncher': {},
        ...overrides
    }
    vm.runInNewContext(fs.readFileSync(path.join(__dirname, '..', 'main.js'), 'utf-8'), {
        require: name => {
            assert.ok(Object.hasOwn(modules, name), `Unexpected require: ${name}`)
            return modules[name]
        },
        __dirname: path.join(__dirname, '..'),
        process,
        setTimeout: () => {}
    })
    return { app, handlers, windows, finishDetection: value => completeDetection(value), quits: () => quits, cleanedGameDir: () => cleanedGameDir }
}

test('a second loader opens no window and quits', async () => {
    const main = loadMain({}, { hasLock: false })
    await new Promise(resolve => setImmediate(resolve))
    assert.equal(main.windows.length, 0)
    assert.equal(main.quits(), 1)
})

test('starting a second loader brings the first one back, restored if minimized', async () => {
    const main = loadMain()
    main.app.emit('second-instance') // before its window exists: nothing to do
    await new Promise(resolve => setImmediate(resolve))
    assert.equal(main.windows.length, 1)
    assert.equal(main.quits(), 0)
    main.app.emit('second-instance')
    assert.equal(main.windows[0].minimized, false)
    assert.equal(main.windows[0].focused, 1)
})

test('closing the launcher quits while startup registry detection is still pending', async () => {
    const main = loadMain()
    const loading = main.handlers.get('config:load')()
    await new Promise(resolve => setImmediate(resolve))
    main.app.emit('window-all-closed')
    assert.equal(main.quits(), 1)
    main.finishDetection('/steam')
    const config = await loading
    assert.equal(config.steamPath, '/steam')
    assert.equal(config.gameDir, '/game')
    assert.equal(config.sevenZipPath, '/7zip/7z.exe')
})

test('legacy cleanup waits for asynchronous detection and receives the resolved game directory', async () => {
    const main = loadMain()
    const cleanup = main.handlers.get('legacy:cleanup')()
    assert.equal(main.cleanedGameDir(), undefined)
    main.finishDetection('/steam')
    const result = await cleanup
    assert.equal(main.cleanedGameDir(), '/game')
    assert.equal(result.removed, 1)
})

test('manual Steam and 7-Zip IPC detection returns paths instead of promises inside the result', async () => {
    const main = loadMain()
    const detection = main.handlers.get('steam:autodetect')()
    main.finishDetection('/steam')
    const result = await detection
    assert.equal(result.steamPath, '/steam')
    assert.equal(result.gameDir, '/game')
    assert.equal(await main.handlers.get('sevenzip:autodetect')(), '/7zip/7z.exe')
})

// A loader whose config says the game was patched, with what that patch recorded.
function loadPatchedMain({ config, existing = [], checkPatcherChanged = async () => ({ needsRepatch: false, reason: 'same' }) }) {
    return loadMain({
        fs: { existsSync: file => existing.includes(file), statSync: () => ({ size: 10, mtimeMs: 20 }) },
        './lib/config': {
            loadConfig: () => config,
            setLocalChannelEnabled: () => {},
            DEFAULTS: { exeName: 'game.exe', steamAppName: 'Synergism' }
        },
        './lib/patchGame': { buildPatcherUrl: (channel, ref) => `patcher:${channel}@${ref}`, PATCH_FORMAT: 7 },
        './lib/patcherSource': { checkPatcherChanged },
        './lib/injectorTemplate': { injectorHash: () => 'injector-now' }
    })
}

test('the patcher check gets the recorded patcher and the selected build, and a failing check asks for nothing', async () => {
    const config = { lastPatchedExe: '/work/game.exe', lastPatchedPatcherHash: 'patcher-then', lastPatchedInjectorHash: 'injector-now' }
    let received
    const main = loadPatchedMain({ config, checkPatcherChanged: async args => { received = args; return { needsRepatch: true, reason: 'changed' } } })
    const result = await main.handlers.get('patcher:check-changed')(null, { channel: 'dev', modRef: 'master' })
    assert.equal(result.needsRepatch, true)
    assert.equal(received.lastHash, 'patcher-then')
    assert.equal(received.patcherUrl, 'patcher:dev@master')
    assert.ok(received.timeoutMs > 0)

    const broken = loadPatchedMain({ config, checkPatcherChanged: async () => { throw new Error('boom') } })
    const failed = await broken.handlers.get('patcher:check-changed')(null, { channel: 'dev', modRef: 'master' })
    assert.equal(failed.needsRepatch, false)
    assert.equal(failed.reason, 'unknown')
})

test('a game patched with another injector needs a patch, without any download', async () => {
    const neverCalled = async () => { assert.fail('the patcher should not be checked') }
    const config = { lastPatchedExe: '/work/game.exe', lastPatchedPatcherHash: 'patcher-then', lastPatchedInjectorHash: 'injector-then' }
    const main = loadPatchedMain({ config, checkPatcherChanged: neverCalled })
    const result = await main.handlers.get('patcher:check-changed')(null, { channel: 'dev', modRef: 'master' })
    assert.equal(result.needsRepatch, true)
    assert.equal(result.reason, 'injector')

    const unpatched = loadPatchedMain({ config: {}, checkPatcherChanged: neverCalled })
    const nothing = await unpatched.handlers.get('patcher:check-changed')(null, { channel: 'dev', modRef: 'master' })
    assert.equal(nothing.needsRepatch, false)
    assert.equal(nothing.reason, 'not-patched')
})

test('a patched copy that is gone needs a patch, and so do a game exe that changed and a copy built another way', () => {
    const gameExe = path.join('/game', 'game.exe')
    const config = { lastPatchedExe: '/work/game.exe', lastPatchedSourceStat: { size: 10, mtimeMs: 20 }, lastPatchedFormat: 7 }
    const check = (cfg, existing) => {
        const result = loadPatchedMain({ config: cfg, existing }).handlers.get('game:check-update-needed')(null, { gameDir: '/game', exeName: 'game.exe' })
        return [result.needsRepatch, result.reason]
    }
    assert.deepEqual(check(config, [gameExe, '/work/game.exe']), [false, undefined])
    assert.deepEqual(check(config, [gameExe]), [true, 'missing'])
    assert.deepEqual(check({ ...config, lastPatchedSourceStat: { size: 11, mtimeMs: 20 } }, [gameExe, '/work/game.exe']), [true, undefined])
    assert.deepEqual(check({}, [gameExe]), [true, undefined])
    // Patched by a loader up to 0.2.9 (no number), or by one that built the copy another way
    assert.deepEqual(check({ ...config, lastPatchedFormat: undefined }, [gameExe, '/work/game.exe']), [true, 'format'])
    assert.deepEqual(check({ ...config, lastPatchedFormat: 6 }, [gameExe, '/work/game.exe']), [true, 'format'])
})
