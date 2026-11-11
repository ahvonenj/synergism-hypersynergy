const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const esbuild = require('esbuild');

// Expose internal calculations only in this in-memory test bundle.
async function main() {
  const root = path.resolve(__dirname, '../..');
  const optimizer = path.join(root, 'src/mod/class/hs-modules/hs-heater/hs-heater-optimizer-engine.ts');
  const bundled = await esbuild.build({
    stdin: { contents: `export { createHeaterOptimizerEngine } from './src/mod/class/hs-modules/hs-heater/hs-heater-optimizer-engine';
      export { HSHeaterOptimizer } from './src/mod/class/hs-modules/hs-heater/hs-heater-optimizer';
      export { inputDefinitions } from './src/mod/class/hs-modules/hs-heater/hs-heater-input-config';
      export { default as Decimal } from 'break_infinity.js';`, resolveDir: root, loader: 'ts' },
    bundle: true, write: false, platform: 'node', format: 'cjs',
    plugins: [{ name: 'heater-test-internals', setup(build) {
      build.onResolve({ filter: /hs-logger$/ }, () => ({ path: 'logger', namespace: 'test' }));
      build.onLoad({ filter: /.*/, namespace: 'test' }, () => ({
        contents: 'export const HSLogger = {log(){},debug(){},warn(){},error(){}};', loader: 'ts',
      }));
      build.onLoad({ filter: /hs-heater-optimizer-engine\.ts$/ }, () => ({
        contents: fs.readFileSync(optimizer, 'utf8').replace('return { createResult };', 'return { createResult, Loadout, fillStatsAndOptionsFromInput, generateVoucherTable, createLuckScaledResourceEvaluator, findResourceVoucherOpt, trimTable, addLastPriorityVouchers };'),
        loader: 'ts',
      }));
    } }],
  });
  const runtime = new Module(path.join(root, 'heater-test-runtime.cjs'), module);
  runtime.filename = path.join(root, 'heater-test-runtime.cjs');
  runtime.paths = module.paths;
  runtime._compile(bundled.outputFiles[0].text, runtime.filename);
  const { Decimal, inputDefinitions, createHeaterOptimizerEngine } = runtime.exports;
  const { Loadout, fillStatsAndOptionsFromInput, generateVoucherTable, createLuckScaledResourceEvaluator, findResourceVoucherOpt, trimTable, addLastPriorityVouchers } = createHeaterOptimizerEngine();
  const input = {
    ...Object.fromEntries(inputDefinitions.map(field => [field.key, field.type === 'boolean' ? false : 0])),
    amb: 20_000_000, ramb: 100, blueberries: 30, luckBaseNoAmb: 500,
    luckMultNoAmb: 0.2, luckConversion: 10, baseObt: 100, baseOff: 100,
    currentSingularity: 100, ascSpeed: 1, quarksOwned: 1, qHept: 1,
    runeSiExp: new Decimal(1), runeSiRC: 1, runeSiEffectiveLevelMultiplier: 1,
    runeSiBonusLevelsTalismanNoAmbrosia: 0, runeIaExp: new Decimal(1),
    runeIaBonusLevelsTotal: new Decimal(0), runeIaBonusLevelsTalisman: new Decimal(0),
    baseTalismanPower: new Decimal(1), exalt5Unlocked: true, exalt9Unlocked: true,
    panthemaLevel: 3, tauPower: 1, shopAmbrosiaLuck1: 10, freeShopLevelsInfinity: 10,
    ambrosiaUpgradeBonusLevels: {}, ambrosiaUpgradeBlueberryCostReductions: {},
    shopUpgradeRawLevels: { obtainiumEX3: 100, offeringEX3: 100 },
    shopBonusLevelsNoAmbrosia: { offering: 0, obtainium: 0, cubes: 0, speed: 0,
      quark: 0, ambrosiaLuck: 5, redAmbrosiaLuck: 0, ambrosiaGeneration: 0, infinity: 10 },
    heaterOptions: {},
  };
  const loadout = levels => {
    const result = new Loadout();
    result.upgradeLevels = { ...levels };
    result.satisfyPrerequisites();
    return result;
  };
  const close = (actual, expected, context) => assert.ok(
    Number.isFinite(actual) && Math.abs(actual - expected) <= 1e-10 * Math.max(1, Math.abs(expected)),
    `${context}: ${actual} != ${expected}`,
  );
  // A later heat must not change the model or cached calculations of an earlier one.
  const first = createHeaterOptimizerEngine();
  const second = createHeaterOptimizerEngine();
  first.fillStatsAndOptionsFromInput(input);
  const firstLoadout = new first.Loadout();
  firstLoadout.upgradeLevels = { ambrosiaLuck1: 20, ambrosiaInfiniteShopUpgrades1: 10 };
  const firstValues = [firstLoadout.luck, firstLoadout.getStat('obt'), firstLoadout.cost];
  second.fillStatsAndOptionsFromInput({ ...input, exalt: 6, blueberries: 6,
    luckBaseNoAmb: 10, baseObt: 5, bonusRow3: 3, panthemaLevel: 0 });
  const secondLoadout = new second.Loadout();
  secondLoadout.upgradeLevels = { ...firstLoadout.upgradeLevels };
  assert.notEqual(secondLoadout.luck, firstValues[0], 'independent heat has its own stats');
  close(firstLoadout.getStat('luck', true), firstValues[0], 'first heat luck after second heat');
  close(firstLoadout.getStat('obt', true), firstValues[1], 'first heat shop cache after second heat');
  assert.equal(firstLoadout.cost, firstValues[2], 'first heat upgrade costs remain independent');
  let checked = 0;
  // Directly compare the fast formula with complete unions, including Jack,
  // Red/Purple bonus levels, Leo's five-berry threshold and disabled effects.
  for (const exalt of [0, 4, 6, 8]) for (const purpleLeoLevel of [0, 3]) {
    const state = { ...input, exalt, purpleLeoLevel, blueberries: 14, bonusRow3: 2,
      ambrosiaUpgradeBonusLevels: { ambrosiaInfiniteShopUpgrades1: 3, ambrosiaFreeLuckUpgrades: 2 } };
    fillStatsAndOptionsFromInput(state);
    const luck = [0, 10, 30].map(level => loadout({ ambrosiaLuck1: 20, ambrosiaLuck2: level,
      ambrosiaFreeLuckUpgrades: 10 }));
    const left = [0, 1, 20].map(level => loadout({ ambrosiaInfiniteShopUpgrades1: level,
      ambrosiaObtainium1: 1, ambrosiaOffering1: 2 }));
    for (const stat of ['obt', 'off']) {
      const evaluator = createLuckScaledResourceEvaluator(left, luck, stat);
      for (const candidate of left) for (let index = 0; index < luck.length; index++) {
        const actual = evaluator.evaluate(candidate, index, false);
        const union = Loadout.union(candidate, luck[index]);
        close(actual.value, union.getStat(stat), `${stat}, Exalt ${exalt}, Leo ${purpleLeoLevel}`);
        assert.equal(actual.cost, union.cost);
        assert.equal(actual.blueberryCost, union.blueberryCost);
        checked++;
      }
    }
  }
  // Brute force every resource/Luck/voucher combination at several budgets.
  // Includes no vouchers, intermediate purchases and the full 60 levels.
  const selected = new Set();
  for (const blueberries of [6, 30]) for (const amb of [50_000, 1_000_000, 3_000_000, 20_000_000]) {
    const state = { ...input, amb, blueberries };
    fillStatsAndOptionsFromInput(state);
    const vouchers = generateVoucherTable('vouchers');
    const luck = trimTable([0, 10, 20, 40, 60].map(level => loadout({ ambrosiaTutorial: 10, ambrosiaLuck1: level })), 'luck');
    for (const stat of ['obt', 'off']) {
      const key = stat === 'obt' ? 'ambrosiaObtainium1' : 'ambrosiaOffering1';
      const resources = [0, 1, 2].map(level => loadout({ [key]: level }));
      let expected = new Loadout();
      for (const resource of resources) for (const voucher of vouchers) for (const right of [new Loadout(), ...luck]) {
        const union = Loadout.union(Loadout.union(resource, voucher), right);
        if (union.blueberryCost > state.blueberries) union.fixBlueberryUpgrades();
        if (union.cost > amb || union.blueberryCost > state.blueberries) continue;
        if (union.getStat(stat) > expected.getStat(stat)
          || (union.getStat(stat) === expected.getStat(stat) && union.cost < expected.cost)) expected = union;
      }
      const actual = findResourceVoucherOpt(resources, luck, vouchers, stat);
      close(actual.getStat(stat), expected.getStat(stat), `${stat}, budget ${amb}`);
      assert.equal(actual.cost, expected.cost, `${stat}, budget ${amb}: ${JSON.stringify(actual.upgradeLevels)} vs ${JSON.stringify(expected.upgradeLevels)}`);
      assert.ok(actual.blueberryCost <= state.blueberries);
      selected.add(actual.getStat('vouchers'));
      checked++;
    }
    // Last-priority allocation cannot replace or reduce purchased Luck levels.
    const base = luck.filter(candidate => candidate.cost <= amb).at(-1);
    const result = addLastPriorityVouchers(base, vouchers, 'luck');
    assert.equal(result.upgradeLevels.ambrosiaLuck1, base.upgradeLevels.ambrosiaLuck1);
    assert.ok(result.cost <= amb && result.blueberryCost <= state.blueberries);
  }
  assert.ok(selected.has(0) && selected.has(60) && [...selected].some(level => level > 0 && level < 60));
  console.log(`Passed ${checked} heater voucher checks; selected voucher counts: ${[...selected].join(', ')}`);
}
main().catch(error => { console.error(error); process.exitCode = 1; });
