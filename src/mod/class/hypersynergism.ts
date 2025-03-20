import { HSModuleDefinition } from "../types/hs-types";
import { HSLogger } from "./hs-core/hs-logger";
import { HSModuleManager } from "./hs-core/hs-module-manager";
import { HSUI } from "./hs-core/hs-ui";
import { HSUIC } from "./hs-core/hs-ui-components";
import corruption_ref_b64 from "../resource/corruption_ref.txt";

export class Hypersynergism {
	// Class context, mainly for HSLogger
	#context = 'HSMain';

	// Enabled modules
	#enabledModuleList : HSModuleDefinition[];

	// HSModuleManager instance
	#moduleManager : HSModuleManager;

	constructor(enabledModules : HSModuleDefinition[]) {
		// Add the to-be-enabled modules to the enableModules list
		this.#enabledModuleList = enabledModules;

		// Instantiate the module manager
		this.#moduleManager = new HSModuleManager('HSModuleManager');

		HSLogger.log("Enabling Hypersynergism modules", this.#context);

		// Add / give the modules to the module manager
		this.#enabledModuleList.forEach(def => {
			this.#moduleManager.addModule(def.className, def.context || def.className, def.moduleName || def.className);
		});
	}

	async init() {
		HSLogger.log("Initialising Hypersynergism modules", this.#context);

		// Go through the modules added to module manager and initialize all of them
		this.#moduleManager.getModules().forEach(async (mod) => {
			// Call each mod's init method
			await mod.init();

			// We want / try to init HSUI module as early as possible so that we can integrate HSLogger to it
			// This is so that HSLogger starts to write log inside the Log tab in the mod's panel instead of just the devtools console
			if(mod.getName() === "HSUI") {
				const hsui = this.#moduleManager.getModule<HSUI>('HSUI');

				if(hsui) {
					HSLogger.integrateToUI(hsui);
				}
			}
		});

		this.#buildUIPanelContents();
	}

	#buildUIPanelContents() {
		const hsui = this.#moduleManager.getModule<HSUI>('HSUI');

		if(hsui) {
			hsui.replaceTabContents(2, HSUIC.Button({ id: 'hs-panel-cor-ref-btn', text: 'Corruption Ref.' }));

			document.querySelector('#hs-panel-cor-ref-btn')?.addEventListener('click', () => {
				hsui.Modal({ htmlContent: `<img class="hs-modal-img" src="${corruption_ref_b64}" />`, needsToLoad: true })
			});

			hsui.renameTab(2, 'Tools');
		}
	}
}