import type { HeaterOptimizerInput } from "../../../types/data-types/hs-heater-types";
import type { HSIcon } from "../../hs-utils/hs-icons";

// Optimizer inputs the modal doesn't show, on purpose (they come straight from
// the export). A new input that copies a modal field must read the field
// instead (fillStatsAndOptionsFromInput), or editing that field does nothing.
type HeaterInputBase = Omit<HeaterOptimizerInput,
    | 'heaterOptions'                           // the "Loadouts to heat" checkboxes
    | 'ambrosiaUpgradeBonusLevels'              // per upgrade, from Purple enchantments
    | 'ambrosiaUpgradeBlueberryCostReductions'  // per upgrade
    | 'runeSiBonusLevelsTalismanNoAmbrosia'     // the talisman part of SI Bonus Levels
    | 'runeSiEffectiveLevelMultiplier'          // a derived multiplier
    | 'shopUpgradeRawLevels'                    // the modal's shop fields override their keys; the others only matter through vouchers and free levels
    | 'shopBonusLevelsNoAmbrosia'               // the modal's Free Quark/Infinity override theirs; the other groups are built from many sources
    | 'tauPower'                                // 1 or 1.01: only the Cube/Oct Effect text and the Amb+Oct score
    | 'reactor'                                 // the Opt rows already search the routing
    | 'purple'
    | 'coinsC15'>;                              // fixed values calculated in C15
type HeaterInputKey = keyof HeaterInputBase;

type HeaterFieldType = 'number' | 'percent' | 'boolean' | 'text' | 'select';

type HeaterFieldBase<K extends HeaterInputKey = HeaterInputKey> = {
    // On a group's first field: the heading row drawn above it
    heading?: string;
    key: K;
    label: string;
    type: HeaterFieldType;
    url?: string;
    icon?: HSIcon;
};

type HeaterSelectField<K extends HeaterInputKey = HeaterInputKey> = HeaterFieldBase<K> & {
    type: 'select';
    options: ReadonlyArray<{ value: number; label: string }>;
};

type HeaterNonSelectField<K extends HeaterInputKey = HeaterInputKey> = HeaterFieldBase<K> & {
    type: Exclude<HeaterFieldType, 'select'>;
    options?: never;
};

type HeaterInputField = HeaterSelectField | HeaterNonSelectField;

export type { HeaterInputField, HeaterInputKey, HeaterInputBase };

// Exalts by name: the game's own numbering doesn't agree with itself. The
// values are GDS's getActiveExalt(), by unlock singularity, which the
// optimizer's Exalt rules use.
export const HEATER_EXALT_OPTIONS = [
    { value: 0,  label: "None" },
    { value: 1,  label: "No Golden Quark Upgrades" },
    { value: 2,  label: "One Challenge Caps" },
    { value: 3,  label: "Limited Ascensions" },
    { value: 4,  label: "No Quark Upgrades" },
    { value: 5,  label: "No Octeract Effects" },
    { value: 6,  label: "No Ambrosia Upgrades" },
    { value: 7,  label: "Grand Singularity Speedrun" },
    { value: 8,  label: "Sadistic Prequel" },
    { value: 9,  label: "Taxman's Last Stand" },
    { value: 10, label: "Bar Charging" },
] as const;

export function getHeaterExaltName(exalt: number): string {
    return HEATER_EXALT_OPTIONS.find((option) => option.value === exalt)?.label ?? `Exalt ${exalt}`;
}

