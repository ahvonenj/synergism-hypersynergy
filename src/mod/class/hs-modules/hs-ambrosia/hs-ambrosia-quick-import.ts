import { HSElementHooker } from "../../hs-core/hs-elementhooker";
import { HSGlobal } from "../../hs-core/hs-global";
import { HSLogger } from "../../hs-core/hs-logger";
import { HSModuleRegistry } from "../../hs-core/module/hs-module-registry";
import { HSUI } from "../../hs-core/hs-ui";
import { HSUtils } from "../../hs-utils/hs-utils";
import { HSGameDialogs } from "../../hs-core/dialogs/hs-game-dialogs";

import { HSAmbrosiaHelper } from "./hs-ambrosia-helper";
import type { HSAmbrosiaSlots } from "./hs-ambrosia-parts";

interface HSQuickImportSummary {
    importedCount: number;
    skippedCount: number;
    failures: { index: number; reason: string }[];
}

/**
 * Class: HSAmbrosiaQuickImport
 * IsExplicitHSModule: No
 * Description:
 *     Created by HSAmbrosia. The Quick Import button next to the game's tree import: one to 16 loadouts from the
 *     clipboard, one line each. One line goes into the slot shown as loaded, several into slots 1 to 16. Also the
 *     heater's import of one loadout (importLoadoutToActiveSlot). With the patched game, written straight into the
 *     save; without it (bookmarklet), through the game's tree import and its dialogs.
 * Author: Swiffy, XxMolkxX, Shewchou
 */
export class HSAmbrosiaQuickImport {
    #context: string;
    #slots: HSAmbrosiaSlots;

    // Import through the game's dialogs (no exposedPlayer): up to 16 lines, each waiting up to ~1.5 s for its dialogs
    static readonly #GAME_IMPORT_TIME_LIMIT_MS = 120000;
    // A single loadout goes into the slot shown as loaded (HSAmbrosiaSlots.shown): refused when none is shown
    static readonly #NO_ACTIVE_LOADOUT_REASON = 'No active loadout: load a loadout first';

