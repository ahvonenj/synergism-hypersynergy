import { HSGlobal } from "../hs-global";
import { HSLogger } from "../hs-logger";
import { HSUI } from "../hs-ui";
import { HSCorruptionLevel, HSCorruptionLevelButton, HSCorruptionToggle } from "../hs-corruption-level";
import { HSHeaderPopover } from "./hs-header-popover";
import { HSNumberParser } from "../../hs-utils/hs-number-parser";
import corruptionHeaderCSS from "inline:../../../resource/css/module/hs-corruption-header.css";

const MODULE_ID = 'corruptionLevelHeader';
const TEXT_ID = 'corruptionLevelHeaderText';
const POPOVER_ID = 'hs-corruption-popover';
const CONTROLS_CLASS = 'hs-corruption-header-controls';
const INLINE_CLASS = 'hs-corruption-header-inline';
const INLINE_CONTROLS = 'button, input, label';
const REFRESH_MS = 250;
// Holding the module's ‹ or ›: the first repeat after the delay, ±10 instead of ±1 after that many repeats
const HOLD_DELAY_MS = 400;
const HOLD_REPEAT_MS = 120;
const HOLD_BIG_STEPS_AFTER = 10;
// The game's level row, in its order and with its classes; the Max text is the game's (translated)
const BUTTONS: { button: HSCorruptionLevelButton; text: string; className: string }[] = [
    { button: 'min', text: '0', className: 'corruptionReset' },
    { button: 'down10', text: '-10', className: 'corruptionReset' },
    { button: 'down1', text: '-1', className: 'corruptionDown' },
    { button: 'up1', text: '+1', className: 'corruptionUp' },
    { button: 'up10', text: '+10', className: 'corruptionMax' },
    { button: 'max', text: 'Max', className: 'corruptionMax' },
];
// Short names (user's choice), the game's sentence as their tooltip
const TOGGLES: { toggle: HSCorruptionToggle; label: string; fallbackTitle: string }[] = [
    { toggle: 'autoIncrease', label: 'Auto-climb', fallbackTitle: 'Move up to each newly unlocked level automatically' },
    { toggle: 'cleanseToHighest', label: 'Cleanse to highest', fallbackTitle: 'Cleanse to your highest cleared level instead of level 0' },
];
// As the game's Confirm button, shown 10 s after its Cleanse
const CLEANSE_CONFIRM_MS = 10000;

interface HSCorruptionPlayer {
    corruptions?: { used?: number };
    currentChallenge?: { ascension?: number };
    highestSingularityCount?: number;
}

interface HSCorruptionCleanse {
    button: HTMLButtonElement;
    icon: HTMLImageElement;
    confirm: HTMLElement;
}

interface HSCorruptionToggleControl {
    toggle: HSCorruptionToggle;
    label: HTMLElement;
    checkbox: HTMLInputElement;
    fallbackTitle: string;
}

interface HSCorruptionPopover {
    shell: HSHeaderPopover;
    title: HTMLElement;
    row: HTMLElement;
    input: HTMLInputElement;
    maxButton: HTMLButtonElement;
    cleanse: HSCorruptionCleanse;
    toggles: HSCorruptionToggleControl[];
}

interface HSCorruptionInline {
    element: HTMLElement;
    used: HTMLElement;
    maxLink: HTMLButtonElement;
    level: HTMLElement;
    input: HTMLInputElement;
    maxButton: HTMLButtonElement;
    toggle: HSCorruptionToggleControl;
}

