import { HSUI } from "../hs-core/hs-ui";
import { HSPatch } from "./hs-patch";

export class PATCH_AmbrosiaViewOverflow extends HSPatch {
    #patchCSS = `
        #ambrosiaUpgradeValues {
            overflow-y: auto;
            height: 25vh;
        }

        #ambrosiaUpgradeValues::-webkit-scrollbar {
            width: 5px;
            height: 5px;
        }

        #ambrosiaUpgradeValues::-webkit-scrollbar-track {
            background: #1c1b22;
            border-radius: 3px;
        }

        #ambrosiaUpgradeValues::-webkit-scrollbar-thumb {
            background: #a22a2a;
            border-radius: 3px;
        }

        #ambrosiaUpgradeValues::-webkit-scrollbar-corner {
            background: #1c1b22;
        }

        @supports not selector(::-webkit-scrollbar) {
            #ambrosiaUpgradeValues::-webkit-scrollbar {
                scrollbar-color: #a22a2a #1c1b22;
            }
        }`;

    #patchStyleId = "ambrosiaViewOverflowPatch";

    async applyPatch(): Promise<void> {
        HSUI.injectStyle(this.#patchCSS, this.#patchStyleId);
    }

    async revertPatch(): Promise<void> {
        HSUI.removeInjectedStyle(this.#patchStyleId);
    }
}