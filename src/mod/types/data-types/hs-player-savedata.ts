/*
    The game's player data, two views of it:
    - GameData: what getGameData() returns, the live player or the parsed save. Every read of game data goes through it.
    - PlayerData: HSGlobal.exposedPlayer, the live player as the patcher exposes it: the same fields, writable.
*/

export type RuneBlessingKeys = string
export type RuneSpiritKeys = string

declare const gameDecimalBrand: unique symbol
declare const gameCountBrand: unique symbol

/**
 * A big number read from getGameData(): a string in a save, the game's own Decimal on the live player
 * (not `instanceof` the mod's Decimal, and `<` on it compares strings). Opaque on purpose:
 * read it with parseGameDataDecimal / parseGameDataNumber (hs-gamedata-utils.ts).
 */
export type GameDecimal = { readonly [gameDecimalBrand]: true }

/**
 * A count read from getGameData() (worlds, cubes): a number in a save, a game class whose valueOf()
 * gives the number on the live player. Opaque on purpose: read it with Number() or parseGameDataNumber.
 */
export type GameCount = { readonly [gameCountBrand]: true }

// The game stores these modes as numbers (enums in its Toggles.ts); old string saves are converted on load.
export enum AutoResetModes {
  amount = 0,
  time = 1
}
export enum AutoAscensionModes {
  amount = 0,
  percentage = 1
}


export type HepteractKeys =
  | 'chronos'
  | 'hyperrealism'
  | 'quark'
  | 'challenge'
  | 'abyss'
  | 'accelerator'
  | 'acceleratorBoost'
  | 'multiplier'

/**
 * Represents the state of an ascension building.
 */
export interface AscendBuilding {
    cost: number;
    owned: number;
    generated: GameDecimal;
    multiplier: number;
}

/**
 * Represents the key-value store for toggleable settings.
 * Keys are usually numbers represented as strings.
 */
export interface Toggles {
    [key: string]: boolean;
}

/**
 * Represents the current challenge state.
 */
export interface CurrentChallenge {
    transcension: number;
    reincarnation: number;
    ascension: number;
}

/**
 * Represents the unlocked features.
 */
export interface Unlocks {
    coinone: boolean
    cointwo: boolean
    cointhree: boolean
    coinfour: boolean
    prestige: boolean
    generation: boolean
    transcend: boolean
    reincarnate: boolean
    rrow1: boolean
    rrow2: boolean
    rrow3: boolean
    rrow4: boolean
    anthill: boolean
    blessings: boolean
    spirits: boolean
    talismans: boolean
    ascensions: boolean
    tesseracts: boolean
    hypercubes: boolean
    platonics: boolean
    hepteracts: boolean
}
/**
 * The raw rune experience of each rune, from which the game derives rune levels (and the mod the heater export's).
 */
export interface Runes {
    speed: GameDecimal;
    duplication: GameDecimal;
    prism: GameDecimal;
    thrift: GameDecimal;
    superiorIntellect: GameDecimal;
    infiniteAscent: GameDecimal;
    antiquities: GameDecimal;
    horseShoe: GameDecimal;
    topHat: GameDecimal;
    finiteDescent: GameDecimal;
}

interface Ants {
    producers: Record<string, {
        purchased: number;
        generated: GameDecimal;
    }>;
    masteries: Record<string, {
        mastery: number;
        highestMastery: number;
    }>;
    upgrades: Record<string, number>;
    crumbs: GameDecimal;
    crumbsThisSacrifice: GameDecimal;
    crumbsEverMade: GameDecimal;
    immortalELO: number;
    rebornELO: number;
    highestRebornELODaily: Array<{
        elo: number;
        sacrificeId: number;
    }>;
    highestRebornELOEver: Array<{
        elo: number;
        sacrificeId: number;
    }>;
    quarksGainedFromAnts: number;
    antSacrificeCount: number;
    currentSacrificeId: number;
    toggles: {
        autobuyProducers: boolean;
        autobuyMasteries: boolean;
        autobuyUpgrades: boolean;
        maxBuyProducers: boolean;
        maxBuyUpgrades: boolean;
        autoSacrificeEnabled: boolean;
        autoSacrificeThreshold: number;
        autoSacrificeMode: number;
        alwaysSacrificeMaxRebornELO: boolean;
        onlySacrificeMaxRebornELO: boolean;
    };
}

/**
 * Represents the levels/quantities of various shop upgrades purchased.
 * Many keys correspond to internal upgrade IDs.
 */
