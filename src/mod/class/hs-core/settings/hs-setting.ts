import { HSSettingActionParams, HSSettingBase, HSSettingType } from "../../../types/module-types/hs-settings-types";
import { HSUtils } from "../../hs-utils/hs-utils";
import { HSGlobal } from "../hs-global";
import { HSLogger } from "../hs-logger";
import { HSUI } from "../hs-ui";
import { HSSettings } from "./hs-settings";

/**
 * Class: HSSetting
 * IsExplicitHSModule: No
 * Description: 
 *     Abstract class for all Hypersynergism settings
 *     Contains the setting's definition and the action to be performed when the setting is changed
 * Author: Swiffy
 */
export abstract class HSSetting<T extends HSSettingType> {
    protected context = 'HSSetting';

    #settingEnabledString;
    #settingDisabledString;

    protected definition: HSSettingBase<T>;
    protected settingAction?: ((params: HSSettingActionParams) => any) | null;

    // On the GDS setting only: the settings it turned off when it was turned off,
    // turned back on with it. Not saved: forgotten at a page reload.
    #gameDataDependentsToRestore: HSSetting<HSSettingType>[] = [];

    constructor(
        settingDefinition: HSSettingBase<T>,
        settingAction: ((params: HSSettingActionParams) => any) | null,
        enabledString: string,
        disabledString: string) {

        this.definition = settingDefinition;
        this.settingAction = settingAction;
        this.#settingEnabledString = enabledString;
        this.#settingDisabledString = disabledString;

        this.definition.defaultValue = this.definition.settingValue;
    }

    getDefinition(): HSSettingBase<T> {
        return this.definition;
    }

    enable() {
        this.#handleManualToggle(true);
    }

    disable() {
        this.#handleManualToggle(false);
    }

