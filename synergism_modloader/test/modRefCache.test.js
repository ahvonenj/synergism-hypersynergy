const test = require('node:test')
const assert = require('node:assert/strict')
const { rememberedRefs } = require('../lib/modRefCache')

test('keeps the last played build available when the build list cannot load', () => {
    const config = {
        channel: 'live', modRef: 'v2.14.2',
        lastPlayedChannel: 'live', lastPlayedModRef: 'v2.14.4a',
        lastPatchedChannel: 'live', lastPatchedModRef: 'v2.14.3',
        refListCache: { live: [{ name: 'v2.14.1', type: 'tag', date: '2026-01-01' }] }
    }
    const refs = rememberedRefs(config, 'live', 'master')
    assert.deepEqual(refs.map(ref => ref.name), ['v2.14.1', 'v2.14.4a', 'v2.14.3', 'v2.14.2', 'master'])
    assert.equal(refs.find(ref => ref.name === 'v2.14.4a').type, 'last played')
    assert.equal(config.refListCache.live.length, 1)
})

test('does not mix saved builds from another channel', () => {
    const refs = rememberedRefs({
        channel: 'live', modRef: 'v2.14.2',
        lastPlayedChannel: 'live', lastPlayedModRef: 'v2.14.4a',
        refListCache: { dev: [{ name: 'dev-only', type: 'branch' }] }
    }, 'dev', 'master')
    assert.deepEqual(refs.map(ref => ref.name), ['dev-only', 'master'])
})
