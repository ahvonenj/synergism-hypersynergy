import { HSLogger } from "./hs-logger";
import { HSModule } from "./hs-module";

// Explicit imports required because I don't know better...
import { HSPotions } from "../hs-modules/hs-potions"; 
import { HSCodes } from "../hs-modules/hs-codes";
import { HSHepteracts } from "../hs-modules/hs-hepteracts";
import { HSTalismans } from "../hs-modules/hs-talismans";
import { HSUI } from "./hs-ui";

export class HSModuleManager {
	#context = "HSModuleManager";
	#modules : HSModule[] = [];

	// This record is needed so that the modules can be instatiated properly and so that everything works nicely with TypeScript
	#moduleClasses: Record<string, new (name: string, context: string) => HSModule> = {
        "HSUI": HSUI,
        "HSPotions": HSPotions,
        "HSCodes": HSCodes, 
        "HSHepteracts": HSHepteracts,
        "HSTalismans": HSTalismans
    };

	constructor(context: string) {
		this.#context = context;
	}

	// Adds module to the manager and instantiates the module's class
	async addModule(className: string, context: string, moduleName?: string) {
		try {
			const ModuleClass = this.#moduleClasses[className];

			if (!ModuleClass) {
				throw new Error(`Class "${className}" not found in module`);
			}

			const module = new ModuleClass(moduleName || context, context);
			this.#modules.push(module);
		} catch (error) {
			HSLogger.warn(`Failed to add module ${className}:`, this.#context);
			console.log(error)
			return null;
		}
	}

	// Returns a list of all of the enabled modules
	getModules(): HSModule[] {
		return this.#modules;
	}

	// Returns a module by name
	// The reason why this looks so complicated is because we need to do some TypeScript shenanigans to properly return the found mod with the correct type
	// Used like: const hsui = this.#moduleManager.getModule<HSUI>('HSUI');
	// the e.g. <HSUI> part tells the getModule method which module (type) we're expecting it to return
	getModule<T extends HSModule = HSModule>(moduleName: string): T | undefined {
		return this.#modules.find((mod) => {
			return mod.getName() === moduleName;
		}) as T | undefined;
	}
}