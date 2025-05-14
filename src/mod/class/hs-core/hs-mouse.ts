import { EKeyBoardKeys, HSMousePosition } from "../../types/hs-input-types";
import { HSGlobal } from "./hs-global";
import { HSLogger } from "./hs-logger";
import { HSModule } from "./module/hs-module";
import { HSSetting } from "./settings/hs-setting";
import { HSSettings } from "./settings/hs-settings";

export class HSMouse extends HSModule {

    static #staticContext = '';

    static #mousePosition: HSMousePosition;
    static #mousePositionDebugElement?: HTMLDivElement;

    static #hoverUpdateInterval: number | null;
    static #autoClickUpdateInterval: number | null;

    static #ignoredElements: string[] = [];

    constructor(moduleName: string, context: string, moduleColor?: string) {
        super(moduleName, context, moduleColor);
        HSMouse.#staticContext = context;
    }

    async init() {
        const self = this;

        HSLogger.log(`Capturing mouse events`, this.context);

        // Bind mouse move
        document.addEventListener('mousemove', HSMouse.#updateMousePosition.bind(HSMouse));

        // Key down events for SHIFT and CTRL
        document.addEventListener('keydown', function(event) {
            const reactiveHoverSetting = HSSettings.getSetting('reactiveMouseHover') as HSSetting<number>;
            const autoClickSetting = HSSettings.getSetting('autoClick') as HSSetting<number>;

            // If SHIFT is held, we emit hover events at the mouse position
            if (event.code === EKeyBoardKeys.LEFT_SHIFT && !HSMouse.#hoverUpdateInterval && reactiveHoverSetting.isEnabled()) {
                HSMouse.#hoverUpdateInterval = setInterval(() => { HSMouse.#mouseEventAtPoint('mouseover') }, reactiveHoverSetting.getCalculatedValue());
            }

            // If CTRL is held, we emit click events at the mouse position
            if (event.code === EKeyBoardKeys.LEFT_CTRL && !HSMouse.#autoClickUpdateInterval && autoClickSetting.isEnabled()) {
                HSMouse.#autoClickUpdateInterval = setInterval(() => { HSMouse.#mouseEventAtPoint('click') }, autoClickSetting.getCalculatedValue());
            }
        });

        // Stop emitting events when SHIFT or CTRL is released
        document.addEventListener('keyup', function (event: KeyboardEvent) {
            if (event.code === EKeyBoardKeys.LEFT_SHIFT) HSMouse.clearInterval('hover');
            if (event.code === EKeyBoardKeys.LEFT_CTRL) HSMouse.clearInterval('click');
        });

        this.isInitialized = true;
    }

    static #updateMousePosition(e: MouseEvent) {
        this.#mousePosition = {
            x: e.clientX,
            y: e.clientY
        }

        this.#updateDebug();
    }

    // Emits a mouse event at the current mouse position
    static #mouseEventAtPoint(eventType: 'mouseover' | 'click') {
        const { x, y } = this.#mousePosition;

        // The emitted event needs to have some (HTML) Element target it is emitted to
        // This is done by using the document.elementFromPoint method, which returns the topmost element at the specified coordinates
        const elementUnderCursor = document.elementFromPoint(x, y);

        // If the element under cursor is not null, we can emit the event to it
        if (elementUnderCursor) {
            if(eventType === 'click') {
                // There's a setting to ignore some elements when auto-clicking
                const ignoreSetting = HSSettings.getSetting('autoClickIgnoreElements') as HSSetting<boolean>;

                if(ignoreSetting.getValue()) {
                    // If the element under cursor has id, check the ignore list by id
                    if(elementUnderCursor.id && elementUnderCursor.id !== '') {
                        if(HSGlobal.HSMouse.autoClickIgnoredElements.includes(`#${elementUnderCursor.id}`))
                            return;
                    }

                    // If the element under cursor has some classes defined, go through them all and check the ignore list by class
                    if(elementUnderCursor.classList.length > 0) {
                        elementUnderCursor.classList.forEach(cls => {
                            if(HSGlobal.HSMouse.autoClickIgnoredElements.includes(`.${cls}`)) {
                                return;
                            }
                        })
                    }
                }
            }

            // Create a new mouse event with the specified type and options
            const mouseoverEvent = new MouseEvent(eventType, {
                view: window,
                bubbles: true,
                cancelable: true
            });
            
            // Dispatch the event to the element under cursor
            elementUnderCursor.dispatchEvent(mouseoverEvent);
        }
    }

    // This updates the mouse position in the debug tab of the mod's panel
    static #updateDebug() {
        if(!this.#mousePositionDebugElement || this.#mousePositionDebugElement === undefined) {
            const debugElement = document.querySelector('#hs-panel-debug-mousepos') as HTMLDivElement;

            if(debugElement) {
                this.#mousePositionDebugElement = debugElement;
                this.#mousePositionDebugElement.innerHTML = `Mouse: (X: ${this.#mousePosition.x}, Y: ${this.#mousePosition.y})`;
            }
        } else {
            this.#mousePositionDebugElement.innerHTML = `Mouse: (X: ${this.#mousePosition.x}, Y: ${this.#mousePosition.y})`;
        }
    }

    static clearInterval(intervalType: 'hover' | 'click') {
        if(intervalType === 'hover' && HSMouse.#hoverUpdateInterval) {
            clearInterval(HSMouse.#hoverUpdateInterval);
            HSMouse.#hoverUpdateInterval = null;
        } else if(intervalType === 'click' && HSMouse.#autoClickUpdateInterval) {
            clearInterval(HSMouse.#autoClickUpdateInterval);
            HSMouse.#autoClickUpdateInterval = null;
        }
    }

    static getPosition() : HSMousePosition {
        return this.#mousePosition;
    }
}