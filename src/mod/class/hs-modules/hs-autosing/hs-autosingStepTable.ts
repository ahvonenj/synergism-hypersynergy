import type { HSAutosingTimings } from "./hs-autosing-types";
import { formatNumber } from "./hs-autosingFormatUtils";

// 'step': a strategy step. 'between': from one singularity to the next. 'other': the time in no step.
export type HSAutosingStepRowKind = 'step' | 'between' | 'other';

export interface HSAutosingStepRow {
    kind: HSAutosingStepRowKind;
    // Empty when not a step
    phase: string;
    // The step's number in the strategy editor and the logs (0: a step inserted at load), null when not a step
    step: number | null;
    action: string;
    comment: string;
    // Times per singularity
    runs: number;
    // ms per singularity, wait included
    ms: number;
    // Of which ms in the step's Wait before, null when not a step
    waitMs: number | null;
    // Part of a singularity's time, from 0 to 1
    share: number;
}

export interface HSAutosingStepTable {
    strategy: string;
    target: number;
    // The finished singularities the table covers, all of whose steps are still held
    singularities: number;
    // All the run's finished singularities, covered or not
    finishedSingularities: number;
    avgMs: number;
    sdMs: number;
    quarksPerHour: number;
    goldenQuarksPerHour: number;
    // Geometric mean of the C15 scores, null when none can be read as a number
    c15: number | null;
    // In the strategy's order, then 'between' and 'other'
    rows: HSAutosingStepRow[];
}

export interface HSAutosingStepTableInfo {
    modVersion: string;
    loadouts: string[];
}

const BETWEEN_LABEL = 'Between singularities';
const OTHER_LABEL = 'Outside the steps';

/**
 * What a run's timings say per singularity, over the finished singularities whose steps are all held. A singularity
 * still running is left out; so is the oldest one once the recorder's cap has dropped part of its steps.
 */
export function buildStepTable(timings: HSAutosingTimings): HSAutosingStepTable {
    const last = timings.current.sing - 1;
    let first = 1;
    if (timings.dropped.steps > 0 && timings.steps.length > 0) first = timings.steps[0].sing + 1;
    if (timings.singularities.length > 0) first = Math.max(first, timings.singularities[0].sing);

    const singularities = timings.singularities.filter(s => s.sing >= first && s.sing <= last);
    const count = singularities.length;
    const table: HSAutosingStepTable = {
        strategy: timings.strategy,
        target: timings.target,
        singularities: count,
        finishedSingularities: last,
        avgMs: 0,
        sdMs: 0,
        quarksPerHour: 0,
        goldenQuarksPerHour: 0,
        c15: null,
        rows: [],
    };
    if (count === 0) return table;

    let totalMs = 0;
    let totalQuarks = 0;
    let totalGoldenQuarks = 0;
    for (const s of singularities) {
        totalMs += s.ms;
        totalQuarks += s.quarks;
        totalGoldenQuarks += s.goldenQuarks;
    }
    table.avgMs = totalMs / count;
    // Divided by the count, as in the run panel
    const squares = singularities.reduce((sum, s) => sum + (s.ms - table.avgMs) ** 2, 0);
    table.sdMs = Math.sqrt(squares / count);
    if (totalMs > 0) {
        table.quarksPerHour = totalQuarks / totalMs * 3600000;
        table.goldenQuarksPerHour = totalGoldenQuarks / totalMs * 3600000;
    }
    const logsC15 = singularities.filter(s => s.c15 > 0 && Number.isFinite(s.c15)).map(s => Math.log10(s.c15));
    if (logsC15.length > 0) table.c15 = 10 ** (logsC15.reduce((sum, log) => sum + log, 0) / logsC15.length);

    // One row per step of each phase. Phases rank as they first ran, so the rows follow the strategy.
    const phaseRank = new Map<string, number>();
    const steps = new Map<string, { phase: string; index: number; step: number; action: string; comment: string; runs: number; ms: number; waitMs: number }>();
    for (const s of timings.steps) {
        if (s.sing < first || s.sing > last) continue;
        if (!phaseRank.has(s.phase)) phaseRank.set(s.phase, phaseRank.size);
        const key = `${s.phase}\0${s.index}`;
        let row = steps.get(key);
        if (!row) {
            row = { phase: s.phase, index: s.index, step: s.number, action: s.action, comment: s.comment ?? '', runs: 0, ms: 0, waitMs: 0 };
            steps.set(key, row);
        }
        row.runs++;
        row.ms += s.ms;
        row.waitMs += s.waitMs;
    }
    const share = (ms: number) => table.avgMs > 0 ? ms / table.avgMs : 0;
    const sorted = [...steps.values()].sort((a, b) => phaseRank.get(a.phase)! - phaseRank.get(b.phase)! || a.index - b.index);
    let inSteps = 0;
    for (const row of sorted) {
        const ms = row.ms / count;
        inSteps += ms;
        table.rows.push({
            kind: 'step', phase: row.phase, step: row.step, action: row.action, comment: row.comment,
            runs: row.runs / count, ms, waitMs: row.waitMs / count, share: share(ms),
        });
    }

    // A singularity holds the part of its own transition after the record, and the part of the next one before it
    let betweenTotal = 0;
    for (const t of timings.transitions) {
        if (t.sing >= first && t.sing <= last) betweenTotal += t.ms - t.msBeforeRecord;
        if (t.sing > first && t.sing <= last + 1) betweenTotal += t.msBeforeRecord;
    }
    const between = betweenTotal / count;
    table.rows.push({ kind: 'between', phase: '', step: null, action: BETWEEN_LABEL, comment: '', runs: 1, ms: between, waitMs: null, share: share(between) });

    const other = Math.max(0, table.avgMs - inSteps - between);
    table.rows.push({ kind: 'other', phase: '', step: null, action: OTHER_LABEL, comment: '', runs: 1, ms: other, waitMs: null, share: share(other) });
    return table;
}

