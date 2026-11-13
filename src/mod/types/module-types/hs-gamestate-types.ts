import type { MainView, SubtabView } from "../../class/hs-core/hs-gamestate";

export type VIEW_TYPE = MAIN_VIEW | BUILDING_VIEW | ACHIEVEMENT_VIEW | RUNE_VIEW | CHALLENGE_VIEW | ANT_VIEW | CUBE_VIEW | TRAITS_VIEW | SINGULARITY_VIEW | SETTINGS_VIEW | PSEUDOCOIN_VIEW;
export type VIEW_KEY = 'MAIN_VIEW' | SUBTAB_KEY;
export type SUBTAB_KEY = keyof SubtabEnums;

/** Each subtab view key's enum */
export interface SubtabEnums {
    BUILDING_VIEW: BUILDING_VIEW;
    ACHIEVEMENT_VIEW: ACHIEVEMENT_VIEW;
    RUNE_VIEW: RUNE_VIEW;
    CHALLENGE_VIEW: CHALLENGE_VIEW;
    ANT_VIEW: ANT_VIEW;
    CUBE_VIEW: CUBE_VIEW;
    TRAITS_VIEW: TRAITS_VIEW;
    SINGULARITY_VIEW: SINGULARITY_VIEW;
    SETTINGS_VIEW: SETTINGS_VIEW;
    PSEUDOCOIN_VIEW: PSEUDOCOIN_VIEW;
}

/** The view object a view key tracks */
export type ViewOf<K extends VIEW_KEY> = K extends SUBTAB_KEY ? SubtabView<K> : MainView;

export enum MAIN_VIEW {
    UNKNOWN = -1,
    BUILDINGS = 1,
    UPGRADES = 2,
    ACHIEVEMENTS = 3,
    RUNES = 4,
    CHALLENGES = 5,
    RESEARCH = 6,
    ANTS = 7,
    CUBES = 8,
    TRAITS = 9,
    SETTINGS = 10,
    SHOP = 11,
    SINGULARITY = 12,
    EVENT = 13,
    PSEUDOCOINS = 14
}

export enum BUILDING_VIEW {
    UNKNOWN = -1,
    COIN = 1,
    DIAMOND = 2,
    MYTHOS = 3,
    PARTICLE = 4,
    TESSERACT = 5,
}

export enum ACHIEVEMENT_VIEW {
    UNKNOWN = -1,
    ACHIEVEMENTS = 1,
    REWARDS = 2,
}

export enum RUNE_VIEW {
    UNKNOWN = -1,
    RUNES = 1,
    TALISMANS = 2,
    BLESSINGS = 3,
}

export enum CHALLENGE_VIEW {
    UNKNOWN = -1,
    NORMAL = 1,
    EXALT = 2,
}

export enum ANT_VIEW {
    UNKNOWN = -1,
    THE_ANTHILL = 1,
    THE_ALTAR = 2,
    QUARK_CORNER = 3,
}

export enum CUBE_VIEW {
    UNKNOWN = -1,
    CUBE_TRIBUTES = 1,
    TESSERACT_GIFTS = 2,
    HYPERCUBE_BENEDICTIONS = 3,
    PLATONIC_STATUES = 4,
    CUBE_UPGRADES = 5,
    PLATONIC_UPGRADES = 6,
    HEPTERACT_FORGE = 7,
}

export enum TRAITS_VIEW {
    UNKNOWN = -1,
    CORRUPTION_STATS = 1,
    TOKENS = 2,
    AUTO_ASCENSION = 3,
}

export enum SINGULARITY_VIEW {
    UNKNOWN = -1,
    ELEVATOR = 1,
    SHOP = 2,
    PERKS = 3,
    OCTERACTS = 4,
    AMBROSIA = 5,
    PURPLE = 6
}

export enum SETTINGS_VIEW {
    UNKNOWN = -1,
    SETTINGS = 1,
    LANGUAGES = 2,
    CREDITS = 3,
    STATS_FOR_NERDS = 4,
    RESET_HISTORY = 5,
    ASCEND_HISTORY = 6,
    SINGULARITY_HISTORY = 7,
    HOTKEYS = 8,
    ACCOUNT = 9,
    MESSAGES = 10,
}

export enum PSEUDOCOIN_VIEW {
    UNKNOWN = -1,
    CART_1 = 1,
    CART_2 = 2,
    CART_3 = 3,
    CART_4 = 4,
    CART_5 = 5,
}

/** Main tabs' content element ids (the element the game shows), the name a MainView is built from */
export const MAIN_VIEW_TAB_IDS: Record<MAIN_VIEW, string> = {
    [MAIN_VIEW.BUILDINGS]: 'buildings',
    [MAIN_VIEW.UPGRADES]: 'upgrades',
    [MAIN_VIEW.ACHIEVEMENTS]: 'statistics',
    [MAIN_VIEW.RUNES]: 'runes',
    [MAIN_VIEW.CHALLENGES]: 'challenges',
    [MAIN_VIEW.RESEARCH]: 'research',
    [MAIN_VIEW.ANTS]: 'ants',
    [MAIN_VIEW.CUBES]: 'cubes',
    [MAIN_VIEW.TRAITS]: 'traits',
    [MAIN_VIEW.SETTINGS]: 'settings',
    [MAIN_VIEW.SHOP]: 'shop',
    [MAIN_VIEW.SINGULARITY]: 'singularity',
    [MAIN_VIEW.EVENT]: 'event',
    [MAIN_VIEW.PSEUDOCOINS]: 'pseudoCoins',
    [MAIN_VIEW.UNKNOWN]: '',
};

