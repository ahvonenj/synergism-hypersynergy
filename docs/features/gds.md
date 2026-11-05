# GDS (Game Data Sniffing): `hs-core/gds/`

## Sources: live player or save capture
- **Two sources, no adapter between them.** `HSGameData` reads the live player (`exposedPlayer`) when the patcher exposes it, else captures the save by hooking `btoa`/`atob` and the patched export functions (an "MITM" approach: bookmarklet, failed patch); a dev-only Debug tab switch forces the save. Reads stay shape-neutral (`GameDecimal` / `GameCount` and their helpers).
- **The live player is one object for the whole session**: caches can't be keyed by its identity (`clearCache()` bumps a generation the helpers follow). Its `talismans` are a copy refreshed at each game save (the fragments come from `window.__HS_talismans`, `getTalismanFragments`).
- **Talisman levels**: the live player's are the game's own (`window.__HS_talismans[t].level`). Elsewhere (no patch, a save) they are replayed from the fragments, tens of ms for all talismans, so the result outlives `clearCache()`, kept until the talisman's fragments or cap change.
- **GDS reads every 500 ms** (`gdsSpeedMs`): the live player, or a save it takes. Nothing needs it faster: the Ambrosia tab's rates refresh at that pace.
- `HSGameData` also manages "me", pseudo, campaign and event data (bells and the global event come from the game itself: "Requests to synergism.cc").
- The "[HS] Perma-saved by GDS" CSS is applied only on the save source (the live source clicks no Save).

## Sustained Ambrosia income

`hs-ambrosia-bar-income.ts` is shared by the Ambrosia page, its header rates and Heater's income objectives.
It estimates the long-run average with stats, upgrades, loadout and routing held fixed. Initial partial bars and
saved tank contents are transient stock, not a permanent income bonus or a candidate-loadout penalty. A sustained
regime can have full tanks, empty tanks, or a repeating fill/drain cycle.

Without overcap, the calculator solves the supply and reward feedback equations. With overcap and both inputs
routed, `hs-ambrosia-reactor-income.ts` preserves the game's reaction stages: route both inputs, normal reaction,
overflow against remaining opposite stock, extraction, zero-time rebates, regular fills, then zero-time fusion.
Unmatched excess returns to the regular bars. Empty ticks and ordinary two-tick tank cycles are batched; bounded
feedback sampling and resource conservation estimate sustained fills without simulating every elapsed second.
The warm-up drift check allows observed Red-Blue Ultrafusion bursts in both tanks: blue overflow can consume
the opposite red tank. Extraction-rebate tolerance remains per extraction, rather than per extraction batch.
RNG rewards use their expected value. These are fixed-stat sustained estimates, not an exact next-hour forecast
with changing lifetime stats or random rewards. Tests use the upstream reactor fixture, including rare rebate
bursts, fusion, Two Mind and Bar Dependence.

