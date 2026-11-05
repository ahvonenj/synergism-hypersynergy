import { HSSettingsDefinition } from "../../../types/module-types/hs-settings-types";
import { HSGlobal } from "../hs-global";
import { HSLogger } from "../hs-logger";
import { HSUI } from "../hs-ui";
import { HSSettings } from "../settings/hs-settings";
import { HSHeaderCellSettings } from "./hs-header-cell-settings";
import { HSHeaderChallengeModule } from "./hs-header-challenge-module";
import { HSHeaderGridWidth } from "./hs-header-grid-width";
import headerEditSettingsCSS from "inline:../../../resource/css/module/hs-header-edit-settings.css";

type HSSlotCountKind = 'ambrosia';

interface HSSlotCountDef {
    setting: 'headerAmbrosiaSlotsShown';
    containerId: string;
    // The game's icon for the header module
    icon: string;
    title: string;
    name: string;
}

interface HSToggleDef {
    setting: keyof HSSettingsDefinition;
    label: string;
    // Shown only when this holds (the line makes no sense otherwise), checked at each refresh
    shown?: () => boolean;
    // Added to the tooltip without the header modules patch (bookmarklet)
    withoutPatch?: string;
}

const SLOT_COUNTS: Record<HSSlotCountKind, HSSlotCountDef> = {
    ambrosia: {
        setting: 'headerAmbrosiaSlotsShown',
        containerId: 'ambrosiaLoadoutsHeaderSlots',
        icon: 'Pictures/Default/Blueberries.png',
        title: 'How many ambrosia loadout slots the header shows. The others still work through hotkeys and the Ambrosia tab.',
        name: 'Ambrosia',
    },
};

/** A string setting picked among a few values, as a row of buttons. */
interface HSChoiceDef {
    setting: 'challengeProgressLayout' | 'challengeProgressDetails';
    label: string;
    options: { value: string; text: string; shown?: () => boolean }[];
    // The value in use, whose button is pressed (the stored one can be unknown, or not fit the other settings)
    current: () => string;
    shown?: () => boolean;
}

// The mod's modules are header modules only with the patcher's header modules patch; without it, they are in the
// mod's own row (#quickbarsRow), which "Center quick bars" moves
const hasHeaderModules = () => !!window.__HS_HEADER_MODULES_PATCHED;
const hasChallengeModule = () => hasHeaderModules() && HSSettings.getSetting('challengeProgressHeader').isEnabled();

