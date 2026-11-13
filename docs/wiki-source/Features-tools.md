# Calculations, logs & framework

Information tools expose computed game values and diagnostics; developer-only tools are kept separate from player features.

## On this page

- [Game Data Sniffing and live-game access](#game-data-sniffing-and-live-game-access)
- [Calculation picker with component breakdowns](#calculation-picker-with-component-breakdowns)
- [Color-coded mod log and diagnostics](#color-coded-mod-log-and-diagnostics)
- [Dump settings and game variables](#dump-settings-and-game-variables)
- [Fix Exalt Bug helper](#fix-exalt-bug-helper)
- [Short and long notification previews](#short-and-long-notification-previews)
- [Modular TypeScript framework](#modular-typescript-framework)
- [Development-only live editing and recording](#development-only-live-editing-and-recording)

### Game Data Sniffing and live-game access

Supplies current game state to information and optimization features.

**Where:** Settings → QoL; automatic with patched loaders

- Patched loaders read the live player; legacy loading captures saves. The engine supports the mod's game-aware calculations, caches and dependent controls.
- Calculations are implemented against game formulas, with fetched account/event context where needed.

**Availability and limits**

- The bookmarklet GDS switch and patched live-reader behavior differ. Formula support changes with game updates; not every displayed game statistic is reimplemented.

**Related settings:** [`useGameData`](Settings-Reference#usegamedata)

**Source:** [tools-tab.md](https://github.com/Ferlieloi/synergism-hypersynergy/blob/master/docs/features/tools-tab.md) · [gds.md](https://github.com/Ferlieloi/synergism-hypersynergy/blob/master/docs/features/gds.md) · [dev-tools.md](https://github.com/Ferlieloi/synergism-hypersynergy/blob/master/docs/features/dev-tools.md) · [hs-tools-tab.ts](https://github.com/Ferlieloi/synergism-hypersynergy/blob/master/src/mod/class/hs-core/hs-tools-tab.ts) · [hs-logger.ts](https://github.com/Ferlieloi/synergism-hypersynergy/blob/master/src/mod/class/hs-core/hs-logger.ts)

### Calculation picker with component breakdowns

Computes supported values directly from your current save.

**Where:** Tools → calculation picker → Calc. reduced / Calc. components

- The alphabetized picker covers supported Ambrosia luck and generation, Red/Purple systems, runes, talismans, GQ, shop effects and other registered calculations.
- Cube Bank and Cube Gain: Corruption Lines expose the currently supported cube breakdowns. Options select applicable calculation modes.
- Each run forces a save read, so the tool can be used with background GDS off; component-capable entries can show their factors.

**Availability and limits**

- The old broad Cube Multiplier and Ascension Score tools were removed when their formulas became incomplete; they must not be treated as current features. Entries without components return the reduced result.

**Source:** [tools-tab.md](https://github.com/Ferlieloi/synergism-hypersynergy/blob/master/docs/features/tools-tab.md) · [gds.md](https://github.com/Ferlieloi/synergism-hypersynergy/blob/master/docs/features/gds.md) · [dev-tools.md](https://github.com/Ferlieloi/synergism-hypersynergy/blob/master/docs/features/dev-tools.md) · [hs-tools-tab.ts](https://github.com/Ferlieloi/synergism-hypersynergy/blob/master/src/mod/class/hs-core/hs-tools-tab.ts) · [hs-logger.ts](https://github.com/Ferlieloi/synergism-hypersynergy/blob/master/src/mod/class/hs-core/hs-logger.ts)

### Color-coded mod log and diagnostics

Records initialization, tool actions, run messages, warnings and errors.

**Where:** Log tab; Settings → Auto-Sing → Full log during Auto-Sing

- Each line's time and the debug lines are always recorded; the Timestamps and Debug logs boxes below the log only show or hide them.
- During an Auto-Sing run, only warnings and errors are recorded, for speed, unless Full log during Auto-Sing is on.
- Distributors, Heater runs and answered/refused actions write useful context. Backups include the accumulated logs for troubleshooting.
- COPY LOG copies the whole log, hidden lines included; CLEAR LOG clears it.

**Related settings:** [`logTimestamp`](Settings-Reference#logtimestamp), [`showDebugLogs`](Settings-Reference#showdebuglogs), [`autosingFullLog`](Settings-Reference#autosingfulllog)

**Source:** [tools-tab.md](https://github.com/Ferlieloi/synergism-hypersynergy/blob/master/docs/features/tools-tab.md) · [gds.md](https://github.com/Ferlieloi/synergism-hypersynergy/blob/master/docs/features/gds.md) · [dev-tools.md](https://github.com/Ferlieloi/synergism-hypersynergy/blob/master/docs/features/dev-tools.md) · [hs-tools-tab.ts](https://github.com/Ferlieloi/synergism-hypersynergy/blob/master/src/mod/class/hs-core/hs-tools-tab.ts) · [hs-logger.ts](https://github.com/Ferlieloi/synergism-hypersynergy/blob/master/src/mod/class/hs-core/hs-logger.ts)

### Dump settings and game variables

Prints diagnostic snapshots to the browser or game developer console.

**Where:** Tools → Dump Settings / Dump Game vars

- Dump Settings shows the mod settings. Dump Game vars prints current game, PseudoCoin, campaign, account and event data available to the mod.
- These actions help diagnose calculations; they do not import or modify the save.

**Availability and limits**

- Console output may contain save/account context; review it before sharing.

**Source:** [tools-tab.md](https://github.com/Ferlieloi/synergism-hypersynergy/blob/master/docs/features/tools-tab.md) · [gds.md](https://github.com/Ferlieloi/synergism-hypersynergy/blob/master/docs/features/gds.md) · [dev-tools.md](https://github.com/Ferlieloi/synergism-hypersynergy/blob/master/docs/features/dev-tools.md) · [hs-tools-tab.ts](https://github.com/Ferlieloi/synergism-hypersynergy/blob/master/src/mod/class/hs-core/hs-tools-tab.ts) · [hs-logger.ts](https://github.com/Ferlieloi/synergism-hypersynergy/blob/master/src/mod/class/hs-core/hs-logger.ts)

### Fix Exalt Bug helper

Attempts the recovery path for an inconsistent active-Exalt display.

**Where:** Tools → Fix Exalt Bug

- With an Exalt active, clicks its icon as the Exalts tab does. When the game still thinks you are in an Exalt with none active, clears that state. Each outcome shows a notification; the fix needs the Tampermonkey loader.

**Availability and limits**

- A targeted recovery tool, not a general-purpose save repair or guaranteed fix for every Exalt problem.

**Source:** [tools-tab.md](https://github.com/Ferlieloi/synergism-hypersynergy/blob/master/docs/features/tools-tab.md) · [gds.md](https://github.com/Ferlieloi/synergism-hypersynergy/blob/master/docs/features/gds.md) · [dev-tools.md](https://github.com/Ferlieloi/synergism-hypersynergy/blob/master/docs/features/dev-tools.md) · [hs-tools-tab.ts](https://github.com/Ferlieloi/synergism-hypersynergy/blob/master/src/mod/class/hs-core/hs-tools-tab.ts) · [hs-logger.ts](https://github.com/Ferlieloi/synergism-hypersynergy/blob/master/src/mod/class/hs-core/hs-logger.ts)

### Short and long notification previews

Previews the mod notification system.

**Where:** Tools → Notify test / Notify test 2

- Repeated presses cycle through supported positions and message types; the second button uses a long message.

**Source:** [tools-tab.md](https://github.com/Ferlieloi/synergism-hypersynergy/blob/master/docs/features/tools-tab.md) · [gds.md](https://github.com/Ferlieloi/synergism-hypersynergy/blob/master/docs/features/gds.md) · [dev-tools.md](https://github.com/Ferlieloi/synergism-hypersynergy/blob/master/docs/features/dev-tools.md) · [hs-tools-tab.ts](https://github.com/Ferlieloi/synergism-hypersynergy/blob/master/src/mod/class/hs-core/hs-tools-tab.ts) · [hs-logger.ts](https://github.com/Ferlieloi/synergism-hypersynergy/blob/master/src/mod/class/hs-core/hs-logger.ts)

### Modular TypeScript framework

Organizes modules, settings, UI, storage, game hooks and calculations.

**Where:** Repository → src/mod; existing developer docs

- Modules initialize in a defined order; registered settings drive their actions. Shared services handle UI, logging, local storage and game-state tracking.
- The patcher exposes only the required game internals; missing patches are reported and supported paths fall back when possible.
- Source includes a development loader, node tests, game harnesses and build/release tooling.

**Availability and limits**

- This is developer infrastructure, not an extra player-facing automation feature.

**Source:** [tools-tab.md](https://github.com/Ferlieloi/synergism-hypersynergy/blob/master/docs/features/tools-tab.md) · [gds.md](https://github.com/Ferlieloi/synergism-hypersynergy/blob/master/docs/features/gds.md) · [dev-tools.md](https://github.com/Ferlieloi/synergism-hypersynergy/blob/master/docs/features/dev-tools.md) · [hs-tools-tab.ts](https://github.com/Ferlieloi/synergism-hypersynergy/blob/master/src/mod/class/hs-core/hs-tools-tab.ts) · [hs-logger.ts](https://github.com/Ferlieloi/synergism-hypersynergy/blob/master/src/mod/class/hs-core/hs-logger.ts)

### Development-only live editing and recording

Provides live-save inspection/editing and AutoSing recording for maintainers.

**Where:** Development build only; developer Debug tools

- Development tools and the recorder are gated out of the player release bundle.
- The live editor and development recorder are excluded from release builds. Advanced Data Collection is a separate hidden diagnostic preference, documented with AutoSing's statistics.

**Availability and limits**

- Not available in production releases. Editing live game values is for development and testing.

**Source:** [tools-tab.md](https://github.com/Ferlieloi/synergism-hypersynergy/blob/master/docs/features/tools-tab.md) · [gds.md](https://github.com/Ferlieloi/synergism-hypersynergy/blob/master/docs/features/gds.md) · [dev-tools.md](https://github.com/Ferlieloi/synergism-hypersynergy/blob/master/docs/features/dev-tools.md) · [hs-tools-tab.ts](https://github.com/Ferlieloi/synergism-hypersynergy/blob/master/src/mod/class/hs-core/hs-tools-tab.ts) · [hs-logger.ts](https://github.com/Ferlieloi/synergism-hypersynergy/blob/master/src/mod/class/hs-core/hs-logger.ts)
