const test = require('node:test')
const assert = require('node:assert/strict')
const { listChannels, resolveChannel, setLocalChannelEnabled, LOCAL_CHANNEL_ID } = require('../lib/config')
const { buildModUrl, buildPatcherUrl } = require('../lib/patchGame')

test('the local channel is hidden by default and resolves to the default channel', t => {
    t.after(() => setLocalChannelEnabled(false))
    setLocalChannelEnabled(false)
    assert.ok(!listChannels().some(ch => ch.id === LOCAL_CHANNEL_ID))
    assert.equal(resolveChannel(LOCAL_CHANNEL_ID), resolveChannel('live'))
    assert.match(buildModUrl(LOCAL_CHANNEL_ID, 'local'), /^https:\/\/cdn\.jsdelivr\.net\/gh\/Ferlieloi\//)
})

test('the enabled local channel points both files at the dev server, without cache', t => {
    t.after(() => setLocalChannelEnabled(false))
    setLocalChannelEnabled(true)
    assert.ok(listChannels().some(ch => ch.id === LOCAL_CHANNEL_ID))
    assert.match(buildModUrl(LOCAL_CHANNEL_ID, 'local'), /^http:\/\/127\.0\.0\.1:8080\/hypersynergism\.js\?t=\d+$/)
    assert.match(buildPatcherUrl(LOCAL_CHANNEL_ID, 'local'),
        /^http:\/\/127\.0\.0\.1:8080\/synergism_modloader\/lib\/patcher\.js\?t=\d+$/)
    assert.match(buildModUrl('dev', 'master'), /^https:\/\/cdn\.jsdelivr\.net\/gh\/maenhiir\/synergism-hypersynergy@master\//)
})

test('the public channels make the mod URL unique, so the game does not reuse a cached mod', () => {
    assert.match(buildModUrl('dev', 'master'),
        /^https:\/\/cdn\.jsdelivr\.net\/gh\/maenhiir\/synergism-hypersynergy@master\/release\/mod\/hypersynergism_release\.js\?t=\d+$/)
    assert.match(buildModUrl('live', 'v2.14.4b'),
        /^https:\/\/cdn\.jsdelivr\.net\/gh\/Ferlieloi\/synergism-hypersynergy@v2\.14\.4b\/release\/mod\/hypersynergism_release\.js\?t=\d+$/)
    assert.equal(buildPatcherUrl('dev', 'master'),
        'https://cdn.jsdelivr.net/gh/maenhiir/synergism-hypersynergy@master/synergism_modloader/lib/patcher.js')
})
