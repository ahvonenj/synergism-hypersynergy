import { HSAmbrosiaLoadoutIconMapping } from "./hs-ambrosia-types";
import { HSWatcherOptions } from "./hs-elementhooker-types";
import { ELogLevel } from "./hs-logger-types";

interface IStoreable {
    storageKey: string;
}

export interface HSGlobalDebug {
    debugMode: boolean;
    performanceDebugMode: boolean;
}

export interface HSGlobalGeneral {
    currentModVersion: string;
    modGithubUrl: string;
    modWikiUrl: string;
    modWikiFeaturesUrl: string;
    modWebsiteUrl: string;
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

}

export interface HSGlobalMouse {
    autoClickIgnoredElements: string[];
}

export interface HSGlobalAmbrosia extends IStoreable {
    ambrosiaLoadoutIcons: HSAmbrosiaLoadoutIconMapping;
    quickBarId: string;
    quickBarLoadoutIdPrefix: string;
}

export interface HSGlobalGameData {
    saveDataWatchInterval: number;
}

export interface IHSGlobal {
    Debug: HSGlobalDebug;
    General: HSGlobalGeneral;
    HSPrototypes: HSGlobalPrototypes;
    HSElementHooker: HSGlobalElementHooker;
    HSLogger: HSGlobalLogger;
    HSStorage: HSGlobalStorage;
    HSSettings: HSGlobalSettings;
    HSMouse: HSGlobalMouse;
    HSAmbrosia: HSGlobalAmbrosia;
    HSGameData: HSGlobalGameData;
}