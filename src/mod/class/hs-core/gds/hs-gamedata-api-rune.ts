import Decimal from "break_infinity.js";
import { parseGameDataDecimal } from "./hs-gamedata-utils";
import { AntUpgrades } from "../../../types/data-types/hs-gamedata-api-types";
import { RUNE_KEYS } from "./hs-gamedata-tables";
import type { GameData } from "../../../types/data-types/hs-player-savedata";
import type { CalculationCache, CalculationMode, RuneKeys, RuneTypeMap } from "../../../types/data-types/hs-gamedata-api-types";
import type { HSGameDataAPI } from "./hs-gamedata-api";

const RUNE_KEY_INDEX = new Map<RuneKeys, number>(RUNE_KEYS.map((rune, index) => [rune, index]))

/**
 * Class: RuneHelper
 * IsExplicitHSModule: No
 * Description:
 *     Runes: levels from EXP, free and effective levels, levels per order of magnitude, effects and effectiveness.
 * Author: Shewchou
 */
export class RuneHelper {
    readonly #api: HSGameDataAPI;
    #lastCacheGeneration?: number;
    readonly #runeEffectsCache = new Map<RuneKeys, Map<number, unknown>>();
    readonly #runeEffectiveLevelCache = new Map<RuneKeys, number>();
    readonly #runeFreeLevelsCache = new Map<RuneKeys, number>();
    readonly #costLog10Cache = new Map<RuneKeys, number>();
    readonly #levelsPerOOMIncreaseCache = new Map<RuneKeys, number>();
    readonly #levelsPerOOMCache = new Map<RuneKeys, number>();
    readonly #levelsPerOOMModeCache = new Map<string, number>();
    #totalRuneLevelsCache?: number;

    constructor(api: HSGameDataAPI) {
        this.#api = api;
        for (const rune of RUNE_KEYS) {
            this.#costLog10Cache.set(rune, this.runes[rune].costCoefficient.log10());
        }
    }

