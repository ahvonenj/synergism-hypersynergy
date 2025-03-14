import { HSLogger } from "./hs-logger";
import { HSModule } from "./hs-module";

// Explicit imports required because I don't know better...
import { HSPotions } from "./hs-potions"; 
import { HSCodes } from "./hs-codes";
import { HSHepteracts } from "./hs-hepteracts";
import { HSTalismans } from "./hs-talismans";
import { HSUI } from "./hs-ui";

export class HSModuleManager {
	#context;
	#modules : HSModule[] = [];

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

	getModules(): HSModule[] {
		return this.#modules;
	}

	getModule<T extends HSModule = HSModule>(moduleName: string): T | undefined {
		return this.#modules.find((mod) => {
			return mod.getName() === moduleName;
		}) as T | undefined;
	}
}