## One type for the player's data (`hs-player-savedata.ts`)
- `GameData` (deeply read-only) is what `getGameData()` returns, on both sources; `PlayerData` (`exposedPlayer`) is the same fields, writable. Fields shaped differently on the two sources are `GameDecimal` / `GameCount`. Other save-data types live in `src/mod/types/data-types/`.
- Vanilla fields no feature reads are left out; their list is dated in a comment above `GameDataFields`.
- After a game update that touches the player: run `node scripts/harness/gds-player-keys.cjs` (keys vs vanilla's `Player`), refresh that comment, then check the runtime shapes on the live game.

## API and calculations
- **`HSGameDataAPI` extends `HSGameDataAPIPartial`.** The naming is intentionally inverted: the *Partial* class is the actual API, and `HSGameDataAPI` holds the game-formula calculations.
- **Helpers**: more calculations are split into the `hs-gamedata-api-*.ts` helpers, registered through `registerCalculationHelper`. Each helper takes the typed `HSGameDataAPI` (`import type`) and reads the data and the other helpers through it (`this.#api.quarkShop…`), only after the constructor: no hand-built contexts. Data constants live in `hs-gamedata-tables.ts`.
  - The quark shop keeps a small internal env (the API plus the 3 functions its free-levels-only and non-ambrosia modes replace): rewriting it to pass a mode was judged riskier than it was worth.
  - `getLevelMilestone` and `calculateSynergismLevel` stay on the API (moving the milestone would make effects `(level, data) => number`).
  - Not done: singularity / cube / event helpers (more wiring for little gain), a `gds/api/` subfolder.
- **Caching**: results are memoized through the API's `memoizeCalculation` (`hs-gamedata-api-cache.ts`). A calculation with components (`reduce_vals = false`) caches only its total: the components are always recalculated.
- **These calculations re-implement vanilla formulas**: check them against the vanilla source (`node scripts/tools/update-game.cjs` clones it into `local/game/`). `scripts/tests/test-gds-formulas.cjs` replays the real game's values on 54 states of one save: luck, speeds, salvage, ascension speed, cube bank, rune lines, achievement points (how to refresh it: `docs/game/updating.md`). A change meant to move no number is checked as in `docs/dev/tricks.md`, "Same numbers before and after".
- **`cachedBy` lists protect against stale values only on the live source**: every data update clears the calculation cache (`_updateGameData`), so on the save source a dependency missing from a list changes nothing between updates, and no test can catch one. The live player changes between two reads: a listed dependency refreshes the value, a missing one leaves it up to 500 ms old.
- **A shop upgrade's level goes through `getShopLevel`** (`hs-gamedata-api-quarkShop.ts`), never `data.shopUpgrades.x` in a calculation: as in the game, it is 0 inside No Quark Upgrades (non-Utility upgrades) and while the Exalt reward that unlocks it isn't reached (`SHOP_UPGRADE_EXALT_UNLOCKS`, 16 upgrades), even when bought. The other unlock conditions (shop passes, early game) are left out: every player past singularity 1 meets them. The heater worker's own shop model (raw levels and `shopUpgradesDisabled`) only covers shop-pass upgrades, which no Exalt locks; the Exalt-gated ones reach it already computed by GDS (luck, vouchers, `panthemaLevel`).
- **The heater export** is built by `buildHeaterExport` (`hs-heater-export.ts`), from the API and the protected data `dumpDataForHeater` hands it; the method itself only forces a save and reports errors.

## Tools tab calculations
Calculations flagged in `hs-calculation-definition.ts` (`toolingSupport`) appear in the panel's Tools tab (`HSCalculationTools`, `hs-core/hs-calculation-tools.ts`), run on a save forced at the click.
- Their `fnName` is looked up on `HSGameDataAPI` first, then on the helpers (`getCalculationFunction`): a method of the same name on `HSGameDataAPI` hides the helper's.
- Each param in `fnParams` (in the function's order) gets a control: a select of its `options` (a list, or a function of the save, called again on the save taken at the click), true / false for a boolean, a number field for a number; any other param needs `options` (a dev build warns at load).
- With `supportsReduce`, the first param is `reduce_vals`, filled by the two buttons. With `reduce_vals = false`, a function returns its components by name (`HSCalculationComponents`, the game's stat line name from Settings → Stats for nerds when it has one), written in the function next to each value; the mod's own code always asks for the total.

## The GDS setting and the engine
- **The GDS setting exists for bookmarklet players only** (`"platforms": ["bookmarklet"]`), where it controls the Save-clicking engine. Every other player (Steam, userscript) has no setting: the engine always runs, even if they saved the setting OFF before, and even when their player patch failed (save capture always on). `HSGameData.isGDSWanted()` says whether the engine should run (true off bookmarklet, else the setting); the setting's action and `resumeGDS` go through it.
- **The setting and the engine are separate.** Code that needs to stop GDS for a while calls `HSGameData.pauseGDS(reason)` / `resumeGDS(reason)` and leaves the setting alone, so a reload can't leave the setting saved as OFF. The engine runs only when it is wanted (`isGDSWanted()`) and no pause is held. To know whether cached data (`getGameData()`) is current, check `isGDSRunning()`, not the setting.
- **Only autosing pauses** (speed). Save loads don't: the game loads a save with no timer in between and refuses to save while the offline popup is up (`G.timeWarp`), the live source writes nothing, and the backup restore blocks storage writes until the reload.
- **Nothing in the mod turns the GDS setting off**; only the (bookmarklet) player does.
- **Settings that use GDS**: turning GDS off turns off the settings flagged `usesGameData` for the player's platform: only `ambrosiaMinibars`, for bookmarklet players (`ambrosiaRateHeader` isn't flagged: it only exists with the patched header). The flag is `true` or a list of platforms; read it through `HSSettings.usesGameData()`.
  - Turning GDS back on turns back on the ones it turned off (remembered in memory by the GDS setting, forgotten at a reload). The reverse doesn't happen: turning those settings off leaves GDS on.
  - For bookmarklet players, turning `ambrosiaMinibars` on turns GDS on; everyone else's minibars read the live player (`docs/features/header-modules.md`).
- **GDS's save clicks are not the player's**: the quickbar icon picker (`HSQuickbarIconPickerController`) only reacts to trusted clicks (`event.isTrusted`), so GDS's and other mod clicks don't end a pick.

## Requests to synergism.cc
- **The mod sends nothing to synergism.cc after load.** The game's dev asked for less traffic: no periodic fetch, none at a GDS start. PseudoCoin levels and quark bonus are read once, at load: a failed read waits for the next reload (no retry, not even at a heater export). The only other request: game translation files, for players without the patch, once per language (a plain fetch: `force-cache` was judged not worth it).
- **Every request to synergism.cc carries `X-HyperSynergism-Version`** (`HSGlobal.Common.modRequestHeaders`), asked by the game's dev (PR #38 on Live).
- **PseudoCoin levels: no request of the mod's own.** The game fetches `stripe/upgrades` once at load and keeps its copy (`PCoinUpgrades`) up to date at an in-game purchase; the game's formulas use that copy, so the mod follows it.
  - Patched game (`pcoinLevels` patch): `getPCoinUpgradeLevel` reads `window.__HS_pcoinLevels` once `__HS_pcoinLevelsLoaded`, and `__HS_onPCoinChange` clears the GDS cache.
  - Before that, and without the patch: the browser's cached copy of the game's fetch (`cache: 'only-if-cached'`, no request; checked: the response has no `Cache-Control`), fetched only when the browser has none (never on a patched game). Without the patch, a `window.fetch` wrapper reads the `stripe/buy-upgrade/<id>` answer (`{upgradeId, level}`).
  - A purchase on the website in another tab is seen at the next reload, as the game does.
  - Not checked: the Steam app's HTTP cache (it falls back to a fetch), and a real in-game purchase on an unpatched game (the `fetch` wrapper). Rejected for bookmarklet players: reading `#upgradeGrid` with a hardcoded upgrade id table and remembered levels (not worth it for a group being moved to Tampermonkey).
- **Quark bonuses: no request of the mod's own on a patched game.** The game reads the personal bonus from `api/v1/users/me` (load, login) and the global one from `api/v1/quark-bonus` (load, then every hour) and its WebSocket's `quark-bonus` message; both setters call `updateQuarkUI(personal, global)` in `Quark.ts`.
  - Patched game (`quarkBonus` patch, found by `"settings.quarkBonusExtended"`, the global parameter told by its `globalBonus:` key): `window.__HS_quarkBonus = { personal, global }` at each call, and `__HS_onQuarkBonusChange` rebuilds the mod's `MeData` (`HSGameData.#readGameQuarkBonus`), which clears the GDS cache. Until the game's answers, both are 0 in the game too.
  - Without the patch: `users/me` read once, browser cache first (checked: the browser keeps it, logged in), then fetched (any status: a logged-out answer still has `globalBonus`); a login is seen at the next reload. That is `/me`'s `globalBonus`; the patched game gives the `/quark-bonus` value its formulas use (the same number when checked).
- **The mod opens no WebSocket.** The server refuses a second `wss://synergism.cc/consumables/connect` for the same account: the mod's own one caused a reconnect loop (the game's dev, PR #38 on Live, which deleted every bell feature; the mod now reads the game's record).
  - The active Happy Hour Bells are read once a second from the game's own record (`allDurableConsumables` in `Login.ts`), captured by the patcher through its initializer as `window.__HS_consumables` (no minified name read; the game only replaces its entries, never the record). `HSGameData.#startConsumablesPoll` copies it and notifies only on a change (a poll chosen over a change hook).
  - Without the capture (bookmarklet, older patch) the bells count as 0: no request of the mod's own as a fallback.
  - The Lotus indicator was dropped (display only, not useful).
- **The mod doesn't fetch the global event.** The game fetches `https://synergism.cc/events/get` itself (`eventCheck` in `Event.ts`, at each save load, a singularity included, then every 30 minutes, only when the save has a `dayCheck`).
  - The patcher's global event patch (`__HS_GLOBAL_EVENT_PATCHED`, found by that URL string) puts a local `fetch` at the start of `eventCheck`: the game gets the browser's response untouched, the mod a clone of each `ok` answer, through `window.__HS_onGlobalEvent(json)`, and the last one stays in `window.__HS_globalEvent` (the game's first fetch comes before the mod loads).
  - `HSGameDataAPIPartial._updateVanillaGlobalEvent` keeps it when the game would (a name, now between start and end), with the game's clock: `getTimePinnedToLoadDate` is the wall clock at load plus `performance.now()`, which `performance.timeOrigin + performance.now()` matches, also after a clock change or a sleep. `HSGameDataAPI` clears the calculation cache on each answer. `isEvent` is computed in two places in `HSGameDataAPIPartial` (a shared helper is possible, not worth a change alone).
  - Without the patch (bookmarklet, older patch) there is no global event: no fetch of the mod's own.
  - **Known limit: stopped polls.** When the game's `PollGuard.ts` finds its clocks or timers running fast, `pollsStopped` clears its event and makes it ignore later answers. The mod isn't told and each save load hands it the answer again, so GDS counts an event the game doesn't. Not fixed: it needs a new patcher anchor (`renderEventPages`) for players outside normal play, and only matters while an event runs.

## Every save load
Every save load goes through the game's `importSynergism(input, reset)`: a file, a cloud save, the Steam cloud, and with `reset = true` a singularity, entering or leaving an Exalt and the game reset (delete save).
- **The hook**: the patcher's save import hook (`__HS_SAVE_IMPORT_HOOK_PATCHED`) calls `window.__HS_onSaveImport(reset)` at the start of it, inside a `try` (an error from the mod must not stop a singularity). It runs at every singularity, so the `reset` path must stay one test.
- **`reset` false stops autosing**: `HSGameData.#onSaveImport` calls `stopAutosing({ saveReplaced: true })`. That stop clicks nothing in the game, because the answer to a click (leaving Exalt 2) would come once the new save is in place. The game reset can't be told from a singularity and doesn't stop autosing.
- **`reset` false guesses the ambrosia slot shown as loaded again** (silver border) from the new save (`HSAmbrosia.matchActiveLoadoutToLoadedSave`, one task later: `importSynergism` loads the save synchronously then; read from the live player), so imports and Auto-Loadout don't target the old save's slot. "Load from file" also guesses again from the captured save once the offline popup shows: two guesses, same answer.
- **"[HS] Keep my header layout"** (`HSHeaderKeepOnImport`, `hs-core/header/hs-header-keep-on-import.ts`, under `#importFileButton`, state in the hidden setting `keepHeaderLayoutOnImport`): with `reset` false and the box ticked, the live `headerLayouts` (stripped of the mod's ids) replace the save's in the `window.__HS_parseSave` that `loadSynergy` calls, in the same synchronous step; patched players only.
- **Without the hook** (bookmarklet, older patch), only the "Load from file" button's listener stops autosing; that listener is unchanged.
