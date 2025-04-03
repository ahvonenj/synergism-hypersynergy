import { HSModule } from "./hs-module";

export class HSStorage extends HSModule {

    constructor(moduleName: string, context: string, moduleColor?: string) {
        super(moduleName, context, moduleColor);
    }

    async init(): Promise<void> { }
}