export interface ShopUpgrades {
    offeringPotion: number;
    obtainiumPotion: number;
    offeringEX: number;
    offeringAuto: number;
    obtainiumEX: number;
    obtainiumAuto: number;
    instantChallenge: number;
    antSpeed: number;
    cashGrab: number;
    shopTalisman: number;
    seasonPass: number;
    challengeExtension: number;
    challengeTome: number;
    cubeToQuark: number;
    tesseractToQuark: number;
    hypercubeToQuark: number;
    seasonPass2: number;
    seasonPass3: number;
    chronometer: number;
    infiniteAscent: number;
    calculator: number;
    calculator2: number;
    calculator3: number;
    calculator4: number;
    calculator5: number;
    calculator6: number;
    calculator7: number;
    constantEX: number;
    powderEX: number;
    chronometer2: number;
    chronometer3: number;
    seasonPassY: number;
    seasonPassZ: number;
    challengeTome2: number;
    instantChallenge2: number;
    cashGrab2: number;
    chronometerZ: number;
    cubeToQuarkAll: number;
    offeringEX2: number;
    obtainiumEX2: number;
    seasonPassLost: number;
    powderAuto: number;
    challenge15Auto: number;
    extraWarp: number;
    autoWarp: number;
    improveQuarkHept: number;
    improveQuarkHept2: number;
    improveQuarkHept3: number;
    improveQuarkHept4: number;
    shopImprovedDaily: number;
    shopImprovedDaily2: number;
    shopImprovedDaily3: number;
    shopImprovedDaily4: number;
    offeringEX3: number;
    obtainiumEX3: number;
    improveQuarkHept5: number;
    seasonPassInfinity: number;
    chronometerInfinity: number;
    shopSingularityPenaltyDebuff: number;
    shopAmbrosiaLuckMultiplier4: number;
    shopOcteractAmbrosiaLuck: number;
    shopAmbrosiaGeneration1: number;
    shopAmbrosiaGeneration2: number;
    shopAmbrosiaGeneration3: number;
    shopAmbrosiaGeneration4: number;
    shopAmbrosiaLuck1: number;
    shopAmbrosiaLuck2: number;
    shopAmbrosiaLuck3: number;
    shopAmbrosiaLuck4: number;
    shopCashGrabUltra: number;
    shopAmbrosiaAccelerator: number;
    shopEXUltra: number;
    shopChronometerS: number;
    shopAmbrosiaUltra: number;
    shopPanthema: number;
    shopSingularitySpeedup: number;
    shopSingularityPotency: number;
    shopSadisticRune: number;
    shopRedLuck1: number;
    shopRedLuck2: number;
    shopRedLuck3: number;
    shopRedLuck4: number;
    shopInfiniteShopUpgrades: number;
    shopHorseShoe: number;
    shopPurpleBarRebate?: number;
}

/**
 * Represents consumed potions from the shop.
 */
export interface ShopPotionsConsumed {
    offering: number;
    obtainium: number;
}

/**
 * Represents toggle settings specifically for the shop UI/functionality.
 */
export interface ShopToggles {
    coin: boolean;
    prestige: boolean;
    transcend: boolean;
    generators: boolean;
    reincarnate: boolean;
}

/**
 * Represents the blessings associated with Cubes, Tesseracts, and Hypercubes.
 */
export interface CubeTesseractHypercubeBlessings {
    accelerator: number;
    multiplier: number;
    offering: number;
    runeExp: number;
    obtainium: number;
    antSpeed: number;
    antSacrifice: number;
    antELO: number;
    talismanBonus: number;
    globalSpeed: number;
}

/**
 * Represents the blessings associated with Platonic Cubes.
 */
export interface PlatonicBlessings {
    cubes: number;
    tesseracts: number;
    hypercubes: number;
    platonics: number;
    hypercubeBonus: number;
    taxes: number;
    scoreBonus: number;
    globalSpeed: number;
}

/**
 * Represents the state of a specific Hepteract craft type.
 */
export interface HepteractCraft {
    BAL: number;
    AUTO: boolean;
    TIMES_CAP_EXTENDED: number;
}

/**
 * Contains the state for all Hepteract crafts.
 */
export interface hepteracts {
    chronos: HepteractCraft;
    hyperrealism: HepteractCraft;
    quark: HepteractCraft;
    challenge: HepteractCraft;
    abyss: HepteractCraft;
    accelerator: HepteractCraft;
    acceleratorBoost: HepteractCraft;
    multiplier: HepteractCraft;
}

/**
 * Represents toggle settings for ascension statistics display.
 * Keys are usually numbers represented as strings.
 */
export interface AscStatToggles {
    [key: string]: boolean;
}

/**
 * The corruption state since the game's 4.4.0 update: one level, no longer 8 corruptions.
 */
export interface Corruptions {
    used: number;
    next: number;
    /** The level the current ascension started at (at most used). */
    ascensionLevel: number;
    /** The highest level cleared: the climb goes 1 or 2 levels past it. */
    highestCleared: number;
    autoIncrease: boolean;
    cleanseToHighest: boolean;
    /** Saved levels, one per loadout slot. */
    loadouts: number[];
    /** Best Challenge 10 completions per corruption level (index 0 unused): the source of the campaign tokens. */
    tokenCompletions?: number[];
}

/**
 * Represents a single entry in the ant sacrifice history.
 */
export interface AntSacrificeHistoryEntry {
    date: number; // Timestamp
    seconds: number;
    kind: 'antsacrifice';
    offerings: number;
    obtainium: number;
    antSacrificePointsBefore: number;
    antSacrificePointsAfter: number;
    baseELO: number;
    effectiveELO: number;
    crumbs: string;      // Very large number stored as string
    crumbsPerSecond: string; // Very large number stored as string
}

export interface TalismanShards {
    shard: GameDecimal;
    commonFragment: GameDecimal;
    uncommonFragment: GameDecimal;
    rareFragment: GameDecimal;
    epicFragment: GameDecimal;
    legendaryFragment: GameDecimal;
    mythicalFragment: GameDecimal;
}

export interface Talismans {
    exemption: TalismanShards;
    chronos: TalismanShards;
    midas: TalismanShards;
    metaphysics: TalismanShards;
    polymath: TalismanShards;
    mortuus: TalismanShards;
    plastic: TalismanShards;
    wowSquare: TalismanShards;
    achievement: TalismanShards;
    purpleGem: TalismanShards;
    cookieGrandma: TalismanShards;
    horseShoe: TalismanShards;
}

