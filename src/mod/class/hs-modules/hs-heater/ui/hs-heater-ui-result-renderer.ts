import { HSTooltip } from "../../../hs-core/hs-tooltip";
import { formatNumber, HEATER_EFFECT_PAIR_SEPARATOR } from "../hs-heater-utils";
import { escapeHtml } from "../../../hs-utils/hs-escape";
import { getEffectiveHeaterIconSrc } from "../hs-heater-icon-store";
import { getHeaterResultSectionDefinitions, getHeaterTypeConfig, resolveHeaterTypeDescription, type HeaterResultSectionDef } from "../hs-heater-result-config";
import { HSHeaterResultStore, pickBestHyperfluxRowIndex, type NormalizedHeaterResultEntry } from "../hs-heater-result-store";
import type { HeaterResultAffordableRow, HeaterResultArrayKey, HeaterResultLimits, HeaterResultRow, HeaterResultShortfall, HeaterResultUnaffordableRow, HeaterShortResource } from "../../../../types/data-types/hs-heater-types";

type ResultKey = HeaterResultArrayKey;

const RESULT_COL_INDEX = {
    loadout:       0,
    blueberryCost: 2,
    cost:          3,
    effect:        4,
    p4x4:          5,
    maxed:         6,
} as const;

const RESULT_TABLE_TOTAL_COLS = 7;

const RESULTS_HELP = `The loadouts will only be as good as your inputs, this means:\n`
    + `- If you want an optimized p4x4 loadout, you need to actually have pre-AoAG inputs.\n`
    + `- Same for Obt/Off loadouts (but less problematic, so simply (un)checking the "post-aoag" input is enough).\n`
    + `- ??? (Feel free to contribute)\n\n`
    + `Hover a ✘ to see what ✔ needs (red: your levels / needed).
`
    + `Right-click an Import button or a ✘ to pin its tooltip. Esc key to un-pin all.`;

type NormalizedResultRow = {
    loadoutValue:       HeaterResultRow[typeof RESULT_COL_INDEX.loadout];
    blueberryCostValue: HeaterResultRow[typeof RESULT_COL_INDEX.blueberryCost];
    costValue:          HeaterResultRow[typeof RESULT_COL_INDEX.cost];
    effectValue:        HeaterResultRow[typeof RESULT_COL_INDEX.effect];
    p4x4Value:          HeaterResultRow[typeof RESULT_COL_INDEX.p4x4];
    maxedValue:         HeaterResultRow[typeof RESULT_COL_INDEX.maxed];
    shortfall:          HeaterResultShortfall | undefined;
    limits:             HeaterResultLimits | undefined;
    effectTitle:        string | undefined;
    maxedReference:     string | undefined;
};

function buildTypeLabelWithIcon(label: string, semanticId?: string, infoTitle = label): string {
    const safeLabel = escapeHtml(label);
    const safeInfoTitle = escapeHtml(infoTitle);
    const description = semanticId ? resolveHeaterTypeDescription(semanticId) : null;
    const effectiveIconSrc = semanticId ? getEffectiveHeaterIconSrc(semanticId) : null;
    const typeLabel = effectiveIconSrc
        ? `<button type="button" class="hs-heater-type-icon-button" data-heater-icon-id="${escapeHtml(semanticId ?? '')}" title="Alt+click to edit icon; right-click to clear override">
            <img class="hs-heater-type-icon" src="${escapeHtml(effectiveIconSrc)}" alt="" aria-hidden="true" />
            <span class="hs-heater-type-label">${safeLabel}</span>
        </button>`
        : `<span class="hs-heater-type-label">${safeLabel}</span>`;

    const infoTrigger = description
        ? `<div class="hs-heater-type-info-trigger" tabindex="0" role="note"
                ${HSTooltip.attrs(description, { title: infoTitle, delay: 0, placement: 'right' })}
                aria-label="More information about ${safeInfoTitle}">?</div>`
        : '';

    return `
        <div class="hs-heater-type-cell-content">
            ${typeLabel}
            ${infoTrigger}
        </div>`;
}

