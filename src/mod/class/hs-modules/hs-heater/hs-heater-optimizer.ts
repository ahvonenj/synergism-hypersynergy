import type { HeaterOptimizerInput, HeaterOptimizationResult, HeaterRedAmbUpgradeEffects, HeaterResultAffordableRow, HeaterResultRow, HeaterResultRowMatrix, HeaterResultLimits, HeaterResultShortfall, HeaterResultUnaffordableRow, } from "../../../types/data-types/hs-heater-types";
import { applyHeaterBells, formatNumber, HEATER_EFFECT_PAIR_SEPARATOR } from "./hs-heater-utils";
import { HEATER_BRANCH_DEFINITIONS } from "./hs-heater-result-config";
import { createHeaterCoinsC15Evaluator, formatHeaterCoinsC15Effect, heaterCoinsC15LogRatio } from './hs-heater-coins';
import type { HeaterCoinsC15State } from '../../../types/data-types/hs-heater-coins-types';
import { calculateAmbrosiaBarIncome } from '../../hs-core/gds/hs-ambrosia-bar-income';
import type { AmbrosiaBarIncome, AmbrosiaBarIncomeReactor } from '../../../types/data-types/hs-ambrosia-income-types';

// Keep the optimizer bundle independent from DOM/UI modules so it can run in
// a Web Worker. Warnings and errors reach the browser console, and are kept
// until takeHeaterOptimizerLogs() is called: the worker sends them back with
// its answer (thrown errors too), and the runner writes them to the mod's log.
export type HeaterOptimizerLog = { level: 'warn' | 'error'; message: string; context: string };

const PENDING_LOG_LIMIT = 200;
const pendingLogs: HeaterOptimizerLog[] = [];

function keepLog(level: HeaterOptimizerLog['level'], message: string, context: string): void {
    if (pendingLogs.length < PENDING_LOG_LIMIT)
        pendingLogs.push({ level, message, context });
}

const HSLogger = {
    debug: (_message: () => string, _context?: string): void => {},
    warn: (message: string, context = "HSHeaterOptimizer"): void => {
        console.warn(`[${context}]: ${message}`);
        keepLog('warn', message, context);
    },
    error: (message: string, context = "HSHeaterOptimizer"): void => {
        console.error(`[${context}]: ${message}`);
        keepLog('error', message, context);
    },
};

/** The warnings and errors logged since the last call, oldest first. */
export function takeHeaterOptimizerLogs(): HeaterOptimizerLog[] {
    return pendingLogs.splice(0);
}
/*
    This file closely match the script on Rus9384's sheet (credits to him),
    in order to be easily updatable when the sheet updates (and vice-versa...)
    Sheet link: https://docs.google.com/spreadsheets/d/105yoI41lk8UJ2PThTkV0tWKNli5R0K1WuaSphKl13R0/edit?gid=1484254243#gid=1484254243
*/

// ===========================================================================
// Internal state types
// ===========================================================================

interface UpgradeEffectMap {
    luck?:          (input: number, level: number, loadout: Loadout) => number;
    mLuck?:         (input: number, level: number, loadout: Loadout) => number;
    quark?:         (input: number, level: number, loadout: Loadout) => number;
    cube?:          (input: number, level: number, loadout: Loadout, p4x4?: number) => number;
    oct?:           (input: number, level: number, loadout: Loadout) => number;
    speed?:         (input: number, level: number, loadout: Loadout) => number;
    rSpeed?:        (input: number, level: number, loadout: Loadout) => number;
    rLuck?:         (input: number, level: number, loadout: Loadout) => number;
    obt?:           (input: number, level: number, loadout: Loadout) => number;
    off?:           (input: number, level: number, loadout: Loadout) => number;
    mObt?:          (input: number, level: number, loadout: Loadout) => number;
    mOff?:          (input: number, level: number, loadout: Loadout) => number;
    vouchers?:      (input: number, level: number, loadout: Loadout) => number;
    singReduction?: (input: number, level: number, loadout: Loadout) => number;
}

interface UpgradeParameters {
    maxLevel:       number;
    cost:           (level: number) => number;
    effects:        UpgradeEffectMap;
    row:            number;
    blueberryCost:  number;
    prerequisites:  Partial<Record<string, number>>;
    ignoresExalt:   boolean;
    requiresExalt9: boolean;
    costArray?:     number[];
}


// ===========================================================================
// Stats object (mirrors the sheet_script `stats` const, populated from input)
// ===========================================================================

interface Stats {
    amb:             number;
    rAmb:            number;
    bonusAmbrosiaPerFill: number;
    lifetimeAmbExp:  number;
    ambSpeed:        number;
    baseLuck:        number;
    baseMLuck:       number;
    baseRLuck:       number;
    rLuck:           number;
    luckConversion:  number;
    quarks:          number;
    qHept:           number;
    cubeExp:         number;
    rawSing:         number;
    sing:            number;
    exalt:           number;
    exalt9Unlocked:  boolean;
    postAoAG:        boolean;
    oneMindUnlocked: boolean;
    aquariusExponent:number;
    mind:            number;
    aSpeed:          number;
    spread:          number;
    baseObt:         number;
    baseOff:         number;
    blueberries:     number;
    purpleLeoLevel:  number;
    tutorialBonus:   number;
    bonus:           number[];
    runeExp:         number;
    runeCoefSI:      number;
    bonusSI:         number;
    talismanSI:      number;
    runeMultSI:      number;
    baseSI:          number;
    expIA:           number;
    bonusIA:         number;
    talismanIA:      number;
    talismanP:       number;
    baseIACube:      number;
    baseIAQuark:     number;
    patreon:         number;
    voucher:         number;
    voucherRedLevelBaseline: number;
    chronometer:     number;
    shopLuck:        number;
    ossifiedTactics: number;
    ossifiedTactics2:number;
    redberries:      number;
    fusion:          number;
    viscount:        boolean;
    blueBarMaxWithoutTwoMindAndBrick: number;
    blueBarRequirementBeforeRounding: number;
    redBarMaxWithoutTwoMind: number;
    redBarPointsPerSecond: number;
    acceleratorSecondsPerRedAmbrosia: number;
    reactor: HeaterOptimizerInput['reactor'];
    purple: HeaterOptimizerInput['purple'];
    ambrosiaUpgradeBonusLevels: Record<string, number>;
    ambrosiaUpgradeBlueberryCostReductions: Record<string, number>;
    shopUpgradeRawLevels: Record<string, number>;
    shopBonusLevels: HeaterOptimizerInput['shopBonusLevelsNoAmbrosia'];
    panthemaLevel: number;
    tauPower: number;
    shopUpgradesDisabled: boolean;
}


// ===========================================================================
// Options (mirrors the sheet_script `options` const, populated from input)
// ===========================================================================

interface Options {
    calculateAmb:       boolean;
    calculateQuarks:    boolean;
    calculateCubes:     boolean;
    calculateOct:       boolean;
    calculateOff:       boolean;
    calculateObtAndOff: boolean;
    calculateHyperflux: boolean;
    calculateSR:        boolean;
    calculateAmbOct:    boolean;
    calculatePurple:    boolean;
    calculateCoinsC15:  boolean;
}

export type HeaterCubeExperimentUpgrade =
    | "ambrosiaCubes1"
    | "ambrosiaCubes2"
    | "ambrosiaCubes3";

export interface HeaterCubeExperimentConfig {
    /** Retain only the final N affordable raw levels for the selected tiers. */
    cubeLevelWindows?: Partial<Record<HeaterCubeExperimentUpgrade, number>>;
    /** Keep shifted five-level effect breakpoints below the retained window. */
    retainMilestonesBelowWindow?: boolean;
    /** Limit pure-Luck plus Cube/Luck hybrid spending for the Cube objective. */
    maxLuckSpendFraction?: number;
    /** Benchmark-only reference path for validating the fast Offering join. */
    useLegacyOfferingSearch?: boolean;
    /** Benchmark-only reference path for validating the fast Quark join. */
    useLegacyQuarkSearch?: boolean;
    /** Benchmark-only reference path for validating the cached all-Amb merge. */
    useLegacyAllAmbMerge?: boolean;
    /** Benchmark-only reference path for validating independent Singularity tiers. */
    useLegacyHyperfluxMerge?: boolean;
    /** Benchmark-only reference path for validating compact independent merges. */
    useLegacyIndependentMerge?: boolean;
    /** Benchmark-only reference path for the former voucher-tier endpoint shortcut. */
    useLegacyVoucherEndpoints?: boolean;
    /** Benchmark-only check that cached voucher effects match a full evaluation. */
    validateVoucherMergeScores?: boolean;
    /** Benchmark-only check that dependent-chain deltas match a full evaluation. */
    validateChainScores?: boolean;
    /** Benchmark-only: score the current all-Amb frontier by bar income. */
    probeBarIncome?: boolean;
    /** Benchmark-only bounded untrimmed scan to measure exact-search cost. */
    probeRawBarIncome?: boolean;
    /** Benchmark-only comparison with the purchased modules in a game save. */
    probeLoadoutLevels?: Record<string, number>;
}

export interface HeaterCubeExperimentSpending {
    directCube: number;
    pureLuck: number;
    cubeLuckHybrid: number;
    vouchers: number;
    sharedOrOther: number;
    total: number;
}

export interface HeaterCubeExperimentDiagnostics {
    stages: Array<{
        name: string;
        elapsedMs: number;
        sizes: Record<string, number>;
    }>;
    chainTiers: Array<{
        upgrade: string;
        parentCount: number;
        enumeratedLevels: number;
        expandedCount: number;
        frontierCount: number;
        elapsedMs: number;
    }>;
    searchPartitions: Array<{
        leftSize: number;
        rightSize: number;
        variableKeys: string[];
        groupCount: number;
        partitioned: boolean;
    }>;
    cubeWinner?: {
        levels: Record<string, number>;
        cost: number;
        blueberryCost: number;
        effect: number;
        spending: HeaterCubeExperimentSpending;
    };
    barIncomeProbe?: Record<'blue' | 'red' | 'all', {
        levels: Record<string, number>;
        cost: number;
        blueberryCost: number;
        value: number;
    }>;
    emptyLoadoutCheck?: {
        additiveLuckWithoutPurpleLeo: number;
        additiveLuckMultiplier: number;
        luckWithoutPurpleLeo: number;
        redLuckWithoutPurpleLeo: number;
        luckConversion: number;
        blueSpeedMultiplier: number;
        redSpeedMultiplier: number;
    };
    savedLoadoutCheck?: {
        blueBarPointsPerSecond: number;
        redBarPointsPerSecond: number;
        blueLuck: number;
        redLuck: number;
        luckConversion: number;
    };
    elapsedMs: number;
}

// ===========================================================================
// Module-level mutable state (reset on each call to createHeaterOptimizerResultFromInput)
// ===========================================================================

let stats: Stats = {
    amb: 0,
    rAmb: 0,
    bonusAmbrosiaPerFill: 0,
    lifetimeAmbExp: 0,
    ambSpeed: 1,
    baseLuck: 0,
    baseMLuck: 0,
    baseRLuck: 0,
    rLuck: 0,
    luckConversion: 20,
    quarks: 0,
    qHept: 0,
    cubeExp: 0,
    rawSing: 0,
    sing: 0,
    exalt: 0,
    exalt9Unlocked: false,
    postAoAG: false,
    oneMindUnlocked: false,
    aquariusExponent: 0,
    mind: 0.5,
    aSpeed: 1,
    spread: 0,
    baseObt: 1,
    baseOff: 1,
    blueberries: 3,
    purpleLeoLevel: 0,
    tutorialBonus: 0,
    bonus: [0, 0, 0, 0, 0, 0],
    runeExp: 0,
    runeCoefSI: 30,
    bonusSI: 0,
    talismanSI: 0,
    runeMultSI: 1,
    baseSI: 1,
    expIA: 0,
    bonusIA: 0,
    talismanIA: 0,
    talismanP: 1,
    baseIACube: 1,
    baseIAQuark: 1,
    patreon: 0,
    voucher: 0,
    voucherRedLevelBaseline: 0,
    chronometer: 0,
    shopLuck: 0,
    ossifiedTactics: 0,
    redberries: 0,
    fusion: 0,
    viscount: false,
    blueBarMaxWithoutTwoMindAndBrick: 25_000_000,
    blueBarRequirementBeforeRounding: 25_000_000,
    redBarMaxWithoutTwoMind: 7_500,
    redBarPointsPerSecond: 0,
    acceleratorSecondsPerRedAmbrosia: 0,
    reactor: undefined,
    purple: undefined,
    ossifiedTactics2: 0,
    ambrosiaUpgradeBonusLevels: {},
    ambrosiaUpgradeBlueberryCostReductions: {},
    shopUpgradeRawLevels: {},
    shopBonusLevels: {
      offering: 0,
      obtainium: 0,
      cubes: 0,
      speed: 0,
      quark: 0,
      ambrosiaLuck: 0,
      redAmbrosiaLuck: 0,
      ambrosiaGeneration: 0,
      infinity: 0,
    },
    panthemaLevel: 0,
    tauPower: 1,
    shopUpgradesDisabled: false,
};

let options: Options = {
    calculateAmb: false,
    calculateQuarks: false,
    calculateCubes: false,
    calculateOct: false,
    calculateOff: false,
    calculateObtAndOff: false,
    calculateHyperflux: false,
    calculateSR: false,
    calculateAmbOct: false,
    calculatePurple: false,
    calculateCoinsC15: false,
};

let coinsC15Evaluator: ReturnType<typeof createHeaterCoinsC15Evaluator> | undefined;
let coinsC15Baseline: HeaterCoinsC15State | undefined;

let cubeExperimentConfig: HeaterCubeExperimentConfig | undefined;
let cubeExperimentDiagnostics: HeaterCubeExperimentDiagnostics | undefined;

function recordCubeExperimentStage(
  name: string,
  startedAt: number,
  sizes: Record<string, number> = {},
): void {
  cubeExperimentDiagnostics?.stages.push({
    name,
    elapsedMs: experimentNow() - startedAt,
    sizes,
  })
}

let singDebuffCache: { off: number[]; cube: number[] } = {
    off: [],
    cube: []
}

// Computed once per optimizer run.  fixBlueberryUpgrades is called from the
// innermost merge loops, so rebuilding this order for every candidate would
// dominate the actual stat calculations.
let blueberryRemovalOrder: string[] = [];

// The free-level groups each shop upgrade takes (Upgrade.shopLevel)
const SHOP_BONUS_GROUPS_BY_UPGRADE: Readonly<Record<string, ReadonlyArray<keyof Stats['shopBonusLevels']>>> = {
    offeringEX: ['offering'], offeringEX2: ['offering'], offeringEX3: ['offering', 'infinity'],
    obtainiumEX: ['obtainium'], obtainiumEX2: ['obtainium'], obtainiumEX3: ['obtainium', 'infinity'],
    cashGrab: ['offering', 'obtainium'], cashGrab2: ['offering', 'obtainium'],
    seasonPass: ['cubes'], seasonPass2: ['cubes'], seasonPass3: ['cubes'],
    seasonPassY: ['cubes'], seasonPassZ: ['cubes'], seasonPassLost: ['cubes'],
    seasonPassInfinity: ['cubes', 'infinity'], chronometerInfinity: ['speed', 'infinity'],
    improveQuarkHept: ['quark'], improveQuarkHept2: ['quark'],
    improveQuarkHept3: ['quark'], improveQuarkHept4: ['quark'],
    improveQuarkHept5: ['quark', 'infinity'],
    shopAmbrosiaLuck1: ['ambrosiaLuck'], shopAmbrosiaLuck2: ['ambrosiaLuck'],
    shopAmbrosiaLuck3: ['ambrosiaLuck'], shopAmbrosiaLuck4: ['ambrosiaLuck'],
    shopRedLuck1: ['redAmbrosiaLuck'], shopRedLuck2: ['redAmbrosiaLuck'],
    shopRedLuck3: ['redAmbrosiaLuck'], shopRedLuck4: ['redAmbrosiaLuck'],
    shopAmbrosiaGeneration1: ['ambrosiaGeneration'], shopAmbrosiaGeneration2: ['ambrosiaGeneration'],
    shopAmbrosiaGeneration3: ['ambrosiaGeneration'], shopAmbrosiaGeneration4: ['ambrosiaGeneration'],
}

// Upgrade.shopObtainiumMultiplier / shopOfferingMultiplier /
// shopOfferingBaseDelta by free levels and vouchers, emptied at each heat
const shopValueCaches = {
    obtainium: new Map<string, number>(),
    offering: new Map<string, number>(),
    offeringBase: new Map<string, number>(),
}

function cachedShopValue(cache: Map<string, number>, levels: number, vouchers: number, compute: () => number): number {
    const key = `${levels}:${vouchers}`
    let value = cache.get(key)
    if (value === undefined) {
      value = compute()
      cache.set(key, value)
    }
    return value
}

// ===========================================================================
// Upgrade class
// ===========================================================================

class Upgrade {

    maxLevel:       number;
    cost:           (level: number) => number;
    effects:        UpgradeEffectMap;
    row:            number;
    blueberryCost:  number;
    prerequisites:  Partial<Record<string, number>>;
    ignoresExalt:   boolean;
    requiresExalt9: boolean;
    costArray?:     number[];

    constructor(parameters: Partial<UpgradeParameters> = {}) {

        this.maxLevel      = parameters.maxLevel      ?? 0;
        this.cost          = parameters.cost          ?? (() => 0);
        this.effects       = parameters.effects       ?? {};
        this.row           = parameters.row           ?? 0;
        this.blueberryCost = parameters.blueberryCost ?? 0;
        this.prerequisites = parameters.prerequisites ?? {};
        this.ignoresExalt  = parameters.ignoresExalt  ?? false;
        this.requiresExalt9 = parameters.requiresExalt9 ?? false;

        if (parameters.costArray !== undefined) {
            this.costArray = parameters.costArray;
        }

    }

    static singDebuff(sing = 0, stat = ""): number {

      if (stat === "mOff" && singDebuffCache.off[sing] !== undefined)
        return singDebuffCache.off[sing]
      if (stat === "cube" && singDebuffCache.cube[sing] !== undefined)
        return singDebuffCache.cube[sing]

        const effectiveSing = (): number => {
            let eff = sing * Math.min(4.75, 0.075 * sing + 1)
            if(sing > 10)
                eff *= 1.5 * Math.min(4, 0.125 * sing - 0.25)
            if(sing > 25)
                eff *= 2.5 * Math.min(6, 0.06 * sing - 0.5)
            if(sing > 36)
                eff *= 4 * Math.min(5, sing / 18 - 1) * 1.1 ** Math.min(sing - 36, 64)
            if(sing > 50)
                eff *= 5 * Math.min(8, 0.04 * sing - 1) * 1.1 ** Math.min(sing - 50, 50)
            if(sing > 100)
                eff *= 0.08 * sing * 1.1 ** (sing - 100)
            if(sing > 150)
                eff *= 2 * 1.05 ** (sing - 150)
            if(sing > 200)
                eff *= 1.5 * 1.275 ** (sing - 200)
            if(sing > 215)
                eff *= 1.25 * 1.2 ** (sing - 215)
            if(sing > 230)
                eff *= 2
            if(sing > 269)
                eff *= 3 ** (sing - 268)
            return eff
        }

        let effSing = effectiveSing()
        if (stat === "mOff") {
            // SynergismOfficial/src/singularity.ts calculateSingularityDebuff:
            // the Offering/Obtainium penalty, times Global Speed's penalty once
            // (Half Mind, or the reset timer without it)
            let result = 1.02 ** sing
            result *= sing < 150 ? 3 * (Math.sqrt(effSing) + 1) : effSing ** (2 / 3) / 400
            result *= 1 + Math.sqrt(effSing) / 4 // Global Speed
            singDebuffCache.off[sing] = result
            return result
        } else if (stat === "cube") {
            let result = 2 * 1.03 ** Math.max(0, sing - 100)
            if(sing < 150) // Including Ascension Speed due to One Mind
              result = 3 * (1 + (Math.sqrt(effSing) * result) / 4) * (1 + Math.sqrt(effSing) / 5)
            else
              result = 1 + (effSing ** 0.75 * result) / 1000 * (1 + effSing ** 0.75 / 10000)
            singDebuffCache.cube[sing] = result
            return result
        }

        return 1

    }

    static ambrosiaRuneOOMBonusCost() {
      let result = [0]
      for (let level = 1; level <= 100; level++)
        result.push(result[level - 1] + Math.ceil(2500 * (level ** 1.5 - (level - 1) ** 1.5)))
      return result
    }

    // Mirrors SynergismOfficial/src/Runes.ts updateLevelsFromEXP and
    // getRuneEffectiveLevel. Work in log space so exported Decimal EXP values
    // remain stable even when they exceed JavaScript's finite number range.
    static log10OnePlusPower10(exponent: number): number {
      if (exponent === Number.NEGATIVE_INFINITY)
        return 0
      if (exponent > 16)
        return exponent + Math.log10(1 + 10 ** -exponent)
      if (exponent < -323)
        return 0
      return Math.log10(1 + 10 ** exponent)
    }

    static runeLevelSI(runeCoefDelta = 0, talismanPDelta = 0) {
      const purchasedLevel = Math.max(0, Math.floor(
        (stats.runeCoefSI + runeCoefDelta) * this.log10OnePlusPower10(stats.runeExp - 12)
      ))
      const talismanBonus = stats.talismanP > 0
        ? stats.talismanSI * talismanPDelta / stats.talismanP
        : 0
      return (purchasedLevel + stats.bonusSI + talismanBonus) * stats.runeMultSI
    }

    static runeLevelIA(runeCoefDelta = 0, talismanPDelta = 0) {
      const purchasedLevel = Math.max(0, Math.floor(
        (0.5 + runeCoefDelta) * this.log10OnePlusPower10(stats.expIA - 75)
      ))
      const talismanBonus = stats.talismanP > 0
        ? stats.talismanIA * talismanPDelta / stats.talismanP
        : 0
      return purchasedLevel + stats.bonusIA + talismanBonus
    }

    // Mirrors SynergismOfficial/src/Shop.ts getBonusLevels/getShopLevel.
    // A free level only affects a shop upgrade that has at least one bought
    // level. shopPanthema is the sole exception and never receives levels.
    static shopLevel(
      upgrade: string,
      groupDeltas: Partial<Record<keyof Stats['shopBonusLevels'], number>> = {},
      freeUpgradeMultiplier = 1,
    ): number {
      const rawLevel = stats.shopUpgradeRawLevels[upgrade] ?? 0
      if (rawLevel <= 0 || (stats.shopUpgradesDisabled && !upgrade.startsWith('improveQuarkHept')))
        return 0

      const groups = SHOP_BONUS_GROUPS_BY_UPGRADE[upgrade] ?? []
      let bonus = 0
      for (const group of groups)
        bonus += stats.shopBonusLevels[group] + (groupDeltas[group] ?? 0)
      return rawLevel + freeUpgradeMultiplier * bonus
    }

    static totalInfinityLevels(loadout: Loadout): number {
      return stats.shopBonusLevels.infinity + loadout.getStat('vouchers')
    }

    static panthemaInfinityBoost(loadout: Loadout): number {
      return 1 + 0.01 * stats.panthemaLevel * this.totalInfinityLevels(loadout)
    }

    static panthemaMultiplier(
      group: keyof Stats['shopBonusLevels'],
      addedGroupLevels: number,
      coefficient: number,
      loadout: Loadout,
    ): number {
      if (stats.panthemaLevel <= 0)
        return 1
      const baseInfinityBoost = 1 + 0.01 * stats.panthemaLevel * stats.shopBonusLevels.infinity
      const base = 1 + coefficient * stats.panthemaLevel * stats.shopBonusLevels[group] * baseInfinityBoost
      const next = 1 + coefficient * stats.panthemaLevel
        * (stats.shopBonusLevels[group] + addedGroupLevels)
        * this.panthemaInfinityBoost(loadout)
      return next / base
    }

    static panthemaAdditive(
      group: 'ambrosiaLuck' | 'redAmbrosiaLuck',
      addedGroupLevels: number,
      coefficient: number,
      loadout: Loadout,
    ): number {
      if (stats.panthemaLevel <= 0)
        return 0
      const baseInfinityBoost = 1 + 0.01 * stats.panthemaLevel * stats.shopBonusLevels.infinity
      const base = coefficient * stats.panthemaLevel * stats.shopBonusLevels[group] * baseInfinityBoost
      const next = coefficient * stats.panthemaLevel
        * (stats.shopBonusLevels[group] + addedGroupLevels)
        * this.panthemaInfinityBoost(loadout)
      return next - base
    }

    static ascensionSpeed(loadout: Loadout) {
      const oldSpreadPower = 1 + stats.spread * (stats.aSpeed >= 1 ? 1 : -1)
      let nextRawSpeed = stats.aSpeed ** (1 / oldSpreadPower)
      const vouchers = loadout.getStat('vouchers')

      if (stats.chronometer > 0)
        nextRawSpeed *= 1.006 ** vouchers
      nextRawSpeed *= this.panthemaMultiplier('speed', 0, 0.005, loadout)

      const brickLevel = stats.exalt === 6 || stats.exalt === 8
        ? 0
        : loadout.effectiveLevel('ambrosiaBrickOfLead')
      nextRawSpeed *= 1 - 0.01 * brickLevel

      const oldLevel = Math.floor(stats.chronometer / 40)
      const newLevel = Math.floor((stats.chronometer + (stats.chronometer > 0 ? vouchers : 0)) / 40)
      const nextSpread = stats.spread + 0.001 * (newLevel - oldLevel)
      const nextSpreadPower = 1 + nextSpread * (nextRawSpeed >= 1 ? 1 : -1)
      return nextRawSpeed ** nextSpreadPower
    }

    static cubeAscensionSpeedEffect(loadout: Loadout) {
      if (!stats.oneMindUnlocked)
        return 1

      const nextSpeed = this.ascensionSpeed(loadout)
      const oldExponent = 1 + (stats.aSpeed >= 1 ? stats.aquariusExponent : 0)
      const nextExponent = 1 + (nextSpeed >= 1 ? stats.aquariusExponent : 0)
      return nextSpeed ** nextExponent / stats.aSpeed ** oldExponent
    }

    static octeractAscensionSpeedEffect(loadout: Loadout) {
      const nextSpeed = this.ascensionSpeed(loadout)
      const oldMind = stats.oneMindUnlocked && stats.aSpeed >= 1 ? stats.mind : 0.5
      const nextMind = stats.oneMindUnlocked && nextSpeed >= 1 ? stats.mind : 0.5

      return nextSpeed ** nextMind / stats.aSpeed ** oldMind
    }

    static addedFreeCubeLevels(loadout: Loadout): number {
      // The exported shop baseline already includes persistent Red levels.
      return stats.exalt === 6 || stats.exalt === 8
        ? 0
        : loadout.effectiveLevel('ambrosiaFreeCubeUpgrades')
          - (stats.bonus[upgrades.ambrosiaFreeCubeUpgrades.row] ?? 0)
    }

    static infinityCubeShopEffect(loadout: Loadout, octeracts = false): number {
      const vouchers = loadout.getStat('vouchers')
      const freeCubeLevels = this.addedFreeCubeLevels(loadout)
      const baseLevel = this.shopLevel('seasonPassInfinity')
      const nextLevel = this.shopLevel('seasonPassInfinity', { cubes: freeCubeLevels, infinity: vouchers })
      // allOcteractCubeStats uses only wowOcteractMult. It does not include
      // allCubeStats (globalCubeMult or Panthema's direct cube multiplier).
      const exponent = octeracts ? 1.25 : 1
      return 1.012 ** (exponent * (nextLevel - baseLevel))
        * (octeracts ? 1 : this.panthemaMultiplier('cubes', freeCubeLevels, 0.005, loadout))
    }

    static freeCubeShopEffect(loadout: Loadout, octeracts = false): number {
      // SynergismOfficial/src/Shop.ts and Statistics.ts: free Cube group
      // levels change only bought shop upgrades, not their purchase caps.
      const freeCubeLevels = this.addedFreeCubeLevels(loadout)
      if (freeCubeLevels <= 0) return 1
      const effectRatio = (key: string, coefficient: number) => {
        const base = this.shopLevel(key)
        const next = this.shopLevel(key, { cubes: freeCubeLevels })
        return (1 + coefficient * next) / (1 + coefficient * base)
      }
      // Y and Z each occur once in both objectives. Octeracts use their
      // dedicated effects rather than multiplying by the global effects too.
      const globalY = effectRatio('seasonPassY', 0.0075)
      const globalZ = effectRatio('seasonPassZ', 0.01 * stats.rawSing)
      if (octeracts) {
        return globalY * globalZ
          * effectRatio('seasonPass3', 0.015)
          * effectRatio('seasonPassLost', 0.001)
      }
      return globalY * globalZ * effectRatio('seasonPass', 0.0375)
    }

    static ambGeneration(level = 0, loadout: Loadout) {
      const coefficients = [0.01, 0.01, 0.01, 0.001]
      let speed = 1
      for (let index = 0; index < coefficients.length; index++) {
        const key = `shopAmbrosiaGeneration${index + 1}`
        const coefficient = coefficients[index]
        const baseLevel = this.shopLevel(key)
        const nextLevel = this.shopLevel(key, { ambrosiaGeneration: level })
        speed *= (1 + coefficient * nextLevel) / (1 + coefficient * baseLevel)
      }
      return speed * this.panthemaMultiplier('ambrosiaGeneration', level, 0.001, loadout)
    }

    static luckConversion(level = 0) {
      const divisors = [20, 20, 20, 100]
      // The exported conversion already contains the persistent Red Ambrosia
      // free levels. Only the levels added by this candidate may change it.
      const addedLevels = stats.exalt === 4 ? 0 : level - (stats.bonus[1] ?? 0)
      const freeLevelMultipliers = [1, 1, 2, 3]
      return divisors.reduce((conversion, divisor, index) => {
        const key = `shopRedLuck${index + 1}`
        const multiplier = freeLevelMultipliers[index]
        const baseline = this.shopLevel(key, {}, multiplier)
        const candidate = this.shopLevel(key, { redAmbrosiaLuck: addedLevels }, multiplier)
        return conversion - 0.01 * (Math.floor(candidate / divisor) - Math.floor(baseline / divisor))
      }, stats.luckConversion)
    }

    static rLuck(level = 0, loadout: Loadout) {
      let rLuck = stats.baseRLuck + Math.floor((loadout.luck - 100) / this.luckConversion(level))
      const addedLevels = stats.exalt === 4 ? 0 : level - (stats.bonus[1] ?? 0)
      const coefficients = [0.05, 0.075, 0.1, 0.2]
      const freeLevelMultipliers = [1, 1, 2, 3]
      for (let index = 0; index < coefficients.length; index++) {
        const key = `shopRedLuck${index + 1}`
        const multiplier = freeLevelMultipliers[index]
        rLuck += coefficients[index]
          * (this.shopLevel(key, { redAmbrosiaLuck: addedLevels }, multiplier) - this.shopLevel(key, {}, multiplier))
      }
      rLuck += this.panthemaAdditive('redAmbrosiaLuck', addedLevels, 0.05, loadout)
      return rLuck
    }

    static shopQuark(level = 0, loadout: Loadout) {
      let base = (1 + 0.2 * Math.log2(1 + stats.qHept / 500))
      const vouchers = loadout.getStat('vouchers')
      let exponentDelta = 0
      for (let index = 1; index <= 4; index++) {
        const key = index === 1 ? 'improveQuarkHept' : `improveQuarkHept${index}`
        exponentDelta += 0.01 * (this.shopLevel(key, { quark: level }) - this.shopLevel(key))
      }
      exponentDelta += 0.0001 * (
        this.shopLevel('improveQuarkHept5', { quark: level, infinity: vouchers })
        - this.shopLevel('improveQuarkHept5')
      )

      return base ** exponentDelta * this.panthemaMultiplier('quark', level, 0.001, loadout)
    }

    // These three depend only on their free levels and the voucher count
    // within a heat: cached (shopValueCaches), as every loadout asks for them
    static shopOfferingBaseDelta(offeringLevels: number, loadout: Loadout): number {
      const vouchers = loadout.getStat('vouchers')
      return cachedShopValue(shopValueCaches.offeringBase, offeringLevels, vouchers, () => {
        const baseLevel = this.shopLevel('offeringEX3')
        const nextLevel = this.shopLevel('offeringEX3', { offering: offeringLevels, infinity: vouchers })
        return Math.floor(nextLevel / 25) - Math.floor(baseLevel / 25)
      })
    }

    static shopOfferingMultiplier(offeringLevels: number, loadout: Loadout): number {
      const vouchers = loadout.getStat('vouchers')
      return cachedShopValue(shopValueCaches.offering, offeringLevels, vouchers, () => {
        const ratio = (
          key: string,
          effect: (level: number) => number,
          deltas: Partial<Record<keyof Stats['shopBonusLevels'], number>> = { offering: offeringLevels },
        ) =>
          effect(this.shopLevel(key, deltas)) / effect(this.shopLevel(key))
        let result = ratio('offeringEX', (n) => (1 + 0.1 * n) * 1.12 ** Math.floor(n / 10))
        result *= ratio('cashGrab', (n) => 1 + 0.0166 * n)
        result *= ratio('cashGrab2', (n) => 1 + 0.005 * n)
        result *= ratio('offeringEX2', (n) => 1 + 0.01 * n * stats.rawSing)
        result *= ratio('offeringEX3', (n) => 1.012 ** n, { offering: offeringLevels, infinity: vouchers })
        return result * this.panthemaMultiplier('offering', offeringLevels, 0.01, loadout)
      })
    }

    static shopObtainiumMultiplier(obtainiumLevels: number, loadout: Loadout): number {
      const vouchers = loadout.getStat('vouchers')
      return cachedShopValue(shopValueCaches.obtainium, obtainiumLevels, vouchers, () => {
        const ratio = (
          key: string,
          effect: (level: number) => number,
          deltas: Partial<Record<keyof Stats['shopBonusLevels'], number>> = { obtainium: obtainiumLevels },
        ) =>
          effect(this.shopLevel(key, deltas)) / effect(this.shopLevel(key))
        let result = ratio('obtainiumEX', (n) => (1 + 0.1 * n) * 1.12 ** Math.floor(n / 10))
        result *= ratio('cashGrab', (n) => 1 + 0.0166 * n)
        result *= ratio('cashGrab2', (n) => 1 + 0.005 * n)
        result *= ratio('obtainiumEX2', (n) => 1 + 0.01 * n * stats.rawSing)
        result *= ratio('obtainiumEX3', (n) => 1.012 ** n, { obtainium: obtainiumLevels, infinity: vouchers })
        result *= ratio('obtainiumEX3', (n) => 1.06 ** Math.floor(n / 25), { obtainium: obtainiumLevels, infinity: vouchers })
        return result * this.panthemaMultiplier('obtainium', obtainiumLevels, 0.01, loadout)
      })
    }

}


// ===========================================================================
// upgrades object (mirrors sheet_script `upgrades` const)
// ===========================================================================

// Forward-declare so Upgrade instances can reference it
const upgrades: Record<string, Upgrade> = {};

const _runeOOMCostArray = Upgrade.ambrosiaRuneOOMBonusCost();

