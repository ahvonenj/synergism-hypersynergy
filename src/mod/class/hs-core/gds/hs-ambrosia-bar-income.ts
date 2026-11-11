import type {
    AmbrosiaBarIncome,
    AmbrosiaBarIncomeInput,
} from "../../../types/data-types/hs-ambrosia-income-types";
import { calculateReactorIncome } from "./hs-ambrosia-reactor-income";

// Helper.ts redAmbrosiaAcceleratorMaxBarPoints
const RED_FILL_FUSION_MAX_POINTS = 80_000_000;

/**
 * Expected sustained fill rates for a fixed Ambrosia loadout. Vanilla routes,
 * converts and fills bars in 0.125-second batches; fractional fills here are
 * their long-run average, with RNG rewards replaced by their expectation.
 * Current partial-bar and reactor-tank progress is intentionally not treated
 * as a loadout penalty.
 */
export function calculateAmbrosiaBarIncome(input: AmbrosiaBarIncomeInput): AmbrosiaBarIncome {
    const { reactor } = input;
    const blueRequirement = input.twoMind ? 10_000_000 : input.blueRequirementWithoutTwoMind;
    const redRequirement = input.twoMind ? 7_500 : input.redRequirementWithoutTwoMind;
    const purpleRequirement = input.twoMind ? 125_000 : reactor.purpleRequirementWithoutTwoMind;
    if (!(blueRequirement > 0 && redRequirement > 0 && purpleRequirement > 0)) {
        throw new Error('Ambrosia bar requirements must be positive.');
    }

    // Vanilla's calculateBarRewardLuck scales the luck-derived reward by the
    // fixed / old requirement ratio. The flat blue challenge reward is not
    // scaled, so Two Mind can improve blue Ambrosia per second.
    const blueAmbrosiaPerFill = input.blueLuck / 100
        * (input.twoMind ? blueRequirement / input.blueRequirementWithoutTwoMind : 1)
        + input.flatAmbrosiaPerBlueFill;
    const redAmbrosiaPerFill = input.redLuck / 100
        * (input.twoMind ? redRequirement / input.redRequirementWithoutTwoMind : 1);
    const purpleHoneyRewardLuck = input.purpleHoneyLuck
        * (input.twoMind ? purpleRequirement / reactor.purpleRequirementWithoutTwoMind : 1);
    // SynergismOfficial/src/Helper.ts runPurpleReactor: inside Bar Dependence,
    // each extraction fills each of the blue and red bars at most once, each
    // with this chance (calculateBarEXALTPurpleFillChance).
    const barDependenceFillChance = 1 - Math.pow(2, -purpleHoneyRewardLuck / 100);
    // Helper.ts awardRedAmbrosiaBarFill: Red-Blue Ultrafusion gives
    // floor(base Red Luck / 100) rolls, +1 with the remaining chance, each worth
    // the upgrade's seconds of blue bar points, at most 80M points per red fill.
    // Averaging the two roll counts keeps the cap exact.
    const fusionPointsPerRoll = Math.max(0, input.bluePointsPerSecond)
        * Math.max(0, input.acceleratorSecondsPerRedAmbrosia);
    const fusionRolls = Math.max(0, input.redLuck) / 100;
    const guaranteedFusionRolls = Math.floor(fusionRolls);
    const bonusFusionRollChance = fusionRolls - guaranteedFusionRolls;
    const fusionPointsPerRedFill = fusionPointsPerRoll === 0 ? 0
        : (1 - bonusFusionRollChance) * Math.min(RED_FILL_FUSION_MAX_POINTS, guaranteedFusionRolls * fusionPointsPerRoll)
        + bonusFusionRollChance * Math.min(RED_FILL_FUSION_MAX_POINTS, (guaranteedFusionRolls + 1) * fusionPointsPerRoll);
    const blueRoute = Math.min(1, Math.max(0, reactor.blueRoutingPercent / 100));
    const redRoute = Math.min(1, Math.max(0, reactor.redRoutingPercent / 100));

    // Vanilla's Purple Reactor recipe is 1,000 blue + 1 red -> 100 purple
    // points. Scorpio changes blue cost and purple output; Aries changes only
    // purple output.
    const recipeBlue = 1_000 * reactor.scorpioConversionMultiplier;
    const recipePurple = 100 * reactor.scorpioConversionMultiplier
        * reactor.ariesBarPointMultiplier;
    const baseRedProduction = Math.max(0, input.redPointsPerSecond);
    const throughputBatches = reactor.blueCapacity * reactor.encabulatorSpeed
        / 100 / 3_600 / recipeBlue;
    const cancer = reactor.cancerPurplePointsPerBlueOrRedFill;

    const incomeFromFills = (rates: { blue: number; red: number; purple: number }): AmbrosiaBarIncome => ({
        blueAmbrosiaPerSecond: reactor.barDependenceEnabled ? 0 : rates.blue * blueAmbrosiaPerFill,
        redAmbrosiaPerSecond: reactor.barDependenceEnabled ? 0 : rates.red * redAmbrosiaPerFill,
        blueRewardPerSecond: rates.blue * blueAmbrosiaPerFill,
        redRewardPerSecond: rates.red * redAmbrosiaPerFill,
        purpleHoneyPerSecond: reactor.barDependenceEnabled
            ? 0
            : rates.purple * purpleHoneyRewardLuck / 100 * input.purpleHoneyPerExtraction,
        blueFillsPerSecond: rates.blue,
        redFillsPerSecond: rates.red,
        purpleFillsPerSecond: rates.purple,
    });

    if (reactor.overcapEnabled && blueRoute > 0 && redRoute > 0) {
        return incomeFromFills(calculateReactorIncome({
            bluePerTick: Math.max(0, input.bluePointsPerSecond) * 0.125 / recipeBlue,
            redPerTick: baseRedProduction * 0.125,
            blueRouting: blueRoute,
            redRouting: redRoute,
            blueCapacity: reactor.blueCapacity / recipeBlue,
            // Scorpio changes the recipe, not the red tank's capacity.
            redCapacity: reactor.blueCapacity / 1_000,
            normalPerTick: throughputBatches * 0.125,
            blueRequirement: blueRequirement / recipeBlue,
            redRequirement,
            purpleRequirement,
            purplePerBatch: recipePurple,
            cancer,
            blueRebate: reactor.purpleFillBluePoints / recipeBlue,
            redRebate: reactor.purpleFillRedPoints,
            fusionBluePerRedFill: fusionPointsPerRedFill / recipeBlue,
            directFillsPerExtraction: reactor.barDependenceEnabled ? barDependenceFillChance : 0,
        }));
    }

    const ratesAtBlueProduction = (blueProduction: number, purpleFills: number) => {
        // With overcap OFF, post-extraction rebates cannot react immediately.
        // Their sustained supply can be solved together with ordinary points.
        const blueSupply = blueProduction + purpleFills * reactor.purpleFillBluePoints;
        const redSupply = baseRedProduction + purpleFills * reactor.purpleFillRedPoints;
        const blueBatches = blueRoute * blueSupply / recipeBlue;
        const redBatches = redRoute * redSupply;
        const normalBatches = Math.min(blueBatches, redBatches, throughputBatches);
        const regularBlueFills = Math.max(0,
            (blueSupply - normalBatches * recipeBlue) / blueRequirement);
        const regularRedFills = Math.max(0,
            (redSupply - normalBatches) / redRequirement);
        const purplePoints = normalBatches * recipePurple;
        // Inside Bar Dependence, an extraction fills each bar with
        // barDependenceFillChance instead of yielding Purple Honey.
        const purpleBarRewards = reactor.barDependenceEnabled
            ? purpleFills * barDependenceFillChance : 0;
        // Cancer bar points are granted after each blue/red fill and count
        // toward the following extraction, rather than feeding this tick.
        const bonusFills = 2 * purpleBarRewards;
        return {
            blue: regularBlueFills + purpleBarRewards,
            red: regularRedFills + purpleBarRewards,
            purple: (purplePoints + cancer * (regularBlueFills + regularRedFills + bonusFills))
                / purpleRequirement,
        };
    };

    // Red-Blue Ultrafusion grants blue bar points on red fills. Its feedback
    // is piecewise linear at the red-reactant and reactor throughput limits,
    // so solve those regions directly instead of iterating through thousands
    // of game ticks.
    const baseBlueProduction = Math.max(0, input.bluePointsPerSecond);
    const solveAtPurpleFills = (purpleFills: number) => {
        let blueProduction = baseBlueProduction;
        if (fusionPointsPerRedFill > 0) {
            const redBatches = redRoute * (baseRedProduction + purpleFills * reactor.purpleFillRedPoints);
            const rebatedBlue = purpleFills * reactor.purpleFillBluePoints;
            const breakpoints = [0,
                blueRoute > 0 ? redBatches * recipeBlue / blueRoute - rebatedBlue : Number.POSITIVE_INFINITY,
                blueRoute > 0 ? throughputBatches * recipeBlue / blueRoute - rebatedBlue : Number.POSITIVE_INFINITY]
                .filter((value) => Number.isFinite(value) && value >= 0)
                .sort((left, right) => left - right);
            const boundaries = [...new Set(breakpoints), Number.POSITIVE_INFINITY];
            let solved = false;
            for (let index = 0; index < boundaries.length - 1; index++) {
                const left = boundaries[index];
                const right = boundaries[index + 1];
                const probe = Number.isFinite(right) ? right : left + Math.max(1, baseBlueProduction);
                if (probe <= left) continue;
                const leftRedFills = ratesAtBlueProduction(left, purpleFills).red;
                const slope = (ratesAtBlueProduction(probe, purpleFills).red - leftRedFills) / (probe - left);
                const denominator = 1 - fusionPointsPerRedFill * slope;
                if (denominator <= 0) continue;
                const candidate = (baseBlueProduction
                    + fusionPointsPerRedFill * (leftRedFills - slope * left)) / denominator;
                if (candidate >= left - 1e-9 * Math.max(1, left)
                    && candidate <= right + 1e-9 * Math.max(1, right)) {
                    blueProduction = Math.max(0, candidate);
                    solved = true;
                    break;
                }
            }
            if (!solved) blueProduction = Number.POSITIVE_INFINITY;
        }
        return ratesAtBlueProduction(blueProduction, purpleFills);
    };

    // Purple rebates and Cancer rewards form a feedback loop. A secant solve
    // handles each linear region; fixed-point steps cover routing boundaries.
    // This avoids simulating every game tick for a sustained-rate estimate.
    let purpleFills = 0;
    let previousPurpleFills = Number.NaN;
    let previousTarget = Number.NaN;
    let rates = solveAtPurpleFills(purpleFills);
    for (let iteration = 0; iteration < 32; iteration++) {
        if (!Number.isFinite(rates.purple)) {
            throw new Error('Ambrosia bar-fill feedback has no finite steady-state rate.');
        }
        if (Math.abs(rates.purple - purpleFills) <= 1e-10 * Math.max(1, rates.purple)) break;
        const slope = (rates.purple - previousTarget) / (purpleFills - previousPurpleFills);
        const secant = (rates.purple - slope * purpleFills) / (1 - slope);
        const next = Number.isFinite(secant) && slope < 1 && secant >= 0
            && secant <= 4 * Math.max(1, purpleFills, rates.purple)
            ? secant : rates.purple;
        previousPurpleFills = purpleFills;
        previousTarget = rates.purple;
        purpleFills = next;
        rates = solveAtPurpleFills(purpleFills);
        if (iteration === 31) {
            throw new Error('Ambrosia bar-fill feedback did not converge.');
        }
    }
    return incomeFromFills(rates);
}
