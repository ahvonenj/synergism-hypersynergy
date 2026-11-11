import { goldenQuarkUpgrades, octUpgrades, RedAmbrosiaUpgrades, GameData } from "./hs-player-savedata";

export type CalculationMode = 'normal' | 'true_base' | 'non_ambrosia';

export enum ShopUpgradeGroups {
  Offering = 0,
  Obtainium,
  Cubes,
  Speed,
  Quark,
  AmbrosiaLuck,
  RedAmbrosiaLuck,
  AmbrosiaGeneration,
  InfinityUpgrades,
  Utility
}

export interface CalculationCache {
    [key: string]: CachedValue;
}

export type RuneTypeMap = {
    speed: {
        acceleratorPower: number
        multiplicativeAccelerators: number
        globalSpeed: number
    }
    duplication: {
        multiplierBoosts: number
        multiplicativeMultipliers: number
        taxReduction: number
    }
    prism: {
        productionLog10: number
        costDivisorLog10: number
    }
    thrift: {
        construction: number
        salvage: number
        taxReduction: number
    }
    superiorIntellect: {
        offeringMult: number
        obtainiumMult: number
        antSpeed: number
    }
    infiniteAscent: {
        quarkMult: number
        cubeMult: number
        salvage: number
    }
    antiquities: {
        addCodeCooldownReduction: number
        offeringLog10: number
        obtainiumLog10: number
    }
    horseShoe: {
        ambrosiaLuck: number
        redLuck: number
        purpleHoneyLuck: number
    }
    topHat: {
        freeOfferingLevels: number
        freeObtainiumLevels: number
        freeCubeLevels: number
        freeSpeedLevels: number
        freeInfinityLevels: number
    }
    finiteDescent: {
        cubesBanked: number
        corruptionFreeLevels: number
        infiniteAscentFreeLevel: number
    }
}

export type RuneKeys = keyof RuneTypeMap

export type SynergismLevelMilestones =
    | 'offeringTimerScaling'
    | 'speedRune'
    | 'duplicationRune'
    | 'prismRune'
    | 'thriftRune'
    | 'SIRune'
    | 'autoPrestige'
    | 'tier1CrystalAutobuy'
    | 'tier2CrystalAutobuy'
    | 'tier3CrystalAutobuy'
    | 'tier4CrystalAutobuy'
    | 'tier5CrystalAutobuy'
    | 'achievementTalismanUnlock'
    | 'runeAutobuyImprover'
    | 'achievementTalismanEnhancement'
    | 'salvageChallengeBuff'
    | 'antSpeed2Autobuyer'
    | 'wowCubesAutobuyer'
    | 'ascensionScoreAutobuyer'
    | 'mortuus2Autobuyer'

export interface SynergismLevelMilestoneDefinition {
    effect: () => number
    defaultValue: number
    levelReq: number
}

export type TalismanTypeMap = {
    exemption: { taxReduction: number; duplicationOOMBonus: number }
    chronos: { globalSpeed: number; speedOOMBonus: number }
    midas: { blessingBonus: number; thriftOOMBonus: number }
    metaphysics: { talismanEffect: number; extraTalismanEffect: number }
    polymath: { ascensionSpeedBonus: number; SIOOMBonus: number }
    mortuus: { antBonus: number; prismOOMBonus: number }
    plastic: { quarkBonus: number }
    wowSquare: { evenDimBonus: number; oddDimBonus: number }
    achievement: { positiveSalvageMult: number; negativeSalvageMult: number }
    purpleGem: { purpleHoneyLuck: number; purpleAmbrosiaDiscount: number }
    cookieGrandma: { freeCorruptionLevel: number; cookieSix: boolean }
    horseShoe: { luckPercentage: number; redLuck: number }
}

export type TalismanKeys = keyof TalismanTypeMap

export type GoldenQuarkUpgradeKey = keyof goldenQuarkUpgrades;
export type OcteractUpgradeKey = keyof octUpgrades;
export type RedAmbrosiaUpgradeKey = keyof RedAmbrosiaUpgrades;

export interface CachedValue {
    value: unknown;
    cachedBy: number[]
}

export interface RedAmbrosiaUpgradeCalculationConfig<K extends keyof RedAmbrosiaUpgradeRewards> {
    label: string,
    costPerLevel: number,
    maxLevel: number,
    costFunction: (n: number, cpl: number) => number,
    effects: (n: number, gameData?: GameData) => RedAmbrosiaUpgradeRewards[K],
    url: string
}

