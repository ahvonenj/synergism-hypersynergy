import { HSLogger } from "../hs-logger";
import type { HSModule } from "./hs-module";
import type { HSModuleDefinition } from "../../../types/hs-types";
import type { HSRegisteredModuleDefinition } from "./hs-module-definitions";
import { HSModuleRegistry } from "./hs-module-registry";

/**
 * Class: HSModuleManager
 * IsExplicitHSModule: No
 * Description: Constructs and initializes the registered modules in startup order.
 * Author: Swiffy, XxMolkxX
 */
export class HSModuleManager {
    #context: string;
    #modules: HSRegisteredModuleDefinition[];
    #instances: HSModule[] = [];

    constructor(context: string, modulesToEnable: readonly HSRegisteredModuleDefinition[]) {
        this.#context = context;
        const order = (definition: HSModuleDefinition) => definition.loadOrder ?? Number.MAX_SAFE_INTEGER;
        this.#modules = [...modulesToEnable].sort((a, b) => order(a) - order(b));
        HSLogger.log("Enabling Hypersynergism modules", this.#context);
    }

    async preprocessModules(): Promise<void> {
        const seenModules = new Set<string>();
        for (const def of this.#modules) {
            if (seenModules.has(def.className)) {
                HSLogger.warn('Module "' + def.className + '" is already enabled; check hs-module-definitions.ts', this.#context);
                return;
            }
            const module = this.addModule(def);
            const metadata: HSModuleDefinition = def;
            if (module && metadata.initImmediate) {
                await module.init();
                if (def.className === 'HSUI') {
                    const hsui = HSModuleRegistry.getModule('HSUI');
                    if (hsui) await HSLogger.integrateToUI(hsui);
                }
            }
            seenModules.add(def.className);
        }
    }

    addModule(definition: HSRegisteredModuleDefinition): HSModule | undefined {
        try {
            const metadata: HSModuleDefinition = definition;
            const modName = metadata.moduleName || metadata.context;
            const module = new definition.moduleClass({
                moduleName: modName,
                context: metadata.context,
                moduleColor: metadata.moduleColor,
            });
            HSModuleRegistry.register(definition.className, module);
            this.#instances.push(module);
            const color = metadata.moduleColor;
            const label = color ? `<${color}>${modName}</${color}>` : modName;
            HSLogger.log("Enabled module '" + label + "'", metadata.context);
            return module;
        } catch (error) {
            HSLogger.warn('Failed to add module ' + definition.className + ':', this.#context);
            console.log(error);
            return undefined;
        }
    }

    async initModules(): Promise<void> {
        for (const module of this.#instances) {
            if (!module.isInitialized) await module.init();
        }
    }
}
