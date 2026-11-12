import type { HSRegisteredModuleDefinition } from "./hs-core/module/hs-module-definitions";
import { HSLogger } from "./hs-core/hs-logger";
import { HSModuleManager } from "./hs-core/module/hs-module-manager";
import { HSModuleRegistry } from "./hs-core/module/hs-module-registry";
import { HSUI } from "./hs-core/hs-ui";
import { HSUIC } from "./hs-core/hs-ui-components";
import { HSSettings } from "./hs-core/settings/hs-settings";
import { HSSettingsUI } from "./hs-core/settings/hs-settings-ui";
import { HSAutosingStrategyControls } from "./hs-modules/hs-autosing/ui/hs-autosing-strategy-controls";
import { HSGlobal } from "./hs-core/hs-global";
import { HSBookmarkletNotice } from "./hs-core/hs-bookmarklet-notice";
import { HSPlatform } from "./hs-core/hs-platform";
import { HSToolsTab } from "./hs-core/hs-tools-tab";
import { HSHeaderEditSettings } from "./hs-core/header/hs-header-edit-settings";
import overrideCSS from "inline:../resource/css/hs-overrides.css";
import quickbarsCSS from "inline:../resource/css/module/hs-quickbars.css";
import strategyEditionCSS from "inline:../resource/css/hs-strategy-edition.css";

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
 *     Instantiates the module manager, boots the mod once the game is ready, and assembles the mod's panel
 *     (Tools tab: HSToolsTab, Settings tab: HSSettingsUI)
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

    constructor(modulesToEnable: readonly HSRegisteredModuleDefinition[]) {
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

        const ambrosiaMod = HSModuleRegistry.getModule('HSAmbrosia');
        if (ambrosiaMod) {
            await ambrosiaMod.initializeActiveLoadoutFromGameData();
        }

        // Mod fully loaded, so we show HS icon, and update the flag
        const hsui = HSModuleRegistry.getModule('HSUI');
        hsui?.setPanelControlVisible(true);
        HSGlobal.General.isModFullyLoaded = true;

        void HSUI.Notify(`Hypersynergism v${HSGlobal.General.currentModVersion} loaded`, {
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

        // The game can't save while the offline popup is open, and the restore reads a fresh save
        await this.#waitForPopupClosed();
        HSModuleRegistry.getModule('HSAutosing')?.restoreAfterInterruptedRun();
    }

    /** Resolves once the offline popup is closed (exitOffline removes body.loading). */
    #waitForPopupClosed(): Promise<void> {
        return new Promise<void>(resolve => {
            if (!document.body.classList.contains('loading')) { resolve(); return; }
            const observer = new MutationObserver(() => {
                if (document.body.classList.contains('loading')) return;
                observer.disconnect();
                resolve();
            });
            observer.observe(document.body, { attributes: true, attributeFilter: ['class'] });
        });
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
            displayDuration: 10000
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
                await this.#waitForPopupClosed();
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
        const hsui = HSModuleRegistry.getModule('HSUI');

        if (hsui) {
            hsui.updateTitle(`Hypersynergism v${HSGlobal.General.currentModVersion}`);

            HSToolsTab.build(hsui);
            HSSettingsUI.buildTab(hsui, HSSettings.getUIDependencies());

            hsui.renameTab(2, 'Tools');
            hsui.renameTab(3, 'Settings');

            // The Debug tab is for dev builds only
            if (HS_DEV_BUILD) {
                this.#buildDebugTab(hsui);
                hsui.renameTab(4, 'Debug');
            } else {
                hsui.removeTab(4);
            }
        }
    }

    #injectStyleOverrides() {
        HSUI.injectStyle(overrideCSS, 'hs-override-css');
        HSUI.injectStyle(strategyEditionCSS, 'hs-panel-strategy-edition-css');
        HSUI.injectStyle(quickbarsCSS, 'hs-quickbars-css');
    }

    // ================================
    // --- Debug tab implementation ---
    // ================================

    #buildDebugTab(hsui: HSUI) {
        hsui.replaceTabContents(4,
            HSUIC.Grid({
                id: 'hs-panel-debug-grid',
                class: 'hs-panel-grid-2col',
                html: []
            })
        );

        // Dev builds only: the release build drops this block, and HSDevTools with it
        if (HS_DEV_BUILD) {
            const debugGrid = document.getElementById('hs-panel-debug-grid');
            if (debugGrid) new HSDevTools().build(debugGrid);
        }
    }

}
