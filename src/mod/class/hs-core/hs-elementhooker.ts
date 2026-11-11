import { HSElementWatcher, HSWatcherOptions } from "../../types/module-types/hs-elementhooker-types";
import { HSUtils } from "../hs-utils/hs-utils";
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

    static #watchers = new Map<string, HSElementWatcher>();

    // Uses setInterval to "watch" for when an element is found in DOM
    // Resolves with the element when found, or null on timeout.
    static HookElement<T extends HTMLElement = HTMLElement>(selector: string, parent?: HTMLElement, timeoutMs?: number): Promise<T | null> {
        const self = this;

        return new Promise((resolve) => {
            let timeout: number | undefined = undefined;
            const initialCheck = parent ? parent.querySelector<T>(selector) : document.querySelector<T>(selector);

            if (initialCheck) {
                resolve(initialCheck);
                return;
            }

            const ivl = setInterval(() => {
                const element = parent ? parent.querySelector<T>(selector) : document.querySelector<T>(selector);

                if (element) {
                    clearTimeout(timeout);
                    clearInterval(ivl);
                    resolve(element);
                }
            }, HSGlobal.HSElementHooker.elementHookUpdateMS)

            // Use the provided timeoutMs if given, otherwise fall back to the global default
            const effectiveTimeout = typeof timeoutMs === 'number' ? timeoutMs : HSGlobal.HSElementHooker.elementHookTimeout;
            if (effectiveTimeout) {
                timeout = setTimeout(() => {
                    HSLogger.warn(escapeLogText(`Element ${selector} did not appear within ${effectiveTimeout} ms`), self.#context);
                    clearInterval(ivl);
                    resolve(null);
                }, effectiveTimeout);
            }
        });
    }

    /** Required mod UI: fail at acquisition with the missing selector, rather than at a later method call. */
    static async RequireElement<T extends HTMLElement = HTMLElement>(selector: string, parent?: HTMLElement, timeoutMs?: number): Promise<T> {
        const element = await this.HookElement<T>(selector, parent, timeoutMs);
        if (!element) throw new Error('Required element ' + selector + ' did not appear');
        return element;
    }

    // Same as HookElement, but accepts a selector like '.someClass' or an array of selectors
    // Resolves with all requested elements, or an empty array on timeout (never a partial result).
    static HookElements(selector: string | string[]): Promise<HTMLElement[]> {
        if (selector.length === 0) return Promise.resolve([]);
        const self = this;

        return new Promise((resolve) => {
            let timeout: number | undefined = undefined;

            const ivl = setInterval(() => {
                const elements: (HTMLElement | null)[] = [];

                if (Array.isArray(selector)) {
                    selector.forEach(selector => {
                        elements.push(document.querySelector(selector))
                    });
                } else {
                    const nodeList = document.querySelectorAll<HTMLElement>(selector);
                    const nodesToElements: (HTMLElement | null)[] = Array.from(nodeList);
                    elements.push(...nodesToElements);
                }

                if (!elements.includes(null) && elements.length > 0) {
                    clearTimeout(timeout);
                    clearInterval(ivl);
                    resolve(elements as HTMLElement[]);
                }
            }, HSGlobal.HSElementHooker.elementsHookUpdateMS);

            // Setup timeout for the hook if enabled
            if (HSGlobal.HSElementHooker.elementHookTimeout) {
                timeout = setTimeout(() => {
                    HSLogger.warn(escapeLogText(`Elements ${Array.isArray(selector) ? selector.join(", ") : selector} did not appear within ${HSGlobal.HSElementHooker.elementHookTimeout} ms`), self.#context);
                    clearInterval(ivl);

                    resolve([]);
                }, HSGlobal.HSElementHooker.elementHookTimeout)
            }
        });
    }

    // Sets up a MutationObserver to some element
    // This can be used to e.g. watch and catch changes in some element's value (like maybe you'd like to watch owned gold or diamonds)
    // As we don't have access to the game variables themselves, we just have to read values from the DOM

    // Callback is the function which the watcher calls when a change in the element is detected and after the valueParser has been called

    // valueParser is called before callback. It is called first when changes in element are detected and receives the element and the mutations as parameter
    // It is expected that valueParser returns the value of the element in some way or form so it can be passed to callback
    // By default valueParser is a function: (element) => element.innerText

    // If greedy is set to true, the callback will be called even if the current parsed element value is the same as previous
    // Sometimes you might want to update things when the element is updated, even if the value isn't

    // Watches / MutationObservers are throttled to trigger 20 times per second at max to not degrade performance, especially if there are many watches
    static watchElement(element: HTMLElement, callback: (currentValue: any) => void, watcherOptions?: HSWatcherOptions) {
        const self = this;

        const options: HSWatcherOptions = { ...HSGlobal.HSElementHooker.defaultWatcherOptions, ...watcherOptions };

        if (!element) {
            HSLogger.warn('watchElement - element not found', this.#context);
            return;
        }

        // Generate unique id for the watcher
        const uuid = HSUtils.uuidv4();

        // Save watcher
        this.#watchers.set(uuid, {
            element: element,
            callback: callback,
            value: undefined,
            parser: options.valueParser ? options.valueParser : (element) => element.innerText,
            observer: undefined,
            lastCall: undefined
        });

        // Create MutationObserver
        const observer = new MutationObserver((mutations) => {
            const watcher = self.#watchers.get(uuid);

            if (watcher) {
                // Throttling
                if (!options.overrideThrottle && (watcher.lastCall && (performance.now() - watcher.lastCall) < HSGlobal.HSElementHooker.watcherThrottlingMS)) {
                    return;
                }

                const wParser = watcher.parser;
                const wCallback = watcher.callback;
                const prevValue = watcher.value;

                if (wParser) {
                    // Parse the element's value with either the supplied valueParser or the default parser
                    const newValue = wParser(element, mutations);

                    // By default callback is only triggered on actual value changes, unless greedy=true
                    if (newValue !== prevValue || options.greedy) {
                        watcher.value = newValue;

                        // Call the callback with the new value
                        wCallback(newValue);
                    } else {
                        //HSLogger.warn(`watchElement - observer called, but no changes detected (prev: ${prevValue}, new: ${newValue})`, this.#context);
                    }
                } else {
                    HSLogger.warn(`watchElement - error while observing, wParser is null`, this.#context);
                }

                watcher.lastCall = performance.now();
            } else {
                HSLogger.warn('watchElement - error while observing, could not get watcher', this.#context);
            }
        });

        const watcher = self.#watchers.get(uuid);

        if (watcher) {
            watcher.observer = observer;
        } else {
            HSLogger.warn('watchElement - error while setting up observer, could not get watcher', this.#context);
        }

        let observerOptions: MutationObserverInit = {
            characterData: options.characterData,
            childList: options.childList,
            subtree: options.subtree,
            attributes: options.attributes,
        }

        if (options.attributes) {
            observerOptions = { ...observerOptions, attributeOldValue: options.attributeOldValue, attributeFilter: options.attributeFilter };
        }

        observer.observe(element, observerOptions);

        /*if(element.id) {
            HSLogger.log(`Watcher set on ${element.nodeName} (id: ${element.id}) with uuid ${uuid}`, this.#context);
        } else {
            HSLogger.log(`Watcher set on ${element.nodeName} with uuid ${uuid}`, this.#context);
        }*/

        return uuid;
    }

    // Stops the watcher with the given id
    static stopWatching(id: string) {
        const watcher = this.#watchers.get(id);

        if (watcher) {
            if (watcher.observer) {
                watcher.observer.disconnect();
            } else {
                HSLogger.warn(`Watcher found, but it's observer is null`, this.#context);
            }

            this.#watchers.delete(id);
            return true;
        }

        HSLogger.warn(`No watcher found for uuid: ${id}`, this.#context);
        return false;
    }
}
