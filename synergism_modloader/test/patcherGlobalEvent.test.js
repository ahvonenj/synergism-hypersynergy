const test = require('node:test')
const assert = require('node:assert/strict')
const { patchBundle } = require('../lib/patcher.js')

// Event.ts in the shape of the minified bundle: eventCheck fetches the event, keeps it when it is running,
// and keeps the previous one on a failed answer; the event page handler next to it fetches another URL
const eventTs =
    'let Ep=null,Vy="",Qy=()=>window.now;' +
    'let tokenFetch=async()=>{let o=await fetch("https://synergism.cc/events/token",{method:"POST"});return o.ok};' +
    'let oL=async()=>{if(!n.dayCheck)return;let e=await fetch("https://synergism.cc/events/get");' +
    'if(!e.ok)throw new Error("God fucking dammit");let t=await e.json();Ep=null;let r=new Date(Qy()).getTime();' +
    'r>=t.start&&r<=t.end&&t.name.length&&(Ep=t)};'

const event = { name: ['Test event'], url: [''], start: 1000, end: 5000, quark: 0.5 }

// A browser fetch answering from a list, counting its calls; json() can only be read once, as on a real Response
const fakeFetch = (answers, calls) => (url) => {
    calls.push(url)
    const { ok, body } = answers.shift()
    const response = (used = { read: false }) => ({
        ok,
        clone: () => response(),
        json: async () => {
            if (used.read) throw new TypeError('body used already')
            used.read = true
            return JSON.parse(JSON.stringify(body))
        }
    })
    return Promise.resolve(response())
}

const run = (window, n = { dayCheck: new Date() }) => {
    const warnings = []
    const code = patchBundle(
        `"use strict";${eventTs}return {eventCheck:oL,tokenFetch,getEvent:()=>Ep};`,
        { log() {}, warn: (...a) => warnings.push(a.join(' ')) })
    // The game's own `fetch` is the window's, as in a page
    const game = new Function('window', 'n', 'fetch', code)(window, n, (...a) => window.fetch(...a))
    return { game, warnings: warnings.filter(w => w.includes('global event')), code }
}

const flush = () => new Promise(resolve => setTimeout(resolve, 0))

test('global event: the game gets its answer, the mod gets a copy', async () => {
    const calls = []
    const received = []
    const window = { now: 2000, fetch: fakeFetch([{ ok: true, body: event }], calls) }
    const { game, warnings, code } = run(window)
    assert.deepEqual(warnings, [])
    // Set at the top of the bundle, after its "use strict"
    assert.ok(code.startsWith('"use strict";\n'))
    assert.equal(window.__HS_GLOBAL_EVENT_PATCHED, true)
    window.__HS_onGlobalEvent = json => received.push(json)

    await game.eventCheck()
    await flush()
    assert.deepEqual(calls, ['https://synergism.cc/events/get'])
    assert.deepEqual(game.getEvent(), event)
    assert.deepEqual(window.__HS_globalEvent, event)
    assert.deepEqual(received, [event])
})

test('global event: kept for the mod before it loads, nothing on a failed answer', async () => {
    const calls = []
    const window = { now: 2000, fetch: fakeFetch([{ ok: true, body: event }, { ok: false, body: {} }], calls) }
    const { game } = run(window)

    // The game's first fetch comes before the mod: only the stored copy
    await game.eventCheck()
    await flush()
    assert.deepEqual(window.__HS_globalEvent, event)

    const received = []
    window.__HS_onGlobalEvent = json => received.push(json)
    await assert.rejects(game.eventCheck())
    await flush()
    assert.deepEqual(received, [])
    assert.deepEqual(window.__HS_globalEvent, event)
    assert.deepEqual(game.getEvent(), event)
})

test('global event: no dayCheck, no fetch; the mod throwing changes nothing for the game', async () => {
    const calls = []
    const window = { now: 2000, fetch: fakeFetch([{ ok: true, body: event }], calls) }
    const noDay = run(window, { dayCheck: null })
    await noDay.game.eventCheck()
    assert.deepEqual(calls, [])

    const { game } = run(window)
    window.__HS_onGlobalEvent = () => { throw new Error('mod error') }
    await game.eventCheck()
    await flush()
    assert.deepEqual(game.getEvent(), event)
})

test('global event: the event page fetch is left alone', async () => {
    const calls = []
    const window = { now: 2000, fetch: fakeFetch([{ ok: true, body: { token: 'x' } }], calls) }
    const { game } = run(window)
    window.__HS_onGlobalEvent = () => { throw new Error('should not be called') }
    assert.equal(await game.tokenFetch(), true)
    await flush()
    assert.equal(window.__HS_globalEvent, undefined)
})
