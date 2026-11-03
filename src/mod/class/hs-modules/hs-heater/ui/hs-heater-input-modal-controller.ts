import { HSModuleManager } from "../../../hs-core/module/hs-module-manager";
import { HSUI } from "../../../hs-core/hs-ui";
import { HSUIC } from "../../../hs-core/hs-ui-components";
import { HSGameDataAPI } from "../../../hs-core/gds/hs-gamedata-api";
import { HSHeatCancelledError, HSHeaterOptimizerRunner } from "../hs-heater-optimizer-runner";
import { HSUtils } from "../../../hs-utils/hs-utils";
import { HSHeaterUIStyles } from "./hs-heater-ui-styles";
import { HSHeaterUIInput } from "./hs-heater-ui-input";
import { HSHeaterResultStore } from "../hs-heater-result-store";
import { HSHeaterResultModalController } from "./hs-heater-result-modal-controller";
import { HSHeaterRedAmbrosiaModalController } from "./hs-heater-red-ambrosia-modal-controller";
import { HSHeaterUIResult } from "./hs-heater-ui-result";
import { HEATER_BEST_H_SEMANTIC_ID, resolveHeaterTypeLabel } from "../hs-heater-result-config";
import { escapeHtml, escapeLogText } from "../hs-heater-utils";
import { getHeaterTypeDropdownOptionsWithIcons } from "../hs-heater-icon-store";
import { HSSettings } from "../../../hs-core/settings/hs-settings";
import { HSSettingsUI } from "../../../hs-core/settings/hs-settings-ui";
import { HSLogger } from "../../../hs-core/hs-logger";
import { HSSettingsDefinition } from "../../../../types/module-types/hs-settings-types";
import type { HSAmbrosia } from "../../hs-ambrosia/hs-ambrosia";

export class HSHeaterInputModalController {
    static context = 'HSHeaterInputModalController';

    static currentInputsModalId: string | null = null;
    static #currentInputsModalObserver: MutationObserver | null = null;
    static #syncSettingsTooltipId = 'hs-heater-sync-settings-tooltip';
    // Down to the screen's bottom: the modal opens at y = 10
    static readonly #MAX_MODAL_HEIGHT = 'calc(100vh - 10px)';

    static #cachedInputsModal: HTMLElement | null = null;
    static #cachedTypeSelects: HTMLSelectElement[] = [];
    static #cachedTypeCheckboxes: HTMLInputElement[] = [];
    static #cachedTypeIcons: HTMLButtonElement[] = [];

