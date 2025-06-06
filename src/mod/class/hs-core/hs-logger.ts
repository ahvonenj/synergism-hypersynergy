import { HSUI } from "./hs-ui";
import { HSUtils } from "../hs-utils/hs-utils";
import { HSGlobal } from "./hs-global";
import { HSModuleManager } from "./module/hs-module-manager";
import { ELogType, ELogLevel } from "../../types/module-types/hs-logger-types";
import { HSSetting } from "./settings/hs-setting";
import { HSSettings } from "./settings/hs-settings";
import { ShowDebugLogsSetting } from "../../types/module-types/hs-settings-types";

/*
    Class: HSLogger
    IsExplicitHSModule: No
    Description: 
        Logging module for Hypersynergism. 
        Contains methods to log things in both the devtools console and the mod's panel's log
    Author: Swiffy
*/
export class HSLogger {

    static #staticContext = 'HSLogger';
    static #integratedToUI = false;
    static #logElement : HTMLTextAreaElement;
    
    static #lastLogHash = -1;
    static #displayTimestamp : boolean = false;

    static #oneShotLogHistory : Map<string, { logged: boolean, timestamp: number, level: ELogType, count: number }> = new Map();
    static #oneShotLogHistoryIvl?: number;

    // Integrates the logger to the mod's UI panel's Log tab
    static async integrateToUI(hsui: HSUI) {
        const logElement = await hsui.getLogElement();

        if(logElement) {
            this.#logElement = logElement;
            this.#integratedToUI = true;

            this.log("HSLogger integrated to UI", "HSLogger");
        }
    }

