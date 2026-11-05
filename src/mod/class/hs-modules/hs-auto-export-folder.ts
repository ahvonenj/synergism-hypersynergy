import type { HSExportDirectoryHandle, HSExportFileHandle } from "../../types/module-types/hs-auto-export-types";
import { HSSetting } from "../hs-core/settings/hs-setting";
import { HSLogger } from "../hs-core/hs-logger";
import { HSUI } from "../hs-core/hs-ui";
import { HSSettings } from "../hs-core/settings/hs-settings";
import { HSAutoExportStore } from "./hs-auto-export-store";

const MAX_TRACKED_FILES = 1000;
const FOLDER_BUTTON_ID = 'hs-setting-auto-export-save-folder-button';
const FOLDER_BUTTON_TEXT = 'Choose folder';
const FOLDER_ACCESS = { mode: 'readwrite' } as const;
// A closed picker answers at once; Steam may otherwise leave its promise pending.
const PICKER_ANSWER_MS = 1500;
const PICKER_SHOW_MS = 4000;

type HSExportFolderState = 'none' | 'ready' | 'locked' | 'asking' | 'refused';

function isExportDirectoryHandle(value: unknown): value is HSExportDirectoryHandle {
    if (!value || typeof value !== 'object') return false;
    const handle = value as Partial<HSExportDirectoryHandle>;
    return typeof handle.name === 'string' && typeof handle.queryPermission === 'function'
        && typeof handle.requestPermission === 'function' && typeof handle.isSameEntry === 'function'
        && typeof handle.getFileHandle === 'function' && typeof handle.removeEntry === 'function';
}

/** Folder selection, permissions, file retention and their UI, independent of the export clock. */
export class HSAutoExportFolder {
    #folder?: HSExportDirectoryHandle;
    #folderState: HSExportFolderState = 'none';
    // Names written by this module, oldest first: unrelated files are never removed.
    #files: string[] = [];
    #noticesShown = new Set<string>();
    #picking = false;
    #pickId = 0;
    #folderButtonHelp?: string;
    #pickerFrame?: HTMLIFrameElement;
    #store = new HSAutoExportStore();

    constructor(
        private readonly context: string,
        private readonly isSteam: () => boolean,
        private readonly isEnabled: () => boolean,
    ) {}

    get isReady(): boolean {
        return this.#folderState === 'ready';
    }

    canExport(): boolean {
        // An export is due: choose a safe output destination
        if (this.#folderState === 'none') {
            // In a browser, the file is downloaded as usual
            if (this.isSteam()) {
                this.#notifyOnce('steam-folder', 'Timed save export: choose an export folder first (Save settings). On Steam, a download would open a "Save as" dialog each time');
                return false;
            }
        } else if (this.#folderState === 'locked') {
            // A player away since the page load: any click or key press gives the folder back (onPlayerInput).
            this.#notifyOnce('locked', 'Timed save export: click anywhere in the game to give the export folder back');
            return false;
        } else if (this.#folderState !== 'ready') {
            // The request is running, or access was refused (told once)
            return false;
        }

        return true;
    }

    #notifyOnce(id: string, text: string): void {
        if (this.#noticesShown.has(id)) return;
        this.#noticesShown.add(id);
        HSUI.Notify(text, { notificationType: 'warning' });
        HSLogger.warn(text, this.context);
    }

