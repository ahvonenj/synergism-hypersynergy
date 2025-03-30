import { HSMousePosition } from "../../types/hs-types";
import { HSLogger } from "./hs-logger";
import { HSModule } from "./hs-module";

export class HSMouse extends HSModule {

    #mousePosition: HSMousePosition;
    #mousePositionDebugElement?: HTMLDivElement;

    constructor(moduleName: string, context: string) {
        super(moduleName, context);

        this.#mousePosition = { x: 0, y: 0 };
    }

    async init() {
        const self = this;
        HSLogger.log(`Capturing mouse events`, this.context);

        document.addEventListener('mousemove', self.#updateMousePosition.bind(this));

        this.isInitialized = true;
    }

    #updateMousePosition(e: MouseEvent) {
        this.#mousePosition = {
            x: e.clientX,
            y: e.clientY
        }

        this.#updateDebug();
    }

    #updateDebug() {
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

    getPosition() : HSMousePosition {
        return this.#mousePosition;
    }
}