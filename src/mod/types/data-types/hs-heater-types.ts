import type Decimal from "break_infinity.js";
import type { HeaterCoinsC15Input } from './hs-heater-coins-types';
import type { HeaterBranchId, HeaterResultArrayKey } from "../../class/hs-modules/hs-heater/hs-heater-result-config";
import type { AmbrosiaBarIncomeReactor } from "./hs-ambrosia-income-types";
export type { HeaterResultArrayKey } from "../../class/hs-modules/hs-heater/hs-heater-result-config";

export interface HeaterOptimizerInput {
    amb: number;
    ramb: number;
    bonusAmbrosiaPerFill: number;
    ambSpeedNoAmbBerries: number;
    blueberries: number;
    purpleLeoLevel: number;
    luckBaseNoAmb: number;
    luckMultNoAmb: number;
    redLuckBase: number;
    luckConversion: number;
    quarksOwned: number;
    qHept: number;
    cubesExpTotal: number;
    currentSingularity: number;
    singularityReducers: number;
    exalt: number;
    exalt5Unlocked: boolean;
    exalt9Unlocked: boolean;
    postAoag: boolean;
    oneMindUnlocked: boolean;
    aquariusUnlocked: boolean;
    transcription: number;
    ascSpeed: number;
    ascSpread: number;
    baseObt: number;
    baseOff: number;
    bonusTutorial: number;
    bonusRow2: number;
    bonusRow3: number;
    bonusRow4: number;
    bonusRow5: number;
    runeSiExp: Decimal;
    runeSiRC: number;
    runeSiBonusLevelsTotal: number;
    runeSiBonusLevelsTalismanNoAmbrosia: number;
    runeSiEffectiveLevelMultiplier: number;
    runeIaExp: Decimal;
    runeIaBonusLevelsTotal: Decimal;
    runeIaBonusLevelsTalisman: Decimal;
    baseTalismanPower: Decimal;
    patreonBonus: number;
    activeBells: number;
    globalEventBlueBarBonus: number;
    freeShopLevelsInfinity: number;
    freeShopLevelsQuark: number;
    chronometerLevel: number;
    shopAmbrosiaLuck1: number;
    shopAmbrosiaLuck2: number;
    shopAmbrosiaLuck3: number;
    shopAmbrosiaLuck4: number;
    shopRedLuck1: number;
    shopRedLuck2: number;
    shopRedLuck3: number;
    shopRedLuck4: number;
    shopAmbrosiaGeneration1: number;
    shopAmbrosiaGeneration2: number;
    shopAmbrosiaGeneration3: number;
    shopAmbrosiaGeneration4: number;
    shopImproveQuarkHept1: number;
    shopImproveQuarkHept2: number;
    shopImproveQuarkHept3: number;
    shopImproveQuarkHept4: number;
    shopImproveQuarkHept5: number;
    ossifiedTactics: number;
    ossifiedTactics2: number;
    redberries: number;
    fusion: number;
    viscount: boolean;
    rBar: number;
    rSpeed: number;
    blueBarMaxWithoutTwoMindAndBrick: number;
    blueBarRequirementBeforeRounding: number;
    redBarMaxWithoutTwoMind: number;
    /** Fixed game-state inputs for the new bar-fill income objectives. */
    reactor?: AmbrosiaBarIncomeReactor;
    /** Fixed game-state inputs for the Purple Honey / Purple Ambrosia objectives. */
    purple?: HeaterPurpleInput;
    coinsC15?: HeaterCoinsC15Input;
    ambrosiaUpgradeBonusLevels: Record<string, number>;
    ambrosiaUpgradeBlueberryCostReductions: Record<string, number>;
    shopUpgradeRawLevels: Record<string, number>;
    shopBonusLevelsNoAmbrosia: {
        offering: number;
        obtainium: number;
        cubes: number;
        speed: number;
        quark: number;
        ambrosiaLuck: number;
        redAmbrosiaLuck: number;
        ambrosiaGeneration: number;
        infinity: number;
    };
    panthemaLevel: number;
    /** Platonic Tau's power on every cube multiplier (1 when not bought). */
    tauPower: number;
    heaterOptions: Record<HeaterBranchId, boolean>;
}

export interface HeaterPurpleInput {
    purpleHoneyLuck: number;
    purpleHoneyPerExtraction: number;
    /** Red Ambrosia spent per crafted Purple Ambrosia. */
    craftRedAmbrosiaCost: number;
    /** Purple Honey spent per crafted Purple Ambrosia. */
    craftPurpleHoneyCost: number;
}

export type HeaterPurpleRoutedResultKey = 'purpleHoney' | 'purpleAmb' | 'purpleHoneyOpt' | 'purpleAmbOpt';

/** Purple Reactor routing used by a purple result row. */
export interface HeaterPurpleRouting {
    blueRoutingPercent: number;
    redRoutingPercent: number;
    /** Row objective per hour: Purple Honey, or crafted Purple Ambrosia. */
    perHour: number;
    /** Best-routing rows only: the same objective per hour at the current routing. */
    currentRoutingPerHour?: number;
}

