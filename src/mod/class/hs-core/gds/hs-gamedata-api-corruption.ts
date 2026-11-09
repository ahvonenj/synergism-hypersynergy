import Decimal from "break_infinity.js";
import type { HSCalculationComponents } from "../../../types/data-types/hs-gamedata-api-types";
import { parseGameDataDecimal } from "./hs-gamedata-utils";
import type { HSGameDataAPI } from "./hs-gamedata-api";

// The 9 effects of the corruption level (CorruptionEffectValues in SynergismOfficial/src/Corruptions.ts)
export const CORRUPTION_EFFECT_KEYS = [
    'construction', 'viscosity', 'salvage', 'drought', 'hyperchallenge', 'illiteracy', 'obtainium', 'recession', 'blunders'
] as const;
export type CorruptionEffectKey = typeof CORRUPTION_EFFECT_KEYS[number];

// The effects Challenge 15 applies in place of the corruption level (challenge15CorruptionEffects)
export const CHALLENGE15_CORRUPTION_KEYS = [
    'viscosity', 'drought', 'deflation', 'extinction', 'illiteracy', 'recession', 'dilation', 'hyperchallenge', 'spirit'
] as const;
export type Challenge15CorruptionKey = typeof CHALLENGE15_CORRUPTION_KEYS[number];

// The cube types an ascension gives (CorruptionCubeType)
export const CORRUPTION_CUBE_TYPES = ['cubes', 'tesseracts', 'hypercubes', 'platonics', 'hepteracts', 'octeracts'] as const;
export type CorruptionCubeType = typeof CORRUPTION_CUBE_TYPES[number];

const MIDGAME_LEVEL = 20;
const LATE_GAME_LEVEL = 36;
const ENDGAME_LEVEL = 45;
const TWO_TO_THE_TWENTY = Math.pow(2, 20);
const HYPERCHALLENGE_MID_BASE = Math.pow(1.25, 20);
const HYPERCHALLENGE_END_BASE = HYPERCHALLENGE_MID_BASE * Math.pow(1.5, 25);
const tenToThe = (exponent: number) => Decimal.pow(10, exponent);

// One formula per range: up to 20, up to 45, above (corruptionLevelEffects), on the scaled level
const CORRUPTION_LEVEL_EFFECTS: Record<CorruptionEffectKey, [(l: number) => number | Decimal, (l: number) => number | Decimal, (l: number) => number | Decimal]> = {
    construction: [
        (l) => 1 + 0.2 * l,
        (l) => 5 + 0.4 * (l - MIDGAME_LEVEL),
        (l) => 15 * Math.pow(1.05, l - ENDGAME_LEVEL)
    ],
    viscosity: [
        (l) => Math.pow(3, l),
        (l) => Math.pow(3, 20 + 3 * (l - MIDGAME_LEVEL)),
        (l) => Math.min(1e300, Math.pow(3, 95) * Math.pow(21, 2 * (l - ENDGAME_LEVEL)))
    ],
    salvage: [
        (l) => -62.5 * l,
        (l) => -1250 - 150 * (l - MIDGAME_LEVEL),
        (l) => -5000 - 500 * (l - ENDGAME_LEVEL)
    ],
    drought: [
        (l) => Decimal.pow(2, l),
        (l) => tenToThe(l - MIDGAME_LEVEL).times(TWO_TO_THE_TWENTY),
        (l) => tenToThe(25 + Math.pow(l - ENDGAME_LEVEL, 1.5)).times(TWO_TO_THE_TWENTY)
    ],
    hyperchallenge: [
        (l) => Math.pow(1.25, l),
        (l) => HYPERCHALLENGE_MID_BASE * Math.pow(1.5, l - MIDGAME_LEVEL),
        (l) => Math.min(1e300, HYPERCHALLENGE_END_BASE * Math.pow(10, Math.max(0, l - ENDGAME_LEVEL - 1)))
    ],
    illiteracy: [
        (l) => tenToThe(l),
        (l) => tenToThe(20 + 2 * (l - MIDGAME_LEVEL)),
        (l) => tenToThe(70 + 2 * Math.pow(l - ENDGAME_LEVEL, 1.5))
    ],
    obtainium: [
        (l) => Decimal.pow(2, l),
        (l) => tenToThe(l - MIDGAME_LEVEL).times(TWO_TO_THE_TWENTY),
        (l) => tenToThe(25 + Math.pow(l - ENDGAME_LEVEL, 1.5)).times(TWO_TO_THE_TWENTY)
    ],
    recession: [
        (l) => Math.pow(0.7, l),
        (l) => Math.pow(0.7, l),
        (l) => Math.pow(0.7, ENDGAME_LEVEL + Math.pow(l - ENDGAME_LEVEL, 1.5))
    ],
    blunders: [
        (l) => 0.02 * l,
        (l) => 0.02 * l,
        () => 0.9
    ]
};

