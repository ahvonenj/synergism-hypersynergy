/** Fixed-stat reactor inputs, expressed in recipe batches rather than bar points. */
export interface ReactorIncomeInput {
    bluePerTick: number;
    redPerTick: number;
    blueRouting: number;
    redRouting: number;
    blueCapacity: number;
    redCapacity: number;
    normalPerTick: number;
    blueRequirement: number;
    redRequirement: number;
    purpleRequirement: number;
    purplePerBatch: number;
    cancer: number;
    blueRebate: number;
    redRebate: number;
    fusionBluePerRedFill: number;
    directFillsPerExtraction: number;
}

interface Reaction {
    blue: number;
    red: number;
    blueBar: number;
    redBar: number;
    consumed: number;
    purple: number;
}

const TICK_SECONDS = 0.125;
type FillRates = Readonly<{ blue: number; red: number; purple: number }>;
const incomeCache = new Map<string, FillRates>();
const INCOME_CACHE_LIMIT = 65_536;

/** Cache values, never the live player's object identity or a mutable input. */
export function calculateReactorIncome(input: ReactorIncomeInput): FillRates {
    const key = [input.bluePerTick, input.redPerTick, input.blueRouting, input.redRouting,
        input.blueCapacity, input.redCapacity, input.normalPerTick, input.blueRequirement,
        input.redRequirement, input.purpleRequirement, input.purplePerBatch, input.cancer,
        input.blueRebate, input.redRebate, input.fusionBluePerRedFill, input.directFillsPerExtraction].join('|');
    const cached = incomeCache.get(key);
    if (cached) return cached;
    const result = calculateReactorIncomeUncached(input);
    if (incomeCache.size >= INCOME_CACHE_LIMIT) incomeCache.clear();
    incomeCache.set(key, result);
    return result;
}

/**
 * Helper.ts reactPurpleReactants: route BOTH inputs, run the main reaction,
 * then react excess against the opposite tank's remaining stock. In particular,
 * excess cannot react with excess, and a zero-time pass still resolves overflow.
 */
function react(input: ReactorIncomeInput, blue: number, red: number,
    producedBlue: number, producedRed: number, normalLimit: number): Reaction {
    const reserveBlue = producedBlue * input.blueRouting;
    const reserveRed = producedRed * input.redRouting;
    const storedBlue = Math.min(reserveBlue, Math.max(0, input.blueCapacity - blue));
    const storedRed = Math.min(reserveRed, Math.max(0, input.redCapacity - red));
    const excessBlue = reserveBlue - storedBlue;
    const excessRed = reserveRed - storedRed;
    blue += storedBlue;
    red += storedRed;
    const normal = Math.min(blue, red, normalLimit);
    blue = Math.max(0, blue - normal);
    red = Math.max(0, red - normal);
    const blueOverflow = Math.min(excessBlue, red);
    const redOverflow = Math.min(excessRed, blue);
    return {
        blue: Math.max(0, blue - redOverflow),
        red: Math.max(0, red - blueOverflow),
        blueBar: Math.max(0, producedBlue - reserveBlue) + Math.max(0, excessBlue - blueOverflow),
        redBar: Math.max(0, producedRed - reserveRed) + Math.max(0, excessRed - redOverflow),
        consumed: normal + blueOverflow + redOverflow,
        purple: (normal + 0.1 * (blueOverflow + redOverflow)) * input.purplePerBatch,
    };
}

const near = (a: number, b: number): boolean =>
    Math.abs(a - b) <= 1e-10 * Math.max(1e-12, Math.abs(a), Math.abs(b));

/** Solve the three resource-conservation equations, with partial bars excluded. */
function solveBalances(matrix: number[][]): number[] | null {
    for (let column = 0; column < 3; column++) {
        let pivot = column;
        for (let row = column + 1; row < 3; row++)
            if (Math.abs(matrix[row][column]) > Math.abs(matrix[pivot][column])) pivot = row;
        if (Math.abs(matrix[pivot][column]) < 1e-14) return null;
        [matrix[column], matrix[pivot]] = [matrix[pivot], matrix[column]];
        const divisor = matrix[column][column];
        for (let entry = column; entry < 4; entry++) matrix[column][entry] /= divisor;
        for (let row = 0; row < 3; row++) {
            if (row === column) continue;
            const factor = matrix[row][column];
            for (let entry = column; entry < 4; entry++)
                matrix[row][entry] -= factor * matrix[column][entry];
        }
    }
    const result = matrix.map(row => row[3]);
    return result.every(value => Number.isFinite(value) && value >= -1e-10)
        ? result.map(value => Math.max(0, value)) : null;
}

