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

## Latest update

Hypersynergism version 2.5.0 introduces ambrosia loadout icons as it's most notable feature:

<picture>
  <img src="https://github.com/ahvonenj/synergism-hypersynergy/blob/master/doc/img/loadout_icons.gif?raw=true" width="400" />
</picture>

Simply drag any of the ambrosia upgrade icons to any of the loadout slots. Assigned icons persist and will be automatically assigned back when the mod loads!

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

In addition, the source code should be relatively well commented.

**Keywords:** synergism, mod, modification, modding, modded, extension, tampermonkey, greasemonkey, chrome, firefox, incremental_games, incremental, idle, idle game, idler, incremental game, synergism wiki, synergism help, synergism tool, wiki, corruption, corruptions, help, ascension, singularity, reincarnation, challenge, userscript

**Keywords 2:** Synergism mod, Synergism game mod, Synergism QoL mod, Hypersynergism, Synergism enhancements, Synergism script, Synergism automation, Synergism bookmarklet, Synergism improvements, Synergism JavaScript mod, Synergism user script, Synergism modifications, Synergism GitHub mod, Synergism UI improvements, Synergism game tweaks, Synergism game features, Synergism gameplay enhancements, idle game mods, incremental game mods, Synergism quality of life, Synergism hepteracts, Synergism corruption sheet, Synergism potion buttons, Synergism promotion codes, Synergism mod panel, Synergism reference sheet, Synergism ratios, Synergism notification opacity, Synergism log viewer, Synergism enhancement mod
