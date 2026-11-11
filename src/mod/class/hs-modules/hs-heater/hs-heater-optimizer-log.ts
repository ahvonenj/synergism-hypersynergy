// Worker-safe log collection, drained by the runner after each request.
export type HeaterOptimizerLog = { level: 'warn' | 'error'; message: string; context: string };

const PENDING_LOG_LIMIT = 200;
const pendingLogs: HeaterOptimizerLog[] = [];

function keepLog(level: HeaterOptimizerLog['level'], message: string, context: string): void {
    if (pendingLogs.length < PENDING_LOG_LIMIT)
        pendingLogs.push({ level, message, context });
}

export const HSHeaterOptimizerLogger = {
    debug: (_message: () => string, _context?: string): void => {},
    warn: (message: string, context = "HSHeaterOptimizer"): void => {
        console.warn(`[${context}]: ${message}`);
        keepLog('warn', message, context);
    },
    error: (message: string, context = "HSHeaterOptimizer"): void => {
        console.error(`[${context}]: ${message}`);
        keepLog('error', message, context);
    },
};

/** The warnings and errors logged since the last call, oldest first. */
export function takeHeaterOptimizerLogs(): HeaterOptimizerLog[] {
    return pendingLogs.splice(0);
}