/**
 * Mapping of view enum values to their clickable button element IDs
 * This allows any view to navigate via the goto() method
 */
export const MAIN_VIEW_BUTTON_IDS: Record<MAIN_VIEW, string> = {
    [MAIN_VIEW.BUILDINGS]: 'buildingstab',
    [MAIN_VIEW.UPGRADES]: 'upgradestab',
    [MAIN_VIEW.ACHIEVEMENTS]: 'achievementstab',
    [MAIN_VIEW.RUNES]: 'runestab',
    [MAIN_VIEW.CHALLENGES]: 'challengetab',
    [MAIN_VIEW.RESEARCH]: 'researchtab',
    [MAIN_VIEW.ANTS]: 'anttab',
    [MAIN_VIEW.CUBES]: 'cubetab',
    [MAIN_VIEW.TRAITS]: 'traitstab',
    [MAIN_VIEW.SINGULARITY]: 'singularitytab',
    [MAIN_VIEW.SETTINGS]: 'settingstab',
    [MAIN_VIEW.SHOP]: 'shoptab',
    [MAIN_VIEW.EVENT]: 'eventtab',
    [MAIN_VIEW.PSEUDOCOINS]: 'pseudoCoinstab',
    [MAIN_VIEW.UNKNOWN]: '',
};

export const BUILDING_VIEW_BUTTON_IDS: Record<BUILDING_VIEW, string> = {
    [BUILDING_VIEW.COIN]: 'switchToCoinBuilding',
    [BUILDING_VIEW.DIAMOND]: 'switchToDiamondBuilding',
    [BUILDING_VIEW.MYTHOS]: 'switchToMythosBuilding',
    [BUILDING_VIEW.PARTICLE]: 'switchToParticleBuilding',
    [BUILDING_VIEW.TESSERACT]: 'switchToTesseractBuilding',
    [BUILDING_VIEW.UNKNOWN]: '',
};

export const ACHIEVEMENT_VIEW_BUTTON_IDS: Record<ACHIEVEMENT_VIEW, string> = {
    [ACHIEVEMENT_VIEW.ACHIEVEMENTS]: 'toggleAchievementSubTab1',
    [ACHIEVEMENT_VIEW.REWARDS]: 'toggleAchievementSubTab2',
    [ACHIEVEMENT_VIEW.UNKNOWN]: '',
};

export const RUNE_VIEW_BUTTON_IDS: Record<RUNE_VIEW, string> = {
    [RUNE_VIEW.RUNES]: 'toggleRuneSubTab1',
    [RUNE_VIEW.TALISMANS]: 'toggleRuneSubTab2',
    [RUNE_VIEW.BLESSINGS]: 'toggleRuneSubTab3',
    [RUNE_VIEW.UNKNOWN]: '',
};

export const CHALLENGE_VIEW_BUTTON_IDS: Record<CHALLENGE_VIEW, string> = {
    [CHALLENGE_VIEW.NORMAL]: 'toggleChallengesSubTab1',
    [CHALLENGE_VIEW.EXALT]: 'toggleChallengesSubTab2',
    [CHALLENGE_VIEW.UNKNOWN]: '',
};

export const ANT_VIEW_BUTTON_IDS: Record<ANT_VIEW, string> = {
    [ANT_VIEW.THE_ANTHILL]: 'toggleAntSubtab1',
    [ANT_VIEW.THE_ALTAR]: 'toggleAntSubtab2',
    [ANT_VIEW.QUARK_CORNER]: 'toggleAntSubtab3',
    [ANT_VIEW.UNKNOWN]: '',
};

export const CUBE_VIEW_BUTTON_IDS: Record<CUBE_VIEW, string> = {
    [CUBE_VIEW.CUBE_TRIBUTES]: 'switchCubeSubTab1',
    [CUBE_VIEW.TESSERACT_GIFTS]: 'switchCubeSubTab2',
    [CUBE_VIEW.HYPERCUBE_BENEDICTIONS]: 'switchCubeSubTab3',
    [CUBE_VIEW.PLATONIC_STATUES]: 'switchCubeSubTab4',
    [CUBE_VIEW.CUBE_UPGRADES]: 'switchCubeSubTab5',
    [CUBE_VIEW.PLATONIC_UPGRADES]: 'switchCubeSubTab6',
    [CUBE_VIEW.HEPTERACT_FORGE]: 'switchCubeSubTab7',
    [CUBE_VIEW.UNKNOWN]: '',
};

