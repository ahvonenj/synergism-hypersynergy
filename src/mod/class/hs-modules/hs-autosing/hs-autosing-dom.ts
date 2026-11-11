import Decimal from "break_infinity.js";
import { HSGlobal } from "../../hs-core/hs-global";
import { HSLogger } from "../../hs-core/hs-logger";
import { HSUI } from "../../hs-core/hs-ui";
import { HSSettings } from "../../hs-core/settings/hs-settings";
import type { MainView } from "../../hs-core/hs-gamestate";
import { HSNumberParser } from "../../hs-utils/hs-number-parser";
import { MAIN_VIEW_BUTTON_IDS } from "../../../types/module-types/hs-gamestate-types";

const CHALLENGE_COMPLETIONS_REGEX = /\((\d+)\s*\/\s*(\d+)\):/;
// Everything after the challenge's name: the score is its first number (it can hold no-break spaces, which \S excludes)
const CHALLENGE_15_SCORE_REGEX = /:\s*(.+)/;

type ChallengeAccessor = {
    button?: HTMLButtonElement;
    levelElement?: HTMLElement;
    getLevelText: () => string;
    getCompletions: () => Decimal;
    getGoal: () => Decimal;
};

/**
 * Class: HSAutosingDom
 * IsExplicitHSModule: No
 * Description: Caches game elements and reads the DOM fallback for Autosing.
 * Author: XxMolkxX, Shewchou
 */
export class HSAutosingDom {
    static readonly #DECIMAL_0 = new Decimal(0);
    static readonly #DECIMAL_INFINITY = new Decimal(Infinity);
    readonly #context: string;
    readonly #onMissingElements: () => void;
    #lastBookmarkC15Score = HSAutosingDom.#DECIMAL_0;
    #challengeAccessors: Record<number, ChallengeAccessor> = {};

    // DOM Elements - Settings & UI
    settingsTab!: HTMLButtonElement;
    settingsSubTab!: HTMLButtonElement;
    misc!: HTMLButtonElement;
    stage!: HTMLParagraphElement;

    // DOM Elements - Challenges
    #challengeButtons: Record<number, HTMLButtonElement> = {};
    challengeProgressElements: HTMLElement[] = [];

    // DOM Elements - Challenge Actions
    exitTranscBtn!: HTMLButtonElement;
    exitReincBtn!: HTMLButtonElement;
    exitAscBtn!: HTMLButtonElement;
    ascendBtn!: HTMLButtonElement;

    // DOM Elements - Elevator & Navigation
    elevatorTeleportButton!: HTMLButtonElement;
    elevatorInput!: HTMLInputElement;

    // DOM Elements - Auto Toggles
    autoChallengeButton!: HTMLButtonElement;
    autoAntSacrificeButton!: HTMLButtonElement;
    autoAscendButton!: HTMLButtonElement;

    // DOM Elements - Heptract Auto-Buy
    heptractBtns: HTMLButtonElement[] = [];

    // DOM Elements - Ambrosia Loadouts
    ambrosia_early_cube!: HTMLButtonElement;
    ambrosia_late_cube!: HTMLButtonElement;
    ambrosia_quark!: HTMLButtonElement;
    ambrosia_obt!: HTMLButtonElement;
    ambrosia_off!: HTMLButtonElement;
    ambrosia_luck!: HTMLButtonElement;
    // Read once per run: the slots above aren't looked up while it's on
    ambrosiaSwitchesOff = false;

    // DOM Elements - Misc
    antSacrifice!: HTMLButtonElement;
    AOAG!: HTMLButtonElement;
    exalt2Btn!: HTMLButtonElement;
    addCodeAllBtn!: HTMLButtonElement;
    timeCodeBtn!: HTMLButtonElement;
    upg81Btn!: HTMLButtonElement;

    // DOM Elements - Antiquities
    antiquitiesRuneLockedContainer!: HTMLDivElement;

    constructor(context: string, onMissingElements: () => void) {
        this.#context = context;
        this.#onMissingElements = onMissingElements;
    }

    cacheCoreElements(): boolean {
        return this.#cacheSettingsElements()
            && this.#cacheChallengeElements()
            && this.#cacheButtonElements()
            && this.#cacheHepteractButtons()
            && this.#cacheCorruptionElements();
    }

    resetChallenge15Score(): void {
        this.#lastBookmarkC15Score = HSAutosingDom.#DECIMAL_0;
    }

    #cacheSettingsElements(): boolean {
        const elements = {
            settingsTab: document.getElementById('settingstab') as HTMLButtonElement | null,
            settingsSubTab: document.getElementById('switchSettingSubTab4') as HTMLButtonElement | null,
            misc: document.getElementById('kMisc') as HTMLButtonElement | null,
            stage: document.getElementById('gameStageStatistic') as HTMLParagraphElement | null,
        };
        if (!this.#ensureElements(elements)) return false;

        this.settingsTab = elements.settingsTab;
        this.settingsSubTab = elements.settingsSubTab;
        this.misc = elements.misc;
        this.stage = elements.stage;
        return true;
    }

