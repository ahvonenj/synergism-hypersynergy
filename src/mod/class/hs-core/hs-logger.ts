import { ELogLevel, ELogType } from "../../types/hs-types";
import { HSUI } from "./hs-ui";
import { HSUtils } from "../hs-utils/hs-utils";

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
    
    static logLevel : ELogLevel = ELogLevel.ALL;
    static #lastLogHash = -1;
    static #logSize = 100;
    static #displayTimestamp : boolean = false;

    // Integrates the logger to the mod's UI panel's Log tab
    static integrateToUI(hsui: HSUI) {
        const logElement = hsui.getLogElement();

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

                default:
                    level = "";
                break;
            }

            const hiddenTS = this.#displayTimestamp ? "" : "hs-log-ts-hidden";

            logLine.innerHTML = `${level} [<span class="hs-log-ctx">${context}</span><span class="hs-log-ts ${hiddenTS}"> (${HSUtils.getTime()})</span>]: ${msg}\n`;

            // We hash the current logged thing to uniquely identify it
            // and compare it to the hash of what was last logged.
            // If they are the same, instead of logging the same thing,
            // we add (x2), (x3), ... etc. to the previous log line
            const logHash = HSUtils.hashCode(`${level}${context}${msg}`);
            
            if(this.#lastLogHash !== logHash) {
                this.#logElement.appendChild(logLine);
                this.#logElement.scrollTop = this.#logElement.scrollHeight;
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

            if(logLines && logLines.length > this.#logSize) {
                const oldestLog = this.#logElement.querySelector('.hs-ui-log-line:first-child') as HTMLDivElement;

                if(oldestLog) {
                    oldestLog.parentElement?.removeChild(oldestLog);
                }
            }

            this.#lastLogHash = logHash;
        }
    }

    static #shouldLog(logType: ELogType, isImportant : boolean) : boolean {
        if(this.logLevel === ELogLevel.ALL || isImportant) return true;
        if(this.logLevel === ELogLevel.NONE) return false;

        switch(logType) {
            case ELogType.LOG:
                return (this.logLevel === ELogLevel.LOG || this.logLevel === ELogLevel.EXPLOG);
            case ELogType.WARN:
                return (this.logLevel === ELogLevel.WARN_AND_ERROR || this.logLevel === ELogLevel.WARN);
            case ELogType.ERROR:
                return (this.logLevel === ELogLevel.WARN_AND_ERROR || this.logLevel === ELogLevel.ERROR);
            case ELogType.INFO:
                return (this.logLevel === ELogLevel.INFO || this.logLevel === ELogLevel.EXPLOG);
        }
    }
    
    static log(msg: string, context: string = "HSMain", isImportant: boolean = false) {
        if(!this.#shouldLog(ELogType.LOG, isImportant)) return;
        console.log(`[${context}]: ${msg}`);
        this.#logToUi(msg, context, ELogType.LOG);
    }

    static info(msg: string, context: string = "HSMain", isImportant: boolean = false) {
        if(!this.#shouldLog(ELogType.INFO, isImportant)) return;
        console.log(`[${context}]: ${msg}`);
        this.#logToUi(msg, context, ELogType.INFO);
    }

    static warn(msg: string, context: string = "HSMain", isImportant: boolean = false) {
        if(!this.#shouldLog(ELogType.WARN, isImportant)) return;
        console.warn(`[${context}]: ${msg}`);
        this.#logToUi(msg, context, ELogType.WARN);
    }

    static error(msg: string, context: string = "HSMain", isImportant: boolean = false) {
        if(!this.#shouldLog(ELogType.ERROR, isImportant)) return;
        console.error(`[${context}]: ${msg}`);
        this.#logToUi(msg, context, ELogType.ERROR);
    }

    static clear() {
        if(this.#integratedToUI) {
            this.#logElement.innerHTML = '';
            HSLogger.log(`Log cleared`, this.#staticContext);
        }
    }

    static setTimestampDisplay(display: boolean) {
        HSLogger.log(`Log timestamps set to ${display}`, this.#staticContext);
        
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
