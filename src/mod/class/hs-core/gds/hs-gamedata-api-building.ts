import Decimal from "break_infinity.js";
import { AntUpgrades } from "../../../types/data-types/hs-gamedata-api-types";
import type { HSGameDataAPI } from "./hs-gamedata-api";
import { parseGameDataDecimal } from "./hs-gamedata-utils";

// Since the game's 4.4.1 update a building's owned count isn't saved: the player keeps what it paid
// (firstPaidCoin...), and the count is what that amount buys on the building's cost curve, whose threshold moves with
// construction. Mirrors SynergismOfficial/src/Buy.ts (coin buildings only) and the construction in Calculate.ts and
// Statistics.ts.

// producerData.coin in Buy.ts
const COIN_COSTS = [100, 1000, 2e4, 4e5, 8e6] as const;
const COIN_GROWTH = [1, 2, 3, 4, 5] as const;
const CHALLENGE8_GROWTH_POWER = 2;
const AFFORDABILITY_TOLERANCE = 1 + 1e-9;
const D1E300 = new Decimal(1e300);

// Calculate.ts and Statistics.ts
const BASE_CONSTRUCTION = 1;
const COIN_CONSTRUCTION_SOFTCAP = 1000;
const CHALLENGE4_CONSTRUCTION_DIVISOR = 2;
const CHALLENGE8_CONSTRUCTION_DIVISOR = 5;
const CONSTRUCTION_RESEARCHES = [56, 57, 58, 59, 60] as const;
const MYTHOS_UPGRADE8_CONSTRUCTION = 0.2;

// The Platonic upgrades' max levels (platUpgradeBaseCosts in SynergismOfficial/src/Platonic.ts): each maxed one gives
// 1.5 construction inside Challenge 15
const PLATONIC_UPGRADE_MAX_LEVELS: Record<number, number> = {
    1: 30, 2: 30, 3: 30, 4: 30, 5: 1, 6: 10, 7: 10, 8: 5, 9: 1, 10: 1,
    11: 1, 12: 10, 13: 1, 14: 1, 15: 1, 16: 100, 17: 20, 18: 40, 19: 50, 20: 1
};
const CONSTRUCTION_PER_MAXED_PLATONIC_UPGRADE = 1.5;

const COIN_PAID_KEYS = ['firstPaidCoin', 'secondPaidCoin', 'thirdPaidCoin', 'fourthPaidCoin', 'fifthPaidCoin'] as const;

interface QuadraticCurveConstants {
    growth: number;
    log10Growth: number;
    scale: Decimal;
}

// createQuadraticCurveConstants in Buy.ts
const createCoinCurveConstants = (growthPower: number): QuadraticCurveConstants[] =>
    COIN_COSTS.map((cost, index) => {
        const growth = Math.pow(1.25, COIN_GROWTH[index] * growthPower);
        return { growth, log10Growth: Math.log10(growth), scale: Decimal.fromNumber(cost / (growth - 1)) };
    });

const COIN_CURVE_CONSTANTS = createCoinCurveConstants(1);
const CHALLENGE8_COIN_CURVE_CONSTANTS = createCoinCurveConstants(CHALLENGE8_GROWTH_POWER);

// smallestInc in SynergismOfficial/src/Utility.ts
const smallestInc = (x = 0): number => x <= Number.MAX_SAFE_INTEGER ? 1 : 2 ** Math.floor(Math.log2(x) - 52);

class QuadraticCostCurve {
    readonly growth: number;
    readonly log10Growth: number;
    readonly scale: Decimal;
    readonly threshold: number;

    constructor({ growth, log10Growth, scale }: QuadraticCurveConstants, threshold: number) {
        this.growth = growth;
        this.log10Growth = log10Growth;
        this.scale = scale;
        this.threshold = threshold;
    }

    exponentBetween(from: number, to: number): number {
        const threshold = this.threshold;
        const start = Math.max(from, threshold);
        return to - from + (start < to ? (Math.pow(to - threshold, 2) - Math.pow(start - threshold, 2)) / threshold : 0);
    }

    countForExponent(exponent: number): number {
        const threshold = this.threshold;
        return exponent <= threshold
            ? exponent
            : (threshold + Math.sqrt(4 * threshold * exponent - 3 * Math.pow(threshold, 2))) / 2;
    }
}

const costBetween = (curve: QuadraticCostCurve, from: number, to: number): Decimal => {
    if (to <= from) {
        return new Decimal();
    }
    const exponent = curve.exponentBetween(from, to);
    const increase = curve.log10Growth * exponent < 300
        ? Decimal.fromNumber(Math.expm1(curve.log10Growth * exponent * Math.LN10))
        : Decimal.pow(curve.growth, exponent);
    if (from === 0) {
        return curve.scale.times(increase);
    }
    return curve.scale.times(Decimal.pow(curve.growth, curve.exponentBetween(0, from))).times(increase);
};

