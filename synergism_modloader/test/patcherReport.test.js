const test = require('node:test')
const assert = require('node:assert/strict')
const { patchBundle } = require('../lib/patcher.js')

const BROWSER_PATCHES = ['export', 'exportOutput', 'stage', 'player', 'talismans', 'getMaxChallenges', 'tack', 'dialogHook',
    'validateBlueberryTree', 'saveImportHook', 'consumables', 'pcoinLevels', 'quarkBonus', 'globalEvent', 'headerModules', 'saveSeedCap', 'headerButtons', 'headerLongPress']

const patch = (code, options = {}) => {
    const logs = []
    const patched = patchBundle(code, { log: (...a) => logs.push(a.join(' ')), warn() {}, ...options })
    return { patched, logs }
}

test('report: every patch listed, written into the bundle and summed up in the log', () => {
    const window = {}
    const { patched, logs } = patch('"use strict";return 1')
    assert.equal(new Function('window', patched)(window), 1)
    assert.deepEqual(Object.keys(window.__HS_PATCH_REPORT), BROWSER_PATCHES)
    assert.ok(Object.values(window.__HS_PATCH_REPORT).every(applied => applied === false))
    assert.deepEqual(window.__HS_PATCH_AMBIGUOUS, [])
    assert.equal(logs.at(-1), `Bundle patching complete: 0/${BROWSER_PATCHES.length} applied — missing: ${BROWSER_PATCHES.join(', ')}`)

    const steam = {}
    new Function('window', patch('return 1', { steam: true }).patched)(steam)
    assert.deepEqual(Object.keys(steam.__HS_PATCH_REPORT), [...BROWSER_PATCHES, 'steamAutoSync'])
})

test('report: a patch matching several places is listed in the summary and in the bundle', () => {
    // Two functions holding getMaxChallenges' anchor and markers
    const cap = name => `${name}=e=>n.researches[105]>0||n.singularityChallenges.oneChallengeCap.enabled?1:4*n.cubeUpgrades[29]+P("reincarnationChallengeCap")`
    const window = {}
    const { patched, logs } = patch(`"use strict";const n={},P=()=>0;let ${cap('pn').replace('=>', '=>{return ')}},${cap('pm').replace('=>', '=>{return ')}};return 1`)
    new Function('window', patched)(window)
    assert.deepEqual(window.__HS_PATCH_AMBIGUOUS, ['getMaxChallenges'])
    assert.equal(window.__HS_PATCH_REPORT.getMaxChallenges, true)
    assert.match(logs.at(-1), /— to check \(several matches\): getMaxChallenges$/)
})

test('report: the bundle\'s "use strict" directive stays first, so the game still runs in strict mode', () => {
    // In strict mode, a plain call gets no `this`. eventCheck: the global event patch adds its flag at the top
    const eventCheck = 'let oL=async()=>{if(!n.dayCheck)return;let e=await fetch("https://synergism.cc/events/get");return e.json()};'
    const thisInCall = `${eventCheck}return (function(){return this})()`
    for (const directive of ['"use strict";', "'use strict';", '"use strict"\n', '  "use strict";']) {
        const { patched } = patch(`${directive}${thisInCall}`)
        assert.equal(new Function('window', patched)({}), undefined, JSON.stringify(directive))
    }
    // Without a directive, nothing to keep
    const { patched } = patch(thisInCall)
    assert.notEqual(new Function('window', patched)({}), undefined)
})
