# Working tricks

Procedures and traps met while working on the mod. The harnesses have their own README: `scripts/harness/README.md`.

## Builds

- **The dev server rewrites `build/` after every source edit**: a bundle check read from `build/` (module order, a
  before/after diff, the worker's content) can catch the watcher's rebuild instead of yours. Run `npm run build` only
  after the last edit and copy `build/hypersynergism.js` elsewhere at once. Look for a running dev server in the
  process list first.

## Git

- **Committing only your hunks of a file someone else also changed**: a temporary index
  (`GIT_INDEX_FILE=<copy of .git/index>`, `git read-tree HEAD`, `git apply --cached <your hunks>`, commit, then
  `git reset -q -- <path>` on the real index).
- **The vanilla game clone is partial** (`--filter=blob:none`): a history search (`git log -S`/`-G`) downloads every
  old file it reads, so limit it (`--since=`, a commit range). Never edit the clone (`git status` in it stays clean).

## Files

- **Files use LF.** A script that rewrites a file on Windows in text mode (Python's `open(p, 'w')`) writes CRLF and
  shows the whole file as changed: open with `newline=''` (or binary) and check `git diff --stat` afterwards.
- **Moving or splitting files** (one feature per file, by "several features in one file", not length): the move goes in
  its own commit with `git mv`, imports rewritten by resolving each against the old location, then `npx tsc --noEmit` and
  a build; the split comes in a second commit, then the in-game test. Update the paths in `AGENTS.md` and `docs/`. A
  split module gets a folder: the `HSModule` keeps its lifecycle and public methods (callers unchanged) and creates
  helper classes (not `HSModule`s, "Created by X." in their header); private state the helpers need goes through a small
  interface object built by the module (`hs-ambrosia-parts.ts`), not new public methods. The ~18 camelCase file names
  (`hs-autosingModal`, `hs-qolButtons`…) are renamed only when the file moves for another reason.
- Judged not worth splitting (2026-10-22): `hs-heater-optimizer` (one algorithm, a worker), `hs-autosing`,
  `hs-autosingModal`, `hs-ui`, `hs-gamedata`, `hs-hepteract-distributor`, data files, `patcher.js` (the loaders
  download it as one file), `hs-dev-tools` (must stay droppable). GDS was restructured separately
  (`docs/features/gds.md`, "API and calculations").
- The autosing strategy dropdown's options are filled twice at load (panel build, then `updateStrategyDropdownList`) on
  purpose: without the first fill, `syncSettings` warns "does not exist in select options" at each load.

## Same numbers before and after

For a change that must not move any number (a refactor of GDS or the heater), compare HEAD with the working tree on
real saves:
1. `git worktree add --detach <scratch>/head HEAD`.
2. Bundle the same node entry twice, once against the worktree and once against the tree (`scripts/harness/node-run.mjs`,
   an entry importing `<root>/src/mod/class/hs-core/gds/hs-gamedata-api`). Make it print everything the change could
   touch: `dumpDataForHeater()` (stub `getModule('HSGameData')` with `forceRefreshGameData`), and every Tools tab
   calculation (`HSGameDataAPI.Calculations` through `getCalculationFunction`: each option of the first param with
   options, reduced and with components; about 300 runs per backup).
3. Run both on every backup at hand and `cmp` the outputs. Check they aren't all errors before trusting "identical".
4. Remove the worktree.

## Which input causes a difference between two saves

When two saves behave differently (heater rows, a time), bisect the input instead of guessing from a list of fields
that correlate: on the heater's row counts, two guesses of that kind were wrong, and a field nobody had listed turned
out to be the cause.
1. A node entry on `scripts/harness/node-run.mjs` builds the input of both saves, lists the fields that differ (nested
   ones one by one, a `Decimal` as one field) and copies a given list of them from one save to the other. Anything
   that isn't under test, such as the budget, is set after the copy.
2. Run the save as it is, then with every differing field copied. The second run must give the other save's number
   exactly, or the method doesn't hold. The midpoint of the two numbers is the threshold for a drop.
3. Copy half the fields. If the number doesn't drop, try the other half; repeat on the half that does. If neither half
   drops, the cause needs fields from both.
4. Confirm the last field alone, in both directions.

## Number formats

The game formats numbers with the browser's locale, not the game language (`docs/game/behaviours.md`).
- **Another format in the real game:** close every Chrome window (and the tray icon), then start
  `chrome.exe --lang=fr` (or `de`, `en-US`): same profile, so Tampermonkey and the dev userscript stay. In the console,
  `new Intl.NumberFormat().format(1234567.5)` gives `1,234,567.5` (English), `1 234 567,5` (French), `1.234.567,5`
  (German); unchanged means a Chrome process was still running. `navigator.language` doesn't follow `--lang`, only
  `Intl` does. Starting Chrome normally gives the profile's format back. The Steam game's format wasn't checked.
- **Without the game:** a node script can port the game's `format()` and pass the locale to `Intl.NumberFormat` (node
  has full ICU): that is how `HSNumberParser` was round-tripped over 62 locales.
- Headless Chrome formats numbers in the system's locale.
