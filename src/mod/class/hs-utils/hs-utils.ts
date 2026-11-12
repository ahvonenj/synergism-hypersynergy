import { EventBuffType } from "../../types/data-types/hs-event-data";
import { HSSettingType } from "../../types/module-types/hs-settings-types";
import { CSSValue } from "../../types/module-types/hs-ui-types";
import { HSLogger } from "../hs-core/hs-logger";
import { HSGlobal } from "../hs-core/hs-global";
import { escapeLogText } from "./hs-escape";

/**
 * Class: HSUtils
 * IsExplicitHSModule: No
 * Description: 
 *     Static utility module for Hypersynergism.
 *     Functionalities include:
 *         - wait() method to wait for an arbitrary amount of time
 *         - uuidv4() for generating UUIDs
 *         - domid() method for generating DOM-compliant unique ids
 *         - hashCode() for calculating a unique hash for arbitrary string
 *         - N() for pretty printing numbers
 * Author: Swiffy, Shewchou
 */
export class HSUtils {
    static #context = 'HSUtils';
    static sleep = (ms: number): Promise<void> => document.hidden
        ? HSUtils.#sleepInWorker(ms)
        : new Promise<void>(resolve => setTimeout(resolve, ms));
    static tackTime = 5; // for bookmark/steam (no tack hook)

    static #_onAfterTack: ((fn: () => void) => void) | null = null;

    // The browser throttles a hidden tab's timers, not a worker's. undefined: not created yet, null: can't be used
    static #_sleepWorker: Worker | null | undefined;
    static readonly #_workerSleeps = new Map<number, () => void>();
    static #_nextWorkerSleepId = 0;

