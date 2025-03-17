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
						
						`;
      this.uiReady = false;
    }
    #staticPanelHtml;
    #staticPanelCss;
    #uiPanel;
    #uiPanelCloseBtn;
    #uiPanelOpenBtn;
    #loggerElement;
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
