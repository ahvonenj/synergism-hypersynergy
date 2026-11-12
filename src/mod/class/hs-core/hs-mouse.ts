import { HSGlobal } from "./hs-global";
import { HSLogger } from "./hs-logger";
import { HSModule } from "./module/hs-module";
import { HSSetting } from "./settings/hs-setting";
import { HSSettings } from "./settings/hs-settings";

type HSMousePosition = {
    x: number;
    y: number;
}

enum EKeyBoardKeys {
    LEFT_CTRL = 'ControlLeft',
    RIGHT_CTRL = 'ControlRight',

    LEFT_SHIFT = 'ShiftLeft',
    RIGHT_SHIFT = 'ShiftRight'
}

/**
 *  Class: HSMouse
 *  IsExplicitHSModule: Yes
 *  Description: Module for capturing and handling mouse events.
 *  Author: Swiffy
 */
export class HSMouse extends HSModule {

    static readonly #mousePosition: HSMousePosition = { x: 0, y: 0 };

    static #hoverUpdateInterval: number | null = null;
    static #autoClickUpdateInterval: number | null = null;

    // One selector for the whole ignore list, so closest() also catches a child of an ignored button (its label span)
    static readonly #ignoredSelector = HSGlobal.HSMouse.autoClickIgnoredElements.join(',');

    async init() {
        HSLogger.log(`Capturing mouse events`, this.context);

        document.addEventListener('mousemove', HSMouse.#updateMousePosition.bind(HSMouse));

        // While left SHIFT is held, emit hover events at the mouse position; while left CTRL is held, click events.
        // Settings are read at each press, so a changed interval applies on the next one.
        document.addEventListener('keydown', (event: KeyboardEvent) => {
            if (event.code === EKeyBoardKeys.LEFT_SHIFT && !HSMouse.#hoverUpdateInterval) {
                const setting = HSSettings.getSetting('reactiveMouseHover') as HSSetting<number>;
                if (setting.isEnabled())
                    HSMouse.#hoverUpdateInterval = setInterval(() => HSMouse.#mouseEventAtPoint('mouseover'), setting.getCalculatedValue());
            } else if (event.code === EKeyBoardKeys.LEFT_CTRL && !HSMouse.#autoClickUpdateInterval) {
                const setting = HSSettings.getSetting('autoClick') as HSSetting<number>;
                if (setting.isEnabled())
                    HSMouse.#autoClickUpdateInterval = setInterval(() => HSMouse.#mouseEventAtPoint('click'), setting.getCalculatedValue());
            }
        });

        document.addEventListener('keyup', (event: KeyboardEvent) => {
            if (event.code === EKeyBoardKeys.LEFT_SHIFT) HSMouse.clearInterval('hover');
            else if (event.code === EKeyBoardKeys.LEFT_CTRL) HSMouse.clearInterval('click');
        });

        // The key's release can't be seen once the page loses focus or is hidden (switching windows or tabs with the key held)
        window.addEventListener('blur', HSMouse.#stopAll);
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) HSMouse.#stopAll();
        });

        this.isInitialized = true;
    }

    static #updateMousePosition(e: MouseEvent) {
        this.#mousePosition.x = e.clientX;
        this.#mousePosition.y = e.clientY;
    }

    // Emits a mouse event at the current mouse position, on the topmost element there
    static #mouseEventAtPoint(eventType: 'mouseover' | 'click') {
        const elementUnderCursor = document.elementFromPoint(this.#mousePosition.x, this.#mousePosition.y);
        if (!elementUnderCursor) return;

        if (eventType === 'click'
            && HSSettings.getSetting('autoClickIgnoreElements').getValue()
            && elementUnderCursor.closest(this.#ignoredSelector)) return;

        elementUnderCursor.dispatchEvent(new MouseEvent(eventType, {
            view: window,
            bubbles: true,
            cancelable: true
        }));
    }

    static #stopAll() {
        HSMouse.clearInterval('hover');
        HSMouse.clearInterval('click');
    }

    static clearInterval(intervalType: 'hover' | 'click') {
        if (intervalType === 'hover' && HSMouse.#hoverUpdateInterval) {
            clearInterval(HSMouse.#hoverUpdateInterval);
            HSMouse.#hoverUpdateInterval = null;
        } else if (intervalType === 'click' && HSMouse.#autoClickUpdateInterval) {
            clearInterval(HSMouse.#autoClickUpdateInterval);
            HSMouse.#autoClickUpdateInterval = null;
        }
    }
}
