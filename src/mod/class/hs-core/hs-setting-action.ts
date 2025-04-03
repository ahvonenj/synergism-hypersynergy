import { HSSettingActionParams } from "../../types/hs-settings-types";
import { HSLogger } from "./hs-logger";
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
                    HSLogger.log(`Set notification opacity to ${value}`, context);
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
        }
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