// Talisman levels (docs/features/gds.md): a replayed level outlives clearCache(), so a stale one would show no error, only
// wrong numbers. On the same object, as the live source: each change must give what an API with nothing kept gives.
// Then the live player's level, which comes from the game's object.
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const Module = require('node:module')
const esbuild = require('esbuild')
const { PRESETS, loadStubs } = require('../harness/lib/node-stubs.cjs')

const root = path.resolve(__dirname, '../..')
const reference = JSON.parse(fs.readFileSync(path.join(root, 'scripts/fixtures/gds-reference.json'), 'utf8'))

async function main() {
    const { outputFiles } = await esbuild.build({
        entryPoints: [path.join(root, 'src/mod/class/hs-core/gds/hs-gamedata-api.ts')],
        bundle: true, write: false, platform: 'node', format: 'cjs',
        tsconfig: path.join(root, 'tsconfig.json'),
        define: { HS_DEV_BUILD: 'true', HS_BUILD_VERSION: '"test"' },
        banner: { js: PRESETS.gds.banner },
        logLevel: 'warning',
        plugins: [{ name: 'gds-stubs', setup: build => loadStubs(build, PRESETS.gds.stubs) }],
    })
    const file = path.join(root, 'gds-talisman-test-runtime.cjs')
    const runtime = new Module(file, module)
    runtime.filename = file
    runtime.paths = module.paths
    globalThis.window ??= globalThis
    runtime._compile(outputFiles[0].text, file)
    const { HSGameDataAPI } = runtime.exports

    const fed = (player) => {
        const api = new HSGameDataAPI({ moduleName: 'HSGameDataAPI', context: 'HSGameDataAPI' })
        api._updateGameData(player)
        return api
    }
    // Proportional to the levels of every talisman that gives speed
    const bonus = (api) => api.talisman.getRuneBonusFromAllTalismans('speed')

    const player = structuredClone(reference.base)
    const api = fed(player)
    const start = bonus(api)
    assert.ok(start > 0, 'the fixture has talisman levels')
    const changed = (name, expectChange = true) => {
        api._updateGameData(player)
        const value = bonus(api)
        assert.equal(value, bonus(fed(player)), `${name}: the same as with nothing kept`)
        if (expectChange) assert.notEqual(value, start, `${name}: the level moved`)
    }

    changed('an update with no change', false)
    assert.equal(bonus(api), start)

    const chronos = player.talismans.chronos
    player.talismans.chronos = Object.fromEntries(Object.keys(chronos).map((k) => [k, '0']))
    changed('fragments gone')
    player.talismans.chronos = chronos
    changed('fragments back', false)
    assert.equal(bonus(api), start)

    const completions = player.challengecompletions[13]
    const research = player.researches[200]
    player.challengecompletions[13] = 0
    player.researches[200] = 0
    changed('a lower cap')
    player.challengecompletions[13] = completions
    player.researches[200] = research
    changed('the cap back', false)
    assert.equal(bonus(api), start)

    // The live player: the game's level, whatever the fragments allow. Rarity 7 is the talisman's base maximum level.
    const live = Object.fromEntries(Object.keys(player.talismans).map((k) => [k, { level: 0, fragmentsInvested: player.talismans[k] }]))
    window.__HS_talismans = live
    window.symp = Symbol('player')
    window[window.symp] = player
    api.clearCache()
    assert.equal(api.talisman.getTalismanRarity('chronos'), 1, 'level 0, unlocked')
    live.chronos.level = 180
    api.clearCache()
    assert.equal(api.talisman.getTalismanRarity('chronos'), 7, 'the base maximum level')

    // A save read on a patched game isn't the live player: its fragments count
    const other = fed(structuredClone(reference.base))
    assert.equal(bonus(other), start, 'a save, with the game object present')

    console.log('talisman levels: follow fragments and cap on the same object; the live player reads the game')
    // Something in the bundle keeps node alive
    process.exit(0)
}

main().catch((error) => { console.error(error); process.exit(1) })
