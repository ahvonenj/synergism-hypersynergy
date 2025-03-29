export type DelegateEventListener<T extends Node> = (this: T, eventType: string, selector: string, callback: (this: HTMLElement, event: Event) => void) => T;
