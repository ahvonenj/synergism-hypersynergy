export interface HSSettingsDefinition {
    expandCostProtection: ExpandCostProtectionSetting;
}

export interface HSSettingControl {
    controlSelector: string;
    controlType: "text" | "number" | "switch";
    controlEnabledSelector?: string;
}

interface HSSettingBase<T> {
    enabled: boolean;
    settingName: string;
    settingValue: T;
    settingControl?: HSSettingControl;
}

export interface ExpandCostProtectionSetting extends HSSettingBase<number> {

}