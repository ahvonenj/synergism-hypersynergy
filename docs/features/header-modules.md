# Mod modules in the game's header (HSHeaderModules)

The header docs: `header-modules.md` (mod modules), `header-loadouts.md` (ambrosia loadout modules), `header-edit-mode.md` (the "[HS] Header" block and edit mode), `header-corruption.md` (corruption level module), `header-challenge-progress.md`, `header-elevator.md`.

The mod's own modules in the game's editable header (`HeaderModules.ts`): the player places, hides (tray), resizes
and stacks them like the game's own. Today: the automation quickbar, `hsAutomationHeader` (`HSAutomationQuickbarPlacement`, created by `HSQOLButtons`), the
ambrosia minibars, `hsAmbrosiaBars`, the three hourly ambrosia rates (`HSAmbrosia`), and the challenge progress
module, `hsChallengeProgress` (`HSHeaderChallengeModule`).
Code: `hs-core/header/hs-header-modules.ts`; patcher "header modules" patch (`__HS_HEADER_MODULES_PATCHED`, report entry
`headerModules`).

## Rules
- **The game's header** (`HeaderModules.ts`, `HeaderLayoutDefaults.ts`):
  holding a module for 0.65 s opens edit mode (`headerEditMode` on `#mainHeader`), where a capture listener swallows
  every click inside a module; hidden modules wait in `#headerTray`, all of the new ones by default. The layout,
  sizes and slot icons are saved in `player.headerLayouts` (checked at load: a slot icon must be an ambrosia upgrade
  name).
- **No corruption loadout modules since the game's 4.4.0**: the game replaced them (and their cleanse
  buttons) with one corruption level module, `corruptionLevelHeader` ("level/max", see `header-corruption.md`).
  Every mod feature on them went with them, no exception. A saved copy of their settings is
  dropped at load.
- **A mod module id starts with `hs` and a capital letter** (no game id does), and **never reaches a save**: the
  game's save schema checks ids against its own list and resets a whole layout (desktop or mobile) over one unknown
  id. The patcher strips them in `saveSynergy` (the saved copy) and `loadSynergy` (every loaded save, including the
  singularity's reload of the live layout). The patch is all four parts or none: the save strip alone missing would
  write the ids into saves.
- **Their place lives in the mod**, per browser (HSStorage `header-modules`): region, slot index, stack partners,
  size, hidden. Noted before each header render (`__HS_beforeHeaderRender`), put back when missing (a load, a
  singularity). A grid cell taken meanwhile → the tray. A stack is rebuilt with the same partner (both `S`, as the
  game does); the saved copy unstacks the partner (its `S` dropped, as the game does).
- **Nothing is noted before the game's first load is over** (the offline popup shown or closed): Steam starts the mod
  before the save loads, so its first renders are the blank player's layout, where a module's cell may be taken;
  noting the tray there sent the module to the tray in the real save. They are still put back from the notes.
- **Two mod modules stacked survive being turned off and on**, in any order (GDS off turns several settings off one
  after the other, autosing too): a module left alone because its partner is unregistered keeps that partner in its
  note, and each render puts every missing module back before noting any place (noting first noted a module alone
  just before its partner joined it). Stacking it with another module drops the turned-off partner.
- **In a row (`ascensionStats`), a place counts the game's slots before it** (`gameIndex`): each mod
  module is put back at its own `register()`, so a full index counted mod slots not back yet and moved a module one
  slot right at each reload (the minibars, registered before the automation bar placed before them). It goes back
  after that many game slots, then after the mod modules already back there whose noted index is lower. Notes
  without it use the index once. The grid needs nothing: its cells keep their index.
- **A stack keeps its order**: the note holds the module's place in its stack (`stackIndex`, 0 = top), and it is
  put back there (the bottom for notes written before it was kept).
- **The header's Reset button** (a new layout object in the same `headerLayouts`; a load replaces `headerLayouts`)
  forgets the notes of that layout: the mod's modules go to the tray.
- **One element per id for the page's life**: the game's DOM cache keeps the first element it found for an id. It
  waits in `#headerTray` before the unlock entry is added (the cache throws over a missing id).
- `unregister` (setting off, autosing) takes the module out of both layouts and the unlock map; its place stays noted.
- Edit mode needs nothing from the mod: the game's capture listener swallows clicks inside modules.
- **No "it's in the tray" notification any more** (`notifyIfInTray` and the settings'
  `byPlayer` are gone): the settings are switched from the edit mode's "[HS] Header" block, in front of the tray.
- `register` sets `headerModuleLocked` itself: the game only re-checks locks at its next `revealStuff()` (a tab change,
  a reset), so a locked module would sit in the tray until then.
- In the grid, the game renders an `L` module as two cells at `M` size (`headerModuleWide`); `S`/`L` elsewhere zoom
  the automation buttons (sprites drawn for 18px).

## Decisions
- Unpatched players (bookmarklet, Steam not re-patched) keep the old `#quickbarsRow`.
- The automation bar's on/off setting stays: off = not offered at all, not even in the tray.
- No first-load placement: a new module starts in the tray, like the game's own new modules.
- Stacking allowed (no patch to forbid it).
- Placement per browser, not per save.
- The active challenges text next to the bar was removed.
- Buttons 26px with 2px gaps: 6 buttons (the usual count, 2 hide once their automation is on) fit one grid cell
  (181.7px when measured; the grid now follows the window between 1250 and ~1592px, see `header-edit-mode.md`) at M. Offered and not taken: joined buttons, 16px icons, an option to show
  only the automations that are off.

## Ambrosia minibars
- **One module for the three bars** (chosen over one module per bar, stackable under its currency).
- Locked like the game's ambrosia modules (Exalt 1, from `exposedPlayer`). Inside it, red and purple show once
  Exalts 9 / 10 are completed (from the same source as the fill, so the fallback row does the same), as the game's
  red ambrosia and purple honey modules.
- **Read from the live player, not GDS**: the fill (`blueberryTime`, `redAmbrosiaTime`,
  `purpleHoneyProgress`) from `exposedPlayer` every 125 ms, the game's own pace (its purple reactor step moves the
  three bars every 0.125 s of real time; a timer, not `requestAnimationFrame`); nothing while the page is hidden, the
  style written only on a change. Predicting the fill between reads was dropped: the live read
  is exact and cheaper.
  The bar sizes come from the mod's GDS formulas on one live read (`getForcedGameData`, no save), done again only when
  one of their inputs changes on the live player (lifetimes to 3 significant digits, left out under Two Minds whose
  sizes are constants, else the offline catch-up recomputes them every tick; Two Minds / Brick of Lead, every Exalt, the shop's
  accelerator, the purple requirement upgrades, highest singularity), never while GDS is paused. Patching the game's
  three functions instead was rejected: same accuracy as before, no patcher change, no Steam re-patch.
