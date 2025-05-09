/*
    Type definition collection: HS settings types
    Description: Collection of types specific to hs-settings module
    Author: Swiffy
*/

import { HSSetting } from "../../class/hs-core/hs-setting";
import { HSPatch } from "../../class/patches/hs-patch";
import { HSUICSelectOption } from "./hs-ui-types";

export type HSSettingType = number | string | boolean;
export type HSSettingRecord = Record<keyof HSSettingsDefinition, HSSetting<HSSettingType>>;

export interface HSSettingsDefinition {
    // Expand Cost Protection Settings
    expandCostProtection: ExpandCostProtectionSetting;
    expandCostProtectionDoubleCap: ExpandCostProtectionDoubleCap
    expandCostProtectionNotifications: ExpandCostProtectionNotifications;

    // Notification Settings
    syncNotificationOpacity: SyncNotificationOpacitySetting;

    // Log Settings
    logTimestamp: LogTimestampSetting;
    showDebugLogs: ShowDebugLogsSetting;

    // Mouse Settings
    reactiveMouseHover: ReactiveMouseHoverSetting;
    autoClick: AutoclickSetting;
    autoClickIgnoreElements: AutoClickIgnoreElementsSetting;

    // Ambrosia Settings
    ambrosiaQuickBar: AmbrosiaQuickBarSetting;
    autoLoadout: AutoLoadoutSetting;
    autoLoadoutState: AutoLoadoutStateSetting;
    autoLoadoutAdd: AutoLoadoutAddSetting;
    autoLoadoutTime: AutoLoadoutTimeSetting;
    ambrosiaIdleSwap: AmbrosiaIdleSwapSetting;
    ambrosiaIdleSwapNormalLoadout: AmbrosiaIdleSwapNormalLoadoutSetting;
    ambrosiaIdleSwap100Loadout: AmbrosiaIdleSwap100LoadoutSetting;

    // Patch Settings
    patch_ambrosiaViewOverflow: PATCH_ambrosiaViewOverflow;
    patch_testPatch: PATCH_TestPatch;

    // Game Data Settings
    useGameData: UseGameDataSetting;
    stopSniffOnError: StopSniffOnErrorSetting;
    gameDataTurbo: GameDataTurboSetting;
}

export interface HSSettingControlOptions {
    min?: number;
    max?: number;
    step?: number;
    placeholder?: string;
}

export type HSSettingsControlType = "text" | "number" | "switch" | "select" | "state";
export type HSSettingJSONType = "numeric" | "string" | "boolean" | "selectnumeric" | "selectstring" | "state";

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
    selectOptions?: HSUICSelectOption[];
}

export interface HSPatchConfig {
    patchName: string;
}

export interface HSSettingBase<T> {
    enabled: boolean;
    settingName: string;
    settingBlockId?: string;
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
    usesGameData?: boolean;
}

// Expand Cost Protection Settings
export interface ExpandCostProtectionSetting extends HSSettingBase<number> {}
export interface ExpandCostProtectionDoubleCap extends HSSettingBase<boolean> {}
export interface ExpandCostProtectionNotifications extends HSSettingBase<boolean> {}

// Notification Opacity Settings
export interface SyncNotificationOpacitySetting extends HSSettingBase<number> {}

// Log Settings
export interface LogTimestampSetting extends HSSettingBase<boolean> {}
export interface ShowDebugLogsSetting extends HSSettingBase<boolean> {}

// Mouse Settings
export interface ReactiveMouseHoverSetting extends HSSettingBase<number> {}
export interface AutoclickSetting extends HSSettingBase<number> {}
export interface AutoClickIgnoreElementsSetting extends HSSettingBase<boolean> {}

// Ambrosia Settings
export interface AmbrosiaQuickBarSetting extends HSSettingBase<boolean> {}
export interface AutoLoadoutSetting extends HSSettingBase<boolean> {}
export interface AutoLoadoutStateSetting extends HSSettingBase<string> {}
export interface AutoLoadoutAddSetting extends HSSettingBase<string> {}
export interface AutoLoadoutTimeSetting extends HSSettingBase<string> {}

export interface AmbrosiaIdleSwapSetting extends HSSettingBase<boolean> {}
export interface AmbrosiaIdleSwapNormalLoadoutSetting extends HSSettingBase<string> {}
export interface AmbrosiaIdleSwap100LoadoutSetting extends HSSettingBase<string> {}


// Patch Settings
export interface PATCH_ambrosiaViewOverflow extends HSSettingBase<boolean> {}
export interface PATCH_TestPatch extends HSSettingBase<boolean> {}

// Game Data Settings
export interface UseGameDataSetting extends HSSettingBase<boolean> {}
export interface StopSniffOnErrorSetting extends HSSettingBase<boolean> {}
export interface GameDataTurboSetting extends HSSettingBase<boolean> {}
