# Hypersynergism

A QoL mod for the [Synergism](https://synergism.cc/) game.  
Game's Github: https://github.com/Pseudo-Corp/SynergismOfficial

![](https://synergism.cc/Pictures/Default/icon.gif)

**[CLICK TO SKIP TO USAGE INSTRUCTIONS](#using-the-mod)**

# About the mod

## Features

### Promotion code injection

Adds the codes `:unsmith:` and `:antismith:` right into the promotion code redeem modal. You can click the codes to automatically select them from quick copying and pasting into the code box.

![](https://github.com/ahvonenj/synergism-hypersynergy/blob/main/doc/img/codes.png?raw=true)

### Talisman fragment BUY ALL button enhanced

Changes the behavior of the BUY ALL button for talisman fragments like so that when the BUY ALL button is pressed, max fragments are automatically bought in order starting from the blue fragments. In other words, the first click of the BUY ALL button buys BLUE fragments, second click buys PURPLE fragments, ..., after buying RED fragments the next fragments that will be bought are YELLOW fragments and so on.

If the BUY ALL button hasn't been clicked for 3 seconds, the "buy loop" will automatically reset back to blue fragments. This is to ensure that most resources will be spent on blue fragments after e.g. idling for a while.

![](https://github.com/ahvonenj/synergism-hypersynergy/blob/main/doc/img/frags.png?raw=true)

### Potion buttons

Adds `BUY 10x` and `CONSUME 10x` buttons for both potions.

![](https://github.com/ahvonenj/synergism-hypersynergy/blob/main/doc/img/potions.png?raw=true)

### Quick expand + max for hepteracts

Adds a new click behavior to the hepteract images / icons. When a hepteract image / icon is clicked, the hepteract in question will be automatically expanded and maxed. This can be more or less "spam clicked" to quickly expand and max each hepteract.

**![](https://github.com/ahvonenj/synergism-hypersynergy/blob/main/doc/img/hepteracts.png?raw=true)**

### Mod panel

The mod adds a new button to the top right corner of the window, which opens the mod panel when clicked. Currently the panel contains only a "Log" tabs, but more features such as different mod settings and toggles might be added in the future.

![](https://github.com/ahvonenj/synergism-hypersynergy/blob/main/doc/img/panel.png?raw=true)

### In-game corruptions / runs reference sheet

You can open a reference sheet in-game to quickly look up recommended corruption setups for your runs.  
*(Original sheet by Discord user awWhy, Updated with new corruption orders and names by myself)*

![](https://github.com/ahvonenj/synergism-hypersynergy/blob/main/doc/img/ref_sheet.png?raw=true)

### In-game hepteract ratios

Ratios between hepteracts are displayed in-game. 

The ratios are calculated assuming CHR / ACC is 1, so for example:

- CHR/HYP/CHL: 1 / 25.00 / 50.00 - You have 25x (more) CHR relative to HYP and 50x (more) CHR relative to CHL
- ACC/BST/MLT: 1 / 10.00 / 15.00 - You have 10x (more) ACC relative to BST and 15x (more) ACC relative to MLT
- CHR/ACC: 1 / 120.00 - You have 120x (more) CHR relative to ACC

![](https://github.com/ahvonenj/synergism-hypersynergy/blob/main/doc/img/hept_ratios.png?raw=true)

# Using the mod

Using the mod is simple. Just create a new bookmark and name it as you wish. For the URL, copy and paste the following:

```JavaScript
javascript:(function() {
    if(hypersynergism in window) {
        alert('Hypersynergism is already loaded on the page, please refresh if you want to reload the mod');
        return;
    };
    
    const scriptSrc = `https://cdn.jsdelivr.net/gh/ahvonenj/synergism-hypersynergy@latest/release/mod/hypersynergism_release.js?r=${Math.floor(Math.random() * 1000000)}`;
    const script = document.createElement('script');
    script.src = scriptSrc;

    script.onload = function() {
        console.log('[HSMain] Script loaded successfully!');
        window.hypersynergism.init();
    };

    script.onerror = function() {
        console.error('[HSMain] Failed to load the mod!');
    };

    document.head.appendChild(script);
})();
```

Alertnatively the same loader code can be found in [here](https://github.com/ahvonenj/synergism-hypersynergy/blob/main/release/loader/loader.js).

**Example:**

![image](https://github.com/user-attachments/assets/23c63ad6-83e1-4d05-9c6d-8c4494be2692)  
*(The url in the image is for my local build, so pay no mind to that part)*

Now just load up the game (or refresh the page if it's already running) and click on the bookmark **after** you've clicked away the "Since you were away" box.

With the bookmark you will always use the latest version of the mod, so no need to worry about that either.

# Technical stuff

## Modular, expandable and written in TypeScript

The mod is fully written in TypeScript and built to be modular and easily expandable.

## Setting up the mod for development

### Prerequisites

Node.js (and npm) must be installed. Version shouldn't matter too much, just make sure it's not 5 years old.

### Cloning and installing

Clone the repository and run `npm install` in the root folder. The project includes `esbuild` and `typescript` as devDependencies, so you might have to also run `npm install --only=dev` if the devDependencies aren't otherwise installed. In addition you might need to install `typescript` globally by running `npm install typescript -g`.

**http-server**

You will also have to install node http-server globally by running `npm install http-server -g`. The reason for this will be explained later.

### Compiling and bundling

package.json contains two scripts `build` and `dev`. Either one can be used by running `npm run build` or `npm run dev`, but the `dev` script is far more convenient for development as it sets up a watch that watches changes in the code and automatically compiles and bundles everything when changes are detected. The `build` script just compiles and bundles the code once.

### Running the mod

To run the mod in the browser, I have included a `loader.js` in the `src/loader` folder. The current idea is to make a new bookmark and simply paste all of the code in `loader.js` into it.

![](https://github.com/ahvonenj/synergism-hypersynergy/blob/main/doc/img/loader_bookmark.png?raw=true)

**Serving the mod**

If you look at the code inside `loader.js`, you will notice the following line:

```const scriptSrc = `http://127.0.0.1:8080/hypersynergism.js?r=${Math.floor(Math.random() * 1000000)}`;```

So what the loader script / bookmark does is that it fetches a file called `hypersynergism.js` from localhost. `hypersynergism.js` is the compiled and bundled file output by the `build` or the `dev` scripts and contains all of the mod's code. This is the reason for why `http-server` must be installed, as we use that to set up the simplest possible local web server to serve the compiled and bundled code at `http://127.0.0.1:8080/hypersynergism.js`.

**Running the http-server**

So before the bookmark we've created does anything and can actually load the mod, we need to install `http-server` and start it to host the mod's JavaScript file (`hypersynergism.js`). For Windows users there is a `.bat` file called `start-dev-server.bat` in the project's root. This can be run from e.g. Powershell or within VSCode with the command `.\start-dev-server.bat`.

The `start-dev-server.bat` file contains only the line ```http-server ./build/ --mimetypes ./mimes.types --cors``` so if needed, one can just run that command instead.

The `mimes.types` file to which the command refers to is also found in the project root. All it does is that it tells the `http-server` that files with either `js` or `mjs` extension should be served with the `text/javascript` MIME type.

### Done

At this point we should have:

- Cloned the repository
- Installed the (dev)dependencies `eslint` and `typescript`, as well as installed TypeScript globally with `npm install typescript -g` just in case
- Installed `http-server` with `npm i http-server -g`
- Built the project and / or started a watch on the source files with `npm run dev`
- Created a bookmark on the browser with the code from `loader.js` inside it
- Started the `http-server` by using `start-dev-server.bat` or with the command ```http-server ./build/ --mimetypes ./mimes.types --cors``` to serve the mod's code

If everything is looking good, you should now be able to go play the game at https://synergism.cc/ and simply click the bookmark to load and start the mod. You know you have succeeded if a new icon appears on the top right corner of the game (the mod's panel might also show up which can be closed).

# Modules

## HSElementHooker

This module is intended to offer an easy way to basically `await` for `document.querySelector` to guarantee that the queried element is found in DOM. The same class also exposes a method called `watchElement`, which allows one to setup a more permanent (MutationObserver based) watch on an element in the DOM for value changes. The HSHepteracts module uses it to watch for changes in the hepteract meter values to update hepteract ratios whenever the user expands their hepteracts:

```TypeScript
HSElementHooker.watchElement(meter, (value) => {
    if(boxName in self.#boxCounts) {
        (self.#boxCounts as any)[boxName] = value;
        
        if(Object.values(self.#boxCounts).every(v => v > 0)) {
            self.#hyperToChronosRatio = Math.round(self.#boxCounts.chronos / self.#boxCounts.hyperrealism);
            self.#challengeToChronosRatio = Math.round(self.#boxCounts.chronos / self.#boxCounts.challenge);
            self.#boostToAcceleratorRatio = Math.round(self.#boxCounts.accelerator / self.#boxCounts.acceleratorBoost);
            self.#multiplierToAcceleratorRatio = Math.round(self.#boxCounts.accelerator / self.#boxCounts.multiplier);
            self.#acceleratorToChronosRatio = Math.round(self.#boxCounts.chronos / self.#boxCounts.accelerator);

            if(this.#ratioElementA && this.#ratioElementB && this.#ratioElementC) {
                this.#ratioElementA.innerText = `CHR/HYP/CHL: 1 / ${self.#hyperToChronosRatio.toFixed(2)} / ${self.#challengeToChronosRatio.toFixed(2)}`;
                this.#ratioElementB.innerText = `ACC/BST/MLT: 1 / ${self.#boostToAcceleratorRatio.toFixed(2)} / ${self.#multiplierToAcceleratorRatio.toFixed(2)}`;
                this.#ratioElementC.innerText = `CHR/ACC: 1 / ${self.#acceleratorToChronosRatio.toFixed(2)}`;
            }
        }
    } else {
        HSLogger.warn(`Key ${boxName} not found in #boxCounts`, self.context);
    }
}, (value) => {
    if(typeof value === 'string') {
        const split = value.split('/');

        try {
            if(split && split[1]) {
                return parseFloat(split[1]);
            }
        } catch (e) {
            HSLogger.warn(`Parsing failed for ${split}`, self.context);
            return '';
        }
    }
    return '';
});
```

The first callback `watchElement` takes is the callback for when the value changes. Optionally a second callback can be supplied which is a parser function for the element's value. The value is first parsed according to the supplied parser function and the parsed value is then passed to the value change callback.

## HSLogger

This is your basic static class for logging things. It supports `log`, `warn` and `error` and includes a log level setting to suppress certain type of logs. It logs both to the console as well as the console found in the mod's panel.

## Module Manager

This one shouldn't need too much changing (well it doesn't support disabling modules yet). The Module Manager is responsible for enabling different modules within the mod itself. It also keeps track of all the enabled modules and allows for querying the instance of some specific module. I've mostly used it for getting the reference to the HSUI module's instance:

```JavaScript
const hsui = this.#moduleManager.getModule<HSUI>('HSUI');
```

## HSSettings

As of 22.2.2025 I've made an initial implementation for this module with typings. The idea is that this module would keep track of all of the settings of the mod and hopefully support saving and loading them as well in the future.

## HSUI

The HSUI module should probably be called HSPanel these days. It mostly contains code related to the mod's panel, but there are also a couple of methods that could come in handy.

### Modals

The `Modal` method within HSUI can be used to open new modals. This is currently used e.g. to display the corruption reference sheet:

```JavaScript
hsui.Modal({ htmlContent: `<img class="hs-modal-img" src="${corruption_ref_b64}" />`, needsToLoad: true })
```

The method takes an optional option `needsToLoad` which should be set to true if the opened modal needs to spend time loading something such as an image. Here it is true because the corruption reference sheet is displayed as base64 encoded image and we need to wait for the image to load before we can get the true width and height of the modal to properly open the modal at the center of the screen.

### injectStyle and injectHTML methods

HSUI exposes two static methods `injectStyle` and `injectHTML` for arbitrary CSS and HTML injections in to the page. The `ibjectHTML` function takes an optional second argument `injectFunction` if there is a need to control how exactly the html should be added to the page. HSHepteracts module uses this to inject it's hepteract ratio display like so:

```TypeScript
HSUI.injectHTML(this.#ratioElementHtml, (node) => {
    const heptGridParent = self.#heptGrid?.parentNode;
    heptGridParent?.insertBefore(node, self.#heptGrid as Node);
});
```

## UI component system (hs-ui-components [HSUIC] module)

The mod implements a minimal "in house" UI component system (HSUIC). This means that for example, creating all of the contents for the mod's panel's Tab 3 looks like this:

```JavaScript
// BUILD TAB 3
hsui.replaceTabContents(3, 
	HSUIC.Div({ 
	    class: 'hs-panel-setting-block', 
	    html: [
		HSUIC.Div({ class: 'hs-panel-setting-block-text', html: 'Expand cost protection' }),
		HSUIC.Input({ class: 'hs-panel-setting-block-num-input', id: 'hs-setting-expand-cost-protection-value', type: HSInputType.NUMBER }),
		HSUIC.Button({ class: 'hs-panel-setting-block-btn', id: 'hs-setting-expand-cost-protection-btn' }),
	    ]
	})
);
```

Resulting in an HTML output like this:

```html
<div class="hs-panel-div hs-panel-setting-block">
	<div class="hs-panel-div hs-panel-setting-block-text">Expand cost protection</div>
	<input type="number" class="hs-panel-input-number hs-panel-setting-block-num-input" id="hs-setting-expand-cost-protection-value">
	<div class="hs-panel-btn hs-panel-setting-block-btn" id="hs-setting-expand-cost-protection-btn">Button</div>
</div>
```

Pretty if I say so myself :)

The UI component system is relatively straightforward to expand on by just fiddling around with the `hs-core/hs-ui-components.ts` and `types/hs-ui-types.ts`.

# Extra

## Save utils

There's a folder called `save_utils` in the project's root folder. It has very little to do with the mod itself, but I've found it handy from time to time. It contains a two subfolders called `add_quarks` and `orbs_to_powder`.

**NOTE** Using these scripts on your save file is probably considered **cheating**, especially the quarks-script. So don't use them if you want to "be legit". It's a single player game so I don't think anyone really cares, but you could ruin the game for yourself. The reason why these scripts exist is because I've used them for development purposes as it's kind of pain in the ass to e.g. have to wait for a day to get some powder.

If one finds a need for either of these tools, here's how they can be used:

### add_quarks

Sets the quarks to a given amount in a save file.

- Run `npm install` inside the folder
- Export and paste your save file in the folder
- Run `node index.js 1e10` for example to set the amount of quarks to 1e10 in your save file
- The script outputs a new file called `quarks_save_<something>.txt`
- You can import and load this file in the game
- Done

**Note:** In case there are multiple exported save filed in the folder, the script will always use the latest file for convenience.

### orbs_to_powder

Converts all the current orbs to powder at a given ratio in a save file.

- Run `npm install` inside the folder
- Export and paste your save file in the folder
- Run `node index.js <ratio>`, where `<ratio>` is a value you can find by going to Hepteract Forge and hovering our mouse over the powder hepteract. The game will say something like _"Expired Overflux Orbs become powder at a rate of 12.2 Orbs per powder lump!"_. Use this value as the ratio for the script if you don't want to cheat too much.
- The script outputs a new file called `converted_save_<something>.txt`
- You can import and load this file in the game
- Done

**Note:** In case there are multiple exported save filed in the folder, the script will always use the latest file for convenience.
