import Decimal from "break_infinity.js";
import { AntUpgrades, CalculationCache, } from "../../../types/data-types/hs-gamedata-api-types";
import type { AntUpgradeTypeMap, } from "../../../types/data-types/hs-gamedata-api-types";
import { calculateSigmoidExponential, parseGameDataDecimal } from "./hs-gamedata-utils";
import type { GameData } from "../../../types/data-types/hs-player-savedata";
import type { HSGameDataAPI } from "./hs-gamedata-api";

/**
 * Class: AntUpgradeHelper
 * IsExplicitHSModule: No
 * Description:
 *     Ant upgrades: free levels, effective levels and effects.
 * Author: Shewchou
 */
export class AntUpgradeHelper {
    readonly #api: HSGameDataAPI;
    readonly #antUpgradeEffectCache = new Map<string, AntUpgradeTypeMap[keyof AntUpgradeTypeMap]>();
    readonly #antUpgradeValueCache = new Map<string, unknown>();
    readonly #antUpgradeActualLevelCache = new Map<AntUpgrades, number>();
    #lastCacheGeneration?: number;
    public readonly antUpgradeData: ReturnType<typeof buildAntUpgradeData>;

    constructor(api: HSGameDataAPI) {
        this.#api = api;
        this.antUpgradeData = buildAntUpgradeData(this.#api);
    }

    #getAntUpgradeEffectCacheKey<K extends AntUpgrades>(antUpgrade: K, actualLevel: number, data?: GameData | undefined): string {
        let key = `${antUpgrade}:${actualLevel}`;

        if (antUpgrade === AntUpgrades.AntSpeed) {
            key += `:${data?.researches[101] ?? 0}:${data?.researches[162] ?? 0}`;
        } else if (antUpgrade === AntUpgrades.Coins) {
            key += `:${data?.currentChallenge.ascension ?? 0}:${String(data?.ants.crumbs ?? 0)}`;
        } else if (antUpgrade === AntUpgrades.AntELO) {
            key += `:${data?.ants.antSacrificeCount ?? 0}:${Number(this.#api.achievement.AchRewards.antSpeed2UpgradeImprover() ?? 0)}`;
        }

        return key;
    }

    #getCachedAntUpgradeActualLevel<K extends AntUpgrades>(antUpgrade: K, data: GameData | undefined): number {
        if (!data) return 0;

        const generation = this.#api.getCacheGeneration();
        if (generation !== this.#lastCacheGeneration) {
            this.#lastCacheGeneration = generation;
            this.#antUpgradeActualLevelCache.clear();
            this.#antUpgradeEffectCache.clear();
            this.#antUpgradeValueCache.clear();
        }

        const cached = this.#antUpgradeActualLevelCache.get(antUpgrade);
        if (cached !== undefined) {
            return cached;
        }

        const actualLevel = this.calculateTrueAntLevel(antUpgrade, data);
        this.#antUpgradeActualLevelCache.set(antUpgrade, actualLevel);
        return actualLevel;
    }

    getAntUpgradeEffectValue = <K extends AntUpgrades, P extends keyof AntUpgradeTypeMap[K]>(antUpgrade: K, property: P): AntUpgradeTypeMap[K][P] => {
        const data = this.#api.getGameData();
        const actualLevel = this.#getCachedAntUpgradeActualLevel(antUpgrade, data);
        const effectCacheKey = this.#getAntUpgradeEffectCacheKey(antUpgrade, actualLevel, data);
        const valueCacheKey = `${effectCacheKey}:${String(property)}`;

        const valueCached = this.#antUpgradeValueCache.get(valueCacheKey);
        if (valueCached !== undefined) {
            return valueCached as AntUpgradeTypeMap[K][P];
        }

        const effect = this.#antUpgradeEffectCache.get(effectCacheKey) as AntUpgradeTypeMap[K] | undefined;
        if (effect) {
            const value = effect[property];
            this.#antUpgradeValueCache.set(valueCacheKey, value);
            return value;
        }

        const computedEffect = this.antUpgradeData[antUpgrade].effect(actualLevel) as AntUpgradeTypeMap[K];
        this.#antUpgradeEffectCache.set(effectCacheKey, computedEffect);
        const value = computedEffect[property];
        this.#antUpgradeValueCache.set(valueCacheKey, value);
        return value;
    }

    calculateTrueAntLevel = (antUpgrade: AntUpgrades, data?: GameData | undefined): number => {
        if (!data) data = this.#api.getGameData();
        if (!data) return 0;

        const upgradeData = this.antUpgradeData[antUpgrade];
        const freeLevels = computeFreeAntUpgradeLevels(this.#api);
        const corruptionDivisor = upgradeData.exemptFromCorruption
            ? 1
            : this.#api.corruption.getChallenge15CorruptionEffect('extinction');

        if (data.currentChallenge.ascension === 11) {
            return Math.min(data.ants.upgrades[antUpgrade], freeLevels) / corruptionDivisor;
        }

        return (data.ants.upgrades[antUpgrade] + Math.min(data.ants.upgrades[antUpgrade], freeLevels)) / corruptionDivisor;
    }
}

