"use strict";
(() => {
  // src/mod/class/hs-core/hs-logger.ts
  var HSLogger = class {
    static #integratedToUI = false;
    static #logElement;
    // Integrates the logger to the mod's UI panel's Log tab
    static integrateToUI(hsui) {
      const logElement = hsui.getLogElement();
      if (logElement) {
        this.#logElement = logElement;
        this.#integratedToUI = true;
        this.log("HSLogger integrated to UI", "HSLogger");
      }
    }
    // If the logger is integrated to the UI, we can use this method to log everything to the textarea in the Log tab in the mod's panel
    static #logToUi(msg, context = "HSMain", logType = 1 /* LOG */) {
      if (this.#integratedToUI) {
        let level = "";
        switch (logType) {
          case 1 /* LOG */:
            level = "";
            break;
          case 2 /* WARN */:
            level = "WARN ";
            break;
          case 3 /* ERROR */:
            level = "ERROR ";
            break;
          default:
            level = "";
            break;
        }
        this.#logElement.value += `${level}[${context}]: ${msg}
`;
        this.#logElement.scrollTop = this.#logElement.scrollHeight;
      }
    }
    static log(msg, context = "HSMain") {
      console.log(`[${context}]: ${msg}`);
      this.#logToUi(msg, context, 1 /* LOG */);
    }
    static warn(msg, context = "HSMain") {
      console.warn(`[${context}]: ${msg}`);
      this.#logToUi(msg, context, 2 /* WARN */);
    }
    static error(msg, context = "HSMain") {
      console.error(`[${context}]: ${msg}`);
      this.#logToUi(msg, context, 3 /* ERROR */);
    }
  };

  // src/mod/class/hs-core/hs-module.ts
  var HSModule = class {
    constructor(moduleName, context) {
      this.moduleName = moduleName;
      this.context = context;
      HSLogger.log(`Enabled module '${moduleName}'`);
    }
    getName() {
      return this.moduleName;
    }
  };

  // src/mod/class/hs-modules/hs-potions.ts
  var HSPotions = class extends HSModule {
    #offeringPotion;
    #obtainiumPotion;
    #config;
    #offeringPotionObserver;
    #obtainiumPotionObserver;
    constructor(moduleName, context) {
      super(moduleName, context);
      this.#offeringPotion = document.getElementById("offeringPotionHide");
      this.#obtainiumPotion = document.getElementById("obtainiumPotionHide");
      this.#config = { attributes: false, childList: true, subtree: true };
      this.#offeringPotionObserver = new MutationObserver((mutations, observer) => {
        this.#offeringMutationTrigger(mutations, observer);
      });
      this.#obtainiumPotionObserver = new MutationObserver((mutations, observer) => {
        this.#obtainiumMutationTrigger(mutations, observer);
      });
    }
    init() {
      HSLogger.log("Initialising HSPotions module", this.context);
      this.observe();
    }
    observe() {
      this.#offeringPotionObserver.observe(this.#offeringPotion, this.#config);
      this.#obtainiumPotionObserver.observe(this.#obtainiumPotion, this.#config);
    }
    #offeringMutationTrigger(mutations, observer) {
      const moddedButton = document.getElementById("offeringPotionMultiUseButton");
      if (moddedButton === null) {
        const useOfferingPotionButton = document.getElementById("useofferingpotion");
        const buyOfferingPotionButton = document.getElementById("buyofferingpotion");
        if (!useOfferingPotionButton || !buyOfferingPotionButton) {
          HSLogger.warn("Could not find native buttons for use/buy offering potions", this.context);
          return;
        }
        if (useOfferingPotionButton) {
          let clone = useOfferingPotionButton.cloneNode(true);
          clone.id = "offeringPotionMultiUseButton";
          clone.textContent = "CONSUME 10x";
          clone.addEventListener("click", () => {
            for (let i = 0; i < 10; i++) {
              useOfferingPotionButton.click();
            }
          });
          useOfferingPotionButton.parentNode?.insertBefore(clone, useOfferingPotionButton.nextSibling);
        }
        if (buyOfferingPotionButton) {
          let clone2 = buyOfferingPotionButton.cloneNode(true);
          clone2.id = "offeringPotionMultiBuyButton";
          clone2.textContent = "BUY 10x";
          clone2.addEventListener("click", () => {
            for (let i = 0; i < 10; i++) {
              buyOfferingPotionButton.click();
              setTimeout(() => {
                document.getElementById("ok_confirm")?.click();
              }, 1);
            }
          });
          buyOfferingPotionButton.parentNode?.insertBefore(clone2, buyOfferingPotionButton.nextSibling);
        }
        this.#offeringPotionObserver.disconnect();
        HSLogger.log("Offering potion multi buy / consume buttons injected", this.context);
      }
    }
    #obtainiumMutationTrigger(mutations, observer) {
      const moddedButton = document.getElementById("obtainiumPotionMultiUseButton");
      if (moddedButton === null) {
        const useObtainiumPotionButton = document.getElementById("useobtainiumpotion");
        const buyObtainiumPotionButton = document.getElementById("buyobtainiumpotion");
        if (!useObtainiumPotionButton || !buyObtainiumPotionButton) {
          HSLogger.warn("Could not find native buttons for use/buy obtainium potions", this.context);
          return;
        }
        if (useObtainiumPotionButton) {
          let clone = useObtainiumPotionButton.cloneNode(true);
          clone.id = "obtainiumPotionMultiUseButton";
          clone.textContent = "CONSUME 10x";
          clone.addEventListener("click", () => {
            for (let i = 0; i < 10; i++) {
              useObtainiumPotionButton.click();
            }
          });
          useObtainiumPotionButton.parentNode?.insertBefore(clone, useObtainiumPotionButton.nextSibling);
        }
        if (buyObtainiumPotionButton) {
          let clone2 = buyObtainiumPotionButton.cloneNode(true);
          clone2.id = "obtainiumPotionMultiBuyButton";
          clone2.textContent = "BUY 10x";
          clone2.addEventListener("click", () => {
            for (let i = 0; i < 10; i++) {
              buyObtainiumPotionButton.click();
              setTimeout(() => {
                document.getElementById("ok_confirm")?.click();
              }, 1);
            }
          });
          buyObtainiumPotionButton.parentNode?.insertBefore(clone2, buyObtainiumPotionButton.nextSibling);
        }
        this.#obtainiumPotionObserver.disconnect();
        HSLogger.log("Obtainium potion multi buy / consume buttons injected", this.context);
      }
    }
  };

  // src/mod/class/hs-modules/hs-codes.ts
  var HSCodes = class extends HSModule {
    #codeBoxLabel;
    #config;
    #codeBoxLabelObserver;
    #codeSpanStyle = "white-space: nowrap; user-select: all; -webkit-user-select: all; -moz-user-select: all; -ms-user-select: all;";
    constructor(moduleName, context) {
      super(moduleName, context);
      this.#codeBoxLabel = document.querySelector('label[for="prompt_text"]');
      this.#config = { attributes: false, childList: true, subtree: true };
      if (this.#codeBoxLabel) {
        this.#codeBoxLabelObserver = new MutationObserver((mutations, observer) => {
          this.#codeBoxLabelTrigger(mutations, observer);
        });
      }
    }
    init() {
      HSLogger.log("Initialising HSCodes module", this.context);
      this.observe();
    }
    observe() {
      this.#codeBoxLabelObserver?.observe(this.#codeBoxLabel, this.#config);
    }
    #codeBoxLabelTrigger(mutations, observer) {
      if (this.#codeBoxLabel && this.#codeBoxLabel.innerText.includes("synergism2021")) {
        try {
          this.#codeBoxLabelObserver?.disconnect();
          const originalText = this.#codeBoxLabel.innerText;
          this.#codeBoxLabel.innerHTML = `${originalText} [HSCodes] treats you with additional codes for convenience <span style="${this.#codeSpanStyle}">:unsmith:</span> and <span style="${this.#codeSpanStyle}">:antismith:</span>`;
          HSLogger.log("Added :antismith: and :unsmith: to code redeem panel", this.context);
        } finally {
          if (this.#codeBoxLabel)
            this.#codeBoxLabelObserver?.observe(this.#codeBoxLabel, this.#config);
        }
      }
    }
  };

  // src/mod/class/hs-core/hs-elementhooker.ts
  var HSElementHooker = class {
    // Class context, mainly for HSLogger
    static #context = "HSElementHooker";
    // These are probably not needed. Was worried that the intervals might stay running for all eternity
    static #hookTimeout = 50;
    static #enableTimeout = false;
    constructor() {
    }
    // Uses setInterval to "watch" for when an element is found in DOM
    // Returns a promise which can be awaited and resolves with reference to the element when the element is found in DOM
    static HookElement(selector) {
      const self = this;
      return new Promise((resolve, reject) => {
        let timeout = self.#hookTimeout;
        const ivl = setInterval(() => {
          const element = document.querySelector(selector);
          if (element) {
            clearInterval(ivl);
            resolve(element);
          }
          if (self.#enableTimeout && timeout <= 0) {
            HSLogger.warn("Hook timed out", self.#context);
            clearInterval(ivl);
            reject();
          }
          timeout--;
        }, 50);
      });
    }
    // Same as HookElement, but accepts a selector like '.someClass' or an array of selectors
    // Returns a promise which can be awaited and resolves with a list of references to all of the elements when ALL of the elements are found in DOM
    static HookElements(selector) {
      const self = this;
      return new Promise((resolve, reject) => {
        let timeout = self.#hookTimeout;
        const ivl = setInterval(() => {
          const elements = [];
          if (Array.isArray(selector) && selector.length === 0 || !Array.isArray(selector) && (!selector || selector === "")) {
            clearInterval(ivl);
            resolve([]);
            return;
          }
          if (Array.isArray(selector)) {
            selector.forEach((selector2) => {
              elements.push(document.querySelector(selector2));
            });
          } else {
            const nodeList = document.querySelectorAll(selector);
            const nodesToElements = Array.from(nodeList);
            elements.push(...nodesToElements);
          }
          if (!elements.includes(null) && elements.length > 0) {
            clearInterval(ivl);
            resolve(elements);
          }
          if (self.#enableTimeout && timeout <= 0) {
            HSLogger.warn("Hook timed out", self.#context);
            clearInterval(ivl);
            reject();
          }
          timeout--;
        }, 150);
      });
    }
  };

  // src/mod/class/hs-utils/hs-utils.ts
  var HSUtils = class {
    // Simple promise-based wait/delay utility method
    static wait(delay) {
      return new Promise(function(resolve) {
        setTimeout(resolve, delay);
      });
    }
    static uuidv4() {
      return "10000000-1000-4000-8000-100000000000".replace(
        /[018]/g,
        (c) => (+c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> +c / 4).toString(16)
      );
    }
  };

  // src/mod/class/hs-modules/hs-hepteracts.ts
  var HSHepteracts = class extends HSModule {
    #heptGrid;
    #config;
    #injected = false;
    #hepteracts = [
      "chronosHepteract",
      "hyperrealismHepteract",
      "quarkHepteract",
      "challengeHepteract",
      "abyssHepteract",
      "acceleratorHepteract",
      "acceleratorBoostHepteract",
      "multiplierHepteract"
    ];
    constructor(moduleName, context) {
      super(moduleName, context);
      this.#config = { attributes: false, childList: true, subtree: true };
    }
    async init() {
      HSLogger.log("Initialising HSHepteracts module", this.context);
      const self = this;
      this.#heptGrid = await HSElementHooker.HookElement("#heptGrid");
      this.#heptGrid.childNodes.forEach((node) => {
        if (node.nodeType === 1) {
          const htmlNode = node;
          const id = htmlNode.id;
          if (self.#hepteracts.includes(id)) {
            const craftMaxBtn = document.querySelector(`#${id}CraftMax`);
            const capBtn = document.querySelector(`#${id}Cap`);
            const heptImg = document.querySelector(`#${id}Image`);
            if (craftMaxBtn && capBtn && heptImg) {
              heptImg.addEventListener("click", async () => {
                capBtn.click();
                await HSUtils.wait(15);
                document.getElementById("ok_confirm")?.click();
                await HSUtils.wait(15);
                document.getElementById("ok_alert")?.click();
                await HSUtils.wait(15);
                craftMaxBtn.click();
                await HSUtils.wait(15);
                document.getElementById("ok_confirm")?.click();
                await HSUtils.wait(15);
                document.getElementById("ok_alert")?.click();
              });
            }
          }
        }
      });
      HSLogger.log("Hepteract images now serve as 'quick expand and max' buttons", this.context);
    }
  };

  // src/mod/class/hs-modules/hs-talismans.ts
  var HSTalismans = class extends HSModule {
    #talismanBuyButtons = [];
    #buyAllButton;
    #currentButtonIndex = 3 /* BLUE */;
    #indexResetTimeout = null;
    #indexResetTimeoutTime = 3e3;
    constructor(moduleName, context) {
      super(moduleName, context);
    }
    async init() {
      const self = this;
      HSLogger.log("Initialising HSTalismans module", this.context);
      this.#buyAllButton = await HSElementHooker.HookElement("#buyTalismanAll");
      this.#talismanBuyButtons = await HSElementHooker.HookElements(".fragmentBtn");
      const buyAllClone = this.#buyAllButton.cloneNode(true);
      this.#buyAllButton.replaceWith(buyAllClone);
      this.#buyAllButton = await HSElementHooker.HookElement("#buyTalismanAll");
      this.#buyAllButton.addEventListener("click", (e) => {
        if (self.#indexResetTimeout)
          clearTimeout(self.#indexResetTimeout);
        if (self.#talismanBuyButtons.length === 0) return;
        self.#talismanBuyButtons[self.#currentButtonIndex].click();
        self.#currentButtonIndex++;
        if (self.#currentButtonIndex > self.#talismanBuyButtons.length - 1) {
          self.#currentButtonIndex = 0;
        }
        self.#indexResetTimeout = setTimeout(() => {
          self.#currentButtonIndex = 3 /* BLUE */;
        }, self.#indexResetTimeoutTime);
      });
      HSLogger.log("Talisman BUY ALL button is now more functional", this.context);
    }
  };

  // src/mod/class/hs-core/hs-ui-components.ts
  var HSUIC = class {
    static dataString(data) {
      let str = ``;
      data.forEach((d) => {
        str += `data-${d.key}="${d.value}" `;
      });
      return str;
    }
    static Button(options) {
      const comp_class = options.class ?? "";
      const comp_text = options.text ?? "Button";
      return `<div class="hs-panel-btn ${comp_class}" id="${options.id}">${comp_text}</div>`;
    }
    static _modal(options) {
      const comp_class = options.class ?? "";
      const comp_html = options.htmlContent ?? "";
      const comp_data = options.data ?? [];
      return `<div class="hs-modal ${comp_class}" id="${options.id}">
					<div class="hs-modal-head">
						<div class="hs-modal-head-left"></div>
						<div class="hs-modal-head-right" data-close="${options.id}">x</div>
					</div>
					<div class="hs-modal-body">
						${comp_html}
					</div>
				</div>`;
    }
    static closeModal(a) {
      console.log(a);
    }
  };

  // src/mod/class/hs-core/hs-ui.ts
  var HSUI = class extends HSModule {
    constructor(moduleName, context) {
      super(moduleName, context);
      this.#staticPanelHtml = `<div id="hs-panel">
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
      this.#staticPanelCss = `
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
						`;
      this.uiReady = false;
      this.#tabs = [
        {
          tabId: 1,
          tabBodySel: ".hs-panel-body-1",
          tabSel: "#hs-panel-tab-1"
        },
        {
          tabId: 2,
          tabBodySel: ".hs-panel-body-2",
          tabSel: "#hs-panel-tab-2"
        },
        {
          tabId: 3,
          tabBodySel: ".hs-panel-body-3",
          tabSel: "#hs-panel-tab-3"
        },
        {
          tabId: 4,
          tabBodySel: ".hs-panel-body-4",
          tabSel: "#hs-panel-tab-4"
        }
      ];
    }
    #staticPanelHtml;
    #staticPanelCss;
    #uiPanel;
    #uiPanelCloseBtn;
    #uiPanelOpenBtn;
    #loggerElement;
    #tabs;
    init() {
      HSLogger.log("Initialising HSUI module", this.context);
      const self = this;
      const panelStyleElement = document.createElement("style");
      panelStyleElement.textContent = this.#staticPanelCss;
      document.head.appendChild(panelStyleElement);
      const div = document.createElement("div");
      div.innerHTML = this.#staticPanelHtml;
      while (div.firstChild) {
        document.body.appendChild(div.firstChild);
      }
      this.#uiPanel = document.querySelector("#hs-panel");
      this.#uiPanelCloseBtn = document.querySelector("#hs-panel-header-right");
      this.#loggerElement = document.querySelector("#hs-ui-log");
      const panelHandle = document.querySelector("#hs-panel-header");
      this.#makeDraggable(this.#uiPanel, panelHandle);
      this.#uiPanelCloseBtn.addEventListener("click", () => {
        self.#uiPanel?.classList.add("hs-panel-closed");
      });
      const tabs = document.querySelectorAll(".hs-panel-tab");
      tabs.forEach((tab) => {
        tab.addEventListener("click", (e) => {
          const tab2 = e.target;
          const panelId = tab2.dataset.panel;
          if (tab2.classList.contains("hs-tab-selected"))
            return;
          if (panelId) {
            tabs.forEach((tab3) => {
              tab3.classList.remove("hs-tab-selected");
            });
            tab2.classList.add("hs-tab-selected");
            document.querySelectorAll(".hs-panel-body").forEach((panel) => {
              panel.classList.remove("hs-panel-body-open");
            });
            const targetPanel = document.querySelector(`.hs-panel-body-${panelId}`);
            if (targetPanel) {
              targetPanel.classList.add("hs-panel-body-open");
            }
          }
        });
      });
      this.#uiPanelOpenBtn = document.createElement("div");
      this.#uiPanelOpenBtn.id = "hs-panel-control";
      this.#uiPanelOpenBtn.addEventListener("click", () => {
        self.#uiPanel?.classList.remove("hs-panel-closed");
      });
      document.body.appendChild(this.#uiPanelOpenBtn);
      this.uiReady = true;
    }
    #makeDraggable(element, dragHandle) {
      let pos1 = 0;
      let pos2 = 0;
      let pos3 = 0;
      let pos4 = 0;
      dragHandle.onmousedown = dragMouseDown;
      function dragMouseDown(e) {
        e.preventDefault();
        pos3 = e.clientX;
        pos4 = e.clientY;
        document.onmouseup = closeDragElement;
        document.onmousemove = elementDrag;
      }
      function elementDrag(e) {
        e.preventDefault();
        pos1 = pos3 - e.clientX;
        pos2 = pos4 - e.clientY;
        pos3 = e.clientX;
        pos4 = e.clientY;
        element.style.top = element.offsetTop - pos2 + "px";
        element.style.left = element.offsetLeft - pos1 + "px";
      }
      function closeDragElement() {
        document.onmouseup = null;
        document.onmousemove = null;
      }
    }
    getLogElement() {
      return this.#loggerElement ? this.#loggerElement : null;
    }
    replaceTabContents(tabId, htmlContent) {
      const tab = this.#tabs.find((t) => {
        return t.tabId === tabId;
      });
      if (!tab) {
        HSLogger.warn("Could not find tab to replace contents", this.context);
        return;
      }
      const tabBody = document.querySelector(tab.tabBodySel);
      if (tabBody) {
        tabBody.innerHTML = htmlContent;
        HSLogger.log(`Replaced tab ${tab.tabId} content`, this.context);
      }
    }
    injectStyle(styleString) {
      if (styleString) {
        const styleElement = document.createElement("style");
        styleElement.textContent = styleString;
        document.head.appendChild(styleElement);
        HSLogger.log(`Injected new css`, this.context);
      }
    }
    renameTab(tabId, newName) {
      const tab = this.#tabs.find((t) => {
        return t.tabId === tabId;
      });
      if (!tab) {
        HSLogger.warn("Could not find tab to rename", this.context);
        return;
      }
      const tabEl = document.querySelector(tab.tabSel);
      if (tabEl) {
        tabEl.innerHTML = newName;
      }
    }
    #resolveCoordinates(coordinates = 1 /* CENTER */, relativeTo) {
      let position = { x: 0, y: 0 };
      const windowCenterX = window.innerWidth / 2;
      const windowCenterY = window.innerHeight / 2;
      if (!relativeTo) {
        if (Number.isInteger(coordinates)) {
          switch (coordinates) {
            case 1 /* CENTER */:
              position = { x: windowCenterX, y: windowCenterY };
              break;
            case 2 /* RIGHT */:
              position = { x: window.innerWidth - 25, y: windowCenterY };
              break;
            case 3 /* LEFT */:
              position = { x: 25, y: windowCenterY };
              break;
            default:
              position = { x: windowCenterX, y: windowCenterY };
              break;
          }
        } else {
          position = coordinates;
        }
        return position;
      }
      const elementRect = relativeTo.getBoundingClientRect();
      console.log(elementRect);
      if (Number.isInteger(coordinates)) {
        switch (coordinates) {
          case 1 /* CENTER */:
            position = {
              x: windowCenterX - elementRect.width / 2,
              y: windowCenterY - elementRect.height / 2
            };
            break;
          case 2 /* RIGHT */:
            position = {
              x: window.innerWidth - 25 - elementRect.width,
              y: windowCenterY - elementRect.height / 2
            };
            break;
          case 3 /* LEFT */:
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
        position = coordinates;
      }
      return position;
    }
    async Modal(modalOptions) {
      const uuid = `hs-dom-${HSUtils.uuidv4()}`;
      const html = HSUIC._modal({
        ...modalOptions,
        id: uuid
      });
      const div = document.createElement("div");
      div.innerHTML = html;
      while (div.firstChild) {
        document.body.appendChild(div.firstChild);
      }
      ;
      const modal = document.querySelector(`#${uuid}`);
      const modalHead = document.querySelector(`#${uuid} > .hs-modal-head`);
      if (modalOptions.needsToLoad && modalOptions.needsToLoad === true) {
        const images = document.querySelectorAll(`#${uuid} > .hs-modal-body img`);
        const imagePromises = Array.from(images).map((img) => {
          return new Promise((resolve, reject) => {
            if (img.complete) {
              resolve();
            } else {
              img.addEventListener("load", () => resolve());
              img.addEventListener("error", () => {
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
      if (modal) {
        modal.addEventListener("click", function(e) {
          const dClose = e.target.dataset.close;
          if (dClose) {
            const targetModal = document.querySelector(`#${dClose}`);
            if (targetModal) {
              targetModal.parentElement?.removeChild(targetModal);
            }
          }
        });
      }
    }
  };

  // src/mod/class/hs-core/hs-module-manager.ts
  var HSModuleManager = class {
    #context = "HSModuleManager";
    #modules = [];
    // This record is needed so that the modules can be instatiated properly and so that everything works nicely with TypeScript
    #moduleClasses = {
      "HSUI": HSUI,
      "HSPotions": HSPotions,
      "HSCodes": HSCodes,
      "HSHepteracts": HSHepteracts,
      "HSTalismans": HSTalismans
    };
    constructor(context) {
      this.#context = context;
    }
    // Adds module to the manager and instantiates the module's class
    async addModule(className, context, moduleName) {
      try {
        const ModuleClass = this.#moduleClasses[className];
        if (!ModuleClass) {
          throw new Error(`Class "${className}" not found in module`);
        }
        const module = new ModuleClass(moduleName || context, context);
        this.#modules.push(module);
      } catch (error) {
        HSLogger.warn(`Failed to add module ${className}:`, this.#context);
        console.log(error);
        return null;
      }
    }
    // Returns a list of all of the enabled modules
    getModules() {
      return this.#modules;
    }
    // Returns a module by name
    // The reason why this looks so complicated is because we need to do some TypeScript shenanigans to properly return the found mod with the correct type
    // Used like: const hsui = this.#moduleManager.getModule<HSUI>('HSUI');
    // the e.g. <HSUI> part tells the getModule method which module (type) we're expecting it to return
    getModule(moduleName) {
      return this.#modules.find((mod) => {
        return mod.getName() === moduleName;
      });
    }
  };

  // src/mod/resource/corruption_ref.txt
  var corruption_ref_default = "data:image/png;base64,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";

  // src/mod/class/hypersynergism.ts
  var Hypersynergism = class {
    // Class context, mainly for HSLogger
    #context = "HSMain";
    // Enabled modules
    #enabledModuleList;
    // HSModuleManager instance
    #moduleManager;
    constructor(enabledModules2) {
      this.#enabledModuleList = enabledModules2;
      this.#moduleManager = new HSModuleManager("HSModuleManager");
      HSLogger.log("Enabling Hypersynergism modules", this.#context);
      this.#enabledModuleList.forEach((def) => {
        this.#moduleManager.addModule(def.className, def.context || def.className, def.moduleName || def.className);
      });
    }
    async init() {
      HSLogger.log("Initialising Hypersynergism modules", this.#context);
      this.#moduleManager.getModules().forEach(async (mod) => {
        await mod.init();
        if (mod.getName() === "HSUI") {
          const hsui = this.#moduleManager.getModule("HSUI");
          if (hsui) {
            HSLogger.integrateToUI(hsui);
          }
        }
      });
      this.#buildUIPanelContents();
    }
    #buildUIPanelContents() {
      const hsui = this.#moduleManager.getModule("HSUI");
      if (hsui) {
        hsui.replaceTabContents(2, HSUIC.Button({ id: "hs-panel-cor-ref-btn", text: "Corruption Ref." }));
        document.querySelector("#hs-panel-cor-ref-btn")?.addEventListener("click", () => {
          hsui.Modal({ htmlContent: `<img class="hs-modal-img" src="${corruption_ref_default}" />`, needsToLoad: true });
        });
        hsui.renameTab(2, "Tools");
      }
    }
  };

  // src/mod/index.ts
  var enabledModules = [
    {
      className: "HSUI",
      context: "HSUI"
    },
    {
      className: "HSPotions",
      context: "HSPotions"
    },
    {
      className: "HSCodes",
      context: "HSCodes"
    },
    {
      className: "HSHepteracts",
      context: "HSHepteracts"
    },
    {
      className: "HSTalismans",
      context: "HSTalismans"
    }
  ];
  var hypersynergism = new Hypersynergism(enabledModules);
  window.hypersynergism = hypersynergism;
})();
