import { AmbrosiaUpgradeCalculationCollection, AmbrosiaUpgradeCalculationConfig } from "../../../types/data-types/hs-gamedata-api-types";
import { AmbrosiaUpgradeData, AmbrosiaUpgrades, GameData } from "../../../types/data-types/hs-player-savedata";
import { AMBROSIA_LOADOUT_SLOT } from "./hs-ambrosia-types";
import { SINGULARITY_VIEW } from "../../../types/module-types/hs-gamestate-types";
import { HSElementHooker } from "../../hs-core/hs-elementhooker";
import { HSGameData } from "../../hs-core/gds/hs-gamedata";

import { HSGlobal } from "../../hs-core/hs-global";
import { HSLoadoutIconStore } from "../hs-loadout-icons/hs-loadout-icon-store";
import { getEffectiveHeaterIconSrc } from "../hs-heater/hs-heater-icon-store";
import { HSLogger } from "../../hs-core/hs-logger";
import { HSModule, type HSModuleOptions } from "../../hs-core/module/hs-module";
import { setAnimatedBorder } from "../../hs-core/hs-animated-border";
import { HSModuleRegistry } from "../../hs-core/module/hs-module-registry";
import { HSSettingsUI } from "../../hs-core/settings/hs-settings-ui";
import { HSUtils } from "../../hs-utils/hs-utils";
import { escapeLogText } from "../../hs-utils/hs-escape";
import { HSGameDataAPI } from "../../hs-core/gds/hs-gamedata-api";
import { HSAmbrosiaHelper } from "./hs-ambrosia-helper";
import { HSGameDialogs } from "../../hs-core/dialogs/hs-game-dialogs";
import type { HSAmbrosiaGameDataLink, HSAmbrosiaSlots } from "./hs-ambrosia-parts";
import { HSAmbrosiaMinibars } from "./hs-ambrosia-minibars";
import { HSAmbrosiaRates } from "./hs-ambrosia-rates";
import { HSAmbrosiaLevelsDisplay } from "./hs-ambrosia-levels-display";
import { HSAmbrosiaAutoLoadout } from "./hs-ambrosia-auto-loadout";
import { HSAmbrosiaQuickImport } from "./hs-ambrosia-quick-import";
import { HSAmbrosiaTemporaryTree, HSSingReducerPlan, HSSingReducerSwapOptions } from "./hs-ambrosia-temporary-tree";

// The module's one GDS subscription
interface HSGameDataSubscriber {
    gameDataSubscriptionId?: string;
    gameDataCallback: (data: GameData) => Promise<void>;
    subscribeGameDataChanges: () => void;
    unsubscribeGameDataChanges: () => void;
}

/** What the heater's "Sync icons" did (HSAmbrosia.applyHeaterSlotIconSemanticsBulk). */
export interface HeaterSlotIconApplyResult {
    setCount: number;
    clearedCount: number;
    missingCount: number;
}

/**
 * Class: HSAmbrosia
 * IsExplicitHSModule: Yes
 * Description: Hypersynergism module which manages ambrosia loadouts: the slot shown as loaded (rainbow or silver
 *     border, on the Ambrosia tab's slots and the game's Ambrosia loadouts and loadout page header modules) and the
 *     custom slot icons on the tab. It creates the helpers for:
 *         - The minibars (HSAmbrosiaMinibars)
 *         - The hourly rates, in the Ambrosia tab and the game's header (HSAmbrosiaRates)
 *         - The upgrade levels kept shown on the tree (HSAmbrosiaLevelsDisplay)
 *         - Auto-Loadout for the Add and Time codes (HSAmbrosiaAutoLoadout)
 *         - Quick Import and the heater's import (HSAmbrosiaQuickImport)
 *         - Another tree for an action's time: singularity reducers, export loadout (HSAmbrosiaTemporaryTree)
 *     and keeps their entry points, so other modules only know HSAmbrosia. The helpers reach the slots through
 *     HSAmbrosiaSlots, and save data through the module's one GDS subscription.
 * Author: Swiffy, Shewchou
 */
