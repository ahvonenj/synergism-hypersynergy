const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const esbuild = require('esbuild');

// Reference equations: SynergismOfficial d390ebb339d65fbb92eee6d30d71a974d4074c5f,
// Tax.ts, Calculate.ts, Runes.ts, RuneBlessings.ts, RuneSpirits.ts and Statistics.ts.
async function main() {
  const root = path.resolve(__dirname, '../..');
  const optimizer = path.join(root, 'src/mod/class/hs-modules/hs-heater/hs-heater-optimizer.ts');
  const bundled = await esbuild.build({
    stdin: { contents: `export * from './src/mod/class/hs-modules/hs-heater/hs-heater-optimizer';
      export * from './src/mod/class/hs-modules/hs-heater/hs-heater-coins';
      export { buildHeaterCoinsC15Input } from './src/mod/class/hs-core/gds/hs-heater-coins-export';
      export { inputDefinitions } from './src/mod/class/hs-modules/hs-heater/hs-heater-input-config';
      export { HEATER_BRANCH_DEFINITIONS, getHeaterTypeConfig } from './src/mod/class/hs-modules/hs-heater/hs-heater-result-config';
      export { AntUpgrades } from './src/mod/types/data-types/hs-gamedata-api-types';
      export { default as Decimal } from 'break_infinity.js';`, resolveDir: root, loader: 'ts' },
    bundle: true, write: false, platform: 'node', format: 'cjs',
    plugins: [{ name: 'heater-coin-test-internals', setup(build) {
      build.onLoad({ filter: /hs-heater-optimizer\.ts$/ }, () => ({
        contents: fs.readFileSync(optimizer, 'utf8') + '\nexport { Loadout, upgrades, fillStatsAndOptionsFromInput, findCoinsC15Opt };', loader: 'ts',
      }));
    } }],
  });
  const runtime = new Module(path.join(root, 'heater-coin-test-runtime.cjs'), module);
  runtime.filename = path.join(root, 'heater-coin-test-runtime.cjs');
  runtime.paths = module.paths;
  runtime._compile(bundled.outputFiles[0].text, runtime.filename);
  const { Decimal, createHeaterCoinsC15Evaluator, heaterCoinsC15LogRatio, heaterCoinRunePurchasedLevel,
    formatHeaterCoinsC15Effect, buildHeaterCoinsC15Input, inputDefinitions, HEATER_BRANCH_DEFINITIONS,
    getHeaterTypeConfig, AntUpgrades, Loadout, upgrades, fillStatsAndOptionsFromInput, findCoinsC15Opt,
    HSHeaterOptimizer } = runtime.exports;
  const close = (actual, expected, label, tolerance = 2e-11) => assert.ok(
    Number.isFinite(actual) && Math.abs(actual - expected) <= tolerance * Math.max(1, Math.abs(expected)),
    `${label}: ${actual} != ${expected}`);
  const rune = (exp, costCoefficient, levelsPerOOM) => ({ exp, costCoefficient: String(costCoefficient), levelsPerOOM,
    freeLevelsWithoutTalismans: 10, talismanLevelsPerPower: 200, effectiveLevelMultiplier: 1.7, unlocked: true });
  const snapshot = {
    runes: { speed: rune('1e8', 50, 150), duplication: rune('1e9', 20000, 120),
      thrift: rune('1e11', 2.5e7, 60), horseShoe: rune('0', 1e100, 1) },
    baselineCoefficientModuleLevel: 0, baselineTalismanModuleLevel: 0,
    taxExponentWithoutRunes: 0.15, taxmanMultiplier: 20,
    globalSpeedLog10WithoutRunesAndBrick: -2,
    speedBlessingPerRuneLevel: 0.002, speedSpiritPerRuneLevel: 0.001,
    slowGlobalSpeedPower: 0.65, horseShoeShopLevel: 1, noOcteractsCompletions: 3, challenge9: false,
  };
  const zero = { coefficient: 0, talisman: 0, stabilizer: 0, brick: 0 };
  const context = { singularity: 28, exalt: 0, postAoag: false, talismanPower: 1.8 };
  const refPurchased = (r, coeff) => {
    const exp = new Decimal(r.exp);
    const level = Math.floor(coeff * Decimal.log10(exp.div(r.costCoefficient).plus(1)));
    const remaining = Decimal.max(0, new Decimal(r.costCoefficient).times(Decimal.pow(10, (level + 1) / coeff).minus(1)).minus(exp));
    return remaining.eq(0) ? level + 1 : level;
  };
  // Direct upstream Tax.ts cap expression, with arbitrary tax-exempt factors
  // and the 40 ticks/s included to verify that these cancel in relative income.
  const refCap = (state, flat = 1234) => {
    const n = Math.floor(275 / (Math.log10(1.01) * state.taxExponent)) - 1;
    return n + flat - Math.log10(1.01) * n ** 2 / 550 * state.taxExponent
      + state.globalSpeedLog10 + Math.log10(40);
  };
  const refState = (s, c, levels) => {
    const disabled = [6, 8].includes(c.exalt);
    const r = {}, raw = {};
    for (const [key, v] of Object.entries(s.runes)) {
      raw[key] = refPurchased(v, v.levelsPerOOM + (key === 'horseShoe' ? 0 : (disabled ? 0 : levels.coefficient) - s.baselineCoefficientModuleLevel))
        + v.freeLevelsWithoutTalismans
        + v.talismanLevelsPerPower * (c.talismanPower + ((disabled ? 0 : levels.talisman) - s.baselineTalismanModuleLevel) / 200);
      r[key] = !v.unlocked ? 0 : s.challenge9 && key !== 'horseShoe' ? 1 : raw[key] * v.effectiveLevelMultiplier;
    }
    const tax = Math.max(1e-300, s.taxExponentWithoutRunes * (0.001 + 0.999 * Math.exp(-Math.cbrt(r.duplication) / 5))
      * (0.01 + 0.99 * Math.exp(-Math.cbrt(r.thrift) / 10)) * (c.exalt === 9 ? s.taxmanMultiplier : 1));
    let speed = 10 ** s.globalSpeedLog10WithoutRunesAndBrick * (2 - Math.exp(-Math.cbrt(r.speed) / 100))
      * (1 + raw.speed * s.speedBlessingPerRuneLevel) * (1 + raw.speed * s.speedSpiritPerRuneLevel)
      * (disabled ? 1 : 1 - levels.brick / 100);
    speed = speed > 100 ? Math.sqrt(speed) * 10 : speed < 1 ? speed ** s.slowGlobalSpeedPower : speed;
    const sing = c.singularity - levels.stabilizer;
    if (!c.postAoag && sing >= 1) {
      // Independent reference loop for calculateEffectiveSingularities.
      let effective = sing * Math.min(4.75, 0.075 * sing + 1) * (c.exalt === 5 ? (s.noOcteractsCompletions + 1) ** 3 : 1);
      for (const [threshold, multiplier] of [
        [10, 1.5 * Math.min(4, 0.125 * sing - 0.25)], [25, 2.5 * Math.min(6, 0.06 * sing - 0.5)],
        [36, 4 * Math.min(5, sing / 18 - 1) * 1.1 ** Math.min(sing - 36, 64)],
        [50, 5 * Math.min(8, 0.04 * sing - 1) * 1.1 ** Math.min(sing - 50, 50)],
        [100, 0.08 * sing * 1.1 ** (sing - 100)], [150, 2 * 1.05 ** (sing - 150)],
        [200, 1.5 * 1.275 ** (sing - 200)], [215, 1.25 * 1.2 ** (sing - 215)], [230, 2], [269, 3 ** (sing - 268)],
      ]) if (sing > threshold) effective *= multiplier;
      speed /= (1 + Math.sqrt(effective) / 4) * (1 - Math.min(300, r.horseShoe * (c.exalt === 4 ? 0 : s.horseShoeShopLevel)) / 1000);
    }
    return { taxExponent: tax, globalSpeedLog10: Math.log10(speed) };
  };
  let checked = 0;
  for (const speedLog of [-24, -2, 1, 3]) for (const exalt of [0, 4, 5, 6, 8, 9])
    for (const postAoag of [false, true]) for (const singularity of [0, 1, 11, 26, 37, 51, 101, 151, 201, 216, 231, 270]) {
      const s = { ...snapshot, globalSpeedLog10WithoutRunesAndBrick: speedLog };
      const c = { ...context, exalt, postAoag, singularity };
      const evaluate = createHeaterCoinsC15Evaluator(s, c);
      for (const levels of [zero, { coefficient: 13, talisman: 7, stabilizer: 2, brick: 25 }]) {
        const actual = evaluate(levels), expected = refState(s, c, levels);
        close(actual.taxExponent, expected.taxExponent, 'tax exponent');
        close(actual.globalSpeedLog10, expected.globalSpeedLog10, 'global speed');
        close(heaterCoinsC15LogRatio(actual, evaluate(zero)), refCap(expected) - refCap(refState(s, c, zero)), 'cap income ratio', 2e-8);
        checked++;
      }
    }
  for (const exp of ['0', '1e-300', '49.999', '50', '1e1000']) for (const coeff of [60, 120, 150, 251]) {
    const r = rune(exp, 50, coeff);
    assert.equal(heaterCoinRunePurchasedLevel(new Decimal(exp), 50, coeff), refPurchased(r, coeff));
  }
  const huge = { taxExponent: 1e-100, globalSpeedLog10: 0 };
  close(heaterCoinsC15LogRatio({ ...huge, globalSpeedLog10: 0.1 }, huge), 0.1, 'small speed gain survives enormous coin caps');
  assert.ok(heaterCoinsC15LogRatio({ ...huge, taxExponent: 0.99e-100 }, huge) > 1e90);
  assert.match(formatHeaterCoinsC15Effect(1e100), /^10\^\(/);
  // formatNumber follows the locale: 1,00 on a French system
  assert.equal(formatHeaterCoinsC15Effect(0), (1).toLocaleString(undefined, { minimumFractionDigits: 2 }));
  for (const special of [
    { ...snapshot, challenge9: true },
    { ...snapshot, runes: { ...snapshot.runes, duplication: { ...snapshot.runes.duplication, unlocked: false } } },
    { ...snapshot, taxExponentWithoutRunes: 0 },
  ]) {
    const levels = { coefficient: 20, talisman: 20, stabilizer: 1, brick: 5 };
    const actual = createHeaterCoinsC15Evaluator(special, context)(levels);
    const expected = refState(special, context, levels);
    close(actual.taxExponent, expected.taxExponent, 'locked runes / C9 / minimum tax');
    close(actual.globalSpeedLog10, expected.globalSpeedLog10, 'special rune speed');
  }

  const input = {
    ...Object.fromEntries(inputDefinitions.map(f => [f.key, f.type === 'boolean' ? false : 0])),
    amb: 100000, blueberries: 10, currentSingularity: 28, postAoag: false, exalt5Unlocked: true,
    runeSiExp: new Decimal(1), runeIaExp: new Decimal(1), runeIaBonusLevelsTotal: new Decimal(0),
    runeIaBonusLevelsTalisman: new Decimal(0), baseTalismanPower: new Decimal(1.8),
    runeSiRC: 30, runeSiEffectiveLevelMultiplier: 1, ambrosiaUpgradeBonusLevels: {},
    ambrosiaUpgradeBlueberryCostReductions: {}, shopUpgradeRawLevels: {}, shopBonusLevelsNoAmbrosia: {},
    blueBarRequirementBeforeRounding: 100, tauPower: 1,
    coinsC15: snapshot, heaterOptions: { coinsC15: true },
  };
  // Brute force with an independent budget calculation and direct upstream
  // cap values; exercise affordable intermediate levels, both resources,
  // Red/Purple levels, suppressed modules and both kinds of Stabilizer.
  for (const variant of [
    {}, { amb: 10000, blueberries: 0 }, { amb: 2500000, blueberries: 1 },
    { amb: 20000000, blueberries: 20 }, { amb: 20000000, blueberries: 20, exalt: 9 },
    { exalt: 6 }, { exalt: 8 }, { postAoag: true }, { exalt5Unlocked: false },
    { bonusRow3: 2, ambrosiaUpgradeBonusLevels: { ambrosiaRuneOOMBonus: 3, ambrosiaTalismanBonusRuneLevel: 4 },
      ambrosiaUpgradeBlueberryCostReductions: { ambrosiaSingReduction1: 2 } },
  ]) {
    const state = { ...input, ...variant };
    fillStatsAndOptionsFromInput(state);
    const winner = findCoinsC15Opt();
    const c = { ...context, exalt: state.exalt, postAoag: state.postAoag };
    const stabilize = state.exalt > 0 ? 'ambrosiaSingReduction2' : 'ambrosiaSingReduction1';
    let bestCap = -Infinity, bestCost = Infinity, bestLevels;
    for (let stab = 0; stab <= upgrades[stabilize].maxLevel; stab++)
      for (let t = 0; t <= upgrades.ambrosiaTalismanBonusRuneLevel.maxLevel; t++)
        for (let r = 0; r <= upgrades.ambrosiaRuneOOMBonus.maxLevel; r++) {
      const candidate = new Loadout();
      candidate.upgradeLevels[stabilize] = stab;
      candidate.upgradeLevels.ambrosiaTalismanBonusRuneLevel = t;
      candidate.upgradeLevels.ambrosiaRuneOOMBonus = r;
      candidate.satisfyPrerequisites();
      const cost = Object.entries(candidate.upgradeLevels).reduce((sum, [key, level]) => sum + upgrades[key].cost(level), 0);
      const berries = Object.entries(candidate.upgradeLevels).reduce((sum, [key, level]) => sum
        + (level > 0 ? Math.max(0, upgrades[key].blueberryCost - (state.ambrosiaUpgradeBlueberryCostReductions[key] ?? 0)) : 0), 0);
      if (cost > state.amb || berries > state.blueberries) continue;
      const purple = (key, level) => level + state.bonusRow3 + (level > 0 ? state.ambrosiaUpgradeBonusLevels[key] ?? 0 : 0);
      const cap = refCap(refState(snapshot, c, { coefficient: purple('ambrosiaRuneOOMBonus', r),
        talisman: purple('ambrosiaTalismanBonusRuneLevel', t), stabilizer: stab, brick: 0 }));
      if (cap > bestCap || (cap === bestCap && cost < bestCost)) { bestCap = cap; bestCost = cost; bestLevels = { t, r, stab }; }
    }
    close(refCap(winner.coinsC15State), bestCap, `brute-force optimum ${JSON.stringify({variant, winner: winner.upgradeLevels, bestLevels})}`);
    assert.equal(winner.cost, bestCost, 'ties prefer the cheapest loadout');
    assert.ok(winner.blueberryCost <= state.blueberries);
    assert.equal(winner.upgradeLevels.ambrosiaBrickOfLead ?? 0, 0);
  }
  const result = HSHeaterOptimizer.createHeaterOptimizerResultFromInput(input);
  assert.ok(result.coinsC15?.[0][0].startsWith('{'));
  assert.equal(result.input, input);
  assert.equal(HSHeaterOptimizer.createHeaterOptimizerResultFromInput({ ...input, amb: 0 }).coinsC15[0][0], 'Unaffordable');
  assert.ok(HEATER_BRANCH_DEFINITIONS.some(b => b.id === 'coinsC15' && b.resultKeys.includes('coinsC15')));
  assert.equal(getHeaterTypeConfig('coinsC15').label, 'Coins in C15');
  const roundTrip = JSON.parse(JSON.stringify(snapshot));
  assert.deepEqual(createHeaterCoinsC15Evaluator(roundTrip, context)(zero), createHeaterCoinsC15Evaluator(snapshot, context)(zero));
  const largeCostSnapshot = {
    ...snapshot,
    runes: { ...snapshot.runes, horseShoe: {
      ...snapshot.runes.horseShoe, exp: '1e1700', costCoefficient: '1e500',
      levelsPerOOM: 1 / 20, freeLevelsWithoutTalismans: 0, talismanLevelsPerPower: 0, effectiveLevelMultiplier: 1,
    } },
  };
  assert.equal(heaterCoinRunePurchasedLevel(new Decimal('1e1700'), '1e500', 1 / 20), 60,
    'Horseshoe purchases use its finite Decimal cost');
  const largeCostState = createHeaterCoinsC15Evaluator(largeCostSnapshot, context)(zero);
  const largeCostReference = refState(largeCostSnapshot, context, zero);
  close(largeCostState.globalSpeedLog10, largeCostReference.globalSpeedLog10, 'large-cost rune speed penalty');
  assert.deepEqual(createHeaterCoinsC15Evaluator(JSON.parse(JSON.stringify(largeCostSnapshot)), context)(zero),
    largeCostState, 'large costs survive a JSON round-trip');
  assert.doesNotThrow(() => HSHeaterOptimizer.createHeaterOptimizerResultFromInput({
    ...input, coinsC15: JSON.parse(JSON.stringify(largeCostSnapshot)), heaterOptions: { coinsC15: false },
  }), 'large Coins data must not break a heat when the Coins branch is disabled');

  // Export fixture with active yellow/Purple levels. It must produce the
  // same baseline regardless of the currently equipped Ambrosia loadout.
  const data = {
    currentChallenge: { ascension: 15, reincarnation: 0 }, researches: Array(201).fill(0), cubeUpgrades: Array(100).fill(0),
    platonicUpgrades: Array(21).fill(0), upgrades: Array(126).fill(0), challengecompletions: Array(16).fill(0),
    highestchallengecompletions: Array(16).fill(0), highestSingularityCount: 0,
    runes: { speed: '1e8', duplication: '1e9', thrift: '1e11', horseShoe: '0' },
    runeBlessings: { speed: '1e12' }, runeSpirits: { speed: '1e50' },
    platonicBlessings: { taxes: 0 }, cubeBlessings: { globalSpeed: 0 }, tesseractBlessings: { globalSpeed: 0 }, hypercubeBlessings: { globalSpeed: 0 },
    maxObtainium: '0', rareFragments: '0', epicFragments: '0', legendaryFragments: '0', ascendShards: '0',
    unlocks: { ascensions: true }, shopUpgrades: { shopHorseShoe: 1 }, singularityChallenges: { noOcteracts: { completions: 0 } },
  };
  let activeTalismanPower = 2.25;
  const api = {
    createCalculationSnapshot(calculationData) {
      assert.deepEqual(calculationData.currentChallenge, { transcension: 0, reincarnation: 0, ascension: 15 });
      assert.notEqual(calculationData, data);
      return this;
    },
    rune: { runes: {}, getLevelsPerOOM: key => snapshot.runes[key].levelsPerOOM,
      getRuneFreeLevels: () => 10 + 200 * activeTalismanPower },
    talisman: { allTalismanRuneBonusStatsSum: () => 1.8,
      getRuneBonusFromAllTalismansBatch: mode => Object.fromEntries(Object.keys(snapshot.runes).map(k => [k, mode ? 360 : 200 * activeTalismanPower])),
      getTalismanEffects: () => ({ taxReduction: 0, blessingBonus: 1, globalSpeed: 1 }) },
    ambrosia: { getAmbrosiaUpgradeEffects: () => ({ runeOOMBonus: 0, talismanBonusRuneLevel: 0 }) },
    antUpgrade: { getAntUpgradeEffectValue: (key) => key === AntUpgrades.Taxes ? 1 : 1 },
    achievement: { AchRewards: { taxReduction: () => 1 } },
    purple: { getPurpleAmbrosiaUpgradeEffects: () => 1, getPurpleReactorUpgradeLevel: () => 0 },
    calculateChallenge15Reward: () => 1, calculateHypercubeBlessingMultiplierPlatonicBlessing: () => 1,
    getSingularityChallengeEffect: () => true,
  };
  for (const [key, r] of Object.entries(snapshot.runes)) api.rune.runes[key] = {
    costCoefficient: new Decimal(r.costCoefficient), effectiveLevelMult: () => 1.7, isUnlocked: () => true,
  };
  const exported = buildHeaterCoinsC15Input(api, data, 0);
  close(exported.taxExponentWithoutRunes, 0.000005, 'C15 fixed tax factor');
  close(exported.globalSpeedLog10WithoutRunesAndBrick, -24, 'C15 dilation belongs before speed diminishing returns');
  close(exported.speedBlessingPerRuneLevel, 24 / 1e6, 'Speed blessing coefficient');
  close(exported.speedSpiritPerRuneLevel, 10 * 24 * 3 / 777777 / 100, 'Speed spirit coefficient');
  close(exported.runes.speed.freeLevelsWithoutTalismans, 10, 'remove active talisman bonuses');
  close(exported.runes.speed.talismanLevelsPerPower, 200, 'unscaled talisman bonus');
  activeTalismanPower = 4.5;
  assert.deepEqual(buildHeaterCoinsC15Input(api, data, 0), exported, 'equipped Ambrosia must not change the export baseline');
  for (const currentChallenge of [
    { transcension: 0, reincarnation: 0, ascension: 0 },
    { transcension: 5, reincarnation: 6, ascension: 11 },
    { transcension: 0, reincarnation: 9, ascension: 15 },
  ]) {
    const outside = { ...data, currentChallenge };
    const before = JSON.stringify(outside);
    assert.deepEqual(buildHeaterCoinsC15Input(api, outside, 0), exported, 'Coins build always simulates plain C15');
    assert.equal(JSON.stringify(outside), before, 'simulation must not mutate the exported save');
  }
  assert.equal(HEATER_BRANCH_DEFINITIONS.find(branch => branch.id === 'coinsC15').labelNote, undefined);
  data.researches[51] = 5; data.researches[159] = 2; data.rareFragments = '1e30';
  data.highestSingularityCount = 281; data.challengecompletions[6] = 12; data.challengecompletions[13] = 3;
  const changed = buildHeaterCoinsC15Input(api, data, 1000);
  const campaignTax = 1 - 0.05 - 0.05 * Math.log2(1000 / 500);
  close(changed.taxExponentWithoutRunes, 0.000005 / 1.075 * 0.965 ** 12 * 0.966 ** 3
    * 0.7 * 0.98 ** (0.6 * 30 * 2) * campaignTax * 0.5, 'fixed research, campaign, fragment and Singularity tax factors');

  // Evaluate the actual, pinned upstream stat definitions against the same
  // fixture as our exporter. This catches missing fixed factors and blessing
  // scaling changes independently of the hand-written reference above.
  const source = require('../fixtures/heater-coins-upstream.json');
  for (const count of [0, 999, 1000, 1e8]) {
    data.cubeBlessings.globalSpeed = count;
    data.tesseractBlessings.globalSpeed = count;
    data.hypercubeBlessings.globalSpeed = count;
    data.cubeUpgrades[34] = 20; data.cubeUpgrades[18] = 2; data.cubeUpgrades[52] = 10;
    data.researches[121] = 5; data.researches[136] = 5;
    data.researches[200] = 12345; data.cubeUpgrades[50] = 43210;
    data.platonicUpgrades[5] = 3; data.platonicUpgrades[10] = 2;
    data.platonicBlessings.taxes = 1e20; data.ascendShards = '1e30';
    data.maxObtainium = '1e70'; data.upgrades[70] = 1;
    const player = { ...data, singularityChallenges: { ...data.singularityChallenges, taxmanLastStand: { enabled: false } } };
    for (const key of ['rareFragments', 'ascendShards', 'maxObtainium']) player[key] = new Decimal(data[key]);
    const evaluateBody = (body, dependencies) => Function(...Object.keys(dependencies), `return (${body})`)(...Object.values(dependencies));
    const hyper = () => evaluateBody(`(() => ${source.hyper})()`, { player,
      calculateHypercubeBlessingMultiplierPlatonicBlessing: () => api.calculateHypercubeBlessingMultiplierPlatonicBlessing() });
    const tess = () => evaluateBody(`(() => ${source.tess})()`, { player, calculateGlobalSpeedHypercubeBlessing: hyper });
    const cubeSpeed = () => evaluateBody(`(() => ${source.cube})()`, { player, calculateGlobalSpeedTesseractBlessing: tess });
    const taxBlessing = () => evaluateBody(`(() => ${source.taxBlessing})()`, { player });
    const dependencies = {
      player, Decimal, StatLineTypes: { Multiplication: 1 },
      G: { challenge15Rewards: { taxes: { value: 1 }, globalSpeed: { value: 1 } } },
      AntUpgrades, getAntUpgradeEffect: () => ({ taxReduction: 1, globalSpeed: 1 }),
      getTalismanEffects: key => api.talisman.getTalismanEffects(key),
      getRuneEffects: () => 1, getRuneBlessingEffect: () => ({ globalSpeed: 1 }), getRuneSpiritEffect: () => ({ globalSpeed: 1 }),
      useChallenge13Modifiers: () => false, challenge13EffectiveCompletions: () => 0,
      calculateTaxPlatonicBlessing: taxBlessing, getAchievementReward: () => 1,
      campaignTokenBonuses: { tax: () => campaignTax },
      getPurpleAmbrosiaUpgradeEffects: () => 1,
      calculateGlobalSpeedCubeBlessing: cubeSpeed,
      getAmbrosiaUpgradeEffects: () => 1,
      challenge15CorruptionEffect: () => 1e-24,
      getPurpleReactorUpgradeEffects: () => 1,
    };
    const referenceTaxes = evaluateBody(source.tax, dependencies).lines.reduce((v, line) => v * line.stat(), 1);
    const referenceSpeed = evaluateBody(source.speed, dependencies).lines.reduce((v, line) => v * line.stat(), 1);
    const actual = buildHeaterCoinsC15Input(api, data, 1000);
    close(actual.taxExponentWithoutRunes, referenceTaxes, `upstream tax export at ${count} blessings`);
    close(actual.globalSpeedLog10WithoutRunesAndBrick, Math.log10(referenceSpeed), `upstream speed export at ${count} blessings`);
  }
  api.rune.runes.horseShoe.costCoefficient = new Decimal('1e500');
  data.runes.horseShoe = '1e1700';
  const largeCostExport = buildHeaterCoinsC15Input(api, data, 1000);
  const restoredExport = JSON.parse(JSON.stringify(largeCostExport));
  assert.equal(restoredExport.runes.horseShoe.costCoefficient, '1e+500', 'export preserves Horseshoe cost');
  assert.deepEqual(createHeaterCoinsC15Evaluator(restoredExport, context)(zero),
    createHeaterCoinsC15Evaluator(largeCostExport, context)(zero), 'exported large costs retain the same calculation');
  console.log(`Heater Coins in C15: ${checked} formula comparisons, exhaustive search, export and large-cost round-trip checks passed.`);
}

main().catch(error => { console.error(error); process.exitCode = 1; });
