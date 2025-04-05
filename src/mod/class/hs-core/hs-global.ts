import { ELogLevel } from "../../types/hs-types";

export class HSGlobal {
    // --- GENERAL ---

    // Current mod version string
    static General = {
        currentModVersion: '2.5.0'
    };


    // --- HSPrototypes ---
    
    // Default CSS transition timing 100ms
    static HSPrototypes = {
        defaultTransitionTiming: 100
    }


    // --- HSElementHooker ---

    // watchElement's MutationObserver can fire max 20 times / second
    static HSElementHooker = {
        // HookElement / HookElements
        elementHookUpdateMS: 10,
        elementsHookUpdateMS: 100,
        enableHelementHookTimeout: true,
        elementHookTimeout: 500,

        // Watchers
        watcherThrottlingMS: 50,
    }


    // --- HSLogger ---

    // Log level
    static HSLogger = {
        logLevel: ELogLevel.ALL,
        logSize: 100
    }

    // --- HSStorage ---

    // Log level
    static HSStorage = {
        storagePrefix: 'hs-',
    }
}