    /** "Choose folder" button. Needs the player's click: the browser only opens its folder picker for one. */
    async chooseFolder(): Promise<void> {
        // Once the window's own picker is stuck (#pickerStuck), a frame's picker is used
        const pickerWindow: Window = this.#pickerFrame?.contentWindow ?? window;
        const picker = pickerWindow.showDirectoryPicker;
        if (typeof picker !== 'function') {
            HSUI.Notify(this.#pickerFrame
                ? 'The folder picker is not available any more: restart the game, then choose a folder again'
                : 'Your browser can\'t write into a folder: the timed export downloads its files as usual', { notificationType: 'warning' });
            return;
        }

        if (this.#picking) {
            HSUI.Notify('The folder picker is already open (it may be behind the game window)', { notificationType: 'warning' });
            return;
        }

        let folder: HSExportDirectoryHandle;
        const pick = ++this.#pickId;
        this.#picking = true;
        const stopWatching = this.isSteam() ? this.#watchStuckPicker(pick) : undefined;
        try {
            folder = await picker.call(pickerWindow, { id: 'hs-auto-export', startIn: 'downloads', ...FOLDER_ACCESS });
        } catch (error) {
            // AbortError: the picker was closed without a choice
            if ((error as Error)?.name !== 'AbortError') {
                const restart = this.#pickerFrame ? ' Restart the game, then choose a folder again.' : '';
                HSUI.Notify(`Export folder not set: ${(error as Error)?.message ?? error}${restart}`, { notificationType: 'warning' });
            }
            return;
        } finally {
            stopWatching?.();
            // Not when this pick was given up as stuck and another one is running
            if (this.#pickId === pick) this.#picking = false;
        }

        // The same folder picked again keeps its list of files
        let sameFolder = false;
        try { sameFolder = this.#folder !== undefined && await this.#folder.isSameEntry(folder) === true; } catch { sameFolder = false; }
        if (!sameFolder) this.#files = [];

        this.#folder = folder;
        this.#folderState = 'ready';
        this.#noticesShown.clear();
        try {
            await this.#store.write('folder', folder);
            await this.#store.write('files', this.#files);
        } catch (error) {
            HSLogger.warn(`Timed save export: the export folder could not be remembered, it is set until the page is reloaded (${error})`, this.context);
        }
        this.refreshButton();
        HSUI.Notify(`Timed save export: files go into "${folder.name}"`);
        HSLogger.log(`Timed save export: export folder set to "${folder.name}"`, this.context);
    }

    /**
     * Steam only. The game's Electron refuses some folders (Downloads, Documents, the Desktop themselves) without
     * a word: the picker closes and its promise never settles (seen 2026-10-13; Chrome shows a dialog and opens
     * the picker again). So once the picker is closed, a pick that has no answer is given up.
     * "Closed" is the window getting the focus back, or the player's input reaching the page again (a picker
     * keeps both away); input only counts after a few seconds, the time for the picker to show.
     * @returns stops the watch.
     */
    #watchStuckPicker(pick: number): () => void {
        let timer: number | undefined;
        const startedAt = Date.now();
        const closed = () => {
            if (timer !== undefined) return;
            timer = window.setTimeout(() => {
                if (this.#picking && this.#pickId === pick) this.#pickerStuck();
            }, PICKER_ANSWER_MS);
        };
        const onInput = (e: Event) => {
            if (e.isTrusted && Date.now() - startedAt > PICKER_SHOW_MS) closed();
        };

        const inputEvents = ['mousemove', 'pointerdown', 'keydown'];
        window.addEventListener('focus', closed);
        for (const name of inputEvents) window.addEventListener(name, onInput, true);
        return () => {
            window.removeEventListener('focus', closed);
            for (const name of inputEvents) window.removeEventListener(name, onInput, true);
            if (timer !== undefined) window.clearTimeout(timer);
        };
    }

    /**
     * A window whose picker never answered refuses every later one ("File picker already active") until the page
     * is reloaded. A frame is another window with a picker of its own: the next pick goes through a new one.
     * It is made now, before the player's next click, so that click counts for it too. Frames are never removed:
     * a folder picked through one belongs to it.
     */
    #pickerStuck(): void {
        this.#picking = false;

        const frame = document.createElement('iframe');
        frame.style.display = 'none';
        frame.setAttribute('aria-hidden', 'true');
        document.body.appendChild(frame);
        this.#pickerFrame = frame;

        const text = 'That folder can\'t be used: Downloads, Documents and the Desktop themselves are refused. Press "Choose folder" again and pick or create a folder inside one of them';
        HSUI.Notify(text, { notificationType: 'warning' });
        HSLogger.warn(`Timed save export: ${text}`, this.context);
    }

    /** "Forget folder" button. The files already written stay where they are. */
    async forgetFolder(): Promise<void> {
        if (this.#folderState === 'none') {
            HSUI.Notify('No export folder is set');
            return;
        }

        this.#folder = undefined;
        this.#folderState = 'none';
        this.#files = [];
        this.#noticesShown.clear();
        try {
            await this.#store.write('folder', undefined);
            await this.#store.write('files', undefined);
        } catch (error) {
            HSLogger.warn(`Timed save export: the export folder could not be forgotten (${error})`, this.context);
        }
        this.refreshButton();
        HSUI.Notify(this.isSteam()
            ? 'Export folder forgotten: no timed export until a folder is chosen'
            : 'Export folder forgotten: the timed export downloads its files as usual');
    }

    async load(): Promise<void> {
        const folder = await this.#store.read('folder');
        if (!isExportDirectoryHandle(folder)) return;

        const files = await this.#store.read('files');
        this.#files = Array.isArray(files) ? files.filter(name => typeof name === 'string') : [];
        this.#folder = folder;
        this.#folderState = await folder.queryPermission(FOLDER_ACCESS) === 'granted' ? 'ready' : 'locked';
    }

    /**
     * A remembered folder is given back by the browser at the player's first click or key press of a page load
     * (seen on Steam: no dialog; Chrome shows its own prompt). Asked once per page load, and only while the
     * setting is on.
     * Asked in the next task, once the click's own handlers have run: the click that turns the setting on
     * counts too (the browser accepts the request for a few seconds after an input).
     */
    onPlayerInput(e: Event): void {
        if (!e.isTrusted || this.#folderState !== 'locked') return;
        setTimeout(() => this.#askFolderBack(), 0);
    }

    #askFolderBack(): void {
        if (this.#folderState !== 'locked' || !this.isEnabled()) return;

        const folder = this.#folder;
        if (!folder) return;
        this.#folderState = 'asking';
        void (async () => {
            let granted = false;
            try {
                granted = await folder.requestPermission(FOLDER_ACCESS) === 'granted';
            } catch {
                // This input didn't count for the browser (some keys): the next one asks again
                if (this.#folder === folder) this.#folderState = 'locked';
                return;
            }
            if (this.#folder !== folder) return;
            this.#folderState = granted ? 'ready' : 'refused';
            this.refreshButton();
            if (!granted) this.#notifyOnce('refused', 'Timed save export: access to the export folder was not given. Choose the folder again, or forget it (Save settings)');
        })();
    }

    async writeSave(gameFileName: string, save: string): Promise<void> {
        const folder = this.#folder;
        let fileName = HSAutoExportFolder.#cleanFileName(gameFileName) || `Synergism-${Date.now()}.txt`;
        try {
            if (!folder) throw new Error('No export folder is set');
            let file: HSExportFileHandle;
            try {
                file = await folder.getFileHandle(fileName, { create: true });
            } catch (error) {
                // A name the browser refuses (TypeError): the mod's own name
                if ((error as Error)?.name !== 'TypeError') throw error;
                fileName = `Synergism-${Date.now()}.txt`;
                file = await folder.getFileHandle(fileName, { create: true });
            }
            const writable = await file.createWritable();
            await writable.write(save);
            await writable.close();
        } catch (error) {
            // Folder removed or renamed, access taken back
            if (this.#folder === folder && (error as Error)?.name === 'NotAllowedError') this.#folderState = 'locked';
            const isSteam = this.isSteam();
            HSUI.Notify(isSteam
                ? 'Timed save export: could not write into the export folder (the rewards were collected). Choose the folder again (Save settings)'
                : 'Timed save export: could not write into the export folder, the file is downloaded instead', { notificationType: 'warning' });
            HSLogger.warn(`Timed save export: could not write "${fileName}" into the export folder (${error})`, this.context);
            if (!isSteam) this.#download(fileName, save);
            this.refreshButton();
            return;
        }

        HSLogger.log(`Timed save export: "${fileName}" written into "${folder.name}"`, this.context);
        if (this.#folder !== folder) return;

        this.#files = this.#files.filter(name => name !== fileName);
        this.#files.push(fileName);
        await this.#removeOldFiles(folder);
        try {
            await this.#store.write('files', this.#files);
        } catch (error) {
            HSLogger.warn(`Timed save export: the list of written files could not be saved (${error})`, this.context);
        }
    }

    /**
     * The game's file name follows a pattern typed by the player, and a download lets the browser replace what a
     * file name can't hold. Written by the mod, the name has to be clean already.
     */
    static #cleanFileName(name: string): string {
        let cleaned = '';
        for (const char of name) {
            cleaned += char.charCodeAt(0) < 32 || '<>:"/\\|?*'.includes(char) ? '_' : char;
        }
        // Windows refuses a name ending with a dot or a space
        return cleaned.trim().replace(/[. ]+$/, '');
    }

    /** Only files this module wrote are removed: the folder can hold anything else. */
    async #removeOldFiles(folder: HSExportDirectoryHandle): Promise<void> {
        const setting = HSSettings.getSetting('autoExportSaveKeep') as HSSetting<number> | undefined;
        const keep = Math.floor(Number(setting?.getValue()));
        if (!setting?.isEnabled() || !Number.isFinite(keep) || keep < 1) {
            // Not removed, only no longer remembered
            if (this.#files.length > MAX_TRACKED_FILES) this.#files.splice(0, this.#files.length - MAX_TRACKED_FILES);
            return;
        }

        let removed = 0;
        while (this.#files.length > keep) {
            const fileName = this.#files.shift()!;
            try {
                await folder.removeEntry(fileName);
                removed++;
            } catch (error) {
                // NotFoundError: already removed or renamed by the player
                if ((error as Error)?.name !== 'NotFoundError') {
                    HSLogger.warn(`Timed save export: could not remove "${fileName}" (${error})`, this.context);
                }
            }
        }
        if (removed > 0) HSLogger.log(`Timed save export: ${removed} older file${removed === 1 ? '' : 's'} removed (the last ${keep} are kept)`, this.context);
    }

    /** A plain download, as the game does it. */
    #download(fileName: string, save: string): void {
        const link = document.createElement('a');
        link.setAttribute('href', `data:text/plain;charset=utf-8,${save}`);
        link.setAttribute('download', fileName);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    /** The button shows the folder. The settings panel is built after the modules: refreshed at each tick too. */
    refreshButton(): void {
        const button = document.getElementById(FOLDER_BUTTON_ID);
        if (!button) return;

        // Its help text, set by the settings panel
        if (this.#folderButtonHelp === undefined) this.#folderButtonHelp = button.title;

        // The state comes first: the button's width cuts a long text at its end
        let text = FOLDER_BUTTON_TEXT;
        let title = this.#folderButtonHelp;
        if (this.#folder) {
            const name = this.#folder.name;
            text = `Folder: ${name}`;
            title = `Export folder: ${name}`;
            // With the setting off, nothing is asked: the folder is only shown
            if ((this.#folderState === 'locked' || this.#folderState === 'asking') && this.isEnabled()) {
                text = `Waiting for a click: ${name}`;
                title += '. Given back at your first click or key press in the game.';
            } else if (this.#folderState === 'refused') {
                text = `No access: ${name}`;
                title += '. Access was not given: choose the folder again.';
            }
        }
        if (button.textContent !== text) {
            button.textContent = text;
            button.title = title;
        }
    }

}