export type RedAmbrosiaUpgradeRewards = {
    tutorial: { cubeMult: number; obtainiumMult: number; offeringMult: number }
    conversionImprovement1: { conversionImprovement: number }
    conversionImprovement2: { conversionImprovement: number }
    conversionImprovement3: { conversionImprovement: number }
    freeTutorialLevels: { freeLevels: number }
    freeLevelsRow2: { freeLevels: number }
    freeLevelsRow3: { freeLevels: number }
    freeLevelsRow4: { freeLevels: number }
    freeLevelsRow5: { freeLevels: number }
    blueberryGenerationSpeed: { blueberryGenerationSpeed: number }
    regularLuck: { ambrosiaLuck: number }
    redGenerationSpeed: { redAmbrosiaGenerationSpeed: number }
    redGenerationSpeed2: { redAmbrosiaGenerationSpeed: number }
    redLuck: { redAmbrosiaLuck: number }
    redAmbrosiaCube: { unlockedRedAmbrosiaCube: boolean }
    redAmbrosiaObtainium: { unlockRedAmbrosiaObtainium: boolean }
    redAmbrosiaOffering: { unlockRedAmbrosiaOffering: boolean }
    redAmbrosiaCubeImprover: { extraExponent: number }
    viscount: { roleUnlock: boolean; quarkBonus: number; luckBonus: number; redLuckBonus: number }
    infiniteShopUpgrades: { freeLevels: number }
    redAmbrosiaAccelerator: { ambrosiaTimePerRedAmbrosia: number }
    regularLuck2: { ambrosiaLuck: number }
    blueberryGenerationSpeed2: { blueberryGenerationSpeed: number }
    salvageYinYang: { positiveSalvage: number; negativeSalvage: number }
    blueberries: { blueberries: number }
    redAmbrosiaFreeAccumulator: { freeAccumulatorLevels: number; freeAccumulatorLevelCapIncrease: number }
    freeOfferingUpgrades: { levels: number }
    freeObtainiumUpgrades: { levels: number }
    freeCubeUpgrades: { levels: number }
    freeSpeedUpgrades: { levels: number }
}

export interface AmbrosiaUpgradeEffectContext {
    readonly freeLevelsOnly: boolean
    getAmbrosiaUpgradeLevel: (upgradeName: AmbrosiaUpgradeNames) => number
}

export interface AmbrosiaUpgradeCalculationConfig<
    K extends keyof AmbrosiaUpgradeRewards
> {
    costPerLevel: number
    maxLevel: number
    costFormula: (n: number, cpl: number) => number
    effects: (n: number, ctx?: AmbrosiaUpgradeEffectContext) => AmbrosiaUpgradeRewards[K]
    extraLevelCalc: () => number
    prerequisites?: Partial<Record<AmbrosiaUpgradeNames, number>>
    ignoreEXALT?: boolean
}


export interface AmbrosiaUpgradeCalculationCollection {
    ambrosiaTutorial: AmbrosiaUpgradeCalculationConfig<'ambrosiaTutorial'>

    ambrosiaQuarks1: AmbrosiaUpgradeCalculationConfig<'ambrosiaQuarks1'>
    ambrosiaCubes1: AmbrosiaUpgradeCalculationConfig<'ambrosiaCubes1'>
    ambrosiaLuck1: AmbrosiaUpgradeCalculationConfig<'ambrosiaLuck1'>

    ambrosiaQuarkCube1: AmbrosiaUpgradeCalculationConfig<'ambrosiaQuarkCube1'>
    ambrosiaLuckCube1: AmbrosiaUpgradeCalculationConfig<'ambrosiaLuckCube1'>
    ambrosiaCubeQuark1: AmbrosiaUpgradeCalculationConfig<'ambrosiaCubeQuark1'>
    ambrosiaLuckQuark1: AmbrosiaUpgradeCalculationConfig<'ambrosiaLuckQuark1'>
    ambrosiaCubeLuck1: AmbrosiaUpgradeCalculationConfig<'ambrosiaCubeLuck1'>
    ambrosiaQuarkLuck1: AmbrosiaUpgradeCalculationConfig<'ambrosiaQuarkLuck1'>

    ambrosiaQuarks2: AmbrosiaUpgradeCalculationConfig<'ambrosiaQuarks2'>
    ambrosiaCubes2: AmbrosiaUpgradeCalculationConfig<'ambrosiaCubes2'>
    ambrosiaLuck2: AmbrosiaUpgradeCalculationConfig<'ambrosiaLuck2'>

