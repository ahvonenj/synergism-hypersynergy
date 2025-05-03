import { HSSettingActionParams } from "../../types/module-types/hs-settings-types";
import { HSAmbrosia } from "../hs-modules/hs-ambrosia";
import { HSPatches } from "../hs-modules/hs-patches";
import { HSGameData } from "./hs-gamedata";
import { HSLogger } from "./hs-logger";
import { HSModuleManager } from "./hs-module-manager";
import { HSMouse } from "./hs-mouse";

/*
    Class: HSSettingActions
    IsExplicitHSModule: No
    Description: 
        Helper wrapper for HSSettings.
        Encapsulates SettingActions and their functionality.
    Author: Swiffy
*/
export class HSSettingActions {
    // Record for SettingActions
    // If some setting in hs-settings.json has "settingAction" set, the action should be defined here
    #settingActions : Record<string, (params: HSSettingActionParams) => any> = {

        // Let this server as an EXAMPLE SETTINGACTION DEFINITION
        // NOTE THE EXPLICIT HANDLING OF WHEN PARAMS.DISABLE = TRUE
        // Care should be taken to handle this case so the setting will know what to do when it is enabled/disabled
        syncNotificationOpacity: async (params: HSSettingActionParams) => {
            const notifElement = document.querySelector('#notification') as HTMLDivElement;
            const context = params.contextName ?? "HSSettings";

            if(params.disable && params.disable === true) {
                notifElement.style.removeProperty('opacity');
            } else {
                const value = params.value;

                if(notifElement && value && value >= 0 && value <= 1) {
                    notifElement.style.opacity = value.toString();
                }
            }
        },

        logTimestamp: async (params: HSSettingActionParams) => {
            if(params.disable && params.disable === true) {
                HSLogger.setTimestampDisplay(false);
            } else {
                HSLogger.setTimestampDisplay(true);
            }
        },

        reactiveMouseHover: async (params: HSSettingActionParams) => {
            const context = params.contextName ?? "HSSettings";

            if(params.disable && params.disable === true) {
                HSMouse.clearInterval('hover');
            }
        },

        autoClick: async (params: HSSettingActionParams) => {
            const context = params.contextName ?? "HSSettings";

            if(params.disable && params.disable === true) {
                HSMouse.clearInterval('click');
            }
        },

        ambrosiaQuickBarAction: async (params: HSSettingActionParams) => {
            const context = params.contextName ?? "HSSettings";

            const ambrosiaMod = HSModuleManager.getModule<HSAmbrosia>('HSAmbrosia');

            if(ambrosiaMod) {
                if(params.disable && params.disable === true) {
                    await ambrosiaMod.destroyQuickBar();
                } else {
                    await ambrosiaMod.createQuickBar();
                }
            }
        },

        patch: async (params: HSSettingActionParams) => {
            const context = params.contextName ?? "HSSettings";

            if(!params.patchConfig || !params.patchConfig.patchName) {
                HSLogger.error("No patch config provided for setting action", context);
                return;
            }

            const patchMod = HSModuleManager.getModule<HSPatches>('HSPatches');

            if(patchMod) {
                if(params.disable && params.disable === true) {
                    console.log("Disabling patch", params.patchConfig.patchName, context);
                    await patchMod.revertPatch(params.patchConfig.patchName);
                } else {
                    console.log("Enabling patch", params.patchConfig.patchName, context);
                    await patchMod.applyPatch(params.patchConfig.patchName);
                }
            }
        },

        useGameData: async (params: HSSettingActionParams) => {
            const context = params.contextName ?? "HSSettings";

            const gameDataMod = HSModuleManager.getModule<HSGameData>('HSGameData');

            if(gameDataMod) {
                if(params.disable && params.disable === true) {
                    gameDataMod.stopSaveDataWatch();
                } else {
                    gameDataMod.startSaveDataWatch();
                }
            }
        },
    }

    constructor() {

    }

    getAction(actionName: string) : ((params: HSSettingActionParams) => any) | null {
        const self = this;

        if(actionName in this.#settingActions) {
            return (params: HSSettingActionParams) => {
                self.#settingActions[actionName](params);
            };
        } else {
            return null;
        }
    }
}