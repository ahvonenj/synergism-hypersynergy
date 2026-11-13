// After a game update that changes Buy.ts: the coin buildings owned by GDS (hs-gamedata-api-building.ts) against the
// game's own QuadraticCostCurve / maxAffordable (Buy.ts, cut out and run as is) on finite paid amounts, which
// test-gds-formulas.cjs can't check (late saves have paid amounts of Infinity). Only GDS's fallback for a game from
// before the rune rework (2026-11-12) derives counts from paid amounts: delete this tool with that fallback. Needs the
// game source (node scripts/tools/update-game.cjs).
// Usage: node scripts/tools/coin-curve-vs-vanilla.cjs
const fs = require('node:fs')
const path = require('node:path')
const Module = require('node:module')
const esbuild = require('esbuild')

const root = path.resolve(__dirname, '../..')
const load = (code, name) => {
    const m = new Module(path.join(root, name), module)
    m.filename = path.join(root, name)
    m.paths = Module._nodeModulePaths(root)
    m._compile(code, m.filename)
    return m.exports
}

// Vanilla: from producerData to the end of maxAffordable
const buyFile = path.join(root, 'local/game/SynergismOfficial-master/src/Buy.ts')
if (!fs.existsSync(buyFile)) { console.error('no game source: run node scripts/tools/update-game.cjs'); process.exit(1) }
const buy = fs.readFileSync(buyFile, 'utf8')
const start = buy.indexOf('const producerData')
const endMark = buy.indexOf('const curveBuildings')
if (start < 0 || endMark < 0) throw new Error('Buy.ts changed: update this script')
const vanillaTs = `import Decimal from 'break_infinity.js'
const G = { d1e300: new Decimal(1e300) }
const smallestInc = (x = 0) => x <= Number.MAX_SAFE_INTEGER ? 1 : 2 ** Math.floor(Math.log2(x) - 52)
${buy.slice(start, endMark)}
export { QuadraticCostCurve, quadraticCurveConstants, challenge8QuadraticCurveConstants, maxAffordable, costBetween }
`
const vanilla = load(esbuild.transformSync(vanillaTs, { loader: 'ts', format: 'cjs' }).code, 'vanilla-buy.cjs')

// GDS: the helper on a stub API, construction set by the stub
const gdsCode = esbuild.buildSync({
    entryPoints: [path.join(root, 'src/mod/class/hs-core/gds/hs-gamedata-api-building.ts')],
    bundle: true, write: false, platform: 'node', format: 'cjs', logLevel: 'warning',
    tsconfig: path.join(root, 'tsconfig.json'),
    define: { HS_DEV_BUILD: 'true', HS_BUILD_VERSION: '"test"' },
}).outputFiles[0].text
const { BuildingHelper } = load(gdsCode, 'gds-building.cjs')
const Decimal = require(path.join(root, 'node_modules/break_infinity.js'))

function gdsOwned(paid, construction, reincarnation) {
    const data = {
        currentChallenge: { transcension: 0, reincarnation, ascension: 0 },
        upgrades: [], researches: [], platonicUpgrades: [],
        firstPaidCoin: paid[0], secondPaidCoin: paid[1], thirdPaidCoin: paid[2], fourthPaidCoin: paid[3], fifthPaidCoin: paid[4],
    }
    const api = {
        getGameData: () => data,
        rune: { getRuneEffects: () => ({ construction: construction - 1 }) },
        antUpgrade: { getAntUpgradeEffectValue: () => 0 },
        calculateChallenge15Reward: () => 0,
        corruption: { getActiveCorruptionLevel: () => 0, getCorruptionEffectNumber: () => 1 },
    }
    const helper = new BuildingHelper(api)
    const divisor = reincarnation === 8 ? 5 : reincarnation === 10 ? 2 : 1
    return { owned: helper.getCoinBuildingsOwned(), threshold: helper.calculateCoinConstruction() * 1000, expectedThreshold: construction / divisor * 1000 }
}

function rng(seed) { let s = seed; return () => (s = (s * 1664525 + 1013904223) % 4294967296) / 4294967296 }
const r = rng(441)
let checks = 0
const failures = []
for (let i = 0; i < 4000; i++) {
    const construction = 1 + r() * (r() < 0.5 ? 10 : 2000)
    const reincarnation = [0, 0, 8, 10][Math.floor(r() * 4)]
    // log10 of the paid amounts: small, around the threshold, past 1e300 and far past it
    const paid = Array.from({ length: 5 }, () => {
        const band = r()
        const log = band < 0.3 ? r() * 30 : band < 0.6 ? r() * 2000 : band < 0.9 ? r() * 1e6 : r() * 1e9
        return Decimal.pow(10, log).times(1 + r()).toString()
    })
    const g = gdsOwned(paid, construction, reincarnation)
    if (Math.abs(g.threshold - g.expectedThreshold) > 1e-9 * g.expectedThreshold) failures.push(`threshold ${g.threshold} vs ${g.expectedThreshold}`)
    const constants = reincarnation === 8 ? vanilla.challenge8QuadraticCurveConstants.coin : vanilla.quadraticCurveConstants.coin
    for (let k = 0; k < 5; k++) {
        checks++
        const want = vanilla.maxAffordable(new vanilla.QuadraticCostCurve(constants[k], g.threshold), new Decimal(paid[k]))
        if (want !== g.owned[k]) failures.push(`paid ${paid[k]} building ${k + 1} threshold ${g.threshold} C${reincarnation}: vanilla ${want}, GDS ${g.owned[k]}`)
    }
}
// Round trip: what n buildings cost buys n
for (let n = 0; n < 5000; n += 7) {
    checks++
    const curve = new vanilla.QuadraticCostCurve(vanilla.quadraticCurveConstants.coin[2], 1500)
    const g = gdsOwned([0, 0, vanilla.costBetween(curve, 0, n).toString(), 0, 0], 1.5, 0)
    if (g.owned[2] !== n) failures.push(`round trip ${n}: GDS ${g.owned[2]}`)
}
console.log(failures.length ? `${failures.length} of ${checks} failed:\n${failures.slice(0, 20).join('\n')}` : `${checks} checks: GDS matches vanilla`)
if (failures.length) process.exitCode = 1
