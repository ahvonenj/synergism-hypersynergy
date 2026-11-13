# Singularity search fields (`HSSingularitySearch`, `hs-modules/hs-singularity-search/`)

Search fields on three subtabs of the Singularity tab: Perks / Penalties, Golden Quarks and Octeracts. The perk tree and
the two upgrade grids are unlabelled icons: without them, finding what affects something means hovering them one by one.
One setting for the three, `singularitySearch` (Settings → QoL, "Search fields (Perks, GQ, Oct)"), on by default: one
feature on three grids, whose empty field changes little; not one setting per subtab. Off gives the game's exact look
(elements removed, CSS removed, classes cleared). It was `perksFind` when it covered the perks alone: the stored value is
read under the new key (`RENAMED_SETTINGS`, `hs-settings-state.ts`).

Files: `hs-singularity-search.ts` (the module), `-perks.ts`, `-grid.ts` (Golden Quarks and Octeracts, one class with
their ids), `-field.ts` (the field and the tooltip read they share), `-match.ts` (matching).

## The field (every subtab)

- **A field, always visible**: not a button that opens one, a click for nothing.
- **Clearing the field (Clear button, by hand) or Escape** ends the search. The Clear button is the game's button at the
  field's height, to the right of the field, hidden while the field is empty: not a cross inside the field, too small a
  target. The number of results is in grey inside the field, at its right end, like the browser's find bar; typed text
  stops before it. The text stays when leaving the subtab, and the search is read again on return.

## Perks / Penalties

- **Results over the penalties text, from its grid cell down to the window's bottom**: not a separate window, which would
  cover the tree. The penalties stay in place with `visibility: hidden`, so nothing moves. The other perks and the tree's
  lines are dimmed.
- **Compact cards, one column**: not two columns, whose room depends on the window; not a smaller font alone, which gains
  least. Smaller icon and text, level in small grey on the title row, next level dropped: the game's own tooltip, on the
  lit perk in the tree, still has it.
- The Clear button is out of the flow there (the field stays centred over the penalties). Results are a snapshot: their
  values update at the next key or return, not live.

## Golden Quarks and Octeracts

- **The upgrades that don't match are dimmed, nothing else**: not result cards, as neither subtab has a free area for
  them (they would cover the grid searched). The grid is the result list; hovering a lit upgrade opens the game's
  tooltip. On Octeracts the map's lines are dimmed too (spine, nodes, tracks).
- **The field's row is in the grid's box, right under the upgrade AP line**: the same place on both, at every window
  width. Turning the setting on moves the grid down once by the row's height; nothing moves while searching. The Clear
  button is in the flow beside the field, its room kept while hidden: the octeract box is narrow with the maxed upgrades
  hidden.
- **Maxed upgrades the game's "Maxed Upgrades" button hides are counted apart**: "2 results (+10 hidden)". They stay
  hidden. The count follows a click on that button.
- The game rebuilds the octeract box the first time its subtab opens: the row is put back at each opening.
- The game never hides a locked upgrade on these grids (an upgrade above the highest singularity shows its minimum in
  red): no spoiler check.

## Clickable words (Perks only)

- **One row under the field**: `quark`, `cube`, `octeract`, `ant`, `luck`, `salvage`, `token`, `auto`, `challenge`,
  `purple`, in the room above the penalties text. They fill the 445 px column (443 px, English): an 11th word needs a
  second row, which needs the penalties moved. A click fills the field and searches.
- **A word that finds nothing isn't shown**, checked each time the subtab opens: nothing unlocked yet on that subject, or
  another wording in the game's language. The words are English in every language: not a list per language, not English
  only. Where they keep matching by chance, a French "ant" finds "Antiquités".

## Reading the tooltips

- The game gives no access to `singularityPerks` or its upgrade data. For each element, a `mousemove` and the event its
  listener closes the tooltip on (perks: `mouseleave`; upgrades: `mouseout`, through `registerPurchasableModal`), and
  `#modalContent` is copied between the two, in the same task: nothing is painted. The content is emptied first, so a
  read never returns an older tooltip (`readHoverTooltip`). No patch needed, so bookmarklet players have it too. The
  text is the game's: translated, with current values.
- Read `textContent`: the modal is `visibility: hidden` at that point, `innerText` would be empty.
- **Perks** are read at each search; **upgrades** once per subtab opening (80 Golden Quark ones: about 25 ms, 47
  octeract ones about 15 ms, at 1830 px on an S290 save), as their names and descriptions don't change in between.
- **Upgrade text**: the tooltip's lines carry no class. The name is its first `span`; the description is taken from the
  button's `aria-label`, the same translated text.
- **Touch devices**: the game opens these tooltips with a click there, and the hover gets nothing. One element is read
  when each field is added; if that fails, no field on that subtab, and a line in the log.
- **Spoilers**: a perk with `style.display === 'none'` is skipped. The game sets that when the subtab opens (the field
  only exists there) and it is the default of every perk. The 3 previews it does show give their name and unlock
  singularity, found by name only.
- A read closes a game tooltip that was open: the mouse resting on an element while typing. It comes back at the next
  mouse move.

## Matching (`hs-singularity-search-match.ts`, `test-singularity-search-match.cjs`)

- **Name and description only**: the level, cost and AP lines would make "level", "singularity" or "quarks" match
  everything.
- **At the start of a word**, ignoring case and accents: "ant" finds 8 perks, as a plain substring 14 (grants, Instant,
  Accountants). Several words must all match, in any order.
- **Chinese and Japanese have no word gaps**: a term with such characters matches anywhere, and a Latin term right after
  them counts as a word start.

## Layout (Perks)

The element is absolutely placed with `grid-column: 1 / 2` and `grid-row: 1 / 2` in `#singularityInfo`, the only way to
fill one cell without sizing it. Both ends are needed: `grid-column: 1` alone stretches it to the container's right edge,
over the tree. It lets the mouse through (`pointer-events: none`) except on the field and on non-empty results.

The results box goes past the cell with a `min-height` from `100vh` and its own top, set at each search, so a smaller
window shrinks it without a scrollbar. Not at the game's stacked layout (width <= 1024 px), where the tree is under it.
That layout has no room above the penalties text, so the penalties get a top margin for the field and the words.
