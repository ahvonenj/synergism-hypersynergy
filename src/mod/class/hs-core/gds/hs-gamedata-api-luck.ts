import { EventBuffType } from "../../../types/data-types/hs-event-data";
import { parseGameDataDecimal, parseGameDataNumber } from "./hs-gamedata-utils";
import { getTalismanFragments } from "./hs-gamedata-api-talisman";
import type { CalculationCache, CalculationMode, HSCalculationComponents } from "../../../types/data-types/hs-gamedata-api-types";
import type { HSGameDataAPI } from "./hs-gamedata-api";

/**
 * Class: LuckHelper
 * IsExplicitHSModule: No
 * Description:
 *     Ambrosia luck and red ambrosia luck, with each of their sources, and the luck conversion.
 * Author: XxMolkxX, Shewchou
 */
export class LuckHelper {
    readonly #api: HSGameDataAPI;

    constructor(api: HSGameDataAPI) {
        this.#api = api;
    }

    private resolveMode(trueBaseOrMode: boolean | CalculationMode): CalculationMode {
        return typeof trueBaseOrMode === 'string'
            ? trueBaseOrMode
            : trueBaseOrMode ? 'true_base' : 'normal';
    }

    private modeCacheSuffix(mode: CalculationMode): string {
        return mode === 'true_base' ? '_TRUE_BASE' : mode === 'non_ambrosia' ? '_NO_AMB' : '';
    }

    calculateLuck(reduce_vals = true, trueBaseOrMode: boolean | CalculationMode = false): { luckBase: number; luckMult: number; luckTotal: number } | { luckBase: HSCalculationComponents; luckMult: HSCalculationComponents } {
        const data = this.#api.getGameData();
        if (!data) return reduce_vals ? { luckBase: 0, luckMult: 0, luckTotal: 0 } : { luckBase: {}, luckMult: {} };

        const { additiveComponents, rawLuckComponents } = this.getLuckCalculationComponentValues(this.resolveMode(trueBaseOrMode));

        if (reduce_vals) {
            const additivesTotal = Object.values(additiveComponents).reduce((a, b) => a + b, 0);
            const rawTotal = Object.values(rawLuckComponents).reduce((a, b) => a + b, 0);
            return {
                luckBase: rawTotal,
                luckMult: additivesTotal,
                luckTotal: additivesTotal * rawTotal,
            };
        }

        return {
            luckBase: rawLuckComponents,
            luckMult: additiveComponents,
        };
    }

    calculateLuckConversion(reduce_vals = true, trueBaseOrMode: boolean | CalculationMode = false) {
        const data = this.#api.getGameData();
        if (!data) return 0;

        const mode = this.resolveMode(trueBaseOrMode);
        const cacheName = (`LuckConversion${this.modeCacheSuffix(mode)}`) as keyof CalculationCache;
        const calculationVars: number[] = [...this.getLuckConversionCalculationDeps(), mode === 'normal' ? 0 : mode === 'true_base' ? 1 : 2];
        const calculateVals = (): HSCalculationComponents => {
            const c1 = this.#api.ambrosia.getRedAmbrosiaUpgradeEffects('conversionImprovement1').conversionImprovement;
            const c2 = this.#api.ambrosia.getRedAmbrosiaUpgradeEffects('conversionImprovement2').conversionImprovement;
            const c3 = this.#api.ambrosia.getRedAmbrosiaUpgradeEffects('conversionImprovement3').conversionImprovement;
            const effectiveShopRedLuck1 = this.#api.quarkShop.getShopLevel('shopRedLuck1', mode);
            const effectiveShopRedLuck2 = this.#api.quarkShop.getShopLevel('shopRedLuck2', mode);
            const effectiveShopRedLuck3 = this.#api.quarkShop.getShopLevel('shopRedLuck3', mode);
            const effectiveShopRedLuck4 = this.#api.quarkShop.getShopLevel('shopRedLuck4', mode);

            const vals: HSCalculationComponents = {
                'Base Conversion Value': 20,
                'Red Ambrosia - Conversion Improvement I': c1,
                'Red Ambrosia - Conversion Improvement II': c2,
                'Red Ambrosia - Conversion Improvement III': c3,
                'Low Class Dice of Asmodeus': -0.01 * Math.floor(effectiveShopRedLuck1 / 20),
                'Dice of Asmodeus': -0.01 * Math.floor(effectiveShopRedLuck2 / 20),
                'High Class Dice of Asmodeus': -0.01 * Math.floor(effectiveShopRedLuck3 / 20),
                'Elite Class Dice of Asmodeus': -0.01 * Math.floor(effectiveShopRedLuck4 / 100),
            };
            return vals;
        };

        if (!reduce_vals) return calculateVals();
        return this.#api.memoizeCalculation(cacheName, calculationVars, () => Object.values(calculateVals()).reduce((a, b) => a + b, 0));
    }

