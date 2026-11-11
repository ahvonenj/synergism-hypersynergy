const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')

test('shared patcher supports installed Steam loaders and browser loaders', () => {
    const source = fs.readFileSync(path.join(__dirname, '../lib/patcher.js'), 'utf8')
    const moduleShim = { exports: {} }
    const quietConsole = { log() {}, warn() {} }
    // Match the evaluation used by Loader 0.2.6 and earlier.
    const load = new Function('module', 'exports', 'console', source + '\nreturn module.exports')
    const patcher = load(moduleShim, moduleShim.exports, quietConsole)

    assert.equal(typeof patcher, 'function')
    assert.equal(typeof patcher.patchBundle, 'function')
    assert.equal(typeof patcher.startBrowserLoader, 'function')

    // saveSynergy's Steam cloud throttle: the manual trigger is removed on Steam only
    const saveSynergy = 'bo=(e=!1)=>{e&&ok().then(()=>{el.textContent=s.t("testing.gameSaved")});' +
        '{let o=Date.now();(e||o-eG>=6e4)&&(eG=o,zY(r))}return!0}'
    assert.ok(patcher(saveSynergy).includes('{let o=Date.now();(o - eG >= 6e4)&&(eG=o,zY(r))}'))
    assert.ok(patcher.patchBundle(saveSynergy, { log() {}, warn() {} }).includes('(e||o-eG>=6e4)&&'))
})

test('Steam auto-sync: only the one throttle test in saveSynergy', () => {
    const { patchBundle } = require('../lib/patcher.js')
    const run = code => {
        const warnings = []
        const patched = patchBundle(code, { steam: true, log() {}, warn: (...a) => warnings.push(a.join(' ')) })
        return { patched, warnings: warnings.filter(w => w.includes('Steam auto-sync')) }
    }
    const saveSynergy = (sync = '(e||o-eG>=6e4)&&(eG=o,zY(r))') =>
        `bo=(e=!1)=>{e&&ok().then(()=>{el.textContent=s.t("testing.gameSaved")});{let o=Date.now();${sync}}return!0}`
    const elsewhere = 'xQ=e=>{let t=Date.now();(e||t-qq>=6e4)&&f()},'

    const found = run(`${elsewhere}${saveSynergy()}`)
    assert.deepEqual(found.warnings, [])
    assert.ok(found.patched.includes('(e||t-qq>=6e4)&&f()'))
    assert.ok(found.patched.includes('(o - eG >= 6e4)&&(eG=o,zY(r))'))

    // Not in saveSynergy, or twice there: untouched, with a warning
    for (const code of [elsewhere, saveSynergy('(e||o-eG>=6e4)&&(eG=o),(e||o-eH>=6e4)&&zY(r)')]) {
        const { patched, warnings } = run(code)
        assert.equal(warnings.length, 1)
        assert.ok(!patched.includes(' >= 6e4'))
    }
})
