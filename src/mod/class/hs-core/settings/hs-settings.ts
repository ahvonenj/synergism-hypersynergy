import { HSSettingBase, HSSettingControlGroup, HSSettingControlPage, HSSettingRecord, HSSettingsDefinition, HSSettingType } from "../../../types/module-types/hs-settings-types";
import { HSUtils } from "../../hs-utils/hs-utils";
import { HSLogger } from "../hs-logger";
import { HSModule } from "../module/hs-module";
import settings from "inline:../../../resource/json/hs-settings.json";
import settings_control_groups from "inline:../../../resource/json/hs-settings-control-groups.json";
import settings_control_pages from "inline:../../../resource/json/hs-settings-control-pages.json";
import { HSSettingActions } from "./hs-setting-action";
import { HSBooleanSetting, HSNumericSetting, HSSelectNumericSetting, HSSelectStringSetting, HSSelectStringsSetting, HSSetting, HSStateSetting, HSStringSetting, HSButtonSetting } from "./hs-setting";
import { HSModuleRegistry } from "../module/hs-module-registry";

import { HSGlobal } from "../hs-global";
import { HSStrategyManager } from "../../hs-modules/hs-autosing/hs-strategy-manager";
import { HSSettingsUIDependencies } from "./hs-settings-ui";
import { HSModuleOptions } from "../../../types/hs-types";
import { HSPlatform } from "../hs-platform";
import { parseStoredSettingStates, restoreSettingState, serializeSettingStates } from "./hs-settings-state";

type HSSettingBaseWithHidden<T extends HSSettingType> = HSSettingBase<T> & { hidden?: boolean };

/**
 * Class: HSSettings
 * IsExplicitHSModule: Yes
 * Description: 
 *     Hypersynergism's settings module.
 *     Responsibilities include:
 *         - Parsing settings from JSON
 *         - Saving and loading settings
 *         - Building the settings panel with setting inputs
 *         - Binding appropriate events to setting changes and on/off toggles
 *         - Keeping internal settings states in sync with DOM
 * Author: Swiffy, Shewchou
 */
export class HSSettings extends HSModule {
    static #staticContext = '';

    static #settings: HSSettingRecord = {} as HSSettingRecord;
    static #settingsControlGroups: Record<string, HSSettingControlGroup>;
    static #settingsControlPages: Record<string, HSSettingControlPage>;
    static #settingsParsed = false;
    static #saveTimeout: ReturnType<typeof setTimeout> | undefined;
    static #settingEnabledString = "✓";
    static #settingDisabledString = "✗";
    // Told when a setting is turned on or off, whoever does it (HSHeaderEditSettings' checkboxes)
    static #stateListeners = new Set<(settingName: string) => void>();

    #settingActions: HSSettingActions;

