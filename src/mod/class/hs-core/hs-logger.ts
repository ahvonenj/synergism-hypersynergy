import { HSUI } from "./hs-ui";
import { HSUtils } from "../hs-utils/hs-utils";
import { HSGlobal } from "./hs-global";
import { HSModuleRegistry } from "./module/hs-module-registry";
import { ELogType, ELogLevel } from "../../types/module-types/hs-logger-types";

type LogRecord = {
    seq: number;
    level: string;
    className: string | null;
    contextString: string;
    formattedMessage: string;
    timeString: string;
    hash: number;
    repeatCount: number;
    isDebug: boolean;
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

    // Lines not drawn yet: until the next batch, or until the Log tab is shown. One list per kind, oldest first
    static #pendingNormal: LogRecord[] = [];
    static #pendingDebug: LogRecord[] = [];
    // The latest line recorded, while it is still pending: a repeat of it only raises its count
    static #lastPending: LogRecord | null = null;
    static #seq = 0;
    static #flushScheduled = false;
    static #flushDelayMs = 250;

    static #oneShotLogHistory: Map<string, { logged: boolean, timestamp: number, level: ELogType, count: number }> = new Map();
    static #oneShotHistoryMaxAge = 15 * 60 * 1000; // 15 minutes

    // Whether debug lines are recorded at all: callers can skip building costly debug text
    static get isDebugRecorded(): boolean { return !HSLogger.#quiet; }


    // =======================================
    // --- Initialization / UI integration ---
    // =======================================

    // Integrates the logger to the mod's UI panel's Log tab
    static async integrateToUI(hsui: HSUI) {
        const logElement = await hsui.getLogElement();

        if (logElement) {
            this.#logElement = logElement;
            this.#integratedToUI = true;
            this.#normalLineCount = logElement.querySelectorAll('.hs-ui-log-line:not(.hs-ui-log-line-debug)').length;
            this.#debugLineCount = logElement.querySelectorAll('.hs-ui-log-line-debug').length;
            this.#applyDisplay();

            this.log("HSLogger integrated to UI", "HSLogger");
            this.flushPendingLogs();
        }
    }

    // The log stays off until the settings are read (HSGlobal.HSLogger.logLevel starts at NONE)
    static onSettingsParsed(): void {
        if (!this.#quiet) HSGlobal.HSLogger.logLevel = ELogLevel.ALL;
    }

    /**
     * Draws the pending lines, if the Log tab is shown. forceScroll: scrolls to the bottom even if the player
     * had scrolled up (the tab was just opened).
     */
    static flushPendingLogs(forceScroll = true): void {
        if (!this.#shouldRenderToUi()) return;

        const records = this.#mergedPending();
        this.#pendingNormal = [];
        this.#pendingDebug = [];
        this.#lastPending = null;
        if (records.length === 0) return;

        const log = this.#logElement;
        // Read before the new lines go in: one layout per batch, not one per line
        const wasNearBottom = log.scrollHeight - log.scrollTop - log.clientHeight < 50;
        const fragment = document.createDocumentFragment();
        let last = log.lastElementChild as HTMLDivElement | null;

        for (const record of records) {
            if (last && last.dataset.hash === String(record.hash)) {
                this.#setRepeatCount(last, Number(last.dataset.count ?? 1) + record.repeatCount);
                continue;
            }
            last = this.#buildLine(record);
            fragment.appendChild(last);
            if (record.isDebug) this.#debugLineCount += 1;
            else this.#normalLineCount += 1;
        }

        log.appendChild(fragment);
        this.#trimLines();

        if (forceScroll || wasNearBottom) {
            log.scrollTop = log.scrollHeight;
        }
    }

    /**
     * Every log line kept, oldest first, as plain text with its time, the hidden ones included:
     * the Log tab's lines, then the ones not drawn yet.
     */
    static getLogLines(): string[] {
        const lines: string[] = [];
        if (!this.#integratedToUI) return lines;

        for (const line of Array.from(this.#logElement.querySelectorAll('.hs-ui-log-line'))) {
            lines.push((line.textContent ?? '').trimEnd());
        }

        // Same text as #buildLine gives them, without drawing them
        const plainText = document.createElement('div');
        for (const record of this.#mergedPending()) {
            plainText.innerHTML = `${record.timeString} ${record.level}[${record.contextString}]: ${record.formattedMessage}`;
            const repeat = record.repeatCount > 1 ? ` (x${record.repeatCount})` : '';
            lines.push(`${plainText.textContent ?? ''}${repeat}`);
        }

        return lines;
    }


    // =======================================
    // --------- Public logging API ----------
    // =======================================

    static log(msg: string, context: string = "HSMain", isImportant: boolean = false) {
        if (!this.#shouldLog(ELogType.LOG, isImportant)) return;
        console.log(`[${context}]: ${HSUtils.removeColorTags(msg)}`);
        this.#record(msg, context, ELogType.LOG);
    }

    static info(msg: string, context: string = "HSMain", isImportant: boolean = false) {
        if (!this.#shouldLog(ELogType.INFO, isImportant)) return;
        console.log(`[${context}]: ${HSUtils.removeColorTags(msg)}`);
        this.#record(msg, context, ELogType.INFO);
    }

    static warn(msg: string, context: string = "HSMain", isImportant: boolean = false) {
        if (!this.#shouldLog(ELogType.WARN, isImportant)) return;
        console.warn(`[${context}]: ${HSUtils.removeColorTags(msg)}`);
        this.#record(msg, context, ELogType.WARN);
    }

    static error(msg: string, context: string = "HSMain", isImportant: boolean = false) {
        if (!this.#shouldLog(ELogType.ERROR, isImportant)) return;
        console.error(`[${context}]: ${HSUtils.removeColorTags(msg)}`);
        this.#record(msg, context, ELogType.ERROR);
    }

    // Always recorded, except in autosing's speed mode. In the console only while they are shown
    static debug(msg: () => string, context: string = "HSMain", isImportant: boolean = false) {
        if (HSLogger.#quiet) return;
        const resolved = msg();
        if (HSLogger.#displayDebug) console.log(`DBG [${context}]: ${HSUtils.removeColorTags(resolved)}`);
        this.#record(resolved, context, ELogType.DEBUG);
    }

    static clear() {
        if (this.#integratedToUI) {
            this.#logElement.innerHTML = '';
            this.#normalLineCount = 0;
            this.#debugLineCount = 0;
            this.#pendingNormal = [];
            this.#pendingDebug = [];
            this.#lastPending = null;
        }
    }

    static logOnce(msg: string, logId: string) {
        if (!this.#oneShotLogHistory.has(logId) || !this.#oneShotLogHistory.get(logId)?.logged) {
            this.#oneShotLogHistory.set(logId, { logged: true, timestamp: Date.now(), level: ELogType.LOG, count: 0 });
            this.log(msg, "Once", true);
        } else {
            this.#oneShotLogHistory.get(logId)!.count++;
        }

        this.#pruneOneShotHistory();
    }

    static warnOnce(msg: string, logId: string) {
        if (!this.#oneShotLogHistory.has(logId) || !this.#oneShotLogHistory.get(logId)?.logged) {
            this.#oneShotLogHistory.set(logId, { logged: true, timestamp: Date.now(), level: ELogType.WARN, count: 0 });
            this.warn(msg, "Once", true);
        } else {
            this.#oneShotLogHistory.get(logId)!.count++;
        }

        this.#pruneOneShotHistory();
    }

    static errorOnce(msg: string, logId: string) {
        if (!this.#oneShotLogHistory.has(logId) || !this.#oneShotLogHistory.get(logId)?.logged) {
            this.#oneShotLogHistory.set(logId, { logged: true, timestamp: Date.now(), level: ELogType.ERROR, count: 0 });
            this.error(msg, "Once", true);
        } else {
            this.#oneShotLogHistory.get(logId)!.count++;
        }

        this.#pruneOneShotHistory();
    }


    // =======================================
    // ----------- Display / modes -----------
    // =======================================

    // "Show timestamps" setting
    static setTimestampDisplay(display: boolean) {
        this.#displayTimestamp = display;
        this.#applyDisplay();
    }

    // "Show debug logs" setting
    static setDebugDisplay(display: boolean) {
        this.#displayDebug = display;
        this.#applyDisplay();
    }

    // Autosing's speed mode, during a run without "Full log during Auto-Sing": warnings and errors only, no debug line
    static setQuietMode(quiet: boolean) {
        this.#quiet = quiet;
        HSGlobal.HSLogger.logLevel = quiet ? ELogLevel.WARN_AND_ERROR : ELogLevel.ALL;
    }

    // One class on the log for each, and the Log tab's checkboxes kept in step with the settings
    static #applyDisplay() {
        const checkbox = (id: string, checked: boolean) => {
            const input = document.getElementById(id) as HTMLInputElement | null;
            if (input) input.checked = checked;
        };
        checkbox('hs-ui-log-show-ts', this.#displayTimestamp);
        checkbox('hs-ui-log-show-debug', this.#displayDebug);

        if (!this.#integratedToUI) return;
        const log = this.#logElement;
        const wasNearBottom = log.scrollHeight - log.scrollTop - log.clientHeight < 50;
        log.classList.toggle('hs-log-hide-ts', !this.#displayTimestamp);
        log.classList.toggle('hs-log-hide-debug', !this.#displayDebug);
        if (wasNearBottom) log.scrollTop = log.scrollHeight;
    }


    // =======================================
    // ------- Buffer/render pipeline --------
    // =======================================

    static #record(msg: string, context: string, logType: ELogType) {
        if (!this.#integratedToUI) return;

        const { level, className } = this.#getLogLevelMeta(logType);
        const contextString = this.#colorContext(context);
        const hash = HSUtils.hashCode(`${level}${contextString}${msg}`);

        const last = this.#lastPending;
        if (last && last.hash === hash) {
            last.repeatCount += 1;
            return;
        }

        const record: LogRecord = {
            seq: this.#seq++,
            level,
            className,
            contextString,
            formattedMessage: HSUtils.parseColorTags(msg),
            timeString: HSUtils.getTime(),
            hash,
            repeatCount: 1,
            isDebug: logType === ELogType.DEBUG,
        };

        const list = record.isDebug ? this.#pendingDebug : this.#pendingNormal;
        list.push(record);
        this.#lastPending = record;
        if (list.length > this.#capFor(record.isDebug)) list.shift();

        this.#scheduleFlush();
    }

    // Lines are drawn in batches, at most every #flushDelayMs: each drawing lays out the whole log again,
    // and autosing's full log writes about one line per frame
    static #scheduleFlush() {
        if (this.#flushScheduled || !this.#shouldRenderToUi()) return;
        this.#flushScheduled = true;
        window.setTimeout(() => {
            this.#flushScheduled = false;
            this.flushPendingLogs(false);
        }, this.#flushDelayMs);
    }

    static #capFor(isDebug: boolean): number {
        return isDebug ? HSGlobal.HSLogger.debugLogSize : HSGlobal.HSLogger.logSize;
    }

    // Both pending lists, in the order the lines were logged
    static #mergedPending(): LogRecord[] {
        const a = this.#pendingNormal, b = this.#pendingDebug;
        if (b.length === 0) return a.slice();
        if (a.length === 0) return b.slice();

        const merged: LogRecord[] = [];
        let i = 0, j = 0;
        while (i < a.length && j < b.length) merged.push(a[i].seq < b[j].seq ? a[i++] : b[j++]);
        while (i < a.length) merged.push(a[i++]);
        while (j < b.length) merged.push(b[j++]);
        return merged;
    }

    static #buildLine(record: LogRecord): HTMLDivElement {
        const line = document.createElement('div');
        line.className = record.className ? `hs-ui-log-line ${record.className}` : 'hs-ui-log-line';
        line.dataset.hash = String(record.hash);
        line.innerHTML = `<span class="hs-log-ts">${record.timeString} </span><span class="hs-log-level">${record.level}</span>[<span class="hs-log-ctx">${record.contextString}</span>]: ${record.formattedMessage}<span class="hs-log-repeat"></span>\n`;
        if (record.repeatCount > 1) this.#setRepeatCount(line, record.repeatCount);
        return line;
    }

    static #setRepeatCount(line: HTMLDivElement, count: number) {
        line.dataset.count = String(count);
        const repeat = line.querySelector<HTMLSpanElement>(':scope > .hs-log-repeat');
        if (repeat) repeat.textContent = count > 1 ? ` (x${count})` : '';
    }

    // Removes the oldest lines of a kind over its cap
    static #trimLines() {
        const log = this.#logElement;

        while (this.#normalLineCount > HSGlobal.HSLogger.logSize) {
            const oldest = log.querySelector(':scope > .hs-ui-log-line:not(.hs-ui-log-line-debug)');
            if (!oldest) break;
            oldest.remove();
            this.#normalLineCount -= 1;
        }

        while (this.#debugLineCount > HSGlobal.HSLogger.debugLogSize) {
            const oldest = log.querySelector(':scope > .hs-ui-log-line-debug');
            if (!oldest) break;
            oldest.remove();
            this.#debugLineCount -= 1;
        }
    }


    // =======================================
    // ------ Render gating / scrolling ------
    // =======================================

    static #shouldRenderToUi(): boolean {
        return this.#integratedToUI && HSUI.isModPanelOpen() && HSUI.isLogTabActive();
    }

    // Scrolls the log element to the bottom only if user is already near the bottom
    static scrollToBottom(force = false) {
        if (this.#integratedToUI && this.#logElement) {
            if (force) {
                this.#logElement.scrollTop = this.#logElement.scrollHeight;
                return;
            }

            // Only auto-scroll if the user is within 50px of the bottom
            const isNearBottom = this.#logElement.scrollHeight - this.#logElement.scrollTop - this.#logElement.clientHeight < 50;
            if (isNearBottom) {
                this.#logElement.scrollTop = this.#logElement.scrollHeight;
            }
        }
    }


    // =======================================
    // ------ Log filtering / metadata -------
    // =======================================

    static #shouldLog(logType: ELogType, isImportant: boolean): boolean {
        const currentLogLevel = HSGlobal.HSLogger.logLevel;

        if (currentLogLevel === ELogLevel.NONE) return false;
        if (currentLogLevel === ELogLevel.ALL || isImportant) return true;

        return this.#getLogTypeAllowed(logType, currentLogLevel);
    }

    static #getLogTypeAllowed(logType: ELogType, currentLogLevel: ELogLevel): boolean {
        switch (logType) {
            case ELogType.LOG:
                return currentLogLevel === ELogLevel.LOG || currentLogLevel === ELogLevel.EXPLOG;
            case ELogType.WARN:
                return currentLogLevel === ELogLevel.WARN_AND_ERROR || currentLogLevel === ELogLevel.WARN;
            case ELogType.ERROR:
                return currentLogLevel === ELogLevel.WARN_AND_ERROR || currentLogLevel === ELogLevel.ERROR;
            case ELogType.INFO:
                return currentLogLevel === ELogLevel.INFO || currentLogLevel === ELogLevel.EXPLOG;
            case ELogType.DEBUG:
                return false;
            default:
                return false;
        }
    }

    // A module's context takes its moduleColor, another context the color listed for it in HSGlobal
    static #colorContext(context: string): string {
        const listed = HSGlobal.HSLogger.contextColors[context];
        const color = HSModuleRegistry.getModuleColor(context)
            ?? (listed ? HSModuleRegistry.getModuleColor(listed) : undefined)
            ?? listed;
        return color ? HSUtils.parseColorTags(context.colorTag(color)) : context;
    }

    // Every level label has the same width, blank included, so the contexts line up (on screen and in copied text)
    static #getLogLevelMeta(logType: ELogType): { level: string; className: string | null } {
        switch (logType) {
            case ELogType.WARN:
                return { level: 'WRN ', className: 'hs-ui-log-line-warn' };
            case ELogType.ERROR:
                return { level: 'ERR ', className: 'hs-ui-log-line-error' };
            case ELogType.DEBUG:
                return { level: 'DBG ', className: 'hs-ui-log-line-debug' };
            case ELogType.INFO:
                return { level: '    ', className: 'hs-ui-log-line-info' };
            default:
                return { level: '    ', className: null };
        }
    }


    // =======================================
    // ----------- History cleanup -----------
    // =======================================

    static #pruneOneShotHistory() {
        const threshold = Date.now() - this.#oneShotHistoryMaxAge;
        for (const [key, entry] of this.#oneShotLogHistory.entries()) {
            if (entry.timestamp < threshold) {
                this.#oneShotLogHistory.delete(key);
            }
        }
    }
}
