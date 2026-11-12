export const IF_JUMP_VALUE = 200;
// Sets Challenge.corruptionLevel; ascendAfterCorruption controls whether to ascend now or on a later action.
export const SET_CORRUPTION_LEVEL_VALUE = 403;
// The steps holding a level in Challenge.corruptionLevel
export const isCorruptionLevelStep = (challengeNumber: number): boolean =>
    challengeNumber === SET_CORRUPTION_LEVEL_VALUE;

export const ALLOWED = [
    "start",
    "prestige",
    "transcend",
    "reincarnate",
    "ant",
    "sacrifice",
    "ascension",
] as const;

export const phases = [
    "start",
    "prestige",
    "transcend",
    "reincarnate",
    "ant",
    "sacrifice",
    "ascension",
    "challenge10",
    "challenge11",
    "challenge12",
    "challenge13",
    "challenge14",
    "w5x10max",
    "alpha",
    "p2x1x10",
    "p3x1",
    "beta",
    "1e15-expo",
    "omega",
    "singularity",
    "end",
] as const;

export const AOAG_PHASE_ID = "aoag" as const;
export const AOAG_PHASE_NAME = "AOAG Unlocked Phase" as const;

// Standard input fields that can be enabled per special action.
// "waitBefore" and "comment" are always enabled and not listed here.
export type ModalInput = "challengeNum" | "completions" | "waitTime" | "maxTime" | "corruptionLevel";

export const SPECIAL_ACTIONS = [
    { label: "Exit Transcension challenge",     value: 101, inputs: [] as const },
    { label: "Exit Reincarnation challenge",    value: 102, inputs: [] as const },
    { label: "Exit Ascension challenge",        value: 103, inputs: [] as const },
    { label: "Ascend",                          value: 104, inputs: [] as const },
    
    { label: "Wait",                            value: 151, inputs: [] as const },
    { label: "Ant Sacrifice",                   value: 152, inputs: [] as const },
    { label: "Auto Challenge Toggle",           value: 153, inputs: [] as const },
    { label: "Auto Ant-Sac Toggle",             value: 154, inputs: [] as const },
    { label: "Auto Ascend Toggle",              value: 155, inputs: [] as const },

    { label: "If-jump",                         value: IF_JUMP_VALUE, inputs: [] as const },

    { label: "Max C11",                         value: 211, inputs: ["maxTime"] as const },
    { label: "Max C12",                         value: 212, inputs: ["maxTime"] as const },
    { label: "Max C13",                         value: 213, inputs: ["maxTime"] as const },
    { label: "Max C14",                         value: 214, inputs: ["maxTime"] as const },
    { label: "Store C15",                       value: 215, inputs: [] as const },

    { label: "Ambrosia pre-AOAG loadout",       value: 301, inputs: [] as const },
    { label: "Ambrosia post-AOAG Cube loadout", value: 302, inputs: [] as const },
    { label: "Ambrosia Quark loadout",          value: 303, inputs: [] as const },
    { label: "Ambrosia Obt loadout",            value: 304, inputs: [] as const },
    { label: "Ambrosia Off loadout",            value: 305, inputs: [] as const },
    { label: "Ambrosia Luck loadout",           value: 306, inputs: [] as const },

    // 400 ("Corrup 0*") became a "Set corruption level" step at level 0, 401 ("Corruption level from phase (reapply)")
    // one at its phase's level (HSStrategyManager converts them)
    { label: "Set corruption level", value: SET_CORRUPTION_LEVEL_VALUE, inputs: ["corruptionLevel"] as const },
    // 402 ("Corrup Ants") was removed with the game's 4.4.0: HSStrategyManager removes its steps from old strategies

    { label: "C1 until no more completions within maxTime ms (after initially waiting waitTime ms)",  value: 601, inputs: ["maxTime", "waitTime"] as const },
    { label: "C2 until no more completions within maxTime ms (after initially waiting waitTime ms)",  value: 602, inputs: ["maxTime", "waitTime"] as const },
    { label: "C3 until no more completions within maxTime ms (after initially waiting waitTime ms)",  value: 603, inputs: ["maxTime", "waitTime"] as const },
    { label: "C4 until no more completions within maxTime ms (after initially waiting waitTime ms)",  value: 604, inputs: ["maxTime", "waitTime"] as const },
    { label: "C5 until no more completions within maxTime ms (after initially waiting waitTime ms)",  value: 605, inputs: ["maxTime", "waitTime"] as const },
    { label: "C6 until no more completions within maxTime ms (after initially waiting waitTime ms)",  value: 606, inputs: ["maxTime", "waitTime"] as const },
    { label: "C7 until no more completions within maxTime ms (after initially waiting waitTime ms)",  value: 607, inputs: ["maxTime", "waitTime"] as const },
    { label: "C8 until no more completions within maxTime ms (after initially waiting waitTime ms)",  value: 608, inputs: ["maxTime", "waitTime"] as const },
    { label: "C9 until no more completions within maxTime ms (after initially waiting waitTime ms)",  value: 609, inputs: ["maxTime", "waitTime"] as const },
    { label: "C10 until no more completions within maxTime ms (after initially waiting waitTime ms)", value: 610, inputs: ["maxTime", "waitTime"] as const },

    { label: "Forge Auto-Buy Toggle - Chronos Hept",        value: 701, inputs: [] as const },
    { label: "Forge Auto-Buy Toggle - Hyperreal Hept",      value: 702, inputs: [] as const },
    { label: "Forge Auto-Buy Toggle - Quarks Hept",         value: 703, inputs: [] as const },
    { label: "Forge Auto-Buy Toggle - Challenge Hept",      value: 704, inputs: [] as const },
    { label: "Forge Auto-Buy Toggle - Abyss Hept",          value: 705, inputs: [] as const },
    { label: "Forge Auto-Buy Toggle - Accelerator Hept",    value: 706, inputs: [] as const },
    { label: "Forge Auto-Buy Toggle - Boost Hept",          value: 707, inputs: [] as const },
    { label: "Forge Auto-Buy Toggle - Multiplier Hept",     value: 708, inputs: [] as const },
    { label: "Forge Auto-Buy Toggle - Orbs",                value: 709, inputs: [] as const },

    { label: "Click AOAG",          value: 901, inputs: [] as const },
    { label: "Restart Autosing",    value: 902, inputs: [] as const },
    { label: "Stop Autosing",       value: 903, inputs: [] as const },
] as const;