    ambrosiaQuarks3: AmbrosiaUpgradeCalculationConfig<'ambrosiaQuarks3'>
    ambrosiaQuarks4: AmbrosiaUpgradeCalculationConfig<'ambrosiaQuarks4'>
    ambrosiaCubes3: AmbrosiaUpgradeCalculationConfig<'ambrosiaCubes3'>
    ambrosiaCubes4: AmbrosiaUpgradeCalculationConfig<'ambrosiaCubes4'>
    ambrosiaFreeCubeUpgrades: AmbrosiaUpgradeCalculationConfig<'ambrosiaFreeCubeUpgrades'>
    ambrosiaLuck3: AmbrosiaUpgradeCalculationConfig<'ambrosiaLuck3'>
    ambrosiaLuck4: AmbrosiaUpgradeCalculationConfig<'ambrosiaLuck4'>

    ambrosiaPatreon: AmbrosiaUpgradeCalculationConfig<'ambrosiaPatreon'>

    ambrosiaObtainium1: AmbrosiaUpgradeCalculationConfig<'ambrosiaObtainium1'>
    ambrosiaOffering1: AmbrosiaUpgradeCalculationConfig<'ambrosiaOffering1'>

    ambrosiaHyperflux: AmbrosiaUpgradeCalculationConfig<'ambrosiaHyperflux'>

    ambrosiaBaseOffering1: AmbrosiaUpgradeCalculationConfig<'ambrosiaBaseOffering1'>
    ambrosiaBaseObtainium1: AmbrosiaUpgradeCalculationConfig<'ambrosiaBaseObtainium1'>
    ambrosiaBaseOffering2: AmbrosiaUpgradeCalculationConfig<'ambrosiaBaseOffering2'>
    ambrosiaBaseObtainium2: AmbrosiaUpgradeCalculationConfig<'ambrosiaBaseObtainium2'>

    ambrosiaSingReduction1: AmbrosiaUpgradeCalculationConfig<'ambrosiaSingReduction1'>
    ambrosiaSingReduction2: AmbrosiaUpgradeCalculationConfig<'ambrosiaSingReduction2'>

    ambrosiaInfiniteShopUpgrades1: AmbrosiaUpgradeCalculationConfig<'ambrosiaInfiniteShopUpgrades1'>
    ambrosiaInfiniteShopUpgrades2: AmbrosiaUpgradeCalculationConfig<'ambrosiaInfiniteShopUpgrades2'>
    ambrosiaInfiniteShopUpgrades3: AmbrosiaUpgradeCalculationConfig<'ambrosiaInfiniteShopUpgrades3'>

    ambrosiaTalismanBonusRuneLevel: AmbrosiaUpgradeCalculationConfig<'ambrosiaTalismanBonusRuneLevel'>
    ambrosiaRuneOOMBonus: AmbrosiaUpgradeCalculationConfig<'ambrosiaRuneOOMBonus'>

    ambrosiaBrickOfLead: AmbrosiaUpgradeCalculationConfig<'ambrosiaBrickOfLead'>
    ambrosiaFreeLuckUpgrades: AmbrosiaUpgradeCalculationConfig<'ambrosiaFreeLuckUpgrades'>
    ambrosiaFreeGenerationUpgrades: AmbrosiaUpgradeCalculationConfig<'ambrosiaFreeGenerationUpgrades'>
    ambrosiaFreeRedLuckUpgrades: AmbrosiaUpgradeCalculationConfig<'ambrosiaFreeRedLuckUpgrades'>
    ambrosiaFreeQuarkUpgrades: AmbrosiaUpgradeCalculationConfig<'ambrosiaFreeQuarkUpgrades'>
    ambrosiaFreeObtainiumUpgrades: AmbrosiaUpgradeCalculationConfig<'ambrosiaFreeObtainiumUpgrades'>
    ambrosiaFreeOfferingUpgrades: AmbrosiaUpgradeCalculationConfig<'ambrosiaFreeOfferingUpgrades'>
    twoMind: AmbrosiaUpgradeCalculationConfig<'twoMind'>
}

