import {
    CSSKeyValueObject,
    HSInputType,
    HSUICButtonOptions,
    HSUICDivOptions,
    HSUICGridOptions,
    HSUICImageOptions,
    HSUICInputOptions,
    HSUICModalOptions,
    HSUICPOptions,
    HSUICSelectOption,
    HTMLProps
} from "../../types/module-types/hs-ui-types";
import { HSUtils } from "../hs-utils/hs-utils";
import { HSGlobal } from "./hs-global";
import { HSLogger } from "./hs-logger";
import { escapeHtml } from '../hs-utils/hs-escape';

/**
 *   Class: HSUIC
 *   IsExplicitHSModule: No
 *   Description: Hypesynergism UI Component module.
 *     - Contains static methods for creating different UI components.
 *   Author: Swiffy
 */
export class HSUIC {
    static #staticContext = 'HSUIC';

    static #dataString(data?: Map<string, string>) {
        if (!data) return '';

        let str = ``;

        for (const [key, value] of data.entries()) {
            str += `data-${key}="${value}" `;
        }

        return str;
    }

    static #resolveInputType(inputType: HSInputType): string {
        switch (inputType) {
            case HSInputType.CHECK:
                return "checkbox";
            case HSInputType.COLOR:
                return "color";
            case HSInputType.NUMBER:
                return "number";
            case HSInputType.TEXT:
                return "text";
            case HSInputType.SELECT:
                return "select";
            case HSInputType.STATE:
                return "state";
        }
    }

    static #resolveInputClass(inputType: HSInputType): string {
        switch (inputType) {
            case HSInputType.CHECK:
                return "hs-panel-input-checkbox";
            case HSInputType.COLOR:
                return "hs-panel-input-color";
            case HSInputType.NUMBER:
                return "hs-panel-input-number";
            case HSInputType.TEXT:
                return "hs-panel-input-text";
            case HSInputType.SELECT:
                return "hs-panel-input-select";
            case HSInputType.STATE:
                return "hs-panel-input-state";
        }
    }

    static #getPropString(props?: HTMLProps, styles?: CSSKeyValueObject) {
        const css = HSUtils.objectToCSS(styles as CSSKeyValueObject);
        const resolved = css ? { ...props, style: (props?.style ? props.style + ';' : '') + css } : props;
        if (!resolved) return '';

        let propString = '';

        for (const [key, value] of Object.entries(resolved)) {
            if (value !== undefined)
                propString += ` ${key}="${key === 'style' ? escapeHtml(value) : value}"`;
        }

        return propString;
    }

    // Button Component
    static Button(options: HSUICButtonOptions): string {
        const comp_class = options.class ?? '';
        const comp_text = options.text ?? '';
        const id = options.id ?? HSUtils.domid();
        const propString = this.#getPropString(options.props, options.styles as CSSKeyValueObject);
        const dataString = this.#dataString(options.data);

        return `<div class="hs-panel-btn ${comp_class}" id="${id}"${propString} ${dataString}>${comp_text}</div>`;
    }

    // Input Component
    static Input(options: HSUICInputOptions): string {
        const comp_class = options.class ?? '';
        const comp_type = this.#resolveInputType(options.type);
        const comp_input_class = this.#resolveInputClass(options.type);
        const id = options.id ?? HSUtils.domid();
        const propString = this.#getPropString(options.props, options.styles as CSSKeyValueObject);
        const dataString = this.#dataString(options.data);

        return `<input type="${comp_type}" class="${comp_input_class} ${comp_class}" id="${id}"${propString} ${dataString}></input>`;
    }

    // Input Component
    static Select(options: HSUICInputOptions, selectOptions: HSUICSelectOption[]): string {
        const comp_class = options.class ?? '';
        const comp_input_class = this.#resolveInputClass(options.type);
        const id = options.id ?? HSUtils.domid();
        const propString = this.#getPropString(options.props, options.styles as CSSKeyValueObject);
        const dataString = this.#dataString(options.data);

        const selectOptionsStr = selectOptions.map((option) => {
            return `<option value="${escapeHtml(String(option.value))}" ${option.selected ? 'selected' : ''}>${escapeHtml(option.text)}</option>`;
        }
        ).join('\n');

        return `<select class="${comp_input_class} ${comp_class}" id="${id}"${propString} ${dataString}>${selectOptionsStr}</select>`;
    }

    // Div Component
    static Div(options: HSUICDivOptions): string {
        const comp_class = options.class ?? '';
        const id = options.id ?? HSUtils.domid();
        let comp_html = '';
        const propString = this.#getPropString(options.props, options.styles as CSSKeyValueObject);
        const dataString = this.#dataString(options.data);

        if (options.html) {
            if (Array.isArray(options.html)) {
                comp_html = options.html.join('\n');
            } else {
                comp_html = options.html;
            }
        }

        return `<div class="hs-panel-div ${comp_class}" ${id ? `id="${id}"` : ''}${propString} ${dataString}>${comp_html}</div>`;
    }

    // Div Component
    static P(options: HSUICPOptions): string {
        const comp_class = options.class ?? '';
        const id = options.id ?? HSUtils.domid();
        let comp_text = '';
        const propString = this.#getPropString(options.props, options.styles as CSSKeyValueObject);
        const dataString = this.#dataString(options.data);

        if (options.text) {
            if (Array.isArray(options.text)) {
                comp_text = options.text.join('\n');
            } else {
                comp_text = options.text;
            }
        }

        return `<p class="hs-panel-p ${comp_class}" ${id ? `id="${id}"` : ''}${propString} ${dataString}>${comp_text}</p>`;
    }

    // Div Component
    static Image(options: HSUICImageOptions): string {
        const comp_class = options.class ?? '';
        const id = options.id ?? HSUtils.domid();
        const propString = this.#getPropString(options.props, options.styles as CSSKeyValueObject);
        const dataString = this.#dataString(options.data);

        if (!options.src) {
            HSLogger.warn(`HSUIC.Image: No src provided for image component`, this.#staticContext);
            return '';
        }

        const width = options.width ? options.width : HSGlobal.HSUIC.defaultImageWidth;
        const height = options.height ? options.height : HSGlobal.HSUIC.defaultImageHeight;

        return `<img src="${options.src}" width="${width}" height="${height}" class="hs-panel-img ${comp_class}" ${id ? `id="${id}"` : ''}${propString} ${dataString}/>`;
    }

    // Grid Component
    static Grid(options: HSUICGridOptions): string {
        const comp_class = options.class ?? '';
        const id = options.id ?? HSUtils.domid();
        let comp_html = '';
        const propString = this.#getPropString(options.props, { ...options.styles, display: options.styles?.display ?? 'grid' } as CSSKeyValueObject);
        const dataString = this.#dataString(options.data);

        if (options.html) {
            if (Array.isArray(options.html)) {
                comp_html = options.html.join('\n');
            } else {
                comp_html = options.html;
            }
        }

        return `<div class="hs-panel-div ${comp_class}" id="${id}"${propString} ${dataString}>${comp_html}</div>`;
    }

    // Pseudo-private method, do not use
    static _modal(options: HSUICModalOptions): string {
        const comp_class        = options.class ?? '';
        const comp_header_class = options.headerClass ?? '';
        const comp_body_class   = options.bodyClass ?? '';
        const comp_html         = options.htmlContent ?? '';
        const comp_title        = options.title ?? '';
        const id                = options.id ?? HSUtils.domid();
        const propString = this.#getPropString(options.props, options.styles as CSSKeyValueObject);
        const dataString = this.#dataString(options.data);

        return `
            <div class="hs-modal ${comp_class}" id="${id}"${propString} ${dataString}>
                <div class="hs-modal-head ${comp_header_class}">
                    <div class="hs-modal-head-left">
                        <div class="hs-modal-title">${comp_title}</div>
                    </div>
                    <div class="hs-modal-head-buttons">
                        <div class="hs-modal-btn hs-modal-minimize-btn" data-minimize="${options.id}" title="Minimize">_</div>
                        <div class="hs-modal-btn hs-modal-close-btn" data-close="${options.id}" title="Close">x</div>
                    </div>
                </div>
                <div class="hs-modal-body hs-scrollbar-themed ${comp_body_class}">
                    ${comp_html}
                </div>
                <div class="hs-modal-resizer"></div>
            </div>`;
    }
}
