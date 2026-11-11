const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const esbuild = require('esbuild');

const root = path.resolve(__dirname, '../..');
const runtime = new Module(path.join(root, 'ambrosia-income-test.cjs'), module);
runtime._compile(esbuild.buildSync({
    entryPoints: [path.join(root, 'src/mod/class/hs-core/gds/hs-ambrosia-bar-income.ts')],
    bundle: true, write: false, platform: 'node', format: 'cjs',
}).outputFiles[0].text, path.join(root, 'ambrosia-income-test.cjs'));
const { calculateAmbrosiaBarIncome: income } = runtime.exports;
const reference = esbuild.transformSync(fs.readFileSync(
    path.join(root, 'scripts/fixtures/ambrosia-reactor-upstream.ts'), 'utf8'),
    { loader: 'ts', format: 'cjs' }).code;

const base = {
    reactor: {
        blueRoutingPercent: 50, redRoutingPercent: 50, blueStoredPoints: 0, redStoredPoints: 0,
        blueCapacity: 1e9, encabulatorSpeed: 12, purpleRequirementWithoutTwoMind: 250000,
        cancerPurplePointsPerBlueOrRedFill: 0, purpleFillBluePoints: 0, purpleFillRedPoints: 0,
        scorpioConversionMultiplier: 1, ariesBarPointMultiplier: 1, overcapEnabled: true,
        barDependenceEnabled: false,
    },
    bluePointsPerSecond: 1e6, redPointsPerSecond: 1e4,
    blueRequirementWithoutTwoMind: 1e7, redRequirementWithoutTwoMind: 7500,
    blueLuck: 100, redLuck: 100, purpleHoneyLuck: 100, purpleHoneyPerExtraction: 1,
    flatAmbrosiaPerBlueFill: 0, acceleratorSecondsPerRedAmbrosia: 0, twoMind: false,
};
const make = (values = {}, reactor = {}) => ({ ...base, ...values, reactor: { ...base.reactor, ...reactor } });
const close = (actual, expected, label, tolerance = 1e-10) => assert.ok(
    Number.isFinite(actual) && Math.abs(actual - expected) <= tolerance * Math.max(1e-10, Math.abs(expected)),
    `${label}: ${actual} != ${expected}`);

