import { HSModuleDefinition } from "../types/hs-types";
import { HSLogger } from "./hs-core/hs-logger";
import { HSModuleManager } from "./hs-core/hs-module-manager";
import { HSUI } from "./hs-core/hs-ui";

export class Hypersynergism {
	#context = 'HSMain';

	#enabledModuleList : HSModuleDefinition[];
	#moduleManager;

	constructor(enabledModules : HSModuleDefinition[]) {
		this.#enabledModuleList = enabledModules;
		this.#moduleManager = new HSModuleManager('HSModuleManager');

		HSLogger.log("Enabling Hypersynergism modules", this.#context);

		this.#enabledModuleList.forEach(def => {
			this.#moduleManager.addModule(def.className, def.context || def.className, def.moduleName || def.className);
		});
	}

	async init() {
		HSLogger.log("Initialising Hypersynergism modules", this.#context);

		this.#moduleManager.getModules().forEach(async (mod) => {
			await mod.init();

			if(mod.getName() === "HSUI") {
				const hsui = this.#moduleManager.getModule<HSUI>('HSUI');

				if(hsui) {
					HSLogger.integrateToUI(hsui);
				}
			}
		});

		
	}
}