export const computeFreeAntUpgradeLevels = (api: HSGameDataAPI): number => {
    const data = api.getGameData();
    if (!data) return 0;

    const cacheName = 'FreeAntUpgradeLevels' as keyof CalculationCache;
    const freeAntUpgradesReward = Number(api.achievement.AchRewards.freeAntUpgrades() ?? 0);
    const calculationVars = [
        data.challengecompletions[9],
        data.constantUpgrades[6] ?? 0,
        data.challengecompletions[11],
        data.researches[97] ?? 0,
        data.researches[98] ?? 0,
        data.researches[102] ?? 0,
        data.researches[132] ?? 0,
        data.researches[200] ?? 0,
        freeAntUpgradesReward,
        data.challenge15Exponent ?? 0,
        data.currentChallenge.ascension,
        data.challengecompletions[8],
    ];

    return api.memoizeCalculation(cacheName, calculationVars, () => {
        let bonusLevels = 0;
        bonusLevels += data.challengecompletions[9];
        bonusLevels += Math.round(2000 * (1 - Math.pow(0.999, data.constantUpgrades[6] ?? 0)));
        bonusLevels += 12 * data.challengecompletions[11];
        bonusLevels += 2 * data.researches[97];
        bonusLevels += 2 * data.researches[98];
        bonusLevels += data.researches[102];
        bonusLevels += 2 * data.researches[132];
        bonusLevels += Math.floor((1 / 200) * data.researches[200]);
        bonusLevels += freeAntUpgradesReward;
        bonusLevels *= api.calculateChallenge15Reward('bonusAntLevel');

        if (data.currentChallenge.ascension === 11) {
            bonusLevels += Math.floor(
                3 * data.challengecompletions[8]
                + 5 * data.challengecompletions[9]
            );
            return bonusLevels;
        }

        return bonusLevels;
    });
};

