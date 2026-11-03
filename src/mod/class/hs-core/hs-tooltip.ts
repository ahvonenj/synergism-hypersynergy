import { escapeHtml } from '../hs-modules/hs-heater/hs-heater-utils';

export type HSTooltipPlacement = 'below' | 'above' | 'right' | 'left';

export interface HSTooltipSettings {
    // A line on top, in plain text
    title?: string;
    delay?: number;
    placement?: HSTooltipPlacement;
}

export interface HSTooltipOptions extends HSTooltipSettings {
    // Never read as HTML; a \n is a line break, and the text wraps by itself
    text?: string;
    // The caller escapes what it puts in. A function runs at each show
    html?: string | (() => string);
    // false: as wide as its longest line, for content made of lines (a list)
    wrap?: boolean;
}

const TEXT_ATTR = 'data-hs-tip';
const TITLE_ATTR = 'data-hs-tip-title';
const DELAY_ATTR = 'data-hs-tip-delay';
const PLACEMENT_ATTR = 'data-hs-tip-placement';
const DEFAULT_DELAY = 150;
// A tooltip opening this soon after another one closed skips its delay: moving along a row of buttons
const CHAIN_WINDOW = 300;
const GUTTER = 8;
const ANCHOR_CHECK_INTERVAL = 250;
const OPPOSITE: Record<HSTooltipPlacement, HSTooltipPlacement> = { below: 'above', above: 'below', right: 'left', left: 'right' };

/**
 * Class: HSTooltip
 * IsExplicitHSModule: No
 * Description:
 *     The mod's own tooltip, for what a browser title can't do: colours, showing sooner, choosing the side.
 *     One element in the body, placed in the viewport so no window clips it, and one set of listeners on the document,
 *     so rows rebuilt with innerHTML need no cleanup. The mouse passes through a tooltip: a window with pins or
 *     scrolling keeps its own code and only uses place().
 *     Listens to pointer events, not mouse events: the mod and autosing dispatch mouseover and mouseout of their own.
 * Author: Shewchou
 */
export class HSTooltip {
    static #installed = false;
    static #registered = new WeakMap<Element, HSTooltipOptions>();
    static #element?: HTMLElement;
    // The element whose tooltip is open or about to open
    static #anchor?: HTMLElement;
    // Closed by a press or a scroll: stays closed until the pointer leaves it
    static #dismissed?: HTMLElement;
    static #showTimer?: number;
    static #anchorCheck?: number;
    static #lastVisible = 0;
    static #pressed = false;

