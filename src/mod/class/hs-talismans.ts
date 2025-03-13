import { HSElementHooker } from "./hs-elementhooker";
import { HSLogger } from "./hs-logger";
import { HSModule } from "./hs-module";
import { HSUtils } from "./hs-utils";

export class HSTalismans extends HSModule {
	#talismanBuyButtons : HTMLButtonElement[] = []; 
	#buyAllButton? : Element;

	#currentButtonIndex = 0;

	constructor(moduleName: string, context: string) {
		super(moduleName, context);
	}

	async init() {
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
			if(self.#talismanBuyButtons.length === 0) return;
			
			self.#talismanBuyButtons[self.#currentButtonIndex].click();
			self.#currentButtonIndex++;

			if(self.#currentButtonIndex > self.#talismanBuyButtons.length - 1) {
				self.#currentButtonIndex = 0;
			}
		})

		HSLogger.log("Talisman BUY ALL button is now more functional", this.context);
	}
}