/*
    Type definition collection: HS settings types
    Description: Collection of types specific to hs-settings module
    Author: Swiffy
*/

import { HSSetting } from "../class/hs-core/hs-setting";
import { WithRequired } from "./hs-typescript-functions";

export type HSSettingRecord = Record<keyof HSSettingsDefinition, HSSetting<number | string | boolean>>;

export interface HSSettingsDefinition {
    expandCostProtection: ExpandCostProtectionSetting;
    syncNotificationOpacity: SyncNotificationOpacitySetting;
    logTimestamp: LogTimestampSetting;
    reactiveMouseHover: ReactiveMouseHoverSetting;
    autoClick: AutoclickSetting;
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

export interface HSSettingBase<T> {
    enabled: boolean;
    settingName: string;
    settingDescription: string;
    settingHelpText?: string;
    settingType: "numeric" | "string" | "boolean";
    settingValue: T;
    calculatedSettingValue: T;
    settingValueMultiplier: T;
    defaultValue?: T;
    settingControl?: HSSettingControl;
    settingAction?: string;
}

export interface ExpandCostProtectionSetting extends HSSettingBase<number> {}
export interface SyncNotificationOpacitySetting extends HSSettingBase<number> {}
export interface LogTimestampSetting extends HSSettingBase<boolean> {}
export interface ReactiveMouseHoverSetting extends HSSettingBase<number> {}
export interface AutoclickSetting extends HSSettingBase<number> {}