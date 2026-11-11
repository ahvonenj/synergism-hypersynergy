import { CUBE_VIEW, MAIN_VIEW } from "../../../types/module-types/hs-gamestate-types";
import { HSElementHooker } from "../../hs-core/hs-elementhooker";

import { HSGlobal } from "../../hs-core/hs-global";
import { HSLogger } from "../../hs-core/hs-logger";
import { HSModule } from "../../hs-core/module/hs-module";
import { HSModuleRegistry } from "../../hs-core/module/hs-module-registry";
import { HSSetting } from "../../hs-core/settings/hs-setting";
import { HSSettings } from "../../hs-core/settings/hs-settings";
import { HSUI } from "../../hs-core/hs-ui";
import { HSUtils } from "../../hs-utils/hs-utils";
import { HSNumberParser } from "../../hs-utils/hs-number-parser";
import { HSModuleOptions } from "../../../types/hs-types";

import type { HepteractKeys } from "../../../types/data-types/hs-player-savedata";
import { HSGameDialogs } from "../../hs-core/dialogs/hs-game-dialogs";
import { HEPTERACT_DATA, HepteractState, readHepteract } from "./hs-hepteract-state";
import { formatDuration, HSAscensionIncome } from "./hs-ascension-income";
import { HSHepteractRatios } from "./hs-hepteract-ratios";
import { HSPlatonicUpgradeTime } from "./hs-platonic-upgrade-time";

type HepteractQuickExpandEstimate = {
    cost: number;
    amountToCraft: number;
    expandsCapacity: boolean;
    currentBalance: number;
    currentCapacity: number;
};

/**
 * Class: HSHepteracts
 * IsExplicitHSModule: Yes
 * Description:
 *     Hypersynergism module which implements the following QoL functionalities:
 *         - "Quick expand and max" functionality when the user clicks one of the hepteract icons
 *         - "Quick expand and max" hepteract cost protection,
 *           which won't let the user quick expand a hepteract if it would cost too much
 *         - The quick expand's cost and time until affordable, shown while a hepteract icon is hovered
 *     and creates the helpers for:
 *         - In-game hepteract ratio display (HSHepteractRatios)
 *         - Time until a Platonic upgrade's next level (HSPlatonicUpgradeTime)
 *     Both time estimates read the ascension income through one shared HSAscensionIncome.
 * Author: Swiffy, XxMolkxX, Shewchou
*/
export class HSHepteracts extends HSModule {
    #heptGrid?: Element;
    #hepteractCraftTexts?: HTMLDivElement;

    // The forge's element ids ('chronosHepteract', ...)
    #hepteracts = Object.keys(HEPTERACT_DATA).map(key => `${key}Hepteract`);