/** Run the upstream game functions with constant stats, never making a network request. */
function gameIncome(input, seconds = 25000, dt = 0.125) {
    const r = input.reactor;
    const blueRequirement = input.twoMind ? 1e7 : input.blueRequirementWithoutTwoMind;
    const redRequirement = input.twoMind ? 7500 : input.redRequirementWithoutTwoMind;
    const purpleRequirement = input.twoMind ? 125000 : r.purpleRequirementWithoutTwoMind;
    const routedBlue = input.bluePointsPerSecond * r.blueRoutingPercent / 100
        / (1000 * r.scorpioConversionMultiplier);
    const routedRed = input.redPointsPerSecond * r.redRoutingPercent / 100;
    const bothAccumulate = routedBlue === routedRed && routedBlue > r.blueCapacity * r.encabulatorSpeed
        / 100 / 3600 / (1000 * r.scorpioConversionMultiplier);
    const player = {
        singularityChallenges: { noSingularityUpgrades: { completions: 1 }, noAmbrosiaUpgrades: { completions: 1 },
            barDependence: { enabled: r.barDependenceEnabled } },
        purpleReactor: { ambrosiaBarPointPercentage: r.blueRoutingPercent,
            redAmbrosiaBarPointPercentage: r.redRoutingPercent,
            storedAmbrosiaBarPoints: routedBlue > routedRed || bothAccumulate ? r.blueCapacity : 0,
            storedRedAmbrosiaBarPoints: routedRed > routedBlue || bothAccumulate ? r.blueCapacity / 1000 : 0,
            purpleHoney: 0, lifetimePurpleHoney: 0 },
        blueberryTime: 0, redAmbrosiaTime: 0, purpleHoneyProgress: 0,
        ambrosia: 0, redAmbrosia: 0, lifetimeAmbrosia: 0, lifetimeRedAmbrosia: 0,
        encabulatorOvercapToggle: r.overcapEnabled, stats: { highestPurpleHoney: 0 }, singularityCounter: 0,
    };
    const counts = { blue: 0, red: 0, purple: 0 };
    // A golden-ratio sequence per seed: evenly spread draws, so a chance's
    // long-run rate matches its expectation without sampling noise.
    const draw = seed => (++counts[seed] * 0.6180339887498949) % 1;
    const env = {
        player,
        purpleReactantConversion: { ambrosiaBarPoints: 1000, redAmbrosiaBarPoints: 1, purpleBarPoints: 100 },
        PURPLE_REACTOR_OVERFLOW_EFFICIENCY: 0.1,
        getPurpleAmbrosiaUpgradeEffects: (name, key) => ({ scorpio: r.scorpioConversionMultiplier,
            aries: r.ariesBarPointMultiplier, libra: r.overcapEnabled,
            cancer: r.cancerPurplePointsPerBlueOrRedFill,
            gemini: key === 'ambrosiaBarPointsOnFill' ? r.purpleFillBluePoints : r.purpleFillRedPoints })[name],
        getShopUpgradeEffects: () => 0, // Both rebate sources are summed in the input.
        getRedAmbrosiaUpgradeEffects: () => input.acceleratorSecondsPerRedAmbrosia,
        getSingularityChallengeEffect: () => input.flatAmbrosiaPerBlueFill,
        calculateAmbrosiaRewardLuck: () => input.blueLuck * blueRequirement / input.blueRequirementWithoutTwoMind,
        calculateRedAmbrosiaRewardLuck: () => input.redLuck * redRequirement / input.redRequirementWithoutTwoMind,
        calculateRedAmbrosiaLuck: () => input.redLuck,
        calculatePurpleHoneyRewardLuck: () => input.purpleHoneyLuck * purpleRequirement / r.purpleRequirementWithoutTwoMind,
        calculateAmbrosiaGenerationSpeed: () => input.bluePointsPerSecond,
        calculateRedAmbrosiaGenerationSpeed: () => input.redPointsPerSecond,
        calculateRequiredBlueberryTime: () => blueRequirement,
        calculateRequiredRedAmbrosiaTime: () => redRequirement,
        calculatePurpleHoneyConversionFactor: () => purpleRequirement,
        calculatePurpleReactantCapacity: () => r.blueCapacity,
        calculateRedAmbrosiaReactantCapacity: () => r.blueCapacity / 1000,
        calculateEncabulatorSpeed: () => r.encabulatorSpeed,
        allPurpleHoneyEfficiencyStatsSum: () => input.purpleHoneyPerExtraction,
        Seed: { Ambrosia: 'blue', RedAmbrosia: 'red', PurpleHoney: 'purple' },
        // One blue or red draw per bar fill: their counts are the fills.
        seededRandom: draw,
        animatePurpleHoneyGain() {}, addTimers() {},
    };
    const run = new Function('env', `const {${Object.keys(env).join(',')}} = env;
        const module = {exports:{}}; ${reference}
        return (dt, ticks) => {for(let n=0;n<ticks;n++) runPurpleReactor(dt,dt,dt);};`)(env);
    const ticks = Math.ceil(seconds / dt);
    run(dt, ticks);
    const before = { ...counts, purple: player.purpleReactor.lifetimePurpleHoney };
    run(dt, ticks);
    return { blue: (counts.blue - before.blue) / (ticks * dt), red: (counts.red - before.red) / (ticks * dt),
        honey: (player.purpleReactor.lifetimePurpleHoney - before.purple) / (ticks * dt) };
}

// The three audit failures: main reaction priority, zero-time rebates and bounded overflow.
const redSurplus = make({ bluePointsPerSecond: 10000 }, { blueRoutingPercent: 100, redRoutingPercent: 100 });
close(income(redSurplus).purpleHoneyPerSecond * 3600, 14.4, 'red surplus keeps the main reaction');
const scarceRed = make({ bluePointsPerSecond: 1e7, redPointsPerSecond: 1 }, {
    purpleFillBluePoints: 1e6, purpleFillRedPoints: 500, cancerPurplePointsPerBlueOrRedFill: 5000,
});
const scarceIncome = income(scarceRed);
// In this regime almost all rebated red is consumed by rebate overflow. The
// remaining normal reaction is 0.5 batches/s; conservation gives these rates.
close(scarceIncome.purpleHoneyPerSecond, 5050.083333333334 / 246958.33333333334,
    'rare rebates use their zero-time reaction', 0.0001);
