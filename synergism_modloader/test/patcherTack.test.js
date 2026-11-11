const test = require('node:test')
const assert = require('node:assert/strict')
const { patchBundle } = require('../lib/patcher.js')

// addTimers, in the shape of the minified bundle: one case per timer, and the ambrosia case calling itself.
// It holds every timer name tack does, but the game also calls it outside a tick: it must not get the hook.
const addTimers = (name = 'At') =>
    `${name}=(e,t=0,r,o=!1)=>{switch(e){case"prestige":{n.prestige+=t;break}` +
    `case"ambrosia":{${name}("prestige",t*.01,r,!0),${name}("autoPotion",t*.01,r,!0);break}` +
    'case"autoPotion":{n.autoPotion+=t;break}case"ascension":{n.ascension+=t;break}' +
    'case"quarks":{n.quarks+=t;break}case"purpleReactor":{n.purpleReactor+=t;break}}}'
// tack: skipped timers during a time warp, every timer, then the automatic tools
const tack = (name = 'jY', timers = 'At', q = '"') =>
    `${name}=e=>{if(!b.timeWarp){let t=Gn();` +
    ['prestige', 'autoPotion', 'ascension', 'quarks', 'purpleReactor'].map(k => `${timers}(${q}${k}${q},e)`).join(',') +
    `,n.autoSacrificeToggle&&Kt(${q}runeSacrifice${q},e)}b.timeWarp&&Kt(${q}addOfferings${q},e/2)}`

const run = (declarations, window, names = 'At,jY') => {
    const warnings = []
    const code = patchBundle(
        '"use strict";const n={prestige:0,autoPotion:0,ascension:0,quarks:0,purpleReactor:0,autoSacrificeToggle:!0},' +
        'b={timeWarp:!1},Gn=()=>1,Kt=()=>{};' +
        `${declarations}return {${names},n,b};`,
        { log() {}, warn: (...a) => warnings.push(a.join(' ')) })
    return { game: new Function('window', code)(window), warnings: warnings.filter(w => w.includes('tack')) }
}
const afterMicrotasks = () => new Promise(resolve => setTimeout(resolve, 0))

test('tack: hooks run after a tick, once, and not after addTimers called outside a tick', async () => {
    const window = {}
    const { game, warnings } = run(`let ${addTimers()},${tack()};`, window)
    assert.deepEqual(warnings, [])
    // A code redemption or a time skip: the hook isn't even installed by it
    game.At('quarks', 5)
    assert.equal(window.__HS_TACK_PATCHED, undefined)
    game.jY(1)
    assert.equal(window.__HS_TACK_PATCHED, true)
    // That tick's hooks run in a microtask queued when it started: register after it
    await afterMicrotasks()

    let calls = 0
    window.__HS_onAfterTack(() => calls++)
    game.At('quarks', 5)
    game.At('ambrosia', 5)
    await afterMicrotasks()
    assert.equal(calls, 0)

    game.jY(1)
    assert.equal(calls, 0, 'hooks run after the tick, not during it')
    await afterMicrotasks()
    assert.equal(calls, 1)
    game.jY(1)
    await afterMicrotasks()
    assert.equal(calls, 1, 'a hook runs once')
    // The game's timers still run
    assert.equal(game.n.quarks, 13)
    assert.equal(game.n.autoPotion, 3.05)
})

test('tack: names starting with "$", tack defined before addTimers, single quotes', async () => {
    const window = {}
    const { game, warnings } = run(`let ${tack('$Y', '$t', "'")},${addTimers('$t')};`, window, '$t,$Y')
    assert.deepEqual(warnings, [])
    game.$Y(1)
    await afterMicrotasks()
    let calls = 0
    window.__HS_onAfterTack(() => calls++)
    game.$t('quarks', 1)
    await afterMicrotasks()
    assert.equal(calls, 0)
    game.$Y(1)
    await afterMicrotasks()
    assert.equal(calls, 1)
})

test('tack: a second function matching the anchor is reported, the first still patched', () => {
    const window = {}
    const { game, warnings } = run(`let ${addTimers()},${tack()},${tack('jZ')};`, window, 'At,jY,jZ')
    assert.equal(warnings.length, 1)
    assert.match(warnings[0], /tack\(\): 2 places match its anchor — patched jY, also jZ/)
    // Written into the bundle for the mod's notification
    assert.deepEqual(window.__HS_PATCH_AMBIGUOUS, ['tack()'])
    game.jZ(1)
    assert.equal(window.__HS_TACK_PATCHED, undefined)
    game.jY(1)
    assert.equal(window.__HS_TACK_PATCHED, true)
})

test('tack: not found, no hook in addTimers, with a warning', () => {
    const window = {}
    const { game, warnings } = run(`let ${addTimers()},jY=e=>{At("quarks",e)};`, window)
    game.At('quarks', 1)
    game.jY(1)
    assert.equal(window.__HS_TACK_PATCHED, undefined)
    assert.equal(warnings.length, 1)
})
