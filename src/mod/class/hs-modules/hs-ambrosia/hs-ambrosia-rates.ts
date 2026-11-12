
import type { HSGameDataAPI } from "../../hs-core/gds/hs-gamedata-api";
import { HSGlobal } from "../../hs-core/hs-global";
import { HSLogger } from "../../hs-core/hs-logger";
import { HSModuleRegistry } from "../../hs-core/module/hs-module-registry";
import { HSHeaderModules } from "../../hs-core/header/hs-header-modules";
import { HSUtils } from "../../hs-utils/hs-utils";

import { HSAmbrosiaHelper } from "./hs-ambrosia-helper";
import type { HSAmbrosiaGameDataLink } from "./hs-ambrosia-parts";

type HSAmbrosiaRateResource = 'amb' | 'ramb' | 'phoney';

/** One hourly rate as a module of the game's header, built like the game's currency modules. */
interface HSAmbrosiaRateHeaderModule {
    id: string;
    resource: HSAmbrosiaRateResource;
    icon: string;
    color: string;
    title: string;
    // The Exalt whose completion unlocks the game's module of that currency
    exalt: 'noSingularityUpgrades' | 'noAmbrosiaUpgrades' | 'taxmanLastStand';
}

/**
 * Class: HSAmbrosiaRates
 * IsExplicitHSModule: No
 * Description:
 *     Created by HSAmbrosia. The hourly ambrosia, red ambrosia and purple honey rates expected for the active loadout:
 *     under the Ambrosia tab's bars while the tab is open, and as three modules of the game's header (with the
 *     patcher's header modules patch). Computed from GDS's data; the tab forces a read when GDS delivers none.
 * Author: Shewchou
 */
export class HSAmbrosiaRates {
    #context: string;
    #isTabActive: () => boolean;
    #gameData: HSAmbrosiaGameDataLink;

    #blueIncomeElement?: HTMLParagraphElement;
    #redIncomeElement?: HTMLParagraphElement;
    #purpleIncomeElement?: HTMLParagraphElement;
    #barIncomeRefreshQueue: Promise<void> = Promise.resolve();
    #barIncomeRefreshTimer?: ReturnType<typeof setTimeout>;
    #lastBarIncomeDataRefresh = 0;

