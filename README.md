# Hypersynergism

[Website](https://ferlieloi.github.io/synergism-hypersynergy/) · [Wiki](https://github.com/Ferlieloi/synergism-hypersynergy/wiki)

A QoL mod for the [Synergism](https://synergism.cc/) game ([game's GitHub](https://github.com/Pseudo-Corp/SynergismOfficial)).

![image](docs/res/logo.gif)

## About the mod

Hypersynergism adds quality-of-life tools, game information, interface options, and configurable automation to Synergism. Most features are optional and configurable; some provide information or shortcuts, while AutoSing can automate progression using player-configured strategies.

### Features

Here are some of Hypersynergism’s standout features:

- **AutoSing:** (S216+) Run singularities with strategies you can edit in the strategy editor ([guide](docs/data/guides/autosing.md); this can be considered as "not strictly QoL". You do you.)
- **Ambrosia Heater:** Find the best Ambrosia loadouts for your save with the built-in optimizer.
- **Ambrosia tools:** Quick-switch loadouts, switch them automatically when using ADD or TIME codes, and track Ambrosia progress and income with minibars.
- **Header:** Place an Automation quickbar, use any game image as a loadout slot icon, align modules in their cells, resize the minibars, remove the gap under the header, and more, all from the game's header editor.
- **Hepteract helpers:** View in-game hepteract ratios, quickly expand and fill hepteracts, and split your hepteracts between them with the Hepteract Distributor, using ratios you set.
- **Golden Quark tools:** Split your Golden Quarks between upgrades with the GQ Distributor, using ratios you set.
- **Game information:** Compute game values from your save in the Tools tab (luck, cube multipliers, Ambrosia speed, ascension score…, with their components), and see the time until a platonic upgrade's next level in its tooltip.
- **Fewer pop-ups:** Tick "Don't show again" on the game dialogs you no longer need to read, and skip the game's offline popup at load.
- **Interface options:** Each tab reopens on the subtab you last used, unused game tabs can be hidden, and notifications can be made more transparent.
- **Saves:** Export the save every X minutes, and back up the save, the mod's settings and the logs in one file, to load later or on another device.

## Using the mod

### Feature guides

See the [complete feature inventory](docs/FEATURES.md) for usage, settings, availability and source references,
including smaller remembered preferences and header customization. The repository also includes a static
[website](docs/index.html) with a browsable player wiki. Native GitHub Wiki pages are prepared from the same
catalogue; [publishing instructions](docs/dev/publishing-guide.md) cover both destinations.

### 🎮 On Steam (Windows only)

Use the Hypersynergism Loader, a small Windows app that patches a copy of the game and launches it with the mod. Its installer is on the [releases page](https://github.com/Ferlieloi/synergism-hypersynergy/releases), under "Hypersynergism Loader". It needs the full [7-Zip](https://www.7-zip.org/) install. More in the [loader's README](synergism_modloader/README.md).

The mod is downloaded at each launch, always in its latest version. The loader updates itself, and tells you when the game has to be patched again.

### 🌐 In a browser: Tampermonkey (recommended)

The mod is loaded by a userscript, which starts it together with the game.

1. **Install [Tampermonkey](https://www.tampermonkey.net/)** for your browser: [Chrome](https://chromewebstore.google.com/detail/dhdgffkkebhmkfjojejmpbldmpobfkfo), [Firefox](https://addons.mozilla.org/firefox/addon/tampermonkey/), [Edge](https://microsoftedge.microsoft.com/addons/detail/iikmkjmpaadaobahmlepeloendndfphd), or [Opera](https://addons.opera.com/extensions/details/tampermonkey-beta/).
2. **Allow userscripts in Chrome-based browsers** (Chrome, Edge, Brave, etc.):
   - Open your browser's **Extensions** page, find **Tampermonkey**, and open **Details** or **Manage extension**.
   - Turn on **Allow User Scripts**. If that option isn't available, follow [Tampermonkey's instructions for enabling Developer mode](https://www.tampermonkey.net/faq.php?q=Q209).
   - Firefox users can skip this step.
3. **[Click here to install the Hypersynergism loader](https://cdn.jsdelivr.net/gh/Ferlieloi/synergism-hypersynergy@master/src/loader/tampermonkey-bridge.user.js).** Tampermonkey should open an installation page. Click **Install**.
4. **Open or reload [Synergism](https://synergism.cc/).** Hypersynergism will load automatically whenever you open the game, always in its latest version. It also works at https://pseudo-corp.github.io/SynergismOfficial/ (no login or cloud saves there).

**If the install link displays code instead:** copy all the code, click the Tampermonkey extension icon → **Create a new script**, replace all the example code with what you copied, and press **Ctrl+S** (or **Cmd+S**) to save. Then reload the game.

While the game is running, a rainbow border around the mod's icon means a newer version is out: reload the page to get it.

#### Live or Dev

The mod comes from one of two GitHub repos: `Ferlieloi` (Live, the default) or `maenhiir` (Dev). To switch to Dev, open the bridge script in Tampermonkey's dashboard, set its `repo` value to `'maenhiir'`, save, and reload the game. Set it to `'Ferlieloi'` to return to Live. Tampermonkey's auto-update of the bridge script can switch you back to Live.

### 🔖 With a bookmark (NOT RECOMMENDED)

The mod can also be loaded with a bookmark, once the game has started. Loaded that way it can't reach the game's internals, so several features are missing, slower, less reliable or even buggy (Auto-Sing among them). The mod then shows a window explaining how to switch to Tampermonkey.

Create a new bookmark in your browser, with any name. As its URL, paste the whole content of [release/loader/loader.js](https://github.com/Ferlieloi/synergism-hypersynergy/blob/master/release/loader/loader.js) (it starts with `javascript:`).

Load/refresh the game in your browser, close the game's "offline" popup, then click the bookmark. It always loads the latest version of the mod.

## Help and bug reports

- Discord: the [HyperSynergism thread](https://discord.com/channels/677271830838640680/1456904896099127367) on the game's Discord server. The link only opens once you have [joined the server](https://www.discord.gg/ameCknq).
- GitHub: the [issues page](https://github.com/Ferlieloi/synergism-hypersynergy/issues).

For a bug, attach a backup file when you can (mod panel, Tools tab, "Backup & Restore"): it holds the mod's logs, your save, as well as the game and mod settings.

## Version history

Browse the [version tags](https://github.com/Ferlieloi/synergism-hypersynergy/tags) to see published mod versions.

## For developers

The mod is written in TypeScript and bundled with esbuild. It needs [Node.js](https://nodejs.org/).

1. `npm install`
2. `npm install -g http-server` (once, for the local server)
3. `start-dev-server.bat`: rebuilds the mod at each change and serves it on `http://127.0.0.1:8080`.
4. In Tampermonkey, turn the regular loader script off and install [src/loader/hypersynergism.dev.js](src/loader/hypersynergism.dev.js), which loads the mod from that local server. Reload the game after each change.

`npm run dev` rebuilds at each change without the server, and `npm run build` builds once. The build doesn't check types: use your editor or `npx tsc --noEmit`.

The Steam loader is a separate package, described in the [loader's README](synergism_modloader/README.md).

## Credits

Hypersynergism was created by [ahvonenj](https://github.com/ahvonenj/synergism-hypersynergy), who no longer works on it. This repository was forked from theirs and is where the mod is now maintained.
