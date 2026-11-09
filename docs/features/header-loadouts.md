# Ambrosia loadout modules in the header

The header docs: `header-modules.md` (mod modules), `header-loadouts.md` (ambrosia loadout modules), `header-edit-mode.md` (the "[HS] Header" block and edit mode), `header-corruption.md` (corruption level module), `header-challenge-progress.md`, `header-elevator.md`.

What the mod adds to the game's Ambrosia loadouts modules: icons, slots fitted to the cell, the slot shown as loaded, how many slots show, the module's own icon hidden.

## Any game icon on the loadout slots (HSHeaderLoadoutIcons)
Not a mod module: it decorates the game's Ambrosia loadouts module. No patcher feature, no setting (it only shows icons the player picked).
- **The loadout page module too** (`ambrosiaLoadoutPageHeader`, game of 2026-10-21: 8 slots a page, a click outside a
  slot turns the page; the game rebuilds the slots then). Same icons as the full module, as the game does (one
  `loadoutIcons` for both): `KINDS[kind].containerIds` lists both containers, each observed. In pick mode the slot is
  marked in both modules. On an older game the page container is missing: a debug line, not a warning (icons and borders on the page module, no shown-slots count there).
- **Stored per browser, never in the save**: `loadoutIcons` in the save only takes an ambrosia upgrade name, and one
  unknown value resets that layout's icons. `HSLoadoutIconStore` (`hs-qol-quickbar/`) holds
  `hs-ambrosia-quickbar-icons` (keys `blueberryLoadoutN`, shared with the Ambrosia tab's slots, the heater results' slot row
  and the heater's Sync icons). One icon per slot for both layouts.
- **The mod icon wins over the game's**. Painted as `img` + number span, `data-icon` left to the
  game: its `setLoadoutSlotIcon` returns early when `data-icon` matches the saved icon, so it never repaints a slot
  on its own. An observer on each slot container repaints after the game rebuilds or redraws a slot.
  The game also draws its header icons on the Ambrosia tab's slots (`updateBlueberryLoadoutIcons`, an `img`); there
  the mod icon is a background (`HSAmbrosia`, `.hs-ambrosia-slot`), and CSS hides the game's `img` while it's set.
- **Clearing**: the player's choice in the game's icon modal (an icon or the plain number) clears the mod icon.
  The mod then sets `data-icon` to `''`, which matches nothing, so the game redraws at its next header update.
- **Picking**: the game's icon modal gets a "Pick any game icon…" row in `#modal`, after `#modalContent` (the game
  patches `#modalContent` every 250 ms and would wipe anything added inside). The row closes the modal by clicking
  the game's current choice (`aria-pressed="true"`, no change; untrusted, so it doesn't clear), then starts
  `HSQuickbarIconPickerController`. A "Close" button next to it closes the modal the same way, without a pick (the game closes that modal only on one of its choices).
  In edit mode the header grows (edit panel, tray): the icon to pick must be on screen before the Pick click, as any
  click ends picking.
- **Not handled**: a sprite icon is cut to a data URL (2–10 KB, in `localStorage` next to the game's
  save) and doesn't follow an icon set switch or new artwork; a file icon follows the switch until a reload.
- Mobile bottom-sheet modals (touch-only browsers): the row isn't placed for that layout, untested.
- **Its CSS is its own** (`hs-header-loadout-icons.css`), injected and flushed (`HSUI.flushInjectedStyles()`) at the
  start of its `init`, before the first paint: the mod's general CSS comes only after every module's init, and
  `injectStyle` alone writes in the next task, so a painted `img` (the game's `position: absolute; inset: 0`)
  stretched to the page's height for a moment at each load (804 px measured at the first paint without the flush).
- **Slot number** small, in the top-left corner (as on the removed ambrosia quickbar), on every slot with an icon, the
  game's own icons included.

## Ambrosia loadout slots in a grid cell
The game gives both ambrosia loadout modules a currency module's width (158px at M) and wraps their slots (28px +
1px gap): 5 + 3 for the default 8 slots. CSS in `hs-header-loadout-icons.css`, rule written by `HSHeaderEditSettings`.
- **Stretched to their cell**, slots in a CSS grid of `--hs-loadout-columns` per row: all those shown up to 8, then
  two even rows (9 → 5 + 4, 12 → 6 + 6, 16 → 8 + 8); 8 on the page module. Shown = the fewer of the visible count and
  the slots owned (8 to 16, the game's base is 8), owned read by `:has(nth-child)` rules, so a bought slot needs no JS.
- **Slot size = the automation bar's buttons**: 26px tall (1.625em, overrides the game's button
  min-height 30px), as wide as the row allows up to 26px. Icons inside are 22px tall (the 2px border); accepted.
