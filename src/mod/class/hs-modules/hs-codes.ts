import { HSModuleOptions } from "../../types/hs-types";
import { HSGameDialogs } from "../hs-core/dialogs/hs-game-dialogs";
import { HSElementHooker } from "../hs-core/hs-elementhooker";
import { HSLogger } from "../hs-core/hs-logger";
import { HSModule } from "../hs-core/module/hs-module";
import { HSModuleRegistry } from "../hs-core/module/hs-module-registry";

/**
 * Class: HSCodes
 * IsExplicitHSModule: Yes
 * Description: Hypersynergism module aimed to make reusable code input more convenient.
 * Author: Swiffy, Shewchou
*/
export class HSCodes extends HSModule {
    #codeBoxLabel?: HTMLLabelElement;
    #codeBoxOpenButton?: HTMLButtonElement;
    #config : MutationObserverInit;
    #codeBoxLabelObserver? : MutationObserver;
    #codeSpanStyle = 'white-space: nowrap; user-select: all; -webkit-user-select: all; -moz-user-select: all; -ms-user-select: all;';
    #codeInfo?: HTMLElement;
    #pendingCodeInfoRefresh = new Set<string>();

    constructor(moduleOptions : HSModuleOptions) {
        super(moduleOptions);

        this.#config = { attributes: false, childList: true, subtree: true };

        this.#codeBoxLabelObserver = new MutationObserver((mutations, observer) => {
            this.#codeBoxLabelTrigger(mutations, observer);
        });
    }

    async init(): Promise<void> {
        HSLogger.log("Initialising HSCodes module", this.context);

        const self = this;

        this.#codeBoxOpenButton = await HSElementHooker.HookElement<HTMLButtonElement>('#promocodes') ?? undefined;
        if (!this.#codeBoxOpenButton) { this.isInitialized = true; return; }

        this.#codeBoxOpenButton.addEventListener('click', function(ev) {
            self.#codeBoxLabel = document.querySelector('#promptWrapper > #prompt > label') as HTMLLabelElement;

            if(self.#codeBoxLabel) {
                self.#disconnect();
                self.#codeBoxLabel.innerHTML = '';
                self.#observe();
            }
        }, { capture: true });

        this.#codeBoxLabel = await HSElementHooker.HookElement<HTMLLabelElement>('#promptWrapper > #prompt > label') ?? undefined;

        this.#observe();
        await this.#hookCodeInfoRefresh();
        this.isInitialized = true;
    }

    // The game writes the code info (#promocodeinfo) only on mouseover of the code buttons. When a code's dialogs
    // are answered without the pointer leaving the button (Add x10, Auto-Loadout Time), it keeps showing the uses
    // from before the click. So once the code's dialogs are over (it has paid out), the game's mouseover listener
    // is run again. The clicks on the Add buttons bubble to #addCodeBox, which holds that listener.
    async #hookCodeInfoRefresh() {
        const [addCodeBox, timeCodeButton, codeInfo] = await Promise.all([
            HSElementHooker.HookElement('#addCodeBox'),
            HSElementHooker.HookElement('#timeCode'),
            HSElementHooker.HookElement('#promocodeinfo'),
        ]);
        if (!addCodeBox || !timeCodeButton || !codeInfo) return;
        this.#codeInfo = codeInfo;

        addCodeBox.addEventListener('click', () => this.#refreshCodeInfoWhenDone('add', addCodeBox));
        timeCodeButton.addEventListener('click', () => this.#refreshCodeInfoWhenDone('time', timeCodeButton));
    }

    // Not while autosing runs: it uses both codes at every singularity, with the Settings tab hidden.
    #refreshCodeInfoWhenDone(code: 'add' | 'time', hoverTarget: HTMLElement) {
        if (HSModuleRegistry.getModule('HSAutosing')?.isAutosingActive()) return;
        if (this.#pendingCodeInfoRefresh.has(code)) return;
        this.#pendingCodeInfoRefresh.add(code);

        void HSGameDialogs.whenQueueIdle().then(() => {
            this.#pendingCodeInfoRefresh.delete(code);
            // Only while the info still shows this code. The prefix is a literal of the game's promocodesInfoText(), not translated
            if (!this.#codeInfo?.textContent?.startsWith(`'${code}': `)) return;
            hoverTarget.dispatchEvent(new MouseEvent('mouseover'));
        });
    }

    #observe() {
        this.#codeBoxLabelObserver?.disconnect();
        if (this.#codeBoxLabel) this.#codeBoxLabelObserver?.observe(this.#codeBoxLabel, this.#config);
    }

    #disconnect() {
        this.#codeBoxLabelObserver?.disconnect();
    }

    #codeBoxLabelTrigger(mutations: MutationRecord[], observer: MutationObserver) {
        const self = this;

        try {
            // Need to disconnect or our changes will put this observer into a loop
            this.#disconnect();

            if(this.#codeBoxLabel && this.#codeBoxLabel.innerText.includes("synergism2026")) {
                this.#codeBoxLabel.innerHTML = `<div id="hs-hijack-codes-wrapper">
                    [HSCodes] Hypersynergism has hijacked this modal to offer you all the reusable codes conveniently (click code to auto input it):</br>
                    <span style="${this.#codeSpanStyle}" data-code="synergism2026">synergism2026</span>
                    <span style="${this.#codeSpanStyle}" data-code="Khafra">Khafra</span>
                    <span style="${this.#codeSpanStyle}" data-code=":unsmith:">:unsmith:</span>
                    <span style="${this.#codeSpanStyle}" data-code=":antismith:">:antismith:</span>
                </div>`;

                // On the wrapper itself: the listener goes with it when the label is rewritten
                this.#codeBoxLabel.querySelector('#hs-hijack-codes-wrapper')?.addEventListener('click', (e) => {
                    const span = (e.target as HTMLElement).closest<HTMLElement>('#hs-hijack-codes-wrapper > span');
                    if (!span) return;
                    const code = span.dataset.code;
                    const textInput = document.querySelector('#prompt_text') as HTMLInputElement;

                    if(code && textInput) {
                        textInput.value = code;
                    } else {
                        HSLogger.warn(`Could not inject code to code input`, self.context);
                    }
                });

                HSLogger.debug(() => "Hijacked code redeem panel", this.context);
            }
        } finally {
            // Need to remember to connect the observer again
            this.#observe();
        }
    }
}
