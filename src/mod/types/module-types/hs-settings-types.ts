/*
    Type definition collection: HS settings types
    Description: Collection of types specific to hs-settings module
    Author: Swiffy
*/

import { HSSetting } from "../../class/hs-core/hs-setting";
import { HSPatch } from "../../class/patches/hs-patch";

export type HSSettingType = number | string | boolean;
export type HSSettingRecord = Record<keyof HSSettingsDefinition, HSSetting<HSSettingType>>;

export interface HSSettingsDefinition {
    expandCostProtection: ExpandCostProtectionSetting;
    expandCostProtectionDoubleCap: ExpandCostProtectionDoubleCap
    expandCostProtectionNotifications: ExpandCostProtectionNotifications;
    syncNotificationOpacity: SyncNotificationOpacitySetting;
    logTimestamp: LogTimestampSetting;
    showDebugLogs: ShowDebugLogsSetting;
    reactiveMouseHover: ReactiveMouseHoverSetting;
    autoClick: AutoclickSetting;
    autoClickIgnoreElements: AutoClickIgnoreElementsSetting;
    ambrosiaQuickBar: AmbrosiaQuickBar;

    PATCH_ambrosiaViewOverflow: PATCH_ambrosiaViewOverflow;
}

export interface HSSettingControlOptions {
    min?: number;
    max?: number;
    step?: number;
    placeholder?: string;
}

export type HSSettingsControlType = "text" | "number" | "switch";
export type HSSettingJSONType = "numeric" | "string" | "boolean";

export interface HSSettingActionParams {
    contextName?: string,
    value?: any,
    disable?: boolean,
    patchConfig?: HSPatchConfig;
}

export interface HSSettingControlGroup {
    groupName: string;
    order: number;
}

export interface HSSettingControl {
    controlId: string;
    controlType: HSSettingsControlType;
    controlGroup: string;
    controlEnabledId?: string;
    controlOptions?: HSSettingControlOptions;
}

export interface HSPatchConfig {
    patchName: string;
}

export interface HSSettingBase<T> {
    enabled: boolean;
    settingName: string;
    settingDescription: string;
    settingHelpText?: string;
    settingType: HSSettingJSONType;
    settingValue: T;
    calculatedSettingValue: T;
    settingValueMultiplier: T;
    defaultValue?: T;
    settingControl?: HSSettingControl;
    settingAction?: string;
    patchConfig?: HSPatchConfig;
}

export interface ExpandCostProtectionSetting extends HSSettingBase<number> {}
export interface ExpandCostProtectionDoubleCap extends HSSettingBase<boolean> {}
export interface ExpandCostProtectionNotifications extends HSSettingBase<boolean> {}
export interface SyncNotificationOpacitySetting extends HSSettingBase<number> {}
export interface LogTimestampSetting extends HSSettingBase<boolean> {}
export interface ShowDebugLogsSetting extends HSSettingBase<boolean> {}
export interface ReactiveMouseHoverSetting extends HSSettingBase<number> {}
export interface AutoclickSetting extends HSSettingBase<number> {}
export interface AutoClickIgnoreElementsSetting extends HSSettingBase<boolean> {}
export interface AmbrosiaQuickBar extends HSSettingBase<boolean> {}

export interface PATCH_ambrosiaViewOverflow extends HSSettingBase<boolean> {}
