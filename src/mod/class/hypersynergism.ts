import { HSModuleDefinition } from "../types/hs-types";
import { HSLogger } from "./hs-core/hs-logger";
import { HSModuleManager } from "./hs-core/module/hs-module-manager";
import { HSUI } from "./hs-core/hs-ui";
import { HSUIC } from "./hs-core/hs-ui-components";
import corruption_ref_b64 from "inline:../resource/txt/corruption_ref.txt";
import corruption_ref_b64_2 from "inline:../resource/txt/corruption_ref_onemind.txt";
import { HSSettings } from "./hs-core/settings/hs-settings";
import { HSGlobal } from "./hs-core/hs-global";
import { HSStorage } from "./hs-core/hs-storage";
import overrideCSS from "inline:../resource/css/hs-overrides.css";
import { HSNotifyPosition, HSNotifyType } from "../types/module-types/hs-ui-types";
import { HSGameDataAPI } from "./hs-core/gds/hs-gamedata-api";
import { HSWebSocket } from "./hs-core/hs-websocket";
import { GameEventResponse, GameEventType } from "../types/data-types/hs-event-data";

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

    // Called from loader
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

        await HSUI.Notify(`Hypersynergism v${HSGlobal.General.currentModVersion} loaded`, {
            position: 'top',
            notificationType: "success"
        });
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
                        HSUIC.Button({ id: 'hs-panel-dump-gamedata-btn', text: 'Dump Game vars' }),
                        HSUIC.Button({ id: 'hs-panel-clear-settings-btn', text: 'CLEAR SETTINGS', styles: { borderColor: 'red' } }),
                        HSUIC.Div({ 
                            html: 'Testing tools',
                            styles: {
                                borderBottom: '1px solid limegreen',
                                gridColumn: 'span 2'
                            }
                        }),
                        HSUIC.Button({ id: 'hs-panel-test-notify-btn', text: 'Notify test' }),
                        HSUIC.Button({ id: 'hs-panel-test-notify-long-btn', text: 'Notify test 2' }),
                        HSUIC.Button({ id: 'hs-panel-test-register-sock-btn', text: 'Register WS' }),
                        HSUIC.Button({ id: 'hs-panel-test-unregister-sock-btn', text: 'Unregister WS' }),
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

            document.querySelector('#hs-panel-dump-gamedata-btn')?.addEventListener('click', () => {
                const dataModule = HSModuleManager.getModule<HSGameDataAPI>('HSGameDataAPI');

                if(dataModule) {
                    console.log(`----- GAME DATA -----`);
                    console.log(dataModule.getGameData());

                    console.log(`----- PSEUDO DATA -----`);
                    console.log(dataModule.getPseudoData());

                    console.log(`----- CAMPAIGN DATA -----`);
                    console.log(dataModule.getCampaignData());

                    console.log(`----- ME DATA -----`);
                    console.log(dataModule.getMeData());

                    console.log(`----- EVENT DATA -----`);
                    console.log(dataModule.getEventData());
                }
            });

            document.querySelector('#hs-panel-clear-settings-btn')?.addEventListener('click', () => {
                const storageMod = HSModuleManager.getModule<HSStorage>('HSStorage');
                
                if(storageMod) {
                    storageMod.clearData(HSGlobal.HSSettings.storageKey);
                    HSLogger.info('Stored settings cleared', this.#context);
                }
            });

            let positions: HSNotifyPosition[] = ["topLeft", "top", "topRight", "right", "bottomRight", "bottom", "bottomLeft", "left"]
            let colors: HSNotifyType[] = ["default", "warning", "error", "success"];
            let p_idx = -1;
            let c_idx = -1;

            document.querySelector('#hs-panel-test-notify-btn')?.addEventListener('click', async () => {
                p_idx++;
                c_idx++;

                if(p_idx > positions.length - 1)
                    p_idx = 0;

                if(c_idx > colors.length - 1)
                    c_idx = 0;

                await HSUI.Notify('Test notification', {
                    position: positions[p_idx],
                    notificationType: colors[c_idx]
                });
            });

            document.querySelector('#hs-panel-test-notify-long-btn')?.addEventListener('click', async () => {
                p_idx++;
                c_idx++;

                if(p_idx > positions.length - 1)
                    p_idx = 0;

                if(c_idx > colors.length - 1)
                    c_idx = 0;

                await HSUI.Notify('This is a really very extremely long test notification which tests if the notification works with a long notification test notification ',{
                    position: positions[p_idx],
                    notificationType: colors[c_idx]
                })
            });

            document.querySelector('#hs-panel-test-register-sock-btn')?.addEventListener('click', async () => {
                const wsMod = HSModuleManager.getModule<HSWebSocket>('HSWebSocket');

                if(wsMod) {
                    wsMod.registerWebSocket<GameEventResponse>('testSocket', {
                        url: HSGlobal.Common.eventAPIUrl,
                        onMessage: async (msg) => {
                            if(msg?.type === GameEventType.INFO_ALL) {
                                if(msg.active && msg.active.length > 0) {
                                    HSLogger.log(`Caught WS event: ${msg.type} - event count: ${msg.active.length}, active[0]: ${JSON.stringify(msg.active[0])}`, 'WebSocket');
                                }
                            }
                        }
                    })
                }
            });

            document.querySelector('#hs-panel-test-unregister-sock-btn')?.addEventListener('click', async () => {
                const wsMod = HSModuleManager.getModule<HSWebSocket>('HSWebSocket');

                if(wsMod) {
                    wsMod.unregisterWebSocket('testSocket');
                }
            });

            // BUILD SETTINGS TAB
            const settingsTabContents = HSSettings.autoBuildSettingsUI();

            if(settingsTabContents.didBuild) {
                hsui.replaceTabContents(3, 
                    [settingsTabContents.navHTML, settingsTabContents.pagesHTML].join('')
                );

                document.delegateEventListener('click', '.hs-panel-setting-block-gamedata-icon', (e) => {
                    const subtab = document.querySelector(`#hs-panel-settings-subtab-gamedata`) as HTMLDivElement;
                    const color = subtab.dataset.color;
                    const subSettingsContainer = document.querySelector(`#settings-grid-gamedata`) as HTMLDivElement;
                    const allSubSettingContainers = document.querySelectorAll('.hs-panel-settings-grid') as NodeListOf<HTMLDivElement>;
                    const allSubTabs = document.querySelectorAll('.hs-panel-subtab') as NodeListOf<HTMLDivElement>;

                    if(subtab && subSettingsContainer &&allSubSettingContainers && allSubTabs) {
                        allSubSettingContainers.forEach(container => {
                            container.classList.remove('open');
                        });

                        allSubTabs.forEach(subTab => {
                            subTab.style.backgroundColor = '';
                        });

                        subSettingsContainer.classList.add('open');

                        if(color && color.length > 0) {
                            subtab.style.backgroundColor = color;
                        }
                    }

                    const gameDataSettingBlock = document.querySelector('#hs-setting-block-gamedata') as HTMLDivElement;
                    
                    gameDataSettingBlock.scrollIntoView({
                        block: 'start',
                        behavior: 'smooth',
                    })
                });

                document.delegateEventListener('click', '.hs-panel-subtab', (e) => {
                    const target = e.target as HTMLDivElement;
                    const subtab = target.dataset.subtab;
                    const color = target.dataset.color;
                    
                    if(subtab) {
                        const subtabSelector = `#settings-grid-${subtab}`;
                        const subSettingsContainer = document.querySelector(subtabSelector) as HTMLDivElement;
                        const allSubSettingContainers = document.querySelectorAll('.hs-panel-settings-grid') as NodeListOf<HTMLDivElement>;
                        const allSubTabs = document.querySelectorAll('.hs-panel-subtab') as NodeListOf<HTMLDivElement>;

                        if(subSettingsContainer && allSubSettingContainers && allSubTabs) {
                            allSubSettingContainers.forEach(container => {
                                container.classList.remove('open');
                            });

                            allSubTabs.forEach(subTab => {
                                subTab.style.backgroundColor = '';
                            });

                            subSettingsContainer.classList.add('open');

                            if(color && color.length > 0) {
                                target.style.backgroundColor = color;
                            }
                        }
                    }
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
