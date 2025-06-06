import { HSModuleDefinition, HSReleaseInfo } from "../types/hs-types";
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
import { HSInputType, HSNotifyPosition, HSNotifyType } from "../types/module-types/hs-ui-types";
import { HSGameDataAPI } from "./hs-core/gds/hs-gamedata-api";
import { HSWebSocket } from "./hs-core/hs-websocket";
import { GameEventResponse, GameEventType } from "../types/data-types/hs-event-data";
import { HSUtils } from "./hs-utils/hs-utils";
import { HSGithub } from "./hs-core/github/hs-github";

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

    #versionCheckIvl? : number;
    #latestRelease?: HSReleaseInfo;

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

        this.#versionCheckIvl = setInterval(async () => {
            const latestRelease = await HSGithub.getLatestRelease();

            if(latestRelease) {
                HSLogger.debug(`Latest release: ${latestRelease.name} (${latestRelease.version})`, this.#context);

                if(latestRelease.version !== HSGlobal.General.currentModVersion) {
                    HSGlobal.General.isLatestVersion = false;

                    const modIcon = document.querySelector('#hs-panel-control') as HTMLDivElement;
                    const modPanelHead = document.querySelector('#hs-panel-version') as HTMLDivElement;

                    if(modIcon && modPanelHead) {
                        modIcon.classList.add('hs-rainbowBorder');
                        modPanelHead.innerHTML += ` - <span id="hs-panel-new-ver">New version available!</span>`;

                        clearInterval(this.#versionCheckIvl);
                        this.#versionCheckIvl = undefined;
                    }
                }
            }
        }, HSGlobal.PrivateAPI.checkIntervalMs);
    }

    #buildUIPanelContents() {
        const hsui = HSModuleManager.getModule<HSUI>('HSUI');

        if(hsui) {
            // Update panel title with current version
            hsui.updateTitle(`Hypersynergism v${HSGlobal.General.currentModVersion}`);

            // BUILD TOOLS TAB
            this.#buildToolsTab(hsui);
            
            // BUILD SETTINGS TAB
            this.#buildSettingsTab(hsui);
            
            // BUILD DEBUG TAB
            this.#buildDebugTab(hsui);
            
            // Rename tabs
            hsui.renameTab(2, 'Tools');
            hsui.renameTab(3, 'Settings');
            hsui.renameTab(4, 'Debug');
        }
    }

    #injectStyleOverrides() {
        HSUI.injectStyle(overrideCSS, 'hs-override-css');
    }

    #buildToolsTab(hsui: HSUI) {
        const calculationOptions = HSGameDataAPI.getCalculationDefinitions({ toolingSupport: "true" })
        .map((def) => {
            return {
                text: def.supportsReduce ? `${def.calculationName} (C)` : def.calculationName,
                value: def.supportsReduce ? `${def.fnName}|c` : def.fnName,
            };
        });

        // BUILD TOOLS TAB
        // Add corruption reference modal button
        hsui.replaceTabContents(2, 
            HSUIC.Grid({ 
                html: [
                    HSUIC.Div({ 
                        html: 'Export tools',
                        styles: {
                            borderBottom: '1px solid limegreen',
                            gridColumn: 'span 2'
                        }
                    }),
                    HSUIC.Div({ 
                        id: 'hs-panel-amb-heater-p', 
                        html: `Export an extended save file string for the <a href="${HSGlobal.General.heaterUrl}" class="hs-link" target="_blank">Ambrosia Heater.</a>`,
                        styles: {
                            gridColumn: 'span 2'
                        }
                    }),
                    HSUIC.Button({ id: 'hs-panel-amb-heater-btn', text: 'Ambrosia heater' }),
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
                    HSUIC.Button({ id: 'hs-panel-check-version-btn', text: 'CHECK VERSION' }),
                    HSUIC.Div({ 
                        html: 'Testing tools',
                        styles: {
                            borderBottom: '1px solid limegreen',
                            gridColumn: 'span 2'
                        }
                    }),
                    HSUIC.Button({ id: 'hs-panel-test-notify-btn', text: 'Notify test' }),
                    HSUIC.Button({ id: 'hs-panel-test-notify-long-btn', text: 'Notify test 2' }),
                    HSUIC.Div({ 
                        html: 'Calculation tools',
                        styles: {
                            borderBottom: '1px solid limegreen',
                            gridColumn: 'span 2'
                        }
                    }),
                    HSUIC.Div({ 
                        id: 'hs-panel-calc-tools-p', 
                        html: `Execute supported calculations and see their results. Calculations denoted with "(C)" support "calculating by components",
                        meaning that the calculation results can be output as an array of components that make up the calculations.<br><br>
                        Note that calculating by components always clears the calculation cache first.`,
                        styles: {
                            gridColumn: 'span 2',
                            fontSize: '10pt'
                        }
                    }),
                    HSUIC.Select({ 
                        class: 'hs-panel-setting-block-select-input', 
                        id: 'hs-panel-test-calc-sel', 
                        type: HSInputType.TEXT,
                        styles: {
                            gridColumn: 'span 2'
                        }
                    }, calculationOptions),
                    HSUIC.Button({ id: 'hs-panel-test-calc-redu-btn', text: 'Calculate reduced', styles: { width: 'auto' } }),
                    HSUIC.Button({ id: 'hs-panel-test-calc-comps-btn', text: 'Calculate components', styles: { width: 'auto' } }),
                    HSUIC.Button({ id: 'hs-panel-test-calc-cache-clear-btn', text: 'Clear cache' }),
                    HSUIC.Button({ id: 'hs-panel-test-calc-cache-dump-btn', text: 'Dump cache' }),
                    HSUIC.Div({ 
                        id: 'hs-panel-test-calc-latest', 
                        styles: {
                            gridColumn: 'span 2'
                        }
                    }),
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

        document.querySelector('#hs-panel-amb-heater-btn')?.addEventListener('click', async () => {
            const dataModule = HSModuleManager.getModule<HSGameDataAPI>('HSGameDataAPI');

            if(dataModule) {
                const heaterData = await dataModule.dumpDataForHeater();

                if(heaterData) {
                    await navigator.clipboard.writeText(btoa(JSON.stringify(heaterData)));

                    HSUI.Notify('Ambrosia heater data copied to clipboard', {
                        position: 'top',
                        notificationType: "success"
                    });
                }
            }
        });

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

        document.querySelector('#hs-panel-check-version-btn')?.addEventListener('click', async() => {
            const isLatest = await HSUtils.isLatestVersion();
            
            if(isLatest) {
                HSUI.Notify('You are using the latest version of Hypersynergism!', {
                    position: 'top',
                    notificationType: "success"
                });
            } else {
                HSUI.Notify('You are not using the latest version of Hypersynergism!', {
                    position: 'top',
                    notificationType: "warning"
                });
            }
        });

        document.querySelector('#hs-panel-test-calc-redu-btn')?.addEventListener('click', () => {
            const dataModule = HSModuleManager.getModule<HSGameDataAPI>('HSGameDataAPI');
            const sel = document.querySelector('#hs-panel-test-calc-sel') as HTMLSelectElement;

            if(dataModule && sel) {
                const calcFnName = sel.value.split('|')[0];

                if(typeof (dataModule as any)[calcFnName] === 'function') {
                    const result = (dataModule as any)[calcFnName]() as number;
                    console.log(`--- CALCULATED ${calcFnName} ---`);
                    console.log(result);

                    const latestDiv = document.querySelector('#hs-panel-test-calc-latest') as HTMLDivElement;

                    if(latestDiv) {
                        latestDiv.innerText = `Last calc result: ${HSUtils.N(result)}`;
                    }
                } else {
                    HSLogger.warn(`${calcFnName} is not a function`, this.#context);
                }
            } else {
                HSLogger.warn('dataModule or calculation select was null', this.#context);
            }
        });

        document.querySelector('#hs-panel-test-calc-comps-btn')?.addEventListener('click', () => {
            const dataModule = HSModuleManager.getModule<HSGameDataAPI>('HSGameDataAPI');
            const sel = document.querySelector('#hs-panel-test-calc-sel') as HTMLSelectElement;

            if(dataModule && sel) {
                const selVal = sel.value.split('|');
                const calcFnName = selVal[0];
                const comp = selVal.includes('c');

                if(typeof (dataModule as any)[calcFnName] === 'function') {
                    if(comp) {
                        dataModule.clearCache();
                        const result = (dataModule as any)[calcFnName](false) as number[];

                        const latestDiv = document.querySelector('#hs-panel-test-calc-latest') as HTMLDivElement;

                        if(latestDiv) {
                            latestDiv.innerText = `Last calc result: [${result.toString().split(',').join(', ')}]`;
                        }

                        console.log(`--- CALCULATED ${calcFnName} ---`);
                        console.log(result);
                    } else {
                        HSLogger.warn(`${calcFnName} cannot be calculated by components`, this.#context);
                    }
                } else {
                    HSLogger.warn(`${calcFnName} is not a function`, this.#context);
                }
            } else {
                HSLogger.warn('dataModule or calculation select was null', this.#context);
            }
        });

        document.querySelector('#hs-panel-test-calc-cache-clear-btn')?.addEventListener('click', () => {
            const dataModule = HSModuleManager.getModule<HSGameDataAPI>('HSGameDataAPI');

            if(dataModule) {
                HSLogger.info('Cleared calculation cache', this.#context);
                dataModule.clearCache();
            }
        });

        document.querySelector('#hs-panel-test-calc-cache-dump-btn')?.addEventListener('click', () => {
            const dataModule = HSModuleManager.getModule<HSGameDataAPI>('HSGameDataAPI');

            if(dataModule) {
                HSLogger.info('Calculation cache dump', this.#context);
                dataModule.dumpCache();
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
    }

    #buildSettingsTab(hsui: HSUI) {
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
    }

    #buildDebugTab(hsui: HSUI) {
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
    }
}
