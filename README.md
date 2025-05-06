# Hypersynergism

A QoL mod for the [Synergism](https://synergism.cc/) game.

Mod homepage: https://ahvonenj.github.io/synergism-hypersynergy  
Game's Github: https://github.com/Pseudo-Corp/SynergismOfficial

![image](https://github.com/ahvonenj/synergism-hypersynergy/blob/master/doc/img/logo.gif?raw=true)  

# About the mod

## In general

The goal of this mod is to offer different "Quality of Life" features for the game, so features which:
- Gather, calculate, format and display extra information about the game and it's features
    - Examples: [Corruption reference sheet](https://github.com/ahvonenj/synergism-hypersynergy/wiki/Mod-Features#in-game-corruptions--runs-reference-sheet) and [Hepteract ratios](https://github.com/ahvonenj/synergism-hypersynergy/wiki/Mod-Features#in-game-hepteract-ratios)
- Reduce the amount of excessive clicking without fully automating anything
    - For example, the [promotion code injection](https://github.com/ahvonenj/synergism-hypersynergy/wiki/Mod-Features#promotion-code-injection) feature only displays the codes and copies them into the input box on click, but doesn't do it all automatically
- Allow for adjusting or configuring things in the game
    - For example, the [notification opacity control](https://github.com/ahvonenj/synergism-hypersynergy/wiki/Mod-Features#game-notification-opacity-control) feature changes the opacity of the in-game notifications
- Provide hotkeys or shortcuts for the game's functions
    - Examples: [Hepteract quick expand and max](https://github.com/ahvonenj/synergism-hypersynergy/wiki/Mod-Features#quick-expand--max-for-hepteracts) and [Additional mouse functionality](https://github.com/ahvonenj/synergism-hypersynergy/wiki/Mod-Features#reactive-mouse-hover-and-auto-click)
- Warn, remind or notify the player of some things
    - Example: [Hepteract quick expand and max](https://github.com/ahvonenj/synergism-hypersynergy/wiki/Mod-Features#quick-expand--max-for-hepteracts) feature's "Cost Protection" setting prevents hepteract expansion if the hepteract cost is over a set treshold

In other words, the goal here is to build features which are not too game breaking, automating or streamlining. Even with the mod, players will still need to play the game, but ideally without developing carpal tunnel syndrome or getting fed up about meaningless busywork and clicking around.

## Features

Extensive list of the mod's features can be found in the [Mod Features](https://github.com/ahvonenj/synergism-hypersynergy/wiki/Mod-Features) section of the wiki.

Quick overview:
- Promotion code injection
- Enhanced talisman fragment BUY ALL button 
- Potion buttons
- Quick expand + max for hepteracts
- Hepteract expand cost protection
- Mod panel
- In-game corruptions / runs reference sheet
- In-game hepteract ratios
- Game notification opacity control
- Reactive mouse hover and Auto click
- Reactive mouse hover
- Auto click
- Mod log
- Ambrosia loadout icons
- Ambrosia Loadout Quickbar (with equipped loadout indicator)
- Ambrosia loadout auto switcher when using ADD or TIME codes
- Toggleable patches (such as overflow fix on ambrosia page)

## Latest update(s)

### Hypersynergism version 2.6.2 - Auto Ambrosia Loadout & Bugfixes

<picture>
  <img src="https://github.com/ahvonenj/synergism-hypersynergy/blob/master/doc/img/hd/quickbar_equipped.png?raw=true" width="400" />
</picture>

**Features**

- Implemented ambrosia loadout auto switcher when using ADD or TIME codes
- Ambrosia loadout quickbar now shows the currently equipped loadout
- Fixed multi event binding bug with quickbar
- FIXED REMAINING HEPTERACT COST PROTECTION BUGS ONCE AND FOR ALL (there should be no more random expands anymore when they can't be afforded, like... at all, ever.)
- Made cost protection calculation with 2x cap more accurate
- Made cost protection info log shorter. Was 200 kilometers long.

**Boring features**

- Injected styles are now batched under single style tag
- Added `HSUtils.hiddenAction()` which can be used to perform actions "silently" which would otherwise pop an alert modal
- Added `HSUtils.unfuckNumericString()` which, when used on any string presentation of a number, should make sure that nothing will parse the number in a ridiculous way afterwards
- Added STATE type setting
- Added SELECT type setting

### Hypersynergism version 2.6.1 - The Statistics and Ambrosia Update

<picture>
  <img src="https://github.com/ahvonenj/synergism-hypersynergy/blob/master/doc/img/ambrosia_icons_2.gif?raw=true" width="400" />
</picture>

**Features**

- Compability changes to support the new update
- Added support for new ambrosia icons to be used in loadouts
- Fixed issue with how settings are saved
- Made quick expand and max automatically toggle hepteract confirmation notifications OFF.
- Fixed issue with how settings are saved
- Optimized element watcher(s) in HSHepteracts module. (hepteract quick expand can now be spammed more robustly and faster)
- Hepteracts will now show their "next max hepteract cost" in the UI when hovered
- Quark Hepteract shows the "next max quark cost" instead of hepteract cost
- Added "Patch settings"
- Added toggleable patch to fix overflow issues with the ambrosia page which made the page jump around

# Using the mod

## Create a bookmark

Using the mod is simple. Just create a new bookmark in your browser and name it as you wish. For the URL, copy and paste the following:

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

Alertnatively the same loader code can be found in [here](https://github.com/ahvonenj/synergism-hypersynergy/blob/master/release/loader/loader.js).

**Example:**

![image](https://github.com/ahvonenj/synergism-hypersynergy/blob/master/doc/img/bookmark_v2.png?raw=true)  

## Enable the mod

Now just load up the game in your browser (or refresh the page if it's already running) and click on the bookmark **after** you've clicked away the "Since you were away" box.

The bookmark will always load up the latest version of the mod, so once you're set up on your end, you're set for life!

# For developers

Developer documentation can be found in the wiki: https://github.com/ahvonenj/synergism-hypersynergy/wiki

Quick Reference: https://github.com/ahvonenj/synergism-hypersynergy/wiki/Mod-Framework-Quick-Reference  
Core Module Documentation: https://github.com/ahvonenj/synergism-hypersynergy/wiki/Project-structure-and-Modules#core-modules

In addition to the documentation in the wiki, the source code itself should be relatively well commented.

**Keywords:** synergism, mod, modification, modding, modded, extension, tampermonkey, greasemonkey, chrome, firefox, incremental_games, incremental, idle, idle game, idler, incremental game, synergism wiki, synergism help, synergism tool, wiki, corruption, corruptions, help, ascension, singularity, reincarnation, challenge, userscript

**Keywords 2:** Synergism mod, Synergism game mod, Synergism QoL mod, Hypersynergism, Synergism enhancements, Synergism script, Synergism automation, Synergism bookmarklet, Synergism improvements, Synergism JavaScript mod, Synergism user script, Synergism modifications, Synergism GitHub mod, Synergism UI improvements, Synergism game tweaks, Synergism game features, Synergism gameplay enhancements, idle game mods, incremental game mods, Synergism quality of life, Synergism hepteracts, Synergism corruption sheet, Synergism potion buttons, Synergism promotion codes, Synergism mod panel, Synergism reference sheet, Synergism ratios, Synergism notification opacity, Synergism log viewer, Synergism enhancement mod