function formatCostCellValue(value: HeaterResultRow[typeof RESULT_COL_INDEX.cost | typeof RESULT_COL_INDEX.blueberryCost]): string {
    const raw = String(value).trim();
    if (!/^-?\d+$/.test(raw)) {
        return escapeHtml(String(value));
    }
    const sign = raw.startsWith("-") ? "-" : "";
    const digits = sign ? raw.slice(1) : raw;
    const groupedDigits = digits.replace(/\B(?=(\d{3})+(?!\d))/g, " ");
    return escapeHtml(`${sign}${groupedDigits}`);
}

const COMPACT_COST_UNITS: readonly (readonly [number, string])[] = [[1e9, "B"], [1e6, "M"], [1e3, "K"]];

// 105 727 028 -> 105.72M, in the browser's number format and truncated like
// formatNumber. A value under 1000, or that isn't a number, stays as it is.
function formatCompactCost(value: HeaterResultRow[typeof RESULT_COL_INDEX.cost]): string {
    const raw = String(value).trim();
    if (!/^-?\d+$/.test(raw)) return escapeHtml(String(value));
    const number = Number(raw);
    const unit = COMPACT_COST_UNITS.find(([size]) => Math.abs(number) >= size);
    if (!unit) return escapeHtml(raw);
    const compact = (number / unit[0]).toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
        roundingMode: "trunc",
    });
    return escapeHtml(`${compact}${unit[1]}`);
}

// The exact cost is in the title, when the cell shortens it
function buildAmbrosiaCostCell(value: HeaterResultRow[typeof RESULT_COL_INDEX.cost]): string {
    const compact = formatCompactCost(value);
    const exact = formatCostCellValue(value);
    return compact === exact ? `<td>${exact}</td>` : `<td title="${exact}">${compact}</td>`;
}

function normalizeArrayResultRow(row: HeaterResultRow): NormalizedResultRow {
    return {
        loadoutValue:       row[RESULT_COL_INDEX.loadout],
        blueberryCostValue: row[RESULT_COL_INDEX.blueberryCost],
        costValue:          row[RESULT_COL_INDEX.cost],
        effectValue:        row[RESULT_COL_INDEX.effect],
        p4x4Value:          row[RESULT_COL_INDEX.p4x4],
        maxedValue:         row[RESULT_COL_INDEX.maxed],
        shortfall:          row[0] === "Unaffordable" ? (row as HeaterResultUnaffordableRow)[7] : undefined,
        limits:             row[0] === "Unaffordable" ? undefined : (row as HeaterResultAffordableRow)[7],
        effectTitle:        row[0] === "Unaffordable" ? undefined : (row as HeaterResultAffordableRow)[8],
        maxedReference:     row[0] === "Unaffordable" ? undefined : (row as HeaterResultAffordableRow)[9] ?? undefined,
    };
}

// "Max SR1" + " (1/2)": the level of the type's labelLevel upgrade in the row's tree
function buildTypeLabel(entry: NormalizedHeaterResultEntry, loadoutJson: string): string {
    const labelLevel = getHeaterTypeConfig(entry.key)?.labelLevel;
    if (!labelLevel || !loadoutJson) return entry.label;
    let level = 0;
    try {
        level = Number(JSON.parse(loadoutJson)[labelLevel.upgrade] ?? 0);
    } catch {
        return entry.label;
    }
    return `${entry.label} (${level}/${labelLevel.maxLevel})`;
}

// Next to a row's ✘: the resource(s) that would raise it, either one
function buildLimitIcons(limits: HeaterResultLimits): string {
    const icons: string[] = [];
    if (limits.blueberries)
        icons.push(`<img class="hs-heater-limit-icon" src="Pictures/Default/Blueberries.png" alt="Blueberries" title="More Blueberries would raise it" />`);
    if (limits.ambrosia)
        icons.push(`<img class="hs-heater-limit-icon" src="Pictures/Default/Ambrosia.png" alt="Ambrosia" title="More Ambrosia would raise it" />`);
    return icons.join("");
}

// Next to an unaffordable row's ✘: its short resource(s), all of them needed
function buildShortfallIcons(shortfall: HeaterResultShortfall): string {
    const icons: string[] = [];
    if (shortfall.blueberries)
        icons.push(`<img class="hs-heater-limit-icon" src="Pictures/Default/Blueberries.png" alt="Blueberries" title="Not enough Blueberries" />`);
    if (shortfall.ambrosia)
        icons.push(`<img class="hs-heater-limit-icon" src="Pictures/Default/Ambrosia.png" alt="Ambrosia" title="Not enough Ambrosia" />`);
    return icons.join("");
}

