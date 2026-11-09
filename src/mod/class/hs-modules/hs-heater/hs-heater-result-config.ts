import type { HeaterTypeSemanticId, HeaterResultSectionId } from "../../../types/data-types/hs-heater-types";
export type { HeaterTypeSemanticId, HeaterResultSectionId } from "../../../types/data-types/hs-heater-types";

export type HeaterResultSectionConfig = {
    title: string;
    showP4x4: boolean;
    showRouting: boolean;
    effectHeader: string;
    order: number;
};

type HeaterResultTypeConfig = {
    label: string;
    description: string;
    section: HeaterResultSectionId;
    icon?: string;
    rowLabels?: readonly string[];
    rowIcons?: readonly string[];
    // An upgrade whose level the Loadout cell shows after the label ("Max SR1 (1/2)")
    labelLevel?: { upgrade: string; maxLevel: number };
};

function createHeaterResultTypeConfig<T extends Record<string, HeaterResultTypeConfig>>(config: T): { [K in keyof T]: HeaterResultTypeConfig } {
    return config;
}

const HEATER_RESULT_SECTION_CONFIG: Record<HeaterResultSectionId, HeaterResultSectionConfig> = {
    common: {
        title: "Common Loadouts",
        showP4x4: false,
        showRouting: true,
        effectHeader: "Effect",
        order: 0,
    },
    obtOff: {
        title: "Obtainium & Offering Loadouts",
        showP4x4: false,
        showRouting: false,
        effectHeader: "Effect",
        order: 1,
    },
    p4x4: {
        title: "p4x4 (pre-AoAG) Loadouts",
        showP4x4: true,
        showRouting: false,
        effectHeader: "Effect",
        order: 2,
    },
    hybrid: {
        title: "Hybrid Loadouts",
        showP4x4: false,
        showRouting: false,
        effectHeader: "Oct Effect",
        order: 3,
    },
};

