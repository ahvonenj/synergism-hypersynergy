import { HSModuleDefinition } from "../types/hs-types";
import { HSLogger } from "./hs-core/hs-logger";
import { HSModuleManager } from "./hs-core/hs-module-manager";
import { HSUI } from "./hs-core/hs-ui";
import { HSUIC } from "./hs-core/hs-ui-components";
import corruption_ref_b64 from "inline:../resource/txt/corruption_ref.txt";
import { HSInputType } from "../types/hs-ui-types";

export class Hypersynergism {
    // Class context, mainly for HSLogger
    #context = 'HSMain';

    // HSModuleManager instance
    #moduleManager : HSModuleManager;

    constructor(modulesToEnable : HSModuleDefinition[]) {
        // Instantiate the module manager
        this.#moduleManager = new HSModuleManager('HSModuleManager', modulesToEnable);  
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
            // BUILD TAB 2

            // Add corruption reference modal button
            hsui.replaceTabContents(2, HSUIC.Button({ id: 'hs-panel-cor-ref-btn', text: 'Corruption Ref.' }));

            document.querySelector('#hs-panel-cor-ref-btn')?.addEventListener('click', () => {
                hsui.Modal({ htmlContent: `<img class="hs-modal-img" src="${corruption_ref_b64}" />`, needsToLoad: true })
            });

            // BUILD TAB 3
            hsui.replaceTabContents(3, 
                HSUIC.Div({ 
                    class: 'hs-panel-setting-block', 
                    html: [
                        HSUIC.Div({ class: 'hs-panel-setting-block-text', html: 'Expand cost protection' }),
                        HSUIC.Input({ class: 'hs-panel-setting-block-num-input', id: 'hs-setting-expand-cost-protection-value', type: HSInputType.NUMBER }),
                        HSUIC.Button({ class: 'hs-panel-setting-block-btn', id: 'hs-setting-expand-cost-protection-btn' }),
                    ]
                })
            );


            // Rename tabs
            hsui.renameTab(2, 'Tools');
            hsui.renameTab(3, 'Settings');
        }
    }
}
