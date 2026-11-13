import { SINGULARITY_VIEW } from "../../../types/module-types/hs-gamestate-types";
import { HSLogger } from "../../hs-core/hs-logger";
import { HSModule, type HSModuleOptions } from "../../hs-core/module/hs-module";
import { HSModuleRegistry } from "../../hs-core/module/hs-module-registry";
import { HSSettings } from "../../hs-core/settings/hs-settings";
import { HSSettingsUI } from "../../hs-core/settings/hs-settings-ui";
import { HSUtils } from "../../hs-utils/hs-utils";
import { HSGameDialogs } from "../../hs-core/dialogs/hs-game-dialogs";
import { HSGlobal } from "../../hs-core/hs-global";
import { HSUI } from "../../hs-core/hs-ui";
import { HSGQDistributor } from "./hs-gq-distributor";
import { HSAutomationQuickbarPlacement } from "../hs-qol-quickbar/hs-automation-quickbar-placement";

const MAXED_UPGRADE_TOGGLES = {
    toggleMaxedGoldenQuarkUpgrades: 'hideMaxedGQUpgrades',
    toggleMaxedOcteractUpgrades: 'hideMaxedOctUpgrades',
} as const;
type MaxedUpgradeToggleId = keyof typeof MAXED_UPGRADE_TOGGLES;

const POTIONS = {
    offering: 'Offering',
    obtainium: 'Obtainium',
} as const;
type PotionKind = keyof typeof POTIONS;

/**
 *  Class: HSQOLButtons
 *  IsExplicitHSModule: Yes
 *  Description:
 *    Hypersynergism module which adds qol buttons to the game.
 *    Creates HSGQDistributor (the GQ Distributor) and HSAutomationQuickbarPlacement (the Automation Quickbar).
 *  Author: Swiffy, XxmolkxX, Shewchou, the creator of original autosing script (httpsnet?) (hide gq/oct buttons) and Core (syn UI bar)
*/
export class HSQOLButtons extends HSModule {
    #gqDistributor: HSGQDistributor;
    #automationQuickbar: HSAutomationQuickbarPlacement;

    constructor(moduleOptions: HSModuleOptions) {
        super(moduleOptions);

        this.#gqDistributor = new HSGQDistributor(this.context);
        this.#automationQuickbar = new HSAutomationQuickbarPlacement(this.context);
    }