    // If the logger is integrated to the UI, we can use this method to log everything to the textarea in the Log tab in the mod's panel
    static #logToUi(msg: string, context: string = "HSMain", logType: ELogType = ELogType.LOG) {
        if(this.#integratedToUI) {
            const logLine = document.createElement('div');
            logLine.classList.add('hs-ui-log-line');

            let level = "";

            switch(logType) {
                case ELogType.LOG:
                    level = "";
                break;
                
                case ELogType.INFO:
                    logLine.classList.add('hs-ui-log-line-info');
                    level = "";
                break;

                case ELogType.WARN:
                    level = "WARN ";
                    logLine.classList.add('hs-ui-log-line-warn');
                break;

                case ELogType.ERROR:
                    level = "ERROR ";
                    logLine.classList.add('hs-ui-log-line-error');
                break;

                case ELogType.DEBUG:
                    level = "DBG ";
                    logLine.classList.add('hs-ui-log-line-debug');
                break;

                default:
                    level = "";
                break;
            }

            // We add hs-log-ts-hidden to the timestamp span if the setting to show log timestamps is enabled
            const hiddenTS = this.#displayTimestamp ? "" : "hs-log-ts-hidden";
            const moduleFromContext = HSModuleManager.getModule(context);

            // Just makes the [ModuleName] part of the log line colored
            const contextString = (moduleFromContext && moduleFromContext.moduleColor) ? HSUtils.parseColorTags(context.colorTag(moduleFromContext.moduleColor)) : context;

            logLine.innerHTML = `${level} [<span class="hs-log-ctx">${contextString}</span><span class="hs-log-ts ${hiddenTS}"> (${HSUtils.getTime()})</span>]: ${HSUtils.parseColorTags(msg)}\n`;

            // We hash the current logged thing to uniquely identify it
            // and compare it to the hash of what was last logged.
            // If they are the same, instead of logging the same thing,
            // we add (x2), (x3), ... etc. to the previous log line
            const logHash = HSUtils.hashCode(`${level}${context}${msg}`);
            
            if(this.#lastLogHash !== logHash) {
                this.#logElement.appendChild(logLine);
            } else {
                const lastLogLine = this.#logElement.querySelector('div:last-child') as HTMLDivElement;

                if(lastLogLine) {
                    try {
                        const match = lastLogLine.innerHTML.match(/\(x(\d+)\)/);

                        if(match) {
                            const full = match[0];
                            const n = parseInt(match[1], 10);
                            lastLogLine.innerHTML = lastLogLine.innerHTML.replace(full, `(x${n + 1})`);
                        } else {
                            lastLogLine.innerHTML += ` (x2)`;
                        }
                    } catch (e) {
                        console.log(e);
                    }
                }
            }

            // Remove oldest log lines if line count exceeds logSize
            const logLines = this.#logElement.querySelectorAll('.hs-ui-log-line');

            if(logLines && logLines.length > HSGlobal.HSLogger.logSize) {
                const oldestLog = this.#logElement.querySelector('.hs-ui-log-line:first-child') as HTMLDivElement;

                if(oldestLog) {
                    oldestLog.parentElement?.removeChild(oldestLog);
                }
            }

            HSLogger.scrollToBottom();
            this.#lastLogHash = logHash;
        }
    }

    // This methods is called every time a log is made
    // It checks the current log level and if the log type is allowed to be logged
    static #shouldLog(logType: ELogType, isImportant : boolean) : boolean {
        const currentLogLevel = HSGlobal.HSLogger.logLevel;

        if(currentLogLevel === ELogLevel.ALL || isImportant) return true;
        if(currentLogLevel === ELogLevel.NONE) return false;

        switch(logType) {
            case ELogType.LOG:
                return (currentLogLevel === ELogLevel.LOG || currentLogLevel === ELogLevel.EXPLOG);
            case ELogType.WARN:
                return (currentLogLevel === ELogLevel.WARN_AND_ERROR || currentLogLevel === ELogLevel.WARN);
            case ELogType.ERROR:
                return (currentLogLevel === ELogLevel.WARN_AND_ERROR || currentLogLevel === ELogLevel.ERROR);
            case ELogType.INFO:
                return (currentLogLevel === ELogLevel.INFO || currentLogLevel === ELogLevel.EXPLOG); 
            case ELogType.DEBUG:
                return false;
        }
    }

    // Scrolls the log element to the bottom
    static scrollToBottom() {
        if(this.#integratedToUI && this.#logElement) {
            this.#logElement.scrollTop = this.#logElement.scrollHeight;
        }
    }
    
    static log(msg: string, context: string = "HSMain", isImportant: boolean = false) {
        if(!this.#shouldLog(ELogType.LOG, isImportant)) return;
        console.log(`[${context}]: ${HSUtils.removeColorTags(msg)}`);
        this.#logToUi(msg, context, ELogType.LOG);
    }

    static info(msg: string, context: string = "HSMain", isImportant: boolean = false) {
        if(!this.#shouldLog(ELogType.INFO, isImportant)) return;
        console.log(`[${context}]: ${HSUtils.removeColorTags(msg)}`);
        this.#logToUi(msg, context, ELogType.INFO);
    }

    static warn(msg: string, context: string = "HSMain", isImportant: boolean = false) {
        if(!this.#shouldLog(ELogType.WARN, isImportant)) return;
        console.warn(`[${context}]: ${HSUtils.removeColorTags(msg)}`);
        this.#logToUi(msg, context, ELogType.WARN);
    }

    static error(msg: string, context: string = "HSMain", isImportant: boolean = false) {
        if(!this.#shouldLog(ELogType.ERROR, isImportant)) return;
        console.error(`[${context}]: ${HSUtils.removeColorTags(msg)}`);
        this.#logToUi(msg, context, ELogType.ERROR);
    }

    static debug(msg: string, context: string = "HSMain", isImportant: boolean = false) {
        const debugLog = HSSettings.getSetting('showDebugLogs') as HSSetting<boolean>;

        if(debugLog && debugLog.getValue()) {
            console.log(`DBG [${context}]: ${HSUtils.removeColorTags(msg)}`);
            this.#logToUi(msg, context, ELogType.DEBUG);
        }
    }

    static clear() {
        if(this.#integratedToUI) {
            this.#logElement.innerHTML = '';
            HSLogger.log(`Log cleared`, this.#staticContext);
        }
    }

    static logOnce(msg: string, logId: string) {
        if(!this.#oneShotLogHistory.has(logId) || !this.#oneShotLogHistory.get(logId)?.logged) {
            this.#oneShotLogHistory.set(logId, { logged: true, timestamp: Date.now(), level: ELogType.LOG, count: 0 });
            this.log(msg, "Once", true);
        } else {
            this.#oneShotLogHistory.get(logId)!.count++;
        }

        this.#maybeStartOneShotIvl();
    }

    static warnOnce(msg: string, logId: string) {
        if(!this.#oneShotLogHistory.has(logId) || !this.#oneShotLogHistory.get(logId)?.logged) {
            this.#oneShotLogHistory.set(logId, { logged: true, timestamp: Date.now(), level: ELogType.WARN, count: 0 });
            this.warn(msg, "Once", true);
        } else {
            this.#oneShotLogHistory.get(logId)!.count++;
        }

        this.#maybeStartOneShotIvl();
    }

    static errorOnce(msg: string, logId: string) {
        if(!this.#oneShotLogHistory.has(logId) || !this.#oneShotLogHistory.get(logId)?.logged) {
            this.#oneShotLogHistory.set(logId, { logged: true, timestamp: Date.now(), level: ELogType.ERROR, count: 0 });
            this.error(msg, "Once", true);
        } else {
            this.#oneShotLogHistory.get(logId)!.count++;
        }

        this.#maybeStartOneShotIvl();
    }

    static #maybeStartOneShotIvl() {
        /*if(!this.#oneShotLogHistoryIvl) {
            this.#oneShotLogHistoryIvl = setInterval(() => {
                this.#oneShotLogHistory.forEach((value, key) => {
                    if(value.logged) {
                        if(Date.now() - value.timestamp > 10 * 60 * 1000) {
                            this.#oneShotLogHistory.delete(key);
                        }
                    }
                });
            }, 5 * 60 * 1000);
        }*/
    }


    // This gets called when the display timestamp setting is changed
    // It will add or remove the hs-log-ts-hidden class to all log lines
    static setTimestampDisplay(display: boolean) {
        if(display) {
            this.#displayTimestamp = true;
        } else {
            this.#displayTimestamp = false;
        }

        const logLines = this.#logElement.querySelectorAll('.hs-ui-log-line') as NodeListOf<HTMLDivElement>;

        if(logLines) {
            for (const logLine of Array.from(logLines)) {
                const tsSpan = logLine.querySelector('.hs-log-ts') as HTMLSpanElement;

                if(tsSpan) {
                    if(display) {
                        tsSpan.classList.remove('hs-log-ts-hidden');
                    } else {
                        tsSpan.classList.add('hs-log-ts-hidden');
                    }
                }
            }
        }
    }
}
