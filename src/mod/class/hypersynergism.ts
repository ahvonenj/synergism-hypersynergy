import { HSLogger } from "./hs-logger";
import { HSPotions } from "./hs-potions";

export class Hypersynergism {

	#HSPotions : HSPotions;

	constructor() {
		this.#HSPotions = new HSPotions();
	}

	init() {
		HSLogger.log("Initialising Hypersynergism modules");
		this.#HSPotions.init();
	}
}