    calculateRedAmbrosiaLuck(reduce_vals = true, trueBaseOrMode: boolean | CalculationMode = false) {
        const data = this.#api.getGameData();
        if (!data) return 0;

        const mode = this.resolveMode(trueBaseOrMode);
        const cacheName = (`RedAmbrosiaLuck${this.modeCacheSuffix(mode)}`) as keyof CalculationCache;
        const pseudoLvl = this.#api.getPCoinUpgradeLevel('RED_LUCK_BUFF');
        const pseudoLuck = pseudoLvl ? pseudoLvl * 20 : 0;
        const cube77 = data.cubeUpgrades[77] ?? 0;
        const horseShoe = getTalismanFragments(data, 'horseShoe');

        const calculationVars: number[] = [
            pseudoLuck,
            1,
            data.singularityChallenges.noSingularityUpgrades.completions,
            data.highestSingularityCount,
            ...this.#api.quarkShop.getShopLevelDependencies('shopAmbrosiaLuckMultiplier4'),
            data.singularityChallenges.noAmbrosiaUpgrades.completions,
            cube77,
            this.#api.isEventActive() ? 1 : 0,
            this.#api.getVanillaGlobalEvent()?.ambrosiaLuck ?? 0,
            this.#api.getEventData()?.HAPPY_HOUR_BELL.amount ?? 0,
            data.ambrosiaUpgrades.ambrosiaLuck4.ambrosiaInvested,
            data.ambrosiaUpgrades.ambrosiaLuck4.purpleAmbrosiaInvested ?? 0,
            data.lifetimeAmbrosia,
            data.lifetimeRedAmbrosia,
            data.ambrosiaUpgrades.ambrosiaBrickOfLead.ambrosiaInvested,
            data.ambrosiaUpgrades.ambrosiaBrickOfLead.purpleAmbrosiaInvested ?? 0,
            data.singularityChallenges.taxmanLastStand.completions,
            parseGameDataNumber(horseShoe.shard),
            parseGameDataNumber(horseShoe.commonFragment),
            parseGameDataNumber(horseShoe.uncommonFragment),
            parseGameDataNumber(horseShoe.rareFragment),
            parseGameDataNumber(horseShoe.epicFragment),
            parseGameDataNumber(horseShoe.legendaryFragment),
            parseGameDataNumber(horseShoe.mythicalFragment),
            this.#api.getPCoinUpgradeLevel('AMBROSIA_LUCK_BUFF'),
            this.#api.getCampaignData()?.tokens ?? 0,
            data.goldenQuarkUpgrades.singAmbrosiaLuck.goldenQuarksInvested,
            data.goldenQuarkUpgrades.singAmbrosiaLuck2.goldenQuarksInvested,
            data.goldenQuarkUpgrades.singAmbrosiaLuck3.goldenQuarksInvested,
            data.goldenQuarkUpgrades.singAmbrosiaLuck4.goldenQuarksInvested,
            data.highestSingularityCount >= 131 ? 1 : 0,
            data.highestSingularityCount >= 269 ? 1 : 0,
            ...this.getAmbrosiaLuckShopUpgradeCalculationDeps(),
            ...this.getAmbrosiaLuckSingularityUpgradeCalculationDeps(),
            ...this.getAmbrosiaLuckOcteractUpgradeCalculationDeps(),
            ...this.#api.quarkShop.getShopLevelDependencies('shopOcteractAmbrosiaLuck'),
            data.shopUpgrades.shopPanthema,
            data.ambrosiaUpgrades.ambrosiaFreeLuckUpgrades.ambrosiaInvested,
            data.ambrosiaUpgrades.ambrosiaFreeLuckUpgrades.purpleAmbrosiaInvested ?? 0,
            data.redAmbrosiaUpgrades.freeLevelsRow2,
            data.highestSingularityCount,
            data.goldenQuarkUpgrades.singInfiniteShopUpgrades.goldenQuarksInvested,
            data.octUpgrades.octeractInfiniteShopUpgrades.octeractsInvested,
            data.shopUpgrades.shopInfiniteShopUpgrades,
            data.redAmbrosiaUpgrades.infiniteShopUpgrades,
            ...(Object.values(data.singularityChallenges) as any[]).map((c) => c.completions),
            ...(data.singularityChallenges.noAmbrosiaUpgrades.enabled
                ? []
                : [
                    data.redAmbrosiaUpgrades.freeLevelsRow4,
                    data.redAmbrosiaUpgrades.freeLevelsRow5,
                    data.ambrosiaUpgrades.ambrosiaInfiniteShopUpgrades1.ambrosiaInvested,
                    data.ambrosiaUpgrades.ambrosiaInfiniteShopUpgrades1.purpleAmbrosiaInvested ?? 0,
                    data.ambrosiaUpgrades.ambrosiaInfiniteShopUpgrades2.ambrosiaInvested,
                    data.ambrosiaUpgrades.ambrosiaInfiniteShopUpgrades2.purpleAmbrosiaInvested ?? 0,
                    data.ambrosiaUpgrades.ambrosiaInfiniteShopUpgrades3?.ambrosiaInvested ?? 0,
                    data.ambrosiaUpgrades.ambrosiaInfiniteShopUpgrades3?.purpleAmbrosiaInvested ?? 0,
                ]),
            data.purpleAmbrosiaUpgrades?.leo ?? 0,
            data.spentBlueberries,
            data.purpleAmbrosiaUpgrades?.sagittarius ?? 0,
            data.purpleAmbrosiaUpgrades?.capricorn ?? 0,
            data.redAmbrosiaUpgrades.redLuck,
            data.redAmbrosiaUpgrades.viscount,
            ...this.getLuckConversionCalculationDeps(),
            mode === 'normal' ? 0 : mode === 'true_base' ? 1 : 2,
        ].flat();

        const calculateVals = (): HSCalculationComponents => {
            const redLuck = this.#api.ambrosia.getRedAmbrosiaUpgradeEffects('redLuck').redAmbrosiaLuck;
            const viscount = this.#api.ambrosia.getRedAmbrosiaUpgradeEffects('viscount').redLuckBonus;
            const effectiveShopRedLuck1 = this.#api.quarkShop.getShopLevel('shopRedLuck1', mode);
            const effectiveShopRedLuck2 = this.#api.quarkShop.getShopLevel('shopRedLuck2', mode);
            const effectiveShopRedLuck3 = this.#api.quarkShop.getShopLevel('shopRedLuck3', mode);
            const effectiveShopRedLuck4 = this.#api.quarkShop.getShopLevel('shopRedLuck4', mode);
            const luckConversion = this.calculateLuckConversion(true, mode) as number;
            const panthemaRedLuck = this.calculatePanthemaRedLuck(mode);
            const synergismLevelBonus = Math.max(0, (this.#api.calculateSynergismLevel() ?? 0) - 259);

            // SynergismOfficial's red-luck statistic uses calculateAmbrosiaLuck()
            // as its conversion input.  Reuse the mode-aware Ambrosia Luck
            // calculation here so the normal and No-Ambrosia heater exports use
            // exactly the same source value as the game (including its additive
            // multiplier), rather than maintaining a second summation.
            const totalLuck = (this.calculateLuck(true, mode) as { luckBase: number; luckMult: number; luckTotal: number }).luckTotal;
            const vals: HSCalculationComponents = {
                'Base Value': 100,
                'PseudoCoin Upgrade': pseudoLuck,
                'Synergism Level Reward': synergismLevelBonus,
                'Luck from Ambrosia Luck': Math.floor((totalLuck - 100) / luckConversion),
                'Red Ambrosia - The Dice That Decide Your Fate': redLuck,
                'Exalt 5 Reward': this.#api.getSingularityChallengeEffect('noAmbrosiaUpgrades', 'redLuck'),
                'Low Class Dice of Asmodeus': effectiveShopRedLuck1 * 0.05,
                'Dice of Asmodeus': effectiveShopRedLuck2 * 0.075,
                'High Class Dice of Asmodeus': effectiveShopRedLuck3 * 0.1,
                'Elite Class Dice of Asmodeus': effectiveShopRedLuck4 * 0.2,
                'Benefits of being a Viscount': viscount,
                'Horse Shoe Rune Bonus': this.#api.rune.getRuneEffects('horseShoe').redLuck,
                'Horse Shoe Talisman Bonus': this.#api.talisman.getTalismanEffects('horseShoe').redLuck,
                'The Jack of all Trades': panthemaRedLuck,
            };
            return vals;
        };

        if (!reduce_vals) return calculateVals();
        return this.#api.memoizeCalculation(cacheName, calculationVars, () => Object.values(calculateVals()).reduce((a, b) => a + b, 0));
    }

    calculateDilatedFiveLeafBonus() {
        const data = this.#api.getGameData();
        if (!data) return 0;

        const cacheName = 'DilatedFiveLeafBonus' as keyof CalculationCache;
        const calculationVars: number[] = [data.highestSingularityCount];
        return this.#api.memoizeCalculation(cacheName, calculationVars, () => {
            const thresholds = [100, 150, 200, 225, 250, 255, 260, 265, 269, 272];
            let val = thresholds.length / 100;
            for (let i = 0; i < thresholds.length; i++) {
                if (data.highestSingularityCount < thresholds[i]) {
                    val = i / 100;
                    break;
                }
            }

            return val;
        });
    }