// An unaffordable row's short resource: what the tree needs, "≥" for a minimum.
// The title has the exact figures, whichever way the cell writes them.
function buildShortCostCell(short: HeaterShortResource, atLeast: boolean, formatCell = formatCostCellValue): string {
    const prefix = atLeast ? "≥ " : "";
    const title = `Needs ${prefix}${formatCostCellValue(short.need)}, you have ${formatCostCellValue(short.have)}`;
    return `<td class="hs-heater-short-cost" title="${title}">${prefix}${formatCell(short.need)}</td>`;
}

function buildHeaderTooltipLabel(label: string, tooltip: string, iconHtml = ""): string {
    return `<th class="hs-heater-header-tooltip" ${HSTooltip.attrs(tooltip)}>${iconHtml}${escapeHtml(label)}</th>`;
}

function buildArraySectionHeaderRow(sectionDef: HeaterResultSectionDef): string {
    const { showP4x4, showRouting, effectHeader } = sectionDef;
    const blueberryHeader = `<img src="Pictures/Default/Blueberries.png" class="hs-heater-header-icon" />`;
    // Ambrosia.png fills its frame, Blueberries.png doesn't: drawn smaller to match
    const ambrosiaHeader = `<img src="Pictures/Default/Ambrosia.png" class="hs-heater-header-icon hs-heater-header-icon-small" />`;
    if (showRouting) {
        const splitHeader = `<th colspan="2" class="hs-heater-split-cell"><div class="hs-heater-split"><span>${escapeHtml(effectHeader)}</span><span>Routing</span></div></th>`;
        return `<tr class="hs-heater-header-row"><th>Loadout</th><th>Actions</th><th>${blueberryHeader}</th><th>${ambrosiaHeader}</th>${splitHeader}<th>Maxed</th></tr>`;
    }
    // Every p4x4 row's Effect is a cube multiplier, SR rows included
    const cubeIcon = `<img src="Pictures/Default/TinyWow3.png" class="hs-heater-header-icon hs-heater-effect-header-icon" alt="Cubes" />`;
    const effectLabel = showP4x4
        ? buildHeaderTooltipLabel(effectHeader, "Effect counts Hyperflux as if you have P4x4x50", cubeIcon)
        : `<th>${escapeHtml(effectHeader)}</th>`;
    const p4x4Label = showP4x4
        ? buildHeaderTooltipLabel("p4x4 eq", `"p4x4 eq" indicates the amount of p4x4 you need to buy for the loadout in this row to be better than the ones above it.\n`
                                            + `"★ now" marks the best one at your current P4x4.`)
        : `<th>p4x4 eq</th>`;

    return showP4x4
        ? `<tr class="hs-heater-header-row"><th>Loadout</th><th>Actions</th><th>${blueberryHeader}</th><th>${ambrosiaHeader}</th>${effectLabel}${p4x4Label}<th>Maxed</th></tr>`
        : `<tr class="hs-heater-header-row"><th>Loadout</th><th>Actions</th><th>${blueberryHeader}</th><th>${ambrosiaHeader}</th><th colspan="2">${escapeHtml(effectHeader)}</th><th>Maxed</th></tr>`;
}

// The H row that wins at the live P4x4 when the table is drawn (it's redrawn
// at each heat and slot change).
type BestHMarker = { rowIndex: number; p4x4: number };

function getBestHMarker(hyperfluxEntries: NormalizedHeaterResultEntry[] | undefined): BestHMarker | null {
    if (!hyperfluxEntries?.length) return null;
    const p4x4 = HSHeaterResultStore.getLiveP4x4();
    if (p4x4 === null) return null;
    const rowIndex = pickBestHyperfluxRowIndex(hyperfluxEntries, p4x4);
    return rowIndex < 0 ? null : { rowIndex, p4x4 };
}