export const TRAITS_VIEW_BUTTON_IDS: Record<TRAITS_VIEW, string> = {
    [TRAITS_VIEW.CORRUPTION_STATS]: 'corrStatsBtn',
    [TRAITS_VIEW.TOKENS]: 'corrTokensBtn',
    [TRAITS_VIEW.AUTO_ASCENSION]: 'corrAutoAscendBtn',
    [TRAITS_VIEW.UNKNOWN]: '',
};

export const SINGULARITY_VIEW_BUTTON_IDS: Record<SINGULARITY_VIEW, string> = {
    [SINGULARITY_VIEW.ELEVATOR]: 'toggleSingularitySubTab1',
    [SINGULARITY_VIEW.SHOP]: 'toggleSingularitySubTab2',
    [SINGULARITY_VIEW.PERKS]: 'toggleSingularitySubTab3',
    [SINGULARITY_VIEW.OCTERACTS]: 'toggleSingularitySubTab4',
    [SINGULARITY_VIEW.AMBROSIA]: 'toggleSingularitySubTab5',
    [SINGULARITY_VIEW.PURPLE]: 'toggleSingularitySubTab6',
    [SINGULARITY_VIEW.UNKNOWN]: '',
};

export const SETTINGS_VIEW_BUTTON_IDS: Record<SETTINGS_VIEW, string> = {
    [SETTINGS_VIEW.SETTINGS]: 'switchSettingSubTab1',
    [SETTINGS_VIEW.LANGUAGES]: 'switchSettingSubTab2',
    [SETTINGS_VIEW.CREDITS]: 'switchSettingSubTab3',
    [SETTINGS_VIEW.STATS_FOR_NERDS]: 'switchSettingSubTab4',
    [SETTINGS_VIEW.RESET_HISTORY]: 'switchSettingSubTab5',
    [SETTINGS_VIEW.ASCEND_HISTORY]: 'switchSettingSubTab6',
    [SETTINGS_VIEW.SINGULARITY_HISTORY]: 'switchSettingSubTab7',
    [SETTINGS_VIEW.HOTKEYS]: 'switchSettingSubTab8',
    [SETTINGS_VIEW.ACCOUNT]: 'switchSettingSubTab9',
    [SETTINGS_VIEW.MESSAGES]: 'switchSettingSubTab10',
    [SETTINGS_VIEW.UNKNOWN]: '',
};

export const PSEUDOCOIN_VIEW_BUTTON_IDS: Record<PSEUDOCOIN_VIEW, string> = {
    [PSEUDOCOIN_VIEW.CART_1]: 'cartSubTab1',
    [PSEUDOCOIN_VIEW.CART_2]: 'cartSubTab2',
    [PSEUDOCOIN_VIEW.CART_3]: 'cartSubTab3',
    [PSEUDOCOIN_VIEW.CART_4]: 'cartSubTab4',
    [PSEUDOCOIN_VIEW.CART_5]: 'cartSubTab5',
    [PSEUDOCOIN_VIEW.UNKNOWN]: '',
};

/** Each subtab view key's button ids: a subtab view's name is its button's id */
export const SUBTAB_BUTTON_IDS: { [K in SUBTAB_KEY]: Record<SubtabEnums[K], string> } = {
    BUILDING_VIEW: BUILDING_VIEW_BUTTON_IDS,
    ACHIEVEMENT_VIEW: ACHIEVEMENT_VIEW_BUTTON_IDS,
    RUNE_VIEW: RUNE_VIEW_BUTTON_IDS,
    CHALLENGE_VIEW: CHALLENGE_VIEW_BUTTON_IDS,
    ANT_VIEW: ANT_VIEW_BUTTON_IDS,
    CUBE_VIEW: CUBE_VIEW_BUTTON_IDS,
    TRAITS_VIEW: TRAITS_VIEW_BUTTON_IDS,
    SINGULARITY_VIEW: SINGULARITY_VIEW_BUTTON_IDS,
    SETTINGS_VIEW: SETTINGS_VIEW_BUTTON_IDS,
    PSEUDOCOIN_VIEW: PSEUDOCOIN_VIEW_BUTTON_IDS,
};

/**
 * A record's ids in the game's order: its enum's order (integer keys iterate in ascending order, and UNKNOWN's empty
 * id is left out)
 */
export const orderedIds = (ids: Record<number, string>): string[] =>
    Object.values(ids).filter(id => id !== '');

/** The view an id belongs to, from its *_IDS record; UNKNOWN (-1) for any other id. */
export const viewFromId = <T extends number>(ids: Record<T, string>, id: string): T => {
    const key = Object.keys(ids).find(k => id !== '' && ids[Number(k) as T] === id);
    return (key === undefined ? -1 : Number(key)) as T;
};

export interface HSViewProperties {
    subViewIds: string[];
    viewKey: SUBTAB_KEY;
}

export interface HSViewState<V> {
    currentView: V;
    previousView: V;
    viewChangeSubscribers: Set<(previousView: V, currentView: V) => void>;
}

export type HSViewStateRecord = { [K in VIEW_KEY]: HSViewState<ViewOf<K>> };