export type SpecialAction = (typeof SPECIAL_ACTIONS)[number];
export const SPECIAL_ACTION_BY_ID: ReadonlyMap<number, SpecialAction> = new Map(SPECIAL_ACTIONS.map(a => [a.value, a] as const));

export const createDefaultAoagPhase = (): AutosingStrategyPhase => ({
    phaseId: AOAG_PHASE_ID,
    startPhase: "ascension",
    endPhase: "ascension",
    strat: [
        {
            challengeNumber: 103,
            challengeCompletions: 0,
            challengeWaitTime: 0,
            challengeMaxTime: 0
        },
        {
            challengeNumber: 104,
            challengeCompletions: 0,
            challengeWaitTime: 0,
            challengeMaxTime: 0
        },
        {
            challengeNumber: 151,
            challengeCompletions: 0,
            challengeWaitTime: 0,
            challengeMaxTime: 0,
            challengeWaitBefore: 100
        },
        {
            challengeNumber: 152,
            challengeCompletions: 0,
            challengeWaitTime: 0,
            challengeMaxTime: 0
        },
        {
            challengeNumber: 151,
            challengeCompletions: 0,
            challengeWaitTime: 0,
            challengeMaxTime: 0,
            challengeWaitBefore: 1
        },
        {
            challengeNumber: 901,
            challengeCompletions: 0,
            challengeWaitTime: 0,
            challengeMaxTime: 0
        }
    ]
});

export type PhaseOption = (typeof phases)[number];

export interface HSAutosingStrategy {
    strategyName: string;
    strategy: AutosingStrategyPhase[];
    aoagPhase?: AutosingStrategyPhase;
}

export interface AutosingStrategyPhase {
    phaseId?: string;
    startPhase: PhaseOption;
    endPhase: PhaseOption;
    strat: Challenge[];
}

