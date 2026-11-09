# Developer docs

Player documentation: [complete feature inventory](FEATURES.md), [feature audit](FEATURE-AUDIT.md),
and [public website](index.html). The website includes a browsable wiki; native GitHub Wiki pages are generated
in `wiki-source/`. Publishing and updates: [publishing the guide](dev/publishing-guide.md).

What the code doesn't say: how the game behaves where the mod depends on it, and each feature's rules and the
decisions behind them. Read a feature's file before changing that feature.

- `game/`: the vanilla game as the mod sees it. `behaviours.md` (DOM, text, numbers, errors that aren't the mod),
  `formulas.md` (why a re-implemented formula disagreed with the game), `updating.md` (what to check after a game
  update).
- `features/`: one file per feature: its rules, what was tried and rejected, and why. The header has five (`header-*.md`).
- `dev/`: working procedures. `code.md` (modules, logging, CSS timing, settings, class headers and authors), `releasing.md` (mod, Live merges and ports, loader), `tricks.md` (builds, git, files,
  same-numbers check, number formats), `sprite-icons.md` (reusing game icons with `HSIcons`).
- Test harnesses: `scripts/harness/README.md`.

**Shewchou** is the maintainer of the Dev channel (`maenhiir/synergism-hypersynergy`); "Shewchou's choice" marks a
decision made there, often after other options were tried. **Ferlieloi** (also XxMolkxX, or Molk; git author "XxmolkxX") maintains the Live channel
(`Ferlieloi/synergism-hypersynergy`). Dates are when a rule was written or changed.

Conventions for these files: one home per fact (elsewhere, point to it); no release state (pushed, tagged, on Live:
git knows); no personal data; no path into `local/` except what a tool creates there (`local/game/` by
`scripts/tools/update-game.cjs`, `local/harness-out/` and `local/account/` by the harnesses).
