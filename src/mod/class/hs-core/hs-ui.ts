import { EModalPosition, HSPanelTabDefinition, HSUICModalOptions, HSUIDOMCoordinates, HSUIModalOptions, HSUIXY } from "../../types/hs-ui-types";
import { HSUtils } from "../hs-utils/hs-utils";
import { HSLogger } from "./hs-logger";
import { HSModule } from "./hs-module";
import { HSUIC } from "./hs-ui-components";

export class HSUI extends HSModule {
    #staticPanelHtml = `<div id="hs-panel">
                            <div id="hs-panel-header">
                                <div id="hs-panel-header-left">Hypersynergism v0.1</div>
                                <div id="hs-panel-header-right">X</div>
                            </div>
                            <div id="hs-panel-tabs">
                                <div class="hs-panel-tab hs-tab-selected" id="hs-panel-tab-1" data-panel="1">Log</div>
                                <div class="hs-panel-tab" id="hs-panel-tab-2" data-panel="2">???</div>
                                <div class="hs-panel-tab" id="hs-panel-tab-3" data-panel="3">???</div>
                                <div class="hs-panel-tab" id="hs-panel-tab-4" data-panel="4">???</div>
                            </div>
                            <div class="hs-panel-body hs-panel-body-1 hs-panel-body-open">
                                <textarea id="hs-ui-log"></textarea>
                            </div>
                            <div class="hs-panel-body hs-panel-body-2">Panel 2</div>
                            <div class="hs-panel-body hs-panel-body-3">Panel 3</div>
                            <div class="hs-panel-body hs-panel-body-4">Panel 4</div>
                        </div>`;

    #staticPanelCss = `
                        #hs-panel,
                        #hs-panel-header,
                        #hs-panel-header-left,
                        #hs-panel-header-right,
                        #hs-panel-tabs,
                        .hs-panel-tab,
                        .hs-panel-body {
                            box-sizing: border-box;
                        }

                        .hs-panel-closed {
                            display: none;
                        }

                        #hs-panel {
                            width: 400px;
                            height: 400px;
                            position: absolute;
                            top: 100px;
                            left: 100px;
                            z-index: 7000;
                            
                            background-color: #1c1b22;
                            border: 1px solid white;
                            border-radius: 3px;

                            -webkit-box-shadow: 3px 3px 5px 0px rgba(0,0,0,0.75);
                            -moz-box-shadow: 3px 3px 5px 0px rgba(0,0,0,0.75);
                            box-shadow: 3px 3px 5px 0px rgba(0,0,0,0.75);
                            
                            font-family: -apple-system,
                                BlinkMacSystemFont,
                                "Segoe UI",
                                Roboto,
                                Oxygen,
                                Ubuntu,
                                Cantarell,
                                "Open Sans",
                                "Helvetica Neue",
                                sans-serif;

