import { CUBE_VIEW, GAME_STATE_CHANGE, MAIN_VIEW } from "../../types/module-types/hs-gamestate-types";
import { HSUtils } from "../hs-utils/hs-utils";
import { HSElementHooker } from "./hs-elementhooker";
import { HSLogger } from "./hs-logger";
import { HSModule } from "./hs-module";

export class HSGameState extends HSModule {

    // MAIN UI VIEW stuff
    #currentMainUIView: MainView = new MainView('unknown');
    #previousMainUIView: MainView = new MainView('unknown');

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

    #mainViewChangeSubscribers: 
        Map<string, (previousView: MainView, currentView: MainView) => void> = 
        new Map<string, (previousView: MainView, currentView: MainView) => void>();

    // CUBE TAB specific stuff
    #currentCubeView: CubeView = new CubeView('unknown');
    #previousCubeView: CubeView = new CubeView('unknown');

    #cubeViews: string[] = [
        'cubeTab1',
        'cubeTab2',
        'cubeTab3',
        'cubeTab4',
        'cubeTab5',
        'cubeTab6',
        'cubeTab7'
    ];

    #cubeViewChangeSubscribers: 
        Map<string, (previousView: CubeView, currentView: CubeView) => void> =
        new Map<string, (previousView: CubeView, currentView: CubeView) => void>();;

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
                        self.#previousMainUIView = self.#currentMainUIView;
                        self.#currentMainUIView = uiView;
                        HSLogger.debug(`Main UI view changed ${self.#previousMainUIView.getName()} -> ${self.#currentMainUIView.getName()}`, self.context);
                    } else {
                        HSLogger.warn(`Main UI view ${view} not found`, self.context);
                        return;
                    }

                    // Notify subscribers of the main view change
                    self.#mainViewChangeSubscribers.forEach((callback) => {
                        try {
                            callback(self.#previousMainUIView, self.#currentMainUIView);
                        } catch (e) {
                            HSLogger.error(`Error when trying to call MAIN VIEW change subscriber callback: ${e}`, self.context);
                        }
                    });

                    // If the current view is cubes, we need to figure out which cube tab is active
                    if(uiView.getId() === MAIN_VIEW.CUBES) {
                        const cubeTabs = await HSElementHooker.HookElements('.cubeTab');

                        cubeTabs.forEach((cubeTab) => {
                            const cubeTabId = cubeTab.id;
                            const cubeTabState = cubeTab.style.getPropertyValue('display');

                            if(cubeTabState !== 'none') {
                                const cubeView = new CubeView(cubeTabId);
                                
                                if(cubeView.getId() !== CUBE_VIEW.UNKNOWN) {
                                    self.#previousCubeView = self.#currentCubeView;
                                    self.#currentCubeView = cubeView;
                                    HSLogger.debug(`Cube tab changed (delegate) ${self.#previousCubeView.getName()} -> ${self.#currentCubeView.getName()}`, self.context);
                                } else {
                                    HSLogger.warn(`Cube tab ${cubeTabId} not found`, self.context);
                                    return;
                                }

                                // Notify subscribers of the main view change
                                self.#cubeViewChangeSubscribers.forEach((callback) => {
                                    try {
                                        callback(self.#previousCubeView, self.#currentCubeView);
                                    } catch (e) {
                                        HSLogger.error(`Error when trying to call CUBE VIEW change subscriber callback (delegate): ${e}`, self.context);
                                    }
                                });
                            }
                        });
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

        // Setup watchers and handling for when cube tab changes
        for(const view of this.#cubeViews) {
            const viewElement = document.querySelector(`#${view}`) as HTMLDivElement;

            HSElementHooker.watchElement(viewElement, async (viewState: { view: string, state: string}) => {
                const { view, state } = viewState;

                if(state !== 'none') {
                    const cubeView = new CubeView(view);
                    
                    if(cubeView.getId() !== CUBE_VIEW.UNKNOWN) {
                        self.#previousCubeView= self.#currentCubeView;
                        self.#currentCubeView = cubeView;

                        HSLogger.debug(`Cube tab changed ${self.#previousCubeView.getName()} -> ${self.#currentCubeView.getName()}`, self.context);
                    } else {
                        HSLogger.warn(`Cube tab ${view} not found`, self.context);
                        return;
                    }

                    // Notify subscribers of the main view change
                    self.#cubeViewChangeSubscribers.forEach((callback) => {
                        try {
                            callback(self.#previousCubeView, self.#currentCubeView);
                        } catch (e) {
                            HSLogger.error(`Error when trying to call CUBE VIEW change subscriber callback: ${e}`, self.context);
                        }
                    });
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

        this.isInitialized = true;
    }

    subscribeGameStateChange(changeType: GAME_STATE_CHANGE.MAIN_VIEW, callback: (previousView: MainView, currentView: MainView) => void): string | undefined;
    subscribeGameStateChange(changeType: GAME_STATE_CHANGE.CUBE_VIEW, callback: (previousView: CubeView, currentView: CubeView) => void): string | undefined;
    subscribeGameStateChange(changeType: GAME_STATE_CHANGE.MAIN_VIEW | GAME_STATE_CHANGE.CUBE_VIEW, callback: (previousView: any, currentView: any) => void): string | undefined {
        const id = HSUtils.uuidv4();

        switch(changeType) {
            case GAME_STATE_CHANGE.MAIN_VIEW:
                this.#mainViewChangeSubscribers.set(id, callback);
                break;
            case GAME_STATE_CHANGE.CUBE_VIEW:
                this.#cubeViewChangeSubscribers.set(id, callback);
                break;
            default:
                HSLogger.warn(`Invalid game state change type: ${changeType}`, this.context);
                return undefined;
        }

        return id;
    }

    getCurrentMainUIView(): MainView {
        return this.#currentMainUIView;
    }

    getCurrentCubeView(): CubeView {
        return this.#currentCubeView;
    }
}

export class GameView {
    #name: string;

    constructor(name: string) {
        this.#name = name;
    }

    getName(): string {
        return this.#name;
    }
}

export class MainView extends GameView {
    #id: MAIN_VIEW

    constructor(name: string) {
        super(name);
        this.#id = this.#getMainViewEnum(name);
    }

    #getMainViewEnum(view: string): MAIN_VIEW {
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

export class CubeView extends GameView {
    #id: CUBE_VIEW

    constructor(name: string) {
        super(name);
        this.#id = this.#getCubeTabEnum(name);
    }

    #getCubeTabEnum(tab: string): CUBE_VIEW {
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