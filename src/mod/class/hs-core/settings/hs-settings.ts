import { HSSettingBase, HSSettingControlGroup, HSSettingRecord, HSSettingsDefinition, HSSettingType } from "../../../types/module-types/hs-settings-types";
import { HSUtils } from "../../hs-utils/hs-utils";
import { HSLogger } from "../hs-logger";
import { HSModule } from "../module/hs-module";
import settings from "inline:../../../resource/json/hs-settings.json";
import settings_control_groups from "inline:../../../resource/json/hs-settings-control-groups.json";
import { HSUIC } from "../hs-ui-components";
import { HSInputType } from "../../../types/module-types/hs-ui-types";
import { HSSettingActions } from "./hs-setting-action";
import { HSBooleanSetting, HSNumericSetting, HSSelectNumericSetting, HSSelectStringSetting, HSSetting, HSStateSetting, HSStringSetting } from "./hs-setting";
import { HSModuleManager } from "../module/hs-module-manager";
import { HSStorage } from "../hs-storage";
import { HSGlobal } from "../hs-global";
import sIconB64 from "inline:../../../resource/txt/s_icon.txt";

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
    static #settingsControlGroups : Record<string, HSSettingControlGroup>;

    static #settingsParsed = false;
    static #settingsSynced = false;

    static #settingEnabledString = "✓";
    static #settingDisabledString = "✗";

    #settingActions : HSSettingActions;

    constructor(moduleName: string, context: string, moduleColor?: string) {
        super(moduleName, context, moduleColor);

        HSSettings.#staticContext = this.context;
        this.#settingActions = new HSSettingActions();

        HSLogger.log(`Parsing mod settings`, this.context);

        // Read hs-settings-control-groups.json and parse it
        try {
            HSLogger.log(`Parsing control groups`, this.context);
            HSSettings.#settingsControlGroups = JSON.parse(settings_control_groups) as Record<string, HSSettingControlGroup>;
        } catch(e) {
            HSLogger.error(`Error parsing control groups ${e}`, this.context);
            HSSettings.#settingsParsed = false;
        }

        try {
            HSLogger.log(`Parsing settings.json`, this.context);

            // Parse and resolve the settings from hs-settings.json and localStorage
            // This will also validate the settings and figure out things like 
            // if some settings are missing from localStorage (happens when new settings are added)
            const resolvedSettings = this.#resolveSettings();

            let gameDataSettingState;

            if("useGameData" in resolvedSettings) {
                const gameDataSetting = resolvedSettings.useGameData;
                gameDataSettingState = gameDataSetting.enabled;
            } else {
                gameDataSettingState = false;
            }

            // Set default values for each setting
            for (const [key, setting] of Object.typedEntries<HSSettingsDefinition>(resolvedSettings)) {
                
                if(setting.settingType === 'boolean' || HSUtils.isBoolean(setting.settingValue)) {
                    (setting as any).settingValue = false;
                }

                // If somehow we're loading a setting that uses game data, but game data is disabled in the loaded settings
                // We disable this setting too
                if(setting.usesGameData && setting.enabled && !gameDataSettingState) {
                    if(!HSGlobal.HSSettings.gameDataCheckBlacklist.includes(key)) {
                        HSLogger.info(`Disabled ${setting.settingDescription} on load because GDS is not on`, this.context);
                        setting.enabled = false;
                    }
                }

                this.#validateSetting(setting, HSSettings.#settingsControlGroups);

                const settingActionName = ('settingAction' in setting) ? setting.settingAction : undefined;
                const settingAction = settingActionName ? this.#settingActions.getAction(settingActionName) : null;

                // Instantiate the setting as HSSetting objects based on their type
                if(setting.settingType === 'numeric') {

                    if(!('settingValueMultiplier' in setting as any))
                        (setting as any).settingValueMultiplier = 1;
                    
                    (HSSettings.#settings as any)[key] = new HSNumericSetting(
                        setting as unknown as HSSettingBase<number>, 
                        settingAction, 
                        HSSettings.#settingEnabledString, 
                        HSSettings.#settingDisabledString
                    );
                } else if(setting.settingType === 'string') {
                    (HSSettings.#settings as any)[key] = new HSStringSetting(
                        setting as unknown as HSSettingBase<string>, 
                        settingAction, 
                        HSSettings.#settingEnabledString, 
                        HSSettings.#settingDisabledString
                    );
                } else if(setting.settingType === 'boolean') {
                    (HSSettings.#settings as any)[key] = new HSBooleanSetting(
                        setting as unknown as HSSettingBase<boolean>, 
                        settingAction, 
                        HSSettings.#settingEnabledString, 
                        HSSettings.#settingDisabledString
                    );
                } else if(setting.settingType === 'selectnumeric') {
                    if(!('settingValueMultiplier' in setting as any))
                        (setting as any).settingValueMultiplier = 1;

                    (HSSettings.#settings as any)[key] = new HSSelectNumericSetting(
                        setting as unknown as HSSettingBase<number>, 
                        settingAction, 
                        HSSettings.#settingEnabledString, 
                        HSSettings.#settingDisabledString
                    );
                } else if(setting.settingType === 'selectstring') {
                    (HSSettings.#settings as any)[key] = new HSSelectStringSetting(
                        setting as unknown as HSSettingBase<string>, 
                        settingAction, 
                        HSSettings.#settingEnabledString, 
                        HSSettings.#settingDisabledString
                    );
                } else if(setting.settingType === 'state') {
                    (HSSettings.#settings as any)[key] = new HSStateSetting(
                        setting as unknown as HSSettingBase<string>, 
                        settingAction, 
                        HSSettings.#settingEnabledString, 
                        HSSettings.#settingDisabledString
                    );
                } else {
                    throw new Error(`Could not parse setting ${key.toString()} (settingType: ${setting.settingType}, settingValue: ${setting.settingValue})`);
                }
            }

            HSSettings.saveSettingsToStorage();
            HSSettings.#settingsParsed = true;
        } catch (e) {
            HSLogger.error(`Error parsing mod settings ${e}`, this.context);
            HSSettings.#settingsParsed = false;
        }
    }

    async init(): Promise<void> {
        this.isInitialized = true;
    }

    static async syncSettings() {
        HSLogger.log(`Syncing mod settings`, HSSettings.#staticContext);

        if(!HSSettings.#settingsParsed) {
            HSLogger.error(`Could not sync settings - settings not parsed yet`, HSSettings.#staticContext);
            return;
        }

        // Update the setting UI controls with the configured values in hs-settings.json
        for (const [key, settingObj] of Object.typedEntries(HSSettings.#settings)) {
            HSLogger.debug(`Syncing ${key} settings`, HSSettings.#staticContext);
            
            const setting = settingObj.getDefinition();
            const controlSettings = settingObj.hasControls() ? setting.settingControl : undefined;

            if(controlSettings) {
                const controlType = controlSettings.controlType;
                const controlOptions = controlSettings.controlOptions;

                // Render input for all the text and number settings
                // NOTE: switch settings do not need any input to be rendered
                if(controlType === "text" || controlType === "number") {
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
                        valueElement.addEventListener('change', async (e) => { await this.#settingChangeDelegate(e, settingObj); });
                    }
                } else if(controlType === "select") { // Render input for all the select settings
                    const settingValue = setting.settingValue.toString();
                    const selectElement = document.querySelector(`#${controlSettings.controlId}`) as HTMLSelectElement;

                    if(selectElement) {
                        const optionExists = Array.from(selectElement.options).some(option => option.value === settingValue);

                        if (optionExists) {
                            // Set the input value to the JSON setting value
                            selectElement.value = settingValue;
                        } else {
                            selectElement.value = ""; // Set to empty string if the value doesn't exist in the options
                            HSLogger.warn(`Setting value ${settingValue} does not exist in select options for setting ${key}`, HSSettings.#staticContext);
                        }

                        // Listen for changes in the UI input to change the setting value
                        selectElement.addEventListener('change', async (e) => { await this.#settingChangeDelegate(e, settingObj); });
                    }
                } else if(controlType === "state") { // Render input for all the select settings
                    const settingValue = HSUtils.parseColorTags(setting.settingValue.toString());
                    const stateElement = document.querySelector(`#${controlSettings.controlId}`) as HTMLSelectElement;

                    if(stateElement) {
                        stateElement.innerHTML = settingValue;
                    }
                }


                // This sets up the  "✓" / "✗" button next to the setting input (switch type settings just need this one)
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
                        toggleElement.addEventListener('click', async (e) => { await this.#settingToggleDelegate(e, settingObj); });
                    }
                }

                await settingObj.initialAction("state", setting.enabled);
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

        // Sort the settings by their control group
        const sortedSettings = Object.entries(HSSettings.#settings).sort((a, b) => {
            const aControlGroup = a[1].getDefinition().settingControl?.controlGroup;
            const bControlGroup = b[1].getDefinition().settingControl?.controlGroup;

            if(aControlGroup && bControlGroup) {
                return (HSSettings.#settingsControlGroups[aControlGroup].order || 0) - (HSSettings.#settingsControlGroups[bControlGroup].order || 0);
            } else if(aControlGroup) {
                return -1;
            } else if(bControlGroup) {
                return 1;
            } else {
                return 0;
            }
        });

        let currentControlGroup : string | null = null;

        for (const [key, settingObj] of sortedSettings) {
            const setting = settingObj.getDefinition();
            const controls = setting.settingControl;
            const settingBlockId = setting.settingBlockId || undefined;

            let gameDataIcon = "";

            if(setting.usesGameData) {
                gameDataIcon = HSUIC.Image({ 
                    class: 'hs-panel-setting-block-gamedata-icon',
                    src: sIconB64,
                    width: 18,
                    height: 18,
                    props: { title: HSGlobal.HSSettings.gameDataRequiredTooltip },
                });
            }

            if(controls) {
                let components : string[] = [];

                // Check if the control group is different from the previous one
                // If so, create a new setting group header
                if(!currentControlGroup || currentControlGroup !== controls.controlGroup) {
                    currentControlGroup = controls.controlGroup;
                    const controlGroup = HSSettings.#settingsControlGroups[currentControlGroup];

                    // Create control group header
                    settingsBlocks.push(HSUIC.Div({ 
                        html: controlGroup.groupName,
                        styles: {
                            borderBottom: '1px solid limegreen',
                            gridColumn: 'span 2',
                            marginBottom: '15px'
                        }
                    }))
                }

                if(controls.controlType === "switch") {
                    components = [
                        HSUIC.Div({
                            class: 'hs-panel-setting-block-text-wrapper', 
                            styles: {
                                display: 'flex',
                                flexDirection: 'row',
                                alignItems: 'center',
                            },
                            html: [
                                HSUIC.P({
                                    class: 'hs-panel-setting-block-text', 
                                    props: { title: setting.settingHelpText },
                                    text: setting.settingDescription, 
                                    styles: { margin: '0' } 
                                }), 
                                gameDataIcon
                            ] 
                        }),
                    ]

                    if(controls.controlEnabledId) {
                        components.push(HSUIC.Button({ class: 'hs-panel-setting-block-btn hs-panel-settings-block-btn-standalone', id: controls.controlEnabledId, text: "" }))
                    }
                } else {
                    let convertedType : HSInputType | null = null;

                    switch(controls.controlType) {
                        case "text":
                            convertedType = HSInputType.TEXT;
                            break;
                        case "number":
                            convertedType = HSInputType.NUMBER;
                            break;
                        case "select":
                            convertedType = HSInputType.SELECT;
                            break;
                        case "state":
                            convertedType = HSInputType.STATE;
                            break;
                        default:
                            convertedType = null;
                    }

                    if(convertedType) {
                        // Setting header
                        components = [ 
                            HSUIC.Div({ 
                                class: 'hs-panel-setting-block-text-wrapper', 
                                styles: {
                                    display: 'flex',
                                    flexDirection: 'row',
                                    alignItems: 'center',
                                },
                                html: [
                                    HSUIC.P({ 
                                        class: 'hs-panel-setting-block-text', 
                                        props: { title: setting.settingHelpText },
                                        text: setting.settingDescription, 
                                        styles: { margin: '0' } 
                                    }), 
                                    gameDataIcon
                                ] 
                            })
                        ];

                        // Setting value input
                        if(convertedType === HSInputType.NUMBER || convertedType === HSInputType.TEXT) {
                            components.push(HSUIC.Input({ class: 'hs-panel-setting-block-num-input', id: controls.controlId, type: convertedType }));
                        } else if(convertedType === HSInputType.SELECT) {
                            if(controls.selectOptions) {
                                components.push(HSUIC.Select(
                                    { class: 'hs-panel-setting-block-select-input', id: controls.controlId, type: convertedType },
                                    controls.selectOptions
                                ));
                            } else {
                                HSLogger.error(`Error autobuilding settings UI, ${setting.settingName} does not have selectOptions defined`, self.#staticContext);
                                didBuild = false;
                                break;
                            }
                        } else if(convertedType === HSInputType.STATE) {
                            components.push(HSUIC.P({ class: 'hs-panel-setting-block-state', id: controls.controlId, text: "" }));
                        }

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
                    id: settingBlockId,
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

    #validateSetting(setting: HSSettingBase<HSSettingType>, controlGroups: Record<string, HSSettingControlGroup>) {
        if(!setting) throw new Error(`Setting is undefined (wtf)`);

         // These should be the same as HSSettingsControlType in hs-settings-types.ts
         const validControlTypes = ['text', 'number', 'switch', 'select', 'state'];

        // These should be the same as HSSettingJSONType in hs-settings-types.ts
        const validSettingTypes = ['numeric', 'string', 'boolean', 'selectnumeric', 'selectstring', 'state'];

        // Check the name first so we can use it in the error messages
        if(!('settingName' in setting)) throw new Error(`Setting is missing settingName property`);
        
        const settingName = setting.settingName;

        // Check the basic properties
        if(!('enabled' in setting)) throw new Error(`Setting '${settingName}' is missing enabled property`);
        if(!('settingDescription' in setting)) throw new Error(`Setting '${settingName}' is missing settingDescription property`);
        if(!('settingValue' in setting)) throw new Error(`Setting '${settingName}' is missing settingValue property`);
        if(!('settingType' in setting)) throw new Error(`Setting '${settingName}' is missing settingType property`);

        // Check if the settingType is valid
        if(!validSettingTypes.includes(setting.settingType)) 
            throw new Error(`Setting '${settingName}' has invalid settingType property`);

        const settingType = setting.settingType;

        // Check if the settingValue is valid for the settingType
        if(settingType === 'numeric') {
            if(!HSUtils.isNumeric(setting.settingValue)) 
                throw new Error(`Setting '${settingName}' has invalid settingValue property for settingType ${settingType}`);
        } 
        else if(settingType === 'string') {
            if(!HSUtils.isString(setting.settingValue))
                throw new Error(`Setting '${settingName}' has invalid settingValue property for settingType ${settingType}`);
        } 
        else if(settingType === 'boolean') {
            if(!HSUtils.isBoolean(setting.settingValue))
                throw new Error(`Setting '${settingName}' has invalid settingValue property for settingType ${settingType}`);
        }
        else if(settingType === 'selectnumeric') {
            if(!HSUtils.isString(setting.settingValue) && !HSUtils.isNumeric(setting.settingValue))
                throw new Error(`Setting '${settingName}' has invalid settingValue property for settingType ${settingType}`);
        }
        else if(settingType === 'selectstring') {
            if(!HSUtils.isString(setting.settingValue) && !HSUtils.isNumeric(setting.settingValue))
                throw new Error(`Setting '${settingName}' has invalid settingValue property for settingType ${settingType}`);
        }

        // If the setting defines a settingControl, check the properties
        if('settingControl' in setting) {
            if(setting.settingControl) {
                const settingControl = setting.settingControl;

                if(settingControl.controlType !== "switch" && !('controlId' in settingControl))
                    throw new Error(`Setting '${settingName}' has settingControl defined and it is not type'switch', but it is missing controlId property`);
                if(!('controlType' in settingControl))
                    throw new Error(`Setting '${settingName}' has settingControl defined, but it is missing controlType property`);
                if(!('controlGroup' in settingControl))
                    throw new Error(`Setting '${settingName}' has settingControl defined, but it is missing controlGroup property`);

                if(!validControlTypes.includes(settingControl.controlType)) 
                    throw new Error(`Setting '${settingName}' has invalid controlType property`);

                const controlGroup = settingControl.controlGroup;

                if(!(controlGroup in controlGroups))
                    throw new Error(`Setting '${settingName}' has invalid controlGroup property`);
            } 
        }
    }

    static getSetting<K extends keyof HSSettingsDefinition>(settingName: K): HSSetting<HSSettingType> {
        return this.#settings[settingName];
    }

    static getSettings(): HSSettingRecord {
        return this.#settings;
    }

    // Serializes all current settings into a JSON string
    static #serializeSettings(): string {
        const serializeableSettings: Partial<HSSettingBase<HSSettingType>> = { }

        for(const [key, setting] of Object.typedEntries(this.#settings)) {
            const definition = { ...setting.getDefinition() as Partial<HSSettingBase<HSSettingType>> };

            // Remove properties that should not be saved into localStorage
            const blackList = HSGlobal.HSSettings.serializationBlackList;

            for(const blackListKey of blackList) {
                if((definition as any)[blackListKey]) delete (definition as any)[blackListKey];
            }

            (serializeableSettings as any)[key] = definition;
        }

        return JSON.stringify(serializeableSettings);
    }

    static saveSettingsToStorage() {
        const storageMod = HSModuleManager.getModule<HSStorage>('HSStorage');

        if(storageMod) {
            const serializedSettings = this.#serializeSettings();
            const saved = storageMod.setData(HSGlobal.HSSettings.storageKey, serializedSettings);

            if(!saved) {
                HSLogger.warn(`Could not save settings to localStorage`, this.#staticContext);
            } else {
                HSLogger.debug(`<green>Settings saved to localStorage</green>`, this.#staticContext);
            }
        }
    }

    // Parses the default settings read from settings.json
    #parseDefaultSettings(): HSSettingsDefinition {
        const defaultSettings = JSON.parse(settings) as Partial<HSSettingsDefinition>;
        
        for (const [key, setting] of Object.typedEntries<Partial<HSSettingsDefinition>>(defaultSettings)) {
            if(!setting) continue;
            
            if(setting.settingType === 'boolean' || HSUtils.isBoolean(setting.settingValue)) {
                (setting as any).settingValue = false;
            }

            // Try fixing select type settings if they're missing some things
            if(setting.settingType === 'selectnumeric' || setting.settingType === 'selectstring') {
                // If there is no (default) value defined, define it as empty string
                if(!("settingValue" in setting))
                    (setting as any).settingValue = "";

                // Make sure that the selectOptions contains a default option with value ""
                if("settingControl" in setting && setting.settingControl) {
                    const settingControl = setting.settingControl;

                    if("selectOptions" in settingControl && settingControl.selectOptions) {
                        const hasDefaultOption = settingControl.selectOptions.find(option => {
                            return option.value === "";
                        });

                        if(!hasDefaultOption) {
                            settingControl.selectOptions.unshift({
                                text: "None",
                                value: ""
                            });
                        }
                    }
                }
            }

            if(setting.settingType === 'numeric' || setting.settingType === 'selectnumeric' || HSUtils.isNumeric(setting.settingValue)) {
                if(!('settingValueMultiplier' in setting as any))
                    (setting as any).settingValueMultiplier = 1;
            }

            if(setting.settingType === 'state') {
                if(!("settingValue" in setting))
                    (setting as any).settingValue = "<red>null</red>";
            }

            this.#validateSetting(setting, HSSettings.#settingsControlGroups);
        }

        return defaultSettings as HSSettingsDefinition;
    }

    // Loads and parses settings from local storage as JSON
    #parseStoredSettings(): Partial<HSSettingsDefinition> | null  {
        const storageMod = HSModuleManager.getModule<HSStorage>('HSStorage');

        if(storageMod) {
            const loaded = storageMod.getData<string>(HSGlobal.HSSettings.storageKey);

            if(loaded) {
                return JSON.parse(loaded) as Partial<HSSettingsDefinition>;
            } else {
                HSLogger.warn(`Could not load settings from localStorage`, this.context);
                return null;
            }
        } else {
            HSLogger.warn(`Could not find HSStorage module`, this.context);
            return null;
        }
    }

    #resolveSettings() : HSSettingsDefinition {
        const defaultSettings = this.#parseDefaultSettings();
        
        try {
            const loadedSettings = this.#parseStoredSettings();
            const resolved = JSON.parse(JSON.stringify(defaultSettings));

            if(loadedSettings) {
                HSLogger.log(`<green>Found settings from localStorage!</green>`, this.context);

                // Process each top-level key that exists in defaultSettings (A)
                Object.keys(defaultSettings).forEach(topLevelKey => {
                    // Skip if this top-level key doesn't exist in loadedSettings (B)
                    if (!(topLevelKey in loadedSettings)) return;

                    // For each property in the top-level object in loadedSettings (B)
                    // If it exists in defaultSettings (A), use B's value
                    // This preserves new properties in A that don't exist in B
                    Object.keys((loadedSettings as any)[topLevelKey]).forEach(nestedKey => {
                        if (nestedKey in (defaultSettings as any)[topLevelKey]) {
                            const bValue = (loadedSettings as any)[topLevelKey][nestedKey];
                            
                            // If this is a nested object (but not an array), recursively merge
                            if (
                                bValue !== null && 
                                typeof bValue === 'object' && 
                                !Array.isArray(bValue) &&
                                typeof (defaultSettings as any)[topLevelKey][nestedKey] === 'object' &&
                                !Array.isArray((defaultSettings as any)[topLevelKey][nestedKey])
                            ) {
                                // For nested objects, preserve structure from A but override with values from B
                                // where the keys exist in both
                                const mergedNestedObj = { 
                                    ...((defaultSettings as any)[topLevelKey][nestedKey]), // Start with all properties from A
                                };
                                
                                // Override with B's values where they exist
                                Object.keys(bValue).forEach(deepKey => {
                                    if (deepKey in mergedNestedObj) {
                                        mergedNestedObj[deepKey] = bValue[deepKey];
                                    }
                                });
                                
                                // Update the resolved object
                                (resolved as any)[topLevelKey][nestedKey] = mergedNestedObj;
                            } else {
                                // For primitive values or arrays, just use B's value directly
                                (resolved as any)[topLevelKey][nestedKey] = bValue;
                            }
                        }
                        // If nestedKey doesn't exist in A, we ignore it (doesn't get copied to resolved)
                    });
                });

                return resolved as HSSettingsDefinition;
            } else {
                return defaultSettings;
            }
        } catch(err) {
            HSLogger.error(`Error while resolving settings`, this.context);
            console.log(err);
            return defaultSettings;
        }
    }

    static async #settingChangeDelegate(e: Event, settingObj: HSSetting<HSSettingType>) {
        await settingObj.handleChange(e);
        this.saveSettingsToStorage();
    }

    static async #settingToggleDelegate(e: MouseEvent, settingObj: HSSetting<HSSettingType>) {
        await settingObj.handleToggle(e);
        this.saveSettingsToStorage();
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