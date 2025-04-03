import { EKeyBoardKeys, HSMousePosition } from "../../types/hs-types";
import { HSLogger } from "./hs-logger";
import { HSModule } from "./hs-module";
import { HSSetting } from "./hs-setting";
import { HSSettings } from "./hs-settings";

export class HSMouse extends HSModule {

    static #staticContext = '';

    static #mousePosition: HSMousePosition;
    static #mousePositionDebugElement?: HTMLDivElement;

    static #hoverUpdateInterval: number | null;
    static #autoClickUpdateInterval: number | null;

    constructor(moduleName: string, context: string, moduleColor?: string) {
        super(moduleName, context, moduleColor);
        HSMouse.#staticContext = context;
    }

    async init() {
        const self = this;

        HSLogger.log(`Capturing mouse events`, this.context);

        document.addEventListener('mousemove', HSMouse.#updateMousePosition.bind(HSMouse));

        document.addEventListener('keydown', function(event) {
            const reactiveHoverSetting = HSSettings.getSetting('reactiveMouseHover') as HSSetting<number>;
            const autoClickSetting = HSSettings.getSetting('autoClick') as HSSetting<number>;

            if (event.code === EKeyBoardKeys.LEFT_SHIFT && !HSMouse.#hoverUpdateInterval && reactiveHoverSetting.isEnabled()) {
                HSMouse.#hoverUpdateInterval = setInterval(() => { HSMouse.#mouseEventAtPoint('mouseover') }, reactiveHoverSetting.getCalculatedValue());
            }

            if (event.code === EKeyBoardKeys.LEFT_CTRL && !HSMouse.#autoClickUpdateInterval && autoClickSetting.isEnabled()) {
                HSMouse.#autoClickUpdateInterval = setInterval(() => { HSMouse.#mouseEventAtPoint('click') }, autoClickSetting.getCalculatedValue());
            }
        });

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

    static #mouseEventAtPoint(eventType: 'mouseover' | 'click') {
        const { x, y } = this.#mousePosition;
        const elementUnderCursor = document.elementFromPoint(x, y);

        if (elementUnderCursor) {
            const mouseoverEvent = new MouseEvent(eventType, {
                view: window,
                bubbles: true,
                cancelable: true
            });
            
            elementUnderCursor.dispatchEvent(mouseoverEvent);
        }
    }

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