/**
 * Represents a single entry in the singularity history.
 */
export interface SingularityHistoryEntry {
    seconds: number;
    date: number; // Timestamp
    singularityCount: number;
    quarks: number;
    c15Score: number;
    goldenQuarks: number;
    wowTribs: number;
    tessTribs: number;
    hyperTribs: number;
    platTribs: number;
    octeracts: number;
    quarkHept: number;
    kind: 'singularity';
}

// Define types for other history entries if their structure is known.
// Using 'any' as a placeholder if the structure is unknown or varies.
export type AscendHistoryEntry = any;
export type ResetHistoryEntry = any;

/**
 * Contains arrays of historical events.
 */
export interface History {
    ants: AntSacrificeHistoryEntry[];
    ascend: AscendHistoryEntry[];
    reset: ResetHistoryEntry[];
    singularity: SingularityHistoryEntry[];
}

/**
 * Represents the common structure for singularity and octeract upgrade data.
 */
export interface UpgradeData {
    /** Present only in legacy saves. Current saves reconstruct this from the invested resource. */
    level?: number;
    freeLevel: number;
}

/**
 * Represents data for a specific singularity upgrade.
 */
export interface SingularityUpgradeData extends UpgradeData {
    goldenQuarksInvested: number;
}

/**
 * Contains the state of all singularity upgrades. Keys are internal upgrade names.
 */
export interface goldenQuarkUpgrades {
    goldenQuarks1: SingularityUpgradeData;
    goldenQuarks2: SingularityUpgradeData;
    goldenQuarks3: SingularityUpgradeData;
    starterPack: SingularityUpgradeData;
    wowPass: SingularityUpgradeData;
    cookies: SingularityUpgradeData;
    cookies2: SingularityUpgradeData;
    cookies3: SingularityUpgradeData;
    cookies4: SingularityUpgradeData;
    cookies5: SingularityUpgradeData;
    ascensions: SingularityUpgradeData;
    corruptionFourteen: SingularityUpgradeData;
    corruptionFifteen: SingularityUpgradeData;
    singOfferings1: SingularityUpgradeData;
    singOfferings2: SingularityUpgradeData;
    singOfferings3: SingularityUpgradeData;
    singObtainium1: SingularityUpgradeData;
    singObtainium2: SingularityUpgradeData;
    singObtainium3: SingularityUpgradeData;
    singCubes1: SingularityUpgradeData;
    singCubes2: SingularityUpgradeData;
    singCubes3: SingularityUpgradeData;
    singCitadel: SingularityUpgradeData;
    singCitadel2: SingularityUpgradeData;
    octeractUnlock: SingularityUpgradeData;
    singOcteractPatreonBonus: SingularityUpgradeData;
    offeringAutomatic: SingularityUpgradeData;
    intermediatePack: SingularityUpgradeData;
    advancedPack: SingularityUpgradeData;
    expertPack: SingularityUpgradeData;
    masterPack: SingularityUpgradeData;
    divinePack: SingularityUpgradeData;
    wowPass2: SingularityUpgradeData;
    wowPass3: SingularityUpgradeData;
    potionBuff: SingularityUpgradeData;
    potionBuff2: SingularityUpgradeData;
    potionBuff3: SingularityUpgradeData;
    singChallengeExtension: SingularityUpgradeData;
    singChallengeExtension2: SingularityUpgradeData;
    singChallengeExtension3: SingularityUpgradeData;
    singQuarkImprover1: SingularityUpgradeData;
    singQuarkHepteract: SingularityUpgradeData;
    singQuarkHepteract2: SingularityUpgradeData;
    singQuarkHepteract3: SingularityUpgradeData;
    singOcteractGain: SingularityUpgradeData;
    singOcteractGain2: SingularityUpgradeData;
    singOcteractGain3: SingularityUpgradeData;
    singOcteractGain4: SingularityUpgradeData;
    singOcteractGain5: SingularityUpgradeData;
    platonicTau: SingularityUpgradeData;
    platonicAlpha: SingularityUpgradeData;
    platonicDelta: SingularityUpgradeData;
    platonicPhi: SingularityUpgradeData;
    singFastForward: SingularityUpgradeData;
    singFastForward2: SingularityUpgradeData;
    singAscensionSpeed: SingularityUpgradeData;
    singAscensionSpeed2: SingularityUpgradeData;
    ultimatePen: SingularityUpgradeData;
    halfMind: SingularityUpgradeData;
    oneMind: SingularityUpgradeData;
    wowPass4: SingularityUpgradeData;
    wowPass5: SingularityUpgradeData;
    blueberries: SingularityUpgradeData;
    singAmbrosiaLuck: SingularityUpgradeData;
    singAmbrosiaLuck2: SingularityUpgradeData;
    singAmbrosiaLuck3: SingularityUpgradeData;
    singAmbrosiaLuck4: SingularityUpgradeData;
    singAmbrosiaGeneration: SingularityUpgradeData;
    singAmbrosiaGeneration2: SingularityUpgradeData;
    singAmbrosiaGeneration3: SingularityUpgradeData;
    singAmbrosiaGeneration4: SingularityUpgradeData;
    singBonusTokens1: SingularityUpgradeData;
    singBonusTokens2: SingularityUpgradeData;
    singBonusTokens3: SingularityUpgradeData;
    singBonusTokens4: SingularityUpgradeData;
    singInfiniteShopUpgrades: SingularityUpgradeData;
    singTalismanBonusRunes1: SingularityUpgradeData;
    singTalismanBonusRunes2: SingularityUpgradeData;
    singTalismanBonusRunes3: SingularityUpgradeData;
    singTalismanBonusRunes4: SingularityUpgradeData;
    favoriteUpgrade: SingularityUpgradeData;
}

