/*
    GQ Distributor: the allocation rule.
    Pure functions: no DOM, no game access.
    Author: Shewchou
*/

export interface GQPlanUpgrade {
    id: string;
    /** The player's ratio for this upgrade. 0: left out. */
    weight: number;
    /** GQ already invested in it. */
    invested: number;
    /** False: it takes part in the allocation, but its share is not spent ("Keep the share of skipped upgrades"). */
    buyable: boolean;
}

export interface GQPlan {
    /** The whole GQ balance, rounded down. */
    budget: number;
    /** GQ to spend on each upgrade (0 for the ones not buyable). */
    spendById: Map<string, number>;
    total: number;
}

/**
 * Splits the GQ balance between the upgrades following their weights, in whole GQ.
 * balanceInvestments off: only the balance is split, in proportion to the weights (past investments can dwarf it).
 * On: the final invested totals track the weights, without taking anything from upgrades already over their target.
 * undefined: nothing to spend (no weight above 0, or less than 1 GQ).
 */
export function planGQDistribution(upgrades: GQPlanUpgrade[], gqBalance: number, balanceInvestments: boolean): GQPlan | undefined {
    const budget = Math.max(0, Math.floor(gqBalance));
    const entries = upgrades.filter(upgrade => upgrade.weight > 0);
    if (entries.length === 0 || budget <= 0) return undefined;

    const additionalAmounts = balanceInvestments
        ? balancedAmounts(entries, budget)
        : proportionalAmounts(entries, budget);

    // Largest-remainder rounding: the floors, then one more GQ to each of the largest fractions until the budget is used
    const exactAdditional = entries.map((entry, idx) => {
        const additional = additionalAmounts[idx];
        return {
            entry,
            floorAdditional: Math.floor(additional),
            fraction: additional - Math.floor(additional)
        };
    });
    const floorTotal = exactAdditional.reduce((sum, amount) => sum + amount.floorAdditional, 0);
    let remaining = Math.max(0, budget - floorTotal);
    const byFractionDesc = [...exactAdditional].sort((a, b) => b.fraction - a.fraction);
    for (let i = 0; i < byFractionDesc.length && remaining > 0; i++) {
        byFractionDesc[i].floorAdditional += 1;
        remaining -= 1;
    }

    const spendById = new Map<string, number>(
        exactAdditional.map(amount => [amount.entry.id, amount.entry.buyable ? amount.floorAdditional : 0])
    );
    const total = [...spendById.values()].reduce((sum, spend) => sum + spend, 0);
    return { budget, spendById, total };
}

function proportionalAmounts(entries: GQPlanUpgrade[], budget: number): number[] {
    const largestWeight = Math.max(...entries.map(entry => entry.weight));
    const weightSum = entries.reduce((sum, entry) => sum + entry.weight / largestWeight, 0);
    return entries.map(entry => budget * (entry.weight / largestWeight / weightSum));
}

/**
 * Water-filling: the upgrades over their target (invested above lambda x weight) drop out until lambda settles,
 * then the others are filled up to lambda x weight.
 */
function balancedAmounts(entries: GQPlanUpgrade[], budget: number): number[] {
    const targetTotalInvested = entries.reduce((sum, entry) => sum + entry.invested, 0) + budget;
    let activeIndices = entries.map((_, idx) => idx);
    let activeWeightSum = entries.reduce((sum, entry) => sum + entry.weight, 0);
    let inactiveInvestedSum = 0;

    while (activeIndices.length > 0 && activeWeightSum > 0) {
        const lambda = (targetTotalInvested - inactiveInvestedSum) / activeWeightSum;
        const newlyInactive = activeIndices.filter(idx => entries[idx].invested > lambda * entries[idx].weight);

        if (newlyInactive.length === 0) break;
        const newlyInactiveSet = new Set<number>(newlyInactive);
        for (const idx of newlyInactive) {
            inactiveInvestedSum += entries[idx].invested;
            activeWeightSum -= entries[idx].weight;
        }
        activeIndices = activeIndices.filter(idx => !newlyInactiveSet.has(idx));
    }

    const activeSet = new Set<number>(activeIndices);
    const lambda = activeWeightSum > 0
        ? (targetTotalInvested - inactiveInvestedSum) / activeWeightSum
        : 0;

    return entries.map((entry, idx) => {
        const targetFinalInvested = activeSet.has(idx)
            ? Math.max(entry.invested, lambda * entry.weight)
            : entry.invested;
        return Math.max(0, targetFinalInvested - entry.invested);
    });
}
