import { HSGlobal } from "./hs-global";
import { HSLogger } from "./hs-logger";
import { HSUI } from "./hs-ui";
import { HSUIC } from "./hs-ui-components";
import { HSModuleRegistry } from "./module/hs-module-registry";

import { HSPlatform } from "./hs-platform";

import { HSGameDialogs } from "./dialogs/hs-game-dialogs";

import backupCSS from "inline:../../resource/css/module/hs-backup.css";

// The game's own localStorage key for its save: the same base64 string as its export file
const SAVE_KEY = 'Synergysave2';
const FORMAT_VERSION = 1;
// What the game keeps in localStorage outside its save, and reads at page load: language, colour theme,
// stat symbols, tab order, export to the clipboard, dismissed announcements. A missing key is a value too
// (the default theme, export to a file), so an import removes the ones the file doesn't have.
const GAME_PREF_KEYS = ['language', 'theme', 'statSymbols', 'synergism-tab-order', 'copyToClipboard', 'dismissedAnnouncements'];

interface HSBackupParts {
    save: boolean;
    modData: boolean;
    gamePrefs: boolean;
    logs: boolean;
}

interface HSBackupSaveSummary {
    singularity?: number;
    highestSingularity?: number;
    // The Exalt the save is inside (1 to 10), absent outside one
    exalt?: number;
}

// The Exalts in the order of the game's Exalt tab, which numbers them (as HSGameDataAPI.getActiveExalt)
const EXALT_KEYS = [
    'noSingularityUpgrades', 'oneChallengeCap', 'limitedAscensions', 'noQuarkUpgrades', 'noOcteracts',
    'noAmbrosiaUpgrades', 'limitedTime', 'sadisticPrequel', 'taxmanLastStand', 'barDependence',
];

// Always written, never imported: what is asked first when debugging a player's file
interface HSBackupInfo extends HSBackupSaveSummary {
    modVersion: string;
    date: string;
    platform: 'steam' | 'browser';
    // Which patcher features this game has (all false: loaded with the bookmarklet)
    patcher: Record<string, boolean>;
    loaderRef?: string;
    gameLanguage: string;
    statSymbols: boolean;
    numberLocale: string;
    userAgent: string;
}

// Written by the manual backup only, never imported: what the mod computes from data that isn't in the save
interface HSBackupDiagnostics {
    // The heater export's hs_data: PseudoCoin levels, quark bonus, events, and the mod's own results
    heater?: unknown;
    heaterError?: string;
}

interface HSBackupFile {
    hsBackup: number;
    info: HSBackupInfo;
    diagnostics?: HSBackupDiagnostics;
    logs?: string[];
    // localStorage values as stored, by key
    gamePrefs?: Record<string, string>;
    modData?: Record<string, string>;
    save?: string;
}

// What an import writes
interface HSBackupWrite {
    save?: string;
    modData?: Record<string, string>;
    gamePrefs?: Record<string, string>;
}

// What a chosen file holds, once checked
interface HSBackupImport {
    info?: Partial<HSBackupInfo>;
    save?: string;
    saveSummary?: HSBackupSaveSummary;
    // The file has a save, but not one the game would load
    saveRefused: boolean;
    modData?: Record<string, string>;
    gamePrefs?: Record<string, string>;
    logCount: number;
    hasHeaterData: boolean;
}

/**
 * Class: HSBackup
 * IsExplicitHSModule: No
 * Description:
 *     The "Backup & Restore" section of the Tools tab: the game save, the mod's stored data and the logs in one file.
 *     - Mod data is every localStorage key under the mod's prefix (settings, strategies, hidden dialogs, icons...),
 *       copied as stored. The dev tools' key is left out.
 *     - The save is the game's own stored string, after a manual save: no export reward.
 *     - Game preferences are the few options the game keeps outside its save (language, theme, tab order...).
 *     - The manual backup also holds the heater export's data (diagnostics), never imported.
 *     - An import writes localStorage, then reloads the page: the game and the mod load what was written,
 *       as at any page load. Until the page is gone, writes to the imported keys are blocked, so the game's
 *       autosave and the mod's own saves can't put the old values back.
 *     - A save exported by the game itself can be imported too.
 *     - Refused while autosing is active.
 * Author: Shewchou
 */