    // Read from the forge's description when a hepteract is hovered; the Quark hepteract's is fixed
    #hepteractCosts: { [key: string]: number | null } = Object.fromEntries(
        this.#hepteracts.map(id => [id, id === 'quarkHepteract' ? 100 : null])
    );

    #ascensionIncome: HSAscensionIncome;
    #ratios: HSHepteractRatios;
    #platonicUpgradeTime: HSPlatonicUpgradeTime;

    #hoveredHepteractId: string | null = null;
    #craftTextRefreshTimer?: ReturnType<typeof setInterval>;

    #ownedHepteracts?: number;

    // Quick expand is expected to be spam clicked
    // We need to make sure that hepteract expansion + max goes through
    // and owned hepteracts value is updated before quick expand can be done again
    // Otherwise the hepteract quick expand cost protection might not trigger right
    #expandPending = false;
    #forgeDataVisitActive = false;
    #forgeDataVisitId = 0;
    #forgeCapacityRefreshPromise?: Promise<void>;
    #hasDoubleHepteractCapacity?: boolean;

    constructor(moduleOptions: HSModuleOptions) {
        super(moduleOptions);

        this.#ascensionIncome = new HSAscensionIncome(this.context);
        this.#ratios = new HSHepteractRatios(this.context);
        this.#platonicUpgradeTime = new HSPlatonicUpgradeTime(this.context, this.#ascensionIncome);
    }

    /**
     * Reads the cost of one hepteract from the forge's description, which the game fills for the hovered hepteract.
     * The sentence is translated: its first number is the Hepteract cost in every language ({{x}} of "oneCost").
     */
    #readHepteractCost(hepteractId: string): void {
        if (!(hepteractId in this.#hepteractCosts)) return;

        const cost = HSNumberParser.parse(document.querySelector<HTMLElement>('#hepteractCostText')?.innerText);
        if (!Number.isNaN(cost)) this.#hepteractCosts[hepteractId] = cost;
    }

    /**
     * A hepteract's exact balance and capacities from the live player object (patched game only).
     * The game's display cuts numbers to 3 digits above 1e6, which is not enough to tell whether a click expands.
     */
    #readLiveHepteract(baseName: string): HepteractState | null {
        if (!(baseName in HEPTERACT_DATA)) return null;
        return readHepteract(HSGlobal.exposedPlayer, baseName as HepteractKeys);
    }

    #refreshOwnedHepteracts(): void {
        const liveAmount = HSGlobal.exposedPlayer?.wowAbyssals;
        if (typeof liveAmount === 'number' && Number.isFinite(liveAmount)) {
            this.#ownedHepteracts = liveAmount;
            return;
        }

        const quantity = document.querySelector<HTMLElement>('#hepteractQuantity');
        if (!quantity) return;

        const text = quantity.querySelector('span')?.textContent ?? quantity.textContent ?? '';
        const amount = HSNumberParser.parse(text);
        if (!Number.isNaN(amount)) this.#ownedHepteracts = amount;
    }

    /** Quarks owned: the live player, else the header's quark count, which the game updates on every tab. */
    #readOwnedQuarks(): number | undefined {
        // Number(QuarkHandler) is the quark amount; NaN on an unpatched game
        const liveQuarks = Number(HSGlobal.exposedPlayer?.worlds);
        if (Number.isFinite(liveQuarks)) return liveQuarks;

        const quarks = HSNumberParser.parse(document.querySelector<HTMLElement>('#quarkDisplay')?.textContent ?? '');
        return Number.isNaN(quarks) ? undefined : quarks;
    }

    #beginForgeDataVisit(): void {
        if (this.#forgeDataVisitActive) return;

        // The live player object already tells whether the capacity is doubled: no game data needed
        if (this.#readLiveHepteract('chronos')) return;

        this.#forgeDataVisitActive = true;
        const visitId = ++this.#forgeDataVisitId;
        this.#hasDoubleHepteractCapacity = undefined;
        this.#forgeCapacityRefreshPromise = undefined;

        const gameDataAPI = HSModuleRegistry.getModule('HSGameDataAPI');
        // Cached data is only current while the GDS engine runs (it can be paused with the setting ON)
        const isGDSRunning = HSModuleRegistry.getModule('HSGameData')?.isGDSRunning() ?? false;

        if (isGDSRunning) {
            if (gameDataAPI?.getGameData()) {
                this.#hasDoubleHepteractCapacity = Boolean(
                    gameDataAPI.getSingularityChallengeEffect('limitedAscensions', 'hepteractCap')
                );
            }
            return;
        }

        if (!gameDataAPI) {
            HSLogger.warn('Cannot refresh Hepteract capacity state: game data API is unavailable', this.context);
            return;
        }

        this.#forgeCapacityRefreshPromise = gameDataAPI.getForcedGameData()
            .then(gameData => {
                if (visitId !== this.#forgeDataVisitId || !this.#forgeDataVisitActive || !gameData) return;

                this.#hasDoubleHepteractCapacity = Boolean(
                    gameDataAPI.getSingularityChallengeEffect('limitedAscensions', 'hepteractCap')
                );
            })
            .catch(error => {
                HSLogger.warn(`Failed to refresh Hepteract capacity state: ${error}`, this.context);
            });
    }

    #endForgeDataVisit(): void {
        if (!this.#forgeDataVisitActive) return;

        this.#forgeDataVisitActive = false;
        this.#forgeDataVisitId++;
        this.#forgeCapacityRefreshPromise = undefined;
        this.#hasDoubleHepteractCapacity = undefined;
    }

    #estimateQuickExpandCost(hepteractId: string): HepteractQuickExpandEstimate | null {
        const baseName = hepteractId.replace(/Hepteract$/, '');
        const costPerHepteract = this.#hepteractCosts[hepteractId];
        if (costPerHepteract === null || costPerHepteract === undefined
            || !Number.isFinite(costPerHepteract) || costPerHepteract < 0) {
            return null;
        }

        // A locked hepteract's meter has no "balance / capacity": no estimate for it
        const meterText = document.getElementById(`${baseName}ProgressBarText`)?.innerText ?? '';
        const [balanceText, capacityText] = meterText.split('/');
        if (balanceText === undefined || capacityText === undefined) return null;

        let currentBalance: number;
        let currentCapacity: number;
        let baseCapacity: number;

        const live = this.#readLiveHepteract(baseName);
        if (live) {
            currentBalance = live.balance;
            currentCapacity = live.finalCapacity;
            baseCapacity = live.baseCapacity;
        } else {
            // Unpatched game (bookmarklet): the meter's text, cut to 3 digits above 1e6
            currentBalance = HSNumberParser.parse(balanceText);
            currentCapacity = HSNumberParser.parse(capacityText);
            if (!Number.isFinite(currentBalance) || !Number.isFinite(currentCapacity) || currentCapacity <= 0) {
                return null;
            }

            if (this.#hasDoubleHepteractCapacity === undefined) return null;

            baseCapacity = currentCapacity / (this.#hasDoubleHepteractCapacity ? 2 : 1);
        }

        const expandsCapacity = currentBalance >= baseCapacity;
        const balanceAfterExpand = expandsCapacity
            ? Math.max(0, currentBalance - baseCapacity)
            : currentBalance;
        const targetCapacity = expandsCapacity ? currentCapacity * 2 : currentCapacity;
        const amountToCraft = Math.max(0, targetCapacity - balanceAfterExpand);
        const cost = amountToCraft * costPerHepteract;
        if (!Number.isFinite(cost)) return null;

        return { cost, amountToCraft, expandsCapacity, currentBalance, currentCapacity };
    }

    /** Quick expand and max (a click on a hepteract's icon): Cap, then Craft Max, unless it's refused. */
    async #quickExpand(id: string, capBtn: HTMLElement, craftMaxBtn: HTMLElement): Promise<void> {
        // Not on the Quark hepteract: it also spends quarks
        if (id === 'quarkHepteract') return;

        if (this.#expandPending) {
            HSLogger.debug(() => `Quick expand cancelled, another expand was still pending`, this.context);
            return;
        }

        this.#expandPending = true;
        try {
            if (!await this.#canQuickExpand(id)) return;

            // With a dialog open, the cap's Confirm would wait behind it, and Craft Max (no Confirm
            // when the game's #toggle35 is off) would craft before the expansion
            if (!HSGameDialogs.isQueueIdle()) {
                HSLogger.info(`Quick expand cancelled: close the open game dialog first`, this.context);
                return;
            }

            // Cap: its Confirm is answered, its Alert dismissed (shown when #toggle35 is on)
            HSGameDialogs.act('hepteractQuickExpand', { confirm: 'ok', alert: 'dismiss' }, () => capBtn.click());

            // The game expands once its Confirm is answered, after an await: Craft Max must come after
            await HSUtils.wait(25);

            // Craft Max: same for its Confirm and Alerts (#toggle35 on)
            HSGameDialogs.act('hepteractQuickExpand', { confirm: 'ok', alert: 'dismiss' }, () => craftMaxBtn.click());

            await HSUtils.wait(5);

            this.#readHepteractCost(id);
            this.#refreshOwnedHepteracts();

            if (this.#hoveredHepteractId === id) {
                await this.#refreshCraftText(id, false);
            }
        } finally {
            this.#expandPending = false;
        }
    }

    /** False when no hepteract is owned, or when the cost protection is on and the cost is too high or unknown. */
    async #canQuickExpand(id: string): Promise<boolean> {
        const expandCostProtectionSetting = HSSettings.getSetting('expandCostProtection') as HSSetting<number>;
        if (expandCostProtectionSetting.isEnabled() && this.#forgeCapacityRefreshPromise) {
            await this.#forgeCapacityRefreshPromise;
            // The forge was left while waiting
            if (!this.#forgeDataVisitActive) return false;
        }

        this.#refreshOwnedHepteracts();
        const owned = this.#ownedHepteracts;
        if (owned === null || owned === undefined) {
            HSLogger.warn(`Owned hepteracts not parsed yet`, this.context);
            return false;
        }

        if (owned === 0) {
            HSLogger.info(`Owned hepteracts is 0`, this.context);
            return false;
        }

        const costEstimate = this.#estimateQuickExpandCost(id);
        if (!costEstimate && expandCostProtectionSetting.isEnabled()) {
            HSLogger.warn(`Cannot estimate quick-expand cost for ${id}; action blocked by cost protection`, this.context);
            return false;
        }

        const percentHeptOwned = costEstimate ? costEstimate.cost / owned : null;

        HSLogger.debug(() => `
            Current balance: ${HSUtils.N(costEstimate?.currentBalance ?? 0)},
            Current capacity: ${HSUtils.N(costEstimate?.currentCapacity ?? 0)},
            Estimated craft amount: ${HSUtils.N(costEstimate?.amountToCraft ?? 0)},
            Estimated cost: ${HSUtils.N(costEstimate?.cost ?? 0)},
            Percent owned: ${HSUtils.N(percentHeptOwned ?? 0)},
            Capacity expands: ${costEstimate?.expandsCapacity ?? false}`,
            this.context
        );

        if (!expandCostProtectionSetting.isEnabled() || percentHeptOwned === null) return true;

        const heptSettingValue = expandCostProtectionSetting.getCalculatedValue();
        if (Number.isFinite(heptSettingValue) && percentHeptOwned >= heptSettingValue) {
            HSLogger.info(`Hept. cost protection: Cost owned ${HSUtils.N(percentHeptOwned * 100)}% >= ${heptSettingValue * 100}%`, this.context);
            return false;
        }

        return true;
    }

    async init(): Promise<void> {
        const self = this;

        HSLogger.log("Initialising HSHepteracts module", this.context);

        const gameStateMod = HSModuleRegistry.getModule('HSGameState');

        if (gameStateMod) {
            const syncForgeDataVisit = () => {
                const isForgeActive = gameStateMod.getCurrentUIView('MAIN_VIEW').getId() === MAIN_VIEW.CUBES
                    && gameStateMod.getCurrentUIView('CUBE_VIEW').getId() === CUBE_VIEW.HEPTERACT_FORGE;

                if (isForgeActive) {
                    self.#beginForgeDataVisit();
                } else {
                    self.#endForgeDataVisit();
                }
            };

            // Owned hepteracts and quarks are read when needed (#refreshOwnedHepteracts, #readOwnedQuarks): no watch to keep
            gameStateMod.subscribeGameStateChange("MAIN_VIEW", syncForgeDataVisit);
            gameStateMod.subscribeGameStateChange("CUBE_VIEW", syncForgeDataVisit);

            syncForgeDataVisit();
        }

        this.#heptGrid = await HSElementHooker.HookElement('#heptGrid') ?? undefined;
        this.#hepteractCraftTexts = await HSElementHooker.HookElement<HTMLDivElement>('#hepteractCraftTexts') ?? undefined;
        if (!this.#heptGrid || !this.#hepteractCraftTexts) { this.isInitialized = true; return; }
        HSUI.injectStyle(`
            #hepteractCraftTexts > #hs-costText {
                min-height: 3.6em;
                line-height: 1.2;
                overflow-wrap: anywhere;
            }
        `);
        this.#getCraftTextSlot();

        this.#heptGrid.childNodes.forEach(node => {
            if (node.nodeType === 1) {
                const htmlNode = node as HTMLElement;
                const id = htmlNode.id

                if (self.#hepteracts.includes(id)) {
                    const craftMaxBtn = document.querySelector(`#${id}CraftMax`) as HTMLElement;
                    const capBtn = document.querySelector(`#${id}Cap`) as HTMLElement;
                    const heptImg = document.querySelector(`#${id}Image`) as HTMLElement;

                    // As hepteract costs are not static and we don't have direct access to them, we need to parse them from the DOM in a "just-in-time" manner...
                    htmlNode.addEventListener('mouseenter', () => {
                        if (id === 'quarkHepteract') return;

                        self.#readHepteractCost(id);
                    });

                    if (craftMaxBtn && capBtn && heptImg) {

                        // Update and render hepteract total cost when hovering over the image
                        heptImg.addEventListener('mouseenter', (evt) => {
                            const target = evt.target as HTMLImageElement;
                            const targetId = target.id;
                            const isQuarkHepteract = targetId.toLowerCase().includes('quark');
                            self.#startCraftTextRefresh(id, isQuarkHepteract);
                        });

                        heptImg.addEventListener('mouseleave', () => {
                            if (self.#hoveredHepteractId === id) {
                                self.#stopCraftTextRefresh();
                            }
                        });

                        heptImg.addEventListener('click', () => void self.#quickExpand(id, capBtn, craftMaxBtn));
                    }
                }
            }
        });

        if (document.querySelectorAll('.heptTypeImage').length > 0) {
            HSUI.injectStyle(`
                .heptTypeImage:not(#quarkHepteractImage):not(#hepteractToQuarkImage):not(#overfluxPowderImage) {
                    transform: scale(1);
                    transform-origin: 50% 50%;
                }

                .heptTypeImage:not(#quarkHepteractImage):not(#hepteractToQuarkImage):not(#overfluxPowderImage):hover {
                    transform: scale(1.05);
                    cursor: pointer;
                }

                .heptTypeImage:not(#quarkHepteractImage):not(#hepteractToQuarkImage):not(#overfluxPowderImage):active {
                    transform: scale(0.98);
                }
            `);
        }

        HSLogger.log("Hepteract images now serve as 'quick expand and max' buttons", this.context);

        this.#ratios.init(this.#heptGrid);
        await this.#platonicUpgradeTime.init();

        this.isInitialized = true;
    }

    #getCraftTextSlot(): HTMLDivElement | null {
        if (!this.#hepteractCraftTexts) return null;

        let costText = this.#hepteractCraftTexts.querySelector<HTMLDivElement>('#hs-costText');
        if (!costText) {
            costText = document.createElement('div');
            costText.id = 'hs-costText';
            costText.style.whiteSpace = 'pre-line';
            // Keep the mod details visible above the game's longer hover description.
            this.#hepteractCraftTexts.prepend(costText);
        }
        return costText;
    }

    #removeCraftText() {
        const costText = this.#getCraftTextSlot();
        if (costText) costText.textContent = '';
    }

    #startCraftTextRefresh(hepteractId: string, isQuarkHepteract: boolean) {
        this.#stopCraftTextRefresh();
        this.#hoveredHepteractId = hepteractId;

        let refreshPending = false;
        const refresh = async () => {
            if (refreshPending || this.#hoveredHepteractId !== hepteractId) return;

            refreshPending = true;
            try {
                await this.#refreshCraftText(hepteractId, isQuarkHepteract);
            } finally {
                refreshPending = false;
            }
        };

        void refresh();
        this.#craftTextRefreshTimer = setInterval(() => void refresh(), 1000);
    }

    #stopCraftTextRefresh() {
        this.#hoveredHepteractId = null;
        if (this.#craftTextRefreshTimer !== undefined) {
            clearInterval(this.#craftTextRefreshTimer);
            this.#craftTextRefreshTimer = undefined;
        }
        this.#removeCraftText();
    }

    async #refreshCraftText(hepteractId: string, isQuarkHepteract: boolean) {
        this.#refreshOwnedHepteracts();
        if (this.#hoveredHepteractId !== hepteractId
            || this.#ownedHepteracts === null
            || this.#ownedHepteracts === undefined) {
            return;
        }

        const estimate = this.#estimateQuickExpandCost(hepteractId);
        if (!estimate) return;

        await this.#updateCraftText(estimate, hepteractId, isQuarkHepteract);
    }

    async #updateCraftText(estimate: HepteractQuickExpandEstimate, hepteractId: string, isQuarkHepteract: boolean = false) {
        if (this.#hoveredHepteractId !== hepteractId) return;

        const { cost: buyCost, expandsCapacity } = estimate;

        if (this.#hepteractCraftTexts) {
            const resource = isQuarkHepteract ? 'QUARK' : 'HEPT';
            let etaText = '';

            if (!isQuarkHepteract) {
                const income = await this.#ascensionIncome.readHepteractIncome();

                if (this.#hoveredHepteractId !== hepteractId) return;

                if (income !== null) {
                    this.#refreshOwnedHepteracts();
                    const remainingCost = Math.max(0, buyCost - (this.#ownedHepteracts ?? 0) - income.onAscension);
                    const secondsUntilAffordable = income.perSecond > 0
                        ? remainingCost / income.perSecond
                        : Number.POSITIVE_INFINITY;
                    const totalSeconds = income.perSecond > 0
                        ? buyCost / income.perSecond
                        : Number.POSITIVE_INFINITY;

                    etaText = `\nTime until affordable: ${formatDuration(secondsUntilAffordable)} (total time: ${formatDuration(totalSeconds)})`;
                }
            }

            if (this.#hoveredHepteractId !== hepteractId) return;

            this.#refreshOwnedHepteracts();
            const owned = isQuarkHepteract ? this.#readOwnedQuarks() : this.#ownedHepteracts;
            const percentOwned = owned && owned > 0 ? buyCost / owned : '∞';
            const persOwn = typeof percentOwned === 'number' ? HSUtils.N(percentOwned * 100) : percentOwned;

            const action = expandsCapacity ? 'max after next expand' : 'fill current capacity';
            const text = `[${this.context}]: Total ${resource} cost to ${action}: ${HSUtils.N(buyCost)} (${persOwn}% of owned)${etaText}`;
            const costText = this.#getCraftTextSlot();
            if (costText) costText.textContent = text;

        }
    }
}
