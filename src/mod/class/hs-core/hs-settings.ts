import { HSSettingsControlType, HSSettingsDefinition } from "../../types/hs-settings-types";
import { HSUtils } from "../hs-utils/hs-utils";
import { HSLogger } from "./hs-logger";
import { HSModule } from "./hs-module";
import settings from "inline:../../resource/json/hs-settings.json";
import { HSUI } from "./hs-ui";
import { HSUIC } from "./hs-ui-components";
import { HSInputType } from "../../types/hs-ui-types";
import { HSSettingAction } from "./hs-setting-action";

export class HSSettings extends HSModule {

    static CURRENT_VERSION = '2.1.0';
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
            const parsedSettings = JSON.parse(settings) as HSSettingsDefinition;
        
            for (const [key, setting] of HSUtils.typedObjectEntries(parsedSettings)) {
                parsedSettings[key].defaultValue = setting.settingValue;
            }

            HSSettings.#defaultSettings = parsedSettings;
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

        for (const [key, setting] of HSUtils.typedObjectEntries(HSSettings.#settings)) {
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

                        valueElement.value = setting.settingValue.toString();

                        valueElement.addEventListener('change', function(e) {
                            HSSettings.#handleSettingChange(e, key);
                        });
                    }

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

                            toggleElement.addEventListener('click', function(e) {
                                HSSettings.#handleSettingToggle(e, key);
                            });
                        }
                    }

                    if(setting.settingAction) {
                        const action = HSSettings.#settingAction.getAction(setting.settingAction);
            
                        if(action && action instanceof Function) {
                            if(setting.enabled) {
                                action({
                                    contextName: HSSettings.#staticContext,
                                    value: setting.settingValue,
                                    disable: false
                                });
                            } else {
                                action({
                                    contextName: HSSettings.#staticContext,
                                    value: setting.settingValue,
                                    disable: true
                                });
                            }
                        }
                    }
                } else {
                    // Not implemented
                }
            }
        }

        HSLogger.log(`Finished syncing mod settings`, HSSettings.#staticContext);
        this.#settingsSynced = true;
    }

    static autoBuildSettingsUI() : { didBuild: boolean, htmlString: string } {
        const self = this;

        if(!HSSettings.#settingsParsed) {
            HSLogger.error(`Could not sync settings - settings not parsed yet`, HSSettings.#staticContext);
            return { didBuild: false, htmlString: '' };
        }

        const settingsBlocks : string[] = [];
        let didBuild = true;

        for (const [key, setting] of HSUtils.typedObjectEntries(HSSettings.#settings)) {
            const controls = setting.settingControl;

            if(controls) {
                let components : string[] = [];

                if(controls.controlType === "switch") {
                    // Not implemented
                } else {
                    const convertedType = controls.controlType === "number" ? HSInputType.NUMBER : controls.controlType === "text" ? HSInputType.TEXT : null;

                    if(convertedType) {
                        components = [
                            HSUIC.Div({ class: 'hs-panel-setting-block-text', html: setting.settingDescription }),
                            HSUIC.Input({ class: 'hs-panel-setting-block-num-input', id: controls.controlId, type: convertedType }),
                        ]

                        if(controls.controlEnabledId) {
                            components.push(HSUIC.Button({ class: 'hs-panel-setting-block-btn', id: controls.controlEnabledId, text: "" }))
                        }
                    } else {
                        HSLogger.error(`Error autobuilding settings UI, control type resolution failed (how??)`, self.#staticContext);
                        didBuild = false;
                        break;
                    }
                }

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

        if(setting.settingAction) {
            const action = HSSettings.#settingAction.getAction(setting.settingAction);

            if(action && action instanceof Function) {
                action({
                    contextName: HSSettings.#staticContext,
                    value: newValue,
                    disable: false
                });
            }
        }
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

        if(setting.settingAction) {
            const action = HSSettings.#settingAction.getAction(setting.settingAction);

            if(action && action instanceof Function) {
                if(newState) {
                    action({
                        contextName: HSSettings.#staticContext,
                        value: setting.settingValue,
                        disable: false
                    });
                } else {
                    action({
                        contextName: HSSettings.#staticContext,
                        value: setting.defaultValue,
                        disable: true
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