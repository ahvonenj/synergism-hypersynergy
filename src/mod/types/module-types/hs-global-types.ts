import { HSAmbrosiaLoadoutIconMapping } from "./hs-ambrosia-types";
import { HSWatcherOptions } from "./hs-elementhooker-types";
import { HSViewProperties, MAIN_VIEW } from "./hs-gamestate-types";
import { ELogLevel } from "./hs-logger-types";

interface IStoreable {
    storageKey: string;
}

export interface HSGlobalDebug {
    debugMode: boolean;
    performanceDebugMode: boolean;
    gameDataDebugMode: boolean;
    calculationCacheDebugMode: boolean;
}

export interface HSGlobalGeneral {
    currentModVersion: string;
    modGithubUrl: string;
    modWikiUrl: string;
    modWikiFeaturesUrl: string;
    modWebsiteUrl: string;
}

export interface HSGlobalCommon {
    eventAPIUrl: string;
    pseudoAPIurl: string;
    meAPIurl: string;
    experimentalGDS: boolean,
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
    logLevel: ELogLevel.ALL,
    logSize: number;
}

export interface HSGlobalStorage {
    storagePrefix: string;
}

export interface HSGlobalSettings extends IStoreable {
    serializationBlackList: string[];
    gameDataRequiredTooltip: string;
    gameDataCheckBlacklist: string[];
}

/*export interface HSGlobalSettingActionSettings {
    
}*/

export interface HSGlobalMouse {
    autoClickIgnoredElements: string[];
}

export interface HSGlobalAmbrosia extends IStoreable {
    ambrosiaLoadoutIcons: HSAmbrosiaLoadoutIconMapping;
    quickBarId: string;
    quickBarLoadoutIdPrefix: string;

    idleSwapIndicatorId: string;
    idleSwapMaxBlueTreshold: number;
    idleSwapMinBlueTreshold: number;

    idleSwapMaxRedTreshold: number;
    idleSwapMinRedTreshold: number;

    R_TIME_PER_AMBROSIA: number;
    R_TIME_PER_RED_AMBROSIA: number;
    R_digitReduction: number;

    blueBarId: string;
    blueBarProgressId: string;
    blueBarProgressTextId: string;
    redBarId: string;
    redBarProgressId: string;
    redBarProgressTextId: string;
    barWrapperId: string;
}

export interface HSGlobalGameState {
    viewProperties: Map<MAIN_VIEW, HSViewProperties>;
}

export interface HSGlobalGameData {
    fetchedDataRefreshInterval: number;
    campaignTokenRefreshInterval: number;
    turboModeSpeedMs: number;
    turboCSSId: string;
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
    Debug: HSGlobalDebug;
    General: HSGlobalGeneral;
    Common: HSGlobalCommon;
    HSPrototypes: HSGlobalPrototypes;
    HSElementHooker: HSGlobalElementHooker;
    HSLogger: HSGlobalLogger;
    HSStorage: HSGlobalStorage;
    HSSettings: HSGlobalSettings;
    HSMouse: HSGlobalMouse;
    HSAmbrosia: HSGlobalAmbrosia;
    HSGameData: HSGlobalGameData;
    HSUI: HSGlobalHSUI;
    HSUIC: HSGlobalHSUIC;
    HSGameState: HSGlobalGameState;
    //HSSettingAction: HSGlobalSettingActionSettings;
}