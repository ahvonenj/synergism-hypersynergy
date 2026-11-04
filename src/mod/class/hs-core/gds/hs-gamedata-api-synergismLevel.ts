import { AntProducers, LAST_ANT_PRODUCER, type AmbrosiaUpgradeNames, type GoldenQuarkUpgradeKey, type OcteractUpgradeKey, type RedAmbrosiaUpgradeKey, type SingularityChallengeDataKeys } from "../../../types/data-types/hs-gamedata-api-types";
import type { GameData } from "../../../types/data-types/hs-player-savedata";
import type { HSGameDataAPI } from "./hs-gamedata-api";
import { dailyFreeLevelCaps } from "./hs-gamedata-api-goldenQuark";
import { dailyOcteractFreeLevelCaps } from "./hs-gamedata-api-octeract";
import { PURPLE_AMBROSIA_UPGRADE_KEYS, SYNTHESIS_UPGRADE_KEYS, type PurpleReactorUpgradeKey, type SynthesisUpgradeKey } from "./hs-gamedata-api-purple";
import { goldenQuarkUpgradeMaxLevels, octeractUpgradeMaxLevels, SINGULARITY_CHALLENGE_DATA } from "./hs-gamedata-tables";

/** Achievement-point inputs copied from SynergismOfficial/src/Shop.ts. */
const QUARK_UPGRADE_MAX_LEVELS: Record<string, number> = {
    offeringEX: 60, offeringAuto: 100, obtainiumEX: 60, obtainiumAuto: 100,
    instantChallenge: 1, antSpeed: 60, cashGrab: 60, shopTalisman: 1,
    seasonPass: 60, challengeExtension: 5, challengeTome: 15, cubeToQuark: 1,
    tesseractToQuark: 1, hypercubeToQuark: 1, seasonPass2: 100, seasonPass3: 100,
    chronometer: 60, infiniteAscent: 1, calculator: 5, calculator2: 12,
    calculator3: 10, calculator4: 10, calculator5: 100, calculator6: 100,
    constantEX: 2, powderEX: 50, chronometer2: 100, chronometer3: 1000,
    seasonPassY: 100, seasonPassZ: 1000, challengeTome2: 5, instantChallenge2: 1,
    cubeToQuarkAll: 100, cashGrab2: 1000, chronometerZ: 1000, offeringEX2: 1000,
    obtainiumEX2: 1000, powderAuto: 100, seasonPassLost: 1000, challenge15Auto: 1,
    extraWarp: 1, autoWarp: 1, improveQuarkHept: 10, improveQuarkHept2: 10,
    improveQuarkHept3: 10, improveQuarkHept4: 10, shopImprovedDaily: 20,
    shopImprovedDaily2: 10, shopImprovedDaily3: 15, shopImprovedDaily4: 25,
    offeringEX3: 1000, obtainiumEX3: 1000, improveQuarkHept5: 7777,
    chronometerInfinity: 1000, seasonPassInfinity: 1000,
    shopSingularityPenaltyDebuff: 4, shopAmbrosiaLuckMultiplier4: 4, calculator7: 50,
    shopOcteractAmbrosiaLuck: 2, shopAmbrosiaGeneration1: 25,
    shopAmbrosiaGeneration2: 30, shopAmbrosiaGeneration3: 35,
    shopAmbrosiaGeneration4: 1000, shopAmbrosiaLuck1: 40, shopAmbrosiaLuck2: 50,
    shopAmbrosiaLuck3: 60, shopAmbrosiaLuck4: 1000, shopRedLuck1: 1000,
    shopRedLuck2: 1000, shopRedLuck3: 1000, shopRedLuck4: 1000,
    shopCashGrabUltra: 5, shopAmbrosiaAccelerator: 5, shopEXUltra: 80,
    shopChronometerS: 1, shopAmbrosiaUltra: 5, shopSingularitySpeedup: 1,
    shopSingularityPotency: 1, shopSadisticRune: 1, shopInfiniteShopUpgrades: 100,
    shopHorseShoe: 1, shopPurpleBarRebate: 10, shopPanthema: 1,
};

