import { HSUI } from "../../../hs-core/hs-ui";
import { HSLogger } from "../../../hs-core/hs-logger";
import { HSModuleManager } from "../../../hs-core/module/hs-module-manager";
import { escapeHtml } from "../../hs-heater/hs-heater-utils";
import type { HSUIXY } from "../../../../types/module-types/hs-ui-types";
import { buildStepTable, stepTableSummaryLines, stepTableText, type HSAutosingStepRow, type HSAutosingStepTableInfo } from "../hs-autosingStepTable";

type SortKey = 'phase' | 'step' | 'action' | 'runs' | 'ms' | 'share' | 'wait';

const HEADERS: { text: string; title: string; sort: SortKey; numeric?: boolean }[] = [
    { text: 'Phase', title: 'Click: strategy order', sort: 'phase' },
    { text: 'Step', title: 'As numbered in the strategy editor and the logs. Click: strategy order', sort: 'step', numeric: true },
    { text: 'Action', title: 'Click: by name', sort: 'action' },
    { text: 'Runs', title: 'Times per singularity. Click: most first', sort: 'runs', numeric: true },
    { text: 'ms', title: 'ms per singularity, wait included. Click: longest first', sort: 'ms', numeric: true },
    { text: '%', title: 'Part of a singularity. Click: longest first', sort: 'share', numeric: true },
    { text: 'Wait', title: "ms per singularity in the step's Wait before. Click: longest first", sort: 'wait', numeric: true },
];
const ROW_TITLES: Partial<Record<HSAutosingStepRow['kind'], string>> = {
    between: 'Exalt 2, teleport, Obtainium loadout, then waiting for an allowed stage',
    other: 'Quark export, final Ascend, pauses',
};

/**
 * Class: HSAutosingStepTimingsWindow
 * IsExplicitHSModule: No
 * Description:
 *     The window behind the run panel's 📋: where a singularity's time goes, step by step, with the setting
 *     "Record step timings" on. One window at most, with a Copy button.
 *     - Built from the recorder's timings when it opens, then at most once per singularity while it is open,
 *       and never while the tab is hidden (requestAnimationFrame). Closed, it costs nothing.
 * Author: Shewchou
 */
export class HSAutosingStepTimingsWindow {
    static readonly #context = 'HSAutosingStepTimingsWindow';
    static #modalId = "";
    static #opening = false;
    static #refreshPending = false;
    static #sort: SortKey = 'ms';
    static #getInfo: (() => HSAutosingStepTableInfo) | null = null;

    /** @param panel Where the run panel is: the window opens beside it, at its height */
    static async open(getInfo: () => HSAutosingStepTableInfo, panel: DOMRect | undefined): Promise<void> {
        const uiMod = HSModuleManager.getModule<HSUI>('HSUI');
        if (!uiMod || !uiMod.uiReady || HSAutosingStepTimingsWindow.#opening) return;
        HSAutosingStepTimingsWindow.#getInfo = getInfo;
        if (HSAutosingStepTimingsWindow.#isOpen()) {
            void uiMod.BringModalToFront(HSAutosingStepTimingsWindow.#modalId);
            HSAutosingStepTimingsWindow.#refresh();
            return;
        }

        HSAutosingStepTimingsWindow.#opening = true;
        try {
            const { position, width, height } = HSAutosingStepTimingsWindow.#placement(panel);
            HSAutosingStepTimingsWindow.#modalId = await uiMod.Modal({
                title: 'Step timings',
                position,
                // Its first size: set on the window, not its content, so that the content follows a resize.
                // Border included, so that its height is the panel's.
                styles: { width, height, boxSizing: 'border-box' },
                htmlContent: `
                    <div class="hs-step-timings">
                        <div class="hs-step-timings-top">
                            <div class="hs-step-timings-summary"></div>
                            <button type="button" class="hs-step-timings-copy" title="Copy this table as text">Copy</button>
                        </div>
                        <div class="hs-step-timings-scroll hs-scrollbar-themed">
                            <table class="hs-step-timings-table">
                                <thead><tr>${HEADERS.map(h => HSAutosingStepTimingsWindow.#headerCell(h)).join('')}</tr></thead>
                                <tbody></tbody>
                            </table>
                        </div>
                    </div>`,
                onBeforeShow: modal => {
                    HSAutosingStepTimingsWindow.#wire(modal);
                    HSAutosingStepTimingsWindow.#render(modal);
                },
            });
        } finally {
            HSAutosingStepTimingsWindow.#opening = false;
        }
    }

    /** The timings changed: redraws soon, if the window is open. */
    static requestRefresh(): void {
        if (HSAutosingStepTimingsWindow.#refreshPending || !HSAutosingStepTimingsWindow.#isOpen()) return;
        HSAutosingStepTimingsWindow.#refreshPending = true;
        window.requestAnimationFrame(() => {
            HSAutosingStepTimingsWindow.#refreshPending = false;
            HSAutosingStepTimingsWindow.#refresh();
        });
    }

    static close(): void {
        if (!HSAutosingStepTimingsWindow.#isOpen()) return;
        void HSModuleManager.getModule<HSUI>('HSUI')?.CloseModal(HSAutosingStepTimingsWindow.#modalId);
    }

    /** Right of the run panel if the window fits there, else left of it. The UI keeps it on screen. */
    static #placement(panel: DOMRect | undefined): { position: HSUIXY | undefined; width: string; height: string } {
        const width = Math.min(680, window.innerWidth * 0.9);
        if (!panel) return { position: undefined, width: `${width}px`, height: '60vh' };

        const screenMargin = 10;
        const fitsRight = panel.right + width + screenMargin <= window.innerWidth;
        return {
            position: { x: fitsRight ? panel.right : panel.left - width, y: panel.top },
            width: `${width}px`,
            height: `${Math.min(panel.height, window.innerHeight - 2 * screenMargin)}px`,
        };
    }

    static #isOpen(): boolean {
        return HSAutosingStepTimingsWindow.#modalId !== "" && !!document.getElementById(HSAutosingStepTimingsWindow.#modalId);
    }

    static #headerCell(header: typeof HEADERS[number]): string {
        return `<th${header.numeric ? ' class="hs-step-timings-num"' : ''} data-sort="${header.sort}" title="${escapeHtml(header.title)}">${header.text}</th>`;
    }

