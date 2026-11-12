// The options HSModuleManager passes to a module's constructor
export interface HSModuleOptions {
    moduleName: string,
    context: string,
    moduleColor?: string
}

// One entry of the module list (hs-module-definitions.ts)
export type HSModuleDefinition = {
    className: string;
    moduleClass: new (options: HSModuleOptions) => HSModule;
    context: string;
    moduleName?: string;
    loadOrder?: number;
    initImmediate?: boolean;
    moduleColor?: string;
}

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