/**
 * Represents data for a specific octeract upgrade.
 */
export interface OcteractUpgradeData extends UpgradeData {
    octeractsInvested: number;
}

/**
 * Contains the state of all octeract upgrades. Keys are internal upgrade names.
 */
export interface octUpgrades {
    octeractStarter: OcteractUpgradeData;
    octeractGain: OcteractUpgradeData;
    octeractGain2: OcteractUpgradeData;
    octeractQuarkGain: OcteractUpgradeData;
    octeractQuarkGain2: OcteractUpgradeData;
    octeractCorruption: OcteractUpgradeData;
    octeractGQCostReduce: OcteractUpgradeData;
    octeractExportQuarks: OcteractUpgradeData;
    octeractImprovedDaily: OcteractUpgradeData;
    octeractImprovedDaily2: OcteractUpgradeData;
    octeractImprovedDaily3: OcteractUpgradeData;
    octeractImprovedQuarkHept: OcteractUpgradeData;
    octeractImprovedGlobalSpeed: OcteractUpgradeData;
    octeractImprovedAscensionSpeed: OcteractUpgradeData;
    octeractImprovedAscensionSpeed2: OcteractUpgradeData;
    octeractImprovedFree: OcteractUpgradeData;
    octeractImprovedFree2: OcteractUpgradeData;
    octeractImprovedFree3: OcteractUpgradeData;
    octeractImprovedFree4: OcteractUpgradeData;
    octeractSingUpgradeCap: OcteractUpgradeData;
    octeractOfferings1: OcteractUpgradeData;
    octeractObtainium1: OcteractUpgradeData;
    octeractAscensions: OcteractUpgradeData;
    octeractAscensions2: OcteractUpgradeData;
    octeractAscensionsOcteractGain: OcteractUpgradeData;
    octeractFastForward: OcteractUpgradeData;
    octeractAutoPotionSpeed: OcteractUpgradeData;
    octeractAutoPotionEfficiency: OcteractUpgradeData;
    octeractOneMindImprover: OcteractUpgradeData;
    octeractAmbrosiaLuck: OcteractUpgradeData;
    octeractAmbrosiaLuck2: OcteractUpgradeData;
    octeractAmbrosiaLuck3: OcteractUpgradeData;
    octeractAmbrosiaLuck4: OcteractUpgradeData;
    octeractAmbrosiaGeneration: OcteractUpgradeData;
    octeractAmbrosiaGeneration2: OcteractUpgradeData;
    octeractAmbrosiaGeneration3: OcteractUpgradeData;
    octeractAmbrosiaGeneration4: OcteractUpgradeData;
    octeractBonusTokens1: OcteractUpgradeData;
    octeractBonusTokens2: OcteractUpgradeData;
    octeractBonusTokens3: OcteractUpgradeData;
    octeractBonusTokens4: OcteractUpgradeData;
    octeractBlueberries: OcteractUpgradeData;
    octeractInfiniteShopUpgrades: OcteractUpgradeData;
    octeractTalismanLevelCap1: OcteractUpgradeData;
    octeractTalismanLevelCap2: OcteractUpgradeData;
    octeractTalismanLevelCap3: OcteractUpgradeData;
    octeractTalismanLevelCap4: OcteractUpgradeData;
}

/**
 * Represents the completion status of a specific singularity challenge.
 */
export interface SingularityChallengeStatus {
    completions: number;
    highestSingularityCompleted: number;
    enabled: boolean;
    rewards?: SingularityChallengeRewards;
}

export interface SingularityChallengeRewards {
    noSingularityUpgrades: {
        cubes: number;
        goldenQuarks: number;
        blueberries: number;
        shopUpgrade: boolean;
        additiveLuckMult: number;
        shopUpgrade2: boolean;
    };
    oneChallengeCap: {
        blueberrySpeedMult: number;
        capIncrease: number;
        freeCorruptionLevel: number;
        shopUpgrade: boolean;
        reinCapIncrease2: number;
        ascCapIncrease2: number;
    };
    noOcteracts: {
        octeractPow: number;
        offeringBonus: boolean;
        obtainiumBonus: boolean;
        shopUpgrade: boolean;
    };
    limitedAscensions: {
        ascensionSpeedMult: number;
        hepteractCap: boolean;
        shopUpgrade: boolean;
        shopUpgrade2: boolean;
    };
    noAmbrosiaUpgrades: {
        bonusAmbrosia: number;
        blueberries: number;
        additiveLuckMult: number;
        ambrosiaLuck: number;
        redLuck: number;
        blueberrySpeedMult: number;
        redSpeedMult: number;
        shopUpgrade: boolean;
        shopUpgrade2: boolean;
    };
    noQuarkUpgrades: {
        freeObtainiumLevels: number;
        freeOfferingLevels: number;
        freeSpeedLevels: number;
        freeCubeLevels: number;
        freeQuarkLevel: number;
        freeInfinityLevels: number;
        shopUpgrade: boolean;
        topHatUnlock: boolean;
    };
    limitedTime: {
        preserveQuarks: boolean;
        quarkMult: number;
        globalSpeed: number;
        ascensionSpeed: number;
        barRequirementMultiplier: number;
        shopUpgrade: boolean;
        shopUpgrade2: boolean;
    };
    sadisticPrequel: {
        extraFree: number;
        quarkMult: number;
        freeUpgradeMult: number;
        shopUpgrade: boolean;
        shopUpgrade2: boolean;
        shopUpgrade3: boolean;
    };
    taxmanLastStand: {
        horseShoeUnlock: boolean;
        shopUpgrade: boolean;
        talismanUnlock: boolean;
        talismanFreeLevel: number;
        talismanRuneEffect: number;
        purpleHoneyLuck: number;
        purpleBarSize: number;
        antiquityOOM: number;
        horseShoeOOM: number;
    };
    barDependence: {
        purpleAmbrosiaCostReduction: number;
        purpleHoneyLuck: number;
        blueberries: number;
        shopUpgrade: boolean;
    };
}

