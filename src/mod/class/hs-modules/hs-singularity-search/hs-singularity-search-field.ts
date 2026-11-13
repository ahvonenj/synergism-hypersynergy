// What the Singularity search fields share (docs/features/singularity-search.md): the field with its Clear button and
// result count, and reading a game tooltip without showing it.

/**
 * A search field: the text, a Clear button beside it (hidden while empty), the number of results inside it at its
 * right end. Escape clears it and leaves it.
 */
export class HSSearchField {
    readonly element: HTMLElement;
    readonly #input: HTMLInputElement;
    readonly #clearButton: HTMLElement;
    readonly #count: HTMLElement;
    readonly #onChange: () => void;

    constructor(placeholder: string, onChange: () => void) {
        this.#onChange = onChange;

        const field = document.createElement('div');
        field.className = 'hs-sing-search-field';

        const input = document.createElement('input');
        input.className = 'hs-sing-search-input';
        input.type = 'text';
        input.placeholder = placeholder;
        input.autocomplete = 'off';
        input.spellcheck = false;
        input.addEventListener('input', () => this.#changed());
        input.addEventListener('keydown', (event) => {
            if (event.key !== 'Escape') return;
            // The focus leaves the field below: without this, the game's hotkeys would get the key
            event.stopPropagation();
            input.value = '';
            this.#changed();
            input.blur();
        });

        const clearButton = document.createElement('button');
        clearButton.className = 'hs-sing-search-clear';
        clearButton.type = 'button';
        clearButton.textContent = 'Clear';
        clearButton.addEventListener('click', () => {
            this.fill('');
        });

        const count = document.createElement('span');
        count.className = 'hs-sing-search-count';

        // The text and its count: the count sits at the box's right end, whatever the Clear button's place
        const box = document.createElement('div');
        box.className = 'hs-sing-search-box';
        box.append(input, count);

        field.append(box, clearButton);
        this.element = field;
        this.#input = input;
        this.#clearButton = clearButton;
        this.#count = count;
        this.#changed(false);
    }

    get value(): string {
        return this.#input.value;
    }

    /** Puts the text in the field, searches, and leaves the focus in it. */
    fill(text: string): void {
        this.#input.value = text;
        this.#changed();
        this.#input.focus();
    }

    /** Empties the field and ends the search, the focus untouched. */
    clear(): void {
        this.#input.value = '';
        this.#changed();
    }

    /**
     * The count inside the field; empty hides it. Typed text stops before it. `short` replaces `text` when the field
     * is too narrow for it (a narrow window), `text` then being the field's tooltip (the count lets the mouse through).
     */
    setCount(text: string, short?: string): void {
        this.#count.textContent = text;
        this.#input.title = '';
        // Room for a few typed characters at least. offsetWidth: an input's clientWidth shrinks with its padding,
        // which follows the count.
        if (short !== undefined && this.#count.offsetWidth > this.#input.offsetWidth - 60) {
            this.#count.textContent = short;
            this.#input.title = text;
        }
        this.#input.style.paddingRight = text === '' ? '' : `${this.#count.offsetWidth + 16}px`;
    }

    #changed(notify = true): void {
        this.#clearButton.style.visibility = this.#input.value === '' ? 'hidden' : 'visible';
        if (notify) this.#onChange();
    }
}

/**
 * A copy of the tooltip the game opens when the mouse moves over the element, or null when it opens none: on a touch
 * device the game opens them with a click. Opened and closed in the same task, so nothing is painted. `closeEvent` is
 * the one the element's own listener closes the tooltip on.
 * Closes a tooltip that was open (the mouse resting on another element); the game opens it again at the next move.
 */
export function readHoverTooltip(element: HTMLElement, closeEvent: 'mouseleave' | 'mouseout'): HTMLElement | null {
    const content = document.getElementById('modalContent');
    if (!content) return null;

    // Emptied first: what's left after the event is this element's tooltip, nothing older. The game rebuilds an
    // empty content in full.
    content.replaceChildren();
    element.dispatchEvent(new MouseEvent('mousemove', { clientX: 0, clientY: 0 }));
    const copy = content.childNodes.length > 0 ? content.cloneNode(true) as HTMLElement : null;
    element.dispatchEvent(new MouseEvent(closeEvent));

    copy?.removeAttribute('id');
    return copy;
}
