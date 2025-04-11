import { HSSettingActionParams, HSSettingBase, HSSettingType } from "../../types/module-types/hs-settings-types";
import { HSLogger } from "./hs-logger";

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
        this.definition.enabled = true;
    }

    disable() {
        this.definition.enabled = false;
    }

    async handleToggle(e: MouseEvent) {
        HSLogger.log(`${this.definition.settingName}: ${this.definition.enabled} -> ${!this.definition.enabled}`, this.context);
        
        const newState = !this.definition.enabled;
        this.definition.enabled = newState;

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

    async initialAction(changeType: 'value' | 'state', initialState?: boolean) {
        await this.handleSettingAction(changeType, initialState);
    }

    protected async handleSettingAction(changeType: 'value' | 'state', newState?: boolean): Promise<void> {
        if(this.settingAction) {
            const action = this.settingAction;

            if(action && action instanceof Function) {
                if(changeType === "state") {
                    if(newState) {
                        await action({
                            contextName: this.context,
                            value: this.definition.calculatedSettingValue ?? null,
                            disable: false
                        });
                    } else {
                        await action({
                            contextName: this.context,
                            value: this.definition.calculatedSettingValue ?? null,
                            disable: true
                        });
                    }
                } else {
                    await action({
                        contextName: this.context,
                        value: this.definition.calculatedSettingValue ?? null,
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

    async handleChange(e: Event) { }
}