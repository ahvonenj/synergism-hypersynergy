const test = require('node:test')
const assert = require('node:assert/strict')
const { patchBundle } = require('../lib/patcher.js')

// The four places, in the shape of the minified bundle
// saveSynergy: the offlinetick it writes, its one schema parse of the player, its "testing.gameSaved" message. Before
// game commit 075dfeaa it also copied the talismans' fragments into the player (old = true).
const saveSynergy = (name = 'bo', schema = 'Yp', player = 'n', old = false) =>
    `${name}=e=>{if(b.timeWarp)return!1;${player}.offlinetick=Math.max(${player}.offlinetick,Date.now());` +
    (old ? `${player}.talismans=Object.fromEntries(Object.keys(${player}.talismans).map(o=>[o,{...Me[o].fragmentsInvested}]));` : '') +
    `let t=${schema}.parse(${player}),r=JSON.stringify(t);` +
    `return saved.push(r),e&&D(s.t("testing.gameSaved")),!0}`
// loadSynergy: parses the save, then refuses a test save with "testing.saveInLive2"
const loadSynergy = (name = 'PY') =>
    `${name}=e=>{let t=JSON.parse(e);if(t){if(t.exporttest===!1)return D(s.t("testing.saveInLive2")),!1;` +
    'loaded.push(t)}return!0}'
const unlocks = (name = 'Pg') =>
    `${name}={ascCubeStats:()=>!0,coinHeader:()=>!0,singularitybtn:()=>!1,ascensionChallengeProgress:()=>!1}`
// renderHeaderLayout: records what it renders
const render = (name = 'ss') =>
    `${name}=()=>{let e=layouts.desktop;c("mainHeader").style.setProperty("--header-button-slots","4");` +
    'renders.push(JSON.stringify(e));c("headerTray")}'

const run = (declarations, window = {}, names = {}) => {
    const warnings = []
    const logs = []
    const code = patchBundle(
        '"use strict";const saved=[],loaded=[],renders=[],alerts=[],b={timeWarp:!1},Me={},s={t:k=>k},D=k=>alerts.push(k),c=()=>({style:{setProperty(){}}});' +
        `const n={talismans:{},offlinetick:0,headerLayouts:null},layouts={desktop:null};${declarations}` +
        `return {save:${names.save ?? 'bo'},load:${names.load ?? 'PY'},unlocks:${names.unlocks ?? 'Pg'},render:${names.render ?? 'ss'},` +
        'player:n,layouts,saved,loaded,renders};',
        { log: (...a) => logs.push(a.join(' ')), warn: (...a) => warnings.push(a.join(' ')) })
    return { game: new Function('window', code)(window), window, code, logs, warnings: warnings.filter(w => w.includes('header modules')) }
}

// A schema that keeps what it's given (the game's validates and copies)
const passThrough = 'const Yp={parse:p=>p};'
const allFour = `${passThrough}let ${saveSynergy()},${loadSynergy()},${unlocks()},${render()};`

const layout = () => ({
    regions: {
        ascensionStats: [['ascCubeStats'], ['hsAutomationHeader'], ['lotusHeader', 'hsOtherHeader']],
        headerGrid: [['coinHeader'], [], ['hsGridHeader']]
    },
    sizes: { lotusHeader: 'S', hsOtherHeader: 'S', hsAutomationHeader: 'L', coinHeader: 'L' },
    positions: { prestigebtn: 0 },
    hidden: ['hsGridHeader', 'happyHourBellHeader'],
    rainbowAmbrosia: 'ambrosiaHeader',
    loadoutIcons: { corruptionLoadoutsHeader: {}, ambrosiaLoadoutsHeader: {} }
})

test('header modules: every place patched, the flag and the report set', () => {
    const { window, warnings, logs } = run(allFour)
    assert.deepEqual(warnings, [])
    assert.equal(window.__HS_HEADER_MODULES_PATCHED, true)
    assert.equal(window.__HS_PATCH_REPORT.headerModules, true)
    assert.ok(logs.some(l => l === 'Patched the header modules (save=bo, load=PY, unlocks=Pg, render=ss)'))
})

test('header modules: the bundle before 075dfeaa (saveSynergy copies the talismans)', () => {
    const { window, warnings } = run(`${passThrough}let ${saveSynergy('bo', 'Yp', 'n', true)},${loadSynergy()},${unlocks()},${render()};`)
    assert.deepEqual(warnings, [])
    assert.equal(window.__HS_PATCH_REPORT.headerModules, true)
})

test('header modules: a save holds none of the mod\'s ids, and the live player keeps them', () => {
    const { game } = run(allFour)
    const live = { desktop: layout(), mobile: layout() }
    game.player.headerLayouts = live
    const before = JSON.stringify(live)
    game.save()

    const saved = JSON.parse(game.saved[0]).headerLayouts
    assert.equal(JSON.stringify(live), before)
    for (const key of ['desktop', 'mobile']) {
        assert.deepEqual(saved[key].regions, {
            ascensionStats: [['ascCubeStats'], [], ['lotusHeader']],
            headerGrid: [['coinHeader'], [], []]
        })
        // lotusHeader left its stack: no S size any more, as when the game unstacks it
        assert.deepEqual(saved[key].sizes, { coinHeader: 'L' })
        assert.deepEqual(saved[key].positions, { prestigebtn: 0 })
        assert.deepEqual(saved[key].hidden, ['happyHourBellHeader'])
        assert.equal(saved[key].rainbowAmbrosia, 'ambrosiaHeader')
        assert.deepEqual(saved[key].loadoutIcons, { corruptionLoadoutsHeader: {}, ambrosiaLoadoutsHeader: {} })
    }
})

