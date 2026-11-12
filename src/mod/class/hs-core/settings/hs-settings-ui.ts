import { HSSettingBase, HSSettingControl, HSSettingControlGroup, HSSettingControlPage, HSSettingRecord, HSSettingsDefinition, HSSettingType } from "../../../types/module-types/hs-settings-types";
import { HSModuleRegistry } from "../module/hs-module-registry";

import { HSUI } from "../hs-ui";
import { HSGlobal } from "../hs-global";
import { HSUIC } from "../hs-ui-components";
import { HSInputType, HSUICSelectOption } from "../../../types/module-types/hs-ui-types";
import { HSLogger } from "../hs-logger";
import { HSPlatform } from "../hs-platform";
import { HSSetting, paintSettingSwitch } from "./hs-setting";
import { HSSettings } from "./hs-settings";
import { HSStrategyManager } from "../../hs-modules/hs-autosing/hs-strategy-manager";
import { HSUtils } from "../../hs-utils/hs-utils";
import { HSIcons } from "../../hs-utils/hs-icons";
import sIconB64 from "inline:../../../resource/txt/s_icon.txt";
import { escapeLogText } from '../../hs-utils/hs-escape';
import { initializeSettingActions } from './hs-settings-state';

type HSSettingBaseWithHidden<T extends HSSettingType> = HSSettingBase<T> & { hidden?: boolean };

interface NativeGameTab extends HTMLButtonElement {
    makeRemoveable(): NativeGameTab;
    canBeRemoved(): boolean;
    toggleHidden(): void;
    isHidden(): boolean;
    showCloseButton(): void;
}

interface NativeGameTabRow extends HTMLDivElement {
    getSubs(): NativeGameTab[];
    isEditing(): boolean;
}

export interface HSSettingsUIDependencies {
    settingsParsed: boolean;
    settings: HSSettingRecord;
    settingsControlGroups: Record<string, HSSettingControlGroup>;
    settingsControlPages: Record<string, HSSettingControlPage>;
    settingChangeDelegate: (e: Event, settingObj: HSSetting<HSSettingType>) => Promise<void>;
}

export class HSSettingsUI {
    static readonly #context = 'HSSettingsUI';
    static #nativeTabPreferenceObserver: MutationObserver | null = null;
    static #nativeTabClickListenerInstalled = false;

