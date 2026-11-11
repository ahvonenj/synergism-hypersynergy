import type { HSModuleOptions } from "../../../types/hs-types";

/**
 * Class: HSModule
 * IsExplicitHSModule: No
 * Description:
 *     Abstract class which all (explicit) Hypersynergism modules should extend
 * Author: Swiffy
 */
export abstract class HSModule {
    protected moduleName : string;
    protected context : string;

    moduleColor? : string;
    isInitialized: boolean;

    constructor(moduleOptions : HSModuleOptions) {
        this.moduleName = moduleOptions.moduleName;
        this.context = moduleOptions.context;
        this.moduleColor = moduleOptions.moduleColor;
        this.isInitialized = false;
    }

    abstract init() : Promise<void>;

    getName() : string {
        return this.moduleName;
    }
}
