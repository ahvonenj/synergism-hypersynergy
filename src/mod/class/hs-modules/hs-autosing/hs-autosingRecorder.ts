import { SPECIAL_ACTION_BY_ID, type Challenge, type HSAutosingPassRecord, type HSAutosingTimings } from "../../../types/module-types/hs-autosing-types";

/**
 * Class: HSAutosingRecorder
 * IsExplicitHSModule: No
 * Description: Records autosing's timings (each step, phase pass, singularity transition and singularity) in
 *     window.__HS_autosingTimings, with the setting "Record step timings" on: for the step timings window and
 *     the headless harness. Cleared at each autosing start. Off, autosing never calls it during a run.
 * Author: Shewchou
 */
export class HSAutosingRecorder {
    /** Clears the timings for a new run. */
    static start(strategy: string, target: number): void {
        window.__HS_autosingTimings = {
            strategy,
            target,
            steps: [],
            passes: [],
            transitions: [],
            singularities: [],
            dropped: { steps: 0, passes: 0, transitions: 0, singularities: 0 },
            current: { sing: 1, startedAt: performance.now(), passCount: {}, phaseMs: {} },
        };
    }

    /** A run that doesn't record starts: the last run's timings go. */
    static clear(): void {
        delete window.__HS_autosingTimings;
    }

    /** A phase pass starts: the record to hand to step() and endPass(). */
    static startPass(phase: string): HSAutosingPassRecord | undefined {
        const t = window.__HS_autosingTimings;
        if (!t) return undefined;
        const pass = (t.current.passCount[phase] ?? 0) + 1;
        t.current.passCount[phase] = pass;
        return { sing: t.current.sing, phase, pass, startedAt: performance.now(), steps: 0, waitMs: 0 };
    }

    static step(record: HSAutosingPassRecord, step: Challenge, index: number, number: number, startedAt: number, jump: number | null): void {
        const t = window.__HS_autosingTimings;
        if (!t) return;
        record.steps++;
        const n = step.challengeNumber;
        HSAutosingRecorder.#push(t, 'steps', {
            sing: record.sing,
            phase: record.phase,
            pass: record.pass,
            index,
            number,
            action: n < 100 ? `C${n}` : (SPECIAL_ACTION_BY_ID.get(n)?.label ?? String(n)),
            ...(step.comment ? { comment: step.comment } : {}),
            waitBefore: step.challengeWaitBefore ?? 0,
            waitMs: HSAutosingRecorder.#round(record.waitMs),
            ms: HSAutosingRecorder.#round(performance.now() - startedAt),
            ...(typeof jump === 'number' ? { jump } : {}),
        });
        record.waitMs = 0;
    }

    static endPass(record: HSAutosingPassRecord, end: 'done' | 'aoag' | 'stopped'): void {
        const t = window.__HS_autosingTimings;
        if (!t) return;
        const ms = performance.now() - record.startedAt;
        // A pass that ends after the next singularity was recorded still counts in its own
        if (record.sing === t.current.sing) {
            t.current.phaseMs[record.phase] = (t.current.phaseMs[record.phase] ?? 0) + ms;
        }
        HSAutosingRecorder.#push(t, 'passes', {
            sing: record.sing,
            phase: record.phase,
            pass: record.pass,
            ms: HSAutosingRecorder.#round(ms),
            steps: record.steps,
            end,
        });
    }

    /**
     * The singularity in progress ends here (where the run panel records it). The one done at autosing's
     * start isn't recorded (`record` false): only its timer restarts.
     */
    static singularity(record: boolean, goldenQuarks: number, quarks: number, c15: number): void {
        const t = window.__HS_autosingTimings;
        if (!t) return;
        const now = performance.now();
        if (record) {
            const phases: Record<string, number> = {};
            for (const [phase, ms] of Object.entries(t.current.phaseMs)) phases[phase] = HSAutosingRecorder.#round(ms);
            HSAutosingRecorder.#push(t, 'singularities', {
                sing: t.current.sing,
                ms: HSAutosingRecorder.#round(now - t.current.startedAt),
                goldenQuarks,
                quarks,
                c15,
                phases,
            });
            t.current.sing++;
        }
        t.current.startedAt = now;
        t.current.passCount = {};
        t.current.phaseMs = {};
    }

    /** A #performSingularity has ended. `recordedAt`: when it recorded the singularity (or restarted its timer). */
    static transition(startedAt: number, recordedAt: number): void {
        const t = window.__HS_autosingTimings;
        if (!t) return;
        HSAutosingRecorder.#push(t, 'transitions', {
            sing: t.current.sing,
            ms: HSAutosingRecorder.#round(performance.now() - startedAt),
            msBeforeRecord: HSAutosingRecorder.#round(recordedAt - startedAt),
        });
    }

    /** Appends an entry, dropping the oldest tenth of the list once it's full. */
    static #push<K extends 'steps' | 'passes' | 'transitions' | 'singularities'>(t: HSAutosingTimings, list: K, entry: HSAutosingTimings[K][number]): void {
        const entries = t[list] as Array<HSAutosingTimings[K][number]>;
        const cap = list === 'steps' ? 20000 : 2000;
        if (entries.length >= cap) {
            const drop = cap / 10;
            entries.splice(0, drop);
            t.dropped[list] += drop;
        }
        entries.push(entry);
    }

    static #round(ms: number): number {
        return Math.round(ms * 10) / 10;
    }
}