const buildAntUpgradeData = (api: HSGameDataAPI) => ({
    [AntUpgrades.AntSpeed]: {
        exemptFromCorruption: false,
        effect: (n: number) => {
            const data = api.getGameData();
            let baseMul = 1.1;
            baseMul += (data?.researches[101] ?? 0) / 1000;
            baseMul += (data?.researches[162] ?? 0) / 1000;
            return {
                antSpeed: Decimal.pow(baseMul, n),
            };
        },
    },
    [AntUpgrades.Coins]: {
        exemptFromCorruption: false,
        effect: (n: number) => {
            const data = api.getGameData();
            let divisor = 1;
            if (data?.currentChallenge.ascension === 15) {
                divisor = 100 + 9900 * (1000 + n) / (1000 + n ** 2);
            }
            const baseExponent = 999999 + calculateSigmoidExponential(49000001, n / 3000);
            const bonusExponent = 250 * n;
            const exponent = (baseExponent + bonusExponent) / divisor;
            const coinMult = Decimal.max(1, Decimal.pow(parseGameDataDecimal(data?.ants.crumbs), exponent));
            return {
                crumbToCoinExp: exponent,
                coinMultiplier: coinMult,
            };
        },
    },
    [AntUpgrades.Taxes]: {
        exemptFromCorruption: false,
        effect: (n: number) => ({
            taxReduction: 0.005 + 0.995 * Math.pow(0.99, n),
        }),
    },
    [AntUpgrades.AcceleratorBoosts]: {
        exemptFromCorruption: false,
        effect: (n: number) => ({
            acceleratorBoostMult: calculateSigmoidExponential(20, n / 1000),
        }),
    },
    [AntUpgrades.Multipliers]: {
        exemptFromCorruption: false,
        effect: (n: number) => ({
            multiplierMult: calculateSigmoidExponential(40, n / 1000),
        }),
    },
    [AntUpgrades.Offerings]: {
        exemptFromCorruption: false,
        effect: (n: number) => ({
            offeringMult: Math.pow(1 + n / 10, 0.5),
        }),
    },
    [AntUpgrades.BuildingCostScale]: {
        exemptFromCorruption: false,
        effect: (n: number) => {
            const scalePercent = 3 * n;
            const buildingPowerMult = 1 + n / 100;
            return {
                buildingCostScale: scalePercent / 100,
                buildingPowerMult,
            };
        },
    },
    [AntUpgrades.Salvage]: {
        exemptFromCorruption: false,
        effect: (n: number) => ({
            salvage: 120 * (1 - Math.pow(0.995, n)),
        }),
    },
    [AntUpgrades.FreeRunes]: {
        exemptFromCorruption: false,
        effect: (n: number) => ({
            freeRuneLevel: 3000 * (1 - Math.pow(1 - 1 / 3000, n)),
        }),
    },
    [AntUpgrades.Obtainium]: {
        exemptFromCorruption: false,
        effect: (n: number) => ({
            obtainiumMult: Math.pow(1 + n / 10, 0.5),
        }),
    },
    [AntUpgrades.AntSacrifice]: {
        exemptFromCorruption: false,
        effect: (n: number) => ({
            antSacrificeMultiplier: Math.pow(1 + n / 10, 0.5),
            elo: Math.round(5 * Math.min(200, n)),
        }),
    },
    [AntUpgrades.Mortuus]: {
        exemptFromCorruption: true,
        effect: (n: number) => ({
            talismanUnlock: n > 0,
            globalSpeed: 2 - Math.pow(0.99, n),
        }),
    },
    [AntUpgrades.AntELO]: {
        exemptFromCorruption: false,
        effect: (n: number) => {
            const data = api.getGameData();
            const antSacrificeLimitCount = n + 200 * Math.min(1, n);
            const upgradeImprover = Math.min(n, (api.achievement.AchRewards.antSpeed2UpgradeImprover() as number ?? 0));
            const effectiveSacs = Math.min(
                antSacrificeLimitCount + upgradeImprover,
                data?.ants.antSacrificeCount ?? 0 + upgradeImprover,
            );
            const antELO = effectiveSacs;
            return {
                antELO,
                antSacrificeLimitCount,
            };
        },
    },
    [AntUpgrades.Mortuus2]: {
        exemptFromCorruption: true,
        effect: (n: number) => ({
            talismanLevelIncreaser: Math.min(1200, Math.floor(n / 2)),
            talismanEffectBuff: 1 + 0.65 * (1 - Math.pow(0.999, n)) + 0.005 * Math.min(20, n),
            ascensionSpeed: 1 + 0.5 * (1 - Math.pow(0.996, n)),
        }),
    },
    [AntUpgrades.AscensionScore]: {
        exemptFromCorruption: true,
        effect: (n: number) => ({
            cubesBanked: Math.min(200, n) + Math.min(800, Math.max(0, n - 200) * 0.1)
                + Math.min(5000, Math.max(0, n - 8200) / 100),
        }),
    },
    [AntUpgrades.WowCubes]: {
        exemptFromCorruption: true,
        effect: (n: number) => ({
            wowCubes: 2 - Math.pow(0.999, n),
        }),
    },
});
