/** Types of buffs that can be applied by events. */
export enum EventBuffType {
    Quark = 0,
    GoldenQuark = 1,
    Cubes = 2,
    PowderConversion = 3,
    AscensionSpeed = 4,
    GlobalSpeed = 5,
    AscensionScore = 6,
    AntSacrifice = 7,
    Offering = 8,
    Obtainium = 9,
    Octeract = 10,
    BlueberryTime = 11,
    AmbrosiaLuck = 12,
    OneMind = 13
}

export interface VanillaGlobalEvent {
    name: string[];
    url: string[];
    start: number;
    end: number;
    quark: number;
    goldenQuark: number;
    cubes: number;
    powderConversion: number;
    ascensionSpeed: number;
    globalSpeed: number;
    ascensionScore: number;
    antSacrifice: number;
    offering: number;
    obtainium: number;
    octeract: number;
    blueberryTime: number;
    ambrosiaLuck: number;
    oneMind: number;
    color: string[];
}

/** Internal identifiers for tracked consumables (the keys of the game's allDurableConsumables, Login.ts). */
export enum GameEventID {
    HAPPY_HOUR_BELL = "HAPPY_HOUR_BELL"
}

/** State for a single consumable game event (amount, end times, display name). */
export interface ConsumableGameEvent {
    amount: number;
    ends: number[];
    displayName: string;
}

/** Mapping of GameEventID to their corresponding ConsumableGameEvent state. */
export type ConsumableGameEvents = {
    [key in GameEventID]: ConsumableGameEvent;
};
