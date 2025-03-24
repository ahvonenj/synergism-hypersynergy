import { ELogLevel, ELogType } from "../../types/hs-types";
import { HSUI } from "./hs-ui";
import { HSUtils } from "../hs-utils/hs-utils";

export class HSLogger {

    static #integratedToUI = false;
    static #logElement : HTMLTextAreaElement;
    static logLevel : ELogLevel = ELogLevel.ALL;

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

            logLine.innerHTML = `${level}[${context}]: ${msg}\n`;
            
            this.#logElement.appendChild(logLine);
            this.#logElement.scrollTop = this.#logElement.scrollHeight;
        }
    }

    static #shouldLog(logType: ELogType, isImportant : boolean) : boolean {
        if(this.logLevel === ELogLevel.ALL || isImportant) return true;
        if(this.logLevel === ELogLevel.NONE) return false;

        switch(logType) {
            case ELogType.LOG:
                return (this.logLevel === ELogLevel.INFO);
            case ELogType.WARN:
                return (this.logLevel === ELogLevel.WARN_AND_ERROR);
            case ELogType.ERROR:
                return (this.logLevel === ELogLevel.WARN_AND_ERROR || this.logLevel === ELogLevel.ERROR);
        }
    }
    
    static log(msg: string, context: string = "HSMain", isImportant: boolean = false) {
        if(!this.#shouldLog(ELogType.LOG, isImportant)) return;
        console.log(`[${context}]: ${msg}`);
        this.#logToUi(msg, context, ELogType.LOG);
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
}