export class HSBackup {
    static #context = 'HSBackup';
    static readonly #exportBtnId = 'hs-panel-backup-export-btn';
    static readonly #importBtnId = 'hs-panel-backup-import-btn';
    static #exporting = false;
    static readonly #modDataHint = 'Settings, strategies, hidden dialogs, icons';
    static readonly #gamePrefsHint = 'Kept by the game outside its save: language, theme, stat symbols, tab order, export to clipboard, dismissed announcements';
    static readonly #partIds: Record<keyof HSBackupParts, string> = {
        save: 'hs-panel-backup-part-save',
        modData: 'hs-panel-backup-part-moddata',
        gamePrefs: 'hs-panel-backup-part-gameprefs',
        logs: 'hs-panel-backup-part-logs',
    };

    // ===============================
    // ------- Tools tab section -----
    // ===============================

    /** The section's grid cells, to put under its header. */
    static buildToolsSection(): string[] {
        HSUI.injectStyle(backupCSS, 'hs-backup-css');

        const part = (key: keyof HSBackupParts, label: string, title = '') =>
            `<label title="${title}"><input type="checkbox" id="${HSBackup.#partIds[key]}" checked>${label}</label>`;

        return [
            HSUIC.Div({
                class: 'hs-panel-grid-full-span hs-panel-grid-hint',
                html: 'All in one file, with the heater data for bug reports.'
            }),
            HSUIC.Div({
                class: 'hs-panel-grid-full-span hs-backup-parts',
                html: `${part('save', 'Save')}${part('modData', 'Mod data', HSBackup.#modDataHint)}${part('gamePrefs', 'Game preferences', HSBackup.#gamePrefsHint)}${part('logs', 'Logs')}`
            }),
            HSUIC.Button({ id: HSBackup.#exportBtnId, text: 'Export to file' }),
            HSUIC.Button({ id: HSBackup.#importBtnId, text: 'Import from file…' }),
        ];
    }

    static bindToolsSection(): void {
        const isTicked = (key: keyof HSBackupParts) =>
            (document.getElementById(HSBackup.#partIds[key]) as HTMLInputElement | null)?.checked ?? false;

        document.getElementById(HSBackup.#exportBtnId)?.addEventListener('click', () => {
            void HSBackup.#export({ save: isTicked('save'), modData: isTicked('modData'), gamePrefs: isTicked('gamePrefs'), logs: isTicked('logs') }, false);
        });
        document.getElementById(HSBackup.#importBtnId)?.addEventListener('click', () => HSBackup.#chooseImportFile());
    }

    /** The Tools tab's CLEAR SETTINGS: every setting back to its default, at the reload. */
    static clearSettingsAndReload(): void {
        if (!window.confirm('Reset every mod setting to its default, then reload the page?\n\nStrategies, hidden dialogs and icons are kept.')) return;

        // The settings are also in memory, and written back at any setting change: hence the block and the reload
        localStorage.removeItem(`${HSGlobal.HSStorage.storagePrefix}${HSGlobal.HSSettings.storageKey}`);
        HSBackup.#blockStorageWrites({ modData: {} });
        HSBackup.#reload('Stored settings cleared');
    }

    // ===============================
    // ------------ Export -----------
    // ===============================

    /**
     * Downloads the chosen parts as one file.
     * @param beforeImport The automatic backup taken before an import: named as such, and it settles for
     *     the last stored save when the game can't save right now. It has no heater data (no wait before the import).
     * @returns The file's name, or null when nothing was downloaded.
     */
    static async #export(parts: HSBackupParts, beforeImport: boolean): Promise<string | null> {
        if (!parts.save && !parts.modData && !parts.gamePrefs && !parts.logs) {
            HSUI.Notify('Backup: nothing is ticked', { position: 'top', notificationType: 'warning' });
            return null;
        }
        if (HSBackup.#refusedDuringAutosing('Export')) return null;
        // The heater data waits on the network: a second click meanwhile would download a second file
        if (HSBackup.#exporting) return null;
        HSBackup.#exporting = true;

        try {
            // First, so the save below is taken after it: building the heater data clicks the game's save
            const diagnostics = beforeImport ? undefined : await HSBackup.#collectDiagnostics();
            // Autosing may have started while the heater data was built
            if (HSBackup.#refusedDuringAutosing('Export')) return null;

            let save: string | null = null;
            if (parts.save) {
                // Saved: the game's stored string is the save just made. Not saved: before an import, the last one
                save = HSBackup.captureSave() !== null || beforeImport ? localStorage.getItem(SAVE_KEY) : null;
                if (!save) {
                    HSUI.Notify('Backup: the game could not save right now (offline progress running?)', { position: 'top', notificationType: 'error' });
                    return null;
                }
            }

            const file: HSBackupFile = {
                hsBackup: FORMAT_VERSION,
                // The save's own numbers when it's in the file, else the stored save's
                info: HSBackup.#collectInfo(save ?? localStorage.getItem(SAVE_KEY)),
            };
            if (diagnostics) file.diagnostics = diagnostics;
            if (parts.logs) file.logs = HSLogger.getLogLines();
            if (parts.gamePrefs) file.gamePrefs = HSBackup.#readGamePrefs();
            if (parts.modData) file.modData = HSBackup.#readModData();
            if (save) file.save = save;

            const name = HSBackup.#download(file, beforeImport ? 'Synergism save backup before import' : 'Synergism save backup');
            if (!beforeImport) HSUI.Notify('Backup file downloaded', { position: 'top', notificationType: 'success' });
            return name;
        } catch (error) {
            HSLogger.error(`Export failed: ${error}`, HSBackup.#context);
            HSUI.Notify('Backup: export failed (see the Log tab)', { position: 'top', notificationType: 'error' });
            return null;
        } finally {
            HSBackup.#exporting = false;
        }
    }

    /** The heater export's data, or why it is missing: a failure never stops the backup. */
    static async #collectDiagnostics(): Promise<HSBackupDiagnostics> {
        const api = HSModuleRegistry.getModule('HSGameDataAPI');
        if (!api) return { heaterError: 'HSGameDataAPI not loaded' };

        try {
            // Forces a fresh save first
            const heaterData = await api.dumpDataForHeater();
            // The rest of it is the save, already in the file when ticked
            if (heaterData?.hs_data) return { heater: heaterData.hs_data };
            return { heaterError: 'no heater data (no save data yet, or the calculation failed: see the logs)' };
        } catch (error) {
            HSLogger.warn(`Backup: no heater data: ${error}`, HSBackup.#context);
            return { heaterError: String(error) };
        }
    }

    /**
     * Makes the game save now and returns the save's JSON, or null when the game did not save (it refuses during a
     * time warp). Synchronous: the game serializes the save through btoa and writes `btoa(json)` to localStorage
     * before its save button's handler returns, so after a capture the stored save is the same content.
     */
    static captureSave(): string | null {
        const before = localStorage.getItem(SAVE_KEY);
        const captured = HSModuleRegistry.getModule('HSGameData')?.forceCaptureRawSaveSync();
        if (captured !== undefined) return captured;

        // Missed by the btoa hook but written all the same: the stored save is the same content.
        // Nothing written: the game did not save.
        const stored = localStorage.getItem(SAVE_KEY);
        if (!stored || stored === before) return null;
        try {
            return atob(stored);
        } catch {
            return null;
        }
    }

    static #isModKey(key: string): boolean {
        const prefix = HSGlobal.HSStorage.storagePrefix;
        // The dev tools' own key, put together here: its full name must stay out of the release bundle
        return key.startsWith(prefix) && key !== `${prefix}dev-tools`;
    }

    static #readModData(): Record<string, string> {
        const data: Record<string, string> = {};

        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (!key || !HSBackup.#isModKey(key)) continue;

            const value = localStorage.getItem(key);
            if (value !== null) data[key] = value;
        }

        return data;
    }

    static #readGamePrefs(): Record<string, string> {
        const prefs: Record<string, string> = {};

        for (const key of GAME_PREF_KEYS) {
            const value = localStorage.getItem(key);
            // An empty value counts: the game stores "export to the clipboard" as one
            if (value !== null) prefs[key] = value;
        }

        return prefs;
    }

    static #collectInfo(save: string | null): HSBackupInfo {
        const w = window;
        const has = (name: keyof Window) => w[name] !== undefined && w[name] !== null && w[name] !== false;
        const summary = save ? HSBackup.#readSave(save) : null;

        const info: HSBackupInfo = {
            modVersion: HSGlobal.General.currentModVersion,
            date: new Date().toISOString(),
            platform: HSPlatform.get() === 'steam' ? 'steam' : 'browser',
            ...(summary ?? {}),
            patcher: {
                exposedPlayer: !!HSGlobal.exposedPlayer,
                dialogHook: HSGameDialogs.isHookPatched(),
                stage: has('__HS_synergismStage'),
                i18next: has('__HS_i18next'),
                exportOutput: has('__HS_EXPORT_OUTPUT_PATCHED'),
                maxChallenges: has('__HS_getMaxChallenges'),
                validateBlueberryTree: has('__HS_validateBlueberryTree'),
                saveImportHook: has('__HS_SAVE_IMPORT_HOOK_PATCHED'),
                tackHooks: has('__HS_tackHooks'),
                consumables: has('__HS_consumables'),
                pcoinLevels: has('__HS_pcoinLevelsLoaded'),
                quarkBonus: has('__HS_quarkBonus'),
                globalEvent: has('__HS_GLOBAL_EVENT_PATCHED'),
            },
            gameLanguage: localStorage.getItem('language') ?? 'en',
            statSymbols: localStorage.getItem('statSymbols') === 'true',
            numberLocale: new Intl.NumberFormat().resolvedOptions().locale,
            userAgent: navigator.userAgent,
        };

        // Set by the browser userscript (the repo and ref the patcher was taken from)
        // and by the Steam injector (those of the mod, loader 0.2.9 and later)
        if (typeof w.__HS_REPO === 'string' || typeof w.__HS_VERSION === 'string') {
            info.loaderRef = `${w.__HS_REPO ?? '?'}@${w.__HS_VERSION ?? '?'}`;
        }

        return info;
    }

    static #download(file: HSBackupFile, label: string): string {
        const date = new Date();
        const pad = (value: number) => String(value).padStart(2, '0');
        const stamp = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}-${pad(date.getMinutes())}-${pad(date.getSeconds())}`;
        const { singularity: current, highestSingularity: highest, exalt } = file.info;
        const singularity = current !== undefined
            ? ` S${current}${exalt !== undefined ? ` E${exalt}` : ''}${highest !== undefined ? ` (highest S${highest})` : ''}`
            : '';
        const name = `[HS] ${label} ${stamp}${singularity}.json`;

        // One line per log and per stored value, so the file can be read in a text editor
        const url = URL.createObjectURL(new Blob([JSON.stringify(file, null, 1)], { type: 'application/json' }));
        const link = document.createElement('a');
        link.href = url;
        link.download = name;
        document.body.appendChild(link);
        link.click();
        link.remove();
        // Kept a long time: on Steam the download waits for a "Save as" dialog
        window.setTimeout(() => URL.revokeObjectURL(url), 10 * 60 * 1000);

        HSLogger.log(`Backup downloaded as "${name}"`, HSBackup.#context);
        return name;
    }

    // ===============================
    // ------------ Import -----------
    // ===============================

    static #chooseImportFile(): void {
        if (HSBackup.#refusedDuringAutosing('Import')) return;

        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json,.txt,application/json,text/plain';
        input.addEventListener('change', async () => {
            const file = input.files?.[0];
            if (!file) return;

            try {
                const content = HSBackup.#parseFile(await file.text());
                if (typeof content === 'string') {
                    HSLogger.warn(`Import refused: ${content}`, HSBackup.#context);
                    HSUI.Notify(`Backup: ${content}`, { position: 'top', notificationType: 'error', displayDuration: 8000 });
                    return;
                }
                await HSBackup.#openImportModal(file.name, content);
            } catch (error) {
                HSLogger.error(`Import failed: ${error}`, HSBackup.#context);
                HSUI.Notify('Backup: the file could not be read (see the Log tab)', { position: 'top', notificationType: 'error' });
            }
        });
        input.click();
    }

    /**
     * Reads a save the way the game does at page load, and returns what the file name and the modal show.
     * Null when the game would not load it: not base64 JSON (the old compressed saves among them, for which
     * the game clears the whole localStorage at load), or a save of the game's test version.
     */
    static #readSave(save: string): HSBackupSaveSummary | null {
        try {
            const data = JSON.parse(atob(save));
            if (!data || typeof data !== 'object' || Array.isArray(data)) return null;
            if (data.exporttest !== 'YES!' && data.exporttest !== true) return null;

            const count = (value: unknown) => typeof value === 'number' && Number.isFinite(value) ? value : undefined;
            const exaltIndex = EXALT_KEYS.findIndex(key => data.singularityChallenges?.[key]?.enabled === true);
            return {
                singularity: count(data.singularityCount),
                highestSingularity: count(data.highestSingularityCount),
                ...(exaltIndex >= 0 ? { exalt: exaltIndex + 1 } : {}),
            };
        } catch {
            return null;
        }
    }

    /** What the file holds, or the reason it is refused. The file may come from someone else: nothing in it is trusted. */
    static #parseFile(text: string): HSBackupImport | string {
        let parsed: unknown;
        try {
            parsed = JSON.parse(text);
        } catch {
            parsed = undefined;
        }

        const content: HSBackupImport = { saveRefused: false, logCount: 0, hasHeaterData: false };
        let save: unknown;

        if (parsed && typeof parsed === 'object' && typeof (parsed as HSBackupFile).hsBackup === 'number') {
            const file = parsed as Partial<HSBackupFile>;
            if (file.hsBackup! > FORMAT_VERSION) return 'this file was made by a newer version of the mod';

            if (file.info && typeof file.info === 'object') content.info = file.info;
            if (Array.isArray(file.logs)) content.logCount = file.logs.length;
            content.hasHeaterData = !!file.diagnostics && typeof file.diagnostics === 'object'
                && file.diagnostics.heater !== undefined;
            save = file.save;

            if (file.modData && typeof file.modData === 'object') {
                // Only the mod's own keys, and only as strings: a file can't write anything else
                const modData: Record<string, string> = {};
                for (const [key, value] of Object.entries(file.modData)) {
                    if (HSBackup.#isModKey(key) && typeof value === 'string') modData[key] = value;
                }
                if (Object.keys(modData).length > 0) content.modData = modData;
            }

            // An empty list is a valid one: every preference at its default
            if (file.gamePrefs && typeof file.gamePrefs === 'object' && !Array.isArray(file.gamePrefs)) {
                const gamePrefs: Record<string, string> = {};
                for (const [key, value] of Object.entries(file.gamePrefs)) {
                    if (GAME_PREF_KEYS.includes(key) && typeof value === 'string') gamePrefs[key] = value;
                }
                content.gamePrefs = gamePrefs;
            }
        } else {
            // Not a mod backup: taken as a save exported by the game
            save = text;
        }

        if (typeof save === 'string' && save.trim() !== '') {
            const trimmed = save.trim();
            const summary = HSBackup.#readSave(trimmed);
            if (summary) {
                content.save = trimmed;
                content.saveSummary = summary;
            } else {
                content.saveRefused = true;
            }
        }

        if (!content.save && !content.modData && !content.gamePrefs) {
            return content.saveRefused
                ? 'this file is neither a mod backup nor a save the game would load'
                : 'nothing to import in this file';
        }
        return content;
    }

    /**
     * The save a file holds, as the game stores it (base64), or the reason there is none the game would load.
     * Takes the same files as the import: a mod backup (its save part) or a save exported by the game.
     */
    static saveFromFile(text: string): { save: string } | string {
        const content = HSBackup.#parseFile(text);
        if (typeof content === 'string') return content;
        if (content.save) return { save: content.save };
        return content.saveRefused ? 'the save in this file is not one the game would load' : 'this file holds no save';
    }

    /**
     * Moves a parsed save's clock fields to `now`, in place, so the game counts no time away at load.
     * Always `offlinetick` (offline progress). `codeTimers`: `rngCode` (Add code uses) and `promoCodeTiming.time`
     * (the Time code's size), moved forward by the time since the save. `dailyReset`: `dayCheck` (the date of the
     * last daily reset) set to today's local midnight, as the game writes it, so a save from an earlier day gets no
     * daily reset; left at null, the game sets it to today at load. A field missing or of another type is left alone.
     */
    static shiftSaveClock(data: Record<string, any>, now: number, { codeTimers, dailyReset }: { codeTimers: boolean, dailyReset: boolean }): void {
        const elapsed = typeof data.offlinetick === 'number' ? Math.max(0, now - data.offlinetick) : 0;
        data.offlinetick = now;

        if (codeTimers) {
            if (typeof data.rngCode === 'number') data.rngCode += elapsed;
            if (typeof data.promoCodeTiming?.time === 'number') data.promoCodeTiming.time += elapsed;
        }

        if (dailyReset && typeof data.dayCheck === 'string') {
            const today = new Date(now);
            data.dayCheck = new Date(today.getFullYear(), today.getMonth(), today.getDate()).toISOString();
        }
    }

    /**
     * A save's JSON in base64, as the game stores and exports it: one byte per character, like btoa.
     * Not window.btoa itself: GDS hooks it, and would take this save for the current one.
     */
    static async encodeSave(json: string): Promise<string> {
        const bytes = new Uint8Array(json.length);
        for (let i = 0; i < bytes.length; i++) bytes[i] = json.charCodeAt(i);

        const dataUrl = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = () => reject(reader.error);
            reader.readAsDataURL(new Blob([bytes]));
        });
        return dataUrl.slice(dataUrl.indexOf(',') + 1);
    }

    /** The save (base64) with no offline progress at load: only `offlinetick` moves, the rest loads as the game would. */
    static async #withoutOfflineProgress(save: string): Promise<string> {
        const data = JSON.parse(atob(save));
        HSBackup.shiftSaveClock(data, Date.now(), { codeTimers: false, dailyReset: false });
        return HSBackup.encodeSave(JSON.stringify(data));
    }

    static async #openImportModal(fileName: string, content: HSBackupImport): Promise<void> {
        const hsui = HSModuleRegistry.getModule('HSUI');
        if (!hsui) return;

        const row = (part: string, label: string, checked: boolean) =>
            `<label><input type="checkbox" data-part="${part}"${checked ? ' checked' : ''}>${label}<span class="hs-backup-part-note" data-note="${part}"></span></label>`;

        const modalId = await hsui.Modal({
            title: 'Import backup',
            htmlContent: `
                <div class="hs-backup-modal">
                    <div class="hs-backup-file"></div>
                    <div class="hs-backup-details"></div>
                    ${row('save', 'Save', true)}
                    <label class="hs-backup-suboption" title="The save loads as it was made: no offline progress since then"><input type="checkbox" data-part="skipOffline">Skip offline progress</label>
                    ${row('modData', 'Mod data', true)}
                    ${row('gamePrefs', 'Game preferences', true)}
                    ${row('backup', 'Download a backup of my current save, mod data and preferences first', true)}
                    <div>Importing replaces what is ticked, then reloads the page.</div>
                    <div class="hs-backup-status"></div>
                    <div class="hs-backup-actions">
                        <div class="hs-panel-btn hs-backup-cancel">Cancel</div>
                        <div class="hs-panel-btn hs-panel-btn-auto-width hs-backup-import">Import and reload</div>
                    </div>
                </div>`
        });

        const modal = document.getElementById(modalId);
        if (!modal) return;

        const box = (part: string) => modal.querySelector(`input[data-part="${part}"]`) as HTMLInputElement;
        const note = (part: string) => modal.querySelector(`[data-note="${part}"]`) as HTMLElement;
        const status = modal.querySelector('.hs-backup-status') as HTMLElement;
        const importBtn = modal.querySelector('.hs-backup-import') as HTMLElement;
        (modal.querySelector('.hs-backup-cancel') as HTMLElement).dataset.close = modalId;

        // Everything read from the file goes in as text, never as HTML
        const text = (value: unknown) => String(value ?? '?').slice(0, 80);
        (modal.querySelector('.hs-backup-file') as HTMLElement).textContent = fileName;

        const details: string[] = [];
        if (content.info) {
            const date = new Date(String(content.info.date));
            details.push(`Made ${Number.isNaN(date.getTime()) ? text(content.info.date) : date.toLocaleString()}, mod v${text(content.info.modVersion)}, ${text(content.info.platform)}`);
        } else {
            details.push('A save exported by the game');
        }
        if (content.logCount > 0) details.push(`Logs: ${content.logCount} lines (kept in the file, never imported)`);
        if (content.hasHeaterData) details.push('Heater data (kept in the file, never imported)');
        (modal.querySelector('.hs-backup-details') as HTMLElement).textContent = details.join('\n');

        const unavailable = (part: string, reason: string) => {
            box(part).checked = false;
            box(part).disabled = true;
            note(part).textContent = reason;
        };

        if (content.save) {
            const { singularity, highestSingularity, exalt } = content.saveSummary ?? {};
            note('save').textContent = singularity !== undefined
                ? `(Singularity ${singularity}${exalt !== undefined ? ` inside Exalt ${exalt}` : ''}, highest ${highestSingularity ?? '?'})`
                : '';
        } else {
            unavailable('save', content.saveRefused ? '(not a save the game would load)' : '(not in this file)');
        }

        // Only with the save: greyed out, in place, when it is unticked or missing
        const skipOffline = box('skipOffline');
        const syncSkipOffline = () => {
            skipOffline.disabled = !box('save').checked;
            (skipOffline.parentElement as HTMLElement).classList.toggle('hs-backup-suboption-off', skipOffline.disabled);
        };
        box('save').addEventListener('change', syncSkipOffline);
        syncSkipOffline();

        if (content.modData) {
            (box('modData').parentElement as HTMLElement).title = HSBackup.#modDataHint;
            note('modData').textContent = `(${Object.keys(content.modData).length} stored entries)`;
        } else {
            unavailable('modData', '(not in this file)');
        }

        if (content.gamePrefs) {
            (box('gamePrefs').parentElement as HTMLElement).title = HSBackup.#gamePrefsHint;
            note('gamePrefs').textContent = content.gamePrefs.language ? `(language: ${text(content.gamePrefs.language)})` : '';
        } else {
            unavailable('gamePrefs', '(not in this file)');
        }

        let backupDownloaded = false;
        importBtn.addEventListener('click', async () => {
            const write: HSBackupWrite = {
                save: box('save').checked ? content.save : undefined,
                modData: box('modData').checked ? content.modData : undefined,
                gamePrefs: box('gamePrefs').checked ? content.gamePrefs : undefined,
            };

            if (!write.save && !write.modData && !write.gamePrefs) {
                status.textContent = 'Nothing is ticked.';
                return;
            }
            if (HSBackup.#refusedDuringAutosing('Import')) return;

            // Two clicks: the page must not reload before the backup file is written (Steam asks where to save it)
            if (box('backup').checked && !backupDownloaded) {
                const name = await HSBackup.#export({ save: true, modData: true, gamePrefs: true, logs: true }, true);
                if (!name) {
                    status.textContent = 'The backup could not be made: nothing was imported.';
                    return;
                }
                backupDownloaded = true;
                status.textContent = `Backup downloaded as "${name}". Once it is saved, click "Import and reload" again.`;
                return;
            }

            if (write.save && skipOffline.checked) {
                try {
                    write.save = await HSBackup.#withoutOfflineProgress(write.save);
                } catch (error) {
                    HSLogger.error(`Import refused: the save's offline time could not be skipped: ${error}`, HSBackup.#context);
                    status.textContent = 'Offline progress could not be skipped (see the Log tab): nothing was imported.';
                    return;
                }
                // Checked again: the encoding is awaited, and autosing could have started meanwhile
                if (HSBackup.#refusedDuringAutosing('Import')) return;
                HSLogger.log('Import: the save loads with no offline progress', HSBackup.#context);
            }

            const failure = HSBackup.#applyImport(write);
            if (failure) status.textContent = failure;
        });
    }

    /**
     * Imports a save alone, then reloads the page. For the mod's own code: no modal, no backup first.
     * @param save The save as the game stores it (base64).
     * @returns Why nothing was imported. When it worked, the page reloads.
     */
    static async importSaveAndReload(save: string): Promise<string | null> {
        if (!HSBackup.#readSave(save)) return 'Not a save the game would load.';
        if (HSBackup.#isAutosingActive()) return 'Auto-Sing is active: stop it first.';

        return HSBackup.#applyImport({ save });
    }

    /**
     * Callers refuse first while autosing runs.
     * @returns Why nothing was imported. When it worked, the page reloads.
     */
    static #applyImport({ save, modData, gamePrefs }: HSBackupWrite): string | null {
        // From here to the reload nothing is awaited: no timer of the game or the mod runs in between
        const previous = new Map<string, string | null>();
        const remember = (key: string) => {
            if (!previous.has(key)) previous.set(key, localStorage.getItem(key));
        };

        try {
            if (modData) {
                // Exact restore: the mod's keys missing from the file are removed
                for (const key of Object.keys(HSBackup.#readModData())) {
                    remember(key);
                    localStorage.removeItem(key);
                }
                for (const [key, value] of Object.entries(modData)) {
                    remember(key);
                    localStorage.setItem(key, value);
                }
            }
            if (gamePrefs) {
                for (const key of GAME_PREF_KEYS) {
                    remember(key);
                    if (key in gamePrefs) localStorage.setItem(key, gamePrefs[key]);
                    else localStorage.removeItem(key);
                }
            }
            if (save) {
                remember(SAVE_KEY);
                localStorage.setItem(SAVE_KEY, save);
            }
        } catch (error) {
            // Storage full or refused: everything back as it was
            for (const [key, value] of previous) {
                try {
                    if (value === null) localStorage.removeItem(key);
                    else localStorage.setItem(key, value);
                } catch (restoreError) {
                    HSLogger.error(`Could not put "${key}" back: ${restoreError}`, HSBackup.#context);
                }
            }
            HSLogger.error(`Import failed, nothing was changed: ${error}`, HSBackup.#context);
            return 'The import failed (see the Log tab): nothing was changed.';
        }

        HSBackup.#blockStorageWrites({ save, modData, gamePrefs });
        HSBackup.#reload(`Imported ${[save ? 'the save' : '', modData ? 'the mod data' : '', gamePrefs ? 'the game preferences' : ''].filter(Boolean).join(', ')}`);
        return null;
    }

    // ===============================
    // ----------- Helpers -----------
    // ===============================

    static #isAutosingActive(): boolean {
        return HSModuleRegistry.getModule('HSAutosing')?.isAutosingActive() ?? false;
    }

    static #refusedDuringAutosing(action: string): boolean {
        if (!HSBackup.#isAutosingActive()) return false;

        HSUI.Notify(`${action} refused while Auto-Sing is active: stop it first`, { position: 'top', notificationType: 'warning' });
        return true;
    }

    /**
     * Until the page is gone, drops the writes to what was just written. The reload is not immediate, and
     * meanwhile the game's autosave would put the old save back, and the mod's own saves the old settings.
     * @param written The parts that were written, whatever their content.
     */
    static #blockStorageWrites(written: HSBackupWrite): void {
        const prefix = HSGlobal.HSStorage.storagePrefix;
        const isBlocked = (storage: Storage, key: string) => storage === window.localStorage && (
            (written.save !== undefined && key === SAVE_KEY)
            || (written.modData !== undefined && key.startsWith(prefix))
            || (written.gamePrefs !== undefined && GAME_PREF_KEYS.includes(key))
        );

        const proto = Storage.prototype;
        const { setItem, removeItem, clear } = proto;

        proto.setItem = function (this: Storage, key: string, value: string) {
            if (!isBlocked(this, String(key))) setItem.call(this, key, value);
        };
        proto.removeItem = function (this: Storage, key: string) {
            if (!isBlocked(this, String(key))) removeItem.call(this, key);
        };
        proto.clear = function (this: Storage) {
            if (this !== window.localStorage) clear.call(this);
        };
    }

    static #reload(reason: string): void {
        HSLogger.log(`${reason}, reloading the page`, HSBackup.#context);

        // Only seen if the page is still there: the blocked writes would then go on for good
        window.setTimeout(() => {
            HSUI.Notify('The page did not reload: reload it now (on Steam, restart the game)', { position: 'top', notificationType: 'error', displayDuration: 60000 });
        }, 5000);

        window.location.reload();
    }
}
