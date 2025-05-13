import { PlayerData } from "../../types/hs-player-savedata";
import { HSGameDataSubscriber, HSPersistable } from "../../types/hs-types";
import { AMBROSIA_ICON, AMBROSIA_LOADOUT_SLOT, HSAmbrosiaLoadoutIcon, HSAmbrosiaLoadoutState } from "../../types/module-types/hs-ambrosia-types";
import { CUBE_VIEW, MAIN_VIEW, SINGULARITY_VIEW, VIEW_KEY, VIEW_TYPE } from "../../types/module-types/hs-gamestate-types";
import { HSElementHooker } from "../hs-core/hs-elementhooker";
import { HSGameData } from "../hs-core/hs-gamedata";
import { GameView, HSGameState } from "../hs-core/hs-gamestate";
import { HSGlobal } from "../hs-core/hs-global";
import { HSLogger } from "../hs-core/hs-logger";
import { HSModule } from "../hs-core/hs-module";
import { HSModuleManager } from "../hs-core/hs-module-manager";
import { HSSelectNumericSetting, HSSelectStringSetting, HSSetting } from "../hs-core/hs-setting";
import { HSSettings } from "../hs-core/hs-settings";
import { HSShadowDOM } from "../hs-core/hs-shadowdom";
import { HSStorage } from "../hs-core/hs-storage";
import { HSUI } from "../hs-core/hs-ui";
import { HSUtils } from "../hs-utils/hs-utils";