    #getEnabledGameDataDependents() {
        return Object.values(HSSettings.getSettings()).filter((setting) => {
            const definition = setting.getDefinition();
            return definition.settingName !== 'useGameData'
                && HSSettings.usesGameData(definition)
                && setting.isEnabled();
        });
    }

    #disableGameDataDependentsWithWarning(): void {
        const dependents = this.#getEnabledGameDataDependents();
        this.#gameDataDependentsToRestore = dependents;
        if (dependents.length === 0) return;

        const dependentNames = dependents.map((setting) => setting.getDefinition().settingDescription);
        const warning = `Turning off GDS will also turn off: ${dependentNames.join(', ')}.`;
        HSLogger.warn(warning, this.context);
        void HSUI.Notify(warning, {
            position: 'top',
            notificationType: 'warning',
            displayDuration: 6000,
        });

        for (const setting of dependents) {
            setting.disable();
        }
    }

    // Turns back on what #disableGameDataDependentsWithWarning() turned off.
    // enable() does nothing for a setting the player has turned back on meanwhile.
    #restoreGameDataDependents(): void {
        const dependents = this.#gameDataDependentsToRestore;
        this.#gameDataDependentsToRestore = [];

        for (const setting of dependents) {
            HSLogger.log(`Turning ${setting.getDefinition().settingName} back on with GDS`, this.context);
            setting.enable();
        }
    }

    // Toggles the setting's state and updates the UI accordingly
    // This is generic for all (toggleable) settings
    async handleToggle(e: MouseEvent) {
        const newState = !this.definition.enabled;
        const hasStateChanged = this.definition.enabled !== newState;

        const gameDataSetting = HSSettings.getSetting("useGameData") as HSSetting<boolean>;

        // 1. Check if the setting is blacklisted from this check in general
        // 2. Check if game data is enabled
        // 3. Check if we are trying to ENABLE some setting
        // 4. Check if the setting we are trying to enable uses game data
        // 5. Allow or disallow enabling the setting
        // We're trying to prevent enabling settings which use game data when game data is not enabled
        if (!HSGlobal.HSSettings.gameDataCheckBlacklist.includes(this.definition.settingName)) {
            if (gameDataSetting) {
                if (HSSettings.usesGameData(this.definition) &&
                    hasStateChanged &&
                    newState &&
                    !gameDataSetting.isEnabled()) {
                    HSLogger.warn(`Enable GDS before enabling ${this.definition.settingDescription}!`, this.context);
                    return;
                }
            }
        }

        // If we are disabling GDS, we will auto-disable all features that use it
        if (this.definition.settingName === 'useGameData') {
            if (hasStateChanged && !newState) {
                this.#disableGameDataDependentsWithWarning();
            }
        }

        HSLogger.log(`${this.definition.settingName}: ${this.definition.enabled} -> ${!this.definition.enabled}`, this.context);

        if (!hasStateChanged) return;

        this.definition.enabled = newState;
        HSSettings.notifyStateChange(this.definition.settingName);

        if (this.definition.settingType === 'boolean') {
            (this.definition as HSSettingBase<boolean>).settingValue = newState;
            (this.definition as HSSettingBase<boolean>).calculatedSettingValue = newState;
        }

        const targetElement = (e.target as HTMLDivElement);

        if (newState) {
            targetElement.innerText = this.#settingEnabledString;
            targetElement.classList.remove('hs-disabled');
        } else {
            targetElement.innerText = this.#settingDisabledString;
            targetElement.classList.add('hs-disabled');
        }

        await this.handleSettingAction('state', newState);

        if (this.definition.settingName === 'useGameData' && newState) {
            this.#restoreGameDataDependents();
        }

        // Persist the changed enabled state to storage so UI toggles stick
        HSSettings.saveSettingsToStorage();
    }

    #handleManualToggle(newState: boolean) {
        const hasStateChanged = this.definition.enabled !== newState;
        if (!hasStateChanged) return;

        if (this.definition.settingName === 'useGameData') {
            if (hasStateChanged && !newState) {
                this.#disableGameDataDependentsWithWarning();
            }
        }

        HSLogger.log(`${this.definition.settingName}: ${this.definition.enabled} -> ${newState}`, this.context);
        this.definition.enabled = newState;
        HSSettings.notifyStateChange(this.definition.settingName);

        if (this.definition.settingType === 'boolean') {
            (this.definition as HSSettingBase<boolean>).settingValue = newState;
            (this.definition as HSSettingBase<boolean>).calculatedSettingValue = newState;
        }

        // Use getElementById for safer and faster lookup
        // Check if controlEnabledId is defined before trying to find it
        if (this.definition.settingControl?.controlEnabledId) {
            const toggleElement = document.getElementById(this.definition.settingControl.controlEnabledId) as HTMLDivElement;

            if (toggleElement) {
                if (newState) {
                    toggleElement.innerText = this.#settingEnabledString;
                    toggleElement.classList.remove('hs-disabled');
                } else {
                    toggleElement.innerText = this.#settingDisabledString;
                    toggleElement.classList.add('hs-disabled');
                }
            } else {
                HSLogger.debug(() => `Could not find toggle element for setting ${this.definition.settingName} (ID: ${this.definition.settingControl?.controlEnabledId})`, this.context);
            }
        }

        void this.handleSettingAction('state', newState).catch(
            (error) => HSLogger.error(`Setting action failed for ${this.definition.settingName}: ${error}`, this.context)
        );

        if (this.definition.settingName === 'useGameData' && newState) {
            this.#restoreGameDataDependents();
        }

        HSSettings.saveSettingsToStorage();
    }

    // For settings which have a settingAction defined but no skipInit,
    // this will be called when the setting is initialized
    async initialAction(changeType: 'value' | 'state', initialState?: boolean) {
        if (this.definition.skipInit) return;
        await this.handleSettingAction(changeType, initialState);
    }

    // Handles a setting's settingAction for all settings
    protected async handleSettingAction(changeType: 'value' | 'state', newState?: boolean): Promise<void> {
        if (this.settingAction) {
            const action = this.settingAction;

            const actionConfig: HSSettingActionParams = {
                contextName: this.context,
                value: this.definition.calculatedSettingValue ?? null,
            }

            if (action && action instanceof Function) {
                if (changeType === "state") {
                    if (newState) {
                        await action({
                            ...actionConfig,
                            disable: false
                        });
                    } else {
                        await action({
                            ...actionConfig,
                            disable: true
                        });
                    }
                } else {
                    await action({
                        ...actionConfig,
                        disable: false
                    });
                }
            }
        }
    }

    hasControls(): boolean {
        return ('settingControl' in this.definition);
    }

    isEnabled(): boolean {
        return this.definition.enabled;
    }

    getCalculatedValue() {
        return this.definition.calculatedSettingValue;
    }

    abstract getValue(): T;
    abstract setValue(value: T): void;
    abstract handleChange(e: Event): Promise<void>;
}

