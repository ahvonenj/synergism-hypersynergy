import { HSBookmarkletNotice } from "../hs-core/hs-bookmarklet-notice";
import { HSGameState, MainView } from "../hs-core/hs-gamestate";
import { HSGlobal } from "../hs-core/hs-global";
import { HSLogger } from "../hs-core/hs-logger";
import { HSStorage } from "../hs-core/hs-storage";
import { HSModule, type HSModuleOptions } from "../hs-core/module/hs-module";
import { HSModuleRegistry } from "../hs-core/module/hs-module-registry";
import { HSSettings } from "../hs-core/settings/hs-settings";

const STORAGE_KEY = 'subtab-memory';
const ACTIVE_SUBTAB_CLASS = 'active-subtab';

interface HSSubtabMemoryData {
    version: 1;
    // Tab panel id -> id of the subtab button to come back to
    notes: Record<string, string>;
}

/** The tab on screen, as it was when it was opened. */
interface HSOpenTab {
    name: string;
    // The subtab it showed once opened (after a restore, if any)
    shown: string | undefined;
    byPlayer: boolean;
    // The remembered subtab was locked: it's kept for the next time the tab is opened
    lockedNote: boolean;
    // The tab the mod found on screen when it loaded
    initial: boolean;
}

/**
 * Class: HSSubtabMemory
 * IsExplicitHSModule: Yes
 * Description:
 *     The "Remember last used subtab" setting.
 *     The game keeps one subtab per tab, and forgets them all at every reset (singularity, Exalt, save load)
 *     and at a page load. A reset only clears the game's own indexes: a hidden tab's subtab buttons keep
 *     their active-subtab class until that tab is opened again. So a tab's subtab is noted when the tab is
 *     left, and clicked back when the player opens the tab and the game shows another one.
 *     Only a tab opened by the player counts (a trusted click, key or touch is being handled): the mod's own visits
 *     (stage read, settings fixer, autosing's tab restore) and a loader's visit to Settings > Stats are
 *     neither restored nor remembered.
 * Author: Shewchou
 */
export class HSSubtabMemory extends HSModule {
    #gameState?: HSGameState;
    #notes = new Map<string, string>();
    #current?: HSOpenTab;
    // Tabs the player has opened since the page loaded
    #openedByPlayer = new Set<string>();
    // Whether the mod loaded with the page (undefined until first needed, see #isPageLoad)
    #pageLoad?: boolean;

    constructor(moduleOptions: HSModuleOptions) {
        super(moduleOptions);
    }

    async init() {
        HSLogger.log(`Initializing HSSubtabMemory module`, this.context);

        this.#gameState = HSModuleRegistry.getModule('HSGameState');
        if (!this.#gameState) {
            HSLogger.warn('HSGameState not found: subtabs are not remembered', this.context);
            return;
        }

        this.#load();

        const current = this.#gameState.getCurrentMainViewFromDOM();
        const ids = HSSubtabMemory.#subtabIds(current);
        if (ids) {
            this.#current = {
                name: current.getName(),
                shown: HSSubtabMemory.#activeSubtab(ids),
                byPlayer: false,
                lockedNote: false,
                initial: true,
            };
        }

