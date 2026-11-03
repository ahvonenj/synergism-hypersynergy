import { HSModuleOptions } from "../../../types/hs-types";
import { CUBE_VIEW, MAIN_VIEW } from "../../../types/module-types/hs-gamestate-types";
import { HSElementHooker } from "../../hs-core/hs-elementhooker";
import type { HSGameState } from "../../hs-core/hs-gamestate";
import { HSGlobal } from "../../hs-core/hs-global";
import { HSLogger } from "../../hs-core/hs-logger";
import { HSTooltip } from "../../hs-core/hs-tooltip";
import { HSUI } from "../../hs-core/hs-ui";
import { HSModule } from "../../hs-core/module/hs-module";
import { HSModuleManager } from "../../hs-core/module/hs-module-manager";
import { HSSettings } from "../../hs-core/settings/hs-settings";
import { HSNumberParser } from "../../hs-utils/hs-number-parser";
import { HSUtils } from "../../hs-utils/hs-utils";
import type { HSGameDataAPI } from "../../hs-core/gds/hs-gamedata-api";
import type { HSAutosing } from "../hs-autosing/hs-autosing";
import type { HSAmbrosia } from "../hs-ambrosia/hs-ambrosia";
import type { HSSingReducerSwap } from "../hs-ambrosia/hs-ambrosia-temporary-tree";
import type { HepteractKeys } from "../../../types/data-types/hs-player-savedata";
import { HepteractPlan, HepteractPlanState, HepteractPlanType, planHepteractDistribution } from "./hs-hepteract-distributor-plan";
import { HEPTERACT_DATA, HepteractState, readHepteract } from "./hs-hepteract-state";
import { escapeLogText } from "../hs-heater/hs-heater-utils";
import distributorCSS from "inline:../../../resource/css/module/hs-hepteract-distributor.css";

type HepteractKey = Exclude<HepteractKeys, 'quark'>;

interface HepteractInfo {
    key: HepteractKey;
    label: string;
}

// In the forge's order. The Quark hepteract has no row, as in quick expand: it also spends quarks.
const HEPTERACTS: HepteractInfo[] = [
    { key: 'chronos', label: 'Chronos' },
    { key: 'hyperrealism', label: 'Hyperrealism' },
    { key: 'challenge', label: 'Challenge' },
    { key: 'abyss', label: 'Abyss' },
    { key: 'accelerator', label: 'Accelerator' },
    { key: 'acceleratorBoost', label: 'Accelerator Boost' },
    { key: 'multiplier', label: 'Multiplier' },
];

/** One of the game's own on/off buttons: its state is read from the live player, and changed by clicking it. */
interface GameSwitch {
    id: string;
    isOn: (player: any) => boolean;
}

const hepteractAuto = (key: string): GameSwitch => ({ id: `${key}HepteractAuto`, isOn: player => player.hepteracts?.[key]?.AUTO === true });
// Every hepteract's Auto, the Quark one included: at an ascension, each type with Auto on gets the same amount
const HEPTERACT_AUTOS: GameSwitch[] = [...HEPTERACTS.map(info => info.key), 'quark'].map(hepteractAuto);
const ORBS_AUTO: GameSwitch = { id: 'hepteractToQuarkTradeAuto', isOn: player => player.overfluxOrbsAutoBuy === true };
// With it on, the game only ascends once Challenge 10 is completed again, and asks a Confirm
const ASCENSION_CONFIRMATION: GameSwitch = { id: 'toggle31', isOn: player => player.toggles?.[31] === true };
// What the game also does at each ascension (Reset.ts): suspended for the Distributor's own ascensions
const ASCENSION_AUTOMATIONS: GameSwitch[] = [
    { id: 'openCubes', isOn: player => player.autoOpenCubes === true },
    { id: 'openTesseracts', isOn: player => player.autoOpenTesseracts === true },
    { id: 'openHypercubes', isOn: player => player.autoOpenHypercubes === true },
    { id: 'openPlatonicCube', isOn: player => player.autoOpenPlatonicsCubes === true },
    { id: 'toggleAutoCubeUpgrades', isOn: player => player.autoCubeUpgradesToggle === true },
    { id: 'toggleAutoPlatonicUpgrades', isOn: player => player.autoPlatonicUpgradesToggle === true },
    { id: 'tesseractautobuytoggle', isOn: player => player.tesseractAutoBuyerToggle === true },
];

const ORB_COST = 250000;
const OPENED_CLASS = 'hs-hept-distributor-opened';
const SETTLE_TIME_LIMIT_MS = 2000;
// The game's auto-craft stops on a full meter as long as what is left can't pay back one more expansion, which
// takes at least a third more than the planned cost: 5% above it absorbs a cost slightly off (the cost check
// allows 1%) without ever reaching that
const AMOUNT_MARGIN = 1.05;
// With hepteracts to keep, the run spends that fraction of the stock less than what is above them. The game takes
// floor(stock x percentage / 100): on a large stock, the float rounding of a share can come out a few thousand
// hepteracts above it, enough to end just under a power of ten, which the bonuses counted in digits would lose
const KEEP_SAFETY = 1e-12;
// The game caps the hepteracts owned at 1e300 (Reset.ts)
const MAX_KEEP_EXPONENT = 300;
// The most singularity reducers the ambrosia tree gives (reducer 1 or reducer 2, 2 levels each)
const MOST_TREE_REDUCERS = 2;
/** The hepteract cost multiplier with another ambrosia tree (#readCostMultiplier). */
type CostMultiplierWith = (addedReducers: number, talismanLevel?: number) => number;
const ASCENSION_WARNING = 'Distribute ascends several times in a row: your current ascension ends.';
// The feature in a few lines, shown by the "?" after the panel's title. Each control has its own tooltip
const HELP_LINES = [
    'Spends your hepteracts between the hepteract types, following your ratios.',
    'A ratio is what a type\'s balance should be worth in hepteracts (its units x the hepteracts one unit costs), compared with the others: 4 and 1 means four times as many hepteracts. 0 leaves a type alone.',
    'Each step goes to the type furthest behind its ratio: its meter is filled, or expanded then filled. It stops when that type can\'t pay.',
    'It crafts through the game\'s Auto craft, so only hepteracts are spent. For that it ascends several times in a row: your current ascension ends.',
    'Keep: a power of ten of hepteracts is never spent (some bonuses count the hepteracts you own). It follows your stock as it grows. Orbs and ratios run on what is above it.',
    'Orbs: that part of your hepteracts buys Overflux Orbs first.',
    'Your Auto switches, autocraft percentage and ascension confirmation are put back at the end.',
];

