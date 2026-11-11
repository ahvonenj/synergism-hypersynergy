const test = require('node:test')
const assert = require('node:assert/strict')
const {
    hashPatcher, readBundledPatcher, downloadPatcher, loadPatcher, checkPatcherChanged
} = require('../lib/patcherSource')

const URL = 'https://example.com/patcher.js'
const REMOTE = 'module.exports = { patchBundle: code => code } // remote'

const respond = (status, body = '') => async () => ({ status, ok: status >= 200 && status < 300, text: async () => body })
const failing = message => async () => { throw new Error(message) }
const neverCalled = async () => { assert.fail('the patcher should not be downloaded') }

test('the hash ignores line endings and nothing else', () => {
    assert.equal(hashPatcher('a\r\nb\r\n'), hashPatcher('a\nb\n'))
    assert.notEqual(hashPatcher('a\nb\n'), hashPatcher('a\nb'))
    assert.match(hashPatcher(''), /^[0-9a-f]{64}$/)
})

test('a download tells a ref without patcher from a ref that could not be read', async () => {
    assert.deepEqual(await downloadPatcher(URL, { fetchImpl: respond(200, REMOTE) }), { status: 'remote', code: REMOTE })
    assert.equal((await downloadPatcher('', { fetchImpl: neverCalled })).status, 'missing')
    assert.equal((await downloadPatcher(URL, { fetchImpl: respond(404) })).status, 'missing')
    assert.equal((await downloadPatcher(URL, { fetchImpl: respond(200, '<html>not a patcher</html>') })).status, 'missing')
    assert.equal((await downloadPatcher(URL, { fetchImpl: respond(503) })).status, 'unreachable')
    const offline = await downloadPatcher(URL, { fetchImpl: failing('getaddrinfo ENOTFOUND example.com') })
    assert.deepEqual(offline, { status: 'unreachable', reason: 'getaddrinfo ENOTFOUND example.com' })
})

test('a download passes its time limit to fetch', async () => {
    let options
    await downloadPatcher(URL, { fetchImpl: async (_url, opts) => { options = opts; return respond(200, REMOTE)() }, timeoutMs: 5000 })
    assert.ok(options.signal instanceof AbortSignal)
    await downloadPatcher(URL, { fetchImpl: async (_url, opts) => { options = opts; return respond(200, REMOTE)() } })
    assert.equal(options.signal, undefined)
})

test('a patch uses the ref\'s patcher, and the bundled copy when there is none or the download fails', async () => {
    const logs = []
    const remote = await loadPatcher(URL, { fetchImpl: respond(200, REMOTE), onLog: line => logs.push(line) })
    assert.deepEqual(remote, { code: REMOTE, hash: hashPatcher(REMOTE), source: 'remote' })
    assert.deepEqual(logs, [`Fetching ${URL}`])

    const bundled = readBundledPatcher()
    for (const fetchImpl of [respond(404), respond(503), failing('offline'), respond(200, 'not a patcher')]) {
        const result = await loadPatcher(URL, { fetchImpl })
        assert.equal(result.source, 'bundled')
        assert.equal(result.code, bundled)
        assert.equal(result.hash, hashPatcher(bundled))
    }
    assert.equal((await loadPatcher(undefined, { fetchImpl: neverCalled })).source, 'bundled')
})

test('a patch limits its download in time, and its log tells a missing patcher from a failed download', async () => {
    let options
    await loadPatcher(URL, { fetchImpl: async (_url, opts) => { options = opts; return respond(200, REMOTE)() }, timeoutMs: 15000 })
    assert.ok(options.signal instanceof AbortSignal)

    const logOf = async fetchImpl => {
        const logs = []
        await loadPatcher(URL, { fetchImpl, onLog: line => logs.push(line) })
        return logs[1]
    }
    assert.match(await logOf(respond(404)), /^patcher\.js not available at that ref — falling back to the bundled copy \(/)
    assert.match(await logOf(failing('The operation was aborted due to timeout')),
        /^patcher\.js could not be downloaded — falling back to the bundled copy \(The operation was aborted due to timeout\)$/)
})

test('a game patched without a recorded patcher needs a patch, with no download', async () => {
    for (const lastHash of ['', undefined, null]) {
        const result = await checkPatcherChanged({ lastHash, patcherUrl: URL, fetchImpl: neverCalled })
        assert.deepEqual(result, { needsRepatch: true, reason: 'no-hash' })
    }
})

test('the check compares the recorded patcher with the ref\'s own', async () => {
    const same = await checkPatcherChanged({ lastHash: hashPatcher(REMOTE), patcherUrl: URL, fetchImpl: respond(200, REMOTE) })
    assert.deepEqual(same, { needsRepatch: false, reason: 'same' })

    const changed = await checkPatcherChanged({ lastHash: hashPatcher(REMOTE), patcherUrl: URL, fetchImpl: respond(200, `${REMOTE} v2`) })
    assert.deepEqual(changed, { needsRepatch: true, reason: 'changed' })
})

test('a ref without patcher is compared with the bundled copy, which a patch of it would use', async () => {
    const bundledHash = hashPatcher(readBundledPatcher())
    const same = await checkPatcherChanged({ lastHash: bundledHash, patcherUrl: URL, fetchImpl: respond(404) })
    assert.deepEqual(same, { needsRepatch: false, reason: 'same' })

    const changed = await checkPatcherChanged({ lastHash: hashPatcher(REMOTE), patcherUrl: URL, fetchImpl: respond(404) })
    assert.deepEqual(changed, { needsRepatch: true, reason: 'changed' })
})

test('a check that cannot download the patcher never asks for a patch', async () => {
    for (const fetchImpl of [respond(503), failing('offline')]) {
        const result = await checkPatcherChanged({ lastHash: hashPatcher(REMOTE), patcherUrl: URL, fetchImpl })
        assert.equal(result.needsRepatch, false)
        assert.equal(result.reason, 'unknown')
        assert.ok(result.error)
    }
})
