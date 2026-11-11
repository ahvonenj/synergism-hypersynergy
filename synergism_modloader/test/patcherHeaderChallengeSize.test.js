const test = require('node:test')
const assert = require('node:assert/strict')
const { patchBundle } = require('../lib/patcher.js')

function fixture({ dollar = false, declaration = false, missing = false } = {}) {
    const layout = dollar ? '$layout' : 'layout', id = dollar ? '$id' : 'id'
    const reader = declaration ? `function sizeOf(${layout}, ${id})` : `const sizeOf = (${layout}, ${id}) =>`
    const source = `${reader} { var fallback; return (fallback = ${layout}.${missing ? 'other' : 'sizes'}[${id}]) != null ? fallback : 'M'; }
        const span = (layout, id) => { const size = sizeOf(layout, id); return {columns:size==='L'?2:size==='XL'?3:1, rows:size==='Tall'?2:1}; };
        return {sizeOf, span};`
    const patched = patchBundle(source, { log() {}, warn() {} })
    const window = {}
    return { window, game: Function('window', patched)(window) }
}

for (const options of [{}, { dollar: true }, { declaration: true }]) {
    test(`compact challenge sizes preserve saved layouts ${JSON.stringify(options)}`, () => {
        const { window, game } = fixture(options)
        assert.equal(window.__HS_PATCH_REPORT.headerChallengeSize, true)
        assert.equal(window.__HS_HEADER_CHALLENGE_SIZE_PATCHED, true)
        const ids = ['transcensionChallengeProgress', 'reincarnationChallengeProgress', 'ascensionChallengeProgress']
        const layout = { sizes: Object.fromEntries([...ids, 'hsChallengeProgress', 'other'].map(id => [id, 'Tall'])) }
        const saved = structuredClone(layout)
        for (const id of ids) assert.deepEqual(game.span(layout, id), { columns: 1, rows: 2 })
        window.__HS_compactChallengeText = true
        for (const id of ids) {
            assert.equal(game.sizeOf(layout, id), 'M')
            assert.deepEqual(game.span(layout, id), { columns: 1, rows: 1 })
        }
        for (const id of ['hsChallengeProgress', 'other']) assert.equal(game.sizeOf(layout, id), 'Tall')
        assert.deepEqual(layout, saved, 'the setting never writes to the layout saved by the game')
        for (const size of ['S', 'M', 'L', 'XL']) {
            assert.equal(game.sizeOf({ sizes: { [ids[0]]: size } }, ids[0]), size)
        }
        assert.equal(game.sizeOf({ sizes: {} }, ids[0]), 'M')
        window.__HS_compactChallengeText = false
        for (const id of ids) assert.deepEqual(game.span(layout, id), { columns: 1, rows: 2 })
    })
}

test('a missing size reader leaves native sizing intact', () => {
    const { window, game } = fixture({ missing: true })
    assert.equal(window.__HS_PATCH_REPORT.headerChallengeSize, false)
    assert.equal(window.__HS_HEADER_CHALLENGE_SIZE_PATCHED, undefined)
    window.__HS_compactChallengeText = true
    assert.equal(game.sizeOf({ other: { ascensionChallengeProgress: 'Tall' } }, 'ascensionChallengeProgress'), 'Tall')
})
