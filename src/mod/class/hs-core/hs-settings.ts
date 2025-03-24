import { HSSettingsDefinition } from "../../types/hs-settings-types";
import { HSUtils } from "../hs-utils/hs-utils";
import { HSLogger } from "./hs-logger";
import { HSModule } from "./hs-module";
import settings from "inline:../../resource/json/hs-settings.json";

export class HSSettings extends HSModule {

    static CURRENT_VERSION = '1.3.0';
    static #staticContext = '';

    static #defaultSettings : HSSettingsDefinition;
    static #settings : HSSettingsDefinition;

    static #settingsParsed = false;
    static #settingsSynced = false;

    constructor(moduleName: string, context: string) {
        super(moduleName, context);

        HSSettings.#staticContext = this.context;

        HSLogger.log(`Parsing mod settings`, this.context);

        try {
            HSSettings.#defaultSettings = JSON.parse(settings) as HSSettingsDefinition;
            HSSettings.#settings = HSSettings.#defaultSettings;
            HSSettings.#settingsParsed = true;
        } catch (e) {
            HSLogger.error(`Error parsing mod settings ${e}`, this.context);
        }
    }

    init(): void {}

    static syncSettings() {
        HSLogger.log(`Syncing mod settings`, HSSettings.#staticContext);

        if(!HSSettings.#settingsParsed) {
            HSLogger.error(`Could not sync settings - settings not parsed yet`, HSSettings.#staticContext);
            return;
        }

        for (const [key, setting] of HSUtils.typedObjectEntries(HSSettings.#defaultSettings)) {
            HSLogger.log(`Syncing ${key} settings`, HSSettings.#staticContext);

            if(setting.settingControl) {
                const controlType = setting.settingControl.controlType;

                // Switch control doesn't need value input, thus handled separately
                if(controlType !== "switch") {
                    const valueElement = document.querySelector(setting.settingControl.controlSelector) as HTMLInputElement;

                    if(valueElement) {
                        valueElement.addEventListener('change', function(e) {
                            HSSettings.#handleSettingChange(e, key);
                        });
                    }

                    if(setting.settingControl.controlEnabledSelector) {
                        const toggleElement = document.querySelector(setting.settingControl.controlEnabledSelector) as HTMLButtonElement;

                        if(toggleElement) {
                            toggleElement.addEventListener('click', function(e) {
                                HSSettings.#handleSettingToggle(e, key);
                            });
                        }
                    }
                } else {
                    // Not implemented
                }
            }
        }
    }

    static #handleSettingChange<K extends keyof HSSettingsDefinition>(e: Event, settingKey: K) {
        const setting = HSSettings.#settings[settingKey];
        const oldValue = setting.settingValue;
        const newValue = (e.target as HTMLInputElement).value;

        HSLogger.log(`Setting change caught for ${settingKey}: ${oldValue} -> ${newValue}`, HSSettings.#staticContext);

        try {
            HSSettings.#settings[settingKey].settingValue = parseFloat(newValue);
        } catch (e) {
            HSLogger.warn(`Error parsing setting value for ${settingKey}`, HSSettings.#staticContext);
        }
    }

    static #handleSettingToggle<K extends keyof HSSettingsDefinition>(e: Event, settingKey: K) {
        const setting = HSSettings.#settings[settingKey];
        const oldState = setting.enabled;
        const newState = !oldState;

        HSLogger.log(`Setting toggle caught for ${settingKey}: ${oldState} -> ${newState}`, HSSettings.#staticContext);

        HSSettings.#settings[settingKey].enabled = newState;
    }

    static getSetting<K extends keyof HSSettingsDefinition>(key: K): HSSettingsDefinition[K] {
        return this.#settings[key];
    }

    static setSetting<K extends keyof HSSettingsDefinition>(key: K, setting: HSSettingsDefinition[K]): void {
        this.#settings[key] = setting;
    }
}