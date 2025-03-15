import { HSElementHooker } from "../hs-core/hs-elementhooker";
import { HSLogger } from "../hs-core/hs-logger";
import { HSModule } from "../hs-core/hs-module";
import { HSUtils } from "../hs-utils/hs-utils";

export class HSHepteracts extends HSModule {
	#heptGrid? : Element;
	#config : MutationObserverInit;
	#injected = false;

	#hepteracts = [
		'chronosHepteract',
		'hyperrealismHepteract',
		'quarkHepteract',
		'challengeHepteract',
		'abyssHepteract',
		'acceleratorHepteract',
		'acceleratorBoostHepteract',
		'multiplierHepteract'
	]

	constructor(moduleName: string, context: string) {
		super(moduleName, context);
		this.#config = { attributes: false, childList: true, subtree: true };
	}

	async init() {
		HSLogger.log("Initialising HSHepteracts module", this.context);

		const self = this;
		this.#heptGrid = await HSElementHooker.HookElement('#heptGrid');

		this.#heptGrid.childNodes.forEach(node => {
			if(node.nodeType === 1) {
				const htmlNode = node as HTMLElement;
				const id = htmlNode.id

				if(self.#hepteracts.includes(id)) {
					const craftMaxBtn = document.querySelector(`#${id}CraftMax`) as HTMLElement;
					const capBtn = document.querySelector(`#${id}Cap`) as HTMLElement;
					const heptImg = document.querySelector(`#${id}Image`) as HTMLElement;
					
					if(craftMaxBtn && capBtn && heptImg) {
						heptImg.addEventListener('click', async () => {
							capBtn.click();
							await HSUtils.wait(15);
							document.getElementById("ok_confirm")?.click();
							await HSUtils.wait(15);
							document.getElementById("ok_alert")?.click();
							await HSUtils.wait(15);
							craftMaxBtn.click();
							await HSUtils.wait(15);
							document.getElementById("ok_confirm")?.click();
							await HSUtils.wait(15);
							document.getElementById("ok_alert")?.click();
						});
					}
				}
			}
		});

		HSLogger.log("Hepteract images now serve as 'quick expand and max' buttons", this.context);
	}
}