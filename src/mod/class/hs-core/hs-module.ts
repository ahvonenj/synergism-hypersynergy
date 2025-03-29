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

    constructor(moduleName: string, context: string) {
        this.moduleName = moduleName;
        this.context = context;

        HSLogger.log(`Enabled module '${moduleName}'`);
    }

    abstract init() : void;

    getName() : string {
        return this.moduleName;
    }
}
