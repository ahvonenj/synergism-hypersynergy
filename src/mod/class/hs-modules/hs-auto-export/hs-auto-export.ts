import { HSModuleOptions } from "../../../types/hs-types";
import { HSSetting } from "../../hs-core/settings/hs-setting";
import { HSPlatform } from "../../hs-core/hs-platform";
import { HSGlobal } from "../../hs-core/hs-global";
import { HSLogger } from "../../hs-core/hs-logger";
import { HSModule } from "../../hs-core/module/hs-module";
import { HSModuleManager } from "../../hs-core/module/hs-module-manager";
import { HSSettings } from "../../hs-core/settings/hs-settings";
import type { HSAmbrosia } from "../hs-ambrosia/hs-ambrosia";
import type { HSAutosing } from "../hs-autosing/hs-autosing";
import { HSAutoExportFolder } from "./hs-auto-export-folder";

const TICK_MS = 10_000;
const MINUTE_MS = 60_000;

/**
 * Class: HSAutoExport
 * IsExplicitHSModule: Yes
 * Description:
 *     The "Export the save every X minutes" setting.
 *     Clicks the game's own Export button once the last export is older than the duration, so the export
 *     rewards (quarks, golden quarks) are given and the file is the game's own.
 *     The clock is the game's lastExportedSave: an export by hand restarts it, a reload doesn't.
 *     An ambrosia loadout can be loaded for the export, the player's tree is put back right after
 *     (the rewards are computed inside the click).
 *     Skipped while Auto-Sing is active (it exports for its quarks, with its own loadout), and while the
 *     offline popup is open.
 *     Export folder (File System Access API, not in Firefox): the player picks a folder once, and the mod
 *     writes the file there itself, in place of the game's download. It is the only way on Steam, where
 *     every download opens a "Save as" dialog. The folder is kept in IndexedDB with the names of the files
 *     written, so that only those are ever removed ("Keep only the last X files").
 * Author: Shewchou
 */
export class HSAutoExport extends HSModule {
    #loadedAt = Date.now();
    // Last export seen by the mod (its own, or a click on the game's button)
    #lastExportAt = 0;
    #exportFolder: HSAutoExportFolder;
    // The game's next download is the timed export's: it goes into the folder.
    #captureNextDownload = false;

    constructor(moduleOptions: HSModuleOptions) {
        super(moduleOptions);
        this.#exportFolder = new HSAutoExportFolder(this.context, () => this.#isSteam(), () => this.#isEnabled());
    }

    async init() {
        HSLogger.log(`Initializing HSAutoExport module`, this.context);

        try {
            await this.#exportFolder.load();
        } catch (error) {
            HSLogger.warn(`Timed save export: could not read the remembered export folder (${error})`, this.context);
        }

        // For players without the live player. Not the silent clicks that only expose the patched export function.
        document.getElementById('exportgame')?.addEventListener('click', () => {
            if (!window.__HS_SILENT_EXPORT) this.#lastExportAt = Date.now();
        });
        document.addEventListener('click', (e) => {
            this.#onDownloadClick(e);
            this.#exportFolder.onPlayerInput(e);
        }, true);
        document.addEventListener('keydown', (e) => this.#exportFolder.onPlayerInput(e), true);

        setInterval(() => {
            try {
                this.#exportFolder.refreshButton();
                this.#tick();
            } catch (error) {
                HSLogger.error(`Timed save export failed: ${error}`, this.context);
            }
        }, TICK_MS);

        this.isInitialized = true;
    }

    // ==============================================
    // ------------------ The clock ------------------
    // ==============================================

    #isEnabled(): boolean {
        return HSSettings.getSetting('autoExportSave')?.isEnabled() === true;
    }

    #isSteam(): boolean {
        return HSPlatform.get() === 'steam';
    }

    #tick(): void {
        const setting = HSSettings.getSetting('autoExportSave') as HSSetting<number> | undefined;
        if (!setting?.isEnabled()) return;

        const minutes = Number(setting.getValue());
        if (!Number.isFinite(minutes) || minutes <= 0) return;
        if (Date.now() - this.#lastExport() < minutes * MINUTE_MS) return;

        if (HSModuleManager.getModule<HSAutosing>('HSAutosing')?.isAutosingActive()) return;
        if (document.getElementById('offlineContainer')?.style.display === 'flex') return;

        if (!this.#exportFolder.canExport()) return;

        this.#export();
    }

    #lastExport(): number {
        const saved = Number(HSGlobal.exposedPlayer?.lastExportedSave);
        // Without the live player (bookmark load), counted from the page load. A date in the future
        // (a save from another clock) counts as never exported.
        const fromSave = Number.isFinite(saved) ? (saved > Date.now() ? 0 : saved) : this.#loadedAt;
        return Math.max(this.#lastExportAt, fromSave);
    }

    #export(): void {
        const exportButton = document.getElementById('exportgame');
        if (!exportButton) return;

        // Also when the export gives no file (the game refuses to save during a time warp): next try in a full duration
        this.#lastExportAt = Date.now();

        // A file even when the player exports to the clipboard: the box is unticked for this export.
        // The game reads it a few microtasks after the click, so it's ticked back in the next task.
        // Its stored preference is not touched (setting the property fires no event).
        const saveType = document.getElementById('saveType') as HTMLInputElement | null;
        const toClipboard = saveType?.checked === true;
        if (saveType && toClipboard) {
            saveType.checked = false;
            setTimeout(() => { saveType.checked = true; }, 0);
        }

        // The game's download comes in those same microtasks (#onDownloadClick)
        const intoFolder = this.#exportFolder.isReady;
        if (intoFolder) {
            this.#captureNextDownload = true;
            setTimeout(() => {
                if (!this.#captureNextDownload) return;
                this.#captureNextDownload = false;
                HSLogger.warn('Timed save export: the game gave no file (it refuses to save during a time warp)', this.context);
            }, 0);
        }

        const loadout = String(HSSettings.getSetting('autoExportSaveLoadout')?.getValue() ?? '');
        const ambrosia = HSModuleManager.getModule<HSAmbrosia>('HSAmbrosia');
        let note: string | undefined;
        if (loadout && ambrosia) {
            note = ambrosia.runWithLoadout(loadout, 'autoExport', () => exportButton.click());
        } else {
            exportButton.click();
        }

        if (note) HSLogger.log(`Timed save export done; ${note}`, this.context);
        else HSLogger.log(loadout ? `Timed save export done, with loadout ${loadout}` : 'Timed save export done', this.context);
    }

    // ==============================================
    // --------------- Export folder ----------------
    // ==============================================

    chooseFolder(): Promise<void> {
        return this.#exportFolder.chooseFolder();
    }

    forgetFolder(): Promise<void> {
        return this.#exportFolder.forgetFolder();
    }

    /** The game exports with a click on a link it builds, holding the file's name and the save. */
    #onDownloadClick(e: Event): void {
        if (!this.#captureNextDownload) return;
        const link = e.target;
        if (!(link instanceof HTMLAnchorElement) || link.id !== 'downloadSave') return;

        const href = link.getAttribute('href') ?? '';
        const comma = href.indexOf(',');
        if (!href.startsWith('data:') || comma < 0) return;

        this.#captureNextDownload = false;
        e.preventDefault();
        void this.#exportFolder.writeSave(link.getAttribute('download') ?? '', href.slice(comma + 1));
    }

}
