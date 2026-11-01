import { MeData } from "../../../types/data-types/hs-me-data";
import { GameData } from "../../../types/data-types/hs-player-savedata";
import { PseudoGameData } from "../../../types/data-types/hs-pseudo-data";
import { HSUtils } from "../../hs-utils/hs-utils";
import { HSElementHooker } from "../hs-elementhooker";
import { HSGameDataAPI } from "./hs-gamedata-api";
import { HSGlobal } from "../hs-global";
import { HSLogger } from "../hs-logger";
import { HSModule } from "../module/hs-module";
import { HSModuleManager } from "../module/hs-module-manager";
import { HSSettings } from "../settings/hs-settings";
import { HSUI } from "../hs-ui";
import { HSAutosing } from "../../hs-modules/hs-autosing/hs-autosing";
import { HSAmbrosia } from "../../hs-modules/hs-ambrosia/hs-ambrosia";
import { HSHeaderKeepOnImport } from "../header/hs-header-keep-on-import";
import { HSPlatform } from "../hs-platform";
import { ConsumableGameEvents } from "../../../types/data-types/hs-event-data";
import { HSModuleOptions } from "../../../types/hs-types";

/**
 * Class: HSGameData
 * IsExplicitHSModule: Yes
 * Description: 
 *     Core module responsible for fetching, processing, and providing game data to other modules.
 *     Handles Game Data Sniffing (GDS): reads the live player when the patcher exposes it, else captures the game's
 *     saves (btoa/atob hooks). Manages pseudo/me data, and reads the game's consumables and global event.
 *     Provides APIs for other modules to access game data.
 */
export class HSGameData extends HSModule {
    // --- Game Data & State ---
    // The live player (exposedPlayer), or the last parsed save without it
    #gameData?: GameData;

    // --- MITM / Encoding / Native JS Hooks ---
    #mitm_gamedata: string | undefined;
    #last_mitm_gamedata?: string;
    #mitm_atob_data: string | undefined;
    #mitmProcessScheduled = false;
    #mitmCaptureCount = 0;
    #btoaHacked = false;
    #atobHacked = false;

