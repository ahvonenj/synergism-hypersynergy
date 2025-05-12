import { HSSettingActionParams, HSSettingBase, HSSettingType } from "../../types/module-types/hs-settings-types";
import { HSUtils } from "../hs-utils/hs-utils";
import { HSGlobal } from "./hs-global";
import { HSLogger } from "./hs-logger";
import { HSSettings } from "./hs-settings";

/* 
    Class: HSSetting
    IsExplicitHSModule: No
    Description: 
        Abstract class for all Hypersynergism settings
        Contains the setting's definition and the action to be performed when the setting is changed
*/
export abstract class HSSetting<T extends HSSettingType> {
    protected context = 'HSSetting';

    #settingEnabledString;
    #settingDisabledString;

    protected definition: HSSettingBase<T>;
    protected settingAction?: ((params: HSSettingActionParams) => any) | null;

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

    setDefinition(setting: HSSettingBase<T>) {
        this.definition = setting;
    }

    enable() {
        this.#handleManualToggle(true);
    }

    disable() {
        this.#handleManualToggle(false);
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
        if(!HSGlobal.HSSettings.gameDataCheckBlacklist.includes(this.definition.settingName)) {
            if(gameDataSetting) {
                if(this.definition.usesGameData && 
                    hasStateChanged &&
                    newState &&
                    !gameDataSetting.isEnabled()) {
                        HSLogger.warn(`Enable GDS before enabling ${this.definition.settingDescription}!`);
                        return;
                    }
            }
        }

        // If we are disabling GDS, we will auto-disable all features that use it
        if(this.definition.settingName === 'useGameData') {
            if(hasStateChanged && !newState) {
                const settings = HSSettings.getSettings();
                    
                for(const [settingKey, setting] of Object.entries(settings)) {
                    const def = setting.getDefinition();

                    if(HSGlobal.HSSettings.gameDataCheckBlacklist.includes(settingKey))
                        continue;

                    if("usesGameData" in def && def.usesGameData === true && setting.isEnabled()) {
                        setting.disable();
                    }
                }
            }
        }
        
        HSLogger.log(`${this.definition.settingName}: ${this.definition.enabled} -> ${!this.definition.enabled}`, this.context);

        if(!hasStateChanged) return;

        this.definition.enabled = newState;

        if(this.definition.settingType === 'boolean') {
            (this.definition as HSSettingBase<boolean>).settingValue  = newState;
            (this.definition as HSSettingBase<boolean>).calculatedSettingValue = newState;
        }

        const targetElement = (e.target as HTMLDivElement);

        if(newState) {
            targetElement.innerText = this.#settingEnabledString;
            targetElement.classList.remove('hs-disabled');
        } else {
            targetElement.innerText = this.#settingDisabledString;
            targetElement.classList.add('hs-disabled');
        }

        this.handleSettingAction('state', newState);
    }

    #handleManualToggle(newState: boolean) {
        HSLogger.log(`${this.definition.settingName}: ${this.definition.enabled} -> ${newState}`, this.context);

        const hasStateChanged = this.definition.enabled !== newState;

        if(!hasStateChanged) return;

        this.definition.enabled = newState;

        const toggleElement = document.querySelector(`#${this.definition.settingControl?.controlEnabledId}`) as HTMLDivElement;

        if(newState && toggleElement) {
            toggleElement.innerText = this.#settingEnabledString;
            toggleElement.classList.remove('hs-disabled');
        } else {
            toggleElement.innerText = this.#settingDisabledString;
            toggleElement.classList.add('hs-disabled');
        }

        this.handleSettingAction('state', newState);
        HSSettings.saveSettingsToStorage();
    }

    // For settings which have a settingAction defined, this will be called when the setting is initialized
    async initialAction(changeType: 'value' | 'state', initialState?: boolean) {
        await this.handleSettingAction(changeType, initialState);
    }

    // Handles a setting's settingAction for all settings
    protected async handleSettingAction(changeType: 'value' | 'state', newState?: boolean): Promise<void> {
        if(this.settingAction) {
            const action = this.settingAction;

            const actionConfig : HSSettingActionParams = {
                contextName: this.context,
                value: this.definition.calculatedSettingValue ?? null
            }

            if(this.definition.patchConfig && this.definition.patchConfig.patchName) {
                actionConfig.patchConfig = this.definition.patchConfig;
            }

            if(action && action instanceof Function) {
                if(changeType === "state") {
                    if(newState) {
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

    isEnabled() : boolean {
        return this.definition.enabled;
    }

    getCalculatedValue() {
        return this.definition.calculatedSettingValue;
    }

    toString() {
        return JSON.stringify(this.definition);
    }

    abstract getValue() : T;
    abstract setValue(value: T) : void;
    abstract handleChange(e: Event) : Promise<void>;
}

export class HSNumericSetting extends HSSetting<number> {
    constructor(
        settingDefinition: HSSettingBase<number>, 
        settingAction: ((params: HSSettingActionParams) => any) | null,
        enabledString: string,
        disabledString: string) {
            super(settingDefinition, settingAction, enabledString, disabledString);

            if(this.definition.settingValueMultiplier)
                this.definition.calculatedSettingValue = this.definition.settingValue * this.definition.settingValueMultiplier;
    }

    getValue() {
        return this.definition.settingValue;
    }

    setValue(value: number) {
        return this.definition.settingValue = value;
    }

    // Number type settings need to handle the change event differently
    // because they need to take settingValueMultiplier into account
    async handleChange(e: Event) {
        const newValue = parseFloat((e.target as HTMLInputElement).value);

        HSLogger.log(`${this.definition.settingName}: ${this.definition.settingValue} -> ${newValue}`, this.context);
        
        this.definition.settingValue = newValue;
        this.definition.calculatedSettingValue = newValue * this.definition.settingValueMultiplier;

        await super.handleSettingAction("value");
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
        return this.definition.settingValue = value;
    }

    async handleChange(e: Event) {
        const newValue = (e.target as HTMLInputElement).value;

        HSLogger.log(`${this.definition.settingName}: ${this.definition.settingValue} -> ${newValue}`, this.context);

        this.definition.settingValue = newValue;
        this.definition.calculatedSettingValue = newValue;
        await super.handleSettingAction("value");
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
        this.definition.enabled = value;
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

            if(this.definition.settingValueMultiplier)
                this.definition.calculatedSettingValue = this.definition.settingValue * this.definition.settingValueMultiplier;
    }

    getValue() {
        return this.definition.settingValue;
    }

    setValue(value: number) {
        //this.definition.settingValue = value;
    }

    // Number type settings need to handle the change event differently
    // because they need to take settingValueMultiplier into account
    async handleChange(e: Event) {
        const newValue = parseFloat((e.target as HTMLSelectElement).value);

        HSLogger.log(`${this.definition.settingName}: ${this.definition.settingValue} -> ${newValue}`, this.context);
        
        this.definition.settingValue = newValue;
        this.definition.calculatedSettingValue = newValue * this.definition.settingValueMultiplier;

        await super.handleSettingAction("value");
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
        //this.definition.settingValue = value;
    }

    async handleChange(e: Event) {
        const newValue = (e.target as HTMLSelectElement).value;

        HSLogger.log(`${this.definition.settingName}: ${this.definition.settingValue} -> ${newValue}`, this.context);

        this.definition.settingValue = newValue;
        this.definition.calculatedSettingValue = newValue;
        await super.handleSettingAction("value");
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

        if(stateElement) {
            stateElement.innerHTML = this.getDisplayValue();
        }

        HSSettings.saveSettingsToStorage();
    }

    async handleChange(e: Event) { }
}