Object.assign(upgrades, {
    ambrosiaTutorial: new Upgrade({
      maxLevel: 10,
      cost: level => level * level,
      effects: {
        quark: (input, level) => input * (1 + 0.01 * level),
        cube: (input, level) => input * (1 + 0.05 * level),
        oct: (input, level) => input * (1 + 0.05 * level),
      }
    }),
    ambrosiaQuarks1: new Upgrade({
      maxLevel: 100,
      cost: level => level ** 3,
      effects: {
        quark: (input, level) => input * (1 + 0.01 * level)
      },
      row: 4,
      prerequisites: {
        ambrosiaTutorial: 10
      }
    }),
    ambrosiaCubes1: new Upgrade({
      maxLevel: 100,
      cost: level => level ** 3,
      effects: {
        cube: (input, level) => input * (1 + 0.05 * level) * 1.1 ** Math.floor(level / 5),
        oct: (input, level) => input * (1 + 0.05 * level) * 1.1 ** Math.floor(level / 5),
      },
      row: 3,
      prerequisites: {
        ambrosiaTutorial: 10
      }
    }),
    ambrosiaLuck1: new Upgrade({
      maxLevel: 100,
      cost: level => level ** 3,
      effects: {
        luck: (input, level) => input + 2 * level + 12 * Math.floor(level / 10)
      },
      row: 1,
      prerequisites: {
        ambrosiaTutorial: 10
      }
    }),
    ambrosiaQuarkCube1: new Upgrade({
      maxLevel: 25,
      cost: level => 250 * level ** 3,
      effects: {
        cube: (input, level) => input * (1 + 0.001 * Math.floor((Math.log10(stats.quarks + 1) + 1) ** 2) * level),
        oct: (input, level) => input * (1 + 0.001 * Math.floor((Math.log10(stats.quarks + 1) + 1) ** 2) * level),
      },
      row: 3,
      blueberryCost: 1,
      prerequisites: {
        ambrosiaCubes1: 30,
        ambrosiaQuarks1: 20
      }
    }),
    ambrosiaLuckCube1: new Upgrade({
      maxLevel: 25,
      cost: level => 250 * level ** 3,
      effects: {
        cube: (input, level, loadout) => input * (1 + 0.0005 * loadout.luck * level),
        oct: (input, level, loadout) => input * (1 + 0.0005 * loadout.luck * level)
      },
      row: 3,
      blueberryCost: 1,
      prerequisites: {
        ambrosiaCubes1: 30,
        ambrosiaLuck1: 20
      }
    }),
    ambrosiaCubeQuark1: new Upgrade({
      maxLevel: 25,
      cost: level => 500 * level ** 3,
      effects: {
        quark: (input, level) => input * (1 + 0.0001 * stats.cubeExp * level)
      },
      row: 4,
      blueberryCost: 1,
      prerequisites: {
        ambrosiaQuarks1: 30,
        ambrosiaCubes1: 20
      }
    }),
    ambrosiaLuckQuark1: new Upgrade({
      maxLevel: 25,
      cost: level => 500 * level ** 3,
      effects: {
        quark: (input, level, loadout) => input * (1 + 0.0001 * Math.min(loadout.luck, Math.sqrt(1000 * loadout.luck)) * level)
      },
      row: 4,
      blueberryCost: 1,
      prerequisites: {
        ambrosiaQuarks1: 30,
        ambrosiaLuck1: 20
      }
    }),
    ambrosiaCubeLuck1: new Upgrade({
      maxLevel: 25,
      cost: level => 100 * level ** 3,
      effects: {
        luck: (input, level) => input + 0.02 * stats.cubeExp * level
      },
      row: 1,
      blueberryCost: 1,
      prerequisites: {
        ambrosiaLuck1: 30,
        ambrosiaCubes1: 20
      }
    }),
    ambrosiaQuarkLuck1: new Upgrade({
      maxLevel: 25,
      cost: level => 100 * level ** 3,
      effects: {
        luck: (input, level) => input + 0.02 * Math.floor((Math.log10(stats.quarks + 1) + 1) ** 2) * level
      },
      row: 1,
      blueberryCost: 1,
      prerequisites: {
        ambrosiaLuck1: 30,
        ambrosiaQuarks1: 20
      }
    }),
    ambrosiaQuarks2: new Upgrade({
      maxLevel: 100,
      cost: level => 500 * level * level,
      effects: {
        quark: (input, level, loadout) => input * (1 + (0.01 + Math.floor(loadout.effectiveLevel("ambrosiaQuarks1") / 10) * 0.001) * level)
      },
      row: 4,
      blueberryCost: 1,
      prerequisites: {
        ambrosiaQuarks1: 40
      }
    }),
    ambrosiaCubes2: new Upgrade({
      maxLevel: 100,
      cost: level => 500 * level * level,
      effects: {
        cube: (input, level, loadout) => input * (1 + (0.1 + 0.01 * Math.floor(loadout.effectiveLevel("ambrosiaCubes1") / 10)) * level) * 1.15 ** Math.floor(level / 5),
        oct: (input, level, loadout) => input * (1 + (0.1 + 0.01 * Math.floor(loadout.effectiveLevel("ambrosiaCubes1") / 10)) * level) * 1.15 ** Math.floor(level / 5),
      },
      row: 3,
      blueberryCost: 1,
      prerequisites: {
        ambrosiaCubes1: 40
      }
    }),
    ambrosiaLuck2: new Upgrade({
      maxLevel: 100,
      cost: level => 250 * level * level,
      effects: {
        luck: (input, level, loadout) => input + (3 + 0.3 * Math.floor(loadout.effectiveLevel("ambrosiaLuck1") / 10)) * level + 40 * Math.floor(level / 10)
      },
      row: 1,
      blueberryCost: 1,
      prerequisites: {
        ambrosiaLuck1: 40
      }
    }),
    ambrosiaQuarks3: new Upgrade({
      maxLevel: 10,
      cost: level => (725000 + 25000 * level) * level,
      effects: {
        quark: (input, level, loadout) => input * (1 + 0.05 * (1 + 0.01 * loadout.effectiveLevel("ambrosiaQuarks2")) * level)
      },
      row: 4,
      blueberryCost: 3,
      prerequisites: {
        ambrosiaQuarks1: 100,
        ambrosiaQuarks2: 50
      }
    }),
    ambrosiaQuarks4: new Upgrade({
      maxLevel: 100,
      cost: level => 300_000 * level,
      effects: {
        quark: (input, level) => input * (1 + level / 100)
      },
      row: 4,
      blueberryCost: 5,
      prerequisites: {
        ambrosiaQuarks3: 10
      },
      requiresExalt9: true
    }),
    ambrosiaCubes3: new Upgrade({
      maxLevel: 100,
      cost: level => (72500 + 2500 * level) * level,
      effects: {
        cube: (input, level, loadout) => input * (1 + 0.2 * (1 + 0.03 * loadout.effectiveLevel("ambrosiaCubes2")) * level) * 1.2 ** Math.floor(level / 5),
        oct: (input, level, loadout) => input * (1 + 0.2 * (1 + 0.03 * loadout.effectiveLevel("ambrosiaCubes2")) * level) * 1.2 ** Math.floor(level / 5),
      },
      row: 3,
      blueberryCost: 3,
      prerequisites: {
        ambrosiaCubes1: 100,
        ambrosiaCubes2: 50
      }
    }),
    ambrosiaCubes4: new Upgrade({
      maxLevel: 50,
      cost: level => (290_000 + 10_000 * level) * level,
      effects: {
        cube: (input, level) => input * (1 + level / 100) * 1.3 ** Math.floor(level / 5),
        oct: (input, level) => input * (1 + level / 100) * 1.3 ** Math.floor(level / 5),
      },
      row: 3,
      blueberryCost: 5,
      prerequisites: {
        ambrosiaCubes3: 100
      },
      requiresExalt9: true
    }),
    ambrosiaFreeCubeUpgrades: new Upgrade({
      maxLevel: 30,
      cost: level => 10_000 * level * level,
      row: 3,
      blueberryCost: 2,
      prerequisites: {
        ambrosiaCubes2: 100
      }
    }),
    ambrosiaLuck3: new Upgrade({
      maxLevel: 100,
      cost: level => 50000 * level,
      effects: {
        luck: (input, level) => input + stats.blueberries * level
      },
      row: 1,
      blueberryCost: 3,
      prerequisites: {
        ambrosiaLuck1: 90,
        ambrosiaLuck2: 50
      }
    }),
    ambrosiaLuck4: new Upgrade({
      maxLevel: 50,
      cost: level => (240000 + 10000 * level) * level,
      effects: {
        mLuck: (input, level) => input + 0.0001 * stats.lifetimeAmbExp * level
      },
      row: 1,
      blueberryCost: 5,
      prerequisites: {
        ambrosiaLuck3: 100
      },
      requiresExalt9: true
    }),
    ambrosiaPatreon: new Upgrade({
      maxLevel: 1,
      cost: level => level,
      effects: {
        speed: (input, level) => input * (1 + stats.patreon * level),
        rSpeed: (input, level) => input * (1 + stats.patreon * level)
      }
    }),
    ambrosiaObtainium1: new Upgrade({
      maxLevel: 2,
      cost: level => 50000 * (25 ** level - 1) / 24,
      effects: {
        mObt: (input, level, loadout) => input * (1 + 0.001 * loadout.luck * level)
      },
      blueberryCost: 1
    }),
    ambrosiaOffering1: new Upgrade({
      maxLevel: 2,
      cost: level => 50000 * (25 ** level - 1) / 24,
      effects: {
        mOff: (input, level, loadout) => input * (1 + 0.001 * loadout.luck * level)
      },
      blueberryCost: 1
    }),
    ambrosiaHyperflux: new Upgrade({
      maxLevel: 7,
      cost: level => ([0, 33333, 99999, 199998, 333330, 499995, 999990, 2499975])[level],
      effects: {
        cube: (input, level, _, p4x4 = 50) => input * (1 + 0.01 * level) ** p4x4
      },
      blueberryCost: 3
    }),
    ambrosiaBaseOffering1: new Upgrade({
      maxLevel: 40,
      cost: level => 5 * level ** 3,
      effects: {
        off: (input, level) => input + level
      },
      row: 2,
      blueberryCost: 0
    }),
    ambrosiaBaseObtainium1: new Upgrade({
      maxLevel: 20,
      cost: level => 40 * level ** 3,
      effects: {
        obt: (input, level) => input + level,
      },
      row: 2,
      blueberryCost: 0
    }),
    ambrosiaBaseOffering2: new Upgrade({
      maxLevel: 60,
      cost: level => 20 * level ** 3,
      effects: {
        off: (input, level) => input + level,
      },
      row: 2,
      blueberryCost: 1,
      prerequisites: {
        ambrosiaBaseOffering1: 30
      }
    }),
    ambrosiaBaseObtainium2: new Upgrade({
      maxLevel: 30,
      cost: level => 160 * level ** 3,
      effects: {
        obt: (input, level) => input + level
      },
      row: 2,
      blueberryCost: 1,
      prerequisites: {
        ambrosiaBaseObtainium1: 15
      }
    }),
    ambrosiaFreeObtainiumUpgrades: new Upgrade({
      maxLevel: 50,
      cost: level => 4000 * level * level,
      row: 2,
      blueberryCost: 2,
      prerequisites: {
        ambrosiaBaseObtainium1: 20,
        ambrosiaBaseObtainium2: 30
      },
      requiresExalt9: true
    }),
    ambrosiaFreeOfferingUpgrades: new Upgrade({
      maxLevel: 50,
      cost: level => 4000 * level * level,
      row: 2,
      blueberryCost: 2,
      prerequisites: {
        ambrosiaBaseOffering1: 30,
        ambrosiaBaseOffering2: 60
      },
      requiresExalt9: true
    }),
    ambrosiaSingReduction1: new Upgrade({
      maxLevel: 2,
      cost: level => 1e5 * (99 ** level - 1) / 98,
      effects: {
        cube: (input, level) => stats.exalt > 0 || stats.postAoAG ? input : input * Upgrade.singDebuff(stats.sing, "cube") / Upgrade.singDebuff(stats.sing - level, "cube"),
        mOff: (input, level) => stats.exalt > 0 || stats.postAoAG ? input : input * Upgrade.singDebuff(stats.sing, "mOff") / Upgrade.singDebuff(stats.sing - level, "mOff"),
        mObt: (input, level) => stats.exalt > 0 || stats.postAoAG ? input : input * Upgrade.singDebuff(stats.sing, "mOff") / Upgrade.singDebuff(stats.sing - level, "mOff"),
        singReduction: (input, level) => stats.exalt > 0 || stats.postAoAG ? input : input + level
      },
      blueberryCost: 2,
      prerequisites: {
        ambrosiaHyperflux: 4
      }
    }),
    ambrosiaInfiniteShopUpgrades1: new Upgrade({
      maxLevel: 20,
      cost: level => 25000 * level,
      effects: {
        vouchers: (input, level) => stats.exalt === 4 ? input : input + level
      },
      row: 2,
      blueberryCost: 1,
      prerequisites: {
        ambrosiaCubes1: 70,
        ambrosiaBaseOffering1: 20,
        ambrosiaBaseObtainium1: 10
      }
    }),
    ambrosiaInfiniteShopUpgrades2: new Upgrade({
      maxLevel: 20,
      cost: level => 75000 * level,
      effects: {
        vouchers: (input, level) => stats.exalt === 4 ? input : input + level
      },
      row: 2,
      blueberryCost: 2,
      prerequisites: {
        ambrosiaInfiniteShopUpgrades1: 20
      }
    }),
    ambrosiaInfiniteShopUpgrades3: new Upgrade({
      maxLevel: 20,
      cost: level => 500000 * level,
      effects: {
        vouchers: (input, level) => stats.exalt === 4 ? input : input + level
      },
      row: 2,
      blueberryCost: 3,
      prerequisites: {
        ambrosiaInfiniteShopUpgrades2: 20
      },
      requiresExalt9: true
    }),
    ambrosiaSingReduction2: new Upgrade({
      maxLevel: 2,
      cost: level => 1.25e7 * (3 ** level - 1) / 2,
      effects: {
        cube: (input, level) => stats.exalt > 0 && !stats.postAoAG ? input * Upgrade.singDebuff(stats.sing, "cube") / Upgrade.singDebuff(stats.sing - level, "cube") : input,
        mOff: (input, level) => stats.exalt > 0 && !stats.postAoAG ? input * Upgrade.singDebuff(stats.sing, "mOff") / Upgrade.singDebuff(stats.sing - level, "mOff") : input,
        mObt: (input, level) => stats.exalt > 0 && !stats.postAoAG ? input * Upgrade.singDebuff(stats.sing, "mOff") / Upgrade.singDebuff(stats.sing - level, "mOff") : input,
        singReduction: (input, level) => stats.exalt > 0 && !stats.postAoAG ? input + level : input
      },
      blueberryCost: 4,
      ignoresExalt: true
    }),
    ambrosiaTalismanBonusRuneLevel: new Upgrade({
      maxLevel: 100,
      cost: level => 100 * level * level,
      effects: {
        // Its effect is applied together with ambrosiaRuneOOMBonus below.
        cube: (input) => input,
        quark: (input) => input,
        mObt: (input) => input,
        mOff: (input) => input
      },
      row: 2
    }),
    ambrosiaRuneOOMBonus: new Upgrade({
      maxLevel: 100,
      costArray: _runeOOMCostArray,
      cost: level => _runeOOMCostArray[level] ?? 0,
      effects: {
        cube: (input, level, loadout) => input * (1 + 0.01 * Upgrade.runeLevelIA(0.001 * level, 0.005 * loadout.effectiveLevel("ambrosiaTalismanBonusRuneLevel"))) / stats.baseIACube,
        quark: (input, level, loadout) => {
          const runeLevel = Upgrade.runeLevelIA(0.001 * level, 0.005 * loadout.effectiveLevel("ambrosiaTalismanBonusRuneLevel"))
          const runeEffect = 1 + 0.002 * runeLevel + (runeLevel > 0 ? 0.1 : 0)
          return input * runeEffect / stats.baseIAQuark
        },
        mObt: (input, level, loadout) => input
          * (1 + Upgrade.runeLevelSI(level, 0.005 * loadout.effectiveLevel("ambrosiaTalismanBonusRuneLevel")) / 200)
          / (1 + stats.baseSI / 200),
        mOff: (input, level, loadout) => input
          * (1 + Upgrade.runeLevelSI(level, 0.005 * loadout.effectiveLevel("ambrosiaTalismanBonusRuneLevel")) / 2000)
          / (1 + stats.baseSI / 2000)
      },
      row: 2
    }),
    ambrosiaBrickOfLead: new Upgrade({
      maxLevel: 25,
      cost: level => 10 * level ** 3,
      effects: {
        mLuck: (input, level) => input + 0.02 * level
      },
      blueberryCost: 4
    }),
    ambrosiaFreeLuckUpgrades: new Upgrade({
      maxLevel: 25,
      cost: level => 5000 * level * level,
      effects: {
        luck: (input, level, loadout) => stats.exalt === 4
          ? input
          : input + stats.shopLuck * level + Upgrade.panthemaAdditive('ambrosiaLuck', level, 0.2, loadout)
      },
      row: 1,
      blueberryCost: 1
    }),
    ambrosiaFreeGenerationUpgrades: new Upgrade({
      maxLevel: 5,
      cost: level => 5000 * (4 ** level - 1),
      effects: {
        speed: (input, level, loadout) => stats.exalt === 4 ? input : input * Upgrade.ambGeneration(level, loadout),
        // SynergismOfficial/src/Statistics.ts:
        // allRedAmbrosiaGenerationSpeedStats does not use the blue
        // Ambrosia-generation shop upgrades.
      },
      row: 1,
      blueberryCost: 1
    }),
    ambrosiaFreeRedLuckUpgrades: new Upgrade({
      maxLevel: 40,
      cost: level => 10000 * level * level,
      effects: {
        rLuck: (input, level, loadout) => input + (Upgrade.rLuck(level, loadout) - Upgrade.rLuck(0, loadout)) * (stats.exalt !== 4 ? 1 : 0)
      },
      row: 1,
      blueberryCost: 2,
      prerequisites: {
        ambrosiaFreeLuckUpgrades: 10
      }
    }),
    ambrosiaFreeQuarkUpgrades: new Upgrade({
      maxLevel: 10,
      cost: level => 25000 * level ** 3,
      effects: {
        // SynergismOfficial/BlueberryUpgrades.ts: each effective Ambrosia
        // level grants one tenth of a Quark-shop bonus level.
        quark: (input, level, loadout) => stats.exalt === 4 ? input : input * Upgrade.shopQuark(level / 10, loadout)
      },
      row: 4,
      blueberryCost: 2
    }),
    twoMind: new Upgrade({
      maxLevel: 1,
      cost: () => 0,
      blueberryCost: 8,
      requiresExalt9: true
    })
});

// SynergismOfficial's Exalt5x1 modules require a No Ambrosia Upgrades
// completion. Exalt9x1 modules already carry requiresExalt9 in this table.
const exalt5UpgradeNames = new Set([
    'ambrosiaQuarks2', 'ambrosiaCubes2', 'ambrosiaLuck2',
    'ambrosiaQuarks3', 'ambrosiaCubes3', 'ambrosiaFreeCubeUpgrades',
    'ambrosiaLuck3', 'ambrosiaBaseOffering2', 'ambrosiaBaseObtainium2',
    'ambrosiaInfiniteShopUpgrades1', 'ambrosiaInfiniteShopUpgrades2',
    'ambrosiaSingReduction2', 'ambrosiaRuneOOMBonus',
    'ambrosiaFreeRedLuckUpgrades', 'ambrosiaFreeQuarkUpgrades',
]);
const upgradeBaseMaxLevels = Object.fromEntries(
    Object.entries(upgrades).map(([name, upgrade]) => [name, upgrade.maxLevel]),
);

// Red upgrades (used only for cap checks in the optimizer loop)
const redUpgrades: Record<string, Upgrade> = {
    regularLuck:  new Upgrade({ maxLevel: 100  }),
    blueberries:  new Upgrade({ maxLevel: 5    }),
    viscount:     new Upgrade({ maxLevel: 1    }),
    regularLuck2: new Upgrade({ maxLevel: 250  }),
};

// Most loadouts evaluate the same stat repeatedly.  Iterating every upgrade
// for every candidate made the optimizer spend the majority of its time
// checking undefined effect handlers.  These compact lists preserve the game
// formula order while visiting only upgrades that can affect the requested
// stat.
const upgradeEffectKeys: Record<string, string[]> = {};
for (const [upgradeName, upgrade] of Object.entries(upgrades)) {
  for (const effectName of Object.keys(upgrade.effects))
    (upgradeEffectKeys[effectName] ??= []).push(upgradeName)
}

// The upgrade key order is fixed by the table above and is reused for
// prerequisite bookkeeping below.
const upgradeKeyOrder = Object.keys(upgrades);

// Reverse prerequisite map used when a blueberry repair removes a module.
// Removing a prerequisite must also remove every dependent module; otherwise
// the repaired candidate would retain orphaned levels that the game cannot
// actually purchase.
const dependentUpgrades: Record<string, string[]> = {};
for (const upgradeName of upgradeKeyOrder) {
  for (const prerequisite of Object.keys(upgrades[upgradeName].prerequisites))
    (dependentUpgrades[prerequisite] ??= []).push(upgradeName)
}


// ===========================================================================
// Loadout class
// ===========================================================================

class Loadout {
    private coinStateCache: HeaterCoinsC15State | null = null;

    upgradeLevels: Record<string, number>;
    private costCache:  number | null;
    private blueberryCostCache: number | null;
    private statCache:  Record<string, number>;

    constructor(loadout?: Loadout) {
        this.upgradeLevels = {};
        if (loadout !== undefined) {
            Object.assign(this.upgradeLevels, loadout.upgradeLevels);
        }
        this.upgradeLevels.ambrosiaPatreon = 1; // Always buy 1 level of ambrosiaPatreon
        this.costCache = null;
        this.blueberryCostCache = null;
        this.statCache = {};
    }

    // Returns cost of a specific upgrade in the loadout
    getCost(upgrade: string): number {
        return upgrades[upgrade].cost(this.upgradeLevels[upgrade] ?? 0);
    }

    // Returns total cost of the entire loadout
    get cost(): number {
        if (this.costCache === null) {
            this.costCache = 0;
            for (const upgrade in this.upgradeLevels)
                this.costCache += this.getCost(upgrade);
        }
        return this.costCache;
    }

    // Returns total blueberry cost of the entire loadout
    get blueberryCost(): number {
        if (this.blueberryCostCache !== null)
            return this.blueberryCostCache;

        let result = 0;
        for (const upgrade in this.upgradeLevels)
            if ((this.upgradeLevels[upgrade] ?? 0) > 0)
                result += Math.max(
                    0,
                    (upgrades[upgrade]?.blueberryCost ?? 0)
                        - (stats.ambrosiaUpgradeBlueberryCostReductions[upgrade] ?? 0)
                );
        this.blueberryCostCache = result;
        return result;
    }

    invalidateCaches(): void {
        this.costCache = null;
        this.blueberryCostCache = null;
        this.statCache = {};
        this.coinStateCache = null;
    }

    get coinsC15State(): HeaterCoinsC15State {
        if (!coinsC15Evaluator) throw new Error('Coins in C15 needs a fresh game-data export.');
        return this.coinStateCache ??= coinsC15Evaluator({
            coefficient: this.effectiveLevel('ambrosiaRuneOOMBonus'),
            talisman: this.effectiveLevel('ambrosiaTalismanBonusRuneLevel'),
            stabilizer: this.effectiveLevel(stats.exalt > 0 ? 'ambrosiaSingReduction2' : 'ambrosiaSingReduction1'),
            brick: this.effectiveLevel('ambrosiaBrickOfLead'),
        });
    }

    compareStat(other: Loadout, stat: string): number {
        return stat === 'coinsC15' ? heaterCoinsC15LogRatio(this.coinsC15State, other.coinsC15State)
            : this.getStat(stat) - other.getStat(stat);
    }

    setCachedStat(stat: string, value: number): void {
        this.statCache[stat] = value;
    }

    setCachedCosts(cost: number, blueberryCost: number): void {
        this.costCache = cost;
        this.blueberryCostCache = blueberryCost;
    }

    // Returns effective level of an upgrade that accounts for bonus levels
    effectiveLevel(upgrade: string): number {
        if (upgrades[upgrade]?.requiresExalt9 && !stats.exalt9Unlocked)
            return 0;
        let level = this.upgradeLevels[upgrade] ?? 0;
        if (upgrade === "ambrosiaTutorial")
            level += stats.tutorialBonus;
        level += stats.bonus[upgrades[upgrade]?.row ?? 0] ?? 0;
        if ((this.upgradeLevels[upgrade] ?? 0) > 0)
            level += stats.ambrosiaUpgradeBonusLevels[upgrade] ?? 0;
        return level;
    }

    // Returns effect of a specific upgrade in the loadout
    getEffect(input: number, upgrade: string, effect: keyof UpgradeEffectMap): number {
        const upgradeData = upgrades[upgrade];
        if (!upgradeData
            || (upgradeData.requiresExalt9 && !stats.exalt9Unlocked)
            || (!upgradeData.ignoresExalt && (stats.exalt === 6 || stats.exalt === 8)))
            return input;
        const fn = upgradeData.effects[effect] as ((input: number, level: number, loadout: Loadout) => number) | undefined;
        if (fn !== undefined) {
            let level = this.effectiveLevel(upgrade);
            if ((upgrade === 'ambrosiaFreeGenerationUpgrades' && effect === 'speed')
                || (upgrade === 'ambrosiaFreeLuckUpgrades' && effect === 'luck')) {
                // The exported no-Ambrosia speed/luck already includes Red
                // Ambrosia's shop free levels. Apply only candidate
                // purchases and Purple enchantment levels activated by a
                // purchase, or the Red bonus is counted twice.
                level -= stats.bonus[upgradeData.row] ?? 0;
            }
            if (effect === "vouchers") {
                // freeShopLevelsInfinityNoAmb already contains the persistent
                // Red Ambrosia row levels for all three voucher modules.  A
                // candidate therefore adds only purchased levels and Purple
                // enchantment levels activated by that purchase.  Subtracting
                // the Red baseline also makes an unpurchased module contribute
                // zero here, matching SynergismOfficial's true-base export.
                level -= stats.voucherRedLevelBaseline;
            }
            return fn(input, level, this);
        }
        return input;
    }

    get luck(): number {
        return this.getStat("luck");
    }

    get twoMindEnabled(): boolean {
        return stats.exalt9Unlocked
            && stats.exalt !== 6
            && stats.exalt !== 8
            && (this.upgradeLevels.twoMind ?? 0) > 0;
    }

    // Sustained bar income for this loadout. Routing defaults to the saved
    // Purple Reactor percentages; passing other values evaluates the same
    // loadout under a different routing without touching the stat cache.
    barIncome(routing?: Pick<AmbrosiaBarIncomeReactor, 'blueRoutingPercent' | 'redRoutingPercent'>): AmbrosiaBarIncome {
        if (!stats.reactor)
            throw new Error('Heater bar-income optimization needs a fresh game-data export with Purple Reactor settings.')
        const brickLevel = stats.exalt === 6 || stats.exalt === 8
            ? 0 : this.effectiveLevel('ambrosiaBrickOfLead')
        const brickFactor = 1 - brickLevel / 50
        const blueRequirementWithoutTwoMind = stats.exalt === 10
            ? stats.blueBarMaxWithoutTwoMindAndBrick
            : stats.amb >= 10_000
                ? Math.ceil(stats.blueBarRequirementBeforeRounding / brickFactor)
                : stats.blueBarRequirementBeforeRounding / brickFactor
        return calculateAmbrosiaBarIncome({
            reactor: routing ? { ...stats.reactor, ...routing } : stats.reactor,
            bluePointsPerSecond: stats.ambSpeed * this.getStat('speed'),
            redPointsPerSecond: stats.redBarPointsPerSecond * this.getStat('rSpeed'),
            blueRequirementWithoutTwoMind,
            redRequirementWithoutTwoMind: stats.redBarMaxWithoutTwoMind,
            blueLuck: this.luck,
            redLuck: this.getStat('rLuck'),
            purpleHoneyLuck: stats.purple?.purpleHoneyLuck ?? 0,
            purpleHoneyPerExtraction: stats.purple?.purpleHoneyPerExtraction ?? 0,
            flatAmbrosiaPerBlueFill: stats.bonusAmbrosiaPerFill,
            acceleratorSecondsPerRedAmbrosia: stats.acceleratorSecondsPerRedAmbrosia,
            twoMind: this.twoMindEnabled,
        })
    }

    // Returns the total value of a given stat for the loadout
    getStat(stat: string, override = false): number {
      if (this.statCache[stat] == null || override) {
        this.statCache[stat] = stat === "mLuck" ? stats.baseMLuck : 1
        switch (stat) {
          case 'coinsC15':
            this.statCache[stat] = heaterCoinsC15LogRatio(this.coinsC15State, coinsC15Baseline!);
            break;
          case "luck":
            const unassignedBlueberries = stats.blueberries - this.blueberryCost
            let luck = stats.baseLuck
              + (unassignedBlueberries >= 5 ? unassignedBlueberries * stats.purpleLeoLevel : 0)
            for (const upgrade of upgradeEffectKeys.luck ?? [])
              luck = this.getEffect(luck, upgrade, "luck")
            this.statCache[stat] = luck * (1 + this.getStat("mLuck"))
            break
          case "ambOct":
            // SynergismOfficial/src/Calculate.ts applyTauPower: Platonic Tau
            // raises the whole Octeract multiplier, so a loadout's Octeract
            // ratio r is really r^tau. The cube and oct objectives don't need
            // it (same order), this product of two resources does.
            this.statCache[stat] = this.getStat("allAmb") * this.getStat("oct") ** stats.tauPower
            break
          case "obtAndOff":
            // Both resources at once: +10% of either counts the same
            this.statCache[stat] = this.getStat("obt") * this.getStat("off")
            break
          case "amb":
            const brickLevel = stats.exalt === 6 || stats.exalt === 8
              ? 0
              : this.effectiveLevel("ambrosiaBrickOfLead")
            const brickBarSpeed = 1 - brickLevel / 50
            // SynergismOfficial/src/BlueberryUpgrades.ts ambrosiaBrickOfLead
            // and Calculate.ts calculateRequiredBlueberryTime: Brick changes
            // the reciprocal point requirement, not point generation speed.
            // Two Mind scales reward luck to preserve the luck-based gain
            // rate; its fixed bar still changes the flat Exalt 5 bonus rate.
            const brickRequirement = stats.exalt === 10
              ? stats.blueBarMaxWithoutTwoMindAndBrick
              : stats.amb >= 10_000
                ? Math.ceil(stats.blueBarRequirementBeforeRounding / brickBarSpeed)
                : stats.blueBarRequirementBeforeRounding / brickBarSpeed
            const requirementRatio = stats.blueBarMaxWithoutTwoMindAndBrick / brickRequirement
            // SynergismOfficial/src/Calculate.ts: TWO MIND fixes the blue
            // bar at 10,000,000 points.  The luck-derived part is adjusted
            // by calculateBarRewardLuck and therefore cancels against the
            // shorter bar; the fixed Exalt-5 reward does not, so it needs
            // the actual fixed-bar ratio here.
            const flatBonusRatio = this.twoMindEnabled
              ? stats.blueBarMaxWithoutTwoMindAndBrick / 10_000_000
              : requirementRatio
            this.statCache[stat] = (this.luck / 100 * requirementRatio
              + stats.bonusAmbrosiaPerFill * flatBonusRatio)
              * this.getStat("speed")
            break
          case "rLuck":
            this.statCache[stat] = Upgrade.rLuck(this.effectiveLevel("ambrosiaFreeRedLuckUpgrades"), this)
            break
          case "rAmb":
            // The Two Mind reward-luck/bar-size factors also cancel for
            // Red Ambrosia, which has no separate flat per-fill bonus.
            this.statCache[stat] = this.getStat("rLuck") / 100
              * this.getStat("rSpeed")
            break
          case "allAmb":
            this.statCache[stat] = this.getStat("amb") * this.getStat("rAmb")
            break
          case 'incomeBlue':
          case 'incomeRed':
          case 'incomeAll':
          case 'incomeHoney':
          case 'incomePurpleAmb': {
            if (!this.statCache.__barIncomeReady) {
              const income = this.barIncome()
              // Bar rewards, not Ambrosia gained: inside Exalt 10 the bars
              // pay them as global time (blue) and ascension time (red)
              this.statCache.incomeBlue = income.blueRewardPerSecond
              this.statCache.incomeRed = income.redRewardPerSecond
              this.statCache.incomeAll = income.blueRewardPerSecond * income.redRewardPerSecond
              this.statCache.incomeHoney = purpleIncomeObjective(income, 'incomeHoney')
              this.statCache.incomePurpleAmb = purpleIncomeObjective(income, 'incomePurpleAmb')
              this.statCache.__barIncomeReady = 1
            }
            break
          }
          case "mOff":
            for (const upgrade of upgradeEffectKeys.mOff ?? [])
              this.statCache[stat] = this.getEffect(this.statCache[stat], upgrade, "mOff")
            if (stats.exalt !== 4)
              this.statCache[stat] *= Upgrade.shopOfferingMultiplier(
                this.effectiveLevel('ambrosiaFreeOfferingUpgrades'), this
              )
            break
          case "mObt":
            for (const upgrade of upgradeEffectKeys.mObt ?? [])
              this.statCache[stat] = this.getEffect(this.statCache[stat], upgrade, "mObt")
            if (stats.exalt !== 4)
              this.statCache[stat] *= Upgrade.shopObtainiumMultiplier(
                this.effectiveLevel('ambrosiaFreeObtainiumUpgrades'), this
              )
            break
          case "off":
            let off = stats.baseOff
            for (const upgrade of upgradeEffectKeys.off ?? [])
              off = this.getEffect(off, upgrade, "off")
            if (stats.exalt !== 4)
              off += Upgrade.shopOfferingBaseDelta(this.effectiveLevel('ambrosiaFreeOfferingUpgrades'), this)
            this.statCache[stat] = off * this.getStat("mOff")
            break
          case "obt":
            let obt = stats.baseObt
            for (const upgrade of upgradeEffectKeys.obt ?? [])
              obt = this.getEffect(obt, upgrade, "obt")
            this.statCache[stat] = obt * this.getStat("mObt")
            break
          case "singReduction":
          case "vouchers":
            // Free Infinity-shop levels are part of the exported baseline;
            // purchased voucher upgrades add on top of them.
            this.statCache[stat] = stat === "vouchers" ? stats.voucher : 0
          default:
            for (const upgrade of upgradeEffectKeys[stat] ?? [])
              this.statCache[stat] = this.getEffect(this.statCache[stat], upgrade, stat as keyof UpgradeEffectMap)
            if (stat === 'cube')
              this.statCache[stat] *= Upgrade.freeCubeShopEffect(this)
                * Upgrade.infinityCubeShopEffect(this) * Upgrade.cubeAscensionSpeedEffect(this)
            else if (stat === 'oct')
              this.statCache[stat] *= Upgrade.freeCubeShopEffect(this, true)
                * Upgrade.infinityCubeShopEffect(this, true) * Upgrade.octeractAscensionSpeedEffect(this)
        }
      }
      return this.statCache[stat]
    }

    // Recursively sets levels of all upgrades to produce a valid loadout
    satisfyPrerequisites(): void {
      let changed = false
      const ensure = (upgradeName: string): void => {
        const upgrade = upgrades[upgradeName]
        if (!upgrade || (this.upgradeLevels[upgradeName] ?? 0) <= 0)
          return
        for (const prerequisite in upgrade.prerequisites) {
          const required = upgrade.prerequisites[prerequisite] ?? 0
          if ((this.upgradeLevels[prerequisite] ?? 0) < required) {
            this.upgradeLevels[prerequisite] = required
            changed = true
            ensure(prerequisite)
          }
        }
      }
      for (const upgradeName of Object.keys(this.upgradeLevels))
        ensure(upgradeName)
      if (changed)
        this.invalidateCaches()
    }

