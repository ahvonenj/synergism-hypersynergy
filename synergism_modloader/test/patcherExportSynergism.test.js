const test = require('node:test')
const assert = require('node:assert/strict')
const { patchBundle } = require('../lib/patcher.js')

// ImportExport.ts, in the shape of the minified bundle.
// exportData: to the clipboard or a file, as the "saveType" checkbox says
const exportData = (name = 'zf') =>
    `${name}=async(e,t)=>{if(ju("saveType").checked)await Q.clipboard.writeText(e);else out.file=new Blob([e])}`
// exportStoredSave: reads the stored save, then exportData
const exportStoredSave = (name = '$L', data = 'zf') =>
    `${name}=async()=>{let e;try{e=await _l()}catch(t){console.error("Failed to read save for export",t),await D(s.t("testing.errorSaving"));return}` +
    `if(!e)return D("How?");await ${data}(e,Wc()),c("exportinfo").textContent=""}`
// exportSynergism: stamps the save, awards the export's quarks and golden quarks, then the output step
const exportSynergism = (name = 'n_', output = 'bo()&&await $L()', gqKey = 'exportGQPerHour') =>
    `${name}=async()=>{n.offlinetick=Math.max(n.offlinetick,nr()),n.lastExportedSave=Date.now();` +
    `let r=R("goldenQuarks3","${gqKey}");r>0&&(n.goldenQuarks+=r),n.worlds+=1,${output}}`
// Same keys elsewhere: the golden quark upgrade, and the save import stamping lastExportedSave
const decoys = 'gq3={effect:e=>({exportGQPerHour:e})},' +
    'imp=t=>{n.lastExportedSave=t.lastExportedSave,n.offlinetick=t.offlinetick},'
const listener = (call = '()=>n_()') => `c("exportgame").addEventListener("click",${call});`

const run = (declarations, window, names = 'n_,$L') => {
    const logs = []
    const warnings = []
    const code = patchBundle(
        '"use strict";const out={},n={offlinetick:0,lastExportedSave:0,goldenQuarks:0,worlds:0},nr=()=>1,R=()=>2,bo=()=>!0,' +
        '_l=async()=>"SAVE",Wc=()=>"f.txt",D=async()=>{},s={t:k=>k},ju=()=>({checked:!0}),' +
        'Q={clipboard:{writeText:async e=>{out.clip=e}}},handlers={},c=id=>({addEventListener:(k,f)=>{handlers[id]=f}}),Lg=async()=>{out.logged=!0};' +
        `${declarations}return {${names},out,n,handlers};`,
        { log: (...a) => logs.push(a.join(' ')), warn: (...a) => warnings.push(a.join(' ')) })
    return {
        game: new Function('window', code)(window),
        logs: logs.filter(l => l.includes('export')),
        warnings: warnings.filter(w => w.includes('export'))
    }
}

test('exportSynergism: exposed with its output guard, the save output and the quarks kept apart', async () => {
    const window = {}
    const { game, logs, warnings } = run(`let ${decoys}${exportData()},${exportStoredSave()},${exportSynergism()};${listener()}`, window)
    assert.deepEqual(warnings, [])
    assert.match(logs.join('\n'), /fn=n_, output=\$L, via=golden-quark-export/)

    await game.handlers.exportgame()
    assert.equal(window.__HS_exportSynergism, game.n_)
    assert.equal(window.__HS_exportData, game.$L)
    assert.equal(window.__HS_EXPORT_OUTPUT_PATCHED, true)
    assert.equal(game.out.clip, 'SAVE')
    assert.equal(game.n.worlds, 1)

    // Autosing's quark-only export: quarks, no output, and the guard used once
    delete game.out.clip
    window.__HS_SUPPRESS_EXPORT_ONCE = true
    await window.__HS_exportSynergism()
    assert.equal(game.out.clip, undefined)
    assert.equal(game.n.worlds, 2)
    assert.equal(window.__HS_SUPPRESS_EXPORT_ONCE, false)
    await window.__HS_exportSynergism()
    assert.equal(game.out.clip, 'SAVE')

    // The silent export exposes, and does nothing else
    window.__HS_SILENT_EXPORT = true
    await game.handlers.exportgame()
    assert.equal(game.n.worlds, 3)
})

test('exportSynergism: found when the click listener changes, with exportData awaited directly', async () => {
    const window = {}
    const output = 'bo()&&await $d(await _l(),Wc())'
    const { game, logs, warnings } = run(
        `let ${exportData('$d')},${exportSynergism('$x', output)};${listener('async()=>{await $x()}')}`, window, '$x,$d')
    assert.deepEqual(warnings, [])
    assert.match(logs.join('\n'), /fn=\$x, output=\$d, via=golden-quark-export/)
    window.__HS_SUPPRESS_EXPORT_ONCE = true
    await game.handlers.exportgame()
    assert.equal(window.__HS_exportSynergism, game.$x)
    assert.equal(game.out.clip, undefined)
    assert.equal(game.n.worlds, 1)
})

test('exportSynergism: the click listener as fallback', async () => {
    const window = {}
    const { game, logs, warnings } = run(
        `let ${exportData()},${exportStoredSave()},${exportSynergism('n_', 'bo()&&await $L()', 'exportGoldenQuarks')};${listener()}`, window)
    assert.deepEqual(warnings, [])
    assert.match(logs.join('\n'), /fn=n_, output=\$L, via=click-handler/)
    await game.handlers.exportgame()
    assert.equal(window.__HS_exportSynergism, game.n_)
    assert.equal(window.__HS_EXPORT_OUTPUT_PATCHED, true)
})

test('exportSynergism: an await after the output step does not get the guard', async () => {
    const window = {}
    const { game, logs } = run(
        `let ${exportData()},${exportStoredSave()},${exportSynergism('n_', 'bo()&&await $L(),await Lg()')};${listener()}`, window)
    assert.match(logs.join('\n'), /output=\$L/)
    window.__HS_SUPPRESS_EXPORT_ONCE = true
    await game.handlers.exportgame()
    assert.equal(game.out.clip, undefined)
    assert.equal(game.out.logged, true)
})

test('exportSynergism: no output step found, exposed without the guard, with a warning', async () => {
    const window = {}
    const { game, warnings } = run(`let ${exportSynergism('n_', 'await Lg()')};${listener()}`, window, 'n_')
    await game.handlers.exportgame()
    assert.equal(window.__HS_exportSynergism, game.n_)
    assert.equal(window.__HS_EXPORT_OUTPUT_PATCHED, undefined)
    assert.equal(window.__HS_exportData, undefined)
    assert.equal(warnings.length, 1)
})
