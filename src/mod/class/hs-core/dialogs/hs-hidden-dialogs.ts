import { HSLogger } from "../hs-logger";
import { HSGlobal } from "../hs-global";
import { HSUI } from "../hs-ui";
import { HSUIC } from "../hs-ui-components";
import { HSStorage } from "../hs-storage";
import { HSModuleRegistry } from "../module/hs-module-registry";
import { HSSettings } from "../settings/hs-settings";
import { HSDialogIdentity } from "./hs-dialog-identity";
import { HSInputType } from "../../../types/module-types/hs-ui-types";
import hiddenDialogsJson from "inline:../../../resource/json/hs-hidden-dialogs.json";
import hiddenDialogsCSS from "inline:../../../resource/css/module/hs-hidden-dialogs.css";

export type HSHideableDialogKind = 'confirm' | 'alert';

interface HSHiddenDialogEntry {
    id: string;
    source: 'preset' | 'player';
}

interface HSHiddenDialogsData {
    version: 1;
    entries: HSHiddenDialogEntry[];
    // Preset ids already added once: a preset entry the player forgot isn't added again
    presetAdded: string[];
}

/**
 * Class: HSHiddenDialogs
 * IsExplicitHSModule: No
 * Description:
 *     The "Hide game dialogs" setting. A checkbox above the OK button of the game's Confirm and Alert
 *     ("Always confirm" / "Don't show again") remembers the dialog's translation key when the player presses OK
 *     with it ticked; from then on, HSGameDialogs answers that dialog (OK / dismissed) without showing it.
 *     Turning the setting on also adds a ready-made list of useless dialogs, each added once.
 *     The list is kept under its own storage key, and shown in the panel ("Hidden dialogs") to forget entries.
 * Author: Shewchou
 */
export class HSHiddenDialogs {
    static #context = 'HSHiddenDialogs';
    static readonly #listBlockId = 'hs-hidden-dialogs-block';
    static readonly #listId = 'hs-hidden-dialogs-list';
    static readonly #restoreId = 'hs-hidden-dialogs-restore';
    // The "Hidden dialogs" list goes right after this setting's block
    static readonly #anchorBlockId = 'hs-setting-block-hide-game-dialogs-notify';
    static readonly #labelMaxLength = 140;
    // Marks a hidden dialog in the panel list (styled like a selected option)
    static readonly #hiddenClass = 'hs-hidden-dialog-on';

    static #enabled = false;
    static #data: HSHiddenDialogsData | null = null;
    static #resourceData: { preset: string[], blocked: Set<string> } | null = null;
    static #uiInstalled = false;
    static #checkboxes: Partial<Record<HSHideableDialogKind, HTMLInputElement>> = {};
    // The Confirm or Alert shown right now with a checkbox offered, and its keys
    static #shown: { kind: HSHideableDialogKind, keys: string[] } | null = null;
    // Entries forgotten from the list this session: selecting them again restores them as they were
    static #forgotten = new Map<string, HSHiddenDialogEntry>();

