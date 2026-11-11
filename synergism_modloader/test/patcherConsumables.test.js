const test = require('node:test')
const assert = require('node:assert/strict')
const { patchBundle } = require('../lib/patcher.js')

// Login.ts in the shape of the minified bundle: getters, the consumables record, its reset (entries replaced,
// never the record), the socket's "consumed" branch, and Event.ts reading the record through a destructuring
const login =
    'let xf=0,bf=()=>xf,Ro={HAPPY_HOUR_BELL:{amount:0,ends:[],displayName:""}},WD=1;' +
    'function Xy(){for(let e of Object.keys(Ro))Ro[e]={amount:0,ends:[],displayName:""}}' +
    'function consumed(a){let c=Ro[a.consumable];c.ends.push(a.startedAt+3600*1e3),c.amount++}' +
    'let Tk=()=>{let{HAPPY_HOUR_BELL:t}=Ro;return t.amount};'

const run = (declarations, window) => {
    const warnings = []
    const code = patchBundle(
        `"use strict";${declarations}return {Xy,consumed,Tk};`,
        { log() {}, warn: (...a) => warnings.push(a.join(' ')) })
    return { game: new Function('window', code)(window), warnings: warnings.filter(w => w.includes('consumables')), code }
}

test('consumables: the game record is exposed as a live reference', () => {
    const window = {}
    const { game, warnings, code } = run(login, window)
    assert.deepEqual(warnings, [])
    assert.equal(code.split('__HS_consumables').length - 1, 1)
    assert.deepEqual(window.__HS_consumables.HAPPY_HOUR_BELL, { amount: 0, ends: [], displayName: '' })

    game.consumed({ consumable: 'HAPPY_HOUR_BELL', startedAt: 1000 })
    assert.equal(window.__HS_consumables.HAPPY_HOUR_BELL.amount, 1)
    assert.equal(game.Tk(), 1)

    // The reset replaces the entries, not the record: the reference still follows the game
    game.Xy()
    assert.equal(window.__HS_consumables.HAPPY_HOUR_BELL.amount, 0)
    game.consumed({ consumable: 'HAPPY_HOUR_BELL', startedAt: 2000 })
    assert.deepEqual(window.__HS_consumables.HAPPY_HOUR_BELL.ends, [3602000])
})

test('consumables: unminified spacing and a name starting with "$"', () => {
    const window = {}
    const { warnings } = run(
        'let $r = {\n  HAPPY_HOUR_BELL: {\n    amount: 0,\n    ends: [],\n    displayName: ""\n  }\n};' +
        'function Xy(){}function consumed(){}let Tk=()=>$r.HAPPY_HOUR_BELL.amount;', window)
    assert.deepEqual(warnings, [])
    assert.equal(window.__HS_consumables.HAPPY_HOUR_BELL.amount, 0)
})

test('consumables: another consumable before the bell, quoted keys', () => {
    const window = {}
    const { warnings } = run(
        'let Ro={"LOTUS_OF_TIME":{amount:0,ends:[],displayName:""},"HAPPY_HOUR_BELL":{amount:0,ends:[],displayName:""}};' +
        'function Xy(){}function consumed(){}let Tk=()=>Ro.HAPPY_HOUR_BELL.amount;', window)
    assert.deepEqual(warnings, [])
    assert.deepEqual(Object.keys(window.__HS_consumables), ['LOTUS_OF_TIME', 'HAPPY_HOUR_BELL'])
})

test('consumables: a destructuring or a reset entry alone is not captured', () => {
    const window = {}
    const { warnings } = run(
        'let Ro={};function Xy(){Ro.HAPPY_HOUR_BELL={amount:0,ends:[],displayName:""}}' +
        'function consumed(){}let Tk=()=>{let{HAPPY_HOUR_BELL:{amount:t}}=Ro;return t};', window)
    assert.equal(warnings.length, 1)
    assert.equal(window.__HS_consumables, undefined)
})
