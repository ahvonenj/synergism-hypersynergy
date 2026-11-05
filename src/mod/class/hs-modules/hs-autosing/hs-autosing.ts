import Decimal from "break_infinity.js";
import { HSModuleManager } from "../../hs-core/module/hs-module-manager";
import { HSGameDataAPI } from "../../hs-core/gds/hs-gamedata-api";
import type { HSGameData } from "../../hs-core/gds/hs-gamedata";
import { HSModule } from "../../hs-core/module/hs-module";
import { HSLogger } from "../../hs-core/hs-logger";
import { HSUI } from "../../hs-core/hs-ui";
import { HSSettings } from "../../hs-core/settings/hs-settings";
import { HSStrategyManager } from "./hs-strategy-manager";
import { HSNumericSetting } from "../../hs-core/settings/hs-setting";
import { HSUtils } from "../../hs-utils/hs-utils";
import { HSNumberParser } from "../../hs-utils/hs-number-parser";
import { HSAutosingStrategy, PhaseOption, phases, AutosingStrategyPhase, Challenge, SPECIAL_ACTION_BY_ID, createDefaultAoagPhase, AOAG_PHASE_ID, AOAG_PHASE_NAME, SET_CORRUPTION_LEVEL_VALUE, IF_JUMP_VALUE, ALLOWED, type HSAutosingPassRecord, type HSAutosingExposureParts } from "../../../types/module-types/hs-autosing-types";
import { HSAutosingModal } from "./hs-autosingModal";
import { HSAutosingRecorder } from "./hs-autosingRecorder";
import { HSAutosingStepTimingsWindow } from "./ui/hs-autosing-step-timings-window";
import { HSGlobal } from "../../hs-core/hs-global";
import { HSGameState, MainView } from "../../hs-core/hs-gamestate";
import { HSAutosingSettingsFixer } from './hs-autosingSettingsFixer';
import { HSAutosingCorruption } from './hs-autosingCorruption';
import { HSAutosingWakeLock } from './hs-autosingWakeLock';
import { ELogLevel } from "../../../types/module-types/hs-logger-types";
import { HSGameDialogs } from "../../hs-core/dialogs/hs-game-dialogs";
import { HSSubtabMemory } from "../hs-subtab-memory";
import { MAIN_VIEW_BUTTON_IDS } from "../../../types/module-types/hs-gamestate-types";
import { escapeLogText } from "../hs-heater/hs-heater-utils";

const STAGE_REGEX = /Current Game Section:\s*(.+)/;
const CHALLENGE_COMPLETIONS_REGEX = /\((\d+)\s*\/\s*(\d+)\):/;
// Everything after the challenge's name: the score is its first number (it can hold no-break spaces, which \S excludes)
const CHALLENGE_15_SCORE_REGEX = /:\s*(.+)/;
const ALLOWED_REGEX = new RegExp(ALLOWED.join('|'));
const EXALT_STATE_ATTRIBUTE = 'data-inside-singularity-challenge';

class InnerTextWaitSupersededError extends Error {
    constructor() {
        super("Wait for inner text superseded");
        this.name = "InnerTextWaitSupersededError";
    }
}

type ChallengeAccessor = {
    button?: HTMLButtonElement;
    levelElement?: HTMLElement;
    getLevelText: () => string;
    getCompletions: () => Decimal;
    getGoal: () => Decimal;
};

/**
 * Class: HSAutosing
 * IsExplicitHSModule: Yes
 * Description: Hypersynergism module that performs autosings.
 * Author: XxMolkxX, Shewchou
 */
export class HSAutosing extends HSModule {
    static readonly #DECIMAL_INFINITY = new Decimal(Infinity);
    static readonly #DECIMAL_0 = new Decimal(0);
    #gameDataAPI?: HSGameDataAPI;

    #corruptionManager!: HSAutosingCorruption;

    #strategy?: HSAutosingStrategy;
    #autosingEnabled = false;
    #isStarting = false;
    // Set by stopAutosing() during a start: the start stops at its next checkpoint
    #startCancelled = false;
    // Start requested while a cancelled start was still running: started once it has ended
    #startRequestedAgain = false;
    // Chains still running (main loop, final stage), settled versions. After a stop, they end at their next
    // #autosingEnabled check: a start waits for them, so a run never overlaps the chains of the previous one.
    // A living chain can then trust the shared flag (true = its own run) and the shared state.
    #chains = new Set<Promise<void>>();
    #restartTimer?: number;
    #targetSingularity = 0;
    #prevActionTime: number = 0;
    // Steps added to (and removed from) the first phase at load: the logs number steps as the strategy editor does
    #insertedStepsPhase: AutosingStrategyPhase | null = null;
    #insertedStepCount: number = 0;
    #removedStepCount: number = 0;
    #stopAtSingularitysEnd: boolean = false;
    #hasWarnedMissingStageFunc: boolean = false;
    #storedC15: number = 0;
    #lastBookmarkC15Score = HSAutosing.#DECIMAL_0;
    #challengeAccessors: Record<number, ChallengeAccessor> = {};
    #settingsFixer = new HSAutosingSettingsFixer();
    #wakeLock = new HSAutosingWakeLock();
    #settingsWork?: Promise<void>;
    #settingsRestore?: Promise<void>;
    #previousQuarkAmount: number = 0;
    #previousGoldenQuarkAmount: number = 0;

    // DOM Elements - Settings & UI
    #settingsTab!: HTMLButtonElement;
    #settingsSubTab!: HTMLButtonElement;
    #misc!: HTMLButtonElement;
    #stage!: HTMLParagraphElement;

    // DOM Elements - Challenges
    #challengeButtons: Record<number, HTMLButtonElement> = {};
    #challengeProgressElements: HTMLElement[] = [];

    // DOM Elements - Challenge Actions
    #exitTranscBtn!: HTMLButtonElement;
    #exitReincBtn!: HTMLButtonElement;
    #exitAscBtn!: HTMLButtonElement;
    #ascendBtn!: HTMLButtonElement;

    // DOM Elements - Elevator & Navigation
    #elevatorTeleportButton!: HTMLButtonElement;
    #elevatorInput!: HTMLInputElement;

    // DOM Elements - Auto Toggles
    #autoChallengeButton!: HTMLButtonElement;
    #autoAntSacrificeButton!: HTMLButtonElement;
    #autoAscendButton!: HTMLButtonElement;

    // DOM Elements - Heptract Auto-Buy
    #heptractBtns: HTMLButtonElement[] = [];

    // DOM Elements - Ambrosia Loadouts
    #ambrosia_early_cube!: HTMLButtonElement;
    #ambrosia_late_cube!: HTMLButtonElement;
    #ambrosia_quark!: HTMLButtonElement;
    #ambrosia_obt!: HTMLButtonElement;
    #ambrosia_off!: HTMLButtonElement;
    #ambrosia_luck!: HTMLButtonElement;
    // Read at the start, then kept up to date by setAmbrosiaSwitchesOff(): the slots above aren't looked up while it's on
    #ambrosiaSwitchesOff = false;
    // "Record step timings", read at each start
    #recordTimings = false;

    // DOM Elements - Misc
    #antSacrifice!: HTMLButtonElement;
    #AOAG!: HTMLButtonElement;
    #exalt2Btn!: HTMLButtonElement;
    #addCodeAllBtn!: HTMLButtonElement;
    #timeCodeBtn!: HTMLButtonElement;
    #upg81Btn!: HTMLButtonElement;

    // DOM Elements - Antiquities
    #antiquitiesRuneLockedContainer!: HTMLDivElement;