                            opacity: 0.92;
                        }

                        #hs-panel-header {
                            width: 100%;
                            height: 45px;
                            line-height: calc(45px - (5px * 2));
                            font-size: 14pt;
                            color: white;
                            background-color: #353439;
                            display: flex;
                        }

                        #hs-panel-header-left {
                            padding: 5px 10px 5px 10px;
                            flex-grow: 1;
                        }

                        #hs-panel-header-right {
                            width: 36px;
                            height: 36px;
                            margin: 4px;
                            border: 1px solid white;
                            flex-grow: 0;
                            line-height: 35px;
                            text-align: center;
                            font-size: 14pt;
                            font-weight: bold;
                        }

                        #hs-panel-header-right:hover {
                            background-color: maroon;
                            cursor: pointer;
                        }

                        #hs-panel-tabs {
                            width: 100%;
                            height: 40px;
                            padding: 0px 0px 0px 0px;
                            color: white;
                            
                            display: flex;
                            flex-direction: row;
                            flex-wrap: nowrap;
                            justify-content: center;
                            align-items: center;
                            align-content: space-between;
                        }

                        .hs-panel-tab {
                            height: 100%;
                            flex-grow: 1;
                            flex-shrink: 1;
                            flex-basis: auto;
                            display: flex;
                            justify-content: center;
                            font-weight: bold;
                            line-height: 40px;
                            margin: 0px 2px 0px 2px;
                            border-radius: 0px;
                            font-size: 13pt;
                        }

                        .hs-panel-tab:hover {
                            background-color: #006;
                            cursor: pointer;
                        }

                        #hs-panel-tab-1 {
                            border-top: 1px solid orange;
                            border-left: 1px solid orange;
                            border-right: 1px solid orange;
                        }

                        #hs-panel-tab-1.hs-tab-selected {
                            background-color: orange;
                        }

                        #hs-panel-tab-2 {
                            border-top: 1px solid cyan;
                            border-left: 1px solid cyan;
                            border-right: 1px solid cyan;
                        }

                        #hs-panel-tab-2.hs-tab-selected {
                            background-color: blue;
                        }

                        #hs-panel-tab-3 {
                            border-top: 1px solid maroon;
                            border-left: 1px solid maroon;
                            border-right: 1px solid maroon;
                        }

                        #hs-panel-tab-3.hs-tab-selected {
                            background-color: maroon;
                        }

                        #hs-panel-tab-4 {
                            border-top: 1px solid plum;
                            border-left: 1px solid plum;
                            border-right: 1px solid plum;
                        }

                        #hs-panel-tab-4.hs-tab-selected {
                            background-color: plum;
                        }

                        .hs-panel-body {
                            width: 100%;
                            height: calc(100% - 45px - 40px);
                            background-color: #18171c;
                            border-top: 1px solid white;
                            display: none;
                            padding: 10px;
                        }

                        .hs-panel-body-open {
                            display: block;
                        }

                        #hs-ui-log {
                            width: 100%;
                            height: 100%;
                            resize: none;
                            padding: 5px;
                            box-sizing: border-box;
                            
                            background-color: #18171c;
                            color: white;
                        }
                        
                        #hs-panel-control {
                            position: absolute;
                            top: 10px;
                            right: 10px;
                            width: 35px;
                            height: 35px;
                            background-image: url(https://synergism.cc/Pictures/Default/OcteractCorruptions.png);
                            background-repeat: no-repeat;
                            background-size: contain;
                            transform-origin: 50% 50%;
                        }

                        #hs-panel-control:hover {
                            cursor: pointer;
                            transform: scale(1.05);
                        }

                        .hs-panel-btn {
                            border: 2px solid white;
                            min-height: 30px;
                            color: white;
                            transition: background-color 0.15s, border-color 0.15s;
                            cursor: pointer;
                            background-color: #101828;
                            width: 130px;
                            height: 30px;
                            line-height: 30px;
                            text-align: center;
                        }

                        .hs-panel-btn:hover {
                            background-color: #005;
                        }

                        .hs-modal {
                            width: auto;
                            height: auto;
                            position: absolute;
                            z-index: 7000;

                            top: -9001px;
                            left: -9001px;
                            
                            background-color: #1c1b22;
                            border: 1px solid white;
                            border-radius: 3px;

                            -webkit-box-shadow: 3px 3px 5px 0px rgba(0,0,0,0.75);
                            -moz-box-shadow: 3px 3px 5px 0px rgba(0,0,0,0.75);
                            box-shadow: 3px 3px 5px 0px rgba(0,0,0,0.75);
                            
                            font-family: -apple-system,
                                BlinkMacSystemFont,
                                "Segoe UI",
                                Roboto,
                                Oxygen,
                                Ubuntu,
                                Cantarell,
                                "Open Sans",
                                "Helvetica Neue",
                                sans-serif;

                            opacity: 0.97;
                        }

                        .hs-modal-head {
                            width: 100%;
                            height: 45px;
                            line-height: calc(45px - (5px * 2));
                            font-size: 14pt;
                            color: white;
                            background-color: #353439;
                            display: flex;
                        }

                        .hs-modal-head-left {
                            padding: 5px 10px 5px 10px;
                            flex-grow: 1;
                        }

                        .hs-modal-head-right {
                            width: 36px;
                            height: 36px;
                            margin: 4px;
                            border: 1px solid white;
                            flex-grow: 0;
                            line-height: 35px;
                            text-align: center;
                            font-size: 14pt;
                            font-weight: bold;
                        }

                        .hs-modal-head-right:hover {
                            background-color: maroon;
                            cursor: pointer;
                        }

                        .hs-modal-body {
                            width: 100%;
                            height: calc(100% - 45px);
                            max-height: 60vh;
                            max-width: 40vw;
                            background-color: #18171c;
                            border-top: 1px solid white;
                            padding: 10px;
                            box-sizing: border-box;
                            overflow-x: hidden;
                            overflow-y: auto;
                        }

                        .hs-modal-img {
                            image-rendering: auto;
                        }
                        `;

    uiReady = false;

    #uiPanel? : HTMLDivElement;
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
        this.#uiPanelCloseBtn = document.querySelector('#hs-panel-header-right') as HTMLDivElement;
        this.#loggerElement = document.querySelector('#hs-ui-log') as HTMLTextAreaElement;
        const panelHandle = document.querySelector('#hs-panel-header') as HTMLDivElement;

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

    injectStyle(styleString: string) {
        if(styleString) {
            const styleElement = document.createElement('style');
            styleElement.textContent = styleString;
            document.head.appendChild(styleElement);

            HSLogger.log(`Injected new css`, this.context);
        }
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
