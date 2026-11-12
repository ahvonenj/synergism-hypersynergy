import { HSSettingActionParams, HSSettingBase, HSSettingType } from "../../../types/module-types/hs-settings-types";
import { HSLogger } from "../hs-logger";
import { HSUI } from "../hs-ui";
import { HSSettings } from "./hs-settings";
import { escapeLogText } from '../../hs-utils/hs-escape';

/** Shows a setting's on/off state on its switch in the panel. */
export function paintSettingSwitch(element: HTMLElement, enabled: boolean): void {
    element.innerText = enabled ? '✓' : '✗';
    element.classList.toggle('hs-disabled', !enabled);
}

/**
 * Class: HSSetting
 * IsExplicitHSModule: No
 * Description:
 *     Abstract class for all Hypersynergism settings
 *     Contains the setting's definition and the action to be performed when the setting is changed
 * Author: Swiffy, Shewchou
 */
export abstract class HSSetting<T extends HSSettingType> {
    protected context = 'HSSetting';

    protected definition: HSSettingBase<T>;
    protected settingAction?: ((params: HSSettingActionParams) => any) | null;

    // On the GDS setting only: the settings it turned off when it was turned off,
    // turned back on with it. Not saved: forgotten at a page reload.
    #gameDataDependentsToRestore: HSSetting<HSSettingType>[] = [];

    constructor(
        settingDefinition: HSSettingBase<T>,
        settingAction: ((params: HSSettingActionParams) => any) | null) {

        this.definition = settingDefinition;
        this.settingAction = settingAction;

        this.definition.defaultValue = this.definition.settingValue;
        this.definition.calculatedSettingValue = this.definition.settingType === 'boolean'
            ? this.definition.enabled as T : this.definition.settingValue;
    }

    getDefinition(): HSSettingBase<T> {
        return this.definition;
    }

    enable() {
        this.#setEnabled(true);
    }

    disable() {
        this.#setEnabled(false);
    }

    // The panel's switch: as enable()/disable(), except that a setting needing GDS can't be turned on while GDS is off
    handleToggle(): void {
        const newState = !this.definition.enabled;
        if (newState && HSSettings.refuseWithoutGameData(this.definition)) return;
        this.#setEnabled(newState);
    }

    // The action is started, not awaited: the save is pending as soon as this returns,
    // for a caller that flushes it before a reload
    #setEnabled(newState: boolean): void {
        if (this.definition.enabled === newState) return;
        const isGameData = this.definition.settingName === 'useGameData';

        if (isGameData && !newState) this.#disableGameDataDependentsWithWarning();

        HSLogger.log(`${this.definition.settingName}: ${this.definition.enabled} -> ${newState}`, this.context);
        this.definition.enabled = newState;

        if (this.definition.settingType === 'boolean') {
            (this.definition as HSSettingBase<boolean>).settingValue = newState;
            (this.definition as HSSettingBase<boolean>).calculatedSettingValue = newState;
        }

        HSSettings.notifyStateChange(this.definition.settingName);
        this.#paintSwitch();

        void this.handleSettingAction('state', newState).catch(
            (error) => HSLogger.error(`Setting action failed for ${this.definition.settingName}: ${error}`, this.context)
        );

        if (isGameData && newState) this.#restoreGameDataDependents();

        HSSettings.saveSettingsToStorage();
    }

    #paintSwitch(): void {
        const switchId = this.definition.settingControl?.controlEnabledId;
        if (!switchId) return;

        const switchElement = document.getElementById(switchId);
        if (switchElement) {
            paintSettingSwitch(switchElement, this.definition.enabled);
        } else if (!this.definition.hidden) {
            HSLogger.debug(() => `Could not find toggle element for setting ${this.definition.settingName} (ID: ${switchId})`, this.context);
        }
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

    // For settings which have a settingAction defined but no skipInit,
    // this will be called when the setting is initialized
    async initialAction(changeType: 'value' | 'state', initialState?: boolean) {
        if (this.definition.skipInit) return;
        await this.handleSettingAction(changeType, initialState);
    }

    // Runs the setting's action: on a state change with the new state, on a value change as turned on
    protected async handleSettingAction(changeType: 'value' | 'state', newState?: boolean): Promise<void> {
        if (!this.settingAction) return;
        await this.settingAction({
            contextName: this.context,
            value: this.definition.calculatedSettingValue ?? null,
            disable: changeType === 'state' && !newState,
        });
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
        settingAction: ((params: HSSettingActionParams) => any) | null
    ) {
        super(settingDefinition, settingAction);

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
        settingAction: ((params: HSSettingActionParams) => any) | null) {
        super(settingDefinition, settingAction);

        // A value saved before its min or max changed (the challenge timers were allowed 0, which the game refuses)
        this.definition.settingValue = this.#clamp(this.definition.settingValue);

        if (this.definition.settingValueMultiplier !== undefined)
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

export class HSSelectStringSetting extends HSSetting<string> {
    getValue() {
        return this.definition.settingValue;
    }

    setValue(value: string) {
        this.definition.settingValue = value;
        HSSettings.saveSettingsToStorage();
    }

    async handleChange(e: Event) {
        const newValue = (e.target as HTMLSelectElement).value;

        HSLogger.log(escapeLogText(`${this.definition.settingName}: ${this.definition.settingValue} -> ${newValue}`), this.context);

        this.definition.settingValue = newValue;
        this.definition.calculatedSettingValue = newValue;
        await super.handleSettingAction("value");

        // Persist the updated value to storage after handling any actions
        HSSettings.saveSettingsToStorage();
    }
}

export class HSSelectStringsSetting extends HSSetting<string[]> {
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