export class HSButtonSetting extends HSSetting<null> {
    constructor(
        settingDefinition: HSSettingBase<null>,
        settingAction: ((params: HSSettingActionParams) => any) | null,
        enabledString: string,
        disabledString: string
    ) {
        super(settingDefinition, settingAction, enabledString, disabledString);

        this.definition.enabled = true;
        this.definition.settingValue = null as any;
        this.definition.calculatedSettingValue = null;
    }
    getValue(): null {
        return null;
    }

    setValue(_: null): void {
        HSSettings.saveSettingsToStorage();
    }

    async handleChange(e: Event): Promise<void> {
        HSLogger.log(`Button pressed: ${this.definition.settingName}`, this.context);
        await this.handleSettingAction("value");
    }

    async initialAction(_: 'value' | 'state', __?: boolean) {
        // 🚫 Buttons should not auto-fire on init
        return;
    }

    enable(): void { }
    disable(): void { }
}

export class HSNumericSetting extends HSSetting<number> {
    constructor(
        settingDefinition: HSSettingBase<number>,
        settingAction: ((params: HSSettingActionParams) => any) | null,
        enabledString: string,
        disabledString: string) {
        super(settingDefinition, settingAction, enabledString, disabledString);

        // A value saved before its min or max changed (the challenge timers were allowed 0, which the game refuses)
        this.definition.settingValue = this.#clamp(this.definition.settingValue);

        if (this.definition.settingValueMultiplier)
            this.definition.calculatedSettingValue = this.definition.settingValue * this.definition.settingValueMultiplier;
    }

    // Within the control's min and max: the input's own min/max don't stop a typed value
    #clamp(value: number): number {
        const options = this.definition.settingControl?.controlOptions;
        if (options?.min !== undefined) value = Math.max(value, options.min);
        if (options?.max !== undefined) value = Math.min(value, options.max);
        return value;
    }

    getValue() {
        return this.definition.settingValue;
    }

    setValue(value: number) {
        this.definition.settingValue = value;
        HSSettings.saveSettingsToStorage();
    }

    // Number type settings need to handle the change event differently
    // because they need to take settingValueMultiplier into account
    async handleChange(e: Event) {
        const input = e.target as HTMLInputElement;
        const typed = parseFloat(input.value);
        // An empty or unreadable field keeps the current value
        const newValue = Number.isFinite(typed) ? this.#clamp(typed) : this.definition.settingValue;
        input.value = String(newValue);

        HSLogger.log(`${this.definition.settingName}: ${this.definition.settingValue} -> ${newValue}`, this.context);

        this.definition.settingValue = newValue;
        this.definition.calculatedSettingValue = newValue * this.definition.settingValueMultiplier;

        await super.handleSettingAction("value");

        // Persist the updated value to storage after handling any actions
        HSSettings.saveSettingsToStorage();
    }
}

export class HSStringSetting extends HSSetting<string> {
    constructor(
        settingDefinition: HSSettingBase<string>,
        settingAction: ((params: HSSettingActionParams) => any) | null,
        enabledString: string,
        disabledString: string) {
        super(settingDefinition, settingAction, enabledString, disabledString);
    }

    getValue() {
        return this.definition.settingValue;
    }

    setValue(value: string) {
        this.definition.settingValue = value;
        HSSettings.saveSettingsToStorage();
    }

    async handleChange(e: Event) {
        const newValue = (e.target as HTMLInputElement).value;

        HSLogger.log(`${this.definition.settingName}: ${this.definition.settingValue} -> ${newValue}`, this.context);

        this.definition.settingValue = newValue;
        this.definition.calculatedSettingValue = newValue;
        await super.handleSettingAction("value");

        // Persist the updated value to storage after handling any actions
        HSSettings.saveSettingsToStorage();
    }
}

export class HSBooleanSetting extends HSSetting<boolean> {
    constructor(
        settingDefinition: HSSettingBase<boolean>,
        settingAction: ((params: HSSettingActionParams) => any) | null,
        enabledString: string,
        disabledString: string) {
        super(settingDefinition, settingAction, enabledString, disabledString);
    }

    getValue() {
        return this.definition.enabled;
    }

    setValue(value: boolean) {
        this.definition.settingValue = value;
        this.definition.calculatedSettingValue = value;
        const changed = this.definition.enabled !== value;
        this.definition.enabled = value;
        if (changed) HSSettings.notifyStateChange(this.definition.settingName);
        HSSettings.saveSettingsToStorage();
    }

