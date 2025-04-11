export type HSElementWatcher = {
    element: HTMLElement;
    callback: (value: any) => any;
    value: any;
    parser: (value: any) => any;
    observer?: MutationObserver;
    lastCall?: number;
}