function buildLoadoutActionControls(escapedFullLoadout: string, escapedLoadoutLabel: string, isValidJson: boolean): string {
    if (!isValidJson) return "";
    const copyButton = `<button class="hs-heater-copy-loadout-btn hs-heater-json-tooltip-trigger" type="button" data-loadout="${escapedFullLoadout}" data-loadout-label="${escapedLoadoutLabel}">Copy</button>`;
    const importButton = `<button class="hs-heater-import-loadout-btn" type="button" data-loadout="${escapedFullLoadout}" data-loadout-label="${escapedLoadoutLabel}">Import</button>`;
    return `${copyButton}${importButton}`;
}

// A ✘ whose row carries the reference it was compared with: hovering it
// previews that reference against the row's own tree (the Import button's
// preview, see HSHeaterUIResult). The title names the row, like Import's; the
// preview draws its ✔ green and notes Brick of Lead below its max
// (docs/features/heater.md).
function buildUnmaxedMark(rowLoadoutJson: string, referenceJson: string | undefined, rowLabel: string): string {
    if (!referenceJson) return `<span class="hs-heater-status-unmaxed">✘</span>`;
    try {
        JSON.parse(referenceJson);
    } catch {
        return `<span class="hs-heater-status-unmaxed">✘</span>`;
    }
    const label = `${rowLabel}: ✔ needs`;
    return `<span class="hs-heater-status-unmaxed hs-heater-maxed-preview-trigger"`
        + ` data-loadout="${escapeHtml(referenceJson)}" data-loadout-compare="${escapeHtml(rowLoadoutJson)}"`
        + ` data-loadout-label="${escapeHtml(label)}">✘</span>`;
}

// Obt + Off's Effect is two numbers, each after its resource's game icon
function buildEffectHtml(entry: NormalizedHeaterResultEntry, effectValue: unknown): string {
    const parts = String(effectValue).split(HEATER_EFFECT_PAIR_SEPARATOR);
    if (entry.key !== "obtAndOff" || parts.length !== 2)
        return escapeHtml(String(effectValue));
    return `<span class="hs-heater-effect-pair">`
        + `<img class="hs-heater-effect-icon" src="Pictures/Default/Obtainium.png" alt="Obtainium" />${escapeHtml(parts[0])}`
        + `<img class="hs-heater-effect-icon" src="Pictures/Default/Offering.png" alt="Offerings" />${escapeHtml(parts[1])}`
        + `</span>`;
}

// Purple rows show the Purple Reactor routing they assume, next to the effect
// (the other rows of their section have none).
// Best-routing rows also compare with the current routing and offer to apply
// theirs.
function buildPurpleRoutingHtml(entry: NormalizedHeaterResultEntry): string {
    const routing = entry.purpleRouting;
    if (!routing) return "";

    const blue = routing.blueRoutingPercent;
    const red = routing.redRoutingPercent;
    const unit = entry.key === "purpleHoney" || entry.key === "purpleHoneyOpt" ? "Purple Honey" : "Purple Ambrosia";
    const current = routing.currentRoutingPerHour;
    const tooltipLines = current === undefined
        ? [`Your current routing: Blue ${blue}% / Red ${red}%`, `≈ ${formatNumber(routing.perHour)} ${unit} / hour`]
        : [
            `Recommended routing: Blue ${blue}% / Red ${red}%`,
            `≈ ${formatNumber(routing.perHour)} ${unit} / hour`,
            `vs ${formatNumber(current)} / hour at your current routing`
                + (current > 0 ? ` (+${formatNumber((routing.perHour / current - 1) * 100)}%)` : ""),
            "Routing is global: it also changes your other loadouts' income.",
        ];
    const applyButton = current === undefined
        ? ""
        : `<button class="hs-heater-apply-routing-btn" type="button" data-blue-routing="${blue}" data-red-routing="${red}" title="Set your Purple Reactor to this routing" aria-label="Apply this routing">➜</button>`;

    const blueIcon = `<img class="hs-heater-routing-icon" src="Pictures/Default/Ambrosia.png" alt="Blue" />`;
    const redIcon = `<img class="hs-heater-routing-icon" src="Pictures/RedAmbrosia/RedAmbrosia.png" alt="Red" />`;

    return `<div class="hs-heater-purple-routing" title="${escapeHtml(tooltipLines.join("\n"))}">`
        + `${blueIcon}<span>${blue}%</span>${redIcon}<span>${red}%</span>${applyButton}</div>`;
}

