const test = require('node:test')
const assert = require('node:assert/strict')
const { patchBundle } = require('../lib/patcher.js')

// PseudoCoinUpgrades.ts in the shape of the minified bundle: the levels and effects records, the effects update,
// initializePCoinCache (awaiting CartTab.fetchUpgrades) and updatePCoinCache
const pcoin =
    'let Ad={fetchUpgrades:async()=>({playerUpgrades:[{upgradeId:3,level:5,internalName:"CUBE_BUFF"}]})},' +
    'cv={INSTANT_UNLOCK_1:0,CUBE_BUFF:0,RED_LUCK_BUFF:0},je={INSTANT_UNLOCK_1:0,CUBE_BUFF:1,RED_LUCK_BUFF:0},' +
    'TT=(e,t)=>{switch(e){case"CUBE_BUFF":je.CUBE_BUFF=1+t*.06;break;case"RED_LUCK_BUFF":je.RED_LUCK_BUFF=t*20;break}},' +
    'gF=async()=>{let e=await Ad.fetchUpgrades();for(let t of Object.keys(cv))cv[t]=0,TT(t,0);' +
    'for(let t of e.playerUpgrades)cv[t.internalName]=t.level,TT(t.internalName,t.level)},' +
    'hF=async(e,t)=>{cv[e]=t,TT(e,t)};'

const run = (declarations, window) => {
    const warnings = []
    const logs = []
    const code = patchBundle(
        `"use strict";${declarations}return {gF,hF,je};`,
        { log: (...a) => logs.push(a.join(' ')), warn: (...a) => warnings.push(a.join(' ')) })
    return {
        game: new Function('window', code)(window),
        warnings: warnings.filter(w => w.includes('PseudoCoin')),
        logs: logs.filter(l => l.includes('PseudoCoin')),
        code
    }
}

test('pcoinLevels: the levels record is exposed live, and the mod is told after the load and a purchase', async () => {
    const calls = []
    const window = { __HS_onPCoinChange: () => calls.push({ ...window.__HS_pcoinLevels }) }
    const { game, warnings, logs } = run(pcoin, window)
    assert.deepEqual(warnings, [])
    assert.deepEqual(logs, ['Patched PseudoCoin levels (variable=cv, init=gF, update=hF)'])

    // Exposed when initializePCoinCache starts, marked loaded once its fetch has answered
    const fill = game.gF()
    assert.equal(window.__HS_pcoinLevels.CUBE_BUFF, 0)
    assert.equal(window.__HS_pcoinLevelsLoaded, undefined)
    await fill
    assert.equal(window.__HS_pcoinLevelsLoaded, true)
    assert.equal(window.__HS_pcoinLevels.CUBE_BUFF, 5)
    assert.equal(game.je.CUBE_BUFF, 1.3)
    assert.deepEqual(calls, [{ INSTANT_UNLOCK_1: 0, CUBE_BUFF: 5, RED_LUCK_BUFF: 0 }])

    await game.hF('RED_LUCK_BUFF', 2)
    assert.equal(window.__HS_pcoinLevels.RED_LUCK_BUFF, 2)
    assert.equal(game.je.RED_LUCK_BUFF, 40)
    assert.equal(calls.length, 2)
    assert.equal(calls[1].RED_LUCK_BUFF, 2)
})

test('pcoinLevels: a mod hook that throws, or none, never breaks the game', async () => {
    const window = { __HS_onPCoinChange: () => { throw new Error('mod') } }
    const { game } = run(pcoin, window)
    await game.gF()
    await game.hF('RED_LUCK_BUFF', 3)
    assert.equal(game.je.RED_LUCK_BUFF, 60)

    const bare = {}
    const { game: game2 } = run(pcoin, bare)
    await game2.gF()
    assert.equal(bare.__HS_pcoinLevels.CUBE_BUFF, 5)
})

test('pcoinLevels: unminified spacing and a name starting with "$"', async () => {
    const window = {}
    const { game, warnings } = run(pcoin
        .replace(/cv/g, '$c')
        .replace('Object.keys($c)', 'Object.keys( $c )')
        .replace('$c[e]=t', '$c [ e ] = t'), window)
    assert.deepEqual(warnings, [])
    // Exposed when initializePCoinCache starts, at load
    assert.equal(window.__HS_pcoinLevels, undefined)
    await game.gF()
    await game.hF('CUBE_BUFF', 3)
    assert.equal(window.__HS_pcoinLevels.CUBE_BUFF, 3)
})

test('pcoinLevels: nothing is inserted when updatePCoinCache is missing or not alone', () => {
    const missing = run(pcoin.replace('hF=async(e,t)=>{cv[e]=t,TT(e,t)}', 'hF=async(e,t)=>{TT(e,t)}'), {})
    assert.equal(missing.warnings.length, 1)
    assert.match(missing.warnings[0], /found 0$/)
    assert.ok(!missing.code.includes('__HS_pcoin') && !missing.code.includes('__HS_onPCoinChange'))

    const twice = run(`${pcoin}let hG=(a,b)=>{cv[a]=b};`, {})
    assert.equal(twice.warnings.length, 1)
    assert.match(twice.warnings[0], /found 2$/)
    assert.ok(!twice.code.includes('__HS_onPCoinChange'))
})

// Since the 2026-11-06 game update: CartTab.fetchUpgrades hands the upgrades to initializePCoinCache, which no longer
// awaits anything
const pcoinFromCaller =
    'let cv={INSTANT_UNLOCK_1:0,CUBE_BUFF:0,RED_LUCK_BUFF:0},je={INSTANT_UNLOCK_1:0,CUBE_BUFF:1,RED_LUCK_BUFF:0},' +
    'TT=(e,t)=>{switch(e){case"CUBE_BUFF":je.CUBE_BUFF=1+t*.06;break;case"RED_LUCK_BUFF":je.RED_LUCK_BUFF=t*20;break}},' +
    'gF=e=>{for(let t of Object.keys(cv))cv[t]=0,TT(t,0);' +
    'for(let t of e)cv[t.internalName]=t.level,TT(t.internalName,t.level)},' +
    'hF=async(e,t)=>{cv[e]=t,TT(e,t)},' +
    'Ad={fetchUpgrades:async()=>{let o={playerUpgrades:[{upgradeId:3,level:5,internalName:"CUBE_BUFF"}]};' +
    'return gF(o.playerUpgrades),o}};'

test('pcoinLevels: initializePCoinCache given the upgrades by its caller', async () => {
    const calls = []
    const window = { __HS_onPCoinChange: () => calls.push({ ...window.__HS_pcoinLevels }) }
    const { game, warnings, logs } = run(pcoinFromCaller, window)
    assert.deepEqual(warnings, [])
    assert.deepEqual(logs, ['Patched PseudoCoin levels (variable=cv, init=gF, update=hF)'])

    game.gF([{ upgradeId: 3, level: 5, internalName: 'CUBE_BUFF' }])
    assert.equal(window.__HS_pcoinLevelsLoaded, true)
    assert.equal(window.__HS_pcoinLevels.CUBE_BUFF, 5)
    assert.equal(game.je.CUBE_BUFF, 1.3)
    assert.equal(calls.length, 1)

    await game.hF('RED_LUCK_BUFF', 2)
    assert.equal(window.__HS_pcoinLevels.RED_LUCK_BUFF, 2)
    assert.equal(calls.length, 2)
})
