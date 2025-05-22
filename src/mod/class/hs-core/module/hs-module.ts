import { HSExternalModuleKind, HSExternalModuleOptions, HSModuleOptions, HSModuleType } from "../../../types/hs-types";
import { HSLogger } from "../hs-logger";

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
    protected moduleType: HSModuleType;

    moduleColor? : string;
    isInitialized: boolean;

    constructor(moduleOptions : HSModuleOptions) {
        this.moduleName = moduleOptions.moduleName;
        this.context = moduleOptions.context;
        this.moduleColor = moduleOptions.moduleColor;
        this.moduleType = HSModuleType.MODULE;
        this.isInitialized = false;
    }

    abstract init() : Promise<void>;

    getName() : string {
        return this.moduleName;
    }

    protected setModuleType(moduleType : HSModuleType) {
        this.moduleType = moduleType;
    }
}

export class HSExternalModule extends HSModule {
    #moduleKind: HSExternalModuleKind;
    #moduleScriptUrl?: string;
    #moduleCSSUrl?: string;
    #scriptContext: string;

    constructor(moduleOptions : HSExternalModuleOptions) {
        super(moduleOptions);
        this.setModuleType(HSModuleType.EXTMODULE);

        this.#moduleKind = moduleOptions.moduleKind;
        this.#moduleScriptUrl = moduleOptions.moduleScriptUrl;
        this.#moduleCSSUrl = moduleOptions.moduleCSSUrl;
        this.#scriptContext = moduleOptions.scriptContext;
    }

    async #loadScript() {
        if(!this.#moduleScriptUrl) {
            HSLogger.error(`Could not load script for ext module ${this.moduleName} - script url missing`);
            return;
        }

        const script = document.createElement('script');
        script.type = 'text/javascript';
        script.src =  this.#moduleScriptUrl;

        document.head.appendChild(script);

        return new Promise<void>((resolve, reject) => {
            script.onload = () => resolve();
            script.onerror = () => reject();
        });
    }

    async #loadCSS() {
        if(!this.#moduleCSSUrl) {
            HSLogger.error(`Could not load CSS for ext module ${this.moduleName} - css url missing`);
            return;
        }

        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = this.#moduleCSSUrl;

        document.head.appendChild(link);

        return new Promise<void>((resolve, reject) => {
            link.onload = () => resolve();
            link.onerror = () => reject();
        });
    }

    async init() : Promise<void> {
        if(this.#scriptContext in window) {
            HSLogger.error(`Could not load ext module ${this.getName} - import conflict in window`);
            return;
        }
        
        switch(this.#moduleKind) {
            case HSExternalModuleKind.SCRIPT:
                await this.#loadScript();
                break;
            case HSExternalModuleKind.STYLE:
                await this.#loadCSS();
                break;
            case HSExternalModuleKind.BOTH:
                await this.#loadCSS();
                await this.#loadScript();
                break;
            default:
                break;
        }

        this.isInitialized = true;
    }
}
