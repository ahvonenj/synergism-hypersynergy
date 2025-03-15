import { HSLogger } from "../hs-core/hs-logger";
import { HSModule } from "../hs-core/hs-module";

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

	init() {
		HSLogger.log("Initialising HSCodes module", this.context);
		this.observe();
	}

	observe() {
		this.#codeBoxLabelObserver?.observe(this.#codeBoxLabel as Node, this.#config);
	}

	#codeBoxLabelTrigger(mutations: MutationRecord[], observer: MutationObserver) {
		if(this.#codeBoxLabel && this.#codeBoxLabel.innerText.includes("synergism2021")) {
			try {
				this.#codeBoxLabelObserver?.disconnect();
				const originalText = this.#codeBoxLabel.innerText;
				this.#codeBoxLabel.innerHTML = `${originalText} [HSCodes] treats you with additional codes for convenience <span style="${this.#codeSpanStyle}">:unsmith:</span> and <span style="${this.#codeSpanStyle}">:antismith:</span>`;

				HSLogger.log("Added :antismith: and :unsmith: to code redeem panel", this.context);
			} finally {
				if(this.#codeBoxLabel)
					this.#codeBoxLabelObserver?.observe(this.#codeBoxLabel as Node, this.#config);
			}
		}
	}
}