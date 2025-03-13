import { Hypersynergism } from "./class/hypersynergism";

const enabledModules = [
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