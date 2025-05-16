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

    R_ConsumableEventBuff: CachedValue;
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
}