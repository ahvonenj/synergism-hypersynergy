// Used when listing and loading modules
export type HSModuleDefinition = {
    className: string;
    context?: string;
    moduleName?: string;
}

// Used by HSLogger, log levels
export enum ELogType {
    LOG = 1,
    WARN = 2,
    ERROR = 3
}

export enum ELogLevel {
    ALL = 1,				// LOG, WARN, ERROR
    WARN_AND_ERROR = 2,		// Only WARN and ERROR
    ERROR = 3,				// Only ERROR
    INFO = 4,				// Only LOGs
    NONE = 5,				// Nothing
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
}