/**
 * Class: HSCorruptionHeader
 * IsExplicitHSModule: No
 * Description:
 *     The mod's additions to the game's "Corruption level" header module (corruptionLevelHeader, "used/max"):
 *     - Next level and controls (setting corruptionHeaderControls): " → 30" in silver after the game's text while the
 *       next ascension's level differs from the one shown (in an ascension challenge the game shows 0). A click on
 *       the module opens a popover under it with the Corruption tab's cleanse (its icon; a second click within 10 s
 *       confirms, as the game's Cleanse then Confirm), its level row (0, -10, -1, input, +1, +10, Max) and its two
 *       toggles, all done through the game's own controls (HSCorruptionLevel). The cleanse and the row are hidden
 *       while the max is 0 (as the game's row). Read every 250 ms while the module is seen; no patcher feature (without
 *       the live player, the levels come from the game's text and controls).
 *     - Level controls in the module (setting corruptionHeaderInline, under the one above): at M, the next level
 *       between ‹ and ›, and /max as a Max button; at L, also 0, Max, the cleanse and Auto-climb. The CSS shows them by
 *       the module's size and hides the game's text, which keeps being written and read. The icon and the used level
 *       still open the popover.
 *     - Keep visible (setting corruptionHeaderAlwaysShown): the game shows the module once Challenge 11 is completed,
 *       so it hid at the start of each singularity; kept after the first singularity (when the game unlocks its
 *       Corruption tab). Needs the patcher's capture of the unlock checks (window.__HS_headerModuleUnlocks).
 * Author: Shewchou
 */
export class HSCorruptionHeader {
    static #context = 'HSCorruptionHeader';
    static #cssInjected = false;
    static #timer?: ReturnType<typeof setInterval>;
    static #module?: HTMLElement;
    static #text?: HTMLElement;
    static #next?: HTMLSpanElement;
    static #popover?: HSCorruptionPopover;
    static #inline?: HSCorruptionInline;
    static #inlineWanted = false;
    // While ‹ or › is held
    static #repeatTimer?: ReturnType<typeof setTimeout>;
    // The popover's and the module's
    static #cleanses: HSCorruptionCleanse[] = [];
    // While the cleanse waits for its confirming click
    static #cleanseTimer?: ReturnType<typeof setTimeout>;
    // The game's own unlock check of the module, while the mod's replaces it
    static #gameUnlock?: () => boolean;

    // ======================================================
    // --------------- Next level and controls ---------------
    // ======================================================

