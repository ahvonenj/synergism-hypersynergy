import { HSMousePosition } from "../../types/hs-types";
import { HSLogger } from "./hs-logger";
import { HSModule } from "./hs-module";

export class HSMouse extends HSModule {

    static #staticContext = '';

    static #mousePosition: HSMousePosition;
    static #mousePositionDebugElement?: HTMLDivElement;

    constructor(moduleName: string, context: string) {
        super(moduleName, context);
        HSMouse.#staticContext = context;
    }

    async init() {
        const self = this;
        HSLogger.log(`Capturing mouse events`, this.context);

        document.addEventListener('mousemove', HSMouse.#updateMousePosition.bind(HSMouse));

        this.isInitialized = true;
    }

    static #updateMousePosition(e: MouseEvent) {
        this.#mousePosition = {
            x: e.clientX,
            y: e.clientY
        }

        this.#updateDebug();
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

    static getPosition() : HSMousePosition {
        return this.#mousePosition;
    }
}