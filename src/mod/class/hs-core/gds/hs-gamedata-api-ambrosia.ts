import { redAmbrosiaUpgradeCalculationCollection } from "./hs-gamedata-tables";
import { EventBuffType } from "../../../types/data-types/hs-event-data";
import { HSGlobal } from "../hs-global";
import type { GameData, RedAmbrosiaUpgrades } from "../../../types/data-types/hs-player-savedata";
import type { AmbrosiaUpgradeNames, AmbrosiaUpgradeRewards, AmbrosiaUpgradeCalculationCollection, AmbrosiaUpgradeCalculationConfig, AmbrosiaUpgradeEffectContext, RedAmbrosiaUpgradeRewards, RedAmbrosiaUpgradeKey, CalculationCache, CalculationMode, HSCalculationComponents } from "../../../types/data-types/hs-gamedata-api-types";
import { calculateAmbrosiaBarIncome } from "./hs-ambrosia-bar-income";
import type { AmbrosiaBarIncome } from "../../../types/data-types/hs-ambrosia-income-types";
import type { HSGameDataAPI } from "./hs-gamedata-api";

type PurpleAmbrosiaEnchantmentConfig = {
    type: 'freeLevels' | 'blueberryCostReduction';
    maxLevel: number;
    cost: (level: number) => number;
    freeLevels?: (level: number) => number;
};

/**
 * Class: AmbrosiaHelper
 * IsExplicitHSModule: No
 * Description:
 *     Ambrosia and red ambrosia: upgrade levels and effects, purple ambrosia enchantments, generation speed and bar income.
 * Author: XxMolkxX, Shewchou
 */
export class AmbrosiaHelper {
    readonly #api: HSGameDataAPI;