/**
 * Contains the status of all singularity challenges. Keys are internal challenge names.
 */
export interface SingularityChallenges {
    noSingularityUpgrades: SingularityChallengeStatus;
    oneChallengeCap: SingularityChallengeStatus;
    limitedAscensions: SingularityChallengeStatus;
    noQuarkUpgrades: SingularityChallengeStatus;
    noOcteracts: SingularityChallengeStatus;
    noAmbrosiaUpgrades: SingularityChallengeStatus;
    limitedTime: SingularityChallengeStatus;
    sadisticPrequel: SingularityChallengeStatus;
    taxmanLastStand: SingularityChallengeStatus;
    barDependence: SingularityChallengeStatus;
}

/**
 * Represents data for a specific Ambrosia/Blueberry upgrade.
 */
export interface AmbrosiaUpgradeData extends UpgradeData {
    ambrosiaInvested: number;
    blueberriesInvested: number;
    purpleAmbrosiaInvested?: number;
}

/**
 * Contains the state of all Ambrosia/Blueberry upgrades. Keys are internal upgrade names.
 */
export interface AmbrosiaUpgrades {
    ambrosiaTutorial: AmbrosiaUpgradeData;
    ambrosiaQuarks1: AmbrosiaUpgradeData;
    ambrosiaCubes1: AmbrosiaUpgradeData;
    ambrosiaLuck1: AmbrosiaUpgradeData;
    ambrosiaCubeQuark1: AmbrosiaUpgradeData;
    ambrosiaLuckQuark1: AmbrosiaUpgradeData;
    ambrosiaLuckCube1: AmbrosiaUpgradeData;
    ambrosiaQuarkCube1: AmbrosiaUpgradeData;
    ambrosiaCubeLuck1: AmbrosiaUpgradeData;
    ambrosiaQuarkLuck1: AmbrosiaUpgradeData;
    ambrosiaQuarks2: AmbrosiaUpgradeData;
    ambrosiaCubes2: AmbrosiaUpgradeData;
    ambrosiaLuck2: AmbrosiaUpgradeData;
    ambrosiaQuarks3: AmbrosiaUpgradeData;
    ambrosiaQuarks4: AmbrosiaUpgradeData;
    ambrosiaCubes3: AmbrosiaUpgradeData;
    ambrosiaCubes4: AmbrosiaUpgradeData;
    ambrosiaFreeCubeUpgrades: AmbrosiaUpgradeData;
    ambrosiaLuck3: AmbrosiaUpgradeData;
    ambrosiaLuck4: AmbrosiaUpgradeData;
    ambrosiaPatreon: AmbrosiaUpgradeData;
    ambrosiaObtainium1: AmbrosiaUpgradeData;
    ambrosiaOffering1: AmbrosiaUpgradeData;
    ambrosiaHyperflux: AmbrosiaUpgradeData;
    ambrosiaBaseObtainium1: AmbrosiaUpgradeData;
    ambrosiaBaseOffering1: AmbrosiaUpgradeData;
    ambrosiaBaseObtainium2: AmbrosiaUpgradeData;
    ambrosiaBaseOffering2: AmbrosiaUpgradeData;
    ambrosiaSingReduction1: AmbrosiaUpgradeData;
    ambrosiaInfiniteShopUpgrades1: AmbrosiaUpgradeData;
    ambrosiaInfiniteShopUpgrades2: AmbrosiaUpgradeData;
    ambrosiaInfiniteShopUpgrades3: AmbrosiaUpgradeData;
    ambrosiaSingReduction2: AmbrosiaUpgradeData;
    ambrosiaTalismanBonusRuneLevel: AmbrosiaUpgradeData;
    ambrosiaRuneOOMBonus: AmbrosiaUpgradeData;
    ambrosiaBrickOfLead: AmbrosiaUpgradeData;
    ambrosiaFreeQuarkUpgrades: AmbrosiaUpgradeData;
    ambrosiaFreeLuckUpgrades: AmbrosiaUpgradeData;
    ambrosiaFreeGenerationUpgrades: AmbrosiaUpgradeData;
    ambrosiaFreeRedLuckUpgrades: AmbrosiaUpgradeData;
    ambrosiaFreeObtainiumUpgrades: AmbrosiaUpgradeData;
    ambrosiaFreeOfferingUpgrades: AmbrosiaUpgradeData;
    twoMind: AmbrosiaUpgradeData;
}
/**
 * Represents a single saved blueberry loadout.
 * Keys are internal upgrade names, values are the levels in that loadout.
 */
export interface BlueberryLoadout {
    [upgradeName: string]: number;
}