    // The other way round: removes every upgrade whose prerequisites aren't
    // met, e.g. SR1 (needs Hyperflux 4) from an H0-H3 row's maxed tree.
    dropUnmetPrerequisites(): void {
      let changed = true
      while (changed) {
        changed = false
        for (const upgradeName of Object.keys(this.upgradeLevels)) {
          if ((this.upgradeLevels[upgradeName] ?? 0) <= 0)
            continue
          const prerequisites = upgrades[upgradeName]?.prerequisites ?? {}
          for (const prerequisite in prerequisites) {
            if ((this.upgradeLevels[prerequisite] ?? 0) < (prerequisites[prerequisite] ?? 0)) {
              this.upgradeLevels[upgradeName] = 0
              changed = true
              break
            }
          }
        }
      }
      this.invalidateCaches()
    }

    fixBlueberryUpgrades(): void {

      if (this.blueberryCost <= stats.blueberries)
        return

      const removeUpgrade = (upgradeName: string): void => {
        if ((this.upgradeLevels[upgradeName] ?? 0) <= 0)
          return
        this.upgradeLevels[upgradeName] = 0
        for (const dependent of dependentUpgrades[upgradeName] ?? []) {
          const required = upgrades[dependent].prerequisites[upgradeName] ?? 0
          if ((this.upgradeLevels[upgradeName] ?? 0) < required)
            removeUpgrade(dependent)
        }
      }

      switch (this.blueberryCost - stats.blueberries) {
        case 9:
        case 10:
          removeUpgrade("ambrosiaInfiniteShopUpgrades1")
          removeUpgrade("ambrosiaBaseObtainium1")
          removeUpgrade("ambrosiaBaseOffering1")
        case 6:
        case 7:
          removeUpgrade("ambrosiaInfiniteShopUpgrades2")
          removeUpgrade("ambrosiaBaseObtainium2")
          removeUpgrade("ambrosiaBaseOffering2")
      }
      this.invalidateCaches()
      if (this.blueberryCost - stats.blueberries === 1)
        removeUpgrade("ambrosiaFreeLuckUpgrades")
      this.invalidateCaches()

      // Remove the weakest/most expensive upgrades first
      if (this.blueberryCost > stats.blueberries) { // This frees 6 blueberries
        removeUpgrade("ambrosiaLuck4") // This frees 5 blueberries
        this.invalidateCaches()
        if (this.blueberryCost - stats.blueberries === 1)
          removeUpgrade("ambrosiaFreeLuckUpgrades")
        this.invalidateCaches()
      }

      if (this.blueberryCost > stats.blueberries) { // This frees 6 blueberries
        removeUpgrade("ambrosiaInfiniteShopUpgrades2")
        removeUpgrade("ambrosiaBaseObtainium2")
        removeUpgrade("ambrosiaBaseOffering2")
        this.invalidateCaches()
        if (this.blueberryCost - stats.blueberries === 1)
          removeUpgrade("ambrosiaFreeLuckUpgrades")
        this.invalidateCaches()
      }

      if (this.blueberryCost > stats.blueberries) { // This frees 3 blueberries
        removeUpgrade("ambrosiaInfiniteShopUpgrades1")
        removeUpgrade("ambrosiaBaseObtainium1")
        removeUpgrade("ambrosiaBaseOffering1")
        if (this.blueberryCost > stats.blueberries)
          removeUpgrade("ambrosiaFreeLuckUpgrades")
        this.invalidateCaches()
      }

      // The older repair rules above predate the Exalt 9 modules.  A merged
      // candidate can therefore still exceed the blueberry budget after all
      // of those rules have run (for example, Quarks 4 + Cubes 4 + Two Mind).
      // Keep the established priority order, then use a deterministic safety
      // pass so every loadout returned by findOpt is affordable.  Purple
      // blueberry-cost reductions are included by blueberryCost, so this only
      // removes a module when its effective cost is still positive.
      for (const upgradeToRemove of blueberryRemovalOrder) {
        if (this.blueberryCost <= stats.blueberries)
          break
        if ((this.upgradeLevels[upgradeToRemove] ?? 0) <= 0)
          continue
        removeUpgrade(upgradeToRemove)
        this.invalidateCaches()
      }

      this.invalidateCaches()

    }

    get format(): string {
        let upgradeLevels: Record<string, number> = {}
        for (let upgrade in upgrades)
            if ((this.upgradeLevels[upgrade] ?? 0) > 0)
                upgradeLevels[upgrade] = this.upgradeLevels[upgrade]
        return JSON.stringify(upgradeLevels)
    }

    // effectStat: the stat the Effect shows, when it isn't the one "Maxed"
    // checks (Max SR rows: cubes, maxed on their SR level).
    generateOutput(stat: string = "", maxLoadout: Loadout, p4x4: number | null = null, effectStat: string = stat): HeaterResultRow {

        this.invalidateCaches()
        if (stat === "")
            return unaffordableRow();
        if (this.cost > stats.amb)
            return unaffordableRow(this);
        // Safety net: the game refuses to load a tree that needs more
        // Blueberries than owned, so never hand one out.
        if (this.blueberryCost > stats.blueberries) {
            HSLogger.warn(`[HeaterDiag] ${stat} loadout needs ${this.blueberryCost} Blueberries, ${stats.blueberries} owned: reported Unaffordable`, 'HSHeaterOptimizer');
            return unaffordableRow(this);
        }

        let baseLoadout = new Loadout();
        let effectStr: string;
        if (effectStat === 'coinsC15')
          effectStr = formatHeaterCoinsC15Effect(this.compareStat(baseLoadout, 'coinsC15'))
        else if (effectStat === "singReduction" || effectStat === "vouchers")
          // A number of levels gained, shown as an integer (3, not 3.00)
          effectStr = formatNumber(this.getStat(effectStat) - baseLoadout.getStat(effectStat), false)
        else if (baseLoadout.getStat(effectStat) === 0)
          effectStr = "N / A"
        else if (effectStat === "obtAndOff")
          effectStr = formatNumber(this.getStat("obt") / baseLoadout.getStat("obt"))
            + HEATER_EFFECT_PAIR_SEPARATOR + formatNumber(this.getStat("off") / baseLoadout.getStat("off"))
        else {
          const ratio = this.getStat(effectStat) / baseLoadout.getStat(effectStat)
          // Platonic Tau (see the "ambOct" stat) raises cube and Octeract ratios
          effectStr = formatNumber(effectStat === "cube" || effectStat === "oct" ? ratio ** stats.tauPower : ratio)
        }

        const isMaxed = stat === 'coinsC15' ? this.compareStat(maxLoadout, stat) >= 0
            : this.getStat(stat) >= maxLoadout.getStat(stat)
        const row: HeaterResultAffordableRow = [
            this.format,
            null,
            this.blueberryCost,
            this.cost,
            effectStr,
            (p4x4 === null) ? "" : (p4x4 > 50 ? "Never" : p4x4),
            isMaxed,
        ];
        if (!isMaxed) {
            const limits = this.limitingResources(stat, maxLoadout)
            if (limits)
                row[7] = limits
            row[9] = prunedReference(maxLoadout, stat).format
        }
        return row;

    }

    // Tries one more level of each upgrade, prerequisites included, within
    // maxLoadout's levels (an H row's Hyperflux stays put). A level that raises the stat but needs more
    // Blueberries than are left: Blueberries limit; one whose Blueberries fit
    // but not its Ambrosia: Ambrosia limits. Works on a copy, as an H row's
    // cached Cube stat leaves its Hyperflux out.
    limitingResources(stat: string, maxLoadout: Loadout): HeaterResultLimits | undefined {
        const base = new Loadout(this)
        const baseStat = base.getStat(stat)
        const spareAmbrosia = stats.amb - base.cost
        const spareBlueberries = stats.blueberries - base.blueberryCost
        const limits: HeaterResultLimits = { ambrosia: false, blueberries: false }
        for (const upgradeName in upgrades) {
            const level = base.upgradeLevels[upgradeName] ?? 0
            if (level >= (maxLoadout.upgradeLevels[upgradeName] ?? 0)
              || (upgrades[upgradeName].requiresExalt9 && !stats.exalt9Unlocked))
                continue
            const probe = new Loadout(base)
            probe.upgradeLevels[upgradeName] = level + 1
            probe.satisfyPrerequisites()
            // A prerequisite raised over maxLoadout's level: SR1 would raise an
            // H0-H3 row's Hyperflux. Only raised ones: the tree's own Brick can
            // be above the reference's (withBestBrickOfLead).
            if (Object.keys(probe.upgradeLevels).some(name =>
              (probe.upgradeLevels[name] ?? 0) > Math.max(base.upgradeLevels[name] ?? 0, maxLoadout.upgradeLevels[name] ?? 0)))
                continue
            if (stat === 'coinsC15' ? probe.compareStat(base, stat) <= 0 : probe.getStat(stat) <= baseStat)
                continue
            if (probe.blueberryCost - base.blueberryCost > spareBlueberries)
                limits.blueberries = true
            else if (probe.cost - base.cost > spareAmbrosia)
                limits.ambrosia = true
            if (limits.ambrosia && limits.blueberries)
                break
        }
        return limits.ambrosia || limits.blueberries ? limits : undefined
    }

    // Combines upgrades from both loadouts
    static union(loadout1: Loadout, loadout2: Loadout): Loadout {
        let result = new Loadout(loadout1);
        // Both inputs are already valid loadouts.  Adding only the increments
        // that are actually introduced by the second side is equivalent to
        // recomputing the max-level cost, but avoids rescanning every upgrade
        // key when the merged candidate is checked by a table or findOpt.
        let cost = loadout1.cost;
        let blueberryCost = loadout1.blueberryCost;
        for (let upgrade in loadout2.upgradeLevels) {
            const oldLevel = result.upgradeLevels[upgrade] ?? 0;
            const newLevel = Math.max(oldLevel, loadout2.upgradeLevels[upgrade]);
            if (newLevel <= oldLevel)
                continue;
            result.upgradeLevels[upgrade] = newLevel;
            cost += upgrades[upgrade].cost(newLevel) - upgrades[upgrade].cost(oldLevel);
            if (oldLevel <= 0)
                blueberryCost += Math.max(
                  0,
                  upgrades[upgrade].blueberryCost
                    - (stats.ambrosiaUpgradeBlueberryCostReductions[upgrade] ?? 0),
                );
        }
        result.setCachedCosts(cost, blueberryCost);
        return result;
    }

}

const cubeExperimentDirectCube = new Set([
  "ambrosiaCubes1", "ambrosiaCubes2", "ambrosiaCubes3", "ambrosiaCubes4",
  "ambrosiaFreeCubeUpgrades", "ambrosiaQuarkCube1", "ambrosiaHyperflux",
])
const cubeExperimentPureLuck = new Set([
  "ambrosiaLuck1", "ambrosiaLuck2", "ambrosiaLuck3", "ambrosiaLuck4",
  "ambrosiaFreeLuckUpgrades", "ambrosiaCubeLuck1", "ambrosiaQuarkLuck1",
])
const cubeExperimentCubeLuckHybrid = new Set([
  "ambrosiaLuckCube1", "ambrosiaBrickOfLead",
])
const cubeExperimentVouchers = new Set([
  "ambrosiaInfiniteShopUpgrades1", "ambrosiaInfiniteShopUpgrades2",
  "ambrosiaInfiniteShopUpgrades3",
])

function cubeExperimentSpending(loadout: Loadout): HeaterCubeExperimentSpending {
  const spending: HeaterCubeExperimentSpending = {
    directCube: 0,
    pureLuck: 0,
    cubeLuckHybrid: 0,
    vouchers: 0,
    sharedOrOther: 0,
    total: 0,
  }
  for (const [upgradeName, level] of Object.entries(loadout.upgradeLevels)) {
    if (level <= 0)
      continue
    const cost = upgrades[upgradeName].cost(level)
    spending.total += cost
    if (cubeExperimentDirectCube.has(upgradeName))
      spending.directCube += cost
    else if (cubeExperimentPureLuck.has(upgradeName))
      spending.pureLuck += cost
    else if (cubeExperimentCubeLuckHybrid.has(upgradeName))
      spending.cubeLuckHybrid += cost
    else if (cubeExperimentVouchers.has(upgradeName))
      spending.vouchers += cost
    else
      spending.sharedOrOther += cost
  }
  return spending
}

function cubeExperimentLuckSpend(loadout: Loadout): number {
  const spending = cubeExperimentSpending(loadout)
  return spending.pureLuck + spending.cubeLuckHybrid
}


// ===========================================================================
// Table helpers (mirrors sheet_script trimTable/generateTable/mergeTables/findOpt)
// ===========================================================================

// The overlap cost in 2*union - left - right is monotone in the right row
// only when every upgrade shared with the left table has a fixed level in the
// right table.  In that case the old early break is mathematically safe and
// avoids scanning the remainder of a sorted cost frontier.  Variable shared
// levels disable it because overlap savings could otherwise make a later row
// affordable again.
function fixedSharedLevels(table1: Loadout[], table2: Loadout[]): boolean {
  if (table1.length === 0 || table2.length === 0)
    return true
  const leftKeys = new Set(Object.keys(table1[0].upgradeLevels))
  const shared = new Set<string>()
  for (const loadout of table1)
    for (const key of Object.keys(loadout.upgradeLevels))
      leftKeys.add(key)
  for (const loadout of table2)
    for (const key of Object.keys(loadout.upgradeLevels))
      if (leftKeys.has(key)) shared.add(key)
  for (const key of shared) {
    let min = Infinity
    let max = -Infinity
    for (const loadout of table2) {
      const level = loadout.upgradeLevels[key] ?? 0
      min = Math.min(min, level)
      max = Math.max(max, level)
    }
    if (min !== max)
      return false
  }
  return true
}

// Split a large right frontier by every shared upgrade level that varies in
// that frontier.  Within each group the overlap cost is fixed and union cost
// is monotone, so the exact search can stop at the first unaffordable row.
function groupBySharedLevels(table1: Loadout[], table2: Loadout[]): Loadout[][] | undefined {
  const leftKeys = new Set<string>()
  for (const loadout of table1)
    for (const key of Object.keys(loadout.upgradeLevels))
      leftKeys.add(key)

  const first = table2[0]
  const variableKeys: string[] = []
  for (const key of leftKeys) {
    const firstLevel = first.upgradeLevels[key] ?? 0
    if (table2.some(loadout => (loadout.upgradeLevels[key] ?? 0) !== firstLevel))
      variableKeys.push(key)
  }
  if (variableKeys.length === 0)
    return undefined

  const groups = new Map<string, Loadout[]>()
  for (const loadout of table2) {
    const signature = variableKeys.map(key => loadout.upgradeLevels[key] ?? 0).join(',')
    const group = groups.get(signature)
    if (group) group.push(loadout)
    else groups.set(signature, [loadout])
    // A very fragmented frontier gains nothing from partitioning.  Fall back
    // to the original exact search instead of allocating hundreds of groups.
    if (groups.size > 32) {
      cubeExperimentDiagnostics?.searchPartitions.push({
        leftSize: table1.length,
        rightSize: table2.length,
        variableKeys,
        groupCount: groups.size,
        partitioned: false,
      })
      return undefined
    }
  }
  const partitioned = groups.size > 1
  cubeExperimentDiagnostics?.searchPartitions.push({
    leftSize: table1.length,
    rightSize: table2.length,
    variableKeys,
    groupCount: groups.size,
    partitioned,
  })
  return partitioned ? [...groups.values()] : undefined
}

// Partition whenever the ungrouped Cartesian search is large enough to make
// fixed-overlap early exits worthwhile.  The old per-side thresholds missed
// narrow-by-wide searches such as Offerings (roughly 500 x 9,000 candidates),
// even though those contain millions of exact pair checks.
function shouldGroupSharedLevelSearch(table1: Loadout[], table2: Loadout[]): boolean {
  return table1.length > 100
    && table2.length > 100
    && (table1.length > 5000 && table2.length > 1000
      || table1.length * table2.length > 1_000_000)
}

// Removes suboptimal loadouts from the table
function trimTable(table: Loadout[], stat: string): Loadout[] {
    if (table.length === 0)
      return [new Loadout()]

    // If every candidate consumes the same number of blueberries, the second
    // resource cannot affect dominance and the cheaper one-dimensional trim is
    // exact.  This is common for the independent rune/chain tables.
    const firstBerry = table[0].blueberryCost
    if (table.every(loadout => loadout.blueberryCost === firstBerry)) {
      table.sort((left, right) => left.cost === right.cost
        ? right.getStat(stat) - left.getStat(stat)
        : left.cost - right.cost)
      const simple: Loadout[] = [table[0]]
      let last = 0
      for (let index = 1; index < table.length; index++) {
        if (table[index].getStat(stat) > table[last].getStat(stat)) {
          last = index
          simple.push(table[index])
        }
      }
      return simple
    }

    // Blueberries are a second independent resource.  A stat-only trim can
    // discard a slightly weaker/cheaper candidate that uses fewer berries,
    // after which a later merge incorrectly reports a loadout as unaffordable
    // and leaves a large part of the Ambrosia budget unused.  Keep the full
    // three-dimensional Pareto frontier (cost, blueberries, stat).
    const berryValues = [...new Set(table.map(loadout => loadout.blueberryCost))].sort((left, right) => left - right)
    const berryIndices = new Map(berryValues.map((value, index) => [value, index + 1]))
    const berryIndex = (value: number): number => berryIndices.get(value) ?? 0
    const tree = new Array<number>(berryValues.length + 1).fill(-Infinity)
    const query = (index: number): number => {
      let result = -Infinity
      while (index > 0) {
        result = Math.max(result, tree[index])
        index -= index & -index
      }
      return result
    }
    const update = (index: number, value: number): void => {
      while (index < tree.length) {
        tree[index] = Math.max(tree[index], value)
        index += index & -index
      }
    }

    type TrimEntry = Loadout & { __trimStat: number; __trimCost: number; __trimBerry: number }
    for (const loadout of table) {
      const entry = loadout as TrimEntry
      entry.__trimStat = loadout.getStat(stat)
      entry.__trimCost = loadout.cost
      entry.__trimBerry = loadout.blueberryCost
    }
    table.sort((left, right) => {
      const a = left as TrimEntry
      const b = right as TrimEntry
      return a.__trimCost - b.__trimCost
        || b.__trimStat - a.__trimStat
        || a.__trimBerry - b.__trimBerry
    })

    const result: Loadout[] = []
    for (const loadout of table) {
      const entry = loadout as TrimEntry
      const index = berryIndex(entry.__trimBerry)
      if (query(index) >= entry.__trimStat)
        continue
      result.push(loadout)
      update(index, entry.__trimStat)
    }
    const trimmed = result.length > 0 ? result : [new Loadout()]
    return trimmed
}

// Pareto dominance is transitive: a row discarded from one batch cannot
// become useful after later rows are added. This keeps Cartesian merges from
// retaining millions of complete Loadout objects until the final sort.
function createBatchedTable(stat: string) {
  const BATCH_SIZE = 20_000
  const MAX_FRONTIER = 500_000
  let frontier: Loadout[] = []
  let pending: Loadout[] = []
  const flush = (): void => {
    if (pending.length === 0)
      return
    frontier.push(...pending)
    pending = []
    frontier = trimTable(frontier, stat)
    if (frontier.length > MAX_FRONTIER)
      throw new Error(`Heater ${stat} search exceeded its ${MAX_FRONTIER}-build memory safety limit. Try fewer builds at once.`)
  }
  return {
    add(loadout: Loadout): void {
      pending.push(loadout)
      if (pending.length >= BATCH_SIZE)
        flush()
    },
    finish(): Loadout[] {
      flush()
      return frontier.length > 0 ? frontier : [new Loadout()]
    },
  }
}

// Trims a dependent upgrade chain without throwing away a loadout that can
// unlock a stronger later tier.  A normal stat-only Pareto trim is unsafe for
// chains such as Cubes I -> II -> III because a slightly weaker Cubes-I
// candidate may still have the higher prerequisite level needed by Cubes II.
// Since all future effects are monotone in the prerequisite level, a candidate
// is removable only when an earlier (no more expensive) candidate has both a
// higher stat and an equal-or-higher raw level of the dependency upgrade.
function trimTableWithDependency(table: Loadout[], stat: string, dependency: string): Loadout[] {
    if (table.length === 0)
      return [new Loadout()]

    const maxDependency = upgrades[dependency]?.maxLevel ?? 0
    const berryValues = [...new Set(table.map(loadout => loadout.blueberryCost))].sort((left, right) => left - right)
    const berryIndices = new Map(berryValues.map((value, index) => [value, index + 1]))
    const berryIndex = (value: number): number => berryIndices.get(value) ?? 0
    // A segment tree over dependency levels, with a Fenwick prefix-max tree
    // at each segment node, answers "any higher dependency level using no more
    // berries" in O(log(levels) log(berries)) instead of scanning every level
    // for every candidate.  This matters for the 100x100 rune tables.
    let treeSize = 1
    while (treeSize < maxDependency + 1) treeSize <<= 1
    const trees = Array.from(
      { length: 2 * treeSize },
      () => new Array<number>(berryValues.length + 1).fill(-Infinity),
    )
    const queryBerry = (tree: number[], index: number): number => {
      let result = -Infinity
      while (index > 0) {
        result = Math.max(result, tree[index])
        index -= index & -index
      }
      return result
    }
    const updateBerry = (tree: number[], index: number, value: number): void => {
      while (index < tree.length) {
        tree[index] = Math.max(tree[index], value)
        index += index & -index
      }
    }
    const queryLevels = (minimumLevel: number, berryPrefix: number): number => {
      let left = treeSize + minimumLevel
      let right = treeSize + maxDependency + 1
      let result = -Infinity
      while (left < right) {
        if (left & 1) result = Math.max(result, queryBerry(trees[left++], berryPrefix))
        if (right & 1) result = Math.max(result, queryBerry(trees[--right], berryPrefix))
        left >>= 1
        right >>= 1
      }
      return result
    }
    const updateLevel = (level: number, berryPrefix: number, value: number): void => {
      let node = treeSize + level
      while (node > 0) {
        updateBerry(trees[node], berryPrefix, value)
        node >>= 1
      }
    }

    type TrimDependencyEntry = Loadout & { __trimStat: number; __trimCost: number; __trimBerry: number }
    for (const loadout of table) {
      const entry = loadout as TrimDependencyEntry
      entry.__trimStat = loadout.getStat(stat)
      entry.__trimCost = loadout.cost
      entry.__trimBerry = loadout.blueberryCost
    }
    table.sort((left, right) => {
      const a = left as TrimDependencyEntry
      const b = right as TrimDependencyEntry
      return a.__trimCost - b.__trimCost
        || b.__trimStat - a.__trimStat
        || (b.upgradeLevels[dependency] ?? 0) - (a.upgradeLevels[dependency] ?? 0)
    })

    const result: Loadout[] = []
    for (const loadout of table) {
      const entry = loadout as TrimDependencyEntry
      const level = Math.max(0, Math.min(maxDependency, entry.upgradeLevels[dependency] ?? 0))
      const index = berryIndex(entry.__trimBerry)
      if (queryLevels(level, index) >= entry.__trimStat)
        continue
      result.push(loadout)
      updateLevel(level, index, entry.__trimStat)
    }
    const trimmed = result.length > 0 ? result : [new Loadout()]
    return trimmed
}

// Generates a dependent chain one tier at a time.  Keeping the frontier after
// each tier avoids materialising the full Cartesian product (which was the
// dominant cost for the SR cube search), while the dependency-aware trim keeps
// every state that can improve a later tier.
function experimentNow(): number {
  return typeof performance !== "undefined" ? performance.now() : Date.now()
}

// An "Unaffordable" row. needed: the tree the row needs, or with atLeast the
// smallest one that could fill it; what it costs over the inputs names the
// short resource(s), shown in the row's cost columns.
function unaffordableRow(needed?: Loadout, atLeast = false): HeaterResultUnaffordableRow {
  const row: HeaterResultUnaffordableRow = ["Unaffordable", null, "N / A", "N / A", "N / A", "N / A", false]
  if (needed === undefined)
    return row
  const shortfall: HeaterResultShortfall = { atLeast }
  if (needed.cost > stats.amb)
    shortfall.ambrosia = { need: needed.cost, have: stats.amb }
  if (needed.blueberryCost > stats.blueberries)
    shortfall.blueberries = { need: needed.blueberryCost, have: stats.blueberries }
  if (shortfall.ambrosia || shortfall.blueberries)
    row[7] = shortfall
  return row
}

// A Max SR row's Effect title: what its SR levels lift off the singularity
// penalties (the cube part is already in its Effect).
function withPenaltyReliefTitle(row: HeaterResultRow, levels: number): HeaterResultRow {
  if (row[0] === "Unaffordable" || levels <= 0)
    return row
  const affordable = row as HeaterResultAffordableRow
  const relief = (stat: string) => Upgrade.singDebuff(stats.sing, stat) / Upgrade.singDebuff(stats.sing - levels, stat)
  affordable[8] = `Penalties as if ${levels} ${levels === 1 ? "Singularity" : "Singularities"} lower:\n`
    + `Obtainium and Offerings ×${formatNumber(relief("mOff"))}\n`
    + `Cubes ×${formatNumber(relief("cube"))} (in the Effect)`
  return row
}

function effectiveBlueberryCost(upgradeName: string): number {
  return Math.max(
    0,
    upgrades[upgradeName].blueberryCost
      - (stats.ambrosiaUpgradeBlueberryCostReductions[upgradeName] ?? 0),
  )
}

function cubeExperimentPrerequisiteLevels(upgradeName: string): Set<number> {
  const levels = new Set<number>()
  for (const upgrade of Object.values(upgrades)) {
    const level = upgrade.prerequisites[upgradeName]
    if (level !== undefined && level > 0)
      levels.add(level)
  }
  return levels
}

function cubeExperimentRetainedLevels(
  upgradeName: string,
  preLoadout: Loadout,
  minimumLevel: number,
): Set<number> | undefined {
  const window = cubeExperimentConfig?.cubeLevelWindows?.[upgradeName as HeaterCubeExperimentUpgrade]
  if (window === undefined || window <= 0)
    return undefined

  const upgrade = upgrades[upgradeName]
  let maximumAffordable = 0
  for (let level = Math.max(1, minimumLevel); level <= upgrade.maxLevel; level++) {
    if (preLoadout.cost + upgrade.cost(level) > stats.amb)
      break
    maximumAffordable = level
  }
  const retained = new Set<number>()
  const firstHighLevel = Math.max(minimumLevel, maximumAffordable - Math.max(1, Math.floor(window)) + 1)
  for (let level = firstHighLevel; level <= maximumAffordable; level++)
    retained.add(level)

  for (const level of cubeExperimentPrerequisiteLevels(upgradeName)) {
    if (level >= minimumLevel && level <= maximumAffordable)
      retained.add(level)
  }

  if (cubeExperimentConfig?.retainMilestonesBelowWindow) {
    for (let level = minimumLevel; level < firstHighLevel; level++) {
      const probe = new Loadout(preLoadout)
      probe.upgradeLevels[upgradeName] = level
      probe.invalidateCaches()
      if (probe.effectiveLevel(upgradeName) % 5 === 0)
        retained.add(level)
    }
  }
  return retained
}

function generateDependentChainTable(
  selectedUpgrades: string[],
  stat: string,
  minLevels: Record<string, number> = {},
): Loadout[] {
    const dependentEffect: Record<string, string> = {
      ambrosiaLuck1: 'ambrosiaLuck2',
      ambrosiaQuarks1: 'ambrosiaQuarks2',
      ambrosiaQuarks2: 'ambrosiaQuarks3',
      ambrosiaCubes1: 'ambrosiaCubes2',
      ambrosiaCubes2: 'ambrosiaCubes3',
      ambrosiaTalismanBonusRuneLevel: 'ambrosiaRuneOOMBonus',
    }
    let table: Loadout[] = [new Loadout()]
    for (let index = 0; index < selectedUpgrades.length; index++) {
      const startedAt = experimentNow()
      const upgradeName = selectedUpgrades[index]
      const upgrade = upgrades[upgradeName]
      const expanded: Loadout[] = []
      const parentCount = table.length
      let enumeratedLevels = 0

      for (const parentLoadout of table) {
        const parentStat = parentLoadout.getStat(stat)
        // Keep the branch where this tier is not purchased unless the caller
        // explicitly requires a minimum level (the sheet uses this for the
        // luck-I local-optimum table).
        const experimentWindow = cubeExperimentConfig?.cubeLevelWindows?.[upgradeName as HeaterCubeExperimentUpgrade]
        const omitZeroExperimentCandidate = experimentWindow !== undefined
          && experimentWindow > 0
          && effectiveBlueberryCost(upgradeName) === 0
        if ((minLevels[upgradeName] ?? 0) <= 0 && !omitZeroExperimentCandidate) {
          const loadout = new Loadout(parentLoadout)
          loadout.setCachedStat(stat, parentStat)
          expanded.push(loadout)
        }

        const preLoadout = new Loadout(parentLoadout)
        preLoadout.upgradeLevels[upgradeName] = 1
        preLoadout.invalidateCaches()
        preLoadout.satisfyPrerequisites()
        if (preLoadout.blueberryCost > stats.blueberries)
          continue
        preLoadout.upgradeLevels[upgradeName] = 0
        preLoadout.invalidateCaches()
        const prerequisiteStat = preLoadout.getStat(stat)
        const minimumLevel = minLevels[upgradeName] ?? 1
        const retainedLevels = cubeExperimentRetainedLevels(upgradeName, preLoadout, minimumLevel)

        for (let level = minimumLevel; level <= upgrade.maxLevel; level++) {
          const cost = preLoadout.cost + upgrade.cost(level)
          if (stats.amb < cost)
            break
          if (retainedLevels !== undefined && !retainedLevels.has(level))
            continue
          enumeratedLevels++
          const loadout = new Loadout(preLoadout)
          loadout.upgradeLevels[upgradeName] = level
          // Red free levels already affect an unpurchased tier. Apply only
          // the difference between old and new effective effects, including
          // the next tier's cross-effect (which can be active at raw 0), and
          // the Purple free-level jump at raw 1.
          const dependent = dependentEffect[upgradeName]
          let chainStat: number
          if (stat === 'luck') {
            const multiplier = 1 + preLoadout.getStat('mLuck')
            const effectDelta = (name: string): number => loadout.getEffect(0, name, 'luck')
              - preLoadout.getEffect(0, name, 'luck')
            const beforeUnassigned = stats.blueberries - preLoadout.blueberryCost
            const afterUnassigned = stats.blueberries - loadout.blueberryCost
            const beforeLeo = beforeUnassigned >= 5 ? beforeUnassigned * stats.purpleLeoLevel : 0
            const afterLeo = afterUnassigned >= 5 ? afterUnassigned * stats.purpleLeoLevel : 0
            chainStat = (prerequisiteStat / multiplier + effectDelta(upgradeName)
              + (dependent ? effectDelta(dependent) : 0) + afterLeo - beforeLeo) * multiplier
          } else if (stat === 'obt' || stat === 'off') {
            const multiplierStat = stat === 'obt' ? 'mObt' : 'mOff'
            const oldMultiplier = preLoadout.getStat(multiplierStat)
            const newMultiplier = loadout.getStat(multiplierStat)
            const oldEffect = preLoadout.getEffect(0, upgradeName, stat)
            const newEffect = loadout.getEffect(0, upgradeName, stat)
            chainStat = (prerequisiteStat / oldMultiplier + newEffect - oldEffect) * newMultiplier
          } else {
            const effectRatio = (name: string): number => {
              const oldEffect = preLoadout.getEffect(1, name, stat as keyof UpgradeEffectMap)
              return oldEffect === 0 ? 1
                : loadout.getEffect(1, name, stat as keyof UpgradeEffectMap) / oldEffect
            }
            let ratio = effectRatio(upgradeName)
            if (dependent)
              ratio *= effectRatio(dependent)
            // Red-free Luck hybrids are active even with no raw purchase.
            // Their factors can change when this tier consumes a blueberry
            // and Purple Leo consequently changes unassigned-berry Luck.
            if (stats.purpleLeoLevel > 0 && loadout.blueberryCost !== preLoadout.blueberryCost) {
              const hybrid = stat === 'cube' ? 'ambrosiaLuckCube1'
                : stat === 'quark' ? 'ambrosiaLuckQuark1' : undefined
              if (hybrid)
                ratio *= effectRatio(hybrid)
            }
            chainStat = prerequisiteStat * ratio
          }
          if (cubeExperimentConfig?.validateChainScores) {
            const actual = loadout.getStat(stat)
            if (Math.abs(actual - chainStat) > 1e-9 * Math.max(1, Math.abs(actual))) {
              throw new Error(`Dependent ${stat} mismatch: cached=${chainStat}, actual=${actual}, loadout=${JSON.stringify(loadout.upgradeLevels)}`)
            }
          }
          loadout.setCachedStat(stat, chainStat)
          expanded.push(loadout)
        }
      }

      // Every tier except the final one is a prerequisite for the next tier;
      // preserve its raw level while trimming.  The final tier can use the
      // ordinary stat/cost frontier.
      if (index < selectedUpgrades.length - 1)
        table = trimTableWithDependency(expanded, stat, upgradeName)
      else
        table = trimTable(expanded, stat)
      cubeExperimentDiagnostics?.chainTiers.push({
        upgrade: upgradeName,
        parentCount,
        enumeratedLevels,
        expandedCount: expanded.length,
        frontierCount: table.length,
        elapsedMs: experimentNow() - startedAt,
      })
    }
    return table
}

// SynergismOfficial checks purchased (not effective) levels for prerequisites:
// tier 2 requires 20 purchased tier-1 levels and tier 3 requires 20 purchased
// tier-2 levels.  The canonical tier-1 -> tier-2 -> tier-3 sequence is therefore
// the complete legal purchase path, including the important tier-2/3 level-1
// rows that activate their Purple Ambrosia enchantment levels.  Generating only
// that path avoids searching impossible or equivalent allocations.
function generateVoucherTable(stat: string): Loadout[] {
    if (stats.exalt === 4)
      return [new Loadout()]

    const result: Loadout[] = []
    for (let vouchers = 0; vouchers <= upgrades.ambrosiaInfiniteShopUpgrades1.maxLevel
      + upgrades.ambrosiaInfiniteShopUpgrades2.maxLevel
      + upgrades.ambrosiaInfiniteShopUpgrades3.maxLevel; vouchers++) {
      const loadout = new Loadout()
      loadout.upgradeLevels.ambrosiaInfiniteShopUpgrades1 = Math.min(vouchers, upgrades.ambrosiaInfiniteShopUpgrades1.maxLevel)
      loadout.upgradeLevels.ambrosiaInfiniteShopUpgrades2 = Math.min(
        Math.max(0, vouchers - upgrades.ambrosiaInfiniteShopUpgrades1.maxLevel),
        upgrades.ambrosiaInfiniteShopUpgrades2.maxLevel,
      )
      loadout.upgradeLevels.ambrosiaInfiniteShopUpgrades3 = Math.max(
        0,
        vouchers - upgrades.ambrosiaInfiniteShopUpgrades1.maxLevel - upgrades.ambrosiaInfiniteShopUpgrades2.maxLevel,
      )
      loadout.invalidateCaches()
      loadout.satisfyPrerequisites()
      if (loadout.cost > stats.amb || loadout.blueberryCost > stats.blueberries)
        break
      result.push(loadout)
    }
    return trimTable(result, stat)
}

