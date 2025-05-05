import { AMBROSIA_ICON, HSAmbrosiaLoadoutIcon } from "../../types/module-types/hs-ambrosia-types";
import { IHSGlobal } from "../../types/module-types/hs-global-types";
import { ELogLevel } from "../../types/module-types/hs-logger-types";

export const HSGlobal: IHSGlobal = class {

    private constructor() {
        throw new Error("Cannot instantiate a static class");
    }

    // --- DEBUG ---
    static Debug = {
        debugMode: false,
        performanceDebugMode: false,
    }

    // --- GENERAL ---

    // Current mod version string
    static General = {
        currentModVersion: '2.6.1',
        modGithubUrl: 'https://github.com/ahvonenj/synergism-hypersynergy/',
        modWikiUrl: 'https://github.com/ahvonenj/synergism-hypersynergy/wiki/',
        modWikiFeaturesUrl: 'https://github.com/ahvonenj/synergism-hypersynergy/wiki/Mod-Features',
        modWebsiteUrl: 'https://ahvonenj.github.io/synergism-hypersynergy/',
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

        defaultWatcherOptions: {
            greedy: false,
            overrideThrottle: false,
            characterData: true,
            childList: true,
            subtree: true,
            attributes: false,
            attributeOldValue: false,
            attributeFilter: []
        }
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

    // --- HSUI ---

    // Log level
    static HSUI = {
        injectedStylesDomId: 'hs-injected-styles',
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

            // Hepteract alert toggle button
            '#toggle35',

            // Alert OK and cancel buttons
            '#ok_prompt',
            '#cancel_prompt',
        ]
    }

    // HSAmbrosia
    static HSAmbrosia = {
        storageKey: 'ambrosia-loadouts',
        quickBarId: 'hs-ambrosia-quick-loadout-container',
        quickBarLoadoutIdPrefix: 'hs-ambrosia-quickbar',
        ambrosiaLoadoutIcons: new Map<AMBROSIA_ICON, HSAmbrosiaLoadoutIcon>([
            // First set
            [AMBROSIA_ICON.TUTORIAL, {
                url:'https://synergism.cc/Pictures/Default/BlueberryTutorial.png',
                draggableIconId: AMBROSIA_ICON.TUTORIAL
            }],
            [AMBROSIA_ICON.PATREON, {
                url:'https://synergism.cc/Pictures/Default/BlueberryPatreon.png',
                draggableIconId: AMBROSIA_ICON.PATREON
            }],
            [AMBROSIA_ICON.OBTAINIUM, {
                url:'https://synergism.cc/Pictures/Default/BlueberryObtainium.png',
                draggableIconId: AMBROSIA_ICON.OBTAINIUM
            }],
            [AMBROSIA_ICON.OFFERING, {
                url:'https://synergism.cc/Pictures/Default/BlueberryOffering.png',
                draggableIconId: AMBROSIA_ICON.OFFERING
            }],
            [AMBROSIA_ICON.HYPEFLUX, {
                url:'https://synergism.cc/Pictures/Default/BlueberryHyperflux.png',
                draggableIconId: AMBROSIA_ICON.HYPEFLUX
            }],
            
            // First Red Ambrosia set
            [AMBROSIA_ICON.RA_TUTORIAL, {
                url:'https://synergism.cc/Pictures/RedAmbrosia/RedAmbrosiaTutorial.png',
                draggableIconId: AMBROSIA_ICON.RA_TUTORIAL
            }],
            [AMBROSIA_ICON.RA_FREE, {
                url:'https://synergism.cc/Pictures/RedAmbrosia/RedAmbrosiaFreeTutorialLevels.png',
                draggableIconId: AMBROSIA_ICON.RA_FREE
            }],
            [AMBROSIA_ICON.RA_CONV1, {
                url:'https://synergism.cc/Pictures/RedAmbrosia/RedAmbrosiaConversionImprovement1.png',
                draggableIconId: AMBROSIA_ICON.RA_CONV1
            }],
            [AMBROSIA_ICON.RA_BLUEGEN, {
                url:'https://synergism.cc/Pictures/RedAmbrosia/RedAmbrosiaBlueberryGenerationSpeed.png',
                draggableIconId: AMBROSIA_ICON.RA_BLUEGEN
            }],
            [AMBROSIA_ICON.RA_REGLUCK, {
                url:'https://synergism.cc/Pictures/RedAmbrosia/RedAmbrosiaRegularLuck.png',
                draggableIconId: AMBROSIA_ICON.RA_REGLUCK
            }],
            
            // QUARKS, CUBES, LUCK 1
            [AMBROSIA_ICON.QUARKS1, {
                url:'https://synergism.cc/Pictures/Default/BlueberryQuarks.png',
                draggableIconId: AMBROSIA_ICON.QUARKS1
            }],
            [AMBROSIA_ICON.CUBES1, {
                url:'https://synergism.cc/Pictures/Default/BlueberryCubes.png',
                draggableIconId: AMBROSIA_ICON.CUBES1
            }],
            [AMBROSIA_ICON.LUCK1, {
                url:'https://synergism.cc/Pictures/Default/BlueberryLuck.png',
                draggableIconId: AMBROSIA_ICON.LUCK1
            }],
            
            // Some base set
            [AMBROSIA_ICON.BASE_OBT1, {
                url:'https://synergism.cc/Pictures/Default/BlueberryBaseObtainium1.png',
                draggableIconId: AMBROSIA_ICON.BASE_OBT1
            }],
            [AMBROSIA_ICON.BASE_OFF1, {
                url:'https://synergism.cc/Pictures/Default/BlueberryBaseOffering1.png',
                draggableIconId: AMBROSIA_ICON.BASE_OFF1
            }],
            [AMBROSIA_ICON.SING_RED1, {
                url:'https://synergism.cc/Pictures/Default/BlueberrySingReduction.png',
                draggableIconId: AMBROSIA_ICON.SING_RED1
            }],
            
            // Second Red Ambrosia set
            [AMBROSIA_ICON.RA_FREE2, {
                url:'https://synergism.cc/Pictures/RedAmbrosia/RedAmbrosiaFreeLevelsRow2.png',
                draggableIconId: AMBROSIA_ICON.RA_FREE2
            }],
            [AMBROSIA_ICON.RA_CUBE, {
                url:'https://synergism.cc/Pictures/RedAmbrosia/RedAmbrosiaRedAmbrosiaCube.png',
                draggableIconId: AMBROSIA_ICON.RA_CUBE
            }],
            [AMBROSIA_ICON.RA_OBT, {
                url:'https://synergism.cc/Pictures/RedAmbrosia/RedAmbrosiaObtainium.png',
                draggableIconId: AMBROSIA_ICON.RA_OBT
            }],
            [AMBROSIA_ICON.RA_OFF, {
                url:'https://synergism.cc/Pictures/RedAmbrosia/RedAmbrosiaOffering.png',
                draggableIconId: AMBROSIA_ICON.RA_OFF
            }],
            
            // Hybrid set
            [AMBROSIA_ICON.CUBE_QUARK, {
                url:'https://synergism.cc/Pictures/Default/BlueberryCubeQuark.png',
                draggableIconId: AMBROSIA_ICON.CUBE_QUARK
            }],
            [AMBROSIA_ICON.LUCK_QUARK, {
                url:'https://synergism.cc/Pictures/Default/BlueberryLuckQuark.png',
                draggableIconId: AMBROSIA_ICON.LUCK_QUARK
            }],
            [AMBROSIA_ICON.LUCK_CUBE, {
                url:'https://synergism.cc/Pictures/Default/BlueberryLuckCube.png',
                draggableIconId: AMBROSIA_ICON.LUCK_CUBE
            }],
            [AMBROSIA_ICON.QUARK_CUBE, {
                url:'https://synergism.cc/Pictures/Default/BlueberryQuarkCube.png',
                draggableIconId: AMBROSIA_ICON.QUARK_CUBE
            }],
            [AMBROSIA_ICON.CUBE_LUCK, {
                url:'https://synergism.cc/Pictures/Default/BlueberryCubeLuck.png',
                draggableIconId: AMBROSIA_ICON.CUBE_LUCK
            }],
            [AMBROSIA_ICON.QUARK_LUCK, {
                url:'https://synergism.cc/Pictures/Default/BlueberryQuarkLuck.png',
                draggableIconId: AMBROSIA_ICON.QUARK_LUCK
            }],
            
            // Third Red Ambrosia set
            [AMBROSIA_ICON.RA_FREE3, {
                url:'https://synergism.cc/Pictures/RedAmbrosia/RedAmbrosiaFreeLevelsRow3.png',
                draggableIconId: AMBROSIA_ICON.RA_FREE3
            }],
            [AMBROSIA_ICON.RA_CONV2, {
                url:'https://synergism.cc/Pictures/RedAmbrosia/RedAmbrosiaConversionImprovement2.png',
                draggableIconId: AMBROSIA_ICON.RA_CONV2
            }],
            [AMBROSIA_ICON.RA_REDGEN, {
                url:'https://synergism.cc/Pictures/RedAmbrosia/RedAmbrosiaRedGenerationSpeed.png',
                draggableIconId: AMBROSIA_ICON.RA_REDGEN
            }],
            [AMBROSIA_ICON.RA_REDLUCK, {
                url:'https://synergism.cc/Pictures/RedAmbrosia/RedAmbrosiaRedLuck.png',
                draggableIconId: AMBROSIA_ICON.RA_REDLUCK
            }],
            
            // QUARKS, CUBES, LUCK 2
            [AMBROSIA_ICON.QUARKS2, {
                url:'https://synergism.cc/Pictures/Default/BlueberryQuarks2.png',
                draggableIconId: AMBROSIA_ICON.QUARKS2
            }],
            [AMBROSIA_ICON.CUBES2, {
                url:'https://synergism.cc/Pictures/Default/BlueberryCubes2.png',
                draggableIconId: AMBROSIA_ICON.CUBES2
            }],
            [AMBROSIA_ICON.LUCK2, {
                url:'https://synergism.cc/Pictures/Default/BlueberryLuck2.png',
                draggableIconId: AMBROSIA_ICON.LUCK2
            }],
            
            // Some base set 2
            [AMBROSIA_ICON.BASE_OBT2, {
                url:'https://synergism.cc/Pictures/Default/BlueberryBaseObtainium2.png',
                draggableIconId: AMBROSIA_ICON.BASE_OBT2
            }],
            [AMBROSIA_ICON.BASE_OFF2, {
                url:'https://synergism.cc/Pictures/Default/BlueberryBaseOffering2.png',
                draggableIconId: AMBROSIA_ICON.BASE_OFF2
            }],
            [AMBROSIA_ICON.INF_SHOP1, {
                url:'https://synergism.cc/Pictures/Default/BlueberryInfiniteShopUpgrades.png',
                draggableIconId: AMBROSIA_ICON.INF_SHOP1
            }],
            
            // Fourth Red Ambrosia set
            [AMBROSIA_ICON.RA_FREE4, {
                url:'https://synergism.cc/Pictures/RedAmbrosia/RedAmbrosiaFreeLevelsRow4.png',
                draggableIconId: AMBROSIA_ICON.RA_FREE4
            }],
            [AMBROSIA_ICON.RA_CUBE_IMPR, {
                url:'https://synergism.cc/Pictures/RedAmbrosia/RedAmbrosiaRedAmbrosiaCubeImprover.png',
                draggableIconId: AMBROSIA_ICON.RA_CUBE_IMPR
            }],
            [AMBROSIA_ICON.RA_INF_SHOP, {
                url:'https://synergism.cc/Pictures/RedAmbrosia/RedAmbrosiaInfiniteShopLevels.png',
                draggableIconId: AMBROSIA_ICON.RA_INF_SHOP
            }],
            [AMBROSIA_ICON.RA_ACC, {
                url:'https://synergism.cc/Pictures/RedAmbrosia/RedAmbrosiaAccelerator.png',
                draggableIconId: AMBROSIA_ICON.RA_ACC
            }],
            
            // QUARKS, CUBES, LUCK 3
            [AMBROSIA_ICON.QUARKS3, {
                url:'https://synergism.cc/Pictures/Default/BlueberryQuarks3.png',
                draggableIconId: AMBROSIA_ICON.QUARKS3
            }],
            [AMBROSIA_ICON.CUBES3, {
                url:'https://synergism.cc/Pictures/Default/BlueberryCubes3.png',
                draggableIconId: AMBROSIA_ICON.CUBES3
            }],
            [AMBROSIA_ICON.LUCK3, {
                url:'https://synergism.cc/Pictures/Default/BlueberryLuck3.png',
                draggableIconId: AMBROSIA_ICON.LUCK3
            }],
            
            // Some base set 3
            [AMBROSIA_ICON.SING_RED2, {
                url:'https://synergism.cc/Pictures/Default/BlueberrySingReduction2.png',
                draggableIconId: AMBROSIA_ICON.SING_RED2
            }],
            [AMBROSIA_ICON.INF_SHOP2, {
                url:'https://synergism.cc/Pictures/Default/BlueberryInfiniteShopUpgrades2.png',
                draggableIconId: AMBROSIA_ICON.INF_SHOP2
            }],
            
            // Fifth Red Ambrosia set
            [AMBROSIA_ICON.RA_VISCOUNT, {
                url:'https://synergism.cc/Pictures/RedAmbrosia/RedAmbrosiaTutorial.png',
                draggableIconId: AMBROSIA_ICON.RA_VISCOUNT
            }],
            [AMBROSIA_ICON.RA_FREE5, {
                url:'https://synergism.cc/Pictures/RedAmbrosia/RedAmbrosiaFreeLevelsRow5.png',
                draggableIconId: AMBROSIA_ICON.RA_FREE5
            }],
            [AMBROSIA_ICON.RA_CONV3, {
                url:'https://synergism.cc/Pictures/RedAmbrosia/RedAmbrosiaConversionImprovement3.png',
                draggableIconId: AMBROSIA_ICON.RA_CONV3
            }],
            [AMBROSIA_ICON.RA_BLUEGEN2, {
                url:'https://synergism.cc/Pictures/RedAmbrosia/RedAmbrosiaBlueberryGenerationSpeed.png',
                draggableIconId: AMBROSIA_ICON.RA_BLUEGEN2
            }],
            [AMBROSIA_ICON.RA_REGLUCK2, {
                url:'https://synergism.cc/Pictures/RedAmbrosia/RedAmbrosiaRegularLuck.png',
                draggableIconId: AMBROSIA_ICON.RA_REGLUCK2
            }],
        ])
    }

    // HSGameData
    static HSGameData = {
        saveDataWatchInterval: 500,
    }
}