    static #loadoutSettingPreferences: Partial<Record<keyof HSSettingsDefinition, { label: string; preferences: string[] }>> = {
        autosingEarlyCubeLoadout:           { label: 'Autosing Early Cube',     preferences: ["hyperflux:4", "hyperflux:5", "hyperflux:6", "hyperflux:7", HEATER_BEST_H_SEMANTIC_ID, "oct"] },
        autosingLateCubeLoadout:            { label: 'Autosing Late Cube',      preferences: ["cubes"] },
        autosingQuarkLoadout:               { label: 'Autosing Quark',          preferences: ["quarks"] },
        autosingObtLoadout:                 { label: 'Autosing Obt',            preferences: ["obt", "obtAndOff", "off"] },
        autosingOffLoadout:                 { label: 'Autosing Off',            preferences: ["off", "obtAndOff", "obt"] },
        autosingAmbrosiaLoadout:            { label: 'Autosing Amb',            preferences: ["allAmb"] },
        autoLoadoutAdd:                     { label: 'Auto-Loadout Add',        preferences: ["allAmb"] },
        autoLoadoutTime:                    { label: 'Auto-Loadout Time',       preferences: ["allAmb"] },
        autoExportSaveLoadout:              { label: 'Timed Export',            preferences: ["quarks"] },
    };


    // ================================================================
    // Modal lifecycle / entry point
    // ================================================================

    static async openHeaterComputationModal(): Promise<void> {
        const existingModal = this.getActiveInputsModal();
        if (existingModal) {
            this.focusInputsModal(existingModal);
            return;
        }

        const hsui = HSModuleManager.getModule<HSUI>('HSUI');
        if (!hsui) return;

        const dataModule = HSModuleManager.getModule<HSGameDataAPI>("HSGameDataAPI");
        if (!dataModule) return;

        const heaterData = await dataModule.dumpDataForHeater();
        if (!heaterData) return;

        const initialInput = HSHeaterUIInput.buildOptimizerInput(heaterData);

        HSHeaterUIStyles.ensureHeaterStylesInjected();

        const ambrosiaModule = HSModuleManager.getModule<HSAmbrosia>('HSAmbrosia');
        const loadoutsAmountRaw = ambrosiaModule?.getAmbrosiaLoadoutsAmount();
        const loadoutsAmount = Number.isInteger(loadoutsAmountRaw) && (loadoutsAmountRaw as number) > 0
            ? (loadoutsAmountRaw as number)
            : 8;

        const heaterTypeOptionsWithIcons = getHeaterTypeDropdownOptionsWithIcons();
        const heaterTypeOptions = heaterTypeOptionsWithIcons
            .map(({ semanticId, label }, index) => `<option value="${semanticId}"${index === 0 ? " selected" : ""}>${label}</option>`)
            .join('');

        const heaterTypeDropdownRows = Array.from({ length: loadoutsAmount }, (_, i) => {
            return `
                <div class="hs-heater-type-select-row">
                    <span class="hs-heater-type-select-loadout-label">L${i + 1}</span>
                    <button type="button" tabindex="-1" class="hs-heater-type-select-icon" aria-hidden="true"></button>
                    <select id="hs-heater-type-select-${i + 1}" class="hs-heater-type-select">${heaterTypeOptions}</select>
                    <input type="checkbox" class="hs-heater-type-select-checkbox" aria-label="Enable loadout ${i + 1}" />
                </div>
            `;
        }).join('');

        const heaterTypeDropdowns = `<div class="hs-heater-inputs-title">Your Loadout Order:</div>${heaterTypeDropdownRows}`;

        const content = `
            <div id="hs-heater-inputs-body-left" class="hs-scrollbar-themed">
                ${HSHeaterUIInput.buildInputTable(initialInput)}
            </div>
            <div id="hs-heater-inputs-body-right" class="hs-scrollbar-themed">
                <div>${HSUIC.Button({ id: 'hs-heater-update-inputs-btn', class: 'redButton',  text: 'Update 🔓 Inputs' })}</div>
                <div>${HSHeaterUIInput.buildHeaterOptionToggleGrid(initialInput.heaterOptions)}</div>
                <div class="hs-heater-start-row">${HSUIC.Button({ id: 'hs-heater-recalculate-btn',   class: 'redButton hs-heater-start-heater-tooltip-trigger', text: '🔥 Start Heater', styles: { cursor: 'help' } })}${HSUIC.Button({ id: 'hs-heater-cancel-btn', class: 'redButton', text: '✖', props: { title: 'Cancel this heat', hidden: '' } })}</div>
                ${this.#buildTwoWorkersCheckbox()}
                <div id="hs-heater-type-selects" class="hs-heater-type-selects-grid${loadoutsAmount > 9 ? ' hs-heater-type-selects-two-digits' : ''}">${heaterTypeDropdowns}</div>
                <div>${HSUIC.Button({ id: 'hs-heater-import-all-btn',    class: 'blueButton', text: 'Import All <span style="color: #338eef;">☑</span> Loadouts' })}</div>
                <div>${HSUIC.Button({ id: 'hs-heater-sync-icons-btn',    class: 'blueButton', text:   'Sync All Icons' })}</div>
                <div>${HSUIC.Button({ id: 'hs-heater-sync-settings-btn', class: 'blueButton hs-heater-sync-settings-tooltip-trigger', text: 'Sync All Loadout Settings', styles: { cursor: 'help' } })}</div>
            </div>
        `;

        const modalId = await hsui.Modal({
            title: 'Ambrosia Heater Inputs',
            htmlContent: content,
            headerClass: 'hs-heater-inputs-header',
            bodyClass: 'hs-heater-inputs-body',
            position: { x: 50, y: 10 },
            styles: {
                width: 'auto',
                height: this.#MAX_MODAL_HEIGHT,
            },
            onBeforeShow: (modal) => this.#fitHeightToRightColumn(modal),
        });

        this.currentInputsModalId = modalId;
        this.attachModalHandlers(modalId);
        HSHeaterResultModalController.reconnectToInputsModal(modalId);
    }


    // Shows the whole right column when the screen allows it; the left one scrolls
    static #fitHeightToRightColumn(modal: HTMLElement): void {
        const column = modal.querySelector<HTMLElement>('#hs-heater-inputs-body-right');
        if (!column) return;

        const chromeHeight = modal.offsetHeight - column.offsetHeight;
        column.style.alignSelf = 'flex-start';
        column.style.maxHeight = 'none';
        const contentHeight = column.scrollHeight;
        column.style.alignSelf = '';
        column.style.maxHeight = '';

        // Spare room: at a fractional display scale, rounding alone can bring a scrollbar
        modal.style.height = `min(${this.#MAX_MODAL_HEIGHT}, ${chromeHeight + contentHeight + 10}px)`;
    }


    // Without a worker the heat runs on the page, one group at a time: no checkbox
    static #buildTwoWorkersCheckbox(): string {
        const checked = HSSettings.getSetting('heaterTwoWorkers').getValue() === true ? ' checked' : '';
        const help = 'Heats in two workers at once, on two CPU cores: about 40% faster on late saves. '
            + 'The tab uses more memory during a heat: untick it if the game crashes or freezes while heating. '
            + 'A computer that reports under 8 GB of memory or fewer than 4 CPU threads heats in one worker anyway.';
        return `
            <label class="hs-heater-two-workers" title="${help}"${HSHeaterOptimizerRunner.canCancel ? '' : ' hidden'}>
                <input type="checkbox" id="hs-heater-two-workers"${checked} />
                Faster heat (2 workers) <span class="hs-heater-two-workers-help">?</span>
            </label>
        `;
    }


    // ================================================================
    // Cached DOM lookup helpers
    // ================================================================

    private static getActiveInputsModal(): HTMLElement | null {
        if (!this.currentInputsModalId) return null;
        if (this.#cachedInputsModal?.id === this.currentInputsModalId && this.#cachedInputsModal.isConnected) {
            return this.#cachedInputsModal;
        }

        const modal = document.getElementById(this.currentInputsModalId);
        if (!modal) {
            this.cleanupInputsModalState();
            return null;
        }

        this.cacheInputsModalElements(modal);
        return modal;
    }


    // ================================================================
    // Modal event wiring / action handlers
    // ================================================================

    private static attachModalHandlers(modalId: string): void {
        const modal = document.getElementById(modalId);
        if (!modal) return;

        this.cacheInputsModalElements(modal);
        HSHeaterUIInput.applyInputIconSprites(modal);
        HSHeaterUIInput.attachHeaterTypeSelectHandlers(modal, () => {
            if (this.currentInputsModalId) {
                HSHeaterResultModalController.refreshSelectedTypeHighlights(this.currentInputsModalId, false);
                const activeModal = this.getActiveInputsModal();
                if (activeModal) {
                    this.updateSyncSettingsButtonWarningState(activeModal);
                }
            }
        });
        HSHeaterUIInput.attachBranchCheckboxHandlers(modal);
        this.updateSyncSettingsButtonWarningState(modal);
        HSHeaterResultModalController.syncLoadoutAvailabilityState(modal);
        this.monitorInputsModalRemoval(modal);

        const updateInputsButton = modal.querySelector('#hs-heater-update-inputs-btn') as HTMLElement | null;
        updateInputsButton?.addEventListener('click', async () => {
            const originalText = updateInputsButton.textContent;
            updateInputsButton.textContent = `${originalText} ⏳`;
            updateInputsButton.style.pointerEvents = 'none';
            await HSUtils.waitForNextTack();

            try {
                const dataModule = HSModuleManager.getModule<HSGameDataAPI>("HSGameDataAPI");
                if (!dataModule) {
                    HSUI.Notify('Failed to update inputs because data module was unavailable.', { position: 'top', notificationType: 'error' });
                    return;
                }
                const heaterData = await dataModule.dumpDataForHeater();
                if (!heaterData) {
                    HSUI.Notify('Failed to update inputs because heater data could not be loaded.', { position: 'top', notificationType: 'error' });
                    return;
                }

                const updatedInput = HSHeaterUIInput.buildOptimizerInput(heaterData);
                HSHeaterUIInput.applyOptimizerInputToFields(modal, updatedInput, false);
                HSUI.Notify('Heater inputs updated.', { position: 'top', notificationType: 'success' });
            } finally {
                updateInputsButton.style.pointerEvents = '';
                if (originalText !== null) {
                    updateInputsButton.textContent = originalText;
                }
            }
        });

        const recalcButton = modal.querySelector('#hs-heater-recalculate-btn') as HTMLElement | null;
        if (recalcButton) {
            recalcButton.addEventListener('mouseenter', () => this.showStartHeaterTooltip(recalcButton));
            recalcButton.addEventListener('mouseleave', () => this.removeStartHeaterTooltip());
            recalcButton.addEventListener('focus', () => this.showStartHeaterTooltip(recalcButton));
            recalcButton.addEventListener('blur', () => this.removeStartHeaterTooltip());
        }

        const cancelButton = modal.querySelector('#hs-heater-cancel-btn') as HTMLElement | null;
        cancelButton?.addEventListener('click', () => HSHeaterOptimizerRunner.cancel());

        const twoWorkersCheckbox = modal.querySelector<HTMLInputElement>('#hs-heater-two-workers');
        twoWorkersCheckbox?.addEventListener('change', () => {
            HSSettings.getSetting('heaterTwoWorkers').setValue(twoWorkersCheckbox.checked);
            HSSettings.saveSettingsToStorage();
        });

        recalcButton?.addEventListener('click', async () => {
            const branchCheckboxes = Array.from(modal.querySelectorAll<HTMLInputElement>('.hs-heater-active-checkbox'));
            const hasActiveBranch = branchCheckboxes.some((checkbox) => checkbox.checked);
            if (!hasActiveBranch) { HSUI.Notify('Tick at least one line in Loadouts to heat before starting the heater.', { position: 'top', notificationType: 'warning' }); return; }

            const originalText = recalcButton.textContent;
            recalcButton.style.pointerEvents = 'none';
            document.body.style.cursor = 'wait';
            // Elapsed time, and the worker group when there are several, with
            // an icon that heats up with the time.
            // It only ticks while a worker runs: without one the page is frozen.
            const startedAt = performance.now();
            let progress = '';
            const showElapsed = () => {
                const seconds = Math.floor((performance.now() - startedAt) / 1000);
                const icon = seconds >= 120 ? '🥵' : seconds >= 90 ? '🤒' : seconds >= 60 ? '😵' : '🌡️';
                recalcButton.textContent = `🔥 Heating${progress}... ⏳ ${seconds}s ${icon}`;
            };
            showElapsed();
            const elapsedTimer = setInterval(showElapsed, 1000);
            await HSUtils.waitForNextTack();

            try {
                const updatedInput = HSHeaterUIInput.readInputValues(modal);
                if (!Number.isFinite(updatedInput.blueBarRequirementBeforeRounding)
                    || updatedInput.blueBarRequirementBeforeRounding <= 0) {
                    HSUI.Notify('Blue bar pre-round requirement is missing. Re-export current game data for Heater.', {
                        position: 'top', notificationType: 'error'
                    });
                    return;
                }
                // Cancel is only offered while the optimizer itself runs
                if (cancelButton) cancelButton.hidden = !HSHeaterOptimizerRunner.canCancel;
                let updatedResult;
                try {
                    updatedResult = await HSHeaterOptimizerRunner.createResult(updatedInput, (group, groupCount) => {
                        progress = groupCount > 1 ? ` ${group}/${groupCount}` : '';
                        showElapsed();
                    }, twoWorkersCheckbox?.checked ?? false);
                } finally {
                    if (cancelButton) cancelButton.hidden = true;
                }
                await HSHeaterResultModalController.openHeaterResultModal(updatedResult, modalId);
                await HSHeaterRedAmbrosiaModalController.openRedAmbrosiaUpgradeModal();
            } catch (error) {
                if (error instanceof HSHeatCancelledError) return;
                const memoryLimit = error instanceof Error && error.message.includes('memory safety limit');
                HSUI.Notify(memoryLimit
                    ? 'Heater stopped before exceeding its memory limit. Try fewer builds at once.'
                    : 'Heater could not finish. Check the Log tab for details.', {
                    position: 'top', notificationType: 'error'
                });
                // The log tab renders a line as HTML, and a stack trace can hold "<anonymous>"
                const details = error instanceof Error ? error.stack ?? error.message : String(error);
                HSLogger.error(`Heater calculation failed: ${escapeLogText(details)}`, 'HSHeater');
            } finally {
                clearInterval(elapsedTimer);
                recalcButton.style.pointerEvents = '';
                document.body.style.cursor = '';
                if (originalText !== null) {
                    recalcButton.textContent = originalText;
                }
            }
        });

        const importAllButton = modal.querySelector('#hs-heater-import-all-btn') as HTMLElement | null;
        importAllButton?.addEventListener('click', async () => {
            importAllButton.style.pointerEvents = 'none';
            await HSUtils.waitForNextTack();

            try {
                const normalizedResult = HSHeaterResultStore.getCurrentNormalizedResult();
                if (!normalizedResult) { HSUI.Notify('Start heating first...', { position: 'top', notificationType: 'warning' }); return; }

                const typeSelects = this.#cachedTypeSelects.length ? this.#cachedTypeSelects : Array.from(modal.querySelectorAll('.hs-heater-type-select')) as HTMLSelectElement[];
                const typeCheckboxes = this.#cachedTypeCheckboxes.length ? this.#cachedTypeCheckboxes : Array.from(modal.querySelectorAll('.hs-heater-type-select-checkbox')) as HTMLInputElement[];
                const selectedSemanticIds = typeSelects.map(select => select.value ?? 'none');

                const loadoutJsons: string[] = [];
                const unaffordable: string[] = [];
                const bestHPicks: string[] = [];
                // "Best H" follows the live P4x4: read once, so every slot gets the same row
                const bestHPick = HSHeaterResultStore.getBestHyperfluxPick();
                for (let index = 0; index < selectedSemanticIds.length; index++) {
                    const semanticId = selectedSemanticIds[index];
                    const isEnabled = typeCheckboxes[index]?.checked ?? true;

                    if (!isEnabled || semanticId === 'none') {
                        loadoutJsons.push('');
                        continue;
                    }

                    const isBestH = semanticId === HEATER_BEST_H_SEMANTIC_ID;
                    const rowId = isBestH && bestHPick ? bestHPick.semanticId : semanticId;
                    const label = resolveHeaterTypeLabel(rowId) ?? rowId;

                    // An unaffordable type has no loadout: its slot is left as it is.
                    // Its checkbox is unticked after a heat, so this is one the player ticked again.
                    if (HSHeaterResultStore.isSemanticIdUnaffordable(rowId)) {
                        unaffordable.push(`L${index + 1}: ${label}`);
                        loadoutJsons.push('');
                        continue;
                    }

                    if (isBestH && bestHPick) {
                        bestHPicks.push(`L${index + 1}: ${label}`);
                    } else if (isBestH) {
                        HSUI.Notify(`L${index + 1}: no Best H to import (Hyperflux not heated, or P4x4 unknown)`, { position: 'top', notificationType: 'warning' });
                        loadoutJsons.push('');
                        continue;
                    }

                    const loadout = HSHeaterResultStore.getLoadoutJsonBySemanticId(rowId);
                    if (loadout) {
                        loadoutJsons.push(loadout);
                    } else {
                        HSUI.Notify(`Failed to find loadout for "${semanticId}"`, { position: 'top', notificationType: 'warning' });
                        loadoutJsons.push('');
                    }
                }

                if (unaffordable.length > 0) {
                    const message = `Unaffordable, not imported: ${unaffordable.join(', ')}`;
                    HSUI.Notify(message, { position: 'top', notificationType: 'warning' });
                    HSLogger.warn(message, 'HSHeater');
                }

                if (bestHPicks.length > 0 && bestHPick) {
                    const message = `Best H at P4x4 ${bestHPick.p4x4}: ${bestHPicks.join(', ')}`;
                    HSUI.Notify(message, { position: 'top', notificationType: 'default' });
                    HSLogger.log(message, 'HSHeater');
                }

                const clipboardText = loadoutJsons.join('\n');
                await navigator.clipboard.writeText(clipboardText);
                HSUI.Notify('Loadouts copied to clipboard.', { position: 'top', notificationType: 'success' });

                const quickImportBtn = document.getElementById('hs-ambrosia-extra-btn') as HTMLElement | null;
                if (quickImportBtn) {
                    quickImportBtn.click();
                } else {
                    HSUI.Notify('Loadouts copied to clipboard, but ambrosia quick import button not found.', { position: 'top', notificationType: 'warning' });
                }
            } catch (error) {
                HSUI.Notify('Failed to import loadouts.', { position: 'top', notificationType: 'error' });
                console.error('Import all error:', error);
            } finally {
                importAllButton.style.pointerEvents = '';
            }
        });

        const syncIconsButton = modal.querySelector('#hs-heater-sync-icons-btn') as HTMLElement | null;
        syncIconsButton?.addEventListener('click', async () => {
            const ambrosiaModule = HSModuleManager.getModule<HSAmbrosia>('HSAmbrosia');
            if (!ambrosiaModule) return;

            const typeSelects = this.#cachedTypeSelects.length ? this.#cachedTypeSelects : Array.from(modal.querySelectorAll('.hs-heater-type-select')) as HTMLSelectElement[];
            const typeIcons = this.#cachedTypeIcons.length ? this.#cachedTypeIcons : Array.from(modal.querySelectorAll('.hs-heater-type-select-icon')) as HTMLButtonElement[];
            const loadoutsAmountRaw = ambrosiaModule.getAmbrosiaLoadoutsAmount();
            const maxAmbrosiaSlots = Number.isInteger(loadoutsAmountRaw) && loadoutsAmountRaw > 0
                ? loadoutsAmountRaw
                : Math.min(typeSelects.length, typeIcons.length);
            const syncCount = Math.min(typeSelects.length, typeIcons.length, maxAmbrosiaSlots);

            const iconSemanticBySlotId: Record<string, string | null> = {};

            for (let i = 0; i < syncCount; i++) {
                const slotId = `blueberryLoadout${i + 1}`;
                const select = typeSelects[i];

                if (!select) continue;

                const semanticId = (select.value || '').trim();
                iconSemanticBySlotId[slotId] = semanticId && semanticId !== 'none' ? semanticId : null;
            }

            const attemptedSlotCount = Object.keys(iconSemanticBySlotId).length;
            const result = ambrosiaModule.applyHeaterSlotIconSemanticsBulk(iconSemanticBySlotId);

            if (result.missingCount > 0) {
                HSUI.Notify(`Synced ${attemptedSlotCount} slot icons (${result.setCount} set, ${result.clearedCount} cleared). ${result.missingCount} icon(s) were missing.`, { position: 'top', notificationType: 'warning' });
                return;
            }

            HSUI.Notify(`Synced ${attemptedSlotCount} slot icons (${result.setCount} set, ${result.clearedCount} cleared).`, { position: 'top', notificationType: 'success' });
        });

        const syncSettingsButton = modal.querySelector('#hs-heater-sync-settings-btn') as HTMLElement | null;
        if (syncSettingsButton) {
            syncSettingsButton.addEventListener('mouseenter', () => this.showSyncSettingsTooltip(syncSettingsButton));
            syncSettingsButton.addEventListener('mouseleave', () => this.removeSyncSettingsTooltip());
            syncSettingsButton.addEventListener('focus', () => this.showSyncSettingsTooltip(syncSettingsButton));
            syncSettingsButton.addEventListener('blur',  () => this.removeSyncSettingsTooltip());

            syncSettingsButton.addEventListener('click', async () => {
                this.removeSyncSettingsTooltip();

                try {
                    const loadoutSlots = this.buildLoadoutSlotMap(modal);
                    HSLogger.info(
                        `Selected heater type loadouts for settings sync: ${Array.from(loadoutSlots.entries()).map(([semantic, slots]) => `${semantic}=${slots.join(',')}`).join('; ')}`,
                        this.context
                    );

                    const changedSettings: (keyof HSSettingsDefinition)[] = [];
                    const loadoutSettings = this.#loadoutSettingPreferences as Partial<Record<keyof HSSettingsDefinition, { label: string; preferences: string[] }>>;
                    for (const [settingName, config] of Object.entries(loadoutSettings) as Array<[keyof HSSettingsDefinition, { label: string; preferences: string[] }]>) {
                        const chosenValue = this.choosePreferredLoadoutValue(config.preferences, loadoutSlots);
                        if (chosenValue === '') {
                            HSLogger.warn(
                                `Sync settings fallback for ${settingName}: no selected loadout matched [${config.preferences.join(', ')}], applying None.`,
                                this.context
                            );
                        }
                        HSLogger.info(`Sync settings chosen value for ${settingName}: ${chosenValue}`, this.context);
                        const setting = HSSettings.getSetting(settingName);
                        setting.setValue(chosenValue);
                        changedSettings.push(settingName);
                    }

                    if (changedSettings.length > 0) {
                        HSSettingsUI.refreshSettingControls(changedSettings);
                    }
                    HSUI.Notify('Loadout settings synced successfully.', { position: 'top', notificationType: 'success' });
                } catch (error) {
                    HSUI.Notify('Failed to sync all settings.', { position: 'top', notificationType: 'error' });
                    console.error('Sync All Settings error:', error);
                }
            });
        }

        HSHeaterUIInput.attachInputLockHandlers(modal);

        modal.addEventListener('click', (event) => {
            const target = event.target as HTMLElement | null;
            if (!target) return;

            if (target.classList.contains('hs-heater-lock-button')) {
                const fieldKey = target.dataset.fieldKey;
                if (fieldKey) {
                    HSHeaterUIInput.toggleFieldLock(modal, fieldKey);
                }
            }
        });
    }


    // ================================================================
    // Loadout selection / settings sync helpers
    // ================================================================

    private static buildLoadoutSlotMap(modal: HTMLElement): Map<string, string[]> {
        const loadoutMap = new Map<string, string[]>();
        const typeSelects = this.#cachedTypeSelects.length ? this.#cachedTypeSelects : Array.from(modal.querySelectorAll('.hs-heater-type-select')) as HTMLSelectElement[];

        for (let index = 0; index < typeSelects.length; index++) {
            const select = typeSelects[index];
            const semanticId = (select.value || '').trim();
            if (!semanticId || semanticId === 'none') continue;

            const slotNumber = String(index + 1);
            const existingSlots = loadoutMap.get(semanticId);
            if (existingSlots) {
                existingSlots.push(slotNumber);
            } else {
                loadoutMap.set(semanticId, [slotNumber]);
            }
        }
        return loadoutMap;
    }

    private static choosePreferredLoadoutValue(preferences: string[], availableLoadouts: Map<string, string[]>): string {
        for (const preference of preferences) {
            const slots = availableLoadouts.get(preference);
            if (slots && slots.length > 0) {
                return slots[0];
            }
        }
        return '';
    }


    // ================================================================
    // Modal cleanup / lifecycle helpers
    // ================================================================

    private static monitorInputsModalRemoval(modal: HTMLElement): void {
        if (this.#currentInputsModalObserver) return;

        this.#currentInputsModalObserver = new MutationObserver(() => {
            const modalRootExists = this.#cachedInputsModal?.isConnected ?? !!(this.currentInputsModalId && document.getElementById(this.currentInputsModalId));
            if (!this.currentInputsModalId || !modalRootExists) {
                this.cleanupInputsModalState();
            }
        });

        this.#currentInputsModalObserver.observe(document.body, {
            childList: true,
            subtree: true,
        });
    }

    private static cleanupInputsModalState(): void {
        if (this.#currentInputsModalObserver) {
            this.#currentInputsModalObserver.disconnect();
            this.#currentInputsModalObserver = null;
        }

        HSHeaterUIInput.cleanupHeaterTypeSelectState();

        const resultModalExists = HSHeaterResultModalController.currentResultModalId
            ? document.getElementById(HSHeaterResultModalController.currentResultModalId) !== null
            : false;

        this.clearCachedInputsModalElements();
        this.currentInputsModalId = null;

        if (!resultModalExists) {
            HSHeaterResultStore.clearCurrentNormalizedResult();
        }
    }


    // ================================================================
    // Cached modal element helpers
    // ================================================================

    private static cacheInputsModalElements(modal: HTMLElement): void {
        this.#cachedInputsModal = modal;
        this.#cachedTypeSelects =    Array.from(modal.querySelectorAll('.hs-heater-type-select')) as HTMLSelectElement[];
        this.#cachedTypeCheckboxes = Array.from(modal.querySelectorAll('.hs-heater-type-select-checkbox')) as HTMLInputElement[];
        this.#cachedTypeIcons =      Array.from(modal.querySelectorAll('.hs-heater-type-select-icon')) as HTMLButtonElement[];
    }

    private static clearCachedInputsModalElements(): void {
        this.#cachedInputsModal = null;
        this.#cachedTypeSelects = [];
        this.#cachedTypeCheckboxes = [];
        this.#cachedTypeIcons = [];
    }

    private static focusInputsModal(modal: HTMLElement): void {
        modal.scrollIntoView({ behavior: 'smooth', block: 'center' });
        modal.setAttribute('tabindex', '-1');
        modal.focus();
    }

    
    // ================================================================
    // Sync helpers
    // ================================================================


    private static showSyncSettingsTooltip(trigger: HTMLElement): void {
        this.removeSyncSettingsTooltip();

        const modal = this.getActiveInputsModal();
        const tooltip = document.createElement('div');
        tooltip.id = this.#syncSettingsTooltipId;
        tooltip.innerHTML = this.getSyncSettingsTooltipHtml(modal);
        tooltip.style.zIndex = String(HSUI.getHighestActiveModalZIndex() + 1);

        document.body.appendChild(tooltip);
        HSHeaterUIResult.positionOverlayNearTarget(tooltip, trigger);
    }

    private static getSyncSettingsTooltipHtml(modal: HTMLElement | null): string {
        const loadoutSlots = modal ? this.buildLoadoutSlotMap(modal) : new Map<string, string[]>();

        const lines = Object.entries(this.#loadoutSettingPreferences)
            .map(([, config]) => this.getSyncSettingsTooltipLine(config, loadoutSlots));

        return `
            <span>Updates all your 'Loadout settings' based on the order below:</span><br>
            ${lines.join('<br>')}
        `;
    }

    private static getSyncSettingsTooltipLine(
        config: { label: string; preferences: string[] },
        loadoutSlots: Map<string, string[]>
    ): string {
        const selectedPreference = config.preferences.find((preference) => loadoutSlots.has(preference)) ?? '';
        const preferenceHtml = config.preferences
            .map((preference) => {
                const label = this.formatSyncPreferenceLabel(preference);
                const preferenceClass = preference === selectedPreference
                    ? 'hs-heater-sync-settings-tooltip-selected'
                    : 'hs-heater-sync-settings-tooltip-unselected';
                return `<span class="${preferenceClass}">${label}</span>`;
            })
            .join(' > ');

        const keyClasses = selectedPreference === ''
            ? 'hs-heater-sync-settings-tooltip-key hs-heater-sync-settings-tooltip-key-none-selected'
            : 'hs-heater-sync-settings-tooltip-key';
        const noneTextClass = selectedPreference === ''
            ? 'hs-heater-sync-settings-tooltip-none-selected'
            : 'hs-heater-sync-settings-tooltip-unselected';
        return `
            <span><span class="${keyClasses}">${escapeHtml(config.label)}</span>: ${preferenceHtml} > <span class="${noneTextClass}">none</span></span>
        `;
    }

    private static updateSyncSettingsButtonWarningState(modal: HTMLElement): void {
        const syncSettingsButton = modal.querySelector('#hs-heater-sync-settings-btn') as HTMLElement | null;
        if (!syncSettingsButton) return;

        const loadoutSlots = this.buildLoadoutSlotMap(modal);
        const hasNoneSelected = Object.values(this.#loadoutSettingPreferences)
            .some((config) => !config.preferences.some((preference) => loadoutSlots.has(preference)));

        syncSettingsButton.classList.toggle('hs-heater-sync-settings-warning', hasNoneSelected);
    }

    private static formatSyncPreferenceLabel(preference: string): string {
        return escapeHtml(resolveHeaterTypeLabel(preference) ?? preference);
    }

    private static showStartHeaterTooltip(trigger: HTMLElement): void {
        this.removeStartHeaterTooltip();

        const tooltip = document.createElement('div');
        tooltip.id = 'hs-heater-start-heater-tooltip';
        tooltip.textContent = '⚠️ This can take a few seconds... ⚠️\n⚠️ And will take longer and longer the more amb you have ⚠️';
        tooltip.style.zIndex = String(HSUI.getHighestActiveModalZIndex() + 1);

        document.body.appendChild(tooltip);
        HSHeaterUIResult.positionOverlayNearTarget(tooltip, trigger, { placement: 'below' });
    }

    private static removeStartHeaterTooltip(): void {
        const existing = document.getElementById('hs-heater-start-heater-tooltip');
        if (existing && existing.parentElement) {
            existing.parentElement.removeChild(existing);
        }
    }

    private static removeSyncSettingsTooltip(): void {
        const existing = document.getElementById(this.#syncSettingsTooltipId);
        if (existing && existing.parentElement) {
            existing.parentElement.removeChild(existing);
        }
    }
}