// Luck builds buy vouchers after their direct modules. Some voucher levels
// leave the displayed Red Luck unchanged because its conversion rounds down;
// prefer the most purchased vouchers among equal-scoring affordable rows.
// Their small Panthema/Jack effects are still scored, but do not steer the
// primary bar-and-luck allocation.
function addLastPriorityVouchers(
  loadout: Loadout,
  voucherTable: Loadout[],
  stat: "luck" | "rLuck" | "allAmb" | BarIncomeStat,
): Loadout {
  let best = new Loadout(loadout)
  let bestValue = best.getStat(stat)
  let bestVouchers = (best.upgradeLevels.ambrosiaInfiniteShopUpgrades1 ?? 0)
    + (best.upgradeLevels.ambrosiaInfiniteShopUpgrades2 ?? 0)
    + (best.upgradeLevels.ambrosiaInfiniteShopUpgrades3 ?? 0)
    for (const row of voucherTable) {
    const candidate = Loadout.union(loadout, row)
    if (candidate.cost > stats.amb || candidate.blueberryCost > stats.blueberries)
      continue
    const value = candidate.getStat(stat)
    const vouchers = (candidate.upgradeLevels.ambrosiaInfiniteShopUpgrades1 ?? 0)
      + (candidate.upgradeLevels.ambrosiaInfiniteShopUpgrades2 ?? 0)
      + (candidate.upgradeLevels.ambrosiaInfiniteShopUpgrades3 ?? 0)
    if (value > bestValue || (value === bestValue && vouchers > bestVouchers)) {
      best = candidate
      bestValue = value
      bestVouchers = vouchers
    }
  }
  return best
}

// The reference a row's "Maxed" compares with: the all-max tree, with Brick
// of Lead at the level that suits the stat best. Brick adds luck but slows
// ascension speed, which cubes follow under One Mind: at 25 the reference
// was below trees missing levels (S291: Cubes best at Brick 7). A tie keeps
// the lower level.
function withBestBrickOfLead(reference: Loadout, stat: string): Loadout {
  let best = reference
  let bestValue = -Infinity
  for (let level = 0; level <= upgrades.ambrosiaBrickOfLead.maxLevel; level++) {
    const candidate = new Loadout(reference)
    candidate.upgradeLevels.ambrosiaBrickOfLead = level
    const value = candidate.getStat(stat)
    if (value > bestValue) {
      best = candidate
      bestValue = value
    }
  }
  return best
}

// What a ✘ row's preview shows: the reference with every upgrade that doesn't
// move the row's stat set to 0, with the upgrades that need it, so it reads
// as what ✔ needs rather than "everything at max". Greedy, in the upgrades'
// order; the stat never drops below the reference's, so the row's ✘ holds.
function prunedReference(reference: Loadout, stat: string): Loadout {
  const removeWithDependents = (loadout: Loadout, upgradeName: string): void => {
    if ((loadout.upgradeLevels[upgradeName] ?? 0) <= 0)
      return
    loadout.upgradeLevels[upgradeName] = 0
    for (const dependent of dependentUpgrades[upgradeName] ?? [])
      removeWithDependents(loadout, dependent)
  }
  let pruned = new Loadout(reference)
  for (const upgradeName in upgrades) {
    // Patreon: every loadout keeps its level 1 (Loadout constructor)
    if (upgradeName === 'ambrosiaPatreon' || (pruned.upgradeLevels[upgradeName] ?? 0) <= 0)
      continue
    const candidate = new Loadout(pruned)
    removeWithDependents(candidate, upgradeName)
    if (candidate.compareStat(reference, stat) >= 0)
      pruned = candidate
  }
  // An upgrade kept only as a prerequisite goes down to the level its
  // dependents need (S291 Cubes: Quarks1 20, not 100).
  for (const upgradeName in upgrades) {
    const level = pruned.upgradeLevels[upgradeName] ?? 0
    if (upgradeName === 'ambrosiaPatreon' || level <= 0)
      continue
    let needed = 0
    for (const dependent of dependentUpgrades[upgradeName] ?? [])
      if ((pruned.upgradeLevels[dependent] ?? 0) > 0)
        needed = Math.max(needed, upgrades[dependent].prerequisites[upgradeName] ?? 0)
    if (needed <= 0 || needed >= level)
      continue
    const candidate = new Loadout(pruned)
    candidate.upgradeLevels[upgradeName] = needed
    if (candidate.compareStat(reference, stat) >= 0)
      pruned = candidate
  }
  return pruned
}

// The Max Amb + Oct base is the literal fully purchased All Ambrosia build.
// Voucher prerequisites add Cube/Offering/Obtainium purchases to its cost.
function fullAllAmbLoadout(): Loadout {
  const loadout = new Loadout()
  const allAmbUpgrades = [
    'ambrosiaLuck1', 'ambrosiaLuck2', 'ambrosiaLuck3', 'ambrosiaLuck4',
    'ambrosiaCubeLuck1', 'ambrosiaQuarkLuck1', 'ambrosiaFreeLuckUpgrades',
    'ambrosiaFreeRedLuckUpgrades', 'ambrosiaFreeGenerationUpgrades',
    'ambrosiaBrickOfLead', 'twoMind',
    'ambrosiaInfiniteShopUpgrades1', 'ambrosiaInfiniteShopUpgrades2',
    'ambrosiaInfiniteShopUpgrades3',
  ] as const
  for (const name of allAmbUpgrades) {
    if (!upgrades[name].requiresExalt9 || stats.exalt9Unlocked)
      loadout.upgradeLevels[name] = upgrades[name].maxLevel
  }
  loadout.satisfyPrerequisites()
  return loadout
}

// A rounded displayed score can leave an already-selected module one level
// short despite spare Ambrosia. Spend only the remaining budget, retain every
// existing module, and never reduce the exact objective value.
function fillSelectedLuckModules(
  loadout: Loadout,
  stat: "luck" | "rLuck" | "allAmb" | BarIncomeStat,
): Loadout {
  let current = new Loadout(loadout)
  let currentValue = current.getStat(stat)
  const relevant = new Set([
    ...(upgradeEffectKeys.luck ?? []),
    ...(upgradeEffectKeys.mLuck ?? []),
    ...(stat === "luck" ? [] : upgradeEffectKeys.rLuck ?? []),
    ...(stat === 'allAmb' || isBarIncomeStat(stat)
      ? upgradeEffectKeys.speed ?? [] : []),
    ...(stat === 'allAmb' || isBarIncomeStat(stat)
      ? upgradeEffectKeys.rSpeed ?? [] : []),
  ])
  for (const name of upgradeKeyOrder) {
    if (!relevant.has(name) || (current.upgradeLevels[name] ?? 0) <= 0)
      continue
    while ((current.upgradeLevels[name] ?? 0) < upgrades[name].maxLevel) {
      const candidate = new Loadout(current)
      candidate.upgradeLevels[name] = (candidate.upgradeLevels[name] ?? 0) + 1
      if (candidate.cost > stats.amb || candidate.blueberryCost > stats.blueberries)
        break
      const value = candidate.getStat(stat)
      if (value < currentValue)
        break
      current = candidate
      currentValue = value
    }
  }
  return current
}

const BAR_INCOME_STATS = ['incomeBlue', 'incomeRed', 'incomeAll', 'incomeHoney', 'incomePurpleAmb'] as const;
type BarIncomeStat = typeof BAR_INCOME_STATS[number];
const isBarIncomeStat = (stat: string): stat is BarIncomeStat =>
  (BAR_INCOME_STATS as readonly string[]).includes(stat);

// When every direct luck/bar module can be fully purchased with the available
// Ambrosia, luck-producing raw levels are monotone within a fixed set of
// purchased modules. The exceptions we must enumerate are the first purchase
// (blueberry/Purple-Leo cost), generation (routing can move points away from
// the red bar), and Brick of Lead (luck gain versus a longer blue bar).
// Two Mind's fixed-bar branch is also enumerated.
const barIncomeOptionalModules = [
  'ambrosiaLuck2', 'ambrosiaLuck3', 'ambrosiaLuck4',
  'ambrosiaCubeLuck1', 'ambrosiaQuarkLuck1',
  'ambrosiaFreeLuckUpgrades', 'ambrosiaFreeRedLuckUpgrades',
] as const;

function findAffordableFullLevelBarIncomeOpts(): Record<BarIncomeStat, Loadout> | null {
  if (!stats.reactor)
    return null;

  const maxedSubset = (mask: number): Loadout => {
    const loadout = new Loadout();
    loadout.upgradeLevels.ambrosiaLuck1 = upgrades.ambrosiaLuck1.maxLevel;
    for (let index = 0; index < barIncomeOptionalModules.length; index++) {
      if (mask & (1 << index)) {
        const name = barIncomeOptionalModules[index];
        loadout.upgradeLevels[name] = upgrades[name].maxLevel;
      }
    }
    loadout.satisfyPrerequisites();
    return loadout;
  };

  // A berry cap can make the literal all-max loadout impossible. Check the
  // highest fully leveled cost among *feasible purchase subsets* instead.
  // Only when that fits is the Ambrosia budget non-binding for every subset.
  let highestFullCost = 0;
  for (let mask = 0; mask < 1 << barIncomeOptionalModules.length; mask++) {
    const base = maxedSubset(mask);
    for (const generation of [0, upgrades.ambrosiaFreeGenerationUpgrades.maxLevel]) {
      for (const twoMind of stats.exalt9Unlocked ? [0, 1] : [0]) {
        for (const brick of [0, upgrades.ambrosiaBrickOfLead.maxLevel]) {
          const candidate = new Loadout(base);
          candidate.upgradeLevels.ambrosiaFreeGenerationUpgrades = generation;
          candidate.upgradeLevels.twoMind = twoMind;
          candidate.upgradeLevels.ambrosiaBrickOfLead = brick;
          if (candidate.blueberryCost <= stats.blueberries)
            highestFullCost = Math.max(highestFullCost, candidate.cost);
        }
      }
    }
  }
  if (highestFullCost > stats.amb)
    return null;

  const objectives = BAR_INCOME_STATS;
  const best = {} as Record<BarIncomeStat, Loadout>;
  const bestValue = Object.fromEntries(
    objectives.map(stat => [stat, -Infinity]),
  ) as Record<BarIncomeStat, number>;
  for (let mask = 0; mask < 1 << barIncomeOptionalModules.length; mask++) {
    const base = maxedSubset(mask);
    if (base.blueberryCost > stats.blueberries)
      continue;
    for (let generation = 0; generation <= upgrades.ambrosiaFreeGenerationUpgrades.maxLevel; generation++) {
      const withGeneration = new Loadout(base);
      withGeneration.upgradeLevels.ambrosiaFreeGenerationUpgrades = generation;
      if (withGeneration.blueberryCost > stats.blueberries)
        continue;
      for (const twoMind of stats.exalt9Unlocked ? [0, 1] : [0]) {
        for (let brick = 0; brick <= upgrades.ambrosiaBrickOfLead.maxLevel; brick++) {
          const candidate = new Loadout(withGeneration);
          candidate.upgradeLevels.twoMind = twoMind;
          candidate.upgradeLevels.ambrosiaBrickOfLead = brick;
          if (candidate.cost > stats.amb || candidate.blueberryCost > stats.blueberries)
            continue;
          for (const stat of objectives) {
            const value = candidate.getStat(stat);
            if (value > bestValue[stat]
              || (value === bestValue[stat] && candidate.cost < best[stat]?.cost)) {
              best[stat] = candidate;
              bestValue[stat] = value;
            }
          }
        }
      }
    }
  }
  return objectives.every(stat => best[stat]) ? best : null;
}

const barIncomeSearchModules = [
  'ambrosiaLuck1', 'ambrosiaLuck2', 'ambrosiaLuck3', 'ambrosiaLuck4',
  'ambrosiaCubeLuck1', 'ambrosiaQuarkLuck1', 'ambrosiaFreeLuckUpgrades',
  'ambrosiaFreeRedLuckUpgrades', 'ambrosiaFreeGenerationUpgrades',
  'ambrosiaBrickOfLead', 'twoMind',
] as const;

// Below the all-direct-levels-affordable regime, the old Luck frontier is a
// useful seed but not the objective: a lower Luck loadout can fill bars more
// frequently. Revisit every relevant module under the actual bar-income
// score. Dropping a parent also drops its dependents, which lets the search
// exchange blueberries between competing branches.
function improveBarIncomeLoadout(seed: Loadout, stat: BarIncomeStat): Loadout {
  if (!stats.reactor) return seed;
  const score = (loadout: Loadout): number => loadout.getStat(stat);
  const candidateAt = (base: Loadout, name: string, level: number): Loadout | null => {
    const candidate = new Loadout(base);
    candidate.upgradeLevels[name] = level;
    const removeInvalidDependents = (parent: string): void => {
      for (const dependent of dependentUpgrades[parent] ?? []) {
        const required = upgrades[dependent].prerequisites[parent] ?? 0;
        if ((candidate.upgradeLevels[dependent] ?? 0) > 0
            && (candidate.upgradeLevels[parent] ?? 0) < required) {
          candidate.upgradeLevels[dependent] = 0;
          removeInvalidDependents(dependent);
        }
      }
    };
    removeInvalidDependents(name);
    candidate.invalidateCaches();
    candidate.satisfyPrerequisites();
    return candidate.cost <= stats.amb && candidate.blueberryCost <= stats.blueberries
      ? candidate : null;
  };
  const ascend = (start: Loadout): Loadout => {
    let current = start;
    for (let pass = 0; pass < 4; pass++) {
      let changed = false;
      for (const name of barIncomeSearchModules) {
        if (upgrades[name].requiresExalt9 && !stats.exalt9Unlocked) continue;
        let best = current;
        let bestValue = score(current);
        for (let level = 0; level <= upgrades[name].maxLevel; level++) {
          if (level === (current.upgradeLevels[name] ?? 0)) continue;
          const candidate = candidateAt(current, name, level);
          if (!candidate) continue;
          const value = score(candidate);
          if (value > bestValue * (1 + 1e-12)
              || (Math.abs(value - bestValue) <= bestValue * 1e-12
                && candidate.cost < best.cost)) {
            best = candidate;
            bestValue = value;
          }
        }
        if (best !== current) {
          current = best;
          changed = true;
        }
      }
      if (!changed) break;
    }
    return current;
  };
  let best = ascend(seed);
  const starts = [new Loadout()];
  for (const name of barIncomeSearchModules) {
    if ((seed.upgradeLevels[name] ?? 0) <= 0) continue;
    const removed = candidateAt(seed, name, 0);
    if (removed) starts.push(removed);
  }
  for (const start of starts) {
    const candidate = ascend(start);
    if (score(candidate) > score(best) * (1 + 1e-12)) best = candidate;
  }
  return best;
}

type PurpleIncomeStat = 'incomeHoney' | 'incomePurpleAmb';
type ReactorRouting = Pick<AmbrosiaBarIncomeReactor, 'blueRoutingPercent' | 'redRoutingPercent'>;

// SynergismOfficial/src/Synthesis.ts craftPurpleAmbrosia: each craft spends
// both Red Ambrosia and Purple Honey, so the scarcer of the two limits the
// sustained crafting rate.
function purpleIncomeObjective(income: AmbrosiaBarIncome, stat: PurpleIncomeStat): number {
  if (stat === 'incomeHoney')
    return income.purpleHoneyPerSecond;
  if (!stats.purple)
    return 0;
  return Math.min(
    income.purpleHoneyPerSecond / stats.purple.craftPurpleHoneyCost,
    income.redAmbrosiaPerSecond / stats.purple.craftRedAmbrosiaCost,
  );
}

// Runs fn with the Purple Reactor routing replaced. Loadout stat caches are
// not routing-aware, so fn must only score loadouts it creates itself.
function withReactorRouting<T>(routing: ReactorRouting, fn: () => T): T {
  const saved = stats.reactor;
  if (!saved)
    return fn();
  stats.reactor = { ...saved, ...routing };
  try {
    return fn();
  } finally {
    stats.reactor = saved;
  }
}

// The game's routing sliders take whole percentages (SynergismOfficial
// index.html, step="1"), so all 101 x 101 settings are scanned exactly; one
// bar-income evaluation takes a few microseconds. The current routing wins
// ties, so the result is never worse than keeping it; other ties prefer less
// routing.
function findBestReactorRouting(loadout: Loadout, stat: PurpleIncomeStat): ReactorRouting {
  const current: ReactorRouting = {
    blueRoutingPercent: stats.reactor!.blueRoutingPercent,
    redRoutingPercent: stats.reactor!.redRoutingPercent,
  };
  const evaluate = (routing: ReactorRouting): number => {
    try {
      return purpleIncomeObjective(loadout.barIncome(routing), stat);
    } catch {
      return -Infinity;
    }
  };
  let best = current;
  let bestValue = evaluate(current);
  const consider = (blueRoutingPercent: number, redRoutingPercent: number): void => {
    const value = evaluate({ blueRoutingPercent, redRoutingPercent });
    const isTie = Math.abs(value - bestValue) <= Math.abs(bestValue) * 1e-12;
    if ((!isTie && value > bestValue)
        || (isTie && best !== current
          && blueRoutingPercent + redRoutingPercent < best.blueRoutingPercent + best.redRoutingPercent)) {
      best = { blueRoutingPercent, redRoutingPercent };
      bestValue = value;
    }
  };
  for (let blue = 0; blue <= 100; blue++)
    for (let red = 0; red <= 100; red++)
      consider(blue, red);
  return best;
}

// Voucher rows include their prerequisite chain (Patreon, tutorial, and the
// preceding voucher tiers).  The cube/oct table can contain some of those same
// prerequisites, so merge by max level rather than adding the two totals.
// Evaluating the incremental effects directly avoids re-running every upgrade
// effect for every pair in the 2D merge.
function mergeVoucherTable(table: Loadout[], voucherTable: Loadout[], stat: "cube" | "oct"): Loadout[] {
    type VoucherCandidate = {
      item: Loadout;
      voucher: Loadout;
      cost: number;
      blueberryCost: number;
      value: number;
      factor: number;
    }
    // The rows kept by the last trim, already in trim order; new rows wait
    // in pending until the next trim.
    let frontier: VoucherCandidate[] = []
    let pending: VoucherCandidate[] = []
    let maxBlueberryCost = 0
    const trimOrder = (a: VoucherCandidate, b: VoucherCandidate): number =>
      a.cost - b.cost || b.value - a.value || a.blueberryCost - b.blueberryCost
    const trimCandidates = (): void => {
      if (pending.length === 0)
        return
      pending.sort(trimOrder)
      // Prefix maximum of the kept values by Blueberry cost (index cost + 1).
      const tree = new Float64Array(maxBlueberryCost + 2)
      tree.fill(-Infinity)
      const query = (index: number): number => {
        let best = -Infinity
        while (index > 0) {
          best = Math.max(best, tree[index])
          index -= index & -index
        }
        return best
      }
      const update = (index: number, value: number): void => {
        while (index < tree.length) {
          tree[index] = Math.max(tree[index], value)
          index += index & -index
        }
      }
      // Merging the sorted frontier with the sorted batch, frontier first on
      // ties, gives the same order as a stable sort of both.
      const kept: VoucherCandidate[] = []
      let frontierIndex = 0
      let pendingIndex = 0
      while (frontierIndex < frontier.length || pendingIndex < pending.length) {
        const row = pendingIndex >= pending.length
          || (frontierIndex < frontier.length && trimOrder(frontier[frontierIndex], pending[pendingIndex]) <= 0)
          ? frontier[frontierIndex++]
          : pending[pendingIndex++]
        const index = row.blueberryCost + 1
        if (query(index) >= row.value)
          continue
        update(index, row.value)
        kept.push(row)
      }
      frontier = kept
      pending = []
      if (frontier.length > 500_000)
        throw new Error('Heater voucher frontier exceeded its 500000-build memory safety limit. Try fewer builds at once.')
    }
    const octeracts = stat === "oct"
    type VoucherMergeRow = {
      loadout: Loadout;
      entries: Array<{ name: string; level: number }>;
      voucherDelta: number;
    }
    type VoucherTier = {
      rows: VoucherMergeRow[];
      adjustmentsBySignature: Map<string, { costs: Float64Array; blueberries: Uint16Array }>;
      factorsBySignature: Map<string, Float64Array>;
    }

    // Voucher count rises with cost, so intermediate rows are not dominated:
    // their saved Ambrosia can fund a stronger Cube or Luck upgrade later.
    // In particular, Purple free levels activate at the first purchased level
    // of a module, making that intermediate row especially valuable.
    const tierRows = new Map<number, VoucherTier>()
    const relevantUpgradeNames = new Set<string>()
    for (const voucher of voucherTable) {
      const entries = Object.entries(voucher.upgradeLevels)
        .filter(([, level]) => level > 0)
        .map(([name, level]) => ({ name, level }))
      for (const { name } of entries)
        relevantUpgradeNames.add(name)
      const row: VoucherMergeRow = {
        loadout: voucher,
        entries,
        // getStat includes purchased levels and Purple free levels only after
        // their module is active. The persistent Red levels are already in the
        // exported baseline and cancel out of this delta.
        voucherDelta: voucher.getStat("vouchers") - stats.voucher,
      }
      const tier = voucher.blueberryCost
      const group = tierRows.get(tier)
      if (group) group.rows.push(row)
      else tierRows.set(tier, {
        rows: [row], adjustmentsBySignature: new Map(), factorsBySignature: new Map(),
      })
    }
    // Voucher prerequisites may raise Cubes I, which changes Cubes II's
    // effect. Free Cube shop levels and Brick affect the voucher-dependent
    // shop/ascension factors. Voucher shop levels also change Luck through
    // Panthema, which feeds the Red-free Luck-Cube effect even at raw level 0.
    const relevantNames = [...new Set([
      ...relevantUpgradeNames,
      'ambrosiaCubes2', 'ambrosiaFreeCubeUpgrades', 'ambrosiaBrickOfLead',
      'ambrosiaLuckCube1',
    ])]

    const adjustmentsFor = (
      item: Loadout,
      signature: string,
      tier: VoucherTier,
    ): { costs: Float64Array; blueberries: Uint16Array } => {
      const cached = tier.adjustmentsBySignature.get(signature)
      if (cached !== undefined)
        return cached
      const costs = new Float64Array(tier.rows.length)
      const blueberries = new Uint16Array(tier.rows.length)
      for (let index = 0; index < tier.rows.length; index++) {
        for (const { name, level } of tier.rows[index].entries) {
          const oldLevel = item.upgradeLevels[name] ?? 0
          if (level <= oldLevel)
            continue
          costs[index] += upgrades[name].cost(level) - upgrades[name].cost(oldLevel)
          if (oldLevel <= 0) {
            blueberries[index] += Math.max(
              0,
              upgrades[name].blueberryCost
                - (stats.ambrosiaUpgradeBlueberryCostReductions[name] ?? 0),
            )
          }
        }
      }
      const result = { costs, blueberries }
      tier.adjustmentsBySignature.set(signature, result)
      if (tier.adjustmentsBySignature.size > 256)
        tier.adjustmentsBySignature.delete(tier.adjustmentsBySignature.keys().next().value!)
      return result
    }

    const effectFactor = (
      item: Loadout,
      voucherRow: VoucherMergeRow,
    ): number => {
      const voucher = voucherRow.loadout
      const union = Loadout.union(item, voucher)
      let extraStatFactor = 1
      for (const { name } of voucherRow.entries) {
        if (name.startsWith("ambrosiaInfiniteShopUpgrades"))
          continue
        if (union.effectiveLevel(name) <= item.effectiveLevel(name))
          continue
        const oldEffect = item.getEffect(1, name, stat)
        const newEffect = union.getEffect(1, name, stat)
        if (oldEffect !== 0)
          extraStatFactor *= newEffect / oldEffect
      }
      if (union.effectiveLevel('ambrosiaCubes1') > item.effectiveLevel('ambrosiaCubes1')) {
        // Cubes II reads Cubes I's effective level, even when its own raw
        // level is unchanged by the voucher prerequisite merge.
        const oldCubes2 = item.getEffect(1, 'ambrosiaCubes2', stat)
        if (oldCubes2 !== 0)
          extraStatFactor *= union.getEffect(1, 'ambrosiaCubes2', stat) / oldCubes2
      }
      const oldLuckCube = item.getEffect(1, 'ambrosiaLuckCube1', stat)
      if (oldLuckCube !== 0)
        extraStatFactor *= union.getEffect(1, 'ambrosiaLuckCube1', stat) / oldLuckCube
      const baseInfinity = Upgrade.infinityCubeShopEffect(item, octeracts)
      const infinity = Upgrade.infinityCubeShopEffect(union, octeracts)
      const baseAscension = octeracts
        ? Upgrade.octeractAscensionSpeedEffect(item)
        : Upgrade.cubeAscensionSpeedEffect(item)
      const ascension = octeracts
        ? Upgrade.octeractAscensionSpeedEffect(union)
        : Upgrade.cubeAscensionSpeedEffect(union)
      return extraStatFactor * (infinity / baseInfinity) * (ascension / baseAscension)
    }

    for (const item of table) {
      const itemCost = item.cost
      const itemBlueberries = item.blueberryCost
      const itemValue = item.getStat(stat)
      const signature = `${relevantNames.map(name => item.upgradeLevels[name] ?? 0).join(',')},${itemBlueberries},${item.luck}`
      for (const tier of tierRows.values()) {
        const { rows } = tier
        const adjustments = adjustmentsFor(item, signature, tier)
        let low = 0
        let high = rows.length - 1
        let bestIndex = -1
        while (low <= high) {
          const middle = (low + high) >> 1
          const cost = itemCost + adjustments.costs[middle]
          const blueberryCost = itemBlueberries + adjustments.blueberries[middle]
          if (cost <= stats.amb && blueberryCost <= stats.blueberries) {
            bestIndex = middle
            low = middle + 1
          } else {
            high = middle - 1
          }
        }
        if (bestIndex >= 0) {
          let factors = tier.factorsBySignature.get(signature)
          if (factors === undefined) {
            factors = new Float64Array(rows.length)
            factors.fill(Number.NaN)
            tier.factorsBySignature.set(signature, factors)
            if (tier.factorsBySignature.size > 256)
              tier.factorsBySignature.delete(tier.factorsBySignature.keys().next().value!)
          }
          const start = cubeExperimentConfig?.useLegacyVoucherEndpoints ? bestIndex : 0
          for (let index = start; index <= bestIndex; index++) {
            let factor = factors[index]
            if (Number.isNaN(factor)) {
              factor = effectFactor(item, rows[index])
              factors[index] = factor
            }
            const blueberryCost = itemBlueberries + adjustments.blueberries[index]
            if (blueberryCost > maxBlueberryCost)
              maxBlueberryCost = blueberryCost
            pending.push({
              item,
              voucher: rows[index].loadout,
              cost: itemCost + adjustments.costs[index],
              blueberryCost,
              value: itemValue * factor,
              factor,
            })
            // Trimming walks the whole frontier, so the batch grows with it.
            if (pending.length >= 20_000 && pending.length >= frontier.length)
              trimCandidates()
          }
        }
      }
    }
    if (frontier.length === 0 && pending.length === 0)
      return [new Loadout()]

    // Batch trimming is exact because Pareto-dominated rows cannot become
    // useful when another independent table is merged later.
    trimCandidates()
    const result: Loadout[] = []
    for (const row of frontier) {
      const union = Loadout.union(row.item, row.voucher)
      if (cubeExperimentConfig?.validateVoucherMergeScores) {
        const actual = union.getStat(stat)
        const actualBefore = new Loadout(row.item).getStat(stat)
        const expected = actualBefore * row.factor
        if (Math.abs(actual - expected) > 1e-9 * Math.max(1, Math.abs(actual))) {
          const directFactor = effectFactor(row.item, {
            loadout: row.voucher,
            entries: Object.entries(row.voucher.upgradeLevels)
              .filter(([, level]) => level > 0)
              .map(([name, level]) => ({ name, level })),
            voucherDelta: row.voucher.getStat('vouchers') - stats.voucher,
          })
          const changedEffects = (upgradeEffectKeys[stat] ?? []).map(name => {
            const before = row.item.getEffect(1, name, stat)
            const after = union.getEffect(1, name, stat)
            return { name, ratio: after / before }
          }).filter(entry => Math.abs(entry.ratio - 1) > 1e-12)
          throw new Error(`Voucher ${stat} effect mismatch: expected=${expected}, actual=${actual}, cachedFactor=${row.factor}, directFactor=${directFactor}, changedEffects=${JSON.stringify(changedEffects)}, loadout=${JSON.stringify(union.upgradeLevels)}`)
        }
      }
      union.setCachedCosts(row.cost, row.blueberryCost)
      union.setCachedStat('vouchers', row.voucher.getStat('vouchers'))
      union.setCachedStat(stat, row.value)
      result.push(union)
    }
    return result
}

// Luck-Cube is the only cube/oct upgrade in this merge whose effect reads the
// selected luck loadout.  Brick of Lead can also overlap between both sides,
// but it changes only mLuck and the ascension-speed multiplier.  Reusing the
// already-cached luck/oct value and applying those two deltas directly avoids
// a full getStat() pass for every pair while retaining the exact max-level
// union semantics.
function mergeLuckCubeTable(tableLuck: Loadout[], tableBrick: Loadout[], stat: "cube" | "oct"): Loadout[] {
    const octeracts = stat === "oct"
    const brickRowsByBaseLevel = new Map<number, number[]>()
    const rowsForBrickLevel = (baseBrickLevel: number): number[] => {
      const cached = brickRowsByBaseLevel.get(baseBrickLevel)
      if (cached !== undefined)
        return cached

      // A luck loadout can already contain Brick of Lead. All right-hand rows
      // at or below that level produce the same union for a given Luck-Cube
      // level, so evaluating every one only creates duplicate candidates.
      const seen = new Set<string>()
      const rows: number[] = []
      for (let index = 0; index < tableBrick.length; index++) {
        const row = tableBrick[index]
        const luckCubeLevel = row.upgradeLevels.ambrosiaLuckCube1 ?? 0
        const brickLevel = Math.max(baseBrickLevel, row.upgradeLevels.ambrosiaBrickOfLead ?? 0)
        const key = `${luckCubeLevel},${brickLevel}`
        if (seen.has(key))
          continue
        seen.add(key)
        rows.push(index)
      }
      brickRowsByBaseLevel.set(baseBrickLevel, rows)
      return rows
    }

    // This merge used to materialise roughly 2.4 million complete Loadout
    // objects and then discard almost all of them in trimTable.  Keep the
    // exact same three-dimensional candidates in compact numeric buffers,
    // trim those buffers, and only construct the surviving loadouts.
    const maximumCandidates = tableLuck.length * tableBrick.length
    const luckIndices = new Uint32Array(maximumCandidates)
    const brickIndices = new Uint16Array(maximumCandidates)
    const costs = new Float64Array(maximumCandidates)
    const blueberryCosts = new Uint16Array(maximumCandidates)
    const values = new Float64Array(maximumCandidates)
    let candidateCount = 0

    const cube1Factors = new Float64Array(upgrades.ambrosiaCubes1.maxLevel + 1)
    for (let level = 0; level <= upgrades.ambrosiaCubes1.maxLevel; level++) {
      const loadout = new Loadout()
      loadout.upgradeLevels.ambrosiaCubes1 = level
      loadout.invalidateCaches()
      cube1Factors[level] = loadout.getEffect(1, "ambrosiaCubes1", stat)
    }
    const luckCubeLevels = new Float64Array(upgrades.ambrosiaLuckCube1.maxLevel + 1)
    for (let level = 0; level <= upgrades.ambrosiaLuckCube1.maxLevel; level++) {
      const loadout = new Loadout()
      loadout.upgradeLevels.ambrosiaLuckCube1 = level
      luckCubeLevels[level] = loadout.effectiveLevel("ambrosiaLuckCube1")
    }
    const ascensionFactors = new Float64Array(upgrades.ambrosiaBrickOfLead.maxLevel + 1)
    for (let level = 0; level <= upgrades.ambrosiaBrickOfLead.maxLevel; level++) {
      const loadout = new Loadout()
      loadout.upgradeLevels.ambrosiaBrickOfLead = level
      loadout.setCachedStat("vouchers", stats.voucher)
      ascensionFactors[level] = octeracts
        ? Upgrade.octeractAscensionSpeedEffect(loadout)
        : Upgrade.cubeAscensionSpeedEffect(loadout)
    }
    const baseAscension = ascensionFactors[0]

    for (let luckIndex = 0; luckIndex < tableLuck.length; luckIndex++) {
      const luckLoadout = tableLuck[luckIndex]
      const baseLuck = luckLoadout.getStat("luck")
      const baseMLuck = luckLoadout.getStat("mLuck")
      const baseAdditiveLuck = baseLuck / (1 + baseMLuck)
      const baseStat = luckLoadout.getStat(stat)
      const luckBrickLevel = luckLoadout.effectiveLevel("ambrosiaBrickOfLead")
      const brickRows = rowsForBrickLevel(luckLoadout.upgradeLevels.ambrosiaBrickOfLead ?? 0)

      for (const brickIndex of brickRows) {
        const brickLoadout = tableBrick[brickIndex]
        // Only a handful of prerequisite keys occur on the brick-side table.
        // Add their incremental max-level cost/blueberry charge instead of
        // rescanning every upgrade in union.cost/union.blueberryCost.
        let cost = luckLoadout.cost
        let blueberryCost = luckLoadout.blueberryCost
        for (const upgradeName in brickLoadout.upgradeLevels) {
          const oldLevel = luckLoadout.upgradeLevels[upgradeName] ?? 0
          const newLevel = brickLoadout.upgradeLevels[upgradeName] ?? 0
          if (newLevel <= oldLevel)
            continue
          cost += upgrades[upgradeName].cost(newLevel) - upgrades[upgradeName].cost(oldLevel)
          if (oldLevel <= 0)
            blueberryCost += Math.max(
              0,
              upgrades[upgradeName].blueberryCost
                - (stats.ambrosiaUpgradeBlueberryCostReductions[upgradeName] ?? 0),
            )
        }
        if (cost > stats.amb || blueberryCost > stats.blueberries)
          continue

        const rawBrickLevel = Math.max(
          luckLoadout.upgradeLevels.ambrosiaBrickOfLead ?? 0,
          brickLoadout.upgradeLevels.ambrosiaBrickOfLead ?? 0,
        )
        const unionBrickLevel = rawBrickLevel > 0
          ? rawBrickLevel + stats.bonus[upgrades.ambrosiaBrickOfLead.row]
            + (stats.ambrosiaUpgradeBonusLevels.ambrosiaBrickOfLead ?? 0)
          : stats.bonus[upgrades.ambrosiaBrickOfLead.row]
        const addedBrick = Math.max(0, unionBrickLevel - luckBrickLevel)
        const unionMLuck = baseMLuck + 0.02 * addedBrick
        const baseBlueberries = stats.blueberries - luckLoadout.blueberryCost
        const unionBlueberries = stats.blueberries - blueberryCost
        const purpleLeoDelta = (unionBlueberries >= 5 ? unionBlueberries * stats.purpleLeoLevel : 0)
          - (baseBlueberries >= 5 ? baseBlueberries * stats.purpleLeoLevel : 0)
        const unionLuck = (baseAdditiveLuck + purpleLeoDelta) * (1 + unionMLuck)
        const luckCubeFactor = 1 + 0.0005 * unionLuck
          * luckCubeLevels[brickLoadout.upgradeLevels.ambrosiaLuckCube1 ?? 0]
        const baseCube1Level = luckLoadout.upgradeLevels.ambrosiaCubes1 ?? 0
        const unionCube1Level = Math.max(baseCube1Level, brickLoadout.upgradeLevels.ambrosiaCubes1 ?? 0)
        const extraCubeFactor = cube1Factors[unionCube1Level] / cube1Factors[baseCube1Level]

        luckIndices[candidateCount] = luckIndex
        brickIndices[candidateCount] = brickIndex
        costs[candidateCount] = cost
        blueberryCosts[candidateCount] = blueberryCost
        values[candidateCount] = baseStat * extraCubeFactor * luckCubeFactor
          * (ascensionFactors[rawBrickLevel] / baseAscension)
        candidateCount++
      }
    }

    const order = new Uint32Array(candidateCount)
    for (let index = 0; index < candidateCount; index++)
      order[index] = index
    order.sort((left, right) => costs[left] - costs[right]
      || values[right] - values[left]
      || blueberryCosts[left] - blueberryCosts[right]
      || left - right)

    const tree = new Float64Array(stats.blueberries + 2)
    tree.fill(Number.NEGATIVE_INFINITY)
    const query = (index: number): number => {
      let result = Number.NEGATIVE_INFINITY
      while (index > 0) {
        result = Math.max(result, tree[index])
        index -= index & -index
      }
      return result
    }
    const update = (index: number, value: number): void => {
      while (index < tree.length) {
        tree[index] = Math.max(tree[index], value)
        index += index & -index
      }
    }

    const result: Loadout[] = []
    for (const candidateIndex of order) {
      const berryIndex = blueberryCosts[candidateIndex] + 1
      if (query(berryIndex) >= values[candidateIndex])
        continue
      const union = Loadout.union(
        tableLuck[luckIndices[candidateIndex]],
        tableBrick[brickIndices[candidateIndex]],
      )
      union.setCachedCosts(costs[candidateIndex], blueberryCosts[candidateIndex])
      union.setCachedStat("vouchers", stats.voucher)
      union.setCachedStat(stat, values[candidateIndex])
      result.push(union)
      update(berryIndex, values[candidateIndex])
    }
    return result.length > 0 ? result : [new Loadout()]
}