const maxAffordable = (curve: QuadraticCostCurve, budget: Decimal): number => {
    const limit = budget.times(AFFORDABILITY_TOLERANCE);
    const ratio = budget.div(curve.scale);
    const exponent = ratio.lt(D1E300)
        ? Math.log1p(ratio.toNumber()) / Math.log(curve.growth)
        : ratio.add(1).log10() / curve.log10Growth;
    let count = Math.max(0, Math.floor(curve.countForExponent(exponent)));
    while (count > 0 && costBetween(curve, 0, count).gt(limit)) {
        count -= smallestInc(count);
    }
    while (
        count + smallestInc(count) <= Number.MAX_SAFE_INTEGER
        && costBetween(curve, 0, count + smallestInc(count)).lte(limit)
    ) {
        count += smallestInc(count);
    }
    return count;
};

/**
 * Class: BuildingHelper
 * IsExplicitHSModule: No
 * Description:
 *     Construction and the coin buildings owned, which the game derives from what the player paid since its 4.4.1
 *     update. Mirrors SynergismOfficial/src/Buy.ts (coin buildings only), Calculate.ts and Statistics.ts.
 * Author: Shewchou
 */
export class BuildingHelper {
    readonly #api: HSGameDataAPI;

    constructor(api: HSGameDataAPI) {
        this.#api = api;
    }

    /** constructionStatsSum (calculateRawConstruction) */
    calculateRawConstruction(): number {
        const data = this.#api.getGameData();
        if (!data) return BASE_CONSTRUCTION;
        const inChallenge15 = data.currentChallenge.ascension === 15;
        const maxedPlatonicUpgrades = Object.entries(PLATONIC_UPGRADE_MAX_LEVELS)
            .filter(([index, maxLevel]) => (data.platonicUpgrades[Number(index)] ?? 0) >= maxLevel).length;
        return Math.min(
            1e300,
            BASE_CONSTRUCTION
                + MYTHOS_UPGRADE8_CONSTRUCTION * (data.upgrades[48] ?? 0)
                + this.#api.rune.getRuneEffects('thrift').construction
                + 0.05 * CONSTRUCTION_RESEARCHES.reduce((sum, index) => sum + (data.researches[index] ?? 0), 0)
                + this.#api.antUpgrade.getAntUpgradeEffectValue(AntUpgrades.BuildingCostScale, 'construction')
                + (inChallenge15 ? CONSTRUCTION_PER_MAXED_PLATONIC_UPGRADE * maxedPlatonicUpgrades : 0)
                + this.#api.calculateChallenge15Reward('construction')
        );
    }

    /** constructionStatsSum x constructionMultiplierStatsProduct (calculateConstruction) */
    calculateConstruction(): number {
        const data = this.#api.getGameData();
        if (!data) return BASE_CONSTRUCTION;
        const multiplier = data.currentChallenge.ascension === 15 && (data.platonicUpgrades[13] ?? 0) > 0 ? 3 : 1;
        return this.calculateRawConstruction() * multiplier;
    }

    /** calculateBuildingConstruction('coin'): construction over the challenge divisor and the corruption effect */
    calculateCoinConstruction(): number {
        const data = this.#api.getGameData();
        if (!data) return BASE_CONSTRUCTION;
        const divisor = data.currentChallenge.reincarnation === 8
            ? CHALLENGE8_CONSTRUCTION_DIVISOR
            : data.currentChallenge.transcension === 4 || data.currentChallenge.reincarnation === 10
                ? CHALLENGE4_CONSTRUCTION_DIVISOR
                : 1;
        const corruption = this.#api.corruption;
        return this.calculateConstruction() / divisor
            / corruption.getCorruptionEffectNumber(corruption.getActiveCorruptionLevel(), 'construction');
    }

    /** getBuildingsOwned('coin'): the count each coin building's paid amount buys */
    getCoinBuildingsOwned(): number[] {
        const data = this.#api.getGameData();
        if (!data) return [0, 0, 0, 0, 0];
        const threshold = this.calculateCoinConstruction() * COIN_CONSTRUCTION_SOFTCAP;
        const constants = data.currentChallenge.reincarnation === 8 ? CHALLENGE8_COIN_CURVE_CONSTANTS : COIN_CURVE_CONSTANTS;
        return COIN_PAID_KEYS.map((key, index) =>
            maxAffordable(new QuadraticCostCurve(constants[index], threshold), parseGameDataDecimal(data[key])));
    }

    /** getTotalBuildingsOwned('coin') */
    getTotalCoinBuildingsOwned(): number {
        return this.getCoinBuildingsOwned().reduce((sum, owned) => sum + owned, 0);
    }
}