    // Boolean type settings have no value, they are just toggled on/off
    async handleChange(e: Event) { }
}

export class HSSelectNumericSetting extends HSSetting<number> {
    constructor(
        settingDefinition: HSSettingBase<number>,
        settingAction: ((params: HSSettingActionParams) => any) | null,
        enabledString: string,
        disabledString: string) {
        super(settingDefinition, settingAction, enabledString, disabledString);

        if (this.definition.settingValueMultiplier)
            this.definition.calculatedSettingValue = this.definition.settingValue * this.definition.settingValueMultiplier;
    }

    getValue() {
        return this.definition.settingValue;
    }

    setValue(value: number) {
        this.definition.settingValue = value;
        HSSettings.saveSettingsToStorage();
    }

    // Number type settings need to handle the change event differently
    // because they need to take settingValueMultiplier into account
    async handleChange(e: Event) {
        const newValue = parseFloat((e.target as HTMLSelectElement).value);

        HSLogger.log(`${this.definition.settingName}: ${this.definition.settingValue} -> ${newValue}`, this.context);

        this.definition.settingValue = newValue;
        this.definition.calculatedSettingValue = newValue * this.definition.settingValueMultiplier;

        await super.handleSettingAction("value");

        // Persist the updated value to storage after handling any actions
        HSSettings.saveSettingsToStorage();
    }
}

export class HSSelectStringSetting extends HSSetting<string> {
    constructor(
        settingDefinition: HSSettingBase<string>,
        settingAction: ((params: HSSettingActionParams) => any) | null,
        enabledString: string,
        disabledString: string) {
        super(settingDefinition, settingAction, enabledString, disabledString);
    }

    getValue() {
        return this.definition.settingValue;
    }

    setValue(value: string) {
        this.definition.settingValue = value;
        HSSettings.saveSettingsToStorage();
    }

    async handleChange(e: Event) {
        const newValue = (e.target as HTMLSelectElement).value;

        HSLogger.log(`${this.definition.settingName}: ${this.definition.settingValue} -> ${newValue}`, this.context);

        this.definition.settingValue = newValue;
        this.definition.calculatedSettingValue = newValue;
        await super.handleSettingAction("value");

        // Persist the updated value to storage after handling any actions
        HSSettings.saveSettingsToStorage();
    }
}

export class HSSelectStringsSetting extends HSSetting<string[]> {
    constructor(
        settingDefinition: HSSettingBase<string[]>,
        settingAction: ((params: HSSettingActionParams) => any) | null,
        enabledString: string,
        disabledString: string) {
        super(settingDefinition, settingAction, enabledString, disabledString);
    }

    getValue() {
        return this.definition.settingValue;
    }

    setValue(value: string[]) {
        this.definition.settingValue = value;
        HSSettings.saveSettingsToStorage();
    }

    async handleChange(e: Event) {
        const selectElement = e.target as HTMLSelectElement;
        const newValue = Array.from(selectElement.selectedOptions).map((option) => option.value);

        HSLogger.log(`${this.definition.settingName}: ${JSON.stringify(this.definition.settingValue)} -> ${JSON.stringify(newValue)}`, this.context);

        this.definition.settingValue = newValue;
        this.definition.calculatedSettingValue = newValue;
        await super.handleSettingAction("value");

        // Persist the updated value to storage after handling any actions
        HSSettings.saveSettingsToStorage();
    }
}

export class HSStateSetting extends HSSetting<string> {
    constructor(
        settingDefinition: HSSettingBase<string>,
        settingAction: ((params: HSSettingActionParams) => any) | null,
        enabledString: string,
        disabledString: string) {
        super(settingDefinition, settingAction, enabledString, disabledString);
    }

    getValue() {
        return HSUtils.removeColorTags(this.definition.settingValue);
    }

    getDisplayValue() {
        return HSUtils.parseColorTags(this.definition.settingValue);
    }

    setValue(value: string) {
        this.definition.settingValue = value;
        this.definition.calculatedSettingValue = value;

        const stateElement = document.querySelector(`#${this.definition.settingControl?.controlId}`) as HTMLParagraphElement;

        if (stateElement) {
            stateElement.innerHTML = this.getDisplayValue();
        }

        HSSettings.saveSettingsToStorage();
    }

    async handleChange(e: Event) { }
}
