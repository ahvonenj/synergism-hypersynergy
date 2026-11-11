import { goldenQuarkUpgradeMaxLevels } from "./hs-gamedata-tables";
import type { GoldenQuarkUpgradeKey } from "../../../types/data-types/hs-gamedata-api-types";
import type { HSGameDataAPI } from "./hs-gamedata-api";

// SynergismOfficial/src/singularity.ts dailyFreeUpgradeTable (v4.3.1).
// These are caps on the saved free levels, before any free-level multiplier.
export const dailyFreeLevelCaps: Partial<Record<GoldenQuarkUpgradeKey, number>> = {
    goldenQuarks1: 10_000,
    goldenQuarks2: 2_000,
    goldenQuarks3: 30_000,
    singCubes1: 1_000_000,
    singCubes2: 100_000,
    singCubes3: 10_000,
    singOfferings1: 1_000_000,
    singOfferings2: 100_000,
    singOfferings3: 10_000,
    singObtainium1: 1_000_000,
    singObtainium2: 100_000,
    singObtainium3: 10_000,
    ascensions: 1_000_000,
    singAmbrosiaGeneration: 5,
    singAmbrosiaGeneration2: 5,
    singAmbrosiaGeneration3: 5,
    singAmbrosiaGeneration4: 5,
};

const freeLevelMultiplierExemptUpgrades = new Set<GoldenQuarkUpgradeKey>([
    'singAmbrosiaGeneration',
    'singAmbrosiaGeneration2',
    'singAmbrosiaGeneration3',
    'singAmbrosiaGeneration4',
]);

/**
 * Class: GoldenQuarkHelper
 * IsExplicitHSModule: No
 * Description:
 *     Golden quark (singularity) upgrades: levels, free levels and their softcap, max levels and effects.
 * Author: XxMolkxX, Shewchou
 */
export class GoldenQuarkHelper {
    readonly #api: HSGameDataAPI;

    constructor(api: HSGameDataAPI) {
        this.#api = api;
    }

    computeFreeLevelMultiplierGQ(): number {
        return Number(this.#api.quarkShop.getShopUpgradeEffects('shopSingularityPotency', 'freeUpgradeMult')) + 0.3 / 100 * (this.#api.getGameData()?.cubeUpgrades[75] ?? 0);
    }

    // Mirrors the cumulative-cost helpers in SynergismOfficial/src/singularity.ts.
    #sumPowersOfFour(level: number): number {
        return 4 * (Math.pow(4, level) - 1) / 3;
    }

