import { 
    CSSKeyValueObject, 
    HSInputType, 
    HSUICButtonOptions, 
    HSUICDivOptions, 
    HSUICFlexOptions, 
    HSUICGridOptions, 
    HSUICInputOptions, 
    HSUICModalOptions, 
    HTMLData, 
    HTMLProps 
} from "../../types/module-types/hs-ui-types";
import { HSUtils } from "../hs-utils/hs-utils";
import { HSUI } from "./hs-ui";

/*
    Class: HSUIC
    IsExplicitHSModule: No
    Description: 
        Hypesynergism UI Component module.
        Contains static methods for creating different UI components.
    Author: Swiffy
*/
export class HSUIC {
    static dataString(data: HTMLData[]) {
        let str = ``;

        data.forEach(d => {
            str += `data-${d.key}="${d.value}" `
        });

        return str;
    }

    static #resolveInputType(inputType: HSInputType) : string {
        switch(inputType) {
            case HSInputType.CHECK:
                return "checkbox";
            case HSInputType.COLOR:
                return "color";
            case HSInputType.NUMBER:
                return "number";
            case HSInputType.TEXT:
                return "text";
        }
    }

    static #resolveInputClass(inputType: HSInputType) : string {
        switch(inputType) {
            case HSInputType.CHECK:
                return "hs-panel-input-checkbox";
            case HSInputType.COLOR:
                return "hs-panel-input-color";
            case HSInputType.NUMBER:
                return "hs-panel-input-number";
            case HSInputType.TEXT:
                return "hs-panel-input-text";
        }
    }

    static #getPropString(props?: HTMLProps) {
        if(!props) return '';

        let propString = '';

        for(const [key, value] of Object.entries(props)) {
            if(typeof value !== undefined)
                propString += ` ${key}="${value}"`;
        }

        return propString;
    }

    // Button Component
    static Button(options: HSUICButtonOptions) : string {
        const comp_class = options.class ?? '';
        const comp_text = options.text ?? '';
        const id = options.id ?? HSUtils.domid();
        const propString = this.#getPropString(options.props);

        HSUI.injectStyle(`#${id} {
            ${HSUtils.objectToCSS(options.styles as CSSKeyValueObject)}
        }`)

        return `<div class="hs-panel-btn ${comp_class}" id="${id}"${propString}>${comp_text}</div>`;
    }

    // Input Component
    static Input(options: HSUICInputOptions) : string {
        const comp_class = options.class ?? '';
        const comp_type = this.#resolveInputType(options.type);
        const comp_input_class = this.#resolveInputClass(options.type);
        const id = options.id ?? HSUtils.domid();
        const propString = this.#getPropString(options.props);

        HSUI.injectStyle(`#${id} {
            ${HSUtils.objectToCSS(options.styles as CSSKeyValueObject)}
        }`)

        return `<input type="${comp_type}" class="${comp_input_class} ${comp_class}" id="${id}"${propString}></input>`;
    }

    // Div Component
    static Div(options: HSUICDivOptions) : string {
        const comp_class = options.class ?? '';
        const id = options.id ?? HSUtils.domid();
        let comp_html = '';
        const propString = this.#getPropString(options.props);

        if(options.html) {
            if(Array.isArray(options.html)) {
                comp_html = options.html.join('\n');
            } else {
                comp_html = options.html;
            }
        } 

        HSUI.injectStyle(`#${id} {
            ${HSUtils.objectToCSS(options.styles as CSSKeyValueObject)}
        }`)

        return `<div class="hs-panel-div ${comp_class}" ${id ? `id="${id}"` : ''}${propString}>${comp_html}</div>`;
    }

    // Grid Component
    static Grid(options: HSUICGridOptions) : string {
        const comp_class = options.class ?? '';
        const id = options.id ?? HSUtils.domid();
        let comp_html = '';
        const propString = this.#getPropString(options.props);

        if(options.html) {
            if(Array.isArray(options.html)) {
                comp_html = options.html.join('\n');
            } else {
                comp_html = options.html;
            }
        }

        HSUI.injectStyle(`#${id} {
            display: grid;
            ${HSUtils.objectToCSS(options.styles as CSSKeyValueObject)}
        }`)

        return `<div class="hs-panel-div ${comp_class}" id="${id}"${propString}>${comp_html}</div>`;
    }

    // Grid Component
    static Flex(options: HSUICFlexOptions) : string {
        const comp_class = options.class ?? '';
        const id = options.id ?? HSUtils.domid();
        let comp_html = '';
        const propString = this.#getPropString(options.props);

        if(options.html) {
            if(Array.isArray(options.html)) {
                comp_html = options.html.join('\n');
            } else {
                comp_html = options.html;
            }
        }

        HSUI.injectStyle(`#${id} {
            display: flex;
            ${HSUtils.objectToCSS(options.styles as CSSKeyValueObject)}
        }`);

        return `<div class="hs-panel-div ${comp_class}" id="${id}"${propString}>${comp_html}</div>`;
    }

    // Pseudo-private method, do not use
    static _modal(options: HSUICModalOptions) : string {
        const comp_class = options.class ?? '';
        const comp_html = options.htmlContent ?? '';
        const comp_data = options.data ?? [];
        const id = options.id ?? HSUtils.domid();
        const propString = this.#getPropString(options.props);

        HSUI.injectStyle(`#${id} {
            ${HSUtils.objectToCSS(options.styles as CSSKeyValueObject)}
        }`);

        return `<div class="hs-modal ${comp_class}" id="${id}"${propString}>
                    <div class="hs-modal-head">
                        <div class="hs-modal-head-left"></div>
                        <div class="hs-modal-head-right" data-close="${options.id}">x</div>
                    </div>
                    <div class="hs-modal-body">
                        ${comp_html}
                    </div>
                </div>`;
    }
}
