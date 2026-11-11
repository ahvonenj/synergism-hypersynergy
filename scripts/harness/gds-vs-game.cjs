// The real game's Stats for nerds at full precision, on many states of one save, as a reference for GDS: writes what
// scripts/tests/test-gds-formulas.cjs replays. Run it after a game update (docs/game/updating.md).
// Usage: node scripts/harness/gds-vs-game.cjs <save> [--write]
//   Without --write the reference goes to local/harness-out/gds-vs-game/reference.json: check any save with
//     GDS_REFERENCE=<that file> node scripts/tests/test-gds-formulas.cjs
//   --write replaces scripts/fixtures/gds-reference.json. It is committed: only the developer's own save, never a player's.
// Env: ONLY=<regex> on state names, SETTLE=<ms> after each load (default 1200), PORT/HTTP_PORT.
const crypto = require('node:crypto')
const fs = require('node:fs')
const path = require('node:path')
const { paths, outDir } = require('./lib/env.cjs')
const { launchChrome } = require('./lib/chrome.cjs')
const { connectCdp, sleep } = require('./lib/cdp.cjs')
const game = require('./lib/game.cjs')

const PORT = Number(process.env.PORT ?? 9378), HTTP = Number(process.env.HTTP_PORT ?? 8798)
const saveFile = process.argv[2]
const write = process.argv.includes('--write')
if (!saveFile) { console.error('usage: node scripts/harness/gds-vs-game.cjs <save> [--write]'); process.exit(1) }

// What the reference keeps: the test maps each of these to a GDS function, and refuses an id it doesn't know
const TOTALS = ['statAL', 'statALM', 'statAL2', 'statAB', 'statAG', 'statLC', 'statRAL', 'statRAGM2', 'statFCL', 'statSV2',
    'statASM', 'statASM2', 'statCB2', 'statPHoL', 'statSalvPos2', 'statSalvNeg2', 'statSalvFirstFive', 'statREMFF', 'statREMSI',
    'statConBase', 'statConBase2']
const LINES = ['sMiscRuneSum', 'statSalvPosRuneBonus', 'statSalvPosInfiniteAscentRune', 'statConBaseThriftRune',
    'statFreeAccelMultSpeedRune', 'statFreeMultMultDuplicationRune', 'statObtRune5', 'statGSMSpeedRune',
    'statTaxDuplicationRune', 'statTaxThriftRune', 'statALHorseShoeRune', 'statRALHorseShoeRune', 'statPHoLHorseShoeRune',
    'statConBuildCoinBuildings']

// The player fields the checked calculations read, the only ones the reference keeps: the file stays small and holds
// nothing else of the save. A check that needs another one fails on a missing value: add it here and run this again.
const KEPT = ['worlds', 'coinsThisPrestige', 'firstPaidCoin', 'secondPaidCoin', 'thirdPaidCoin', 'fourthPaidCoin', 'fifthPaidCoin',
    'ants', 'upgrades', 'transcendCount', 'challengecompletions', 'challenge15Exponent', 'currentChallenge', 'researches', 'unlocks',
    'achievements', 'progressiveAchievements', 'runes', 'shopUpgrades', 'talismans', 'ascensionCount', 'cubeUpgrades', 'platonicUpgrades',
    'wowCubes', 'wowTesseracts', 'wowHypercubes', 'wowPlatonicCubes', 'wowAbyssals', 'wowOcteracts', 'totalWowOcteracts', 'cubeBlessings', 'tesseractBlessings',
    'hypercubeBlessings', 'platonicBlessings', 'hepteracts', 'ascendShards', 'corruptions', 'constantUpgrades', 'singularityCount',
    'highestSingularityCount', 'goldenQuarkUpgrades', 'octUpgrades', 'ambrosiaUpgrades', 'insideSingularityChallenge', 'singularityChallenges',
    'lifetimeAmbrosia', 'lifetimePurpleAmbrosia', 'spentBlueberries', 'lifetimeRedAmbrosia', 'redAmbrosiaUpgrades', 'purpleAmbrosiaUpgrades',
    'purpleReactor', 'purpleReactorUpgrades', 'synthesisUpgrades', 'stats']

