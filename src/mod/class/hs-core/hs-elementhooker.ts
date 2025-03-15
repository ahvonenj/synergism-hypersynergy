import { HSLogger } from "./hs-logger";

export class HSElementHooker {
	// Class context, mainly for HSLogger
	static #context = "HSElementHooker";

	// These are probably not needed. Was worried that the intervals might stay running for all eternity
	static #hookTimeout = 50;
	static #enableTimeout = false;

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
}