/**
 * Contains all saved blueberry loadouts.
 * Keys are the loadout number ('1' through '16').
 */
export interface BlueberryLoadouts {
    [loadoutNumber: string]: BlueberryLoadout | {}; // Can be an empty object if not set
}

/**
 * Contains the state of all Red Ambrosia upgrades. Keys are internal upgrade names.
 */
export interface RedAmbrosiaUpgrades {
    tutorial: number;
    conversionImprovement1: number;
    conversionImprovement2: number;
    conversionImprovement3: number;
    freeTutorialLevels: number;
    freeLevelsRow2: number;
    freeLevelsRow3: number;
    freeLevelsRow4: number;
    freeLevelsRow5: number;
    blueberryGenerationSpeed: number;
    regularLuck: number;
    redGenerationSpeed: number;
    redGenerationSpeed2: number;
    redLuck: number;
    redAmbrosiaCube: number;
    redAmbrosiaObtainium: number;
    redAmbrosiaOffering: number;
    redAmbrosiaCubeImprover: number;
    redAmbrosiaFreeAccumulator: number;
    viscount: number;
    infiniteShopUpgrades: number;
    redAmbrosiaAccelerator: number;
    regularLuck2: number;
    blueberryGenerationSpeed2: number;
    salvageYinYang: number;
    blueberries: number;
    freeOfferingUpgrades: number;
    freeObtainiumUpgrades: number;
    freeCubeUpgrades: number;
    freeSpeedUpgrades: number;
}

export interface progressiveAchievements {
    "runeLevel": number;
    "freeRuneLevel": number;
    "quarkUpgrades": number;
    "antMasteries": number;
    "rebornELO": number;
    "singularityCount": number;
    "ambrosiaCount": number;
    "redAmbrosiaCount": number;
    "exalts": number;
    "talismanRarities": number;
    "singularityUpgrades": number;
    "octeractUpgrades": number;
    "redAmbrosiaUpgrades": number;
    "purpleHoneyUpgrades": number;
    "purpleAmbrosiaUpgrades": number;
}

/**
 * What getGameData() returns: the live player when the patcher exposes it, else the parsed save.
 * Fields whose shape differs between the two (found by comparing a live player with its own save in the browser)
 * are typed GameDecimal / GameCount, so every read goes through a helper that accepts both.
 * Deeply read-only: the mod never writes into the game's data through it.
 */
export type GameData = DeepReadonly<GameDataFields>

/**
 * The live player as the patcher exposes it (HSGlobal.exposedPlayer): GameData's fields, writable, for direct reads
 * and writes of the live player. Code that reads game data uses GameData (getGameData()).
 */
export type PlayerData = GameDataFields

/** Every field readonly, down to array items; functions and branded values kept as they are. */
export type DeepReadonly<T> =
    T extends (...args: never[]) => unknown ? T
    : T extends ReadonlyArray<infer U> ? ReadonlyArray<DeepReadonly<U>>
    : T extends object ? { readonly [K in keyof T]: DeepReadonly<T[K]> }
    : T

/**
 * The fields of vanilla's Player (src/types/Synergism.ts) the mod reads. Compared on 2026-10-29 with vanilla's master
 * (commit d1d7d4ab, 2026-10-27): no field here is missing from vanilla, and these vanilla fields aren't declared, as no
 * feature reads them through this type (add one when a feature needs it):
 * - firstPaidCoin … fifthPaidCoin, and the same for Diamonds, Mythos and Particles (Decimals)
 * - multiplierPaid, acceleratorPaid, acceleratorBoostPaid (Decimals)
 * - autoAscendRules
 * - headerLayouts (the header files read it through their own casts)
 * - spentPurpleHoney, purpleUpdateQuarkRefundAwarded
 * - synthesisUpgrades, synthesisAutomationUnlocked, synthesisAutomationEnabled
 */
interface GameDataFields {
    firstPlayed: string; // ISO Date string

    worlds: GameCount;
    coins: GameDecimal;
    coinsThisPrestige: GameDecimal;
    coinsThisTranscension: GameDecimal;
    coinsThisReincarnation: GameDecimal;
    coinsTotal: GameDecimal;

    firstOwnedCoin: number;
    firstGeneratedCoin: GameDecimal;
    firstProduceCoin: number;
    secondOwnedCoin: number;
    secondGeneratedCoin: GameDecimal;
    secondProduceCoin: number;
    thirdOwnedCoin: number;
    thirdGeneratedCoin: GameDecimal;
    thirdProduceCoin: number;
    fourthOwnedCoin: number;
    fourthGeneratedCoin: GameDecimal;
    fourthProduceCoin: number;
    fifthOwnedCoin: number;
    fifthGeneratedCoin: GameDecimal;
    fifthProduceCoin: number;

    firstOwnedDiamonds: number;
    firstGeneratedDiamonds: GameDecimal;
    firstProduceDiamonds: number;
    secondOwnedDiamonds: number;
    secondGeneratedDiamonds: GameDecimal;
    secondProduceDiamonds: number;
    thirdOwnedDiamonds: number;
    thirdGeneratedDiamonds: GameDecimal;
    thirdProduceDiamonds: number;
    fourthOwnedDiamonds: number;
    fourthGeneratedDiamonds: GameDecimal;
    fourthProduceDiamonds: number;
    fifthOwnedDiamonds: number;
    fifthGeneratedDiamonds: GameDecimal;
    fifthProduceDiamonds: number;