    // State Management
    #endStageDone: boolean = false;
    #antiquitiesObserver?: MutationObserver;
    #antiquitiesObserverActivated: boolean = false;
    #endStagePromise?: Promise<void>;
    #endStagePromiseResolve?: () => void;
    #upg81Observer?: MutationObserver;
    #upg81Promise?: Promise<boolean>;
    #upg81PromiseResolve?: (value: boolean) => void;
    #upg81ClickLoopActive: boolean = false;
    #upg81ClickLoopGeneration: number = 0;
    #exaltStateObserver?: MutationObserver;
    // Step of #enterAndLeaveExalt(): a stop while 'entering' leaves the Exalt autosing entered
    #exaltStep: 'none' | 'entering' | 'leaving' = 'none';
    // Exalt waits of the current #enterAndLeaveExalt() that a game tick ended, not the game's Exalt attribute (debug line)
    #exaltWaitsEndedByTick = 0;
    #waitForExaltStateActive?: {
        targetState: boolean;
        resolve: (value: boolean) => void;
        finished: boolean;
    };
    #challengeCompletionObserver?: MutationObserver;
    #challengeObserverActive?: {
        predicate: () => boolean;
        resolve: () => void;
        finished: boolean;
    };
    #waitForClassConditionObserver?: MutationObserver;
    #waitForClassConditionObservedElement?: Element;
    #waitForClassConditionActive?: {
        element: Element;
        condition: () => boolean;
        resolve: (value: boolean) => void;
        finished: boolean;
    };
    #waitForInnerTextObserver?: MutationObserver;
    #waitForInnerTextObservedElement?: HTMLElement;
    #waitForInnerTextActive?: {
        el: HTMLElement;
        predicate: (text: string) => boolean;
        resolve: () => void;
        reject: (error: Error) => void;
        finished: boolean;
        timeoutId?: number;
    };

    // Game References
    #stageFunc?: ((mode: number) => string) | null;
    #getMaxChallengesFunc?: ((challenge: number) => number) | null;
    #exposedPlayer: typeof HSGlobal.exposedPlayer = null;
    // Each fast path runs on what it reads; the others fall back to the DOM. Set at each start.
    #hasStageFunc: boolean = false;
    #hasLivePlayer: boolean = false;
    #hasMaxChallenges: boolean = false;
    // The game internals found or not at the last start (shown in the timer's footer)
    #exposureParts: HSAutosingExposureParts = { fastPaths: {}, other: {} };
    #gamestate!: HSGameState;
    #subtabMemory?: HSSubtabMemory;
    // The tab the player was on, brought back after each Exalt (the game opens Buildings) and each DOM stage read
    #playerTab?: MainView;

    #autosingModal?: HSAutosingModal;

    // Strategy Caches
    readonly #phaseIndexByOption = new Map<PhaseOption, number>(phases.map((p, i) => [p, i] as const));
    #strategyPhaseRanges?: Array<{ phase: AutosingStrategyPhase; startIndex: number; endIndex: number }>;
    #phaseConfigByStage = new Map<string, AutosingStrategyPhase>();
    #finalPhaseConfig?: AutosingStrategyPhase;


    // ============================================================================
    // INITIALIZATION - CACHIIIING
    // ============================================================================

    init(): Promise<void> {
        this.isInitialized = true;
        return Promise.resolve();
    }

    #cacheSettingsElements(): boolean {
        const elements = {
            settingsTab: document.getElementById('settingstab') as HTMLButtonElement | null,
            settingsSubTab: document.getElementById('switchSettingSubTab4') as HTMLButtonElement | null,
            misc: document.getElementById('kMisc') as HTMLButtonElement | null,
            stage: document.getElementById('gameStageStatistic') as HTMLParagraphElement | null,
        };
        if (!this.#ensureElements(elements)) return false;

        this.#settingsTab = elements.settingsTab;
        this.#settingsSubTab = elements.settingsSubTab;
        this.#misc = elements.misc;
        this.#stage = elements.stage;
        return true;
    }

    #cacheChallengeElements(): boolean {
        const progressElements = {
            transcension: document.getElementById('transcensionChallengeProgress'),
            reincarnation: document.getElementById('reincarnationChallengeProgress'),
            ascension: document.getElementById('ascensionChallengeProgress'),
        };
        if (!this.#ensureElements(progressElements)) return false;
        this.#challengeProgressElements = [
            progressElements.transcension,
            progressElements.reincarnation,
            progressElements.ascension,
        ];

        for (let i = 1; i <= 15; i++) {
            const elements = {
                challengeButton: document.getElementById(`challenge${i}`) as HTMLButtonElement | null,
            };
            if (!this.#ensureElements(elements)) return false;

            this.#challengeButtons[i] = elements.challengeButton;
        }
        this.#buildChallengeAccessors();
        return true;
    }

    #cacheButtonElements(): boolean {
        const elements = {
            exitTranscBtn: document.getElementById('challengebtn') as HTMLButtonElement | null,
            exitReincBtn: document.getElementById('reincarnatechallengebtn') as HTMLButtonElement | null,
            exitAscBtn: document.getElementById('ascendChallengeBtn') as HTMLButtonElement | null,
            ascendBtn: document.getElementById('ascendbtn') as HTMLButtonElement | null,
            autoChallengeButton: document.getElementById('toggleAutoChallengeStart') as HTMLButtonElement | null,
            autoAntSacrificeButton: document.getElementById('toggleAutoSacrificeAnt') as HTMLButtonElement | null,
            autoAscendButton: document.getElementById('ascensionAutoEnable') as HTMLButtonElement | null,
            antSacrifice: document.getElementById('antSacrifice') as HTMLButtonElement | null,
            AOAG: document.getElementById('antiquitiesRuneSacrifice') as HTMLButtonElement | null,
            exalt2Btn: document.getElementById('oneChallengeCap') as HTMLButtonElement | null,
            elevatorTeleportButton: document.getElementById('elevatorTeleportButton') as HTMLButtonElement | null,
            elevatorInput: document.getElementById('elevatorTargetInput') as HTMLInputElement | null,
            upg81Btn: document.getElementById('upg81') as HTMLButtonElement | null,
        };
        if (!this.#ensureElements(elements)) return false;

        this.#exitTranscBtn = elements.exitTranscBtn;
        this.#exitReincBtn = elements.exitReincBtn;
        this.#exitAscBtn = elements.exitAscBtn;
        this.#ascendBtn = elements.ascendBtn;
        this.#autoChallengeButton = elements.autoChallengeButton;
        this.#autoAntSacrificeButton = elements.autoAntSacrificeButton;
        this.#autoAscendButton = elements.autoAscendButton;
        this.#antSacrifice = elements.antSacrifice;
        this.#AOAG = elements.AOAG;
        this.#exalt2Btn = elements.exalt2Btn;
        this.#elevatorTeleportButton = elements.elevatorTeleportButton;
        this.#elevatorInput = elements.elevatorInput;
        this.#upg81Btn = elements.upg81Btn;
        return true;
    }

    #cacheHeptractButtons(): boolean {
        const ids = [
            'chronosHepteractAuto',
            'hyperrealismHepteractAuto',
            'quarkHepteractAuto',
            'challengeHepteractAuto',
            'abyssHepteractAuto',
            'acceleratorHepteractAuto',
            'acceleratorBoostHepteractAuto',
            'multiplierHepteractAuto',
            'hepteractToQuarkTradeAuto',
        ];
        const buttonMap = Object.fromEntries(
            ids.map(id => [id, document.getElementById(id) as HTMLButtonElement | null])
        ) as Record<string, HTMLButtonElement | null>;
        if (!this.#ensureElements(buttonMap)) return false;

        this.#heptractBtns = ids.map(id => buttonMap[id]!);
        return true;
    }

    #cacheCorruptionElements(): boolean {
        const elements = {
            addCodeAllBtn: document.getElementById("addCodeAll") as HTMLButtonElement | null,
            timeCodeBtn: document.getElementById("timeCode") as HTMLButtonElement | null,
            corruptionLevelInput: document.getElementById("corruptionLevelInput") as HTMLInputElement | null,
            corruptionLevelMax: document.getElementById("corruptionLevelMax") as HTMLButtonElement | null,
        };
        if (!this.#ensureElements(elements)) return false;

        this.#addCodeAllBtn = elements.addCodeAllBtn;
        this.#timeCodeBtn = elements.timeCodeBtn;
        // The level input and Max button are checked above, then used by id (HSCorruptionLevel)
        this.#corruptionManager = new HSAutosingCorruption();
        return true;
    }

    async #cacheAmbrosiaLoadoutButtons(): Promise<boolean> {
        this.#ambrosiaSwitchesOff = HSSettings.getSetting("autosingNoAmbrosiaSwitch").isEnabled();
        if (this.#ambrosiaSwitchesOff) {
            HSLogger.log("Ambrosia loadout switches are off: the ambrosia loadout settings are not used.", this.context);
            return true;
        }

        if (!this.#findAmbrosiaLoadoutButtons()) {
            HSUI.Notify("There is a problem with the Auto-Sing settings. Check the logs for more details.", {
                notificationType: "warning"
            });
            return false;
        }
        return true;
    }

    #findAmbrosiaLoadoutButtons(): boolean {
        const earlyCubeVal = HSSettings.getSetting("autosingEarlyCubeLoadout").getValue();
        const lateCubeVal = HSSettings.getSetting("autosingLateCubeLoadout").getValue();
        const quarkVal = HSSettings.getSetting("autosingQuarkLoadout").getValue();
        const obtVal = HSSettings.getSetting("autosingObtLoadout").getValue();
        const offVal = HSSettings.getSetting("autosingOffLoadout").getValue();
        const ambrosiaVal = HSSettings.getSetting("autosingAmbrosiaLoadout").getValue();

        const elements = {
            earlyCube: document.getElementById(`blueberryLoadout${earlyCubeVal}`) as HTMLButtonElement | null,
            lateCube: document.getElementById(`blueberryLoadout${lateCubeVal}`) as HTMLButtonElement | null,
            quark: document.getElementById(`blueberryLoadout${quarkVal}`) as HTMLButtonElement | null,
            obt: document.getElementById(`blueberryLoadout${obtVal}`) as HTMLButtonElement | null,
            off: document.getElementById(`blueberryLoadout${offVal}`) as HTMLButtonElement | null,
            luck: document.getElementById(`blueberryLoadout${ambrosiaVal}`) as HTMLButtonElement | null,
        };
        // Not #ensureElements, which stops a running autosing: a slot at "None" during a run only refuses the change
        if (!this.#allElementsFound(elements)) return false;

        this.#ambrosia_early_cube = elements.earlyCube;
        this.#ambrosia_late_cube = elements.lateCube;
        this.#ambrosia_quark = elements.quark;
        this.#ambrosia_obt = elements.obt;
        this.#ambrosia_off = elements.off;
        this.#ambrosia_luck = elements.luck;
        return true;
    }

    /**
     * "Don't switch ambrosia loadouts" changed. During a run it applies from the next step;
     * otherwise the next start reads the setting.
     */
    public setAmbrosiaSwitchesOff(off: boolean): void {
        if (!this.#autosingEnabled && !this.#isStarting) return;
        if (this.#ambrosiaSwitchesOff === off) return;

        // The slots weren't looked up if the setting was on at the start
        if (!off && !this.#findAmbrosiaLoadoutButtons()) {
            HSLogger.warn("Ambrosia loadout switches stay off: an ambrosia loadout setting has no slot.", this.context);
            HSUI.Notify("Auto-Sing still won't switch ambrosia loadouts: pick a slot for each loadout first.", { notificationType: 'warning' });
            HSSettings.getSetting("autosingNoAmbrosiaSwitch").enable();
            return;
        }

        this.#ambrosiaSwitchesOff = off;
        this.#autosingModal?.refreshLoadouts();
    }

    /** "Keep the PC awake" changed. During a run it applies at once; otherwise the next start reads the setting. */
    public setKeepAwake(on: boolean): void {
        if (!this.#autosingEnabled) return;
        if (on) this.#wakeLock.start();
        else this.#wakeLock.stop();
    }

    #cacheMiscElements(): boolean {
        const elements = {
            antiquitiesRuneLockedContainer: document.getElementById('antiquitiesRuneLockedContainer') as HTMLDivElement | null,
        };
        if (!this.#ensureElements(elements)) return false;

        this.#antiquitiesRuneLockedContainer = elements.antiquitiesRuneLockedContainer;

        const gamestate = HSModuleManager.getModule<HSGameState>("HSGameState");
        if (!gamestate) {
            HSLogger.warn('HSGameState module not found during misc element caching', this.context);
            return false;
        }
        this.#gamestate = gamestate;
        this.#subtabMemory = HSModuleManager.getModule<HSSubtabMemory>("HSSubtabMemory");
        return true;
    }

    #cacheObservers(): void {
        // upg81 observer, for the antiBuyCoinBug
        if (!this.#upg81Observer && this.#upg81Btn) {
            this.#upg81Observer = new MutationObserver((mutations) => {
                for (const mutation of mutations) {
                    if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
                        const isGreen = this.#upg81Btn.classList.contains('green-background');
                        if (isGreen && this.#upg81PromiseResolve) {
                            HSLogger.debug(() => `-------> #upg81 turned green o/`, this.context);
                            this.#stopUpg81Clicking();
                            this.#upg81PromiseResolve(true);
                            this.#upg81PromiseResolve = undefined;
                            this.#upg81Observer?.disconnect();
                        }
                    }
                }
            });
        }

        // Antiquities observer, starting AOAG phase
        if (!this.#antiquitiesObserver && this.#antiquitiesRuneLockedContainer) {
            this.#antiquitiesObserver = new MutationObserver(mutations => {
                for (const mutation of mutations) {
                    if ((mutation.target as HTMLElement).style.display === 'none') {
                        HSLogger.debug(() => 'antiquitiesRuneLockedContainer found hidden - buying antiquities', this.context);
                        this.#antiquitiesObserverActivated = true;
                        this.#antiquitiesObserver?.disconnect();
                        this.#trackChain(this.#performFinalStage().catch(error => {
                            // Waits ended by a stop can throw: only an error during the run stops autosing
                            if (!this.#autosingEnabled) return;
                            HSLogger.warn(`Error during final stage: ${error instanceof Error ? error.message : String(error)}`, this.context);
                            this.stopAutosing();
                        }));
                        break;
                    }
                }
            });
        }

        // The game sets its Exalt attribute on <html> within the reset itself. Bookmark mode reads it; exposure-ready
        // mode reads player.insideSingularityChallenge, and is only woken up by it (see #waitForExaltState).
        if (!this.#exaltStateObserver) {
            this.#exaltStateObserver = new MutationObserver(() => {
                if (!this.#waitForExaltStateActive) return;
                if (this.#isInExalt() === this.#waitForExaltStateActive.targetState) {
                    this.#cleanupWaitForExaltState(true);
                }
            });
        }

        // Challenge completion observer, used to check if we're inside a specific challenge or not
        if (!this.#challengeCompletionObserver) {
            this.#challengeCompletionObserver = new MutationObserver(() => {
                if (!this.#challengeObserverActive) return;
                if (this.#challengeObserverActive.predicate()) {
                    this.#cleanupChallengeObserver();
                }
            });
        }

        // Class condition observer, 
        if (!this.#waitForClassConditionObserver) {
            this.#waitForClassConditionObserver = new MutationObserver(() => {
                if (!this.#waitForClassConditionActive) return;
                if (this.#waitForClassConditionActive.condition()) {
                    this.#cleanupWaitForClassCondition(true);
                }
            });
        }

        // Inner text observer, used for checking the stage
        if (!this.#waitForInnerTextObserver) {
            this.#waitForInnerTextObserver = new MutationObserver(() => {
                if (!this.#waitForInnerTextActive) return;
                if (this.#waitForInnerTextActive.predicate(this.#waitForInnerTextActive.el.textContent ?? "")) {
                    this.#cleanupWaitForInnerText(true);
                }
            });
        }
    }

    #cacheExposedFunctions(): void {
        this.#exposedPlayer = HSGlobal.exposedPlayer ?? null;
        this.#stageFunc = window.__HS_synergismStage ?? null;
        this.#getMaxChallengesFunc = window.__HS_getMaxChallenges ?? null;
        this.#hasStageFunc = !!this.#stageFunc;
        this.#hasLivePlayer = !!this.#exposedPlayer;
        this.#hasMaxChallenges = this.#hasLivePlayer && !!this.#getMaxChallengesFunc;

        // Not needed by the fast paths. Without the after-tack hook, waiting for a tack sleeps 5 ms instead.
        // Without the dialog hook, HSGameDialogs' watcher clicks the dialogs as they show, before autosing's
        // next step runs. Without the export output, only the quark export at each singularity's end is skipped.
        const isAfterTackHooked = HSUtils.cacheAfterTackHook();
        const isDialogHookPatched = HSGameDialogs.isHookPatched();
        const isExportOutputPatched = !!window.__HS_EXPORT_OUTPUT_PATCHED;

        this.#exposureParts = {
            fastPaths: {
                'Stage function': this.#hasStageFunc,
                'Live player': this.#hasLivePlayer,
                'Max challenges': !!this.#getMaxChallengesFunc,
            },
            other: {
                'After-tack hook': isAfterTackHooked,
                'Dialog hook': isDialogHookPatched,
                'Export output': isExportOutputPatched,
            },
        };
        const isComplete = [...Object.values(this.#exposureParts.fastPaths), ...Object.values(this.#exposureParts.other)].every(Boolean);
        const exposureMsg = `Exposure status: ${isComplete}
            (stageFunc: ${this.#hasStageFunc},
            exposedPlayer: ${this.#hasLivePlayer},
            getMaxChallengesFunc: ${!!this.#getMaxChallengesFunc},
            onAfterTackHook: ${isAfterTackHooked},
            dialogHook: ${isDialogHookPatched},
            exportOutputPatched: ${isExportOutputPatched})`;
        if (isComplete) HSLogger.debug(() => exposureMsg, this.context);
        else HSLogger.warn(exposureMsg, this.context);
    }

    async cacheAlmostEverything(): Promise<boolean> {
        if (!this.#cacheSettingsElements()) return false;
        if (!this.#cacheChallengeElements()) return false;
        if (!this.#cacheButtonElements()) return false;
        if (!this.#cacheHeptractButtons()) return false;
        if (!this.#cacheCorruptionElements()) return false;
        if (!await this.#cacheAmbrosiaLoadoutButtons()) return false;
        if (!this.#cacheMiscElements()) return false;
        return true;
    }


    // ============================================================================
    // ENABLE / DISABLE AUTOSING
    // ============================================================================

    async enableAutoSing(): Promise<void> {
        // Already running: e.g. the start toggle synced by a restart (see #startAutosing())
        if (this.#autosingEnabled) return;
        if (this.#isStarting) {
            // Stopped then started again during the same start: the toggle is ON again,
            // so start anew once the cancelled start has ended
            if (this.#startCancelled) this.#startRequestedAgain = true;
            return;
        }

        this.#isStarting = true;
        this.#startCancelled = false;
        try {
            await this.#startAutosing();
        } catch (error) {
            HSLogger.warn(`Error while starting autosing: ${escapeLogText(error instanceof Error ? error.message : String(error))}`, this.context);
            HSUI.Notify('Auto-Sing could not start. See the mod log for details.', { notificationType: 'warning' });
            this.stopAutosing();
        } finally {
            this.#isStarting = false;
        }

        if (this.#startRequestedAgain) {
            this.#startRequestedAgain = false;
            void this.enableAutoSing();
        }
    }

    /**
     * Checkpoint for a start stopped by stopAutosing() before it was marked as running.
     * stopAutosing() turned the toggle off. Cleanup waits for the settings fixer to finish.
     */
    #isStartCancelled(): boolean {
        if (!this.#startCancelled) return false;
        HSLogger.log(`Autosing start cancelled.`, this.context);
        this.#restoreHsSettings();
        return true;
    }

    // Every failed start goes through stopAutosing(), which turns the start toggle back off
    async #startAutosing(): Promise<void> {
        // First, before anything a previous run's chain could still read (elements, modal, strategy…)
        const previousRunEnded = await this.#waitForPreviousChains();
        if (this.#isStartCancelled()) return;
        if (!previousRunEnded) {
            HSLogger.warn("The previous Auto-Sing run is still running after 10 s (a strategy wait longer than that?): start cancelled.", this.context);
            HSUI.Notify("Auto-Sing could not start: the previous run is still finishing a long step. Try again in a moment.", { notificationType: 'warning' });
            this.stopAutosing();
            return;
        }

        if (!await this.cacheAlmostEverything()) { this.stopAutosing(); return; }
        if (this.#isStartCancelled()) return;

        this.#autosingModal?.destroy();
        this.#autosingModal = new HSAutosingModal();
        const strategy = await this.#loadStrategy();
        if (!strategy) { this.stopAutosing(); return; }
        if (this.#isStartCancelled()) return;

        this.#strategy = strategy;
        this.#rebuildStrategyPhaseCaches();

        if (!HSGlobal.General.isModFullyLoaded) {
            HSLogger.debug(() => "Hypersynergism is still loading. Please wait before starting Auto-Sing.", this.context);
            this.stopAutosing();
            return;
        }
        if (this.#isInExalt()) {
            const hasLeft = await this.#leaveExaltAtStart();
            if (this.#isStartCancelled()) return;
            if (!hasLeft) { this.stopAutosing(); return; }
        }

        // From here, the game's Confirms and Alerts are answered (by the dialog hook, or by the dialog watcher
        // without any patch). Cleared by #restoreHsSettings().
        HSGameDialogs.setAutosingActive(true);
        this.#settingsWork = this.#settingsFixer.fixAllSettings();
        await this.#settingsWork;
        if (this.#isStartCancelled()) return;
        this.#cacheObservers();
        this.#cacheExposedFunctions();

        this.#autosingEnabled = true;
        if (HSSettings.getSetting("autosingKeepAwake").isEnabled()) this.#wakeLock.start();
        this.#stopAtSingularitysEnd = false;
        this.#endStageDone = false;
        this.#antiquitiesObserverActivated = false;
        this.#endStagePromise = undefined;
        this.#hasWarnedMissingStageFunc = false;
        this.#storedC15 = 0;
        this.#lastBookmarkC15Score = HSAutosing.#DECIMAL_0;

        // The toggle can be OFF here: Restart pressed in review mode, after a stop. Its action
        // calls enableAutoSing(), which returns at once since autosing is now running.
        HSSettings.getSetting("startAutosing")?.enable();

        if (!await this.#validateAutosingSetupAndRequirements()) { this.stopAutosing(); return; }
        // Stopped during validation: the normal stop already ran
        if (!this.#autosingEnabled) return;

        if (!(HSSettings.getSetting("showDebugLogs")?.isEnabled() ?? false)) {
            HSGlobal.HSLogger.logLevel = ELogLevel.NONE;
        }

        this.#trackChain(this.#performAutosingLogic());
    }

    /** Keeps a chain in #chains until it has ended, whether it resolves or rejects. */
    #trackChain(chain: Promise<void>): void {
        const settled = chain.then(() => undefined, () => undefined);
        this.#chains.add(settled);
        void settled.then(() => this.#chains.delete(settled));
    }

    /**
     * Waits for the chains of the previous run to end. They do by themselves at their next flag check:
     * at most their current sleep (≤ 1 s with the default strategies, 4.5 s in the push).
     * @returns false if they're still running after 10 s (a custom strategy wait longer than that):
     * the start must not go on, the old chain would run alongside the new run.
     */
    async #waitForPreviousChains(): Promise<boolean> {
        if (this.#chains.size === 0) return true;
        HSLogger.debug(() => `Waiting for ${this.#chains.size} chain(s) of the previous run to end`, this.context);
        return await Promise.race([
            Promise.all(this.#chains).then(() => true),
            HSUtils.sleep(10000).then(() => false),
        ]);
    }

    public async restartAutosing(): Promise<void> {
        if (this.#autosingEnabled) {
            this.stopAutosing({ restarting: true });
        }
        // Stored so a stop during the delay cancels the restart
        window.clearTimeout(this.#restartTimer);
        this.#restartTimer = window.setTimeout(() => {
            this.#restartTimer = undefined;
            void this.enableAutoSing();
        }, 500);
    }

    /**
     * @param options.restarting Keeps the original settings snapshot, start toggle ON and GDS paused
     * for the next start. A stop or a failed start restores the original settings.
     * @param options.saveReplaced The game is loading another save right now: nothing is clicked in the game,
     * as the answer to a click would come once the new save is in place.
     */
    public stopAutosing(options?: { showReviewModal?: boolean, restarting?: boolean, saveReplaced?: boolean }): void {
        HSGlobal.HSLogger.logLevel = ELogLevel.ALL;

        window.clearTimeout(this.#restartTimer);
        this.#restartTimer = undefined;
        if (options?.saveReplaced) this.#settingsFixer.discardGameSettings();
        if (this.#isStarting) {
            // Also when it's already marked as running (stopped during validation),
            // so that a new start request isn't ignored
            this.#startCancelled = true;
            this.#startRequestedAgain = false;
        }

        if (!this.#autosingEnabled) {
            // A failed start stops it before it's marked as running: the start toggle is still ON,
            // and the settings may already be changed and GDS paused
            this.#disableStartToggle();
            this.#restoreHsSettings();
            return;
        }
        void this.#stopAutosingCore({
            modalDisposition: options?.showReviewModal ? 'review' : 'destroy',
            leaveExalt: !options?.saveReplaced
        });

        if (options?.restarting) {
            HSLogger.log(`Autosing stopped for a restart.`, this.context);
            return;
        }
        this.#disableStartToggle();
        this.#restoreHsSettings();
        HSLogger.log(`Autosing stopped.`, this.context);
    }

    #disableStartToggle(): void {
        const autosingSetting = HSSettings.getSetting("startAutosing");
        if (autosingSetting && autosingSetting.isEnabled()) {
            autosingSetting.disable();
        }
    }

    /**
     * Stop answering dialogs immediately. Restore settings after startup and stopped strategy chains
     * have settled, so their last actions cannot overwrite the player's restored values.
     */
    #restoreHsSettings(): void {
        HSGameDialogs.setAutosingActive(false);
        if (this.#settingsRestore) return;
        const chains = [...this.#chains];
        const work = this.#settingsWork;
        this.#settingsRestore = Promise.resolve().then(async () => {
            // A failed fixer still owns a snapshot of any settings it changed before failing.
            await work?.catch(() => undefined);
            await Promise.all(chains);
            try {
                this.#settingsFixer.restoreGameSettings();
            } catch (error) {
                HSLogger.warn(`Could not fully restore Auto-Sing's game settings: ${escapeLogText(error instanceof Error ? error.message : String(error))}`, this.context);
                HSUI.Notify('Auto-Sing could not restore all game settings. See the mod log for details.', { notificationType: 'warning' });
            } finally {
                try {
                    await HSModuleManager.getModule<HSGameData>('HSGameData')?.resumeGDS(HSAutosingSettingsFixer.GDS_PAUSE_REASON);
                } finally {
                    this.#settingsFixer.restoreUnwantedSettings();
                }
            }
        }).catch(error => {
            HSLogger.warn(`Auto-Sing settings cleanup failed: ${escapeLogText(String(error))}`, this.context);
        }).finally(() => {
            this.#settingsWork = undefined;
            this.#settingsRestore = undefined;
        });
        this.#trackChain(this.#settingsRestore);
    }

    async #stopAutosingCore(options: { modalDisposition: 'review' | 'destroy', leaveExalt: boolean }): Promise<void> {
        this.#autosingEnabled = false;
        this.#wakeLock.stop();

        // Stopped between entering Exalt 2 and leaving it: leave it, or the player stays inside.
        // Its own session answers its dialogs: the exit Alert is queued after stopAutosing() has stopped
        // autosing's answering. Without the hook, the session answers them through the DOM.
        // Not when another save is being loaded: the game would leave the Exalt on that save.
        if (options.leaveExalt && this.#exaltStep === 'entering' && this.#isInExalt()) {
            HSLogger.log('Autosing stopped inside Exalt 2: leaving it.', this.context);
            HSGameDialogs.act('autosing', { confirm: 'ok', alert: 'dismiss' }, () => this.#exalt2Btn.click());
        }
        this.#exaltStep = 'none';

        this.#antiquitiesObserver?.disconnect();
        this.#antiquitiesObserver = undefined;

        this.#upg81Observer?.disconnect();
        this.#upg81Observer = undefined;
        this.#stopUpg81Clicking();
        // Ends the wait of strategy step 999, so its chain ends (a start waits for it)
        this.#upg81PromiseResolve?.(false);
        this.#upg81PromiseResolve = undefined;
        this.#upg81Promise = undefined;

        this.#exaltStateObserver?.disconnect();
        this.#exaltStateObserver = undefined;
        this.#cleanupWaitForExaltState(false);

        this.#challengeCompletionObserver?.disconnect();
        this.#challengeCompletionObserver = undefined;
        this.#cleanupChallengeObserver();

        this.#waitForClassConditionObserver?.disconnect();
        this.#waitForClassConditionObserver = undefined;
        this.#waitForClassConditionObservedElement = undefined;
        this.#cleanupWaitForClassCondition(false);

        this.#waitForInnerTextObserver?.disconnect();
        this.#waitForInnerTextObserver = undefined;
        this.#waitForInnerTextObservedElement = undefined;
        this.#cleanupWaitForInnerText(false);
        this.#playerTab = undefined;

        if (this.#endStagePromiseResolve) {
            try { this.#endStagePromiseResolve(); } catch (e) { /* ignore */ }
            this.#endStagePromiseResolve = undefined;
        }
        this.#endStagePromise = undefined;

        if (this.#autosingModal) {
            if (options.modalDisposition === 'review') {
                this.#autosingModal.enterReviewMode();
            } else {
                this.#autosingModal.destroy();
                this.#autosingModal = undefined;
            }
        }
    }

    public closeAutosingModalAfterReview(): void {
        if (this.#autosingModal) {
            this.#autosingModal.destroy();
            this.#autosingModal = undefined;
        }
    }

    async #validateAutosingSetupAndRequirements(): Promise<boolean> {
        const singularitySetting = HSSettings.getSetting('singularityNumber') as HSNumericSetting;
        this.#targetSingularity = singularitySetting.getValue();

        this.#gameDataAPI = HSModuleManager.getModule<HSGameDataAPI>('HSGameDataAPI');
        await this.#gameDataAPI?.prepareForAutosing();
        const gameData = await this.#gameDataAPI?.getForcedGameData();

        if (!gameData) {
            HSLogger.warn("Could not get game data", this.context);
            return false;
        }
        if (gameData.highestSingularityCount < 40) {
            HSUI.Notify("AutoSing is an end-game QoL feature. S216+ is expected. Not available until you unlock EXALT2.", { notificationType: "warning" });
            return false;
        }
        if (gameData.highestSingularityCount < 216) {
            // window.confirm is the native browser dialog, not one of the game's: the dialog hook doesn't answer it.
            if (!window.confirm(`AutoSing is not fully functional until you completed EXALT6 at least once.`)) {
                return false;
            }
        }

        if (this.#targetSingularity > gameData.highestSingularityCount) {
            HSLogger.debug(() => `Target singularity bigger than highest. Going to highest.`);
            this.#targetSingularity = gameData.highestSingularityCount;
        }

        this.#elevatorInput.value = this.#targetSingularity.toString();
        this.#elevatorInput.dispatchEvent(new Event('input', { bubbles: true }));
        HSLogger.log(`Autosing requirements checked for target singularity: ${this.#targetSingularity}`, this.context);

        return true;
    }

    async #loadStrategy(): Promise<HSAutosingStrategy | null> {
        const strategySetting = HSSettings.getSetting("autosingStrategy");
        const selectedValue = strategySetting.getValue();
        const control = strategySetting.getDefinition().settingControl;

        if (!control?.selectOptions) {
            HSUI.Notify("Strategy selector not available - Autosing stopped.", { notificationType: "warning" });
            return null;
        }

        const selectedOption = control.selectOptions.find(
            opt => opt.value.toString() === HSUtils.asString(selectedValue)
        );

        if (!selectedOption) {
            HSUI.Notify("Selected strategy not found - Autosing stopped.", { notificationType: "warning" });
            return null;
        }

        const defaultNames = HSStrategyManager.getDefaultStrategyNames();
        const selectedRawName = selectedOption.value.toString();
        const strategy = defaultNames.includes(selectedRawName)
            ? await HSStrategyManager.loadDefaultStrategyByName(selectedRawName, this.context)
            : (HSStrategyManager.getStrategies().find(s => s.strategyName === selectedRawName) ?? null);

        if (!strategy) {
            HSUI.Notify(`Could not find or load strategy "${selectedRawName}" - Autosing stopped.`, { notificationType: "warning" });
            return null;
        }

        const runtimeStrategy: HSAutosingStrategy = JSON.parse(JSON.stringify(strategy));

        // Insert special steps at the start of the first phase
        this.#insertAntiBuyCoinBugStep(runtimeStrategy);
        HSLogger.log(`Loaded strategy "${selectedRawName}" (AntiBuyCoinBug step inserted as first step, and potential obt-switch step removed)`, this.context);

        return runtimeStrategy;
    }

    /** Inserts special steps at the start of the first phase's strat array, adjusting ifJump indices. */
    #insertAntiBuyCoinBugStep(strategy: any): void {
        const stepsToInsert = [
            {
                comment: "==> Anti buy coin bug",
                challengeNumber: 999,
                challengeCompletions: 0,
                challengeWaitBefore: 0,
                challengeWaitTime: 0,
                challengeMaxTime: 0
            }
        ];

        this.#insertedStepsPhase = null;
        if (!strategy || !Array.isArray(strategy.strategy) || strategy.strategy.length === 0) return;
        const firstPhase = strategy.strategy[0];
        if (!firstPhase || !Array.isArray(firstPhase.strat)) return;
        let nbSteps = stepsToInsert.length;
        this.#removedStepCount = 0;

        // Remove probable pre-existing Obt switch as first step
        if (firstPhase.strat[0]?.challengeNumber === 304) {
            firstPhase.strat.splice(0, 1);
            nbSteps--;
            this.#removedStepCount = 1;
        }

        // Insert at the start
        firstPhase.strat.unshift(...stepsToInsert);
        this.#insertedStepsPhase = firstPhase;
        this.#insertedStepCount = stepsToInsert.length;

        // Adjust ifJump.ifJumpIndex for all steps in the first phase
        for (const step of firstPhase.strat) {
            if (step.ifJump && typeof step.ifJump.ifJumpIndex === 'number') {
                step.ifJump.ifJumpIndex += nbSteps;
            }
        }
    }


    // ============================================================================
    // MAIN AUTOSING LOGIC
    // ============================================================================

    async #performAutosingLogic(): Promise<void> {
        try {
            await this.#useAddAndTimeCodes();
            if (!this.#autosingEnabled) return;

            this.#recordTimings = HSSettings.getSetting("autosingStepTimings").isEnabled();
            if (this.#recordTimings) HSAutosingRecorder.start(this.#strategy!.strategyName, this.#targetSingularity);
            else HSAutosingRecorder.clear();
            HSAutosingStepTimingsWindow.requestRefresh();

            if (this.#autosingModal) {
                let quarks: number;
                let goldenQuarks: number;
                if (this.#hasLivePlayer) {
                    quarks = Number(this.#exposedPlayer!.worlds);
                    goldenQuarks = Number(this.#exposedPlayer!.goldenQuarks);
                } else {
                    const data = await this.#gameDataAPI?.getLatestAutosingData();
                    quarks = data?.quarks ?? 0;
                    goldenQuarks = data?.goldenQuarks ?? 0;
                }
                // Stopped meanwhile: don't reset the review window, and don't enter Exalt 2 below
                if (!this.#autosingEnabled) return;
                this.#autosingModal.start(this.#strategy!, quarks, goldenQuarks, this.#exposureParts);
                this.#autosingModal.show();
            }

            await this.#performSingularity(true);
            if (!this.#autosingEnabled) return;

            // Main autosing loop
            while (this.#autosingEnabled) {
                if (this.#endStageDone || this.#antiquitiesObserverActivated) {
                    await this.#endStagePromise;
                    if (this.#autosingEnabled) {
                        await this.#performSingularity();
                        if (!this.#autosingEnabled) return;
                    }
                    continue;
                }

                // This loop is only handling pre-AOAG (When AOAG becomes buyable, AOAG and final phases are triggered without coming back here)
                while (this.#autosingEnabled && !this.#endStageDone && !this.#antiquitiesObserverActivated) {
                    await HSUtils.yield();
                    // AOAG may unlock while yielding. Do not let the stale pre-AOAG
                    // iteration start a new DOM wait that can replace a final-stage wait.
                    if (!this.#autosingEnabled || this.#endStageDone || this.#antiquitiesObserverActivated) break;
                    const stage = await this.#getStage();
                    if (!this.#autosingEnabled) return;
                    // Only the DOM stage fallback navigates to Settings on every phase.
                    if (!this.#hasStageFunc) this.#showPlayerTab();

                    try {
                        await this.#matchStageToStrategy(stage);
                    } catch (error) {
                        if (!this.#isExpectedAoagWaitSupersession(error)) throw error;
                        HSLogger.debug(() => "Pre-AOAG UI wait superseded by the AOAG final stage", this.context);
                    }
                }
            }
        } catch (error) {
            // Waits ended by a stop can throw. Stopping again would cancel a pending restart.
            if (!this.#autosingEnabled) return;
            const errorMessage = error instanceof Error ? error.message : String(error);
            HSLogger.warn(`Error during autosing logic: ${errorMessage}`, this.context);
            this.stopAutosing();
        }
    }

    async #matchStageToStrategy(stage: string | null): Promise<void> {
        if (!stage || !this.#strategy) return;

        if (!this.#strategyPhaseRanges) this.#rebuildStrategyPhaseCaches();

        if (stage === 'final') {
            const finalPhase = this.#finalPhaseConfig;
            if (!finalPhase) { HSLogger.warn("No final phase found in strategy - Autosing stopped.", this.context); this.stopAutosing(); return; }
            await this.#executePhase(finalPhase);
            return;
        }

        const cachedPhaseConfig = this.#phaseConfigByStage.get(stage);
        if (cachedPhaseConfig) {
            await this.#executePhase(cachedPhaseConfig);
            return;
        }

        // Resolve a stage once, then cache its phase for subsequent singularities.
        let stageStartIndex = -1;
        let stageEndIndex = -1;

        for (let dashIndex = stage.indexOf('-'); dashIndex !== -1; dashIndex = stage.indexOf('-', dashIndex + 1)) {
            const si = this.#getPhaseIndex(stage.slice(0, dashIndex) as PhaseOption);
            if (si === -1) continue;
            const ei = this.#getPhaseIndex(stage.slice(dashIndex + 1) as PhaseOption);
            if (ei !== -1) { stageStartIndex = si; stageEndIndex = ei; break; }
        }

        if (stageStartIndex === -1) {
            stageStartIndex = this.#getPhaseIndex("singularity" as PhaseOption);
            stageEndIndex = this.#getPhaseIndex("end" as PhaseOption);
        }
        if (stageStartIndex === -1 || stageEndIndex === -1) { HSLogger.warn(`Unknown stage ${stage} - Autosing stopped.`, this.context); this.stopAutosing(); return; }

        const phaseConfig = this.#strategyPhaseRanges!.find((r) => stageStartIndex >= r.startIndex && stageEndIndex <= r.endIndex)?.phase ?? null;
        if (!phaseConfig) { HSLogger.warn(`No strategy phase matched for stage ${stage} - Autosing stopped.`, this.context); this.stopAutosing(); return; }
        this.#phaseConfigByStage.set(stage, phaseConfig);
        await this.#executePhase(phaseConfig);
    }


    // ============================================================================
    // PHASE EXECUTION
    // ============================================================================

    async #executePhase(
        phaseConfig: AutosingStrategyPhase,
        options?: {
            phaseLabelOverride?: string;
            ignoreObserverActivated?: boolean;
        }
    ): Promise<void> {
        const phaseLabelOverride = options?.phaseLabelOverride;
        const ignoreObserverActivated = options?.ignoreObserverActivated;
        const phaseLabel = phaseLabelOverride ?? `${phaseConfig.startPhase}-${phaseConfig.endPhase}`;
        // At every phase run: the step lines below don't name their phase
        HSLogger.debug(() => `===== Executing phase: ${phaseLabel} =====`, this.context);
        this.#autosingModal?.setCurrentPhase(phaseLabel);
        const passRecord = this.#recordTimings ? HSAutosingRecorder.startPass(phaseLabel) : undefined;

        const isEndPhase = phaseConfig.endPhase === "end";
        for (let i = 0; i < phaseConfig.strat.length; i++) {
            if (this.#autosingModal?.getIsPaused()) await this.#waitIfAutosingPaused();

            // Autosing disabled or AOAG observer activated
            if (!this.#autosingEnabled || (this.#antiquitiesObserverActivated && !isEndPhase && !ignoreObserverActivated)) {
                this.#autosingModal?.recordPhase(phaseLabel);
                if (passRecord) HSAutosingRecorder.endPass(passRecord, this.#autosingEnabled ? 'aoag' : 'stopped');
                return;
            }

            const stepStartedAt = passRecord ? performance.now() : 0;
            const jumpIndex = await this.#executeStrategyAction(phaseConfig, i, passRecord);
            if (passRecord) HSAutosingRecorder.step(passRecord, phaseConfig.strat[i], i, this.#stepNumber(phaseConfig, i), stepStartedAt, jumpIndex);
            if (typeof jumpIndex === 'number') {
                // set loop index to jumpIndex-1 because the for-loop will increment it
                i = jumpIndex - 1;
            }
            this.#prevActionTime = performance.now();
        }

        if (phaseConfig.endPhase === "end") this.#endStageDone = true;

        this.#autosingModal?.recordPhase(phaseLabel);
        if (passRecord) HSAutosingRecorder.endPass(passRecord, 'done');
    }

    /** A step's number in the strategy editor (from 1), 0 for a step inserted at load. */
    #stepNumber(phaseConfig: AutosingStrategyPhase, index: number): number {
        if (phaseConfig !== this.#insertedStepsPhase) return index + 1;
        if (index < this.#insertedStepCount) return 0;
        return index + 1 - this.#insertedStepCount + this.#removedStepCount;
    }

    /** @param passRecord With "Record step timings" on: the recorder's pass, which gets the time slept before the step */
    async #executeStrategyAction(phaseConfig: AutosingStrategyPhase, actionIndex: number, passRecord?: HSAutosingPassRecord): Promise<number | null> {
        const challenge = phaseConfig.strat[actionIndex];

        const wb = challenge.challengeWaitBefore ?? 0;
        if (wb > 0) {
            const waitStartedAt = passRecord ? performance.now() : 0;
            await HSUtils.sleepUntilElapsed(this.#prevActionTime, wb, this.context);
            if (passRecord) passRecord.waitMs = performance.now() - waitStartedAt;
            // Stopped during the wait: don't act on the game (or restart/stop autosing again with 902/903)
            if (!this.#autosingEnabled) return null;
        }

        // "Step N", as the strategy editor numbers the steps
        const tag = () => `Step ${this.#stepNumber(phaseConfig, actionIndex)}`;
        const actionText = () => `${SPECIAL_ACTION_BY_ID.get(challenge.challengeNumber)?.label ??challenge.challengeNumber} (${challenge.challengeNumber})`;
        switch (challenge.challengeNumber) {
            case SET_CORRUPTION_LEVEL_VALUE:
                HSLogger.debug(() => `${tag()} - SA: ${actionText()}: ${challenge.corruptionLevel ?? 0} (${challenge.ascendAfterCorruption === false ? 'next ascension' : 'ascend now'})`, this.context);
                if (challenge.ascendAfterCorruption === false) this.#corruptionManager.setLevel(challenge.corruptionLevel ?? 0);
                else await this.#setCorruptionLevelAndAscend(challenge.corruptionLevel ?? 0);
                break;
            case IF_JUMP_VALUE:
                return this.#handleIfJumpAction(challenge, phaseConfig, tag);
            default:
                if (challenge.challengeNumber >= 100) {
                    HSLogger.debug(() => `${tag()} - SA: ${actionText()}`, this.context);
                    await this.#performSpecialAction(challenge.challengeNumber, challenge.challengeWaitTime, challenge.challengeMaxTime);
                } else {
                    HSLogger.debug(() => `${tag()} - C${challenge.challengeNumber}: waiting for ${challenge.challengeCompletions ?? 0} completions, then wait ${challenge.challengeWaitTime}ms (max time: ${challenge.challengeMaxTime}ms)`, this.context);
                    await this.#waitForCompletion(
                        challenge.challengeNumber,
                        challenge.challengeCompletions ?? 0,
                        challenge.challengeMaxTime,
                        challenge.challengeWaitTime,
                        tag,
                    );
                }
        }
        return null;
    }

    /** The level is only a selection until the reset; never skip it just because `next` already matches. */
    async #setCorruptionLevelAndAscend(level: number): Promise<void> {
        this.#corruptionManager.setLevel(level);
        const insideAscensionChallenge = this.#hasLivePlayer
            ? this.#exposedPlayer!.currentChallenge.ascension !== 0
            : (this.#challengeProgressElements[2]?.textContent ?? '').trim() !== '';
        if (insideAscensionChallenge) {
            // Exiting supplies the ascension reset and records C15's score before its coins are cleared.
            // A plain Ascend here would reset the coins while leaving the challenge active, losing that score.
            if (!this.#hasLivePlayer) this.#getChallengeAccessor(15).getCompletions();
            this.#clickResetButton(this.#exitAscBtn);
        } else {
            this.#clickResetButton(this.#ascendBtn);
        }
        // Normally synchronous (or the patched dialog resolves in a microtask): no polling or tick delay.
        // Without the dialog hook, let a displayed confirmation finish before another strategy action runs.
        if (!HSGameDialogs.isQueueIdle()) await HSGameDialogs.whenQueueIdle();
    }

    #handleIfJumpAction(challenge: Challenge, phaseConfig: AutosingStrategyPhase, tag: () => string): number | null {
        const jump = challenge.ifJump;
        const mode = jump?.ifJumpMode;
        const operator = jump?.ifJumpOperator;
        const jumpIndex = jump?.ifJumpIndex;
        // condition: "C9 (12) > 5", with the values read
        const logIfJump = (condition: string, jumped: boolean) => HSLogger.debug(() => {
            const outcome = !jumped ? "no jump"
                : jumpIndex! >= phaseConfig.strat.length ? "jump to the end of the phase"
                : `jump to step ${this.#stepNumber(phaseConfig, jumpIndex!)}`;
            return `${tag()} - IF ${escapeLogText(condition)} (${IF_JUMP_VALUE}): ${outcome}`;
        }, this.context);

        switch (mode) {
            case "challenges": {
                const ifIdx = jump!.ifJumpChallenge ?? -1;
                const value = jump!.ifJumpValue ?? 0;
                const completions = this.#hasLivePlayer && ifIdx >= 1 && ifIdx <= 15
                    ? (ifIdx === 15
                        ? this.#exposedPlayer!.challenge15Exponent
                        : this.#exposedPlayer!.challengecompletions[ifIdx])
                    : (ifIdx >= 1 && ifIdx <= 15
                        ? this.#getChallengeAccessor(ifIdx).getCompletions().toNumber()
                        : 0);
                const shouldJump = jumpIndex !== undefined &&
                    ((operator === ">" && completions > value) ||
                        (operator === "<" && completions < value));
                logIfJump(`C${ifIdx} (${completions}) ${operator} ${value}`, shouldJump);
                if (shouldJump) {
                    return jumpIndex;
                }
                break;
            }
            case "stored_c15": {
                const exponent = jump!.ifJumpMultiplier ?? 0;
                const c15Score = this.#hasLivePlayer
                    ? this.#exposedPlayer!.challenge15Exponent
                    : this.#getChallengeAccessor(15).getCompletions().toNumber();
                const threshold = this.#storedC15 * 10 ** exponent;
                const shouldJump = jumpIndex !== undefined &&
                    ((operator === ">" && threshold > c15Score) ||
                        (operator === "<" && threshold < c15Score));
                logIfJump(`stored C15 × 10^${exponent} (${threshold}) ${operator} current C15 (${c15Score})`, shouldJump);
                if (shouldJump) {
                    return jumpIndex;
                }
                break;
            }
        }
        return null;
    }


    // ============================================================================
    // SPECIAL ACTIONS
    // ============================================================================

    async #performSpecialAction(actionId: number, waitTime: number, maxTime: number): Promise<void> {
        switch (actionId) {
            case 101: // Exit Transcension challenge
                this.#clickResetButton(this.#exitTranscBtn);
                break;
            case 102: // Exit Reincarnation challenge
                this.#clickResetButton(this.#exitReincBtn);
                break;
            case 103: // Exit Ascension challenge
                if (!this.#hasLivePlayer) this.#getChallengeAccessor(15).getCompletions();
                this.#clickResetButton(this.#exitAscBtn);
                break;
            case 104: // Ascend
                this.#clickResetButton(this.#ascendBtn);
                break;
            case 151: // Wait (done in the waitBefore)
                break;
            case 152: // Ant sac
                this.#antSacrifice.click();
                break;
            case 153: // Auto Challenge Toggle
                this.#autoChallengeButton.click();
                this.#clickResetButton(this.#exitTranscBtn);
                this.#clickResetButton(this.#exitReincBtn);
                break;
            case 154: // Auto Ant-Sac Toggle
                this.#autoAntSacrificeButton.click();
                break;
            case 155: // Auto Ascend Toggle
                this.#autoAscendButton.click();
                break;
            case 211:
            case 212:
            case 213:
            case 214: // Max C11-C14
                await this.#maxC11to14WithC10((actionId - 200) as 11 | 12 | 13 | 14, maxTime);
                break;
            case 215: // store C15
                this.#storedC15 = this.#hasLivePlayer
                    ? this.#exposedPlayer!.challenge15Exponent
                    : this.#getChallengeAccessor(15).getCompletions().toNumber();
                break;
            case 301: // Early Cube
                await this.#setAmbrosiaLoadout(this.#ambrosia_early_cube);
                break;
            case 302: // Late Cube
                await this.#setAmbrosiaLoadout(this.#ambrosia_late_cube);
                break;
            case 303: // Quark
                await this.#setAmbrosiaLoadout(this.#ambrosia_quark);
                break;
            case 304: // Obt loadout
                await this.#setAmbrosiaLoadout(this.#ambrosia_obt);
                break;
            case 305: // Off loadout
                await this.#setAmbrosiaLoadout(this.#ambrosia_off);
                break;
            case 306: // Ambrosia loadout
                await this.#setAmbrosiaLoadout(this.#ambrosia_luck);
                break;
            case 601:
            case 602:
            case 603:
            case 604:
            case 605:
            case 606:
            case 607:
            case 608:
            case 609:
            case 610:
                await this.#C1to10UntilNoMoreCompletions((actionId - 600) as (1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10), waitTime, maxTime);
                break;
            case 701:
            case 702:
            case 703:
            case 704:
            case 705:
            case 706:
            case 707:
            case 708:
            case 709:
                this.#heptractBtns[actionId - 701]?.click();
                break;
            case 901:
                this.#AOAG.click();
                break;
            case 902: // Restart AutoSing
                this.restartAutosing();
                break;
            case 903: // Stop AutoSing
                this.stopAutosing();
                break;
            case 999: // Anti buy coin bug, in order to be inserted in the strategy
                await this.#waitForGreenUpg81();
                break;
            default:
                HSLogger.warn(`Unknown special action ${actionId}`, this.context);
        }
    }


    // ============================================================================
    // CHALLENGE RESOLUTION
    // ============================================================================

    /** @param stepTag The strategy step's "Step N", for the timeout warning (none outside a step) */
    async #waitForCompletion(
        challengeIndex: number,
        minCompletions: number,
        maxTime: number = 99999999,
        waitTime: number = 0,
        stepTag?: () => string
    ): Promise<void> {
        const sleepInterval = 5;
        const accessor = this.#getChallengeAccessor(challengeIndex);
        const challengeBtn = accessor.button;

        // Fast path: use exposedPlayer.currentChallenge instead of MutationObserver/class polling.
        // player.currentChallenge stores the absolute button index (1-15) per tier, 0 = not active.
        // Multiple tiers can be active simultaneously, but each challenge maps to exactly one field.
        if (this.#hasLivePlayer) {
            const p = this.#exposedPlayer!;
            const isChallengeActive = challengeIndex <= 5
                ? () => p.currentChallenge.transcension === challengeIndex
                : challengeIndex <= 10
                    ? () => p.currentChallenge.reincarnation === challengeIndex
                    : () => p.currentChallenge.ascension === challengeIndex;

            // Challenge state is advanced by the game tack. Retrying faster than that
            // only floods the DOM event handlers and can delay the tack we need.
            while (this.#autosingEnabled && !isChallengeActive()) {
                this.#fastDoubleClick(challengeBtn!);
                if (!isChallengeActive()) await HSUtils.waitForNextTack();
            }
        } else {
            const progressUpdated = this.#waitForInnerText(
                accessor.levelElement!,
                text => text.trim().length > 0,
                true
            );
            this.#fastDoubleClick(challengeBtn!);
            await progressUpdated;
        }

        const endTime = performance.now() + maxTime;

        // Fast path: C1-C15 with exposed player: no DOM reads, no Decimal.
        // C1-C14: challengecompletions[i] capped by getMaxChallenges(i).
        // C15: challenge15Exponent (raw score, unbounded maxPossible = Infinity never fires).
        if (this.#hasMaxChallenges) {
            const p2 = this.#exposedPlayer!;
            const isC15 = challengeIndex === 15;
            const maxPossible = isC15 ? Infinity : this.#getMaxChallengesFunc!(challengeIndex);
            let current = 0;

            while (this.#autosingEnabled) {
                const now = performance.now();
                if (now >= endTime) {
                    if (challengeIndex <= 10 && minCompletions !== 0) {
                        HSLogger.warn(`-------> ${stepTag ? `${stepTag()} - ` : ""}Timeout: C${challengeIndex} only reached ${current}/${minCompletions} completions within ${maxTime} ms`, this.context);
                    }
                    return;
                }

                current = isC15 ? p2.challenge15Exponent : p2.challengecompletions[challengeIndex];
                if (current >= maxPossible || current >= minCompletions) {
                    if (waitTime > 0) await HSUtils.sleep(waitTime);
                    HSLogger.debug(() => `-------> C${challengeIndex}: ${current} ${isC15 ? 'exponent' : 'completions'} reached`, this.context);
                    return;
                }

                const remaining = endTime - now;
                remaining < sleepInterval ? await HSUtils.sleep(remaining) : await HSUtils.waitForNextTack();
            }
        } else {
            // Fallback: DOM text parsing + Decimal
            const getLevelText = accessor.getLevelText;
            const getCompletions = accessor.getCompletions;
            const maxPossible = accessor.getGoal();
            const minCompletionsDecimal = minCompletions === 0 ? HSAutosing.#DECIMAL_0 : new Decimal(minCompletions);
            let lastText = '';
            let currentCompletions = HSAutosing.#DECIMAL_0;

            while (this.#autosingEnabled) {
                const now = performance.now();
                if (now >= endTime) {
                    if (challengeIndex <= 10 && minCompletions !== 0) {
                        HSLogger.warn(`-------> ${stepTag ? `${stepTag()} - ` : ""}Timeout: C${challengeIndex} only reached ${currentCompletions}/${minCompletions} completions within ${maxTime}ms`, this.context);
                    }
                    return;
                }

                const rawText = getLevelText();
                if (rawText !== lastText) {
                    lastText = rawText;
                    currentCompletions = getCompletions();
                }

                // An empty progress row: the game has exited the challenge (e.g. maxed), no more completions
                const exited = rawText.trim() === '';
                if (exited || currentCompletions.gte(maxPossible) || currentCompletions.gte(minCompletionsDecimal)) {
                    if (waitTime > 0) await HSUtils.sleep(waitTime);
                    HSLogger.debug(() => `-------> C${challengeIndex}: ${exited ? 'exited by the game' : `${currentCompletions} completions reached`}`, this.context);
                    return;
                }

                const remaining = endTime - now;
                await HSUtils.sleep(remaining < sleepInterval ? remaining : sleepInterval);
            }
        }
    }

    async #maxC11to14WithC10(challengeIndex: 11 | 12 | 13 | 14, maxTime = 2000): Promise<void> {
        await this.#waitForCompletion(challengeIndex, 0, 0, 0);
        await this.#waitForCompletion(10, 0, 0, 0);

        const accessor = this.#getChallengeAccessor(challengeIndex);
        const levelElement = accessor.levelElement;

        // Fast path: no DOM text parsing, no Decimal
        if (this.#hasMaxChallenges) {
            const maxPossible = this.#getMaxChallengesFunc!(challengeIndex);
            const deadline = performance.now() + maxTime;

            // Read exposed state after each game tack. The old fast path waited on a
            // hidden DOM element to mutate, which could consume the entire timeout
            // even after the challenge had already reached its cap.
            while (
                this.#autosingEnabled
                && this.#exposedPlayer!.challengecompletions[challengeIndex] < maxPossible
                && performance.now() < deadline
            ) {
                await HSUtils.waitForNextTack();
            }
        } else {
            // Fallback: DOM text parsing + Decimal. Once maxed, the game exits the challenge and empties its
            // progress row (challengeExit): nothing left to wait for
            const getCompletions = accessor.getCompletions;
            const maxPossible = accessor.getGoal();
            const isDone = () => accessor.getLevelText().trim() === '' || getCompletions().gte(maxPossible);
            if (isDone()) return;

            await new Promise<void>((resolve) => {
                if (this.#challengeObserverActive) {
                    this.#cleanupChallengeObserver();
                }

                let timeoutId: number | undefined;
                const resolveAndClearTimeout = (): void => {
                    if (timeoutId !== undefined) window.clearTimeout(timeoutId);
                    resolve();
                };

                this.#challengeObserverActive = {
                    predicate: isDone,
                    resolve: resolveAndClearTimeout,
                    finished: false,
                };

                this.#challengeCompletionObserver?.disconnect();
                this.#challengeCompletionObserver?.observe(levelElement!, { childList: true, characterData: true, subtree: true });
                if (this.#challengeObserverActive.predicate()) this.#cleanupChallengeObserver();
                if (this.#challengeObserverActive) {
                    timeoutId = window.setTimeout(() => this.#cleanupChallengeObserver(), maxTime);
                }
            });
        }
    }

    async #C1to10UntilNoMoreCompletions(challengeIndex: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10, initialWaitTime: number, maxTime: number): Promise<void> {
        await this.#waitForCompletion(challengeIndex, 0, 0, 0);
        await HSUtils.sleep(initialWaitTime);

        // Fast path: use exposedPlayer.challengecompletions instead of MutationObserver/class polling.
        if (this.#hasMaxChallenges) {
            const p = this.#exposedPlayer!;
            const maxPossible = this.#getMaxChallengesFunc!(challengeIndex);
            let currentCompletions = p.challengecompletions[challengeIndex];
            let timeSinceNoMoreCompletion = performance.now();
            let deadline = timeSinceNoMoreCompletion + maxTime;

            while (this.#autosingEnabled) {
                const now = performance.now();
                const newCompletions = p.challengecompletions[challengeIndex];
                if (newCompletions !== currentCompletions) {
                    currentCompletions = newCompletions;
                    timeSinceNoMoreCompletion = now;
                    deadline = now + maxTime;
                }

                if (now >= deadline || currentCompletions >= maxPossible) {
                    if (HSLogger.isDebugEnabled) HSLogger.debug(() => `-------> C${challengeIndex}: maxed or no more completions after ${maxTime}ms`, this.context);
                    return;
                }

                await HSUtils.waitForNextTack();
            }
        } else {
            // Fallback: DOM text parsing + Decimal
            const accessor = this.#getChallengeAccessor(challengeIndex);
            const getLevelText = accessor.getLevelText;
            const getCompletions = accessor.getCompletions;
            const maxPossible = accessor.getGoal();
            let c1to10CurrentCompletions = getCompletions();
            let timeSinceNoMoreCompletion = performance.now();
            let lastRawText = getLevelText();

            while (this.#autosingEnabled) {
                const now = performance.now();
                const rawText = getLevelText();
                if (rawText !== lastRawText) {
                    lastRawText = rawText;
                    const newCompletions = getCompletions();
                    if (!newCompletions.eq(c1to10CurrentCompletions)) {
                        c1to10CurrentCompletions = newCompletions;
                        timeSinceNoMoreCompletion = now;
                    }
                }

                if (now >= timeSinceNoMoreCompletion + maxTime || c1to10CurrentCompletions.gte(maxPossible)) {
                    if (HSLogger.isDebugEnabled) HSLogger.debug(() => `-------> C${challengeIndex}: maxed or no more completions after ${maxTime}ms`, this.context);
                    return;
                }

                await HSUtils.waitForNextTack();
            }
        }
    }


    // ============================================================================
    // STAGE
    // ============================================================================

    static #stageLabelPrefix?: Promise<string | undefined>;

    /** The translated "Current Game Section:" part of the stage statistic (text before {{stage}}), loaded once. */
    static #getStageLabelPrefix(): Promise<string | undefined> {
        const placeholder = '@@HS_STAGE@@';
        HSAutosing.#stageLabelPrefix ??= HSUtils.getGameTranslation('statistics.gameStage', { stage: placeholder })
            .then(text => text?.split(placeholder)[0].trim() || undefined);
        return HSAutosing.#stageLabelPrefix;
    }

    async #getStage(): Promise<string> {
        if (!this.#autosingEnabled) return '';
        if (this.#hasStageFunc) {
            // Fast path with the exposed function: never fall through to DOM navigation.
            // A transient throw during a sing transition returns '' so the wait
            // loop retries on the next tick rather than navigating to Settings.
            try {
                return this.#stageFunc!(0);
            } catch (error) {
                HSLogger.debug(() => `Error getting stage from stageFunc: ${error}`, this.context);
                return '';
            }
        } else {
            // No fast path: warn once, and fall back to DOM navigation.
            if (!this.#hasWarnedMissingStageFunc) {
                HSLogger.warn("Performance Warning: 'synergismStage' not exposed (no Tampermonkey?)", this.context);
                this.#hasWarnedMissingStageFunc = true;
            }
            try {
                // The label is translated ("Current Game Section: {{stage}}"): use the player's language,
                // English kept as fallback. The stage value itself is an internal, untranslated id.
                const stagePrefix = await HSAutosing.#getStageLabelPrefix();
                const extractStage = (text: string): string | null => {
                    if (stagePrefix && text.includes(stagePrefix)) return text.slice(text.indexOf(stagePrefix) + stagePrefix.length).trim();
                    return text.match(STAGE_REGEX)?.[1] ?? null;
                };

                // Arm the observer before navigation: a fresh render may happen
                // immediately, or on a later UI tick. Existing text is not evidence
                // that the game has updated the stage for this read.
                const stageUpdate = this.#waitForInnerText(this.#stage, t => extractStage(t) !== null, true);
                const isOnStageTab =
                    this.#settingsTab.classList.contains('active-tab') &&
                    this.#settingsSubTab.classList.contains('active-subtab') &&
                    document.getElementById('miscStats')?.classList.contains('activeStats');

                try {
                    if (!isOnStageTab) {
                        // A tab the player opened since the last read is the one to bring back
                        this.#notePlayerTab();
                        this.#settingsTab.click();
                        this.#settingsSubTab.click();
                        this.#misc.click();
                    }
                } catch (e) {
                    this.#cleanupWaitForInnerText(false, e instanceof Error ? e : new Error(String(e)));
                }

                await stageUpdate;
                const stageText = extractStage(this.#stage?.textContent ?? "");

                HSLogger.warn(`Current stage: ${stageText}`, this.context);
                return stageText || '';
            } catch (e) {
                if (this.#isExpectedAoagWaitSupersession(e)) {
                    HSLogger.debug(() => "Stage UI wait superseded by the AOAG final stage", this.context);
                    return '';
                }
                if (this.#autosingEnabled) {
                    HSLogger.warn(`Could not read a fresh game stage; Autosing stopped: ${e}`, this.context);
                    this.stopAutosing();
                }
            }
            return '';
        }
    }


    // ============================================================================
    // SINGULARITY LOGIC
    // ============================================================================

    async #performSingularity(skipRecord: boolean = false): Promise<void> {
        HSLogger.debug(() => "Performing Singularity...", this.context);
        const startedAt = this.#recordTimings ? performance.now() : 0;

        let q = 0;
        let gq = 0;
        let c15ScoreBeforeSinging: Decimal;
        if (this.#hasLivePlayer) {
            c15ScoreBeforeSinging = new Decimal(this.#exposedPlayer!.challenge15Exponent);
        } else {
            // A GDS fetch right after a singularity lags, so the amounts are read before it for bookmarklet:
            // each golden quark gain recorded is then the previous singularity's
            const data = await this.#gameDataAPI?.getLatestAutosingData();
            q = data?.quarks ?? 0;
            gq = data?.goldenQuarks ?? 0;
            c15ScoreBeforeSinging = this.#getChallengeAccessor(15).getCompletions();
            this.#lastBookmarkC15Score = HSAutosing.#DECIMAL_0;
        }

        const happyHourStackAmount = this.#gameDataAPI?.getEventData()?.HAPPY_HOUR_BELL.amount ?? 0;

        // antiBuyCoinBug setup (hard-coded inserted first step of the strategy should ensure this promise is resolved)
        this.#upg81Promise = new Promise<boolean>((resolve) => { this.#upg81PromiseResolve = resolve; });
        this.#upg81Observer?.observe(this.#upg81Btn, { attributes: true, attributeFilter: ['class'] });

        this.#notePlayerTab();
        if (!await this.#enterAndLeaveExalt()) {
            if (this.#autosingEnabled) {
                HSLogger.warn("Failed to enter and leave Exalt 2. Auto-Sing stopped.", this.context);
                this.stopAutosing();
            }
            return;
        }
        // Stopped while leaving the Exalt: don't record the singularity or switch the loadout
        // (its Alert would be shown, autosing's answering has stopped)
        if (!this.#autosingEnabled) return;

        // The Exalt left the player on Buildings: back to their tab before anything else is awaited
        this.#showPlayerTab();

        this.#endStageDone = false;
        this.#antiquitiesObserverActivated = false;

        if (this.#hasLivePlayer) {
            // The vanilla Teleport function is simply 1) doing some checks (everything true for us wanting to go lower),
            // 2) updates singularityCount, 3) calls a function to update the UI...
            // So maybe we can skip everything except singularityCount update...
            this.#exposedPlayer!.singularityCount = this.#targetSingularity;
        } else {
            this.#elevatorTeleportButton.click();
        }

        if (this.#hasLivePlayer) {
            // Entering the Exalt pays this singularity's golden quarks: read them after it
            q = Number(this.#exposedPlayer!.worlds);
            gq = Number(this.#exposedPlayer!.goldenQuarks);
        }
        const qGain = Math.max(0, q - this.#previousQuarkAmount);
        const gqGain = Math.max(0, gq - this.#previousGoldenQuarkAmount);
        this.#previousQuarkAmount = q;
        this.#previousGoldenQuarkAmount = gq;

        if (skipRecord) {
            // The singularity done at start isn't recorded: the first recorded one starts after it
            this.#autosingModal?.restartSingularityTimer();
        } else {
            this.#autosingModal?.recordSingularity(gqGain, gq, qGain, q, happyHourStackAmount, c15ScoreBeforeSinging);
        }
        const recordedAt = this.#recordTimings ? performance.now() : 0;
        if (this.#recordTimings) {
            HSAutosingRecorder.singularity(!skipRecord, gqGain, qGain, c15ScoreBeforeSinging.toNumber());
            HSAutosingStepTimingsWindow.requestRefresh();
        }

        HSLogger.debug(() => "===== Singularity performed =====", this.context);

        // antiBuyCoinBug next step: loop-click upg81 until it turns green (upg81Promise resolved)
        this.#startUpg81Clicking();

        // Obt switch so we start producing Obt ASAP every sing
        await this.#setAmbrosiaLoadout(this.#ambrosia_obt);

        let stage;
        do {
            // Yield before checking if the stage is allowed
            await HSUtils.yield();
            stage = await this.#getStage();
        } while (this.#autosingEnabled && !this.#isAllowedStage(stage));
        if (!this.#autosingEnabled) return;
        // The DOM stage fallback left the player on Settings
        if (!this.#hasStageFunc) this.#showPlayerTab();
        HSLogger.debug(() => `Reached allowed starting stage: ${stage} (performSingularity)`, this.context);

        this.#observeAntiquitiesRune();
        this.#prevActionTime = performance.now();
        if (this.#recordTimings) HSAutosingRecorder.transition(startedAt, recordedAt);
    }

    async #enterAndLeaveExalt(): Promise<boolean> {
        const startedAt = performance.now();
        this.#exaltWaitsEndedByTick = 0;
        try {
            this.#exaltStep = 'entering';
            this.#exalt2Btn.click();
            // Stopped meanwhile: #stopAutosingCore() already left the Exalt. A second click would enter it again.
            if (!await this.#waitForExaltState(true) || !this.#autosingEnabled) return false;

            this.#exaltStep = 'leaving';
            this.#exalt2Btn.click();
            const left = await this.#waitForExaltState(false);
            if (left) HSLogger.debug(() => `Exalt 2 entered and left in ${(performance.now() - startedAt).toFixed(1)} ms, ${this.#exaltWaitsEndedByTick === 0 ? "without waiting for a game tick" : `${this.#exaltWaitsEndedByTick} wait(s) ended by a game tick`}`, this.context);
            return left;
        } finally {
            this.#exaltStep = 'none';
        }
    }

    /**
     * Started inside an Exalt: asks the player whether to leave it. window.confirm blocks the page, so nothing
     * changes before the answer. The player said yes: the game's exit dialogs are answered (without Antiquities,
     * the Exalt run is lost). #waitForExaltState() can't be used yet (autosing isn't marked as running).
     * @returns true once outside the Exalt
     */
    async #leaveExaltAtStart(): Promise<boolean> {
        if (!window.confirm("You are inside an Exalt. Leave it and start Auto-Sing?\n\nWithout Antiquities, the Exalt is not completed.")) {
            HSLogger.log("Auto-Sing not started: the player stays inside the Exalt.", this.context);
            return false;
        }

        const exaltBtn = HSUtils.getActiveExaltElement();
        if (!exaltBtn) {
            HSLogger.warn("Could not find the active Exalt to leave it.", this.context);
            HSUI.Notify("Auto-Sing could not leave the Exalt. Leave it yourself, then start Auto-Sing again.", { notificationType: 'warning' });
            return false;
        }
        HSLogger.log(`Leaving the Exalt (${exaltBtn.id}) before starting.`, this.context);
        HSGameDialogs.act('autosing', { confirm: 'ok', alert: 'dismiss' }, () => exaltBtn.click());

        const deadline = performance.now() + 5000;
        while (this.#isInExalt()) {
            if (this.#startCancelled) return false;
            if (performance.now() > deadline) {
                HSLogger.warn("Still inside the Exalt 5 s after leaving it.", this.context);
                HSUI.Notify("Auto-Sing could not leave the Exalt. Leave it yourself, then start Auto-Sing again.", { notificationType: 'warning' });
                return false;
            }
            await HSUtils.sleep(50);
        }
        return true;
    }


    // ============================================================================
    // FINAL STAGE 
    // ============================================================================

    async #performFinalStage(): Promise<void> {
        if (!this.#autosingEnabled || this.#endStagePromise) return;

        this.#endStagePromise = new Promise<void>(resolve => { this.#endStagePromiseResolve = resolve; });

        const aoagPhase = this.#strategy?.aoagPhase ?? createDefaultAoagPhase();
        aoagPhase.phaseId = AOAG_PHASE_ID;

        // AOAG needs level 0 applied before its steps; ordinary phase entry performs no reset.
        await this.#setCorruptionLevelAndAscend(0);
        if (!this.#autosingEnabled) return;

        await this.#executePhase(aoagPhase, {
            phaseLabelOverride: AOAG_PHASE_NAME,
            ignoreObserverActivated: true
        });
        // Stopped during the AOAG phase: don't go on with the final phase (corruptions, Ascend…)
        if (!this.#autosingEnabled) return;

        this.#prevActionTime = performance.now();
        await this.#matchStageToStrategy('final');
        if (!this.#autosingEnabled) return; // If the user stopped during the very last step

        // Export to gather a few quarks
        await this.#setAmbrosiaLoadout(this.#ambrosia_quark);
        const exportSynergism = window.__HS_exportSynergism;
        if (typeof exportSynergism === 'function' && window.__HS_EXPORT_OUTPUT_PATCHED) {
            window.__HS_SUPPRESS_EXPORT_ONCE = true;
            try {
                await exportSynergism();
            } finally {
                // Clear a stale guard if exportSynergism returned before reaching exportData.
                window.__HS_SUPPRESS_EXPORT_ONCE = false;
            }
        } else {
            HSLogger.warn('Quark-only export unavailable: the game export-output hook was not patched.', this.context);
        }

        this.#clickResetButton(this.#ascendBtn);

        if (this.#stopAtSingularitysEnd && this.#autosingEnabled) {
            HSUI.Notify("Standard strategy exited: Auto-Sing will now push this sing before stopping.");
            await this.#pushSingularityBeforeStop();
            // Stopped during the push: stopping again would cancel a start waiting for this chain
            if (!this.#autosingEnabled) return;
            HSUI.Notify("Auto-Sing stopped at end of singularity as requested.");
            this.stopAutosing();
            return;
        }

        this.#endStagePromiseResolve?.();
        this.#endStagePromise = undefined;
        this.#endStagePromiseResolve = undefined;
    }


    // ============================================================================
    // MISC - OPTIONAL PUSH AT THE END BEFORE STOPPING
    // ============================================================================

    /** Runs the push's steps in order, and ends at the first step after a stop. */
    async #pushSingularityBeforeStop(): Promise<void> {
        const steps: Array<() => unknown> = [
            () => this.#setAmbrosiaLoadout(this.#ambrosia_late_cube),
            () => this.#corruptionManager.setLevel(0),

            () => this.#maxC11to14WithC10(11),
            () => this.#maxC11to14WithC10(12),
            () => this.#maxC11to14WithC10(13),
            () => this.#maxC11to14WithC10(14),

            () => this.#corruptionManager.setMaxLevel(),

            () => this.#autoChallengeButton.click(),

            ...this.#pushLoopSteps(),
            ...this.#pushLoopSteps(),

            ...this.#lastPushLoopSteps(),
            () => this.#clickResetButton(this.#exitTranscBtn),
            () => HSUtils.sleep(2000),
            () => this.#setAmbrosiaLoadout(this.#ambrosia_late_cube),
            () => this.#autoChallengeButton.click(),
            () => this.#clickResetButton(this.#exitAscBtn),
            () => this.#setAmbrosiaLoadout(this.#ambrosia_luck),
        ];

        for (const step of steps) {
            if (!this.#autosingEnabled) return;
            await step();
        }
    }

    #pushLoopSteps(): Array<() => unknown> {
        return [
            () => this.#waitForCompletion(15, 0, 0, 0),
            () => this.#setAmbrosiaLoadout(this.#ambrosia_obt),
            () => HSUtils.sleep(4500),
            () => this.#setAmbrosiaLoadout(this.#ambrosia_off),
            () => HSUtils.sleep(100),
            () => this.#antSacrifice.click(),
            () => HSUtils.sleep(100),
            () => this.#setAmbrosiaLoadout(this.#ambrosia_late_cube),

            () => this.#clickResetButton(this.#exitAscBtn),
            () => this.#setAmbrosiaLoadout(this.#ambrosia_off),
            () => HSUtils.sleep(4500),
            () => this.#antSacrifice.click(),
            () => HSUtils.sleep(100),
            () => this.#setAmbrosiaLoadout(this.#ambrosia_late_cube),
        ];
    }

    #lastPushLoopSteps(): Array<() => unknown> {
        return [
            () => this.#waitForCompletion(15, 0, 0, 0),
            () => this.#setAmbrosiaLoadout(this.#ambrosia_obt),
            () => HSUtils.sleep(4500),
            () => this.#setAmbrosiaLoadout(this.#ambrosia_off),
            () => HSUtils.sleep(100),
            () => this.#antSacrifice.click(),
            () => HSUtils.sleep(100),
            () => this.#setAmbrosiaLoadout(this.#ambrosia_obt),

            () => this.#waitForCompletion(6, 150, 1200, 0),
            () => this.#waitForCompletion(1, 9001, 1200, 0),
            () => this.#waitForCompletion(2, 9001, 1200, 0),
            () => this.#waitForCompletion(3, 9001, 1200, 0),
            () => this.#waitForCompletion(4, 9001, 1200, 0),
            () => this.#waitForCompletion(5, 9001, 1200, 0),
        ];
    }


    // ============================================================================
    // MISC - PUBLIC API
    // ============================================================================

    /** Running, starting, waiting to restart, or still holding settings for deferred restoration. */
    isAutosingActive(): boolean {
        return this.#autosingEnabled
            || (this.#isStarting && !this.#startCancelled)
            || this.#restartTimer !== undefined
            || this.#settingsFixer.hasOriginalSettings;
    }

    setStopAtSingularitysEnd(value: boolean): void {
        this.#stopAtSingularitysEnd = value;
    }

    getStopAtSingularitysEnd(): boolean {
        return this.#stopAtSingularitysEnd;
    }


    // ============================================================================
    // MISC - UTILITY & HELPERS
    // ============================================================================

    async #useAddAndTimeCodes(): Promise<void> {
        await this.#setAmbrosiaLoadout(this.#ambrosia_luck);
        if (!this.#autosingEnabled) return;
        if (this.#addCodeAllBtn) this.#addCodeAllBtn.click();
        if (this.#timeCodeBtn) this.#timeCodeBtn.click();
        await HSUtils.waitForNextTack();
    }


    #getChallengeAccessor(challengeIndex: number): ChallengeAccessor {
        return this.#challengeAccessors[challengeIndex] ?? this.#makeChallengeAccessor(challengeIndex);
    }

    #buildChallengeAccessors(): void {
        for (let i = 1; i <= 15; i++) {
            this.#challengeAccessors[i] = this.#makeChallengeAccessor(i);
        }
    }

    #makeChallengeAccessor(challengeIndex: number): ChallengeAccessor {
        const challengeBtn = this.#challengeButtons[challengeIndex];
        const levelElement = this.#challengeProgressElements[Math.floor((challengeIndex - 1) / 5)];

        const getLevelText = () => levelElement?.textContent ?? '';
        // Completions are written by the game as plain integers, not formatted for the locale
        const getCompletionMatch = () => getLevelText().match(CHALLENGE_COMPLETIONS_REGEX);

        const getCompletions = challengeIndex === 15
            ? () => {
                const text = getLevelText();
                if (!CHALLENGE_COMPLETIONS_REGEX.test(text)) {
                    // The score is formatted for the browser locale ("1,234", "1 234", "1.234")
                    const scoreText = text.match(CHALLENGE_15_SCORE_REGEX)?.[1];
                    if (scoreText) this.#lastBookmarkC15Score = HSNumberParser.parseDecimal(scoreText) ?? HSAutosing.#DECIMAL_0;
                }
                return this.#lastBookmarkC15Score;
            }
            : () => new Decimal(getCompletionMatch()?.[1] ?? '0');

        const getGoal = challengeIndex === 15
            ? () => HSAutosing.#DECIMAL_INFINITY
            : () => new Decimal(getCompletionMatch()?.[2] ?? '9999');

        return {
            button: challengeBtn,
            levelElement,
            getLevelText,
            getCompletions,
            getGoal,
        };
    }

    async #setAmbrosiaLoadout(loadout: HTMLButtonElement): Promise<void> {
        // Every load resets the ambrosia bars, even reloading the tree already in place
        if (this.#ambrosiaSwitchesOff) return;
        loadout.click();
        // The game marks the slot only if the load succeeded. It doesn't when the tree is rejected
        // (its alert is silent under auto-confirm), so don't wait forever (even though that shouldn't happen...)
        const loaded = await Promise.race([
            this.#waitForClassCondition(loadout, () => this.#isInAmbLoadout(loadout)),
            HSUtils.sleep(2000).then(() => false)
        ]);
        if (!loaded) {
            HSLogger.warn(`Ambrosia loadout ${loadout.id} was not confirmed by the game (load rejected?)`, this.context);
        }
    }

    /** Whether the game marks this slot as the active loadout (set only after a successful load or save). */
    #isInAmbLoadout(loadout: HTMLButtonElement): boolean {
        return loadout.classList.contains('activeBlueberryLoadout');
    }

    #isAllowedStage(stage: string): boolean {
        return ALLOWED_REGEX.test(stage);
    }

    #isInExalt(): boolean {
        if (this.#hasLivePlayer) {
            return this.#exposedPlayer!.insideSingularityChallenge;
        }
        return document.documentElement.getAttribute(EXALT_STATE_ATTRIBUTE) === 'true';
    }

    #getPhaseIndex(phase: PhaseOption): number {
        return this.#phaseIndexByOption.get(phase) ?? -1;
    }

    #rebuildStrategyPhaseCaches(): void {
        this.#phaseConfigByStage.clear();
        if (!this.#strategy) {
            this.#strategyPhaseRanges = undefined;
            this.#finalPhaseConfig = undefined;
            return;
        }

        this.#finalPhaseConfig = this.#strategy.strategy.find(p => p.endPhase === 'end');
        this.#strategyPhaseRanges = this.#strategy.strategy
            .map((p) => {
                const startIndex = this.#getPhaseIndex(p.startPhase);
                const endIndex = this.#getPhaseIndex(p.endPhase);
                return { phase: p, startIndex, endIndex };
            })
            .filter((r) => r.startIndex !== -1 && r.endIndex !== -1);
    }

    /**
     * Notes the tab to bring back: the one on screen, read from the live DOM (not the observer cache: tab changes
     * come in bursts around a singularity).
     */
    #notePlayerTab(): void {
        this.#playerTab = this.#gamestate.getCurrentMainViewFromDOM();
    }

    /**
     * Brings the player's tab back after the game or the mod moved them: an Exalt (Buildings), a DOM stage read
     * (Settings). A locked tab is never clicked, the game would open the next unlocked one: the player stays where
     * the game left them, and that tab becomes the one to bring back until they open another.
     */
    #showPlayerTab(): void {
        const view = this.#playerTab;
        if (!view) return;

        const current = this.#gamestate.getCurrentMainViewFromDOM();
        if (current.getId() === view.getId()) return;

        if (!HSAutosing.#isTabVisible(view)) {
            this.#playerTab = current;
            return;
        }

        if (this.#subtabMemory) this.#subtabMemory.openForPlayer(view);
        else view.goto();
    }

    /** A locked tab's button is hidden by the game's stylesheet (html[data-chal10="false"] .chal10 and the like). */
    static #isTabVisible(view: MainView): boolean {
        const button = document.getElementById(MAIN_VIEW_BUTTON_IDS[view.getId()]);
        return !!button && getComputedStyle(button).display !== 'none';
    }

    #ensureElements<T extends Record<string, Element | null>>(elements: T): elements is { [K in keyof T]: NonNullable<T[K]> } {
        if (this.#allElementsFound(elements))
            return true;

        if (this.#autosingEnabled) this.stopAutosing();
        return false;
    }

    #allElementsFound<T extends Record<string, Element | null>>(elements: T): elements is { [K in keyof T]: NonNullable<T[K]> } {
        const missing = Object.entries(elements)
            .filter(([, element]) => !element)
            .map(([name]) => name);

        for (const name of missing) { HSLogger.warn(`Required element missing: ${name}`, this.context); }
        return missing.length === 0;
    }

    async #waitIfAutosingPaused(): Promise<void> {
        HSUI.Notify('Autosing paused.');
        while (this.#autosingModal?.getIsPaused() && this.#autosingEnabled) { await HSUtils.sleep(500); }
        this.#autosingEnabled ? HSUI.Notify('Autosing resumed.') : HSUI.Notify('Autosing stopped.');
    }

    #clickResetButton(element: HTMLElement): void {
        try {
            element.click();
        } finally {
            // Vanilla reset clicks also open their hover modal. Close it synchronously
            // through vanilla's mouseout handler, before its animation frame can show it.
            // Keep the tooltip when the user is actually hovering or keyboard-focused.
            if (!element.matches(':hover, :focus')) {
                element.dispatchEvent(new MouseEvent('mouseout', { bubbles: true }));
            }
        }
    }

    #fastDoubleClick(element: HTMLElement): void {
        element.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
    }


    // ============================================================================
    // MISC - OBSERVER STUFF
    // ============================================================================

    #observeAntiquitiesRune(): void {
        if (!this.#antiquitiesRuneLockedContainer) {
            HSLogger.warn("Performance Warning: MutationObserver for antiquitiesRuneLockedContainer element missing. Aborting.", this.context);
            return;
        }
        this.#antiquitiesObserver?.disconnect();
        this.#antiquitiesObserver?.observe(
            this.#antiquitiesRuneLockedContainer,
            { attributes: true, attributeFilter: ['style'] }
        );
    }

    #startUpg81Clicking(): void {
        if (this.#upg81ClickLoopActive || !this.#upg81Btn) return;

        const generation = ++this.#upg81ClickLoopGeneration;
        this.#upg81ClickLoopActive = true;

        void (async (): Promise<void> => {
            try {
                while (
                    generation === this.#upg81ClickLoopGeneration
                    && this.#autosingEnabled
                    && this.#upg81Promise
                ) {
                    this.#upg81Btn.click();
                    await HSUtils.waitForNextTack();
                }
            } finally {
                if (generation === this.#upg81ClickLoopGeneration) {
                    this.#upg81ClickLoopActive = false;
                }
            }
        })();
    }

    #stopUpg81Clicking(): void {
        this.#upg81ClickLoopGeneration++;
        this.#upg81ClickLoopActive = false;
    }

    async #waitForGreenUpg81(): Promise<void> {
        if (!this.#upg81Promise) return;

        await this.#upg81Promise;

        this.#stopUpg81Clicking();
        this.#upg81Observer?.disconnect();
        this.#upg81PromiseResolve = undefined;
        this.#upg81Promise = undefined;
    }

    #waitForClassCondition(element: Element, condition: () => boolean): Promise<boolean> {
        if (condition()) return Promise.resolve(true);

        if (!this.#waitForClassConditionObserver) {
            HSLogger.warn("Performance Warning: MutationObserver for class condition changes missing and needs to be recreated.", this.context);
            this.#waitForClassConditionObserver = new MutationObserver(() => {
                if (!this.#waitForClassConditionActive) return;
                if (this.#waitForClassConditionActive.condition()) {
                    this.#cleanupWaitForClassCondition(true);
                }
            });
        }

        return new Promise<boolean>((resolve) => {
            if (this.#waitForClassConditionActive)
                this.#cleanupWaitForClassCondition(false);

            this.#waitForClassConditionActive = {
                element,
                condition,
                resolve,
                finished: false,
            };

            if (this.#waitForClassConditionObservedElement !== element) {
                this.#waitForClassConditionObserver?.disconnect();
                this.#waitForClassConditionObserver?.observe(element, { attributes: true, attributeFilter: ['class'] });
                this.#waitForClassConditionObservedElement = element;
            }

            if (condition()) this.#cleanupWaitForClassCondition(true);
        });
    }

    #waitForInnerText(el: HTMLElement, predicate: (text: string) => boolean = t => t.trim().length > 0, waitForNextMutation: boolean = false): Promise<void> {
        if (!waitForNextMutation && predicate(el.textContent ?? "")) return Promise.resolve();

        if (!this.#waitForInnerTextObserver) {
            HSLogger.warn("Performance Warning: MutationObserver for inner text changes missing and needs to be recreated.", this.context);
            this.#waitForInnerTextObserver = new MutationObserver(() => {
                if (!this.#waitForInnerTextActive) return;
                if (this.#waitForInnerTextActive.predicate(this.#waitForInnerTextActive.el.textContent ?? "")) {
                    this.#cleanupWaitForInnerText(true);
                }
            });
        }

        return new Promise<void>((resolve, reject) => {
            if (this.#waitForInnerTextActive) {
                this.#cleanupWaitForInnerText(false, new InnerTextWaitSupersededError());
            }

            this.#waitForInnerTextActive = {
                el,
                predicate,
                resolve,
                reject,
                finished: false,
            };
            this.#waitForInnerTextActive.timeoutId = window.setTimeout(() => {
                this.#cleanupWaitForInnerText(false, new Error("Timed out waiting for the game to refresh UI text"));
            }, 5000);

            if (this.#waitForInnerTextObservedElement !== el) {
                this.#waitForInnerTextObserver?.disconnect();
                this.#waitForInnerTextObserver?.observe(el, {
                    childList: true,
                    characterData: true,
                    subtree: true,
                });
                this.#waitForInnerTextObservedElement = el;
            }

            if (!waitForNextMutation && predicate(el.textContent ?? "")) this.#cleanupWaitForInnerText(true);
        });
    }

    #isExpectedAoagWaitSupersession(error: unknown): boolean {
        return error instanceof InnerTextWaitSupersededError
            && this.#autosingEnabled
            && this.#antiquitiesObserverActivated;
    }

    /**
     * Waits for the Exalt to be entered (true) or left (false).
     * The game sets its Exalt attribute within the reset itself, so observing it ends the wait right after the reset:
     * in the same task as the click when the dialogs are answered at once, before anything is painted.
     * Exposure-ready mode keeps the player's state as its reference, read at each game tick as before: the attribute
     * only makes the wait shorter, and without it (a game update) the tick still ends it.
     */
    async #waitForExaltState(targetState: boolean): Promise<boolean> {
        if (this.#isInExalt() === targetState) return true;

        const observed = this.#observeExaltState(targetState);
        if (!this.#hasLivePlayer) return await observed;

        let done = false;
        const polled = (async (): Promise<void> => {
            while (!done && this.#autosingEnabled && this.#exposedPlayer!.insideSingularityChallenge !== targetState) {
                await HSUtils.waitForNextTack();
            }
            if (!done) this.#exaltWaitsEndedByTick++;
        })();
        // An observed wait that ends without the state (no observer, autosing stopped) leaves it to the ticks
        await Promise.race([observed.then(matched => matched ? undefined : polled), polled]);
        done = true;
        this.#cleanupWaitForExaltState(false);
        return this.#exposedPlayer!.insideSingularityChallenge === targetState;
    }

    /** Resolves true once the game's Exalt attribute changes and the state is the one waited for, false if the wait is ended first. */
    #observeExaltState(targetState: boolean): Promise<boolean> {
        return new Promise<boolean>((resolve) => {
            if (this.#waitForExaltStateActive) {
                this.#cleanupWaitForExaltState(false);
            }

            this.#waitForExaltStateActive = {
                targetState,
                resolve,
                finished: false,
            };

            this.#exaltStateObserver?.disconnect();
            if (!this.#exaltStateObserver) {
                HSLogger.warn("Could not observe the game's Exalt state attribute.", this.context);
                this.#cleanupWaitForExaltState(false);
                return;
            }
            this.#exaltStateObserver.observe(document.documentElement, {
                attributes: true,
                attributeFilter: [EXALT_STATE_ATTRIBUTE],
            });
            if (this.#isInExalt() === targetState) this.#cleanupWaitForExaltState(true);
        });
    }

    #cleanupWaitForExaltState(result: boolean): void {
        if (!this.#waitForExaltStateActive || this.#waitForExaltStateActive.finished) return;
        this.#waitForExaltStateActive.finished = true;
        const resolve = this.#waitForExaltStateActive.resolve;
        this.#waitForExaltStateActive = undefined;
        this.#exaltStateObserver?.disconnect();
        resolve(result);
    }

    #cleanupChallengeObserver(): void {
        if (!this.#challengeObserverActive || this.#challengeObserverActive.finished) return;
        this.#challengeObserverActive.finished = true;
        const resolve = this.#challengeObserverActive.resolve;
        this.#challengeObserverActive = undefined;
        this.#challengeCompletionObserver?.disconnect();
        resolve();
    }

    #cleanupWaitForClassCondition(success: boolean): void {
        if (!this.#waitForClassConditionActive || this.#waitForClassConditionActive.finished) return;
        this.#waitForClassConditionActive.finished = true;
        const resolve = this.#waitForClassConditionActive.resolve;
        this.#waitForClassConditionActive = undefined;

        // Should we disconnect them here, since it's often called in burst ? 
        this.#waitForClassConditionObserver?.disconnect();
        this.#waitForClassConditionObservedElement = undefined;

        resolve(success);
    }

    #cleanupWaitForInnerText(success: boolean, error?: Error): void {
        if (!this.#waitForInnerTextActive || this.#waitForInnerTextActive.finished) return;
        this.#waitForInnerTextActive.finished = true;
        const resolve = this.#waitForInnerTextActive.resolve;
        const reject = this.#waitForInnerTextActive.reject;
        window.clearTimeout(this.#waitForInnerTextActive.timeoutId);
        this.#waitForInnerTextActive = undefined;

        // Should we disconnect them here, since it's often called in burst ? 
        this.#waitForInnerTextObserver?.disconnect();
        this.#waitForInnerTextObservedElement = undefined;

        if (success) resolve(); else reject(error ?? new Error("Wait for inner text aborted"));
    }
}
