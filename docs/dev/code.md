# Code structure

How the mod's code is put together, beyond the summary in `AGENTS.md`.

The **Mod checks** pull request workflow installs the locked dependencies on Windows with Node 22, then runs
`npx tsc --noEmit`, `npm test` and `npm run build`. The tests include the generated loader file check and the
header layout check in Chromium.

## Entry and modules

- `hs-core/module/hs-module-definitions.ts` lists each enabled module's constructor, name, context, colour, `loadOrder` and `initImmediate`. `src/mod/index.ts` passes that list to `Hypersynergism`
  (`class/hypersynergism.ts`). That class waits for the game DOM, initializes the modules, assembles the mod panel tabs
  (Tools tab: `HSToolsTab`, `hs-core/hs-tools-tab.ts`; Settings tab: `HSSettingsUI.buildTab`) and syncs the settings
  UI.
- Every feature is an `HSModule` subclass (`hs-core/module/hs-module.ts`) with an `async init()`. Register a new module once in `HS_MODULE_DEFINITIONS`; the module-name and instance types derive from that list. `HSModuleManager` constructs modules and preserves startup order. `HSModuleRegistry` stores instances with no runtime imports of feature classes.
- Modules reach each other through `HSModuleRegistry.getModule('ClassName')`; the name determines the return type. Unknown names and independently supplied instance types are rejected by TypeScript. Log contexts use `getModuleColor(string)` for a colour only. Many core classes (`HSSettings`,
  `HSUI.Notify`, `HSLogger`, `HSGlobal`) are used statically. `HSGlobal` (`hs-core/hs-global.ts`) holds global
  constants and config. `HSUIC` builds UI component HTML. `HSElementHooker` waits for game DOM elements to appear.
- The tab and subtab on screen: `HSGameState`. `subscribeSubtab(viewKey, subView, cb)` calls back when a subtab comes on
  screen (its tab shown, on that subtab) and when it leaves; `subscribeGameStateChange(viewKey, cb)` on any change of
  one tab's subtab, or of the main tab; `getCurrentMainViewFromDOM()` where the observed state may lag (tab changes in
  bursts, as around a singularity). Tab and subtab ids: `types/module-types/hs-gamestate-types.ts`.
- Imports prefixed with `inline:` are inlined as strings by `esbuild-plugin-inline-import` (CSS, HTML, JSON and base64
  `.txt` files from `src/mod/resource/`).

`HSElementHooker.HookElement<T>` returns `T | null` on timeout; `HookElements` returns an actual array (empty on timeout, without partial results). Both log the missing selectors. Optional features check for absence before installing handlers; required mod-panel elements use `RequireElement<T>`, which throws with the selector. No proxy stands in for a missing element. `HSElementHooker.watchElement` calls back on each change of the element's parsed value, with no throttle (a dropped change leaves a stale value), and returns a stop function.

## Build

- Every build regenerates the strategy manifest (`scripts/generate-strategy-manifest.js`) and bundles the heater web
  worker separately (`scripts/heater-worker-plugin.cjs`).
- `HS_BUILD_VERSION` is an esbuild `define` read from `package.json`: restart `npm run dev` after changing the version.
- The release build (`release/mod/hypersynergism_release.js`) is the only one without the dev tools
  (`docs/features/dev-tools.md`).

## Logging

- `HSLogger` writes to the mod panel's Log tab, and takes a context string. A line is rendered as HTML and also printed
  to the console: escape it with `escapeLogText` (`&` and `<` only), not `escapeHtml`. Both helpers live in `hs-utils/hs-escape.ts`.
- `HSLogger.debug` takes a function, called only when debug lines are recorded; around costly text, also check
  `HSLogger.isDebugRecorded`. `warnOnce` / `errorOnce(msg, context, id)`: once per id, again if it comes back 15 minutes
  later.
- A context's colour in the Log tab: a module's `moduleColor`, else its entry in `HSGlobal.HSLogger.contextColors` (a
  module's name, to share that module's colour, or a CSS colour), else white. A new class that logs under its own
  context needs an entry there.
- How the Log tab records, caps, draws and copies lines: `docs/features/log.md`.

## Injected CSS lands late

`HSUIC` puts each component's `styles` directly on its element, so temporary windows and controls leave no generated rules behind. Shared feature CSS uses `HSUI.injectStyle`. Close modals through `HSUI.CloseModal`, which releases the manager registration and active drag/resize listeners. A modal can pass an `onClose` callback to clean up its own state using the removed element.

