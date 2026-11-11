import { HSGlobal } from '../hs-global';
import { HSLogger } from '../hs-logger';
import { HSModuleRegistry } from '../module/hs-module-registry';
import { HSHeaderButtons } from './hs-header-buttons';

// A width in px, or 'full': no cap, the grid fills the header as the window grows
type GridWidth = number | 'full';
interface StoredWidth { version: 1; width: GridWidth; }

const STORAGE_KEY = 'header-grid-width';
// The game's floor for the grid and the page (Synergism.css: .headerGrid and html min-width)
const MIN_WIDTH = 1250;
const STEP = 10;

/**
 * Class: HSHeaderGridWidth
 * IsExplicitHSModule: No
 * Description:
 *     How wide the game's header grid gets, desktop only (mobile is already 2 columns across the screen). The game
 *     keeps the grid at the header's width, between a 1250px floor and a cap of about 1592px (em-based); this only
 *     moves the cap (max-width, hs-header-edit-settings.css), so the grid still follows a smaller window as in vanilla.
 *     Its columns stay equal: the game's drop outlines and the minibar limits multiply one cell's width by a span.
 *     A "Grid width" slider in the Layout section of "[HS] Header" (HSHeaderEditSettings), from the floor to the
 *     header's width; its right end stores 'full'. Reset gives the game's cap back. Kept in HSStorage, never in a save.
 * Author: Shewchou
 */
export class HSHeaderGridWidth {
    static #context = 'HSHeaderGridWidth';
    static #installed = false;
    static #width?: GridWidth;
    static #line?: HTMLElement;
    static #slider?: HTMLInputElement;
    static #value?: HTMLInputElement;
    static #reset?: HTMLButtonElement;