    static enableControls(): void {
        if (HSCorruptionHeader.#timer !== undefined) return;
        const module = document.getElementById(MODULE_ID);
        const text = document.getElementById(TEXT_ID);
        if (!module || !text) {
            HSLogger.debug(() => 'No corruption level module in the game header: no next level', HSCorruptionHeader.#context);
            return;
        }
        HSCorruptionHeader.#injectStyle();

        // After the game's text, never inside it: the game rewrites that span
        const next = document.createElement('span');
        next.className = 'hs-corruption-header-next';
        text.after(next);
        HSCorruptionHeader.#module = module;
        HSCorruptionHeader.#text = text;
        HSCorruptionHeader.#next = next;

        // In edit mode the game's capture listener stops the click before it reaches the module
        module.addEventListener('click', HSCorruptionHeader.#onModuleClick);
        document.documentElement.classList.add(CONTROLS_CLASS);
        HSCorruptionHeader.#timer = setInterval(() => HSCorruptionHeader.#refresh(), REFRESH_MS);
        HSCorruptionHeader.#syncInline();
        HSCorruptionHeader.#refresh();
    }

    static disableControls(): void {
        if (HSCorruptionHeader.#timer === undefined) return;
        clearInterval(HSCorruptionHeader.#timer);
        HSCorruptionHeader.#timer = undefined;
        HSCorruptionHeader.#syncInline();
        HSCorruptionHeader.#close();
        HSCorruptionHeader.#module?.removeEventListener('click', HSCorruptionHeader.#onModuleClick);
        HSCorruptionHeader.#next?.remove();
        HSCorruptionHeader.#next = undefined;
        document.documentElement.classList.remove(CONTROLS_CLASS);
    }

    static #injectStyle(): void {
        if (HSCorruptionHeader.#cssInjected) return;
        HSCorruptionHeader.#cssInjected = true;
        HSUI.injectStyle(corruptionHeaderCSS, 'hs-corruption-header-css');
        HSUI.flushInjectedStyles();
    }

    /** The level the module shows (the game's activeCorruptionLevel) and the max, NaN when unknown. */
    static #levels(): { shown: number; max: number } {
        // "25/132", both exact integers (format(x, 0, true))
        const [textShown, max] = HSNumberParser.parseAll(HSCorruptionHeader.#text?.textContent);
        const player = HSGlobal.exposedPlayer as HSCorruptionPlayer | null;
        const used = player?.corruptions?.used;
        if (typeof used !== 'number') return { shown: textShown ?? NaN, max: max ?? NaN };
        return { shown: (player?.currentChallenge?.ascension ?? 0) !== 0 ? 0 : used, max: max ?? NaN };
    }

    static #refresh(): void {
        const module = HSCorruptionHeader.#module;
        const next = HSCorruptionHeader.#next;
        if (!module || !next || document.hidden || !module.isConnected) return;

        const seen = module.checkVisibility?.() ?? true;
        if (!seen || HSHeaderPopover.isEditing()) {
            HSCorruptionHeader.#close();
            HSCorruptionHeader.#stopRepeat();
        }
        // In the tray outside edit mode, or locked
        if (!seen) return;

        try {
            const { shown, max } = HSCorruptionHeader.#levels();
            const level = HSCorruptionLevel.getNext();
            const text = Number.isFinite(level) && level !== shown ? ` → ${Intl.NumberFormat().format(level)}` : '';
            if (next.textContent !== text) next.textContent = text;
            if (HSCorruptionHeader.#popover?.shell.isOpen) HSCorruptionHeader.#refreshPopover(level, max);
            HSCorruptionHeader.#refreshInline(level, shown, max);
        } catch (error) {
            HSLogger.warnOnce(`Could not draw the next corruption level: ${error}`, HSCorruptionHeader.#context, 'hs-corruption-header');
        }
    }

    // ======================================================
    // ----------------------- Popover -----------------------
    // ======================================================

    static #onModuleClick = (event: MouseEvent): void => {
        // The controls in the module act on their own; the rest of it opens the popover
        if (event.target instanceof Element && event.target.closest(`.hs-corr-inline :is(${INLINE_CONTROLS})`)) return;
        if (HSCorruptionHeader.#popover?.shell.isOpen) HSCorruptionHeader.#close();
        else HSCorruptionHeader.#openPopover();
    };

    static #openPopover(): void {
        const module = HSCorruptionHeader.#module;
        if (!module) return;
        const popover = HSCorruptionHeader.#popover ??= HSCorruptionHeader.#buildPopover(module);

        // The game's texts at each opening: they follow a language switch
        popover.title.textContent = `[HS] ${HSCorruptionLevel.inputLabel() ?? 'Corruption level for next Ascension'}`;
        popover.maxButton.textContent = HSCorruptionLevel.buttonText('max') ?? 'Max';
        for (const { toggle, label, fallbackTitle } of popover.toggles) {
            label.title = HSCorruptionLevel.toggleLabel(toggle) ?? fallbackTitle;
        }
        const icon = HSCorruptionLevel.cleanseIcon();
        if (icon && popover.cleanse.icon.getAttribute('src') !== icon) popover.cleanse.icon.src = icon;
        HSCorruptionHeader.#disarmCleanse();

        popover.shell.open();
        HSCorruptionHeader.#refreshPopover(HSCorruptionLevel.getNext(), HSCorruptionHeader.#levels().max);
    }

    static #close(): void {
        HSCorruptionHeader.#popover?.shell.close();
    }

    static #buildPopover(module: HTMLElement): HSCorruptionPopover {
        const shell = new HSHeaderPopover(POPOVER_ID, module, () => HSCorruptionHeader.#disarmCleanse());

        const title = document.createElement('div');
        title.className = 'hs-corr-pop-title';

        const row = document.createElement('div');
        row.className = 'hs-corr-pop-row';
        const input = HSCorruptionHeader.#buildLevelInput('hs-corr-pop-input');
        input.addEventListener('keydown', event => { if (event.key === 'Enter') input.blur(); });

        // Left of the row
        const cleanse = HSCorruptionHeader.#buildCleanse();
        row.append(cleanse.button);

        let maxButton: HTMLButtonElement | undefined;
        for (const def of BUTTONS) {
            const button = document.createElement('button');
            button.type = 'button';
            button.className = def.className;
            button.textContent = def.text;
            button.addEventListener('click', () => HSCorruptionHeader.#apply(() => HSCorruptionLevel.press(def.button)));
            // The input between -1 and +1, as on the game's tab
            if (def.button === 'up1') row.append(input);
            row.append(button);
            if (def.button === 'max') maxButton = button;
        }

        // The game's toggles on its tab, side by side
        const toggleRow = document.createElement('div');
        toggleRow.className = 'hs-corr-pop-toggles';
        const toggles = TOGGLES.map(def => {
            const control = HSCorruptionHeader.#buildToggle(def, 'corruptionToggle hs-corr-pop-toggle');
            toggleRow.append(control.label);
            return control;
        });

        shell.element.append(title, row, toggleRow);
        return { shell, title, row, input, maxButton: maxButton!, cleanse, toggles };
    }

    static #buildLevelInput(className: string): HTMLInputElement {
        const input = document.createElement('input');
        input.type = 'number';
        input.min = '0';
        input.step = '1';
        input.className = className;
        input.addEventListener('change', () => {
            const level = Math.floor(Number(input.value));
            // Emptied or not a number: the game would set 0
            if (input.value.trim() === '' || !Number.isFinite(level)) HSCorruptionHeader.#apply(() => HSCorruptionLevel.getNext());
            else HSCorruptionHeader.#apply(() => HSCorruptionLevel.setNext(level));
        });
        return input;
    }

    // The game's cleanse icon, with "OK?" over it while it waits for the second click
    static #buildCleanse(): HSCorruptionCleanse {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'hs-corr-cleanse';
        const icon = document.createElement('img');
        icon.src = HSCorruptionLevel.cleanseIcon() ?? 'Pictures/Default/CorruptExit.png';
        icon.alt = '';
        const confirm = document.createElement('span');
        confirm.className = 'hs-corr-cleanse-confirm';
        button.append(icon, confirm);
        button.addEventListener('click', () => HSCorruptionHeader.#onCleanseClick());
        const cleanse = { button, icon, confirm };
        HSCorruptionHeader.#cleanses.push(cleanse);
        return cleanse;
    }

    static #buildToggle(def: typeof TOGGLES[number], className: string): HSCorruptionToggleControl {
        const { toggle, label: text, fallbackTitle } = def;
        const label = document.createElement('label');
        label.className = className;
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.addEventListener('change', () => {
            HSCorruptionLevel.setToggle(toggle, checkbox.checked);
            const enabled = HSCorruptionLevel.getToggle(toggle);
            checkbox.checked = enabled;
            HSLogger.debug(() => `Corruption ${toggle}: ${enabled}`, HSCorruptionHeader.#context);
            HSCorruptionHeader.#refresh();
        });
        const name = document.createElement('span');
        name.textContent = text;
        label.append(checkbox, name);
        return { toggle, label, checkbox, fallbackTitle };
    }

    // A first click waits 10 s for a second one, as the game's Cleanse then Confirm: a cleanse lowers the current level at once
    static #onCleanseClick(): void {
        if (HSCorruptionHeader.#cleanseTimer === undefined) {
            for (const cleanse of HSCorruptionHeader.#cleanses) {
                // Short, over the icon: the button keeps its size (the game's Confirm text is its tooltip)
                cleanse.button.classList.add('hs-armed');
                cleanse.confirm.textContent = 'OK?';
                cleanse.button.title = HSCorruptionLevel.cleanseTexts().confirm ?? 'Confirm';
            }
            HSCorruptionHeader.#cleanseTimer = setTimeout(() => HSCorruptionHeader.#disarmCleanse(), CLEANSE_CONFIRM_MS);
            return;
        }
        HSCorruptionHeader.#disarmCleanse();
        HSCorruptionHeader.#apply(() => HSCorruptionLevel.cleanse());
        HSLogger.debug(() => 'Corruptions cleansed', HSCorruptionHeader.#context);
    }

    static #disarmCleanse(): void {
        if (HSCorruptionHeader.#cleanseTimer !== undefined) {
            clearTimeout(HSCorruptionHeader.#cleanseTimer);
            HSCorruptionHeader.#cleanseTimer = undefined;
        }
        const title = HSCorruptionLevel.cleanseTexts().cleanse ?? 'Cleanse';
        for (const cleanse of HSCorruptionHeader.#cleanses) {
            cleanse.button.classList.remove('hs-armed');
            cleanse.confirm.textContent = '';
            cleanse.button.title = title;
            cleanse.button.setAttribute('aria-label', title);
        }
    }

    /** A change through the game's controls, then the module and popover show what the game kept. */
    static #apply(change: () => number): void {
        const kept = change();
        HSLogger.debug(() => `Next corruption level: ${kept}`, HSCorruptionHeader.#context);
        // The inputs show the kept level even while focused (a level the game lowered)
        if (Number.isFinite(kept)) {
            for (const input of [HSCorruptionHeader.#popover?.input, HSCorruptionHeader.#inline?.input]) {
                if (input) input.value = String(kept);
            }
        }
        HSCorruptionHeader.#refresh();
    }

    static #refreshPopover(level: number, max: number): void {
        const popover = HSCorruptionHeader.#popover;
        if (!popover) return;

        // The game hides its level row while the max is 0
        popover.row.hidden = !(max > 0);
        // Not while the player types in it
        const value = Number.isFinite(level) ? String(level) : '';
        if (document.activeElement !== popover.input && popover.input.value !== value) popover.input.value = value;
        for (const { toggle, checkbox } of popover.toggles) {
            const enabled = HSCorruptionLevel.getToggle(toggle);
            if (checkbox.checked !== enabled) checkbox.checked = enabled;
        }

        popover.shell.place();
    }

    // ======================================================
    // ---------------- Controls in the module ---------------
    // ======================================================

    static setInline(enabled: boolean): void {
        HSCorruptionHeader.#inlineWanted = enabled;
        HSCorruptionHeader.#syncInline();
        HSCorruptionHeader.#refresh();
    }

    // Under the next level and controls setting: both settings' actions come here, in either order
    static #syncInline(): void {
        const module = HSCorruptionHeader.#module;
        const shown = HSCorruptionHeader.#inlineWanted && HSCorruptionHeader.#timer !== undefined && !!module;
        document.documentElement.classList.toggle(INLINE_CLASS, shown);
        if (shown) {
            const inline = HSCorruptionHeader.#inline ??= HSCorruptionHeader.#buildInline();
            if (!inline.element.isConnected) module.append(inline.element);
            HSCorruptionHeader.#refreshInlineTexts();
            return;
        }
        HSCorruptionHeader.#stopRepeat();
        HSCorruptionHeader.#disarmCleanse();
        HSCorruptionHeader.#inline?.element.remove();
    }

    static #buildInline(): HSCorruptionInline {
        const element = document.createElement('span');
        element.className = 'hs-corr-inline';
        // The game holds a press on a module for its edit mode: only outside the controls
        element.addEventListener('pointerdown', event => {
            if (event.target instanceof Element && event.target.closest(INLINE_CONTROLS)) event.stopPropagation();
        });
        // The tooltips and Max follow a language switch when the pointer comes
        element.addEventListener('pointerenter', () => HSCorruptionHeader.#refreshInlineTexts());
        window.addEventListener('blur', () => HSCorruptionHeader.#stopRepeat());

        const used = document.createElement('span');
        const maxLink = HSCorruptionHeader.#buildInlineButton('', 'hs-corr-inline-max-link', () => HSCorruptionLevel.press('max'));

        const level = document.createElement('span');
        level.className = 'hs-corr-inline-level';
        const input = HSCorruptionHeader.#buildLevelInput('hs-corr-inline-input');
        input.addEventListener('focus', () => input.select());
        input.addEventListener('keydown', event => {
            if (event.key === 'Enter') input.blur();
            else if (event.key === 'Escape') {
                input.value = String(HSCorruptionLevel.getNext());
                input.blur();
            } else if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
                event.preventDefault();
                const up = event.key === 'ArrowUp';
                HSCorruptionHeader.#apply(() => HSCorruptionLevel.press(event.shiftKey ? (up ? 'up10' : 'down10') : (up ? 'up1' : 'down1')));
                input.select();
            }
        });
        const maxButton = HSCorruptionHeader.#buildInlineButton('Max', 'hs-corr-inline-btn hs-corr-wide', () => HSCorruptionLevel.press('max'));
        const cleanse = HSCorruptionHeader.#buildCleanse();
        cleanse.button.classList.add('hs-corr-wide');
        level.append(
            HSCorruptionHeader.#buildInlineButton('0', 'hs-corr-inline-btn hs-corr-wide', () => HSCorruptionLevel.press('min')),
            HSCorruptionHeader.#buildStepper('hs-corr-step-down', '−1, Shift −10, hold to repeat', 'down1', 'down10'),
            input,
            HSCorruptionHeader.#buildStepper('hs-corr-step-up', '+1, Shift +10, hold to repeat', 'up1', 'up10'),
            maxButton,
            cleanse.button,
        );

        const toggle = HSCorruptionHeader.#buildToggle(TOGGLES[0], 'hs-corr-inline-toggle hs-corr-wide');
        element.append(used, maxLink, level, toggle.label);
        return { element, used, maxLink, level, input, maxButton, toggle };
    }

    static #buildInlineButton(text: string, className: string, change: () => number): HTMLButtonElement {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = className;
        button.textContent = text;
        button.addEventListener('click', () => HSCorruptionHeader.#apply(change));
        return button;
    }

    // Steps at the press, so a hold goes on from it; a click without a pointer comes from the keyboard
    static #buildStepper(className: string, title: string, small: HSCorruptionLevelButton, big: HSCorruptionLevelButton): HTMLButtonElement {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = `hs-corr-inline-btn ${className}`;
        button.title = title;
        button.setAttribute('aria-label', title);
        const press = (which: HSCorruptionLevelButton) => HSCorruptionHeader.#apply(() => HSCorruptionLevel.press(which));
        button.addEventListener('pointerdown', event => {
            if (event.button !== 0) return;
            HSCorruptionHeader.#stopRepeat();
            press(event.shiftKey ? big : small);
            let repeats = 0;
            const repeat = () => {
                const before = HSCorruptionLevel.getNext();
                repeats++;
                press(event.shiftKey || repeats > HOLD_BIG_STEPS_AFTER ? big : small);
                // At 0 or the max
                HSCorruptionHeader.#repeatTimer = HSCorruptionLevel.getNext() === before ? undefined : setTimeout(repeat, HOLD_REPEAT_MS);
            };
            HSCorruptionHeader.#repeatTimer = setTimeout(repeat, HOLD_DELAY_MS);
        });
        for (const stop of ['pointerup', 'pointerleave', 'pointercancel']) {
            button.addEventListener(stop, () => HSCorruptionHeader.#stopRepeat());
        }
        button.addEventListener('click', event => {
            if (event.detail === 0) press(event.shiftKey ? big : small);
        });
        return button;
    }

    static #stopRepeat(): void {
        clearTimeout(HSCorruptionHeader.#repeatTimer);
        HSCorruptionHeader.#repeatTimer = undefined;
    }

    static #refreshInlineTexts(): void {
        const inline = HSCorruptionHeader.#inline;
        if (!inline) return;
        const max = HSCorruptionLevel.buttonText('max') ?? 'Max';
        inline.maxButton.textContent = max;
        inline.maxLink.title = max;
        inline.input.title = HSCorruptionLevel.inputLabel() ?? 'Corruption level for next Ascension';
        inline.toggle.label.title = HSCorruptionLevel.toggleLabel(inline.toggle.toggle) ?? inline.toggle.fallbackTitle;
    }

    static #refreshInline(level: number, shown: number, max: number): void {
        const inline = HSCorruptionHeader.#inline;
        if (!inline?.element.isConnected) return;

        // The game's text as it is written ("25/132"), which keeps its number format
        const text = HSCorruptionHeader.#text?.textContent ?? '';
        const slash = text.indexOf('/');
        const usedText = slash < 0 ? text : text.slice(0, slash);
        const maxText = slash < 0 ? '' : text.slice(slash);
        if (inline.used.textContent !== usedText) inline.used.textContent = usedText;
        if (inline.maxLink.textContent !== maxText) inline.maxLink.textContent = maxText;

        // The game hides its level row while the max is 0
        const hasLevels = max > 0;
        inline.level.hidden = !hasLevels;
        inline.maxLink.disabled = !hasLevels;

        // Not while the player types in it
        const value = Number.isFinite(level) ? String(level) : '';
        if (document.activeElement !== inline.input && inline.input.value !== value) inline.input.value = value;
        inline.input.classList.toggle('hs-corr-pending', level !== shown);
        // Room for the max's digits in both numbers, so the controls don't move when a level changes
        const digits = Math.max(2, String(Number.isFinite(max) ? max : 0).length);
        const usedWidth = `${digits}ch`;
        if (inline.used.style.minWidth !== usedWidth) inline.used.style.minWidth = usedWidth;
        const width = `calc(${digits}ch + 4px)`;
        if (inline.input.style.width !== width) inline.input.style.width = width;

        const enabled = HSCorruptionLevel.getToggle(inline.toggle.toggle);
        if (inline.toggle.checkbox.checked !== enabled) inline.toggle.checkbox.checked = enabled;
    }

    // ======================================================
    // --------------------- Keep visible --------------------
    // ======================================================

    /**
     * Replaces the game's unlock check of the module (Challenge 11 completed, HeaderModules.ts) with "that, or a
     * singularity done", sets headerModuleLocked and renders (the game checks its locks only at its next revealStuff,
     * as HSHeaderModules.register); off puts the game's check back. The object lives for the page: a singularity
     * keeps it. Changing the check, not the CSS: the render counts grid rows from the same checks.
     */
    static setAlwaysShown(enabled: boolean): void {
        const unlocks = window.__HS_headerModuleUnlocks;
        const render = window.__HS_renderHeaderLayout;
        if (!unlocks || typeof render !== 'function') return;

        const gameUnlock = HSCorruptionHeader.#gameUnlock ?? unlocks[MODULE_ID];
        if (typeof gameUnlock !== 'function') return;
        if (enabled) {
            if (HSCorruptionHeader.#gameUnlock) return;
            HSCorruptionHeader.#gameUnlock = gameUnlock;
            unlocks[MODULE_ID] = () => {
                const player = HSGlobal.exposedPlayer as HSCorruptionPlayer | null;
                return gameUnlock() || (player?.highestSingularityCount ?? 0) > 0;
            };
        } else {
            if (!HSCorruptionHeader.#gameUnlock) return;
            HSCorruptionHeader.#gameUnlock = undefined;
            unlocks[MODULE_ID] = gameUnlock;
        }

        try { document.getElementById(MODULE_ID)?.classList.toggle('headerModuleLocked', !unlocks[MODULE_ID]()); } catch { /* the game's next check decides */ }
        try {
            render();
        } catch (e) {
            HSLogger.warn(`The game's header could not be rendered: ${e}`, HSCorruptionHeader.#context);
        }
    }
}
