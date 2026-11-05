# Challenge progress module (HSHeaderChallengeModule)

The header docs: `header-modules.md` (mod modules), `header-loadouts.md` (ambrosia loadout modules), `header-edit-mode.md` (the "[HS] Header" block and edit mode), `header-corruption.md` (corruption level module), `header-challenge-progress.md`, `header-elevator.md`.

One mod module (`hsChallengeProgress`) for the challenges the player is in, instead of the game's three progress
modules (one per tier, never stackable: `canJoinSlot`; they keep their room outside a challenge, `visibility:
hidden`). The game's three are left alone: the player puts them in the tray (autosing reads their text).
- **Decisions**: one module with two settings, not several modules. Layout
  (`challengeProgressLayout`): one line (`C14 > C7 > C5`) or one line each, filled from the top, C11-15 above C6-10
  above C1-5 (same order on one line). Details (`challengeProgressDetails`): none, completions (`C14 (90/96)`, the C15
  score in their place), completions and requirement (`… 9.3e34 / 1e51 Coins`, the lines layout only). No challenge
  names, no ✓, no tooltip, no click action ("none for now": max-completions look,
  tooltip with the game's lines, click opens the Challenges tab, all offered). Empty outside a challenge (the game's
  dimmed placeholder style in edit mode). **Text size (lines layout)**: room for two lines with one or two
  challenges, three with three (twice that with the requirement on its own line), so entering a second challenge
  keeps the size and only a third one shrinks it; not one size per line count: the text would change at each
  challenge. The room's lines fill the cell's height, above the module's normal size if the cell is tall, then shrunk
  to fit the width. In the tray (the text sizes the module there) and in the one-line layout, never above the
  module's normal size. Not for players without the live player (bookmarklet). On touch devices (the game's `isMobile`) the
  module is offered without the requirement (the game never writes its progress lines there).
- **One 250 ms timer, no observer**: only while the module is seen and the page is shown; written
  only on a change. Observers would be one on the 15 challenge buttons' `challengeActive` class plus one on the three
  progress texts, which the game rewrites up to every 50 ms (`fastUpdates`) in a challenge, and still a timer on mobile.
- **Data**: challenges and completions from the live player, the maximum from `__HS_getMaxChallenges`, the C15
  score and the requirement from the gold spans of the game's own line (`<<gold|…>>`, its number format), the
  resource word from the game's `reset.challengeProgress.resources.*`. No formula copied (`challengeRequirement` is
  not exposed).
- **Sizes**: the game gives `Tall` ("1x2") and `XL` only to its own progress and loadout modules
  (`isHeaderSizeAllowed`, by id). **1x2 allowed**, without a patcher change:
  `HSHeaderModules.register(id, unlocked, { sizes: ['Tall'] })`; an observer on the `disabled` attribute of
  `#headerSizeTall` enables it again while that module is selected (the game greys it at each render in
  `updateEditToolbar`; its click handler checks nothing). A game update that adds a check there only makes the button
  do nothing. `Tall` kept in the notes (`EXTRA_SIZES`), put back only for a module that still declares it. XL: no use.
  1x2 gives the lines layout a taller cell, while its single column can make the requirement text smaller than at L
  (the player picks). Stacking onto it left
  as the game does it (not a problem). **At 1x2 with the requirement shown** (lines layout), the requirement
  goes on a line of its own under each challenge: automatic from the game's `data-size`,
  no setting; text sized for four or six lines. **Short resource words in every language**:
  `Mythos`, `C10s` (was the game's "Mythos Shards" / "Challenge 10 Completions", too wide); Coins stays the game's
  translation. A text alignment setting for the cells (apart from Horizontal) was dropped. The
  text is `position: absolute` in the header's regions, so it never makes the row taller; in the tray (no cell to
  size it) it stays in the flow, else the module had no height and its text was cut.
- **Colours and columns**: the challenge in the game's tier colour (orange, limegreen,
  orchid), completions `#ccc`, requirement numbers `#999`, "/", the resource and ">" `#777` (the game's gold was too
  flashy). The lines layout is a CSS grid, six columns (challenge, completions, amount right-aligned, "/",
  requirement, resource), so every column lines up.
- **"CØ outside challenges"** (`challengeProgressShowNone`, off by default): a `#555` "CØ"
  instead of an empty module.
- **Stacked, from the left**: the game's stacked modules have fixed widths and sit at the
  stack's start; the module (as wide as the stack) was centred. Now `flex-start`, or the stack's own cell alignment
  (`data-hs-header-align` on the stack).
- **The game's ascension timer centred in a stack**: `#ascLen` has `min-width: 8em` (the
  game's, against bouncing) and a cell alignment sets `text-align` on the cell, which the box inherited (Center: the
  time in the middle of its box). Stacked, it keeps `text-align: left` under any cell alignment
  (`hs-header-cell-settings.css`), as the other modules keep their content at their start; checked headless under the
  quarks, all four alignments. Alone in a cell, an alignment still centres it. Without one, a grid stat is a fixed box
  (`calc(38px + 7.5em)`) centred in its cell with its content at its start: the timer (and a short text like the
  corruption level's) looks left of centre. The game's, not fixed.
- Settings: `challengeProgressHeader` (on by default; starts in the tray like every new module) in the block's "Mod
  modules"; the two choices as rows of buttons in its "Challenge progress" section, before the existing setting,
  renamed "Game's modules: numbers only" (kept as is, only renamed).
- **Settings with an action need a `settingControl`, even hidden**: the panel's sync runs `initialAction` only for
  settings with one. `compactChallengeText` had none, so it was lost at each reload with its checkbox ticked: given a
  hidden control like `ambrosiaMinibarBorders`.
