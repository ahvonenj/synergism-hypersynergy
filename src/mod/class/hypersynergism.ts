import { HSModuleDefinition } from "../types/hs-types";
import { HSLogger } from "./hs-core/hs-logger";
import { HSModuleManager } from "./hs-core/hs-module-manager";
import { HSUI } from "./hs-core/hs-ui";
import { HSUIC } from "./hs-core/hs-ui-components";
import corruption_ref_b64 from "inline:../resource/txt/corruption_ref.txt";
import corruption_ref_b64_2 from "inline:../resource/txt/corruption_ref_onemind.txt";
import { HSSettings } from "./hs-core/hs-settings";
import { HSGlobal } from "./hs-core/hs-global";
import { HSShadowDOM } from "./hs-core/hs-shadowdom";

/*
    Class: Hypersynergism
    Description: 
        Hypersynergism main class.
        Instantiates the module manager and handles calls to building the mod's panel and working with mod's settings
    Author: Swiffy
*/
export class Hypersynergism {
    // Class context, mainly for HSLogger
    #context = 'HSMain';

    // HSModuleManager instance
    #moduleManager : HSModuleManager;

    constructor(modulesToEnable : HSModuleDefinition[]) {
        // Instantiate the module manager
        this.#moduleManager = new HSModuleManager('HSModuleManager', modulesToEnable);
    }

    async preprocessModules() {
        await this.#moduleManager.preprocessModules();
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
        const hsui = HSModuleManager.getModule<HSUI>('HSUI');

        if(hsui) {
            // Update panel title with current version
            hsui.updateTitle(`Hypersynergism v${HSGlobal.General.currentModVersion}`);

            // BUILD TOOLS TAB
            // Add corruption reference modal button
            hsui.replaceTabContents(2, 
                HSUIC.Grid({ 
                    html: [
                        HSUIC.Button({ id: 'hs-panel-cor-ref-btn', text: 'Corruption Ref.' }),
                        HSUIC.Button({ id: 'hs-panel-cor-ref-btn-2', text: 'Crpt. Onemind' }),
                        HSUIC.Button({ id: 'hs-panel-dump-settings-btn', text: 'Dump Settings' }),
                        HSUIC.Button({ id: 'hs-panel-mod-docs-btn', text: 'Mod docs' }),
                    ],
                    styles: {
                        gridTemplateColumns: 'repeat(2, 1fr)',
                        gridTemplateRows: '1fr',
                        columnGap: '5px',
                        rowGap: '10px',
                        padding: '5px'
                    }
                })
            );

            // Bind corruption reference button to open a modal
            document.querySelector('#hs-panel-cor-ref-btn')?.addEventListener('click', () => {
                hsui.Modal({ htmlContent: `<img class="hs-modal-img" src="${corruption_ref_b64}" />`, needsToLoad: true })
            });

            // Bind corruption reference button to open a modal
            document.querySelector('#hs-panel-cor-ref-btn-2')?.addEventListener('click', () => {
                hsui.Modal({ htmlContent: `<img class="hs-modal-img" src="${corruption_ref_b64_2}" />`, needsToLoad: true })
            });

            // Bind dump button to dump settings
            document.querySelector('#hs-panel-dump-settings-btn')?.addEventListener('click', () => {
                HSSettings.dumpToConsole();
            });

            document.querySelector('#hs-panel-mod-docs-btn')?.addEventListener('click', () => {
                window.open(HSGlobal.General.modFeaturesGithubUrl, '_blank')
            });

            // BUILD SETTINGS TAB
            const settingsTabContents = HSSettings.autoBuildSettingsUI();

            if(settingsTabContents.didBuild) {
                hsui.replaceTabContents(3, settingsTabContents.htmlString);
            }

            // BUILD DEBUG TAB
            hsui.replaceTabContents(4, 
                HSUIC.Grid({ 
                    html: [
                        HSUIC.Div({ id: 'hs-panel-debug-mousepos' }),
                    ],
                    styles: {
                        gridTemplateColumns: 'repeat(2, 1fr)',
                        gridTemplateRows: '1fr',
                        columnGap: '5px',
                        rowGap: '5px'
                    }
                })
            );

            // Rename tabs
            hsui.renameTab(2, 'Tools');
            hsui.renameTab(3, 'Settings');
            hsui.renameTab(4, 'Debug');
        }
    }
}