    #clearCachesIfGameDataChanged(): void {
        const generation = this.#api.getCacheGeneration();
        if (generation !== this.#lastCacheGeneration) {
            this.#lastCacheGeneration = generation;
            this.#runeEffectsCache.clear();
            this.#runeEffectiveLevelCache.clear();
            this.#runeFreeLevelsCache.clear();
            this.#levelsPerOOMIncreaseCache.clear();
            this.#levelsPerOOMCache.clear();
            this.#levelsPerOOMModeCache.clear();
            this.#totalRuneLevelsCache = undefined;
        }
    }

    public readonly runes: Record<RuneKeys, {
        ignoreChal9: boolean
        costCoefficient: Decimal
        levelsPerOOM: number
        levelsPerOOMIncrease: () => number
        effects: (level: number, key?: string) => unknown
        effectiveLevelMult: () => number
        freeLevels: () => number
        runeEXPPerOffering: (purchasedLevels: number) => Decimal
        isUnlocked: (data?: GameData) => boolean
    }> = {
        speed: {
            ignoreChal9: false,
            costCoefficient: new Decimal(50),
            levelsPerOOM: 150,
            levelsPerOOMIncrease: () => {
                const data = this.#api.getGameData();
                return (
                    (data?.challengecompletions?.[2] ?? 0)
                    + (data?.upgrades[66] ?? 0) * 2
                    + (data?.researches[78] ?? 0)
                    + (data?.researches[111] ?? 0)
                    + (data?.challengecompletions?.[11] ?? 0)
                    + 1.5 * (data?.challengecompletions?.[14] ?? 0)
                    + (data?.cubeUpgrades[16] ?? 0)
                    + this.#api.talisman.getTalismanEffects('chronos').speedOOMBonus
                    + this.#api.ambrosia.getAmbrosiaUpgradeEffects('ambrosiaRuneOOMBonus').runeOOMBonus
                    + this.#api.getLevelMilestone('speedRune')
                );
            },
            effects: (n: number) => {
                const acceleratorPower = 0.0002 * n
                const multiplicativeAccelerators = 1 + n / 400
                const globalSpeed = 2 - Math.exp(-Math.cbrt(n) / 100)
                return {
                    acceleratorPower,
                    multiplicativeAccelerators,
                    globalSpeed,
                }
            },
            effectiveLevelMult: () => this.#api.firstFiveEffectiveRuneLevelMult(),
            freeLevels: () => this.#api.firstFiveFreeLevels() + this.#api.getRuneBonusLevels('speed'),
            runeEXPPerOffering: (purchasedLevels: number) => this.firstFiveRuneEXPMult(purchasedLevels),
            isUnlocked: () => true,
        },
        duplication: {
            ignoreChal9: false,
            costCoefficient: new Decimal(20000),
            levelsPerOOM: 120,
            levelsPerOOMIncrease: () => {
                const data = this.#api.getGameData();
                return (
                    0.8 * (data?.challengecompletions?.[1] ?? 0)
                    + (data?.upgrades[66] ?? 0) * 2
                    + (data?.researches[90] ?? 0)
                    + (data?.researches[112] ?? 0)
                    + (data?.challengecompletions?.[11] ?? 0)
                    + 1.5 * (data?.challengecompletions?.[14] ?? 0)
                    + this.#api.talisman.getTalismanEffects('exemption').duplicationOOMBonus
                    + this.#api.ambrosia.getAmbrosiaUpgradeEffects('ambrosiaRuneOOMBonus').runeOOMBonus
                    + this.#api.getLevelMilestone('duplicationRune')
                );
            },
            effects: (n: number) => {
                const multiplierBoosts = n / 5
                const multiplicativeMultipliers = 1 + n / 400
                const taxReduction = 0.001 + 0.999 * Math.exp(-Math.cbrt(n) / 5)
                return {
                    multiplierBoosts,
                    multiplicativeMultipliers,
                    taxReduction,
                }
            },
            effectiveLevelMult: () => this.#api.firstFiveEffectiveRuneLevelMult(),
            freeLevels: () => this.#api.firstFiveFreeLevels() + this.#api.getRuneBonusLevels('duplication'),
            runeEXPPerOffering: (purchasedLevels: number) => this.firstFiveRuneEXPMult(purchasedLevels),
            isUnlocked: () => Boolean(this.#api.achievement.AchRewards.duplicationRuneUnlock()),
        },
        prism: {
            ignoreChal9: false,
            costCoefficient: new Decimal('5e5'),
            levelsPerOOM: 90,
            levelsPerOOMIncrease: () => {
                const data = this.#api.getGameData();
                return (
                    0.6 * (data?.challengecompletions?.[3] ?? 0)
                    + (data?.upgrades[66] ?? 0) * 2
                    + (data?.researches[79] ?? 0)
                    + (data?.researches[113] ?? 0)
                    + (data?.challengecompletions?.[11] ?? 0)
                    + 1.5 * (data?.challengecompletions?.[14] ?? 0)
                    + (data?.cubeUpgrades[16] ?? 0)
                    + this.#api.talisman.getTalismanEffects('mortuus').prismOOMBonus
                    + this.#api.ambrosia.getAmbrosiaUpgradeEffects('ambrosiaRuneOOMBonus').runeOOMBonus
                    + this.#api.getLevelMilestone('prismRune')
                );
            },
            effects: (level: number) => {
                const productionLog10 = Math.max(0, 2 * Math.log10(1 + level / 2) + (level / 2) * Math.log10(2) - Math.log10(256))
                const costDivisorLog10 = Math.floor(level / 10)
                return {
                    productionLog10,
                    costDivisorLog10,
                }
            },
            effectiveLevelMult: () => this.#api.firstFiveEffectiveRuneLevelMult(),
            freeLevels: () => this.#api.firstFiveFreeLevels() + this.#api.getRuneBonusLevels('prism'),
            runeEXPPerOffering: (purchasedLevels: number) => this.firstFiveRuneEXPMult(purchasedLevels),
            isUnlocked: () => Boolean(this.#api.achievement.AchRewards.prismRuneUnlock()),
        },
        thrift: {
            ignoreChal9: false,
            costCoefficient: new Decimal('2.5e7'),
            levelsPerOOM: 60,
            levelsPerOOMIncrease: () => {
                const data = this.#api.getGameData();
                return (
                    0.4 * (data?.challengecompletions?.[4] ?? 0)
                    + (data?.upgrades[66] ?? 0) * 2
                    + (data?.researches[77] ?? 0)
                    + (data?.researches[114] ?? 0)
                    + (data?.challengecompletions?.[11] ?? 0)
                    + 1.5 * (data?.challengecompletions?.[14] ?? 0)
                    + (data?.cubeUpgrades[37] ?? 0)
                    + this.#api.talisman.getTalismanEffects('midas').thriftOOMBonus
                    + this.#api.ambrosia.getAmbrosiaUpgradeEffects('ambrosiaRuneOOMBonus').runeOOMBonus
                    + this.#api.getLevelMilestone('thriftRune')
                );
            },
            effects: (level: number) => {
                // SynergismOfficial/src/Runes.ts runeConstructionEffect
                const construction = level > 0 ? 0.03 * Math.pow(1 + Math.log(1 + level), 2) : 0
                const salvage = 2.5 * Math.log(1 + level / 10)
                const taxReduction = 0.01 + 0.99 * Math.exp(-Math.cbrt(level) / 10)
                return {
                    construction,
                    salvage,
                    taxReduction,
                }
            },
            effectiveLevelMult: () => this.#api.firstFiveEffectiveRuneLevelMult(),
            freeLevels: () => this.#api.firstFiveFreeLevels() + this.#api.getRuneBonusLevels('thrift'),
            runeEXPPerOffering: (purchasedLevels: number) => this.firstFiveRuneEXPMult(purchasedLevels),
            isUnlocked: () => Boolean(this.#api.achievement.AchRewards.thriftRuneUnlock()),
        },
        superiorIntellect: {
            ignoreChal9: false,
            costCoefficient: new Decimal('1e12'),
            levelsPerOOM: 30,
            levelsPerOOMIncrease: () => {
                const data = this.#api.getGameData();
                return (
                    0.2 * (data?.challengecompletions?.[5] ?? 0)
                    + (data?.upgrades[66] ?? 0) * 2
                    + (data?.researches[115] ?? 0)
                    + (data?.challengecompletions?.[11] ?? 0)
                    + 1.5 * (data?.challengecompletions?.[14] ?? 0)
                    + (data?.cubeUpgrades[37] ?? 0)
                    + this.#api.talisman.getTalismanEffects('polymath').SIOOMBonus
                    + this.#api.ambrosia.getAmbrosiaUpgradeEffects('ambrosiaRuneOOMBonus').runeOOMBonus
                    + this.#api.getLevelMilestone('SIRune')
                );
            },
            effects: (level: number) => {
                const offeringMult = 1 + level / 2000
                const obtainiumMult = 1 + level / 200
                const antSpeed = Math.pow(1 + level / 500, 2)
                return {
                    offeringMult,
                    obtainiumMult,
                    antSpeed,
                }
            },
            effectiveLevelMult: () => this.#api.firstFiveEffectiveRuneLevelMult() * this.SIEffectiveRuneLevelMult(),
            freeLevels: () => this.#api.firstFiveFreeLevels() + this.#api.getRuneBonusLevels('superiorIntellect'),
            runeEXPPerOffering: (purchasedLevels: number) => this.firstFiveRuneEXPMult(purchasedLevels),
            isUnlocked: (data?: GameData) => Boolean((data?.researches?.[82] ?? 0) > 0),
        },
        infiniteAscent: {
            ignoreChal9: true,
            costCoefficient: new Decimal('1e75'),
            levelsPerOOM: 1 / 2,
            levelsPerOOMIncrease: () => this.#api.ambrosia.getAmbrosiaUpgradeEffects('ambrosiaRuneOOMBonus').infiniteAscentOOMBonus,
            effects: (level: number) => {
                const quarkMult = 1 + level / 500 + (level > 0 ? 0.1 : 0)
                const cubeMult = 1 + level / 100

                const salvagePerkLevels = [30, 40, 61, 81, 111, 131, 161, 191, 236, 260]
                const salvageCoefficient = 0.025 * salvagePerkLevels.filter((x) => x <= (this.#api.getGameData()?.highestSingularityCount ?? 0)).length
                const salvage = salvageCoefficient * level

                return {
                    quarkMult,
                    cubeMult,
                    salvage,
                }
            },
            effectiveLevelMult: () => 1,
            freeLevels: () => this.#api.getRuneBonusLevels('infiniteAscent'),
            runeEXPPerOffering: (purchasedLevels: number) => this.universalRuneEXPMult(purchasedLevels),
            isUnlocked: () => Boolean(this.#api.quarkShop.getShopUpgradeEffects('infiniteAscent', 'runeUnlocked')),
        },
        antiquities: {
            ignoreChal9: true,
            costCoefficient: new Decimal('1e206'),
            levelsPerOOM: 1 / 50,
            levelsPerOOMIncrease: () => this.#api.purple.getPurpleAmbrosiaUpgradeEffects('capricorn', 'antiquitiesOfAntGodCoefficient'),
            effects: (level: number, key?: string) => {
                if (key === 'addCodeCooldownReduction') {
                    return level > 0 ? 0.8 - 0.3 * (level - 1) / (level + 10) : 1
                } else if (key === 'offeringLog10' || key === 'obtainiumLog10') {
                    return Math.round(300 * (1 - Math.pow(1 - 1 / 300, level)))
                } else {
                    return level > 0 ? Math.pow(1.01, Math.min(5, level) * (this.#api.getGameData()?.singularityCount ?? 0)) : 1
                }
            },
            effectiveLevelMult: () => 1,
            freeLevels: () => this.#api.getRuneBonusLevels('antiquities'),
            runeEXPPerOffering: (purchasedLevels: number) => this.universalRuneEXPMult(purchasedLevels),
            isUnlocked: () => Boolean((this.#api.getGameData()?.platonicUpgrades[20] ?? 0) > 0),
        },
        horseShoe: {
            ignoreChal9: true,
            costCoefficient: new Decimal('1e500'),
            levelsPerOOM: 1 / 20,
            levelsPerOOMIncrease: () => this.#api.purple.getPurpleAmbrosiaUpgradeEffects('sagittarius', 'horseShoeRuneCoefficient'),
            effects: (level: number) => {
                const ambrosiaLuck = 2 * level
                const redLuck = 2 * level / 5
                const purpleHoneyLuck = level / 5
                return {
                    ambrosiaLuck,
                    redLuck,
                    purpleHoneyLuck,
                }
            },
            effectiveLevelMult: () => 1,
            freeLevels: () => this.#api.getRuneBonusLevels('horseShoe'),
            runeEXPPerOffering: (purchasedLevels: number) => this.universalRuneEXPMult(purchasedLevels),
            isUnlocked: () => Boolean(this.#api.purple.getPurpleAmbrosiaUpgradeEffects('sagittarius', 'horseshoeRuneUnlocked')),
        },
        finiteDescent: {
            ignoreChal9: true,
            costCoefficient: new Decimal('1e-40'),
            levelsPerOOM: 0.1,
            levelsPerOOMIncrease: () => 0,
            effects: (level: number) => {
                const cubesBanked = level >= 1 ? Math.round(40 + 960 * (level - 1) / (level + 25)) : 0
                const corruptionFreeLevels = 0.01 * Math.min(level, 100)
                const infiniteAscentFreeLevel = Math.floor(level / 2)
                return {
                    cubesBanked,
                    corruptionFreeLevels,
                    infiniteAscentFreeLevel,
                }
            },
            effectiveLevelMult: () => 1,
            freeLevels: () => 0,
            runeEXPPerOffering: (purchasedLevels: number) => this.universalRuneEXPMult(purchasedLevels),
            isUnlocked: () => this.#api.quarkShop.getShopLevel('shopSadisticRune') > 0,
        },
        topHat: {
            ignoreChal9: false,
            costCoefficient: new Decimal(1),
            levelsPerOOM: 1,
            levelsPerOOMIncrease: () => 0,
            effects: (level: number) => {
                return {
                    freeOfferingLevels: Math.round(200 * (1 - Math.pow(0.995, level))) / 10,
                    freeObtainiumLevels: Math.round(200 * (1 - Math.pow(0.995, level))) / 10,
                    freeCubeLevels: Math.round(150 * (1 - Math.pow(0.997, level))) / 10,
                    freeSpeedLevels: Math.round(150 * (1 - Math.pow(0.997, level))) / 10,
                    freeInfinityLevels: Math.round(100 * (1 - Math.pow(0.999, level))) / 10,
                }
            },
            effectiveLevelMult: () => 1,
            freeLevels: () => 0,
            runeEXPPerOffering: (purchasedLevels: number) => this.universalRuneEXPMult(purchasedLevels),
            isUnlocked: () => Boolean(this.#api.getSingularityChallengeEffect('noQuarkUpgrades', 'topHatUnlock')),
        },
    }

    public getRuneEffects = <T extends RuneKeys>(rune: T): RuneTypeMap[T] => {
        this.#clearCachesIfGameDataChanged();

        const effectiveLevel = this.getRuneEffectiveLevel(rune);
        let runeCache = this.#runeEffectsCache.get(rune);
        if (!runeCache) {
            runeCache = new Map<number, unknown>();
            this.#runeEffectsCache.set(rune, runeCache);
        }

        if (runeCache.has(effectiveLevel)) {
            return runeCache.get(effectiveLevel) as RuneTypeMap[T];
        }

        const result = this.runes[rune].effects(effectiveLevel) as RuneTypeMap[T];
        runeCache.set(effectiveLevel, result);
        return result;
    }

    public getRuneFreeLevels = (rune: RuneKeys): number => {
        this.#clearCachesIfGameDataChanged();
        const cached = this.#runeFreeLevelsCache.get(rune);
        if (cached !== undefined) {
            return cached;
        }

        const result = this.runes[rune].freeLevels();
        this.#runeFreeLevelsCache.set(rune, result);
        return result;
    }

    public getLevelsPerOOM = (rune: RuneKeys, mode: CalculationMode = 'normal'): number => {
        this.#clearCachesIfGameDataChanged();
        if (mode !== 'normal') {
            const modeCacheKey = `${rune}:${mode}`;
            const modeCached = this.#levelsPerOOMModeCache.get(modeCacheKey);
            if (modeCached !== undefined) return modeCached;

            const normalValue = this.getLevelsPerOOM(rune);
            const ambrosiaEffects = this.#api.ambrosia.getAmbrosiaUpgradeEffects('ambrosiaRuneOOMBonus', mode);
            const normalAmbrosiaEffects = this.#api.ambrosia.getAmbrosiaUpgradeEffects('ambrosiaRuneOOMBonus', 'normal');
            const ambrosiaKey = rune === 'infiniteAscent' ? 'infiniteAscentOOMBonus' : 'runeOOMBonus';
            const result = normalValue
                - Number(normalAmbrosiaEffects?.[ambrosiaKey] ?? 0)
                + Number(ambrosiaEffects?.[ambrosiaKey] ?? 0);
            this.#levelsPerOOMModeCache.set(modeCacheKey, result);
            return result;
        }
        const cached = this.#levelsPerOOMCache.get(rune);
        if (cached !== undefined) {
            return cached;
        }

        const increase = this.runes[rune].levelsPerOOMIncrease();
        const result = this.runes[rune].levelsPerOOM + increase;
        this.#levelsPerOOMIncreaseCache.set(rune, increase);
        this.#levelsPerOOMCache.set(rune, result);
        return result;
    }

    public getRuneEffectiveLevel = (rune: RuneKeys): number => {
        this.#clearCachesIfGameDataChanged();
        if (this.#runeEffectiveLevelCache.has(rune)) {
            return this.#runeEffectiveLevelCache.get(rune)!;
        }

        const data = this.#api.getGameData()
        if (!data) return 0

        const runeEXP = parseGameDataDecimal(data.runes[rune])
        const cacheName = 'GetRuneEffectiveLevel' as keyof CalculationCache;
        const runeDef = this.runes[rune]
        const runeIndex = RUNE_KEY_INDEX.get(rune) ?? 0
        const runeExpLog = runeEXP.gt(0)
            ? Number(runeEXP.log10())
            : Number.NEGATIVE_INFINITY
        const effectiveMult = runeDef.effectiveLevelMult()
        const freeLevels = this.getRuneFreeLevels(rune)
        const ignoreChal9 = runeDef.ignoreChal9 ? 1 : 0

        const calculationVars = [
            runeIndex,
            data.currentChallenge.reincarnation,
            ignoreChal9,
            effectiveMult,
            freeLevels,
            runeExpLog,
        ]

        const cached = this.#api.checkCalculationCache(cacheName, calculationVars)
        if (cached !== undefined) {
            this.#runeEffectiveLevelCache.set(rune, cached)
            return cached
        }

        if (runeDef.isUnlocked && !runeDef.isUnlocked(data)) {
            this.#api.updateCalculationCache(cacheName, { value: 0, cachedBy: calculationVars })
            this.#runeEffectiveLevelCache.set(rune, 0)
            return 0
        }

        if (data.currentChallenge.reincarnation === 9 && !runeDef.ignoreChal9) {
            this.#api.updateCalculationCache(cacheName, { value: 1, cachedBy: calculationVars })
            this.#runeEffectiveLevelCache.set(rune, 1)
            return 1
        }

        const runeLevel = this.getRuneLevelFromEXP(rune, runeEXP)
        const effectiveLevel = (runeLevel + freeLevels) * effectiveMult

        this.#api.updateCalculationCache(cacheName, { value: effectiveLevel, cachedBy: calculationVars })
        this.#runeEffectiveLevelCache.set(rune, effectiveLevel)
        return effectiveLevel
    }

    public calculateTotalRuneLevels = (): number => {
        this.#clearCachesIfGameDataChanged();
        if (this.#totalRuneLevelsCache !== undefined) {
            return this.#totalRuneLevelsCache;
        }

        const data = this.#api.getGameData()
        if (!data) return 0

        const total = RUNE_KEYS.reduce((sum, rune) => {
            const runeEXP = parseGameDataDecimal(data.runes[rune])
            return sum + this.getRuneLevelFromEXP(rune, runeEXP)
        }, 0)

        this.#totalRuneLevelsCache = total
        return total
    }

    getRuneLevelFromEXP = (rune: RuneKeys, runeEXP: Decimal): number => {
        // Mirrors SynergismOfficial/src/Runes.ts updateLevelsFromEXP.
        // The previous log-domain shortcut used log10(EXP) - log10(cost) + 1,
        // which is not log10(EXP / cost + 1) and overcounted almost every rune.
        const costCoefficient = this.runes[rune].costCoefficient
        const levelsPerOOM = this.getLevelsPerOOM(rune)
        const log10ExpOverCostPlus1 = Decimal.log10(runeEXP.div(costCoefficient).plus(1))
        const levels = Math.max(0, Math.floor(levelsPerOOM * log10ExpOverCostPlus1))
        // The game's floating point fix: an EXP that exactly pays the next level counts as that level
        const expToNextLevel = costCoefficient.times(Decimal.pow(10, (levels + 1) / levelsPerOOM).minus(1))
        return Decimal.max(0, expToNextLevel.minus(runeEXP)).eq(0) ? levels + 1 : levels
    }

    public calculateRuneEffectivenessHypercubeBlessing = () => {
        const data = this.#api.getGameData();
        const DR = 1 / 64
        const effectPerBlessing = this.#api.calculateHypercubeBlessingMultiplierPlatonicBlessing() / 1000
        const limit = 1000
        if ((data?.hypercubeBlessings.talismanBonus ?? 0) < limit) {
            return 1 + effectPerBlessing * (data?.hypercubeBlessings.talismanBonus ?? 0)
        } else {
            const limitMult = Math.pow(limit, 1 - DR)
            return 1 + effectPerBlessing * limitMult * Math.pow((data?.hypercubeBlessings.talismanBonus ?? 0), DR)
        }
    }

    public calculateRuneEffectivenessTesseractBlessing = () => {
        const data = this.#api.getGameData();
        const DR = 1 / 32
        const effectPerBlessing = this.calculateRuneEffectivenessHypercubeBlessing() / 1000
        const limit = 1000
        if ((data?.tesseractBlessings.talismanBonus ?? 0) < limit) {
            return 1 + effectPerBlessing * (data?.tesseractBlessings.talismanBonus ?? 0)
        } else {
            const limitMult = Math.pow(limit, 1 - DR)
            return 1 + effectPerBlessing * limitMult * Math.pow((data?.tesseractBlessings.talismanBonus ?? 0), DR)
        }
    }

    public calculateRuneEffectivenessCubeBlessing = () => {
        const data = this.#api.getGameData();
        const DR = 1 / 16
        const effectPerBlessing = this.calculateRuneEffectivenessTesseractBlessing() / 10000
        const limit = 1000
        const DRIncrease = (data?.cubeUpgrades[44] ?? 0) / 1600

        if ((data?.cubeBlessings.talismanBonus ?? 0) < limit) {
            return Math.pow(1 + effectPerBlessing * (data?.cubeBlessings.talismanBonus ?? 0), 1 + DRIncrease)
        } else {
            const limitMult = Math.pow(limit, 1 - DR + DRIncrease)
            return Math.min(
                1e300,
                1 + limitMult * effectPerBlessing * Math.pow((data?.cubeBlessings.talismanBonus ?? 0), DR + DRIncrease)
            )
        }
    }

    public SIEffectiveRuneLevelMult = () => {
        return 1 + ((this.#api.getGameData()?.researches[84] ?? 0) / 200)
    }

    // SynergismOfficial/src/Hypercubes.ts calculateSalvageHypercubeBlessing
    public calculateSalvageHypercubeBlessing = (): number => {
        const factor = Math.pow(Math.log10((this.#api.getGameData()?.hypercubeBlessings.runeExp ?? 0) + 1), 1.25)
        const cap = 3 / 2
        return 1 + cap * factor / (40 + factor)
    }

    // SynergismOfficial/src/Tesseracts.ts calculateSalvageTesseractBlessing
    public calculateSalvageTesseractBlessing = (): number => {
        const factor = Math.pow(Math.log10((this.#api.getGameData()?.tesseractBlessings.runeExp ?? 0) + 1), 1.25)
        const cap = 1 / 2 * this.calculateSalvageHypercubeBlessing()
        return 1 + cap * factor / (20 + factor)
    }

    // SynergismOfficial/src/Cubes.ts calculateSalvageCubeBlessing
    public calculateSalvageCubeBlessing = (): number => {
        const data = this.#api.getGameData()
        const limit = 1000
        const blessings = data?.cubeBlessings.runeExp ?? 0
        const effectMultiplier = (1 + (data?.cubeUpgrades[14] ?? 0) / 100) * this.calculateSalvageTesseractBlessing()

        if (blessings < limit) {
            return effectMultiplier * (blessings * 10 / limit)
        }
        const limitBonus = 10
        return effectMultiplier * (limitBonus + 10 * Math.log10(blessings / limit))
    }

    // SynergismOfficial/src/Levels.ts synergismLevelRewards.salvage: +1 per level for the first 100 levels, +2 per level for the next 100, and so on
    #synergismLevelSalvage = (): number => {
        let salvage = 0
        let salvagePerLevel = 1
        let remainingLevels = this.#api.calculateSynergismLevel()
        while (remainingLevels >= 100) {
            salvage += salvagePerLevel * 100
            remainingLevels -= 100
            salvagePerLevel += 1
        }
        return salvage + salvagePerLevel * remainingLevels
    }

    // SynergismOfficial/src/Statistics.ts positiveSalvageStats
    #rawPositiveSalvage = (): number => {
        const data = this.#api.getGameData()
        const completions = data?.challengecompletions
        // SynergismOfficial/src/Hepteracts.ts hepteracts.abyss.EFFECTS
        const abyssHepteract = this.#api.calculateHepteractEffective('abyss')
        const abyssSalvage = 0.1 * Math.floor(10 * Math.log2(Math.max(1, abyssHepteract * 2)))

        return (
            Number(this.#api.achievement.AchRewards.salvage() ?? 0)
            + this.#synergismLevelSalvage()
            + this.#api.getLevelMilestone('salvageChallengeBuff')
            + 7 * (data?.upgrades[61] ?? 0)
            + this.#api.rune.getRuneEffects('thrift').salvage
            + 0.3 * (completions?.[6] ?? 0)
            + 0.3 * (completions?.[7] ?? 0)
            + 0.4 * (completions?.[8] ?? 0)
            + 0.5 * (completions?.[9] ?? 0)
            + this.#api.antUpgrade.getAntUpgradeEffectValue(AntUpgrades.Salvage, 'salvage')
            + this.calculateSalvageCubeBlessing()
            + 3 * (data?.cubeUpgrades[2] ?? 0)
            + abyssSalvage
            + Math.min(50, 5 * (data?.highestSingularityCount ?? 0))
            + this.#api.rune.getRuneEffects('infiniteAscent').salvage
            + this.#api.ambrosia.getRedAmbrosiaUpgradeEffects('salvageYinYang').positiveSalvage
            + this.#api.purple.getPurpleAmbrosiaUpgradeEffects('virgo', 'assignedBlueberrySalvage')
        )
    }

    // SynergismOfficial/src/Statistics.ts positiveSalvageStatMultiplier
    #positiveSalvageMultiplier = (): number => {
        const highestSingularity = this.#api.getGameData()?.highestSingularityCount ?? 0
        const perkSings = [230, 245, 260, 275, 290]
        return 1
            + perkSings.filter((x) => x <= highestSingularity).length / 100
            + this.#api.talisman.getTalismanEffects('achievement').positiveSalvageMult
    }

    // SynergismOfficial/src/Calculate.ts calculatePositiveSalvage
    public calculatePositiveSalvage = (): number => {
        const rawSalvage = this.#rawPositiveSalvage()
        if (this.#api.getGameData()?.singularityChallenges.taxmanLastStand.enabled) {
            return 100 + (rawSalvage * this.#positiveSalvageMultiplier()) / Math.max(1, Math.log(rawSalvage))
        }
        return rawSalvage * this.#positiveSalvageMultiplier()
    }

    // SynergismOfficial/src/Statistics.ts negativeSalvageStatMultiplier,
    // SynergismOfficial/src/Calculate.ts calculateNegativeSalvageMultiplier
    public calculateNegativeSalvageMultiplier = (): number => {
        const data = this.#api.getGameData()
        if (!data) return 1

        const perkSings = [75, 85, 105, 125, 155, 185, 215, 245, 260, 275]
        return Math.max(0, 1
            - perkSings.filter((x) => x <= (data.highestSingularityCount ?? 0)).length / 100
            + this.#api.talisman.getTalismanEffects('achievement').negativeSalvageMult
            + (data.platonicUpgrades[13] > 0 ? -0.5 : 0))
    }

    // SynergismOfficial/src/Statistics.ts negativeSalvageStats,
    // SynergismOfficial/src/Calculate.ts calculateNegativeSalvage
    public calculateNegativeSalvage = (): number => {
        const rawSalvage = this.#api.calculateSingularityDebuff('Salvage')
            + this.#api.ambrosia.getRedAmbrosiaUpgradeEffects('salvageYinYang').negativeSalvage
        return rawSalvage * this.calculateNegativeSalvageMultiplier()
    }

    // SynergismOfficial/src/Calculate.ts calculateBadOfferingsSalvage: the corruption level's salvage
    public calculateBadOfferingsSalvage = (): number => {
        const salvage = this.#api.corruption.getCorruptionEffect(this.#api.corruption.getActiveCorruptionLevel(), 'salvage') as number
        return salvage * this.calculateNegativeSalvageMultiplier()
    }

    // SynergismOfficial/src/Calculate.ts calculateChallenge15RuneSalvage
    public calculateChallenge15RuneSalvage = (): number => {
        return this.#api.corruption.getChallenge15CorruptionEffect('drought') * this.calculateNegativeSalvageMultiplier()
    }

    // SynergismOfficial/src/Calculate.ts calculateTotalSalvage
    public calculateTotalSalvage = (): number => {
        return this.calculatePositiveSalvage() + this.calculateNegativeSalvage()
    }

    // SynergismOfficial/src/Calculate.ts calculateFirstFiveRuneSalvage: the corruption salvage only counts for the
    // first five runes
    public calculateFirstFiveRuneSalvage = (): number => {
        return this.calculateTotalSalvage() + this.calculateBadOfferingsSalvage() + this.calculateChallenge15RuneSalvage()
    }

    // SynergismOfficial/src/Calculate.ts calculateSalvageRuneEXPMultiplier
    public calculateSalvageRuneEXPMultiplier = (salvage = this.calculateTotalSalvage()): Decimal => {
        return Decimal.pow(10, salvage / 30)
    }

    // SynergismOfficial/src/Runes.ts firstFiveRuneEXPMult
    public firstFiveRuneEXPMult = (purchasedLevels: number): Decimal => {
        return this.universalRuneEXPMult(purchasedLevels, this.calculateFirstFiveRuneSalvage())
    }

    public universalRuneEXPMult = (purchasedLevels: number, salvage = this.calculateTotalSalvage()): Decimal => {
        const data = this.#api.getGameData();
        const recycleMultiplier = this.calculateSalvageRuneEXPMultiplier(salvage)

        const allRuneExpAdditiveMultiplier = (
            1
            + Math.min(1, data?.highestchallengecompletions[1] ?? 0)
            + (0.4 / 10) * (data?.highestchallengecompletions[1] ?? 0)
            + 0.6 * (data?.researches[22] ?? 0)
            + 0.3 * (data?.researches[23] ?? 0)
            + ((data?.upgrades[71] ?? 0) * purchasedLevels) / 25
        )

        const allRuneExpMultiplier = [
            1 + (data?.researches[91] ?? 0) / 20,
            1 + (data?.researches[92] ?? 0) / 20,
            1 + ((data?.ascensionCounter ?? 0) / 1000) * (data?.cubeUpgrades[32] ?? 0),
            1 + (1 / 10) * (data?.constantUpgrades[8] ?? 0),
            this.#api.calculateChallenge15Reward('runeExp')
        ].reduce((x, y) => x.times(y), new Decimal('1'))

        return allRuneExpMultiplier.times(allRuneExpAdditiveMultiplier).times(recycleMultiplier)
    }
}
