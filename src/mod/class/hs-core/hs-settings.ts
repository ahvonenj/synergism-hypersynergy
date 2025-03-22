import { HSSettingsDefinition } from "../../types/hs-settings-types";
import { HSModule } from "./hs-module";

export class HSSettings extends HSModule {

    #defaultSettings : HSSettingsDefinition = {
        expandCostProtection: {
            settingName: "expandCostProtection",
            enabled: true,
            settingValue: 50
        }
    };

    #settings : HSSettingsDefinition;

    constructor(moduleName: string, context: string) {
        super(moduleName, context);
        this.#settings = this.#defaultSettings;
    }

    init(): void {
    
    }

    getSetting<K extends keyof HSSettingsDefinition>(key: K): HSSettingsDefinition[K] {
        return this.#settings[key];
    }

    setSetting<K extends keyof HSSettingsDefinition>(key: K, setting: HSSettingsDefinition[K]): void {
        this.#settings[key] = setting;
    }
}