export const inputDefinitions = [
    { heading: "Heat for", key: "exalt", label: "Exalt?", type: "select", options: HEATER_EXALT_OPTIONS, url: "Pictures/Default/TinySChalTime.png" },
    { key: "currentSingularity",        label: "Current Singularity",       type: "number",  url: "Pictures/Default/Singularity.png" },
    { key: "activeBells",               label: "Active Bells",              type: "number",  url: "Pictures/PseudoShop/HAPPY_HOUR_BELL.png" },
    { key: "globalEventBlueBarBonus",   label: "Event Blue Bar Bonus",      type: "percent", url: "Pictures/PseudoShop/GLOBALTimeSkip.png" },
    { key: "postAoag",                  label: "Post-AoAG (Obt/Off/Coins)", type: "boolean", url: "Pictures/Runes/Antiquities.png" },

    { heading: "Blue Ambrosia", key: "amb", label: "Lifetime Ambrosia",         type: "number",  url: "Pictures/Achievements/Progressive/AmbrosiaCount.png" },
    { key: "blueberries",               label: "Blueberries Owned",         type: "number",  url: "Pictures/Default/Blueberries.png" },
    { key: "purpleLeoLevel",            label: "Purple Leo Level",          type: "number",  url: "Pictures/PurpleAmbrosia/Purple Ambrosia Upgrades/Leo.png" },
    { key: "luckBaseNoAmb",             label: "Base Luck",                 type: "number",  url: "Pictures/Achievements/Rewards/AmbrosiaLuck.png" },
    { key: "luckMultNoAmb",             label: "Base Luck Mult (no bells)", type: "percent", url: "Pictures/Achievements/Rewards/AmbrosiaLuck.png" },
    { key: "bonusAmbrosiaPerFill",      label: "Bonus Ambrosia per Fill",   type: "number",  url: "Pictures/Achievements/Progressive/AmbrosiaCount.png" },
    { key: "ambSpeedNoAmbBerries",      label: "Blue Bar Speed/s (no bells)", type: "number",  url: "Pictures/PseudoShop/GLOBALTimeSkip.png" },
    { key: "blueBarMaxWithoutTwoMindAndBrick", label: "Blue Bar Max (No 2M/Brick)", type: "number", url: "Pictures/Achievements/Progressive/AmbrosiaCount.png" },
    { key: "blueBarRequirementBeforeRounding", label: "Blue Bar Pre-Round Req.",    type: "number", url: "Pictures/Achievements/Progressive/AmbrosiaCount.png" },

    { heading: "Red Ambrosia", key: "ramb", label: "Lifetime Red Ambrosia",     type: "number",  url: "Pictures/Achievements/Progressive/RedAmbrosiaCount.png" },
    { key: "redLuckBase",               label: "Base Red Luck (no bells)",  type: "number",  url: "Pictures/Achievements/Rewards/RedAmbrosiaLuck.png" },
    { key: "luckConversion",            label: "Luck Conversion",           type: "number",  url: "Pictures/RedAmbrosia/RedAmbrosiaConversionImprovement1.png" },
    { key: "rSpeed",                    label: "Red Bar Speed/s",           type: "number",  url: "Pictures/PseudoShop/AMBROSIATimeSkip.png" },
    { key: "redBarMaxWithoutTwoMind",   label: "Red Bar Max (No 2M)",       type: "number",  url: "Pictures/Achievements/Progressive/RedAmbrosiaCount.png" },
    { key: "rBar",                      label: "Red Bar Capacity",          type: "number",  url: "Pictures/Achievements/Progressive/RedAmbrosiaCount.png" },

    { heading: "Red Ambrosia Upgrades", key: "bonusTutorial", label: "Bonus Tutorial Levels",     type: "number",  url: "Pictures/RedAmbrosia/RedAmbrosiaFreeTutorialLevels.png" },
    { key: "bonusRow2",                 label: "More Luck Levels!",         type: "number",  url: "Pictures/RedAmbrosia/RedAmbrosiaFreeLevelsRow2.png" },
    { key: "bonusRow3",                 label: "More Res. & Util. Levels!", type: "number",  url: "Pictures/RedAmbrosia/RedAmbrosiaFreeLevelsRow3.png" },
    { key: "bonusRow4",                 label: "More Cube Levels!",         type: "number",  url: "Pictures/RedAmbrosia/RedAmbrosiaFreeLevelsRow4.png" },
    { key: "bonusRow5",                 label: "More Quark Levels!",        type: "number",  url: "Pictures/RedAmbrosia/RedAmbrosiaFreeLevelsRow5.png" },
    { key: "ossifiedTactics",           label: "Ossified Tactics",          type: "number",  url: "Pictures/RedAmbrosia/RedAmbrosiaRegularLuck.png" },
    { key: "ossifiedTactics2",          label: "Ossified Tactics II",       type: "number",  url: "Pictures/RedAmbrosia/RedAmbrosiaRegularLuck.png" },
    { key: "redberries",                label: "Berries that are... blue?", type: "number",  url: "Pictures/RedAmbrosia/RedAmbrosiaBlueberries.png" },
    { key: "fusion",                    label: "Red-Blue Ultrafusion",      type: "number",  url: "Pictures/RedAmbrosia/RedAmbrosiaAccelerator.png" },
    { key: "viscount",                  label: "Viscount",                  type: "boolean", url: "Pictures/RedAmbrosia/RedAmbrosiaTutorial.png" },

    { heading: "Resources & Singularity", key: "singularityReducers", label: "Singularity Reducers",      type: "number",  url: "Pictures/Default/BlueberrySingReduction.png" },
    { key: "quarksOwned",               label: "Quarks Owned",              type: "number",  url: "Pictures/Default/Quark.png" },
    { key: "qHept",                     label: "Quark Hepteract",           type: "number",  icon: { url: "Pictures/Default/Sprite Sheets/Hepteracts.png", sprite: { x: 112, y: 0, width: 56, height: 56, sheetWidth: 224, sheetHeight: 168 }, } },
    { key: "cubesExpTotal",             label: "Total Cubes Exp.",          type: "number",  url: "Pictures/Default/WowCube.png" },
    { key: "baseObt",                   label: "Base Obtainium",            type: "number",  url: "Pictures/Default/Obtainium.png" },
    { key: "baseOff",                   label: "Base Offering",             type: "number",  url: "Pictures/Default/Offering.png" },
    { key: "transcription",             label: "Transcription",             type: "number",  icon: { url: "Pictures/Default/Sprite Sheets/Octeracts.png", sprite: { x: 192, y: 0, width: 32, height: 32, sheetWidth: 224, sheetHeight: 288 }, } },
    { key: "ascSpeed",                  label: "Asc. Speed",                type: "number",  url: "Pictures/Default/TinySpeedAscension.png" },
    { key: "ascSpread",                 label: "Asc. Spread",               type: "number",  url: "Pictures/Default/SingularityAscensionSpeed.png" },
    { key: "patreonBonus",              label: "Patreon Bonus",             type: "percent", url: "Pictures/PseudoShop/GOLDEN_QUARK_BUFF.png" },

    { heading: "Runes & Talismans", key: "runeSiExp", label: "SI Rune Exp.",              type: "text",    url: "Pictures/Runes/SuperiorIntellect.png" },
    { key: "runeSiRC",                  label: "SI Rune Coeff",             type: "number",  url: "Pictures/Runes/SuperiorIntellect.png" },
    { key: "runeSiBonusLevelsTotal",    label: "SI Bonus Levels",           type: "number",  url: "Pictures/Runes/SuperiorIntellect.png" },
    { key: "runeIaExp",                 label: "IA Rune Exp.",              type: "text",    url: "Pictures/Runes/InfiniteAscent.png" },
    { key: "runeIaBonusLevelsTotal",    label: "IA Bonus Levels (total)",   type: "text",    url: "Pictures/Runes/InfiniteAscent.png" },
    { key: "runeIaBonusLevelsTalisman", label: "IA Bonus Levels (talisman)",type: "text",    url: "Pictures/Runes/InfiniteAscent.png" },
    { key: "baseTalismanPower",         label: "Talisman Power Mult.",      type: "text",    url: "Pictures/Default/BlueberryTalismanBonusRuneLevel.png" },

    { heading: "Unlocks", key: "exalt5Unlocked", label: "No Amb Upgrades x1 Done", type: "boolean", icon: { url: "Pictures/Default/Sprite Sheets/Challenges.png", sprite: { x: 0, y: 256, width: 64, height: 64, sheetWidth: 320, sheetHeight: 320 }, } },
    { key: "exalt9Unlocked",            label: "Taxman's Last Stand x1 Done",  type: "boolean", icon: { url: "Pictures/Default/Sprite Sheets/Challenges.png", sprite: { x: 192, y: 256, width: 64, height: 64, sheetWidth: 320, sheetHeight: 320 }, } },
    { key: "oneMindUnlocked",           label: "One Mind Unlocked",         type: "boolean", url: "Pictures/Default/SingularityOneMind.png" },
    { key: "aquariusUnlocked",          label: "Aquarius Unlocked",         type: "boolean", url: "Pictures/PurpleAmbrosia/Purple Ambrosia Upgrades/Aquarius.png" },

    { heading: "Shop", key: "panthemaLevel", label: "Jack of All Trades Level",  type: "number",  url: "Pictures/Default/ShopPanthema.png" },
    { key: "freeShopLevelsInfinity",    label: "Free Infinity Upgrades",    type: "number",  url: "Pictures/Default/ShopInfiniteShopUpgrades.png" },
    { key: "freeShopLevelsQuark",       label: "Free Shop Q. Levels",       type: "number",  url: "Pictures/Default/Quark.png" },
    { key: "chronometerLevel",          label: "Chronometer Level",         type: "number",  url: "Pictures/Default/ShopChronometerInfinity.png" },
    { key: "shopAmbrosiaLuck1",         label: "Shop Ambrosia Luck 1",      type: "number",  url: "Pictures/Default/ShopAmbrosiaLuck1.png" },
    { key: "shopAmbrosiaLuck2",         label: "Shop Ambrosia Luck 2",      type: "number",  url: "Pictures/Default/ShopAmbrosiaLuck2.png" },
    { key: "shopAmbrosiaLuck3",         label: "Shop Ambrosia Luck 3",      type: "number",  url: "Pictures/Default/ShopAmbrosiaLuck3.png" },
    { key: "shopAmbrosiaLuck4",         label: "Shop Ambrosia Luck 4",      type: "number",  url: "Pictures/Default/ShopAmbrosiaLuck4.png" },
    { key: "shopRedLuck1",              label: "Shop Red Luck 1",           type: "number",  icon: { url: "Pictures/Default/Sprite Sheets/DiceOfAsmodeus.png", sprite: { x: 0, y: 0, width: 64, height: 64, sheetWidth: 256, sheetHeight: 64 }, } },
    { key: "shopRedLuck2",              label: "Shop Red Luck 2",           type: "number",  icon: { url: "Pictures/Default/Sprite Sheets/DiceOfAsmodeus.png", sprite: { x: 64, y: 0, width: 64, height: 64, sheetWidth: 256, sheetHeight: 64 }, } },
    { key: "shopRedLuck3",              label: "Shop Red Luck 3",           type: "number",  icon: { url: "Pictures/Default/Sprite Sheets/DiceOfAsmodeus.png", sprite: { x: 128, y: 0, width: 64, height: 64, sheetWidth: 256, sheetHeight: 64 }, } },
    { key: "shopRedLuck4",              label: "Shop Red Luck 4",           type: "number",  icon: { url: "Pictures/Default/Sprite Sheets/DiceOfAsmodeus.png", sprite: { x: 192, y: 0, width: 64, height: 64, sheetWidth: 256, sheetHeight: 64 }, } },
    { key: "shopAmbrosiaGeneration1",   label: "Shop Ambrosia Gen 1",       type: "number",  url: "Pictures/Default/ShopAmbrosiaGeneration1.png" },
    { key: "shopAmbrosiaGeneration2",   label: "Shop Ambrosia Gen 2",       type: "number",  url: "Pictures/Default/ShopAmbrosiaGeneration2.png" },
    { key: "shopAmbrosiaGeneration3",   label: "Shop Ambrosia Gen 3",       type: "number",  url: "Pictures/Default/ShopAmbrosiaGeneration3.png" },
    { key: "shopAmbrosiaGeneration4",   label: "Shop Ambrosia Gen 4",       type: "number",  url: "Pictures/Default/ShopAmbrosiaGeneration4.png" },
    { key: "shopImproveQuarkHept1",     label: "Shop QHept 1",              type: "number",  url: "Pictures/Default/ShopImprovedQuarkHepteract0.png" },
    { key: "shopImproveQuarkHept2",     label: "Shop QHept 2",              type: "number",  url: "Pictures/Default/ShopImprovedQuarkHepteract.png" },
    { key: "shopImproveQuarkHept3",     label: "Shop QHept 3",              type: "number",  url: "Pictures/Default/ShopImprovedQuarkHepteract2.png" },
    { key: "shopImproveQuarkHept4",     label: "Shop QHept 4",              type: "number",  url: "Pictures/Default/ShopImprovedQuarkHepteract3.png" },
    { key: "shopImproveQuarkHept5",     label: "Shop QHept ∞",              type: "number",  url: "Pictures/Default/ShopImprovedQuarkHepteractInfinity.png" },
] as const satisfies readonly HeaterInputField[];

