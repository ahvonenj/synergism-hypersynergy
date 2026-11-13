import { EPredefinedPosition, HSNotification, HSNotifyColumn, HSNotifyOptions, HSPanelTabDefinition, HSUIDOMCoordinates, HSUIModalOptions, HSUIXY, HSCSSProperties } from "../../types/module-types/hs-ui-types";
import { HSUtils } from "../hs-utils/hs-utils";
import { HSIcons } from "../hs-utils/hs-icons";
import { HSElementHooker } from "./hs-elementhooker";
import { HSGlobal } from "./hs-global";
import { HSLogger } from "./hs-logger";
import { HSSettings } from "./settings/hs-settings";
import { HSModule, type HSModuleOptions } from "./module/hs-module";
import { HSUIC } from "./hs-ui-components";
import panelCoreCSS from "inline:../../resource/css/hs-panel-core.css";
import autosingModalCSS from "inline:../../resource/css/module/hs-autosing-modal.css";
import animationsCSS from "inline:../../resource/css/hs-animations.css";
import utilitiesCSS from "inline:../../resource/css/hs-utilities.css";
import panelHTML from "inline:../../resource/html/hs-panel.html";
import modPanelIcon from "../../resource/img/hs-panel-icon.png";
import { escapeLogText } from "../hs-utils/hs-escape";

/**
 * Class: HSUI
 * IsExplicitHSModule: Yes
 * Description: 
 *     UI modules for Hypersynergism.
 *     Mostly responsible for handling everything related to the mod's panel,
 *     but also contains methods such as:
 *         - injectCSS() for injecting arbitrary styles in to the DOM
 *         - injectHTML() for injecting arbitrary HTML in to the DOM
 *         - Modal() for creating and displaying custom modals
 * Author: Swiffy, Shewchou
*/
export class HSUI extends HSModule {
    static #staticContext = 'HSUI';

    #staticPanelHtml: string;
    #staticPanelCss: string;

    uiReady = false;

    #uiPanel?: HTMLDivElement;
    #uiPanelTitle?: HTMLDivElement;
    #uiPanelCloseBtn?: HTMLDivElement;
    #uiPanelMinimizeBtn?: HTMLDivElement;
    #uiPanelOpenBtn?: HTMLDivElement;
    #uiQuickAccessMenu?: HTMLDivElement;

    #loggerElement?: HTMLElement;
    #logClearBtn?: HTMLButtonElement;
    #logCopyBtn?: HTMLButtonElement;

    static #modPanelOpen = false;
    static #logTabActive = false;

    #activeModals: Set<HTMLDivElement> = new Set();
    #modalCleanup = new Map<HTMLDivElement, Array<() => void>>();
    #modalInitialDimensions = new WeakMap<HTMLDivElement, { width: string; height: string }>();
    static #modalZIndexCounter = 7000;

    static #injectedStyles = new Map<string, string>();
    static #injectedStylesHolder?: HTMLStyleElement;

    #tabHeaderCache: Map<number, HTMLDivElement> = new Map();
    #tabBodyCache: Map<number, HTMLDivElement> = new Map();
    #panelBodyCache: HTMLDivElement[] = [];

    readonly #tabConfigMap: Map<number, HSPanelTabDefinition>;

