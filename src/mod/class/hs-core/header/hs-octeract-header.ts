/** Adds the same white unit label as the other cubes, preserving the game's native text for its update checks. */
export class HSOcteractHeader {
    static #display?: HTMLElement;
    static #observer?: MutationObserver;

    static setConsistentText(enabled: boolean): void {
        HSOcteractHeader.#observer?.disconnect();
        HSOcteractHeader.#observer = undefined;
        const display = HSOcteractHeader.#display ?? document.getElementById('octeractHeaderDisplay');
        if (!display) return;
        HSOcteractHeader.#display = display;
        if (!enabled) {
            // Includes the hidden native /s, so disabling restores the exact game text.
            if (display.hasAttribute('data-hs-octeract-unit')) display.replaceChildren(document.createTextNode(display.textContent ?? ''));
            delete display.dataset.hsOcteractUnit;
            return;
        }
        HSOcteractHeader.#observer = new MutationObserver(() => HSOcteractHeader.#refresh());
        HSOcteractHeader.#refresh();
    }

    static #refresh(): void {
        const display = HSOcteractHeader.#display;
        const observer = HSOcteractHeader.#observer;
        if (!display || !observer) return;
        const text = display.textContent ?? '';
        const rate = /^(.*?)(\s*\/s)\s*$/.exec(text);
        observer.disconnect();
        const value = document.createElement('span');
        value.textContent = rate ? rate[1] : text;
        display.replaceChildren(value);
        if (rate) {
            const nativeUnit = document.createElement('span');
            nativeUnit.hidden = true;
            nativeUnit.textContent = text.slice(rate[1].length);
            display.append(nativeUnit);
        }
        display.dataset.hsOcteractUnit = rate ? 'Oct/s' : 'Oct';
        observer.observe(display, { childList: true, characterData: true, subtree: true });
    }
}
