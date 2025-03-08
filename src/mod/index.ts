import { Hypersynergism } from "./class/hypersynergism";

const hypersynergism = new Hypersynergism();

declare global {
	interface Window {
		hypersynergism: Hypersynergism;
	}
}

window.hypersynergism = hypersynergism;