    calculateAmbrosiaLuckShopUpgrade(reduce_vals = true, trueBaseOrMode: boolean | CalculationMode = false) {
        const data = this.#api.getGameData();
        if (!data) return 0;

        const mode = this.resolveMode(trueBaseOrMode);
        const cacheName = (`AmbrosiaLuckShopUpgrade${this.modeCacheSuffix(mode)}`) as keyof CalculationCache;
        const calculationVars = [...this.getAmbrosiaLuckShopUpgradeCalculationDeps(), mode === 'normal' ? 0 : mode === 'true_base' ? 1 : 2];
        const calculateVals = (): HSCalculationComponents => {
            // Mirrors Shop.getShopLevel: bonus levels only apply to a purchased shop
            // upgrade, and the No Quark Upgrades challenge disables non-utility levels.
            const effectiveLevels = [
                this.#api.quarkShop.getShopLevel('shopAmbrosiaLuck1', mode),
                this.#api.quarkShop.getShopLevel('shopAmbrosiaLuck2', mode),
                this.#api.quarkShop.getShopLevel('shopAmbrosiaLuck3', mode),
                this.#api.quarkShop.getShopLevel('shopAmbrosiaLuck4', mode),
            ];

            const vals: HSCalculationComponents = {
                'Quark Upgrade - Ambrosia Luck I': 2 * effectiveLevels[0],
                'Quark Upgrade - Ambrosia Luck II': 2 * effectiveLevels[1],
                'Quark Upgrade - Ambrosia Luck III': 2 * effectiveLevels[2],
                'Quark Upgrade - Ambrosia Luck IV': 0.6 * effectiveLevels[3],
            };
            return vals;
        };

        if (!reduce_vals) return calculateVals();
        return this.#api.memoizeCalculation(cacheName, calculationVars, () => Object.values(calculateVals()).reduce((a, b) => a + b, 0));
    }