// Generates a table of locally optimal loadouts for selected upgrades
function generateTable(selectedUpgrades: string[], stat: string, minLevels: Record<string, number> = {}): Loadout[] {
    let table: Loadout[] = [];

    const processUpgrade = (upgradeIndex: number, parentLoadout: Loadout): void => {

      if (upgradeIndex >= selectedUpgrades.length)
        return
      let upgradeName = selectedUpgrades[upgradeIndex]
      let upgrade = upgrades[upgradeName]

      if ((minLevels[upgradeName] ?? 0) <= 0)
        processUpgrade(upgradeIndex + 1, parentLoadout) // Process the next upgrade without having any levels in the current upgrade

      let preLoadout = new Loadout(parentLoadout)
      for (let prerequisite in upgrade.prerequisites) {
        // Avoid double calculations
        if (selectedUpgrades.includes(prerequisite) && (preLoadout.upgradeLevels[prerequisite] ?? 0) < (upgrade.prerequisites[prerequisite] ?? 0))
          return
      }
      preLoadout.upgradeLevels[upgradeName] = 1
      preLoadout.invalidateCaches()
      preLoadout.satisfyPrerequisites()
      if (preLoadout.blueberryCost > stats.blueberries)
        return
      preLoadout.upgradeLevels[upgradeName] = 0
      preLoadout.invalidateCaches()

      for (let level = minLevels[upgradeName] ?? 1; level <= upgrade.maxLevel; level++) {

        let cost = preLoadout.cost + upgrade.cost(level)
        if (stats.amb < cost)
          return // No point in adding unaffordable loadouts to the table

        let loadout = new Loadout(preLoadout)
        loadout.upgradeLevels[upgradeName] = level
        table.push(loadout)

        processUpgrade(upgradeIndex + 1, loadout)

      }

    }

    let emptyLoadout = new Loadout()
    table.push(emptyLoadout)
    processUpgrade(0, emptyLoadout)
    const trimmed = trimTable(table, stat)
    return trimmed

  }

// Merges two tables with locally optimal loadouts
function mergeTables(table1: Loadout[], table2: Loadout[], stat: string): Loadout[] {
    const result = createBatchedTable(stat)
    const useOverlapBreak = fixedSharedLevels(table1, table2)
    for (let item1 of table1)
      for (let item2 of table2) {
        let union = Loadout.union(item1, item2)
        if (useOverlapBreak && 2 * union.cost - item1.cost - item2.cost > stats.amb)
          break
        // The union cost is not monotone in item2.cost when the two tables
        // share prerequisite upgrades.  Never use the old overlap heuristic
        // as a break condition: it could discard later affordable rows and
        // leave the optimizer with an under-spent budget.  The only safe early
        // stop is the independent lower bound item2.cost <= union.cost.
        if (item2.cost > stats.amb)
          break
        if (union.cost <= stats.amb && union.blueberryCost <= stats.blueberries) {
          // trimTable removes duplicate equal-cost/equal-berry states while
          // building the Pareto frontier; avoid serializing every union just
          // to maintain a duplicate set in this hot Cartesian-product loop.
          result.add(union)
        }
      }
    return result.finish()
  }

// Merge tables whose upgrade sets are independent (the rune table is used in
// this form for cubes, quarks, obtainium, and offerings).  Their stat effects
// compose as a ratio around the empty loadout, so cache that ratio and avoid a
// full getStat pass for every union in the large Cartesian product.
function mergeIndependentTables(table1: Loadout[], table2: Loadout[], stat: string): Loadout[] {
    const baseStat = new Loadout().getStat(stat)
    const rightRows = table2.map(loadout => ({
      cost: loadout.cost,
      entries: Object.entries(loadout.upgradeLevels),
      factor: loadout.getStat(stat) / baseStat,
    }))

    if (cubeExperimentConfig?.useLegacyIndependentMerge) {
      const result = createBatchedTable(stat)
      for (const item1 of table1) {
        const leftStat = item1.getStat(stat)
        for (let rightIndex = 0; rightIndex < table2.length; rightIndex++) {
          if (rightRows[rightIndex].cost > stats.amb)
            break
          const union = Loadout.union(item1, table2[rightIndex])
          if (union.cost > stats.amb || union.blueberryCost > stats.blueberries)
            continue
          union.setCachedStat(stat, leftStat * rightRows[rightIndex].factor)
          result.add(union)
        }
      }
      return result.finish()
    }

    type Candidate = {
      leftIndex: number;
      rightIndex: number;
      cost: number;
      blueberryCost: number;
      value: number;
    }
    let frontier: Candidate[] = []
    let pendingCount = 0
    const trim = (): void => {
      if (pendingCount === 0)
        return
      const berries = [...new Set(frontier.map(row => row.blueberryCost))].sort((a, b) => a - b)
      const berryIndices = new Map(berries.map((value, index) => [value, index + 1]))
      const tree = new Float64Array(berries.length + 1)
      tree.fill(-Infinity)
      const query = (index: number): number => {
        let best = -Infinity
        while (index > 0) {
          best = Math.max(best, tree[index])
          index -= index & -index
        }
        return best
      }
      const update = (index: number, value: number): void => {
        while (index < tree.length) {
          tree[index] = Math.max(tree[index], value)
          index += index & -index
        }
      }
      frontier.sort((a, b) => a.cost - b.cost || b.value - a.value
        || a.blueberryCost - b.blueberryCost)
      const retained: Candidate[] = []
      for (const row of frontier) {
        const index = berryIndices.get(row.blueberryCost)!
        if (query(index) >= row.value)
          continue
        retained.push(row)
        update(index, row.value)
      }
      frontier = retained
      pendingCount = 0
      if (frontier.length > 500_000)
        throw new Error(`Heater ${stat} search exceeded its 500000-build memory safety limit. Try fewer builds at once.`)
    }

    for (let leftIndex = 0; leftIndex < table1.length; leftIndex++) {
      const item1 = table1[leftIndex]
      const leftStat = item1.getStat(stat)
      const leftCost = item1.cost
      const leftBlueberries = item1.blueberryCost
      for (let rightIndex = 0; rightIndex < rightRows.length; rightIndex++) {
        const right = rightRows[rightIndex]
        if (right.cost > stats.amb)
          break
        let cost = leftCost
        let blueberryCost = leftBlueberries
        for (const [name, rightLevel] of right.entries) {
          const oldLevel = item1.upgradeLevels[name] ?? 0
          if (rightLevel <= oldLevel)
            continue
          cost += upgrades[name].cost(rightLevel) - upgrades[name].cost(oldLevel)
          if (oldLevel <= 0)
            blueberryCost += Math.max(0,
              upgrades[name].blueberryCost - (stats.ambrosiaUpgradeBlueberryCostReductions[name] ?? 0))
        }
        if (cost > stats.amb || blueberryCost > stats.blueberries)
          continue
        frontier.push({ leftIndex, rightIndex, cost, blueberryCost,
          value: leftStat * right.factor })
        if (++pendingCount >= 20_000)
          trim()
      }
    }
    trim()
    if (frontier.length === 0)
      return [new Loadout()]
    return frontier.map(row => {
      const union = Loadout.union(table1[row.leftIndex], table2[row.rightIndex])
      union.setCachedCosts(row.cost, row.blueberryCost)
      union.setCachedStat(stat, row.value)
      return union
    })
}

// Exact all-Ambrosia merge with cached cross-table Luck work.  The right
// frontier varies multiplicative Luck, generation and Red Luck, while any
// additive-Luck prerequisites it introduces are fixed inside a shared-level
// group.  Compute that additive base once per left row/group, then retain the
// same full Cartesian candidate set and the same Pareto trim as mergeTables.
function mergeAllAmbTables(table1: Loadout[], table2: Loadout[]): Loadout[] {
    let groups: Loadout[][] = [table2]
    if (!fixedSharedLevels(table1, table2)) {
      const partitioned = groupBySharedLevels(table1, table2)
      if (partitioned === undefined)
        return mergeTables(table1, table2, "allAmb")
      groups = partitioned
    }

    const result = createBatchedTable("allAmb")
    for (const group of groups) {
      const rightMetadata = group.map(loadout => ({
        loadout,
        mLuck: loadout.getStat("mLuck"),
        speed: loadout.getStat("speed"),
        rSpeed: loadout.getStat("rSpeed"),
      }))
      for (const left of table1) {
        const baseline = Loadout.union(left, group[0])
        const baselineUnassigned = stats.blueberries - baseline.blueberryCost
        const baselinePurpleLeo = baselineUnassigned >= 5
          ? baselineUnassigned * stats.purpleLeoLevel
          : 0
        const baselineAdditiveLuck = baseline.getStat("luck") / (1 + rightMetadata[0].mLuck)
        for (const right of rightMetadata) {
          if (right.loadout.cost > stats.amb)
            break
          const union = Loadout.union(left, right.loadout)
          if (union.cost > stats.amb || union.blueberryCost > stats.blueberries)
            continue
          const unassigned = stats.blueberries - union.blueberryCost
          const purpleLeo = unassigned >= 5 ? unassigned * stats.purpleLeoLevel : 0
          const luck = (baselineAdditiveLuck + purpleLeo - baselinePurpleLeo) * (1 + right.mLuck)
          union.setCachedStat("luck", luck)
          union.setCachedStat("mLuck", right.mLuck)
          union.setCachedStat("speed", right.speed)
          union.setCachedStat("rSpeed", right.rSpeed)
          union.setCachedStat("allAmb", union.getStat("amb") * union.getStat("rAmb"))
          result.add(union)
        }
      }
    }
    return result.finish()
}

type FindOptState = {
    budget: number;
    power: number;
    j: number;
    upperBounds: Array<{ budget: number; table2Index: number }>;
    upperBoundIndex: number;
    opt: Loadout;
};

type CubeLuckEvaluation = {
    left: Loadout;
    right?: Loadout;
    fixed?: Loadout;
    cost: number;
    blueberryCost: number;
    value: number;
};

type LuckScaledResourceEvaluation = {
    left: Loadout;
    right?: Loadout;
    fixed?: Loadout;
    cost: number;
    blueberryCost: number;
    value: number;
};

type CubeLuckRightMetadata = {
    loadout: Loadout;
    entries: Array<{ name: string; level: number }>;
    additiveLuck: number;
    mLuck: number;
    rawBrick: number;
    rawLuckCube: number;
    rawTutorial: number;
    rawCube1: number;
    freeLuckLevel: number;
    vouchers: number;
};

// The large final Cube/Oct + Luck merge has a deliberately narrow overlap:
// the right side can add Luck-Cube, Brick of Lead, and their Tutorial/Cubes-I
// prerequisites. Evaluate those interactions numerically and only build a
// complete Loadout for the winning candidate (or for the existing blueberry
// repair fallback). This is the same game formula used by Loadout.getStat.
function createCubeLuckEvaluator(table2: Loadout[], stat: "cube" | "oct", fixedShared: boolean) {
    const octeracts = stat === "oct"
    const effectsEnabled = stats.exalt !== 6 && stats.exalt !== 8
    const rightMetadata: CubeLuckRightMetadata[] = table2.map(source => {
      // Recompute once under the current Exalt/stat state. SR temporarily
      // changes that state after the shared frontier was first generated.
      const loadout = new Loadout(source)
      const mLuck = loadout.getStat("mLuck")
      return {
        loadout: source,
        entries: Object.entries(source.upgradeLevels).map(([name, level]) => ({ name, level })),
        additiveLuck: loadout.getStat("luck") / (1 + mLuck),
        mLuck,
        rawBrick: source.upgradeLevels.ambrosiaBrickOfLead ?? 0,
        rawLuckCube: source.upgradeLevels.ambrosiaLuckCube1 ?? 0,
        rawTutorial: source.upgradeLevels.ambrosiaTutorial ?? 0,
        rawCube1: source.upgradeLevels.ambrosiaCubes1 ?? 0,
        freeLuckLevel: loadout.effectiveLevel("ambrosiaFreeLuckUpgrades")
          - (stats.bonus[upgrades.ambrosiaFreeLuckUpgrades.row] ?? 0),
        vouchers: loadout.getStat("vouchers"),
      }
    })
    const ascensionCache = new Map<number, number>()
    const leftLuckCache = new Map<string, number>()
    let overlapLeft: Loadout | undefined
    let overlapCost = 0
    let overlapBlueberries = 0
    const fixedRight = table2[0]
    const ascension = (vouchers: number, rawBrick: number): number => {
      const key = vouchers * (upgrades.ambrosiaBrickOfLead.maxLevel + 1) + rawBrick
      const cached = ascensionCache.get(key)
      if (cached !== undefined)
        return cached
      const loadout = new Loadout()
      loadout.upgradeLevels.ambrosiaBrickOfLead = rawBrick
      loadout.setCachedStat("vouchers", vouchers)
      const value = octeracts
        ? Upgrade.octeractAscensionSpeedEffect(loadout)
        : Upgrade.cubeAscensionSpeedEffect(loadout)
      ascensionCache.set(key, value)
      return value
    }
    const effectiveLevel = (name: string, rawLevel: number): number => {
      const upgrade = upgrades[name]
      if (upgrade.requiresExalt9 && !stats.exalt9Unlocked)
        return 0
      let level = rawLevel
      if (name === "ambrosiaTutorial")
        level += stats.tutorialBonus
      level += stats.bonus[upgrade.row] ?? 0
      if (rawLevel > 0)
        level += stats.ambrosiaUpgradeBonusLevels[name] ?? 0
      return level
    }
    const tutorialFactor = (rawLevel: number): number => effectsEnabled
      ? 1 + 0.05 * effectiveLevel("ambrosiaTutorial", rawLevel)
      : 1
    const cube1Factor = (rawLevel: number): number => {
      if (!effectsEnabled)
        return 1
      const level = effectiveLevel("ambrosiaCubes1", rawLevel)
      return (1 + 0.05 * level) * 1.1 ** Math.floor(level / 5)
    }

    const evaluate = (
      left: Loadout,
      rightIndex: number,
      repairBlueberries: boolean,
    ): CubeLuckEvaluation => {
      const metadata = rightMetadata[rightIndex]
      const right = metadata.loadout
      let cost: number
      let blueberryCost: number
      if (fixedShared) {
        if (overlapLeft !== left) {
          overlapLeft = left
          overlapCost = 0
          overlapBlueberries = 0
          for (const [name, rightLevel] of Object.entries(fixedRight.upgradeLevels)) {
            const leftLevel = left.upgradeLevels[name] ?? 0
            if (leftLevel <= 0 || rightLevel <= 0)
              continue
            overlapCost += upgrades[name].cost(Math.min(leftLevel, rightLevel))
            overlapBlueberries += Math.max(
              0,
              upgrades[name].blueberryCost
                - (stats.ambrosiaUpgradeBlueberryCostReductions[name] ?? 0),
            )
          }
        }
        cost = left.cost + right.cost - overlapCost
        blueberryCost = left.blueberryCost + right.blueberryCost - overlapBlueberries
      } else {
        cost = left.cost
        blueberryCost = left.blueberryCost
        for (const entry of metadata.entries) {
          const oldLevel = left.upgradeLevels[entry.name] ?? 0
          if (entry.level <= oldLevel)
            continue
          cost += upgrades[entry.name].cost(entry.level) - upgrades[entry.name].cost(oldLevel)
          if (oldLevel <= 0)
            blueberryCost += Math.max(
              0,
              upgrades[entry.name].blueberryCost
                - (stats.ambrosiaUpgradeBlueberryCostReductions[entry.name] ?? 0),
            )
        }
      }

      if (repairBlueberries && blueberryCost > stats.blueberries) {
        const fixed = Loadout.union(left, right)
        fixed.fixBlueberryUpgrades()
        return {
          left,
          right,
          fixed,
          cost: fixed.cost,
          blueberryCost: fixed.blueberryCost,
          value: fixed.getStat(stat),
        }
      }

      const vouchers = left.getStat("vouchers")
      const rightBlueberries = stats.blueberries - right.blueberryCost
      const unionBlueberries = stats.blueberries - blueberryCost
      const purpleLeoDelta = (unionBlueberries >= 5 ? unionBlueberries * stats.purpleLeoLevel : 0)
        - (rightBlueberries >= 5 ? rightBlueberries * stats.purpleLeoLevel : 0)
      let panthemaDelta = 0
      if (effectsEnabled && stats.exalt !== 4 && stats.panthemaLevel > 0
          && stats.shopBonusLevels.ambrosiaLuck + metadata.freeLuckLevel > 0) {
        panthemaDelta = 0.2 * stats.panthemaLevel
          * (stats.shopBonusLevels.ambrosiaLuck + metadata.freeLuckLevel)
          * 0.01 * stats.panthemaLevel * (vouchers - metadata.vouchers)
      }
      const luck = (metadata.additiveLuck + purpleLeoDelta + panthemaDelta) * (1 + metadata.mLuck)
      const luckCubeLevel = effectiveLevel("ambrosiaLuckCube1", metadata.rawLuckCube)
      const leftLuckKey = `${left.blueberryCost},${vouchers}`
      let leftLuck = leftLuckCache.get(leftLuckKey)
      if (leftLuck === undefined) {
        const luckLoadout = new Loadout()
        luckLoadout.setCachedCosts(0, left.blueberryCost)
        luckLoadout.setCachedStat("vouchers", vouchers)
        leftLuck = luckLoadout.getStat("luck")
        leftLuckCache.set(leftLuckKey, leftLuck)
      }
      const leftLuckCubeLevel = effectiveLevel("ambrosiaLuckCube1", 0)
      const luckCubeFactor = effectsEnabled
        ? (1 + 0.0005 * luck * luckCubeLevel)
          / (1 + 0.0005 * leftLuck * leftLuckCubeLevel)
        : 1
      const leftTutorial = left.upgradeLevels.ambrosiaTutorial ?? 0
      const leftCube1 = left.upgradeLevels.ambrosiaCubes1 ?? 0
      const prerequisiteFactor = tutorialFactor(Math.max(leftTutorial, metadata.rawTutorial)) / tutorialFactor(leftTutorial)
        * cube1Factor(Math.max(leftCube1, metadata.rawCube1)) / cube1Factor(leftCube1)
      const rawBrick = Math.max(left.upgradeLevels.ambrosiaBrickOfLead ?? 0, metadata.rawBrick)
      const ascensionFactor = ascension(vouchers, rawBrick)
        / ascension(vouchers, left.upgradeLevels.ambrosiaBrickOfLead ?? 0)

      return {
        left,
        right,
        cost,
        blueberryCost,
        value: left.getStat(stat) * prerequisiteFactor * luckCubeFactor * ascensionFactor,
      }
    }

    const materialize = (candidate: CubeLuckEvaluation): Loadout => {
      if (candidate.fixed !== undefined)
        return candidate.fixed
      if (candidate.right === undefined)
        return candidate.left
      const union = Loadout.union(candidate.left, candidate.right)
      union.setCachedCosts(candidate.cost, candidate.blueberryCost)
      union.setCachedStat(stat, candidate.value)
      return union
    }

    return { evaluate, materialize }
}

type LuckScaledResourceStat = "obt" | "off" | "obtAndOff"

// The modules whose effect scales with Luck, one factor each: Obt + Off has both
const LUCK_SCALED_RESOURCE_MODULES: Record<LuckScaledResourceStat, readonly string[]> = {
    obt: ["ambrosiaObtainium1"],
    off: ["ambrosiaOffering1"],
    obtAndOff: ["ambrosiaObtainium1", "ambrosiaOffering1"],
}

function luckScaledResourceFactor(luck: number, levels: readonly number[]): number {
    let factor = 1
    for (const level of levels)
      factor *= 1 + 0.001 * luck * level
    return factor
}

// Offerings I and Obtainium I multiply the left-side result by a factor based on
// the Luck supplied by the right frontier.  Constructing a complete Loadout
// and recalculating every unrelated effect for each of the millions of pairs
// dominated the Offering search.  The two tables have fixed shared levels, so
// their cost/blueberry overlap is constant per left row and the only changing
// cross-table effect is that Luck factor, including the voucher boost to Jack.
// Evaluate that formula numerically while retaining the established full
// repair path for over-budget blueberry
// combinations and materialising the exact winning Loadout at the end.
function createLuckScaledResourceEvaluator(table1: Loadout[], table2: Loadout[], stat: LuckScaledResourceStat) {
    const effectsEnabled = stats.exalt !== 6 && stats.exalt !== 8
    const rightMetadata = table2.map(loadout => {
      const mLuck = loadout.getStat("mLuck")
      return {
        loadout,
        additiveLuck: loadout.getStat("luck") / (1 + mLuck),
        mLuck,
        freeLuckLevel: loadout.effectiveLevel("ambrosiaFreeLuckUpgrades")
          - (stats.bonus[upgrades.ambrosiaFreeLuckUpgrades.row] ?? 0),
        vouchers: loadout.getStat("vouchers"),
      }
    })
    const fixedRight = table2[0]
    const leftMetadata = new WeakMap<Loadout, {
      overlapCost: number;
      overlapBlueberries: number;
      resourceLevels: number[];
      valueWithoutLuckModule: number;
    }>()

    for (const left of table1) {
      let overlapCost = 0
      let overlapBlueberries = 0
      for (const [name, leftLevel] of Object.entries(left.upgradeLevels)) {
        const rightLevel = fixedRight.upgradeLevels[name] ?? 0
        if (leftLevel <= 0 || rightLevel <= 0)
          continue
        overlapCost += upgrades[name].cost(Math.min(leftLevel, rightLevel))
        overlapBlueberries += Math.max(
          0,
          upgrades[name].blueberryCost
            - (stats.ambrosiaUpgradeBlueberryCostReductions[name] ?? 0),
        )
      }
      const resourceLevels = LUCK_SCALED_RESOURCE_MODULES[stat]
        .map(module => effectsEnabled ? left.effectiveLevel(module) : 0)
      leftMetadata.set(left, {
        overlapCost,
        overlapBlueberries,
        resourceLevels,
        valueWithoutLuckModule: left.getStat(stat) / luckScaledResourceFactor(left.luck, resourceLevels),
      })
    }

    const evaluate = (
      left: Loadout,
      rightIndex: number,
      repairBlueberries: boolean,
    ): LuckScaledResourceEvaluation => {
      const right = rightMetadata[rightIndex]
      const metadata = leftMetadata.get(left)!
      const cost = left.cost + right.loadout.cost - metadata.overlapCost
      const blueberryCost = left.blueberryCost + right.loadout.blueberryCost
        - metadata.overlapBlueberries

      if (repairBlueberries && blueberryCost > stats.blueberries) {
        const fixed = Loadout.union(left, right.loadout)
        fixed.fixBlueberryUpgrades()
        return {
          left,
          right: right.loadout,
          fixed,
          cost: fixed.cost,
          blueberryCost: fixed.blueberryCost,
          value: fixed.getStat(stat),
        }
      }

      const rightUnassigned = stats.blueberries - right.loadout.blueberryCost
      const unionUnassigned = stats.blueberries - blueberryCost
      const purpleLeoDelta = (unionUnassigned >= 5 ? unionUnassigned * stats.purpleLeoLevel : 0)
        - (rightUnassigned >= 5 ? rightUnassigned * stats.purpleLeoLevel : 0)
      const panthemaDelta = effectsEnabled && stats.exalt !== 4
        ? 0.2 * stats.panthemaLevel
          * (stats.shopBonusLevels.ambrosiaLuck + right.freeLuckLevel)
          * 0.01 * stats.panthemaLevel * (left.getStat("vouchers") - right.vouchers)
        : 0
      const luck = (right.additiveLuck + purpleLeoDelta + panthemaDelta) * (1 + right.mLuck)
      return {
        left,
        right: right.loadout,
        cost,
        blueberryCost,
        value: metadata.valueWithoutLuckModule * luckScaledResourceFactor(luck, metadata.resourceLevels),
      }
    }

    const materialize = (candidate: LuckScaledResourceEvaluation): Loadout => {
      if (candidate.fixed !== undefined)
        return candidate.fixed
      if (candidate.right === undefined)
        return candidate.left
      const union = Loadout.union(candidate.left, candidate.right)
      union.setCachedCosts(candidate.cost, candidate.blueberryCost)
      union.setCachedStat(stat, candidate.value)
      return union
    }

    return { evaluate, materialize }
}

function findLuckScaledResourceOpt(
  table1: Loadout[],
  table2: Loadout[],
  stat: LuckScaledResourceStat,
  budget = stats.amb,
): Loadout {
    const evaluator = createLuckScaledResourceEvaluator(table1, table2, stat)
    let power = 0
    let j = 0
    const upperBounds: Array<{ budget: number; table2Index: number }> = []
    if (table1.length > 100 && table2.length > 100) {
      for (let i = 1; Math.round(i) <= table1.length; i += (table1.length - 1) / 100) {
        for (let next = j; Math.round(next) < table2.length; next += (table2.length - 1) / 100) {
          const table2Index = Math.round(next)
          const loadout1 = table1.at(-Math.round(i))!
          const loadout2 = table2[table2Index]
          if (loadout2.cost > budget)
            break
          const union = evaluator.evaluate(loadout1, table2Index, true)
          if (2 * union.cost - loadout1.cost - loadout2.cost > budget) {
            upperBounds.push({ budget: loadout1.cost, table2Index })
            break
          }
          if (union.cost > budget || union.blueberryCost > stats.blueberries)
            continue
          power = Math.max(power, union.value)
          j = next
        }
      }
    }

    let opt: LuckScaledResourceEvaluation = {
      left: table1[0],
      cost: table1[0].cost,
      blueberryCost: table1[0].blueberryCost,
      value: table1[0].getStat(stat),
    }
    j = 0
    let upperBoundIndex = 0
    for (let i = 1; i <= table1.length; i++) {
      const ref = table1.at(-i)!
      while (upperBoundIndex < upperBounds.length
        && upperBounds[upperBoundIndex].budget > ref.cost)
        upperBoundIndex++
      const upperBound = upperBounds[upperBoundIndex]
      if (upperBound !== undefined) {
        const boundUnion = evaluator.evaluate(ref, upperBound.table2Index, false)
        if (boundUnion.value < power)
          continue
      }
      if (table2[j].cost > budget)
        continue
      let union = evaluator.evaluate(ref, j, true)
      if (union.cost > budget)
        continue
      for (let next = j + 1; next < table2.length; next++) {
        if (table2[next].cost > budget)
          break
        const nextUnion = evaluator.evaluate(ref, next, budget < Number.POSITIVE_INFINITY)
        if (2 * nextUnion.cost - ref.cost - table2[next].cost > budget)
          break
        if (nextUnion.cost > budget) {
          if (nextUnion.blueberryCost <= stats.blueberries)
            break
          continue
        }
        if (nextUnion.value <= union.value)
          continue
        union = nextUnion
        j = next
      }
      const statDiff = union.value - opt.value
      if (statDiff > 0 || (statDiff === 0 && union.cost < opt.cost))
        opt = union
    }
    return evaluator.materialize(opt)
}

// Vouchers directly multiply these resources as well as increasing Jack's
// Luck bonus. Reserve their cost before allocating Luck, and compare every
// affordable voucher count. Keep counts and Luck-module levels separate when
// trimming: their interaction with the remaining Luck can reverse dominance.
// Luck-only searches retain their cheaper last-priority voucher allocation.
function findResourceVoucherOpt(
  resourceTable: Loadout[],
  luckTable: Loadout[],
  voucherTable: Loadout[],
  stat: LuckScaledResourceStat,
): Loadout {
    const modules = LUCK_SCALED_RESOURCE_MODULES[stat]
    const effectsEnabled = stats.exalt !== 6 && stats.exalt !== 8
    // The highest Luck any affordable Luck row can bring to a left row with
    // these vouchers, in createLuckScaledResourceEvaluator's formula. Purple
    // Leo is counted for every Blueberry: a blueberry repair can free some.
    const luckRows = luckTable.filter(right => right.cost <= stats.amb).map(right => {
      const mLuck = right.getStat("mLuck")
      return {
        additiveLuck: right.getStat("luck") / (1 + mLuck),
        mLuck,
        freeLuckLevel: right.effectiveLevel("ambrosiaFreeLuckUpgrades")
          - (stats.bonus[upgrades.ambrosiaFreeLuckUpgrades.row] ?? 0),
        vouchers: right.getStat("vouchers"),
      }
    })
    const maxLuck = (vouchers: number): number => {
      let max = 0
      for (const right of luckRows) {
        const panthemaDelta = effectsEnabled && stats.exalt !== 4
          ? 0.2 * stats.panthemaLevel
            * (stats.shopBonusLevels.ambrosiaLuck + right.freeLuckLevel)
            * 0.01 * stats.panthemaLevel * Math.max(0, vouchers - right.vouchers)
          : 0
        max = Math.max(max, (right.additiveLuck + stats.blueberries * stats.purpleLeoLevel + panthemaDelta)
          * (1 + right.mLuck))
      }
      return max
    }

    // One group per voucher count and resource-module levels, keyed by the
    // levels joined ("2" or, for Obt + Off, "2,1")
    const groupLoadouts = (vouchers: Loadout, levelsKey?: string): Map<string, Loadout[]> => {
      const byLevels = new Map<string, Loadout[]>()
      for (const resource of resourceTable) {
        const candidate = Loadout.union(resource, vouchers)
        if (candidate.cost > stats.amb || candidate.blueberryCost > stats.blueberries)
          continue
        const candidateKey = modules.map(module => candidate.effectiveLevel(module)).join(",")
        if (levelsKey !== undefined && candidateKey !== levelsKey)
          continue
        const group = byLevels.get(candidateKey) ?? []
        group.push(candidate)
        byLevels.set(candidateKey, group)
      }
      return byLevels
    }

    // A group's bound is the most its search can return: each row alone, or
    // each row with the highest Luck. Searching the groups from the highest
    // bound down, the first bound below the best result ends the search: the
    // full search per group is the slow part, and at a high budget nearly
    // every group is searched. Only the bounds are kept here, the searched
    // groups are built again: all of them at once take hundreds of MB.
    const groups: { vouchers: Loadout; levelsKey: string; bound: number }[] = []
    for (const vouchers of voucherTable) {
      for (const [levelsKey, loadouts] of groupLoadouts(vouchers)) {
        const resourceLevels = levelsKey.split(",").map(level => effectsEnabled ? Number(level) : 0)
        const luck = maxLuck(loadouts[0].getStat("vouchers"))
        let bound = 0
        for (const loadout of loadouts) {
          const value = loadout.getStat(stat)
          const withMaxLuck = value / luckScaledResourceFactor(loadout.luck, resourceLevels)
            * luckScaledResourceFactor(luck, resourceLevels)
          bound = Math.max(bound, value, withMaxLuck)
        }
        groups.push({ vouchers, levelsKey, bound })
      }
    }
    groups.sort((a, b) => b.bound - a.bound)

    let best = new Loadout()
    for (const group of groups) {
      // A bound equal to the best can still tie it at a lower cost
      if (group.bound < best.getStat(stat))
        break
      const loadouts = groupLoadouts(group.vouchers, group.levelsKey).get(group.levelsKey)!
      const frontier = trimTable(loadouts, stat)
      const candidate = stat === "off" && cubeExperimentConfig?.useLegacyOfferingSearch
        ? findOpt(frontier, luckTable, stat)
        : findLuckScaledResourceOpt(frontier, luckTable, stat)
      const difference = candidate.getStat(stat) - best.getStat(stat)
      if (difference > 0 || (difference === 0 && candidate.cost < best.cost))
        best = candidate
    }
    return best
}

// Quark + Luck has a similarly small cross-table surface: the Luck side can
// raise Tutorial/Quarks-I prerequisites and adds the Luck-Quark hybrid.  All
// remaining Quark multipliers are already contained in the left frontier.
// Evaluate just those ratios instead of rebuilding a full Loadout for every
// candidate pair.
function createQuarkLuckEvaluator(table1: Loadout[], table2: Loadout[]) {
    const effectsEnabled = stats.exalt !== 6 && stats.exalt !== 8
    const effectiveLevel = (name: string, rawLevel: number): number => {
      const upgrade = upgrades[name]
      if (upgrade.requiresExalt9 && !stats.exalt9Unlocked)
        return 0
      let level = rawLevel
      if (name === "ambrosiaTutorial")
        level += stats.tutorialBonus
      level += stats.bonus[upgrade.row] ?? 0
      if (rawLevel > 0)
        level += stats.ambrosiaUpgradeBonusLevels[name] ?? 0
      return level
    }
    const tutorialFactor = (rawLevel: number): number => effectsEnabled
      ? 1 + 0.01 * effectiveLevel("ambrosiaTutorial", rawLevel)
      : 1
    const quarks1Factor = (rawLevel: number): number => effectsEnabled
      ? 1 + 0.01 * effectiveLevel("ambrosiaQuarks1", rawLevel)
      : 1
    const quarks2Factor = (rawLevel: number, rawQuarks1: number): number => {
      if (!effectsEnabled)
        return 1
      const level = effectiveLevel("ambrosiaQuarks2", rawLevel)
      const quarks1 = effectiveLevel("ambrosiaQuarks1", rawQuarks1)
      return 1 + (0.01 + Math.floor(quarks1 / 10) * 0.001) * level
    }
    const luckQuarkFactor = (luck: number, rawLevel: number): number => {
      if (!effectsEnabled)
        return 1
      const level = effectiveLevel("ambrosiaLuckQuark1", rawLevel)
      return 1 + 0.0001 * Math.min(luck, Math.sqrt(1000 * luck)) * level
    }

    const rightMetadata = table2.map(loadout => {
      const mLuck = loadout.getStat("mLuck")
      return {
        loadout,
        additiveLuck: loadout.getStat("luck") / (1 + mLuck),
        mLuck,
        rawTutorial: loadout.upgradeLevels.ambrosiaTutorial ?? 0,
        rawQuarks1: loadout.upgradeLevels.ambrosiaQuarks1 ?? 0,
        rawLuckQuark: loadout.upgradeLevels.ambrosiaLuckQuark1 ?? 0,
      }
    })
    const fixedRight = table2[0]
    const leftMetadata = new WeakMap<Loadout, {
      overlapCost: number;
      overlapBlueberries: number;
      rawTutorial: number;
      rawQuarks1: number;
      rawQuarks2: number;
      luck: number;
      value: number;
    }>()
    for (const left of table1) {
      let overlapCost = 0
      let overlapBlueberries = 0
      for (const [name, leftLevel] of Object.entries(left.upgradeLevels)) {
        const rightLevel = fixedRight.upgradeLevels[name] ?? 0
        if (leftLevel <= 0 || rightLevel <= 0)
          continue
        overlapCost += upgrades[name].cost(Math.min(leftLevel, rightLevel))
        overlapBlueberries += Math.max(
          0,
          upgrades[name].blueberryCost
            - (stats.ambrosiaUpgradeBlueberryCostReductions[name] ?? 0),
        )
      }
      leftMetadata.set(left, {
        overlapCost,
        overlapBlueberries,
        rawTutorial: left.upgradeLevels.ambrosiaTutorial ?? 0,
        rawQuarks1: left.upgradeLevels.ambrosiaQuarks1 ?? 0,
        rawQuarks2: left.upgradeLevels.ambrosiaQuarks2 ?? 0,
        luck: left.luck,
        value: left.getStat("quark"),
      })
    }

    const evaluate = (
      left: Loadout,
      rightIndex: number,
      repairBlueberries: boolean,
    ): LuckScaledResourceEvaluation => {
      const right = rightMetadata[rightIndex]
      const metadata = leftMetadata.get(left)!
      const cost = left.cost + right.loadout.cost - metadata.overlapCost
      const blueberryCost = left.blueberryCost + right.loadout.blueberryCost
        - metadata.overlapBlueberries
      if (repairBlueberries && blueberryCost > stats.blueberries) {
        const fixed = Loadout.union(left, right.loadout)
        fixed.fixBlueberryUpgrades()
        return {
          left,
          right: right.loadout,
          fixed,
          cost: fixed.cost,
          blueberryCost: fixed.blueberryCost,
          value: fixed.getStat("quark"),
        }
      }

      const rightUnassigned = stats.blueberries - right.loadout.blueberryCost
      const unionUnassigned = stats.blueberries - blueberryCost
      const purpleLeoDelta = (unionUnassigned >= 5 ? unionUnassigned * stats.purpleLeoLevel : 0)
        - (rightUnassigned >= 5 ? rightUnassigned * stats.purpleLeoLevel : 0)
      const luck = (right.additiveLuck + purpleLeoDelta) * (1 + right.mLuck)
      const unionTutorial = Math.max(metadata.rawTutorial, right.rawTutorial)
      const unionQuarks1 = Math.max(metadata.rawQuarks1, right.rawQuarks1)
      const prerequisiteFactor = tutorialFactor(unionTutorial) / tutorialFactor(metadata.rawTutorial)
        * quarks1Factor(unionQuarks1) / quarks1Factor(metadata.rawQuarks1)
        * quarks2Factor(metadata.rawQuarks2, unionQuarks1)
          / quarks2Factor(metadata.rawQuarks2, metadata.rawQuarks1)
      const hybridFactor = luckQuarkFactor(luck, right.rawLuckQuark)
        / luckQuarkFactor(metadata.luck, 0)
      return {
        left,
        right: right.loadout,
        cost,
        blueberryCost,
        value: metadata.value * prerequisiteFactor * hybridFactor,
      }
    }

    const materialize = (candidate: LuckScaledResourceEvaluation): Loadout => {
      if (candidate.fixed !== undefined)
        return candidate.fixed
      if (candidate.right === undefined)
        return candidate.left
      const union = Loadout.union(candidate.left, candidate.right)
      union.setCachedCosts(candidate.cost, candidate.blueberryCost)
      union.setCachedStat("quark", candidate.value)
      return union
    }
    return { evaluate, materialize }
}

