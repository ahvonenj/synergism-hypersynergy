export interface HSSettingsDefinition {
    expandCostProtection: ExpandCostProtectionSetting;
}

interface HSSettingBase<T> {
    enabled: boolean;
    settingName: string;
    settingValue: T;
}

export interface ExpandCostProtectionSetting extends HSSettingBase<number> {

}