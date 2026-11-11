import type { AmbrosiaUpgradeCalculationConfig } from "../../../types/data-types/hs-gamedata-api-types";
import type { AmbrosiaUpgradeData } from "../../../types/data-types/hs-player-savedata";

import { HSGlobal } from "../../hs-core/hs-global";
import { HSModuleRegistry } from "../../hs-core/module/hs-module-registry";
import { HSGameDialogs } from "../../hs-core/dialogs/hs-game-dialogs";
import { HSAmbrosiaHelper } from "./hs-ambrosia-helper";
import type { HSAmbrosiaSlots } from "./hs-ambrosia-parts";

type HSAmbrosiaTree = Record<string, number>;

/** A temporary ambrosia tree holding the singularity reducers (HSAmbrosia.prepareSingReducerSwap). */
export interface HSSingReducerSwap {
    /** How many singularity reducers the temporary tree has more than the player's own tree. */
    added: number;
    /** The level of the Talisman Power upgrade (ambrosiaTalismanBonusRuneLevel) in the temporary tree. */
    talismanLevel: number;
    /** How many levels that is more than in the player's own tree. Negative: fewer, the ambrosia was short. */
    talismanAdded: number;
    /** Loads the temporary tree. @returns whether the game took it. */
    apply(): boolean;
    /** Loads the player's own tree back, unless it is still there. @returns whether it is there now. */
    restore(): boolean;
}

/** What the temporary tree is asked to hold (HSAmbrosia.prepareSingReducerSwap). */
export interface HSSingReducerSwapOptions {
    /** Raise the singularity reducer. Off where one brings nothing: the player's own level is kept. */
    reducers: boolean;
    /** Raise Talisman Power as far as the ambrosia left by the reducer allows. Off: the player's own level is kept. */
    raiseTalisman: boolean;
    /** Swap even when no reducer can be added, for Talisman Power alone. */
    talismanAlone: boolean;
}

/**
 * `swap`: a temporary tree is worth loading. `stop`: it would be, once the player has done what the text says.
 * `note`: why the reducers can't be raised here, when the player should know (also with a `swap` made for
 * Talisman Power alone).
 */
export interface HSSingReducerPlan {
    swap?: HSSingReducerSwap;
    note?: string;
    stop?: string;
}

/**
 * Class: HSAmbrosiaTemporaryTree
 * IsExplicitHSModule: No
 * Description:
 *     Created by HSAmbrosia. Another tree for the time of an action, then the player's own tree loaded back: the
 *     singularity reducers for the Hepteract Distributor's crafts (prepareSingReducerSwap), and a saved loadout for
 *     timed save export and manual ascension (runWithLoadout). The game only loads a tree from a slot: a tree in no slot is written
 *     into one for the time of the click.
 * Author: Shewchou
 */
export class HSAmbrosiaTemporaryTree {
    #slots: HSAmbrosiaSlots;

    constructor(slots: HSAmbrosiaSlots) {
        this.#slots = slots;
    }

    // ==============================================
    // ---- Temporary tree: singularity reducers ----
    // ==============================================