        this.#gameState.subscribeGameStateChange('MAIN_VIEW', (previous, current) => {
            if (!HSSettings.getSetting('rememberSubtabs')?.isEnabled()) {
                this.#forget();
                return;
            }
            this.#leave(previous);
            this.#enter(current);
        });

        // The tab on screen is only noted when it's left: a reload must not lose it
        window.addEventListener('pagehide', () => {
            if (!this.#gameState || !HSSettings.getSetting('rememberSubtabs')?.isEnabled()) return;
            this.#leave(this.#gameState.getCurrentMainViewFromDOM());
        });

        this.isInitialized = true;
    }

    /**
     * A tab was left: its buttons still show the subtab it was on. Not noted when nothing was chosen there:
     * a tab the mod opened, a tab still waiting for its locked subtab, or the tab a loader left on screen.
     */
    #leave(view: MainView): void {
        const ids = HSSubtabMemory.#subtabIds(view);
        if (!ids) return;

        const name = view.getName();
        const mark = HSSubtabMemory.#activeSubtab(ids);
        if (mark === undefined) return;

        const state = this.#current?.name === name ? this.#current : undefined;
        if (state && state.shown === mark) {
            // After a bookmark load, the tab found on screen shows what the player chose before the mod loaded
            if (state.initial ? this.#isPageLoad() : (!state.byPlayer || state.lockedNote)) return;
        }

        this.#setNote(name, mark);
    }

    /**
     * A tab was opened. By the player: the remembered subtab is clicked back when the game shows the tab's
     * first subtab (its index was reset), or whatever it shows the first time since the page loaded (there the
     * game starts every tab on its first subtab, except where a loader went). A subtab the game or the mod
     * picked on purpose is not the first one, and is left alone.
     */
    #enter(view: MainView): void {
        const ids = HSSubtabMemory.#subtabIds(view);
        if (!ids) {
            this.#current = undefined;
            return;
        }

        const name = view.getName();
        const byPlayer = HSSubtabMemory.#isPlayerInput(window.event);
        let shown = HSSubtabMemory.#activeSubtab(ids);
        let lockedNote = false;

        if (byPlayer) {
            const fresh = this.#isPageLoad() && !this.#openedByPlayer.has(name);
            this.#openedByPlayer.add(name);
            ({ shown, lockedNote } = this.#restore(name, ids, fresh));
        }

        this.#current = { name, shown, byPlayer, lockedNote, initial: false };
    }

    /**
     * Opens a tab on the player's behalf, on its remembered subtab: autosing bringing back the tab they were on.
     * The caller checks that the tab's button is visible (the game opens another tab for a locked one).
     */
    openForPlayer(view: MainView): void {
        const enabled = !!this.#gameState && !!HSSettings.getSetting('rememberSubtabs')?.isEnabled();
        const name = view.getName();

        // The tab was left within this same task (an Exalt entered and left in one go): its change of tab
        // hasn't been reported yet, so it is noted here, before its buttons are rewritten
        if (enabled && this.#current?.name === name) this.#leave(view);

        view.goto();

        const ids = HSSubtabMemory.#subtabIds(view);
        if (!enabled || !ids || this.#gameState!.getCurrentMainViewFromDOM().getId() !== view.getId()) return;

        this.#current = { name, byPlayer: false, initial: false, ...this.#restore(name, ids, false) };
    }

    /**
     * On the tab shown: clicks the remembered subtab back when the game shows the tab's first one.
     * @param fresh First time the player opens this tab since the page loaded
     * @returns The subtab shown in the end, and whether the remembered one was locked
     */
    #restore(name: string, ids: string[], fresh: boolean): { shown: string | undefined; lockedNote: boolean } {
        let shown = HSSubtabMemory.#activeSubtab(ids);
        let lockedNote = false;
        const note = this.#notes.get(name);

        // Visibility needs a layout: only looked at when there may be something to restore
        if (fresh || (note !== undefined && note !== shown)) {
            const first = ids.find(id => HSSubtabMemory.#isVisible(id));
            const noteVisible = note !== undefined && HSSubtabMemory.#isVisible(note);
            const reset = fresh || shown === first;
            lockedNote = note !== undefined && !noteVisible && reset;

            const target = noteVisible && reset ? note : (fresh ? first : undefined);
            if (target !== undefined && target !== shown) {
                document.getElementById(target)?.click();
                shown = HSSubtabMemory.#activeSubtab(ids);
                HSLogger.debug(() => `Subtab restored on ${name}: ${target}`, this.context);
            }
        }

        return { shown, lockedNote };
    }

    /** The setting is off: nothing is kept, so turning it back on doesn't bring back old subtabs. */
    #forget(): void {
        this.#current = undefined;
        this.#pageLoad = false;
        if (this.#notes.size === 0) return;

        this.#notes.clear();
        HSModuleRegistry.getModule('HSStorage')?.clearData(STORAGE_KEY);
    }

    /**
     * Whether the mod loaded with the page (userscript or Steam), not later with the bookmark.
     * Asked at the first tab change, not in init(): the answer needs HSGameData, initialized by then.
     */
    #isPageLoad(): boolean {
        this.#pageLoad ??= !HSBookmarkletNotice.isBookmarkletLoad();
        return this.#pageLoad;
    }

    #setNote(name: string, subtabId: string): void {
        if (this.#notes.get(name) === subtabId) return;
        this.#notes.set(name, subtabId);

        const data: HSSubtabMemoryData = { version: 1, notes: Object.fromEntries(this.#notes) };
        const saved = HSModuleRegistry.getModule('HSStorage')?.setData(STORAGE_KEY, data);
        if (!saved) HSLogger.warn('Could not save the remembered subtabs', this.context);
    }

    #load(): void {
        // HSStorage warns when a key is missing: nothing stored is the normal case until a tab is left
        const exists = localStorage.getItem(`${HSGlobal.HSStorage.storagePrefix}${STORAGE_KEY}`) !== null;
        const stored = exists ? HSModuleRegistry.getModule('HSStorage')?.getData<Partial<HSSubtabMemoryData>>(STORAGE_KEY) : null;
        if (!stored || stored.version !== 1 || typeof stored.notes !== 'object' || stored.notes === null) return;

        // The stored data is untrusted (backup files are shared): only a known subtab button of its own tab is kept,
        // so nothing else can ever be clicked
        for (const [name, subtabId] of Object.entries(stored.notes)) {
            const ids = HSSubtabMemory.#subtabIds(new MainView(name));
            if (typeof subtabId === 'string' && ids?.includes(subtabId)) this.#notes.set(name, subtabId);
        }
    }

    /** The tab's subtab buttons, in the game's order. Undefined for a tab without subtabs. */
    static #subtabIds(view: MainView): string[] | undefined {
        return HSGlobal.HSGameState.viewProperties.get(view.getId())?.subViewIds;
    }

    /**
     * A trusted click, key or touch is being handled. Not any trusted event: HSUtils.yield() and the sleep worker
     * resume the mod's code inside a trusted message event, so autosing's own tab clicks would count as the player's.
     */
    static #isPlayerInput(event: Event | undefined): boolean {
        if (!event?.isTrusted) return false;
        return event instanceof MouseEvent || event instanceof KeyboardEvent
            || (typeof TouchEvent !== 'undefined' && event instanceof TouchEvent);
    }

    static #activeSubtab(ids: string[]): string | undefined {
        return ids.find(id => document.getElementById(id)?.classList.contains(ACTIVE_SUBTAB_CLASS));
    }

    /** A locked subtab's button is hidden, by itself or with its row. Only true to the screen on the tab shown. */
    static #isVisible(id: string): boolean {
        const element = document.getElementById(id);
        return !!element && element.offsetParent !== null;
    }
}
