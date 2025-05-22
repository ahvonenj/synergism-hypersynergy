import { CUBE_VIEW, GAME_STATE_CHANGE, MAIN_VIEW } from "../../types/module-types/hs-gamestate-types";
import { HSElementHooker } from "../hs-core/hs-elementhooker";
import { HSGameState } from "../hs-core/hs-gamestate";
import { HSLogger } from "../hs-core/hs-logger";
import { HSModule } from "../hs-core/module/hs-module";
import { HSModuleManager } from "../hs-core/module/hs-module-manager";
import { HSSetting } from "../hs-core/settings/hs-setting";
import { HSSettings } from "../hs-core/settings/hs-settings";
import { HSShadowDOM } from "../hs-core/hs-shadowdom";
import { HSUI } from "../hs-core/hs-ui";
import { HSUtils } from "../hs-utils/hs-utils";
import { HSModuleOptions } from "../../types/hs-types";

/*
    Class: HSHepteracts
    IsExplicitHSModule: Yes
    Description: 
        Hypersynergism module which implements the following QoL functionalities:
            - In-game hepteract ratio display
            - "Quick expand and max" functionality when the user clicks one of the hepteract icons
            - "Quick expand and max" hepteract cost protection, 
              which won't let the user quick expand a hepteract if it would cost too much
    Author: Swiffy
*/
export class HSHepteracts extends HSModule {
    #heptGrid? : Element;
    #hepteractCraftTexts?: HTMLDivElement;

