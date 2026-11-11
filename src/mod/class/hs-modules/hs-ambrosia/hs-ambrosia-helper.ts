import { AMBROSIA_LOADOUT_SLOT, BlueberryLoadoutMode } from "../../../types/module-types/hs-ambrosia-types";
import { HSLogger } from "../../hs-core/hs-logger";
import { HSUtils } from "../../hs-utils/hs-utils";
import { HSElementHooker } from "../../hs-core/hs-elementhooker";
import { HSGlobal } from "../../hs-core/hs-global";
import { HSModuleRegistry } from "../../hs-core/module/hs-module-registry";

/**
 * Class: HSAmbrosiaHelper
 * IsExplicitHSModule: No
 * Description:
 *     Static helper class for the HSAmbrosia module. Contains utility methods
 *     for resolving and formatting ambrosia loadout and icon states.
 */
export class HSAmbrosiaHelper {
    static #context: string = 'HSAmbrosiaHelper';

    static #cachedBlueberryToggleModeButton: HTMLButtonElement | undefined;
    // Texts of the mode toggle button (normalized), in every language seen this session: the game writes
    // the button from ambrosia.loadouts.load/save and doesn't re-translate it on a language switch.
    static readonly #modeLabels: Record<BlueberryLoadoutMode, Set<string>> = {
        loadTree: new Set(['MODE: LOAD LOADOUT']),
        saveTree: new Set(['MODE: SAVE LOADOUT'])
    };
    static #modeLabelsLanguage?: string;

    static async cacheBlueberryToggleModeButton(): Promise<HTMLButtonElement | undefined> {
        if (this.#cachedBlueberryToggleModeButton instanceof HTMLButtonElement) {
            return this.#cachedBlueberryToggleModeButton;
        }
        const element = await HSElementHooker.HookElement('#blueberryToggleMode');
        if (element instanceof HTMLButtonElement) {
            this.#cachedBlueberryToggleModeButton = element;
            this.#refreshModeLabelsIfLanguageChanged();
            return element;
        }
        HSLogger.warn('Could not cache blueberry loadout mode toggle button', this.#context);
        return undefined;
    }

    /** Resolve an ambrosia loadout slot enum by its slot ID string. */
    static getSlotEnumBySlotId(slotId: string): AMBROSIA_LOADOUT_SLOT | undefined {
        return Object.values(AMBROSIA_LOADOUT_SLOT).find((slot) => slot === slotId) as AMBROSIA_LOADOUT_SLOT | undefined;
    }

    /** Extract numeric slot index from slot enum string (e.g., blueberryLoadout1 -> 1). */
    static getLoadoutNumberFromSlot(slot: AMBROSIA_LOADOUT_SLOT): number | undefined {
        // The slot values are expected to have numeric endings in the format "blueberryLoadoutN".
        // This method extracts that tail number and confirms it's a valid positive integer.
        const match = slot.match(/(\d+)$/);
        if (!match) return undefined;

        const value = Number(match[1]);
        return Number.isInteger(value) && value > 0 ? value : undefined;
    }

    /** A loadout slot button's number (blueberryLoadout1 -> 1). */
    static getSlotNumber(slot: HTMLElement): number | undefined {
        const slotEnum = this.getSlotEnumBySlotId(slot.id);
        return slotEnum ? this.getLoadoutNumberFromSlot(slotEnum) : undefined;
    }

    /** Whether the game shows its ambrosia (Exalt 1 completed), as its own ambrosia header modules check. */
    static isAmbrosiaUnlocked(): boolean {
        const completions = HSGlobal.exposedPlayer?.singularityChallenges?.noSingularityUpgrades?.completions;
        return completions === undefined || completions > 0;
    }

    /** Normalize a saved/loadout string to a real AMBROSIA_LOADOUT_SLOT enum value. */
    static resolveAmbrosiaLoadout(value?: string | AMBROSIA_LOADOUT_SLOT | null): AMBROSIA_LOADOUT_SLOT | undefined {
        if (value === null || value === undefined) return undefined;

        // Accept canonical and numeric formats, e.g. blueberryLoadout1, Loadout 1, 1.
        const input = String(value);
        const normalized = HSUtils.removeColorTags(input).trim();

        // direct enum style
        const direct = this.getSlotEnumBySlotId(normalized);
        if (direct) return direct;

        // plain number style
        const indexMatch = normalized.match(/^(?:Loadout\s*)?(\d+)$/i);
        if (indexMatch) {
            return this.convertSettingLoadoutToSlot(indexMatch[1]);
        }

        return undefined;
    }

    /** Convert loadout-setting string (e.g. "1") to a real slot enum. */
    static convertSettingLoadoutToSlot(loadoutNumber: string): AMBROSIA_LOADOUT_SLOT | undefined {
        const loadoutEnum = Object.values(AMBROSIA_LOADOUT_SLOT).find(
            slot => slot === `blueberryLoadout${loadoutNumber}`
        ) as AMBROSIA_LOADOUT_SLOT | undefined;
        if (!loadoutEnum) {
            HSLogger.warn(`Check your loadout settings (missing loadout).`, this.#context);
            return undefined;
        }

        return loadoutEnum;
    }

    static #normalizeModeLabel(text: string): string {
        return text.replace(/\s+/g, ' ').trim().toUpperCase();
    }

    /** Add the mode button texts of the current game language, when it changed since the last load. */
    static #refreshModeLabelsIfLanguageChanged(): void {
        const language = localStorage.getItem('language') || 'en';
        if (language === this.#modeLabelsLanguage) return;
        this.#modeLabelsLanguage = language;

        void Promise.all([
            HSUtils.getGameTranslation('ambrosia.loadouts.load'),
            HSUtils.getGameTranslation('ambrosia.loadouts.save')
        ]).then(([loadLabel, saveLabel]) => {
            if (loadLabel) this.#modeLabels.loadTree.add(this.#normalizeModeLabel(loadLabel));
            if (saveLabel) this.#modeLabels.saveTree.add(this.#normalizeModeLabel(saveLabel));
        });
    }

    /** The mode shown by the toggle button's text, if it matches a known label. Cheap: no save involved. */
    static #readLoadoutModeFromButton(): BlueberryLoadoutMode | undefined {
        const modeButton = this.#cachedBlueberryToggleModeButton;
        if (!modeButton) return undefined;

        this.#refreshModeLabelsIfLanguageChanged();
        const text = this.#normalizeModeLabel(modeButton.textContent ?? '');
        if (this.#modeLabels.loadTree.has(text)) return 'loadTree';
        if (this.#modeLabels.saveTree.has(text)) return 'saveTree';
        return undefined;
    }

    /**
     * Read the game's loadout mode, independent of the game language, cheapest source first:
     * 1. live player object (patched loaders),
     * 2. the toggle button's text, compared with the game's labels in every language seen this session,
     * 3. a fresh save captured synchronously by GDS (a full game save: only when the text is unknown).
     * Returns undefined when none is available.
     */
    static #readLoadoutMode(): BlueberryLoadoutMode | undefined {
        const playerMode = HSGlobal.exposedPlayer?.blueberryLoadoutMode;
        if (playerMode === 'loadTree' || playerMode === 'saveTree') return playerMode;

        const buttonMode = this.#readLoadoutModeFromButton();
        if (buttonMode) return buttonMode;

        const rawSave = HSModuleRegistry.getModule('HSGameData')?.forceCaptureRawSaveSync();
        const savedMode = rawSave?.match(/"blueberryLoadoutMode"\s*:\s*"(loadTree|saveTree)"/)?.[1];
        return savedMode as BlueberryLoadoutMode | undefined;
    }

    /** Whether the game is currently in the specified loadout mode. Rarely, may trigger a game save (GDS). */
    static isLoadoutMode(mode: BlueberryLoadoutMode): boolean {
        const currentMode = this.#readLoadoutMode();
        if (currentMode) return currentMode === mode;

        HSLogger.warn(`Could not determine the Ambrosia loadout mode.`, this.#context);
        return false;
    }

    /** Ensure the game is in the specified loadout mode before clicking slots. */
    static ensureLoadoutMode(mode: BlueberryLoadoutMode): void {
        const modeButton = this.#cachedBlueberryToggleModeButton;
        if (!modeButton) { HSLogger.warn(`modeButton not found.`, this.#context); return; }

        if (!this.isLoadoutMode(mode)) {
            modeButton.click();
        }
    }
}
