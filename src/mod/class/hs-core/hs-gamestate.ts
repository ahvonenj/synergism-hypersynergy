import { CUBE_VIEW, GAME_STATE_CHANGE, HSViewState, HSViewStateRecord, MAIN_VIEW, SINGULARITY_VIEW, View, VIEW_KEY, VIEW_TYPE } from "../../types/module-types/hs-gamestate-types";
import { HSUtils } from "../hs-utils/hs-utils";
import { HSElementHooker } from "./hs-elementhooker";
import { HSGlobal } from "./hs-global";
import { HSLogger } from "./hs-logger";
import { HSModule } from "./hs-module";

export class HSGameState extends HSModule {

    #UNKNOWN_VIEW = -1;

    #viewClasses: Record<string, new (name: string) => GameView<VIEW_TYPE>> = {
        "CubeView": CubeView,
        "SingularityView": SingularityView,
    };

    #viewStates: HSViewStateRecord = {
        MAIN_VIEW: { currentView: new MainView('unknown'), previousView: new MainView('unknown'), viewChangeSubscribers: new Map() },
        CUBE_VIEW: { currentView: new CubeView('unknown'), previousView: new CubeView('unknown'), viewChangeSubscribers: new Map() },
        SINGULARITY_VIEW: { currentView: new SingularityView('unknown'), previousView: new SingularityView('unknown'), viewChangeSubscribers: new Map() }
    };

    #mainUIViews: string[] = [
        'buildings',
        'upgrades',
        'statistics',
        'runes',
        'challenges',
        'research',
        'ants',
        'cubes',
        'campaigns',
        'traits',
        'settings',
        'shop',
        'singularity',
        'event',
        'pseudoCoins',
    ];

    constructor(moduleName: string, context: string, moduleColor?: string) {
        super(moduleName, context, moduleColor);
    }

    async init() {
        const self = this;
        HSLogger.log(`Initializing HSGameState module`, this.context);

        // Setup watchers and handling for when main UI view changes
        for(const view of this.#mainUIViews) {
            const viewElement = document.querySelector(`#${view}`) as HTMLDivElement;

            HSElementHooker.watchElement(viewElement, async (viewState: { view: string, state: string}) => {
                const { view, state } = viewState;

                if(state !== 'none') {
                    const uiView = new MainView(view);

                    if(uiView.getId() !== MAIN_VIEW.UNKNOWN) {
                        self.#viewStates.MAIN_VIEW.previousView = self.#viewStates.MAIN_VIEW.currentView;
                        self.#viewStates.MAIN_VIEW.currentView = uiView;
                        HSLogger.debug(`Main UI view changed ${self.#viewStates.MAIN_VIEW.previousView.getName()} -> ${self.#viewStates.MAIN_VIEW.currentView.getName()}`, self.context);
                    } else {
                        HSLogger.warn(`Main UI view ${view} not found`, self.context);
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
                attributeFilter: ['style'],
                valueParser: (element, mutations) => {
                    for(const mutation of mutations) {
                        if (mutation.type === 'attributes' && mutation.attributeName === 'style') {
                            const target = mutation.target as HTMLElement;
                            const display = target.style.getPropertyValue('display');
                            return {
                                view: target.id,
                                state: display
                            }
                        }
                    }
                }
            });
        }

        HSGlobal.HSGameState.viewProperties.forEach(async (viewProperties, mainViewId) => {
            for(const subViewId of viewProperties.subViewIds) {
                const viewElement = document.querySelector(`#${subViewId}`) as HTMLElement;
    
                HSElementHooker.watchElement(viewElement, async (viewState: { view: string, state: string}) => {
                    const { view, state } = viewState;
    
                    if(state !== 'none') {
                        let subViewInstance: GameView<VIEW_TYPE> | undefined = undefined;
    
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

                        console.log(subViewId, viewElement, state, viewKey, subViewInstance, subViewInstance.getId())
                        
                        if(subViewInstance.getId() !== self.#UNKNOWN_VIEW) {

                            self.#viewStates[viewKey].previousView = self.#viewStates[viewKey].currentView;
                            self.#viewStates[viewKey].currentView = subViewInstance;

                            const previousView = self.#viewStates[viewKey].previousView;
                            const currentView = self.#viewStates[viewKey].currentView;

                            // Notify subscribers of the main view change
                            self.#viewStates[viewKey].viewChangeSubscribers.forEach((callback) => {
                                try {
                                    callback(previousView, currentView);
                                } catch (e) {
                                    HSLogger.error(`Error when trying to call CUBE VIEW change subscriber callback: ${e}`, self.context);
                                }
                            });
    
                            HSLogger.debug(`Subview changed ${previousView.getName()} -> ${currentView.getName()}`, self.context);
                        } else {
                            HSLogger.warn(`Subview ${view} not found`, self.context);
                            return;
                        }
                    }
                }, 
                {
                    characterData: false,
                    childList: false,
                    subtree: false,
                    attributes: true,
                    attributeOldValue: false,
                    attributeFilter: ['style'],
                    valueParser: (element, mutations) => {
                        for(const mutation of mutations) {
                            if (mutation.type === 'attributes' && mutation.attributeName === 'style') {
                                const target = mutation.target as HTMLElement;
                                const display = target.style.getPropertyValue('display');
                                return {
                                    view: target.id,
                                    state: display
                                }
                            }
                        }
                    }
                });
            }
        });
        // Setup watchers and handling for when cube tab changes
        

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
        if(this.#viewStates[viewKey].viewChangeSubscribers.has(subscriptionId)) {
            this.#viewStates[viewKey].viewChangeSubscribers.delete(subscriptionId);
        } else {
            HSLogger.warn(`Subscription ID ${subscriptionId} not found for view key ${viewKey}`, this.context);
        }
    }

    async #resolveSubViewChanges(mainViewId: MAIN_VIEW) {
        const self = this;
        const viewProperties = HSGlobal.HSGameState.viewProperties.get(mainViewId);
    
        if (!viewProperties) {
            HSLogger.debug(`No view properties found for main view ID ${mainViewId}`, this.context);
            return;
        }
    
        const tabs = await HSElementHooker.HookElements(viewProperties.subViewsSelector);
    
        tabs.forEach(async (tab) => {
            const tabId = tab.id;
            const tabState = tab.style.getPropertyValue('display');
    
            if (tabState !== 'none') {
                let subViewInstance: GameView<VIEW_TYPE> | undefined = undefined;
    
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
    
                if (subViewInstance && subViewInstance.getId() !== this.#UNKNOWN_VIEW) {
                    self.#viewStates[viewKey].previousView = self.#viewStates[viewKey].currentView;
                    self.#viewStates[viewKey].currentView = subViewInstance;

                    const previousView = (self.#viewStates as any)[viewKey].previousView;
                    const currentView = (self.#viewStates as any)[viewKey].currentView;

                    // Notify subscribers of the main view change
                    self.#viewStates[viewKey].viewChangeSubscribers.forEach((callback) => {
                        try {
                            callback(previousView, currentView);
                        } catch (e) {
                            HSLogger.error(`Error when trying to call VIEW change subscriber callback: ${e}`, self.context);
                        }
                    });
                } else {
                    HSLogger.warn(`Sub-view tab ${tabId} (for ${viewProperties.viewClassName}) resolved to UNKNOWN or failed to initialize.`, self.context);
                }
            }
        });
    }

    getCurrentUIView<T extends GameView<VIEW_TYPE>>(viewKey: VIEW_KEY): T {
        return this.#viewStates[viewKey].currentView as T;
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
}

