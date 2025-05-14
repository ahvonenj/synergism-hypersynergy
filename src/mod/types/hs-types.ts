/*
    Type definition collection: HS types
    Description: Collection of general types for Hypersynergism
    Author: Swiffy
*/

import { GameView } from "../class/hs-core/hs-gamestate";
import { PlayerData } from "./data-types/hs-player-savedata";
import { VIEW_TYPE, VIEW_KEY } from "./module-types/hs-gamestate-types";

// Used when listing and loading modules
export type HSModuleDefinition = {
    className: string;
    context?: string;
    moduleName?: string;
    loadOrder?: number;
    initImmediate?: boolean;
    moduleColor?: string;
}

/**
 * HSPersistable interface
 * 
 * Implementers should maintain a private #state property
 * that holds the state to be persisted.
 */
export interface HSPersistable {
    saveState(): Promise<any>;
    loadState(): Promise<void>;
}

export interface HSGameDataSubscriber {
    gameDataSubscriptionId?: string;
    gameDataCallback: (data: PlayerData) => Promise<void>;
    subscribeGameDataChanges: () => void;
    unsubscribeGameDataChanges: () => void;
}

/*export interface HSGameStateSubscriber<T extends GameView<VIEW_TYPE>> {
    gameStatesubscriptionId?: string;
    gameStateCallback: (previousView: T, currentView: T) => void;
    subscribeGameStateChanges: (viewKey: VIEW_KEY) => string | undefined;
    unsubscribeGameStateChanges: () => void;
}*/