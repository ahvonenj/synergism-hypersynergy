import { ELogLevel } from "../../types/hs-types";
import { IHSGlobal } from "../../types/hs-types";

export const HSGlobal: IHSGlobal = class {

    private constructor() {
        throw new Error("Cannot instantiate a static class");
    }

    // --- GENERAL ---

    // Current mod version string
    static General = {
        currentModVersion: '2.4.1'
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

    // --- HSSettings ---

    // Log level
    static HSSettings = {
        storageKey: 'settings',
    }

    static HSMouse = {
        autoClickIgnoredElements: [
            // Hepteract buttons
            '#chronosHepteractCraft',
            '#chronosHepteractCraftMax',
            '#chronosHepteractCap',
            '#chronosHepteractAuto',

            '#hyperrealismHepteractCraft',
            '#hyperrealismHepteractCraftMax',
            '#hyperrealismHepteractCap',
            '#hyperrealismHepteractAuto',

            '#quarkHepteractCraft',
            '#quarkHepteractCraftMax',
            '#quarkHepteractCap',
            '#quarkHepteractAuto',

            '#challengeHepteractCraft',
            '#challengeHepteractCraftMax',
            '#challengeHepteractCap',
            '#challengeHepteractAuto',

            '#abyssHepteractCraft',
            '#abyssHepteractCraftMax',
            '#abyssHepteractCap',
            '#abyssHepteractAuto',

            '#acceleratorHepteractCraft',
            '#acceleratorHepteractCraftMax',
            '#acceleratorHepteractCap',
            '#acceleratorHepteractAuto',

            '#acceleratorBoostHepteractCraft',
            '#acceleratorBoostHepteractCraftMax',
            '#acceleratorBoostHepteractCap',
            '#acceleratorBoostHepteractAuto',

            '#multiplierHepteractCraft',
            '#multiplierHepteractCraftMax',
            '#multiplierHepteractCap',
            '#multiplierHepteractAuto',

            // Orb and powder buttons
            '#hepteractToQuarkTrade',
            '#hepteractToQuarkTradeMax',
            '#hepteractToQuarkTradeAuto',
            '#powderDayWarp',
            '#warpAuto',

            // Autocraft percentage button
            '#hepteractAutoPercentageButton',

            // Auto rune button
            '#toggleautosacrifice',

            // Auto fragment buy toggle button
            '#toggleautoBuyFragments',

            // Auto buy blessings toggle button
            '#toggle36',

            // Auto buy spirits toggle
            '#toggle37',

            // Auto research buy amount button
            '#toggleresearchbuy',

            // Auto research toggle button
            '#toggleautoresearch',

            // Auto research mode button
            '#toggleautoresearchmode',

            // Research hover buy button
            '#toggle38',

            // Ant buy amount button
            '#toggleAntMax',


            // Auto challenge toggle button
            '#toggleAutoChallengeStart',

            // Challenge retry button
            '#retryChallenge',

            // Auto challenge ignore toggle button
            '#toggleAutoChallengeIgnore',
        ]
    }
}