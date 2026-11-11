import { HSUI } from "../hs-ui";
import headerPopoverCSS from "inline:../../../resource/css/module/hs-header-popover.css";

/**
 * Class: HSHeaderPopover
 * IsExplicitHSModule: No
 * Description:
 *     The box a click on a header module opens, under that module: its look, how it opens and closes (Escape, a press
 *     outside it and the module) and its place. What's inside, and the click that opens it, are its owner's. In edit
 *     mode the game's capture listener stops that click, and the owner closes the box (isEditing).
 * Author: Shewchou
 */
export class HSHeaderPopover {
    static #cssInjected = false;

    readonly element: HTMLElement;
    readonly #anchor: HTMLElement;
    readonly #onClose?: () => void;
    #open = false;

    constructor(id: string, anchor: HTMLElement, onClose?: () => void) {
        if (!HSHeaderPopover.#cssInjected) {
            HSHeaderPopover.#cssInjected = true;
            HSUI.injectStyle(headerPopoverCSS, 'hs-header-popover-css');
            HSUI.flushInjectedStyles();
        }
        this.#anchor = anchor;
        this.#onClose = onClose;
        this.element = document.createElement('div');
        this.element.id = id;
        this.element.className = 'hs-header-popover';
        this.element.hidden = true;
        document.body.append(this.element);
    }

    static isEditing(): boolean {
        return document.getElementById('mainHeader')?.classList.contains('headerEditMode') === true;
    }

    get isOpen(): boolean {
        return this.#open;
    }

    open(): void {
        if (this.#open) return;
        this.#open = true;
        this.element.hidden = false;
        document.addEventListener('pointerdown', this.#onDocumentPointerDown, true);
        document.addEventListener('keydown', this.#onKeyDown);
        this.place();
    }

    close(): void {
        if (!this.#open) return;
        this.#open = false;
        this.element.hidden = true;
        document.removeEventListener('pointerdown', this.#onDocumentPointerDown, true);
        document.removeEventListener('keydown', this.#onKeyDown);
        this.#onClose?.();
    }

    /** Centred under the module, kept inside the page's width (the header can move: edit mode, the window's size). */
    place(): void {
        const rect = this.#anchor.getBoundingClientRect();
        const width = this.element.offsetWidth;
        const pageWidth = document.documentElement.clientWidth;
        const left = Math.max(8, Math.min(rect.left + (rect.width - width) / 2, pageWidth - width - 8));
        this.element.style.left = `${left + window.scrollX}px`;
        this.element.style.top = `${rect.bottom + window.scrollY}px`;
    }

    // The module's own click toggles the box
    #onDocumentPointerDown = (event: PointerEvent): void => {
        const target = event.target;
        if (!(target instanceof Node)) return;
        if (this.element.contains(target) || this.#anchor.contains(target)) return;
        this.close();
    };

    #onKeyDown = (event: KeyboardEvent): void => {
        if (event.key === 'Escape') this.close();
    };
}
