import { HSUI } from "../../../hs-core/hs-ui";
import { HSLogger } from "../../../hs-core/hs-logger";
import { HSModuleManager } from "../../../hs-core/module/hs-module-manager";
import { HSQuickbarIconPickerController } from "../../hs-loadout-icons/hs-loadout-icon-picker";
import { HSTooltip } from "../../../hs-core/hs-tooltip";
import { escapeHtml } from "../hs-heater-utils";
import { buildResultTableHtmlFromNormalized } from "./hs-heater-ui-result-renderer";
import { clearHeaterIconOverride, getEffectiveHeaterIconSrc, getOverrideHeaterIconSrc, setHeaterIconOverride, } from "../hs-heater-icon-store";
import { HSHeaterResultStore } from "../hs-heater-result-store";
import type { NormalizedHeaterResultEntry } from "../hs-heater-result-store";
import { getHeaterExaltRules } from "../hs-heater-result-config";
import { getHeaterExaltName } from "../hs-heater-input-config";
import type { HSAmbrosia } from "../../hs-ambrosia/hs-ambrosia";

// === Loadout Preview Metadata Type and Map ===
type LoadoutPreviewMeta = { iconFile: string };

const LOADOUT_UPGRADE_META_MAP = {
    ambrosiaTutorial:              { iconFile: 'BlueberryTutorial.png' },
    ambrosiaPatreon:               { iconFile: 'BlueberryPatreon.png' },
    ambrosiaObtainium1:            { iconFile: 'BlueberryObtainium.png' },
    ambrosiaOffering1:             { iconFile: 'BlueberryOffering.png' },
    ambrosiaHyperflux:             { iconFile: 'BlueberryHyperflux.png' },
    ambrosiaBrickOfLead:           { iconFile: 'BlueberryBrickOfLead.png' },
    ambrosiaFreeLuckUpgrades:      { iconFile: 'BlueberryFreeLuckUpgrades.png' },
    ambrosiaQuarks1:               { iconFile: 'BlueberryQuarks.png' },
    ambrosiaCubes1:                { iconFile: 'BlueberryCubes.png' },
    ambrosiaLuck1:                 { iconFile: 'BlueberryLuck.png' },
    ambrosiaBaseObtainium1:        { iconFile: 'BlueberryBaseObtainium1.png' },
    ambrosiaBaseOffering1:         { iconFile: 'BlueberryBaseOffering1.png' },
    ambrosiaSingReduction1:        { iconFile: 'BlueberrySingReduction.png' },
    ambrosiaTalismanBonusRuneLevel:{ iconFile: 'BlueberryTalismanBonusRuneLevel.png' },
    ambrosiaFreeGenerationUpgrades:{ iconFile: 'BlueberryFreeGenerationLevels.png' },
    ambrosiaCubeQuark1:            { iconFile: 'BlueberryCubeQuark.png' },
    ambrosiaLuckQuark1:            { iconFile: 'BlueberryLuckQuark.png' },
    ambrosiaLuckCube1:             { iconFile: 'BlueberryLuckCube.png' },
    ambrosiaQuarkCube1:            { iconFile: 'BlueberryQuarkCube.png' },
    ambrosiaCubeLuck1:             { iconFile: 'BlueberryCubeLuck.png' },
    ambrosiaQuarkLuck1:            { iconFile: 'BlueberryQuarkLuck.png' },
    ambrosiaFreeRedLuckUpgrades:   { iconFile: 'BlueberryFreeRedLuckUpgrades.png' },
    ambrosiaQuarks2:               { iconFile: 'BlueberryQuarks2.png' },
    ambrosiaCubes2:                { iconFile: 'BlueberryCubes2.png' },
    ambrosiaLuck2:                 { iconFile: 'BlueberryLuck2.png' },
    ambrosiaBaseObtainium2:        { iconFile: 'BlueberryBaseObtainium2.png' },
    ambrosiaBaseOffering2:         { iconFile: 'BlueberryBaseOffering2.png' },
    ambrosiaInfiniteShopUpgrades1: { iconFile: 'BlueberryInfiniteShopUpgrades.png' },
    ambrosiaRuneOOMBonus:          { iconFile: 'BlueberryRuneOOMBonus.png' },
    ambrosiaFreeQuarkUpgrades:     { iconFile: 'BlueberryFreeQuarkUpgrades.png' },
    ambrosiaQuarks3:               { iconFile: 'BlueberryQuarks3.png' },
    ambrosiaCubes3:                { iconFile: 'BlueberryCubes3.png' },
    ambrosiaLuck3:                 { iconFile: 'BlueberryLuck3.png' },
    ambrosiaSingReduction2:        { iconFile: 'BlueberrySingReduction2.png' },
    ambrosiaInfiniteShopUpgrades2: { iconFile: 'BlueberryInfiniteShopUpgrades2.png' },
    ambrosiaInfiniteShopUpgrades3: { iconFile: 'BlueberryInfiniteShopUpgrades3.png' },
    ambrosiaLuck4:                 { iconFile: 'BlueberryLuck4.png' },
    ambrosiaQuarks4:               { iconFile: 'BlueberryQuarks4.png' },
    ambrosiaCubes4:                { iconFile: 'BlueberryCubes4.png' },
    ambrosiaFreeCubeUpgrades:      { iconFile: 'BlueberryFreeCubeUpgrades.png' },
    ambrosiaFreeObtainiumUpgrades: { iconFile: 'BlueberryFreeObtainiumUpgrades.png' },
    ambrosiaFreeOfferingUpgrades:  { iconFile: 'BlueberryFreeOfferingUpgrades.png' },
    twoMind:                       { iconFile: 'BlueberryMind.png' },
} as const satisfies Record<string, LoadoutPreviewMeta>;

// === Loadout Preview Upgrade Key Type ===
type LoadoutPreviewUpgradeKey = keyof typeof LOADOUT_UPGRADE_META_MAP;
type LoadoutPreviewItem = { key: string; maxLevel?: number; iconUrl?: string };

