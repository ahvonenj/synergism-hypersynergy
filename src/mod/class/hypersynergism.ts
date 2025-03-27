import { HSModuleDefinition } from "../types/hs-types";
import { HSLogger } from "./hs-core/hs-logger";
import { HSModuleManager } from "./hs-core/hs-module-manager";
import { HSUI } from "./hs-core/hs-ui";
import { HSUIC } from "./hs-core/hs-ui-components";
import corruption_ref_b64 from "inline:../resource/txt/corruption_ref.txt";
import { HSInputType } from "../types/hs-ui-types";
import { HSSettings } from "./hs-core/hs-settings";

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
        await this.#moduleManager.initModules();

        HSLogger.log("Building UI Panel", this.#context);
        this.#buildUIPanelContents();

        // Do this after UI Panel stuff is ready, because
        // syncing basically means syncing the UI with the settings
        await HSSettings.syncSettings();
    }

    #buildUIPanelContents() {
        const hsui = this.#moduleManager.getModule<HSUI>('HSUI');

        if(hsui) {
            // Update panel title with current version
            hsui.updateTitle(`Hypersynergism v${HSSettings.CURRENT_VERSION}`);

            // BUILD TAB 2
            // Add corruption reference modal button
            hsui.replaceTabContents(2, 
                HSUIC.Grid({ 
                    html: [
                        HSUIC.Button({ id: 'hs-panel-cor-ref-btn', text: 'Corruption Ref.' }),
                        HSUIC.Button({ id: 'hs-panel-dump-settings-btn', text: 'Dump Settings' }),
                    ],
                    colTemplate: 'repeat(2, 1fr)',
                    rowTemplate: '1fr',
                    colGap: '5px',
                    rowGap: '5px'
                })
            );

            document.querySelector('#hs-panel-cor-ref-btn')?.addEventListener('click', () => {
                hsui.Modal({ htmlContent: `<img class="hs-modal-img" src="${corruption_ref_b64}" />`, needsToLoad: true })
            });

            document.querySelector('#hs-panel-dump-settings-btn')?.addEventListener('click', () => {
                HSSettings.dumpToConsole();
            });

            // BUILD TAB 3
            const settingsTabContents = HSSettings.autoBuildSettingsUI();

            if(settingsTabContents.didBuild) {
                hsui.replaceTabContents(3, settingsTabContents.htmlString);
            }

            // Rename tabs
            hsui.renameTab(2, 'Tools');
            hsui.renameTab(3, 'Settings');
        }
    }
}
