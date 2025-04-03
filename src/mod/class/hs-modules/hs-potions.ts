import { HSLogger } from "../hs-core/hs-logger";
import { HSModule } from "../hs-core/hs-module";

/*
    Class: HSPotions
    IsExplicitHSModule: Yes
    Description: 
        Hypersynergism module which adds "Buy 10x" and "Consume 10x" buttons to potions interface.
    Author: Swiffy
*/
export class HSPotions extends HSModule {
    #offeringPotion : HTMLElement | null;
    #obtainiumPotion : HTMLElement | null;

    #config : MutationObserverInit;

    #offeringPotionObserver : MutationObserver;
    #obtainiumPotionObserver : MutationObserver;

    constructor(moduleName: string, context: string, moduleColor?: string) {
        super(moduleName, context, moduleColor);

        this.#offeringPotion = document.getElementById("offeringPotionHide");
        this.#obtainiumPotion = document.getElementById("obtainiumPotionHide");
        this.#config = { attributes: false, childList: true, subtree: true };

        this.#offeringPotionObserver = new MutationObserver((mutations, observer) => {
            this.#offeringMutationTrigger(mutations, observer);
        });

        this.#obtainiumPotionObserver = new MutationObserver((mutations, observer) => {
            this.#obtainiumMutationTrigger(mutations, observer);
        });
    }

    async init(): Promise<void> {
        HSLogger.log("Initialising HSPotions module", this.context);
        this.observe();
        this.isInitialized = true;
    }

    observe() {
        this.#offeringPotionObserver.observe(this.#offeringPotion as Node, this.#config);
        this.#obtainiumPotionObserver.observe(this.#obtainiumPotion as Node, this.#config);
    }

    #offeringMutationTrigger(mutations: MutationRecord[], observer: MutationObserver) {
        const moddedButton = document.getElementById("offeringPotionMultiUseButton");
    
        if(moddedButton === null) {
            const useOfferingPotionButton = document.getElementById("useofferingpotion");
            const buyOfferingPotionButton = document.getElementById("buyofferingpotion");

            if(!useOfferingPotionButton || !buyOfferingPotionButton) {
                HSLogger.warn("Could not find native buttons for use/buy offering potions", this.context);
                return;
            }
    
            if(useOfferingPotionButton) {
                let clone = useOfferingPotionButton.cloneNode(true) as HTMLElement;
    
                clone.id = "offeringPotionMultiUseButton";
                clone.textContent = "CONSUME 10x";
    
                clone.addEventListener('click', () => {
                    for(let i = 0; i < 10; i++) {
                        useOfferingPotionButton.click();
                    }
                })
    
                useOfferingPotionButton.parentNode?.insertBefore(clone, useOfferingPotionButton.nextSibling);
            }
    
            if(buyOfferingPotionButton) {
                let clone2 = buyOfferingPotionButton.cloneNode(true) as HTMLElement;
    
                clone2.id = "offeringPotionMultiBuyButton";
                clone2.textContent = "BUY 10x";
    
                clone2.addEventListener('click', () => {
                    for(let i = 0; i < 10; i++) {
                        buyOfferingPotionButton.click();
                        setTimeout(() => { document.getElementById("ok_confirm")?.click(); }, 1);
                    }
                })
    
                buyOfferingPotionButton.parentNode?.insertBefore(clone2, buyOfferingPotionButton.nextSibling);
            }

            this.#offeringPotionObserver.disconnect();
            HSLogger.log("Offering potion multi buy / consume buttons injected", this.context);
        }
    };

    #obtainiumMutationTrigger(mutations: MutationRecord[], observer: MutationObserver) {
        const moddedButton = document.getElementById("obtainiumPotionMultiUseButton");
    
        if(moddedButton === null) {
            const useObtainiumPotionButton = document.getElementById("useobtainiumpotion");
            const buyObtainiumPotionButton = document.getElementById("buyobtainiumpotion");

            if(!useObtainiumPotionButton || !buyObtainiumPotionButton) {
                HSLogger.warn("Could not find native buttons for use/buy obtainium potions", this.context);
                return;
            }
    
            if(useObtainiumPotionButton) {
                let clone = useObtainiumPotionButton.cloneNode(true) as HTMLElement;
    
                clone.id = "obtainiumPotionMultiUseButton";
                clone.textContent = "CONSUME 10x";
    
                clone.addEventListener('click', () => {
                    for(let i = 0; i < 10; i++) {
                        useObtainiumPotionButton.click();
                    }
                })
    
                useObtainiumPotionButton.parentNode?.insertBefore(clone, useObtainiumPotionButton.nextSibling);
            }
    
            if(buyObtainiumPotionButton) {
                let clone2 = buyObtainiumPotionButton.cloneNode(true) as HTMLElement;
    
                clone2.id = "obtainiumPotionMultiBuyButton";
                clone2.textContent = "BUY 10x";
    
                clone2.addEventListener('click', () => {
                    for(let i = 0; i < 10; i++) {
                        buyObtainiumPotionButton.click();
                        setTimeout(() => { document.getElementById("ok_confirm")?.click(); }, 1);
                    }
                })
    
                buyObtainiumPotionButton.parentNode?.insertBefore(clone2, buyObtainiumPotionButton.nextSibling);
            }

            this.#obtainiumPotionObserver.disconnect();
            HSLogger.log("Obtainium potion multi buy / consume buttons injected", this.context);
        }
    };
}
