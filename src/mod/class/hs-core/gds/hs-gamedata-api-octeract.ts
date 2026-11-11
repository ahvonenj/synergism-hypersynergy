import { octeractUpgradeMaxLevels } from "./hs-gamedata-tables";
import type { OcteractUpgradeKey } from "../../../types/data-types/hs-gamedata-api-types";
import type { HSGameDataAPI } from "./hs-gamedata-api";

export const dailyOcteractFreeLevelCaps: Partial<Record<OcteractUpgradeKey, number>> = {
    octeractGain: 20_000_000_000,
    octeractGain2: 5_000_000,
    octeractAscensionsOcteractGain: 2,
};

const OCTERACT_LEVEL_TOLERANCE = 1e-10;

/**
 * Class: OcteractHelper
 * IsExplicitHSModule: No
 * Description:
 *     Octeract upgrades: levels, free levels and their softcap, and effects.
 * Author: XxMolkxX, Shewchou
 */
export class OcteractHelper {
    readonly #api: HSGameDataAPI;

    constructor(api: HSGameDataAPI) {
        this.#api = api;
    }

    computeFreeLevelMultiplierOCT(): number {
        return 1 + 0.3 / 100 * (this.#api.getGameData()?.cubeUpgrades[78] ?? 0);
    }

    getOcteractUpgradeLevel(upgradeKey: OcteractUpgradeKey): number {
        const saved = this.#api.getGameData()?.octUpgrades[upgradeKey];
        if (!saved) return 0;

        const definition = octeractUpgradeMaxLevels[upgradeKey];
        const investment = Number(saved.octeractsInvested);
        if (!Number.isFinite(investment)) {
            return investment === Number.POSITIVE_INFINITY ? definition.maxLevel : Number(saved.level ?? 0);
        }
        if (investment < 0) return 0;

        // SynergismOfficial/src/Octeracts.ts setOcteractUpgradeLevels: accumulated costs can round slightly below the
        // cumulative level cost, so the game reads a level with this relative tolerance.
        const budget = investment * (1 + OCTERACT_LEVEL_TOLERANCE);
        let low = 0;
        let high = definition.maxLevel;
        while (low < high) {
            const middle = low + Math.ceil((high - low) / 2);
            if (definition.costFormula(middle) <= budget) low = middle;
            else high = middle - 1;
        }
        return low;
    }

    computeOcteractFreeLevelSoftcap(upgradeKey: OcteractUpgradeKey): number {
        const data = this.#api.getGameData();
        if (!data) return 0;

        const upgrade = data.octUpgrades[upgradeKey];
        if (!upgrade) return 0;

        const freeLevelMult = this.computeFreeLevelMultiplierOCT();
        const cap = upgradeKey === 'octeractAscensionsOcteractGain'
            ? 1 + this.#api.ambrosia.getRedAmbrosiaUpgradeEffects('redAmbrosiaFreeAccumulator').freeAccumulatorLevelCapIncrease
            : dailyOcteractFreeLevelCaps[upgradeKey] ?? Number.POSITIVE_INFINITY;
        const freeLevel = Math.min(cap, Math.max(0, this.#api.getSavedUpgradeFreeLevel(upgrade)));
        return freeLevel * freeLevelMult;
    }

    actualOcteractUpgradeTotalLevels(upgradeKey: OcteractUpgradeKey): number {
        const data = this.#api.getGameData();
        if (!data) return 0;

        const upgrade = data.octUpgrades[upgradeKey];
        if (!upgrade) return 0;
        const definition = octeractUpgradeMaxLevels[upgradeKey];
        if ((data.singularityChallenges.noOcteracts.enabled || data.singularityChallenges.sadisticPrequel.enabled)
            && !definition.qualityOfLife) return 0;

        const level = this.getOcteractUpgradeLevel(upgradeKey);
        const actualFreeLevels = this.computeOcteractFreeLevelSoftcap(upgradeKey);
        if (!Number.isFinite(level) || !Number.isFinite(actualFreeLevels)) return 0;

        if (level >= actualFreeLevels) {
            return actualFreeLevels + level;
        }

        return 2 * Math.sqrt(actualFreeLevels * level);
    }

    getOcteractUpgradeEffect(upgradeKey: OcteractUpgradeKey, effectKey?: string): number {
        const data = this.#api.getGameData();
        if (!data) return 0;

        const upgrade = octeractUpgradeMaxLevels[upgradeKey];
        const totalLevels = this.actualOcteractUpgradeTotalLevels(upgradeKey);
        if (!Number.isFinite(totalLevels)) return 0;

        if ((upgradeKey === 'octeractImprovedAscensionSpeed' || upgradeKey === 'octeractImprovedAscensionSpeed2')
            && effectKey === 'ascensionSpeedMult') {
            return 1 + totalLevels * data.singularityCount / 2000;
        }

        return upgrade.effect ? upgrade.effect(totalLevels, effectKey) : 0;
    }
}
