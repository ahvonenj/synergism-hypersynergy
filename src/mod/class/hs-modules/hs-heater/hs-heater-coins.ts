import Decimal from 'break_infinity.js';
import type { DecimalSource } from 'break_infinity.js';
import type { HeaterCoinRuneInput, HeaterCoinsC15Context, HeaterCoinsC15Input, HeaterCoinsC15Levels, HeaterCoinsC15State } from '../../../types/data-types/hs-heater-coins-types';
import { formatNumber } from './hs-heater-utils';

const TAX_LOG_BASE = Math.log10(1.01);

/** Runes.ts updateLevelsFromEXP, including its next-level floating point correction. */
export function heaterCoinRunePurchasedLevel(exp: Decimal, cost: DecimalSource, coefficient: number): number {
    const level = Math.floor(coefficient * exp.div(cost).plus(1).log10());
    const nextCost = Decimal.pow(10, (level + 1) / coefficient).minus(1).times(cost);
    return nextCost.lte(exp) ? level + 1 : level;
}

function effectiveSingularities(sing: number, multiplier: number): number {
    let effective = sing * Math.min(4.75, 0.75 * sing / 10 + 1) * multiplier;
    if (sing > 10) effective *= 1.5 * Math.min(4, 1.25 * sing / 10 - 0.25);
    if (sing > 25) effective *= 2.5 * Math.min(6, 1.5 * sing / 25 - 0.5);
    if (sing > 36) effective *= 4 * Math.min(5, sing / 18 - 1) * 1.1 ** Math.min(sing - 36, 64);
    if (sing > 50) effective *= 5 * Math.min(8, 2 * sing / 50 - 1) * 1.1 ** Math.min(sing - 50, 50);
    if (sing > 100) effective *= 2 * sing / 25 * 1.1 ** (sing - 100);
    if (sing > 150) effective *= 2 * 1.05 ** (sing - 150);
    if (sing > 200) effective *= 1.5 * 1.275 ** (sing - 200);
    if (sing > 215) effective *= 1.25 * 1.2 ** (sing - 215);
    if (sing > 230) effective *= 2;
    if (sing > 269) effective *= 3 * 3 ** (sing - 269);
    return effective;
}

/** Fixed tax-exempt building/ant factors and fixed speed factors cancel in this ratio. */
export function heaterCoinsC15LogRatio(candidate: HeaterCoinsC15State, baseline: HeaterCoinsC15State): number {
    const tax = candidate.taxExponent;
    const baseTax = baseline.taxExponent;
    // Tax.ts: n=floor(275/(log10(1.01)*tax))-1; cap=n-log10(1.01)*tax*n²/550.
    // Complete the square to avoid subtracting enormous, nearly equal cap exponents.
    const vertex = 275 / (TAX_LOG_BASE * tax);
    const baseVertex = 275 / (TAX_LOG_BASE * baseTax);
    const rounding = Math.floor(vertex) - 1 - vertex;
    const baseRounding = Math.floor(baseVertex) - 1 - baseVertex;
    const capDifference = 137.5 / (TAX_LOG_BASE * baseTax) * ((baseTax - tax) / tax)
        - TAX_LOG_BASE / 550 * (tax * rounding ** 2 - baseTax * baseRounding ** 2);
    return capDifference + (candidate.globalSpeedLog10 - baseline.globalSpeedLog10);
}

export function createHeaterCoinsC15Evaluator(input: HeaterCoinsC15Input, context: HeaterCoinsC15Context) {
    const entries = Object.entries(input.runes) as Array<[keyof typeof input.runes, HeaterCoinRuneInput]>;
    const runeInputs = entries.map(([key, rune]) => ({
        key, rune, exp: new Decimal(rune.exp), cost: new Decimal(rune.costCoefficient),
    }));
    return (levels: HeaterCoinsC15Levels): HeaterCoinsC15State => {
        const suppressed = context.exalt === 6 || context.exalt === 8;
        const coefficientDelta = (suppressed ? 0 : levels.coefficient) - input.baselineCoefficientModuleLevel;
        const talismanDelta = (suppressed ? 0 : levels.talisman) - input.baselineTalismanModuleLevel;
        const talismanPower = context.talismanPower + 0.005 * talismanDelta;
        const raw = {} as Record<keyof typeof input.runes, number>;
        const effective = {} as typeof raw;
        for (const { key, rune, exp, cost } of runeInputs) {
            const coefficient = rune.levelsPerOOM + (key === 'horseShoe' ? 0 : coefficientDelta);
            raw[key] = heaterCoinRunePurchasedLevel(exp, cost, coefficient)
                + rune.freeLevelsWithoutTalismans + rune.talismanLevelsPerPower * talismanPower;
            effective[key] = !rune.unlocked ? 0 : input.challenge9 && key !== 'horseShoe'
                ? 1 : raw[key] * rune.effectiveLevelMultiplier;
        }
        const duplicationTax = 0.001 + 0.999 * Math.exp(-Math.cbrt(effective.duplication) / 5);
        const thriftTax = 0.01 + 0.99 * Math.exp(-Math.cbrt(effective.thrift) / 10);
        const taxExponent = Math.max(1e-300, input.taxExponentWithoutRunes * duplicationTax * thriftTax
            * (context.exalt === 9 ? input.taxmanMultiplier : 1));
        const speedRune = 2 - Math.exp(-Math.cbrt(effective.speed) / 100);
        let speedLog = input.globalSpeedLog10WithoutRunesAndBrick + Math.log10(speedRune)
            + Math.log10(1 + raw.speed * input.speedBlessingPerRuneLevel)
            + Math.log10(1 + raw.speed * input.speedSpiritPerRuneLevel)
            + Math.log10(suppressed ? 1 : 1 - levels.brick / 100);
        speedLog = speedLog > 2 ? speedLog / 2 + 1
            : speedLog < 0 ? speedLog * input.slowGlobalSpeedPower : speedLog;
        const sing = context.singularity - levels.stabilizer;
        if (!context.postAoag && sing >= 1) {
            const shopLevel = context.exalt === 4 ? 0 : input.horseShoeShopLevel;
            const shopPenalty = 1 - Math.min(300, effective.horseShoe * shopLevel) / 1000;
            const multiplier = context.exalt === 5 ? (input.noOcteractsCompletions + 1) ** 3 : 1;
            speedLog -= Math.log10(shopPenalty)
                + Math.log10(1 + Math.sqrt(effectiveSingularities(sing, multiplier)) / 4);
        }
        return { taxExponent, globalSpeedLog10: speedLog };
    };
}

export function formatHeaterCoinsC15Effect(logRatio: number): string {
    if (!Number.isFinite(logRatio)) return 'N / A';
    if (Math.abs(logRatio) < 6) return formatNumber(10 ** logRatio);
    if (Math.abs(logRatio) >= 1e6) return `10^(${formatNumber(logRatio)})`;
    const exponent = Math.floor(logRatio);
    return `${(10 ** (logRatio - exponent)).toFixed(2)}e${exponent >= 0 ? '+' : ''}${exponent}`;
}
