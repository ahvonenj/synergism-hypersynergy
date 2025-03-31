import { HSSettingsControlType, HSSettingsDefinition } from "../../types/hs-settings-types";
import { HSUtils } from "../hs-utils/hs-utils";
import { HSLogger } from "./hs-logger";
import { HSModule } from "./hs-module";
import settings from "inline:../../resource/json/hs-settings.json";
import { HSUI } from "./hs-ui";
import { HSUIC } from "./hs-ui-components";
import { HSInputType } from "../../types/hs-ui-types";
import { HSSettingAction } from "./hs-setting-action";

/*
    Class: HSSettings
    IsExplicitHSModule: Yes
    Description: 
        Hypersynergism's settings module.
        Responsibilities include:
            - Parsing settings from JSON
            (- Saving and loading settings)
            - Building the settings panel with setting inputs
            - Binding appropriate events to setting changes and on/off toggles
            - Keeping internal settings states in sync with DOM
    Author: Swiffy
*/
export class HSSettings extends HSModule {
    static #staticContext = '';

    static #defaultSettings : HSSettingsDefinition;
    static #settings : HSSettingsDefinition;

    static #settingsParsed = false;
    static #settingsSynced = false;

    static #settingEnabledString = "✓";
    static #settingDisabledString = "✗";

    static #settingAction : HSSettingAction;

    constructor(moduleName: string, context: string) {
        super(moduleName, context);

        HSSettings.#staticContext = this.context;
        HSSettings.#settingAction = new HSSettingAction();

        HSLogger.log(`Parsing mod settings`, this.context);

        try {
            // Parse the JSON settings
            const parsedSettings = JSON.parse(settings) as HSSettingsDefinition;
        
            // Set default values for each setting
            for (const [key, setting] of Object.typedEntries(parsedSettings)) {
                parsedSettings[key].defaultValue = setting.settingValue;
            }

            HSSettings.#defaultSettings = parsedSettings;
            HSSettings.#settings = HSSettings.#defaultSettings;
            HSSettings.#settingsParsed = true;
        } catch (e) {
            HSLogger.error(`Error parsing mod settings ${e}`, this.context);
        }
    }

    async init(): Promise<void> {
        this.isInitialized = true;
    }

