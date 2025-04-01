# Hypersynergism

A QoL mod for the [Synergism](https://synergism.cc/) game.  
Game's Github: https://github.com/Pseudo-Corp/SynergismOfficial

![](https://synergism.cc/Pictures/Default/icon.gif)

**[CLICK TO SKIP TO USAGE INSTRUCTIONS](#using-the-mod)**

# About the mod

## Features

### Promotion code injection

Adds the codes `:unsmith:` and `:antismith:` right into the promotion code redeem modal. You can click the codes to automatically select them from quick copying and pasting into the code box.

![](https://github.com/ahvonenj/synergism-hypersynergy/blob/main/doc/img/codes_sm.png?raw=true)

### Talisman fragment BUY ALL button enhanced

Changes the behavior of the BUY ALL button for talisman fragments like so that when the BUY ALL button is pressed, max fragments are automatically bought in order starting from the blue fragments. In other words, the first click of the BUY ALL button buys BLUE fragments, second click buys PURPLE fragments, ..., after buying RED fragments the next fragments that will be bought are YELLOW fragments and so on.

If the BUY ALL button hasn't been clicked for 3 seconds, the "buy loop" will automatically reset back to blue fragments. This is to ensure that most resources will be spent on blue fragments after e.g. idling for a while.

![](https://github.com/ahvonenj/synergism-hypersynergy/blob/main/doc/img/frags_sm.png?raw=true)

### Potion buttons

Adds `BUY 10x` and `CONSUME 10x` buttons for both potions.

![](https://github.com/ahvonenj/synergism-hypersynergy/blob/main/doc/img/potions_sm.png?raw=true)

### Quick expand + max for hepteracts

Adds a new click behavior to the hepteract images / icons. When a hepteract image / icon is clicked, the hepteract in question will be automatically expanded and maxed. This can be more or less "spam clicked" to quickly expand and max each hepteract.

**![](https://github.com/ahvonenj/synergism-hypersynergy/blob/main/doc/img/hepteracts_sm.png?raw=true)**

**Hepteract expand cost protection**

Quick expand comes with cost protection setting which will prevent you from quick expanding your hepteracts if the cost would exceed a configurable limit. It is enabled by default at set to 50% of your current hepteracts.

### Mod panel

The mod adds a new button to the top right corner of the window, which opens the mod panel when clicked. Currently the panel contains only a "Log" tabs, but more features such as different mod settings and toggles might be added in the future.

![](https://github.com/ahvonenj/synergism-hypersynergy/blob/main/doc/img/panel_sm.png)

### In-game corruptions / runs reference sheet

You can open a reference sheet in-game to quickly look up recommended corruption setups for your runs.  
*(Original sheet by Discord user awWhy, Updated with new corruption orders and names by myself)*

![](https://github.com/ahvonenj/synergism-hypersynergy/blob/main/doc/img/ref_sheet_sm.png?raw=true)

### In-game hepteract ratios

Ratios between hepteracts are displayed in-game. 

The ratios are calculated assuming:

- CHL is 1 relative to CHR and HYP
- MLT is 1 relative to ACC and BST
- ACC is 1 relative to CHR

So for example:

- CHR/HYP/CHL: 25.00 / 50.00 / 1 - You have 25x (more) CHR relative to CHL and 50x (more) HYP relative to CHL
- ACC/BST/MLT: 10.00 / 15.00 / 1 - You have 10x (more) ACC relative to MLT and 15x (more) BST relative to MLT
- CHR/ACC: 120.00 / 1 - You have 120x (more) CHR relative to ACC

![](https://github.com/ahvonenj/synergism-hypersynergy/blob/main/doc/img/ratios_2_sm.png?raw=true)

### Game notification opacity control

Adjust the game notification opacity through the mod's panel.

![](https://github.com/ahvonenj/synergism-hypersynergy/blob/main/doc/img/settings_sm.png?raw=true)
![](https://github.com/ahvonenj/synergism-hypersynergy/blob/main/doc/img/opacity_control_sm.png?raw=true)

### Reactive mouse hover and Auto click

Two toggleable settings to make your mouse more useful.

![](https://github.com/ahvonenj/synergism-hypersynergy/blob/main/doc/img/mouse_stuff.png?raw=true)

**Reactive mouse hover**
- When enabled, mouse will emit hover events at current mouse position when SHIFT is held
- Setting value can be used to control how fast these events are emitted

What it does?

There are various things in the game which display values on mouse over, some examples being:
-  Rune sacrifice fragment costs when you hover your mouse over the sacrifice buttons
-  Talisman shard costs when you hover your mouse over the fragment buy buttons

The problem being that you won't see any changes to these values unless you keep moving your mouse on and off the buttons.
With this setting enabled, the values will get updated when SHIFT is held - this works in any such situation.

**Auto click**
- When enabled, mouse will click automatically at current mouse position when CTRL is held
- Setting value can be used to control the clicking speed

### Mod log

The mod logs all of the relevant info into a built-in log view, which can be viewed from the mod's panel. All log messages are contextualized, so you'll know which mod's module is saying what. Here for example, the HSHepteracts module is informing about the quick expand cost protection being triggered, which has resulted in cancellation of hepteract quick expand action to prevent expanding a hepteract which can't be afforded to max after expansion.

![](https://github.com/ahvonenj/synergism-hypersynergy/blob/main/doc/img/log_sm.png?raw=true)

# Using the mod

Using the mod is simple. Just create a new bookmark and name it as you wish. For the URL, copy and paste the following:

```JavaScript
javascript:(function() {
    if('hypersynergism' in window) {
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

![image](https://github.com/ahvonenj/synergism-hypersynergy/blob/main/doc/img/loader_bookmark.png?raw=true)  
*(The url in the image is for my local build, so pay no mind to that part)*

Now just load up the game (or refresh the page if it's already running) and click on the bookmark **after** you've clicked away the "Since you were away" box.

With the bookmark you will always use the latest version of the mod, so no need to worry about that either.

# For developers

Developer documentation can be found in the wiki: https://github.com/ahvonenj/synergism-hypersynergy/wiki

In addition, the source code should be relatively well commented.

**Keywords:** synergism, mod, modification, modding, modded, extension, tampermonkey, greasemonkey, chrome, firefox, incremental_games, incremental, idle, idle game, idler, incremental game, synergism wiki, synergism help, synergism tool, wiki, corruption, corruptions, help, ascension, singularity, reincarnation, challenge, userscript

**Keywords 2:** Synergism mod, Synergism game mod, Synergism QoL mod, Hypersynergism, Synergism enhancements, Synergism script, Synergism automation, Synergism bookmarklet, Synergism improvements, Synergism JavaScript mod, Synergism user script, Synergism modifications, Synergism GitHub mod, Synergism UI improvements, Synergism game tweaks, Synergism game features, Synergism gameplay enhancements, idle game mods, incremental game mods, Synergism quality of life, Synergism hepteracts, Synergism corruption sheet, Synergism potion buttons, Synergism promotion codes, Synergism mod panel, Synergism reference sheet, Synergism ratios, Synergism notification opacity, Synergism log viewer, Synergism enhancement mod
