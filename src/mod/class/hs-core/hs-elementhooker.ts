import { HSElementWatcher } from "../../types/hs-types";
import { HSUtils } from "../hs-utils/hs-utils";
import { HSLogger } from "./hs-logger";

export class HSElementHooker {
    // Class context, mainly for HSLogger
    static #context = "HSElementHooker";

    // These are probably not needed. Was worried that the intervals might stay running for all eternity
    static #hookTimeout = 50;
    static #enableTimeout = false;

	static #watchers = new Map<string, HSElementWatcher>();

    constructor() {

    }

    // Uses setInterval to "watch" for when an element is found in DOM
    // Returns a promise which can be awaited and resolves with reference to the element when the element is found in DOM
    static HookElement(selector: string) : Promise<Element> {
        const self = this;

        return new Promise((resolve, reject) => {
            let timeout = self.#hookTimeout;

            const ivl = setInterval(() => {
                const element = document.querySelector(selector);
                
                if(element) {
                    clearInterval(ivl);
                    resolve(element);
                }

                if(self.#enableTimeout && timeout <= 0) {
                    HSLogger.warn('Hook timed out', self.#context);
                    clearInterval(ivl);
                    reject();
                }

                timeout--;
            }, 50)
        });
    }

    // Same as HookElement, but accepts a selector like '.someClass' or an array of selectors
    // Returns a promise which can be awaited and resolves with a list of references to all of the elements when ALL of the elements are found in DOM
    static HookElements(selector: string | string[]) : Promise<Element[]> {
        const self = this;

        return new Promise((resolve, reject) => {
            let timeout = self.#hookTimeout;
            
            const ivl = setInterval(() => {
                const elements : (Element | null)[] = [];

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
                    const nodeList = document.querySelectorAll(selector);
                    const nodesToElements : (Element | null)[] = Array.from(nodeList);
                    elements.push(...nodesToElements);
                }

                if(!elements.includes(null) && elements.length > 0) {
                    clearInterval(ivl);
                    resolve(elements as Element[]);
                }

                if(self.#enableTimeout && timeout <= 0) {
                    HSLogger.warn('Hook timed out', self.#context);
                    clearInterval(ivl);
                    reject();
                }

                timeout--;
            }, 150)
        });
    }

	static watchElement(element: HTMLElement, callback : (currentValue: any) => void, valueParser?: (value: any) => any) {
		const self = this;

		if (!element) {
			HSLogger.warn('watchElement - element not found', this.#context);
			return false;
		}

		const uuid = HSUtils.uuidv4();
		const parser = valueParser ? valueParser : (value: any) => value;

		this.#watchers.set(uuid, { 
			element: element,
			callback: callback,
			value: undefined,
			parser: parser,
			observer: undefined
		});

		const observer = new MutationObserver((mutations) => {
			const watcher = self.#watchers.get(uuid);

			if(watcher) {
				const wParser = watcher.parser;
				const wCallback = watcher.callback;
				const prevValue = watcher.value;

				if(wParser) {
					const newValue = wParser(element.innerText);

					if (newValue !== prevValue) {
						watcher.value = newValue;
						wCallback(newValue);
					} else {
						//HSLogger.warn(`watchElement - observer called, but no changes detected (prev: ${prevValue}, new: ${newValue})`, this.#context);
					}
				} else {
					HSLogger.warn(`watchElement - error while observing, wParser is null`, this.#context);
				}
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
