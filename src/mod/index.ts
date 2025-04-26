import { Hypersynergism } from "./class/hypersynergism";
import { HSModuleDefinition } from "./types/hs-types";

// Loader won't find the hypersynergism instance in window without this declaration
declare global {
    interface Window {
        hypersynergism: Hypersynergism;
    }
}

// Essentially the "main" entrypoint
(async () => {
    /*
        WHEN ADDING NEW MODULES / CLASSES:

        - Add a class mapping to #moduleClasses in hs-module-manager.ts
        - Adding the mapping should make your IDE import the module class, but if it doesn't,
        you need to do that as well
    */
    const enabledModules: HSModuleDefinition[] = [
        {
            className: 'HSPrototypes',
            context: 'HSPrototypes',
            moduleColor: 'crimson',
            loadOrder: 1,
            initImmediate: true
        },
        {
            className: 'HSUI',
            context: 'HSUI',
            moduleColor: 'royalblue',
            loadOrder: 2,
            initImmediate: true
        },
        {
            className: 'HSStorage',
            context: 'HSStorage',
            moduleColor: 'wheat',
            loadOrder: 3,
            initImmediate: true
        },
        {
            className: 'HSSettings',
            context: 'HSSettings',
            moduleColor: 'slategray',
            loadOrder: 4,
        },
        {
            className: 'HSShadowDOM',
            context: 'HSShadowDOM',
            moduleColor: 'hotpink',
        },
        {
            className: 'HSPotions',
            context: 'HSPotions',
            moduleColor: 'darkorange',
        },
        {
            className: 'HSCodes',
            context: 'HSCodes',
            moduleColor: 'darkgoldenrod',
        },
        {
            className: 'HSHepteracts',
            context: 'HSHepteracts',
            moduleColor: 'slateblue',
        },
        {
            className: 'HSTalismans',
            context: 'HSTalismans',
            moduleColor: 'cyan',
        },
        {
            className: 'HSMouse',
            context: 'HSMouse',
            moduleColor: 'gold',
        },
        {
            className: 'HSAmbrosia',
            context: 'HSAmbrosia',
            moduleColor: 'blueviolet',
        },
        {
            className: 'HSStats',
            context: 'HSStats',
            moduleColor: 'lawngreen',
        },
        {
            className: 'HSGameState',
            context: 'HSGameState',
            moduleColor: 'indianred',
        }
    ];

    const hypersynergism = new Hypersynergism(enabledModules);
    await hypersynergism.preprocessModules();

    window.hypersynergism = hypersynergism;
})();





