import { Hypersynergism } from "./class/hypersynergism";
import { HSModuleDefinition } from "./types/hs-types";

/*
	WHEN ADDING NEW MODULES / CLASSES:

	- Add (explicit) import in hs-module-manager.ts
	- Add a class mapping to #moduleClasses in hs-module-manager.ts
*/
const enabledModules: HSModuleDefinition[] = [
	{
		className: 'HSUI',
		context: 'HSUI'
	},
	{
		className: 'HSPotions',
		context: 'HSPotions'
	},
	{
		className: 'HSCodes',
		context: 'HSCodes'
	},
	{
		className: 'HSHepteracts',
		context: 'HSHepteracts'
	},
	{
		className: 'HSTalismans',
		context: 'HSTalismans'
	}
]

const hypersynergism = new Hypersynergism(enabledModules);

declare global {
	interface Window {
		hypersynergism: Hypersynergism;
	}
}

window.hypersynergism = hypersynergism;