export class MainView extends GameView<MAIN_VIEW> {
    #id: MAIN_VIEW;

    constructor(name: string) {
        super(name, 'MAIN_VIEW');
        this.#id = this.getViewEnum(name);
    }

    getViewEnum(view: string): MAIN_VIEW {
        switch(view) {
            case 'buildings': return MAIN_VIEW.BUILDINGS;
            case 'upgrades': return MAIN_VIEW.UPGRADES;
            case 'statistics': return MAIN_VIEW.STATISTICS;
            case 'runes': return MAIN_VIEW.RUNES;
            case 'challenges': return MAIN_VIEW.CHALLENGES;
            case 'research': return MAIN_VIEW.RESEARCH;
            case 'ants': return MAIN_VIEW.ANTS;
            case 'cubes': return MAIN_VIEW.CUBES;
            case 'campaigns': return MAIN_VIEW.CAMPAIGNS;
            case 'traits': return MAIN_VIEW.TRAITS;
            case 'settings': return MAIN_VIEW.SETTINGS;
            case 'shop': return MAIN_VIEW.SHOP;
            case 'singularity': return MAIN_VIEW.SINGULARITY;
            case 'event': return MAIN_VIEW.EVENT;
            case 'pseudoCoins': return MAIN_VIEW.PSEUDOCOINS;
        }
        return MAIN_VIEW.UNKNOWN;
    }

    getId(): MAIN_VIEW {
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
        switch(tab) {
            case 'cubeTab1': return CUBE_VIEW.CUBE_TRIBUTES;
            case 'cubeTab2': return CUBE_VIEW.TESSERACT_GIFTS;
            case 'cubeTab3': return CUBE_VIEW.HYPERCUBE_BENEDICTIONS;
            case 'cubeTab4': return CUBE_VIEW.PLATONIC_STATUES;
            case 'cubeTab5': return CUBE_VIEW.CUBE_UPGRADES;
            case 'cubeTab6': return CUBE_VIEW.PLATONIC_UPGRADES;
            case 'cubeTab7': return CUBE_VIEW.HEPTERACT_FORGE;
        }
        return CUBE_VIEW.UNKNOWN;
    }

    getId(): CUBE_VIEW {
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
        switch(tab) {
            case 'singularityContainer1': return SINGULARITY_VIEW.SHOP;
            case 'singularityContainer2': return SINGULARITY_VIEW.PERKS;
            case 'singularityContainer3': return SINGULARITY_VIEW.OCTERACTS;
            case 'singularityContainer4': return SINGULARITY_VIEW.AMBROSIA;
        }
        return SINGULARITY_VIEW.UNKNOWN;
    }

    getId(): SINGULARITY_VIEW {
        return this.#id;
    }
}