import { HSLogger } from '../../hs-core/hs-logger';
import { HSSettings } from '../../hs-core/settings/hs-settings';
import { HSSettingsDefinition } from '../../../types/module-types/hs-settings-types';
import { HSModuleManager } from '../../hs-core/module/hs-module-manager';
import type { HSGameData } from '../../hs-core/gds/hs-gamedata';
import {
    captureAutosingSettings, getAutosingGameSettings, HS_AUTOSING_BUY_AMOUNTS, planAutosingSettings,
    type HSAutosingGameSetting, type HSAutosingSettingChange, type HSAutosingSettingsSnapshot,
} from './hs-autosing-settings-plan';

/**
 * Class: HSAutosingSettingsFixer
 * IsExplicitHSModule: No
 * Description: Applies AutoSing's settings from a fresh save and restores the player's original settings.
 */
export class HSAutosingSettingsFixer {
    static readonly #context = 'HSAutosingSettingsFixer';
    static readonly GDS_PAUSE_REASON = 'autosing';
    #original?: HSAutosingSettingsSnapshot;
    #settings?: HSAutosingGameSetting[];
    #hsSettingsToRestore = new Map<string, boolean>();

    get hasOriginalSettings(): boolean { return this.#original !== undefined; }

    public async fixAllSettings(): Promise<void> {
        const settings = getAutosingGameSettings({
            cubeOpeningPercent: Number(HSSettings.getSetting('autosing3to6DCubeOpeningPercent').getValue()),
            tesseractBuyPercent: Number(HSSettings.getSetting('autosingTessBuildingAutoBuyPercent').getValue()),
            challengeStart: Number(HSSettings.getSetting('autosingAutoChallTimerStart').getValue()),
            challengeExit: Number(HSSettings.getSetting('autosingAutoChallTimerExit').getValue()),
            challengeEnter: Number(HSSettings.getSetting('autosingAutoChallTimerEnter').getValue()),
        });
        const current = this.#readSettings(settings);
        // Keep the very first snapshot through Restart, including values already correct at startup:
        // a strategy can change those later. Record it before the first action, also for a failed start.
        this.#original ??= current;
        this.#settings = settings;
        this.#applyAndVerify(settings, planAutosingSettings(settings, current));
        await this.#disableUnwantedSettings();
    }

    /** Discard immediately on import. Deferred cleanup must never change the imported save. */
    public discardGameSettings(): void {
        this.#original = undefined;
        this.#settings = undefined;
    }

    public restoreGameSettings(): void {
        const original = this.#original;
        const settings = this.#settings;
        if (!original || !settings) return;
        try {
            const current = this.#readSettings(settings);
            this.#applyAndVerify(settings, planAutosingSettings(settings, current, original), original);
            HSLogger.log('Restored the game settings saved before Auto-Sing.', HSAutosingSettingsFixer.#context);
        } finally {
            this.discardGameSettings();
        }
    }

    #readSettings(settings: HSAutosingGameSetting[]): HSAutosingSettingsSnapshot {
        const raw = HSModuleManager.getModule<HSGameData>('HSGameData')?.forceCaptureRawSaveSync();
        if (!raw) throw new Error('Could not read a fresh game save (saving may be blocked by offline progress).');
        return captureAutosingSettings(JSON.parse(raw), settings);
    }

    #applyAndVerify(settings: HSAutosingGameSetting[], changes: HSAutosingSettingChange[], original?: HSAutosingSettingsSnapshot): void {
        const errors: string[] = [];
        // Native controls apply these settings synchronously, even on hidden tabs. No tab visits,
        // translated labels, theme colours, or live-player access are needed on either loader.
        for (const { setting, value } of changes) {
            try {
                let control = setting.control;
                if (setting.kind === 'buyAmount') control += HS_AUTOSING_BUY_AMOUNTS.get(value as number);
                const element = document.getElementById(control);
                if (!element) throw new Error(`Control #${control} is missing`);
                if (setting.kind === 'challenge') {
                    const challenge = document.getElementById(`challenge${setting.challenge}`);
                    if (!challenge) throw new Error(`Challenge ${setting.challenge} control is missing`);
                    challenge.click(); // Select only; the game's separate Start/Dblclick enters it.
                }
                if (setting.kind === 'input') {
                    (element as HTMLInputElement).value = String(value);
                    element.dispatchEvent(new Event('input', { bubbles: true }));
                    element.dispatchEvent(new Event('change', { bubbles: true }));
                    element.dispatchEvent(new Event('blur'));
                } else {
                    element.click();
                }
            } catch (error) {
                errors.push(`${setting.path} = ${value}: ${error instanceof Error ? error.message : String(error)}`);
            }
        }
        const remaining = planAutosingSettings(settings, this.#readSettings(settings), original);
        for (const { setting, value } of remaining) errors.push(`Game did not accept ${setting.path} = ${value}`);
        if (errors.length) throw new Error(errors.join('; '));
        HSLogger.debug(() => `Applied ${changes.length} game setting change(s) from the saved values.`, HSAutosingSettingsFixer.#context);
    }

    async #disableUnwantedSettings(): Promise<void> {
        // GDS: only its engine is paused, the setting is kept, so a reload during autosing can't
        // leave GDS turned off. Released by stopAutosing().
        await HSModuleManager.getModule<HSGameData>('HSGameData')?.pauseGDS(HSAutosingSettingsFixer.GDS_PAUSE_REASON);

        const performanceSettingKeys = [
            'enableAutomationQuickBar',
            'ambrosiaMinibars',
            'ambrosiaRateHeader',
        ] as const;

        const disabledSettings: string[] = [];
        for (const settingKey of performanceSettingKeys) {
            const setting = HSSettings.getSetting(settingKey);

            if (!setting) {
                HSLogger.warn(`disableUnwantedSettings: setting "${settingKey}" not found`, HSAutosingSettingsFixer.#context);
                continue;
            }

            if (!this.#hsSettingsToRestore.has(settingKey)) this.#hsSettingsToRestore.set(settingKey, setting.isEnabled());
            if (setting.isEnabled()) {
                setting.disable();
                disabledSettings.push(settingKey);
                HSLogger.debug(() => `disableUnwantedSettings: disabled "${settingKey}"`, HSAutosingSettingsFixer.#context);
            }
        }
        if (disabledSettings.length > 0) {
            HSLogger.log(`disableUnwantedSettings: disabled ${disabledSettings.length} performance-impacting setting(s) (${disabledSettings.join(', ')})`, HSAutosingSettingsFixer.#context);
        } else {
            HSLogger.debug(() => `disableUnwantedSettings: all performance-impacting settings already disabled`, HSAutosingSettingsFixer.#context);
        }
    }

    public restoreUnwantedSettings(): void {
        const settingsToRestore = this.#hsSettingsToRestore;
        this.#hsSettingsToRestore = new Map();
        // Reverse order of disabling. GDS is not in the list: stopAutosing() resumes it before this.
        for (const [settingKey, enabled] of [...settingsToRestore].reverse()) {
            const setting = HSSettings.getSetting(settingKey as keyof HSSettingsDefinition);
            if (setting) {
                if (setting.isEnabled() === enabled) continue;
                if (enabled) setting.enable(); else setting.disable();
                HSLogger.log(`restoreUnwantedSettings: restored "${settingKey}"`, HSAutosingSettingsFixer.#context);
            } else {
                HSLogger.warn(`restoreUnwantedSettings: setting "${settingKey}" not found or cannot be restored`, HSAutosingSettingsFixer.#context);
            }
        }
    }
}
