import { Hypersynergism } from "./class/hypersynergism";
import { HSModuleDefinition } from "./types/hs-types";

/*
    WHEN ADDING NEW MODULES / CLASSES:

    - Add a class mapping to #moduleClasses in hs-module-manager.ts
    - Adding the mapping should make your IDE import the module class, but if it doesn't,
      you need to do that as well
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
        className: 'HSPrototypes',
        context: 'HSPrototypes',
        loadOrder: 3,
    },
    {
        className: 'HSPotions',
        context: 'HSPotions',
    },
    {
        className: 'HSCodes',
        context: 'HSCodes',
    },
    {
        className: 'HSHepteracts',
        context: 'HSHepteracts',
    },
    {
        className: 'HSTalismans',
        context: 'HSTalismans',
    }
]

// Essentially the "main" entrypoint
const hypersynergism = new Hypersynergism(enabledModules);

// Loader won't find the hypersynergism instance in window without this declaration
declare global {
    interface Window {
        hypersynergism: Hypersynergism;
    }
}

// For the loader
window.hypersynergism = hypersynergism;