    static syncSettings() {
        HSLogger.log(`Syncing mod settings`, HSSettings.#staticContext);

        if(!HSSettings.#settingsParsed) {
            HSLogger.error(`Could not sync settings - settings not parsed yet`, HSSettings.#staticContext);
            return;
        }

        // Update the setting UI controls with the configured values in hs-settings.json
        for (const [key, setting] of Object.typedEntries(HSSettings.#settings)) {
            HSLogger.log(`Syncing ${key} settings`, HSSettings.#staticContext);

            const controlSettings = setting.settingControl;

            if(controlSettings) {
                const controlType = controlSettings.controlType;
                const controlOptions = controlSettings.controlOptions;

                // Switch control doesn't need value input, thus handled separately
                if(controlType !== "switch") {
                    const valueElement = document.querySelector(`#${controlSettings.controlId}`) as HTMLInputElement;

                    if(valueElement) {
                        if(controlType === "number" && controlOptions) {
                            if('min' in controlOptions) valueElement.setAttribute('min', controlOptions.min!.toString());
                            if('max' in controlOptions) valueElement.setAttribute('max', controlOptions.max!.toString());
                            if('step' in controlOptions) valueElement.setAttribute('step', controlOptions.step!.toString());
                        } else if(controlType === "text" && controlOptions) {
                            if('placeholder' in controlOptions) valueElement.setAttribute('placeholder', controlOptions.placeholder!);
                        }

                        // Set the input value to the JSON setting value
                        valueElement.value = setting.settingValue.toString();

                        // Listen for changes in the UI input to change the setting value
                        valueElement.addEventListener('change', function(e) {
                            HSSettings.#handleSettingChange(e, key);
                        });
                    }

                    // This sets up the  "✓" / "✗" button next to the setting input
                    if(controlSettings.controlEnabledId) {
                        const toggleElement = document.querySelector(`#${controlSettings.controlEnabledId}`) as HTMLDivElement;

                        if(toggleElement) {
                            if(setting.enabled) {
                                toggleElement.innerText = HSSettings.#settingEnabledString;
                                toggleElement.classList.remove('hs-disabled');
                            } else {
                                toggleElement.innerText = HSSettings.#settingDisabledString;
                                toggleElement.classList.add('hs-disabled');
                            }

                            // Handle toggling the setting on/off
                            toggleElement.addEventListener('click', function(e) {
                                HSSettings.#handleSettingToggle(e, key);
                            });
                        }
                    }
                } else {
                    if(controlSettings.controlEnabledId) {
                        const toggleElement = document.querySelector(`#${controlSettings.controlEnabledId}`) as HTMLDivElement;

                        if(toggleElement) {
                            if(setting.enabled) {
                                toggleElement.innerText = HSSettings.#settingEnabledString;
                                toggleElement.classList.remove('hs-disabled');
                            } else {
                                toggleElement.innerText = HSSettings.#settingDisabledString;
                                toggleElement.classList.add('hs-disabled');
                            }

                            // Handle toggling the setting on/off
                            toggleElement.addEventListener('click', function(e) {
                                HSSettings.#handleSettingToggle(e, key);
                            });
                        }
                    }
                }

                this.#handleSettingAction(setting, "state", setting.enabled);
            }
        }

        HSLogger.log(`Finished syncing mod settings`, HSSettings.#staticContext);
        this.#settingsSynced = true;
    }

    // Builds the settings UI in the mod's panel
    static autoBuildSettingsUI() : { didBuild: boolean, htmlString: string } {
        const self = this;

        if(!HSSettings.#settingsParsed) {
            HSLogger.error(`Could not sync settings - settings not parsed yet`, HSSettings.#staticContext);
            return { didBuild: false, htmlString: '' };
        }

        const settingsBlocks : string[] = [];
        let didBuild = true;

        for (const [key, setting] of Object.typedEntries(HSSettings.#settings)) {
            const controls = setting.settingControl;

            if(controls) {
                let components : string[] = [];

                if(controls.controlType === "switch") {
                    components = [
                        HSUIC.Div({ class: 'hs-panel-setting-block-text', html: setting.settingDescription }),
                    ]

                    if(controls.controlEnabledId) {
                        components.push(HSUIC.Button({ class: 'hs-panel-setting-block-btn hs-panel-settings-block-btn-standalone', id: controls.controlEnabledId, text: "" }))
                    }
                } else {
                    const convertedType = controls.controlType === "number" ? HSInputType.NUMBER : controls.controlType === "text" ? HSInputType.TEXT : null;

                    if(convertedType) {
                        // Create setting header and value input
                        components = [
                            HSUIC.Div({ class: 'hs-panel-setting-block-text', html: setting.settingDescription }),
                            HSUIC.Input({ class: 'hs-panel-setting-block-num-input', id: controls.controlId, type: convertedType }),
                        ]

                        // Create setting on/off toggle
                        if(controls.controlEnabledId) {
                            components.push(HSUIC.Button({ class: 'hs-panel-setting-block-btn', id: controls.controlEnabledId, text: "" }))
                        }
                    } else {
                        HSLogger.error(`Error autobuilding settings UI, control type resolution failed (how??)`, self.#staticContext);
                        didBuild = false;
                        break;
                    }
                }

                // Create setting block which contains the setting header, value input and on/off toggle
                settingsBlocks.push(HSUIC.Div({ 
                    class: 'hs-panel-setting-block',
                    html: components
                }));
            } else {
                HSLogger.error(`Error autobuilding settings UI, controls not defined for setting ${key}`, self.#staticContext);
                didBuild = false;
                break;
            }
        }

        return {
            didBuild,
            htmlString: settingsBlocks.join('\n')
        };
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

        // If the setting has some action bound to it, call it when the setting's value is changed
        this.#handleSettingAction(setting, "value");
    }

    static #handleSettingToggle<K extends keyof HSSettingsDefinition>(e: Event, settingKey: K) {
        const setting = HSSettings.#settings[settingKey];
        const oldState = setting.enabled;
        const newState = !oldState;
        const targetElement = (e.target as HTMLDivElement);

        HSLogger.log(`Setting toggle caught for ${settingKey}: ${oldState} -> ${newState}`, HSSettings.#staticContext);

        if(newState) {
            targetElement.innerText = HSSettings.#settingEnabledString;
            targetElement.classList.remove('hs-disabled');
        } else {
            targetElement.innerText = HSSettings.#settingDisabledString;
            targetElement.classList.add('hs-disabled');
        }
        
        HSSettings.#settings[settingKey].enabled = newState;
        this.#handleSettingAction(setting, "state", newState);
    }

    static #handleSettingAction<K extends keyof HSSettingsDefinition>(setting: HSSettingsDefinition[K], changeType: "value" | "state", newState?: boolean) {
        // If the setting has some settingAction bound to it, call it when the setting is toggled on/off
        if(setting.settingAction) {
            const action = HSSettings.#settingAction.getAction(setting.settingAction);

            if(action && action instanceof Function) {
                if(changeType === "state") {
                    if(newState === undefined) {
                        HSLogger.warn(`Failed to handle setting state change, newState was undefined`, this.#staticContext);
                        return;
                    }

                    if(newState) {
                        action({
                            contextName: HSSettings.#staticContext,
                            value: setting.settingValue ?? null,
                            disable: false
                        });
                    } else {
                        action({
                            contextName: HSSettings.#staticContext,
                            value: setting.defaultValue ?? null,
                            disable: true
                        });
                    }
                } else {
                    action({
                        contextName: HSSettings.#staticContext,
                        value: setting.settingValue ?? null,
                        disable: false
                    });
                }
            }
        }
    }

    static getSetting<K extends keyof HSSettingsDefinition>(key: K): HSSettingsDefinition[K] {
        return this.#settings[key];
    }

    static setSetting<K extends keyof HSSettingsDefinition>(key: K, setting: HSSettingsDefinition[K]): void {
        this.#settings[key] = setting;
    }

    static dumpToConsole() {
        console.log('------------------ HYPERSYNERGISM CURRENT SETTINGS DUMP START ------------------');
        if(this.#settings) 
            console.log(this.#settings);
        else
            console.log('NO SETTINGS FOUND (wtf)');
        console.log('------------------ HYPERSYNERGISM CURRENT SETTINGS DUMP END ------------------');
    }
}