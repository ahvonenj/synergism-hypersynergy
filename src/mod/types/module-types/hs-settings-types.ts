/*
    Type definition collection: HS settings types
    Description: Collection of types specific to hs-settings module
    Author: Swiffy, Shewchou
*/

import { HSSetting } from "../../class/hs-core/settings/hs-setting";
import { HSUICSelectOption, HTMLProps } from "./hs-ui-types";
import type { HSPlatformName } from "../../class/hs-core/hs-platform";

export type HSSettingType = number | string | string[] | boolean | null;
export type HSSettingRecord = Record<keyof HSSettingsDefinition, HSSetting<HSSettingType>>;

export interface HSSettingsDefinition {
    // Expand Cost Protection Settings
    expandCostProtection: ExpandCostProtectionSetting;

    // Hepteract Distributor Settings
    enableHepteractDistributor: EnableHepteractDistributorSetting;
    hepteractDistributorOpen: HepteractDistributorOpenSetting;
    hepteractDistributorAllowPartial: HepteractDistributorAllowPartialSetting;
    hepteractDistributorUseReducers: HepteractDistributorUseReducersSetting;
    hepteractDistributorTalismanAlone: HepteractDistributorTalismanAloneSetting;
    hepteractDistributorRatios: HepteractDistributorRatiosSetting;
    hepteractDistributorOrbsPercent: HepteractDistributorOrbsPercentSetting;
    hepteractDistributorKeep: HepteractDistributorKeepSetting;

    // Save import
    keepHeaderLayoutOnImport: KeepHeaderLayoutOnImportSetting;

    // Header loadout slots shown
    headerAmbrosiaSlotsShown: HeaderAmbrosiaSlotsShownSetting;

    // Notification Settings
    syncNotificationOpacity: SyncNotificationOpacitySetting;

    // UI Settings
    hideGameDialogs: HideGameDialogsSetting;
    hideGameDialogsNotify: HideGameDialogsNotifySetting;
    hiddenVanillaTabs: HiddenVanillaTabsSetting;
    editGameHeader: HSSettingBase<string>;
    compactChallengeText: HSSettingBase<boolean>;
    challengeProgressHeader: HSSettingBase<boolean>;
    challengeProgressLayout: HSSettingBase<string>;
    challengeProgressDetails: HSSettingBase<string>;
    challengeProgressShowNone: HSSettingBase<boolean>;
    corruptionHeaderControls: HSSettingBase<boolean>;
    corruptionHeaderInline: HSSettingBase<boolean>;
    corruptionHeaderAlwaysShown: HSSettingBase<boolean>;
    autoDismissOfflinePopup: AutoDismissOfflinePopupSetting;
    reloadOnLateLoaderStart: ReloadOnLateLoaderStartSetting;
    rememberSubtabs: RememberSubtabsSetting;

    // Log Settings
    logTimestamp: LogTimestampSetting;
    showDebugLogs: ShowDebugLogsSetting;

    // Mouse Settings
    reactiveMouseHover: ReactiveMouseHoverSetting;
    autoClick: AutoclickSetting;
    autoClickIgnoreElements: AutoClickIgnoreElementsSetting;

    // Timed save export
    autoExportSave: AutoExportSaveSetting;
    autoExportSaveLoadout: AutoExportSaveLoadoutSetting;
    autoExportSaveKeep: AutoExportSaveKeepSetting;

    // Ambrosia Settings
    persistentAmbrosiaLevels: PersistentAmbrosiaLevelsSetting;
    addTimeAutoLoadouts: AddTimeAutoLoadoutsSetting;
    autoLoadoutAdd: AutoLoadoutAddSetting;
    autoLoadoutTime: AutoLoadoutTimeSetting;
    ambrosiaMinibars: AmbrosiaMinibarsSetting;
    ambrosiaMinibarBorders: HSSettingBase<boolean>;
    ambrosiaRateHeader: AmbrosiaRateHeaderSetting;

    // Game Data Settings
    useGameData: UseGameDataSetting;

    // Auto Sing Settings
    startAutosing: StartAutosing;
    singularityNumber: SingularityNumber;
    autosingKeepAwake: HSSettingBase<boolean>;
    autosingNoAmbrosiaSwitch: HSSettingBase<boolean>;
    autosingEarlyCubeLoadout: AutosingEarlyCubeLoadout;
    autosingLateCubeLoadout: AutosingLateCubeLoadout;
    autosingQuarkLoadout: AutosingQuarkLoadout;
    autosingObtLoadout: AutosingObtLoadout;
    autosingOffLoadout: AutosingOffLoadout;
    autosingAmbrosiaLoadout: AutosingAmbrosiaLoadout;
    autosingStrategy: AutosingStrategy;

