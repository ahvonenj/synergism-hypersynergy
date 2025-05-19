import { HSLogger } from "./hs-logger";
import { HSModule } from "./module/hs-module";

export class HSDebug extends HSModule {

    static #staticContext: string;

    constructor(moduleName: string, context: string, moduleColor?: string) {
        super(moduleName, context, moduleColor);
        HSDebug.#staticContext = context;
    }

    async init() {
        const self = this;
        
        
        this.isInitialized = true;
    }
}