const test = require('node:test')
const assert = require('node:assert/strict')
const { patchBundle } = require('../lib/patcher.js')

// Synergism.ts's player, in the shape of the minified bundle, and what else holds its keys: the save schema
// (an object passed to a call, not assigned) and a destructuring
const player = (keys = 'firstPlayed:new Date().toISOString(),worlds:new Q(0),coins:1,challengecompletions:[0,0]') =>
    `n={${keys}}`
const schema = 'g1=Ie({firstPlayed:Gu.d(),worlds:Gu.n(),challengecompletions:Gu.a()})'
const destructuring = 'rd=()=>{let{firstPlayed:x,worlds:y}=n;return[x,y,{challengecompletions:1}]}'

const run = (declarations, window) => {
    const warnings = []
    const code = patchBundle(
        '"use strict";const Q=function(v){this.v=v},Ie=o=>o,Gu={d:()=>0,n:()=>0,a:()=>0};' +
        `let ${declarations};return {n};`,
        { log() {}, warn: (...a) => warnings.push(a.join(' ')) })
    return { game: new Function('window', code)(window), warnings: warnings.filter(w => w.includes('player initializer')) }
}
const exposedPlayer = window => window[window.symp]

test('player: the initializer is captured as the live player object', () => {
    const window = {}
    const { game, warnings } = run(`${schema},${destructuring},${player()}`, window)
    assert.deepEqual(warnings, [])
    assert.equal(exposedPlayer(window), game.n)
    assert.deepEqual(exposedPlayer(window).challengecompletions, [0, 0])
})

test('player: firstPlayed anywhere in the object, quoted keys, nested objects before it', () => {
    const window = {}
    const keys = 'version:"4",stats:{a:{b:1}},fn:(e={})=>e,"firstPlayed":new Date().toISOString(),"worlds":new Q(0),challengecompletions:[1]'
    const { game, warnings } = run(`${schema},${player(keys)}`, window)
    assert.deepEqual(warnings, [])
    assert.equal(exposedPlayer(window), game.n)
    assert.equal(game.n.version, '4')
})

test('player: not found, with a warning', () => {
    const window = {}
    const { warnings } = run(`${schema},${destructuring},n={worlds:new Q(0),challengecompletions:[0]}`, window)
    assert.equal(window.symp, undefined)
    assert.equal(warnings.length, 1)
})
