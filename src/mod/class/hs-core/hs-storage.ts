import { HSModule } from "./hs-module";

export class HSStorage extends HSModule {

    constructor(moduleName: string, context: string) {
        super(moduleName, context);
    }
    
    async init(): Promise<void> { }
}