/**
 * Class: HSHepteractDistributor
 * IsExplicitHSModule: Yes
 * Description:
 *     The Hepteract Distributor, a panel in the Hepteract Forge opened by a button on the forge's welcome line
 *     (it then takes the place of the forge's three intro lines).
 *     It spends the owned hepteracts on the hepteract types so that what their balances are worth in hepteracts
 *     follows the ratios the player set (the rule is in hs-hepteract-distributor-plan.ts). A percentage can go to Overflux Orbs first.
 *     A power of ten can be kept: Orbs and ratios only spend what is above it (Cx13 and the ambrosia hybrid modules
 *     count the hepteracts owned, by powers of ten). It is saved as a distance below the stock's own power of
 *     ten, so it follows the stock.
 *     Crafting goes through the game's own Auto craft, which runs at an ascension and takes no other resource
 *     than hepteracts: the Distributor ascends once per type, with only that type's Auto on and the game's
 *     autocraft percentage set to that type's exact share. The player's switches and percentage are put back
 *     at the end. Needs the live player object (patched game).
 *     "Use singularity reducers and Talisman Power" (off by default): for the time of the crafts, the ambrosia
 *     tree is replaced by one holding the singularity reducers (HSAmbrosia.prepareSingReducerSwap), so
 *     hepteracts cost less. That tree also gets Talisman Power where it lowers the cost, and "Also when only
 *     Talisman Power can be added" (off by default) loads it when no reducer can be added.
 * Author: Shewchou
 */
export class HSHepteractDistributor extends HSModule {
    #tab?: HTMLElement;
    #openButton?: HTMLButtonElement;
    #panel?: HTMLElement;
    #status?: HTMLElement;
    #controls: (HTMLButtonElement | HTMLInputElement)[] = [];
    #distributeButton?: HTMLButtonElement;
    #matchButton?: HTMLButtonElement;
    #ratioInputs = new Map<HepteractKey, HTMLInputElement>();
    #cells = new Map<HepteractKey, HTMLElement>();
    #orbsIcon?: HTMLElement;
    #keepIcon?: HTMLElement;
    #keepInput?: HTMLInputElement;

    #ratios: Partial<Record<HepteractKey, number>> = {};
    #shown = false;
    #running = false;
    // The "not available" line currently in the status, if any
    #shownReason?: string;

    constructor(moduleOptions: HSModuleOptions) {
        super(moduleOptions);
    }

    async init(): Promise<void> {
        HSLogger.log('Initialising HSHepteractDistributor module', this.context);
        this.#ratios = this.#loadRatios();

        // On Steam the panel can be built before the game draws its sprites, and the icon set is changed in
        // Settings: the forge coming on screen is when the copies have to be right
        const gameState = HSModuleManager.getModule<HSGameState>('HSGameState');
        if (gameState) {
            const onViewChange = () => {
                if (gameState.getCurrentUIView('MAIN_VIEW').getId() === MAIN_VIEW.CUBES
                    && gameState.getCurrentUIView('CUBE_VIEW').getId() === CUBE_VIEW.HEPTERACT_FORGE) {
                    this.#refreshIcons();
                }
            };
            gameState.subscribeGameStateChange('MAIN_VIEW', onViewChange);
            gameState.subscribeGameStateChange('CUBE_VIEW', onViewChange);
        }

        // Shown by the enableHepteractDistributor setting's action (HSSettings.syncSettings)
        this.isInitialized = true;
    }

