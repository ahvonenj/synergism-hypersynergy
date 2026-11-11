// The number of decimals depends only on the size of the number, and trailing
// zeros are kept (552.00, not 552), so a column of values lines up. With
// fixedDecimals off, trailing zeros are dropped: for values that are counts.
export const formatNumber = (number: number, fixedDecimals = true): string => {
    if (!Number.isFinite(number)) return 'N / A';
    if (number >= 1e6) {
        return number.toLocaleString(undefined, {
            minimumSignificantDigits: fixedDecimals ? 3 : 1,
            maximumSignificantDigits: 3,
            notation: 'scientific',
            roundingMode: 'trunc'
        }).toLowerCase();
    }

    const digits = Math.max(0, Math.min(2, 4 - Math.floor(Math.log10(Math.abs(number)))));
    return number.toLocaleString(undefined, {
        minimumFractionDigits: fixedDecimals ? digits : 0,
        maximumFractionDigits: digits,
        roundingMode: 'trunc'
    });
};

// Between the two numbers of a two-value Effect (Obt + Off: Obtainium, then
// Offerings), which the results renderer draws after their game icons
export const HEATER_EFFECT_PAIR_SEPARATOR = ' | ';

export function normalizeHeaterFusion(fusion: number, rBar: number, rSpeed: number): number {
    const normalizedFusion = (fusion > 0 ? 1 : 0) + 0.02 * fusion;
    return rBar > 0 ? normalizedFusion * (rSpeed / rBar) : 0;
}

export function computeHeaterFusionValue(fusion: number, rLuckRLuck: number, baseRLuck: number): number {
    return fusion * rLuckRLuck * baseRLuck / 100;
}

export function computeHeaterFusionGain(fusionValue: number, multiplier: number): number {
    return (1 + fusionValue * multiplier) / (1 + fusionValue);
}

export function computeHeaterRedAmbrosiaBaseMultiplier(level: number, coefficient = 0.002): number {
    return 1 + coefficient / (1 + coefficient * level);
}

export function computeHeaterRedAmbrosiaSheetValue(
    currentLevel: number,
    fusionValue: number,
    rowMultiplier: number,
    coefficient = 0.002,
): number {
    return computeHeaterRedAmbrosiaBaseMultiplier(currentLevel, coefficient) * computeHeaterFusionGain(fusionValue, rowMultiplier);
}

// SynergismOfficial/src/Event.ts consumableEventBuff: Happy Hour bells give
// the same bonus to Ambrosia luck (additive luck mult) and blue bar speed.
export function heaterBellBonus(bells: number): number {
    const active = Math.max(0, Math.floor(bells));
    return active > 0 ? 0.1 + 0.01 * (active - 1) : 0;
}

// The luck mult, red luck and blue bar speed fields hold their values without
// bells. This adds the Active Bells field's bells back. On the bar speed they
// share one factor with the global event's blue bar part (Statistics.ts
// 'Event'); red luck holds floor((Ambrosia luck - 100) / conversion), so its
// share of the bells' luck is added the same way (calculateRedAmbrosiaLuck).
export function applyHeaterBells(input: {
    ambSpeedNoAmbBerries: number;
    luckBaseNoAmb: number;
    luckMultNoAmb: number;
    redLuckBase: number;
    luckConversion: number;
    activeBells: number;
    globalEventBlueBarBonus: number;
}): { ambSpeed: number; luckMult: number; redLuck: number } {
    const bells = heaterBellBonus(input.activeBells);
    const globalEvent = input.globalEventBlueBarBonus;
    const luckMult = input.luckMultNoAmb + bells;
    const redLuckShare = (mult: number) => Math.floor((input.luckBaseNoAmb * (1 + mult) - 100) / input.luckConversion);
    return {
        ambSpeed: input.ambSpeedNoAmbBerries * (1 + globalEvent + bells) / (1 + globalEvent),
        luckMult,
        redLuck: input.redLuckBase - redLuckShare(input.luckMultNoAmb) + redLuckShare(luckMult),
    };
}