function findQuarkLuckOptSingleFixed(
  table1: Loadout[],
  table2: Loadout[],
  budget: number,
): Loadout {
    const evaluator = createQuarkLuckEvaluator(table1, table2)
    let power = 0
    let j = 0
    const upperBounds: Array<{ budget: number; table2Index: number }> = []
    if (table1.length > 100 && table2.length > 100) {
      for (let i = 1; Math.round(i) <= table1.length; i += (table1.length - 1) / 100) {
        for (let next = j; Math.round(next) < table2.length; next += (table2.length - 1) / 100) {
          const table2Index = Math.round(next)
          const loadout1 = table1.at(-Math.round(i))!
          const loadout2 = table2[table2Index]
          if (loadout2.cost > budget)
            break
          const union = evaluator.evaluate(loadout1, table2Index, true)
          if (2 * union.cost - loadout1.cost - loadout2.cost > budget) {
            upperBounds.push({ budget: loadout1.cost, table2Index })
            break
          }
          if (union.cost > budget || union.blueberryCost > stats.blueberries)
            continue
          power = Math.max(power, union.value)
          j = next
        }
      }
    }

    let opt: LuckScaledResourceEvaluation = {
      left: table1[0],
      cost: table1[0].cost,
      blueberryCost: table1[0].blueberryCost,
      value: table1[0].getStat("quark"),
    }
    j = 0
    let upperBoundIndex = 0
    for (let i = 1; i <= table1.length; i++) {
      const ref = table1.at(-i)!
      while (upperBoundIndex < upperBounds.length
        && upperBounds[upperBoundIndex].budget > ref.cost)
        upperBoundIndex++
      const upperBound = upperBounds[upperBoundIndex]
      if (upperBound !== undefined) {
        const boundUnion = evaluator.evaluate(ref, upperBound.table2Index, false)
        if (boundUnion.value < power)
          continue
      }
      if (table2[j].cost > budget)
        continue
      let union = evaluator.evaluate(ref, j, true)
      if (union.cost > budget)
        continue
      for (let next = j + 1; next < table2.length; next++) {
        if (table2[next].cost > budget)
          break
        const nextUnion = evaluator.evaluate(ref, next, budget < Number.POSITIVE_INFINITY)
        if (2 * nextUnion.cost - ref.cost - table2[next].cost > budget)
          break
        if (nextUnion.cost > budget) {
          if (nextUnion.blueberryCost <= stats.blueberries)
            break
          continue
        }
        if (nextUnion.value <= union.value)
          continue
        union = nextUnion
        j = next
      }
      const statDiff = union.value - opt.value
      if (statDiff > 0 || (statDiff === 0 && union.cost < opt.cost))
        opt = union
    }
    return evaluator.materialize(opt)
}

function findQuarkLuckOpt(
  table1: Loadout[],
  table2: Loadout[],
  budget = stats.amb,
  sharedLevelsFixed = false,
): Loadout {
    if (!sharedLevelsFixed && !fixedSharedLevels(table1, table2)) {
      const groups = groupBySharedLevels(table1, table2)
      if (groups === undefined)
        return findOpt(table1, table2, "quark", budget)
      let best = findQuarkLuckOpt(table1, groups[0], budget, true)
      for (let index = 1; index < groups.length; index++) {
        const candidate = findQuarkLuckOpt(table1, groups[index], budget, true)
        const statDiff = candidate.getStat("quark") - best.getStat("quark")
        if (statDiff > 0 || (statDiff === 0 && candidate.cost < best.cost))
          best = candidate
      }
      return best
    }
    return findQuarkLuckOptSingleFixed(table1, table2, budget)
}

function findOptSingleFixed(
  table1: Loadout[],
  table2: Loadout[],
  stat: string,
  budget: number,
  useOverlapBreak: boolean,
): Loadout {
    let power = 0
    let j = 0
    const upperBounds: Array<{ budget: number; loadout: Loadout }> = []
    if (stat !== "allAmb" && table1.length > 100 && table2.length > 100) {
      for (let i = 1; Math.round(i) <= table1.length; i += (table1.length - 1) / 100) {
        for (let next = j; Math.round(next) < table2.length; next += (table2.length - 1) / 100) {
          const loadout1 = table1.at(-Math.round(i))!
          const loadout2 = table2[Math.round(next)]
          if (loadout2.cost > budget)
            break
          const union = Loadout.union(loadout1, loadout2)
          if (union.blueberryCost > stats.blueberries)
            union.fixBlueberryUpgrades()
          if (2 * union.cost - loadout1.cost - loadout2.cost > budget) {
            upperBounds.push({ budget: loadout1.cost, loadout: loadout2 })
            break
          }
          if (union.cost > budget || union.blueberryCost > stats.blueberries)
            continue
          power = Math.max(power, union.getStat(stat))
          j = next
        }
      }
    }

    let opt = table1[0]
    j = 0
    let upperBoundIndex = 0
    for (let i = 1; i <= table1.length; i++) {
      const ref = table1.at(-i)!
      while (upperBoundIndex < upperBounds.length
        && upperBounds[upperBoundIndex].budget > ref.cost)
        upperBoundIndex++
      const upperBound = upperBounds[upperBoundIndex]?.loadout
      if (upperBound !== undefined) {
        const boundUnion = Loadout.union(ref, upperBound)
        if (boundUnion.getStat(stat) < power)
          continue
      }
      if (table2[j].cost > budget)
        continue
      let union = Loadout.union(ref, table2[j])
      if (union.blueberryCost > stats.blueberries)
        union.fixBlueberryUpgrades()
      if (union.cost > budget)
        continue
      for (let next = j + 1; next < table2.length; next++) {
        if (table2[next].cost > budget)
          break
        const nextUnion = Loadout.union(ref, table2[next])
        if (budget < Number.POSITIVE_INFINITY && nextUnion.blueberryCost > stats.blueberries)
          nextUnion.fixBlueberryUpgrades()
        if (useOverlapBreak && 2 * nextUnion.cost - ref.cost - table2[next].cost > budget)
          break
        if (nextUnion.cost > budget) {
          if (useOverlapBreak && nextUnion.blueberryCost <= stats.blueberries)
            break
          continue
        }
        if (nextUnion.getStat(stat) <= union.getStat(stat))
          continue
        union = nextUnion
        j = next
      }
      const statDiff = union.getStat(stat) - opt.getStat(stat)
      if (statDiff > 0 || (statDiff === 0 && union.cost < opt.cost))
        opt = union
    }
    return opt
}

function findCubeLuckOptSingleFixed(
  table1: Loadout[],
  table2: Loadout[],
  stat: "cube" | "oct",
  budget: number,
  useOverlapBreak: boolean,
  sampledUpperBound: boolean,
): Loadout {
    const evaluator = createCubeLuckEvaluator(table2, stat, useOverlapBreak)
    // The sampled upper bound is not exact: it assumes a Luck-Cube row scores
    // at least as much as every cheaper row, but that frontier is
    // two-dimensional (Ambrosia, Blueberries), so a dearer row can score less
    // and the bound can skip the best left row. Only the Max SR rows use it:
    // their SR level is fixed before this search, their cubes are a bonus, and
    // without it their Blueberry repairs make the search several times slower.
    let power = 0
    let j = 0
    const upperBounds: Array<{ budget: number; table2Index: number }> = []
    if (sampledUpperBound && table1.length > 100 && table2.length > 100) {
      for (let i = 1; Math.round(i) <= table1.length; i += (table1.length - 1) / 100) {
        for (let next = j; Math.round(next) < table2.length; next += (table2.length - 1) / 100) {
          const table2Index = Math.round(next)
          const loadout1 = table1.at(-Math.round(i))!
          const loadout2 = table2[table2Index]
          if (loadout2.cost > budget)
            break
          const union = evaluator.evaluate(loadout1, table2Index, true)
          if (2 * union.cost - loadout1.cost - loadout2.cost > budget) {
            upperBounds.push({ budget: loadout1.cost, table2Index })
            break
          }
          if (union.cost > budget || union.blueberryCost > stats.blueberries)
            continue
          power = Math.max(power, union.value)
          j = next
        }
      }
    }

    let opt: CubeLuckEvaluation = {
      left: table1[0],
      cost: table1[0].cost,
      blueberryCost: table1[0].blueberryCost,
      value: table1[0].getStat(stat),
    }
    j = 0
    let upperBoundIndex = 0
    for (let i = 1; i <= table1.length; i++) {
      const ref = table1.at(-i)!
      while (upperBoundIndex < upperBounds.length
        && upperBounds[upperBoundIndex].budget > ref.cost)
        upperBoundIndex++
      const upperBound = upperBounds[upperBoundIndex]
      if (upperBound !== undefined) {
        const boundUnion = evaluator.evaluate(ref, upperBound.table2Index, false)
        if (boundUnion.value < power)
          continue
      }
      if (table2[j].cost > budget)
        continue
      let union = evaluator.evaluate(ref, j, true)
      if (union.cost > budget)
        continue
      for (let next = j + 1; next < table2.length; next++) {
        if (table2[next].cost > budget)
          break
        const nextUnion = evaluator.evaluate(ref, next, budget < Number.POSITIVE_INFINITY)
        if (useOverlapBreak && 2 * nextUnion.cost - ref.cost - table2[next].cost > budget)
          break
        if (nextUnion.cost > budget) {
          if (useOverlapBreak && nextUnion.blueberryCost <= stats.blueberries)
            break
          continue
        }
        if (nextUnion.value <= union.value)
          continue
        union = nextUnion
        j = next
      }
      const statDiff = union.value - opt.value
      if (statDiff > 0 || (statDiff === 0 && union.cost < opt.cost))
        opt = union
    }
    return evaluator.materialize(opt)
}

function findCubeLuckOpt(
  table1: Loadout[],
  table2: Loadout[],
  stat: "cube" | "oct",
  budget = stats.amb,
  sharedLevelsFixed = false,
  sampledUpperBound = false,
): Loadout {
    if (!sharedLevelsFixed) {
      // Frontier-building helpers cache factorised stats for their own merge.
      // Refresh the direct side once before combining it with Luck-Cube so the
      // evaluator starts from the same full formula as a newly unioned loadout.
      for (const loadout of table1) {
        loadout.invalidateCaches()
        loadout.getStat(stat)
      }
    }
    if (!sharedLevelsFixed && shouldGroupSharedLevelSearch(table1, table2)) {
      const groups = groupBySharedLevels(table1, table2)
      if (groups !== undefined) {
        let best = findCubeLuckOpt(table1, groups[0], stat, budget, true, sampledUpperBound)
        for (let index = 1; index < groups.length; index++) {
          const candidate = findCubeLuckOpt(table1, groups[index], stat, budget, true, sampledUpperBound)
          const statDiff = candidate.getStat(stat) - best.getStat(stat)
          if (statDiff > 0 || (statDiff === 0 && candidate.cost < best.cost))
            best = candidate
        }
        return best
      }
    }
    return findCubeLuckOptSingleFixed(
      table1,
      table2,
      stat,
      budget,
      sharedLevelsFixed || fixedSharedLevels(table1, table2),
      sampledUpperBound,
    )
}

type CubeLuckFindOptState = {
    budget: number;
    j: number;
    opt: CubeLuckEvaluation;
    // Blueberries this budget's row still has to pay after the search.
    reserve: number;
};

function findCubeLuckOptsForBudgets(
  table1: Loadout[],
  table2: Loadout[],
  stat: "cube" | "oct",
  budgets: readonly number[],
  sharedLevelsFixed = false,
  blueberryReserves?: readonly number[],
): Loadout[] {
    if (!sharedLevelsFixed) {
      for (const loadout of table1) {
        loadout.invalidateCaches()
        loadout.getStat(stat)
      }
    }
    // With reserves, a budget's row still has to pay that many Blueberries
    // after the search (Hyperflux itself), so each budget has its own
    // Blueberry limit. A pair over a limit is then skipped, not repaired:
    // the repair only knows the global limit, and one repaired union can't
    // be shared by budgets with different limits.
    const strict = blueberryReserves !== undefined
    const fitsBlueberries = (blueberryCost: number, budgetIndex: number): boolean =>
      blueberryCost + (blueberryReserves?.[budgetIndex] ?? 0) <= stats.blueberries
    if (!sharedLevelsFixed && shouldGroupSharedLevelSearch(table1, table2)) {
      const groups = groupBySharedLevels(table1, table2)
      if (groups !== undefined) {
        const best = findCubeLuckOptsForBudgets(table1, groups[0], stat, budgets, true, blueberryReserves)
        for (let index = 1; index < groups.length; index++) {
          const candidates = findCubeLuckOptsForBudgets(table1, groups[index], stat, budgets, true, blueberryReserves)
          for (let budgetIndex = 0; budgetIndex < budgets.length; budgetIndex++) {
            const candidate = candidates[budgetIndex]
            if (!fitsBlueberries(candidate.blueberryCost, budgetIndex))
              continue
            const statDiff = candidate.getStat(stat) - best[budgetIndex].getStat(stat)
            if (!fitsBlueberries(best[budgetIndex].blueberryCost, budgetIndex)
              || statDiff > 0 || (statDiff === 0 && candidate.cost < best[budgetIndex].cost))
              best[budgetIndex] = candidate
          }
        }
        return best
      }
    }

    const useOverlapBreak = sharedLevelsFixed || fixedSharedLevels(table1, table2)
    if (budgets.length === 1 && !strict)
      return [findCubeLuckOptSingleFixed(table1, table2, stat, budgets[0], useOverlapBreak, false)]
    const evaluator = createCubeLuckEvaluator(table2, stat, useOverlapBreak)
    // No sampled upper bound: not exact (findCubeLuckOptSingleFixed)
    const states: CubeLuckFindOptState[] = budgets.map((budget, budgetIndex) => ({
      budget,
      j: 0,
      opt: {
        left: table1[0],
        cost: table1[0].cost,
        blueberryCost: table1[0].blueberryCost,
        value: fitsBlueberries(table1[0].blueberryCost, budgetIndex)
          ? table1[0].getStat(stat) : Number.NEGATIVE_INFINITY,
      },
      reserve: blueberryReserves?.[budgetIndex] ?? 0,
    }))

    const rawUnionCache: Array<CubeLuckEvaluation | undefined> = new Array(table2.length)
    const fixedUnionCache: Array<CubeLuckEvaluation | undefined> = new Array(table2.length)
    const rawTouched: number[] = []
    const fixedTouched: number[] = []
    let currentRef = table1[0]
    const unionAt = (table2Index: number, repairBlueberries: boolean): CubeLuckEvaluation => {
      const cache = repairBlueberries ? fixedUnionCache : rawUnionCache
      const cached = cache[table2Index]
      if (cached !== undefined)
        return cached
      const union = evaluator.evaluate(currentRef, table2Index, repairBlueberries)
      cache[table2Index] = union
      ;(repairBlueberries ? fixedTouched : rawTouched).push(table2Index)
      return union
    }
    for (let i = 1; i <= table1.length; i++) {
      const ref = table1.at(-i)!
      currentRef = ref
      for (const state of states) {
        if (table2[state.j].cost > state.budget)
          continue
        // In strict mode the unions are never repaired, and one over this
        // budget's Blueberry limit counts as worthless.
        const blueberryLimit = stats.blueberries - state.reserve
        let union = unionAt(state.j, !strict)
        if (union.cost > state.budget)
          continue
        let unionValue = strict && union.blueberryCost > blueberryLimit
          ? Number.NEGATIVE_INFINITY : union.value
        for (let next = state.j + 1; next < table2.length; next++) {
          if (table2[next].cost > state.budget)
            break
          const nextUnion = unionAt(next, !strict && state.budget < Number.POSITIVE_INFINITY)
          if (useOverlapBreak && 2 * nextUnion.cost - ref.cost - table2[next].cost > state.budget)
            break
          if (nextUnion.cost > state.budget) {
            if (useOverlapBreak && nextUnion.blueberryCost <= blueberryLimit)
              break
            continue
          }
          const nextValue = strict && nextUnion.blueberryCost > blueberryLimit
            ? Number.NEGATIVE_INFINITY : nextUnion.value
          if (nextValue <= unionValue)
            continue
          union = nextUnion
          unionValue = nextValue
          state.j = next
        }
        if (unionValue > state.opt.value
          || (unionValue === state.opt.value && union.cost < state.opt.cost))
          state.opt = union
      }
      for (const index of rawTouched)
        rawUnionCache[index] = undefined
      for (const index of fixedTouched)
        fixedUnionCache[index] = undefined
      rawTouched.length = 0
      fixedTouched.length = 0
    }

    return states.map(state => evaluator.materialize(state.opt))
}

// Finds the globally optimal loadout for several budgets in one traversal.
// Hyperflux requests the same search at a handful of different
// budgets. Keeping independent search cursors while sharing each constructed
// union avoids rebuilding identical temporary Loadouts four to eight times.
function findOptsForBudgets(
  table1: Loadout[],
  table2: Loadout[],
  stat: string,
  budgets: readonly number[],
  sharedLevelsFixed = false,
): Loadout[] {
    if (!sharedLevelsFixed && shouldGroupSharedLevelSearch(table1, table2)) {
      const groups = groupBySharedLevels(table1, table2)
      if (groups !== undefined) {
        const best = findOptsForBudgets(table1, groups[0], stat, budgets, true)
        for (let index = 1; index < groups.length; index++) {
          const candidates = findOptsForBudgets(table1, groups[index], stat, budgets, true)
          for (let budgetIndex = 0; budgetIndex < budgets.length; budgetIndex++) {
            const candidate = candidates[budgetIndex]
            const statDiff = candidate.getStat(stat) - best[budgetIndex].getStat(stat)
            if (statDiff > 0 || (statDiff === 0 && candidate.cost < best[budgetIndex].cost))
              best[budgetIndex] = candidate
          }
        }
        return best
      }
    }

    const useOverlapBreak = sharedLevelsFixed || fixedSharedLevels(table1, table2)
    if (budgets.length === 1)
      return [findOptSingleFixed(table1, table2, stat, budgets[0], useOverlapBreak)]
    const states: FindOptState[] = budgets.map(budget => ({
      budget,
      power: 0,
      j: 0,
      upperBounds: [],
      upperBoundIndex: 0,
      opt: table1[0],
    }))

    // Preserve the original sampled upper-bound pass independently for every
    // budget. This is small compared with the exact pass and keeps pruning and
    // tie-breaking identical to a standalone findOpt call.
    if (stat !== "allAmb" && table1.length > 100 && table2.length > 100) {
      for (const state of states) {
        let sampledJ = 0
        for (let i = 1; Math.round(i) <= table1.length; i += (table1.length - 1) / 100) {
          for (let next = sampledJ; Math.round(next) < table2.length; next += (table2.length - 1) / 100) {
            const table2Index = Math.round(next)
            const loadout1 = table1.at(-Math.round(i))!
            const loadout2 = table2[table2Index]
            if (loadout2.cost > state.budget)
              break
            const union = Loadout.union(loadout1, loadout2)
            if (union.blueberryCost > stats.blueberries)
              union.fixBlueberryUpgrades()
            if (2 * union.cost - loadout1.cost - loadout2.cost > state.budget) {
              state.upperBounds.push({ budget: loadout1.cost, table2Index })
              break
            }
            if (union.cost > state.budget || union.blueberryCost > stats.blueberries)
              continue
            state.power = Math.max(state.power, union.getStat(stat))
            sampledJ = next
          }
        }
      }
    }

    const rawUnionCache: Array<Loadout | undefined> = new Array(table2.length)
    const fixedUnionCache: Array<Loadout | undefined> = new Array(table2.length)
    const rawTouched: number[] = []
    const fixedTouched: number[] = []
    let currentRef = table1[0]
    const unionAt = (table2Index: number, repairBlueberries: boolean): Loadout => {
      const cache = repairBlueberries ? fixedUnionCache : rawUnionCache
      const cached = cache[table2Index]
      if (cached !== undefined)
        return cached
      const union = Loadout.union(currentRef, table2[table2Index])
      if (repairBlueberries && union.blueberryCost > stats.blueberries)
        union.fixBlueberryUpgrades()
      cache[table2Index] = union
      ;(repairBlueberries ? fixedTouched : rawTouched).push(table2Index)
      return union
    }
    for (let i = 1; i <= table1.length; i++) {
      const ref = table1.at(-i)!
      currentRef = ref

      for (const state of states) {
        while (state.upperBoundIndex < state.upperBounds.length
          && state.upperBounds[state.upperBoundIndex].budget > ref.cost)
          state.upperBoundIndex++
        const upperBound = state.upperBounds[state.upperBoundIndex]
        if (upperBound !== undefined) {
          const boundUnion = unionAt(upperBound.table2Index, false)
          if (boundUnion.getStat(stat) < state.power)
            continue
        }
        if (table2[state.j].cost > state.budget)
          continue
        let union = unionAt(state.j, true)
        if (union.cost > state.budget)
          continue
        for (let next = state.j + 1; next < table2.length; next++) {
          if (table2[next].cost > state.budget)
            break
          const repairBlueberries = state.budget < Number.POSITIVE_INFINITY
          const nextUnion = unionAt(next, repairBlueberries)
          if (useOverlapBreak && 2 * nextUnion.cost - ref.cost - table2[next].cost > state.budget)
            break
          if (nextUnion.cost > state.budget) {
            if (useOverlapBreak && nextUnion.blueberryCost <= stats.blueberries)
              break
            continue
          }
          if (nextUnion.getStat(stat) <= union.getStat(stat))
            continue
          union = nextUnion
          state.j = next
        }
        const statDiff = union.getStat(stat) - state.opt.getStat(stat)
        if (statDiff > 0 || (statDiff === 0 && union.cost < state.opt.cost))
          state.opt = union
      }
      for (const index of rawTouched)
        rawUnionCache[index] = undefined
      for (const index of fixedTouched)
        fixedUnionCache[index] = undefined
      rawTouched.length = 0
      fixedTouched.length = 0
    }

    return states.map(state => state.opt)
}

// Finds the globally optimal loadout among affordable ones.
function findOpt(table1: Loadout[], table2: Loadout[], stat: string, budget = stats.amb): Loadout {
    return findOptsForBudgets(table1, table2, stat, [budget])[0]
}


// ===========================================================================
// Input mapping: HeaterOptimizerInput → stats + options
// ===========================================================================

// Only two rune modules and the applicable stabilizer can improve capped
// coin income. Enumerate them together: trimming by Cube or rune levels
// would lose valid coin optima. Brick can only lower this objective.
function findCoinsC15Opt(): Loadout {
    let best = new Loadout();
    const suppressed = stats.exalt === 6 || stats.exalt === 8;
    const stabilizer = stats.exalt > 0 ? 'ambrosiaSingReduction2' : 'ambrosiaSingReduction1';
    const maxStabilizer = stats.postAoAG ? 0 : upgrades[stabilizer].maxLevel;
    for (let stabilizerLevel = 0; stabilizerLevel <= maxStabilizer; stabilizerLevel++) {
        const seed = new Loadout();
        seed.upgradeLevels[stabilizer] = stabilizerLevel;
        seed.satisfyPrerequisites();
        if (seed.cost > stats.amb || seed.blueberryCost > stats.blueberries) continue;
        for (let talisman = 0; talisman <= (suppressed ? 0 : upgrades.ambrosiaTalismanBonusRuneLevel.maxLevel); talisman++) {
            const talismanLoadout = new Loadout(seed);
            talismanLoadout.upgradeLevels.ambrosiaTalismanBonusRuneLevel = talisman;
            if (talismanLoadout.cost > stats.amb) break;
            for (let coefficient = 0; coefficient <= (suppressed ? 0 : upgrades.ambrosiaRuneOOMBonus.maxLevel); coefficient++) {
                const candidate = new Loadout(talismanLoadout);
                candidate.upgradeLevels.ambrosiaRuneOOMBonus = coefficient;
                if (candidate.cost > stats.amb) break;
                const comparison = candidate.compareStat(best, 'coinsC15');
                if (comparison > 0 || (comparison === 0 && (candidate.cost < best.cost
                    || (candidate.cost === best.cost && candidate.blueberryCost < best.blueberryCost))))
                    best = candidate;
            }
        }
    }
    return best;
}

// The input fields holding NaN. A NaN stat passes every Pareto trim (its
// comparisons are false), so the frontier would fill up to its memory limit
// and report that instead. The optional blocks are left out: only some
// branches read them, and a bad one shouldn't stop the others.
function findNaNInputFields(value: unknown, path = ''): string[] {
    if (typeof value === 'number')
        return Number.isNaN(value) ? [path] : [];
    if (typeof value !== 'object' || value === null)
        return [];
    return Object.entries(value).flatMap(([key, field]) =>
        path === '' && (key === 'reactor' || key === 'purple' || key === 'coinsC15')
            ? []
            : findNaNInputFields(field, path === '' ? key : `${path}.${key}`));
}

function fillStatsAndOptionsFromInput(input: HeaterOptimizerInput): void {
    const {
        amb, ramb, bonusAmbrosiaPerFill, blueberries, purpleLeoLevel,
        luckBaseNoAmb, redLuckBase, luckConversion,
        quarksOwned, qHept, cubesExpTotal,
        currentSingularity, singularityReducers,
        exalt, exalt5Unlocked, exalt9Unlocked, postAoag, oneMindUnlocked, aquariusUnlocked, transcription,
        ascSpeed, ascSpread, baseObt, baseOff,
        bonusTutorial,
        bonusRow2, bonusRow3, bonusRow4, bonusRow5,
        runeSiExp, runeSiRC, runeSiBonusLevelsTotal,
        runeSiBonusLevelsTalismanNoAmbrosia, runeSiEffectiveLevelMultiplier,
        runeIaExp, runeIaBonusLevelsTotal, runeIaBonusLevelsTalisman,
        baseTalismanPower,
        patreonBonus,
        freeShopLevelsInfinity, freeShopLevelsQuark,
        chronometerLevel,
        shopAmbrosiaLuck1, shopAmbrosiaLuck2, shopAmbrosiaLuck3, shopAmbrosiaLuck4,
        shopRedLuck1, shopRedLuck2, shopRedLuck3, shopRedLuck4,
        shopAmbrosiaGeneration1, shopAmbrosiaGeneration2, shopAmbrosiaGeneration3, shopAmbrosiaGeneration4,
        shopImproveQuarkHept1, shopImproveQuarkHept2, shopImproveQuarkHept3, shopImproveQuarkHept4, shopImproveQuarkHept5,
        fusion, rBar, rSpeed, blueBarMaxWithoutTwoMindAndBrick, blueBarRequirementBeforeRounding, redBarMaxWithoutTwoMind,
        ossifiedTactics, redberries, viscount, ossifiedTactics2,
        ambrosiaUpgradeBonusLevels, ambrosiaUpgradeBlueberryCostReductions,
        shopUpgradeRawLevels, shopBonusLevelsNoAmbrosia, panthemaLevel, tauPower,
    } = input;
    // Exalt 4 is No Quark Upgrades. It follows the modal's Exalt select, like
    // every other Exalt rule here, not the save the inputs were exported from.
    const shopUpgradesDisabled = exalt === 4;

    stats.amb            = amb;
    stats.rAmb           = ramb;
    stats.bonusAmbrosiaPerFill = bonusAmbrosiaPerFill;
    // SynergismOfficial/src/BlueberryUpgrades.ts ambrosiaLuck4 uses the
    // separate, rounded-up digit counts of lifetime blue and red Ambrosia.
    stats.lifetimeAmbExp = Math.ceil(Math.log10(amb + 1)) + Math.ceil(Math.log10(ramb + 1));

    // The three fields come without bells (the global event is in them): the
    // Active Bells field's are added here, so a heat can be for any bell count
    const withBells = applyHeaterBells(input);
    stats.ambSpeed    = withBells.ambSpeed;
    stats.blueberries = blueberries;
    stats.purpleLeoLevel = purpleLeoLevel;
    stats.tutorialBonus = bonusTutorial;
    stats.baseLuck       = luckBaseNoAmb;
    stats.baseMLuck      = withBells.luckMult;
    let rLuck            = withBells.redLuck;
    stats.luckConversion = luckConversion;

    stats.quarks  = quarksOwned;
    stats.qHept   = qHept;
    stats.cubeExp = cubesExpTotal + 6;

    stats.rawSing  = currentSingularity;
    stats.sing     = currentSingularity - singularityReducers;
    stats.exalt    = exalt;
    stats.exalt9Unlocked = exalt9Unlocked;
    for (const [name, upgrade] of Object.entries(upgrades)) {
        upgrade.maxLevel = (!exalt5Unlocked && exalt5UpgradeNames.has(name))
            || (!exalt9Unlocked && upgrade.requiresExalt9)
            ? 0
            : upgradeBaseMaxLevels[name];
    }
    stats.postAoAG = postAoag;
    stats.oneMindUnlocked = oneMindUnlocked;
    stats.aquariusExponent = aquariusUnlocked ? 0.01 * (0.55 + transcription / 150) : 0;
    stats.mind     = 0.55 + transcription / 150;
    stats.aSpeed   = ascSpeed;
    stats.spread   = ascSpread;
    stats.baseObt  = baseObt;
    stats.baseOff  = baseOff;

    // --- Bonus levels per row (index 0 unused, rows 1–4)
    stats.bonus = [0, bonusRow2, bonusRow3, bonusRow4, bonusRow5, 0];

    // --- Runes & Talismans
    stats.runeExp    = runeSiExp.eq(0) ? -1e10 : runeSiExp.log10();
    stats.runeCoefSI = runeSiRC;
    stats.bonusSI    = runeSiBonusLevelsTotal;
    stats.talismanSI = runeSiBonusLevelsTalismanNoAmbrosia;
    stats.runeMultSI = runeSiEffectiveLevelMultiplier;
    stats.expIA      = runeIaExp.eq(0) ? -1e10 : runeIaExp.log10();
    stats.bonusIA    = runeIaBonusLevelsTotal.toNumber();
    stats.talismanIA = runeIaBonusLevelsTalisman.toNumber();
    stats.talismanP  = baseTalismanPower.toNumber();
    stats.baseSI     = Upgrade.runeLevelSI();

    stats.baseIACube  = 1 + 0.01  * Upgrade.runeLevelIA();
    const baseIARuneLevel = Upgrade.runeLevelIA();
    stats.baseIAQuark = 1 + 0.002 * baseIARuneLevel + (baseIARuneLevel > 0 ? 0.1 : 0);
    stats.patreon   = patreonBonus;
    stats.ambrosiaUpgradeBonusLevels = ambrosiaUpgradeBonusLevels;
    stats.ambrosiaUpgradeBlueberryCostReductions = ambrosiaUpgradeBlueberryCostReductions;
    blueberryRemovalOrder = Object.keys(upgrades)
      .filter((upgrade) => (upgrades[upgrade]?.blueberryCost ?? 0) > 0)
      .sort((left, right) => {
        const leftCost = Math.max(
          0,
          (upgrades[left].blueberryCost ?? 0)
            - (stats.ambrosiaUpgradeBlueberryCostReductions[left] ?? 0)
        )
        const rightCost = Math.max(
          0,
          (upgrades[right].blueberryCost ?? 0)
            - (stats.ambrosiaUpgradeBlueberryCostReductions[right] ?? 0)
        )
        return rightCost - leftCost || left.localeCompare(right)
      });
    // The modal's shop fields override the export's copies of the same
    // levels, so editing one of them changes the heat
    stats.shopUpgradeRawLevels = {
        ...shopUpgradeRawLevels,
        shopAmbrosiaLuck1, shopAmbrosiaLuck2, shopAmbrosiaLuck3, shopAmbrosiaLuck4,
        shopRedLuck1, shopRedLuck2, shopRedLuck3, shopRedLuck4,
        shopAmbrosiaGeneration1, shopAmbrosiaGeneration2, shopAmbrosiaGeneration3, shopAmbrosiaGeneration4,
        improveQuarkHept:  shopImproveQuarkHept1,
        improveQuarkHept2: shopImproveQuarkHept2,
        improveQuarkHept3: shopImproveQuarkHept3,
        improveQuarkHept4: shopImproveQuarkHept4,
        improveQuarkHept5: shopImproveQuarkHept5,
    };
    stats.shopBonusLevels = {
        ...shopBonusLevelsNoAmbrosia,
        quark: freeShopLevelsQuark,
        infinity: freeShopLevelsInfinity,
    };
    stats.panthemaLevel = panthemaLevel;
    stats.tauPower = tauPower;
    stats.shopUpgradesDisabled = shopUpgradesDisabled;
    for (const cache of Object.values(shopValueCaches))
        cache.clear();

    // The no-Ambrosia exports (shopBonusLevels.infinity, chronometer, and
    // dependent game stats) already contain the free Infinity levels. Candidate
    // loadouts contribute only the *additional* voucher levels they purchase.
    stats.voucher = 0;
    // The exported baseline includes Red row-3 levels for every voucher
    // module; subtract those in getEffect so only purchased/Purple levels
    // contribute to this delta.
    stats.voucherRedLevelBaseline = bonusRow3;
    stats.chronometer = chronometerLevel;

    stats.shopLuck  = shopUpgradesDisabled ? 0 : (shopAmbrosiaLuck1 > 0 ? 2 : 0)
                      + (shopAmbrosiaLuck2 > 0 ? 2 : 0)
                      + (shopAmbrosiaLuck3 > 0 ? 2 : 0)
                      + (shopAmbrosiaLuck4 > 0 ? 0.6 : 0);

    // The exported values contain no Ambrosia upgrade levels. Rebase the
    // persistent Red Ambrosia row levels before the Loadout model reapplies
    // them (plus active Purple Ambrosia enchantments).
    let baseLoadout  = new Loadout();
    stats.baseRLuck  = rLuck - Math.floor((stats.baseLuck * (1 + stats.baseMLuck) - 100) / stats.luckConversion);
    // The export has already removed the Purple Leo contribution from its
    // no-Ambrosia base.  The empty loadout re-adds Leo for its unassigned
    // blueberries, so exclude that contribution when removing the persistent
    // Red Ambrosia row bonuses from the exported base.
    const baseLeoLuck = stats.blueberries >= 5 ? stats.blueberries * stats.purpleLeoLevel : 0;
    // The temporary empty loadout has already reapplied Red free levels to
    // mLuck. Divide by that same multiplier when removing its additive luck,
    // otherwise the free multiplier makes us subtract too much base luck.
    stats.baseLuck  -= baseLoadout.luck / (1 + baseLoadout.getStat('mLuck')) - baseLeoLuck - stats.baseLuck;
    stats.baseMLuck -= upgrades.ambrosiaLuck4.effects.mLuck!(0, stats.bonus[upgrades.ambrosiaLuck4.row] ?? 0, baseLoadout);
    stats.baseObt   -= baseLoadout.getStat("obt") / baseLoadout.getStat("mObt") - stats.baseObt;
    stats.baseOff   -= baseLoadout.getStat("off") / baseLoadout.getStat("mOff") - stats.baseOff;

    stats.ossifiedTactics  = ossifiedTactics;
    stats.redberries       = redberries;
    stats.fusion   = fusion;
    stats.fusion   = (stats.fusion > 0 ? 1 : 0) + 0.02 * stats.fusion;
    stats.fusion   *= rBar > 0 ? rSpeed / rBar : 0;
    stats.viscount         = viscount;
    stats.blueBarMaxWithoutTwoMindAndBrick = blueBarMaxWithoutTwoMindAndBrick;
    stats.blueBarRequirementBeforeRounding = blueBarRequirementBeforeRounding;
    stats.redBarMaxWithoutTwoMind = redBarMaxWithoutTwoMind;
    stats.redBarPointsPerSecond = rSpeed;
    stats.acceleratorSecondsPerRedAmbrosia = (fusion > 0 ? 1 : 0) + 0.02 * fusion;
    stats.reactor = input.reactor;
    stats.purple = input.purple;
    stats.ossifiedTactics2 = ossifiedTactics2;

    coinsC15Evaluator = input.coinsC15 ? createHeaterCoinsC15Evaluator(input.coinsC15, {
        singularity: stats.sing,
        exalt: stats.exalt,
        postAoag: stats.postAoAG,
        talismanPower: stats.talismanP,
    }) : undefined;
    coinsC15Baseline = coinsC15Evaluator ? new Loadout().coinsC15State : undefined;

    const optionsState = input.heaterOptions;
    HEATER_BRANCH_DEFINITIONS.forEach((branch) => {
        const optionKey = branch.optionKey;
        if (optionKey in options) {
            options[optionKey] = optionsState[branch.id] ?? false;
        }
    });
}

