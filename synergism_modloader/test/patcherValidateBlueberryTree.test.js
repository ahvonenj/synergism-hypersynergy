const test = require('node:test')
const assert = require('node:assert/strict')
const { patchBundle } = require('../lib/patcher.js')

// validateBlueberryTree's body, in the shape of the minified bundle: the Exalt unlock criteria and the ambrosia budget
const validatorBody =
    'if(Object.keys(e).length===0)return!1;let t=n.lifetimeAmbrosia,m=!0;' +
    'for(let[g,h]of Object.entries(e)){let S=u[g];S==="Exalt1x1"&&(m=!1),S==="Exalt5x1"&&(m=!1),S==="Exalt9x1"&&(m=!1)}' +
    'return m&&(e.a??0)<=t'
const arrowValidator = (name = 'eK') => `${name}=e=>{${validatorBody}}`
// createBlueberryTree, with a call shape unlike today's bundle: the patch must not depend on it
const creator = (name = 'eK') =>
    `R3=e=>${name}(e)?!0:(D(s.t("ambrosia.importTree.failure")),!1)`

const run = (declarations, window) => {
    const warnings = []
    const code = patchBundle(
        `"use strict";const n={lifetimeAmbrosia:5},u={a:"",b:"Exalt1x1"},s={t:k=>k},D=()=>{};${declarations}return {R3};`,
        { log() {}, warn: (...a) => warnings.push(a.join(' ')) })
    return { game: new Function('window', code)(window), warnings: warnings.filter(w => w.includes('validateBlueberryTree')) }
}

test('validateBlueberryTree: exposed when the bundle runs, same function as the game uses', () => {
    const window = {}
    const { game, warnings } = run(`let ${arrowValidator()},${creator()};`, window)
    assert.deepEqual(warnings, [])
    assert.equal(typeof window.__HS_validateBlueberryTree, 'function')
    assert.equal(window.__HS_validateBlueberryTree({ a: 3 }), true)
    assert.equal(window.__HS_validateBlueberryTree({ a: 9 }), false)
    assert.equal(window.__HS_validateBlueberryTree({ b: 1 }), false)
    assert.equal(window.__HS_validateBlueberryTree({}), false)
    // The game's own call still works
    assert.equal(game.R3({ a: 3 }), true)
    assert.equal(game.R3({ a: 9 }), false)
})

test('validateBlueberryTree: names starting with "$", other functions with the same name or Exalt strings', () => {
    const window = {}
    const others = 'q=()=>{let $K=e=>e;return $K(1)},w=e=>e==="Exalt9x1",'
    const { game, warnings } = run(`let ${others}${arrowValidator('$K')},${creator('$K')};`, window)
    assert.deepEqual(warnings, [])
    assert.equal(window.__HS_validateBlueberryTree({ a: 3 }), true)
    assert.equal(window.__HS_validateBlueberryTree({ a: 9 }), false)
    assert.equal(game.R3({ a: 9 }), false)
})

test('validateBlueberryTree: a function declaration is exposed at its first call', () => {
    const window = {}
    const { game, warnings } = run(`function eK(e){${validatorBody}}let ${creator()};`, window)
    assert.deepEqual(warnings, [])
    assert.equal(window.__HS_validateBlueberryTree, undefined)
    assert.equal(game.R3({ a: 3 }), true)
    assert.equal(window.__HS_validateBlueberryTree({ a: 9 }), false)
})

test('validateBlueberryTree: not found, bundle left unchanged with a warning', () => {
    const window = {}
    const { warnings } = run(`let eK=e=>!0,${creator()};`, window)
    assert.equal(window.__HS_validateBlueberryTree, undefined)
    assert.equal(warnings.length, 1)
})
