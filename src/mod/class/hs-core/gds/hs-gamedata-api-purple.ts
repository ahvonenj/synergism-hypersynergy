import type { HSGameDataAPI } from "./hs-gamedata-api";

export type PurpleReactorUpgradeKey =
    | 'tutorial'
    | 'purpleEfficiency1'
    | 'purpleEfficiency2'
    | 'purpleEfficiency3'
    | 'purpleEfficiency4'
    | 'purpleHoneyLuck1'
    | 'purpleHoneyLuck2'
    | 'purpleHoneyLuck3'
    | 'purpleHoneyLuck4'
    | 'purpleHoneyRequirementReduction1'
    | 'purpleHoneyRequirementReduction2'
    | 'purpleHoneyRequirementReduction3'
    | 'purpleHoneyRequirementReduction4'
    | 'purpleHalfLife1'
    | 'purpleHalfLife2'
    | 'purpleHalfLife3'
    | 'purpleHalfLife4'
    | 'paperweight'
    | 'purpleCapacityExpander1'
    | 'purpleCapacityExpander2'
    | 'purpleCapacityExpander3'
    | 'purpleCapacityExpander4'
    | 'obtainium'
    | 'offerings'
    | 'lifetimeHoneyQuarks'
    | 'lifetimeHoneyGlobalSpeed'
    | 'lifetimeHoneyAscensionSpeed'
    | 'lifetimeHoneyAmbrosia'
    | 'lifetimeHoneyRedAmbrosia'
    | 'lifetimeHoneyAntELO'
    | 'lifetimeHoneyRebornELOSpeed'
    | 'purpleQuarkGain';

interface PurpleUpgradeDefinition {
    maxLevel: number;
    costFormula: (level: number) => number;
}

// Names and formulas mirror SynergismOfficial/src/Purple.ts. Saved values are
// cumulative Purple Honey investments, so levels must be reconstructed.
const purpleReactorUpgradeData: Record<PurpleReactorUpgradeKey, PurpleUpgradeDefinition> = {
    tutorial: { maxLevel: 15, costFormula: (level) => level * (level + 1) / 2 },
    purpleEfficiency1: { maxLevel: 20, costFormula: (level) => 3 * level },
    purpleEfficiency2: { maxLevel: 20, costFormula: (level) => 60 * level },
    purpleEfficiency3: { maxLevel: 30, costFormula: (level) => 1_200 * level },
    purpleEfficiency4: { maxLevel: 30, costFormula: (level) => 24_000 * level },
    purpleHoneyLuck1: { maxLevel: 10, costFormula: (level) => 7 * level },
    purpleHoneyLuck2: { maxLevel: 15, costFormula: (level) => 140 * level },
    purpleHoneyLuck3: { maxLevel: 20, costFormula: (level) => 2_800 * level },
    purpleHoneyLuck4: { maxLevel: 25, costFormula: (level) => 56_000 * level },
    purpleHalfLife1: { maxLevel: 50, costFormula: (level) => 12 * level },
    purpleHalfLife2: { maxLevel: 50, costFormula: (level) => 240 * level },
    purpleHalfLife3: { maxLevel: 50, costFormula: (level) => 4_800 * level },
    purpleHalfLife4: { maxLevel: 50, costFormula: (level) => 96_000 * level },
    paperweight: { maxLevel: 100, costFormula: (level) => Math.pow(level, 3) },
    purpleCapacityExpander1: { maxLevel: 10_000, costFormula: (level) => Math.pow(level, 1.1) },
    purpleCapacityExpander2: { maxLevel: 10_000, costFormula: (level) => 10 * Math.pow(level, 1.2) },
    purpleCapacityExpander3: { maxLevel: 10_000, costFormula: (level) => 100 * Math.pow(level, 1.25) },
    purpleCapacityExpander4: { maxLevel: 10_000, costFormula: (level) => 1_000 * Math.pow(level, 1.3) },
    purpleHoneyRequirementReduction1: { maxLevel: 25, costFormula: (level) => 20 * level },
    purpleHoneyRequirementReduction2: { maxLevel: 25, costFormula: (level) => 400 * level },
    purpleHoneyRequirementReduction3: { maxLevel: 25, costFormula: (level) => 8_000 * level },
    purpleHoneyRequirementReduction4: { maxLevel: 25, costFormula: (level) => 160_000 * level },
    obtainium: { maxLevel: 100_000, costFormula: (level) => 10 * Math.pow(level, 1.2) },
    offerings: { maxLevel: 100_000, costFormula: (level) => 10 * Math.pow(level, 1.2) },
    lifetimeHoneyQuarks: { maxLevel: 10, costFormula: (level) => 500 * level },
    lifetimeHoneyGlobalSpeed: { maxLevel: 10, costFormula: (level) => 2_000 * level },
    lifetimeHoneyAscensionSpeed: { maxLevel: 10, costFormula: (level) => 2_000 * level },
    lifetimeHoneyAmbrosia: { maxLevel: 10, costFormula: (level) => 10_000 * level },
    lifetimeHoneyRedAmbrosia: { maxLevel: 15, costFormula: (level) => 10_000 * level },
    lifetimeHoneyAntELO: { maxLevel: 50, costFormula: (level) => 15_000 * level },
    lifetimeHoneyRebornELOSpeed: { maxLevel: 50, costFormula: (level) => 15_000 * level },
    purpleQuarkGain: { maxLevel: 5, costFormula: (level) => 2_000 * (Math.pow(4, level) - 1) / 3 },
};

