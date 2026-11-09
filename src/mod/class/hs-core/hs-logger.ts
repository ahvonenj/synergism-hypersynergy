import { HSUI } from "./hs-ui";
import { HSUtils } from "../hs-utils/hs-utils";
import { HSGlobal } from "./hs-global";
import { HSModuleManager } from "./module/hs-module-manager";
import { ELogType, ELogLevel } from "../../types/module-types/hs-logger-types";
import { HSSetting } from "./settings/hs-setting";
import { HSSettings } from "./settings/hs-settings";

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

    static #lastLogHash = -1;
    static #displayTimestamp: boolean = false;
    static #logLineCount = 0;
    static #pendingLogRecords: Array<{
        level: string;
        className: string | null;
        contextString: string;
        formattedMessage: string;
        timeString: string;
        hash: number;
        repeatCount: number;
    }> = [];
    static #pendingLogicalCount = 0;
    static #oneShotLogHistory: Map<string, { logged: boolean, timestamp: number, level: ELogType, count: number }> = new Map();
    static #oneShotHistoryMaxAge = 15 * 60 * 1000; // 15 minutes

    static #cachedDebugEnabled: boolean = false;
    static get isDebugEnabled(): boolean { return HSLogger.#cachedDebugEnabled; }


    // =======================================
    // --- Initialization / UI integration ---
    // =======================================

    // Integrates the logger to the mod's UI panel's Log tab
    static async integrateToUI(hsui: HSUI) {
        const logElement = await hsui.getLogElement();

        if (logElement) {
            this.#logElement = logElement;
            this.#integratedToUI = true;
            this.#logLineCount = this.#logElement.querySelectorAll('.hs-ui-log-line').length;

            this.log("HSLogger integrated to UI", "HSLogger");
            this.flushPendingLogs();
        }
    }

    static flushPendingLogs(): void {
        if (!this.#shouldRenderToUi() || this.#pendingLogRecords.length === 0) return;

        const pendingRecords = this.#pendingLogRecords.splice(0);
        this.#pendingLogicalCount = 0;
        const fragment = document.createDocumentFragment();

        for (const record of pendingRecords) {
            this.#renderLogLineToUi(
                record.level,
                record.className,
                record.contextString,
                record.formattedMessage,
                record.timeString,
                record.hash,
                record.repeatCount,
                false,
                fragment
            );
        }

        this.#logElement.appendChild(fragment);
        HSLogger.scrollToBottom(true);
    }

    /**
     * Every log line kept, oldest first, as plain text with its time: the Log tab's lines,
     * then the ones still waiting for that tab to be shown.
     */
    static getLogLines(): string[] {
        const lines: string[] = [];
        if (!this.#integratedToUI) return lines;

        for (const line of Array.from(this.#logElement.querySelectorAll('.hs-ui-log-line'))) {
            lines.push((line.textContent ?? '').trimEnd());
        }

        // Same text as #renderLogLineToUi gives them, without rendering them
        const plainText = document.createElement('div');
        for (const record of this.#pendingLogRecords) {
            plainText.innerHTML = `${record.timeString} ${record.level}[${record.contextString}]: ${record.formattedMessage}`;
            const repeat = record.repeatCount > 1 ? ` (x${record.repeatCount})` : '';
            lines.push(`${plainText.textContent ?? ''}${repeat}`);
        }

        return lines;
    }

    static updateDebugEnabled(): void {
        const debugLog = HSSettings.getSetting('showDebugLogs') as HSSetting<boolean>;
        HSLogger.#cachedDebugEnabled = !!(debugLog && debugLog.getValue());
        if (debugLog) {
            HSGlobal.HSLogger.logLevel = ELogLevel.ALL;
        }
    }


    // =======================================
    // --------- Public logging API ----------
    // =======================================

    static log(msg: string, context: string = "HSMain", isImportant: boolean = false) {
        if (!this.#shouldLog(ELogType.LOG, isImportant)) return;
        console.log(`[${context}]: ${HSUtils.removeColorTags(msg)}`);
        this.#logToUi(msg, context, ELogType.LOG);
    }

    static info(msg: string, context: string = "HSMain", isImportant: boolean = false) {
        if (!this.#shouldLog(ELogType.INFO, isImportant)) return;
        console.log(`[${context}]: ${HSUtils.removeColorTags(msg)}`);
        this.#logToUi(msg, context, ELogType.INFO);
    }

    static warn(msg: string, context: string = "HSMain", isImportant: boolean = false) {
        if (!this.#shouldLog(ELogType.WARN, isImportant)) return;
        console.warn(`[${context}]: ${HSUtils.removeColorTags(msg)}`);
        this.#logToUi(msg, context, ELogType.WARN);
    }

    static error(msg: string, context: string = "HSMain", isImportant: boolean = false) {
        if (!this.#shouldLog(ELogType.ERROR, isImportant)) return;
        console.error(`[${context}]: ${HSUtils.removeColorTags(msg)}`);
        this.#logToUi(msg, context, ELogType.ERROR);
    }

    static debug(msg: () => string, context: string = "HSMain", isImportant: boolean = false) {
        if (!HSLogger.#cachedDebugEnabled) return;
        const resolved = msg();
        console.log(`DBG [${context}]: ${HSUtils.removeColorTags(resolved)}`);
        this.#logToUi(resolved, context, ELogType.DEBUG);
    }

    static clear() {
        if (this.#integratedToUI) {
            this.#logElement.innerHTML = '';
            this.#logLineCount = 0;
            this.#lastLogHash = -1;
            this.#pendingLogRecords = [];
            this.#pendingLogicalCount = 0;
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
    // ------- Buffer/render pipeline --------
    // =======================================

    static #logToUi(msg: string, context: string = "HSMain", logType: ELogType = ELogType.LOG) {
        if (!this.#integratedToUI) return;

        const { level, className } = this.#getLogLevelMeta(logType);
        const contextString = this.#colorContext(context);
        const formattedMessage = HSUtils.parseColorTags(msg);
        const timeString = HSUtils.getTime();
        const logHash = HSUtils.hashCode(`${level}${contextString}${msg}`);

        if (this.#shouldRenderToUi()) {
            this.#renderLogLineToUi(level, className, contextString, formattedMessage, timeString, logHash);
        } else {
            this.#bufferPendingLog(level, className, contextString, formattedMessage, timeString, logHash);
        }
    }

    static #bufferPendingLog(
        level: string,
        className: string | null,
        contextString: string,
        formattedMessage: string,
        timeString: string,
        logHash: number
    ): void {
        const lastRecord = this.#pendingLogRecords[this.#pendingLogRecords.length - 1];

        if (lastRecord?.hash === logHash) {
            lastRecord.repeatCount += 1;
        } else {
            this.#pendingLogRecords.push({
                level,
                className,
                contextString,
                formattedMessage,
                timeString,
                hash: logHash,
                repeatCount: 1
            });
        }

        this.#pendingLogicalCount += 1;
        this.#trimPendingBuffer();
        this.#lastLogHash = logHash;
    }

    static #trimPendingBuffer(): void {
        const maxPending = HSGlobal.HSLogger.logSize;

        while (this.#pendingLogicalCount > maxPending && this.#pendingLogRecords.length > 0) {
            const oldestRecord = this.#pendingLogRecords[0];
            const excess = this.#pendingLogicalCount - maxPending;

            if (oldestRecord.repeatCount > excess) {
                oldestRecord.repeatCount -= excess;
                this.#pendingLogicalCount -= excess;
                break;
            }

            this.#pendingLogicalCount -= oldestRecord.repeatCount;
            this.#pendingLogRecords.shift();
        }
    }

    static #renderLogLineToUi(
        level: string,
        className: string | null,
        contextString: string,
        formattedMessage: string,
        timeString: string,
        logHash: number,
        repeatCount = 1,
        shouldScroll = true,
        parentElement: HTMLElement | DocumentFragment = this.#logElement
    ) {
        if (!this.#integratedToUI) return;

        const logLine = document.createElement('div');
        logLine.classList.add('hs-ui-log-line');

        if (className) {
            logLine.classList.add(className);
        }

        const hiddenTS = this.#displayTimestamp ? "" : "hs-log-ts-hidden";
        logLine.innerHTML = `<span class="hs-log-ts ${hiddenTS}">${timeString} </span><span class="hs-log-level">${level}</span>[<span class="hs-log-ctx">${contextString}</span>]: ${formattedMessage}\n`;

        if (this.#lastLogHash !== logHash) {
            parentElement.appendChild(logLine);
            this.#logLineCount += 1;
            if (repeatCount > 1) {
                logLine.innerHTML += ` (x${repeatCount})`;
            }
        } else {
            const lastLogLine = parentElement.lastElementChild as HTMLDivElement | null;
            if (lastLogLine) {
                this.#applyRepeatCountToLastLine(lastLogLine, repeatCount);
            }
        }

        if (this.#logLineCount > HSGlobal.HSLogger.logSize) {
            const oldestLog = this.#logElement.firstElementChild as HTMLDivElement | null;
            if (oldestLog) {
                oldestLog.remove();
                this.#logLineCount -= 1;
            }
        }

        if (shouldScroll) {
            HSLogger.scrollToBottom();
        }

        this.#lastLogHash = logHash;
    }

    static #applyRepeatCountToLastLine(lastLogLine: HTMLDivElement, repeatCount: number): void {
        if (repeatCount <= 0) return;

        try {
            const match = lastLogLine.innerHTML.match(/\(x(\d+)\)/);

            if (match) {
                const full = match[0];
                const n = parseInt(match[1], 10);
                lastLogLine.innerHTML = lastLogLine.innerHTML.replace(full, `(x${n + repeatCount})`);
            } else {
                lastLogLine.innerHTML += ` (x${repeatCount + 1})`;
            }
        } catch (e) {
            console.log(e);
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
        const module = HSModuleManager.getModule(context) ?? (listed ? HSModuleManager.getModule(listed) : undefined);
        const color = module?.moduleColor ?? listed;
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


    // =======================================
    // ------------ Misc helpers -------------
    // =======================================

    // This gets called when the display timestamp setting is changed
    // It will add or remove the hs-log-ts-hidden class to all log lines
    static setTimestampDisplay(display: boolean) {
        if (display) {
            this.#displayTimestamp = true;
        } else {
            this.#displayTimestamp = false;
        }

        const logLines = this.#logElement.querySelectorAll('.hs-ui-log-line') as NodeListOf<HTMLDivElement>;

        if (logLines) {
            for (const logLine of Array.from(logLines)) {
                const tsSpan = logLine.querySelector('.hs-log-ts') as HTMLSpanElement;

                if (tsSpan) {
                    if (display) {
                        tsSpan.classList.remove('hs-log-ts-hidden');
                    } else {
                        tsSpan.classList.add('hs-log-ts-hidden');
                    }
                }
            }
        }
    }
}