function buildArraySectionDataRow(
    entry: NormalizedHeaterResultEntry,
    sectionDef: HeaterResultSectionDef,
    rowSpan: number,
    selectedSemanticIds: Set<string> = new Set(),
    bestH: BestHMarker | null = null,
): string {
    const { showP4x4, showRouting } = sectionDef;
    const rowModel = normalizeArrayResultRow(entry.rowData);
    const loadoutValue = rowModel.loadoutValue;
    const isUnaffordable = loadoutValue === "Unaffordable";
    const fullLoadout = isUnaffordable ? "" : loadoutValue;
    const escapedFullLoadout = escapeHtml(fullLoadout);
    const isValidJson = !isUnaffordable && fullLoadout.trim().startsWith("{") && fullLoadout.trim().endsWith("}");
    const actionControlsHtml = buildLoadoutActionControls(escapedFullLoadout, escapeHtml(entry.label), isValidJson);
    const isSelectedType = selectedSemanticIds.has(entry.semanticId);
    const infoTitle = getHeaterTypeConfig(entry.key)?.label ?? entry.label;
    const typeCellClass = isSelectedType ? ' class="hs-heater-selected-type-cell"' : '';

    const loadoutCell = isUnaffordable
        ? `<td>${escapeHtml(String(loadoutValue))}</td>`
        : `<td><div class="hs-heater-loadout-buttons">${actionControlsHtml}</div></td>`;
    const typeLabel = buildTypeLabel(entry, isValidJson ? fullLoadout : "");
    const resultCell = rowSpan === 1
        ? `<td${typeCellClass}>${buildTypeLabelWithIcon(typeLabel, entry.semanticId, infoTitle)}</td>`
        : entry.rowIndex === 0
            ? `<td${typeCellClass} rowspan="${rowSpan}">${buildTypeLabelWithIcon(typeLabel, entry.semanticId, infoTitle)}</td>`
            : "";
    const { shortfall } = rowModel;
    const blueberryCostCell = shortfall?.blueberries
        ? buildShortCostCell(shortfall.blueberries, shortfall.atLeast)
        : `<td>${formatCostCellValue(rowModel.blueberryCostValue)}</td>`;
    const costCell = shortfall?.ambrosia
        ? buildShortCostCell(shortfall.ambrosia, shortfall.atLeast, formatCompactCost)
        : buildAmbrosiaCostCell(rowModel.costValue);
    // Effect takes two columns, or shares them with p4x4 eq. With the routing,
    // it stays one cell, split inside (see .hs-heater-split-cell).
    const effectHtml = buildEffectHtml(entry, rowModel.effectValue);
    const effectTitle = rowModel.effectTitle ? ` title="${escapeHtml(rowModel.effectTitle)}"` : "";
    const effectCell = showRouting
        ? `<td colspan="2" class="hs-heater-split-cell"><div class="hs-heater-split"><span${effectTitle}>${effectHtml}</span>${buildPurpleRoutingHtml(entry)}</div></td>`
        : showP4x4
            ? `<td${effectTitle}>${effectHtml}</td>`
            : `<td colspan="2"${effectTitle}>${effectHtml}</td>`;
    const bestHMarker = bestH && entry.key === "hyperflux" && entry.rowIndex === bestH.rowIndex
        ? ` <span class="hs-heater-best-h-marker" title="Best H at your current P4x4 (${bestH.p4x4})">★ now</span>`
        : "";
    const p4x4Cell = showP4x4 && !showRouting ? `<td>${escapeHtml(String(rowModel.p4x4Value))}${bestHMarker}</td>` : "";
    // A row whose ✔ is set after the fact (bar income) can still carry limits: shown only on ✘
    const limitIcons = rowModel.maxedValue !== false ? ""
        : shortfall ? buildShortfallIcons(shortfall)
        : rowModel.limits ? buildLimitIcons(rowModel.limits)
        : "";
    // Max SR rows: ✔ means SR is at its max level (docs/features/heater.md)
    const maxedTitle = entry.key === "sr1" || entry.key === "sr2" ? ' title="SR at its max level, not the whole tree"' : "";
    const unmaxedMark = isValidJson ? buildUnmaxedMark(fullLoadout, rowModel.maxedReference, entry.label) : `<span class="hs-heater-status-unmaxed">✘</span>`;
    const maxCell = `<td>${rowModel.maxedValue === true ? `<span class="hs-heater-status-maxed"${maxedTitle}>✔</span>` :rowModel.maxedValue === false ? `${unmaxedMark}${limitIcons}` : escapeHtml(String(rowModel.maxedValue))}</td>`;
    // A type picked in "Your loadout order" that can't be afforded: the whole
    // row in the orange of that slot's border. An H row that wins at no P4x4
    // is dimmed, picked or not.
    const rowClass = isSelectedType && isUnaffordable ? ' class="hs-heater-selected-unaffordable-row"'
        : rowModel.p4x4Value === "Never" ? ' class="hs-heater-never-row"'
        : '';
    return `<tr${rowClass}>${resultCell}${loadoutCell}${blueberryCostCell}${costCell}${effectCell}${p4x4Cell}${maxCell}</tr>`;
}

