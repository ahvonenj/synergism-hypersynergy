import { HSLogger } from "./hs-logger";
import { HSModule } from "./hs-module";

export class HSShadowDOM extends HSModule {

    #shadows;

    constructor(moduleName: string, context: string) {
        super(moduleName, context);
        this.#shadows =  new Map<string, HSShadowElement>();
    }

    async init() { }

    createShadow(element: HTMLElement, shadowName: string) {
        const shadow = new HSShadowElement(element, shadowName).create();

        if(shadow) {
            this.#shadows.set(shadowName, shadow);
        }

        return shadow;
    }

    getShadow(shadowName: string) {
        return this.#shadows.get(shadowName);
    }

    deleteShadow(shadowName: string) {
        const shadow = this.#shadows.get(shadowName);

        if(shadow) {
            shadow.destroy();
            this.#shadows.delete(shadowName);
        }
    }
}

export class HSShadowElement {
    #context = 'HSShadowElement';

    #element: HTMLElement;
    #name: string;

    #elementParent?: ParentNode;
    #elementNextSibling?: ChildNode | null;
    #elementOriginalStyles?: string;
    #container?: HTMLDivElement;

    #containerCSS = {
        //display: 'none',
        position: 'absolute',
        width: '80vw',
        height: '80vh',
        left: '1vw',
        top: '1vh',
        overflowX: 'auto',
        overflowY: 'auto',
        zIndex: '1',
        backgroundColor: 'rgba(125, 125, 125, 0.8)'
    }

    constructor(element: HTMLElement, name: string) {
        this.#element = element;
        this.#name = name;
    }

    hide() {
        this.#element.style.display = 'none';

        if(this.#container)
            this.#container.style.pointerEvents = 'none';
    }

    show() {
        this.#element.style.display = 'block'

        if(this.#container)
            this.#container.style.pointerEvents = 'auto';
    }

    create() {
        this.#elementOriginalStyles = this.#element.style.cssText;

        const parent = this.#element.parentNode;
        this.#elementNextSibling = this.#element.nextSibling;

        if(!parent) {
            HSLogger.warn(`Could not create shadow, parent is null`, this.#context);
            return null;
        }

        this.#elementParent = parent;

        this.#container = document.createElement('div');
        
        for(const [key, value] of Object.entries(this.#containerCSS)) {
            (this.#container.style as any)[key] = value;
        }

        document.body.appendChild(this.#container);

        this.#element.parentNode?.removeChild(this.#element);
        this.#container.appendChild(this.#element);

        return this;
    }

    destroy() {
        if(!this.#elementParent) {
            HSLogger.warn(`Could not deattach shadow, parent is null`, this.#context);
            return;
        }

        if (this.#elementNextSibling) {
            this.#elementParent.insertBefore(this.#element, this.#elementNextSibling);
        } else {
            this.#elementParent.appendChild(this.#element);
        }

        if(this.#elementOriginalStyles)
            this.#element.style.cssText = this.#elementOriginalStyles;

        this.#container?.remove();
    }
}