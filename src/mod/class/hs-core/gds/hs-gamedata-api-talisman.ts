import Decimal from "break_infinity.js";
import { HSGlobal } from "../hs-global";
import { parseGameDataDecimal } from "./hs-gamedata-utils";
import { AntUpgrades, CalculationCache, CalculationMode, RuneKeys, TalismanKeys, TalismanTypeMap, } from "../../../types/data-types/hs-gamedata-api-types";
import { TALISMAN_ACHIEVEMENT_EFFECT_INSCRIPT_VALUES, TALISMAN_CHRONOS_INSCRIPT_VALUES, TALISMAN_COOKIEGRANDMA_INSCRIPT_VALUES, TALISMAN_EXEMPTION_INSCRIPT_VALUES, TALISMAN_METAPHYSICS_INSCRIPT_VALUES, TALISMAN_MIDAS_INSCRIPT_VALUES, TALISMAN_MORTUUS_INSCRIPT_VALUES, TALISMAN_PLASTIC_INSCRIPT_VALUES, TALISMAN_POLYMATH_INSCRIPT_VALUES, TALISMAN_WOWSQUARE_INSCRIPT_VALUES, TALISMAN_HORSESHOE_INSCRIPT_VALUES, TALISMAN_BASE_COEFFICIENTS, TALISMAN_RARITY_VALUES, getTalismanBaseMult, getTalismanCostType, getTalismanExponentialRatio, getTalismanMaxLevel, talismanCostKeys, TalismanCostKey, regularCostProgressionDecimal, exponentialCostProgressionDecimal, } from "./hs-gamedata-tables";
import { HSLogger } from "../hs-logger";
import type { GameData, TalismanShards } from "../../../types/data-types/hs-player-savedata";
import type { HSGameDataAPI } from "./hs-gamedata-api";

/**
 * The fragments invested in a talisman: player.talismans, live since game commit 075dfeaa. Before it, the live player's
 * were only a copy the game made at each save (every 5 s), and the live ones were in the game's talismans object
 * (patcher: window.__HS_talismans, fragmentsInvested). A save's own are what that save holds.
 */
export const getTalismanFragments = (data: GameData, t: TalismanKeys): Readonly<TalismanShards> => {
    const live = window.__HS_talismans?.[t]?.fragmentsInvested;
    if (live && data === (HSGlobal.exposedPlayer as unknown)) return live;
    return data.talismans[t];
};

const TALISMAN_KEYS = Object.keys(TALISMAN_BASE_COEFFICIENTS) as TalismanKeys[];
const TALISMAN_RUNE_KEYS = TALISMAN_KEYS.length > 0
    ? Object.keys(TALISMAN_BASE_COEFFICIENTS[TALISMAN_KEYS[0]]) as RuneKeys[]
    : [] as RuneKeys[];

/**
 * Class: TalismanHelper
 * IsExplicitHSModule: No
 * Description:
 *     Talismans: levels, rarities, effects and the rune bonuses they give.
 * Author: Shewchou
 */
export class TalismanHelper {
    #lastCacheGeneration?: number
    readonly #talismanLevelCache = new Map<TalismanKeys, number>()
    readonly #talismanRarityCache = new Map<TalismanKeys, number>()
    readonly #talismanUnlockedCache = new Map<TalismanKeys, boolean>()
    readonly #talismanEffectsCache = new Map<TalismanKeys, Map<number, unknown>>()
    #allRuneBonusesCache?: Record<RuneKeys, number>
    // Not cleared with the caches above: see #getTalismanLevel
    readonly #replayedLevels = new Map<TalismanKeys, { key: string; level: number }>()
    #statsComputed = false
    readonly #api: HSGameDataAPI;

    constructor(api: HSGameDataAPI) {
        this.#api = api;
    }