export class HSAmbrosia extends HSModule
    implements HSGameDataSubscriber {

    // The slots of the game's Ambrosia loadouts header module, and of its loadout page module (8 slots a page)
    static readonly #HEADER_SLOTS_IDS = ['ambrosiaLoadoutsHeaderSlots', 'ambrosiaLoadoutPageHeaderSlots'];

    gameDataSubscriptionId?: string;
    #ambrosiaViewSubscribed = false;

    #loadoutsSlots: HTMLElement[] = [];

    #loadoutContainer: HTMLElement | null = null;

    #loadoutContainerClickHandler?: (e: MouseEvent) => Promise<void>;
    #gameActiveLoadoutObserver?: MutationObserver;
    #isLoadoutClickHandlerAttached = false;
    #isAmbrosiaTabActive = false;

    activeLoadout?: AMBROSIA_LOADOUT_SLOT;
    /** Whether the game marks activeLoadout as its active slot (rainbow border) or it's our guess from the save (silver). */
    #activeLoadoutConfirmed = false;

    #cachedGameDataAPI?: HSGameDataAPI;
    #cachedGameDataMod?: HSGameData;

    #hasPerformedInitialLoadoutMatch = false;

    #minibars: HSAmbrosiaMinibars;
    #rates: HSAmbrosiaRates;
    #levels: HSAmbrosiaLevelsDisplay;
    #autoLoadout: HSAmbrosiaAutoLoadout;
    #quickImport: HSAmbrosiaQuickImport;
    #temporaryTree: HSAmbrosiaTemporaryTree;

    // ==============================================
    // -------------------- Init --------------------
    // ==============================================

    constructor(moduleOptions: HSModuleOptions) {
        super(moduleOptions);

        const slots: HSAmbrosiaSlots = {
            all: () => this.#loadoutsSlots,
            container: () => this.#loadoutContainer,
            byId: (slotId) => this.#loadoutSlotById(slotId),
            gameActive: () => this.#getGameActiveSlot(),
            remembered: () => this.#rememberedSlot(),
            shown: () => this.#shownLoadoutSlot(),
            markLoaded: (slot) => this.updateActiveLoadout(HSAmbrosiaHelper.getSlotEnumBySlotId(slot.id)),
            load: (slot, owner) => this.#reloadLoadoutSlot(slot, owner),
            treeChanged: () => this.#levels.queueRefresh(),
        };
        const isTabActive = () => this.#isAmbrosiaTabActive;
        const gameData: HSAmbrosiaGameDataLink = {
            subscribe: () => this.subscribeGameDataChanges(),
            unsubscribe: () => this.unsubscribeGameDataChanges(),
        };

        this.#minibars = new HSAmbrosiaMinibars(this.context, gameData);
        this.#rates = new HSAmbrosiaRates(this.context, isTabActive, gameData);
        this.#levels = new HSAmbrosiaLevelsDisplay(this.context, slots, isTabActive);
        this.#autoLoadout = new HSAmbrosiaAutoLoadout(this.context, slots);
        this.#quickImport = new HSAmbrosiaQuickImport(this.context, slots);
        this.#temporaryTree = new HSAmbrosiaTemporaryTree(slots);

        // An icon picked on the game's header also shows on the Ambrosia tab
        HSLoadoutIconStore.ambrosia.onChange(() => this.#refreshTabSlotIcons());
    }

    async init() {
        HSLogger.log(`Initializing HSAmbrosia module`, this.context);

        await this.#cacheDomRefs();
        await HSAmbrosiaHelper.cacheBlueberryToggleModeButton();

        this.#attachLoadoutClickHandler();

        await this.#levels.init();
        await this.#autoLoadout.init();

        this.#refreshTabSlotIcons();
        this.#observeHeaderLoadoutSlots();
        this.#observeGameActiveLoadout();

        this.#minibars.build();

        await this.#quickImport.init();

        this.#subscribeGameStateViewChanges();

        HSSettingsUI.refreshAmbrosiaLoadoutDropdowns();
        if (window.__HS_PATCH_REPORT?.manualAscension) {
            window.__HS_runManualAscension = (reset) => this.#runManualAscension(reset);
        } else {
            this.#autoLoadout.installAscensionButtonFallback();
        }
        this.isInitialized = true;
    }

    async #cacheDomRefs() {
        const [loadoutsSlots, loadoutContainer] = await Promise.all([
            HSElementHooker.HookElements('.blueberryLoadoutSlot'),
            HSElementHooker.HookElement('#bbLoadoutContainer'),
        ]);

        this.#loadoutsSlots = loadoutsSlots;
        this.#loadoutContainer = loadoutContainer;
    }

    public async initializeActiveLoadoutFromGameData(): Promise<void> {
        const gameDataAPI = HSModuleRegistry.getModule('HSGameDataAPI');
        if (!gameDataAPI) return;
        let gameData = gameDataAPI.getGameData();
        if (!gameData) gameData = await gameDataAPI.getForcedGameData();
        if (!gameData) { HSLogger.warn('Could not retrieve game data to perform the initial ambrosia loadout match', this.context); return; }

        await this.#performInitialActiveLoadoutMatchOnce(gameData);
    }

    // ==============================================
    // --------------- Loadout Events ---------------
    // ==============================================

    #attachLoadoutClickHandler() {
        if (!this.#loadoutContainer || this.#isLoadoutClickHandlerAttached) return;

        this.#loadoutContainerClickHandler ??= this.#onLoadoutClick.bind(this);
        const handler = this.#loadoutContainerClickHandler;
        // The handler finds the slot itself (clicks outside a slot are ignored there)
        this.#loadoutContainer.addEventListener('click', handler);
        this.#isLoadoutClickHandlerAttached = true;
    }

    async #onLoadoutClick(e: MouseEvent) {
        const slotElement = (e.target as HTMLElement).closest('.blueberryLoadoutSlot') as HTMLButtonElement | null;
        if (!slotElement) return;

        // The active loadout itself is not set here anymore: #observeGameActiveLoadout follows the game's marker,
        // which only moves when the load (or save) actually succeeded.

        // Programmatic slot clicks (Add/Time codes, heater...) don't move the mouse,
        // so the hover handlers won't refresh the persistent levels: do it here.
        this.#levels.queueRefresh();

        // Only a successful load changes the active modules. The game's own
        // slot handler has already run (this listener is on the container,
        // bubble phase), so the active class reflects the result of this click.
        if (this.#isAmbrosiaTabActive
            && HSAmbrosiaHelper.isLoadoutMode('loadTree')
            && slotElement.classList.contains('activeBlueberryLoadout')) {
            void this.#rates.refreshTab(true);
        }
    }

    #subscribeGameStateViewChanges() {
        const gameStateMod = HSModuleRegistry.getModule('HSGameState');
        if (!gameStateMod) { HSLogger.warn('subscribeGameStateViewChanges() - gameStateMod==undefined', this.context); return; }

        if (this.#ambrosiaViewSubscribed) return;
        this.#ambrosiaViewSubscribed = true;
        gameStateMod.subscribeSubtab('SINGULARITY_VIEW', SINGULARITY_VIEW.AMBROSIA, (isActive) => {
            if (isActive) this.#onAmbrosiaTabEnter();
            else this.#onAmbrosiaTabLeave();
        });
    }

    async #onAmbrosiaTabEnter() {
        if (this.#isAmbrosiaTabActive) return;
        this.#isAmbrosiaTabActive = true;

        this.#attachLoadoutClickHandler();
        await this.#levels.onTabEnter();
        this.subscribeGameDataChanges();
        this.#rates.onTabEnter();
    }

    #onAmbrosiaTabLeave() {
        if (!this.#isAmbrosiaTabActive) return;
        this.#isAmbrosiaTabActive = false;
        this.#rates.onTabLeave();
        this.unsubscribeGameDataChanges();

        // The loadout click handler stays attached even when the Ambrosia tab is hidden:
        // the mod's slot clicks (Auto-Loadout, imports, heater) refresh the persistent levels through it.
        this.#levels.onTabLeave();
    }

    // ==============================================
    // ----------- Loadout slots and icons ----------
    // ==============================================

    /** The Ambrosia tab's loadout bar (#bbLoadoutContainer): its 16 slots, then the mode and quick save buttons. */
    getLoadoutContainer(): HTMLElement | null {
        return this.#loadoutContainer;
    }

    /** The Ambrosia tab's slot button, by its id (blueberryLoadoutN). */
    #loadoutSlotById(slotId: string | undefined): HTMLButtonElement | undefined {
        if (!slotId) return undefined;
        return this.#loadoutsSlots.find(slot => slot.id === slotId) as HTMLButtonElement | undefined;
    }

    /** Loads a slot of the Ambrosia tab, by its id (the heater results' slot row). Its success Alert is dismissed. */
    loadLoadoutSlot(slotId: string, owner: string): void {
        const slot = this.#loadoutSlotById(slotId);
        if (!slot) { HSLogger.warn(`No ambrosia loadout slot ${slotId}`, this.context); return; }
        this.#reloadLoadoutSlot(slot, owner);
    }

    /** Loads a slot (e.g. so the live tree matches what was just written into it). Its success Alert is dismissed. */
    #reloadLoadoutSlot(slot: HTMLButtonElement, owner: string) {
        HSAmbrosiaHelper.ensureLoadoutMode('loadTree');
        HSGameDialogs.act(owner, { alert: 'dismiss' }, () => slot.click());
        this.#levels.queueRefresh();
    }

    /** The custom slot icons (HSLoadoutIconStore, also painted on the game's header) on the Ambrosia tab's slots. */
    #refreshTabSlotIcons(): void {
        for (const slot of this.#loadoutsSlots) {
            const url = HSLoadoutIconStore.ambrosia.get(slot.id);
            slot.classList.toggle('hs-ambrosia-slot', !!url);
            slot.style.backgroundImage = url ? HSUtils.cssUrl(url) : '';
        }
    }

    /** The heater's "Sync icons": a heater icon id (or none) per slot id. The store's listeners repaint the slots. */
    applyHeaterSlotIconSemanticsBulk(iconSemanticBySlotId: Record<string, string | null | undefined>): HeaterSlotIconApplyResult {
        const iconBySlotId: Record<string, string | null> = {};
        let setCount = 0;
        let clearedCount = 0;
        let missingCount = 0;

        for (const [slotId, semanticId] of Object.entries(iconSemanticBySlotId)) {
            if (!slotId) continue;

            const normalizedSemanticId = typeof semanticId === "string" ? semanticId.trim() : "";
            if (!normalizedSemanticId || normalizedSemanticId === "none") {
                iconBySlotId[slotId] = null;
                clearedCount++;
                continue;
            }

            const resolvedUrl = getEffectiveHeaterIconSrc(normalizedSemanticId);
            if (resolvedUrl) {
                iconBySlotId[slotId] = resolvedUrl;
                setCount++;
            } else {
                iconBySlotId[slotId] = null;
                clearedCount++;
                missingCount++;
                HSLogger.warn(`Unknown heater icon semantic ID: ${normalizedSemanticId}`, this.context);
            }
        }

        HSLoadoutIconStore.ambrosia.applyBulk(iconBySlotId);
        return { setCount, clearedCount, missingCount };
    }

    // ==============================================
    // ------------ Active Loadout State ------------
    // ==============================================

    /** The real loadout slot the game marks as active (last successfully loaded or saved), if any. */
    #getGameActiveSlot(): HTMLButtonElement | undefined {
        return this.#loadoutsSlots.find(slot => slot.classList.contains('activeBlueberryLoadout')) as HTMLButtonElement | undefined;
    }

    /** The slot the mod remembers as loaded (activeLoadout), locked or not. */
    #rememberedSlot(): HTMLButtonElement | undefined {
        return this.#loadoutsSlots.find(loadoutSlot => loadoutSlot.id === this.activeLoadout) as HTMLButtonElement | undefined;
    }

    /**
     * The slot shown as loaded (rainbow or silver border): the one the game marks, else ours. The game marks none
     * after a page load or any save load (singularities included): then it's our guess from the save at load (silver
     * border), or the slot loaded before the save load. Imports go there. Undefined when none is shown, or it's locked.
     */
    #shownLoadoutSlot(): HTMLButtonElement | undefined {
        const slot = this.#getGameActiveSlot() ?? this.#rememberedSlot();
        return slot && slot.style.display !== 'none' ? slot : undefined;
    }

    /**
     * The game is the source of truth for the active loadout: it marks a slot (activeBlueberryLoadout) only
     * after a successful load or save, on any tab. Follow it. Until it marks one (it marks none at page load),
     * the best match found from the save at load is kept.
     */
    #observeGameActiveLoadout(): void {
        this.#gameActiveLoadoutObserver?.disconnect();

        const syncFromGame = () => {
            const gameSlot = this.#getGameActiveSlot();
            if (!gameSlot) return;
            const slotEnum = HSAmbrosiaHelper.getSlotEnumBySlotId(gameSlot.id);
            // Also when it marks the slot we guessed: the guess becomes confirmed (silver -> rainbow)
            if (slotEnum && (slotEnum !== this.activeLoadout || !this.#activeLoadoutConfirmed)) this.updateActiveLoadout(slotEnum);
        };

        this.#gameActiveLoadoutObserver = new MutationObserver(syncFromGame);
        for (const slot of this.#loadoutsSlots) {
            this.#gameActiveLoadoutObserver.observe(slot, { attributes: true, attributeFilter: ['class'] });
        }
        syncFromGame();
    }

    /**
     * The game rebuilds its header modules' slots when their count changes or the page module turns a page, and builds
     * them the first time a module is shown (none while it has been in the tray since the load): the border is put
     * back on the new ones.
     */
    #observeHeaderLoadoutSlots(): void {
        for (const containerId of HSAmbrosia.#HEADER_SLOTS_IDS) {
            const container = document.getElementById(containerId);
            if (!container) {
                HSLogger.debug(() => `#${containerId} not found: the loaded slot is not marked on that header module`, this.context);
                continue;
            }
            new MutationObserver(() => this.#renderActiveLoadoutBorders()).observe(container, { childList: true });
        }
    }

    /**
     * Marks the slot shown as loaded, on the Ambrosia tab's slots and on the game's Ambrosia header modules (loadouts,
     * loadout page): rainbow once the game marks it, silver while it's only our guess from the save.
     */
    #renderActiveLoadoutBorders(): void {
        const border = this.#activeLoadoutConfirmed ? 'rainbow' : 'silver';
        for (const slot of this.#loadoutsSlots) {
            setAnimatedBorder(slot, slot.id === this.activeLoadout ? border : undefined);
        }

        for (const containerId of HSAmbrosia.#HEADER_SLOTS_IDS) {
            const headerSlots = document.getElementById(containerId)?.querySelectorAll<HTMLElement>(':scope > .headerLoadoutSlot');
            for (const slot of headerSlots ?? []) {
                setAnimatedBorder(slot, `blueberryLoadout${slot.dataset.slot}` === this.activeLoadout ? border : undefined);
            }
        }
    }

    async resetActiveLoadout() {
        this.activeLoadout = undefined;
        this.#activeLoadoutConfirmed = false;
        this.#renderActiveLoadoutBorders();
    }

    updateActiveLoadout(slotEnum?: AMBROSIA_LOADOUT_SLOT) {
        if (!slotEnum) { HSLogger.warn('No slot specified to #updateActiveLoadout', this.context); return; }

        // Normalize & validate incoming slot value using helper.
        const resolvedSlot = HSAmbrosiaHelper.resolveAmbrosiaLoadout(slotEnum);
        if (!resolvedSlot) { HSLogger.warn('Invalid or unknown slot passed to #updateActiveLoadout: ' + slotEnum, this.context); return; }

        this.activeLoadout = resolvedSlot as AMBROSIA_LOADOUT_SLOT;
        // Confirmed once the game marks this slot; until then (none marked after a page load) it's our guess from the save
        this.#activeLoadoutConfirmed = this.#getGameActiveSlot()?.id === resolvedSlot;
        this.#renderActiveLoadoutBorders();

        HSLogger.debug(() => 'Switched Ambrosia loadout to ' + resolvedSlot, this.context);
    }

    private calculateAmbUpgradeLevelFromSave(upgradeName: keyof AmbrosiaUpgrades, invested: number): number {
        const gameDataAPI = HSModuleRegistry.getModule('HSGameDataAPI');
        if (!gameDataAPI) return 0;

        const investmentParameters = ((gameDataAPI.ambrosia.ambrosiaUpgradeCalculationCollection as AmbrosiaUpgradeCalculationCollection)[upgradeName]) as AmbrosiaUpgradeCalculationConfig<any>;
        if (!investmentParameters) return 0;

        return gameDataAPI.ambrosia.investToAmbrosiaUpgrade(
            0,
            invested,
            investmentParameters.costPerLevel,
            investmentParameters.maxLevel,
            investmentParameters.costFormula
        );
    }

    public findBestMatchingAmbrosiaLoadout(saveData: GameData): { id: string | undefined; score: number } {
        const currentUpgrades = saveData.ambrosiaUpgrades;
        const savedLoadouts = saveData.blueberryLoadouts;

        if (!currentUpgrades || !savedLoadouts) {
            return { id: undefined, score: 0 };
        }

        let bestMatchId: string | undefined;
        let highestScore = 0;

        HSLogger.debug(() => `Analyzing save data... Found ${Object.keys(savedLoadouts).length} saved loadouts.`, this.context);

        for (const [loadoutId, loadoutDef] of Object.entries(savedLoadouts)) {
            if (!loadoutDef || Object.keys(loadoutDef).length === 0) continue;

            let matches = 0;
            let totalUpgrades = 0;
            const upgrades = Object.entries(loadoutDef);

            for (const [upgradeKey, savedLevel] of upgrades) {
                if (upgradeKey === 'ambrosiaTutorial' || upgradeKey === 'ambrosiaPatreon') continue;

                totalUpgrades++;

                const currentLevelData = currentUpgrades[upgradeKey as keyof AmbrosiaUpgrades] as AmbrosiaUpgradeData;
                const totalLevel = currentLevelData ? this.calculateAmbUpgradeLevelFromSave(upgradeKey as keyof AmbrosiaUpgrades, currentLevelData.ambrosiaInvested) : 0;

                if (totalLevel === savedLevel) {
                    matches++;
                }
            }

            const score = totalUpgrades > 0 ? matches / totalUpgrades : 0;

            if (score > highestScore) {
                highestScore = score;
                bestMatchId = loadoutId;
            }

            if (score === 1) {
                break;
            }
        }

        return { id: bestMatchId, score: highestScore };
    }

    /**
     * Another save replaced the game's (cloud save, Steam cloud, file: the patched game's save import, reset = false).
     * The game marks no slot, and ours is still the old save's: guessed again from the save now loaded, read from
     * the live player (the same fields as a save). Without the live player, no slot is shown.
     */
    public async matchActiveLoadoutToLoadedSave(): Promise<void> {
        const player = HSGlobal.exposedPlayer;
        if (!player) { await this.resetActiveLoadout(); return; }
        await this.performInitialActiveLoadoutMatch(player);
    }

    public async performInitialActiveLoadoutMatch(saveData: GameData): Promise<void> {
        if (!saveData) return;

        // The game's marker, when it has set one, is authoritative: no need to guess
        const gameSlot = this.#getGameActiveSlot();
        const gameSlotEnum = gameSlot ? HSAmbrosiaHelper.getSlotEnumBySlotId(gameSlot.id) : undefined;
        if (gameSlotEnum) {
            this.updateActiveLoadout(gameSlotEnum);
            return;
        }

        await this.resetActiveLoadout();
        const { id: bestMatchId, score: highestScore } = this.findBestMatchingAmbrosiaLoadout(saveData);
        const SIMILARITY_THRESHOLD = 0.8;

        if (bestMatchId && highestScore >= SIMILARITY_THRESHOLD) {
            const slotNumber = parseInt(bestMatchId, 10);
            const slotId = `blueberryLoadout${slotNumber}`;
            const slotElement = this.#loadoutsSlots.find(slot => slot.id === slotId);
            if (!slotElement) { HSLogger.warn(`Invalid loadout slot: ${slotNumber}`, this.context); return; }
            const slotEnum = HSAmbrosiaHelper.getSlotEnumBySlotId(slotId);
            if (!slotEnum) { HSLogger.warn(`No slot enum found for slot ID: ${slotId}`, this.context); return; }

            this.updateActiveLoadout(slotEnum);

            HSLogger.debug(() => `Initial load - Ambrosia loadout best match: ${bestMatchId} is ${(highestScore * 100).toFixed(1)}% compliant. `, this.context);
        } else if (bestMatchId) {
            HSLogger.debug(() => `Initial load - No compliant Ambrosia loadout found. Closest was ${bestMatchId} at ${(highestScore * 100).toFixed(1)}% (Threshold: 80%).`, this.context);
        } else {
            HSLogger.debug(() => `Initial load - No saved Ambrosia loadouts found to match.`, this.context);
        }
    }

    public getAmbrosiaLoadoutsAmount(): number {
        return this.#loadoutsSlots.filter((slot) => slot.style.display !== 'none').length;
    }

    // ==============================================
    // ------- The helpers' entry points ------------
    // ==============================================

    /** Show the minibars (HSAmbrosiaMinibars). */
    async enableBerryMinibars() {
        await this.#minibars.enable();
    }

    /** Hide the minibars, wherever they are (their place in the header stays remembered). */
    async disableBerryMinibars() {
        await this.#minibars.disable();
    }

    /** Show the hourly rates in the game's header (HSAmbrosiaRates). */
    async enableRateHeader() {
        this.#rates.enableHeader();
    }

    /** Take the hourly rates out of the header (their places stay remembered). */
    async disableRateHeader() {
        this.#rates.disableHeader();
    }

    /** Auto-Loadout for the Add and Time codes (HSAmbrosiaAutoLoadout). */
    async enableAutoLoadout() {
        await this.#autoLoadout.enable();
    }

    async disableAutoLoadout() {
        await this.#autoLoadout.disable();
    }

    /** Action of the persistentAmbrosiaLevels setting (panel switch or 📌/🔎 click): HSAmbrosiaLevelsDisplay. */
    applyPersistentAmbrosiaLevelsSetting(enabled: boolean) {
        this.#levels.applySetting(enabled);
    }

    /** The heater's import of one loadout, into the slot shown as loaded (HSAmbrosiaQuickImport). */
    importLoadoutToActiveSlot(loadout: string): Promise<{ success: boolean; skipped?: boolean; reason?: string }> {
        return this.#quickImport.importLoadoutToActiveSlot(loadout);
    }

    /** For the Hepteract Distributor: a tree holding the singularity reducers (HSAmbrosiaTemporaryTree). */
    prepareSingReducerSwap(options: HSSingReducerSwapOptions): HSSingReducerPlan {
        return this.#temporaryTree.prepareSingReducerSwap(options);
    }

    /** Runs a synchronous action with a loadout loaded, then puts the player's tree back (HSAmbrosiaTemporaryTree). */
    runWithLoadout(loadoutSetting: string, owner: string, action: () => void): string | undefined {
        return this.#temporaryTree.runWithLoadout(loadoutSetting, owner, action);
    }

    #runManualAscension(reset: () => void): void {
        const loadout = HSAmbrosiaAutoLoadout.getAscensionLoadout();
        if (!loadout) {
            reset();
            return;
        }

        let resetStarted = false;
        try {
            const note = this.#temporaryTree.runWithLoadout(loadout, 'ascensionLoadout', () => {
                resetStarted = true;
                reset();
            }, { requireRestore: true });
            if (note) HSLogger.warn(`Ascension loadout: ${escapeLogText(note)}`, this.context);
        } catch (error) {
            if (resetStarted) throw error;
            HSLogger.warn('Could not switch ascension loadout. Ascending with the current tree.', this.context);
            reset();
        }
    }


    // ==============================================
    // ----------------- Game Data ------------------
    // ==============================================

    // The Ambrosia AFK/idle swapper, retired in v2.13.8 after a game update, was removed: its last working version is in git at 522ecdab^.

    subscribeGameDataChanges() {
        const gameDataMod = HSModuleRegistry.getModule('HSGameData');
        const gameDataAPI = HSModuleRegistry.getModule('HSGameDataAPI');

        if (gameDataMod && gameDataAPI && !this.gameDataSubscriptionId) {
            this.#cachedGameDataMod = gameDataMod;
            this.#cachedGameDataAPI = gameDataAPI;
            this.gameDataSubscriptionId = gameDataMod.subscribeGameDataChange(this.gameDataCallback.bind(this));
            HSLogger.debug(() => 'Subscribed to game data changes', this.context);
        }
    }

    unsubscribeGameDataChanges() {
        const gameDataMod = this.#cachedGameDataMod ?? HSModuleRegistry.getModule('HSGameData');

        if (gameDataMod && this.gameDataSubscriptionId) {
            // Only actually unsubscribe if neither the minibars (without the live player), the header's rates nor the
            // Ambrosia tab need game data.
            if (!this.#minibars.needsGameData() && !this.#rates.isHeaderEnabled() && !this.#isAmbrosiaTabActive) {
                gameDataMod.unsubscribeGameDataChange(this.gameDataSubscriptionId);
                this.gameDataSubscriptionId = undefined;
                HSLogger.debug(() => 'Unsubscribed from game data changes', this.context);
            }
        }
    }

    async #performInitialActiveLoadoutMatchOnce(gameData: GameData): Promise<void> {
        if (this.#hasPerformedInitialLoadoutMatch) return;

        await this.performInitialActiveLoadoutMatch(gameData);
        this.#hasPerformedInitialLoadoutMatch = true;
    }

    async gameDataCallback() {
        const gameDataAPI = this.#cachedGameDataAPI || (this.#cachedGameDataAPI = HSModuleRegistry.getModule('HSGameDataAPI'));
        if (!gameDataAPI) return;

        const gameData = gameDataAPI.getGameData();
        if (!gameData) return;

        this.#levels.onGameData(gameData);
        this.#rates.onGameData();
        this.#minibars.onGameData(gameData, gameDataAPI);
    };
}
