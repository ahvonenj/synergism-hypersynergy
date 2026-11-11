import { HSGlobal } from '../hs-global';

export interface HSHeaderButtonLayout {
    regions: Record<string, string[][]>;
    positions: Record<string, number>;
    hidden: string[];
}

export interface HSHeaderButtonDropTarget { index: number; join: boolean; }

/** Button slots share the game's renderer, drag targets and capacity; the patch lets that capacity follow the grid. */
export class HSHeaderButtons {
    static #capacity = 4;
    static #installed = false;
    static #renderQueued = false;
    static #pointer?: { x: number; y: number };

    static install(): void {
        if (HSHeaderButtons.#installed) return;
        HSHeaderButtons.#installed = true;
        if (window.__HS_HEADER_BUTTONS_PATCHED) {
            window.__HS_headerButtonCapacity = () => HSHeaderButtons.#capacity;
            window.__HS_canJoinHeaderButtons = (slot, id) => HSHeaderButtons.#canJoin(slot, id);
            window.__HS_moveHeaderButton = (layout, id, region, target) => HSHeaderButtons.#move(layout, id, region, target);
        }
        const header = document.getElementById('mainHeader');
        const rememberPointer = (event: PointerEvent) => {
            if (header?.classList.contains('headerEditMode')) HSHeaderButtons.#pointer = { x: event.clientX, y: event.clientY };
        };
        for (const type of ['pointerdown', 'pointermove', 'pointerup']) header?.addEventListener(type, rememberPointer as EventListener, true);
        const grid = document.getElementById('headerGrid');
        if (grid) new ResizeObserver(() => HSHeaderButtons.refresh()).observe(grid);
        HSHeaderButtons.refresh();
    }

    static refresh(): void {
        if (!HSHeaderButtons.#installed) return;
        const grid = document.getElementById('headerGrid');
        const header = document.getElementById('mainHeader');
        if (!grid || !header) return;

        const style = getComputedStyle(grid);
        const columns = Number.parseInt(style.getPropertyValue('--header-grid-columns'), 10)
            || (document.documentElement.dataset.mobile === 'true' ? 2 : 7);
        const gap = Number.parseFloat(style.columnGap) || 0;
        const cellWidth = (grid.clientWidth - gap * (columns - 1)) / columns;
        let buttonWidth = 0;
        for (const button of header.querySelectorAll<HTMLElement>('.resetbtn.headerModule')) {
            const width = button.getBoundingClientRect().width;
            if (!width) continue;
            const buttonStyle = getComputedStyle(button);
            const margins = (Number.parseFloat(buttonStyle.marginLeft) || 0) + (Number.parseFloat(buttonStyle.marginRight) || 0);
            // Aligned groups use a 5px gap in place of the game's 5px button margin.
            buttonWidth = Math.max(buttonWidth, width + Math.max(5, margins));
        }
        if (window.__HS_HEADER_BUTTONS_PATCHED && cellWidth > 0 && buttonWidth > 0) {
            // There are eight native reset buttons. Existing larger groups wrap when the window gets narrower.
            const capacity = Math.max(1, Math.min(8, Math.floor(cellWidth / buttonWidth)));
            if (capacity !== HSHeaderButtons.#capacity) {
                HSHeaderButtons.#capacity = capacity;
                if (!HSHeaderButtons.#renderQueued) {
                    HSHeaderButtons.#renderQueued = true;
                    requestAnimationFrame(() => {
                        HSHeaderButtons.#renderQueued = false;
                        window.__HS_renderHeaderLayout?.();
                    });
                }
            }
        }

        if (!header.classList.contains('headerEditMode')) HSHeaderButtons.#pointer = undefined;
        const key = document.documentElement.dataset.mobile === 'true' ? 'mobile' : 'desktop';
        const positions = (HSGlobal.exposedPlayer as { headerLayouts?: Record<string, { positions?: Record<string, number> }> } | null)
            ?.headerLayouts?.[key]?.positions;
        const positionOf = (button: HTMLElement): number => positions?.[button.id] ?? Number(button.style.gridColumn || 1) - 1;
        for (const slot of header.querySelectorAll<HTMLElement>('.headerRegion > .headerStackRow')) {
            for (const placeholder of slot.querySelectorAll(':scope > .headerButtonSlot')) placeholder.remove();
            const buttons = Array.from(slot.querySelectorAll<HTMLElement>(':scope > .resetbtn.headerModule'))
                .filter(button => !button.hidden && !button.classList.contains('headerModuleLocked'))
                .sort((a, b) => positionOf(a) - positionOf(b));
            const aligned = !!slot.dataset.hsHeaderAlign;
            const capacity = HSHeaderButtons.#capacity;
            slot.style.gridTemplateColumns = `repeat(${capacity}, minmax(0, 1fr))`;
            // The game's mobile default may translate a run of neighbouring slots; explicit alignment is per slot.
            if (slot.dataset.hsHeaderAlign) slot.style.translate = 'none';
            buttons.forEach((button, index) => {
                // Flex alignment uses only real buttons in their saved order, never vacant drag/drop columns.
                // The drop hook inserts using these visible buttons; vacant positions never affect the preview.
                button.style.order = aligned ? String(index) : '';
                const position = positionOf(button);
                button.style.gridColumn = String(position % capacity + 1);
                button.style.gridRow = String(Math.floor(position / capacity) + 1);
            });
        }
    }

    static #isButton(id: string): boolean {
        return document.getElementById(id)?.classList.contains('resetbtn') === true;
    }

    static #canJoin(slot: readonly string[], id: string): boolean | undefined {
        if (!HSHeaderButtons.#isButton(id) || !slot.every(HSHeaderButtons.#isButton)) return undefined;
        if (slot.includes(id)) return true;
        if (slot.length >= 8) return false;
        const element = slot.length ? document.getElementById(slot[0])?.closest<HTMLElement>('.headerStackRow') : null;
        if (!element) return undefined;
        const style = getComputedStyle(element);
        const available = element.clientWidth - (Number.parseFloat(style.paddingLeft) || 0) - (Number.parseFloat(style.paddingRight) || 0);
        const widths = [...slot, id].map(buttonId => {
            const button = document.getElementById(buttonId)!;
            return button.getBoundingClientRect().width || Number.parseFloat(getComputedStyle(button).width) || 32;
        });
        return widths.reduce((total, width) => total + width, 0) + 5 * (widths.length - 1) <= available;
    }

    static #move(layout: HSHeaderButtonLayout, id: string, region: string, target: HSHeaderButtonDropTarget): boolean {
        const pointer = HSHeaderButtons.#pointer;
        const slot = layout.regions[region]?.[target.index];
        if (!target.join || !pointer || !slot || HSHeaderButtons.#canJoin(slot, id) !== true) return false;
        const element = document.getElementById(slot[0])?.closest<HTMLElement>('.headerStackRow');
        if (!element?.dataset.hsHeaderAlign) return false;

        const ordered = slot.filter(member => member !== id).sort((a, b) => (layout.positions[a] ?? 0) - (layout.positions[b] ?? 0));
        const before = ordered.find(member => {
            const button = document.getElementById(member);
            if (!button || button.hidden || button.classList.contains('headerModuleLocked')) return false;
            const rect = button.getBoundingClientRect();
            return pointer.y < rect.top || (pointer.y <= rect.bottom && pointer.x < rect.left + rect.width / 2);
        });
        // Remove the dragged button at its old location. Grid cells stay in place, as in the game's detachModule.
        for (const [sourceRegion, slots] of Object.entries(layout.regions)) {
            const index = slots.findIndex(members => members !== slot && members.includes(id));
            if (index < 0) continue;
            slots[index].splice(slots[index].indexOf(id), 1);
            if (!slots[index].length && sourceRegion !== 'headerGrid') slots.splice(index, 1);
            break;
        }
        ordered.splice(before === undefined ? ordered.length : ordered.indexOf(before), 0, id);
        slot.splice(0, slot.length, ...ordered);
        ordered.forEach((member, index) => { layout.positions[member] = index; });
        layout.hidden = layout.hidden.filter(member => member !== id);
        return true;
    }
}