export class HSAmbrosia extends HSModule 
implements HSPersistable, HSGameDataSubscriber {

    gameDataSubscriptionId?: string;
    #gameStateMainViewSubscriptionId?: string;
    #gameStateSubViewSubscriptionId?: string;

    #ambrosiaGrid: HTMLElement | null = null;
    #loadOutsSlots: HTMLElement[] = [];

    #loadOutContainer: HTMLElement | null = null;
    #pageHeader: HTMLElement | null = null;
    
    #loadoutState: HSAmbrosiaLoadoutState = new Map<AMBROSIA_LOADOUT_SLOT, AMBROSIA_ICON>();

    #currentLoadout?: AMBROSIA_LOADOUT_SLOT;

    #_delegateAddHandler?: (e: Event) => Promise<void>;
    #_delegateTimeHandler?: (e: Event) => Promise<void>;
    
    #quickBarClickHandlers: Map<HTMLButtonElement, (e: Event) => Promise<void>> = new Map<HTMLButtonElement, (e: Event) => Promise<void>>();

    #quickbarCSS = `
        #${HSGlobal.HSAmbrosia.quickBarId} > .blueberryLoadoutSlot:hover {
            filter: brightness(150%);
        }
        
        .hs-ambrosia-active-slot {
            --angle: 0deg;
            border-image: conic-gradient(
                from var(--angle), 
                #ff5e00, 
                #ff9a00, 
                #ffcd00, 
                #e5ff00, 
                #a5ff00, 
                #00ffc8, 
                #00c8ff, 
                #00a5ff, 
                #9500ff, 
                #ff00e1, 
                #ff0095, 
                #ff5e00
            ) 1;
            
            animation: hue-rotate 6s linear infinite;
        }

        @keyframes hue-rotate {
            to {
                --angle: 360deg;
            }
        }

        @property --angle {
            syntax: '<angle>';
            initial-value: 0deg;
            inherits: false;
        }
    `;

    #quickbarCSSId = 'hs-ambrosia-quickbar-css';

    #idleLoadoutCSS = `
        #hs-ambrosia-loadout-idle-swap-indicator {
            margin-bottom: 10px;
            font-family: fantasy;
            letter-spacing: 3px;

            background: linear-gradient(to right, #774ed1 20%, #00affa 30%, #0190cd 70%, #774ed1 80%);
            -webkit-background-clip: text;
            background-clip: text;
            -webkit-text-fill-color: transparent;
            background-size: 500% auto;
            animation: loadout-ind-glow 3.5s ease-in-out infinite alternate;
        }

        @-webkit-keyframes loadout-ind-glow {
            0% {
                background-position: 0% 50%;
            }

            100% {
                background-position: 100% 50%;
            }
        }
    `;

    #idleLoadoutCSSId = 'hs-ambrosia-idle-loadout-css';

    #isIdleSwapEnabled = false;
    #blueAmbrosiaProgressBar?: HTMLDivElement;
    #redAmbrosiaProgressBar?: HTMLDivElement;

    constructor(moduleName: string, context: string, moduleColor?: string) {
        super(moduleName, context, moduleColor);
    }

    async init() {
        const self = this;

        HSLogger.log(`Initializing HSAmbrosia module`, this.context);

        this.#ambrosiaGrid = await HSElementHooker.HookElement('#blueberryUpgradeContainer');
        this.#loadOutsSlots = await HSElementHooker.HookElements('.blueberryLoadoutSlot');
        this.#loadOutContainer = await HSElementHooker.HookElement('#bbLoadoutContainer');

        this.loadState();

        HSLogger.log('Hooking stuff', this.context);

        for(const [id, icon] of HSGlobal.HSAmbrosia.ambrosiaLoadoutIcons.entries()) {
            const amrosiaGridElement = document.querySelector(`#${icon.draggableIconId}`) as HTMLElement;

            if(amrosiaGridElement) {
                amrosiaGridElement.draggable = true;
                amrosiaGridElement.dataset.hsid = id;

                amrosiaGridElement.addEventListener("dragstart", (e) => {
                    if(!e.dataTransfer) return;

                    const id = (e.currentTarget as HTMLElement)?.dataset.hsid;

                    if(!id) return;

                    HSLogger.log(`Drag start ${id}`, this.context);

                    e.dataTransfer.effectAllowed = "move";
                    e.dataTransfer.setData("hs-amb-drag", id);
                });
            }
        }

        if(!this.#loadOutContainer) {
            HSLogger.warn(`Could not find loadout container`, this.context);
            return;
        }

        this.#loadOutsSlots.forEach((slot) => {
            // Here we load the loadout icons for the loadout slots if there is any saved
            const slotElementId = slot.id;

            if(slotElementId) {
                const slotEnum = this.#getSlotEnumBySlotId(slotElementId);

                if (slotEnum) {
                    const savedIcon = this.#loadoutState.get(slotEnum);

                    if (savedIcon) {
                        this.#applyIconToSlot(slotEnum, savedIcon);
                    }
                }
            }
        });

        this.#loadOutContainer.delegateEventListener('dragenter', '.blueberryLoadoutSlot', (e) => {
            if(e.dataTransfer) {
                if(e.dataTransfer.types.includes('hs-amb-drag')) {
                    e.preventDefault();
                    e.stopPropagation();
                    e.dataTransfer.effectAllowed = "move";
                }
            }
        });

        this.#loadOutContainer?.delegateEventListener('dragover', '.blueberryLoadoutSlot', (e) => {
            if(e.dataTransfer) {
                if(e.dataTransfer.types.includes('hs-amb-drag')) {
                    e.preventDefault();
                    e.stopPropagation();
                    e.dataTransfer.effectAllowed = "move";
                }
            }
        });

        this.#loadOutContainer?.delegateEventListener('drop', '.blueberryLoadoutSlot', async (e) => {
            if(e.dataTransfer && e.dataTransfer.types.includes('hs-amb-drag')) {
                e.preventDefault();
                e.stopPropagation();

                const iconEnum = this.#getIconEnumById(e.dataTransfer.getData('hs-amb-drag'));
                const slotElement = e.target as HTMLButtonElement;
                const slotElementId = slotElement.id;

                if (!iconEnum) {
                    HSLogger.warn(`Invalid icon ID: ${iconEnum}`, this.context);
                    return;
                }

                if(!HSGlobal.HSAmbrosia.ambrosiaLoadoutIcons.has(iconEnum)) {
                    HSLogger.warn(`Could not find loadout slot entry for ${iconEnum}`, this.context);
                    return;
                }

                if(!slotElement.classList.contains('blueberryLoadoutSlot')) {
                    return;
                }

                if(!slotElementId) return;

                const slotEnum = this.#getSlotEnumBySlotId(slotElementId);

                if (!slotEnum) {
                    HSLogger.warn(`Invalid slot ID: ${slotElementId}`, this.context);
                    return;
                }

                const icon = HSGlobal.HSAmbrosia.ambrosiaLoadoutIcons.get(iconEnum)!;

                // Apply the icon to the slot and save the state
                this.#applyIconToSlot(slotEnum, iconEnum);
                this.#loadoutState.set(slotEnum, iconEnum);
                this.saveState();

                await self.updateQuickBar();
            }
        });

        this.#loadOutContainer?.delegateEventListener('contextmenu', '.blueberryLoadoutSlot', async (e) => {
            e.preventDefault();

            // Clear the slot icon
            const slotElement = e.target as HTMLButtonElement;
            const slotElementId = slotElement.id;
            const slotEnum = this.#getSlotEnumBySlotId(slotElementId);

            if (!slotEnum) {
                HSLogger.warn(`Invalid slot ID: ${slotElementId}`, this.context);
                return;
            }

            const iconEnum = this.#loadoutState.get(slotEnum);
            if (!iconEnum) {
                HSLogger.warn(`No icon found for slot ID: ${slotElementId}`, this.context);
                return;
            }

            slotElement.classList.remove('hs-ambrosia-slot');
            slotElement.style.backgroundImage = '';
            this.#loadoutState.delete(slotEnum);
            this.saveState();

            await self.updateQuickBar();
        });

        this.#loadOutContainer?.delegateEventListener('click', '.blueberryLoadoutSlot', async (e) => {
            const slotElement = e.target as HTMLButtonElement;
                const slotElementId = slotElement.id;
                const slotEnum = this.#getSlotEnumBySlotId(slotElementId);

                if (!slotEnum) {
                    HSLogger.warn(`Invalid slot ID: ${slotElementId}`, this.context);
                    return;
                }

                await self.#updateCurrentLoadout(slotEnum);
        });

        this.isInitialized = true;
    }

    async #updateCurrentLoadout(slotEnum: AMBROSIA_LOADOUT_SLOT) {
        this.#currentLoadout = slotEnum;

        const loadoutStateSetting = HSSettings.getSetting('autoLoadoutState') as HSSetting<string>;

        if(loadoutStateSetting) {
            loadoutStateSetting.setValue(`<green>${slotEnum}</green>`);
        }

        if(!this.#pageHeader) {
            this.#pageHeader = await HSElementHooker.HookElement('header');
        }

        const quickBar = this.#pageHeader.querySelector(`#${HSGlobal.HSAmbrosia.quickBarId}`) as HTMLElement;

        if(quickBar) {
            quickBar.querySelectorAll('.blueberryLoadoutSlot').forEach((slot) => {
                slot.classList.remove('hs-ambrosia-active-slot');
            });

            const activeSlot = quickBar.querySelector(`#${HSGlobal.HSAmbrosia.quickBarLoadoutIdPrefix}-${slotEnum}`) as HTMLElement;

            if(activeSlot) {
                activeSlot.classList.add('hs-ambrosia-active-slot');
            }
        } else {
            HSLogger.warn(`Could not find quick bar element`, this.context);
        }
    }

    #getIconEnumById(iconId: string): AMBROSIA_ICON | undefined {
        return Object.values(AMBROSIA_ICON).find(
            icon => icon === iconId
        ) as AMBROSIA_ICON | undefined;
    }

    #getSlotEnumBySlotId(slotId: string): AMBROSIA_LOADOUT_SLOT | undefined {
        return Object.values(AMBROSIA_LOADOUT_SLOT).find(
            slot => slot === slotId
        ) as AMBROSIA_LOADOUT_SLOT | undefined;
    }

    #applyIconToSlot(slot: AMBROSIA_LOADOUT_SLOT, iconEnum: AMBROSIA_ICON) {
        const slotElement = document.querySelector(`#${slot}`) as HTMLElement;

        if(!slotElement) {
            HSLogger.warn(`Could not find slot element for ${slot}`, this.context);
            return;
        }

        const icon = HSGlobal.HSAmbrosia.ambrosiaLoadoutIcons.get(iconEnum);

        if(!icon) {
            HSLogger.warn(`Could not find icon for ${iconEnum}`, this.context);
            return;
        }

        slotElement.classList.add('hs-ambrosia-slot');
        slotElement.style.backgroundImage = `url(${icon.url})`;
    }

    async saveState(): Promise<any> {
        const storageModule = HSModuleManager.getModule('HSStorage') as HSStorage;

        if(storageModule) {
            const serializedState = JSON.stringify(Array.from(this.#loadoutState.entries()));
            storageModule.setData(HSGlobal.HSAmbrosia.storageKey, serializedState);
        } else {
            HSLogger.warn(`saveState - Could not find storage module`, this.context);
        }
    }

    async loadState(): Promise<void> {
        const storageModule = HSModuleManager.getModule('HSStorage') as HSStorage;

        if(storageModule) {
            const data = storageModule.getData(HSGlobal.HSAmbrosia.storageKey) as string;

            if(!data) {
                HSLogger.warn(`loadState - No data found`, this.context);
                return;
            }

            try {
                const parsedData = JSON.parse(data) as [AMBROSIA_LOADOUT_SLOT, AMBROSIA_ICON][];
                this.#loadoutState = new Map(parsedData);
            } catch(e) {
                HSLogger.warn(`loadState - Error parsing data`, this.context);
                return;
            }
        } else {
            HSLogger.warn(`loadState - Could not find storage module`, this.context);
        }

        const loadoutStateSetting = HSSettings.getSetting('autoLoadoutState') as HSSetting<string>;

        if(loadoutStateSetting && !this.#currentLoadout) {
            this.#currentLoadout = HSUtils.removeColorTags(loadoutStateSetting.getValue()) as AMBROSIA_LOADOUT_SLOT;
        } else {
            HSLogger.warn(`loadState - Could not find autoLoadoutState setting`, this.context);
        }
    }

    async createQuickBar() {
        const self = this;

        this.#quickBarClickHandlers.forEach((handler, button) => {
            button.removeEventListener('click', handler);
        });
        
        this.#quickBarClickHandlers.clear();

        // Get the ambrosia louadout container element
        this.#loadOutContainer = await HSElementHooker.HookElement('#bbLoadoutContainer');

        // Get the page header element
        this.#pageHeader = await HSElementHooker.HookElement('header');

        if(this.#loadOutContainer && this.#pageHeader) {
            const referenceElement = this.#pageHeader.querySelector('nav.navbar') as HTMLElement;

            // Clone the loadout container and set a new ID for it
            const clone = this.#loadOutContainer.cloneNode(true) as HTMLElement;
            clone.id = HSGlobal.HSAmbrosia.quickBarId;

            const cloneSettingButton = clone.querySelector('.blueberryLoadoutSetting') as HTMLButtonElement;
            const cloneLoadoutButtons = clone.querySelectorAll('.blueberryLoadoutSlot') as NodeListOf<HTMLButtonElement>;

            // Set a new ID for each quickbar button and add event listeners to them
            // The ID's must be overwritten to be unique, otherwise all hell breaks loose
            cloneLoadoutButtons.forEach((button) => {
                const buttonId = button.id;
                button.id = `${HSGlobal.HSAmbrosia.quickBarLoadoutIdPrefix}-${buttonId}`;

                const buttonHandler = async function(e: Event) {
                    await self.#quickBarClickHandler(e, buttonId);
                };

                this.#quickBarClickHandlers.set(button, buttonHandler);

                // Make the quickbar buttons simulate a click on the real buttons
                button.addEventListener('click', buttonHandler);
            });

            if(cloneSettingButton) {
                cloneSettingButton.remove();
            }

            this.#pageHeader.insertBefore(clone, referenceElement);

            HSUI.injectStyle(this.#quickbarCSS, this.#quickbarCSSId);

            if(this.#currentLoadout) {
                await this.#updateCurrentLoadout(this.#currentLoadout);
            }
        }
    }

    async destroyQuickBar() {
        if(!this.#pageHeader) {
            this.#pageHeader = await HSElementHooker.HookElement('header');
        }

        const quickBar = this.#pageHeader.querySelector(`#${HSGlobal.HSAmbrosia.quickBarId}`) as HTMLElement;

        if(quickBar) {
            this.#quickBarClickHandlers.forEach((handler, button) => {
                button.removeEventListener('click', handler);
            });
            
            this.#quickBarClickHandlers.clear();

            quickBar.remove();
            
            HSUI.removeInjectedStyle(this.#quickbarCSSId);
        } else {
            HSLogger.warn(`Could not find quick bar element`, this.context);
        }
    }

    // Helper method to destroy the quick bar and recreate it (which updates the icons)
    async updateQuickBar() {
        const quickbarSetting = HSSettings.getSetting('ambrosiaQuickBar') as HSSetting<boolean>;

        if(quickbarSetting.isEnabled()) {
            await this.destroyQuickBar();
            await this.createQuickBar();

            if(this.#currentLoadout) {
                await this.#updateCurrentLoadout(this.#currentLoadout);
            }
        }
    }

    async enableAutoLoadout() {
        const self = this;

        const loadoutStateSetting = HSSettings.getSetting('autoLoadoutState') as HSSetting<string>;
        
        if((loadoutStateSetting && loadoutStateSetting.getValue().includes('Unknown')) || !this.#currentLoadout) {
            const autoLoadoutSetting = HSSettings.getSetting('autoLoadout') as HSSetting<boolean>;

            if(autoLoadoutSetting && autoLoadoutSetting.isEnabled()) {
                autoLoadoutSetting.disable();
            }

            HSLogger.warn(`Could not enable auto loadout - current loadout state is not known!`, this.context);
            return;
        }

        const promises = [
            HSElementHooker.HookElement('#addCode'),
            HSElementHooker.HookElement('#addCodeAll'),
            HSElementHooker.HookElement('#addCodeOne'),
            HSElementHooker.HookElement('#timeCode')
        ];
        
        const results = await Promise.allSettled(promises);

        const buttons = results.map((result, index) => {
            if (result.status === 'fulfilled') {
                return result.value as HTMLButtonElement;
            } else {
                return null;
            }
        });

        if(buttons.some(button => button === null)) {
            HSLogger.warn(`Problem with enabling auto loadout`, this.context);
            return;
        }

        const [addCodeBtn, addCodeAllBtn, addCodeOneBtn, timeButton] = buttons as HTMLButtonElement[];

        if (!this.#_delegateAddHandler) {
            this.#_delegateAddHandler = async (e: Event) => { await self.#addCodeButtonHandler(e); };
        }
        
        if (!this.#_delegateTimeHandler) {
            this.#_delegateTimeHandler = async (e: Event) => { await self.#timeCodeButtonHandler(e); };
        }

        addCodeBtn.removeEventListener('click', this.#_delegateAddHandler, { capture: true });
        addCodeBtn.addEventListener('click', this.#_delegateAddHandler, { capture: true });

        addCodeAllBtn.removeEventListener('click', this.#_delegateAddHandler, { capture: true });
        addCodeAllBtn.addEventListener('click', this.#_delegateAddHandler, { capture: true });

        addCodeOneBtn.removeEventListener('click', this.#_delegateAddHandler, { capture: true });
        addCodeOneBtn.addEventListener('click', this.#_delegateAddHandler, { capture: true });

        timeButton.removeEventListener('click', this.#_delegateTimeHandler, { capture: true });	
        timeButton.addEventListener('click', this.#_delegateTimeHandler, { capture: true });

        HSLogger.log(`Enabled auto loadout`, this.context);
    }

    async disableAutoLoadout() {
        const self = this;

        const promises = [
            HSElementHooker.HookElement('#addCode'),
            HSElementHooker.HookElement('#addCodeAll'),
            HSElementHooker.HookElement('#addCodeOne'),
            HSElementHooker.HookElement('#timeCode')
        ];
        
        const results = await Promise.allSettled(promises);

        const buttons = results.map((result, index) => {
            if (result.status === 'fulfilled') {
                return result.value as HTMLButtonElement;
            } else {
                return null;
            }
        });

        if(buttons.some(button => button === null)) {
            HSLogger.warn(`Problem with disabling auto loadout`, this.context);
            return;
        }

        const [addCodeBtn, addCodeAllBtn, addCodeOneBtn, timeButton] = buttons as HTMLButtonElement[];

        if (this.#_delegateAddHandler) {
            addCodeBtn.removeEventListener('click', this.#_delegateAddHandler, { capture: true });
            addCodeAllBtn.removeEventListener('click', this.#_delegateAddHandler, { capture: true });
            addCodeOneBtn.removeEventListener('click', this.#_delegateAddHandler, { capture: true });
        }

        if (this.#_delegateTimeHandler)
            timeButton.removeEventListener('click', this.#_delegateTimeHandler, { capture: true });	

        HSLogger.log(`Disabled auto loadout`, this.context);
    }

    async #addCodeButtonHandler(e: Event) {
        const currentLoadout = this.#currentLoadout;
        const addLoadoutSetting = HSSettings.getSetting('autoLoadoutAdd') as HSSelectStringSetting;

        if(currentLoadout && addLoadoutSetting) {
            const addLoadout = this.#convertSettingLoadoutToSlot(addLoadoutSetting.getValue());
            const loadoutSlot = await HSElementHooker.HookElement(`#${addLoadout}`) as HTMLButtonElement;

            await this.#maybeTurnLoadoutModeToLoad();

            await HSUtils.hiddenAction(async () => {
                loadoutSlot.click();
            });
        }
    }

    async #timeCodeButtonHandler(e: Event) {
        const currentLoadout = this.#currentLoadout;
        const timeLoadoutSetting = HSSettings.getSetting('autoLoadoutTime') as HSSelectStringSetting;

        if(currentLoadout && timeLoadoutSetting) {
            const timeLoadout = this.#convertSettingLoadoutToSlot(timeLoadoutSetting.getValue());
            const loadoutSlot = await HSElementHooker.HookElement(`#${timeLoadout}`) as HTMLButtonElement;

            await this.#maybeTurnLoadoutModeToLoad();

            await HSUtils.hiddenAction(async () => {
                loadoutSlot.click();
            });
        }
    }

    async #quickBarClickHandler(e: Event, buttonId: string) {
        const realButton = document.querySelector(`#${buttonId}`) as HTMLButtonElement;

        if(realButton) {
            await this.#maybeTurnLoadoutModeToLoad();
            await HSUtils.hiddenAction(async () => {
                realButton.click();
            });
            
        } else {
            HSLogger.warn(`Could not find real button for ${buttonId}`, this.context);
        }
    }

    async #maybeTurnLoadoutModeToLoad() {
        const modeButton = await HSElementHooker.HookElement('#blueberryToggleMode') as HTMLButtonElement;

        if(modeButton) {
            const currentMode = modeButton.innerText;

            // If the current mode is SAVE, we need to switch to LOAD mode
            // This is so that the user never accidentally saves a loadout when using the quickbar
            if(currentMode.includes('SAVE')) {
                modeButton.click();
            }
        }
    }

    #convertSettingLoadoutToSlot(loadoutNumber: string): AMBROSIA_LOADOUT_SLOT | undefined {
        const loadoutEnum = Object.values(AMBROSIA_LOADOUT_SLOT).find(
            slot => slot === `blueberryLoadout${loadoutNumber}`
        ) as AMBROSIA_LOADOUT_SLOT | undefined;

        if(!loadoutEnum) {
            HSLogger.warn(`Could not convert loadout ${loadoutNumber} to slot`, this.context);
        }

        return loadoutEnum;
    }

    subscribeGameDataChanges() {
        const gameDataMod = HSModuleManager.getModule<HSGameData>('HSGameData');

        if(gameDataMod) {
            this.gameDataSubscriptionId = gameDataMod.subscribeGameDataChange(this.gameDataCallback.bind(this));
        }
    }

    unsubscribeGameDataChanges() {
        const gameDataMod = HSModuleManager.getModule<HSGameData>('HSGameData');

        if(gameDataMod && this.gameDataSubscriptionId) {
            gameDataMod.unsubscribeGameDataChange(this.gameDataSubscriptionId);
            this.gameDataSubscriptionId = undefined;
        }
    }

    #calculateAmbrosiaSpeed(data: PlayerData) {
        const gameDataMod = HSModuleManager.getModule<HSGameData>('HSGameData');

        if(!gameDataMod) return 0;
        if(!data) return 0;

        const pseudoData = gameDataMod.getPseudoData();
        const meBonuses = gameDataMod.getMeBonuses();

        const P_GEN_BUFF_LVL = pseudoData?.playerUpgrades.find(u => u.internalName === "AMBROSIA_GENERATION_BUFF")?.level;
        const P_GEN_BUFF = P_GEN_BUFF_LVL ? 1 + P_GEN_BUFF_LVL * 0.05 : 0;

        const TOKEN_EL = document.querySelector('#campaignTokenCount') as HTMLHeadingElement;
        let tokens = 0;

        if(TOKEN_EL) {
            const match = TOKEN_EL.innerText.match(/You have (\d+)/);

            if (match && match[1]) {
                const leftValue = parseInt(match[1], 10);
                tokens = leftValue;
            }
        }

        let campaignBlueberrySpeedBonus;
        
        if(tokens < 2000) {
            campaignBlueberrySpeedBonus = 1;
        } else {
            campaignBlueberrySpeedBonus = 1 + 0.05 * 1 / 2000 * Math.min(tokens - 2000, 2000) + 0.05 * (1 - Math.exp(-Math.max(tokens - 4000, 0) / 2000));
        }

        // https://github.com/Pseudo-Corp/SynergismOfficial/blob/master/src/Calculate.ts#L2340
        const R_calculateAmbrosiaGenerationShopUpgrade = () => {
            const multipliers = [
                1 + data.shopUpgrades.shopAmbrosiaGeneration1 / 100,
                1 + data.shopUpgrades.shopAmbrosiaGeneration2 / 100,
                1 + data.shopUpgrades.shopAmbrosiaGeneration3 / 100,
                1 + data.shopUpgrades.shopAmbrosiaGeneration4 / 1000
            ]
            
            return multipliers.reduce((a, b) => a * b);
        }

        // https://github.com/Pseudo-Corp/SynergismOfficial/blob/master/src/Calculate.ts#L2362
        // https://github.com/Pseudo-Corp/SynergismOfficial/blob/master/src/singularity.ts#L1515
        const R_calculateAmbrosiaGenerationSingularityUpgrade = () => {
            const vals = [
              1 + data.singularityUpgrades.singAmbrosiaGeneration.level / 100,
              1 + data.singularityUpgrades.singAmbrosiaGeneration2.level / 100,
              1 + data.singularityUpgrades.singAmbrosiaGeneration3.level / 100,
              1 + data.singularityUpgrades.singAmbrosiaGeneration4.level / 100,
            ]
          
            return vals.reduce((a, b) => a * b);
        }

        // https://github.com/Pseudo-Corp/SynergismOfficial/blob/master/src/Calculate.ts#L2384
        const R_calculateAmbrosiaGenerationOcteractUpgrade = () => {
            const vals = [
              1 + data.octeractUpgrades.octeractAmbrosiaGeneration.level / 100,
              1 + data.octeractUpgrades.octeractAmbrosiaGeneration2.level / 100,
              1 + data.octeractUpgrades.octeractAmbrosiaGeneration3.level / 100,
              1 + 2 * data.octeractUpgrades.octeractAmbrosiaGeneration4.level / 100
            ]
          
            return vals.reduce((a, b) => a * b);
        }

        const QUARK_BONUS = 100 * (1 + meBonuses.globalBonus / 100) * (1 + meBonuses.personalBonus / 100) - 100;

        const RED_AMB_GEN_1 = HSUtils.investStonks(
            data.redAmbrosiaUpgrades.blueberryGenerationSpeed,
            1,
            100,
            (n: number, cpl: number) => cpl * (n + 1),
            (n: number) => 1 + n / 500
        );

        const RED_AMB_GEN_2 = HSUtils.investStonks(
            data.redAmbrosiaUpgrades.blueberryGenerationSpeed2,
            2000,
            500,
            (n: number, cpl: number) => cpl + 0 * n,
            (n: number) => 1 + n / 1000
        );

        const cube76 = data.cubeUpgrades[76] ?? 0;

        const speedComponents = [
            +(data.visitedAmbrosiaSubtab),
            P_GEN_BUFF,
            campaignBlueberrySpeedBonus,
            R_calculateAmbrosiaGenerationShopUpgrade(),
            R_calculateAmbrosiaGenerationSingularityUpgrade(),
            R_calculateAmbrosiaGenerationOcteractUpgrade(),
            1 + (data.blueberryUpgrades.ambrosiaPatreon.level * QUARK_BONUS) / 100,
            (1 + data.singularityChallenges.oneChallengeCap.completions / 100),
            (1 + data.singularityChallenges.noAmbrosiaUpgrades.completions / 50),
            RED_AMB_GEN_1,
            RED_AMB_GEN_2,
            1 + 0.01 * cube76 * this.#R_calculateNumberOfThresholds(data.lifetimeAmbrosia),
            // event
        ];

        return speedComponents.reduce((a, b) => a * b, 1);
    }

    #calculateBlueBerries(data: PlayerData) {
        if(!data) return 0;
        // https://github.com/Pseudo-Corp/SynergismOfficial/blob/master/src/Calculate.ts#L2453
        const R_calculateSingularityMilestoneBlueberries = () => {
            let val = 0
            if (data.highestSingularityCount >= 270) val = 5
            else if (data.highestSingularityCount >= 256) val = 4
            else if (data.highestSingularityCount >= 192) val = 3
            else if (data.highestSingularityCount >= 128) val = 2
            else if (data.highestSingularityCount >= 64) val = 1
            return val;
        }

        let noAmbrosiaFactor = 0;
        if(data.singularityChallenges.noAmbrosiaUpgrades.completions >= 10)
            noAmbrosiaFactor = 2;
        else if(data.singularityChallenges.noAmbrosiaUpgrades.completions > 0)
            noAmbrosiaFactor = 1;

        const blueberryComponents = [
            +(data.singularityChallenges.noSingularityUpgrades.completions > 0),
            +(data.singularityUpgrades.blueberries.level),
            +(data.octeractUpgrades.octeractBlueberries.level),
            R_calculateSingularityMilestoneBlueberries(),
            noAmbrosiaFactor
        ]

        return blueberryComponents.reduce((a, b) => a + b, 0);
    }

    #calculateLuck(data: PlayerData, blueberries: number) : { additive: number, raw: number, total: number } {
        const gameDataMod = HSModuleManager.getModule<HSGameData>('HSGameData');
        if(!gameDataMod) return { additive: 0, raw: 0, total: 0 };
        if(!data) return { additive: 0, raw: 0, total: 0 };

        // https://github.com/Pseudo-Corp/SynergismOfficial/blob/master/src/Calculate.ts#L2539
        const R_calculateDilatedFiveLeafBonus = () => {
            const singThresholds = [100, 150, 200, 225, 250, 255, 260, 265, 269, 272]
            for (let i = 0; i < singThresholds.length; i++) {
                if (data.highestSingularityCount < singThresholds[i]) return i / 100
            }

            return singThresholds.length / 100
        }

        // https://github.com/Pseudo-Corp/SynergismOfficial/blob/master/src/Calculate.ts#L2320
        const R_calculateSingularityAmbrosiaLuckMilestoneBonus = () => {
            let bonus = 0
            const singThresholds1 = [35, 42, 49, 56, 63, 70, 77]
            const singThresholds2 = [135, 142, 149, 156, 163, 170, 177]

            for (const sing of singThresholds1) {
                if (data.highestSingularityCount >= sing) {
                    bonus += 5
                }
            }

            for (const sing of singThresholds2) {
                if (data.highestSingularityCount >= sing) {
                    bonus += 6
                }
            }

            return bonus
        }

        // https://github.com/Pseudo-Corp/SynergismOfficial/blob/master/src/Calculate.ts#L2351
        const R_calculateAmbrosiaLuckShopUpgrade = () => {
            const vals = [
                2 * data.shopUpgrades.shopAmbrosiaLuck1,
                2 * data.shopUpgrades.shopAmbrosiaLuck2,
                2 * data.shopUpgrades.shopAmbrosiaLuck3,
                0.6 * data.shopUpgrades.shopAmbrosiaLuck4
            ]

            return vals.reduce((a, b) => a + b, 0)
        }

        // https://github.com/Pseudo-Corp/SynergismOfficial/blob/master/src/Calculate.ts#L2373
        const R_calculateAmbrosiaLuckSingularityUpgrade = () => {
            const vals = [
                +data.singularityUpgrades.singAmbrosiaLuck.level * 4,
                +data.singularityUpgrades.singAmbrosiaLuck2.level * 2,
                +data.singularityUpgrades.singAmbrosiaLuck3.level * 3,
                +data.singularityUpgrades.singAmbrosiaLuck4.level * 5
            ]

            return vals.reduce((a, b) => a + b, 0);
        }

        const R_calculateAmbrosiaLuckOcteractUpgrade = () => {
            const vals = [
                +data.octeractUpgrades.octeractAmbrosiaLuck.level * 4,
                +data.octeractUpgrades.octeractAmbrosiaLuck2.level * 2,
                +data.octeractUpgrades.octeractAmbrosiaLuck3.level * 3,
                +data.octeractUpgrades.octeractAmbrosiaLuck4.level * 5
            ]

            return vals.reduce((a, b) => a + b, 0);
        }

        const cube77 = data.cubeUpgrades[77] ?? 0

        const additiveComponents = [
            1,
            data.singularityChallenges.noSingularityUpgrades.completions >= 30 ? 0.05 : 0,
            R_calculateDilatedFiveLeafBonus(),
            data.shopUpgrades.shopAmbrosiaLuckMultiplier4 / 100,
            data.singularityChallenges.noAmbrosiaUpgrades.completions / 200,
            0.001 * cube77,
            // event
        ]

        const pseudoData = gameDataMod.getPseudoData();
        const P_BUFF_LVL = pseudoData?.playerUpgrades.find(u => u.internalName === "AMBROSIA_LUCK_BUFF")?.level;
        const P_BUFF = P_BUFF_LVL ?  P_BUFF_LVL * 20 : 0;
        let campaignBonus = 0;

        const TOKEN_EL = document.querySelector('#campaignTokenCount') as HTMLHeadingElement;
        let tokens = 0;

        if(TOKEN_EL) {
            const match = TOKEN_EL.innerText.match(/You have (\d+)/);

            if (match && match[1]) {
                const leftValue = parseInt(match[1], 10);
                tokens = leftValue;
            }
        }

        if (tokens < 2000) {
            campaignBonus = 0;
        } else {
            campaignBonus = 10
            + 40 * 1 / 2000 * Math.min(tokens - 2000, 2000)
            + 50 * (1 - Math.exp(-Math.max(tokens - 4000, 0) / 2500));
        }

        const RED_AMB_FREE_ROW_2 = HSUtils.investStonks(
            data.redAmbrosiaUpgrades.freeLevelsRow2,
            10,
            5,
            (n: number, cpl: number) => cpl * Math.pow(2, n),
            (n: number) => n
        );

        const RED_AMB_FREE_ROW_3 = HSUtils.investStonks(
            data.redAmbrosiaUpgrades.freeLevelsRow3,
            250,
            5,
            (n: number, cpl: number) => cpl * Math.pow(2, n),
            (n: number) => n
        );

        const RED_AMB_FREE_ROW_4 = HSUtils.investStonks(
            data.redAmbrosiaUpgrades.freeLevelsRow4,
            5000,
            5,
            (n: number, cpl: number) => cpl * Math.pow(2, n),
            (n: number) => n
        );

        const RED_AMB_FREE_ROW_5 = HSUtils.investStonks(
            data.redAmbrosiaUpgrades.freeLevelsRow5,
            50000,
            5,
            (n: number, cpl: number) => cpl * Math.pow(2, n),
            (n: number) => n
        );

        const RED_AMB_FREE_ROWS : { [key: number]: number } = {
            2: RED_AMB_FREE_ROW_2,
            3: RED_AMB_FREE_ROW_3,
            4: RED_AMB_FREE_ROW_4,
            5: RED_AMB_FREE_ROW_5,
        }

        const effLevel = (level: number, rowNum: number) => {
            return level + RED_AMB_FREE_ROWS[rowNum]
        }

        const blueLuck1 = data.blueberryUpgrades.ambrosiaLuck1.level;
        const blueLuck2 = data.blueberryUpgrades.ambrosiaLuck2.level;
        const blueLuck3 = data.blueberryUpgrades.ambrosiaLuck3.level;

        // https://github.com/Pseudo-Corp/SynergismOfficial/blob/master/src/BlueberryUpgrades.ts#L564
        const totalCubes = () => {
            return (Math.floor(Math.log10(Number(data.wowCubes) + 1))
            + Math.floor(Math.log10(Number(data.wowTesseracts) + 1))
            + Math.floor(Math.log10(Number(data.wowHypercubes) + 1))
            + Math.floor(Math.log10(Number(data.wowPlatonicCubes) + 1))
            + Math.floor(Math.log10(data.wowAbyssals + 1))
            + Math.floor(Math.log10(data.wowOcteracts + 1))
            + 6);
        }

        const blueCubeLuck = data.blueberryUpgrades.ambrosiaCubeLuck1.level;
        const blueQuarkLuck = data.blueberryUpgrades.ambrosiaQuarkLuck1.level;

        const RED_AMB_LUCK1 = HSUtils.investStonks(
            data.redAmbrosiaUpgrades.regularLuck,
            1,
            100,
            (n: number, cpl: number) => cpl * (n + 1),
            (n: number) => 2 * n
        );

        const RED_AMB_LUCK2 = HSUtils.investStonks(
            data.redAmbrosiaUpgrades.regularLuck2,
            2000,
            500,
            (n: number, cpl: number) => cpl + 0 * n,
            (n: number) => 2 * n
        );

        const RED_AMB_VISCOUNT = HSUtils.investStonks(
            data.redAmbrosiaUpgrades.viscount,
            99999,
            1,
            (n: number, cpl: number) => cpl * (n + 1),
            (n: number) => 125 * n
        );

        // https://github.com/Pseudo-Corp/SynergismOfficial/blob/master/src/Calculate.ts#L2753
        const R_calculateCookieUpgrade29Luck = () => {
            if (data.cubeUpgrades[79] === 0 || data.lifetimeRedAmbrosia === 0) {
                return 0
            } else {
                return 10 * Math.pow(Math.log10(data.lifetimeRedAmbrosia), 2)
            }
        }

        // https://github.com/Pseudo-Corp/SynergismOfficial/blob/master/src/Calculate.ts#L2652
        const R_sumOfExaltCompletions = () => {
            let sum = 0
            for (const challenge of Object.values(data.singularityChallenges)) {
                sum += challenge.completions
            }
            return sum
        }

        const rawLuckComponents = [
            100,
            P_BUFF,
            campaignBonus,
            R_calculateSingularityAmbrosiaLuckMilestoneBonus(),
            R_calculateAmbrosiaLuckShopUpgrade(),
            R_calculateAmbrosiaLuckSingularityUpgrade(),
            R_calculateAmbrosiaLuckOcteractUpgrade(),
            // 1
            2 * effLevel(blueLuck1, 2) + 12 * Math.floor(effLevel(blueLuck1, 2) / 10),
            // 2
            (3 + 0.3 * Math.floor(effLevel(blueLuck1, 2) / 10))
            * effLevel(blueLuck2, 4) + 40 * Math.floor(effLevel(blueLuck2, 4) / 10),
            // 3
            blueberries * effLevel(blueLuck3, 5),
            // cubeluck
            totalCubes() * 0.02 * effLevel(blueCubeLuck, 3),
            // quarkluck
            0.02 * effLevel(blueQuarkLuck, 3) * 
            Math.floor(Math.pow(Math.log10(Number(data.worlds) + 1) + 1, 2)),
            // sing 131
            data.highestSingularityCount >= 131 ? 131 : 0,
            // sing 269
            data.highestSingularityCount >= 269 ? 269 : 0,
            // shop
            data.shopUpgrades.shopOcteractAmbrosiaLuck * (1 + Math.floor(Math.log10(data.totalWowOcteracts + 1))),
            // sing challenge
            data.singularityChallenges.noAmbrosiaUpgrades.completions * 15,
            RED_AMB_LUCK1,
            RED_AMB_LUCK2,
            RED_AMB_VISCOUNT,
            2 * cube77,
            R_calculateCookieUpgrade29Luck(),
            data.shopUpgrades.shopAmbrosiaUltra * R_sumOfExaltCompletions()
        ]

        const additivesTotal = additiveComponents.reduce((a, b) => a + b, 0);
        const rawTotal = rawLuckComponents.reduce((a, b) => a + b, 0);

        return {
            additive: additivesTotal,
            raw: rawTotal,
            total: additivesTotal * rawTotal
        }
    }

    async gameDataCallback(data: PlayerData) {
        if(!data) return;

        if(data.blueberryTime && data.redAmbrosiaTime) {
            const redBarRequirementMultiplier = 1 - (0.01 * data.singularityChallenges.limitedTime.completions);

            const blueAmbrosiaBarValue = data.blueberryTime;
            const redAmbrosiaBarValue = data.redAmbrosiaTime;
            const blueAmbrosiaBarMax = this.#R_calculateRequiredBlueberryTime(data.lifetimeAmbrosia);
            const redAmbrosiaBarMax = this.#R_calculateRequiredRedAmbrosiaTime(data.lifetimeRedAmbrosia, redBarRequirementMultiplier);
            const blueAmbrosiaPercent = ((blueAmbrosiaBarValue / blueAmbrosiaBarMax) * 100);
            const redAmbrosiaPercent = ((redAmbrosiaBarValue / redAmbrosiaBarMax) * 100);

            const blueberrySpeedMults = this.#calculateAmbrosiaSpeed(data);
            const blueberries = this.#calculateBlueBerries(data);
            const ambrosiaSpeed = blueberrySpeedMults * blueberries;
            const ambrosiaAcceleratorCount = data.shopUpgrades.shopAmbrosiaAccelerator;
            const ambrosiaLuck = this.#calculateLuck(data, blueberries);
            const ambrosiaGainPerGen = ambrosiaLuck.total / 100;
            const ambrosiaGainChance = (ambrosiaLuck.total - 100 * Math.floor(ambrosiaLuck.total / 100)) / 100;
            let accelerationSeconds = 0;
            let accelerationAmount = 0;
            let accelerationPercent = 0;
            const bluePercentageSpeed = (ambrosiaSpeed / blueAmbrosiaBarMax) * 100;
            const bluePercentageSafeThreshold = bluePercentageSpeed + 3;

            if(ambrosiaAcceleratorCount > 0) {
                accelerationSeconds = (0.2 * ambrosiaAcceleratorCount) * ambrosiaGainPerGen;
                accelerationAmount = accelerationSeconds * ambrosiaSpeed;
                accelerationPercent = (accelerationAmount / blueAmbrosiaBarMax) * 100;
            }

            if(this.#isIdleSwapEnabled) {
                if(this.#blueAmbrosiaProgressBar && this.#redAmbrosiaProgressBar) {
                    const idleSwapLoadoutNormalSetting = HSSettings.getSetting('ambrosiaIdleSwapNormalLoadout') as HSSelectStringSetting;
                    const idleSwapLoadout100Setting = HSSettings.getSetting('ambrosiaIdleSwap100Loadout') as HSSelectStringSetting;
  
                    if(idleSwapLoadoutNormalSetting && idleSwapLoadout100Setting) {
                        const normalLoadoutValue = idleSwapLoadoutNormalSetting.getValue();
                        const loadout100Value = idleSwapLoadout100Setting.getValue();

                        if(!Number.isInteger(parseInt(normalLoadoutValue, 10)) || !Number.isInteger(parseInt(loadout100Value, 10))) {
                            const idleSwapSetting = HSSettings.getSetting("ambrosiaIdleSwap") as HSSetting<boolean>;

                            if(idleSwapSetting) {
                                idleSwapSetting.disable();
                            }

                            HSLogger.log(`Idle swap was disabled due to unconfigured loadouts`, this.context);
                            return;
                        }

                        const normalLoadout = this.#convertSettingLoadoutToSlot(idleSwapLoadoutNormalSetting.getValue());
                        const loadout100 = this.#convertSettingLoadoutToSlot(idleSwapLoadout100Setting.getValue());
                        
                        let blueSwapTresholdNormalMin = bluePercentageSafeThreshold + accelerationPercent;
                        let blueSwapTresholdNormalMax = blueSwapTresholdNormalMin + bluePercentageSafeThreshold;

                        let blueSwapTreshold100Min = 100 - bluePercentageSafeThreshold;
                        let blueSwapTreshold100Max = 100;

                        let redSwapTresholdNormalMin = HSGlobal.HSAmbrosia.idleSwapMinRedTreshold;
                        let redSwapTresholdNormalMax = redSwapTresholdNormalMin + HSGlobal.HSAmbrosia.idleSwapMinRedTreshold;

                        let redSwapTreshold100Min = HSGlobal.HSAmbrosia.idleSwapMaxRedTreshold;
                        let redSwapTreshold100Max = 100;

                        if((blueAmbrosiaPercent >= blueSwapTreshold100Min && blueAmbrosiaPercent <= blueSwapTreshold100Max) || 
                            (redAmbrosiaPercent >= redSwapTreshold100Min && redAmbrosiaPercent <= redSwapTreshold100Max)) {
                            if(this.#currentLoadout !== loadout100) {
                                const loadoutSlot = await HSElementHooker.HookElement(`#${loadout100}`) as HTMLButtonElement;

                                await this.#maybeTurnLoadoutModeToLoad();

                                await HSUtils.hiddenAction(async () => {
                                    loadoutSlot.click();
                                });
                            }
                        } else if((blueAmbrosiaPercent >= blueSwapTresholdNormalMin && blueAmbrosiaPercent <= blueSwapTresholdNormalMax) ||
                            (redAmbrosiaPercent >= redSwapTresholdNormalMin && redAmbrosiaPercent <= redSwapTresholdNormalMax)) {
                            if(this.#currentLoadout !== normalLoadout) {
                                const loadoutSlot = await HSElementHooker.HookElement(`#${normalLoadout}`) as HTMLButtonElement;

                                await this.#maybeTurnLoadoutModeToLoad();

                                await HSUtils.hiddenAction(async () => {
                                    loadoutSlot.click();
                                });
                            }
                        }
                    }

                    const debugElement = document.querySelector('#hs-panel-debug-gamedata-currentambrosia') as HTMLDivElement;

                    if(debugElement) {
                        debugElement.innerHTML = `
                        BLUE - Value: ${blueAmbrosiaBarValue.toFixed(2)}, Max: ${blueAmbrosiaBarMax}, Percent: ${blueAmbrosiaPercent.toFixed(2)}<br>
                        RED - Value: ${redAmbrosiaBarValue.toFixed(2)}, Max: ${redAmbrosiaBarMax}, Percent: ${redAmbrosiaPercent.toFixed(2)}<br>
                        BLUE SPD MLT: ${blueberrySpeedMults.toFixed(2)}<br>
                        BLUE SPD %: ${bluePercentageSpeed.toFixed(2)}<br>
                        BERRY: ${blueberries}</br>
                        TOT BLU: ${(blueberrySpeedMults * blueberries).toFixed(2)}</br>
                        ------------------------</br>
                        ADD LUK: ${ambrosiaLuck.additive.toFixed(2)}</br>
                        RAW LUK: ${ambrosiaLuck.raw.toFixed(2)}</br>
                        TOT LUK: ${ambrosiaLuck.total.toFixed(2)}</br>
                        ------------------------</br>
                        ACCEL AMOUNT: ${accelerationAmount.toFixed(2)}</br>
                        ACCEL %: ${accelerationPercent.toFixed(2)}</br>
                        `;
                    }
                    //console.log(`BLUE - Value: ${blueAmbrosiaBarValue}, Max: ${blueAmbrosiaBarMax}, Percent: ${blueAmbrosiaPercent}`);
                    //console.log(`RED - Value: ${redAmbrosiaBarValue}, Max: ${redAmbrosiaBarMax}, Percent: ${redAmbrosiaPercent}`);
                }
            }
        }
    };

    // https://github.com/Pseudo-Corp/SynergismOfficial/blob/0ffbd184938677cf8137a404cffb2f4b5b5d3ab9/src/Calculate.ts
    #R_calculateNumberOfThresholds = (lifetimeAmbrosia: number) => {
        const numDigits = lifetimeAmbrosia > 0 ? 1 + Math.floor(Math.log10(lifetimeAmbrosia)) : 0
        const matissa = Math.floor(lifetimeAmbrosia / Math.pow(10, numDigits - 1))

        const extraReduction = matissa >= 3 ? 1 : 0

        // First reduction at 10^(digitReduction+1), add 1 at 3 * 10^(digitReduction+1)
        return Math.max(0, 2 * (numDigits - HSGlobal.HSAmbrosia.R_digitReduction) - 1 + extraReduction)
    }

    // https://github.com/Pseudo-Corp/SynergismOfficial/blob/0ffbd184938677cf8137a404cffb2f4b5b5d3ab9/src/Calculate.ts
    #R_calculateToNextThreshold = (lifetimeAmbrosia: number) => {
        const numThresholds = this.#R_calculateNumberOfThresholds(lifetimeAmbrosia);

        if (numThresholds === 0) {
            return 10000 - lifetimeAmbrosia
        } else {
            // This is when the previous threshold is of the form 3 * 10^n
            if (numThresholds % 2 === 0) {
                return Math.pow(10, numThresholds / 2 + HSGlobal.HSAmbrosia.R_digitReduction) - lifetimeAmbrosia
            } // Previous threshold is of the form 10^n
            else {
                return 3 * Math.pow(10, (numThresholds - 1) / 2 + HSGlobal.HSAmbrosia.R_digitReduction) - lifetimeAmbrosia
            }
        }
    }

    // https://github.com/Pseudo-Corp/SynergismOfficial/blob/0ffbd184938677cf8137a404cffb2f4b5b5d3ab9/src/Calculate.ts
    #R_calculateRequiredBlueberryTime = (lifetimeAmbrosia: number) => {
        let val = HSGlobal.HSAmbrosia.R_TIME_PER_AMBROSIA // Currently 30
        val += Math.floor(lifetimeAmbrosia / 500)

        const thresholds = this.#R_calculateNumberOfThresholds(lifetimeAmbrosia)
        const thresholdBase = 2
        return Math.pow(thresholdBase, thresholds) * val
    }

    // https://github.com/Pseudo-Corp/SynergismOfficial/blob/0ffbd184938677cf8137a404cffb2f4b5b5d3ab9/src/Calculate.ts
    #R_calculateRequiredRedAmbrosiaTime = (lifetimeRedAmbrosia: number, barRequirementMultiplier: number) => {
        let val = HSGlobal.HSAmbrosia.R_TIME_PER_RED_AMBROSIA // Currently 100,000
        val += 200 * lifetimeRedAmbrosia

        const max = 1e6 * + barRequirementMultiplier;
        val *= + barRequirementMultiplier;

        return Math.min(max, val)
    }

    async enableIdleSwap() {
        const self = this;
        const gameStateMod = HSModuleManager.getModule<HSGameState>('HSGameState');

        if(gameStateMod) {
            this.#gameStateMainViewSubscriptionId = gameStateMod.subscribeGameStateChange('MAIN_VIEW', this.#gameStateCallbackMain.bind(this));

            this.#gameStateSubViewSubscriptionId = gameStateMod.subscribeGameStateChange('SINGULARITY_VIEW', async (previousView: GameView<VIEW_TYPE>, currentView: GameView<VIEW_TYPE>) => {
                if(currentView.getId() === SINGULARITY_VIEW.AMBROSIA) {
                    this.#blueAmbrosiaProgressBar = await HSElementHooker.HookElement('#ambrosiaProgressBar') as HTMLDivElement;
                    this.#redAmbrosiaProgressBar = await HSElementHooker.HookElement('#pixelProgressBar') as HTMLDivElement;
                    this.#isIdleSwapEnabled = true;
                    this.#maybeInsertIdleLoadoutIndicator();
                } else {
                    this.#isIdleSwapEnabled = false;
                    this.#removeIdleLoadoutIndicator();
                }
            });

            // If we're already in the ambrosia view
            if(gameStateMod.getCurrentUIView("SINGULARITY_VIEW").getId() === SINGULARITY_VIEW.AMBROSIA &&
                gameStateMod.getCurrentUIView("MAIN_VIEW").getId() === MAIN_VIEW.SINGULARITY) {
                    this.#blueAmbrosiaProgressBar = await HSElementHooker.HookElement('#ambrosiaProgressBar') as HTMLDivElement;
                    this.#redAmbrosiaProgressBar = await HSElementHooker.HookElement('#pixelProgressBar') as HTMLDivElement;
                    this.#isIdleSwapEnabled = true;
                    this.#maybeInsertIdleLoadoutIndicator();
            }
        } else {
            HSLogger.warn(`Could not find game state module`, this.context);
        }

        this.subscribeGameDataChanges();
    }

    disableIdleSwap() {
        this.unsubscribeGameDataChanges();

        const gameStateMod = HSModuleManager.getModule<HSGameState>('HSGameState');
        
        if(gameStateMod) {
            if(this.#gameStateMainViewSubscriptionId) {
                gameStateMod.unsubscribeGameStateChange('MAIN_VIEW', this.#gameStateMainViewSubscriptionId);
                this.#gameStateMainViewSubscriptionId = undefined;
            }

            if(this.#gameStateSubViewSubscriptionId) {
                gameStateMod.unsubscribeGameStateChange('SINGULARITY_VIEW', this.#gameStateSubViewSubscriptionId);
                this.#gameStateSubViewSubscriptionId = undefined;
            }
        }

        this.#removeIdleLoadoutIndicator();
        this.#isIdleSwapEnabled = false;
    }

    #gameStateCallbackMain(previousView: GameView<VIEW_TYPE>, currentView: GameView<VIEW_TYPE>) {
        const gameStateMod = HSModuleManager.getModule<HSGameState>('HSGameState');
        
        if(gameStateMod) {
            if(previousView.getId() === MAIN_VIEW.SINGULARITY && 
                currentView.getId() !== MAIN_VIEW.SINGULARITY && 
                gameStateMod.getCurrentUIView("SINGULARITY_VIEW").getId() === SINGULARITY_VIEW.AMBROSIA
            ) {
                this.#isIdleSwapEnabled = false;
            }
        }
    }

    #maybeInsertIdleLoadoutIndicator() {
        const indicatorExists = document.querySelector(`#${HSGlobal.HSAmbrosia.idleSwapIndicatorId}`) as HTMLElement;

        if(indicatorExists)
            return;

        const loadoutIndicator = document.createElement('div') as HTMLDivElement;
        loadoutIndicator.id = HSGlobal.HSAmbrosia.idleSwapIndicatorId;
        loadoutIndicator.innerText = "IDLE SWAP ENABLED WHILE IN THIS VIEW";

        HSUI.injectHTMLElement(loadoutIndicator, (element) => {
            const parent = document.querySelector('#singularityAmbrosia') as HTMLElement;
            const child = document.querySelector('#ambrosiaProgressBar') as HTMLElement;

            parent?.insertBefore(element, child as Node);
        });

        HSUI.injectStyle(this.#idleLoadoutCSS, this.#idleLoadoutCSSId);
    }

    #removeIdleLoadoutIndicator() {
        const loadoutIndicator = document.querySelector(`#${HSGlobal.HSAmbrosia.idleSwapIndicatorId}`) as HTMLElement;

        if(loadoutIndicator) {
            loadoutIndicator.remove();
        }

        HSUI.removeInjectedStyle(this.#idleLoadoutCSSId);
    }
}