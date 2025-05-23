import { HSCalculationDefinition } from "../../../types/data-types/hs-gamedata-api-types";

export const HSCalculationDefinitions: HSCalculationDefinition[] = [
    {
        calculationName: "Consumable Event Buff",
        fnName: "R_calculateConsumableEventBuff",
        fnParams: [
            {
                paramName: "buff",
                paramType: "EventBuffType"
            }
        ],
        supportsReduce: false,
        toolingSupport: false
    },
    {
        calculationName: "Ambrosia Generation Shop Upgrade",
        fnName: "R_calculateAmbrosiaGenerationShopUpgrade",
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
        calculationName: "Ambrosia Generation Singularity Upgrade",
        fnName: "R_calculateAmbrosiaGenerationSingularityUpgrade",
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
        calculationName: "Ambrosia Generation Octeract Upgrade",
        fnName: "R_calculateAmbrosiaGenerationOcteractUpgrade",
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
        calculationName: "Singularity Milestone Blueberries",
        fnName: "R_calculateSingularityMilestoneBlueberries",
        fnParams: [],
        supportsReduce: false,
        toolingSupport: true
    },
    {
        calculationName: "Dilated Five Leaf Bonus",
        fnName: "R_calculateDilatedFiveLeafBonus",
        fnParams: [],
        supportsReduce: false,
        toolingSupport: true
    },
    {
        calculationName: "Singularity Ambrosia Luck Milestone Bonus",
        fnName: "R_calculateSingularityAmbrosiaLuckMilestoneBonus",
        fnParams: [],
        supportsReduce: false,
        toolingSupport: true
    },
    {
        calculationName: "Ambrosia Luck Shop Upgrade",
        fnName: "R_calculateAmbrosiaLuckShopUpgrade",
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
        calculationName: "Ambrosia Luck Singularity Upgrade",
        fnName: "R_calculateAmbrosiaLuckSingularityUpgrade",
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
        calculationName: "Ambrosia Luck Octeract Upgrade",
        fnName: "R_calculateAmbrosiaLuckOcteractUpgrade",
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
        calculationName: "Total Cubes",
        fnName: "R_calculateTotalCubes",
        fnParams: [],
        supportsReduce: false,
        toolingSupport: true
    },
    {
        calculationName: "Red Ambrosia Upgrade Value",
        fnName: "R_calculateRedAmbrosiaUpgradeValue",
        fnParams: [
            {
                paramName: "upgradeName",
                paramType: "keyof RedAmbrosiaUpgrades"
            }
        ],
        supportsReduce: false,
        toolingSupport: false
    },
    {
        calculationName: "Campaign Ambrosia Speed Bonus",
        fnName: "R_calculateCampaignAmbrosiaSpeedBonus",
        fnParams: [],
        supportsReduce: false,
        toolingSupport: true
    },
    {
        calculationName: "Campaign Luck Bonus",
        fnName: "R_calculateCampaignLuckBonus",
        fnParams: [],
        supportsReduce: false,
        toolingSupport: true
    },
    {
        calculationName: "Cookie Upgrade 29 Luck",
        fnName: "R_calculateCookieUpgrade29Luck",
        fnParams: [],
        supportsReduce: false,
        toolingSupport: true
    },
    {
        calculationName: "Sum Of Exalt Completions",
        fnName: "R_calculateSumOfExaltCompletions",
        fnParams: [],
        supportsReduce: false,
        toolingSupport: true
    },
    {
        calculationName: "Number Of Thresholds",
        fnName: "R_calculateNumberOfThresholds",
        fnParams: [],
        supportsReduce: false,
        toolingSupport: true
    },
    {
        calculationName: "To Next Threshold",
        fnName: "R_calculateToNextThreshold",
        fnParams: [],
        supportsReduce: false,
        toolingSupport: true
    },
    {
        calculationName: "Required Blueberry Time",
        fnName: "R_calculateRequiredBlueberryTime",
        fnParams: [],
        supportsReduce: false,
        toolingSupport: true
    },
    {
        calculationName: "Required Red Ambrosia Time",
        fnName: "R_calculateRequiredRedAmbrosiaTime",
        fnParams: [],
        supportsReduce: false,
        toolingSupport: true
    },
    {
        calculationName: "Corruption Total Level",
        fnName: "getCorruptionTotalLevel",
        fnParams: [],
        supportsReduce: false,
        toolingSupport: true
    },
    {
        calculationName: "Hepteract Effective",
        fnName: "R_calculateHepteractEffective",
        fnParams: [
            {
                paramName: "heptType",
                paramType: "HepteractType"
            }
        ],
        supportsReduce: false,
        toolingSupport: false
    },
    {
        calculationName: "Free Shop Infinity Upgrades",
        fnName: "R_calculateFreeShopInfinityUpgrades",
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
        calculationName: "All Shop Tablets",
        fnName: "R_calculateAllShopTablets",
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
        calculationName: "Limited Ascensions Debuff",
        fnName: "R_calculateLimitedAscensionsDebuff",
        fnParams: [],
        supportsReduce: false,
        toolingSupport: true
    },
    {
        calculationName: "Singularity Reductions",
        fnName: "R_calculateSingularityReductions",
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
        calculationName: "Effective Singularities",
        fnName: "R_calculateEffectiveSingularities",
        fnParams: [
            {
                paramName: "singularityCount",
                paramType: "number",
                defaultValue: -1
            }
        ],
        supportsReduce: false,
        toolingSupport: true
    },
    {
        calculationName: "Singularity Debuff",
        fnName: "R_calculateSingularityDebuff",
        fnParams: [
            {
                paramName: "debuff",
                paramType: "SingularityDebuffs"
            },
            {
                paramName: "singularityCount",
                paramType: "number",
                defaultValue: -1
            }
        ],
        supportsReduce: false,
        toolingSupport: false
    },
    {
        calculationName: "Ascension Speed Exponent Spread",
        fnName: "R_calculateAscensionSpeedExponentSpread",
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
        calculationName: "Challenge 15 Reward",
        fnName: "calculateChallenge15Reward",
        fnParams: [
            {
                paramName: "rewardName",
                paramType: "keyof typeof challenge15Rewards"
            }
        ],
        supportsReduce: false,
        toolingSupport: false
    },
    {
        calculationName: "Raw Ascension Speed Mult",
        fnName: "R_calculateRawAscensionSpeedMult",
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
        calculationName: "Ascension Speed Mult",
        fnName: "R_calculateAscensionSpeedMult",
        fnParams: [],
        supportsReduce: false,
        toolingSupport: true
    },
    {
        calculationName: "Ambrosia Speed",
        fnName: "calculateAmbrosiaSpeed",
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
        calculationName: "Blueberries",
        fnName: "calculateBlueBerries",
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
        calculationName: "Luck",
        fnName: "calculateLuck",
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
        calculationName: "Luck Conversion",
        fnName: "R_calculateLuckConversion",
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
        calculationName: "Red Ambrosia Luck",
        fnName: "R_calculateRedAmbrosiaLuck",
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
        calculationName: "Golden Revolution",
        fnName: "calculateGoldenRevolution",
        fnParams: [],
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