    static #getSleepWorker(): Worker | null {
        if (HSUtils.#_sleepWorker !== undefined) return HSUtils.#_sleepWorker;

        const giveUp = (reason: unknown): null => {
            HSLogger.warn(`Sleep worker unavailable, hidden tab waits will be slower: ${escapeLogText(String(reason))}`, HSUtils.#context);
            HSUtils.#_sleepWorker = null;
            // A sleep ending early is better than one never ending
            for (const resolve of HSUtils.#_workerSleeps.values()) resolve();
            HSUtils.#_workerSleeps.clear();
            return null;
        };

        try {
            const source = 'onmessage = ({ data }) => setTimeout(() => postMessage(data.id), data.ms)';
            const worker = new Worker(URL.createObjectURL(new Blob([source], { type: 'text/javascript' })));
            worker.onmessage = ({ data }: MessageEvent<number>): void => {
                HSUtils.#_workerSleeps.get(data)?.();
                HSUtils.#_workerSleeps.delete(data);
            };
            worker.onerror = (event): void => {
                worker.terminate();
                giveUp(event.message);
            };
            HSUtils.#_sleepWorker = worker;
            return worker;
        } catch (error) {
            return giveUp(error);
        }
    }

    static #sleepInWorker(ms: number): Promise<void> {
        const worker = HSUtils.#getSleepWorker();
        if (!worker) return new Promise<void>(resolve => setTimeout(resolve, ms));

        return new Promise<void>(resolve => {
            const id = HSUtils.#_nextWorkerSleepId++;
            HSUtils.#_workerSleeps.set(id, resolve);
            worker.postMessage({ id, ms });
        });
    }

    // Reusable MessageChannel for sub-millisecond event-loop yielding.
    // Queue-based so concurrent yields (if ever) work correctly.
    static readonly #_yieldChannel = (() => {
        const resolvers: (() => void)[] = [];
        const { port1, port2 } = new MessageChannel();
        port2.onmessage = () => resolvers.shift()?.();
        return { port1, resolvers };
    })();

    static yield = (fn?: () => void): Promise<void> =>
        new Promise<void>(resolve => {
            if (fn) {
                fn();
            }

            HSUtils.#_yieldChannel.resolvers.push(resolve);
            HSUtils.#_yieldChannel.port1.postMessage(null);
        });

    static cacheAfterTackHook(): boolean {
        HSUtils.#_onAfterTack = window.__HS_onAfterTack ?? null;
        return HSUtils.#_onAfterTack !== null;
    }

    // Resolves as a microtask immediately after the next game tack() completes
    // If no tack hook is available, waits 5ms instead
    static waitForNextTack = (tackCount = 1): Promise<void> => {
        if (tackCount <= 0) { return Promise.resolve(); }

        if (!HSUtils.#_onAfterTack) {
            HSUtils.cacheAfterTackHook();
            if (!HSUtils.#_onAfterTack) return HSUtils.sleep(HSUtils.tackTime * tackCount);
        }

        if (tackCount === 1) {
            return new Promise<void>(resolve => HSUtils.#_onAfterTack!(resolve));
        }

        return new Promise<void>((resolve) => {
            let remaining = tackCount;
            const next = () => {
                remaining -= 1;
                if (remaining <= 0) {
                    resolve();
                } else {
                    HSUtils.#_onAfterTack!(next);
                }
            };
            HSUtils.#_onAfterTack!(next);
        });
    };

    // Simple promise-based wait/delay utility method
    static wait(delay: number) {
        return new Promise(function (resolve) {
            setTimeout(resolve, delay);
        });
    }

    static async sleepUntilElapsed(
        prevTime: number,
        delayMs: number,
        context?: string
    ): Promise<void> {
        if (delayMs <= 0) return;

        const elapsed = performance.now() - prevTime;
        const remaining = delayMs - elapsed;

        if (remaining > 0) {
            if (HSLogger.isDebugRecorded) HSLogger.debug(() => `-------> Sleeping for ${remaining.toFixed(2)} ms to enforce delay of ${delayMs} ms`, context ?? HSUtils.#context);
            await HSUtils.sleep(remaining);
        } else {
            if (HSLogger.isDebugRecorded) HSLogger.debug(() => `-------> No need to sleep, elapsed time ${elapsed.toFixed(2)} ms already exceeds delay of ${delayMs} ms`, context ?? HSUtils.#context);
        }
    }

    static uuidv4(): string {
        return "10000000-1000-4000-8000-100000000000".replace(/[018]/g, c =>
            (+c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> +c / 4).toString(16)
        );
    }

    static domid(): string {
        return "hs-rnd-00000000000".replace(/[018]/g, c =>
            (+c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> +c / 4).toString(16)
        );
    }

    static hashCode(str: string): number {
        let hash = 0;
        let i;
        let chr;

        if (str.length === 0) return hash;

        for (i = 0; i < str.length; i++) {
            chr = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + chr;
            hash |= 0;
        }

        return hash;
    }

    static N(num: string | number, precision: number = 2, expDecimals: number = 2) {
        let tempNum = 0;
        let numString = '';

        try {
            if (typeof num === "string")
                tempNum = parseFloat(num);
            else
                tempNum = num;

            if (tempNum > 1_000_000) {
                numString = tempNum.toExponential(expDecimals).replace('+', '');
            } else {
                numString = tempNum.toFixed(precision);
            }
        } catch (e) {
            HSLogger.error(`HSUtils.N FAILED FOR ${num}`, HSUtils.#context);
            return numString;
        }

        return numString;
    }

    static getTime(): string {
        const now = new Date();
        const hours = now.getHours();
        const minutes = now.getMinutes();
        const seconds = now.getSeconds();
        const milliseconds = now.getMilliseconds();

        const formattedHours = hours.toString().padStart(2, '0');
        const formattedMinutes = minutes.toString().padStart(2, '0');
        const formattedSeconds = seconds.toString().padStart(2, '0');
        const formattedMilliseconds = milliseconds.toString().padStart(3, '0');

        return `${formattedHours}:${formattedMinutes}:${formattedSeconds}.${formattedMilliseconds}`;
    }

    static camelToKebab(str: string) {
        return str
            .replace(/^([A-Z])/, (match) => match.toLowerCase())
            .replace(/([A-Z])/g, (match) => '-' + match.toLowerCase());
    }

    static kebabToCamel(str: string) {
        return str.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
    }

    static objectToCSS<T extends Record<string, CSSValue>>(obj: T): string {
        let cssString = ``;

        if (obj === undefined || obj === null) {
            return '';
        }

        for (const [key, value] of Object.entries(obj)) {
            if (value !== undefined && value !== null) {
                cssString += `${this.camelToKebab(key)}: ${value};\n`;
            }
        }

        return cssString;
    }

    // This is jQuery's solution to this problem - it is surprisingly difficult
    // https://github.com/jquery/jquery/blob/76687566f0569dc832f13e901f0d2ce74016cd4d/test/data/jquery-3.7.1.js#L10641
    static isNumeric(n: any) {
        return !isNaN(n - parseFloat(n));
    }

    static isString(n: any) {
        return (typeof n === 'string' || n instanceof String);
    }

    static isBoolean(n: any) {
        return (typeof n == "boolean");
    }

    /**
     * A CSS url() value for any URL. Always quoted: an unquoted url() is invalid when the URL contains
     * spaces, quotes or parentheses (e.g. "Pictures/PurpleAmbrosia/Purple Upgrades/PurpleHoney.png"),
     * and the browser then silently ignores the whole CSS value.
     */
    static cssUrl(url: string): string {
        return `url(${JSON.stringify(url)})`;
    }

    /**
     * The active Exalt's icon (its id is the challenge's key). Without the live player (bookmarklet), the one the game
     * colours: var(--orchid-background-color), plain orchid in older builds.
     */
    static getActiveExaltElement(): HTMLElement | null {
        const challenges = HSGlobal.exposedPlayer?.singularityChallenges;
        if (challenges) {
            const key = Object.keys(challenges).find(k => challenges[k as keyof typeof challenges]?.enabled);
            return key ? document.getElementById(key) : null;
        }
        return document.querySelector<HTMLElement>('#singularityChallenges img.challenge[style*="orchid"]');
    }

    static #translationFiles = new Map<string, Promise<Record<string, unknown> | undefined>>();

    /**
     * Fetch a game translation file the same way the game does (cached per language).
     * Only for players without the patcher's __HS_i18next (bookmarklet): the game's i18next holds the same files.
     */
    static #loadTranslationFile(lang: string): Promise<Record<string, unknown> | undefined> {
        let file = this.#translationFiles.get(lang);
        if (!file) {
            const init = { headers: HSGlobal.Common.modRequestHeaders };
            file = fetch(`./translations/${lang}.json`, init)
                .catch(() => fetch(`https://synergism.cc/translations/${lang}.json`, init))
                .then(r => r.ok ? r.json() as Promise<Record<string, unknown>> : undefined)
                .catch(() => undefined)
                .then(json => {
                    // Don't cache failures, so a later call can retry
                    if (!json) this.#translationFiles.delete(lang);
                    return json;
                });
            this.#translationFiles.set(lang, file);
        }
        return file;
    }

    /** A whole game translation file (e.g. 'en'), fetched as the game does and cached. Undefined if unreachable. */
    static getGameTranslationFile(lang: string): Promise<Record<string, unknown> | undefined> {
        return this.#loadTranslationFile(lang);
    }

    /**
     * Get a game UI string (e.g. 'ambrosia.importTree.success') in the player's language.
     * Uses the game's i18next when the patcher exposed it, else the game's translation files,
     * with English as fallback like the game. Returns undefined if the key can't be resolved.
     * Optional `vars` fill the {{placeholders}}, like i18next.t(key, vars).
     */
    static async getGameTranslation(key: string, vars?: Record<string, string | number>): Promise<string | undefined> {
        const i18n = window.__HS_i18next;
        if (typeof i18n?.t === 'function') {
            // i18next returns the key itself when it has no text for it. Its files are the ones a fetch would get, so no fetch then
            const text = i18n.t(key, vars);
            return typeof text === 'string' && text !== key ? text : undefined;
        }

        const resolve = (file: Record<string, unknown> | undefined): string | undefined => {
            const value = key.split('.').reduce<unknown>((node, part) => (node as Record<string, unknown> | undefined)?.[part], file);
            if (typeof value !== 'string' || value.length === 0) return undefined;
            if (!vars) return value;
            return value.replace(/\{\{\s*(\w+)\s*\}\}/g, (match, name: string) => name in vars ? String(vars[name]) : match);
        };

        const lang = localStorage.getItem('language') || 'en';
        const text = resolve(await this.#loadTranslationFile(lang));
        if (text || lang === 'en') return text;
        return resolve(await this.#loadTranslationFile('en'));
    }

    // Replace color tags for panel logging
    static parseColorTags(msg: string): string {
        const tagPattern = /<([a-zA-Z]+|#[0-9A-Fa-f]{3,8})>(.*?)<\/\1>/g;

        // Replace all matched patterns with span elements
        return msg.replace(tagPattern, (match, colorName, content) => {
            return `<span style="color: ${colorName}">${content}</span>`;
        });
    }

    // Remove color tags for console logging
    static removeColorTags(msg: string): string {
        try {
            const tagPattern = /<([a-zA-Z]+|#[0-9A-Fa-f]{3,6})>(.*?)<\/\1>/g;

            return msg.replace(tagPattern, (match, colorName, content) => {
                return `${content}`;
            });
        } catch (e) {
            console.warn("Error removing color tags from log message", e);
            return `${msg}`;
        }
    }

    static eventBuffNumToName(buff: EventBuffType) {
        const reverse = {
            0: 'Quark',
            1: 'GoldenQuark',
            2: 'Cubes',
            3: 'PowderConversion',
            4: 'AscensionSpeed',
            5: 'GlobalSpeed',
            6: 'AscensionScore',
            7: 'AntSacrifice',
            8: 'Offering',
            9: 'Obtainium',
            10: 'Octeract',
            11: 'BlueberryTime',
            12: 'AmbrosiaLuck',
            13: 'OneMind',
        }

        return reverse[buff];
    }

    static asString(settingValue: HSSettingType): string {
        if (settingValue === null) return '';
        return String(settingValue);
    }

    static async waitForInnerText(
        el: HTMLElement,
        predicate: (text: string) => boolean = t => t.trim().length > 0,
        timeoutMs = 2000
    ): Promise<void> {
        // if already satisfied, don't set up observers/timers.
        if (predicate(el.textContent ?? "")) return;

        // Wait until a mutation makes the predicate true.
        return new Promise((resolve, reject) => {
            let finished = false;

            const observer = new MutationObserver(() => {
                if (predicate(el.textContent ?? "")) {
                    cleanup();
                    resolve();
                }
            });

            const timeout = window.setTimeout(() => {
                cleanup();
                reject(new Error("Timed out waiting for inner text"));
            }, timeoutMs);

            const cleanup = () => {
                if (finished) return;
                finished = true;
                clearTimeout(timeout);
                observer.disconnect();
            };

            observer.observe(el, {
                childList: true,
                characterData: true,
                subtree: true
            });
        });
    }

    static base64WithCRLF(
        base64: string,
        chunkSize = 49000
    ): string {
        const parts: string[] = [];

        for (let i = 0; i < base64.length; i += chunkSize) {
            parts.push(base64.slice(i, i + chunkSize));
        }

        // Add a thrid empty part if there's only 2, in order to fill the 3 cells on the ggsheet
        if (parts.length === 2) {
            parts.push(" ");
        }

        return parts.join("\r\n");
    }

    static sumContents(arr: readonly (number | null)[]): number {
        return arr.reduce<number>((acc, val) => acc + (val ?? 0), 0);
    }
}
