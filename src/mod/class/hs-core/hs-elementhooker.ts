import { HSWatcherOptions } from "../../types/module-types/hs-elementhooker-types";
import { HSGlobal } from "./hs-global";
import { HSLogger } from "./hs-logger";
import { escapeLogText } from "../hs-utils/hs-escape";

/**
 * Class: HSElementHooker
 * IsExplicitHSModule: No
 * Description:
 *     Contains static methods to await for element(s) to exist in the DOM
 *     or to watch DOM elements and value changes to them
 * Author: Swiffy
*/
export class HSElementHooker {
    // Class context, mainly for HSLogger
    static #context = "HSElementHooker";

    /**
     * Checks `find` at once, then every `elementHookUpdateMS` until it returns a value.
     * Resolves with that value, or null after the timeout (0: no timeout).
     * The wait is short and its targets are usually there already: a document-wide
     * MutationObserver would fire on every text update of the game instead.
     */
    static #poll<R>(find: () => R | null, label: string, timeoutMs?: number): Promise<R | null> {
        const initial = find();
        if (initial !== null) return Promise.resolve(initial);

        return new Promise((resolve) => {
            let timeout: number | undefined = undefined;

            const ivl = setInterval(() => {
                const found = find();
                if (found === null) return;
                clearTimeout(timeout);
                clearInterval(ivl);
                resolve(found);
            }, HSGlobal.HSElementHooker.elementHookUpdateMS);

            const effectiveTimeout = timeoutMs ?? HSGlobal.HSElementHooker.elementHookTimeout;
            if (effectiveTimeout) {
                timeout = setTimeout(() => {
                    HSLogger.warn(escapeLogText(`${label} did not appear within ${effectiveTimeout} ms`), this.#context);
                    clearInterval(ivl);
                    resolve(null);
                }, effectiveTimeout);
            }
        });
    }

    // Resolves with the element when found, or null on timeout.
    static HookElement<T extends HTMLElement = HTMLElement>(selector: string, parent?: HTMLElement, timeoutMs?: number): Promise<T | null> {
        return this.#poll(
            () => (parent ?? document).querySelector<T>(selector),
            `Element ${selector}`,
            timeoutMs
        );
    }

    /** Required mod UI: fail at acquisition with the missing selector, rather than at a later method call. */
    static async RequireElement<T extends HTMLElement = HTMLElement>(selector: string, parent?: HTMLElement, timeoutMs?: number): Promise<T> {
        const element = await this.HookElement<T>(selector, parent, timeoutMs);
        if (!element) throw new Error('Required element ' + selector + ' did not appear');
        return element;
    }

    // Same as HookElement, but accepts a selector like '.someClass' (every match, at least one)
    // or an array of selectors (one element each, all of them).
    // Resolves with all requested elements, or an empty array on timeout (never a partial result).
    static async HookElements(selector: string | string[], timeoutMs?: number): Promise<HTMLElement[]> {
        if (selector.length === 0) return [];

        const find = (): HTMLElement[] | null => {
            if (Array.isArray(selector)) {
                const elements = selector.map(s => document.querySelector<HTMLElement>(s));
                return elements.includes(null) ? null : elements as HTMLElement[];
            }
            const elements = Array.from(document.querySelectorAll<HTMLElement>(selector));
            return elements.length > 0 ? elements : null;
        };

        const label = `Elements ${Array.isArray(selector) ? selector.join(", ") : selector}`;
        return (await this.#poll(find, label, timeoutMs)) ?? [];
    }

    /**
     * Calls `callback` with the element's parsed value each time a mutation changes it.
     * `valueParser` (default: the element's innerText) receives the element and the mutations.
     * Every mutation is handled: a dropped one would leave a stale value behind.
     * Returns a function that stops the watcher, or undefined when the element is missing.
     */
    static watchElement(element: HTMLElement, callback: (currentValue: any) => void, watcherOptions?: HSWatcherOptions): (() => void) | undefined {
        if (!element) {
            HSLogger.warn('watchElement - element not found', this.#context);
            return undefined;
        }

        const options: HSWatcherOptions = { ...HSGlobal.HSElementHooker.defaultWatcherOptions, ...watcherOptions };
        const parser = options.valueParser ?? ((el: HTMLElement) => el.innerText);
        let value: any = undefined;

        const observer = new MutationObserver((mutations) => {
            const newValue = parser(element, mutations);
            if (newValue === value) return;
            value = newValue;
            callback(newValue);
        });

        const observerOptions: MutationObserverInit = {
            characterData: options.characterData,
            childList: options.childList,
            subtree: options.subtree,
            attributes: options.attributes,
        };
        // An empty filter would observe no attribute at all
        if (options.attributes && options.attributeFilter?.length) {
            observerOptions.attributeFilter = options.attributeFilter;
        }

        observer.observe(element, observerOptions);
        return () => observer.disconnect();
    }
}
