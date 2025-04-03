import { ETalismanFragmentIndex } from "../../types/hs-types";
import { HSElementHooker } from "../hs-core/hs-elementhooker";
import { HSLogger } from "../hs-core/hs-logger";
import { HSModule } from "../hs-core/hs-module";
import { HSUtils } from "../hs-utils/hs-utils";

/*
    Class: HSTalismans
    IsExplicitHSModule: Yes
    Description: 
        Hypersynergism module which makes the "Buy All"-button in the talisman interface behave better
    Author: Swiffy
*/
export class HSTalismans extends HSModule {
    #talismanBuyButtons : HTMLButtonElement[] = []; 
    #buyAllButton? : Element;

    #currentButtonIndex = ETalismanFragmentIndex.BLUE;

    #indexResetTimeout: number | null = null;
    #indexResetTimeoutTime = 3000;

    constructor(moduleName: string, context: string, moduleColor?: string) {
        super(moduleName, context, moduleColor);
    }

    async init(): Promise<void> {
        const self = this;

        HSLogger.log("Initialising HSTalismans module", this.context);
        
        this.#buyAllButton = await HSElementHooker.HookElement('#buyTalismanAll') as HTMLButtonElement;
        this.#talismanBuyButtons = await HSElementHooker.HookElements('.fragmentBtn') as HTMLButtonElement[];

        // Clone and replace to remove all existing event listeners
        const buyAllClone = this.#buyAllButton.cloneNode(true);
        this.#buyAllButton.replaceWith(buyAllClone);

        // Probably need to find it again?
        this.#buyAllButton = await HSElementHooker.HookElement('#buyTalismanAll') as HTMLButtonElement;

        this.#buyAllButton.addEventListener('click', (e) => {
            if(self.#indexResetTimeout)
                clearTimeout(self.#indexResetTimeout);

            if(self.#talismanBuyButtons.length === 0) return;
            
            self.#talismanBuyButtons[self.#currentButtonIndex].click();
            self.#currentButtonIndex++;

            if(self.#currentButtonIndex > self.#talismanBuyButtons.length - 1) {
                self.#currentButtonIndex = 0;
            }

            self.#indexResetTimeout = setTimeout(() => {
                self.#currentButtonIndex = ETalismanFragmentIndex.BLUE;
            }, self.#indexResetTimeoutTime);
        });

        HSLogger.log("Talisman BUY ALL button is now more functional", this.context);
        this.isInitialized = true;
    }
}
