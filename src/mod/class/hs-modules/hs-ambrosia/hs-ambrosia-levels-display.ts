import type { GameData } from "../../../types/data-types/hs-player-savedata";
import { HSElementHooker } from "../../hs-core/hs-elementhooker";
import { HSLogger } from "../../hs-core/hs-logger";
import { HSSettings } from "../../hs-core/settings/hs-settings";
import type { HSAmbrosiaSlots } from "./hs-ambrosia-parts";

/**
 * Class: HSAmbrosiaLevelsDisplay
 * IsExplicitHSModule: No
 * Description:
 *     Created by HSAmbrosia. Keeps the upgrade levels shown on the Ambrosia tab's tree (the game only shows them while
 *     its 🔎 button is hovered): the "Keep tree levels shown" setting, also switched by that button
 *     (📌 when on). The game's own hover display is used: hidden while the tree or a slot is hovered, drawn again
 *     after a tree change.
 * Author: Swiffy, Shewchou
 */
export class HSAmbrosiaLevelsDisplay {
    #context: string;
    #slots: HSAmbrosiaSlots;
    #isTabActive: () => boolean;

    #blueberryUpgradeContainer: HTMLElement | null = null;
    #persistentAmbrosiaLevelsToggleButton: HTMLButtonElement | null = null;
    #persistentAmbrosiaLevelsToggleHandler?: (event: Event) => void;
    #persistentAmbrosiaLevelsSignature?: string;

    constructor(context: string, slots: HSAmbrosiaSlots, isTabActive: () => boolean) {
        this.#context = context;
        this.#slots = slots;
        this.#isTabActive = isTabActive;
    }

    async init(): Promise<void> {
        this.#blueberryUpgradeContainer = await HSElementHooker.HookElement('#blueberryUpgradeContainer');
    }