- Setting `ambrosiaMinibars`: `usesGameData: ["bookmarklet"]` (`HSSettings.usesGameData()`). Only there do they
  turn GDS on and go off with it, and they follow GDS's save data (twice a second since `gdsSpeedMs` went from 66 to
  500 ms with this change). A userscript or Steam player whose player patch failed also gets the GDS path, without
  the coupling.
- No text label in edit mode: each bar has a tooltip only.
- Width of a currency module (`calc(38px + 7.5em)`, so S/L scale it), the cell's when wide; bar height 6/8/12px
  at S/M/L (`--hs-minibar-height`).
- Unpatched: the bars are their own section of `#quickbarsRow` (`ambrosia-minibars`), since the ambrosia quickbar was removed.

## Ambrosia hourly rates
- The header and Ambrosia page use the same [sustained-income calculation](gds.md#sustained-ambrosia-income).
- **Three modules** (`hsAmbrosiaRate`, `hsRedAmbrosiaRate`, `hsPurpleHoneyRate`, `HSAmbrosia`; chosen over one
  module of three lines): built like the game's currency modules (`currencyContainer`, its icon, `statDisplay` in the
  currency's colour, `6914.50/h`), so the game's CSS sizes them. Locked as the game's module of that currency
  (Exalt 1 / 9 / 10, from `exposedPlayer`).
- Setting `ambrosiaRateHeader` (on by default, they start in the tray), `usesGameData` with the plain rule: off with
  GDS, never turns GDS on itself (the minibars' auto-on runs at every load, so a new setting on by
  default would turn GDS on for players who had turned it off). Autosing turns it off. No fallback when unpatched.
- **Refresh every 5 s** from GDS's last save data, never a forced save, and only while one of them can be seen
  (`checkVisibility()`: placed and unlocked, or the tray in edit mode). While the Ambrosia tab is open they take the
  tab's 500 ms rates instead, at no extra cost (fast refresh for comparing loadouts in the tab).
- Cost measured on the player's S285/S289 backups in node: 1.3 ms per refresh (p95 2.7), 0.7 ms on the same
  snapshot again (luck is not fully cached).


## Known gap
`importSynergism` stores the singularity's raw save (holding the live ids) until the next `saveSynergy`; an
unpatched game reading it in that window resets the header. Needs the game closed right at a singularity.

## Vanilla bug: layout reset after a game update that adds modules
Found from players' reports (a player's saves). In `headerLayoutSchema`'s
transform (`PlayerSchema.ts` ~396), each module missing from a save gets `saved.sizes[id] = fallback.sizes[id]`, so
`undefined` for a module without a default size (the 2 page modules of the 2026-10-21 update, `purpleHoneyHeader`).
Harmless in JSON, but `saveSynergy` parses the live player: `z.partialRecord` rejects a present key holding
`undefined`, the whole layout's `.catch` fires, and the default layout is stored while the screen keeps the old one
until the next load ("reset while refreshing"). Hits every customised layout saved before such an update, and every
import of such a save. Reported to the game's devs; the patcher's strip could drop `undefined` sizes, but that
stopgap was refused.

## Testing
The real game, patched, with the mod, runs in headless Chrome (`scripts/harness/`): drag from the
tray with real mouse events, capture saves by wrapping `window.btoa`, import a save with `DOM.setFileInputFiles`.