    /**
     * For the Hepteract Distributor: a tree holding the singularity reducer that counts where the player is
     * (reducer 1 outside an Exalt, with its Hyperflux prerequisite; reducer 2 inside), to load for the time of
     * the crafts. Nothing else is kept, except Talisman Power (ambrosiaTalismanBonusRuneLevel): with the Horseshoe
     * shop upgrade it raises the Horseshoe rune, which lowers every singularity penalty. It is chosen after the
     * reducer, which it must never cost a level: raised as far as the ambrosia left allows when asked, else kept
     * at the player's own level.
     * The game only loads a tree from a loadout slot (#loadTreeThroughSlot). The slot used is the one the game
     * marks; it marks none after a save load (every singularity), and then the one the mod remembers is
     * used, if it holds exactly the live tree. So the live tree, the slots and the game's mark end as they were
     * (or the mark on a slot holding the live tree).
     * Only reads the game: nothing changes before apply().
     */
    prepareSingReducerSwap(options: HSSingReducerSwapOptions): HSSingReducerPlan {
        const player = HSGlobal.exposedPlayer;
        const gameValidate = window.__HS_validateBlueberryTree;
        if (!player || typeof gameValidate !== 'function') {
            return { note: 'Singularity reducers not used: the game\'s patch is too old (patch the game again).' };
        }
        const validate = (tree: HSAmbrosiaTree): boolean => {
            try { return gameValidate(tree) === true; } catch { return false; }
        };

        const liveTree = this.#readLiveTree();
        if (!liveTree) return { note: 'Singularity reducers not used: could not read your ambrosia tree.' };

        const insideExalt = Boolean(player.insideSingularityChallenge);
        const reducer = insideExalt ? 'ambrosiaSingReduction2' : 'ambrosiaSingReduction1';
        const liveLevel = liveTree[reducer] ?? 0;
        const configs = this.#ambrosiaUpgradeConfigs();
        const maxLevel = configs?.[reducer]?.maxLevel ?? 0;
        const talisman = 'ambrosiaTalismanBonusRuneLevel';
        const liveTalisman = liveTree[talisman] ?? 0;

        const treeWith = (reducerLevel: number, talismanLevel: number): HSAmbrosiaTree => {
            const tree: HSAmbrosiaTree = Object.fromEntries(Object.keys(liveTree).map(key => [key, 0]));
            tree[reducer] = reducerLevel;
            // Reducer 1's prerequisite
            if (!insideExalt && reducerLevel > 0) tree.ambrosiaHyperflux = 4;
            if (talisman in liveTree) tree[talisman] = talismanLevel;
            return tree;
        };

        // The highest reducer level the game accepts (unlocked, ambrosia and blueberries), above the live one
        let reducerLevel: number | undefined;
        let note: string | undefined;
        if (options.reducers) {
            for (let level = maxLevel; level > liveLevel && reducerLevel === undefined; level--) {
                if (validate(treeWith(level, 0))) reducerLevel = level;
            }
            if (reducerLevel === undefined && liveLevel < maxLevel) {
                const exalt = insideExalt ? 'noAmbrosiaUpgrades' : 'noSingularityUpgrades';
                note = player.singularityChallenges?.[exalt]?.completions > 0
                    ? 'Singularity reducers not used: your ambrosia or blueberries can\'t pay for more of them.'
                    : `Singularity reducers not used: locked (Exalt ${insideExalt ? 5 : 1} not completed).`;
            }
        }
        if (reducerLevel === undefined) {
            // No reducer to add: the player's own level, in a tree only worth loading for Talisman Power
            if (!options.talismanAlone || !validate(treeWith(liveLevel, 0))) return { note };
            reducerLevel = liveLevel;
        }

        // Talisman Power costs no blueberries: the highest level the ambrosia left by the reducer pays for, up to
        // its maximum when it is to be raised, else up to the player's own level (so the swap doesn't lose it)
        let talismanLevel = 0;
        let highest = options.raiseTalisman
            ? configs?.[talisman]?.maxLevel ?? 0
            : player.shopUpgrades?.shopHorseShoe > 0 ? liveTalisman : 0;
        while (talismanLevel < highest) {
            const middle = talismanLevel + Math.ceil((highest - talismanLevel) / 2);
            if (validate(treeWith(reducerLevel, middle))) talismanLevel = middle;
            else highest = middle - 1;
        }
        if (reducerLevel === liveLevel && talismanLevel <= liveTalisman) return { note };

        const tree = treeWith(reducerLevel, talismanLevel);
        if (!validate(liveTree)) {
            return { note: 'Singularity reducers not used: the game would not load your current ambrosia tree back.' };
        }

        const slot = this.#slots.gameActive() ?? this.#rememberedSlotHolding(liveTree);
        if (!slot) {
            return {
                stop: 'Singularity reducers: the game marks no ambrosia loadout, and your tree is not the loadout with the silver border. '
                    + 'Load or save a loadout, then press Distribute again. Nothing was spent.'
            };
        }

        const temporaryTree = tree;
        const isLive = (expected: HSAmbrosiaTree): boolean => {
            const now = this.#readLiveTree();
            return now !== undefined && this.#isSameTree(now, expected);
        };
        return {
            note,
            swap: {
                added: reducerLevel - liveLevel,
                talismanLevel,
                talismanAdded: talismanLevel - liveTalisman,
                apply: () => this.#loadTreeThroughSlot(slot, temporaryTree) && isLive(temporaryTree),
                restore: () => isLive(liveTree) || (this.#loadTreeThroughSlot(slot, liveTree) && isLive(liveTree)),
            }
        };
    }

    #ambrosiaUpgradeConfigs(): Record<string, AmbrosiaUpgradeCalculationConfig<any> | undefined> | undefined {
        return HSModuleRegistry.getModule('HSGameDataAPI')?.ambrosia.ambrosiaUpgradeCalculationCollection as
            Record<string, AmbrosiaUpgradeCalculationConfig<any> | undefined> | undefined;
    }