// The effective level a cube type needs, hepteracts also Challenge 15's reward (corruptionCubeUnlocks)
const CORRUPTION_CUBE_UNLOCKS: Record<CorruptionCubeType, { level: number; requiresChallenge15: boolean }> = {
    cubes: { level: 0, requiresChallenge15: false },
    tesseracts: { level: 0, requiresChallenge15: false },
    hypercubes: { level: 5, requiresChallenge15: false },
    platonics: { level: 11, requiresChallenge15: false },
    hepteracts: { level: 20, requiresChallenge15: true },
    octeracts: { level: 35, requiresChallenge15: false }
};

// Growth per effective level above the unlock: up to 36, up to 45, above (corruptionCubeRates)
const CORRUPTION_CUBE_RATES: Record<CorruptionCubeType, { base: number; growth: number; lateGrowth?: number; endgameGrowth: number }> = {
    cubes: { base: 1, growth: 1.13, endgameGrowth: 1.05 },
    tesseracts: { base: 1e-3, growth: 1.18, endgameGrowth: 1.07 },
    hypercubes: { base: 1e-3, growth: 1.23, endgameGrowth: 1.1 },
    platonics: { base: 5e-4, growth: 1.28, endgameGrowth: 1.1 },
    hepteracts: { base: 1e-4, growth: 1.45, lateGrowth: 1.1, endgameGrowth: 1.1 },
    octeracts: { base: 1 / (5e19 * 3600 * 24 * 365), growth: 1.45, endgameGrowth: 1.05 }
};

const CHALLENGE15_CORRUPTION_NEUTRAL: Record<Challenge15CorruptionKey, number> = {
    viscosity: 1, drought: 0, deflation: 1, extinction: 1, illiteracy: 1, recession: 1, dilation: 1, hyperchallenge: 1, spirit: 1
};

// Each maxed one of these Platonic upgrades scales the corruption level by -2.5% (platonicCorruptionScaling in
// SynergismOfficial/src/Platonic.ts), with their max levels from platUpgradeBaseCosts
const CORRUPTION_SCALING_PLATONIC_MAX_LEVELS: Record<number, number> = { 6: 10, 7: 10, 8: 5, 9: 1, 11: 1, 12: 10, 13: 1, 14: 1 };
const CORRUPTION_SCALING_PER_MAXED_UPGRADE = 0.025;

/**
 * Class: CorruptionHelper
 * IsExplicitHSModule: No
 * Description:
 *     The corruption level since the game's 4.4.0 update: one level (player.corruptions.used / next) with 9 effects,
 *     the free levels, the effects Challenge 15 applies in its place, and each cube type's rate per level.
 *     Mirrors SynergismOfficial/src/Corruptions.ts.
 * Author: Shewchou
 */
export class CorruptionHelper {
    readonly #api: HSGameDataAPI;

    constructor(api: HSGameDataAPI) {
        this.#api = api;
    }

