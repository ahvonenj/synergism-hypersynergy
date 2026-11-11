import { buildHeaterTypeSemanticId, getHeaterTypeConfig, getHeaterTypeRowCount, HEATER_BEST_H_SEMANTIC_ID, resolveHeaterTypeLabel } from "./hs-heater-result-config";
import type { HeaterOptimizationResult, HeaterPurpleRoutedResultKey, HeaterResultArrayKey, HeaterTypeSemanticId, NormalizedHeaterResultEntry } from "../../../types/data-types/hs-heater-types";
import { HSGlobal } from "../../hs-core/hs-global";
import { HSModuleRegistry } from "../../hs-core/module/hs-module-registry";

export type { NormalizedHeaterResultEntry } from "../../../types/data-types/hs-heater-types";

type ResultKey = HeaterResultArrayKey;

// ================================================================
// Result normalization / transformation
// ================================================================

export function normalizeHeaterOptimizationResult(
    result: HeaterOptimizationResult
): NormalizedHeaterResultEntry[] {
    const normalizedEntries: NormalizedHeaterResultEntry[] = [];
    const resultEntries = Object.entries(result)
        .filter(([key]) => key !== "input") as Array<[ResultKey, HeaterOptimizationResult[ResultKey]]>;

    for (const [key, value] of resultEntries) {
        if (!Array.isArray(value) || value.length === 0 || !Array.isArray(value[0])) {
            continue;
        }

        const config = getHeaterTypeConfig(key);
        if (!config) continue;

        const rowCount = getHeaterTypeRowCount(key);
        const isRowBased = rowCount > 1;

        if (isRowBased) {
            for (let rowIndex = 0; rowIndex < value.length; rowIndex++) {
                const semanticId = buildHeaterTypeSemanticId(key, rowIndex);
                const label = resolveHeaterTypeLabel(semanticId);
                if (!label) continue;
                normalizedEntries.push({
                    semanticId,
                    label,
                    section: config.section,
                    rowData: value[rowIndex],
                    key,
                    rowIndex,
                    isRowBased: true,
                });
            }
        } else {
            const semanticId = buildHeaterTypeSemanticId(key);
            const label = resolveHeaterTypeLabel(semanticId) ?? String(semanticId);
            normalizedEntries.push({
                semanticId,
                label,
                section: config.section,
                rowData: value[0],
                key,
                rowIndex: 0,
                isRowBased: false,
                purpleRouting: result.purpleRouting?.[key as HeaterPurpleRoutedResultKey],
            });
        }
    }

    return normalizedEntries;
}

/**
 * The Hyperflux row that wins at this P4x4 level: the highest row whose
 * "p4x4 eq" is reached. A row beats the rows above it from its p4x4 eq on;
 * a row that never wins shows "Never", an unaffordable one "N / A".
 * -1 when no row qualifies.
 */
export function pickBestHyperfluxRowIndex(entries: NormalizedHeaterResultEntry[], p4x4: number): number {
    let best = -1;
    for (const entry of entries) {
        const p4x4Eq = entry.rowData[5];
        if (typeof p4x4Eq === "number" && p4x4Eq <= p4x4 && entry.rowIndex > best) best = entry.rowIndex;
    }
    return best;
}

export type HeaterBestHPick = { rowIndex: number; semanticId: HeaterTypeSemanticId; p4x4: number };

// ================================================================
// Result store / selected semantic ID helpers
// ================================================================

export class HSHeaterResultStore {
    static #currentNormalizedResult: NormalizedHeaterResultEntry[] | null = null;
    static #currentRawResult: HeaterOptimizationResult | null = null;

    static getCurrentNormalizedResult(): NormalizedHeaterResultEntry[] | null {
        return this.#currentNormalizedResult;
    }

    static getCurrentRawResult(): HeaterOptimizationResult | null {
        return this.#currentRawResult;
    }

