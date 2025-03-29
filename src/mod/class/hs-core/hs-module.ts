import { HSLogger } from "./hs-logger";

/*
    Class: HSModule
    IsExplicitHSModule: No
    Description: 
        Abstract class which all (explicit) Hypersynergism modules should extend
    Author: Swiffy
*/
export abstract class HSModule {
    protected moduleName : string;
    protected context : string;
    isInitialized: boolean;

    constructor(moduleName: string, context: string) {
        this.moduleName = moduleName;
        this.context = context;
        this.isInitialized = false;

        HSLogger.log(`Enabled module '${moduleName}'`);
    }

    abstract init() : Promise<void>;

    getName() : string {
        return this.moduleName;
    }
}
