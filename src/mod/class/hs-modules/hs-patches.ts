import { HSLogger } from "../hs-core/hs-logger";
import { HSModule } from "../hs-core/hs-module";
import { PATCH_AmbrosiaViewOverflow } from "../patches/ambrosiaViewOverflow";
import { HSPatch } from "../patches/hs-patch";
import { PATCH_TestPatch } from "../patches/test";

export class HSPatches extends HSModule {

    #patchCollection: Record<string, new (patchName: string) => HSPatch> = {
        "AmbrosiaViewOverflow": PATCH_AmbrosiaViewOverflow,
        "TestPatch": PATCH_TestPatch,
    };

    #instantiatedPatches: Record<string, HSPatch> = {};

    constructor(moduleName: string, context: string, moduleColor?: string) {
        super(moduleName, context, moduleColor);
    }

    async init() {
        HSLogger.log(`Initializing HSPatches module`, this.context);

        this.isInitialized = true;
    }

    async applyPatch(patchName: string): Promise<void> {
        const patchClass = this.#patchCollection[patchName];

        if (!patchClass) {
            HSLogger.warn(`Patch "${patchName}" not found`, this.context);
            return;
        }

        let patchInstance;

        if (this.#instantiatedPatches[patchName]) {
            HSLogger.debug(`Patch "${patchName}" is already instantiated`, this.context);
            patchInstance = this.#instantiatedPatches[patchName];
        } else {
            patchInstance = new patchClass(patchName);
            this.#instantiatedPatches[patchName] = patchInstance;
        }
        
        await patchInstance.applyPatch();
    }

    async revertPatch(patchName: string): Promise<void> {
        const patchClass = this.#patchCollection[patchName];

        if (!patchClass) {
            HSLogger.warn(`Patch "${patchName}" not found`, this.context);
            return;
        }

        let patchInstance;

        if (this.#instantiatedPatches[patchName]) {
            patchInstance = this.#instantiatedPatches[patchName];
        } else {
            patchInstance = new patchClass(patchName);
            this.#instantiatedPatches[patchName] = patchInstance;
        }

        await patchInstance.revertPatch();
    }
}
