/*
    Heater export: the snapshot of the player's data that the heater reads (HSGameDataAPI.dumpDataForHeater).
    No refresh and no logging here: dumpDataForHeater takes a fresh save first and reports errors.
    Author: XxMolkxX, Shewchou
*/

import Decimal from "break_infinity.js";
import { EventBuffType, type ConsumableGameEvents } from "../../../types/data-types/hs-event-data";
import { ShopUpgradeGroups, pseudoCoinUpgradeNames, type AmbrosiaUpgradeNames } from "../../../types/data-types/hs-gamedata-api-types";
import type { GameData } from "../../../types/data-types/hs-player-savedata";
import type { CampaignData } from "../../../types/data-types/hs-campaign-data";
import type { MeData } from "../../../types/data-types/hs-me-data";
import type { HSGameDataAPI } from "./hs-gamedata-api";
import { floorLog10OfOnePlus, parseGameDataDecimal } from "./hs-gamedata-utils";
import { buildHeaterCoinsC15Input } from './hs-heater-coins-export';

/** The API's protected data the export reads, taken after the refresh. */
export interface HSHeaterExportData {
    gameData: GameData;
    meData: MeData | undefined;
    eventData: ConsumableGameEvents | undefined;
    campaignData: CampaignData | undefined;
    isEvent: boolean;
}

