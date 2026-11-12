import { HSUI } from "./hs-ui";
import { HSUtils } from "../hs-utils/hs-utils";
import { HSGlobal } from "./hs-global";
import { HSModuleRegistry } from "./module/hs-module-registry";
import { ELogType } from "../../types/module-types/hs-logger-types";

// A line as logged. It is formatted only when drawn or copied: most debug lines of a long run never are
type LogRecord = {
    seq: number;
    type: ELogType;
    context: string;
    msg: string;    // HTML, colour tags not parsed yet
    time: number;   // Date.now()
    repeatCount: number;
};

type DrawnLine = { record: LogRecord; line: HTMLDivElement; repeat: HTMLSpanElement };

// Every level label has the same width, blank included, so the contexts line up (on screen and in copied text)
const LINE_KINDS: Record<ELogType, { label: string; className: string }> = {
    [ELogType.LOG]: { label: '    ', className: 'hs-ui-log-line' },
    [ELogType.INFO]: { label: '    ', className: 'hs-ui-log-line hs-ui-log-line-info' },
    [ELogType.WARN]: { label: 'WRN ', className: 'hs-ui-log-line hs-ui-log-line-warn' },
    [ELogType.ERROR]: { label: 'ERR ', className: 'hs-ui-log-line hs-ui-log-line-error' },
    [ELogType.DEBUG]: { label: 'DBG ', className: 'hs-ui-log-line hs-ui-log-line-debug' },
};

/**
 * Class: HSLogger
 * IsExplicitHSModule: No
 * Description:
 *     Logging module for Hypersynergism.
 *     Contains methods to log things in both the devtools console and the mod's panel's log
 * Author: Swiffy, Shewchou
*/
export class HSLogger {

    static #integratedToUI = false;
    static #logElement: HTMLElement;

    // The time and the debug lines are always recorded: these only show or hide them
    static #displayTimestamp = false;
    static #displayDebug = false;
    // Autosing's speed mode: only warnings and errors, no debug line
    static #quiet = false;

    // Lines on the Log tab. Debug lines have their own cap, so they never push the other lines out
    static #normalLineCount = 0;
    static #debugLineCount = 0;

    // Lines not drawn yet: until the next batch, until the Log tab is shown, or until it exists. One list per kind, oldest first
    static #pendingNormal: LogRecord[] = [];
    static #pendingDebug: LogRecord[] = [];
    // The latest line recorded, while it is still pending: a repeat of it only raises its count
    static #lastPending: LogRecord | null = null;
    // The latest line drawn. A repeat of it, logged after it was drawn, raises its count, shown at the next batch
    static #lastLine: DrawnLine | null = null;
    static #lastLineCountStale = false;
    static #seq = 0;
    static #flushScheduled = false;
    static #flushDelayMs = 250;

    // The time each "once" id was last logged: it is logged again 15 minutes later
    static #onceLoggedAt = new Map<string, number>();
    static #onceIntervalMs = 15 * 60 * 1000;

    // A context's label on the Log tab, once it has a colour (modules register theirs as they are built)
    static #contextLabels = new Map<string, string>();

