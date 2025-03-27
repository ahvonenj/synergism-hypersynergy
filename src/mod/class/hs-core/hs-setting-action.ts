import { HSSettingActionParams } from "../../types/hs-settings-types";
import { HSLogger } from "./hs-logger";

export class HSSettingAction {
    #settingActions : Record<string, (params: HSSettingActionParams) => any> = {
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