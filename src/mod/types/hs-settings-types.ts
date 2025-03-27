export interface HSSettingsDefinition {
    expandCostProtection: ExpandCostProtectionSetting;
}

export interface HSSettingControlOptions {
    min?: number;
    max?: number;
    step?: number;
    placeholder?: string;
}

export type HSSettingsControlType = "text" | "number" | "switch";

export type HSSettingActionParams = {
    contextName?: string,
    value?: any,
    disable?: boolean
}

export interface HSSettingControl {
    controlId: string;
    controlType: HSSettingsControlType;
    controlEnabledId?: string;
    controlOptions?: HSSettingControlOptions;
}

interface HSSettingBase<T> {
    enabled: boolean;
    settingName: string;
    settingDescription: string;
    settingValue: T;
    defaultValue?: T;
    settingControl?: HSSettingControl;
    settingAction?: string;
}

export interface ExpandCostProtectionSetting extends HSSettingBase<number> {

}