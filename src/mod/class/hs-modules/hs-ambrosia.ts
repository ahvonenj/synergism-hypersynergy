import { PlayerData } from "../../types/data-types/hs-player-savedata";
import { HSGameDataSubscriber, HSModuleOptions, HSPersistable } from "../../types/hs-types";
import { AMBROSIA_ICON, AMBROSIA_LOADOUT_SLOT, HSAmbrosiaLoadoutState } from "../../types/module-types/hs-ambrosia-types";
import { MAIN_VIEW, SINGULARITY_VIEW, VIEW_TYPE } from "../../types/module-types/hs-gamestate-types";
import { HSElementHooker } from "../hs-core/hs-elementhooker";
import { HSGameData } from "../hs-core/gds/hs-gamedata";
import { GameView, HSGameState } from "../hs-core/hs-gamestate";
import { HSGlobal } from "../hs-core/hs-global";
import { HSLogger } from "../hs-core/hs-logger";
import { HSModule } from "../hs-core/module/hs-module";
import { HSModuleManager } from "../hs-core/module/hs-module-manager";
import { HSSelectStringSetting, HSSetting } from "../hs-core/settings/hs-setting";
import { HSSettings } from "../hs-core/settings/hs-settings";
import { HSStorage } from "../hs-core/hs-storage";
import { HSUI } from "../hs-core/hs-ui";
import { HSUtils } from "../hs-utils/hs-utils";
import { HSGameDataAPI } from "../hs-core/gds/hs-gamedata-api";
import minibarCSS from "inline:../../resource/css/module/hs-ambrosia.css";

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
            animation: hs-loadout-ind-glow 3.5s ease-in-out infinite alternate;
        }

        @keyframes hs-loadout-ind-glow {
            0% {
                background-position: 0% 50%;
            }

            100% {
                background-position: 100% 50%;
            }
        }

        @-webkit-keyframes hs-loadout-ind-glow {
            0% {
                background-position: 0% 50%;
            }

            100% {
                background-position: 100% 50%;
            }
        }
    `;

    #idleLoadoutCSSId = 'hs-ambrosia-idle-loadout-css';
    #minibarCSSId = 'hs-ambrosia-minibar-css';

    #isIdleSwapEnabled = false;
    #blueAmbrosiaProgressBar?: HTMLDivElement;
    #redAmbrosiaProgressBar?: HTMLDivElement;

    #debugElement?: HTMLDivElement;

    #berryMinibarsEnabled = false;
    #blueProgressMinibarElement?: HTMLDivElement;
    #redProgressMinibarElement?: HTMLDivElement;

    constructor(moduleOptions : HSModuleOptions) {
        super(moduleOptions);
    }

    async init() {
        const self = this;

        HSLogger.log(`Initializing HSAmbrosia module`, this.context);

        this.#ambrosiaGrid = await HSElementHooker.HookElement('#blueberryUpgradeContainer');
        this.#loadOutsSlots = await HSElementHooker.HookElements('.blueberryLoadoutSlot');
        this.#loadOutContainer = await HSElementHooker.HookElement('#bbLoadoutContainer');

        this.#debugElement = document.querySelector('#hs-panel-debug-gamedata-currentambrosia') as HTMLDivElement;

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

        const originalQuickBar = document.querySelector('#bbLoadoutContainer');

        if(originalQuickBar) {
            originalQuickBar.querySelectorAll('.blueberryLoadoutSlot').forEach((slot) => {
                slot.classList.remove('hs-ambrosia-active-slot');
            });

            const activeSlot = originalQuickBar.querySelector(`#${slotEnum}`) as HTMLElement;

            if(activeSlot) {
                activeSlot.classList.add('hs-ambrosia-active-slot');
            }
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

        const originalQuickBar = document.querySelector('#bbLoadoutContainer');

        if(originalQuickBar) {
            originalQuickBar.querySelectorAll('.blueberryLoadoutSlot').forEach((slot) => {
                slot.classList.remove('hs-ambrosia-active-slot');
            });
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

        if(gameDataMod && !this.gameDataSubscriptionId) {
            this.gameDataSubscriptionId = gameDataMod.subscribeGameDataChange(this.gameDataCallback.bind(this));
            HSLogger.debug('Subscribed to game data changes', this.context);
        }
    }

    unsubscribeGameDataChanges() {
        const gameDataMod = HSModuleManager.getModule<HSGameData>('HSGameData');

        if(gameDataMod && this.gameDataSubscriptionId) {
            // Only actually unsubscribe if all ambrosia feature which use GDS are disabled
            if(!this.#isIdleSwapEnabled && !this.#berryMinibarsEnabled) {
                gameDataMod.unsubscribeGameDataChange(this.gameDataSubscriptionId);
                this.gameDataSubscriptionId = undefined;
                HSLogger.debug('Unsubscribed from game data changes', this.context);
            }
        }
    }

    async gameDataCallback() {
        const gameDataAPI = HSModuleManager.getModule<HSGameDataAPI>('HSGameDataAPI');

        if(!gameDataAPI) return;

        const gameData = gameDataAPI.getGameData();

        if(!gameData) return;

        if(gameData.blueberryTime && gameData.redAmbrosiaTime) {

            const blueAmbrosiaBarValue = gameData.blueberryTime;
            const redAmbrosiaBarValue = gameData.redAmbrosiaTime;
            const blueAmbrosiaBarMax = gameDataAPI.R_calculateRequiredBlueberryTime();
            const redAmbrosiaBarMax = gameDataAPI.R_calculateRequiredRedAmbrosiaTime();
            const blueAmbrosiaPercent = ((blueAmbrosiaBarValue / blueAmbrosiaBarMax) * 100);
            const redAmbrosiaPercent = ((redAmbrosiaBarValue / redAmbrosiaBarMax) * 100);

            const blueberrySpeedMults = (gameDataAPI.calculateAmbrosiaSpeed() as number);
            const blueberries = (gameDataAPI.calculateBlueBerries() as number);
            const ambrosiaSpeed = blueberrySpeedMults * blueberries;
            const ambrosiaAcceleratorCount = gameData.shopUpgrades.shopAmbrosiaAccelerator;
            const ambrosiaLuck = gameDataAPI.calculateLuck() as { additive: number; raw: number; total: number; };
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

                    if(this.#debugElement && HSUI.isModPanelOpen()) {
                        const newDebugElement = document.createElement('div');

                        newDebugElement.innerHTML = `
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

                        this.#debugElement.innerHTML = '';
                        while (newDebugElement.firstChild) {
                            this.#debugElement.appendChild(newDebugElement.firstChild);
                        }
                    }
                    //console.log(`BLUE - Value: ${blueAmbrosiaBarValue}, Max: ${blueAmbrosiaBarMax}, Percent: ${blueAmbrosiaPercent}`);
                    //console.log(`RED - Value: ${redAmbrosiaBarValue}, Max: ${redAmbrosiaBarMax}, Percent: ${redAmbrosiaPercent}`);
                }
            }

            if(this.#berryMinibarsEnabled) {
                if(this.#blueProgressMinibarElement && this.#redProgressMinibarElement) {
                    this.#blueProgressMinibarElement.style.width = `${blueAmbrosiaPercent}%`;
                    this.#redProgressMinibarElement.style.width = `${redAmbrosiaPercent}%`;
                } else {
                    HSLogger.warnOnce(`
                        HSAmbrosia.gameDataCallback() - minibar element(s) undefined. 
                        blue: ${this.#blueProgressMinibarElement}, 
                        red: ${this.#redProgressMinibarElement}`, 'hs-minibars-undefined');
                }
            } else {
                HSLogger.logOnce('HSAmbrosia.gameDataCallback() - berryMinibarsEnabled was false', 'hs-minibars-false');
            }
        }
    };

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
                    this.subscribeGameDataChanges();
                    
                } else {
                    this.#isIdleSwapEnabled = false;
                    this.#removeIdleLoadoutIndicator();
                    this.unsubscribeGameDataChanges();
                }
            });

            // If we're already in the ambrosia view
            if(gameStateMod.getCurrentUIView("SINGULARITY_VIEW").getId() === SINGULARITY_VIEW.AMBROSIA &&
                gameStateMod.getCurrentUIView("MAIN_VIEW").getId() === MAIN_VIEW.SINGULARITY) {
                    this.#blueAmbrosiaProgressBar = await HSElementHooker.HookElement('#ambrosiaProgressBar') as HTMLDivElement;
                    this.#redAmbrosiaProgressBar = await HSElementHooker.HookElement('#pixelProgressBar') as HTMLDivElement;
                    this.#isIdleSwapEnabled = true;
                    this.#maybeInsertIdleLoadoutIndicator();
                    this.subscribeGameDataChanges();
            }
        } else {
            HSLogger.warn('HSAmbrosia.enableIdleSwap() - gameStateMod==undefined', 'hs-enable-idleswap-gamestate');
        }

        if(!this.#debugElement)
            this.#debugElement = document.querySelector('#hs-panel-debug-gamedata-currentambrosia') as HTMLDivElement;
    }

    disableIdleSwap() {
        this.#isIdleSwapEnabled = false;
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
        } else {
            HSLogger.warnOnce('HSAmbrosia.disableIdleSwap() - gameStateMod==undefined', 'hs-disable-idleswap-gamestate');
        }

        this.#removeIdleLoadoutIndicator();
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
        } else {
            HSLogger.warnOnce('HSAmbrosia.gameStateCallbackMain() - gameStateMod==undefined', 'hs-amb-gamestate-cb');
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

    async enableBerryMinibars() {
        if(!this.#pageHeader)
            this.#pageHeader = await HSElementHooker.HookElement('header');

        if(!this.#pageHeader) return;

        // Blue bar
        const blueBarOriginal = await HSElementHooker.HookElement('#ambrosiaProgressBar');
        const blueBarClone = blueBarOriginal.cloneNode(true) as HTMLDivElement;
        const blueBarProgress = blueBarClone.querySelector('#ambrosiaProgress') as HTMLDivElement;
        const blueBarProgressText = blueBarClone.querySelector('#ambrosiaProgressText') as HTMLDivElement;

        blueBarClone.id = HSGlobal.HSAmbrosia.blueBarId;
        blueBarProgress.id = HSGlobal.HSAmbrosia.blueBarProgressId;
        blueBarProgressText.id = HSGlobal.HSAmbrosia.blueBarProgressTextId;

        // Red bar
        const redBarOriginal = await HSElementHooker.HookElement('#pixelProgressBar');
        const redBarClone = redBarOriginal.cloneNode(true) as HTMLDivElement;
        const redBarProgress = redBarClone.querySelector('#pixelProgress') as HTMLDivElement;
        const redBarProgressText = redBarClone.querySelector('#pixelProgressText') as HTMLDivElement;
        
        redBarClone.id = HSGlobal.HSAmbrosia.redBarId;  
        redBarProgress.id = HSGlobal.HSAmbrosia.redBarProgressId;
        redBarProgressText.id = HSGlobal.HSAmbrosia.redBarProgressTextId;

        // Wrapper for both
        const barWrapper = document.createElement('div') as HTMLDivElement;
        barWrapper.id = HSGlobal.HSAmbrosia.barWrapperId;
        barWrapper.appendChild(blueBarClone);
        barWrapper.appendChild(redBarClone);

        // Check if quick bar is enabled
        const quickBarSetting = HSSettings.getSetting('ambrosiaQuickBar') as HSSetting<boolean>;

        let referenceElement: HTMLElement;

        if(quickBarSetting && quickBarSetting.isEnabled()) {
            referenceElement = this.#pageHeader.querySelector('#hs-ambrosia-quick-loadout-container') as HTMLDivElement;
        } else {
            referenceElement = this.#pageHeader.querySelector('nav.navbar') as HTMLElement;
        }

        // Insert bars
        this.#pageHeader.insertBefore(barWrapper, referenceElement);
        HSUI.injectStyle(minibarCSS, this.#minibarCSSId);

        this.#blueProgressMinibarElement = blueBarProgress;
        this.#redProgressMinibarElement = redBarProgress;

        this.subscribeGameDataChanges();
        this.#berryMinibarsEnabled = true;
    }

    async disableBerryMinibars() {
        if(!this.#pageHeader)
            this.#pageHeader = await HSElementHooker.HookElement('header');

        const barWrapper = this.#pageHeader.querySelector(`#${HSGlobal.HSAmbrosia.barWrapperId}`) as HTMLElement;

        if(barWrapper) {
            barWrapper.remove();
        } else {
            HSLogger.warn(`Could not find bar wrapper element`, this.context);
        }

        HSUI.removeInjectedStyle(this.#minibarCSSId);

        this.#berryMinibarsEnabled = false;
        this.unsubscribeGameDataChanges();
    }
}