    constructor(moduleOptions: HSModuleOptions) {
        super(moduleOptions);
        HSSettings.#staticContext = this.context;
        this.#settingActions = new HSSettingActions();
        HSLogger.log(`Parsing mod settings`, this.context);
        // Parse settings_control_groups
        try {
            HSLogger.log(`Parsing settings_control_groups`, this.context);
            HSSettings.#settingsControlGroups = JSON.parse(settings_control_groups) as Record<string, HSSettingControlGroup>;
        } catch (e) {
            HSLogger.error(`Error parsing settings_control_groups ${e}`, this.context);
            HSSettings.#settingsParsed = false;
        }
        // Parse settings_control_pages
        try {
            HSLogger.log(`Parsing settings_control_pages`, this.context);
            HSSettings.#settingsControlPages = JSON.parse(settings_control_pages) as Record<string, HSSettingControlPage>;
        } catch (e) {
            HSLogger.error(`Error parsing settings_control_pages ${e}`, this.context);
            HSSettings.#settingsParsed = false;
        }
        try {
            HSLogger.log(`Parsing settings.json`, this.context);
            // Parse and resolve the settings from hs-settings.json and localStorage
            // This will also validate the settings and figure out things like 
            // if some settings are missing from localStorage (happens when new settings are added)
            const resolvedSettings = this.#resolveSettings();
            let gameDataSettingState = false;
            if ("useGameData" in resolvedSettings) {
                const gameDataSetting = resolvedSettings.useGameData;
                gameDataSettingState = gameDataSetting.enabled;
            }
            // Set default values for each setting
            type SettingEntry = [keyof HSSettingsDefinition, HSSettingsDefinition[keyof HSSettingsDefinition]];
            for (const [key, setting] of Object.entries(resolvedSettings) as SettingEntry[]) {
                const settingDef = setting as HSSettingBaseWithHidden<HSSettingType>;
                if (settingDef.settingType === 'boolean' || HSUtils.isBoolean(settingDef.settingValue)) {
                    settingDef.settingValue = false;
                }
                // Disable settings that use game data if game data is off
                if (HSSettings.usesGameData(setting) && setting.enabled && !gameDataSettingState) {
                    if (!HSGlobal.HSSettings.gameDataCheckBlacklist.includes(key)) {
                        HSLogger.info(`Disabled ${setting.settingDescription} on load because GDS is not on`, this.context);
                        setting.enabled = false;
                    }
                }
                this.#validateSetting(setting, HSSettings.#settingsControlGroups);
                const settingActionName = ('settingAction' in setting) ? setting.settingAction : undefined;
                const settingAction = settingActionName ? this.#settingActions.getAction(settingActionName) : null;
                // Instantiate the setting as HSSetting objects based on their type
                switch (setting.settingType) {
                    case 'numeric':
                        if (!('settingValueMultiplier' in settingDef)) {
                            const numericSetting = settingDef as HSSettingBase<number>;
                            numericSetting.settingValueMultiplier = 1;
                        }
                        HSSettings.#settings[key] = new HSNumericSetting(
                            settingDef as HSSettingBase<number>,
                            settingAction,
                            HSSettings.#settingEnabledString,
                            HSSettings.#settingDisabledString
                        );
                        break;
                    case 'string':
                        HSSettings.#settings[key] = new HSStringSetting(
                            settingDef as HSSettingBase<string>,
                            settingAction,
                            HSSettings.#settingEnabledString,
                            HSSettings.#settingDisabledString
                        );
                        break;
                    case 'boolean':
                        HSSettings.#settings[key] = new HSBooleanSetting(
                            settingDef as HSSettingBase<boolean>,
                            settingAction,
                            HSSettings.#settingEnabledString,
                            HSSettings.#settingDisabledString
                        );
                        break;
                    case 'selectnumeric':
                        if (!('settingValueMultiplier' in settingDef)) {
                            const numericSetting = settingDef as HSSettingBase<number>;
                            numericSetting.settingValueMultiplier = 1;
                        }
                        HSSettings.#settings[key] = new HSSelectNumericSetting(
                            settingDef as HSSettingBase<number>,
                            settingAction,
                            HSSettings.#settingEnabledString,
                            HSSettings.#settingDisabledString
                        );
                        break;
                    case 'selectstring':
                        HSSettings.#settings[key] = new HSSelectStringSetting(
                            settingDef as HSSettingBase<string>,
                            settingAction,
                            HSSettings.#settingEnabledString,
                            HSSettings.#settingDisabledString
                        );
                        break;
                    case 'selectstrings':
                        HSSettings.#settings[key] = new HSSelectStringsSetting(
                            settingDef as HSSettingBase<string[]>,
                            settingAction,
                            HSSettings.#settingEnabledString,
                            HSSettings.#settingDisabledString
                        );
                        break;
                    case 'state':
                        HSSettings.#settings[key] = new HSStateSetting(
                            settingDef as HSSettingBase<string>,
                            settingAction,
                            HSSettings.#settingEnabledString,
                            HSSettings.#settingDisabledString
                        );
                        break;
                    case 'button':
                        HSSettings.#settings[key] = new HSButtonSetting(
                            settingDef as HSSettingBase<null>,
                            settingAction,
                            HSSettings.#settingEnabledString,
                            HSSettings.#settingDisabledString
                        );
                        break;
                    default:
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

    // ===============================
    // --- UI dependency plumbing ----
    // ===============================

    static getUIDependencies(): HSSettingsUIDependencies {
        return HSSettings.#getUIDependencies();
    }

    static #getUIDependencies(): HSSettingsUIDependencies {
        return {
            settingsParsed: HSSettings.#settingsParsed,
            settings: HSSettings.#settings,
            settingsControlGroups: HSSettings.#settingsControlGroups,
            settingsControlPages: HSSettings.#settingsControlPages,
            settingEnabledString: HSSettings.#settingEnabledString,
            settingDisabledString: HSSettings.#settingDisabledString,
            settingChangeDelegate: HSSettings.#settingChangeDelegate,
            settingToggleDelegate: HSSettings.#settingToggleDelegate,
        };
    }

    // ===============================
    // ----- Settings accessors ------
    // ===============================

    static getSetting = <K extends keyof HSSettingsDefinition>(settingName: K): HSSetting<HSSettingType> => {
        return HSSettings.#settings[settingName];
    };

    static getSettings = (): HSSettingRecord => {
        return HSSettings.#settings;
    };

    /** A setting's value in hs-settings.json. Its definition's defaultValue is the value it had at load: the player's. */
    static getJsonSettingValue(settingName: keyof HSSettingsDefinition): unknown {
        const defaults = JSON.parse(settings) as Record<string, { settingValue?: unknown } | undefined>;
        return defaults[settingName]?.settingValue;
    }

    /** Run `listener` each time a setting is turned on or off: the panel, enable()/disable(), a boolean setValue(). */
    static onStateChange(listener: (settingName: string) => void): void {
        HSSettings.#stateListeners.add(listener);
    }

    /** Called by HSSetting right after a setting's enabled state is written, before its action runs. */
    static notifyStateChange(settingName: string): void {
        for (const listener of HSSettings.#stateListeners) {
            try {
                listener(settingName);
            } catch (e) {
                HSLogger.warn(`A setting state listener failed for ${settingName}: ${e}`, HSSettings.#staticContext);
            }
        }
    }

    /**
     * Whether a setting needs GDS on the platform the mod was loaded on (its usesGameData: true, or a list of
     * platforms).
     */
    static usesGameData(definition: Pick<HSSettingBase<HSSettingType>, 'usesGameData'>): boolean {
        const usesGameData = definition.usesGameData;
        if (!Array.isArray(usesGameData)) return usesGameData === true;
        return usesGameData.includes(HSPlatform.get());
    }

    // ===============================
    // --------- Persistence ---------
    // ===============================

    static saveSettingsToStorage() {
        if (this.#saveTimeout) {
            clearTimeout(this.#saveTimeout);
        }

        this.#saveTimeout = setTimeout(() => this.flushSettingsToStorage(), 250);
    }

    /** Persist a pending settings change before an action that may be followed by a reload. */
    static flushSettingsToStorage(): void {
        if (this.#saveTimeout === undefined) return;
        clearTimeout(this.#saveTimeout);
        this.#saveTimeout = undefined;
        const storageMod = HSModuleRegistry.getModule('HSStorage');

        if (storageMod) {
            const serializedSettings = this.#serializeSettings();
            const saved = storageMod.setData(HSGlobal.HSSettings.storageKey, serializedSettings);

            if (!saved) {
                HSLogger.warn(`Could not save settings to localStorage`, this.#staticContext);
            } else {
                HSLogger.debug(() => `<green>Settings saved to localStorage</green>`, this.#staticContext);
            }
        }
    }

    static #serializeSettings(): string {
        return serializeSettingStates(this.#settings);
    }

    // ===============================
    // ------- Storage parsing -------
    // ===============================

    #parseDefaultSettings(): HSSettingsDefinition {
        const defaultSettings = JSON.parse(settings) as Partial<HSSettingsDefinition>;

        for (const setting of Object.values(defaultSettings)) {
            if (!setting) continue;
            const settingDef = setting as HSSettingBaseWithHidden<HSSettingType>;

            if (settingDef.settingType === 'boolean' || HSUtils.isBoolean(settingDef.settingValue)) {
                settingDef.settingValue = false;
            }

            // Try fixing select type settings if they're missing some things
            if (setting.settingType === 'selectnumeric' || setting.settingType === 'selectstring') {
                // If there is no (default) value defined, define it as empty string
                if (!("settingValue" in setting)) {
                    const selectSetting = settingDef as HSSettingBase<string>;
                    selectSetting.settingValue = "";
                }

                // Make sure that the selectOptions contains a default option with value ""
                if ("settingControl" in setting && setting.settingControl) {
                    const settingControl = setting.settingControl;

                    if ("selectOptions" in settingControl && settingControl.selectOptions) {
                        const hasDefaultOption = settingControl.selectOptions.find(option => {
                            return option.value === "";
                        });

                        if (!hasDefaultOption) {
                            settingControl.selectOptions.unshift({
                                text: "None",
                                value: ""
                            });
                        }
                    }
                }
            }

            if (settingDef.settingType === 'numeric' || settingDef.settingType === 'selectnumeric' || HSUtils.isNumeric(settingDef.settingValue)) {
                if (!('settingValueMultiplier' in settingDef)) {
                    const numericSetting = settingDef as HSSettingBase<number>;
                    numericSetting.settingValueMultiplier = 1;
                }
            }

            if (settingDef.settingType === 'state') {
                if (!("settingValue" in settingDef)) {
                    const stateSetting = settingDef as HSSettingBase<string>;
                    stateSetting.settingValue = "<red>null</red>";
                }
            }

            this.#validateSetting(setting, HSSettings.#settingsControlGroups);
        }

        return defaultSettings as HSSettingsDefinition;
    }

    #parseStoredSettings(): Record<string, unknown> | null {
        const storageMod = HSModuleRegistry.getModule('HSStorage');

        if (storageMod) {
            const loaded = storageMod.getData<unknown>(HSGlobal.HSSettings.storageKey);

            if (loaded) {
                return parseStoredSettingStates(loaded);
            } else {
                HSLogger.warn(`Could not load settings from localStorage`, this.context);
                return null;
            }
        } else {
            HSLogger.warn(`Could not find HSStorage module`, this.context);
            return null;
        }
    }

    #resolveSettings(): HSSettingsDefinition {
        const defaultSettings = this.#parseDefaultSettings();

        try {
            const loadedSettings = this.#parseStoredSettings();
            const loadedStrategies = HSStrategyManager.parseStoredStrategies(this.context);

            if (loadedStrategies) {
                HSStrategyManager.setStrategies(loadedStrategies);
            }
            if (!loadedSettings) return defaultSettings;
            HSLogger.log('<green>Found settings from localStorage!</green>', this.context);
            return Object.fromEntries(Object.entries(defaultSettings).map(([name, definition]) => [
                name, restoreSettingState(definition, Object.hasOwn(loadedSettings, name) ? loadedSettings[name] : undefined),
            ])) as unknown as HSSettingsDefinition;
        } catch (err) {
            HSLogger.error(`Error while resolving settings`, this.context);
            console.log(err);
            return defaultSettings;
        }
    }

    #validateSetting(setting: HSSettingBase<HSSettingType>, controlGroups: Record<string, HSSettingControlGroup>) {
        if (!setting) throw new Error(`Setting is undefined (wtf)`);

        // These should be the same as HSSettingsControlType in hs-settings-types.ts
        const validControlTypes = ['text', 'number', 'switch', 'select', 'state', 'button'];

        // These should be the same as HSSettingJSONType in hs-settings-types.ts
        const validSettingTypes = ['numeric', 'string', 'boolean', 'selectnumeric', 'selectstring', 'selectstrings', 'state', 'button'];

        // Check the name first so we can use it in the error messages
        if (!('settingName' in setting)) throw new Error(`Setting is missing settingName property`);

        const settingName = setting.settingName;

        // Check the basic properties
        if (!('enabled' in setting)) throw new Error(`Setting '${settingName}' is missing enabled property`);
        if (!('settingDescription' in setting)) throw new Error(`Setting '${settingName}' is missing settingDescription property`);
        if (!('settingValue' in setting)) throw new Error(`Setting '${settingName}' is missing settingValue property`);
        if (!('settingType' in setting)) throw new Error(`Setting '${settingName}' is missing settingType property`);

        // Check if the settingType is valid
        if (!validSettingTypes.includes(setting.settingType))
            throw new Error(`Setting '${settingName}' has invalid settingType property`);

        const settingType = setting.settingType;

        // Check if the settingValue is valid for the settingType
        if (settingType === 'numeric') {
            if (!HSUtils.isNumeric(setting.settingValue))
                throw new Error(`Setting '${settingName}' has invalid settingValue property for settingType ${settingType}`);
        }
        else if (settingType === 'string') {
            if (!HSUtils.isString(setting.settingValue))
                throw new Error(`Setting '${settingName}' has invalid settingValue property for settingType ${settingType}`);
        }
        else if (settingType === 'boolean') {
            if (!HSUtils.isBoolean(setting.settingValue))
                throw new Error(`Setting '${settingName}' has invalid settingValue property for settingType ${settingType}`);
        }
        else if (settingType === 'selectnumeric') {
            if (!HSUtils.isString(setting.settingValue) && !HSUtils.isNumeric(setting.settingValue))
                throw new Error(`Setting '${settingName}' has invalid settingValue property for settingType ${settingType}`);
        }
        else if (settingType === 'selectstring') {
            if (!HSUtils.isString(setting.settingValue) && !HSUtils.isNumeric(setting.settingValue))
                throw new Error(`Setting '${settingName}' has invalid settingValue property for settingType ${settingType}`);
        }

        // If the setting defines a settingControl, check the properties
        if ('settingControl' in setting) {
            if (setting.settingControl) {
                const settingControl = setting.settingControl;

                if (settingControl.controlType !== "switch" && !('controlId' in settingControl))
                    throw new Error(`Setting '${settingName}' has settingControl defined and it is not type'switch', but it is missing controlId property`);
                if (!('controlType' in settingControl))
                    throw new Error(`Setting '${settingName}' has settingControl defined, but it is missing controlType property`);
                if (!('controlGroup' in settingControl))
                    throw new Error(`Setting '${settingName}' has settingControl defined, but it is missing controlGroup property`);

                if (!validControlTypes.includes(settingControl.controlType))
                    throw new Error(`Setting '${settingName}' has invalid controlType property`);

                const controlGroup = settingControl.controlGroup;

                if (!(controlGroup in controlGroups))
                    throw new Error(`Setting '${settingName}' has invalid controlGroup property`);
            }
        }
    }

    // ===============================
    // ------- Event delegates -------
    // ===============================

    static async #settingChangeDelegate(e: Event, settingObj: HSSetting<HSSettingType>) {
        await settingObj.handleChange(e);
    }

    static async #settingToggleDelegate(e: MouseEvent, settingObj: HSSetting<HSSettingType>) {
        await settingObj.handleToggle(e);
    }

    // ===============================
    // ------------ Misc. ------------
    // ===============================

    static dumpToConsole() {
        console.log('------------------ HYPERSYNERGISM CURRENT SETTINGS DUMP START ------------------');
        if (this.#settings)
            console.log(this.#settings);
        else
            console.log('NO SETTINGS FOUND (wtf)');
        console.log('------------------ HYPERSYNERGISM CURRENT SETTINGS DUMP END ------------------');
    }
}
