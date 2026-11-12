export interface HSWatcherOptions {
    valueParser?: (watchedElement: HTMLElement, mutations: MutationRecord[]) => any
    characterData?: boolean;
    childList?: boolean;
    subtree?: boolean;
    attributes?: boolean;
    attributeFilter?: string[];
}