// ===========================================================================
// Public API
// ===========================================================================

export class HSHeaterOptimizer {

    static runExperiment(
      input: HeaterOptimizerInput,
      config: HeaterCubeExperimentConfig = {},
    ): { result: HeaterOptimizationResult; diagnostics: HeaterCubeExperimentDiagnostics } {
      const previousConfig = cubeExperimentConfig
      const previousDiagnostics = cubeExperimentDiagnostics
      const startedAt = experimentNow()
      const diagnostics: HeaterCubeExperimentDiagnostics = {
        stages: [],
        chainTiers: [],
        searchPartitions: [],
        elapsedMs: 0,
      }
      cubeExperimentConfig = config
      cubeExperimentDiagnostics = diagnostics
      try {
        const result = this.createHeaterOptimizerResultFromInput(input)
        diagnostics.elapsedMs = experimentNow() - startedAt
        return { result, diagnostics }
      } finally {
        cubeExperimentConfig = previousConfig
        cubeExperimentDiagnostics = previousDiagnostics
      }
    }

    static runCubeExperiment(
      input: HeaterOptimizerInput,
      config: HeaterCubeExperimentConfig = {},
    ): { result: HeaterOptimizationResult; diagnostics: HeaterCubeExperimentDiagnostics } {
      const cubeInput: HeaterOptimizerInput = {
        ...input,
        heaterOptions: Object.fromEntries(
          Object.keys(input.heaterOptions).map(branch => [branch, branch === "cubes"]),
        ) as HeaterOptimizerInput["heaterOptions"],
      }
      return this.runExperiment(cubeInput, config)
    }

