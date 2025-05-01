import { EPredefinedPosition, HSPanelTabDefinition, HSUIDOMCoordinates, HSUIModalOptions, HSUIXY } from "../../types/module-types/hs-ui-types";
import { HSUtils } from "../hs-utils/hs-utils";
import { HSLogger } from "./hs-logger";
import { HSModule } from "./hs-module";
import { HSUIC } from "./hs-ui-components";
import panelCSS from "inline:../../resource/css/hs-panel.css";
import panelHTML from "inline:../../resource/html/hs-panel.html";

/*
    Class: HSUI
    IsExplicitHSModule: Yes
    Description: 
        UI modules for Hypersynergism.
        Mostly responsible for handling everything related to the mod's panel,
        but also contains methods such as:
            - injectCSS() for injecting arbitrary styles in to the DOM
            - injectHTML() for injecting arbitrary HTML in to the DOM
            - Modal() for creating and displaying custom modals
    Author: Swiffy
*/
export class HSUI extends HSModule {
    static #staticContext = 'HSUI';

    #staticPanelHtml: string;
    #staticPanelCss: string;

    uiReady = false;

    #uiPanel? : HTMLDivElement;
    #uiPanelTitle?: HTMLDivElement;
    #uiPanelCloseBtn? : HTMLDivElement;
    #uiPanelOpenBtn?: HTMLDivElement;

    #loggerElement?: HTMLTextAreaElement;
    #logClearBtn? : HTMLButtonElement;

    #modPanelOpen = false;

