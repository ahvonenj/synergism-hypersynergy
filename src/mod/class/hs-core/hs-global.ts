import { AMBROSIA_ICON, HSAmbrosiaLoadoutIcon } from "../../types/module-types/hs-ambrosia-types";
import { IHSGlobal } from "../../types/module-types/hs-global-types";
import { ELogLevel } from "../../types/module-types/hs-logger-types";

export const HSGlobal: IHSGlobal = class {

    private constructor() {
        throw new Error("Cannot instantiate a static class");
    }

    // --- GENERAL ---

    // Current mod version string
    static General = {
        currentModVersion: '2.5.1',
        modFeaturesGithubUrl: 'https://github.com/ahvonenj/synergism-hypersynergy/wiki/Mod-Features'
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

    // HSAmbrosia
    static HSAmbrosia = {
        storageKey: 'ambrosia-loadouts',
        ambrosiaLoadoutIcons: new Map<AMBROSIA_ICON, HSAmbrosiaLoadoutIcon>([
                // First row
                [AMBROSIA_ICON.TUTORIAL, { 
                    url: 'https://synergism.cc/Pictures/Default/BlueberryTutorial.png',
                    draggableIconId: AMBROSIA_ICON.TUTORIAL
                }],
                [AMBROSIA_ICON.PATREON, { 
                    url: 'https://synergism.cc/Pictures/Default/BlueberryPatreon.png',
                    draggableIconId: AMBROSIA_ICON.PATREON
                }],
                [AMBROSIA_ICON.OBTAINIUM, { 
                    url: 'https://synergism.cc/Pictures/Default/BlueberryObtainium.png',
                    draggableIconId: AMBROSIA_ICON.OBTAINIUM
                }],
                [AMBROSIA_ICON.OFFERING, { 
                    url: 'https://synergism.cc/Pictures/Default/BlueberryOffering.png',
                    draggableIconId: AMBROSIA_ICON.OFFERING
                }],
                [AMBROSIA_ICON.HYPEFLUX, { 
                    url: 'https://synergism.cc/Pictures/Default/BlueberryHyperflux.png',
                    draggableIconId: AMBROSIA_ICON.HYPEFLUX
                }],

                // Second row
                [AMBROSIA_ICON.QUARKS1, { 
                    url: 'https://synergism.cc/Pictures/Default/BlueberryQuarks.png',
                    draggableIconId: AMBROSIA_ICON.QUARKS1
                }],
                [AMBROSIA_ICON.CUBES1, { 
                    url: 'https://synergism.cc/Pictures/Default/BlueberryCubes.png',
                    draggableIconId: AMBROSIA_ICON.CUBES1
                }],
                [AMBROSIA_ICON.LUCK1, { 
                    url: 'https://synergism.cc/Pictures/Default/BlueberryLuck.png',
                    draggableIconId: AMBROSIA_ICON.LUCK1
                }],

                // Third row
                [AMBROSIA_ICON.CUBE_QUARK, { 
                    url: 'https://synergism.cc/Pictures/Default/BlueberryCubeQuark.png',
                    draggableIconId: AMBROSIA_ICON.CUBE_QUARK
                }],
                [AMBROSIA_ICON.LUCK_QUARK, { 
                    url: 'https://synergism.cc/Pictures/Default/BlueberryLuckQuark.png',
                    draggableIconId: AMBROSIA_ICON.LUCK_QUARK
                }],
                [AMBROSIA_ICON.LUCK_CUBE, { 
                    url: 'https://synergism.cc/Pictures/Default/BlueberryLuckCube.png',
                    draggableIconId: AMBROSIA_ICON.LUCK_CUBE
                }],
                [AMBROSIA_ICON.QUARK_CUBE, { 
                    url: 'https://synergism.cc/Pictures/Default/BlueberryQuarkCube.png',
                    draggableIconId: AMBROSIA_ICON.QUARK_CUBE
                }],
                [AMBROSIA_ICON.CUBE_LUCK, { 
                    url: 'https://synergism.cc/Pictures/Default/BlueberryCubeLuck.png',
                    draggableIconId: AMBROSIA_ICON.CUBE_LUCK
                }],
                [AMBROSIA_ICON.QUARK_LUCK, { 
                    url: 'https://synergism.cc/Pictures/Default/BlueberryQuarkLuck.png',
                    draggableIconId: AMBROSIA_ICON.QUARK_LUCK
                }],

                // Fourth row
                [AMBROSIA_ICON.QUARKS2, { 
                    url: 'https://synergism.cc/Pictures/Default/BlueberryQuarks2.png',
                    draggableIconId: AMBROSIA_ICON.QUARKS2
                }],
                [AMBROSIA_ICON.CUBES2, { 
                    url: 'https://synergism.cc/Pictures/Default/BlueberryCubes2.png',
                    draggableIconId: AMBROSIA_ICON.CUBES2
                }],
                [AMBROSIA_ICON.LUCK2, { 
                    url: 'https://synergism.cc/Pictures/Default/BlueberryLuck2.png',
                    draggableIconId: AMBROSIA_ICON.LUCK2
                }],
        ])
    }
}