    // The numbers the Auto-Sing Advanced "Reset to default" button puts back
    static readonly #autosingAdvancedSettings = [
        'autosing3to6DCubeOpeningPercent',
        'autosingTessBuildingAutoBuyPercent',
        'autosingAutoChallTimerStart',
        'autosingAutoChallTimerExit',
        'autosingAutoChallTimerEnter',
    ] as const;
    static #advancedResetTimer: ReturnType<typeof setTimeout> | undefined;

    static async syncSettings(deps: HSSettingsUIDependencies): Promise<void> {
        HSLogger.log(`Syncing mod settings`, this.#context);

        if (!deps.settingsParsed) {
            HSLogger.error(`Could not sync settings - settings not parsed yet`, this.#context);
            return;
        }

        await initializeSettingActions(Object.values(deps.settings), settingObj => {
            const setting = settingObj.getDefinition();
            const controlSettings = settingObj.hasControls() ? setting.settingControl : undefined;

            if (!controlSettings) return;

            this.#fillControl(settingObj, controlSettings);

            const controlType = controlSettings.controlType;
            const controlElement = document.querySelector(`#${controlSettings.controlId}`) as HTMLElement | null;

            if (controlElement) {
                if (controlType === "text" || controlType === "number" || controlType === "select") {
                    controlElement.onchange = async (e) => { await deps.settingChangeDelegate(e, settingObj); };
                    if (controlSettings.controlId === 'hs-setting-hidden-vanilla-tabs') {
                        this.#enableClickToggleSelection(controlElement as HTMLSelectElement);
                    }
                } else if (controlType === "button") {
                    controlElement.onclick = async (e) => { await deps.settingChangeDelegate(e, settingObj); };
                }
            }

            if (controlSettings.controlEnabledId) {
                const toggleElement = document.querySelector(`#${controlSettings.controlEnabledId}`) as HTMLDivElement | null;
                if (toggleElement) {
                    toggleElement.onclick = (e) => {
                        e.preventDefault();
                        e.stopImmediatePropagation();
                        settingObj.handleToggle();
                    };
                }
            }
        });

        HSLogger.log(`Finished syncing mod settings`, this.#context);
        this.applyHiddenVanillaTabsSetting();
        this.#initializeNativeTabPreferenceSync();
    }

    static #enableClickToggleSelection(selectElement: HTMLSelectElement): void {
        selectElement.onmousedown = (event) => {
            if (event.button !== 0 || !(event.target instanceof HTMLOptionElement)) return;

            event.preventDefault();
            const previousScrollTop = selectElement.scrollTop;

            const clickedOption = event.target;
            if (clickedOption.value === '') {
                for (const option of Array.from(selectElement.options)) option.selected = false;
            } else {
                clickedOption.selected = !clickedOption.selected;
                const noneOption = Array.from(selectElement.options).find((option) => option.value === '');
                if (noneOption) noneOption.selected = false;
            }

            selectElement.dispatchEvent(new Event('change', { bubbles: true }));

            // Updating the game tabs can refresh this control. Preserve the user's
            // place in the list instead of jumping to the first selected option.
            const restoreScrollPosition = () => { selectElement.scrollTop = previousScrollTop; };
            restoreScrollPosition();
            queueMicrotask(restoreScrollPosition);
            window.requestAnimationFrame(restoreScrollPosition);
        };
    }

    static refreshSettingControls(settingNames: string[]): void {
        const deps = HSSettings.getUIDependencies();
        if (!deps.settingsParsed) {
            HSLogger.error(`Could not refresh setting controls - settings not parsed yet`, this.#context);
            return;
        }

        for (const settingName of settingNames) {
            const settingObj = deps.settings[settingName as keyof HSSettingsDefinition] as HSSetting<HSSettingType> | undefined;
            if (!settingObj) continue;

            const controlSettings = settingObj.hasControls() ? settingObj.getDefinition().settingControl : undefined;
            if (controlSettings) this.#fillControl(settingObj, controlSettings);
        }
    }

    /** Writes a setting's value, input attributes and ✓/✗ into its panel controls; binds no handler. */
    static #fillControl(settingObj: HSSetting<HSSettingType>, controlSettings: HSSettingControl): void {
        const setting = settingObj.getDefinition();
        const controlType = controlSettings.controlType;
        const controlOptions = controlSettings.controlOptions;
        const targetValue = settingObj.getValue();
        const stringValue = HSUtils.asString(targetValue);

        if (controlType === 'text' || controlType === 'number') {
            const valueElement = document.querySelector(`#${controlSettings.controlId}`) as HTMLInputElement | null;
            if (valueElement) {
                if (controlType === 'number' && controlOptions) {
                    if ('min' in controlOptions) valueElement.setAttribute('min', controlOptions.min!.toString());
                    if ('max' in controlOptions) valueElement.setAttribute('max', controlOptions.max!.toString());
                    if ('step' in controlOptions) valueElement.setAttribute('step', controlOptions.step!.toString());
                } else if (controlType === 'text' && controlOptions) {
                    if ('placeholder' in controlOptions) valueElement.setAttribute('placeholder', controlOptions.placeholder!);
                }
                valueElement.value = stringValue;
            }
        } else if (controlType === 'select') {
            const selectElement = document.querySelector(`#${controlSettings.controlId}`) as HTMLSelectElement | null;
            if (selectElement) {
                if (selectElement.multiple) {
                    const previousScrollTop = selectElement.scrollTop;
                    const values = Array.isArray(targetValue) ? targetValue.map((v) => HSUtils.asString(v)) : [];
                    for (const option of Array.from(selectElement.options)) {
                        option.selected = values.includes(option.value);
                    }
                    selectElement.scrollTop = previousScrollTop;
                    queueMicrotask(() => { selectElement.scrollTop = previousScrollTop; });
                    window.requestAnimationFrame(() => { selectElement.scrollTop = previousScrollTop; });
                } else {
                    const optionExists = Array.from(selectElement.options).some((option) => option.value === stringValue);
                    if (optionExists) {
                        selectElement.value = stringValue;
                    } else {
                        selectElement.value = '';
                        HSLogger.warn(escapeLogText(`Setting value ${stringValue} does not exist in select options for setting ${setting.settingName}`), this.#context);
                    }
                }
            }
        }

        if (controlSettings.controlEnabledId) {
            const toggleElement = document.querySelector(`#${controlSettings.controlEnabledId}`) as HTMLDivElement | null;
            if (toggleElement) paintSettingSwitch(toggleElement, setting.enabled);
        }
    }

    static applyHiddenVanillaTabsSetting(): void {
        const setting = HSSettings.getSetting('hiddenVanillaTabs');
        if (!setting) return;

        const hiddenVanillaTabs = setting.getValue();
        if (!Array.isArray(hiddenVanillaTabs)) return;

        const tabRow = this.#getNativeGameTabRow();
        if (!tabRow) return;
        this.#ensurePseudoCoinsTabToggle(tabRow);

        const tabs = tabRow.getSubs();
        for (const tab of tabs) {
            const shouldHide = hiddenVanillaTabs.includes(tab.id);
            if (tab.isHidden() !== shouldHide) tab.toggleHidden();
        }

        // The game normally removes hidden tabs when edit mode closes. Settings
        // can be applied outside edit mode, so rebuild the visible row here while
        // retaining every tab in the game's private ordered list.
        if (!tabRow.isEditing()) {
            tabRow.replaceChildren(...tabs.filter((tab) => !tab.isHidden()));
        }
    }

    static #ensurePseudoCoinsTabToggle(tabRow: NativeGameTabRow): void {
        const pseudoCoinsTab = tabRow.getSubs().find((tab) => tab.id === 'pseudoCoinstab');
        if (!pseudoCoinsTab || pseudoCoinsTab.canBeRemoved()) return;

        pseudoCoinsTab.makeRemoveable();
        if (tabRow.isEditing()) pseudoCoinsTab.showCloseButton();
    }

    static #initializeNativeTabPreferenceSync(): void {
        const tabRow = this.#getNativeGameTabRow();
        if (!tabRow) return;

        if (!this.#nativeTabClickListenerInstalled) {
            this.#nativeTabClickListenerInstalled = true;
            document.addEventListener('click', (event) => {
                const target = event.target;
                if (!(target instanceof Element)) return;

                const nativeToggle = target.closest('.tabCloseButton');
                if (!nativeToggle?.closest('#tabrow')) return;

                // The capture listener runs before the game's handler, so read the
                // resulting native state on the next task.
                window.setTimeout(() => this.#syncHiddenVanillaTabsFromNativeDOM(), 0);
            }, true);
        }

        this.#nativeTabPreferenceObserver?.disconnect();
        this.#nativeTabPreferenceObserver = new MutationObserver((mutations) => {
            if (mutations.some((mutation) => mutation.type === 'attributes')) {
                this.#syncHiddenVanillaTabsFromNativeDOM();
            }
        });
        this.#nativeTabPreferenceObserver.observe(tabRow, {
            attributes: true,
            subtree: true,
            attributeFilter: ['aria-pressed', 'class'],
        });
    }

    static #syncHiddenVanillaTabsFromNativeDOM(): void {
        const setting = HSSettings.getSetting('hiddenVanillaTabs');
        if (!setting) return;

        const currentValue = setting.getValue();
        if (!Array.isArray(currentValue)) return;

        const tabRow = this.#getNativeGameTabRow();
        if (!tabRow) return;
        this.#ensurePseudoCoinsTabToggle(tabRow);

        const hiddenTabs = tabRow.getSubs()
            .filter((tab) => tab.isHidden())
            .map((tab) => tab.id);

        const currentTabs = currentValue.filter((tabId) => tabId !== '');
        const currentTabSet = new Set(currentTabs);
        if (currentTabSet.size === hiddenTabs.length
            && hiddenTabs.every((tabId) => currentTabSet.has(tabId))) return;

        setting.setValue(hiddenTabs);
        this.refreshSettingControls(['hiddenVanillaTabs']);
    }

    static #getNativeGameTabRow(): NativeGameTabRow | null {
        const tabRow = document.getElementById('tabrow') as Partial<NativeGameTabRow> | null;
        if (!tabRow
            || typeof tabRow.getSubs !== 'function'
            || typeof tabRow.isEditing !== 'function') return null;

        return tabRow as NativeGameTabRow;
    }

    static filterLoadoutSelectOptions(options: HSUICSelectOption[], maxLoadouts: number): HSUICSelectOption[] {
        return options.filter((option) => {
            const valueRaw = option.value;

            if (valueRaw === "" || String(valueRaw).toLowerCase() === "none")
                return true;

            const parsed = parseInt(String(valueRaw), 10);
            if (Number.isInteger(parsed)) {
                if (parsed <= 0) return false;
                if (parsed > maxLoadouts) return false;
                return true;
            }
            return true;
        });
    }

    static refreshAmbrosiaLoadoutDropdowns(): void {
        const getSettings = HSSettings.getSettings;
        const ambrosiaMod = HSModuleRegistry.getModule('HSAmbrosia');
        if (!ambrosiaMod) {
            HSLogger.warn(`HSAmbrosia module not found. Dropdown lists for Ambrosia loadouts defaulted to 16.`, HSSettingsUI.#context);
            return;
        }

        const count = ambrosiaMod.getAmbrosiaLoadoutsAmount();
        const maxLoadouts = count > 0 ? count : 16;

        for (const setting of Object.values(getSettings())) {
            const control = setting.getDefinition().settingControl;
            if (!control || !control.selectOptions) continue;
            if (!control.selectOptions.some((option) => /loadout\s*\d+/i.test(option.text))) continue;

            const filtered = this.filterLoadoutSelectOptions(control.selectOptions, maxLoadouts);
            control.selectOptions = filtered;

            const currentValue = setting.getValue();
            if (currentValue && currentValue !== '' && !filtered.some(opt => String(opt.value) === String(currentValue))) {
                setting.setValue('');
            }

            const htmlSelect = document.querySelector(`#${control.controlId}`) as HTMLSelectElement | null;
            if (htmlSelect) {
                htmlSelect.innerHTML = '';
                for (const option of filtered) {
                    const opt = document.createElement('option');
                    opt.value = String(option.value);
                    opt.text = option.text;
                    if (String(option.value) === String(currentValue)) {
                        opt.selected = true;
                    }
                    htmlSelect.appendChild(opt);
                }
            }
        }
    }

    /** Fills the mod panel's Settings tab (tab 3) and binds its subtabs. */
    static buildTab(hsui: HSUI, deps: HSSettingsUIDependencies): void {
        const settingsTabContents = this.autoBuildSettingsUI(deps);

        if (!settingsTabContents.didBuild) return;

        hsui.replaceTabContents(3,
            [settingsTabContents.navHTML, settingsTabContents.pagesHTML].join('')
        );

        this.#bindTabEvents();
    }

    static #bindTabEvents() {
        document.addEventListener('click', (e) => {
            if (!(e.target instanceof Element)) return;
            if (e.target.closest('.hs-panel-setting-block-gamedata-icon')) this.#handleGameDataIconClick();
            if (e.target.closest('.hs-panel-subtab')) this.#handleSubtabClick(e);
        });
    }

    static #handleGameDataIconClick() {
        const subtab = document.querySelector('#hs-panel-settings-subtab-qol') as HTMLDivElement | null;
        const color = subtab?.dataset.color;

        this.#activateSubtab('qol', subtab, color);

        // The GDS setting opens the page: scrolling to the block itself would leave it under the sticky subtabs
        document.querySelector('#hs-settings-panel')?.scrollTo({ top: 0, behavior: 'smooth' });
    }

    static #handleSubtabClick(e: Event) {
        const target = (e.target as HTMLElement).closest('.hs-panel-subtab') as HTMLDivElement | null;
        const subtab = target?.dataset.subtab;
        const color = target?.dataset.color;

        if (!subtab) return;
        this.#activateSubtab(subtab, target, color);
    }

    static #activateSubtab(subtab: string, activeTab: HTMLDivElement | null, color?: string) {
        const subSettingsContainer = document.querySelector(`#settings-grid-${subtab}`) as HTMLDivElement | null;
        const allSubSettingContainers = document.querySelectorAll('.hs-panel-settings-grid') as NodeListOf<HTMLDivElement>;
        const allSubTabs = document.querySelectorAll('.hs-panel-subtab') as NodeListOf<HTMLDivElement>;

        if (!subSettingsContainer) return;

        // The subtabs stay visible while scrolled: another page opens at its top, not at the old position
        if (!subSettingsContainer.classList.contains('open')) {
            const settingsPanel = document.querySelector('#hs-settings-panel');
            if (settingsPanel) settingsPanel.scrollTop = 0;
        }

        allSubSettingContainers.forEach(container => container.classList.remove('open'));
        allSubTabs.forEach(subTab => subTab.style.backgroundColor = '');

        subSettingsContainer.classList.add('open');
        if (activeTab && color) {
            activeTab.style.backgroundColor = color;
        }
    }

    static autoBuildSettingsUI(deps: HSSettingsUIDependencies): { didBuild: boolean; navHTML: string; pagesHTML: string } {
        if (!deps.settingsParsed) {
            HSLogger.error(`Could not build settings UI - settings not parsed yet`, this.#context);
            return { didBuild: false, navHTML: '', pagesHTML: '' };
        }

        const sortedSettings = this.#sortSettingsByControlGroup(deps.settings, deps.settingsControlGroups);
        const sortedPages = this.#sortPagesByOrder(deps.settingsControlPages);
        const navHTML = this.#buildSubTabNav(sortedPages, sortedSettings);
        const { didBuild, pagesHTML } = this.#buildPagesHTML(sortedSettings, deps.settingsControlGroups);

        return {
            didBuild,
            navHTML,
            pagesHTML: Array.from(pagesHTML.values()).flat().join('')
        };
    }

    static #sortSettingsByControlGroup(
        settings: HSSettingRecord,
        controlGroups: Record<string, HSSettingControlGroup>,
    ): [string, HSSetting<HSSettingType>][] {
        return Object.entries(settings).sort((a, b) => {
            const aControlGroup = a[1].getDefinition().settingControl?.controlGroup;
            const bControlGroup = b[1].getDefinition().settingControl?.controlGroup;

            if (aControlGroup && bControlGroup) {
                return (controlGroups[aControlGroup].order || 0) - (controlGroups[bControlGroup].order || 0);
            } else if (aControlGroup) {
                return -1;
            } else if (bControlGroup) {
                return 1;
            }
            return 0;
        });
    }

    static #sortPagesByOrder(pages: Record<string, HSSettingControlPage>): [string, HSSettingControlPage][] {
        return Object.entries(pages).sort((a, b) => {
            const aPage = a[1].order;
            const bPage = b[1].order;

            if (aPage && bPage) {
                return (aPage || 0) - (bPage || 0);
            } else if (aPage) {
                return -1;
            } else if (bPage) {
                return 1;
            }
            return 0;
        });
    }

    static #buildSubTabNav(
        sortedPages: [string, HSSettingControlPage][],
        sortedSettings: [string, HSSetting<HSSettingType>][],
    ): string {
        const subTabs: string[] = [];

        for (const [key, page] of sortedPages) {
            const haveAnySettingsForPage = sortedSettings.some(([, settingObj]) => {
                const setting = settingObj.getDefinition() as HSSettingBaseWithHidden<HSSettingType>;
                return setting.settingControl?.controlPage === key && this.#isShownInPanel(setting);
            });
            if (!haveAnySettingsForPage) continue;

            subTabs.push(HSUIC.Div({
                class: 'hs-panel-subtab',
                id: `hs-panel-settings-subtab-${key}`,
                data: new Map([['subtab', key], ['color', page.pageSelectedColor]]),
                props: {
                    style: page.pageColor ? `--hs-panel-subtab-border-color: ${page.pageColor};` : ''
                },
                html: page.pageName
            }));
        }

        return HSUIC.Div({
            class: 'hs-panel-subtabs',
            html: subTabs
        });
    }

    // Not hidden, and meant for the platform the mod was loaded on
    static #isShownInPanel(setting: HSSettingBaseWithHidden<HSSettingType>): boolean {
        if (setting.hidden === true) return false;
        return !setting.platforms || setting.platforms.includes(HSPlatform.get());
    }

    static #buildPagesHTML(
        sortedSettings: [string, HSSetting<HSSettingType>][],
        controlGroups: Record<string, HSSettingControlGroup>,
    ) {
        const pagesHTML: Map<string, string[]> = new Map();
        const sections: { page: string; header: string; blocks: { html: string; isInlineButton: boolean }[] }[] = [];
        let didBuild = true;
        let currentControlGroup: string | null = null;

        for (const [key, settingObj] of sortedSettings) {
            const setting = settingObj.getDefinition() as HSSettingBaseWithHidden<HSSettingType>;

            if (!this.#isShownInPanel(setting)) continue;

            const controls = setting.settingControl;
            if (!controls) {
                HSLogger.error(`Error autobuilding settings UI, controls not defined for setting ${key}`, this.#context);
                didBuild = false;
                break;
            }

            if (controls.controlGroup !== currentControlGroup) {
                currentControlGroup = controls.controlGroup;
                sections.push({
                    page: controls.controlPage,
                    header: HSUIC.Div({
                        class: 'hs-panel-grid-section-header',
                        html: controlGroups[controls.controlGroup].groupName
                    }),
                    blocks: []
                });
            }

            const blockHTML = this.#buildSettingBlock(settingObj, setting, controls);
            if (!blockHTML) {
                didBuild = false;
                break;
            }

            sections[sections.length - 1].blocks.push({ html: blockHTML, isInlineButton: this.#isInlineButton(controls) });
        }

        // The section's fields share a column (hs-panel-core.css)
        for (const { page, header, blocks } of sections) {
            const pageHTMLs = pagesHTML.get(page) ?? [];
            pageHTMLs.push(header, HSUIC.Div({
                class: 'hs-panel-settings-section',
                html: this.#wrapButtonRows(blocks)
            }));
            pagesHTML.set(page, pageHTMLs);
        }

        for (const [pageName, pages] of pagesHTML.entries()) {
            pagesHTML.set(pageName, [HSUIC.Div({
                class: 'hs-panel-settings-grid',
                id: `settings-grid-${pageName}`,
                html: pages
            })]);
        }

        return { didBuild, pagesHTML };
    }

    static #isInlineButton(controls: HSSettingControl): boolean {
        return controls.controlType === 'button'
            && (controls.controlGroup === 'auto-sing-strategy-controls' || controls.controlGroup === 'save-export');
    }

    // Buttons that follow each other share one row of the section's grid
    static #wrapButtonRows(blocks: { html: string; isInlineButton: boolean }[]): string[] {
        const html: string[] = [];
        let row: string[] = [];

        const closeRow = () => {
            if (row.length === 0) return;
            html.push(HSUIC.Div({ class: 'hs-panel-settings-button-row', html: row }));
            row = [];
        };

        for (const block of blocks) {
            if (block.isInlineButton) {
                row.push(block.html);
            } else {
                closeRow();
                html.push(block.html);
            }
        }
        closeRow();

        return html;
    }

    static #buildSettingBlock(
        settingObj: HSSetting<HSSettingType>,
        setting: HSSettingBaseWithHidden<HSSettingType>,
        controls: HSSettingControl,
    ): string | null {
        let gameDataIcon = "";

        if (HSSettings.usesGameData(setting)) {
            gameDataIcon = HSUIC.Image({
                class: 'hs-panel-setting-block-gamedata-icon',
                src: sIconB64,
                width: 18,
                height: 18,
                props: { title: HSGlobal.HSSettings.gameDataRequiredTooltip },
            });
        }

        const components: string[] = [];

        if (controls.controlType === 'switch') {
            components.push(this.#buildSettingTextWrapper(setting, controls, gameDataIcon));
        } else if (controls.controlType === 'button') {
            components.push(HSUIC.Button({
                id: controls.controlId!,
                text: setting.settingDescription || 'Error: No button text',
                props: setting.settingHelpText ? { title: setting.settingHelpText } : undefined
            }));
        } else {
            const convertedType = this.#resolveControlTypeInput(controls.controlType);
            if (!convertedType) {
                HSLogger.error(`Error autobuilding settings UI, control type resolution failed (how??)`, this.#context);
                return null;
            }

            components.push(this.#buildSettingTextWrapper(setting, controls, gameDataIcon));
            const valueRowChildren = this.#buildSettingValueChildren(controls, convertedType, setting);
            if (!valueRowChildren) return null;

            if (controls.controlEnabledId) {
                components.push(HSUIC.Div({
                    class: 'hs-panel-setting-block-input-row',
                    html: valueRowChildren
                }));
            } else {
                components.push(...valueRowChildren);
            }
        }

        let blockClass = 'hs-panel-setting-block';
        // A number, text or dropdown field sits on its label's line; a multi-line list stays under its label
        if (['number', 'text', 'select'].includes(controls.controlType) && !controls.props?.multiple) {
            blockClass += ' hs-panel-setting-block-inline';
        }
        if (this.#isInlineButton(controls)) {
            blockClass += ' hs-inline-button';
        }
        // The strategy buttons keep a width of their own (hs-panel-core.css)
        if (controls.controlType === 'button' && controls.controlGroup === 'auto-sing-strategy-controls') {
            blockClass += ' hs-button-group-autosing-strategy';
        }

        // A setting that belongs to another one (controlParent) is indented under its label. With
        // controlHideWhenParentOff it is hidden while the parent is off: a CSS rule on the parent's switch, which
        // the settings UI keeps marked .hs-disabled while off. An inline button sits in a row (#wrapButtonRows):
        // the row is what gets hidden, so all the buttons of a row need the flag
        let blockId = setting.settingBlockId;
        if (controls.controlParent) {
            blockClass += ' hs-panel-setting-block-child';
            blockId ??= `hs-setting-block-${setting.settingName}`;
            if (controls.controlHideWhenParentOff) {
                const parentSwitchId = HSSettings.getSetting(controls.controlParent)?.getDefinition().settingControl?.controlEnabledId;
                if (parentSwitchId) {
                    const parentOff = `.hs-panel-setting-block:has(#${parentSwitchId}.hs-disabled)`;
                    HSUI.injectStyle(`${parentOff} ~ #${blockId}, ${parentOff} ~ .hs-panel-settings-button-row:has(#${blockId}) { display: none; }`,
                        `hs-setting-child-${setting.settingName}`);
                } else {
                    HSLogger.warn(`Setting ${setting.settingName}: its parent ${controls.controlParent} has no switch, it is always shown`, this.#context);
                }
            }
        }

        return HSUIC.Div({
            id: blockId,
            class: blockClass,
            html: components
        });
    }

    static #resolveControlTypeInput(controlType: string): HSInputType | null {
        switch (controlType) {
            case 'text':
                return HSInputType.TEXT;
            case 'number':
                return HSInputType.NUMBER;
            case 'select':
                return HSInputType.SELECT;
            default:
                return null;
        }
    }

    static #buildSettingTextWrapper(setting: HSSettingBase<HSSettingType>, controls: HSSettingControl, gameDataIcon: string) {
        const children: string[] = [];
        if (controls.controlEnabledId) {
            children.push(HSUIC.Button({
                class: 'hs-panel-setting-block-btn',
                id: controls.controlEnabledId,
                text: ''
            }));
        }

        if (controls.controlAoagIcon) {
            children.push(this.#buildAoagIcon(controls.controlAoagIcon));
        }

        children.push(HSUIC.P({
            class: 'hs-panel-setting-block-text',
            props: { title: setting.settingHelpText },
            text: setting.settingDescription
        }));

        if (gameDataIcon) {
            children.push(gameDataIcon);
        }

        return HSUIC.Div({
            class: 'hs-panel-setting-block-text-wrapper',
            html: children
        });
    }

    // The game's own rune image. The path is the fallback: the settings tab can be built before the runes tab is
    static #buildAoagIcon(stage: 'pre' | 'post'): string {
        const source = document.getElementById('antiquitiesRune');
        const icon = (source ? HSIcons.fromElement(source) : null) ?? { url: 'Pictures/Runes/Antiquities.png' };

        const element = document.createElement('span');
        element.className = `hs-panel-setting-block-aoag-icon hs-panel-setting-block-aoag-${stage}`;
        element.title = stage === 'pre' ? 'Pre-AOAG' : 'Post-AOAG';
        HSIcons.applyBackground(element, icon, 18);
        return element.outerHTML;
    }

    static #buildSettingValueChildren(
        controls: HSSettingControl,
        convertedType: HSInputType,
        setting: HSSettingBase<HSSettingType>,
    ) {
        const valueRowChildren: string[] = [];

        if (convertedType === HSInputType.NUMBER || convertedType === HSInputType.TEXT) {
            valueRowChildren.push(HSUIC.Input({
                class: 'hs-panel-setting-block-num-input',
                id: controls.controlId,
                type: convertedType
            }));
        } else if (convertedType === HSInputType.SELECT) {
            // HSAutosingStrategyControls.updateStrategyDropdownList fills these options again after syncSettings.
            // This first fill stays: without it the sync finds an empty dropdown and warns at each load
            if (controls.selectOptions && controls.controlId === 'hs-setting-auto-sing-strategy') {
                const { defaultStrategiesOptions, userStrategiesOptions } = HSStrategyManager.getMergedStrategyOptions();
                controls.selectOptions.length = 0;
                controls.selectOptions.push(...defaultStrategiesOptions, ...userStrategiesOptions);
                HSLogger.log(`Merged strategy options for select input: ${controls.selectOptions.length} total options (${defaultStrategiesOptions.length} default, ${userStrategiesOptions.length} user)`, this.#context);
            }

            if (!controls.selectOptions) {
                HSLogger.error(`Error autobuilding settings UI, ${setting.settingName} does not have selectOptions defined`, this.#context);
                return null;
            }

            valueRowChildren.push(HSUIC.Select({
                class: 'hs-panel-setting-block-select-input',
                id: controls.controlId,
                type: convertedType,
                props: controls.props
            }, controls.selectOptions));
        }

        return valueRowChildren;
    }

    // A first click waits 5 s for a second one. The armed text is shorter: the button keeps its size
    static resetAutosingAdvancedSettings(): void {
        if (HSSettingsUI.#advancedResetTimer === undefined) {
            const button = HSSettingsUI.#advancedResetButton();
            if (!button) return;
            button.textContent = 'Confirm reset?';
            HSSettingsUI.#advancedResetTimer = setTimeout(() => HSSettingsUI.#disarmAdvancedReset(), 5000);
            return;
        }
        HSSettingsUI.#disarmAdvancedReset();

        // None of them has a settingAction to run
        const names = HSSettingsUI.#autosingAdvancedSettings;
        for (const name of names) {
            const value = HSSettings.getJsonSettingValue(name);
            if (typeof value !== 'number') {
                HSLogger.warn(`No default value for ${name}, left as it is`, this.#context);
                continue;
            }
            HSSettings.getSetting(name).setValue(value);
        }
        HSSettingsUI.refreshSettingControls([...names]);
        HSLogger.log('Auto-Sing Advanced settings reset to default', this.#context);
    }

    static #advancedResetButton(): HTMLElement | null {
        const id = HSSettings.getSetting('resetAutosingAdvanced').getDefinition().settingControl?.controlId;
        return id ? document.getElementById(id) : null;
    }

    static #disarmAdvancedReset(): void {
        clearTimeout(HSSettingsUI.#advancedResetTimer);
        HSSettingsUI.#advancedResetTimer = undefined;
        const button = HSSettingsUI.#advancedResetButton();
        if (button) button.textContent = HSSettings.getSetting('resetAutosingAdvanced').getDefinition().settingDescription;
    }
}
