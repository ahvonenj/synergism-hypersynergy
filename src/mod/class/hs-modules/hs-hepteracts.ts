import { HSElementHooker } from "../hs-core/hs-elementhooker";
import { HSLogger } from "../hs-core/hs-logger";
import { HSModule } from "../hs-core/hs-module";
import { HSSettings } from "../hs-core/hs-settings";
import { HSUI } from "../hs-core/hs-ui";
import { HSUtils } from "../hs-utils/hs-utils";

export class HSHepteracts extends HSModule {
    #heptGrid? : Element;

    #hepteractBaseNames = [
        'chronos',
        'hyperrealism',
        'challenge',
        'abyss',
        'accelerator',
        'acceleratorBoost',
        'multiplier'
    ];

    #hepteracts : string[] = [];
    #hepteractMeters: string[] = [];

    #boxCounts = {
        chronos: 0,
        hyperrealism: 0,
        challenge: 0,
        abyss: 0,
        accelerator: 0,
        acceleratorBoost: 0,
        multiplier: 0
    };

    #hepteractCosts = {
        chronos: 10000,
        hyperrealism: 10000,
        challenge: 50000,
        abyss: 1.00e8,
        accelerator: 100000,
        acceleratorBoost: 200000,
        multiplier: 300000
    };

    #hyperToChronosRatio = 0;
    #challengeToChronosRatio = 0;
    #boostToAcceleratorRatio = 0;
    #multiplierToAcceleratorRatio = 0;
    #acceleratorToChronosRatio = 0;

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

    #ownedHepteractsElement?: HTMLElement;
    #ownedHepteracts?: number;

    #expandPending = false;
    #watchUpdatePending = false;

    constructor(moduleName: string, context: string) {
        super(moduleName, context);

        this.#hepteracts = this.#hepteractBaseNames.map(h => {
            return `${h}Hepteract`;
        });

        this.#hepteractMeters = this.#hepteractBaseNames.map(h => {
            return `${h}ProgressBarText`;
        });
    }

    async init() {
        const self = this;

        HSLogger.log("Initialising HSHepteracts module", this.context);

        this.#heptGrid = await HSElementHooker.HookElement('#heptGrid');

        this.#heptGrid.childNodes.forEach(node => {
            if(node.nodeType === 1) {
                const htmlNode = node as HTMLElement;
                const id = htmlNode.id

                if(self.#hepteracts.includes(id)) {
                    const craftMaxBtn = document.querySelector(`#${id}CraftMax`) as HTMLElement;
                    const capBtn = document.querySelector(`#${id}Cap`) as HTMLElement;
                    const heptImg = document.querySelector(`#${id}Image`) as HTMLElement;
                    
                    if(craftMaxBtn && capBtn && heptImg) {
                        heptImg.addEventListener('click', async () => {
                            if(self.#expandPending || self.#watchUpdatePending) {
                                HSLogger.warn(`Quick expand cancelled, another expand was still pending (exp ${self.#expandPending}, wtch: ${self.#watchUpdatePending})`, self.context);
                                self.#expandPending = false;
                                return;
                            }

                            self.#expandPending = true;
                            self.#watchUpdatePending = true;
                            
                            const boxId = id.substring(0, id.indexOf('Hepteract'));

                            if(boxId in self.#boxCounts && boxId in self.#hepteractCosts && self.#ownedHepteracts) {
                                const currentMax = (self.#boxCounts as any)[boxId];
                                const cubeCost = (self.#hepteractCosts as any)[boxId];
                                const buyCost = currentMax * 2 * cubeCost;
                                const percentOwned = self.#ownedHepteracts > 0 ? buyCost / self.#ownedHepteracts : 1;

                                const expandCostProtectionSetting = HSSettings.getSetting('expandCostProtection');
                            
                                if(expandCostProtectionSetting.enabled) {
                                    if(percentOwned >= expandCostProtectionSetting.settingValue) {
                                        HSLogger.info(`Buying ${boxId} would cost ${percentOwned.toFixed(2)} of current hepts which is >= ${expandCostProtectionSetting.settingValue} (cost protection)`, this.context);
                                        self.#watchUpdatePending = false;
                                        self.#expandPending = false;
                                        return;
                                    }
                                }
                            }

                            capBtn.click();
                            await HSUtils.wait(15);
                            document.getElementById("ok_confirm")?.click();
                            await HSUtils.wait(15);
                            document.getElementById("ok_alert")?.click();
                            await HSUtils.wait(15);
                            craftMaxBtn.click();
                            await HSUtils.wait(15);
                            document.getElementById("ok_confirm")?.click();
                            await HSUtils.wait(15);
                            document.getElementById("ok_alert")?.click();

                            self.#expandPending = false;
                        });
                    }
                }
            }
        });

        HSLogger.log("Hepteract images now serve as 'quick expand and max' buttons", this.context);
        HSLogger.log("Setting up hepteract ratio watch", this.context);

        HSUI.injectStyle(this.#ratioElementStyle);

        HSUI.injectHTML(this.#ratioElementHtml, (node) => {
            const heptGridParent = self.#heptGrid?.parentNode;
            heptGridParent?.insertBefore(node, self.#heptGrid as Node);
        });

        this.#ratioElementA = document.querySelector('#hs-ratio-a') as HTMLElement;
        this.#ratioElementB = document.querySelector('#hs-ratio-b') as HTMLElement;
        this.#ratioElementC = document.querySelector('#hs-ratio-c') as HTMLElement;

        this.#hepteractMeters.forEach(meterId => {
            const meter = document.querySelector(`#${meterId}`) as HTMLElement;
            const boxName = meterId.substring(0, meterId.indexOf('ProgressBar'));

            if(meter && boxName) {
                HSElementHooker.watchElement(meter, (value) => {
                    if(boxName in self.#boxCounts) {
                        (self.#boxCounts as any)[boxName] = value;
                        
                        if(Object.values(self.#boxCounts).every(v => v > 0)) {
                            self.#hyperToChronosRatio = Math.round(self.#boxCounts.chronos / self.#boxCounts.hyperrealism);
                            self.#challengeToChronosRatio = Math.round(self.#boxCounts.chronos / self.#boxCounts.challenge);
                            self.#boostToAcceleratorRatio = Math.round(self.#boxCounts.accelerator / self.#boxCounts.acceleratorBoost);
                            self.#multiplierToAcceleratorRatio = Math.round(self.#boxCounts.accelerator / self.#boxCounts.multiplier);
                            self.#acceleratorToChronosRatio = Math.round(self.#boxCounts.chronos / self.#boxCounts.accelerator);

                            if(this.#ratioElementA && this.#ratioElementB && this.#ratioElementC) {
                                this.#ratioElementA.innerText = `CHR/HYP/CHL: 1 / ${HSUtils.N(self.#hyperToChronosRatio)} / ${HSUtils.N(self.#challengeToChronosRatio)}`;
                                this.#ratioElementB.innerText = `ACC/BST/MLT: 1 / ${HSUtils.N(self.#boostToAcceleratorRatio)} / ${HSUtils.N(self.#multiplierToAcceleratorRatio)}`;
                                this.#ratioElementC.innerText = `CHR/ACC: 1 / ${HSUtils.N(self.#acceleratorToChronosRatio)}`;
                            }
                        }
                    } else {
                        HSLogger.warn(`Key ${boxName} not found in #boxCounts`, self.context);
                    }
                }, (element) => {
                    const value = element.innerText;

                    if(typeof value === 'string') {
                        const split = value.split('/');

                        try {
                            if(split && split[1]) {
                                return parseFloat(split[1]);
                            }
                        } catch (e) {
                            HSLogger.warn(`Parsing failed for ${split}`, self.context);
                            return '';
                        }
                    }
                    return '';
                });
            } else {
                HSLogger.warn(`Invalid meter or boxName`, self.context);
            }
        });

        this.#ownedHepteractsElement = await HSElementHooker.HookElement('#hepteractQuantity') as HTMLElement;

        HSElementHooker.watchElement(this.#ownedHepteractsElement, (value) => {
            try {
                const hepts = parseFloat(value);
                self.#ownedHepteracts = hepts;
            } catch (e) {
                console.log(e);
            }

            self.#watchUpdatePending = false;
        }, (element) => {
            const subElement = element.querySelector('span');
            const value = subElement?.innerText;
            return value;
        }, true);
    }
}
