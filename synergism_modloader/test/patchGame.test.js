const test = require('node:test')
const assert = require('node:assert/strict')
const { withRawArchiveAccess, runPatcher, PATCH_WARNING_PREFIX } = require('../lib/patchGame')

// A patcher that applies one step, and warns about two it could not apply.
const FAKE_PATCHER = `
function patchBundle(code, options) {
    options.log('Patched step one', '(fn=a)')
    options.warn('Could not patch step two — pattern not found')
    options.warn('Error while patching step three', new Error('boom'))
    return code + (options.steam ? '/*steam*/' : '')
}
`

test('the patcher\'s messages go to the patch log, and its warnings are counted', () => {
    const lines = []
    const result = runPatcher(`${FAKE_PATCHER}module.exports = { patchBundle }`, 'game', line => lines.push(line))
    assert.deepEqual(result, { patched: 'game/*steam*/', warnings: 2 })
    assert.deepEqual(lines, [
        '[PATCH] Patched step one (fn=a)',
        `${PATCH_WARNING_PREFIX} Could not patch step two — pattern not found`,
        `${PATCH_WARNING_PREFIX} Error while patching step three boom`
    ])
})

test('a patcher exported as a function runs too, and one without patchBundle is refused', () => {
    const result = runPatcher(`${FAKE_PATCHER}module.exports = patchBundle`, 'game')
    assert.deepEqual(result, { patched: 'game/*steam*/', warnings: 2 })
    assert.throws(() => runPatcher('module.exports = {}', 'game'), /did not export patchBundle/)
})

test('the bundled patcher reports through the log it is given', () => {
    const lines = []
    const { readBundledPatcher } = require('../lib/patcherSource')
    const result = runPatcher(readBundledPatcher(), 'not a game bundle', line => lines.push(line))
    assert.ok(result.warnings > 0)
    assert.equal(lines.filter(line => line.startsWith(PATCH_WARNING_PREFIX)).length, result.warnings)
    assert.ok(lines.every(line => line.startsWith('[PATCH] ')))
})

test('reads game archives without Electron ASAR mapping and restores the setting', async () => {
    const previous = process.noAsar
    await withRawArchiveAccess(async () => {
        assert.equal(process.noAsar, true)
    })
    assert.equal(process.noAsar, previous)

    await assert.rejects(
        withRawArchiveAccess(async () => {
            assert.equal(process.noAsar, true)
            throw new Error('archive failed')
        }),
        /archive failed/
    )
    assert.equal(process.noAsar, previous)
})