    #tabs : HSPanelTabDefinition[] = [
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
            panelDisplayType: 'flex'
        }
    ];

    constructor(moduleName: string, context: string, moduleColor?: string) {
        super(moduleName, context, moduleColor);
        this.#staticPanelCss = panelCSS;
        this.#staticPanelHtml = panelHTML;
    }

    async init(): Promise<void> {
        HSLogger.log("Initialising HSUI module", this.context);

        const self = this;

        // Inject UI panel styles
        HSUI.injectStyle(this.#staticPanelCss, 'hs-panel-css');

        // Create temp div, inject UI panel HTML and append the contents to body
        HSUI.injectHTML(this.#staticPanelHtml);

        // Find the UI elements in DOM and store the refs
        this.#uiPanel = document.querySelector('#hs-panel') as HTMLDivElement;
        this.#uiPanelTitle = document.querySelector('#hs-panel-version') as HTMLDivElement;
        this.#uiPanelCloseBtn = document.querySelector('.hs-panel-header-right') as HTMLDivElement;
        this.#loggerElement = document.querySelector('#hs-ui-log') as HTMLTextAreaElement;
        this.#logClearBtn = document.querySelector('#hs-ui-log-clear') as HTMLButtonElement;
        const panelHandle = document.querySelector('.hs-panel-header') as HTMLDivElement;

        // Make the HS UI panel draggable
        this.#makeDraggable(this.#uiPanel, panelHandle);

        // Make the HS UI panel closeable
        this.#uiPanelCloseBtn.addEventListener('click', async () => {
            if(self.#modPanelOpen &&self.#uiPanel) {
                await self.#uiPanel.transition({
                    opacity: 0
                });

                self.#modPanelOpen = false;
                self.#uiPanel?.classList.add('hs-panel-closed');
            }
        });

        this.#logClearBtn.addEventListener('click', () => {
            HSLogger.clear();
        })

        // Bind panel controls
        const tabs = document.querySelectorAll('.hs-panel-tab');

        tabs.forEach(tab => {
            tab.addEventListener('click', (e) => {
                const tab = e.target as HTMLDivElement;
                const tabId = tab.dataset.tab ? parseInt(tab.dataset.tab, 10) : null;

                if(tab.classList.contains('hs-tab-selected'))
                    return;

                if(tabId) {
                    const tabConfig = self.#tabs.find((tab) => tab.tabId === tabId);

                    if(!tabConfig) {
                        HSLogger.error(`Could not find tab config for tabId ${tabId}`, self.context);
                        return;
                    }

                    tabs.forEach(tab => {
                        tab.classList.remove('hs-tab-selected');
                    });

                    tab.classList.add('hs-tab-selected');

                    document.querySelectorAll('.hs-panel-body').forEach(panel => {
                        panel.classList.remove('hs-panel-body-open-flex');
                        panel.classList.remove('hs-panel-body-open-block');
                    });

                    const targetPanel = document.querySelector(tabConfig.tabBodySel) as HTMLDivElement;

                    if(targetPanel) {
                        switch(tabConfig.panelDisplayType) {
                            case "flex":
                                targetPanel.classList.add('hs-panel-body-open-flex');
                                break;
                            case "block":
                                targetPanel.classList.add('hs-panel-body-open-block');
                                break;
                        }

                        // Log panel (auto scroll to bottom when log tab selected)
                        if(tabId === 1) 
                            HSLogger.scrollToBottom();
                    }
                } else {
                    HSLogger.error(`tabId is null`, self.context);
                }
            });
        });

        // Create open button for the HS UI panel
        this.#uiPanelOpenBtn = document.createElement('div');
        this.#uiPanelOpenBtn.id = "hs-panel-control";

        // Open button opens the panel
        this.#uiPanelOpenBtn.addEventListener('click', async () => {
            if(!self.#modPanelOpen && self.#uiPanel) {
                self.#modPanelOpen = true;
                self.#uiPanel.style.opacity = '0';
                self.#uiPanel.classList.remove('hs-panel-closed');

                const resetCoords = self.#resolveCoordinates(EPredefinedPosition.CENTER, self.#uiPanel);
                self.#uiPanel.style.left = `${resetCoords.x}px`;
                self.#uiPanel.style.top = `${resetCoords.y}px`;

                HSLogger.scrollToBottom();

                await self.#uiPanel.transition({
                    opacity: 0.92
                });
            }
        });

        document.body.appendChild(this.#uiPanelOpenBtn);

        this.uiReady = true;
        this.isInitialized = true;
    }

    // Makes element draggable with mouse
    #makeDraggable(element : HTMLElement, dragHandle : HTMLElement) {
        let pos1 = 0;
        let pos2 = 0;
        let pos3 = 0;
        let pos4 = 0;

        dragHandle.onmousedown = dragMouseDown;

        function dragMouseDown(e : MouseEvent) {
            e.preventDefault();

            pos3 = e.clientX;
            pos4 = e.clientY;
            document.onmouseup = closeDragElement;

            document.onmousemove = elementDrag;
        }

        function elementDrag(e : MouseEvent) {
            e.preventDefault();

            pos1 = pos3 - e.clientX;
            pos2 = pos4 - e.clientY;
            pos3 = e.clientX;
            pos4 = e.clientY;

            element.style.top = (element.offsetTop - pos2) + "px";
            element.style.left = (element.offsetLeft - pos1) + "px";
        }

        function closeDragElement() {
            document.onmouseup = null;
            document.onmousemove = null;
        }
    }

    getLogElement() : HTMLTextAreaElement | null {
        return this.#loggerElement ? this.#loggerElement : null;
    }

    replaceTabContents(tabId: number, htmlContent: string) {
        const tab = this.#tabs.find(t => {
            return t.tabId === tabId;
        });

        if(!tab) {
            HSLogger.warn('Could not find tab to replace contents', this.context);
            return;
        }

        const tabBody = document.querySelector(tab.tabBodySel) as HTMLDivElement;

        if(tabBody) {
            tabBody.innerHTML = htmlContent;
            HSLogger.log(`Replaced tab ${tab.tabId} content`, this.context);
        }
    }

    updateTitle(newTitle: string) {
        if(this.#uiPanelTitle) {
            this.#uiPanelTitle.innerText = newTitle;
        } else {
            HSLogger.warn(`Could not update panel title`, this.context);
        }
    }

    static #isStyleStringEmpty(styleString: string): boolean {
        // The style is in form #<someid> { <empty or css rules> }
        // Here we want to check if the brackets contain anything
        let openBracketIdx = styleString.indexOf('{');
        const closeBracketIdx = styleString.indexOf('}');

        if(openBracketIdx > -1 && closeBracketIdx > -1) {
            openBracketIdx++;

            const bracketInsides = styleString.substring(openBracketIdx, closeBracketIdx);

            if(!HSUtils.isString(bracketInsides)) {
                return true;
            } else {
                const bracketsInsidesRemoveWhiteSpace = bracketInsides.replace(/\s+/g, '');
                const areBracketsEmpty = bracketsInsidesRemoveWhiteSpace.length === 0;

                return areBracketsEmpty;
            }
        } else {
            // Not sure of this but lets return true if no brackets are found
            return true;
        }
    }

    // Can be used to inject arbitrary CSS into the page
    static injectStyle(styleString: string, styleId?: string) {
        if(styleString && !this.#isStyleStringEmpty(styleString)) {
            const styleElement = document.createElement('style');

            if(styleId)
                styleElement.id = styleId;

            styleElement.textContent = styleString;
            document.head.appendChild(styleElement);

            HSLogger.debug(`Injected new CSS`, this.#staticContext);
        }
    }

    // Can be used to inject arbitrary CSS into the page
    static removeInjectedStyle(styleId: string) {
        const styleElement = document.getElementById(styleId);
        if(styleElement) {
            styleElement.parentElement?.removeChild(styleElement);
            HSLogger.debug(`Removed injected CSS`, this.#staticContext);
        } else {
            HSLogger.warn(`Could not find style with id ${styleId}`, this.#staticContext);
        }
    }

    // Can be used to inject arbitrary HTML
    // injectFunction can be supplied to control where the HTML is injected
    static injectHTML(htmlString: string, injectFunction?: (node: ChildNode) => void) {
        const div = document.createElement('div');
        div.innerHTML = htmlString;

        while (div.firstChild) {
            if(injectFunction) {
                injectFunction(div.firstChild);
            } else {
                document.body.appendChild(div.firstChild);
            }
        };

        HSLogger.debug(`Injected new HTML`, this.#staticContext);
    }

    renameTab(tabId: number, newName: string) {
        const tab = this.#tabs.find(t => {
            return t.tabId === tabId;
        });

        if(!tab) {
            HSLogger.warn('Could not find tab to rename', this.context);
            return;
        }

        const tabEl = document.querySelector(tab.tabSel) as HTMLDivElement;

        if(tabEl) {
            tabEl.innerHTML = newName;
        }
    }

    // Used by modals to calculate their open position
    #resolveCoordinates(coordinates: HSUIDOMCoordinates = EPredefinedPosition.CENTER, relativeTo?: HTMLElement): HSUIXY {
        let position = { x: 0, y: 0 };

        const windowCenterX = window.innerWidth / 2;
        const windowCenterY = window.innerHeight / 2;
        
        let relativeX = 0;
        let relativeY = 0;

        if(relativeTo) {
            const elementRect = relativeTo.getBoundingClientRect();
            relativeX = elementRect.width;
            relativeY = elementRect.height;
        }

        if(Number.isInteger(coordinates)) {
            switch(coordinates) {
                case EPredefinedPosition.CENTER:
                    position = { 
                        x: windowCenterX - (relativeX / 2), 
                        y: windowCenterY - (relativeY / 2)
                    };
                    break;
                case EPredefinedPosition.RIGHT:
                    position = { 
                        x: window.innerWidth - 25 - relativeX, 
                        y: windowCenterY - (relativeY / 2)
                    };
                    break;
                case EPredefinedPosition.LEFT:
                    position = { 
                        x: 25 + relativeX, 
                        y: windowCenterY - (relativeY / 2)
                    };
                    break;
                default:
                    position = { 
                        x: windowCenterX - (relativeX / 2), 
                        y: windowCenterY - (relativeY / 2)
                    };
                    break;
            }
        } else {
            position = coordinates as HSUIXY;
        }

        return position;
    }

    // Opens a new modal
    async Modal(modalOptions: HSUIModalOptions) {
        const uuid = `hs-dom-${HSUtils.uuidv4()}`;
        const html = HSUIC._modal({
            ...modalOptions,
            id: uuid,
            styles: {
                opacity: 0
            }
        });	

        // Create temp div, inject UI panel HTML and append the contents to body
        HSUI.injectHTML(html);

        const modal = document.querySelector(`#${uuid}`) as HTMLDivElement;
        const modalHead = document.querySelector(`#${uuid} > .hs-modal-head`) as HTMLDivElement;

        // If the modal contains something (images mainly) which take time to load, needsToLoad should be set to true
        // And this is where we handle / wait for the loading to happen before showing the modal
        if(modalOptions.needsToLoad && modalOptions.needsToLoad === true) {
            const images = document.querySelectorAll(`#${uuid} > .hs-modal-body img`);

            const imagePromises = (Array.from(images) as HTMLImageElement[]).map(img => {
                return new Promise<void>((resolve, reject) => {
                    if (img.complete) {
                        resolve();
                    } else {
                        img.addEventListener('load', () => resolve());
                        img.addEventListener('error', () => {
                            resolve();
                        });
                    }
                });
            });

            // Wait for images to load and then resolve open coordinates for the modal
            await Promise.all(imagePromises);
        }

        if(modal) {
            const coords = this.#resolveCoordinates(modalOptions.position, modal);
            modal.style.left = `${coords.x}px`;
            modal.style.top = `${coords.y}px`;

            await modal.transition({
                opacity: 1
            });

            // Make the modal draggable
            this.#makeDraggable(modal, modalHead);
        
            // Make the modal's close button (X in the top right corner) close the modal
            modal.addEventListener('click', async function(e) {
                const dClose = (e.target as HTMLDivElement).dataset.close;

                if(dClose) {
                    const targetModal = document.querySelector(`#${dClose}`) as HTMLDivElement;

                    if(targetModal) {
                        await targetModal.transition({
                            opacity: 0
                        });

                        targetModal.parentElement?.removeChild(targetModal);
                    }
                }
            })
        }
    }
}
