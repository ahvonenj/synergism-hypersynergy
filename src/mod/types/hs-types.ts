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
