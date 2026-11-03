import { HSWatcherOptions } from "./hs-elementhooker-types";
import { HSViewProperties, MAIN_VIEW } from "./hs-gamestate-types";
import { ELogLevel } from "./hs-logger-types";
import { PlayerData } from "../data-types/hs-player-savedata";

interface IStoreable {
    storageKey: string;
}

export interface HSGlobalDebug {
    debugMode: boolean;
    performanceDebugMode: boolean;
    gameDataDebugMode: boolean;
    calculationCacheDebugMode: boolean;
}

export interface HSGlobalRelease {
    githubOwner: string;
    checkIntervalMs: number;
}

export interface HSGlobalGeneral {
    currentModVersion: string;
    isModFullyLoaded: boolean;
    modGithubUrl: string;
    modWebsiteUrl: string;
    modDiscordThreadUrl: string;
    heaterUrl: string;
}

export interface HSGlobalCommon {
    pseudoAPIurl: string;
    meAPIurl: string;
    readonly modRequestHeaders: Record<string, string>;
}

export interface HSGlobalPrototypes {
    defaultTransitionTiming: number;
}

export interface HSGlobalElementHooker {
    elementHookUpdateMS: number;
    elementsHookUpdateMS: number;
    enableHelementHookTimeout: boolean,
    elementHookTimeout: number;
    watcherThrottlingMS: number;
    defaultWatcherOptions: HSWatcherOptions;
}

export interface HSGlobalLogger {
    logLevel: ELogLevel,
    logSize: number;
    contextColors: Record<string, string>;
}

export interface HSGlobalStorage {
    storagePrefix: string;
}

export interface HSGlobalSettings extends IStoreable {
    strategiesKey: string;
    serializationBlackList: string[];
    gameDataRequiredTooltip: string;
    gameDataCheckBlacklist: string[];
}

/*export interface HSGlobalSettingActionSettings {
    
}*/

export interface HSGlobalMouse {
    autoClickIgnoredElements: string[];
}

export interface HSGlobalHiddenDialogs extends IStoreable { }

export interface HSGlobalAmbrosia {
    TIME_PER_AMBROSIA: number;
    TIME_PER_RED_AMBROSIA: number;
    digitReduction: number;

    blueBarId: string;
    blueBarProgressId: string;
    blueBarProgressTextId: string;
    redBarId: string;
    redBarProgressId: string;
    redBarProgressTextId: string;
    purpleBarId: string;
    purpleBarProgressId: string;
    barWrapperId: string;
}


export interface HSGlobalGameState {
    viewProperties: Map<MAIN_VIEW, HSViewProperties>;
}

export interface HSGlobalGameData {
    consumablesPollInterval: number;
    gdsSpeedMs: number;
    gdsCSSId: string;
}

export interface HSGlobalHSUI {
    injectedStylesDomId: string;
    notifyClassName: string;
    notifyTextClassName: string;
}

export interface HSGlobalHSUIC {
    defaultImageWidth: number;
    defaultImageHeight: number;
}

export interface IHSGlobal {
    exposedPlayer: PlayerData | null;
    Debug: HSGlobalDebug;
    Release: HSGlobalRelease;
    General: HSGlobalGeneral;
    Common: HSGlobalCommon;
    HSPrototypes: HSGlobalPrototypes;
    HSElementHooker: HSGlobalElementHooker;
    HSLogger: HSGlobalLogger;
    HSStorage: HSGlobalStorage;
    HSSettings: HSGlobalSettings;
    HSMouse: HSGlobalMouse;
    HSHiddenDialogs: HSGlobalHiddenDialogs;
    HSAmbrosia: HSGlobalAmbrosia;
    HSGameData: HSGlobalGameData;
    HSUI: HSGlobalHSUI;
    HSUIC: HSGlobalHSUIC;
    HSGameState: HSGlobalGameState;
    //HSSettingAction: HSGlobalSettingActionSettings;
}
