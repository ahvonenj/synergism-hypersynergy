import { HSUtils } from "../hs-utils/hs-utils";
import { HSLogger } from "./hs-logger";
import { HSModule } from "./module/hs-module";

/*
    Class: HSShadowDOM
    IsExplicitHSModule: Yes
    Description: 
        Hypersynergism module for creating and managing shadow DOM elements.
*/
export class HSShadowDOM extends HSModule {

    #shadows;

    constructor(moduleName: string, context: string, moduleColor?: string) {
        super(moduleName, context, moduleColor);
        this.#shadows =  new Map<string, HSShadow>();
    }

    async init() { }

    // Creates a shadow DOM for the given element and returns the HSShadow instance.
    createShadow(element: HTMLElement, shadowName?: string, visible = false) {
        const name = shadowName ?? HSUtils.domid();
        const existingShadow = this.#shadowExists(element);

        if(existingShadow) {
            return existingShadow;
        }

        const shadow = new HSShadow(element, name, this).create(visible);

        if(shadow) {
            this.#shadows.set(name, shadow);
        }

        return shadow;
    }

    getShadow(shadowName: string) {
        return this.#shadows.get(shadowName);
    }

    destroyShadow(shadowInstanceOrName: string | HSShadow) {
        const shadowName = (shadowInstanceOrName instanceof HSShadow) ? shadowInstanceOrName.name : shadowInstanceOrName;
        const shadow = this.getShadow(shadowName);

        if(shadow) {
            shadow._destroy();
            this.#shadows.delete(shadowName);
        }
    }

    #shadowExists(element: HTMLElement) : HSShadow | null {
        for(const [shadowName, shadow] of this.#shadows.entries()) {
            if(element === shadow.getElement()) {
                return shadow;
            }
        }

        return null;
    }
}

/*
    Class: HSShadow
    IsExplicitHSModule: No
    Description: 
        Wrapper class for shadow DOM elements created by HSShadowDOM.
        Contains methods to create, destroy and manage the shadow DOM elements.
*/
export class HSShadow {
    #context = 'HSShadow';

    #shadowDOM: HSShadowDOM;

    #element: HTMLElement;
    name: string;

    #elementParent?: ParentNode;
    #elementNextSibling?: ChildNode | null;
    #elementOriginalStyles?: string;
    #container: HTMLDivElement;

    #containerCSS = {
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

    constructor(element: HTMLElement, name: string, shadowDOM: HSShadowDOM) {
        this.#element = element;
        this.name = name;

        this.#shadowDOM = shadowDOM;

        this.#container = document.createElement('div');
    }

    getElement() : HTMLElement {
        return this.#element;
    }

    getContainer() : HTMLDivElement {
        return this.#container;
    }

    hide() {
        this.#element.style.display = 'none';
        this.#container.style.display = 'none';
        //this.#container.style.pointerEvents = 'none';
    }

    show() {
        this.#element.style.display = 'block';
        this.#container.style.display = 'block';
        //this.#container.style.pointerEvents = 'auto';
    }

    create(visible = false) {
        // Save the original styles of the element
        this.#elementOriginalStyles = this.#element.style.cssText;

        const parent = this.#element.parentNode;
        this.#elementNextSibling = this.#element.nextSibling;

        // If the element has no parent, we can't create a shadow (or we don't want to because we can't restore it)
        if(!parent) {
            HSLogger.warn(`Could not create shadow, parent is null`, this.#context);
            return null;
        }

        this.#elementParent = parent;
        
        for(const [key, value] of Object.entries(this.#containerCSS)) {
            (this.#container.style as any)[key] = value;
        }

        if(!visible) this.hide();

        document.body.appendChild(this.#container);

        this.#element.parentNode?.removeChild(this.#element);
        this.#container.appendChild(this.#element);

        return this;
    }

    destroySelf() {
        
    }

    _destroy() {
        if(!this.#elementParent) {
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