/*
    Type definition collection: HS proto types
    Description: Collection of types specific to hs-prototypes module
    Author: Swiffy
*/

export type DelegateEventListener<T extends Node> = (this: T, eventType: string, selector: string, callback: (this: HTMLElement, event: Event) => void) => T;