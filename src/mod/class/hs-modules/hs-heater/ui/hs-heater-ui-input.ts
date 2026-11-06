import Decimal from "break_infinity.js";
import { HSUIC } from "../../../hs-core/hs-ui-components";
import { HSSettings } from "../../../hs-core/settings/hs-settings";
import { HSIcons } from "../../../hs-utils/hs-icons";
import { HSUtils } from "../../../hs-utils/hs-utils";
import { escapeHtml } from "../hs-heater-utils";
import { getEffectiveHeaterIconSrc, subscribeHeaterIconOverrideChanges, unsubscribeHeaterIconOverrideChanges, HeaterIconOverrideChangeListener } from "../hs-heater-icon-store";
import { HSHeaterResultStore } from "../hs-heater-result-store";
import type { HeaterOptimizerInput } from "../../../../types/data-types/hs-heater-types";
import type { HeaterBranchDefinition, HeaterBranchId } from "../hs-heater-result-config";
import { HSInputType } from "../../../../types/module-types/hs-ui-types";
import {
    exportFieldExtractors,
    getHeaterExaltName,
    inputDefinitions,
    type HeaterInputBase,
    type HeaterInputField,
    type HeaterInputKey,
} from "../hs-heater-input-config";
import { getHeaterTypeBranchId, HEATER_BRANCH_DEFINITIONS } from "../hs-heater-result-config";

type HeaterInputValue = HeaterInputBase[HeaterInputKey];

export class HSHeaterUIInput {

    // ================================================================
    // Static Configuration / Constants
    // ================================================================

    static readonly inputDefinitions = inputDefinitions;
    static readonly exportFieldExtractors = exportFieldExtractors;
    static #lockHandlersAttachedModals = new WeakSet<HTMLElement>();
    static #optimizerMetadata: Pick<HeaterOptimizerInput,
        | 'ambrosiaUpgradeBonusLevels'
        | 'ambrosiaUpgradeBlueberryCostReductions'
        | 'runeSiBonusLevelsTalismanNoAmbrosia'
        | 'runeSiEffectiveLevelMultiplier'
        | 'shopUpgradeRawLevels'
        | 'shopBonusLevelsNoAmbrosia'
        | 'tauPower'
        | 'reactor'
        | 'purple'
        | 'coinsC15'> = {
            ambrosiaUpgradeBonusLevels: {},
            ambrosiaUpgradeBlueberryCostReductions: {},
            runeSiBonusLevelsTalismanNoAmbrosia: 0,
            runeSiEffectiveLevelMultiplier: 1,
            shopUpgradeRawLevels: {},
            shopBonusLevelsNoAmbrosia: {
                offering: 0,
                obtainium: 0,
                cubes: 0,
                speed: 0,
                quark: 0,
                ambrosiaLuck: 0,
                redAmbrosiaLuck: 0,
                ambrosiaGeneration: 0,
                infinity: 0,
            },
            tauPower: 1,
            reactor: undefined,
            purple: undefined,
            coinsC15: undefined,
        };
    // The Exalt of the save the inputs came from, null without export data
    static #exportExalt: number | null = null;
    // Purple Ambrosia unlocks with the first Exalt 9 completion, the same
    // condition as the "Taxman's Last Stand x1 Done" input
    static #purpleUnlocked = false;

    static #cachedTypeSelects: HTMLSelectElement[] = [];
    static #cachedTypeIcons: HTMLButtonElement[] = [];
    static #iconOverrideChangeListener: HeaterIconOverrideChangeListener | null = null;