const HEATER_RESULT_TYPE_CONFIG = createHeaterResultTypeConfig({
    allAmb: {
        label: "All Ambrosia",
        description: "General Ambrosia generation.",
        section: "common",
        icon: "Pictures/Default/BlueberryFreeGenerationLevels.png",
    },
    luck: {
        label: "Blue Ambrosia",
        description: "Blue Ambrosia generation focus.",
        section: "common",
        icon: "Pictures/Default/BlueberryLuck2.png",
    },
    rLuck: {
        label: "Red Ambrosia",
        description: "Red Ambrosia generation focus.",
        section: "common",
        icon: "Pictures/Default/BlueberryFreeRedLuckUpgrades.png",
    },
    quarks: {
        label: "Quarks",
        description: "QUACK!!",
        section: "common",
        icon: "Pictures/Default/BlueberryQuarks2.png",
    },
    cubes: {
        label: "3-7D Cubes",
        description: "Post-AOAG only, check the H loadouts below for pre-aoag cube loadouts.",
        section: "common",
        icon: "Pictures/Default/BlueberryCubes.png",
    },
    oct: {
        label: "Octeracts",
        description: "Intended for Post-AOAG.",
        section: "common",
        icon: "Pictures/Default/BlueberryCubes3.png",
    },
    coinsC15: {
        label: "Coins in C15",
        description: "Maximizes coins per real second in Challenge 15, assuming the tax cap is reached. Export your game data while in C15.\nUses your existing rune EXP, blessings, spirits and talismans. The Effect compares coin income with no purchased Ambrosia modules; it holds other resources and upgrades fixed.\nSingularity Stabilizers help before Antiquities of the Ant God. Brick of Lead slows coin income.",
        section: "common",
        icon: "Pictures/Default/Coin.png",
    },
    purpleHoney: {
        label: "Purple Honey",
        description: "Maximizes Purple Honey per second, at your current Purple Reactor routing percentages. Use it when saving Honey for Purple Reactor or Synthesis upgrades.",
        section: "common",
        icon: "Pictures/PurpleAmbrosia/Purple Upgrades/PurpleHoney.png",
    },
    purpleHoneyOpt: {
        label: "Phoney (best econ)",
        description: "Same goal as Purple Honey, but the loadout and the Purple Reactor routing are optimized together.\nRouting is not saved in Ambrosia loadouts: applying it also changes the income of your other loadouts.",
        section: "common",
        icon: "Pictures/PurpleAmbrosia/Purple Upgrades/PurpleHoney.png",
    },
    purpleAmb: {
        label: "Purple Ambrosia",
        description: "Maximizes Purple Ambrosia crafted per second, at your current Purple Reactor routing percentages. Crafting needs both Red Ambrosia and Purple Honey, so this balances the two.",
        section: "common",
        icon: "Pictures/PurpleAmbrosia/PurpleAmbrosia.png",
    },
    purpleAmbOpt: {
        label: "Pamb (best econ)",
        description: "Same goal as Purple Ambrosia, but the loadout and the Purple Reactor routing are optimized together.\nRouting is not saved in Ambrosia loadouts: applying it also changes the income of your other loadouts.",
        section: "common",
        icon: "Pictures/PurpleAmbrosia/PurpleAmbrosia.png",
    },
    obt: {
        label: "Obtainium",
        description: "Pre-AOAG OR Post-AOAG, based on the 'Post-AoAG (Obt/Off)' field. You should have pre-AOAG inputs if you want to use it pre-AOAG, and vice versa.",
        section: "obtOff",
        icon: "Pictures/Default/BlueberryBaseObtainium1.png",
    },
    off: {
        label: "Offering",
        description: "Pre-AOAG OR Post-AOAG, based on the 'Post-AoAG (Obt/Off)' field. You should have pre-AOAG inputs if you want to use it pre-AOAG, and vice versa.",
        section: "obtOff",
        icon: "Pictures/Default/BlueberryBaseOffering1.png",
    },
    obtAndOff: {
        label: "Obt + Off",
        description: "Raises Obtainium and Offerings together: +10% of either counts the same. The Effect shows both multipliers.\nPre-AOAG OR Post-AOAG, based on the 'Post-AoAG (Obt/Off)' field, like the two loadouts above.",
        section: "obtOff",
        icon: "Pictures/Default/BlueberryObtainium.png",
    },
    hyperflux: {
        label: "Hyperflux (H0–H7)",
        description: "(Pre-AOAG only) H loadouts from Hyperflux lvl 0 to 7.\nCheck the p4x4eq tooltip to understand how to chose from them. H0-3 are for early players with low amb. H4 will usually be good for early sing while the rest would be for the middle/end of pre-aoag. (again, check p4x4eq)\n\"★ now\" marks the best H at your current P4x4. In Your Loadout Order, \"Best H (P4x4 now)\" imports that row, picked from your P4x4 at the moment you import.",
        section: "p4x4",
        rowLabels: ["H0", "H1", "H2", "H3", "H4", "H5", "H6", "H7"],
        rowIcons: Array(8).fill("Pictures/Default/BlueberryHyperflux.png"),
    },
    sr1: {
        label: "Max SR1",
        description: "(Pre-AOAG only) Max SR1 first, then optimize for cubes.\nThis does not make it the best pre-aoag loadout: compare its Effect with the H loadouts above to see what maxing SR1 costs in cubes.\nCounted as outside an Exalt: SR1 does nothing in Exalts.",
        section: "p4x4",
        icon: "Pictures/Default/BlueberrySingReduction.png",
        labelLevel: { upgrade: "ambrosiaSingReduction1", maxLevel: 2 },
    },
    sr2: {
        label: "Max SR2",
        description: "(Pre-AOAG only) Max SR2 first, then optimize for cubes.\nThis does not make it the best pre-aoag loadout: compare its Effect with the H loadouts above to see what maxing SR2 costs in cubes.\nCounted as inside an Exalt: SR2 only works in Exalts.",
        section: "p4x4",
        icon: "Pictures/Default/BlueberrySingReduction2.png",
        labelLevel: { upgrade: "ambrosiaSingReduction2", maxLevel: 2 },
    },
    ambOct: {
        label: "Max Amb + Oct",
        description: "Late game loadout, only usable once you can max Ambrosia (which requires several tens of millions of amb).",
        section: "hybrid",
        icon: "Pictures/Default/BlueberryLuck4.png",
    },
});

// How the results read inside an Exalt, shown by the Exalt badge of the
// results modal when the heat ran with that Exalt. No entry, no badge.
const HEATER_EXALT_RULES: Readonly<Partial<Record<number, string>>> = {
    10: "Bar Charging: the bars give time instead of Ambrosia.\n"
        + "- Blue Ambrosia = global time, Red Ambrosia = ascension time, All Ambrosia = both multiplied.\n"
        + "- Each Purple Reactor extraction can fill each bar once, with chance 1 - 2^(-Purple Honey Luck / 100), so the Reactor routing matters most.\n"
        + "- The bar lengths are fixed: Brick of Lead only adds Luck here. TWO MIND's shorter bars are cancelled by its lower reward Luck.\n"
        + "- With One Mind, ascension speed multiplies cubes and ascension count. Brick of Lead lowers it (-25% at max) and SR2 raises it. These scores don't count that.",
};

