import { HSLogger } from '../../hs-core/hs-logger';
import { HSSettings } from '../../hs-core/settings/hs-settings';
import { HSSettingsDefinition } from '../../../types/module-types/hs-settings-types';
import { HSModuleRegistry } from '../../hs-core/module/hs-module-registry';
import type { HSGameData } from '../../hs-core/gds/hs-gamedata';
import { HSGlobal } from '../../hs-core/hs-global';
import type { HSStorage } from '../../hs-core/hs-storage';
import {
    captureAutosingSettings, getAutosingGameSettings, HS_AUTOSING_BUY_AMOUNTS, mergeStoredAutosingSettings,
    parseStoredAutosingSnapshot, planAutosingSettings,
    type HSAutosingGameSetting, type HSAutosingSettingChange, type HSAutosingSettingsSnapshot, type HSAutosingStoredSnapshot,
} from './hs-autosing-settings-plan';

/** Mod settings turned off during a run for speed, restored with the game settings. */
const PERFORMANCE_SETTING_KEYS = ['enableAutomationQuickBar', 'ambrosiaMinibars', 'ambrosiaRateHeader'] as const;
const STORAGE_KEY = 'autosingSettingsSnapshot';

/** The save's identity: the date the game was first played, kept by every save of that playthrough. */
function firstPlayedOf(save: unknown): string | undefined {
    const value = (save as { firstPlayed?: unknown } | null)?.firstPlayed;
    return typeof value === 'string' ? value : undefined;
}

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
    #firstPlayed?: string;
    #hsSettingsToRestore = new Map<string, boolean>();

    get hasOriginalSettings(): boolean { return this.#original !== undefined; }

    public async fixAllSettings(): Promise<void> {
        const settings = this.#getSettings();
        const save = this.#readSave();
        const current = captureAutosingSettings(save, settings);
        // Keep the very first snapshot through Restart, including values already correct at startup:
        // a strategy can change those later. Record it before the first action, also for a failed start.
        if (!this.#original) {
            const firstPlayed = firstPlayedOf(save);
            // A run started before the load-time restore takes over the interrupted run's snapshot
            const stored = this.#loadStored();
            if (stored && firstPlayed !== undefined && stored.firstPlayed === firstPlayed) {
                this.#original = mergeStoredAutosingSettings(settings, stored.game, current);
                for (const [key, enabled] of this.#performanceEntries(stored)) {
                    if (!this.#hsSettingsToRestore.has(key)) this.#hsSettingsToRestore.set(key, enabled);
                }
                HSLogger.log('Kept the settings saved before an interrupted Auto-Sing run, to restore them at the next stop.', HSAutosingSettingsFixer.#context);
            } else {
                this.#original = current;
            }
            this.#firstPlayed = firstPlayed;
            this.#persist();
        }
        this.#settings = settings;
        this.#applyAndVerify(settings, planAutosingSettings(settings, current));
        await this.#disableUnwantedSettings();
    }

    /** Discard immediately on import. Deferred cleanup must never change the imported save. */
    public discardGameSettings(): void {
        this.#original = undefined;
        this.#settings = undefined;
        this.#firstPlayed = undefined;
        HSModuleRegistry.getModule('HSStorage')?.clearData(STORAGE_KEY);
    }

    /**
     * At load, once the game can save: the game was closed or reloaded during a run, so restore what a
     * stop would have restored. Game settings only on the save they were taken from; the mod's own
     * settings in any case (they belong to this browser). Undefined when no run was interrupted.
     * Throws when the game settings could not all be restored; the snapshot is dropped either way.
     */
    public restoreInterruptedRun(): { gameRestored: boolean, insideExalt: boolean } | undefined {
        if (this.#original) return undefined; // A run already took the snapshot over
        const stored = this.#loadStored();
        if (!stored) return undefined;
        try {
            const save = this.#readSave();
            if (firstPlayedOf(save) !== stored.firstPlayed) {
                HSLogger.log('The settings saved before an interrupted Auto-Sing run belong to another save: game settings left as they are.', HSAutosingSettingsFixer.#context);
                return { gameRestored: false, insideExalt: false };
            }
            const settings = this.#getSettings();
            const current = captureAutosingSettings(save, settings);
            const original = mergeStoredAutosingSettings(settings, stored.game, current);
            this.#applyAndVerify(settings, planAutosingSettings(settings, current, original), original);
            HSLogger.log('Restored the game settings saved before an interrupted Auto-Sing run.', HSAutosingSettingsFixer.#context);
            return { gameRestored: true, insideExalt: (save as { insideSingularityChallenge?: unknown }).insideSingularityChallenge === true };
        } finally {
            HSModuleRegistry.getModule('HSStorage')?.clearData(STORAGE_KEY);
            this.#applyHsSettings(this.#performanceEntries(stored));
        }
    }

    #getSettings(): HSAutosingGameSetting[] {
        return getAutosingGameSettings({
            cubeOpeningPercent: Number(HSSettings.getSetting('autosing3to6DCubeOpeningPercent').getValue()),
            tesseractBuyPercent: Number(HSSettings.getSetting('autosingTessBuildingAutoBuyPercent').getValue()),
            challengeStart: Number(HSSettings.getSetting('autosingAutoChallTimerStart').getValue()),
            challengeExit: Number(HSSettings.getSetting('autosingAutoChallTimerExit').getValue()),
            challengeEnter: Number(HSSettings.getSetting('autosingAutoChallTimerEnter').getValue()),
        });
    }

    #performanceEntries(stored: HSAutosingStoredSnapshot): [string, boolean][] {
        const keys: readonly string[] = PERFORMANCE_SETTING_KEYS;
        return stored.hs.filter(([key]) => keys.includes(key));
    }

    #loadStored(): HSAutosingStoredSnapshot | undefined {
        try {
            const raw = localStorage.getItem(`${HSGlobal.HSStorage.storagePrefix}${STORAGE_KEY}`);
            return raw === null ? undefined : parseStoredAutosingSnapshot(JSON.parse(raw));
        } catch {
            return undefined;
        }
    }

    /** Written before the first change, so that a closed game never loses the original values. */
    #persist(): void {
        const original = this.#original;
        const firstPlayed = this.#firstPlayed;
        if (!original || firstPlayed === undefined) return;
        const snapshot: HSAutosingStoredSnapshot = { firstPlayed, game: [...original], hs: [...this.#hsSettingsToRestore] };
        if (!HSModuleRegistry.getModule('HSStorage')?.setData(STORAGE_KEY, snapshot)) {
            HSLogger.warn('Could not keep the original game settings in localStorage: a reload during Auto-Sing would not restore them.', HSAutosingSettingsFixer.#context);
        }
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
        return captureAutosingSettings(this.#readSave(), settings);
    }

    #readSave(): unknown {
        const raw = HSModuleRegistry.getModule('HSGameData')?.forceCaptureRawSaveSync();
        if (!raw) throw new Error('Could not read a fresh game save (saving may be blocked by offline progress).');
        return JSON.parse(raw) as unknown;
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
        await HSModuleRegistry.getModule('HSGameData')?.pauseGDS(HSAutosingSettingsFixer.GDS_PAUSE_REASON);

        const disabledSettings: string[] = [];
        for (const settingKey of PERFORMANCE_SETTING_KEYS) {
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
        this.#persist();
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
        this.#applyHsSettings([...settingsToRestore].reverse());
    }

    #applyHsSettings(entries: [string, boolean][]): void {
        for (const [settingKey, enabled] of entries) {
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
