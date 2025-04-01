import { HSSettingBase, HSSettingRecord, HSSettingsControlType, HSSettingsDefinition } from "../../types/hs-settings-types";
import { HSUtils } from "../hs-utils/hs-utils";
import { HSLogger } from "./hs-logger";
import { HSModule } from "./hs-module";
import settings from "inline:../../resource/json/hs-settings.json";
import { HSUI } from "./hs-ui";
import { HSUIC } from "./hs-ui-components";
import { HSInputType } from "../../types/hs-ui-types";
import { HSSettingActions } from "./hs-setting-action";
import { HSBooleanSetting, HSNumericSetting, HSSetting, HSStringSetting } from "./hs-setting";

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

    static #settings : HSSettingRecord = {} as HSSettingRecord;

    static #settingsParsed = false;
    static #settingsSynced = false;

    static #settingEnabledString = "✓";
    static #settingDisabledString = "✗";

    #settingActions : HSSettingActions;

    constructor(moduleName: string, context: string) {
        super(moduleName, context);

        HSSettings.#staticContext = this.context;
        this.#settingActions = new HSSettingActions();

        HSLogger.log(`Parsing mod settings`, this.context);

        try {
            // Parse the JSON settings
            const parsedSettings = JSON.parse(settings) as any;
        
            // Set default values for each setting
            for (const [key, setting] of Object.typedEntries<HSSettingsDefinition>(parsedSettings)) {
                
                if(setting.settingType === 'boolean' || HSUtils.isBoolean(setting.settingValue)) {
                    (setting as any).settingValue = false;
                }

                if(!this.#validateSetting(setting)) {
                    throw new Error(`Could not parse setting ${key.toString()} (settingType: ${setting.settingType}, settingValue: ${setting.settingValue})`);
                }

                const settingActionName = ('settingAction' in setting) ? setting.settingAction : undefined;
                const settingAction = settingActionName ? this.#settingActions.getAction(settingActionName) : null;

                if(setting.settingType === 'numeric' || HSUtils.isNumeric(setting.settingValue)) {

                    if(!('settingValueMultiplier' in setting as any))
                        (setting as any).settingValueMultiplier = 1;
                    
                    (HSSettings.#settings as any)[key] = new HSNumericSetting(
                        setting as unknown as HSSettingBase<number>, 
                        settingAction, 
                        HSSettings.#settingEnabledString, 
                        HSSettings.#settingDisabledString
                    );
                } else if(setting.settingType === 'string' || HSUtils.isString(setting.settingValue)) {
                    (HSSettings.#settings as any)[key] = new HSStringSetting(
                        setting as unknown as HSSettingBase<string>, 
                        settingAction, 
                        HSSettings.#settingEnabledString, 
                        HSSettings.#settingDisabledString
                    );
                } else if(setting.settingType === 'boolean' || HSUtils.isBoolean(setting.settingValue)) {
                    (HSSettings.#settings as any)[key] = new HSBooleanSetting(
                        setting as unknown as HSSettingBase<boolean>, 
                        settingAction, 
                        HSSettings.#settingEnabledString, 
                        HSSettings.#settingDisabledString
                    );
                } else {
                    throw new Error(`Could not parse setting ${key.toString()} (settingType: ${setting.settingType}, settingValue: ${setting.settingValue})`);
                }
            }

            HSSettings.#settingsParsed = true;
        } catch (e) {
            HSLogger.error(`Error parsing mod settings ${e}`, this.context);
            HSSettings.#settingsParsed = false;
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
        for (const [key, settingObj] of Object.typedEntries(HSSettings.#settings)) {
            HSLogger.log(`Syncing ${key} settings`, HSSettings.#staticContext);
            
            const setting = settingObj.getDefinition();
            const controlSettings = settingObj.hasControls() ? setting.settingControl : undefined;

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
                            settingObj.handleChange(e);
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
                                settingObj.handleToggle(e);
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
                                settingObj.handleToggle(e);
                            });
                        }
                    }
                }

                settingObj.initialAction("state", setting.enabled);
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

        for (const [key, settingObj] of Object.typedEntries(HSSettings.#settings)) {
            const setting = settingObj.getDefinition();
            const controls = setting.settingControl;

            if(controls) {
                let components : string[] = [];

                if(controls.controlType === "switch") {
                    components = [
                        HSUIC.Div({ class: 'hs-panel-setting-block-text', html: setting.settingDescription, props: { title: setting.settingHelpText } }),
                    ]

                    if(controls.controlEnabledId) {
                        components.push(HSUIC.Button({ class: 'hs-panel-setting-block-btn hs-panel-settings-block-btn-standalone', id: controls.controlEnabledId, text: "" }))
                    }
                } else {
                    const convertedType = controls.controlType === "number" ? HSInputType.NUMBER : controls.controlType === "text" ? HSInputType.TEXT : null;

                    if(convertedType) {
                        // Create setting header and value input
                        components = [
                            HSUIC.Div({ class: 'hs-panel-setting-block-text', html: setting.settingDescription, props: { title: setting.settingHelpText } }),
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

    #validateSetting(setting: HSSettingBase<number | string | boolean>) {
        if(!('enabled' in setting)) return false;
        if(!('settingName' in setting)) return false;
        if(!('settingDescription' in setting)) return false;
        if(!('settingValue' in setting)) return false;
        if(!('settingType' in setting)) return false;

        return true;
    }

    static getSetting<K extends keyof HSSettingsDefinition>(settingName: K): HSSetting<number | string | boolean> {
        return this.#settings[settingName];
    }

    static setSetting<K extends keyof HSSettingsDefinition>(settingName: K, setting: HSSettingBase<number | string | boolean>): void {
        this.#settings[settingName].setDefinition(setting);
    }

    static setSettingValue<K extends keyof HSSettingsDefinition>(settingName: K, newValue: any): void {
        this.#settings[settingName].setValue(newValue);
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