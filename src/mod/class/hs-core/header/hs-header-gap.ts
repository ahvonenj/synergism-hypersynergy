const EMPTY_CLASS = 'hs-header-gap-empty';
const LAST_CLASS = 'hs-header-gap-last';
const MARGIN_PROPERTY = '--hs-header-gap-margin';
const MEASURING_ATTRIBUTE = 'data-hs-header-gap-measuring';

interface GapRegion { element: HTMLElement; modules: HTMLElement[]; }
interface GapLayout { empty: Set<HTMLElement>; last?: HTMLElement; margin?: string; }

/**
 * Class: HSHeaderGap
 * IsExplicitHSModule: No
 * Description: Collapses space below the header modules and preserves their layout cells.
 * Author: XxMolkxX
 */
export class HSHeaderGap {
    static #enabled = false;
    static #frame?: number;
    static #needsProbe = false;
    static #observer?: MutationObserver;
    static #resize?: ResizeObserver;
    static #regions = new WeakSet<HTMLElement>();
    static #modules = new WeakSet<HTMLElement>();
    static readonly #REGION_IDS = ['ascensionStats', 'headerGrid', 'quickbarsRow'];

    static setEnabled(enabled: boolean): void {
        HSHeaderGap.#enabled = enabled;
        document.documentElement.classList.toggle('hs-remove-header-gap', enabled);
        HSHeaderGap.#observer?.disconnect();
        HSHeaderGap.#resize?.disconnect();
        if (HSHeaderGap.#frame !== undefined) cancelAnimationFrame(HSHeaderGap.#frame);
        HSHeaderGap.#frame = undefined;
        HSHeaderGap.#needsProbe = false;
        if (!enabled) {
            for (const id of HSHeaderGap.#REGION_IDS) {
                const region = document.getElementById(id);
                if (region) HSHeaderGap.#setSpacing(region, false);
            }
            return;
        }
        const header = document.getElementById('mainHeader');
        if (!header) return;
        HSHeaderGap.#regions = new WeakSet();
        HSHeaderGap.#modules = new WeakSet();
        HSHeaderGap.#observer = new MutationObserver(records => {
            let refresh = false;
            for (const { type, target, addedNodes, removedNodes } of records) {
                // A collapsed quickbar also observes its children for buttons becoming available.
                if (type === 'childList' && ![...addedNodes, ...removedNodes].some(node => node instanceof Element)) continue;
                refresh = true;
                if (type === 'childList' || target === header || target === document.documentElement
                    || (target instanceof Element && target.closest(`.${EMPTY_CLASS}`))) {
                    HSHeaderGap.#schedule(true);
                    return;
                }
            }
            if (refresh) HSHeaderGap.#schedule();
        });
        HSHeaderGap.#resize = new ResizeObserver(() => HSHeaderGap.#schedule());
        HSHeaderGap.#observer.observe(header, { childList: true, attributes: true, attributeFilter: ['class'] });
        HSHeaderGap.#observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class', 'data-mobile'] });
        HSHeaderGap.#schedule(true);
    }

    static #schedule(needsProbe = false): void {
        if (!HSHeaderGap.#enabled) return;
        HSHeaderGap.#needsProbe ||= needsProbe;
        if (HSHeaderGap.#frame !== undefined) return;
        HSHeaderGap.#frame = requestAnimationFrame(() => {
            HSHeaderGap.#frame = undefined;
            HSHeaderGap.#refresh();
        });
    }

    static #refresh(): void {
        const header = document.getElementById('mainHeader');
        if (!HSHeaderGap.#enabled || !header) return;
        const needsProbe = HSHeaderGap.#needsProbe;
        HSHeaderGap.#needsProbe = false;
        const regions: GapRegion[] = [];
        for (const id of HSHeaderGap.#REGION_IDS) {
            const region = document.getElementById(id);
            if (!region) continue;
            if (!HSHeaderGap.#regions.has(region)) {
                HSHeaderGap.#regions.add(region);
                HSHeaderGap.#watchRegion(region, region.classList.contains(EMPTY_CLASS));
                HSHeaderGap.#resize?.observe(region);
            }
            const modules = id === 'quickbarsRow' ? Array.from(region.children).filter((el): el is HTMLElement => el instanceof HTMLElement)
                : Array.from(region.querySelectorAll<HTMLElement>('.headerModule'));
            for (const module of modules) {
                if (!HSHeaderGap.#modules.has(module)) {
                    HSHeaderGap.#modules.add(module);
                    HSHeaderGap.#resize?.observe(module);
                    HSHeaderGap.#observer?.observe(module, {
                        attributes: true, attributeFilter: ['class', 'data-size', 'data-hs-header-vertical', 'hidden', 'style'],
                    });
                }
            }
            regions.push({ element: region, modules });
        }

        const editing = header.classList.contains('headerEditMode');
        // A structural change can reveal a collapsed region or put another row after the old last row.
        const probe = !editing && needsProbe && regions.some(({ element }) =>
            element.classList.contains(EMPTY_CLASS) || (element.classList.contains(LAST_CLASS)
                && element.style.getPropertyValue(MARGIN_PROPERTY) !== '0px'));
        if (probe) header.setAttribute(MEASURING_ATTRIBUTE, '');
        let layout: GapLayout | undefined;
        try {
            if (!editing) layout = HSHeaderGap.#measure(regions);
        } finally {
            if (probe) header.removeAttribute(MEASURING_ATTRIBUTE);
        }

        let collapsedChanged = false;
        for (const { element } of regions) {
            const empty = layout?.empty.has(element) ?? false;
            const margin = layout?.last === element ? layout.margin : undefined;
            if (HSHeaderGap.#setSpacing(element, empty, margin)) {
                collapsedChanged = true;
                HSHeaderGap.#watchRegion(element, empty);
            }
        }
        // Collapsing a row can shift another row without changing its dimensions.
        if (collapsedChanged && !editing) HSHeaderGap.#schedule();
    }

    static #watchRegion(region: HTMLElement, empty: boolean): void {
        const watchCollapsedQuickbar = region.id === 'quickbarsRow' && empty;
        HSHeaderGap.#observer?.observe(region, watchCollapsedQuickbar ? {
            childList: true, subtree: true, attributes: true, attributeFilter: ['hidden', 'style'],
        } : { childList: true });
    }

    static #measure(regions: GapRegion[]): GapLayout {
        const empty = new Set<HTMLElement>();
        let last: { element: HTMLElement; bottom: number } | undefined;
        let contentBottom = -Infinity;
        for (const { element, modules } of regions) {
            let occupied = false;
            for (const module of modules) {
                const box = module.getBoundingClientRect();
                // Count reserved challenge cells even while hidden so the tabs stay put between challenges.
                if (!box.width || !box.height) continue;
                occupied = true;
                contentBottom = Math.max(contentBottom, box.bottom);
            }
            if (!occupied) {
                empty.add(element);
                continue;
            }
            const bottom = element.getBoundingClientRect().bottom;
            if (!last || bottom >= last.bottom) last = { element, bottom };
        }
        return last ? { empty, last: last.element, margin: `${contentBottom - last.bottom}px` } : { empty };
    }

    static #setSpacing(region: HTMLElement, empty: boolean, margin?: string): boolean {
        const emptyChanged = region.classList.contains(EMPTY_CLASS) !== empty;
        if (emptyChanged) region.classList.toggle(EMPTY_CLASS, empty);
        const last = margin !== undefined;
        if (region.classList.contains(LAST_CLASS) !== last) region.classList.toggle(LAST_CLASS, last);
        const current = region.style.getPropertyValue(MARGIN_PROPERTY);
        if (margin !== undefined) {
            if (current !== margin) region.style.setProperty(MARGIN_PROPERTY, margin);
        } else if (current) {
            region.style.removeProperty(MARGIN_PROPERTY);
        }
        return emptyChanged;
    }
}