    /** Like element.title = ...: an empty text shows nothing, null removes the tooltip. */
    static set(element: HTMLElement, content: string | HSTooltipOptions | null): void {
        HSTooltip.#install();
        if (content === null) {
            HSTooltip.#registered.delete(element);
            element.removeAttribute(TEXT_ATTR);
            if (HSTooltip.#anchor === element) HSTooltip.#close();
            return;
        }
        HSTooltip.#registered.set(element, typeof content === 'string' ? { text: content } : content);
        element.setAttribute(TEXT_ATTR, '');
        element.removeAttribute('title');
        if (HSTooltip.#anchor === element && HSTooltip.#anchorCheck !== undefined) HSTooltip.#show(element);
    }

    /** The same in an HTML string: the attributes to put in the element's tag. */
    static attrs(text: string, settings: HSTooltipSettings = {}): string {
        HSTooltip.#install();
        let attributes = `${TEXT_ATTR}="${escapeHtml(text)}"`;
        if (settings.title) attributes += ` ${TITLE_ATTR}="${escapeHtml(settings.title)}"`;
        if (settings.delay !== undefined) attributes += ` ${DELAY_ATTR}="${settings.delay}"`;
        if (settings.placement) attributes += ` ${PLACEMENT_ATTR}="${settings.placement}"`;
        return attributes;
    }

    /** Puts a position: fixed element next to anchor: on the other side if it doesn't fit, always inside the viewport. */
    static place(element: HTMLElement, anchor: HTMLElement, options: { placement?: HSTooltipPlacement; gutter?: number } = {}): void {
        const anchorRect = anchor.getBoundingClientRect();
        const { width, height } = element.getBoundingClientRect();
        const viewportWidth = document.documentElement.clientWidth;
        const viewportHeight = document.documentElement.clientHeight;
        const placement = options.placement ?? 'below';
        const gutter = options.gutter ?? GUTTER;

        const positionAt = (side: HSTooltipPlacement): { left: number; top: number } => {
            const centredLeft = anchorRect.left + (anchorRect.width - width) / 2;
            switch (side) {
                case 'below': return { left: centredLeft, top: anchorRect.bottom + gutter };
                case 'above': return { left: centredLeft, top: anchorRect.top - height - gutter };
                case 'right': return { left: anchorRect.right + gutter, top: anchorRect.top };
                case 'left': return { left: anchorRect.left - width - gutter, top: anchorRect.top };
            }
        };
        const doesNotFit = ({ left, top }: { left: number; top: number }): boolean => placement === 'below' || placement === 'above'
            ? top < GUTTER || top + height > viewportHeight - GUTTER
            : left < GUTTER || left + width > viewportWidth - GUTTER;

        let position = positionAt(placement);
        if (doesNotFit(position)) {
            const other = positionAt(OPPOSITE[placement]);
            if (!doesNotFit(other)) position = other;
        }
        element.style.left = `${Math.max(GUTTER, Math.min(position.left, viewportWidth - width - GUTTER))}px`;
        element.style.top = `${Math.max(GUTTER, Math.min(position.top, viewportHeight - height - GUTTER))}px`;
    }

    static #install(): void {
        if (HSTooltip.#installed) return;
        HSTooltip.#installed = true;

        // Capture: a handler stopping the event on its way must not leave a tooltip open
        document.addEventListener('pointerover', event => HSTooltip.#onPointerOver(event), true);
        // No related target: the pointer left the page
        document.addEventListener('pointerout', event => { if (!event.relatedTarget) HSTooltip.#close(); }, true);
        document.addEventListener('pointerdown', () => {
            HSTooltip.#pressed = true;
            HSTooltip.#dismiss();
        }, true);
        for (const type of ['pointerup', 'pointercancel']) {
            document.addEventListener(type, () => { HSTooltip.#pressed = false; }, true);
        }
        document.addEventListener('focusin', event => HSTooltip.#onFocusIn(event), true);
        document.addEventListener('focusout', () => {
            if (HSTooltip.#anchor && !HSTooltip.#anchor.matches(':hover')) HSTooltip.#close();
        }, true);
        // Only a scroll that moves the anchor: the mod's log scrolling by itself must not close a tooltip
        window.addEventListener('scroll', event => {
            if (HSTooltip.#anchor && event.target instanceof Node && event.target.contains(HSTooltip.#anchor)) HSTooltip.#dismiss();
        }, true);
        window.addEventListener('blur', () => {
            HSTooltip.#pressed = false;
            HSTooltip.#close();
        });
    }

    static #onPointerOver(event: PointerEvent): void {
        if (event.pointerType === 'touch' || !(event.target instanceof Element)) return;
        const anchor = event.target.closest<HTMLElement>(`[${TEXT_ATTR}]`) ?? undefined;
        if (anchor !== HSTooltip.#dismissed) HSTooltip.#dismissed = undefined;
        if (!anchor) {
            HSTooltip.#close();
        } else if (anchor !== HSTooltip.#anchor && anchor !== HSTooltip.#dismissed) {
            HSTooltip.#open(anchor);
        }
    }

    // A press focuses too, and a text field counts as focus-visible even then
    static #onFocusIn(event: FocusEvent): void {
        if (HSTooltip.#pressed || !(event.target instanceof Element) || !event.target.matches(':focus-visible')) return;
        const anchor = event.target.closest<HTMLElement>(`[${TEXT_ATTR}]`);
        if (anchor && anchor !== HSTooltip.#anchor) HSTooltip.#open(anchor);
    }

    static #open(anchor: HTMLElement): void {
        HSTooltip.#close();
        HSTooltip.#anchor = anchor;
        const delay = performance.now() - HSTooltip.#lastVisible < CHAIN_WINDOW ? 0 : HSTooltip.#optionsOf(anchor).delay ?? DEFAULT_DELAY;
        if (delay <= 0) HSTooltip.#show(anchor);
        else HSTooltip.#showTimer = window.setTimeout(() => HSTooltip.#show(anchor), delay);
    }

    static #show(anchor: HTMLElement): void {
        const options = HSTooltip.#optionsOf(anchor);
        const html = typeof options.html === 'function' ? options.html() : options.html;
        if (!anchor.isConnected || !(html || options.text)) {
            HSTooltip.#close();
            return;
        }

        const element = HSTooltip.#element ??= HSTooltip.#build();
        if (html) element.innerHTML = html;
        else element.textContent = options.text ?? '';
        if (options.title) {
            const title = document.createElement('div');
            title.className = 'hs-tip-title';
            title.textContent = options.title;
            element.prepend(title);
        }
        element.classList.toggle('hs-tooltip-html', !!html);
        element.classList.toggle('hs-tooltip-nowrap', options.wrap === false);
        element.hidden = false;
        // Its width depends on the room it has: measured from the corner, not from where it was last
        element.style.left = '0';
        element.style.top = '0';
        HSTooltip.place(element, anchor, { placement: options.placement });

        // A tab change, a closed window or a reset can take the anchor away with no pointer event
        HSTooltip.#anchorCheck ??= window.setInterval(() => {
            if (!anchor.isConnected || anchor.getClientRects().length === 0) HSTooltip.#close();
        }, ANCHOR_CHECK_INTERVAL);
    }

    static #close(): void {
        window.clearTimeout(HSTooltip.#showTimer);
        if (HSTooltip.#anchorCheck !== undefined) {
            window.clearInterval(HSTooltip.#anchorCheck);
            HSTooltip.#anchorCheck = undefined;
            HSTooltip.#lastVisible = performance.now();
        }
        if (HSTooltip.#element) HSTooltip.#element.hidden = true;
        HSTooltip.#anchor = undefined;
    }

    static #dismiss(): void {
        HSTooltip.#dismissed = HSTooltip.#anchor;
        HSTooltip.#close();
    }

    static #optionsOf(anchor: HTMLElement): HSTooltipOptions {
        const registered = HSTooltip.#registered.get(anchor);
        if (registered) return registered;
        const delay = anchor.getAttribute(DELAY_ATTR);
        return {
            text: anchor.getAttribute(TEXT_ATTR) ?? '',
            title: anchor.getAttribute(TITLE_ATTR) ?? undefined,
            delay: delay === null ? undefined : Number(delay),
            placement: (anchor.getAttribute(PLACEMENT_ATTR) as HSTooltipPlacement | null) ?? undefined,
        };
    }

    static #build(): HTMLElement {
        const element = document.createElement('div');
        element.id = 'hs-tooltip';
        element.setAttribute('role', 'tooltip');
        element.hidden = true;
        document.body.appendChild(element);
        return element;
    }
}