close(scarceIncome.redFillsPerSecond, (0.5 + 250 * scarceIncome.purpleFillsPerSecond) / 7500,
    'red refund conservation', 0.0001);
const overwhelmed = make({ bluePointsPerSecond: 2e10, redPointsPerSecond: 2e7 }, {
    blueRoutingPercent: 100, redRoutingPercent: 100,
});
const huge = income(overwhelmed);
close(huge.purpleHoneyPerSecond, 640.0106666666667, 'both tanks bound overflow');
close(huge.blueFillsPerSecond, 400.00333333333333, 'unmatched blue returns to its bar');
close(huge.redFillsPerSecond, 533.3377777777778, 'unmatched red returns to its bar');

const fusionRebates = make({ bluePointsPerSecond: 1e7, redPointsPerSecond: 1000,
    acceleratorSecondsPerRedAmbrosia: 3 }, {
    purpleFillBluePoints: 1e6, purpleFillRedPoints: 500, cancerPurplePointsPerBlueOrRedFill: 5000,
});
// Fusion can drain the opposite tank through Libra overflow even without
// Purple rebates or Cancer. A regular fill/drain cycle is not warm-up drift.
const fusionTankCycle = make({ bluePointsPerSecond: 8000, redPointsPerSecond: 8,
    acceleratorSecondsPerRedAmbrosia: 12.5 }, {
    blueRoutingPercent: 25, redRoutingPercent: 50, encabulatorSpeed: 28.8,
    purpleRequirementWithoutTwoMind: 125000,
});
// Physical inputs captured from the full routing scan. Express its mean
// fusion packet with integral Red Luck so upstream RNG introduces no bias.
const zeroBlueSpill = make({
    bluePointsPerSecond: 6.0531424281317046 * 8000,
    redPointsPerSecond: 23.523620640626 * 8,
    acceleratorSecondsPerRedAmbrosia: 3228.490486429287 / (6.0531424281317046 * 8),
}, {
    blueRoutingPercent: 100, redRoutingPercent: 80, blueCapacity: 2.55e9, encabulatorSpeed: 18.9,
    purpleRequirementWithoutTwoMind: 125000, ariesBarPointMultiplier: 1.036,
    purpleFillBluePoints: 1e6, purpleFillRedPoints: 500, cancerPurplePointsPerBlueOrRedFill: 5000,
});
assert.equal(income(zeroBlueSpill).blueFillsPerSecond, 0, 'zero blue spill has exactly zero blue income');
const twoMindFusion = make({ blueRequirementWithoutTwoMind: 2e7, redRequirementWithoutTwoMind: 15000,
    blueLuck: 400, redLuck: 400, purpleHoneyLuck: 400, flatAmbrosiaPerBlueFill: 1,
    acceleratorSecondsPerRedAmbrosia: 3, twoMind: true }, {
    blueRoutingPercent: 0, redRoutingPercent: 0,
});
close(income(twoMindFusion).blueAmbrosiaPerSecond, 5.1, 'Two Mind fusion uses base Red Luck');
close(income(twoMindFusion).redAmbrosiaPerSecond, 8 / 3, 'Two Mind red reward scaling');
assert.deepEqual(income(make({}, { blueStoredPoints: 1e9, redStoredPoints: 1e6 })), income(base),
    'sustained rates do not charge a candidate for the saved tanks');
const changedInput = make();
income(changedInput);
changedInput.reactor.blueRoutingPercent = 75;
assert.deepEqual(income(changedInput), income(make({}, { blueRoutingPercent: 75 })),
    'cache follows values when the same input object changes');
// One expected fill per extraction (2 x 0.5) x 300000 points over a 250000 bar: gain 1.2.
assert.throws(() => income(make({}, { barDependenceEnabled: true,
    cancerPurplePointsPerBlueOrRedFill: 300000 })), /no finite|sustained regime/,
    'unbounded reward feedback cannot be reported as a finite rate');
assert.throws(() => income(make({ redRequirementWithoutTwoMind: 0 })), /requirements must be positive/);

