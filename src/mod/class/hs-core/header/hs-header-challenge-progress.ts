import { HSGlobal } from '../hs-global';

interface FitSpace { width: number; maxFontSize: number; }
interface ProgressView {
    module: HTMLElement;
    native: HTMLElement;
    compact: HTMLElement;
    textObserver?: MutationObserver;
    space?: FitSpace;
    fullText?: string;
    fitted?: FitSpace & { text: string };
}

/**
 * Class: HSHeaderChallengeProgress
 * IsExplicitHSModule: No
 * Description: Fits a compact view of the game's native challenge progress text.
 * Author: XxMolkxX
 */
export class HSHeaderChallengeProgress {
    static #enabled = false;
    static readonly #views: ProgressView[] = [];
    static readonly #pending = new Set<ProgressView>();
    static #frame?: number;
    static #layoutDirty = false;
    static #layout?: MutationObserver;
    static #resize?: ResizeObserver;

    static setEnabled(enabled: boolean): void {
        HSHeaderChallengeProgress.#enabled = enabled;
        window.__HS_compactChallengeText = enabled;
        document.documentElement.classList.toggle('hs-compact-challenge-text', enabled);
        // The game's size reader also controls covered cells and drag targets; CSS alone leaves the second slot busy.
        if (window.__HS_HEADER_CHALLENGE_SIZE_PATCHED) window.__HS_renderHeaderLayout?.();
        if (enabled) document.addEventListener('visibilitychange', HSHeaderChallengeProgress.#syncActivity);
        else document.removeEventListener('visibilitychange', HSHeaderChallengeProgress.#syncActivity);
        HSHeaderChallengeProgress.#syncActivity();
    }

    static install(): void {
        for (const module of document.querySelectorAll<HTMLElement>('.headerProgress')) {
            const native = module.querySelector<HTMLElement>('.fitText');
            if (!native || module.querySelector('.hs-header-progress-compact')) continue;
            const compact = document.createElement('span');
            compact.className = 'hs-header-progress-compact';
            module.append(compact);
            HSHeaderChallengeProgress.#views.push({ module, native, compact });
        }
        HSHeaderChallengeProgress.#syncActivity();
    }

    static #syncActivity(): void {
        if (!HSHeaderChallengeProgress.#enabled || document.hidden) {
            HSHeaderChallengeProgress.#layout?.disconnect();
            HSHeaderChallengeProgress.#resize?.disconnect();
            for (const view of HSHeaderChallengeProgress.#views) {
                view.textObserver?.disconnect();
                view.space = undefined;
            }
            if (HSHeaderChallengeProgress.#frame !== undefined) cancelAnimationFrame(HSHeaderChallengeProgress.#frame);
            HSHeaderChallengeProgress.#frame = undefined;
            HSHeaderChallengeProgress.#pending.clear();
            HSHeaderChallengeProgress.#layoutDirty = false;
            return;
        }
        if (HSHeaderChallengeProgress.#views.length === 0) return;

        HSHeaderChallengeProgress.#layout ??= new MutationObserver(() => HSHeaderChallengeProgress.#schedule());
        HSHeaderChallengeProgress.#resize ??= new ResizeObserver(() => HSHeaderChallengeProgress.#schedule());
        const header = document.getElementById('mainHeader');
        if (header) HSHeaderChallengeProgress.#layout.observe(header, { attributes: true, attributeFilter: ['class'] });
        for (const { module } of HSHeaderChallengeProgress.#views) {
            HSHeaderChallengeProgress.#layout.observe(module, { attributes: true, attributeFilter: ['class', 'data-size', 'hidden'] });
            HSHeaderChallengeProgress.#resize.observe(module);
        }
        HSHeaderChallengeProgress.#schedule();
    }

    static #schedule(view?: ProgressView): void {
        if (!HSHeaderChallengeProgress.#enabled || document.hidden) return;
        if (view) HSHeaderChallengeProgress.#pending.add(view);
        else HSHeaderChallengeProgress.#layoutDirty = true;
        HSHeaderChallengeProgress.#frame ??= requestAnimationFrame(() => HSHeaderChallengeProgress.#draw());
    }

    static #draw(): void {
        HSHeaderChallengeProgress.#frame = undefined;
        if (!HSHeaderChallengeProgress.#enabled || document.hidden) return;
        if (HSHeaderChallengeProgress.#layoutDirty) {
            HSHeaderChallengeProgress.#layoutDirty = false;
            for (const view of HSHeaderChallengeProgress.#views) HSHeaderChallengeProgress.#updateSpace(view);
            HSHeaderChallengeProgress.#updateToolbar();
        }
        for (const view of HSHeaderChallengeProgress.#pending) HSHeaderChallengeProgress.#refresh(view);
        HSHeaderChallengeProgress.#pending.clear();
    }

    static #updateSpace(view: ProgressView): void {
        const { module, native } = view;
        const width = module.isConnected ? module.clientWidth : 0;
        const height = width > 0 ? module.clientHeight : 0;
        const style = height > 0 ? getComputedStyle(module) : undefined;
        // [hidden] preserves the layout box and is overridden for previews in edit mode.
        if (style?.visibility !== 'visible') {
            view.textObserver?.disconnect();
            view.space = undefined;
            return;
        }

        if (!view.space) {
            view.textObserver ??= new MutationObserver(() => HSHeaderChallengeProgress.#schedule(view));
            view.textObserver.observe(native, {
                childList: true, characterData: true, subtree: true,
                attributes: true, attributeFilter: ['data-placeholder'],
            });
        }
        view.space = { width, maxFontSize: Math.min(Number.parseFloat(style.fontSize), height / 1.2) };
        HSHeaderChallengeProgress.#pending.add(view);
    }

    static #updateToolbar(): void {
        // The native toolbar restores its buttons on the next render.
        if (!window.__HS_HEADER_CHALLENGE_SIZE_PATCHED || !HSHeaderChallengeProgress.#views.some(
            ({ module }) => module.classList.contains('headerModuleSelected'),
        )) return;
        const tall = document.getElementById('headerSizeTall') as HTMLButtonElement | null;
        if (tall && !tall.disabled) tall.disabled = true;
    }

    static #refresh(view: ProgressView): void {
        const { module, native, compact, space } = view;
        if (!space) return;
        // The game's translations mark the formatted amounts and scores with spans.
        const values = Array.from(native.children, child => child.textContent?.trim() ?? '').filter(Boolean);
        const fullText = native.textContent?.trim() || native.dataset.placeholder || '';
        const score = module.id === 'ascensionChallengeProgress'
            && HSGlobal.exposedPlayer?.currentChallenge.ascension === 15;
        const text = score
            ? (fullText.includes('→') ? values.slice(0, 2).join(' → ') : values[0])
            : values.slice(0, 2).join(' / ');
        // Inactive modules keep the game's named editor preview so each challenge tier is identifiable.
        const display = text || fullText || '—';
        if (compact.textContent !== display) compact.textContent = display;
        if (view.fullText !== fullText) {
            compact.title = fullText;
            compact.setAttribute('aria-label', fullText);
            view.fullText = fullText;
        }
        if (view.fitted?.text === display && view.fitted.width === space.width
            && view.fitted.maxFontSize === space.maxFontSize) return;

        const fontSize = `${space.maxFontSize}px`;
        if (compact.style.fontSize !== fontSize) compact.style.fontSize = fontSize;
        // In the tray, the module can grow to the new text width at the native font size.
        const width = module.clientWidth;
        const textWidth = compact.scrollWidth;
        if (width > 1 && textWidth > width) {
            compact.style.fontSize = `${space.maxFontSize * (width - 1) / textWidth}px`;
        }
        view.fitted = { text: display, width, maxFontSize: space.maxFontSize };
    }
}