    // Advanced AutoSing Settings
    advancedDataCollection: AutosingAdvancedDataCollection; // disabled for now...
    autosing3to6DCubeOpeningPercent: Autosing3to6DCubeOpeningPercent;
    autosingTessBuildingAutoBuyPercent: AutosingTessBuildingAutoBuyPercent;
    autosingAutoChallTimerStart: AutosingAutoChallTimerStart;
    autosingAutoChallTimerExit: AutosingAutoChallTimerExit;
    autosingAutoChallTimerEnter: AutosingAutoChallTimerEnter;
    resetAutosingAdvanced: HSSettingBase<string>;

    // Heater Settings
    heaterTypeLoadoutSelections: HeaterTypeLoadoutSelectionsSetting;
    heaterUncheckedBranches: HeaterUncheckedBranchesSetting;
    heaterTickedBranches: HeaterTickedBranchesSetting;
    heaterWorkers: HeaterWorkersSetting;

    // QOL Buttons Settings
    hideMaxedGQUpgrades: QOLButtonsHideMaxedGQUpgradesSetting;
    enableGQDistributor: QOLButtonsEnableGQDistributorSetting;
    hideMaxedOctUpgrades: QOLButtonsHideMaxedOctUpgradesSetting;
    enableAutomationQuickBar: QOLButtonsEnableAutomationQuickBarSetting;
    matchOcteractIconSize: HSSettingBase<boolean>;
    matchOcteractText: HSSettingBase<boolean>;
    centerQuickbars: QOLButtonsCenterQuickbarsSetting;
    headerStatsAtBottom: QOLButtonsHeaderStatsAtBottomSetting;
    removeHeaderGap: HSSettingBase<boolean>;
    headerHideLoadoutIcons: HSSettingBase<boolean>;
    headerFitLoadoutSlots: HSSettingBase<boolean>;
    headerEditButton: HSSettingBase<boolean>;
    headerLongPressEditing: HSSettingBase<boolean>;

    // GQ Distributor Ratio Settings
    gqDistributorOpen: GQDistributorOpenSetting;
    gqDistributorRatios: GQDistributorRatiosSetting;
    gqDistributorBalanceInvestments: GQDistributorBalanceInvestmentsSetting;
    gqDistributorKeepSkippedShare: GQDistributorKeepSkippedShareSetting;
}

export interface AmbrosiaMinibarsSetting extends HSSettingBase<boolean> { }
export interface AmbrosiaRateHeaderSetting extends HSSettingBase<boolean> { }

export interface HSSettingControlOptions {
    min?: number;
    max?: number;
    step?: number;
    placeholder?: string;
}

export type HSSettingsControlType = "text" | "number" | "switch" | "select" | "state" | "button";
export type HSSettingJSONType = "numeric" | "string" | "boolean" | "selectnumeric" | "selectstring" | "selectstrings" | "state" | "button";

export interface HSSettingActionParams {
    contextName?: string,
    value?: any,
    disable?: boolean,
}

export interface HSSettingControlGroup {
    groupName: string;
    order: number;
}

export interface HSSettingControl {
    controlId: string;
    controlType: HSSettingsControlType;
    controlGroup: string;
    controlPage: string;
    controlEnabledId?: string;
    /** The setting this one belongs to: shown indented under its label. It must come before this one on the page */
    controlParent?: keyof HSSettingsDefinition;
    /** With controlParent: hidden while the parent's switch is off */
    controlHideWhenParentOff?: boolean;
    controlOptions?: HSSettingControlOptions;
    selectOptions?: HSUICSelectOption[];
    props?: HTMLProps;
}

export interface HSSettingControlPage {
    order: number;
    pageName: string;
    pageColor: string;
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
    /** Needs GDS: everywhere (true) or only on these platforms. Read it through HSSettings.usesGameData() */
    usesGameData?: boolean | HSPlatformName[];
    skipInit?: boolean;
    /** Never drawn in the settings panel: changed from elsewhere (header edit mode, a module's own UI) */
    hidden?: boolean;
    /** Shown in the settings panel only on these platforms (all when absent). The setting itself still works everywhere */
    platforms?: HSPlatformName[];
}

// Expand Cost Protection Settings
export interface ExpandCostProtectionSetting extends HSSettingBase<number> { }

// Hepteract Distributor Settings
export interface EnableHepteractDistributorSetting extends HSSettingBase<boolean> { }
export interface HepteractDistributorOpenSetting extends HSSettingBase<boolean> { }
export interface HepteractDistributorAllowPartialSetting extends HSSettingBase<boolean> { }
export interface HepteractDistributorUseReducersSetting extends HSSettingBase<boolean> { }
export interface HepteractDistributorTalismanAloneSetting extends HSSettingBase<boolean> { }
export interface HepteractDistributorRatiosSetting extends HSSettingBase<string> { }
export interface HepteractDistributorOrbsPercentSetting extends HSSettingBase<number> { }
export interface HepteractDistributorKeepSetting extends HSSettingBase<number> { }