export function buildHeaterExport(api: HSGameDataAPI, { gameData, meData, eventData, campaignData, isEvent }: HSHeaterExportData): any {
    const luck =                    api.luck.calculateLuck(true)       as { luckBase: number, luckMult: number, luckTotal: number };
    // The game's no-purchased-Ambrosia baseline still applies free
    // levels granted by Red Ambrosia upgrades. Purple Ambrosia
    // enchantment free levels are tied to purchased yellow upgrades,
    // so they are absent from this baseline.
    const noAmbLuck =              api.luck.calculateLuck(true, 'true_base') as { luckBase: number, luckMult: number, luckTotal: number };
    // SynergismOfficial/src/Calculate.ts calculateAmbrosiaRewardLuck:
    // Two Mind changes per-fill luck, while other luck-based effects
    // continue to use the unmodified total.
    const rewardLuck = api.ambrosia.getAmbrosiaUpgradeEffects('twoMind').twoMindEnabled
        ? luck.luckTotal * api.ambrosia.calculateRequiredBlueberryTime()
            / api.ambrosia.calculateRequiredBlueberryTime(true)
        : luck.luckTotal;
    const ambrosiaGainChance =      (rewardLuck - 100 * Math.floor(rewardLuck / 100)) / 100;
    const trueAmbrosiaGainChance =  (noAmbLuck.luckTotal - 100 * Math.floor(noAmbLuck.luckTotal / 100)) / 100;
    const talismanRuneBonuses =     api.talisman.getRuneBonusFromAllTalismansBatch();
    const noAmbTalismanPower =     api.talisman.allTalismanRuneBonusStatsSum('true_base');
    // Re-evaluate the official talisman formula with the no-Ambrosia
    // multiplier. This retains Red Ambrosia free levels while
    // excluding purchased yellow Ambrosia levels.
    const noAmbTalismanRuneBonuses = api.talisman.getRuneBonusFromAllTalismansBatch('true_base');
    const noAmbTalismanRuneBonusSI = noAmbTalismanRuneBonuses.superiorIntellect;
    const noAmbTalismanRuneBonusIA = noAmbTalismanRuneBonuses.infiniteAscent;
    const runeIaBonusLevelsTotal = api.getRuneBonusLevels('infiniteAscent')
        - talismanRuneBonuses.infiniteAscent
        + noAmbTalismanRuneBonusIA;
    const ambSpeedNoAmb =          (api.ambrosia.calculateAmbrosiaGenerationSpeed(true, 'true_base') as number);
    const blueberries =             (api.ambrosia.calculateBlueberryInventory() as number);
    const ambSpeedNoAmbBerries =   ambSpeedNoAmb * blueberries;
    const purpleLeoLevel =          api.purple.getPurpleAmbrosiaUpgradeLevel('leo');
    // Heater inputs that represent a loadout with no purchased
    // (yellow) Ambrosia use the game's true-base mode. This keeps
    // Red Ambrosia free levels while excluding purchased yellow
    // levels. Purple Ambrosia enchantment free levels are likewise
    // absent here because they only apply with those purchases.
    const luckConversion =          api.luck.calculateLuckConversion(true, 'true_base') as number;
    // This is an active-module export (there is no NoAmb suffix), so
    // use the game's normal Red Ambrosia luck calculation.
    const redLuck =                 api.luck.calculateRedAmbrosiaLuck(true) as number;
    const redLuckNoAmb =            api.luck.calculateRedAmbrosiaLuck(true, 'true_base') as number;
    const activeBells = isEvent ? (eventData?.HAPPY_HOUR_BELL.amount ?? 0) : 0;
    // The heater applies the bells from its Active Bells field
    // (applyHeaterBells), so its luck and blue bar speed come without
    // them: the same terms GDS added, taken out. The global event's
    // blue bar part shares the bells' factor (Statistics.ts 'Event').
    const globalEventBlueBarBonus = isEvent ? api.getVanillaGlobalEventBuff(EventBuffType.BlueberryTime) : 0;
    const bellBlueBarBonus = isEvent ? api.calculateConsumableEventBuff(EventBuffType.BlueberryTime) : 0;
    const ambSpeedNoAmbBerriesNoBells = ambSpeedNoAmbBerries
        * (1 + globalEventBlueBarBonus) / (1 + globalEventBlueBarBonus + bellBlueBarBonus);
    const luckMultNoAmbNoBells = noAmbLuck.luckMult - api.calculateConsumableEventBuff(EventBuffType.AmbrosiaLuck);
    // Red luck holds floor((Ambrosia luck - 100) / conversion): that
    // term too is taken at the luck without bells
    // (calculateRedAmbrosiaLuck, luckTotal = luckBase * luckMult)
    const redLuckNoAmbNoBells = redLuckNoAmb
        - Math.floor((noAmbLuck.luckTotal - 100) / luckConversion)
        + Math.floor((noAmbLuck.luckBase * luckMultNoAmbNoBells - 100) / luckConversion);
    const ambrosiaUpgradeNames = Object.keys(api.ambrosia.ambrosiaUpgradeCalculationCollection) as AmbrosiaUpgradeNames[];
    const ambrosiaUpgradeBonusLevels = Object.fromEntries(
        ambrosiaUpgradeNames.map((name) => [name, api.ambrosia.getPurpleAmbrosiaEnchantmentFreeLevels(name)])
    );
    const ambrosiaUpgradeBlueberryCostReductions = Object.fromEntries(
        ambrosiaUpgradeNames.map((name) => [name, api.ambrosia.getAmbrosiaUpgradeBlueberryCostReduction(name)])
    );
    // SynergismOfficial/src/Calculate.ts calculateRequiredBlueberryTime:
    // preserve the pre-ceiling requirement so Heater can recalculate
    // Brick of Lead's reciprocal bar requirement exactly per loadout.
    let blueBarRequirementBeforeRounding = 45 + Math.floor(gameData.lifetimeAmbrosia / 300);
    blueBarRequirementBeforeRounding *= api.quarkShop.getShopUpgradeEffects('shopAmbrosiaAccelerator', 'ambrosiaPointRequirementMult') as number;
    if (gameData.lifetimeAmbrosia >= 10_000) {
        blueBarRequirementBeforeRounding *= Math.pow(gameData.lifetimeAmbrosia / 10_000, Math.log10(4));
    }
    // These values are the no-Ambrosia starting point used by the
    // Heater. Candidate Ambrosia loadouts add their free shop levels
    // to this snapshot using the same group rules as Shop.ts.
    const shopBonusLevelsNoAmbrosia = {
        offering: api.quarkShop.getShopUpgradeTypeBonusLevels(ShopUpgradeGroups.Offering, 'true_base'),
        obtainium: api.quarkShop.getShopUpgradeTypeBonusLevels(ShopUpgradeGroups.Obtainium, 'true_base'),
        cubes: api.quarkShop.getShopUpgradeTypeBonusLevels(ShopUpgradeGroups.Cubes, 'true_base'),
        speed: api.quarkShop.getShopUpgradeTypeBonusLevels(ShopUpgradeGroups.Speed, 'true_base'),
        quark: api.quarkShop.getShopUpgradeTypeBonusLevels(ShopUpgradeGroups.Quark, 'true_base'),
        ambrosiaLuck: api.quarkShop.getShopUpgradeTypeBonusLevels(ShopUpgradeGroups.AmbrosiaLuck, 'true_base'),
        redAmbrosiaLuck: api.quarkShop.getShopUpgradeTypeBonusLevels(ShopUpgradeGroups.RedAmbrosiaLuck, 'true_base'),
        ambrosiaGeneration: api.quarkShop.getShopUpgradeTypeBonusLevels(ShopUpgradeGroups.AmbrosiaGeneration, 'true_base'),
        infinity: api.quarkShop.getShopUpgradeTypeBonusLevels(ShopUpgradeGroups.InfinityUpgrades, 'true_base'),
    };
    const heaterShopUpgradeKeys = [
        'offeringEX', 'offeringEX2', 'offeringEX3',
        'obtainiumEX', 'obtainiumEX2', 'obtainiumEX3',
        'cashGrab', 'cashGrab2',
        'seasonPass', 'seasonPass2', 'seasonPass3', 'seasonPassY',
        'seasonPassZ', 'seasonPassLost', 'seasonPassInfinity',
        'chronometerInfinity',
        'improveQuarkHept', 'improveQuarkHept2', 'improveQuarkHept3',
        'improveQuarkHept4', 'improveQuarkHept5',
        'shopAmbrosiaLuck1', 'shopAmbrosiaLuck2', 'shopAmbrosiaLuck3', 'shopAmbrosiaLuck4',
        'shopRedLuck1', 'shopRedLuck2', 'shopRedLuck3', 'shopRedLuck4',
        'shopAmbrosiaGeneration1', 'shopAmbrosiaGeneration2',
        'shopAmbrosiaGeneration3', 'shopAmbrosiaGeneration4',
        'shopPanthema',
    ] as const;
    const shopUpgradeRawLevels = Object.fromEntries(
        heaterShopUpgradeKeys.map((name) => [name, Number(gameData.shopUpgrades[name] ?? 0)])
    );
    const baseOff = api.allBaseOfferingStats.reduce((sum, line) => sum + (
        line.i18n === 'AmbrosiaBaseOffering1'
            ? api.ambrosia.getAmbrosiaUpgradeEffects('ambrosiaBaseOffering1', 'true_base').offering
            : line.i18n === 'AmbrosiaBaseOffering2'
                ? api.ambrosia.getAmbrosiaUpgradeEffects('ambrosiaBaseOffering2', 'true_base').offering
                : line.i18n === 'OfferingEX3'
                    ? api.quarkShop.getShopUpgradeEffects('offeringEX3', 'baseOfferings', 'true_base') as number
                    : line.stat()
    ), 0);
    const baseObt = api.allBaseObtainiumStats.reduce((sum, line) => sum + (
        line.i18n === 'AmbrosiaBaseObtainium1'
            ? api.ambrosia.getAmbrosiaUpgradeEffects('ambrosiaBaseObtainium1', 'true_base').obtainium
            : line.i18n === 'AmbrosiaBaseObtainium2'
                ? api.ambrosia.getAmbrosiaUpgradeEffects('ambrosiaBaseObtainium2', 'true_base').obtainium
                : line.stat()
    ), 0);
    
    const heaterData = {
        ...gameData,
        hs_data: {
            lifetimeAmbrosia:       gameData.lifetimeAmbrosia,
            lifetimeRedAmbrosia:    gameData.lifetimeRedAmbrosia,
            bonusAmbrosiaPerFill:   api.getSingularityChallengeEffect('noAmbrosiaUpgrades', 'bonusAmbrosia'),
            lifetimePurpleAmbrosia: gameData.lifetimePurpleAmbrosia ?? 0,
            ambrosiaBarPointsS:     (api.ambrosia.calculateAmbrosiaGenerationSpeed(true, false) as number),
            ambrosiaBarPointsSNoAmb: ambSpeedNoAmb,
            blueberries:            blueberries,
            finalAmbrosiaBarPointsSNoAmb: ambSpeedNoAmbBerries,
            finalAmbrosiaBarPointsSNoAmbNoBells: ambSpeedNoAmbBerriesNoBells,
            purpleLeoLevel:         purpleLeoLevel,
            ambrosiaLuck:           luck.luckBase,
            totalAdditiveLuckMultiplier: luck.luckMult,
            totalAmbrosiaLuck:      luck.luckTotal,
            ambrosiaLuckNoAmb:      noAmbLuck.luckBase,
            totalAdditiveLuckMultiplierNoAmb: noAmbLuck.luckMult,
            totalAdditiveLuckMultiplierNoAmbNoBells: luckMultNoAmbNoBells,
            totalAmbrosiaLuckNoAmb: noAmbLuck.luckTotal,
            totalRedLuck:           redLuck,
            totalRedLuckNoAmb:      redLuckNoAmb,
            totalRedLuckNoAmbNoBells: redLuckNoAmbNoBells,
            ambrosiaLuckPer1RedLuckNoAmb: luckConversion,
            quarksOwned:            Number(gameData.worlds) || 0,
            qHept:                  gameData.hepteracts.quark.BAL,
            cubesExp3D:             floorLog10OfOnePlus(gameData.wowCubes),
            cubesExp4D:             floorLog10OfOnePlus(gameData.wowTesseracts),
            cubesExp5D:             floorLog10OfOnePlus(gameData.wowHypercubes),
            cubesExp6D:             floorLog10OfOnePlus(gameData.wowPlatonicCubes),
            cubesExp7D:             floorLog10OfOnePlus(gameData.wowAbyssals),
            cubesExp8D:             floorLog10OfOnePlus(gameData.wowOcteracts),
            cubesExpTotal:          api.calculateTotalCubesExp() - 6, // Vanilla adds +6
            currentSingularity:     gameData.singularityCount,
            singularityReducers:    (api.calculateSingularityReductions(true, true) as number),
            exalt:                  api.getActiveExalt(),
            exalt5Unlocked:         gameData.singularityChallenges.noAmbrosiaUpgrades.completions > 0,
            exalt9Unlocked:         gameData.singularityChallenges.taxmanLastStand.completions > 0,
            postAoag:               api.rune.getRuneLevelFromEXP('antiquities', parseGameDataDecimal(gameData.runes.antiquities)) > 0,
            oneMindUnlocked:        Boolean(api.goldenQuark.getGQUpgradeEffect('oneMind', 'unlocked')),
            aquariusUnlocked:       Boolean(api.purple.getPurpleAmbrosiaUpgradeLevel('aquarius')),
            transcription:          api.octeract.getOcteractUpgradeLevel('octeractOneMindImprover'),
            // Export both stages of the game's calculation: the raw
            // multiplier before exponentiation and the final value
            // after the ascension-speed exponent is applied.
            baseAscensionSpeedMultiplierNoAmb: api.calculateRawAscensionSpeedMult(true, 'true_base'),
            finalAscensionSpeedMultiplierNoAmb: api.calculateAscensionSpeedMult('true_base'),
            ascensionSpeedExponentNoAmb: api.calculateAscensionSpread(true, 'true_base'),
            totalBaseObtainiumNoAmb: baseObt,
            totalBaseOfferingsNoAmb: baseOff,
            bonusTutorial:          api.ambrosia.getRedAmbrosiaUpgradeEffects('freeTutorialLevels').freeLevels,
            bonusRow2:              api.ambrosia.getRedAmbrosiaUpgradeEffects('freeLevelsRow2').freeLevels,
            bonusRow3:              api.ambrosia.getRedAmbrosiaUpgradeEffects('freeLevelsRow3').freeLevels,
            bonusRow4:              api.ambrosia.getRedAmbrosiaUpgradeEffects('freeLevelsRow4').freeLevels,
            bonusRow5:              api.ambrosia.getRedAmbrosiaUpgradeEffects('freeLevelsRow5').freeLevels,
            runeSiExp:                  parseGameDataDecimal(gameData.runes.superiorIntellect),
            runeSiRCNoAmb:              api.rune.getLevelsPerOOM('superiorIntellect', 'true_base'),
            runeSiBonusLevelsTotalNoAmb: api.firstFiveFreeLevels() + noAmbTalismanRuneBonusSI,
            runeSiBonusLevelsTalismanNoAmbrosia: noAmbTalismanRuneBonusSI,
            totalSIRunePowerMultiplier: api.firstFiveEffectiveRuneLevelMult() * api.rune.SIEffectiveRuneLevelMult(),
            runeIaExp:                  parseGameDataDecimal(gameData.runes.infiniteAscent),
            runeIaBonusLevelsTotalNoAmb: new Decimal(runeIaBonusLevelsTotal),
            runeIaBonusLevelsTalismanNoAmb: new Decimal(noAmbTalismanRuneBonusIA),
            totalTalismanPowerMultiplierNoAmb: new Decimal(noAmbTalismanPower),
            patreonBonus:               api.getPatreonBonus(),
            activeBells:                activeBells,
            globalEventBlueBarBonus:    globalEventBlueBarBonus,
            // Not read by the heater any more: it uses panthemaLevel
            jack:                       api.quarkShop.getShopLevel('shopPanthema') > 0,
            freeShopLevelsInfinityNoAmb: api.freeInfinityLevels('true_base'),
            freeShopLevelsCube:         api.quarkShop.getShopFreeLevelsCube(),
            freeShopLevelsSpeed:        api.quarkShop.getShopFreeLevelsAscensionSpeed(),
            freeShopLevelsQuarkNoAmb:   api.quarkShop.getShopFreeLevelsQuark('true_base'),
            chronometerLevelNoAmb:      api.quarkShop.getShopLevel('chronometerInfinity', 'true_base'),
            shopAmbrosiaLuck1:          gameData.shopUpgrades.shopAmbrosiaLuck1,
            shopAmbrosiaLuck2:          gameData.shopUpgrades.shopAmbrosiaLuck2,
            shopAmbrosiaLuck3:          gameData.shopUpgrades.shopAmbrosiaLuck3,
            shopAmbrosiaLuck4:          gameData.shopUpgrades.shopAmbrosiaLuck4,
            shopRedLuck1:               gameData.shopUpgrades.shopRedLuck1,
            shopRedLuck2:               gameData.shopUpgrades.shopRedLuck2,
            shopRedLuck3:               gameData.shopUpgrades.shopRedLuck3,
            shopRedLuck4:               gameData.shopUpgrades.shopRedLuck4,
            shopAmbrosiaGeneration1:    gameData.shopUpgrades.shopAmbrosiaGeneration1,
            shopAmbrosiaGeneration2:    gameData.shopUpgrades.shopAmbrosiaGeneration2,
            shopAmbrosiaGeneration3:    gameData.shopUpgrades.shopAmbrosiaGeneration3,
            shopAmbrosiaGeneration4:    gameData.shopUpgrades.shopAmbrosiaGeneration4,
            shopImproveQuarkHept1:      gameData.shopUpgrades.improveQuarkHept,
            shopImproveQuarkHept2:      gameData.shopUpgrades.improveQuarkHept2,
            shopImproveQuarkHept3:      gameData.shopUpgrades.improveQuarkHept3,
            shopImproveQuarkHept4:      gameData.shopUpgrades.improveQuarkHept4,
            shopImproveQuarkHept5:      gameData.shopUpgrades.improveQuarkHept5,
            redBarCapacity:             api.ambrosia.calculateRequiredRedAmbrosiaTime(),
            // This field is the game's active-module total.  The
            // optimizer may apply candidate levels separately, but
            // the exported game stat itself includes Patreon and all
            // other active Ambrosia effects.
            totalRedBarPointsS:          api.calculateRedAmbrosiaGenerationSpeed(),
            totalRedBarPointsSNoAmb:     api.calculateRedAmbrosiaGenerationSpeed('true_base'),
            blueBarMaxWithoutTwoMindAndBrick: api.ambrosia.calculateRequiredBlueberryTime(true, true),
            blueBarRequirementBeforeRounding,
            redBarMaxWithoutTwoMind:    api.ambrosia.calculateRequiredRedAmbrosiaTime(true),
            // SynergismOfficial/src/Calculate.ts, PurpleReactor.ts,
            // and Helper.ts: the optimizer needs the saved routing
            // settings and the fixed per-fill feedback effects.
            heaterReactor: {
                blueRoutingPercent: gameData.purpleReactor?.ambrosiaBarPointPercentage ?? 0,
                redRoutingPercent: gameData.purpleReactor?.redAmbrosiaBarPointPercentage ?? 0,
                blueStoredPoints: gameData.purpleReactor?.storedAmbrosiaBarPoints ?? 0,
                redStoredPoints: gameData.purpleReactor?.storedRedAmbrosiaBarPoints ?? 0,
                blueCapacity: 1_000_000_000
                    + 250_000_000 * api.getPCoinUpgradeLevel('PURPLE_REACTOR_CAPACITY_BUFF')
                    + (['purpleCapacityExpander1', 'purpleCapacityExpander2', 'purpleCapacityExpander3', 'purpleCapacityExpander4'] as const)
                        .reduce((sum, key) => sum + api.purple.getPurpleReactorUpgradeEffects(key, 'ambrosiaCapacity'), 0),
                encabulatorSpeed: 12
                    + (['purpleHalfLife1', 'purpleHalfLife2', 'purpleHalfLife3', 'purpleHalfLife4'] as const)
                        .reduce((sum, key) => sum + api.purple.getPurpleReactorUpgradeEffects(key, 'encabulatorSpeed'), 0),
                purpleRequirementWithoutTwoMind: api.ambrosia.calculatePurpleHoneyConversionFactor(true),
                cancerPurplePointsPerBlueOrRedFill: api.purple.getPurpleAmbrosiaUpgradeEffects('cancer', 'purpleBarPointsOnFill'),
                purpleFillBluePoints: api.purple.getPurpleAmbrosiaUpgradeEffects('gemini', 'ambrosiaBarPointsOnFill')
                    + api.quarkShop.getShopUpgradeEffects('shopPurpleBarRebate', 'ambrosiaBarPointsPerFill'),
                purpleFillRedPoints: api.purple.getPurpleAmbrosiaUpgradeEffects('gemini', 'redAmbrosiaBarPointsOnFill')
                    + api.quarkShop.getShopUpgradeEffects('shopPurpleBarRebate', 'redAmbrosiaBarPointsPerFill'),
                scorpioConversionMultiplier: api.purple.getPurpleAmbrosiaUpgradeEffects('scorpio', 'purpleReactorConversionMult'),
                ariesBarPointMultiplier: api.purple.getPurpleAmbrosiaUpgradeEffects('aries', 'universalBarPointMult'),
                overcapEnabled: Boolean(gameData.encabulatorOvercapToggle
                    && api.purple.getPurpleAmbrosiaUpgradeEffects('libra', 'overcapToggleUnlocked')),
                barDependenceEnabled: Boolean(gameData.singularityChallenges.barDependence.enabled),
            },
            // Purple Honey luck and per-extraction values do not depend on
            // purchased Ambrosia levels; the bar-income model applies Two Mind.
            heaterPurple: {
                purpleHoneyLuck: api.purple.calculatePurpleHoneyLuck(),
                purpleHoneyPerExtraction: api.purple.calculatePurpleHoneyPerExtraction(),
                ...api.calculatePurpleAmbrosiaCraftCosts(),
            },
            heaterCoinsC15: buildHeaterCoinsC15Input(api, gameData, campaignData?.tokens ?? 0),
            ambrosiaUpgradeBonusLevels,
            ambrosiaUpgradeBlueberryCostReductions,
            shopUpgradeRawLevels,
            shopBonusLevelsNoAmbrosia,
            panthemaLevel:            api.quarkShop.getShopLevel('shopPanthema', 'non_ambrosia'),
            tauPower:                 api.goldenQuark.getGQUpgradeEffect('platonicTau', 'tauPower'),
            // Not read by the heater any more: it follows its Exalt select (4 = No Quark Upgrades)
            shopUpgradesDisabled:     gameData.singularityChallenges.noQuarkUpgrades.enabled,
            purpleHoney:                gameData.purpleReactor?.purpleHoney ?? 0,
            lifetimePurpleHoney:        gameData.purpleReactor?.lifetimePurpleHoney ?? 0,
            purpleHoneyBarValue:        gameData.purpleHoneyProgress ?? 0,
            purpleHoneyBarMax:          api.ambrosia.calculatePurpleHoneyConversionFactor(),
            // Not Heater
            totalVouchers:              api.calculateAllShopTablets(),
            plat4x4:                gameData.platonicUpgrades[19],
            tokens:                 campaignData?.tokens,
            isEvent:                isEvent,
            bellStacks:             eventData?.HAPPY_HOUR_BELL.amount ?? 0,
            blueAmbrosiaBarValue:   gameData.blueberryTime,
            redAmbrosiaBarValue:    gameData.redAmbrosiaTime,
            blueAmbrosiaBarMax:     api.ambrosia.calculateRequiredBlueberryTime(),
            redAmbrosiaBarMax:      api.ambrosia.calculateRequiredRedAmbrosiaTime(),
            ambrosiaGainChance:       ambrosiaGainChance,
            trueAmbrosiaGainChance:   trueAmbrosiaGainChance,
            ambrosiaAcceleratorCount: api.quarkShop.getShopLevel('shopAmbrosiaAccelerator'),
            pseudoCoinUpgrades: {
                ambrosiaGenerationBuffLevel:    api.getPCoinUpgradeLevel('AMBROSIA_GENERATION_BUFF'),
                ambrosiaLuckBuffLevel:          api.getPCoinUpgradeLevel('AMBROSIA_LUCK_BUFF'),
                baseObtainiumBuffLevel:         api.getPCoinUpgradeLevel('BASE_OBTAINIUM_BUFF'),
                baseOfferingBuffLevel:          api.getPCoinUpgradeLevel('BASE_OFFERING_BUFF'),
                cubeBuffLevel:                  api.getPCoinUpgradeLevel('CUBE_BUFF'),
                redAmbrosiaGenerationBuffLevel: api.getPCoinUpgradeLevel('RED_GENERATION_BUFF'),
                redAmbrosiaLuckBuffLevel:       api.getPCoinUpgradeLevel('RED_LUCK_BUFF'),
                // Keep the complete current PseudoCoin upgrade set in
                // the heater snapshot. These newer Purple upgrades
                // are harmless to older consumers and make detection
                // explicit for downstream integrations.
                instantUnlock1Level:            api.getPCoinUpgradeLevel('INSTANT_UNLOCK_1'),
                instantUnlock2Level:            api.getPCoinUpgradeLevel('INSTANT_UNLOCK_2'),
                goldenQuarkBuffLevel:           api.getPCoinUpgradeLevel('GOLDEN_QUARK_BUFF'),
                freeUpgradePromocodeBuffLevel:  api.getPCoinUpgradeLevel('FREE_UPGRADE_PROMOCODE_BUFF'),
                corruptionLoadoutSlotQolLevel:  api.getPCoinUpgradeLevel('CORRUPTION_LOADOUT_SLOT_QOL'),
                ambrosiaLoadoutSlotQolLevel:    api.getPCoinUpgradeLevel('AMBROSIA_LOADOUT_SLOT_QOL'),
                autoPotionFreePotionsQolLevel:  api.getPCoinUpgradeLevel('AUTO_POTION_FREE_POTIONS_QOL'),
                offlineTimerCapBuffLevel:       api.getPCoinUpgradeLevel('OFFLINE_TIMER_CAP_BUFF'),
                addCodeCapBuffLevel:            api.getPCoinUpgradeLevel('ADD_CODE_CAP_BUFF'),
                purpleLuckBuffLevel:            api.getPCoinUpgradeLevel('PURPLE_LUCK_BUFF'),
                purpleHoneyBuffLevel:           api.getPCoinUpgradeLevel('PURPLE_HONEY_BUFF'),
                purpleReactorCapacityBuffLevel:api.getPCoinUpgradeLevel('PURPLE_REACTOR_CAPACITY_BUFF'),
                pseudoCoinUpgradeLevels:       Object.fromEntries(
                    pseudoCoinUpgradeNames.map((name) => [name, api.getPCoinUpgradeLevel(name)])
                ),
            },
            redAmbrosiaUpgrades: {
                tutorial:                   api.ambrosia.calculateRedAmbrosiaUpgradeValue('tutorial'),
                freeTutorialLevels:         api.ambrosia.calculateRedAmbrosiaUpgradeValue('freeTutorialLevels'),
                conversionImprovement1:     api.ambrosia.calculateRedAmbrosiaUpgradeValue('conversionImprovement1'),
                blueberryGenerationSpeed:   api.ambrosia.calculateRedAmbrosiaUpgradeValue('blueberryGenerationSpeed'),
                regularLuck:                api.ambrosia.calculateRedAmbrosiaUpgradeValue('regularLuck'),
                blueberries:                api.ambrosia.calculateRedAmbrosiaUpgradeValue('blueberries'),
                redAmbrosiaFreeAccumulator: api.ambrosia.calculateRedAmbrosiaUpgradeValue('redAmbrosiaFreeAccumulator'),

                freeLevelsRow2:             api.ambrosia.calculateRedAmbrosiaUpgradeValue('freeLevelsRow2'),
                redAmbrosiaCube:            api.ambrosia.calculateRedAmbrosiaUpgradeValue('redAmbrosiaCube'),
                redAmbrosiaObtainium:       api.ambrosia.calculateRedAmbrosiaUpgradeValue('redAmbrosiaObtainium'),
                redAmbrosiaOffering:        api.ambrosia.calculateRedAmbrosiaUpgradeValue('redAmbrosiaOffering'),
                freeOfferingUpgrades:       api.ambrosia.calculateRedAmbrosiaUpgradeValue('freeOfferingUpgrades'),
                
                freeLevelsRow3:             api.ambrosia.calculateRedAmbrosiaUpgradeValue('freeLevelsRow3'),
                conversionImprovement2:     api.ambrosia.calculateRedAmbrosiaUpgradeValue('conversionImprovement2'),
                redGenerationSpeed:         api.ambrosia.calculateRedAmbrosiaUpgradeValue('redGenerationSpeed'),
                redGenerationSpeed2:        api.ambrosia.calculateRedAmbrosiaUpgradeValue('redGenerationSpeed2'),
                redLuck:                    api.ambrosia.calculateRedAmbrosiaUpgradeValue('redLuck'),
                salvageYinYang:             api.ambrosia.calculateRedAmbrosiaUpgradeValue('salvageYinYang'),
                freeObtainiumUpgrades:      api.ambrosia.calculateRedAmbrosiaUpgradeValue('freeObtainiumUpgrades'),

                freeLevelsRow4:             api.ambrosia.calculateRedAmbrosiaUpgradeValue('freeLevelsRow4'),
                redAmbrosiaCubeImprover:    api.ambrosia.calculateRedAmbrosiaUpgradeValue('redAmbrosiaCubeImprover'),
                infiniteShopUpgrades:       api.ambrosia.calculateRedAmbrosiaUpgradeValue('infiniteShopUpgrades'),
                redAmbrosiaAccelerator:     api.ambrosia.calculateRedAmbrosiaUpgradeValue('redAmbrosiaAccelerator'),
                freeCubeUpgrades:           api.ambrosia.calculateRedAmbrosiaUpgradeValue('freeCubeUpgrades'),

                viscount:                   api.ambrosia.calculateRedAmbrosiaUpgradeValue('viscount'),
                freeLevelsRow5:             api.ambrosia.calculateRedAmbrosiaUpgradeValue('freeLevelsRow5'),
                conversionImprovement3:     api.ambrosia.calculateRedAmbrosiaUpgradeValue('conversionImprovement3'),
                blueberryGenerationSpeed2:  api.ambrosia.calculateRedAmbrosiaUpgradeValue('blueberryGenerationSpeed2'),
                regularLuck2:               api.ambrosia.calculateRedAmbrosiaUpgradeValue('regularLuck2'),
                freeSpeedUpgrades:          api.ambrosia.calculateRedAmbrosiaUpgradeValue('freeSpeedUpgrades'),
            },
            me_data: {
                globalBonus:    meData?.globalBonus,
                bonus:          meData?.bonus,
            }
        }
    }

    return heaterData as any;
}
