import { HSSettingActionParams } from "../../../types/module-types/hs-settings-types";
import { HSAmbrosia } from "../../hs-modules/hs-ambrosia/hs-ambrosia";
import { HSGameData } from "../gds/hs-gamedata";
import { HSLogger } from "../hs-logger";
import { HSModule } from "../module/hs-module";
import { HSModuleManager } from "../module/hs-module-manager";
import { HSMouse } from "../hs-mouse";
import { HSAutosing } from "../../hs-modules/hs-autosing/hs-autosing";
import { HSAutosingStrategyModal } from "../../hs-modules/hs-autosing/ui/hs-autosing-strategy-modal";
import { HSAutosingStrategyControls } from "../../hs-modules/hs-autosing/ui/hs-autosing-strategy-controls";
import { HSSettings } from "./hs-settings";
import { HSSettingsUI } from "./hs-settings-ui";
import { HSQOLButtons } from "../../hs-modules/hs-qol-buttons/hs-qol-buttons";
import { HSHepteractDistributor } from "../../hs-modules/hs-hepteracts/hs-hepteract-distributor";
import { HSPerksFind } from "../../hs-modules/hs-perks-find/hs-perks-find";
import { HSAutoExport } from "../../hs-modules/hs-auto-export/hs-auto-export";
import { HSGlobal } from "../hs-global";
import { HSHiddenDialogs } from "../dialogs/hs-hidden-dialogs";
import { HSOcteractHeader } from "../header/hs-octeract-header";
import { HSHeaderGap } from "../header/hs-header-gap";
import { HSHeaderEditSettings } from "../header/hs-header-edit-settings";
import { HSHeaderChallengeProgress } from "../header/hs-header-challenge-progress";
import { HSHeaderChallengeModule } from "../header/hs-header-challenge-module";
import { HSCorruptionHeader } from "../header/hs-corruption-header";
import { HSElevatorHeader } from "../header/hs-elevator-header";

// Action of an on/off setting that belongs to a module: `on` when the setting is on, `off` when it is off.
// Does nothing if the module isn't loaded.
function moduleToggle<T extends HSModule>(
    moduleName: string,
    on: (mod: T, params: HSSettingActionParams) => unknown,
    off: (mod: T, params: HSSettingActionParams) => unknown
): (params: HSSettingActionParams) => Promise<void> {
    return async (params: HSSettingActionParams) => {
        const mod = HSModuleManager.getModule<T>(moduleName);
        if (!mod) return;

        await (params.disable === true ? off(mod, params) : on(mod, params));
    };
}

/**
 * Class: HSSettingActions
 * IsExplicitHSModule: No
 * Description: 
 *     Helper wrapper for HSSettings.
 *     Encapsulates SettingActions and their functionality.
 * Author: Swiffy, Shewchou
*/
export class HSSettingActions {
    // Record for SettingActions
    // If some setting in hs-settings.json has "settingAction" set, the action should be defined here
    #settingActions: Record<string, (params: HSSettingActionParams) => any> = {

        // Let this server as an EXAMPLE SETTINGACTION DEFINITION
        // NOTE THE EXPLICIT HANDLING OF WHEN PARAMS.DISABLE = TRUE
        // Care should be taken to handle this case so the setting will know what to do when it is enabled/disabled
        syncNotificationOpacity: async (params: HSSettingActionParams) => {
            const notifElement = document.querySelector('#notification') as HTMLDivElement;

            if (params.disable && params.disable === true) {
                notifElement.style.removeProperty('opacity');
            } else {
                const value = params.value;

                if (notifElement && value && value >= 0 && value <= 1) {
                    notifElement.style.opacity = value.toString();
                }
            }
        },

        // "Hide game dialogs": the checkbox in the game's Confirm and Alert, and the hidden dialogs answered.
        // Also run at load, which adds the ready-made entries a newer mod version brought.
        hideGameDialogs: async (params: HSSettingActionParams) => {
            HSHiddenDialogs.setEnabled(!params.disable);
        },

        logTimestamp: async (params: HSSettingActionParams) => {
            if (params.disable && params.disable === true) {
                HSLogger.setTimestampDisplay(false);
            } else {
                HSLogger.setTimestampDisplay(true);
            }
        },

        showDebugLogs: async (params: HSSettingActionParams) => {
            HSLogger.updateDebugEnabled();
        },

        reactiveMouseHover: async (params: HSSettingActionParams) => {
            if (params.disable && params.disable === true) {
                HSMouse.clearInterval('hover');
            }
        },

        autoClick: async (params: HSSettingActionParams) => {
            if (params.disable && params.disable === true) {
                HSMouse.clearInterval('click');
            }
        },