const cases = [
    ['red surplus', redSurplus], ['blue surplus', make({ bluePointsPerSecond: 1e7, redPointsPerSecond: 1000 })],
    ['rare rebate', scarceRed], ['fusion + rebates', fusionRebates],
    ['fusion tank cycle without extraction rebates', fusionTankCycle],
    ['zero blue spill', zeroBlueSpill],
    ['no overcap', { ...fusionRebates, reactor: { ...fusionRebates.reactor, overcapEnabled: false } }],
    ['Two Mind + fusion', twoMindFusion],
    ['Scorpio + Aries', make({ bluePointsPerSecond: 1e7, redPointsPerSecond: 1000 }, {
        scorpioConversionMultiplier: 2, ariesBarPointMultiplier: 1.12,
        purpleFillBluePoints: 1e6, purpleFillRedPoints: 500, cancerPurplePointsPerBlueOrRedFill: 5000,
    })],
    ['fusion changes the limiting tank', make({ bluePointsPerSecond: 1e6, redPointsPerSecond: 1000,
        acceleratorSecondsPerRedAmbrosia: 3 }, {
        blueRoutingPercent: 25, redRoutingPercent: 25, ariesBarPointMultiplier: 1.12,
        purpleFillBluePoints: 1e6, purpleFillRedPoints: 500, cancerPurplePointsPerBlueOrRedFill: 5000,
    })],
    ['balanced tanks + rebates', make({ bluePointsPerSecond: 1e6, redPointsPerSecond: 1000 }, {
        purpleFillBluePoints: 1e6, purpleFillRedPoints: 500, cancerPurplePointsPerBlueOrRedFill: 5000,
    }), 200000],
    ['Bar Dependence', make({ purpleHoneyLuck: 100 }, {
        barDependenceEnabled: true, cancerPurplePointsPerBlueOrRedFill: 5000,
        purpleFillBluePoints: 1e6, purpleFillRedPoints: 500,
    })],
    // 4 rolls x 3 s x 1e7 = 1.2e8 points per red fill, capped at 8e7.
    ['capped fusion', make({ bluePointsPerSecond: 1e7, redPointsPerSecond: 1000,
        acceleratorSecondsPerRedAmbrosia: 3, redLuck: 400 }, {
        purpleFillBluePoints: 1e6, purpleFillRedPoints: 500, cancerPurplePointsPerBlueOrRedFill: 5000,
    })],
    // 2 or 3 rolls of 3.6e7: only the third roll reaches the cap.
    ['capped fusion on the bonus roll, no overcap', make({ bluePointsPerSecond: 1.2e7,
        redPointsPerSecond: 1000, acceleratorSecondsPerRedAmbrosia: 3, redLuck: 250 }, {
        overcapEnabled: false, purpleFillBluePoints: 1e6, purpleFillRedPoints: 500,
        cancerPurplePointsPerBlueOrRedFill: 5000,
    })],
    ['Bar Dependence + Two Mind + fusion', make({
        blueRequirementWithoutTwoMind: 2e7, redRequirementWithoutTwoMind: 15000,
        blueLuck: 400, redLuck: 400, purpleHoneyLuck: 400,
        acceleratorSecondsPerRedAmbrosia: 3, twoMind: true,
    }, {
        barDependenceEnabled: true, cancerPurplePointsPerBlueOrRedFill: 5000,
        purpleFillBluePoints: 1e6, purpleFillRedPoints: 500,
    })],
];
for (const [name, input, seconds = 25000] of cases) {
    const actual = income(input);
    const game = gameIncome(input, seconds);
    for (const [key, expected] of [['blueFillsPerSecond', game.blue], ['redFillsPerSecond', game.red],
        ['purpleHoneyPerSecond', game.honey]]) {
        // Counted fills are integral in the game; allow a boundary fill and a
        // small long-run sampling error, rather than rounding the mod's answer.
        const error = Math.abs(actual[key] - expected);
        assert.ok(error <= 2 / seconds + Math.abs(expected) * 0.002,
            `${name} ${key}: ${actual[key]} vs game ${expected}`);
    }
    if (input.reactor.barDependenceEnabled) {
        assert.equal(actual.blueAmbrosiaPerSecond, 0);
        assert.equal(actual.redAmbrosiaPerSecond, 0);
        assert.equal(actual.purpleHoneyPerSecond, 0);
        assert.ok(actual.blueRewardPerSecond > 0 && actual.redRewardPerSecond > 0);
    }
}
console.log('Passed Ambrosia income checks: upstream reactor, overcap priority, rebate timing, tank bounds, fusion and its cap, Two Mind, Scorpio/Aries and Bar Dependence.');
module.exports = { income, gameIncome, base, make };