    #hepteractBaseNames = [
        'chronos',
        'hyperrealism',
        'quark',
        'challenge',
        'abyss',
        'accelerator',
        'acceleratorBoost',
        'multiplier'
    ];

    #hepteracts : string[] = [];
    #hepteractMeters: string[] = [];

    #boxCounts = {
        chronosHepteract: 0,
        hyperrealismHepteract: 0,
        quarkHepteract: 0,
        challengeHepteract: 0,
        abyssHepteract: 0,
        acceleratorHepteract: 0,
        acceleratorBoostHepteract: 0,
        multiplierHepteract: 0
    };

    #hepteractCosts : { [key: string]: number | null } = {
        chronosHepteract: null,
        hyperrealismHepteract: null,
        quarkHepteract: 100,
        challengeHepteract: null,
        abyssHepteract: null,
        acceleratorHepteract: null,
        acceleratorBoostHepteract: null,
        multiplierHepteract: null
    }; 

    #hyperToChallengeRatio = 0;
    #chronosToChallengeRatio = 0;
    #boostToMultiplierRatio = 0;
    #acceleratorToMultiplierRatio = 0;
    #chronosToAcceleratorRatio = 0;

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

    #hepteractForgeView?: HTMLElement;
    #ownedHepteractsElement?: HTMLElement;
    #ownedHepteracts?: number;
    #ownedHepteractsWatch?: string;

    // Quick expand is expected to be spam clicked
    // We need to make sure that hepteract expansion + max goes through
    // and owned hepteracts value is updated before quick expand can be done again
    // Otherwise the hepteract quick expand cost protection might not trigger right
    #expandPending = false;
    #watchUpdatePending = false;

    constructor(moduleOptions : HSModuleOptions) {
        super(moduleOptions);

        this.#hepteracts = this.#hepteractBaseNames.map(h => {
            return `${h}Hepteract`;
        });

        this.#hepteractMeters = this.#hepteractBaseNames.map(h => {
            return `${h}ProgressBarText`;
        });
    }

    async init(): Promise<void> {
        const self = this;

        HSLogger.log("Initialising HSHepteracts module", this.context);

        const gameStateMod = HSModuleManager.getModule<HSGameState>('HSGameState');

        if(gameStateMod) {
            gameStateMod.subscribeGameStateChange("MAIN_VIEW", (prevView, currentView) => {
                if(prevView.getId() === MAIN_VIEW.CUBES && 
                    currentView.getId() !== MAIN_VIEW.CUBES && 
                    gameStateMod.getCurrentUIView("CUBE_VIEW").getId() === CUBE_VIEW.HEPTERACT_FORGE
                ) {
                    if(self.#ownedHepteractsWatch) {
                        HSLogger.debug("Hepteract forge view closed, stopping watch", this.context);
                        HSElementHooker.stopWatching(self.#ownedHepteractsWatch);
                    }
                } 
            });

            gameStateMod.subscribeGameStateChange("CUBE_VIEW", async (prevView, currentView) => {
                if(currentView.getId() === CUBE_VIEW.HEPTERACT_FORGE) {
                    HSLogger.debug("Hepteract forge view opened, starting watch", this.context);
                    self.#ownedHepteractsElement = await HSElementHooker.HookElement('#hepteractQuantity') as HTMLElement;

                    // Sets up a watch to watch for changes in the element which shows owned hepteracts amount
                    self.#ownedHepteractsWatch = HSElementHooker.watchElement(self.#ownedHepteractsElement, (value) => {
                        try {
                            const hepts = parseFloat(HSUtils.unfuckNumericString(value));
                            self.#ownedHepteracts = hepts;
                        } catch (e) {
                            HSLogger.error(`Failed to parse owned hepteracts`, self.context);
                        }

                        self.#watchUpdatePending = false;
                    }, 
                    {
                        greedy: true,
                        overrideThrottle: true,
                        valueParser: (element) => {
                            const subElement = element.querySelector('span');
                            const value = subElement?.innerText;
                            return value;
                        }
                    });
                } else if(prevView.getId() === CUBE_VIEW.HEPTERACT_FORGE) {
                    if(self.#ownedHepteractsWatch) {
                        HSLogger.debug("Hepteract forge view closed, stopping watch", this.context);
                        HSElementHooker.stopWatching(self.#ownedHepteractsWatch);
                    }
                }
            });
        }

        this.#heptGrid = await HSElementHooker.HookElement('#heptGrid');
        this.#hepteractCraftTexts = await HSElementHooker.HookElement('#hepteractCraftTexts') as HTMLDivElement;

        this.#heptGrid.childNodes.forEach(node => {
            if(node.nodeType === 1) {
                const htmlNode = node as HTMLElement;
                const id = htmlNode.id

                if(self.#hepteracts.includes(id)) {
                    const craftMaxBtn = document.querySelector(`#${id}CraftMax`) as HTMLElement;
                    const capBtn = document.querySelector(`#${id}Cap`) as HTMLElement;
                    const heptImg = document.querySelector(`#${id}Image`) as HTMLElement;

                    // As hepteract costs are not static and we don't have direct access to them, we need to parse them from the DOM in a "just-in-time" manner...
                    htmlNode.addEventListener('mouseenter', async (e: MouseEvent) => {

                        if(id in self.#hepteractCosts && id === 'quarkHepteract') {
                            return;
                        }

                        const costElement = document.querySelector('#hepteractCostText') as HTMLDivElement;

                        if(costElement) {
                            const costString = costElement.innerText;
                            const costMatch = costString.match(/you\s+(.*?)\s+Hepteracts/i);

                            if(costMatch) {
                                const cost = costMatch[1];
                                
                                try {
                                    if(id in self.#hepteractCosts) {
                                        const floatCost = HSUtils.parseFloat2(cost);
                                        (self.#hepteractCosts as any)[id] = floatCost;
                                    }
                                } catch (e) {
                                    HSLogger.warn(`Error while parsing hepteract cost for ${id}`, self.context);
                                }
                            }
                        }
                    });
                    
                    if(craftMaxBtn && capBtn && heptImg) {

                        // Update and render hepteract total cost when hovering over the image
                        heptImg.addEventListener('mouseenter', async (evt) => {
                            const target = evt.target as HTMLImageElement;
                            const targetId = target.id;
                            const isQuarkHepteract = targetId.toLowerCase().includes('quark');

                            if(self.#ownedHepteracts !== null && self.#ownedHepteracts !== undefined) {
                                const currentMax = (self.#boxCounts as any)[id];
                                const cubeCost = (self.#hepteractCosts as any)[id];

                                if(currentMax === null || cubeCost === null) return;

                                let hepteractDoubleCapSetting = HSSettings.getSetting('expandCostProtectionDoubleCap') as HSSetting<boolean>;
                                let buyCost = null;

                                if(hepteractDoubleCapSetting.getValue()) {
                                    buyCost = ((currentMax * 2) /*- currentMax*/) * cubeCost;
                                } else {
                                    buyCost = currentMax * 2 * cubeCost;
                                }

                                if(self.#ownedHepteracts === 0) {
                                    self.#updateCraftText(buyCost, '∞', isQuarkHepteract);
                                } else {
                                    const percentOwned = self.#ownedHepteracts > 0 ? buyCost / self.#ownedHepteracts : 1;
                                    self.#updateCraftText(buyCost, percentOwned, isQuarkHepteract);
                                }
                            }
                        });

                        heptImg.addEventListener('click', async (evt) => {
                            const target = evt.target as HTMLImageElement;
                            const targetId = target.id;
                            const isQuarkHepteract = targetId.toLowerCase().includes('quark');

                            if(!targetId) return;

                            // Don't allow quick expand on quark hepteract
                            if(isQuarkHepteract) return;

                            if(self.#expandPending || self.#watchUpdatePending) {
                                HSLogger.debug(`Quick expand cancelled, another expand was still pending (exp ${self.#expandPending}, wtch: ${self.#watchUpdatePending})`, self.context);
                                //self.#expandPending = false;
                                return;
                            }

                            self.#expandPending = true;
                            //self.#watchUpdatePending = true;

                            let buyCost = null;

                            let percentHeptOwned = null;
                            //let percentObtOwned = null;
                            //let percentOfferingOwned = null;

                            if(self.#ownedHepteracts !== null && self.#ownedHepteracts !== undefined) {
                                if(self.#ownedHepteracts === 0) {
                                    HSLogger.info(`Owned hepteracts is 0`, this.context);
                                    self.#expandPending = false;
                                    return;
                                }

                                const currentMax = (self.#boxCounts as any)[id];
                                const cubeCost = (self.#hepteractCosts as any)[id];

                                if(currentMax === null || cubeCost === null) {
                                    HSLogger.warn(`Hepteract cost for ${id} not parsed yet`, self.context);
                                }

                                let hepteractDoubleCapSetting = HSSettings.getSetting('expandCostProtectionDoubleCap') as HSSetting<boolean>;
                                let nextHepts = null;

                                if(hepteractDoubleCapSetting.getValue()) {
                                    nextHepts = ((currentMax * 2) /*- currentMax*/)
                                    buyCost = ((currentMax * 2) /*- currentMax*/) * cubeCost;
                                } else {
                                    nextHepts = currentMax * 2;
                                    buyCost = currentMax * 2 * cubeCost;
                                }

                                percentHeptOwned = self.#ownedHepteracts > 0 ? buyCost / self.#ownedHepteracts : 1;

                                /*const obtHolder = await HSElementHooker.HookElement('#obtainiumDisplay') as HTMLElement;
                                const offeringHolder = await HSElementHooker.HookElement('#offeringDisplay') as HTMLElement;

                                if(obtHolder && offeringHolder) {
                                    const obtText = obtHolder.innerText;
                                    const offeringText = offeringHolder.innerText;

                                    if(obtText && offeringText) {
                                        const obtValue = parseFloat(HSUtils.unfuckNumericString(obtHolder.innerText));
                                        const offeringValue = parseFloat(HSUtils.unfuckNumericString(offeringHolder.innerText));

                                        percentObtOwned = ;
                                        percentOfferingOwned = ;
                                    }
                                }*/

                                HSLogger.debug(`
                                    Current max: ${currentMax},
                                    Cube cost: ${HSUtils.N(cubeCost)},
                                    Next hepts: ${HSUtils.N(nextHepts)},
                                    Buy cost: ${HSUtils.N(buyCost)},
                                    Percent owned: ${HSUtils.N(percentHeptOwned)},
                                    Double Cap: ${hepteractDoubleCapSetting.getValue()}`,
                                    this.context
                                );

                                const expandCostProtectionSetting = HSSettings.getSetting('expandCostProtection') as HSSetting<number>;
                                //const expandCostProtectionObtainiumSetting = HSSettings.getSetting('expandCostProtectionObtainium') as HSSetting<number>;
                                //const expandCostProtectionOfferingSetting = HSSettings.getSetting('expandCostProtectionOffering') as HSSetting<number>;
                                const costProtectionNotificationSetting = HSSettings.getSetting('expandCostProtectionNotifications') as HSSetting<boolean>;

                                const notify = (costProtectionNotificationSetting && costProtectionNotificationSetting.getValue() === true) ? false : true;

                                if(expandCostProtectionSetting.isEnabled()) {
                                    const heptSettingValue = expandCostProtectionSetting.getCalculatedValue();

                                    if(heptSettingValue && (percentHeptOwned >= heptSettingValue)) {
                                        if(notify)
                                            HSLogger.info(`Hept. cost protection: Cost owned ${HSUtils.N(percentHeptOwned * 100)}% >= ${heptSettingValue * 100}%`, this.context);
    
                                        //self.#watchUpdatePending = false;
                                        self.#expandPending = false;
                                        return;
                                    }
                                }

                                /*if(expandCostProtectionObtainiumSetting.isEnabled()) {
                                    const obtSettingValue = expandCostProtectionObtainiumSetting.getCalculatedValue();

                                    if(obtSettingValue && percentObtOwned >= obtSettingValue) {
                                        if(notify)
                                            HSLogger.info(`Obt. cost protection: ${percentObtOwned.toFixed(2)} >= ${obtSettingValue}`, this.context);
    
                                        self.#watchUpdatePending = false;
                                        self.#expandPending = false;
                                        return;
                                    }
                                }

                                if(expandCostProtectionOfferingSetting.isEnabled()) {
                                    const offeringSettingValue = expandCostProtectionOfferingSetting.getCalculatedValue();

                                    if(offeringSettingValue && percentOfferingOwned >= offeringSettingValue) {
                                        if(notify)
                                            HSLogger.info(`Off. cost protection: ${percentOfferingOwned.toFixed(2)} >= ${offeringSettingValue}`, this.context);
    
                                        self.#watchUpdatePending = false;
                                        self.#expandPending = false;
                                        return;
                                    }
                                }*/
                            } else {
                                HSLogger.warn(`Owned hepteracts not parsed yet`, this.context);

                                self.#watchUpdatePending = false;
                                self.#expandPending = false;
                                return;
                            }
                            
                            // This is the small "ON/OFF" toggle button which is used to enable/disable the hepteract buy notifications
                            const hepteractBuyNotificationToggle = await HSElementHooker.HookElement('#toggle35') as HTMLButtonElement;

                            if(hepteractBuyNotificationToggle && hepteractBuyNotificationToggle.innerText.includes('ON')) {
                                HSLogger.info(`Turned hepteract notification toggle OFF`, this.context);
                                hepteractBuyNotificationToggle.click();
                            }

                            // Perform our cap- and max button clicking
                            await HSUtils.hiddenAction(async () => {
                                capBtn.click();
                            }, "confirm", false, 25);

                            await HSUtils.wait(25);
                            
                            craftMaxBtn.click();

                            if(buyCost && percentHeptOwned) {
                                self.#updateCraftText(buyCost, percentHeptOwned);
                            }

                            await HSUtils.wait(5);

                            if(id !== 'quarkHepteract') {
                                const costElement = document.querySelector('#hepteractCostText') as HTMLDivElement;
        
                                if(costElement) {
                                    const costString = costElement.innerText;
                                    const costMatch = costString.match(/you\s+(.*?)\s+Hepteracts/i);
        
                                    if(costMatch) {
                                        const cost = costMatch[1];
                                        
                                        try {
                                            if(id in self.#hepteractCosts) {
                                                const floatCost = HSUtils.parseFloat2(cost);
                                                (self.#hepteractCosts as any)[id] = floatCost;
                                            }
                                        } catch (e) {
                                            HSLogger.warn(`Error while parsing NEW hepteract cost for ${id}`, self.context);
                                        }
                                    }
                                }
                            }
                           
                            const ownedHeptQuantElement = !self.#ownedHepteractsElement ? document.querySelector('#hepteractQuantity') as HTMLElement : self.#ownedHepteractsElement;

                            if(ownedHeptQuantElement) {
                                const subElement = ownedHeptQuantElement.querySelector('span') as HTMLSpanElement;

                                if(subElement) {
                                    const value = subElement.innerText;
                                    const hepts = parseFloat(value);
                                    self.#ownedHepteracts = hepts;
                                }
                            }

                            self.#expandPending = false;
                        });
                    }
                }
            }
        });

        if(document.querySelectorAll('.heptTypeImage').length > 0) {
            HSUI.injectStyle(`
                .heptTypeImage:not(#quarkHepteractImage):not(#hepteractToQuarkImage):not(#overfluxPowderImage) {
                    transform: scale(1);
                    transform-origin: 50% 50%;
                }

                .heptTypeImage:not(#quarkHepteractImage):not(#hepteractToQuarkImage):not(#overfluxPowderImage):hover {
                    transform: scale(1.05);
                    cursor: pointer;
                }

                .heptTypeImage:not(#quarkHepteractImage):not(#hepteractToQuarkImage):not(#overfluxPowderImage):active {
                    transform: scale(0.98);
                }
            `);
        }

        

        HSLogger.log("Hepteract images now serve as 'quick expand and max' buttons", this.context);
        HSLogger.log("Setting up hepteract ratio watch", this.context);

        HSUI.injectStyle(this.#ratioElementStyle);

        HSUI.injectHTMLString(this.#ratioElementHtml, (node) => {
            const heptGridParent = self.#heptGrid?.parentNode;
            heptGridParent?.insertBefore(node, self.#heptGrid as Node);
        });

        this.#ratioElementA = document.querySelector('#hs-ratio-a') as HTMLElement;
        this.#ratioElementB = document.querySelector('#hs-ratio-b') as HTMLElement;
        this.#ratioElementC = document.querySelector('#hs-ratio-c') as HTMLElement;

        this.#hepteractMeters.forEach(meterId => {
            const meter = document.querySelector(`#${meterId}`) as HTMLElement;
            const boxName = meterId.substring(0, meterId.indexOf('ProgressBar')) + 'Hepteract';

            if(meter && boxName) {
                HSElementHooker.watchElement(meter, (value) => {
                    if(boxName in self.#boxCounts) {
                        (self.#boxCounts as any)[boxName] = value;
                        
                        if(Object.values(self.#boxCounts).every(v => v > 0)) {
                            self.#chronosToChallengeRatio = Math.round(self.#boxCounts.chronosHepteract / self.#boxCounts.challengeHepteract);
                            self.#hyperToChallengeRatio = Math.round(self.#boxCounts.hyperrealismHepteract / self.#boxCounts.challengeHepteract);
                            self.#acceleratorToMultiplierRatio = Math.round(self.#boxCounts.acceleratorHepteract / self.#boxCounts.multiplierHepteract);
                            self.#boostToMultiplierRatio = Math.round(self.#boxCounts.acceleratorBoostHepteract / self.#boxCounts.multiplierHepteract);
                            self.#chronosToAcceleratorRatio = Math.round(self.#boxCounts.chronosHepteract / self.#boxCounts.acceleratorHepteract);

                            if(this.#ratioElementA && this.#ratioElementB && this.#ratioElementC) {
                                this.#ratioElementA.innerText = `CHR/HYP/CHL: ${HSUtils.N(self.#chronosToChallengeRatio, 0)} / ${HSUtils.N(self.#hyperToChallengeRatio, 0)} / 1`;
                                this.#ratioElementB.innerText = `ACC/BST/MLT: ${HSUtils.N(self.#acceleratorToMultiplierRatio, 0)} / ${HSUtils.N(self.#boostToMultiplierRatio, 0)} / 1`;
                                this.#ratioElementC.innerText = `CHR/ACC: ${HSUtils.N(self.#chronosToAcceleratorRatio, 0)} / 1`;
                            }
                        }
                    } else {
                        HSLogger.warn(`Key ${boxName} not found in #boxCounts`, self.context);
                    }
                }, 
                {
                    valueParser: (element) => {
                        const value = element.innerText;
    
                        if(typeof value === 'string') {
                            const split = value.split('/');
    
                            try {
                                if(split && split[1]) {
                                    return parseFloat(HSUtils.unfuckNumericString(split[1]));
                                }
                            } catch (e) {
                                HSLogger.warn(`Parsing failed for ${split}`, self.context);
                                return '';
                            }
                        }
                        return '';
                    }
                });
            } else {
                HSLogger.warn(`Invalid meter or boxName`, self.context);
            }
        });

        this.isInitialized = true;
    }

    // Not used yet, but might be useful in the future
    #getHepteractCost(hepteractId: string): { cost: number; percentOwned: number } | undefined {
        const costObj: { cost: number; percentOwned: number } = {
            cost: 0,
            percentOwned: 0
        }

        if(this.#ownedHepteracts !== null && this.#ownedHepteracts !== undefined) {
            if(this.#ownedHepteracts === 0) {
                HSLogger.info(`Owned hepteracts is 0`, this.context);
                return undefined;
            }

            const currentMax = (this.#boxCounts as any)[hepteractId];
            const cubeCost = (this.#hepteractCosts as any)[hepteractId];

            if(currentMax === null || cubeCost === null) {
                HSLogger.warn(`Hepteract cost for ${hepteractId} not parsed yet`, this.context);
                return undefined;
            };

            let hepteractDoubleCapSetting = HSSettings.getSetting('expandCostProtectionDoubleCap') as HSSetting<boolean>;
            let buyCost = null;

            if(hepteractDoubleCapSetting.getValue()) {
                buyCost = currentMax * cubeCost;
            } else {
                buyCost = currentMax * 2 * cubeCost;
            }

            const percentOwned = this.#ownedHepteracts > 0 ? buyCost / this.#ownedHepteracts : 1;

            return {
                cost: buyCost,
                percentOwned: percentOwned
            }
        } else {
            HSLogger.warn(`Owned hepteracts not parsed yet`, this.context);
            return undefined;
        }
    }

    #updateCraftText(buyCost: number, percentOwned: number | string, isQuarkHepteract: boolean = false) {
        if(this.#hepteractCraftTexts) {
            const hasCostText = this.#hepteractCraftTexts.querySelector(`#hs-costText`) as HTMLDivElement;

            let persOwn;

            if(HSUtils.isNumeric(percentOwned)) {
                persOwn = HSUtils.N(percentOwned as number * 100);
            } else {
                persOwn = percentOwned as string;
            }

            if(!hasCostText) {
                const costText = document.createElement('div');
                costText.id = 'hs-costText';

                if(isQuarkHepteract)
                    costText.innerText = `[${this.context}]: Total QUARK cost to max after next expand: ${HSUtils.N(buyCost)} (ESTIMATE!)`;
                else
                    costText.innerText = `[${this.context}]: Total HEPT cost to max after next expand: ${HSUtils.N(buyCost)} (${persOwn}% of owned)`;

                this.#hepteractCraftTexts.appendChild(costText);
            } else {
                if(isQuarkHepteract)
                    hasCostText.innerText = `[${this.context}]: Total QUARK cost to max after next expand: ${HSUtils.N(buyCost)} (ESTIMATE!)`;
                else
                    hasCostText.innerText = `[${this.context}]: Total HEPT cost to max after next expand: ${HSUtils.N(buyCost)} (${persOwn}% of owned)`;
            }
        }
    }
}