        ambrosiaMinibarAction: moduleToggle<HSAmbrosia>('HSAmbrosia',
            (mod, params) => {
                // Where they need GDS (bookmarklet: no live player to read), they turn it on
                const minibars = HSSettings.getSetting('ambrosiaMinibars')?.getDefinition();
                const gameDataSetting = HSSettings.getSetting('useGameData');
                if (minibars && HSSettings.usesGameData(minibars) && !gameDataSetting?.isEnabled()) {
                    gameDataSetting?.enable();
                }
                return mod.enableBerryMinibars();
            },
            (mod) => mod.disableBerryMinibars()
        ),
        // A class on <html>, so it applies to the bars wherever they are (hs-ambrosia-minibars.css)
        ambrosiaMinibarBordersAction: async (params: HSSettingActionParams) => {
            document.documentElement.classList.toggle('hs-minibars-framed', params.disable !== true);
        },

        ambrosiaRateHeaderAction: moduleToggle<HSAmbrosia>('HSAmbrosia',
            (mod) => mod.enableRateHeader(),
            (mod) => mod.disableRateHeader()
        ),

        hiddenVanillaTabsAction: async (params: HSSettingActionParams) => {
            HSSettingsUI.applyHiddenVanillaTabsSetting();
        },

        editGameHeaderAction: async () => {
            await HSHeaderEditSettings.openEditor();
        },

        compactChallengeTextAction: async (params: HSSettingActionParams) => {
            HSHeaderChallengeProgress.setEnabled(params.disable !== true);
        },

        challengeProgressHeaderAction: async (params: HSSettingActionParams) => {
            if (params.disable === true) HSHeaderChallengeModule.disable();
            else HSHeaderChallengeModule.enable();
        },

        // The game's Corruption level header module, which is in the page from the start
        corruptionHeaderControlsAction: async (params: HSSettingActionParams) => {
            if (params.disable === true) HSCorruptionHeader.disableControls();
            else HSCorruptionHeader.enableControls();
        },
        corruptionHeaderInlineAction: async (params: HSSettingActionParams) => {
            HSCorruptionHeader.setInline(params.disable !== true);
        },
        corruptionHeaderAlwaysShownAction: async (params: HSSettingActionParams) => {
            HSCorruptionHeader.setAlwaysShown(params.disable !== true);
        },

        // The game's Singularity count header module, which is in the page from the start
        singularityHeaderElevatorAction: async (params: HSSettingActionParams) => {
            if (params.disable === true) HSElevatorHeader.disable();
            else HSElevatorHeader.enable();
        },

        // Not awaited: the GDS start and stop run on their own.
        // Only bookmarklet players have the setting: elsewhere GDS always runs, even with an OFF saved before.
        useGameData: moduleToggle<HSGameData>('HSGameData',
            (mod) => { void mod.enableGDS(); },
            (mod) => { void (mod.isGDSWanted() ? mod.enableGDS() : mod.disableGDS()); }
        ),

        persistentAmbrosiaLevelsAction: moduleToggle<HSAmbrosia>('HSAmbrosia',
            (mod) => mod.applyPersistentAmbrosiaLevelsSetting(true),
            (mod) => mod.applyPersistentAmbrosiaLevelsSetting(false)
        ),

        addTimeAutoLoadoutsAction: moduleToggle<HSAmbrosia>('HSAmbrosia',
            (mod) => mod.enableAutoLoadout(),
            (mod) => mod.disableAutoLoadout()
        ),

        startAutosingAction: async (params: HSSettingActionParams) => {
            const context = params.contextName ?? "HSSettings";

            if (!params.disable && !HSGlobal.General.isModFullyLoaded) {
                HSLogger.log("Hypersynergism is still loading. Please wait before starting Auto-Sing.", context);
                HSSettings.getSetting('startAutosing')?.disable();
                return;
            }

            const autosingMod = HSModuleManager.getModule<HSAutosing>('HSAutosing');
            if (autosingMod) {
                if (params.disable && params.disable === true) {
                    // Review mode: we stop autosing process but keep the modal visible
                    autosingMod.stopAutosing({ showReviewModal: true });
                } else {
                    await autosingMod.enableAutoSing();
                }
            }
        },

        autosingKeepAwakeAction: moduleToggle<HSAutosing>('HSAutosing',
            (mod) => mod.setKeepAwake(true),
            (mod) => mod.setKeepAwake(false)
        ),

        autosingNoAmbrosiaSwitchAction: moduleToggle<HSAutosing>('HSAutosing',
            (mod) => mod.setAmbrosiaSwitchesOff(true),
            (mod) => mod.setAmbrosiaSwitchesOff(false)
        ),

        createAutosingStrategy: async (params: HSSettingActionParams) => {
            await HSAutosingStrategyModal.open();
        },

        editAutosingStrategy: async (params: HSSettingActionParams) => {
            await HSAutosingStrategyControls.editSelectedStrategy();
        },
        deleteAutosingStrategy: async (params: HSSettingActionParams) => {
            await HSAutosingStrategyControls.deleteSelectedStrategy();
        },