// Save import
export interface KeepHeaderLayoutOnImportSetting extends HSSettingBase<boolean> { }

// Header loadout slots shown
export interface HeaderAmbrosiaSlotsShownSetting extends HSSettingBase<number> { }

// Notification Opacity Settings
export interface SyncNotificationOpacitySetting extends HSSettingBase<number> { }

// Log Settings
export interface LogTimestampSetting extends HSSettingBase<boolean> { }
export interface ShowDebugLogsSetting extends HSSettingBase<boolean> { }

// Mouse Settings
export interface ReactiveMouseHoverSetting extends HSSettingBase<number> { }
export interface AutoclickSetting extends HSSettingBase<number> { }
export interface AutoClickIgnoreElementsSetting extends HSSettingBase<boolean> { }
export interface HideGameDialogsSetting extends HSSettingBase<boolean> { }
export interface HideGameDialogsNotifySetting extends HSSettingBase<boolean> { }
export interface HiddenVanillaTabsSetting extends HSSettingBase<string[]> { }
export interface AutoDismissOfflinePopupSetting extends HSSettingBase<boolean> { }
export interface ReloadOnLateLoaderStartSetting extends HSSettingBase<boolean> { }
export interface RememberSubtabsSetting extends HSSettingBase<boolean> { }

// Timed save export
export interface AutoExportSaveSetting extends HSSettingBase<number> { }
export interface AutoExportSaveLoadoutSetting extends HSSettingBase<string> { }
export interface AutoExportSaveKeepSetting extends HSSettingBase<number> { }

// Ambrosia Settings
export interface PersistentAmbrosiaLevelsSetting extends HSSettingBase<boolean> { }
export interface AddTimeAutoLoadoutsSetting extends HSSettingBase<boolean> { }
export interface AutoLoadoutAddSetting extends HSSettingBase<string> { }
export interface AutoLoadoutTimeSetting extends HSSettingBase<string> { }

// Game Data Settings
export interface UseGameDataSetting extends HSSettingBase<boolean> { }

// Auto Sing Settings
export interface StartAutosing extends HSSettingBase<boolean> { }
export interface SingularityNumber extends HSSettingBase<number> { }
export interface AutosingEarlyCubeLoadout extends HSSettingBase<string> { }
export interface AutosingLateCubeLoadout extends HSSettingBase<string> { }
export interface AutosingQuarkLoadout extends HSSettingBase<string> { }
export interface AutosingAmbrosiaLoadout extends HSSettingBase<string> { }
export interface AutosingObtLoadout extends HSSettingBase<string> { }
export interface AutosingOffLoadout extends HSSettingBase<string> { }
export interface AutosingStrategy extends HSSettingBase<string> { }

// Advanced AutoSing Settings
export interface AutosingAdvancedDataCollection extends HSSettingBase<boolean> { }
export interface Autosing3to6DCubeOpeningPercent extends HSSettingBase<number> { }
export interface AutosingTessBuildingAutoBuyPercent extends HSSettingBase<number> { }
export interface AutosingAutoChallTimerStart extends HSSettingBase<number> { }
export interface AutosingAutoChallTimerExit extends HSSettingBase<number> { }
export interface AutosingAutoChallTimerEnter extends HSSettingBase<number> { }

// QOL Buttons Settings
export interface QOLButtonsHideMaxedGQUpgradesSetting extends HSSettingBase<boolean> { }
export interface QOLButtonsEnableGQDistributorSetting extends HSSettingBase<boolean> { }
export interface QOLButtonsHideMaxedOctUpgradesSetting extends HSSettingBase<boolean> { }
export interface QOLButtonsEnableAutomationQuickBarSetting extends HSSettingBase<boolean> { }
export interface QOLButtonsCenterQuickbarsSetting extends HSSettingBase<boolean> { }
export interface QOLButtonsHeaderStatsAtBottomSetting extends HSSettingBase<boolean> { }

// Talismans Settings

// GQ Distributor Ratio Settings
export interface GQDistributorOpenSetting extends HSSettingBase<boolean> { }
export interface GQDistributorRatiosSetting extends HSSettingBase<string> { }
export interface GQDistributorBalanceInvestmentsSetting extends HSSettingBase<boolean> { }
export interface GQDistributorKeepSkippedShareSetting extends HSSettingBase<boolean> { }

// Heater Settings
export interface HeaterTypeLoadoutSelectionsSetting extends HSSettingBase<string[]> { }
export interface HeaterUncheckedBranchesSetting extends HSSettingBase<string[]> { }
export interface HeaterTickedBranchesSetting extends HSSettingBase<string[]> { }
export interface HeaterWorkersSetting extends HSSettingBase<number> { }
