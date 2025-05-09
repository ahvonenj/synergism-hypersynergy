/*
    Type definition collection: HS proto types
    Description: Collection of types specific to hs-prototypes module
    Author: Swiffy
*/

import { EventMap } from "../hs-event-types";

export type DelegateEventListener<T extends Node> = <K extends keyof EventMap>(
    this: T, 
    eventType: K, 
    selector: string, 
    callback: (this: HTMLElement, event: EventMap[K]) => void, 
    singleton?: boolean
  ) => T;
  
  export type RemoveDelegateEventListener<T extends Node> = <K extends keyof EventMap>(
    this: T, 
    eventType: K, 
    selector: string, 
    callback: (event: EventMap[K]) => void, 
    singleton?: boolean
  ) => T;