const purpleAmbrosiaUpgradeData = {
    aries: { maxLevel: 25, costFormula: (level: number) => level * (level + 1) / 2 },
    taurus: { maxLevel: 10, costFormula: (level: number) => 50 * level },
    gemini: { maxLevel: 10, costFormula: (level: number) => 8 * level },
    cancer: { maxLevel: 10, costFormula: (level: number) => 8 * level },
    leo: { maxLevel: 25, costFormula: (level: number) => 125 * level },
    virgo: { maxLevel: 15, costFormula: (level: number) => 60 * level },
    libra: { maxLevel: 1, costFormula: (level: number) => 1001 * level },
    scorpio: { maxLevel: 10, costFormula: (level: number) => 750 * level },
    // Mirrors SynergismOfficial/src/PurpleAmbrosiaUpgrades.ts: the first
    // Sagittarius level costs 40 Purple Ambrosia, then each later level adds 200.
    sagittarius: { maxLevel: 11, costFormula: (level: number) => level > 1 ? 40 + 200 * (level - 1) : 40 * level },
    capricorn: {
        maxLevel: 11,
        costFormula: (level: number) => level > 1 ? 1_000 + 300 * (level - 1) : 1_000 * level,
    },
    aquarius: { maxLevel: 1, costFormula: (level: number) => 3_000 * level },
    pisces: { maxLevel: 1, costFormula: (level: number) => 5_000 * level },
} as const;

export type PurpleAmbrosiaUpgradeKey = keyof typeof purpleAmbrosiaUpgradeData;
export const PURPLE_AMBROSIA_UPGRADE_KEYS = Object.keys(purpleAmbrosiaUpgradeData) as PurpleAmbrosiaUpgradeKey[];

// Mirrors synthesisUpgradeData in SynergismOfficial/src/Synthesis.ts. Each upgrade saves what was invested
// in each resource; a level counts once every resource covers its cumulative cost.
const synthesisUpgradeData = {
    redAmbrosiaReduction: { maxLevel: 500, cumulativeCost: (level: number) => ({ purpleAmbrosia: level, redAmbrosia: 1_250 * level }) },
    purpleHoneyReduction: { maxLevel: 100, cumulativeCost: (level: number) => ({ purpleAmbrosia: 5 * level, purpleHoney: 2_500 * level }) },
    subatomicShavings: { maxLevel: 100, cumulativeCost: (level: number) => ({ purpleAmbrosia: 20 * level, quarks: 1e26 * level }) },
    exceptionalLieGroup: {
        maxLevel: 30,
        cumulativeCost: (level: number) => ({ purpleAmbrosia: 100 * level, octeracts: level === 0 ? 0 : 1e130 * (10 ** level - 1) / 9 }),
    },
} as const;

