import { HSGlobal } from "./hs-global";

/** The game's buttons of the Corruption tab's level row. */
export type HSCorruptionLevelButton = 'min' | 'down10' | 'down1' | 'up1' | 'up10' | 'max';

const BUTTON_IDS: Record<HSCorruptionLevelButton, string> = {
    min: 'corruptionLevelMin',
    down10: 'corruptionLevelDown10',
    down1: 'corruptionLevelDown1',
    up1: 'corruptionLevelUp1',
    up10: 'corruptionLevelUp10',
    max: 'corruptionLevelMax',
};
const INPUT_ID = 'corruptionLevelInput';

/** The Corruption tab's toggles, by their player.corruptions key. */
export type HSCorruptionToggle = 'autoIncrease' | 'cleanseToHighest';

const TOGGLE_IDS: Record<HSCorruptionToggle, string> = {
    autoIncrease: 'corruptionAutoIncreaseToggle',
    cleanseToHighest: 'corruptionCleanseToHighestToggle',
};

type HSLiveCorruptions = { used?: number; next?: number } & Partial<Record<HSCorruptionToggle, boolean>>;

/**
 * Class: HSCorruptionLevel
 * IsExplicitHSModule: No
 * Description: The next corruption level (player.corruptions.next, used from the next ascension, game 4.4.0), the
 *     tab's two toggles and its cleanse, changed through the Corruption tab's own controls, which work while it's hidden: the
 *     game checks the level (a level above what the player can reach now is lowered to it, without any message) and
 *     updates its tab. Read from the live player, else from those controls, where the game writes what it kept
 *     (bookmarklet). Used by autosing (HSAutosingCorruption) and the header's corruption module (HSCorruptionHeader).
 * Author: Shewchou
 */
export class HSCorruptionLevel {
    static #corruptions(): HSLiveCorruptions | undefined {
        return HSGlobal.exposedPlayer?.corruptions as HSLiveCorruptions | undefined;
    }

    /** The level the next ascension will use; NaN without the live player nor the game's input. */
    static getNext(): number {
        const next = HSCorruptionLevel.#corruptions()?.next;
        if (typeof next === 'number') return next;
        const input = document.getElementById(INPUT_ID) as HTMLInputElement | null;
        return input ? Number(input.value) : NaN;
    }

    /**
     * Sets the next level (synchronous, no dialog) through the game's input, whose change listener runs
     * setNextCorruptionLevel. Returns the level the game kept.
     */
    static setNext(level: number): number {
        const input = document.getElementById(INPUT_ID) as HTMLInputElement | null;
        if (!input) return HSCorruptionLevel.getNext();
        input.value = String(level);
        input.dispatchEvent(new Event('change'));
        return HSCorruptionLevel.getNext();
    }

    /** Clicks one of the game's level buttons. Returns the level the game kept. */
    static press(button: HSCorruptionLevelButton): number {
        document.getElementById(BUTTON_IDS[button])?.click();
        return HSCorruptionLevel.getNext();
    }

    /** The game's button text (translated by the game), undefined without the button. */
    static buttonText(button: HSCorruptionLevelButton): string | undefined {
        return document.getElementById(BUTTON_IDS[button])?.textContent?.trim() || undefined;
    }

    /** The game's description of the level input ("Corruption level for next Ascension"), translated by the game. */
    static inputLabel(): string | undefined {
        return document.getElementById(INPUT_ID)?.getAttribute('aria-label') || undefined;
    }

    /**
     * A toggle of the Corruption tab: auto-increase (the next level moves up to each newly unlocked level) or
     * cleanse to highest (a cleanse goes back to the highest level cleared instead of 0).
     */
    static getToggle(toggle: HSCorruptionToggle): boolean {
        const live = HSCorruptionLevel.#corruptions()?.[toggle];
        if (typeof live === 'boolean') return live;
        return (document.getElementById(TOGGLE_IDS[toggle]) as HTMLInputElement | null)?.checked === true;
    }

    /** Turns a toggle on or off: the game's handler flips it at each change of its checkbox. */
    static setToggle(toggle: HSCorruptionToggle, enabled: boolean): void {
        if (HSCorruptionLevel.getToggle(toggle) === enabled) return;
        document.getElementById(TOGGLE_IDS[toggle])?.click();
    }

    /** The game's text of a toggle (translated by the game), undefined without it. */
    static toggleLabel(toggle: HSCorruptionToggle): string | undefined {
        return document.getElementById(TOGGLE_IDS[toggle])?.parentElement?.querySelector('span')?.textContent?.trim() || undefined;
    }

    /**
     * The game's cleanse, without its confirm step (the caller asks for it): the current level is lowered at once to
     * 0, or to the highest level cleared with cleanse to highest, and the next level set to it. Through the game's
     * Confirm button (cleanseCorruptions), which works while hidden. Returns the level the game kept.
     */
    static cleanse(): number {
        document.getElementById('corruptionCleanseConfirm')?.click();
        return HSCorruptionLevel.getNext();
    }

    /** The game's cleanse icon (the Corruption tab's, so it follows the icon set), undefined without it. */
    static cleanseIcon(): string | undefined {
        return (document.getElementById('corruptionExitIcon') as HTMLImageElement | null)?.getAttribute('src') || undefined;
    }

    /** The game's texts of its Cleanse and Confirm buttons (translated by the game). */
    static cleanseTexts(): { cleanse?: string; confirm?: string } {
        return {
            cleanse: document.getElementById('corruptionCleanse')?.textContent?.trim() || undefined,
            confirm: document.getElementById('corruptionCleanseConfirm')?.textContent?.trim() || undefined,
        };
    }
}
