/*
    Type definition collection: HS types
    Description: Collection of general types for Hypersynergism
    Author: Swiffy
*/

import { GameData } from "./data-types/hs-player-savedata";
import type { HSModule } from "../class/hs-core/module/hs-module";

// Used when listing and loading modules
export type HSModuleDefinition = {
    className: string;
    moduleClass: new (options: HSModuleOptions) => HSModule;
    context: string;
    moduleName?: string;
    loadOrder?: number;
    initImmediate?: boolean;
    moduleColor?: string;

}

export interface HSModuleOptions {
    moduleName: string, 
    context: string, 
    moduleColor?: string
}

export interface HSGameDataSubscriber {
    gameDataSubscriptionId?: string;
    gameDataCallback: (data: GameData) => Promise<void>;
    subscribeGameDataChanges: () => void;
    unsubscribeGameDataChanges: () => void;
}
