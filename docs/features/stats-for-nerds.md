# Stats for Nerds groups (`HSStatsForNerds`, `hs-modules/hs-stats-for-nerds.ts`)

Settings > Stats for Nerds: the game's 3-column grid of big bordered category buttons, in the order they were added to
the game, replaced by a compact list in groups. Setting `statsForNerdsGroups` (Settings → UI, "Header & tabs"), on by
default; off gives the game's exact look (list and CSS removed). No patcher feature is used.

## Rules

- **Grouped columns**: groups as titled lists of small text rows, flowing down 3 columns (CSS columns, a group never
  split), about the game's width and half its height. Not one collapsible sidebar list: ~1300 px tall open. Not the
  game's grid sorted with headers: still big buttons.
- **Groups, in progression order** (`GROUPS`): General (misc, coins, taxes, accelerators, global speed, quarks),
  Offerings & runes, Obtainium, Ants, Ascension & cubes, Singularity, Ambrosia, Red ambrosia, Purple honey. A game
  button the list doesn't name (a game update) goes in a last "Other" group. Group titles are English.
- **Labels are the game's** (the buttons' text): translated, and they follow the game's renames. Not shorter labels per
  group: English only, kept by hand.
- **Locked categories are hidden, like the game**; a group with nothing shown is hidden. A row is shown when its game
  button's own computed `display` isn't `none`: the game hides locked buttons through its CSS on `html[data-*]`, which
  still applies inside the hidden list.
- **The game's colour for each category is kept as a thin bar** on the row's left; text in grey until hovered. The shown
  category has the game's crimson background.
- **Desktop only**: on a phone the game turns the buttons into icons opening a window, kept as is.

## How it works

- **The game's buttons stay in the page, hidden** (`#statsForNerds`, `display: none`). Each row clicks its game button,
  so the game shows the category. Moving the game's buttons into groups would break the game's handler, which only
  clears the clicked button's siblings, and the mod clicks `kMisc` itself (autosing's stage read, patched internals'
  exposure).
- **The shown category is read from the game's buttons** (the inline background the game sets on the shown one), after
  every click inside the game's list: the rows' and the mod's own clicks.
- **The list is rebuilt each time the subtab opens** (`HSGameState`, Settings + Stats for Nerds): unlocks and the game's
  language change while it is closed.
- The "Generate Savefile Stats Summary" button is shown under the groups and clicks the game's.
