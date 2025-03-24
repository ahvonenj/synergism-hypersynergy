export interface HSSettingsDefinition {
    expandCostProtection: ExpandCostProtectionSetting;
}

export interface HSSettingControlOptions {
    min?: number;
    max?: number;
    step?: number;
    placeholder?: string;
}

export interface HSSettingControl {
    controlSelector: string;
    controlType: "text" | "number" | "switch";
    controlEnabledSelector?: string;
    controlOptions?: HSSettingControlOptions;
}

interface HSSettingBase<T> {
    enabled: boolean;
    settingName: string;
    settingValue: T;
    settingControl?: HSSettingControl;
}

export interface ExpandCostProtectionSetting extends HSSettingBase<number> {

}