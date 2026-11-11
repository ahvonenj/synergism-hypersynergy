# Tools tab calculations (`HSCalculationTools`, `hs-core/hs-calculation-tools.ts`)

How a calculation gets into the list (`toolingSupport`, `fnParams`, `options`, components): `docs/features/gds.md`.

- **Each run forces a save**, so it works with GDS off; an error goes to the result line.
- **Numbers show 3 decimals**, in scientific notation above 1e6 and below 0.01 (exact 0 stays `0.000`). The formatter is
  local: not `HSUtils.N`, whose other callers keep their format.
- **Names start with their topic**, a part of a value written "Parent: part" ("Ambrosia Luck: Shop Upgrade"), and the
  list is sorted A→Z (`#definitions()`). A new entry needs a topic-first name, nothing else to place.
- **Params** get controls from `options` (a `{ label, value }` list, or a function of the save). `reduce_vals` is
  hidden and filled by the two buttons; mode params are shown. A param depending on another param (`effectKey`) is not
  supported: such functions stay off the list.
- **Components** are a name → value object (`HSCalculationComponents`) with the game's English stat line names, not
  translated (the names match Settings → Stats for nerds, `docs/game/updating.md`). "Calc. components" on an entry
  without "(C)" gives the reduced result + " (no components)" (greying the button was the alternative not taken).
- **Cubes since game 4.4.0 ("Base only"):** the 6 partial Cube Multiplier entries, Cubes With Tau,
  Ascension Score and the corruption score entries left the list (they had about 5 of the game's 20–45 factors).
  "Cube Bank" (the 7 sources + Challenge 10, game line names) and "Cube Gain: Corruption Lines" (cube type × level
  current/next: bank × base × corruption rate × C15 per-type reward × High-Scoring Statue, the game's
  `corruptionCubeStatLines`) were added.
- **Left out on purpose**: the blessing pieces (rune effectiveness, salvage, accelerator), accelerator
  boost, coins owned, achievement AP, potion bases, purple craft costs and enchantment level, favorite upgrade effect;
  Leaderboard Value can't be typed in. Salvage Rune EXP Multiplier returns a `Decimal`: the result formatter needs a fix
  before it can be added.
- **Check:** run every entry with every option on real backups in node (`scripts/harness/node-run.mjs`); after a change
  that must not move numbers, compare with HEAD (`docs/dev/tricks.md`).
