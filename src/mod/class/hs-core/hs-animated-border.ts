export const ANIMATED_BORDER_LAYER_CLASS = 'hs-animated-border-layer';

const slotObservers = new WeakMap<Element, MutationObserver>();

function borderLayer(target: Element): Element | null {
    return target.querySelector(`:scope > .${ANIMATED_BORDER_LAYER_CLASS}`);
}

function ensureBorderLayer(target: Element): void {
    if (borderLayer(target)) return;
    const decoration = document.createElement('i');
    decoration.className = ANIMATED_BORDER_LAYER_CLASS;
    decoration.setAttribute('aria-hidden', 'true');
    target.append(decoration);
}

/** Set the loadout or update marker and its decorative layer together. */
export function setAnimatedBorder(target: Element, color?: 'rainbow' | 'silver'): void {
    // Slot observers mirror class changes, so avoid writing unchanged classes.
    for (const name of ['rainbow', 'silver'] as const) {
        const className = `hs-${name}-border`;
        const enabled = color === name;
        if (target.classList.contains(className) !== enabled) target.classList.toggle(className, enabled);
    }

    if (!color) {
        slotObservers.get(target)?.disconnect();
        slotObservers.delete(target);
        borderLayer(target)?.remove();
        return;
    }

    ensureBorderLayer(target);
    // The game can replace a slot's children to render its icon without changing the active slot.
    if (target.matches('.blueberryLoadoutSlot, .headerLoadoutSlot') && !slotObservers.has(target)) {
        const observer = new MutationObserver(() => ensureBorderLayer(target));
        observer.observe(target, { childList: true });
        slotObservers.set(target, observer);
    }
}