    /** The "Keep tree levels shown" setting, the only record of the 📌/🔎 state. */
    get #persistentAmbrosiaLevelsEnabled(): boolean {
        return HSSettings.getSetting('persistentAmbrosiaLevels')?.isEnabled() ?? true;
    }

    /** The Ambrosia tab was opened: hooks the 📌/🔎 button, and shows the levels when the setting is on. */
    async onTabEnter(): Promise<void> {
        await this.#hookPersistentAmbrosiaLevelsToggleButton();
    }

    /** The Ambrosia tab was left: the game's display is put back as it is without the mod. */
    onTabLeave(): void {
        if (this.#persistentAmbrosiaLevelsToggleButton && this.#persistentAmbrosiaLevelsToggleHandler) {
            this.#persistentAmbrosiaLevelsToggleButton.removeEventListener('click', this.#persistentAmbrosiaLevelsToggleHandler);
        }

        this.#detachPersistentAmbrosiaLevelsDisplayListeners();

        if (this.#persistentAmbrosiaLevelsEnabled) {
            this.#restorePersistentAmbrosiaLevelsDisplay();
        }
    }

    async #hookPersistentAmbrosiaLevelsToggleButton() {
        const button = this.#persistentAmbrosiaLevelsToggleButton ?? await HSElementHooker.HookElement<HTMLButtonElement>('#showCurrAmbrosiaUpgrades');
        if (!button) { HSLogger.warn('hookPersistentAmbrosiaLevelsToggleButton() could not find #showCurrAmbrosiaUpgrades', this.#context); return; }
        this.#persistentAmbrosiaLevelsToggleButton = button;

        button.title = 'Toggle persistent Amb Levels Display';
        button.setAttribute('aria-label', 'Toggle persistent Amb Levels Display');

        this.#persistentAmbrosiaLevelsToggleHandler ??= (event: Event) => {
            event.preventDefault();
            event.stopPropagation();
            HSLogger.debug(() => 'persistentAmbrosiaLevelsToggle clicked', this.#context);
            // The setting saves, updates its panel switch and runs its action (applyPersistentAmbrosiaLevelsSetting)
            const setting = HSSettings.getSetting('persistentAmbrosiaLevels');
            if (this.#persistentAmbrosiaLevelsEnabled) {
                setting.disable();
            } else {
                setting.enable();
            }
        };

        button.addEventListener('click', this.#persistentAmbrosiaLevelsToggleHandler);

        if (this.#persistentAmbrosiaLevelsEnabled) {
            this.#enablePersistentAmbrosiaLevelsDisplay();
        }
    }

    /** Action of the persistentAmbrosiaLevels setting (panel switch or 📌/🔎 click). */
    applySetting(enabled: boolean) {
        // Button not hooked yet (Ambrosia tab not opened since the load): the hook applies the setting
        if (!this.#persistentAmbrosiaLevelsToggleButton) return;

        if (enabled) {
            this.#enablePersistentAmbrosiaLevelsDisplay();
        } else {
            this.#disablePersistentAmbrosiaLevelsDisplay();
        }
    }

    #enablePersistentAmbrosiaLevelsDisplay() {
        if (!this.#persistentAmbrosiaLevelsToggleButton) { HSLogger.warn('enablePersistentAmbrosiaLevelsDisplay() missing button reference', this.#context); return; }

        this.#persistentAmbrosiaLevelsToggleButton.classList.add('hs-ambrosia-current-levels-active');
        this.#persistentAmbrosiaLevelsToggleButton.textContent = '📌';

        if (this.#isTabActive()) {
            this.#attachPersistentAmbrosiaLevelsDisplayListeners();
            this.#displayPersistentAmbrosiaLevels();
            // Fresh render: the next GDS update only records the tree as reference
            this.#persistentAmbrosiaLevelsSignature = undefined;
        }
    }

    #disablePersistentAmbrosiaLevelsDisplay() {
        if (!this.#persistentAmbrosiaLevelsToggleButton) { HSLogger.warn('disablePersistentAmbrosiaLevelsDisplay() missing button reference', this.#context); return; }
        this.#persistentAmbrosiaLevelsToggleButton.textContent = '🔎';
        this.#persistentAmbrosiaLevelsToggleButton.classList.remove('hs-ambrosia-current-levels-active');

        this.#detachPersistentAmbrosiaLevelsDisplayListeners();

        if (!this.#blueberryUpgradeContainer?.matches(':hover')) {
            this.#restorePersistentAmbrosiaLevelsDisplay();
        }
    }

    #shouldRestorePersistentAmbrosiaLevelsDisplay() {
        if (!this.#persistentAmbrosiaLevelsEnabled) return false;
        if (this.#blueberryUpgradeContainer?.matches(':hover')) return false;
        if (this.#slots.all().some((loadoutSlot) => loadoutSlot.matches(':hover'))) return false;
        return true;
    }

    #maybeRestorePersistentAmbrosiaLevelsDisplay() {
        if (!this.#shouldRestorePersistentAmbrosiaLevelsDisplay()) return;
        this.#displayPersistentAmbrosiaLevels();
    }

    #persistentAmbrosiaLevelsContainerEnterHandler = (event: Event) => {
        if (!this.#persistentAmbrosiaLevelsEnabled) return;
        if (!this.#blueberryUpgradeContainer) return;
        if (!event.isTrusted) return;

        this.#hidePersistentAmbrosiaLevelsDisplay();
    };

    #persistentAmbrosiaLevelsContainerLeaveHandler = (event: Event) => {
        if (!this.#persistentAmbrosiaLevelsEnabled) return;
        if (!this.#blueberryUpgradeContainer) return;
        if (!event.isTrusted) return;

        setTimeout(() => {
            this.#maybeRestorePersistentAmbrosiaLevelsDisplay();
        }, 0);
    };

    #persistentAmbrosiaLevelsSlotMouseOutHandler = (event: MouseEvent) => {
        if (!this.#persistentAmbrosiaLevelsEnabled) return;
        if (!(event.target instanceof HTMLElement)) return;

        const slot = event.target.closest('.blueberryLoadoutSlot');
        if (!slot) return;

        const relatedTarget = event.relatedTarget;
        if (relatedTarget instanceof Node && slot.contains(relatedTarget)) { return; }

        setTimeout(() => {
            this.#maybeRestorePersistentAmbrosiaLevelsDisplay();
        }, 0);
    };

    #displayPersistentAmbrosiaLevels() {
        const button = this.#persistentAmbrosiaLevelsToggleButton;
        if (!button) { HSLogger.warn('displayPersistentAmbrosiaLevels() missing persistent levels button', this.#context); return; }

        // The game's level display only adds classes (dimmed, superDimmed, maxBlueberryLevel)
        // and never removes them, so reset it first (its mouseout handler) to avoid stale styles.
        this.#hidePersistentAmbrosiaLevelsDisplay();

        const event = new MouseEvent('mouseover', {
            bubbles: true,
            cancelable: true,
            view: window
        });
        button.dispatchEvent(event);
    }

    /** Re-render the persistent levels once the game has processed a tree change. */
    queueRefresh() {
        if (!this.#isTabActive()) return;
        setTimeout(() => {
            this.#maybeRestorePersistentAmbrosiaLevelsDisplay();
        }, 0);
    }

    /** Refresh the persistent levels when the tree in the save data changed (any source: game, mod, autosing). */
    onGameData(gameData: GameData) {
        if (!this.#isTabActive() || !this.#persistentAmbrosiaLevelsEnabled) return;

        // The 🔎 view also shows red and purple levels, so they are part of the signature
        const signature = JSON.stringify(gameData.ambrosiaUpgrades) + JSON.stringify(gameData.redAmbrosiaUpgrades);
        if (signature === this.#persistentAmbrosiaLevelsSignature) return;

        const isFirstSignature = this.#persistentAmbrosiaLevelsSignature === undefined;
        this.#persistentAmbrosiaLevelsSignature = signature;
        if (!isFirstSignature) {
            this.#maybeRestorePersistentAmbrosiaLevelsDisplay();
        }
    }

    #attachPersistentAmbrosiaLevelsDisplayListeners() {
        this.#detachPersistentAmbrosiaLevelsDisplayListeners();
        if (this.#blueberryUpgradeContainer) {
            this.#blueberryUpgradeContainer.addEventListener('mouseenter', this.#persistentAmbrosiaLevelsContainerEnterHandler);
            this.#blueberryUpgradeContainer.addEventListener('mouseleave', this.#persistentAmbrosiaLevelsContainerLeaveHandler);
        }
        const loadoutContainer = this.#slots.container();
        if (loadoutContainer) {
            loadoutContainer.addEventListener('mouseout', this.#persistentAmbrosiaLevelsSlotMouseOutHandler);
        }
    }

    #detachPersistentAmbrosiaLevelsDisplayListeners() {
        if (this.#blueberryUpgradeContainer) {
            this.#blueberryUpgradeContainer.removeEventListener('mouseenter', this.#persistentAmbrosiaLevelsContainerEnterHandler);
            this.#blueberryUpgradeContainer.removeEventListener('mouseleave', this.#persistentAmbrosiaLevelsContainerLeaveHandler);
        }
        const loadoutContainer = this.#slots.container();
        if (loadoutContainer) {
            loadoutContainer.removeEventListener('mouseout', this.#persistentAmbrosiaLevelsSlotMouseOutHandler);
        }
    }

    #hidePersistentAmbrosiaLevelsDisplay() {
        const button = this.#persistentAmbrosiaLevelsToggleButton;
        if (!button) { HSLogger.warn('hidePersistentAmbrosiaLevelsDisplay() missing persistent levels button', this.#context); return; }

        const event = new MouseEvent('mouseout', {
            bubbles: true,
            cancelable: true,
            view: window,
            relatedTarget: document.body
        });
        button.dispatchEvent(event);
    }

    #restorePersistentAmbrosiaLevelsDisplay() {
        const button = this.#persistentAmbrosiaLevelsToggleButton;
        if (!button) { HSLogger.warn('restorePersistentAmbrosiaLevelsDisplay() missing persistent levels button', this.#context); return; }

        if (button.matches(':hover')) {
            HSLogger.debug(() => 'restorePersistentAmbrosiaLevelsDisplay() button still hovered; deferring to normal hover state', this.#context);
            return;
        }

        const event = new MouseEvent('mouseout', {
            bubbles: true,
            cancelable: true,
            view: window,
            relatedTarget: document.body
        });
        button.dispatchEvent(event);
    }
}