    /** Sorted by the column clicked. Where the rows that aren't steps have nothing to rank by, they stay last. */
    static #sortedRows(rows: HSAutosingStepRow[]): HSAutosingStepRow[] {
        const sorted = [...rows];
        const stepsFirst = (a: HSAutosingStepRow, b: HSAutosingStepRow) => Number(b.kind === 'step') - Number(a.kind === 'step');
        switch (HSAutosingStepTimingsWindow.#sort) {
            case 'ms':
            case 'share':
                return sorted.sort((a, b) => b.ms - a.ms);
            case 'action':
                return sorted.sort((a, b) => stepsFirst(a, b) || a.action.localeCompare(b.action, undefined, { numeric: true }));
            case 'runs':
                return sorted.sort((a, b) => stepsFirst(a, b) || b.runs - a.runs);
            case 'wait':
                return sorted.sort((a, b) => stepsFirst(a, b) || (b.waitMs ?? 0) - (a.waitMs ?? 0));
            default:
                // The rows come in the strategy's order
                return sorted;
        }
    }

    static #wire(modal: HTMLElement): void {
        modal.querySelector('.hs-step-timings-copy')?.addEventListener('click', () => void HSAutosingStepTimingsWindow.#copy());
        modal.querySelector('thead')?.addEventListener('click', event => {
            const sort = (event.target as HTMLElement).closest<HTMLElement>('[data-sort]')?.dataset.sort as SortKey | undefined;
            if (!sort) return;
            HSAutosingStepTimingsWindow.#sort = sort;
            HSAutosingStepTimingsWindow.#render(modal);
        });
    }

    static #refresh(): void {
        const modal = HSAutosingStepTimingsWindow.#modalId === "" ? null : document.getElementById(HSAutosingStepTimingsWindow.#modalId);
        if (modal) HSAutosingStepTimingsWindow.#render(modal);
    }

    static #render(modal: HTMLElement): void {
        const summary = modal.querySelector<HTMLElement>('.hs-step-timings-summary');
        const body = modal.querySelector<HTMLElement>('tbody');
        const copy = modal.querySelector<HTMLButtonElement>('.hs-step-timings-copy');
        if (!summary || !body || !copy) return;

        for (const th of modal.querySelectorAll<HTMLElement>('th[data-sort]')) {
            th.classList.toggle('hs-step-timings-sorted', th.dataset.sort === HSAutosingStepTimingsWindow.#sort);
        }

        const timings = window.__HS_autosingTimings;
        const table = timings ? buildStepTable(timings) : null;
        copy.disabled = !table || table.singularities === 0;
        if (!table) {
            summary.textContent = 'Turn on Record step timings, then start Auto-Sing.';
            body.innerHTML = '';
            return;
        }
        if (table.singularities === 0) {
            summary.textContent = 'Waiting for the first singularity to end.';
            body.innerHTML = '';
            return;
        }

        summary.textContent = stepTableSummaryLines(table).join('\n');
        // Replaced as a whole: the scroll position stays, it belongs to the table's parent
        body.innerHTML = HSAutosingStepTimingsWindow.#sortedRows(table.rows).map(row => HSAutosingStepTimingsWindow.#rowHtml(row)).join('');
    }

    static #rowHtml(row: HSAutosingStepRow): string {
        const isStep = row.kind === 'step';
        const fullAction = row.comment ? `${row.action} (${row.comment})` : row.action;
        const title = isStep ? fullAction : ROW_TITLES[row.kind] ?? '';
        const comment = row.comment ? ` <span class="hs-step-timings-comment">${escapeHtml(row.comment)}</span>` : '';
        return `<tr class="hs-step-timings-${row.kind}">`
            + `<td class="hs-step-timings-dim hs-step-timings-phase" title="${escapeHtml(row.phase)}">${escapeHtml(row.phase)}</td>`
            + `<td class="hs-step-timings-num hs-step-timings-dim">${row.step ?? ''}</td>`
            + `<td class="hs-step-timings-action" title="${escapeHtml(title)}">${escapeHtml(row.action)}${comment}</td>`
            + `<td class="hs-step-timings-num hs-step-timings-dim">${isStep ? Number(row.runs.toFixed(1)) : ''}</td>`
            + `<td class="hs-step-timings-num">${Math.round(row.ms)}</td>`
            + `<td class="hs-step-timings-num hs-step-timings-dim">${(row.share * 100).toFixed(1)}</td>`
            + `<td class="hs-step-timings-num hs-step-timings-dim">${row.waitMs === null ? '' : Math.round(row.waitMs)}</td>`
            + `</tr>`;
    }

    static async #copy(): Promise<void> {
        const timings = window.__HS_autosingTimings;
        if (!timings || !HSAutosingStepTimingsWindow.#getInfo) return;
        try {
            await navigator.clipboard.writeText(stepTableText(buildStepTable(timings), HSAutosingStepTimingsWindow.#getInfo()));
            HSUI.Notify('Step timings copied', { notificationType: 'success' });
        } catch (error) {
            HSLogger.warn(`Could not copy the step timings (${error})`, HSAutosingStepTimingsWindow.#context);
            HSUI.Notify('Failed to copy the step timings', { notificationType: 'error' });
        }
    }
}
