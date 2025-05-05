import { HSPersistable } from "../../types/hs-types";
import { AMBROSIA_ICON, AMBROSIA_LOADOUT_SLOT, HSAmbrosiaLoadoutIcon, HSAmbrosiaLoadoutState } from "../../types/module-types/hs-ambrosia-types";
import { HSElementHooker } from "../hs-core/hs-elementhooker";
import { HSGlobal } from "../hs-core/hs-global";
import { HSLogger } from "../hs-core/hs-logger";
import { HSModule } from "../hs-core/hs-module";
import { HSModuleManager } from "../hs-core/hs-module-manager";
import { HSSetting } from "../hs-core/hs-setting";
import { HSSettings } from "../hs-core/hs-settings";
import { HSShadowDOM } from "../hs-core/hs-shadowdom";
import { HSStorage } from "../hs-core/hs-storage";
import { HSUI } from "../hs-core/hs-ui";
import { HSUtils } from "../hs-utils/hs-utils";

export class HSAmbrosia extends HSModule implements HSPersistable {

    #ambrosiaGrid: HTMLElement | null = null;
    #loadOutsSlots: HTMLElement[] = [];

    #loadOutContainer: HTMLElement | null = null;
    #pageHeader: HTMLElement | null = null;
    
    #loadoutState: HSAmbrosiaLoadoutState = new Map<AMBROSIA_LOADOUT_SLOT, AMBROSIA_ICON>();

    #currentLoadout?: AMBROSIA_LOADOUT_SLOT;

    #_delegateAddHandler?: (e: Event) => void;
    #_delegateTimeHandler?: (e: Event) => void;

    #quickbarCSS = `
        #${HSGlobal.HSAmbrosia.quickBarId} > .blueberryLoadoutSlot:hover {
            border: 2px solid #ff44ae;
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
    `

    #quickbarCSSId = 'hs-ambrosia-quickbar-css';

    constructor(moduleName: string, context: string, moduleColor?: string) {
        super(moduleName, context, moduleColor);
    }

    async init() {
        const self = this;

        HSLogger.log(`Initializing HSAmbrosia module`, this.context);

        this.#ambrosiaGrid = await HSElementHooker.HookElement('#blueberryUpgradeContainer');
        this.#loadOutsSlots = await HSElementHooker.HookElements('.blueberryLoadoutSlot');

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

            // Bind events
            slot.addEventListener("dragenter", (e) => {
                if(e.dataTransfer) {
                    if(e.dataTransfer.types.includes('hs-amb-drag')) {
                        e.preventDefault();
                        e.stopPropagation();
                        e.dataTransfer.effectAllowed = "move";
                    }
                }
            });

            slot.addEventListener("dragover", (e) => {
                if(e.dataTransfer) {
                    if(e.dataTransfer.types.includes('hs-amb-drag')) {
                        e.preventDefault();
                        e.stopPropagation();
                        e.dataTransfer.effectAllowed = "move";
                    }
                }
            });

            slot.addEventListener("drop", async (e) => {
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

            slot.addEventListener('contextmenu', async (e) => {
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

            slot.addEventListener('click', async (e) => {
                const slotElement = e.target as HTMLButtonElement;
                const slotElementId = slotElement.id;
                const slotEnum = this.#getSlotEnumBySlotId(slotElementId);

                if (!slotEnum) {
                    HSLogger.warn(`Invalid slot ID: ${slotElementId}`, this.context);
                    return;
                }

                await self.#updateCurrentLoadout(slotEnum);
            });
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

                // Make the quickbar buttons simulate a click on the real buttons
                button.addEventListener('click', async (e) => {
                    const realButton = document.querySelector(`#${buttonId}`) as HTMLButtonElement;

                    if(realButton) {
                        await this.#maybeTurnLoadoutModeToLoad();
                        realButton.click();
                    } else {
                        HSLogger.warn(`Could not find real button for ${buttonId}`, this.context);
                    }
                });
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
        const addLoadoutSetting = HSSettings.getSetting('autoLoadoutAdd') as HSSetting<string>;

        if(currentLoadout && addLoadoutSetting) {
            const addLoadout = addLoadoutSetting.getValue();
            const loadoutSlot = await HSElementHooker.HookElement(`#blueberryLoadout${addLoadout}`) as HTMLButtonElement;

            await this.#maybeTurnLoadoutModeToLoad();

            await HSUtils.hiddenAction(async () => {
                loadoutSlot.click();
            });
        }
    }

    async #timeCodeButtonHandler(e: Event) {
        const currentLoadout = this.#currentLoadout;
        const timeLoadoutSetting = HSSettings.getSetting('autoLoadoutTime') as HSSetting<string>;

        if(currentLoadout && timeLoadoutSetting) {
            const timeLoadout = timeLoadoutSetting.getValue();
            const loadoutSlot = await HSElementHooker.HookElement(`#blueberryLoadout${timeLoadout}`) as HTMLButtonElement;

            await this.#maybeTurnLoadoutModeToLoad();

            await HSUtils.hiddenAction(async () => {
                loadoutSlot.click();
            });
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
}