    static buildOptimizerInput(exportData: any): HeaterOptimizerInput {
        const hsData = exportData?.hs_data;
        this.#optimizerMetadata = {
            ambrosiaUpgradeBonusLevels: hsData?.ambrosiaUpgradeBonusLevels ?? {},
            ambrosiaUpgradeBlueberryCostReductions: hsData?.ambrosiaUpgradeBlueberryCostReductions ?? {},
            runeSiBonusLevelsTalismanNoAmbrosia: Number(hsData?.runeSiBonusLevelsTalismanNoAmbrosia ?? 0),
            runeSiEffectiveLevelMultiplier: Number(hsData?.totalSIRunePowerMultiplier ?? 1),
            shopUpgradeRawLevels: hsData?.shopUpgradeRawLevels ?? {},
            shopBonusLevelsNoAmbrosia: hsData?.shopBonusLevelsNoAmbrosia ?? {
                offering: 0,
                obtainium: 0,
                cubes: 0,
                speed: 0,
                quark: 0,
                ambrosiaLuck: 0,
                redAmbrosiaLuck: 0,
                ambrosiaGeneration: 0,
                infinity: 0,
            },
            tauPower: hsData?.tauPower ?? 1,
            reactor: hsData?.heaterReactor,
            purple: hsData?.heaterPurple,
            coinsC15: hsData?.heaterCoinsC15,
        };
        this.#exportExalt = Number.isInteger(hsData?.exalt) ? hsData.exalt : null;
        this.#purpleUnlocked = Boolean(hsData?.exalt9Unlocked);
        return {
            ...this.buildInputBaseFromHeaterData(exportData),
            ...this.#optimizerMetadata,
            heaterOptions: Object.fromEntries(
                HEATER_BRANCH_DEFINITIONS.map((branch) => [
                    branch.id,
                    (branch.id !== 'purple' || this.#purpleUnlocked)
                        && (branch.id !== 'coinsC15' || Boolean(this.#optimizerMetadata.coinsC15))
                        && this.isBranchSavedTicked(branch),
                ])
            ) as Record<HeaterBranchId, boolean>,
        };
    }

    static buildInputBaseFromHeaterData(exportData: any): HeaterInputBase {
        const hsData = exportData?.hs_data;
        if (!hsData || typeof hsData !== 'object') {
            return this.mapFields((field) => this.parseFieldValueFromInputElement(field.type, null) as HeaterInputValue);
        }

        return this.mapFields((field) => this.extractFieldValueFromExportData(field, hsData));
    }

    static buildInputTable(input: HeaterOptimizerInput): string {
        const rows = this.inputDefinitions.map((field) => {
            const value = input[field.key] as number | Decimal | boolean;
            return this.buildInputTableRow(field, value);
        });

        return `
            <table class="hs-heater-input-table">
                <tbody>${rows.join('')}</tbody>
            </table>
        `;
    }

    static applyInputIconSprites(modal: HTMLElement): void {
        for (const field of this.inputDefinitions) {
            const icon = (field as HeaterInputField).icon;
            if (!icon) continue;
            const iconElement = modal.querySelector<HTMLElement>(`[data-heater-icon-key="${field.key}"]`);
            if (iconElement) {
                HSIcons.applyBackground(iconElement, icon, 18);
            }
        }
    }

    // The Purple checkbox is left out while Purple Ambrosia is locked (its
    // branch comes in as off); a missing checkbox reads as off.
    static buildHeaterOptionToggleGrid(active: Record<HeaterBranchId, boolean>): string {
        const checkboxRows = HEATER_BRANCH_DEFINITIONS.filter((branch) => branch.id !== 'purple' || this.#purpleUnlocked).map((branch) => {
            const fieldId = `hs-heater-input-active-${branch.id}`;
            const checked = active[branch.id] ? 'checked' : '';
            return `
                <label class="hs-heater-active-branch" data-branch-id="${branch.id}">
                    <input type="checkbox" id="${fieldId}" class="hs-heater-active-checkbox" ${checked} />
                    ${branch.label}${'labelNote' in branch ? ` <span class="hs-heater-active-branch-note">${branch.labelNote}</span>` : ''}
                </label>
            `;
        });

        return `
           <div class="hs-heater-active-header">
                <span class="hs-heater-inputs-title">Loadouts to heat:</span>
                <span class="hs-heater-active-bulk">
                    <button type="button" class="hs-heater-active-bulk-btn" data-branch-bulk="slots" title="Only what Your Loadout Order uses">☰</button>
                    <button type="button" class="hs-heater-active-bulk-btn" data-branch-bulk="all" title="Tick all">☑</button>
                    <button type="button" class="hs-heater-active-bulk-btn" data-branch-bulk="none" title="Untick all">☐</button>
                </span>
           </div>
           <div class="hs-heater-active-grid">
                ${checkboxRows.join('')}
            </div>
        `;
    }

    // Two lists, as most branches start ticked and a slow one (Obt + Off) starts unticked
    static getSavedBranchList(setting: 'heaterUncheckedBranches' | 'heaterTickedBranches'): string[] {
        const saved = HSSettings.getSetting(setting).getValue() as string[] | null;
        return Array.isArray(saved) ? saved : [];
    }

    static #startsUnticked(branch: HeaterBranchDefinition): boolean {
        return 'startsUnticked' in branch && branch.startsUnticked;
    }

