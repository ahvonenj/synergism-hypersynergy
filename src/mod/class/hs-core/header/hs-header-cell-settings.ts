import { HSGlobal } from '../hs-global';
import { HSLogger } from '../hs-logger';
import { HSUI } from '../hs-ui';
import { HSModuleRegistry } from '../module/hs-module-registry';
import { HSHeaderChallengeProgress } from './hs-header-challenge-progress';
import { HSHeaderButtons } from './hs-header-buttons';
import cellSettingsCSS from 'inline:../../../resource/css/module/hs-header-cell-settings.css';

type Alignment = 'left' | 'center' | 'right';
type VerticalAlignment = 'top' | 'center' | 'bottom';
type LayoutKey = 'desktop' | 'mobile';
interface CellSettings { align?: Alignment; vertical?: VerticalAlignment; half?: true; }
interface StoredSettings {
    version: 1;
    layouts: Record<LayoutKey, Record<string, CellSettings>>;
}
interface HeaderCell {
    key: string;
    element: HTMLElement;
    modules: HTMLElement[];
}

const STORAGE_KEY = 'header-cells';
const REGIONS = ['ascensionStats', 'headerGrid'] as const;
const MAX_SLOT = 200;
const ALIGNMENTS: Alignment[] = ['left', 'center', 'right'];
const VERTICAL_ALIGNMENTS: VerticalAlignment[] = ['top', 'center', 'bottom'];

/** Per-cell presentation, kept outside vanilla saves. Uses the same selection as the game's size buttons. */
export class HSHeaderCellSettings {
    static #context = 'HSHeaderCellSettings';
    static #settings: StoredSettings = { version: 1, layouts: { desktop: {}, mobile: {} } };
    static #alignButtons = new Map<Alignment, HTMLButtonElement>();
    static #heightButtons = new Map<'full' | 'half', HTMLButtonElement>();
    static #verticalButtons = new Map<VerticalAlignment, HTMLButtonElement>();
    static #seenLayouts?: object;
    static #seenLayout: Partial<Record<LayoutKey, object>> = {};