export function getHeaterExaltRules(exalt: number): string | null {
    return HEATER_EXALT_RULES[exalt] ?? null;
}

export type HeaterResultArrayKey = keyof typeof HEATER_RESULT_TYPE_CONFIG;
export type RowBasedResultKey = {
    [K in keyof typeof HEATER_RESULT_TYPE_CONFIG]: typeof HEATER_RESULT_TYPE_CONFIG[K] extends { rowLabels: readonly string[] } ? K : never;
}[keyof typeof HEATER_RESULT_TYPE_CONFIG];

type ResultKey = HeaterResultArrayKey;

const HEATER_RESULT_SECTION_ORDERED_IDS = Object.entries(HEATER_RESULT_SECTION_CONFIG)
    .sort(([, a], [, b]) => a.order - b.order)
    .map(([key]) => key as HeaterResultSectionId);

export type HeaterResultSectionDef = HeaterResultSectionConfig & {
    sectionId: HeaterResultSectionId;
    keys: ResultKey[];
};

export function getHeaterResultSectionDefinitions(): HeaterResultSectionDef[] {
    const keysBySection = new Map<HeaterResultSectionId, ResultKey[]>();
    for (const key of Object.keys(HEATER_RESULT_TYPE_CONFIG) as ResultKey[]) {
        const section = HEATER_RESULT_TYPE_CONFIG[key].section;
        const group = keysBySection.get(section);
        if (group) group.push(key);
        else keysBySection.set(section, [key]);
    }

    return HEATER_RESULT_SECTION_ORDERED_IDS
        .map((sectionId) => ({
            sectionId,
            ...HEATER_RESULT_SECTION_CONFIG[sectionId],
            keys: keysBySection.get(sectionId) ?? [],
        }))
        .filter((section) => section.keys.length > 0);
}

export function getHeaterTypeConfig(key: ResultKey): HeaterResultTypeConfig | null {
    return HEATER_RESULT_TYPE_CONFIG[key] ?? null;
}

export function getHeaterTypeBranchId(semanticId: string): HeaterBranchId | null {
    if (semanticId === HEATER_BEST_H_SEMANTIC_ID) return "hyperflux";
    const parsed = parseHeaterTypeSemanticId(semanticId);
    if (!parsed) return null;

    const branch = HEATER_BRANCH_DEFINITIONS.find((branch) =>
        (branch.resultKeys as readonly ResultKey[]).includes(parsed.baseKey)
    );

    return branch?.id ?? null;
}

export const HEATER_BRANCH_DEFINITIONS = [
    { id: "luck",      label: "Ambrosia",                    resultKeys: ["luck", "rLuck", "allAmb"], optionKey: "calculateAmb" },
    { id: "purple",    label: "Purple Ambrosia",             resultKeys: ["purpleHoney", "purpleAmb", "purpleHoneyOpt", "purpleAmbOpt"], optionKey: "calculatePurple" },
    { id: "quarks",    label: "Quarks",                      resultKeys: ["quarks"],                  optionKey: "calculateQuarks" },
    { id: "cubes",     label: "3-7D Cubes",                  resultKeys: ["cubes"],                   optionKey: "calculateCubes" },
    { id: "oct",       label: "Octeracts",                   resultKeys: ["oct"],                     optionKey: "calculateOct" },
    { id: "coinsC15",  label: "Coins in C15",                resultKeys: ["coinsC15"],                optionKey: "calculateCoinsC15" },
    { id: "obtOff",    label: "Obt, Off",                    resultKeys: ["obt", "off"],              optionKey: "calculateOff" },
    // Starts unticked: it adds 10 to 40 s to a late-game heat. labelNote: greyed after the label
    { id: "obtAndOff", label: "Obt + Off",                   resultKeys: ["obtAndOff"],               optionKey: "calculateObtAndOff", startsUnticked: true, labelNote: "(slower)" },
    { id: "hyperflux", label: "Hyperflux (p4x4, pre-AoAG)",  resultKeys: ["hyperflux"],               optionKey: "calculateHyperflux" },
    { id: "sr",        label: "Max SR",                      resultKeys: ["sr1", "sr2"],              optionKey: "calculateSR" },
    { id: "ambOct",    label: "Max Amb + Oct",               resultKeys: ["ambOct"],                  optionKey: "calculateAmbOct" },
] as const;

