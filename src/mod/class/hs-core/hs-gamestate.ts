import {
    MAIN_VIEW, MAIN_VIEW_BUTTON_IDS, MAIN_VIEW_TAB_IDS, SINGULARITY_VIEW,
    SUBTAB_BUTTON_IDS, SUBTAB_KEY, SubtabEnums,
    orderedIds, viewFromId,
    VIEW_KEY, VIEW_TYPE, ViewOf, HSViewState, HSViewStateRecord,
} from "../../types/module-types/hs-gamestate-types";
import { HSModuleOptions } from "../../types/hs-types";
import { HSUtils } from "../hs-utils/hs-utils";
import { HSElementHooker } from "./hs-elementhooker";
import { HSGlobal } from "./hs-global";
import { HSLogger } from "./hs-logger";
import { HSModule } from "./module/hs-module";

/**
 * Class: HSGameState
 * IsExplicitHSModule: Yes
 * Description:
 *     Manages the game state, including views and their transitions.
 * Author: Swiffy, XxMolkxX, Shewchou
 */
export class HSGameState extends HSModule {

    #UNKNOWN_VIEW = -1;

    // MAIN_VIEW starts on Buildings (where the mod leaves the player after loading), every subtab on its first one
    // (avoids a warning)
    #viewStates: HSViewStateRecord = {
        MAIN_VIEW: { currentView: new MainView('buildings'), previousView: new MainView('buildings'), viewChangeSubscribers: new Map() },
        ...Object.fromEntries((Object.keys(SUBTAB_BUTTON_IDS) as SUBTAB_KEY[]).map((viewKey) => [viewKey, {
            currentView: new SubtabView(viewKey, orderedIds(SUBTAB_BUTTON_IDS[viewKey])[0]),
            previousView: new SubtabView(viewKey, 'unknown'),
            viewChangeSubscribers: new Map(),
        }])),
    } as HSViewStateRecord;

    #combinedViewSubscriptions: Map<string, {
        mainView: MAIN_VIEW;
        subView: SINGULARITY_VIEW;
        mainSubscriptionId?: string;
        subSubscriptionId?: string;
        lastActive: boolean;
        callback: (isActive: boolean, previousMain: MainView, previousSub: SubtabView<'SINGULARITY_VIEW'>, currentMain: MainView, currentSub: SubtabView<'SINGULARITY_VIEW'>) => void;
    }> = new Map();

    #mainUIViews: string[] = orderedIds(MAIN_VIEW_TAB_IDS);

    constructor(moduleOptions: HSModuleOptions) {
        super(moduleOptions);
    }

    async init() {
        const self = this;
        HSLogger.log(`Initializing HSGameState module`, this.context);

        // Setup watchers and handling for when main UI view changes
        for (const view of this.#mainUIViews) {
            const viewElement = document.querySelector(`#${view}`) as HTMLDivElement;

            if (!viewElement) {
                HSLogger.warn(`[MainTabDiag] Main view element not found in DOM for selector #${view} - watcher will NOT be set up for this view`, self.context);
                continue;
            }

            HSElementHooker.watchElement(viewElement, async (display: string) => {
                if (display && display !== 'none') {
                    const uiView = new MainView(viewElement.id);

                    if (uiView.getId() !== MAIN_VIEW.UNKNOWN) {
                        self.#viewStates.MAIN_VIEW.previousView = self.#viewStates.MAIN_VIEW.currentView;
                        self.#viewStates.MAIN_VIEW.currentView = uiView;
                        HSLogger.debug(() => `Main UI view changed ${self.#viewStates.MAIN_VIEW.previousView.getName()} -> ${self.#viewStates.MAIN_VIEW.currentView.getName()}`, self.context);
                    } else {
                        HSLogger.warn(`Main UI view ${viewElement.id} not found`, self.context);
                        return;
                    }

                    // Notify subscribers of the main view change
                    self.#viewStates.MAIN_VIEW.viewChangeSubscribers.forEach((callback) => {
                        try {
                            callback(
                                self.#viewStates.MAIN_VIEW.previousView,
                                self.#viewStates.MAIN_VIEW.currentView
                            );
                        } catch (e) {
                            HSLogger.error(`Error when trying to call MAIN VIEW change subscriber callback: ${e}`, self.context);
                        }
                    });

                    this.#resolveSubViewChanges(uiView.getId());
                }
            },
            {
                characterData: false,
                childList: false,
                subtree: false,
                attributes: true,
                attributeOldValue: false,
                attributeFilter: ['style', 'class'],
                // Main-view transitions are state, not high-frequency display data.
                // Dropping a transition here leaves currentView stale until the same
                // tab is clicked again, which breaks consumers such as AutoSing.
                overrideThrottle: true,
                valueParser: (element) => {
                    const el = element as HTMLElement;

                    // Game toggles the 'active-tab' class to show/hide tabs (.tab:not(.active-tab) { display: none })
                    // Checking the class directly avoids forcing a style recalculation via getComputedStyle
                    if (el.classList.contains('tab')) {
                        return el.classList.contains('active-tab') ? 'block' : 'none';
                    }

                    // Fallback for elements not using the 'tab' class convention
                    return el.style.display || getComputedStyle(el).display;
                }
            });
        }

        HSGlobal.HSGameState.viewProperties.forEach((viewProperties) => {
            for (const subViewId of viewProperties.subViewIds) {
                const subviewElement = document.querySelector(`#${subViewId}`) as HTMLElement | null;
                if (!subviewElement) {
                    HSLogger.warn(`Subview element not found: ${subViewId}`, self.context);
                    continue;
                }

                HSElementHooker.watchElement(subviewElement, async () => {
                    if (subviewElement.classList.contains('active-subtab')) this.#setSubView(viewProperties.viewKey, subViewId);
                },
                {
                    characterData: false,
                    childList: false,
                    subtree: false,
                    attributes: true,
                    attributeOldValue: false,
                    attributeFilter: ['class'],
                    valueParser: (element) => (element as HTMLElement).className
                });
            }
        });

        // Hydrate view state from the live DOM immediately.
        // The mutation watchers above only fire on future DOM changes, so if the mod
        // loads while the player is already on some main view/subview (e.g. Ambrosia),
        // #viewStates would otherwise stay on its hardcoded defaults until the player
        // navigates away and back. That leaves any module which subscribes during its
        // own init() (like HSAmbrosia's #subscribeGameStateViewChanges) with a stale
        // "not active" view pair, so it never receives the initial tab-enter callback.
        await this.refreshCurrentViewsFromDOM();

        this.isInitialized = true;
    }

    subscribeGameStateChange<K extends VIEW_KEY>(viewKey: K, callback: (previousView: ViewOf<K>, currentView: ViewOf<K>) => void): string {
        const id = HSUtils.uuidv4();
        this.#viewStates[viewKey].viewChangeSubscribers.set(id, callback);
        return id;
    }

    unsubscribeGameStateChange(viewKey: VIEW_KEY, subscriptionId: string) {
        if (this.#viewStates[viewKey].viewChangeSubscribers.has(subscriptionId)) {
            this.#viewStates[viewKey].viewChangeSubscribers.delete(subscriptionId);
        } else {
            HSLogger.warn(`Subscription ID ${subscriptionId} not found for view key ${viewKey}`, this.context);
        }
    }

    subscribeForView(
        mainView: MAIN_VIEW,
        subView: SINGULARITY_VIEW,
        callback: (isActive: boolean) => void
    ): string | undefined {
        return this.subscribeViewPair(
            mainView,
            subView,
            (isActive) => callback(isActive)
        );
    }

    unsubscribeForView(subscriptionId: string) {
        this.unsubscribeViewPair(subscriptionId);
    }

    subscribeViewPair(
        mainView: MAIN_VIEW,
        subView: SINGULARITY_VIEW,
        callback: (isActive: boolean, previousMain: MainView, previousSub: SubtabView<'SINGULARITY_VIEW'>, currentMain: MainView, currentSub: SubtabView<'SINGULARITY_VIEW'>) => void
    ): string | undefined {
        const id = HSUtils.uuidv4();

        const combined = {
            mainView,
            subView,
            mainSubscriptionId: undefined as string | undefined,
            subSubscriptionId: undefined as string | undefined,
            lastActive: false,
            callback,
        };

        const evaluate = () => {
            const previousMain = this.#viewStates.MAIN_VIEW.previousView;
            const currentMain = this.#viewStates.MAIN_VIEW.currentView;
            const previousSub = this.#viewStates.SINGULARITY_VIEW.previousView;
            const currentSub = this.#viewStates.SINGULARITY_VIEW.currentView;
            const isActive = currentMain.getId() === mainView && currentSub.getId() === subView;

            if (isActive !== combined.lastActive) {
                combined.lastActive = isActive;
                try {
                    callback(isActive, previousMain, previousSub, currentMain, currentSub);
                } catch (e) {
                    HSLogger.error(`Error when trying to call combined view subscription callback: ${e}`, this.context);
                }
            }
        };

        const mainSubscriptionId = this.subscribeGameStateChange('MAIN_VIEW', () => evaluate());
        const subSubscriptionId = this.subscribeGameStateChange('SINGULARITY_VIEW', () => evaluate());

        combined.mainSubscriptionId = mainSubscriptionId;
        combined.subSubscriptionId = subSubscriptionId;
        this.#combinedViewSubscriptions.set(id, combined);

        evaluate();
        return id;
    }

    unsubscribeViewPair(subscriptionId: string) {
        const combined = this.#combinedViewSubscriptions.get(subscriptionId);
        if (!combined) {
            HSLogger.warn(`Combined subscription ID ${subscriptionId} not found`, this.context);
            return;
        }

        if (combined.mainSubscriptionId) {
            this.unsubscribeGameStateChange('MAIN_VIEW', combined.mainSubscriptionId);
        }
        if (combined.subSubscriptionId) {
            this.unsubscribeGameStateChange('SINGULARITY_VIEW', combined.subSubscriptionId);
        }

        this.#combinedViewSubscriptions.delete(subscriptionId);
    }

    async #resolveSubViewChanges(mainViewId: MAIN_VIEW) {
        const viewProperties = HSGlobal.HSGameState.viewProperties.get(mainViewId);

        // Upgrades, Research, Shop and Event have no subtabs in the game
        if (!viewProperties) return;

        const tabs = await HSElementHooker.HookElements(viewProperties.subViewIds.map(id => `#${id}`));

        tabs.forEach((tab) => {
            if (tab.classList.contains('active-subtab')) this.#setSubView(viewProperties.viewKey, tab.id);
        });
    }

    /** A subtab button shows as active: it becomes its tab's current view, subscribers are told if it changed */
    #setSubView(viewKey: SUBTAB_KEY, buttonId: string): void {
        const view = new SubtabView(viewKey, buttonId);
        if (view.getId() === this.#UNKNOWN_VIEW) {
            HSLogger.warn(`Sub-view ${buttonId} (${viewKey}) resolved to UNKNOWN`, this.context);
            return;
        }

        const state = this.#viewStates[viewKey] as HSViewState<SubtabView<SUBTAB_KEY>>;
        state.previousView = state.currentView;
        state.currentView = view;

        const previousView = state.previousView;
        if (previousView.getName() === view.getName()) return;

        HSLogger.debug(() => `Subtab UI view changed ${previousView.getName()} -> ${view.getName()}`, this.context);
        state.viewChangeSubscribers.forEach((callback) => {
            try {
                callback(previousView, view);
            } catch (e) {
                HSLogger.error(`Error when trying to call subtab VIEW change subscriber callback: ${e}`, this.context);
            }
        });
    }

    getCurrentUIView<K extends VIEW_KEY>(viewKey: K): ViewOf<K> {
        return this.#viewStates[viewKey].currentView;
    }

    /** Read the visible main view directly from the DOM instead of the observer cache. */
    getCurrentMainViewFromDOM(): MainView {
        const visibleMain = this.#mainUIViews.find((viewId) => {
            const element = document.getElementById(viewId) as HTMLElement | null;
            if (!element) return false;
            if (element.classList.contains('tab')) {
                return element.classList.contains('active-tab');
            }
            return getComputedStyle(element).display !== 'none';
        });

        if (!visibleMain) {
            HSLogger.debug(() => 'getCurrentMainViewFromDOM: no visible main view detected; using cached state', this.context);
            return this.#viewStates.MAIN_VIEW.currentView;
        }

        const currentView = new MainView(visibleMain);
        if (currentView.getId() === MAIN_VIEW.UNKNOWN) {
            HSLogger.warn(`getCurrentMainViewFromDOM: could not resolve MAIN_VIEW from ${visibleMain}`, this.context);
            return this.#viewStates.MAIN_VIEW.currentView;
        }

        return currentView;
    }

    /**
     * Force-refresh current main/sub-view state from DOM.
     * Useful during early startup where mutation watchers may not have emitted yet.
     */
    async refreshCurrentViewsFromDOM(): Promise<void> {
        const refreshedMainView = this.getCurrentMainViewFromDOM();

        this.#viewStates.MAIN_VIEW.previousView = this.#viewStates.MAIN_VIEW.currentView;
        this.#viewStates.MAIN_VIEW.currentView = refreshedMainView;

        await this.#resolveSubViewChanges(refreshedMainView.getId());

        HSLogger.debug(
            () => `refreshCurrentViewsFromDOM: MAIN_VIEW=${this.#viewStates.MAIN_VIEW.currentView.getName()}`,
            this.context
        );
    }
}