    /** Applies the saved width. The CSS rule comes with HSHeaderEditSettings' style block. */
    static install(): void {
        if (HSHeaderGridWidth.#installed) return;
        HSHeaderGridWidth.#installed = true;
        HSHeaderGridWidth.#load();
        HSHeaderGridWidth.#apply();
        // The slider's range follows the header's width
        window.addEventListener('resize', () => HSHeaderGridWidth.refresh());
    }

    /** The "Grid width" lines: its label, the width in use and Reset, then the slider at the section's width. */
    static buildLine(): HTMLElement {
        const line = document.createElement('div');
        line.className = 'hs-hes-width';
        line.title = 'How wide the header grid gets. At the right end, it fills the window.';
        const label = document.createElement('span');
        label.textContent = 'Grid width';

        const slider = document.createElement('input');
        slider.type = 'range';
        slider.min = `${MIN_WIDTH}`;
        slider.step = `${STEP}`;
        slider.setAttribute('aria-label', 'Header grid width');
        slider.addEventListener('input', () => {
            HSHeaderGridWidth.#width = HSHeaderGridWidth.#fromSlider(slider);
            HSHeaderGridWidth.#apply();
            HSHeaderGridWidth.refresh();
        });
        slider.addEventListener('change', () => {
            HSHeaderGridWidth.#width = HSHeaderGridWidth.#fromSlider(slider);
            HSHeaderGridWidth.#save();
            HSHeaderGridWidth.#changed();
        });

        const value = document.createElement('input');
        value.type = 'number';
        value.className = 'hs-hes-width-value';
        value.min = String(MIN_WIDTH);
        value.step = '1';
        value.setAttribute('aria-label', 'Header grid width in pixels');
        const commitWidth = () => {
            const maximum = Math.max(MIN_WIDTH, Math.floor(HSHeaderGridWidth.#available()));
            const parsed = value.valueAsNumber;
            if (!Number.isFinite(parsed)) {
                value.value = String(document.getElementById('headerGrid')?.offsetWidth ?? MIN_WIDTH);
                return;
            }
            const width = Math.max(MIN_WIDTH, Math.min(maximum, Math.round(parsed)));
            value.value = String(width);
            HSHeaderGridWidth.#width = width === maximum ? 'full' : width;
            HSHeaderGridWidth.#save();
            HSHeaderGridWidth.#changed();
        };
        value.addEventListener('change', commitWidth);
        value.addEventListener('keydown', event => {
            if (event.key !== 'Enter') return;
            event.preventDefault();
            commitWidth();
        });
        const units = document.createElement('span');
        units.textContent = 'px';

        const reset = document.createElement('button');
        reset.type = 'button';
        reset.textContent = 'Reset';
        reset.title = "Back to the game's width";
        reset.addEventListener('click', () => {
            HSHeaderGridWidth.#width = undefined;
            HSModuleRegistry.getModule('HSStorage')?.clearData(STORAGE_KEY);
            HSHeaderGridWidth.#changed();
        });

        const top = document.createElement('div');
        top.className = 'hs-hes-width-top';
        top.append(label, value, units, reset);
        line.append(top, slider);
        HSHeaderGridWidth.#line = line;
        HSHeaderGridWidth.#slider = slider;
        HSHeaderGridWidth.#value = value;
        HSHeaderGridWidth.#reset = reset;
        HSHeaderGridWidth.refresh();
        return line;
    }

    /** The slider's range and position, the width shown, Reset. Called when edit mode shows the block. */
    static refresh(): void {
        const line = HSHeaderGridWidth.#line;
        const slider = HSHeaderGridWidth.#slider;
        const grid = document.getElementById('headerGrid');
        if (!line || !slider || !grid) return;
        line.hidden = HSHeaderGridWidth.#isMobile();
        if (line.hidden) return;

        const available = HSHeaderGridWidth.#available();
        // A step past the header's width when the range isn't a whole number of steps: the right end is reachable
        slider.max = `${MIN_WIDTH + Math.ceil(Math.max(0, available - MIN_WIDTH) / STEP) * STEP}`;
        slider.disabled = available < MIN_WIDTH + STEP;
        slider.value = `${HSHeaderGridWidth.#width === 'full' ? slider.max : grid.offsetWidth}`;
        const value = HSHeaderGridWidth.#value!;
        value.max = String(Math.max(MIN_WIDTH, Math.floor(available)));
        value.disabled = slider.disabled;
        value.title = HSHeaderGridWidth.#width === 'full' ? 'Full width: follows the window' : 'Enter a width in pixels';
        if (document.activeElement !== value) value.value = String(grid.offsetWidth);
        HSHeaderGridWidth.#reset!.disabled = HSHeaderGridWidth.#width === undefined;
        HSHeaderButtons.refresh();
    }

    static #isMobile(): boolean { return document.documentElement.dataset.mobile === 'true'; }

    // The grid's width without a cap: the header's (the grid is width: 100% of it)
    static #available(): number {
        const header = document.getElementById('mainHeader');
        if (!header) return MIN_WIDTH;
        const style = getComputedStyle(header);
        return header.clientWidth - (Number.parseFloat(style.paddingLeft) || 0) - (Number.parseFloat(style.paddingRight) || 0);
    }

    static #fromSlider(slider: HTMLInputElement): GridWidth {
        const width = Number(slider.value);
        return width >= HSHeaderGridWidth.#available() ? 'full' : width;
    }

    static #apply(): void {
        const root = document.documentElement;
        const width = HSHeaderGridWidth.#width;
        root.classList.toggle('hs-header-grid-width', width !== undefined);
        if (width === undefined) root.style.removeProperty('--hs-header-grid-width');
        else root.style.setProperty('--hs-header-grid-width', width === 'full' ? 'none' : `${width}px`);
        HSHeaderButtons.refresh();
    }

    // After a saved change: the game's fitted texts (challenge progress) only refit on a window resize or a render
    static #changed(): void {
        HSHeaderGridWidth.#apply();
        window.__HS_renderHeaderLayout?.();
        HSHeaderGridWidth.refresh();
        const width = HSHeaderGridWidth.#width;
        HSLogger.log(`Header grid width: ${width === undefined ? "the game's" : width === 'full' ? 'full' : `${width} px`}`, HSHeaderGridWidth.#context);
    }

    static #load(): void {
        if (localStorage.getItem(`${HSGlobal.HSStorage.storagePrefix}${STORAGE_KEY}`) === null) return;
        const stored = HSModuleRegistry.getModule('HSStorage')?.getData<Partial<StoredWidth>>(STORAGE_KEY);
        if (stored?.version !== 1) return;
        if (stored.width === 'full') HSHeaderGridWidth.#width = 'full';
        else if (typeof stored.width === 'number' && Number.isFinite(stored.width)) {
            HSHeaderGridWidth.#width = Math.max(MIN_WIDTH, Math.round(stored.width));
        }
    }

    static #save(): void {
        const width = HSHeaderGridWidth.#width;
        if (width === undefined) return;
        if (!HSModuleRegistry.getModule('HSStorage')?.setData<StoredWidth>(STORAGE_KEY, { version: 1, width })) {
            HSLogger.warn('Could not save the header grid width', HSHeaderGridWidth.#context);
        }
    }
}