function buildArraySectionRows(sectionDef: HeaterResultSectionDef, entriesByKey: Map<ResultKey, NormalizedHeaterResultEntry[]>, selectedSemanticIds: Set<string> = new Set(), bestH: BestHMarker | null = null): string {
    const matching = sectionDef.keys
        .filter((key) => entriesByKey.has(key))
        .map((key) => ({ key, entries: entriesByKey.get(key)! }));
    if (matching.length === 0) return "";

    // The Routing column is only there when a row has a routing to show (the
    // Purple branch was heated); the section's other rows leave it empty.
    const hasRouting = matching.some(({ entries }) => entries.some((entry) => entry.purpleRouting));
    const shownDef = sectionDef.showRouting && !hasRouting ? { ...sectionDef, showRouting: false } : sectionDef;
    const titleRow = `<tr><td colspan="${RESULT_TABLE_TOTAL_COLS}" class="hs-heater-title-row">${escapeHtml(sectionDef.title)}</td></tr>`;
    const headerRow = buildArraySectionHeaderRow(shownDef);
    const dataRows = matching
        .map(({ key, entries }) => {
            const rowSpan = entries[0].isRowBased ? 1 : entries.length;
            return entries.map((entry) => buildArraySectionDataRow(entry, shownDef, rowSpan, selectedSemanticIds, bestH)).join("");
        })
        .join("");
    return titleRow + headerRow + dataRows;
}

function buildArrayResultSection(entriesByKey: Map<ResultKey, NormalizedHeaterResultEntry[]>, selectedSemanticIds: Set<string> = new Set()): string {
    const sectionDefs = getHeaterResultSectionDefinitions();
    const bestH = getBestHMarker(entriesByKey.get("hyperflux"));
    const allRows = sectionDefs.map((sectionDef) => buildArraySectionRows(sectionDef, entriesByKey, selectedSemanticIds, bestH)).join("");
    return `
        <div class="hs-heater-results-wrapper">
            <div class="hs-heater-results-topbar">
                <div class="hs-heater-results-topbar-help" aria-label="Heater results help" tabindex="0" ${HSTooltip.attrs(RESULTS_HELP, { delay: 0 })}>?</div>
            </div>
            <table class="hs-heater-subtable hs-heater-results-table">
                <tbody>${allRows}</tbody>
            </table>
        </div>
    `;
}

function groupNormalizedResultEntriesByKey(entries: NormalizedHeaterResultEntry[]): Map<ResultKey, NormalizedHeaterResultEntry[]> {
    const map = new Map<ResultKey, NormalizedHeaterResultEntry[]>();
    for (const entry of entries) {
        const group = map.get(entry.key);
        if (group) group.push(entry);
        else map.set(entry.key, [entry]);
    }
    return map;
}

export function buildResultTableHtmlFromNormalized(normalizedEntries: NormalizedHeaterResultEntry[], selectedSemanticIds: Set<string> = new Set()): string {
    if (normalizedEntries.length === 0) return "";

    const entriesByKey = groupNormalizedResultEntriesByKey(normalizedEntries);
    return buildArrayResultSection(entriesByKey, selectedSemanticIds);
}
