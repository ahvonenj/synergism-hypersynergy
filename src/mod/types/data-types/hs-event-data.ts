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

export interface GameEvent {
    name: string;
    internalName: string;
    endsAt: number;
}

export enum GameEventType {
    INFO_ALL = "info-all",
    JOIN = "join",
}

export enum GameEventID {
    HAPPY_HOUR_BELL = "HAPPY_HOUR_BELL",
}

export interface GameEventResponse {
    type: string, // "info-all" | "join"
    active?: GameEvent[],
    tips?: number
}

export interface ConsumableGameEvent {
    amount: number;
    ends: number[];
    displayName: string;
}

export type ConsumableGameEvents = {
    [key in GameEventID]: ConsumableGameEvent;
};

/*
{
    "type": "info-all",
    "active": [
        {
            "name": "Happy Hour Bell",
            "internalName": "HAPPY_HOUR_BELL",
            "endsAt": 1747402573000
        },
        {
            "name": "Happy Hour Bell",
            "internalName": "HAPPY_HOUR_BELL",
            "endsAt": 1747402576000
        },
        {
            "name": "Happy Hour Bell",
            "internalName": "HAPPY_HOUR_BELL",
            "endsAt": 1747402846000
        },
        {
            "name": "Happy Hour Bell",
            "internalName": "HAPPY_HOUR_BELL",
            "endsAt": 1747402849000
        }
    ],
    "tips": 0
}
*/