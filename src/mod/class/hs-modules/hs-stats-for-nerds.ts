import { HSModuleOptions } from "../../types/hs-types";
import { MAIN_VIEW, SETTINGS_VIEW } from "../../types/module-types/hs-gamestate-types";
import { HSElementHooker } from "../hs-core/hs-elementhooker";
import type { HSGameState } from "../hs-core/hs-gamestate";
import { HSLogger } from "../hs-core/hs-logger";
import { HSUI } from "../hs-core/hs-ui";
import { HSModule } from "../hs-core/module/hs-module";
import { HSModuleRegistry } from "../hs-core/module/hs-module-registry";
import { escapeLogText } from "../hs-utils/hs-escape";
import statsForNerdsCSS from "inline:../../resource/css/module/hs-stats-for-nerds.css";

const STYLE_ID = 'hs-stats-for-nerds-css';
const ACTIVE_CLASS = 'hs-sfn-active';

// The game's category buttons, by id, in the order shown. A button missing here (a game update) goes in "Other".
const GROUPS: { title: string; ids: string[] }[] = [
    { title: 'General', ids: ['kMisc', 'kCoins', 'kTaxes', 'kFreeAccelMult', 'kGSpeedMult', 'kGSpeedMultIgnoreDR', 'kQuarkMult'] },
    { title: 'Offerings & runes', ids: ['kBaseOffering', 'kOfferingMult', 'kRuneEffectMult', 'kSalvage', 'kConstruction', 'kTalismanRuneBonusMult'] },
    { title: 'Obtainium', ids: ['kBaseObtainium', 'kObtIgnoreDR', 'kObtMult'] },
    { title: 'Ants', ids: ['kAntSpeedMult', 'kAntSacrificeMult', 'kAntELO', 'kAdditiveAntELOMult', 'kRebornELOCreationSpeedMult'] },
    {
        title: 'Ascension & cubes',
        ids: ['kASCMult', 'kACountMult', 'kFreeCorruptionLevels', 'kCubeBank', 'kGlobalCubeMult', 'kCubeMult', 'kTessMult',
            'kHypercubeMult', 'kPlatMult', 'kHeptMult', 'kOrbPowderMult'],
    },
    { title: 'Singularity', ids: ['kGQMult', 'kGQCost', 'kOctMult', 'kAddStats', 'kShopVouchers'] },
    { title: 'Ambrosia', ids: ['kAmbrosiaLuck', 'kAmbrosiaAdditiveLuckMult', 'kLuckConversion', 'kAmbrosiaGenMult', 'kAmbrosiaBlueberries'] },
    { title: 'Red ambrosia', ids: ['kRedAmbrosiaLuck', 'kRedAmbrosiaGenMult'] },
    {
        title: 'Purple honey',
        ids: ['kPurpleHoneyEfficiency', 'kPurpleHalfLife', 'kPurpleReactantCapacity', 'kPurpleHoneyLuck',
            'kPurpleHoneyProgressRequirement'],
    },
];

/**
 * Class: HSStatsForNerds
 * IsExplicitHSModule: Yes
 * Description:
 *     Settings > Stats for Nerds: the game's grid of category buttons replaced by a compact list in groups.
 *     The game's buttons stay in the page, hidden: each row clicks its button, so the game still shows the
 *     category, and what the mod clicks itself (kMisc) still works. Labels, colours and which categories are
 *     unlocked are read from the game's buttons.
 *     Rules: docs/features/stats-for-nerds.md.
 * Author: Shewchou
 */
export class HSStatsForNerds extends HSModule {
    #shown = false;
    #gameList?: HTMLElement;
    #root?: HTMLElement;
    #groups?: HTMLElement;
    #summaryButton?: HTMLButtonElement;
    #rows = new Map<string, HTMLButtonElement>();
    #onGameClick = () => this.#updateActive();

    constructor(moduleOptions: HSModuleOptions) {
        super(moduleOptions);
    }

    async init(): Promise<void> {
        HSLogger.log('Initialising HSStatsForNerds module', this.context);

        // Unlocks and the game's language change while the subtab is closed: read again each time it opens
        const gameState = HSModuleRegistry.getModule('HSGameState');
        if (gameState) {
            const onViewChange = () => {
                if (gameState.getCurrentUIView('MAIN_VIEW').getId() === MAIN_VIEW.SETTINGS
                    && gameState.getCurrentUIView('SETTINGS_VIEW').getId() === SETTINGS_VIEW.STATS_FOR_NERDS) {
                    this.#refresh();
                }
            };
            gameState.subscribeGameStateChange('MAIN_VIEW', onViewChange);
            gameState.subscribeGameStateChange('SETTINGS_VIEW', onViewChange);
        }

        // Shown by the statsForNerdsGroups setting's action (HSSettings.syncSettings)
        this.isInitialized = true;
    }