/**
 * Expected sustained overcap income at fixed stats. Bar fills remain discrete:
 * a rare rebate/fusion burst must not be smeared over ordinary production.
 * Empty ticks and ordinary bar fills are batched until a tank boundary, Purple
 * extraction, or fusion-triggering Red fill. Cost depends on feedback events,
 * rather than seconds elapsed, lifetime resources, or the size of an RNG reward.
 */
function calculateReactorIncomeUncached(input: ReactorIncomeInput): FillRates {
    const routedBlue = input.bluePerTick * input.blueRouting;
    const routedRed = input.redPerTick * input.redRouting;
    if (input.blueRebate === 0 && input.redRebate === 0
        && input.fusionBluePerRedFill === 0 && input.directFillsPerExtraction === 0) {
        // Constant inputs need no event sampling. Each overflow batch needs a
        // stored reactant; the main reaction has already spent two tank units
        // per batch. This bound also covers inputs larger than BOTH tanks.
        const normal = Math.min(routedBlue, routedRed, input.normalPerTick,
            input.blueCapacity, input.redCapacity);
        const overflow = Math.min(routedBlue - normal, routedRed - normal,
            input.blueCapacity + input.redCapacity - 2 * normal);
        const consumed = (normal + overflow) / TICK_SECONDS;
        const blue = (input.bluePerTick / TICK_SECONDS - consumed) / input.blueRequirement;
        const red = (input.redPerTick / TICK_SECONDS - consumed) / input.redRequirement;
        return { blue, red, purple: ((normal + 0.1 * overflow) * input.purplePerBatch / TICK_SECONDS
            + input.cancer * (blue + red)) / input.purpleRequirement };
    }
    // Seed the abundant tank, without an artificial stock of the limiting
    // reactant. Candidate rates must not include consuming the saved tanks.
    const fusionSeed = input.redPerTick * (1 - input.redRouting) / input.redRequirement
        * input.fusionBluePerRedFill * input.blueRouting;
    const seedBlue = routedBlue + fusionSeed;
    const bothAccumulate = seedBlue === routedRed && routedBlue > input.normalPerTick;
    let blue = seedBlue > routedRed || bothAccumulate ? input.blueCapacity : 0;
    let red = routedRed > seedBlue || bothAccumulate ? input.redCapacity : 0;
    let blueBar = 0;
    let redBar = 0;
    let purpleBar = 0;
    let ticks = 0;
    let blueFills = 0;
    let redFills = 0;
    let purpleFills = 0;
    let baseConsumed = 0;
    let basePurple = 0;
    let rebateConsumed = 0;
    let rebatePurple = 0;
    let fusionConsumed = 0;
    let fusionPurple = 0;
    let balanced = false;
    let blueSpilled = false;
    let redSpilled = false;
    const fusion = input.fusionBluePerRedFill > 0;
    const extractionFeedback = input.blueRebate > 0 || input.redRebate > 0
        || input.directFillsPerExtraction > 0;
    let fusionPacket = input.fusionBluePerRedFill
        * Math.max(1, input.redPerTick / input.redRequirement);

    const ordinary = (b: number, r: number) =>
        react(input, b, r, input.bluePerTick, input.redPerTick, input.normalPerTick);
    const fillCount = (progress: number, requirement: number): number => Math.floor(progress / requirement);
    const resetMeasurements = () => {
        ticks = blueFills = redFills = purpleFills = 0;
        baseConsumed = basePurple = rebateConsumed = rebatePurple = fusionConsumed = fusionPurple = 0;
        blueSpilled = redSpilled = false;
    };

    const advance = () => {
        const first = ordinary(blue, red);
        const second = ordinary(first.blue, first.red);
        let deltaBlue = first.blue - blue;
        let deltaRed = first.red - red;
        let uniform = near(second.blue - first.blue, deltaBlue) && near(second.red - first.red, deltaRed)
            && near(first.blueBar, second.blueBar) && near(first.redBar, second.redBar)
            && near(first.purple, second.purple) && near(first.consumed, second.consumed);
        let stride = 1;
        let bluePoints = first.blueBar;
        let redPoints = first.redBar;
        let purplePoints = first.purple;
        let consumed = first.consumed;
        let lastBluePoints = first.blueBar;
        let lastRedPoints = first.redBar;
        if (!uniform) {
            // Balanced tanks commonly alternate between two fill levels.
            // Recognise that ordinary two-tick cycle too, rather than treating
            // thousands of empty ticks as thousands of feedback events.
            const third = ordinary(second.blue, second.red);
            const fourth = ordinary(third.blue, third.red);
            const cycleBlue = second.blue - blue;
            const cycleRed = second.red - red;
            uniform = near(third.blue - first.blue, cycleBlue) && near(third.red - first.red, cycleRed)
                && near(fourth.blue - second.blue, cycleBlue) && near(fourth.red - second.red, cycleRed)
                && near(first.blueBar, third.blueBar) && near(first.redBar, third.redBar)
                && near(second.blueBar, fourth.blueBar) && near(second.redBar, fourth.redBar)
                && near(first.purple, third.purple) && near(second.purple, fourth.purple)
                && near(first.consumed, third.consumed) && near(second.consumed, fourth.consumed);
            if (uniform) {
                stride = 2;
                deltaBlue = cycleBlue;
                deltaRed = cycleRed;
                bluePoints += second.blueBar;
                redPoints += second.redBar;
                purplePoints += second.purple;
                consumed += second.consumed;
                lastBluePoints = second.blueBar;
                lastRedPoints = second.redBar;
            }
        }
        let count = 1;
        if (uniform) {
            // Stay strictly before a branch boundary; the boundary tick itself
            // is evaluated normally so that clipping and reaction priority hold.
            let limit = 1e9;
            const bounds = [
                [blue, deltaBlue, input.blueCapacity, input.bluePerTick * input.blueRouting],
                [red, deltaRed, input.redCapacity, input.redPerTick * input.redRouting],
            ];
            if (stride === 2) bounds.push(
                [first.blue, deltaBlue, input.blueCapacity, input.bluePerTick * input.blueRouting],
                [first.red, deltaRed, input.redCapacity, input.redPerTick * input.redRouting]);
            for (const [stock, delta, capacity, routed] of bounds) {
                if (delta > 0) limit = Math.min(limit, Math.max(1, Math.floor((capacity - routed - stock) / delta)));
                if (delta < 0) limit = Math.min(limit, Math.max(1, Math.floor(stock / -delta)));
            }
            if (fusion && redPoints > 0)
                limit = Math.min(limit, Math.max(1, Math.ceil((input.redRequirement - redBar) / redPoints) - 1));
            const extractionAt = (n: number) => purpleBar + n * purplePoints + input.cancer * (
                fillCount(blueBar + n * bluePoints - lastBluePoints, input.blueRequirement)
                + fillCount(redBar + n * redPoints - lastRedPoints, input.redRequirement)) >= input.purpleRequirement;
            if (extractionFeedback && extractionAt(limit)) {
                let left = 1;
                let right = limit;
                while (left < right) {
                    const middle = Math.floor((left + right) / 2);
                    if (extractionAt(middle)) right = middle;
                    else left = middle + 1;
                }
                limit = Math.max(1, left - 1);
            }
            count = limit;
        }

        if (count > 1) {
            blueSpilled ||= bluePoints > 0;
            redSpilled ||= redPoints > 0;
            const b = fillCount(blueBar + count * bluePoints, input.blueRequirement);
            const r = fillCount(redBar + count * redPoints, input.redRequirement);
            // Cancer from this batch's last tick is awarded after extraction.
            const beforeLast = input.cancer * (
                fillCount(blueBar + count * bluePoints - lastBluePoints, input.blueRequirement)
                + fillCount(redBar + count * redPoints - lastRedPoints, input.redRequirement));
            const p = fillCount(purpleBar + count * purplePoints + beforeLast, input.purpleRequirement);
            blue = Math.max(0, Math.min(input.blueCapacity, blue + count * deltaBlue));
            red = Math.max(0, Math.min(input.redCapacity, red + count * deltaRed));
            blueBar = (blueBar + count * bluePoints) % input.blueRequirement;
            redBar = (redBar + count * redPoints) % input.redRequirement;
            purpleBar = (purpleBar + count * purplePoints + beforeLast) % input.purpleRequirement
                + input.cancer * (b + r) - beforeLast;
            blueFills += b;
            redFills += r;
            purpleFills += p;
            baseConsumed += count * consumed;
            basePurple += count * purplePoints;
            ticks += count * stride;
            return;
        }

        blue = first.blue;
        red = first.red;
        blueBar += first.blueBar;
        redBar += first.redBar;
        blueSpilled ||= first.blueBar > 0;
        redSpilled ||= first.redBar > 0;
        purpleBar += first.purple;
        baseConsumed += first.consumed;
        basePurple += first.purple;
        const p = fillCount(purpleBar, input.purpleRequirement);
        purpleBar %= input.purpleRequirement;
        const direct = p * input.directFillsPerExtraction;
        if (p > 0 && (input.blueRebate > 0 || input.redRebate > 0)) {
            const rebate = react(input, blue, red, p * input.blueRebate, p * input.redRebate, 0);
            blue = rebate.blue;
            red = rebate.red;
            blueBar += rebate.blueBar;
            redBar += rebate.redBar;
            blueSpilled ||= rebate.blueBar > 0;
            redSpilled ||= rebate.redBar > 0;
            purpleBar += rebate.purple;
            rebateConsumed += rebate.consumed;
            rebatePurple += rebate.purple;
        }
        let b = fillCount(blueBar, input.blueRequirement);
        const r = fillCount(redBar, input.redRequirement);
        blueBar %= input.blueRequirement;
        redBar %= input.redRequirement;
        if (fusion && r + direct > 0) {
            fusionPacket = Math.max(fusionPacket, (r + direct) * input.fusionBluePerRedFill);
            const reward = react(input, blue, red, (r + direct) * input.fusionBluePerRedFill, 0, 0);
            blue = reward.blue;
            red = reward.red;
            blueBar += reward.blueBar;
            blueSpilled ||= reward.blueBar > 0;
            const extra = fillCount(blueBar, input.blueRequirement);
            b += extra;
            blueBar %= input.blueRequirement;
            purpleBar += reward.purple;
            fusionConsumed += reward.consumed;
            fusionPurple += reward.purple;
        }
        blueFills += b + direct;
        redFills += r + direct;
        purpleFills += p;
        purpleBar += input.cancer * (b + r + 2 * direct);
        ticks++;
    };

    const estimate = (): number[] => {
        const duration = ticks * TICK_SECONDS;
        const a = baseConsumed / duration;
        // The separate zero-time reaction stages have no normal conversion.
        const c = purpleFills > 0 ? rebateConsumed / purpleFills : 0;
        const d = redFills > 0 ? fusionConsumed / redFills : 0;
        const cp = purpleFills > 0 ? rebatePurple / purpleFills : 0;
        const dp = redFills > 0 ? fusionPurple / redFills : 0;
        const direct = input.directFillsPerExtraction;
        let result: number[] | null;
        // If a bar receives no points, its regular fill rate is exactly zero.
        // Normalise the measured primary reaction by its Purple yield per
        // batch, then solve its sustained consumption too. Holding the sampled
        // consumption fixed instead can produce a negative zero-income rate
        // solely because a partial packet remains in a tank at the boundary.
        const yieldPerBatch = baseConsumed > 0 ? basePurple / baseConsumed : 0;
        if (!blueSpilled) {
            const solved = solveBalances([
                [1, d - input.fusionBluePerRedFill, c - input.blueRebate, input.bluePerTick / TICK_SECONDS],
                [1 / input.redRequirement, 1 + d / input.redRequirement,
                    (c - input.redRebate) / input.redRequirement - direct,
                    input.redPerTick / TICK_SECONDS / input.redRequirement],
                [-yieldPerBatch / input.purpleRequirement, -(input.cancer + dp) / input.purpleRequirement,
                    1 - (cp + input.cancer * direct) / input.purpleRequirement, 0],
            ]);
            result = solved && [direct * solved[2], solved[1], solved[2]];
        } else if (!redSpilled) {
            const solved = solveBalances([
                [1 / input.blueRequirement, 1,
                    (c - input.blueRebate + (d - input.fusionBluePerRedFill) * direct) / input.blueRequirement - direct,
                    input.bluePerTick / TICK_SECONDS / input.blueRequirement],
                [1, 0, c - input.redRebate + d * direct, input.redPerTick / TICK_SECONDS],
                [-yieldPerBatch / input.purpleRequirement, -input.cancer / input.purpleRequirement,
                    1 - (cp + (dp + input.cancer) * direct) / input.purpleRequirement, 0],
            ]);
            result = solved && [solved[1], direct * solved[2], solved[2]];
        } else result = solveBalances([
            [1, (d - input.fusionBluePerRedFill) / input.blueRequirement,
                (c - input.blueRebate) / input.blueRequirement - direct,
                (input.bluePerTick / TICK_SECONDS - a) / input.blueRequirement],
            [0, 1 + d / input.redRequirement,
                (c - input.redRebate) / input.redRequirement - direct,
                (input.redPerTick / TICK_SECONDS - a) / input.redRequirement],
            [-input.cancer / input.purpleRequirement,
                -(input.cancer + dp) / input.purpleRequirement,
                1 - cp / input.purpleRequirement, basePurple / duration / input.purpleRequirement],
        ]);
        balanced = result !== null;
        return result ?? [blueFills / duration, redFills / duration, purpleFills / duration];
    };

    // A bounded number of feedback events is enough to measure the reaction
    // allocation. Conservation removes integer-bar sampling noise, without
    // making runtime proportional to rare fill intervals or large rewards.
    // A bonus can change which tank is abundant. Extrapolate a persistent
    // warm-up drift to its boundary instead of measuring the consumption of an
    // arbitrary initial stock. A few packets' worth of motion is ordinary fill
    // phase, so leave that alone (in particular, do not flatten rebate bursts).
    let settled = false;
    for (let pass = 0; pass < 8; pass++) {
        const beforeBlue = blue;
        const beforeRed = red;
        for (let step = 0; step < 64; step++) advance();
        const driftBlue = blue - beforeBlue;
        const driftRed = red - beforeRed;
        // Fusion adds blue points, but its overflow can consume the red tank.
        // Both tanks use recipe batches, so allow the observed fusion burst in both.
        const blueDriftTolerance = Math.max(input.blueCapacity * 1e-8,
            4 * Math.max(input.blueRebate, fusionPacket));
        const redDriftTolerance = Math.max(input.redCapacity * 1e-8,
            4 * Math.max(input.redRebate, fusionPacket));
        const moveBlue = Math.abs(driftBlue) > blueDriftTolerance;
        const moveRed = Math.abs(driftRed) > redDriftTolerance;
        if (!moveBlue && !moveRed) {
            settled = true;
            break;
        }
        if (moveBlue) blue = driftBlue > 0 ? input.blueCapacity : 0;
        if (moveRed) red = driftRed > 0 ? input.redCapacity : 0;
    }
    if (!settled) throw new Error('Ambrosia reactor tanks did not reach a sustained regime.');
    resetMeasurements();
    let previous: number[] | undefined;
    let result: number[] = [0, 0, 0];
    for (let block = 0; block < 16; block++) {
        for (let step = 0; step < 64; step++) advance();
        result = estimate();
        if (balanced && previous && result.every((value, index) =>
            Math.abs(value - previous![index]) <= 1e-7 * Math.max(1e-12, value))
            && (!extractionFeedback || purpleFills >= 16 || result[2] === 0)
            && (!fusion || redFills >= 16 || result[1] === 0)) break;
        previous = result;
    }
    if (!balanced || !result.every(Number.isFinite))
        throw new Error('Ambrosia reactor income has no finite sustained rate.');
    return { blue: result[0], red: result[1], purple: result[2] };
}