    async showDistributor(): Promise<void> {
        this.#shown = true;
        this.#tab ??= await HSElementHooker.HookElement('#cubeTab7') as HTMLElement;
        // Turned off again while waiting for the forge
        if (!this.#shown) return;

        HSUI.injectStyle(distributorCSS, 'hs-hept-distributor-css');
        this.#openButton ??= this.#buildOpenButton();
        this.#panel ??= this.#buildPanel();
        this.#tab.prepend(this.#openButton, this.#panel);
        this.#setOpened(HSSettings.getSetting('hepteractDistributorOpen').getValue() === true, false);
    }

    hideDistributor(): void {
        this.#shown = false;
        this.#openButton?.remove();
        this.#panel?.remove();
        this.#tab?.classList.remove(OPENED_CLASS);
    }

    // ── Panel ────────────────────────────────────────────────────────────────────────────────────────

    #buildOpenButton(): HTMLButtonElement {
        const button = document.createElement('button');
        button.id = 'hs-hept-distributor-open';
        button.type = 'button';
        button.textContent = 'Distributor';
        button.title = 'Hepteract Distributor: spend your hepteracts on the hepteract types following ratios';
        button.addEventListener('click', () => this.#setOpened(true));
        return button;
    }

    #buildPanel(): HTMLElement {
        const panel = document.createElement('div');
        panel.id = 'hs-hept-distributor';
        // What makes it unavailable (an Exalt, autosing) changes while the panel stays open
        panel.addEventListener('mouseenter', () => {
            this.#refreshAvailability();
            // The stock changes at each ascension: the mouse is over the panel before the field is read
            this.#refreshKeepField();
        });

        const minimize = document.createElement('button');
        minimize.id = 'hs-hept-distributor-minimize';
        minimize.type = 'button';
        minimize.textContent = '–';
        minimize.title = 'Minimize';
        minimize.addEventListener('click', () => this.#setOpened(false));
        panel.appendChild(minimize);

        const title = document.createElement('div');
        title.className = 'hs-hept-distributor-title';
        title.textContent = 'Hepteract Distributor';
        const help = document.createElement('span');
        help.className = 'hs-hept-distributor-help';
        help.textContent = '?';
        HSTooltip.set(help, { html: HSTooltip.list(HELP_LINES), delay: 0 });
        title.appendChild(help);
        panel.appendChild(title);

        const cells = document.createElement('div');
        cells.className = 'hs-hept-distributor-cells';
        panel.appendChild(cells);

        for (const info of HEPTERACTS) {
            const cell = document.createElement('label');
            cell.className = 'hs-hept-distributor-cell';
            cell.appendChild(HSHepteractDistributor.#iconSlot());

            const input = document.createElement('input');
            input.type = 'number';
            input.min = '0';
            input.step = 'any';
            input.setAttribute('aria-label', `${info.label} ratio`);
            input.value = HSHepteractDistributor.#shownRatio(this.#ratios[info.key] ?? 0);
            input.addEventListener('input', () => {
                const value = parseFloat(input.value);
                this.#ratios[info.key] = Number.isFinite(value) && value > 0 ? value : 0;
                this.#saveRatios();
            });
            // Once the player is done typing (blur or Enter), not at each key
            input.addEventListener('change', () => {
                input.value = HSHepteractDistributor.#shownRatio(this.#ratios[info.key] ?? 0);
            });
            cell.appendChild(input);

            cells.appendChild(cell);
            this.#cells.set(info.key, cell);
            this.#ratioInputs.set(info.key, input);
            this.#controls.push(input);
        }

        const orbsCell = document.createElement('label');
        orbsCell.className = 'hs-hept-distributor-cell hs-hept-distributor-dotted';
        orbsCell.title = 'This part of your hepteracts buys Overflux Orbs first (250,000 each). The ratios run on what is left.';
        this.#orbsIcon = HSHepteractDistributor.#iconSlot();
        orbsCell.appendChild(this.#orbsIcon);
        const orbsField = document.createElement('span');
        orbsField.className = 'hs-hept-distributor-field';
        const orbsInput = document.createElement('input');
        orbsInput.type = 'number';
        orbsInput.min = '0';
        orbsInput.max = '100';
        orbsInput.step = 'any';
        orbsInput.setAttribute('aria-label', 'Percentage of hepteracts for Overflux Orbs');
        orbsInput.value = String(this.#orbsPercent());
        orbsInput.addEventListener('input', () => {
            const value = parseFloat(orbsInput.value);
            HSSettings.getSetting('hepteractDistributorOrbsPercent')
                .setValue(Number.isFinite(value) ? Math.min(100, Math.max(0, value)) : 0);
        });
        orbsInput.addEventListener('change', () => { orbsInput.value = String(this.#orbsPercent()); });
        orbsField.append(orbsInput, '% first');
        orbsCell.appendChild(orbsField);
        // Bought first, so shown first
        cells.prepend(orbsCell);
        this.#controls.push(orbsInput);

        const keepCell = document.createElement('label');
        keepCell.className = 'hs-hept-distributor-cell hs-hept-distributor-separated';
        keepCell.title = 'These hepteracts are never spent: Orbs and ratios run on what is above them.\n'
            + 'Cx13 (cube gain) and the ambrosia Cube-Quark and Cube-Luck hybrid modules count the hepteracts you own, '
            + 'by powers of ten, so the field takes the exponent: 15 keeps 1e15.\n'
            + 'It follows your stock: 15 typed while you own 3.4e16 (one power of ten below) becomes 16 once you own 1e17. '
            + 'At most every digit you own: an exponent above your stock\'s is brought down to it.\n'
            + 'Empty keeps nothing. The greyed value is only a suggestion, one power of ten below what you own: '
            + 'at most a tenth of your hepteracts, for one digit less.';
        this.#keepIcon = HSHepteractDistributor.#iconSlot();
        keepCell.appendChild(this.#keepIcon);
        const keepField = document.createElement('span');
        keepField.className = 'hs-hept-distributor-field';
        const keepInput = document.createElement('input');
        keepInput.type = 'number';
        keepInput.min = '1';
        keepInput.max = String(MAX_KEEP_EXPONENT);
        keepInput.step = '1';
        keepInput.setAttribute('aria-label', 'Hepteracts to keep, as a power of ten');
        keepInput.addEventListener('input', () => {
            // Saved as the distance to the stock's power of ten, so the reserve follows the stock as it grows.
            // Above the stock's own power: every digit it has (distance 0)
            const typed = Math.floor(parseFloat(keepInput.value));
            const stock = HSHepteractDistributor.#stockExponent(HSHepteractDistributor.#ownedHepteracts());
            HSSettings.getSetting('hepteractDistributorKeep')
                .setValue(Number.isFinite(typed) && typed >= 1 && Number.isFinite(stock) ? Math.max(0, stock - typed) : -1);
        });
        keepInput.addEventListener('change', () => this.#refreshKeepField(true));
        keepField.append('Keep 1e', keepInput);
        keepCell.appendChild(keepField);
        // Set aside before the Orbs
        cells.prepend(keepCell);
        this.#keepInput = keepInput;
        this.#refreshKeepField(true);
        this.#controls.push(keepInput);

        type OptionSetting = 'hepteractDistributorUseReducers' | 'hepteractDistributorTalismanAlone' | 'hepteractDistributorAllowPartial';
        // A sub-option is only shown while the option above it is ticked (CSS)
        const option = (text: string, hint: string, setting: OptionSetting, subOption = false) => {
            const label = document.createElement('label');
            label.className = subOption ? 'hs-hept-distributor-option hs-hept-distributor-suboption' : 'hs-hept-distributor-option';
            label.title = hint;
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.checked = HSSettings.getSetting(setting).getValue() === true;
            checkbox.addEventListener('change', () => {
                HSSettings.getSetting(setting).setValue(checkbox.checked);
            });
            label.append(checkbox, text);
            panel.appendChild(label);
            this.#controls.push(checkbox);
        };
        option('Use singularity reducers and Talisman Power',
            'For the time of the crafts, your ambrosia tree is replaced by one holding the singularity reducers '
            + '(reducer 1 outside an Exalt, reducer 2 inside), so hepteracts cost less. Your own tree is loaded back at the end.\n'
            + 'As at any loadout load, the progress of your ambrosia bars is lost.\n'
            + 'Needs the reducers unlocked, enough ambrosia and blueberries for them alone, and a loaded ambrosia loadout.\n'
            + 'With the Horseshoe shop upgrade, that tree also gets as much Talisman Power as the ambrosia left pays for: '
            + 'it lowers every singularity penalty a little more.',
            'hepteractDistributorUseReducers');
        option('Also swap when only Talisman Power can be added',
            'Off: the tree is only replaced when it adds a singularity reducer.\n'
            + 'On: also when it can\'t (reducers already in your tree, locked, too expensive, or of no use here), '
            + 'to raise Talisman Power alone. With the Horseshoe shop upgrade, hepteracts then cost a fraction of a percent less, '
            + 'and the progress of your ambrosia bars is lost for it.',
            'hepteractDistributorTalismanAlone', true);
        option('Allow partly filled meters',
            'Off: only whole steps, so every meter ends full, and what can\'t pay a whole step stays unspent.\n'
            + 'On: what is left goes into the hepteract furthest behind anyway. It only expands when at least what the '
            + 'expansion consumes can be crafted back, so a balance never goes down.',
            'hepteractDistributorAllowPartial');

        const actions = document.createElement('div');
        actions.className = 'hs-hept-distributor-actions';
        const button = (text: string, hint: string, onClick: () => void): HTMLButtonElement => {
            const element = document.createElement('button');
            element.type = 'button';
            element.textContent = text;
            element.title = hint;
            element.addEventListener('click', onClick);
            actions.appendChild(element);
            this.#controls.push(element);
            return element;
        };
        this.#distributeButton = button('Distribute',
            'Spend your hepteracts following the ratios.\n'
            + 'The game only crafts without the other resources at an ascension: the Distributor ascends once to collect '
            + 'your ascension\'s reward, then once per hepteract it crafts, with only that one\'s Auto on.\n'
            + 'Your Auto switches, the autocraft percentage and the ascension confirmation are put back as they were.',
            () => void this.#distribute());
        this.#matchButton = button('Match current', 'Set the ratios from what the current capacities are worth in hepteracts, without spending anything.', () => this.#matchCurrent());
        button('Reset', 'Set every ratio to 0.', () => this.#resetRatios());
        panel.appendChild(actions);

        const warning = document.createElement('div');
        warning.className = 'hs-hept-distributor-warning';
        warning.textContent = ASCENSION_WARNING;
        panel.appendChild(warning);

        this.#status = document.createElement('div');
        this.#status.className = 'hs-hept-distributor-status';
        panel.appendChild(this.#status);

        return panel;
    }

    static #iconSlot(): HTMLElement {
        const slot = document.createElement('span');
        slot.className = 'hs-hept-distributor-icon';
        return slot;
    }

    /**
     * The game's icons are sprites set as inline styles on its own images, and change with the icon set:
     * copied again each time the panel opens and each time the forge is shown.
     * Does nothing before the panel is built.
     */
    #refreshIcons(): void {
        const copy = (slot: HTMLElement | null | undefined, image: Element | null | undefined, label: string) => {
            if (!slot || !image) return;
            const icon = image.cloneNode(false) as HTMLElement;
            icon.removeAttribute('id');
            icon.removeAttribute('class');
            icon.title = label;
            slot.replaceChildren(icon);
        };
        for (const info of HEPTERACTS) {
            copy(this.#cells.get(info.key)?.querySelector<HTMLElement>('.hs-hept-distributor-icon'),
                document.getElementById(`${info.key}HepteractImage`), info.label);
        }
        copy(this.#orbsIcon, document.getElementById('hepteractToQuarkImage'), 'Overflux Orbs');
        // The forge's own hepteract image, which has no id
        copy(this.#keepIcon, this.#tab?.querySelector('.openGrid .openImage'), 'Hepteracts to keep');
    }

    #setOpened(opened: boolean, save = true): void {
        this.#tab?.classList.toggle(OPENED_CLASS, opened);
        if (opened) {
            this.#refreshIcons();
            this.#refreshAvailability();
            this.#refreshKeepField();
        }
        if (save) HSSettings.getSetting('hepteractDistributorOpen').setValue(opened);
    }

    /**
     * The Keep field, from the current stock: its exponent (the saved distance applied to the stock, empty when
     * nothing is kept), and its greyed suggestion, one power of ten below the stock (3.4e16 owned: 15), so at most
     * a tenth of it is kept, for one digit less in the bonuses. The suggestion is only a hint.
     * @param evenFocused also rewrite the value while the player is in the field (not in the middle of typing).
     */
    #refreshKeepField(evenFocused = false): void {
        const input = this.#keepInput;
        if (!input) return;
        const owned = HSHepteractDistributor.#ownedHepteracts();
        const suggestion = HSHepteractDistributor.#stockExponent(owned) - 1;
        input.placeholder = suggestion >= 1 ? String(suggestion) : '';
        if (evenFocused || document.activeElement !== input) {
            const exponent = this.#keepExponentFor(owned);
            input.value = exponent > 0 ? String(exponent) : '';
        }
    }

    #setStatus(text: string): void {
        this.#shownReason = undefined;
        if (this.#status) this.#status.textContent = text;
    }

    /**
     * Why the Distributor can't run right now, if it can't.
     * Exalt 3 limits the ascensions and Exalt 7 is timed: nothing is done for the player there (the user's choice).
     */
    #unavailableReason(): string | undefined {
        const player = HSGlobal.exposedPlayer;
        if (!player) {
            return 'Not available with the bookmark: the Distributor needs the game loaded through the mod loader (Tampermonkey script or Steam loader).';
        }
        // The game's Auto craft only runs from the first singularity (Reset.ts)
        if (!(player.highestSingularityCount >= 1) || player.unlocks?.ascensions !== true) {
            return 'Not available before your first singularity: the game\'s Auto craft, which the Distributor uses, unlocks there.';
        }
        if (player.singularityChallenges?.limitedAscensions?.enabled) return 'Not available inside Exalt 3.';
        if (player.singularityChallenges?.limitedTime?.enabled) return 'Not available inside Exalt 7.';
        if (HSModuleManager.getModule<HSAutosing>('HSAutosing')?.isAutosingActive()) return 'Not available while autosing is running.';
        return undefined;
    }

    /** Disables Distribute while it can't run, and says why in the status line (without replacing a summary by nothing). */
    #refreshAvailability(): void {
        if (this.#running) return;
        const reason = this.#unavailableReason();
        if (this.#distributeButton) this.#distributeButton.disabled = reason !== undefined;
        if (this.#matchButton) this.#matchButton.disabled = !HSGlobal.exposedPlayer;

        if (reason !== undefined) {
            this.#setStatus(reason);
            this.#shownReason = reason;
        } else if (this.#shownReason !== undefined) {
            this.#setStatus('');
        }
    }

    #setControlsDisabled(disabled: boolean): void {
        for (const control of this.#controls) control.disabled = disabled;
    }

    // ── Ratios ───────────────────────────────────────────────────────────────────────────────────────

    #loadRatios(): Partial<Record<HepteractKey, number>> {
        const ratios: Partial<Record<HepteractKey, number>> = {};
        const saved = HSSettings.getSetting('hepteractDistributorRatios').getValue();
        if (typeof saved !== 'string' || !saved) return ratios;
        try {
            const parsed = JSON.parse(saved) as Record<string, unknown> | null;
            for (const info of HEPTERACTS) {
                const value = parsed?.[info.key];
                if (typeof value === 'number' && Number.isFinite(value) && value > 0) ratios[info.key] = value;
            }
        } catch { /* Malformed saved ratios: none set */ }
        return ratios;
    }

    #saveRatios(): void {
        HSSettings.getSetting('hepteractDistributorRatios').setValue(JSON.stringify(this.#ratios));
    }

    #showRatios(): void {
        for (const [key, input] of this.#ratioInputs) {
            input.value = HSHepteractDistributor.#shownRatio(this.#ratios[key] ?? 0);
        }
    }

    /** The fields show 6 digits at most; #ratios keeps the exact values, and Distribute reads those. */
    static #shownRatio(ratio: number): string {
        if (!(ratio > 0)) return '0';
        const rounded = Number(ratio.toPrecision(6));
        return rounded >= 1e9 || rounded < 1e-4 ? rounded.toExponential().replace('+', '') : String(rounded);
    }

    #orbsPercent(): number {
        const value = HSSettings.getSetting('hepteractDistributorOrbsPercent').getValue();
        return typeof value === 'number' && Number.isFinite(value) ? Math.min(100, Math.max(0, value)) : 0;
    }

    /** The stock's power of ten (3.4e16: 16). NaN below 1 hepteract, or when it can't be read. */
    static #stockExponent(owned: number): number {
        return owned >= 1 ? Math.floor(Math.log10(owned)) : NaN;
    }

    /**
     * The power of ten to keep out of this stock: the Keep field's saved distance (how many powers of ten below
     * the stock's own) applied to it. 0: nothing kept (no distance saved, or nothing left to keep).
     */
    #keepExponentFor(owned: number): number {
        const distance = HSSettings.getSetting('hepteractDistributorKeep').getValue();
        if (typeof distance !== 'number' || !Number.isFinite(distance) || distance < 0) return 0;
        const exponent = HSHepteractDistributor.#stockExponent(owned) - Math.floor(distance);
        return exponent >= 1 ? Math.min(MAX_KEEP_EXPONENT, exponent) : 0;
    }

    /** The hepteracts kept for a power of ten. Read as a literal, so 1e23 is the number 1e23 (10 ** 23 is one float step above it). */
    static #kept(exponent: number): number {
        return exponent > 0 ? Number(`1e${exponent}`) : 0;
    }

    /** What a run may spend out of this stock: what is above the hepteracts kept, less a safety (KEEP_SAFETY). */
    static #spendable(owned: number, kept: number): number {
        return kept > 0 ? Math.max(0, owned - kept - owned * KEEP_SAFETY) : owned;
    }

    #resetRatios(): void {
        this.#ratios = {};
        this.#saveRatios();
        this.#showRatios();
        this.#setStatus('Ratios reset.');
    }

    /**
     * Ratios from what the current capacities are worth in hepteracts (the smallest one counts for 1).
     * The singularity debuff is the same for every type, so it is left out. Locked hepteracts keep theirs.
     */
    #matchCurrent(): void {
        const worths = new Map<HepteractKey, number>();
        for (const info of HEPTERACTS) {
            if (HSHepteractDistributor.#isLocked(info.key)) continue;
            const live = HSHepteractDistributor.#readLive(info);
            if (live) worths.set(info.key, live.finalCapacity * HEPTERACT_DATA[info.key].conversion);
        }
        if (worths.size === 0) {
            this.#setStatus('Could not read the hepteracts.');
            return;
        }
        const smallest = Math.min(...worths.values());
        for (const [key, worth] of worths) this.#ratios[key] = worth / smallest;
        this.#saveRatios();
        this.#showRatios();
        this.#setStatus('Ratios set from the current capacities.');
    }

    // ── Game state ───────────────────────────────────────────────────────────────────────────────────

    /** The game writes "LOCKED" in a locked hepteract's meter, and "balance / capacity" otherwise (forge shown). */
    static #isLocked(key: HepteractKey): boolean {
        return !(document.getElementById(`${key}ProgressBarText`)?.textContent ?? '').includes('/');
    }

    static #readLive(info: HepteractInfo): HepteractState | null {
        return readHepteract(HSGlobal.exposedPlayer, info.key);
    }

