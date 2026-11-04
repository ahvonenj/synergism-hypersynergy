import { HSModuleDefinition } from "../types/hs-types";
import { HSLogger } from "./hs-core/hs-logger";
import { HSModuleManager } from "./hs-core/module/hs-module-manager";
import { HSUI } from "./hs-core/hs-ui";
import { HSUIC } from "./hs-core/hs-ui-components";
import { HSSettings } from "./hs-core/settings/hs-settings";
import { HSSettingsUI } from "./hs-core/settings/hs-settings-ui";
import { HSAutosingStrategyControls } from "./hs-modules/hs-autosing/ui/hs-autosing-strategy-controls";
import { HSGlobal } from "./hs-core/hs-global";
import { HSBackup } from "./hs-core/hs-backup";
import { HSCalculationTools } from "./hs-core/hs-calculation-tools";
import { HSBookmarkletNotice } from "./hs-core/hs-bookmarklet-notice";
import { HSPlatform } from "./hs-core/hs-platform";
import { HSHeaderEditSettings } from "./hs-core/header/hs-header-edit-settings";
import overrideCSS from "inline:../resource/css/hs-overrides.css";
import quickbarsCSS from "inline:../resource/css/module/hs-quickbars.css";
import strategyEditionCSS from "inline:../resource/css/hs-strategy-edition.css";
import { HSNotifyPosition, HSNotifyType } from "../types/module-types/hs-ui-types";
import { HSGameDataAPI } from "./hs-core/gds/hs-gamedata-api";
import { HSAmbrosia } from "./hs-modules/hs-ambrosia/hs-ambrosia";
import { HSHeaterInputModalController } from "./hs-modules/hs-heater/ui/hs-heater-input-modal-controller";
import { HSUtils } from "./hs-utils/hs-utils";
import { HSGithub } from "./hs-core/github/hs-github";
import { HSGameDialogs } from "./hs-core/dialogs/hs-game-dialogs";
import { HSDevTools } from "./hs-core/dev/hs-dev-tools";

// Build-time injected by esbuild via `define`: false in the release build only.
declare const HS_DEV_BUILD: boolean;

/**
 * Class: Hypersynergism
 * Description: 
 *     Hypersynergism main class.
 *     Instantiates the module manager and handles calls to building the mod's panel and working with mod's settings
 * Author: Swiffy, Shewchou
*/
export class Hypersynergism {
    // Class context, mainly for HSLogger
    #context = 'HSMain';

    // Patches the mod no longer uses: an install patched by an older patcher still reports them,
    // so they are left out of the "patch incomplete" warning (old corruption loadouts, and action 404's free levels)
    static readonly #RETIRED_PATCHES = new Set(['applyCorruptions', 'corruptionFreeLevels']);

    #moduleManager: HSModuleManager;
    #isInitialized = false;

    constructor(modulesToEnable: HSModuleDefinition[]) {
        // Instantiate the module manager
        this.#moduleManager = new HSModuleManager('HSModuleManager', modulesToEnable);
    }

    async preprocessModules() {
        await this.#moduleManager.preprocessModules();
    }