/** "10 singularities · 7.18 s ± 0.21" ("Last 144 of 160 singularities" once some are left out), then a line with the rates and the C15 score. */
export function stepTableSummaryLines(table: HSAutosingStepTable): [string, string] {
    const covered = table.singularities < table.finishedSingularities
        ? `Last ${table.singularities} of ${table.finishedSingularities} singularities`
        : `${table.singularities} singularit${table.singularities === 1 ? 'y' : 'ies'}`;
    const gains = [
        `Quarks ${formatNumber(table.quarksPerHour)}/hr`,
        `Golden quarks ${formatNumber(table.goldenQuarksPerHour)}/hr`,
    ];
    if (table.c15 !== null) gains.push(`C15 ${formatNumber(table.c15)}`);
    return [
        `${covered} · ${(table.avgMs / 1000).toFixed(2)} s ± ${(table.sdMs / 1000).toFixed(2)}`,
        gains.join(' · '),
    ];
}

// No tab or line break can come from a strategy's name or comment into the copied columns
function oneLine(text: string): string {
    return text.replace(/\s+/g, ' ').trim();
}

/** The table as text, to compare runs or share one: tab-separated, the strategy's order, whatever the window's sort. */
export function stepTableText(table: HSAutosingStepTable, info: HSAutosingStepTableInfo): string {
    const lines = [
        `HyperSynergism v${info.modVersion} · ${oneLine(table.strategy)} · S${table.target} · Ambrosia: ${oneLine(info.loadouts.join(', '))}`,
        stepTableSummaryLines(table).join(' · '),
        '',
        ['ms/sing', '%', 'Wait ms', 'Runs', 'Phase', 'Step', 'Action', 'Comment'].join('\t'),
    ];
    for (const row of table.rows) {
        lines.push([
            Math.round(row.ms),
            (row.share * 100).toFixed(1),
            row.waitMs === null ? '' : Math.round(row.waitMs),
            row.kind === 'step' ? Number(row.runs.toFixed(1)) : '',
            oneLine(row.phase),
            row.step ?? '',
            oneLine(row.action),
            oneLine(row.comment),
        ].join('\t'));
    }
    return lines.join('\n');
}