export const exportFieldExtractors: Readonly<Partial<{ [K in HeaterInputKey]: (hsData: any) => HeaterInputBase[K] }>> = {
    amb:                (hsData) => hsData.lifetimeAmbrosia,
    ramb:               (hsData) => hsData.lifetimeRedAmbrosia,
    bonusAmbrosiaPerFill: (hsData) => hsData.bonusAmbrosiaPerFill,
    // Without bells: the optimizer adds the Active Bells field's (applyHeaterBells)
    ambSpeedNoAmbBerries: (hsData) => hsData.finalAmbrosiaBarPointsSNoAmbNoBells,
    luckBaseNoAmb:     (hsData) => hsData.ambrosiaLuckNoAmb,
    luckMultNoAmb:     (hsData) => hsData.totalAdditiveLuckMultiplierNoAmbNoBells - 1,
    // The optimizer's baseline is the no-purchased-Ambrosia state.  Using
    // the active total here would bake yellow Ambrosia luck into the base and
    // then apply it a second time when a candidate loadout is evaluated.
    redLuckBase:        (hsData) => hsData.totalRedLuckNoAmbNoBells,
    luckConversion:     (hsData) => hsData.ambrosiaLuckPer1RedLuckNoAmb,
    ascSpeed:           (hsData) => hsData.finalAscensionSpeedMultiplierNoAmb,
    ascSpread:          (hsData) => hsData.ascensionSpeedExponentNoAmb,
    baseObt:            (hsData) => hsData.totalBaseObtainiumNoAmb,
    baseOff:            (hsData) => hsData.totalBaseOfferingsNoAmb,
    runeSiRC:           (hsData) => hsData.runeSiRCNoAmb,
    runeSiBonusLevelsTotal:         (hsData) => hsData.runeSiBonusLevelsTotalNoAmb,
    runeIaBonusLevelsTotal:        (hsData) => hsData.runeIaBonusLevelsTotalNoAmb,
    runeIaBonusLevelsTalisman:      (hsData) => hsData.runeIaBonusLevelsTalismanNoAmb,
    baseTalismanPower:      (hsData) => hsData.totalTalismanPowerMultiplierNoAmb,
    freeShopLevelsInfinity: (hsData) => hsData.freeShopLevelsInfinityNoAmb,
    freeShopLevelsQuark:    (hsData) => hsData.freeShopLevelsQuarkNoAmb,
    chronometerLevel:       (hsData) => hsData.chronometerLevelNoAmb,
    ossifiedTactics:    (hsData) => hsData.redAmbrosiaUpgrades.regularLuck,
    ossifiedTactics2:   (hsData) => hsData.redAmbrosiaUpgrades.regularLuck2,
    redberries:         (hsData) => hsData.redAmbrosiaUpgrades.blueberries,
    viscount:           (hsData) => Boolean(hsData.redAmbrosiaUpgrades.viscount),
    fusion:             (hsData) => hsData.redAmbrosiaUpgrades.redAmbrosiaAccelerator,
    rBar:               (hsData) => hsData.redBarCapacity,
    rSpeed:             (hsData) => hsData.totalRedBarPointsSNoAmb,
};
