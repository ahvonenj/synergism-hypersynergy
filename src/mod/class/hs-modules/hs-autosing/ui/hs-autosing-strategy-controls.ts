import { HSSettings } from "../../../hs-core/settings/hs-settings";
import { HSModuleRegistry } from "../../../hs-core/module/hs-module-registry";

import { HSGlobal } from "../../../hs-core/hs-global";
import { HSUI } from "../../../hs-core/hs-ui";
import { HSLogger } from "../../../hs-core/hs-logger";
import { HSStrategyManager } from "../hs-strategy-manager";
import { HSAutosingStrategyModal } from "./hs-autosing-strategy-modal";
import { HSAutosingStrategy } from "../../../../types/module-types/hs-autosing-types";
import { escapeLogText } from '../../../hs-utils/hs-escape';

/**
 * Class: HSAutosingStrategyControls
 * IsExplicitHSModule: No
 * Description:
 *     The strategy controls of the Auto-Sing settings page: the strategy dropdown (default strategies, then the
 *     player's), and its Edit, Delete, Export and Import buttons. New and edited strategies come from the strategy
 *     editor (HSAutosingStrategyModal), which refreshes the dropdown through this class.
 * Author: XxMolkxX, Shewchou
 */
export class HSAutosingStrategyControls {
    static readonly #context = 'HSAutosingStrategyControls';

