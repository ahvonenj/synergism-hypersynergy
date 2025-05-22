import { Hypersynergism } from "./class/hypersynergism";
import { HSExternalModuleKind, HSModuleDefinition, HSModuleType } from "./types/hs-types";

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
            className: 'HSDebug',
            context: 'HSDebug',
            moduleColor: '#ff2020',
            loadOrder: 5,
            initImmediate: true
        },
        {
            className: 'HSWebSocket',
            context: 'HSWebSocket',
            moduleColor: '#FC427B',
            loadOrder: 6,
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
        },
        {
            className: 'HSPatches',
            context: 'HSPatches',
            moduleColor: '#487eb0',
        },
        {
            className: 'HSGameData',
            context: 'HSGameData',
            moduleColor: '#fbc531',
        },
        {
            className: 'HSGameDataAPI',
            context: 'HSGameDataAPI',
            moduleColor: '#fbc531',
        },
        {
            className: 'Chartist',
            context: 'Chartist',
            moduleColor: '#e8d7bf',
            moduleType: HSModuleType.EXTMODULE,
            moduleKind: HSExternalModuleKind.BOTH,
            moduleScriptUrl: 'https://cdn.jsdelivr.net/npm/chartist@1.3.1/dist/index.umd.min.js',
            moduleCSSUrl: 'https://cdn.jsdelivr.net/npm/chartist@1.3.1/dist/index.min.css',
            scriptContext: 'Chartist'
        }
    ];

    const hypersynergism = new Hypersynergism(enabledModules);
    await hypersynergism.preprocessModules();

    window.hypersynergism = hypersynergism;
})();