// ===== The served bundle reports raw values. Here only, never in patcher.js: nothing a player runs does this. =====
const patcher = require(paths.patcher)
const realPatch = patcher.patchBundle
function mustReplace(source, re, replace, what) {
    if (!re.test(source)) throw new Error(`${what} not found in the game's bundle: the game changed, update this script`)
    return source.replace(re, replace)
}
patcher.patchBundle = (source, opts) => {
    let p = realPatch(source, opts)
    // loadStatistics: a line's value. I=u(H),B=u(U),$=M.stat(),z=xW(e.type,$,M.displayCriterion)
    p = mustReplace(p, /([\w$]+)=([\w$]+)\(([\w$]+)\),([\w$]+)=\2\(([\w$]+)\),([\w$]+)=([\w$]+)\.stat\(\),([\w$]+)=([\w$]+)\(([\w$]+)\.type,\6,\7\.displayCriterion\)/,
        (_, a, u, h, b, un, v, m, z, disp, e) => `${a}=${u}(${h}),${b}=${u}(${un}),${v}=(x=>(window.__HSstat&&window.__HSstat(${h},x),x))(${m}.stat()),${z}=${disp}(${e}.type,${v},${m}.displayCriterion)`,
        'a stat line')
    // loadStatistics: a total. let M=u(h),_=a(),H=(w=e.acc)!=null?w:3;M.textContent=
    p = mustReplace(p, /let ([\w$]+)=([\w$]+)\(([\w$]+)\),([\w$]+)=([\w$]+)\(\),([\w$]+)=\(([\w$]+)=([\w$]+)\.acc\)!=null\?\7:3;\1\.textContent=/,
        (m0, el, u, h, t, fn) => m0.replace(`${t}=${fn}()`, `${t}=(x=>(window.__HStotal&&window.__HStotal(${h},x),x))(${fn}())`), 'a stat total')
    // loadStatisticsUpdate, to compute every line in one synchronous pass
    p = mustReplace(p, /([\w$]+)=([\w$]+)=>\{let ([\w$]+)=\2===void 0\?Array\.from\(document\.getElementsByClassName\("activeStats"\)/,
        (m0, name) => m0.replace(`${name}=`, `${name}=window.__HSloadStats=`), 'loadStatisticsUpdate')
    // progressiveAchievements, whose rewardedAP is each category's points
    p = mustReplace(p, /([\w$]+)\[([\w$]+)\]\.rewardedAP=/g, (_, x, k) => `(window.__HSprog=${x})[${k}].rewardedAP=`, 'progressive achievements')
    // updateAchievementLevel: the points total, a module variable
    const points = /\b([\w$]+)<2500(?:\?|\))[^;]{0,40}Math\.floor\(\1\/50\)/.exec(p)
    if (!points) throw new Error('achievement points not found in the game\'s bundle')
    return p.replace(points[0], m => `(window.__HSap=()=>${points[1]},${points[1]}<2500)` + m.slice(points[1].length + 5))
}

// ===== States, each loaded by the game: it keeps levels of its own, computed at load =====
function rng(seed) { let s = seed; return () => (s = (s * 1664525 + 1013904223) % 4294967296) / 4294967296 }

function statesOf(base) {
    const exalts = Object.keys(base.singularityChallenges)
    const zeroExalt = (s, e) => { s.singularityChallenges[e].completions = 0; s.singularityChallenges[e].highestSingularityCompleted = 0 }
    // The shop passes unlock shop upgrades: GDS leaves that condition out (docs/features/gds.md), every player past
    // singularity 1 meets it
    const isPass = k => k.startsWith('wowPass')
    const states = [['base', () => { }]]
    for (const e of exalts) states.push([`exalt-on ${e}`, s => { s.singularityChallenges[e].enabled = true; s.insideSingularityChallenge = true }])
    for (const e of ['noSingularityUpgrades', 'noOcteracts', 'noAmbrosiaUpgrades', 'taxmanLastStand', 'noQuarkUpgrades']) states.push([`exalt-zero ${e}`, s => zeroExalt(s, e)])
    states.push(['exalts-all-zero', s => exalts.forEach(e => zeroExalt(s, e))])
    // Past the highest: the game counts its tokens once, at load, before it raises the highest
    for (const n of [1, 37, 101, 201, 270, 300]) states.push([`sing ${n}`, s => { s.singularityCount = n; s.highestSingularityCount = Math.max(s.highestSingularityCount, n) }])
    for (const n of [50, 120, 200, 270]) states.push([`highest ${n}`, s => { s.highestSingularityCount = n; s.singularityCount = Math.min(s.singularityCount, n) }])
    states.push(['shop-zero', s => { for (const k of Object.keys(s.shopUpgrades)) s.shopUpgrades[k] = 0 }])
    states.push(['red-zero', s => { for (const k of Object.keys(s.redAmbrosiaUpgrades)) s.redAmbrosiaUpgrades[k] = 0 }])
    states.push(['purple-zero', s => { for (const k of Object.keys(s.purpleAmbrosiaUpgrades)) s.purpleAmbrosiaUpgrades[k] = 0 }])
    states.push(['reactor-zero', s => { for (const k of Object.keys(s.purpleReactorUpgrades)) s.purpleReactorUpgrades[k] = 0 }])
    states.push(['ambrosia-zero', s => { for (const k of Object.keys(s.ambrosiaUpgrades)) Object.assign(s.ambrosiaUpgrades[k], { ambrosiaInvested: 0, blueberriesInvested: 0, purpleAmbrosiaInvested: 0 }) }])
    states.push(['gq-zero', s => { for (const k of Object.keys(s.goldenQuarkUpgrades)) if (!isPass(k)) Object.assign(s.goldenQuarkUpgrades[k], { goldenQuarksInvested: 0, freeLevel: 0 }) }])
    states.push(['oct-zero', s => { for (const k of Object.keys(s.octUpgrades)) Object.assign(s.octUpgrades[k], { octeractsInvested: 0, freeLevel: 0 }) }])
    // Far past every upgrade's maximum: the game refunds the excess and keeps the exact cost of the last level, so these
    // read each cost table at its end, and a maxed upgrade is worth achievement points
    states.push(['red-max', s => { for (const k of Object.keys(s.redAmbrosiaUpgrades)) s.redAmbrosiaUpgrades[k] = 1e15 }])
    states.push(['purple-max', s => { for (const k of Object.keys(s.purpleAmbrosiaUpgrades)) s.purpleAmbrosiaUpgrades[k] = 1e15 }])
    states.push(['reactor-max', s => { for (const k of Object.keys(s.purpleReactorUpgrades)) s.purpleReactorUpgrades[k] = 1e15 }])
    states.push(['ambrosia-max', s => { for (const k of Object.keys(s.ambrosiaUpgrades)) s.ambrosiaUpgrades[k].ambrosiaInvested = 1e15 }])
    states.push(['gq-max', s => { for (const k of Object.keys(s.goldenQuarkUpgrades)) s.goldenQuarkUpgrades[k].goldenQuarksInvested = 1e300 }])
    states.push(['oct-max', s => { for (const k of Object.keys(s.octUpgrades)) s.octUpgrades[k].octeractsInvested = 1e300 }])
    states.push(['cube-upgrades-zero', s => { s.cubeUpgrades = s.cubeUpgrades.map(v => v === null ? null : 0) }])
    states.push(['platonic-zero', s => { s.platonicUpgrades = s.platonicUpgrades.map(() => 0) }])
    states.push(['corruption-0', s => { s.corruptions.used = 0; s.corruptions.next = 0 }])
    states.push(['corruption-20', s => { s.corruptions.used = 20; s.corruptions.next = 20 }])
    states.push(['c15-active', s => { s.currentChallenge.ascension = 15 }])
    states.push(['c11-active', s => { s.currentChallenge.ascension = 11 }])
    states.push(['unspent-blueberries', s => { s.spentBlueberries = 0 }])
    states.push(['lifetime-low', s => { s.lifetimeAmbrosia = 1000; s.lifetimeRedAmbrosia = 1000; s.purpleReactor.lifetimePurpleHoney = 0 }])
    for (let i = 0; i < 6; i++) states.push([`random ${i}`, s => {
        const r = rng(1000 + i)
        const pick = keys => keys[Math.floor(r() * keys.length)]
        const scale = v => Math.floor(v * r() * 1.2)
        for (let n = 0; n < 25; n++) {
            const family = pick(['shop', 'red', 'purple', 'reactor', 'ambrosia', 'gq', 'oct', 'cube'])
            if (family === 'shop') { const u = pick(Object.keys(s.shopUpgrades)); s.shopUpgrades[u] = scale(s.shopUpgrades[u]) }
            if (family === 'red') { const u = pick(Object.keys(s.redAmbrosiaUpgrades)); s.redAmbrosiaUpgrades[u] = scale(s.redAmbrosiaUpgrades[u]) }
            if (family === 'purple') { const u = pick(Object.keys(s.purpleAmbrosiaUpgrades)); s.purpleAmbrosiaUpgrades[u] = scale(s.purpleAmbrosiaUpgrades[u]) }
            if (family === 'reactor') { const u = pick(Object.keys(s.purpleReactorUpgrades)); s.purpleReactorUpgrades[u] = scale(s.purpleReactorUpgrades[u]) }
            if (family === 'ambrosia') { const u = pick(Object.keys(s.ambrosiaUpgrades)); s.ambrosiaUpgrades[u].ambrosiaInvested = scale(s.ambrosiaUpgrades[u].ambrosiaInvested) }
            if (family === 'gq') { const u = pick(Object.keys(s.goldenQuarkUpgrades).filter(k => !isPass(k))); s.goldenQuarkUpgrades[u].goldenQuarksInvested = scale(s.goldenQuarkUpgrades[u].goldenQuarksInvested) }
            if (family === 'oct') { const u = pick(Object.keys(s.octUpgrades)); s.octUpgrades[u].octeractsInvested = scale(s.octUpgrades[u].octeractsInvested) }
            if (family === 'cube') { const j = 1 + Math.floor(r() * (s.cubeUpgrades.length - 1)); if (s.cubeUpgrades[j] !== null) s.cubeUpgrades[j] = scale(s.cubeUpgrades[j]) }
        }
    }])
    return states
}

// One synchronous pass: every line and total with the player they were computed on, no tick in between.
// The live counters are classes whose valueOf() gives the number; a Decimal goes through its toJSON first. The live
// player's talismans are a copy refreshed at each game save: the game's own object is what GDS reads live.
const PASS = `(() => {
    const num = v => typeof v === 'number' ? (Number.isFinite(v) ? v : String(v)) : String(v);
    const flat = (k, v) => (v && typeof v === 'object' && !Array.isArray(v) && typeof v.valueOf() === 'number') ? v.valueOf() : v;
    const lines = {}, totals = {};
    window.__HSstat = (id, v) => { lines[id] = num(v) };
    window.__HStotal = (id, v) => { totals[id] = num(v) };
    for (const el of document.querySelectorAll('[id$="Stats"]')) el.classList.add('activeStats');
    window.__HSloadStats();
    window.__HSstat = window.__HStotal = null;
    const player = JSON.parse(JSON.stringify(${game.PLAYER}, flat));
    // Before game commit 075dfeaa the live fragments were in the talismans object, player.talismans a copy at each save
    for (const [t, v] of Object.entries(window.__HS_talismans ?? {})) if (v.fragmentsInvested) player.talismans[t] = JSON.parse(JSON.stringify(v.fragmentsInvested, flat));
    const progressive = {};
    for (const [k, v] of Object.entries(window.__HSprog ?? {})) progressive[k] = v.rewardedAP;
    return JSON.stringify({ lines, totals, player, pseudoCoinLevels: window.__HS_pcoinLevels ?? null, quarkBonus: window.__HS_quarkBonus ?? null,
        achievementPoints: window.__HSap ? window.__HSap() : null, progressive });
})()`

// Every path whose value differs from the base, flat: the states share one base, or the file would be huge
function changesFrom(base, player) {
    const changes = {}
    const walk = (a, b, prefix) => {
        for (const k of new Set([...Object.keys(a ?? {}), ...Object.keys(b ?? {})])) {
            const p = prefix ? `${prefix}.${k}` : k
            const [x, y] = [a?.[k], b?.[k]]
            if (x && y && typeof x === 'object' && typeof y === 'object') walk(x, y, p)
            else if (x !== y) changes[p] = y === undefined ? null : y
        }
    }
    walk(base, player, '')
    return changes
}

function stripped(player) {
    return Object.fromEntries(KEPT.map(k => [k, player[k]]))
}

;(async () => {
    const dir = outDir('gds-vs-game')
    const server = game.startGameServer({ port: HTTP, patch: true })
    const chrome = await launchChrome({ port: PORT, profile: outDir('profiles', 'gds-vs-game'), width: 1600, height: 1000, fresh: true })
    const started = Date.now()
    try {
        const cdp = await connectCdp(PORT)
        await game.interceptGameServer(cdp, server.origin)
        const load = async () => {
            await cdp.navigate(server.origin + '/')
            await cdp.waitFor(`!!document.getElementById('importfile')`)
            await game.waitGameReady(cdp)
        }
        const baseSave = game.decodeSave(game.readSaveFile(saveFile).save)
        const list = statesOf(baseSave).filter(([name]) => !process.env.ONLY || new RegExp(process.env.ONLY).test(name))
        const states = []
        let base = null, account = null
        for (const [name, change] of list) {
            // A new page for each state: nothing a previous import left in the game's module state counts
            await load()
            const save = structuredClone(baseSave)
            change(save)
            await game.importSave(cdp, Buffer.from(JSON.stringify(save), 'latin1').toString('base64'), dir)
            await sleep(Number(process.env.SETTLE ?? 1200))
            await game.waitGameReady(cdp)
            const cap = JSON.parse(await cdp.evaluate(PASS))
            const player = stripped(cap.player)
            base ??= player
            account ??= { pseudoCoinLevels: cap.pseudoCoinLevels, quarkBonus: cap.quarkBonus }
            const pickTotals = Object.fromEntries(TOTALS.map(id => [id, cap.totals[`${id}NT`]]))
            const pickLines = Object.fromEntries(LINES.map(id => [id, cap.lines[id]]))
            for (const [id, v] of [...Object.entries(pickTotals), ...Object.entries(pickLines)]) {
                if (v === undefined) throw new Error(`state ${name}: the game shows no ${id}: its stat ids changed, update this script and the test`)
            }
            states.push({ name, changes: changesFrom(base, player), totals: pickTotals, lines: pickLines, achievementPoints: cap.achievementPoints, progressive: cap.progressive })
            console.log(`#${states.length}/${list.length} ${name}: S${cap.player.singularityCount}, ${Object.keys(states.at(-1).changes).length} changed paths (${Math.round((Date.now() - started) / 1000)}s)`)
        }
        const reference = {
            description: 'The real game\'s Stats for nerds at full precision, on states of one save. Written by scripts/harness/gds-vs-game.cjs, read by scripts/tests/test-gds-formulas.cjs.',
            gameBundleSha256: crypto.createHash('sha256').update(fs.readFileSync(paths.gameBundle)).digest('hex'),
            gameVersion: baseSave.version ?? null,
            account, base, states,
        }
        const out = write ? path.join(paths.repo, 'scripts', 'fixtures', 'gds-reference.json') : path.join(dir, 'reference.json')
        fs.writeFileSync(out, JSON.stringify(reference) + '\n')
        const exceptions = cdp.logs.filter(l => l.startsWith('EXCEPTION') && !l.includes('Failed to fetch'))
        console.log(`written ${out} (${Math.round(fs.statSync(out).size / 1024)} KB), page exceptions: ${exceptions.length}`)
        cdp.close()
    } finally {
        chrome.kill()
        server.close()
    }
    process.exit(0)
})().catch(e => { console.error(e.stack || e); process.exit(1) })