// === Selector and ID Constants ===
const HEATER_RESULT_UI_SELECTORS = {
    modalBody:          '.hs-modal-body',
    resultsHeader:      '.hs-heater-results-topbar',
    previewRow:         'hs-heater-loadout-preview-row',
    previewButton:      'hs-heater-preview-button',
    previewEmptyCell:   'hs-heater-preview-empty-cell',
    previewHoverClass:  'hs-heater-loadout-preview--hover',
    jsonTooltipHoverClass: 'hs-heater-loadout-json-tooltip--hover',
    copyLoadoutBtn:     'hs-heater-copy-loadout-btn',
    importLoadoutBtn:   'hs-heater-import-loadout-btn',
    jsonTooltipTrigger: 'hs-heater-json-tooltip-trigger',
    dataLoadout:        'data-loadout',
    importFileInputId:  'importBlueberries',
} as const;

// === Main UI Class ===
export class HSHeaterUIResult {

    // === State ===
    static #activeResultModal: HTMLElement | null = null;
    static #context = 'HSHeaterUIResult';

    static setActiveResultModal(modal: HTMLElement | null): void {
        this.#activeResultModal = modal;
    }

    static clearActiveResultModal(): void {
        this.#activeResultModal = null;
    }

    static #quickbarCloneCleanup: (() => void) | null = null;
    static #tooltipIdSequence = 0;
    static #iconPicker = new HSQuickbarIconPickerController<string>({
        shouldIgnoreClickTarget: (target: Element) => {
            const modal = this.#activeResultModal;
            return !!(modal && modal.contains(target));
        },
        setSlotPickModeVisual: (semanticId: string, active: boolean) => {
            const modal = this.#activeResultModal;
            if (!modal) return;
            modal.querySelectorAll<HTMLButtonElement>('.hs-heater-type-icon-button').forEach((button) => {
                const matchId = button.dataset.heaterIconId;
                button.classList.toggle('hs-quickbar-slot-pickmode', !!active && matchId === semanticId);
            });
        },
        clearAllSlotPickModeVisuals: () => {
            const modal = this.#activeResultModal;
            if (!modal) return;
            modal.querySelectorAll<HTMLButtonElement>('.hs-heater-type-icon-button').forEach((button) => {
                button.classList.remove('hs-quickbar-slot-pickmode');
            });
        },
        assignIconToSlot: (semanticId: string, iconUrl: string) => {
            setHeaterIconOverride(semanticId, iconUrl);
            const modal = this.#activeResultModal;
            if (modal) {
                this.#refreshHeaterResultIconButtons(modal);
            }
        },
    });

    static #attachedModalHandlers = new WeakMap<HTMLElement, {
        onClick: (event: Event) => void;
        onShowOverlay: (event: Event) => void;
        onHideOverlay: (event: Event) => void;
        onEscape: (event: KeyboardEvent) => void;
        detach: () => void;
    }>();

    static #activeHoverOverlay: {
        target: HTMLElement;
        kind: 'preview' | 'json';
        tooltip: HTMLElement;
        cleanup: () => void;
    } | null = null;

    static #pinnedOverlays = new Map<HTMLElement, {
        kind: 'preview' | 'json';
        tooltip: HTMLElement;
        position?: { left: number; top: number };
    }>();

    static #tooltipDragState = new Map<HTMLElement, {
        pointerId: number | null;
        offsetX: number;
        offsetY: number;
        onPointerMove: ((event: PointerEvent) => void) | null;
        onPointerUp: ((event: PointerEvent) => void) | null;
        cleanup: (() => void) | null;
    }>();

    // === Metadata Maps ===
    static #loadoutUpgradeMetaMap = LOADOUT_UPGRADE_META_MAP;

    static #ambrosiaLoadoutPreviewRows: Array<Array<LoadoutPreviewItem | null>> = [
        [ 
            { key: 'ambrosiaTutorial',    maxLevel: 10 }, 
            { key: 'ambrosiaPatreon',     maxLevel: 1 }, 
            { key: 'ambrosiaObtainium1',  maxLevel: 2 }, 
            { key: 'ambrosiaOffering1',   maxLevel: 2 }, 
            { key: 'ambrosiaHyperflux',   maxLevel: 7 }, 
            { key: 'ambrosiaBrickOfLead', maxLevel: 25 }, 
            null 
        ],
        [ 
            { key: 'ambrosiaFreeLuckUpgrades',       maxLevel: 25 }, 
            { key: 'ambrosiaQuarks1',                maxLevel: 100 }, 
            { key: 'ambrosiaCubes1',                 maxLevel: 100 }, 
            { key: 'ambrosiaLuck1',                  maxLevel: 100 }, 
            { key: 'ambrosiaBaseObtainium1',         maxLevel: 20 }, 
            { key: 'ambrosiaBaseOffering1',          maxLevel: 40 }, 
            { key: 'ambrosiaSingReduction1',         maxLevel: 2 }, 
            { key: 'ambrosiaTalismanBonusRuneLevel', maxLevel: 100 }, 
            null 
        ],
        [ 
            { key: 'ambrosiaFreeGenerationUpgrades', maxLevel: 5 },
            { key: 'ambrosiaCubeQuark1',             maxLevel: 25 }, 
            { key: 'ambrosiaLuckQuark1',             maxLevel: 25 }, 
            { key: 'ambrosiaLuckCube1',              maxLevel: 25 }, 
            { key: 'ambrosiaQuarkCube1',             maxLevel: 25 }, 
            { key: 'ambrosiaCubeLuck1',              maxLevel: 25 }, 
            { key: 'ambrosiaQuarkLuck1',             maxLevel: 25 }, 
            null 
        ],
        [ 
            { key: 'ambrosiaFreeRedLuckUpgrades',   maxLevel: 40 }, 
            { key: 'ambrosiaQuarks2',               maxLevel: 100 }, 
            { key: 'ambrosiaCubes2',                maxLevel: 100 }, 
            { key: 'ambrosiaLuck2',                 maxLevel: 100 }, 
            { key: 'ambrosiaBaseObtainium2',        maxLevel: 30 }, 
            { key: 'ambrosiaBaseOffering2',         maxLevel: 60 }, 
            { key: 'ambrosiaInfiniteShopUpgrades1', maxLevel: 20 }, 
            { key: 'ambrosiaRuneOOMBonus',          maxLevel: 100 }, 
            null 
        ],
        [ 
            { key: 'ambrosiaFreeQuarkUpgrades',     maxLevel: 10 }, 
            { key: 'ambrosiaQuarks3',               maxLevel: 10 }, 
            { key: 'ambrosiaCubes3',                maxLevel: 100 }, 
            { key: 'ambrosiaLuck3',                 maxLevel: 100 }, 
            { key: 'ambrosiaSingReduction2',        maxLevel: 2 }, 
            { key: 'ambrosiaInfiniteShopUpgrades2', maxLevel: 20 }, 
            { key: 'ambrosiaInfiniteShopUpgrades3', maxLevel: 20 },
            { key: 'ambrosiaLuck4',                 maxLevel: 50 }, 
            null 
        ],
        [
            { key: 'ambrosiaQuarks4', maxLevel: 100 },
            { key: 'ambrosiaCubes4',  maxLevel: 50 },
            { key: 'ambrosiaFreeCubeUpgrades', maxLevel: 30 },
            { key: 'ambrosiaFreeObtainiumUpgrades', maxLevel: 50 },
            { key: 'ambrosiaFreeOfferingUpgrades', maxLevel: 50 },
            { key: 'twoMind',         maxLevel: 1 },
            null,
            null,
        ],
    ];

    // === UI/DOM Update Methods ===
    static updateResultModalContent(modal: HTMLElement, normalizedEntries: NormalizedHeaterResultEntry[], selectedSemanticIds: Set<string> = new Set()): boolean {
        const body = modal.querySelector(HEATER_RESULT_UI_SELECTORS.modalBody);
        if (!body) return false;

        body.innerHTML = buildResultTableHtmlFromNormalized(normalizedEntries, selectedSemanticIds);
        modal.style.width = 'auto';
        modal.style.minWidth = '0';
        modal.style.maxWidth = 'none';
        this.populateResultsHeader(modal);
        this.#refreshHeaterResultIconButtons(modal);
        return true;
    }

    static populateResultsHeader(modal: HTMLElement): void {
        const header = modal.querySelector(HEATER_RESULT_UI_SELECTORS.resultsHeader) as HTMLElement | null;
        if (!header) return;

        // Disconnect previous observer and remove previous click listener before reinitializing
        this.#quickbarCloneCleanup?.();
        this.#quickbarCloneCleanup = null;

        // Preserve any static header content (help badge, future actions) and remove only the old slot row.
        header.querySelector('[data-hs-heater-quickbar-clone]')?.remove();

        // The Ambrosia tab's loadout slots, without its mode and quick save buttons
        const slotsSource = HSModuleManager.getModule<HSAmbrosia>('HSAmbrosia')?.getLoadoutContainer();
        if (slotsSource) {
            const clone = slotsSource.cloneNode(true) as HTMLElement;
            clone.removeAttribute('id');
            clone.className = 'hs-quickbar-slots-wrapper';
            clone.style.display = 'inline-flex';
            clone.dataset.hsHeaterQuickbarClone = 'true';
            clone.querySelectorAll('.blueberryLoadoutSetting').forEach(el => el.remove());
            // The game's own marker would stay frozen on the copy: only the mod's borders are mirrored
            clone.querySelectorAll('.activeBlueberryLoadout').forEach(el => el.classList.remove('activeBlueberryLoadout'));
            // Strip child IDs to avoid duplicate DOM IDs
            clone.querySelectorAll('[id]').forEach(el => el.removeAttribute('id'));
            header.appendChild(clone);
            this.#quickbarCloneCleanup = this.#setupQuickbarCloneLink(clone, slotsSource);
        }

        // The Exalt badge, opposite the help badge, when the heat ran inside an Exalt with rules to explain
        header.querySelector('.hs-heater-results-topbar-exalt')?.remove();
        const exalt = HSHeaterResultStore.getCurrentRawResult()?.input.exalt ?? 0;
        const exaltRules = getHeaterExaltRules(exalt);
        if (exaltRules) {
            const exaltBadge = document.createElement('div');
            exaltBadge.className = 'hs-heater-results-topbar-exalt';
            exaltBadge.tabIndex = 0;
            const exaltName = getHeaterExaltName(exalt);
            exaltBadge.setAttribute('aria-label', `How the results read in ${exaltName}`);
            exaltBadge.innerHTML = `<img src="Pictures/Default/TinySChalTime.png" alt="${escapeHtml(exaltName)}" />`;
            HSTooltip.set(exaltBadge, { text: exaltRules, delay: 0 });
            header.prepend(exaltBadge);
        }
    }

    // === Icon refresh / quickbar clone helpers ===

    static #refreshHeaterResultIconButtons(modal: HTMLElement): void {
        modal.querySelectorAll<HTMLButtonElement>('.hs-heater-type-icon-button[data-heater-icon-id]').forEach((button) => {
            const semanticId = button.dataset.heaterIconId;
            if (!semanticId) return;

            const img = button.querySelector<HTMLImageElement>('img.hs-heater-type-icon');
            if (img) {
                const effectiveIcon = getEffectiveHeaterIconSrc(semanticId);
                if (effectiveIcon) {
                    img.src = effectiveIcon;
                }
            }
            button.classList.toggle('hs-heater-type-icon-override', !!getOverrideHeaterIconSrc(semanticId));
        });
    }

    static #setupQuickbarCloneLink(clone: HTMLElement, slotsSource: HTMLElement): () => void {
        const originalSlots = Array.from(slotsSource.querySelectorAll<HTMLElement>('.blueberryLoadoutSlot'));
        const cloneSlots = Array.from(clone.querySelectorAll<HTMLElement>('.blueberryLoadoutSlot'));

        // Mirror the loaded-slot border and the custom slot icon (class + inline background image,
        // set by HSAmbrosia on icon changes such as "Sync All Icons" or a pick on the game's header)
        const syncCloneSlot = (orig: HTMLElement, cloneSlot: HTMLElement | undefined) => {
            if (!cloneSlot) return;
            cloneSlot.classList.toggle('hs-rainbow-border', orig.classList.contains('hs-rainbow-border'));
            cloneSlot.classList.toggle('hs-silver-border', orig.classList.contains('hs-silver-border'));
            cloneSlot.classList.toggle('hs-ambrosia-slot', orig.classList.contains('hs-ambrosia-slot'));
            cloneSlot.style.backgroundImage = orig.style.backgroundImage;
        };

        // Initial sync from original to clone
        originalSlots.forEach((orig, i) => syncCloneSlot(orig, cloneSlots[i]));

        // Click delegation: clone slot click → loads the original slot (its success Alert dismissed)
        const onCloneClick = (event: Event) => {
            const target = (event.target as HTMLElement | null)?.closest('.blueberryLoadoutSlot') as HTMLElement | null;
            if (!target) return;
            const idx = cloneSlots.indexOf(target);
            const original = originalSlots[idx];
            if (!original) return;
            HSModuleManager.getModule<HSAmbrosia>('HSAmbrosia')?.loadLoadoutSlot(original.id, 'heaterSlotRow');
        };
        clone.addEventListener('click', onCloneClick);

        // MutationObserver: keep the clone slots in sync with the original slots
        const observer = new MutationObserver((mutations) => {
            for (const mutation of mutations) {
                const originalEl = mutation.target as HTMLElement;
                const idx = originalSlots.indexOf(originalEl);
                if (idx === -1) continue;
                syncCloneSlot(originalEl, cloneSlots[idx]);
            }
        });
        originalSlots.forEach(slot => {
            observer.observe(slot, { attributes: true, attributeFilter: ['class', 'style'] });
        });

        return () => {
            clone.removeEventListener('click', onCloneClick);
            observer.disconnect();
        };
    }

    // === Loadout Preview/Tooltip Methods ===
    static #buildLoadoutPreviewTooltip(button: HTMLElement, isHover = false): HTMLElement | null {
        const loadout = this.getLoadoutFromButton(button);
        if (!loadout) return null;

        const preview = document.createElement('div');
        preview.classList.add('hs-heater-loadout-preview');
        if (isHover) {
            preview.classList.add(HEATER_RESULT_UI_SELECTORS.previewHoverClass);
        }
        preview.style.zIndex = String(HSUI.getHighestActiveModalZIndex() + 1);

        const titleText = button.getAttribute('data-loadout-label');
        if (titleText) {
            const title = document.createElement('div');
            title.className = 'hs-heater-tooltip-title';
            title.textContent = titleText;
            preview.appendChild(title);
        }

        const content = document.createElement('div');
        content.className = 'hs-heater-tooltip-content';
        content.innerHTML = this.buildLoadoutPreviewHtml(loadout);
        preview.appendChild(content);

        return preview;
    }

    static showLoadoutPreview(button: HTMLElement): HTMLElement | null {
        this.removeLoadoutPreview();
        const preview = this.#buildLoadoutPreviewTooltip(button, true);
        if (!preview) return null;

        document.body.appendChild(preview);
        HSTooltip.place(preview, button, { placement: 'right', gutter: 0 });
        return preview;
    }

    static removeLoadoutPreview(): void {
        const existing = document.querySelector(`.hs-heater-loadout-preview.${HEATER_RESULT_UI_SELECTORS.previewHoverClass}`) as HTMLElement | null;
        if (existing && existing.parentElement) {
            existing.parentElement.removeChild(existing);
        }
    }

    static #buildLoadoutJsonTooltip(trigger: HTMLElement, isHover = false): HTMLElement | null {
        const loadout = trigger.getAttribute(HEATER_RESULT_UI_SELECTORS.dataLoadout);
        if (!loadout) return null;

        const tooltip = document.createElement('div');
        tooltip.classList.add('hs-heater-loadout-json-tooltip');
        if (isHover) {
            tooltip.classList.add(HEATER_RESULT_UI_SELECTORS.jsonTooltipHoverClass);
        }
        tooltip.style.zIndex = String(HSUI.getHighestActiveModalZIndex() + 1);

        const titleText = trigger.getAttribute('data-loadout-label');
        if (titleText) {
            const title = document.createElement('div');
            title.className = 'hs-heater-tooltip-title';
            title.textContent = titleText;
            tooltip.appendChild(title);
        }

        const content = document.createElement('div');
        content.className = 'hs-heater-tooltip-content';
        content.textContent = this.formatLoadoutJsonForTooltip(loadout);
        tooltip.appendChild(content);

        return tooltip;
    }

    static showLoadoutJsonTooltip(trigger: HTMLElement): HTMLElement | null {
        this.removeLoadoutJsonTooltip();
        const tooltip = this.#buildLoadoutJsonTooltip(trigger, true);
        if (!tooltip) return null;

        document.body.appendChild(tooltip);
        HSTooltip.place(tooltip, trigger, { placement: 'right', gutter: 0 });
        return tooltip;
    }

    static removeLoadoutJsonTooltip(): void {
        const existing = document.querySelector(`.hs-heater-loadout-json-tooltip.${HEATER_RESULT_UI_SELECTORS.jsonTooltipHoverClass}`) as HTMLElement | null;
        if (existing && existing.parentElement) {
            existing.parentElement.removeChild(existing);
        }
    }

    static formatLoadoutJsonForTooltip(loadout: string): string {
        return loadout.replace(/,/g, ',\n');
    }

    static buildLoadoutPreviewHtml(loadout: Record<string, number>): string {
        const currentGrid = this.#buildCurrentLoadoutPreviewGrid(loadout);
        if (currentGrid) return currentGrid;

        return this.#getLegacyAmbrosiaLoadoutPreviewRows()
            .map((row) => `<div class="${HEATER_RESULT_UI_SELECTORS.previewRow}">${row.map((item) => this.buildLoadoutPreviewCell(item, loadout)).join('')}</div>`)
            .join('');
    }

    static #buildCurrentLoadoutPreviewGrid(loadout: Record<string, number>): string | null {
        const source = document.getElementById('blueberryUpgradeGroups');
        if (!source?.querySelector('.blueberryUpgradeGroup')) return null;

        // The current game groups blueberry upgrades by row and keeps the
        // general upgrades in a separate column. Preserve those groups and
        // replace only the buttons' levels with the proposed build.
        const grid = source.cloneNode(true) as HTMLElement;
        grid.removeAttribute('id');
        grid.removeAttribute('hidden');
        grid.removeAttribute('style');
        grid.classList.add('hs-heater-loadout-preview-grid');

        const maxLevels = new Map(this.#ambrosiaLoadoutPreviewRows
            .flat()
            .filter((item): item is LoadoutPreviewItem => item !== null)
            .map(({ key, maxLevel }) => [key, maxLevel] as const));

        grid.querySelectorAll<HTMLElement>('.blueberryUpgrade').forEach((button) => {
            const key = button.id;
            if (!key) return;
            button.outerHTML = this.buildLoadoutPreviewCell({
                key,
                maxLevel: maxLevels.get(key),
                iconUrl: button.querySelector('img')?.getAttribute('src') ?? undefined,
            }, loadout);
        });
        grid.querySelectorAll('[id]').forEach((element) => element.removeAttribute('id'));
        return grid.outerHTML;
    }

    static #getLegacyAmbrosiaLoadoutPreviewRows(): Array<Array<LoadoutPreviewItem | null>> {
        const container = document.getElementById('blueberryUpgradeContainer');
        if (!container) return this.#ambrosiaLoadoutPreviewRows;

        // Older game versions use upgrade tiers instead of grouped grid sections.
        const maxLevels = new Map(this.#ambrosiaLoadoutPreviewRows
            .flat()
            .filter((item): item is LoadoutPreviewItem => item !== null)
            .map(({ key, maxLevel }) => [key, maxLevel] as const));

        const rows = Array.from(container.children)
            .filter((element) => element.classList.contains('blueberryUpgradeTier'))
            .map((row) => Array.from(row.children).flatMap((element): Array<LoadoutPreviewItem | null> => {
                if (element.classList.contains('ambrosiaBorder')) return [null];
                if (!element.classList.contains('blueberryUpgrade') || !element.id) return [];
                const iconUrl = element.querySelector('img')?.getAttribute('src') ?? undefined;
                return [{ key: element.id, maxLevel: maxLevels.get(element.id), iconUrl }];
            }))
            .filter((row) => row.length > 0);

        return rows.length > 0 ? rows : this.#ambrosiaLoadoutPreviewRows;
    }

    static buildLoadoutPreviewCell(item: LoadoutPreviewItem | null, loadout: Record<string, number>): string {
        if (item === null) {
            return `
                <div class="ambrosiaBorder Exalt5x1">
                    <img src="Pictures/RedAmbrosia/AmbrosiaBorders.png" alt="Border" />
                </div>
            `;
        }

        const { key, maxLevel } = item;
        const level = Number(loadout[key] ?? 0);
        const upgradeMeta = this.#loadoutUpgradeMetaMap[key as LoadoutPreviewUpgradeKey];
        const imageUrl = item.iconUrl ?? (upgradeMeta ? `Pictures/Default/${upgradeMeta.iconFile}` : null);
        if (!imageUrl) {
            return `<div class="${HEATER_RESULT_UI_SELECTORS.previewEmptyCell}"></div>`;
        }

        const imageClass = level > 0 ? 'dimmed' : 'superDimmed';
        const overlayText = level > 0 ? escapeHtml(String(level)) : '';

        const maxLevelClass = maxLevel !== undefined && level >= maxLevel
            ? 'maxBlueberryLevel' 
            : '';

        return `
            <button class="blueberryUpgrade relative-container ${HEATER_RESULT_UI_SELECTORS.previewButton}" type="button"> 
                <img src="${escapeHtml(imageUrl)}" class="${imageClass}" alt="${escapeHtml(key)}" />
                <div class="level-overlay ${maxLevelClass}">${overlayText}</div>
            </button>
        `;
    }

    static getLoadoutFromButton(button: HTMLElement): Record<string, number> | null {
        const loadout = button.getAttribute(HEATER_RESULT_UI_SELECTORS.dataLoadout);
        if (!loadout) {
            HSLogger.warn(`missing-loadout-attribute: ${JSON.stringify({ source: 'getLoadoutFromButton', elementClass: button.className })}`, this.#context);
            return null;
        }

        try {
            return JSON.parse(loadout) as Record<string, number>;
        } catch (error) {
            HSLogger.error(`loadout-parse-failed: ${JSON.stringify({ source: 'getLoadoutFromButton', loadoutPreview: loadout.slice(0, 180) })} ${String(error)}`, this.#context);
            return null;
        }
    }

    static #appendPinnedTooltipButton(tooltip: HTMLElement, target: HTMLElement): void {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'hs-heater-tooltip-pin-button';
        button.title = 'Close pinned tooltip';
        button.textContent = '📌';
        button.addEventListener('pointerdown', (event) => {
            event.stopPropagation();
        });
        button.addEventListener('click', (event) => {
            event.preventDefault();
            event.stopPropagation();
            this.#removePinnedOverlay(target);
        });
        tooltip.appendChild(button);
    }

    static #bindTooltipDrag(tooltip: HTMLElement): void {
        this.#unbindTooltipDrag(tooltip);

        const dragState = {
            pointerId: null as number | null,
            offsetX: 0,
            offsetY: 0,
            onPointerMove: null as ((event: PointerEvent) => void) | null,
            onPointerUp: null as ((event: PointerEvent) => void) | null,
            cleanup: null as (() => void) | null,
        };

        const onPointerDown = (event: PointerEvent) => {
            if (event.button !== 0) return;
            if ((event.target as HTMLElement | null)?.closest('.hs-heater-tooltip-pin-button')) return;
            tooltip.setPointerCapture(event.pointerId);
            const rect = tooltip.getBoundingClientRect();
            dragState.pointerId = event.pointerId;
            dragState.offsetX = event.clientX - rect.left;
            dragState.offsetY = event.clientY - rect.top;

            dragState.onPointerMove = (moveEvent: PointerEvent) => {
                if (moveEvent.pointerId !== dragState.pointerId) return;
                const left = Math.max(8, Math.min(window.innerWidth - tooltip.offsetWidth - 8, moveEvent.clientX - dragState.offsetX));
                const top = Math.max(8, Math.min(window.innerHeight - tooltip.offsetHeight - 8, moveEvent.clientY - dragState.offsetY));
                tooltip.style.left = `${left}px`;
                tooltip.style.top = `${top}px`;
                for (const entry of this.#pinnedOverlays.values()) {
                    if (entry.tooltip === tooltip) {
                        entry.position = { left, top };
                        break;
                    }
                }
            };

            dragState.onPointerUp = (upEvent: PointerEvent) => {
                if (upEvent.pointerId !== dragState.pointerId) return;
                tooltip.releasePointerCapture(upEvent.pointerId);
                if (dragState.onPointerMove) {
                    document.removeEventListener('pointermove', dragState.onPointerMove);
                }
                if (dragState.onPointerUp) {
                    document.removeEventListener('pointerup', dragState.onPointerUp);
                    document.removeEventListener('pointercancel', dragState.onPointerUp);
                }
                dragState.pointerId = null;
            };

            if (dragState.onPointerMove) {
                document.addEventListener('pointermove', dragState.onPointerMove);
            }
            if (dragState.onPointerUp) {
                document.addEventListener('pointerup', dragState.onPointerUp);
                document.addEventListener('pointercancel', dragState.onPointerUp);
            }
            event.preventDefault();
        };

        tooltip.addEventListener('pointerdown', onPointerDown);

        dragState.cleanup = () => {
            tooltip.removeEventListener('pointerdown', onPointerDown);
            if (dragState.onPointerMove) {
                document.removeEventListener('pointermove', dragState.onPointerMove);
            }
            if (dragState.onPointerUp) {
                document.removeEventListener('pointerup', dragState.onPointerUp);
                document.removeEventListener('pointercancel', dragState.onPointerUp);
            }
            dragState.pointerId = null;
        };

        this.#tooltipDragState.set(tooltip, dragState);
    }

    static #unbindTooltipDrag(tooltip?: HTMLElement): void {
        if (tooltip) {
            const state = this.#tooltipDragState.get(tooltip);
            if (state?.cleanup) state.cleanup();
            this.#tooltipDragState.delete(tooltip);
            return;
        }

        for (const state of this.#tooltipDragState.values()) {
            state.cleanup?.();
        }
        this.#tooltipDragState.clear();
    }

    // === Modal/Interaction/Event Methods ===
    static getResultInteractionTarget(modal: HTMLElement, event: Event): HTMLElement | null {
        const target = (event.target as HTMLElement | null)?.closest(`.${HEATER_RESULT_UI_SELECTORS.importLoadoutBtn}, .${HEATER_RESULT_UI_SELECTORS.jsonTooltipTrigger}`) as HTMLElement | null;
        if (!target || !modal.contains(target)) return null;
        return target;
    }

    static isSelfTransitionEvent(event: Event, target: HTMLElement): boolean {
        if (!(event instanceof MouseEvent)) return false;

        const related = event.relatedTarget as Node | null;
        if (!related) return false;
        if (target.contains(related)) return true;

        const hoverOverlay = this.#activeHoverOverlay;
        return hoverOverlay?.target === target && hoverOverlay.tooltip.contains(related);
    }

    static getOverlayKindFromTarget(target: HTMLElement): 'preview' | 'json' | null {
        if (target.classList.contains(HEATER_RESULT_UI_SELECTORS.importLoadoutBtn)) {
            return 'preview';
        }
        if (target.classList.contains(HEATER_RESULT_UI_SELECTORS.jsonTooltipTrigger)) {
            return 'json';
        }
        return null;
    }

    static #clearOverlayButtonBorder(): void {
        const clearTarget = (target: HTMLElement | null) => {
            if (target instanceof HTMLElement && target.classList.contains(HEATER_RESULT_UI_SELECTORS.importLoadoutBtn)) {
                target.classList.remove('hs-rainbow-border');
            }
        };

        clearTarget(this.#activeHoverOverlay?.target ?? null);
        this.#pinnedOverlays.forEach((_, target) => clearTarget(target));
    }

    static #removeHoverOverlay(): void {
        if (!this.#activeHoverOverlay) return;
        const { target, tooltip, cleanup } = this.#activeHoverOverlay;
        cleanup();
        this.#removeTooltipDescription(target, tooltip);
        tooltip.remove();
        this.#activeHoverOverlay = null;
        if (target.classList.contains(HEATER_RESULT_UI_SELECTORS.importLoadoutBtn)
            && !this.#pinnedOverlays.has(target)) {
            target.classList.remove('hs-rainbow-border');
        }
    }

    static #associateTooltip(target: HTMLElement, tooltip: HTMLElement): void {
        tooltip.id ||= `hs-heater-tooltip-${++this.#tooltipIdSequence}`;
        tooltip.setAttribute('role', 'tooltip');

        const describedBy = (target.getAttribute('aria-describedby') ?? '')
            .split(/\s+/)
            .filter(Boolean);
        if (!describedBy.includes(tooltip.id)) {
            describedBy.push(tooltip.id);
            target.setAttribute('aria-describedby', describedBy.join(' '));
        }
    }

    static #removeTooltipDescription(target: HTMLElement, tooltip: HTMLElement): void {
        if (!tooltip.id) return;
        const describedBy = (target.getAttribute('aria-describedby') ?? '')
            .split(/\s+/)
            .filter(id => id && id !== tooltip.id);
        if (describedBy.length) {
            target.setAttribute('aria-describedby', describedBy.join(' '));
        } else {
            target.removeAttribute('aria-describedby');
        }
    }

    static #removePinnedOverlay(target: HTMLElement): void {
        const entry = this.#pinnedOverlays.get(target);
        if (!entry) return;
        this.#unbindTooltipDrag(entry.tooltip);
        this.#removeTooltipDescription(target, entry.tooltip);
        entry.tooltip.remove();
        this.#pinnedOverlays.delete(target);
        if (target.classList.contains(HEATER_RESULT_UI_SELECTORS.importLoadoutBtn)) {
            target.classList.remove('hs-rainbow-border');
        }
    }

    static #clearPinnedOverlays(): void {
        for (const target of Array.from(this.#pinnedOverlays.keys())) {
            this.#removePinnedOverlay(target);
        }
    }

    static clearAllOverlays(): void {
        this.#clearOverlayButtonBorder();
        this.#removeHoverOverlay();
        this.#clearPinnedOverlays();
    }

    static showOverlayForTarget(target: HTMLElement): void {
        const kind = this.getOverlayKindFromTarget(target);
        if (!kind) return;

        const sameHover = this.#activeHoverOverlay?.target === target && this.#activeHoverOverlay.kind === kind;
        if (sameHover) return;

        this.#removeHoverOverlay();
        if (this.#pinnedOverlays.has(target)) return;

        const tooltip = kind === 'preview'
            ? this.showLoadoutPreview(target)
            : this.showLoadoutJsonTooltip(target);
        if (!tooltip) return;

        this.#associateTooltip(target, tooltip);
        const onTooltipLeave = (event: MouseEvent) => {
            const related = event.relatedTarget;
            if (related instanceof Node && target.contains(related)) return;
            this.hideOverlayForTarget(target);
        };
        tooltip.addEventListener('mouseleave', onTooltipLeave);
        this.#activeHoverOverlay = {
            target,
            kind,
            tooltip,
            cleanup: () => tooltip.removeEventListener('mouseleave', onTooltipLeave),
        };
        if (target.classList.contains(HEATER_RESULT_UI_SELECTORS.importLoadoutBtn)) {
            target.classList.add('hs-rainbow-border');
        }
    }

    static hideOverlayForTarget(target: HTMLElement): void {
        if (this.#activeHoverOverlay?.target !== target) return;
        this.#removeHoverOverlay();
    }

    static #createPinnedTooltip(target: HTMLElement, kind: 'preview' | 'json'): HTMLElement | null {
        const tooltip = kind === 'preview'
            ? this.#buildLoadoutPreviewTooltip(target)
            : this.#buildLoadoutJsonTooltip(target);
        if (!tooltip) return null;

        document.body.appendChild(tooltip);
        HSTooltip.place(tooltip, target, { placement: 'right' });
        return tooltip;
    }

    static #pinTooltip(target: HTMLElement, kind: 'preview' | 'json', tooltip: HTMLElement): void {
        const rect = tooltip.getBoundingClientRect();
        this.#associateTooltip(target, tooltip);
        tooltip.setAttribute('role', 'dialog');
        tooltip.setAttribute('aria-label', target.getAttribute('data-loadout-label') ?? 'Loadout details');
        tooltip.classList.add('hs-heater-tooltip-pinned');
        this.#appendPinnedTooltipButton(tooltip, target);
        this.#bindTooltipDrag(tooltip);
        this.#pinnedOverlays.set(target, {
            kind,
            tooltip,
            position: { left: rect.left, top: rect.top },
        });
        if (target.classList.contains(HEATER_RESULT_UI_SELECTORS.importLoadoutBtn)) {
            target.classList.add('hs-rainbow-border');
        }
    }

    static #togglePinnedOverlay(target: HTMLElement): void {
        const kind = this.getOverlayKindFromTarget(target);
        if (!kind) return;

        if (this.#pinnedOverlays.has(target)) {
            this.#removePinnedOverlay(target);
            return;
        }

        if (this.#activeHoverOverlay?.target === target && this.#activeHoverOverlay.kind === kind) {
            const tooltip = this.#activeHoverOverlay.tooltip;
            this.#activeHoverOverlay.cleanup();
            tooltip.classList.remove(HEATER_RESULT_UI_SELECTORS.previewHoverClass, HEATER_RESULT_UI_SELECTORS.jsonTooltipHoverClass);
            this.#activeHoverOverlay = null;
            this.#pinTooltip(target, kind, tooltip);
            return;
        }

        const tooltip = this.#createPinnedTooltip(target, kind);
        if (!tooltip) return;
        this.#pinTooltip(target, kind, tooltip);
    }

    static toggleResultInteractionOverlay(target: HTMLElement, show: boolean): void {
        const keepSelected = show || this.#pinnedOverlays.has(target);
        if (target.classList.contains(HEATER_RESULT_UI_SELECTORS.importLoadoutBtn)) {
            target.classList.toggle('hs-rainbow-border', keepSelected);
        }

        if (show) {
            this.showOverlayForTarget(target);
        } else {
            this.hideOverlayForTarget(target);
        }
    }

    static attachResultModalHandlers(modalId: string): void {
        const modal = document.getElementById(modalId);
        if (!modal) return;

        if (this.#attachedModalHandlers.has(modal)) {
            HSLogger.warn(`modal-handlers-already-attached: ${JSON.stringify({ modalId })}`, this.#context);
            return;
        }

        const onClick = async (event: Event) => {
            const button = (event.target as HTMLElement | null)?.closest(`.${HEATER_RESULT_UI_SELECTORS.copyLoadoutBtn}, .${HEATER_RESULT_UI_SELECTORS.importLoadoutBtn}`) as HTMLElement | null;
            if (!button) return;

            const loadout = button.getAttribute(HEATER_RESULT_UI_SELECTORS.dataLoadout);
            if (!loadout) {
                HSLogger.warn(`missing-loadout-attribute: ${JSON.stringify({ source: 'attachResultModalHandlers:onClick', elementClass: button.className })}`, this.#context);
                return;
            }

            this.clearAllOverlays();

            if (button.classList.contains(HEATER_RESULT_UI_SELECTORS.copyLoadoutBtn)) {
                void this.copyLoadoutToClipboard(loadout);
                return;
            }
            if (button.classList.contains(HEATER_RESULT_UI_SELECTORS.importLoadoutBtn)) {
                const ambrosiaModule = HSModuleManager.getModule<HSAmbrosia>('HSAmbrosia');
                if (!ambrosiaModule) return;
                await ambrosiaModule.importLoadoutToActiveSlot(loadout);
            }
        };

        const onImportButtonContextMenu = (event: Event) => {
            const button = (event.target as HTMLElement | null)?.closest(`.${HEATER_RESULT_UI_SELECTORS.importLoadoutBtn}`) as HTMLElement | null;
            if (!button) return;

            const mouseEvent = event as MouseEvent;
            if (mouseEvent.button !== 2) return;

            const loadout = button.getAttribute(HEATER_RESULT_UI_SELECTORS.dataLoadout);
            if (!loadout) {
                HSLogger.warn(`missing-loadout-attribute: ${JSON.stringify({ source: 'attachResultModalHandlers:onImportButtonContextMenu', elementClass: button.className })}`, this.#context);
                return;
            }

            event.preventDefault();
            event.stopPropagation();
            this.#togglePinnedOverlay(button);
        };

        const onIconButtonClick = (event: Event) => {
            const button = (event.target as HTMLElement | null)?.closest('.hs-heater-type-icon-button') as HTMLElement | null;
            if (!button || !modal.contains(button)) return;

            const semanticId = button.dataset.heaterIconId;
            if (!semanticId) return;

            const mouseEvent = event as MouseEvent;
            if (!mouseEvent.altKey) return;

            event.preventDefault();
            event.stopPropagation();
            this.#iconPicker.start(semanticId);
        };

        const onIconButtonContextMenu = (event: Event) => {
            const button = (event.target as HTMLElement | null)?.closest('.hs-heater-type-icon-button') as HTMLElement | null;
            if (!button || !modal.contains(button)) return;

            const semanticId = button.dataset.heaterIconId;
            if (!semanticId) return;

            event.preventDefault();
            event.stopPropagation();
            clearHeaterIconOverride(semanticId);
            this.#refreshHeaterResultIconButtons(modal);
            HSUI.Notify('Heater result icon override cleared.', { notificationType: 'default' });
        };

        const onEscape = (event: KeyboardEvent) => {
            if (event.key !== 'Escape') return;
            if (this.#pinnedOverlays.size === 0) return;
            event.preventDefault();
            this.#clearPinnedOverlays();
        };

        const onShowOverlay = (event: Event) => {
            const target = this.getResultInteractionTarget(modal, event);
            if (!target || this.isSelfTransitionEvent(event, target)) return;
            this.toggleResultInteractionOverlay(target, true);
        };

        const onHideOverlay = (event: Event) => {
            const target = this.getResultInteractionTarget(modal, event);
            if (!target || this.isSelfTransitionEvent(event, target)) return;
            this.toggleResultInteractionOverlay(target, false);
        };

        const onApplyRoutingClick = (event: Event) => {
            const button = (event.target as HTMLElement | null)?.closest('.hs-heater-apply-routing-btn') as HTMLElement | null;
            if (!button || !modal.contains(button)) return;

            const blue = Number(button.dataset.blueRouting);
            const red = Number(button.dataset.redRouting);
            if (this.applyPurpleReactorRouting(blue, red)) {
                HSUI.Notify(`Purple Reactor routing set to Blue ${blue}% / Red ${red}%.`, { position: 'top', notificationType: 'success' });
            } else {
                HSUI.Notify('Could not find the Purple Reactor routing sliders.', { position: 'top', notificationType: 'error' });
            }
        };

        modal.addEventListener('click', onClick);
        modal.addEventListener('click', onApplyRoutingClick);
        modal.addEventListener('mouseover', onShowOverlay);
        modal.addEventListener('mouseout', onHideOverlay);
        modal.addEventListener('focusin', onShowOverlay);
        modal.addEventListener('focusout', onHideOverlay);
        modal.addEventListener('click', onIconButtonClick);
        modal.addEventListener('contextmenu', onImportButtonContextMenu);
        modal.addEventListener('contextmenu', onIconButtonContextMenu);
        window.addEventListener('keydown', onEscape);

        const detach = () => {
            modal.removeEventListener('click', onClick);
            modal.removeEventListener('click', onApplyRoutingClick);
            modal.removeEventListener('mouseover', onShowOverlay);
            modal.removeEventListener('mouseout', onHideOverlay);
            modal.removeEventListener('focusin', onShowOverlay);
            modal.removeEventListener('focusout', onHideOverlay);
            modal.removeEventListener('click', onIconButtonClick);
            modal.removeEventListener('contextmenu', onImportButtonContextMenu);
            modal.removeEventListener('contextmenu', onIconButtonContextMenu);
            window.removeEventListener('keydown', onEscape);
            this.#attachedModalHandlers.delete(modal);
            HSLogger.warn(`modal-handlers-detached: ${JSON.stringify({ modalId })}`, this.#context);
        };

        this.#attachedModalHandlers.set(modal, {
            onClick,
            onShowOverlay,
            onHideOverlay,
            onEscape,
            detach,
        });

        this.populateResultsHeader(modal);
        this.#refreshHeaterResultIconButtons(modal);
    }

    static detachResultModalHandlers(modal: HTMLElement): void {
        const handlers = this.#attachedModalHandlers.get(modal);
        if (!handlers) return;
        handlers.detach();
    }

    static clearResultModalResources(): void {
        this.clearAllOverlays();
        this.#quickbarCloneCleanup?.();
        this.#quickbarCloneCleanup = null;
    }

    /**
     * Sets the game's Purple Reactor routing sliders. SynergismOfficial
     * (EventListeners.ts registerPurpleReactantSlider) reads a slider's value
     * on 'input', so dispatching it applies the setting like a player drag.
     */
    static applyPurpleReactorRouting(bluePercent: number, redPercent: number): boolean {
        const blueSlider = document.getElementById('ambrosiaBarPointPercentageSlider') as HTMLInputElement | null;
        const redSlider = document.getElementById('redAmbrosiaBarPointPercentageSlider') as HTMLInputElement | null;
        if (!blueSlider || !redSlider || !Number.isFinite(bluePercent) || !Number.isFinite(redPercent)) return false;

        for (const [slider, percent] of [[blueSlider, bluePercent], [redSlider, redPercent]] as const) {
            slider.value = String(percent);
            slider.dispatchEvent(new Event('input', { bubbles: true }));
        }
        return true;
    }

    // === Async/Clipboard/Game Import Methods ===
    static async copyLoadoutToClipboard(loadout: string): Promise<void> {
        try {
            await navigator.clipboard.writeText(loadout);
            HSUI.Notify('Loadout copied to clipboard.', { position: 'top', notificationType: 'success' });
        } catch (error) {
            HSLogger.error(`clipboard-write-failed: ${JSON.stringify({ source: 'copyLoadoutToClipboard', loadoutPreview: loadout.slice(0, 180) })} ${String(error)}`, this.#context);
            HSUI.Notify('Failed to copy loadout to clipboard.', { position: 'top', notificationType: 'error' });
        }
    }
}