// In the block's order; a section's grid width slider, slot counters, then its choices, then its toggles
const SECTIONS: { title: string; gridWidth?: true; slots?: true; choices?: HSChoiceDef[]; toggles: HSToggleDef[] }[] = [
    {
        title: 'Layout',
        gridWidth: true,
        toggles: [
            { setting: 'headerStatsAtBottom', label: 'Top row at the bottom' },
            { setting: 'removeHeaderGap', label: 'Remove header gap' },
            { setting: 'headerEditButton', label: '✎ Header edit button' },
            { setting: 'headerLongPressEditing', label: 'Long press to edit', shown: () => window.__HS_HEADER_LONG_PRESS_PATCHED === true },
        ],
    },
    {
        title: 'Ambrosia loadouts',
        slots: true,
        toggles: [
            { setting: 'headerFitLoadoutSlots', label: 'Fit slots to the cell' },
            { setting: 'headerHideLoadoutIcons', label: 'Hide ambrosia bar icon' },
        ],
    },
    {
        title: 'Mod modules',
        toggles: [
            { setting: 'enableAutomationQuickBar', label: 'Automation bar', withoutPatch: "It shows in the mod's row under the header." },
            { setting: 'ambrosiaMinibars', label: 'Ambrosia minibars', withoutPatch: "They show in the mod's row under the header, and need GDS (turned on with them)." },
            { setting: 'ambrosiaMinibarBorders', label: 'Minibars border' },
            { setting: 'ambrosiaRateHeader', label: 'Ambrosia per hour', shown: hasHeaderModules },
            { setting: 'challengeProgressHeader', label: 'Challenge progress', shown: hasHeaderModules },
            // Decorates the game's Singularity count module; reads the live player (bookmarklet: no popover)
            { setting: 'singularityHeaderElevator', label: 'Sing elevator popover', shown: () => !!HSGlobal.exposedPlayer },
            { setting: 'centerQuickbars', label: 'Center quick bars', shown: () => !hasHeaderModules() },
        ],
    },
    {
        title: 'Challenge progress',
        choices: [
            {
                setting: 'challengeProgressLayout', label: 'Layout', shown: hasChallengeModule,
                options: [{ value: 'line', text: 'One line' }, { value: 'lines', text: 'Lines' }],
                current: () => HSHeaderChallengeModule.layout(),
            },
            {
                setting: 'challengeProgressDetails', label: 'Details', shown: hasChallengeModule,
                options: [
                    { value: 'none', text: 'None' },
                    { value: 'completions', text: 'Completions' },
                    { value: 'requirement', text: 'Requirement', shown: () => HSHeaderChallengeModule.canShowRequirement() },
                ],
                current: () => HSHeaderChallengeModule.details(),
            },
        ],
        toggles: [
            { setting: 'challengeProgressShowNone', label: 'CØ outside challenges', shown: hasChallengeModule },
            { setting: 'compactChallengeText', label: "Game's modules: numbers only" },
        ],
    },
    {
        title: 'Corruption module',
        toggles: [
            { setting: 'corruptionHeaderControls', label: 'Next level and controls' },
            { setting: 'corruptionHeaderInline', label: 'Level controls in the module', shown: () => HSSettings.getSetting('corruptionHeaderControls').isEnabled() },
            // The game's unlock checks are reachable only through the header modules patch
            { setting: 'corruptionHeaderAlwaysShown', label: 'Keep visible', shown: hasHeaderModules },
        ],
    },
    {
        title: 'Octeracts',
        toggles: [
            { setting: 'matchOcteractIconSize', label: 'Match Oct icon size' },
            { setting: 'matchOcteractText', label: 'Match Oct text' },
        ],
    },
];

// The game's most ambrosia loadout slots: the stored value for "all"
const MAX_SLOTS = 16;
// The game's base slot count (the fewest owned): up to this many shown share one line in a grid cell
const FIT_SLOTS = 8;
const BLOCK_ID = 'hs-header-edit-settings';
const HIDE_STYLE_ID = 'hs-header-slot-count-hide-css';
const EDIT_BUTTON_ID = 'hs-header-edit-button';

/**
 * Class: HSHeaderEditSettings
 * IsExplicitHSModule: No
 * Description:
 *     "[HS] Header", a block next to the game's header tray (#headerTray, inside #headerEditPanel, which the game only
 *     shows in the header's edit mode and never rebuilds): the mod's header settings, out of the panel.
 *     - Visible slots: how many slots the game's Ambrosia loadouts module shows (the first N; the others are hidden
 *       by CSS, nth-child, so the rule outlives the game's rebuild of the slots, and still work everywhere else).
 *       Hidden setting headerAmbrosiaSlotsShown, 16 = all. The slots owned are read from the slots the game draws
 *       (all of them in edit mode). The same style block sets how many slots a row holds in a grid cell.
 *     - Checkboxes for the header settings (hidden in the panel), switched through enable()/disable(), with the
 *       panel's GDS check. They follow every change of those settings (HSSettings.onStateChange), wherever it comes
 *       from.
 *     - Rows of buttons for the string settings picked among a few values (the challenge progress module's layout
 *       and details), the value in use pressed.
 *     - The header grid's width slider (HSHeaderGridWidth), in the Layout section.
 *     The counters refresh when edit mode shows the block (the slots owned may have changed): a 1 ms CSS animation
 *     restarts each time #headerEditPanel goes from display: none to shown, and its animationstart event triggers
 *     the refresh (no observer, no polling).
 *     Also the faint pencil right of the mod icon that toggles edit mode (setting headerEditButton, on by default).
 *     No patcher feature: works for every player.
 * Author: Shewchou
 */