    #sumLevelsTimesPowersOfFour(level: number): number {
        return (4 + (3 * level - 1) * Math.pow(4, level + 1)) / 9;
    }

    #sumSquaredLevelsTimesPowersOfFour(level: number): number {
        return ((9 * Math.pow(level, 2) - 6 * level + 5) * Math.pow(4, level + 1) - 20) / 27;
    }

    #sumConsecutiveProducts(level: number): number {
        return level * (level + 1) * (level + 2) / 3;
    }

    #sumSquaredAndCubedLevels(level: number): number {
        return Math.pow(level * (level + 1) / 2, 2) + level * (level + 1) * (2 * level + 1) / 6;
    }

    getGQUpgradeCumulativeCost(upgradeKey: GoldenQuarkUpgradeKey, level: number): number {
        const { costPerLevel, maxLevel, specialCostForm } = goldenQuarkUpgradeMaxLevels[upgradeKey];
        const overclockedLevels = Math.max(0, level - maxLevel);
        const levelsBeforeOverclocking = Math.min(level, maxLevel);

        if (specialCostForm === 'Default') {
            if (maxLevel === 2 ** 31 - 1) {
                if (level <= 100) return Math.round(costPerLevel * level * (level + 1) / 2);
                const cost101To400 = this.#sumConsecutiveProducts(Math.min(level, 400) - 1)
                    - this.#sumConsecutiveProducts(99);
                if (level <= 400) return Math.floor(costPerLevel * (5050 * 50 + cost101To400) / 50);
                const costAfter400 = this.#sumSquaredAndCubedLevels(level - 1)
                    - this.#sumSquaredAndCubedLevels(399);
                return Math.floor(costPerLevel * (5050 * 5000 + 100 * cost101To400 + costAfter400) / 5000);
            }
            return Math.round(costPerLevel * (
                levelsBeforeOverclocking * (levelsBeforeOverclocking + 1) / 2
                + maxLevel * this.#sumPowersOfFour(overclockedLevels)
                + this.#sumLevelsTimesPowersOfFour(overclockedLevels)
            ));
        }

        if (specialCostForm === 'Quadratic') {
            return Math.round(costPerLevel * (
                Math.pow(levelsBeforeOverclocking, 2)
                + (2 * maxLevel - 1) * this.#sumPowersOfFour(overclockedLevels)
                + 2 * this.#sumLevelsTimesPowersOfFour(overclockedLevels)
            ));
        }

        if (specialCostForm === 'Cubic') {
            return Math.round(costPerLevel * (
                Math.pow(levelsBeforeOverclocking, 3)
                + (3 * Math.pow(maxLevel, 2) - 3 * maxLevel + 1) * this.#sumPowersOfFour(overclockedLevels)
                + (6 * maxLevel - 3) * this.#sumLevelsTimesPowersOfFour(overclockedLevels)
                + 3 * this.#sumSquaredLevelsTimesPowersOfFour(overclockedLevels)
            ));
        }

        return Math.round(costPerLevel * (
            Math.pow(2, levelsBeforeOverclocking) - 1
            + Math.pow(2, maxLevel - 1) * this.#sumPowersOfFour(overclockedLevels)
        ));
    }

    getGQUpgradeLevel(upgradeKey: GoldenQuarkUpgradeKey): number {
        const saved = this.#api.getGameData()?.goldenQuarkUpgrades[upgradeKey];
        if (!saved) return 0;

        const investment = Number(saved.goldenQuarksInvested);
        if (!Number.isFinite(investment)) {
            return investment === Number.POSITIVE_INFINITY ? this.computeGQUpgradeMaxLevel(upgradeKey) : Number(saved.level ?? 0);
        }
        if (investment < 0) return 0;

        let low = 0;
        let high = this.computeGQUpgradeMaxLevel(upgradeKey);
        while (low < high) {
            const middle = low + Math.ceil((high - low) / 2);
            if (this.getGQUpgradeCumulativeCost(upgradeKey, middle) <= investment) low = middle;
            else high = middle - 1;
        }
        return low;
    }

    computeGQUpgradeFreeLevelSoftcap(upgradeKey: GoldenQuarkUpgradeKey): number {
        const data = this.#api.getGameData();
        if (!data) return 0;

        const upgrade = data.goldenQuarkUpgrades[upgradeKey];
        const freeLevelMult = freeLevelMultiplierExemptUpgrades.has(upgradeKey)
            ? 1 : this.computeFreeLevelMultiplierGQ();
        const savedFreeLevel = this.#api.getSavedUpgradeFreeLevel(upgrade);
        const cap = dailyFreeLevelCaps[upgradeKey] ?? Number.POSITIVE_INFINITY;
        const freeLevel = Math.min(cap, Math.max(0, savedFreeLevel));

        const baseRealFreeLevels = freeLevelMult * freeLevel;
        const level = this.getGQUpgradeLevel(upgradeKey);
        return Math.min(level, baseRealFreeLevels) + Math.sqrt(Math.max(0, baseRealFreeLevels - level));
    }

    computeGQUpgradeMaxLevel(upgradeKey: GoldenQuarkUpgradeKey): number {
        const data = this.#api.getGameData();
        if (!data) return 0;

        const upgrade = goldenQuarkUpgradeMaxLevels[upgradeKey];
        if (!upgrade.canExceedCap) {
            return upgrade.maxLevel;
        }

        let cap = upgrade.maxLevel;
        const overclockPerks = [50, 60, 75, 100, 125, 150, 175, 200, 225, 250];
        for (const perk of overclockPerks) {
            if (data.highestSingularityCount >= perk) {
                cap += 1;
            } else {
                break;
            }
        }

        cap += this.#api.octeract.getOcteractUpgradeEffect('octeractSingUpgradeCap', 'goldenQuarkUpgradeCapIncrease');
        return cap;
    }

    actualGQUpgradeTotalLevels(upgradeKey: GoldenQuarkUpgradeKey): number {
        const data = this.#api.getGameData();
        if (!data) return 0;

        const upgrade = goldenQuarkUpgradeMaxLevels[upgradeKey];

        if ((data.singularityChallenges.noSingularityUpgrades.enabled || data.singularityChallenges.sadisticPrequel.enabled) && !upgrade.qualityOfLife) {
            return 0;
        }
        if ((data.singularityChallenges.limitedAscensions.enabled || data.singularityChallenges.limitedTime.enabled || data.singularityChallenges.sadisticPrequel.enabled)
            && upgradeKey === 'platonicDelta') {
            return 0;
        }

        const actualFreeLevels = this.computeGQUpgradeFreeLevelSoftcap(upgradeKey);
        const level = this.getGQUpgradeLevel(upgradeKey);
        const linearLevels = level + actualFreeLevels;
        let polynomialLevels = 0;

        if (this.#api.octeract.getOcteractUpgradeEffect('octeractImprovedFree')) {
            let exponent = 0.6;
            exponent += this.#api.octeract.getOcteractUpgradeEffect('octeractImprovedFree2');
            exponent += this.#api.octeract.getOcteractUpgradeEffect('octeractImprovedFree3');
            exponent += this.#api.octeract.getOcteractUpgradeEffect('octeractImprovedFree4');
            polynomialLevels = Math.pow(level * actualFreeLevels, exponent);
        }

        return Math.max(linearLevels, polynomialLevels);
    }

    getGQUpgradeEffect(upgradeKey: GoldenQuarkUpgradeKey, effectKey?: string): number {
        const upgrade = goldenQuarkUpgradeMaxLevels[upgradeKey];
        const totalLevels = this.actualGQUpgradeTotalLevels(upgradeKey);

        if (upgradeKey === 'favoriteUpgrade') {
            return this.calculateFavoriteUpgradeEffect(totalLevels);
        }

        return upgrade.effect ? upgrade.effect(totalLevels, effectKey) : 0;
    }

    calculateFavoriteUpgradeEffect(totalLevels: number): number {
        const maxedCount = this.#api.getFavoriteUpgradeMaxedDependencyCount();
        return 1 + totalLevels / 5000 * (maxedCount + 6);
    }
}
