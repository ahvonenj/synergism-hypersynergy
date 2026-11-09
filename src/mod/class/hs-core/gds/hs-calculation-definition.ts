import { AntUpgrades, CalculationMode, HSCalculationDefinition, HSCalculationParamOption, HSCalculationParams, hepteractTypeList, SingularityDebuffs } from "../../../types/data-types/hs-gamedata-api-types";
import { EventBuffType } from "../../../types/data-types/hs-event-data";
import { CHALLENGE15_CORRUPTION_KEYS, CORRUPTION_CUBE_TYPES, CORRUPTION_EFFECT_KEYS } from "./hs-gamedata-api-corruption";
import { challenge15Rewards, redAmbrosiaUpgradeCalculationCollection } from "./hs-gamedata-tables";

// ===== Param options for the Tools tab =====

const optionsFromKeys = (keys: readonly string[]): HSCalculationParamOption[] => keys.map((key) => ({ label: key, value: key }));

// A numeric enum also maps its values back to its names
const optionsFromNumericEnum = (enumObject: Record<string, string | number>): HSCalculationParamOption[] => Object.entries(enumObject)
    .filter(([, value]) => typeof value === "number")
    .map(([label, value]) => ({ label, value }));

const MODE_PARAM: HSCalculationParams = {
    paramName: "mode",
    paramType: "CalculationMode",
    defaultValue: "normal",
    options: optionsFromKeys(["normal", "true_base", "non_ambrosia"] satisfies CalculationMode[])
};

const SINGULARITY_COUNT_PARAM: HSCalculationParams = {
    paramName: "singularityCount",
    paramType: "number",
    defaultValue: -1,
    label: "Singularity (-1: current)"
};

const EVENT_BUFF_PARAM: HSCalculationParams = {
    paramName: "buff",
    paramType: "EventBuffType",
    options: optionsFromNumericEnum(EventBuffType)
};

const SINGULARITY_DEBUFF_OPTIONS = optionsFromKeys([
    "Offering", "Obtainium", "Salvage", "Global Speed", "Researches", "Ant ELO",
    "Ascension Speed", "Cubes", "Cube Upgrades", "Platonic Costs", "Hepteract Costs"
] satisfies SingularityDebuffs[]);

// Read from the save again at the click, after its forced save; "current" is 0 inside an ascension challenge, as in the game
const CORRUPTION_LEVEL_PARAM: HSCalculationParams = {
    paramName: "level",
    paramType: "number",
    options: (data) => [
        { label: "current", value: data && data.currentChallenge.ascension === 0 ? data.corruptions.used : 0 },
        { label: "next", value: data?.corruptions.next },
    ]
};

// -1 is the current ascension's level with its free levels, 0 inside an ascension challenge, as in the game
const CUBE_CORRUPTION_LEVEL_PARAM: HSCalculationParams = {
    paramName: "level",
    paramType: "number",
    options: (data) => [
        { label: "current", value: -1 },
        { label: "next", value: data?.corruptions.next },
    ]
};