    async show(): Promise<void> {
        this.#shown = true;

        // On a phone the game turns the buttons into icons that open a window: its own layout is kept
        if (document.documentElement.dataset.mobile === 'true') {
            HSLogger.log('Stats for Nerds groups not added: mobile layout', this.context);
            return;
        }

        try {
            this.#gameList ??= await HSElementHooker.HookElement('#statsForNerds') as HTMLElement;
        } catch (error) {
            HSLogger.warn(`Stats for Nerds groups not added, game list not found: ${escapeLogText(String(error))}`, this.context);
            return;
        }
        // Turned off again while waiting for the game
        if (!this.#shown) return;

        HSUI.injectStyle(statsForNerdsCSS, STYLE_ID);
        HSUI.flushInjectedStyles();
        this.#root ??= this.#build();
        this.#gameList.before(this.#root);
        this.#gameList.addEventListener('click', this.#onGameClick);
        this.#refresh();
    }

    hide(): void {
        this.#shown = false;
        this.#gameList?.removeEventListener('click', this.#onGameClick);
        if (!this.#root) return;

        this.#root.remove();
        HSUI.removeInjectedStyle(STYLE_ID);
    }

    #build(): HTMLElement {
        const root = document.createElement('div');
        root.id = 'hs-sfn';

        const groups = document.createElement('div');
        groups.id = 'hs-sfn-groups';

        const summaryButton = document.createElement('button');
        summaryButton.id = 'hs-sfn-summary';
        summaryButton.type = 'button';
        summaryButton.addEventListener('click', () => document.getElementById('summaryGeneration')?.click());

        root.append(groups, summaryButton);
        this.#groups = groups;
        this.#summaryButton = summaryButton;
        return root;
    }

    /** Builds the groups again from the game's buttons: their labels, colours and which ones the game shows. */
    #refresh(): void {
        if (!this.#shown || !this.#root || !this.#groups || !this.#summaryButton || !this.#gameList) return;

        const gameButtons = new Map<string, HTMLElement>();
        this.#gameList.querySelectorAll<HTMLElement>('.statsNerds').forEach((button) => gameButtons.set(button.id, button));

        const known = new Set(GROUPS.flatMap(({ ids }) => ids));
        const others = [...gameButtons.keys()].filter((id) => !known.has(id));

        this.#rows.clear();
        const sections: HTMLElement[] = [];
        for (const { title, ids } of [...GROUPS, { title: 'Other', ids: others }]) {
            const rows = ids
                .map((id) => gameButtons.get(id))
                // The game hides a locked category's button through its CSS, which still applies inside the
                // hidden list: the button's own display tells
                .filter((button): button is HTMLElement => !!button && getComputedStyle(button).display !== 'none')
                .map((button) => this.#buildRow(button));
            if (rows.length === 0) continue;

            const section = document.createElement('section');
            section.className = 'hs-sfn-group';
            const heading = document.createElement('div');
            heading.className = 'hs-sfn-title';
            heading.textContent = title;
            section.append(heading, ...rows);
            sections.push(section);
        }
        this.#groups.replaceChildren(...sections);

        const summary = document.getElementById('summaryGeneration');
        this.#summaryButton.textContent = summary?.textContent?.trim() ?? '';
        this.#summaryButton.style.display = summary ? '' : 'none';

        this.#updateActive();
    }

    #buildRow(gameButton: HTMLElement): HTMLButtonElement {
        const row = document.createElement('button');
        row.type = 'button';
        row.className = 'hs-sfn-row';
        row.textContent = gameButton.textContent?.trim() ?? gameButton.id;
        row.style.setProperty('--hs-sfn-colour', getComputedStyle(gameButton).borderTopColor);
        row.addEventListener('click', () => gameButton.click());
        this.#rows.set(gameButton.id, row);
        return row;
    }

    /** The game marks the shown category by its button's background, set inline. */
    #updateActive(): void {
        this.#rows.forEach((row, id) => {
            const active = (document.getElementById(id)?.style.backgroundColor ?? '') !== '';
            row.classList.toggle(ACTIVE_CLASS, active);
            row.setAttribute('aria-pressed', String(active));
        });
    }
}
