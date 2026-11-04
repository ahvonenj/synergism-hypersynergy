// GDS against the real game: scripts/fixtures/gds-reference.json holds what the game's Stats for nerds showed, at full
// precision, on states of one save (scripts/harness/gds-vs-game.cjs writes it). No game, no Chrome here.
// GDS_REFERENCE=<file> replays another reference (another save, a newer game).
const fs = require('node:fs')
const path = require('node:path')
const Module = require('node:module')
const esbuild = require('esbuild')
const { PRESETS, loadStubs } = require('../harness/lib/node-stubs.cjs')

const root = path.resolve(__dirname, '../..')
const referenceFile = process.env.GDS_REFERENCE ?? path.join(root, 'scripts/fixtures/gds-reference.json')
const reference = JSON.parse(fs.readFileSync(referenceFile, 'utf8'))

const bundled = esbuild.build({
    entryPoints: [path.join(root, 'src/mod/class/hs-core/gds/hs-gamedata-api.ts')],
    bundle: true, write: false, platform: 'node', format: 'cjs',
    tsconfig: path.join(root, 'tsconfig.json'),
    define: { HS_DEV_BUILD: 'true', HS_BUILD_VERSION: '"test"' },
    banner: { js: PRESETS.gds.banner },
    logLevel: 'warning',
    plugins: [{ name: 'gds-stubs', setup: build => loadStubs(build, PRESETS.gds.stubs) }],
})

const luck = key => api => api.luck.calculateLuck(true)[key]
const rune = (name, effect) => api => api.rune.getRuneEffects(name)[effect]

// Each id the game shows, and the GDS value that is meant to equal it
const TOTALS = {
    statAL: luck('luckBase'),
    statALM: luck('luckMult'),
    statAL2: luck('luckTotal'),
    statAB: api => api.ambrosia.calculateBlueberryInventory(true),
    statAG: api => api.ambrosia.calculateAmbrosiaGenerationSpeed(true),
    statLC: api => api.luck.calculateLuckConversion(true),
    statRAL: api => api.luck.calculateRedAmbrosiaLuck(true),
    statRAGM2: api => api.ambrosia.calculateRedAmbrosiaGenerationSpeed(true),
    statFCL: api => api.corruption.calculateFreeCorruptionLevels(true),
    statSV2: api => api.calculateAllShopTablets(true),
    statASM: api => api.calculateRawAscensionSpeedMult(true),
    statASM2: api => api.calculateAscensionSpeedMult(),
    statCB2: api => api.calculateCubeBank(true),
    statPHoL: api => api.purple.calculatePurpleHoneyLuck(),
    statSalvPos2: api => api.rune.calculatePositiveSalvage(),
    statSalvNeg2: api => api.rune.calculateNegativeSalvage(),
    statSalvFirstFive: api => api.rune.calculateFirstFiveRuneSalvage(),
    statREMFF: api => api.firstFiveEffectiveRuneLevelMult(),
    statREMSI: api => api.firstFiveEffectiveRuneLevelMult() * api.rune.SIEffectiveRuneLevelMult(),
}
const LINES = {
    sMiscRuneSum: api => api.rune.calculateTotalRuneLevels(),
    statSalvPosRuneBonus: rune('thrift', 'salvage'),
    statSalvPosInfiniteAscentRune: rune('infiniteAscent', 'salvage'),
    statConBaseThriftRune: rune('thrift', 'construction'),
    statFreeAccelMultSpeedRune: rune('speed', 'multiplicativeAccelerators'),
    statFreeMultMultDuplicationRune: rune('duplication', 'multiplicativeMultipliers'),
    statObtRune5: rune('superiorIntellect', 'obtainiumMult'),
    statGSMSpeedRune: rune('speed', 'globalSpeed'),
    statTaxDuplicationRune: rune('duplication', 'taxReduction'),
    statTaxThriftRune: rune('thrift', 'taxReduction'),
    statALHorseShoeRune: rune('horseShoe', 'ambrosiaLuck'),
    statRALHorseShoeRune: rune('horseShoe', 'redLuck'),
    statPHoLHorseShoeRune: rune('horseShoe', 'purpleHoneyLuck'),
}

const same = (a, b) => a === b || Math.abs(a - b) <= 1e-9 * Math.max(1e-12, Math.abs(a), Math.abs(b))

function playerOf(state) {
    const player = structuredClone(reference.base)
    for (const [p, value] of Object.entries(state.changes)) {
        const keys = p.split('.')
        let o = player
        while (keys.length > 1) o = o[keys.shift()]
        o[keys[0]] = value
    }
    return player
}

function feed(api, player) {
    const { pseudoCoinLevels, quarkBonus } = reference.account
    if (quarkBonus) api._updateMeData({ globalBonus: Number(quarkBonus.global) || 0, bonus: { quark: Number(quarkBonus.personal) || 0 } })
    if (pseudoCoinLevels) api._updatePseudoData({ coins: 0, upgrades: [], playerUpgrades: Object.entries(pseudoCoinLevels).map(([internalName, level], upgradeId) => ({ upgradeId, internalName, level })) })
    api._updateGameData(player)
}

async function main() {
    const { outputFiles } = await bundled
    const runtime = new Module(path.join(root, 'gds-formulas-test-runtime.cjs'), module)
    runtime.filename = path.join(root, 'gds-formulas-test-runtime.cjs')
    runtime.paths = module.paths
    globalThis.window ??= globalThis
    runtime._compile(outputFiles[0].text, runtime.filename)
    const { HSGameDataAPI } = runtime.exports
    const newApi = () => new HSGameDataAPI({ moduleName: 'HSGameDataAPI', context: 'HSGameDataAPI' })

    const failures = []
    let checks = 0
    if (reference.states.length === 0) failures.push('the reference has no states')
    for (const state of reference.states) {
        const api = newApi()
        feed(api, playerOf(state))
        const check = (id, expected, fn) => {
            checks++
            const want = Number(expected)
            let got
            try { got = fn(api) } catch (e) { failures.push(`[${state.name}] ${id}: threw ${e.message}`); return }
            if (typeof got !== 'number' || !same(got, want)) failures.push(`[${state.name}] ${id}: game ${expected}, GDS ${got}`)
        }
        for (const [id, value] of Object.entries(state.totals)) {
            if (!TOTALS[id]) failures.push(`${id}: a total this test doesn't map`)
            else check(id, value, TOTALS[id])
        }
        for (const [id, value] of Object.entries(state.lines)) {
            if (!LINES[id]) failures.push(`${id}: a line this test doesn't map`)
            else check(id, value, LINES[id])
        }
        check('achievement points', state.achievementPoints, a => a.synergismLevel.calculateAchievementPoints())
        for (const [key, value] of Object.entries(state.progressive)) {
            check(`achievement points: ${key}`, value, a => a.synergismLevel.calculateProgressiveAchievementPoints()[key])
        }
    }
    if (failures.length) {
        console.error(`${failures.length} of ${checks} checks failed on ${reference.states.length} states:\n${failures.slice(0, 60).join('\n')}`)
        process.exit(1)
    }
    console.log(`gds formulas: ${checks} checks on ${reference.states.length} states match the game`)
    // Something in the bundle keeps node alive
    process.exit(0)
}

main().catch(e => { console.error(e.stack || e); process.exit(1) })