    static install(): void {
        const toolbar = document.getElementById('headerEditToolbar');
        if (!toolbar || document.getElementById('hs-header-cell-alignment')) return;
        HSHeaderCellSettings.#load();
        HSUI.injectStyle(cellSettingsCSS, 'hs-header-cell-settings-css');
        HSUI.flushInjectedStyles();
        HSHeaderChallengeProgress.install();
        HSHeaderButtons.install();

        const alignment = HSHeaderCellSettings.#group('hs-header-cell-alignment', 'Horizontal');
        for (const value of ALIGNMENTS) {
            const button = HSHeaderCellSettings.#button(value[0].toUpperCase() + value.slice(1), () => {
                // A click on the pressed button clears it: the cell goes back to the game's layout.
                HSHeaderCellSettings.#change({ align: button.getAttribute('aria-pressed') === 'true' ? undefined : value });
            });
            button.id = `hs-header-align-${value}`;
            alignment.append(button);
            HSHeaderCellSettings.#alignButtons.set(value, button);
        }
        const height = HSHeaderCellSettings.#group('hs-header-cell-height', 'Height');
        for (const value of ['full', 'half'] as const) {
            const button = HSHeaderCellSettings.#button(value === 'full' ? 'Full' : 'Half', () => {
                HSHeaderCellSettings.#change({ half: value === 'half' ? true : undefined });
            });
            button.id = `hs-header-height-${value}`;
            height.append(button);
            HSHeaderCellSettings.#heightButtons.set(value, button);
        }
        const vertical = HSHeaderCellSettings.#group('hs-header-cell-vertical-alignment', 'Vertical');
        for (const value of VERTICAL_ALIGNMENTS) {
            const button = HSHeaderCellSettings.#button(value[0].toUpperCase() + value.slice(1), () => {
                HSHeaderCellSettings.#change({ vertical: button.getAttribute('aria-pressed') === 'true' ? undefined : value });
            });
            button.id = `hs-header-vertical-${value}`;
            vertical.append(button);
            HSHeaderCellSettings.#verticalButtons.set(value, button);
        }
        // Keep the cell controls beside the native size controls, ahead of Reset and Done.
        toolbar.firstElementChild?.after(alignment, vertical, height);

        const observer = new MutationObserver(records => HSHeaderCellSettings.#refresh(records.some(record => record.type === 'childList')));
        for (const id of REGIONS) {
            const region = document.getElementById(id);
            // The game's renderer replaces the slots directly. Currency/text updates below them are ignored.
            if (region) observer.observe(region, { childList: true });
        }
        const header = document.getElementById('mainHeader');
        if (header) observer.observe(header, { attributes: true, attributeFilter: ['class'] });
        observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-mobile'] });
        HSHeaderCellSettings.#refresh();
    }

    static #group(id: string, label: string): HTMLElement {
        const group = document.createElement('div');
        group.id = id;
        group.className = 'headerEditGroup hs-header-cell-controls';
        group.setAttribute('role', 'group');
        group.setAttribute('aria-label', label);
        const title = document.createElement('span');
        title.textContent = label;
        group.append(title);
        return group;
    }

    static #button(label: string, action: () => void): HTMLButtonElement {
        const button = document.createElement('button');
        button.type = 'button';
        button.textContent = label;
        button.disabled = true;
        button.setAttribute('aria-pressed', 'false');
        button.addEventListener('click', action);
        return button;
    }

    static #layoutKey(): LayoutKey {
        return document.documentElement.dataset.mobile === 'true' ? 'mobile' : 'desktop';
    }

    static #cells(): HeaderCell[] {
        const cells: HeaderCell[] = [];
        for (const id of REGIONS) {
            const region = document.getElementById(id);
            for (const child of Array.from(region?.children ?? [])) {
                if (!(child instanceof HTMLElement)) continue;
                const index = Number(child.dataset.headerSlot);
                if (child.dataset.headerSlot === undefined || !Number.isInteger(index) || index < 0 || index > MAX_SLOT) continue;
                const modules = child.classList.contains('headerModule') ? [child]
                    : Array.from(child.querySelectorAll<HTMLElement>(':scope > .headerModule'));
                if (modules.length > 0) cells.push({ key: `${id}:${index}`, element: child, modules });
            }
        }
        return cells;
    }

    static #selected(cells: HeaderCell[]): HeaderCell | undefined {
        if (!document.getElementById('mainHeader')?.classList.contains('headerEditMode')) return;
        return cells.find(cell => cell.modules.some(module => module.classList.contains('headerModuleSelected')));
    }

    /** A single module in a grid cell, not 1x2 (two rows high: half would mean nothing there). */
    static #canHalf(cell: HeaderCell, rendered = false): boolean {
        if (!cell.key.startsWith('headerGrid:') || cell.modules.length !== 1
            || cell.element.classList.contains('headerStackRow')) return false;
        // Right after a game redraw its data-size is the real one; otherwise a half module keeps the real one aside
        const module = cell.modules[0];
        return (rendered ? module.dataset.size : module.dataset.hsHeaderFullSize ?? module.dataset.size) !== 'Tall';
    }

    static #change(change: CellSettings): void {
        const selected = HSHeaderCellSettings.#selected(HSHeaderCellSettings.#cells());
        if (!selected || ('half' in change && !HSHeaderCellSettings.#canHalf(selected))) return;
        const cells = HSHeaderCellSettings.#settings.layouts[HSHeaderCellSettings.#layoutKey()];
        const next = { ...cells[selected.key], ...change };
        if (next.align === undefined) delete next.align;
        if (next.vertical === undefined) delete next.vertical;
        if (next.half === undefined) delete next.half;
        if (next.align === undefined && next.half === undefined && next.vertical === undefined) delete cells[selected.key];
        else cells[selected.key] = next;
        HSHeaderCellSettings.#save();
        HSHeaderCellSettings.#refresh();
    }

    static #refresh(rendered = false): void {
        const key = HSHeaderCellSettings.#layoutKey();
        const layouts = (HSGlobal.exposedPlayer as { headerLayouts?: Record<string, object> } | null)?.headerLayouts;
        const layout = layouts?.[key];
        // Reset replaces one layout inside the same player layouts object. Save imports replace the whole object.
        if (layouts && layouts === HSHeaderCellSettings.#seenLayouts && layout
            && HSHeaderCellSettings.#seenLayout[key] && layout !== HSHeaderCellSettings.#seenLayout[key]) {
            HSHeaderCellSettings.#settings.layouts[key] = {};
            HSHeaderCellSettings.#save();
        }
        HSHeaderCellSettings.#seenLayouts = layouts;
        HSHeaderCellSettings.#seenLayout[key] = layout;

        const cells = HSHeaderCellSettings.#cells();
        const settings = HSHeaderCellSettings.#settings.layouts[key];
        for (const cell of cells) {
            const value = settings[cell.key];
            if (value?.align) cell.element.dataset.hsHeaderAlign = value.align;
            else delete cell.element.dataset.hsHeaderAlign;
            const half = value?.half === true && HSHeaderCellSettings.#canHalf(cell, rendered);
            const vertical = value?.vertical ?? (half ? 'top' : undefined);
            if (vertical) cell.element.dataset.hsHeaderVertical = vertical;
            else delete cell.element.dataset.hsHeaderVertical;
            for (const module of cell.modules) {
                if (half) {
                    // Use the game's small-module rules, exactly as it does when forming a two-module stack.
                    if (rendered || module.dataset.size !== 'S') module.dataset.hsHeaderFullSize = module.dataset.size ?? 'M';
                    module.dataset.size = 'S';
                } else if (module.dataset.hsHeaderFullSize) {
                    // A game redraw may already have restored its own size. Never overwrite that newer value.
                    if (!rendered && module.classList.contains('hs-header-half') && module.dataset.size === 'S') {
                        module.dataset.size = module.dataset.hsHeaderFullSize;
                    }
                    delete module.dataset.hsHeaderFullSize;
                }
                module.classList.toggle('hs-header-half', half);
            }
        }
        const selected = HSHeaderCellSettings.#selected(cells);
        const value = selected ? settings[selected.key] : undefined;
        for (const [alignment, button] of HSHeaderCellSettings.#alignButtons) {
            button.disabled = !selected;
            button.setAttribute('aria-pressed', String(!!selected && value?.align === alignment));
            button.title = selected ? alignment === 'center' && selected.element.classList.contains('headerStackRow')
                ? 'Space the buttons evenly across the slot' : 'Align the selected cell' : 'Select a module in a header cell first';
        }
        for (const [height, button] of HSHeaderCellSettings.#heightButtons) {
            button.disabled = !selected || !HSHeaderCellSettings.#canHalf(selected);
            button.setAttribute('aria-pressed', String(!button.disabled && (value?.half ? 'half' : 'full') === height));
            button.title = button.disabled ? 'Select a single module in the header grid, not 1x2 (stacks already use half height)'
                : 'Use the full cell height or half height';
        }
        for (const [vertical, button] of HSHeaderCellSettings.#verticalButtons) {
            button.disabled = !selected;
            button.setAttribute('aria-pressed', String(!!selected && (value?.vertical ?? (value?.half ? 'top' : undefined)) === vertical));
            button.title = selected ? 'Align the selected cell vertically' : 'Select a module in a header cell first';
        }
        HSHeaderButtons.refresh();
    }

    static #load(): void {
        if (localStorage.getItem(`${HSGlobal.HSStorage.storagePrefix}${STORAGE_KEY}`) === null) return;
        const stored = HSModuleRegistry.getModule('HSStorage')?.getData<Partial<StoredSettings>>(STORAGE_KEY);
        if (!stored || stored.version !== 1 || !stored.layouts || typeof stored.layouts !== 'object') return;
        for (const key of ['desktop', 'mobile'] as const) {
            const cells = stored.layouts[key];
            if (!cells || typeof cells !== 'object') continue;
            for (const [name, value] of Object.entries(cells)) {
                const match = /^(ascensionStats|headerGrid):(0|[1-9]\d*)$/.exec(name);
                if (!match || Number(match[2]) > MAX_SLOT || !value || typeof value !== 'object') continue;
                const clean: CellSettings = {};
                if (ALIGNMENTS.includes(value.align!)) clean.align = value.align;
                if (VERTICAL_ALIGNMENTS.includes(value.vertical!)) clean.vertical = value.vertical;
                // Earlier versions offered Bottom only for half-height cells. Keep that placement when upgrading.
                else if ((value as { halfPosition?: unknown }).halfPosition === 'bottom') clean.vertical = 'bottom';
                if (value.half === true) clean.half = true;
                if (clean.align || clean.half || clean.vertical) HSHeaderCellSettings.#settings.layouts[key][name] = clean;
            }
        }
    }

    static #save(): void {
        if (!HSModuleRegistry.getModule('HSStorage')?.setData(STORAGE_KEY, HSHeaderCellSettings.#settings)) {
            HSLogger.warn('Could not save the header cell settings', HSHeaderCellSettings.#context);
        }
    }
}
