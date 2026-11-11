export interface HeaterCoinRuneInput {
    exp: string;
    costCoefficient: string;
    levelsPerOOM: number;
    freeLevelsWithoutTalismans: number;
    talismanLevelsPerPower: number;
    effectiveLevelMultiplier: number;
    unlocked: boolean;
}

/** A snapshot calculated as C15, regardless of the exported challenge. Purchased yellow levels and their Purple bonuses are excluded. */
export interface HeaterCoinsC15Input {
    runes: Record<'speed' | 'duplication' | 'thrift' | 'horseShoe', HeaterCoinRuneInput>;
    baselineCoefficientModuleLevel: number;
    baselineTalismanModuleLevel: number;
    taxExponentWithoutRunes: number;
    taxmanMultiplier: number;
    globalSpeedLog10WithoutRunesAndBrick: number;
    speedBlessingPerRuneLevel: number;
    speedSpiritPerRuneLevel: number;
    slowGlobalSpeedPower: number;
    horseShoeShopLevel: number;
    noOcteractsCompletions: number;
    challenge9: boolean;
}

export interface HeaterCoinsC15Context {
    singularity: number;
    exalt: number;
    postAoag: boolean;
    talismanPower: number;
}

export interface HeaterCoinsC15Levels {
    coefficient: number;
    talisman: number;
    stabilizer: number;
    brick: number;
}

export interface HeaterCoinsC15State {
    taxExponent: number;
    globalSpeedLog10: number;
}
