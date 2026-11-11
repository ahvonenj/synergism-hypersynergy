/**
 * Returns both the average and standard deviation of the last n durations.
 */
export function getAvgAndStdLast(metrics: Array<{ duration: number }>, n: number): { avg: number | null; sd: number | null } {
    if (n <= 0 || metrics.length < n) return { avg: null, sd: null };
    const start = metrics.length - n;
    let sum = 0;
    for (let i = start; i < metrics.length; i++) sum += metrics[i].duration;
    const avg = sum / n;
    if (n <= 1) return { avg, sd: null };
    let sumSq = 0;
    for (let i = start; i < metrics.length; i++) {
        const d = metrics[i].duration - avg;
        sumSq += d * d;
    }
    return { avg, sd: Math.sqrt(Math.max(0, sumSq / n)) };
}

/**
 * Returns the population variance of ln(C15) using incremental Welford stats.
 */
export function getLogC15Variance(logC15Count: number, logC15M2: number): number | null {
    if (logC15Count === 0) return null;
    return logC15M2 / logC15Count;
}

/**
 * Returns the population standard deviation of ln(C15).
 */
export function getLogC15Std(logC15Count: number, logC15M2: number): number | null {
    const v = getLogC15Variance(logC15Count, logC15M2);
    return v === null ? null : Math.sqrt(v);
}
