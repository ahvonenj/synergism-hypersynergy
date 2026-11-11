import { HSGlobal } from '../hs-global';
import { HSLogger } from '../hs-logger';
import { HSModuleRegistry } from '../module/hs-module-registry';

type Profile = 'desktop' | 'mobile';
type Axis = 'width' | 'height' | 'both';
interface Dimensions { width: number; barHeight: number; }
interface StoredDimensions { version: 1; layouts: Partial<Record<Profile, Dimensions>>; }
interface Drag {
    pointer: number;
    capture: HTMLElement;
    axis: Axis;
    profile: Profile;
    x: number;
    y: number;
    scaleX: number;
    scaleY: number;
    bars: number;
    start: Dimensions;
    previous?: Dimensions;
}

const STORAGE_KEY = 'minibar-dimensions';
const MIN_WIDTH = 80;
const MAX_WIDTH = 600;
const MIN_BAR_HEIGHT = 3;
const MAX_BAR_HEIGHT = 24;
const BAR_IDS = ['hs-blue-progress-bar', 'hs-red-progress-bar', 'hs-purple-progress-bar'];
const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, Math.round(value)));
// The gap between two bars for a bar height: the wrapper's CSS gap (hs-ambrosia-minibars.css)
const barGap = (barHeight: number) => barHeight <= 5 ? 0 : 2;

/** Resizes the minibars without starting the game's header drag. Dimensions belong to each screen layout. */
export class HSMinibarResize {
    static #installed = new WeakSet<HTMLElement>();
    #stored: StoredDimensions = { version: 1, layouts: {} };
    #drag?: Drag;
    #controls?: HTMLElement;
    #readout?: HTMLElement;
    #reset?: HTMLButtonElement;
    #observer?: MutationObserver;
    #observedModule?: HTMLElement;