    // --- Engine & Intervals ---
    #gdsEnabled = false;
    // Reasons the engine is paused (autosing) while the GDS setting may stay ON.
    // The engine only runs when no pause is left and the setting is ON.
    #enginePauses = new Set<string>();
    // Ends the "Load from file" import still waiting for its save, if any
    #abortPendingImport?: () => void;
    // Bumped by disableGDS(): a start begun under an older generation is cancelled
    #engineGeneration = 0;
    #engineStart?: { generation: number, promise: Promise<void> };
    // The source the running engine reads (#useLiveSource() at its start), undefined while it is stopped
    #engineSource?: 'live' | 'save';
    // Dev tools: read the save even when the live player is exposed. Not kept across a reload
    #forceSaveSource = false;
    #gdsCSS = `
        #savegame {
            font-size: 0;
        }
        #savegame::after {
            content: "[HS] Perma-saved by GDS";
            font-size: 12px;
            visibility: visible;
        }
        #saveinfo {
            display: none !important;
        }
    `;
    #saveInterval?: number;

    // --- DOM Elements ---
    #manualSaveButton?: HTMLButtonElement;
    #saveinfoElement?: HTMLParagraphElement;
    #importSaveButton?: HTMLLabelElement;

    // --- Event Handlers ---
    #loadFromFileEventHandler?: (e: MouseEvent) => Promise<void>;

    // --- Data APIs & Subscribers ---
    #gameDataSubscribers: Map<string, (data: GameData) => void> = new Map();
    #gameDataAPI?: HSGameDataAPI;

    // --- Player/Me Data ---
    #playerPseudoUpgrades?: PseudoGameData;
    #meBonuses?: MeData;

    // --- Game Events ---
    #gameEvents: ConsumableGameEvents = {
        HAPPY_HOUR_BELL: { amount: 0, ends: [], displayName: "Happy Hour Bell" }
    };

    // --- Miscellaneous ---
    #saveTriggerEvent: Event;

    constructor(moduleOptions: HSModuleOptions) {
        super(moduleOptions);
        this.#saveTriggerEvent = new Event('click');
    }

    /**
     * Caches DOM elements used during initialization and later operations.
     * @returns void
     */
    #cacheDomElements() {
        this.#importSaveButton = document.querySelector('#importFileButton') as HTMLLabelElement;
        this.#manualSaveButton = document.querySelector('#savegame') as HTMLButtonElement;
        this.#saveinfoElement = document.querySelector('#saveinfo') as HTMLParagraphElement;
    }

    /**
     * Initializes the HSGameData module, sets up DOM elements, fetches pseudo and me data,
     * and hooks the import button for save file interception.
     * @returns Promise<void>
     */
    async init() {
        const self = this;
        HSLogger.log(`Initializing HSGameData module`, this.context);

        this.#cacheDomElements();

        // Called by the patched game at the start of importSynergism, with its reset flag (patcher: save import hook)
        window.__HS_onSaveImport = (reset: unknown) => this.#onSaveImport(!!reset);

        // Set before the reads: the data only reaches the API through this reference.
        // PseudoCoin levels and quark bonuses come from the game (patched) or the browser's cache when they can,
        // and are fetched at most once, at load (asked by the game's dev: too much traffic on these endpoints).
        this.#gameDataAPI = HSModuleManager.getModule('HSGameDataAPI') as HSGameDataAPI;
        this.#watchPCoinLevels();
        this.#watchQuarkBonus();
        await this.#refreshFetchedData();

        this.#startConsumablesPoll();
        this.#startGlobalEventCapture();
        this.isInitialized = true;

        // "Load from file" matches the ambrosia loadout from the save the game decodes, whatever the GDS state
        this.#hackJSNativeAtob();

        // Always hook the import button regardless of GDS setting
        // We do this asynchronously to not block init if the element takes time to appear
        (async () => {
            if (!this.#importSaveButton) {
                // Try to hook with a short timeout, but keep trying via the HookElement internal retry if properly configured
                // Or just await it here since we are in a detached async block
                const btn = await HSElementHooker.HookElement('#importFileButton');
                if (btn) this.#importSaveButton = btn as HTMLLabelElement;
            }

            if (this.#importSaveButton && !this.#loadFromFileEventHandler) {
                this.#loadFromFileEventHandler = async (e: MouseEvent) => { self.#loadFromFileHandler(e); }
                this.#importSaveButton.addEventListener('click', this.#loadFromFileEventHandler, { capture: true });
                HSLogger.log("Save file import interceptor registered", this.context);
            }
            if (this.#importSaveButton) HSHeaderKeepOnImport.install(this.#importSaveButton);
        })();
    }

    /**
     * The game is about to load a save, whatever the source (patched game only).
     * A singularity, entering or leaving an Exalt and the game reset load one too, with reset = true:
     * nothing to do for them, and autosing goes through here at every singularity, so that path stays one test.
     * The other loads replace the save: autosing can't go on. A cloud save and the Steam cloud are only seen here;
     * "Load from file" has already stopped autosing at its button's click.
     * The ambrosia slot the quickbar shows is guessed again from the new save: with reset = false, importSynergism
     * loads the save synchronously, so it is in place one task later (or the import was refused, nothing changed).
     * "Keep my header layout" notes the current header layouts for that load.
     */
    #onSaveImport(reset: boolean): void {
        if (reset) return;

        HSHeaderKeepOnImport.onSaveImport();

        setTimeout(() => {
            void HSModuleManager.getModule<HSAmbrosia>('HSAmbrosia')?.matchActiveLoadoutToLoadedSave()
                .catch(e => HSLogger.warn(`Ambrosia loadout match after a save load failed: ${e}`, this.context));
        }, 0);

        const autosing = HSModuleManager.getModule<HSAutosing>('HSAutosing');
        if (!autosing?.isAutosingActive()) return;

        autosing.stopAutosing({ saveReplaced: true });
        // After the stop: autosing mutes the log while it runs
        HSLogger.log("Auto-Sing stopped: the game is loading a save", this.context);
        HSUI.Notify("Auto-Sing stopped: a save was loaded", { position: 'top', notificationType: 'warning' });
    }


    // --- Core Data Fetch/Update ---

    /**
     * SYNCHRONOUSLY triggers a game save and returns the raw save JSON captured by the btoa hook.
     * For callers that cannot await (e.g. right before a click whose ordering matters).
     * @returns The fresh save JSON, or undefined if no save was captured (e.g. during a time warp)
     */
    forceCaptureRawSaveSync(): string | undefined {
        const saveBtn = this.#manualSaveButton ?? document.getElementById('savegame') as HTMLButtonElement | null;
        if (!saveBtn) return undefined;

        this.#hackJSNativebtoa();

        // The game's save handler calls btoa synchronously, so a capture happens before dispatchEvent returns
        const captureCountBefore = this.#mitmCaptureCount;
        saveBtn.dispatchEvent(this.#saveTriggerEvent);

        return this.#mitmCaptureCount !== captureCountBefore ? this.#mitm_gamedata : undefined;
    }

    /**
     * Reads the current data, whether the GDS engine runs or not (GDS off, paused by autosing).
     * Live source: the live player, at once (it clears the calculation cache).
     * Save source: forces a save. The game's save handler calls btoa synchronously, so the capture is processed here at
     * once: the hook's microtask then finds nothing new. Only a changed save is parsed and notified, as on the periodic
     * tick (a refused save, e.g. during a time warp, leaves the data as it was).
     * @returns Promise<void>
     */
    async forceRefreshGameData(): Promise<void> {
        if (this.#useLiveSource()) {
            this.#readLivePlayer();
            return;
        }

        const saveBtn = await HSElementHooker.HookElement('#savegame') as HTMLButtonElement | null;
        // Both have an early return if already patched...
        this.#hackJSNativebtoa();
        this.#hackJSNativeAtob();

        if (saveBtn) {
            saveBtn.dispatchEvent(this.#saveTriggerEvent);
        } else {
            HSLogger.warn('Could not find #savegame to force refresh game data', this.context);
        }

        this.#processCapturedSave(true);
    }

    /**
     * Reads the PseudoCoin levels (#loadPCoinLevels) and the quark bonuses (#loadQuarkBonus) once, at load.
     * @returns Promise<void>
     */
    async #refreshFetchedData() {
        await this.#loadPCoinLevels();
        await this.#loadQuarkBonus();
    }

    // --- Quark bonuses (personal and global) ---
    // The game reads them from https://synergism.cc/api/v1/users/me (at load and at a login) and
    // https://synergism.cc/api/v1/quark-bonus (at load, then every 15 minutes); its formulas use its copy.

    #isQuarkBonusPatched(): boolean {
        return window.__HS_PATCH_REPORT?.quarkBonus === true;
    }

    /** Patched game: the game hands both bonuses over at each change, maybe already before the mod loaded. */
    #watchQuarkBonus() {
        if (!this.#isQuarkBonusPatched()) return;

        window.__HS_onQuarkBonusChange = () => this.#readGameQuarkBonus();
        this.#readGameQuarkBonus();
    }

    #readGameQuarkBonus() {
        const bonus = window.__HS_quarkBonus;
        if (!bonus) return;

        this.#meBonuses = { globalBonus: Number(bonus.global) || 0, bonus: { quark: Number(bonus.personal) || 0 } };
        this.#meDataUpdated();
    }

    /**
     * Without the patch: read once, from the browser's cached copy of the game's own /users/me when it has one,
     * else fetched. A login after the page load is seen at the next reload.
     */
    async #loadQuarkBonus() {
        if (this.#isQuarkBonusPatched() || this.#meBonuses) return;

        // Any status: a logged-out player's answer still holds the global bonus
        const data = await this.#fetchGameRoute<MeData>(HSGlobal.Common.meAPIurl, 'quark bonus', true, false)
            ?? await this.#fetchGameRoute<MeData>(HSGlobal.Common.meAPIurl, 'quark bonus', false, false);
        if (!data) return;

        this.#meBonuses = data;
        this.#meDataUpdated();
    }

    // --- PseudoCoin upgrade levels ---
    // The game fetches them once at load (https://synergism.cc/stripe/upgrades) and updates its copy after an in-game
    // purchase; its formulas read that copy, so the mod follows it rather than the server.

    #isPCoinLevelsPatched(): boolean {
        return window.__HS_PATCH_REPORT?.pcoinLevels === true;
    }

    /**
     * Patched game: HSGameDataAPI reads the game's levels live, and the patch says when they change.
     * Otherwise: an in-game purchase is read from the game's request, whose answer is the upgrade's new level.
     */
    #watchPCoinLevels() {
        if (this.#isPCoinLevelsPatched()) {
            window.__HS_onPCoinChange = () => this.#gameDataAPI?.clearCache();
            return;
        }

        const nativeFetch = window.fetch;
        window.fetch = (input, init) => {
            const response = nativeFetch.call(window, input, init);
            try {
                const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
                if (url.includes('/stripe/buy-upgrade/')) {
                    // A copy of the answer: the game reads the original untouched
                    response.then(r => r.ok ? r.clone().json() : undefined)
                        .then(reply => this.#onPCoinPurchase(reply))
                        .catch(() => { /* the game reports its own failures */ });
                }
            } catch { /* the game's request goes on */ }
            return response;
        };
    }

    #onPCoinPurchase(reply: unknown) {
        const { upgradeId, level } = (reply ?? {}) as { upgradeId?: unknown, level?: unknown };
        // Without the levels read at load, there is no upgrade name to put the new level on
        if (typeof upgradeId !== 'number' || typeof level !== 'number' || !this.#playerPseudoUpgrades) return;

        const owned = this.#playerPseudoUpgrades.playerUpgrades ??= [];
        const upgrade = owned.find(u => Number(u.upgradeId) === upgradeId);
        if (upgrade) upgrade.level = level;
        else owned.push({ upgradeId, level });
        this.#pseudoDataUpdated();

        const name = this.#playerPseudoUpgrades.upgrades?.find(u => u.upgradeId === upgradeId && 'name' in u);
        HSLogger.log(`PseudoCoin upgrade ${name && 'name' in name ? name.name : upgradeId} bought: level ${level}`, this.context);
    }

    /**
     * Reads the levels once, without a request when possible: the browser's cached copy of the game's own fetch.
     * Patched game: that copy only stands in until the game's fetch has answered (the cache may hold the previous
     * page load's), and it is never fetched. Otherwise: fetched when the browser has no copy; purchases come from
     * #watchPCoinLevels, so it is never read again.
     */
    async #loadPCoinLevels() {
        if (window.__HS_pcoinLevelsLoaded || this.#playerPseudoUpgrades) return;

        const url = HSGlobal.Common.pseudoAPIurl;
        let data = await this.#fetchGameRoute<PseudoGameData>(url, 'PseudoCoin levels', true);
        if (!data && !this.#isPCoinLevelsPatched()) data = await this.#fetchGameRoute<PseudoGameData>(url, 'PseudoCoin levels', false);
        // The game's own levels arrived meanwhile: they win
        if (!data || window.__HS_pcoinLevelsLoaded) return;

        this.#playerPseudoUpgrades = data;
        this.#pseudoDataUpdated();
    }

    /**
     * One of the game's own requests: cachedOnly reads the browser's copy of the game's answer and sends nothing.
     * okOnly: an answer with an error status counts as none.
     */
    async #fetchGameRoute<T>(url: string, what: string, cachedOnly: boolean, okOnly = true): Promise<T | undefined> {
        try {
            const response = await fetch(url, cachedOnly
                ? { headers: HSGlobal.Common.modRequestHeaders, cache: 'only-if-cached', mode: 'same-origin' }
                : { headers: HSGlobal.Common.modRequestHeaders });
            if (okOnly && !response.ok) throw new Error(`status ${response.status}`);
            return await response.json() as T;
        } catch (err) {
            // Not in the browser's cache (a first visit, a cleared cache, an answer the server says not to keep, a
            // page not on synergism.cc): fetched instead, or the patch fills it
            if (cachedOnly) HSLogger.debug(() => `No cached ${what}: ${err}`, this.context);
            else HSLogger.error(`Could not fetch ${what}: ${err}`, this.context);
            return undefined;
        }
    }

    /**
     * Updates game data and notifies all subscribers.
     * Also triggers initial loadout match if needed.
     * @returns void
     */
    #gameDataUpdated() {
        if (this.#gameDataAPI && this.#gameData) {
            this.#gameDataAPI._updateGameData(this.#gameData);
        }

        this.#gameDataSubscribers.forEach((callback) => {
            if (this.#gameData) {
                callback(this.#gameData);
            } else {
                HSLogger.debug(() => `Could not call game data change callback. No save data found`, this.context);
            }
        });
    }

    /**
     * Updates pseudo data in the game data API.
     * @returns void
     */
    #pseudoDataUpdated() {
        if (this.#gameDataAPI && this.#playerPseudoUpgrades) {
            this.#gameDataAPI._updatePseudoData(this.#playerPseudoUpgrades);
        }
    }

    /**
     * Updates me bonuses in the game data API.
     * @returns void
     */
    #meDataUpdated() {
        if (this.#gameDataAPI && this.#meBonuses) {
            this.#gameDataAPI._updateMeData(this.#meBonuses);
        }
    }

    /**
     * Updates event data in the game data API.
     * @returns void
     */
    #eventDataUpdated() {
        if (this.#gameDataAPI && this.#gameEvents) {
            this.#gameDataAPI._updateEventData(this.#gameEvents);
        }
    }


    // --- Consumables (Happy Hour Bells) ---

    /**
     * Follows the game's active Happy Hour Bells, read once a second from the game's own record
     * (window.__HS_consumables, exposed by the patcher; filled by the game's consumables WebSocket).
     * The mod no longer opens a connection of its own: the server refuses a second one for the same account.
     * Without the patcher's capture (bookmarklet, older patch) the bells stay at 0.
     * @returns void
     */
    #startConsumablesPoll() {
        if (!window.__HS_consumables) {
            HSLogger.log(`Happy Hour Bells not readable (the game is not patched for it): counted as 0`, this.context);
            return;
        }

        let lastKey = '';
        const read = () => {
            const bell = window.__HS_consumables?.HAPPY_HOUR_BELL;
            const amount = typeof bell?.amount === 'number' ? bell.amount : 0;
            const ends: number[] = Array.isArray(bell?.ends) ? bell.ends.filter((e: unknown) => typeof e === 'number') : [];
            const key = `${amount}|${ends.join(',')}`;
            if (key === lastKey) return;
            lastKey = key;

            this.#gameEvents.HAPPY_HOUR_BELL = {
                amount,
                ends,
                displayName: (typeof bell?.displayName === 'string' && bell.displayName) || 'Happy Hour Bell'
            };
            this.#eventDataUpdated();
        };

        read();
        setInterval(read, HSGlobal.HSGameData.consumablesPollInterval);
    }

    // --- Global event ---

    /**
     * Follows the game's global event: the patcher hands over each answer the game gets from
     * https://synergism.cc/events/get (Event.ts eventCheck, at load then every 5 minutes), and keeps the last one in
     * window.__HS_globalEvent, read here once because the game's first fetch comes before the mod loads.
     * The mod doesn't fetch it (the game's dev asked for less traffic). Without the patch (bookmarklet, older patch)
     * there is no global event. A save without dayCheck makes the game skip its fetch: no event, as in the game.
     * @returns void
     */
    #startGlobalEventCapture() {
        const w = window;
        if (!w.__HS_GLOBAL_EVENT_PATCHED) {
            HSLogger.log(`Global event not readable (the game is not patched for it): counted as none`, this.context);
            return;
        }

        w.__HS_onGlobalEvent = (json: unknown) => this.#gameDataAPI?._updateVanillaGlobalEvent(json);
        if (w.__HS_globalEvent !== undefined) this.#gameDataAPI?._updateVanillaGlobalEvent(w.__HS_globalEvent);
    }


    // --- GDS (Game Data Sniffing) Control ---

    /** The live player when the patcher exposes it, unless the dev tools force the save. */
    #useLiveSource(): boolean {
        return !!HSGlobal.exposedPlayer && !this.#forceSaveSource;
    }

    /** Dev tools: whether the save is read even when the live player is exposed. */
    isSaveSourceForced(): boolean {
        return this.#forceSaveSource;
    }

    /**
     * Dev tools: read the save even when the live player is exposed, to test that path on a patched game.
     * A running engine restarts on the new source.
     */
    async setForceSaveSource(force: boolean): Promise<void> {
        if (this.#forceSaveSource === force) return;
        this.#forceSaveSource = force;
        // The next capture is parsed even if it is the last one seen
        this.#last_mitm_gamedata = undefined;
        HSLogger.log(`GDS source: ${force ? 'the save (forced)' : 'the live player when exposed'}`, this.context);

        if (!this.#gdsEnabled) return;
        await this.disableGDS();
        await this.enableGDS();
    }

    /**
     * The live player as the game data: the same object at every read, so it only clears the calculation cache and
     * notifies the subscribers.
     */
    #readLivePlayer() {
        const player = HSGlobal.exposedPlayer;
        if (!player) return;

        this.#gameData = player as unknown as GameData;
        this.#gameDataUpdated();
    }

    /**
     * Whether the GDS engine is currently running, i.e. the cached game data is kept up to date.
     * Can be false while the GDS setting is ON (engine paused by autosing).
     */
    isGDSRunning(): boolean {
        return this.#gdsEnabled;
    }

    /**
     * Whether the engine should run when no pause is held. The GDS setting only exists for bookmarklet players
     * (its platforms): everyone else reads the live player at almost no cost, so it always runs, whatever was saved.
     */
    isGDSWanted(): boolean {
        if (HSPlatform.get() !== 'bookmarklet') return true;
        return HSSettings.getSetting('useGameData')?.isEnabled() ?? false;
    }

    /**
     * Pauses the GDS engine without touching the GDS setting, so the setting can't be left OFF
     * if the pause is never released (reload, crash...). The engine stays stopped until every
     * pause is released.
     * @param reason Identifies the pause, released by resumeGDS() with the same value.
     */
    async pauseGDS(reason: string): Promise<void> {
        this.#enginePauses.add(reason);
        HSLogger.debug(() => `GDS paused (${reason})`, this.context);
        if (this.#gdsEnabled) await this.disableGDS();
    }

    /**
     * Releases a pause taken by pauseGDS(). Restarts the engine when no pause is left
     * and it is wanted (isGDSWanted()).
     * @param reason The value given to pauseGDS().
     * @returns true when the engine was restarted.
     */
    async resumeGDS(reason: string): Promise<boolean> {
        if (!this.#enginePauses.delete(reason)) return false;
        HSLogger.debug(() => `GDS pause released (${reason})`, this.context);
        if (this.#enginePauses.size > 0) return false;
        if (!this.isGDSWanted()) return false;

        await this.enableGDS();
        return this.#gdsEnabled;
    }

    /**
     * Enables Game Data Sniffing (GDS) mode, sets up intervals, hooks DOM elements,
     * hooks btoa/atob and starts save processing.
     * Does nothing while the engine is paused (see pauseGDS()).
     * @returns Promise<void>
     */
    async enableGDS() {
        if (this.#gdsEnabled) return;
        if (this.#enginePauses.size > 0) {
            HSLogger.debug(() => `GDS start deferred, paused by: ${[...this.#enginePauses].join(', ')}`, this.context);
            return;
        }

        // Concurrent callers share one start, so the intervals are never installed twice.
        // A start cancelled by disableGDS() isn't shared: it ends by itself without starting anything.
        if (this.#engineStart?.generation !== this.#engineGeneration) {
            const start = {
                generation: this.#engineGeneration,
                promise: this.#startEngine(this.#engineGeneration).finally(() => {
                    if (this.#engineStart === start) this.#engineStart = undefined;
                })
            };
            this.#engineStart = start;
        }
        return this.#engineStart.promise;
    }

    async #startEngine(generation: number) {
        const live = this.#useLiveSource();

        // Every wait happens before anything is installed: the start can be cancelled meanwhile
        if (!live && !this.#manualSaveButton) {
            this.#manualSaveButton = await HSElementHooker.HookElement('#savegame') as HTMLButtonElement;
        }

        if (!live && !this.#saveinfoElement) {
            this.#saveinfoElement = await HSElementHooker.HookElement('#saveinfo') as HTMLParagraphElement;
        }

        // Cancelled while waiting by disableGDS() or pauseGDS() (e.g. GDS turned off, autosing started)
        if (generation !== this.#engineGeneration || this.#enginePauses.size > 0 || this.#gdsEnabled) {
            HSLogger.debug(() => `GDS start cancelled`, this.context);
            return;
        }

        if (this.#saveInterval) clearInterval(this.#saveInterval);

        if (live) {
            // No save: the live player is read as it is
            this.#saveInterval = setInterval(() => this.#readLivePlayer(), HSGlobal.HSGameData.gdsSpeedMs);
        } else {
            HSUI.injectStyle(this.#gdsCSS, HSGlobal.HSGameData.gdsCSSId);
            this.#saveInterval = setInterval(() => {
                if (this.#manualSaveButton && this.#saveinfoElement && this.#saveTriggerEvent) {
                    this.#manualSaveButton.dispatchEvent(this.#saveTriggerEvent);
                }
            }, HSGlobal.HSGameData.gdsSpeedMs)
        }

        this.#engineSource = live ? 'live' : 'save';
        HSLogger.info(`GDS = ON (${live ? 'live player' : 'save capture'})`, this.context);
        this.#gdsEnabled = true;

        // Hooked on both sources: "Load from file" reads the save the game decodes
        this.#hackJSNativebtoa();
        this.#hackJSNativeAtob();
        if (live) this.#readLivePlayer();
        else this.#processCapturedSave();
    }

    /**
     * Processes save data from MITM when new encoded save JSON has been captured.
     * Not while the engine reads the live player: the game's own saves (every 5 s) would replace it.
     * @param forced Also when the GDS engine isn't running (forceRefreshGameData on the save source)
     */
    #processCapturedSave = (forced = false) => {
        if (!forced && (!this.#gdsEnabled || this.#engineSource !== 'save')) return;

        if (this.#mitm_gamedata && this.#mitm_gamedata !== this.#last_mitm_gamedata) {
            this.#last_mitm_gamedata = this.#mitm_gamedata;

            try {
                this.#gameData = JSON.parse(this.#mitm_gamedata) as GameData;
                this.#gameDataUpdated();
            } catch (error) {
                HSLogger.debug(() => `<red>Error processing save data:</red> ${error}`, this.context);
            }
        }
    }

    /**
     * Disables Game Data Sniffing (GDS) mode, clears intervals
     * and removes injected styles.
     * @returns Promise<void>
     */
    async disableGDS() {
        // Cancels a start still waiting in #startEngine()
        this.#engineGeneration++;

        if (this.#saveInterval) {
            clearInterval(this.#saveInterval);
            this.#saveInterval = undefined;
        }

        HSUI.removeInjectedStyle(HSGlobal.HSGameData.gdsCSSId);

        // The loadFromFileEventHandler is NOT removed here:
        // it must remain active to intercept save loads even when GDS is disabled.

        HSLogger.info(`GDS = OFF`, this.context);
        this.#gdsEnabled = false;
        this.#engineSource = undefined;
    }

    /**
     * Prepares for autosing by hacking native btoa and atob functions.
     * @returns Promise<void>
     */
    async prepareForAutosing() {
        this.#hackJSNativebtoa();
        this.#hackJSNativeAtob();
    }

    /**
     * Dispatches a save event and extracts quarks and goldenQuarks from the latest save data.
     * @returns Promise<{ quarks: number; goldenQuarks: number } | null>
     */
    async getLatestAutosingData(): Promise<{ quarks: number; goldenQuarks: number } | null> {
        const saveButton = await HSElementHooker.HookElement('#savegame') as HTMLButtonElement;
        
        saveButton.dispatchEvent(this.#saveTriggerEvent);
        
        if (this.#mitm_gamedata) {
            try {
                // Parse only the needed fields
                const parsed = JSON.parse(this.#mitm_gamedata);
                const quarks = typeof parsed.worlds === 'number' ? parsed.worlds : 0;
                const goldenQuarks = typeof parsed.goldenQuarks === 'number' ? parsed.goldenQuarks : 0;
                return { quarks, goldenQuarks };
            } catch (e) {
                HSLogger.error(`Failed to parse mitm_gamedata for autosing: ${e}`, this.context);
                return null;
            }
        }
        return null;
    }

    /**
     * Hacks the native atob function to capture decoded save data.
     * @returns void
     */
    #hackJSNativeAtob() {
        if (this.#atobHacked) return;

        const self = this;
        const _atob = window.atob;

        window.atob = function (s) {
            const decoded = _atob(s);
            // Quick check for JSON-like structure to capture save data
            if (decoded && decoded.trim().startsWith('{')) {
                self.#mitm_atob_data = decoded;
            }
            return decoded;
        }

        this.#atobHacked = true;
    }

    /**
     * Hacks the native btoa function to capture encoded save data.
     * @returns void
     */
    #hackJSNativebtoa() {
        if (this.#btoaHacked)
            return;

        const self = this;

        // Store ref to native btoa
        const _btoa = window.btoa;

        // Overwrite btoa
        window.btoa = function (s) {
            // Capture raw save JSON before the game encodes it to base64.
            // This is the save payload as the game produces it.
            if (s && s.length > 0 && s[0] === '{') {
                self.#mitm_gamedata = s;
                self.#mitmCaptureCount++;
                if (!self.#mitmProcessScheduled) {
                    self.#mitmProcessScheduled = true;
                    queueMicrotask(() => {
                        self.#mitmProcessScheduled = false;
                        self.#processCapturedSave();
                    });
                }
            }
            // Call the original btoa so everything still works normally
            return _btoa(s);
        }

        this.#btoaHacked = true;
    }

    /**
     * Handles save file import: stops autosing if active, watches for offline container visibility,
     * then restores the active ambrosia loadout.
     * The GDS engine keeps running: the game loads the save without letting a timer in, and refuses
     * to save while the offline popup is up (G.timeWarp), so a save from the engine can't write over it.
     * @param e MouseEvent from the import button click.
     * @returns Promise<void>
     */
    async #loadFromFileHandler(e: MouseEvent) {
        this.#mitm_atob_data = undefined; // Clear stale save data

        // An older click still waiting (e.g. no event came back from its dialog) is ended here
        this.#abortPendingImport?.();

        // Autosing can't go on with another save
        const autosing = HSModuleManager.getModule<HSAutosing>('HSAutosing');
        // Also a start in progress or a pending restart, which would run on the imported save
        if (autosing?.isAutosingActive()) {
            HSLogger.log("Load from file clicked - Stopping Auto-Sing", this.context);
            autosing.stopAutosing({ saveReplaced: true });
            HSUI.Notify("Auto-Sing stopped for save file import", { position: 'top', notificationType: 'warning' });
        }

        // We start watching the offline container to detect when the save is actually loaded
        const offlineContainer = await HSElementHooker.HookElement('#offlineContainer') as HTMLDivElement;
        const self = this;
        let watcherStopped = false;
        // Set below, once the dialog listeners exist
        let stopWaitingForLoad = () => { };

        const watcherId = HSElementHooker.watchElement(offlineContainer, async (viewState: { view: string, state: string }) => {
            if (viewState.state !== 'none' && !watcherStopped) {
                // IMMEDIATELY mark as stopped and disconnect to prevent multiple fires during lag
                watcherStopped = true;
                stopWaitingForLoad();

                try {
                    HSLogger.log("Offline container visible - Save loaded (GDS)", self.context);

                    const ambrosiaModule = HSModuleManager.getModule<HSAmbrosia>('HSAmbrosia');
                    if (ambrosiaModule) {
                        // AWAIT reset to ensure it finishes before we start matching or setting
                        await ambrosiaModule.resetActiveLoadout();
                    }

                    // --- Restore Correct Loadout Logic ---
                    if (self.#mitm_atob_data) {
                        try {
                            const saveData = JSON.parse(self.#mitm_atob_data) as GameData;
                            if (ambrosiaModule) {
                                await ambrosiaModule.performInitialActiveLoadoutMatch(saveData);
                            }
                        } catch (e) {
                            HSLogger.warn(`Failed to analyze save data for loadout restoration: ${e}`, self.context);
                        }
                    } else {
                        HSLogger.debug(() => `No captured save data (mitm_atob_data is empty).`, self.context);
                    }
                } catch (e) {
                    HSLogger.error(`Critical error during GDS save load restoration: ${e}`, self.context);
                }
            }
        }, {
            attributes: true,
            attributeFilter: ['style'],
            valueParser: (element, mutations) => {
                for (const mutation of mutations) {
                    if (mutation.type === 'attributes' && mutation.attributeName === 'style') {
                        const target = mutation.target as HTMLElement;
                        const display = target.style.getPropertyValue('display');
                        return {
                            view: target.id,
                            state: display
                        }
                    }
                }
                return { view: element.id, state: element.style.getPropertyValue('display') };
            }
        });

        // --- No save loaded: dialog cancelled, or the game refused the file (it only shows an Alert) ---
        const fileInput = document.getElementById('importfile') as HTMLInputElement | null;
        let noLoadTimer: number | undefined;
        let fileChosen = false;

        const stopWaiting = () => {
            watcherStopped = true;
            window.clearTimeout(noLoadTimer);
            fileInput?.removeEventListener('cancel', onCancel);
            fileInput?.removeEventListener('change', onChange);
            window.removeEventListener('focus', onFocus);
            if (watcherId) HSElementHooker.stopWatching(watcherId);
            if (self.#abortPendingImport === abortThisImport) self.#abortPendingImport = undefined;
        };
        stopWaitingForLoad = stopWaiting;

        const endWithoutLoad = (reason: string) => {
            if (watcherStopped) return;
            stopWaiting();
            HSLogger.log(`Save file import ended without a save loaded (${reason})`, self.context);
        };

        // Fired when the dialog is closed without choosing a file
        const onCancel = () => endWithoutLoad('dialog cancelled');
        // A file was chosen: the game reads it and shows the offline popup if it loads it
        const onChange = () => {
            fileChosen = true;
            window.clearTimeout(noLoadTimer);
            noLoadTimer = window.setTimeout(() => endWithoutLoad('file not loaded by the game'), 10_000);
        };
        // Fallback when 'cancel' isn't supported. 'change' may come just after 'focus', hence the long delay
        const onFocus = () => {
            window.removeEventListener('focus', onFocus);
            if (fileChosen) return;
            noLoadTimer = window.setTimeout(() => endWithoutLoad('dialog closed'), 10_000);
        };

        fileInput?.addEventListener('cancel', onCancel);
        fileInput?.addEventListener('change', onChange);
        window.addEventListener('focus', onFocus);

        // A new click ends this import: it watches for its own save
        const abortThisImport = () => {
            if (watcherStopped) return;
            stopWaiting();
        };
        this.#abortPendingImport = abortThisImport;
    }

    // --- Subscription Management ---

    /**
     * Subscribes a callback to game data changes.
     * @param callback Function to call when game data changes.
     * @returns Subscription ID string or undefined.
     */
    subscribeGameDataChange(callback: (data: GameData) => void): string | undefined {
        const id = HSUtils.uuidv4();
        this.#gameDataSubscribers.set(id, callback);
        return id;
    }

    /**
     * Unsubscribes a callback from game data changes by ID.
     * @param id Subscription ID to remove.
     * @returns void
     */
    unsubscribeGameDataChange(id: string) {
        if (this.#gameDataSubscribers.has(id)) {
            this.#gameDataSubscribers.delete(id);
        } else {
            HSLogger.warn(`Could not unsubscribe from game data change. ID ${id} not found`, this.context);
        }
    }
}
