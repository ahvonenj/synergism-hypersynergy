import { Hypersynergism } from "./class/hypersynergism";

/*
	WHEN ADDING NEW MODULES / CLASSES:

	- Add (explicit) import in hs-module-manager.ts
	- Add a class mapping to #moduleClasses in hs-module-manager.ts
*/
const enabledModules = [
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