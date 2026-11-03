const test = require('node:test')
const assert = require('node:assert/strict')
const { patchBundle } = require('../lib/patcher.js')

// saveSynergy: the talismans it writes, its one schema parse of the player, its "testing.gameSaved" message
const saveSynergy = (name = 'bo', schema = 'Yp', player = 'n') =>
    `${name}=e=>{if(b.timeWarp)return!1;${player}.talismans=Object.fromEntries(Object.keys(${player}.talismans)` +
    `.map(o=>[o,{...Me[o].fragmentsInvested}]));let t=${schema}.parse(${player}),r=JSON.stringify(t);` +
    `return saved.push(r),e&&D(s.t("testing.gameSaved")),!0}`
// The rest of the header modules patch: without them, its edit of the parse isn't applied
const headerParts =
    'PY=e=>{let t=JSON.parse(e);if(t){if(t.exporttest===!1)return D(s.t("testing.saveInLive2")),!1}return!0},' +
    'Pg={ascCubeStats:()=>!0,singularitybtn:()=>!1,ascensionChallengeProgress:()=>!1},' +
    'ss=()=>{c("mainHeader").style.setProperty("--header-button-slots","4");c("headerTray")}'
// The game's check of the seeds
const schema = (name = 'Yp') =>
    `const ${name}={parse:p=>{if(!p.seed.every(v=>v<Date.now()+1e3))throw new Error("ZodError");return p}};`

const run = (declarations, names = {}) => {
    const warnings = []
    const logs = []
    const window = {}
    const code = patchBundle(
        '"use strict";const saved=[],b={timeWarp:!1},Me={},s={t:k=>k},D=()=>{},c=()=>({style:{setProperty(){}}});' +
        `const n={talismans:{},worlds:7,seed:[]};${declarations}return {save:${names.save ?? 'bo'},player:n,saved};`,
        { log: (...a) => logs.push(a.join(' ')), warn: (...a) => warnings.push(a.join(' ')) })
    return { game: new Function('window', code)(window), window, code, logs, warnings: warnings.filter(w => w.includes('save seed cap')) }
}

test('save seed cap: a seed past the clock saves capped, and the live player keeps its seed', () => {
    const { game, window, warnings, logs } = run(`${schema()}let ${saveSynergy()};`)
    assert.deepEqual(warnings, [])
    assert.equal(window.__HS_PATCH_REPORT.saveSeedCap, true)
    assert.ok(logs.includes('Patched the save seed cap (save=bo)'))

    const start = Date.now()
    const past = start - 5000
    const ahead = start + 60000
    game.player.seed = [past, ahead, past, past]
    assert.equal(game.save(), true)

    const saved = JSON.parse(game.saved[0])
    assert.equal(saved.seed[0], past)
    assert.ok(saved.seed[1] >= start && saved.seed[1] <= Date.now())
    assert.equal(saved.worlds, 7)
    assert.deepEqual(game.player.seed, [past, ahead, past, past])
})

test('save seed cap: seeds behind the clock are the player itself, and no seeds change nothing', () => {
    const { window } = run(`${schema()}let ${saveSynergy()};`)
    const player = { seed: [Date.now() - 1000] }
    assert.equal(window.__HS_capSaveSeeds(player), player)
    assert.equal(window.__HS_capSaveSeeds(null), null)
    const old = { worlds: 1 }
    assert.equal(window.__HS_capSaveSeeds(old), old)
})

test('save seed cap: applies after the header modules patch edited the same parse', () => {
    const { game, window, warnings, code } = run(`${schema()}let ${saveSynergy()},${headerParts};`)
    assert.deepEqual(warnings, [])
    assert.equal(window.__HS_PATCH_REPORT.headerModules, true)
    assert.equal(window.__HS_PATCH_REPORT.saveSeedCap, true)
    assert.ok(code.includes('Yp.parse(window.__HS_capSaveSeeds(window.__HS_stripHeaderModules(n)))'))

    game.player.seed = [Date.now() + 60000]
    assert.equal(game.save(), true)
    assert.equal(game.saved.length, 1)
})

test('save seed cap: nothing edited without saveSynergy, or with a second parse in it', () => {
    const none = run(`${schema()}let bo=()=>{};`)
    assert.equal(none.window.__HS_PATCH_REPORT.saveSeedCap, false)
    assert.match(none.warnings[0], /saveSynergy \("testing\.gameSaved"\) not found/)
    assert.ok(!none.code.includes('__HS_capSaveSeeds'))

    const twoParses = saveSynergy().replace('let t=', 'Zq.parse(o);let t=')
    const two = run(`${schema()}const Zq={parse(){}};let ${twoParses};`)
    assert.equal(two.window.__HS_PATCH_REPORT.saveSeedCap, false)
    assert.match(two.warnings[0], /expected 1 schema parse in saveSynergy \(fn=bo\), found 2/)
    assert.ok(!two.code.includes('__HS_capSaveSeeds'))
})

test('save seed cap: names starting with "$"', () => {
    const { game, window, warnings } = run(`${schema('$p')}let ${saveSynergy('$s', '$p')};`, { save: '$s' })
    assert.deepEqual(warnings, [])
    assert.equal(window.__HS_PATCH_REPORT.saveSeedCap, true)
    game.player.seed = [Date.now() + 60000]
    assert.equal(game.save(), true)
})
