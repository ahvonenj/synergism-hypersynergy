import type { GameData } from "../../../types/data-types/hs-player-savedata";
import type { HSGameDataAPI } from "../../hs-core/gds/hs-gamedata-api";
import { HSGlobal } from "../../hs-core/hs-global";
import { HSLogger } from "../../hs-core/hs-logger";
import { HSModuleRegistry } from "../../hs-core/module/hs-module-registry";
import { HSUI } from "../../hs-core/hs-ui";
import { HSHeaderModules } from "../../hs-core/header/hs-header-modules";
import { HSQuickbarManager } from "../hs-qol-quickbar/hs-qolQuickbarManager";
import { HSAmbrosiaHelper } from "./hs-ambrosia-helper";
import type { HSAmbrosiaGameDataLink } from "./hs-ambrosia-parts";
import minibarCSS from "inline:../../../resource/css/module/hs-ambrosia-minibars.css";
import { HSMinibarResize } from "../../hs-core/header/hs-minibar-resize";

/**
 * Class: HSAmbrosiaMinibars
 * IsExplicitHSModule: No
 * Description:
 *     Created by HSAmbrosia. The ambrosia minibars: the blue, red and purple bars' progress, as a module of the
 *     game's header (hsAmbrosiaBars) or, without the patcher's header modules patch, a section of the mod's own row.
 *     Read from the live player every 125ms; without it (bookmarklet), from GDS's save data.
 * Author: Swiffy, Shewchou
 */
export class HSAmbrosiaMinibars {
    #context: string;
    #gameData: HSAmbrosiaGameDataLink;

    // The minibars' id as a module of the game's header (see HSHeaderModules)
    static readonly #MINIBARS_HEADER_MODULE = 'hsAmbrosiaBars';
    #berryMinibarsEnabled = false;
    #minibarWrapper?: HTMLDivElement;
    #blueProgressMinibarElement?: HTMLDivElement;
    #redProgressMinibarBarElement?: HTMLDivElement;
    #redProgressMinibarElement?: HTMLDivElement;
    #purpleProgressMinibarBarElement?: HTMLDivElement;
    #purpleProgressMinibarElement?: HTMLDivElement;
    // The game moves the three bars in its purple reactor step, every 0.125s of real time (PURPLE_REACTOR_TICK_INTERVAL)
    static readonly #LIVE_MINIBARS_INTERVAL_MS = 125;
    // Read from the live player (exposedPlayer), not from GDS: the bookmarklet has none
    #minibarsLive = false;
    #liveMinibarsTimer?: ReturnType<typeof setInterval>;
    // Bar sizes from the mod's formulas on one save, computed again when one of their inputs changes on the live player
    #minibarSizes?: { blue: number; red: number; purple: number };
    #minibarSizesSignature?: string;
    #minibarSizesRefreshing = false;
    // After a failed computation, not before (each try forces a save)
    static readonly #MINIBAR_SIZES_RETRY_MS = 5_000;
    #minibarSizesRetryAt = 0;
    // What the bars show, written to the page only on a change
    #minibarsShown: { blue?: number; red?: number; purple?: number; redUnlocked?: boolean; purpleUnlocked?: boolean } = {};

    #minibarCSSId = 'hs-ambrosia-minibar-css';

    constructor(context: string, gameData: HSAmbrosiaGameDataLink) {
        this.#context = context;
        this.#gameData = gameData;
    }