    // Whether debug lines are recorded at all: callers can skip building costly debug text
    static get isDebugRecorded(): boolean { return !HSLogger.#quiet; }


    // =======================================
    // --- Initialization / UI integration ---
    // =======================================

    // Integrates the logger to the mod's UI panel's Log tab. Lines logged before it wait in the pending lists
    static async integrateToUI(hsui: HSUI) {
        const logElement = await hsui.getLogElement();
        if (!logElement) return;

        HSLogger.#logElement = logElement;
        HSLogger.#integratedToUI = true;
        HSLogger.#applyDisplay();
        HSLogger.log("HSLogger integrated to UI", "HSLogger");
    }

    /**
     * Draws the pending lines, if the Log tab is shown. scrollToNew: new lines scroll the log to the bottom even if
     * the player had scrolled up (the tab was just opened). Without new lines, it stays where the player left it.
     */
    static flushPendingLogs(scrollToNew = true): void {
        if (!HSLogger.#shouldRenderToUi()) return;

        const log = HSLogger.#logElement;
        // Read before the new lines go in: one layout per batch, not one per line
        const wasNearBottom = HSLogger.#isNearBottom();
        HSLogger.#updateLastLineCount();

        const records = HSLogger.#takePending();
        if (records.length > 0) {
            const fragment = document.createDocumentFragment();
            for (const record of records) {
                HSLogger.#lastLine = HSLogger.#buildLine(record);
                fragment.appendChild(HSLogger.#lastLine.line);
                if (record.type === ELogType.DEBUG) HSLogger.#debugLineCount += 1;
                else HSLogger.#normalLineCount += 1;
            }
            log.appendChild(fragment);
            HSLogger.#trimLines();
        }

        if (wasNearBottom || (scrollToNew && records.length > 0)) {
            log.scrollTop = log.scrollHeight;
        }
    }

    /**
     * Every log line kept, oldest first, as plain text with its time, the hidden ones included:
     * the Log tab's lines, then the ones not drawn yet.
     */
    static getLogLines(): string[] {
        const lines: string[] = [];

        if (HSLogger.#integratedToUI) {
            HSLogger.#updateLastLineCount();
            for (const line of Array.from(HSLogger.#logElement.querySelectorAll('.hs-ui-log-line'))) {
                lines.push((line.textContent ?? '').trimEnd());
            }
        }

        // Same text as a drawn line, without drawing it. In an inert document: nothing in the HTML loads or runs
        const plainText = document.implementation.createHTMLDocument('').createElement('div');
        for (const record of HSLogger.#mergedPending()) {
            plainText.innerHTML = HSLogger.#lineHtml(record);
            lines.push(`${plainText.textContent ?? ''}${HSLogger.#repeatText(record)}`.trimEnd());
        }

        return lines;
    }


    // =======================================
    // --------- Public logging API ----------
    // =======================================

    static log(msg: string, context: string = "HSMain") {
        HSLogger.#emit(ELogType.LOG, msg, context);
    }

    static info(msg: string, context: string = "HSMain") {
        HSLogger.#emit(ELogType.INFO, msg, context);
    }

    static warn(msg: string, context: string = "HSMain") {
        HSLogger.#emit(ELogType.WARN, msg, context);
    }

    static error(msg: string, context: string = "HSMain") {
        HSLogger.#emit(ELogType.ERROR, msg, context);
    }

    // Always recorded, except in autosing's speed mode. In the console only while they are shown
    static debug(msg: () => string, context: string = "HSMain") {
        if (HSLogger.#quiet) return;
        const resolved = msg();
        if (HSLogger.#displayDebug) console.log(`DBG [${context}]: ${HSUtils.removeColorTags(resolved)}`);
        HSLogger.#record(ELogType.DEBUG, resolved, context);
    }

    // A warning logged once per logId, then again if it comes back 15 minutes later
    static warnOnce(msg: string, context: string, logId: string) {
        if (HSLogger.#isOnceDue(logId)) HSLogger.warn(msg, context);
    }

    static errorOnce(msg: string, context: string, logId: string) {
        if (HSLogger.#isOnceDue(logId)) HSLogger.error(msg, context);
    }

    static clear() {
        if (HSLogger.#integratedToUI) HSLogger.#logElement.innerHTML = '';
        HSLogger.#normalLineCount = 0;
        HSLogger.#debugLineCount = 0;
        HSLogger.#pendingNormal = [];
        HSLogger.#pendingDebug = [];
        HSLogger.#lastPending = null;
        HSLogger.#lastLine = null;
        HSLogger.#lastLineCountStale = false;
    }


    // =======================================
    // ----------- Display / modes -----------
    // =======================================

    // "Show timestamps" setting
    static setTimestampDisplay(display: boolean) {
        HSLogger.#displayTimestamp = display;
        HSLogger.#applyDisplay();
    }

    // "Show debug logs" setting
    static setDebugDisplay(display: boolean) {
        HSLogger.#displayDebug = display;
        HSLogger.#applyDisplay();
    }

    // Autosing's speed mode, during a run without "Full log during Auto-Sing": warnings and errors only, no debug line
    static setQuietMode(quiet: boolean) {
        HSLogger.#quiet = quiet;
    }

    // One class on the log for each, and the Log tab's checkboxes kept in step with the settings
    static #applyDisplay() {
        const checkbox = (id: string, checked: boolean) => {
            const input = document.getElementById(id) as HTMLInputElement | null;
            if (input) input.checked = checked;
        };
        checkbox('hs-ui-log-show-ts', HSLogger.#displayTimestamp);
        checkbox('hs-ui-log-show-debug', HSLogger.#displayDebug);

        if (!HSLogger.#integratedToUI) return;
        const log = HSLogger.#logElement;
        const wasNearBottom = HSLogger.#isNearBottom();
        log.classList.toggle('hs-log-hide-ts', !HSLogger.#displayTimestamp);
        log.classList.toggle('hs-log-hide-debug', !HSLogger.#displayDebug);
        if (wasNearBottom) log.scrollTop = log.scrollHeight;
    }


    // =======================================
    // ------- Buffer/render pipeline --------
    // =======================================

    static #emit(type: ELogType, msg: string, context: string) {
        if (HSLogger.#quiet && type !== ELogType.WARN && type !== ELogType.ERROR) return;

        const text = `[${context}]: ${HSUtils.removeColorTags(msg)}`;
        if (type === ELogType.WARN) console.warn(text);
        else if (type === ELogType.ERROR) console.error(text);
        else console.log(text);

        HSLogger.#record(type, msg, context);
    }

    static #record(type: ELogType, msg: string, context: string) {
        const last = HSLogger.#lastPending ?? HSLogger.#lastLine?.record;
        if (last && last.type === type && last.context === context && last.msg === msg) {
            last.repeatCount += 1;
            if (last === HSLogger.#lastLine?.record) {
                HSLogger.#lastLineCountStale = true;
                HSLogger.#scheduleFlush();
            }
            return;
        }

        const record: LogRecord = { seq: HSLogger.#seq++, type, context, msg, time: Date.now(), repeatCount: 1 };
        const isDebug = type === ELogType.DEBUG;
        const list = isDebug ? HSLogger.#pendingDebug : HSLogger.#pendingNormal;
        list.push(record);
        if (list.length > (isDebug ? HSGlobal.HSLogger.debugLogSize : HSGlobal.HSLogger.logSize)) list.shift();
        HSLogger.#lastPending = record;

        HSLogger.#scheduleFlush();
    }

    // Lines are drawn in batches, at most every #flushDelayMs: each drawing lays out the whole log again,
    // and autosing's full log writes about one line per frame
    static #scheduleFlush() {
        if (HSLogger.#flushScheduled || !HSLogger.#shouldRenderToUi()) return;
        HSLogger.#flushScheduled = true;
        window.setTimeout(() => {
            HSLogger.#flushScheduled = false;
            HSLogger.flushPendingLogs(false);
        }, HSLogger.#flushDelayMs);
    }

    // Both pending lists, in the order the lines were logged, and empties them
    static #takePending(): LogRecord[] {
        const records = HSLogger.#mergedPending();
        HSLogger.#pendingNormal = [];
        HSLogger.#pendingDebug = [];
        HSLogger.#lastPending = null;
        return records;
    }

    // Both pending lists, in the order the lines were logged
    static #mergedPending(): LogRecord[] {
        const a = HSLogger.#pendingNormal, b = HSLogger.#pendingDebug;
        if (b.length === 0) return a.slice();
        if (a.length === 0) return b.slice();

        const merged: LogRecord[] = [];
        let i = 0, j = 0;
        while (i < a.length && j < b.length) merged.push(a[i].seq < b[j].seq ? a[i++] : b[j++]);
        while (i < a.length) merged.push(a[i++]);
        while (j < b.length) merged.push(b[j++]);
        return merged;
    }

    static #lineHtml(record: LogRecord): string {
        return `<span class="hs-log-ts">${HSUtils.getTime(record.time)} </span>`
            + `<span class="hs-log-level">${LINE_KINDS[record.type].label}</span>`
            + `[<span class="hs-log-ctx">${HSLogger.#colorContext(record.context)}</span>]: `
            + HSUtils.parseColorTags(record.msg);
    }

    static #repeatText(record: LogRecord): string {
        return record.repeatCount > 1 ? ` (x${record.repeatCount})` : '';
    }

    static #buildLine(record: LogRecord): DrawnLine {
        const line = document.createElement('div');
        line.className = LINE_KINDS[record.type].className;
        line.innerHTML = HSLogger.#lineHtml(record);

        const repeat = document.createElement('span');
        repeat.className = 'hs-log-repeat';
        repeat.textContent = HSLogger.#repeatText(record);
        line.append(repeat, '\n');

        return { record, line, repeat };
    }

    static #updateLastLineCount() {
        if (!HSLogger.#lastLineCountStale || !HSLogger.#lastLine) return;
        HSLogger.#lastLineCountStale = false;
        HSLogger.#lastLine.repeat.textContent = HSLogger.#repeatText(HSLogger.#lastLine.record);
    }

    // Removes the oldest lines of a kind over its cap
    static #trimLines() {
        const log = HSLogger.#logElement;

        while (HSLogger.#normalLineCount > HSGlobal.HSLogger.logSize) {
            const oldest = log.querySelector(':scope > .hs-ui-log-line:not(.hs-ui-log-line-debug)');
            if (!oldest) break;
            oldest.remove();
            HSLogger.#normalLineCount -= 1;
        }

        while (HSLogger.#debugLineCount > HSGlobal.HSLogger.debugLogSize) {
            const oldest = log.querySelector(':scope > .hs-ui-log-line-debug');
            if (!oldest) break;
            oldest.remove();
            HSLogger.#debugLineCount -= 1;
        }
    }


    // =======================================
    // ------ Render gating / scrolling ------
    // =======================================

    static #shouldRenderToUi(): boolean {
        return HSLogger.#integratedToUI && HSUI.isModPanelOpen() && HSUI.isLogTabActive();
    }

    static #isNearBottom(): boolean {
        const log = HSLogger.#logElement;
        return log.scrollHeight - log.scrollTop - log.clientHeight < 50;
    }


    // =======================================
    // ----------- Lines metadata ------------
    // =======================================

    static #isOnceDue(logId: string): boolean {
        const now = Date.now();
        const loggedAt = HSLogger.#onceLoggedAt.get(logId);
        if (loggedAt !== undefined && now - loggedAt < HSLogger.#onceIntervalMs) return false;
        HSLogger.#onceLoggedAt.set(logId, now);
        return true;
    }

    // A module's context takes its moduleColor, another context the color listed for it in HSGlobal
    static #colorContext(context: string): string {
        const cached = HSLogger.#contextLabels.get(context);
        if (cached !== undefined) return cached;

        const listed = HSGlobal.HSLogger.contextColors[context];
        const color = HSModuleRegistry.getModuleColor(context)
            ?? (listed ? HSModuleRegistry.getModuleColor(listed) : undefined)
            ?? listed;
        if (!color) return context;

        const label = HSUtils.parseColorTags(context.colorTag(color));
        HSLogger.#contextLabels.set(context, label);
        return label;
    }
}