export const HSCalculationDefinitions: HSCalculationDefinition[] = [
    {
        calculationName: "Event Buff: Consumables",
        fnName: "calculateConsumableEventBuff",
        fnParams: [EVENT_BUFF_PARAM],
        supportsReduce: false,
        toolingSupport: true
    },
    {
        calculationName: "Ambrosia Speed: Shop Upgrade",
        fnName: "calculateAmbrosiaGenerationShopUpgrade",
        fnParams: [
            {
                paramName: "reduce_vals",
                paramType: "boolean",
                defaultValue: true
            },
            MODE_PARAM
        ],
        supportsReduce: true,
        toolingSupport: true
    },
    {
        calculationName: "Ambrosia Speed: Singularity Upgrade",
        fnName: "calculateAmbrosiaGenerationSingularityUpgrade",
        fnParams: [
            {
                paramName: "reduce_vals",
                paramType: "boolean",
                defaultValue: true
            }
        ],
        supportsReduce: true,
        toolingSupport: true
    },
    {
        calculationName: "Ambrosia Speed: Octeract Upgrade",
        fnName: "calculateAmbrosiaGenerationOcteractUpgrade",
        fnParams: [
            {
                paramName: "reduce_vals",
                paramType: "boolean",
                defaultValue: true
            }
        ],
        supportsReduce: true,
        toolingSupport: true
    },
    {
        calculationName: "Ambrosia Blueberries: Singularity Milestones",
        fnName: "calculateSingularityMilestoneBlueberries",
        fnParams: [],
        supportsReduce: false,
        toolingSupport: true
    },
    {
        calculationName: "Ambrosia Luck: Dilated Five-Leaf Clover",
        fnName: "calculateDilatedFiveLeafBonus",
        fnParams: [],
        supportsReduce: false,
        toolingSupport: true
    },
    {
        calculationName: "Ambrosia Luck: Singularity Milestones",
        fnName: "calculateSingularityAmbrosiaLuckMilestoneBonus",
        fnParams: [],
        supportsReduce: false,
        toolingSupport: true
    },
    {
        calculationName: "Ambrosia Luck: Shop Upgrade",
        fnName: "calculateAmbrosiaLuckShopUpgrade",
        fnParams: [
            {
                paramName: "reduce_vals",
                paramType: "boolean",
                defaultValue: true
            },
            MODE_PARAM
        ],
        supportsReduce: true,
        toolingSupport: true
    },
    {
        calculationName: "Ambrosia Luck: Singularity Upgrade",
        fnName: "calculateAmbrosiaLuckSingularityUpgrade",
        fnParams: [
            {
                paramName: "reduce_vals",
                paramType: "boolean",
                defaultValue: true
            }
        ],
        supportsReduce: true,
        toolingSupport: true
    },
    {
        calculationName: "Ambrosia Luck: Octeract Upgrade",
        fnName: "calculateAmbrosiaLuckOcteractUpgrade",
        fnParams: [
            {
                paramName: "reduce_vals",
                paramType: "boolean",
                defaultValue: true
            }
        ],
        supportsReduce: true,
        toolingSupport: true
    },
    {
        calculationName: "Cubes Opened (log10 sum)",
        fnName: "calculateTotalCubesExp",
        fnParams: [],
        supportsReduce: false,
        toolingSupport: true
    },
    {
        calculationName: "Red Ambrosia Upgrade Value",
        fnName: "calculateRedAmbrosiaUpgradeValue",
        fnParams: [
            {
                paramName: "upgradeName",
                paramType: "keyof RedAmbrosiaUpgrades",
                options: optionsFromKeys(Object.keys(redAmbrosiaUpgradeCalculationCollection))
            }
        ],
        supportsReduce: false,
        toolingSupport: true
    },
    {
        calculationName: "Ambrosia Speed: Campaign Bonus",
        fnName: "calculateCampaignAmbrosiaSpeedBonus",
        fnParams: [],
        supportsReduce: false,
        toolingSupport: true
    },
    {
        calculationName: "Ambrosia Luck: Campaign Bonus",
        fnName: "calculateCampaignLuckBonus",
        fnParams: [],
        supportsReduce: false,
        toolingSupport: true
    },
    {
        calculationName: "Ambrosia Luck: Cookie Upgrade 29",
        fnName: "calculateCookieUpgrade29Luck",
        fnParams: [],
        supportsReduce: false,
        toolingSupport: true
    },
    {
        calculationName: "Exalt Completions",
        fnName: "calculateSumOfExaltCompletions",
        fnParams: [],
        supportsReduce: false,
        toolingSupport: true
    },
    {
        calculationName: "Ambrosia Thresholds",
        fnName: "calculateNumberOfThresholds",
        fnParams: [],
        supportsReduce: false,
        toolingSupport: true
    },
    {
        calculationName: "Ambrosia Thresholds: Ambrosia to Next",
        fnName: "calculateToNextThreshold",
        fnParams: [],
        supportsReduce: false,
        toolingSupport: true
    },
    {
        calculationName: "Ambrosia Bar Requirement",
        fnName: "calculateRequiredBlueberryTime",
        fnParams: [
            {
                paramName: "ignoreTwoMind",
                paramType: "boolean",
                defaultValue: false
            },
            {
                paramName: "ignoreBrickOfLead",
                paramType: "boolean",
                defaultValue: false
            }
        ],
        supportsReduce: false,
        toolingSupport: true
    },
    {
        calculationName: "Red Ambrosia Bar Requirement",
        fnName: "calculateRequiredRedAmbrosiaTime",
        fnParams: [
            {
                paramName: "ignoreTwoMind",
                paramType: "boolean",
                defaultValue: false
            }
        ],
        supportsReduce: false,
        toolingSupport: true
    },
    {
        calculationName: "Corruption Level",
        fnName: "getActiveCorruptionLevel",
        fnParams: [],
        supportsReduce: false,
        toolingSupport: true
    },
    {
        calculationName: "Corruption Level: Free Levels",
        fnName: "calculateFreeCorruptionLevels",
        fnParams: [
            {
                paramName: "reduce_vals",
                paramType: "boolean",
                defaultValue: true
            }
        ],
        supportsReduce: true,
        toolingSupport: true
    },
    {
        calculationName: "Corruption Level: Effective",
        fnName: "getActiveEffectiveCorruptionLevel",
        fnParams: [],
        supportsReduce: false,
        toolingSupport: true
    },
    {
        calculationName: "Corruption Level: Platonic Scaling",
        fnName: "getPlatonicCorruptionScaling",
        fnParams: [],
        supportsReduce: false,
        toolingSupport: true
    },
    {
        calculationName: "Hepteract Effective Amount",
        fnName: "calculateHepteractEffective",
        fnParams: [
            {
                paramName: "heptType",
                paramType: "HepteractType",
                options: optionsFromKeys(hepteractTypeList)
            }
        ],
        supportsReduce: false,
        toolingSupport: true
    },
    {
        calculationName: "Vouchers",
        fnName: "calculateAllShopTablets",
        fnParams: [
            {
                paramName: "reduce_vals",
                paramType: "boolean",
                defaultValue: true
            },
            MODE_PARAM
        ],
        supportsReduce: true,
        toolingSupport: true
    },
    {
        calculationName: "Exalt Debuff: Limited Ascensions",
        fnName: "calculateLimitedAscensionsDebuff",
        fnParams: [],
        supportsReduce: false,
        toolingSupport: true
    },
    {
        calculationName: "Singularity Debuff: Reductions",
        fnName: "calculateSingularityReductions",
        fnParams: [
            {
                paramName: "reduce_vals",
                paramType: "boolean",
                defaultValue: true
            },
            {
                paramName: "true_base",
                paramType: "boolean",
                defaultValue: false
            }
        ],
        supportsReduce: true,
        toolingSupport: true
    },
    {
        calculationName: "Singularity Debuff: Effective Singularities",
        fnName: "calculateEffectiveSingularities",
        fnParams: [SINGULARITY_COUNT_PARAM],
        supportsReduce: false,
        toolingSupport: true
    },
    {
        calculationName: "Singularity Debuff",
        fnName: "calculateSingularityDebuff",
        fnParams: [
            {
                paramName: "debuff",
                paramType: "SingularityDebuffs",
                options: SINGULARITY_DEBUFF_OPTIONS
            },
            SINGULARITY_COUNT_PARAM
        ],
        supportsReduce: false,
        toolingSupport: true
    },
    {
        calculationName: "Ascension Speed Exponent Spread",
        fnName: "calculateAscensionSpread",
        fnParams: [
            {
                paramName: "reduce_vals",
                paramType: "boolean",
                defaultValue: true
            },
            MODE_PARAM
        ],
        supportsReduce: true,
        toolingSupport: true
    },
    {
        calculationName: "Challenge 15 Reward",
        fnName: "calculateChallenge15Reward",
        fnParams: [
            {
                paramName: "rewardName",
                paramType: "keyof typeof challenge15Rewards",
                options: optionsFromKeys(Object.keys(challenge15Rewards))
            }
        ],
        supportsReduce: false,
        toolingSupport: true
    },
    {
        calculationName: "Ascension Speed Multiplier: Raw",
        fnName: "calculateRawAscensionSpeedMult",
        fnParams: [
            {
                paramName: "reduce_vals",
                paramType: "boolean",
                defaultValue: true
            },
            MODE_PARAM
        ],
        supportsReduce: true,
        toolingSupport: true
    },
    {
        calculationName: "Ascension Speed Multiplier",
        fnName: "calculateAscensionSpeedMult",
        fnParams: [MODE_PARAM],
        supportsReduce: false,
        toolingSupport: true
    },
    {
        calculationName: "Ambrosia Speed",
        fnName: "calculateAmbrosiaGenerationSpeed",
        fnParams: [
            {
                paramName: "reduce_vals",
                paramType: "boolean",
                defaultValue: true
            },
            MODE_PARAM
        ],
        supportsReduce: true,
        toolingSupport: true
    },
    {
        calculationName: "Ambrosia Blueberries",
        fnName: "calculateBlueberryInventory",
        fnParams: [
            {
                paramName: "reduce_vals",
                paramType: "boolean",
                defaultValue: true
            }
        ],
        supportsReduce: true,
        toolingSupport: true
    },
    {
        calculationName: "Ambrosia Luck",
        fnName: "calculateLuck",
        fnParams: [
            {
                paramName: "reduce_vals",
                paramType: "boolean",
                defaultValue: true
            },
            MODE_PARAM
        ],
        supportsReduce: true,
        toolingSupport: true
    },
    {
        calculationName: "Red Ambrosia Luck: Conversion",
        fnName: "calculateLuckConversion",
        fnParams: [
            {
                paramName: "reduce_vals",
                paramType: "boolean",
                defaultValue: true
            },
            MODE_PARAM
        ],
        supportsReduce: true,
        toolingSupport: true
    },
    {
        calculationName: "Red Ambrosia Luck",
        fnName: "calculateRedAmbrosiaLuck",
        fnParams: [
            {
                paramName: "reduce_vals",
                paramType: "boolean",
                defaultValue: true
            },
            MODE_PARAM
        ],
        supportsReduce: true,
        toolingSupport: true
    },
    {
        calculationName: "Golden Revolution",
        fnName: "calculateGoldenRevolution",
        fnParams: [],
        supportsReduce: false,
        toolingSupport: true
    },
    {
        calculationName: "Rune Salvage",
        fnName: "calculateTotalSalvage",
        fnParams: [],
        supportsReduce: false,
        toolingSupport: true
    },
    {
        calculationName: "Rune Salvage: Positive",
        fnName: "calculatePositiveSalvage",
        fnParams: [],
        supportsReduce: false,
        toolingSupport: true
    },
    {
        calculationName: "Rune Salvage: Negative",
        fnName: "calculateNegativeSalvage",
        fnParams: [],
        supportsReduce: false,
        toolingSupport: true
    },
    {
        calculationName: "Rune Salvage: First Five Runes",
        fnName: "calculateFirstFiveRuneSalvage",
        fnParams: [],
        supportsReduce: false,
        toolingSupport: true
    },
    {
        calculationName: "Rune Salvage: Corruption",
        fnName: "calculateBadOfferingsSalvage",
        fnParams: [],
        supportsReduce: false,
        toolingSupport: true
    },
    // ----- Ambrosia, luck, purple -----
    {
        // The HSGameDataAPI copy, which hides the helper's: no reduce_vals, hence no components
        calculationName: "Red Ambrosia Speed",
        fnName: "calculateRedAmbrosiaGenerationSpeed",
        fnParams: [MODE_PARAM],
        supportsReduce: false,
        toolingSupport: true
    },
    {
        calculationName: "Ambrosia Bar Income",
        fnName: "calculateAmbrosiaBarIncome",
        fnParams: [],
        supportsReduce: false,
        toolingSupport: true
    },
    {
        calculationName: "Ambrosia Upgrade Value",
        fnName: "calculateAmbrosiaUpgradeValue",
        fnParams: [
            {
                paramName: "upgradeName",
                paramType: "AmbrosiaUpgradeNames",
                options: (data) => optionsFromKeys(Object.keys(data?.ambrosiaUpgrades ?? {}))
            },
            {
                paramName: "freeLevelsOnly",
                paramType: "boolean",
                defaultValue: false
            }
        ],
        supportsReduce: false,
        toolingSupport: true
    },
    {
        calculationName: "Ambrosia Luck: Panthema",
        fnName: "calculatePanthemaAmbrosiaLuck",
        fnParams: [MODE_PARAM],
        supportsReduce: false,
        toolingSupport: true
    },
    {
        calculationName: "Red Ambrosia Luck: Panthema",
        fnName: "calculatePanthemaRedLuck",
        fnParams: [MODE_PARAM],
        supportsReduce: false,
        toolingSupport: true
    },
    {
        calculationName: "Purple Honey Luck",
        fnName: "calculatePurpleHoneyLuck",
        fnParams: [],
        supportsReduce: false,
        toolingSupport: true
    },
    {
        calculationName: "Purple Honey Luck Breakdown",
        fnName: "calculatePurpleHoneyLuckBreakdown",
        fnParams: [],
        supportsReduce: false,
        toolingSupport: true
    },
    {
        calculationName: "Purple Honey Per Extraction",
        fnName: "calculatePurpleHoneyPerExtraction",
        fnParams: [],
        supportsReduce: false,
        toolingSupport: true
    },
    // ----- Cubes, ascension, corruptions -----
    {
        calculationName: "Cube Bank",
        fnName: "calculateCubeBank",
        fnParams: [
            {
                paramName: "reduce_vals",
                paramType: "boolean",
                defaultValue: true
            }
        ],
        supportsReduce: true,
        toolingSupport: true
    },
    {
        calculationName: "Cube Gain: Corruption Lines",
        fnName: "calculateCubeGainBase",
        fnParams: [
            {
                paramName: "reduce_vals",
                paramType: "boolean",
                defaultValue: true
            },
            {
                paramName: "cube",
                paramType: "CorruptionCubeType",
                options: optionsFromKeys(CORRUPTION_CUBE_TYPES)
            },
            CUBE_CORRUPTION_LEVEL_PARAM
        ],
        supportsReduce: true,
        toolingSupport: true
    },
    {
        calculationName: "Corruption Effect",
        fnName: "getCorruptionEffect",
        fnParams: [
            CORRUPTION_LEVEL_PARAM,
            {
                paramName: "corruption",
                paramType: "CorruptionEffectKey",
                options: optionsFromKeys(CORRUPTION_EFFECT_KEYS)
            }
        ],
        supportsReduce: false,
        toolingSupport: true
    },
    {
        calculationName: "Corruption Effect: Challenge 15",
        fnName: "getChallenge15CorruptionEffect",
        fnParams: [
            {
                paramName: "corruption",
                paramType: "Challenge15CorruptionKey",
                options: optionsFromKeys(CHALLENGE15_CORRUPTION_KEYS)
            }
        ],
        supportsReduce: false,
        toolingSupport: true
    },
    // ----- Runes, talismans, other -----
    {
        calculationName: "Rune Levels (Total)",
        fnName: "calculateTotalRuneLevels",
        fnParams: [],
        supportsReduce: false,
        toolingSupport: true
    },
    {
        calculationName: "Construction: Before Multiplier",
        fnName: "calculateRawConstruction",
        fnParams: [],
        supportsReduce: false,
        toolingSupport: true
    },
    {
        calculationName: "Construction",
        fnName: "calculateConstruction",
        fnParams: [],
        supportsReduce: false,
        toolingSupport: true
    },
    {
        calculationName: "Construction: Coin Buildings",
        fnName: "calculateCoinConstruction",
        fnParams: [],
        supportsReduce: false,
        toolingSupport: true
    },
    {
        calculationName: "Talisman Rarity (Total)",
        fnName: "calculateTalismanRarityTotal",
        fnParams: [],
        supportsReduce: false,
        toolingSupport: true
    },
    {
        calculationName: "Synergism Level",
        fnName: "calculateSynergismLevel",
        fnParams: [],
        supportsReduce: false,
        toolingSupport: true
    },
    {
        calculationName: "Ant Upgrade True Level",
        fnName: "calculateTrueAntLevel",
        fnParams: [
            {
                paramName: "antUpgrade",
                paramType: "AntUpgrades",
                options: optionsFromNumericEnum(AntUpgrades)
            }
        ],
        supportsReduce: false,
        toolingSupport: true
    },
    {
        calculationName: "Event Buff",
        fnName: "calculateEventSourceBuff",
        fnParams: [EVENT_BUFF_PARAM],
        supportsReduce: false,
        toolingSupport: true
    },
    {
        calculationName: "Dump Data For Heater",
        fnName: "dumpDataForHeater",
        fnParams: [],
        supportsReduce: false,
        toolingSupport: false
    }
];
