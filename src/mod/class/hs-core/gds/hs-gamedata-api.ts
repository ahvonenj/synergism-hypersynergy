import { EventBuffType } from "../../../types/data-types/hs-event-data";
import { CachedValue, CalculationCache, HepteractType, RedAmbrosiaUpgradeCalculationConfig, SingularityDebuffs } from "../../../types/data-types/hs-gamedata-api-types";
import { RedAmbrosiaUpgrades, SingularityChallengeStatus } from "../../../types/data-types/hs-player-savedata";
import { HSUtils } from "../../hs-utils/hs-utils";
import { HSGlobal } from "../hs-global";
import { HSLogger } from "../hs-logger";
import { HSGameDataAPIPartial } from "./hs-gamedata-api-partial";
import { c15Functions, challenge15Rewards, hepteractEffectiveValues, redAmbrosiaUpgradeCalculationCollection } from "./stored-vars-and-calculations";

/*
    If this looks silly, check details in hs-gamedata-api-partial.ts

    This class, even though the name is HSGameDataAPI, contains only
    calculation functions which use game data

    The main game data API class is HSGameDataAPIPartial.
    Yes, they are basically wrong way around but it is what it is.

    --

    This file is also very long and will most likely get a lot longer still.
    This is because this file mostly contains functions ripped from the game's code
    and modified to work with the mod's own cache etc. (*) The big idea in the end is that
    I'll try to expose everything in here in some sane way so nobody needs to look in here.

    --

    (*) All of the R_ methods are ripped from the game's code
*/
export class HSGameDataAPI extends HSGameDataAPIPartial {

    // Named caches for each heavy calculation dependent on multiple variables
    // The idea is to cache calculations by the variables that make up the calculation
    // If any of the variables change, the cache should update as well
    // If the variables are the same, then it follows that the value should be the same too
    // And we can return that cache value
    #calculationCache : CalculationCache = {
        R_AmbrosiaGenerationShopUpgrade:            { value: undefined, cachedBy: [] },
        R_AmbrosiaGenerationSingularityUpgrade:     { value: undefined, cachedBy: [] },
        R_AmbrosiaGenerationOcteractUpgrade:        { value: undefined, cachedBy: [] },
        R_SingularityMilestoneBlueberries:          { value: undefined, cachedBy: [] },
        R_DilatedFiveLeafBonus:                     { value: undefined, cachedBy: [] },
        R_SingularityAmbrosiaLuckMilestoneBonus:    { value: undefined, cachedBy: [] },
        R_AmbrosiaLuckShopUpgrade:                  { value: undefined, cachedBy: [] },
        R_AmbrosiaLuckSingularityUpgrade:           { value: undefined, cachedBy: [] },
        R_AmbrosiaLuckOcteractUpgrade:              { value: undefined, cachedBy: [] },
        R_TotalCubes:                               { value: undefined, cachedBy: [] },

        REDAMB_blueberryGenerationSpeed:           { value: undefined, cachedBy: [] },
        REDAMB_blueberryGenerationSpeed2:          { value: undefined, cachedBy: [] },
        REDAMB_freeLevelsRow2:                     { value: undefined, cachedBy: [] },
        REDAMB_freeLevelsRow3:                     { value: undefined, cachedBy: [] },
        REDAMB_freeLevelsRow4:                     { value: undefined, cachedBy: [] },
        REDAMB_freeLevelsRow5:                     { value: undefined, cachedBy: [] },
        REDAMB_regularLuck:                        { value: undefined, cachedBy: [] },
        REDAMB_regularLuck2:                       { value: undefined, cachedBy: [] },
        REDAMB_viscount:                           { value: undefined, cachedBy: [] },

        R_CampaignAmbrosiaSpeedBonus:              { value: undefined, cachedBy: [] },
        R_CampaignLuckBonus:                       { value: undefined, cachedBy: [] },
        R_CookieUpgrade29Luck:                     { value: undefined, cachedBy: [] },
        R_SumOfExaltCompletions:                   { value: undefined, cachedBy: [] },

        R_NumberOfThresholds:                      { value: undefined, cachedBy: [] },
        R_ToNextThreshold:                         { value: undefined, cachedBy: [] },
        R_RequiredBlueberryTime:                   { value: undefined, cachedBy: [] },
        R_RequiredRedAmbrosiaTime:                 { value: undefined, cachedBy: [] },

        EVENTBUFF_Quark:                           { value: undefined, cachedBy: [] },
        EVENTBUFF_GoldenQuark:                     { value: undefined, cachedBy: [] },
        EVENTBUFF_Cubes:                           { value: undefined, cachedBy: [] },
        EVENTBUFF_PowderConversion:                { value: undefined, cachedBy: [] },
        EVENTBUFF_AscensionSpeed:                  { value: undefined, cachedBy: [] },
        EVENTBUFF_GlobalSpeed:                     { value: undefined, cachedBy: [] },
        EVENTBUFF_AscensionScore:                  { value: undefined, cachedBy: [] },
        EVENTBUFF_AntSacrifice:                    { value: undefined, cachedBy: [] },
        EVENTBUFF_Offering:                        { value: undefined, cachedBy: [] },
        EVENTBUFF_Obtainium:                       { value: undefined, cachedBy: [] },
        EVENTBUFF_Octeract:                        { value: undefined, cachedBy: [] },
        EVENTBUFF_BlueberryTime:                   { value: undefined, cachedBy: [] },
        EVENTBUFF_AmbrosiaLuck:                    { value: undefined, cachedBy: [] },
        EVENTBUFF_OneMind:                         { value: undefined, cachedBy: [] },