    static install(wrapper: HTMLElement): void {
        if (HSMinibarResize.#installed.has(wrapper)) return;
        HSMinibarResize.#installed.add(wrapper);
        new HSMinibarResize(wrapper).#install();
    }

    private constructor(private readonly wrapper: HTMLElement) {}

    #install(): void {
        this.#load();
        for (const axis of ['width', 'height', 'both'] as const) {
            const handle = document.createElement('button');
            handle.type = 'button';
            handle.className = `hs-minibar-resize-handle hs-minibar-resize-${axis}`;
            const label = axis === 'width' ? 'Resize minibar width' : axis === 'height' ? 'Resize minibar height' : 'Resize minibar width and height';
            handle.setAttribute('aria-label', label);
            handle.title = `${label}: drag, or use the arrow keys`;
            handle.addEventListener('pointerdown', event => this.#start(event, axis, handle));
            handle.addEventListener('keydown', event => this.#key(event, axis));
            this.wrapper.append(handle);
        }
        // A native header redraw detaches and reattaches the module. Capture on a stable element so that does
        // not interrupt a resize or hand the remainder of its drag to the game's module-moving handlers.
        document.addEventListener('pointermove', event => this.#move(event), true);
        for (const type of ['pointerup', 'pointercancel'] as const) {
            document.addEventListener(type, event => {
                if (this.#drag?.pointer !== event.pointerId) return;
                event.preventDefault();
                event.stopPropagation();
                this.#finish(type === 'pointerup');
            }, true);
        }
        document.addEventListener('lostpointercapture', event => {
            if (this.#drag?.pointer === event.pointerId && event.target === this.#drag.capture) this.#finish(false);
        });
        document.addEventListener('keydown', event => {
            if (event.key === 'Escape' && this.#drag) {
                event.preventDefault();
                event.stopPropagation();
                this.#finish(false);
            }
        }, true);
        const observer = new MutationObserver(() => this.#refresh());
        this.#observer = observer;
        for (const id of ['headerGrid', 'ascensionStats', 'headerTray']) {
            const region = document.getElementById(id);
            if (region) observer.observe(region, { childList: true });
        }
        const header = document.getElementById('mainHeader');
        if (header) observer.observe(header, { attributes: true, attributeFilter: ['class'] });
        observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-mobile'] });
        for (const bar of this.#bars()) observer.observe(bar, { attributes: true, attributeFilter: ['style'] });
        // Font/viewport changes alter the available width; progress fill updates do not run this observer.
        const grid = document.getElementById('headerGrid');
        if (grid) new ResizeObserver(() => this.#refresh()).observe(grid);
        this.#refresh();
    }

    #profile(): Profile { return document.documentElement.dataset.mobile === 'true' ? 'mobile' : 'desktop'; }
    #editing(): boolean { return !!document.getElementById('mainHeader')?.classList.contains('headerEditMode'); }
    #module(): HTMLElement | null { return this.wrapper.closest<HTMLElement>('#hsAmbrosiaBars'); }
    #bars(): HTMLElement[] { return Array.from(this.wrapper.children).filter((child): child is HTMLElement => child instanceof HTMLElement && BAR_IDS.includes(child.id)); }
    #visibleBars(): number { return Math.max(1, this.#bars().filter(bar => bar.style.display !== 'none').length); }

    #limits(): { width: number; barHeight: number } {
        let width = Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, window.innerWidth - 24));
        const module = this.#module();
        const slot = module?.closest<HTMLElement>('[data-header-slot]');
        if (slot?.parentElement?.id === 'headerGrid') {
            const grid = slot.parentElement;
            const cell = grid.querySelector<HTMLElement>(`.headerCell[data-header-cell="${slot.dataset.headerSlot}"]`);
            const columns = /span\s+(\d+)/.exec(getComputedStyle(slot).gridColumnEnd);
            const span = columns ? Number(columns[1]) : 1;
            const gap = Number.parseFloat(getComputedStyle(grid).columnGap) || 0;
            if (cell?.offsetWidth) width = Math.min(width, cell.offsetWidth * span + gap * (span - 1));
        }
        let barHeight = MAX_BAR_HEIGHT;
        if (module?.classList.contains('hs-header-half')) {
            // The tallest bars that fit the half slot's 16px with their gaps (which depend on the bar height)
            const bars = this.#visibleBars();
            barHeight = MIN_BAR_HEIGHT;
            for (let height = MAX_BAR_HEIGHT; height > MIN_BAR_HEIGHT; height--) {
                if (height * bars + barGap(height) * (bars - 1) <= 16) {
                    barHeight = height;
                    break;
                }
            }
        }
        return { width: Math.max(MIN_WIDTH, width), barHeight };
    }

    #bounded(size: Dimensions): Dimensions {
        const limits = this.#limits();
        return { width: clamp(size.width, MIN_WIDTH, limits.width), barHeight: clamp(size.barHeight, MIN_BAR_HEIGHT, limits.barHeight) };
    }

    #current(): Dimensions {
        return {
            width: this.wrapper.offsetWidth,
            barHeight: this.#bars().find(bar => bar.style.display !== 'none')?.offsetHeight ?? 8,
        };
    }

    #start(event: PointerEvent, axis: Axis, handle: HTMLElement): void {
        if (!this.#editing() || event.button !== 0 || this.#drag) return;
        event.preventDefault();
        event.stopPropagation();
        const start = this.#current();
        const rect = this.wrapper.getBoundingClientRect();
        this.#drag = {
            pointer: event.pointerId, capture: document.documentElement, axis, profile: this.#profile(), x: event.clientX, y: event.clientY,
            scaleX: rect.width / (this.wrapper.offsetWidth || 1), scaleY: rect.height / (this.wrapper.offsetHeight || 1),
            bars: this.#visibleBars(), start, previous: this.#stored.layouts[this.#profile()],
        };
        handle.focus({ preventScroll: true });
        this.#drag.capture.setPointerCapture(event.pointerId);
        this.wrapper.classList.add('hs-minibar-resizing');
    }

    #move(event: PointerEvent): void {
        const drag = this.#drag;
        if (!drag || drag.pointer !== event.pointerId) return;
        event.preventDefault();
        event.stopPropagation();
        this.#stored.layouts[drag.profile] = this.#bounded({
            width: drag.start.width + (drag.axis === 'height' ? 0 : (event.clientX - drag.x) / drag.scaleX),
            barHeight: drag.start.barHeight + (drag.axis === 'width' ? 0 : (event.clientY - drag.y) / drag.scaleY / drag.bars),
        });
        this.#refresh();
    }

    #finish(save: boolean): void {
        const drag = this.#drag;
        if (!drag) return;
        this.#drag = undefined;
        if (!save) {
            if (drag.previous) this.#stored.layouts[drag.profile] = drag.previous;
            else delete this.#stored.layouts[drag.profile];
        } else this.#save();
        this.wrapper.classList.remove('hs-minibar-resizing');
        if (drag.capture.hasPointerCapture(drag.pointer)) drag.capture.releasePointerCapture(drag.pointer);
        this.#refresh();
    }

    #key(event: KeyboardEvent, axis: Axis): void {
        if (!this.#editing() || !['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) return;
        event.preventDefault();
        event.stopPropagation();
        const size = this.#current();
        const step = event.shiftKey ? 4 : 1;
        if (axis !== 'height') size.width += event.key === 'ArrowRight' ? 4 * step : event.key === 'ArrowLeft' ? -4 * step : 0;
        if (axis !== 'width') size.barHeight += event.key === 'ArrowDown' ? step : event.key === 'ArrowUp' ? -step : 0;
        this.#stored.layouts[this.#profile()] = this.#bounded(size);
        this.#save();
        this.#refresh();
    }

    #refresh(): void {
        if (this.#drag && (!this.#editing() || this.#drag.profile !== this.#profile() || !this.wrapper.isConnected)) {
            this.#finish(false);
            return;
        }
        const module = this.#module();
        if (module && module !== this.#observedModule) {
            this.#observer?.observe(module, { attributes: true, attributeFilter: ['class', 'data-size'] });
            this.#observedModule = module;
        }
        const saved = this.#stored.layouts[this.#profile()];
        const target = module ?? this.wrapper;
        // Moving between the fallback row and the game header must not leave an old fixed width behind.
        if (module) this.wrapper.style.removeProperty('width');
        if (saved) {
            const size = this.#bounded(saved);
            target.style.setProperty('--hs-minibar-width', `${size.width}px`);
            if (module) module.dataset.hsMinibarCustomSize = 'true';
            else this.wrapper.style.width = `${size.width}px`;
            this.wrapper.style.setProperty('--hs-minibar-height', `${size.barHeight}px`);
        } else {
            target.style.removeProperty('--hs-minibar-width');
            this.wrapper.style.removeProperty('--hs-minibar-height');
            if (module) delete module.dataset.hsMinibarCustomSize;
            else this.wrapper.style.removeProperty('width');
        }
        if (!saved && module?.classList.contains('hs-header-half')) {
            this.wrapper.style.setProperty('--hs-minibar-height', `${Math.min(6, this.#limits().barHeight)}px`);
        }
        this.#toolbar();
    }

    #toolbar(): void {
        const toolbar = document.getElementById('headerEditToolbar');
        if (!toolbar) return;
        if (!this.#controls) {
            const group = document.createElement('div');
            group.id = 'hs-minibar-size-controls';
            group.className = 'headerEditGroup hs-header-cell-controls';
            group.title = 'Drag the minibars’ right edge, bottom edge or corner to resize';
            const label = document.createElement('span');
            label.textContent = 'Minibars';
            this.#readout = document.createElement('span');
            this.#readout.setAttribute('aria-live', 'polite');
            this.#reset = document.createElement('button');
            this.#reset.type = 'button';
            this.#reset.textContent = 'Reset size';
            this.#reset.addEventListener('click', () => {
                delete this.#stored.layouts[this.#profile()];
                this.#save();
                this.#refresh();
            });
            group.append(label, this.#readout, this.#reset);
            toolbar.append(group);
            this.#controls = group;
        }
        this.#controls.hidden = !this.#module()?.classList.contains('headerModuleSelected');
        const size = this.#current();
        this.#readout!.textContent = `${size.width}px × ${size.barHeight}px per bar`;
        this.#reset!.disabled = !this.#stored.layouts[this.#profile()];
    }

    #load(): void {
        if (localStorage.getItem(`${HSGlobal.HSStorage.storagePrefix}${STORAGE_KEY}`) === null) return;
        const stored = HSModuleRegistry.getModule('HSStorage')?.getData<Partial<StoredDimensions>>(STORAGE_KEY);
        if (stored?.version !== 1 || !stored.layouts || typeof stored.layouts !== 'object') return;
        for (const profile of ['desktop', 'mobile'] as const) {
            const value = stored.layouts[profile];
            if (value && typeof value.width === 'number' && Number.isFinite(value.width)
                && typeof value.barHeight === 'number' && Number.isFinite(value.barHeight)) {
                this.#stored.layouts[profile] = {
                    width: clamp(value.width, MIN_WIDTH, MAX_WIDTH), barHeight: clamp(value.barHeight, MIN_BAR_HEIGHT, MAX_BAR_HEIGHT),
                };
            }
        }
    }

    #save(): void {
        if (!HSModuleRegistry.getModule('HSStorage')?.setData(STORAGE_KEY, this.#stored)) {
            HSLogger.warn('Could not save the minibar dimensions', 'HSMinibarResize');
        }
    }
}
