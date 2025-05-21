export interface CalculationCache {
    R_AmbrosiaGenerationShopUpgrade: CachedValue;
    R_AmbrosiaGenerationSingularityUpgrade: CachedValue;
    R_AmbrosiaGenerationOcteractUpgrade: CachedValue;
    R_SingularityMilestoneBlueberries: CachedValue;
    R_DilatedFiveLeafBonus: CachedValue;
    R_SingularityAmbrosiaLuckMilestoneBonus: CachedValue;
    R_AmbrosiaLuckShopUpgrade: CachedValue;
    R_AmbrosiaLuckSingularityUpgrade: CachedValue;
    R_AmbrosiaLuckOcteractUpgrade: CachedValue;
    R_TotalCubes: CachedValue;

    REDAMB_blueberryGenerationSpeed: CachedValue;
    REDAMB_blueberryGenerationSpeed2: CachedValue;
    REDAMB_freeLevelsRow2: CachedValue;
    REDAMB_freeLevelsRow3: CachedValue;
    REDAMB_freeLevelsRow4: CachedValue;
    REDAMB_freeLevelsRow5: CachedValue;
    REDAMB_regularLuck: CachedValue;
    REDAMB_regularLuck2: CachedValue;
    REDAMB_viscount: CachedValue;

    R_CampaignAmbrosiaSpeedBonus: CachedValue;
    R_CampaignLuckBonus: CachedValue;
    R_CookieUpgrade29Luck: CachedValue;
    R_SumOfExaltCompletions: CachedValue;

    R_NumberOfThresholds: CachedValue;
    R_ToNextThreshold: CachedValue;
    R_RequiredBlueberryTime: CachedValue;
    R_RequiredRedAmbrosiaTime: CachedValue;

    EVENTBUFF_Quark: CachedValue;
    EVENTBUFF_GoldenQuark: CachedValue;
    EVENTBUFF_Cubes: CachedValue;
    EVENTBUFF_PowderConversion: CachedValue;
    EVENTBUFF_AscensionSpeed: CachedValue;
    EVENTBUFF_GlobalSpeed:      CachedValue;
    EVENTBUFF_AscensionScore: CachedValue;
    EVENTBUFF_AntSacrifice: CachedValue;
    EVENTBUFF_Offering: CachedValue;
    EVENTBUFF_Obtainium: CachedValue;
    EVENTBUFF_Octeract: CachedValue;
    EVENTBUFF_BlueberryTime: CachedValue;
    EVENTBUFF_AmbrosiaLuck: CachedValue;
    EVENTBUFF_OneMind: CachedValue;

    R_RawAscensionSpeedMult: CachedValue;
    R_HepteractEffective: CachedValue;
    R_AllShopTablets: CachedValue;
    R_LimitedAscensionsDebuff: CachedValue;
    R_SingularityDebuff: CachedValue;
    R_SingularityReductions: CachedValue;
    R_EffectiveSingularities: CachedValue;
    R_AscensionSpeedExponentSpread: CachedValue;

    R_RedAmbrosiaLuck: CachedValue;
    R_LuckConversion: CachedValue;
}

export interface CachedValue {
    value: number | undefined;
    cachedBy: number[]
}

export interface RedAmbrosiaUpgradeCalculationConfig {
    costPerLevel: number, 
    maxLevel: number, 
    costFunction: (n: number, cpl: number) => number,
    levelFunction: (n: number) => number
}

export interface RedAmbrosiaUpgradeCalculationCollection {
    blueberryGenerationSpeed: RedAmbrosiaUpgradeCalculationConfig;
    blueberryGenerationSpeed2: RedAmbrosiaUpgradeCalculationConfig;
    freeLevelsRow2: RedAmbrosiaUpgradeCalculationConfig;
    freeLevelsRow3: RedAmbrosiaUpgradeCalculationConfig;
    freeLevelsRow4: RedAmbrosiaUpgradeCalculationConfig;
    freeLevelsRow5: RedAmbrosiaUpgradeCalculationConfig;
    regularLuck: RedAmbrosiaUpgradeCalculationConfig;
    regularLuck2: RedAmbrosiaUpgradeCalculationConfig;
    viscount: RedAmbrosiaUpgradeCalculationConfig;
    tutorial: RedAmbrosiaUpgradeCalculationConfig;
    conversionImprovement1: RedAmbrosiaUpgradeCalculationConfig;
    conversionImprovement2: RedAmbrosiaUpgradeCalculationConfig;
    conversionImprovement3: RedAmbrosiaUpgradeCalculationConfig;
    freeTutorialLevels: RedAmbrosiaUpgradeCalculationConfig;
    redGenerationSpeed: RedAmbrosiaUpgradeCalculationConfig;
    redLuck: RedAmbrosiaUpgradeCalculationConfig;
    redAmbrosiaCube: RedAmbrosiaUpgradeCalculationConfig;
    redAmbrosiaObtainium: RedAmbrosiaUpgradeCalculationConfig;
    redAmbrosiaOffering: RedAmbrosiaUpgradeCalculationConfig;
    redAmbrosiaCubeImprover: RedAmbrosiaUpgradeCalculationConfig;
    infiniteShopUpgrades: RedAmbrosiaUpgradeCalculationConfig;
    redAmbrosiaAccelerator: RedAmbrosiaUpgradeCalculationConfig;
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
  | 'Global Speed'
  | 'Researches'
  | 'Ascension Speed'
  | 'Cubes'
  | 'Cube Upgrades'
  | 'Platonic Costs'
  | 'Hepteract Costs';