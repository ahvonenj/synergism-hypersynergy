import { HSGlobal } from "../hs-global";
import { HSLogger } from "../hs-logger";
import { HSModuleRegistry } from "../module/hs-module-registry";
import { HSUtils } from "../../hs-utils/hs-utils";

const STORAGE_KEY = 'header-modules';
// The game's grid region (its cells keep their index, empty ones included); its other region is a plain row
const GRID_REGION = 'headerGrid';
// Where a module waits, hidden, when it has no place: the game shows hidden modules in its tray, wherever they are
const WAITING_REGION = 'ascensionStats';
// Modules per stack, as the game's HEADER_STACK_CAPACITY
const STACK_CAPACITY = 2;
// A remembered cell or row index above this is not trusted (a hand-edited backup could ask for any)
const MAX_SLOT_INDEX = 200;
// The game gives every module these sizes
const SIZES = ['S', 'M', 'L'];
// Sizes the game gives only to some of its own modules (isHeaderSizeAllowed), which a mod module can ask for at register()
const EXTRA_SIZES = ['Tall'] as const;
type HSHeaderExtraSize = typeof EXTRA_SIZES[number];

// Only the mod's modules in it: a slot the patcher's strip empties
const isModSlot = (slot: string[]) => slot.length > 0 && slot.every(id => /^hs[A-Z]/.test(id));

/** One layout of the game's header (player.headerLayouts.desktop / .mobile), the parts the mod reads and writes. */
interface HSHeaderLayout {
    regions: Record<string, string[][]>;
    sizes: Record<string, string>;
    positions?: Record<string, number>;
    hidden: string[];
}

/** Where a mod module was in a layout. */
interface HSHeaderModulePlace {
    region: string;
    index: number;
    // In a row: the game's slots before it. The mod's slots there come and go (each module is put back at its own
    // register()), so counting them would put a module one slot further each time another one before it comes later.
    // None in notes from before it was kept (index then)
    gameIndex?: number;
    // The modules stacked with it
    partners: string[];
    size?: string;
    hidden: boolean;
    // Its place in the stack (0: the top), when it has partners; none in notes from before it was kept (the bottom)
    stackIndex?: number;
}

interface HSHeaderModuleNotes {
    version: 1;
    // Layout key (desktop, mobile) -> module id -> its place
    layouts: Record<string, Record<string, HSHeaderModulePlace>>;
}

/**
 * Class: HSHeaderModules
 * IsExplicitHSModule: No
 * Description:
 *     The mod's own modules in the game's editable header (HeaderModules.ts): the player places, hides (tray),
 *     resizes and stacks them like the game's own. Needs the patcher's header modules patch
 *     (window.__HS_HEADER_MODULES_PATCHED); without it, isAvailable() is false and features keep their old place.
 *     The mod's ids ("hs" then a capital letter) live only in the live player.headerLayouts: the patcher strips them
 *     from every save and every loaded save (the game's save schema would reset the whole layout over an unknown id).
 *     So their place is remembered here, per browser (HSStorage), and put back before each render of the header
 *     (a save load, a singularity, the header's Reset button, each edit).
 *     The game greys out the sizes it keeps for its own modules (Tall: "1x2"); a module given such a size
 *     at register() gets its button enabled again whenever it's the selected one (the game's click handler resizes
 *     any selected module, it only greys the button).
 * Author: Shewchou
 */
export class HSHeaderModules {
    static #context = 'HSHeaderModules';
    // Every element made this session, by id: the game's DOM cache keeps the first element it found for an id
    static #elements = new Map<string, HTMLElement>();
    // The registered modules: id -> whether the game shows it (its "unlocked")
    static #modules = new Map<string, () => boolean>();
    // The registered modules' extra sizes (none for most)
    static #extraSizes = new Map<string, readonly HSHeaderExtraSize[]>();
    static #sizeObserver?: MutationObserver;
    static #notes?: HSHeaderModuleNotes;
    // What the last render saw, to tell the header's Reset button (a new layout in the same headerLayouts) from a load
    static #seenLayouts?: object;
    static #seenLayout: Record<string, object> = {};
    // Once the game's first load is over: Steam starts the mod before the save loads
    static #gameLoaded = false;