    static createHeaterOptimizerResultFromInput(input: HeaterOptimizerInput): HeaterOptimizationResult {

        if (!Number.isFinite(input.blueBarRequirementBeforeRounding)
            || input.blueBarRequirementBeforeRounding <= 0) {
            throw new Error('Blue bar pre-round requirement is missing; re-export current game data for Heater.');
        }

        const nanFields = findNaNInputFields(input);
        if (nanFields.length > 0)
            throw new Error(`Heater input is not a number: ${nanFields.join(', ')}. Re-export current game data for Heater.`);

        // Populate stats + options from input
        fillStatsAndOptionsFromInput(input);

        if (cubeExperimentDiagnostics) {
            const empty = new Loadout();
            const noLeoLuck = input.luckBaseNoAmb * (1 + applyHeaterBells(input).luckMult);
            const purpleLeoLuck = stats.blueberries >= 5
                ? stats.blueberries * stats.purpleLeoLevel * (1 + empty.getStat('mLuck')) : 0;
            cubeExperimentDiagnostics.emptyLoadoutCheck = {
                additiveLuckWithoutPurpleLeo: empty.luck / (1 + empty.getStat('mLuck'))
                    - (stats.blueberries >= 5 ? stats.blueberries * stats.purpleLeoLevel : 0),
                additiveLuckMultiplier: 1 + empty.getStat('mLuck'),
                luckWithoutPurpleLeo: empty.luck - purpleLeoLuck,
                redLuckWithoutPurpleLeo: empty.getStat('rLuck')
                    - Math.floor((empty.luck - 100) / input.luckConversion)
                    + Math.floor((noLeoLuck - 100) / input.luckConversion),
                luckConversion: Upgrade.luckConversion(empty.effectiveLevel('ambrosiaFreeRedLuckUpgrades')),
                blueSpeedMultiplier: empty.getStat('speed'),
                redSpeedMultiplier: empty.getStat('rSpeed'),
            };
            if (cubeExperimentConfig?.probeLoadoutLevels) {
                const saved = new Loadout();
                saved.upgradeLevels = { ...cubeExperimentConfig.probeLoadoutLevels };
                cubeExperimentDiagnostics.savedLoadoutCheck = {
                    blueBarPointsPerSecond: stats.ambSpeed * saved.getStat('speed'),
                    redBarPointsPerSecond: stats.redBarPointsPerSecond * saved.getStat('rSpeed'),
                    blueLuck: saved.luck,
                    redLuck: saved.getStat('rLuck'),
                    luckConversion: Upgrade.luckConversion(saved.effectiveLevel('ambrosiaFreeRedLuckUpgrades')),
                };
            }
        }

        HSLogger.debug(() => `[HeaterDiag] options=${JSON.stringify(options)}`, 'HSHeaterOptimizer');

        // Build maxLoadout (used by generateOutput to detect if a loadout is
        // maxed, most rows through withBestBrickOfLead)
        let maxLoadout = new Loadout();
        for (let upgrade in upgrades)
            maxLoadout.upgradeLevels[upgrade] = upgrades[upgrade].maxLevel;

        // Compute
        let output: HeaterOptimizationResult = { input };
        let redAmbUpgradeEffects: HeaterRedAmbUpgradeEffects = {};
        let tableCache: Record<string, Loadout[]> = {};
        const maxAmbForOct = options.calculateAmbOct ? fullAllAmbLoadout() : undefined;
        if (maxAmbForOct && (stats.amb < maxAmbForOct.cost
          || stats.blueberries < maxAmbForOct.blueberryCost)) {
            options.calculateAmbOct = false;
            // Needs the full All Ambrosia base: out of reach, there is no
            // loadout to hand out (an empty one would wipe the player's slot).
            output.ambOct = [unaffordableRow(maxAmbForOct)];
        }

        try {

          if (options.calculateCoinsC15) {
              if (!coinsC15Evaluator) {
                  HSLogger.warn('Coins in C15 skipped: export fresh game data.');
              } else {
                  const coinMaximum = new Loadout(maxLoadout);
                  coinMaximum.upgradeLevels.ambrosiaBrickOfLead = 0;
                  const coinWinner = findCoinsC15Opt();
                  const row = coinWinner.generateOutput('coinsC15', coinMaximum);
                  row[8] = 'Coin income multiplier at the tax cap, compared with no purchased Ambrosia modules. Existing resources and upgrades are held fixed.';
                  output.coinsC15 = [row];
              }
              if (!Object.entries(options).some(([key, enabled]) => key !== 'calculateCoinsC15' && enabled))
                  return output;
          }

          HSLogger.debug(() => '[HeaterDiag] Building shared luck tables', 'HSHeaterOptimizer');
          // --- Shared luck tables ---
          const ambLuckTablesStartedAt = experimentNow()
          tableCache.tableLuck1      = generateTable(["ambrosiaFreeLuckUpgrades", "ambrosiaLuck3"], "luck");
          tableCache.tableLuckHybrid = generateTable(["ambrosiaQuarkLuck1", "ambrosiaCubeLuck1"], "luck");
          tableCache.tableLuck4      = generateTable(["ambrosiaLuck4"], "mLuck");

          // Purple Honey needs reactor routing and Purple data, and Bar
          // Dependence turns extractions into bar fills instead of Honey.
          const calculatePurple = options.calculatePurple && stats.reactor !== undefined
            && stats.purple !== undefined && !stats.reactor.barDependenceEnabled;
          if (options.calculatePurple && !calculatePurple)
            HSLogger.warn('Purple loadouts skipped: they need a fresh game-data export with Purple Reactor data, outside Bar Dependence.');
          const calculateBarIncomeSeeds = options.calculateAmb || calculatePurple;

          if (calculateBarIncomeSeeds) {
              let tableLuck = generateDependentChainTable(["ambrosiaLuck1", "ambrosiaLuck2"], "luck");
              tableLuck = mergeTables(tableLuck, tableCache.tableLuck1, "luck");
              tableCache.tableLuckAdd = mergeTables(tableLuck, tableCache.tableLuckHybrid, "luck");
          }

          // Keep voucher levels out of the main luck frontier: they are a
          // deliberately last-priority source of luck, but still need to be
          // considered after the best direct luck loadout is found.
          if (calculateBarIncomeSeeds)
              // Keep every distinct voucher count: cube value is not a safe
              // proxy for Luck, Offering, or another build's voucher benefit.
              tableCache.tableVoucher = generateVoucherTable("vouchers");
          recordCubeExperimentStage("amb-shared-luck-tables", ambLuckTablesStartedAt, {
            luck1: tableCache.tableLuck1.length,
            luckHybrid: tableCache.tableLuckHybrid.length,
            luck4: tableCache.tableLuck4.length,
            luckAdd: tableCache.tableLuckAdd?.length ?? 0,
          })

          const barIncomeHighBudget = calculateBarIncomeSeeds && stats.reactor
            ? findAffordableFullLevelBarIncomeOpts() : null;
          if (barIncomeHighBudget && tableCache.tableVoucher) {
            for (const stat of BAR_INCOME_STATS)
              barIncomeHighBudget[stat] = addLastPriorityVouchers(
                barIncomeHighBudget[stat], tableCache.tableVoucher, stat,
              );
          }

          const optimizeLuckWithVouchers = (table1: Loadout[], table2: Loadout[]): Loadout => {
              const base = findOpt(table1, table2, "luck");
              const withVouchers = tableCache.tableVoucher === undefined
                ? base
                : addLastPriorityVouchers(base, tableCache.tableVoucher, "luck");
              return fillSelectedLuckModules(withVouchers, "luck")
          };
          const optimizeBarIncomeWithVouchers = (seed: Loadout, stat: BarIncomeStat): Loadout => {
              const improved = improveBarIncomeLoadout(seed, stat);
              const withVouchers = tableCache.tableVoucher
                ? addLastPriorityVouchers(improved, tableCache.tableVoucher, stat) : improved;
              return fillSelectedLuckModules(withVouchers, stat);
          };

          let luckLuck = 0;
          if (options.calculateAmb) { // Luck calculation
              const ambLuckStartedAt = experimentNow()
              HSLogger.debug(() => '[HeaterDiag] calculateAmb: luck', 'HSHeaterOptimizer');
              let loadoutLuck = barIncomeHighBudget?.incomeBlue
                ?? (stats.reactor
                  ? optimizeBarIncomeWithVouchers(
                    findOpt(tableCache.tableLuckAdd, tableCache.tableLuck4, 'luck'), 'incomeBlue',
                  )
                  : optimizeLuckWithVouchers(tableCache.tableLuckAdd, tableCache.tableLuck4));
              if (!loadoutLuck) HSLogger.error('[HeaterDiag] calculateAmb: luck - findOpt returned undefined', 'HSHeaterOptimizer');
              let maxAmbLoadout = new Loadout(maxLoadout);
              maxAmbLoadout.upgradeLevels.ambrosiaBrickOfLead = 0;
              const blueOutput = loadoutLuck.generateOutput(
                stats.reactor ? 'incomeBlue' : 'luck', maxAmbLoadout,
              );
              if (stats.reactor) blueOutput[6] = Boolean(barIncomeHighBudget);
              output.luck = [blueOutput];
              luckLuck = loadoutLuck.luck;
              recordCubeExperimentStage("amb-luck", ambLuckStartedAt)
          }

          let rLuckRLuck = 0;
          const redLuckStartedAt = experimentNow()
          if (options.calculateAmb) { // Red Luck calculation
              HSLogger.debug(() => '[HeaterDiag] calculateAmb: rLuck', 'HSHeaterOptimizer');
              let tableLuckMult         = generateTable(["ambrosiaBrickOfLead", "ambrosiaLuck4"], "mLuck");
              tableCache.tableFreeRLuck = generateTable(["ambrosiaFreeRedLuckUpgrades"], "rLuck");
              tableCache.tableLuckR     = mergeTables(tableLuckMult, tableCache.tableLuckAdd, "rLuck");
              let loadoutRLuck          = barIncomeHighBudget?.incomeRed
                ?? findOpt(tableCache.tableLuckR, tableCache.tableFreeRLuck, "rLuck");
              // Vouchers affect Red Luck indirectly through Jack of all
              // Trades (and only when a luck-producing module is active), so
              // apply them after the direct Red Luck optimum has been found.
              // This keeps their tiny contribution from distorting the main
              // luck/resource search while still allowing the final levels.
              if (!barIncomeHighBudget)
                loadoutRLuck = stats.reactor
                  ? optimizeBarIncomeWithVouchers(loadoutRLuck, 'incomeRed')
                  : fillSelectedLuckModules(
                    addLastPriorityVouchers(loadoutRLuck, tableCache.tableVoucher, "rLuck"), "rLuck",
                  )
              if (!loadoutRLuck) HSLogger.error('[HeaterDiag] calculateAmb: rLuck - findOpt returned undefined', 'HSHeaterOptimizer');
              const redStat = stats.reactor ? 'incomeRed' : 'rLuck';
              const redOutput = loadoutRLuck.generateOutput(
                redStat, withBestBrickOfLead(maxLoadout, redStat),
              );
              if (stats.reactor) redOutput[6] = Boolean(barIncomeHighBudget);
              output.rLuck = [redOutput];

              rLuckRLuck = loadoutRLuck.getStat("rLuck");
              let baseLoadout = new Loadout();
              let rLuckEffectRatio = rLuckRLuck / baseLoadout.getStat("rLuck");
              output.redAmbCommonValues = {
                  luck: loadoutRLuck.luck,
                  mLuck: loadoutRLuck.getStat("mLuck"),
                  luckConversion: Upgrade.luckConversion(loadoutRLuck.effectiveLevel("ambrosiaFreeRedLuckUpgrades")),
                  totalRedLuck: applyHeaterBells(input).redLuck * rLuckEffectRatio,
                  rLuckEffectRatio,
              };
          }

          if (options.calculateAmb) { // Luck calculation - Red Amb Upgrades

              const fusion = stats.fusion * rLuckRLuck * stats.baseRLuck / 100;
              const fusionGain = (multiplier: number) => (1 + fusion * multiplier) / (1 + fusion);

              if (stats.redberries < redUpgrades.blueberries.maxLevel) {
                  stats.blueberries++;
                  let rNext = findOpt(tableCache.tableLuckR, tableCache.tableFreeRLuck, "rLuck");
                  let rEffect = rNext.getStat("rLuck") / rLuckRLuck;
                  let bNext = optimizeLuckWithVouchers(tableCache.tableLuckAdd, tableCache.tableLuck4);
                  let bEffect = bNext.luck / luckLuck * fusionGain(rEffect);
                  redAmbUpgradeEffects.blueberries = { rEffect, bEffect };
                  stats.blueberries--;
              }

              if (stats.bonus[1] < 5) {
                  stats.bonus[1]++;
                  let rNext = findOpt(tableCache.tableLuckR, tableCache.tableFreeRLuck, "rLuck");
                  let rEffect = rNext.getStat("rLuck") / rLuckRLuck;
                  let bNext = optimizeLuckWithVouchers(tableCache.tableLuckAdd, tableCache.tableLuck4);
                  let bEffect = bNext.luck / luckLuck * fusionGain(rEffect);
                  redAmbUpgradeEffects.freeLevelsRow2 = { rEffect, bEffect };
                  stats.bonus[1]--;
              }

              if (stats.bonus[2] < 5) {
                  stats.bonus[2]++;
                  let rNext = findOpt(tableCache.tableLuckR, tableCache.tableFreeRLuck, "rLuck");
                  let rEffect = rNext.getStat("rLuck") / rLuckRLuck;
                  let bNext = optimizeLuckWithVouchers(tableCache.tableLuckAdd, tableCache.tableLuck4);
                  let bEffect = bNext.luck / luckLuck * fusionGain(rEffect);
                  redAmbUpgradeEffects.freeLevelsRow3 = { rEffect, bEffect };
                  stats.bonus[2]--;
              }

              if (stats.bonus[3] < 5) {
                  stats.bonus[3]++;
                  let rNext = findOpt(tableCache.tableLuckR, tableCache.tableFreeRLuck, "rLuck");
                  let rEffect = rNext.getStat("rLuck") / rLuckRLuck;
                  let bNext = optimizeLuckWithVouchers(tableCache.tableLuckAdd, tableCache.tableLuck4);
                  let bEffect = bNext.luck / luckLuck * fusionGain(rEffect);
                  redAmbUpgradeEffects.freeLevelsRow4 = { rEffect, bEffect };
                  stats.bonus[3]--;
              }

              if (stats.bonus[4] < 5) {
                  stats.bonus[4]++;
                  let rNext = findOpt(tableCache.tableLuckR, tableCache.tableFreeRLuck, "rLuck");
                  let rEffect = rNext.getStat("rLuck") / rLuckRLuck;
                  let bNext = optimizeLuckWithVouchers(tableCache.tableLuckAdd, tableCache.tableLuck4);
                  let bEffect = bNext.luck / luckLuck * fusionGain(rEffect);
                  redAmbUpgradeEffects.freeLevelsRow5 = { rEffect, bEffect };
                  stats.bonus[4]--;
              }

              if (!stats.viscount) {
                  stats.baseLuck += 125;
                  stats.baseRLuck += 25;
                  let rNext = findOpt(tableCache.tableLuckR, tableCache.tableFreeRLuck, "rLuck");
                  let rEffect = rNext.getStat("rLuck") / rLuckRLuck;
                  let bNext = optimizeLuckWithVouchers(tableCache.tableLuckAdd, tableCache.tableLuck4);
                  let bEffect = bNext.luck / luckLuck * fusionGain(rEffect);
                  redAmbUpgradeEffects.viscount = { rEffect, bEffect };
                  stats.baseLuck -= 125;
                  stats.baseRLuck -= 25;
              }
              recordCubeExperimentStage("amb-red-luck-and-effects", redLuckStartedAt)
          }

          let loadoutAllAmb: Loadout | undefined;
          let optLoadoutAllAmb: Loadout | undefined;
          if (options.calculateAmb && barIncomeHighBudget) {
              loadoutAllAmb = barIncomeHighBudget.incomeAll;
              const allOutput = loadoutAllAmb.generateOutput('incomeAll', loadoutAllAmb);
              allOutput[6] = true;
              output.allAmb = [allOutput];
          }
          if (options.calculateAmb && !barIncomeHighBudget) { // All Amb calculation
              const allAmbStartedAt = experimentNow()
              HSLogger.debug(() => '[HeaterDiag] calculateAmb: allAmb', 'HSHeaterOptimizer');
              let allAmbSubstageStartedAt = experimentNow()
              let tableSpeed  = generateTable(["ambrosiaFreeGenerationUpgrades"], "amb");
              let tableAmb    = mergeTables(tableCache.tableLuck4, tableSpeed, "amb");
              let tableRLuck2 = generateTable(["ambrosiaFreeRedLuckUpgrades"], "rAmb");
              let tableRAmb   = mergeTables(tableAmb, tableRLuck2, "rAmb");
              if (cubeExperimentConfig?.probeBarIncome || cubeExperimentConfig?.probeRawBarIncome) {
                const rawStartedAt = experimentNow()
                let rawRightCount = 0
                let affordableRightCount = 0
                const rawRight: Loadout[] = []
                for (const multiplier of tableCache.tableLuck4) {
                  for (const generation of tableSpeed) {
                    const combined = Loadout.union(multiplier, generation)
                    for (const redLuck of tableRLuck2) {
                      const candidate = Loadout.union(combined, redLuck)
                      rawRightCount++
                      if (candidate.cost <= stats.amb && candidate.blueberryCost <= stats.blueberries) {
                        affordableRightCount++
                        if (cubeExperimentConfig?.probeRawBarIncome)
                          rawRight.push(candidate)
                      }
                    }
                  }
                }
                recordCubeExperimentStage('bar-income-untrimmed-right', rawStartedAt, {
                  rawRight: rawRightCount,
                  affordableRight: affordableRightCount,
                })
                if (cubeExperimentConfig?.probeRawBarIncome && stats.reactor) {
                  const scanStartedAt = experimentNow()
                  let candidates = 0
                  let feasible = 0
                  let bestBlue = 0
                  let bestRed = 0
                  let bestAll = 0
                  for (const left of tableCache.tableLuckAdd.slice(-100)) {
                    for (const right of rawRight) {
                      candidates++
                      const union = Loadout.union(left, right)
                      if (union.cost > stats.amb || union.blueberryCost > stats.blueberries)
                        continue
                      feasible++
                      bestBlue = Math.max(bestBlue, union.getStat('incomeBlue'))
                      bestRed = Math.max(bestRed, union.getStat('incomeRed'))
                      bestAll = Math.max(bestAll, union.getStat('incomeAll'))
                    }
                  }
                  recordCubeExperimentStage('bar-income-raw-scan-100', scanStartedAt, {
                    candidates, feasible,
                    bestBlue, bestRed, bestAll,
                  })
                }
              }
              recordCubeExperimentStage("all-amb-components", allAmbSubstageStartedAt, {
                amb: tableAmb.length,
                redAmb: tableRAmb.length,
              })
              allAmbSubstageStartedAt = experimentNow()
              tableCache.tableAllAmb = cubeExperimentConfig?.useLegacyAllAmbMerge
                ? mergeTables(tableCache.tableLuckAdd, tableRAmb, "allAmb")
                : mergeAllAmbTables(tableCache.tableLuckAdd, tableRAmb)
              recordCubeExperimentStage("all-amb-luck-merge", allAmbSubstageStartedAt, {
                luck: tableCache.tableLuckAdd.length,
                frontier: tableCache.tableAllAmb.length,
              })
              allAmbSubstageStartedAt = experimentNow()
              tableCache.tableAllAmb = mergeTables(tableCache.tableAllAmb, generateTable(["twoMind"], "allAmb"), "allAmb");
              recordCubeExperimentStage("all-amb-two-mind", allAmbSubstageStartedAt, {
                frontier: tableCache.tableAllAmb.length,
              })
              allAmbSubstageStartedAt = experimentNow()
              let tableBrickOfLead = generateTable(["ambrosiaBrickOfLead"], "mLuck");
              if (cubeExperimentConfig?.probeBarIncome && stats.reactor && cubeExperimentDiagnostics) {
                const probeStartedAt = experimentNow()
                const best: Partial<NonNullable<HeaterCubeExperimentDiagnostics['barIncomeProbe']>> = {}
                for (const left of tableCache.tableAllAmb) {
                  for (const right of tableBrickOfLead) {
                    const candidate = Loadout.union(left, right)
                    if (candidate.cost > stats.amb || candidate.blueberryCost > stats.blueberries)
                      continue
                    for (const [name, stat] of [
                      ['blue', 'incomeBlue'], ['red', 'incomeRed'], ['all', 'incomeAll'],
                    ] as const) {
                      const value = candidate.getStat(stat)
                      if (value > (best[name]?.value ?? -Infinity)) {
                        best[name] = {
                          levels: { ...candidate.upgradeLevels },
                          cost: candidate.cost,
                          blueberryCost: candidate.blueberryCost,
                          value,
                        }
                      }
                    }
                  }
                }
                cubeExperimentDiagnostics.barIncomeProbe = best as NonNullable<HeaterCubeExperimentDiagnostics['barIncomeProbe']>
                recordCubeExperimentStage('bar-income-probe', probeStartedAt, {
                  candidates: tableCache.tableAllAmb.length * tableBrickOfLead.length,
                })
              }
              const legacyAllAmb = findOpt(tableCache.tableAllAmb, tableBrickOfLead, "allAmb");
              loadoutAllAmb = legacyAllAmb;
              // Vouchers have secondary Jack/Panthema effects; add them after
              // the primary bar-and-luck allocation, as requested.
              loadoutAllAmb = stats.reactor
                ? optimizeBarIncomeWithVouchers(loadoutAllAmb, 'incomeAll')
                : fillSelectedLuckModules(
                  addLastPriorityVouchers(loadoutAllAmb, tableCache.tableVoucher, "allAmb"), "allAmb",
                )
              optLoadoutAllAmb = fullAllAmbLoadout();
              recordCubeExperimentStage("all-amb-final-search", allAmbSubstageStartedAt, {
                frontier: tableCache.tableAllAmb.length,
                brick: tableBrickOfLead.length,
              })
              if (!loadoutAllAmb || !optLoadoutAllAmb) HSLogger.error('[HeaterDiag] allAmb - findOpt returned undefined', 'HSHeaterOptimizer');
              if (options.calculateAmb) {
                  const allOutput = loadoutAllAmb.generateOutput(
                    stats.reactor ? 'incomeAll' : 'allAmb', optLoadoutAllAmb,
                  );
                  if (stats.reactor) allOutput[6] = Boolean(barIncomeHighBudget);
                  output.allAmb = [allOutput];
              }
              recordCubeExperimentStage("all-amb", allAmbStartedAt, {
                frontier: tableCache.tableAllAmb.length,
              })
          }

          if (calculatePurple) { // Purple Honey and Purple Ambrosia calculation
              const purpleStartedAt = experimentNow()
              HSLogger.debug(() => '[HeaterDiag] calculatePurple', 'HSHeaterOptimizer');
              // Purple income depends only on bar speeds, fills and Red
              // income, all of which the bar-income search modules cover.
              // Start from the luck optimum (and the All Ambrosia result
              // when available); improveBarIncomeLoadout also restarts from
              // an empty loadout, so a low-luck build is still reachable.
              const luckSeed = barIncomeHighBudget
                ? undefined : findOpt(tableCache.tableLuckAdd, tableCache.tableLuck4, 'luck')
              const optimizePurple = (stat: PurpleIncomeStat, extraSeed?: Loadout): Loadout => {
                  if (barIncomeHighBudget)
                      return barIncomeHighBudget[stat]
                  let best: Loadout | undefined
                  for (const seed of [luckSeed, loadoutAllAmb, extraSeed]) {
                      if (seed === undefined) continue
                      const candidate = optimizeBarIncomeWithVouchers(seed, stat)
                      if (best === undefined || candidate.getStat(stat) > best.getStat(stat)
                        || (candidate.getStat(stat) === best.getStat(stat) && candidate.cost < best.cost))
                          best = candidate
                  }
                  return best!
              }
              const maxPurpleLoadout = fullAllAmbLoadout()
              const purpleOutput = (loadout: Loadout, stat: PurpleIncomeStat): HeaterResultRow => {
                  const row = loadout.generateOutput(stat, barIncomeHighBudget ? loadout : maxPurpleLoadout)
                  if (barIncomeHighBudget) row[6] = true
                  return row
              }

              const currentRouting: ReactorRouting = {
                  blueRoutingPercent: stats.reactor!.blueRoutingPercent,
                  redRoutingPercent: stats.reactor!.redRoutingPercent,
              }
              const purpleRouting: NonNullable<HeaterOptimizationResult['purpleRouting']> = {}

              const loadoutHoney = optimizePurple('incomeHoney')
              output.purpleHoney = [purpleOutput(loadoutHoney, 'incomeHoney')]
              purpleRouting.purpleHoney = { ...currentRouting, perHour: loadoutHoney.getStat('incomeHoney') * 3_600 }
              const loadoutPurpleAmb = optimizePurple('incomePurpleAmb', loadoutHoney)
              output.purpleAmb = [purpleOutput(loadoutPurpleAmb, 'incomePurpleAmb')]
              purpleRouting.purpleAmb = { ...currentRouting, perHour: loadoutPurpleAmb.getStat('incomePurpleAmb') * 3_600 }

              // Best routing: alternate between the best routing for the
              // loadout and the best loadout at that routing. Neither step
              // can lower the objective, so this never ends below the
              // current-routing row; stop once the routing settles.
              const optimizeWithRouting = (seed: Loadout, stat: PurpleIncomeStat) => {
                  let loadout = seed
                  let routing = currentRouting
                  for (let round = 0; round < 4; round++) {
                      const next = findBestReactorRouting(loadout, stat)
                      if (next.blueRoutingPercent === routing.blueRoutingPercent
                          && next.redRoutingPercent === routing.redRoutingPercent)
                          break
                      routing = next
                      const base = loadout
                      loadout = withReactorRouting(routing, () => optimizeBarIncomeWithVouchers(new Loadout(base), stat))
                  }
                  return { loadout, routing }
              }
              // The Effect column stays relative to an empty loadout at the
              // *current* routing, so routing gains show up in it and the
              // best-routing rows compare directly with the rows above.
              const emptyLoadout = new Loadout()
              const routedOutput = (
                  key: 'purpleHoneyOpt' | 'purpleAmbOpt', seed: Loadout, stat: PurpleIncomeStat, currentPerHour: number,
              ): HeaterResultRow => {
                  const { loadout, routing } = optimizeWithRouting(seed, stat)
                  const { row, value } = withReactorRouting(routing, () => ({
                      row: loadout.generateOutput(stat, new Loadout(maxPurpleLoadout)),
                      value: loadout.getStat(stat),
                  }))
                  // Every bar-income module is affordable at full level: more
                  // Ambrosia can't help, whatever search found the loadout.
                  if (barIncomeHighBudget) row[6] = true
                  const base = emptyLoadout.getStat(stat)
                  if (row[0] !== 'Unaffordable')
                      (row as HeaterResultAffordableRow)[4] = base === 0 ? 'N / A' : formatNumber(value / base)
                  purpleRouting[key] = { ...routing, perHour: value * 3_600, currentRoutingPerHour: currentPerHour }
                  return row
              }
              output.purpleHoneyOpt = [routedOutput('purpleHoneyOpt', loadoutHoney, 'incomeHoney', purpleRouting.purpleHoney.perHour)]
              output.purpleAmbOpt = [routedOutput('purpleAmbOpt', loadoutPurpleAmb, 'incomePurpleAmb', purpleRouting.purpleAmb.perHour)]
              output.purpleRouting = purpleRouting
              recordCubeExperimentStage("purple", purpleStartedAt)
          }

          // --- Shared luck/rune/voucher tables for cube-class calculations ---
          if (
              options.calculateQuarks || options.calculateCubes || options.calculateOct || options.calculateSR ||
              options.calculateHyperflux || options.calculateOff || options.calculateObtAndOff
          ) {
              const sharedLuckStartedAt = experimentNow()
              let luckMinLevel: Record<string, number> = { ambrosiaLuck1: 20 }; // This is necessary for correct local optima
              let tableLuck1  = generateDependentChainTable(["ambrosiaLuck1", "ambrosiaLuck2"], "luck", luckMinLevel);
              let tableLuck2  = mergeTables(tableLuck1, tableCache.tableLuck1, "luck");
              tableCache.tableLuckAdd1 = mergeTables(tableLuck2, tableCache.tableLuckHybrid, "luck");
              let tableLuckMult = generateTable(["ambrosiaBrickOfLead", "ambrosiaLuck4"], "mLuck");
              tableCache.tableLuck = mergeTables(tableCache.tableLuckAdd1, tableLuckMult, "luck");
              // Local optima for cubes match local optima for quarks
              tableCache.tableRune = generateDependentChainTable(["ambrosiaTalismanBonusRuneLevel", "ambrosiaRuneOOMBonus"], "cube");
              recordCubeExperimentStage("shared-luck-rune", sharedLuckStartedAt, {
                luck: tableCache.tableLuck.length,
                rune: tableCache.tableRune.length,
              })
          }

          if (options.calculateQuarks || options.calculateCubes || options.calculateOct || options.calculateSR ||
            options.calculateHyperflux || options.calculateOff || options.calculateObtAndOff || options.calculateAmbOct) {
              // Local optima for cubes match local optima for quarks and octeracts
              if (tableCache.tableVoucher === undefined)
                tableCache.tableVoucher = generateVoucherTable("vouchers");
          }

          // --- calculateQuarks ---
          if (options.calculateQuarks) { // Calculate Quarks
              const quarksStartedAt = experimentNow()
              HSLogger.debug(() => '[HeaterDiag] calculateQuarks', 'HSHeaterOptimizer');
              // Keep the new Exalt-9 tier separate while generating tables.
              // Enumerating it together with Quarks 1–3 multiplies the
              // recursive search by 100 levels before the Pareto trim can
              // remove anything.  Merging the independently-priced tier is
              // exact because Quarks 4 only depends on the completed Quarks
              // 3 chain and has no feedback into those effects.
              let quarkSubstageStartedAt = experimentNow()
              let tableQuark1   = generateDependentChainTable(["ambrosiaQuarks1", "ambrosiaQuarks2", "ambrosiaQuarks3"], "quark");
              tableQuark1 = mergeTables(tableQuark1, generateTable(["ambrosiaQuarks4"], "quark"), "quark");
              recordCubeExperimentStage("quarks-chain", quarkSubstageStartedAt, { frontier: tableQuark1.length })
              quarkSubstageStartedAt = experimentNow()
              let tableQuark2   = generateTable(["ambrosiaCubeQuark1", "ambrosiaFreeQuarkUpgrades"], "quark");
              let tableQuark3   = mergeTables(tableQuark1, tableQuark2, "quark");
              recordCubeExperimentStage("quarks-extra", quarkSubstageStartedAt, { frontier: tableQuark3.length })
              quarkSubstageStartedAt = experimentNow()
              let tableQuarkR   = mergeIndependentTables(tableQuark3, tableCache.tableRune, "quark");
              recordCubeExperimentStage("quarks-rune", quarkSubstageStartedAt, { frontier: tableQuarkR.length })
              quarkSubstageStartedAt = experimentNow()
              let tableLuckQuark1 = generateTable(["ambrosiaLuckQuark1"], "quark");
              let tableLuckQuark  = mergeTables(tableCache.tableLuck, tableLuckQuark1, "quark");
              recordCubeExperimentStage("quarks-luck", quarkSubstageStartedAt, { frontier: tableLuckQuark.length })
              quarkSubstageStartedAt = experimentNow()
              let loadoutQuark  = cubeExperimentConfig?.useLegacyQuarkSearch
                ? findOpt(tableQuarkR, tableLuckQuark, "quark")
                : findQuarkLuckOpt(tableQuarkR, tableLuckQuark)
              // Vouchers are a weak quark source, so add them only after the
              // direct quark/luck optimum has been selected.
              loadoutQuark = findOpt([loadoutQuark], tableCache.tableVoucher, "quark");
              recordCubeExperimentStage("quarks-final-search", quarkSubstageStartedAt, {
                left: tableQuarkR.length,
                right: tableLuckQuark.length,
              })
              if (!loadoutQuark) HSLogger.error('[HeaterDiag] calculateQuarks - findOpt returned undefined', 'HSHeaterOptimizer');
              output.quarks = [loadoutQuark.generateOutput("quark", withBestBrickOfLead(maxLoadout, "quark"))];
              recordCubeExperimentStage("quarks", quarksStartedAt, {
                rune: tableCache.tableRune.length,
                luck: tableCache.tableLuck.length,
              })
          }

          // --- Shared cube tables (cubes / oct / ambOct / hyperflux) ---
          if (options.calculateCubes || options.calculateOct || options.calculateSR || options.calculateAmbOct || options.calculateHyperflux) {
            const cubeChainStartedAt = experimentNow()
            // As with Quarks 4, generate Cubes 4 separately.  This preserves
            // the exact Pareto frontier while avoiding a 50x expansion of
            // the recursive Cubes 1–3 table.
            let tableCube1 = generateDependentChainTable(["ambrosiaCubes1", "ambrosiaCubes2", "ambrosiaCubes3"], "cube")
            tableCube1 = mergeTables(tableCube1, generateTable(["ambrosiaCubes4"], "cube"), "cube")
            const tableFreeCube = generateTable(["ambrosiaFreeCubeUpgrades"], "cube")
            let tableQuarkCube = generateTable(["ambrosiaQuarkCube1"], "cube")
            tableCache.tableCube = mergeTables(mergeTables(tableCube1, tableFreeCube, "cube"), tableQuarkCube, "cube")
            recordCubeExperimentStage("cube-chain", cubeChainStartedAt, {
              cubes1To4: tableCube1.length,
              cube: tableCache.tableCube.length,
            })
            // SynergismOfficial/src/Statistics.ts: Cube-group shop levels
            // affect Octeracts through extra tier-specific multipliers, so
            // their local maxima must be searched against the Oct objective.
            if (options.calculateOct || options.calculateAmbOct) {
              // Cubes I-IV have identical variable effects, so their frontier
              // can be reused. Recompute Oct scores: the Cube score also
              // contains fixed rune/shop factors that do not apply to Oct.
              const tableOctCube1 = tableCube1.map(loadout => new Loadout(loadout))
              const tableOctFreeCube = generateTable(["ambrosiaFreeCubeUpgrades"], "oct")
              const tableOctQuarkCube = generateTable(["ambrosiaQuarkCube1"], "oct")
              tableCache.tableOctCube = mergeTables(mergeTables(tableOctCube1, tableOctFreeCube, "oct"), tableOctQuarkCube, "oct")
            }
          }

          if (options.calculateCubes || options.calculateSR || options.calculateHyperflux) {
            const cubeRuneStartedAt = experimentNow()
            tableCache.tableCubeR = mergeIndependentTables(tableCache.tableCube, tableCache.tableRune, "cube")
            recordCubeExperimentStage("cube-rune", cubeRuneStartedAt, { cubeRune: tableCache.tableCubeR.length })
          }

          if (options.calculateCubes || options.calculateOct || options.calculateSR || options.calculateHyperflux) {
            let tableLuckMult = generateTable(["ambrosiaLuck4"], "mLuck")
            let tableLuck = mergeTables(tableCache.tableLuckAdd1, tableLuckMult, "luck")
            if (options.calculateCubes || options.calculateSR || options.calculateHyperflux) {
              let tableBrick = generateTable(["ambrosiaLuckCube1", "ambrosiaBrickOfLead"], "cube")
              const luckSpendFraction = cubeExperimentConfig?.maxLuckSpendFraction
              if (luckSpendFraction !== undefined && Number.isFinite(luckSpendFraction)) {
                const maximumLuckSpend = Math.max(0, luckSpendFraction) * stats.amb
                tableLuck = tableLuck.filter(loadout => cubeExperimentLuckSpend(loadout) <= maximumLuckSpend)
                tableBrick = tableBrick.filter(loadout => cubeExperimentLuckSpend(loadout) <= maximumLuckSpend)
              }
              const luckCubeStartedAt = experimentNow()
              tableCache.tableLuckCube = mergeLuckCubeTable(tableLuck, tableBrick, "cube")
              if (luckSpendFraction !== undefined && Number.isFinite(luckSpendFraction)) {
                const maximumLuckSpend = Math.max(0, luckSpendFraction) * stats.amb
                tableCache.tableLuckCube = tableCache.tableLuckCube.filter(
                  loadout => cubeExperimentLuckSpend(loadout) <= maximumLuckSpend,
                )
                if (tableCache.tableLuckCube.length === 0)
                  tableCache.tableLuckCube = [new Loadout()]
              }
              recordCubeExperimentStage("luck-cube", luckCubeStartedAt, {
                luck: tableLuck.length,
                brick: tableBrick.length,
                luckCube: tableCache.tableLuckCube.length,
              })
            }
            if (options.calculateOct) {
              const luckOctStartedAt = experimentNow()
              let tableBrick = generateTable(["ambrosiaLuckCube1", "ambrosiaBrickOfLead"], "oct")
              tableCache.tableLuckOct = mergeLuckCubeTable(tableLuck, tableBrick, "oct")
              recordCubeExperimentStage("luck-oct", luckOctStartedAt, {
                luck: tableLuck.length,
                brick: tableBrick.length,
                luckOct: tableCache.tableLuckOct.length,
              })
            }
          }

          // --- calculateCubes ---
          if (options.calculateCubes || options.calculateSR) {
              const cubeVoucherStartedAt = experimentNow()
              const tableCubeV = tableCache.tableCubeR;
              let tableCubeH     = generateTable(["ambrosiaHyperflux"], "cube");
              // At high Ambrosia budgets Hyperflux 7 is cheap enough that the
              // intermediate levels only create a large cross-product without
              // changing the selected Cube build. Benchmarks from 50M through
              // 150M Ambrosia selected the identical H7 loadout after this
              // reduction. Keep H0 as the alternative that saves 3 Blueberries.
              // The dedicated Hyperflux report below still evaluates H0-H7.
              if (upgrades.ambrosiaHyperflux.cost(upgrades.ambrosiaHyperflux.maxLevel) <= 0.05 * stats.amb) {
                tableCubeH = tableCubeH.filter(loadout => {
                  const level = loadout.upgradeLevels.ambrosiaHyperflux ?? 0
                  return level === 0 || level === upgrades.ambrosiaHyperflux.maxLevel
                })
              }
              tableCache.tableCubeTotal = mergeIndependentTables(tableCubeV, tableCubeH, "cube")
              // Preserve the whole Cube frontier while considering every
              // affordable voucher prefix. An intermediate prefix can leave
              // enough Ambrosia for a better Cube or Luck purchase later.
              tableCache.tableCubeVoucher = mergeVoucherTable(tableCache.tableCubeTotal, tableCache.tableVoucher, "cube")
              recordCubeExperimentStage("cube-hyperflux-voucher", cubeVoucherStartedAt, {
                cubeTotal: tableCache.tableCubeTotal.length,
                cubeVoucher: tableCache.tableCubeVoucher.length,
              })
              // These large intermediate frontiers are no longer needed by
              // the final Cube/SR search. Hyperflux is the only later branch
              // that still reads the pre-voucher Cube/Rune frontier.
              delete tableCache.tableCubeTotal
              if (!options.calculateHyperflux)
                delete tableCache.tableCubeR
          }

          if (options.calculateCubes) {
              HSLogger.debug(() => '[HeaterDiag] calculateCubes', 'HSHeaterOptimizer');
            const cubeSearchStartedAt = experimentNow()
            const loadoutCube = findCubeLuckOpt(tableCache.tableCubeVoucher, tableCache.tableLuckCube, "cube")
            recordCubeExperimentStage("cube-final-search", cubeSearchStartedAt, {
              cubeVoucher: tableCache.tableCubeVoucher.length,
              luckCube: tableCache.tableLuckCube.length,
            })
            if (!loadoutCube) HSLogger.error('[HeaterDiag] calculateCubes - findOpt returned undefined', 'HSHeaterOptimizer');
            if (cubeExperimentDiagnostics !== undefined) {
              cubeExperimentDiagnostics.cubeWinner = {
                levels: { ...loadoutCube.upgradeLevels },
                cost: loadoutCube.cost,
                blueberryCost: loadoutCube.blueberryCost,
                effect: loadoutCube.getStat("cube"),
                spending: cubeExperimentSpending(loadoutCube),
              }
            }
            output.cubes = [loadoutCube.generateOutput("cube", withBestBrickOfLead(maxLoadout, "cube"))];
          }

          // --- Shared oct table ---
          if (options.calculateOct || options.calculateAmbOct) {
              const octVoucherStartedAt = experimentNow()
              tableCache.tableOctV = mergeVoucherTable(tableCache.tableOctCube, tableCache.tableVoucher, "oct");
              recordCubeExperimentStage("oct-voucher", octVoucherStartedAt, { octVoucher: tableCache.tableOctV.length })
          }

          // --- calculateOct ---
          if (options.calculateOct) {
              const octStartedAt = experimentNow()
              HSLogger.debug(() => '[HeaterDiag] calculateOct', 'HSHeaterOptimizer');
              const loadoutOct = findCubeLuckOpt(tableCache.tableOctV, tableCache.tableLuckOct, "oct");
              if (!loadoutOct) HSLogger.error('[HeaterDiag] calculateOct - findOpt returned undefined', 'HSHeaterOptimizer');
              output.oct = [loadoutOct.generateOutput("oct", withBestBrickOfLead(maxLoadout, "oct"))];

              if (stats.ossifiedTactics < redUpgrades.regularLuck.maxLevel || stats.ossifiedTactics2 < redUpgrades.regularLuck2.maxLevel) {
                  stats.baseLuck += 2;
                  let loadoutNext = findCubeLuckOpt(tableCache.tableOctV, tableCache.tableLuckOct, "oct");
                  let effect = loadoutNext.getStat("oct") / loadoutOct.getStat("oct");
                  redAmbUpgradeEffects.ossifiedTactics = {
                      ...(redAmbUpgradeEffects.ossifiedTactics ?? {}),
                      octEffect: effect,
                  };
                  stats.baseLuck -= 2;
              }

              if (stats.redberries < redUpgrades.blueberries.maxLevel) {
                  stats.blueberries++;
                  let loadoutNext = findCubeLuckOpt(tableCache.tableOctV, tableCache.tableLuckOct, "oct");
                  let effect = loadoutNext.getStat("oct") / loadoutOct.getStat("oct");
                  redAmbUpgradeEffects.blueberries = {
                      ...(redAmbUpgradeEffects.blueberries ?? {}),
                      octEffect: effect,
                  };
                  stats.blueberries--;
              }

              if (stats.bonus[1] < 5) {
                  stats.bonus[1]++;
                  let loadoutNext = findCubeLuckOpt(tableCache.tableOctV, tableCache.tableLuckOct, "oct");
                  let effect = loadoutNext.getStat("oct") / loadoutOct.getStat("oct");
                  redAmbUpgradeEffects.freeLevelsRow2 = {
                      ...(redAmbUpgradeEffects.freeLevelsRow2 ?? {}),
                      octEffect: effect,
                  };
                  stats.bonus[1]--;
              }

              if (stats.bonus[2] < 5) {
                  stats.bonus[2]++;
                  let loadoutNext = findCubeLuckOpt(tableCache.tableOctV, tableCache.tableLuckOct, "oct");
                  let effect = loadoutNext.getStat("oct") / loadoutOct.getStat("oct");
                  redAmbUpgradeEffects.freeLevelsRow3 = {
                      ...(redAmbUpgradeEffects.freeLevelsRow3 ?? {}),
                      octEffect: effect,
                  };
                  stats.bonus[2]--;
              }

              if (stats.bonus[3] < 5) {
                  stats.bonus[3]++;
                  let loadoutNext = findCubeLuckOpt(tableCache.tableOctV, tableCache.tableLuckOct, "oct");
                  let effect = loadoutNext.getStat("oct") / loadoutOct.getStat("oct");
                  redAmbUpgradeEffects.freeLevelsRow4 = {
                      ...(redAmbUpgradeEffects.freeLevelsRow4 ?? {}),
                      octEffect: effect,
                  };
                  stats.bonus[3]--;
              }

              if (stats.bonus[4] < 5) {
                  stats.bonus[4]++;
                  let loadoutNext = findCubeLuckOpt(tableCache.tableOctV, tableCache.tableLuckOct, "oct");
                  let effect = loadoutNext.getStat("oct") / loadoutOct.getStat("oct");
                  redAmbUpgradeEffects.freeLevelsRow5 = {
                      ...(redAmbUpgradeEffects.freeLevelsRow5 ?? {}),
                      octEffect: effect,
                  };
                  stats.bonus[4]--;
              }

              if (!stats.viscount) {
                  stats.baseLuck += 125;
                  let loadoutNext = findCubeLuckOpt(tableCache.tableOctV, tableCache.tableLuckOct, "oct");
                  let effect = loadoutNext.getStat("oct") / loadoutOct.getStat("oct");
                  redAmbUpgradeEffects.viscount = {
                      ...(redAmbUpgradeEffects.viscount ?? {}),
                      octEffect: effect,
                  };
                  stats.baseLuck -= 125;
              }
              recordCubeExperimentStage("oct-and-red-effects", octStartedAt, {
                octVoucher: tableCache.tableOctV.length,
                luckOct: tableCache.tableLuckOct.length,
              })
          }

          // --- calculateOff / calculateObtAndOff: Obt, Off, Obt + Off ---
          if (options.calculateOff || options.calculateObtAndOff) {
              const obtainiumOfferingStartedAt = experimentNow()
              let tableSing    = generateTable([stats.exalt > 0 ? "ambrosiaSingReduction2" : "ambrosiaSingReduction1"], "mOff")
              const tableObtBase = generateDependentChainTable(["ambrosiaBaseObtainium1", "ambrosiaBaseObtainium2"], "obt");
              let tableObt1    = mergeTables(
                tableObtBase,
                generateTable(["ambrosiaFreeObtainiumUpgrades"], "obt"),
                "obt"
              );
              let tableObt2    = generateTable(["ambrosiaObtainium1"], "obt");
              let tableObt3    = mergeTables(tableObt1, tableObt2, "obt");

              const tableOffBase = generateDependentChainTable(["ambrosiaBaseOffering1", "ambrosiaBaseOffering2"], "off")
              let tableOff1    = mergeTables(
                tableOffBase,
                generateTable(["ambrosiaFreeOfferingUpgrades"], "off"),
                "off"
              )
              let tableOff2    = generateTable(["ambrosiaOffering1"], "off")
              let tableOff3    = mergeTables(tableOff1, tableOff2, "off")

              let offSubstageStartedAt = experimentNow()
              if (options.calculateOff) {
                  HSLogger.debug(() => '[HeaterDiag] calculateOff: obt', 'HSHeaterOptimizer');
                  let tableObtOff  = mergeTables(tableObt3, tableOff3, "obt")
                  recordCubeExperimentStage("obtainium-combine", offSubstageStartedAt, { frontier: tableObtOff.length })
                  let tableObt4    = tableObtOff
                  offSubstageStartedAt = experimentNow()
                  let tableObtSing = mergeTables(tableObt4, tableSing, "obt");
                  let tableObtRune = mergeIndependentTables(tableObtSing, tableCache.tableRune, "obt")
                  recordCubeExperimentStage("obtainium-rune", offSubstageStartedAt, { frontier: tableObtRune.length })
                  offSubstageStartedAt = experimentNow()
                  const loadoutObt = findResourceVoucherOpt(tableObtRune, tableCache.tableLuck, tableCache.tableVoucher, "obt");
                  recordCubeExperimentStage("obtainium-final-search", offSubstageStartedAt, {
                    left: tableObtRune.length,
                    right: tableCache.tableLuck.length,
                  })
                  if (!loadoutObt) HSLogger.error('[HeaterDiag] calculateOff: obt - findOpt returned undefined', 'HSHeaterOptimizer');
                  output.obt = [loadoutObt.generateOutput("obt", withBestBrickOfLead(maxLoadout, "obt"))];

                  HSLogger.debug(() => '[HeaterDiag] calculateOff: off', 'HSHeaterOptimizer');
                  // Obtainium and Offering have different Pareto frontiers. An
                  // Obtainium-trimmed frontier can omit Offering modules entirely.
                  let tableOff4    = mergeTables(tableObt3, tableOff3, "off")
                  offSubstageStartedAt = experimentNow()
                  let tableOffSing = mergeTables(tableOff4, tableSing, "off")
                  let tableOffRune = mergeIndependentTables(tableOffSing, tableCache.tableRune, "off")
                  recordCubeExperimentStage("offerings-rune", offSubstageStartedAt, { frontier: tableOffRune.length })
                  offSubstageStartedAt = experimentNow()
                  const loadoutOff = findResourceVoucherOpt(tableOffRune, tableCache.tableLuck, tableCache.tableVoucher, "off")
                  recordCubeExperimentStage("offerings-final-search", offSubstageStartedAt, {
                    left: tableOffRune.length,
                    right: tableCache.tableLuck.length,
                  })
                  if (!loadoutOff) HSLogger.error('[HeaterDiag] calculateOff: off - findOpt returned undefined', 'HSHeaterOptimizer');
                  output.off = [loadoutOff.generateOutput("off", withBestBrickOfLead(maxLoadout, "off"))];
              }

              if (options.calculateObtAndOff) {
                  HSLogger.debug(() => '[HeaterDiag] calculateObtAndOff', 'HSHeaterOptimizer');
                  // Both together have their own frontier too: a module that
                  // trails on one side can win on the product
                  offSubstageStartedAt = experimentNow()
                  let tableObtAndOff = mergeTables(tableObt3, tableOff3, "obtAndOff")
                  let tableObtAndOffSing = mergeTables(tableObtAndOff, tableSing, "obtAndOff")
                  let tableObtAndOffRune = mergeIndependentTables(tableObtAndOffSing, tableCache.tableRune, "obtAndOff")
                  recordCubeExperimentStage("obt-and-off-rune", offSubstageStartedAt, { frontier: tableObtAndOffRune.length })
                  offSubstageStartedAt = experimentNow()
                  const loadoutObtAndOff = findResourceVoucherOpt(tableObtAndOffRune, tableCache.tableLuck, tableCache.tableVoucher, "obtAndOff")
                  recordCubeExperimentStage("obt-and-off-final-search", offSubstageStartedAt, {
                    left: tableObtAndOffRune.length,
                    right: tableCache.tableLuck.length,
                  })
                  output.obtAndOff = [loadoutObtAndOff.generateOutput("obtAndOff", withBestBrickOfLead(maxLoadout, "obtAndOff"))];
              }
              recordCubeExperimentStage("obtainium-offerings", obtainiumOfferingStartedAt, {
                rune: tableCache.tableRune.length,
                luck: tableCache.tableLuck.length,
              })
          }

          if (options.calculateSR) {
            const singularityReductionStartedAt = experimentNow()

            HSLogger.debug(() => '[HeaterDiag] calculateSR: sr1', 'HSHeaterOptimizer');
            let exalt = stats.exalt
            let postAoAG = stats.postAoAG
            stats.postAoAG = false

            stats.exalt = 0
            let loadoutSR1 = generateTable(["ambrosiaSingReduction1"], "singReduction").at(-1)!
            let levelSR1 = loadoutSR1.upgradeLevels.ambrosiaSingReduction1
            let tableSR1Cube = tableCache.tableCubeVoucher
              .filter(loadout => loadout.upgradeLevels.ambrosiaHyperflux >= 4)
              .map(loadout => new Loadout(loadout))
            tableSR1Cube.forEach(loadout => loadout.upgradeLevels.ambrosiaSingReduction1 = levelSR1)
            // No cube-optimal loadout reaches ambrosiaHyperflux >= 4 within budget, or no SR1
            // level fits: a cube tree without SR1 would read as a Max SR1 row
            if (tableSR1Cube.length === 0 || !levelSR1) {
                HSLogger.warn('[HeaterDiag] calculateSR: sr1 - no SR1 level or no loadout with ambrosiaHyperflux >= 4 within budget, reporting Unaffordable', 'HSHeaterOptimizer');
                // The smallest tree with SR1: a minimum
                const minimalSR1 = new Loadout()
                minimalSR1.upgradeLevels.ambrosiaSingReduction1 = 1
                minimalSR1.satisfyPrerequisites()
                output.sr1 = [unaffordableRow(minimalSR1, true)];
            } else {
                // Inexact but fast search: SR1's level is set, its cubes are a bonus
                loadoutSR1 = findCubeLuckOpt(tableSR1Cube, tableCache.tableLuckCube, "cube", stats.amb, false, true)
                if (!loadoutSR1) HSLogger.error('[HeaterDiag] calculateSR: sr1 - findOpt returned undefined', 'HSHeaterOptimizer');
                output.sr1 = [withPenaltyReliefTitle(loadoutSR1.generateOutput("singReduction", maxLoadout, null, "cube"),
                  loadoutSR1.upgradeLevels.ambrosiaSingReduction1 ?? 0)];
            }
            tableSR1Cube.length = 0

            HSLogger.debug(() => '[HeaterDiag] calculateSR: sr2', 'HSHeaterOptimizer');
            stats.exalt = 7
            let loadoutSR2 = generateTable(["ambrosiaSingReduction2"], "singReduction").at(-1)!
            let levelSR2 = loadoutSR2.upgradeLevels.ambrosiaSingReduction2
            let tableSR2Cube = tableCache.tableCubeVoucher.map(loadout => new Loadout(loadout))
            tableSR2Cube.forEach(loadout => loadout.upgradeLevels.ambrosiaSingReduction2 = levelSR2)
            if (!levelSR2) {
                // No SR2 level within budget, as for SR1 above
                const minimalSR2 = new Loadout()
                minimalSR2.upgradeLevels.ambrosiaSingReduction2 = 1
                output.sr2 = [unaffordableRow(minimalSR2, true)];
            } else {
                // Inexact but fast search, as for SR1
                loadoutSR2 = findCubeLuckOpt(tableSR2Cube, tableCache.tableLuckCube, "cube", stats.amb, false, true)
                if (!loadoutSR2) HSLogger.error('[HeaterDiag] calculateSR: sr2 - findOpt returned undefined', 'HSHeaterOptimizer');
                output.sr2 = [withPenaltyReliefTitle(loadoutSR2.generateOutput("singReduction", maxLoadout, null, "cube"),
                  loadoutSR2.upgradeLevels.ambrosiaSingReduction2 ?? 0)];
            }
            tableSR2Cube.length = 0
            stats.exalt = exalt
            stats.postAoAG = postAoAG
            recordCubeExperimentStage("singularity-reduction", singularityReductionStartedAt, {
              cubeVoucher: tableCache.tableCubeVoucher.length,
              luckCube: tableCache.tableLuckCube.length,
            })
          }

          // --- calculateAmbOct ---
          if (options.calculateAmbOct) {
              const ambOctStartedAt = experimentNow()
              HSLogger.debug(() => '[HeaterDiag] calculateAmbOct', 'HSHeaterOptimizer');
              const affordable = (loadout: Loadout): boolean =>
                  loadout.cost <= stats.amb && loadout.blueberryCost <= stats.blueberries;
              // The oct table leaves the Luck-Cube hybrid to the luck side
              // (tableLuckOct, the Oct branch's), which is not searched here:
              // try it on each row. Every level >= 1 costs the same Blueberry,
              // so the highest affordable level beats the lower ones; level 0
              // is still tried, as that Blueberry can lower Purple Leo luck.
              // A new Octeract module outside tableOctV needs adding here too.
              const luckCubeRows: Loadout[] = [];
              for (let level = 1; level <= upgrades.ambrosiaLuckCube1.maxLevel; level++) {
                  const row = new Loadout();
                  row.upgradeLevels.ambrosiaLuckCube1 = level;
                  row.satisfyPrerequisites();
                  luckCubeRows.push(row);
              }
              let loadoutAmbOct = maxAmbForOct!;
              let bestValue = loadoutAmbOct.getStat("ambOct");
              const consider = (candidate: Loadout): void => {
                  const value = candidate.getStat("ambOct");
                  if (value > bestValue || (value === bestValue && candidate.cost < loadoutAmbOct.cost)) {
                      loadoutAmbOct = candidate;
                      bestValue = value;
                  }
              };
              for (const octLoadout of [new Loadout(), ...tableCache.tableOctV]) {
                  const base = Loadout.union(maxAmbForOct!, octLoadout);
                  if (!affordable(base))
                      continue;
                  consider(base);
                  for (let index = luckCubeRows.length - 1; index >= 0; index--) {
                      const candidate = Loadout.union(base, luckCubeRows[index]);
                      if (affordable(candidate)) {
                          consider(candidate);
                          break;
                      }
                  }
              }
              output.ambOct = [loadoutAmbOct.generateOutput("oct", withBestBrickOfLead(maxLoadout, "oct"))];
              recordCubeExperimentStage("amb-oct", ambOctStartedAt, {
                maxAmbCost: maxAmbForOct!.cost,
                maxAmbBlueberries: maxAmbForOct!.blueberryCost,
                octVoucher: tableCache.tableOctV.length,
              })
          }

          // --- calculateHyperflux ---
          if (options.calculateHyperflux) {
              const hyperfluxStartedAt = experimentNow()

              HSLogger.debug(() => '[HeaterDiag] calculateHyperflux', 'HSHeaterOptimizer');
              let postAoAG = stats.postAoAG
              stats.postAoAG = false

              // Reuse the shared canonical voucher frontier; rebuilding it for
              // Hyperflux repeats prerequisite/cost work without adding any
              // candidates.
              const tableVoucher = tableCache.tableVoucher
              let hyperfluxSubstageStartedAt = experimentNow()
              const tableCubeV = mergeVoucherTable(tableCache.tableCubeR, tableVoucher, "cube")
              recordCubeExperimentStage("hyperflux-voucher-table", hyperfluxSubstageStartedAt, {
                cubeRune: tableCache.tableCubeR.length,
                cubeVoucher: tableCubeV.length,
              })
              hyperfluxSubstageStartedAt = experimentNow()
              const hyperflux = upgrades.ambrosiaHyperflux
              // Only the rows that buy Singularity Reduction: builds without
              // it are searched on their own tables below.
              const tableSing = generateTable([stats.exalt > 0 ? "ambrosiaSingReduction2" : "ambrosiaSingReduction1"], "cube")
                .filter(sing => (sing.upgradeLevels.ambrosiaSingReduction1 ?? 0)
                  + (sing.upgradeLevels.ambrosiaSingReduction2 ?? 0) > 0)
              const affordable = (loadout: Loadout): boolean =>
                loadout.cost <= stats.amb && loadout.blueberryCost <= stats.blueberries

              // Hyperflux is added to a row's winner after the search. Only its
              // Ambrosia used to be taken off the row's budget: its Blueberries
              // were never counted, so rows H1+ could need more than are owned.
              // Each request now also reserves them. Singularity Reduction I
              // already contains its Hyperflux prerequisite: those tables carry
              // it, reserve nothing, and only pay the Ambrosia above it.
              const hyperfluxBlueberries = effectiveBlueberryCost("ambrosiaHyperflux")
              type HyperfluxSource = { table: Loadout[]; carried: number }
              const plainSource: HyperfluxSource = { table: tableCubeV, carried: 0 }
              const singSources: HyperfluxSource[] = []
              if (tableSing.length > 0) {
                const carried = tableSing[0].upgradeLevels.ambrosiaHyperflux ?? 0
                if (cubeExperimentConfig?.useLegacyHyperfluxMerge)
                  singSources.push({ table: mergeTables(tableCubeV, tableSing, "cube"), carried })
                else
                  // Each Singularity-reduction level has a fixed cost, berry
                  // cost and effect. Search its full Cube/Voucher frontier
                  // separately, then choose the best result per Hyperflux
                  // row. This retains every candidate from the merged
                  // frontier without searching one much larger mixed table.
                  for (const sing of tableSing)
                    singSources.push({
                      table: tableCubeV.map(row => Loadout.union(row, sing)).filter(affordable),
                      carried,
                    })
              }
              recordCubeExperimentStage("hyperflux-singularity-table", hyperfluxSubstageStartedAt, {
                cubeVoucher: tableCubeV.length,
                singularity: tableSing.length,
                cubeVoucherSingularity: singSources.reduce((sum, source) => sum + source.table.length, 0),
              })
              recordCubeExperimentStage("hyperflux-tables", hyperfluxSubstageStartedAt, {
                cubeVoucher: tableCubeV.length,
                cubeVoucherSingularity: singSources.reduce((sum, source) => sum + source.table.length, 0),
              })

              const loadoutsH: (Loadout | undefined)[] = new Array(hyperflux.maxLevel + 1).fill(undefined);
              const thresholds: number[] = new Array(hyperflux.maxLevel + 1).fill(0);
              // A table serves every row from the Hyperflux level it carries.
              const searchSource = (source: HyperfluxSource): void => {
                if (source.table.length === 0)
                  return
                const requests: Array<{ level: number; budget: number; reserve: number }> = []
                for (let h = source.carried; h <= hyperflux.maxLevel; h++) {
                  const budget = stats.amb - hyperflux.cost(h) + hyperflux.cost(source.carried)
                  const reserve = h > 0 && source.carried === 0 ? hyperfluxBlueberries : 0
                  if (budget >= 0 && reserve <= stats.blueberries)
                    requests.push({ level: h, budget, reserve })
                }
                if (requests.length === 0)
                  return
                const results = findCubeLuckOptsForBudgets(
                  source.table,
                  tableCache.tableLuckCube,
                  "cube",
                  requests.map(request => request.budget),
                  false,
                  requests.map(request => request.reserve),
                )
                for (let index = 0; index < requests.length; index++) {
                  // The search scores a candidate without the row's Hyperflux
                  // (its reserved Blueberries still count as unassigned for
                  // Purple Leo), and tables carry different Hyperflux levels:
                  // re-score every candidate at the row's level, on full costs.
                  const level = requests[index].level
                  const candidate = new Loadout(results[index])
                  candidate.upgradeLevels.ambrosiaHyperflux = level
                  if (!affordable(candidate))
                    continue
                  const previous = loadoutsH[level]
                  if (previous === undefined
                    || candidate.getStat("cube") > previous.getStat("cube")
                    || (candidate.getStat("cube") === previous.getStat("cube")
                      && candidate.cost < previous.cost))
                    loadoutsH[level] = candidate
                }
              }
              hyperfluxSubstageStartedAt = experimentNow()
              searchSource(plainSource)
              recordCubeExperimentStage("hyperflux-direct-search", hyperfluxSubstageStartedAt, {
                cube: tableCubeV.length,
                luckCube: tableCache.tableLuckCube.length,
              })
              hyperfluxSubstageStartedAt = experimentNow()
              singSources.forEach(searchSource)
              recordCubeExperimentStage("hyperflux-singularity-search", hyperfluxSubstageStartedAt, {
                tiers: singSources.length,
                cube: tableCubeV.length,
                luckCube: tableCache.tableLuckCube.length,
              })

              // The P4x4 thresholds compare the rows without Hyperflux's own
              // Cube effect, at each row's real Blueberry cost.
              const cubeStatsWithoutHyperflux = loadoutsH.map(loadout => {
                if (loadout === undefined)
                  return 0
                const base = new Loadout(loadout)
                base.upgradeLevels.ambrosiaHyperflux = 0
                base.setCachedCosts(loadout.cost, loadout.blueberryCost)
                return base.getStat("cube")
              })
              for (let h = 0; h <= hyperflux.maxLevel; h++) {
                  if (loadoutsH[h] === undefined)
                      continue
                  thresholds[h] = 0;
                  for (let p = h - 1; p >= 0; p--) {
                      if (loadoutsH[p] === undefined)
                          continue
                      if (thresholds[p] > 50)
                          continue;
                      thresholds[h] = cubeStatsWithoutHyperflux[p] / cubeStatsWithoutHyperflux[h];
                      thresholds[h] = Math.log2(thresholds[h]) / Math.log2((1 + 0.01 * h) / (1 + 0.01 * p));
                      thresholds[h] = Math.max(0, Math.ceil(thresholds[h]));
                      if (thresholds[h] > Math.min(50, thresholds[p]))
                          break;
                      thresholds[p] = Infinity;
                  }
              }

              let hyperOutput: HeaterResultRowMatrix = [];
              for (let i = 0; i <= upgrades.ambrosiaHyperflux.maxLevel; i++) {
                  let maxLoadoutH = new Loadout(maxLoadout);
                  maxLoadoutH.upgradeLevels.ambrosiaHyperflux = i;
                  maxLoadoutH.dropUnmetPrerequisites();
                  if (loadoutsH[i] === undefined) {
                      // The smallest tree with this Hyperflux level: a minimum
                      const minimalH = new Loadout();
                      minimalH.upgradeLevels.ambrosiaHyperflux = i;
                      hyperOutput.push(unaffordableRow(minimalH, true));
                  } else {
                      // Calculating effect without hyperflux
                      loadoutsH[i]!.upgradeLevels.ambrosiaHyperflux = 0; // Resetting hyperflux level to compute effect without it
                      loadoutsH[i]!.getStat("cube", true); // Updating cache
                      loadoutsH[i]!.upgradeLevels.ambrosiaHyperflux = i; // Restoring hyperflux level for correct output
                      hyperOutput.push(loadoutsH[i]!.generateOutput("cube", withBestBrickOfLead(maxLoadoutH, "cube"), thresholds[i]));
                  }
              }
              output.hyperflux = hyperOutput;

              stats.postAoAG = postAoAG;
              recordCubeExperimentStage("hyperflux", hyperfluxStartedAt, {
                cubeRune: tableCache.tableCubeR.length,
                luckCube: tableCache.tableLuckCube.length,
              })

          }

          if (Object.keys(redAmbUpgradeEffects).length > 0) {
              output.redAmbUpgradeEffects = redAmbUpgradeEffects;
          }

          return output;

        } catch (e) {
            // Console only: the error is thrown again and its caller logs it, and
            // the runner writes the input to the mod's log itself.
            console.error(`[HSHeaterOptimizer]: [HeaterDiag] createHeaterOptimizerResultFromInput crashed: ${e instanceof Error ? e.stack ?? e.message : e}`);
            console.error(`[HSHeaterOptimizer]: [HeaterDiag] options at crash time: ${JSON.stringify(options)}`);
            console.error(`[HSHeaterOptimizer]: [HeaterDiag] input at crash time: ${JSON.stringify(input)}`);
            throw e;
        }
    }
}
