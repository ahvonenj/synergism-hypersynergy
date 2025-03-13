import { HSModuleDefinition } from "../types/hs-types";
import { HSCodes } from "./hs-codes";
import { HSHepteracts } from "./hs-hepteracts";
import { HSLogger } from "./hs-logger";
import { HSModule } from "./hs-module";
import { HSModuleManager } from "./hs-module-manager";
import { HSPotions } from "./hs-potions";

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
		});
	}
}