    static #ownedHepteracts(): number {
        const owned = HSGlobal.exposedPlayer?.wowAbyssals;
        return typeof owned === 'number' && Number.isFinite(owned) ? owned : NaN;
    }

    /** The planner's input: the unlocked hepteracts with a ratio, from the live player, and the stock it may spend. */
    #readState(costMultiplier: number, kept: number): HepteractPlanState {
        const owned = HSHepteractDistributor.#ownedHepteracts();
        if (Number.isNaN(owned)) throw new Error('Could not read the hepteracts.');
        const hepteracts = HSHepteractDistributor.#spendable(owned, kept);

        const types: HepteractPlanType[] = [];
        for (const info of HEPTERACTS) {
            const ratio = this.#ratios[info.key] ?? 0;
            if (!(ratio > 0) || HSHepteractDistributor.#isLocked(info.key)) continue;
            const live = HSHepteractDistributor.#readLive(info);
            if (!live) throw new Error('Could not read the hepteracts.');
            types.push({ key: info.key, ratio, ...live, unitCost: HEPTERACT_DATA[info.key].conversion * costMultiplier });
        }
        return { hepteracts, types };
    }

    /**
     * The singularity debuff on hepteract costs, from a fresh save read, then checked against the cost the game
     * itself shows (#checkShownCost).
     * @returns the debuff with this many more singularity reducers than the save has (0: as it is now), and with
     * the ambrosia tree's Talisman Power upgrade at this level (left out: as it is now; Infinity: its maximum).
     * It reads the save data of this read: to call before anything else is awaited.
     */
    async #readCostMultiplier(): Promise<CostMultiplierWith> {
        const gameDataAPI = HSModuleManager.getModule<HSGameDataAPI>('HSGameDataAPI');
        const gameData = await gameDataAPI?.getForcedGameData();
        if (!gameDataAPI || !gameData) throw new Error('Could not read your current save.');

        const singularityCount = gameData.singularityCount;
        const multiplierWith: CostMultiplierWith = (addedReducers, talismanLevel) => {
            // A reducer counts as one singularity less. Never below 0: the calculation reads -1 as "the current count"
            const multiplier = gameDataAPI.calculateSingularityDebuff('Hepteract Costs',
                addedReducers > 0 ? Math.max(0, singularityCount - addedReducers) : -1, talismanLevel);
            if (typeof multiplier !== 'number' || !Number.isFinite(multiplier) || multiplier <= 0) {
                throw new Error('Could not compute the hepteract cost.');
            }
            return multiplier;
        };
        HSHepteractDistributor.#checkShownCost(multiplierWith(0));
        return multiplierWith;
    }

    /**
     * Checks a cost multiplier against the cost the game itself shows for a Chronos unit (3 digits), which
     * follows the live state at once: a game update changing the formula must not spend anything.
     */
    static #checkShownCost(multiplier: number): void {
        // The game fills the forge's description for the hepteract under the mouse. The sentence is translated:
        // its first number is the hepteract cost in every language ({{x}} of "oneCost")
        document.getElementById('chronosHepteract')?.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));
        const shown = HSNumberParser.parse(document.getElementById('hepteractCostText')?.textContent);
        const computed = HEPTERACT_DATA.chronos.conversion * multiplier;
        if (Number.isNaN(shown) || Math.abs(shown - computed) > computed * 0.011 + 1) {
            throw new Error(`Cost check failed (a Chronos unit: the game shows ${Number.isNaN(shown) ? 'nothing' : HSUtils.N(shown, 0)}, `
                + `the mod computes ${HSUtils.N(computed, 0)}). Nothing was spent.`);
        }
    }

    // ── Distribution ─────────────────────────────────────────────────────────────────────────────────

    async #distribute(): Promise<void> {
        if (this.#running) return;
        const reason = this.#unavailableReason();
        if (reason !== undefined) {
            this.#refreshAvailability();
            return;
        }
        if (!HEPTERACTS.some(info => (this.#ratios[info.key] ?? 0) > 0) && this.#orbsPercent() <= 0) {
            this.#setStatus('No ratio set.');
            return;
        }

        this.#running = true;
        this.#setControlsDisabled(true);
        this.#setStatus('Distributing…');
        try {
            const costMultiplierWith = await this.#readCostMultiplier();
            // The save read takes a moment: autosing may have started, or an Exalt been entered, meanwhile
            const lateReason = this.#unavailableReason();
            if (lateReason !== undefined) throw new Error(lateReason);
            const summary = await this.#run(costMultiplierWith);
            this.#setStatus(summary);
            // A log line shows no line break
            HSLogger.log(`Hepteract distribution: ${escapeLogText(summary.split('\n').join(' | '))}`, this.context);
        } catch (error) {
            HSLogger.warn(`Hepteract distribution stopped: ${escapeLogText(String(error))}`, this.context);
            this.#setStatus(`Stopped: ${error instanceof Error ? error.message : error}`);
        } finally {
            this.#running = false;
            this.#setControlsDisabled(false);
            if (this.#matchButton) this.#matchButton.disabled = !HSGlobal.exposedPlayer;
            // The mouse is still over the panel: no mouseenter will refresh it
            this.#refreshKeepField();
        }
    }

    /**
     * The crafting, through ascensions. Every ascension resets at once when the game's ascension confirmation is
     * off, with no dialog: the whole run is one go, before the game ticks, paints or saves, so the player's
     * switches and percentage are never seen changed.
     * @param costMultiplierWith the cost multiplier with another ambrosia tree (#readCostMultiplier).
     * @returns the summary for the status line.
     */
    async #run(costMultiplierWith: CostMultiplierWith): Promise<string> {
        const startedAt = performance.now();
        const allowPartial = HSSettings.getSetting('hepteractDistributorAllowPartial').getValue() === true;
        const orbsPercent = this.#orbsPercent();
        // The power of ten kept, from the stock now. Set again, once, after the reward ascension: from then on it
        // stays, or it would fall as the crafts spend the stock it follows
        let keptExponent = this.#keepExponentFor(HSHepteractDistributor.#ownedHepteracts());
        let kept = HSHepteractDistributor.#kept(keptExponent);
        // The Orbs' part is taken from what is above the hepteracts to keep
        const orbsToBuy = (owned: number) => Math.floor(Math.floor(HSHepteractDistributor.#spendable(owned, kept) * orbsPercent / 100) / ORB_COST);
        // A craft or the Orbs must never take the stock under the hepteracts to keep (a game change would). The
        // reserve comes from the stock, so it starts at or under it
        const checkKept = () => {
            const owned = HSHepteractDistributor.#ownedHepteracts();
            if (kept > 0 && owned < kept) {
                throw new Error(`The game spent more than planned: you now own ${HSUtils.N(owned, 0)} hepteracts, under the 1e${keptExponent} to keep.`);
            }
        };
        const notes: string[] = [];

        // The singularity reducers, when asked for and when they make hepteracts cheaper here (they don't up to
        // singularity 50, nor with the Antiquities rune). Their tree also gets Talisman Power where that makes
        // hepteracts cheaper (Horseshoe shop upgrade, its rune below the cap), and is loaded for that alone only
        // when asked. Only prepared: the tree changes after the reward
        const plainCostMultiplier = costMultiplierWith(0);
        let costMultiplier = plainCostMultiplier;
        let reducerSwap: HSSingReducerSwap | undefined;
        if (HSSettings.getSetting('hepteractDistributorUseReducers').getValue() === true) {
            const reducersHelp = costMultiplierWith(MOST_TREE_REDUCERS) < plainCostMultiplier;
            const talismanHelps = costMultiplierWith(0, Infinity) < plainCostMultiplier;
            const talismanAlone = talismanHelps && HSSettings.getSetting('hepteractDistributorTalismanAlone').getValue() === true;
            if (reducersHelp || talismanAlone) {
                const reducers = HSModuleManager.getModule<HSAmbrosia>('HSAmbrosia')
                    ?.prepareSingReducerSwap({ reducers: reducersHelp, raiseTalisman: talismanHelps, talismanAlone })
                    ?? { note: 'Singularity reducers not used: the mod\'s ambrosia module is not loaded.' };
                if (reducers.stop) throw new Error(reducers.stop);
                if (reducers.note) notes.push(reducers.note);
                const withSwap = reducers.swap ? costMultiplierWith(reducers.swap.added, reducers.swap.talismanLevel) : plainCostMultiplier;
                if (withSwap < plainCostMultiplier) {
                    reducerSwap = reducers.swap;
                    costMultiplier = withSwap;
                }
            }
        }

        // Nothing to craft with what is owned: the player's ascension is left alone (its reward isn't known)
        const firstPlan = planHepteractDistribution(this.#readState(costMultiplier, kept), allowPartial);
        const player = HSGlobal.exposedPlayer;
        if (!player) throw new Error('Could not read the game.');
        if (firstPlan.targets.length === 0 && !(orbsToBuy(HSHepteractDistributor.#ownedHepteracts()) >= 1)) {
            if (player.challengecompletions?.[10] > 0) {
                notes.push('The reward of your current ascension is not counted: ascend, then press Distribute again.');
            }
            return this.#summary({ plan: firstPlan, orbsPercent, keptExponent, ascensions: 0, notes });
        }

        const original = new Map<GameSwitch, boolean>();
        const turn = (gameSwitch: GameSwitch, on: boolean): boolean => {
            if (!original.has(gameSwitch)) original.set(gameSwitch, gameSwitch.isOn(player));
            return HSHepteractDistributor.#setSwitch(gameSwitch, on);
        };
        const originalPercentage = player.hepteractAutoCraftPercentage;
        const balances = new Map<HepteractKey, { before: number, after: number }>();
        let orbsBought: number | undefined;
        let ascensions = 0;
        let plan = firstPlan;
        let treeChanged = false;
        let swapApplied = false;

        try {
            for (const gameSwitch of [...HEPTERACT_AUTOS, ORBS_AUTO, ASCENSION_CONFIRMATION]) {
                if (!turn(gameSwitch, false)) throw new Error('Could not switch the game\'s Auto and confirmation off. Nothing was spent.');
            }

            // The current ascension's reward, with the player's automations as they are. No Auto is on: no craft.
            // Without a Challenge 10 completion the game gives no reward, as for every ascension that follows
            if (player.challengecompletions?.[10] > 0) {
                await this.#ascend(() => !(player.challengecompletions?.[10] > 0), 'The game did not ascend. Nothing was spent.');
                ascensions++;
            }

            // Not fatal: below singularity 10 the game ignores these clicks, and doesn't auto-open either
            for (const gameSwitch of ASCENSION_AUTOMATIONS) turn(gameSwitch, false);

            // After the reward, which the player's own tree earns. The game's shown cost follows the tree at once
            if (reducerSwap) {
                treeChanged = true;
                if (reducerSwap.apply()) {
                    HSHepteractDistributor.#checkShownCost(costMultiplier);
                    swapApplied = true;
                } else {
                    notes.push('Singularity reducers not used: the game did not load their tree.');
                    costMultiplier = plainCostMultiplier;
                }
            }

            // The stock now holds the reward, and only goes down from here
            keptExponent = this.#keepExponentFor(HSHepteractDistributor.#ownedHepteracts());
            kept = HSHepteractDistributor.#kept(keptExponent);

            if (orbsPercent > 0) {
                orbsBought = 0;
                const owned = HSHepteractDistributor.#ownedHepteracts();
                if (orbsToBuy(owned) >= 1) {
                    const orbsBefore = Number(player.overfluxOrbs);
                    // Orbs Auto alone: the game spends this percentage of the whole stock on Orbs, so the
                    // percentage of what is above the hepteracts to keep is scaled to it
                    player.hepteractAutoCraftPercentage = orbsPercent * HSHepteractDistributor.#spendable(owned, kept) / owned;
                    if (!turn(ORBS_AUTO, true)) throw new Error('Could not switch Orbs Auto on.');
                    await this.#ascend(() => Number(player.overfluxOrbs) > orbsBefore, 'The game did not buy the Orbs.');
                    ascensions++;
                    turn(ORBS_AUTO, false);
                    checkKept();
                    orbsBought = Number(player.overfluxOrbs) - orbsBefore;
                }
            }

            // The stock is now exact: the reward is in, and the next ascensions give none
            plan = planHepteractDistribution(this.#readState(costMultiplier, kept), allowPartial);
            for (const target of plan.targets) {
                const info = HEPTERACTS.find(hepteract => hepteract.key === target.key)!;
                const auto = HEPTERACT_AUTOS[HEPTERACTS.indexOf(info)];
                const before = HSHepteractDistributor.#readLive(info)!.balance;
                const owned = HSHepteractDistributor.#ownedHepteracts();

                // With one Auto on, the game gives it owned x percentage / 100. Its prompt only takes whole
                // percentages, its formula any number: the exact share is written, and put back at the end.
                // Never more than what is above the hepteracts to keep, the margin included
                const spendable = HSHepteractDistributor.#spendable(owned, kept);
                const amount = target.partial ? spendable : Math.min(spendable, (target.units * AMOUNT_MARGIN + 0.5) * HEPTERACT_DATA[info.key].conversion * costMultiplier);
                player.hepteractAutoCraftPercentage = owned > 0 ? Math.min(100, amount / owned * 100) : 0;
                if (!turn(auto, true)) throw new Error(`Could not switch ${info.label}'s Auto on.`);
                await this.#ascend(() => HSHepteractDistributor.#readLive(info)?.balance !== before, `The game did not craft ${info.label}.`);
                ascensions++;
                turn(auto, false);
                checkKept();

                const after = HSHepteractDistributor.#readLive(info)!.balance;
                balances.set(info.key, { before, after });
                if (!target.partial && after !== target.balance) {
                    notes.push(`${info.label} ended at ${HSUtils.N(after, 0)}, not the planned ${HSUtils.N(target.balance, 0)}.`);
                }
            }
        } finally {
            // Also when the run stops on an error, where the notes are not shown: said in a notification too
            if (treeChanged && !reducerSwap?.restore()) {
                const failure = 'Could not load your ambrosia tree back: load your loadout again.';
                notes.push(failure);
                HSLogger.warn(failure, this.context);
                HSUI.Notify(`Hepteract Distributor: ${failure}`, { notificationType: 'warning' });
            }
            player.hepteractAutoCraftPercentage = originalPercentage;
            for (const [gameSwitch, on] of original) {
                if (!HSHepteractDistributor.#setSwitch(gameSwitch, on)) notes.push(`Could not put the game's switch #${gameSwitch.id} back.`);
            }
        }

        // What the last type could not afford, on what is left now (at the cost of the next press, reducers included)
        const left = planHepteractDistribution(this.#readState(costMultiplier, kept), allowPartial);
        const added: string[] = [];
        if (swapApplied && reducerSwap) {
            const count = (amount: number, what: string) => `${amount} ${what}${amount > 1 ? 's' : ''}`;
            if (reducerSwap.added > 0) added.push(count(reducerSwap.added, 'singularity reducer'));
            if (reducerSwap.talismanAdded > 0) added.push(count(reducerSwap.talismanAdded, 'Talisman Power level'));
        }
        HSLogger.debug(() => `Hepteract distribution: ${plan.steps} steps over ${ascensions} ascensions in `
            + `${Math.round(performance.now() - startedAt)} ms, cost multiplier ${costMultiplier}`
            + (swapApplied ? ` (${plainCostMultiplier} without the added ${added.join(' and ')})` : ''), this.context);
        if (swapApplied) {
            const saved = Math.round((1 - costMultiplier / plainCostMultiplier) * 10000) / 100;
            notes.unshift(`Ambrosia tree: ${added.join(' and ')} added for the crafts, hepteracts cost ${saved.toLocaleString()}% less.`);
        }
        return this.#summary({ plan: left, balances, orbsPercent, orbsBought, keptExponent, ascensions, notes });
    }

    #summary(run: {
        plan: HepteractPlan,
        balances?: Map<HepteractKey, { before: number, after: number }>,
        orbsPercent: number,
        orbsBought?: number,
        /** The run's power of ten kept. 0: nothing kept. */
        keptExponent: number,
        ascensions: number,
        notes?: string[],
    }): string {
        const label = (key: string) => HEPTERACTS.find(hepteract => hepteract.key === key)?.label ?? key;
        const crafted = [...run.balances ?? []].map(([key, balance]) => `${label(key)} ${HSUtils.N(balance.before, 0)} → ${HSUtils.N(balance.after, 0)}`);
        const count = run.ascensions === 0 ? '' : ` in ${run.ascensions} ascension${run.ascensions === 1 ? '' : 's'}`;
        const lines = [crafted.length > 0 ? `Done${count}. ${crafted.join(' · ')}` : `Done${count}. No hepteract crafted.`];

        const kept = HSHepteractDistributor.#kept(run.keptExponent);
        const owned = HSHepteractDistributor.#ownedHepteracts();
        if (run.orbsBought !== undefined && run.orbsBought > 0) {
            lines.push(`Orbs: ${HSUtils.N(run.orbsBought, 0)} bought.`);
        } else if (run.orbsPercent > 0) {
            lines.push(`Orbs: ${run.orbsPercent}% of your hepteracts${kept > 0 ? ' above the kept ones' : ''} can't pay one (${ORB_COST.toLocaleString()} each).`);
        }
        if (run.plan.waitingFor) {
            const have = kept > 0 ? `${HSUtils.N(HSHepteractDistributor.#spendable(owned, kept), 0)} above the 1e${run.keptExponent} kept` : HSUtils.N(owned, 0);
            lines.push(`Next: ${label(run.plan.waitingFor.key)}, which needs ${HSUtils.N(run.plan.waitingFor.hepteractsNeeded, 0)} hepteracts (you have ${have}).`);
        }
        if (kept > 0) lines.push(`Kept: 1e${run.keptExponent} hepteracts (you own ${HSUtils.N(owned, 0)}).`);
        const locked = HEPTERACTS.filter(info => (this.#ratios[info.key] ?? 0) > 0 && HSHepteractDistributor.#isLocked(info.key));
        if (locked.length > 0) lines.push(`Locked: ${locked.map(info => info.label).join(' · ')}`);
        lines.push(...run.notes ?? []);
        return lines.join('\n');
    }

    /** Puts one of the game's switches in a state, by clicking it when it isn't. @returns whether it is now. */
    static #setSwitch(gameSwitch: GameSwitch, on: boolean): boolean {
        const player = HSGlobal.exposedPlayer;
        if (gameSwitch.isOn(player) !== on) document.getElementById(gameSwitch.id)?.click();
        return gameSwitch.isOn(player) === on;
    }

    /**
     * Clicks the game's Ascend button, then waits until the live player shows the result (at once, normally).
     * The click also opens the button's hover modal: it is closed through the game's own mouseout handler,
     * as autosing does.
     */
    async #ascend(done: () => boolean, failure: string): Promise<void> {
        const button = document.getElementById('ascendbtn');
        if (!button) throw new Error('The game\'s Ascend button was not found.');
        try {
            button.click();
        } finally {
            if (!button.matches(':hover, :focus')) button.dispatchEvent(new MouseEvent('mouseout', { bubbles: true }));
        }
        if (!done() && !await HSHepteractDistributor.#settle(done)) throw new Error(failure);
    }

    /** Waits until `done`: a few microtasks first, then tasks. */
    static async #settle(done: () => boolean): Promise<boolean> {
        for (let i = 0; i < 30; i++) {
            if (done()) return true;
            await Promise.resolve();
        }
        const deadline = performance.now() + SETTLE_TIME_LIMIT_MS;
        while (performance.now() < deadline) {
            await HSUtils.sleep(0);
            if (done()) return true;
        }
        return false;
    }
}
