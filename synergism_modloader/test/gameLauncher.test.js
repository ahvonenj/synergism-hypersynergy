const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')
const { EventEmitter } = require('node:events')
const { launchGame } = require('../lib/gameLauncher')
const { loadConfig, saveConfig } = require('../lib/config')

function fixture(t) {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'hs-launcher-test-'))
    const dataDir = path.join(root, 'userData')
    const exePath = path.join(root, 'game.exe')
    fs.writeFileSync(exePath, '')
    t.after(() => {
        fs.rmSync(exePath)
        const configPath = path.join(dataDir, 'loader-config.json')
        if (fs.existsSync(configPath)) fs.rmSync(configPath)
        if (fs.existsSync(dataDir)) fs.rmdirSync(dataDir)
        fs.rmdirSync(root)
    })
    return { app: { getPath: () => dataDir }, exePath }
}

function childThatEmits(event, error) {
    const child = new EventEmitter()
    child.unref = () => {}
    queueMicrotask(() => child.emit(event, error))
    return child
}

test('remembers the build only after the game process starts', async t => {
    const { app, exePath } = fixture(t)
    saveConfig(app, { ...loadConfig(app), channel: 'dev', modRef: 'browsed-tag' })
    const result = await launchGame({
        app, exePath, modUrl: 'https://example.com/mod.js', channel: 'live', modRef: 'v2.14.4a',
        spawnProcess: (_exe, _args, options) => {
            assert.equal(options.env.HS_MOD_URL, 'https://example.com/mod.js')
            return childThatEmits('spawn')
        }
    })

    assert.equal(result.ok, true)
    const saved = loadConfig(app)
    assert.equal(saved.lastPlayedChannel, 'live')
    assert.equal(saved.lastPlayedModRef, 'v2.14.4a')
    assert.equal(saved.modRef, 'browsed-tag')
})

test('a local launch keeps the last played build and only sets lastPlayedLocal, a public launch clears it', async t => {
    const { app, exePath } = fixture(t)
    saveConfig(app, { ...loadConfig(app), lastPlayedChannel: 'dev', lastPlayedModRef: 'master' })
    const launch = (channel, modRef) => launchGame({
        app, exePath, channel, modRef, spawnProcess: () => childThatEmits('spawn')
    })

    assert.equal((await launch('local', 'local')).ok, true)
    let saved = loadConfig(app)
    assert.equal(saved.lastPlayedLocal, true)
    assert.equal(saved.lastPlayedChannel, 'dev')
    assert.equal(saved.lastPlayedModRef, 'master')

    assert.equal((await launch('live', 'v2.14.5')).ok, true)
    saved = loadConfig(app)
    assert.equal(saved.lastPlayedLocal, false)
    assert.equal(saved.lastPlayedChannel, 'live')
})

test('a failed launch does not replace the previously played build', async t => {
    const { app, exePath } = fixture(t)
    saveConfig(app, { ...loadConfig(app), lastPlayedChannel: 'dev', lastPlayedModRef: 'v2.13.5' })
    const result = await launchGame({
        app, exePath, channel: 'live', modRef: 'v2.14.4a',
        spawnProcess: () => childThatEmits('error', new Error('Launch blocked'))
    })

    assert.equal(result.ok, false)
    assert.match(result.error, /Launch blocked/)
    assert.equal(loadConfig(app).lastPlayedModRef, 'v2.13.5')
})