export type HeaterBranchDefinition = typeof HEATER_BRANCH_DEFINITIONS[number];
export type HeaterBranchId = HeaterBranchDefinition["id"];

export function getHeaterTypeRowCount(key: ResultKey): number {
    return HEATER_RESULT_TYPE_CONFIG[key]?.rowLabels?.length ?? 1;
}

export function getHeaterTypeEntries(): Array<[ResultKey, HeaterResultTypeConfig]> {
    return Object.entries(HEATER_RESULT_TYPE_CONFIG) as Array<[ResultKey, HeaterResultTypeConfig]>;
}


// ================================================================
// Semantic ID / Resolver Helpers
// ================================================================

function isResultKey(value: string): value is ResultKey {
    return value in HEATER_RESULT_TYPE_CONFIG;
}

function isRowBasedResultKey(value: string): value is RowBasedResultKey {
    return getHeaterTypeRowCount(value as ResultKey) > 1;
}

// A slot choice, not a result row: HSHeaterResultStore.resolveSemanticId turns
// it into the Hyperflux row that wins at the live P4x4.
export const HEATER_BEST_H_SEMANTIC_ID = "hyperflux:best" satisfies HeaterTypeSemanticId;
const HEATER_BEST_H_LABEL = "Best H (P4x4 now)";

export function buildHeaterTypeSemanticId(key: ResultKey, rowIndex?: number): HeaterTypeSemanticId {
    return rowIndex === undefined ? key as HeaterTypeSemanticId : `${key}:${rowIndex}` as HeaterTypeSemanticId;
}

type ParsedHeaterTypeSemanticId =
    | { baseKey: RowBasedResultKey; rowIndex: number }
    | { baseKey: Exclude<ResultKey, RowBasedResultKey>; rowIndex: null };

function parseHeaterTypeSemanticId(semanticId: string): ParsedHeaterTypeSemanticId | null {
    const normalized = semanticId.trim();
    if (!normalized || normalized === "none") return null;

    const [baseKeyRaw, rowIndexRaw] = normalized.split(":");
    if (!baseKeyRaw) return null;

    if (rowIndexRaw !== undefined) {
        if (!isRowBasedResultKey(baseKeyRaw) || !/^\d+$/.test(rowIndexRaw)) return null;
        const rowIndex = Number(rowIndexRaw);
        const config = getHeaterTypeConfig(baseKeyRaw as ResultKey);
        if (!config?.rowLabels || rowIndex < 0 || rowIndex >= config.rowLabels.length) return null;
        return { baseKey: baseKeyRaw as RowBasedResultKey, rowIndex };
    }

    if (!isResultKey(baseKeyRaw)) return null;
    return { baseKey: baseKeyRaw as Exclude<ResultKey, RowBasedResultKey>, rowIndex: null };
}

export function resolveHeaterTypeLabel(key: string): string | null {
    if (key === "none") return "None";
    if (key === HEATER_BEST_H_SEMANTIC_ID) return HEATER_BEST_H_LABEL;
    const parsed = parseHeaterTypeSemanticId(key);
    if (!parsed) return null;

    const config = HEATER_RESULT_TYPE_CONFIG[parsed.baseKey];
    if (!config) return null;

    if (parsed.rowIndex !== null) {
        return config.rowLabels?.[parsed.rowIndex] ?? null;
    }

    return config.label;
}

export function resolveHeaterTypeDescription(semanticId: string): string | null {
    if (semanticId === HEATER_BEST_H_SEMANTIC_ID) semanticId = "hyperflux:0";
    const parsed = parseHeaterTypeSemanticId(semanticId);
    if (!parsed) return null;

    const description = HEATER_RESULT_TYPE_CONFIG[parsed.baseKey].description.trim();
    return description || null;
}

export function resolveHeaterTypeIconSrc(semanticId: string): string | null {
    if (semanticId === "none") { return "Pictures/RedAmbrosia/RedAmbrosiaFreeTutorialLevels.png"; }
    if (semanticId === HEATER_BEST_H_SEMANTIC_ID) semanticId = "hyperflux:0";

    const parsed = parseHeaterTypeSemanticId(semanticId);
    if (!parsed) return null;

    const config = HEATER_RESULT_TYPE_CONFIG[parsed.baseKey];
    if (!config) return null;

    if (parsed.rowIndex !== null) {
        return config.rowIcons?.[parsed.rowIndex] ?? null;
    }

    return config.icon ?? null;
}