/** The achievement points of each synthesis upgrade: apPerInterval every levelsPerAP levels (apValue in SynergismOfficial/src/Synthesis.ts). */
const SYNTHESIS_AP: Record<SynthesisUpgradeKey, { levelsPerAP: number; apPerInterval: number }> = {
    redAmbrosiaReduction: { levelsPerAP: 50, apPerInterval: 5 },
    purpleHoneyReduction: { levelsPerAP: 10, apPerInterval: 5 },
    subatomicShavings: { levelsPerAP: 10, apPerInterval: 5 },
    exceptionalLieGroup: { levelsPerAP: 3, apPerInterval: 5 },
};

/** The achievement points of each Purple Reactor upgrade, from calculatePurpleReactorAP() in SynergismOfficial/src/Purple.ts. */
const PURPLE_REACTOR_AP: Record<PurpleReactorUpgradeKey, { perLevelAP: number; maxLevelAP: number }> = {
    tutorial: { perLevelAP: 1, maxLevelAP: 0 },
    purpleEfficiency1: { perLevelAP: 0.5, maxLevelAP: 5 },
    purpleEfficiency2: { perLevelAP: 0.5, maxLevelAP: 10 },
    purpleEfficiency3: { perLevelAP: 0.5, maxLevelAP: 10 },
    purpleEfficiency4: { perLevelAP: 0.5, maxLevelAP: 15 },
    purpleHoneyLuck1: { perLevelAP: 1, maxLevelAP: 5 },
    purpleHoneyLuck2: { perLevelAP: 1, maxLevelAP: 5 },
    purpleHoneyLuck3: { perLevelAP: 1, maxLevelAP: 5 },
    purpleHoneyLuck4: { perLevelAP: 1, maxLevelAP: 5 },
    purpleHalfLife1: { perLevelAP: 0.2, maxLevelAP: 10 },
    purpleHalfLife2: { perLevelAP: 0.3, maxLevelAP: 10 },
    purpleHalfLife3: { perLevelAP: 0.4, maxLevelAP: 10 },
    purpleHalfLife4: { perLevelAP: 0.5, maxLevelAP: 10 },
    paperweight: { perLevelAP: 0.3, maxLevelAP: 20 },
    purpleCapacityExpander1: { perLevelAP: 0, maxLevelAP: 30 },
    purpleCapacityExpander2: { perLevelAP: 0, maxLevelAP: 40 },
    purpleCapacityExpander3: { perLevelAP: 0, maxLevelAP: 50 },
    purpleCapacityExpander4: { perLevelAP: 0, maxLevelAP: 60 },
    purpleHoneyRequirementReduction1: { perLevelAP: 0.4, maxLevelAP: 5 },
    purpleHoneyRequirementReduction2: { perLevelAP: 0.4, maxLevelAP: 5 },
    purpleHoneyRequirementReduction3: { perLevelAP: 0.4, maxLevelAP: 5 },
    purpleHoneyRequirementReduction4: { perLevelAP: 0.4, maxLevelAP: 5 },
    obtainium: { perLevelAP: 0, maxLevelAP: 40 },
    offerings: { perLevelAP: 0, maxLevelAP: 40 },
    lifetimeHoneyQuarks: { perLevelAP: 1, maxLevelAP: 5 },
    lifetimeHoneyGlobalSpeed: { perLevelAP: 1, maxLevelAP: 0 },
    lifetimeHoneyAscensionSpeed: { perLevelAP: 1, maxLevelAP: 0 },
    lifetimeHoneyAmbrosia: { perLevelAP: 1, maxLevelAP: 5 },
    lifetimeHoneyRedAmbrosia: { perLevelAP: 1, maxLevelAP: 0 },
    lifetimeHoneyAntELO: { perLevelAP: 1, maxLevelAP: 5 },
    lifetimeHoneyRebornELOSpeed: { perLevelAP: 1, maxLevelAP: 0 },
    purpleQuarkGain: { perLevelAP: 2, maxLevelAP: 10 },
};

