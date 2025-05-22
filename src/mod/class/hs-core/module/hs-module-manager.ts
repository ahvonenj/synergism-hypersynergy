import { HSLogger } from "../hs-logger";
import { HSExternalModule, HSModule } from "./hs-module";

// Explicit imports required because I don't know better...
import { HSPotions } from "../../hs-modules/hs-potions"; 
import { HSCodes } from "../../hs-modules/hs-codes";
import { HSHepteracts } from "../../hs-modules/hs-hepteracts";
import { HSTalismans } from "../../hs-modules/hs-talismans";
import { HSUI } from "../hs-ui";
import { HSSettings } from "../settings/hs-settings";
import { HSExternalModuleOptions, HSModuleDefinition, HSModuleOptions, HSModuleType } from "../../../types/hs-types";
import { HSPrototypes } from "../hs-prototypes";
import { HSMouse } from "../hs-mouse";
import { HSShadowDOM } from "../hs-shadowdom";
import { HSStorage } from "../hs-storage";
import { HSAmbrosia } from "../../hs-modules/hs-ambrosia";
import { HSStats } from "../../hs-modules/hs-stats";
import { HSGameState } from "../hs-gamestate";
import { HSPatches } from "../../hs-modules/hs-patches";
import { HSGameData } from "../gds/hs-gamedata";
import { HSGameDataAPI } from "../gds/hs-gamedata-api";
import { HSWebSocket } from "../hs-websocket";
import { HSDebug } from "../hs-debug";

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
    static #enabledModules : Map<string, HSModule | HSExternalModule> = new Map<string, HSModule | HSExternalModule>();

    // This record is needed so that the modules can be instatiated properly and so that everything works nicely with TypeScript
    #moduleClasses: Record<string, new (moduleOptions : HSModuleOptions) => HSModule> = {
        "HSUI": HSUI,
        "HSPotions": HSPotions,
        "HSCodes": HSCodes, 
        "HSHepteracts": HSHepteracts,
        "HSTalismans": HSTalismans,
        "HSSettings": HSSettings,
        "HSPrototypes": HSPrototypes,
        "HSMouse": HSMouse,
        "HSShadowDOM": HSShadowDOM,
        "HSStorage": HSStorage,
        "HSAmbrosia": HSAmbrosia,
        "HSStats": HSStats,
        "HSGameState": HSGameState,
        "HSPatches": HSPatches,
        "HSGameData": HSGameData,
        "HSGameDataAPI": HSGameDataAPI,
        "HSWebSocket": HSWebSocket,
        "HSDebug": HSDebug
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
    }

    async preprocessModules() {
        const seenModules: string[] = [];

        for(const def of this.#modules) {
            if(seenModules.includes(def.className)) {
                HSLogger.warn(`Module "${def.className}" is already enabled - there is probably a duplicate module in enabledModules (index.ts)!`, this.#context);
                return;
            }

            const module =  this.addModule(def);

            if(def.initImmediate !== undefined && def.initImmediate === true) {
                if(module) {
                    await module.init();

                    // We want / try to init HSUI module as early as possible so that we can integrate HSLogger to it
                    // This is so that HSLogger starts to write log inside the Log tab in the mod's panel instead of just the devtools console
                    if(def.className === 'HSUI') {
                        const hsui = module as HSUI;
                        await HSLogger.integrateToUI(hsui);
                    }
                }
            }

            seenModules.push(def.className);
        }
    }

    // Adds module to the manager and instantiates the module's class (looks very unorthodox, but really isn't, I promise)
    addModule(moduleDefinition: HSModuleDefinition) {
        if(moduleDefinition.moduleType === HSModuleType.EXTMODULE) {
            try {
                const modName = moduleDefinition.moduleName || moduleDefinition.context;

                if (!moduleDefinition.moduleKind) {
                    throw new Error(`Failed to add module ${modName} because moduleKind is not defined`);
                }

                if (!moduleDefinition.scriptContext) {
                    throw new Error(`Failed to add module ${modName} because scriptContext is not defined`);
                }

                const module = new HSExternalModule({
                    moduleName: modName,
                    context: moduleDefinition.context,
                    moduleColor: moduleDefinition.moduleColor,
                    moduleKind: moduleDefinition.moduleKind,
                    moduleCSSUrl: moduleDefinition.moduleCSSUrl,
                    moduleScriptUrl: moduleDefinition.moduleScriptUrl,
                    scriptContext: moduleDefinition.scriptContext
                });

                HSModuleManager.#enabledModules.set(moduleDefinition.className, module);

                // Checking that the colorTag prototype method exists just to be safe (it's defined by the HSPrototypes module)
                if(moduleDefinition.moduleColor && typeof String.prototype.colorTag === 'function')
                    HSLogger.log(`Enabled EXTERNAL module '${modName.colorTag(moduleDefinition.moduleColor)}'`, this.#context);
                else
                    HSLogger.log(`Enabled EXTERNAL module '${modName}'`, this.#context);

                return HSModuleManager.#enabledModules.get(moduleDefinition.className);
            } catch (error) {
                HSLogger.warn(`Failed to add module ${moduleDefinition.className}:`, this.#context);
                console.log(error);
                return undefined;
            }
        } else {
            try {
                const ModuleClass = this.#moduleClasses[moduleDefinition.className];

                if (!ModuleClass) {
                    throw new Error(`Class "${moduleDefinition.className}" not found in module`);
                }
                
                const modName = moduleDefinition.moduleName || moduleDefinition.context;

                const module = new ModuleClass({
                    moduleName: modName,
                    context: moduleDefinition.context,
                    moduleColor: moduleDefinition.moduleColor
                });

                HSModuleManager.#enabledModules.set(moduleDefinition.className, module);

                // Checking that the colorTag prototype method exists just to be safe (it's defined by the HSPrototypes module)
                if(moduleDefinition.moduleColor && typeof String.prototype.colorTag === 'function')
                    HSLogger.log(`Enabled module '${modName.colorTag(moduleDefinition.moduleColor)}'`, moduleDefinition.context);
                else
                    HSLogger.log(`Enabled module '${modName}'`, moduleDefinition.context);

                return HSModuleManager.#enabledModules.get(moduleDefinition.className);
            } catch (error) {
                HSLogger.warn(`Failed to add module ${moduleDefinition.className}:`, this.#context);
                console.log(error);
                return undefined;
            }
        }
    }

    async initModules() {
        // Go through the modules added to module manager and initialize all of them

        HSModuleManager.#enabledModules.forEach
        for(const [className, module] of HSModuleManager.#enabledModules.entries()) {
            if(!module.isInitialized)
                await module.init();
        }
    }

    // Returns a list of all of the enabled modules
    getModules(): Map<string, HSModule> {
        return HSModuleManager.#enabledModules;
    }

    // Returns a module by name
    // The reason why this looks so complicated is because we need to do some TypeScript shenanigans to properly return the found mod with the correct type
    // Used like: const hsui = this.#moduleManager.getModule<HSUI>('HSUI');
    // the e.g. <HSUI> part tells the getModule method which module (type) we're expecting it to return
    static getModule<T extends HSModule = HSModule>(moduleName: string): T | undefined {
        return HSModuleManager.#enabledModules.get(moduleName) as T;
    }
}
