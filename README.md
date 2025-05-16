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
- Patch to add visible names for Quark Shop items
- Ambrosia Loadout Idle Swapper
- Game data access via GDS™
- Ambrosia minibars

## Latest update(s)

### Hypersynergism version 2.7.4
Released: 17.5.2025

**WebSocket connections**

Implemented a HSWebSocket module for WebSocket connections. A WebSocket connection is needed for the mod to be able to receive e.g. event data such as when (and how many) HAPPY HOURS are up.

This is to say that the mod can now take HAPPY HOUR event(s) into account with it's calculations. Luck and ambrosia generation speed calculations have been updated accordingly.

Note that this is a bit experimental for now, but worry not, if the WebSocket fails, the mod
will just ignore the event buffs like it has done thus far.

**Changes**

- New feature: Ambrosia minibars
- Heavily optimized campaign token fetching for game data related tasks
- Optimized game data display and debug rendering

### Hypersynergism version 2.7.1-2.7.3 - Pirates and Caching

Released: 14.5.2025

**Caching**

The game itself implements caching for most of it's calculations.
Many of these calculations have been pirated into the mod (v2.7.0) which meant pulling them out of the game's caching system.
The mod now implements it's own caching for all the stolen calculations.

**Fixes and stuff**

- Loadout Idle Swapper should now work with Ambrosia Acceleration
- Loadout Idle Swapper will turn itself off, if one or both of the loadouts for it are unconfigured
- Restructured the project a bit for this new data-driven era
- GDS will be auto disabled on save file import
- Mod now displays a very cool notification when it has loaded and initialized

### Hypersynergism version 2.7.0 - Game Data goes Brrr

Released: 12.5.2025

**Game Data Sniffing (GDS)**

Game Data Sniffing should be fully functional now.
When enabled from the settings, GDS uses some tricky trickery to give the mod access to vast array of game data.
Some of the mod features will only work when GDS is turned on; such settings are marked with an icon.

The mod will not allow features requiring GDS to be enabled if GDS is not enabled first.
Furthermore, the mod will automatically disable GDS temporarily when it detects that the user
is trying to enter a new singularity or leave or exit any singularity challenges.

Everything would work even without this, but I noticed that it can sometimes result in small freezes etc.
if it is left on when going to a singularity, thus the automatic disable and re-enable.

**Other features**

- Added a small "S" icon to settings which require Game Data Sniffing (GDS) to be enabled
- Implemented GDS with turbo mode (forcing the game to save into localstorage at high speeds)
- Implemented Idle Loadout Swapper (GDS) - You can configure two loadouts for it (oct. and luck basically) and the mod will automatically swap between them if you are in the Ambrosia view
- RE'd the exact ambrosia bar value calculations for Idle Loadout Swapper (It's super accurate!)
- Implementeda a toggleable patch to display Quark Shop item names
- Implementeda a notification system (Didn't want to. Had to.)
- Added a warning about GDS auto-disable when player presses singularity button
- Added a new INFO tab to the mod's panel. I'll be writing important info about the mod here.
- The mod now automatically disables all settings which use GDS if GDS is disabled
- The mod now automatically checks if a setting uses GDS and doesn't allow enabling them if GDS is not enabled

**Boring features**

- DeletegateEventListeners now work for all events
- Implemented Image ui component
- Added a couple of debug values (ants, ambrosia bar) to test GDS
- Massively reworked HSGameState module - should be way more generic now (but tbh it's pretty shitty, I went into a rabbit hole with TS... it probably needs another pass of changes)
- HSUtils.hiddenAction is a lot better now
- Finishing touches to HSHepteracts cost protection... still needs some work I think
- Optimized HSAmbrosia event bindings to use delegateEventListener
- Non-serialized setting keys are now defined with a blacklist in HSGlobal
- Disabled save data hashing for now, might not be needed
- Deprecated the crappy slow implementation of GDS
- Added a couple of buttons to Tools tab to test notifications

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