    /** P4x4 level now: the live player, else the last GDS save. It resets at every singularity. */
    static getLiveP4x4(): number | null {
        const live = HSGlobal.exposedPlayer?.platonicUpgrades?.[19];
        if (typeof live === "number") return live;
        const saved = HSModuleRegistry.getModule("HSGameDataAPI")?.getGameData()?.platonicUpgrades?.[19];
        return typeof saved === "number" ? saved : null;
    }

    /** The H row that wins at the live P4x4, or null (branch not heated, P4x4 unknown, no affordable row). */
    static getBestHyperfluxPick(): HeaterBestHPick | null {
        const entries = this.#currentNormalizedResult?.filter((entry) => entry.key === "hyperflux");
        if (!entries?.length) return null;
        const p4x4 = this.getLiveP4x4();
        if (p4x4 === null) return null;
        const rowIndex = pickBestHyperfluxRowIndex(entries, p4x4);
        if (rowIndex < 0) return null;
        return { rowIndex, semanticId: buildHeaterTypeSemanticId("hyperflux", rowIndex), p4x4 };
    }

    /**
     * "Best H" → the H row it stands for right now; any other id as is.
     * With every H row unaffordable it's H0 (shown as unaffordable); with no
     * H rows or no P4x4 it stays "Best H", which no result row matches.
     */
    static resolveSemanticId(semanticId: string): string {
        if (semanticId !== HEATER_BEST_H_SEMANTIC_ID) return semanticId;
        const pick = this.getBestHyperfluxPick();
        if (pick) return pick.semanticId;
        const hasHyperfluxRows = this.#currentNormalizedResult?.some((entry) => entry.key === "hyperflux") ?? false;
        return hasHyperfluxRows && this.getLiveP4x4() !== null ? buildHeaterTypeSemanticId("hyperflux", 0) : semanticId;
    }

    static isSemanticIdAvailable(semanticId: string): boolean {
        const normalizedResult = this.getCurrentNormalizedResult();
        if (!normalizedResult) return false;
        const resolved = this.resolveSemanticId(semanticId);
        return normalizedResult.some((entry) => String(entry.semanticId) === resolved);
    }

    /** In the results, but as an "Unaffordable" row: there is no loadout to import. */
    static isSemanticIdUnaffordable(semanticId: string): boolean {
        return this.getLoadoutJsonBySemanticId(semanticId) === 'Unaffordable';
    }

    static collectSelectedSemanticIds(modal: HTMLElement, options?: { enabledOnly?: boolean }): Set<string> {
        const typeSelects = Array.from(modal.querySelectorAll('.hs-heater-type-select')) as HTMLSelectElement[];
        const typeCheckboxes = Array.from(modal.querySelectorAll('.hs-heater-type-select-checkbox')) as HTMLInputElement[];
        const enabledOnly = options?.enabledOnly ?? false;
        const selectedSemanticIds = new Set<string>();

        for (let i = 0; i < typeSelects.length; i++) {
            const semanticId = (typeSelects[i].value || '').trim();
            if (!semanticId || semanticId === 'none') continue;
            if (enabledOnly) {
                const checkbox = typeCheckboxes[i];
                if (!checkbox?.checked) continue;
            }
            selectedSemanticIds.add(this.resolveSemanticId(semanticId));
        }

        return selectedSemanticIds;
    }

    static setResultFromRaw(result: HeaterOptimizationResult): void {
        this.#currentRawResult = result;
        this.#currentNormalizedResult = normalizeHeaterOptimizationResult(result);
    }

    static clearCurrentNormalizedResult(): void {
        this.#currentNormalizedResult = null;
        this.#currentRawResult = null;
    }

    static getLoadoutJsonBySemanticId(semanticId: string): string | null {
        if (!this.#currentNormalizedResult) return null;
        const resolved = this.resolveSemanticId(semanticId);
        const entry = this.#currentNormalizedResult.find((item) => item.semanticId === resolved);
        const loadoutJson = entry?.rowData?.[0];
        return typeof loadoutJson === 'string' ? loadoutJson : null;
    }
}