// The PseudoCoin upgrades the mod reads (getPCoinUpgradeLevel), in the heater export's order
export const pseudoCoinUpgradeNames = [
    'INSTANT_UNLOCK_1',
    'INSTANT_UNLOCK_2',
    'CUBE_BUFF',
    'AMBROSIA_LUCK_BUFF',
    'AMBROSIA_GENERATION_BUFF',
    'GOLDEN_QUARK_BUFF',
    'FREE_UPGRADE_PROMOCODE_BUFF',
    'CORRUPTION_LOADOUT_SLOT_QOL',
    'AMBROSIA_LOADOUT_SLOT_QOL',
    'AUTO_POTION_FREE_POTIONS_QOL',
    'OFFLINE_TIMER_CAP_BUFF',
    'ADD_CODE_CAP_BUFF',
    'BASE_OFFERING_BUFF',
    'BASE_OBTAINIUM_BUFF',
    'RED_GENERATION_BUFF',
    'RED_LUCK_BUFF',
    'PURPLE_LUCK_BUFF',
    'PURPLE_HONEY_BUFF',
    'PURPLE_REACTOR_CAPACITY_BUFF',
] as const;

export type PseudoCoinUpgradeNames = typeof pseudoCoinUpgradeNames[number];

export type AmbrosiaUpgradeRewards = {
    ambrosiaTutorial: { quarks: number; cubes: number }
    ambrosiaQuarks1: { quarks: number }
    ambrosiaCubes1: { cubes: number }
    ambrosiaLuck1: { ambrosiaLuck: number }
    ambrosiaQuarkCube1: { cubes: number }
    ambrosiaLuckCube1: { cubes: number }
    ambrosiaCubeQuark1: { quarks: number }
    ambrosiaLuckQuark1: { quarks: number }
    ambrosiaCubeLuck1: { ambrosiaLuck: number }
    ambrosiaQuarkLuck1: { ambrosiaLuck: number }
    ambrosiaQuarks2: { quarks: number }
    ambrosiaCubes2: { cubes: number }
    ambrosiaLuck2: { ambrosiaLuck: number }
    ambrosiaQuarks3: { quarks: number }
    ambrosiaQuarks4: { quarks: number }
    ambrosiaCubes3: { cubes: number }
    ambrosiaCubes4: { cubes: number }
    ambrosiaFreeCubeUpgrades: { freeCubeUpgrades: number }
    ambrosiaLuck3: { ambrosiaLuck: number }
    ambrosiaLuck4: { ambrosiaLuckPercentage: number }
    ambrosiaPatreon: { blueberryGeneration: number }
    ambrosiaObtainium1: { luckMult: number; obtainiumMult: number }
    ambrosiaOffering1: { luckMult: number; offeringMult: number }
    ambrosiaHyperflux: { hyperFlux: number }
    ambrosiaBaseOffering1: { offering: number }
    ambrosiaBaseObtainium1: { obtainium: number }
    ambrosiaBaseOffering2: { offering: number }
    ambrosiaBaseObtainium2: { obtainium: number }
    ambrosiaSingReduction1: { singularityReduction: number }
    ambrosiaInfiniteShopUpgrades1: { freeLevels: number }
    ambrosiaInfiniteShopUpgrades2: { freeLevels: number }
    ambrosiaInfiniteShopUpgrades3: { freeLevels: number }
    ambrosiaSingReduction2: { singularityReduction: number }
    ambrosiaTalismanBonusRuneLevel: { talismanBonusRuneLevel: number }
    ambrosiaRuneOOMBonus: { runeOOMBonus: number; infiniteAscentOOMBonus: number }
    ambrosiaBrickOfLead: { barRequirementMult: number; additiveLuckMult: number; singularitySpeedMult: number; globalSpeedMult: number; ascensionSpeedMult: number }
    ambrosiaFreeQuarkUpgrades: { freeQuarkUpgrades: number }
    ambrosiaFreeLuckUpgrades: { freeLuckUpgrades: number }
    ambrosiaFreeGenerationUpgrades: { freeGenerationUpgrades: number }
    ambrosiaFreeRedLuckUpgrades: { freeRedLuckUpgrades: number }
    ambrosiaFreeObtainiumUpgrades: { freeObtainiumUpgrades: number }
    ambrosiaFreeOfferingUpgrades: { freeOfferingUpgrades: number }
    twoMind: { twoMindEnabled: number }
}

export type AmbrosiaUpgradeNames = keyof AmbrosiaUpgradeRewards

export enum AntUpgrades {
    AntSpeed = 0,
    Coins = 1,
    Taxes = 2,
    AcceleratorBoosts = 3,
    Multipliers = 4,
    Offerings = 5,
    BuildingCostScale = 6,
    Salvage = 7,
    FreeRunes = 8,
    Obtainium = 9,
    AntSacrifice = 10,
    Mortuus = 11,
    AntELO = 12,
    WowCubes = 13,
    AscensionScore = 14,
    Mortuus2 = 15
}

