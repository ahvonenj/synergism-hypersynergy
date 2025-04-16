import { HSLogger } from "../hs-core/hs-logger";
import { HSModule } from "../hs-core/hs-module";

export class HSStats extends HSModule {

    constructor(moduleName: string, context: string, moduleColor?: string) {
        super(moduleName, context, moduleColor);
    }

    async init() {
        HSLogger.log(`Initializing HSStats module`, this.context);

        /*const statLines = document.querySelectorAll('#globalCubeMultiplierStats > p.statPortion:not(:first-child):not(:last-child)');
        const statTotalLine = document.querySelectorAll('#globalCubeMultiplierStats > p.statPortion:last-child');

        if(statLines) {
            const statArray = Array.from(statLines);

            statArray.forEach(statEl => {
                console.log(statEl.textContent)
            })
        }*/

        this.isInitialized = true;
    }
}