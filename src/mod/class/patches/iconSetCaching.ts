import { HSGameDataAPI } from "../hs-core/gds/hs-gamedata-api";
import { HSModuleManager } from "../hs-core/module/hs-module-manager";
import { HSPatch } from "./hs-patch";

// Currently borked
export class PATCH_IconSetCaching extends HSPatch {

    /*#icons = [
        'Multiplier.png',
        'TinyCrumbs.png',
        'TinyELO.png',
        'TinyChallenge10.png',
        'Offering.png',
        'Obtainium.png',
        'SacrificeNoBorder.png',
    ];

    #iconSets: { [key: number]: string } = {
        0: 'Legacy',
        1: 'Default',
        2: 'Simplified',
        3: 'Monotonous',
    }*/

    async applyPatch(): Promise<void> {
        /*const gameDataAPI = HSModuleManager.getModule('HSGameDataAPI') as HSGameDataAPI;

        if(!gameDataAPI) return;

        const head = document.head;

        if(head.querySelectorAll('.hs-iconset-preload').length > 0)
            return;

        const iconSetNum = gameDataAPI.getGameData()?.iconSet;

        if(iconSetNum) {
            const iconSet = this.#iconSets[iconSetNum];

            if(iconSet) {
                this.#icons.forEach((url) => {
                    const link = document.createElement('link');
                    link.rel = 'preload';
                    link.as = 'image';
                    link.href = `https://synergism.cc/Pictures/${iconSet}/${url}`;
                    link.classList.add('hs-iconset-preload')
                    head.appendChild(link);
                });
            }
        }*/
    }

    async revertPatch(): Promise<void> {
        /*const head = document.head;

        if(head.querySelectorAll('.hs-iconset-preload').length === 0)
            return;

        head.querySelectorAll('.hs-iconset-preload').forEach((link) => {
            head.removeChild(link);
        });*/
    }
}