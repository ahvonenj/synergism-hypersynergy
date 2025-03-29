import { HSSettingActionParams } from "../../types/hs-settings-types";
import { HSLogger } from "./hs-logger";

/*
    Class: HSSettingAction
    IsExplicitHSModule: No
    Description: 
        Helper wrapper for HSSettings.
        Encapsulates SettingActions and their functionality.
    Author: Swiffy
*/
export class HSSettingAction {
    // Record for SettingActions
    // If some setting in hs-settings.json has "settingAction" set, the action should be defined here
    #settingActions : Record<string, (params: HSSettingActionParams) => any> = {

        // Let this server as an EXAMPLE SETTINGACTION DEFINITION
        // NOTE THE EXPLICIT HANDLING OF WHEN PARAMS.DISABLE = TRUE
        // Care should be taken to handle this case so the setting will know what to do when it is enabled/disabled
        syncNotificationOpacity: (params: HSSettingActionParams) => {
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