    static readonly #EXALT_9_AMBROSIA_UPGRADES = new Set<AmbrosiaUpgradeNames>([
        'ambrosiaQuarks4',
        'ambrosiaCubes4',
        'ambrosiaLuck4',
        'ambrosiaFreeObtainiumUpgrades',
        'ambrosiaFreeOfferingUpgrades',
        'ambrosiaInfiniteShopUpgrades3',
        'twoMind',
    ]);

    // Mirrors `purpleAmbrosiaEnchantment` in SynergismOfficial/src/BlueberryUpgrades.ts.
    static readonly #PURPLE_AMBROSIA_ENCHANTMENTS: Record<AmbrosiaUpgradeNames, PurpleAmbrosiaEnchantmentConfig> = {
        ambrosiaTutorial: { type: 'freeLevels', maxLevel: 5, cost: (n) => n * (n + 1) / 2, freeLevels: (n) => n },
        ambrosiaQuarks1: { type: 'freeLevels', maxLevel: 10, cost: (n) => 5 * n * (n + 1) / 2, freeLevels: (n) => n },
        ambrosiaCubes1: { type: 'freeLevels', maxLevel: 10, cost: (n) => 5 * n * (n + 1) / 2, freeLevels: (n) => n },
        ambrosiaLuck1: { type: 'freeLevels', maxLevel: 10, cost: (n) => 5 * n * (n + 1) / 2, freeLevels: (n) => n },
        ambrosiaQuarkCube1: { type: 'blueberryCostReduction', maxLevel: 1, cost: (n) => 400 * n },
        ambrosiaLuckCube1: { type: 'blueberryCostReduction', maxLevel: 1, cost: (n) => 400 * n },
        ambrosiaCubeQuark1: { type: 'blueberryCostReduction', maxLevel: 1, cost: (n) => 400 * n },
        ambrosiaLuckQuark1: { type: 'blueberryCostReduction', maxLevel: 1, cost: (n) => 400 * n },
        ambrosiaCubeLuck1: { type: 'blueberryCostReduction', maxLevel: 1, cost: (n) => 400 * n },
        ambrosiaQuarkLuck1: { type: 'blueberryCostReduction', maxLevel: 1, cost: (n) => 400 * n },
        ambrosiaQuarks2: { type: 'blueberryCostReduction', maxLevel: 1, cost: (n) => 400 * n },
        ambrosiaCubes2: { type: 'blueberryCostReduction', maxLevel: 1, cost: (n) => 200 * n },
        ambrosiaLuck2: { type: 'blueberryCostReduction', maxLevel: 1, cost: (n) => 500 * n },
        ambrosiaQuarks3: { type: 'blueberryCostReduction', maxLevel: 1, cost: (n) => 1_200 * n },
        ambrosiaQuarks4: { type: 'blueberryCostReduction', maxLevel: 1, cost: (n) => 3_000 * n },
        ambrosiaCubes3: { type: 'blueberryCostReduction', maxLevel: 1, cost: (n) => 600 * n },
        ambrosiaCubes4: { type: 'blueberryCostReduction', maxLevel: 1, cost: (n) => 1_500 * n },
        ambrosiaFreeCubeUpgrades: { type: 'freeLevels', maxLevel: 15, cost: (n) => 200 * n, freeLevels: (n) => n },
        ambrosiaLuck3: { type: 'blueberryCostReduction', maxLevel: 1, cost: (n) => 1_500 * n },
        ambrosiaLuck4: { type: 'blueberryCostReduction', maxLevel: 1, cost: (n) => 3_750 * n },
        ambrosiaPatreon: { type: 'freeLevels', maxLevel: 1, cost: (n) => 200 * n, freeLevels: (n) => 0.02 * n },
        ambrosiaObtainium1: { type: 'freeLevels', maxLevel: 1, cost: (n) => 200 * n, freeLevels: (n) => n },
        ambrosiaOffering1: { type: 'freeLevels', maxLevel: 1, cost: (n) => 200 * n, freeLevels: (n) => n },
        ambrosiaHyperflux: { type: 'blueberryCostReduction', maxLevel: 1, cost: (n) => 777 * n },
        ambrosiaBaseOffering1: { type: 'freeLevels', maxLevel: 40, cost: (n) => n ** 2, freeLevels: (n) => n },
        ambrosiaBaseObtainium1: { type: 'freeLevels', maxLevel: 20, cost: (n) => 3 * n ** 2, freeLevels: (n) => n },
        ambrosiaBaseOffering2: { type: 'blueberryCostReduction', maxLevel: 1, cost: (n) => 500 * n },
        ambrosiaBaseObtainium2: { type: 'blueberryCostReduction', maxLevel: 1, cost: (n) => 500 * n },
        ambrosiaFreeObtainiumUpgrades: { type: 'freeLevels', maxLevel: 25, cost: (n) => 100 * n, freeLevels: (n) => n },
        ambrosiaFreeOfferingUpgrades: { type: 'freeLevels', maxLevel: 25, cost: (n) => 100 * n, freeLevels: (n) => n },
        ambrosiaSingReduction1: { type: 'blueberryCostReduction', maxLevel: 1, cost: (n) => 150 * n },
        ambrosiaInfiniteShopUpgrades1: { type: 'blueberryCostReduction', maxLevel: 1, cost: (n) => 800 * n },
        ambrosiaInfiniteShopUpgrades2: { type: 'freeLevels', maxLevel: 8, cost: (n) => 40 * n * (n + 1), freeLevels: (n) => n },
        ambrosiaInfiniteShopUpgrades3: { type: 'freeLevels', maxLevel: 8, cost: (n) => 125 * n * (n + 1), freeLevels: (n) => n },
        ambrosiaSingReduction2: { type: 'blueberryCostReduction', maxLevel: 1, cost: (n) => 1_500 * n },
        ambrosiaTalismanBonusRuneLevel: { type: 'freeLevels', maxLevel: 20, cost: (n) => 3 * n * (n + 1), freeLevels: (n) => n },
        ambrosiaRuneOOMBonus: { type: 'freeLevels', maxLevel: 20, cost: (n) => 3 * n * (n + 1), freeLevels: (n) => n },
        ambrosiaBrickOfLead: { type: 'blueberryCostReduction', maxLevel: 1, cost: (n) => 2_000 * n },
        ambrosiaFreeLuckUpgrades: { type: 'freeLevels', maxLevel: 10, cost: (n) => 12 * n * (n + 1), freeLevels: (n) => n },
        ambrosiaFreeGenerationUpgrades: { type: 'freeLevels', maxLevel: 2, cost: (n) => 100 * (10 ** n - 1) / 9, freeLevels: (n) => n },
        ambrosiaFreeRedLuckUpgrades: { type: 'freeLevels', maxLevel: 25, cost: (n) => 15 * n * (n + 1), freeLevels: (n) => n },
        ambrosiaFreeQuarkUpgrades: { type: 'blueberryCostReduction', maxLevel: 1, cost: (n) => 2_000 * n },
        twoMind: { type: 'blueberryCostReduction', maxLevel: 1, cost: (n) => 2_222 * n },
    };

    constructor(api: HSGameDataAPI) {
        this.#api = api;
    }

    static #floorLog10PlusOne(value: number): number {
        return Math.floor(Math.log10(value + 1));
    }

    static #ceilLog10PlusOne(value: number): number {
        return Math.ceil(Math.log10(value + 1));
    }

    #getWorldsLog10Squared(): number {
        const worlds = Number(this.#api.getGameData()?.worlds ?? 0);
        return Math.floor(Math.pow(Math.log10(worlds + 1) + 1, 2));
    }

    #getWowResourceLogSum(): number {
        const data = this.#api.getGameData();
        if (!data) return 6;

        return (
            AmbrosiaHelper.#floorLog10PlusOne(Number(data.wowCubes))
            + AmbrosiaHelper.#floorLog10PlusOne(Number(data.wowTesseracts))
            + AmbrosiaHelper.#floorLog10PlusOne(Number(data.wowHypercubes))
            + AmbrosiaHelper.#floorLog10PlusOne(Number(data.wowPlatonicCubes))
            + AmbrosiaHelper.#floorLog10PlusOne(Number(data.wowAbyssals ?? 0))
            + AmbrosiaHelper.#floorLog10PlusOne(Number(data.wowOcteracts ?? 0))
            + 6
        );
    }

    #getLifetimeAmbrosiaLogSum(): number {
        const data = this.#api.getGameData();
        if (!data) return 0;

        return (
            AmbrosiaHelper.#ceilLog10PlusOne(Number(data.lifetimeRedAmbrosia ?? 0))
            + AmbrosiaHelper.#ceilLog10PlusOne(Number(data.lifetimeAmbrosia ?? 0))
        );
    }

    #isTwoMindEnabled(data: GameData): boolean {
        const upgrades = data.ambrosiaUpgrades as typeof data.ambrosiaUpgrades & {
            twoMind?: { blueberriesInvested?: number };
        };
        return (upgrades.twoMind?.blueberriesInvested ?? 0) > 0
            && data.singularityChallenges.taxmanLastStand.completions > 0
            && !data.singularityChallenges.noAmbrosiaUpgrades.enabled
            && !data.singularityChallenges.sadisticPrequel.enabled;
    }

    #getBarDependence(data: GameData): { completions: number; enabled: boolean } {
        const challenges = data.singularityChallenges as typeof data.singularityChallenges & {
            barDependence?: { completions?: number; enabled?: boolean };
        };
        return {
            completions: challenges.barDependence?.completions ?? 0,
            enabled: challenges.barDependence?.enabled ?? false,
        };
    }

    #getAmbrosiaUpgradeCacheName(upgradeName: AmbrosiaUpgradeNames, freeLevelsOnly: boolean): keyof CalculationCache {
        return (`AMB_${upgradeName}${freeLevelsOnly ? '_FREE' : ''}`) as keyof CalculationCache;
    }

    // Mirrors `redAmbrosiaUpgrade` in SynergismOfficial/src/BlueberryUpgrades.ts.
    #getAmbrosiaUpgradeRedFreeLevels(upgradeName: AmbrosiaUpgradeNames): number {
        const data = this.#api.getGameData();
        if (!data) return 0;

        const redFreeLevelRows: Partial<Record<AmbrosiaUpgradeNames, keyof RedAmbrosiaUpgrades>> = {
            ambrosiaTutorial: 'freeTutorialLevels',
            ambrosiaLuck1: 'freeLevelsRow2', ambrosiaCubeLuck1: 'freeLevelsRow2', ambrosiaQuarkLuck1: 'freeLevelsRow2',
            ambrosiaLuck2: 'freeLevelsRow2', ambrosiaLuck3: 'freeLevelsRow2', ambrosiaLuck4: 'freeLevelsRow2',
            ambrosiaFreeLuckUpgrades: 'freeLevelsRow2', ambrosiaFreeGenerationUpgrades: 'freeLevelsRow2', ambrosiaFreeRedLuckUpgrades: 'freeLevelsRow2',
            ambrosiaBaseOffering1: 'freeLevelsRow3', ambrosiaBaseObtainium1: 'freeLevelsRow3', ambrosiaBaseOffering2: 'freeLevelsRow3', ambrosiaBaseObtainium2: 'freeLevelsRow3',
            ambrosiaFreeObtainiumUpgrades: 'freeLevelsRow3', ambrosiaFreeOfferingUpgrades: 'freeLevelsRow3',
            ambrosiaInfiniteShopUpgrades1: 'freeLevelsRow3', ambrosiaInfiniteShopUpgrades2: 'freeLevelsRow3', ambrosiaInfiniteShopUpgrades3: 'freeLevelsRow3',
            ambrosiaTalismanBonusRuneLevel: 'freeLevelsRow3', ambrosiaRuneOOMBonus: 'freeLevelsRow3',
            ambrosiaCubes1: 'freeLevelsRow4', ambrosiaQuarkCube1: 'freeLevelsRow4', ambrosiaLuckCube1: 'freeLevelsRow4',
            ambrosiaCubes2: 'freeLevelsRow4', ambrosiaCubes3: 'freeLevelsRow4', ambrosiaCubes4: 'freeLevelsRow4', ambrosiaFreeCubeUpgrades: 'freeLevelsRow4',
            ambrosiaQuarks1: 'freeLevelsRow5', ambrosiaCubeQuark1: 'freeLevelsRow5', ambrosiaLuckQuark1: 'freeLevelsRow5',
            ambrosiaQuarks2: 'freeLevelsRow5', ambrosiaQuarks3: 'freeLevelsRow5', ambrosiaQuarks4: 'freeLevelsRow5', ambrosiaFreeQuarkUpgrades: 'freeLevelsRow5',
        };
        const row = redFreeLevelRows[upgradeName];
        return row ? Number((this.getRedAmbrosiaUpgradeEffects(row as RedAmbrosiaUpgradeKey) as any).freeLevels ?? 0) : 0;
    }

    calculatePurpleAmbrosiaEnchantmentLevel(upgradeName: AmbrosiaUpgradeNames): number {
        const data = this.#api.getGameData();
        if (!data) return 0;

        const enchantment = AmbrosiaHelper.#PURPLE_AMBROSIA_ENCHANTMENTS[upgradeName];
        const savedInvestment = Number(data.ambrosiaUpgrades[upgradeName]?.purpleAmbrosiaInvested ?? 0);
        const invested = Number.isFinite(savedInvestment) ? Math.max(0, savedInvestment) : 0;
        let low = 0;
        let high = enchantment.maxLevel;
        while (low < high) {
            const middle = low + Math.ceil((high - low) / 2);
            if (enchantment.cost(middle) <= invested) low = middle;
            else high = middle - 1;
        }
        return low;
    }

    getPurpleAmbrosiaEnchantmentMaxLevel(upgradeName: AmbrosiaUpgradeNames): number {
        return AmbrosiaHelper.#PURPLE_AMBROSIA_ENCHANTMENTS[upgradeName]?.maxLevel ?? 0;
    }

    getPurpleAmbrosiaEnchantmentFreeLevels(upgradeName: AmbrosiaUpgradeNames): number {
        const enchantment = AmbrosiaHelper.#PURPLE_AMBROSIA_ENCHANTMENTS[upgradeName];
        return enchantment.type === 'freeLevels'
            ? (enchantment.freeLevels?.(this.calculatePurpleAmbrosiaEnchantmentLevel(upgradeName)) ?? 0)
            : 0;
    }

    getAmbrosiaUpgradeBlueberryCostReduction(upgradeName: AmbrosiaUpgradeNames): number {
        return AmbrosiaHelper.#PURPLE_AMBROSIA_ENCHANTMENTS[upgradeName].type === 'blueberryCostReduction'
            ? this.calculatePurpleAmbrosiaEnchantmentLevel(upgradeName)
            : 0;
    }

    #getAmbrosiaUpgradeExtraLevels(upgradeName: AmbrosiaUpgradeNames, purchasedLevel: number): number {
        const purpleLevels = purchasedLevel > 0
            ? this.getPurpleAmbrosiaEnchantmentFreeLevels(upgradeName)
            : 0;
        return this.#getAmbrosiaUpgradeRedFreeLevels(upgradeName) + purpleLevels;
    }

    redAmbrosiaUpgradeCalculationCollection = redAmbrosiaUpgradeCalculationCollection;

    ambrosiaUpgradeCalculationCollection: AmbrosiaUpgradeCalculationCollection = {
        ambrosiaTutorial: {
            costPerLevel: 1,
            maxLevel: 10,
            ignoreEXALT: false,
            costFormula: (n: number, cpl: number): number =>
                cpl * ((n + 1) ** 2 - n ** 2),
            effects: (n: number) => {
                const cubeAmount = 1 + 0.05 * n;
                const quarkAmount = 1 + 0.01 * n;
                return {
                    quarks: quarkAmount,
                    cubes: cubeAmount,
                };
            },
            extraLevelCalc: () => this.getRedAmbrosiaUpgradeEffects('freeTutorialLevels').freeLevels,
        },

        ambrosiaQuarks1: {
            costPerLevel: 1,
            maxLevel: 100,
            ignoreEXALT: false,
            costFormula: (n: number, cpl: number): number =>
                cpl * ((n + 1) ** 3 - n ** 3),
            effects: (n: number) => {
                const quarkAmount = 1 + 0.01 * n;
                return {
                    quarks: quarkAmount,
                };
            },
            extraLevelCalc: () => this.getRedAmbrosiaUpgradeEffects('freeLevelsRow5').freeLevels,
            prerequisites: {
                ambrosiaTutorial: 10,
            },
        },

        ambrosiaCubes1: {
            costPerLevel: 1,
            maxLevel: 100,
            ignoreEXALT: false,
            costFormula: (n: number, cpl: number): number =>
                cpl * ((n + 1) ** 3 - n ** 3),
            effects: (n: number) => {
                const cubeAmount = (1 + 0.05 * n) * Math.pow(1.1, Math.floor(n / 5));
                return {
                    cubes: cubeAmount,
                };
            },
            extraLevelCalc: () => this.getRedAmbrosiaUpgradeEffects('freeLevelsRow4').freeLevels,
            prerequisites: {
                ambrosiaTutorial: 10,
            },
        },

        ambrosiaLuck1: {
            costPerLevel: 1,
            maxLevel: 100,
            ignoreEXALT: false,
            costFormula: (n: number, cpl: number): number =>
                cpl * ((n + 1) ** 3 - n ** 3),
            effects: (n: number) => {
                const val = 2 * n + 12 * Math.floor(n / 10);
                return {
                    ambrosiaLuck: val,
                };
            },
            extraLevelCalc: () => this.getRedAmbrosiaUpgradeEffects('freeLevelsRow2').freeLevels,
            prerequisites: {
                ambrosiaTutorial: 10,
            },
        },

        ambrosiaQuarkCube1: {
            costPerLevel: 250,
            maxLevel: 25,
            ignoreEXALT: false,
            costFormula: (n: number, cpl: number): number =>
                cpl * ((n + 1) ** 3 - n ** 3),
            effects: (n: number) => {
                const baseVal = 0.001 * n;
                const val = 1 + baseVal * this.#getWorldsLog10Squared();
                return {
                    cubes: val,
                };
            },
            extraLevelCalc: () => this.getRedAmbrosiaUpgradeEffects('freeLevelsRow4').freeLevels,
            prerequisites: {
                ambrosiaCubes1: 30,
                ambrosiaQuarks1: 20,
            },
        },

        ambrosiaLuckCube1: {
            costPerLevel: 250,
            maxLevel: 25,
            ignoreEXALT: false,
            costFormula: (n: number, cpl: number): number =>
                cpl * ((n + 1) ** 3 - n ** 3),
            effects: (n: number) => {
                const baseVal = 0.0005 * n;
                const luck = this.#api.luck.calculateLuck() as { luckTotal: number };
                const val = 1 + baseVal * luck.luckTotal;
                return {
                    cubes: val,
                };
            },
            extraLevelCalc: () => this.getRedAmbrosiaUpgradeEffects('freeLevelsRow4').freeLevels,
            prerequisites: {
                ambrosiaCubes1: 30,
                ambrosiaLuck1: 20,
            },
        },

        ambrosiaCubeQuark1: {
            costPerLevel: 500,
            maxLevel: 25,
            ignoreEXALT: false,
            costFormula: (n: number, cpl: number): number =>
                cpl * ((n + 1) ** 3 - n ** 3),
            effects: (n: number) => {
                const baseVal = 0.0001 * n;
                const val = 1 + baseVal * this.#getWowResourceLogSum();
                return {
                    quarks: val,
                };
            },
            extraLevelCalc: () => this.getRedAmbrosiaUpgradeEffects('freeLevelsRow5').freeLevels,
            prerequisites: {
                ambrosiaQuarks1: 30,
                ambrosiaCubes1: 20,
            },
        },

        ambrosiaLuckQuark1: {
            costPerLevel: 500,
            maxLevel: 25,
            ignoreEXALT: false,
            costFormula: (n: number, cpl: number): number =>
                cpl * ((n + 1) ** 3 - n ** 3),
            effects: (n: number) => {
                const baseVal = 0.0001 * n;
                const luck = this.#api.luck.calculateLuck() as { luckTotal: number };
                const effectiveLuck = Math.min(luck.luckTotal, Math.pow(1000, 0.5) * Math.pow(luck.luckTotal, 0.5));
                const val = 1 + baseVal * effectiveLuck;
                return {
                    quarks: val,
                };
            },
            extraLevelCalc: () => this.getRedAmbrosiaUpgradeEffects('freeLevelsRow5').freeLevels,
            prerequisites: {
                ambrosiaQuarks1: 30,
                ambrosiaLuck1: 20,
            },
        },

        ambrosiaCubeLuck1: {
            costPerLevel: 100,
            maxLevel: 25,
            ignoreEXALT: false,
            costFormula: (n: number, cpl: number): number =>
                cpl * ((n + 1) ** 3 - n ** 3),
            effects: (n: number) => {
                const baseVal = 0.02 * n;
                const val = baseVal * this.#getWowResourceLogSum();
                return {
                    ambrosiaLuck: val,
                };
            },
            extraLevelCalc: () => this.getRedAmbrosiaUpgradeEffects('freeLevelsRow2').freeLevels,
            prerequisites: {
                ambrosiaLuck1: 30,
                ambrosiaCubes1: 20,
            },
        },

        ambrosiaQuarkLuck1: {
            costPerLevel: 100,
            maxLevel: 25,
            ignoreEXALT: false,
            costFormula: (n: number, cpl: number): number =>
                cpl * ((n + 1) ** 3 - n ** 3),
            effects: (n: number) => {
                const baseVal = 0.02 * n;
                const val = baseVal * this.#getWorldsLog10Squared();
                return {
                    ambrosiaLuck: val,
                };
            },
            extraLevelCalc: () => this.getRedAmbrosiaUpgradeEffects('freeLevelsRow2').freeLevels,
            prerequisites: {
                ambrosiaLuck1: 30,
                ambrosiaQuarks1: 20,
            },
        },

        ambrosiaQuarks2: {
            costPerLevel: 500,
            maxLevel: 100,
            ignoreEXALT: false,
            costFormula: (n: number, cpl: number): number =>
                cpl * ((n + 1) ** 2 - n ** 2),
            effects: (n: number, ctx?: AmbrosiaUpgradeEffectContext) => {
                const quark1Level = ctx?.getAmbrosiaUpgradeLevel('ambrosiaQuarks1') ?? this.calculateAmbrosiaUpgradeValue('ambrosiaQuarks1');
                const quarkAmount =
                    1 +
                    (0.01 + Math.floor(quark1Level / 10) / 1000) * n;
                return {
                    quarks: quarkAmount,
                };
            },
            extraLevelCalc: () => this.getRedAmbrosiaUpgradeEffects('freeLevelsRow5').freeLevels,
            prerequisites: {
                ambrosiaQuarks1: 40,
            },
        },

        ambrosiaCubes2: {
            costPerLevel: 500,
            maxLevel: 100,
            ignoreEXALT: false,
            costFormula: (n: number, cpl: number): number =>
                cpl * ((n + 1) ** 2 - n ** 2),
            effects: (n: number, ctx?: AmbrosiaUpgradeEffectContext) => {
                const cubes1Level = ctx?.getAmbrosiaUpgradeLevel('ambrosiaCubes1') ?? this.calculateAmbrosiaUpgradeValue('ambrosiaCubes1');
                const cubeAmount =
                    (1 + (0.1 + 10 * (Math.floor(cubes1Level / 10) / 1000)) * n) *
                    Math.pow(1.15, Math.floor(n / 5));
                return {
                    cubes: cubeAmount,
                };
            },
            extraLevelCalc: () => this.getRedAmbrosiaUpgradeEffects('freeLevelsRow4').freeLevels,
            prerequisites: {
                ambrosiaCubes1: 40,
            },
        },

        ambrosiaLuck2: {
            costPerLevel: 250,
            maxLevel: 100,
            ignoreEXALT: false,
            costFormula: (n: number, cpl: number): number =>
                cpl * ((n + 1) ** 2 - n ** 2),
            effects: (n: number, ctx?: AmbrosiaUpgradeEffectContext) => {
                const luck1Level = ctx?.getAmbrosiaUpgradeLevel('ambrosiaLuck1') ?? this.calculateAmbrosiaUpgradeValue('ambrosiaLuck1');
                const val =
                    (3 + 0.3 * Math.floor(luck1Level / 10)) * n +
                    40 * Math.floor(n / 10);
                return {
                    ambrosiaLuck: val,
                };
            },
            extraLevelCalc: () => this.getRedAmbrosiaUpgradeEffects('freeLevelsRow2').freeLevels,
            prerequisites: {
                ambrosiaLuck1: 40,
            },
        },

        ambrosiaQuarks3: {
            costPerLevel: 750000,
            maxLevel: 10,
            ignoreEXALT: false,
            costFormula: (n: number, cpl: number): number => cpl + 50000 * n,
            effects: (n: number, ctx?: AmbrosiaUpgradeEffectContext) => {
                const quarks2Level = ctx?.getAmbrosiaUpgradeLevel('ambrosiaQuarks2') ?? this.calculateAmbrosiaUpgradeValue('ambrosiaQuarks2');
                const quark2Mult = 1 + quarks2Level / 100;
                const quark3Base = 0.05 * n;
                const quarkAmount = 1 + quark3Base * quark2Mult;
                return {
                    quarks: quarkAmount,
                };
            },
            extraLevelCalc: () => this.getRedAmbrosiaUpgradeEffects('freeLevelsRow5').freeLevels,
            prerequisites: {
                ambrosiaQuarks1: 100,
                ambrosiaQuarks2: 50,
            },
        },

        ambrosiaCubes3: {
            costPerLevel: 75000,
            maxLevel: 100,
            ignoreEXALT: false,
            costFormula: (n: number, cpl: number): number => cpl + 5000 * n,
            effects: (n: number, ctx?: AmbrosiaUpgradeEffectContext) => {
                const cubes2Level = ctx?.getAmbrosiaUpgradeLevel('ambrosiaCubes2') ?? this.calculateAmbrosiaUpgradeValue('ambrosiaCubes2');
                const cube2Multi = 1 + 3 * cubes2Level / 100;
                const cube3Base = 0.2 * n;
                const cube3Exponential = Math.pow(1.2, Math.floor(n / 5));
                const cubeAmount = (1 + cube3Base * cube2Multi) * cube3Exponential;
                return {
                    cubes: cubeAmount,
                };
            },
            extraLevelCalc: () => this.getRedAmbrosiaUpgradeEffects('freeLevelsRow4').freeLevels,
            prerequisites: {
                ambrosiaCubes1: 100,
                ambrosiaCubes2: 50,
            },
        },

        ambrosiaLuck3: {
            costPerLevel: 50000,
            maxLevel: 100,
            ignoreEXALT: false,
            costFormula: (_n: number, cpl: number): number => cpl,
            effects: (n: number) => {
                const perLevel = this.calculateBlueberryInventory(true) as number;
                return {
                    ambrosiaLuck: perLevel * n,
                };
            },
            extraLevelCalc: () => this.getRedAmbrosiaUpgradeEffects('freeLevelsRow2').freeLevels,
            prerequisites: {
                ambrosiaLuck1: 90,
                ambrosiaLuck2: 50,
            },
        },

        ambrosiaLuck4: {
            costPerLevel: 250000,
            maxLevel: 50,
            ignoreEXALT: false,
            costFormula: (n: number, cpl: number): number => cpl + 20000 * n,
            effects: (n: number) => {
                const digits =
                    this.#getLifetimeAmbrosiaLogSum();
                return {
                    ambrosiaLuckPercentage: (1 / 10000) * digits * n,
                };
            },
            extraLevelCalc: () => this.getRedAmbrosiaUpgradeEffects('freeLevelsRow2').freeLevels,
            prerequisites: {
                ambrosiaLuck3: 100,
            },
        },

        ambrosiaPatreon: {
            costPerLevel: 1,
            maxLevel: 1,
            ignoreEXALT: false,
            costFormula: (n: number, cpl: number): number =>
                cpl * ((n + 1) ** 2 - n ** 2),
            effects: (n: number) => {
                const me = this.#api.getMeData();
                const quarkBonus = me
                    ? 100 * (1 + (me.globalBonus ?? 0) / 100) * (1 + (me.bonus.quark ?? 0) / 100) - 100
                    : 0;
                const val = 1 + (n * quarkBonus) / 100;
                return {
                    blueberryGeneration: val,
                };
            },
            extraLevelCalc: () => 0,
        },

        ambrosiaObtainium1: {
            costPerLevel: 50000,
            maxLevel: 2,
            ignoreEXALT: false,
            costFormula: (n: number, cpl: number): number => cpl * 25 ** n,
            effects: (n: number) => {
                const { luckTotal } = this.#api.luck.calculateLuck(true) as { luckTotal: number };
                return {
                    luckMult: n / 1000,
                    obtainiumMult: 1 + n * luckTotal / 1000,
                };
            },
            extraLevelCalc: () => 0,
        },

        ambrosiaOffering1: {
            costPerLevel: 50000,
            maxLevel: 2,
            ignoreEXALT: false,
            costFormula: (n: number, cpl: number): number => cpl * 25 ** n,
            effects: (n: number) => {
                const luck = this.#api.luck.calculateLuck() as { luckTotal: number };
                return {
                    luckMult: n / 1000,
                    offeringMult: 1 + n * luck.luckTotal / 1000,
                };
            },
            extraLevelCalc: () => 0,
        },

        ambrosiaHyperflux: {
            costPerLevel: 33333,
            maxLevel: 7,
            ignoreEXALT: false,
            costFormula: (n: number, cpl: number): number =>
                (cpl + 33333 * Math.min(4, n)) * Math.max(1, 3 ** (n - 4)),
            effects: (n: number) => {
                const fourByFourBase = n;
                return {
                    hyperFlux: Math.pow(
                        1 + 1 / 100 * fourByFourBase,
                        this.#api.getGameData()?.platonicUpgrades[19] ?? 0,
                    ),
                };
            },
            extraLevelCalc: () => 0,
        },

        ambrosiaBaseOffering1: {
            costPerLevel: 5,
            maxLevel: 40,
            ignoreEXALT: false,
            costFormula: (n: number, cpl: number): number =>
                cpl * ((n + 1) ** 3 - n ** 3),
            effects: (n: number) => ({
                offering: n,
            }),
            extraLevelCalc: () => this.getRedAmbrosiaUpgradeEffects('freeLevelsRow3').freeLevels,
        },

        ambrosiaBaseObtainium1: {
            costPerLevel: 40,
            maxLevel: 20,
            ignoreEXALT: false,
            costFormula: (n: number, cpl: number): number =>
                cpl * ((n + 1) ** 3 - n ** 3),
            effects: (n: number) => ({
                obtainium: n,
            }),
            extraLevelCalc: () => this.getRedAmbrosiaUpgradeEffects('freeLevelsRow3').freeLevels,
        },

        ambrosiaBaseOffering2: {
            costPerLevel: 20,
            maxLevel: 60,
            ignoreEXALT: false,
            costFormula: (n: number, cpl: number): number =>
                cpl * ((n + 1) ** 3 - n ** 3),
            effects: (n: number) => ({
                offering: n,
            }),
            extraLevelCalc: () => this.getRedAmbrosiaUpgradeEffects('freeLevelsRow3').freeLevels,
            prerequisites: {
                ambrosiaBaseOffering1: 30,
            },
        },

        ambrosiaBaseObtainium2: {
            costPerLevel: 160,
            maxLevel: 30,
            ignoreEXALT: false,
            costFormula: (n: number, cpl: number): number =>
                cpl * ((n + 1) ** 3 - n ** 3),
            effects: (n: number) => ({
                obtainium: n,
            }),
            extraLevelCalc: () => this.getRedAmbrosiaUpgradeEffects('freeLevelsRow3').freeLevels,
            prerequisites: {
                ambrosiaBaseObtainium1: 15,
            },
        },

        ambrosiaSingReduction1: {
            costPerLevel: 100000,
            maxLevel: 2,
            ignoreEXALT: false,
            costFormula: (n: number, cpl: number): number =>
                cpl * 99 ** n,
            effects: (n: number) => {
                const val = this.#api.getGameData()?.insideSingularityChallenge ? 0 : n;
                return {
                    singularityReduction: val,
                };
            },
            extraLevelCalc: () => 0,
            prerequisites: {
                ambrosiaHyperflux: 4,
            },
        },

        ambrosiaInfiniteShopUpgrades1: {
            costPerLevel: 25000,
            maxLevel: 20,
            ignoreEXALT: false,
            costFormula: (_n: number, cpl: number): number => cpl,
            effects: (n: number) => ({
                freeLevels: n,
            }),
            extraLevelCalc: () => this.getRedAmbrosiaUpgradeEffects('freeLevelsRow3').freeLevels,
            prerequisites: {
                ambrosiaCubes1: 70,
                ambrosiaBaseOffering1: 20,
                ambrosiaBaseObtainium1: 10,
            },
        },

        ambrosiaInfiniteShopUpgrades2: {
            costPerLevel: 75000,
            maxLevel: 20,
            ignoreEXALT: false,
            costFormula: (_n: number, cpl: number): number => cpl,
            effects: (n: number) => ({
                freeLevels: n,
            }),
            extraLevelCalc: () => this.getRedAmbrosiaUpgradeEffects('freeLevelsRow3').freeLevels,
            prerequisites: {
                ambrosiaInfiniteShopUpgrades1: 20,
            },
        },

        ambrosiaSingReduction2: {
            costPerLevel: 1.25e7,
            maxLevel: 2,
            ignoreEXALT: true,
            costFormula: (n: number, cpl: number): number =>
                cpl * 3 ** n,
            effects: (n: number) => {
                const val = this.#api.getGameData()?.insideSingularityChallenge ? n : 0;
                return {
                    singularityReduction: val,
                };
            },
            extraLevelCalc: () => 0,
        },

        ambrosiaTalismanBonusRuneLevel: {
            costPerLevel: 100,
            maxLevel: 100,
            ignoreEXALT: false,
            costFormula: (n: number, cpl: number): number =>
                cpl * ((n + 1) ** 2 - n ** 2),
            effects: (n: number) => ({
                talismanBonusRuneLevel: n / 200,
            }),
            extraLevelCalc: () => this.getRedAmbrosiaUpgradeEffects('freeLevelsRow3').freeLevels,
        },

        ambrosiaRuneOOMBonus: {
            costPerLevel: 2500,
            maxLevel: 100,
            ignoreEXALT: false,
            costFormula: (n: number, cpl: number): number =>
                Math.ceil(cpl * ((n + 1) ** 1.5 - n ** 1.5)),
            effects: (n: number) => ({
                runeOOMBonus: n,
                infiniteAscentOOMBonus: n / 1000,
            }),
            extraLevelCalc: () => this.getRedAmbrosiaUpgradeEffects('freeLevelsRow3').freeLevels,
        },

        ambrosiaBrickOfLead: {
            costPerLevel: 10,
            maxLevel: 25,
            ignoreEXALT: false,
            costFormula: (n: number, cpl: number): number =>
                cpl * (Math.pow(n + 1, 3) - Math.pow(n, 3)),
            effects: (n: number) => ({
                barRequirementMult: 1 / (1 - n / 50),
                additiveLuckMult: n / 50,
                singularitySpeedMult: 1 - n / 100,
                globalSpeedMult: 1 - n / 100,
                ascensionSpeedMult: 1 - n / 100,
            }),
            extraLevelCalc: () => 0,
        },

        ambrosiaFreeLuckUpgrades: {
            costPerLevel: 5000,
            maxLevel: 25,
            ignoreEXALT: false,
            costFormula: (n: number, cpl: number): number =>
                cpl * (Math.pow(n + 1, 2) - Math.pow(n, 2)),
            effects: (n: number) => ({
                freeLuckUpgrades: n,
            }),
            extraLevelCalc: () => this.getRedAmbrosiaUpgradeEffects('freeLevelsRow2').freeLevels,
        },

        ambrosiaFreeGenerationUpgrades: {
            costPerLevel: 5000,
            maxLevel: 5,
            ignoreEXALT: false,
            costFormula: (n: number, cpl: number): number =>
                cpl * (Math.pow(4, n + 1) - Math.pow(4, n)),
            effects: (n: number) => ({
                freeGenerationUpgrades: n,
            }),
            extraLevelCalc: () => this.getRedAmbrosiaUpgradeEffects('freeLevelsRow2').freeLevels,
        },

        ambrosiaFreeRedLuckUpgrades: {
            costPerLevel: 10000,
            maxLevel: 40,
            ignoreEXALT: false,
            costFormula: (n: number, cpl: number): number =>
                cpl * (Math.pow(n + 1, 2) - Math.pow(n, 2)),
            effects: (n: number) => ({
                freeRedLuckUpgrades: n,
            }),
            extraLevelCalc: () => this.getRedAmbrosiaUpgradeEffects('freeLevelsRow2').freeLevels,
            prerequisites: {
                ambrosiaFreeLuckUpgrades: 10,
            },
        },

        ambrosiaFreeQuarkUpgrades: {
            costPerLevel: 25000,
            maxLevel: 10,
            ignoreEXALT: false,
            costFormula: (n: number, cpl: number): number =>
                cpl * (Math.pow(n + 1, 3) - Math.pow(n, 3)),
            effects: (n: number) => ({
                freeQuarkUpgrades: n / 10,
            }),
            extraLevelCalc: () => this.getRedAmbrosiaUpgradeEffects('freeLevelsRow5').freeLevels,
        },

        ambrosiaQuarks4: {
            costPerLevel: 300_000,
            maxLevel: 100,
            ignoreEXALT: false,
            costFormula: (_n, cpl) => cpl,
            effects: (n) => ({ quarks: 1 + n / 100 }),
            extraLevelCalc: () => this.getRedAmbrosiaUpgradeEffects('freeLevelsRow5').freeLevels,
            prerequisites: { ambrosiaQuarks3: 10 },
        },
        ambrosiaCubes4: {
            costPerLevel: 300_000,
            maxLevel: 50,
            ignoreEXALT: false,
            costFormula: (n, cpl) => cpl + 20_000 * n,
            effects: (n) => ({ cubes: (1 + n / 100) * Math.pow(1.3, Math.floor(n / 5)) }),
            extraLevelCalc: () => this.getRedAmbrosiaUpgradeEffects('freeLevelsRow4').freeLevels,
            prerequisites: { ambrosiaCubes3: 100 },
        },
        ambrosiaFreeCubeUpgrades: {
            costPerLevel: 10_000,
            maxLevel: 30,
            ignoreEXALT: false,
            costFormula: (n, cpl) => cpl * (Math.pow(n + 1, 2) - Math.pow(n, 2)),
            effects: (n) => ({ freeCubeUpgrades: n }),
            extraLevelCalc: () => this.getRedAmbrosiaUpgradeEffects('freeLevelsRow4').freeLevels,
            prerequisites: { ambrosiaCubes2: 100 },
        },
        ambrosiaFreeObtainiumUpgrades: {
            costPerLevel: 4_000,
            maxLevel: 50,
            ignoreEXALT: false,
            costFormula: (n, cpl) => cpl * (Math.pow(n + 1, 2) - Math.pow(n, 2)),
            effects: (n) => ({ freeObtainiumUpgrades: n }),
            extraLevelCalc: () => this.getRedAmbrosiaUpgradeEffects('freeLevelsRow3').freeLevels,
            prerequisites: { ambrosiaBaseObtainium1: 20, ambrosiaBaseObtainium2: 30 },
        },
        ambrosiaFreeOfferingUpgrades: {
            costPerLevel: 4_000,
            maxLevel: 50,
            ignoreEXALT: false,
            costFormula: (n, cpl) => cpl * (Math.pow(n + 1, 2) - Math.pow(n, 2)),
            effects: (n) => ({ freeOfferingUpgrades: n }),
            extraLevelCalc: () => this.getRedAmbrosiaUpgradeEffects('freeLevelsRow3').freeLevels,
            prerequisites: { ambrosiaBaseOffering1: 30, ambrosiaBaseOffering2: 60 },
        },
        ambrosiaInfiniteShopUpgrades3: {
            costPerLevel: 500_000,
            maxLevel: 20,
            ignoreEXALT: false,
            costFormula: (_n, cpl) => cpl,
            effects: (n) => ({ freeLevels: n }),
            extraLevelCalc: () => this.getRedAmbrosiaUpgradeEffects('freeLevelsRow3').freeLevels,
            prerequisites: { ambrosiaInfiniteShopUpgrades2: 20 },
        },
        twoMind: {
            costPerLevel: 0,
            maxLevel: 1,
            ignoreEXALT: false,
            costFormula: () => Number.POSITIVE_INFINITY,
            effects: (n) => ({ twoMindEnabled: n }),
            extraLevelCalc: () => 0,
        },
    };

    getRedAmbrosiaUpgradeEffects = <T extends RedAmbrosiaUpgradeKey>(upgradeKey: T): RedAmbrosiaUpgradeRewards[T] => {
        const currentLevel = this.calculateRedAmbrosiaUpgradeValue(upgradeKey);
        return this.redAmbrosiaUpgradeCalculationCollection[upgradeKey].effects(currentLevel, this.#api.getGameData()) as RedAmbrosiaUpgradeRewards[T];
    };

    #isAmbrosiaUpgradeSuppressed(upgradeKey: AmbrosiaUpgradeNames): boolean {
        const data = this.#api.getGameData();
        if (!data) return true;

        const upgradeConfig = this.ambrosiaUpgradeCalculationCollection[upgradeKey];
        if (AmbrosiaHelper.#EXALT_9_AMBROSIA_UPGRADES.has(upgradeKey)
            && data.singularityChallenges.taxmanLastStand.completions <= 0) return true;

        return (data.singularityChallenges.noAmbrosiaUpgrades.enabled
            || data.singularityChallenges.sadisticPrequel.enabled)
            && !upgradeConfig.ignoreEXALT;
    }

    getAmbrosiaUpgradeEffectiveLevels = <T extends AmbrosiaUpgradeNames>(upgradeKey: T): number => {
        const data = this.#api.getGameData();
        if (!data) return 0;

        if (!(upgradeKey in data.ambrosiaUpgrades)) return 0;
        if (!(upgradeKey in this.ambrosiaUpgradeCalculationCollection)) return 0;

        const effectiveLevels = this.calculateAmbrosiaUpgradeValue(upgradeKey);
        return this.#isAmbrosiaUpgradeSuppressed(upgradeKey) ? 0 : effectiveLevels;
    };

    #getAmbrosiaUpgradeEffectsFreeLevelsOnly = <T extends AmbrosiaUpgradeNames>(upgradeKey: T): AmbrosiaUpgradeRewards[T] => {
        const upgradeConfig = this.ambrosiaUpgradeCalculationCollection[upgradeKey];
        // Purple enchantment levels only become active when the corresponding
        // blueberry upgrade is purchased. A Heater base loadout has no purchased
        // upgrades, so only persistent red-ambrosia row levels belong here.
        const freeLevelCount = this.#isAmbrosiaUpgradeSuppressed(upgradeKey)
            ? 0
            : this.#getAmbrosiaUpgradeRedFreeLevels(upgradeKey);

        const ctx: AmbrosiaUpgradeEffectContext = {
            freeLevelsOnly: true,
            getAmbrosiaUpgradeLevel: (name) => this.#getAmbrosiaUpgradeRedFreeLevels(name),
        };

        return upgradeConfig.effects(freeLevelCount, ctx) as AmbrosiaUpgradeRewards[T];
    };

    #getAmbrosiaUpgradeEffectsNoLevels = <T extends AmbrosiaUpgradeNames>(upgradeKey: T): AmbrosiaUpgradeRewards[T] => {
        const upgradeConfig = this.ambrosiaUpgradeCalculationCollection[upgradeKey];
        const ctx: AmbrosiaUpgradeEffectContext = {
            freeLevelsOnly: true,
            getAmbrosiaUpgradeLevel: () => 0,
        };
        return upgradeConfig.effects(0, ctx) as AmbrosiaUpgradeRewards[T];
    };

    getAmbrosiaUpgradeEffects = <T extends AmbrosiaUpgradeNames>(upgradeKey: T, mode: CalculationMode = 'normal'): AmbrosiaUpgradeRewards[T] => {
        if (mode === 'true_base') return this.#getAmbrosiaUpgradeEffectsFreeLevelsOnly(upgradeKey);
        if (mode === 'non_ambrosia') return this.#getAmbrosiaUpgradeEffectsNoLevels(upgradeKey);
        return this.ambrosiaUpgradeCalculationCollection[upgradeKey]
            .effects(this.getAmbrosiaUpgradeEffectiveLevels(upgradeKey)) as AmbrosiaUpgradeRewards[T];
    };

    /**
     * An upgrade's effects as if this many of its levels were bought (above its maximum: the maximum), the rest
     * of the save unchanged: its free levels, and an Exalt turning it off. Only for an upgrade whose effect
     * reads no other upgrade's level.
     */
    getAmbrosiaUpgradeEffectsAtLevel = <T extends AmbrosiaUpgradeNames>(upgradeKey: T, purchasedLevel: number): AmbrosiaUpgradeRewards[T] => {
        const upgradeConfig = this.ambrosiaUpgradeCalculationCollection[upgradeKey];
        const level = Math.min(upgradeConfig.maxLevel, Math.max(0, Math.floor(purchasedLevel)));
        const effectiveLevels = this.#isAmbrosiaUpgradeSuppressed(upgradeKey)
            ? 0
            : level + this.#getAmbrosiaUpgradeExtraLevels(upgradeKey, level);
        return upgradeConfig.effects(effectiveLevels) as AmbrosiaUpgradeRewards[T];
    };

    calculateAmbrosiaGenerationShopUpgrade(reduce_vals = true, trueBaseOrMode: boolean | CalculationMode = false) {
        const data = this.#api.getGameData();
        if (!data) return 0;

        const mode: CalculationMode = typeof trueBaseOrMode === 'string'
            ? trueBaseOrMode
            : trueBaseOrMode ? 'true_base' : 'normal';
        const cacheName = (`AmbrosiaGenerationShopUpgrade${mode === 'true_base' ? '_TRUE_BASE' : mode === 'non_ambrosia' ? '_NO_AMB' : ''}`) as keyof CalculationCache;
        const calculationVars: number[] = [
            data.shopUpgrades.shopAmbrosiaGeneration1,
            data.shopUpgrades.shopAmbrosiaGeneration2,
            data.shopUpgrades.shopAmbrosiaGeneration3,
            data.shopUpgrades.shopAmbrosiaGeneration4,
            data.ambrosiaUpgrades.ambrosiaFreeGenerationUpgrades.ambrosiaInvested,
            data.ambrosiaUpgrades.ambrosiaFreeGenerationUpgrades.purpleAmbrosiaInvested ?? 0,
            data.redAmbrosiaUpgrades.freeLevelsRow2,
            data.singularityChallenges.noAmbrosiaUpgrades.enabled ? 1 : 0,
            data.singularityChallenges.sadisticPrequel.enabled ? 1 : 0,
            mode === 'normal' ? 0 : mode === 'true_base' ? 1 : 2,
        ];

        const calculateVals = (): HSCalculationComponents => {
            const vals: HSCalculationComponents = {
                'Quark Upgrade - Ambrosia Generation I': this.#api.quarkShop.getShopUpgradeEffects('shopAmbrosiaGeneration1', 'ambrosiaGenerationMult', mode) as number,
                'Quark Upgrade - Ambrosia Generation II': this.#api.quarkShop.getShopUpgradeEffects('shopAmbrosiaGeneration2', 'ambrosiaGenerationMult', mode) as number,
                'Quark Upgrade - Ambrosia Generation III': this.#api.quarkShop.getShopUpgradeEffects('shopAmbrosiaGeneration3', 'ambrosiaGenerationMult', mode) as number,
                'Quark Upgrade - Ambrosia Generation IV': this.#api.quarkShop.getShopUpgradeEffects('shopAmbrosiaGeneration4', 'ambrosiaGenerationMult', mode) as number,
            };
            return vals;
        };

        if (!reduce_vals) return calculateVals();
        return this.#api.memoizeCalculation(cacheName, calculationVars, () => Object.values(calculateVals()).reduce((a, b) => a * b, 1));
    }

    calculateAmbrosiaGenerationSingularityUpgrade(reduce_vals = true) {
        const vals: HSCalculationComponents = {
            'Hourglass of Limitlessness': this.#api.goldenQuark.getGQUpgradeEffect('singAmbrosiaGeneration', 'ambrosiaBarSpeedMult'),
            'Hourglass of Importance': this.#api.goldenQuark.getGQUpgradeEffect('singAmbrosiaGeneration2', 'ambrosiaBarSpeedMult'),
            'Hourglass of Significance': this.#api.goldenQuark.getGQUpgradeEffect('singAmbrosiaGeneration3', 'ambrosiaBarSpeedMult'),
            'Hourglass of Fantasy': this.#api.goldenQuark.getGQUpgradeEffect('singAmbrosiaGeneration4', 'ambrosiaBarSpeedMult'),
        };

        const reduced = Object.values(vals).reduce((a, b) => a * b, 1);
        return reduce_vals ? reduced : vals;
    }

    calculateAmbrosiaGenerationOcteractUpgrade(reduce_vals = true) {
        const vals: HSCalculationComponents = {
            'Hourglass of Infinitude': this.#api.octeract.getOcteractUpgradeEffect('octeractAmbrosiaGeneration', 'ambrosiaBarSpeedMult'),
            'Hourglass of Minutiae': this.#api.octeract.getOcteractUpgradeEffect('octeractAmbrosiaGeneration2', 'ambrosiaBarSpeedMult'),
            'Hourglass of Myopathy': this.#api.octeract.getOcteractUpgradeEffect('octeractAmbrosiaGeneration3', 'ambrosiaBarSpeedMult'),
            'Hourglass of Reality': this.#api.octeract.getOcteractUpgradeEffect('octeractAmbrosiaGeneration4', 'ambrosiaBarSpeedMult'),
        };

        const reduced = Object.values(vals).reduce((a, b) => a * b, 1);
        return reduce_vals ? reduced : vals;
    }

    /** Mirrors campaignTokenBonuses.blueberrySpeed in SynergismOfficial/src/Campaign.ts: 2000 tokens and Exalt 1 completed. */
    calculateCampaignAmbrosiaSpeedBonus() {
        const tokens = this.#api.getCampaignData()?.tokens ?? 0;
        const exalt1Completions = this.#api.getGameData()?.singularityChallenges.noSingularityUpgrades.completions ?? 0;
        const cacheName = 'CampaignAmbrosiaSpeedBonus' as keyof CalculationCache;
        const calculationVars: number[] = [tokens, exalt1Completions];
        return this.#api.memoizeCalculation(cacheName, calculationVars, () => {
            let campaignBlueberrySpeedBonus;
            if (tokens < 2000 || exalt1Completions <= 0) {
                campaignBlueberrySpeedBonus = 1;
            } else {
                // usableCampaignTokens: this reward counts at most 40,000 tokens
                const usable = Math.min(tokens, 40_000);
                campaignBlueberrySpeedBonus = 1.01 + 0.02 * 1 / 2000 * Math.min(usable - 2000, 2000)
                    + 0.03 * Math.log10(Math.max(usable, 4000) / 4000);
            }

            return campaignBlueberrySpeedBonus;
        });
    }

    calculateAmbrosiaGenerationSpeed(reduce_vals = true, trueBaseOrMode: boolean | CalculationMode = false) {
        const data = this.#api.getGameData();
        const meBonuses = this.#api.getMeData();
        if (!data) return 0;

        const mode: CalculationMode = typeof trueBaseOrMode === 'string'
            ? trueBaseOrMode
            : trueBaseOrMode ? 'true_base' : 'normal';
        const cacheName = (`AmbrosiaGenerationSpeedRaw${mode === 'true_base' ? '_TRUE_BASE' : mode === 'non_ambrosia' ? '_NO_AMB' : ''}`) as keyof CalculationCache;
        const P_GEN_BUFF_LVL = this.#api.getPCoinUpgradeLevel('AMBROSIA_GENERATION_BUFF');
        const campaignBlueberrySpeedBonus = this.calculateCampaignAmbrosiaSpeedBonus();
        const AMBROSIA_UNLOCKED_GATE = data.singularityChallenges.noSingularityUpgrades.completions > 0 ? 1 : 0;
        const RED_AMB_GEN_1 = this.#api.ambrosia.getRedAmbrosiaUpgradeEffects('blueberryGenerationSpeed').blueberryGenerationSpeed;
        const RED_AMB_GEN_2 = this.#api.ambrosia.getRedAmbrosiaUpgradeEffects('blueberryGenerationSpeed2').blueberryGenerationSpeed;
        const ambrosiaGenerationShopUpgrade = this.calculateAmbrosiaGenerationShopUpgrade(true, mode) as number;
        const ambrosiaGenerationSingularityUpgrade = this.calculateAmbrosiaGenerationSingularityUpgrade(true) as number;
        const ambrosiaGenerationOcteractUpgrade = this.calculateAmbrosiaGenerationOcteractUpgrade(true) as number;
        const ambrosiaPatreonBlueberryGeneration = mode === 'normal'
            ? this.#api.ambrosia.getAmbrosiaUpgradeEffects('ambrosiaPatreon').blueberryGeneration
            : 1;
        const panthemaAmbrosiaGenerationMult = this.#api.quarkShop.getShopUpgradeEffects('shopPanthema', 'ambrosiaGenerationMult', mode) as number;
        const oneChallengeCap = this.#api.getSingularityChallengeEffect('oneChallengeCap', 'blueberrySpeedMult');
        const noAmbrosiaUpgrades = this.#api.getSingularityChallengeEffect('noAmbrosiaUpgrades', 'blueberrySpeedMult');
        const eventBlueberryTimeBuff = this.#api.isEventActive() ? 1 + this.#api.calculateEventSourceBuff(EventBuffType.BlueberryTime) : 1;
        const cookie76Bonus = 1 + 0.02 * (data.cubeUpgrades[76] ?? 0);
        const purpleTutorial = this.#api.purple.getPurpleReactorUpgradeEffects('tutorial', 'ambrosiaGeneration');
        const lifetimePurpleHoney = this.#api.purple.getPurpleReactorUpgradeEffects('lifetimeHoneyAmbrosia', 'ambrosiaGenerationSpeed');
        const purpleAries = this.#api.purple.getPurpleAmbrosiaUpgradeEffects('aries', 'universalBarPointMult');

        const calculationVars: number[] = [
            AMBROSIA_UNLOCKED_GATE,
            P_GEN_BUFF_LVL,
            campaignBlueberrySpeedBonus,
            meBonuses?.globalBonus ?? 0,
            meBonuses?.bonus?.quark ?? 0,
            RED_AMB_GEN_1,
            RED_AMB_GEN_2,
            data.shopUpgrades.shopAmbrosiaGeneration1,
            data.shopUpgrades.shopAmbrosiaGeneration2,
            data.shopUpgrades.shopAmbrosiaGeneration3,
            data.shopUpgrades.shopAmbrosiaGeneration4,
            data.ambrosiaUpgrades.ambrosiaFreeGenerationUpgrades.ambrosiaInvested,
            data.ambrosiaUpgrades.ambrosiaFreeGenerationUpgrades.purpleAmbrosiaInvested ?? 0,
            data.redAmbrosiaUpgrades.freeLevelsRow2,
            data.singularityChallenges.noAmbrosiaUpgrades.enabled ? 1 : 0,
            data.singularityChallenges.sadisticPrequel.enabled ? 1 : 0,
            data.goldenQuarkUpgrades.singAmbrosiaGeneration.goldenQuarksInvested,
            data.goldenQuarkUpgrades.singAmbrosiaGeneration2.goldenQuarksInvested,
            data.goldenQuarkUpgrades.singAmbrosiaGeneration3.goldenQuarksInvested,
            data.goldenQuarkUpgrades.singAmbrosiaGeneration4.goldenQuarksInvested,
            // Daily free levels can now change these four upgrades without
            // changing their purchased investment.
            ambrosiaGenerationSingularityUpgrade,
            data.octUpgrades.octeractAmbrosiaGeneration.octeractsInvested,
            data.octUpgrades.octeractAmbrosiaGeneration2.octeractsInvested,
            data.octUpgrades.octeractAmbrosiaGeneration3.octeractsInvested,
            data.octUpgrades.octeractAmbrosiaGeneration4.octeractsInvested,
            ambrosiaGenerationOcteractUpgrade,
            this.#api.ambrosia.getAmbrosiaUpgradeEffects('ambrosiaPatreon').blueberryGeneration,
            oneChallengeCap,
            noAmbrosiaUpgrades,
            data.cubeUpgrades[76] ?? 0,
            data.lifetimeAmbrosia,
            this.#api.quarkShop.getShopUpgradeEffects('shopCashGrabUltra', 'ambrosiaGenerationMult') as number,
            data.shopUpgrades.shopPanthema,
            this.#api.isEventActive() ? 1 : 0,
            eventBlueberryTimeBuff,
            data.purpleReactorUpgrades?.tutorial ?? 0,
            data.purpleReactorUpgrades?.lifetimeHoneyAmbrosia ?? 0,
            data.purpleReactor?.lifetimePurpleHoney ?? 0,
            data.purpleAmbrosiaUpgrades?.aries ?? 0,
            data.lifetimePurpleAmbrosia ?? 0,
            mode === 'normal' ? 0 : mode === 'true_base' ? 1 : 2,
        ];

        const calculateVals = (): HSCalculationComponents => {
            const vals: HSCalculationComponents = {
                'Default Per Second': AMBROSIA_UNLOCKED_GATE,
                'PseudoCoin Upgrade': P_GEN_BUFF_LVL ? 1 + P_GEN_BUFF_LVL * 0.05 : 1,
                'Campaign Bonus': campaignBlueberrySpeedBonus,
                'Quark Upgrades (I-IV)': ambrosiaGenerationShopUpgrade,
                'Golden Quark Upgrades (I-IV)': ambrosiaGenerationSingularityUpgrade,
                'Octeract Upgrades (I-IV)': ambrosiaGenerationOcteractUpgrade,
                'Ambrosia - Shameless, Ambrosial Subscriber Advertisement': ambrosiaPatreonBlueberryGeneration,
                'The Jack of all Trades': panthemaAmbrosiaGenerationMult,
                'EXALT - One Challenge Caps': oneChallengeCap,
                'EXALT - No Ambrosia Effects': noAmbrosiaUpgrades,
                'Red Ambrosia - The Sands of Time': RED_AMB_GEN_1,
                'Red Ambrosia - The Sands of Time II': RED_AMB_GEN_2,
                'Cookie Upgrade 26 (Cx26)': cookie76Bonus,
                'Cash Grab ULTRA Blueberry Bonus': this.#api.quarkShop.getShopUpgradeEffects('shopCashGrabUltra', 'ambrosiaGenerationMult') as number,
                "Purple Honey - The Purple Guy's Greeting": purpleTutorial,
                'Event Bonus': eventBlueberryTimeBuff,
                'Lifetime Purple Honey Power': lifetimePurpleHoney,
                'Purple Ambrosia - Aries': purpleAries,
            };
            return vals;
        };

        if (!reduce_vals) return calculateVals();
        return this.#api.memoizeCalculation(cacheName, calculationVars, () => Object.values(calculateVals()).reduce((a, b) => a * b, 1));
    }

    // Mirrors allRedAmbrosiaGenerationSpeedStats in SynergismOfficial/src/Statistics.ts.
    calculateRedAmbrosiaGenerationSpeed(reduce_vals = true, trueBaseOrMode: boolean | CalculationMode = false) {
        const data = this.#api.getGameData();
        if (!data) return 0;

        const mode: CalculationMode = typeof trueBaseOrMode === 'string'
            ? trueBaseOrMode
            : trueBaseOrMode ? 'true_base' : 'normal';

        const synergismLevel = this.#api.calculateSynergismLevel();
        const vals: HSCalculationComponents = {
            'Default Per Second': data.singularityChallenges.noAmbrosiaUpgrades.completions > 0 ? 1 : 0,
            'Cookie Upgrade 26 (Cx26)': 1 + 0.02 * (data.cubeUpgrades[76] ?? 0),
            'PseudoCoin Upgrade': 1 + 0.05 * this.#api.getPCoinUpgradeLevel('RED_GENERATION_BUFF'),
            'Synergism Level Reward': synergismLevel >= 280 ? 1 + 0.01 * (synergismLevel - 279) : 1,
            'Ambrosia - Shameless, Ambrosial Subscriber Advertisement': mode === 'normal'
                ? this.#api.ambrosia.getAmbrosiaUpgradeEffects('ambrosiaPatreon').blueberryGeneration
                : 1,
            'Red Ambrosia - Millennium-Aged Red Ambrosia': this.getRedAmbrosiaUpgradeEffects('redGenerationSpeed').redAmbrosiaGenerationSpeed,
            'Red Ambrosia - Era of Red Ambrosia': this.getRedAmbrosiaUpgradeEffects('redGenerationSpeed2').redAmbrosiaGenerationSpeed,
            'Red Ambrosia - The Sands of Time': this.getRedAmbrosiaUpgradeEffects('blueberryGenerationSpeed').blueberryGenerationSpeed,
            'Red Ambrosia - The Sands of Time II': this.getRedAmbrosiaUpgradeEffects('blueberryGenerationSpeed2').blueberryGenerationSpeed,
            'EXALT - No Ambrosia Effects': this.#api.getSingularityChallengeEffect('noAmbrosiaUpgrades', 'redSpeedMult'),
            "Purple Honey - The Purple Guy's Greeting": this.#api.purple.getPurpleReactorUpgradeEffects('tutorial', 'redAmbrosiaGeneration'),
            'Lifetime Purple Honey Power': this.#api.purple.getPurpleReactorUpgradeEffects('lifetimeHoneyRedAmbrosia', 'redAmbrosiaGenerationSpeed'),
            'Purple Ambrosia - Aries': this.#api.purple.getPurpleAmbrosiaUpgradeEffects('aries', 'universalBarPointMult'),
            'Number of Blueberries Owned': this.calculateBlueberryInventory(true) as number,
        };
        const reduced = Object.values(vals).reduce((a, b) => a * b, 1);
        return reduce_vals ? reduced : vals;
    }

    calculateAmbrosiaBarIncome(): AmbrosiaBarIncome | null {
        const data = this.#api.getGameData();
        if (!data) return null;

        const blueRequirementWithoutTwoMind = this.calculateRequiredBlueberryTime(true);
        const redRequirementWithoutTwoMind = this.calculateRequiredRedAmbrosiaTime(true);
        const purpleRequirementWithoutTwoMind = this.calculatePurpleHoneyConversionFactor(true);
        if (!(blueRequirementWithoutTwoMind > 0
            && redRequirementWithoutTwoMind > 0
            && purpleRequirementWithoutTwoMind > 0)) {
            return null;
        }

        const purpleCapacityUpgradeKeys = [
            'purpleCapacityExpander1',
            'purpleCapacityExpander2',
            'purpleCapacityExpander3',
            'purpleCapacityExpander4',
        ] as const;
        const encabulatorUpgradeKeys = [
            'purpleHalfLife1',
            'purpleHalfLife2',
            'purpleHalfLife3',
            'purpleHalfLife4',
        ] as const;
        const luck = this.#api.luck.calculateLuck(true) as { luckTotal: number };
        const bluePointsPerSecond = (this.calculateAmbrosiaGenerationSpeed(true) as number)
            * (this.calculateBlueberryInventory(true) as number);
        const reactorData = data.purpleReactor;

        return calculateAmbrosiaBarIncome({
            reactor: {
                blueRoutingPercent: Number(reactorData?.ambrosiaBarPointPercentage ?? 0),
                redRoutingPercent: Number(reactorData?.redAmbrosiaBarPointPercentage ?? 0),
                blueStoredPoints: Number(reactorData?.storedAmbrosiaBarPoints ?? 0),
                redStoredPoints: Number(reactorData?.storedRedAmbrosiaBarPoints ?? 0),
                blueCapacity: 1_000_000_000
                    + 250_000_000 * this.#api.getPCoinUpgradeLevel('PURPLE_REACTOR_CAPACITY_BUFF')
                    + purpleCapacityUpgradeKeys.reduce(
                        (total, key) => total + this.#api.purple.getPurpleReactorUpgradeEffects(key, 'ambrosiaCapacity'),
                        0
                    ),
                encabulatorSpeed: 12 + encabulatorUpgradeKeys.reduce(
                    (total, key) => total + this.#api.purple.getPurpleReactorUpgradeEffects(key, 'encabulatorSpeed'),
                    0
                ),
                purpleRequirementWithoutTwoMind,
                cancerPurplePointsPerBlueOrRedFill: this.#api.purple.getPurpleAmbrosiaUpgradeEffects('cancer', 'purpleBarPointsOnFill'),
                purpleFillBluePoints: this.#api.purple.getPurpleAmbrosiaUpgradeEffects('gemini', 'ambrosiaBarPointsOnFill')
                    + Number(this.#api.quarkShop.getShopUpgradeEffects('shopPurpleBarRebate', 'ambrosiaBarPointsPerFill')),
                purpleFillRedPoints: this.#api.purple.getPurpleAmbrosiaUpgradeEffects('gemini', 'redAmbrosiaBarPointsOnFill')
                    + Number(this.#api.quarkShop.getShopUpgradeEffects('shopPurpleBarRebate', 'redAmbrosiaBarPointsPerFill')),
                scorpioConversionMultiplier: this.#api.purple.getPurpleAmbrosiaUpgradeEffects('scorpio', 'purpleReactorConversionMult'),
                ariesBarPointMultiplier: this.#api.purple.getPurpleAmbrosiaUpgradeEffects('aries', 'universalBarPointMult'),
                overcapEnabled: Boolean(data.encabulatorOvercapToggle
                    && this.#api.purple.getPurpleAmbrosiaUpgradeEffects('libra', 'overcapToggleUnlocked')),
                barDependenceEnabled: Boolean(data.singularityChallenges.barDependence.enabled),
            },
            bluePointsPerSecond,
            redPointsPerSecond: this.calculateRedAmbrosiaGenerationSpeed(true) as number,
            blueRequirementWithoutTwoMind,
            redRequirementWithoutTwoMind,
            blueLuck: Number(luck.luckTotal),
            redLuck: this.#api.luck.calculateRedAmbrosiaLuck() as number,
            purpleHoneyLuck: this.#api.purple.calculatePurpleHoneyLuck(),
            purpleHoneyPerExtraction: this.#api.purple.calculatePurpleHoneyPerExtraction(),
            flatAmbrosiaPerBlueFill: Number(this.#api.getSingularityChallengeEffect('noAmbrosiaUpgrades', 'bonusAmbrosia')),
            acceleratorSecondsPerRedAmbrosia: Number(
                this.#api.ambrosia.getRedAmbrosiaUpgradeEffects('redAmbrosiaAccelerator').ambrosiaTimePerRedAmbrosia
            ),
            twoMind: Boolean(this.getAmbrosiaUpgradeEffects('twoMind').twoMindEnabled),
        });
    }

    calculateRequiredBlueberryTime(ignoreTwoMind = false, ignoreBrickOfLead = false) {
        const data = this.#api.getGameData();
        if (!data) return 0;
        const barDependence = this.#getBarDependence(data);
        const twoMindEnabled = !ignoreTwoMind && this.#isTwoMindEnabled(data);
        const cacheName = (`RequiredBlueberryTime${ignoreTwoMind ? '_IGNORE_TWO_MIND' : ''}${ignoreBrickOfLead ? '_IGNORE_BRICK' : ''}`) as keyof CalculationCache;
        const timePerAmbrosia = HSGlobal.HSAmbrosia.TIME_PER_AMBROSIA; // Currently 45

        const calculationVars: number[] = [
            data.lifetimeAmbrosia,
            data.shopUpgrades.shopAmbrosiaAccelerator,
            data.singularityChallenges.noAmbrosiaUpgrades.completions,
            data.ambrosiaUpgrades.ambrosiaBrickOfLead.ambrosiaInvested,
            data.ambrosiaUpgrades.ambrosiaBrickOfLead.purpleAmbrosiaInvested ?? 0,
            data.singularityChallenges.noAmbrosiaUpgrades.enabled ? 1 : 0,
            data.singularityChallenges.sadisticPrequel.enabled ? 1 : 0,
            twoMindEnabled ? 1 : 0,
            ignoreBrickOfLead ? 1 : 0,
            barDependence.enabled ? 1 : 0,
            barDependence.completions,
        ];

        return this.#api.memoizeCalculation(cacheName, calculationVars, () => {
            if (twoMindEnabled) {
                return 10_000_000;
            }

            if (barDependence.enabled) {
                return Math.max(
                    25_000_000,
                    1.5e15 * (barDependence.completions + 1) / (data.lifetimeAmbrosia + 1)
                );
            }

            let val = timePerAmbrosia;
            val += Math.floor((data.lifetimeAmbrosia / 300));

            const acceleratorMult = this.#api.quarkShop.getShopUpgradeEffects('shopAmbrosiaAccelerator', 'ambrosiaPointRequirementMult') as number;
            const brickOfLeadMult = ignoreBrickOfLead
                ? 1
                : this.getAmbrosiaUpgradeEffects('ambrosiaBrickOfLead').barRequirementMult;

            val *= acceleratorMult;
            val *= brickOfLeadMult;

            if (data.lifetimeAmbrosia >= 10000) {
                const extraScalingPower = Math.log10(4);
                val *= Math.pow(data.lifetimeAmbrosia / 10000, extraScalingPower);
                val = Math.ceil(val);
            }

            return val;
        });
    }

    calculateRequiredRedAmbrosiaTime(ignoreTwoMind = false) {
        const data = this.#api.getGameData();
        if (!data) return 0;
        const barDependence = this.#getBarDependence(data);
        const twoMindEnabled = !ignoreTwoMind && this.#isTwoMindEnabled(data);

        const cacheName = (`RequiredRedAmbrosiaTime${ignoreTwoMind ? '_IGNORE_TWO_MIND' : ''}`) as keyof CalculationCache;
        const calculationVars: number[] = [
            data.lifetimeRedAmbrosia,
            data.singularityChallenges.limitedTime.completions,
            twoMindEnabled ? 1 : 0,
            barDependence.enabled ? 1 : 0,
            barDependence.completions,
        ];

        return this.#api.memoizeCalculation(cacheName, calculationVars, () => {
            if (twoMindEnabled) {
                return 7_500;
            }

            if (barDependence.enabled) {
                return Math.max(
                    7_500,
                    2e11 * (barDependence.completions + 1) / (data.lifetimeRedAmbrosia + 1)
                );
            }

            const redBarRequirementMultiplier = this.#api.getSingularityChallengeEffect('limitedTime', 'barRequirementMultiplier');

            let val = HSGlobal.HSAmbrosia.TIME_PER_RED_AMBROSIA;
            val += 2 * data.lifetimeRedAmbrosia;

            const max = 1e4 * +redBarRequirementMultiplier;
            val *= +redBarRequirementMultiplier;

            const reduced = Math.min(max, val);
            return reduced;
        });
    }

    calculatePurpleHoneyConversionFactor(ignoreTwoMind = false) {
        const data = this.#api.getGameData() as (GameData & {
            purpleHoneyProgress?: number;
            purpleReactor?: {
                purpleHoney?: number;
                lifetimePurpleHoney?: number;
            };
            purpleReactorUpgrades?: Record<string, number>;
        }) | undefined;
        if (!data) return 0;

        if (!ignoreTwoMind && this.#isTwoMindEnabled(data)) {
            return 125_000;
        }

        const barDependence = this.#getBarDependence(data);
        const lifetimePurpleHoney = data.purpleReactor?.lifetimePurpleHoney ?? 0;

        if (barDependence.enabled) {
            return Math.max(
                150_000,
                1e10 * Math.pow(barDependence.completions + 1, 2) / Math.max(1, lifetimePurpleHoney)
            );
        }

        const requirementReduction = [
            this.#api.purple.getPurpleReactorUpgradeEffects('purpleHoneyRequirementReduction1', 'purpleHoneyRequirementMult'),
            this.#api.purple.getPurpleReactorUpgradeEffects('purpleHoneyRequirementReduction2', 'purpleHoneyRequirementMult'),
            this.#api.purple.getPurpleReactorUpgradeEffects('purpleHoneyRequirementReduction3', 'purpleHoneyRequirementMult'),
            this.#api.purple.getPurpleReactorUpgradeEffects('purpleHoneyRequirementReduction4', 'purpleHoneyRequirementMult'),
        ].reduce((a, b) => a * b, 1);
        const singularitySizeMultiplier = 1
            - Math.max(0, Math.floor((data.highestSingularityCount - 280) / 2) / 100);
        const taxmanLastStandMultiplier = this.#api.getSingularityChallengeEffect(
            'taxmanLastStand',
            'purpleBarSize'
        );

        return 250_000
            * singularitySizeMultiplier
            * requirementReduction
            * taxmanLastStandMultiplier;
    }

    calculateNumberOfThresholds() {
        const data = this.#api.getGameData();
        if (!data) return 0;
        const cacheName = 'NumberOfThresholds' as keyof CalculationCache;
        const digitReduction = HSGlobal.HSAmbrosia.digitReduction;

        const calculationVars: number[] = [
            data.lifetimeAmbrosia,
        ];

        return this.#api.memoizeCalculation(cacheName, calculationVars, () => {
            const numDigits = data.lifetimeAmbrosia > 0 ? 1 + Math.floor(Math.log10(data.lifetimeAmbrosia)) : 0;
            const matissa = Math.floor(data.lifetimeAmbrosia / Math.pow(10, numDigits - 1));

            const extraReduction = matissa >= 3 ? 1 : 0;
            const reduced = Math.max(0, 2 * (numDigits - digitReduction) - 1 + extraReduction);

            return reduced;
        });
    }

    calculateToNextThreshold() {
        const data = this.#api.getGameData();
        if (!data) return 0;
        const cacheName = 'ToNextThreshold' as keyof CalculationCache;
        const digitReduction = HSGlobal.HSAmbrosia.digitReduction;

        const calculationVars: number[] = [
            data.lifetimeAmbrosia,
        ];

        return this.#api.memoizeCalculation(cacheName, calculationVars, () => {
            const numThresholds = this.calculateNumberOfThresholds();
            let val;

            if (numThresholds === 0) {
                val = 10000 - data.lifetimeAmbrosia;
            } else {
                if (numThresholds % 2 === 0) {
                    val = Math.pow(10, numThresholds / 2 + digitReduction) - data.lifetimeAmbrosia;
                } else {
                    val = 3 * Math.pow(10, (numThresholds - 1) / 2 + digitReduction) - data.lifetimeAmbrosia;
                }
            }

            return val;
        });
    }

    calculateAmbrosiaUpgradeValue(upgradeName: AmbrosiaUpgradeNames, freeLevelsOnly = false) {
        const data = this.#api.getGameData();
        if (!data) return 0;
        const cacheName = this.#getAmbrosiaUpgradeCacheName(upgradeName, freeLevelsOnly);

        if (!(upgradeName in data.ambrosiaUpgrades)) return 0;
        if (!(upgradeName in this.ambrosiaUpgradeCalculationCollection)) return 0;

        if (upgradeName === 'twoMind') {
            return this.#isTwoMindEnabled(data) ? 1 : 0;
        }

        const investmentParameters = this.ambrosiaUpgradeCalculationCollection[upgradeName] as AmbrosiaUpgradeCalculationConfig<any>;
        const purchasedLevel = this.investToAmbrosiaUpgrade(
            0,
            data.ambrosiaUpgrades[upgradeName].ambrosiaInvested,
            investmentParameters.costPerLevel,
            investmentParameters.maxLevel,
            investmentParameters.costFormula,
        );
        const extraLevels = this.#getAmbrosiaUpgradeExtraLevels(upgradeName, purchasedLevel);
        const calculationVars: number[] = [
            data.ambrosiaUpgrades[upgradeName].ambrosiaInvested,
            data.ambrosiaUpgrades[upgradeName].purpleAmbrosiaInvested ?? 0,
            extraLevels,
        ];
        return this.#api.memoizeCalculation(cacheName, calculationVars, () => {
            if (freeLevelsOnly) {
                const reduced = extraLevels;
                return reduced;
            }

            const upgradeValue = purchasedLevel + extraLevels;

            const reduced = upgradeValue;
            return reduced;
        });
    }

    calculateRedAmbrosiaUpgradeValue(upgradeName: keyof RedAmbrosiaUpgrades) {
        const data = this.#api.getGameData();
        if (!data) return 0;
        const cacheName = `REDAMB_${upgradeName}` as keyof CalculationCache;

        if (!(upgradeName in data.redAmbrosiaUpgrades)) return 0;
        if (!(upgradeName in this.redAmbrosiaUpgradeCalculationCollection)) return 0;

        const calculationVars: number[] = [data.redAmbrosiaUpgrades[upgradeName]];
        return this.#api.memoizeCalculation(cacheName, calculationVars, () => {
            const investmentParameters = this.redAmbrosiaUpgradeCalculationCollection[upgradeName];

            const upgradeValue = this.investToRedAmbrosiaUpgrade(
                data.redAmbrosiaUpgrades[upgradeName],
                investmentParameters.costPerLevel,
                investmentParameters.maxLevel,
                investmentParameters.costFunction,
            );

            const reduced = upgradeValue;
            return reduced;
        });
    }

    investToAmbrosiaUpgrade(
        free: number,
        budget: number,
        costPerLevel: number,
        maxLevel: number,
        constFunction: (n: number, cpl: number) => number,
    ) {
        let level = 0;
        let nextCost = constFunction(level, costPerLevel);

        while (budget >= nextCost) {
            budget -= nextCost;
            level += 1;
            nextCost = constFunction(level, costPerLevel);

            if (level >= maxLevel) {
                break;
            }
        }

        level += free;
        return level;
    }

    investToRedAmbrosiaUpgrade(
        budget: number,
        costPerLevel: number,
        maxLevel: number,
        constFunction: (n: number, cpl: number) => number,
    ) {
        let level = 0;
        let nextCost = constFunction(level, costPerLevel);

        while (budget >= nextCost) {
            budget -= nextCost;
            level += 1;
            nextCost = constFunction(level, costPerLevel);

            if (level >= maxLevel) {
                break;
            }
        }

        return level;
    }

    calculateBlueberryInventory(reduce_vals = true): number | HSCalculationComponents {
        const gameData = this.#api.getGameData();
        if (!gameData) return 0;

        const noAmbrosiaFactor = this.#api.getSingularityChallengeEffect('noAmbrosiaUpgrades', 'blueberries');

        const vals: HSCalculationComponents = {
            'EXALT - No Golden Quark Upgrades': +(gameData.singularityChallenges.noSingularityUpgrades.completions > 0) * 3,
            'Golden Quark Upgrade - Blueberries!': this.#api.goldenQuark.getGQUpgradeEffect('blueberries', 'blueberries'),
            'Octeracts - Berries that are Blue!': this.#api.octeract.getOcteractUpgradeEffect('octeractBlueberries', 'blueberries'),
            'Red Ambrosia - Berries that are... blue?': +(this.getRedAmbrosiaUpgradeEffects('blueberries').blueberries),
            'Congealed Blueberries (Singularity Milestones)': this.calculateSingularityMilestoneBlueberries(),
            'EXALT - No Ambrosia Effects': noAmbrosiaFactor,
            'EXALT - Bar Charging': this.#api.getSingularityChallengeEffect('barDependence', 'blueberries'),
        };

        const reduced = Object.values(vals).reduce((a, b) => a + b, 0);
        return reduce_vals ? reduced : vals;
    }

    calculateSingularityMilestoneBlueberries(): number {
        const gameData = this.#api.getGameData();
        if (!gameData) return 0;

        const cacheName = 'SingularityMilestoneBlueberries' as keyof CalculationCache;
        const calculationVars: number[] = [gameData.highestSingularityCount];

        return this.#api.memoizeCalculation(cacheName, calculationVars, () => {
            let val = 0;

            if (gameData.highestSingularityCount >= 270) val = 5;
            else if (gameData.highestSingularityCount >= 256) val = 4;
            else if (gameData.highestSingularityCount >= 192) val = 3;
            else if (gameData.highestSingularityCount >= 128) val = 2;
            else if (gameData.highestSingularityCount >= 64) val = 1;

            const reduced = val;
            return reduced;
        });
    }
}