/** A tab or subtab, by its name: a main tab's content element id, a subtab's button id */
abstract class GameView<T extends VIEW_TYPE> {
    readonly #name: string;
    readonly #id: T;
    readonly #buttonIds: Record<T, string>;

    protected constructor(name: string, id: T, buttonIds: Record<T, string>) {
        this.#name = name;
        this.#id = id;
        this.#buttonIds = buttonIds;
    }

    getName(): string {
        return this.#name;
    }

    getId(): T {
        return this.#id;
    }

    /** Navigate to this view by clicking its own button */
    goto(): void {
        const context = 'HSGameState';
        const buttonId = this.#buttonIds[this.#id];

        if (!buttonId) {
            HSLogger.warn(`No button ID mapping found for view: ${this.getName()}`, context);
            return;
        }

        const button = document.getElementById(buttonId);
        if (!button) {
            HSLogger.warn(`Button element not found for ID: ${buttonId} (view: ${this.getName()})`, context);
            return;
        }

        button.click();
        HSLogger.debug(() => `Main UI view changed (via goto): -> ${this.getName()}`, context);
    }
}

export class MainView extends GameView<MAIN_VIEW> {
    /** @param name The tab's content element id (MAIN_VIEW_TAB_IDS) */
    constructor(name: string) {
        super(name, viewFromId(MAIN_VIEW_TAB_IDS, name), MAIN_VIEW_BUTTON_IDS);
    }
}

export class SubtabView<K extends SUBTAB_KEY> extends GameView<SubtabEnums[K]> {
    /** @param name The subtab's button id (SUBTAB_BUTTON_IDS) */
    constructor(viewKey: K, name: string) {
        super(name, viewFromId(SUBTAB_BUTTON_IDS[viewKey], name), SUBTAB_BUTTON_IDS[viewKey]);
    }
}
