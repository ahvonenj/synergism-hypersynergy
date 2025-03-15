import { ELogType } from "../../types/hs-types";
import { HSUI } from "./hs-ui";
import { HSUtils } from "../hs-utils/hs-utils";

export class HSLogger {

	static #integratedToUI = false;
	static #logElement : HTMLTextAreaElement;

	static integrateToUI(hsui: HSUI) {
		const logElement = hsui.getLogElement();

		if(logElement) {
			this.#logElement = logElement;
			this.#integratedToUI = true;

			this.log("HSLogger integrated to UI", "HSLogger");
		}
	}

	static #logToUi(msg: string, context: string = "HSMain", logType: ELogType = ELogType.LOG) {
		if(this.#integratedToUI) {
			let level = "";

			switch(logType) {
				case ELogType.LOG:
					level = "";
					break;

				case ELogType.WARN:
					level = "WARN ";
				break;

				case ELogType.ERROR:
					level = "ERROR ";
				break;

				default:
					level = "";
				break;
			}

			this.#logElement.value += `${level}[${context}]: ${msg}\n`;
			this.#logElement.scrollTop = this.#logElement.scrollHeight;
		}
	}
	
	static log(msg: string, context: string = "HSMain") {
		console.log(`[${context}]: ${msg}`);
		this.#logToUi(msg, context, ELogType.LOG);
	}

	static warn(msg: string, context: string = "HSMain") {
		console.warn(`[${context}]: ${msg}`);
		this.#logToUi(msg, context, ELogType.WARN);
	}

	static error(msg: string, context: string = "HSMain") {
		console.error(`[${context}]: ${msg}`);
		this.#logToUi(msg, context, ELogType.ERROR);
	}
}