export type ProgressiveAchievements =
    | 'runeLevel'
    | 'freeRuneLevel'
    | 'quarkUpgrades'
    | 'antMasteries'
    | 'rebornELO'
    | 'talismanRarities'
    | 'singularityCount'
    | 'ambrosiaCount'
    | 'redAmbrosiaCount'
    | 'singularityUpgrades'
    | 'octeractUpgrades'
    | 'redAmbrosiaUpgrades'
    | 'exalts'
    | 'purpleHoneyUpgrades'
    | 'purpleAmbrosiaUpgrades'

/**
 * Class: SynergismLevelHelper
 * IsExplicitHSModule: No
 * Description:
 *     The Synergism level: the achievement points of the achievements and of the progressive achievements
 *     (pointsAwarded in SynergismOfficial/src/Achievements.ts), and the AP calculations they need.
 * Author: XxMolkxX
 */
export class SynergismLevelHelper {
    readonly #api: HSGameDataAPI;

    // calculateSynergismLevel's result for the current data, until the cache generation changes
    #synergismLevel: number | undefined;
    #lastCacheGeneration?: number;

    // The points of each progressive achievement. Its argument is the value the save holds for it, which only some read
    readonly #progressiveAchievementPoints: Record<ProgressiveAchievements, (saved: number) => number>;

    constructor(api: HSGameDataAPI) {
        this.#api = api;
        this.#progressiveAchievementPoints = this.#createProgressiveAchievementPoints();
    }