    firstOwnedMythos: number;
    firstGeneratedMythos: GameDecimal;
    firstProduceMythos: number;
    secondOwnedMythos: number;
    secondGeneratedMythos: GameDecimal;
    secondProduceMythos: number;
    thirdOwnedMythos: number;
    thirdGeneratedMythos: GameDecimal;
    thirdProduceMythos: number;
    fourthOwnedMythos: number;
    fourthGeneratedMythos: GameDecimal;
    fourthProduceMythos: number;
    fifthOwnedMythos: number;
    fifthGeneratedMythos: GameDecimal;
    fifthProduceMythos: number;

    firstOwnedParticles: number;
    firstGeneratedParticles: GameDecimal;
    firstProduceParticles: number;
    secondOwnedParticles: number;
    secondGeneratedParticles: GameDecimal;
    secondProduceParticles: number;
    thirdOwnedParticles: number;
    thirdGeneratedParticles: GameDecimal;
    thirdProduceParticles: number;
    fourthOwnedParticles: number;
    fourthGeneratedParticles: GameDecimal;
    fourthProduceParticles: number;
    fifthOwnedParticles: number;
    fifthGeneratedParticles: GameDecimal;
    fifthProduceParticles: number;

    ants: Ants;

    // Buildings & Accelerators
    ascendBuilding1: AscendBuilding;
    ascendBuilding2: AscendBuilding;
    ascendBuilding3: AscendBuilding;
    ascendBuilding4: AscendBuilding;
    ascendBuilding5: AscendBuilding;

    multiplierBought: number;
    acceleratorBought: number;
    acceleratorBoostBought: number;

    // Upgrades & Research
    upgrades: number[]; // Array of upgrade levels/statuses (0 or 1)

    prestigeCount: number;
    transcendCount: number;
    reincarnationCount: number;

    prestigePoints: GameDecimal;
    transcendPoints: GameDecimal;
    reincarnationPoints: GameDecimal;
    prestigeShards: GameDecimal;
    transcendShards: GameDecimal;
    reincarnationShards: GameDecimal;

    // Automation & Toggles
    toggles: Toggles;

    // Challenges & Corruptions
    challengecompletions: number[]; // Completions per challenge
    highestchallengecompletions: number[]; // Highest completions per challenge
    challenge15Exponent: number;
    retrychallenges: boolean;
    currentChallenge: CurrentChallenge;
    obtainium: GameDecimal;
    maxObtainium: GameDecimal;

    researches: number[]; // Array of research levels
    unlocks: Unlocks;
    achievements: number[]; // Status per achievement (0 or 1)
    progressiveAchievements: progressiveAchievements;

    // Reset Related Flags & Stats
    prestigenomultiplier: boolean;
    prestigenoaccelerator: boolean;
    transcendnomultiplier: boolean;
    transcendnoaccelerator: boolean;
    reincarnatenomultiplier: boolean;
    reincarnatenoaccelerator: boolean;
    prestigenocoinupgrades: boolean;
    transcendnocoinupgrades: boolean;
    transcendnocoinorprestigeupgrades: boolean;
    reincarnatenocoinupgrades: boolean;
    reincarnatenocoinorprestigeupgrades: boolean;
    reincarnatenocoinprestigeortranscendupgrades: boolean;
    reincarnatenocoinprestigetranscendorgeneratorupgrades: boolean;
    crystalUpgrades: number[];
    crystalUpgradesCost: number[]; // Costs corresponding to crystalUpgrades

    // Runes & Talismans
    runes: Runes;
    runeBlessings: Record<RuneBlessingKeys, GameDecimal>;
    runeSpirits: Record<RuneSpiritKeys, GameDecimal>;
    offerings: GameDecimal;
    maxOfferings: GameDecimal;

    // Timers & Counters
    prestigecounter: number;
    transcendcounter: number;
    reincarnationcounter: number;
    offlinetick: number; // Timestamp (ms) of the last save, only refreshed at a save
    prestigeamount: number;
    transcendamount: number;
    reincarnationamount: number;
    fastestprestige: number;
    fastesttranscend: number;
    fastestreincarnate: number;
    resetToggleModes: {
      prestige: AutoResetModes;
      transcend: AutoResetModes;
      reincarnation: AutoResetModes;
      ascension: AutoAscensionModes;
    };
    tesseractAutoBuyerToggle: boolean;
    tesseractAutoBuyerAmount: number;

    // Buy Amounts
    coinbuyamount: number;
    crystalbuyamount: number;
    mythosbuyamount: number;
    particlebuyamount: number;
    offeringbuyamount: number;
    tesseractbuyamount: number;
    shoptoggles: ShopToggles;

    codes: unknown; // [codeId, redeemed] tuples in a save, a Map on the live player; not read by the mod

    shopUpgrades: ShopUpgrades;

    shopPotionsConsumed: ShopPotionsConsumed;

    shopConfirmationToggle: boolean;
    shopBuyMaxToggle: boolean | 'TEN' | 'ANY';
    shopHideToggle: boolean;
    autoPotionTimer: number;
    autoPotionTimerObtainium: number;

    autoSacrificeToggle: boolean;
    autoBuyFragment: boolean;
    autoFortifyToggle: boolean;
    autoResearchToggle: boolean;
    researchBuyMaxToggle: boolean;
    autoResearchMode: 'cheapest' | 'manual';
    autoResearch: number;
    autoSacrifice: number;
    sacrificeTimer: number;
    quarkstimer: number;
    goldenQuarksTimer: number;

