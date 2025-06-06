import { CSSEasingFunction } from "../../types/dom-types/hs-css-types";
import { EventMap } from "../../types/dom-types/hs-event-types";
import { HSModuleOptions } from "../../types/hs-types";
import { DelegateEventListener, RemoveDelegateEventListener } from "../../types/module-types/hs-proto-types";
import { TransitionProperties } from "../../types/module-types/hs-ui-types";
import { HSUtils } from "../hs-utils/hs-utils";
import { HSGlobal } from "./hs-global";
import { HSLogger } from "./hs-logger";
import { HSModule } from "./module/hs-module";

// Must do these global declarations for TypeScript
declare global {
    interface Element {
        delegateEventListener : DelegateEventListener<Element>;
        removeDelegateEventListener: RemoveDelegateEventListener<Element>;

        // Declare _delegateListeners attribute where we store the delegateEventListeners
        // This is so that we can use removeDelegateEventListener to remove delegate listeners
        _delegateListeners?: Map<string, Map<Function, { delegateHandler: Function }>>;
    }

    interface HTMLElement {
        transition(properties: TransitionProperties, duration?: number, timingFunction?: string): Promise<void>;
        clearTransitions(): void
        textNodes(): string[];
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

    interface String {
        colorTag(color: string) : string;
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
    
    constructor(moduleOptions : HSModuleOptions) {
        super(moduleOptions);
    }

    async init(): Promise<void> {
        HSLogger.log(`Extending native prototypes with extra functionality`, this.context);

        // Extend Element and Document prototypes with delegateEventListener method
        Element.prototype.delegateEventListener = this.#createDelegateEventListener<Element>();
        Document.prototype.delegateEventListener = this.#createDelegateEventListener<Document>();

        // Extend Element and Document prototypes with removeDelegateEventListener method
        Element.prototype.removeDelegateEventListener = this.#createRemoveDelegateEventListener<Element>();
        Document.prototype.removeDelegateEventListener = this.#createRemoveDelegateEventListener<Document>();

        // Extend HTMLElement prototype with transition method
        HTMLElement.prototype.transition = this.#createTransition();
        HTMLElement.prototype.clearTransitions = this.#createClearTransitions();

        // Extend Object with typedEntries method
        // This method is a type-safe version of Object.entries
        Object.typedEntries = this.#typedEntries;

        // Extend String prototype with colorTag method
        // This method wraps the string in a color tag for use in the mod's log
        String.prototype.colorTag = function(color: string) {
            return `<${color}>${this}</${color}>`;
        }

        // Extend HTMLElement prototype with textNodes method
        // This method returns an array of text nodes in the element
        HTMLElement.prototype.textNodes = function() {
            return Array.from(this.childNodes)
                        .filter(n => n.nodeType === Node.TEXT_NODE)
                        .map(n => n.textContent ?? null)
                        .filter(n => n !== null) as string[];
        }

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

        return function<K extends keyof EventMap>(
            this: T, 
            eventType: K, 
            selector: string, 
            callback: (this: HTMLElement, event: EventMap[K]) => void, 
            singleton?: boolean
        ): T {
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
                    callback.call(target, event as EventMap[K]);
                } else {
                    const potentialTargets = element.querySelectorAll(selector) as NodeListOf<HTMLElement>;

                    for (const matchingElement of Array.from(potentialTargets)) {
                        if (matchingElement.contains(target)) {
                            callback.call(matchingElement, event as EventMap[K]);
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

        return function<K extends keyof EventMap>(
            this: T, 
            eventType: K, 
            selector: string, 
            callback: (this: HTMLElement, event: EventMap[K]) => void, 
            singleton?: boolean
        ): T {
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

    // Creates a method that transitions CSS properties with a specified duration
    #createTransition(): (properties: TransitionProperties, duration?: number, timingFunction?: CSSEasingFunction) => Promise<void> {
        return function(this: HTMLElement, properties: TransitionProperties, duration?: number, timingFunction: CSSEasingFunction = 'linear'): Promise<void> {
            const element = this;
            const style = element.style;
            duration = duration ?? HSGlobal.HSPrototypes.defaultTransitionTiming;
            
            return new Promise<void>((resolve) => {

                // If no properties to animate, resolve immediately
                if (Object.keys(properties).length === 0) {
                    resolve();
                    return;
                }
                
                // Store original transition property to restore it later
                const originalTransition = style.transition;
                
                // Set up the transition for all specified properties
                const propertyNames = Object.keys(properties).join(', ');
                style.transition = `${propertyNames} ${duration}ms ${timingFunction}`;
                
                // Track which properties have completed their transitions
                const pendingTransitions = new Set(Object.keys(properties));
                
                // Keep track of whether we've resolved yet
                let hasResolved = false;

                const cleanup = () => {
                    if(!hasResolved) {
                        element.removeEventListener('transitionend', handleTransitionEnd as EventListener);
                        delete (element as any)._hsTransitionEndHandler;
                        style.transition = originalTransition;
                        hasResolved = true;
                        resolve();
                    }
                };
                
                const checkCompletion = () => {
                    if (!hasResolved && pendingTransitions.size === 0) {
                        cleanup();
                    }
                };
                
                const handleTransitionEnd = (e: Event) => {
                    if (!(e instanceof TransitionEvent)) return;
                    
                    // Convert the DOM event's kebab-case propertyName to camelCase for comparison
                    const camelCaseProp = HSUtils.kebabToCamel(e.propertyName);
                    
                    // Only process events for properties we're animating
                    if (pendingTransitions.has(camelCaseProp)) {
                        pendingTransitions.delete(camelCaseProp);

                        if (pendingTransitions.size === 0) {
                            cleanup();
                        }
                    }
                };

                (this as any)._hsTransitionEndHandler = handleTransitionEnd;
                
                element.addEventListener('transitionend', handleTransitionEnd as EventListener);
                
                // Fallback (50ms buffer)
                const timeoutId = setTimeout(() => {
                    if (!hasResolved) {
                        cleanup();
                    }
                }, duration + 50);
                
                // Force a reflow to ensure transition will occur
                // eslint-disable-next-line @typescript-eslint/no-unused-expressions
                element.offsetHeight;
                
                // Get current computed values before changing anything
                const computedStyle = window.getComputedStyle(element);
                let willTransition = false;
                
                // Apply the new CSS properties and detect if any will actually transition
                Object.entries(properties).forEach(([prop, value]) => {
                    // Get the current computed value
                    const currentValue = computedStyle.getPropertyValue(
                        prop.replace(/([A-Z])/g, '-$1').toLowerCase()
                    );

                    const newValue = typeof value === 'number' && prop !== 'zIndex' && prop !== 'opacity' 
                        ? `${value}px` // Add px to numeric values except for unitless properties
                        : String(value);
                    
                    // Check if the value is actually changing
                    if (currentValue && 
                        currentValue !== 'none' && 
                        currentValue !== 'auto' && 
                        currentValue !== newValue) {
                        willTransition = true;
                    } else {
                        // Remove from pending transitions since it won't trigger an event
                        pendingTransitions.delete(prop);
                    }
                    
                    // Set the new value
                    (style as any)[prop] = value;
                });
                
                // If no properties will actually transition, resolve immediately
                if (!willTransition || pendingTransitions.size === 0) {
                    clearTimeout(timeoutId);
                    cleanup();
                    return;
                }

                if (pendingTransitions.size === 0) {
                    cleanup(); // Resolve immediately if all were skipped
                }
                
                // Check completion immediately in case some properties were removed from pending
                checkCompletion();
            });
        };
    }

    #createClearTransitions(): () => void {
        return function(this: HTMLElement): void {
            this.style.transition = 'none';

            if ((this as any)._hsTransitionEndHandler) {
                this.removeEventListener('transitionend', (this as any)._hsTransitionEndHandler);
                delete (this as any)._hsTransitionEndHandler; // Clean up the stored reference
            }

            // for (const prop in this.style) {
            //     if (this.style.hasOwnProperty(prop) && prop !== 'transition') {
            //         this.style[prop] = ''; // Or perhaps remove the property
            //     }
            // }
        };
    }

    #typedEntries<T extends object>(obj: T): Array<[keyof T, T[keyof T]]> {
        return Object.entries(obj) as Array<[keyof T, T[keyof T]]>;
    };
}