export enum AntProducers {
    'Workers' = 0,
    'Breeders' = 1,
    'MetaBreeders' = 2,
    'MegaBreeders' = 3,
    'Queens' = 4,
    'LordRoyals' = 5,
    'Almighties' = 6,
    'Disciples' = 7,
    'HolySpirit' = 8
}

export const LAST_ANT_PRODUCER = AntProducers.HolySpirit

export type SingularityChallengeDataKeys =
    | 'noSingularityUpgrades'
    | 'oneChallengeCap'
    | 'limitedAscensions'
    | 'noQuarkUpgrades'
    | 'noOcteracts'
    | 'noAmbrosiaUpgrades'
    | 'limitedTime'
    | 'sadisticPrequel'
    | 'taxmanLastStand'
    | 'barDependence'

export interface ISingularityChallengeData<T = Record<string, number | boolean>> {
    baseReq: number
    maxCompletions: number
    unlockSingularity: number
    HTMLTag: SingularityChallengeDataKeys
    singularityRequirement: (baseReq: number, completions: number) => number
    achievementPointValue: (n: number) => number
    scalingrewardcount: number
    uniquerewardcount: number
    resetTime?: boolean
    completions?: number
    enabled?: boolean
    alternateDescription?: () => string
    highestSingularityCompleted?: number
    effect: (n: number) => T
}

export type AntUpgradeTypeMap = {
    [AntUpgrades.AntSpeed]: { antSpeed: Decimal }
    [AntUpgrades.Coins]: {
        crumbToCoinExp: number
        coinMultiplier: Decimal
    }
    [AntUpgrades.Taxes]: { taxReduction: number }
    [AntUpgrades.AcceleratorBoosts]: { acceleratorBoostMult: number }
    [AntUpgrades.Multipliers]: { multiplierMult: number }
    [AntUpgrades.Offerings]: { offeringMult: number }
    [AntUpgrades.BuildingCostScale]: { construction: number; buildingPowerMult: number }
    [AntUpgrades.Salvage]: { salvage: number }
    [AntUpgrades.FreeRunes]: { freeRuneLevel: number }
    [AntUpgrades.Obtainium]: { obtainiumMult: number }
    [AntUpgrades.AntSacrifice]: {
        antSacrificeMultiplier: number
        elo: number
    }
    [AntUpgrades.Mortuus]: {
        talismanUnlock: boolean
        globalSpeed: number
    }
    [AntUpgrades.AntELO]: {
        antELO: number
        antSacrificeLimitCount: number
    }
    [AntUpgrades.Mortuus2]: {
        talismanLevelIncreaser: number
        talismanEffectBuff: number
        ascensionSpeed: number
    }
    [AntUpgrades.AscensionScore]: {
        cubesBanked: number
    }
    [AntUpgrades.WowCubes]: {
        wowCubes: number
    }
}

