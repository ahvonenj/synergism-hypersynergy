import {
    MAIN_VIEW, MAIN_VIEW_BUTTON_IDS,
    BUILDING_VIEW, BUILDING_VIEW_BUTTON_IDS,
    ACHIEVEMENT_VIEW, ACHIEVEMENT_VIEW_BUTTON_IDS,
    RUNE_VIEW, RUNE_VIEW_BUTTON_IDS,
    CHALLENGE_VIEW, CHALLENGE_VIEW_BUTTON_IDS,
    ANT_VIEW, ANT_VIEW_BUTTON_IDS,
    CUBE_VIEW, CUBE_VIEW_BUTTON_IDS,
    SINGULARITY_VIEW, SINGULARITY_VIEW_BUTTON_IDS,
    SETTINGS_VIEW, SETTINGS_VIEW_BUTTON_IDS,
    PSEUDOCOIN_VIEW, PSEUDOCOIN_VIEW_BUTTON_IDS,
    TRAITS_VIEW, TRAITS_VIEW_BUTTON_IDS,
    viewFromButtonId,
    VIEW_KEY, VIEW_TYPE, HSViewStateRecord,
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

    #viewClasses: Record<string, new (name: string) => GameView<VIEW_TYPE>> = {
        "BuildingView": BuildingView,
        "AchievementView": AchievementView,
        "RuneView": RuneView,
        "ChallengeView": ChallengeView,
        "AntView": AntView,
        "CubeView": CubeView,
        "TraitsView": TraitsView,
        "SingularityView": SingularityView,
        "SettingsView": SettingsView,
        "PseudoCoinView": PseudoCoinView,
    };

    #viewStates: HSViewStateRecord = {
        // Initialize MAIN_VIEW to Buildings (where the mod leave the user after loading)
        // And all subtabs to their default/first ones (allow to avoid a warning...)
        MAIN_VIEW: { currentView: new MainView('buildings'), previousView: new MainView('buildings'), viewChangeSubscribers: new Map() },
        BUILDING_VIEW: { currentView: new BuildingView('switchToCoinBuilding'), previousView: new BuildingView('unknown'), viewChangeSubscribers: new Map() },
        ACHIEVEMENT_VIEW: { currentView: new AchievementView('toggleAchievementSubTab1'), previousView: new AchievementView('unknown'), viewChangeSubscribers: new Map() },
        RUNE_VIEW: { currentView: new RuneView('toggleRuneSubTab1'), previousView: new RuneView('unknown'), viewChangeSubscribers: new Map() },
        CHALLENGE_VIEW: { currentView: new ChallengeView('toggleChallengesSubTab1'), previousView: new ChallengeView('unknown'), viewChangeSubscribers: new Map() },
        ANT_VIEW: { currentView: new AntView('toggleAntSubtab1'), previousView: new AntView('unknown'), viewChangeSubscribers: new Map() },
        CUBE_VIEW: { currentView: new CubeView('switchCubeSubTab1'), previousView: new CubeView('unknown'), viewChangeSubscribers: new Map() },
        TRAITS_VIEW: { currentView: new TraitsView('corrStatsBtn'), previousView: new TraitsView('unknown'), viewChangeSubscribers: new Map() },
        SINGULARITY_VIEW: { currentView: new SingularityView('toggleSingularitySubTab1'), previousView: new SingularityView('unknown'), viewChangeSubscribers: new Map() },
        SETTINGS_VIEW: { currentView: new SettingsView('switchSettingSubTab1'), previousView: new SettingsView('unknown'), viewChangeSubscribers: new Map() },
        PSEUDOCOIN_VIEW: { currentView: new PseudoCoinView('cartSubTab1'), previousView: new PseudoCoinView('unknown'), viewChangeSubscribers: new Map() }
    };

    #combinedViewSubscriptions: Map<string, {
        mainView: MAIN_VIEW;
        subView: SINGULARITY_VIEW;
        mainSubscriptionId?: string;
        subSubscriptionId?: string;
        lastActive: boolean;
        callback: (isActive: boolean, previousMain: GameView<MAIN_VIEW>, previousSub: GameView<SINGULARITY_VIEW>, currentMain: GameView<MAIN_VIEW>, currentSub: GameView<SINGULARITY_VIEW>) => void;
    }> = new Map();

    #mainUIViews: string[] = [
        'buildings',
        'upgrades',
        'statistics',
        'runes',
        'challenges',
        'research',
        'ants',
        'cubes',
        'traits',
        'singularity',
        'settings',
        'shop',
        'event',
        'pseudoCoins',
    ];

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

            // HSLogger.debug(() => `[MainTabDiag] Setting up watcher for main view #${view}`, self.context);

            HSElementHooker.watchElement(viewElement, async (display: string) => {
                // HSLogger.debug(() => `[MainTabDiag] watchElement callback fired for #${viewElement.id}, parsed display='${display}'`, self.context);

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
                // else HSLogger.debug(() => `[MainTabDiag] #${viewElement.id} display is '${display}' - treated as hidden, ignoring`, self.context);

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

        HSGlobal.HSGameState.viewProperties.forEach(async (viewProperties, mainViewId) => {
            for (const subViewId of viewProperties.subViewIds) {
                const subviewElement = document.querySelector(`#${subViewId}`) as HTMLElement | null;
                if (!subviewElement) {
                    HSLogger.warn(`Subview element not found: ${subViewId}`, self.context);
                    continue;
                }

                HSElementHooker.watchElement(subviewElement, async () => {
                    if (!subviewElement.classList.contains('active-subtab')) return;

                    let subViewInstance: GameView<VIEW_TYPE> | undefined;

                    try {
                        const ViewClass = this.#viewClasses[viewProperties.viewClassName];
                        if (!ViewClass) {
                            throw new Error(`Class "${viewProperties.viewClassName}" not found in viewClasses for mainViewId ${mainViewId}`);
                        }
                        subViewInstance = new ViewClass(subViewId);
                    } catch (error) {
                        HSLogger.warn(`Failed to instantiate sub-view ${viewProperties.viewClassName}: ${error}`, self.context);
                        return;
                    }

                    const viewKey = subViewInstance.getViewKey() as VIEW_KEY;
                    if (subViewInstance.getId() === self.#UNKNOWN_VIEW) {
                        HSLogger.warn(`Sub-view ${subViewId} resolved to UNKNOWN or failed to initialize.`, self.context);
                        return;
                    }

                    self.#viewStates[viewKey].previousView = self.#viewStates[viewKey].currentView;
                    self.#viewStates[viewKey].currentView = subViewInstance;

                    const previousView = self.#viewStates[viewKey].previousView;
                    const currentView = self.#viewStates[viewKey].currentView;

                    if (previousView.getName() === currentView.getName()) return;

                    HSLogger.debug(() => `Subtab UI view changed ${previousView.getName()} -> ${currentView.getName()}`, self.context);
                    self.#viewStates[viewKey].viewChangeSubscribers.forEach((callback) => {
                        try {
                            callback(previousView, currentView);
                        } catch (e) {
                            HSLogger.error(`Error when trying to call subtab VIEW change subscriber callback: ${e}`, self.context);
                        }
                    });
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

    subscribeGameStateChange<T extends GameView<VIEW_TYPE>>(viewKey: VIEW_KEY, callback: (previousView: T, currentView: T) => void): string | undefined {
        const id = HSUtils.uuidv4();

        this.#viewStates[viewKey]
            .viewChangeSubscribers
            .set(
                id,
                callback as (previousView: GameView<VIEW_TYPE>, currentView: GameView<VIEW_TYPE>) => void
            );

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
        callback: (isActive: boolean, previousMain: GameView<MAIN_VIEW>, previousSub: GameView<SINGULARITY_VIEW>, currentMain: GameView<MAIN_VIEW>, currentSub: GameView<SINGULARITY_VIEW>) => void
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
            const previousMain = this.#viewStates.MAIN_VIEW.previousView as GameView<MAIN_VIEW>;
            const currentMain = this.#viewStates.MAIN_VIEW.currentView as GameView<MAIN_VIEW>;
            const previousSub = this.#viewStates.SINGULARITY_VIEW.previousView as GameView<SINGULARITY_VIEW>;
            const currentSub = this.#viewStates.SINGULARITY_VIEW.currentView as GameView<SINGULARITY_VIEW>;
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
        const self = this;
        const viewProperties = HSGlobal.HSGameState.viewProperties.get(mainViewId);

        if (!viewProperties) {
            HSLogger.debug(() => `No view properties found for main view ID ${mainViewId}`, this.context);
            return;
        }

        const tabs = await HSElementHooker.HookElements(viewProperties.subViewIds.map(id => `#${id}`));

        tabs.forEach(async (tab) => {
            const tabId = tab.id;
            const tabElement = tab as HTMLElement;
            if (!tabElement.classList.contains('active-subtab')) return;

            let subViewInstance: GameView<VIEW_TYPE> | undefined;

            try {
                const ViewClass = this.#viewClasses[viewProperties.viewClassName];
                if (!ViewClass) {
                    throw new Error(`Class "${viewProperties.viewClassName}" not found in viewClasses for mainViewId ${mainViewId}`);
                }
                subViewInstance = new ViewClass(tabId);
            } catch (error) {
                HSLogger.warn(`Failed to instantiate sub-view ${viewProperties.viewClassName} for tab ${tabId}: ${error}`, self.context);
                return;
            }

            const viewKey = subViewInstance.getViewKey() as VIEW_KEY;
            if (subViewInstance.getId() === this.#UNKNOWN_VIEW) {
                HSLogger.warn(`Sub-view tab ${tabId} (for ${viewProperties.viewClassName}) resolved to UNKNOWN or failed to initialize.`, self.context);
                return;
            }

            self.#viewStates[viewKey].previousView = self.#viewStates[viewKey].currentView;
            self.#viewStates[viewKey].currentView = subViewInstance;

            const previousView = (self.#viewStates as any)[viewKey].previousView;
            const currentView = (self.#viewStates as any)[viewKey].currentView;

            if (previousView.getName() === currentView.getName()) return;

            self.#viewStates[viewKey].viewChangeSubscribers.forEach((callback) => {
                try {
                    callback(previousView, currentView);
                } catch (e) {
                    HSLogger.error(`Error when trying to call VIEW change subscriber callback: ${e}`, self.context);
                }
            });
        });
    }

    getCurrentUIView<T extends GameView<VIEW_TYPE>>(viewKey: VIEW_KEY): T {
        return this.#viewStates[viewKey].currentView as T;
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
            return this.#viewStates.MAIN_VIEW.currentView as MainView;
        }

        const currentView = new MainView(visibleMain);
        if (currentView.getId() === MAIN_VIEW.UNKNOWN) {
            HSLogger.warn(`getCurrentMainViewFromDOM: could not resolve MAIN_VIEW from ${visibleMain}`, this.context);
            return this.#viewStates.MAIN_VIEW.currentView as MainView;
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

export abstract class GameView<T extends VIEW_TYPE> {
    #name: string;
    #viewKey: string;

    constructor(name: string, viewKey: string) {
        this.#name = name;
        this.#viewKey = viewKey;
    }

    getName(): string {
        return this.#name;
    }

    getViewKey(): string {
        return this.#viewKey;
    }

    abstract getId(): T
    abstract getViewEnum(view: string): T

    /** Navigate to this view by clicking its associated button */
    goto(): void {
        const context = 'HSGameState';
        const id = this.getId();
        let buttonId = '';

        // Determine which button ID mapping to use based on view type
        if (id in MAIN_VIEW_BUTTON_IDS) {
            buttonId = MAIN_VIEW_BUTTON_IDS[id as MAIN_VIEW];
        } else if (id in BUILDING_VIEW_BUTTON_IDS) {
            buttonId = BUILDING_VIEW_BUTTON_IDS[id as BUILDING_VIEW];
        } else if (id in ACHIEVEMENT_VIEW_BUTTON_IDS) {
            buttonId = ACHIEVEMENT_VIEW_BUTTON_IDS[id as ACHIEVEMENT_VIEW];
        } else if (id in RUNE_VIEW_BUTTON_IDS) {
            buttonId = RUNE_VIEW_BUTTON_IDS[id as RUNE_VIEW];
        } else if (id in CHALLENGE_VIEW_BUTTON_IDS) {
            buttonId = CHALLENGE_VIEW_BUTTON_IDS[id as CHALLENGE_VIEW];
        } else if (id in ANT_VIEW_BUTTON_IDS) {
            buttonId = ANT_VIEW_BUTTON_IDS[id as ANT_VIEW];
        } else if (id in CUBE_VIEW_BUTTON_IDS) {
            buttonId = CUBE_VIEW_BUTTON_IDS[id as CUBE_VIEW];
        } else if (id in TRAITS_VIEW_BUTTON_IDS) {
            buttonId = TRAITS_VIEW_BUTTON_IDS[id as TRAITS_VIEW];
        } else if (id in SINGULARITY_VIEW_BUTTON_IDS) {
            buttonId = SINGULARITY_VIEW_BUTTON_IDS[id as SINGULARITY_VIEW];
        } else if (id in SETTINGS_VIEW_BUTTON_IDS) {
            buttonId = SETTINGS_VIEW_BUTTON_IDS[id as SETTINGS_VIEW];
        } else if (id in PSEUDOCOIN_VIEW_BUTTON_IDS) {
            buttonId = PSEUDOCOIN_VIEW_BUTTON_IDS[id as PSEUDOCOIN_VIEW];
        }

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
    #id: MAIN_VIEW;

    constructor(name: string) {
        super(name, 'MAIN_VIEW');
        this.#id = this.getViewEnum(name);
    }

    getViewEnum(view: string): MAIN_VIEW {
        switch (view) {
            case 'buildings':   return MAIN_VIEW.BUILDINGS;
            case 'upgrades':    return MAIN_VIEW.UPGRADES;
            case 'statistics':  return MAIN_VIEW.ACHIEVEMENTS;
            case 'runes':       return MAIN_VIEW.RUNES;
            case 'challenges':  return MAIN_VIEW.CHALLENGES;
            case 'research':    return MAIN_VIEW.RESEARCH;
            case 'ants':        return MAIN_VIEW.ANTS;
            case 'cubes':       return MAIN_VIEW.CUBES;
            case 'traits':      return MAIN_VIEW.TRAITS;
            case 'singularity': return MAIN_VIEW.SINGULARITY;
            case 'settings':    return MAIN_VIEW.SETTINGS;
            case 'shop':        return MAIN_VIEW.SHOP;
            case 'event':       return MAIN_VIEW.EVENT;
            case 'pseudoCoins': return MAIN_VIEW.PSEUDOCOINS;
        }
        return MAIN_VIEW.UNKNOWN;
    }

    getId(): MAIN_VIEW {
        return this.#id;
    }
}

export class BuildingView extends GameView<BUILDING_VIEW> {
    #id: BUILDING_VIEW;

    constructor(name: string) {
        super(name, 'BUILDING_VIEW');
        this.#id = this.getViewEnum(name);
    }

    getViewEnum(tab: string): BUILDING_VIEW {
        return viewFromButtonId(BUILDING_VIEW_BUTTON_IDS, tab);
    }

    getId(): BUILDING_VIEW {
        return this.#id;
    }
}

export class AchievementView extends GameView<ACHIEVEMENT_VIEW> {
    #id: ACHIEVEMENT_VIEW;

    constructor(name: string) {
        super(name, 'ACHIEVEMENT_VIEW');
        this.#id = this.getViewEnum(name);
    }

    getViewEnum(tab: string): ACHIEVEMENT_VIEW {
        return viewFromButtonId(ACHIEVEMENT_VIEW_BUTTON_IDS, tab);
    }

    getId(): ACHIEVEMENT_VIEW {
        return this.#id;
    }
}

export class RuneView extends GameView<RUNE_VIEW> {
    #id: RUNE_VIEW;

    constructor(name: string) {
        super(name, 'RUNE_VIEW');
        this.#id = this.getViewEnum(name);
    }

    getViewEnum(tab: string): RUNE_VIEW {
        return viewFromButtonId(RUNE_VIEW_BUTTON_IDS, tab);
    }

    getId(): RUNE_VIEW {
        return this.#id;
    }
}

export class ChallengeView extends GameView<CHALLENGE_VIEW> {
    #id: CHALLENGE_VIEW;

    constructor(name: string) {
        super(name, 'CHALLENGE_VIEW');
        this.#id = this.getViewEnum(name);
    }

    getViewEnum(tab: string): CHALLENGE_VIEW {
        return viewFromButtonId(CHALLENGE_VIEW_BUTTON_IDS, tab);
    }

    getId(): CHALLENGE_VIEW {
        return this.#id;
    }
}

export class AntView extends GameView<ANT_VIEW> {
    #id: ANT_VIEW;

    constructor(name: string) {
        super(name, 'ANT_VIEW');
        this.#id = this.getViewEnum(name);
    }

    getViewEnum(tab: string): ANT_VIEW {
        return viewFromButtonId(ANT_VIEW_BUTTON_IDS, tab);
    }

    getId(): ANT_VIEW {
        return this.#id;
    }
}

export class CubeView extends GameView<CUBE_VIEW> {
    #id: CUBE_VIEW

    constructor(name: string) {
        super(name, 'CUBE_VIEW');
        this.#id = this.getViewEnum(name);
    }

    getViewEnum(tab: string): CUBE_VIEW {
        return viewFromButtonId(CUBE_VIEW_BUTTON_IDS, tab);
    }

    getId(): CUBE_VIEW {
        return this.#id;
    }
}

export class TraitsView extends GameView<TRAITS_VIEW> {
    #id: TRAITS_VIEW;

    constructor(name: string) {
        super(name, 'TRAITS_VIEW');
        this.#id = this.getViewEnum(name);
    }

    getViewEnum(tab: string): TRAITS_VIEW {
        return viewFromButtonId(TRAITS_VIEW_BUTTON_IDS, tab);
    }

    getId(): TRAITS_VIEW {
        return this.#id;
    }
}

export class SingularityView extends GameView<SINGULARITY_VIEW> {
    #id: SINGULARITY_VIEW;

    constructor(name: string) {
        super(name, 'SINGULARITY_VIEW');
        this.#id = this.getViewEnum(name);
    }

    getViewEnum(tab: string): SINGULARITY_VIEW {
        return viewFromButtonId(SINGULARITY_VIEW_BUTTON_IDS, tab);
    }

    getId(): SINGULARITY_VIEW {
        return this.#id;
    }
}

export class SettingsView extends GameView<SETTINGS_VIEW> {
    #id: SETTINGS_VIEW;

    constructor(name: string) {
        super(name, 'SETTINGS_VIEW');
        this.#id = this.getViewEnum(name);
    }

    getViewEnum(tab: string): SETTINGS_VIEW {
        return viewFromButtonId(SETTINGS_VIEW_BUTTON_IDS, tab);
    }

    getId(): SETTINGS_VIEW {
        return this.#id;
    }
}

export class PseudoCoinView extends GameView<PSEUDOCOIN_VIEW> {
    #id: PSEUDOCOIN_VIEW;

    constructor(name: string) {
        super(name, 'PSEUDOCOIN_VIEW');
        this.#id = this.getViewEnum(name);
    }

    getViewEnum(tab: string): PSEUDOCOIN_VIEW {
        return viewFromButtonId(PSEUDOCOIN_VIEW_BUTTON_IDS, tab);
    }

    getId(): PSEUDOCOIN_VIEW {
        return this.#id;
    }
}