    #clearCachesIfGameDataChanged(): void {
        const generation = this.#api.getCacheGeneration();
        if (generation !== this.#lastCacheGeneration) {
            this.#lastCacheGeneration = generation;
            this.#talismanLevelCache.clear();
            this.#talismanRarityCache.clear();
            this.#talismanUnlockedCache.clear();
            this.#talismanEffectsCache.clear();
            this.#allRuneBonusesCache = undefined;
            this.#statsComputed = false;
        }
    }

    #getTalismanKeys(): TalismanKeys[] {
        const data = this.#api.getGameData();
        if (!data) return [];
        return Object.keys(data.talismans) as TalismanKeys[];
    }

    #calculateTalismanRarityFromLevel(t: TalismanKeys, level: number, unlocked: boolean): number {
        if (!unlocked) return 0;

        const maxLevel = getTalismanMaxLevel(t);
        const levelRatio = level / maxLevel;
        let extraRarity = 0;
        if (levelRatio >= 1) {
            if (levelRatio >= 2) extraRarity += 1;
            if (levelRatio >= 4) extraRarity += 1;
            if (levelRatio >= 8) extraRarity += 1;
        }

        return 1 + Math.min(6, Math.floor(6 * levelRatio)) + extraRarity;
    }

    /**
     * The live player's level is the game's own. A save holds only the fragments invested, from which the levels are
     * replayed: tens of ms for all talismans at each data update, so each result is kept until its fragments or cap change.
     */
    #getTalismanLevel(t: TalismanKeys): number {
        const data = this.#api.getGameData();
        if (!data) return 0;

        const live = window.__HS_talismans;
        if (live && data === (HSGlobal.exposedPlayer as unknown)) return live[t].level;

        const shards = getTalismanFragments(data, t);
        const budget: Record<TalismanCostKey, Decimal> = {
            shard: parseGameDataDecimal(shards.shard),
            commonFragment: parseGameDataDecimal(shards.commonFragment),
            uncommonFragment: parseGameDataDecimal(shards.uncommonFragment),
            rareFragment: parseGameDataDecimal(shards.rareFragment),
            epicFragment: parseGameDataDecimal(shards.epicFragment),
            legendaryFragment: parseGameDataDecimal(shards.legendaryFragment),
            mythicalFragment: parseGameDataDecimal(shards.mythicalFragment),
        };
        const cap = getTalismanLevelCap(t, this.#api);

        let key = String(cap);
        for (const item of talismanCostKeys) key += `|${budget[item].mantissa},${budget[item].exponent}`;

        const kept = this.#replayedLevels.get(t);
        if (kept?.key === key) return kept.level;

        const level = replayTalismanLevel(t, budget, cap);
        this.#replayedLevels.set(t, { key, level });
        return level;
    }

    #computeAllTalismanStats(): void {
        // Before the early return: stats computed from an older save must not be kept
        this.#clearCachesIfGameDataChanged();
        if (this.#statsComputed) return;

        const keys = this.#getTalismanKeys();
        for (const key of keys) {
            const unlocked = isTalismanUnlocked(key, this.#api);
            this.#talismanUnlockedCache.set(key, unlocked);
        }

        for (const key of keys) {
            const level = this.#getTalismanLevel(key);
            this.#talismanLevelCache.set(key, level);
        }

        for (const key of keys) {
            const level = this.#talismanLevelCache.get(key) ?? 0;
            const unlocked = this.#talismanUnlockedCache.get(key) ?? false;
            const rarity = this.#calculateTalismanRarityFromLevel(key, level, unlocked);
            this.#talismanRarityCache.set(key, rarity);
        }

        this.#statsComputed = true;
    }

    #computeAllRuneBonuses(mode: CalculationMode = 'normal'): Record<RuneKeys, number> {
        this.#computeAllTalismanStats();
        if (mode === 'normal' && this.#allRuneBonusesCache) return this.#allRuneBonusesCache;

        const totalBonuses = TALISMAN_RUNE_KEYS.reduce((acc, rune) => {
            acc[rune] = 0;
            return acc;
        }, {} as Record<RuneKeys, number>);

        for (const talisman of TALISMAN_KEYS) {
            const level = this.#talismanLevelCache.get(talisman) ?? 0;
            const rarity = this.#talismanRarityCache.get(talisman) ?? 0;
            if (rarity === 0) continue;

            let bonusMult = 1;
            if (talisman === 'metaphysics') {
                const effects = this.getTalismanEffects('metaphysics', rarity);
                bonusMult *= effects.talismanEffect;
                bonusMult *= effects.extraTalismanEffect;
            }
            if (talisman === 'mortuus') {
                bonusMult *= this.#api.antUpgrade.getAntUpgradeEffectValue(AntUpgrades.Mortuus2, 'talismanEffectBuff');
            }

            const rarityValue = TALISMAN_RARITY_VALUES[rarity] ?? 0;
            const talismanMultiplier = level * rarityValue * bonusMult;

            for (const rune of TALISMAN_RUNE_KEYS) {
                const coef = TALISMAN_BASE_COEFFICIENTS[talisman][rune];
                totalBonuses[rune] += coef * talismanMultiplier;
            }
        }

        const specialMultiplier = this.allTalismanRuneBonusStatsSum(mode);
        for (const rune of TALISMAN_RUNE_KEYS) {
            totalBonuses[rune] *= specialMultiplier;
        }

        if (mode === 'normal') this.#allRuneBonusesCache = totalBonuses;
        return totalBonuses;
    }

    allTalismanRuneBonusStatsSum = (mode: CalculationMode = 'normal'): number => {
        this.#clearCachesIfGameDataChanged();
        const data = this.#api.getGameData();
        const cacheName = 'AllTalismanRuneBonusStatsSum' as keyof CalculationCache;
        const calculationVars = [
            data?.researches?.[106] ?? 0,
            data?.researches?.[107] ?? 0,
            data?.researches?.[118] ?? 0,
            data?.researches?.[200] ?? 0,
            data?.cubeUpgrades?.[50] ?? 0,
            Number(this.#api.achievement.AchRewards.talismanPower() ?? 0),
            this.#api.calculateChallenge15Reward('talismanBonus') ?? 0,
            this.#api.goldenQuark.getGQUpgradeEffect('singTalismanBonusRunes1') ?? 0,
            this.#api.goldenQuark.getGQUpgradeEffect('singTalismanBonusRunes2') ?? 0,
            this.#api.goldenQuark.getGQUpgradeEffect('singTalismanBonusRunes3') ?? 0,
            this.#api.goldenQuark.getGQUpgradeEffect('singTalismanBonusRunes4') ?? 0,
            this.#api.ambrosia.getAmbrosiaUpgradeEffects('ambrosiaTalismanBonusRuneLevel', mode).talismanBonusRuneLevel ?? 0,
            this.#api.getSingularityChallengeEffect('taxmanLastStand', 'talismanRuneEffect') ?? 0,
        ];

        if (mode !== 'normal') return allTalismanRuneBonusStatsSum(this.#api, mode);
        return this.#api.memoizeCalculation(cacheName, calculationVars, () => allTalismanRuneBonusStatsSum(this.#api, mode));
    }

    getTalismanEffects = <K extends TalismanKeys>(t: K, rarity?: number): TalismanTypeMap[K] => {
        this.#computeAllTalismanStats();
        const actualRarity = rarity === undefined ? this.getTalismanRarity(t) : rarity;
        let rarityCache = this.#talismanEffectsCache.get(t);
        if (!rarityCache) {
            rarityCache = new Map<number, unknown>();
            this.#talismanEffectsCache.set(t, rarityCache);
        }

        if (rarityCache.has(actualRarity)) {
            return rarityCache.get(actualRarity) as TalismanTypeMap[K];
        }

        const result = getTalismanEffects(t, actualRarity);
        rarityCache.set(actualRarity, result);
        return result;
    }

    getTalismanRarity = (t: TalismanKeys): number => {
        this.#computeAllTalismanStats();
        return this.#talismanRarityCache.get(t) ?? 0;
    }

    calculateTalismanRarityTotal = (): number => {
        this.#computeAllTalismanStats();
        return Array.from(this.#talismanRarityCache.values()).reduce((sum, rarity) => sum + rarity, 0);
    }

    getRuneBonusFromAllTalismansBatch = (mode: CalculationMode = 'normal'): Record<RuneKeys, number> => {
        this.#computeAllTalismanStats();
        return this.#computeAllRuneBonuses(mode);
    }

    getRuneBonusFromAllTalismans = (rune: RuneKeys, mode: CalculationMode = 'normal'): number => {
        this.#computeAllTalismanStats();
        const bonuses = this.#computeAllRuneBonuses(mode);
        return bonuses[rune] ?? 0;
    }
}

const allTalismanRuneBonusStatsSum = (api: HSGameDataAPI, mode: CalculationMode = 'normal'): number => {
    const data = api.getGameData();
    if (!data) return 0;

    const taxmanTalismanRuneEffect = api.getSingularityChallengeEffect('taxmanLastStand', 'talismanRuneEffect');
    const talismanPowerAchievement = Number(api.achievement.AchRewards.talismanPower() ?? 0);
    const research5x6 = Number(data.researches[106] ?? 0) / 1000;
    const research5x7 = Number(data.researches[107] ?? 0) / 1000;
    const research5x18 = 2 * Number(data.researches[118] ?? 0) / 1000;
    const research8x25 = 0.004 * Math.floor(Number(data.researches[200] ?? 0) / 10000);
    const cube5x10 = 0.006 * Math.floor(Number(data.cubeUpgrades[50] ?? 0) / 10000);
    const challenge15TalismanBonus = (api.calculateChallenge15Reward('talismanBonus') ?? 0) - 1;
    const gqTalismanBonus1 = api.goldenQuark.getGQUpgradeEffect('singTalismanBonusRunes1') ?? 0;
    const gqTalismanBonus2 = api.goldenQuark.getGQUpgradeEffect('singTalismanBonusRunes2') ?? 0;
    const gqTalismanBonus3 = api.goldenQuark.getGQUpgradeEffect('singTalismanBonusRunes3') ?? 0;
    const gqTalismanBonus4 = api.goldenQuark.getGQUpgradeEffect('singTalismanBonusRunes4') ?? 0;
    const ambrosiaTalismanBonus = api.ambrosia.getAmbrosiaUpgradeEffects('ambrosiaTalismanBonusRuneLevel', mode).talismanBonusRuneLevel ?? 0;
    const taxmanTalismanEffect = taxmanTalismanRuneEffect ?? 0;

    const total = (
        1
        + talismanPowerAchievement
        + research5x6
        + research5x7
        + research5x18
        + research8x25
        + cube5x10
        + challenge15TalismanBonus
        + gqTalismanBonus1
        + gqTalismanBonus2
        + gqTalismanBonus3
        + gqTalismanBonus4
        + ambrosiaTalismanBonus
        + taxmanTalismanEffect
    );

    if (!Number.isFinite(total) || Number.isNaN(total)) { HSLogger.errorOnce(`<red>Invalid talisman power sum</red>`, "GameDataAPI-Talisman"); return 0; }


    return total;
};

const getTalismanEffects = <K extends TalismanKeys>(
    t: K,
    rarity: number,
): TalismanTypeMap[K] => {
    const rarityIndex = Math.max(0, Math.min(10, rarity));

    switch (t) {
        case 'exemption':
            return {
                taxReduction: TALISMAN_EXEMPTION_INSCRIPT_VALUES[rarityIndex] ?? 0,
                duplicationOOMBonus: rarityIndex >= 6 ? 12 : 0,
            } as TalismanTypeMap[K];
        case 'chronos':
            return {
                globalSpeed: TALISMAN_CHRONOS_INSCRIPT_VALUES[rarityIndex] ?? 1,
                speedOOMBonus: rarityIndex >= 6 ? 12 : 0,
            } as TalismanTypeMap[K];
        case 'midas':
            return {
                blessingBonus: TALISMAN_MIDAS_INSCRIPT_VALUES[rarityIndex] ?? 1,
                thriftOOMBonus: rarityIndex >= 6 ? 12 : 0,
            } as TalismanTypeMap[K];
        case 'metaphysics':
            return {
                talismanEffect: TALISMAN_METAPHYSICS_INSCRIPT_VALUES[rarityIndex] ?? 1,
                extraTalismanEffect: rarityIndex >= 6 ? 1.07 : 1,
            } as TalismanTypeMap[K];
        case 'polymath':
            return {
                ascensionSpeedBonus: TALISMAN_POLYMATH_INSCRIPT_VALUES[rarityIndex] ?? 1,
                SIOOMBonus: rarityIndex >= 6 ? 12 : 0,
            } as TalismanTypeMap[K];
        case 'mortuus':
            return {
                antBonus: TALISMAN_MORTUUS_INSCRIPT_VALUES[rarityIndex] ?? 1,
                prismOOMBonus: rarityIndex >= 6 ? 12 : 0,
            } as TalismanTypeMap[K];
        case 'plastic':
            return {
                quarkBonus: TALISMAN_PLASTIC_INSCRIPT_VALUES[rarityIndex] ?? 1,
            } as TalismanTypeMap[K];
        case 'wowSquare':
            return {
                evenDimBonus: TALISMAN_WOWSQUARE_INSCRIPT_VALUES[rarityIndex] ?? 1,
                oddDimBonus: rarityIndex >= 6 ? 1.20 : 1,
            } as TalismanTypeMap[K];
        case 'achievement':
            return {
                positiveSalvageMult: TALISMAN_ACHIEVEMENT_EFFECT_INSCRIPT_VALUES[rarityIndex] ?? 0,
                negativeSalvageMult: rarityIndex >= 6 ? -0.02 : 0,
            } as TalismanTypeMap[K];
        case 'purpleGem':
            return {
                purpleHoneyLuck: [0, 1, 2, 3, 4, 5, 6, 10, 20, 30, 40][rarityIndex] ?? 0,
                purpleAmbrosiaDiscount: rarityIndex >= 6 ? 0.80 : 1,
            } as TalismanTypeMap[K];
        case 'cookieGrandma':
            return {
                freeCorruptionLevel: TALISMAN_COOKIEGRANDMA_INSCRIPT_VALUES[rarityIndex] ?? 0,
                cookieSix: rarityIndex >= 6,
            } as TalismanTypeMap[K];
        case 'horseShoe':
            return {
                luckPercentage: TALISMAN_HORSESHOE_INSCRIPT_VALUES[rarityIndex] ?? 0,
                redLuck: rarityIndex >= 6 ? 40 : 0,
            } as TalismanTypeMap[K];
        default:
            throw new Error(`Unknown talisman key: ${t}`);
    }
};

const replayTalismanLevel = (t: TalismanKeys, budget: Record<TalismanCostKey, Decimal>, cap: number): number => {
    let level = 0;
    const baseMult = getTalismanBaseMult(t);
    const costType = getTalismanCostType(t);
    const smallBufferMult = new Decimal(1.0001);

    while (level < cap) {
        const costs = costType === 'regular'
            ? regularCostProgressionDecimal(baseMult, level)
            : exponentialCostProgressionDecimal(baseMult, level, getTalismanExponentialRatio(t));

        let canAfford = true;

        for (const item of talismanCostKeys) {
            const cost = costs[item];
            if (cost.gt(budget[item].times(smallBufferMult))) {
                canAfford = false;
                break;
            }
        }

        if (!canAfford) break;

        for (const item of talismanCostKeys) {
            budget[item] = budget[item].minus(costs[item]);
        }

        level++;
    }

    return level;
};

const getTalismanLevelCap = (t: TalismanKeys, api: HSGameDataAPI): number => {
    const baseMax = getTalismanMaxLevel(t);
    let increase = 0;

    if (t !== 'achievement') {
        increase += universalTalismanMaxLevelIncreasers(api);
    }

    switch (t) {
        case 'metaphysics':
            increase += (api.getGameData()?.cubeUpgrades[67] ?? 0) > 0 ? 1337 : 0;
            break;
        case 'mortuus':
            increase += api.antUpgrade.getAntUpgradeEffectValue(AntUpgrades.Mortuus2, 'talismanLevelIncreaser');
            break;
        case 'plastic':
            increase += api.getPCoinUpgradeLevel('INSTANT_UNLOCK_1') ? 10 : 0;
            break;
        case 'achievement':
            increase += api.getLevelMilestone('achievementTalismanEnhancement');
            break;
        case 'purpleGem':
            increase += 54;
            break;
        case 'cookieGrandma':
            increase += 54;
            break;
        case 'horseShoe':
            increase += 88;
            break;
    }

    return baseMax + increase;
};

const universalTalismanMaxLevelIncreasers = (api: HSGameDataAPI): number => {
    const data = api.getGameData();
    if (!data) return 0;

    const taxmanTalismanFreeLevel = api.getSingularityChallengeEffect('taxmanLastStand', 'talismanFreeLevel');
    return (
        6 * data.challengecompletions[13]
        + Math.floor((data.researches[200] ?? 0) / 400)
        + taxmanTalismanFreeLevel
        + (api.octeract.getOcteractUpgradeEffect('octeractTalismanLevelCap1') as number)
        + (api.octeract.getOcteractUpgradeEffect('octeractTalismanLevelCap2') as number)
        + (api.octeract.getOcteractUpgradeEffect('octeractTalismanLevelCap3') as number)
        + (api.octeract.getOcteractUpgradeEffect('octeractTalismanLevelCap4') as number)
    );
};

const isTalismanUnlocked = (t: TalismanKeys, api: HSGameDataAPI): boolean => {
    const data = api.getGameData();
    if (!data) return false;

    switch (t) {
        case 'exemption': {
            const exposedPlayer = HSGlobal.exposedPlayer ?? null;
            return exposedPlayer
                ? exposedPlayer.unlocks.talismans
                : data.unlocks.rrow1;
        }
        case 'chronos':
            return Boolean(api.achievement.AchRewards.chronosTalisman());
        case 'midas':
            return Boolean(api.achievement.AchRewards.midasTalisman());
        case 'metaphysics':
            return Boolean(api.achievement.AchRewards.metaphysicsTalisman());
        case 'polymath':
            return Boolean(api.achievement.AchRewards.polymathTalisman());
        case 'mortuus':
            return api.antUpgrade.getAntUpgradeEffectValue(AntUpgrades.Mortuus, 'talismanUnlock');
        case 'plastic':
            return api.quarkShop.getShopUpgradeEffects('shopTalisman', 'unlocked') as boolean;
        case 'wowSquare': {
            const exposedPlayer = HSGlobal.exposedPlayer ?? null;
            return exposedPlayer
                ? exposedPlayer.ascensionCount >= 100
                : data.challengecompletions[11] >= 1;
        }
        case 'achievement':
            return api.getLevelMilestone('achievementTalismanUnlock') === 1;
        case 'purpleGem':
            return Boolean(api.getSingularityChallengeEffect('taxmanLastStand', 'talismanUnlock'));
        case 'cookieGrandma':
            return (data.cubeUpgrades[80] ?? 0) > 0;
        case 'horseShoe':
            return Boolean(api.purple.getPurpleAmbrosiaUpgradeEffects('capricorn', 'horseshoeTalismanUnlocked'));
        default:
            return false;
    }
};