- **Gap 2px** (the automation bar's) when a 26px slot still fits, else 1px and the slot shrinks: each
  slot's share of the row holds its gap as margins (`round()`; the row is the container the slots measure, so its own
  `gap` can't read its width).
- **Cell alignment** (HSHeaderCellSettings Left/Center/Right) moves the slots inside the stretched module; centred by
  default, as the game centres a module.
- Measured: cell 182.9px at a 1280 window, 214.3 at 1500, 227.4 from about 1600 (grid `max-width` ~1592px). A 2560 screen at 140% zoom
  is in the last case: 8 slots 26 × 26 with 2px gaps, identical to the automation bar.
- **Setting `headerFitLoadoutSlots`** ("Fit slots to the cell", "Ambrosia loadouts" section, on by default):
  off gives the game's own layout back (28 × 30 slots, 1px gap, the wrap), the only way back since L doesn't
  enlarge the slots in the grid (the module keeps a 16px font there). Its class `hs-header-game-loadout-slots` is on
  `<html>` while off, so the default look needs nothing before the settings load.
- **Rejected:** a "Fit" button in the cell alignment (cell settings are stored per grid position, so the value would
  stay on the cell when the module moves).
- Not handled: with the module's own icon shown on a narrow window, slots get narrow (17px at 1280); the ascension
  row above the grid keeps the game's layout.

## The slot shown as loaded, on the game's Ambrosia loadouts module (HSAmbrosia)
The mod's ambrosia quickbar was removed for the game's module; its borders moved there.
- **Rainbow** once the game marks the slot (`activeBlueberryLoadout` on the tab's slot), **silver** while it's the
  mod's guess from the save (the game marks none after a page load or any save load). Same state as before
  (`activeLoadout`, `#activeLoadoutConfirmed`); the rainbow stays after a singularity (fine).
- **On the game's header module and on the Ambrosia tab's 16 slots**: the tab is where Quick Import
  and Import All go, and the heater results' slot row copies the tab's slots, borders and icons included.
- The header slots are found by `data-slot`; an observer on `#ambrosiaLoadoutsHeaderSlots` and
  `#ambrosiaLoadoutPageHeaderSlots` (the page module) (childList) puts the border back when the
  game rebuilds them (slot count change, page turned, first show after the tray). Both borders are 2 px,
  as the game's slot border: no size change.
- A header slot click is the game's own `loadBlueberryLoadout` (no Alert, no mode check): the mod adds nothing.
  The mod's own loads (Auto-Loadout, the heater's slot row) click the tab's slot (`#reloadLoadoutSlot`: LOAD mode,
  Alert dismissed).
- No setting: `ambrosiaQuickBar` was removed with the bar, and the quickbar's Alt+Click / right-click icon picking
  with it (the header's "Pick any game icon…" row does it).
- The icon store key `hs-ambrosia-quickbar-icons` keeps the bar's name on purpose (players' icons). No notice to players
  about the game's modules (the game does that). Without the patch, `#quickbarsRow` still holds the automation bar and
  the minibars.
- Fine as is: no slot guessed at 80% or better (none shown); the stricter slot rule of the Hepteract
  Distributor and the timed export (an exact tree match); a delete-save. Loading the guessed slot so the game never
  stays unmarked was considered and not started: a load below a 100% match silently changes the player's tree, each
  load queues an Alert, and autosing, a rejected tree, the offline popup and bookmarklet players all need a rule.

## Hide ambrosia bar icon
- Section "Ambrosia loadouts": "Hide ambrosia bar icon" (hidden setting `headerHideLoadoutIcons`,
  off by default, per browser): no leading icon on the game's Ambrosia loadouts module (wasted
  space). CSS only (`html.hs-header-no-loadout-icons … > img`).
- **Not on the loadout page module**: a click outside a slot turns its page, and in the top row
  the icon is almost the only spot for it.
- Hidden in edit mode and the tray too, as the visible slots.

## Visible slots
- Section "Ambrosia loadouts" (ambrosia only: the corruption line went with game 4.4.0).
- **Only the first N slots** (hiding slots in the middle was too much for nothing). The others are
  hidden by CSS only and still work everywhere else: hotkeys, the Ambrosia tab, Auto-Sing, Auto-Loadout, the heater's
  slot row. A loaded slot above N has no marker in the header (accepted).
- One `− N +` line with the game's module icon (a fixed path). The panel is made a wrapping row (toolbar and hint at `flex-basis: 100%`) so the block sits beside the
  tray; the game never rebuilds the panel, only the tray's content. The slots owned are read from the slots the game
  draws (all of them in edit mode). "All" at the slots owned, stored as 16 so slots bought later show.
- **Hidden in edit mode too**: each click shows its result.
- **Stored** in the hidden setting `headerAmbrosiaSlotsShown` (1–16, 16 = all; per browser, in Backup & Restore). The hiding rule is `nth-child(n+N+1)` on the slot containers, so it outlives the
  game's rebuild of the slots; written with `flushInjectedStyles()` at load (no flash of the hidden slots).
- Checked headless on the real game (S285, 8 slots each): block placement at 1400/1000/600 px, − and + and the
  checkboxes with trusted clicks, limits, All, hidden after Done, value kept over a reload, stale checkboxes fixed on
  show, GDS refusal.
