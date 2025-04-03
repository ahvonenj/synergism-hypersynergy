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
            loadOrder: 1,
            initImmediate: true
        },
        {
            className: 'HSStorage',
            context: 'HSStorage',
            loadOrder: 2,
            initImmediate: true
        },
        {
            className: 'HSUI',
            context: 'HSUI',
            loadOrder: 3,
        },
        {
            className: 'HSSettings',
            context: 'HSSettings',
            loadOrder: 4,
        },
        {
            className: 'HSShadowDOM',
            context: 'HSShadowDOM',
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
        },
        {
            className: 'HSMouse',
            context: 'HSMouse',
        }
    ];

    const hypersynergism = new Hypersynergism(enabledModules);
    await hypersynergism.preprocessModules();

    window.hypersynergism = hypersynergism;
})();





