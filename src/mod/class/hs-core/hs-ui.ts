import { EModalPosition, HSPanelTabDefinition, HSUICModalOptions, HSUIDOMCoordinates, HSUIModalOptions, HSUIXY } from "../../types/hs-ui-types";
import { HSUtils } from "../hs-utils/hs-utils";
import { HSLogger } from "./hs-logger";
import { HSModule } from "./hs-module";
import { HSUIC } from "./hs-ui-components";
import panelCSS from "inline:../../resource/css/hs-panel.css";
import panelHTML from "inline:../../resource/html/hs-panel.html";

export class HSUI extends HSModule {
    #staticPanelHtml: string;
    #staticPanelCss: string;

    uiReady = false;

    #uiPanel? : HTMLDivElement;
    #uiPanelTitle?: HTMLDivElement;
    #uiPanelCloseBtn? : HTMLDivElement;
    #uiPanelOpenBtn?: HTMLDivElement;

    #loggerElement?: HTMLTextAreaElement;

    #tabs : HSPanelTabDefinition[] = [
        {
            tabId: 1,
            tabBodySel: '.hs-panel-body-1',
            tabSel: '#hs-panel-tab-1'
        },
        {
            tabId: 2,
            tabBodySel: '.hs-panel-body-2',
            tabSel: '#hs-panel-tab-2'
        },
        {
            tabId: 3,
            tabBodySel: '.hs-panel-body-3',
            tabSel: '#hs-panel-tab-3'
        },
        {
            tabId: 4,
            tabBodySel: '.hs-panel-body-4',
            tabSel: '#hs-panel-tab-4'
        }
    ];

    constructor(moduleName: string, context: string) {
        super(moduleName, context);
        this.#staticPanelCss = panelCSS;
        this.#staticPanelHtml = panelHTML;
    }

    init() {
        HSLogger.log("Initialising HSUI module", this.context);

        const self = this;

        // Inject UI panel styles
        const panelStyleElement = document.createElement('style');
        panelStyleElement.textContent = this.#staticPanelCss;
        document.head.appendChild(panelStyleElement);

        // Create temp div, inject UI panel HTML and append the contents to body
        const div = document.createElement('div');
        div.innerHTML = this.#staticPanelHtml;

        while (div.firstChild) {
            document.body.appendChild(div.firstChild);
        }

        // Find the UI elements in DOM and store the refs
        this.#uiPanel = document.querySelector('#hs-panel') as HTMLDivElement;
        this.#uiPanelTitle = document.querySelector('#hs-panel-version') as HTMLDivElement;
        this.#uiPanelCloseBtn = document.querySelector('.hs-panel-header-right') as HTMLDivElement;
        this.#loggerElement = document.querySelector('#hs-ui-log') as HTMLTextAreaElement;
        const panelHandle = document.querySelector('.hs-panel-header') as HTMLDivElement;

        // Make the HS UI panel draggable
        this.#makeDraggable(this.#uiPanel, panelHandle);

        // Make the HS UI panel closeable
        this.#uiPanelCloseBtn.addEventListener('click', () => {
            self.#uiPanel?.classList.add('hs-panel-closed');
        });

        // Bind panel controls
        const tabs = document.querySelectorAll('.hs-panel-tab');

        tabs.forEach(tab => {
            tab.addEventListener('click', (e) => {
                const tab = e.target as HTMLDivElement;
                const panelId = tab.dataset.panel;

                if(tab.classList.contains('hs-tab-selected'))
                    return;

                if(panelId) {
                    tabs.forEach(tab => {
                        tab.classList.remove('hs-tab-selected');
                    });

                    tab.classList.add('hs-tab-selected');

                    document.querySelectorAll('.hs-panel-body').forEach(panel => {
                        panel.classList.remove('hs-panel-body-open');
                    });

                    const targetPanel = document.querySelector(`.hs-panel-body-${panelId}`) as HTMLDivElement;

                    if(targetPanel) {
                        targetPanel.classList.add('hs-panel-body-open');

                        // Log panel (auto scroll to bottom when log tab selected)
                        if(panelId === "1") {
                            const logElem = targetPanel.querySelector('#hs-ui-log') as HTMLDivElement;

                            if(logElem) {
                                logElem.scrollTop = logElem.scrollHeight;
                            }
                        }
                    }
                }
            });
        });

        // Create open button for the HS UI panel
        this.#uiPanelOpenBtn = document.createElement('div');
        this.#uiPanelOpenBtn.id = "hs-panel-control";

        // Open button opens the panel
        this.#uiPanelOpenBtn.addEventListener('click', () => {
            self.#uiPanel?.classList.remove('hs-panel-closed');
        });

        document.body.appendChild(this.#uiPanelOpenBtn);

        this.uiReady = true;
    }

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

    static injectStyle(styleString: string) {
        if(styleString) {
            const styleElement = document.createElement('style');
            styleElement.textContent = styleString;
            document.head.appendChild(styleElement);

            HSLogger.log(`Injected new CSS`, "HSUI");
        }
    }

    static injectHTML(htmlString: string, injectFunction: (node: ChildNode) => void) {
        const div = document.createElement('div');
        div.innerHTML = htmlString;

        while (div.firstChild) {
            injectFunction(div.firstChild);
        };

        HSLogger.log(`Injected new HTML`, "HSUI");
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

    #resolveCoordinates(coordinates: HSUIDOMCoordinates = EModalPosition.CENTER, relativeTo?: HTMLElement): HSUIXY {
        let position = { x: 0, y: 0 };

        const windowCenterX = window.innerWidth / 2;
        const windowCenterY = window.innerHeight / 2;

        if(!relativeTo) {
            if(Number.isInteger(coordinates)) {
                switch(coordinates) {
                    case EModalPosition.CENTER:
                        position = { x: windowCenterX, y: windowCenterY };
                        break;
                    case EModalPosition.RIGHT:
                        position = { x: window.innerWidth - 25, y: windowCenterY };
                        break;
                    case EModalPosition.LEFT:
                        position = { x: 25, y: windowCenterY };
                        break;
                    default:
                        position = { x: windowCenterX, y: windowCenterY };
                        break;
                }
            } else {
                position = coordinates as HSUIXY;
            }

            return position;
        }

        const elementRect = relativeTo.getBoundingClientRect();
        console.log(elementRect)

        if(Number.isInteger(coordinates)) {
            switch(coordinates) {
                case EModalPosition.CENTER:
                    position = { 
                        x: windowCenterX - elementRect.width / 2, 
                        y: windowCenterY - elementRect.height / 2
                    };
                    break;
                case EModalPosition.RIGHT:
                    position = { 
                        x: window.innerWidth - 25 - elementRect.width, 
                        y: windowCenterY - elementRect.height / 2
                    };
                    break;
                case EModalPosition.LEFT:
                    position = { 
                        x: 25 + elementRect.width, 
                        y: windowCenterY - elementRect.height / 2
                    };
                    break;
                default:
                    position = { 
                        x: windowCenterX - elementRect.width / 2, 
                        y: windowCenterY - elementRect.height / 2
                    };
                    break;
            }
        } else {
            position = coordinates as HSUIXY;
        }

        return position;
    }

    async Modal(modalOptions: HSUIModalOptions) {
        const uuid = `hs-dom-${HSUtils.uuidv4()}`;
        const html = HSUIC._modal({
            ...modalOptions,
            id: uuid
        });	

        // Create temp div, inject UI panel HTML and append the contents to body
        const div = document.createElement('div');
        div.innerHTML = html;

        while (div.firstChild) {
            document.body.appendChild(div.firstChild);
        };

        const modal = document.querySelector(`#${uuid}`) as HTMLDivElement;
        const modalHead = document.querySelector(`#${uuid} > .hs-modal-head`) as HTMLDivElement;

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

            Promise.all(imagePromises).then(() => {
                const coords = this.#resolveCoordinates(modalOptions.position, modal);
                modal.style.left = `${coords.x}px`;
                modal.style.top = `${coords.y}px`;
            });
        } else {
            const coords = this.#resolveCoordinates(modalOptions.position, modal);
            modal.style.left = `${coords.x}px`;
            modal.style.top = `${coords.y}px`;
        }

        this.#makeDraggable(modal, modalHead);

        if(modal) {
            modal.addEventListener('click', function(e) {
                const dClose = (e.target as HTMLDivElement).dataset.close;

                if(dClose) {
                    const targetModal = document.querySelector(`#${dClose}`) as HTMLDivElement;

                    if(targetModal) {
                        targetModal.parentElement?.removeChild(targetModal);
                    }
                }
            })
        }
    }
}
