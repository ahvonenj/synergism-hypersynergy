import { HSGlobal } from "../hs-global";
import { HSLogger } from "../hs-logger";
import { HSUI } from "../hs-ui";
import { HSSettings } from "../settings/hs-settings";

const CHECKBOX_ID = 'hs-keep-header-layout';

/**
 * Class: HSHeaderKeepOnImport
 * IsExplicitHSModule: No
 * Description:
 *     "[HS] Keep my header layout", a checkbox under the game's "Load from file" button (Settings). Ticked, a save
 *     load that replaces the save (a file, a cloud save, the Steam cloud) keeps the player's header layouts (desktop
 *     and mobile) instead of the save's. A singularity, an Exalt and the game reset already keep them (the game's hold).
 *     Needs the patcher's save import hook (window.__HS_onSaveImport, through HSGameData) and header modules patch
 *     (window.__HS_parseSave, called by loadSynergy for the save it loads): without them, no checkbox.
 *     The layouts are copied at the start of importSynergism, without the mod's module ids (the game's save schema
 *     would reset a whole layout over one), and put into the save loadSynergy parses, in the same synchronous step.
 *     The mod's modules come back as at every load (HSHeaderModules). The checkbox's state is the hidden setting
 *     keepHeaderLayoutOnImport.
 * Author: Shewchou
 */
export class HSHeaderKeepOnImport {
    static #context = 'HSHeaderKeepOnImport';
    static #checkbox?: HTMLInputElement;
    // The layouts to put into the save being loaded, for one task
    static #pending?: unknown;

    static #isAvailable(): boolean {
        const w = window;
        return !!w.__HS_SAVE_IMPORT_HOOK_PATCHED && typeof w.__HS_parseSave === 'function'
            && typeof w.__HS_stripHeaderModules === 'function';
    }

    /** Adds the checkbox after the game's "Load from file" button, and the hook into the game's save parse. */
    static install(importButton: HTMLElement): void {
        if (HSHeaderKeepOnImport.#checkbox || !HSHeaderKeepOnImport.#isAvailable()) return;

        // As the game's own "copy to clipboard" checkbox in that column
        const row = document.createElement('div');
        row.className = 'hs-keep-header-layout';
        row.title = 'When a save is loaded (from a file, a cloud save or the Steam cloud), keep your current header layout instead of the save\'s';
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.id = CHECKBOX_ID;
        checkbox.checked = HSSettings.getSetting('keepHeaderLayoutOnImport').getValue() === true;
        const label = document.createElement('label');
        label.htmlFor = CHECKBOX_ID;
        label.textContent = '[HS] Keep my header layout';
        row.append(checkbox, label);

        // After the button's hidden file input, so the game's "for" link stays next to it
        const fileInput = document.getElementById('importfile');
        const anchor = fileInput?.parentElement === importButton.parentElement ? fileInput! : importButton;
        anchor.after(row);
        HSUI.injectStyle(`
            .hs-keep-header-layout { display: flex; align-items: center; justify-content: center; gap: 4px; font-size: 0.75em; }
            .hs-keep-header-layout label { display: inline; color: #bbb; cursor: pointer; }
            .hs-keep-header-layout input { margin: 0; cursor: pointer; }
        `, 'hs-keep-header-layout-css');

        checkbox.addEventListener('change', () => {
            HSSettings.getSetting('keepHeaderLayoutOnImport').setValue(checkbox.checked);
        });
        HSHeaderKeepOnImport.#checkbox = checkbox;

        // loadSynergy reads window.__HS_parseSave at each load: the save it parses gets the kept layouts
        const w = window;
        const parseSave = w.__HS_parseSave!; // Checked by #isAvailable() before installing.
        w.__HS_parseSave = (text: string) => {
            const data = parseSave(text);
            const pending = HSHeaderKeepOnImport.#pending;
            if (pending !== undefined && data && typeof data === 'object') {
                HSHeaderKeepOnImport.#pending = undefined;
                data.headerLayouts = pending;
                HSLogger.log('Save loaded with your header layout (Keep my header layout)', HSHeaderKeepOnImport.#context);
            }
            return data;
        };
    }

    /**
     * The game starts loading a save that replaces the current one (HSGameData, reset = false): when ticked, notes
     * the current layouts for that load. importSynergism loads it synchronously, so one task later it's done (or the
     * import was refused): the note is dropped, it never reaches a later load.
     */
    static onSaveImport(): void {
        if (!HSHeaderKeepOnImport.#checkbox?.checked) return;
        try {
            const player = HSGlobal.exposedPlayer as { headerLayouts?: unknown } | null;
            if (!player?.headerLayouts || typeof player.headerLayouts !== 'object') return;
            const stripped = window.__HS_stripHeaderModules!({ headerLayouts: player.headerLayouts });
            HSHeaderKeepOnImport.#pending = structuredClone(stripped.headerLayouts);
        } catch (e) {
            HSLogger.warn(`Could not keep the header layout for this save load: ${e}`, HSHeaderKeepOnImport.#context);
            return;
        }
        setTimeout(() => { HSHeaderKeepOnImport.#pending = undefined; }, 0);
    }
}