        exportAutosingStrategy: async (params: HSSettingActionParams) => {
            await HSAutosingStrategyControls.exportSelectedStrategy();
        },

        importAutosingStrategy: async (params: HSSettingActionParams) => {
            await HSAutosingStrategyControls.importStrategy();
        },

        resetAutosingAdvancedAction: async () => {
            HSSettingsUI.resetAutosingAdvancedSettings();
        },

        // A class on <html>, so it applies whenever #quickbarsRow is created (hs-quickbars.css)
        centerQuickbarsAction: async (params: HSSettingActionParams) => {
            document.documentElement.classList.toggle('hs-quickbars-centered', params.disable !== true);
        },

        // A class on <html>: CSS order only, the game's DOM stays as it is (hs-header-edit-settings.css)
        headerStatsAtBottomAction: async (params: HSSettingActionParams) => {
            document.documentElement.classList.toggle('hs-header-stats-bottom', params.disable !== true);
        },
        removeHeaderGapAction: async (params: HSSettingActionParams) => {
            HSHeaderGap.setEnabled(params.disable !== true);
        },
        // A class on <html> (hs-header-edit-settings.css)
        headerHideLoadoutIconsAction: async (params: HSSettingActionParams) => {
            document.documentElement.classList.toggle('hs-header-no-loadout-icons', params.disable !== true);
        },
        // A class on <html> while off (hs-header-loadout-icons.css): the default look needs nothing before the
        // settings load
        headerFitLoadoutSlotsAction: async (params: HSSettingActionParams) => {
            document.documentElement.classList.toggle('hs-header-game-loadout-slots', params.disable === true);
        },
        // A class on <html>: the button itself is created once (HSHeaderEditSettings.install)
        headerEditButtonAction: async (params: HSSettingActionParams) => {
            document.documentElement.classList.toggle('hs-header-edit-button', params.disable !== true);
        },
        headerLongPressEditingAction: async (params: HSSettingActionParams) => {
            window.__HS_headerLongPressEnabled = params.disable !== true;
        },

        hideMaxedGQUpgradesAction: async (params: HSSettingActionParams) => {
            const qolButtonsMod = HSModuleManager.getModule<HSQOLButtons>('HSQOLButtons');
            if (qolButtonsMod) {
                qolButtonsMod.setMaxedGQUpgradesVisibility();
            }
        },

        hideMaxedOctUpgradesAction: async (params: HSSettingActionParams) => {
            const qolButtonsMod = HSModuleManager.getModule<HSQOLButtons>('HSQOLButtons');
            if (qolButtonsMod) {
                qolButtonsMod.setMaxedOctUpgradesVisibility();
            }
        },

        enableGQDistributorAction: moduleToggle<HSQOLButtons>('HSQOLButtons',
            (mod) => mod.showGQDistributor(),
            (mod) => mod.hideGQDistributor()
        ),

        autoExportSaveFolderAction: async (params: HSSettingActionParams) => {
            await HSModuleManager.getModule<HSAutoExport>('HSAutoExport')?.chooseFolder();
        },

        autoExportSaveForgetFolderAction: async (params: HSSettingActionParams) => {
            await HSModuleManager.getModule<HSAutoExport>('HSAutoExport')?.forgetFolder();
        },

        enableHepteractDistributorAction: moduleToggle<HSHepteractDistributor>('HSHepteractDistributor',
            (mod) => mod.showDistributor(),
            (mod) => mod.hideDistributor()
        ),

        perksFindAction: moduleToggle<HSPerksFind>('HSPerksFind',
            (mod) => mod.show(),
            (mod) => mod.hide()
        ),

        enableAutomationQuickBarAction: moduleToggle<HSQOLButtons>('HSQOLButtons',
            (mod) => mod.enableAutomationQuickbar(),
            (mod) => mod.disableAutomationQuickbar()
        ),

        matchOcteractIconSizeAction: async (params: HSSettingActionParams) => {
            document.documentElement.classList.toggle('hs-match-octeract-icon-size', params.disable !== true);
        },
        matchOcteractTextAction: async (params: HSSettingActionParams) => {
            HSOcteractHeader.setConsistentText(params.disable !== true);
        }
    }

    constructor() { }

    getAction(actionName: string): ((params: HSSettingActionParams) => any) | null {
        const self = this;

        if (actionName in this.#settingActions) {
            // The action's promise is not returned, on purpose: no caller waits for a setting action
            // (at load, each one would hold back the next settings). So a failure is logged here.
            return (params: HSSettingActionParams) => {
                void (async () => self.#settingActions[actionName](params))().catch((err) => {
                    HSLogger.error(`Setting action ${actionName} failed: ${err}`, params.contextName ?? "HSSettings");
                    console.error(err);
                });
            };
        } else {
            return null;
        }
    }
}