export type SynthesisUpgradeKey = keyof typeof synthesisUpgradeData;
export const SYNTHESIS_UPGRADE_KEYS = Object.keys(synthesisUpgradeData) as SynthesisUpgradeKey[];

/**
 * Class: PurpleHelper
 * IsExplicitHSModule: No
 * Description:
 *     Purple Reactor upgrades and purple ambrosia (zodiac) upgrades: levels rebuilt from the saved investments, max levels and effects;
 *     purple honey luck and purple honey per extraction.
 * Author: XxMolkxX, Shewchou
 */
export class PurpleHelper {
    readonly #api: HSGameDataAPI;

    constructor(api: HSGameDataAPI) {
        this.#api = api;
    }

    // The highest level up to maxLevel that isAffordable accepts (the cumulative costs grow with the level)
    #reconstructLevel(maxLevel: number, isAffordable: (level: number) => boolean): number {
        let low = 0;
        let high = maxLevel;
        while (low < high) {
            const middle = low + Math.ceil((high - low) / 2);
            if (isAffordable(middle)) low = middle;
            else high = middle - 1;
        }
        return low;
    }

    #reconstructPurpleLevel(invested: number, definition: PurpleUpgradeDefinition, tolerance = 0): number {
        return this.#reconstructLevel(definition.maxLevel, (level) => definition.costFormula(level) <= invested + tolerance);
    }

    getPurpleReactorUpgradeLevel(upgradeKey: PurpleReactorUpgradeKey): number {
        const invested = Number(this.#api.getGameData()?.purpleReactorUpgrades?.[upgradeKey] ?? 0);
        if (!Number.isFinite(invested) || invested < 0) return 0;
        return this.#reconstructPurpleLevel(invested, purpleReactorUpgradeData[upgradeKey], 0.001);
    }

    getPurpleReactorUpgradeMaxLevel(upgradeKey: PurpleReactorUpgradeKey): number {
        return purpleReactorUpgradeData[upgradeKey].maxLevel;
    }

    getPurpleReactorUpgradeEffects(upgradeKey: PurpleReactorUpgradeKey, effectKey: string): number {
        const data = this.#api.getGameData();
        if (!data) return 0;
        const level = this.getPurpleReactorUpgradeLevel(upgradeKey);
        const lifetimePurpleHoney = Number(data.purpleReactor?.lifetimePurpleHoney ?? 0);

        if (upgradeKey === 'tutorial') return 1 + 0.01 * level;
        if (upgradeKey.startsWith('purpleEfficiency') && effectKey === 'purpleEfficiency') {
            return 0.01 * level;
        }
        if (upgradeKey.startsWith('purpleHoneyLuck') && effectKey === 'purpleHoneyLuck') {
            return level;
        }
        // SynergismOfficial/src/Purple.ts: all four catalysts add 3/50 per level.
        if (upgradeKey.startsWith('purpleHalfLife') && effectKey === 'encabulatorSpeed') {
            return 3 / 50 * level;
        }
        if (upgradeKey.startsWith('purpleCapacityExpander')) {
            const capacityPerLevel = upgradeKey === 'purpleCapacityExpander1' ? 125_000
                : upgradeKey === 'purpleCapacityExpander4' ? 175_000 : 150_000;
            if (effectKey === 'ambrosiaCapacity') return capacityPerLevel * level;
            if (effectKey === 'redCapacity') return capacityPerLevel / 1_000 * level;
        }
        if (upgradeKey.startsWith('purpleHoneyRequirementReduction')) return 1 - 0.004 * level;

        const logHoney = Math.log(1 + lifetimePurpleHoney / 100);
        if (upgradeKey === 'lifetimeHoneyAscensionSpeed' && effectKey === 'ascensionSpeedMultiplier') {
            return 1 + +(level > 0) * (0.08 + 0.008 * level) * logHoney;
        }
        if (upgradeKey === 'lifetimeHoneyAmbrosia' && effectKey === 'ambrosiaGenerationSpeed') {
            return 1 + +(level > 0) * (0.02 + 0.002 * level) * logHoney;
        }
        if (upgradeKey === 'lifetimeHoneyRedAmbrosia' && effectKey === 'redAmbrosiaGenerationSpeed') {
            return 1 + +(level > 0) * (0.02 + 0.002 * level) * logHoney;
        }
        return 0;
    }

    calculatePurpleHoneyLuckBreakdown(): Record<string, number> | null {
        const data = this.#api.getGameData();
        if (!data) return null;

        const highestSingularity = Number(data.highestSingularityCount ?? 0);
        const irishAntLuck = highestSingularity >= 285
            ? (highestSingularity - 280) * (highestSingularity >= 293 ? 3 : 2)
            : 0;
        const reactorLuckUpgrades = (['purpleHoneyLuck1', 'purpleHoneyLuck2', 'purpleHoneyLuck3', 'purpleHoneyLuck4'] as const)
            .reduce((total, key) => total + this.getPurpleReactorUpgradeEffects(key, 'purpleHoneyLuck'), 0);

        const components = {
            base: 100,
            pseudoCoin: this.#api.getPCoinUpgradeLevel('PURPLE_LUCK_BUFF') * 5,
            synergismLevel: Math.max(0, this.#api.calculateSynergismLevel() - 299),
            purpleGemTalisman: Number(this.#api.talisman.getTalismanEffects('purpleGem').purpleHoneyLuck ?? 0),
            irishAnt3: irishAntLuck,
            purpleReactorUpgrades: reactorLuckUpgrades,
            taxmanLastStand: this.#api.getSingularityChallengeEffect('taxmanLastStand', 'purpleHoneyLuck'),
            barDependence: this.#api.getSingularityChallengeEffect('barDependence', 'purpleHoneyLuck'),
            horseShoeRune: Number(this.#api.rune.getRuneEffects('horseShoe').purpleHoneyLuck ?? 0),
        };
        return {
            ...components,
            total: Object.values(components).reduce((total, value) => total + value, 0),
        };
    }

    calculatePurpleHoneyLuck(): number {
        return this.calculatePurpleHoneyLuckBreakdown()?.total ?? 0;
    }

    calculatePurpleHoneyPerExtraction(): number {
        const data = this.#api.getGameData();
        if (!data) return 0;

        const highestSingularity = Number(data.highestSingularityCount ?? 0);
        const blueberryEfficiency = highestSingularity < 283
            ? 0
            : Math.floor((this.#api.ambrosia.calculateBlueberryInventory(true) as number) / 2)
                * (highestSingularity >= 289 ? 0.03 : 0.02);
        const reactorEfficiencyUpgrades = (['purpleEfficiency1', 'purpleEfficiency2', 'purpleEfficiency3', 'purpleEfficiency4'] as const)
            .reduce((total, key) => total + this.getPurpleReactorUpgradeEffects(key, 'purpleEfficiency'), 0);

        return 1
            + this.#api.getPCoinUpgradeLevel('PURPLE_HONEY_BUFF') * 0.04
            + blueberryEfficiency
            + reactorEfficiencyUpgrades;
    }

    getPurpleAmbrosiaUpgradeLevel(upgradeKey: PurpleAmbrosiaUpgradeKey): number {
        const invested = Number(this.#api.getGameData()?.purpleAmbrosiaUpgrades?.[upgradeKey] ?? 0);
        if (!Number.isFinite(invested) || invested < 0) return 0;
        return this.#reconstructPurpleLevel(invested, purpleAmbrosiaUpgradeData[upgradeKey]);
    }

    getPurpleAmbrosiaUpgradeMaxLevel(upgradeKey: PurpleAmbrosiaUpgradeKey): number {
        return purpleAmbrosiaUpgradeData[upgradeKey].maxLevel;
    }

    /** Mirrors getSynthesisUpgradeLevel in SynergismOfficial/src/Synthesis.ts. */
    getSynthesisUpgradeLevel(upgradeKey: SynthesisUpgradeKey): number {
        const synthesis = (this.#api.getGameData() as unknown as { synthesisUpgrades?: Record<string, Record<string, number>> } | undefined)?.synthesisUpgrades;
        const invested = synthesis?.[upgradeKey] ?? {};
        const upgrade = synthesisUpgradeData[upgradeKey];
        return this.#reconstructLevel(upgrade.maxLevel, (level) =>
            Object.entries(upgrade.cumulativeCost(level)).every(([resource, cost]) => cost <= Number(invested[resource] ?? 0)));
    }

    getPurpleAmbrosiaUpgradeEffects(upgradeKey: PurpleAmbrosiaUpgradeKey, effectKey: string): number {
        const data = this.#api.getGameData();
        if (!data) return 0;
        const level = this.getPurpleAmbrosiaUpgradeLevel(upgradeKey);
        if (upgradeKey === 'aries' && effectKey === 'universalBarPointMult') {
            const digits = [data.lifetimeAmbrosia, data.lifetimeRedAmbrosia, data.lifetimePurpleAmbrosia ?? 0]
                .reduce((total, ambrosia) => total + (ambrosia > 0 ? Math.floor(Math.log10(ambrosia)) + 1 : 0), 0);
            return 1 + 0.0002 * level * digits;
        }
        if (upgradeKey === 'leo' && effectKey === 'unassignedBlueberyLuck') {
            const unassignedBlueberries = (this.#api.ambrosia.calculateBlueberryInventory(true) as number) - data.spentBlueberries;
            return unassignedBlueberries >= 5 ? unassignedBlueberries * level : 0;
        }
        if (upgradeKey === 'taurus' && effectKey === 'taxDivisor') return 1 + level / 10;
        if (upgradeKey === 'gemini') {
            return effectKey === 'ambrosiaBarPointsOnFill' ? 50_000 * level : 25 * level;
        }
        if (upgradeKey === 'cancer' && effectKey === 'purpleBarPointsOnFill') return 500 * level;
        if (upgradeKey === 'virgo' && effectKey === 'assignedBlueberrySalvage') return data.spentBlueberries * level;
        if (upgradeKey === 'libra' && effectKey === 'overcapToggleUnlocked') return +(level > 0);
        if (upgradeKey === 'scorpio' && effectKey === 'purpleReactorConversionMult') return 1 + level / 10;
        if (upgradeKey === 'sagittarius') {
            if (effectKey === 'horseShoeRuneCoefficient') {
                return level >= 2 ? (1 / 20) * 0.1 * (level - 1) : 0;
            }
            return +(level > 0);
        }
        if (upgradeKey === 'capricorn') {
            if (effectKey === 'antiquitiesOfAntGodCoefficient') {
                return level >= 2 ? (1 / 50) * 0.1 * (level - 1) : 0;
            }
            return +(level > 0);
        }
        if (upgradeKey === 'aquarius' && effectKey === 'infiniteTranscriptionExponent') {
            return level / 100 * this.#api.octeract.getOcteractUpgradeEffect('octeractOneMindImprover', 'ascendSpeedExponent');
        }
        if (upgradeKey === 'pisces' && effectKey === 'platonicBetaAtStart') return +(level > 0);
        return 0;
    }
}
