import { HSModuleOptions } from "../../types/hs-types";
import { HSLogger } from "./hs-logger";
import { HSModule } from "./module/hs-module";

export class HSDebug extends HSModule {

    static #staticContext: string;

    constructor(moduleOptions : HSModuleOptions) {
        super(moduleOptions);
        HSDebug.#staticContext = moduleOptions.context;
    }

    async init() {
        const self = this;
        
        
        this.isInitialized = true;
    }
}