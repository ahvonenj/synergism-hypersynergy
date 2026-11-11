const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')
const { EventEmitter } = require('node:events')
const { createStartupDiagnostics } = require('../lib/startupDiagnostics')

function fixture(t, response = 0) {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'hs-diagnostics-'))
    t.after(() => fs.rmSync(dir, { recursive: true, force: true }))
    const messages = []
    const opened = []
    let quits = 0
    const diagnostics = createStartupDiagnostics({
        app: { getPath: () => dir, quit: () => { quits++ } },
        dialog: { showMessageBox: async options => { messages.push(options); return { response } } },
        shell: { openPath: async target => { opened.push(target) } }
    })
    const window = new EventEmitter()
    window.webContents = new EventEmitter()
    diagnostics.watchWindow(window)
    return { diagnostics, window, messages, opened, dir, quits: () => quits }
}

test('preload failure produces a native error dialog and quits rather than leaving a blank app', async t => {
    const f = fixture(t)
    f.window.webContents.emit('preload-error', {}, 'preload.js', new Error('bridge failed'))
    f.window.webContents.emit('did-fail-load', {}, -2, 'load failed', '', true)
    await new Promise(resolve => setImmediate(resolve))
    assert.equal(f.messages.length, 1)
    assert.match(f.messages[0].detail, /bridge failed/)
    assert.match(f.messages[0].detail, /loader-startup\.log/)
    assert.equal(f.quits(), 1)
    assert.match(fs.readFileSync(f.diagnostics.logPath, 'utf-8'), /bridge failed/)
})

test('renderer crash opens the log folder when requested and still quits', async t => {
    const f = fixture(t, 1)
    f.window.webContents.emit('render-process-gone', {}, { reason: 'crashed', exitCode: 1 })
    await new Promise(resolve => setImmediate(resolve))
    assert.match(f.messages[0].detail, /crashed/)
    assert.deepEqual(f.opened, [f.dir])
    assert.equal(f.quits(), 1)
})

test('subframe and cancelled navigations do not terminate a healthy launcher', t => {
    const f = fixture(t)
    f.window.webContents.emit('did-fail-load', {}, -2, 'load failed', '', false)
    f.window.webContents.emit('did-fail-load', {}, -3, 'aborted', '', true)
    f.window.webContents.emit('did-finish-load')
    assert.equal(f.messages.length, 0)
    assert.equal(f.quits(), 0)
    assert.match(fs.readFileSync(f.diagnostics.logPath, 'utf-8'), /Launcher page loaded/)
})

test('unwritable diagnostics do not prevent startup or error reporting', async t => {
    const f = fixture(t)
    fs.writeFileSync(f.diagnostics.logPath, '')
    fs.rmSync(f.dir, { recursive: true, force: true })
    fs.writeFileSync(f.dir, 'not a directory')
    assert.doesNotThrow(() => f.diagnostics.log('starting'))
    await f.diagnostics.report('Could not start', new Error('startup failed'))
    assert.equal(f.messages.length, 1)
    assert.equal(f.quits(), 1)
})