    /**
     * Whether the game's first load is over (latched: later offline progress doesn't count). Before it, the layout is
     * the blank player's, where a module's cell may be taken: noting that would send it to the tray for good.
     */
    static #isGameLoaded(): boolean {
        HSHeaderModules.#gameLoaded ||= HSUtils.isGameLoaded();
        return HSHeaderModules.#gameLoaded;
    }

    static #layouts(): Record<string, unknown> | undefined {
        const layouts = (HSGlobal.exposedPlayer as { headerLayouts?: Record<string, unknown> } | null)?.headerLayouts;
        return layouts && typeof layouts === 'object' ? layouts : undefined;
    }

    static #isLayout(layout: unknown): layout is HSHeaderLayout {
        const l = layout as HSHeaderLayout | null;
        return !!l && typeof l === 'object' && !!l.regions && typeof l.regions === 'object'
            && !!l.sizes && typeof l.sizes === 'object' && Array.isArray(l.hidden);
    }

    /** Whether the game's header can take the mod's modules: the patcher's header modules patch, a player, the tray. */
    static isAvailable(): boolean {
        const w = window;
        return !!w.__HS_HEADER_MODULES_PATCHED && !!w.__HS_headerModuleUnlocks && typeof w.__HS_renderHeaderLayout === 'function'
            && !!HSHeaderModules.#layouts() && !!document.getElementById('headerTray');
    }

    static isRegistered(id: string): boolean {
        return HSHeaderModules.#modules.has(id);
    }

    /**
     * Offer a module in the game's header, at its remembered place, else hidden (the game's tray in edit mode).
     * Returns its element (the same one for an id all session long), to fill; null when the header can't take it.
     * @param id "hs" then a capital letter: the patcher strips these from saves
     * @param unlocked whether the game shows it, asked at each render (as the game's own unlock checks)
     * @param options.sizes sizes the game keeps for its own modules that this one gets too
     */
    static register(id: string, unlocked: () => boolean = () => true,
        options: { sizes?: readonly HSHeaderExtraSize[] } = {}): HTMLElement | null {
        if (!/^hs[A-Z]/.test(id)) throw new Error(`Header module id "${id}" doesn't start with "hs" and a capital letter`);
        if (!HSHeaderModules.isAvailable()) return null;

        let element = HSHeaderModules.#elements.get(id);
        if (!element) {
            element = document.createElement('div');
            element.id = id;
            element.className = 'headerModule hs-header-module';
            HSHeaderModules.#elements.set(id, element);
        }
        if (HSHeaderModules.#modules.has(id)) return element;

        // In the page before the game looks it up: its DOM cache throws over a missing id
        if (!element.isConnected) document.getElementById('headerTray')!.appendChild(element);
        // The game checks its locks only at its next revealStuff() (a tab change, a reset): locked from the start
        try { element.classList.toggle('headerModuleLocked', !unlocked()); } catch { /* the game's next check decides */ }
        HSHeaderModules.#modules.set(id, unlocked);
        if (options.sizes?.length) {
            HSHeaderModules.#extraSizes.set(id, [...options.sizes]);
            HSHeaderModules.#watchSizeButtons();
        }
        window.__HS_headerModuleUnlocks![id] = () => {
            try { return unlocked(); } catch { return false; }
        };
        window.__HS_beforeHeaderRender = () => HSHeaderModules.#beforeRender();
        HSHeaderModules.#render();
        HSLogger.debug(() => `Header module ${id} registered`, HSHeaderModules.#context);
        return element;
    }

    /** Take a module out of the header and its tray. Its place stays remembered for the next register(). */
    static unregister(id: string): void {
        if (!HSHeaderModules.#modules.delete(id)) return;
        HSHeaderModules.#extraSizes.delete(id);
        delete window.__HS_headerModuleUnlocks?.[id];

        const layouts = HSHeaderModules.#layouts();
        for (const layout of Object.values(layouts ?? {})) {
            if (HSHeaderModules.#isLayout(layout)) HSHeaderModules.#remove(layout, id);
        }
        HSHeaderModules.#render();
        HSHeaderModules.#elements.get(id)?.remove();
        HSLogger.debug(() => `Header module ${id} unregistered`, HSHeaderModules.#context);
    }

    /**
     * The game greys its size buttons at each render (updateEditToolbar, which sets every button's disabled): enable
     * again an extra size of the selected mod module. The observer runs before the next paint, so it never shows grey.
     */
    static #watchSizeButtons(): void {
        if (HSHeaderModules.#sizeObserver) return;
        const observer = new MutationObserver(() => HSHeaderModules.#enableExtraSizes());
        for (const size of EXTRA_SIZES) {
            const button = document.getElementById(`headerSize${size}`);
            if (button) observer.observe(button, { attributes: true, attributeFilter: ['disabled'] });
        }
        HSHeaderModules.#sizeObserver = observer;
    }

    static #enableExtraSizes(): void {
        // The game marks the selected module at each render, before the observer runs
        const selected = document.querySelector<HTMLElement>('#mainHeader.headerEditMode .headerModuleSelected')?.id;
        const sizes = selected ? HSHeaderModules.#extraSizes.get(selected) : undefined;
        if (!sizes) return;
        for (const size of sizes) {
            const button = document.getElementById(`headerSize${size}`) as HTMLButtonElement | null;
            if (button?.disabled) button.disabled = false;
        }
    }

    static #render(): void {
        try {
            window.__HS_renderHeaderLayout!();
        } catch (e) {
            HSLogger.warn(`The game's header could not be rendered: ${e}`, HSHeaderModules.#context);
        }
    }

    /**
     * Before each render of the header (window.__HS_beforeHeaderRender): for each registered module and each layout,
     * note where it is, or put it back where it was when it's missing (a load or a singularity strips it).
     * Before the game's first load is over, only put back: the notes are kept for the save's layout.
     */
    static #beforeRender(): void {
        const layouts = HSHeaderModules.#layouts();
        if (!layouts) return;
        const notes = HSHeaderModules.#loadNotes();
        let changed = false;
        const noting = HSHeaderModules.#isGameLoaded();

        for (const [key, layout] of Object.entries(layouts)) {
            if (!HSHeaderModules.#isLayout(layout)) continue;
            // The header's Reset button puts a new layout in the same headerLayouts (a load replaces headerLayouts):
            // the mod's modules go back to the tray, as the game's new modules
            if (noting && layouts === HSHeaderModules.#seenLayouts && HSHeaderModules.#seenLayout[key]
                && layout !== HSHeaderModules.#seenLayout[key] && notes.layouts[key]) {
                delete notes.layouts[key];
                changed = true;
            }
            if (noting) HSHeaderModules.#seenLayout[key] = layout;

            // Every missing module back first, then every place noted: a module noted before its partner is put back
            // into its slot would be noted alone
            for (const id of HSHeaderModules.#modules.keys()) {
                if (!HSHeaderModules.#findPlace(layout, id)) HSHeaderModules.#putBack(layout, id, notes.layouts[key]);
            }
            if (!noting) continue;
            for (const id of HSHeaderModules.#modules.keys()) {
                const place = HSHeaderModules.#findPlace(layout, id);
                if (!place) continue;
                const noted = notes.layouts[key]?.[id];
                // Alone because its partner is turned off (unregistered): still noted with it, so the stack comes back
                // with the partner, whichever of the two is turned off or on first
                if (noted && place.partners.length === 0) {
                    place.partners = noted.partners.filter(partner => /^hs[A-Z]/.test(partner) && !HSHeaderModules.#modules.has(partner));
                    if (place.partners.length > 0 && noted.stackIndex !== undefined) place.stackIndex = noted.stackIndex;
                }
                if (JSON.stringify(place) !== JSON.stringify(noted)) {
                    (notes.layouts[key] ??= {})[id] = place;
                    changed = true;
                }
            }
        }
        if (noting) HSHeaderModules.#seenLayouts = layouts;
        if (changed) HSHeaderModules.#saveNotes(notes);
    }

    static #findPlace(layout: HSHeaderLayout, id: string): HSHeaderModulePlace | null {
        for (const [region, slots] of Object.entries(layout.regions)) {
            if (!Array.isArray(slots)) continue;
            const index = slots.findIndex(slot => Array.isArray(slot) && slot.includes(id));
            if (index < 0) continue;
            const place: HSHeaderModulePlace = {
                region,
                index,
                partners: slots[index].filter(other => other !== id),
                hidden: layout.hidden.includes(id)
            };
            if (region !== GRID_REGION) place.gameIndex = slots.slice(0, index).filter(slot => Array.isArray(slot) && !isModSlot(slot)).length;
            if (layout.sizes[id]) place.size = layout.sizes[id];
            if (place.partners.length > 0) place.stackIndex = slots[index].indexOf(id);
            return place;
        }
        return null;
    }

    /** Put a module back at its remembered place, as the game would have it; hidden when there's none or it's taken. */
    static #putBack(layout: HSHeaderLayout, id: string, noted: Record<string, HSHeaderModulePlace> | undefined): void {
        const place = noted?.[id];
        const slots = place ? layout.regions[place.region] : undefined;
        let placed = false;

        if (place && Array.isArray(slots)) {
            // Stacked: back with the same partners, when they're still stacked alone there
            const partnerSlot = place.partners.length > 0 && place.partners.length < STACK_CAPACITY
                ? slots.find(slot => Array.isArray(slot) && slot.length === place.partners.length
                    && place.partners.every(partner => slot.includes(partner)))
                : undefined;
            if (partnerSlot) {
                // At its place in the stack (the bottom when unknown)
                partnerSlot.splice(Math.min(place.stackIndex ?? partnerSlot.length, partnerSlot.length), 0, id);
                // The game sizes a stack's modules S when it makes the stack
                for (const member of partnerSlot) layout.sizes[member] = 'S';
                placed = true;
            } else if (place.region === GRID_REGION) {
                // A cell keeps its index: only an empty one, else it went to another module meanwhile
                if ((slots[place.index] ?? []).length === 0) {
                    while (slots.length < place.index) slots.push([]);
                    slots[place.index] = [id];
                    placed = true;
                }
            } else {
                slots.splice(HSHeaderModules.#rowIndex(slots, place, noted!), 0, [id]);
                placed = true;
            }
            // Alone, not the S size its stack had; an extra size only while the module still has it
            if (placed && !partnerSlot && place.size && place.partners.length === 0 && HSHeaderModules.#allows(id, place.size)) {
                layout.sizes[id] = place.size;
            }
        }

        if (!placed) {
            const waiting = layout.regions[WAITING_REGION] ?? Object.values(layout.regions).find(Array.isArray);
            if (!waiting) return;
            waiting.push([id]);
            delete layout.sizes[id];
        }
        if ((!placed || place?.hidden) && !layout.hidden.includes(id)) layout.hidden.push(id);
    }

    static #allows(id: string, size: string): boolean {
        return SIZES.includes(size) || (HSHeaderModules.#extraSizes.get(id) ?? []).some(extra => extra === size);
    }

    /** Where a module goes back in a row: after its game slots, and after the mod's modules back there that were before it. */
    static #rowIndex(slots: string[][], place: HSHeaderModulePlace, noted: Record<string, HSHeaderModulePlace>): number {
        if (place.gameIndex === undefined) return Math.min(place.index, slots.length);

        let at = 0;
        for (let seen = 0; at < slots.length && seen < place.gameIndex; at++) {
            if (Array.isArray(slots[at]) && !isModSlot(slots[at])) seen++;
        }
        while (at < slots.length && Array.isArray(slots[at]) && isModSlot(slots[at])
            && slots[at].some(other => (noted[other]?.index ?? Infinity) < place.index)) at++;
        return at;
    }

    /** Take a module out of a layout, as the game takes one out of a stack. */
    static #remove(layout: HSHeaderLayout, id: string): void {
        for (const [region, slots] of Object.entries(layout.regions)) {
            if (!Array.isArray(slots)) continue;
            const index = slots.findIndex(slot => Array.isArray(slot) && slot.includes(id));
            if (index < 0) continue;
            const kept = slots[index].filter(other => other !== id);
            // Left alone in its slot, a module loses the stack's S size
            if (kept.length === 1 && layout.sizes[kept[0]] === 'S') delete layout.sizes[kept[0]];
            // An empty grid cell keeps its index; a row has no empty slots
            if (kept.length === 0 && region !== GRID_REGION) slots.splice(index, 1);
            else slots[index] = kept;
        }
        layout.hidden = layout.hidden.filter(other => other !== id);
        delete layout.sizes[id];
        if (layout.positions) delete layout.positions[id];
    }

    static #loadNotes(): HSHeaderModuleNotes {
        if (HSHeaderModules.#notes) return HSHeaderModules.#notes;
        const notes: HSHeaderModuleNotes = { version: 1, layouts: {} };
        HSHeaderModules.#notes = notes;

        // HSStorage warns when a key is missing: nothing stored is the normal case until a module is placed
        if (localStorage.getItem(`${HSGlobal.HSStorage.storagePrefix}${STORAGE_KEY}`) === null) return notes;
        const stored = HSModuleRegistry.getModule('HSStorage')?.getData<Partial<HSHeaderModuleNotes>>(STORAGE_KEY);
        if (!stored || stored.version !== 1 || !stored.layouts || typeof stored.layouts !== 'object') return notes;

        // Untrusted (backup files are shared): only well-formed places of mod ids are kept
        for (const [key, places] of Object.entries(stored.layouts)) {
            if (!places || typeof places !== 'object') continue;
            for (const [id, place] of Object.entries(places as Record<string, Partial<HSHeaderModulePlace>>)) {
                const valid = /^hs[A-Z]/.test(id) && !!place && typeof place === 'object'
                    && typeof place.region === 'string'
                    && Number.isInteger(place.index) && place.index! >= 0 && place.index! <= MAX_SLOT_INDEX
                    && (place.gameIndex === undefined
                        || (Number.isInteger(place.gameIndex) && place.gameIndex >= 0 && place.gameIndex <= MAX_SLOT_INDEX))
                    && Array.isArray(place.partners) && place.partners.every(partner => typeof partner === 'string')
                    && typeof place.hidden === 'boolean'
                    && (place.size === undefined || SIZES.includes(place.size)
                        || EXTRA_SIZES.some(size => size === place.size))
                    && (place.stackIndex === undefined
                        || (Number.isInteger(place.stackIndex) && place.stackIndex >= 0 && place.stackIndex < STACK_CAPACITY));
                if (!valid) continue;
                (notes.layouts[key] ??= {})[id] = {
                    region: place.region!, index: place.index!,
                    ...(place.gameIndex !== undefined ? { gameIndex: place.gameIndex } : {}),
                    partners: [...place.partners!], hidden: place.hidden!,
                    ...(place.size ? { size: place.size } : {}),
                    ...(place.stackIndex !== undefined ? { stackIndex: place.stackIndex } : {})
                };
            }
        }
        return notes;
    }

    static #saveNotes(notes: HSHeaderModuleNotes): void {
        const saved = HSModuleRegistry.getModule('HSStorage')?.setData(STORAGE_KEY, notes);
        if (!saved) HSLogger.warn('Could not save where the mod\'s header modules are', HSHeaderModules.#context);
    }
}