export interface IfJumpParams {
    id: string;
    ifJumpMode?: "challenges" | "stored_c15";  // Mode for if-jump comparison
    ifJumpChallenge: number;   // 1–15 (used in challenges mode)
    ifJumpOperator: ">" | "<";
    ifJumpValue: number;       // Comparison value (used in challenges mode)
    ifJumpMultiplier?: number; // 10^x multiplier (used in stored_c15 mode)
    ifJumpIndex: number;
    // Jumps taken at most per phase pass, then the IF goes on to the next step (absent or 0: no limit)
    ifJumpMaxJumps?: number;
};

export interface Challenge {
    challengeNumber: number;
    challengeCompletions: number;
    challengeWaitTime: number;
    challengeMaxTime: number;
    challengeWaitBefore?: number;
    comment?: string;
    // "Set corruption level" step (SET_CORRUPTION_LEVEL_VALUE)
    corruptionLevel?: number;
    // Corruption actions ascend immediately by default, including older saved strategies; false only loads `next`.
    ascendAfterCorruption?: boolean;

    // Optional special-action params
    ifJump?: IfJumpParams;
};

// With "Record step timings" on (HSAutosingRecorder): autosing's timings, read by the step timings window and the
// headless harness. `sing` is the recorded singularity a timing belongs to (1 = the first one after the start). Times in ms.
export interface HSAutosingTimingStep {
    sing: number;
    phase: string;
    pass: number;
    // In the phase's running list, from 0
    index: number;
    // As the strategy editor and the logs number it, 0 for a step inserted at load
    number: number;
    action: string;
    comment?: string;
    // The step's challengeWaitBefore, and the time actually slept for it
    waitBefore: number;
    waitMs: number;
    ms: number;
    // An if-jump taken: the step jumped to
    jump?: number;
}

export interface HSAutosingTimingPass {
    sing: number;
    phase: string;
    // 1 = the phase's first pass in this singularity
    pass: number;
    ms: number;
    steps: number;
    end: 'done' | 'aoag' | 'stopped';
}

// One #performSingularity: Exalt 2 in and out, teleport, then (after the singularity is recorded)
// the Obt loadout and the wait for an allowed stage
export interface HSAutosingTimingTransition {
    // The singularity it starts
    sing: number;
    ms: number;
    // The part before the singularity is recorded: counted in the previous singularity's time
    msBeforeRecord: number;
}

export interface HSAutosingTimingSingularity {
    sing: number;
    // From the previous record to this one, as the run panel times it
    ms: number;
    goldenQuarks: number;
    quarks: number;
    // C15 score before singing
    c15: number;
    // Time of each phase's passes, summed
    phases: Record<string, number>;
}

// The game internals autosing found at its start ({ label: found }): those its fast paths read, and the others
export interface HSAutosingExposureParts {
    fastPaths: Record<string, boolean>;
    other: Record<string, boolean>;
}

// A phase pass being run
export interface HSAutosingPassRecord {
    sing: number;
    phase: string;
    pass: number;
    startedAt: number;
    steps: number;
    // Time slept for the current step's challengeWaitBefore
    waitMs: number;
}

export interface HSAutosingTimings {
    strategy: string;
    target: number;
    steps: HSAutosingTimingStep[];
    passes: HSAutosingTimingPass[];
    transitions: HSAutosingTimingTransition[];
    singularities: HSAutosingTimingSingularity[];
    // Oldest entries dropped by each list's cap
    dropped: { steps: number; passes: number; transitions: number; singularities: number };
    // The singularity in progress
    current: {
        sing: number;
        startedAt: number;
        passCount: Record<string, number>;
        phaseMs: Record<string, number>;
    };
}

declare global {
    interface Window {
        __HS_autosingTimings?: HSAutosingTimings;
    }
}

export type IsJumpChallenge = Challenge & { ifJump: IfJumpParams };

/** A valid `ifJumpMaxJumps`: absent, or a whole number ≥ 0 (0: no limit). */
export const isIfJumpMaxJumps = (value: unknown): boolean =>
    value === undefined || (typeof value === 'number' && Number.isInteger(value) && value >= 0);
