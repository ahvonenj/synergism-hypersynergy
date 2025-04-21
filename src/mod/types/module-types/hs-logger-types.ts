// Used by HSLogger, log levels
export enum ELogType {
    LOG = 1,
    WARN = 2,
    ERROR = 3,
    INFO = 4,
    DEBUG = 5,
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