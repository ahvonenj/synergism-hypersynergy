const test = require('node:test')
const assert = require('node:assert/strict')
const { patchBundle } = require('../lib/patcher.js')

// Quark.ts in the shape of the minified bundle: the bonuses, recalculateBonus, updateQuarkUI(personal, global),
// getQuarkBonus, setPersonalQuarkBonus and setGlobalQuarkBonus
const quark =
    'let el={innerHTML:""},u=()=>el,s={t:(k,v)=>k+":"+JSON.stringify(v)},c=n=>String(n),' +
    'bw=0,y0=0,C0=0,o$=()=>{bw=100*(1+C0/100)*(1+y0/100)-100},' +
    'a$=(e,t)=>{let r=u("currentBonus");e>0?r.innerHTML=s.t("settings.quarkBonusExtended",{globalBonus:t,' +
    'personalBonusMult:c(1+e/100,3,!0),totalBonus:c(bw,2,!0)}):r.innerHTML=s.t("settings.quarkBonusSimple",{globalBonus:t})},' +
    'ks=()=>bw,s$=e=>{y0=e,o$(),a$(e,C0)},uK=e=>{C0=e,o$(),a$(y0,e)};'

const run = (declarations, window) => {
    const warnings = []
    const logs = []
    const code = patchBundle(
        `"use strict";${declarations}return {s$,uK,ks};`,
        { log: (...a) => logs.push(a.join(' ')), warn: (...a) => warnings.push(a.join(' ')) })
    return {
        game: new Function('window', code)(window),
        warnings: warnings.filter(w => w.includes('quark bonus')),
        logs: logs.filter(l => l.includes('quark bonus')),
        code
    }
}

test('quarkBonus: both bonuses are handed over after each setter, and the mod is told', () => {
    const calls = []
    const window = { __HS_onQuarkBonusChange: () => calls.push({ ...window.__HS_quarkBonus }) }
    const { game, warnings, logs } = run(quark, window)
    assert.deepEqual(warnings, [])
    assert.deepEqual(logs, ['Patched quark bonus (fn=a$, personal=e, global=t)'])
    assert.equal(window.__HS_quarkBonus, undefined)

    game.uK(50)
    assert.deepEqual(window.__HS_quarkBonus, { personal: 0, global: 50 })
    game.s$(10)
    assert.deepEqual(window.__HS_quarkBonus, { personal: 10, global: 50 })
    assert.equal(game.ks(), 65)
    assert.deepEqual(calls, [{ personal: 0, global: 50 }, { personal: 10, global: 50 }])
})

test('quarkBonus: a mod hook that throws, or none, never breaks the game', () => {
    const window = { __HS_onQuarkBonusChange: () => { throw new Error('mod') } }
    const { game } = run(quark, window)
    game.uK(20)
    game.s$(5)
    assert.equal(game.ks(), 26)

    const bare = {}
    const { game: game2 } = run(quark, bare)
    game2.s$(5)
    assert.deepEqual(bare.__HS_quarkBonus, { personal: 5, global: 0 })
})

test('quarkBonus: the global bonus is told by its globalBonus key, whatever the order or spelling', () => {
    const window = {}
    const { game, warnings } = run(quark
        .replace('a$=(e,t)=>', 'a$=($t,$e)=>')
        .replace(/globalBonus:t/g, 'globalBonus: $t')
        .replace('e>0?', '$e>0?')
        .replace('c(1+e/100', 'c(1+$e/100')
        .replace('a$(e,C0)', 'a$(C0,e)')
        .replace('a$(y0,e)', 'a$(e,y0)'), window)
    assert.deepEqual(warnings, [])
    game.uK(50)
    game.s$(10)
    assert.deepEqual(window.__HS_quarkBonus, { personal: 10, global: 50 })
})

test('quarkBonus: nothing is inserted when the global bonus parameter is not found', () => {
    const { warnings, code } = run(quark.replace(/globalBonus:t/g, 'globalBonus:C0'), {})
    assert.equal(warnings.length, 1)
    assert.match(warnings[0], /parameters of a\$ were not found$/)
    assert.ok(!code.includes('__HS_quarkBonus'))

    const missing = run(quark.replace('"settings.quarkBonusExtended"', '"settings.other"'), {})
    assert.equal(missing.warnings.length, 1)
    assert.match(missing.warnings[0], /not found$/)
})
