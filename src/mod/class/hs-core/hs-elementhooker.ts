import { HSElementWatcher } from "../../types/module-types/hs-elementhooker-types";
import { HSUtils } from "../hs-utils/hs-utils";
import { HSGlobal } from "./hs-global";
import { HSLogger } from "./hs-logger";

/*
    Class: HSElementHooker
    IsExplicitHSModule: No
    Description: 
        Contains static methods to await for element(s) to exist in the DOM
        or to watch DOM elements and value changes to them
    Author: Swiffy
*/
export class HSElementHooker {
    // Class context, mainly for HSLogger
    static #context = "HSElementHooker";

    static #watchers = new Map<string, HSElementWatcher>();

    // Uses setInterval to "watch" for when an element is found in DOM
    // Returns a promise which can be awaited and resolves with reference to the element when the element is found in DOM
    static HookElement(selector: string, parent?: HTMLElement) : Promise<HTMLElement> {
        const self = this;

        return new Promise((resolve, reject) => {
            let timeout: number | undefined = undefined;
            const initialCheck = parent ? parent.querySelector(selector) as HTMLElement : document.querySelector(selector) as HTMLElement;

            if(initialCheck) {
                resolve(initialCheck);
            }

            const ivl = setInterval(() => {
                const element = parent ? parent.querySelector(selector) as HTMLElement : document.querySelector(selector) as HTMLElement;
                
                if(element) {
                    clearTimeout(timeout);
                    clearInterval(ivl);
                    resolve(element);
                }
            }, HSGlobal.HSElementHooker.elementHookUpdateMS)

            // Setup timeout for the hook if enabled
            if(HSGlobal.HSElementHooker.elementHookTimeout) {
                timeout = setTimeout(() => {
                    HSLogger.warn('Hook timed out', self.#context);
                    clearInterval(ivl);
                      
                    resolve(HSUtils.nullProxy<HTMLElement>('ElementHookTimeout'));
                }, HSGlobal.HSElementHooker.elementHookTimeout)
            }
        });
    }

    // Same as HookElement, but accepts a selector like '.someClass' or an array of selectors
    // Returns a promise which can be awaited and resolves with a list of references to all of the elements when ALL of the elements are found in DOM
    static HookElements(selector: string | string[]) : Promise<HTMLElement[]> {
        const self = this;

        return new Promise((resolve, reject) => {
            let timeout: number | undefined = undefined;

            const ivl = setInterval(() => {
                const elements : (HTMLElement | null)[] = [];

                if((Array.isArray(selector) && selector.length === 0) || (!Array.isArray(selector) && (!selector || selector === ''))) {
                    clearInterval(ivl);
                    resolve([]);
                    return;
                }

                if(Array.isArray(selector)) {
                    selector.forEach(selector => {
                        elements.push(document.querySelector(selector))
                    });
                } else {
                    const nodeList = document.querySelectorAll<HTMLElement>(selector);
                    const nodesToElements : (HTMLElement | null)[] = Array.from(nodeList);
                    elements.push(...nodesToElements);
                }

                if(!elements.includes(null) && elements.length > 0) {
                    clearTimeout(timeout);
                    clearInterval(ivl);
                    resolve(elements as HTMLElement[]);
                }
            }, HSGlobal.HSElementHooker.elementsHookUpdateMS);

            // Setup timeout for the hook if enabled
            if(HSGlobal.HSElementHooker.elementHookTimeout) {
                timeout = setTimeout(() => {
                    HSLogger.warn('Hook timed out', self.#context);
                    clearInterval(ivl);
                      
                    resolve(HSUtils.nullProxy<HTMLElement[]>('ElementsHookTimeout'));
                }, HSGlobal.HSElementHooker.elementHookTimeout)
            }
        });
    }

    // Sets up a MutationObserver to some element
    // This can be used to e.g. watch and catch changes in some element's value (like maybe you'd like to watch owned gold or diamonds)
    // As we don't have access to the game variables themselves, we just have to read values from the DOM

    // Callback is the function which the watcher calls when a change in the element is detected and the currentValue will be the parsed value of the element

    // valueParser is called before callback. It is called first when changes in element are detected and receives the element as parameter
    // It is expected that valueParser returns the value of the element in some way or form so it can be passed to callback
    // By default valueParser is a function: (element) => element.innerText

    // If greedy is set to true, the callback will be called even if the current parsed element value is the same as previous
    // Sometimes you might want to update things when the element is updated, even if the value isn't
    
    // Watches / MutationObservers are throttled to trigger 20 times per second at max to not degrade performance, especially if there are many watches
    static watchElement(element: HTMLElement, callback : (currentValue: any) => void, valueParser?: (watchedElement: HTMLElement) => any, greedy = false) {
        const self = this;

        if (!element) {
            HSLogger.warn('watchElement - element not found', this.#context);
            return false;
        }

        // Generate unique id for the watcher
        const uuid = HSUtils.uuidv4();

        // Save watcher
        this.#watchers.set(uuid, { 
            element: element,
            callback: callback,
            value: undefined,
            parser: valueParser ? valueParser : (element) => element.innerText,
            observer: undefined,
            lastCall: undefined
        });

        // Create MutationObserver
        const observer = new MutationObserver((mutations) => {
            const watcher = self.#watchers.get(uuid);

            if(watcher) {
                // Throttling
                if(watcher.lastCall && (performance.now() - watcher.lastCall) < HSGlobal.HSElementHooker.watcherThrottlingMS) {
                    return;
                }

                const wParser = watcher.parser;
                const wCallback = watcher.callback;
                const prevValue = watcher.value;

                if(wParser) {
                    // Parse the element's value with either the supplied valueParser or the default parser
                    const newValue = wParser(element);

                    // By default callback is only triggered on actual value changes, unless greedy=true
                    if (newValue !== prevValue || greedy) {
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

        if(watcher) {
            watcher.observer = observer;
        } else {
            HSLogger.warn('watchElement - error while setting up observer, could not get watcher', this.#context);
        }

        observer.observe(element, {
            characterData: true,
            childList: true,
            subtree: true
        });

        /*if(element.id) {
            HSLogger.log(`Watcher set on ${element.nodeName} (id: ${element.id}) with uuid ${uuid}`, this.#context);
        } else {
            HSLogger.log(`Watcher set on ${element.nodeName} with uuid ${uuid}`, this.#context);
        }*/

        return uuid;
    }

    static stopWatching(id: string) {
        const watcher = this.#watchers.get(id);

        if (watcher) {
            if(watcher.observer) {
                watcher.observer.disconnect();
            } else {
                HSLogger.warn(`Watcher found, but it's observer is null`, this.#context);
            }
            
            this.#watchers.delete(id);
            return true;
        }

        HSLogger.warn(`No watcher found for uuid: ${id}`);
        return false;
    }

    static stopWatchers() {
        HSLogger.log(`Stopping all watchers`, this.#context);

        this.#watchers.forEach(({ observer }) => {
            if(observer) observer.disconnect();
        });

        this.#watchers.clear();
    }
}