export interface RedAmbrosiaUpgradeCalculationCollection {
    tutorial: RedAmbrosiaUpgradeCalculationConfig<'tutorial'>;
    conversionImprovement1: RedAmbrosiaUpgradeCalculationConfig<'conversionImprovement1'>;
    conversionImprovement2: RedAmbrosiaUpgradeCalculationConfig<'conversionImprovement2'>;
    conversionImprovement3: RedAmbrosiaUpgradeCalculationConfig<'conversionImprovement3'>;
    freeTutorialLevels: RedAmbrosiaUpgradeCalculationConfig<'freeTutorialLevels'>;
    freeLevelsRow2: RedAmbrosiaUpgradeCalculationConfig<'freeLevelsRow2'>;
    freeLevelsRow3: RedAmbrosiaUpgradeCalculationConfig<'freeLevelsRow3'>;
    freeLevelsRow4: RedAmbrosiaUpgradeCalculationConfig<'freeLevelsRow4'>;
    freeLevelsRow5: RedAmbrosiaUpgradeCalculationConfig<'freeLevelsRow5'>;
    blueberryGenerationSpeed: RedAmbrosiaUpgradeCalculationConfig<'blueberryGenerationSpeed'>;
    regularLuck: RedAmbrosiaUpgradeCalculationConfig<'regularLuck'>;
    redGenerationSpeed: RedAmbrosiaUpgradeCalculationConfig<'redGenerationSpeed'>;
    redGenerationSpeed2: RedAmbrosiaUpgradeCalculationConfig<'redGenerationSpeed2'>;
    redLuck: RedAmbrosiaUpgradeCalculationConfig<'redLuck'>;
    redAmbrosiaCube: RedAmbrosiaUpgradeCalculationConfig<'redAmbrosiaCube'>;
    redAmbrosiaObtainium: RedAmbrosiaUpgradeCalculationConfig<'redAmbrosiaObtainium'>;
    redAmbrosiaOffering: RedAmbrosiaUpgradeCalculationConfig<'redAmbrosiaOffering'>;
    redAmbrosiaCubeImprover: RedAmbrosiaUpgradeCalculationConfig<'redAmbrosiaCubeImprover'>;
    viscount: RedAmbrosiaUpgradeCalculationConfig<'viscount'>;
    infiniteShopUpgrades: RedAmbrosiaUpgradeCalculationConfig<'infiniteShopUpgrades'>;
    redAmbrosiaAccelerator: RedAmbrosiaUpgradeCalculationConfig<'redAmbrosiaAccelerator'>;
    regularLuck2: RedAmbrosiaUpgradeCalculationConfig<'regularLuck2'>;
    blueberryGenerationSpeed2: RedAmbrosiaUpgradeCalculationConfig<'blueberryGenerationSpeed2'>;
    salvageYinYang: RedAmbrosiaUpgradeCalculationConfig<'salvageYinYang'>;
    blueberries: RedAmbrosiaUpgradeCalculationConfig<'blueberries'>;
    redAmbrosiaFreeAccumulator: RedAmbrosiaUpgradeCalculationConfig<'redAmbrosiaFreeAccumulator'>;
    freeOfferingUpgrades: RedAmbrosiaUpgradeCalculationConfig<'freeOfferingUpgrades'>;
    freeObtainiumUpgrades: RedAmbrosiaUpgradeCalculationConfig<'freeObtainiumUpgrades'>;
    freeCubeUpgrades: RedAmbrosiaUpgradeCalculationConfig<'freeCubeUpgrades'>;
    freeSpeedUpgrades: RedAmbrosiaUpgradeCalculationConfig<'freeSpeedUpgrades'>;
}

export interface HepteractEffectiveValue {
    LIMIT: number;
    DR: number;
}

export type HepteractEffectiveValues = { [key in HepteractType]: HepteractEffectiveValue };

export const hepteractTypeList = [
    'chronos',
    'hyperrealism',
    'quark',
    'challenge',
    'abyss',
    'accelerator',
    'acceleratorBoost',
    'multiplier'
] as const

export type HepteractType = typeof hepteractTypeList[number];

//https://github.com/Pseudo-Corp/SynergismOfficial/blob/master/src/singularity.ts#L2680
export type SingularityDebuffs =
    | 'Offering'
    | 'Obtainium'
    | 'Salvage'
    | 'Global Speed'
    | 'Researches'
    | 'Ant ELO'
    | 'Ascension Speed'
    | 'Cubes'
    | 'Cube Upgrades'
    | 'Platonic Costs'
    | 'Hepteract Costs';

// What a calculation returns with reduce_vals = false: each component by name (the game's stat line name when it has one)
export type HSCalculationComponents = Record<string, number>;

export interface HSCalculationParamOption {
    label: string;
    value: unknown;
}

export interface HSCalculationParams {
    paramName: string;
    paramType: string;
    defaultValue?: any;
    // Shown in the Tools tab instead of the param's name
    label?: string;
    // What the Tools tab offers for it: a list, or one read from the save when the calculation is picked.
    // Without it, a boolean gets true / false and a number a number field: any other param can't be set there.
    options?: readonly HSCalculationParamOption[] | ((data: GameData | undefined) => readonly HSCalculationParamOption[]);
}

export interface HSCalculationDefinition {
    calculationName: string;
    // fnName is intentionally broad because calculation functions may come
    // from HSGameDataAPI or from registered helper providers.
    // TODO later: derive the union from GameDataAPI + actual helper keys
    fnName: string;
    // In the function's order. With supportsReduce, the first one is reduce_vals: the Tools tab's two buttons fill it.
    fnParams: HSCalculationParams[];
    supportsReduce: boolean;
    toolingSupport: boolean;
}

export interface StatLine<T = number | Exclude<DecimalSource, string>> {
    i18n: string
    stat: () => T
    color?: string
    acc?: number
    displayCriterion?: () => boolean
}

export type NumberStatLine = StatLine<number>