`HSUI.injectStyle` writes the style block in the next task, and the mod's general CSS (`hs-quickbars.css`, overrides)
is injected only after every module's `init`. A module that draws game-styled elements during its `init` injects its
own CSS and calls `HSUI.flushInjectedStyles()` before drawing (`HSHeaderLoadoutIcons`: an unstyled `img` stretched to
the page's height for a moment at each load).

## No `:has()` on a wide ancestor
A `:has()` with a descendant argument on `html`, `body` or another ancestor of the game's tabs is re-checked at every
DOM change below it, and the game rewrites its texts many times a second: `html:has(#mainHeader.headerEditMode) …`
doubled the time of the game's display updates. Use a class the mod sets, or a sibling combinator. A `:has()` scoped to
the mod's own small elements (a settings block, a table cell) is fine.

## Settings

- Declared in data: each setting is defined in `src/mod/resource/json/hs-settings.json` (type, default, UI control).
  Pages and groups are in `hs-settings-control-pages.json` and `hs-settings-control-groups.json`. The key must also be
  added to `HSSettingsDefinition` in `src/mod/types/module-types/hs-settings-types.ts`.
- A setting with a `settingAction` needs a handler in `hs-core/settings/hs-setting-action.ts`. The handler can't tell
  the player's toggle from the page load or an `enable()`/`disable()` by autosing or GDS.
- `setValue` stores a value without running the action: a numeric value is clamped to its control's min/max and the
  value passed to actions (`calculatedSettingValue`, with the multiplier) follows. `enable()`/`disable()` run it.
- `settingControl` is only needed for a control. `initializeSettingActions` runs each setting's initial action after its optional control preparation, preserving definition order; `skipInit` still prevents actions such as opening an editor at load.
- Settings persist through `HSStorage` in the existing JSON-string envelope, with only `enabled` and `settingValue` per key. Older full definitions and object-valued storage are read too, but only those player-owned fields are restored. Configuration and derived values come from the current definition and constructors; invalid values keep the current default. The pure helpers are in `hs-core/settings/hs-settings-state.ts`.
- `"platforms": ["steam" | "userscript" | "bookmarklet"]` shows a setting in the panel only for players who loaded the
  mod that way (`HSPlatform.get()`, `hs-core/hs-platform.ts`). The setting still exists and works everywhere.
- A help text is also the `title` of the setting's buttons (`#buildSettingBlock`), put in an HTML attribute unescaped
  (`HSUIC.#getPropString`): no double quote in a help text.
- `scripts/tests/test-settings-data.cjs` checks the data: handlers, a control with each action, pages, unique ids, help
  texts.

## Notifications

- `HSUI.Notify(text, options?)`: a top-centre column, and a bottom-left one for what answers a player's action in the
  game (`position: 'bottomLeft'`, hidden Alerts, below the game's own notifications and as wide). Any other `position`
  goes top-centre.
- 3 at most per column: a new one drops the oldest non-error first, and the same text replaces its earlier copy. Height
  follows the text. Hover pauses the timer, a click dismisses.
- It stays the longest of 5 s, 60 ms per character and `displayDuration`, then fades: to make one last longer, set
  `displayDuration`.
- Its promise resolves when it is gone, which a hover can delay: code never waits on it.

## Tooltips

- A browser `title` is the default. `HSTooltip` (`hs-core/hs-tooltip.ts`) is for what a `title` can't do: colours, a
  shorter delay, a chosen side. `HSTooltip.set(element, text or options)`, or `HSTooltip.attrs(text)` in an HTML string.
- `text` and `title` are never read as HTML; with `html`, the caller escapes. Colours in `html`: the classes `hs-tip-key`,
  `hs-tip-dim`, `hs-tip-warn`. Default: 150 ms, below, about 420 px at most; don't put line breaks in a text to shape it,
  it wraps by itself. Content made of lines (a list) takes `wrap: false`, not a width.
- The mouse passes through a tooltip. A window with pins or scrolling keeps its own code and uses `HSTooltip.place()`.

## Class headers and authors

- Each class has a header doc comment (`Class / IsExplicitHSModule / Description / Author`); private fields use `#`
  names. File names follow `hs-<name>.ts`, class names the `HS` prefix.
- `Author:` names: Shewchou (git `maenhiir`), XxMolkxX (= Ferlieloi, git `XxmolkxX`), Swiffy (git `Jonah`). Several
  authors go on one line, comma-separated, original author first, no "Editor" line; when XxMolkxX and Shewchou are
  both authors, XxMolkxX goes first. A name is added when that person wrote a real part of the class (about 25% of
  blamed lines, moves followed, rename-only commits ignored), never for a move or a split.
