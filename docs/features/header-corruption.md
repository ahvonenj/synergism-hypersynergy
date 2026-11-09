# Corruption level module (HSCorruptionHeader)

The header docs: `header-modules.md` (mod modules), `header-loadouts.md` (ambrosia loadout modules), `header-edit-mode.md` (the "[HS] Header" block and edit mode), `header-corruption.md` (corruption level module), `header-challenge-progress.md`, `header-elevator.md`.

Decorates the game's `corruptionLevelHeader` ("used/max", game 4.4.0); not a mod module. Code
`hs-core/header/hs-corruption-header.ts`, CSS `hs-corruption-header.css`. Section "Corruption module" of the block.
- **Next level** (hidden setting `corruptionHeaderControls`, on by default, one setting for both
  parts): ` → 30` in silver after `#corruptionLevelHeaderText` (never inside: the game rewrites that span) while the
  next ascension's level differs from the one shown. In an ascension challenge the game shows 0, so `0/132 → 25`.
  Read every 250 ms while the module is seen (as the challenge progress module), from `exposedPlayer`, else the
  game's text and input (bookmarklet). Not turned off by autosing (cheap, as the challenge progress module).
- **Popover on a click on the module** (not the wheel; it keeps every control, the module only some, below), centred under it,
  pushed back inside the page at its edges: the game's cleanse (its `#corruptionExitIcon` image as it is, 30 px as
  the buttons, no frame of the mod's: the icon has its own; left of the 0), the tab's row (0, -10,
  -1, input, +1, +10, Max, the game's button classes, at their text's width + 5 px a side instead of the game's
  fixed widths) and its two toggles side by side (checkboxes at their normal size, not the tab's 1.4), all through the game's own controls (`HSCorruptionLevel`,
  `hs-core/hs-corruption-level.ts`, shared with autosing's `HSAutosingCorruption`): the game clamps and updates its
  tab. The cleanse and the row are hidden while the max is 0, the toggles stay (they work before C11). The box is
  `HSHeaderPopover` (`hs-header-popover.ts`), shared with the elevator popover.
  - **Cleanse in two clicks**, as the game's Cleanse then Confirm (a cleanse lowers the current ascension's level at
    once; one click was considered and kept at two, the button being next to the 0): the first shows "OK?" over the
    icon for 10 s (the game's "Confirm" as tooltip; over it, not beside it: the popover shouldn't grow
    and re-centring), closing the popover cancels it; the second clicks the game's `#corruptionCleanseConfirm`
    (works while hidden).
  - **Toggles with short names**: "Auto-climb" (`autoIncrease`) and "Cleanse to highest"
    (`cleanseToHighest`), English for everyone; the game's translated sentence is their tooltip. Closes
  on Escape, a press outside, a second click on the module, edit mode, the module hidden. In edit mode the game's
  capture listener stops the click. An emptied input changes nothing (the game would set 0). The game's texts
  (title = "[HS] " + the input's aria-label, Max, toggle) copied at each opening, so they follow a language switch.
- **Level controls in the module** (hidden setting `corruptionHeaderInline`, on by default, under the setting above;
  off = the popover only). The module's size chooses how much shows, with no mode setting:
  - **S or stacked**: the game's text and ` → 30`, as without the setting.
  - **M**: `25/132 ‹ 30 ›`. The game's box is 158 px, and the module grows to its content (`width: max-content`) with
    3-digit levels, inside the narrowest cell (178.6 px at a 1250 px window).
  - **L**: also 0, Max, the cleanse and Auto-climb, in one row with one gap between those blocks (not pushed to both
    ends of the two cells: the room left falls after the row). In the grid the game draws L with `data-size="M"` and
    `headerModuleWide`; in the top row, `data-size="L"`: the CSS checks both. **No XL**: the game allows it only for
    progress and loadout modules. "Cleanse to highest" stays in the popover.
  - **The max's digits are reserved** for the current level and the field, so the controls stay put when a level
    changes length (entering a challenge shows 0).
  - **‹ ›**: ±1, Shift ±10, a hold repeats (±10 after 10 repeats, stops at 0 or the max). Not the six buttons of the row.
    Hovered: a square frame as high as the number, `‹` in the game's green, `›` in its red.
  - **The number**: a click selects it for typing; Enter applies, Esc cancels, ↑↓ step. Grey when it equals the level
    shown, gold while a change is pending. It's always shown, so a change moves nothing.
  - **`/132` sets Max**, the icon and `25` open the popover.
  - **The game's text is hidden, not changed**: `updateHeaderInfo` rewrites `#corruptionLevelHeaderText` at each
    display update whenever it differs, which would undo a change and delete any element put inside. The mod's `25` and
    `/132` are split from that hidden text, so they keep its number format.
  - **The icon isn't turned into a cleanse button**: open then close on it would have become two clicks that cleanse,
    and only `25` would have opened the popover.
  - **Holding a control never starts edit mode** (it stops `pointerdown`, on which the game starts its hold); the icon
    and `25` still do. In edit mode the controls take no press (`pointer-events: none`), so a press on them drags the
    module.
- **Autosing**: a phase's level overwrites the player's change (accepted).
- **Keep visible** (hidden setting `corruptionHeaderAlwaysShown`, on by default, the name of the removed corruption
  loadouts setting reused, same meaning): the game unlocks the module on C11 only, so it hid at the start of each
  singularity. The unlock check becomes `game check || highestSingularityCount > 0` (as the game's Corruption tab).
  **No Platonic Tau condition**: since 4.4.0 Tau sets nothing before C11
  (`maxCorruptionLevel()` is 0 then, `next` not kept over a singularity), so before C11 the module shows `0/0` and
  its popover only the toggle, Tau or not. Header modules patch only (the line is hidden without it).
