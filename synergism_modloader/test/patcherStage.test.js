const test = require('node:test')
const assert = require('node:assert/strict')
const { patchBundle } = require('../lib/patcher.js')

// Another stats loader, right before loadMiscellaneousStats in the bundle
const otherStats = 'lQ=()=>{Be(ek,"shopVoucherStats","statSV2","ShopVoucherStat2",uy)}'
// loadMiscellaneousStats, in the shape of the minified bundle
const miscStats = ({ name = 'cQ', params = '()', dom = 'c', i18n = 's', stage = 'gk', before = '' } = {}) =>
    `${name}=${params}=>{${before}Be(w7,"miscStats","sMisc","miscStat",()=>0,"",!1),` +
    `${dom}("gameStageStatistic").innerHTML=${i18n}.t("statistics.gameStage",{stage:${stage}(0)})}`

const run = (declarations, window) => {
    const warnings = []
    const code = patchBundle(
        '"use strict";const el={innerHTML:""},c=()=>el,$c=c,s={t:(k,v)=>k+":"+v.stage},$s=s,' +
        'gk=(e=0)=>"stage"+e,$g=gk,Be=()=>{},ek={},uy=0,w7={},document={getElementById:c};' +
        `let ${declarations};return {cQ,lQ,el,c,s,gk};`,
        { log() {}, warn: (...a) => warnings.push(a.join(' ')) })
    return { game: new Function('window', code)(window), warnings: warnings.filter(w => w.includes('tage')) }
}

test('stage: exposed when the Misc stats load, not before, and the stats still render', () => {
    const window = {}
    const { game, warnings } = run(`${otherStats},${miscStats()}`, window)
    assert.deepEqual(warnings, [])
    game.lQ()
    assert.equal(window.__HS_EXPOSED, undefined)
    game.cQ()
    assert.equal(window.__HS_EXPOSED, true)
    assert.equal(window.DOMCacheGetOrSet, game.c)
    assert.equal(window.__HS_i18next, game.s)
    assert.equal(window.__HS_synergismStage, game.gk)
    assert.equal(game.el.innerHTML, 'statistics.gameStage:stage0')
})

test('stage: a nested no-arg arrow before the id, a parameter, names starting with "$"', () => {
    const window = {}
    const misc = miscStats({ params: '(e=0)', dom: '$c', i18n: '$s', stage: '$g', before: 'let $f=()=>{Be()};' })
    const { game, warnings } = run(`${otherStats},${misc}`, window)
    assert.deepEqual(warnings, [])
    game.cQ()
    assert.equal(window.__HS_EXPOSED, true)
    assert.equal(window.__HS_synergismStage, game.gk)
    assert.equal(game.el.innerHTML, 'statistics.gameStage:stage0')
})

test('stage: not found or not readable, the bundle still runs, with a warning', () => {
    for (const misc of [
        // Not on the Misc stats
        'cQ=()=>{c("gameStageStatistic").innerHTML=s.t("statistics.gameStage",{stage:gk(0)})}',
        // Not through DOMCacheGetOrSet: never exposed as it
        miscStats({ dom: 'document.getElementById' })
    ]) {
        const window = {}
        const { game, warnings } = run(`${otherStats},${misc}`, window)
        game.cQ()
        assert.equal(window.__HS_EXPOSED, undefined)
        assert.equal(game.el.innerHTML, 'statistics.gameStage:stage0')
        assert.equal(warnings.length, 1)
    }
})