    get #gameData(): GameData | undefined {
        return this.#api.getGameData();
    }

    #createProgressiveAchievementPoints(): Record<ProgressiveAchievements, (saved: number) => number> {
        return {
            runeLevel: (saved) => Math.min(200, Math.floor(saved / 1000)) + Math.min(400, Math.floor(saved / 2500))
                + Math.min(400, Math.floor(saved / 12500)),
            freeRuneLevel: (saved) => Math.min(100, Math.floor(saved / 250)) + Math.min(200, Math.floor(saved / 750))
                + Math.min(200, Math.floor(saved / 2500)),
            quarkUpgrades: () => this.calculateQuarkUpgradeAchievementAP(),
            antMasteries: () => {
                let pointValue = 0
                const data = this.#gameData;
                if (!data) return 0;
                for (let ant = AntProducers.Workers; ant <= LAST_ANT_PRODUCER; ant++) {
                    const highestMastery = data.ants.masteries[ant]?.highestMastery ?? 0;
                    pointValue += 3 * highestMastery
                    if (highestMastery >= 12) {
                        pointValue += 4
                    }
                }
                return pointValue
            },
            rebornELO: () => {
                const leaderboardELO = this.calculateLeaderboardValue(this.#gameData?.ants.highestRebornELOEver ?? [])
                return Math.min(100, Math.floor(leaderboardELO / 100))
                    + Math.min(150, Math.floor(leaderboardELO / 1000))
                    + Math.min(150, Math.floor(leaderboardELO / 9000))
                    + Math.min(200, Math.floor(leaderboardELO / 75000))
                    + Math.min(400, Math.floor(leaderboardELO / 150000))
            },
            singularityCount: () => {
                const highestSing = this.#gameData?.highestSingularityCount ?? 0;
                return 9 * highestSing
                    + 3 * Math.max(0, highestSing - 100)
                    + 3 * Math.max(0, highestSing - 200)
            },
            ambrosiaCount: (saved) => Math.min(200, Math.floor(saved / 100))
                + Math.min(200, Math.floor(saved / 10000))
                + Math.min(400, Math.floor(400 * Math.sqrt(saved / 1e8))),
            redAmbrosiaCount: (saved) => Math.min(200, Math.floor(saved / 25))
                + Math.min(200, Math.floor(saved / 2500))
                + Math.min(400, Math.floor(400 * saved / 5e6))
                + Math.min(200, Math.floor(200 * saved / 1.25e7)),
            exalts: () => {
                let pointValue = 0
                const data = this.#gameData;
                if (!data) return 0;
                for (const chal of Object.keys(data.singularityChallenges) as SingularityChallengeDataKeys[]) {
                    pointValue += this.getSingChalApReward(chal)
                }
                return pointValue
            },
            singularityUpgrades: () => {
                let pointValue = 0
                const data = this.#gameData;
                if (!data) return 0;
                for (const upgradeKey of Object.keys(goldenQuarkUpgradeMaxLevels) as GoldenQuarkUpgradeKey[]) {
                    const maxLevel = goldenQuarkUpgradeMaxLevels[upgradeKey].maxLevel
                    const playerLevel = this.#api.goldenQuark.getGQUpgradeLevel(upgradeKey)

                    if (playerLevel >= maxLevel) {
                        pointValue += 6
                    }
                    const freeCap = dailyFreeLevelCaps[upgradeKey];
                    if (freeCap !== undefined && this.#api.getSavedUpgradeFreeLevel(data.goldenQuarkUpgrades[upgradeKey]) >= freeCap) {
                        pointValue += 6;
                    }
                }
                return pointValue;
            },
            octeractUpgrades: () => {
                let pointValue = 0
                const data = this.#gameData;
                if (!data) return 0;
                for (const upgradeKey of Object.keys(octeractUpgradeMaxLevels) as OcteractUpgradeKey[]) {
                    const maxLevel = octeractUpgradeMaxLevels[upgradeKey].maxLevel
                    const playerLevel = this.#api.octeract.getOcteractUpgradeLevel(upgradeKey)
                    if (maxLevel !== -1 && playerLevel >= maxLevel) {
                        pointValue += 8
                    }
                    const freeCap = dailyOcteractFreeLevelCaps[upgradeKey];
                    if (freeCap !== undefined && this.#api.getSavedUpgradeFreeLevel(data.octUpgrades[upgradeKey]) >= freeCap) {
                        pointValue += 8;
                    }
                }
                return pointValue
            },
            redAmbrosiaUpgrades: () => {
                let pointValue = 0
                if (!this.#gameData) return 0;
                const ambrosia = this.#api.ambrosia;
                for (const upgradeKey of Object.keys(ambrosia.redAmbrosiaUpgradeCalculationCollection) as RedAmbrosiaUpgradeKey[]) {
                    const maxLevel = ambrosia.redAmbrosiaUpgradeCalculationCollection[upgradeKey].maxLevel
                    const playerLevel = ambrosia.calculateRedAmbrosiaUpgradeValue(upgradeKey);
                    if (maxLevel !== -1 && playerLevel >= maxLevel) {
                        pointValue += 10
                    }
                }
                return pointValue
            },
            purpleHoneyUpgrades: () => this.calculatePurpleReactorAchievementAP(),
            purpleAmbrosiaUpgrades: () => this.calculatePurpleAmbrosiaAchievementAP(),
            talismanRarities: (saved) => 5 * saved,
        };
    }

    getSingChalApReward(chal: SingularityChallengeDataKeys): number {
        const data = this.#gameData;
        if (!data) return 0;

        const chalData = SINGULARITY_CHALLENGE_DATA[chal];
        if (!chalData) return 0;

        const completions = data.singularityChallenges[chal]?.completions ?? 0;

        return chalData.achievementPointValue(completions);
    }

    /** Mirrors quarkUpgradeAP() from SynergismOfficial/src/Shop.ts. */
    calculateQuarkUpgradeAchievementAP(): number {
        const data = this.#gameData;
        if (!data) return 0;
        return Object.entries(QUARK_UPGRADE_MAX_LEVELS).reduce((total, [key, maxLevel]) => {
            const level = Number((data.shopUpgrades as unknown as Record<string, unknown>)[key] ?? 0);
            return total + (level === maxLevel ? 4 : 0);
        }, 0);
    }

    /** Mirrors calculatePurpleReactorAP() from SynergismOfficial/src/Purple.ts. */
    calculatePurpleReactorAchievementAP(): number {
        const data = this.#gameData;
        if (!data) return 0;

        const purple = this.#api.purple;
        let totalAP = 0;
        for (const key of Object.keys(PURPLE_REACTOR_AP) as PurpleReactorUpgradeKey[]) {
            const { perLevelAP, maxLevelAP } = PURPLE_REACTOR_AP[key];
            const level = purple.getPurpleReactorUpgradeLevel(key);
            totalAP += level * perLevelAP;
            if (level >= purple.getPurpleReactorUpgradeMaxLevel(key)) totalAP += maxLevelAP;
        }
        return Math.floor(totalAP);
    }

    /** Mirrors the purpleAmbrosiaUpgrades achievement in SynergismOfficial/src/Achievements.ts. */
    calculatePurpleAmbrosiaAchievementAP(): number {
        if (!this.#gameData) return 0;

        const purple = this.#api.purple;
        let totalAP = 0;

        for (const key of SYNTHESIS_UPGRADE_KEYS) {
            const { levelsPerAP, apPerInterval } = SYNTHESIS_AP[key];
            totalAP += Math.floor(purple.getSynthesisUpgradeLevel(key) / levelsPerAP) * apPerInterval;
        }

        for (const key of PURPLE_AMBROSIA_UPGRADE_KEYS) {
            if (purple.getPurpleAmbrosiaUpgradeLevel(key) >= purple.getPurpleAmbrosiaUpgradeMaxLevel(key)) {
                totalAP += 12;
            }
        }

        // Purple enchantments are worth 5 AP when their official max level is reached.
        const ambrosia = this.#api.ambrosia;
        for (const key of Object.keys(ambrosia.ambrosiaUpgradeCalculationCollection) as AmbrosiaUpgradeNames[]) {
            const level = ambrosia.calculatePurpleAmbrosiaEnchantmentLevel(key);
            const maxLevel = ambrosia.getPurpleAmbrosiaEnchantmentMaxLevel(key);
            if (maxLevel > 0 && level >= maxLevel) totalAP += 5;
        }
        return totalAP;
    }

    calculateLeaderboardValue(leaderboard: ReadonlyArray<{ readonly elo: number; readonly sacrificeId: number }>): number {
        let total = 0
        const LEADERBOARD_WEIGHTS = [1, 0.8, 0.6, 0.4, 0.2]
        for (let i = 0; i < Math.min(leaderboard.length, LEADERBOARD_WEIGHTS.length); i++) {
            total += leaderboard[i].elo * LEADERBOARD_WEIGHTS[i]
        }
        return Math.floor(total)
    }

    /** Each progressive achievement's points, as SynergismOfficial/src/Achievements.ts rewards them. */
    calculateProgressiveAchievementPoints(): Record<ProgressiveAchievements, number> {
        const data = this.#gameData;
        const points = {} as Record<ProgressiveAchievements, number>;
        if (!data) return points;
        for (const k of Object.keys(this.#progressiveAchievementPoints) as ProgressiveAchievements[]) {
            const savedValue = data.progressiveAchievements[k] ?? 0;
            const effectiveValue = k === 'talismanRarities' && savedValue === 0
                ? this.#api.talisman.calculateTalismanRarityTotal()
                : savedValue;
            points[k] = this.#progressiveAchievementPoints[k](effectiveValue);
        }
        return points;
    }

    calculateAchievementPoints(): number {
        const data = this.#gameData;
        if (!data) return 0;
        return this.#api.achievement.achievements.reduce((sum, ach, index) => {
            return sum + (data.achievements[index] ? ach.pointValue : 0)
        }, 0) + Object.values(this.calculateProgressiveAchievementPoints()).reduce((a, b) => a + b, 0);
    }

    /**
     * Cached until the cache generation changes: about 0.1 ms, and an ambrosia rate refresh asks for it 8 times
     * (luck, red luck, red speed, purple honey…). Everything it reads comes in through the _update* methods,
     * which all bump the generation.
     */
    calculateSynergismLevel(): number {
        const data = this.#gameData;
        if (!data) return 0;
        const generation = this.#api.getCacheGeneration();
        if (generation !== this.#lastCacheGeneration) {
            this.#lastCacheGeneration = generation;
            this.#synergismLevel = undefined;
        }
        if (this.#synergismLevel !== undefined) return this.#synergismLevel;

        const achievementPoints = this.calculateAchievementPoints();

        let level: number;
        if (achievementPoints < 2500) {
            level = Math.floor(achievementPoints / 50)
        } else {
            level = 50 + Math.floor((achievementPoints - 2500) / 100)
        }

        this.#synergismLevel = level;
        return level
    }
}
