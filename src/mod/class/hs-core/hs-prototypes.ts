import { DelegateEventListener } from "../../types/hs-proto-types";
import { HSLogger } from "./hs-logger";
import { HSModule } from "./hs-module";

// Must do these global declarations for TypeScript
declare global {
    interface Element {
        delegateEventListener : DelegateEventListener<Element>;
    }

    interface Document {
        delegateEventListener : DelegateEventListener<Document>;
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

        Object.typedEntries = this.#typedEntries;

        this.isInitialized = true;
    }

    #createDelegateEventListener<T extends Node & ParentNode>(): DelegateEventListener<T> {
        return function(this: T, eventType: string, selector: string, callback: (this: HTMLElement, event: Event) => void): T {
            const element = this;

            this.addEventListener(eventType, function(event: Event) {
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
            });

            return this;
        };
    }

    #typedEntries<T extends object>(obj: T): Array<[keyof T, T[keyof T]]> {
        return Object.entries(obj) as Array<[keyof T, T[keyof T]]>;
    };
}