    // The hourly rates as modules of the game's header (see HSHeaderModules)
    static readonly #RATE_HEADER_MODULES: readonly HSAmbrosiaRateHeaderModule[] = [
        {
            id: 'hsAmbrosiaRate', resource: 'amb', icon: 'Pictures/Default/Ambrosia.png',
            color: 'var(--amber-text-color)', title: 'Ambrosia', exalt: 'noSingularityUpgrades'
        },
        {
            id: 'hsRedAmbrosiaRate', resource: 'ramb', icon: 'Pictures/RedAmbrosia/RedAmbrosia.png',
            color: 'var(--red-text-color)', title: 'Red ambrosia', exalt: 'noAmbrosiaUpgrades'
        },
        {
            id: 'hsPurpleHoneyRate', resource: 'phoney', icon: 'Pictures/PurpleAmbrosia/Purple Upgrades/PurpleHoney.png',
            color: 'var(--purple-text-color)', title: 'Purple honey', exalt: 'taxmanLastStand'
        },
    ];
    // Outside the Ambrosia tab, which refreshes them with its own rates every 500ms
    static readonly #RATE_HEADER_REFRESH_MS = 5_000;
    #rateHeaderEnabled = false;
    #rateHeaderDisplays: Partial<Record<HSAmbrosiaRateResource, HTMLDivElement>> = {};
    #lastRateHeaderRefresh = 0;

    constructor(context: string, isTabActive: () => boolean, gameData: HSAmbrosiaGameDataLink) {
        this.#context = context;
        this.#isTabActive = isTabActive;
        this.#gameData = gameData;
    }

    // ==============================================
    // ------- Hourly rates in the game's header -------
    // ==============================================

    /**
     * Show the hourly rates as three modules of the game's header, which the player places in the header's edit mode
     * (they start in the tray). Nothing without the patcher's header modules patch: the rates stay in the Ambrosia tab.
     */
    enableHeader(): void {
        for (const module of HSAmbrosiaRates.#RATE_HEADER_MODULES) {
            const element = HSHeaderModules.register(module.id, () => this.#isRateUnlocked(module));
            if (!element) {
                HSLogger.debug(() => 'No header modules patch: the ambrosia rates stay in the Ambrosia tab', this.#context);
                return;
            }
            // One element per id for the page's life: built once
            this.#rateHeaderDisplays[module.resource] ??= this.#buildRateHeaderModule(element, module);
        }
        this.#rateHeaderEnabled = true;
        this.#gameData.subscribe();
        this.#refreshRateHeader();
    }

    /** Take the hourly rates out of the header (their places stay remembered). */
    disableHeader(): void {
        for (const module of HSAmbrosiaRates.#RATE_HEADER_MODULES) HSHeaderModules.unregister(module.id);
        this.#rateHeaderEnabled = false;
        this.#gameData.unsubscribe();
    }

    isHeaderEnabled(): boolean {
        return this.#rateHeaderEnabled;
    }

    /** Locked as the game's module of the same currency. */
    #isRateUnlocked(module: HSAmbrosiaRateHeaderModule): boolean {
        if (module.exalt === 'noSingularityUpgrades') return HSAmbrosiaHelper.isAmbrosiaUnlocked();
        const completions = HSGlobal.exposedPlayer?.singularityChallenges?.[module.exalt]?.completions;
        return typeof completions === 'number' && completions > 0;
    }

    /** The game's currency module: its icon, then the rate. @returns the rate's element */
    #buildRateHeaderModule(element: HTMLElement, module: HSAmbrosiaRateHeaderModule): HTMLDivElement {
        element.classList.add('currencyContainer');
        element.title = `${module.title} per hour, expected for the active loadout (HyperSynergism)`;

        const icon = document.createElement('img');
        icon.className = 'img';
        icon.src = module.icon;
        icon.alt = module.title;

        const display = document.createElement('div');
        display.className = 'statDisplay';
        display.style.color = module.color;
        display.textContent = '—';

        element.replaceChildren(icon, display);
        return display;
    }

    /** Whether one of the rates can be seen: placed and unlocked, or in the tray while the player edits the header. */
    #isRateHeaderShown(): boolean {
        return Object.values(this.#rateHeaderDisplays).some(display => {
            const element = display?.parentElement;
            return !!element?.isConnected && (element.checkVisibility?.() ?? true);
        });
    }

    /** With GDS running, outside the Ambrosia tab (which refreshes them): from the last save data, every 5s at most. */
    #refreshRateHeaderOnGameData(): void {
        if (!this.#rateHeaderEnabled || this.#isTabActive()) return;
        if (performance.now() - this.#lastRateHeaderRefresh < HSAmbrosiaRates.#RATE_HEADER_REFRESH_MS) return;
        if (!this.#isRateHeaderShown()) return;

        this.#refreshRateHeader();
    }

    /** From GDS's last save data: never forces a save. */
    #refreshRateHeader(): void {
        try {
            const gameDataAPI = HSModuleRegistry.getModule('HSGameDataAPI');
            const rates = this.#calculateHourlyRates(gameDataAPI);
            // No save data yet (at load): the next one gives the first value, not 5s later
            if (rates) this.#lastRateHeaderRefresh = performance.now();
            this.#renderRateHeader(rates);
        } catch (error) {
            this.#lastRateHeaderRefresh = performance.now();
            HSLogger.warnOnce(`Could not calculate the ambrosia rates of the header: ${error}`, this.#context, 'hs-ambrosia-rate-header');
            this.#renderRateHeader(null);
        }
    }

    /** @param rates null: shown as unknown */
    #renderRateHeader(rates: Record<HSAmbrosiaRateResource, number> | null): void {
        if (!this.#rateHeaderEnabled) return;

        for (const [resource, display] of Object.entries(this.#rateHeaderDisplays) as [HSAmbrosiaRateResource, HTMLDivElement][]) {
            const rate = rates?.[resource];
            const known = rate !== undefined && Number.isFinite(rate);
            const value = known ? HSUtils.N(rate) : '—';
            if (display.dataset.hsRate === value) continue;
            display.dataset.hsRate = value;

            if (!known) {
                display.textContent = value;
                continue;
            }

            // The unit in white, the number in the currency's color
            const unit = document.createElement('span');
            unit.style.color = 'white';
            unit.textContent = '\u00a0/h';
            display.replaceChildren(value, unit);
        }
    }

    // ==============================================
    // ----- Hourly rates in the Ambrosia tab -------
    // ==============================================

    /** The Ambrosia tab was opened: its rates are drawn now, forcing a save when GDS isn't running. */
    onTabEnter(): void {
        this.#ensureBarIncomeElements();
        void this.refreshTab(!this.#isGDSRunning());
    }

    onTabLeave(): void {
        this.#clearScheduledBarIncomeRefresh();
    }

    /** New save data from GDS: the tab's rates (every 500ms) and the header's (every 5s outside the tab). */
    onGameData(): void {
        this.#refreshBarIncomeOnGameData();
        this.#refreshRateHeaderOnGameData();
    }

    #ensureBarIncomeElements(): void {
        const ensureElement = (sectionId: string, elementId: string): HTMLParagraphElement | undefined => {
            const section = document.getElementById(sectionId);
            if (!section) return undefined;

            let element = section.querySelector<HTMLParagraphElement>(`#${elementId}`);
            if (!element) {
                element = document.createElement('p');
                element.id = elementId;
                element.className = 'ambrosiaResourceModifiers';
                element.title = 'Sustained expected rate for the active Ambrosia loadout.';
                element.setAttribute('aria-live', 'polite');
                section.appendChild(element);
            }
            return element;
        };

        this.#blueIncomeElement = ensureElement('ambrosiaDisplay', 'hs-ambrosia-expected-hourly');
        this.#redIncomeElement = ensureElement('redAmbrosiaDisplay', 'hs-red-ambrosia-expected-hourly');
        this.#purpleIncomeElement = ensureElement('purpleAmbrosiaDisplay', 'hs-purple-ambrosia-expected-hourly');
    }

    // Cached game data is only current while the GDS engine runs (it can be paused with the setting ON)
    #isGDSRunning(): boolean {
        return HSModuleRegistry.getModule('HSGameData')?.isGDSRunning() ?? false;
    }

    /** Draws the tab's rates (and the header's), after the refreshes already queued. @param forceRefresh forces a save */
    refreshTab(forceRefresh: boolean): Promise<void> {
        const refresh = async () => {
            if (!this.#isTabActive()) return;

            this.#ensureBarIncomeElements();
            const gameDataAPI = HSModuleRegistry.getModule('HSGameDataAPI');
            if (!gameDataAPI) {
                this.#setBarIncomeUnavailable();
                return;
            }

            try {
                const gameData = forceRefresh
                    ? await gameDataAPI.getForcedGameData()
                    : gameDataAPI.getGameData();
                if (!this.#isTabActive()) return;
                if (!gameData) {
                    this.#setBarIncomeUnavailable();
                    return;
                }

                const rates = this.#calculateHourlyRates(gameDataAPI);
                if (!rates) {
                    this.#setBarIncomeUnavailable();
                    return;
                }

                const format = (rate: number) => Number.isFinite(rate) ? HSUtils.N(rate) : 'unavailable';
                this.#renderIncomeRate(this.#blueIncomeElement, format(rates.amb), 'amb', 'var(--amber-text-color)');
                this.#renderIncomeRate(this.#redIncomeElement, format(rates.ramb), 'ramb', 'red');
                this.#renderIncomeRate(this.#purpleIncomeElement, format(rates.phoney), 'phoney', 'var(--purple-text-color)');
                // The header's rates follow the tab's, at no extra cost
                this.#renderRateHeader(rates);
            } catch (error) {
                HSLogger.warn(`Could not calculate expected Ambrosia income: ${error}`, this.#context);
                this.#setBarIncomeUnavailable();
            }
        };

        // Every refresh restarts the timer, so it only fires when GDS delivers nothing
        // (setting off, or paused): with GDS running, #refreshBarIncomeOnGameData refreshes every 500ms.
        const queuedRefresh = this.#barIncomeRefreshQueue.then(refresh, refresh)
            .finally(() => this.#scheduleBarIncomeRefresh());
        this.#barIncomeRefreshQueue = queuedRefresh.catch((error) => {
            HSLogger.warn(`Ambrosia income refresh failed: ${error}`, this.#context);
        });
        return queuedRefresh;
    }

    /**
     * With GDS running, new save data comes about every 500ms (gdsSpeedMs): refresh the rates from each, with a
     * margin (400ms) so that a save arriving a little early isn't skipped.
     */
    #refreshBarIncomeOnGameData(): void {
        if (!this.#isTabActive()) return;

        const now = performance.now();
        if (now - this.#lastBarIncomeDataRefresh < 400) return;
        this.#lastBarIncomeDataRefresh = now;

        void this.refreshTab(false);
    }

    #setBarIncomeUnavailable(): void {
        this.#renderIncomeRate(this.#blueIncomeElement, 'unavailable', 'amb', 'var(--amber-text-color)');
        this.#renderIncomeRate(this.#redIncomeElement, 'unavailable', 'ramb', 'red');
        this.#renderIncomeRate(this.#purpleIncomeElement, 'unavailable', 'phoney', 'var(--purple-text-color)');
        this.#renderRateHeader(null);
    }

    /** The three rates per hour for the active loadout, from GDS's last save data; null when there's none. */
    #calculateHourlyRates(gameDataAPI: HSGameDataAPI | undefined): Record<HSAmbrosiaRateResource, number> | null {
        const income = gameDataAPI?.ambrosia.calculateAmbrosiaBarIncome();
        if (!income) return null;
        return {
            amb: income.blueAmbrosiaPerSecond * 3_600,
            ramb: income.redAmbrosiaPerSecond * 3_600,
            phoney: income.purpleHoneyPerSecond * 3_600,
        };
    }

    #renderIncomeRate(
        element: HTMLParagraphElement | undefined,
        amount: string,
        resource: HSAmbrosiaRateResource,
        color: string
    ): void {
        if (!element) return;

        // The element is aria-live: an unchanged rate must not be written again
        if (element.textContent === `${amount} ${resource} / hour [HS]`) return;

        const amountElement = document.createElement('span');
        amountElement.style.color = color;
        amountElement.textContent = amount;
        const tagElement = document.createElement('span');
        tagElement.style.color = '#777';
        tagElement.textContent = '[HS]';
        element.replaceChildren(
            amountElement,
            document.createTextNode(` ${resource} / hour `),
            tagElement
        );
    }

    #scheduleBarIncomeRefresh(): void {
        this.#clearScheduledBarIncomeRefresh();
        if (!this.#isTabActive()) return;

        // Without GDS each refresh forces a save: every 2s, but 10s while autosing runs (it pauses GDS, and its speed comes first).
        // With GDS running the timer is only a safety net.
        const autosingActive = HSModuleRegistry.getModule('HSAutosing')?.isAutosingActive() ?? false;
        const delay = this.#isGDSRunning() || autosingActive ? 10_000 : 2_000;

        this.#barIncomeRefreshTimer = setTimeout(() => {
            this.#barIncomeRefreshTimer = undefined;
            void this.refreshTab(!this.#isGDSRunning());
        }, delay);
    }

    #clearScheduledBarIncomeRefresh(): void {
        if (this.#barIncomeRefreshTimer !== undefined) {
            clearTimeout(this.#barIncomeRefreshTimer);
            this.#barIncomeRefreshTimer = undefined;
        }
    }
}
