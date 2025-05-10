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
import { HSStorage } from "./hs-core/hs-storage";
import overrideCSS from "inline:../resource/css/hs-overrides.css";
import { HSGameData } from "./hs-core/hs-gamedata";

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

        HSLogger.log("Injecting style overrides", this.#context);
        this.#injectStyleOverrides();

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
                        HSUIC.Div({ 
                            html: 'References',
                            styles: {
                                borderBottom: '1px solid limegreen',
                                gridColumn: 'span 2'
                            }
                        }),
                        HSUIC.Button({ id: 'hs-panel-cor-ref-btn', text: 'Corruption Ref.' }),
                        HSUIC.Button({ id: 'hs-panel-cor-ref-btn-2', text: 'Crpt. Onemind' }),
                        HSUIC.Div({ 
                            html: 'Mod links',
                            styles: {
                                borderBottom: '1px solid limegreen',
                                gridColumn: 'span 2'
                            }
                        }),
                        HSUIC.Button({ id: 'hs-panel-mod-github-btn', text: 'Mod Github' }),
                        HSUIC.Button({ id: 'hs-panel-mod-wiki-btn', text: 'Mod Wiki' }),
                        HSUIC.Button({ id: 'hs-panel-mod-wiki_features-btn', text: 'Mod Features' }),
                        HSUIC.Button({ id: 'hs-panel-mod-website-btn', text: 'Mod Website' }),
                        HSUIC.Div({ 
                            html: 'Other tools',
                            styles: {
                                borderBottom: '1px solid limegreen',
                                gridColumn: 'span 2'
                            }
                        }),
                        HSUIC.Button({ id: 'hs-panel-dump-settings-btn', text: 'Dump Settings' }),
                        HSUIC.Button({ id: 'hs-panel-clear-settings-btn', text: 'CLEAR SETTINGS', styles: { borderColor: 'red' } }),
                        HSUIC.Div({ 
                            html: 'Testing tools',
                            styles: {
                                borderBottom: '1px solid limegreen',
                                gridColumn: 'span 2'
                            }
                        }),
                        HSUIC.Button({ id: 'hs-panel-test-get-save-data-btn', text: 'SData test' }),
                        HSUIC.Button({ id: 'hs-panel-test-get-save-data-jit-btn', text: 'SData test (JIT)' }),
                        HSUIC.Button({ id: 'hs-panel-test-sniff-error-btn', text: 'Sniff err test' }),
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

            document.querySelector('#hs-panel-mod-github-btn')?.addEventListener('click', () => {
                window.open(HSGlobal.General.modGithubUrl, '_blank')
            });

            document.querySelector('#hs-panel-mod-wiki-btn')?.addEventListener('click', () => {
                window.open(HSGlobal.General.modWikiUrl, '_blank')
            });

            document.querySelector('#hs-panel-mod-wiki_features-btn')?.addEventListener('click', () => {
                window.open(HSGlobal.General.modWikiFeaturesUrl, '_blank')
            });

            document.querySelector('#hs-panel-mod-website-btn')?.addEventListener('click', () => {
                window.open(HSGlobal.General.modWebsiteUrl, '_blank')
            });

            document.querySelector('#hs-panel-dump-settings-btn')?.addEventListener('click', () => {
                HSSettings.dumpToConsole();
            });

            document.querySelector('#hs-panel-clear-settings-btn')?.addEventListener('click', () => {
                const storageMod = HSModuleManager.getModule<HSStorage>('HSStorage');
                
                if(storageMod) {
                    storageMod.clearData(HSGlobal.HSSettings.storageKey);
                    HSLogger.info('Stored settings cleared', this.#context);
                }
            });

            document.querySelector('#hs-panel-test-get-save-data-btn')?.addEventListener('click', async () => {
                const gameDataMod = HSModuleManager.getModule<HSGameData>('HSGameData');
                
                if(gameDataMod) {
                    const saveData = await gameDataMod.getSaveData();
                    HSLogger.info('Performed save data test, results in dev console (if any)', this.#context);
                    console.log(saveData);
                }
            });

            document.querySelector('#hs-panel-test-get-save-data-jit-btn')?.addEventListener('click', async () => {
                const gameDataMod = HSModuleManager.getModule<HSGameData>('HSGameData');
                
                if(gameDataMod) {
                    const saveData = await gameDataMod.getSaveData(true);
                    HSLogger.info('Performed save data test (JIT), results in dev console (if any)', this.#context);
                    console.log(saveData);
                }
            });

            document.querySelector('#hs-panel-test-sniff-error-btn')?.addEventListener('click', async () => {
                const gameDataMod = HSModuleManager.getModule<HSGameData>('HSGameData');
                
                if(gameDataMod) {
                    await gameDataMod.getSaveData(true, 'Synergysave_WONTEXIST');
                    HSLogger.info('Performed save data sniff error test. Game data sniffing should get auto disabled.', this.#context);
                }
            });

            // BUILD SETTINGS TAB
            const settingsTabContents = HSSettings.autoBuildSettingsUI();

            if(settingsTabContents.didBuild) {
                hsui.replaceTabContents(3, 
                    HSUIC.Grid({ 
                        id: 'hs-panel-settings-grid',
                        html: settingsTabContents.htmlString
                    })
                );

                document.delegateEventListener('click', '.hs-panel-setting-block-gamedata-icon', (e) => {
                    const gameDataSettingBlock = document.querySelector('#hs-setting-block-gamedata') as HTMLDivElement;
                    gameDataSettingBlock.scrollIntoView({
                        block: 'start',
                        behavior: 'smooth',
                    })
                });
            }

            // BUILD DEBUG TAB
            hsui.replaceTabContents(4, 
                HSUIC.Grid({ 
                    html: [
                        HSUIC.Div({ 
                            html: 'Mouse',
                            styles: {
                                borderBottom: '1px solid limegreen',
                                gridColumn: 'span 2'
                            }
                        }),
                        HSUIC.Div({ id: 'hs-panel-debug-mousepos' }),
                        HSUIC.Div({ 
                            html: 'Game Data',
                            styles: {
                                borderBottom: '1px solid limegreen',
                                gridColumn: 'span 2'
                            }
                        }),
                        HSUIC.Div({ id: 'hs-panel-debug-gamedata-currentambrosia', styles: { gridColumn: 'span 2' } }),
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

    #injectStyleOverrides() {
        HSUI.injectStyle(overrideCSS, 'hs-override-css');
    }
}