    #tabs: HSPanelTabDefinition[] = [
        {
            tabId: 1,
            tabBodySel: '.hs-panel-body-1',
            tabSel: '#hs-panel-tab-1',
            panelDisplayType: 'flex'
        },
        {
            tabId: 2,
            tabBodySel: '.hs-panel-body-2',
            tabSel: '#hs-panel-tab-2',
            panelDisplayType: 'block'
        },
        {
            tabId: 3,
            tabBodySel: '.hs-panel-body-3',
            tabSel: '#hs-panel-tab-3',
            panelDisplayType: 'block'
        },
        {
            tabId: 4,
            tabBodySel: '.hs-panel-body-4',
            tabSel: '#hs-panel-tab-4',
            panelDisplayType: 'block'
        },
        {
            tabId: 5,
            tabBodySel: '.hs-panel-body-5',
            tabSel: '#hs-panel-tab-5',
            panelDisplayType: 'block'
        }
    ];

    static #notifyBackgroundColors = {
        'default': '#192a56',
        'warning': '#cd6133',
        'error': '#b33939',
        'success': '#009432'
    };

    static #notifyMaxShown = 3;
    static #notifyMinDisplayMs = 5000;
    static #notifyDisplayMsPerCharacter = 60;

    static #notifyColumns = new Map<HSNotifyColumn, HTMLElement>();
    static #notifications: HSNotification[] = [];


    // ========================================
    // ------ Initialization / lifecycle ------
    // ========================================

    constructor(moduleOptions: HSModuleOptions) {
        super(moduleOptions);
        this.#staticPanelCss = panelCoreCSS + autosingModalCSS + animationsCSS + utilitiesCSS;
        this.#staticPanelHtml = panelHTML;
        this.#tabConfigMap = new Map(this.#tabs.map((tab) => [tab.tabId, tab]));
    }

    async init(): Promise<void> {
        HSLogger.log("Initialising HSUI module", this.context);

        await this.#initializePanelMarkup();
        await this.#initializePanelElements();
        this.#setupPanelInteractions();
        this.#setupPanelToggle();
        this.#createQuickAccessMenu();

        this.uiReady = true;
        this.isInitialized = true;
    }

    async #initializePanelMarkup(): Promise<void> {
        HSUI.#injectedStylesHolder = document.createElement('style');
        HSUI.#injectedStylesHolder.id = HSGlobal.HSUI.injectedStylesDomId;
        document.head.appendChild(HSUI.#injectedStylesHolder);

        // Inject UI panel styles
        HSUI.injectStyle(this.#staticPanelCss, 'hs-panel-css');

        // Create temp div, inject UI panel HTML and append the contents to body
        HSUI.injectHTMLString(this.#staticPanelHtml);
    }

    async #initializePanelElements(): Promise<void> {
        // Find the UI elements in DOM and store the refs
        this.#uiPanel = await HSElementHooker.RequireElement<HTMLDivElement>('#hs-panel');
        this.#uiPanelTitle = await HSElementHooker.RequireElement<HTMLDivElement>('#hs-panel-version');
        this.#uiPanelCloseBtn = await HSElementHooker.RequireElement<HTMLDivElement>('#hs-panel-close-btn');
        this.#uiPanelMinimizeBtn = await HSElementHooker.RequireElement<HTMLDivElement>('#hs-panel-minimize-btn');
        this.#loggerElement = await HSElementHooker.RequireElement('#hs-ui-log');
        this.#logClearBtn = await HSElementHooker.RequireElement<HTMLButtonElement>('#hs-ui-log-clear');
        this.#logCopyBtn = await HSElementHooker.RequireElement<HTMLButtonElement>('#hs-ui-log-copy');

        const panelHandle = await HSElementHooker.RequireElement<HTMLDivElement>('.hs-panel-header');
        const panelResizeHandle = await HSElementHooker.RequireElement<HTMLDivElement>('.hs-resizer');

        this.#makeDraggable(this.#uiPanel, panelHandle);
        panelHandle.addEventListener('mousedown', () => {
            if (this.#uiPanel) {
                this.#bringElementToFront(this.#uiPanel);
            }
        });
        this.#makeResizable(this.#uiPanel, panelResizeHandle, 300, 150);
    }

    #bringElementToFront(element: HTMLElement): void {
        HSUI.bringToFront(element);
    }

    /** Puts a mod window above the panel and every other mod window (they share one stacking order). */
    static bringToFront(element: HTMLElement): void {
        const highestZIndex = HSUI.getHighestActiveModalZIndex();
        if (element.style.zIndex && Number.parseInt(element.style.zIndex, 10) >= highestZIndex) return;
        HSUI.#modalZIndexCounter = Math.max(HSUI.#modalZIndexCounter, highestZIndex, 6999) + 1;
        element.style.zIndex = String(HSUI.#modalZIndexCounter);
    }

    static getHighestActiveModalZIndex(): number {
        const relevantElements = Array.from(document.querySelectorAll<HTMLElement>('#hs-panel, .hs-modal, #hs-autosing-timer-display'));
        let maxZ = 0;

        for (const element of relevantElements) {
            const computedZ = window.getComputedStyle(element).zIndex;
            const zIndexValue = Number.parseInt(computedZ, 10);
            if (!Number.isNaN(zIndexValue)) {
                maxZ = Math.max(maxZ, zIndexValue);
            }
        }

        return maxZ;
    }

    // Sets inline styles through a CSS transition. Resolves when every property that changes has finished,
    // or after the duration + 50 ms, whichever comes first; the element's own transition is then put back.
    static #transition(element: HTMLElement, properties: HSCSSProperties, duration = 100, timingFunction = 'linear'): Promise<void> {
        const entries = Object.entries(properties) as [string, string | number][];
        if (entries.length === 0) return Promise.resolve();

        const style = element.style;
        const originalTransition = style.transition;
        style.transition = entries.map(([prop]) => `${HSUtils.camelToKebab(prop)} ${duration}ms ${timingFunction}`).join(', ');

        return new Promise<void>((resolve) => {
            const pending = new Set<string>();
            let done = false;

            const finish = () => {
                if (done) return;
                done = true;
                clearTimeout(timeout);
                element.removeEventListener('transitionend', onEnd);
                style.transition = originalTransition;
                resolve();
            };

            // A child's transition bubbles here too
            const onEnd = (e: TransitionEvent) => {
                if (e.target !== element) return;
                pending.delete(e.propertyName);
                if (pending.size === 0) finish();
            };

            element.addEventListener('transitionend', onEnd);
            const timeout = setTimeout(finish, duration + 50);

            // Reflow, so the transition starts from the current values
            void element.offsetHeight;
            const computed = getComputedStyle(element);

            for (const [prop, value] of entries) {
                const cssProp = HSUtils.camelToKebab(prop);
                const current = computed.getPropertyValue(cssProp);
                const next = typeof value === 'number' && prop !== 'zIndex' && prop !== 'opacity' ? `${value}px` : String(value);
                // No transitionend comes for a value that doesn't change, nor from 'none' or 'auto'
                if (current && current !== 'none' && current !== 'auto' && current !== next) pending.add(cssProp);
                (style as unknown as Record<string, string | number>)[prop] = value;
            }

            if (pending.size === 0) finish();
        });
    }

    #setupPanelInteractions(): void {
        if (!this.#uiPanel) return;

        // Close button handler
        if (this.#uiPanelCloseBtn) {
            this.#uiPanelCloseBtn.addEventListener('click', () => this.#closePanel());
        }

        // Minimize button handler
        if (this.#uiPanelMinimizeBtn) {
            this.#uiPanelMinimizeBtn.addEventListener('click', () => this.#togglePanelMinimized());
        }

        if (this.#logClearBtn) {
            this.#logClearBtn.addEventListener('click', () => HSLogger.clear());
        }

        // Turn the settings on or off; their actions show or hide the lines and keep the boxes in step
        for (const [checkboxId, settingName] of [['hs-ui-log-show-ts', 'logTimestamp'], ['hs-ui-log-show-debug', 'showDebugLogs']] as const) {
            const checkbox = document.getElementById(checkboxId) as HTMLInputElement | null;
            checkbox?.addEventListener('change', () => {
                const setting = HSSettings.getSetting(settingName);
                if (checkbox.checked) setting.enable();
                else setting.disable();
            });
        }

        // The whole log, hidden lines included: it's mostly copied for a bug report
        if (this.#logCopyBtn) {
            this.#logCopyBtn.addEventListener('click', async () => {
                try {
                    await navigator.clipboard.writeText(HSLogger.getLogLines().join('\n'));
                    HSUI.Notify('Log copied to clipboard!', { notificationType: 'success' });
                } catch (err) {
                    HSLogger.error('Failed to copy log to clipboard', this.context);
                }
            });
        }

        // Bind panel controls
        this.#panelBodyCache = Array.from(document.querySelectorAll('.hs-panel-body')) as HTMLDivElement[];
        const tabs = document.querySelectorAll<HTMLDivElement>('.hs-panel-tab');

        tabs.forEach(tab => {
            tab.addEventListener('click', (e) => {
                this.#handlePanelTabClick(e.currentTarget as HTMLDivElement, tabs);
            });
        });
    }

    async #closePanel(): Promise<void> {
        if (!HSUI.#modPanelOpen || !this.#uiPanel) return;
        await HSUI.#transition(this.#uiPanel, { opacity: 0 });
        HSUI.#modPanelOpen = false;
        HSUI.#logTabActive = false;
        this.#uiPanel.classList.add('hs-panel-closed');
    }

    #isPanelMinimized(): boolean {
        return this.#uiPanel?.classList.contains('hs-minimized') ?? false;
    }

    #togglePanelMinimized(): void {
        const panel = this.#uiPanel;
        if (!panel) return;
        const panelBodies = panel.querySelectorAll('.hs-panel-body') as NodeListOf<HTMLElement>;
        const panelTabs = panel.querySelector('.hs-panel-tabs') as HTMLElement | null;
        const panelResizer = panel.querySelector('.hs-resizer') as HTMLElement | null;

        if (this.#isPanelMinimized()) {
            // Restore: show all panel bodies, tabs, and resizer
            panelBodies.forEach(body => body.style.display = '');
            if (panelTabs) panelTabs.style.display = '';
            if (panelResizer) panelResizer.style.display = '';

            const savedWidth = panel.getAttribute('data-saved-width');
            const savedHeight = panel.getAttribute('data-saved-height');
            if (savedWidth) panel.style.width = savedWidth;
            if (savedHeight) panel.style.height = savedHeight;
            panel.removeAttribute('data-saved-width');
            panel.removeAttribute('data-saved-height');

            panel.classList.remove('hs-minimized');
            if (this.#uiPanelMinimizeBtn) this.#uiPanelMinimizeBtn.textContent = '_';
        } else {
            // Clamp left border to page before minimizing
            const panelRect = panel.getBoundingClientRect();
            if (panelRect.left < 0) {
                panel.style.left = '0px';
            }
            // Minimize: hide all panel bodies, tabs, and resizer
            panelBodies.forEach(body => body.style.display = 'none');
            if (panelTabs) panelTabs.style.display = 'none';
            if (panelResizer) panelResizer.style.display = 'none';

            const computedPanelStyle = window.getComputedStyle(panel);
            panel.setAttribute('data-saved-width', computedPanelStyle.width);
            panel.setAttribute('data-saved-height', computedPanelStyle.height);
            panel.style.width = 'auto';
            panel.style.height = 'auto';

            panel.classList.add('hs-minimized');
            if (this.#uiPanelMinimizeBtn) this.#uiPanelMinimizeBtn.textContent = '+';
        }
    }

    // True when a mod window drawn above the panel overlaps it
    #isPanelCovered(): boolean {
        const panel = this.#uiPanel;
        if (!panel) return false;
        const panelZ = Number.parseInt(window.getComputedStyle(panel).zIndex, 10) || 0;
        const panelRect = panel.getBoundingClientRect();

        return Array.from(document.querySelectorAll<HTMLElement>('.hs-modal')).some(modal => {
            const style = window.getComputedStyle(modal);
            if (style.display === 'none' || style.visibility === 'hidden') return false;
            if ((Number.parseInt(style.zIndex, 10) || 0) <= panelZ) return false;
            const rect = modal.getBoundingClientRect();
            return rect.left < panelRect.right && rect.right > panelRect.left
                && rect.top < panelRect.bottom && rect.bottom > panelRect.top;
        });
    }

    #handlePanelTabClick(tabEl: HTMLDivElement, tabs: NodeListOf<HTMLDivElement>): void {
        const tabId = tabEl.dataset.tab ? parseInt(tabEl.dataset.tab, 10) : null;
        if (!tabId || tabEl.classList.contains('hs-tab-selected')) return;

        const tabConfig = this.#tabConfigMap.get(tabId);
        if (!tabConfig) {
            HSLogger.error(`Could not find tab config for tabId ${tabId}`, this.context);
            return;
        }

        tabs.forEach(t => t.classList.remove('hs-tab-selected'));
        tabEl.classList.add('hs-tab-selected');

        this.#panelBodyCache.forEach(panel => {
            panel.classList.remove('hs-panel-body-open-flex');
            panel.classList.remove('hs-panel-body-open-block');
        });

        const targetPanel = this.#getTabBody(tabId);
        targetPanel?.classList.add(tabConfig.panelDisplayType === 'flex'
            ? 'hs-panel-body-open-flex'
            : 'hs-panel-body-open-block');
        if (!targetPanel) return;

        HSUI.#logTabActive = tabId === 1;

        if (HSUI.#logTabActive) {
            HSLogger.flushPendingLogs();
        }
    }

    #setupPanelToggle(): void {
        if (!this.#uiPanel) return;

        this.#uiPanelOpenBtn = document.createElement('div');
        this.#uiPanelOpenBtn.id = 'hs-panel-control';
        this.#uiPanelOpenBtn.style.display = 'none';
        const nativeIcon = document.getElementById('octeractCorruptionImage');
        const icon = nativeIcon ? HSIcons.fromElement(nativeIcon) : null;
        HSIcons.applyBackground(this.#uiPanelOpenBtn, icon ?? { url: modPanelIcon }, 35);

        this.#uiPanelOpenBtn.addEventListener('click', async () => {
            if (this.#uiQuickAccessMenu) {
                this.#uiQuickAccessMenu.style.display = 'none';
            }
            if (HSUI.#modPanelOpen && this.#uiPanel) {
                // Open: a minimized or covered panel comes back first; only a visible one closes
                const isMinimized = this.#isPanelMinimized();
                if (!isMinimized && !this.#isPanelCovered()) {
                    await this.#closePanel();
                    return;
                }
                if (isMinimized) this.#togglePanelMinimized();
                this.#bringElementToFront(this.#uiPanel);
            } else if (this.#uiPanel) {
                HSUI.#modPanelOpen = true;
                const selectedTab = document.querySelector<HTMLDivElement>('.hs-panel-tab.hs-tab-selected');
                HSUI.#logTabActive = selectedTab?.dataset.tab === '1';

                if (this.#isPanelMinimized()) this.#togglePanelMinimized();
                this.#bringElementToFront(this.#uiPanel);
                this.#uiPanel.style.opacity = '0';
                this.#uiPanel.classList.remove('hs-panel-closed');

                if (HSUI.#logTabActive) {
                    HSLogger.flushPendingLogs();
                }
                await HSUI.#transition(this.#uiPanel, { opacity: 0.97 });
            }
        });

        document.body.appendChild(this.#uiPanelOpenBtn);
    }


    // ========================================
    // ---------- Quick access menu -----------
    // ========================================

    #createQuickAccessMenu() {
        if (!this.#uiPanelOpenBtn) return;

        const quickMenu = this.#buildQuickAccessMenuContainer();
        this.#uiQuickAccessMenu = quickMenu;
        const autoSingBtn     = this.#buildQuickAccessButton('autosing',   '▶', 'Start Auto-Sing (S216+)', () => this.#toggleAutoSing());
        const heaterHSBtn     = this.#buildQuickAccessButton('amb-heater', '🔥', 'Amb Heater (HS)',         () => this.#triggerHeaterHS());
        const heaterExportBtn = this.#buildQuickAccessButton('amb-heater', '🔥', 'Amb Heater (Export)',     () => this.#triggerHeaterExport());

        quickMenu.appendChild(heaterHSBtn);
        quickMenu.appendChild(heaterExportBtn);
        quickMenu.appendChild(autoSingBtn);
        document.body.appendChild(quickMenu);

        this.#attachQuickAccessMenuHandlers(quickMenu);
    }

    #buildQuickAccessMenuContainer(): HTMLDivElement {
        const quickMenu = document.createElement('div');
        quickMenu.id = 'hs-quick-access-menu';
        quickMenu.style.display = 'none';
        return quickMenu;
    }

    #buildQuickAccessButton(type: string, icon: string, label: string, onClick: () => void): HTMLButtonElement {
        const button = document.createElement('button');
        button.innerHTML = `
            <span style="display: inline-block; width: 20px; text-align: center; margin-right: 5px;">${icon}</span>
            <span>${label}</span>
        `;
        button.setAttribute('data-type', type);
        button.addEventListener('click', onClick);
        return button;
    }

    #attachQuickAccessMenuHandlers(quickMenu: HTMLDivElement) {
        let hoverTimeout: number | null = null;

        const showMenu = () => {
            if (hoverTimeout) clearTimeout(hoverTimeout);
            quickMenu.style.display = 'flex';
        };
        const hideMenu = () => {
            hoverTimeout = window.setTimeout(() => {
                quickMenu.style.display = 'none';
            }, 200);
        };

        this.#uiPanelOpenBtn?.addEventListener('mouseenter', showMenu);
        this.#uiPanelOpenBtn?.addEventListener('mouseleave', hideMenu);
        quickMenu.addEventListener('mouseenter', showMenu);
        quickMenu.addEventListener('mouseleave', hideMenu);
    }

    #toggleAutoSing() {
        const autoSingToggle = document.getElementById('hs-setting-auto-sing-enabled') as HTMLElement | null;
        if (autoSingToggle) {
            autoSingToggle.click();
            HSLogger.log('Auto-Sing toggled via quick menu', this.context);
        }
    }

    #triggerHeaterHS() {
        const heaterHSBtn = document.getElementById('hs-panel-amb-heater-compute-btn') as HTMLElement | null;
        if (heaterHSBtn) {
            heaterHSBtn.click();
            HSLogger.log('Ambrosia Heater (HS) triggered via quick menu', this.context);
        }
    }

    #triggerHeaterExport() {
        const heaterExportBtn = document.getElementById('hs-panel-amb-heater-btn') as HTMLElement | null;
        if (heaterExportBtn) {
            heaterExportBtn.click();
            HSLogger.log('Ambrosia Heater exported via quick menu', this.context);
        }
    }


    // ========================================
    // ----------- Panel utilities ------------
    // ========================================

    static isModPanelOpen() {
        return HSUI.#modPanelOpen;
    }

    static isLogTabActive() {
        return HSUI.#logTabActive;
    }

    // Makes element draggable with mouse
    #makeDraggable(element: HTMLElement, dragHandle: HTMLElement) {
        let pos1 = 0;
        let pos2 = 0;
        let pos3 = 0;
        let pos4 = 0;

        const elementDrag = (e: MouseEvent) => {
            e.preventDefault();

            pos1 = pos3 - e.clientX;
            pos2 = pos4 - e.clientY;
            pos3 = e.clientX;
            pos4 = e.clientY;

            let newTop = element.offsetTop - pos2;
            let newLeft = element.offsetLeft - pos1;

            const modalRect = element.getBoundingClientRect();
            const viewportWidth = window.innerWidth;
            const viewportHeight = window.innerHeight;

            const minVisibleHeight = 45;
            const padding = 10;

            newLeft = Math.max(
                -(modalRect.width - minVisibleHeight),
                Math.min(newLeft, viewportWidth - minVisibleHeight)
            );

            newTop = Math.max(
                padding,
                Math.min(newTop, viewportHeight - minVisibleHeight)
            );

            element.style.top = `${newTop}px`;
            element.style.left = `${newLeft}px`;
        };

        const closeDragElement = () => {
            document.removeEventListener('mousemove', elementDrag);
            document.removeEventListener('mouseup', closeDragElement);
        };

        const dragMouseDown = (e: MouseEvent) => {
            e.preventDefault();

            pos3 = e.clientX;
            pos4 = e.clientY;
            document.addEventListener('mousemove', elementDrag);
            document.addEventListener('mouseup', closeDragElement);
        };

        dragHandle.addEventListener('mousedown', dragMouseDown);
        return closeDragElement;
    }

    #makeResizable(element: HTMLElement, resizeHandle: HTMLElement, minWidth = 525, minHeight = 400) {
        const resizable = element;
        const resizer = resizeHandle;
        let isResizing = false;
        let startX: number;
        let startY: number;
        let startWidth: number;
        let startHeight: number;

        const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(value, max));

        resizer.addEventListener('mousedown', (e) => {
            isResizing = true;
            startX = e.clientX;
            startY = e.clientY;
            startWidth = resizable.offsetWidth;
            startHeight = resizable.offsetHeight;

            // Remove max-height constraint from challenges list container when user starts resizing
            const challengesContainer = resizable.querySelector('.hs-challenges-list-container') as HTMLElement;
            if (challengesContainer) {
                challengesContainer.style.maxHeight = 'none';
            }

            document.addEventListener('mousemove', resize);
            document.addEventListener('mouseup', stopResize);
        });

        function resize(e: MouseEvent) {
            if (!isResizing) return;

            const newWidth = clamp(startWidth + (e.clientX - startX), minWidth, 2500);
            const newHeight = clamp(startHeight + (e.clientY - startY), minHeight, 1500);

            resizable.style.width = `${newWidth}px`;
            resizable.style.height = `${newHeight}px`;
        }

        function stopResize() {
            isResizing = false;
            document.removeEventListener('mousemove', resize);
            document.removeEventListener('mouseup', stopResize);
        }
        return stopResize;
    }

    async getLogElement(): Promise<HTMLElement> {
        if (this.#loggerElement) {
            return this.#loggerElement;
        } else {
            const logEl = await HSElementHooker.RequireElement<HTMLTextAreaElement>('#hs-ui-log');
            this.#loggerElement = logEl;
            return logEl;
        }
    }


    // ========================================
    // ----- Tab / panel content helpers ------
    // ========================================

    #getTabBody(tabId: number): HTMLDivElement | null {
        if (this.#tabBodyCache.has(tabId)) {
            return this.#tabBodyCache.get(tabId) || null;
        }

        const tab = this.#tabConfigMap.get(tabId);
        if (!tab) return null;

        const tabBody = document.querySelector(tab.tabBodySel) as HTMLDivElement | null;
        if (tabBody) {
            this.#tabBodyCache.set(tabId, tabBody);
        }
        return tabBody;
    }

    #getTabHeader(tabId: number): HTMLDivElement | null {
        if (this.#tabHeaderCache.has(tabId)) {
            return this.#tabHeaderCache.get(tabId) || null;
        }

        const tab = this.#tabConfigMap.get(tabId);
        if (!tab) return null;

        const tabHeader = document.querySelector(tab.tabSel) as HTMLDivElement | null;
        if (tabHeader) {
            this.#tabHeaderCache.set(tabId, tabHeader);
        }
        return tabHeader;
    }

    replaceTabContents(tabId: number, htmlContent: string) {
        const tabBody = this.#getTabBody(tabId);
        if (!tabBody) {
            HSLogger.warn('Could not find tab to replace contents', this.context);
            return;
        }

        tabBody.innerHTML = htmlContent;
        HSLogger.debug(() => `Replaced tab ${tabId} content`, this.context);
    }

    updateTitle(newTitle: string) {
        if (this.#uiPanelTitle) {
            this.#uiPanelTitle.innerText = newTitle;
        } else {
            HSLogger.warn(`Could not update panel title`, this.context);
        }
    }

    setPanelControlVisible(visible: boolean) {
        if (!this.#uiPanelOpenBtn) {
            HSLogger.warn(`Could not update panel control visibility`, this.context);
            return;
        }

        this.#uiPanelOpenBtn.style.display = visible ? 'block' : 'none';
    }

    renameTab(tabId: number, newName: string) {
        const tabHeader = this.#getTabHeader(tabId);
        if (!tabHeader) {
            HSLogger.warn('Could not find tab to rename', this.context);
            return;
        }

        tabHeader.innerHTML = newName;
    }

    removeTab(tabId: number) {
        this.#getTabHeader(tabId)?.remove();
        this.#getTabBody(tabId)?.remove();
    }


    // ========================================
    // ---- Style / DOM injection helpers -----
    // ========================================

    static #isStyleStringEmpty(styleString: string): boolean {
        if (!HSUtils.isString(styleString)) {
            return true;
        }

        const match = styleString.match(/\{([\s\S]*)\}/);
        if (!match) {
            return true;
        }

        return match[1].trim().length === 0;
    }

    // Can be used to inject arbitrary CSS into the page
    static injectStyle(styleString: string, styleId?: string) {
        if (styleString && !this.#isStyleStringEmpty(styleString)) {

            const targetStyleId = styleId ?? 'hs-injected-style-' + HSUtils.domid();

            if (!this.#injectedStyles.has(targetStyleId)) {
                this.#injectedStyles.set(targetStyleId, styleString);
            }

            this.updateInjectedStyleBlock();
        }
    }

    // Can be used to inject arbitrary CSS into the page
    static removeInjectedStyle(styleId: string) {
        if (this.#injectedStyles.has(styleId)) {
            this.#injectedStyles.delete(styleId);
            this.updateInjectedStyleBlock();
            HSLogger.debug(() => `Removed injected CSS`, this.#staticContext);
        } else {
            HSLogger.debug(() => `<yellow>Could not find style with id ${styleId}</yellow>`, this.#staticContext);
        }
    }

    static #updatePending = false;

    static updateInjectedStyleBlock() {
        if (HSUI.#updatePending) return;

        HSUI.#updatePending = true;

        setTimeout(() => {
            HSUI.#updatePending = false;
            HSUI.#writeInjectedStyleBlock();
        }, 0);
    }

    /**
     * Writes the injected styles to the page now, instead of in the next task: for elements drawn right after
     * their CSS is injected, which would otherwise be painted once without it.
     */
    static flushInjectedStyles() {
        HSUI.#writeInjectedStyleBlock();
    }

    static #writeInjectedStyleBlock() {
        if (!HSUI.#injectedStylesHolder) {
            HSUI.#injectedStylesHolder = document.createElement('style');
            HSUI.#injectedStylesHolder.id = HSGlobal.HSUI.injectedStylesDomId;
            document.head.appendChild(HSUI.#injectedStylesHolder);
        }

        HSUI.#injectedStylesHolder.innerHTML = Array.from(HSUI.#injectedStyles.values()).join('');

        HSLogger.debug(() => `Flushed ${HSUI.#injectedStyles.size} styles`, HSUI.#staticContext);
    }

    // Can be used to inject arbitrary HTML
    // injectFunction can be supplied to control where the HTML is injected
    static injectHTMLString(htmlString: string, injectFunction?: (node: ChildNode) => void) {
        const div = document.createElement('div');
        div.innerHTML = htmlString;

        while (div.firstChild) {
            if (injectFunction) {
                injectFunction(div.firstChild);
            } else {
                document.body.appendChild(div.firstChild);
            }
        };
    }


    // ========================================
    // ------------ Modal helpers -------------
    // ========================================

    async #waitForModalImages(modal: HTMLDivElement): Promise<void> {
        const images = modal.querySelectorAll<HTMLImageElement>('.hs-modal-body img');
        const imagePromises = Array.from(images).map((img) => {
            return new Promise<void>((resolve) => {
                if (img.complete) {
                    resolve();
                } else {
                    img.addEventListener('load', () => resolve());
                    img.addEventListener('error', () => resolve());
                }
            });
        });

        await Promise.all(imagePromises);
    }

    #clampModalPosition(modal: HTMLDivElement, coordinates: HSUIXY): HSUIXY {
        const { width, height } = modal.getBoundingClientRect();
        const padding = 10;
        const maxX = window.innerWidth - width - padding;
        const maxY = window.innerHeight - height - padding;

        return {
            x: Math.max(padding, Math.min(coordinates.x, maxX)),
            y: Math.max(padding, Math.min(coordinates.y, maxY))
        };
    }

    #bringModalToFront(modal: HTMLDivElement): void {
        this.#bringElementToFront(modal);
    }

    #attachModalHandlers(modal: HTMLDivElement, modalHead: HTMLDivElement | null, cleanups: Array<() => void>): void {
        if (modalHead) {
            this.#bringModalToFront(modal);
            cleanups.push(this.#makeDraggable(modal, modalHead));
            modalHead.addEventListener('mousedown', () => this.#bringModalToFront(modal));
        }

        const modalResizer = modal.querySelector('.hs-modal-resizer') as HTMLElement | null;
        if (modalResizer) {
            cleanups.push(this.#makeResizable(modal, modalResizer));
        }

        modal.addEventListener('click', async (e) => {
            const target = e.target as HTMLElement | null;
            
            // Handle close button
            const closeTarget = target?.closest('[data-close]') as HTMLElement | null;
            if (closeTarget?.dataset.close) {
                await this.CloseModal(closeTarget.dataset.close);
            }
            
            // Handle minimize button
            const minimizeTarget = target?.closest('[data-minimize]') as HTMLElement | null;
            if (minimizeTarget?.dataset.minimize) {
                await this.MinimizeModal(minimizeTarget.dataset.minimize);
            }
        });
    }

    #resolveCoordinates(coordinates: HSUIDOMCoordinates = EPredefinedPosition.CENTER, relativeTo?: HTMLElement, parentModalId?: string): HSUIXY {
        let position = { x: 0, y: 10 };

        const windowCenterX = window.innerWidth / 2;

        let relativeX = 0;

        if (relativeTo) {
            const elementRect = relativeTo.getBoundingClientRect();
            relativeX = elementRect.width;
        }

        if (Number.isInteger(coordinates)) {
            switch (coordinates) {
                case EPredefinedPosition.CENTER:
                    let prevModal: HTMLElement | null = null;

                    if (parentModalId) {
                        prevModal = document.querySelector(`#${parentModalId}`) as HTMLElement;
                    }

                    if (!prevModal && HSUI.#modPanelOpen) {
                        prevModal = document.querySelector('#hs-panel') as HTMLElement;
                    }

                    if (prevModal) {
                        position.x = prevModal.offsetLeft + 50;
                    } else {
                        position.x = windowCenterX - (relativeX / 2);
                    }
                    break;
                case EPredefinedPosition.RIGHT:
                    position.x = window.innerWidth - 25 - relativeX;
                    break;
                case EPredefinedPosition.LEFT:
                    position.x = 25;
                    break;
                default:
                    position.x = windowCenterX - (relativeX / 2);
                    break;
            }
        } else {
            const custom = coordinates as HSUIXY;
            position.x = custom.x;
            position.y = custom.y;
        }

        return position;
    }

    // Opens a new modal
    async Modal(modalOptions: HSUIModalOptions): Promise<string> {
        const uuid = `hs-dom-${HSUtils.uuidv4()}`;
        const html = HSUIC._modal({
            ...modalOptions,
            id: uuid,
            title: modalOptions.title || '',
            styles: {
                ...(modalOptions.styles ?? {}),
                opacity: 0
            }
        });

        HSUI.injectHTMLString(html);

        const modal = document.getElementById(uuid) as HTMLDivElement | null;
        if (!modal) return uuid;

        const modalHead = modal.querySelector('.hs-modal-head') as HTMLDivElement | null;

        this.#activeModals.add(modal);
        const cleanups: Array<() => void> = [];
        const { onClose } = modalOptions;
        if (onClose) cleanups.push(() => onClose(modal));
        this.#modalCleanup.set(modal, cleanups);
        this.#modalInitialDimensions.set(modal, { width: modal.style.width, height: modal.style.height });
        this.#bringModalToFront(modal);

        if (modalOptions.needsToLoad === true) {
            await this.#waitForModalImages(modal);
        }
        if (!modal.isConnected) return uuid;

        if (modalOptions.onBeforeShow) {
            HSUI.flushInjectedStyles();
            modalOptions.onBeforeShow(modal);
        }

        const finalCoords = this.#clampModalPosition(
            modal,
            this.#resolveCoordinates(modalOptions.position, modal, modalOptions.parentModalId)
        );

        modal.style.left = `${finalCoords.x}px`;
        modal.style.top  = `${finalCoords.y}px`;

        await HSUI.#transition(modal, { opacity: 1 });
        if (!modal.isConnected) return uuid;
        this.#attachModalHandlers(modal, modalHead, cleanups);

        return uuid;
    }

    async CloseModal(modalId?: string): Promise<void> {
        if (modalId) {
            const modal = Array.from(this.#activeModals).find(activeModal => activeModal.id === modalId);
            if (modal) await this.#closeModal(modal);
            return;
        }
        for (const modal of Array.from(this.#activeModals)) {
            await this.#closeModal(modal);
        }
    }

    async #closeModal(modal: HTMLDivElement): Promise<void> {
        if (modal.isConnected) {
            await HSUI.#transition(modal, { opacity: 0 });
            modal.remove();
        }
        const cleanups = this.#modalCleanup.get(modal);
        this.#modalCleanup.delete(modal);
        this.#modalInitialDimensions.delete(modal);
        this.#activeModals.delete(modal);
        if (cleanups) {
            for (const cleanup of cleanups) cleanup();
        }
    }

    async MinimizeModal(modalId: string): Promise<void> {
        const modal = document.getElementById(modalId) as HTMLDivElement | null;
        if (!modal) return;
        const modalBody = modal.querySelector('.hs-modal-body') as HTMLElement | null;
        if (!modalBody) return;
        const isMinimized = modalBody.style.display === 'none';
        const minimizeBtn = modal.querySelector('.hs-modal-minimize-btn') as HTMLElement | null;

        if (isMinimized) {
            // Restore: show body/resizer and restore saved dimensions
            modalBody.style.display = '';

            const resizer = modal.querySelector('.hs-modal-resizer') as HTMLElement | null;
            if (resizer) {
                resizer.style.display = '';
            }

            // Restore modal dimensions
            const initial = this.#modalInitialDimensions.get(modal);
            modal.style.width = initial?.width ?? '';
            modal.style.height = initial?.height ?? '';

            if (minimizeBtn) {
                minimizeBtn.textContent = '_';
                minimizeBtn.title = 'Minimize';
            }
        } else {
            // Clamp left border to page before minimizing
            const modalRect = modal.getBoundingClientRect();
            if (modalRect.left < 0) {
                modal.style.left = '0px';
            }
            // Minimize: hide body/resizer and save/reset dimensions
            modalBody.style.display = 'none';
            
            const resizer = modal.querySelector('.hs-modal-resizer') as HTMLElement | null;
            if (resizer) {
                resizer.style.display = 'none';
            }
            
            // Reset to header-only size
            modal.style.width = 'auto';
            modal.style.height = 'auto';

            if (minimizeBtn) {
                minimizeBtn.textContent = '+';
                minimizeBtn.title = 'Restore';
            }
        }
    }

    // Shows an open modal above the others, restored first if it was minimized
    async BringModalToFront(modalId: string): Promise<void> {
        const modal = document.getElementById(modalId) as HTMLDivElement | null;
        if (!modal) return;
        const modalBody = modal.querySelector('.hs-modal-body') as HTMLElement | null;
        if (modalBody?.style.display === 'none') {
            await this.MinimizeModal(modalId);
        }
        this.#bringModalToFront(modal);
    }


    // ========================================
    // --------- Notification helpers ---------
    // ========================================

    static #getNotifyColumn(column: HSNotifyColumn): HTMLElement {
        let element = HSUI.#notifyColumns.get(column);
        if (!element) {
            element = document.createElement('div');
            element.className = `${HSGlobal.HSUI.notifyColumnClassName} ${HSGlobal.HSUI.notifyColumnClassName}-${column}`;
            document.body.appendChild(element);
            HSUI.#notifyColumns.set(column, element);
        }
        return element;
    }

    static #removeNotification(notification: HSNotification): void {
        HSUI.#notifications = HSUI.#notifications.filter(n => n !== notification);
        notification.lifetime.cancel();
        notification.element.remove();
        notification.onRemoved();
    }

    // In its column, the same text replaces its earlier copy; past the limit the oldest goes, errors last
    static #makeRoomForNotification(text: string, column: HSNotifyColumn): void {
        const inColumn = () => HSUI.#notifications.filter(n => n.column === column);
        inColumn().filter(n => n.text === text).forEach(n => HSUI.#removeNotification(n));
        const shown = inColumn();
        if (shown.length < HSUI.#notifyMaxShown) return;
        HSUI.#removeNotification(shown.find(n => n.notificationType !== 'error') ?? shown[0]);
    }

    // Resolves when the notification is gone, which a hover can put off for as long as it lasts: don't make code wait on it
    static Notify(text: string, notifyOptions?: Partial<HSNotifyOptions>): Promise<void> {
        // The Log tab renders HTML, the notification shows plain text
        HSLogger.log(escapeLogText(text), 'Notify');
        const notificationType = notifyOptions?.notificationType ?? "default";
        const popDuration = notifyOptions?.popDuration ?? 400;
        const hideDuration = notifyOptions?.hideDuration ?? 500;
        const displayDuration = Math.max(
            HSUI.#notifyMinDisplayMs,
            text.length * HSUI.#notifyDisplayMsPerCharacter,
            notifyOptions?.displayDuration ?? 0
        );
        const hideStart = popDuration + displayDuration;
        const column: HSNotifyColumn = notifyOptions?.position === 'bottomLeft' ? 'bottomLeft' : 'top';

        HSUI.#makeRoomForNotification(text, column);

        const element = document.createElement('div');
        const notificationText = document.createElement('div');

        element.className = HSGlobal.HSUI.notifyClassName;
        notificationText.className = HSGlobal.HSUI.notifyTextClassName;

        element.style.backgroundColor = HSUI.#notifyBackgroundColors[notificationType];
        element.style.transform = column === 'bottomLeft' ? 'translateX(-100%)' : 'translateY(calc(-100% - 15px))';

        notificationText.innerText = text;
        element.appendChild(notificationText);

        const columnElement = HSUI.#getNotifyColumn(column);
        columnElement.style.zIndex = String(HSUI.getHighestActiveModalZIndex() + 1);
        columnElement.appendChild(element);

        void HSUI.#transition(element, {
            transform: 'none'
        }, popDuration, `linear(0, 0.408 26.7%, 0.882 50.9%, 0.999 57.7%, 0.913 65.3%, 0.893 68.8%, 0.886 72.4%, 0.903 78.5%, 0.986 92.3%, 1)`);

        // One animation holds the display time and the fade, so a hover only has to pause it
        const lifetime = element.animate([{ opacity: 1 }, { opacity: 0 }], { delay: hideStart, duration: hideDuration, fill: 'forwards' });

        return new Promise(resolve => {
            const notification: HSNotification = { text, notificationType, column, element, lifetime, onRemoved: resolve };
            HSUI.#notifications.push(notification);

            lifetime.onfinish = () => HSUI.#removeNotification(notification);
            element.addEventListener('click', () => HSUI.#removeNotification(notification));
            element.addEventListener('mouseenter', () => {
                lifetime.pause();
                // During the fade: back to full opacity, the fade starts over when the mouse leaves
                if (Number(lifetime.currentTime) > hideStart) lifetime.currentTime = hideStart;
            });
            element.addEventListener('mouseleave', () => lifetime.play());
        });
    }
}
