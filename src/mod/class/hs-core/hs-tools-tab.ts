import { HSLogger } from "./hs-logger";
import { HSModuleRegistry } from "./module/hs-module-registry";
import { HSUI } from "./hs-ui";
import { HSUIC } from "./hs-ui-components";
import { HSSettings } from "./settings/hs-settings";
import { HSGlobal } from "./hs-global";
import { HSBackup } from "./hs-backup";
import { HSCalculationTools } from "./hs-calculation-tools";
import { HSBookmarkletNotice } from "./hs-bookmarklet-notice";
import { HSGithub } from "./github/hs-github";
import { HSHeaterInputModalController } from "../hs-modules/hs-heater/ui/hs-heater-input-modal-controller";
import { HSUtils } from "../hs-utils/hs-utils";
import { HSNotifyPosition, HSNotifyType } from "../../types/module-types/hs-ui-types";

/**
 * Class: HSToolsTab
 * IsExplicitHSModule: No
 * Description:
 *     The mod panel's Tools tab: builds its grid of sections and buttons, and binds them.
 *     Backup, bookmarklet notice and calculation sections come from their own classes.
 *     Created by Hypersynergism.
 * Author: Swiffy, Shewchou
*/
export class HSToolsTab {
    // Fix Exalt Bug's lines keep the main context they always had
    static readonly #context = 'HSMain';

    static build(hsui: HSUI) {
        // Only for players who loaded the mod with the bookmark, hence at the very top
        const bookmarkletSection = HSBookmarkletNotice.buildToolsSection();

        hsui.replaceTabContents(2,
            HSUIC.Grid({
                class: 'hs-panel-grid-2col hs-panel-tools-grid',
                html: [
                    ...(bookmarkletSection.length > 0 ? [this.#buildGridSectionHeader('Recommended: Tampermonkey loader'), ...bookmarkletSection] : []),
                    this.#buildGridSectionHeader('Backup & Restore'),
                    ...HSBackup.buildToolsSection(),
                    this.#buildGridSectionHeader('Ambrosia Heater'),
                    HSUIC.Button({ id: 'hs-panel-amb-heater-compute-btn', text: 'Ambrosia Heater' }),
                    HSUIC.Button({ id: 'hs-panel-amb-heater-btn', text: 'Copy Heater Data' }),
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

        this.#bindEvents();
    }

    static #buildGridSectionHeader(text: string) {
        return HSUIC.Div({
            class: 'hs-panel-grid-section-header',
            html: text
        });
    }

    static #bindEvents() {
        const positions: HSNotifyPosition[] = ["topLeft", "top", "topRight", "right", "bottomRight", "bottom", "bottomLeft", "left"];
        const colors: HSNotifyType[] = ["default", "warning", "error", "success"];
        let p_idx = -1;
        let c_idx = -1;

        HSBookmarkletNotice.bindToolsSection();
        HSBackup.bindToolsSection();
        HSCalculationTools.bindToolsSection();

        this.#bindButton('#hs-panel-amb-heater-btn', async () => {
            const dataModule = HSModuleRegistry.getModule('HSGameDataAPI');
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

        this.#bindButton('#hs-panel-amb-heater-compute-btn', async () => {
            await HSHeaterInputModalController.openHeaterComputationModal();
        });

        this.#bindButton('#hs-panel-mod-website-btn', () => this.#openUrl(HSGlobal.General.modWebsiteUrl));
        this.#bindButton('#hs-panel-mod-github-btn', () => this.#openUrl(HSGlobal.General.modGithubUrl));
        this.#bindButton('#hs-panel-discord-thread-btn', () => this.#openUrl(HSGlobal.General.modDiscordThreadUrl));

        this.#bindButton('#hs-panel-dump-settings-btn', () => HSSettings.dumpToConsole());
        this.#bindButton('#hs-panel-dump-gamedata-btn', () => this.#dumpGameData());
        this.#bindButton('#hs-panel-clear-settings-btn', () => HSBackup.clearSettingsAndReload());
        this.#bindButton('#hs-panel-check-version-btn', () => this.#checkVersion());
        this.#bindButton('#hs-panel-exit-exalt-bug-btn', () => this.#fixExaltBug());

        this.#bindButton('#hs-panel-test-notify-btn', async () => {
            p_idx = (p_idx + 1) % positions.length;
            c_idx = (c_idx + 1) % colors.length;
            await HSUI.Notify('Test notification', {
                position: positions[p_idx],
                notificationType: colors[c_idx]
            });
        });

        this.#bindButton('#hs-panel-test-notify-long-btn', async () => {
            p_idx = (p_idx + 1) % positions.length;
            c_idx = (c_idx + 1) % colors.length;
            await HSUI.Notify('This is a really very extremely long test notification which tests if the notification works with a long notification test notification ', {
                position: positions[p_idx],
                notificationType: colors[c_idx]
            });
        });
    }

    static #bindButton(selector: string, callback: () => void | Promise<void>) {
        document.querySelector(selector)?.addEventListener('click', async () => {
            await callback();
        });
    }

    // ===================================
    // ----- Tools helpers / actions -----
    // ===================================

    static #openUrl(url: string) {
        window.open(url, '_blank');
    }

    static async #checkVersion() {
        const isLatest = await HSGithub.isLatestTag();
        // Dev channel players only
        const liveTag = HSGithub.liveReleaseTag;
        const liveRelease = liveTag ? `\nLatest Live release: ${liveTag}.` : '';

        HSUI.Notify((isLatest
            ? 'You are using the latest version of Hypersynergism!'
            : 'You are NOT using the latest version of Hypersynergism!') + liveRelease, {
            position: 'top',
            notificationType: isLatest ? 'success' : 'warning'
        });
    }

    /**
     * An active exalt: click its icon, as in the Exalts tab (the game exits it or asks to confirm).
     * The bug: the game's "inside an exalt" flag stays on with no exalt enabled (the exalt timer stays shown);
     * clear it as the game does when leaving an exalt. Loading a save rebuilds the flag too.
     */
    static #fixExaltBug() {
        const img = HSUtils.getActiveExaltElement();
        if (img) {
            HSLogger.log(`Fix Exalt Bug: clicked the active exalt (${img.id})`, this.#context);
            img.click();
            return;
        }

        const exposedPlayer = HSGlobal.exposedPlayer;
        if (!exposedPlayer) {
            HSLogger.warn('Fix Exalt Bug: refused, it needs the Tampermonkey loader', this.#context);
            void HSUI.Notify('Fix Exalt Bug needs the Tampermonkey loader.', {
                position: 'top',
                notificationType: 'warning'
            });
            return;
        }

        if (!exposedPlayer.insideSingularityChallenge) {
            HSLogger.log('Fix Exalt Bug: no exalt bug, not in an exalt', this.#context);
            void HSUI.Notify('No exalt bug: you are not in an exalt.', {
                position: 'top',
                notificationType: 'default'
            });
            return;
        }

        exposedPlayer.insideSingularityChallenge = false;
        HSLogger.log('Fix Exalt Bug: "inside an exalt" flag cleared, no exalt was active', this.#context);
        void HSUI.Notify('Exalt bug fixed: the game no longer thinks you are in an exalt.', {
            position: 'top',
            notificationType: 'success'
        });
    }

    static #dumpGameData() {
        const dataModule = HSModuleRegistry.getModule('HSGameDataAPI');
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
}
