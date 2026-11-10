# Perk search (`HSPerksFind`, `hs-modules/hs-perks-find/hs-perks-find.ts`)

A search field on the Singularity tab's Perks / Penalties subtab. The perk tree is unlabelled icons: without it, finding
what affects something means hovering them one by one. Setting `perksFind` (Settings → QoL), on by default; off gives the
game's exact look (element removed, CSS removed, classes cleared).

## Rules

- **Perks only**: not the Golden Quark or octeract upgrades, whose tooltips can be read the same way but give their full
  text while the game hides them; they would need a check per upgrade.
- **A field, always visible**: not a button that opens one, a click for nothing.
- **Results over the penalties text, from its grid cell down to the window's bottom**: not a separate window, which would
  cover the tree. The penalties stay in place with `visibility: hidden`, so nothing moves. The other perks and the tree's
  lines are dimmed.
- **Compact cards, one column**: not two columns, whose room depends on the window; not a smaller font alone, which gains
  least. Smaller icon and text, level in small grey on the title row, next level dropped: the game's own tooltip, on the
  lit perk in the tree, still has it.
- **Clearing the field (its cross, or by hand) or Escape** brings the penalties back. The number of results is in grey
  to the right of the field, out of the flow. The text stays when leaving the subtab, and the search is
  read again on return. Results are a snapshot: their values update at the next key or return, not live.

## Clickable words

- **One row under the field**: `quark`, `cube`, `octeract`, `ant`, `luck`, `salvage`, `token`, `auto`, `challenge`,
  `purple`, in the room above the penalties text. They fill the 445 px column (443 px, English): an 11th word needs a
  second row, which needs the penalties moved. A click fills the field and searches.
- **A word that finds nothing isn't shown**, checked each time the subtab opens: nothing unlocked yet on that subject, or
  another wording in the game's language. The words are English in every language: not a list per language, not English
  only. Where they keep matching by chance, a French "ant" finds "Antiquités".

## Reading the tooltips

- The game gives no access to `singularityPerks`. For each perk, a `mousemove` and a `mouseleave` event (not bubbling),
  and `#modalContent` is copied between the two, in the same task: nothing is painted. No patch needed, so bookmarklet
  players have it too. The text is the game's: translated, with current values.
- Read `textContent`: the modal is `visibility: hidden` at that point, `innerText` would be empty.
- **Touch devices**: the game opens a perk's tooltip with a click there, and the hover gets nothing. One perk is read when
  the field is added; if that fails, no field, and a line in the log.
- **Spoilers**: a perk with `style.display === 'none'` is skipped. The game sets that when the subtab opens (the field
  only exists there) and it is the default of every perk. The 3 previews it does show give their name and unlock
  singularity, found by name only.
- A read closes a game tooltip that was open: the mouse resting on a perk while typing. It comes back at the next mouse
  move.

## Matching (`hs-perks-find-match.ts`, `test-perks-find-match.cjs`)

- **Name and description only**: the level lines would make "level" or "singularity" match every perk.
- **At the start of a word**, ignoring case and accents: "ant" finds 8 perks, as a plain substring 14 (grants, Instant,
  Accountants). Several words must all match, in any order.
- **Chinese and Japanese have no word gaps**: a term with such characters matches anywhere, and a Latin term right after
  them counts as a word start.

## Layout

The element is absolutely placed with `grid-column: 1 / 2` and `grid-row: 1 / 2` in `#singularityInfo`, the only way to
fill one cell without sizing it. Both ends are needed: `grid-column: 1` alone stretches it to the container's right edge,
over the tree. It lets the mouse through (`pointer-events: none`) except on the field and on non-empty results.

The results box goes past the cell with a `min-height` from `100vh` and its own top, set at each search, so a smaller
window shrinks it without a scrollbar. Not at the game's stacked layout (width <= 1024 px), where the tree is under it.
That layout has no room above the penalties text, so the penalties get a top margin for the field and the words.