    /**
     * Show the minibars: a module of the game's header, which the player places in the header's edit mode (it starts
     * in the tray), or a section of the mod's own row (#quickbarsRow) without the patcher's header modules patch.
     */
    async enable() {
        const barWrapper = this.#minibarWrapper;
        if (!barWrapper) {
            HSLogger.warn('Could not find minibar wrapper', this.#context);
            return;
        }

        const headerModule = HSHeaderModules.register(HSAmbrosiaMinibars.#MINIBARS_HEADER_MODULE, () => HSAmbrosiaHelper.isAmbrosiaUnlocked());
        if (headerModule) {
            headerModule.appendChild(barWrapper);
        } else {
            const quickbarManager = HSQuickbarManager.getInstance();
            const sectionId = HSQuickbarManager.QUICKBAR_IDS.AMBROSIA_MINIBARS;
            if (!quickbarManager.isInjected(sectionId)) {
                await quickbarManager.enableQuickbar(sectionId, () => ({ element: barWrapper }));
            }
        }

        barWrapper.style.display = 'flex';
        HSUI.injectStyle(minibarCSS, this.#minibarCSSId);
        this.#berryMinibarsEnabled = true;

        if (HSGlobal.exposedPlayer) {
            this.#minibarsLive = true;
            if (!this.#liveMinibarsTimer) {
                this.#liveMinibarsTimer = setInterval(() => this.#updateLiveMinibars(), HSAmbrosiaMinibars.#LIVE_MINIBARS_INTERVAL_MS);
            }
            this.#updateLiveMinibars();
            return;
        }

        // No live player (bookmarklet, or the patch failed): from GDS's save data
        this.#gameData.subscribe();
        const gameDataAPI = HSModuleRegistry.getModule('HSGameDataAPI');
        const gameData = gameDataAPI?.getGameData() ?? await gameDataAPI?.getForcedGameData();
        if (this.#berryMinibarsEnabled && gameData) {
            this.#updateBerryMinibars(gameData, gameDataAPI);
        }
    }

    /** Hide the minibars, wherever they are (their place in the header stays remembered). */
    async disable() {
        // Takes the module, with the bars in it, out of the page (or, without the patch, their section of the row)
        HSHeaderModules.unregister(HSAmbrosiaMinibars.#MINIBARS_HEADER_MODULE);
        HSQuickbarManager.getInstance().removeSection(HSQuickbarManager.QUICKBAR_IDS.AMBROSIA_MINIBARS);
        if (this.#minibarWrapper) this.#minibarWrapper.style.display = 'none';
        HSUI.removeInjectedStyle(this.#minibarCSSId);

        this.#berryMinibarsEnabled = false;
        this.#minibarsLive = false;
        clearInterval(this.#liveMinibarsTimer);
        this.#liveMinibarsTimer = undefined;
        this.#gameData.unsubscribe();
    }

    /** Builds the minibars, out of the page: enable() places them. */
    build(): void {
        if (this.#minibarWrapper) return;

        // Build independent bars rather than cloning the game's bars. The game uses an
        // inline scaleX transform now, which would otherwise be copied at an arbitrary
        // progress value and multiply the minibar's own progress updates.
        const blueBar = document.createElement('div');
        const blueBarProgress = document.createElement('div');
        blueBar.id = HSGlobal.HSAmbrosia.blueBarId;
        blueBar.title = 'Ambrosia progress (HyperSynergism)';
        blueBarProgress.id = HSGlobal.HSAmbrosia.blueBarProgressId;
        blueBar.appendChild(blueBarProgress);

        const redBar = document.createElement('div');
        const redBarProgress = document.createElement('div');
        redBar.id = HSGlobal.HSAmbrosia.redBarId;
        redBar.title = 'Red ambrosia progress (HyperSynergism)';
        redBarProgress.id = HSGlobal.HSAmbrosia.redBarProgressId;
        redBar.style.display = 'none';
        redBar.appendChild(redBarProgress);

        // Purple Honey fills symmetrically from both outer edges toward the center.
        const purpleBar = document.createElement('div');
        const purpleBarProgress = document.createElement('div');
        purpleBar.id = HSGlobal.HSAmbrosia.purpleBarId;
        purpleBar.title = 'Purple honey progress (HyperSynergism)';
        purpleBarProgress.id = HSGlobal.HSAmbrosia.purpleBarProgressId;
        for (let i = 0; i < 2; i++) {
            const half = document.createElement('div');
            half.className = 'hs-purple-progress-fill';
            purpleBarProgress.appendChild(half);
        }
        purpleBar.style.display = 'none';
        purpleBar.appendChild(purpleBarProgress);

        // Wrapper for the three
        const minibarWrapper = document.createElement('div') as HTMLDivElement;
        minibarWrapper.id = HSGlobal.HSAmbrosia.barWrapperId;
        minibarWrapper.style.display = 'none';
        minibarWrapper.appendChild(blueBar);
        minibarWrapper.appendChild(redBar);
        minibarWrapper.appendChild(purpleBar);

        this.#minibarWrapper = minibarWrapper;
        HSMinibarResize.install(minibarWrapper);
        this.#blueProgressMinibarElement = blueBarProgress;
        this.#redProgressMinibarBarElement = redBar;
        this.#redProgressMinibarElement = redBarProgress;
        this.#purpleProgressMinibarBarElement = purpleBar;
        this.#purpleProgressMinibarElement = purpleBarProgress;
    }

    /** Shown and read from GDS's save data (no live player). */
    needsGameData(): boolean {
        return this.#berryMinibarsEnabled && !this.#minibarsLive;
    }

    /** New save data from GDS: the bars are drawn from it when there's no live player. */
    onGameData(gameData: GameData, gameDataAPI: HSGameDataAPI): void {
        if (this.needsGameData()) {
            this.#updateBerryMinibars(gameData, gameDataAPI);
        }
    }

    /**
     * The minibars from the live player, every 125ms: the fill read from it, the bar sizes from the mod's formulas
     * (#refreshMinibarSizesOnChange). Nothing while the page is hidden.
     */
    #updateLiveMinibars(): void {
        if (!this.#berryMinibarsEnabled || document.hidden) return;
        const player = HSGlobal.exposedPlayer;
        if (!player) return;

        this.#refreshMinibarSizesOnChange(player);
        const sizes = this.#minibarSizes;
        if (!sizes) return;

        // Shown once unlocked, as the game's red ambrosia and purple honey header modules (Exalts 9 and 10)
        const redUnlocked = (player.singularityChallenges?.noAmbrosiaUpgrades?.completions ?? 0) > 0;
        const purpleUnlocked = (player.singularityChallenges?.taxmanLastStand?.completions ?? 0) > 0;
        this.#drawMinibars({
            blue: HSAmbrosiaMinibars.#barFill(player.blueberryTime, sizes.blue),
            red: HSAmbrosiaMinibars.#barFill(player.redAmbrosiaTime, sizes.red),
            purple: purpleUnlocked ? HSAmbrosiaMinibars.#barFill(player.purpleHoneyProgress, sizes.purple) : undefined,
            redUnlocked,
            purpleUnlocked,
        });
    }

    static #barFill(progress: number | undefined, size: number): number {
        return size > 0 ? Math.min(1, Math.max(0, Number(progress ?? 0) / size)) : 0;
    }

    /**
     * The bar sizes change at every fill (lifetime ambrosia), but by about a millionth: the lifetimes count only to
     * 3 significant digits (0.1%). They also change with the loadout (Two Minds, Brick of Lead), the Exalts, the shop's
     * accelerator and the purple reactor's requirement upgrades. On a change, one forced save (a few ms) and the
     * sizes are computed again.
     */
    #refreshMinibarSizesOnChange(player: GameData): void {
        if (this.#minibarSizesRefreshing || performance.now() < this.#minibarSizesRetryAt) return;
        const signature = HSAmbrosiaMinibars.#minibarSizeInputs(player);
        if (signature === this.#minibarSizesSignature) return;

        this.#minibarSizesRefreshing = true;
        void this.#refreshMinibarSizes(signature)
            .catch(error => {
                this.#minibarSizesRetryAt = performance.now() + HSAmbrosiaMinibars.#MINIBAR_SIZES_RETRY_MS;
                HSLogger.warnOnce(`Could not calculate the minibars' sizes: ${error}`, 'hs-minibar-sizes');
            })
            .finally(() => { this.#minibarSizesRefreshing = false; });
    }

    async #refreshMinibarSizes(signature: string): Promise<void> {
        const gameDataAPI = HSModuleRegistry.getModule('HSGameDataAPI');
        if (!gameDataAPI || !await gameDataAPI.getForcedGameData()) throw new Error('no save data');

        this.#minibarSizes = {
            blue: gameDataAPI.ambrosia.calculateRequiredBlueberryTime(),
            red: gameDataAPI.ambrosia.calculateRequiredRedAmbrosiaTime(),
            purple: gameDataAPI.ambrosia.calculatePurpleHoneyConversionFactor(),
        };
        this.#minibarSizesSignature = signature;
        const sizes = this.#minibarSizes;
        HSLogger.debug(() => `Minibar sizes: ${sizes.blue} / ${sizes.red} / ${sizes.purple}`, this.#context);
    }

    /** The live player's inputs of the three bar-size formulas (calculateRequiredBlueberryTime and the others). */
    static #minibarSizeInputs(player: GameData): string {
        const rounded = (value: unknown) => Number(value ?? 0).toPrecision(3);
        const parts: unknown[] = [
            rounded(player.lifetimeAmbrosia),
            rounded(player.lifetimeRedAmbrosia),
            rounded(player.purpleReactor?.lifetimePurpleHoney),
            player.highestSingularityCount,
            player.shopUpgrades?.shopAmbrosiaAccelerator,
        ];
        for (const name of ['twoMind', 'ambrosiaBrickOfLead'] as const) {
            const upgrade = player.ambrosiaUpgrades?.[name] as
                { ambrosiaInvested?: number; blueberriesInvested?: number; purpleAmbrosiaInvested?: number } | undefined;
            parts.push(upgrade?.ambrosiaInvested, upgrade?.blueberriesInvested, upgrade?.purpleAmbrosiaInvested);
        }
        for (let i = 1; i <= 4; i++) {
            parts.push(rounded(player.purpleReactorUpgrades?.[`purpleHoneyRequirementReduction${i}`]));
        }
        // Every Exalt: inside it, and its completions (the shop's Exalt unlocks included)
        for (const exalt of Object.values(player.singularityChallenges ?? {}) as { enabled?: boolean; completions?: number }[]) {
            parts.push(exalt?.enabled ? 1 : 0, exalt?.completions);
        }
        return parts.join(',');
    }

    /** Writes only what changed. */
    #drawMinibars(bars: { blue: number; red: number; purple?: number; redUnlocked: boolean; purpleUnlocked: boolean }): void {
        const shown = this.#minibarsShown;
        if (this.#blueProgressMinibarElement && shown.blue !== bars.blue) {
            this.#blueProgressMinibarElement.style.transform = `scaleX(${bars.blue})`;
            shown.blue = bars.blue;
        }
        if (this.#redProgressMinibarElement && shown.red !== bars.red) {
            this.#redProgressMinibarElement.style.transform = `scaleX(${bars.red})`;
            shown.red = bars.red;
        }
        if (this.#redProgressMinibarBarElement && shown.redUnlocked !== bars.redUnlocked) {
            this.#redProgressMinibarBarElement.style.display = bars.redUnlocked ? 'block' : 'none';
            shown.redUnlocked = bars.redUnlocked;
        }
        if (this.#purpleProgressMinibarBarElement && shown.purpleUnlocked !== bars.purpleUnlocked) {
            this.#purpleProgressMinibarBarElement.style.display = bars.purpleUnlocked ? 'block' : 'none';
            shown.purpleUnlocked = bars.purpleUnlocked;
        }
        if (bars.purple !== undefined && this.#purpleProgressMinibarElement && shown.purple !== bars.purple) {
            this.#purpleProgressMinibarElement.style.setProperty('--progress-fill', String(bars.purple));
            shown.purple = bars.purple;
        }
    }

    /** The minibars from GDS's save data, without the live player (bookmarklet, or the patch failed). */
    #updateBerryMinibars(gameData?: GameData, gameDataAPI?: HSGameDataAPI) {
        if (!this.#berryMinibarsEnabled) return;

        gameDataAPI ??= HSModuleRegistry.getModule('HSGameDataAPI');
        gameData ??= gameDataAPI?.getGameData();

        // Enabling the minibars can precede the first save-data refresh.
        // The subscription will render the bars as soon as data arrives.
        if (!gameDataAPI || !gameData) return;

        const data = gameData;
        const redUnlocked = (data.singularityChallenges?.noAmbrosiaUpgrades?.completions ?? 0) > 0;
        const purpleUnlocked = (data.singularityChallenges?.taxmanLastStand?.completions ?? 0) > 0;
        this.#drawMinibars({
            blue: HSAmbrosiaMinibars.#barFill(data.blueberryTime, gameDataAPI.ambrosia.calculateRequiredBlueberryTime()),
            red: HSAmbrosiaMinibars.#barFill(data.redAmbrosiaTime, gameDataAPI.ambrosia.calculateRequiredRedAmbrosiaTime()),
            purple: purpleUnlocked
                ? HSAmbrosiaMinibars.#barFill(data.purpleHoneyProgress, gameDataAPI.ambrosia.calculatePurpleHoneyConversionFactor())
                : undefined,
            redUnlocked,
            purpleUnlocked,
        });
    }
}
