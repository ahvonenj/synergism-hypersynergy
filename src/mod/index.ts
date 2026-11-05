import { Hypersynergism } from "./class/hypersynergism";
import { HSExternalModuleKind, HSModuleDefinition, HSModuleType } from "./types/hs-types";

// Loader won't find the hypersynergism instance in window without this declaration
declare global {
    interface Window {
        hypersynergism: Hypersynergism;
        __HS_INIT_PROMISE?: Promise<void>;
    }
}

// Essentially the "main" entrypoint
window.__HS_INIT_PROMISE = (async () => {
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
            className: 'HSMouse',
            context: 'HSMouse',
            moduleColor: 'gold',
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
            className: 'HSSubtabMemory',
            context: 'HSSubtabMemory',
            moduleColor: 'lightsalmon',
        },
        {
            className: 'HSPerksFind',
            context: 'HSPerksFind',
            moduleColor: 'goldenrod',
        },
        {
            className: 'HSAmbrosia',
            context: 'HSAmbrosia',
            moduleColor: 'blueviolet',
        },
        {
            className: 'HSHeaderLoadoutIcons',
            context: 'HSHeaderLoadoutIcons',
            moduleColor: 'khaki',
        },
        {
            className: 'HSHepteractDistributor',
            context: 'HSHepteractDistributor',
            moduleColor: 'mediumslateblue',
        },
        {
            className: 'HSAutosing',
            context: 'HSAutosing',
            moduleColor: '#00ff7f',
        },
        {
            className: 'HSQOLButtons',
            context: 'HSQOLButtons',
            moduleColor: '#c0c0c0',
        },
        {
            className: 'HSAutoExport',
            context: 'HSAutoExport',
            moduleColor: '#7fb3d5',
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
    window.hypersynergism = hypersynergism;

    await hypersynergism.init();
})();
void window.__HS_INIT_PROMISE.catch(error => console.error('[HS] Mod initialization failed', error));
