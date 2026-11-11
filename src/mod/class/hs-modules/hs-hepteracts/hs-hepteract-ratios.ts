import { HSElementHooker } from "../../hs-core/hs-elementhooker";
import { HSGlobal } from "../../hs-core/hs-global";
import { HSLogger } from "../../hs-core/hs-logger";
import { HSUI } from "../../hs-core/hs-ui";
import { HSUtils } from "../../hs-utils/hs-utils";
import { HSNumberParser } from "../../hs-utils/hs-number-parser";
import type { HepteractKeys } from "../../../types/data-types/hs-player-savedata";
import { HEPTERACT_DATA, readHepteract } from "./hs-hepteract-state";

/**
 * Class: HSHepteractRatios
 * IsExplicitHSModule: No
 * Description:
 *     Created by HSHepteracts. Shows the ratios between the hepteracts' capacities above the Hepteract Forge's grid
 *     (CHR/HYP/CHL, ACC/BST/MLT, CHR/ACC), updated whenever a meter changes. Only shown once every hepteract has a capacity.
 * Author: Swiffy, Shewchou
 */
export class HSHepteractRatios {
    #context: string;

    #capacities = Object.fromEntries(
        Object.keys(HEPTERACT_DATA).map(key => [key, 0])
    ) as Record<HepteractKeys, number>;

    #ratioElementHtml = `
        <div id="hs-ratio-container">
            <div class="hs-ratio" id="hs-ratio-a">CHR/HYP/CHL: 1 / 123 / 123</div>
            <div class="hs-ratio" id="hs-ratio-b">ACC/BST/MLT: 1 / 123 / 123</div>
            <div class="hs-ratio" id="hs-ratio-c">CHR/ACC: 1 / 123</div>
        </div>`;

    #ratioElementStyle = `
        #hs-ratio-container {
            width: 100%;
            display: grid;
            justify-items: center;
            grid-template-columns: repeat(3, 1fr);
            grid-template-rows: 1fr;
            grid-column-gap: 0px;
            grid-row-gap: 0px;
        }`;

    #ratioElementA?: HTMLElement;
    #ratioElementB?: HTMLElement;
    #ratioElementC?: HTMLElement;

    constructor(context: string) {
        this.#context = context;
    }

    init(heptGrid: Element): void {
        HSLogger.log("Setting up hepteract ratio watch", this.#context);

        HSUI.injectStyle(this.#ratioElementStyle);

        HSUI.injectHTMLString(this.#ratioElementHtml, (node) => {
            heptGrid.parentNode?.insertBefore(node, heptGrid);
        });

        this.#ratioElementA = document.querySelector('#hs-ratio-a') as HTMLElement;
        this.#ratioElementB = document.querySelector('#hs-ratio-b') as HTMLElement;
        this.#ratioElementC = document.querySelector('#hs-ratio-c') as HTMLElement;

        (Object.keys(this.#capacities) as HepteractKeys[]).forEach(key => {
            const meter = document.querySelector(`#${key}ProgressBarText`) as HTMLElement;
            if (!meter) {
                HSLogger.warn(`Invalid meter for ${key}`, this.#context);
                return;
            }

            HSElementHooker.watchElement(meter, (value) => {
                this.#capacities[key] = value;
                this.#updateRatios();
            }, {
                valueParser: (element) => {
                    const value = element.innerText;

                    if (typeof value === 'string') {
                        const split = value.split('/');

                        try {
                            if (split && split[1]) {
                                const shownCapacity = HSNumberParser.parse(split[1]);
                                // The shown capacity is cut to 3 digits above 1e6, which puts large ratios off
                                // (128 becomes 127): the exact one is used when the live player object has it
                                const live = Number.isNaN(shownCapacity)
                                    ? null
                                    : readHepteract(HSGlobal.exposedPlayer, key);
                                return live ? live.finalCapacity : shownCapacity;
                            }
                        } catch (e) {
                            HSLogger.warn(`Parsing failed for ${split}`, this.#context);
                            return '';
                        }
                    }
                    return '';
                }
            });
        });
    }

    #updateRatios(): void {
        const box = this.#capacities;
        if (!Object.values(box).every(v => v > 0)) return;

        // group 1: CHR / HYP / CHL
        const min1 = Math.min(box.chronos, box.hyperrealism, box.challenge);
        const chronosToMinChrHypCha = Math.round(box.chronos / min1);
        const hyperToMinChrHypCha = Math.round(box.hyperrealism / min1);
        const challengeToMinChrHypCha = Math.round(box.challenge / min1);

        // group 2: ACC / BST / MLT
        const min2 = Math.min(box.accelerator, box.acceleratorBoost, box.multiplier);
        const acceleratorToMinAccBooMul = Math.round(box.accelerator / min2);
        const boostToMinAccBooMul = Math.round(box.acceleratorBoost / min2);
        const multiplierToMinAccBooMul = Math.round(box.multiplier / min2);

        // group 3: CHR / ACC
        const min3 = Math.min(box.chronos, box.accelerator);
        const chronosToMinChrAcc = Math.round(box.chronos / min3);
        const acceleratorToMinChrAcc = Math.round(box.accelerator / min3);

        if (this.#ratioElementA && this.#ratioElementB && this.#ratioElementC) {
            this.#ratioElementA.innerText = `CHR/HYP/CHL: ${HSUtils.N(chronosToMinChrHypCha, 0)} / ${HSUtils.N(hyperToMinChrHypCha, 0)} / ${HSUtils.N(challengeToMinChrHypCha, 0)}`;
            this.#ratioElementB.innerText = `ACC/BST/MLT: ${HSUtils.N(acceleratorToMinAccBooMul, 0)} / ${HSUtils.N(boostToMinAccBooMul, 0)} / ${HSUtils.N(multiplierToMinAccBooMul, 0)}`;
            this.#ratioElementC.innerText = `CHR/ACC: ${HSUtils.N(chronosToMinChrAcc, 0)} / ${HSUtils.N(acceleratorToMinChrAcc, 0)}`;
        }
    }
}
