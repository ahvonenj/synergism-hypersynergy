import { DelegateEventListener, RemoveDelegateEventListener } from "../../types/hs-proto-types";
import { HSLogger } from "./hs-logger";
import { HSModule } from "./hs-module";

// Must do these global declarations for TypeScript
declare global {
    interface Element {
        delegateEventListener : DelegateEventListener<Element>;
        removeDelegateEventListener: RemoveDelegateEventListener<Element>;

        // Declare _delegateListeners attribute where we store the delegateEventListeners
        // This is so that we can use removeDelegateEventListener to remove delegate listeners
        _delegateListeners?: Map<string, Map<Function, { delegateHandler: Function }>>;
    }

    interface Document {
        delegateEventListener : DelegateEventListener<Document>;
        removeDelegateEventListener: RemoveDelegateEventListener<Document>;

        // Declare _delegateListeners attribute where we store the delegateEventListeners
        // This is so that we can use removeDelegateEventListener to remove delegate listeners
        _delegateListeners?: Map<string, Map<Function, { delegateHandler: Function }>>;
    }

    interface Node {
        // Declare _delegateListeners attribute where we store the delegateEventListeners
        // This is so that we can use removeDelegateEventListener to remove delegate listeners
        _delegateListeners?: Map<string, Map<Function, { delegateHandler: Function }>>;
    }

    interface ObjectConstructor {
        typedEntries<T extends object>(obj: T): Array<[keyof T, T[keyof T]]>;
    }
}

/*
    Class: HSPrototypes
    IsExplicitHSModule: Yes
    Description: 
        Prototype extension module for Hypersynergism.
        All (global) prototype extensions should be implemented here.
    Author: Swiffy
*/
export class HSPrototypes extends HSModule {
    
    constructor(moduleName: string, context: string) {
        super(moduleName, context);
    }

    async init(): Promise<void> {
        HSLogger.log(`Extending native prototypes with extra functionality`, this.context);

        Element.prototype.delegateEventListener = this.#createDelegateEventListener<Element>();
        Document.prototype.delegateEventListener = this.#createDelegateEventListener<Document>();

        Element.prototype.removeDelegateEventListener = this.#createRemoveDelegateEventListener<Element>();
        Document.prototype.removeDelegateEventListener = this.#createRemoveDelegateEventListener<Document>();

        Object.typedEntries = this.#typedEntries;

        this.isInitialized = true;
    }

    #getEventSelectorKey(eventType: string, selector: string): string {
        return `${eventType}:${selector}`;
    }

    // This can be called like document.createDelegateEventListener('click', '.some-child-element', (e) => { <callback> }, true/false)
    // The singleton boolean, if set to true, prevents creating duplicate delegateEventListeners,
    // duplicate meaning that the eventType, selector and callback are exactly the same
    #createDelegateEventListener<T extends Node & ParentNode>(): DelegateEventListener<T> {
        const self = this;

        return function(this: T, eventType: string, selector: string, callback: (this: HTMLElement, event: Event) => void, singleton?: boolean): T {
            const element = this;

            // Create the _delegateListeners Map on the element if it doesn't exist
            if (!element._delegateListeners) {
                element._delegateListeners = new Map();
            }

            // Generate unique "event selector key" based on the event type and the selector
            const key = self.#getEventSelectorKey(eventType, selector);

            // Prevent duplicate listeners if singleton=true
            if ((singleton !== undefined && singleton === true) && element._delegateListeners.has(key) && element._delegateListeners.get(key)!.size > 0) {
                return this;
            }

            // Set a new delegateListener key in the map
            if (!element._delegateListeners.has(key)) {
                element._delegateListeners.set(key, new Map());
            }

            // Delegate event handler
            const delegateHandler = function(event: Event) {
                const target = event.target as HTMLElement;

                if (target.matches(selector)) {
                    callback.call(target, event);
                } else {
                    const potentialTargets = element.querySelectorAll(selector) as NodeListOf<HTMLElement>;

                    for (const matchingElement of Array.from(potentialTargets)) {
                        if (matchingElement.contains(target)) {
                            callback.call(matchingElement, event);
                            break;
                        }
                    }
                }
            };

            // Add the handler to the _delegateListeners map at the correct key
            element._delegateListeners.get(key)!.set(callback, { delegateHandler });

            // Bind the event listener
            this.addEventListener(eventType, delegateHandler);

            return this;
        };
    }

    #createRemoveDelegateEventListener<T extends Node & ParentNode>(): RemoveDelegateEventListener<T> {
        const self = this;

        return function(this: T, eventType: string, selector: string, callback: (this: HTMLElement, event: Event) => void): T {
            const element = this;

            if (!element._delegateListeners) {
                return this;
            }

            const key = self.#getEventSelectorKey(eventType, selector);
            const handlersMap = element._delegateListeners.get(key);

            if (!handlersMap) {
                return this;
            }

            // Get the stored handler info
            const handlerInfo = handlersMap.get(callback);

            // If the handler exists, remove it
            if (handlerInfo) {
                element.removeEventListener(eventType, handlerInfo.delegateHandler as EventListener);
                handlersMap.delete(callback);

                if (handlersMap.size === 0) {
                    element._delegateListeners.delete(key);
                }

                if (element._delegateListeners.size === 0) {
                    delete element._delegateListeners;
                }
            }

            return this;
        }
    }

    #typedEntries<T extends object>(obj: T): Array<[keyof T, T[keyof T]]> {
        return Object.entries(obj) as Array<[keyof T, T[keyof T]]>;
    };
}