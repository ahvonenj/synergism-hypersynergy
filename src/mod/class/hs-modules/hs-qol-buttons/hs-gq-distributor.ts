import { HSLogger } from "../../hs-core/hs-logger";
import { HSModuleRegistry } from "../../hs-core/module/hs-module-registry";
import { HSSettings } from "../../hs-core/settings/hs-settings";
import { HSUtils } from "../../hs-utils/hs-utils";

import { goldenQuarkUpgradeMinimumSingularity } from "../../hs-core/gds/hs-gamedata-tables";
import { GoldenQuarkUpgradeKey } from "../../../types/data-types/hs-gamedata-api-types";
import type { GameData } from "../../../types/data-types/hs-player-savedata";
import { HSGameDialogs } from "../../hs-core/dialogs/hs-game-dialogs";
import { HSUI } from "../../hs-core/hs-ui";
import { GQPlanUpgrade, planGQDistribution } from "./hs-gq-distributor-plan";
import { formatGQPurchaseBudget } from "./hs-gq-purchase-budget";
import type { HSDialogSession } from "../../hs-core/dialogs/hs-game-dialogs";

type SkipReason = 'maxed' | 'tooExpensive' | 'shareTooSmall' | 'aboveRatio';
type SkippedUpgrades = Record<SkipReason, string[]>;

/** The game's purchase dialog (the shift-click one). */
interface PurchaseDialog {
    cost: HTMLInputElement;
    ok: HTMLButtonElement;
    cancel: HTMLButtonElement;
    wrapper: HTMLElement;
    box: HTMLElement;
}

/** What a distribution reads from the distributor's controls. */
interface GQDistributionInput {
    /** The shown upgrades. */
    ids: string[];
    /** The player's ratios, read once the dialog lock is taken: the inputs stay editable while it waits. */
    savedRatios: Record<string, number>;
    balance: boolean;
    keepSkipped: boolean;
    /** The game's name of each upgrade, for the skip summary (the id until resolved). */
    upgradeNames: Map<string, string>;
    setStatus: (text: string, clearAfterMs?: number) => void;
}

const GQ_DISTRIBUTOR_CSS = `
    /* The open button sits above the upgrade box's top left corner, without moving the game's own elements:
       past the box's 3px border and 5px top margin, so its bottom lines up with the hide-maxed button's row */
    #hs-gq-distributor-open {
        position: absolute; bottom: calc(100% + 8px); left: -3px;
        min-height: 0; height: 22px; padding: 0 10px;
        border: 2px solid pink; cursor: pointer;
    }
    #hs-gq-distributor {
        position: relative;
        display: flex; flex-direction: column; align-items: center;
        margin-top: 10px; padding: 10px;
        border: 1px solid #ccc; border-radius: 5px; background-color: rgba(0, 0, 0, 0.5);
    }
    #hs-gq-distributor-minimize {
        position: absolute; top: 4px; left: 4px;
        min-height: 0; width: 24px; height: 24px; padding: 0;
        font-size: 16px; font-weight: bold; line-height: 1; cursor: pointer;
    }
    #hs-gq-distributor h3 { margin: 0 0 10px 0; }
    #hs-gq-distributor .hs-gq-upgrades { display: flex; flex-wrap: wrap; justify-content: center; gap: 10px; }
    #hs-gq-distributor .hs-gq-upgrade { display: flex; flex-direction: column; align-items: center; }
    #hs-gq-distributor .hs-gq-upgrade img { width: 32px; height: 32px; margin-bottom: 5px; }
    /* The game gives every input a left padding, which shifts centred text to the right */
    #hs-gq-distributor .hs-gq-upgrade input { width: 60px; text-align: center; padding: 0; }
    /* No spin buttons: they take room on the right, which pushes the number off the icon's axis */
    #hs-gq-distributor input[type="number"] { appearance: textfield; -moz-appearance: textfield; }
    #hs-gq-distributor input[type="number"]::-webkit-outer-spin-button,
    #hs-gq-distributor input[type="number"]::-webkit-inner-spin-button { appearance: none; -webkit-appearance: none; margin: 0; }
    #hs-gq-distributor .hs-gq-option { margin-top: 4px; }
    #hs-gq-distributor .hs-gq-upgrades + .hs-gq-option { margin-top: 10px; }
    #hs-gq-distributor .hs-gq-actions { display: flex; justify-content: center; align-items: center; gap: 8px; margin-top: 10px; }
    #hs-gq-distributor .hs-gq-actions button { padding: 5px 15px; cursor: pointer; }
    /* The skip summary takes one line per reason, and can be selected and copied (the game blocks it on mobile) */
    #hs-gq-distributor .hs-gq-status {
        margin-top: 6px; font-size: 12px; color: #aaa; min-height: 16px; text-align: center;
        white-space: pre-line; user-select: text;
    }
`;

