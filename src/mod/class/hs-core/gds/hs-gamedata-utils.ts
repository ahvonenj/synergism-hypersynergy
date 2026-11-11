import Decimal from "break_infinity.js";
import { AutoAscensionModes, type GameCount } from "../../../types/data-types/hs-player-savedata";

export const parseNumericStringIfSafe = (value: unknown): number | undefined => {
    if (typeof value !== 'string') return undefined;

    const trimmed = value.trim();
    if (trimmed.length === 0) return undefined;

    const parsed = Number(trimmed);
    return Number.isNaN(parsed) ? undefined : parsed;
};

export const parseGameDataDecimal = (value: unknown, fallback?: Decimal): Decimal => {
    if (value == null) {
        return fallback ?? new Decimal(0);
    }

    if (value instanceof Decimal) {
        return value;
    }

    if (typeof value === 'number') {
        if (Number.isFinite(value)) {
            return new Decimal(value);
        }
        return new Decimal(value.toString());
    }

    if (typeof value === 'string') {
        const trimmed = value.trim();
        if (trimmed.length === 0) {
            return fallback ?? new Decimal(0);
        }

        try {
            return new Decimal(trimmed);
        } catch {
            return fallback ?? new Decimal(0);
        }
    }

    if (typeof value === 'object') {
        // The live player's Decimals come from the game's own bundle, so they aren't `instanceof` ours
        // and our constructor throws on them: read their fields instead
        const { mantissa, exponent } = value as { mantissa?: unknown; exponent?: unknown };
        if (typeof mantissa === 'number' && typeof exponent === 'number') {
            return Decimal.fromMantissaExponent_noNormalize(mantissa, exponent);
        }

        // Before game commit 075dfeaa, the live player's counters (worlds, cubes) are classes whose valueOf() gives the number
        const primitive = value.valueOf();
        if (primitive !== value) {
            return parseGameDataDecimal(primitive, fallback);
        }
    }

    try {
        return new Decimal(value as any);
    } catch {
        return fallback ?? new Decimal(0);
    }
};

export const parseGameDataNumber = (value: unknown, fallback = 0): number => {
    if (value == null) {
        return fallback;
    }

    if (typeof value === 'number') {
        return value;
    }

    const stringParsed = parseNumericStringIfSafe(value);
    if (stringParsed !== undefined) {
        return stringParsed;
    }

    const decimal = parseGameDataDecimal(value, new Decimal(0));
    const parsed = decimal.toNumber();
    if (Number.isFinite(parsed)) {
        return parsed;
    }

    return parsed === Number.POSITIVE_INFINITY || parsed === Number.NEGATIVE_INFINITY ? parsed : fallback;
};

// floor(log10(value + 1)): 0 for 0
export const floorLog10OfOnePlus = (value: number | Decimal | GameCount): number =>
    Math.floor(Math.log10(Number(value ?? 0) + 1));

export const calculateSigmoidExponential = (constant: number, coefficient: number): number =>
    1 + (constant - 1) * (1 - Math.exp(-coefficient));

export const findInsertionIndex = (target: number, array: number[]): number => {
    let index = 0;
    while (index < array.length && target >= array[index]) {
        index += 1;
    }
    return index;
};


/** Whether the tesseract auto-buyer is in percentage mode (player.resetToggleModes.ascension). */
export const isTesseractAutoBuyPercentageMode = (resetToggleModes: { ascension?: AutoAscensionModes } | undefined): boolean =>
    resetToggleModes?.ascension === AutoAscensionModes.percentage;
