# Hypersynergism

A QoL mod for [Synergism](https://synergism.cc/) game.

# About the mod

## Features

**Promotion code injection**

Adds the codes `:unsmith:` and `:antismith:` right into the promotion code redeem modal. You can click the codes to automatically select them from quick copying and pasting into the code box.

**Talisman fragment BUY ALL button enhanced**

Changes the behavior of the BUY ALL button for talisman fragments like so that when the BUY ALL button is pressed, max fragments are automatically bought in order starting from the blue fragments. In other words, the first click of the BUY ALL button buys BLUE fragments, second click buys PURPLE fragments, ..., after buying RED fragments the next fragments that will be bought are YELLOW fragments and so on.

If the BUY ALL button hasn't been clicked for 3 seconds, the "buy loop" will automatically reset back to blue fragments. This is to ensure that most resources will be spent on blue fragments after e.g. idling for a while.

**Potion buttons**

Adds `BUY 10x` and `CONSUME 10x` buttons for both potions.

**Quick expand + max for hepteracts**

Adds a new click behavior to the hepteract images / icons. When a hepteract image / icon is clicked, the hepteract in question will be automatically expanded and maxed. This can be more or less "spam clicked" to quickly expand and max each hepteract.

## Mod panel

The mods adds a new button to the top right corner of the window, which opens the mod panel when clicked. Currently the panel contains only a "Log" tabs, but more features such as different mod settings and toggles might be added in the future.

# Using the mod

If someone is interested in starting to use the mod right now, currently the only way to do that is by following the "Setting up the mod for development" guide below. I promise it's honestly not that difficult especially if you have Node.js installed already and / or have ever run any Node.js project or used VSCode.

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