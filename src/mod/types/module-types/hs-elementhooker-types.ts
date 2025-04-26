export type HSElementWatcher = {
    element: HTMLElement;
    callback: (value: any) => any;
    value: any;
    parser: (watchedElement: HTMLElement, mutations: MutationRecord[]) => any;
    observer?: MutationObserver;
    lastCall?: number;
}

export interface HSWatcherOptions {
    valueParser?: (watchedElement: HTMLElement, mutations: MutationRecord[]) => any
    greedy?: boolean;
    overrideThrottle?: boolean;
    characterData?: boolean;
    childList?: boolean;
    subtree?: boolean;
    attributes?: boolean;
    attributeOldValue?: boolean;
    attributeFilter?: string[];
}