        R_RawAscensionSpeedMult:                   { value: undefined, cachedBy: [] },
        R_HepteractEffective:                      { value: undefined, cachedBy: [] },
        R_AllShopTablets:                          { value: undefined, cachedBy: [] },
        R_LimitedAscensionsDebuff:                 { value: undefined, cachedBy: [] },
        R_SingularityDebuff:                       { value: undefined, cachedBy: [] },
        R_SingularityReductions:                   { value: undefined, cachedBy: [] },
        R_EffectiveSingularities:                  { value: undefined, cachedBy: [] },
        R_AscensionSpeedExponentSpread:           { value: undefined, cachedBy: [] },
    }

    #calculationCacheTemplate : CalculationCache;

    // These are imported from stored-vars-and-calculationss.ts
    #redAmbrosiaCalculationCollection = redAmbrosiaUpgradeCalculationCollection;
    #hepteractEffectiveValues = hepteractEffectiveValues;

    constructor(moduleName: string, context: string, moduleColor?: string) {
        super(moduleName, context, moduleColor);
        this.#calculationCacheTemplate = { ...this.#calculationCache };
    }

    #checkCache(cacheName: keyof CalculationCache, checkCacheAgainst: number[]) {
        if(!(cacheName in this.#calculationCache)) {
            HSLogger.debug(`Could not find cache for '${cacheName}'`);
            return false;
        }

        const cached = this.#calculationCache[cacheName];

        if(cached.value === undefined || cached.cachedBy.length === 0) {
            if(HSGlobal.Debug.calculationCacheDebugMode)
                console.log(`Cache missed (reason: null value or empty cache) for ${cacheName} with value ${cached.value}`);

            return false;
        }

        if(cached.cachedBy.length !== checkCacheAgainst.length) {
            if(HSGlobal.Debug.calculationCacheDebugMode)
                console.warn(`Cache missed (reason: cache length mismatch) for ${cacheName} with value ${cached.value}`);

            return false;
        }

        for(let i = 0; i < cached.cachedBy.length; i++) {
            if(!checkCacheAgainst.includes(cached.cachedBy[i])) {
                if(HSGlobal.Debug.calculationCacheDebugMode) {
                    console.log(`Cache missed (reason: calc var mismatch) for ${cacheName} (${cached.cachedBy[i]})`);
                }   

                return false;
            }
        }

        if(HSGlobal.Debug.calculationCacheDebugMode)
            console.log(`Hit cache for ${cacheName} with value ${cached.value}`);

        return cached.value;
    }

    #updateCache(cacheName: keyof CalculationCache, newCachedValue: CachedValue) {
        if(newCachedValue.cachedBy.length === 0 || newCachedValue.value === null || newCachedValue.value === undefined) {
            if(HSGlobal.Debug.calculationCacheDebugMode)
                console.warn(`Rejected cache update for ${cacheName} (value: ${newCachedValue.value}, cachedBy: ${newCachedValue.cachedBy.length})`);

            return;
        }
            
        this.#calculationCache[cacheName] = newCachedValue;
    }

    clearCache() {
        this.#calculationCache = { ...this.#calculationCacheTemplate };
    }

    dumpCache() {
        console.table(this.#calculationCache);
    }

    #investToRedAmbrosiaUpgrade(
        budget: number, 
        costPerLevel: number, 
        maxLevel: number, 
        constFunction: (n: number, cpl: number) => number,
        levelFunction: (n: number) => number) {

        let level = 0

        let nextCost = constFunction(level, costPerLevel)

        while (budget >= nextCost) {
            budget -= nextCost
            level += 1
            nextCost = constFunction(level, costPerLevel)

            if (level >= maxLevel) {
                break;
            }
        }

        return levelFunction(level);
    }

    R_calculateConsumableEventBuff (buff: EventBuffType) {
        if(!this.eventData) return 0;

        const data = this.eventData;
        const cacheName = `EVENTBUFF_${HSUtils.eventBuffNumToName(buff)}` as keyof CalculationCache;

        const calculationVars : number[] = [
            data.HAPPY_HOUR_BELL.amount,
            buff
        ]

        const cached = this.#checkCache(cacheName, calculationVars);

        if(cached) return cached;

        const { HAPPY_HOUR_BELL } = this.eventData;

        const happyHourInterval = HAPPY_HOUR_BELL.amount - 1

        if (HAPPY_HOUR_BELL.amount === 0) {
            this.#updateCache(cacheName, { value: 0, cachedBy: calculationVars });
            return 0;
        }

        let val = 0;

        switch (buff) {
            case EventBuffType.Quark:
                val = HAPPY_HOUR_BELL ? 0.25 + 0.025 * happyHourInterval : 0;
                break;
            case EventBuffType.GoldenQuark:
                val = 0;
                break;
            case EventBuffType.Cubes:
                val = HAPPY_HOUR_BELL ? 0.5 + 0.05 * happyHourInterval : 0;
                break;
            case EventBuffType.PowderConversion:
                val = 0;
                break;
            case EventBuffType.AscensionSpeed:
                val = 0;
                break;
            case EventBuffType.GlobalSpeed:
                val = 0;
                break;
            case EventBuffType.AscensionScore:
                val = 0;
                break;
            case EventBuffType.AntSacrifice:
                val = 0;
                break;
            case EventBuffType.Offering:
                val = HAPPY_HOUR_BELL ? 0.5 + 0.05 * happyHourInterval : 0;
                break;
            case EventBuffType.Obtainium:
                val = HAPPY_HOUR_BELL ? 0.5 + 0.05 * happyHourInterval : 0;
                break;
            case EventBuffType.Octeract:
                val = 0;
                break;
            case EventBuffType.OneMind:
                val = 0;
                break;
            case EventBuffType.BlueberryTime:
                val = HAPPY_HOUR_BELL ? 0.1 + 0.01 * happyHourInterval : 0;
                break;
            case EventBuffType.AmbrosiaLuck:
                val = HAPPY_HOUR_BELL ? 0.1 + 0.01 * happyHourInterval : 0;
                break;
        }

        this.#updateCache(cacheName, { value: val, cachedBy: calculationVars });

        return val;
    }

    // https://github.com/Pseudo-Corp/SynergismOfficial/blob/master/src/Calculate.ts#L2340
    R_calculateAmbrosiaGenerationShopUpgrade(reduce_vals = true) {
        if(!this.gameData) return 0;
        const data = this.gameData;
        const cacheName = 'R_AmbrosiaGenerationShopUpgrade' as keyof CalculationCache;

        const calculationVars : number[] = [
            data.shopUpgrades.shopAmbrosiaGeneration1,
            data.shopUpgrades.shopAmbrosiaGeneration2,
            data.shopUpgrades.shopAmbrosiaGeneration3,
            data.shopUpgrades.shopAmbrosiaGeneration4
        ]

        const cached = this.#checkCache(cacheName, calculationVars);

        if(cached) return cached;
        
        const vals = [
            1 + data.shopUpgrades.shopAmbrosiaGeneration1 / 100,
            1 + data.shopUpgrades.shopAmbrosiaGeneration2 / 100,
            1 + data.shopUpgrades.shopAmbrosiaGeneration3 / 100,
            1 + data.shopUpgrades.shopAmbrosiaGeneration4 / 1000
        ]

        const reduced = vals.reduce((a, b) => a * b);

        this.#updateCache(cacheName, { value: reduced, cachedBy: calculationVars });

        return reduce_vals ? reduced : vals;
    }

    // https://github.com/Pseudo-Corp/SynergismOfficial/blob/master/src/Calculate.ts#L2362
    // https://github.com/Pseudo-Corp/SynergismOfficial/blob/master/src/singularity.ts#L1515
    R_calculateAmbrosiaGenerationSingularityUpgrade(reduce_vals = true) {
        if(!this.gameData) return 0;
        const data = this.gameData;
        const cacheName = 'R_AmbrosiaGenerationSingularityUpgrade' as keyof CalculationCache;

        const calculationVars : number[] = [
            data.singularityUpgrades.singAmbrosiaGeneration.level ,
            data.singularityUpgrades.singAmbrosiaGeneration2.level,
            data.singularityUpgrades.singAmbrosiaGeneration3.level,
            data.singularityUpgrades.singAmbrosiaGeneration4.level
        ]

        const cached = this.#checkCache(cacheName, calculationVars);

        if(cached) return cached;

        const vals = [
            1 + data.singularityUpgrades.singAmbrosiaGeneration.level / 100,
            1 + data.singularityUpgrades.singAmbrosiaGeneration2.level / 100,
            1 + data.singularityUpgrades.singAmbrosiaGeneration3.level / 100,
            1 + data.singularityUpgrades.singAmbrosiaGeneration4.level / 100,
        ]

        const reduced = vals.reduce((a, b) => a * b);

        this.#updateCache(cacheName, { value: reduced, cachedBy: calculationVars });

        return reduce_vals ? reduced : vals;
    }

    // https://github.com/Pseudo-Corp/SynergismOfficial/blob/master/src/Calculate.ts#L2384
    R_calculateAmbrosiaGenerationOcteractUpgrade(reduce_vals = true) {
        if(!this.gameData) return 0;
        const data = this.gameData;
        const cacheName = 'R_AmbrosiaGenerationOcteractUpgrade' as keyof CalculationCache;

        const calculationVars : number[] = [
            data.octeractUpgrades.octeractAmbrosiaGeneration.level,
            data.octeractUpgrades.octeractAmbrosiaGeneration2.level,
            data.octeractUpgrades.octeractAmbrosiaGeneration3.level,
            data.octeractUpgrades.octeractAmbrosiaGeneration4.level,
        ]

        const cached = this.#checkCache(cacheName, calculationVars);

        if(cached) return cached;

        const vals = [
            1 + data.octeractUpgrades.octeractAmbrosiaGeneration.level / 100,
            1 + data.octeractUpgrades.octeractAmbrosiaGeneration2.level / 100,
            1 + data.octeractUpgrades.octeractAmbrosiaGeneration3.level / 100,
            1 + 2 * data.octeractUpgrades.octeractAmbrosiaGeneration4.level / 100
        ]

        const reduced = vals.reduce((a, b) => a * b);

        this.#updateCache(cacheName, { value: reduced, cachedBy: calculationVars });

        return reduce_vals ? reduced : vals;
    }

    // https://github.com/Pseudo-Corp/SynergismOfficial/blob/master/src/Calculate.ts#L2453
    R_calculateSingularityMilestoneBlueberries() {
        if(!this.gameData) return 0;
        const data = this.gameData;
        const cacheName = 'R_SingularityMilestoneBlueberries' as keyof CalculationCache;

        const calculationVars : number[] = [
            data.highestSingularityCount
        ]

        const cached = this.#checkCache(cacheName, calculationVars);

        if(cached) return cached;

        let val = 0

        if (data.highestSingularityCount >= 270) val = 5
        else if (data.highestSingularityCount >= 256) val = 4
        else if (data.highestSingularityCount >= 192) val = 3
        else if (data.highestSingularityCount >= 128) val = 2
        else if (data.highestSingularityCount >= 64) val = 1

        const reduced = val;

        this.#updateCache(cacheName, { value: reduced, cachedBy: calculationVars });

        return reduced;
    }

    // https://github.com/Pseudo-Corp/SynergismOfficial/blob/master/src/Calculate.ts#L2539
    R_calculateDilatedFiveLeafBonus() {
        if(!this.gameData) return 0;
        const data = this.gameData;
        const cacheName = 'R_DilatedFiveLeafBonus' as keyof CalculationCache;

        const calculationVars : number[] = [
            data.highestSingularityCount
        ]

        const cached = this.#checkCache(cacheName, calculationVars);

        if(cached) return cached;

        const singThresholds = [100, 150, 200, 225, 250, 255, 260, 265, 269, 272]
        let val = singThresholds.length / 100;
        
        for (let i = 0; i < singThresholds.length; i++) {
            if (data.highestSingularityCount < singThresholds[i]) {
                val = i / 100;
                break;
            }
        }

        const reduced = val;

        this.#updateCache(cacheName, { value: reduced, cachedBy: calculationVars });

        return reduced;
    }

    // https://github.com/Pseudo-Corp/SynergismOfficial/blob/master/src/Calculate.ts#L2320
    R_calculateSingularityAmbrosiaLuckMilestoneBonus() {
        if(!this.gameData) return 0;
        const data = this.gameData;
        const cacheName = 'R_SingularityAmbrosiaLuckMilestoneBonus' as keyof CalculationCache;

        const calculationVars : number[] = [
            data.highestSingularityCount
        ]

        const cached = this.#checkCache(cacheName, calculationVars);

        if(cached) return cached;

        let bonus = 0
        const singThresholds1 = [35, 42, 49, 56, 63, 70, 77];
        const singThresholds2 = [135, 142, 149, 156, 163, 170, 177];

        for (const sing of singThresholds1) {
            if (data.highestSingularityCount >= sing) {
                bonus += 5
            }
        }

        for (const sing of singThresholds2) {
            if (data.highestSingularityCount >= sing) {
                bonus += 6
            }
        }

        const reduced = bonus;

        this.#updateCache(cacheName, { value: reduced, cachedBy: calculationVars });

        return reduced;
    }

    // https://github.com/Pseudo-Corp/SynergismOfficial/blob/master/src/Calculate.ts#L2351
    R_calculateAmbrosiaLuckShopUpgrade(reduce_vals = true) {
        if(!this.gameData) return 0;
        const data = this.gameData;
        const cacheName = 'R_AmbrosiaLuckShopUpgrade' as keyof CalculationCache;

        const calculationVars : number[] = [
            data.shopUpgrades.shopAmbrosiaLuck1,
            data.shopUpgrades.shopAmbrosiaLuck2,
            data.shopUpgrades.shopAmbrosiaLuck3,
            data.shopUpgrades.shopAmbrosiaLuck4
        ]

        const cached = this.#checkCache(cacheName, calculationVars);

        if(cached) return cached;

        const vals = [
            2 * data.shopUpgrades.shopAmbrosiaLuck1,
            2 * data.shopUpgrades.shopAmbrosiaLuck2,
            2 * data.shopUpgrades.shopAmbrosiaLuck3,
            0.6 * data.shopUpgrades.shopAmbrosiaLuck4
        ]

        const reduced = vals.reduce((a, b) => a + b, 0);

        this.#updateCache(cacheName, { value: reduced, cachedBy: calculationVars });

        return reduce_vals ? reduced : vals;
    }

    // https://github.com/Pseudo-Corp/SynergismOfficial/blob/master/src/Calculate.ts#L2373
    R_calculateAmbrosiaLuckSingularityUpgrade(reduce_vals = true) {
        if(!this.gameData) return 0;
        const data = this.gameData;
        const cacheName = 'R_AmbrosiaLuckSingularityUpgrade' as keyof CalculationCache;

        const calculationVars : number[] = [
            data.singularityUpgrades.singAmbrosiaLuck.level,
            data.singularityUpgrades.singAmbrosiaLuck2.level,
            data.singularityUpgrades.singAmbrosiaLuck3.level,
            data.singularityUpgrades.singAmbrosiaLuck4.level,
        ]

        const cached = this.#checkCache(cacheName, calculationVars);

        if(cached) return cached;

        const vals = [
            +data.singularityUpgrades.singAmbrosiaLuck.level * 4,
            +data.singularityUpgrades.singAmbrosiaLuck2.level * 2,
            +data.singularityUpgrades.singAmbrosiaLuck3.level * 3,
            +data.singularityUpgrades.singAmbrosiaLuck4.level * 5
        ]

        const reduced = vals.reduce((a, b) => a + b, 0);

        this.#updateCache(cacheName, { value: reduced, cachedBy: calculationVars });

        return reduce_vals ? reduced : vals;
    }

    R_calculateAmbrosiaLuckOcteractUpgrade(reduce_vals = true) {
        if(!this.gameData) return 0;
        const data = this.gameData;
        const cacheName = 'R_AmbrosiaLuckOcteractUpgrade' as keyof CalculationCache;

        const calculationVars : number[] = [
            data.octeractUpgrades.octeractAmbrosiaLuck.level,
            data.octeractUpgrades.octeractAmbrosiaLuck2.level,
            data.octeractUpgrades.octeractAmbrosiaLuck3.level,
            data.octeractUpgrades.octeractAmbrosiaLuck4.level,
        ]

        const cached = this.#checkCache(cacheName, calculationVars);

        if(cached) return cached;

        const vals = [
            +data.octeractUpgrades.octeractAmbrosiaLuck.level * 4,
            +data.octeractUpgrades.octeractAmbrosiaLuck2.level * 2,
            +data.octeractUpgrades.octeractAmbrosiaLuck3.level * 3,
            +data.octeractUpgrades.octeractAmbrosiaLuck4.level * 5
        ]

        const reduced = vals.reduce((a, b) => a + b, 0);

        this.#updateCache(cacheName, { value: reduced, cachedBy: calculationVars });

        return reduce_vals ? reduced : vals;
    }

    R_calculateTotalCubes() {
        if(!this.gameData) return 0;
        const data = this.gameData;
        const cacheName = 'R_TotalCubes' as keyof CalculationCache;

        const calculationVars : number[] = [
            data.wowCubes,
            data.wowTesseracts,
            data.wowHypercubes,
            data.wowPlatonicCubes,
            data.wowAbyssals,
            data.wowOcteracts
        ]

        const cached = this.#checkCache(cacheName, calculationVars);

        if(cached) return cached;

        const reduced = (Math.floor(Math.log10(Number(data.wowCubes) + 1))
        + Math.floor(Math.log10(Number(data.wowTesseracts) + 1))
        + Math.floor(Math.log10(Number(data.wowHypercubes) + 1))
        + Math.floor(Math.log10(Number(data.wowPlatonicCubes) + 1))
        + Math.floor(Math.log10(data.wowAbyssals + 1))
        + Math.floor(Math.log10(data.wowOcteracts + 1))
        + 6);

        this.#updateCache(cacheName, { value: reduced, cachedBy: calculationVars });

        return reduced;
    }

    R_calculateRedAmbrosiaUpgradeValue(
        upgradeName: keyof RedAmbrosiaUpgrades,
    ) {
        if(!this.gameData) return 0;
        const data = this.gameData;
        const cacheName = `REDAMB_${upgradeName}` as keyof CalculationCache;

        if(!(upgradeName in data.redAmbrosiaUpgrades)) return 0;
        if(!(upgradeName in this.#redAmbrosiaCalculationCollection)) return 0;

        const calculationVars : number[] = [
            data.redAmbrosiaUpgrades[upgradeName]
        ]

        const cached = this.#checkCache(cacheName, calculationVars);

        if(cached) return cached;

        const investmentParameters = ((this.#redAmbrosiaCalculationCollection as any)[upgradeName]) as RedAmbrosiaUpgradeCalculationConfig;

        const upgradeValue = this.#investToRedAmbrosiaUpgrade(
            data.redAmbrosiaUpgrades[upgradeName],
            investmentParameters.costPerLevel,
            investmentParameters.maxLevel,
            investmentParameters.costFunction,
            investmentParameters.levelFunction
        );

        const reduced = upgradeValue;

        this.#updateCache(cacheName, { value: reduced, cachedBy: calculationVars });

        return reduced;
    }

    R_calculateCampaignAmbrosiaSpeedBonus() {
        const cacheName = 'R_CampaignAmbrosiaSpeedBonus' as keyof CalculationCache;

        const tokens = this.campaignData?.tokens ?? 0;

        const calculationVars : number[] = [
            tokens
        ]

        const cached = this.#checkCache(cacheName, calculationVars);

        if(cached) return cached;

        let campaignBlueberrySpeedBonus;
        
        if(tokens < 2000) {
            campaignBlueberrySpeedBonus = 1;
        } else {
            campaignBlueberrySpeedBonus = 1 + 0.05 * 1 / 2000 * Math.min(tokens - 2000, 2000) + 0.05 * (1 - Math.exp(-Math.max(tokens - 4000, 0) / 2000));
        }

        const reduced = campaignBlueberrySpeedBonus;

        this.#updateCache(cacheName, { value: reduced, cachedBy: calculationVars });

        return reduced;
    }

    R_calculateCampaignLuckBonus() {
        const cacheName = 'R_CampaignLuckBonus' as keyof CalculationCache;

        const tokens = this.campaignData?.tokens ?? 0;

        const calculationVars : number[] = [
            tokens
        ]

        const cached = this.#checkCache(cacheName, calculationVars);

        if(cached) return cached;

        let campaignBonus;

        if (tokens < 2000) {
            campaignBonus = 0;
        } else {
            campaignBonus = 10
            + 40 * 1 / 2000 * Math.min(tokens - 2000, 2000)
            + 50 * (1 - Math.exp(-Math.max(tokens - 4000, 0) / 2500));
        }

        const reduced = campaignBonus;

        this.#updateCache(cacheName, { value: reduced, cachedBy: calculationVars });

        return reduced;
    }

    // https://github.com/Pseudo-Corp/SynergismOfficial/blob/master/src/Calculate.ts#L2753
    R_calculateCookieUpgrade29Luck() {
        if(!this.gameData) return 0;
        const data = this.gameData;
        const cacheName = 'R_CookieUpgrade29Luck' as keyof CalculationCache;

        const cube79 = data.cubeUpgrades[79] ?? 0;

        const calculationVars : number[] = [
            cube79,
            data.lifetimeRedAmbrosia
        ]

        const cached = this.#checkCache(cacheName, calculationVars);

        if(cached) return cached;

        let val;

        if (data.cubeUpgrades[79] === 0 || data.lifetimeRedAmbrosia === 0) {
            val = 0;
        } else {
            val = 10 * Math.pow(Math.log10(data.lifetimeRedAmbrosia), 2)
        }

        const reduced = val;

        this.#updateCache(cacheName, { value: reduced, cachedBy: calculationVars });

        return reduced;
    }

    // https://github.com/Pseudo-Corp/SynergismOfficial/blob/master/src/Calculate.ts#L2652
    R_calculateSumOfExaltCompletions() {
        if(!this.gameData) return 0;
        const data = this.gameData;
        const cacheName = 'R_SumOfExaltCompletions' as keyof CalculationCache;

        const calculationVars : number[] = [
            ...(Object.values(data.singularityChallenges) as SingularityChallengeStatus[]).map((c) => c.completions)
        ]

        const cached = this.#checkCache(cacheName, calculationVars);

        if(cached) return cached;

        let sum = 0

        for (const challenge of Object.values(data.singularityChallenges)) {
            sum += challenge.completions
        }

        const reduced = sum;

        this.#updateCache(cacheName, { value: reduced, cachedBy: calculationVars });

        return reduced;
    }

    // https://github.com/Pseudo-Corp/SynergismOfficial/blob/0ffbd184938677cf8137a404cffb2f4b5b5d3ab9/src/Calculate.ts
    R_calculateNumberOfThresholds = () => {
        if(!this.gameData) return 0;
        const data = this.gameData;
        const cacheName = 'R_NumberOfThresholds' as keyof CalculationCache;
        const digitReduction = HSGlobal.HSAmbrosia.R_digitReduction;

        const calculationVars : number[] = [
            data.lifetimeAmbrosia
        ]

        const cached = this.#checkCache(cacheName, calculationVars);

        if(cached) return cached;

        const numDigits = data.lifetimeAmbrosia > 0 ? 1 + Math.floor(Math.log10(data.lifetimeAmbrosia)) : 0
        const matissa = Math.floor(data.lifetimeAmbrosia / Math.pow(10, numDigits - 1))

        const extraReduction = matissa >= 3 ? 1 : 0

        const reduced = Math.max(0, 2 * (numDigits - digitReduction) - 1 + extraReduction);

        this.#updateCache(cacheName, { value: reduced, cachedBy: calculationVars });

        return reduced;
    }

    // https://github.com/Pseudo-Corp/SynergismOfficial/blob/0ffbd184938677cf8137a404cffb2f4b5b5d3ab9/src/Calculate.ts
    R_calculateToNextThreshold = () => {
        if(!this.gameData) return 0;
        const data = this.gameData;
        const cacheName = 'R_ToNextThreshold' as keyof CalculationCache;
        const digitReduction = HSGlobal.HSAmbrosia.R_digitReduction;

        const calculationVars : number[] = [
            data.lifetimeAmbrosia
        ]

        const cached = this.#checkCache(cacheName, calculationVars);

        if(cached) return cached;

        const numThresholds = this.R_calculateNumberOfThresholds();

        let val;

        if (numThresholds === 0) {
            val = 10000 - data.lifetimeAmbrosia
        } else {
            // This is when the previous threshold is of the form 3 * 10^n
            if (numThresholds % 2 === 0) {
                val = Math.pow(10, numThresholds / 2 + digitReduction) - data.lifetimeAmbrosia
            } // Previous threshold is of the form 10^n
            else {
                val = 3 * Math.pow(10, (numThresholds - 1) / 2 + digitReduction) - data.lifetimeAmbrosia
            }
        }

        const reduced = val;

        this.#updateCache(cacheName, { value: reduced, cachedBy: calculationVars });

        return reduced;
    }

    // https://github.com/Pseudo-Corp/SynergismOfficial/blob/0ffbd184938677cf8137a404cffb2f4b5b5d3ab9/src/Calculate.ts
    R_calculateRequiredBlueberryTime = () => {
        if(!this.gameData) return 0;
        const data = this.gameData;
        const cacheName = 'R_RequiredBlueberryTime' as keyof CalculationCache;
        const timePerAmbrosia = HSGlobal.HSAmbrosia.R_TIME_PER_AMBROSIA // Currently 30

        const calculationVars : number[] = [
            data.lifetimeAmbrosia
        ]

        const cached = this.#checkCache(cacheName, calculationVars);

        if(cached) return cached;

        let val = timePerAmbrosia;
        val += Math.floor(data.lifetimeAmbrosia / 500)

        const thresholds = this.R_calculateNumberOfThresholds();
        const thresholdBase = 2;

        const reduced = Math.pow(thresholdBase, thresholds) * val;

        this.#updateCache(cacheName, { value: reduced, cachedBy: calculationVars });

        return reduced;
    }

    // https://github.com/Pseudo-Corp/SynergismOfficial/blob/0ffbd184938677cf8137a404cffb2f4b5b5d3ab9/src/Calculate.ts
    R_calculateRequiredRedAmbrosiaTime = () => {
        if(!this.gameData) return 0;
        const data = this.gameData;
        const cacheName = 'R_RequiredRedAmbrosiaTime' as keyof CalculationCache;
        const timePerRedAmbrosia = HSGlobal.HSAmbrosia.R_TIME_PER_RED_AMBROSIA // Currently 100,000

        const calculationVars : number[] = [
            data.lifetimeRedAmbrosia,
            data.singularityChallenges.limitedTime.completions
        ]

        const cached = this.#checkCache(cacheName, calculationVars);

        if(cached) return cached;

        const redBarRequirementMultiplier = 1 - (0.01 * data.singularityChallenges.limitedTime.completions);

        let val = timePerRedAmbrosia;
        val += 200 * data.lifetimeRedAmbrosia

        const max = 1e6 * + redBarRequirementMultiplier;
        val *= + redBarRequirementMultiplier;

        const reduced = Math.min(max, val);

        this.#updateCache(cacheName, { value: reduced, cachedBy: calculationVars });

        return reduced;
    }

    getCorruptionTotalLevel() {
        if(!this.gameData) return 0;
        const data = this.gameData;

        const corruptions = data.corruptions.used;
        const sum = Object.values(corruptions).reduce((a, b) => a + b, 0);
        return sum;
    }

    R_calculateHepteractEffective = (heptType: HepteractType) => {
        if(!this.gameData) return 0;
        const data = this.gameData;
        const cacheName = 'R_HepteractEffective' as keyof CalculationCache;

        const calculationVars : number[] = [
            data.hepteractCrafts[heptType].BAL,
            data.platonicUpgrades[19],
            data.singularityUpgrades.singQuarkHepteract.level,
            data.singularityUpgrades.singQuarkHepteract2.level,
            data.singularityUpgrades.singQuarkHepteract3.level,
            data.shopUpgrades.improveQuarkHept,
            data.shopUpgrades.improveQuarkHept2,
            data.shopUpgrades.improveQuarkHept3,
            data.shopUpgrades.improveQuarkHept4,
            data.shopUpgrades.improveQuarkHept5,
        ];

        const cached = this.#checkCache(cacheName, calculationVars);

        if(cached) return cached;

        let effectiveValue = Math.min(data.hepteractCrafts[heptType].BAL, this.#hepteractEffectiveValues[heptType].LIMIT);
        let exponentBoost = 0;

        if (heptType === 'chronos') {
            exponentBoost += 1 / 750 * data.platonicUpgrades[19];
        }

        if (heptType === 'quark') {
            exponentBoost += +data.singularityUpgrades.singQuarkHepteract.level / 100;
            exponentBoost += +data.singularityUpgrades.singQuarkHepteract2.level / 100;
            exponentBoost += +data.singularityUpgrades.singQuarkHepteract3.level / 100;
            exponentBoost += +data.octeractUpgrades.octeractImprovedQuarkHept.level / 100;
            exponentBoost += data.shopUpgrades.improveQuarkHept / 100;
            exponentBoost += data.shopUpgrades.improveQuarkHept2 / 100;
            exponentBoost += data.shopUpgrades.improveQuarkHept3 / 100;
            exponentBoost += data.shopUpgrades.improveQuarkHept4 / 100;
            exponentBoost += data.shopUpgrades.improveQuarkHept5 / 5000;

            const amount = data.hepteractCrafts[heptType].BAL;
            let val;

            if (1000 < amount && amount <= 1000 * Math.pow(2, 10)) {
                val = effectiveValue * Math.pow(amount / 1000, 1 / 2 + exponentBoost)
            } else if (1000 * Math.pow(2, 10) < amount && amount <= 1000 * Math.pow(2, 18)) {
                val = effectiveValue * Math.pow(Math.pow(2, 10), 1 / 2 + exponentBoost)
                * Math.pow(amount / (1000 * Math.pow(2, 10)), 1 / 4 + exponentBoost / 2)
            } else if (1000 * Math.pow(2, 18) < amount && amount <= 1000 * Math.pow(2, 44)) {
                val = effectiveValue * Math.pow(Math.pow(2, 10), 1 / 2 + exponentBoost)
                * Math.pow(Math.pow(2, 8), 1 / 4 + exponentBoost / 2)
                * Math.pow(amount / (1000 * Math.pow(2, 18)), 1 / 6 + exponentBoost / 3)
            } else if (1000 * Math.pow(2, 44) < amount) {
                val = effectiveValue * Math.pow(Math.pow(2, 10), 1 / 2 + exponentBoost)
                * Math.pow(Math.pow(2, 8), 1 / 4 + exponentBoost / 2)
                * Math.pow(Math.pow(2, 26), 1 / 6 + exponentBoost / 3)
                * Math.pow(amount / (1000 * Math.pow(2, 44)), 1 / 12 + exponentBoost / 6)
            } else {
                val = 0;
            }

            this.#updateCache(cacheName, { value: val, cachedBy: calculationVars });
            return val;
        }

        if (data.hepteractCrafts[heptType].BAL > this.#hepteractEffectiveValues[heptType].LIMIT) {
            effectiveValue *= Math.pow(
                data.hepteractCrafts[heptType].BAL / this.#hepteractEffectiveValues[heptType].LIMIT,
                this.#hepteractEffectiveValues[heptType].DR + exponentBoost
            );
        }

        this.#updateCache(cacheName, { value: effectiveValue, cachedBy: calculationVars });
        return effectiveValue;
    }

    R_calculateFreeShopInfinityUpgrades(reduce_vals = true) {
        return this.R_calculateAllShopTablets(reduce_vals);
    }

    R_calculateAllShopTablets(reduce_vals = true) {
        if(!this.gameData) return 0;
        const data = this.gameData;
        const cacheName = 'R_AllShopTablets' as keyof CalculationCache;

        const calculationVars : number[] = [
            data.highestSingularityCount,
            data.singularityUpgrades.singInfiniteShopUpgrades.level,
            data.octeractUpgrades.octeractInfiniteShopUpgrades.level,
            data.shopUpgrades.shopInfiniteShopUpgrades,
            data.blueberryUpgrades.ambrosiaInfiniteShopUpgrades1.freeLevels,
            data.blueberryUpgrades.ambrosiaInfiniteShopUpgrades2.freeLevels,
        ];

        const cached = this.#checkCache(cacheName, calculationVars);

        if(cached) return cached;

        const dunno = () => {
            if (data.highestSingularityCount >= 280) {
                return Math.floor(0.8 * (data.highestSingularityCount - 200))
            } else if (data.highestSingularityCount >= 250) {
                return Math.floor(0.5 * (data.highestSingularityCount - 200))
            } else {
                return 0
            }
        }

        const vals: number[] = [  
            this.R_calculateRedAmbrosiaUpgradeValue('infiniteShopUpgrades'),
            dunno(),
            +data.singularityUpgrades.singInfiniteShopUpgrades.level,
            +data.octeractUpgrades.octeractInfiniteShopUpgrades.level,
            Math.floor(0.005 * data.shopUpgrades.shopInfiniteShopUpgrades * this.R_calculateSumOfExaltCompletions()),
            +data.blueberryUpgrades.ambrosiaInfiniteShopUpgrades1.freeLevels,
            +data.blueberryUpgrades.ambrosiaInfiniteShopUpgrades2.freeLevels,
        ]

        const reduced = vals.reduce((a, b) => a + b, 0);

        this.#updateCache(cacheName, { value: reduced, cachedBy: calculationVars });

        return reduce_vals ? reduced : vals;
    }

    R_calculateLimitedAscensionsDebuff() {
        if(!this.gameData) return 0;
        const data = this.gameData;
        const cacheName = 'R_LimitedAscensionsDebuff' as keyof CalculationCache;

        if (!data.singularityChallenges.limitedAscensions.enabled)
            return 1;

        const calculationVars : number[] = [
            data.ascensionCount,
            data.singularityChallenges.limitedAscensions.completions
        ];
        
        const cached = this.#checkCache(cacheName, calculationVars);

        if(cached) return cached;

        let exponent = data.ascensionCount
            - Math.max(
            0,
            20 - data.singularityChallenges.limitedAscensions.completions
        )

        exponent = Math.max(0, exponent)
        const val = Math.pow(2, exponent);

        this.#updateCache(cacheName, { value: val, cachedBy: calculationVars });

        return val;
    }

    R_calculateSingularityReductions (reduce_vals = true) {
        if(!this.gameData) return 0;
        const data = this.gameData;
        const cacheName = 'R_SingularityReductions' as keyof CalculationCache;

        const calculationVars : number[] = [
            data.insideSingularityChallenge ? 1 : 0,
            data.blueberryUpgrades.ambrosiaSingReduction2.level,
            data.blueberryUpgrades.ambrosiaSingReduction1.level,
            data.shopUpgrades.shopSingularityPenaltyDebuff
        ];
        
        const cached = this.#checkCache(cacheName, calculationVars);

        if(cached) return cached;

        let redu;

        if(data.insideSingularityChallenge) {
            redu = data.blueberryUpgrades.ambrosiaSingReduction2.level
        } else {
            redu = data.blueberryUpgrades.ambrosiaSingReduction1.level
        }

        const vals = [
            data.shopUpgrades.shopSingularityPenaltyDebuff,
            redu
        ]

        const reduced = vals.reduce((a, b) => a + b, 0)

        this.#updateCache(cacheName, { value: reduced, cachedBy: calculationVars });

        return reduce_vals ? reduced : vals;
    }

    R_calculateEffectiveSingularities (singularityCount: number = -1): number {
         if(!this.gameData) return 0;
        const data = this.gameData;

        const cacheName = 'R_EffectiveSingularities' as keyof CalculationCache;

        const calculationVars : number[] = [
            singularityCount,
            data.insideSingularityChallenge ? 1 : 0,
            data.singularityChallenges.noOcteracts.completions
        ];
        
        const cached = this.#checkCache(cacheName, calculationVars);

        if(cached) return cached;

        let effectiveSingularities = singularityCount === -1 ? data.singularityCount : singularityCount;

        effectiveSingularities *= Math.min(4.75, (0.75 * singularityCount) / 10 + 1)

        if (data.insideSingularityChallenge) {
            if (data.singularityChallenges.noOcteracts.enabled) {
                effectiveSingularities *= Math.pow(data.singularityChallenges.noOcteracts.completions + 1, 3);
            }
        }

        if (singularityCount > 10) {
            effectiveSingularities *= 1.5;
            effectiveSingularities *= Math.min(4, (1.25 * singularityCount) / 10 - 0.25);
        }

        if (singularityCount > 25) {
            effectiveSingularities *= 2.5;
            effectiveSingularities *= Math.min(6, (1.5 * singularityCount) / 25 - 0.5);
        }

        if (singularityCount > 36) {
            effectiveSingularities *= 4;
            effectiveSingularities *= Math.min(5, singularityCount / 18 - 1);
            effectiveSingularities *= Math.pow(1.1, Math.min(singularityCount - 36, 64));
        }

        if (singularityCount > 50) {
            effectiveSingularities *= 5;
            effectiveSingularities *= Math.min(8, (2 * singularityCount) / 50 - 1);
            effectiveSingularities *= Math.pow(1.1, Math.min(singularityCount - 50, 50));
        }

        if (singularityCount > 100) {
            effectiveSingularities *= 2;
            effectiveSingularities *= singularityCount / 25;
            effectiveSingularities *= Math.pow(1.1, singularityCount - 100);
        }

        if (singularityCount > 150) {
            effectiveSingularities *= 2;
            effectiveSingularities *= Math.pow(1.05, singularityCount - 150);
        }

        if (singularityCount > 200) {
            effectiveSingularities *= 1.5;
            effectiveSingularities *= Math.pow(1.275, singularityCount - 200);
        }

        if (singularityCount > 215) {
            effectiveSingularities *= 1.25;
            effectiveSingularities *= Math.pow(1.2, singularityCount - 215);
        }

        if (singularityCount > 230) {
            effectiveSingularities *= 2;
        }

        if (singularityCount > 269) {
            effectiveSingularities *= 3;
            effectiveSingularities *= Math.pow(3, singularityCount - 269);
        }

        this.#updateCache(cacheName, { value: effectiveSingularities, cachedBy: calculationVars });

        return effectiveSingularities;
    }

    R_calculateSingularityDebuff(debuff: SingularityDebuffs, singularityCount: number = -1) {
        if(!this.gameData) return 1;
        const data = this.gameData;

        if(singularityCount === -1) {
            singularityCount = data.singularityCount;
        }

        if (singularityCount === 0) {
            return 1;
        }

        if (data.runelevels[6] > 0) {
            return 1;
        }

        const constitutiveSingularityCount = singularityCount - (this.R_calculateSingularityReductions() as number)

        if (constitutiveSingularityCount < 1) {
            return 1;
        }

        const effectiveSingularities = this.R_calculateEffectiveSingularities(
            constitutiveSingularityCount
        )

        let val;

        if (debuff === 'Offering') {
            val = constitutiveSingularityCount < 150
                ? Math.sqrt(effectiveSingularities) + 1
                : Math.pow(effectiveSingularities, 2 / 3) / 400
        } else if (debuff === 'Global Speed') {
            val = 1 + Math.sqrt(effectiveSingularities) / 4
        } else if (debuff === 'Obtainium') {
            val = constitutiveSingularityCount < 150
                ? Math.sqrt(effectiveSingularities) + 1
                : Math.pow(effectiveSingularities, 2 / 3) / 400
        } else if (debuff === 'Researches') {
            val = 1 + Math.sqrt(effectiveSingularities) / 2
        } else if (debuff === 'Ascension Speed') {
            val = constitutiveSingularityCount < 150
                ? 1 + Math.sqrt(effectiveSingularities) / 5
                : 1 + Math.pow(effectiveSingularities, 0.75) / 10000
        } else if (debuff === 'Cubes') {
            const extraMult = constitutiveSingularityCount > 100
                ? Math.pow(1.02, constitutiveSingularityCount - 100)
                : 1;

            val = constitutiveSingularityCount < 150
                ? 1 + (Math.sqrt(effectiveSingularities) * extraMult) / 4
                : 1 + (Math.pow(effectiveSingularities, 0.75) * extraMult) / 1000
        } else if (debuff === 'Platonic Costs') {
            val = constitutiveSingularityCount > 36
                ? 1 + Math.pow(effectiveSingularities, 3 / 10) / 12
                : 1
        } else if (debuff === 'Hepteract Costs') {
            val = constitutiveSingularityCount > 50
                ? 1 + Math.pow(effectiveSingularities, 11 / 50) / 25
                : 1
        } else {
            val = Math.cbrt(effectiveSingularities + 1)
        }

        return val;
    }

    R_calculateAscensionSpeedExponentSpread(reduce_vals = true) {
        if(!this.gameData) return 0;
        const data = this.gameData;
        const cacheName = 'R_AscensionSpeedExponentSpread' as keyof CalculationCache;

        const calculationVars : number[] = [
            data.singularityUpgrades.singAscensionSpeed.level,
            data.singularityUpgrades.singAscensionSpeed2.level,
            data.shopUpgrades.chronometerInfinity
        ];
        
        const cached = this.#checkCache(cacheName, calculationVars);

        if(cached) return cached;

        const vals = [
            data.singularityUpgrades.singAscensionSpeed.level > 0 ? 0.03 : 0,
            data.singularityUpgrades.singAscensionSpeed2.level * 0.001,
            0.001 * Math.floor((data.shopUpgrades.chronometerInfinity + (this.R_calculateFreeShopInfinityUpgrades() as number)) / 40)
        ]

        const reduced = vals.reduce((a, b) => a + b, 0);

        this.#updateCache(cacheName, { value: reduced, cachedBy: calculationVars });

        return reduce_vals ? reduced : vals;
    }

    calculateChallenge15Reward(rewardName: keyof typeof challenge15Rewards) {
        if(!this.gameData) {
            HSLogger.errorOnce(`<red>calculateChallenge15Reward() GAMEDATA WAS NULL</red>`, this.context);
            return 0;
        } 

        const data = this.gameData;

        const exponent = data.challenge15Exponent 
        ? data.challenge15Exponent 
        : data.highestChallenge15Exponent 
        ? data.highestChallenge15Exponent 
        : 0;

        return c15Functions[rewardName](exponent);
    }

    R_calculateRawAscensionSpeedMult(reduce_vals = true) {
        if(!this.gameData) return 0;
        const data = this.gameData;
        const cacheName = 'R_RawAscensionSpeedMult' as keyof CalculationCache;

        const cube59 = data.cubeUpgrades[59] ?? 0;

        const calculationVars : number[] = [
            data.shopUpgrades.chronometer,
            data.shopUpgrades.chronometer2,
            data.shopUpgrades.chronometer3,
            data.achievements[262],
            data.achievements[263],
            data.platonicUpgrades[15],
            data.singularityCount,
            data.shopUpgrades.chronometerZ,
            data.octeractUpgrades.octeractImprovedAscensionSpeed.level,
            data.octeractUpgrades.octeractImprovedAscensionSpeed2.level,
            data.singularityChallenges.limitedAscensions.completions,
            data.singularityChallenges.limitedTime.completions,
            data.shopUpgrades.shopChronometerS,
            cube59,
            data.insideSingularityChallenge ? 1 : 0
        ];
        
        const cached = this.#checkCache(cacheName, calculationVars);

        if(cached) return cached;

        const vals : number[] = [
            // Chronometer
            1 + (1.2 / 100) * data.shopUpgrades.chronometer,
            // Chronometer2
            1 + (0.6 / 100) * data.shopUpgrades.chronometer2,
            // Chronometer3
            1 + (1.5 / 100) * data.shopUpgrades.chronometer3,
            // ChronosHepteract
            1 + (0.6 / 1000) * this.R_calculateHepteractEffective('chronos'),
            // Achievement262
            1 + Math.min(0.1, (1 / 100) * Math.log10(data.ascensionCount + 1)) * data.achievements[262],
            // Achievement263
            1 + Math.min(0.1, (1 / 100) * Math.log10(data.ascensionCount + 1)) * data.achievements[263],
            // PlatonicOMEGA
            1 + 0.002 * this.getCorruptionTotalLevel() * data.platonicUpgrades[15],
            // Challenge15
            this.calculateChallenge15Reward('ascensionSpeed'),
            // CookieUpgrade9
            1 + (1 / 400) * cube59,
            // IntermediatePack
            1 + 0.5 * (data.singularityUpgrades.intermediatePack.level > 0 ? 1 : 0),
            // ChronometerZ
            1 + (1 / 1000) * data.singularityCount * data.shopUpgrades.chronometerZ,
            // AbstractPhotokinetics
            1 + (+data.octeractUpgrades.octeractImprovedAscensionSpeed.level / 2000) * data.singularityCount,
            // AbstractExokinetics
            1 + (+data.octeractUpgrades.octeractImprovedAscensionSpeed2.level / 2000) * data.singularityCount,
            // ChronometerINF
            Math.pow(1.006, data.shopUpgrades.chronometerInfinity + (this.R_calculateFreeShopInfinityUpgrades() as number)),
            // LimitedAscensionsBuff
            Math.pow(
                1 + ((0.1 * data.singularityChallenges.limitedAscensions.completions) / 100),
                1 + Math.max(0, Math.floor(Math.log10(data.ascensionCount))),
            ),
            // LimitedTimeChallenge
            1 + ( 0.06 * data.singularityChallenges.limitedTime.completions),
            // ChronometerS
            Math.max(Math.pow(1.01, (data.singularityCount - 200) * data.shopUpgrades.shopChronometerS), 1),
            // LimitedAscensionsDebuff
            1 / this.R_calculateLimitedAscensionsDebuff(),
            // SingularityDebuff
            1 / this.R_calculateSingularityDebuff('Ascension Speed'),
            // Event
            1 + this.R_calculateConsumableEventBuff(EventBuffType.AscensionSpeed),
        ]

        const reduced = vals.reduce((a, b) => a * b, 1)

        this.#updateCache(cacheName, { value: reduced, cachedBy: calculationVars });

        return reduce_vals ? reduced : vals;
    }

    R_calculateAscensionSpeedMult() {
        let base = (this.R_calculateRawAscensionSpeedMult() as number)

        const exponentSpread = (this.R_calculateAscensionSpeedExponentSpread() as number)

        if (base < 1) {
            base = Math.pow(base, 1 - exponentSpread)
        } else {
            base = Math.pow(base, 1 + exponentSpread)
        }

        return base;
    }

    calculateAmbrosiaSpeed(reduce_vals = true) {
        if(!this.gameData) return 0;
        const gameData = this.gameData;

        if(!this.pseudoData) return 0;
        const pseudoData = this.pseudoData;

        if(!this.meData) return 0;
        const meBonuses = this.meData;

        // Maybe caching for these later?
        /*const cacheName = 'R_RequiredRedAmbrosiaTime' as keyof CalculationCache;

        const P_GEN_BUFF_LVL = pseudoData?.playerUpgrades.find(u => u.internalName === "AMBROSIA_GENERATION_BUFF")?.level ?? 0;

        const calculationVars : number[] = [
            P_GEN_BUFF_LVL,
            this.R_calculateCampaignAmbrosiaSpeedBonus(),
        ]

        const cached = this.#checkCache(cacheName, calculationVars);

        if(cached) return cached;*/

        const P_GEN_BUFF_LVL = pseudoData?.playerUpgrades.find(u => u.internalName === "AMBROSIA_GENERATION_BUFF")?.level ?? 0;
        const P_GEN_BUFF = P_GEN_BUFF_LVL ? 1 + P_GEN_BUFF_LVL * 0.05 : 0;

        const campaignBlueberrySpeedBonus = this.R_calculateCampaignAmbrosiaSpeedBonus()

        const QUARK_BONUS = 100 * (1 + meBonuses.globalBonus / 100) * (1 + meBonuses.personalBonus / 100) - 100;

        const RED_AMB_GEN_1 = this.R_calculateRedAmbrosiaUpgradeValue('blueberryGenerationSpeed');
        const RED_AMB_GEN_2 = this.R_calculateRedAmbrosiaUpgradeValue('blueberryGenerationSpeed2');

        const cube76 = gameData.cubeUpgrades[76] ?? 0;

        const vals = [
            +(gameData.visitedAmbrosiaSubtab),
            P_GEN_BUFF,
            campaignBlueberrySpeedBonus,
            (this.R_calculateAmbrosiaGenerationShopUpgrade() as number),
            (this.R_calculateAmbrosiaGenerationSingularityUpgrade() as number),
            (this.R_calculateAmbrosiaGenerationOcteractUpgrade() as number),
            1 + (gameData.blueberryUpgrades.ambrosiaPatreon.level * QUARK_BONUS) / 100,
            (1 + gameData.singularityChallenges.oneChallengeCap.completions / 100),
            (1 + gameData.singularityChallenges.noAmbrosiaUpgrades.completions / 50),
            RED_AMB_GEN_1,
            RED_AMB_GEN_2,
            1 + 0.01 * cube76 * this.R_calculateNumberOfThresholds(),
            this.isEvent ? 1 + this.R_calculateConsumableEventBuff(EventBuffType.BlueberryTime) : 1
        ];

        const reduced = vals.reduce((a, b) => a * b, 1);

        return reduce_vals ? reduced : vals;
    }

    calculateBlueBerries(reduce_vals = true) {
        const gameData = this.getGameData();

        if(!gameData) return 0;

        let noAmbrosiaFactor = 0;

        if(gameData.singularityChallenges.noAmbrosiaUpgrades.completions >= 10)
            noAmbrosiaFactor = 2;
        else if(gameData.singularityChallenges.noAmbrosiaUpgrades.completions > 0)
            noAmbrosiaFactor = 1;

        const vals = [
            +(gameData.singularityChallenges.noSingularityUpgrades.completions > 0),
            +(gameData.singularityUpgrades.blueberries.level),
            +(gameData.octeractUpgrades.octeractBlueberries.level),
            this.R_calculateSingularityMilestoneBlueberries(),
            noAmbrosiaFactor
        ]

        const reduced = vals.reduce((a, b) => a + b, 0);

        return reduce_vals ? reduced : vals;
    }

    calculateLuck(reduce_vals = true, true_base = false) : 
    { additive: number, raw: number, total: number } |
    { additive: number[], raw: number[] } {
        const gameData = this.getGameData();
        const pseudoData = this.getPseudoData();

        if(!gameData) return { additive: 0, raw: 0, total: 0 };
        if(!pseudoData) return { additive: 0, raw: 0, total: 0 };

        const cube77 = gameData.cubeUpgrades[77] ?? 0

        const additiveComponents = [
            1,
            gameData.singularityChallenges.noSingularityUpgrades.completions >= 30 ? 0.05 : 0,
            this.R_calculateDilatedFiveLeafBonus(),
            gameData.shopUpgrades.shopAmbrosiaLuckMultiplier4 / 100,
            gameData.singularityChallenges.noAmbrosiaUpgrades.completions / 200,
            0.001 * cube77,
            this.isEvent ? this.R_calculateConsumableEventBuff(EventBuffType.AmbrosiaLuck) : 0
        ]

        const P_BUFF_LVL = pseudoData.playerUpgrades.find(u => u.internalName === "AMBROSIA_LUCK_BUFF")?.level;
        const P_BUFF = P_BUFF_LVL ?  P_BUFF_LVL * 20 : 0;
        const campaignBonus = this.R_calculateCampaignLuckBonus()

        const RED_AMB_FREE_ROW_2 = this.R_calculateRedAmbrosiaUpgradeValue('freeLevelsRow2');
        const RED_AMB_FREE_ROW_3 = this.R_calculateRedAmbrosiaUpgradeValue('freeLevelsRow3');
        const RED_AMB_FREE_ROW_4 = this.R_calculateRedAmbrosiaUpgradeValue('freeLevelsRow4');
        const RED_AMB_FREE_ROW_5 = this.R_calculateRedAmbrosiaUpgradeValue('freeLevelsRow5');

        const RED_AMB_FREE_ROWS : { [key: number]: number } = {
            2: RED_AMB_FREE_ROW_2,
            3: RED_AMB_FREE_ROW_3,
            4: RED_AMB_FREE_ROW_4,
            5: RED_AMB_FREE_ROW_5,
        }

        const effLevel = (level: number, rowNum: number) => {
            if(true_base)
                return RED_AMB_FREE_ROWS[rowNum];
             else
                return level + RED_AMB_FREE_ROWS[rowNum];
        }

        const blueLuck1 = gameData.blueberryUpgrades.ambrosiaLuck1.level;
        const blueLuck2 = gameData.blueberryUpgrades.ambrosiaLuck2.level;
        const blueLuck3 = gameData.blueberryUpgrades.ambrosiaLuck3.level;

        // https://github.com/Pseudo-Corp/SynergismOfficial/blob/master/src/BlueberryUpgrades.ts#L564
        const totalCubes = this.R_calculateTotalCubes();

        const blueCubeLuck = gameData.blueberryUpgrades.ambrosiaCubeLuck1.level;
        const blueQuarkLuck = gameData.blueberryUpgrades.ambrosiaQuarkLuck1.level;

        const RED_AMB_LUCK1 = this.R_calculateRedAmbrosiaUpgradeValue('regularLuck');
        const RED_AMB_LUCK2 = this.R_calculateRedAmbrosiaUpgradeValue('regularLuck2');
        const RED_AMB_VISCOUNT = this.R_calculateRedAmbrosiaUpgradeValue('viscount');

        const rawLuckComponents1 = [
            100,
            P_BUFF,
            campaignBonus,
            this.R_calculateSingularityAmbrosiaLuckMilestoneBonus(),
            (this.R_calculateAmbrosiaLuckShopUpgrade() as number),
            (this.R_calculateAmbrosiaLuckSingularityUpgrade() as number),
            (this.R_calculateAmbrosiaLuckOcteractUpgrade() as number),
            // 1
            2 * effLevel(blueLuck1, 2) + 12 * Math.floor(effLevel(blueLuck1, 2) / 10),
            // 2
            (3 + 0.3 * Math.floor(effLevel(blueLuck1, 2) / 10))
            * effLevel(blueLuck2, 4) + 40 * Math.floor(effLevel(blueLuck2, 4) / 10),
            // 3
            (this.calculateBlueBerries() as number) * effLevel(blueLuck3, 5),
            // cubeluck
            this.R_calculateTotalCubes() * 0.02 * effLevel(blueCubeLuck, 3),
            // quarkluck
            0.02 * effLevel(blueQuarkLuck, 3) * 
            Math.floor(Math.pow(Math.log10(Number(gameData.worlds) + 1) + 1, 2)),
            // sing 131
            gameData.highestSingularityCount >= 131 ? 131 : 0,
            // sing 269
            gameData.highestSingularityCount >= 269 ? 269 : 0,
            // shop
            gameData.shopUpgrades.shopOcteractAmbrosiaLuck * (1 + Math.floor(Math.log10(gameData.totalWowOcteracts + 1))),
            // sing challenge
            gameData.singularityChallenges.noAmbrosiaUpgrades.completions * 15,
            RED_AMB_LUCK1,
            RED_AMB_LUCK2,
            RED_AMB_VISCOUNT,
            2 * cube77,
            this.R_calculateCookieUpgrade29Luck(),
            gameData.shopUpgrades.shopAmbrosiaUltra * this.R_calculateSumOfExaltCompletions(),
        ]

        const rawLuckComponents2 = [
            0
        ]

        let rawLuckComponents = [];

        if(true_base) {
            rawLuckComponents = rawLuckComponents1;
        } else {
            rawLuckComponents = [...rawLuckComponents1, ...rawLuckComponents2];
        }

        if(reduce_vals) {
            const additivesTotal = additiveComponents.reduce((a, b) => a + b, 0);
            const rawTotal = rawLuckComponents.reduce((a, b) => a + b, 0);

            return {
                additive: additivesTotal,
                raw: rawTotal,
                total: additivesTotal * rawTotal
            }
        } else {
            return {
                additive: additiveComponents,
                raw: rawLuckComponents
            }
        }
    }

    dumpDataForHeater() {
        if(!this.gameData) return 0;
        const data = this.gameData;

        const {additive, raw, total} = this.calculateLuck(true) as { additive: number, raw: number, total: number };
        const true_luck = this.calculateLuck(true, true) as { additive: number, raw: number, total: number };

        const heaterData = {
            ...this.gameData,
            hs_data: {
                lifeTimeAmbrosia: data.lifetimeAmbrosia,
                lifeTimeRedAmbrosia: data.lifetimeRedAmbrosia,
                quarks: data.worlds,
                platonic4x4: data.platonicUpgrades[19],
                baseLuck: raw,
                luckMult: additive,
                totalLuck: total,
                trueBaseLuck: true_luck.raw,
                totalCubes: this.R_calculateTotalCubes(),
                effectiveSingularity: data.highestSingularityCount,
                transcription: 0.55 + data.octeractUpgrades.octeractOneMindImprover.level / 150,
                ascSpeed: this.R_calculateAscensionSpeedMult(),
                blueberries: this.calculateBlueBerries(),
                bonusRow2: this.R_calculateRedAmbrosiaUpgradeValue('freeLevelsRow2'),
                bonusRow3: this.R_calculateRedAmbrosiaUpgradeValue('freeLevelsRow3'),
                bonusRow4: this.R_calculateRedAmbrosiaUpgradeValue('freeLevelsRow4'),
                bonusRow5: this.R_calculateRedAmbrosiaUpgradeValue('freeLevelsRow5'),
                spread: this.R_calculateAscensionSpeedExponentSpread(),
                totalInfinityVouchers: this.R_calculateAllShopTablets(),
                tokens: this.campaignData?.tokens,
                maxTokens: this.campaignData?.maxTokens,
                isAtMaxTokens: this.campaignData?.isAtMaxTokens,
                isEvent: this.isEvent,
                bellStacks: this.eventData?.HAPPY_HOUR_BELL.amount,
                personalQuarkBonus: this.meData?.bonus.quarkBonus,
                pseudoCoinUpgrades: {
                    ambrosiaGenerationBuffLevel: this.pseudoData?.playerUpgrades.find(u => u.internalName === "AMBROSIA_GENERATION_BUFF")?.level,
                    ambrosiaLuckBuffLevel: this.pseudoData?.playerUpgrades.find(u => u.internalName === "AMBROSIA_LUCK_BUFF")?.level,
                    baseObtainiumBuffLevel: this.pseudoData?.playerUpgrades.find(u => u.internalName === "BASE_OBTAINIUM_BUFF")?.level,
                    baseOfferingBuffLevel: this.pseudoData?.playerUpgrades.find(u => u.internalName === "BASE_OFFERING_BUFF")?.level,
                    cubeBuffLevel: this.pseudoData?.playerUpgrades.find(u => u.internalName === "CUBE_BUFF")?.level,
                    redAmbrosiaGenerationBuffLevel: this.pseudoData?.playerUpgrades.find(u => u.internalName === "RED_GENERATION_BUFF")?.level,
                    redAmbrosiaLuckBuffLevel: this.pseudoData?.playerUpgrades.find(u => u.internalName === "RED_LUCK_BUFF")?.level,
                },
                isInsideSingularityChallenge: data.insideSingularityChallenge,
            }
        }

        return heaterData;
    }
}