    getPlatonicCorruptionScaling(): number {
        const data = this.#api.getGameData();
        if (!data) return 1;
        const maxed = Object.entries(CORRUPTION_SCALING_PLATONIC_MAX_LEVELS)
            .filter(([index, maxLevel]) => (data.platonicUpgrades[Number(index)] ?? 0) >= maxLevel).length;
        return 1 - CORRUPTION_SCALING_PER_MAXED_UPGRADE * maxed;
    }

    #corruptionBandBoundary(edge: number): number {
        return Math.floor(edge / this.getPlatonicCorruptionScaling() + 1e-9);
    }

    #corruptionFormulaBranch(level: number): 0 | 1 | 2 {
        if (level <= this.#corruptionBandBoundary(MIDGAME_LEVEL)) return 0;
        return level <= this.#corruptionBandBoundary(ENDGAME_LEVEL) ? 1 : 2;
    }

    /** An effect of a corruption level (corruptionEffect). drought, illiteracy and obtainium are Decimals. */
    getCorruptionEffect(level: number, corruption: CorruptionEffectKey): number | Decimal {
        return CORRUPTION_LEVEL_EFFECTS[corruption][this.#corruptionFormulaBranch(level)](level * this.getPlatonicCorruptionScaling());
    }

    getCorruptionEffectNumber(level: number, corruption: Exclude<CorruptionEffectKey, 'drought' | 'illiteracy' | 'obtainium'>): number {
        return this.getCorruptionEffect(level, corruption) as number;
    }

    /** The value Challenge 15 gives an effect, or its neutral value outside it (challenge15CorruptionEffect). */
    getChallenge15CorruptionEffect(corruption: Challenge15CorruptionKey): number {
        const data = this.#api.getGameData();
        if (!data || data.currentChallenge.ascension !== 15) return CHALLENGE15_CORRUPTION_NEUTRAL[corruption];

        switch (corruption) {
            case 'viscosity':
                return Math.min(0.2 * (1 + data.platonicUpgrades[6] / 30), 1);
            case 'drought':
                return -1250;
            case 'deflation':
                return 1e-25;
            case 'extinction':
                return 10;
            case 'illiteracy': {
                const obtainium = parseGameDataDecimal(data.obtainium);
                const multiplier = obtainium.gte(1)
                    ? 1 + (1 / 100) * data.platonicUpgrades[9] * Math.min(100, Decimal.log10(obtainium))
                    : 1;
                return Math.min(0.2 * multiplier, 1);
            }
            case 'recession':
                return 0.09;
            case 'dilation':
                return 1e-24;
            case 'hyperchallenge':
                return Math.max(1, 100 / (1 + 2 / 5 * data.platonicUpgrades[8]));
            case 'spirit':
                return 3;
        }
    }

    /** A cube type's gain per Cube Bank point before its multipliers (corruptionCubeBase). */
    getCorruptionCubeBase(cube: CorruptionCubeType): number {
        return CORRUPTION_CUBE_RATES[cube].base;
    }

    /** A cube type's multiplier at an effective level, even below its unlock (corruptionCubeRate). */
    getCorruptionCubeRate(cube: CorruptionCubeType, effectiveLevel: number): number {
        const unlockLevel = CORRUPTION_CUBE_UNLOCKS[cube].level;
        const earlyLevels = Math.max(0, Math.min(effectiveLevel, LATE_GAME_LEVEL) - unlockLevel);
        const lateLevels = Math.max(0, Math.min(effectiveLevel, ENDGAME_LEVEL) - Math.max(LATE_GAME_LEVEL, unlockLevel));
        const { growth, lateGrowth = growth, endgameGrowth } = CORRUPTION_CUBE_RATES[cube];
        return Math.pow(growth, earlyLevels) * Math.pow(lateGrowth, lateLevels)
            * Math.pow(endgameGrowth, Math.max(0, effectiveLevel - ENDGAME_LEVEL));
    }

    /** Whether an ascension at an effective level gives a cube type (isCorruptionCubeUnlocked). */
    isCorruptionCubeUnlocked(effectiveLevel: number, cube: CorruptionCubeType): boolean {
        const unlock = CORRUPTION_CUBE_UNLOCKS[cube];
        return effectiveLevel >= unlock.level
            && (!unlock.requiresChallenge15 || this.#api.calculateChallenge15Reward('hepteractsUnlocked') > 0);
    }

    /** The level in use: 0 inside an ascension challenge (activeCorruptionLevel). */
    getActiveCorruptionLevel(): number {
        const data = this.#api.getGameData();
        if (!data || data.currentChallenge.ascension !== 0) return 0;
        return data.corruptions.used;
    }

    /** The level the current ascension started at, if lower (ascensionCorruptionLevel). */
    getAscensionCorruptionLevel(): number {
        const data = this.#api.getGameData();
        if (!data) return 0;
        return Math.min(data.corruptions.ascensionLevel ?? data.corruptions.used, this.getActiveCorruptionLevel());
    }

    // SynergismOfficial/src/Statistics.ts freeCorruptionLevelStats
    calculateFreeCorruptionLevels(reduce_vals = true): number | HSCalculationComponents {
        const data = this.#api.getGameData();
        if (!data) return 0;

        const vals: HSCalculationComponents = {
            'Platonic ALPHA': data.platonicUpgrades[5] > 0 ? 1 : 0,
            'Platonic BETA': data.platonicUpgrades[10] > 0 ? 1 : 0,
            'Platonic OMEGA': data.platonicUpgrades[15] > 0 ? 1 : 0,
            'Platonic Upgrade 4x2': 0.2 * (data.platonicUpgrades[17] ?? 0),
            'Golden Quark Upgrade - Corruption Fourteen': this.#api.goldenQuark.getGQUpgradeEffect('corruptionFourteen') ? 1 : 0,
            'Golden Quark Upgrade - Corruption Fifteen': this.#api.goldenQuark.getGQUpgradeEffect('corruptionFifteen'),
            'Golden Quark Upgrade - Expert Pack': this.#api.goldenQuark.getGQUpgradeEffect('expertPack', 'freeCorruptionLevels'),
            'Golden Quark Upgrade - Master Pack': this.#api.goldenQuark.getGQUpgradeEffect('masterPack', 'freeCorruptionLevels'),
            'Octeracts - Octeract Corruption': 0.5 * this.#api.octeract.getOcteractUpgradeEffect('octeractCorruption'),
            'EXALT - One Challenge Caps': Number(this.#api.getSingularityChallengeEffect('oneChallengeCap', 'freeCorruptionLevel') ?? 0),
            'Cube Upgrade 8x4 (Cx24)': data.cubeUpgrades[74] ?? 0,
            'Cookie Grandma Talisman': Number(this.#api.talisman.getTalismanEffects('cookieGrandma').freeCorruptionLevel ?? 0),
            'Finite Descent Rune': Number(this.#api.rune.getRuneEffects('finiteDescent').corruptionFreeLevels ?? 0),
        };

        return reduce_vals ? Object.values(vals).reduce((a, b) => a + b, 0) : vals;
    }

    /** A level plus the free levels (effectiveCorruptionLevel). */
    getEffectiveCorruptionLevel(level: number): number {
        return level + (this.calculateFreeCorruptionLevels() as number);
    }

    /** The active level plus the free levels, 0 inside an ascension challenge (activeEffectiveCorruptionLevel). */
    getActiveEffectiveCorruptionLevel(): number {
        const data = this.#api.getGameData();
        if (!data || data.currentChallenge.ascension !== 0) return 0;
        return this.getEffectiveCorruptionLevel(this.getActiveCorruptionLevel());
    }

    /** The ascension's level plus the free levels, 0 inside an ascension challenge (ascensionEffectiveCorruptionLevel). */
    getAscensionEffectiveCorruptionLevel(): number {
        const data = this.#api.getGameData();
        if (!data || data.currentChallenge.ascension !== 0) return 0;
        return this.getEffectiveCorruptionLevel(this.getAscensionCorruptionLevel());
    }
}