/**
 * One line per skip reason. `share` says what became of the share of the upgrades skipped before the allocation;
 * a share too small for a level is never spent, whatever the checkbox.
 */
function skipSummary(skipped: SkippedUpgrades, upgradeNames: Map<string, string>, header: string, share?: string): string {
    const shareNote = share ? ` (${share})` : '';
    const labels: Record<SkipReason, string> = {
        maxed: `Maxed${shareNote}`,
        tooExpensive: `Next level costs more than all your GQ${shareNote}`,
        shareTooSmall: 'Share too small for one level (left unspent)',
        aboveRatio: 'Already at or above its ratio'
    };
    const lines = (Object.keys(labels) as SkipReason[])
        .filter(reason => skipped[reason].length > 0)
        .map(reason => `${labels[reason]}: ${skipped[reason].map(id => upgradeNames.get(id) ?? id).join(' · ')}`);
    const count = Object.values(skipped).reduce((sum, ids) => sum + ids.length, 0);
    return [`${header} ${count} skipped:`, ...lines].join('\n');
}

/**
 * Class: HSGQDistributor
 * IsExplicitHSModule: No
 * Description:
 *     Created by HSQOLButtons. The GQ Distributor under the shop's Golden Quarks, opened by a button: spends the
 *     unspent GQ on the unmaxed GQ upgrades following ratios the player sets, through the game's purchase dialog.
 * Author: XxmolkxX, Shewchou
 */
export class HSGQDistributor {
    #context: string;
    #scanningGQUpgrades = false;
    #gqDistributorRenderVersion = 0;
    #openButton?: HTMLButtonElement;

    constructor(context: string) {
        this.#context = context;
    }

    /** True while the upgrade scan clicks the game's hide-maxed GQ toggle (those clicks aren't the player's). */
    isScanning(): boolean {
        return this.#scanningGQUpgrades;
    }

