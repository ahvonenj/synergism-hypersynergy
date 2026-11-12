import { HSLogger } from "../../hs-core/hs-logger";
import { HSUI } from "../../hs-core/hs-ui";
import { escapeLogText } from "../../hs-utils/hs-escape";

/**
 * Class: HSAutosingWakeLock
 * IsExplicitHSModule: No
 * Description: Keeps the screen on and the PC awake while Auto-Sing runs with the game in view.
 *              The browser releases the lock when the tab is hidden: it's requested again when the tab comes back.
 * Author: Shewchou
 */
export class HSAutosingWakeLock {
    #context = 'HSAutosing';
    #wanted = false;
    #requesting = false;
    #refusalNotified = false;
    #lock?: WakeLockSentinel;

    #onVisibilityChange = (): void => {
        void this.#request();
    };

    start(): void {
        if (this.#wanted) return;
        this.#wanted = true;
        this.#refusalNotified = false;
        document.addEventListener('visibilitychange', this.#onVisibilityChange);
        void this.#request();
    }

    stop(): void {
        if (!this.#wanted) return;
        this.#wanted = false;
        document.removeEventListener('visibilitychange', this.#onVisibilityChange);
        void this.#release();
    }

    async #request(): Promise<void> {
        if (!this.#wanted || this.#lock || this.#requesting || document.hidden) return;

        if (!('wakeLock' in navigator)) {
            this.#notifyRefusal('this browser has no wake lock');
            return;
        }

        this.#requesting = true;
        try {
            const lock = await navigator.wakeLock.request('screen');
            // Stopped during the request
            if (!this.#wanted) {
                await lock.release();
                return;
            }
            this.#lock = lock;
            lock.addEventListener('release', () => {
                if (this.#lock === lock) this.#lock = undefined;
            });
        } catch (error) {
            // Hidden during the request: not a refusal, the request is made again when the tab comes back
            if (!document.hidden) this.#notifyRefusal(error instanceof Error ? error.message : String(error));
        } finally {
            this.#requesting = false;
        }
    }

    async #release(): Promise<void> {
        const lock = this.#lock;
        this.#lock = undefined;
        try {
            await lock?.release();
        } catch (error) {
            HSLogger.warn(`Could not release the wake lock: ${escapeLogText(String(error))}`, this.#context);
        }
    }

    // A log alone would go unseen: the mod panel is usually closed during a run
    #notifyRefusal(reason: string): void {
        if (this.#refusalNotified) return;
        this.#refusalNotified = true;
        HSLogger.warn(`Wake lock refused: ${escapeLogText(reason)}`, this.#context);
        HSUI.Notify("Auto-Sing can't keep the PC awake: the browser refused.", { notificationType: 'warning' });
    }
}
