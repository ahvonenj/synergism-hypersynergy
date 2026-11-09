import {
    HSViewProperties, MAIN_VIEW, subtabButtonIds,
    BUILDING_VIEW_BUTTON_IDS, ACHIEVEMENT_VIEW_BUTTON_IDS, RUNE_VIEW_BUTTON_IDS, CHALLENGE_VIEW_BUTTON_IDS, ANT_VIEW_BUTTON_IDS,
    CUBE_VIEW_BUTTON_IDS, TRAITS_VIEW_BUTTON_IDS, SINGULARITY_VIEW_BUTTON_IDS, SETTINGS_VIEW_BUTTON_IDS, PSEUDOCOIN_VIEW_BUTTON_IDS,
} from "../../types/module-types/hs-gamestate-types";
import { IHSGlobal } from "../../types/module-types/hs-global-types";
import { ELogLevel } from "../../types/module-types/hs-logger-types";

// Build-time injected by esbuild via `define`.
declare const HS_BUILD_VERSION: string;

/**
 * Class: HSGlobal
 * IsExplicitHSModule: No
 * Description:
 *     Static class containing global configuration and constants for the Hypersynergism mod.
 * Author: Swiffy, Shewchou
 */
export const HSGlobal: IHSGlobal = class {

    constructor() {
        throw new Error("Cannot instantiate a static class");
    }

    static get exposedPlayer() {
        return (window as any)[(window as any).symp] || null;
    }

    // --- DEBUG ---
    static Debug = {
        debugMode: false,
        performanceDebugMode: false,
        gameDataDebugMode: false,
        calculationCacheDebugMode: false,
    }

    // --- Release check configuration ---
    static Release = {
        githubOwner: 'Ferlieloi',    // The Live repo: version check fallback and the Mod Github link
        checkIntervalMs: 1800000     // 30min
    }

    // --- GENERAL ---
    static General = {
        // Version number bumping should be done in package.json.version
        currentModVersion: (typeof HS_BUILD_VERSION !== 'undefined') ? HS_BUILD_VERSION : '0.0.0',
        isModFullyLoaded: false,

        get modGithubUrl() { return `https://github.com/${HSGlobal.Release.githubOwner}/synergism-hypersynergy/`; },
        get modWebsiteUrl() { return 'https://ferlieloi.github.io/synergism-hypersynergy/'; },
        get modDiscordThreadUrl() { return 'https://discord.com/channels/677271830838640680/1456904896099127367'; },
    };

    // --- COMMON ---
    static Common = {
        pseudoAPIurl: 'https://synergism.cc/stripe/upgrades',
        meAPIurl: 'https://synergism.cc/api/v1/users/me',
        // Sent with every request to synergism.cc, so the game's backend can tell the mod's traffic and its version apart
        // (a custom header: Chromium drops a User-Agent set through fetch)
        get modRequestHeaders(): Record<string, string> { return { 'X-HyperSynergism-Version': HSGlobal.General.currentModVersion }; },
    }

    // --- HSPrototypes ---
    static HSPrototypes = {
        // Default CSS transition timing 100ms
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
    static HSLogger = {
        logLevel: ELogLevel.NONE,
        logSize: 5000,

        // Log tab colors of the contexts that aren't modules (modules have their moduleColor, in index.ts).
        // A module's name gives that module's color, anything else is a CSS color.
        contextColors: {
            // Autosing
            HSAutosingModal: 'HSAutosing',
            HSAutosingSettingsFixer: 'HSAutosing',
            HSAutosingCorruption: 'HSAutosing',
            HSAutosingStrategyModal: 'HSAutosing',
            HSAutosingStrategyControls: 'HSAutosing',
            // Ambrosia
            HSAmbrosiaHelper: 'HSAmbrosia',
            // Settings
            HSSetting: 'HSSettings',
            HSSettingsUI: 'HSSettings',
            // QoL quickbars
            HSQuickbarManager: 'HSQOLButtons',
            HSQOLAutomationQuickbar: 'HSQOLButtons',
            HSHeaderModules: 'HSQOLButtons',
            HSHeaderKeepOnImport: 'HSQOLButtons',
            HSHeaderEditSettings: 'HSQOLButtons',
            HSHeaderCellSettings: 'HSQOLButtons',
            HSHeaderGridWidth: 'HSQOLButtons',
            HSHeaderChallengeModule: 'HSQOLButtons',
            HSCorruptionHeader: 'HSQOLButtons',
            HSElevatorHeader: 'HSQOLButtons',
            HSMinibarResize: 'HSAmbrosia',
            HSLoadoutIconStore: 'HSHeaderLoadoutIcons',
            // UI
            HSUIC: 'HSUI',
            Notify: 'HSUI',
            // Heater
            HSHeater: 'darkorange',
            HSHeaterOptimizer: 'darkorange',
            HSHeaterUIResult: 'darkorange',
            HSHeaterInputModalController: 'darkorange',
            // Game dialogs
            HSGameDialogs: 'hotpink',
            HSHiddenDialogs: 'hotpink',
            HSDialogIdentity: 'hotpink',
            // Core and the rest
            HSMain: 'plum',
            HSLogger: 'plum',
            HSModuleManager: 'plum',
            HSElementHooker: 'plum',
            HSUtils: 'plum',
            Once: 'plum',
            HSBackup: 'plum',
            HSCalculationTools: 'plum',
            HSGithub: 'plum',
            HSBookmarkletNotice: 'plum',
            HSDevTools: 'plum',
        }
    }

    // --- HSStorage ---
    static HSStorage = {
        storagePrefix: 'hs-',
    }

    // --- HSUI ---
    static HSUI = {
        injectedStylesDomId: 'hs-injected-styles',
        notifyColumnClassName: 'hs-notifications',
        notifyClassName: 'hs-notification',
        notifyTextClassName: 'hs-notification-text',
    }

    // --- HSUIC ---
    static HSUIC = {
        defaultImageWidth: 32,
        defaultImageHeight: 32,
    }

    // --- HSSettings ---
    static HSSettings = {
        storageKey: 'settings',
        strategiesKey: 'strategies',
        serializationBlackList: [
            'settingDescription',
            'settingHelpText',
            'settingValueMultiplier',
            'defaultValue',
            'settingControl',
            'settingAction',
            'usesGameData',
            'hidden',
            'platforms',
        ],
        gameDataRequiredTooltip: 'This feature requires Game Data Sniffing to be enabled.',

        // Settings exempt from the "GDS must already be enabled" check. Features in
        // this list may enable GDS themselves when switched on.
        gameDataCheckBlacklist: [
            'useGameData',
            // These settings below auto-enable GDS when toggled on,
            // so they should be allowed to toggle even when GDS is off
            'ambrosiaMinibars'
        ]
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

    // HSHiddenDialogs
    static HSHiddenDialogs = {
        storageKey: 'hidden-dialogs',
    }

    // HSAmbrosia
    static HSAmbrosia = {
        // Constants ripped from the game code
        TIME_PER_AMBROSIA: 45,
        TIME_PER_RED_AMBROSIA: 1000,
        digitReduction: 4,

        blueBarId: 'hs-blue-progress-bar',
        blueBarProgressId: 'hs-blue-progress',
        blueBarProgressTextId: 'hs-blue-progress-text',
        redBarId: 'hs-red-progress-bar',
        redBarProgressId: 'hs-red-progress',
        redBarProgressTextId: 'hs-red-progress-text',
        purpleBarId: 'hs-purple-progress-bar',
        purpleBarProgressId: 'hs-purple-progress',
        barWrapperId: 'hs-minibars-wrapper',
    }

    // HSGameState
    static HSGameState = {
        viewProperties: new Map<MAIN_VIEW, HSViewProperties>([
            [MAIN_VIEW.BUILDINGS, {
                subViewIds: subtabButtonIds(BUILDING_VIEW_BUTTON_IDS),
                viewClassName: 'BuildingView'
            }],
            [MAIN_VIEW.ACHIEVEMENTS, {
                subViewIds: subtabButtonIds(ACHIEVEMENT_VIEW_BUTTON_IDS),
                viewClassName: 'AchievementView'
            }],
            [MAIN_VIEW.RUNES, {
                subViewIds: subtabButtonIds(RUNE_VIEW_BUTTON_IDS),
                viewClassName: 'RuneView'
            }],
            [MAIN_VIEW.CHALLENGES, {
                subViewIds: subtabButtonIds(CHALLENGE_VIEW_BUTTON_IDS),
                viewClassName: 'ChallengeView'
            }],
            [MAIN_VIEW.ANTS, {
                subViewIds: subtabButtonIds(ANT_VIEW_BUTTON_IDS),
                viewClassName: 'AntView'
            }],
            [MAIN_VIEW.CUBES, {
                subViewIds: subtabButtonIds(CUBE_VIEW_BUTTON_IDS),
                viewClassName: 'CubeView'
            }],
            [MAIN_VIEW.TRAITS, {
                subViewIds: subtabButtonIds(TRAITS_VIEW_BUTTON_IDS),
                viewClassName: 'TraitsView'
            }],
            [MAIN_VIEW.SINGULARITY, {
                subViewIds: subtabButtonIds(SINGULARITY_VIEW_BUTTON_IDS),
                viewClassName: 'SingularityView'
            }],
            [MAIN_VIEW.SETTINGS, {
                subViewIds: subtabButtonIds(SETTINGS_VIEW_BUTTON_IDS),
                viewClassName: 'SettingsView'
            }],
            [MAIN_VIEW.PSEUDOCOINS, {
                subViewIds: subtabButtonIds(PSEUDOCOIN_VIEW_BUTTON_IDS),
                viewClassName: 'PseudoCoinView'
            }]
        ])
    }

    // HSGameData
    static HSGameData = {
        consumablesPollInterval: 1000, // a read of the game's Happy Hour Bells, no request
        // A save every 500ms: the Ambrosia tab's rates refresh at that pace, and the minibars read the live player
        gdsSpeedMs: 500,
        gdsCSSId: 'hs-game-data-turbo-css'
    }
}