test('header modules: a save without the mod\'s ids is the player itself', () => {
    const { game, window } = run(allFour)
    const vanilla = { desktop: { regions: { ascensionStats: [['ascCubeStats']], headerGrid: [] }, sizes: {}, positions: {}, hidden: [] } }
    game.player.headerLayouts = vanilla
    assert.equal(window.__HS_stripHeaderModules(game.player), game.player)
    // Nothing to strip without layouts (an old save) or without a player
    assert.equal(window.__HS_stripHeaderModules(null), null)
    const old = { worlds: 1 }
    assert.equal(window.__HS_stripHeaderModules(old), old)
})

test('header modules: a loaded save loses the mod\'s ids (a singularity reloads the live layout)', () => {
    const { game } = run(allFour)
    game.load(JSON.stringify({ exporttest: 'YES!', headerLayouts: { desktop: layout() } }))
    assert.deepEqual(game.loaded[0].headerLayouts.desktop.hidden, ['happyHourBellHeader'])
    assert.deepEqual(game.loaded[0].headerLayouts.desktop.regions.headerGrid, [['coinHeader'], [], []])
    // The rest of the load is the game's
    game.load(JSON.stringify({ exporttest: false }))
    assert.equal(game.loaded.length, 1)
})

test('header modules: unlocks captured, render exposed and preceded by the mod\'s hook', () => {
    const { game, window } = run(allFour)
    assert.equal(window.__HS_headerModuleUnlocks, game.unlocks)
    window.__HS_headerModuleUnlocks.hsAutomationHeader = () => true
    assert.equal(game.unlocks.hsAutomationHeader(), true)

    assert.equal(window.__HS_renderHeaderLayout, game.render)
    // The hook runs first: what it puts in the layout is rendered by the same call
    window.__HS_beforeHeaderRender = () => { game.layouts.desktop = { placed: 'hsAutomationHeader' } }
    window.__HS_renderHeaderLayout()
    assert.deepEqual(game.renders, ['{"placed":"hsAutomationHeader"}'])

    // An error from the mod doesn't stop the render, nor does a missing hook
    window.__HS_beforeHeaderRender = () => { throw new Error('mod error') }
    game.render()
    delete window.__HS_beforeHeaderRender
    game.render()
    assert.equal(game.renders.length, 3)
})

test('header modules: all four or none', () => {
    const missing = [
        ['saveSynergy', `${passThrough}let ${loadSynergy()},${unlocks()},${render()},bo=()=>{};`],
        ['loadSynergy', `${passThrough}let ${saveSynergy()},${unlocks()},${render()},PY=()=>{};`],
        ['headerModuleUnlocks', `${passThrough}let ${saveSynergy()},${loadSynergy()},${render()},Pg={};`],
        ['renderHeaderLayout', `${passThrough}let ${saveSynergy()},${loadSynergy()},${unlocks()},ss=()=>{};`]
    ]
    for (const [part, declarations] of missing) {
        const { window, code, warnings } = run(declarations)
        assert.equal(window.__HS_HEADER_MODULES_PATCHED, undefined, part)
        assert.equal(window.__HS_PATCH_REPORT.headerModules, false, part)
        assert.equal(warnings.length, 1, part)
        assert.match(warnings[0], new RegExp(part), part)
        for (const edit of ['__HS_stripHeaderModules', '__HS_parseSave', '__HS_headerModuleUnlocks', '__HS_beforeHeaderRender']) {
            assert.ok(!code.includes(edit), `${part}: ${edit}`)
        }
    }
})

test('header modules: saveSynergy with a second parse is refused', () => {
    const twoParses = saveSynergy().replace('let t=', 'Zq.parse(o);let t=')
    const { window, warnings } = run(`${passThrough}const Zq={parse(){}};let ${twoParses},${loadSynergy()},${unlocks()},${render()};`)
    assert.equal(window.__HS_HEADER_MODULES_PATCHED, undefined)
    assert.match(warnings[0], /expected 1 schema parse in saveSynergy \(fn=bo\), found 2/)
})

test('header modules: names starting with "$" and function declarations', () => {
    const declarations = 'const $p={parse:p=>p};' +
        `function $s(e){if(b.timeWarp)return!1;n.offlinetick=Math.max(n.offlinetick,Date.now());` +
        'let t=$p.parse(n),r=JSON.stringify(t);' +
        'return saved.push(r),e&&D(s.t("testing.gameSaved")),!0}' +
        `let ${loadSynergy('$l')},${unlocks('$u')};` +
        'function $r(){let e=layouts.desktop;c("mainHeader").style.setProperty("--header-button-slots","4");renders.push(JSON.stringify(e));c("headerTray")}'
    const { game, window, warnings } = run(declarations, {}, { save: '$s', load: '$l', unlocks: '$u', render: '$r' })
    assert.deepEqual(warnings, [])
    game.player.headerLayouts = { desktop: layout() }
    game.save()
    assert.deepEqual(JSON.parse(game.saved[0]).headerLayouts.desktop.hidden, ['happyHourBellHeader'])
    assert.equal(window.__HS_headerModuleUnlocks, game.unlocks)
    // A function declaration is exposed once the game has rendered once
    game.render()
    assert.equal(window.__HS_renderHeaderLayout, game.render)
})