export class HSHeaderEditSettings {
    static #context = 'HSHeaderEditSettings';
    static #slotValues = new Map<HSSlotCountKind, HTMLElement>();
    static #minusButtons = new Map<HSSlotCountKind, HTMLButtonElement>();
    static #plusButtons = new Map<HSSlotCountKind, HTMLButtonElement>();
    static #checkboxes = new Map<keyof HSSettingsDefinition, HTMLInputElement>();
    static #toggleSections: { section: HTMLElement; toggles: { label: HTMLElement; shown?: () => boolean }[] }[] = [];
    static #choices: { choice: HSChoiceDef; buttons: { button: HTMLButtonElement; value: string; shown?: () => boolean }[] }[] = [];
    static #hideRuleInjected = false;
    static #openingEditor = false;

    /**
     * Use the game's own long-press handler on the region, without starting a module drag.
     * closeModPanel: from the panel's button, the panel would cover the header; the pencil leaves it as it is.
     */
    static async openEditor(closeModPanel = true): Promise<void> {
        const header = document.getElementById('mainHeader');
        const region = document.getElementById('headerGrid');
        if (!header || !region || HSHeaderEditSettings.#openingEditor) return;
        if (closeModPanel && HSUI.isModPanelOpen()) document.getElementById('hs-panel-close-btn')?.click();
        if (!header.classList.contains('headerEditMode')) {
            HSHeaderEditSettings.#openingEditor = true;
            // The game's hold timer (650 ms, started by its pointerdown handler through window.setTimeout) is run
            // at once instead. Not caught (a game change): wait for it as a real hold.
            let hold: (() => void) | undefined;
            const realSetTimeout = window.setTimeout;
            // The pencil and panel button are explicit requests to edit, even with long-press editing disabled.
            const longPressEnabled = window.__HS_headerLongPressEnabled;
            window.__HS_headerLongPressEnabled = true;
            window.setTimeout = ((handler: TimerHandler, timeout?: number, ...args: unknown[]) => {
                if (!hold && typeof handler === 'function' && (timeout ?? 0) >= 500) {
                    hold = () => handler(...args);
                    return 0;
                }
                return realSetTimeout(handler, timeout, ...args);
            }) as typeof window.setTimeout;
            try {
                // Target the region itself: a module target would also begin pointer capture and dragging.
                region.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, button: 0, pointerId: -1 }));
            } finally {
                window.setTimeout = realSetTimeout;
                window.__HS_headerLongPressEnabled = longPressEnabled;
            }
            try {
                if (hold) hold();
                else await new Promise(resolve => window.setTimeout(resolve, 750));
            } finally {
                region.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, button: 0, pointerId: -1 }));
                HSHeaderEditSettings.#openingEditor = false;
            }
        }
        if (header.classList.contains('headerEditMode')) {
            header.scrollIntoView({ block: 'start' });
            document.getElementById('headerEditDone')?.focus({ preventScroll: true });
        }
    }

    /** Hides the slots above the counts, and adds the block next to the game's header tray. */
    static install(): void {
        HSHeaderCellSettings.install();
        HSHeaderGridWidth.install();
        if (document.getElementById(BLOCK_ID)) return;

        // Vanilla Done only exits the editor. Its handler runs first and finishes the layout redraw;
        // then save the live layout through the game's normal save path, without waiting for autosave.
        document.getElementById('headerEditDone')?.addEventListener('click', () => {
            HSSettings.flushSettingsToStorage();
            document.getElementById('savegame')?.click();
        });

        HSUI.injectStyle(headerEditSettingsCSS, 'hs-header-edit-settings-css');
        HSHeaderEditSettings.#writeHideRule();
        HSUI.flushInjectedStyles();

        const tray = document.getElementById('headerTray');
        if (!tray) {
            HSLogger.warn('The game\'s header tray was not found: no [HS] Header block (the saved slot counts still apply)', HSHeaderEditSettings.#context);
            return;
        }
        HSHeaderEditSettings.#buildEditButton();

        const block = document.createElement('div');
        block.id = BLOCK_ID;
        const title = document.createElement('span');
        title.className = 'hs-hes-title';
        title.textContent = '[HS] Header';
        const sections = document.createElement('div');
        sections.className = 'hs-hes-sections';
        for (const section of SECTIONS) {
            const element = HSHeaderEditSettings.#buildToggleSection(section.title, section.toggles, section.choices);
            if (section.slots) element.firstElementChild!.after(...HSHeaderEditSettings.#buildSlotLines());
            if (section.gridWidth) element.firstElementChild!.after(HSHeaderGridWidth.buildLine());
            sections.append(element);
        }
        block.append(title, sections);

        block.addEventListener('animationstart', () => HSHeaderEditSettings.#refresh());
        // A setting turned on or off elsewhere while the block is shown (the panel, GDS turning its dependents off
        // and back on, Auto-Sing)
        HSSettings.onStateChange(name => {
            const checkbox = HSHeaderEditSettings.#checkboxes.get(name as keyof HSSettingsDefinition);
            if (checkbox) checkbox.checked = HSSettings.getSetting(name as keyof HSSettingsDefinition).isEnabled();
        });
        tray.after(block);
        HSHeaderEditSettings.#refresh();
    }

    // Right of the mod icon, for players who don't know the header can be edited. Shown by CSS: setting headerEditButton
    // (a class on <html>), also in edit mode, so its checkbox shows its effect. In edit mode it clicks the game's Done
    // (the mod's Done listener saves too)
    static #buildEditButton(): void {
        const button = document.createElement('button');
        button.id = EDIT_BUTTON_ID;
        button.type = 'button';
        button.title = 'Toggle header edit mode';
        button.textContent = '✎';
        button.addEventListener('click', () => {
            if (document.getElementById('mainHeader')?.classList.contains('headerEditMode')) {
                document.getElementById('headerEditDone')?.click();
            } else {
                void HSHeaderEditSettings.openEditor(false);
            }
        });
        document.body.append(button);
    }

    static #buildSection(title: string): HTMLElement {
        const section = document.createElement('div');
        section.className = 'hs-hes-section';
        const subtitle = document.createElement('span');
        subtitle.className = 'hs-hes-subtitle';
        subtitle.textContent = title;
        section.append(subtitle);
        return section;
    }

    // ======================================================
    // -------------------- Visible slots --------------------
    // ======================================================

    // Put after the subtitle of the section that has slots: true
    static #buildSlotLines(): HTMLElement[] {
        const lines: HTMLElement[] = [];
        for (const kind of Object.keys(SLOT_COUNTS) as HSSlotCountKind[]) {
            const def = SLOT_COUNTS[kind];
            const line = document.createElement('div');
            line.className = 'hs-hes-slots';
            line.title = def.title;

            const icon = document.createElement('img');
            icon.src = def.icon;
            icon.alt = def.name;

            const minus = document.createElement('button');
            minus.type = 'button';
            minus.textContent = '−';
            minus.addEventListener('click', () => HSHeaderEditSettings.#step(kind, -1));

            const value = document.createElement('span');
            value.className = 'hs-hes-slots-value';

            const plus = document.createElement('button');
            plus.type = 'button';
            plus.textContent = '+';
            plus.addEventListener('click', () => HSHeaderEditSettings.#step(kind, 1));

            HSHeaderEditSettings.#slotValues.set(kind, value);
            HSHeaderEditSettings.#minusButtons.set(kind, minus);
            HSHeaderEditSettings.#plusButtons.set(kind, plus);
            line.append(icon, minus, value, plus);
            lines.push(line);
        }
        return lines;
    }

    // The saved count, 1 to 16 (anything else in storage counts as all)
    static #getCount(kind: HSSlotCountKind): number {
        const value = Number(HSSettings.getSetting(SLOT_COUNTS[kind].setting).getValue());
        return Number.isInteger(value) && value >= 1 && value <= MAX_SLOTS ? value : MAX_SLOTS;
    }

    // The slots the game draws: all owned ones in edit mode, 0 while the module was never drawn
    static #getOwned(kind: HSSlotCountKind): number {
        return document.getElementById(SLOT_COUNTS[kind].containerId)?.children.length ?? 0;
    }

    static #step(kind: HSSlotCountKind, delta: number): void {
        const owned = HSHeaderEditSettings.#getOwned(kind);
        if (owned === 0) return;

        const shown = Math.min(HSHeaderEditSettings.#getCount(kind), owned);
        const next = Math.max(1, Math.min(owned, shown + delta));
        // All the slots owned: stored as 16, so slots bought later show too
        const stored = next >= owned ? MAX_SLOTS : next;
        if (stored !== HSHeaderEditSettings.#getCount(kind)) {
            HSSettings.getSetting(SLOT_COUNTS[kind].setting).setValue(stored);
            HSHeaderEditSettings.#writeHideRule();
            HSUI.flushInjectedStyles();
            HSLogger.log(`${SLOT_COUNTS[kind].name} loadout slots shown in the header: ${stored === MAX_SLOTS ? 'all' : stored}`, HSHeaderEditSettings.#context);
        }
        HSHeaderEditSettings.#refresh();
    }

    // The slots hidden above the count, and the slots per row in the grid (hs-header-loadout-icons.css): all of them
    // up to 8, then two even rows. The slots shown are the fewer of the count and the slots owned (8 to 16), the
    // latter read by :has from the slots the game draws, so a slot bought later needs no new rule.
    static #writeHideRule(): void {
        const rules: string[] = [];
        const perRow = (shown: number) => shown <= FIT_SLOTS ? shown : Math.ceil(shown / 2);
        for (const kind of Object.keys(SLOT_COUNTS) as HSSlotCountKind[]) {
            const id = SLOT_COUNTS[kind].containerId;
            const count = HSHeaderEditSettings.#getCount(kind);
            if (count < MAX_SLOTS) {
                rules.push(`#${id} > .headerLoadoutSlot:nth-child(n+${count + 1}) { display: none; }`);
            }
            if (count <= FIT_SLOTS) {
                rules.push(`#${id} { --hs-loadout-columns: ${count}; }`);
            } else {
                // Same specificity: the last match, the most slots owned, wins
                for (let owned = FIT_SLOTS; owned <= MAX_SLOTS; owned++) {
                    rules.push(`#${id}:has(> .headerLoadoutSlot:nth-child(${owned})) { --hs-loadout-columns: ${perRow(Math.min(count, owned))}; }`);
                }
            }
        }
        // injectStyle keeps an existing block of the same id; removing a missing one logs a warning
        if (HSHeaderEditSettings.#hideRuleInjected) HSUI.removeInjectedStyle(HIDE_STYLE_ID);
        HSHeaderEditSettings.#hideRuleInjected = rules.length > 0;
        if (rules.length > 0) HSUI.injectStyle(rules.join('\n'), HIDE_STYLE_ID);
    }

    // ======================================================
    // ---------------------- Settings ----------------------
    // ======================================================

    // Every line is built; those whose shown() fails are hidden at each refresh, with their section when it has none left
    static #buildToggleSection(title: string, toggles: HSToggleDef[], choices: HSChoiceDef[] = []): HTMLElement {
        const section = HSHeaderEditSettings.#buildSection(title);
        const built: { label: HTMLElement; shown?: () => boolean }[] = [];
        for (const choice of choices) {
            const line = HSHeaderEditSettings.#buildChoice(choice);
            if (!line) continue;
            built.push({ label: line, shown: choice.shown });
            section.append(line);
        }
        for (const toggle of toggles) {
            const definition = HSSettings.getSetting(toggle.setting)?.getDefinition();
            if (!definition) continue;

            // As "[HS] Keep my header layout" (HSHeaderKeepOnImport)
            const label = document.createElement('label');
            label.className = 'hs-hes-toggle';
            const help = [definition.settingHelpText, hasHeaderModules() ? undefined : toggle.withoutPatch];
            label.title = help.filter(Boolean).join(' ');
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.addEventListener('change', () => HSHeaderEditSettings.#toggle(toggle.setting, checkbox.checked));
            label.append(checkbox, toggle.label);

            HSHeaderEditSettings.#checkboxes.set(toggle.setting, checkbox);
            built.push({ label, shown: toggle.shown });
            section.append(label);
        }
        HSHeaderEditSettings.#toggleSections.push({ section, toggles: built });
        return section;
    }

    // Its label, then a button per value, pressed for the value in use
    static #buildChoice(choice: HSChoiceDef): HTMLElement | null {
        const definition = HSSettings.getSetting(choice.setting)?.getDefinition();
        if (!definition) return null;

        const line = document.createElement('div');
        line.className = 'hs-hes-choice';
        line.title = definition.settingHelpText ?? '';
        const label = document.createElement('span');
        label.textContent = choice.label;
        line.append(label);

        const buttons: { button: HTMLButtonElement; value: string; shown?: () => boolean }[] = [];
        for (const option of choice.options) {
            const button = document.createElement('button');
            button.type = 'button';
            button.textContent = option.text;
            button.addEventListener('click', () => HSHeaderEditSettings.#choose(choice, option.value));
            buttons.push({ button, value: option.value, shown: option.shown });
            line.append(button);
        }
        HSHeaderEditSettings.#choices.push({ choice, buttons });
        return line;
    }

    static #choose(choice: HSChoiceDef, value: string): void {
        const setting = HSSettings.getSetting(choice.setting);
        const previous = setting.getValue();
        if (value !== previous) {
            setting.setValue(value);
            HSLogger.log(`${choice.setting}: ${previous} -> ${value}`, HSHeaderEditSettings.#context);
        }
        HSHeaderEditSettings.#refresh();
    }

    static #toggle(name: keyof HSSettingsDefinition, enabled: boolean): void {
        const setting = HSSettings.getSetting(name);
        const definition = setting.getDefinition();

        // As the panel: no setting that needs GDS while GDS is off (except those that turn it on themselves)
        if (enabled && HSSettings.usesGameData(definition)
            && !HSGlobal.HSSettings.gameDataCheckBlacklist.includes(definition.settingName)
            && !HSSettings.getSetting('useGameData')?.isEnabled()) {
            HSLogger.warn(`Enable GDS before enabling ${definition.settingDescription}!`, HSHeaderEditSettings.#context);
            void HSUI.Notify(`Turn on Game Data Sniffing (mod panel) before "${definition.settingDescription}".`, { notificationType: 'warning' });
            HSHeaderEditSettings.#refresh();
            return;
        }

        HSLogger.log(`${definition.settingName}: ${!enabled} -> ${enabled}`, HSHeaderEditSettings.#context);
        if (enabled) setting.enable();
        else setting.disable();
        HSHeaderEditSettings.#refresh();
    }

    // ======================================================
    // ----------------------- Refresh -----------------------
    // ======================================================

    static #refresh(): void {
        HSHeaderGridWidth.refresh();
        for (const kind of Object.keys(SLOT_COUNTS) as HSSlotCountKind[]) {
            const owned = HSHeaderEditSettings.#getOwned(kind);
            const count = HSHeaderEditSettings.#getCount(kind);
            const all = count >= MAX_SLOTS || (owned > 0 && count >= owned);
            HSHeaderEditSettings.#slotValues.get(kind)!.textContent = all ? 'All' : `${count}`;
            HSHeaderEditSettings.#minusButtons.get(kind)!.disabled = owned === 0 || Math.min(count, owned) <= 1;
            HSHeaderEditSettings.#plusButtons.get(kind)!.disabled = owned === 0 || all;
        }
        for (const [name, checkbox] of HSHeaderEditSettings.#checkboxes) {
            checkbox.checked = HSSettings.getSetting(name).isEnabled();
        }
        for (const { choice, buttons } of HSHeaderEditSettings.#choices) {
            const current = choice.current();
            for (const { button, value, shown } of buttons) {
                button.hidden = shown ? !shown() : false;
                button.setAttribute('aria-pressed', String(value === current));
            }
        }
        for (const { section, toggles } of HSHeaderEditSettings.#toggleSections) {
            for (const toggle of toggles) toggle.label.hidden = toggle.shown ? !toggle.shown() : false;
            section.hidden = toggles.every(toggle => toggle.label.hidden);
        }
    }
}