    // The game includes every Ambrosia module in its blueberry-tree export.
    // Older Heater/clipboard loadouts may omit keys, so the quick importer
    // fills any missing module with level zero before handing it to the game.
    static readonly #quickImportAmbrosiaKeys = [
        'ambrosiaTutorial',
        'ambrosiaQuarks1',
        'ambrosiaCubes1',
        'ambrosiaLuck1',
        'ambrosiaQuarkCube1',
        'ambrosiaLuckCube1',
        'ambrosiaCubeQuark1',
        'ambrosiaLuckQuark1',
        'ambrosiaCubeLuck1',
        'ambrosiaQuarkLuck1',
        'ambrosiaQuarks2',
        'ambrosiaCubes2',
        'ambrosiaLuck2',
        'ambrosiaQuarks3',
        'ambrosiaQuarks4',
        'ambrosiaCubes3',
        'ambrosiaCubes4',
        'ambrosiaFreeCubeUpgrades',
        'ambrosiaLuck3',
        'ambrosiaLuck4',
        'ambrosiaPatreon',
        'ambrosiaObtainium1',
        'ambrosiaOffering1',
        'ambrosiaHyperflux',
        'ambrosiaBaseOffering1',
        'ambrosiaBaseObtainium1',
        'ambrosiaBaseOffering2',
        'ambrosiaBaseObtainium2',
        'ambrosiaFreeObtainiumUpgrades',
        'ambrosiaFreeOfferingUpgrades',
        'ambrosiaSingReduction1',
        'ambrosiaInfiniteShopUpgrades1',
        'ambrosiaInfiniteShopUpgrades2',
        'ambrosiaInfiniteShopUpgrades3',
        'ambrosiaSingReduction2',
        'ambrosiaTalismanBonusRuneLevel',
        'ambrosiaRuneOOMBonus',
        'ambrosiaBrickOfLead',
        'ambrosiaFreeLuckUpgrades',
        'ambrosiaFreeGenerationUpgrades',
        'ambrosiaFreeRedLuckUpgrades',
        'ambrosiaFreeQuarkUpgrades',
        'twoMind',
    ] as const;

    constructor(context: string, slots: HSAmbrosiaSlots) {
        this.#context = context;
        this.#slots = slots;
    }

    static #normalizeQuickImportLoadout(line: string): string {
        try {
            const parsed = JSON.parse(line) as unknown;
            if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return line;

            const normalized = { ...(parsed as Record<string, unknown>) };
            for (const key of HSAmbrosiaQuickImport.#quickImportAmbrosiaKeys) {
                normalized[key] ??= 0;
            }
            return JSON.stringify(normalized);
        } catch {
            // Let the game's importer produce its normal invalid-file error.
            return line;
        }
    }

    /** Adds the Quick Import button after the game's import button. */
    async init(): Promise<void> {
        const importBtn = await HSElementHooker.HookElement<HTMLButtonElement>('#importBlueberriesButton');
        if (!importBtn) return;

        if (document.getElementById('hs-ambrosia-extra-btn')) return;

        const btn = document.createElement('button');
        btn.id = 'hs-ambrosia-extra-btn';
        btn.className = 'ambrosiaLoadoutBtn';
        btn.textContent = 'Quick Import';

        importBtn.parentElement?.insertBefore(
            btn,
            importBtn.nextSibling
        );

        btn.addEventListener('click', () => this.#handleQuickImport());
    }

    async #handleQuickImport() {
        let text: string | undefined;
        try {
            text = await navigator.clipboard.readText();
            // clipboard length hidden

            if (!text || typeof text !== 'string') {
                HSUI.Notify('Clipboard does not contain valid loadout data', {
                    notificationType: 'warning'
                });
                return;
            }

            // Split clipboard by lines
            const lines = text.split(/\r?\n|\r/g).map(line => line.trim());

            // Validate we have between 1 and 16 loadouts
            if (lines.length === 0 || lines.length > 16) {
                HSUI.Notify(`Invalid number of loadouts: ${lines.length}. Expected 1 - 16.`, {
                    notificationType: 'warning'
                });
                return;
            }

            const isSingleLoadout = lines.length === 1 || (lines.length === 2 && lines[1] === '');
            // Named in the notification: the shown slot can be a guess, a wrong one is seen at once
            const shownSlot = this.#slots.shown();
            const singleSlotNumber = isSingleLoadout && shownSlot ? HSAmbrosiaHelper.getSlotNumber(shownSlot) : undefined;
            let summary: HSQuickImportSummary;
            if (HSGlobal.exposedPlayer) {
                summary = this.#importLinesDirect(lines, isSingleLoadout);
            } else {
                if (this.#refuseGameImportDuringAutosing()) return;
                summary = await HSGameDialogs.run('quickImport', { timeLimitMs: HSAmbrosiaQuickImport.#GAME_IMPORT_TIME_LIMIT_MS },
                    () => this.#importLinesThroughGame(lines, isSingleLoadout));
            }
            const { importedCount, skippedCount, failures } = summary;

            // summary: imported/skipped/failed
            if (isSingleLoadout && importedCount === 0 && failures.length === 1) {
                // One line: its reason fits in the notification
                HSUI.Notify(`Quick Import failed: ${failures[0].reason}`, { notificationType: 'warning' });
            } else if (failures.length > 0) {
                const failureSummary = failures.map(f => `#${f.index}: ${f.reason}`).join('; ');
                // Short user-facing notification; detailed info logged for debugging
                HSUI.Notify(`Imported ${importedCount} loadout(s); ${failures.length} failed (see logs)`, { notificationType: 'warning' });
                HSLogger.debug(() => `Quick Import detailed failures: ${failureSummary}`, this.#context);
            } else if (isSingleLoadout && importedCount === 1 && singleSlotNumber !== undefined) {
                HSUI.Notify(`Loadout imported to slot ${singleSlotNumber}`, { notificationType: 'success' });
            } else {
                HSUI.Notify(`Imported ${importedCount} loadout(s), skipped ${skippedCount} empty slot(s)`, { notificationType: 'success' });
            }
        } catch (err: unknown) {
            const msg =
                err instanceof Error
                    ? err.message
                    : typeof err === 'string'
                        ? err
                        : 'Unknown error';

            HSLogger.error(`Quick Import failed: ${msg}`, this.#context, true);
            // Log detailed error context for debugging
            HSLogger.debug(() => `Quick Import exception message: ${msg}; clipboardLen=${text?.length ?? 'n/a'}`, this.#context);

            HSUI.Notify('Quick Import failed', { notificationType: 'error' });
        }
    }

    /**
     * With the patched game: writes each loadout straight into the save (player.blueberryLoadouts), as the game's
     * own save does. No dialog, no loadout mode switch, the live tree untouched, all in one synchronous step: safe
     * while autosing runs. Then loads the slot shown as loaded (HSAmbrosiaSlots.shown) if it was written, so the
     * live tree matches it and the game marks it.
     * One line goes into that slot; several go into slots 1 to 16, in order (empty lines skipped).
     */
    #importLinesDirect(lines: string[], isSingleLoadout: boolean): HSQuickImportSummary {
        const summary: HSQuickImportSummary = { importedCount: 0, skippedCount: 0, failures: [] };
        const shownSlot = this.#slots.shown();
        const shownSlotNumber = shownSlot ? HSAmbrosiaHelper.getSlotNumber(shownSlot) : undefined;
        let shownSlotWritten = false;

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            if (!line) {
                summary.skippedCount++;
                continue;
            }

            const slotNumber = isSingleLoadout ? shownSlotNumber : i + 1;
            const result = slotNumber === undefined
                ? { success: false, reason: HSAmbrosiaQuickImport.#NO_ACTIVE_LOADOUT_REASON }
                : this.#writeLoadout(slotNumber, line);
            if (!result.success) {
                summary.failures.push({ index: i + 1, reason: result.reason ?? 'Unknown error' });
                continue;
            }
            summary.importedCount++;
            if (slotNumber === shownSlotNumber) shownSlotWritten = true;
        }

        if (shownSlot && shownSlotWritten) this.#slots.load(shownSlot, 'quickImport');
        return summary;
    }

    /** Writes one loadout line into a slot of the save, once the game's own validation (patcher) accepts it. */
    #writeLoadout(slotNumber: number, line: string): { success: boolean; reason?: string } {
        const player = HSGlobal.exposedPlayer;
        if (!player) return { success: false, reason: 'Game not patched' };
        const slot = this.#slots.all().find(loadoutSlot => loadoutSlot.id === `blueberryLoadout${slotNumber}`);
        if (!slot || slot.style.display === 'none') return { success: false, reason: `Loadout ${slotNumber} is locked` };

        let tree: unknown;
        try {
            tree = JSON.parse(HSAmbrosiaQuickImport.#normalizeQuickImportLoadout(line));
        } catch {
            tree = undefined;
        }
        if (!tree || typeof tree !== 'object' || Array.isArray(tree)) return { success: false, reason: 'Not a loadout (invalid JSON)' };

        const validate = window.__HS_validateBlueberryTree;
        if (typeof validate === 'function') {
            if (!validate(tree)) {
                return { success: false, reason: 'Rejected by the game: locked upgrade, missing prerequisite, or not enough ambrosia or blueberries' };
            }
        } else {
            HSLogger.debug(() => `Quick Import: the game's tree validation is not patched, loadout ${slotNumber} written unchecked`, this.#context);
        }

        player.blueberryLoadouts[slotNumber] = tree;
        return { success: true };
    }

    /** Without the patched game, imports go through the game's import and loadout clicks: not while autosing runs. */
    #refuseGameImportDuringAutosing(): boolean {
        if (!HSModuleRegistry.getModule('HSAutosing')?.isAutosingActive()) return false;
        HSUI.Notify('Loadout import is unavailable while Auto-Sing runs (the game is not patched)', { notificationType: 'warning' });
        return true;
    }

    /**
     * Without the patched game (bookmarklet): imports each line through the game's tree import and reads its
     * result Alert, then saves it into its slot. Runs inside HSGameDialogs.run(), so hidden dialogs (the import's
     * success Alert, the overwrite Confirm) are left shown for it to read and answer. Several lines need SAVE mode: the game can't load an empty slot
     * (an empty tree is invalid), so load + quick save can't target one. Never while autosing runs: its loadout
     * switches would save into its slots.
     */
    async #importLinesThroughGame(lines: string[], isSingleLoadout: boolean): Promise<HSQuickImportSummary> {
        const summary: HSQuickImportSummary = { importedCount: 0, skippedCount: 0, failures: [] };
        // The slot to reload afterwards: the game's marker, else the one shown as loaded
        const previouslyActiveSlot = this.#slots.shown();
        try {
            const fileInput = document.getElementById('importBlueberries') as HTMLInputElement;
            if (!fileInput) { throw new Error('Import input element not found'); }

            // A single loadout goes through the game's quick save (no mode switch).
            // Several loadouts target arbitrary slots, which still needs SAVE mode.
            if (!isSingleLoadout) {
                HSAmbrosiaHelper.ensureLoadoutMode('saveTree');
            }

            for (let i = 0; i < lines.length; i++) {
                const loadoutData = lines[i];
                // Skip empty lines
                if (!loadoutData) {
                    summary.skippedCount++;
                    continue;
                }

                const result = isSingleLoadout
                    ? await this.#importLoadoutLineToActiveSlot(loadoutData)
                    : await this.#importLoadoutLine(loadoutData, i);

                if (result.skipped) {
                    summary.skippedCount++;
                    continue;
                }
                if (!result.success) {
                    summary.failures.push({ index: i + 1, reason: result.reason ?? 'Unknown error' });
                    continue;
                }

                summary.importedCount++;
            }
        } finally {
            HSAmbrosiaHelper.ensureLoadoutMode('loadTree');
            // The imports replaced the live tree: back to the loadout that was active (a refused or failed import changed nothing)
            if (previouslyActiveSlot && summary.importedCount > 0) this.#slots.load(previouslyActiveSlot, 'quickImport');
        }
        return summary;
    }

    async #importLoadoutLine(line: string, slotIndex: number): Promise<{ success: boolean; skipped?: boolean; reason?: string }> {
        const loadoutBtn = this.#slots.all()[slotIndex] as HTMLButtonElement | undefined;
        if (!loadoutBtn) {
            HSLogger.warn(`Loadout slot element for index ${slotIndex} not found`, this.#context);
            return { success: false, reason: 'Loadout slot element not found' };
        }

        const importResult = await this.#importTreeFromLine(line);
        if (!importResult.success) return importResult;

        // Import succeeded -> now click the loadout button to save into the slot
        loadoutBtn.click();
        await HSAmbrosiaQuickImport.#acceptOverwriteConfirm();

        return { success: true };
    }

    /**
     * Import a loadout into the slot shown as loaded (HSAmbrosiaSlots.shown), as with the patched game. The game's
     * import loads the tree, then it is saved into the slot, which the game then marks. With the game's own mark,
     * through #blueberryQuickSave, without touching the loadout mode. Without one (the quick save only saves into
     * the marked slot), or without the quick save button: SAVE mode and a click on the slot.
     * Refused when none is shown.
     */
    async #importLoadoutLineToActiveSlot(line: string): Promise<{ success: boolean; skipped?: boolean; reason?: string }> {
        const gameActiveSlot = this.#slots.gameActive();
        const targetSlot = this.#slots.shown();
        if (!targetSlot) return { success: false, reason: HSAmbrosiaQuickImport.#NO_ACTIVE_LOADOUT_REASON };
        const quickSaveBtn = document.getElementById('blueberryQuickSave') as HTMLButtonElement | null;

        if (!quickSaveBtn || targetSlot !== gameActiveSlot) {
            HSAmbrosiaHelper.ensureLoadoutMode('saveTree');
            try {
                return await this.#importLoadoutLine(line, this.#slots.all().indexOf(targetSlot));
            } finally {
                HSAmbrosiaHelper.ensureLoadoutMode('loadTree');
            }
        }

        const importResult = await this.#importTreeFromLine(line);
        if (!importResult.success) return importResult;

        quickSaveBtn.click();
        await HSAmbrosiaQuickImport.#acceptOverwriteConfirm();

        // No slot click happened, so sync our active loadout with the game's
        this.#slots.markLoaded(targetSlot);

        return { success: true };
    }

    /** Feed a loadout line to the game's tree import and wait for its result alert. */
    async #importTreeFromLine(line: string): Promise<{ success: boolean; reason?: string }> {
        const fileInput = document.getElementById('importBlueberries') as HTMLInputElement | null;
        if (!fileInput) {
            throw new Error('Import input element not found');
        }

        // Resolved before the import so the alert check below doesn't wait on a fetch
        const successText = await HSUtils.getGameTranslation('ambrosia.importTree.success');

        const normalizedLine = HSAmbrosiaQuickImport.#normalizeQuickImportLoadout(line);
        const blob = new Blob([normalizedLine], { type: 'application/json' });
        const file = new File([blob], 'quick-import.json', { type: 'application/json' });
        const dataTransfer = new DataTransfer();
        dataTransfer.items.add(file);
        fileInput.files = dataTransfer.files;
        // file input set and dispatched

        const event = new Event('change', { bubbles: true });
        fileInput.dispatchEvent(event);

        // Wait for the import alert (the game shows an alert after file selection).
        // If the alert appears but its content is empty, poll a bit longer for text to materialize.
        let alertText = '';
        for (let attempt = 0; attempt < 50; attempt++) {
            const alertWrapper = document.getElementById('alertWrapper');
            if (alertWrapper && alertWrapper.style.display === 'block') {
                for (let inner = 0; inner < 40; inner++) {
                    await HSUtils.sleep(5);
                    const scroll = alertWrapper.querySelector('.scrollbar');
                    const candidate = (scroll && scroll.textContent)
                        ? scroll.textContent.trim()
                        : (alertWrapper.textContent || '').trim();
                    if (candidate.length > 0) {
                        alertText = candidate;
                        break;
                    }
                }

                const okAlert = document.getElementById('ok_alert') as HTMLButtonElement | null;
                if (okAlert) {
                    okAlert.click();
                }

                for (let clearWait = 0; clearWait < 20; clearWait++) {
                    await HSUtils.sleep(5);
                    const currentAlertWrapper = document.getElementById('alertWrapper');
                    if (!currentAlertWrapper || currentAlertWrapper.style.display !== 'block') {
                        break;
                    }
                    const retryOkAlert = document.getElementById('ok_alert') as HTMLButtonElement | null;
                    if (retryOkAlert) retryOkAlert.click();
                }
                break;
            }
            await HSUtils.sleep(5);
        }

        // Match the game's success message in the player's language (English kept as fallback)
        const normalizedAlert = alertText.toLowerCase();
        const isSuccess = [successText, 'Tree successfully imported']
            .some(text => !!text && normalizedAlert.includes(text.trim().toLowerCase()));
        if (!isSuccess) {
            try {
                // Clear the file input to avoid residual state
                fileInput.files = new DataTransfer().files;
            } catch { /* ignore */ }
            return { success: false, reason: alertText || 'Unknown error' };
        }

        // The game applied the imported tree (no slot click involved)
        this.#slots.treeChanged();

        return { success: true };
    }

    /** Wait for the game's overwrite confirm dialog and click OK; keep clicking until dismissed. */
    static async #acceptOverwriteConfirm(): Promise<void> {
        for (let attempt = 0; attempt < 50; attempt++) {
            const confirmWrapper = document.getElementById('confirmWrapper');
            if (confirmWrapper && confirmWrapper.style.display === 'block') {
                const okConfirm = document.getElementById('ok_confirm') as HTMLButtonElement | null;
                if (okConfirm) {
                    okConfirm.click();
                }

                for (let clearWait = 0; clearWait < 20; clearWait++) {
                    await HSUtils.sleep(5);
                    const currentConfirmWrapper = document.getElementById('confirmWrapper');
                    if (!currentConfirmWrapper || currentConfirmWrapper.style.display !== 'block') {
                        break;
                    }
                    const retryOkConfirm = document.getElementById('ok_confirm') as HTMLButtonElement | null;
                    if (retryOkConfirm) retryOkConfirm.click();
                }
                break;
            }
            await HSUtils.sleep(5);
        }
    }

    /** The heater's import of one loadout, into the slot shown as loaded. */
    async importLoadoutToActiveSlot(loadout: string): Promise<{ success: boolean; skipped?: boolean; reason?: string }> {
        try {
            let result: { success: boolean; skipped?: boolean; reason?: string };
            // Named in the notification: the shown slot can be a guess, a wrong one is seen at once
            const shownSlot = this.#slots.shown();
            const slotNumber = shownSlot ? HSAmbrosiaHelper.getSlotNumber(shownSlot) : undefined;
            if (HSGlobal.exposedPlayer) {
                const summary = this.#importLinesDirect([loadout.trim()], true);
                result = summary.importedCount > 0
                    ? { success: true }
                    : { success: false, reason: summary.failures[0]?.reason ?? 'Empty loadout' };
            } else {
                if (this.#refuseGameImportDuringAutosing()) return { success: false, reason: 'Auto-Sing is running' };
                result = await HSGameDialogs.run('quickImport', { timeLimitMs: HSAmbrosiaQuickImport.#GAME_IMPORT_TIME_LIMIT_MS },
                    () => this.#importLoadoutLineToActiveSlot(loadout));
            }
            if (!result.success) {
                HSLogger.warn(`importLoadoutToActiveSlot failed: ${JSON.stringify({ source: 'importLoadoutToActiveSlot', reason: result.reason })}`, this.#context);
                HSUI.Notify(`Failed to import loadout${result.reason ? `: ${result.reason}` : ''}`, { position: 'top', notificationType: 'error' });
                return result;
            }

            HSUI.Notify(slotNumber !== undefined ? `Loadout imported to slot ${slotNumber}.` : 'Loadout imported.', { position: 'top', notificationType: 'success' });
            return result;
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            HSLogger.error(`importLoadoutToActiveSlot exception: ${JSON.stringify({ source: 'importLoadoutToActiveSlot', loadoutPreview: loadout.slice(0, 180) })} ${message}`, this.#context);
            HSUI.Notify('Failed to import loadout.', { position: 'top', notificationType: 'error' });
            return { success: false, reason: message };
        }
    }
}
