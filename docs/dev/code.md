# Code structure

How the mod's code is put together, beyond the summary in `AGENTS.md`.

## Entry and modules

- `src/mod/index.ts` lists `enabledModules`, with `loadOrder` and `initImmediate`, and creates `Hypersynergism`
  (`class/hypersynergism.ts`). That class waits for the game DOM, initializes the modules, builds the mod panel tabs
  and syncs the settings UI.
- Every feature is an `HSModule` subclass (`hs-core/module/hs-module.ts`) with an `async init()`. A new module needs
  entries in two places: `enabledModules` in `index.ts` and the `#moduleClasses` map in
  `hs-core/module/hs-module-manager.ts`.
- Modules reach each other through `HSModuleManager.getModule<T>('ClassName')`. Many core classes (`HSSettings`,
  `HSUI.Notify`, `HSLogger`, `HSGlobal`) are used statically. `HSGlobal` (`hs-core/hs-global.ts`) holds global
  constants and config. `HSUIC` builds UI component HTML. `HSElementHooker` waits for game DOM elements to appear.
- Imports prefixed with `inline:` are inlined as strings by `esbuild-plugin-inline-import` (CSS, HTML, JSON and base64
  `.txt` files from `src/mod/resource/`).

## Logging

- `HSLogger` writes to the mod panel's Log tab, and takes a context string. A line is rendered as HTML and also printed
  to the console: escape it with `escapeLogText` (`&` and `<` only), not `escapeHtml`.
- `HSLogger.debug` prints nothing, console included, until the settings load has read the debug setting.
- A context's colour in the Log tab: a module's `moduleColor`, else its entry in `HSGlobal.HSLogger.contextColors` (a
  module's name, to share that module's colour, or a CSS colour), else white. A new class that logs under its own
  context needs an entry there.

## Injected CSS lands late

`HSUI.injectStyle` writes the style block in the next task, and the mod's general CSS (`hs-quickbars.css`, overrides)
is injected only after every module's `init`. A module that draws game-styled elements during its `init` injects its
own CSS and calls `HSUI.flushInjectedStyles()` before drawing (`HSHeaderLoadoutIcons`: an unstyled `img` stretched to
the page's height for a moment at each load).

## Settings

- Declared in data: each setting is defined in `src/mod/resource/json/hs-settings.json` (type, default, UI control).
  Pages and groups are in `hs-settings-control-pages.json` and `hs-settings-control-groups.json`. The key must also be
  added to `HSSettingsDefinition` in `src/mod/types/module-types/hs-settings-types.ts`.
- A setting with a `settingAction` needs a handler in `hs-core/settings/hs-setting-action.ts`. The handler can't tell
  the player's toggle from the page load or an `enable()`/`disable()` by autosing or GDS.
- **It also needs a `settingControl`, even when hidden**: a hidden setting's control is never built, but without one
  the action never runs at page load (`syncSettings` runs `initialAction` only for settings with a control).
- Settings persist to localStorage through `HSStorage`. The saved copy overrides the JSON for every key both have, so
  keys that only the JSON should decide (`platforms`, `hidden`, texts, controls) are in `serializationBlackList` and
  never saved.
- `"platforms": ["steam" | "userscript" | "bookmarklet"]` shows a setting in the panel only for players who loaded the
  mod that way (`HSPlatform.get()`, `hs-core/hs-platform.ts`). The setting still exists and works everywhere.
- A help text is also the `title` of the setting's buttons (`#buildSettingBlock`), put in an HTML attribute unescaped
  (`HSUIC.#getPropString`): no double quote in a help text.

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
