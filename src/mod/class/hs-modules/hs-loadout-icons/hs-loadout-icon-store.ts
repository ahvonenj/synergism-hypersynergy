import { HSLogger } from "../../hs-core/hs-logger";

/**
 * Class: HSLoadoutIconStore
 * IsExplicitHSModule: No
 * Description:
 *     The mod's custom loadout slot icons, one map per kind of loadout, in localStorage (per browser).
 *     The game's own slot icons live in the save, where only an ambrosia upgrade name is
 *     accepted, so the mod's icons (any image of the game) are kept here and painted over the game's slots.
 *     Ambrosia: keyed by the game's slot button id (blueberryLoadout1…), shown on the Ambrosia tab's slots
 *     (HSAmbrosia), the heater results' slot row and the game's header (HSHeaderLoadoutIcons). Its storage
 *     key still bears the name of the removed ambrosia quickbar, so the icons players picked stay.
 * Author: Shewchou
 */
export class HSLoadoutIconStore {
    static readonly ambrosia = new HSLoadoutIconStore('hs-ambrosia-quickbar-icons');

    readonly #context = 'HSLoadoutIconStore';
    readonly #storageKey: string;
    #icons: Map<string, string> | null = null;
    readonly #listeners = new Set<() => void>();

    private constructor(storageKey: string) {
        this.#storageKey = storageKey;
    }

    get(slotKey: string): string | undefined {
        return this.#map().get(slotKey);
    }

    set(slotKey: string, url: string): void {
        if (this.#map().get(slotKey) === url) return;
        this.#map().set(slotKey, url);
        this.#saveAndNotify();
    }

    clear(slotKey: string): void {
        if (!this.#map().delete(slotKey)) return;
        this.#saveAndNotify();
    }

    /** Sets (a non-empty url) or clears (null, undefined, empty) several slots, saved and notified once. */
    applyBulk(iconBySlotKey: Record<string, string | null | undefined>): boolean {
        const icons = this.#map();
        let changed = false;

        for (const [slotKey, iconUrl] of Object.entries(iconBySlotKey)) {
            if (!slotKey) continue;

            const normalizedUrl = typeof iconUrl === 'string' ? iconUrl.trim() : '';
            if (normalizedUrl) {
                if (icons.get(slotKey) !== normalizedUrl) {
                    icons.set(slotKey, normalizedUrl);
                    changed = true;
                }
            } else if (icons.delete(slotKey)) {
                changed = true;
            }
        }

        if (changed) this.#saveAndNotify();
        return changed;
    }

    /** Called after every change; returns the unsubscribe function. */
    onChange(listener: () => void): () => void {
        this.#listeners.add(listener);
        return () => this.#listeners.delete(listener);
    }

    #map(): Map<string, string> {
        if (this.#icons) return this.#icons;

        this.#icons = new Map();
        try {
            const raw = localStorage.getItem(this.#storageKey);
            if (raw) {
                const parsed = JSON.parse(raw) as Record<string, unknown>;
                for (const [slotKey, url] of Object.entries(parsed)) {
                    if (typeof url === 'string' && url) this.#icons.set(slotKey, url);
                }
            }
        } catch (error) {
            HSLogger.warn(`Could not read ${this.#storageKey}: ${String(error)}`, this.#context);
        }
        return this.#icons;
    }

    #saveAndNotify(): void {
        try {
            localStorage.setItem(this.#storageKey, JSON.stringify(Object.fromEntries(this.#map())));
        } catch (error) {
            HSLogger.warn(`Could not save ${this.#storageKey}: ${String(error)}`, this.#context);
        }

        for (const listener of this.#listeners) {
            try {
                listener();
            } catch (error) {
                HSLogger.warn(`Icon change listener failed: ${String(error)}`, this.#context);
            }
        }
    }
}
