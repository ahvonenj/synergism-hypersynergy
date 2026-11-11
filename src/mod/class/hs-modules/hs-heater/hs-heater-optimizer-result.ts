import type {
    HeaterOptimizationResult, HeaterResultArrayKey, HeaterResultLimits,
    HeaterResultAffordableRow, HeaterResultRow, HeaterResultShortfall,
} from '../../../types/data-types/hs-heater-types';
import { getHeaterTypeEntries } from './hs-heater-result-config';

interface HeaterOptimizerRowBase {
    isMaxed: boolean;
    effectTitle?: string;
}

export interface HeaterOptimizerAffordableRow extends HeaterOptimizerRowBase {
    kind: 'affordable';
    loadoutJson: string;
    blueberryCost: number;
    cost: number;
    effect: string;
    p4x4Eq: number | 'Never' | '';
    limits?: HeaterResultLimits;
    maxedReference?: string;
}

export interface HeaterOptimizerUnaffordableRow extends HeaterOptimizerRowBase {
    kind: 'unaffordable';
    shortfall?: HeaterResultShortfall;
}

export type HeaterOptimizerRow = HeaterOptimizerAffordableRow | HeaterOptimizerUnaffordableRow;
export type HeaterOptimizerResult = Omit<HeaterOptimizationResult, HeaterResultArrayKey>
    & Partial<Record<HeaterResultArrayKey, HeaterOptimizerRow[]>>;

/** Convert winners once at the API boundary; searches never handle table-column positions. */
export function serializeHeaterOptimizerResult(result: HeaterOptimizerResult): HeaterOptimizationResult {
    // Every row field is replaced below. Metadata keeps the existing format and identity.
    const serialized = { ...result } as unknown as HeaterOptimizationResult;
    for (const [key] of getHeaterTypeEntries()) {
        const rows = result[key];
        if (rows !== undefined)
            serialized[key] = rows.map(serializeRow);
    }
    return serialized;
}

function serializeRow(row: HeaterOptimizerRow): HeaterResultRow {
    const serialized = (row.kind === 'affordable'
        ? [row.loadoutJson, null, row.blueberryCost, row.cost, row.effect, row.p4x4Eq, row.isMaxed]
        : ['Unaffordable', null, 'N / A', 'N / A', 'N / A', 'N / A', row.isMaxed]) as HeaterResultRow;
    const detail = row.kind === 'affordable' ? row.limits : row.shortfall;
    if (detail !== undefined)
        serialized[7] = detail;
    if (row.effectTitle !== undefined)
        serialized[8] = row.effectTitle;
    if (row.kind === 'affordable' && row.maxedReference !== undefined)
        (serialized as HeaterResultAffordableRow)[9] = row.maxedReference;
    return serialized;
}