    // Called from loader
    async init() {
        if (this.#isInitialized) return;
        this.#isInitialized = true;
        HSGlobal.General.isModFullyLoaded = false;

        // Wait for game to be ready before doing ANYTHING substantial
        if (!await this.#waitForGameReady()) {
            HSLogger.warn("Hypersynergism: Game load timed out, attempting init anyway...", this.#context);
        }

        HSLogger.log("Initialising Hypersynergism modules", this.#context);

        // Now that game is ready, we can process modules (which might init immediate modules like HSUI)
        await this.preprocessModules();
        HSLogger.log(`Platform: ${HSPlatform.get()}`, this.#context);
        // After preprocessModules(), which attaches HSLogger to the panel (it drops panel logs written before that),
        // and before the feature modules, which may click game buttons that open dialogs
        HSGameDialogs.init();
        await this.#moduleManager.initModules();

        HSLogger.log("Building UI Panel", this.#context);
        this.#buildUIPanelContents();

        HSLogger.log("Injecting style overrides", this.#context);
        this.#injectStyleOverrides();

        // Do this after UI Panel stuff is ready, because
        // syncing basically means syncing the UI with the settings
        await HSSettingsUI.syncSettings(HSSettings.getUIDependencies());
        HSAutosingStrategyControls.updateStrategyDropdownList();
        // After the sync: its checkboxes show the settings' states
        HSHeaderEditSettings.install();

        const ambrosiaMod = HSModuleManager.getModule<HSAmbrosia>('HSAmbrosia');
        if (ambrosiaMod) {
            await ambrosiaMod.initializeActiveLoadoutFromGameData();
        }

        // Mod fully loaded, so we show HS icon, and update the flag
        const hsui = HSModuleManager.getModule<HSUI>('HSUI');
        hsui?.setPanelControlVisible(true);
        HSGlobal.General.isModFullyLoaded = true;

        await HSUI.Notify(`Hypersynergism v${HSGlobal.General.currentModVersion} loaded`, {
            position: 'top',
            notificationType: "success"
        });

        HSGithub.startVersionPolling(HSGlobal.Release.checkIntervalMs);
        void this.#onGameLoaded();
        void HSBookmarkletNotice.showIfBookmarklet();
    }

    /**
     * Once the game has finished loading: expose the patched game internals (hidden behind the offline
     * popup when it is open), then close the popup if the autoDismissOfflinePopup setting is on.
     * The browser loader usually did both already, in which case this does nothing.
     */
    async #onGameLoaded(): Promise<void> {
        const autoDismissPopup = !!HSSettings.getSetting('autoDismissOfflinePopup')?.isEnabled();

        await this.#waitForGameLoaded();
        this.#reportPatchProblems();
        await this.#ensurePatcherExposure(autoDismissPopup);

        if (autoDismissPopup) this.#dismissOfflinePopup();
    }

    /**
     * What the patcher applied to the game bundle ({ patch name: applied }), written into it as
     * window.__HS_PATCH_REPORT. Undefined without a patched bundle (bookmarklet) or with a patcher older than it.
     */
    #getPatchReport(): Record<string, boolean> | undefined {
        return window.__HS_PATCH_REPORT;
    }

    /**
     * Tell the player once when the game patch is incomplete or in doubt, both usually after a game update the
     * patcher doesn't match yet: a notification, and the detail in the Log tab (bug reports carry it).
     * - Missing (window.__HS_PATCH_REPORT): the features using those patches run on their fallbacks, as for
     *   bookmarklet players.
     * - In doubt (window.__HS_PATCH_AMBIGUOUS, the labels of patches whose anchor matched several functions): the
     *   first one was patched, maybe the wrong one, so what relies on it may misbehave.
     */
    #reportPatchProblems(): void {
        const report = this.#getPatchReport();
        if (!report) return;
        const missing = Object.keys(report).filter(name => !report[name] && !Hypersynergism.#RETIRED_PATCHES.has(name));
        const ambiguous: string[] = Array.isArray(window.__HS_PATCH_AMBIGUOUS)
            ? window.__HS_PATCH_AMBIGUOUS.filter(name => !Hypersynergism.#RETIRED_PATCHES.has(name)) : [];
        if (missing.length === 0 && ambiguous.length === 0) return;

        if (missing.length) {
            HSLogger.warn(`Game patch incomplete, missing: ${missing.join(', ')}. The features using them fall back to other ways, `
                + 'some slower or partial.', this.#context);
        }
        if (ambiguous.length) {
            HSLogger.warn(`Game patch in doubt: ${ambiguous.join(', ')} matched several places in the game's code, the first one `
                + 'was patched and may be the wrong one. What relies on it may misbehave.', this.#context);
        }
        HSLogger.warn('A game update probably changed what the patcher looks for: please report it with this log.', this.#context);

        const problems = [
            missing.length ? `${missing.length} part(s) missing` : '',
            ambiguous.length ? `${ambiguous.length} in doubt` : ''
        ].filter(Boolean).join(', ');
        void HSUI.Notify(`Game patch: ${problems}. Some features may not work as usual, details in the Log tab.`, {
            position: 'top',
            notificationType: 'warning',
            displayDuration: 10000,
            // A fixed-size box that hides what overflows: two lines of this text
            width: 440,
            height: 60
        });
    }

    /** Close the offline progress popup if it is open. */
    #dismissOfflinePopup() {
        if (document.getElementById('offlineContainer')?.style.display !== 'flex') return;
        document.getElementById('exitOffline')?.click();
    }

    /**
     * Resolve once the game has finished loading. Same signal as the browser loader: the offline progress
     * popup is shown. Also resolves when the popup was already dismissed (body.loading removed by exitOffline).
     */
    #waitForGameLoaded(): Promise<void> {
        const isLoaded = () => document.getElementById('offlineContainer')?.style.display === 'flex'
            || !document.body.classList.contains('loading');

        return new Promise(resolve => {
            if (isLoaded()) { resolve(); return; }

            const observer = new MutationObserver(() => {
                if (!isLoaded()) return;
                observer.disconnect();
                resolve();
            });
            observer.observe(document.body, { attributes: true, attributeFilter: ['class', 'style'], subtree: true });
        });
    }

    /**
     * Patched bundles expose some game internals (__HS_i18next, __HS_synergismStage, __HS_exportSynergism...)
     * only once the game runs the patched functions. The browser loader triggers them before loading the mod,
     * the Steam injector doesn't, so do the same here: open Settings → Stats for nerds → Misc, run a silent
     * export, then go back to the previous tab. Called once the game has loaded; the game's tab buttons don't
     * check for the offline popup, so the navigation runs hidden behind it when it is open (the stage itself
     * is only exposed once the popup closes, see below).
     * Done here in the mod rather than in the Steam injector, so it reaches Steam players with a mod release
     * instead of requiring a new exe launcher. Skipped when the loader already did it (browser).
     */
    async #ensurePatcherExposure(autoDismissPopup: boolean): Promise<void> {
        const w = window;
        // Without the patched bundle (bookmarklet loader), navigating can't expose anything
        if (!HSGlobal.exposedPlayer) return;

        // Only what the patcher applied (all of it with a patcher older than its report): never click the
        // export without the export patch, it would run a real export (a file or the clipboard, and its rewards)
        const report = this.#getPatchReport();
        const isStagePatched = report?.stage !== false;
        const isExportPatched = report?.export !== false;
        if (!isStagePatched && !isExportPatched) return;

        const isExposed = () => (!isStagePatched || !!w.__HS_STAGE_EXPOSED) && (!isExportPatched || !!w.__HS_EXPORT_EXPOSED);
        if (isExposed()) return;

        const click = async (id: string) => {
            document.getElementById(id)?.click();
            await HSUtils.sleep(100);
        };
        const waitForPopupClosed = () => new Promise<void>(resolve => {
            if (!document.body.classList.contains('loading')) { resolve(); return; }
            const observer = new MutationObserver(() => {
                if (document.body.classList.contains('loading')) return;
                observer.disconnect();
                resolve();
            });
            observer.observe(document.body, { attributes: true, attributeFilter: ['class'] });
        });

        // Only the active main tab button has aria-current (its panel also gets .active-tab)
        const previousTab = document.querySelector<HTMLElement>('[aria-current="page"]');
        const settingsTab = document.getElementById('settingstab');

        // Safety net: the game should accept tab clicks once loaded, even behind the offline popup
        for (let check = 0; check < 10; check++) {
            await click('settingstab');
            if (settingsTab?.classList.contains('active-tab')) break;
            await HSUtils.sleep(1000);
        }
        if (!settingsTab?.classList.contains('active-tab')) {
            HSLogger.warn('Could not expose patched game internals: the settings tab did not open', this.#context);
            return;
        }

        if (isStagePatched && !w.__HS_STAGE_EXPOSED) {
            await click('switchSettingSubTab4');
            await click('kMisc');
        }

        if (isExportPatched && !w.__HS_EXPORT_EXPOSED) {
            // The patched exportSynergism exposes itself right away, then returns early while this flag is set
            w.__HS_SILENT_EXPORT = true;
            try {
                document.getElementById('exportgame')?.click();
            } finally {
                w.__HS_SILENT_EXPORT = false;
            }
        }

        // The stage is only exposed when the game renders the Misc stats, and the game pauses its display
        // updates while the offline popup is open. It happens on the first update after the popup closes,
        // with Misc still active behind it: close it (setting on) or wait for the player to (no limit).
        if (isStagePatched) {
            if (document.body.classList.contains('loading')) {
                if (autoDismissPopup) this.#dismissOfflinePopup();
                await waitForPopupClosed();
            }

            const stageDeadline = Date.now() + 5000;
            while (!w.__HS_STAGE_EXPOSED && Date.now() < stageDeadline) {
                await HSUtils.sleep(100);
            }
        }

        // Go back to where the player was, unless they already moved away from Settings
        if (settingsTab?.classList.contains('active-tab')) {
            (previousTab ?? document.getElementById('buildingstab'))?.click();
        }

        if (isExposed()) {
            HSLogger.log('Patched game internals exposed (stage, i18n, export)', this.#context);
        } else {
            HSLogger.warn(`Could not expose patched game internals (stage: ${!!w.__HS_STAGE_EXPOSED}, export: ${!!w.__HS_EXPORT_EXPOSED})`, this.#context);
        }
    }

    async #waitForGameReady(): Promise<boolean> {
        let attempts = 0;
        // Wait up to 30 seconds
        while (attempts < 300) {
            // The tab appears before later game controls while the HTML is still
            // parsing. Starting modules then can make their short element hooks
            // time out on slower Steam launches.
            if (document.readyState !== 'loading' && document.getElementById('buildingstab')) {
                return true;
            }
            await new Promise(r => setTimeout(r, 100));
            attempts++;
        }
        return false;
    }


    // ===============================
    // --- UI panel construction -----
    // ===============================

    #buildUIPanelContents() {
        const hsui = HSModuleManager.getModule<HSUI>('HSUI');

        if (hsui) {
            hsui.updateTitle(`Hypersynergism v${HSGlobal.General.currentModVersion}`);

            this.#buildToolsTab(hsui);
            this.#buildSettingsTab(hsui);
            this.#buildDebugTab(hsui);

            hsui.renameTab(2, 'Tools');
            hsui.renameTab(3, 'Settings');
            hsui.renameTab(4, 'Debug');
        }
    }

    #injectStyleOverrides() {
        HSUI.injectStyle(overrideCSS, 'hs-override-css');
        HSUI.injectStyle(strategyEditionCSS, 'hs-panel-strategy-edition-css');
        HSUI.injectStyle(quickbarsCSS, 'hs-quickbars-css');
    }

    #buildGridSectionHeader(text: string) {
        return HSUIC.Div({
            class: 'hs-panel-grid-section-header',
            html: text
        });
    }

    #buildGridFullSpanDiv(id: string | undefined, html: string) {
        return HSUIC.Div({
            id,
            class: 'hs-panel-grid-full-span',
            html
        });
    }


    // ================================
    // --- Tools tab implementation ---
    // ================================

    #buildToolsTab(hsui: HSUI) {
        // Only for players who loaded the mod with the bookmark, hence at the very top
        const bookmarkletSection = HSBookmarkletNotice.buildToolsSection();

        hsui.replaceTabContents(2,
            HSUIC.Grid({
                class: 'hs-panel-grid-2col',
                html: [
                    ...(bookmarkletSection.length > 0 ? [this.#buildGridSectionHeader('Recommended: Tampermonkey loader'), ...bookmarkletSection] : []),
                    this.#buildGridSectionHeader('Backup & Restore'),
                    ...HSBackup.buildToolsSection(),
                    this.#buildGridSectionHeader('Ambrosia Heater'),
                    this.#buildGridFullSpanDiv('hs-panel-amb-heater-p', `Export an extended save file string for the <a href="${HSGlobal.General.heaterUrl}" class="hs-link" target="_blank">Ambrosia Heater sheet</a>.`),
                    HSUIC.Button({ id: 'hs-panel-amb-heater-btn', text: 'Copy Heater Data' }),
                    HSUIC.Button({ id: 'hs-panel-amb-heater-compute-btn', text: 'Ambrosia Heater' }),
                    this.#buildGridSectionHeader('Mod links'),
                    HSUIC.Button({ id: 'hs-panel-mod-website-btn', text: 'Mod Website' }),
                    HSUIC.Button({ id: 'hs-panel-mod-github-btn', text: 'Mod Github' }),
                    HSUIC.Button({ id: 'hs-panel-discord-thread-btn', text: 'Discord Thread' }),
                    HSUIC.Button({ id: 'hs-panel-check-version-btn', text: 'CHECK VERSION' }),
                    this.#buildGridSectionHeader('Other tools'),
                    HSUIC.Button({ id: 'hs-panel-dump-settings-btn', text: 'Dump Settings' }),
                    HSUIC.Button({ id: 'hs-panel-dump-gamedata-btn', text: 'Dump Game vars' }),
                    HSUIC.Button({ id: 'hs-panel-exit-exalt-bug-btn', text: 'Fix Exalt Bug' }),
                    HSUIC.Button({ id: 'hs-panel-clear-settings-btn', text: 'CLEAR SETTINGS', styles: { borderColor: 'red' } }),
                    this.#buildGridSectionHeader('Testing tools'),
                    HSUIC.Button({ id: 'hs-panel-test-notify-btn', text: 'Notify test' }),
                    HSUIC.Button({ id: 'hs-panel-test-notify-long-btn', text: 'Notify test 2' }),
                    this.#buildGridSectionHeader('Calculation tools'),
                    ...HSCalculationTools.buildToolsSection(),
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

        this.#bindToolsTabEvents(hsui);
    }

    #bindToolsTabEvents(hsui: HSUI) {
        const positions: HSNotifyPosition[] = ["topLeft", "top", "topRight", "right", "bottomRight", "bottom", "bottomLeft", "left"];
        const colors: HSNotifyType[] = ["default", "warning", "error", "success"];
        let p_idx = -1;
        let c_idx = -1;

        HSBookmarkletNotice.bindToolsSection();
        HSBackup.bindToolsSection();
        HSCalculationTools.bindToolsSection();

        this.#bindToolsButton('#hs-panel-amb-heater-btn', async () => {
            const dataModule = HSModuleManager.getModule<HSGameDataAPI>('HSGameDataAPI');
            if (!dataModule) return;

            const heaterData = await dataModule.dumpDataForHeater();
            if (!heaterData) return;

            const json = JSON.stringify(heaterData);
            const base64 = btoa(json);
            const tsv = HSUtils.base64WithCRLF(base64);
            await navigator.clipboard.writeText(tsv);

            HSUI.Notify('Ambrosia heater data copied to clipboard', {
                position: 'top',
                notificationType: 'success'
            });
        });

        this.#bindToolsButton('#hs-panel-amb-heater-compute-btn', async () => {
            await HSHeaterInputModalController.openHeaterComputationModal();
        });

        this.#bindToolsButton('#hs-panel-mod-website-btn', () => this.#openUrl(HSGlobal.General.modWebsiteUrl));
        this.#bindToolsButton('#hs-panel-mod-github-btn', () => this.#openUrl(HSGlobal.General.modGithubUrl));
        this.#bindToolsButton('#hs-panel-discord-thread-btn', () => this.#openUrl(HSGlobal.General.modDiscordThreadUrl));

        this.#bindToolsButton('#hs-panel-dump-settings-btn', () => HSSettings.dumpToConsole());
        this.#bindToolsButton('#hs-panel-dump-gamedata-btn', () => this.#dumpGameData());
        this.#bindToolsButton('#hs-panel-clear-settings-btn', () => HSBackup.clearSettingsAndReload());
        this.#bindToolsButton('#hs-panel-check-version-btn', () => this.#checkVersion());
        this.#bindToolsButton('#hs-panel-exit-exalt-bug-btn', () => this.#fixExaltBug());

        this.#bindToolsButton('#hs-panel-test-notify-btn', async () => {
            p_idx = (p_idx + 1) % positions.length;
            c_idx = (c_idx + 1) % colors.length;
            await HSUI.Notify('Test notification', {
                position: positions[p_idx],
                notificationType: colors[c_idx]
            });
        });

        this.#bindToolsButton('#hs-panel-test-notify-long-btn', async () => {
            p_idx = (p_idx + 1) % positions.length;
            c_idx = (c_idx + 1) % colors.length;
            await HSUI.Notify('This is a really very extremely long test notification which tests if the notification works with a long notification test notification ', {
                position: positions[p_idx],
                notificationType: colors[c_idx]
            });
        });
    }

    #bindToolsButton(selector: string, callback: () => void | Promise<void>) {
        document.querySelector(selector)?.addEventListener('click', async () => {
            await callback();
        });
    }


    // ===================================
    // ----- Tools helpers / actions -----
    // ===================================

    #openUrl(url: string) {
        window.open(url, '_blank');
    }

    async #checkVersion() {
        const isLatest = await HSGithub.isLatestTag();
        // Dev channel players only
        const liveTag = HSGithub.liveReleaseTag;
        const liveRelease = liveTag ? ` Latest Live release: ${liveTag}.` : '';

        HSUI.Notify((isLatest
            ? 'You are using the latest version of Hypersynergism!'
            : 'You are NOT using the latest version of Hypersynergism!') + liveRelease, {
            position: 'top',
            notificationType: isLatest ? 'success' : 'warning'
        });
    }

    #fixExaltBug() {
        HSLogger.log('Attempting to exit an exalt by clicking the active challenge (if any).');

        const img = HSUtils.getActiveExaltElement();
        if (img) {
            console.log('Found active challenge img, clicking:', img);
            img.click();
            return;
        }

        const exposedPlayer = HSGlobal.exposedPlayer;
        if (!exposedPlayer) {
            HSLogger.log('If you are using the bookmark loader, please try again with the TAMPERMONKEY loader instead.', this.#context);
            return;
        }

        if (exposedPlayer.insideSingularityChallenge === false) {
            HSLogger.info('No active Exalt found in DOM or exposed stuff... Are you sure you have a bug?', this.#context);
            return;
        }

        exposedPlayer.insideSingularityChallenge = true;
        HSLogger.info('Exalt bug fixed.', this.#context);
    }

    #dumpGameData() {
        const dataModule = HSModuleManager.getModule<HSGameDataAPI>('HSGameDataAPI');
        if (!dataModule) return;

        console.log('----- GAME DATA -----');
        console.log(dataModule.getGameData());
        console.log('----- PSEUDO DATA -----');
        // Patched game: the game's own levels, which the mod reads instead
        console.log(window.__HS_pcoinLevelsLoaded ? window.__HS_pcoinLevels : dataModule.getPseudoData());
        console.log('----- CAMPAIGN DATA -----');
        console.log(dataModule.getCampaignData());
        console.log('----- ME DATA -----');
        console.log(dataModule.getMeData());
        console.log('----- EVENT DATA -----');
        console.log(dataModule.getEventData());
    }


    // ===================================
    // --- Settings tab implementation ---
    // ===================================

    #buildSettingsTab(hsui: HSUI) {
        const settingsTabContents = HSSettingsUI.autoBuildSettingsUI(HSSettings.getUIDependencies());

        if (!settingsTabContents.didBuild) return;

        hsui.replaceTabContents(3,
            [settingsTabContents.navHTML, settingsTabContents.pagesHTML].join('')
        );

        this.#bindSettingsTabEvents();
    }

    #bindSettingsTabEvents() {
        document.delegateEventListener('click', '.hs-panel-setting-block-gamedata-icon', (e) => {
            this.#handleGameDataIconClick(e);
        });

        document.delegateEventListener('click', '.hs-panel-subtab', (e) => {
            this.#handleSettingsSubtabClick(e);
        });
    }

    #handleGameDataIconClick(_e: Event) {
        const subtab = document.querySelector('#hs-panel-settings-subtab-gamedata') as HTMLDivElement | null;
        const color = subtab?.dataset.color;

        this.#activateSettingsSubtab('gamedata', subtab, color);

        const gameDataSettingBlock = document.querySelector('#hs-setting-block-gamedata') as HTMLDivElement | null;
        gameDataSettingBlock?.scrollIntoView({
            block: 'start',
            behavior: 'smooth',
        });
    }

    #handleSettingsSubtabClick(e: Event) {
        const target = (e.target as HTMLElement).closest('.hs-panel-subtab') as HTMLDivElement | null;
        const subtab = target?.dataset.subtab;
        const color = target?.dataset.color;

        if (!subtab) return;
        this.#activateSettingsSubtab(subtab, target, color);
    }

    #activateSettingsSubtab(subtab: string, activeTab: HTMLDivElement | null, color?: string) {
        const subSettingsContainer = document.querySelector(`#settings-grid-${subtab}`) as HTMLDivElement | null;
        const allSubSettingContainers = document.querySelectorAll('.hs-panel-settings-grid') as NodeListOf<HTMLDivElement>;
        const allSubTabs = document.querySelectorAll('.hs-panel-subtab') as NodeListOf<HTMLDivElement>;

        if (!subSettingsContainer) return;

        allSubSettingContainers.forEach(container => container.classList.remove('open'));
        allSubTabs.forEach(subTab => subTab.style.backgroundColor = '');

        subSettingsContainer.classList.add('open');
        if (activeTab && color) {
            activeTab.style.backgroundColor = color;
        }
    }


    // ================================
    // --- Debug tab implementation ---
    // ================================

    #buildDebugTab(hsui: HSUI) {
        hsui.replaceTabContents(4,
            HSUIC.Grid({
                id: 'hs-panel-debug-grid',
                class: 'hs-panel-grid-2col',
                html: [
                    this.#buildGridSectionHeader('Mouse'),
                    HSUIC.Div({ id: 'hs-panel-debug-mousepos' }),
                ]
            })
        );

        // Dev builds only: the release build drops this block, and HSDevTools with it
        if (HS_DEV_BUILD) {
            const debugGrid = document.getElementById('hs-panel-debug-grid');
            if (debugGrid) new HSDevTools().build(debugGrid);
        }
    }

}