    #cacheChallengeElements(): boolean {
        const progressElements = {
            transcension: document.getElementById('transcensionChallengeProgressText'),
            reincarnation: document.getElementById('reincarnationChallengeProgressText'),
            ascension: document.getElementById('ascensionChallengeProgressText'),
        };
        if (!this.#ensureElements(progressElements)) return false;
        this.challengeProgressElements = [
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

        this.exitTranscBtn = elements.exitTranscBtn;
        this.exitReincBtn = elements.exitReincBtn;
        this.exitAscBtn = elements.exitAscBtn;
        this.ascendBtn = elements.ascendBtn;
        this.autoChallengeButton = elements.autoChallengeButton;
        this.autoAntSacrificeButton = elements.autoAntSacrificeButton;
        this.autoAscendButton = elements.autoAscendButton;
        this.antSacrifice = elements.antSacrifice;
        this.AOAG = elements.AOAG;
        this.exalt2Btn = elements.exalt2Btn;
        this.elevatorTeleportButton = elements.elevatorTeleportButton;
        this.elevatorInput = elements.elevatorInput;
        this.upg81Btn = elements.upg81Btn;
        return true;
    }

    #cacheHepteractButtons(): boolean {
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

        this.heptractBtns = ids.map(id => buttonMap[id]!);
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

        this.addCodeAllBtn = elements.addCodeAllBtn;
        this.timeCodeBtn = elements.timeCodeBtn;
        return true;
    }

    cacheAmbrosiaLoadoutButtons(): boolean {
        this.ambrosiaSwitchesOff = HSSettings.getSetting("autosingNoAmbrosiaSwitch").isEnabled();
        if (this.ambrosiaSwitchesOff) {
            HSLogger.log("Ambrosia loadout switches are off: the ambrosia loadout settings are not used.", this.#context);
            return true;
        }

        return this.findAmbrosiaLoadoutButtons();
    }

    findAmbrosiaLoadoutButtons(): boolean {
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
        if (!this.#ensureElements(elements)) {
            HSUI.Notify("There is a problem with the Auto-Sing settings. Check the logs for more details.", {
                notificationType: "warning"
            });
            return false;
        }

        this.ambrosia_early_cube = elements.earlyCube;
        this.ambrosia_late_cube = elements.lateCube;
        this.ambrosia_quark = elements.quark;
        this.ambrosia_obt = elements.obt;
        this.ambrosia_off = elements.off;
        this.ambrosia_luck = elements.luck;
        return true;
    }

    cacheAntiquitiesElement(): boolean {
        const elements = {
            antiquitiesRuneLockedContainer: document.getElementById('antiquitiesRuneLockedContainer') as HTMLDivElement | null,
        };
        if (!this.#ensureElements(elements)) return false;

        this.antiquitiesRuneLockedContainer = elements.antiquitiesRuneLockedContainer;

        return true;
    }

    getChallengeAccessor(challengeIndex: number): ChallengeAccessor {
        return this.#challengeAccessors[challengeIndex] ?? this.#makeChallengeAccessor(challengeIndex);
    }

    #buildChallengeAccessors(): void {
        for (let i = 1; i <= 15; i++) {
            this.#challengeAccessors[i] = this.#makeChallengeAccessor(i);
        }
    }

    #makeChallengeAccessor(challengeIndex: number): ChallengeAccessor {
        const challengeBtn = this.#challengeButtons[challengeIndex];
        const levelElement = this.challengeProgressElements[Math.floor((challengeIndex - 1) / 5)];

        const getLevelText = () => levelElement?.textContent ?? '';
        // Completions are written by the game as plain integers, not formatted for the locale
        const getCompletionMatch = () => getLevelText().match(CHALLENGE_COMPLETIONS_REGEX);

        const getCompletions = challengeIndex === 15
            ? () => {
                const text = getLevelText();
                if (!CHALLENGE_COMPLETIONS_REGEX.test(text)) {
                    // The score is formatted for the browser locale ("1,234", "1 234", "1.234")
                    const scoreText = text.match(CHALLENGE_15_SCORE_REGEX)?.[1];
                    if (scoreText) this.#lastBookmarkC15Score = HSNumberParser.parseDecimal(scoreText) ?? HSAutosingDom.#DECIMAL_0;
                }
                return this.#lastBookmarkC15Score;
            }
            : () => new Decimal(getCompletionMatch()?.[1] ?? '0');

        const getGoal = challengeIndex === 15
            ? () => HSAutosingDom.#DECIMAL_INFINITY
            : () => new Decimal(getCompletionMatch()?.[2] ?? '9999');

        return {
            button: challengeBtn,
            levelElement,
            getLevelText,
            getCompletions,
            getGoal,
        };
    }

    /** The active Exalt's icon (its id is the challenge's key): the game colours it orchid. */
    getActiveExaltElement(): HTMLElement | null {
        const challenges = HSGlobal.exposedPlayer?.singularityChallenges;
        if (challenges) {
            const key = Object.keys(challenges).find(k => challenges[k as keyof typeof challenges]?.enabled);
            return key ? document.getElementById(key) : null;
        }
        return document.querySelector<HTMLElement>('#singularityChallenges img.challenge[style*="background-color: orchid"]');
    }

    /** A locked tab's button is hidden by the game's stylesheet (html[data-chal10="false"] .chal10 and the like). */
    static isTabVisible(view: MainView): boolean {
        const button = document.getElementById(MAIN_VIEW_BUTTON_IDS[view.getId()]);
        return !!button && getComputedStyle(button).display !== 'none';
    }

    #ensureElements<T extends Record<string, Element | null>>(elements: T): elements is { [K in keyof T]: NonNullable<T[K]> } {
        const missing = Object.entries(elements)
            .filter(([, element]) => !element)
            .map(([name]) => name);

        if (missing.length === 0)
            return true;

        for (const name of missing) { HSLogger.warn(`Required element missing: ${name}`, this.#context); }
        this.#onMissingElements();
        return false;
    }
}