    #getUnmaxedGQUpgrades(highestSingularity: number): { id: string, src: string }[] {
        const toggle = document.getElementById('toggleMaxedGoldenQuarkUpgrades') as HTMLButtonElement | null;
        const container = document.getElementById('actualSingularityUpgradeContainer');
        if (!toggle || !container) return [];
        const wasHidden = toggle.getAttribute('aria-pressed') === 'true';
        this.#scanningGQUpgrades = true;
        try {
            if (!wasHidden) toggle.click();
            if (toggle.getAttribute('aria-pressed') !== 'true') return [];
            // The game's toggle synchronously adds this class to maxed upgrades.
            return Array.from(container.querySelectorAll<HTMLButtonElement>('button.singularityUpgrade'))
                .filter(button => !button.classList.contains('upgradeHiddenByMaxLevel')
                    && highestSingularity >= (goldenQuarkUpgradeMinimumSingularity[button.id as GoldenQuarkUpgradeKey] ?? 0))
                .map(button => ({ id: button.id, src: button.querySelector('img')?.src ?? '' }))
                .filter(upgrade => upgrade.id && upgrade.src);
        } finally {
            if (!wasHidden && toggle.getAttribute('aria-pressed') === 'true') toggle.click();
            this.#scanningGQUpgrades = false;
        }
    }

    #getGQDistributorRatios(): Record<string, number> {
        const saved = HSSettings.getSetting('gqDistributorRatios').getValue();
        if (typeof saved === 'string' && saved) {
            try {
                const ratios = JSON.parse(saved) as Record<string, unknown>;
                if (ratios && typeof ratios === 'object' && !Array.isArray(ratios)) {
                    return Object.fromEntries(Object.entries(ratios).filter(([, value]) =>
                        typeof value === 'number' && Number.isFinite(value) && value >= 0
                    )) as Record<string, number>;
                }
            } catch { /* Ignore malformed saved ratios. */ }
        }
        return {};
    }

    #buildOpenButton(): HTMLButtonElement {
        const button = document.createElement('button');
        button.id = 'hs-gq-distributor-open';
        button.type = 'button';
        button.textContent = 'Distributor';
        button.title = 'GQ Distributor: spend your Golden Quarks on the upgrades following ratios';
        button.addEventListener('click', () => this.#setOpened(true));
        return button;
    }

    #setOpened(opened: boolean): void {
        HSSettings.getSetting('gqDistributorOpen').setValue(opened);
        void this.show();
    }

    async show(): Promise<void> {
        const renderVersion = ++this.#gqDistributorRenderVersion;
        const container = document.getElementById('goldenQuarksDisplay');
        if (!container) return;
        // Written now, not in the next task: the button and the distributor are drawn right below
        HSUI.injectStyle(GQ_DISTRIBUTOR_CSS, 'hs-gq-distributor-css');
        HSUI.flushInjectedStyles();

        this.#openButton ??= this.#buildOpenButton();
        document.getElementById('actualSingularityUpgradeContainer')?.append(this.#openButton);

        // Closed: no save read and no scan
        if (HSSettings.getSetting('gqDistributorOpen').getValue() !== true) {
            document.getElementById('hs-gq-distributor')?.remove();
            this.#openButton.style.display = '';
            return;
        }

        let gameData: GameData | undefined;
        try {
            gameData = await HSModuleRegistry.getModule('HSGameDataAPI')?.getForcedGameData();
        } catch (error) {
            HSLogger.warn(`Could not load GQ distributor save data: ${error}`, this.#context);
        }
        if (!gameData || renderVersion !== this.#gqDistributorRenderVersion) return;
        document.getElementById('hs-gq-distributor')?.remove();

        const distributor = document.createElement('div');
        distributor.id = 'hs-gq-distributor';

        const minimize = document.createElement('button');
        minimize.id = 'hs-gq-distributor-minimize';
        minimize.type = 'button';
        minimize.textContent = '–';
        minimize.title = 'Minimize';
        minimize.addEventListener('click', () => this.#setOpened(false));
        distributor.appendChild(minimize);

        const title = document.createElement('h3');
        title.textContent = 'GQ Distributor';
        distributor.appendChild(title);

        const inputsContainer = document.createElement('div');
        inputsContainer.className = 'hs-gq-upgrades';
        distributor.appendChild(inputsContainer);

        const unmaxedUpgrades = this.#getUnmaxedGQUpgrades(gameData.highestSingularityCount);
        const savedRatios = this.#getGQDistributorRatios();

        const inputs: { [key: string]: HTMLInputElement } = {};
        // The inputs show 2 decimals at most; savedRatios keeps the exact values, and Distribute reads those
        const shownRatio = (ratio: number): string => (Math.round(ratio * 100) / 100).toString();
        // The game's name of each upgrade, for the skip summary (the id until resolved)
        const upgradeNames = new Map<string, string>();

        unmaxedUpgrades.forEach((upgrade) => {
            const wrapper = document.createElement('div');
            wrapper.className = 'hs-gq-upgrade';

            const img = document.createElement('img');
            img.src = upgrade.src;
            img.alt = upgrade.id;
            wrapper.appendChild(img);
            void HSUtils.getGameTranslation(`singularity.data.${upgrade.id}.name`).then((name) => {
                if (!name) return;
                upgradeNames.set(upgrade.id, name);
                img.title = name;
            });

            const input = document.createElement('input');
            input.type = 'number';
            input.min = '0';
            input.step = 'any';
            input.setAttribute('aria-label', `${upgrade.id} distribution ratio`);
            input.value = shownRatio(savedRatios[upgrade.id] ?? 0);
            inputs[upgrade.id] = input;
            wrapper.appendChild(input);

            input.addEventListener('input', () => {
                const val = parseFloat(input.value) || 0;
                savedRatios[upgrade.id] = Number.isFinite(val) ? Math.max(0, val) : 0;
                HSSettings.getSetting('gqDistributorRatios').setValue(JSON.stringify(savedRatios));
            });
            // Once the player is done typing (blur or Enter), not at each key
            input.addEventListener('change', () => {
                input.value = shownRatio(savedRatios[upgrade.id] ?? 0);
            });

            inputsContainer.appendChild(wrapper);
        });

        const distributeBtn = document.createElement('button');
        distributeBtn.id = 'hs-gq-distribute';
        distributeBtn.textContent = 'Distribute';

        const statusLabel = document.createElement('div');
        statusLabel.className = 'hs-gq-status';

        // Any new status cancels a pending auto-clear, so an older timer can't wipe a newer message
        let statusClearTimer: ReturnType<typeof setTimeout> | undefined;
        const setStatus = (text: string, clearAfterMs?: number) => {
            clearTimeout(statusClearTimer);
            statusClearTimer = undefined;
            statusLabel.textContent = text;
            if (clearAfterMs !== undefined) {
                statusClearTimer = setTimeout(() => { statusLabel.textContent = ''; }, clearAfterMs);
            }
        };

        const matchRatios = document.createElement('button');
        matchRatios.id = 'hs-gq-match-invested-ratios';
        matchRatios.type = 'button';
        matchRatios.textContent = 'Match invested ratios';
        matchRatios.title = 'Set the inputs to the proportions of GQ already invested, without spending any GQ.';

        const resetRatios = document.createElement('button');
        resetRatios.id = 'hs-gq-reset-ratios';
        resetRatios.type = 'button';
        resetRatios.textContent = 'Reset';
        resetRatios.addEventListener('click', () => {
            // A shown upgrade without a saved ratio already reads as 0
            for (const id of Object.keys(savedRatios)) savedRatios[id] = 0;
            for (const input of Object.values(inputs)) input.value = '0';
            HSSettings.getSetting('gqDistributorRatios').setValue(JSON.stringify(savedRatios));
            setStatus('Ratios reset.');
        });

        const actions = document.createElement('div');
        actions.className = 'hs-gq-actions';
        actions.append(distributeBtn, matchRatios, resetRatios);

        const balanceLabel = document.createElement('label');
        balanceLabel.className = 'hs-gq-option';
        balanceLabel.title = 'On: bring total GQ investments as close as possible to the entered ratios using your available GQ. Off: split only your unspent GQ using those ratios.';
        const balanceInvestments = document.createElement('input');
        balanceInvestments.id = 'hs-gq-balance-investments';
        balanceInvestments.type = 'checkbox';
        balanceInvestments.checked = HSSettings.getSetting('gqDistributorBalanceInvestments').getValue() === true;
        balanceInvestments.addEventListener('change', () => {
            HSSettings.getSetting('gqDistributorBalanceInvestments').setValue(balanceInvestments.checked);
        });
        balanceLabel.appendChild(balanceInvestments);
        const balanceText = document.createElement('span');
        balanceText.textContent = ' Balance total investments';
        balanceLabel.appendChild(balanceText);
        distributor.appendChild(balanceLabel);

        const keepSkippedLabel = document.createElement('label');
        keepSkippedLabel.className = 'hs-gq-option';
        keepSkippedLabel.title = 'On: the GQ share of skipped upgrades (maxed, or next level too expensive) stays unspent. Off: it is shared between the other upgrades.';
        const keepSkippedShare = document.createElement('input');
        keepSkippedShare.id = 'hs-gq-keep-skipped-share';
        keepSkippedShare.type = 'checkbox';
        keepSkippedShare.checked = HSSettings.getSetting('gqDistributorKeepSkippedShare').getValue() === true;
        keepSkippedShare.addEventListener('change', () => {
            HSSettings.getSetting('gqDistributorKeepSkippedShare').setValue(keepSkippedShare.checked);
        });
        keepSkippedLabel.appendChild(keepSkippedShare);
        const keepSkippedText = document.createElement('span');
        keepSkippedText.textContent = ' Keep the share of skipped upgrades';
        keepSkippedLabel.appendChild(keepSkippedText);
        distributor.appendChild(keepSkippedLabel);

        // While a match or a distribution runs
        const setControlsDisabled = (disabled: boolean) => {
            for (const control of [minimize, distributeBtn, matchRatios, resetRatios, balanceInvestments, keepSkippedShare]) control.disabled = disabled;
        };

        const syncInvestedRatios = (data: GameData): boolean => {
            const investments = Object.keys(inputs).map(id => ({
                id, invested: Math.max(0, data.goldenQuarkUpgrades[id as GoldenQuarkUpgradeKey]?.goldenQuarksInvested ?? 0)
            }));
            const largest = Math.max(0, ...investments.map(entry => entry.invested));
            if (largest === 0) return false;
            // Normalize to a largest weight of 100 for readable inputs and huge balances.
            for (const { id, invested } of investments) {
                savedRatios[id] = invested / largest * 100;
                inputs[id].value = shownRatio(savedRatios[id]);
            }
            HSSettings.getSetting('gqDistributorRatios').setValue(JSON.stringify(savedRatios));
            return true;
        };

        matchRatios.addEventListener('click', async () => {
            setControlsDisabled(true);
            try {
                const data = await HSModuleRegistry.getModule('HSGameDataAPI')?.getForcedGameData();
                if (!data) throw new Error('Player save unavailable.');
                setStatus(syncInvestedRatios(data) ? 'Ratios matched to existing investments.' : 'No GQ invested yet; ratios unchanged.');
            } catch (error) {
                HSLogger.warn(`Could not match invested GQ ratios: ${error}`, this.#context);
                setStatus('Could not read your current save. Try again.');
            } finally {
                setControlsDisabled(false);
            }
        });

        distributeBtn.addEventListener('click', async () => {
            setControlsDisabled(true);
            distributeBtn.style.opacity = '0.6';
            distributeBtn.style.cursor = 'not-allowed';
            try {
                await this.#distribute({
                    ids: Object.keys(inputs),
                    savedRatios,
                    balance: balanceInvestments.checked,
                    keepSkipped: keepSkippedShare.checked,
                    upgradeNames,
                    setStatus
                });
            } catch (error) {
                HSLogger.warn(`GQ distribution failed: ${error}`, this.#context);
                setStatus(`Distribution stopped: ${error instanceof Error ? error.message : 'purchase failed.'}`);
            } finally {
                setControlsDisabled(false);
                distributeBtn.style.opacity = '';
                distributeBtn.style.cursor = '';
            }
        });
        distributor.appendChild(actions);
        distributor.appendChild(statusLabel);

        container.parentNode?.insertBefore(distributor, container.nextSibling);
        this.#openButton.style.display = 'none';
    }

    #getPurchaseDialog(): PurchaseDialog | undefined {
        const cost = document.getElementById('purchasePromptCost') as HTMLInputElement | null;
        const ok = document.getElementById('ok_purchasePrompt') as HTMLButtonElement | null;
        const cancel = document.getElementById('cancel_purchasePrompt') as HTMLButtonElement | null;
        const wrapper = document.getElementById('purchasePromptWrapper');
        const box = document.getElementById('confirmationBox');
        return cost && ok && cancel && wrapper && box ? { cost, ok, cancel, wrapper, box } : undefined;
    }

    // The game refuses an unaffordable or maxed upgrade with an alert instead (dismissed by the session),
    // which ends in the timeout below
    #waitForPurchaseDialog(dialog: PurchaseDialog): Promise<void> {
        return new Promise((resolve, reject) => {
            const isVisible = () => dialog.wrapper.style.display === 'block';
            if (isVisible()) { resolve(); return; }

            const observer = new MutationObserver(() => {
                if (isVisible()) finish();
            });
            const finish = (error?: Error) => {
                clearTimeout(timer);
                observer.disconnect();
                if (error) reject(error);
                else resolve();
            };
            observer.observe(dialog.box, { attributes: true, subtree: true, attributeFilter: ['style'] });
            // Short: the game opens it synchronously on click, and unbuyable upgrades are filtered out beforehand
            const timer = setTimeout(() => finish(new Error('Purchase dialog did not open.')), 2000);
        });
    }

    /** Spends the GQ balance following the ratios, one purchase dialog per upgrade. Throws when it stops midway. */
    async #distribute(input: GQDistributionInput): Promise<void> {
        const { setStatus } = input;
        const dialog = this.#getPurchaseDialog();
        if (!dialog) {
            setStatus('Purchase dialog unavailable.');
            return;
        }
        if (!HSGameDialogs.isQueueIdle()) setStatus('Waiting for the open game dialog to close…');

        // Holds the dialog lock from the save snapshot to the last purchase
        await HSGameDialogs.run('gqDistributor', {}, async (s) => {
            // One fresh save snapshot per distribution; continuous GDS stays unchanged.
            const gameData = await HSModuleRegistry.getModule('HSGameDataAPI')?.getForcedGameData();
            if (!gameData) throw new Error('Player save unavailable.');
            const totalGQ = gameData.goldenQuarks;
            const ratios: Record<string, number> = {};
            for (const id of input.ids) {
                const val = input.savedRatios[id] ?? 0;
                if (Number.isFinite(val) && val > 0) ratios[id] = val;
            }
            if (Object.keys(ratios).length === 0) {
                setStatus('No ratio set.');
                return;
            }

            const skipped: SkippedUpgrades = { maxed: [], tooExpensive: [], shareTooSmall: [], aboveRatio: [] };
            const { buyableIds, nextLevelCostById } = this.#findBuyableUpgrades(Object.keys(ratios), totalGQ, skipped);
            if (buyableIds.length === 0) {
                setStatus(skipSummary(skipped, input.upgradeNames, 'Nothing to buy.'));
                return;
            }
            // Keeping their share: skipped upgrades still take part in the allocation (so the others
            // get the same share as if they were buyable), then their own share is not spent.
            const buyable = new Set(buyableIds);
            const planUpgrades: GQPlanUpgrade[] = (input.keepSkipped ? Object.keys(ratios) : buyableIds).map(id => ({
                id,
                weight: ratios[id] ?? 0,
                invested: Math.max(0, gameData.goldenQuarkUpgrades[id as GoldenQuarkUpgradeKey]?.goldenQuarksInvested ?? 0),
                buyable: buyable.has(id)
            }));
            const plan = planGQDistribution(planUpgrades, totalGQ, input.balance);
            if (!plan) {
                setStatus('No Golden Quarks to spend.');
                return;
            }
            const plannedSpendById = plan.spendById;

            // Only numbers and the game's upgrade ids: nothing to escape
            HSLogger.log(
                `GQ Distributor: budget=${plan.budget} plannedTotal=${plan.total} unallocated=${Math.max(0, plan.budget - plan.total)} planned=${JSON.stringify(
                    planUpgrades.map(({ id, weight, invested }) => ({ id, weight, invested, spend: plannedSpendById.get(id) ?? 0 }))
                )}`,
                this.#context
            );

            let current = 0;
            for (const id of buyableIds) {
                current++;
                const amountToSpend = plannedSpendById.get(id) ?? 0;
                setStatus(`Buying ${current}/${buyableIds.length} — spending ${amountToSpend.toLocaleString()} GQ…`);

                if (amountToSpend <= 0) {
                    // Balancing gives nothing to an upgrade already at its target; otherwise the share rounds to 0
                    skipped[input.balance ? 'aboveRatio' : 'shareTooSmall'].push(id);
                    setStatus(`Skipped ${current}/${buyableIds.length} (0 GQ)`);
                    continue;
                }
                // Checked here, not left to the purchase dialog: the game refuses with an alert instead of
                // opening it when the balance left after the previous purchases can't buy a level.
                // The balance always covers what's left to spend, so an allocation that buys a level can't be refused.
                if (amountToSpend < (nextLevelCostById.get(id) ?? 0)) {
                    skipped.shareTooSmall.push(id);
                    setStatus(`Skipped ${current}/${buyableIds.length} (share too small for one level)`);
                    continue;
                }

                const btn = document.getElementById(id) as HTMLButtonElement;
                if (!btn) continue;

                if (!await this.#buyUpgrade(s, dialog, btn, amountToSpend)) {
                    skipped.shareTooSmall.push(id);
                    setStatus(`Skipped ${current}/${buyableIds.length} (share too small for one level)`);
                }
            }
            if (Object.values(skipped).some(ids => ids.length > 0)) {
                // Stays until the next status, so it can be read and copied
                setStatus(skipSummary(skipped, input.upgradeNames, 'Done.', input.keepSkipped ? 'share kept' : 'share given to the others'));
            } else {
                setStatus('Done!', 3000);
            }
        });
    }

    /**
     * Leaves out the upgrades the game would refuse with an alert instead of the purchase dialog: maxed since the
     * list was built (e.g. a previous distribution), or next level costing more than the whole balance.
     * Their share goes to the other upgrades, or stays unspent with "Keep the share of skipped upgrades".
     */
    #findBuyableUpgrades(ids: string[], totalGQ: number, skipped: SkippedUpgrades): { buyableIds: string[], nextLevelCostById: Map<string, number> } {
        const gqHelper = HSModuleRegistry.getModule('HSGameDataAPI')?.goldenQuark;
        const nextLevelCostById = new Map<string, number>();
        const buyableIds = ids.filter((id) => {
            if (!gqHelper) return true;
            const key = id as GoldenQuarkUpgradeKey;
            const level = gqHelper.getGQUpgradeLevel(key);
            if (level >= gqHelper.computeGQUpgradeMaxLevel(key)) {
                skipped.maxed.push(id);
                return false;
            }
            const nextLevelCost = gqHelper.getGQUpgradeCumulativeCost(key, level + 1)
                - gqHelper.getGQUpgradeCumulativeCost(key, level);
            if (nextLevelCost > totalGQ) {
                skipped.tooExpensive.push(id);
                return false;
            }
            nextLevelCostById.set(id, nextLevelCost);
            return true;
        });
        return { buyableIds, nextLevelCostById };
    }

    /**
     * One purchase through the game's dialog, spending up to `amount` GQ. False: the game can't buy a level with it
     * (the dialog is cancelled). Throws when the session ends or another dialog gets in the way.
     */
    async #buyUpgrade(s: HSDialogSession, dialog: PurchaseDialog, btn: HTMLButtonElement, amount: number): Promise<boolean> {
        if (s.ended) throw new Error('Time limit reached.');
        // A dialog opened meanwhile (the player's, the game's) would delay the purchase dialog
        if (!HSGameDialogs.isQueueIdle()) throw new Error('A game dialog opened.');
        s.act({ purchasePrompt: 'show', alert: 'dismiss' }, () => {
            btn.dispatchEvent(new MouseEvent('click', { shiftKey: true, bubbles: true }));
        });
        try {
            await this.#waitForPurchaseDialog(dialog);
        } catch {
            // Unbuyable upgrades are filtered out beforehand: a missing dialog is unexpected,
            // so stop the whole distribution here and name the upgrade (the caller's catch reports it).
            // If it opens later, the hook cancels it (the session has ended by then).
            throw new Error(`Purchase dialog did not open for ${btn.id}.`);
        }

        // Let the game calculate affordable levels and enforce upgrade caps.
        dialog.cost.value = formatGQPurchaseBudget(amount);
        dialog.cost.dispatchEvent(new Event('input', { bubbles: true }));
        const bought = !dialog.ok.disabled;
        if (!bought) {
            dialog.cancel.click();
        } else {
            // Change normalizes the field to the game's exact quote as a raw JS number
            // (not the rounded, localized summary). Fail closed before confirming a purchase.
            dialog.cost.dispatchEvent(new Event('change', { bubbles: true }));
            const quotedCost = Number(dialog.cost.value);
            if (!Number.isFinite(quotedCost) || quotedCost <= 0 || quotedCost > amount) {
                dialog.cancel.click();
                throw new Error(`Unsafe purchase quote for ${btn.id}: ${quotedCost} GQ, allocation ${amount} GQ.`);
            }
            // The game confirms multi-level and One Mind purchases with an Alert, chained after this click
            if (!s.act({ alert: 'dismiss' }, () => dialog.ok.click())) {
                dialog.cancel.click();
                throw new Error('Time limit reached.');
            }
        }

        // Let the purchase settle, and its alert be dismissed
        await HSUtils.sleep(0);

        // Dismiss any hover tooltip the programmatic click may have triggered
        btn.dispatchEvent(new MouseEvent('mouseleave', { bubbles: true }));
        btn.dispatchEvent(new MouseEvent('mouseout', { bubbles: true }));
        btn.blur();
        return bought;
    }

    hide(): void {
        this.#gqDistributorRenderVersion++;
        document.getElementById('hs-gq-distributor')?.remove();
        this.#openButton?.remove();
    }
}
