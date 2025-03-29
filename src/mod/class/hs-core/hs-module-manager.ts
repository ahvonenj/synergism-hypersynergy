import { HSLogger } from "./hs-logger";
import { HSModule } from "./hs-module";

// Explicit imports required because I don't know better...
import { HSPotions } from "../hs-modules/hs-potions"; 
import { HSCodes } from "../hs-modules/hs-codes";
import { HSHepteracts } from "../hs-modules/hs-hepteracts";
import { HSTalismans } from "../hs-modules/hs-talismans";
import { HSUI } from "./hs-ui";
import { HSSettings } from "./hs-settings";
import { HSModuleDefinition } from "../../types/hs-types";
import { HSPrototypes } from "./hs-prototypes";

/*
    Class: HSModuleManager
    IsExplicitHSModule: No
    Description: 
        Hypersynergism module manager.
        Handles enabling and initialization of Hypersynergism's modules
    Author: Swiffy
*/
export class HSModuleManager {
    #context = "HSModuleManager";
    #modules : HSModuleDefinition[] = [];
    #enabledModules : HSModule[] = [];

    // This record is needed so that the modules can be instatiated properly and so that everything works nicely with TypeScript
    #moduleClasses: Record<string, new (name: string, context: string) => HSModule> = {
        "HSUI": HSUI,
        "HSPotions": HSPotions,
        "HSCodes": HSCodes, 
        "HSHepteracts": HSHepteracts,
        "HSTalismans": HSTalismans,
        "HSSettings": HSSettings,
        "HSPrototypes": HSPrototypes,
    };

    constructor(context: string, modulesToEnable : HSModuleDefinition[]) {
        this.#context = context;
        this.#modules = modulesToEnable;

        HSLogger.log("Enabling Hypersynergism modules", this.#context);

        // Sort by load order, pushing modules without load order to the bottom
        this.#modules.sort((a, b) => {
            if (a.loadOrder === undefined) return 1;
            if (b.loadOrder === undefined) return -1;
            return a.loadOrder - b.loadOrder;
        });

        this.#modules.forEach(def => {
            this.addModule(def.className, def.context || def.className, def.moduleName || def.className);
        });
    }

    // Adds module to the manager and instantiates the module's class (looks very unorthodox, but really isn't, I promise)
    async addModule(className: string, context: string, moduleName?: string) {
        try {
            const ModuleClass = this.#moduleClasses[className];

            if (!ModuleClass) {
                throw new Error(`Class "${className}" not found in module`);
            }

            const module = new ModuleClass(moduleName || context, context);
            this.#enabledModules.push(module);
        } catch (error) {
            HSLogger.warn(`Failed to add module ${className}:`, this.#context);
            console.log(error);
            return null;
        }
    }

    async initModules() {
        // Go through the modules added to module manager and initialize all of them
        this.#enabledModules.forEach(async (mod) => {
            // Call each mod's init method
            await mod.init();

            // We want / try to init HSUI module as early as possible so that we can integrate HSLogger to it
            // This is so that HSLogger starts to write log inside the Log tab in the mod's panel instead of just the devtools console
            if(mod.getName() === "HSUI") {
                const hsui = this.getModule<HSUI>('HSUI');

                if(hsui) {
                    HSLogger.integrateToUI(hsui);
                }
            }
        });
    }

    // Returns a list of all of the enabled modules
    getModules(): HSModule[] {
        return this.#enabledModules;
    }

    // Returns a module by name
    // The reason why this looks so complicated is because we need to do some TypeScript shenanigans to properly return the found mod with the correct type
    // Used like: const hsui = this.#moduleManager.getModule<HSUI>('HSUI');
    // the e.g. <HSUI> part tells the getModule method which module (type) we're expecting it to return
    getModule<T extends HSModule = HSModule>(moduleName: string): T | undefined {
        return this.#enabledModules.find((mod) => {
            return mod.getName() === moduleName;
        }) as T | undefined;
    }
}
