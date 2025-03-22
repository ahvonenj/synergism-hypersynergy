import { Hypersynergism } from "./class/hypersynergism";
import { HSModuleDefinition } from "./types/hs-types";

/*
    WHEN ADDING NEW MODULES / CLASSES:

    - Add (explicit) import in hs-module-manager.ts
    - Add a class mapping to #moduleClasses in hs-module-manager.ts
*/
const enabledModules: HSModuleDefinition[] = [
    {
        className: 'HSUI',
        context: 'HSUI',
        loadOrder: 1,
    },
    {
        className: 'HSSettings',
        context: 'HSSettings',
        loadOrder: 2,
    },
    {
        className: 'HSPotions',
        context: 'HSPotions',
        loadOrder: 3,
    },
    {
        className: 'HSCodes',
        context: 'HSCodes',
        loadOrder: 4,
    },
    {
        className: 'HSHepteracts',
        context: 'HSHepteracts',
        loadOrder: 5,
    },
    {
        className: 'HSTalismans',
        context: 'HSTalismans',
        loadOrder: 6,
    }
]

// Essentially the "main" entrypoint
const hypersynergism = new Hypersynergism(enabledModules);

// For the loader
declare global {
    interface Window {
        hypersynergism: Hypersynergism;
    }
}

// For the loader
window.hypersynergism = hypersynergism;
