/*
    Hepteracts: capacities, the live read, and the walk that fills and expands.
    Shared by HSHepteracts and the Hepteract Distributor. Pure functions: no DOM, no game access (the caller
    passes the live player), so the Distributor's planner can use them headless.
    Author: Shewchou
*/

import type { HepteractKeys } from "../../../types/data-types/hs-player-savedata";

/** From the game's Hepteracts.ts: BASE_CAP, and HEPTERACT_CONVERSION (hepteracts for one unit, before the singularity debuff). */
export const HEPTERACT_DATA: Record<HepteractKeys, { baseCapacity: number, conversion: number }> = {
    chronos: { baseCapacity: 1000, conversion: 1e4 },
    hyperrealism: { baseCapacity: 1000, conversion: 1e4 },
    quark: { baseCapacity: 1000, conversion: 1e4 },
    challenge: { baseCapacity: 1000, conversion: 5e4 },
    abyss: { baseCapacity: 1, conversion: 1e8 },
    accelerator: { baseCapacity: 1000, conversion: 1e5 },
    acceleratorBoost: { baseCapacity: 1000, conversion: 2e5 },
    multiplier: { baseCapacity: 1000, conversion: 3e5 },
};

export interface HepteractCapacities {
    /** What an expansion consumes (the game's getHepteractCap). */
    baseCapacity: number;
    /** The top of the meter (the game's getFinalHepteractCap): doubled by the limitedAscensions reward. */
    finalCapacity: number;
}

export interface HepteractState extends HepteractCapacities {
    balance: number;
}

export function hepteractCapacities(key: HepteractKeys, timesCapacityExtended: number, hasDoubleCapacity: boolean): HepteractCapacities {
    const baseCapacity = Math.pow(2, Math.max(0, Math.floor(timesCapacityExtended))) * HEPTERACT_DATA[key].baseCapacity;
    return { baseCapacity, finalCapacity: baseCapacity * (hasDoubleCapacity ? 2 : 1) };
}

/**
 * A hepteract's exact balance and capacities from the live player object (HSGlobal.exposedPlayer).
 * The game's display cuts numbers to 3 digits above 1e6.
 * @returns null without a live player (unpatched game), or when a value can't be read.
 */
export function readHepteract(player: any, key: HepteractKeys): HepteractState | null {
    const hepteract = player?.hepteracts?.[key];
    const completions = player?.singularityChallenges?.limitedAscensions?.completions;
    const balance = hepteract?.BAL;
    const timesCapacityExtended = hepteract?.TIMES_CAP_EXTENDED;
    if (typeof balance !== 'number' || !Number.isFinite(balance)
        || typeof timesCapacityExtended !== 'number' || !Number.isFinite(timesCapacityExtended)
        || typeof completions !== 'number') {
        return null;
    }

    const capacities = hepteractCapacities(key, timesCapacityExtended, completions > 0);
    if (!Number.isFinite(capacities.finalCapacity)) return null;
    return { balance, ...capacities };
}

/** An expansion, as the game does it: the base capacity is consumed, and both capacities double. */
export function expandHepteract(state: HepteractState): void {
    state.balance = Math.max(0, state.balance - state.baseCapacity);
    state.baseCapacity *= 2;
    state.finalCapacity *= 2;
}

/**
 * Units to craft for a hepteract to hold `requiredBalance`: fill to the top, expand, and again until the
 * capacity is enough (as the game's autoCraftHepteracts). With the double capacity reward, an expansion keeps
 * a quarter of the new top.
 */
export function hepteractUnitsToReach(from: HepteractState, requiredBalance: number): number {
    if (requiredBalance <= from.balance) return 0;

    const state: HepteractState = { ...from, balance: Math.max(0, from.balance) };
    let units = 0;
    while (requiredBalance > state.finalCapacity) {
        const fill = Math.max(0, state.finalCapacity - state.balance);
        units += fill;
        state.balance += fill;
        expandHepteract(state);
        if (!Number.isFinite(units) || !Number.isFinite(state.finalCapacity)) return Number.POSITIVE_INFINITY;
    }
    return units + Math.max(0, requiredBalance - state.balance);
}
