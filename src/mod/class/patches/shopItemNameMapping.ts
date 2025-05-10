import { HSElementHooker } from "../hs-core/hs-elementhooker";
import { HSLogger } from "../hs-core/hs-logger";
import { HSPatch } from "./hs-patch";
import shop_item_map from "inline:../../resource/data/shop.json";

export class PATCH_ShopItemNameMapping extends HSPatch {

    #shopItemNameMap?: { [key: string]: string; };
    #hoverEvent?: (event: MouseEvent) => void;

    async applyPatch(): Promise<void> {
        const self = this;

        try {
            this.#shopItemNameMap = JSON.parse(shop_item_map) as { [key: string]: string; };

            const shopWrapper = await HSElementHooker.HookElement('#actualShop') as HTMLDivElement;

            if(shopWrapper) {
                if (!this.#hoverEvent) {
                    this.#hoverEvent = (e: MouseEvent) => { self.#shopItemHoverHandler(e); };
                }

                shopWrapper.removeDelegateEventListener('mouseover', 'div', this.#hoverEvent);
                shopWrapper.delegateEventListener('mouseover', 'div', this.#hoverEvent);
            }
        } catch(err) {
            HSLogger.error("Failed to parse shop item map");
            this.#shopItemNameMap = undefined;
        }
    }

    #shopItemHoverHandler(e: MouseEvent): void {
        let shopItem: HTMLDivElement;

        if (e.target instanceof HTMLDivElement) {
            shopItem = e.target;
        } else if (e.target instanceof HTMLImageElement ||
            e.target instanceof HTMLParagraphElement ||
            e.target instanceof HTMLButtonElement) {
            shopItem = e.target.parentElement as HTMLDivElement;
        } else {
            return;
        }

        if(shopItem.id === "actualShop")
            return
        
        const shopItemImg = shopItem.querySelector('img');

        if(shopItemImg) {
            const shopItemId = shopItemImg.id;
            const shopItemName = this.#shopItemNameMap?.[shopItemId];
            
            const shopHoverElement = document.querySelector('#shopHovers') as HTMLDivElement;
            const shopHoverNameElement = shopHoverElement.querySelector('#hs-shopHoverName') as HTMLDivElement;

            if(shopHoverNameElement) {
                shopHoverNameElement.innerText = shopItemName || "";
            } else {
                const nameElement = document.createElement('div');
                nameElement.id = "hs-shopHoverName";
                nameElement.innerText = shopItemName || "";
                shopHoverElement.insertBefore(nameElement, shopHoverElement.querySelector('p:nth-child(2)'));
            }
        }
    }

    async revertPatch(): Promise<void> {
        if (this.#hoverEvent) {
            const shopWrapper = await HSElementHooker.HookElement('#actualShop') as HTMLDivElement;

            if(shopWrapper) {
                shopWrapper.removeDelegateEventListener('mouseover', 'div', this.#hoverEvent);
            }
        }

        const shopHoverNameElement = document.querySelector('#hs-shopHoverName') as HTMLDivElement;

        if(shopHoverNameElement) {
            shopHoverNameElement.remove();
        }
    }
}