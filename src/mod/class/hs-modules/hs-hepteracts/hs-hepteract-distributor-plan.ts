/*
    Hepteract Distributor: the planning rule.
    Pure functions: no DOM, no game access (also run headless, against a copy of the game's auto-craft).
    Author: Shewchou
*/

import { expandHepteract, HepteractState } from "./hs-hepteract-state";

export interface HepteractPlanType extends HepteractState {
    key: string;
    /**
     * What this type's balance should be worth in hepteracts (balance x unitCost), compared with the other types'
     * ratios. 0: left alone.
     */
    ratio: number;
    /** Hepteracts for one unit, singularity debuff included (the same factor for every type). */
    unitCost: number;
}

export interface HepteractPlanState {
    hepteracts: number;
    types: HepteractPlanType[];
}

/** One step for one type: an expansion if its meter is full, then a craft. */
export interface HepteractPlanStep {
    key: string;
    expand: boolean;
    craft: number;
    /** The craft stops below the top of the meter (only with partly filled meters allowed). */
    partial: boolean;
}

export interface HepteractPlanWait {
    key: string;
    hepteractsNeeded: number;
}

/** What a whole distribution gives one type, and the state it ends in. */
export interface HepteractPlanTarget extends HepteractState {
    key: string;
    /** Units to craft in all, over its steps. */
    units: number;
    /** Its last step is a partial one: it then takes whatever is left, and is the last type crafted. */
    partial: boolean;
}

export interface HepteractPlan {
    /** In crafting order: a type with a partial last step comes last. */
    targets: HepteractPlanTarget[];
    /** The type furthest behind its ratio at the end, which can't pay its next step. */
    waitingFor?: HepteractPlanWait;
    hepteractsLeft: number;
    steps: number;
}

// A distribution from an empty forge with a huge stock takes several hundred steps
const MAX_STEPS = 5000;
// The game's auto-craft stops on a full meter as long as what is left can't pay back one more expansion, which
// takes at least a third more than the planned cost: 5% above it absorbs a cost slightly off (the cost check
// allows 1%) without ever reaching that
const AMOUNT_MARGIN = 1.05;

/**
 * The next step towards the ratios: the type furthest behind its ratio (lowest balance x unitCost / ratio, what
 * its balance is worth in hepteracts) gets its meter filled to the top, after an expansion when it is already full.
 * When that type can't pay for it, nothing is given to the others (they would end far above their ratio).
 * With allowPartial, what is left goes into it anyway: it only expands when at least what the expansion consumes
 * can be crafted back, as the game's Auto does, so a balance never goes down.
 */
export function nextHepteractStep(state: HepteractPlanState, allowPartial: boolean): { step?: HepteractPlanStep, waitingFor?: HepteractPlanWait } {
    let behind: HepteractPlanType | undefined;
    let behindLevel = Infinity;
    for (const type of state.types) {
        const level = type.balance * type.unitCost / type.ratio;
        if (type.ratio > 0 && level < behindLevel) {
            behind = type;
            behindLevel = level;
        }
    }
    if (!behind) return {};

    const full = behind.balance >= behind.finalCapacity;
    const balanceAfterExpand = full ? Math.max(0, behind.balance - behind.baseCapacity) : behind.balance;
    const top = full ? behind.finalCapacity * 2 : behind.finalCapacity;
    const needed = Math.ceil(top - balanceAfterExpand);
    // As the game counts what a stock can craft
    const affordable = Math.floor(state.hepteracts / behind.unitCost);

    if (needed <= affordable) return { step: { key: behind.key, expand: full, craft: needed, partial: false } };
    if (allowPartial && affordable > 0 && (!full || affordable >= behind.baseCapacity)) {
        return { step: { key: behind.key, expand: full, craft: affordable, partial: true } };
    }
    return { waitingFor: { key: behind.key, hepteractsNeeded: needed * behind.unitCost } };
}

/** Applies a step to a state, as the game does. */
export function applyHepteractStep(state: HepteractPlanState, step: HepteractPlanStep): void {
    const type = state.types.find(candidate => candidate.key === step.key);
    if (!type) return;
    if (step.expand) expandHepteract(type);
    type.balance += step.craft;
    state.hepteracts = Math.max(0, state.hepteracts - step.craft * type.unitCost);
}

/**
 * A whole distribution: nextHepteractStep until no step is left, on a copy of the state.
 * A partial step ends it: its type is crafted last and takes all that is left, so a plan never holds two.
 */
export function planHepteractDistribution(state: HepteractPlanState, allowPartial: boolean): HepteractPlan {
    const working: HepteractPlanState = { hepteracts: state.hepteracts, types: state.types.map(type => ({ ...type })) };
    const units = new Map<string, number>();
    let partialKey: string | undefined;
    let waitingFor: HepteractPlanWait | undefined;
    let steps = 0;

    for (; steps < MAX_STEPS; steps++) {
        const next = nextHepteractStep(working, allowPartial);
        if (!next.step) {
            waitingFor = next.waitingFor;
            break;
        }
        applyHepteractStep(working, next.step);
        units.set(next.step.key, (units.get(next.step.key) ?? 0) + next.step.craft);
        if (next.step.partial) {
            partialKey = next.step.key;
            waitingFor = nextHepteractStep(working, false).waitingFor;
            steps++;
            break;
        }
    }

    const targets = [...units].map(([key, total]): HepteractPlanTarget => {
        const type = working.types.find(candidate => candidate.key === key)!;
        return {
            key,
            units: total,
            balance: type.balance,
            baseCapacity: type.baseCapacity,
            finalCapacity: type.finalCapacity,
            partial: key === partialKey,
        };
    });
    targets.sort((a, b) => Number(a.partial) - Number(b.partial));

    return { targets, waitingFor, hepteractsLeft: working.hepteracts, steps };
}

/** The hepteracts to give a target's Auto at its ascension: all that is left for a partial one, else its cost with the margin. */
export function hepteractCraftAmount(target: HepteractPlanTarget, spendable: number, unitCost: number): number {
    return target.partial ? spendable : Math.min(spendable, (target.units * AMOUNT_MARGIN + 0.5) * unitCost);
}
