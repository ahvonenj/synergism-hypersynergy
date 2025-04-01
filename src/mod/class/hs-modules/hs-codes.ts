import { HSElementHooker } from "../hs-core/hs-elementhooker";
import { HSLogger } from "../hs-core/hs-logger";
import { HSModule } from "../hs-core/hs-module";
import { HSUtils } from "../hs-utils/hs-utils";

/*
    Class: HSCodes
    IsExplicitHSModule: Yes
    Description: 
        Hypersynergism module aimed to make reusable code input more convenient.
    Author: Swiffy
*/
export class HSCodes extends HSModule {
    #codeBoxLabel?: HTMLLabelElement;
    #codeBoxOpenButton?: HTMLButtonElement;
    #config : MutationObserverInit;
    #codeBoxLabelObserver? : MutationObserver;
    #codeSpanStyle = 'white-space: nowrap; user-select: all; -webkit-user-select: all; -moz-user-select: all; -ms-user-select: all;';

    constructor(moduleName: string, context: string) {
        super(moduleName, context);

        this.#config = { attributes: false, childList: true, subtree: true };

        this.#codeBoxLabelObserver = new MutationObserver((mutations, observer) => {
            this.#codeBoxLabelTrigger(mutations, observer);
        });
    }

    async init(): Promise<void> {
        HSLogger.log("Initialising HSCodes module", this.context);

        const self = this;

        this.#codeBoxOpenButton = await HSElementHooker.HookElement('#promocodes') as HTMLButtonElement;

        this.#codeBoxOpenButton.addEventListener('click', function(ev) {
            self.#codeBoxLabel = document.querySelector('#promptWrapper > #prompt > label') as HTMLLabelElement;

            if(self.#codeBoxLabel) {
                self.#disconnect();
                self.#codeBoxLabel.innerHTML = '';
                self.#observe();
            }
        }, { capture: true });

        this.#codeBoxLabel = await HSElementHooker.HookElement('#promptWrapper > #prompt > label') as HTMLLabelElement;

        this.#observe();
        this.isInitialized = true;
    }

    #observe() {
        this.#codeBoxLabelObserver?.disconnect();
        this.#codeBoxLabelObserver?.observe(this.#codeBoxLabel as HTMLLabelElement, this.#config);
    }

    #disconnect() {
        this.#codeBoxLabelObserver?.disconnect();
    }

    #codeBoxLabelTrigger(mutations: MutationRecord[], observer: MutationObserver) {
        const self = this;

        try {
            // Need to disconnect or our changes will put this observer into a loop
            this.#disconnect();

            if(this.#codeBoxLabel && this.#codeBoxLabel.innerText.includes("synergism2021")) {
                const originalText = this.#codeBoxLabel.innerText;
                this.#codeBoxLabel.innerHTML = `<div id="hs-hijack-codes-wrapper">
                    [HSCodes] Hypersynergism has hijacked this modal to offer you all the reusable codes conveniently (click code to auto input it):</br>
                    <span style="${this.#codeSpanStyle}" data-code="synergism2021">synergism2021</span>
                    <span style="${this.#codeSpanStyle}" data-code="Khafra">Khafra</span>
                    <span style="${this.#codeSpanStyle}" data-code=":unsmith:">:unsmith:</span>
                    <span style="${this.#codeSpanStyle}" data-code=":antismith:">:antismith:</span>
                </div>`;

                document.delegateEventListener('click', '#hs-hijack-codes-wrapper > span', function(e) {
                    const code = this.dataset.code;
                    const textInput = document.querySelector('#prompt_text') as HTMLInputElement;

                    if(code && textInput) {
                        textInput.value = code;
                    } else {
                        HSLogger.warn(`Could not inject code to code input`, self.context);
                    }
                }, true);

                //HSLogger.log("Hijacked code redeem panel", this.context);
            }
        } finally {
            // Need to remember to connect the observer again
            this.#observe();
        }
    }
}
