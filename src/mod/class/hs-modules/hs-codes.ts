import { HSLogger } from "../hs-core/hs-logger";
import { HSModule } from "../hs-core/hs-module";

/*
    Class: HSCodes
    IsExplicitHSModule: Yes
    Description: 
        Hypersynergism module aimed to make reusable code input more convenient.
    Author: Swiffy
*/
export class HSCodes extends HSModule {
    #codeBoxLabel : HTMLElement | null;
    #config : MutationObserverInit;
    #codeBoxLabelObserver? : MutationObserver;
    #codeSpanStyle = 'white-space: nowrap; user-select: all; -webkit-user-select: all; -moz-user-select: all; -ms-user-select: all;';

    constructor(moduleName: string, context: string) {
        super(moduleName, context);
        this.#codeBoxLabel = document.querySelector('label[for="prompt_text"]');
        this.#config = { attributes: false, childList: true, subtree: true };

        if(this.#codeBoxLabel) {
            this.#codeBoxLabelObserver = new MutationObserver((mutations, observer) => {
                this.#codeBoxLabelTrigger(mutations, observer);
            });
        }
    }

    async init(): Promise<void> {
        HSLogger.log("Initialising HSCodes module", this.context);
        this.observe();
        this.isInitialized = true;
    }

    observe() {
        this.#codeBoxLabelObserver?.observe(this.#codeBoxLabel as Node, this.#config);
    }

    #codeBoxLabelTrigger(mutations: MutationRecord[], observer: MutationObserver) {
        const self = this;

        if(this.#codeBoxLabel && this.#codeBoxLabel.innerText.includes("synergism2021")) {
            try {
                this.#codeBoxLabelObserver?.disconnect();
                const originalText = this.#codeBoxLabel.innerText;
                this.#codeBoxLabel.innerHTML = `<div id="hs-hijack-codes-wrapper">
                    [HSCodes] Hypersynergism has hijacked this modal to offer you all the reusable codes conveniently:</br>
                    <span style="${this.#codeSpanStyle}" data-code="synergism2021">synergism2021</span></br>
                    <span style="${this.#codeSpanStyle}" data-code="Khafra">Khafra</span></br>
                    <span style="${this.#codeSpanStyle}" data-code=":unsmith:">:unsmith:</span></br>
                    <span style="${this.#codeSpanStyle}" data-code=":antismith:">:antismith:</span>
                </div>`;

                document.delegateEventListener('click', '#hs-hijack-codes-wrapper > span', function(e) {
                    const code = this.dataset.code;
                    HSLogger.log(`Code: ${code}`, self.context);
                });

                HSLogger.log("Hijacked code redeem panel", this.context);
            } finally {
                if(this.#codeBoxLabel)
                    this.#codeBoxLabelObserver?.observe(this.#codeBoxLabel as Node, this.#config);
            }
        }
    }
}
