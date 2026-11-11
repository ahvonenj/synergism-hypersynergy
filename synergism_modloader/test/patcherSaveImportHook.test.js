const test = require('node:test')
const assert = require('node:assert/strict')
const { patchBundle } = require('../lib/patcher.js')

// importSynergism's body, in the shape of the minified bundle: the import's error keys, the "exporttest" check,
// a nested callback, then the load (recorded here with the reset flag the game got)
const importBody = (reset = 't') =>
    'if(typeof e!="string"){D(s.t("importexport.unableImport",{reason:"No input file"}));return}' +
    'let o;try{o=JSON.parse(e)}catch(a){D(s.t("importexport.unableImport",{reason:a.message}));return}' +
    `if(o.exporttest==="YES!"||o.exporttest===!0){Rc().catch(i=>{D(s.t("testing.errorSaving"))}),` +
    `loaded.push({save:o,reset:${reset}});return}else{D(s.t("importexport.loadTestInLive"));return}`
const arrowImport = (name = 'Ic') => `${name}=(e,t=!1)=>{${importBody()}}`
// importData, which reads the file and hands it to the import function: shares none of the keys, must stay untouched
const importData = 'tQ=async(e,t)=>{let a=await e.text();return t(a)}'

const save = JSON.stringify({ exporttest: 'YES!' })

const run = (declarations, window, exported = 'Ic') => {
    const warnings = []
    const code = patchBundle(
        `"use strict";const loaded=[],alerts=[],s={t:k=>k},D=k=>alerts.push(k),Rc=()=>Promise.resolve();` +
        `${declarations}return {importSynergism:${exported},loaded,alerts};`,
        { log() {}, warn: (...a) => warnings.push(a.join(' ')) })
    return { game: new Function('window', code)(window), warnings: warnings.filter(w => w.includes('save import hook')), code }
}

test('save import hook: called with the reset flag before the save is loaded', () => {
    const window = {}
    const { game, warnings } = run(`let ${importData},${arrowImport()};`, window)
    assert.deepEqual(warnings, [])
    assert.equal(window.__HS_SAVE_IMPORT_HOOK_PATCHED, true)

    const calls = []
    window.__HS_onSaveImport = reset => calls.push({ reset, loadedBefore: game.loaded.length })

    // A file, a cloud save, the Steam cloud: no reset flag
    game.importSynergism(save)
    // A singularity, an Exalt, the game reset
    game.importSynergism(save, true)
    assert.deepEqual(calls, [{ reset: false, loadedBefore: 0 }, { reset: true, loadedBefore: 1 }])
    assert.deepEqual(game.loaded.map(l => l.reset), [false, true])

    // Called for a refused import too: the hook is at the start of the function
    game.importSynergism('not json')
    assert.equal(calls.length, 3)
    assert.equal(game.loaded.length, 2)
    assert.deepEqual(game.alerts, ['importexport.unableImport'])
})

test('save import hook: the game loads its save without the mod, and when the mod throws', () => {
    const window = {}
    const { game } = run(`let ${arrowImport()};`, window)

    // Older mod: nothing defined
    game.importSynergism(save, true)
    assert.equal(game.loaded.length, 1)

    window.__HS_onSaveImport = () => { throw new Error('mod error') }
    game.importSynergism(save, true)
    assert.equal(game.loaded.length, 2)
})

test('save import hook: function declaration, names starting with "$"', () => {
    const declared = {}
    const first = run(`function Ic(e,t=!1){${importBody()}}`, declared)
    assert.deepEqual(first.warnings, [])
    const calls = []
    declared.__HS_onSaveImport = reset => calls.push(reset)
    first.game.importSynergism(save, true)
    assert.deepEqual(calls, [true])

    const dollar = {}
    const second = run(`let $c=(e,$r=!1)=>{${importBody('$r')}};`, dollar, '$c')
    assert.deepEqual(second.warnings, [])
    dollar.__HS_onSaveImport = reset => calls.push(reset)
    second.game.importSynergism(save)
    assert.deepEqual(calls, [true, false])
    assert.deepEqual(second.game.loaded.map(l => l.reset), [false])
})

test('save import hook: no reset parameter or no import function, bundle left unchanged with a warning', () => {
    const noReset = {}
    const first = run(`let Ic=e=>{${importBody('!1')}};`, noReset)
    assert.equal(first.warnings.length, 1)
    assert.equal(noReset.__HS_SAVE_IMPORT_HOOK_PATCHED, undefined)
    assert.ok(!first.code.includes('__HS_onSaveImport'))
    first.game.importSynergism(save)
    assert.equal(first.game.loaded.length, 1)

    const notFound = {}
    const second = run(`let Ic=(e,t=!1)=>{loaded.push({save:e,reset:t})};`, notFound)
    assert.equal(second.warnings.length, 1)
    assert.equal(notFound.__HS_SAVE_IMPORT_HOOK_PATCHED, undefined)
    assert.ok(!second.code.includes('__HS_onSaveImport'))
})

test('save import hook: a default value with parentheses before the body', () => {
    const window = {}
    const { game, warnings } = run(`let ${importData},Ic=(e,t=Boolean(0))=>{${importBody()}};`, window)
    assert.deepEqual(warnings, [])
    const calls = []
    window.__HS_onSaveImport = reset => calls.push(reset)
    game.importSynergism(save)
    game.importSynergism(save, true)
    assert.deepEqual(calls, [false, true])
})
