import { HSLogger } from "../../hs-core/hs-logger";

export const EXALT_STATE_ATTRIBUTE = 'data-inside-singularity-challenge';

/**
 * Class: HSAutosingTextWaitSupersededError
 * IsExplicitHSModule: No
 * Description: Signals that a later Autosing wait took over the text observer.
 * Author: XxMolkxX, Shewchou
 */
export class HSAutosingTextWaitSupersededError extends Error {
    constructor() {
        super("Wait for inner text superseded");
        this.name = "InnerTextWaitSupersededError";
    }
}

/**
 * Class: HSAutosingDomWaits
 * IsExplicitHSModule: No
 * Description: Owns Autosing DOM observers and settles their pending waits.
 * Author: XxMolkxX, Shewchou
 */
export class HSAutosingDomWaits {
    readonly #context: string;
    readonly #isInExalt: () => boolean;
    #exaltStateObserver?: MutationObserver;
    #waitForExaltStateActive?: {
        targetState: boolean;
        resolve: (value: boolean) => void;
        finished: boolean;
    };
    #challengeCompletionObserver?: MutationObserver;
    #challengeObserverActive?: {
        predicate: () => boolean;
        resolve: () => void;
        finished: boolean;
    };
    #waitForClassConditionObserver?: MutationObserver;
    #waitForClassConditionObservedElement?: Element;
    #waitForClassConditionActive?: {
        element: Element;
        condition: () => boolean;
        resolve: (value: boolean) => void;
        finished: boolean;
    };
    #waitForInnerTextObserver?: MutationObserver;
    #waitForInnerTextObservedElement?: HTMLElement;
    #waitForInnerTextActive?: {
        el: HTMLElement;
        predicate: (text: string) => boolean;
        resolve: () => void;
        reject: (error: Error) => void;
        finished: boolean;
        timeoutId?: number;
    };

    constructor(context: string, isInExalt: () => boolean) {
        this.#context = context;
        this.#isInExalt = isInExalt;
    }

    prepare(): void {
        // The attribute wakes the wait during the reset. HSAutosing supplies the state reader for the current mode.
        if (!this.#exaltStateObserver) {
            this.#exaltStateObserver = new MutationObserver(() => {
                if (!this.#waitForExaltStateActive) return;
                if (this.#isInExalt() === this.#waitForExaltStateActive.targetState) {
                    this.finishExaltWait(true);
                }
            });
        }

        // Bookmarklet challenge progress can complete or disappear when the game exits the challenge.
        if (!this.#challengeCompletionObserver) {
            this.#challengeCompletionObserver = new MutationObserver(() => {
                if (!this.#challengeObserverActive) return;
                if (this.#challengeObserverActive.predicate()) {
                    this.#cleanupChallengeObserver();
                }
            });
        }

        if (!this.#waitForClassConditionObserver) {
            this.#waitForClassConditionObserver = new MutationObserver(() => {
                if (!this.#waitForClassConditionActive) return;
                if (this.#waitForClassConditionActive.condition()) {
                    this.#cleanupWaitForClassCondition(true);
                }
            });
        }

        // Inner text observer, used for checking the stage
        if (!this.#waitForInnerTextObserver) {
            this.#waitForInnerTextObserver = new MutationObserver(() => {
                if (!this.#waitForInnerTextActive) return;
                if (this.#waitForInnerTextActive.predicate(this.#waitForInnerTextActive.el.textContent ?? "")) {
                    this.#cleanupWaitForInnerText(true);
                }
            });
        }
    }

    stop(): void {
        this.#exaltStateObserver?.disconnect();
        this.#exaltStateObserver = undefined;
        this.finishExaltWait(false);

        this.#challengeCompletionObserver?.disconnect();
        this.#challengeCompletionObserver = undefined;
        this.#cleanupChallengeObserver();

        this.#waitForClassConditionObserver?.disconnect();
        this.#waitForClassConditionObserver = undefined;
        this.#waitForClassConditionObservedElement = undefined;
        this.#cleanupWaitForClassCondition(false);

        this.#waitForInnerTextObserver?.disconnect();
        this.#waitForInnerTextObserver = undefined;
        this.#waitForInnerTextObservedElement = undefined;
        this.#cleanupWaitForInnerText(false);
    }

    waitForChallengeProgress(element: HTMLElement, isDone: () => boolean, maxTime: number): Promise<void> {
        return new Promise<void>((resolve) => {
            if (this.#challengeObserverActive) {
                this.#cleanupChallengeObserver();
            }

            let timeoutId: number | undefined;
            const resolveAndClearTimeout = (): void => {
                if (timeoutId !== undefined) window.clearTimeout(timeoutId);
                resolve();
            };

            this.#challengeObserverActive = {
                predicate: isDone,
                resolve: resolveAndClearTimeout,
                finished: false,
            };

            this.#challengeCompletionObserver?.disconnect();
            this.#challengeCompletionObserver?.observe(element, { childList: true, characterData: true, subtree: true });
            if (this.#challengeObserverActive.predicate()) this.#cleanupChallengeObserver();
            if (this.#challengeObserverActive) {
                timeoutId = window.setTimeout(() => this.#cleanupChallengeObserver(), maxTime);
            }
        });
    }

    abortTextWait(error: Error): void {
        this.#cleanupWaitForInnerText(false, error);
    }

    waitForClassCondition(element: Element, condition: () => boolean): Promise<boolean> {
        if (condition()) return Promise.resolve(true);

        if (!this.#waitForClassConditionObserver) {
            HSLogger.warn("Performance Warning: MutationObserver for class condition changes missing and needs to be recreated.", this.#context);
            this.#waitForClassConditionObserver = new MutationObserver(() => {
                if (!this.#waitForClassConditionActive) return;
                if (this.#waitForClassConditionActive.condition()) {
                    this.#cleanupWaitForClassCondition(true);
                }
            });
        }

        return new Promise<boolean>((resolve) => {
            if (this.#waitForClassConditionActive)
                this.#cleanupWaitForClassCondition(false);

            this.#waitForClassConditionActive = {
                element,
                condition,
                resolve,
                finished: false,
            };

            if (this.#waitForClassConditionObservedElement !== element) {
                this.#waitForClassConditionObserver?.disconnect();
                this.#waitForClassConditionObserver?.observe(element, { attributes: true, attributeFilter: ['class'] });
                this.#waitForClassConditionObservedElement = element;
            }

            if (condition()) this.#cleanupWaitForClassCondition(true);
        });
    }

    waitForInnerText(el: HTMLElement, predicate: (text: string) => boolean = t => t.trim().length > 0, waitForNextMutation: boolean = false): Promise<void> {
        if (!waitForNextMutation && predicate(el.textContent ?? "")) return Promise.resolve();

        if (!this.#waitForInnerTextObserver) {
            HSLogger.warn("Performance Warning: MutationObserver for inner text changes missing and needs to be recreated.", this.#context);
            this.#waitForInnerTextObserver = new MutationObserver(() => {
                if (!this.#waitForInnerTextActive) return;
                if (this.#waitForInnerTextActive.predicate(this.#waitForInnerTextActive.el.textContent ?? "")) {
                    this.#cleanupWaitForInnerText(true);
                }
            });
        }

        return new Promise<void>((resolve, reject) => {
            if (this.#waitForInnerTextActive) {
                this.#cleanupWaitForInnerText(false, new HSAutosingTextWaitSupersededError());
            }

            this.#waitForInnerTextActive = {
                el,
                predicate,
                resolve,
                reject,
                finished: false,
            };
            this.#waitForInnerTextActive.timeoutId = window.setTimeout(() => {
                this.#cleanupWaitForInnerText(false, new Error("Timed out waiting for the game to refresh UI text"));
            }, 5000);

            if (this.#waitForInnerTextObservedElement !== el) {
                this.#waitForInnerTextObserver?.disconnect();
                this.#waitForInnerTextObserver?.observe(el, {
                    childList: true,
                    characterData: true,
                    subtree: true,
                });
                this.#waitForInnerTextObservedElement = el;
            }

            if (!waitForNextMutation && predicate(el.textContent ?? "")) this.#cleanupWaitForInnerText(true);
        });
    }

    /** Resolves true once the game's Exalt attribute changes and the state is the one waited for, false if the wait is ended first. */
    observeExaltState(targetState: boolean): Promise<boolean> {
        return new Promise<boolean>((resolve) => {
            if (this.#waitForExaltStateActive) {
                this.finishExaltWait(false);
            }

            this.#waitForExaltStateActive = {
                targetState,
                resolve,
                finished: false,
            };

            this.#exaltStateObserver?.disconnect();
            if (!this.#exaltStateObserver) {
                HSLogger.warn("Could not observe the game's Exalt state attribute.", this.#context);
                this.finishExaltWait(false);
                return;
            }
            this.#exaltStateObserver.observe(document.documentElement, {
                attributes: true,
                attributeFilter: [EXALT_STATE_ATTRIBUTE],
            });
            if (this.#isInExalt() === targetState) this.finishExaltWait(true);
        });
    }

    finishExaltWait(result: boolean): void {
        if (!this.#waitForExaltStateActive || this.#waitForExaltStateActive.finished) return;
        this.#waitForExaltStateActive.finished = true;
        const resolve = this.#waitForExaltStateActive.resolve;
        this.#waitForExaltStateActive = undefined;
        this.#exaltStateObserver?.disconnect();
        resolve(result);
    }

    #cleanupChallengeObserver(): void {
        if (!this.#challengeObserverActive || this.#challengeObserverActive.finished) return;
        this.#challengeObserverActive.finished = true;
        const resolve = this.#challengeObserverActive.resolve;
        this.#challengeObserverActive = undefined;
        this.#challengeCompletionObserver?.disconnect();
        resolve();
    }

    #cleanupWaitForClassCondition(success: boolean): void {
        if (!this.#waitForClassConditionActive || this.#waitForClassConditionActive.finished) return;
        this.#waitForClassConditionActive.finished = true;
        const resolve = this.#waitForClassConditionActive.resolve;
        this.#waitForClassConditionActive = undefined;

        this.#waitForClassConditionObserver?.disconnect();
        this.#waitForClassConditionObservedElement = undefined;

        resolve(success);
    }

    #cleanupWaitForInnerText(success: boolean, error?: Error): void {
        if (!this.#waitForInnerTextActive || this.#waitForInnerTextActive.finished) return;
        this.#waitForInnerTextActive.finished = true;
        const resolve = this.#waitForInnerTextActive.resolve;
        const reject = this.#waitForInnerTextActive.reject;
        window.clearTimeout(this.#waitForInnerTextActive.timeoutId);
        this.#waitForInnerTextActive = undefined;

        this.#waitForInnerTextObserver?.disconnect();
        this.#waitForInnerTextObservedElement = undefined;

        if (success) resolve(); else reject(error ?? new Error("Wait for inner text aborted"));
    }
}
