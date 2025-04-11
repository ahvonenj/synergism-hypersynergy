import { HSPersistable } from "../../types/hs-types";
import { AMBROSIA_ICON, AMBROSIA_LOADOUT_SLOT, HSAmbrosiaLoadoutIcon, HSAmbrosiaLoadoutState } from "../../types/module-types/hs-ambrosia-types";
import { HSElementHooker } from "../hs-core/hs-elementhooker";
import { HSGlobal } from "../hs-core/hs-global";
import { HSLogger } from "../hs-core/hs-logger";
import { HSModule } from "../hs-core/hs-module";
import { HSModuleManager } from "../hs-core/hs-module-manager";
import { HSStorage } from "../hs-core/hs-storage";

export class HSAmbrosia extends HSModule implements HSPersistable {

    #ambrosiaGrid: HTMLElement | null = null;
    #loadOutsSlots: HTMLElement[] = [];
    
    #loadoutState: HSAmbrosiaLoadoutState = new Map<AMBROSIA_LOADOUT_SLOT, AMBROSIA_ICON>();

    constructor(moduleName: string, context: string, moduleColor?: string) {
        super(moduleName, context, moduleColor);
    }

    async init() {
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

            slot.addEventListener("drop", (e) => {
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
                }
            });

            slot.addEventListener('contextmenu', (e) => {
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
            });
        });

        this.isInitialized = true;
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
    }
}