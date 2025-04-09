/*
    Type definition collection: HS types
    Description: Collection of general types for Hypersynergism
    Author: Swiffy
*/

// Used when listing and loading modules
export type HSModuleDefinition = {
    className: string;
    context?: string;
    moduleName?: string;
    loadOrder?: number;
    initImmediate?: boolean;
    moduleColor?: string;
}

// Used by HSLogger, log levels
export enum ELogType {
    LOG = 1,
    WARN = 2,
    ERROR = 3,
    INFO = 4
}

export enum ELogLevel {
    ALL = 1,				// LOG, WARN, ERROR, INFO
    WARN_AND_ERROR = 2,		// Only WARN and ERROR
    ERROR = 3,				// Only ERROR
    LOG = 4,				// Only LOGs
    EXPLOG = 5,             // Only LOG, INFO
    NONE = 6,				// Nothing
    INFO = 7,               // Only INFO
    WARN = 8,               // Only WARN
}

// Talisman fragment enum, by fragment color
export enum ETalismanFragmentIndex {
    YELLOW = 0,
    WHITE = 1,
    GREEN = 2,
    BLUE = 3,
    PURPLE = 4,
    ORANGE = 5,
    RED = 6
}

export type HSElementWatcher = {
    element: HTMLElement;
    callback: (value: any) => any;
    value: any;
    parser: (value: any) => any;
    observer?: MutationObserver;
    lastCall?: number;
}

export type HSMousePosition = {
    x: number;
    y: number;
}

export enum EKeyBoardKeys {
    LEFT_CTRL = 'ControlLeft',
    RIGHT_CTRL = 'ControlRight',

    LEFT_SHIFT = 'ShiftLeft',
    RIGHT_SHIFT = 'ShiftRight'
}

export interface HSGlobalGeneral {
    currentModVersion: string;
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
}

export interface HSGlobalLogger {
    logLevel: ELogLevel.ALL,
    logSize: number;
}

export interface HSGlobalStorage {
    storagePrefix: string;
}

export interface HSGlobalSettings {
    storageKey: string;
}

export interface HSGlobalMouse {
    autoClickIgnoredElements: string[];
}

export interface IHSGlobal {
    General: HSGlobalGeneral;
    HSPrototypes: HSGlobalPrototypes;
    HSElementHooker: HSGlobalElementHooker;
    HSLogger: HSGlobalLogger;
    HSStorage: HSGlobalStorage;
    HSSettings: HSGlobalSettings;
    HSMouse: HSGlobalMouse;
}