import { DelegateEventListener } from "../../types/hs-proto-types";
import { HSLogger } from "./hs-logger";
import { HSModule } from "./hs-module";

declare global {
    interface Element {
        delegateEventListener : DelegateEventListener<Element>;
    }

    interface Document {
        delegateEventListener : DelegateEventListener<Document>;
    }
}

export class HSPrototypes extends HSModule {
    
    constructor(moduleName: string, context: string) {
        super(moduleName, context);
    }

    init(): void {
        HSLogger.log(`Extending native prototypes with extra functionality`, this.context);
        Element.prototype.delegateEventListener = this.#createDelegateEventListener<Element>();
        Document.prototype.delegateEventListener = this.#createDelegateEventListener<Document>();
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
}