    /** The ready-made list and the blocked dialogs (resource JSON), read once. */
    static #resource(): { preset: string[], blocked: Set<string> } {
        if (HSHiddenDialogs.#resourceData) return HSHiddenDialogs.#resourceData;
        try {
            const json = JSON.parse(hiddenDialogsJson) as { preset?: string[], blocked?: string[] };
            HSHiddenDialogs.#resourceData = { preset: json.preset ?? [], blocked: new Set(json.blocked ?? []) };
        } catch (error) {
            HSLogger.warn(`Hidden dialogs resource invalid: ${error}`, HSHiddenDialogs.#context);
            HSHiddenDialogs.#resourceData = { preset: [], blocked: new Set() };
        }
        return HSHiddenDialogs.#resourceData;
    }

    /** The setting's action (also run at load with the stored state). */
    static setEnabled(enabled: boolean): void {
        HSHiddenDialogs.#enabled = enabled;
        HSHiddenDialogs.#installDialogUI();
        if (enabled) {
            HSHiddenDialogs.#addNewPresetEntries();
        } else {
            HSHiddenDialogs.onShown('confirm', undefined);
            HSHiddenDialogs.onShown('alert', undefined);
        }
        HSHiddenDialogs.renderList();
        // The index identifies dialogs, and gives the list its labels (also while the setting is off)
        if (enabled || HSHiddenDialogs.#getData().entries.length > 0) {
            void HSDialogIdentity.ensureBuilt().then(() => HSHiddenDialogs.renderList());
        }
    }

    // ── Used by HSGameDialogs ────────────────────────────────────────────────────────────────────────

    /** The translation keys of a Confirm or Alert's text, while the setting is on. */
    static identify(kind: string, text: unknown): string[] | undefined {
        if (!HSHiddenDialogs.#enabled || (kind !== 'confirm' && kind !== 'alert')) return undefined;
        return HSDialogIdentity.identify(text);
    }

    /** Whether one of these keys is hidden for this kind (setting on, not blocked). */
    static isHidden(kind: HSHideableDialogKind, keys: string[]): boolean {
        if (!HSHiddenDialogs.#enabled) return false;
        const entries = HSHiddenDialogs.#getData().entries;
        return keys.some(key => {
            const id = `${kind}:${key}`;
            return !HSHiddenDialogs.#resource().blocked.has(id) && entries.some(entry => entry.id === id);
        });
    }

    /** A hidden dialog was answered: its text as a notification if the player wants it (Alerts only). */
    static onHidden(kind: HSHideableDialogKind, keys: string[], text: unknown): void {
        HSLogger.debug(() => `Hidden ${kind} answered: ${keys[0]}`, HSHiddenDialogs.#context);
        if (kind !== 'alert' || typeof text !== 'string') return;
        if (!HSSettings.getSetting('hideGameDialogsNotify')?.isEnabled()) return;
        const plain = HSDialogIdentity.normalize(text);
        if (plain) void HSUI.Notify(plain, { position: 'bottomLeft', notificationType: 'default' });
    }

    /**
     * A Confirm or Alert is about to be shown (hook) or was just shown (DOM): offers the checkbox if its keys are
     * known and not blocked, unticked. Undefined keys hide it.
     */
    static onShown(kind: HSHideableDialogKind, keys: string[] | undefined): void {
        const offered = HSHiddenDialogs.#enabled && !!keys && keys.length > 0
            && !keys.some(key => HSHiddenDialogs.#resource().blocked.has(`${kind}:${key}`));
        HSHiddenDialogs.#shown = offered ? { kind, keys: keys! } : null;

        const checkbox = HSHiddenDialogs.#checkboxes[kind];
        if (!checkbox) return;
        checkbox.checked = false;
        checkbox.closest(`#${kind}`)?.classList.toggle('hs-hidden-dialog-offer', offered);
    }

    // ── Checkbox in the game's dialogs ───────────────────────────────────────────────────────────────

    static #installDialogUI(): void {
        if (HSHiddenDialogs.#uiInstalled) return;
        HSHiddenDialogs.#uiInstalled = true;
        HSUI.injectStyle(hiddenDialogsCSS, 'hs-hidden-dialogs-css');

        const labels: Record<HSHideableDialogKind, string> = { confirm: '[HS] Always confirm', alert: "[HS] Don't show again" };
        for (const kind of ['confirm', 'alert'] as HSHideableDialogKind[]) {
            const popup = document.getElementById(kind);
            const ok = document.getElementById(`ok_${kind}`);
            if (!popup || !ok) {
                HSLogger.warn(`#${kind} or #ok_${kind} not found: no "${labels[kind]}" checkbox`, HSHiddenDialogs.#context);
                continue;
            }

            const label = document.createElement('label');
            label.className = 'hs-hidden-dialog-option';
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            label.append(checkbox, document.createTextNode(labels[kind]));
            popup.insertBefore(label, ok);
            HSHiddenDialogs.#checkboxes[kind] = checkbox;

            // The game answers the dialog on Enter or Space released anywhere in it: Space only toggles the checkbox
            checkbox.addEventListener('keyup', (e) => { if (e.key === ' ') e.stopPropagation(); });

            ok.addEventListener('click', (e) => {
                if (e.isTrusted) HSHiddenDialogs.#rememberIfTicked(kind);
            }, true);

            // Same rule as the game's: Enter or Space answers with the focused button, OK when none has focus.
            // Escape cancels.
            popup.addEventListener('keyup', (e) => {
                if (!e.isTrusted || (e.key !== 'Enter' && e.key !== ' ')) return;
                if (e.target === checkbox && e.key === ' ') return;
                if (e.target instanceof HTMLButtonElement && e.target !== ok) return;
                HSHiddenDialogs.#rememberIfTicked(kind);
            }, true);
        }
    }

    static #rememberIfTicked(kind: HSHideableDialogKind): void {
        const shown = HSHiddenDialogs.#shown;
        if (!HSHiddenDialogs.#enabled || !shown || shown.kind !== kind || !HSHiddenDialogs.#checkboxes[kind]?.checked) return;

        const id = `${kind}:${shown.keys[0]}`;
        HSHiddenDialogs.#shown = null;
        const data = HSHiddenDialogs.#getData();
        if (!data.entries.some(entry => entry.id === id)) {
            data.entries.push({ id, source: 'player' });
            HSHiddenDialogs.#forgotten.delete(id);
            HSHiddenDialogs.#save();
            HSHiddenDialogs.renderList();
        }
        HSLogger.log(`Dialog hidden from now on: ${HSHiddenDialogs.#label(id)}`, HSHiddenDialogs.#context);
    }

    // ── Stored list ──────────────────────────────────────────────────────────────────────────────────

    static #getData(): HSHiddenDialogsData {
        if (HSHiddenDialogs.#data) return HSHiddenDialogs.#data;

        const stored = HSModuleRegistry.getModule('HSStorage')?.getData<HSHiddenDialogsData>(HSGlobal.HSHiddenDialogs.storageKey);
        const valid = !!stored && stored.version === 1 && Array.isArray(stored.entries) && Array.isArray(stored.presetAdded);
        HSHiddenDialogs.#data = valid
            ? {
                version: 1,
                entries: stored.entries.filter(entry => typeof entry?.id === 'string'),
                presetAdded: stored.presetAdded.filter(id => typeof id === 'string'),
            }
            : { version: 1, entries: [], presetAdded: [] };
        return HSHiddenDialogs.#data;
    }

    static #save(): void {
        const saved = HSModuleRegistry.getModule('HSStorage')?.setData(HSGlobal.HSHiddenDialogs.storageKey, HSHiddenDialogs.#getData());
        if (!saved) HSLogger.warn('Could not save the hidden dialogs', HSHiddenDialogs.#context);
    }

    /** Preset entries never added before (first switch on, or new in this mod version). */
    static #addNewPresetEntries(): void {
        const data = HSHiddenDialogs.#getData();
        const added = HSHiddenDialogs.#resource().preset.filter(id => !data.presetAdded.includes(id));
        if (added.length === 0) return;

        for (const id of added) {
            data.presetAdded.push(id);
            if (!data.entries.some(entry => entry.id === id)) data.entries.push({ id, source: 'preset' });
        }
        HSHiddenDialogs.#save();
        HSLogger.log(`${added.length} ready-made hidden dialog(s) added`, HSHiddenDialogs.#context);
    }

    /**
     * "Restore default": the list becomes the ready-made list exactly. The player's own entries are removed, but
     * stay in the panel list, unselected, until the next load: selecting one hides it again.
     */
    static #restoreDefault(): void {
        const data = HSHiddenDialogs.#getData();
        const preset = HSHiddenDialogs.#resource().preset;
        for (const entry of data.entries) {
            if (!preset.includes(entry.id)) HSHiddenDialogs.#forgotten.set(entry.id, entry);
        }
        for (const id of preset) HSHiddenDialogs.#forgotten.delete(id);
        data.entries = preset.map(id => ({ id, source: 'preset' }));
        data.presetAdded = [...new Set([...data.presetAdded, ...preset])];
        HSHiddenDialogs.#save();
        HSHiddenDialogs.renderList();
        HSLogger.log('Hidden dialogs restored to the default list', HSHiddenDialogs.#context);
        void HSUI.Notify('Hidden dialogs restored to the default list', { notificationType: 'success' });
    }

    // ── "Hidden dialogs" list in the panel ───────────────────────────────────────────────────────────

    /**
     * (Re)builds the list's options. Hidden ones are marked with a class, not selected: whenever a multiple
     * select's selection changes, the browser scrolls it on its own, at a time the mod can't catch.
     * Forgotten ones stay, unmarked, until the next load.
     */
    static renderList(): void {
        const select = HSHiddenDialogs.#ensureListBlock();
        if (!select) return;

        const previousScrollTop = select.scrollTop;
        select.replaceChildren();
        const entries = HSHiddenDialogs.#getData().entries;
        const ids = [...entries.map(entry => entry.id), ...[...HSHiddenDialogs.#forgotten.keys()].filter(id => !entries.some(entry => entry.id === id))];
        if (ids.length === 0) {
            const option = document.createElement('option');
            option.value = '';
            option.disabled = true;
            option.textContent = '(none)';
            select.append(option);
        }
        for (const id of ids) {
            const option = document.createElement('option');
            option.value = id;
            const fullText = HSHiddenDialogs.#label(id);
            option.textContent = fullText.length > HSHiddenDialogs.#labelMaxLength
                ? `${fullText.slice(0, HSHiddenDialogs.#labelMaxLength - 1)}…`
                : fullText;
            option.title = fullText;
            option.classList.toggle(HSHiddenDialogs.#hiddenClass, entries.some(entry => entry.id === id));
            select.append(option);
        }
        select.scrollTop = previousScrollTop;
    }

    /** "Confirm · Do you wish to start singularity #…?": the kind, then the text in the current language. */
    static #label(id: string): string {
        const separator = id.indexOf(':');
        const kind = id.slice(0, separator);
        const key = id.slice(separator + 1);
        const text = HSDialogIdentity.getText(key)?.replace(/\{\{[^}]*\}\}/g, '…') ?? key;
        return `${kind === 'confirm' ? 'Confirm' : 'Alert'} · ${text}`;
    }

    static #ensureListBlock(): HTMLSelectElement | null {
        const existing = document.getElementById(HSHiddenDialogs.#listId) as HTMLSelectElement | null;
        if (existing) return existing;

        const anchor = document.getElementById(HSHiddenDialogs.#anchorBlockId);
        if (!anchor) return null;

        anchor.insertAdjacentHTML('afterend', HSUIC.Div({
            id: HSHiddenDialogs.#listBlockId,
            class: 'hs-panel-setting-block',
            html: [
                HSUIC.Div({
                    class: 'hs-panel-setting-block-text-wrapper',
                    html: HSUIC.P({
                        class: 'hs-panel-setting-block-text',
                        props: { title: 'Click a dialog to stop hiding it. Click it again to hide it again. Hover a dialog for its full text. Restore default: back to the ready-made list only.' },
                        text: 'Hidden dialogs'
                    })
                }),
                HSUIC.Select({
                    class: 'hs-panel-setting-block-select-input',
                    id: HSHiddenDialogs.#listId,
                    type: HSInputType.SELECT,
                    // Not focusable: the keyboard would select options (see renderList)
                    props: { multiple: 'multiple', size: '8', tabindex: '-1' }
                }, []),
                HSUIC.Button({ id: HSHiddenDialogs.#restoreId, text: 'Restore default' }),
            ]
        }));

        const select = document.getElementById(HSHiddenDialogs.#listId) as HTMLSelectElement | null;
        if (!select) return null;

        // Like "Hide vanilla tabs": a click toggles one option. The browser's own selection is never used
        select.onmousedown = (event) => {
            if (event.button !== 0 || !(event.target instanceof HTMLOptionElement) || !event.target.value) return;
            event.preventDefault();
            const option = event.target;
            const hidden = option.classList.toggle(HSHiddenDialogs.#hiddenClass);
            HSHiddenDialogs.#setHidden(option.value, hidden);
        };
        document.getElementById(HSHiddenDialogs.#restoreId)?.addEventListener('click', () => HSHiddenDialogs.#restoreDefault());
        return select;
    }

    static #setHidden(id: string, hidden: boolean): void {
        const data = HSHiddenDialogs.#getData();
        const index = data.entries.findIndex(entry => entry.id === id);
        if (hidden && index < 0) {
            data.entries.push(HSHiddenDialogs.#forgotten.get(id) ?? { id, source: 'player' });
            HSHiddenDialogs.#forgotten.delete(id);
        } else if (!hidden && index >= 0) {
            HSHiddenDialogs.#forgotten.set(id, data.entries[index]);
            data.entries.splice(index, 1);
        } else {
            return;
        }
        HSHiddenDialogs.#save();
        HSLogger.log(`${hidden ? 'Hidden again' : 'No longer hidden'}: ${HSHiddenDialogs.#label(id)}`, HSHiddenDialogs.#context);
    }
}