    antSacrificeTimer: number;
    antSacrificeTimerReal: number;

    talismans: Talismans;

    talismanShards: GameDecimal;
    commonFragments: GameDecimal;
    uncommonFragments: GameDecimal;
    rareFragments: GameDecimal;
    epicFragments: GameDecimal;
    legendaryFragments: GameDecimal;
    mythicalFragments: GameDecimal;

    buyTalismanShardPercent: number;
    ascensionCount: number;

    ascensionCounter: number;
    ascensionCounterReal: number;
    ascensionCounterRealReal: number;
    autoOpenCubes: boolean;
    openCubes: number;
    autoOpenTesseracts: boolean;
    openTesseracts: number;
    autoOpenHypercubes: boolean;
    openHypercubes: number;
    autoOpenPlatonicsCubes: boolean;
    openPlatonicsCubes: number;
    cubeUpgrades: (number | null)[]; // Array of cube upgrade levels (starts with null)
    cubeUpgradesBuyMaxToggle: boolean;
    autoCubeUpgradesToggle: boolean;
    autoPlatonicUpgradesToggle: boolean;
    platonicUpgrades: number[];
    maxPlatToggle: boolean;
    wowCubes: GameCount;
    wowTesseracts: GameCount;
    wowHypercubes: GameCount;
    wowPlatonicCubes: GameCount;
    wowAbyssals: number;
    wowOcteracts: number;
    totalWowOcteracts: number;

    cubeBlessings: CubeTesseractHypercubeBlessings;
    tesseractBlessings: CubeTesseractHypercubeBlessings;
    hypercubeBlessings: CubeTesseractHypercubeBlessings;
    platonicBlessings: PlatonicBlessings;

    ascendShards: GameDecimal;
    autoAscend: boolean;
    roombaResearchIndex: number;
    ascStatToggles: AscStatToggles;

    corruptions: Corruptions;

    constantUpgrades: (number | null)[]; // Array of constant upgrade levels (starts with null)
    history: History;
    historyShowPerSecond: boolean;

    autoChallengeRunning: boolean;
    autoChallengeIndex: number;
    autoChallengeToggles: boolean[];
    autoChallengeTimer: {
        start: number
        exit: number
        enter: number
    };

    runeBlessingBuyAmount: number;
    runeSpiritBuyAmount: number;

    autoTesseracts: boolean[]; // Toggles for auto-opening Tesseract types

    saveString: string; // Format string for save file names
    exporttest: string | boolean; // The game refuses to import a save without 'YES!' or true (outside its test builds)

    dayCheck: unknown; // ISO date string in a save, a Date on the live player; not read by the mod
    dayTimer: number;
    cubeOpenedDaily: number;
    cubeQuarkDaily: number;
    tesseractOpenedDaily: number;
    tesseractQuarkDaily: number;
    hypercubeOpenedDaily: number;
    hypercubeQuarkDaily: number;
    platonicCubeOpenedDaily: number;
    platonicCubeQuarkDaily: number;
    
    version: string

    rngCode: number;
    skillCode?: number;
    promoCodeTiming: {
        time: number
    }
    hepteracts: hepteracts;

    overfluxOrbs: number;
    overfluxOrbsAutoBuy: boolean;
    overfluxPowder: number;
    dailyPowderResetUses: number;
    autoWarpCheck: boolean;

    singularityCount: number;
    highestSingularityCount: number;
    singularityCounter: number;
    singularityElevatorTarget: number;
    singularityElevatorSlowClimb: boolean;
    singularityElevatorLocked: boolean;
    goldenQuarks: number;
    quarksThisSingularity: number;
    totalQuarksEver: number;
    hotkeys: Record<string, any>; // Structure depends on defined hotkeys
    iconSet: number;
    notation: 'Pure Scientific' | 'Pure Engineering' | 'Default';
    
    goldenQuarkUpgrades: goldenQuarkUpgrades;
    octUpgrades: octUpgrades;
    ambrosiaUpgrades: AmbrosiaUpgrades;

    dailyCodeUsed: boolean;
    hepteractAutoCraftPercentage: number;
    octeractTimer: number;

    insideSingularityChallenge: boolean;
    singularityChallenges: SingularityChallenges;

    ambrosia: number;
    lifetimeAmbrosia: number;
    purpleAmbrosia?: number;
    lifetimePurpleAmbrosia?: number;

    blueberryTime: number;
    spentBlueberries: number;

    blueberryLoadouts: BlueberryLoadouts;
    blueberryLoadoutMode: 'saveTree' | 'loadTree';

    redAmbrosia: number;
    lifetimeRedAmbrosia: number;
    redAmbrosiaTime: number;
    redAmbrosiaUpgrades: RedAmbrosiaUpgrades;

    purpleHoneyProgress?: number;
    purpleReactor?: {
        purpleHoney: number;
        lifetimePurpleHoney: number;
        storedAmbrosiaBarPoints: number;
        storedRedAmbrosiaBarPoints: number;
        ambrosiaBarPointPercentage: number;
        redAmbrosiaBarPointPercentage: number;
    };
    purpleReactorUpgrades?: Record<string, number>;
    purpleAmbrosiaUpgrades?: Record<string, number>;
    encabulatorOvercapToggle?: boolean;

    singChallengeTimer: number;

    lastExportedSave: number; // Timestamp

    seed: number[];

    stats: {
        totalAddCodesUsed: number;
        talismanShardsThisAscension: GameDecimal;
    }
}
