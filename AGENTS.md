# AGENTS.md

Guidance for coding agents (Codex, Claude Code…) working in this repository. "The developer" below is whoever you
work with; people named elsewhere (Shewchou, Ferlieloi) are the maintainers.

## Project

HyperSynergism is an unofficial quality-of-life mod for the browser/Steam game [Synergism](https://synergism.cc/). It doesn't automate the game, apart from the opt-in autosing module.

- **Vanilla game source (read-only):** `node scripts/tools/update-game.cjs` clones or pulls the official repo into `local/game/SynergismOfficial-master`, fetches the live bundle into `local/game/out.js` and runs `patcher.js` on it. Use it for formulas, save-data shapes and DOM ids; never edit it. GitHub's `master` can be ahead of the deployed game. After a game update: `docs/game/updating.md`.
- **`docs/` (committed):** `game/` how the game behaves, `features/` one file per feature with its rules and decisions, `dev/` procedures (`code.md`, `releasing.md`, `tricks.md`). The rest is the player website and wiki, generated from `docs/data/` (`feature-catalogue.json` and the players' guides in `guides/`): edit those, never the generated pages (`docs/dev/publishing-guide.md`). People are named there (Shewchou, Ferlieloi), never "the user": each developer's agent would read that as its own user. No personal data.
- **`local/` is git-ignored**: it exists only on your disk, so tracked code and docs never point to it, except to what a tool creates there (`local/game/`, `local/harness-out/`, `local/account/`). Your saves and design docs go there too. Search tools skip it by default: give the path explicitly.

## Where knowledge goes

Each kind of knowledge has one home. Write it there and nowhere else; elsewhere, point to it.

| What | Where |
|---|---|
| Rules that most tasks need | this file, one or two lines each |
| The detail of a cross-feature rule | `docs/game/`, `docs/dev/`, or the feature file it belongs to, with a pointer here |
| One feature's full rules and the decisions about it | `docs/features/<name>.md`, with a 1–2 line summary + pointer here |
| One developer's preferences, refusals ("don't propose again"), backlog ideas | that developer's private notes (agent memory, a git-ignored local instructions file) |
| The design of work in progress | a design doc in `local/`; once done, mark it as history at the top |

Keep this file short. Never write release state (pushed, tagged, on Live) anywhere: git knows, and such lines go stale. Read a feature's file before changing that feature. When you edit one, cut the history and test logs that no longer explain a current rule. Every rule in `docs/features/` is a maintainer's decision: change it only when asked, and never re-propose a rejected option. Write a rejected option as one clause with its reason ("not X: why"); no who, no when.

## Commands

- No linter. Type check with `npx tsc --noEmit` (esbuild doesn't type-check).
- `npm test` runs every script in `scripts/tests/`; one alone: `npm run test:autosing` / `test:auto-export` / `test:heater` / `test:heater-coins`, or `node scripts/tests/<file>.cjs`. Add a test with a task that touches pure logic (data in, data out: migrations, allocations, formulas, sorting) that was hard to get right or would regress unnoticed; never for UI, DOM, dialogs or timing.
- `scripts/harness/` (read its README first): the real game headless in Chrome and the mod's code in node. A one-off test script goes in `local/`, built on `scripts/harness/lib/`, never in a temporary folder. Reusable scripts that need nothing from `local/`: `scripts/tools/` (also dead-code analysis).
- `npm run build`: dev build to `build/hypersynergism.js` and loader files in `build/`. `npm run dev` watches both; restart it after changing the `package.json` version (`HS_BUILD_VERSION` is a `define`). `npm run build:loaders` regenerates the checked-in loader files. `start-dev-server.bat`: watch build + `http-server ./build/ --cors` on port 8080.
- `npm run release`: minified build to `release/mod/hypersynergism_release.js`, committed, served to players by jsDelivr, the only build without the dev tools. It is rebuilt only by a release, never by a commit. `npm run release-and-tag-helper` does a whole release. Releases, merging Live into Dev, porting to Live, loader releases: `docs/dev/releasing.md`.
- Every build regenerates the strategy manifest (`scripts/generate-strategy-manifest.js`) and bundles the heater web worker separately (`scripts/heater-worker-plugin.cjs`).
- **Every release requires a website changelog entry** in `docs/data/changelog.json`, matching its version, channel and player-facing changes. Live regenerates and validates the page before publishing; Dev only validates (`build-docs.py --validate`) and never commits `docs/changelog.html`. Required steps: `docs/dev/releasing.md`.
- Desktop loader (`synergism_modloader/`, its own npm package and version): `npm start` (Electron app), `npm test` (`node --test test/*.test.js`), `npm run dist` (installer).

## Architecture

### Loading pipeline (`docs/features/loaders.md`)
- **The mod depends on `synergism_modloader/lib/patcher.js`**: `patchBundle()` rewrites the game's minified bundle before it runs and exposes internals as `window.__HS_*` globals. Browser: the userscripts in `src/loader/` patch the fetched bundle. Steam: the Electron app patches the extracted asar.
- **Both loaders download `patcher.js` from the repo** (browser at each page load from `master`, Steam at each re-patch): a patcher fix needs no loader release.
- **Edit loader code in `src/loader/shared/`** and regenerate the standalone files with `npm run build:loaders`. See `docs/features/loaders.md` for the published entry points.
- **Two repos.** `maenhiir/synergism-hypersynergy` (Shewchou) is the Dev channel; `Ferlieloi/synergism-hypersynergy` is the Live channel and the userscript's default. Remote names differ between clones: check `git remote -v`.
- **A patcher global has two sides**: the injection in `patcher.js` and the mod code that reads it. Update both. `window.__HS_PATCH_REPORT` says which patches applied; a missing patch's steps are skipped and the player told once.
- **Not every player is patched**: bookmarklet players have no `window.__HS_*` and no `HSGlobal.exposedPlayer`. Code that uses a patcher feature checks that it exists and falls back. Some globals are set late (`__HS_i18next`, `__HS_synergismStage`, `DOMCacheGetOrSet`).
- **On Steam the mod starts before the save loads**: code run at init reads the game's blank player. Anything taken from the save (a guess, a note, a cache) waits for `HSUtils.isGameLoaded()` (`docs/features/loaders.md`).
- **Patcher anchors**: find game code by what it does (string literals, property names minification keeps) through the existing finders, never a call-site shape or a minified name. How, and what to check: `docs/features/loaders.md`.

### Vanilla game behaviours (`docs/game/behaviours.md`)
Prefer the game's state (`HSGlobal.exposedPlayer`, GDS data) or signals it keeps up to date over displayed text.
- **Periodic display updates skip hidden tabs** (stale counters until opened) and pause while the offline popup is open.
- **A reset sends the player to Buildings and forgets every subtab**; clicking a locked tab opens the next unlocked one: check a button is visible before clicking it. A patch never skips `resetAllSubTabs()`.
- **Text is translated**: never compare it against English; use `HSUtils.getGameTranslation(key, vars?)` or a non-text signal.
- **Displayed numbers follow the browser locale** (read them with `HSNumberParser`, never `parseFloat`) and are truncated to 3 digits: never compare two of them to decide something.
- **The header is made of modules the player arranges.** The mod adds its own modules (ids `hs` + a capital letter, never in a save), decorates the game's, and keeps its header settings in edit mode (`HSHeaderEditSettings`: a new header setting goes in its `SECTIONS`). `docs/features/header-*.md` (start with `header-modules.md`).

### Game dialog queue (`docs/features/dialogs.md`)
- **`Confirm`, `Alert`, `InfoAlert`, `Prompt` and `PurchasePrompt` share one first-in, first-out queue** in `#confirmationBox`. Game actions chain dialogs after an `await`; every ambrosia loadout load shows an `Alert`. A dialog left open blocks every dialog behind it and freezes autosing.
- **The patcher's dialog hook and `HSGameDialogs` answer dialogs** (mod sessions, orphans, autosing, hidden dialogs). Read the doc before changing either or any code that answers dialogs.
- Ambrosia loadouts can be written without SAVE mode or dialogs (`player.blueberryLoadouts[n] = tree`).

### Mod code (`docs/dev/code.md`)
- Every feature is an `HSModule` subclass, registered once in `hs-core/module/hs-module-definitions.ts`. Modules use `HSModuleRegistry.getModule('ClassName')`, whose return type follows the name; `HSModuleManager` handles construction and initialization. Details: `docs/dev/code.md`.
- **`HSLogger` lines are HTML**: escape with `escapeLogText`, not `escapeHtml`. A new log context needs a colour entry.
- **Injected CSS lands late**: a module drawing game-styled elements during `init` injects its CSS and calls `HSUI.flushInjectedStyles()` first.
- **Settings are data**: `hs-settings.json` + `HSSettingsDefinition`; a `settingAction` needs a handler; `settingControl` is for UI only. Persistence and startup actions: `docs/dev/code.md`. No double quote in a help text.
- **Game icons**: reuse one through `HSIcons`, read from the game's element by its id (`docs/dev/sprite-icons.md`).
- **Tooltips**: a browser `title` by default; `HSTooltip` for colours, a shorter delay or a chosen side (`docs/dev/code.md`).

### GDS (Game Data Sniffing): `hs-core/gds/` (`docs/features/gds.md`)
- `HSGameData` reads the live player every 500 ms when patched, else captures the save. The live player is the same object at every read: never key a cache by it. `HSGameDataAPIPartial` is the actual API, `HSGameDataAPI` the game-formula calculations.
- **The calculations re-implement vanilla formulas**: check them against the vanilla source (traps: `docs/game/formulas.md`); `test-gds-formulas.cjs` replays the real game's values (`docs/game/updating.md`). A shop upgrade's level goes through `getShopLevel`.
- **The GDS setting (bookmarklet players only) and the engine are separate**: pause with `pauseGDS(reason)` / `resumeGDS(reason)`, check `isGDSRunning()`; nothing turns the setting off.
- **No extra traffic to synergism.cc**: no WebSocket, no periodic fetch, every request carries `X-HyperSynergism-Version`.
- **Every save load goes through the game's `importSynergism(input, reset)`**; `__HS_onSaveImport(reset)` stops autosing when `reset` is false. It runs at every singularity: keep the `reset` path one test.

### Feature modules
- **Autosing** (`hs-modules/hs-autosing/`): JSON strategies (defaults in `resource/json/strategies/`, validated in `hs-strategy-manager.ts`). Speed comes first in its main loop (no extra awaits, listeners or polling). `docs/features/autosing.md` (start there; also `autosing-strategies.md`, `autosing-editor.md`).
- **Heater** (`hs-modules/hs-heater/`): Ambrosia loadout optimizer in a web worker, which can't import `HSLogger`. `docs/features/heater.md` (start there; also `heater-optimizer.md`).
- **Hepteract Distributor**: many of its choices were reversed at least once; update the panel's `HELP_LINES` with it. `docs/features/hepteract-distributor.md`.
- **Version check**: `compareVersionTags` and the release helper's `compareVersions` must sort the same way. `docs/features/version-check.md`.
- **Backup**: a backup file is untrusted. `docs/features/backup.md`.
- Others, one doc each in `docs/features/`: quickbars (`HSQuickbarManager`), GQ distributor, auto export, subtab memory, tools tab, platonic tooltip, perk search, log.

### Dev tools (`docs/features/dev-tools.md`)
`HSDevTools` edits the live player and must never reach players: used only under `if (HS_DEV_BUILD)`, the string `hs-dev-tools` kept out of release code (`esbuild.config.js` refuses such a bundle), no static fields or side-effect imports, not an `HSModule`.

## Working with the developer

### Steps, tests and commits
- **Before editing, in multi-step work: recap and ask the open decisions**, each with a recommendation. Small behaviour-free follow-ups in the topic at hand can be done first and recapped after.
- **After implementing:** type check and build (plus the loader tests if `patcher.js` changed), then give an in-game test list the developer can follow cold: the setup, then for each check where to click, the exact value expected and what counts as a bug. The dev tools can set up the save.
- **Commit only when explicitly asked**: "tests passed" or an earlier "ok" is not a request. After any change since the developer's tests, ask for a retest first.
- **A commit holds only your own work**: `git add` explicit paths (never `-A` or `commit -a`), check `git diff --cached --stat`, say which files were left out. Only your hunks of a shared file: `docs/dev/tricks.md`.
- **When a design grows**, point out which decisions drive the complexity and offer the simpler variant.

### Before claiming or estimating
- **Search the repo before saying something is missing or sizing work**; game formulas: GDS first.
- **A claim a conclusion rests on (what code does or costs) comes from reading that code**, not its comments, names or notes; otherwise say it's unchecked.
- **Release status comes from git, never from notes** (`git tag --contains`, `git log <tag>..master`). Live is ported by hand: check it by content (`git grep -l <string> <live remote>/master`).
- **Ask for real game data before testing on made-up inputs** (save, HS backup, heater export, as a file); carry on with synthetic cases while waiting.
- **Estimate a run's size before an exhaustive check** (table sizes from a cheap first run); over a minute or two, narrow it first.

### Processes and traffic
- **Stop your own background processes by PID** or a path only your run uses, never by name: the developer's dev server and Chrome share the names.
- **Tests never reach synergism.cc or GitHub's API**: the harnesses block both; keep it so in any new script.

### Player-facing UI
- **Texts are short: what it does**, nothing the player sees happen anyway. A detail for one platform is shown only there.
- **Avoid layout shifts on a state change** where you can: show an armed, busy or error state inside the element's own box (overlay, colour, tooltip) or reserve its room.
- **Secondary numbers and labels in discreet greys**; game colours only where they carry meaning (tiers, currencies).
- **A change to how a game element looks for every player gets a setting**, on by default, whose off state gives the game's exact look.
- **Log every refused player action and every dialog the mod answers**, with the reason.

### End of a reply
- **Checking changes:** before changing shared code, check the callers of changed functions and the readers of changed state, one level deep; list what was checked and what wasn't.
- **Refactor suggestions:** when a feature clearly needs a larger refactor (piled-up workarounds, features fighting over the same thing), say what, why and roughly how big; don't start it without the go-ahead.

## Conventions
- Class header comment (`Class / IsExplicitHSModule / Description / Author`), `#` private fields, `hs-<name>.ts` files, `HS` class prefix. Who goes in `Author:`: `docs/dev/code.md`.
- Files use LF line endings.
