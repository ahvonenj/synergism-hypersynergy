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

						.hs-modal-img {
							image-rendering: auto;
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
  var corruption_ref_default = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAkMAAAPPCAYAAADHPM+MAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAADsMAAA7DAcdvqGQAAP+lSURBVHhe7P1Zlhs9r4YLZqa/6VRzq5D3IKqZgmRfV9U4JPnMo07dSPIYqhlAOn1zBpJp1gJJkAAIMhqFlFIk3rWw968gCUajL/kYYAhP/9v/9r85MzMzMzMzM7Ovak/wf0yPr6enJ3nIZDLNoOfnZ/fv3z952GR6WH379s29v7/Lw19W//33n8HQUmQwZDJdRwZDpqXJYIjLYGhBMhgyma4jgyHT0mQwxGUwtCAZDJlM15HBkGlpMhjiMhhakAyGTKbryGDItDQZDHE9CAyd3fbpyT11B/dXNn26/rpD9+SenrbuLJtuLIOhz1b8nt7Bd8E0rwyG7lW/3Y+XZ/f8tHGnj3/OntBwGQxx3RcMnbd+QU+W4MdgaIgMhhBGuG1v9mAeEYbg+/scztlWkqq+BAydf7iXZ/gu4N/fvXu7q2v+6359fxHgYzA0VbPC0N9f7vsLPJvy7+/T08rtXj/u/tncDQz9PXThxpGVC451B8Afg6EhMhiS3xN8Np3zXyOTIoOhIVo6DP39tXbPz0/uaXNyH/Ey4dj68Obu57I1GDJN1awwRPT313f37eXZrXav6bv0CLoTGOr7F3Ve5A7byr/4RVQpQFQe2x3OcWGUY/vaQbiootHF1WDofiRhCL4W8nm2nqUncNdhW3dwZw/psQ+2JWcStsR3IfbvDgfx/W6cQxojv4//3Hmb/9UOn7MQaIi/N2w7u+2z7q8cF6757R/cN/jXdjy2PX35hWfZMHRm0RVd2Cd/x/ZvEUj+/nLr52fX7fdu+xz9/Dm49Yt+LABX+P79WgPcdG7/B3yFKE+3P7n9Os+1OX24f/8QhOh3de/+fLwpgAR+aF/wj5GJ0Nbtj27v545zHGGOcKW/f7y4FwBDaNsc47kuT7eDIXh239zLM40Q/XY/v72459XOvX6c3Y9vL269C88E7/3m+E5g6q/79T/gA58p+Hqf9e/SfcAQgkw1n5HTH6GLgCdYQIpoAC48PWN726U/XGDr7Z8luIavLQlDY5+lGJ8A+zIYyt8tpY88hzSGzBn/AHSecALc+P7xD42M7ARows/YHwGofzxcN0QJYD6/ZB22Xz6ytmgYwvQYiQpxSVgCiIHPEYgiDPkFzIMLdPkVwEc71gNDACjd/o/7SACEMKNFhuQxBKGNO/rP0kcGpQBAov/vH+4FFnI/P5zyD/cLoW9huh0MKcd+/ySfzwGMnp7853d47h58EHjw88Yd3wNM/f7JP8+hu4AhLUXGJRc5XED09Adv6xvb014sgHmRDIfKxe2zZDCUwTYZTa32Pcv4v3NUUcBOMX4gDI05h2JMCSsBdmL0B2Fpe85/FABmJPxAxCc1k/GKf4QhP2auvzQPriXDkJYiY4qw1O1zygzH+GNvEYboHiMEH4jeyGN9MOQjPmEMLKIQDeDRoQYMRZgJMIXTBh/hGIDdC5sjRIIiLMG1wjmucvtSdUsY4pGgf+7sYQYjRaTtHZ/7/3gfPjr095f7H2jfHN07OowwxaNHl+kuYGhwZKgGLOkztYGw09cuN3UTMxi6N/FniZCd4KbnWRb9JewUIDMQhhTw0WwSDEXwkb6CPxgwAYZin+x3604z/cF5VC0ZhvoiQwx8sJ0CEsIQHV+Aj3ZsOAzxSFEdhnj/eC4MkHpgSKbJUoRpebotDGE0BwDojztA2qwLYMRAScCQjxSdf/j/Lf++gS0PhlJqoAYUbWDBRQzXnFGw09deRAukDIbuR+JZSrDoe5ZF+/VgqHoO8pwVWNFgKKTQNE2DIdTfwzr5V5q/jBYNQynNVdkz1IgM+YgNjr8iDM0RGWJpsQYMocK4nDJbmm4NQxjNeVqt3Aq+T6m9DkMeds45pRabr6L7gKEEIOXCUXubrIQhATfyc2Xs4PYq7BgM3Y9qz7K2H0xIgojcMyTHF+0DYEj6kJLnoMAKhxm5B0iqD4bKzwBA8N+ddyf2D31VLRqG4DH/eClTZecf8W2yuGcopcFwz1CEp6EwJF+DB3DxEFbbM8T3KoEXAJdnBi4SkCTs5PYQ4ZHtHIbefn331xwCFnz/0NJ0cxjyzwI3QSubqdOeIdxDhHuCsH3ePUJSdwNDoLR3CC0tCLVFTi5SceHbwiI1Enaq7aX/YLiYGQzdj8pnWaZgW8+S9PdjDiLyI9rl22byu6DCkHdSP4fRMBT9pbA+8ef798NQ2ncU533799cd1iQsbW+TLR6GQGnvUPp+iz1A9DeIaBRpMAxFwEA/3d6d9jCnjAxt3KaTb5Nlv98xZVJ7m4z2ieeaU11tGEobrvE+2Ntko1WHodz2FPcOBWFkKD73eO95CiwDE3uuM8LRXcGQ6TLBF8Q0p2QazPRV9RVg6PNVpslM19O1YKgp9hZZOlikyT5DBkMLksHQ3DIYMgUZDN1CBkO31GfAUNhEXYn6GAyZ5pLB0NwyGDIFGQzdQgZDt9TNYQjSl+reH4Mh08wyGDKZriODIdPSdHMYunMlGMqbkszMzMzMzMzMvpgZDJmZmZmZmZl9abM02TIED9NkMs0vS5OZliZLk3HZnqEFyWDIZLqODIZMS5PBEJfB0IJkMGQyXUcGQ6alyWCIy2BoQTIYMpmuI4Mh09JkMMRlMLQgGQyZTNfRNBg6ux/PtKbXEN1qTEuyFtkQ5TF/Bo+pacrvDU0dw0tzfCUZDHEZDC1I9wZDvsZbUZfLZHo8TYKh8w8/jlZ779WtxrSkVKnv1ZQxNcX6ZbTyfK+mjhEV7r+SDIa4DIYWJAlDY2HE9ydFTn3hXDFe9mlp7Pwm072qgCFRuFSDgPMPKDrZuf0bFAmN0Rv2Ku/GncQgPgaFVeJhjGzTx6Siq0p0p9UGChXsib9B10rH5Orz0J8VWgVhEVe8B6mIalBZmd4PigVZ4z1gbfoYKArqK6RXIj+8QOvX03gY4sVSeUkN+gvT4bn2F1Ht9/c/o/xdJoOhBelSGJLSYGiMLp3fZLoXMRhCONie/CLvYeTpyW1PdFGXqav4eRPG6JJj8DBEfjrXxdIwHIbkGApOEnhabcQfTZGJivQBeiLg1MYkGIrnLFJnAGMAIeF6JAxV0l0+8kPuAQMYOYaCUw2GvnaKDDQdhlZutYL7vWP3LlSk70Lb8xB4Kf3Rchx/f/3PSH+XyWBoQWrDUKiztT2f3Rb/SIiaW7k/1uTK1sWOBeD8PbiO9KNNRV+T6UFFYQgjKwl+PKzAd52ATpG6GgBDxRh/0I/r9ie39yAjYEiO8fCydvvTPkAMBZ5WG/FH0114rQl+YjvCkTYmw9DG7fddjNjgOce2zd7tu9CHwZCa7gpj2D2gMCTHQITiZe32x32IQGnA88VTZKDpMLRxu13nXl46t0vPIbZtdm63hojbEHih/tbB3+t7v79Y+R7XnNXu1QFDBXh6Dp8/cr/0uUcGQwvSEBiiACRhRX7WIkO8z9ltZVqNfJb+TKZHFYWhIhIkIkWpD0td9cNQOQZhZOtO/97cQYEhbUwcWAeeRptMkRWRIBEp0sZQGDr9OXggAejwU0Vw2Zz+uMM6LIQUhurprq07fby5g4/48HZtTBzovldg6KunyECXwNDRP9cX1+0iTEbw2Bxf3WENlekjvAhwSQZFWT/O7gf6e937FFsXwYb6238n/iB19v3g/vhOf92v/yFt9PzeT8G3L/46gIQMhpalITDE2OS8bcJLPwwJ+SjR1iVUavU1mR5I42BIpq7IMbogMDCqjwkRF0xxKYClQE0LeOptMt01BIbKMQyGAGAAemKqLPgjxxkMyXRXPhYiOJj+ohCjjYmqwpClyEAXwdB7ANOXmCo7/0QogeMUUFqS/r55f5AqY/4Y8AgPvt8qR5QEfBX7kBoyGFqQPgOGfB9G/QZDpuVpFAzJ1FWhvHdnw1JtfEyI+uAmawWGlDFJVeBptBXprgEwpIzhMPQv7RFK6Tk/Fq5HwJBMd6WoD/ZRYEgZk1SDIUuReV0GQx8hYgepLZ+OhJTW0b1/wDOqwwtX6Q/2CBX+BAwFAKJrDoEhuil7RFQIZDC0IN0chmA8gR+LDJmWqiF7hhAIqqkrotCnNUZsdmYW+pVjiGrA02gr0135WuWeoXze5RgJQ5DayG+P4f6hEobKdJfYCC3vwZ+PPL+W7qrAkKXIgi6FIXiu3wFaEEj8/RQwNDRNhikwBJkEOByGcF8QRnxkZOjv/xLacZ6h+4VABkML0lVgSLxG34Ih3yY/GwyZFqD+t8kQCCqpq/MPtz6IzdR9Y5hkZKhnTAV46m1auov0ZW+TkXPQxkgYSuBD3yyTMNRIdyXJyFDPGBWGLEWGuhiG4vPwUZoVvlk2PTKUwQejOtFfAUO40Tq/jeY/I0z5sSfhu18GQwvS3DBE3xSrvU0WAAj7HNzWYMi0QBW/M4RvkMXvPo8SybRRUPp9H4xsDEl3JQkYqo1BeJH/EgeYeTvU205auisK3yCL/WtRoiwJQ+HaYZFLG6klDLXSXUkChtL8YgxCUHGdx3CdliLzuhyG4FZDqgze2ML7eQkMgT/yRhj6UzdJx+/iZuOen9cehk4xfYZRoxQl8um29pmADIYWJPhymEym+VXAUEXN1FVFtxrTkp7uamvKmJpyimy4rzKt1i9LkWWNh6Fly2BoQTIYMpmuo2Ew1JO6UnWrMS3V0l0tTRlTE0l3DfbVkyJTZSkyKoMhLoOhBclgyGS6jobBkMn0ODIY4jIYWpAMhkym68hgyLQ0GQxxGQwtSMWGQTMzMzMzM7NhZjC0DMHDNJlM88siQ6alySJDXBYZWpAMhkym68hgyLQ0GQxxGQwtSAZDJtN1ZDBkWpoMhrgMhhYkgyGT6ToyGDItTQZDXAZDC9I1YGjuX5G+d38mk6ZpMDTl94BuNaamKb8fNGVMTVN/P2jKmK/9m0MGQ1wGQwvS/DB0dlsoNTAba9y7vyCoyYblR5ahs9s+d+7wJo+bhmoSDNVKZrR0qzE1VUtsNDRlTE2DynIITR3zxctyfD4MleU4PlMGQwuShCFfaDW9Nkiqy4fGVHcMTAUKUbtsbn8g9MngwxeAVV57lHPO7S90dtunzhUsJK5v0LwD2qYI/EFtnq5CN+dtqMtE25cHeLdVAUOiBpgGArxkBhZnpd+/jTuJQXqZDVrBXrbJMTFKE+dIdcRQ7LxDXTCqosTGoOtUirfS+Wl/VsE+1y5D6SU2aPV62aaMiaCTz7kEHivLMQWGRF2wWAMsCWrCpfYhgGMwZLqS4AuadXbbahHWEFFJi6OHhRIAYExeQK/gz485+wKyfQu1lg6b219sKEBHu54MF615W21TBBEe6k+BofPWPXdbt5Xt/vjBKSNMA8RgSK1aT4q1esnUVfy8CWN0yTF4GCI/nes6DYbkGISR2F/4CsVi0ZeEIZHuUivWS8CSKbJyflpiIxRs5fPn1kq6y0d+yPUzgBFjoO8POF/okSFqc6RQZiky0HQYWrnVCu45VqoPgqKtUFHetw0q1HpfMhhakDgMcfnoBC7yfnGnURGlon0tQhI1n7/QtwkKPiojx87tL6iEpKGpuNa8rbYpAn/PCgyF49vzm9JuqbJLRGEIq8/zSvXwvSGgU6SuBsBQMcYf9OO6/cntadX66hiEkY3b7zsRZYptm73bd7mqfJJId+F1yir1CEfaGHX+VHw1gouYP52Bmu4KY9j1UxhSx2T5qurwDwjabikyr+kwtHG7XedeXjq3S88itm12breGqBuBod8/Q/X4GFGCivThvssK98HHend0e++jEoG6kgyGFqQ6DPHIDQOZcKRcrLUISdKc/pS+QiWgXMGflzLWg5OWTpNSxg5qmyIdhnz6bHt2/9R2BKUb/FVZoCgMFZEgESlKfSSI9MBQOQaBZOtO/97cQYGhckyGkdPbwZ9XApUILpsT+uIwJFNkRSRIRIq0MWz+PwefEgPo8PNHcNmc/rjDOiyqFIaKdJefEmBm604fb+7gozy8XRtDFdJhPDJkKbKgS2Do6J/ti+t2ESgj8GyOr+6wJoADqbPvhxhBkvAjP+c0XACg26bRDIYWpAKG6F4ZsviX8CJTTpXFe25/vW0gLTLTGtNqA2n+UEpbEfWqqTVvqy3Mme6rMAk8QQrsALQ9b11gHaXdX0p5zDRM42BIpq7IMfp8GRjVxwSYwX1DCmDJMQgjABAwJrYHcCHHGQzJdNcQGCrHlPPHdFQxv4QhLUWGUSFYcDHlRSFGG0OEe4cKn5YiA10EQ+8BTl9iquz8E6EGjlPAER58v5XbvTZgaLVzr+/xCaf+74WvuWUwtCAVMEQUNvGGRb2EF7FYN9JIqPn8tUBB830Ff0mfAUNTJGEnfM5RH9keZDA0XaNgqEhdSeUN0RuWauNjQtQHN1krMKSM4TDyL+0R2p/2BGTQF4GhIt01AIaUMdr8PgpTzC9gSEl3hagP9lFgSBmTBBEJn5rZuKNMxVmKzOsyGPoIUTtIlR33Pkr0vDm69w8JOAg09B95BkOmK6sFQwwgigU+LNYIAR4Y9NBJ1mz+WqCgwMkV/GVp7doxTa15W21TJGEnbKyWUSVvZNO0wdB0DdkzhFBQpq5KhT6tMfQNMmmhXznGe2Ywwt8Gw74lDJXprvqeoXzO5Rg5P6RJ8ttjuH+ohKGc7iLXn94gkxaAKM1fpLti9EeCUJzHUmRBl8KQT4H5+wzPZBX3D3HACZuqIX0W9v1YZMh0EzEYAliRqawELGKBZzDDQSZpbn9JdVDgc6SjM/uj0seGcbW3ydIRdWx/2xRJGJLS2sMx2zM0Tf1vkyEUaKmrABLrg9hM3TeGSUaGamMEDFGoSn0lDGnpLnKd7G0yMr82RsJQAh/6ZpmEIZLual0/iwzVUmR1ELIUGdfFMBSfiY/6rPDNMg2Gugg/+W00gyHTVcVgKC7A9F9TfO2GyI7SVt0wPLc/fa9MBga+STtpbn9Ctc3VAYiI75Rqa83bapsiPQJUQpEGQ/Y22SUqfmcI3yCLz4BHiWTqKAgjLWFMX7pLSsBQdYyEoTxv7itgSE13obv4Blm8zlqUiAwQMBTmxze68vwEhki6q5g/ScBQmp+nu/DtMfnfiAex09ZSZESXw1C83y/PboUbqWuAg9+fzcY9P68NhkzXFXzZLlU7BTVe9+6vUPUttQcX/M4QQOS1/6IsVAUMVaSnrtq61Zia9HRXW1PG1FSmyPrV9xaZJkuRcY2HoWXLYGhBuhyG+lJQY3Xv/jRBNKe2Oftx5X+V2r92b5qiYTBUS121dKsxNdXSXS1NGVPTkBSZVC1F1pKlyKQMhrgMhhaky2HIBCr3Az26LEV2qYbBkMn0ODIY4jIYWpAMhkym68hgyLQ0GQxxGQwtSMWmQTMzMzMzM7NhZjC0DMHDdM7MzGxug7ex/v0rj5uZPap9+/bk3t/L41/V/vvPYGgxMhgyM7uOGQyZLc0MhrgZDC1IBkNmZtcxgyGzpZnBEDeDoQXJYMjM7DpmMGS2NDMY4mYwtCAZDJmZXcemwtCP5yf33D25txFjbzbm5TZjaoa+/ozwlcZ8lG01mzLmK5jBEDeDoQXpWjAUfuiwPD7UQomL8riZ2aPYJBg6h3HdfsTYG44JJTKuPKZmvyf4ImM+xox5GTnmi9g1Yejntyf3vHpyrw8EoAZDCxKFIa0mFtpZ+SK07DNhCOuhqfOf4zV1T+6vbJvbcK5o3UHpo9jfAx9Hr4PXept+j8yubwUM/X1ya1IDS1vUzz/CuP3bk/u3wDE+4hL7b07RDxr4e8n+Th+8/Tf6+kPmJ/01eNHGfB8wBgAqjTFLNhmG4n3HZ+9t8+TeCfj0wdCv7+G5HN/v57kYDC1I8KWUDxi+uFBA9fBXaRtonw1DHUCDAjzgdwu+lba5DeAy3cOh9xT6kXNDMEIYvfS+mt3OGAwhOGzDMQ8Jvlgr/8POUlc4ZkPGPJcQMecYAIPqGJrumjKGwBD+90lTZ39/xShOBH4JQyxFhiAU50fo8fMTnyzdhSA0ZgyZ32waDPnnGu87wk86RuDHYMj0qRoLQzIyUYsY4aJNo03SX8uXhCHoC+Nb/rS5WZ94XWeI2FAYisfRb4INeR/kZ2J+LhLROeNcsg+MlX7kZ2qizWDocYzCEPzxh88JfmKaCuHIjxGpKxyTAAPHRNC55hhfxT1CA46hKaopY+AYwtB+H8anKBO2bZ7cvgt9GAyJFBmCUwKZ2M7mFymywWMsRVa1KTDkIeephBiEm91rOI4wtNvE5wLRw2N4Dtg3rRcNaLqlGQwtSPDFkg9YLsBoHl4IoMioRdGX+JBwIz97XwRQZLv01zc3AAP4oKkpPwZ8ChjaykhM5bOPOFVSXQhpBdDFY3LsUL+YaqORofQHQXlGZvdjFIaKSJCIFKU+BBCKaIuI+txiDALBHGPgGMLQ6S30T6AUwQT8HdYlDMl0VxHVEVGfS8bAeViKTLfRMPT7yX0TUSG03z/DvV7twv1HaJIAhLBkkSHTVTUYhpRIB1gRfYlWRDAogGj+hS8NhmREpHduARKpv4wMUVOuE8bV0m60jzw/MAQibewQvy1QagGh2efbWBiSb3e1gONWYxASZLpryph0LIKOh57Yjv7ScQFD8i2yIWAj011TxphxmxOGMFXGYIhEfKAdxko4MhgyXUWDYUiABZoGKepxBYZohENGOobCkDwm+6Y+dH4BQ3LDcnGd8dq1uVrnQo/hHNo9lePQ/D1ogJKcw+y+bBQMKW93tYDjVmM8JCjpriljwCgMYaptf+Jjf0kYUt4i6wUb5S2yQWMsRda0OWEII0MIOzUYQlgyGDJdVYNhSImYgPVGZ/CYAkPSF7WhMNQ3N6bGWMpMghE9F+Xc/Dw9URgJJTLdhudFozwtv0NASH1OZndjFIZqe4ZwgddSStq+nFuNofAx1xgwCkMJoOI/QDA1JWFIprtwfkyr+Xss4GfqGPhsKbK6jYYh8haZhBiZBqvBkEWGTDfRYBjC/SqNfT6ybxWGFDCQpsEQjawMnptEoRJwNGCI7vOR5yGvn5qEIekXzwP7tPz6z8q1wRj6TAYBk9mnGYWhtPCLt8nSK+faDyCKqI4EjGuMgUWnGKOkuyaNkTBEwAe+x5gCkzAkU2RpfuXNMAQZNd1VeZusOcaM2WgYUvYGwTFMkdGIkdwzJDdeox+EJznPZ5jB0II0BobAYNHHf8m1FuI+GMI+yZfwp8EQ+KPzy2iK7MvmoRAjziXt64m/BQRzeN8VoKndFxm5on7Rd5q/5je2FYYbvyv3y+z+jMEQGL7ZFZ9fLUrE/IgxtYjPHGNgodHGyBTVJWMkDGGEifZlMKSkyJLh22B0fuijpMgGjbEUWa9NgSGwBD/k7xdCD/YB+Fnvntx+nZ8R6wMwGwFpIW+TncOC1h3cX9nUq79xAd26s/rZNFbwhZMP+B5NAo6Z2b1bAUMVk1EV2a7Z0sbUTEZvZLtmU8dYiqzfpsLQUm0YDJ23jAIz/HwdGPp76MS1s1YSGencoeygqu1zvAyGzMyuY0NhSE1d9djNxlTSXS2bMqZmaoqsx6aku6aM+YpmMMStF4bSgr3NiALHOr/ifwUYoqBTuVYPi138tdUhMDTA5wQZDJmZXceGwpCZ2aOYwRC3HhiKsFMFlAxDB7KngnBTEVUKEAWS8CM/02NoFDTC3N3hzPq05ubg0fJN9PfgOmg7w//XwEWeR/CDEJmuN56L/9zrc5rAv3zAZmZml5vBkNnSzGCIWxuGECYYYVAhLCGECHiCRb+Ajxr89H2G06GfB8ydYET6kp+lb0XRnwSXAD0wDn0iVNHzqUTQKj6nqgA/MzMzMzMzs2FWgyEtRcZVLvIBKvQoC2+TQCI+IyjQuSOcMfipzR1TV3geGVqG+FakggtGhShwkWsXkanCt+pzumAOSbtmZmaXm0WGzJZmFhniNk9kqAYk6TO1gTCkpbgYVPTMrUWGsG+vb0UKuPBokgJDJHqlAo/iM4uMVSynG7PguHzAZmZml5vBkNnSzGCIWxuGcLGupo/aQIKRJQSMUZEhusdGVXvufO5oZcSm7ltRAS54vprx668CTOHzMhkMmZldxwyGzJZmBkPc2jBEIzsipVR7m6yEIbmHZiAMyT1AhcbMLdXnW1EvuIjIEOtfma/X5zgZDJmZXccMhsyWZgZD3HphCCQjHHnxbgOJTPVst3Qfj4Qf+bkcH0zA0sC5+dgh7VFFhClakU/jMIQQid3Y/qvBPscJfMgHbGZmdrnNDUOTfidowpiaTfn9oEvGjPltoZpN+f2gKWNq5n2t5vF1D2YwxG0QDD2i5N4lddP0wrQkGPLPr1I77FqW0p4XlsbQ/GjHzB7HZoWhVimNmk0ZU7NGiY2qTRnTKr8x1lplOWo2Z1mO6Gs1h687sWvDEBZjhb97WJNMOybHfZYtFIaUKFPvZvDHlwpDpLgpGv3BQw8dd7hAj4UhrGgvjw82WWNMM+VeFgVqNT/asQmGz+pNaTO7rkkYgihN+u8J63ihiQruJ7F4FiUuRH8NHuQYHyWK/VMdsdr8IpIhfcn+Q+YfMkaW0sBaZumcaX8s1krOmV6T9JUKtZL5JaTIshxs/mM5P/V3VOZfWomPyTBEqtfj/aJFWsFklfrasXuyhcIQSEmDLRiEQHCN7AHHRVj+2jPcl0sX5mvbp8BQCwq1exnhiAGR5kc7ZvZQVoMh/6vzInWUCpbGaKCEIZbuqlSml4AjU2QIQ4PmFzDE0l2VivXF/BeMwRQZwgieM02d+eKf4pxVX3AtlYr1ErBkiqyYXyzeOD/4kjC0tBQZ2BQY0irUp2Ok4KoGPtqxe7IFw9DXk4QhgB4JQtIodGgAAhE2utjLN+goVHkgIW1aRXgZXamdX+1ctLnl8SJaU+mH4+V5y3lxrOqXRH00P9qxvvMBg2d3IGPPsOjEe4J/pGE83D8K/Yc3fm7sX29xfhgP50Xb2DizwmowtN+LiAmCyubJ7WFhlTAk0l0ILrIaPcKRNibNUZsfFm46P13ARbpLm9+nMSJoTB6jpMgQRtI5kyiLds4JRkSKDMFFVrYv5hcpssHzSxhaYIoMbAoMQTV6uIcyxYXpr91rgGNMhXlbPbndpjx2D5XqqRkMLUjwJUsPd2BqhkGHHBPBBaFGAopf6DHiEfv2zbclERI2Xpicy4ODnFsCjQIxQ8c3ozfiPkjz4IJtmh/lmLw+eS8QcACC5BgKQxRkZPv2Obd5+ME2uJ5n7tusbTUYOr2FKEla9CO4wEJ9WJcwJNNNRVRFRIq0MTi/963Mj6CQ5ieLjvTVmh8X/iljirQWgZHTn5ASS+ccYUaeM46TvopIkIgU4RiZ1sL5j2R+3z/CDkQs/PwChjRfS7DRMPQ7RHZkSgzs989wj1a7DKwyCqQduyczGFqQWjAkIxR4XC7KNJqkwY4EggQCsb0W6VGtAVDsvCr9KIQ0YWjAeA1Y+sZTP+m6NT/yWN+9lD6jSdjByBCdx6cycA4KPEqb9G9WtyoM/YsLaEwhISik4wKGZLqrBRYsCiRSYQmGavN/6DDE0l0987OIysQxNBWWYAjPLbbXzplBDElrDYEhOYbOD6Bz+J7bMZKRjgsYWmKKDGxOGMJUmcGQ6S7UgqHacQlD9DNbbJXNw2hpUSd91JSSAmXqOcrzqlwLPb8mDA0YXwALtQq8oPVClTw24F5eDEMiMiTHIhC1npVZthYMYdpof4r3NILMLwlDSrqrBRY00iQ3KFMYovNTKEnz48KlvBHWmt8vWFPGKCkyf84EhjDV1Tpn71t5i6wXhpQUGZ0fQCfNf4wbt3F+CUMLTZGBzQlDGBlC0NHARzt2T2YwtCDBH2f6cLUFVYKBhCFcqM8yGiI/99iQuVs+7yoyVLseHEd9a37kscr59M0ngaYJQwR2EnRW/gABNMm5zLi1YCjBQLzPmE6SMCTTTXBM239D4Ucbg/Mn333zx4VL86XNT0FmyhiZ1krnTGDon3h7DPtKGNJ81fYMIfzU0loUhmB++vZYml/AUM3XEmw0DJG3yFp7huC4Bj7asXsyg6EFScIQRmHkgkkX7wKGcLOw2GOTjg+MIhQLdW3uChTI81L3/AzcfzRkfAEswvBesuhQhJopb5P13cuLYQj+N40ENazwY1ZYE4bIIg7PGdNJEoa0dJeMBEn4UMdIGOqbP8KQTHfJ+WGBKua/YIz8oUUGQ+Kcsa+EIS3dJSNBEpjUMRKGEHxw/thXwtBSU2Rgo2FI2RsExzBFRiNGGvhox+7JDIYWJAlD3pSUDF2EJXSAqRAVDTftJsNFPoJOskqUBgEIzwMW/SEwBAZ9i3nRBqTomuMVYClMXqOEo5of7VjrXs4BQ+Jeo/8ESvT4QGj6ytYHQxgtoakhBkOVdJc3fIMsPo9alIiOkTDUnB8WKCXdReeHNm3+OcdIGMIIT+2c/ykpsmT4BhmdH/pUUmR0fgQdOj/2ZTC04BQZ2BQYAkvwQ/6GSMDRwEc7dk9mMLQgwZdSPmCzr2n+7TECRmAARzVQNGubhKGxJqMnsl2zKWNqNsXXRWNmSCvJiI9s12zOtNacvu7RpsLQUu3OYEj5oUStXlhFqf6XLHwqaoEV1eO9RB01OSnzMfycbimDITM0GUUC60vNmdXtUhiqpbtaNmVMzdR0V49dMkamyKZYLd3VsiljarbkFBmYwRC3+4ShgkT6hOU3olEYEjXJMHVQToEw1MVfKOVAFUArthkMmT2AyTScgdB0uxSGzMzuzQyGuF0Zhngld69YIyxFZxBWPHzUYQijPmkc9eN9dO5wpr74uOSyWqMMYWjrDhF8cgAJz+sQr0epeZYWnDCoeb5XksGQmdl1zGDIbGlmMMTtyjBUwkiRymKQUIchCitn/N+1dBg5XkSCqtXrif/YR4LM9iwKwEK/NJcsDjvgfGcWhTIzMzMzMzOzEXZNGOLwEYBhuwW4CNCA6afAHcqeIQotIgpT8MxcMIRgE/0EH+R4JU0W+pVRsOr5ziyYw2Qyza/n52f3798/edhkelh9+/bNvb+/y8NfVv/999+VYYiBBQAHprMCNHiAUCMmeR9QhggCS9qY2WCIQBqm3gjMURgqXl/W0mu1851ZBkMm03VkMGRamgyGuG4AQxIscoSlOxwaabEMGnIfDlqx/0aBIZmmq+/d4TDE3x5DwOEwJH3LyFDv+c4sgyGT6ToyGDItTQZDXDeBIQSLruv4W11d549TUMnAgHAS4ULbaC3TVQoMyUiQBJYs6ZO8oVbZF6Sn+Eac78wyGDKZriODIdPSZDDEdRsYIukiuSlZAgKPpmRokemu1A8OsCgOsRyyYcf1QFQJLMUbYUWajO9xCnuhSPqvdr5XEvg3mUzzaxoMnd2P52f33O3d2+CxtxpT09n9eBnra8qYmn4nX38+hvqaOuZl5JhlyWCI60YwZLqFDIa+qgDSn932/DX/qN9Ck2Do/MOP6/ZvbvDQW42p6fzDvYz1NWVMTb/R1x83mFGmjnkZOWZh+nwY+u1+fntxz08bd3z/cJ/9GAyGFiQOQ9oGdCKMlt1gY7eMzA3dOyX3XOXrIClMGQW8QGUkcLj6xsr9b6SlfIMy2dbV+Oa8ffbP7s1/uhyG4Pyft+dP/4N0r9Jg6O+vdagpVomInH88u+fnzu3f/vn7mvrj892cCniQY4L+ul/r51hPTrbJMTFKE+fYnMQi8/eXWz8/x3PYuJMggfOPl2L+/uukY5T56RCY/4XPT5t/o68/cN4x4sP+m+gbk0EHx2yO4hzimBc65gtqPAwhvOB9fecg+feX+57ahwCOwZDpSoIvaFbcpA77tBTggcXZp/WUtnkV3yBMmUZIaWp7toTYbzghbPD9XMP5p69/AJLucI4b+/tOjmrAWIDBbuu2tXbU0HtTyGDo2uIwROGkBgkidSWiNwFgABbowl5Jd/mx+Ov3EobkGIQR/CV97iuADfqSMCTTXQOvk40p5/8j5gcIofPnVpnuip83J/dRzIsSY2BB/nEO/eF/eyjauGMxz9dOkYGmw9DKrVZwz3fs/v399d19e+lC2/N9AM4YGQwtSBoMbc8CRnwTLLpbd/aLtLLZPFqCB7lIy89Jca4D2Q+Gc8k+MFb6kZ+pWFsf3EgN7Y9vOcoTkJEobSN8eyz+YGfZTqRe/9ltn8U9hcUUIkMJXhCGaJSpc4cQNiLt5E/TeeuefWQptOVrg3N8y37XtG3rTsTF38Oa/Ksd5nukP33jxGDIR1c6dzgdXAdRFg0SBPxgdEV+ZjCkprsC7HT7k9t7MBEwVIxBGNm4/b4TUZ7Yttm7fRf6MBiS6S5/nWu3P+1DNKlynTxFpsz/B+dHuOHzJ49FumsADBVjWGOAHglDliLzmg5DG7fbde7lpXO7FFmLbZud260h6kZg6PdP941E6la713jf/7pf37+RvsHHend0e+8j9C8iUFeSwdCCBF+crAwAEAWii7CPsoQGAkNnt5WRGPVza1EvN6H7o+JHK4tz6fUbFm8ZGcqLtAQIqctgyJ8/GSzvTTyqjk33utLOVIWhDEHpqAJDFIB8pCeNacEQ6S8iQzDH8/aUjnn4gTFw4O/BrZ/rabylSUuTpZSTAglluitGcOCP+36vQlQ5BqEJIPTNg6mEoXJMhpHTGzwjAioRXDYn9MVhSEuReTWvU44h8/85+JQYQIcfFsFlc/rjDuuwqFIYKtJdA2CoHMMaQ7psc2TjLUUWdAkMHf2zfXHdLgJlBJ7N8dUd1gRwIDr3/RAjSBJ+5OechgsAdNs0msHQglSDIQ4SJDIjI0NUakSnnnYLCn006Eg/TlmMHeK3DRI8hSaPU2jKEQ7ZN0iZpwYoxbHaWA5wtWvwqs31DPdULEIKDPE+MaLkaUdp74MhDzsy2oM+IbQB7U9uS0NFC9Y4GJKpK3E8fg/7U2QYFQKYwZSVAlhyDMLIR4Se2B7AhRxnMCTTXUSt6yzGyPljOqqYX8KQTJGRY/S/XQZG2piQrsGogqXI6roIht7f3OH7i3uJqbLzT4QaOE4BR3jw/VZu99qAodXOvb7Hb0Xq/174mlsGQwtSFYYopFAAEjBUwoOAhlSjjR6k0mCIHwtziAW/x2/9V8pR2rxUF0SGROowm4QWOVbOKdsVzQ5DOE5pHwRD8prjdSMgkT45tbZMjYKhInWVj4W+JEqEQKSMCVGfjTv5AwoMKWM4jPxLe4RSqsvDBPoiMFSku4ga11mOKef3UZhifgFDzXQXCBbOGDXATdm9YzBNRjZRW4os6TIY+gjQCamy495HiZ43R/f+IQEHgYb+DTEYMl1Z8EXL4osxpmtYykyCEYUfNTKEe1dqkZUSSsqUkoSCtt9+EKpBBJUEk5rkuWn3oSY5lu7fEVa7HvU6LoGhSyNDQ9NgMNfzoqNEY2CoTF0pxxCO4htlRbvcvCyAFPqVY7xjBiP87THsW8JQme4iql6nNobPD2mS/PYY7h8qYSinu5T5o0If2HcVQKaZIosKKTE+xlJkQZfCkE+BRdj0gOPvKQecsKka0mdh349Fhkw3UQuGcoSDLOwNGMr7fMhnsvdFf5W9hCHpF88D+9T9xs8KOJy3HBj6gekCGFKPaerr19eO92Y6DBV7hgjssP4wj39VWsAQ+ex9rp8HRnxCX3mOS9JwGNJSV+WGab6hWh/DJSNDtTEChihUpb4ShrR0F1HtOtUxAoYS+NA3yyQMkXQX9fX7h/t+eOObqT1QhYVTS5HxMRhNomMsRYa6GIbi/fVRnxW+WabBUBfhJ7+NZjBkuqqaMFTARgQVAhFpX49Pe0DduAgxKtDIRRukwJDwG3zHgS2/MXVWGDiXbU0QGiI9iiNTXvqcfWNR14YhUlTYm4zq4Ebs2BaffX7hLAJS822yCFDQCJElGvomG62XqPJtMnFf8B74+yJTR35QEemhG5v1MVQChqpjJAxJ8KK+Yh813dW4Tkh1nSpjChgK82N0Js9PYIiku+T18/0/4reEKimy5hhLkSVdDkPxXr88uxVupK4BTvzubDYb9/y8NhgyXVfwZTOZTPNLjQwp0lNXbd1qTE16uqutKWNqGpIikxqSIpOyFBnXeBhatgyGFiSDIZPpOhoGQ7XUVUu3GlNTLd3V0pQxNVVSZE1VUmRNWYpMymCIy2BoQTIYMpmuo2EwZDI9jgyGuAyGFiSDIZPpOjIYMi1NBkNcBkMLUrHR0czMzMzMzGyYGQwtQ/AwTSbT/LLIkGlpssgQl0WGFiSDIZPpOjIYMi1NBkNcBkMLksGQyXQdGQyZliaDIS6DoQXJYMhkuo4MhkxLk8EQl8HQgmQwZDJdR9NgaMrvAd1qTE1TfkNoypiapv6G0JQxX/t3hwyGuAyGFqR5YEiW8TA9hkJ9Mlm2wzSPJsFQtWRGQ7caU1OtNEdLU8bU1CizUdXUMV+8NMfnw1BZ3uMzZTC0IGkw5KvGF7WylFpbokDqvDDUmq9f+jX4BlKLa55zrs41QPrYIdeu1zcLJmuMZfn6ZKm+2OUwVFSuNyUVMOQBJD8nDQSKkhlYqT6OwaKtzTFetK6ZbJNjsDYYziEWGVZvLNcvQxVlNiLotK+TjlHmp/1ZFftcvwyll9nAgqvx+kU5jaljvnppjvEwJOqMxUr0SVDFPrUPARyDIdOVBF/QrLDAdoezUiC0BTyttqma6rN1DdhGi77KIqdUfefQmqtPrbF98wqpxVqHyGDommIwBFAD98l/zKCyZXAjUlcRQgJMyAr0lTHpMEBU5zoP1X1jEEZif+ErFG1FXxKGRLoLQOjHKRfgjNfJAUumyMr5aZmNULSVz59bK+kuH/kh188ApjHmpTXma6fIQNNhaOVWK7jnWKk+CCvU+7ZUfPVxZDC0IHEYQmnV0lsLtGirQIaPglAHsgI9q2DfmE8u/vJzOFheQzFfYw6vvnaUMhc5ziI2ooc+dui8Uer1Q8X5zh0OcM1xblirisr1AEM0ytS5Qy5LX8ISVFj3kaXQlq8NrqFWuX7rTsTF38OaVGKH+R7pz99wFZEhorIqPAJMTh1hH4wGDRkTD3rY6fYnt9cAqhiTq8bv952IMsW2zd7tO17ZHn210l21c+ZjlPlTAdYILmL+NJWa7gpj2PVTsKmOeXHd/uj2a1i8lTFfPEUGmg5DG7fbdR42d+m+xrbNzu3WEHUjMPT7p/uWooFPbrV7bVa4X+/Cc3uJkdciAnUlGQwtSGNhKC9wdPEli3cFhEI3WLQzEPw9bP2/wtKiz9pb80Ww6g7ur3quvkdxPI+p9+EaCiW6n/OWp7fK+f1RZWz72gtVYSiACGeZEoYoAPlITxrTgiHSX0SGYI7n7Skd8/ADY+DA34NbP9fTeEtSC4Z8mkpEhmS6K3wmqbECYsoxoAAgAKBvHkolDJVjMoyc3uD5kDkiuGxO6IvDUJEiEwrtPDJUjiHz/zn4lBhAh58/gsvm9McdPKRwGNLSXRBteIHr/3hzB5/24u2tMcfGmK+eIgNdAkNH/2xfXLeLQBmBZ3N8dYc1ARxInX0/xAiShB/5OafhAgDdNo1mMLQgDYchrrDXhYPL9qAtylQy8rN15/M2zVNEjoj4fKCYZuo0wACV16DBCACLvE7cx1OaFtkBlXNVAaU4powVKq9dqDbXM9xr/udAgyHeJ0aUPO0o7X0w5GFHRnvQJ4Q7oD1AwNJVhSHcO8TSUTJ1VUZV5GdtTI4K1VJrlTEIIwADMCa2B3AhxxkMyXSXEO4d0ubSjqX5YzqqmF/CkJbuwqgQLLi4B4hCTG0MRIVaYyxFBroIht4DaL7EVNn5J0INHKeAIzz4fiu3e23A0GrnXt/j00r93wtfc8tgaEGaCkMl2AyLYmT4OLstDIaFnER4Kiwk5sNDIQWkjymvoYShsg9X3zmhFD9io3Y9yqOMLaRcO9XsMITjlPZBMCSvOV43AhLpk1Nry5MKQ2kzMkRu6H0toz5w//Mm6Gw0aiPHhKjPJvpWYEgZw2HkX9ojtD/tw7luYA8Q+iIwVKS7iNJ1DkmrlfP7KEwxv4AhJd0Voj7YRwGbyhi/uLbGWIrM6zIY+ggROEiVHfc+SvS8Obr3Dwk4CDT0e28wZLqy4ItWasACzRbgDA0lcAgBwEB7igjBWPADC/6Y6EeMsvg9Mdo45RpuuWdIpATrUsZKFdcupLZfAkOXRoaGpsFgrmexiXg5KmEoRGUKEEoQU083geQeonKMDk8Io9CvHAPiMMLfHsO+JQyV6a6KP9qijuH9IU2S3x7D/UMlDOV0F7n+9DaYtAA3af4U9Rk2xlJkQZfCkE+BAQT5+7uK+4c44IRN1ZA+C/t+LDJkuomGwtB5yxdbvx8mQQ+FhvC/a+kuhJjttkuQAb622y0b054vfvb9a/OV11BEWAo4kroAhtRjmsp+fdde6EIYKvYMEdhh/WEen94RMIT7gcIRn04ZFvEJfeEc+/s+njgM1UEI26rpJi/ZR37WJCNDtTESXghUpb4ShrR0l+aLatiYDD70zTIJQyTd1bp+FuXRUmRS2hhLkaEuhqF4f33UZ4Vvlmkw1EX4yW+jGQyZrioOQ/Stomx+oY4pqWRKuilDg3iFXcgv7hRCtHRXaz4JMQwGGteQ+uZ/+VVOcaB65kJQU6+jMbZ17ZougqHOHc70nsioDm7Ejm0xspdfOIuA1HybLAKUX0O37Ld2nshG66WJwhBGdeTz9rBxgnsiU0d+EInQiD1GarpLSsBQdUwJMOX+JAFDarpr4nUWMBT8wIKZNlJLGCLprub1U7BJ59xKdyljLEWWdDkMxc3qL89uhRupa4ATvzubzcY9P68NhkzXFXzZTCbT/CrTZLr01FVbtxpTk57uamvKmJrKFFm/tLfI+mRvkXGNh6Fly2BoQTIYMpmuo2EwVEtdtXSrMTXV0l0tTRlT05AUmdSQFJmUpcikDIa4DIYWJIMhk+k6GgZDJtPjyGCIy2BoQTIYMpmuI4Mh09JkMMRlMLQgFRsdzczMzMzMzIaZwdAyBA/TZDLNL4sMmZYmiwxxWWRoQTIYMpmuI4Mh09JkMMRlMLQgGQyZTNeRwZBpaTIY4jIYWpAMhkym68hgyLQ0GQxxGQwtSAZDJtN1NA2G5vw9INAUf3P+JtAUX1N+R6imW/2+UByzGjPm8WQwxGUwtCDNA0OyHIfpMaQUYjXNpkkwVC2ZMVFT/FVKbUzSFF+DSm0MlFKlvldTqtTHMasxYx5Qnw9DZXmPz5TB0IJUg6FQP6ynzlain2vAUGu+fkEBUX7+qYHU4br0nC87R5B+nkP86rXNgsn6Ylm+NlmqLXY5DBVV601JBQx5MCHfvVh9nkormZHqfcnoiqhdpgGH5i/XGYNxsk2WzcC6YWGOzUksQOwcyuKsRQmOCEetc+alNmJkh85P+7MK97m2WemLFGpl/63oY8oSHLS6vWzDMavi+NI0HoZEnbFYiT4Jqtin9iGAYzBkupLgC1rIF+Pcui2rpt4CnlbbVE31iUViz0U1+NwWj/mCqLLAKVXfOfS1t9Q6z5F+1UKtQ2QwdE0xGIJF+8c5LOQJIGQFe5nSotAiYAh9bE7eZ4AegAW6sEt/eBigrHOdB24JQzKthTAU+wtfAdTQl4Qh4QtA6McpF+eM18YBR6bIEGDy/DR1Fgq68vlzq0yRxc8bOAd6nlSVFJmP/JB7xqDna6TIQNNhaOVWK3gWWKk+CCvU+7ZUfPVxZDC0IJUwhAtx+P+TYKgCGT4KQh3I6vMREEKXxnxy8Zefw8ESMor5GnN4zdOe/xVK5+Z95ochqDbfucMBrjnODetRUbUeYIhGmTp3yCXpS1iCqvM+shTa8rW1qtbDop9d/D2syb/OYb5H+vM3XEVkKClASgFDMqXlgadzh9PBddCfgAhGixL8xLEIR6q/cNDP3e1Pbk8r2qdmmdbKFeX3+05EmWLbZu/2Ha96r/viwmtg7UWKDGGIzJ+KsyLc8PnTVEWKbAAMqSmyADvd/uj2a1LRXoxZeooMNB2GNm636zxQ7tK9i22bndutIbJGYOj3T/ctRfye3Gr32qxwv96FZ/MSI69FBOpKMhhakCQMZWCRi7Rc2OniSxbvCgiFbrBoZyD4e9j6f2mlRZ+1t+aL59kd3N/iPFOP4ngeU+/D1Qcl7XP0qUYyuJzfH1XOoe23UBWGYCxPmWkwRAHIR3rSmBYMkf4iMgRzPG9P6ZiHHxgDB/4e3Pq5nsZbkqowhOkyuEf01qopLbhnMQpEYKiIBIlIUc1fABCAsDcPrBKGirQWgaHTGzw7AjcRdjYn9MVhqPTFFdp5ZKisRp9h6PTn4FNiCZQi7GxOf9zBQwqHobJKfT8MaSkyiF68PG/d8ePNHXyqjLd/lRQZ6BIYOvrn9+K6XYTGCDyb46s7rAngQOrs+yFGkCT8yM85DRcA6LZpNIOhBYnBkAIjNVAIe1143+1BW5SpZORn687nbZqjiBwR8flAMc3UaYABKs9fgxEAFnmNuI+nNC2yk8XOsQYoxbHyPKXKaxeqzfUM95r/OdBgiPeJESVPO0p7Hwx52JHRHvT5L7aH/TJLl4ShtPcnfpfaKTKiSTCk+cOoEMAMpqkU8JFjEEYABmBMbA8wQ44zGNJ8EeHeIdYuU2TkWJo/prDk/B5SKAzJFBn1Rf6bZmCkpcgwKgQLOO4bkoD1NVJkoItg6D08p5eYKjv/RKiB4xRwhAffb+V2rw0YWu3c63t8Iqn/e+FrbhkMLUgZhmQUpG+RlmAzLIqR4ePstjAYFnIS4amwkJgPD4UUkD6mPP8Shso+XH3nJEXOUWzUrkd5+s4BpFw71ewwhOOU9kEwJK85XjcCEumTU2vLk4ShLEyTkU3UakoragoMKf7CmE2EMAWG1LQWhaF/aY/Q/rRP83lIkDCk+opKe6ZEWq1IkfmDxfw+ciPnlzBUpMik8oboFJlSUmQh6rNxR+9XgaEvlCIDXQZDHyHKBqmy495HiZ43R/f+IQEHgYb+/TAYMl1ZGYYabydpkRe2AGdoKIFDyG/OPri/KSIEY8EPzD8m+hGjLH5PjDZOgYzZ9wwJ0XMUKcG6lPOUKq5dSG2/BIYujQwNTYPBXM/qW1VLUB2GIpiQt6m0lFaSAkO1PUN1f2IztgBV6KentTgM8bfHsG8JQ7ovxR9RmSLzR1l/SKHkt8ewbwlDZYqsVOgDzyCATJkio2+QSQv94DplWm3JuhSGfAoMIMjfw1XcP8QBJ2yqhvRZ2PdjkSHTTZRhSIov0uetsh8mQQ+FhvC/a+kuhJjttkuQAb622y0b054vfg4hmMp8GmSICEsBR1JtGGqfoza/prJf26+iC2Go2DNEYIf1h3n8K94ChnA/UDjiUybDIj6hL5xjf9/HE4Oh8w+3hnsSbqSIymgpLSIFhmQkiMNPjz8v5RzUtJaEFwJVqa+EoaG+qLQUGTmeQAfmiotp6ithSEuRhSjO98Mb30ydojxaikxKRoaGjFmWLoaheA991GeFb5ZpMNRF+MlvoxkMma6qoTCEKSk9WiShQbzCLhR+w4hAiJbuas0nIYbBgB7hSufC0lcSIEaqdY5eEdTUPo3z7PUrdBEMde5wpvdERnVwI3Zsi5G9/MJZBKTm22QRoPw6uWW/teM3EdPpFiQZGeJ7hnh6Sqa04gAShSEmUmF4vBYl0iVgqJrWKgGmfAtMwFDFF79++t3Yuz+nrZIiA0kYCn5gMc19BQw1UmRhMzR5BiLdpY3JEjAE19k7Zlm6HIbiM4DUIm6krgEOfq83G/f8vDYYMl1X8GUzmUzzS8JQTWVK6zJN8VdPa43XFF96imyahqTIpMoUWb+mjHl0jYehZctgaEEyGDKZrqNhMDQkpTVGU/zV0lpTNMVXHvNwtchGjXl8GQxxGQwtSAZDJtN1NAyGTKbHkcEQl8HQgmQwZDJdRwZDpqXJYIgrwVCxEc7MzMzMzMzM7KuYwZCZmZmZmZnZlzZLky1D8DBNJtP8sjSZaWmyNBmX7RlakAyGTKbryGDItDQZDHEZDC1IBkMm03VkMGRamgyGuAyGFiSDIZPpOjIYMi1NBkNcBkMLksGQyXQdTYOhKT+aWNMUX1N+NLGmOX3VapdN0Y1/mHE1Zsx9y2CIy2BoQbo3GMoFWE2mx9YkGBpUV2ygpviq1BWbpDl9kXpjc/oazCiDapcJxTGrMWPuXJ8PQ2Wts8/UJ8KQVtyyVXWcCyps+zGy8CUr3lkrMMrnLtZr5mP4OX22JAyNhRFZUd3fYzFe9mlp7Pwm072qgCEPJ+RvCBZWJVKrz8f+qRArihVy3biToAS9RhmpOk+LxaYxtK4YFmnF+cXiI+cXK/5oXy/cF23ntcuweCvxRTv//eW+D/KVzyHUGcNnU9YbY3XIYoFWfI5oEnrCmFXh65E1HoZE0dXjOwdDeFapfQjgGAxFRSAZvViK6uF0YUaIiT5DRXUFdhIMda4DX2JxD6AV274QDElpMDRGl85vMt2LGAzBYv/jHBbtBBFbATAyrYUwhH9zeLopVIHHvzkShqQvPAxAhmMkDMm0FgLMwPnZKjfeF8AG9ZVbZYoMYSj7ommoUJl+gK84JkDLxh0FNGW1U2QIUpsjhbLlpchA02Fo5VYruO+74ll9e+lCW6pE/ziaEYYQUjqXgjHnrV+gU3QGYcXDRx2GMOqTxlE/3kfnDmfqi49LLuO4cg6Eoa07RPDJASQ8r0O8HgJD6C8anl/zfG+oNgyF57M906gYvW7aXwAnuZYCcEQkjjYVfU2mB1URGUoKoFLAUJHWQhjauP2+E1Ge2LbZu30X+rR95THd/uT2PjokYKhIayHAVOaHNjo/XfRn8JW5QqbIEIaIrxR9iW0DfPnTjVGkZvqrlSKL4wvoWWCKDDQdhjZut+vcy0vnduRZ+bbNzu3WEUgRhn7/dN9I9G21e4338a/79f0b6Rt8rHdHt/c+Qv8iAnUlzQhDJYwUqSwGCXUYorByxv8tUzMMrOIoGQkSkaIs4j/2kSCzPSMQRBiCfmku0TbkfG+gITBEAUjCivysRYZ4n7PbShiVz6O49ybT46kKQ5gu255YeqdMa2UYOr0dfDQpwUWEnc3pzR082HAYKn1hJAcADMfwdp7WivNH6NDmB6hg85PVZ5qvP+6wDgsnBRieIvNHsq8/B59eS6ASYaffFy66EY66uO74v8McbFiKLB0NClGor5EiA10CQ0f/rF5ct8NnFYBnc3x1hzUBHADM74f4DCT8yM85DRcA6LZptFlhiMNHjERsAS4CNGD6KSzGyp4hHlZgbcWaOhcMISREP8EHOV5Jk4V+ZRSser430BAYYucF5yzv3ygYEvL3O9+vZl+T6YEkYSjACP733pciI8c86EToiO0BdshxBkN1XwFAcN+QAityDELHh5wfoIIcZzB0iS8JMDJFRo4lXzmFxXx9b/iK54owgzAlP7dTZLGt2GO0zBQZ6CIYeg/P5CWmys4/EWrgOAUc4cH3W7ndawOGVjv3+h6fcur/XviaW/PCEAMLAA5MZwVo8IujGjHJaZm8dhJY0sbMBkME0jD1RmCOwhD6z6ak12rnq8EfsTlSap8BQyn6l8xgyLQ8SRjKwjQZ2UTdSGsh6OAenf3p4DoYv4HIEoINgSHFV4YnOKDAUJHWivMn6KDz78Oep83JfdD5ceG/yJcAmCJF5g8WvnzkRvqSMCRTZAoMpc3Xm6P7gAlbKbLYlvqK4zJatARdBkMf4X5Dquy491Gi583RvX9IwEGgoWvEl4AhCRY5wtIdDo20WAYNuQ+nCgsKDMk0XX3vDochvu8FAYfDkPQtI0O953sDwbxUV4chf39J5MwiQ6aFqg5DEU7gv/kIDFpaS8IQf3sL+5YwVPqib5BJC/3KtFacn0BH7/xx5Z/ky6fAShgqU2QgDkM+rZL2l2CUpoShIkXmXel7iBBw6iky9C83Ti83RQa6FIbCswr3zQNOelYZcMKmakifhX0/XygylMHC523jQhgiQp0/TkElAwPCSYQLBjoCXFAKDMlIkASWLOmTbBhO/jQYkim+Eed7A10FhkSUqwVD4X4bDJmWJwZD5x9ufcBIiYzMaGktP4jDEIWa1FfCUM0XlTJ/kdYCCYDpm9/3meYrpMAkDGkpMpCAIQImeb+PhKEyReaF8BOPY6QoAE4jRZYATL6FttwUGehiGIrPxUd9VvhmmQZDXYSf/Dba14Ahkg6Sm5IlIPBoitjYq23EhgMsikOMLdD5uL4Wl8CCc2RAk2kynuYKe6FI+q92vjcUzEl1KQzRe117mwyvPfSB6J/BkGl5kpEhvmeIp6hkWitIwlD2kfsKGKr6ohIwpKa1QBJgeuaHPhf7IgCjpshAEoaUdJeEIRkBYu747walSE8jRVbOF7XgFBnochiK9w7uEW6krgEOPo/Nxj0/r78KDJk+SxKGTCbTPJIwVFOZ1pquKb6mjKlJT5FNk54imyY1RdajeoqsriWnyEDjYWjZMhhakAyGTKbraBgMDUlrDdUUX1PG1FRLkU1RLUU2RZUUWVONFFlVy06RgQyGuAyGFiSDIZPpOhoGQybT48hgiMtgaEEyGDKZriODIdPSZDDEZTC0IOGmQTMzMzMzM7ORZjC0DMHDNJlM88siQ6alySJDXBYZWpAMhkym68hgyLQ0GQxxGQwtSAZDJtN1ZDBkWpoMhrgMhhYkgyGT6ToyGDItTQZDXAZDC5LBkMl0HU2DoZl/92e0rzl/K2hOX/a7Q/cggyGuBcGQLJ/Rp1heQ60w/5gyGLq+rMTI19QkGBpUTmOgpviqltOYoDl9VUtzTFCrNEdNjdIcVS2wNMfnw1BZ3uMz9WAwRAqqFtBjMKTCkKzlNvB6ed24vhpvvABvUew1+SFFc8V5Mf+ttiSl1toNZDD0NVXAkIcT8h09lWUmeGkMrE0W+m9kf1b5PdcvQ+llNmgFe9kmy2lgPTGcXyw+cn6x4o/2leqD5ZpjKF6aA2uTEV+0M6ti3/L1keqy5b83wST0sNIcMIbUMkOT0LPE0hzjYUjUGYuV6JPgWaX2IYBjMDRdcZHsurDA8jXJYAjuCZMvWksAJMJJLkZbEdxncl8C0JT3NfuCexnaqX+t6n1QuPe8kC+eZ6uNymDIdDsxGILF/sc5LNoJIrYCYGRaC2Gocx38nRLpplDoNLYVMCR94WEAMhwjYUimtRBgBs7PVrnxvgA2qK/cKlNkCEPZF01DhSKqA3wp4ZoAMKRYazjaTJE1xywoRQaaDkMrt1rBfcdK9UFYod63peKrj6OHgqG0KGPkgIcT1Crz3eFMokl08cwwdCCV15lLvxDntl6I+GRxGArXV123/T2UkRoNOuptAAYsIuTvE73/5ZjQBH0pXBGwabUx1Y6DaASRA3IJM6Fvfrb1sSA5vhr5Mi1KRWQoKYBKAUNFWitXrd/vOxHliW2bvdt3pGp91Vce0+1Pbk+r1pMxPK2VK82r80MbnZ8u+jP4ylwhU2S5an3ylaIvsW2Ar4JRMKIkoaeVIotjCuhZYIoMNB2GNm6369zLS+d25Fn5ts3O7dYAlASGfv9030j0bbV7bVa4X++Obu99hP5FBOpKeiAYopEcCT4geSyncMJCh+08ApEBCD/H8Sw6In3fpxgMeYBpn2+O3EggECoAZYAiQIV/0UWLEFFGjPL8rTauOgypwII+5bUI0GuOle0D7rFpGarCEKbLtieW3inTWhmGTm8HH01KcBFhZ3N6cwcPNhyGSl8YyQEAwzG8vaw4nwFGmx+ggs1PVp9pvv64wzosnBRgyur1GYZOfw4+vZZAJcJOv68yAhEiSj0pMjqAjJHQs8QUGegSGDr6Z/Xiuh0+qwA8m+OrO6wJ4ABgfj9EuJTwIz/nNFwAoNum0R4HhmLkgaVgWLRGAkuZBsMxDH7kQlf5132r7V7EYEgu+qpi9AzSjmo6C1SDkR7J9FaM5sG9l4ARutdgKLdxVWBIjWLRKBWPmLH5esdqMKScg2lxkjAUYARBvy9FRo550InQEdsD7JDjDIbqvgKA4L4hBVbkGISODzk/QAU5zmDoEl8SYGSKjBxLvnIKi/n63vBVhA1iWgvuCQOYVoqsZ4yMFi1AF8HQe3gmLzFVdv6JUAPHKeAID77fyu1eGzC02rnX9/iUU//3wtfcehgYKmAEU2XV6E0JOxygynY5R/hMTS6U96XxMIT96gu6vwdVUGqomH9Y9KfVxtWCIfnclOfqBwofo8aWY8pzNC1FEoayME1GNlE30loIOrhHZ386uA7GbyCyhGBDYEjxleEJDigwVKS14vwJOuj8+7DnaXNyH3R+XPgv8iUApkiR+YOFLx+5kb4kDLVSZDGt9bQ5ug/6zFopsp4xMlq0BF0GQx8hkgapsuPeR4meN0f3/iEBB4GG/j01GLpAOaVVGi5Uw2FoSGSI9y1B6R4F55vFIyC6YtTjIMEltk4FIVARZSFQUwElf66tNqbK8SGpK+wj+8rPigoYyi0D7rfpUVWHoQgn/q2lAAxaWkvCEH97C/uWMFT6om+QSQv9yrRWnJ9AR+/8ceWf5MunwEoYKlNkIA5DPq2S9pdglKaEoXqKDPvKTdCtFFnfmOWlyECXwlB4VuG+ecBJzyoDTthUDemzsO/HIkOXSqTIUDzSU4EhGQmS7U0Y4qmVx4IheQ35GN5HGSHJi3z8PBWEvEREh6XNBDgwAGq1UVVgSM6rKvaB9CBz0D+2DkO18zEtQQyGzj/c+oCREhmZ0dJafhCHIQo1qa+EoZovKmX+Iq0FEgDTN7/vM81XSIFJGNJSZCABQwRM8uZnCUONFFmCqY07Fm+eVVJkfWMWmCIDXQxD8bn4qM8K3yzTYKiL8JPfRjMYmiSEHAVEUooCFssKDHVbt+15m0yDIQpTftxW7IG5Q0kYAiEwJsPrlZBBIzkRPgsbu9KLtBPnDtom7murLQmfNzUZJSQmwE5G/khLcyyDIXmfSmemhUhGhvieIZ6ikmmtIAlD2UfuK2Co6otKwJCa1gJJgOmZH/pc7IsAjJoiA0kY0jY/CxhqpMjKsVGNFFnfmCWmyECXw1C8d3CPcCN1DXDi38jNZuOen9cGQ7dVCTtLF3zZTCbT/JIwVFOZ1pquKb6mjKlJT5FNk54im6Z6iqyueoqsriWnyEDjYWjZMhhakAyGTKbraBgMDUlrDdUUX1PG1FRLkU1RLUU2RY0UWVWNFFlVy06RgQyGuAyGFiSDIZPpOhoGQybT48hgiGvBMPT1ZDBkMl1HBkOmpclgiCvBENsIamZmZmZmZmb2lcxgyMzMzMzMzOxLm6XJliF4mCaTaX5Zmsy0NFmajMv2DC1IBkMm03VkMGRamgyGuAyGFiSDIZPpOjIYMi1NBkNcBkMLksGQyXQdGQyZliaDIS6DoQXJYMhkuo6mwdDMP4I42tecP5wImtPfI/4QY0uP9yONBkNcBkML0r3BUL2oaRAtGnv/gh/xrNVJMy1dk2BoUG2xgZriq1pbbKLm9FetVTZBjVplVTVqlU3SA9Yx+3wYKmudfaYMhhYkCUN9MCLl+5Nf7PbFTMV42ael9vwVuBDFXYfONaewiKsEtceCN9OcKmDIw0n+nm5PZc0tXicMC7WG/hvZ/+8vt36GyunQnou5ovSaY6RaPC0Wm8aUtcVSgVkZ3Ymgg9ejAQ/3h8Va8XrEYgbX4yvBx+th1eBlrTIs1kp80c6pqnyfr49QqDb1zSahR6tVhgVbn2R0J86P56cBzyPWMRsPQ6Lo6vGd3we4T6l9COAYDJmuJPiCUrVhpF8aDI1Rc36o+C5Bx1eB54B0PQAJ1en56YUSLt3h7NuKebVzNn0JMRiChf7HOSzYCWK2AmBkWgthqHNdV8JIgJTYVsCQ9IWHAchwjIQhmdKi4CTmB4D4ccpVx2M/DjjSH8JQ/XoANtL1MICRKTKEoeyLwkiAlAG+JKEkSIGFmwKWTJFB9fS8yDMYQhDaHN3Hv39tfxKi7lzTYWjlViu457viOX176UJbqkT/ODIYWpDaMISLf6zZ5o2DR+4f+rJ/WcWOBeCISA5tKvoSlW3hvCrdg6pzwfnCtdSvrZQGQ6jQVsBQLZplWryKyFBSAJUChoq0FsLQxu33nYjYxLbN3u270KftK4/p9ie39/AiYEimtDy0rd3+tA/wJsGKCKNHbD7pL8GQdj0RUOj1UIApUmQIQ8RXirAM91VwCEaUJCjJFJnvt3b7495HsyjUBBB7zvATxz5FOKL+tIjRPWs6DG3cbte5l5fO7chz8m2bndutARgJDP3+6b6RaN1q95rB+/s30jf4WO+Obu99hP5FBOpKMhhakIbAEIUECSTysxYZ4n3ObivTauSz9JelwIYHna3Tege15iqvLaS6Wv6mwFBrjGnJqsIQpsu2J5baKdNaGYZObwcPJAksIuxsTm/u4MGGw1DpC4EFAAzH8HYtRRYH9sJQGMsjQ6W/DEPF9URA2Zz+uMM6LJ4UYHiKzB/Jvv4cPJAkUBnsq4xCYNpLgpKWIosDQhSIwFARCRKRotznsVJkoEtg6Oif04vrdvicAvBsjq/usCaAA/fr+4FE4Cj8yM85DRcA6LZpNIOhBWkIDPFgDE/7SHjphyEhATT1vkoUyKfIWvAixOZSrq0SxcH9QKXRuWswFK5JO25atiQMpb038bvTn9YiMIQAE9sD7JDjDIbqvgJ8YFpLARUNePpgCPcOyfkKfwSGPuT1AKDgcQkwMkVGjqEvSFnFaA7z5VNZFV9F6CCmruC+MEiRKTKiSTD0mCky0EUw9B6ex0tMlZ1/ItTAcQo4woPvt3K71wYMrXbu9T3e/9T/vfA1twyGFqTPgKESLq4HQ/W5lGvT5mDSxqAMhkxcEoayME1GNlE30loIOrhHaH86uA7GbyCyhGBDYEjxleHJr84lDBUpLaIWDKX9TwE4klR/FIbo9cQ03Ab2IMG5CYApUmT+oPAV9ggVviQMtVJkWjqLHFfHTIGhB02RgS6DoY/wnCBV5tOLkCI7uvcPCTgINPTvtsGQ6cq6OQxJgLkkMqQeI2rOpVxbJTKUpY1BGQyZuOowFOGEvIGlpbUkDGXwgMUB+5YwVPoSG6GZhX5lSouoCkMcbqh0f6K/vB6fAithqEyRgTgM+dRK2mOCkZ0Shuopsrwhmm90bqTIQAoM1fYMIfw8aooMdCkMhecU7rMHnPScMuCETdVw/8K+H4sMmW6iq8CQeHuqBUO+TX5WaUOHjRD5qbxN1pwr+Cv2DDXf/FLuR5J+fu0xpiWLwdD5h1sfMEoiIzNaWssP4jBEoSb1lTBU80WlzF+ktGh3DYbqIKSnyMjxNIZfT0iBSRjSUmQgAUMEZvLmZwlDjRRZgqmNOxZvnlVSZCAFhmQkiMPP46bIQBfDUHwm4ecI8M0yDYa6CD/5bTSDIdNVNTcM0be3am+TBSjBPge3lcBSIYdaW5EKk+enzoXXRt8ma6fcdNHxdK50Bj3RJtNSJSNDfM8QT1HJtFaQhKHsI/cVMFT1RSVgSE1pEQiS3+/Nyb0d6LUQAwA6bSvnIGGIXg+mwAQMqSkykIQhjMjQzc8ChhopsnJsVC1FxiJR9N7wVBger0WJHk2Xw1C813APcCN1DXDw3m027vl5bTBkuq7gy/YwmvU3exTQu4Zkqs70ZSRhqKYyrTVdU3xNGdOSniKbJj1FNk31FFldzRTZBD1yigw0HoaWLYOhBemhYGjWKMttYKgWzTItX8NgaEhaa6im+JoypqVaimyKaimyKWqkyKrqSZGN1mOnyEAGQ1wGQwvSY8EQ2Q90sW4BQ3PCm+nRNAyGTKbHkcEQl8HQgvRoMGQyPYoMhkxLk8EQl8HQglRsADQzMzMzMzMbZgZDyxA8TJPJNL8sMmRamiwyxGWRoQXJYMhkuo4MhkxLk8EQl8HQgmQwZDJdRwZDpqXJYIjLYGhBMhgyma4jgyHT0mQwxGUwtCAZDJlM19E0GJrzd3+m+Jrzd4JAc/qz3x36bBkMcRkMLUgGQ8NlP6BoGqNJMDSonMZATfFVK80xVXP6q5bmmKBGaY6qaqU5puoBS3N8PgyV5T0+UwZDC9JYGJJ1wMawAY5t/WjiMP+3+MHEUgZDpjHSYYhWkC9LVvDSGFibLPy3sDmJkhSsdliuX4bSy2z0zV+W0kg11WR0J4IO/reqAQ/3h7XJ8HrEYgbXk+p55ZpjKF6aA2uTEV+0M6sd1vL1EWqzKXXGJPRopTmwptmTjO5gsdboSwOeRyzNMR6GRJ2xWIk+Ce5Tah8COAZDpisJvqCDBUVYSW2wAC5D6m6FYqbd4Vyp7B412L/BkOn+pcKQj9Z0rus0GJFpLYSh2F/ASIAU9CVhSPrCwz3zs5QWBScxPwDEj1MutBn7ccCR/hCG6tcDsJGup6geT1NkCEPZF4WRACkDfElCSZBCiquGoyJFhkVg473prVpf8Sch6s41HYZWbrWCe46V6oOwQr1vS8VXH0cGQwsShyGADCgfQSuxN8pJ+Ar1sZ3+b9mWB7RhSEr14RsaMBTa8r/wMkyVMCPPpz4WJMfzKJZ2nqavrBKGAqB0+5M7dKRqfGqWaa1ctX6/70TEJrZt9m7vfQkYKnzlMTD/nlatJ2NYSstHntZuf9qHCJQEK6JcfZ7MJ/0lGNKuJwIKvR4KMEWKLFetT75ShGW4r4JDMKIkQUmmyHy/tdsf9z6aRaEmgNhzUak+VbQn/rSI0T1rOgxt3G7XuZeXzu3Ic/Jtm53brQEYCQz9/um+kWjdavfarHC/3h3d3vsI/YsI1JVkMLQglTDEF/Z6dMbTAWvzfX1kR0IGqna8omrF9zoMqcCC0SbpT8BWc6xs92O1czOZgiQMBWDYutO/N3dQYKRMa2UYOr0dPJAksIiwszmhLw5Dpa8h85cpsjiwF4bCWB4ZKv1lGCquJwLK5vTHHdZh8aQAU1avzzB0+nPwQJJAZbCvMgqBaS8JSlqKLA4IUSACQ0UkSESKcp/HSpGBLoGho39OL67b4XMKwLM5vrrDmgAO3K/vBxKBo/AjP+c0XACg26bRDIYWJA2GOGTUio1qYBPTYR2HiCxtTE2tvtp5lnATRM8/nF/mGXKevWM1GFLOwWSK4jCEURlY/DGtpIAPAw4CQwgwsT3ADjnOYKjuqzk/S2kR9cEQ7h2S8xX+CAx9yOsBQMHjEmBkiowcQ1+QsorRHObLp7IqvorQQUxdwX1hkCJTZESTYOgxU2Sgi2DoPTyPl5gqO/9EqIHjFHCEB99v5XavDRha7dzre7z/qf974WtuGQwtSMNgSB6LYKABj4++lP2DWoDDVfXvpZ1nBpScuipTWBlohI9RY8sxQ67J9LVEYcjDyxNEZfzqWMJII62FoIN7hPang+sAPjYnAjYEhhRfGZ7q81ff+mrBUNrEHYAjSfVHYYheT0zDbWAPEpybAJgiReYPCl9hj1DhS8JQK0WmpbPIcXXMFBh60BQZ6DIY+gjPCVJlPr0IKbKje/+QgINAQ/8OGwyZrqxhMMQjJnVQiX0P7fRWHzjU/aO080Q40eYlwj6yr/ysqICh3KICo+lrK8OQ2IgsYBuAREtrSRjK4JHH+cVBwFDpa8j8MqVFVIUhDjdUuj/RX16PT4GVMFSmyEAchnxqJe0xwchOCUP1FFneEM03OjdSZCAFhmp7hhB+HjVFBroUhsJzCvfZA056ThlwwqZquH9h349Fhkw3kQZDxZ6hBCaxvQIqMupSgkMfDLX9Z1VgqNc/KPaBVB5z0D+2DkO18zF9Zck9Q1kyMqOltUAChijUpL4Shmq+qJT5i5QW7a7BUB2E9BQZOZ7G8OsJKTAJQ1qKDCRgiMBM3vwsYaiRIkswtXHH4s2zSooMpMCQjARx+HncFBnoYhiKzyT8HAG+WabBUBfhJ7+NZjBkuqo0GNqe6dtkJFoSU2CFAQU0NydTf9kK8Gj5Z0Joo4ZzKW0CrvAtsMJtz1gGQ/JcS2emL67BMKSktYIkDME6K9/aEjBU9UVVzl+mtMKiniM3xDYn93aIvz0k2wCATtvKOUgYoteDKTABQ2qKDCRhCCMydPOzgKFGiqwcG1VLkbFIFL03PBWGx2tRokfT5TAU7zXcA9xIXQMcvHebjXt+XhsMma4r+LJlWYTDZJpLdRjiKtNa0zXF15QxLekpsmnSU2TTVE+R1dVMkU3QI6fIQONhaNkyGFqQDIZMputoGAwNSWsN1RRfU8a0VEuRTVEtRTZFjRRZVT0pstF67BQZyGCIy2BoQTIYMpmuo2EwZDI9jgyGuAyGFiQOQyaTaS4ZDJmWJoMhLoOhBanYAGhmZmZmZmY2zAyGliF4mCaTaX5ZZMi0NFlkiMsiQwuSwZDJdB0ZDJmWJoMhLoOhBclgyGS6jgyGTEuTwRCXwdCCZDBkMl1HBkOmpclgiMtgaEEyGDKZrqNpMDTn7/5M8TXn7wSB5vRnvzv02TIY4poRhrD8QbtAZlYs69Bbu8o0VAZDw1WvTWYylZoEQ4PKaQzUFF+10hxTNae/ammOCWqU5qiqVppjqh6wNMfnw1BZ3uMzNRKGaL0nCT0LgCFRo6qot9UQ1sgaez3Vcb4e2LhzGQtDae5oY9gAx7bOi/uvfS8+58chDYZMY6TDEK0gX5as4KUxsDZZ+O9hcxIlKVjtsFy/DKWX2eibvyylgfXDiqr1EXTS3xsFeLg/rE2G1yMWM7ieVM8r1xxD8dIcWJuM+KKdWe2wli9SL4vWWsMaY2KMLM2RxsnoDhZrjf404HnE0hzjYUjUGYuV6JPgPqX2IYDzyDAUF2hfJbxYPB8chgCE0gVl6OtfL0VB0MHX0xiHIBQn9wv3gHOBPoMFc5A5A7gMeXbhuXWHsz//Ogyd3bZWGJXJYMh0/1JhyEdrOtf5/44ljMi0FsJQ7C9gJEAK+pIwJH3h4Z75WUqLgpOYH0DoxykX2oz9OOBIfwhD9esB2EjXU1SPpykyhKHsi8JIgJQBvmCMiPgESCHFVdMYmiLDIrDx3vRWra/4kxB155oOQyu3WsE9x0r1QVih3rel4quPo1EwlBZMsVjHVgFDfNHERT8PyTB0iIt9seBfEKkp1Xc+XDTyUURB4nn5z1jR/RzvSQEY08elc8P7UDvZKOiTBc8Dqr/TKvNYDV4RrUzPqtQrn8PBHhji8tekgmILhgQwElgrYUaeT30sSI7nUSx5raavrhKGAqB0+5M7dKRqfGqWaa1ctX6/70TEJrZt9m7vfQkYKnzlMTD/nlatJ2NYSstHntZuf9qHCJQEK6JcfZ7MJ/0lGNKuJwIKvR4KMEWKLFetT75ShGW4L1iXZcV6/MzgRabIPPCs3f6499EsCjVh/HNRqZ5Fmx4wRQaaDkMbt9t17uWlczvynHzbZud2awBGAkO/f7pvKbL35Fa712aF+/Xu6PbeR+hfRKCupBEwRCM5EnxA8lhehMMChe240OT2sCbh5zieRS6k7ynqOx/Rm0Vj6LlVIloIiOz4tHFFJEiFz1IlDPHra0Z/PHDltgwvEjJQteOaEES1vnUYUoEF75M4XwlszbGy3Y+t3BeTSYGhAAxbd/r35g4KjJRprQxDp7eDB5IEFhF2Nif0xWGo9DVk/jJFFgf2wlAYyyNDpb8MQ8X1REDZnP64wzosnhRgyur1GYZOfw4eSBKoDPZF4SlEeTb7vevitdIIhpYi88IoEIGhIhIkIkW5z2OlyECXwNDRP6cX1+3wOQXg2Rxf3WFNAAfu1/cDicBR+JGfcxouANBt02jDYYhGNdLCqv1LXMBQNeJRtgcIaMGJ3jZM5XxFBCZ1jZEYCi4iSlWMUaDGa8K4OWGID4F7oN1DDWwiwEBKVF6TlzZGiF579dy188RrludKzz+cX+YZcp69YzUYUs7BZIriMIRRGVj8Ma2kgA8DDgJDCDCxPcAOOc5gqO6rOT9LaRH1wRDuHZLzFf4IDH3I6wFAweMSYGSKjBxDX5CyigDDfPlUVsUXCx1kIIK/PWpKqxgT7s14GHrMFBnoIhh6D8/jJabKzj8RauA4BRzhwfdbud1rA4ZWO/f6Hu9/6v9e+Jpbg2GogJFiER8OQ2EBLdvlHAgF2bQFTvbJpi3u9fNJB+PGZRkpIHNpcFDcD9T4cdeFIXkszqedW4QZ2T9oAAwR1aNS2nnS5yBNAxrhY9TYcszQazJ9HVEY8vDyBFEZvzqWMNJIayHo4B6h/ekQohebEwEbAkOKrwxP9fmrb321YCht4g7AkaT6ozBEryem4TawBwnOTQBMkSLzB4WvsEeo8CVhSHuLDNNYHnbgHDHSwNNc6ltkU2DoQVNkoMtg6CM8J0iV+fQipMiO7v1DAg4CDf07/NAw1IIOXGCGw1BYg8p2CkMyaiNBabzK+eQc+TrLRZvvKVEWTAVqwuHx44rzElG5mqBPlgYZPDrij9RACPseRDoqaRwM6dEa36CcJ/bX5iXCPrKv/KyogKHcogKj6Wsrw5DYiCz+FgKQaGktCUMZPPI4vzgIGCp9DZlfprSIqjDE4YZK9yf6y+vxKbAShsoUGYjDkE+tpD0mmM4qYahMkSkpMLHHp2inUmCotmcI4edRU2SgS2EoPCeMwK3i/iEOOGFTNdy/sO/n8SNDlcWYR1YqMCQjQbK9CUM8JTILDPWdj7aIMmCp9FOg5uJxcUUeCoIaDNFxfN9MbFdBqIy6lODQA0NwDWTM6MhQn3+v2AdSecxB/9g6DNXOx/SVJfcMZcnIjJbWAgkYolCT+koYqvmiUuYvUlq0uwZDdRBKbYU/OYZfT0iBSRjSUmQgAUMJfKIv9M9gSE+RyQ3TfEN1jBRpKbIwuIAhGQni8PO4KTLQxTAUn0n4OQJ8s0yDoS7CT34b7UFhqFxUc1NctP0iV4Ghbuu25K2eIgpTgSEKL37cFoBMOYfBap+PjOAkI2+7FX3hQC0lsz0X6a6h48Lp9uw1UgT9snBRp/eRwIjwz+Zvbk7mzwWtBA/8PqDVnp3sR/sqbZXIW3l/2mMZDMl7UTozfXENhiElrRUkYQjWWfnWloChqi+qcv4ypeUnI5EbYpuTezvE3x6SbQBAp23lHCQM0evBFJiAITVFBpIwJCEm+qIwpKXIvAhIRWObsbUUGYtE0XvDU2F4vBYlejRdDkPxOcE9wI3UNcDBe7fZuOfn9aPC0FSVsPO5urfzmV/wZcuyCIfJNJfqMMRVprWma4qvKWNa0lNk06SnyKZJS5H1qZkim6BHTpGBxsPQsmUwtCAZDJlM19EwGBqS1hqqKb6mjGmpliKbolqKbIr0FFlbjbfIJumxU2QggyEug6EFyWDIZLqOhsGQyfQ4MhjiuiIMmW4tDkMmk2kuGQyZliaDIS6DoQWp2ABoZmZmZmZmNswMhpYheJgmk2l+WWTItDRZZIjLIkMLksGQyXQdGQyZliaDIS6DoQXJYMhkuo4MhkxLk8EQl8HQgmQwZDJdRwZDpqXJYIjLYGhBMhgyma6jaTA05+/+TPE15+8Egeb0Z7879NkyGOIyGFqQDIaGq16bzGQqNQmGBpXTGKgpvmqlOaZqTn/V0hwTVC3N0VCtNMdUPWBpjs+HobK8x2fKYGhBGgtDsh7bGDbgRXorEjW/9L6f8+OQBkOmMeIwFKI09LsNtfyw5hiKl8bA2mSh/+YkSlKw2mG5fhlKL7NBK9jLNr2UBtYPK6rWR9BJ/60qwMP9YW0yvB6xmMH1pHpeueYYipfmwNpkxBftzGqHtXx9hNpsSp0xCT1aaQ6sh/YkoztYrDX60oDnEUtzjIchUWcsVqJPgvuU2ocAjsGQ6UqCL+hgQfFV8mvc9aryUuGXvLvDuacyPPQjxVlZsVcqgyHT/UuFoe2pAIYsmdZCGOpcBwWEBYwESIltBQxJX3gYokU4RsKQTGlRcBLzA0D8OOVCm7EfBxzpD2Gofj0AG+l6GMDIFBnCUPZVVqIf4EsSSoIUUlw1HBUpMlHctbdqfcWfhKg713QYWrnVCu45VqoPwgr1vi0VX30cGQwtSByGADIAPmiVeQ1GoiisSHCRn8PBNgz5MRSuBBwltWBIVp7P/kqYkedTHwuS43mUTDtP01fWaBgq0lq5av1+34mITWzb7N2+45XtdV95TLc/uT2tWk/GsJSWjzyt3f60DxEoCVZEufo8mU/6SzCkXU8EFHo9FGCKFFmuWp98pQjLcF8Fh2BESYKSTJH5fmu3P+59NItCTQCx56JSfapoT/xpEaN71nQY2rjdrnMvL53bkefk2zY7t1sDMBIY+v3TfSPRutXutVnhfr07ur33EfoXEagryWBoQSphiC/szeiPT2nlNt/XR44kZKBqx7M8cHifrb51GFKBBaNZ4nwlsDXHyvYC3EwmrrEwVKa1Mgyd3g4eSBJYRNjZnN7cwYMNh6HSFwILpOZwDG/XUmRxYC8MhbE8MlT6yzBUXE8ElM3pjzusw+JJAaasXp9h6PTn4IEkgcpgX2UUAtNeEpS0FFkcEKJABIaKSJCIFOU+j5UiA10CQ0f/nF5ct8PnFIBnc3x1hzUBHLhf3w8kAkfhR37OabgAQLdNoxkMLUgaDHHIaEdnOKzEdFjHISJLG1MqAFGrQK52niXcBNHzD+eXeYacZ+9YDYaUczCZolQYSpFE+C5RMNLSWgSGEGBie4AdcpzBUN1XgA9MaymgogFPHwzh3iE5X+GPwNCHvB4AFDwuAUamyMgx9AUpqxjNYb58KqviqwgdxNQV3BcGKTJFRjQJhh4zRQa6CIbew/N4iamy80+EGjhOAUd48P1WbvfagKHVzr2+x/uf+r8XvuaWwdCCNAyG5LEIBhqsxA3Qsn9QHwwpsFIAim9RzjMDCltwRAorA43wMWpsOaZ+TaavqvrbZHmPzRY3RTfSWgg6uEdofzq4DuBjAzCFvggMKb4yPPnVuYShIqVF1IKhtIk7AEeS6o/CEL2emIbbwB4kODcBMEWKzB8UvsIeocKXhKFWikxLZ5Hj6pgpMPSgKTLQZTD0EZ4TpMp8ehFSZEf3/iEBB4GG/h02GDJdWcNgiANJFYSw70Gko5LaMCTTUvX+2nkinGjzEmEf2Vd+VlTAUG5RgdH0tVWHoQgn5A0sLa0lYSiDR4D00LeEodKX2AgtYB/6lSktoioMcbih0v2J/vJ6fAqshKEyRQbiMORTK2mPCUZ2Shiqp8jyhmi+0bmRIgMpMFTbM4Tw86gpMtClMBSeU7jPHnDSc8qAEzZVw/0L+34sMmS6iTQYKvYMJUCJ7SoIlVGXEhxqcBOl7unRIKMCQ33+vWIfSOUxB/1j6zBUOx/TVxaDofMPtz7wjdEZaLS0Vu6XQYdATeorYajmi0pGhrSUFu2uwVAdhPQUGTmexvDrCSkwCUNaigwkYIjATN78LGGokSJLMLVxx+LNs0qKDKTAkIwEcfh53BQZ6GIYis8k/BwBvlmmwVAX4Se/jWYwZLqqNBjanunbZAROxG8AJQMKUEGG79WR4zTwSPuFGn0SbDF/OJfSJuAN3wIr4aU9lsGQvBelM9MXl4wMpd/rid9XmqKSaa0gCUPZR+4rYKjqi0rAkJrSCot6jtwQ25zc24FeC/3vZe/eTtvKOUgYoteDKTABQ2qKDCRhCCMydPOzgKFGiqwcG1VLkbFIFL03PBWGx2tRokfT5TAU7zXcA9xIXQMcvHebjXt+XhsMma4r+LJlWYTDZJpLEoZqKtNa0zXF15QxLekpsmnSU2TTVE+R1dVMkU3QI6fIQONhaNkyGFqQDIZMputoGAwNSWsN1RRfU8a0VEuRTVEtRTZFjRRZVT0pstF67BQZyGCIy2BoQTIYMpmuo2EwZDI9jgyGuAyGFiQOQyaTaS4ZDJmWJoMhLoOhBanYAGhmZmZmZmY2zAyGliF4mCaTaX5ZZMi0NFlkiMsiQwuSwZDJdB0ZDJmWJoMhLoOhBclgyGS6jgyGTEuTwRCXwdCCZDBkMl1HBkOmpclgiMtgaEEyGDKZrqNpMDTn7/5M8TXn7wSB5vRnvzv02TIY4jIYWpAMhoarXpvMZCo1CYYGldMYqCm+aqU5pmpOf9XSHBPUKM1RVa00x1Q9YGmOz4ehsrzHZ8pgaEEaC0NY1wttDBvgWL3eWBSr+ZULxnJ9zo9DGgyZxojDEBZnpa/lblPNMRQvjYG1yUL/zUmUpGC1w3L9MpReZoNWsJdteimNVFNNRnci6OD1aMDD/WFtMrwesZjB9aR6XrnmGIqX5sDaZMQX7cxqh7V8kXpZtNYa1hgTY2RpjjRORnewWGv0pwHPI5bmGA9Dos5YrESfBPcptQ8BHIMh05UEX9DBguKrpHBpgBtSnLWqUKi1O5zbleE9CBEAksVfkwyGTPcvFYa2pwIYsmRaC2Gocx0UEBYwEiAlthUwJH3hYYgW4RgJQzKlRcFJzA8g9OOUC23GfhxwpD+Eofr1AGyk6ymqx9MUGcJQ9kVhJEDKAF8wRkR8AqSQ4qppDE2RYRHYeG96q9ZX/EmIunNNh6GVW63gnmOl+iCsUO/bUvHVx5HB0ILEYQggA2CEVpmvRWciHGE7q1KvfA4HmzDk4YpVmIfzkD5ALRiSleczTJUwI8+nPhYkx/MomXaepq+s0TBUpLVy1fr9vhMRm9i22bt9xyvb677ymG5/cntatZ6MYSktH3lau/1pHyJQEqyIcvV5Mp/0l2BIu54IKPR6KMAUKbJctT75ShGW4b5gXZYV6/EzgxeZIvPAs3b7495HsyjUhPHPRaV6Fm16wBQZaDoMbdxu17mXl87tyHPybZud260BGAkM/f7pvqXI3pNb7V6bFe7Xu6Pbex+hfxGBupIMhhakEob4wt6M/ojITYYZCRmo2vGoIhIUoKyEnjoMqcCCgCX9C2BrjpXtfmzlvphME2CoTGtlGDq9HTyQJLCIsLM5vbmDBxsOQ6UvBBZIzeEY3q6lyOLAXhgKY3lkqPSXYai4nggom9Mfd1iHxZMCTFm9PsPQ6c/BA0kClcG+KDyFKM9mv3ddvFYawdBSZF4YBSIwVESCRKQo93msFBnoEhg6+uf04rodPqcAPJvjqzusCeDA/fp+IBE4Cj/yc07DBQC6bRrNYGhB0mCIQ0Y7OsPBJqbDOhnhQWljuDxwkGgLhLlL6NHOs4SbIHr+HK4Y7PSO1WBIOQeTKUqFofTdhu8SBSMtrUVgCAEmtgfYIccZDNV9BfjAtJYCKhrw9MEQ7h2S8xX+CAx9yOsBQMHjEmBkiowcQ1+QsooAw3z5VFbFFwsdZCAKkQUlpVWMmQpDj5kiA10EQ+/hebzEVNn5J0INHKeAIzz4fiu3e23A0GrnXt/j/U/93wtfc8tgaEEaBkPyWAQDDXjiBmjZP6gfhrj0ufXzzIDCFhyRwspAI3yMGluOGX5Npq+i+ttkeY/NFjdFN9JaCDq4R2h/OoToxQZgCn0RGFJ8ZXjyq3MJQ0VKi6gFQ2kTdwCOJNUfhSF6PTENt4E9SHBuAmCKFJk/KHyFPUKFLwlD2ltkmMbysAPniJEGnuZS3yKbAkMPmiIDXQZDH+E5QarMpxchRXZ07x8ScBBo6N9hgyHTlTUMhnjEpApC2Pcg012okTAk01pJ2nkinGj9ibCP7Cs/KypgKLdUoM30lVWHoQgn5A0sLa0lYSiDR4D00LeEodKX2AgtYB/6lSktoioMcbih0v2J/vJ6fAqshKEyRQbiMORTK2mPCaazShgqU2RKCkzs8SnaqRQYqu0ZQvh51BQZ6FIYCs8JI3CruH+IA07YVA33L+z7sciQ6SbSYKjYM5TAJ7arIFRGXUpwGAND+Aaa1rcCQ4P8xz6QymMO+sfWYah2PqavLAZD5x9ufeAbozPQaGmt3C+DDoGa1FfCUM0XlYwMaSkt2l2DoToIpbbCnxzDryekwCQMaSkykIChBD70zTIJQ3qKTG6Y5huqY6RIS5GFwQUMyUgQh5/HTZGBLoah+EzCzxHgm2UaDHURfvLbaAZDpqtKg6Htmb5NRqIl7DeAiAEFyCgO24ND/WUrwEOkqor2JIQ2ajiX0ibgDd8CK+GlPZbBkLwXpTPTF5eMDKXf64nfV5qikmmtIAlD2UfuK2Co6otKwJCa0gqLeo7cENuc3NuBXgv972Xv3k7byjlIGKLXgykwAUNqigwkYUhCTPRFYUhLkXkRkIrGNmNrKTIWiaL3hqfC8HgtSvRouhyG4nOCe4AbqWuAg/dus3HPz2uDIdN1BV+2LItwmExzScJQTWVaa7qm+JoypiU9RTZNeopsmrQUWZ+aKbIJeuQUGWg8DC1bBkMLksGQyXQdDYOhIWmtoZria8qYlmopsimqpcimSE+RtdV4i2ySHjtFBjIY4jIYWpAMhkym62gYDJlMjyODIS6DoQWJw5DJZJpLBkOmpclgiCvBULF5zMzMzMzMzMzsq5jBkJmZmZmZmdmXNkuTLUPwME0m0/yyNJlpabI0GZftGVqQDIZMpuvIYMi0NBkMcRkMLUgGQybTdWQwZFqaDIa4DIYWJIMhk+k6MhgyLU0GQ1wGQwuSwZDJdB1Ng6E5fwRxiq85fzQRNKc/+xHGz5bBEJfB0IL06DBUL55qMn2uJsHQoNpiAzXFV61O2VTN6a9ap2yCqnXKGqrVKZuqB6xT9vkwVNY6+0wZDC1INRjykCGLpYpCqrzoe6PtAuF5ZCPFYEfCkC/QOrDvUPn5RSFYkwnEYQgr1fPvMhZgRfE6YVioNfTfnER9LlZINRdzRek1x0ileFosNo0p64qlArMyuhNBB69HAx7uDwu14vWIxQyuJxU3zQVYUbxOGRZqJb5oZ1ZIteUrnkOtsKoYI+uUYXHYJxndwcr10Z8GPI9Yp2w8DImiq8f3suBtah8COAZDpisJvqCFoCJ7t3XbjsJQqDyfPvuq7bwqvd52mQA2KJCFivMZiD4bhkymmlQY2p6KRTZLprUQhjrXdSWMBEiJbQUMSV94GKJFOEbCkExpUXAS8wMI/TjlquOxHwcc6Q9hqH49ABvpehjAyBQZwlD2RWEkQMoAXzAmgkuI+GAFe1mcVabIRKV7CkMIQrGCfYAeCViPlyIDTYehlVut4J7viuf07aULbakS/ePIYGhBKmEI65OF/88Bh0ZlSB2zVpv/3wBGAZjCv7ygb+gTPtfBScIQghcyTQFDaoSKzhUs+5Rt2nXQc+fnOmx+hDjdh2mZGg1DRVoLYWjj9vtORGxi22bv9l3ow2Co8JXHdPuT23t4ETAkU1o+8rR2+9M+RKAkWBFh9IjNJ/0lGNKuJwIKvR4KMEWKDGGI+ErwMtxXYKEQ3UFYwc8sHSZTZB541m5/3PtoFoWaMP45ww9GnSIcUX9axOieNR2GNm6369zLS+d25Dn5ts3O7dYAjASGfv9030ikbrV7zeD9/RvpG3ysd0e39z5C/yICdSUZDC1I8MWhytETDkP+OEsH5fZWW4YNhIwMHwwUKqmmAoY8bGSY4DBydlviR/otI0PxXMgxHnnCc63NJz+LCBmejz9nnt4zLV9jYahMa2UYOr0dPJAksIiwszm9uYMHGw5DpS8EFkjN4RjerqXI4sBeGApjeWSo9JdhqLieCCib0x93WIfFkwIMT5H5I9nXn4MHkgQqg32Fcy0iNxJ8Uh8ZLQr3xkeBCAwV/kSkKPd5rBQZ6BIYOvrn9OK6HT6nADyb46s7rAngwP36fiAROAo/8nNOwwUAum0azWBoQWIwxBbtPhjKoNJq41GioAJKisgSbeIwJPfoSDhhEhBSzKtCCgANwk957iGFWJm/dh0xWlQ7TdMypcIQiRpyMNLSWgSGEGBie4AdcpzBUN1XgA9MaymgogFPHwzh3iE5X+GPwNCHvB4AFDwuAUamyMgx9AUpq5jCYr58Kqvii0VyciRIfi5TZESTYOgxU2Sgi2DoPTyPl5gqO/9EqIHjFHCEB99v5XavDRha7dzre7z/qf974WtuGQwtSBmG5MLfB0PjIkOXwBBbQBToKiM7dEwDhtR56fmW594LQ5UIF02f8bSfaamqv02W99hscVN0I62FoIN7hPang+sAPjYAU+iLwJDiK8OTX51LGCpSWkQtGEqbuANwJKn+KAzR64lpuA3sQYJzEwBTpMj8QeEr7BEqfEkYUt8iE/t/8L9TGmmqvUU2BYYeNEUGugyGPsJzglSZTy9Ciuzo3j8k4CDQ0OdhMGS6sjIM0X0xCoAU4EBAodWmAMUwKMGmNjwUMEL93EtkiInveTItV3UYinBC3sDS0loShjJ4wH+X2LeEodKX2AjNLPQrU1pEVRjicEOl+xP95fX4FFgJQ2WKDMRhyKdW0h4TTGeVMCRTZJrkHqJqiix0LmCotmcI4edRU2SgS2EoPCcEz1XcP8QBJ2yqhvsX9v1YZMh0E2UYkuKRoWIRZwt/q60EigJKGhBxCQyFqJKAISWCVUSWUp/y3JswVNszFD8FKT5NixSDofMPtz7wjdEZaLS0Vu6XQYdATeorYajmi0pGhrSUFu2uwVAdhFJb4U+O4dcTUmAShrQUGUjAEI3uFG98Kb6Kc0bJlJj8LKTAkIwEcfh53BQZ6GIYis8k/BwBvlmmwVAX4Se/jWYwZLqqhsOQJwXyppR4I6raVi7+V4OhBEDBusPBbYtIEbZxyGNRsOStPPc2DFXug78+MoeR0JeQjAyl3+uJ3w2aopJprSAJQ9lH7itgqOqLSsCQmtIKi3qO3BDbnNzbgV4L/e9n795O28o5SBii14MpMAFDaooMJGEoR3RyOkvAkJoiC9eZo0riNf1aikyOSfeGp8LweC1K9Gi6HIbic4J7gBupa4CD926zcc/Pa4Mh03UFXzaTyTS/JAzVVKa1pmuKryljWtJTZNOkp8imaUiKTKqZIpugR06RgcbD0LJlMLQgGQyZTNfRMBgaktYaqim+poxpqZYim6JaimyKhqTIpHpSZKP12CkykMEQl8HQgmQwZDJdR8NgyGR6HBkMcRkMLUgGQybTdWQwZFqaDIa4DIYWpGIDoJmZmZmZmdkwMxhahuBhmkym+WWRIdPSZJEhLosMLUgGQybTdWQwZFqaDIa4DIYWJIMhk+k6MhgyLU0GQ1wGQwuSwZDJdB0ZDJmWJoMhLoOhBclgyGS6jqbB0Jy/+zPF15y/EwSa099n/+5QS3P/htDc/uaRwRCXwdCCZDA0j4qyHKYvr0kwNKicxkBN8VUrzTFVc/qrluaYoFppjqmau8zG3P5m0ufDUFne4zNlMLQgjYUhX1eMvFY4dP0fMw77FjXJWN2vmg+lntgNZDBkkuIwhMVZ6Wu521RzDMVLY2BtstB/cxIlKVjtsFy/DKWX2aAV7GWbXkoj1VST0Z0IOng9GvBwf1ibDK9HLGZwPameV645huKlObA2GfFFO7PaYS1f+RywthmrTRYaWB0yDaC0MhtYvf5JRnewkGv0pwGP5u8eNB6GRJ2xY6hEnwT3IrUPARyDIdOVBF/QwQIYIUVKA7ToBVaZBo/Dqu/nskisrAjvi5+KYrFeBkOm+5AKQ9tTAQxZMq2FMNS5rithJEBKbCtgSPrCwxAtwjEShmRKi4KTmB9A6McpF9qM/TjgSH8IQ/XrgTpg6XoYwMgUGcJQ9kWBI4DIAF9+DKl4H69TVqDHAqwBUkjh1eSPprSiPyxk21vRvs/f/Wg6DK3cagX3HCvVB2GFet+Wiq8+jgyGFiQOQwASABi0krsGHFE+UhPb6f+WbVKtNq8ANAyGisr2NeipHQeFNvwXHvVXwow8h/pYkBzPI2GtazUtVaNhqEhr5ar1+30nIjaxbbN3+45Xttd95THd/uT2tGo9GcNSWj7ytHb70z5EoCRYEeXq82Q+6S/BkHY9EVDo9VCAKVJkuWp98pWiKMN9BXYBQFm7/XEfIlMEhjBaJKvOp+r06I+mtIQ/CjUYLRrl7440HYY2brfr3MtL53bkOfm2zc7t1gCFBIZ+/3TfSDRutXttVrhf745u732E/kUE6koyGFqQShjii3c9ilMCiu/rI0ASJIQKsJEqx2ff9T70uAZDKrCgT3lOAtiaY2W7H9u6PtNX0FgYKtNaGYZObwcPJAksIuxsTm/u4MGGw1DpC4EFUnM4hrdrKbI4sBeGwlgeGSr9ZRgqricCyub0xx3WYfGkAFNWr88wdPpz8NCR4GawrzJN56NABIaKyI2IFOU+SkoLo0AEhmr+MFLU9HcHugSGjv45vbhuh88pAM/m+OoOawI4cE++H0iUjcKP/JzTcAGAbptGMxhakDQY4iABUSItsqHBSExldRJcqLRxUmUfCR8gAJDSj3YNJdwE0WsL5555hszXO1aDIeUcTF9KKgylaCF8XygYaWktAkMIMLE9wA45zmCo7ivAB6a1FFDRgKcPhnDvkJyv8Edg6ENeDwAKHpcAI1Nk5Bj6grRUhBjmy6e/Kr5k6GASDDVSWpNgqOHvDnQRDL2H5/ESU2Xnnwg1cJwCjvDg+63c7rUBQ6ude32P9zj1fy98zS2DoQVpGAzJY3Hx14DHR1jK/qjqOKYhMFT2oceL+cXmay2FlYFG+Bg1thxTnqPpK6j+NlneY7PFTdGNtBaCDu4R2p8OrgP42ABMoS8CQ4qvDE9+BS5hqEhpEbVgKG3iDsCRpPqjMESvJ6bhNrAHCc5NAEyRIvMHha+wR6jwJWFIpsiopsBQK6U1BYZa/u5Al8HQR3hOkCrzKURIkR3d+4cEHAQa+rfWYMh0ZQ2DIR4VqQNN7HvQ02D1cVIK6Mg0lnqujeNDUlfYR/aVnxUVMJRbVJg0LV91GIpwQt7A0tJaEoYyeAQQD31LGCp9iY3QAuihX5nSIqrCEIcbKt2f6C+vx6fAShgqU2QgDkM+tZL2mGAKrIShaooMpMBQbc8QwlSAm7a/IXuGEH7uOUUGuhSGwnMKaS0POOk5ZcAJm6rhHoV9PxYZMt1EGgwVe4YSwMT2CtDIyEqGg/a4UgoMSago4AhVgSHVp1TsA2k+5qB/bB2GaudjWroYDJ1/uPWBb4zOQKOltXK/DDoEalJfCUM1X1QyMqSltGh3DYbqIKSnyMjxNIZfT0iBSRjSUmQgAUMJfOjbYBKGGikykAJDMhLE4SemtHr8sZSXiARx+LnvFBnoYhiKz8RHfVb4ZpkGQ12En/w2msGQ6arSYGh7pm+TEeCIKbDCYKWXcEL32bTGMdF5syUIYekquYcHhUBHDfsqbQLQ8C2w4tR6xjIYktdbOjN9AcnIUPq9nvidpCkqmdYKkjCUfeS+AoaqvqgEDKkprbBw58gNsc3JvR3otdD/Jvbu7bStnIOEIXo9mAITMKSmyEAShnIUJ6fABAzVUmQsqkSvk6eu8LiM6tT8FZG4gf7uNUUGuhyG4nOC68SN1DXAwfuz2bjn57XBkOm6gi9blkUxTKa5JGGopjKtNV1TfE0Z05KeIpsmPUU2Tc0U2QQ1U2QTdO8pMtB4GFq2rgND4l/TrZSEVPpNl8FpmKDqOLFhdsy5TJK49jEwUr2GgTIYMpmuo2EwNCStNVRTfE0Z01ItRTZFtRTZFPWkyEarJ0U2WvefIgMZDHHND0MAA3J/ySAoEKmLwUDQGIcgFCf36Y9B5zJRMB86TxCm7YWRalzDCBkMmUzX0TAYMpkeRwZDXBNgiJdZ6IuAYLQDIjL0f3vFKIr/jPtSzhEiCBBcOi6dG0ZtaifbqzHXjntmAgxNvYYx4jBkMpnmksGQaWkyGOKaDEN5Yceohr4JlkdjKCDE/y0XfoyosOPTxhWRIBEpGq8R116A17RrGCOEMzMzMzMzM7ORNgmGWhGY1DUCAV3c+/bU1IBgwrirwVDj2tO+H28iRTbhGsYIfJpMpvllkSHT0mSRIa7pkSEFCNjm5OqeGfLKtbboV4Fg/LhhMET8Kqb9Pk7vtdO+DHrGX8MYGQyZTNeRwZBpaTIY4poVhspFX4KQjJwoEFEBginjivOi+3Qmaci1ZyGM4XxTrmGMDIZMpuvIYMi0NBkMcU2HobSYS/CRn4nYYl/ppwHBpeMiqQQ4Ufb3DFbPtZ+3BHDEfqKp1zBCBkMm03VkMGRamgyGuKbDULd1W+WNKhn9SNYd3EGkrVJfOJDSasK25yLdNXRcON2efTqj1L52EL9+Ufxz6jUMFIwxmUzzaxoMzfm7P1N8zfk7QaA5/T3A7w7N9jtBc/ubRwZDXBfA0LToxWPrvq/dYGge1WuTmb6qJsHQoHIaAzXFV600x1TN6a9ammOCaqU5pmruUhpz+5tJnw9DZXmPz5TB0Cjd97WPhSEZxRu6/o8Zp28wV2qDqU4+54cjDYZMUhyGsDgr/Q5vU80xFC+NgbXJQv/NSZSkYLXDcv0ylF5mg1awl216KY1UU01GdyLo4PVowMP9YW0yvB6xmMH1pJpdueYYipfmwNpkxBftzOqNtXzlc8DaZqxQ64A2kFZKAyvUP8nojqhdpgGP5u8eNB6GRJ2xWIk+Ce5Fah8COAZDD6z7vnb4gg4WpOaKjeDKPi+pwePCvcIfqNRgqJ83hvabVwZDJikVhranAhiyZFoLYahzHfxDQMBIgJTYVsCQ9IWHIVqEYyQMyZQWBScxP4DQj1MutBn7ccCR/hCG6tcDtb7S9TCAkSkyhKHsiwJHAJEBvvwYUvE+Xmf21Wqj/mhKK47BQra9VetJsVbV3/1oOgyt3GoF9xwr1QdhhXrfloqvPo4mwJDpXsVhCEAC9izlTd/NzeN+3xLd7E36ys9UrTavADTzw5CMLmUgK2FGnkN9LEiOr+0DM30djYahIq2Vq9bv952I2MS2zd7tO1K1vuorj+n2J7enVevJGJbS8pGntduf9iECJcGKKFefJ/NJfwmGtOuJgEKvhwJMkSLLVeuTrxRFGe4rsAsAytrtj/sQmaLA02qj/mhKS4yhUIPRIlmpPlW01/zdkabD0Mbtdp17eencjjwn37bZud0aoJDA0O+f7luK7D251e61WeF+vTu6vfcR+hcRqCvJYGhBKmGIL971KI4nANbm+/oIkAQJITGulDZewkgNMOowpAILRqzkOQlga46V7X5s6/pMX0FjYahMa2UYOr0dPJAksIiwszm9uYMHGw5DpS8EFkjN4RjerqXI4sBeGApjeWSo9JdhqLieCCib0x93WIfFkwJMWb0+w9Dpz8FDR4Kbwb7KNJ1PrWnA02irprQwCkRgqIgEiUhR098d6BIYOvrn9OK6HT6nADyb46s7rAngwD35fiBRNgo/8nNOwwUAum0azWBoQdJgiIMERIk08NCAJaa5Og4KXNo4qf4+dUjTrqGEmyB6beHcM8+Qa+gdq8GQcg6mLyUVhhLMw/eFgpGW1iIwhAAT2wPskOMMhuq+AnxgWksBFQ14+mAI9w7J+Qp/BIY+5PUAoOBxCTAyRUaOoS9IS0VQYb58iqviawTw1NsaKa1JMNTwdwe6CIbew/N4iamy80+EGjhOAUd48P1WbvfagKHVzr2+x3uc+r8XvuaWwdCCNAyG5LG4+GvAE3+WQPZHVccx9cNQ7bz0a8iAwhYjEWHKQCN8jBpbjmlfh2mpqr9NlvfYbHFTdCOthaCDe4T2p4PrAD42AFPoi8CQ4ivDk1+BSxgqUlpELRhKm7gDcCSp/igM0euJabgN7EGCcxMAU6TI/EHhK+wRKnxJGJIpMqoq8DTaWimtKTDU8ncHugyGPsJzglSZTyFCiuzo3j8k4CDQ0L+1BkOmK2sYDPGoSB1oYt+Dngarj5MaAENqtMY3KNeA/ctzYsI+sq/8rKiAodxSgTbT0lWHoQgn5A0sLa0lYSiDRwDx0LeEodKX2AgtgB76lSktoioMcbih0v2J/vJ6fAqshKEyRQbiMORTK2mPCabAShiqpshANeBptAW4afsbsmcI4eeeU2SgS2EoPKeQ1vKAk55TBpywqRruUdj3Y5Eh002kwVCxZygBTGyvAI2MrGQ4aI8rVcLQeTsUyCowpPgsFftAmo856B9bh6Ha+ZiWLgZD5x9ufeAbozPQaGmt3C+DDoGa1FfCUM0XlYwMaSkt2l2DoToI6SkycjyN4dcTUmAShrQUGUjAUAIf+saXhKFGigxUAZ56W0xpaf1BCgzJSBCHn/tOkYEuhqH4THzUZ4Vvlmkw1EX4yW+jGQyZrioNhrZn+jYZiYiIX+ZOBit9awNyaxwTnTebhxDpQwUhEAIdNQQppU34wbfAilPrGctgSJ5r6cz0BSQjQ+n3euJ3kqaoZForSMJQ9pH7Chiq+qISMKSmtMLCnSM3xDYn93ag10L/m9i7t9O2cg4Shuj1YApMwJCaIgNJGMKoS/AV3AsYqqXIWFSJXufRfbwd6m2nENWp+SsicSIVhsdrUaJ71OUwFJ8TXCdupK4BDt6fzcY9P68NhkzXFXzZsiyKYTLNJQlDNZVprema4mvKmJb0FNk06SmyaWqmyCaomSKboHtPkYHGw9CyZTC0IBkMmUzX0TAYGpLWGqopvqaMaamWIpuiWopsinpSZKPVkyIbrftPkYEMhrgMhhYkgyGT6ToaBkMm0+PIYIjLYGhB4jBkMpnmksGQaWkyGOIyGFqQio2BZmZmZmZmZsPMYGgZgofpnJmZ2dwGb0n9+1ceNzN7VPv27cm9v5fHv6r995/B0GJkMGRmdh0zGDJbmhkMcTMYWpAMhszMrmMGQ2ZLM4MhbgZDC5LBkJnZdcxgyGxpZjDEzWBoQTIYMjO7jk2FoR/PT+65e3JvE8ZqNsXfj5fbjvkzYkzNkq+Psq1mtxqzFDMY4mYwtCBdC4bC7xWVx4daKG9RHh9il85tZjaHTYKhcxjX7SeM1WyKv/NTLGtxh2Nq9jv7+hjqa+qYl5FjFmTXhKGf357c8+rJvT4QZBoMLUgUhrS6YGhn5YvQskuBZAkw9Pcw/R7i2O5Qtpk9hhUw9PfJrUk9Lw0Czj/CuP3bk/sXj/39FY49yajLFH+3GBMhR/4NkePkPD7iEvtuTsq9e8m+Th/5/oD9Rl9/8jl/J/01eCnGRPv1PZ+HbIMxcG3y+FexyTAUnwer17Z5cu8EfPpgCJ4L3Pvj+/3ce4OhBQm+lPIBwxe3e3pyh79K20C7FEiWAEPb7sn9jf97zPUAlAIEwXUYDD2uMRhCoNiGYx4EoCAwLPpkjExp/VqTBYTCEPrbEH/PESJq/oaOoekuMgZgYtAYcR+GjkEY6qAgskidARD6KE4slixhiKWuEITiOSP0SMBS010Y+YnzSOhRx3whmwJD/tnF54Hwk44R+DEYMn2qxsKQrNxei3YgkNBok/TX8iXhAfrC+Ja/oXMXsHQOf3wBXOS82F+DkjHn5CM9CEfy/srPPfOaPYZRGMLoToKfmL5COPJjZEorgsjh9OQ6ERlCfwkw0F8EHc1fa0yKmojUlTbGR30aY9h9QJiSoKSMQRja78OcFER82+bJ7bvQh8GQSHchOCX4ie3snCspMpgHju0jhDIY+uIpMrApMOQh56mEGISb3Ws4jjC02+TI4uYY7jX2TetFA5puaQZDCxJ8seQDbi3OFBQwlaMBEYIO+pCQIT8zWFDapb8xc8u+LRjy/5v6rdyLIfNQw2gPfqbXW4Oe2nGzxzAKQ0UkSESKUh+RIvOmAEURbRFRH81fawwu7nOMofcAYUqCkjYGYej0J6TE0pgILnAOhwgpFIZkuquIBIlIkTYGz9VHHj6e3CGmymj7V0+RgY2God9P7puICqH9/hnu52oXngtCkwQghCWLDJmuqsEwFI/JhR4W+RooVIFD8y98aTAkU1+D5xZ9i3Z6brEvtntoqaS3Cj/ynCJYeVN8eECKKQGcW/o3GHpcGwtDMkWWbCIMSX+tMQgJMnU1ZQy1FO0RoKSNSTAEMALQE1NleA7puIAhmboaAkNyDB7DqA/uGyqiU184RQY2JwxhqozBEIn4QDuMlXBkMGS6igbDkIyYRNOAQD2uwFACBSXNNBSG5LEhfYt2AUMUgIq+I+ahpkaN4j3V+qN/g6HHtVEwJFNk1NcUGFL8tcZ4SFBSV1PGJNNSauS4HENhCKM0+xOfD/dQJRhS0l29MFQZg1EhjEIwGLIUmbc5YQgjQwg7NRhCWDIYMl1Vg2HoCpEh6YvaUBgaNPfIyFA6v57zLPw0zkm7p76vBknEv8HQ4xqFodqeIQQCLW2UTIEhbS9Pn7+5xlCQ0cagIbiksdFqYygM/YNrJm+DIZRIGGqluxIMCfjRxtA3yKRBPzhnD2dfOEUGNhqGyFtkEmJkGqwGQxYZMt1Eg2EoLs6tfT6ybws4+hZ6DYZo5Khv7lZf5hujVMIX+tDSW7KPOg/4lfeKQA89B3lfqf/WPTK7b6MwJCNBGClKr5XXUmR0LG0XkSAJGKq/vjFK6kpGggaNoeMiuNC22hgGQ/RNOvJmmYQhNXVVeZsMQUYdI0xGhoaM+Qo2GoaUvUFwDFNkNGIk9wzJjdfoB+FJzvMZZjC0II2BITCIZqR/NVVgBKwPhrAP+1dYDViIPzq/Fk3BvoczT8XJvsyPcm4ILzLyI+dpnZO8PrmXqLZJm93jaAZFj2cMhsDw7a34TGtRotSfAAUzkQrD47WIDzuvxhgtdYVjoG3MmNrG6dYYCUMY4aF9GQwp6a5k+AYZPWfo0xpDjMEQnLOlyLxNgSGwBD/ke4zQg30Afta78CYfPjvWByA3ApK9TWaaXfCFkw/4Hq2Aq2ubBBbFbn5OZg9lBQxVTEZbZPtYm+LvnsfUTEZ8ZLtmU8dYiizYVBhaqhkMLUgGQ7rJyJRmtz4ns8eyoTCkprQusCn+aqmrlt1qTM1S6mqErynpriljlmoGQ9wMhhYkgyHdam+FUbv1OZk9lg2FITOzRzGDIW4GQwvSo8CQmdmjmcGQ2dLMYIhbgiG6GcrMzMzMjJvBkNmSDGBIfse/vBkMmZmZmZmZmX1pszTZMgQP02Qyza/n52f3798/edhkelh9+/bNvb+/y8NfVv/995/B0FJkMGQyXUcGQ6alyWCIy2BoQTIYMpmuI4Mh09JkMMRlMLQgGQyZTNeRwZBpaTIY4jIYWpAMhkym62gaDJ3dj+dn99zt3dvosVIz+3qZyxdoTn+/k68/H3P4epnJFyj6W92rv3EyGOIyGFqQ7g2Gwi8/n+Vhk+nhNAmGzj/8uG7/5sYOLTSzr5e5fIHm9Pcbff1xF/MB+HqZyRco+lvdq7+R+nwY+u1+fntxz08bd3z/cJ9wC5g+H4bOW/Zq25i18++hC+O6g/srG0fprBTU3Lrhp/I3FvIcM2Z+SRgaCyO+P7mX/v6K8bJPS2PnN5nuVRyGQpRG/r04CRI4/3h2z8+d27/9c/8wshP7b05wjOjvL7dOPjfz+hIr7fnHC/GFQ9ah6KuM7kTQwevUgIf7i1GidG4fvD+c2ws/N9r8G339gcUxRokavr73+HpJvnDI91A4VIkWpbZKpCb4Wyn+nssx8dzw3DXg0fzdUuNhCOElPo/jO78muObUPgRwDIay/h5ch4sl/O/BEILwEW3g4lxXhCH0g+cy2O8yYEhKg6ExunR+k+lepMLQ9lSAQZZMayHAdK6DvxUCOgKMxLYChi70xVYsmdL6636t86LNfAEI/TjFBS/381BS9YcwlM/tjzg3ABR6brlVpsgQhogvci0BRFq+aIrsr/v1PS/k3Jdok2BD/aW2OCZWZGdjEIQ2R/fx71+EHoAHCnPS3+01HYZWbrWC57Qrnse3ly60Pd8H4IzRlWEoQEZ3ODN40ddHjM4EoMCoT3eIOBIjSP6zh5XOHc5joaUmAUPiXIIEgMH8gZzEceJHRL3StVxJMAcVh5FwntszjYLhNcj+5TXhuReAkyA2GG0q+ppMD6rRMFSktRBgNm6/70RkJrZt9m7fhT4Mhsb68gsx8UUXW5nS8lGktduf9iGaJCNDRBg9YtEh6S/BEDm3P3huEW7EuaXZihQZwhD1hQvsAF80ReYBZe32x32ITFEYEm0qoMiUVmMMRosS/MSxTxGOVH+foOkwtHG7XedeXjq3I8/Dt212brcG+CMw9Pun+5YieE9utXvNgP39G+kbfKx3R7f3PkL/IgJ1Jd0EhvJiiossX4RD1wgOafGkQCJhJWp0BKemSmRIgASFI7/Qp89lu/eRzktpv4KGwBC99xJW5GctMsT7nN1WptXIZ+nPZHpUjYUhntbyRxLAnN4OHjwSQETY2Zze3MFHXzgMjfXlF2Lqi6wkWorMC1NrDRgKY3lkqPSXYej05+BBAYAkQYE/tz/usA6LKgUYniLzR1Rf/nIG+JIpMi9MrSlpshTRUWComtJSxhSRIBEpavq7oS6BoaN/Hi+u2+HzCMCzOb66w5oADlz79wOJplH4kZ9zGi4A0G3TaLeBIblgkghC2veTwIcO79lPNDcMCcscIeEon1s41A87AZ4UCJxRQ2CI3UO4hga89MOQkL9PAhhrfU2mB5IKQ/TvBQMjmdYixzzoRFCJ7QF2yHEGQxN9fWgwJFNaRH0whHuH5HkU/ggM+XOIqSp/bgA75DgDGJkiI8fQF6SlYjvz5VNc0lflLbJJMNRIaSlj+mGo4e+GugiG3sN9f4mpsvNPhBo4TgFHePD9Vm732oCh1c69vsd7mfq/F77m1qfBUJkyykCS108CKRrwNGFIBxw0Pr88z5wm8ucioIxaC4YCAFFbHgxxmOX3QPY1mR5V9bfJ8l6aLW5kLtJa/iABmH9pX8/+dHAdQMYGYAp9ERga5Sumujawz4f4wgW3SGkRtWAobcjuSbmFgwRgwrn5CE1xbgJgihSZPyh8hT1ChS8JQzJFRjUFhlopLWVMLwy1/N1Ql8HQR3gekCrzqUJIkR3d+4cEHAQaukYYDHnJyBAVwgOCilxoC4BqwtAY1c/Tz0n3K6kqYUhe5yIjQ/6+iNSgwZBpgarDUExjkTetyrSW78UAJgNG+LsQ+pYwNIuvuOKWKS2iKgxxuKHS/fH+kCbJb4/h/qEShnKKjPriMORTLswXLqilLzVFBpoAQ82UljKmtmcI4afp74a6FIbC8whpLQ846XlkwAmbquFehH0/FhlKICE2Jp+3BDDEnhYGOmIc6oowxOGlMj+RhJ0AQ3L8A8KQuLctGAr3wGDItDwxGDr/cOsD38ycIURLa+V+GXTIW1zFm13YZyZffpHWUlpEKgzVQajuT8BQAp9wbuHNMglDJEXGfAkYSuATfflzkjDUSJGBRsNQT0pLGyMiQRx+evzdUBfDULz34ecI8M0yDYa6CD/5bbSvC0Pd1m0rb5Px6I/Y3KvtLYID4g2mZJMXXj2lxt1pfWRUJB5nABd9bQEcHguG6DXV3ibD5xT6HNzWYMi0QMnIUPpdHv/dJ9ERNa3lGwTAZB+5r4ChuXzBIqWmtMLCnaNKxDYn93ag10gMAOi0rZ8bA5hwbrBgpo3UEoZIioz7kjCEUZfgK7CEgKFaioxFleh1Ht3H26HedqqktBB4tDFwEfgGWTxeixJ9pi6Hofg84HpwI3UNcPA+bDbu+Xn9lWHo0siNaYjgy2YymeaXhKGa9LTWNM3rS0tpTdec/vQU2TQ1U2QTNHdKa25/l2g8DC1bBkMLksGQyXQdDYOhWlprimb2paa0pmpOf7UU2RRpb6RdorlTWnP7u0wGQ1wGQwuSwZDJdB0NgyGT6XFkMMR1ZRgy3VIGQybTdWQwZFqaDIa4EgwVm8fMzMzMzMzMzL6KGQyZmZmZmZmZfWmzNNkyBA/TZDLNL0uTmZYmS5Nx2Z6hBclgyGS6jgyGTEuTwRCXwdCCZDBkMl1HBkOmpclgiMtgaEEyGDKZriODIdPSZDDEZTC0IBkMmUzX0TQYmvmHE+f0NduPJoLm9DfnDyf21Ckbrbl/NHFuf+NkMMRlMLQg3RsM9dUmg3pzuVDvvQt+QPS6teVM96tJMFStLTZBM/tS65RN1Zz+SJ2yi/mgVqdsquauKza3v5H6fBgqa519pgyGFiQJQ30wIuX7k18L98VxxXjZp6X2/BW4kEV4B841p7AosAS1x4I305ziMISV6ulrudtUNBXFa4thcdXQf3MSdbhYwdRcgBV1kS+x0mp1xVLhWRndiaCD16kBD/eHhVrx3GKBUhScWypgmguwonKdMqzw3vaVC6zqvmSdMiz0qlWtT22VSI1WVyyMeS7HiEKuGvBo/m6p8TAkiq4e38vital9COAYDJmuJPiCUrVhpF8aDI1Rc/7ztgQdOCYA6XoA8tcduifHTy+Uj+kOZ99WzKuds+lLSIWh7akAgyyZ1kKA6VzXldARYCS2FTB0oS+2YsmUFla3j1BHfQEI/TjlauSxn4eSqj+EoXxutOZYqGDPzy23yhQZwhDxRa4lgEjLF02RYXX7fJ3Zl2iTYEP9pbY4BuBJjkEQihXsA/SQyvWqv9trOgyt3GoFz2lXPI9vL11oS5XoH0cGQwtSG4Zw8Y/14rxx8Mj9Q1/816D/F2HsWACOiOTQpqIvUdkWzqvSPag6F5wvXEv92kppMIQKbQUM1aJZpsVrNAwVaS0EmI3b7zsRmYltm73bd6EPg6GxvvxCTHzRxVamtHwUae32p32IJsnIEBFGj1h0SPpLMETOLVWjj3Ajzi3NVqTIEIaoL1xgB/iiKTIPKGu3P+5DZIrCkGhTAUWmtBpjMFqU4CeOfYpwpPr7BE2HoY3b7Tr38tK5HXkevm2zc7s1wB+Bod8/3bcUwXtyq91rBuzv30jf4GO9O7q99xH6FxGoK8lgaEEaAkMUEiSQyM9aZIj3ObutTKuRz9JflgIbHnS2Tusd1JqrvLaQ6mr5mwJDrTGmJWssDPG0lj+SAOb0dvDgkQAiws7m9OYOPvrCYWisL78QU19kJdFSZF6YWmvAUBjLI0OlvwxDpz8HDwoAJAkK/Ln9cYd1WFQpwPAUmT+i+vKXM8CXTJF5YWpNSZOliI4CQ9WUljKmiASJSFHT3w11CQwd/fN4cd0On0cAns3x1R3WBHDg2r8fSDSNwo/8nNNwAYBum0YzGFqQhsAQD8bwtI+El34YEhJAU++rRIF8iqwFL0JsLuXaKlEc3A9UGp27BkPhmrTjpmVLhSH6/WFgJNNa5JgHnQgqsT3ADjnOYGiirw8NhmRKi6gPhnDvkDyPwh+BIX8OMVXlzw1ghxxnACNTZOQY+oK0VGxnvnyKS/qqvEU2CYYaKS1lTD8MNfzdUBfB0Hu47y8xVXb+iVADxyngCA++38rtXhswtNq51/d4L1P/98LX3DIYWpA+A4ZKuLgeDNXnUq5Nm4NJG4MyGDJx1d8my3tptriRuUhr+YMEYP6lfT3708F1ABkbgCn0RWBolK+Y6trAPh/iCxfcIqVF1IKhtCG7J+UWDhKACefmIzTFuQmAKVJk/qDwFfYIFb4kDMkUGdUUGGqltJQxvTDU8ndDXQZDH+F5QKrMpwohRXZ07x8ScBBo6N9tgyHTlXVzGJIAc0lkSD1G1JxLubZKZChLG4MyGDJx1WEoprHIm1ZlWsv3YgCTAQMWB+xbwtAsvuKKW6a0iKowxOGGSvfH+0OaJL89hvuHShjKKTLqi8OQT7kwX7iglr7UFBloAgw1U1rKmNqeIYSfpr8b6lIYCs8jpLU84KTnkQEnbKqGexH2/VhkyHQTXQWGxNtTLRjybfKzShs6bITIT+VtsuZcwV+xZ6j55pdyP5L082uPMS1ZDIbOP9z6wDczZwjR0lq5XwYd8hZX8WYX9pnJl1+ktZQWkQpDdRCq+xMwlMCHvlkmYYikyJgvAUMJfOjbYBKGGiky0GgY6klpaWNEJIjDT4+/G+piGIr3PvwcAb5ZpsFQF+Env41mMGS6quaGIfr2Vu1tsgAl2OfgthJYKuRQaytSYfL81Lnw2ujbZO2Umy46ns6VzqAn2mRaqmRkKP0uj/+OkOiImtbyDQJgso/cV8DQXL5gkVJTWmHhzlElYpuTezvQayQGAHTa1s+NAUw4N1gw00ZqCUMkRcZ9SRjCqEvwFVhCwFAtRcaiSvQ6j+7j7VBvO1VSWgg82hi4CHyDLB6vRYk+U5fDUHwecD24kboGOHgfNhv3/Lw2GDJdV/BlexjN+ps9CuhdQzJVZ/oykjBUk57WmqZ5fWkprema05+eIpumZopsguZOac3t7xKNh6Fly2BoQXooGJo1ynIbGKpFs0zL1zAYqqW1pmhmX2pKa6rm9FdLkU2R9kbaJZo7pTW3v8tkMMRlMLQgPRYMkf1AF+sWMDQnvJkeTcNgyGR6HBkMcRkMLUiPBkMm06PIYMi0NBkMcRkMLUjFBkAzMzMzMzOzYWYwtAzBwzSZTPPLIkOmpckiQ1wWGVqQDIZMpuvIYMi0NBkMcRkMLUgGQybTdWQwZFqaDIa4DIYWJIMhk+k6MhgyLU0GQ1wGQwuSwZDJdB1Ng6GZfytoTl+z/U4QaE5/c/5WUE9pjtGa+3eC5vY3TgZDXAZDC9L1YegWv+djMt2fJsFQtZzGBM3sSy3NMVVz+lOr109UrTTHVM1dSmNufyP1+TBUlvf4TBkMLUg1GMKaXuwHDkndMTAGONW2MTCkFzvtL6B6f5L10nj5tq7xq9RYQJabvCem+xeHISzOSp/rNtUJQ/FyGlhPLPTfnETpCVYjLNccQ13kS6y0WimNVGtNRnci6KTvrgI83B/WJsNzizW5UKyKfa45hsqlObCoadtXrimm+5KlObC2WVGoVdQS0wBFK6WBFeqfZHRH1C4b6u+WGg9Dos5YrESfBNec2ocAjsGQ6UqCL2ghXwNs67YMTEJB0vTZ19zCX1dutX1BGAIwJOcbwCjXJxsCQ9Vm08NIhaHtqQCDLJnWQoDpXAeALKAjwEhsK2DoQl9sxZIpLVLxHoz6AhD6ccoFOGM/DyVVfwhD+dxomY1QtJWfW26VKTKEIeKLXEsAkZYvmiIjFe/jdSZfAEL+Okm/Z1JclfpL0JP7eX+9Vev7/N1e02Fo5VYreE5YqT4IK9T7tlR89XFkMLQglTCEi7EAk6LgKFm0W21qdfhaiYp+GCprfdEx8L/Bd2suGXmh5x3LZxzgenIbj/JIfwPko2YwTs5dXmsThpIf7TO5dlIZ/fDGHLhDR6MTW3d+pL88D6bRMFSktXKl+f2+E5GZ2LbZu30Xq7RTx2N9+YWY+KKLrUxp+SjS2u1P+xBNkpEhIoweseiQ9JdgiJxbKsAa4UacW5qtSJHlqvXZFy6wA3zRFJkHlLXbH/chMiUjQ0QY7WHRHJnSEv4o1OB4Wak+VbTX/H2CpsPQxu12nXt56dyOPA/fttm53Rrgj8DQ75/uG4267V6bFe7Xu6Pbex+hfxGBupIMhhYk+OJQ5agFB5MyOpPbW20ZPvIiLiMlWf0wVIBXAQTtuSRM8XNHiJL+tXMdIXHOl0SG8vnKe0WuPQIQ9H1OwBNBaHvO4XrWbppbY2GorDifAeb0dvDgkQAiws7m9OYOPvrCYWisL78QU19kJdFSZF6YWmvAUBjLI0OlvwxDpz8HDwoAJAkK/Ln9cYd1WFQpwPAUmT+i+vKXM8CXTJF5YWqtAUNaJKea0sIoEIGhYryIFDX93VCXwNDRP48X1+3weQTg2Rxf3WFNAAeu/fuBRNMo/MjPOQ0XAOi2aTSDoQWJwRBb+PtgKICFDkO5TV/cawVMy8hJMgEs6I+DRc9cMrIi24Vvr7gXqgYn/ZLQIs9ZSrsHMnr15LpO3vPKtT9HOILreJbgQ9pNs0uFIfpcGRjJtBY55kEngkpsD7BDjjMYmujrQ4MhmdIi6oMh3Dskz6PwR2DIn0NMVflzA9ghxxnAyBQZOYa+IC0V25kvn/6SvipvkfXBEEZxWPqqkdKaBEMNfzfURTD0Hu77S0yVnX8i1MBxCjjCg++3crvXBgytdu71Pd7L1P+98DW3DIYWpAxDcjHtg6Hc3mor/YIU6PAqwcEfFf4zTEjf8jOIzCU2eWdrwBCIjJPn1icfiRKgOASGqs0gH2mSfbRxIWW2BQI6b5UoEIx5Du2m2VV/myzvpdniRuYireUPEoD5l/b17E8AtpBCAZhCXwSGRvmKqa4N7H8hvnDBLVJaRC0YShuye1Ju4SABmHBuPkJTnJsAmCJF5g8KX2GPUOFLwpBMkVG1YChtet64o5JyU1NaU2Co5e+GugyGPsLzgFSZTxVCiuzo3j8k4CDQ0L/RBkOmKyvDEN1nIwwWc5meootvq622SBcRGtAwGEoRrCKF1TNX0V+qAkNJfe1cGgiBLoMhuq9pwLVbZOjTVIehmMYib1qVaS3fiwFMBowA8KFvCUOz+IorbpnSIqrCEIcbKt0f7w9pkvz2GO4fKmEop8ioLw5DPuXCfOGCWvpSU2SgKgzFaI0EoeSvktJSYKi2Zwjhp+nvhroUhsLzCGktDzjpeWTACZuq4V6EfT8WGTLdRBmGpCSYCBBgANRqC36KfTwKJJRzxqNFf/Spb6auz6X7z+qDHQ4ccv9RVjwP9RrlOUlpUJOV54xzpI7k2umeoe7gwkdoV/YMpXbT3GIwdP7h1ge+mTlDiJbWyv0y6JC3uIo3u7DPTL78Iq2ltIhUGKqDUN2fgKEEPvTNMglDJEXGfAkYSuBD3waTMNRIkYFUGKqDUG9KS4EhGQni8NPj74a6GIbivfdRnxW+WabBUBfhJ7+NZjBkuqqGw5BfPUmaSUR2qm3gp3OHM22vRWeUOb3rEh78sQJcECRolEvORUAKrbIfKRzCN8tK+KrCkBwjxzbTbsr5YT8ZgVM2jxfXzv4a0DfNwnUbCF1PMjKUfpfH338SHVHTWr5BAEz2kfsKGJrLFyxSakrLDyRRJWKbk3s70Guk37W9eztt6+fGACacGyyYaSO1hCGSIuO+JAxh1CX4CiwhYKiWImNRJXqdR/fnEM6vaANgOW31lFZKqZX+aCoMj9eiRJ+py2EoPg+4HtxIXQMcvA+bjXt+XhsMma4r+LI9pCQYeLWjKrOqN+V2a93w2k2DJGGoJj2tNU3z+tJSWtM1pz89RTZNzRTZBM2d0prb3yUaD0PLVg8MaXtPxiwa+C/jMWOmCaMLMuowRPrYodeu9atEGa6sR4UhPSpzOyCA519GdT5Tt7t20zANg6FaWmuKZvalprSmak5/tRTZFGlvpF2iuVNac/u7TAZDXMNgCCEBUwKDgeMWMCRSEYPPDdQaG6+9d0US9+gT9ZgwpKSzvL4yEHzla79PDYMhk+lxZDDENQ6GUhSkfPMlR0Xkj+YpsCH2YVz0r3Lca4H7WAookedB9sA0x14OQxhxStcXrzt8DuO6w5mdH59ORp20t7ayoI/JZJpfBkOmpclgiGscDGFkKK3YZeQnFAWVbx+JjaIJHJT2qVKjVqV/fn7YTRt7OQxxeJT9MujQ3/CRv5NT3ss6EDHwNDMzMzMzMxtuvTAkLLOQhKMc/QiHShiRCnBSX+AHSwOa3vMT/TQYoqaCkdKPXo+IgmUXEo5yJMn3YVEk3l6LpEGbyWSaXxYZMi1NFhniGhcZIiknumBr1oKhAEAVeAg9FMDIpsKABjS959cYyySum0neIylyLRpsKTAE16eCjwJIVNBmMpnml8GQaWkyGOIaCUMiOtGzOGswJH9T5qqRod7zi9LGCiHAlb7Ke0SV3lSLlseX44ZGhkogCzIYMpmuI4Mh09JkMMQ1GoY4vMh9LaUk7IQFXY6/EgwNOD8vbex5W4KLep7lPUpifuW55IgR3VBdtBdRufq1GAyZTNeRwZBpaTIY4hoGQ8J4ZELrIzZM43EGBdHXFiIgGmQMFPVPLZ1k4/x6xvKoTu0cNf/BB0aT8FSSvxD6ibCzddva22TF+dVBCAR9TCbT/JoGQzP/VtCcvmb7nSDQnP7m/K2gntIcozX37wTN7W+cDIa4emDIdD3JyM/lMhgar8/5wUV49jW4Nt2jJsFQtZzGBM3sSy3NMVVz+lOr109UrTTHVM1dSmNufyP1+TBUlvf4TBkMfZo+H4Z45KsddaKS+6Bqe5g0qRvDB0rdtyWiZ/Rc/FzNk9OhpHqOjblabdp5tCFM/jYWXrdVH/sscRjC4qz0+WxTnTAUL6eB9cRC/81JlJ5gNcJyzTHURb7ESquV0ki11mR0J4IOXufmVC5a3B/WJiP96QBWxT7XHEPl0hxY1LTtK9cb033J0hxY26yoWi9qiWmAopXSwAr1vo4ZHSBqlw31d0uNhyFRZ+wYKtEnwTWn9iGAYzBk8vpsGDq7rdwL1gSHKFj0i03fQ0AqXC/+yGQdBCqCDeUxpSj3cqXPftO52J/Wuibvs9xjpp9ja65WW+U8irmpAgzJIabPkwpD21MjEiLTWggwnesAdAV0BBiJbQUMXeiLrVgypUUq3vu/R8QXgMuPc7jGBFh9/hCG8rnRMhuhaCs/t9wqU2QIQ8QXmTuASMsXTZGRivfxOpMvAKEfp1BgFfs9k+Kq1F+CntzP++utWt/n7/aaDkMrt1rBc8JK9UFYod63peKrjyODoQWJwxAsqLAg0z1NZRQE5RdsXJx9lIP0lZ+paJvsJz+Hgwpo9AnhQIz10EFBjPfDf+WBafPVAVA5x+pcrbbWeehRqaAGDME9fe5cChKxz+SZk4rqPKAEfWhUY+vOj/QX65M0GoaKtFauNL/fdyIyE9s2e7fveDX6Sb78Qkx80cVWprQ85Kzd/rQPsCMjQ3kgqyCfD8sUWe6Xzi0VYI1wI84teStSZLlqffaFC+wAXzRF5gFl7fbHfYhMycgQEUZ7WDRHprSEPwo1OF5Wqk8V7TV/n6DpMLRxu13nXl46tyPPw7dtdm63BvgjMPT7p/tGo26712aF+/Xu6PbeR+hfRKCuJIOhBamEIQ5A9SiOiGxgXw9HChhQCRDoH1c7XleOrPCxDODCkbJdJQpQ6zzKttZcrbY0tjiPBvA024K/5+7g3iLY5PQZgk4GIN83AU9s355zmJ+1m2oaC0NlxfkMMKe3gwePBBARdjanN3fwURoOQ2N9+YWY+iIriZYi88LITw2GMF22gQgKPSz9EWj6c/CgAECSoMCf2x93WIdFlQIMT5H5I6ovP/8AXzJF5oWptQYMaZGcakoLo0AEhorxIlLU9HdDXQJDR/88Xly3w+cRgGdzfHWHNQEcuPbvBxJNo/AjP+c0XACg26bRDIYWJA2G+IIqohH0RymLlTcCUicXeqoSGvrHaWMa8tElhC0FMsQcEO1pQwgqnKfeXJ5ja65WG6h2HrQPV5ifRpR4BCdEfvAe58BPgJ0tIxvoG+HIR5Ek+JB2U1UqDNHnw8BIprXIMQ86EVRie4AdcpzB0ERfHxoMyZQWUQWG0l4if519KTJyzPeFc4ipKn9uADvkOAMYmSIjx9AXpKViO/Pl01/SV+Utsj4YwigOS181UlqTYKjh74a6CIbew31/iamy80+EGjhOAUd48P1WbvfagKHVzr2+x3uZ+r8XvuaWwdCCNAyG5LEgv2DLqFGEJa0/yKeZNOBpjitBoy55DX0wpLTrJ9G8F9KPP9KYq9WWxioT9cGQMiTrvPX/guLgU4Oh2M+PkTCkjTFJ1d8my3tutriRuUhr+YMEYP6lfT37EwBqiLj8+4e+CAyN8hVTXT56Q3zhgluktIgqMJSVN0anTdSqP55Owz1C5bkJgClSZP6g8BX2CBW+JAzJFBlVC4bSpueNOyopNzWlNQWGWv5uqMtg6CM8D0iV+VQhpMiO7v1DAg4CDf2HncGQ6coaBkOVfSrF/p7Y9yD3w8TWGgj1jJOg0Bbd7yQM5q7u1YmfKhASNA6GZDqQzdVqa5zHdBiK0Ry8x+mvhAY2FhmaQ3UYimksiIZGKCjTWr4XA5gEH/77jH1LGJrFV1xxy5QWUS8M4Xh6nZo/DkOQJslvj+H+oRKGcoqM+uIw5FMuzBcuqKUvNUUGqsJQjNZIEEr+KiktBYZqe4YQfpr+bqhLYSg8j5DW8oCTnkcGnLCpGu5F2PdjkSHTTaTBULFnCAEGFkay2srIUN5cHP2kvvGzCkKtcSgFNNi4luRYATTV/UuapK++ttZcrbbaebSAp9UG7nHfT4CfvAcofpZ7hlIqTfaX7aaaGAydf7j1gW9mzhCipbVyvww65C2u4s0u7DOTL79IayktIg2G2HWiP/EKfeFPwFACH/pmmYQhkiJjvgQMJfChb4NJGGqkyEAqDNVBqDelpcCQjARx+Onxd0NdDEPx3vuozwrfLNNgqIvwk99GMxgyXVUaDG3PNLpSRi9ytEXuJSJ9adSI7jOiBit3a1wlyoPAMQ2GcA7lGkSbBj3lnO1zHDpXq42DXCVKVzwbHPvm7zFLdRVvk0FkSDxz9leEvmkWoNZAqF8yMsT30pDoiJrW8g0CYLKP3FfA0Fy+YJFSU1p+IIkqEYsbpVvXqforYCj4gAUzbaSWMERSZNyXhCGMugRfgSUEDNVSZCyqRK/z6P4cwvkVbQAsp62e0koptdIfTYXh8VqU6DN1OQzF5wHXgxupa4CD92Gzcc/Pa4Mh03UFX7asdnThrsQ2Sd9QAG9FxOZGkuA4ixCGrv1n4+tJwlBNelprmub1paW0pmtOf3qKbJqaKbIJmjulNbe/SzQehpYtg6EF6VFhCFI1WuTm+mpFZ66rMio1hwyGrqVhMFRLa03RzL7UlNZUzemvliKbIu2NtEs0d0prbn+XyWCIy2BoQXpUGPpMfQ6IXQvCDIaupWEwZDI9jgyGuAyGFiQOQyaTaS4ZDJmWJoMhLoOhBanYAGhmZmZmZmY2zAyGliF4mCaTaX5ZZMi0NFlkiMsiQwuSwZDJdB0ZDJmWJoMhLoOhBclgyGS6jgyGTEuTwRCXwdCCZDBkMl1HBkOmpclgiMtgaEEyGDKZrqNpMDTzbwXN6Wu23wkCzelvzt8K6inNMVpz/07Q3P7GyWCIy2BoQTIY+iKCkhxWRuOmmgRD1XIaEzSzL72UxkTN6U+tXj9RtdIcUzV3KY25/Y3U58NQWd7jM2UwtCBxGFLqW438BcZQvFWv6wXyv6Kstus1voLNXYLitqpVoL+pqjCEhVr5Pfc1zUwXSYMhrFYf7nNZmoKX08B6YqH/5iRKT7AaYbnmGOoiX2Kl1UpppBpkMroTQQe/S5tTuWhxf1ibjPSnA1gV+1xzDJVLc2BR07avXG9M9yVLc2Bts7JqPWmrRGq0UhpYob4YI2qXacCj+bulxsOQqDN2DJXok+CaU/sQwDEYMl1J8AXNuuQXqAPMdIdzWRg1dYG6Xlu3rbWjWLHWx9cjwJD9AvX8kjAUQGhbQEuWTGshwHSug3+kCOgIMBLbChi60BdbsWRKi1S8B6O+AFx+nAOAJMDq84cwlM+NltkIRVv5ueVWmSJDGCK+yNwBRFq+aIqMVLyP15l9iTYJNtRfaotjsMBrb9V6UqxV9Xd7TYehlVut4DlhpfogrFDv21Lx1ceRwdCCNA6GZORIi9goVeLJ8e251k5UhaH2/BiVCpbH1463/cXyFwcojkraWKV5ca+KNuk/X3f9nIgKf6kh3ksaTVOq3pPK4f46xsIQq24vP8M4mJNWtIc26uevO6xp1AlAgDQvXAyGIhg000JFWitXmt/vOxGZiW2bvdt3sUo7dTzWl1+IiS+62MqUlr+Wtduf9gF2ZGQoD2QV5PNhmSLL/dK5pQKsEW7EuSVvRYosV63PvnCBHeCLpsg8oKzd/rgPkSkKQ6JNBRSZ0mqMwWiRrFSfKtpr/j5B02Fo43a7zr28dG5Hnodv2+zcbg3wR2Do90/3LUXwntxq99qscL/eHd3e+wj9iwjUlWQwtCDBFydLLt58gZWFQv2CXlRw12EnR0f0dqYKDDXnr1Wxrx3v85fSdgKQyPVq/fN15b5FZKhxTlmtufA55XvEryUATk51RWAZC0Nx3hBRkj7D5wBA2HcdIx+xHUBoe8rpAda+fDEY8nDy5LqOQLCAiLLifAaY09uBw1SEnc3pzd9nCUNjffmFmPoiK4mWIvPCyE8NhjBdtjmxhan0R6Dpz8GDAgBJggJ/bn/cYR0WVQowPEXmj6i+/PwDfMkUmRem1pQ0WYroKDBUTWkpY4pIkIgUNf3dUJfA0NE/jxfX7fB5BODZHF/dYU0AB679+4FE0yj8yM85DRcA6LZpNIOhBYnDEFeIXtCIiAQUrXioAjts8VfapbS5tGN0/hhFKaJazeMNfxFuinFU9LogBVgBHB2GenxLKfeQjfcpSAKGz1vH+KYnTZYBOAJgGhtAyi/ibLwGUdA3Rof+woIrzoG2fwFRGML9NQgg8nOCFQYWBGD+RVCJ7QF2yHEGQxN9fWgwJFNaRBUYSnuJ/HepL0VGjvm+cA4xVeXPDWCHHGcAI1Nk5Bj6grRUbGe+fIpL+qq8RTYJhhopLWVMPww1/N1QF8HQe7jvLzFVdv6JUAPHKeAID77fyu1eGzC02rnX93gvU//3wtfcMhhakFowxIAgLuB80SyjRyXsyIVbtivSQGXI/KRPCWPieK8/HYZ4eguMwFARJQsqYCgcLM9JqDpXcU/F/AA+DGj6YagWGfLy/mA+2kcbB7Dz7LYQ+oExzzIKFKJFzbkWpBYMJZCAyBl8LtJaIAow/9K+nv0JYDdEXP79w/07BIZG+YqpLh+9Ib5wwS1SWkQVGMrKG6PTJmrVH0+n4R6h8twEwBQpMn9Q+Ap7hApfEoZkioxqCgy1UlrKmF4Yavm7oS6DoY/wPCBV5lOFkCI7uvcPCTgINPRvn8GQ6cqCL1pVFEpYZKIlCTuNt8Qq8FCHoSHzg3SQKeGu5U/xIaM/UyNDTMo8/nBjrj4YmhAZqgNKjOb4vVPUpzbOIkNUapqsAkNlWssPYgCTxkRoD31LGJrFV1xxy5QWUS8M4fh83bo/DkOQJslvj+H+oRKGcoqM+uIw5FMuzBcuqKUvNUUGmgBDzZSWMqa2Zwjhp+nvhroUhsLzCGktDzjpeWTACZuq4V6EfT8WGTLdRBSGzltlj5DYp1KLYmT19etrx4W/L+LUkgILxfE+fwqkCEAJPxOAn3v2DNXAr3auzbmUMSwyFVNbeTNP2Ew9AYbOW1iwz/6PkE+n+f8Nip/lniGYw3eo7BlK7cuXtoEawQEjRRBFS6+9F1AhAIa+xZX6ShiayZdfpLWUFpEGQ+cfbn3AqA/6E6/QF/4EDCXwoW+WSRgiKTLmS8BQAh/6NpiEoUaKDDQahnpSWtoYEQni8NPj74a6GIbivQ8/R4Bvlmkw1EX4yW+jGQyZrioWGfILcCtyExZhvY8eASphow9CoIsGQ76hPr88dySF2vE+fxoMJSjBazu4bRG9wfZG+q55Tln1ufpgKM6Zwsxbd347uK54nr6jsmcogpRMt3mf9G0ygCj63GVaLKTNkt8vBEIg+Wo9RofwfgQQwuMydeQbBMDAmin3GgkYmssXLFJqSssPJFElYnGjNN8zRKJANX8FDAUfsGCmjdQShkiKjPuSMIRRl+ArsISAoVqKjEWV6HUe3cfbod52qqS0EHi0MXAR+AZZPF6LEn2mLoeh+DzgenAjdQ1w8D5sNu75eW0wZLqu4MtmMo1XO6JkUmCoIj2tNU3z+tJSWtM1pz89RTZNzRTZBM2d0prb3yUaD0PLlsHQgmQwZJomg6E+DYOhWlprimb2paa0pmpOf7UU2RRpb6RdorlTWnP7u0wGQ1wGQwuSwZBpmgyG+jQMhkymx5HBEJfB0IJkMGQyXUcGQ6alyWCIK8FQsXnMzMzMzMzMzOyrmMGQmZmZmZmZ2Zc2S5MtQ/AwTSbT/LI0mWlpsjQZl+0ZWpAMhkym68hgyLQ0GQxxGQwtSAZDJtN1ZDBkWpoMhrgMhhYkgyGT6ToyGDItTQZDXAZDC5LBkMl0HU2DoZl/OHFOX7P9aCJoTn9z/nBiT52y0Zr7RxPn9jdOBkNcBkML0r3BkK/HVanVZTI9kibBULW22ATN7EuvKzZRc/ojdcou5oNanbKpmruu2Nz+RurzYaisdfaZujoM+Srf8MqaWliyLX2sVkSUFNhs9lv24ixhaCyM8Mr28f6L8bJPS2PnN5nuVRoM+dph6W9LWaeL1xbD4qqh/wYLu6JYwdRcgBV1kS+x0mp1xVJBVhndiaCDfz83p3LR4v6wUCvpTwfAuaUCprkAKyrXKcMK721fucCq7kvWKcNCr0XVelFYVQMUra5Y8PfsnmR0RxRyHervlhoPQ6Lo6vG9LF6b2ocAzpeBIVFFfOACGtQaGyGnd5GN/UbN+9iCe0V1KYxoMDRGl85vMt2LJAwFENoW0JIl01oIMJ3r4G+bgI4AI7GtgKELfbEVS6a0sLo9/q0lvgBcfpwDgCTA6vOHMJTPjdYcCxXs+bnlVpkiQxgivsjcAURavmiKDKvb5+tMvgCEfpxCtXns90wqzVN/CXpyP++PwhCCUKxgH6Cnz9/tNR2GVm61gue0K57Ht5cutKVK9I+j68HQ34Prnjp3OMP/16BEAA/0zSGJxtjLYQgjTh1OeN6Sz2Fcdziz8+PTyagTOfdPVBuGwv3enum58/PO/eWzyfeqABz/rPT7VPQ1mR5UDIYiGDTTQkVaCwFm4/b7TkRmYttm7/Zd6MNgaKwvvxATX3SxlSktfy1rtz/tA+zIyFAeGMGkxx/pl84tVaOPcCPOLXkrUmQIQ9QXLrADfNEUmQeUtdsf9yEyJSNDRBjtYdEcmdIS/ijU4PgEPxh1inCk+vsETYehjdvtOvfy0rkdeR6+bbNzuzXAH4Gh3z/dNxp1273Gawag/Eb6Bh/r3dHtvY/Qv4hAXUnXgyEULpYMSnCxzektv3DKdJc69nIYyjAD88l+GRYCAOC5IjjQsSDZ/nkaAkP0PCWsyM9aZIj3ObutTKuRz9KfyfSoYjDk4eTJdV1M4/u/HxwieFrLH0kAc3o7cJiKsLM5vbmDj9JwGBrryy/E1BdZSbQUmRdGfmowhOmyDURQ6GHpj0DTn4MHBQCSBAX+3P64wzosqhRgeIrMH1F9+fkH+JIpMi9MrTVgSIvkVFNaGAUiMFSMF5Gipr8b6hIYOvrn8eK6HT6PADyb46s7rAngwLV/P5BoGoUf+Tmn4QIA3TaN9jkwhMd4GKGILKhji6hMbcFV+lFgifOhZRcSjnIkyfdhUSTeTo99hobAELtVcC0NeOmHISH/vATg1vqaTA8kCkO4vwYBRH5OsMLAggDMvwgqsT3ADjnOYGiirw8NhmRKi6gCQ2kvkf872ZciI8d8XziHmKry5wawQ44zgJEpMnIMfUFaKrYzXz79JX1V3iLrgyGM4rD0VSOlNQmGGv5uqItg6D3c95eYKjv/RKiB4xRwhAffb+V2rw0YWu3c63u8l6n/e+Frbn0ODAkQ0aGkMpYpp3PKNbeEGi4CSxpsKTAEsKOCjwJIOoxluwY4gV+qW8BQ2uSezGDItDy1YCiBxPbEIj08jUYB5l/a17M/HVwXIy7//uH+HQJDo3zFVJeP3hBfuOAWKS2iCgxl5Y3RaRO16o+n03CPUHluAmCKFJk/KHyFPUKFLwlDMkVG1YKhtOl5445Kyk1NaU2BoZa/G+oyGPoIzwNSZT5VCCmyo3v/kICDQEPXCIOhAoZ6gUAbKxTSa5qvEmqo5CKex5fjhkaGPnvdvzkM+XtBUpsWGTItVGqarAJDZVrLD2IAk8b4vz/Yt4ShWXzFFbdMaRH1whCOz9et++MwBGmS/PYY7h8qYSinyKgvDkM+5cJ84YJa+lJTZKAqDMVojQSh5K+S0lJgqLZnCOGn6e+GuhSGwvMIaS0POOl5ZMAJm6rhXoR9PxYZKqBE7rupSBt73pbgou7XKaEmifmV5yL3DFXak99y/9Nn6SowJO5fC4YCmBoMmZYnbQM1ggNGirb+FXctrQUSAEPf4kp9JQzN5Msv0lpKi0iDofMPtz5g1Af9iVfoC38ChhL4hHMLb5ZJGCIpMuZLwFACn+jLX5eEoUaKDKTCUB2EelNaCgzJSBCHnx5/N9TFMBTvvY/6rPDNMg2Gugg/+W20rwVD4i2jZGlx1NJIcSHtGcujOhoIgTT/wQdGk/BUkr8Q+omws3Xb2ttkxfl9PgiB4FyoLoUhep21t8nwXoY+B7c1GDItUPLVeowOpb8P+Fs/alrLNwiAgTVT7jUSMDSXL1ik1JRWWLhzVIlY3CjN9wyRKFDNXwFDwQcsmGkjtYQhkiLjviQMYdQl+AosIWColiJjUSV6nUf35xDOr2gDYDlt9ZRWSqmV/mgqDI/XokSfqcthKD4PuB7cSF0DHLwPm417fl5/MRh6WMnIz+MIvmwmk2l+FTBUkZ7WmqZ5fWkprema05+eIpumZopsguZOac3t7xKNh6Fly2CokMGQyWTiGgZDtbTWFM3sS01pTdWc/mopsinS3ki7RHOntOb2d5kMhrgMhgoZDJlMJq5hMGQyPY4MhrgMhhYkgyGT6ToyGDItTQZDXAZDC1KxAdDMzMzMzMxsmBkMLUPwME0m0/yyyJBpabLIEJdFhhYkgyGT6ToyGDItTQZDXAZDC5LBkMl0HRkMmZYmgyEug6EFyWDIZLqODIZMS5PBEJfB0IJkMGQyXUfTYGjm3wqa09dsvxMEmtPfnL8V1FOaY5Tm/o2guf2Nl8EQl8HQgmQwZDJdR5NgqFpOY4Jm9qWX0pioOf2p1esnqlaaY4rmLqMxt78J+nwYKst7fKbuF4aK+l9W56pPGgxh3bVc3Ha4WmP768NhAVtumq97Er+u4TXn+DhRAy4p3xO13Re+fcwf/Fy6NBjy5TLIfwOyNAUvp4H1xEL/DdYyQ7EaYbnmGOoiX2K11UpppBpkMroTQQe/15tTuWhxf1ibjPSnA1gV+1xzDJVLc2BR07avXG9M95VLc2Ax1ugLa4VVfMmCrVoZDaxO72uY0Xss6pZpwKP5u7XGw5CoM3YMleiT4LpT+xDAMRjqFS+cKo7ZQlEV3J+s8Eva3eHsF+BxENIeq1WzL6UUhr17nd22Vbi2JgB3Mi58VzWQCvek6/T7B/Ntt7x4ruk+JGEogNC2gJYsmdZCgOlcB0AsoCPASGwrYOhCX2zFkiktUvHe/30lvgBcfpwDNCTA6vOHMJTPjZbZCEVb+bnlVpkiQxgivsjcAUZavmiKDGGo39czFA7VfCXoicVhsbhrb8V6CV/S3+doOgyt3GoFzwkr1QdhhXrfloqvPo7uEIaw2rxcTPBf1TEKESNHuGDjv1xg7aKV1PlaJqMVIqKB/zKnhguTaJOAcA/iMISKC3BxvvJeyPud+/Cx8Hy0SJBUA4b8syM+2GcYB/8bvwfKcxp07pqG+M5i0Nc8Z6FqG94T5R76MVt3hu8ZhSE4Tqujn/GPLhzv3OGN9iOfTbOKwVAEg2ZaqEhr5Urz+30nIjOxbbN3+y5WaaeOx/ryizHxRRdcmdLy17J2+9M+wI6MDOWBrIJ8PixTZLlfOrdUgDXCjTi35K1IkSEMUV+4wA7wxVJkCEM1Xy/Zl4QhmdLywLN2++PeR7ko1GC0SFapT9XsNX+fpOkwtHG7XedeXjq3I/fQt212brcGACQw9Pun+5aibk9utXttVrhf745u732E/kUE6kq6PxhC6FBWUYQcvzinNBqHowwqEqpwAc0LZ/AXPye48s54X/Yv/9LPvWgMDMmohx7tUcbGhT78ayya8qyaMMTmk3Pg/c2wwCMtsV2e+6Dn0eebCqNj+drr5yzkv8Oaz3xP4P4XvkMDeQ48UgV9nruDy/yDn8Hvs+uMhK4mBkMeTmKED/8bEBBRVpzPAHN6O3CYirCzOb25g4/ScBga68svxtQXWUm0FJkXRn5qMITpss2JLUylPwJNfw4eFgBIEhj4c/vjDuuwqFKA4Skyf0T15ecf4ItXr88wdNR8vQDARF8ChqopLYwCERgqIkEiUtT0d2NdAkPhHr64bof3MADP5vjqDmsCOHD93w8kokbhR37OabgAQLdNoz0UDGGqjMFQA1IC7AhYon7jXP6Q/99DFknh9440GIbUyIUSrdDGivuE97V8XPg8qNH7GWGjSBlpEEXODSMotFk9d009vv1HEgEsLqp2zlTKPRNt+fuG10HOQUaGqHz0Z+swOOTH4aJMIMk0vygM4f4aBBD5OcEKAwsCMP8iqMT2ADvkOIOhib4+NBiSKS2iCgylvUT+v4m+FBk55vvCOcRUlT+3ABrpOAMYmSIjx9AXpKZiO/MFxwtf8i0yAkOKL78g43EGQ42U1iQYavi7sS6Cofdwr15iquz8E6EGjlPAER58v5XbvTZgaLVzr+/xfqb+74WvufVQMISRId80Foa0FFg06o9FhsiiRFNvwYYsvrcVnFcpZXEmUbT2NSlji6iH0occVx5jFoXRJG1cgJASIlDaGE1aP+JbSAVi9Zyz/PekBjNsfnFNNB0ro0HsGVEYCv2hPaXPTFdRC4YSSGxPLNLD02gUYP6lfT37EwBuiLj8+4f7dwgMjfIVU10+ekN84aJbpLSIKjCUlTdGp03Uqj+eTsM9QuW5CYApUmT+oPAV9vUUviQMFSky9IUwRHzFVFdIY+FeIAJDrZTWFBhq+buxLoOhj3APIVXm7yGkyI7u/UMCDgIN/RtmMDRMaaHWF7wi0jMShspFO6oABBklygvgMiJD8v5qqo2l1670Icdr0JCiIQcJN9q4G0aGqIprrZ1zbG2CEIjPj6kxljITYASbdBPnqJEhcj7X/mvxhaWmySowVKa1/CAGMHlDcvhbEvqWMDSLr7jqliktol4YwvH5unV/HIYgTZLfHsP9QyUM5RQZ9cVhyKdcmC9cUEtfPEWGvjIMNX0RGGqmtBQYqu0ZQvhp+ruxLoWhcA9DWssDTrqHGXDCpmq4H2Hfj0WGRortDYpCIEkRo7EwFP8lri1ioOBfXxR5G/rR+36mBsOQekyT1k8ck2kz0a8GQ3nPUnxuqaOAXrz/8jkTx7yd+pbq8Q3fKelXfp9a59wEIZC4Jxr4N2DovIU/3uLz9uz/qMCeofC/TdeQtoEawQEjRVv/iruW1gIJgKFvcaW+EoZm8uUXai2lRaTB0PmHWx8w6oP+xCv0hT8BQwl86JtlEoZIioz5EjCUwIe+DSZhSEuRoS8CQy1fCYZ6UloKDMlIEIefHn831sUwFO+Xj/qs8M0yDYa6CD/5bTSDoRFK8EOMrW+jYcgfIW8RodF9G8Pa/OvPKgB8rjgMaddDwQbvF7F0L3vGiiiayh2af/QhU10sAoPAQM9BAqw4PwEhfTBU9y3PmTzj1jnXUrDFOUhAlFAVfTGwy29hdIeD2yIMqVEje5vsWpKv1mN0CJ9NACE8LlNHvkEAjJJukzA0ly9YpNSUlh9IokrE4kZpvmeIRIFq/goYCj5gwUwbqSUMkRQZ9yVhCCMvwVfgCQFDaooMfVEYavhCGKqltBB4invGU2F4vBYl+mxdDkPxHsI14UbqGuDgvdhs3PPz2mDonlWAEy74xYJ2v4Iv2+NLAsNIqWk01IW+TV9WBQxVpKe1pmleX1pKa7rm9KenyKZJT5FN09wprbn9XarxMLRsGQx5lVGl9K/9B1o5DYZCRLGe/rvMt+nrahgM1dJaUzSzLzWlNVVz+qulyKaI+Lo49DJ3Smtuf5fLYIjLYChJSQ092KppMNSna/o2LVnDYMhkehwZDHEZDC1Iy4Ahk+n+ZDBkWpoMhrgSDLGIiJmZmZmZmZnZVzKDITMzMzMzM7MvbZYmW4bgYTpnZmY2t8Hr5f/+lcfNzB7Vvn17cu/v5fGvav/9ZzC0GBkMmZldxwyGzJZmBkPcDIYWJIMhM7PrmMGQ2dLMYIibwdCCZDBkZnYdMxgyW5oZDHEzGFqQDIbMzK5jc8PQj+cn99w9ubcZfM7q62U+X2Do788If2nMR9k21qb48mNW48bUbE5fc5vBEDeDoQXpkWEo1QTrntzfxjEzs8+wWWHoHPx1+xl8zuwr1OqawRfY7wn+yJiPoWNqBr5eRvqKY1ZjxtRsTl9XsGvD0K/v4VnC3/Dj+5P7Vzkmx32WGQwtSBKGQr01KPDJj/89wK9rl1+Gq9jfJ1bUVTsf+CMMx899xyaYvwcGU2YXmoQhiMbg93l7En/U/z65NWk/iYXw/CP427+FcT6yE/tubulLRCukLzj291c4Bv8NsWhRBKf037QCPL/R35/gD3zRMU+bEhLkGB9ZoddD+/99ct9f+PXQ6wVfMB/6kv01SJJj2PxHfX5sP/bNf2c2GYbEdeOzfCffJ3jW317CPcN7rB27JzMYWpDgS0kfLoBAF6MrFCpuBkMRaLZncizCEQMi6CeBRTtmZvZJVoMh/9+XAAUECPxvTwKMTGshwNzcl4AhmSL7tSYLHvUFIPQjL2jYT8IXS5GJKBFCjwQcmdZCGMHroekmhCt6Per8MAZBKAIYgooEHJnWwvlXqzLdhvP7tucShqSve7MpMOSvOd5HhJ90bPXkXskxCT7asXsyg6EFSYWhQ0w3EfjRYCilpKIhPBV9lYgN1HRjwEN8FlEg4cP7p//C2OrH+s4Tz+NAxkKbjwyJ8XCutA7d4W95brX5W3Ohb+ZLpP2ac5vdrdVgaL8voykeSDZPbt+FhZQBjJLWQoC5ui9YnKkvukjLFFmMIu1PMZokI0PEEmTR6JCAnwQu4jODISVFhjCSrodEWbTrSTAiUmRpPoSf2M6iU0paa/D8EoYUX/dmU2Do57dwP2SKC9Nfu9cQYWQRwNWT223KYwhO92IGQwsSfMnow0UYwmgMLrwScCQw+HZcxONYCkfwL7G06Iv2ZGJOaR4msE2LAinHmucZfSKY1MYgTOHcsp2el7xP1LS5hsBQa26z+7UaDJ3eAiwkEIiAAov8IUZMKMBoqSgEmGv7QvhIvshipPnyhqm1BgzhWBoZkukuf24RLDb7J9dFn3RjdWvM6c+TW9P9PxGc5PXQ+WmKqogEiUiRNobOf9Tmj1EOP7+AIc3XvdloGPodIjsyJQb2+2eMku0yfMookHbsnsxgaEGqwhAuvHFhZot8BVooFNDIDyzo53P2WwWGGiQR/wkcFPApjo08TzQJHE1gkecsz0HMK+dq+h7Qbna/VoWhf3ExjLCAYJCOC4CRaa10bG5fHxVfeFzAkEyRJeuDIdw7JM+DpshIf4QLuHd9KTLa35/399zOrgeOCxiSvobAkBxD5wfQkfODv3RcwJAfd8cpMrA5YQhTZQZDprtQC4bAYAGHzxoMpfClksKhfrYwDsbERbxY4NEq8ELPZVRkaMB5aoAyCobEecmx1LS5+nz3tZvdr7VgCNNEkFLyEY9N6It7aRLAKGkt9IX9qC8PIVN9fei+YBFKvnBBkykyeu0tGCIbslnKTXuLLB7DaFCKEiEQKSkyfz0EhjDVVVyPhCHlLbJeGFLG0PkBdNL8xxAlghRZmp/C0AOkyMDmhCGMDCHoaOCjHbsnMxhakPpgyC++sNgrMFSL4KRxsGiTiBAs7AANAAW1sRowJH99ERh5bMB5avNJoGkCiQJctfm0uZq+B7Sb3a+1YIhCARimmiTA1FJRFIZm8wWLVZ+vuKDVfHlrwBAFFXpcS3cVxxCOyIZmOUbO8U+8DYZ9JQxpKaraniGEH20Mnd+DjniLis1PYKjm695sNAyR62/tGYLjGvhox+7JDIYWpF4YIvtWJCDIftL84r/Nizn4hs+1yAkYboRm0aEL3ibrO08NUEbBEPzvxvWMmgvBymBoEdaEIfrmlfI2FvbR0lrp+Ny+IqA0fcU+1RQZWAWGaiBE/dEUWYKRGAnCzxg90sbIeSj4wPlgCkrCkJbukpEgCSzqGAlDBHxgAzCbn8DQI6TIwEbDkLI3CI5hiky+YSbBRzt2T2YwtCANgaG0SItFP0ESmlik/UIvozkKEBQW+1ErUmcaFGjHes6zF1AGAAlep+afmjYXHsexsLfKYGgZ1gdDmJKiqSEGMJW0FvqioDOLL7Ioyb4MhmopMhFVSrZ5cm+HCASyDYDpVPFHwSxa6qOl1fB6BAxRiMIFlcFQJd3lDd8gi/PXokTa/Ag6OD9NgTEYepAUGdgUGAJL8EOepQQcDXy0Y/dkBkMLEnwp5QM2G27y7TQwFSjNvpxJGBprzVTUSLtXX8zfiBRRLUU2xWTER7ZrNmVMzeb0dW2bCkNLNYOhBclg6DKTUSSwvtSc2dewS2GoltaaYrP6aqXIJlgt3dWyKWNqVkt3tWzKmJo9SooMzGCIm8HQgmQwdLnJNJyBkBnYpTBkZnZvZjDEzWBoQTIYMjO7jhkMmS3NDIa4GQwtSDSiYWZmZmZmZjbCDIaWIf8w/39mZmazG7w99f9VjpuZParBG2H/H+X4V7VvBkOLkcGQmdmVzGDIbGlmMMTNYGg5MhgyM7uSGQyZLc0MhrgZDC1HBkNmZlcygyGzpZnBEDeDoeXIYMjM7Eo2FYZg3P9+4lhpn+3rVmNqBov3WF+3GvOIZjDEzWBoObo7GPo/R5PHzcwezabA0K847v+mtI016mvseUib4utWY2o2xdetxjyqfQYMwZz/u0+Yd4gZDC1HBQyNhRHoC/8iws//d2W87NOysfObmd2raTD0fxGv5f6vlXY8Dj6wL5R+oX3/X6K9NtdcvqCdnu//oyeKI8dgf5zj/6SMk2PGnLNcLKUvtP8DGSPbLhnz/xTHl2hTYeh/iWPxHo6BG4Mh0y3kv5j04V4KIxoMjbFL5zczuxeTMIRwIgFAjqFwgYs9HJPQAf+tYX/N7xhfFGyG+KJwIH1pY2T0BAFCAo6cZ8w5y8VSS13heeAYCTZzjVmqTYEhfE4UfuEYfH+H3DODIdMt1AtD8B85/DHAP3xg8C8yrT/+sUCDL7vsAwbjaT/wr/kzM3tkgwUA/9hjFKOV/tJSZAgDcAz+N12I4TNGXaGPtoDT1E2fL1ishvjCawGQQUiQi5ocgwui/ExhSI4Ze850sdR8gcHCCscQ5qi/Occs1abAEEaEtHHwXYJ2Ckr/x3hPMdKGMATfdfw+7MX9xjG4ptwqSmcwtBz5Lw59uBJG8A8NApBsl5+1yJDsAz5pf/pZ9jUze1SDP874B1tGF8AkRMi0FvrAY7joUn8AE7hIT/EFY4b4kiAChlAkr6M2BudHsJHjWmOGnDNdbDVfCGDQTwObS8bcavH9bBsLQ5ge01KiYENhCO47ApBsx8//7/j5/yo+X9MMhpajQTBEIzfwv1vwMgSGqGGUaEhfM7NHMviDjH/gMaWFMCM/Y38JCAgDcAwWY2ynKTcNYMb6wnMd6gusBUOt4+AfrC9FNvac6SKtpa4wwkPHULCZa8ySbSwMaSkyakNhiKbJ0CfAER2P7QhgMnp0DTMYWo4+BYagD/5BRKv1NTN7VMPFGv63hB8ECfiuQx8tRYY+EAbQB6ancKwEmFrqhvqiaSq6WA31Ra9BwoA2hkbG4BieCwKRNmbsOeNiqPlCeMI+EmzmGrN0GwtDc0WGNBiC+w7PACNH0gyGTGPEQARMwsjcMATj6ZwWGTJbqsEfbAkDNRjS0lroA2EAx+Afe+wrAWZuX9BP+qLXIGFIGyOP4f3ARVC2TzlnXCw1X9hHM+g315il21gYQtihz0drnwJDADsIQ58FpAZDy5H/ktKHK2FkCgzRdtlHwhAcl58NhsyWYPAHG/9AS3CgUR7sK6ECj8N/H3gcF2jaVwLMLXyByWui88hjcsO03FCtjRl7zrhYDkldySjPtcYszcbCEBhCIwUeiBjh22QUlugr+LU9QxKuAEjg8y32CEkzGFqO/JeIPlwJI2NhCCM9YLW3yRCAsA89B9nXzOxRjcIQGEZD8LuvpYg0H9AX/ch0GxgFmFbqRvqSQDLUl4zQoMFiVxtDfaNhn9aYMecMi2PLl3YuADbXHLM0mwJDYPjc8NnTSA8FIDgO9xT6UhiCY3D/0YdMgSEQUbsFHBkMLUf+SyMfsJmZ2eUGf7iHLJS1tNYUm9sXXMMYX7caU7Mpvm41Zgk2FYaWagZDy5HBkJnZlWwoDEG/udItn+3rVmNqNiV1dasxSzCDIW4GQ8uRwZCZ2ZVsKAyZmT2KGQxxMxhajgyGzMyuZAZDZkszgyFuBkPLUbHpzMzMzMzMzGyYGQwtQ/AwTSbT/Hp+fnb//v2Th02mh9W3b9/c+/u7PPxl9d9//xkMLUUGQybTdWQwZFqaDIa4DIYWJIMhk+k6MhgyLU0GQ1wGQwuSwZDJdB0ZDJmWJoMhLoOhBclgyGS6jqbB0Nn9eH52z93evY0eKzWzr5e5fIHm9Pc7+frzMYevl3l9rcb4mjLmdjIY4jIYWpCmwdBfd+jiTvru4P7K5odSuJbtWR7/CoJrf3bb8yf+0T1v3XN3cG+1Uzj/aLffsSbBEFzv87Pr9m9u7NBCM/t6mcsXaE5/v9HXH3cxP4Cvl3l9rcb4mjLmhjIY4jIYWpBqMHTeBthRIeG8dU9PW0eb/h4696R2vpH+HlxHX3ccDGnLhaHz9tnfh7f4GZ7R8/bs8t/Y8TDkfTw9ue6AXi/UF4Oh849nf//C97Rz+7d/5HnE9mc8HiM7sf/mxPu6v7/c+vk5+tq4kzbXVF9iJT7/eCG+cMjaPcNvKcnoTgQd/G9xc/rgcxX+YpSI9qcD4Nxe+LnR5t/o6w/ME6NEDV/fe3y9MF8v2dex7euo+loFX3BPUt9sEnrYGOLrXjQehn67n98g0rUjka6/7td3uM6NO77PcZ1/3a//+Tajv+EyGFqQ4D/IUme3fercdlsBHIAhARufCkMezjp3ICcE59PRA1UtF4akLoOhs9s+AwSd/f0yGOqXhKEAQtsCWrJkWgsBpnMdRGIFdAQYiW0FDF3oi8GQTGn9db/WBOqoLwCXH+cADQmw+vwhDOVz+yPODQCFnltulSkyhCHii8z999f3Hl80RYYw1O/rGRZizVcl3RWgRwJWe8w9yGCIy2BoQVJhCGHHR1uUCBD91832kFNm0TKEkHSaN+orANfhACAj26JEtEcHFvBTawMpsMNgDtuDnzAXB6v2dVBp1zTH/EEFcBYROrwX4c+Bjwx5+AnQw58RwAzCkJi7yTlhTBOG/h7cGiIG+NxO5M8Ta4v3isJOX/sDicFQBINmWqhIayHAbNx+34nITGzb7N2+C30YDI31BQBBfdHFWKa0/LWs3f60D7AjI0N5YASTHn+kXzq3P3huEW7EuSVvRYoMYYj6wgVygC+WIkMYqvl6yb4kDLXSXTGiVEBPa8yd6HowBMcAaPC//ZXbveZ7DT7Wu6PbrwNEQp/N8d19/EMQyn9vnlY79/p+mxtoMLQgwZdHClJkAWjCQl1EWAZGhnyqjRzzfdI4XIAbYEHm4GOJFGDjGgYjFEAC8GWf7eug0q5p/PxyviRxrX8PW/+v0tQV2+PfgQxD2KxHhigAyTGl+mDo7Lbrg/sbHfw9rElk5687rMPY0AzRppjKq7TDAr4IGPJw8uS6jvxjQkAET2v5IwlgTm8AiQQgIuxsTm/+nkkYGusLgIL5IquxliLzwshPDYYwXbY5scW99Eeg6c/Bp8QASLzLCDub0x93WAcwoQDDU2T+iOorBHr6feUUGfoK/Y6ar5dntzlGXwKGWumuEFEqoac15l50HRhCEMpw9Psn/Rx9QFpx9xoAyPdHYLLIkGkGFTDkF1QBBnLhHwJDwk9QjJz4Y30RHaEa9BTREalhMMLPg5xn73XI49KX4r9vfuX+xgbiH8Zt3fm8TbCKzwD/GEiwqcEQS5Nh2iofEeqDISEf6YmARv83iqbJUjs9n2WkyXB/DQKI/JxghYEFAZh/EVRie4AdcpzB0ERfHxoMyZQWUQWG0l4iD319KTJyzPeFc4ipKn9uATTScQYwMkVGjqGv7zntxXzB8cKXfIuMwJDiyy++eJzBUCvdhT4l9LTG3I8mwxCJSmeL8AKRMuizObp3vPbfP903D5sQ/clA9RrbAShzu8GQaQZJGCrgR4MBZbHWYUh++WkERAMHriIlp0HP1WAoHuu9jsq4JMV/3/zK/c1NGKk7uy0MgvPzfUs/nwVDPhoknpvPlIHv5/i/URSGfLRD7KlZKAwlkNieWKSHp9EowPxL+3r2p4PrYsTlHywEEoZG+YqpLh+9Ib5wUSpSWkQVGMrKG6PTJmrVH0+n4R6h8twEwBQpMn9Q+Ar7egpfEoaKFBn6Qhgivo77sKF7c8y+KAy10l2xLYwlja0xd6TJMNSKDEXwKf/GYiqsDkMQKXo3GDLNIfjCZYUFVX4hwViqTFmsdRhqQYoGDkQScqr+evwokNALI0VkSJtXk3Yuiv+++ZX7m4RtKSIE4+FcYW5+np8CQxJ4LDIUPmCarAJDZVrLD2IAw9/4wr4lDM3iKy46ZUqLqBeGcHy+bt0fhyGIFOS3x3D/UAlDOUVGfXEY8lEH5gvTMqUvniJDXxmGmr4IDNXTXdhXbpxujbkvXROGQgpMDPeqw5BFhkyzicGQB5Ay4iH30GiLdRFRiot8sd8oSQMHIgFD4VV/HUrC+fHzhmM4N9uDg5EeASPFniHRXr8OKv2ahsw/GIYiqMGbfjgG/G+322KfkQpDDHSuD0NwDuENKv/J7xFKe4Jws3SCnbBg19sfS9oGagQHjBTB5vL02nsBFQJg6Ftcqa+EoZl8+UVHS2kRaTB0/uHW8PzCA4z+xCv0hT8BQwl86JtlEoZIioz5EjCUwIe+DSZhSEuRoS8CQy1fCYYa6S7cOF28ht8Yc2e6CgylVFoNZuSeoXPRP+wxgj1E78r468lgaEGiMFTduCsXeW2xJumk+ttkFAJ0cKDC3zoKPg9F5IOqSKmx8wtzhbawz4bDSOcO53z+JXS1roOqdk1984+BIQUMPTiW80oY8s8o7uXgb5ORPx9VGAqv1rN7UPm9oQBA2B6fW/o7SN8W2/rNvJDm098mi+3rBcAQKEaH8N4FEMLjMnXkGwTAKOk2CUNz+YKFS01phUU9R5WIxY3SfM8QiQLV/BUwFHzAG0JpI7WEIZIi474kDIUoAvoK67GAITVFhr4oDDV8IQw10l21jdOPkiIDXQeGSD/2nRKwtNq4jX9zL7SHqBC6/OX+B8fb22SmKYIvlclkml8FDFWkp7WmaV5fWkpruub0p6fIpklPkU3TlHTXlDGfpfEwNIfKNNm9yGBoQTIYMpmuo2EwVEtrTdHMvtSU1lTN6a+WIpsi4uvihXZKumvKmM+TwRDXfcCQ9paPzBOYemUwZDJdR8NgyGR6HBkMcX06DKX9IQR+0rHGXgtTKYMhk+k6MhgyLU2fA0P3q0+GIdyMWtvkSl+JzrWUMHoE/EQ35vJgktwoq/y+joxGIXyJtmFvH32+iusxMzMzMzMzG2afBkMIHUpKDCHHg0hKo3E4Su0FVCEIVV7nTnDlnfG+6YfvdD/3LLgfJpNpfllkyLQ0WWSI63MjQw0YwlQZg6EGpATYEbBE/dJXlsVv8BS/vUPE/N65DIZMpuvIYMi0NBkMcd0tDGFkyDeNhSEtBRaN+mORIbI/iabegkkYor81U9pnpdVgbpPJNL8MhkxLk8EQ1+fCUEp3yaiMvmdoLAxVoaR4e01GifL+I4sMmUwmgyHT0mQwxPW5MESiMBRcijfMxsJQsYeISyv5oLehH73vvclgyGS6juaHoZl/R2hOX7P9hhDozn9HaE5fo35faMqYeWUwxPXpMAQqyi/IN8NGw5A/oqSysP/wNl8nymBocaqXKzGZSs0OQ9VSGxM0sy+9zMZEVUttTJBa2X6iqmU7JmhKCY4pY2aWwRDXXcDQrVWAk7bh+gE1FYa06FxLEl5bt41thFel1PO6gcbCUPU6RMpVhfixbZ8kX/yVnlMqV2/SYCjV7ZJRFFHvSwMLXmoDa42F/husc4Zi/nI9MlThy9fzQl+iLIT0JVZircxG9TojOOF1FnP5NZ+W2sBaY6Q/HcAq3Od6ZKWvUOOqz1euSi+LqcqyHVi3LPoSVehzUdaWr1iCA+5JmjebhJ57KNsxHoaG1ia7RFa1/oYqo0qtjdyPJLiG0fKFRLduO7SaO/vpAYQELR0ZImz421B13/cOQ63rwLZ4jL2lOLXtk1Q81zWpUG/iMESqxINRSEDY2Jz8ghpARQKOTGshDHWu8y9zcOgIMBLbChhSfPmFe6AvBkMyRdZznT/OARoSYEmAkSkyBJh8bjR1Fgq68nNTfflzVnyRawmFVLMvtbI88wUwFPrL1Bn6Wq3gWVZ8VdJdAXokYLXH3EoGQ1xfEIZASpps0MJ43+IwBJABCyy9VrngIoiE/58WZx+1kJEzOXZAm5fwXagFQwiuaCItykMtYp76WFA5vk/SP0IM9UuuZWobE1SX79zhgG9HYsV46E//9ZkryfvoDq1uD5XrSXvwCXP1/JnxFec7d3jEEvNXEIMhv/h37nA6uA4ggEACRlES/MQUFsKRV5HWylXo9/tORGZi22bv9lDlW8KQ5stDQsUXtFFfdDGWKTJ/nWu3P+0D7MjIUB6Y5mQAU6TIEGDIuaXirLFNnJvmK5yy5itXTfewQXwxgClSZAhDA3xJGGqluzCiJKGnNeaGuh4MwTEAGvz7tHK713w/wcd6d3T7dQBF6BOq1iMIkb/bVrXeNEUlDHEAklEc/9mvwOVC79t8pKBsYyoWdqme8VUQKIEln5Myr4Cy5lilvV/ldUiftM/UNq4ALhR2EggR4AnprdgH7sMzhaOt/9dugh/RXhVA1LNFhlBamixFRAgkFJEgESnKfRTgAQB4AwglQBJhZ3N6cwcfpeEwpPpCMFF8AVAwX2Q11lJkXsp1MmG6bHMqUkEq8MC8fw4+JZZAKcLO5vTHHdYBTCgM8RRZ3VcI9ATY2ByzLwowZWX7DEPHPl8ChlrprhBRKqGnNeaWug4MIQhlOPr9k36OPiB1uHsNAOT7IzBZZMg0gzQY4us9RIkiMHh4QJjQFuOYyunkwk2ljZPq66OdJ56fjDiR84/nh+MYYPSOvRYMBb868Axr41KiOCrMxAjSG/5vHAPnvHXn8zb5LiJHqv76xbI7vPX0+zqaD4ZkWosc86ATQSW2B3/kOIOhiq8UpZG+wmKejjMYkikyIuU6w+G4l8j/K16m3EhaK40hAOPPIaaq5Ll9lzBEfKU5hC8YE9vBl19Mia8MMBF8Cl/Yr8cXg6FWugt9SuhpjbmtJsMQzagki/AC0TDoszm6d7y+3z/dNw+UEP0pC7UCNOZ2gyHTDBoGQzktltvKhT50J7/arcgDRRWUUBXfSfJc8DAAjfwPjke6MtAIH6PGDlV5HSXU5D5T27gUGCrSXiAY/5z6nbcBZPx4uMa0H4j3qwnGP3cHZxmyrNlgqEhr+VEEhv6lfT0pPeXH4v4dAkM1XyRlpfnyC46EIZkio1Kukytv2k4bmYsUGYgCTDg3H6GR5yZhqEiRab7Cvh7vCzYwb47MVwKYIkWGvnK/5OsYfMHCnnxRGGqlu2JbOA/S2BpzY02GoVZkKIJP+bcXU2F1GIJI0bvBkGkODYMhuY9IWFqkY1+/X6VMgw0DIVBtoUdp54lAU87LhH1kX/lZ0RwwVKTq6LVMbWNSYKg3MhT8e5hJESHwH597MZbLQEjXUBiq7RlCyCjTWr4Tg6G8ITkAfOhbwlDVF4GEXl9xQaqmyEDKdUqF8fnNuTJFBuIAA1GE/PYY9i1hqEyR6b7y22PYt4ShMkWGvkg/9vYYRnZKGKqnu7Cv3DjdGnN7XROGQgpMDPeqw5BFhkyzSYOhYs+QCjDlQi+jLhkc4mfVj6bSN1cNBPrGgWIfSOUxB/1jJQzJz6U0nzxVxyFnahuVAkP+PJQ9QwAwqU+Ao+22S3MA5PjfzKqmyKJfAyFVQ2FIRoKK196LtBZIwBB9iyv1lTDU8EVhqM+X79NIkYG06zz/cGtIo/qP6A+vU0uRgQTA+HEx7ZL6ShjSUmQVX34cfbNMwpCWIkNftF+GmaeUzpIw1Eh3JZji+4vSPNqYT9BVYCil0mowI/cMnYv+YY8R7CF6V8ZfTwZDC5IGQ9szjQJpCy5ILPRycaZ7cGLqrLACJPToUwkoCG3UEOCUNgFhHvDUVF57rIQf+Tmr5zpYSk7sU5ralqTBUD5OryuDUOyxhX8lkyiQT69pvqJiu7zOp+3ppn+Q7lXl22RKKgDuFXTBN8ji8VqUKEvCUI4w5b4Chlq+GAz1+II+tRRZ7TrjRmm+Z4hEldQUmW8QABN8wNtDua+AITVFVvMF6a3gK/QVMKSmyNAXjyCVm58FDDXSXeXYqMaYz9B1YIj0Y98bAUur/39777MlS5Kc91VV810ALijNhgPerJ4lwTXF2WM4g8qeNcWlBloJ0KorC+eIeAYCBKDFrexnGBHAuvvWMwjUA/Tt0DGP+CLMPzf3+J+Z5de+c+z0Tf9j4RGRlfZrs8j0p+YpfDuv+xsJWSG4fGl+gfn+bTLXEsmbalAu4+JKNKGs5vqyZWaGZsouay3Ttr4KJbIFsktky2SXyJbJLpEt05Jy15I5e2o+DG2htEx2K7oBGML/eV8iGCFbsPRYl1zrfDkMLZNkl9KMlcs1aD0M5cpaS7Sxr1KJbLYGf74XmdaSOfvKYSjW5WCIvuEzBJ9LAsbWMLTW37ZyGHK59tF6GHK5bksOQ7EuA0MAof6ZDQnU1wCIreFla3/rFMOQy+XaSg5Drtp0HRi6XV0GhvDQrZmmYKBosy/YCwqZpGiq9RCvgBagqx8M3/xAroIX8sUPxh5OJ5UN0vOtB3TbPb7iB2K7bNLkb18tV3JN3Nzc3Nzc3KbZ7jCkS2QJFDCgDN/eaZmGSlM9pIgXmjsXhmR8lK0yfEUgxmvl18O3m+JvZlnfotpechyXy7W9PDPkqk2eGYp1mcyQiJ4ZiktmBgzx16Cjr3bTb+cwwEyFIVJ0nKS0J+L5/Dp4idYf+dxZDkMu1z5yGHLVJoehWJeDIUhBkZndGYMhKzOEsQtgqPWtjWAoqs/xfH7dalgvrW9nOQy5XPvIYchVmxyGYl0ehkTRM0QMFNNgKIEXUQIwZRjiH+wzj7MAhvrzOxwUuO0vhyGXax85DLlqk8NQrIvAEP+OC7IxLWcwUJRhqAWYXNmJni/qH44uwRD6MHcODOXKYBhn9e0nhyGXax9tD0Nb/laQaAd/m/7+UG6LjqXa8jeIREt+h2jJbwctmbOPHIZiXQSGYjjQIKT7psGQfsB6MJWZ0d8OO5yacwQ8mWNhTbJ300wYijJVas3IOl2qRCZyGNpeDPLvR7R5q2uVNoeh7HYaC7WDP3OLjqXKbtGxUNltOhYqu1VHQUu211gyZyc5DMW6EAxtpyQTY0LLDeiC3yKDLBhKvt1mKoXVOdezBz9ApZoa91E5UYt+4mDG4XeUwHKa2cuC7qRzGK612d+XWNdD9PsFuduTBUP93lycPaE9vSygsLbTyPrL7XWmNNefgMTgL90ewtqiY5Y/cmht0YF9yYZNWvvBM/wNa8feZMNGrYNKfSJrq462DX/P6TYa0fYacg0e0n3cGHpuaUuO+TA0dW+yNfJd6yfKyMwUf8PoeopLgZeRHG9Q/HtN5aDYXtdFa41+ngCgoDJvnOGzDtIB7dAVz7ua5L1lfpuwM90n54AT6LOFFvy1Pg6Hgwk8co1ChtLomy3ZfNXYxNU1XzEMqZ3gw/tAwYG5az0DDJe0Rvx9c25hoIesYUPXzfxFgMAlsmX+Bo9cIlO71Xf+ehiSHd+/OTef5XW3+3vRX1i32rEe/ihY233aX1wia6GFd53XKpe7AFJPHzXIledcWg5Dsd4ZDImMMpkVYK+pYjDcTzEMQV3wXQVDnDkqnFc49zSb0nbZAFCaE0QPzaclVmtdXVbnhGwN+kpzYiXwhnWeu/VY5xJEz65FwrU2sk7B/7E5M4RJu9qlvt95PrSrUhi/9lLZZopgKAT9Q3N6let9H8EBsie8Uz3gKIhLWgV/sdLd7dtmy99j8/z63MJJyR/tcN82U4lsob9+BJfIxN9D7M9+jijdmb5tphJZgCbyh/NB38fn5lHAyoIhLpF1EFYsmZXKXd38BHpKc66g/WBI2gRo8Jn1ofn2+3hH+8dvPzbPj0Pmrd21HiCkPp9913rXEq2FoQEQ4iDNUJCFGlHI1FkQgEyVNQvHt4CI5yFr1M3hdSXPg8VrmX4uhesGODPn4RrkIH0AT1mL9h/W0nYo33GWTMbobM/wWvzeN4eIfNq2Hp5ci2WVyfpMiIKDJBNEmaJhjLFLvOEvkgVWK/2FctTTaxScrRJZ0Cx/Q79VIgsKUFSAIZTLsv4oc4BMkgU8hb6kRAZo+fBhKE8S2JTKXW1JLoWe0pxraB8YAggNcPTdb/XrzoeUEL/9vgWgMB7A5Jkh1wZaDkOxIqgwszZGViPIOJZ+jsaEg0HDbz4p3zm4QhYlatTramEoOuSsczHmQxkYmvZ8lMrCReem1sGZIa2Q/Tk2A99I9mcou3ES6HxkQHIt0XYwxCWtsr+2uXtWJ7yvxkpkSlP9RXDAJTKlGf6GXi6RKWVgqH++Z8zfDODJ96UlMoYZfl0ud3V9yTNGpTnX0WIY6j/jtHXwItdZxjx9bH7EeX732+arh/su+5Nu1CrXd+h3GHJtoK1gKAIBKlENlgJEgJlcEA+udOYmr3bcCBiYkKRAw4KZGedizocyMDRoKOWm8zNr1OdJ5xyyP9F6NQy146XfygA5DG2jzWCIS1oj/mKhTJaW4Rb7C2Uo9RA1l8i05vqTIVwi08rA0CCUyWx/CVNkgafQxyWyMJTgB2Wvp49thqpU7ur67jCW2s05V9JiGCplhjrwST9jUQrLw5Bkin50GHJtIXnDpVoAQzqDYmZgUo2BUJCZmbGUy57oIda6pmSGeE5OxnxoFIaGLFd63TUMdeB3PMclMwKjew0/ZmYIz0YRJIXpDkNbaCoM5Z4ZAlxkS1oZfyzA1nb+pOSk/WVKZKJZ/lr4yZbIRKMwhPmtP4md2RKZKAc8hb6kRNY2xuBCMJQvd3UPaycPTt9eiUy0Jwy1JTCaHpSHIc8MuTbTHBjSz86cj8YzQn2gt+cP6p7dscBAAreiiVxmKPkKeACgGGomPzOkn7VJYGbsXLQKYy0YOh/V2G5tJvjFMDRkq9R1KcCQwI2GnvD6eA61dnk+qP031LZZGSPXPE2Fob4t+jYZ4KJQ0tJzdf/5m+bxhCwNvtW1o79ciSwMn+EvwE+hRBaGGzD03TfN16dPXSDFN8EAK4USWRhuA0++Ly2R6bEoaSFT1AJOodyFeVIySkp7mTlX1C4w1JfScjDDzwydk/HtM0byDNGPxvz95DBUkWIYGko12hCwoweJ9XM9HOSDENyNMTwXFnzzPAsORCPjovKW7qNzjNZtwZCIj8XzBvHD1tkyWzcmfmaofK6D2xTquEzWAlDr93A6NUfAkJk18m+T7aH022RGKeAYl8LQnssS9cr564AqfiZHZW0W+JMYVvJnlsjm+kMWKFciAwSZ/gAf2l8XVHMlMoBO4u9j8/nTKd/3mpbIeqHc1Y3vMz2cNVJKymtQYc41tQ8MqXHRNSdY+vDUPB3aLGd7fSUrBJcvzS8w379N5loieVNN0qxy0Res3PNK70UMS67FMjNDM1UsaS3Q9v4KJbIFKpbIFqhYIlsgs0Q2oiXlriVzLqH5MLSF0jLZrchhqCJNhaGkLOXKKPdNs/ehoYTmWqv1MDRS0pqtHfyVSmSzNVIim62REtlsZUpkRS0pdy2Zcxk5DMVyGKpIU2HINV3vFxy9RLal1sOQy3VbchiK5TBUkRyGXK595DDkqk3XgaHblcNQRUoeEnRzc3Nzc3ObZg5DdUhupsvl2l6eGXLVJs8MxfLMUEVyGHK59pHDkKs2OQzFchiqSA5DLtc+chhy1SaHoVgOQxXJYcjl2kcOQ67a5DAUy2GoIjkMuVz7aHsY2uF3grb25787NKIlvyG0ZM4+chiK5TBUkRyGtpf/zpBLtDkM5bbSWKod/JlbcyxVbmuOpcptzbFUxu71o1qyzcaSOTvJYSiWw1BFsmAI+2WVA7qxX1e6qVdW8Z5c8X5gcV9hCxDa42zG4XeU/QvU/TmZW3Xoa5nO1f3mOeI6mL7n6f2C3O3JgqF+Ty7OntBeXhZQWFtpZP21vd0mqO37irfM2N5fujXHLH+0BYe1NYf4C3uQmdkibNIKf/FWFtbWHP2eZmZ2Z9wfb83RtuFvOd1OI9pmQ+DR2AONoeeWtuaYD0NT9yZbI9+13rWB5I9vEHZ7P+d3X+/Fm4fOkOxzpgJ3vDM9dphvlWx8CnUboA5d8byrKdmbjKDRWmOAmUNzGNm1/nA4mPPlGh2PfNyFkr3JDqfGk0PrFcOQDvwEB+au9Wqz1iAuaRX89VMk8zO8r2J4WeZPgn/WX1QiW+AvgiEukYk/tZGnBUMh86P96cDIJTINOhkYChmZkr+4RNZCC+8+r1UudwGk+g1e29binEvLYSiWw1BFimEI6oJvGpWVxmCIM0eFDE8AGwsCOlCygnxhThDtFp/s+G6uq8vqnJBxQl9pTqwE3rDOc7ee5FxiAC3B0PFsZJ2wgS5DWNiNXp9/9xHBu9Tzay+VbaYIhgLwHJrTq1zv+wgOkD3hneoBR0Fc0ir46yYE2Dk8vzbPAUoIXkx/j83z63MLZpa/UBLK+4tKZEv8aRjiElnYtT72F8NQCzuxPxUYuUQWdq0nfxFstBByeP7YPAcIM/zpElnwN1IyK5W7uvkJ9JTmXEH7wZC0CdDgM+tD8+336Gt9PH7b3guMaXetBwipz2fftd61RGthaACEOEgzFGShRhQyIxZgABSsWTi+BQ88D1mjbg6vS2elDNiZfi6F6wY4o3nD8UvnM4CnrEX7D/PbDuU7zpLJGJ3tGV6L3/vmEJFP29bDk2uxrDJZnwVScJBkgihTNIzhbIztr20WwDo2rz99ak4GvCz29znnLy2RdROn+1MwZJXIuonNo5SWCIbaclfnL2R80vIVl8i6iQFCGIbg72PBX1QiA7R8+NCCbAjKsc9Suas9Xgo9pTnX0D4wBBAa4Oi73+rXnQ8pIX77fQtAYTyAyTNDrg20HIZiRVBhZm2MrEaQcSz9LFA+9RQUQIVhLAdXyKJEjXpdLQxFh5x1LsZ8yIQhDW3TYCg+N7UOzgxphezPsRn4RrI/Q9mNk0Cyc30MSK4l2g6GuKRV9ofxbZYG5SoNKgv8haxHwV/uW2Rz/PXgwyUyJROGkBUSkED5S8MLl8iUTBhCVqjkLy6RMczw63K5q+tLnjEqzbmOFsNQ/z/N2jp4kXsgY54+Nj/iPL/7bfPVw32X/Uk3apXrO/Q7DLk20FYwFIEAlahy2aMwS2AmF8SDK525yasdNwIGJiQp0LBgZsa5mPMhA4ZakONSnOU3s0Z9nnTOIfsTrVfDUDte+q0MkMPQNtoMhrikNcnfU/MaXhvwMtufZFWemtcQiGx/2W+RzfEHGOISGfsjGGqzPq2/NstA8MIlMvLHMBQ/+5PxRyWxBH5Q9nr62HyWdZbKXV3fHcZSuznnSloMQ6XMUAc+6WcsSmF5GJJM0Y8OQ64ttBkM6QyKmYFJNQZCQWZmxlIue6KHWOuakhniOTkZ86EEhgA/lvH5ahjqwO94jktmBEb3Gn7MzBCejQfwaHkAAHysSURBVCJIchjaTFNhKPfMEOAiW9Iy/dGDy/S+Eh/b+8uUyJb4+0H54xIZ/EUwRA9WJ/4+K39GoExgiB6szvjjb5El4EIwlC93dcdLHpy+vRKZaE8YaktgND0oD0OeGXJtJvkjT2XDkH525nyMA3YMNvb8QR0IWCAkgVvRRC4zlHwFvPtGloaayc8M6WdtEpgZOxetwtgEhlhTM0PKl74uBRgSuNHQE14fz+H/euX5oPbfUNtmZYxc8zQVhjgTFMNKoaSl5+b6k0zODv5yJbIwfIa/AD+FElkYzjDE4kxOoUQWhjMMsSx/xg8t0gPQyBS1gFMod2GelIyib6EV5lxRu8BQX0rLwQw/M3ROxrfPGMkzRD8a8/eTw1BFimGohQH+PyIE9+hBYv1cjxnkjcyHLukYx2l98zwLDkQj46Lylu6jc4zWbcGQiI/F8wbxw9bZMltykBkwZEAdl8laAGqPdTidmiNgyMwa+bfJ9lD6bTKjFHCMS2Foz2WJeuX86W+gtQNjeFngL47FqT+zRLbEn8BQ749KZIAg0180MIYX5S86LiAo8UelKstf7ltjKHd1vvpMD2eNlJLyGlSYc03tA0NqXHQ/CJY+PDVPh7ak3F5fyQrB5UvzC8z3b5O5lkjeVJM0q1z0BSv3vNJ7EcOSa7HMzNBMFUtaC7S9v0KJbIGy3yJbqOy3yBYq+RbZBC0pdy2ZcwnNh6EtlJbJbkUOQxVpKgwlZSlXRrlvmr0PDSU011qth6GRktZs7eCvVCKbrZES2WyNlMhmK1MiK2pJuWvJnMvIYSiWw1BFmgpDrul6v+DoJbIttR6GXK7bksNQLIehiuQw5HLtI4chV226DgzdrhyGKlLyAKGbm5ubm5vbNHMYqkNyM10u1/byzJCrNnlmKJZnhiqSw5DLtY8chm5Tb2/fNd883jfH1+FHDtu2h6jNlcphKJbDUEVyGHK59pHD0A3qu5fm5e3cHB8UDPVtD82RfgXaFcthKJbDUEVyGHK59pHD0K2q/cp9nAVqv87uMFSWw1Ash6GK5DDkcu0jh6FblcPQUjkMxXIYqkgOQy7XPnIYulU5DC2Vw1Ash6GK5DDkcu0jh6FblcPQUjkMxXIYqkgOQwWN7DP2fn9peq38l6qnaHsY2nI7jY19bbYtx5ZbchjbcfAGrbLR66cTtfFmrXO1ZDuNS81ZJ4ehWA5DFcmCIQny0r4k0Jfmlvp60Y72yebul1QRhngPMt5ZvlPRR1nheiUOp0hgxfhxsGCyCausNd2x+8i7s4ZNW+3+LxcEp2tzGMrtOL9EG/syd65fItmt3dq1fomUrwuxQqslO85fas5KOQzFchiqSBLkBkmAF1g5h8A+L9iV5pb6lN5OzSECoHNzXAgSm6gEMknfLcGQklzTJIvTwtBBN3bg07eFeXgNeFJ+ZPzh1HhyKC8Lht5eHpt7AVXOory9NI/3A6BaYBHvON9ldrrxT6+0y3vk76l5JWeJL8mg9L5op3T2RZE33rl+na941/ous6N96eHiq8/otL5099Y71k9VtOO8gKLOOnXGALN6ztC8qxyGYjkMVST5I0vVBvYUWtr24Q/02KShOjd3rK8LwNkd32Wu9LVg1R6fx46tb6S/g7He9ykPMufjHYHKFBiacg4Yp9eprxn38TmSpsKQKACRZI5aEJMghGwQXg9zvFQ2phiG3pqXxyGwRzAEQHh6DcG+BRUGHC5rAYYOzUHeDwRXLXR1fQkMGb4CdEz0FQEMl8jW+OISGWBo8KVLZ+LrgXwNvUaJbLHempevH9p7d3huPn7+KQDgw/1T8/R0oGOUS1ctwNw1T9GzSdvP2UsOQ7EchirSHBhiAAiZiwQW7LnjfSIE+hIgDH1t2W2AgbH1lft5bR2wJOcn4rFD2zgMlc9BK80MdfP5HDLzg+bAUFdeEwA6H9v/M+1LY5w56nwkpTVXrwiGAvAcmtOr3I/7CBKQLerhpythAY6CkrIWYOipeX4+qMyM6nt6bp4P7ZgIhixfAToyvqRP+9LBNymRrfCVlMgAQ8pXyBipPvLVe9uwRPb28nXz8CjQIet/aH1+kmePHpvnH16b4+Op+YSDlEpX3fNKCcBsPWdHOQzFchiqSJNhyMza8HMzImPupL5BAVqSrIkFG+r4Y+ub1E9QkS1xtaAUr8VaH/uwxljXsFUCQ9YaC/ODFsIQZ4L4dRh9tHy4IKtM1meBFAwlmSDKFA1jDOARCPh0CuN7IOlg5+n1U3MK2agYhkxfHXRYvgQqIl8q+sYlsnW+4hJZaBl8/XAKJbEelDrYeXr9oTk9StYmhqFciezh4SHKuJbs8+fPYc4AQ59Chuixh6GjWZrLla6Cn/sUYLaes6cchmI5DFWkeTCUfmCkWRxj7qS+VG3WA/5zING1ja1vrD88uH0tGOK2VgkMWWs0fSothCGM4evlMDRd28EQl7VUWwCdDi66/tafao9gKOML0PGZfQlUqPYIYLhEtsYXl8hUW+/roe+PfTEMbVkimwNDpdJV13fHALP1nH3lMBTLYagiSYBLZUCLmZWwZMyd1GdJB3or6I9kdrSW9C+AIT43qxSXPQdSAkPWGgvzg+bAkHpmiMXPEIkchsraDIaSslaYpWDop/5ZnOfXZzUXzykpGMr56qHD9vVZ+0IATkpkK3wlJbLQmPiSZ4RSXwRDIyUya6NWUci2HK2v1X8XPTMkANI+MyQPuqtjlEpXXV/ytf2t5+wsh6FYDkMVaTIMmW2WSuNKfW3AjfpCJiTODCXP22Sf+WGN9beA0/cjk2TCkO0rfX6HoWnsHGKlfd18BUjpGNJUGArj4szPoO6r+tG3x1of/sxQXlNhKPfMECAjLWuFQREMxd/SwtgUhrK+FHSM+uoicFoiW+4rLZGF1sjXT9G3xzA2haFciax1aWzUGtrbXevvTRiapnzpqnsAO3kIeus5+8thKJbDUEWKYagN3mlpBKEWwVxZH4hLc0t9WuxfZzyQVdG+OEvC8xlmRvqjUtqxOcvrDGjww9hQC0S5c5xyDkpqPYMfupaZ9fUqwFB0HeRa6zEdHOnjxJjk3yYb01QY4kxQ8rX3pKwlIhjS31brxzIMFXxpgBnzFcZYJbL1vuIfWiQY6sFHf7OMYWhKiawdM8DQW/Pycm7Ox1xmaIoKpSs8BH33FL6JNvRuPOcCchiK5TBUkSTQvQ8BJLj9SsqW0Eq6sXNYo0JJzdUq/TYZA6gAdVwKQ3suSzSIYWjIMA1jCYZKviKAGfElY8wS2Vpf/EOLDEOtL5SnBl8KhkZKZK1iGHp7eWlePnWlr6UwVChd5R6C3nrOJeQwFMthqCI5DC3VyLM6pm7tHJYrfPX+eL54mv49ycwMzZRd1lqmbX1ZJbJl6n1FJbJlKpbIemkYUr8hBONndCZoSenqUnO2lMNQLIehiuQwtFzJM06jur1zWCYvkU3RehjKlbWWaGNfZolsiXIlsiWaUiITcZmsa12cGVpSurrUnG3lMBTLYagivR8Ycrnel9bDkGtzWRu1trWyrp2f0XFpOQzFchiqSA5DLtc+chhy1SaHoVg9DCUPA7q5ubm5ublVaw5DgxyG3Nzc3NzcvkBzGBrkZbKKJG9ul8u1vbxM5qpNXiaL5TBUkRyGXK595DDkqk0OQ7EchiqSw5DLtY8chm5T1t5kbdtD8nV7VyyHoVgOQxXJYcjl2kcOQzcoa2+yvu2hOdI+YK5YDkOxHIYqksOQy7WPHIZuVdaPLrY/aOgwVJbDUCyHoYrkMORy7SOHoVuVw9BSOQzFchiqSA5DLtc+chi6VTkMLZXDUCyHoYrkMORy7SOHoVuVw9BSOQzFchiqSA5DLtc+2h6GNt5sdUtfm23cqjZb3dIXNja19ib7dKK2JZu1ai3ZUPVSc9bJYSiWw1BFqgGG5u8e/6XId5e/pjaHofM3wefh+dP67MXGvh628vUdfP2wqa8LsUIrOe7DffNhznEvNWelHIZiOQxVpDkwJNAh4xPweDs1B/Vz7cdz3J3V+Tj839jdoYncTvZ5bo7R3LfmdDDGy7EOp2YJMoXzThxOVbsevmbBJ6+Hzpn7cf25necdFP04KF5PFgy9vTw29/dyDymL8vbSPN4P2QkLLM7f3Df394fm+ZPsqt5ldrrxT6+003rk76l5JWeJL8mg9L4+l31R5D1/87CZr+/g6wfx1WV2tC89XHz1GZ3Wl+4efNEadpYc9+H+w3DcDlpwb5+MUhzPeXv5OoAc5ljZKp5zCTkMxXIYqkjyhzYuAQ4JsmcjsKOvawuAQ2BjiceF18emRY4ZPhPIeacwZJzjADKtj/6DUc8DCHXrOx/bMcdz9/F4Pjb3h1PjyaHLK4aht+blcQjsEQwBEJ5eQ5BsQYUBh8tagKFDc5D3BsFVC11dXwJDhq8AHRN9RQDDJbI1vrhEBhgafOnSmfh6IF9Dr1EiW6y35uXrh/beHZ6bj59/CgD4cP/UPD0d6BhUuurKcm12qvOTAAzNoYxPCz0MUZcvkYkchmI5DFWkBIaKGRkjsEcQM4wJ84IvFeDV6wQGdIan5JMUgn/UkRkbwZCMkWO10NWeqwVbBCFRVoz79Hq1jGsWLoU+/3YdyZohXLdzd2/UdUO2qJ8r8NPBUfsR6aWyaymCoQA8h+b0emoOAj4KEpAt6uGnK2EBjoKSshZg6Kl5fj6ozIzqe3pung/tmAiGLF8BOjK+pE/70sE3KZGt8JWUyABDylfIGKk+8tV727BEFrI0jwIdsv6H1ucngZzH5vmH1+b4eGo+4SAEMsjwAGTwOiptZebw6wiGrlAiE82Hoe+a334l0PatgrYWCgUmP/64RVbrrXn5xVcb+psuh6GKFMMQZWTktZF10YE9hZp4zNBPcxPgGYBgzOcgq30qDMUA1EKFDTRpZqibr9ry86010jkG2LHmkgCq6toMmSA1RsowPQzJ8e+HTJHrYrLKZH0WSMFQkgmiTNEwxgAegYBPpzC+B5IOdp5ePzWnkI2KYcj01UGH5SsEYu1LRd+4RLbOV1wiCy2Drx9OoSTWg1IHO0+vPzSnR8naxDCUK5E9PDxE/3NTss+fP4c5Awx9CkH8sYeho1ma06WrJKtjQAzP6bM+UlJ7fg7wzBmgdM5l5DAUy2GoIkUwlAAKKw3sKbi0AToCKgGsgz1u+PBp0902DLHPvtXIqEyHoXgMP3s0KIEhE15y8zmDpAzrGb3unRbBkIy5j54jcl1G28EQl7VUWwCdDi66/tafao9gKOML0PGZfQlUqPYIYLhEtsYXl8hUW+/roe+PfTEMbVkimwNDaekql+UZYCidE/nqPituoUQm2g+GpE2ABp+PH5pvvx/gUHw8fvuxeX5s4bK9Jj+2pccAQupz9cO3zfc/Xua6OAxVpASGCEJiTYGhdEwb7Bk+WEsyQ1vDELe1SmDIhBfL59DOa4/O0fRnyGHoXWkzGErKWmGWgqGf+mdxnl+f1Vw8p6RgKOerhw7bVwg6DDBJiWyFr6REFhoTX/KMUOqLYGikRGZt1CoK2ZZj+qCyrEM/MyRBvX1mSB50z5e7WuE5ofh/hPox1hw8cB1gpy3NhSxRIbt0Ke0DQwChAY6++61+3fmQ6/bt992zV9IPYPLMkGsDJTBUDMpGYE/mMBR0GZMTjyNpP6M+IQtgjDUyfJj+cpkdA4YWZIbK67HOw5ABQ215Ts3tnhnS8OMwdB1NhaHcM0OAjLSsFQZFMBR/SwtjUxjK+lLQMeqrC2ppiWy5r7REFlojXz9F3x7D2BSGciWy1qWxUWtob3etvzdhaJqmlK74+R9rTtIGOOq+UZb0X1CLYUiB4GAdvMhD5jLm6WPzYw/Hv22+epDrJNmfAai+7/rlOg79DkOuDRTB0IJnhpJATiAzPODclYvMiG8ct+BzkLUeAIIez7DRrYWfGcpkxdK+9FzSMX1Pfo0J1OS+TdY3JDBkf5tMPzAtx/dnhq6hqTDEmaDka+9JWUtEMKS/rdaPZRgq+NIAM+YrjLFKZOt9xT+0SDDUg4/+ZhnD0JQSWTtmgKG35uXl3JyPuczQFE0pXfEYft2KgSkurXWZouJx9tNiGCplhjrwSWEJpbA8DEmm6EeHIdcWimFIBddgCM4tTPAbtQ/U5hwDYtS3yeI5KSxkfZLSb5O1QsbE9o/MkD4vC7Y6qbUwsPXHMEFINA2G+jbLJ12r3nDeXRkSFoOPf5vsWkq/TWZ84B/jUhjac1miQQxDQ4ZpGEswVPIVAcyILxljlsjW+uIfWmQYan2hPDX4UjA0UiJrFcPQ28tL8/KpK30thaFc6ar7an2fGdEQk5vTwYIurRXLahfUnjDUlsBoelAehjwz5NpM8of2rjX6nJMlq0xWqULZ7Nh4YujyMjNDM2WXtZZpW19WiWyZel9RiWyZiiWyXhqG1G8IwYwfOBzTktLVpeZsqV1gqC+l5WCGnxk6J+PbZ4zkGaIfjfn7yWGoIr17GMo+q1PSlwND8ryQfpjadTmth6FcWWuJNvZllsiWKFciW6IpJTIRl8m61sWZIbvcVdal5myrfWBIjYsypwRLH56aJ/lNqejbZHD50vwC8/3bZK4lev8wZDxbM6ovBYa8RHZNrYch1+ayNmpta2Vd+1P4hWm/a7bmw9AWSstktyKHoYpUAwy5XLcohyFXbXIYiuUwVJGGlKSbm5ubm1vZHIYGOQxVJHlzu1yu7eWZIVdtuk5m6HblMFSRHIZcrn3kMOSqTQ5DsRyGKpLDkMu1jxyGblPWdhxt20PyDTNXLIehWA5DFclhyOXaRw5DNyhrO46+7aE5RhuiulgOQ7EchiqSw5DLtY8chm5V1u8Mtb/h4zBUlsNQLIehiuQw5HLtI4ehW5XD0FI5DMVyGKpIDkMu1z5yGLpVOQwt1WwYCj9m+Thv+5CwV9lj8+33PKf9iv1R//L0bOW2/si1l+UwVJEchlyufeQwdKtyGFqqi8BQVmthSOZ/0zx/+9g8PPBWIFb7uByGKpLDkMu1j7aHoY33F9vS12Z7lan9xbb0hehpbcfx6URtS/Yn09p6D7Hb8bcKhs6/bb56PA77i2G/MhmjN2L9JK8fm+eQGZJ9zGQTVhn/oflwj53qsTnrcM9+pHPR/Xofs7eXXzRfGdDz9pd2e0kOQxXJYaig87G5O5yaObueLdOXslfal6XNYej8TfB5eP60Pnuxsa+HrXx9B18/bOprZsxfJznuw33zYavj3pC/1TD00MFMaG+zPJ9OXzdfHV8HmAlw1MFQmHNsASWUz7r5ut3KGIWx6I/lMOQyxTAkm572/4d0Nz9AY761cWqpr5cAyIrjb6qNYOh8vIv8hOsQndhUGDo3R+Pn8Vs7NufOD/cdz/SnfT5Gu0Mn/a5NZMHQ28tj+3/FnEV5e2ke74fshAUW52/k/6gPzfMn2Ui0y+x0459eaXPRyN9T80rOEl+SQel9UTBgXxRBz988bOZLdo4Pvn4QX11mR/uKotdL89hndFpfunvwNT24bSE57sP9h+i4by9fBzC742xMl6nCOVqAcgl/U7UehgyAUZmhHpQ6GPr08nXz1eNztw3HMCcAlM7mdVklbFYfgEfmGbvXOwy5TMmbqNfbqTlw0A5BdoraQH04nUNAjoGn1Kckx48A6NwcN4CRxdoIhljLYUgpXKtDE1/K1s9Bb1PfgU/fJvPu8VrGyweK72y/h2IYemteHocgFcEQAOHpNQT7FlQYcLisBRg6NAcBYIKrFrq6vgSGDF8hgE70FUVXLpGt8cUlMsDQ4EuXzsTXA/kaeo0S2WJJqaYN1rIG2dVeAPDh/ql5ejrQMbgE1c1FOUfDC8ClK8u1kCJAkD7LtJ+/edoFhvrld+DzwymGIQBKNjNkSGeG3l6al/NP/TVwGHKZimCIlQRczjxYoISAbCFEqc86npbMlT6dHeGxY+sb6e9grPd9smEogZmQzdK+2jViSMgMhRd8fFwLwFDp3EjmtTJgSBSA6NhIAkjWLh/qyAbhdTLHtVoRDAXgOTSnV4HR+wgSkC3q4acrYQGOgpKyFmDoqXl+PqjMjOp7em6e5fkMhiHLV4COjK8QYJUvHUSTEtkKX0mJDDCkfIWMkeojX723DUtkIQvzKPAg639ofcpzLSHIvzbHx1PzCQfhEhRg4ONzyGJpCEF2p4eVbm70zNLe/mZqDxh6/Yae7dFlsuiZoafwvBEAKnpm6O5D8+33PyqIeWtefoF+AA6+MTZ8/rbPEuXaozMx5TBUkeTGZ0VBfgjqrQIUJLBQAp5SnwiwwEHe7uPM1dj6yv28tg5MkvMLE5uDOu7b6Rj+77R3Tf3mcY3MkD43npNoDgzJudy3AHQ+tqnlvjTGmSPXZrLKZH0WSMFQkgmiTNEwxgAegYBPpzC+B5IOdp5ePzWnkI2KYcj01UGH5SsEWO1LRYm4RLbOV1wiCy2Drx9OIfj3oNTBztPrD83psf1KtIahXIns4eEh+p+Rkn3+/DnMGWDoU8jKPPYwdDRLc2YJClkbBS9J5oYyOxf1N1GzYahyOQxVpDwMERyYwVeAgdsYKqb2DQogkGRHkD2JRg7HH1vfpH7KFGXLZDrzI+s6NufzsT8vhh0GG+43zy177E7m+YzDEGeC+LVrO20HQ1zWUm0BdDq46Ppbf6o9gqGML0DHZ/YlUKHaI4DhEtkaX1wiU229r4e+P/bFMLRliWwODBVKUIvg5YL+JsphKJbDUEXKwRA/9BuXkLTlArIVxkt9qdrMD/wbwKChZGx9Y/1JqasMJHJ92vM4N0dZgPgPY9N13hIMtWPiBw/F0jmutdoMhpKyVpilYOin/lmc59dnNRfPKSkYyvnqocP29Vn7QiBNSmQrfCUlstCY+JJnhFJfBEMjJTJro1ZRgImj9bX676JnhgQk2meG5EF3dYxSCWoJvFzS30Q5DMVyGKpIEghZCQiJrMyJqRLwlPosaUgwgGEss6O1pL8EJOjrM0KyPlmLrCn2c3UYUs8MsfgZItd2mgpDuWeGABlpWSsMimCo99sBfjs2haGsLwUdo766SJqWyJb7SktkoTXyJQ/CDt8ew9gUhnIlstalsVFraG93rb83YWiaiiUoA15yz/gAVi7qb6IchmI5DFWkGIbaYGoH4akgUxpX6msDc9QXsjVxZih5Zij7zA9rrB/feOudt5kk81qIWhA7Hg/Rg9LH4zF51seEocjvjjAk4/pvj7HajJEcx+p1rdNUGOJMUPK196SsJSIY0t9W68cyDBV8aYAZ8xXGWCWy9b7iH1okGOrBR3+zjGFoSomsHTPA0Fvz8nJuzsdcZmiKRkpQBrxw5iaGlQv7myiHoVgOQxUpgiH6jZ/e+igNIFHWB2z9TShdfpHeUp8W+9fBHsCgfXGmh+czzIz0R6W0Y3PuS1+22meb1Bq660cslMCQPs6QVdoOhuLrTF+b7+BIn7+D0D5Kv02WlifvjnEpDO25LNEghqEhwzSMJRgq+YoAZsSXjDFLZGt98Q8tMgy1vlCeGnwpGBopkbWKYejt5aV5+dSVvpbCUK4EBUDh+06lq/6+Z7I6u/mbKYehWA5DFUn+YN6HDGBwuW5YZmZopuyy1jJt68sqkS1T7ysqkS1TsUTWS8OQ+g0hBosZ2qIEpXWr/hyGYjkMVSSHIZdrH62HoVxZa4k29mWWyJYoVyJboiklMhGXybrWxZmhbUpQg27Xn8NQLIehiuQw5HLto/Uw5NpcXZlpyALJN9K6zUJD+1P4hWm/a7YchmI5DFWk9wNDLtf7ksOQqzY5DMVyGKpI0UN4bm5ubm5uBXMYGuQwVJHkze1yubaXZ4ZctckzQ7EchiqSw5DLtY8chly1yWEolsNQRXIYcrn2kcPQbcrajqNte0i+YeaK5TAUy2GoIjkMuVz7yGHoBmVtx9G3PTRH/Eihy5TDUCyHoYrkMORy7SOHoVuV9TtD7W/xOAyV5TAUy2GoIjkMuVz7yGHoVuUwtFQOQ7EchiqSw5DLtY8chm5VDkNL5TAUy2GoIjkMuVz7yGHoVuUwtFQOQ7EchiqSw5DLtY+2h6GN9xfb0tdme5Wp/cW29IU9uaztOD6dqG3J/mRa2+0F1up2/DkMxXIYqkgOQwWdj83d4dS8cfvm8n3XatTmMHT+Jvg8PH9an73Y2NfDVr6+g68fNvU1M+avkxz34b75sNVxb8ifw1Ash6GKZMHQ2+kw/F/S3aE5zaABzD0Yk0p9vQRA1E+/XxUQNoKh8/Eu8hOuQ3RiU2Ho3ByNn8dv7dicOz/cdzynn3iyhnvpP5yaT3FHc7gf5h5OUa9rhiwYent5bO7l+nIW5e2lebwfshMWWJy/uW/u7w/N8yfZSLTL7HTjn15pc9HI31PzSs4SX5JB6X19LvuiCHr+5mEzX7JzfPD1g/jqMjvalx4uvvqMTutLdw++aA07S477cP8hOu7by9cBzO6MbEypTzTLX5f5wjWzgMfyN1UOQ7EchiqS/MFohUC9CADaQH04nUNAjoGn1KckgTgCoHNzXLSWjbQRDLGWw5BSuFYMqq2fCGDOx/DBOLTJGFUS0DAEEDqew4fk+diOs2DKNa4Yht6al8chSEUwBEB4eg3BvgUVBhwuawGGDs1BAJjgqoWuri+BIcNXCKATfUXRlUtka3xxiQwwNPjSpTPx9UC+hl6jRLZYb83L1w/d/zw8h13tBQAf7p+ap6cDHYNLUN1c/A9GBC+lPmiGP4BQV+ZroeeueYqeg2J/8+QwFMthqCLFMCTQwgFWizMPko1gISBbTkp9XTDOHl/mSp/OjvDYsfWN9Hcw1vs+2TCUwEzIZmlf7RoxJGSGwgs+Pq4FYKh0biTzWhkwJApAdGwC0wTgOTSnc3euCoaQLerhpwMpwJFrniIYCsBzaE6vcv3vI0hAtqiHn66EBTgKSspagKGn5vn5oDIzqu/puXk+tGMiGLJ8BejI+AoBVvnSQTQpka3wlZTIAEPKV8gYqT7y1XvbsEQWsjCPAg+y/ofW5ycBj8fm+YfX5vh4aj7hIFyCCoDy2Dx/fA5ZrAhCSn3QDH/IFvXw082NnoFifzPlMBTLYagiRTDUBdj2/7Q6U0F/COoYbmWRSsBT6hMBFjjI231t2W2AkLH1lft5bR2YJOeH6zQc9+10DNesd0395nGNzJA+N56TaA4MybncU4YHWSAFQ0kmiDJFrnmyymR9FkjBUJIJokzRMMYAHoGAT6cwvgeSDnaeXj81p5CNimHI9NVBh+UrBFjtS0XRuES2zldcIgstg68fTiH496DUwc7T6w/N6VGyNjEM5UpkDw8P0f+MlOzz589hzgBDn0JW5rGHoaNZmjNLUMjaWMBT6JvjL8kEUaao6G+iHIZiOQxVpAiGQoZDBVhdtjKDr5VJYqiY2jcogECSHUH2JBo5HH9sfZP6KVOULZPpzI+s69icz8f+vBh2GGy43zy37LE7mefjMHRL2g6GuKyl2gLodHDR9bf+VHsEQxlfgI7P7EugQrVHAMMlsjW+uESm2npfD31/7IthaMsS2RwYKpSgDHgZ75vnbxyGCv4mymEolsNQRUphSAOBgpcOjPj/ntIsTgl4Sn2p2swP/BvAoKFkbH1j/cm5l4FEAKc9j3NzlAWI/zA2XafD0JepzWAoKWuFWQqGfuqfxXl+fVZz8ZySgqGcrx46bF+ftS8E0qREtsJXUiILjYkveUYo9UUwNFIiszZqFQWYOFpfq/8uemZIQKJ9ZkgedFfHKJWgDHgZ7ZvpbxSGSv4mymEolsNQRYpgKAmwDEP8DI6lEvCU+ixpSDCAYSyzo7WkvwQk6OszQrI+WYusKfZzdRjSzwxBBgzlnhlK/LkmaSoM5Z4ZAmSkZa0wKIKh3m8H+O3YFIayvhR0jPrqImlaIlvuKy2RhdbI10/Rt8cwNoWhXImsdWls1Bra213r700YmqZiCcqAl7G+uf5yzwwBfor+JsphKJbDUEWKYIhhJSqbTQWZ0rhSXxuMoz7j+MkzQ9lnflhj/fjGW++8f8DYntGC2PF4iB6UPh6PybM+JgxFfneEoQ56EqAxYIgzQW2m6NDwVNc0TYUhzgQlX3tPyloigiH9bbV+LMNQwZcGmDFfYYxVIlvvK/6hRYKhHnz0N8sYhqaUyNoxAwy9NS8v5+Z8zGWGpmikBGXAS7lvgT/KBMXwM+JvohyGYjkMVaQYhrqAqMpIcVwHkCjrA7b+JtRgfSkp21fyn2ap4m9ccaaH5zPMjPRH535szvK6ACTts01qDQHe+JqlMKSPM2SVtoOh+DoTzAB4ojGqFIZvkHXmX6tfrvTbZOonDfrrHpfC0J7LEg1iGBoyTMNYgqGSrwhgRnzJGLNEttYX/9Aiw1DrC+WpwZeCoZESWasYht5eXpqXT13paykM5UpQABS+7wIs3S9fm32vC/zJuvENMryPMlmipXIYiuUwVJHkD+Z9yAAGl+uGZWaGZsouay3Ttr6sEtky9b6iEtkyFUtkvTQMqd8QYrCYoS1KUFq36s9hKJbDUEVyGHK59tF6GMqVtZZoY19miWyJciWyJZpSIhNxmaxrXZwZ2qYENeh2/TkMxXIYqkgOQy7XPloPQ67N1ZWZhiyQfCOtfdC7bX8KvzDtd82Ww1Ash6GK9H5gyOV6X3IYctUmh6FYDkMVKXoIz83Nzc3NzW26OQzVoXAz/8HNzW1zk2/t/Xej3c3tvdrDXXP3/xjtX6p95TBUjRyG3Nx2Mocht9rMYSg2h6F65DDk5raTOQy51WYOQ7E5DNUjhyE3t53MYcitNnMYis1hqB45DLm57WRLYUjm/U8L57Jd29el5uRMgvdcX5ea8x7NYSg2h6F65DDkNsnkg/7FaHfL2xIYkmss8/6T0TfXtK+562Bb4utSc3K2xNel5rxXuwYMyTH/1RWOO8UchurRYhj6X7qvFf6vqk0CprRZQVPapE/GcB/s7+kri6WxW5msX86F23Mm4/UarXO1xuvrpM26jlMs53fq+ubeq71haO59eA+mYQgBU98bMYae/9C1/53ygbEnGit/L7qfA/HWvqQfvsT+c9eWy4jwHIzHMf69MY/nzFkzB0v2Bfuf1RzuWzPnb6m9RlsKQ3/ZzcU1nAM3DkOuSyi8MfkGj5l8sMsHoBjDEIznSKATs/rgU9YiH3BoE98c7Le2OUFY1qbXD/DgcTDpkzF8nWC56zhmOb9z1jf3Xsm/HYbmmYYhNoAKB3iGCwR73CvtT64ZxssYPtYcXxpspvjScMC+rDmcPQFArDl/XjMHS6t0hXVgDoPNVnNqtSUwhPuk4Vfa5P075Zo5DLkuITNY4o8eZvUjkDMMWVCDjA/msD8x9HM7Hze3Ln1sGIMV97E/nAuDQM5wXvo4lvF10u3WdURf7lzH/MJK65t7r8auL8bofv1BJ338f/IIKjwP58T3jIPQrZucq/Vhj+sg520FXZ0twvWSNvm3vgbyGu9Vvt4MH1N8SbCa4gvrF5CxzsOag4DIrzUM8Zy5a9bB0vIlJoFV2gBz2t+Wc2q1JTCEjJA1T95L0q9B6WfdNUWmDTAk73W8H57pemMOPisulaVzGKpH4Y2jby6yAniNDIR+jX4OxgiY0q/bMYcDLAwBmNu1yTxel56DD0QEaH0eJf/6fGBTYQhwwO1sfJ3EStdx7B6U/GorrW/uvSpdX+s1rxnzEUhw//CBxvcBAfc9B5jc+uVcEUB1O5e14ANteg6CsMAEgrQ+1lRfMmeKL+lnGM1BXW4Ojg+w4XmlOVPWrIOt5QsAJuMssFkz51LB99o2F4ZQHrNKomJTYUiuOwCI+/H6993rX9LrPc1hqB5FwTKXSUAbQwUHYwRYDsKYzwEWxuPZ+LjsV/6NY2ufOBbm634YB+E5xuefMx7H56P7x+5ByS9bqX/uvRq7vhxExHQbz+d+vg/wyXPek8n6rQAg7XKdrevFgICx0ibBGP2AHbTj30t9Ya1TfYnhHll9pXbxLzZWIpu7Zh2krdIVMjx6jr4HW82p2ebCkFUi0ybvoSkwpMtk8ClwpOejHwDG2aM97MuEoXNzDH/Ex2abjdOn+JsyZp2iQIhAbJn0cUCT1xYMyb9lDoKttEsbB1gYB2S2XL8+Hq+Nj6XPzcqEsO8xm5o9EitdJ+4fuwclv9rG1jf3XvGadT+CIq9XbAyG0GbdB+03d563bAjWuk3OV9rlXHUf2jlbpGFAroG8RnkKPhhgtC99DO1Ll6l0sJrqSywHQ9YctGEs1gIgsubMXTOCoeUL8IQxDDZbzand5sLQVpkhC4bkuss9QOaI7XZgCIE8tuPqqP7WnA7iawwQMG7KWJZ1jK3BhP1d4pipwvXBjUUg5hsOM+5nMARFHfAQ3HQZRgdQNvHDwRKWW5e0ARA42E49lhWEx2wMNNgYWvj66euYO1fL2C9syvrm3qvS9UVQLH3w8HwxmZPLDLHJWJ5/62ZdEwRUzopYZS34kHbxw9CJsQwwW/vS90lbDoasOdwGkEAQ5P4la0awtHxhjGUybqs5tdtcGALs6Ptj9S+BIYEdwNC1gHQeDHGwXwtEFjQYejs1h7u75nA4LDjmxGNsqmsc03hmKBdgLeOxOuAhqGv/HGC1iR8ZC7hBG/zLPB0spX1qsGZjEOBxVpuem+sDUHA7Xyc27ufXObPGldbH4+bcq7Hra62Fj4cgIq/5GuN17gNNAtN7hyEdzPk8LahAux6PAK3HMsBcwpdYDoasNn5gmh+otubMXTOC5ZTSFWd59ppTm82FITFAowYeyRjJ37y81rCkv4Kfe2aI4UqARF5f4hkhtmUwJHzSgsnh9EZjYIem75Leo+oLNKOzPZ0dTo2a0qs91rE5d1DUzofa4x5O58hfOyR3DANW4Lsbcw7H7M4hOS7m4xy1vxnHTMaOXbOywji+wQhcMB20eBwHcR2w5LWGAw6gbACi3HFLfXxsfSz5t56r16RBAOfCgVr71H7YH8MQj9PH0MbXEW16nl4P+4TfsfWx/zn3isdzP8bk1oz5ul8HEQ0K1rlY53DrxjAk5wUA0OPkXK12+NDXyvKhAUb74iDNvhhIpvriDA1Mgl1ujvYNw5jSnDlrluBY8mWtRcBmzzm12RIYEsN9w73XmR4NQNIu11TGahiSNrn+8MElMACRtkvA0TYwxP0EC+ejGitzjwZE5NT5zgLFAGEtL+TWYkEI2vQxhvUugyHrtdXGrwE/3evsNcsrrJlv8JduHPin2Jzy1pdoS67pezf54J4SKHNlrSW2tS85hzm+LjUnZ0t8XWpODbYUhmq1ZTCE1zbsiCJYAlwkmZ8UCBIlUJDJSCnfLVTkQMVoS9ZPsLMHDCU+h3WEpuw1y8sDOJkE7CVZCPk/ds7uuA3mMJQ3GSfXZ8rYMbu2r0vNydmS0tWl5tRgDkOxzYMhbUNJJwWUFDCikk8RGmLFYKMgooeE9TCUrv8CMNRnn1LDYexrllcYxzfYzW1rcxhyc3v/5jAU2zwYygTkJLMyAAY/6hKDhwUNWhaEwQAi62EoXf/lYCgCyIxSWLPlMOTmtpM5DLnVZg5DsW0CQwmQpJmXPpCbGSOV+dHKAIP5vFIWhtLXvL4k28TPDPH5J/0p/Iwek32SStcspxQY3dzc3Nzc3CbZehhSQNGblRXpTKeL6FtcQ7jn7ItSP0eOMQ5D6TEYTDTgyPpO6bF1P3/bzPI35Zhm5ouzS1hT9sr3CuOYdt3c3NabZ4bcajPPDMU2LTP0pakAYjcshyE3t53MYcitNnMYis1hyJLDkJubmzKHIbfazGEoNochSw5Dbm5uyhyG3Gozh6HYHIbqkcOQm9tOthSGtvzdnWv7utScnC35PaBLzXmP5jAUm8NQPXIYcnPbyZbAUGlrjrm25ZYRS3xdak7Olvi61Jz3ateAITmm3r7jlsxhqB4thiH5lWaZW/rVZfmQ0N96433MpM36IT7MkzHcB9N7io2N3cpk/Ut+nTpnW/tzuy3TMISAqd+zYgw9vJ2GnsM73fMeYRyIt/Yl/Xr7Cew3lcuI8Bzen0pv3JmbM2fNHCzZF0zvkcZ9PEcCMcaOHQd7adVsS2FI7z8mNgduHIZcl1B4Y/INHjP5YJcPQLESDIlv7EIPeMFrzLcgBhueWn1igKXcDvd72dbwsrU/t9syDUNsABUO8AwXCPb4W9H+sGkr/seCjzXHlwabKb40ULAvaw5nTwAQa86f18zB0ipdYR2YwzDEc+S1BW2lOTXbEhjCfdLXUdrk/TvlmjkMuS4hE4bwQQGz+gFEOQCxNi7VAAMfuk3Pg3/2Cz9WRklb6Rz0sWEMVtzH/nDenKHS6yodJ+fPrR7LwRAyGhxANTBoH/L+wE7eOnjLa/xPg4zJ+WKwyPmSYDXFF9YvIGOdhzWHd5vHaw1DPGfumnWwtHyJSWCVNr0DfWnOGAxZc2q2JTCEjJA1T95LfI1/1l1TvWu9wJC81/F+4F3rMQefp5fK0jkM1aPwxtE3F1kZvJYgraFEZzNKMARf8M9jAQoyRrfDfw6GLMhik3l8DnoOPjwBJvqcS/6tTA5fG/26dJycP7d6TD6crQCJjM5YiQw+0KbnIAgLTCCw62NN9SVzpvhiEBHLQV1uDo4PsOF5pTlT1qyDreULACbjLBiy5nCgZvuSSmRic2EI5bHcNZwKQ3KvAEDcj9e/717/kl7vaQ5D9SgK/AABnSURQxuDAgOOZQAiBhvAEDInfKwcDPF4Nl4j+5V/49jaJ46F+bofNgYvfOzScab4c3vfJh/IVgDQAZ7bGRAwVtokgKMfsIN2/HupL6x1qi+xEgyV2sW/2FiJbO6adZC2SlfICuk5DD7WHKxXjIO6NadmmwtDVolM21QY0mUy+BQ40vPRDwDj7NEe5jBUj6LgjWBumfRxcJfXJRiSeRiP7IwFJBinYYHBATYGQ7l+fTw+Dz6Wvg5W1kr7xXlps45pHcfy51aPIVjrNnkPSLvcd92Hds4WaRhARgnlKfhggNG+9DG0L12m0sFqqi+xHAxZc9CGsVgLgMiaM3fNCIaWL8ATxjAMWXPYMGdszTXbXBjaKjNkwZBcd7kHDKwwhyHXHEXBmzMbbPxmg1nQwiUjMQ1PGhQABWLoZ3DgdWjI0JY7B2mzQExs6rEYXqS9dP3GjsP+3Ooy+cDmD2MOqDCrrAUf0i5+AB/4u8NYBpitfck49iWWgyFrDrcBJBAEuX/JmhEsLV8YY5mMs+awYQzgZ8qc2mwuDAF29P2x+pfAkMAOYOhaQOowVI/Cm1TfXA0sY8Zj9TMxOVAAHGhQ0JkYjGdw0MZZJrRp0OJnc7SvMUjRxtCmx/E5oiRozbWOw/7c6jL5wNYf0DqY8we3BRVo1+MR1PVYBphL+BLLwZDVxg9M8wPV1py5a0awnFK64syQNUf+XuVvFG0I6qU5tdtcGBIDNGrgkYwRrq2GJf0V/NwzQwxXAiTy+hLPCLE5DNWj8CbiGyx/4NIOywVsac/BEF5rP3qszNWgIK8565I7rhiAKLfGUh8fWx8LgAPTa9LQhnPR54g1TTlOzp9bPcYwJPcYAKDHyfvCaocPeX/Aj+VDA4z2xUGafTGQTPXFGRqYBLvcHO0bhjGlOXPWLMGx5Mtai4BNaQ6OhzVzZsuaU7MtgSExvo4606MBSNrlmspYDUPSJvcMPrgEBiDSdgk4chiqR+FNwzd4iXGJyM3tSzf54J4SKHNlrSW2tS85hzm+LjUnZ0t8XWpODbYUhmo1h6F6tBnA6DKVm5vbdBiScVuVW67t61JzcrakdHWpOTWYw1BsDkP1aDMYcnNzi20qDLm5vRdzGIrNYageOQy5ue1kDkNutZnDUGwOQ/UoeejMzc3Nzc3NbZo5DNWhcDOZdt3c3NabZ4bcajPPDMXmmaF65DDk5raTOQy51WYOQ7E5DNUjhyE3t53MYcitNnMYis1hqB45DLm57WQOQ261mcNQbA5D9chhyM1tJ9sDhrb8TR6xW/B3qTlLfhvoUnPeizkMxeYwVI8chroPLr1thtt+9iVd661hqLRtxxLbekuJJf5qmyNbS8yd857sGjAkx9Tbd9ySOQzVo0kwJB8K/HVCGI9dYrzPGDZglcCp20s7vOt9vsRkLo/J2bUCNM57yi9358bytZt7Hjm/fM+5H4Z7ZB0XPvS92PtayzpL75NLmgVD2FuMMwe835cFPNZWGzl/ML0fGG8dYfnDHlJL/cncOf54Du9hpTf3zM1ZchzY3POZOgf7atVmS2FI7z8mNgduHIZcl1B4Y/INnmK8KetSkw/zHLhMDZwIurld7Mds6nG2NFkvzn1snbmxcr762gFseH7Ocn7Rh+sJ0NTXFyZzYdyH94ju2/ta3zIM6SCqgzZASNYtbYAU7PCu/el5OX8wZDakzwrc1/bHczgTA7BYex3ErNLV2PlsNacmWwJDAFUNttImf6tTrpPDkOsSCn/Q+uYioMKsAMjBkQMeGz44YLovdwzMmxI4xUdpHPuRf+v1or903qVzyF2zsesCvwwiORsby/cFc3LrzvmFHz2G/eq5uHY6MCDAT7nWHFB4d3P9gSl98M3zeR7Oie8PH28v0zCENUtg52Au69NBHwEXcKTbkDEq+dPHl/F4D+jzZvC4hj+ewzvS47WGIZ6z5DholyArbXoH+zVzai+RiS2BIWSErHly/6Rfg9LPuuuod60XGJK/B2kXX7xrPebgb/xSmTmHoXoU3ji4sVYQtIyzQqWgz2ORiZB/43g6YOuxHMitYDxlzQjAeG0FaO2fMyxTzoGPiXm56wKT/hLgzBkLyMDr0rrH/Mo8+LL69Vw5rozXY+Tf0pa71ggivEZ+jTXjg4+DEO4V+nFczEewvEZwso6L9ehz4kwQxsh58BgGOcufGEBC2via7eVP+qf6y81BQBOgsOZZc5YcB+cjAXrq+Uydc6lAfA2bC0Moj1nlTrGpMCTXGgDE/Xj9++71L+n1nuYwVI+i4InArsHBsiljtD+GGLQheKO/dHwGFBgDgGUI2HoOB2g+JtY1dg6lNU+xEmiwjY3V/WPrzs3TBiDS14oN1w73AR9oCCRj1xr9Mg8BjQOdbpMgxNda9+dgiEstlzA5LgcArEcH7SkwxHNK/jAeGQorcFtzLumvNEfaxb++JmNzSsexSlfI8OTOZ6s5tdlcGLJKZNrkvk2BIV0mg0+BIz0f/QAwzh7tYQ5D9SgBCQRRMStA5rILlmlfbNJngYz4to4rJmM5EFo+2MSnFYBz/WI41tg5yNixa1ay0vmylcZyFmrKukt+cf7yb4Aoz8NcjJMPKIAR1jJ2rS0Y4vWKjcEQgibDkJj2y+e5p8kx+cPYCtpjMCTnK68lEPMxSv7wmgO39jd1ffpc1vrLzUEbxuKecflw7XFwPgieU85nbM6XUCITmwtDW2WGLBiSay33CpkjNoch1xyFNw3fYJj0ceCx2nKGgMzt3K+DrBWYc2NhY2vKBeBcP3zKscbOgW1sLWy587UsN5ZBSGzOutmvBbw8RrfjfAEiumQ2dq3RLx9aCGilD7AcDOUyQ2wylrMNe5l1LlbQljXrdelgLK9zJa2cPwRqy8THHv70PRjzh3PiOdyG64BAyf1Lj7PkfKbOqblEJjYXhgA7cp2seWtgSGAHMHQtCHUYqkfhTco3GMaBCxkCHmcFT+3DCqJWvxxL/MsfiAQ0DT5WwIdhXXq8tMGvfg4FkMABWs/n8xk7B236mrEfyyzfer1jY6UtdwxrvGU8DvcBr3HNGEIwF+0ISDIWH0xzYEheS9AprZn/jxzXWIOFfs1mwdReJteC12EFbbQhE8SwwuPH/LHxNSuNv5Q/q40fmOYHqq05Y8eZUrri89lrTg02F4bEAIoaeCRjJH+r8lrDkv4Kfu6ZIYYrARJ5fYlnhNgchupRFPQQBGEckKXNClRjQV/6tF89FoEWhkDFayn5xxpK4/kYul/+zcdj/7lz4Hn6mpWui54Ds+CtNJaPba0ht+6SX6zBamfDtdOv9fFz15r7dRDh/wvX/YAZ3a/naiDDNcJrMX5P72lyXKxNr0sbAIjXmcsSwcb86bE6cGt/ueumzSpvrPWXm6N9wzAmN2fpcaxjls6HbcmcGmwJDInx70fpTI8GIGmX6yhjNQxJm1xz+OASGIBI2yXgyGGoHoU3Dd/gucYBzq21JdcFcMjtbq1dMrOz1uSDe21w5CzRWtvDn5znHH+1zqm9RCa2FIZqNYeherQ68EpguuT/bb8XW3pdJJuRy8K4fXkwJD44c7bGbsHfpeYsKV1das57NYeh2ByG6tFqGHJzu6R9aTDk5nZL5jAUm8NQPXIYcnPbyRyG3Gozh6HYHIbqUfLQmZubm5ubm9s0cxiqQ+FmMu26ubmtN88MudVmnhmKzTND9chhyM1tJ3MYcqvNHIZicxiqRxeDIfm2hRxL/+YMfstGf3tqapub262bw5BbbeYwFJvDUD26CAzJt38AMvjquPyeDr56LoAkr6e2sX83t1s0hyG32sxhKDaHoXp0FRiS17Albezfze0WzWHIrTZzGIrNYageXQSGxFDqQpZHgw3+PbWNfbu53aI5DLnVZg5DsTkM1aOLwBCgRv5dyvhMbWP/bm63aA5DbrWZw1BsDkP16CIwJBDDMMTPAsl/p7a5ub0Hcxhyq80chmJzGKpHF4EhMf82mduXZnvA0JI9ukp2C/4uNWfJHmKXmvNezGEoNoehenQxGLol05kqt+1MAsAtlTElYM7ZfXxr2xqG5NqKz/9k9C0x7W+LdS7xV9ucv1ww5z3ZNWBIjvmvrnDcKeYwVI8mw5DAg4yFcf97Mlm//oq+FcTl9dKynFyrJTvWa5P16estpteITFuuH4b7ljsX7WfKzxbIMXLHtK4jTK5Hbg1TDOfBEMvvSx2Arg29FgzJeqyshlx7acd5WMDzH7o+DXg5fzDZ2BY+GQwtf/95pT8G0DF/PAfjcYx/b8zjOYAWfe3G5sDmns/UOX9L7bXYUhgSSJS5uG5z4MZhyHUJhTcm32DLdCCTwLY22G9lHGRzwVj3c1C2grg1bqqthSEAB69J3ytZmw70mKPbNOhY54I5GDcGQwA0BiD9b17zFibBRc6Lz1lMAhMCH78vcQ85MF7KGIZ0ENXrAgjJ2qUNkHIy/Ol5OX8wQALuLwfua/vjOfAPmAFYlK6DzMF108fkOVbpaux8tppTky2BIQCuBltpk7/lKdfJYch1CYU/aH1zOSNhBTcEJj0egZRf72lyDFkfPhDlNQdLNg6YYnIufJ4IpHoMXxvrHPEhCcvBCV93bbnrzsfhcwXcyL81uMh/9bno4+Be5s5H29i91dcRx0Ww4OuO6ykfkrgeHFjYJNDxOWvDuegPWPE/5ncv0zCEc5UgzdCA7A4COAKuDvIaFMb86ePLeCtwM3hcwx/PQdDk1xpseI72J8Y+SnMkyEobAKp0PlPm1F4iE1sCQ8gIWfPkfSL9GpR+1l1HZNcAQ/L3IO3i65muMebgs+RSmTmHoXoU3jj65iJA4nUpiOK1hiMrSOMNuqWJXw0M8oeC9pJZ69NBHGbBkPgHCIiP3PGkzwIu3Zabr4GmZNZ5iMlcfS4AGL6P+vh8biUrjcV1ZBASs2BIj8F6SkFkDIbkw5D7ZQ7f20uZrIfPB5Cg4YAzQRijYcgqaeX8iQEKpM0K3Hv4k/6p/nJzENAEKKx51hzLpwYoaw7ORwL01POZOudSgfgaNheGUB6zyp1iU2FIrjUAiPvx+vfd61/S6z3NYage9QFRrBSI0SfGgV5M2uWDi4PurZmsk4Mjgrhus2CIx4gvCwoYhgAkPM6az/cAkABD+1oYkjbMLwGOZQBPnoM1STsHKwuG+Hpy8GGzYGjsfSltPOdSJufDAcCCgykwxHNK/jAeGQorcFtzLumvNEfacU+53JWbIybvBavfKl0hw5M7n63m1GZzYcgqkWmbCkO6TAafAkd6PvoBYJw92sMchupR+IPGjWUAyJmV1UBQ4gAHE7/Sr/1bbQi0OoBZbUvNWqMcn9v4WlhjLF9iDEMMOCWfubHcLnOt68FrsmAI11P7ktdTYQiG9wHmwY8YQ81UGOI2bRYMacN69AdgDTCEIC+BmI9R8ofXHLi1v6nr0+ey1l9uDtowVv6tr4s1h48j43WwtubgfDBuyvmMzfkSSmRic2Foq8yQBUNyreVeIXPE5jDkmqPwpsGN5YCbMwRYHTzltQVJ8IuAJP8Vs9rEHwKmfCDKa6uN/c8xWR8HXAss5PUUGLLWwzCE68XjcvOtNfK9sdbMY8RwbD4X/aGhzVpPyfR1wb/52olNhSGGKG1jMISAqH28BxiS9UmbFfTlda6klfOHQG2Z+NjDH1/3kj+cE8/hNlwHBEru14aAyIHamrPkfKbOqblEJjYXhuT+5+6N7l8CQwI7gKFrQajDUD0Kb1J9c+W1Dh4AEB3IGHp0oJPxeqwYg4+8zrUhQJbatO+5ZkEEn4+YvNbHAkAAFqyAr/1xH18Xa4zu4+PLv/Ua+TwAPXxuFgyx8bkxuMDEt/aPNWGeBhw+X/aJYyLg4HqUPtAYhnLvS+1D5qx9zyw1+cDm87HgAG1yLgj6+trw+DF/bJzFKI2/lD+rjR+Y5oehrTnwJeuxgq0ESmuONj6fvebUYHNhSAygqIFHMkby9yqvNSzpr+DnnhliuBIgkdeXeEaIzWGoHoU3kb65CJ4wHeisdg7SmI9+mHzQSzsHSN2mYQf/ttq037nGQRmGQApjqJDzx7nC2AdMX0PtR88Vfzwv58PyxfdDTF9za76Yde7whfm5a2QdVx8T1wiv5QMQa2af1vXMBRIEO23wy//HzlkDmcttlzI5Ns4JUMDnAQCSa6H7c1ki2Jg/PVYHbu1Pj8v5s8oba/3l5mjfMIzJzeHfJYLJ+wvfZOM5bFPOh23JnBpsCQyJ8X3SmR4NQNIu11HGahiSNrnm8MElMACRtkvAkcNQPQpvGr7BWxugRv4NoMm1IZiW2tj/HJP5YyBiGQf6Wg0Qxe1b2yWuJ4LUtQLUFsfmLNFa28OfnOccf7XOqb1EJrYUhmo1h6F6dJHAJxDD4GO1SSBG9gDAYrWtNTlnzlyN2SWC9y2Yvi972iWuJ2ejLm1bwJD4kGu11g/sFvxdas6S0tWl5rxXcxiKzWGoHl0EhsTkw0KOpYHGakPpTAdkq22NLQn4lwjeX5Jd4nrO/T/8rW0LGHJzuyVzGIrNYageXQyG3Ny+NHMYcqvNHIZicxiqR8lDZ25ubm5ubm7TzGGoDoWbybTr5ua23jwz5FabeWYoNs8M1SOHITe3ncxhyK02cxiKzWGoHjkMubntZA5DbrWZw1BsDkP1yGHIzW0ncxhyq80chmJzGKpHi2HI+lr8e7VLfM3b7cuzPWBoye/tlOwW/F1qTsmW/FbQpebckjkMxeYwVI+yMITf9rEgQdp4nvxuzzV/4G6NjcGQnNde0Gdtm6HXAujM9cPk+pfgVPuZ+4OTbstsaxjCL2rz1hxLTfvbYp1L/F1qTsmW+Fsyp4ad7a8BQ3JMvX3HLZnDUD1KoAYm7blf8JUPAg66NcPQXgao5GPreyJr0z8QiTm6TYMO3xc9B+Mchi5jFgzJfbOyGryXlwU81lYaOX8wvdcX/wCl5Q97SC31J3Pn+OM5gAwcA3u0leZMOc6cdS9dAx+Ht+eoYduOpTCk9x8TmwM3DkOuSyi8MfkGA3asfaqQgYAha6LbcoGafWGs1VfqL/nkTIsGjVwfYEj3aWBgKBwbz31iFijy+ixjGNL+5d84Jw087EPaxYfD0GWNYUgHSh20AULyHpE2QAoHYQ72OX8wBHXcdw7c1/bHc+Q6yLnj3wASnjf3OGPr1qWr3Bo4EFvlLmR+cByGHmvOe7MlMARQ1Zv+Spt8Jk25Fg5Drkso/NHyDZYPZQRg+eO1grG06zYrM8QQgYCM1/gA03O0Wf1jPvW/uU98Majhv9IHSOBj8Oux8brPui5iGmhKZl1/MZlrgZ51X3AcXrfbvqZhCIEVO6nroCj3CH3yGsEbcKTbkDEq+dPHl/G47xoCtD8d+C/pj+foPhxPjqP7eM6U40gwlfF6p/mcP14Dshk6EOfm8HE0DNVQIhNbAkPWNYTJ/ZN+DUo/666V3rVeYEj+HvCe4F3rMUf6+NrvaQ5D9SgJyAiqOphzgJ0CQ+wHptvk3zqgs3H/FJ/aMF7+XYIPORd9HD4/hp3SeH1M7tPG6wG0wPSx1sCQtGmwzV0rt+1NPpw58CF466DNmSCM0TBklbRy/sTwf+PSZkHAHv6kf6q/0hwxAIcOkqU5ueNg3RKI56x77hqs4+iAXEOJTGwuDKE8xtcQJveN+y0YkusJAOJ+vP599/qX9HpPcxiqR1HgFWP4sQDECvA5GLIMvuTfS2DIMvhkqBDLrRlWghuxOTAkptfDc/UcrK3UvgaG5LjsS6/NbV+TD2QOAFbQngJDPKfkD+ORhbAgwJpzSX+5OYAK/O1OmVM6DrI1uXVbpSteAwd/a451HA0+1pz3aHNhyCqRaZsKQ7pMBp8CR3o++gFgnD3awxyG6lESkBEw2XRA5uAvloMhfvNok/4lMMTjYAwSejz3aZNzKcENA01pvAVsfDwYnx986Tnil2GIx4hZMJS7l2IORPubfGDzh7EVtMdgSO43YISPUfKH1wwB2t/U9elzWetvbA4MQMLlQ2uOdRysG0FyzrphyEqU1pA7DoJ5LSUysbkwtFVmyIIhuZ5yP3CP2ByGXHMU3jS4sQiyHCj1cycYZ8EQt1mBXJv4ZBgY6y/5ZEjgzIj8W8/FektwAz9TYUj+bWWCLMN1ZV96zXy+gB6+BhYMsUmfdX/d9jENEDAraMu9lDYr4MrrXEkr508/UMwmPvbwJ3Om+sM55ebwGEBEaY51nDXrnrOG0nEkoNdSIhObC0OAHbkW1rw1MCSwAxi6Fmg6DNWj8CbFjeWgr03GIWgzLIghGIsxcOgPBz1P+7Qs11/yCQDCOvT56TWKAQpKcAOfU2GI18DrY+M1Yd36WNyvYcaaL2bdR/hyGLqMyQc2f0BbQRttyAQxrPD4MX9snBEpjb+UP6tN/o7kvc8ws+Y42tifBFEeP7YGaw4bZ4amzHkvNheGxACDGngkY4TrrGFJfwU/98wQw5UAiby+xDNCbA5D9Si8ifgGuy03K0MmQY4zOW71m4YhBGvAKoxLYWjPZYlgY/70WB3QtT89LufPKm+s9ZebI8bP6wBCcnNKx2HfU9a9ZA1sGoamznkvtgSGxPia6kyPBiBpl2slYzUMSZtcV/jgEhiASNsl4MhhqB6FNw3fYLflxlkkMYEjh6Evz+SDe20A5CzRWtvDn5znHH+XmlOyJf7WzKmhRCa2FIZqNYeheuQwtIOhHAVzEPoybQsYEh9bllhuwd+l5pRsSenqUnNu2RyGYnMYqkcOQ25uO9kWMOTmdkvmMBSbw1A9chhyc9vJHIbcajOHodgAQ8kDS25ubm5ubm5uX4o5DLm5ubm5ubl90eZlsjoUbian/tzc3Nabl8ncajMvk8XmzwzVI4chN7edzGHIrTZzGIrNYageOQy5ue1kDkNutZnDUGwOQ/XIYcjNbSdzGHKrzRyGYnMYqkcOQ25uO5nDkFtt5jAUm8NQPboJGLK2sHD7Mk32H7I2532PdiswJOuQv/Ot14I9uOCXX29pW/8CtdsyuwYMyTH1Xma3ZA5D9SiBIfnAuXQwGoMh7D7P21rwthclH7y7O2+megsm58fnIK8vvVa+rvwe2dPGYMi6RrdqDEO8qajefFW3Y5PW3Dz45PbcZqC3AkO8Ge0cuHEYug1bCkN6M1axOXDjMOS6hJJAd2swJOvDTvAWDE1Zq4wRPxI80Ca+2N+17VYCPV9reX2pddUKQwAXHdDlXPFvQIL0c9CXc8ZcwAb8YZd6bMDKILWnMfzwa23YtVzvJi9tcm7WeDa+dm7XsSUwtPbeOwy5LqFZMMQZA7RbMGMFVGtubj4b+0Nbbq3a5Hhj40rrk9fITqHPauP1yL+lTR+DM1QAND4+ztW6NjyW+wB/fAwxvWbu0z70tZZ/6/Ow1qA/1MauA69PDOcIGNJ92CUcwRbG74dbMw1DyIoAXqyxck6S3ZF/653RMQ/XXOYDkAA/Jf8MKTJOjqPvYQ6i4BfjdPaJ/fJrbfBh9QHsdLCEL1wHwJCcH3zxmvn9Ye0uj2PhOmPc2PElIMscfQx9fOxOL+3aT222BIaQEbLmyf2Qfn3NftZdy79V8wWG9L1/pmuMObg3mLu3OQzVo/DG0TeXAxmMg7IOkAhe6EPAR6AtzbX6LeMAjTb94WcFdqyF29kPr0/PgX89x2rja8cQgPVinXwcec3Xga/N2Fr5GHr+lGsBH/paW6+tNeDDaew6yIcWggyfMwchPn8ef8sm54lrgiAs5ybXgoMlB2aU0AAjEng1bHAmiDNF2jdDCsMEXvM88amzV+xn7DUM55CDhKkwpNfM/XiNgAs44QCs7wNfu9LxEdAxRwd4nB9AUbIeFojVYHNhCOWx0r3nfguG5FoDgLgfr3/fvf4lvd7THIbqUXiT6ZvLgUyM4Qam2+TfmKdhZ8pcDniWcUBmYyiAMaix5QAhd266n9v42jEEcD8fxwr0U2BG++Bj6DVgPq+BDUClDf5za5APHwSAsTXIWHzwoU8HIWsu+q1rdKumz1MM545rqs9LA4lcA/QBetCOf6+FIX1sgMNYAOdx7Jdfw6wyiTasvQQjvGb4lPO35sv7Bv3WsbQvaz4fXwJy7prhWLq/VpsLQ1Pu/RQY0mUy+BQ40vPRDwDj7NEe5jBUj5LAxoFMDAHQMgRJHbS1j7lzcyY+SzAkJj557fKaz3FKvz4Hy6/VxtdOQ4DVz36sQK+vzZS18jF4Dfp+5K4nX2scV+ZusQYdUPne1wxDMA1FyADhtYyXc0Qgl/8CcK4BQ7r8A5sLQ3IPxwIi9zOM8JoREOX6wb9eIywHQ/pYVhsfvwRD+jWOOwcY3pPNhaGtMkMWDOHeI3PE5jDkmqPwptE3lwOZGAIovxGsMTyWX1vGAdEyDtBs+vjcJ+18TjyP27Uva77VxteOIYD7+ThWoNfXZspa+Ri8Bp7H64EPvtYYm1uDDgylNSDwiA+Y/sD6EmBITM5L+gEvuCbyb75GFnxoYNL+rG+UMaTIuFJgh+nsizWO/fJrmD4f7tP9JRjhNeu1lc6dzTqW1cbHH4MhmA7UY2t5jzYXhuTaAlaseehfAkMCO3Lvpf9a19thqB4lgY0DmW7nAMkmY8Q4WI3NXQJDMl6Dj7zOBX2ZJ+epx0sb/PGapV37krl8Taw2C1y0H/m3Xgcfh1+zT/gorZXvXwmGeKxu19daxuh1j62BrwMCGXyV7vUUGNKvb9nkvPW69TXlzA7DAoKxPlcNG7iugCn44+DM83As7XcssGsg0cdgv/xaG47BpSy5JvJanz/gRh8Lr3PXqxRwtVngw/Ot45dgCPdW+iQTIu3XCs5721wYErPuvVwnXDN97fVX8HPPDPG9FiCR15d4RojNYagehTeRvrnyBy9t2nQQ1O0cZAEduQCbm8sBXxuvRUyOgwBt+bMMa8uNH+vjc7La2A+DiPyb163nAqDEEDita1NaK46B13oNfGz2q33ocTiXqWsQQzDBXL7fPF8HVGv96NdZBg0Xt2iyTh0QAQswXcLh4C7nhqDK8zVM6OvMJaHcPJmjr2kOhvS6xCSY6XHsl1+zAa6s+67PRdr5W3W4Fvoa8vla5RIO3DkYGjt+CYbktV4X+67JlsCQGN97nenRACTtuPYahnDv4YNLYAAibZeAI4ehehTeNHyD3fYxBpUv0TiLJCZwdOtgs8Tkg7vWoOj2ZdpSGKrVHIbqkcPQBc1hyM50yXVxGHJzu31zGIrNYageOQxd0ByGWuMyXI0gJOYw5FabOQzF5jBUjxyG3Nx2Mocht9rMYSg2h6F6lDx05ubm5ubm5jbNHIbqULiZTLtubm7rzTNDbrWZZ4Zi88xQPXIYcnPbyRyG3Gozh6HYHIbqkcOQm9tO5jDkVps5DMXmMFSPHIbc3HYyhyG32sxhKDaHoXrkMOTmtpPtAUPiU/8S8lq7BX+XmlMy/oXpKbZkTsm29reHOQzF5jBUjxyGdjb/baH3abwtyBLbGoawZYTeomONaX9brHOJv0vNKdkSf0vmlOy97Gl2DRiSY+rtO27JHIbq0SwYwv5e/CN5ek8tsTlBJOeT9xLTPuXfuo/nwniu/Jd//bhkubWxldY6F4b4WvLWFXuYrH/OdRmz3HXj62R96GPfMp471fgYvH8VDMFMj9Xr2guGZH1WVkPvuSZmAY+1GWvOH0zvmcV7j1n+sIfUUn8yF+3WObFPnjNlDUvmzFn3FH9L5ug1YN8t9sftt2ZLYUjvPyY2B24chlyXUHhj8g22TMbJB6/8oXOgQp/8G6Cid4jPWc6nzNUQgACn58E/4IGPJ3PgE3N125jl1sY2ttY5MGRduzlrXmrifysYkg/03HXT18nalkPOX8ZYc6eYXDcJOAhEuBdWYLJMAhJ2gd8DhnQw1AET0IBjA1IY5DjQ5vzBAHzSJ2MYAvb0xxuiItivPaclc8bWzeWpMX9L5iDzgzUw9LC/W7UlMARI1BvYSpv8fU45X4ch1yUU/jD1zeXMBAcE+YPVgQoBnMdIO4MKv875ZNPz8G/db/mUwIK1Y408Dx9MVp8eU1obG58jroU+Dq8VZl1vttKax44FONB97A/nKtdP+vj4fH54zQFm7LoBmHQbAGRsrg48YrkPVFmbfAjz2izjsViLtOE4U/xok7lYG/wLDHAwl3PVoIDjAo50GzJGJX/6+DIe91ivX/uTeVv7QwDkc9IBkedMWcOSORJMZTzeN6V1T/FnzZFjlObwGjQMvZcSmdgSGEJGyJqHa6ffFz/rrofetV5gSP4epF188a71mIO/VYbNvcxhqB6FN46+ufJaByIOWByorKCmx+h+nmuNtwwBHq9RSpkyN2ecmbDOQ2yuf14rAgfgAUDC8wAV3K5NfPGaS8fS51jyL344S5ODIYxfe0/lg4vfR1iDBIzc3Nx9s4IIgpbVx6azQvKaA6ccZ6ovmDUewVavmTNBGKPXY5W0cv7EACPSxueylz/pRxtnguBXBz2eM7aGJXOwbgnEU9Y95m9sjpXhsdagg/V7KZGJzYUhlMf0fdc2FYbkmgGAuB+vf9+9/iW93tMchupRFCA5kFvGQc6CCPkQ12PEp4zhcTmfbFY/gCjns2QAA0ADzGqzjl0yHi+v5brqMdZxxq59Dma0Lz6W/BvXB/N5LWIWDI3ZknuKcxTTx0PgwYdhDoYwjoOQ1VbyY5n40CUcZIZ4jHWcnOlzgllBdgoM8ZySP4xHpsGCAGvOlv6mwBDPGVvDkjnIyOTWbcFLyd/YHKvPWoMGH2vOrdpcGLJKZNpwzcZgSJfJ4FPgSM9HPwCMs0d7mMNQPYoCrA6eOZP+MRjiMQiCHFxy47VZGQrtS+ZZcFEygIFl7Ke0NjZrrfKaz9u6FmMwlOvX/vlYfD/1efM9nAtDa+6pGO6bfFjxunMQgwDF90yMIQX3YsqHId7DemwOhviZl5LJeD6+FWTHYEjWIa9RIpvqD68ZArS/qevT5zLF3xgMWXNKa8gdpzQHa0CQnLLukr8pcxhscmtAoH9PJTKxuTC0VWbIgiG5ZnI/pJ8/D8QchlxzFN40uLG5gKuNg5w1h4Ob9CP4sT/LJ8yCiynwNWaAAm63bKpva62Yz0FVjs3QhXYeC8utWfviY8m/rTVhHsYugaGl9xSGYCOBSf6rP8RgHIgwZ+wDbg4IiYlPhpwcDDF0lcxaqxVk5TrpNeiAK69zJa2cPwRcy8THHv742uSeGULQt+aU1iA2d86SdZf8TVkDw1BpDRLs31OJTGwuDOGayPla89bAkMAOYOhaMOkwVI/Cm1TfXHmtgxgHUyvIyRwEDoYjCUwItDLXCrqWT2njY1v+AQkcuMbMOqZl1jh9ThhjrRV9sj4AiwVzMMCFBiVpw/H5+rEv+fdUGNJj2U+uDbbknso58drlXK0PsFxmaKwP/XJsyy/fN7HcOjiLgOvB40omH9g83gqyaJO1ART0sXn8mD82PpfS+K38wQ9/m6w0h+dyv9U2Nkcbr5vBZYq/sTmlfr0GHehL42/N5sKQGO69Bh7JGMnflLzWsKS/gp97ZojhSoBEXl/iGSE2h6F6FN5E+uYCLmAIzLoNhqCUm5MDlzGfmMeGQCb/5Tn8Jp1i8iGk/chr9PGx9XF0UB1bq/jkMbwObQjO1pp4XdyHY+G1hiFeg4YCff9wjjkYyt1THeT0cbRPvt7W/12LTQEe7QfBRNZmHV+/bxiGZLx1LGSGtL+5AUvmYg6Cq7U2a+1WRkX7HvOnx2oI0P70uJw/q7wxxZ9ee+mcpq5hyRxez5R1l/zh22LWHKtUU1qDBPrcGm7ZlsCQGLI5uDY606MBSNrleshYDUPSJtcOPrgEBiDSdgk4chiqR+FNwzfYLW8I/txemzFYvXdDkLtk0NnieJwlWmt7+JPznOPvUnNKtsTfkjkle28lMrGlMFSrOQzVoy8isG9pkkWwMgk1mUAQZ1Deu13jvm0BQ+JjyzLKLfi71JySLSlPLZlTsq39XcIchmL7smHorTkd5P+ujs2Zu96hHIbc3HayLWDIze2WzGEottuBoXNzlGB+ODVv3LWbxmHo7XRoISNaV7fWyPI+LiWHITe3ncxhyK02cxiKzWEoBzLo68yCoWM665qK4czNzc3Nzc1tst0+DBGY3B2aUxiEdrwOqZzmEPnJzdV9BgwFP4fmdGZ/otuFIZfLtb3u7++bn376iZtdrnerr776qvnxxx+5+YvVv/gX/+LWYSgFlvNxeI0y1gGEcz6q1+W5Vn+iBK5EDkMu15ckhyFXbXIYinX7MAQY0eDRAU9oIlhpYafL/ozNXQtD2m4AjByGXK595DDkqk0OQ7FuH4Y6eLEsBRryMWtuRiYMaQ1luGvzkMOQy7WPHIZctclhKNa7gaG+DGYIpbLjqQUXu2RmaQsYQjaqdJzLyGHI5dpHDkOu2uQwFOv2YagvSU0AlmD6AemxuQth6HxU4INj6ONeRw5DLtc+chhy1SaHoVi3B0ORATCsPg0w6htjWZiy5hZgKAIsZV0trP/9oWid15WsxeVyba/tYejcfHN/39wfnptPm/jdwd/Dlv6+6/39sLW/z1v5e9je34db9ecwxLohGHKt1VIYCmW+az/w1KsEtpdQe/ybuRw3obfm9HjfHM/bfAi/R20OQ+dvgs/D86dmE7c7+HvY0t938PfD5v42YQPx97C9vw+36s9hKJHDUEVKYCh6gDyfvbopGAprNjJ1Y5p4rqyQ4YvO/TZgaPjJiE/c0Rzk15C7c90CUM7H+wCeONLb6bG5P56bwfMcGGrHyrr16OBTjhE3No/qXMIaVH+YI/0hO8Hz7vt5IWCr7j1kwdDbi16fXvhLuj5a4Pmb++b+/tA8f/qpX3vWX9vbvDzeN/fd+1vPE23v72Gdvx9if9/Bn2oXfw+dvzRb9Na8fP2g/H3O+Bva316+HvwlxDDu78H0d9/cGdmYUp+o9fdhsr9+feHvIZ4nsvytlcNQLIehihTBUIADBQUFyLg5GJqbEZpxrqzbg6G2rHs4ncM6Yhg6N8d71XY+Nvdy3sRLa3URGAqZDFm7OsrpsXkM81ofbeAiGAIIHV8DYAQIECh8jYPv1ophSAd+ggOA0JNa3/1d8xStj0taBX/9lPZ6HbofmY3hZZk/Cf5Zf1GJbIG/CIa4RCb+ACYZGAqZH+1PQwCXyDToZGAoZFZK/nSJTIPJHcFLqY/89X0T5nTr+/BB3i8MPexvGzkMxXIYqkgahkKQT34byc6YpDCkSlXBYrDIPS+Va4+V9x3P5zX1g6JnuWTInHMdxOuIf6jzeNbPmpEvYw3aZ3GuVtZP6ExhKMDPsRmYRMakkCLXI4KZZF4LVZgXMkNhfOsvviYDnBzPr82xz3jEIDNoCgy1wTsLMAF4Ds3pVbJgkrUaYAjZon5ugAR5r7TwsZciGArAw+tr+5A96eGnK18BjoK4pFXw100I1+vw/No8BygheDH9PTbPr88tmFn+Qkko7y8qkS3xp2GIS2Ti7yH2F8NQCzuxPwUHXCJ7e2m+Zn8RNLQwcXj+2DwHCDP86RIZ/H18bh4FujSElPrIX1/SGp1D62MYYn8baT4Mfdf89iuBsm8TOHy4f2o+/rhF1uqtefnFVxv6my6HoYokQapXkh1pA7TFFwxD/DqCjRDAjaxLrj1SByDsW88rZoaQNelTQM1Rxs44V1YuM6QhJr4e3TExOgKxsblamXPp+1MYCpCjylmAIbuUNsDP2+kY/o+4hybqH2AI3XZmSAOQzLkXAOnHxGOLMBRgR46fzo6ELJCCoSQTRJmivWSVyfoskIKDJBNEmaJhDGdjbH9tswDWsXn96VOXMYvnLvb3OecvLZF1E6f7UzBklci6iQEOGIbaclLnL2R8YnixSmTdxOZr+FPUAH8fC/64RNZNDP5SeCn3ZUtamTnJ+mhu1t9KOQzFchiqSBEMIRCrDEUbEKMhwzh0BKjhbIbKtHTZjMRPrl3LBCbK4pRgKIEe3TXtXFk5GIqaSmuKzmnG3MK5tJoCQy2UJDAUZX7Ez7E5q5+D4MzRVBiKMlCSbeJngIIATvp+dIbxIZMhwT2ZHKtKGOKSVtnfkBWSLA3KVRpUFvgLWZCCv9y3yOb468GHS2RKJgwhKyRZEJS/NKhwiUzJhCFkXUr+Mt8iy8BLua9Q0jLnGOuLwKfgb6X2gyFpE6DB3/6H5tvvh/MRH4/ftlkwjHn6+GN7/gGE1GfGh2+b73/c9rxzchiqSAxDsfLZkhSGjECmgUWNiX5oMtcOmQBAAJGDB1GpL1L+XFlLYCgp5y2FIau91xQYymSGgnu0n5ujLEjuTTheWlrbA4aKmaEvGYa4pDXJ31N3rQx4me1Pgu1T8xqCme0v+y2yOf4AQ1wiY38EQ23Wp/Un5dkEXrhERv4YhtqsylPzseQv9y0yE15G+kolLWOOuT4NQyV/K7UPDAGEBjj67rf6defj7q758O33HQBKP4DJM0OuDVSEIRNE0MUwZI9LlYOOTLvpe5vMUKSp48KSZsIQ+75gZigAiMzpPyFSsOkFWOkzQjJWrrNkjbSPK8DQ2DNDkAFDuWeG9v5G2VQYyj0zBLjIlrRMf/TgMv3PifjY3l+mRLbE3w/KH5fI4C+CIXqwOvH3WfkzAmUCQ4Af9hX7M0tkyl8CPIW+YkkrmUMPVkfW+mjXl/G3UothKFmrWAcvco4y5ulj8yOuy3e/bb56uO+yPwNQfd/1S5lw6HcYcm0geVPa4udTYsXPtSAI22NjGcF/QnvyzJCGhRw8BPF58HM21hg+v1jJ8a21F2CoLc8tgKFknXwuBgxF5a/WdwxHWjL20ByPh349Aj3H4zECH7QnMBSBztYw1L2mh7CHb5P1DQkMcSaozRS1wXtPTYWhvi36NhngolDS0nNz/UkmZwd/uRJZGD7DX4CfQoksDGcYYnEmp1AiC8MZhliWv0yJLAxneBnrGylpmXOiAZQZGvG3UothqJQZ6sAnhSWUwvIwJJmiHx2GXFsogiEqd5XgJoWFDlr0mzmCAdU+RFq7PZH+ppXy23fn4KFTdF7xc0y5c03PTykp7Y0DjX4+6XA6NcdFMMTrRnaMrk9/nA6KZE7/f5Llr9UHyNGwFOBJwZQepwFJ/f5P/G0yNW8lDPVt9F4I/fQ7Qr2hFIZvkHXtoxmmDZR+m2xsfUN/LkvUK+dPfwOtHRjDywJ/cUxN/ZklsiX+BIZ6f1QiAwSZ/qKBMbwof9FxAUGJv4/j/qwSGaDF8vfplO97zZS0Sv6s9QGGuvUl/jbSnjDUlsBoelAehjwzdJNCQCqVMW5P8gfmIpmlOZdrnszM0EwVS1oLtL2/QolsgbLfIluo7LfIFir7LbKFKpbIFmhrf6xdYKgvpeVghp8ZOifj22eM5BmiH435+2l/GOKMQe7/kq8mZEF0wHQYqkVSBuNMkcs1V+thaKSkNVs7+CuVyGZrpEQ2WyMlstkaKZHN1tYlra39pdoHhtS4KBNGsPThqXk6tF82kP42KwSXL80vML+Wb5P137qhZ0RuKzhZMPQ+5TDkcu2j9TDkct2W5sPQFkrLZLeiHWFoSnaFn49Iv77dPpPR+Sm08QPA/AwGtjfAsdrhuWdjLEAqrLV4jG6E/h2c3PMrK+Uw5HLtI4chV21yGIq1HwyhPJYN/AxLBDHq4dKBcwptIzAkc/QDskO/BT7cNrJWdYx2GTS+uxbDj94d6UcNt1EEdW5ubm5ubgVzGBq0GwxZJbJIBAgizAltgBz9jFGpbQyG1BwcJ84OFWBobK3GMdpMULcGgOHOz0vJMVwu1/byzJCrNl0nM3S72g2GxjJDMUx00tCRQI4FPlbbdBiKM0V5GBpdq3GMCIb617BS6XC5HIZcrn3kMOSqTQ5DsfaDob6klQn8hWxL4JoEcqa2TYehLTJDUVmsAEM8b4+HyB2GXK595DDkqk0OQ7H2gyGdDdHw0m8PwABBAJJATqYt83xOAkOcxVHwk4ILA9LIWpP+2Gf0DToDrLaSw5DLtY8chly1yWEo1q4wJOqfHYJZz/v0prIzFvhYbSL9W0aHU3MOx+TM0LE5BoBpLXKh15H7NllprSMwNMBTZ7z+jeQw5HLtI4chV21yGIq1OwxdXymo1CqHIZdrHzkMuWqTw1Ash6GK5DDkcu2j7WFoh1+Q3tqf/yL1Cm39C9Jb+1sAQ2GPtcd524OEvcoem2+/5zntV+yP+penZyu39UeuvSyHoYrkMFRQacPUTdWWRHeqhLqupM1hKLfJ6lLt4M/ctHWpvsts2rpUyt/yYKok/qxNW5eq87fZJqtb+7sUDGW1FoZk/jfN87ePzcMDbwVitY/rC4ChL0c5GMKD7HMf2h775tuoX9qX7qqAsBEMhXPmbybGD6BNg6HkGTRt8qzZ8OC/tn73+sjVIezjM7fPNV0WDL29PLZ7K3H2hHZ5t4DC2mQ166/t7XaEb98fvJnq9v7STVtn+aPNWa1NW8XfQ+cvzRZhh3n4i4OatWmr7H7e+0si7Lg/3rS19Xff3HE2pgMT3F8LUKxNVrP+2t5ux3rxmW7Oavlbq1UwdP5t89XjcdhfDPuVyRi9Eesnef3YPIfMkJyjbMIq4z80H+6xUz02Z+0+554+Nj/S9dH9eh+zt5dfNF8Z0PP2l3Z7SQ5DFUneKIkCBLQPj2ehJVEbiLG9iDlvzG8X7AcoODfHDWBksTaCIdZiGFKyoXPIaAJjADZyvPYP/Nwc7/V90sBT6nPNVQxDOvATHACEnl4DALWQctc8vWo44JJWwV8/RTI/h+bQ/WxIDC/L/Enwz/qLSmQL/EUwxCUy8ac28rRgKGR+tL+4DBKXyDToZGAoAEzJny6RaTCRwK38iZ9vXpvPOI9u3NPHzwp4uaRV8NdPadf34YO8Xxh62N82Wg1DDx3MhPY2y/Pp9HXz1fF1gJkARx0MhTnHFlBC+aybr9utjFEYi/5YDkMuUykMITC3/42DLX3Dzfw9KGve0G77xRCBofR3llrJPM5+8Nix9Y30R5mXQ3M62TCUwEzIZqXfFMSQkBkKL/j4uA64NqVzizUVhkLrsf0/0uM5+tNvTof7DPCU+lxTFcFQAJ5Dc3o9NQcBHwUHyJ708NOVrwBHQVzSKvjrJgTYOTy/Ns8BSgheTH+PzfPrcwtmlr9QEsr7i0pkS/xpGOISmfiToKr8xTDUwk7sTwU1LpEhSGt/ETS0MHF4/tg8Bwgz/OkSGfx9fG4eBboKEIJsT5Qd4pLWqD9aH8MQ+9tI62HIABiVGepBqYOhTy9fN189PnfbcAxzAkCpTJuYZJWwWX0AHpln7F7vMOQyJW8irSHQp9AyBHU1NoGFdF5oLfhVozpYsEAg7WuBgH77qbC+cj+vq/DcWICm4biyb5z832PvmvrN4xqZIX1uPIc1B4bsslcJeEp9rqmyymR9FkjBQZIJokzRMIazMba/tlkA69i8/vSpORnwstjf55y/tETWTZzuT8GQVSLrJgY4YBhqAaPzFzI+MbxYJbJuYvM1/ClqgL+PBX9cIusmBn8pvAxq58aZoWxJK+MvWR/NzfpbqV1gqFugnFMAmB9OMQwBULKZIUM6M/T20rycf+qvtcOQy1QEQ1EQJzgwszYSfLmNoWLEr6FhG5L0Ry1jPlDHH1vfpH7KFGXLZDrzI+s6Nuf+h0FT2GGw4X7z3LLHbjUHhsSXw9DltR0McUmr7G/ICkmWBuUqDSoL/IUsSMFf7ltkc/z14MMlMiUThpAVkiwIyl8aVLhEpmTCELIuJX+Zb5Fl4KUXnh2K+gslLdOfsb4IfAr+VmoPGHr9hp7t0WWy6Jmhp/C8EQAqembo7kPz7fc/Koh5a15+gX4ADr4xNmST2meJcu3RmZhyGKpIAwxxQLZgaHizDMaAwbAz4regNuDDP/sRKSgZW99Yf1LqKgOJAE57DufmKAsQ/2Fsus5rw5Bnhq6jzWCIS1qT/D01r+G1AS+z/UmwfWpeQ3Sw/WW/RTbHH2CIS2Tsj2Cozfq0/trgSfDCJTLyxzDUZlWemo8lf7lvkZnwQn0SnIPvTqWSluHPXJ+GoZK/lZoNQ5XLYagiDTCkn1chk6BsZU5MMeyM+KXZsTQkGMAwltnRWtJfAhL09RkhWZ+sRdYU+7k2DLXPDB2amG1KwFPqc03VVBjKPTMEuMiWtEx/9OByZK2P7f1lSmRL/P2g/HGJDP4iGKIHqxN/n5U/o/yRwBA9WJ3xZ5bIlL8UhrpsDYNQDzeZklbijx6sjqz10a4v42+lHIZiOQxVJPkjssVQw69zGhuX75cAH7WHbE2cGUqeGco+88Ma629BIsmEZYGkBbHj8RA9KH08HpNnfUwYivzuB0PICsnx4w/GEvCU+lxTNRWG+rbo22SAi0JJS8/N9SeZnB385UpkYfgMfwF+CiWyMJxhiMWZnEKJLAxnGGJZ/jIlsjCc4UWUB6HRkpbpLxpAmaERfyvlMBTLYagiTYehoS36v5E+YNsZoBQ+LL9xn/4/sWEYgEEfhzM9PJ9hZqQ/KqUdm3Nf+rLVPtuk1tD9RhKxUAJD+jhDVmlDGCKLoab9+rw9ptTnmqv022Txt1+CHeNSGNpzWaJeOX/6G2jtwBheFviLY2rqzyyRLfEnMNT7oxIZIMj0Fw2M4UX5i44LCEr8fRz3Z5XI+hJY6u+Hk/w2knEsAZbXo13SKvgz1wcY6taX+NtIDkOxHIYqkvyBvQ8ZwOBy3bDMzNBMFUtaC7S9v0KJbIGy3yJbqOy3yBYq+y2yhSqWyBZoa38sh6FYDkMVyWHI5dpH62FopKQ1Wzv4K5XIZmukRDZbIyWy2Ropkc3W1iWtrf2lchiK5TBUkRyGXK59tB6GXK7bksNQLIehivR+YMjlel9yGHLVJoehWA5DFSl5qM/Nzc3Nzc1tmjkM1aFwM//v/8/NzW1rk28Q/f3/SNvd3N6rPTw0d3/3z2n7l2oPXzkM1SKHITe3ncxhyK02cxiKzWGoHjkMubntZA5DbrWZw1BsDkP1yGHIzW0ncxhyq80chmJzGKpHDkNubjvZ5jD0N63PP/jzjfzeur//9uX5E9i4WX8OQ4k5DNWjy8DQPzV3f3DX3P0Zt9+I/dmvmrs/+Iu0fZJ15ybXcbGPS5us+b65+7ONPiDdbNsahv7sP7Y+f/2Pad8S29Pf3xv9c6339w/ub4lt7U/MYSg2h6F6lIWhP+4CvAUwv/l5c/fHf5O2Z/srhiGZe/ertH3M5PouPeZq2wmGfvNH5ffFl2YWDMk1CuBM/7f+V/9nOx5f17UA5d9J/8+bu/+i5ok/2U+O/QX7p+buD+GT5u3i7yFt/9OV/u7n+pM17OWPIKD3p9r/9N+s9PevDX+57JP2R/Ny/taaw1BsDkP1yIahv2n/WP+YoaazBHbG+iuHoaVzr2YOQxexCIZ04KdgCRD6479u/w8+QMpdc/c7fX+4BFXwBwuZgZ93mUuGg1v3xyUoHfiv5U9DwA7+opLWHH9ynRl62J+at8YchmJzGKpH4Q+NbzAC/F/9BWU9VEkI9pt/mtAPGBLIQt/Pm7u/0sfluaVsS2nshGOF81J9vykBTeFYAn36XC0QiMaodUhmqB8/Yc0hA6XXkTkem3l8wFDheBjT9+tr3MGyXDfMTe47ZzYkWOo5v2ru/t6Asggu0f/Xzd1dJoOATIvVd23TMBSA5+fN3e/+Iv0/fWRjAD8obwCOdBsyRiV/wTo4+fVfd/eRro3p74+au9/9+Xp/subN/HUlnlF/HZzs6k9BwBJ/AhK//q8d5Gztj2CI/fXzVtpSGJLzkbn6M+Lf/tcJoPZPzd2//Kq5u/uTZcfd2xyG6lF4U/INlkCtISYCHivzQ5b0AyhyMGC8Fh85QCmOHTsWn1MHBOaxurF8LA0GpcxQApPKrDVl19zBB/qS65ux7PEBOvp4Enz1evRrPm9AFPkuZoa64BcgiNYxBkM6sIV1/nX7bzm/e+3vxkzOlz/skQXSwY0zQZwp6scYsGf5EwuAJdfmH7sMDc3d3J9RIiv5C+WpEX9c0prsz1jLbH9SnmJ/KhhbJbIp/v6u5I+zO3P80dycv7W2BIZQ6tPw05f//o/m7u/onkTmMOS6kBIYCgGUAi8H+7FgnPQj86HG6KDHxwxGAAAbHTvlWBTEc0BjjeV15eb28zPlQQuGpq65dExt/fH5w2YEQvh4wfR5dzDEfqfAUDRnZB1j/QGGjHXcim0GQ1yCGvHXZ10k64NylQaBG/In2cHEH5egxvwhiyNZEJSX9vCHYLzAX8jiFPzlSlqT/WnwKfhba7NhqFtLAjMCOd26/6+uXc5VZ49+9w9xqTD8T+sYPF3YHIbqUQJDDD8WfCSwQ5b0Twn2VGYJxtAzZezIsUK5aSIMWWPZf24uTK9XZ9jmwBADGGfGShYdH6WrEcjInjfm3AgMiQGIovO7EZPz5WBkBbcxGOKS1iR/f9K9NmBjtr8umE3xx1m6Vf6MEk/O3732RzC0mb8uaC/1F4L4Xv4UDJX8rbW5MPS//7pdi1US+3dftX+7YZ1/0wEcYOe/NXf/8i/azJdnhlyXUPgQ7m9uF5QT0KBAnsAOWdI/EuzNTETGRscuOBYH2OKxZmSGknlqXXNgKAFAXtMU0wAzAhmj531DMFT0f2WT9XAAsIJb7pkhwEqupGX6A1wYf8PwIaXGLf3lSmRr/Fklraw/yh7s6u+f8yWyVf4yJa1Z/jofJX9rbUsYQqlMYCgLcF4mc11I4Y8INzZkBIxsDD8nw9kjtqR/JNijn59NMm1s7NixukCO+QAN83w6X/zsjB6bDc5stK45MCT/zkIG+8qZBosxyOj6s+ddgKHstcjASvIMkL4XY+vU1gVZ9n9NmwpDaIu+TYbgXShB5fxFxpmXW/dXKEFN9qfhbEt/Eox38FcqaU32B/gZ8bfWtoQhZIZ+9/82d7/pwEj+7TDkuoYiGMoGVcpq5Eo/sKR/JNgH68bo/9Mxg97Y2AnHijItv2pfZ4+Fh4X5OBnf3Kfn6ms7B4YwPreO3H3LHn8KZJTOOwNDZklOzZEPO56D9jDvVzaU5daZnF8HVbdicl4IAAhqer1Ysy6FoT2XJYKN+evHEmzs6U+PW+2PMgQ5f/9W/On3FMHQpv7+eYE/hoC9/HUwlPO3lc2FITmPKc8M6SwRvz8chlyXUPgD4xvsdlvG2SgxASABTbOk5XYTJh/u/H/Dc61UIltim/srlMiWWKmktcR287dRYN7F304lMrG5MCQWPRvUtfE3zABNyTNDUuaU+epB61syh6F65DD0DizJ/KhSoYCSlZ1zu76thqGREtRsu3V/IyWo2fYO/G1a0tran2FLYEgM8KOzXFwS67NI0p/5lpl/m8y1lxyG3oMZZUEHoNu31TDk5nZjthSGajWHoXrkMOTmtpM5DLnVZg5DsQGGkoe73Nzc3Nzc3Oo1h6HBHIbc3Nzc3Ny+QHMYGszLZPUovLn5Bru5ua03L5O51WZeJovNYageOQy5ue1kDkNutZnDUGwOQ/XIYcjNbSdzGHKrzRyGYnMYqkcOQ25uO5nDkFtt5jAUm8NQPXIYcnPbyTaHoa1/5PDW/e3wI4e37m/TH03c2p/DUGJVwtDbqTkIGBxOzRv3NefmGJ6kPzZn7nrnunkYSn592c3tndjWMJTbV2yp7elvi32xtt5ny/2tt7kwFH49+o/mbaURNnf9uTGng7v/jTdznWOdj2Svs1z7iF0Vhs7H+Gt+Jrws0G4wpOe+NadDu+4jOyoefz+ZMBRtZMqbdBYs7G6v5umNR9mn7iuZw5DbezULhn7zR93flPV/69i0VP5GjP20rH3FxJ/s+3QT/ox9yv50pT/eV2zUH7Zz2MMfBUlrX7Gw7cQaf7SvGLaxGPVn7Edm+Vtrl4ChrK2FIZn/H5u7X8s919CTa59g14Kht9OhvfGKJKTtcNoAH3aDkRikrHMQoX2Tc5mhsBZ9c8NO4D9v7v5KtU3Z/4p3fg9ghA1Eu13O4cM6Rs4chtzeq0UwpAN/JliG/5OXTXmtYM4lqNr9cQlKB/5r+aNMwtb+opLWHH9ynRl62J+at8bWwNCf/bq5+8NfdeuVc+r2GdN7j0kW679ogMKu9TL+Xzd3d/cDDGEDWOnDhq/62LpfA1QATAN6/vSD3V6y68DQlOwMxsAOTcwWhX6CofOxHdPCCTI6+thDlifxFYnXza9Flv/LKKy9v7kdtOSyNiG7oyCGX+fGBvjRO6t3e23ljqMtgSHep8vy251HMFpfWIuez/7FZL4AIMbKMYw1i68eACccO8qcZa6bWz2mYUg+8CVw/e4vMv+n38HEr/+6CxYUzLmktYu/P2rufvfn6/1J0NnMX1fiGfXXwcmu/lSQXOJPAv6v/2sHOVv7Ixhif/28lbYWhmRNskErAEj+/Zt/09z98V/Hfyt6zsOv2mNK+eyhgyHdbmWMwlj005rePQyhPJbUlyCGDAAGIGWkX8MQjtVniRhW+DXgyYIZPu4AWv2p4NjZc9tP4TxxYwPAaLgwTAJ6AAC1czqPEdMA1M9B/8hcbREMdfM0vEQZKICSAo1ofgc56JO5CQhhHCAIbRNhKHfsKdfWrS6TD37+v9UQ5IzgFspTv2ru/v4fu4wKBXOrpHVT/owSWclfKE+N+OOS1mR/xlpm+5OAyf5UkLRKZFP8/V3JH2d35vijuTl/a201DBHAaDCSz9z+dTdHzvMP/7zbqV5BjwCUXJf+fy4lq/Tf4+xPP4/W9N5hKFde6tUBjC4zRaWnsf4ehg7tf0uZGwteOv/p8lIYYrDDOtK5+yuCoSSDY1kHCn/AgKONYCeBoQ4U5sKQCRQacEaAhedHMMM+OXM14nusH89MTcmGudVhk2EIWRLJ0qC8pAM3l6Aq8vf3lj8uQY35QxZHsiAoL+3hD0Fygb+QxSn4y5W0JvvT4FPwt9b2gCEGmP/yFzEMAVCymSHjuDozJGv4s/9RUZlsJDNkPnOjAGisvwec3gowxA9xK0uXZ8CQ+VC1lVXaX2HduLGTYAjjCoFdAIafH9oiM2SuT0PICJBwZigpwcF2gCEx/RD5lHN3e98mQYyDkRXcQpbmT7rXBhxwSevi/iTYTvTHJZlV/owST86fBLHeH8HQZv66ILnUX8hS7OVPwVDJ31rbA4b0sz2cGZLz658Z+pO2ZAmA0vPk/KOHtNW8/hti3TF1zA6ltVy7cT5sV4GhHlYy0FDI/ARAGetXZbJzkoWyYWjaw84WDKlS2ak97jRf2yucZ39zLQhg08/TMJgYICSWQIwBDjnbPDOk3vCJL+2T1zfie7R/zL9bdSYBaRSGAAP6fQnrAvofc+bkxvzlSmRr/Fklraw/CmS7+vvnfIlslb9MSWuWv85Hyd9amwtDtdtVYEgBBJenWpDooCP7nM9If/QANQAGzxtlfOXALFJmbJRdyj18vb/C8fXNDc/gGA/+IpPRw0kX/Pl5ninBn+Eom6HhPj4mZ51GgET+nTtOZBlYScBMn+/IsSMzxrrVZ5NgiOdxpqRQgqrSX6EENdmfhrMt/XXZhdL4Jf5KJa3J/gA/I/7WmsNQbNeCIVH/7BBMfxW+WOoa6eev1kcPUTMMhQH0zTTu53Hcp+Zv/nX+6UpgSIx/L0jDhIaY5BtjfD0MeAhGsDUZhsT0t7UYvgzIYCARf9n5dIwEVvSxfzUvM8TXJ3e+bvWYhiEENf0eCO8D+RaNnkdwkCtp3aI/PW61Pyrx5Pz9W/UtpN6fgqFN/UmpZ64//sr3Xv46GMr528ochmK7Jgy5tlX4A+MbfEkzS187WfLs0owHud3c5poEpbX/d5771tdS29xfoUS2xEolrSW2m7+NgGAXfzuVyMQchmJzGKpHV4ehKT/ouJUlWaYum3Op47t9WbYahkZKULPt1v2NlKBm2zvwt2lJa2t/hjkMxeYwVI+uDkMXtQ5+dNrZQchtL1sNQ25uN2YOQ7E5DNWjLwuG3NwuaA5DbrWZw1BsgKHk4S43Nzc3Nzc3ty/E/n/imxgAPyd+qwAAAABJRU5ErkJggg==";

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