export type HeaterResultAffordableRow = [
    loadoutJson: string,
    sheetSpacerA: null,
    blueberryCost: number,
    cost: number,
    effect: string,
    p4x4Eq: number | "Never" | "",
    isMaxed: boolean,
    limits?: HeaterResultLimits,
    /** The Effect cell's title (Max SR rows: the penalty they lift). */
    effectTitle?: string,
    /**
     * ✘ rows only: the tree "Maxed" compared with, cut to the upgrades that
     * move the row's stat (loadout JSON). Results saved before it have none.
     */
    maxedReference?: string,
];

/**
 * A row that isn't maxed: which resource would let one more level of an
 * upgrade raise its stat. Set only when one of them is true.
 */
export interface HeaterResultLimits {
    ambrosia: boolean;
    blueberries: boolean;
}

/** A resource an unaffordable row runs short of: what the tree needs, what the inputs have. */
export interface HeaterShortResource {
    need: number;
    have: number;
}

/**
 * Why a row is unaffordable: only the short resource(s) are set. atLeast: the
 * needs are those of the smallest tree that could fill the row (a minimum).
 */
export interface HeaterResultShortfall {
    ambrosia?: HeaterShortResource;
    blueberries?: HeaterShortResource;
    atLeast: boolean;
}

export type HeaterResultUnaffordableRow = [
    loadoutLabel: "Unaffordable",
    sheetSpacerA: null,
    blueberryCost: "N / A",
    cost:   "N / A",
    effect: "N / A",
    p4x4Eq: "N / A",
    isMaxed: false,
    shortfall?: HeaterResultShortfall,
];

export type HeaterResultRow = HeaterResultAffordableRow | HeaterResultUnaffordableRow;
export type HeaterResultRowMatrix = HeaterResultRow[];

export type RowBasedResultKey = import("../../class/hs-modules/hs-heater/hs-heater-result-config").RowBasedResultKey;
export type SingleResultKey = Exclude<HeaterResultArrayKey, RowBasedResultKey>;
/** 'hyperflux:best': the H row that wins at the live P4x4, resolved when it's read (HSHeaterResultStore). */
export type HeaterTypeSemanticId = 'none' | SingleResultKey | `${RowBasedResultKey}:${number}` | 'hyperflux:best';
export type HeaterResultSectionId = 'common' | 'obtOff' | 'p4x4' | 'hybrid';

export type HeaterRedAmbUpgradeEffectName =
    | 'ossifiedTactics'
    | 'blueberries'
    | 'freeLevelsRow2'
    | 'freeLevelsRow3'
    | 'freeLevelsRow4'
    | 'freeLevelsRow5'
    | 'viscount';

export type HeaterRedAmbUpgradeEffect = {
    rEffect?: number;
    bEffect?: number;
    octEffect?: number;
};

export type HeaterRedAmbUpgradeEffects = Partial<Record<HeaterRedAmbUpgradeEffectName, HeaterRedAmbUpgradeEffect>>;

export type HeaterRedAmbCommonValues = {
    luck: number;
    mLuck: number;
    luckConversion: number;
    totalRedLuck: number;
    rLuckEffectRatio: number;
};

export type NormalizedHeaterResultEntry = {
    semanticId: HeaterTypeSemanticId;
    label: string;
    rowData: HeaterResultRow;
    key: HeaterResultArrayKey;
    section: HeaterResultSectionId;
    rowIndex: number;
    isRowBased: boolean;
    purpleRouting?: HeaterPurpleRouting;
};

export interface HeaterOptimizationResult {
    input: HeaterOptimizerInput;
    luck?: HeaterResultRowMatrix;
    rLuck?: HeaterResultRowMatrix;
    allAmb?: HeaterResultRowMatrix;
    quarks?: HeaterResultRowMatrix;
    cubes?: HeaterResultRowMatrix;
    oct?: HeaterResultRowMatrix;
    coinsC15?: HeaterResultRowMatrix;
    obt?: HeaterResultRowMatrix;
    off?: HeaterResultRowMatrix;
    obtAndOff?: HeaterResultRowMatrix;
    hyperflux?: HeaterResultRowMatrix;
    sr1?: HeaterResultRowMatrix;
    sr2?: HeaterResultRowMatrix;
    ambOct?: HeaterResultRowMatrix;
    purpleHoney?: HeaterResultRowMatrix;
    purpleAmb?: HeaterResultRowMatrix;
    purpleHoneyOpt?: HeaterResultRowMatrix;
    purpleAmbOpt?: HeaterResultRowMatrix;
    purpleRouting?: Partial<Record<HeaterPurpleRoutedResultKey, HeaterPurpleRouting>>;
    redAmbUpgradeEffects?: HeaterRedAmbUpgradeEffects;
    redAmbCommonValues?: HeaterRedAmbCommonValues;
}