    /**
     * The live tree as the game would save it ({ upgrade: level }), from what the live player has invested in
     * each upgrade: the levels themselves are not in the player object. Undefined when an amount is not the
     * exact price of a level (an upgrade the mod doesn't know, a formula changed by a game update).
     */
    #readLiveTree(): HSAmbrosiaTree | undefined {
        const upgrades = HSGlobal.exposedPlayer?.ambrosiaUpgrades as Record<string, Partial<AmbrosiaUpgradeData> | undefined> | undefined;
        const configs = this.#ambrosiaUpgradeConfigs();
        if (!upgrades || !configs) return undefined;

        const tree: HSAmbrosiaTree = {};
        for (const [key, state] of Object.entries(upgrades)) {
            // Two Mind only costs blueberries (the game reads its level the same way)
            if (key === 'twoMind') {
                tree[key] = (state?.blueberriesInvested ?? 0) > 0 ? 1 : 0;
                continue;
            }

            const invested = state?.ambrosiaInvested ?? 0;
            const config = configs[key];
            let level = 0;
            let spent = 0;
            while (config && level < config.maxLevel) {
                const cost = config.costFormula(level, config.costPerLevel);
                if (!(cost > 0) || spent + cost > invested * (1 + 1e-9)) break;
                spent += cost;
                level++;
            }
            if (!(Math.abs(invested - spent) <= invested * 1e-9)) return undefined;
            tree[key] = level;
        }
        return tree;
    }

    /** Whether a saved loadout loads as this tree. As the game does at a load, a saved level above the maximum counts as the maximum. */
    #isSameTree(saved: Record<string, unknown>, tree: HSAmbrosiaTree): boolean {
        const configs = this.#ambrosiaUpgradeConfigs();
        for (const key of new Set([...Object.keys(saved), ...Object.keys(tree)])) {
            const savedLevel = Math.min(Number(saved[key] ?? 0), configs?.[key]?.maxLevel ?? Infinity);
            if (savedLevel !== (tree[key] ?? 0)) return false;
        }
        return true;
    }

    /** The slot shown as loaded, when its saved loadout is exactly this tree. */
    #rememberedSlotHolding(tree: HSAmbrosiaTree): HTMLButtonElement | undefined {
        const slot = this.#slots.remembered();
        if (!slot || slot.style.display === 'none') return undefined;

        const slotNumber = HSAmbrosiaHelper.getSlotNumber(slot);
        const saved = slotNumber === undefined ? undefined : HSGlobal.exposedPlayer?.blueberryLoadouts?.[slotNumber];
        if (!saved || typeof saved !== 'object' || Object.keys(saved).length === 0) return undefined;
        return this.#isSameTree(saved as Record<string, unknown>, tree) ? slot : undefined;
    }

    /**
     * Loads a tree that is in no slot: it is written into this slot for the time of the click, then the slot's
     * own loadout is put back. The game reads the slot at the click and loads at once, so all of it is one
     * synchronous step, and the slot is the one the game marks afterwards. The Alert (loaded, or refused) is
     * dismissed. The player's loadout mode is put back.
     * @returns false when nothing was clicked.
     */
    #loadTreeThroughSlot(slot: HTMLButtonElement, tree: HSAmbrosiaTree, owner = 'temporaryTree'): boolean {
        const player = HSGlobal.exposedPlayer;
        const slotNumber = HSAmbrosiaHelper.getSlotNumber(slot);
        if (!player?.blueberryLoadouts || slotNumber === undefined) return false;

        const playerMode = player.blueberryLoadoutMode;
        HSAmbrosiaHelper.ensureLoadoutMode('loadTree');
        // In SAVE mode, the click would save the live tree into the slot
        if (player.blueberryLoadoutMode !== 'loadTree') return false;

        const saved = player.blueberryLoadouts[slotNumber];
        player.blueberryLoadouts[slotNumber] = { ...tree };
        try {
            HSGameDialogs.act(owner, { alert: 'dismiss' }, () => slot.click());
        } finally {
            player.blueberryLoadouts[slotNumber] = saved;
            if (playerMode === 'saveTree') HSAmbrosiaHelper.ensureLoadoutMode('saveTree');
        }
        this.#slots.treeChanged();
        return true;
    }

    // ==============================================
    // ------ A loadout for one action's time -------
    // ==============================================

    /**
     * Runs a synchronous action with a loadout loaded, then puts the player's tree back.
     * The tree comes back through a slot: the one the game marks, else the one the mod remembers when it
     * holds exactly the live tree (the game marks none after a save load, so after every singularity). With no
     * such slot the loadout is loaded all the same and stays loaded (the user's choice).
     * Unsaved changes to the tree are kept when it can be read from the live player and the game accepts it;
     * otherwise (bookmark load, older patch) the marked slot's own loadout is loaded back.
     * Manual ascension requires a validated snapshot and a slot to restore it through before it swaps.
     * The action always runs, and the player's loadout mode is put back.
     * @returns undefined when the loadout was used and the tree put back, else what happened.
     */
    runWithLoadout(loadoutSetting: string, owner: string, action: () => void,
        { requireRestore = false }: { requireRestore?: boolean } = {}): string | undefined {
        const skip = (reason: string): string => {
            action();
            return reason;
        };

        const slotId = HSAmbrosiaHelper.convertSettingLoadoutToSlot(loadoutSetting);
        const target = this.#slots.byId(slotId);
        if (!target || target.style.display === 'none') return skip(`loadout ${loadoutSetting} is locked`);

        const player = HSGlobal.exposedPlayer;
        const slotNumber = HSAmbrosiaHelper.getSlotNumber(target);
        const saved = slotNumber === undefined ? undefined : player?.blueberryLoadouts?.[slotNumber];
        if (player && (!saved || Object.keys(saved).length === 0)) return skip(`loadout ${loadoutSetting} is empty`);

        const liveTree = this.#readLiveTree();
        const backSlot = this.#slots.gameActive() ?? (liveTree ? this.#rememberedSlotHolding(liveTree) : undefined);
        // Manual ascension also checks the tree itself, in case the active slot has unsaved edits.
        const alreadyLoaded = requireRestore ? liveTree && saved && this.#isSameTree(saved, liveTree) : backSlot === target;
        if (alreadyLoaded) {
            action();
            return undefined;
        }

        // The tree is only written into a slot when the game's check (patcher) accepts it: else the slot is loaded back
        const gameValidate = window.__HS_validateBlueberryTree;
        let treeToRestore: HSAmbrosiaTree | undefined;
        if (liveTree && typeof gameValidate === 'function') {
            try { if (gameValidate(liveTree) === true) treeToRestore = liveTree; } catch { treeToRestore = undefined; }
        }
        if (requireRestore) {
            if (!backSlot || backSlot.disabled || backSlot.style.display === 'none' || !treeToRestore) {
                return skip('your current tree could not be prepared for restoration');
            }
            if (target.disabled || !saved || gameValidate?.(saved) !== true) return skip(`the game would refuse loadout ${loadoutSetting}`);
        }

        const wasSaveMode = HSAmbrosiaHelper.isLoadoutMode('saveTree');
        let result: string | undefined;
        try {
            let clicked = true;
            if (requireRestore && saved) clicked = this.#loadTreeThroughSlot(target, saved, owner);
            else this.#slots.load(target, owner);
            if (!clicked || this.#slots.gameActive() !== target) {
                // Refused by the game: the tree and the mark are as they were
                result = skip(`the game refused to load loadout ${loadoutSetting}`);
            } else {
                try {
                    action();
                } finally {
                    if (!backSlot) {
                        result = `loadout ${loadoutSetting} stays loaded (the game marked no loadout to come back to)`;
                    } else {
                        const restored = treeToRestore ? this.#loadTreeThroughSlot(backSlot, treeToRestore) : true;
                        if (!treeToRestore) this.#slots.load(backSlot, owner);
                        const restoredTree = requireRestore ? this.#readLiveTree() : undefined;
                        if (requireRestore && (!restored || !treeToRestore || !restoredTree || !this.#isSameTree(treeToRestore, restoredTree))) {
                            result = 'your previous tree could not be restored after ascending';
                        } else if (this.#slots.gameActive() !== backSlot) {
                            result = `loadout ${loadoutSetting} stays loaded (your previous loadout could not be loaded back)`;
                        }
                    }
                }
            }
        } finally {
            // In SAVE mode, the player's next slot click must still save
            if (wasSaveMode) HSAmbrosiaHelper.ensureLoadoutMode('saveTree');
        }
        return result;
    }
}