    async init(): Promise<void> {
        if (this.isInitialized) return;
        HSLogger.log('Initialising HSQOLButtons module', this.context);
        this.isInitialized = true;

        // Each time the subtab comes on screen (upgrades maxed since the last visit get hidden), always on
        this.#onSubtabShown(SINGULARITY_VIEW.SHOP, async () => {
            await this.setMaxedGQUpgradesVisibility();
            if (HSSettings.getSetting('enableGQDistributor').isEnabled()) await this.showGQDistributor();
        });
        this.#onSubtabShown(SINGULARITY_VIEW.OCTERACTS, async () => { this.setMaxedOctUpgradesVisibility(); });

        this.#initializeMaxedUpgradeToggleSync();

        // Any settings-driven feature activation is handled by HSSettings.syncSettings().
        // Only perform module-specific DOM setup here if not settings-driven.
        this.#injectPotionButtons('offering');
        this.#injectPotionButtons('obtainium');
        this.#injectAdd10Button();
        this.#injectPurchaseBuyMaxButton();
    }

    /** CONSUME 10x and BUY 10x next to the game's own potion buttons (in the game's page from the start). */
    #injectPotionButtons(potion: PotionKind) {
        if (document.getElementById(`${potion}PotionMultiUseButton`)) return;

        const usePotionButton = document.getElementById(`use${potion}potion`);
        const buyPotionButton = document.getElementById(`buy${potion}potion`);
        if (!usePotionButton?.parentNode || !buyPotionButton?.parentNode) {
            HSLogger.warn(`Could not find native buttons for use/buy ${potion} potions`, this.context);
            return;
        }

        // The clones lose the game's i18n attribute: a language switch would put the game's text back on them
        const clone = usePotionButton.cloneNode(true) as HTMLElement;
        clone.id = `${potion}PotionMultiUseButton`;
        clone.removeAttribute('i18n');
        clone.textContent = 'CONSUME 10x';
        clone.addEventListener('click', () => {
            for (let i = 0; i < 10; i++) usePotionButton.click();
        });
        usePotionButton.parentNode.insertBefore(clone, usePotionButton.nextSibling);

        const clone2 = buyPotionButton.cloneNode(true) as HTMLElement;
        clone2.id = `${potion}PotionMultiBuyButton`;
        clone2.removeAttribute('i18n');
        clone2.textContent = 'BUY 10x';
        clone2.addEventListener('click', () => { void this.#buyPotions10(buyPotionButton); });
        buyPotionButton.parentNode.insertBefore(clone2, buyPotionButton.nextSibling);

        HSLogger.log(`${POTIONS[potion]} potion multi buy / consume buttons injected`, this.context);
    }

    /**
     * Buys 10 potions, whatever the shop's buy mode: Buy ANY asks the amount in a Prompt (answered 10),
     * Buy 10 buys up to 10 per click, Buy 1 needs 10 clicks. Buy MAX can't buy exactly 10: refused.
     * The purchase Confirms are answered (shown when the game's shop confirmations are on).
     */
    async #buyPotions10(buyButton: HTMLElement): Promise<void> {
        const mode = await this.#getShopBuyMode();
        if (mode === true) {
            HSUI.Notify('BUY 10x: the shop is in Buy MAX mode. Switch it to Buy 1, Buy 10 or Buy ANY', { notificationType: 'warning' });
            return;
        }
        // Unknown mode: as Buy 1
        const clicks = mode === 'ANY' || mode === 'TEN' ? 1 : 10;
        HSGameDialogs.act('potionBuy10', { confirm: 'ok', prompt: { ok: '10' } }, () => {
            for (let i = 0; i < clicks; i++) buyButton.click();
        });
    }

    /** The shop's buy mode, as the game stores it: false (Buy 1), 'TEN', true (Buy MAX) or 'ANY'. */
    async #getShopBuyMode(): Promise<boolean | 'TEN' | 'ANY' | undefined> {
        const mode = HSGlobal.exposedPlayer?.shopBuyMaxToggle;
        if (mode !== undefined) return mode;

        // Without the patched game: the toggle's text, compared with the game's own labels
        const text = document.getElementById('toggleBuyMaxShopText')?.textContent?.trim();
        if (!text) return undefined;
        const labels = [[false, 'shop.buy1'], ['TEN', 'shop.buy10'], [true, 'shop.buyMax'], ['ANY', 'shop.buyAny']] as const;
        for (const [labelMode, key] of labels) {
            if ((await HSUtils.getGameTranslation(key))?.trim() === text) return labelMode;
        }
        return undefined;
    }

    // TODO: Make the 'add10' feature a 'addX' instead,
    // with X being editable by the user (by right-clicking the button or something...)
    async #injectAdd10Button() {
        if (document.getElementById('hs-add-10-btn')) return;

        const container = document.getElementById('addCodeBox');
        if (!container) return;

        const addBtn = container.querySelector('#addCode') as HTMLButtonElement;
        const addAllBtn = container.querySelector('#addCodeAll') as HTMLButtonElement;
        const addOneBtn = container.querySelector('#addCodeOne') as HTMLButtonElement;

        if (!addBtn || !addAllBtn || !addOneBtn) return;

        const add10Btn = document.createElement('button');
        add10Btn.id = 'hs-add-10-btn';
        add10Btn.className = 'hs-add-10-btn';
        add10Btn.textContent = 'Add x10';

        add10Btn.addEventListener('click', () => {
            // Answers the amount Prompt with 10 and dismisses the result Alert. Without a maxed calculator, the game
            // then asks the sum in a second Prompt: shown (a prompt value answers only the first Prompt).
            // The click also triggers Auto-Loadout (if enabled), through HSAmbrosiaAutoLoadout's Add code listener
            HSGameDialogs.act('addCode10', { prompt: { ok: '10' }, alert: 'dismiss' }, () => addBtn.click());
        });

        // Insert the new button next to the existing buttons.
        addAllBtn.parentNode?.insertBefore(add10Btn, addOneBtn);

        // Force the container and its direct child buttons to share width evenly.
        try {
            container.style.display = 'flex';
            container.style.width = 'auto';
            container.style.maxWidth = '480px';
            container.style.margin = '0 auto';
            container.style.marginBottom = '3px';
            container.style.gap = '0';

            const buttons = Array.from(container.querySelectorAll<HTMLButtonElement>('button'));
            buttons.forEach(b => {
                b.style.flex = '1 1 25%';
                b.style.minWidth = '0';
                b.style.boxSizing = 'border-box';
                b.style.height = '30px';
                b.style.padding = '4px 8px';
                b.style.whiteSpace = 'nowrap';
                b.style.overflow = 'hidden';
                b.style.textOverflow = 'ellipsis';
                b.style.display = 'inline-flex';
                b.style.alignItems = 'center';
                b.style.justifyContent = 'center';
            });
        } catch (e) {
            HSLogger.log(`Failed to apply inline layout styles for addCodeBox: ${e}`, this.context);
        }
    }

    public async setMaxedOctUpgradesVisibility(): Promise<void> {
        this.#applyMaxedUpgradePreference('toggleMaxedOcteractUpgrades');
    }

    public async setMaxedGQUpgradesVisibility(): Promise<void> {
        this.#applyMaxedUpgradePreference('toggleMaxedGoldenQuarkUpgrades');
    }

    #initializeMaxedUpgradeToggleSync(): void {
        for (const buttonId of Object.keys(MAXED_UPGRADE_TOGGLES) as MaxedUpgradeToggleId[]) {
            // The game changes aria-pressed only in its own click listener on the button. Read once that one has run,
            // whichever was added first (the mod can start before the game on Steam). Also runs for the mod's clicks.
            const button = document.getElementById(buttonId);
            button?.addEventListener('click', () => {
                window.setTimeout(() => this.#syncMaxedUpgradeSettingFromButton(button as HTMLButtonElement), 0);
            });
            this.#applyMaxedUpgradePreference(buttonId);
        }
    }

    #applyMaxedUpgradePreference(
        buttonId: MaxedUpgradeToggleId,
    ): void {
        const button = document.getElementById(buttonId) as HTMLButtonElement | null;
        if (!button) return;

        const settingName = MAXED_UPGRADE_TOGGLES[buttonId];
        const shouldHide = HSSettings.getSetting(settingName).getValue() === true;
        const isHidden = button.getAttribute('aria-pressed') === 'true';
        if (shouldHide !== isHidden) button.click();
    }

    #syncMaxedUpgradeSettingFromButton(button: HTMLButtonElement): void {
        if (!(button.id in MAXED_UPGRADE_TOGGLES)) return;
        if (this.#gqDistributor.isScanning() && button.id === 'toggleMaxedGoldenQuarkUpgrades') return;

        const buttonId = button.id as MaxedUpgradeToggleId;
        const settingName = MAXED_UPGRADE_TOGGLES[buttonId];
        const setting = HSSettings.getSetting(settingName);
        const isHidden = button.getAttribute('aria-pressed') === 'true';
        if (setting.getValue() !== isHidden) {
            setting.setValue(isHidden);
            HSSettingsUI.refreshSettingControls([settingName]);
        }
    }

    #injectPurchaseBuyMaxButton(): void {
        if (document.getElementById('hs-purchase-buy-max')) return;
        const cost = document.getElementById('purchasePromptCost') as HTMLInputElement | null;
        const ok = document.getElementById('ok_purchasePrompt') as HTMLButtonElement | null;
        const wrapper = document.getElementById('purchasePromptWrapper');
        if (!cost || !ok?.parentNode || !wrapper) return;

        const button = document.createElement('button');
        button.id = 'hs-purchase-buy-max';
        button.type = 'button';
        button.textContent = 'Buy MAX';
        button.addEventListener('click', () => {
            if (wrapper.style.display !== 'block') return;
            cost.value = '-1';
            cost.dispatchEvent(new Event('input', { bubbles: true }));
            if (!ok.disabled) ok.click();
        });
        ok.parentNode.insertBefore(button, ok);
    }

    async showGQDistributor(): Promise<void> {
        this.#injectPurchaseBuyMaxButton();
        await this.#gqDistributor.show();
    }

    hideGQDistributor(): void {
        this.#gqDistributor.hide();
    }

    /** Enable the Automation Quickbar (see HSAutomationQuickbarPlacement). */
    public enableAutomationQuickbar(): void {
        this.#automationQuickbar.enable();
    }

    /** Disable the Automation Quickbar, wherever it is (its place in the header stays remembered). */
    public disableAutomationQuickbar(): void {
        this.#automationQuickbar.disable();
    }

    /** Runs onShown each time a Singularity subtab comes on screen, a moment later (the game updates it first) */
    #onSubtabShown(subView: SINGULARITY_VIEW, onShown: () => void): void {
        HSModuleRegistry.getModule('HSGameState')?.subscribeSubtab('SINGULARITY_VIEW', subView, (isActive) => {
            if (isActive) setTimeout(onShown, 20);
        });
    }
}
