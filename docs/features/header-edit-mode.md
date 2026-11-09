# The header's edit mode: "[HS] Header" block, grid width, edit button

The header docs: `header-modules.md` (mod modules), `header-loadouts.md` (ambrosia loadout modules), `header-edit-mode.md` (the "[HS] Header" block and edit mode), `header-corruption.md` (corruption level module), `header-challenge-progress.md`, `header-elevator.md`.

What the mod adds to the game's header edit mode: its settings block, the grid width, the edit button and long press, and the cell, minibar and button additions.

## Header grid width (HSHeaderGridWidth)
How the game sizes the grid (desktop): 7 equal columns (`repeat(7, minmax(0, 1fr))`, no gap), `width: 100%` of the
header, floor `min-width: 1250px` (also `html`'s), cap `max-width: calc((38px + 7.5em) * 4 + 60em)` (~1592px at 16px).
Single-cell modules have a fixed width (`calc(38px + 7.5em)`, 158px) centred in their cell: a wider grid spaces them out,
only wide modules / button rows / stretched mod modules grow. Mobile: 2 columns, full width, no floor or cap (the
`≤1024px` media rule); the game has its own height handle there (`#mobileHeaderResizeHandle`).
- **Only the cap moves**: `html.hs-header-grid-width:not([data-mobile="true"])
  #headerGrid { max-width: var(--hs-header-grid-width) }` (`none` = Full). Width 100% and the 1250px floor stay the
  game's, so the grid still follows a smaller window as in vanilla.
- **Two lines** (one line, 234px, made the section the block's widest): "Grid width", the value
  (`min-width: 6.5ch`, "1830 px") and Reset on top, the slider under them at the section's width: 144px, close to the
  checkboxes (123px).
- **Slider, not drag handles**: "Grid width" line, first in the Layout section of "[HS] Header", from
  1250 to the header's width (step 10, max rounded up to a step so the right end is reachable); right end = `'full'`;
  Reset clears the key (game's cap). Live on `input`, saved and logged on `change`, then `__HS_renderHeaderLayout()`
  so the game's fitty texts (Tall challenge progress) refit (fitty only refits on a window resize).
- **The value can be typed**: a number input with "px", the grid's rendered width. A typed
  width applies on Enter or `change`, clamped from 1250 to the header's width; the header's width is stored as Full.
- **Floor 1250, desktop only**. Stored in HSStorage `header-grid-width` (`{ version: 1, width }`),
  never in a save.
- **Rejected:** per-column widths (the game's `wideCellRect` and `HSMinibarResize.#limits` multiply one cell's width by
  the span), fixed row heights (rows are content-sized; Tall spans 2), changing the column count (a save made with it
  loses its layout on an unpatched game), drag handles on the grid's edges (the game's render empties `#headerGrid`, so
  an overlay outside it, capture listeners against the module drag, a centred grid moving at twice the pointer).
- At Full the first column starts at the window's edge, under the mod icon (x 10–45px): a centred module stays clear,
  a left-aligned one would sit under it.
- Checked headless on the real game (1830 window): game 1592 / cell 227.4; 1300; Full 1830 / 261.4; Reset; 1400 kept
  after a reload; window 1320 with 1400 stored → 1320.

## The "[HS] Header" block in edit mode (HSHeaderEditSettings)
Started as the visible slot counts, asked by a player who bought 16 slots and uses fewer; then every
header setting moved there (better for everyone than the panel). Static, installed by `Hypersynergism.init` after the
settings sync; no patcher feature.
- **One block, its sections side by side** (one block over several), in `SECTIONS` order: Layout,
  Ambrosia loadouts, Mod modules (Ambrosia per hour and Challenge progress only with the header modules patch, Center
  quick bars only without it: it moves `#quickbarsRow`; also the Sing elevator popover, not a section of its
  own: one line alone took a whole column), Challenge progress, Corruption module, Octeracts. Title
  "[HS] Header", no "[HS]" inside; checkboxes as "[HS] Keep my header layout" (small, grey label), help texts as
  tooltips.
- **`shown` checks run at each refresh**: lines are always built and hidden with `[hidden]` CSS, a section hidden when
  it has no line left (a purchase can change them after the block is built).
- **Nothing left in the panel**, no "moved" line either (noise). The block's settings are `hidden` but keep
  their `settingControl`: `syncSettings` runs a setting's load-time action only when it has one. The "Quickbar QOL"
  group stays in the groups JSON (the validation needs it) and shows nothing.
- **Toggles go through `enable()`/`disable()`**, not the panel's `handleToggle` (which needs its button): no
  `byPlayer` (since removed), plus the same GDS check (refused with a notification when GDS is off,
  `gameDataCheckBlacklist` honoured). The "it's in the Hidden tray, hold a header module" notifications were removed
  with `notifyIfInTray`, then `byPlayer` itself (the tray is in front of the player now).
- **Short tooltips**: the settings' help texts say what the setting does, not how to open edit
  mode or use the tray (the player sees it happen). They only show in the block now. What differs without the
  header modules patch (bookmarklet: the mod's row, the minibars' GDS) is added by the block only for those players
  (`withoutPatch` in `SECTIONS`), not written in every player's tooltip.
- **Refresh without an observer**: `animation: 1ms` on the block restarts each time
  `#headerEditPanel` goes from `display: none` to shown, and `animationstart` refreshes the checkboxes and counters
  (the slots owned can change after a purchase).
- **The checkboxes follow every change live** (GDS turned off and on from the panel while edit mode
  was open left them stale): `HSSettings.onStateChange`, fired by `HSSetting` right after it writes `enabled` (the
  panel's toggle, `enable()`/`disable()`, a boolean `setValue()` that changes it), before the setting's action runs.
- **The tray gives way**: `flex: 1 1 500px; max-width: 1000px` on `#headerTray`, because a wrapping
  row breaks lines on the items' base sizes. Measured: 1400 px tray 1000 + block 360 on one line; 1000 px tray 634 +
  block; 600 px block under the tray.

### Top row at the bottom
- Section "Layout", first in the block: "Top row at the bottom" (hidden setting `headerStatsAtBottom`, off by
  default, per browser). The game's top row (`#ascensionStats`) goes under the grid, above the edit panel (the bottom of the header, not of the page; the tabs stay where they are).
- **CSS order only** (class `hs-header-stats-bottom` on `<html>`, rules in `hs-header-edit-settings.css`): no DOM
  move, so the game's edit mode, drag and drop and DOM cache are untouched. On desktop both are items of
  `#mainHeader`'s grid (`#mobileHeaderContent` is `display: contents`), so the header's other children (tabs,
  `#quickbarsRow`) get a later order; on mobile the rule beats the game's own order (row 1, grid 2, panel 4).
- Grid 5px off the top of the page (desktop). Between the grid and the row: only the grid's own 5px bottom margin
  (the row's top margin is 0: 10px looked too wide), so the header is 5px shorter than with the row at
  the top. Mobile not checked.

### Edit button
- A faint ✎ right of the mod icon (`#hs-header-edit-button`, fixed at left 48px / top 10px, 18×35px, opacity 0.3, 1
  on hover) that opens edit mode through `HSHeaderEditSettings.openEditor()` (also the panel's "Edit game header"
  button): many players don't know the game's header can be edited. Right of the mod icon, not under it (over the
  header's top-right corner and the grid's right edge): clear of the quick access menu that opens under the icon.
- **No hold wait**: `openEditor()` sends the game's long-press to `#headerGrid`, and while that
  synthetic `pointerdown` is dispatched, `window.setTimeout` is swapped for one call: the first timer of 500 ms or
  more (the game's 650 ms hold, `window.setTimeout` looked up at the call in the bundle) is run right after the
  dispatch instead. Nothing caught (a game change) → the old 750 ms wait. No patcher feature. It sets
  `__HS_headerLongPressEnabled` to true during the dispatch, so it works with "Long press to edit" off.
  The synthetic events carry `isPrimary: true`: the game ignores any other pointer (since game commit 46a9e48b6).
- Section "Layout": "✎ Header edit button" (hidden setting `headerEditButton`, **on by default**, per browser; not "Edit button" or "✎ shortcut under the mod icon"): a class on `<html>` (`hs-header-edit-button`), so a player turns it
  off from edit mode once they know. Long-press and the panel's button still work when it's off.
- **Kept in edit mode**: the player sees it go on and off with its checkbox. There it's fully lit
  and a click closes edit mode by clicking the game's `#headerEditDone` (so the mod's Done listener saves as usual);
  tooltip "Toggle header edit mode", true in both states. A double-click opens and
  closes: not an issue. The panel's "Edit game header" button only opens. Built only when the game has `#headerTray` (no edit mode
  otherwise).
- **On the page only**: z-index 2000, under every game overlay (tooltips `#modal`,
  notifications, dialogs, announcements: 6967 and up) and the mod's panel and windows (7000), above the page's layers
  (up to 1000). Not just under 6967: room on both sides if the game moves its values.
- **Leaves the mod panel open**: `openEditor(false)`; the panel's "Edit game header"
  button still closes it (the panel would cover the header).
- Checked headless on the real game (S285): position, hover, trusted click → edit mode within 50 ms, native
  `setTimeout` back afterwards, off and on from the block in edit mode, kept off over a reload.

### Long press to edit
- Section "Layout": "Long press to edit" (hidden setting `headerLongPressEditing`, on by default, per browser), shown
  only when the "header long press" patch applied (`__HS_HEADER_LONG_PRESS_PATCHED`). Off, holding on the header no
  longer opens edit mode; the ✎ button and the panel's "Edit game header" still do. Clicks and drag in edit mode are
  unchanged.
- The patch (report entry `headerLongPress`) only makes the game's hold timer depend on
  `window.__HS_headerLongPressEnabled` (`false` = no timer; undefined, as with an older bundle, = the game's hold).
  Test: `scripts/tests/test-header-long-press.cjs`.

## Cell, minibar and button additions
None of them writes `player.headerLayouts` (checked at the merge). All per browser.
- **Cell alignment and half height** (`HSHeaderCellSettings`, `hs-core/header/hs-header-cell-settings.ts`, installed by
  `HSHeaderEditSettings.install`): Horizontal (Left/Center/Right), Vertical (Top/Center/Bottom) and Height (Full/Half)
  button groups in the game's `#headerEditToolbar`, for the selected module's cell. Stored in HSStorage
  `header-cells`, per desktop/mobile, keyed `ascensionStats:N` / `headerGrid:N`; applied as `data-hs-header-align`,
  `data-hs-header-vertical` and class `hs-header-half` (half: the module's `data-size` set to `S` in the DOM only, the
  real size kept in `data-hs-header-full-size`). Half only for a single module in a grid cell, not a 1x2 (`Tall`) one,
  the game's progress modules included (a stored half comes back with another size). The game's Reset button
  (a new layout object in the same `headerLayouts`) clears them, the same test as `HSHeaderModules`. Its own
  MutationObserver on the two regions, `#mainHeader`'s class and `data-mobile`.
  **No button pressed when nothing is stored**: "nothing" is the game's look, not Center
  (a grid stat's box centred with its content at its start; a stack stretched with its content at the top). A click
  on the pressed button clears it. Rejected: Center storing nothing (players click Center to really centre a short
  text). With Half and no vertical stored, Top shows pressed (it is applied).
- **Aligned button groups** (Live v2.14.7): a stack of the game's reset buttons (`.headerStackRow`) with a cell
  alignment becomes a wrapping flex row of its visible buttons in their saved order, 5px apart (Center spaces them
  evenly, `space-around`), a live preview in edit mode. A button dropped into an aligned group goes before the button
  under the pointer (`__HS_moveHeaderButton`), never into an empty column.
- **Button groups follow the grid width** (`HSHeaderButtons`, `hs-core/header/hs-header-buttons.ts`, installed by
  `HSHeaderCellSettings.install`; "header buttons" patch, report entry `headerButtons`, Live v2.14.7). The game puts a
  fixed number of reset buttons in a group's cell. The mod sets that number from the cell's width and the widest
  button (1 to 8; `__HS_headerButtonCapacity`, recomputed on a grid resize and at each width change) and re-renders
  when it changes. A button joins a group only while the group's buttons fit its width (`__HS_canJoinHeaderButtons`).
  The patch keeps room for 8 buttons in the saved positions (`Math.max(8, …)`), so a group made on a wide window wraps
  on a narrower one instead of losing buttons. Without the new bundle every hook falls back to the game's value.
  Tests: `scripts/tests/test-header-layout.cjs`, `synergism_modloader/test/patcherHeaderButtons.test.js`.
- **Minibar resize** (`HSMinibarResize`, `hs-core/header/hs-minibar-resize.ts`, installed on `#hs-minibars-wrapper`
  by `HSAmbrosiaMinibars`): width / height / corner handles in edit mode, a size readout and Reset size. Stored in
  HSStorage `minibar-dimensions`, per desktop/mobile. The bars lost their white border (at 3 px a bar, 1 px of
  fill was left). "Minibars border" (`ambrosiaMinibarBorders`, off by default, class
  `hs-minibars-framed` on `<html>`) brings it back as **one frame around the group** (chosen over per-bar
  borders): a 1 px medium grey (`#808080`) `outline` on `#hs-minibars-wrapper`, so the bars keep their whole height.
- **Gap between the bars**: 2 px, none for bars of 5 px and below (a CSS `clamp` on
  `--hs-minibar-height`). The half slot's limit (16 px for the group) uses the same rule (`barGap` in
  `hs-minibar-resize.ts`, keep the two in step): 3 bars now fit at 5 px there, 4 px before.
- **Toggles in the "[HS] Header" block**: Remove header gap (`removeHeaderGap`, `HSHeaderGap`: pulls the tabs up to the
  last visible module, observers on the regions), Compact challenge text (`compactChallengeText`,
  `HSHeaderChallengeProgress`: only the numbers, full text on hover), Match Oct icon size
  (`matchOcteractIconSize`, CSS) and Match Oct text (`matchOcteractText`, `HSOcteractHeader`: a white Oct/s
  unit). All hidden settings, off by default.
- **"Edit game header" button** (Settings > UI, `editGameHeader`): `HSHeaderEditSettings.openEditor()` closes the panel
  and sends the game's long-press to `#headerGrid` (no module target, so no drag; without the hold wait since the
  ✎ button, see "Edit button").
- **Done saves**: a listener on `#headerEditDone` flushes the pending mod settings (`HSSettings.flushSettingsToStorage`)
  and clicks `#savegame` (the game's `saveSynergy(true)`, so the patcher's strip still applies).