    static updateStrategyDropdownList(): void {
        const setting = HSSettings.getSetting("autosingStrategy");
        const control = setting.getDefinition().settingControl;
        if (!control?.selectOptions) return;

        const { defaultStrategiesOptions, userStrategiesOptions } = HSStrategyManager.getMergedStrategyOptions();
        control.selectOptions.length = 0;
        control.selectOptions.push(...defaultStrategiesOptions, ...userStrategiesOptions);

        let savedStrategy = undefined;
        const storageMod = HSModuleRegistry.getModule("HSStorage");
        if (storageMod && typeof storageMod.getData === "function") {
            let settingsData = storageMod.getData(HSGlobal.HSSettings.storageKey);
            if (settingsData) {
                const parsed = typeof settingsData === "string" ? JSON.parse(settingsData) : settingsData;
                if (parsed && parsed.autosingStrategy && parsed.autosingStrategy.settingValue) {
                    savedStrategy = parsed.autosingStrategy.settingValue;
                }
            }
        }

        const selectEl = document.querySelector(`#${control.controlId}`) as HTMLSelectElement | null;
        if (selectEl) {
            selectEl.innerHTML = "";
            if (defaultStrategiesOptions.length > 0) {
                const optgroupDefault = document.createElement('optgroup');
                optgroupDefault.label = 'Default Strategies';
                for (const opt of defaultStrategiesOptions) {
                    const option = document.createElement('option');
                    option.text = opt.text;
                    option.value = String(opt.value);
                    option.setAttribute('data-default', 'true');
                    optgroupDefault.appendChild(option);
                }
                selectEl.appendChild(optgroupDefault);
            }

            if (userStrategiesOptions.length > 0) {
                const optgroupUser = document.createElement('optgroup');
                optgroupUser.label = 'User Strategies';
                for (const opt of userStrategiesOptions) {
                    const option = document.createElement('option');
                    option.text = opt.text;
                    option.value = String(opt.value);
                    option.setAttribute('data-default', 'false');
                    optgroupUser.appendChild(option);
                }
                selectEl.appendChild(optgroupUser);
            }

            let toSelect = savedStrategy;
            if (!toSelect || !Array.from(selectEl.options).some(opt => opt.value === toSelect)) {
                if (selectEl.options.length > 0) {
                    toSelect = selectEl.options[0].value;
                }
            }
            if (toSelect) {
                selectEl.value = toSelect;
                setting.setValue(toSelect);
            }
            HSLogger.log(`Strategy dropdown rebuilt with ${defaultStrategiesOptions.length} default and ${userStrategiesOptions.length} user strategies. Selected: ${escapeLogText(toSelect)}`, this.#context);
        }
    }

    static selectAutosingStrategyByName(strategyName: string): void {
        const setting = HSSettings.getSetting("autosingStrategy");
        const control = setting.getDefinition().settingControl;
        if (control?.selectOptions) {
            const selectEl = document.querySelector(`#${control.controlId}`) as HTMLSelectElement | null;
            if (selectEl) {
                selectEl.value = strategyName;
            }
            setting.setValue(strategyName);
        } else {
            HSLogger.warn(`Could not select autosing strategy '${escapeLogText(strategyName)}' because control is unavailable`, this.#context);
        }
    }

    static async deleteSelectedStrategy(): Promise<void> {
        const strategySetting = HSSettings.getSetting("autosingStrategy");
        const selectedValue = strategySetting.getValue();
        if (!selectedValue || selectedValue === '') {
            HSUI.Notify("Please select a strategy to delete", { notificationType: "warning" });
            return;
        }

        const control = strategySetting.getDefinition().settingControl;
        if (!control?.selectOptions) {
            HSUI.Notify("Strategy dropdown not available", { notificationType: "error" });
            return;
        }

        const selectedOption = control.selectOptions.find(opt => opt.value.toString() === selectedValue);
        if (!selectedOption) {
            HSUI.Notify("Selected strategy not found in dropdown", { notificationType: "error" });
            return;
        }

        const strategyName = selectedOption.value.toString();
        const defaultNames = HSStrategyManager.getDefaultStrategyNames();
        if (defaultNames.includes(strategyName)) {
            HSUI.Notify("You cannot delete default strategies.", { notificationType: "warning" });
            return;
        }

        // Its Update would save it again
        if (HSAutosingStrategyModal.showEditorOf(strategyName)) {
            HSUI.Notify(`"${strategyName}" is open in the strategy editor: close it first`, { notificationType: "warning" });
            return;
        }

        if (!confirm(`Are you sure you want to delete strategy "${strategyName}"?`)) {
            return;
        }

        const saved = HSStrategyManager.deleteStrategyFromStorage(strategyName, HSAutosingStrategyControls.#context);
        if (!saved) {
            HSUI.Notify("Failed to delete strategy from localStorage", { notificationType: "error" });
            return;
        }

        HSAutosingStrategyControls.updateStrategyDropdownList();

        const firstDefault = defaultNames[0];
        if (firstDefault) {
            HSAutosingStrategyControls.selectAutosingStrategyByName(firstDefault);
        }

        HSUI.Notify(`Strategy "${strategyName}" deleted. Defaulted to ${firstDefault ? '"' + firstDefault + '"' : 'none'}.`, { notificationType: "success" });
    }

    static async exportSelectedStrategy(): Promise<void> {
        const strategySetting = HSSettings.getSetting("autosingStrategy");
        const selectedValue = strategySetting.getValue();
        if (!selectedValue || selectedValue === '') {
            HSUI.Notify("Please select a strategy to export", { notificationType: "warning" });
            return;
        }

        const control = strategySetting.getDefinition().settingControl;
        if (!control?.selectOptions) {
            HSUI.Notify("Strategy dropdown not available", { notificationType: "error" });
            return;
        }

        const selectedOption = control.selectOptions.find(opt => opt.value.toString() === selectedValue);
        if (!selectedOption) {
            HSUI.Notify("Selected strategy not found in dropdown", { notificationType: "error" });
            return;
        }

        const strategyName = selectedOption.value.toString();
        let strategy = HSStrategyManager.getStrategies().find(s => s.strategyName === strategyName);
        if (!strategy && HSStrategyManager.getDefaultStrategyNames().includes(strategyName)) {
            strategy = await HSStrategyManager.loadDefaultStrategyByName(strategyName, this.#context) || undefined;
        }

        if (!strategy) {
            HSUI.Notify("Strategy not found - cannot export", { notificationType: "error" });
            return;
        }

        try {
            const strategyJson = JSON.stringify(strategy, null, 2);
            await navigator.clipboard.writeText(strategyJson);
            HSUI.Notify(`Strategy "${strategyName}" copied to clipboard`, { notificationType: "success" });
        } catch {
            HSUI.Notify("Failed to copy strategy to clipboard", { notificationType: "error" });
        }
    }

    static async importStrategy(): Promise<void> {
        const uiMod = HSModuleRegistry.getModule('HSUI');
        if (uiMod) {
            const modalId = await uiMod.Modal({
                title: 'Import Strategy',
                htmlContent: `
            <div style="display: flex; flex-direction: column; gap: 15px; padding: 10px;">
                <div>
                    <label for="import-strategy-name" style="display: block; margin-bottom: 5px; font-weight: bold;">Strategy Name:</label>
                    <input type="text" id="import-strategy-name" placeholder="Enter strategy name" style="width: 100%; padding: 8px; box-sizing: border-box;" />
                </div>
                <div>
                    <label for="import-strategy-json" style="display: block; margin-bottom: 5px; font-weight: bold;">Strategy JSON:</label>
                    <textarea id="import-strategy-json" placeholder="Paste strategy JSON here" rows="10" style="width: 100%; padding: 8px; box-sizing: border-box; font-family: monospace;"></textarea>
                </div>
                <div style="display: flex; gap: 10px; justify-content: flex-end;">
                    <button id="import-strategy-cancel" data-close="${'modal-will-be-replaced'}" style="padding: 8px 16px; cursor: pointer;">Cancel</button>
                    <button id="import-strategy-submit" style="padding: 8px 16px; cursor: pointer; background-color: #4CAF50; color: white; border: none;">Import</button>
                </div>
            </div>
        `
            });

            const cancelBtn = document.querySelector(`#${modalId} #import-strategy-cancel`) as HTMLButtonElement;
            if (cancelBtn) {
                cancelBtn.dataset.close = modalId;
            }

            const submitBtn = document.querySelector(`#${modalId} #import-strategy-submit`) as HTMLButtonElement;
            const nameInput = document.querySelector(`#${modalId} #import-strategy-name`) as HTMLInputElement;
            const jsonInput = document.querySelector(`#${modalId} #import-strategy-json`) as HTMLTextAreaElement;

            jsonInput.addEventListener('input', () => {
                if (nameInput.value.trim()) {
                    return;
                }

                try {
                    const parsed = JSON.parse(jsonInput.value) as Partial<HSAutosingStrategy>;
                    if (parsed && typeof parsed.strategyName === 'string' && parsed.strategyName.trim()) {
                        nameInput.value = parsed.strategyName.trim();
                    }
                } catch {
                    // Ignore invalid JSON while typing
                }
            });

            if (!submitBtn || !nameInput || !jsonInput) {
                HSUI.Notify("Failed to create import modal", {
                    notificationType: "error"
                });
                return;
            }

            submitBtn.addEventListener('click', async () => {
                const strategyName = nameInput.value.trim();
                const strategyJson = jsonInput.value.trim();

                if (!strategyName) {
                    HSUI.Notify("Please enter a strategy name", {
                        notificationType: "warning"
                    });
                    return;
                }

                const existingStrategies = HSStrategyManager.getStrategies();
                if (existingStrategies.some(s => s.strategyName === strategyName)) {
                    HSUI.Notify(`Strategy "${strategyName}" already exists`, {
                        notificationType: "warning"
                    });
                    return;
                }

                let parsedStrategy: HSAutosingStrategy;
                try {
                    parsedStrategy = { ...JSON.parse(strategyJson), strategyName };
                } catch (error) {
                    HSUI.Notify("Invalid JSON format", {
                        notificationType: "error"
                    });
                    return;
                }

                try {
                    HSStrategyManager.validateStrategy(parsedStrategy, HSAutosingStrategyControls.#context);
                } catch (error) {
                    HSUI.Notify(`Invalid strategy: ${(error as Error).message}`, {
                        notificationType: "error"
                    });
                    return;
                }
                // Migrated by saveStrategyToStorage (levels at 0): told once it's saved
                const hasLegacyCorruptions = HSStrategyManager.hasLegacyCorruptions(parsedStrategy);

                try {
                    const { saved } = HSStrategyManager.saveStrategyToStorage(parsedStrategy, undefined, HSAutosingStrategyControls.#context);
                    if (!saved) {
                        HSUI.Notify("Failed to save strategy", {
                            notificationType: "error"
                        });
                        return;
                    }

                    // Refresh the dropdown list after import
                    HSAutosingStrategyControls.updateStrategyDropdownList();
                    HSAutosingStrategyControls.selectAutosingStrategyByName(strategyName);
                    HSLogger.log(`Strategy "${escapeLogText(strategyName)}" imported and selected.`, HSAutosingStrategyControls.#context);
                    // One notification: the warning, when there is one
                    if (hasLegacyCorruptions) {
                        HSStrategyManager.warnLegacyCorruptions([strategyName], HSAutosingStrategyControls.#context);
                    } else {
                        HSUI.Notify(`Strategy "${strategyName}" imported successfully and selected.`, {
                            notificationType: "success"
                        });
                    }

                    await uiMod.CloseModal(modalId);
                } catch (error) {
                    HSUI.Notify("Failed to save strategy", {
                        notificationType: "error"
                    });
                    HSLogger.log(escapeLogText(`Strategy import failed: ${error}`), HSAutosingStrategyControls.#context);
                }
            });
        } else {
            HSUI.Notify("Failed to find HSUI", {
                notificationType: "error"
            });
        }
    }

    static async editSelectedStrategy(): Promise<void> {
        const strategySetting = HSSettings.getSetting("autosingStrategy");
        const selectedValue = strategySetting.getValue();

        if (!selectedValue || selectedValue === '') {
            HSUI.Notify("Please select a strategy to edit", {
                notificationType: "warning"
            });
            return;
        }

        const control = strategySetting.getDefinition().settingControl;
        if (!control?.selectOptions) return;

        const selectedOption = control.selectOptions.find(opt => opt.value.toString() === selectedValue);
        if (!selectedOption) return;

        const selectedStrategyName = selectedOption.value.toString();
        const defaultNames = HSStrategyManager.getDefaultStrategyNames();
        const isDefaultStrategy = defaultNames.includes(selectedStrategyName);

        const strategies = HSStrategyManager.getStrategies();
        let strategy = strategies.find(s => s.strategyName === selectedStrategyName);

        if (!strategy && isDefaultStrategy) {
            strategy = await HSStrategyManager.loadDefaultStrategyByName(selectedStrategyName, this.#context) || undefined;
        }

        if (!strategy) {
            HSUI.Notify("Strategy not found - Cannot edit", {
                notificationType: "error"
            });
            return;
        }

        if (isDefaultStrategy) {
            await HSAutosingStrategyModal.open(strategy, {
                duplicateFromDefault: true,
                suggestedName: `${strategy.strategyName}_copy`
            });
        } else {
            await HSAutosingStrategyModal.open(strategy);
        }
    }
}