    // Until the player changes it, a branch is ticked, or unticked if startsUnticked
    static isBranchSavedTicked(branch: HeaterBranchDefinition): boolean {
        return this.#startsUnticked(branch)
            ? this.getSavedBranchList('heaterTickedBranches').includes(branch.id)
            : !this.getSavedBranchList('heaterUncheckedBranches').includes(branch.id);
    }

    static attachBranchCheckboxHandlers(modal: HTMLElement): void {
        const checkboxes = Array.from(modal.querySelectorAll<HTMLInputElement>('.hs-heater-active-checkbox'));
        checkboxes.forEach((checkbox) => {
            checkbox.addEventListener('change', () => this.saveBranchTicks(modal));
        });

        // Only the checkboxes shown: a locked Purple is left alone
        modal.querySelectorAll<HTMLButtonElement>('.hs-heater-active-bulk-btn').forEach((button) => {
            button.addEventListener('click', () => {
                const mode = button.dataset.branchBulk;
                const slotBranches = new Set<string>();
                if (mode === 'slots') {
                    for (const semanticId of HSHeaterResultStore.collectSelectedSemanticIds(modal)) {
                        const branchId = getHeaterTypeBranchId(semanticId);
                        if (branchId) slotBranches.add(branchId);
                    }
                }
                for (const checkbox of checkboxes) {
                    const branchId = checkbox.id.replace('hs-heater-input-active-', '');
                    checkbox.checked = mode === 'all' || (mode === 'slots' && slotBranches.has(branchId));
                }
                this.saveBranchTicks(modal);
            });
        });
    }

    // Ticks the branch of the type a slot was just set to. Only that slot's:
    // the other slots' branches, like a tick at open, could only undo an
    // untick the player made.
    static tickBranchOfType(modal: HTMLElement, semanticId: string): void {
        const branchId = getHeaterTypeBranchId(semanticId);
        if (!branchId) return;
        // A missing checkbox is a locked branch (Purple)
        const checkbox = modal.querySelector<HTMLInputElement>(`#hs-heater-input-active-${branchId}`);
        if (!checkbox || checkbox.checked) return;
        checkbox.checked = true;
        this.saveBranchTicks(modal);
    }

