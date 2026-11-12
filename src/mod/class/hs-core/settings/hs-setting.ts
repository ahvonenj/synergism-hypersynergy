import { HSSettingActionParams, HSSettingBase, HSSettingType } from "../../../types/module-types/hs-settings-types";
import { HSLogger } from "../hs-logger";
import { HSUI } from "../hs-ui";
import { HSSettings } from "./hs-settings";
import { escapeLogText } from '../../hs-utils/hs-escape';

type HSSettingAction = ((params: HSSettingActionParams) => any) | null;

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
    protected settingAction?: HSSettingAction;

    // On the GDS setting only: the settings it turned off when it was turned off,
    // turned back on with it. Not saved: forgotten at a page reload.
    #gameDataDependentsToRestore: HSSetting<HSSettingType>[] = [];

    constructor(settingDefinition: HSSettingBase<T>, settingAction: HSSettingAction) {
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
    /** Stores a value without running the setting's action. */
    abstract setValue(value: T): void;
    /** The panel's control for the value changed. */
    abstract handleChange(e: Event): Promise<void>;
}

/**
 * Class: HSValueSetting
 * IsExplicitHSModule: No
 * Description: A setting with a value the player edits in the panel. Subclasses say how to read their control,
 *     and optionally how to keep a value in range and how to compute the value given to the action.
 * Author: Shewchou
 */
abstract class HSValueSetting<T extends number | string | string[]> extends HSSetting<T> {
    constructor(settingDefinition: HSSettingBase<T>, settingAction: HSSettingAction) {
        super(settingDefinition, settingAction);
        // A saved value is brought within the current range (the challenge timers were allowed 0, which the game refuses)
        this.#store(this.normalize(this.definition.settingValue));
    }

    // Called from this constructor: an override can't use its class's # members, not created yet
    protected normalize(value: T): T {
        return value;
    }

    protected calculate(value: T): T {
        return value;
    }

    /** The control's value; may also correct what the control shows. */
    protected abstract readInput(target: EventTarget | null): T;

    getValue(): T {
        return this.definition.settingValue;
    }

    setValue(value: T): void {
        this.#store(this.normalize(value));
        HSSettings.saveSettingsToStorage();
    }

    async handleChange(e: Event): Promise<void> {
        const newValue = this.readInput(e.target);
        const format = (value: T) => Array.isArray(value) ? JSON.stringify(value) : String(value);
        HSLogger.log(escapeLogText(`${this.definition.settingName}: ${format(this.definition.settingValue)} -> ${format(newValue)}`), this.context);

        this.#store(newValue);
        await this.handleSettingAction('value');
        HSSettings.saveSettingsToStorage();
    }

    #store(value: T): void {
        this.definition.settingValue = value;
        this.definition.calculatedSettingValue = this.calculate(value);
    }
}

export class HSNumericSetting extends HSValueSetting<number> {
    // Within the control's min and max: the input's own min/max don't stop a typed value
    protected normalize(value: number): number {
        const options = this.definition.settingControl?.controlOptions;
        if (options?.min !== undefined) value = Math.max(value, options.min);
        if (options?.max !== undefined) value = Math.min(value, options.max);
        return value;
    }

    protected calculate(value: number): number {
        return value * (this.definition.settingValueMultiplier ?? 1);
    }

    // An empty or unreadable field keeps the current value; the field shows the value kept
    protected readInput(target: EventTarget | null): number {
        const input = target as HTMLInputElement;
        const typed = parseFloat(input.value);
        const value = Number.isFinite(typed) ? this.normalize(typed) : this.definition.settingValue;
        input.value = String(value);
        return value;
    }
}

/** A text field or a single-choice dropdown. */
export class HSTextSetting extends HSValueSetting<string> {
    protected readInput(target: EventTarget | null): string {
        return (target as HTMLInputElement | HTMLSelectElement).value;
    }
}

export class HSMultiSelectSetting extends HSValueSetting<string[]> {
    protected readInput(target: EventTarget | null): string[] {
        return Array.from((target as HTMLSelectElement).selectedOptions).map((option) => option.value);
    }
}

// Its value is its on/off state
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

    async handleChange(_: Event) { }
}

export class HSButtonSetting extends HSSetting<null> {
    constructor(settingDefinition: HSSettingBase<null>, settingAction: HSSettingAction) {
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

    async handleChange(_: Event): Promise<void> {
        HSLogger.log(`Button pressed: ${this.definition.settingName}`, this.context);
        await this.handleSettingAction("value");
    }

    // Buttons don't fire at load
    async initialAction(_: 'value' | 'state', __?: boolean) { }

    enable(): void { }
    disable(): void { }
}