    calculatePanthemaAmbrosiaLuck(trueBaseOrMode: boolean | CalculationMode = false) {
        const mode = this.resolveMode(trueBaseOrMode);
        const cacheName = (`PanthemaAmbrosiaLuck${this.modeCacheSuffix(mode)}`) as keyof CalculationCache;
        const calculationVars = [...this.getPanthemaAmbrosiaLuckCalculationDeps(), mode === 'normal' ? 0 : mode === 'true_base' ? 1 : 2];
        return this.#api.memoizeCalculation(cacheName, calculationVars, () => this.#api.quarkShop.getShopUpgradeEffects('shopPanthema', 'ambrosiaLuck', mode) as number);
    }

    calculatePanthemaRedLuck(trueBaseOrMode: boolean | CalculationMode = false) {
        const data = this.#api.getGameData();
        if (!data) return 0;

        const mode = this.resolveMode(trueBaseOrMode);
        const cacheName = (`PanthemaRedLuck${this.modeCacheSuffix(mode)}`) as keyof CalculationCache;
        const calculationVars: number[] = [
            data.shopUpgrades.shopPanthema,
            data.ambrosiaUpgrades.ambrosiaFreeRedLuckUpgrades.ambrosiaInvested,
            data.ambrosiaUpgrades.ambrosiaFreeRedLuckUpgrades.purpleAmbrosiaInvested ?? 0,
            data.redAmbrosiaUpgrades.freeLevelsRow2,
            data.highestSingularityCount,
            data.goldenQuarkUpgrades.singInfiniteShopUpgrades.goldenQuarksInvested,
            data.octUpgrades.octeractInfiniteShopUpgrades.octeractsInvested,
            data.shopUpgrades.shopInfiniteShopUpgrades,
            data.redAmbrosiaUpgrades.infiniteShopUpgrades,
            ...(Object.values(data.singularityChallenges) as any[]).map((c) => c.completions),
            ...(data.singularityChallenges.noAmbrosiaUpgrades.enabled
                ? []
                : [
                    data.redAmbrosiaUpgrades.freeLevelsRow4,
                    data.redAmbrosiaUpgrades.freeLevelsRow5,
                    data.ambrosiaUpgrades.ambrosiaInfiniteShopUpgrades1.ambrosiaInvested,
                    data.ambrosiaUpgrades.ambrosiaInfiniteShopUpgrades1.purpleAmbrosiaInvested ?? 0,
                    data.ambrosiaUpgrades.ambrosiaInfiniteShopUpgrades2.ambrosiaInvested,
                    data.ambrosiaUpgrades.ambrosiaInfiniteShopUpgrades2.purpleAmbrosiaInvested ?? 0,
                    data.ambrosiaUpgrades.ambrosiaInfiniteShopUpgrades3?.ambrosiaInvested ?? 0,
                    data.ambrosiaUpgrades.ambrosiaInfiniteShopUpgrades3?.purpleAmbrosiaInvested ?? 0,
                ]),
        ].flat();

        return this.#api.memoizeCalculation(cacheName, calculationVars, () => this.#api.quarkShop.getShopUpgradeEffects('shopPanthema', 'redLuck', mode) as number);
    }

