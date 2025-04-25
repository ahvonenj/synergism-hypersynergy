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
    moduleColor? : string;
    isInitialized: boolean;

    constructor(moduleName: string, context: string, moduleColor?: string) {
        this.moduleName = moduleName;
        this.context = context;
        this.moduleColor = moduleColor;
        this.isInitialized = false;

        // Checking that the colorTag prototype method exists just to be safe (it's defined by the HSPrototypes module)
        if(this.moduleColor && typeof String.prototype.colorTag === 'function')
            HSLogger.log(`Enabled module '${moduleName.colorTag(this.moduleColor)}'`, this.context);
        else
            HSLogger.log(`Enabled module '${moduleName}'`, this.context);
    }

    abstract init() : Promise<void>;

    getName() : string {
        return this.moduleName;
    }
}
