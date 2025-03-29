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

**Hepteract expand cost protection**

Quick expand comes with cost protection setting which will prevent you from quick expanding your hepteracts if the cost would exceed a configurable limit. It is enabled by default at set to 50% of your current hepteracts.

### Mod panel

The mod adds a new button to the top right corner of the window, which opens the mod panel when clicked. Currently the panel contains only a "Log" tabs, but more features such as different mod settings and toggles might be added in the future.

![](https://github.com/ahvonenj/synergism-hypersynergy/blob/main/doc/img/panel.png)

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

### Game notification opacity control

Adjust the game notification opacity through the mod's panel.

![](https://github.com/ahvonenj/synergism-hypersynergy/blob/main/doc/img/settings.png?raw=true)
![](https://github.com/ahvonenj/synergism-hypersynergy/blob/main/doc/img/opacity_control.png?raw=true)

### Mod log

The mod logs all of the relevant info into a built-in log view, which can be viewed from the mod's panel. All log messages are contextualized, so you'll know which mod's module is saying what. Here for example, the HSHepteracts module is informing about the quick expand cost protection being triggered, which has resulted in cancellation of hepteract quick expand action to prevent expanding a hepteract which can't be afforded to max after expansion.

![](https://github.com/ahvonenj/synergism-hypersynergy/blob/main/doc/img/log.png?raw=true)

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

![image](https://github.com/user-attachments/assets/23c63ad6-83e1-4d05-9c6d-8c4494be2692)  
*(The url in the image is for my local build, so pay no mind to that part)*

Now just load up the game (or refresh the page if it's already running) and click on the bookmark **after** you've clicked away the "Since you were away" box.

With the bookmark you will always use the latest version of the mod, so no need to worry about that either.