    /** Mirrors campaignTokenBonuses.ambrosiaLuck in SynergismOfficial/src/Campaign.ts: 2000 tokens and Exalt 1 completed. */
    calculateCampaignLuckBonus() {
        const tokens = this.#api.getCampaignData()?.tokens ?? 0;
        const exalt1Completions = this.#api.getGameData()?.singularityChallenges.noSingularityUpgrades.completions ?? 0;
        const cacheName = 'CampaignLuckBonus' as keyof CalculationCache;
        const calculationVars: number[] = [tokens, exalt1Completions];
        return this.#api.memoizeCalculation(cacheName, calculationVars, () => {
            let campaignBonus;
            if (tokens < 2000 || exalt1Completions <= 0) {
                campaignBonus = 0;
            } else {
                campaignBonus = 10
                    + 40 * 1 / 2000 * Math.min(tokens - 2000, 2000)
                    + 50 * (1 - Math.exp(-Math.max(tokens - 4000, 0) / 2500));
            }

            return campaignBonus;
        });
    }

    calculateCookieUpgrade29Luck() {
        const data = this.#api.getGameData();
        if (!data) return 0;
        return (data.cubeUpgrades[79] === 0 || data.lifetimeRedAmbrosia === 0)
            ? 0
            : 10 * Math.pow(Math.log10(data.lifetimeRedAmbrosia), 2);
    }

    calculateAmbrosiaLuckSingularityUpgrade(reduce_vals = true) {
        const data = this.#api.getGameData();
        if (!data) return 0;

        const vals: HSCalculationComponents = {
            'Absolute Hot': this.#api.goldenQuark.getGQUpgradeEffect('singAmbrosiaLuck', 'ambrosiaLuck'),
            'Gilded Berries of Good Fortune': this.#api.goldenQuark.getGQUpgradeEffect('singAmbrosiaLuck2', 'ambrosiaLuck'),
            'Dedicated Gold Smelting': this.#api.goldenQuark.getGQUpgradeEffect('singAmbrosiaLuck3', 'ambrosiaLuck'),
            'The Alchemists from the Beginning of the Game Work for your Golden Berry Needs': this.#api.goldenQuark.getGQUpgradeEffect('singAmbrosiaLuck4', 'ambrosiaLuck'),
        };

        const reduced = Object.values(vals).reduce((a, b) => a + b, 0);
        return reduce_vals ? reduced : vals;
    }

    calculateSingularityAmbrosiaLuckMilestoneBonus() {
        const data = this.#api.getGameData();
        if (!data) return 0;

        let bonus = 0;
        const thresholds1 = [35, 42, 49, 56, 63, 70, 77];
        const thresholds2 = [135, 142, 149, 156, 163, 170, 177];

        for (const threshold of thresholds1) {
            if (data.highestSingularityCount >= threshold) bonus += 5;
        }
        for (const threshold of thresholds2) {
            if (data.highestSingularityCount >= threshold) bonus += 6;
        }

        return bonus;
    }

    calculateAmbrosiaLuckOcteractUpgrade(reduce_vals = true) {
        const data = this.#api.getGameData();
        if (!data) return 0;

        const cacheName = 'AmbrosiaLuckOcteractUpgrade' as keyof CalculationCache;
        const calculationVars = this.getAmbrosiaLuckOcteractUpgradeCalculationDeps();
        const calculateVals = (): HSCalculationComponents => {
            const vals: HSCalculationComponents = {
                'Berries of an Eight Leaf Clover': this.#api.octeract.getOcteractUpgradeEffect('octeractAmbrosiaLuck', 'ambrosiaLuck'),
                'Florentine Cranberries': this.#api.octeract.getOcteractUpgradeEffect('octeractAmbrosiaLuck2', 'ambrosiaLuck'),
                'Berries of a Four Leaf Clover': this.#api.octeract.getOcteractUpgradeEffect('octeractAmbrosiaLuck3', 'ambrosiaLuck'),
                'Berries of a Ten Leaf Clover': this.#api.octeract.getOcteractUpgradeEffect('octeractAmbrosiaLuck4', 'ambrosiaLuck'),
            };
            return vals;
        };

        if (!reduce_vals) return calculateVals();
        return this.#api.memoizeCalculation(cacheName, calculationVars, () => Object.values(calculateVals()).reduce((a, b) => a + b, 0));
    }

    private getLuckCalculationComponentValues(mode: CalculationMode = 'normal'): { additiveComponents: HSCalculationComponents; rawLuckComponents: HSCalculationComponents } {
        const data = this.#api.getGameData();
        if (!data) {
            return { additiveComponents: {}, rawLuckComponents: {} };
        }

        const cube77 = data.cubeUpgrades[77] ?? 0;
        const P_BUFF_LVL = this.#api.getPCoinUpgradeLevel('AMBROSIA_LUCK_BUFF');
        const P_BUFF = P_BUFF_LVL ? P_BUFF_LVL * 20 : 0;

        const additiveComponents: HSCalculationComponents = {
            'Base Multiplier': 1,
            'EXALT - No Golden Quark Upgrades': this.#api.getSingularityChallengeEffect('noSingularityUpgrades', 'additiveLuckMult'),
            'Singularity Perk - Irish Ants II': this.calculateDilatedFiveLeafBonus(),
            'EXALT Ambrosia Luck Multiplier': this.#api.quarkShop.getShopUpgradeEffects('shopAmbrosiaLuckMultiplier4', 'additiveAmbrosiaLuckMult') as number,
            'EXALT - No Ambrosia Effects': this.#api.getSingularityChallengeEffect('noAmbrosiaUpgrades', 'additiveLuckMult'),
            'Cookie Upgrade 5 (Cx27)': 0.001 * cube77,
            // `calculateEventSourceBuff` already combines the active vanilla
            // global event and consumable event buffs.  Do not gate this on
            // the consumable-event flag: a vanilla global event can be active
            // while HAPPY_HOUR_BELL is zero, and the game still applies its
            // Ambrosia Luck bonus in that case.
            'Event Bonus': this.#api.calculateEventSourceBuff(EventBuffType.AmbrosiaLuck),
            'Ambrosia - The Eight Leaf Clover': this.#api.ambrosia.getAmbrosiaUpgradeEffects('ambrosiaLuck4', mode).ambrosiaLuckPercentage,
            'Ambrosia - Brick of Lead': this.#api.ambrosia.getAmbrosiaUpgradeEffects('ambrosiaBrickOfLead', mode).additiveLuckMult,
            'Horse Shoe Talisman Inscription Bonus': this.#api.talisman.getTalismanEffects('horseShoe').luckPercentage,
        };

        const rawLuckComponents: HSCalculationComponents = {
            'Base Value': 100,
            'PseudoCoin Upgrade': P_BUFF,
            'Campaign Bonus': this.calculateCampaignLuckBonus(),
            'Singularity Milestones': this.calculateSingularityAmbrosiaLuckMilestoneBonus(),
            'Quark Upgrades (I-IV)': this.calculateAmbrosiaLuckShopUpgrade(true, mode) as number,
            'Golden Quark Upgrades (I-IV)': this.calculateAmbrosiaLuckSingularityUpgrade(true) as number,
            'Octeract Upgrades (I-IV)': this.calculateAmbrosiaLuckOcteractUpgrade(true) as number,
            'Primal Power - Singularity 131': data.highestSingularityCount >= 131 ? 131 : 0,
            'Primal Power - Singularity 269': data.highestSingularityCount >= 269 ? 269 : 0,
            'Octeract-Based Ambrosia Luck Amplifier': this.#api.quarkShop.getShopUpgradeEffects('shopOcteractAmbrosiaLuck', 'ambrosiaLuck') as number,
            'The Jack of all Trades': this.calculatePanthemaAmbrosiaLuck(mode),
            'EXALT - No Ambrosia Effects': this.#api.getSingularityChallengeEffect('noAmbrosiaUpgrades', 'ambrosiaLuck'),
            'Red Ambrosia - Ossified Blueberry Tactics': this.#api.ambrosia.getRedAmbrosiaUpgradeEffects('regularLuck').ambrosiaLuck,
            'Red Ambrosia - Ossified Blueberry Tactics II': this.#api.ambrosia.getRedAmbrosiaUpgradeEffects('regularLuck2').ambrosiaLuck,
            'Benefits of being a Viscount': this.#api.ambrosia.getRedAmbrosiaUpgradeEffects('viscount').luckBonus,
            'Cookie 5 (Cx27)': 2 * cube77,
            'Filled Red Bars with Cx29': this.calculateCookieUpgrade29Luck(),
            'Ambrosia Ultra Shop Upgrade': this.#api.quarkShop.getShopUpgradeEffects('shopAmbrosiaUltra', 'ambrosiaLuck') as number,
            'Synergism Level Reward': Math.max(0, ((this.#api.calculateSynergismLevel() ?? 0) - 229) * 4),
            'Horse Shoe Rune Bonus': this.#api.rune.getRuneEffects('horseShoe').ambrosiaLuck,
            'Ambrosia - Luck Module I': this.#api.ambrosia.getAmbrosiaUpgradeEffects('ambrosiaLuck1', mode).ambrosiaLuck,
            'Ambrosia - Luck Module II': this.#api.ambrosia.getAmbrosiaUpgradeEffects('ambrosiaLuck2', mode).ambrosiaLuck,
            'Ambrosia - Luck Module III': this.#api.ambrosia.getAmbrosiaUpgradeEffects('ambrosiaLuck3', mode).ambrosiaLuck,
            'Ambrosia - Cube-Luck Hybrid Module I': this.#api.ambrosia.getAmbrosiaUpgradeEffects('ambrosiaCubeLuck1', mode).ambrosiaLuck,
            'Ambrosia - Quark-Luck Hybrid Module I': this.#api.ambrosia.getAmbrosiaUpgradeEffects('ambrosiaQuarkLuck1', mode).ambrosiaLuck,
            // Purple Ambrosia levels are not part of the No-Ambrosia baseline;
            // they are only active in the normal calculation mode.
            'Purple Ambrosia - Leo': mode === 'normal'
                ? this.#api.purple.getPurpleAmbrosiaUpgradeEffects('leo', 'unassignedBlueberyLuck')
                : 0,
        };

        return { additiveComponents, rawLuckComponents };
    }

    private getLuckConversionCalculationDeps(): number[] {
        const data = this.#api.getGameData();
        if (!data) return [0];

        return [
            data.shopUpgrades.shopRedLuck1,
            data.shopUpgrades.shopRedLuck2,
            data.shopUpgrades.shopRedLuck3,
            data.shopUpgrades.shopRedLuck4,
            data.redAmbrosiaUpgrades.conversionImprovement1,
            data.redAmbrosiaUpgrades.conversionImprovement2,
            data.redAmbrosiaUpgrades.conversionImprovement3,
            ...this.getHorseShoeLevelCalculationDeps(),
            data.ambrosiaUpgrades.ambrosiaFreeRedLuckUpgrades.ambrosiaInvested,
            data.ambrosiaUpgrades.ambrosiaFreeRedLuckUpgrades.purpleAmbrosiaInvested ?? 0,
            data.redAmbrosiaUpgrades.freeLevelsRow2,
        ];
    }

    private getHorseShoeLevelCalculationDeps(): number[] {
        const data = this.#api.getGameData();
        if (!data) return [0];

        return [
            parseGameDataDecimal(data.runes.horseShoe).log10(),
            data.singularityChallenges.taxmanLastStand.completions,
            data.purpleAmbrosiaUpgrades?.sagittarius ?? 0,
            data.purpleAmbrosiaUpgrades?.capricorn ?? 0,
            ...this.#api.quarkShop.getShopLevelDependencies('shopHorseShoe'),
        ];
    }

    private getAmbrosiaLuckShopUpgradeCalculationDeps(): number[] {
        const data = this.#api.getGameData();
        if (!data) return [0];

        return [
            data.shopUpgrades.shopAmbrosiaLuck1,
            data.shopUpgrades.shopAmbrosiaLuck2,
            data.shopUpgrades.shopAmbrosiaLuck3,
            data.shopUpgrades.shopAmbrosiaLuck4,
            data.ambrosiaUpgrades.ambrosiaFreeLuckUpgrades.ambrosiaInvested,
            data.ambrosiaUpgrades.ambrosiaFreeLuckUpgrades.purpleAmbrosiaInvested ?? 0,
            data.redAmbrosiaUpgrades.freeLevelsRow2,
            data.singularityChallenges.noAmbrosiaUpgrades.enabled ? 1 : 0,
        ];
    }

    private getPanthemaAmbrosiaLuckCalculationDeps(): number[] {
        const data = this.#api.getGameData();
        if (!data) return [0];

        return [
            data.shopUpgrades.shopPanthema,
            data.ambrosiaUpgrades.ambrosiaFreeLuckUpgrades.ambrosiaInvested,
            data.ambrosiaUpgrades.ambrosiaFreeLuckUpgrades.purpleAmbrosiaInvested ?? 0,
            data.redAmbrosiaUpgrades.freeLevelsRow2,
            data.highestSingularityCount,
            data.goldenQuarkUpgrades.singInfiniteShopUpgrades.goldenQuarksInvested,
            data.octUpgrades.octeractInfiniteShopUpgrades.octeractsInvested,
            data.shopUpgrades.shopInfiniteShopUpgrades,
            data.redAmbrosiaUpgrades.infiniteShopUpgrades,
            ...(Object.values(data.singularityChallenges) as any[]).map((c) => c.completions),
            ...(data.singularityChallenges.noAmbrosiaUpgrades.enabled
                ? []
                : [
                    data.redAmbrosiaUpgrades.freeLevelsRow4,
                    data.redAmbrosiaUpgrades.freeLevelsRow5,
                    data.ambrosiaUpgrades.ambrosiaInfiniteShopUpgrades1.ambrosiaInvested,
                    data.ambrosiaUpgrades.ambrosiaInfiniteShopUpgrades1.purpleAmbrosiaInvested ?? 0,
                    data.ambrosiaUpgrades.ambrosiaInfiniteShopUpgrades2.ambrosiaInvested,
                    data.ambrosiaUpgrades.ambrosiaInfiniteShopUpgrades2.purpleAmbrosiaInvested ?? 0,
                    data.ambrosiaUpgrades.ambrosiaInfiniteShopUpgrades3?.ambrosiaInvested ?? 0,
                    data.ambrosiaUpgrades.ambrosiaInfiniteShopUpgrades3?.purpleAmbrosiaInvested ?? 0,
                ]),
        ].flat();
    }

    private getAmbrosiaLuckSingularityUpgradeCalculationDeps(): number[] {
        const data = this.#api.getGameData();
        if (!data) return [0];

        return [
            data.goldenQuarkUpgrades.singAmbrosiaLuck.goldenQuarksInvested,
            data.goldenQuarkUpgrades.singAmbrosiaLuck2.goldenQuarksInvested,
            data.goldenQuarkUpgrades.singAmbrosiaLuck3.goldenQuarksInvested,
            data.goldenQuarkUpgrades.singAmbrosiaLuck4.goldenQuarksInvested,
        ];
    }

    private getAmbrosiaLuckOcteractUpgradeCalculationDeps(): number[] {
        const data = this.#api.getGameData();
        if (!data) return [0];

        return [
            data.octUpgrades.octeractAmbrosiaLuck.octeractsInvested,
            data.octUpgrades.octeractAmbrosiaLuck2.octeractsInvested,
            data.octUpgrades.octeractAmbrosiaLuck3.octeractsInvested,
            data.octUpgrades.octeractAmbrosiaLuck4.octeractsInvested,
        ];
    }
}
