import { HSUICButtonOptions, HSUICModalOptions, HTMLData } from "../../types/hs-ui-types";

export class HSUIC {
	static dataString(data: HTMLData[]) {
		let str = ``;

		data.forEach(d => {
			str += `data-${d.key}="${d.value}" `
		});

		return str;
	}

	static Button(options: HSUICButtonOptions) {
		const comp_class = options.class ?? '';
		const comp_text = options.text ?? 'Button';

		return `<div class="hs-panel-btn ${comp_class}" id="${options.id}">${comp_text}</div>`;
	}

	static _modal(options: HSUICModalOptions) {
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