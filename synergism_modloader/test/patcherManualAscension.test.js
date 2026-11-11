const test = require('node:test')
const assert = require('node:assert/strict')
const { patchBundle } = require('../lib/patcher.js')

const source = `
    const $reset = type => events.push(type)
    const challengeEntry = async () => { await confirm('main.ascendPrompt'); events.push('challenge') }
    const $confirmReset = async type => {
        if (type === 'transcend' && await confirm('main.transcendPrompt')) $reset('transcension')
        if (type === 'reincarnate' && await confirm('main.reincarnatePrompt')) $reset('reincarnation')
        if (type === 'ascend' && (!window.ask || await confirm('main.ascendPrompt'))) $reset('ascension')
    }
    return { ascend: () => $confirmReset('ascend'), challengeEntry, autoAscend: () => $reset('ascension') }
`

function game(window, confirm, events, fixture = source) {
    const patched = patchBundle(fixture, { log() {}, warn() {} })
    return new Function('window', 'confirm', 'events', patched)(window, confirm, events)
}

test('manual ascension wraps the reset only after approval, using the original event after awaiting', async () => {
    const events = []
    const window = {
        ask: true,
        event: { isTrusted: true },
        __HS_runManualAscension(reset) {
            events.push('load')
            reset()
            events.push('restore')
        }
    }
    let answer
    const confirm = () => new Promise(resolve => { answer = resolve })
    const { ascend } = game(window, confirm, events)
    assert.equal(window.__HS_PATCH_REPORT.manualAscension, true)
    const cancelled = ascend()
    answer(false)
    await cancelled
    assert.deepEqual(events, [])

    const confirmed = ascend()
    assert.deepEqual(events, [])
    delete window.event
    answer(true)
    await confirmed
    assert.deepEqual(events, ['load', 'ascension', 'restore'])

    window.ask = false
    window.event = { isTrusted: true }
    events.length = 0
    await ascend()
    assert.deepEqual(events, ['load', 'ascension', 'restore'])
})

test('native ascension works without the mod, and internal resets bypass the hook', async () => {
    const events = []
    const window = { event: { isTrusted: true } }
    const { ascend, autoAscend, challengeEntry } = game(window, async () => true, events)
    await ascend()
    window.__HS_runManualAscension = () => assert.fail('unexpected manual ascension')
    await challengeEntry()
    autoAscend()
    window.event = { isTrusted: false }
    await ascend()
    assert.deepEqual(events, ['ascension', 'challenge', 'ascension', 'ascension'])
})

test('an ambiguous reset call leaves the native code alone', async () => {
    const events = []
    const window = { event: { isTrusted: true }, __HS_runManualAscension: () => assert.fail('unexpected hook') }
    const duplicate = source.replace("$reset('transcension')", "$reset('ascension')")
    const { ascend } = game(window, async () => true, events, duplicate)
    assert.equal(window.__HS_PATCH_REPORT.manualAscension, false)
    await ascend()
    assert.deepEqual(events, ['ascension'])
})
