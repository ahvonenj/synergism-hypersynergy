const test = require('node:test')
const assert = require('node:assert/strict')
const { patchBundle } = require('../lib/patcher.js')

// Talismans.ts's talismans, in the shape of the minified bundle, and the player's talismans (nested in the player
// object, the same keys), which must not be taken for it. Before game commit 075dfeaa each talisman also held
// fragmentsInvested.
const oldTalisman = (base) => `{level:0,rarity:0,fragmentsInvested:w({},jt),baseMult:new f(${base}),maxLevel:180}`
const newTalisman = (base) => `{level:0,rarity:0,baseMult:new f(${base}),maxLevel:180}`
const talisman = newTalisman
const talismans = (keys = `exemption:${talisman(1)},chronos:${talisman(10)},horseShoe:${talisman(1)}`) => `Te={${keys}}`
const player = 'n={firstPlayed:0,talismans:{exemption:{shard:0},horseShoe:{shard:0}},baseMult:0}'

const run = (declarations, window) => {
    const warnings = []
    const code = patchBundle(
        '"use strict";const f=function(v){this.v=v},w=Object.assign,jt={shard:0};' +
        `let ${declarations};return {Te};`,
        { log() {}, warn: (...a) => warnings.push(a.join(' ')) })
    return { game: new Function('window', code)(window), warnings: warnings.filter(w => w.includes('talismans')) }
}

test('talismans: the object is captured as window.__HS_talismans, not the player\'s copy', () => {
    const window = {}
    const { game, warnings } = run(`${player},${talismans()}`, window)
    assert.deepEqual(warnings, [])
    assert.equal(window.__HS_talismans, game.Te)
    assert.equal(window.__HS_PATCH_REPORT.talismans, true)
    game.Te.horseShoe.level = 5
    assert.equal(window.__HS_talismans.horseShoe.level, 5)
})

test('talismans: the bundle before 075dfeaa (fragmentsInvested in each talisman)', () => {
    const window = {}
    const old = `exemption:${oldTalisman(1)},chronos:${oldTalisman(10)},horseShoe:${oldTalisman(1)}`
    const { game, warnings } = run(`${player},${talismans(old)}`, window)
    assert.deepEqual(warnings, [])
    assert.equal(window.__HS_talismans, game.Te)
    assert.equal(window.__HS_talismans.horseShoe.fragmentsInvested.shard, 0)
})

test('talismans: exemption anywhere in the object, quoted keys', () => {
    const window = {}
    const { game, warnings } = run(talismans(`"chronos":${talisman(10)},"exemption":${talisman(1)},horseShoe:${talisman(1)}`), window)
    assert.deepEqual(warnings, [])
    assert.equal(window.__HS_talismans, game.Te)
})

test('talismans: not found, with a warning', () => {
    const window = {}
    const { warnings } = run(`${player},${talismans(`exemption:${talisman(1)},chronos:${talisman(10)}`)}`, window)
    assert.equal(window.__HS_talismans, undefined)
    assert.equal(window.__HS_PATCH_REPORT.talismans, false)
    assert.equal(warnings.length, 1)
})
