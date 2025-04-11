/*
    Type definition collection: HS types
    Description: Collection of general types for Hypersynergism
    Author: Swiffy
*/

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