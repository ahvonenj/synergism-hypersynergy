import { HSInputType, HSUICButtonOptions, HSUICDivOptions, HSUICInputOptions, HSUICModalOptions, HTMLData } from "../../types/hs-ui-types";

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

    static Button(options: HSUICButtonOptions) : string {
        const comp_class = options.class ?? '';
        const comp_text = options.text ?? '';

        return `<div class="hs-panel-btn ${comp_class}" id="${options.id}">${comp_text}</div>`;
    }

    static Input(options: HSUICInputOptions) : string {
        const comp_class = options.class ?? '';
        const comp_type = this.#resolveInputType(options.type);
        const comp_input_class = this.#resolveInputClass(options.type);

        return `<input type="${comp_type}" class="${comp_input_class} ${comp_class}" id="${options.id}"></input>`;
    }

    static Div(options: HSUICDivOptions) : string {
        const comp_class = options.class ?? '';
        let comp_html = '';

        if(options.html) {
            if(Array.isArray(options.html)) {
                comp_html = options.html.join('\n');
            } else {
                comp_html = options.html;
            }
        } 

        return `<div class="hs-panel-div ${comp_class}" ${options.id ? `id="${options.id}"` : ''}>${comp_html}</div>`;
    }

    static _modal(options: HSUICModalOptions) : string {
        const comp_class = options.class ?? '';
        const comp_html = options.htmlContent ?? '';
        const comp_data = options.data ?? [];

        return `<div class="hs-modal ${comp_class}" id="${options.id}">
                    <div class="hs-modal-head">
                        <div class="hs-modal-head-left"></div>
                        <div class="hs-modal-head-right" data-close="${options.id}">x</div>
                    </div>
                    <div class="hs-modal-body">
                        ${comp_html}
                    </div>
                </div>`;
    }

    static closeModal(a: any) {
        console.log(a)
    }
}
