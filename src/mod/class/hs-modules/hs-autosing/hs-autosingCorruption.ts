import { HSLogger } from "../../hs-core/hs-logger";
import { HSCorruptionLevel } from "../../hs-core/hs-corruption-level";

/**
 * Class: HSAutosingCorruption
 * IsExplicitHSModule: No
 * Description: Sets the game's corruption level for autosing's steps and its AOAG phase. Since the game's 4.4.0, one level
 *     (player.corruptions.next, used from the next ascension), set through the game's own controls (HSCorruptionLevel),
 *     so the game checks it: a level above what the player can reach now is lowered to it, without any message.
 * Author: Shewchou
 */
export class HSAutosingCorruption {
    readonly #context = 'HSAutosingCorruption';

    /**
     * Sets the next corruption level (synchronous, no dialog). Compared with the game's current level, not with the
     * last one asked: a level the game lowered is asked again by the next call.
     */
    setLevel(level: number): void {
        if (HSCorruptionLevel.getNext() === level) return;

        const kept = HSCorruptionLevel.setNext(level);
        if (kept === level) HSLogger.debug(() => `Corruption level set: ${level}`, this.#context);
        else HSLogger.debug(() => `Corruption level ${level} asked, the game kept ${kept} (the highest reachable now)`, this.#context);
    }

    /** The game's Max button: the highest level the player can reach now. */
    setMaxLevel(): void {
        const kept = HSCorruptionLevel.press('max');
        HSLogger.debug(() => `Corruption level set to the max: ${kept}`, this.#context);
    }
}