    // A branch without a checkbox (locked Purple) keeps what was saved for it
    static saveBranchTicks(modal: HTMLElement): void {
        const ticked = new Set(HEATER_BRANCH_DEFINITIONS
            .filter((branch) => {
                const checkbox = modal.querySelector<HTMLInputElement>(`#hs-heater-input-active-${branch.id}`);
                return checkbox ? checkbox.checked : this.isBranchSavedTicked(branch);
            })
            .map((branch) => branch.id));
        const ids = (startsUnticked: boolean, isTicked: boolean) => HEATER_BRANCH_DEFINITIONS
            .filter((branch) => this.#startsUnticked(branch) === startsUnticked && ticked.has(branch.id) === isTicked)
            .map((branch) => branch.id);
        HSSettings.getSetting('heaterUncheckedBranches').setValue(ids(false, false));
        HSSettings.getSetting('heaterTickedBranches').setValue(ids(true, true));
        HSSettings.saveSettingsToStorage();
    }

    
    // ================================================================
    // Input UI / Lock Handler Methods
    // ================================================================

    static applyOptimizerInputToFields(modal: HTMLElement, input: HeaterOptimizerInput, applyLocked = true): void {
        this.inputDefinitions.forEach((field) => {
            if (!applyLocked && this.isFieldLocked(modal, field.key)) return;

            const element = this.getFieldElement(modal, field);
            if (!element) return;

            if (field.type === "boolean") {
                if (element instanceof HTMLInputElement) {
                    element.checked = Boolean(input[field.key]);
                }
            } else {
                element.value = this.formatFieldValueForInput(field.type, input[field.key]);
            }
        });
        this.refreshExaltWarning(modal);
    }

    static readInputValues(modal: HTMLElement): HeaterOptimizerInput {
        const heaterOptions = Object.fromEntries(
            HEATER_BRANCH_DEFINITIONS.map((branch) => {
                const element = modal.querySelector<HTMLInputElement>(`#hs-heater-input-active-${branch.id}`);
                return [branch.id, this.parseFieldValueFromInputElement('boolean', element) as boolean];
            })
        ) as Record<HeaterBranchId, boolean>;

        return {
            ...this.parseInputBaseRawFromModal(modal),
            ...this.#optimizerMetadata,
            heaterOptions,
        };
    }

    static setFieldLockState(modal: HTMLElement, fieldKey: string, locked: boolean): void {
        const lockButton = modal.querySelector<HTMLButtonElement>(`#hs-heater-lock-${fieldKey}`);
        if (!lockButton) return;

        lockButton.dataset.locked = String(locked);
        lockButton.textContent = locked ? '🔒' : '🔓';

        const lockCell = lockButton.parentElement;
        if (lockCell) {
            lockCell.classList.toggle('hs-heater-lock-cell-locked', locked);
        }
    }

    static isFieldLocked(modal: HTMLElement, fieldKey: string): boolean {
        const lockButton = modal.querySelector<HTMLButtonElement>(`#hs-heater-lock-${fieldKey}`);
        if (!lockButton) return false;
        return lockButton.dataset.locked === 'true';
    }

    static toggleFieldLock(modal: HTMLElement, fieldKey: string): void {
        const currentlyLocked = this.isFieldLocked(modal, fieldKey);
        this.setFieldLockState(modal, fieldKey, !currentlyLocked);
    }

    static attachInputLockHandlers(modal: HTMLElement): void {
        if (this.#lockHandlersAttachedModals.has(modal)) return;

        this.inputDefinitions.forEach((field) => {
            const element = this.getFieldElement(modal, field);
            if (!element) return;

            element.addEventListener('change', () => {
                this.setFieldLockState(modal, field.key, true);
                if (field.key === 'exalt') this.refreshExaltWarning(modal);
            });
        });
        this.refreshExaltWarning(modal);
        this.#lockHandlersAttachedModals.add(modal);
    }


    // ================================================================
    // Heater type select icon helpers
    // ================================================================

    static attachHeaterTypeSelectHandlers(modal: HTMLElement, onTypeSelectionChange?: () => void): void {
        const typeSelects = Array.from(modal.querySelectorAll('.hs-heater-type-select')) as HTMLSelectElement[];
        this.cacheHeaterTypeSelectElements(modal);

        if (!this.#iconOverrideChangeListener) {
            this.#iconOverrideChangeListener = () => this.refreshHeaterTypeSelectIcons(modal);
            subscribeHeaterIconOverrideChanges(this.#iconOverrideChangeListener);
        }

        const savedSelections = HSSettings.getSetting('heaterTypeLoadoutSelections').getValue() as string[] | null;
        const selectionsArray = Array.isArray(savedSelections) ? savedSelections : [];

        typeSelects.forEach((select, index) => {
            if (index < selectionsArray.length && selectionsArray[index]) {
                const savedValue = selectionsArray[index];
                const optionExists = Array.from(select.options).some(opt => opt.value === savedValue);
                if (optionExists) {
                    select.value = savedValue;
                }
            }
            this.syncTypeSelectIcon(select, modal);
        });

        typeSelects.forEach((select) => {
            select.addEventListener('change', () => {
                this.syncTypeSelectIcon(select, modal);
                this.syncTypeSelectAvailability(select, modal);
                const updatedSelections = typeSelects.map(s => s.value);
                HSSettings.getSetting('heaterTypeLoadoutSelections').setValue(updatedSelections);
                HSSettings.saveSettingsToStorage();
                this.tickBranchOfType(modal, select.value);
                onTypeSelectionChange?.();
            });
        });
    }

    static cleanupHeaterTypeSelectState(): void {
        if (this.#iconOverrideChangeListener) {
            unsubscribeHeaterIconOverrideChanges(this.#iconOverrideChangeListener);
            this.#iconOverrideChangeListener = null;
        }
        this.clearCachedTypeSelectElements();
    }

    static cacheHeaterTypeSelectElements(modal: HTMLElement): void {
        this.#cachedTypeSelects = Array.from(modal.querySelectorAll('.hs-heater-type-select')) as HTMLSelectElement[];
        this.#cachedTypeIcons = Array.from(modal.querySelectorAll('.hs-heater-type-select-icon')) as HTMLButtonElement[];
    }

    static clearCachedTypeSelectElements(): void {
        this.#cachedTypeSelects = [];
        this.#cachedTypeIcons = [];
    }

    static getCachedTypeIconForSelect(select: HTMLSelectElement, modal: HTMLElement): HTMLButtonElement | null {
        const index = this.#cachedTypeSelects.indexOf(select);
        if (index >= 0 && this.#cachedTypeIcons[index]) {
            return this.#cachedTypeIcons[index];
        }
        return select.parentElement?.querySelector('.hs-heater-type-select-icon') as HTMLButtonElement | null;
    }

    static syncTypeSelectIcon(select: HTMLSelectElement, modal: HTMLElement): void {
        const icon = this.getCachedTypeIconForSelect(select, modal);
        if (!icon) return;

        const iconSrc = getEffectiveHeaterIconSrc(select.value ?? '');
        if (iconSrc) {
            icon.style.backgroundImage = HSUtils.cssUrl(iconSrc);
            icon.style.visibility = 'visible';
        } else {
            icon.style.backgroundImage = '';
            icon.style.visibility = 'hidden';
        }
    }

    static syncTypeSelectAvailability(select: HTMLSelectElement, modal: HTMLElement): void {
        const row = select.closest('.hs-heater-type-select-row') as HTMLElement | null;
        if (!row) return;

        const checkbox = row.querySelector<HTMLInputElement>('.hs-heater-type-select-checkbox');
        if (!checkbox) return;

        const semanticId = (select.value || '').trim();
        const isAvailable = HSHeaterResultStore.isSemanticIdAvailable(semanticId);
        const isUnaffordable = HSHeaterResultStore.isSemanticIdUnaffordable(semanticId);

        // Nothing to import for a missing or an unaffordable type
        checkbox.checked = isAvailable && !isUnaffordable;
        select.classList.toggle('hs-heater-type-select-unavailable', !isAvailable);
        select.classList.toggle('hs-heater-type-select-unaffordable', isUnaffordable);
    }

    static refreshHeaterTypeSelectIcons(modal: HTMLElement): void {
        if (!this.#cachedTypeSelects.length) {
            this.cacheHeaterTypeSelectElements(modal);
        }

        this.#cachedTypeSelects.forEach((select) => this.syncTypeSelectIcon(select, modal));
    }


    // ================================================================
    // Internal Helpers
    // ================================================================

    static formatFieldValueForInput(fieldType: 'number' | 'percent' | 'boolean' | 'text' | 'select', value: unknown): string {
        if (typeof value === 'number' && Number.isFinite(value)) {
            return fieldType === 'percent' ? String(value * 100) : String(value);
        }
        if (value instanceof Decimal) {
            return value.toString();
        }
        return '';
    }

    static getFieldElement(
        modal: HTMLElement,
        field: HeaterInputField
    ): HTMLInputElement | HTMLSelectElement | null {
        const selector = `#hs-heater-input-${field.key}`;
        if (field.type === 'select') {
            return modal.querySelector<HTMLSelectElement>(selector);
        }
        return modal.querySelector<HTMLInputElement>(selector);
    }

    static parseFieldValueFromInputElement(
        fieldType: 'number' | 'percent' | 'boolean' | 'text' | 'select',
        element: HTMLInputElement | HTMLSelectElement | null,
        fallback = 0
    ): number | boolean | Decimal {
        if (fieldType === 'boolean') {
            return element instanceof HTMLInputElement ? element.checked : false;
        }
        if (!element) {
            return fieldType === 'text' ? new Decimal(fallback) : fallback;
        }

        const rawValue = element.value.trim();
        if (fieldType === 'text') {
            if (rawValue === '') {
                return new Decimal(fallback);
            }
            try {
                return new Decimal(rawValue);
            } catch {
                return new Decimal(fallback);
            }
        }

        const parsed = fieldType === 'percent' ? Number(rawValue) / 100 : Number(rawValue);
        return Number.isFinite(parsed) ? parsed : fallback;
    }

    static extractFieldValueFromExportData(field: HeaterInputField, hsData: any): HeaterInputValue {
        const extractor = this.exportFieldExtractors[field.key];
        if (extractor) {
            return extractor(hsData);
        }
        return hsData[field.key] as HeaterInputValue;
    }

    static parseInputBaseRawFromModal(modal: HTMLElement): HeaterInputBase {
        return this.mapFields((field) => {
            const element = this.getFieldElement(modal, field);
            return this.parseFieldValueFromInputElement(field.type, element);
        });
    }

    static buildFieldInputHtml(field: HeaterInputField, value: number | Decimal | boolean): string {
        const fieldId = `hs-heater-input-${field.key}`;
        const displayedValue = this.formatFieldValueForInput(field.type, value);

        if (field.type === "boolean") {
            return HSUIC.Input({ id: fieldId, type: HSInputType.CHECK, props: value ? { checked: 'true' } : undefined });
        }
        if (field.type === 'select') {
            return `<select id="${fieldId}" class="hs-heater-select-input">${
                this.buildSelectOptionHtml(
                    field.options,
                    displayedValue
                )
            }</select>`;
        }
        if (field.type === 'percent') {
            return `<div class="hs-heater-percent-input-wrap">${HSUIC.Input({ id: fieldId, type: HSInputType.NUMBER, props: { value: displayedValue, step: 'any', min: '0' } })}<span>%</span></div>`;
        }

        return HSUIC.Input({
            id: fieldId,
            type: field.type === 'text' ? HSInputType.TEXT : HSInputType.NUMBER,
            props: field.type === 'text'
                ? { value: displayedValue }
                : { value: displayedValue, step: 'any', min: '0' }
        });
    }

    static buildSelectOptionHtml(
        options: ReadonlyArray<{ value: number; label: string }>,
        displayedValue: string
    ): string {
        return options
            .map(opt => `<option value="${opt.value}"${ Number(displayedValue) === opt.value ? ' selected' : '' }>${escapeHtml(opt.label)}</option>`)
            .join('');
    }

    static buildInputTableRow(field: HeaterInputField, value: number | Decimal | boolean): string {
        const lockId = `hs-heater-lock-${field.key}`;
        const iconHtml = field.icon
            ? `<span class="hs-heater-icon-image" data-heater-icon-key="${field.key}" role="img" aria-label="${escapeHtml(field.label)}"></span>`
            : field.url
                ? `<img src="${field.url}" alt="${escapeHtml(field.label)}" class="hs-heater-icon-image" />`
                : '';
        const inputHtml = this.buildFieldInputHtml(field, value);
        // The bases always come from the exported save, whatever Exalt is picked
        const exaltWarningRow = field.key === 'exalt'
            ? `<tr id="hs-heater-exalt-warning-row" hidden><td colspan="4" class="hs-heater-input-warning"></td></tr>`
            : '';
        const headingRow = field.heading
            ? `<tr><td colspan="4" class="hs-heater-input-heading">${escapeHtml(field.heading)}</td></tr>`
            : '';

        return `${headingRow}
                <tr>
                    <td>${iconHtml}</td>
                    <td>${escapeHtml(field.label)}</td>
                    <td>${inputHtml}</td>
                    <td><button type="button" id="${lockId}" class="hs-heater-lock-button disable-hover-color" data-field-key="${field.key}" data-locked="false" aria-label="Toggle lock">🔓</button></td>
                </tr>${exaltWarningRow}
            `;
    }

    // Shown while the picked Exalt differs from the exported save's
    static refreshExaltWarning(modal: HTMLElement): void {
        const row = modal.querySelector<HTMLElement>('#hs-heater-exalt-warning-row');
        const select = modal.querySelector<HTMLSelectElement>('#hs-heater-input-exalt');
        if (!row || !select) return;

        const exportExalt = this.#exportExalt;
        if (exportExalt === null || Number(select.value) === exportExalt) {
            row.hidden = true;
            return;
        }
        const cell = row.firstElementChild as HTMLElement;
        cell.textContent = exportExalt === 0
            ? '⚠️ Base values come from a save outside any Exalt'
            : `⚠️ Base values come from a save in ${getHeaterExaltName(exportExalt)}`;
        row.hidden = false;
    }

    static mapFields(mapper: (field: HeaterInputField) => HeaterInputValue): HeaterInputBase;
    static mapFields<T>(mapper: (field: HeaterInputField) => T): Record<HeaterInputKey, T>;
    static mapFields<T>(mapper: (field: HeaterInputField) => T): Record<HeaterInputKey, T> {
        return Object.fromEntries(
            this.inputDefinitions.map((field) => [field.key, mapper(field)] as const)
        ) as Record<HeaterInputKey, T>;
    }
}
