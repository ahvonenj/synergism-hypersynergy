/**
 * What HSAmbrosia gives the parts it creates: the Ambrosia tab's loadout slots, the slot shown as loaded, and loading
 * one. Built by HSAmbrosia over its own state, so none of it is a public method of the module.
 */
export interface HSAmbrosiaSlots {
    /** The Ambrosia tab's 16 slot buttons, in order (none before HSAmbrosia's init). */
    all(): readonly HTMLElement[];
    /** The Ambrosia tab's loadout bar (#bbLoadoutContainer): its 16 slots, then the mode and quick save buttons. */
    container(): HTMLElement | null;
    /** A slot of the Ambrosia tab, by its id (blueberryLoadoutN). */
    byId(slotId: string | undefined): HTMLButtonElement | undefined;
    /** The slot the game marks as active (last successfully loaded or saved), if any. */
    gameActive(): HTMLButtonElement | undefined;
    /** The slot the mod remembers as loaded (HSAmbrosia.activeLoadout), locked or not. */
    remembered(): HTMLButtonElement | undefined;
    /**
     * The slot shown as loaded (rainbow or silver border): the one the game marks, else the remembered one.
     * Undefined when none is shown, or it's locked.
     */
    shown(): HTMLButtonElement | undefined;
    /** Shows this slot as the loaded one, without loading it. */
    markLoaded(slot: HTMLButtonElement): void;
    /** Loads a slot. Its success Alert is dismissed. */
    load(slot: HTMLButtonElement, owner: string): void;
    /** The live tree changed without a slot click: the upgrade levels kept on the tree are drawn again. */
    treeChanged(): void;
}

/**
 * HSAmbrosia's one GDS subscription. A part that needs save data subscribes; it stays subscribed until no part
 * needs save data anymore.
 */
export interface HSAmbrosiaGameDataLink {
    subscribe(): void;
    unsubscribe(): void;
}
