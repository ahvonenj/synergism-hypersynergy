# Test harnesses

Scripts that run the mod outside a player's browser: the real game headless in Chrome, or the mod's formulas in node.
They are for checking a change before an in-game test, reproducing a player's report on their save, and timing things.
They never replace the in-game test.

Everything they write goes to `local/harness-out/` (git-ignored).

## Setup

- Node 22 or later (the scripts use Node's built-in `WebSocket` and `fetch`), `npm install` at the repo root.
- Google Chrome. Set `CHROME_PATH` if it isn't at the usual place.
- `node scripts/tools/update-game.cjs`: clones the official game source into `local/game/SynergismOfficial-master`
  (on the first run, pulls on later runs) and downloads the live bundle to `local/game/out.js`. The harnesses serve
  the game from there. Run it again after a game update.
- `npm run build` (or the dev server running): the harnesses inject `build/hypersynergism.js`. With the dev server in
  watch mode, a source edit rebuilds it under a run that is going on.
- A save: an HS backup (`.json`, from the mod panel) is best: it holds the mod's settings and strategies, and since
  59f71ca3 the heater data with the PseudoCoin levels and quark bonus. A game export (`.txt`) works where noted.
- Optional, `local/account/`: your own answers to synergism.cc's 3 account requests, as `stripe-upgrades.json`
  (`/stripe/upgrades`), `quark-bonus.json` (`/api/v1/quark-bonus`) and `users-me.json` (`/api/v1/users/me`), copied
  from the browser's network tab while logged in. With them the game has your PseudoCoin levels and quark bonus;
  without them, ambrosia speeds come out several times lower. They are personal data: they stay in `local/`.

## No traffic to synergism.cc

Every Chrome these scripts start has `synergism.cc`, `*.synergism.cc` and `api.github.com` mapped to nothing
(`lib/chrome.cjs`): the game's dev asked for less traffic, and GitHub's API allows 60 requests per hour per IP, shared
with your own browser. The game-server harnesses also stop every synergism.cc request inside Chrome and answer only the
3 account requests from `local/account/`. Keep it that way in any new script.

## The scripts

| Script | What it does |
|---|---|
| `game-smoke.cjs [save]` | Real game, patched, + save + mod. Reports patches that failed, page exceptions, requests that tried to leave localhost, a screenshot. `PATCH=0` unpatched (a bookmarklet player), `MOD=0` game only. **Copy it into `local/` to start a one-off test.** |
| `autosing-run.cjs <backup> [sings] [minutes]` | Autosing on a backup: restores its mod data, imports the save, starts autosing, samples every second. Output in `local/harness-out/autosing/<TAG>/`: `console.log`, `samples.jsonl`, `modal.txt` (the run panel's figures), `timings.json` (the recorder's: the run turns on "Record step timings" unless `STEP_TIMINGS=0`), `end.png`. Env in the file's header (`TAG`, `DEBUG=0`, `SETTINGS`, `STRATEGIES`, `HEAT=1`…). |
| `autosing-sweep.cjs <backup> <target>...` | One `autosing-run` per singularity target (heat at the target, then 10 timed singularities); prints each target's figures. |
| `autosing-watch.cjs <tag>` | Prints a running autosing run's key lines; exits when it ends. Use it rather than `tail -f`, which locks the log on Windows. |
| `loader-https.cjs` | The browser loader on the real game page (pseudo-corp.github.io), run at document-start as Tampermonkey does. `PATCHER=local` (the repo's `patcher.js`) or `live` (jsDelivr). |
| `node-run.mjs <entry.ts> [args]` | Bundles a TypeScript entry that imports the mod's code (`@repo/...` = `src/mod`) for node, with browser-only modules stubbed, and runs it. The entry names its stubs in a comment: `// harness-stubs: gds`, `heater` or a regex. |
| `node/gds-on-save.ts <save> [overrides]` | `HSGameDataAPI` on a save: ambrosia per hour, luck. Copy it to check another figure. |
| `node/heater-bench.ts <backup> <branch[+branch]>` | One heat in node on a backup's heater data, with per-stage times and peak memory. `SWAP=hs-heater-optimizer-engine.ts=<copy>` compares a modified engine on the same input. |
| `hepteract-distributor.cjs <save>` | Presses the real Hepteract Distributor on the real game, on states set through the dev tools: an expansion paid back to the unit, a partial step ending the plan, a normal run. Prints each check, exits 1 if one fails. The save needs Chronos, Hyperrealism, Challenge and Abyss unlocked, outside Exalts 3 and 7. |
| `gds-player-keys.cjs` | After a game update: vanilla `Player` keys against the mod's `GameDataFields`. |
| `gds-vs-game.cjs <save> [--write]` | The real game's Stats for nerds at full precision on about 50 states of a save, for `scripts/tests/test-gds-formulas.cjs`. Rewrites the served bundle to report raw values, here only. 3 minutes. How to use it: `docs/game/updating.md`. |

Typical times: a game load with a save and the mod, 25 s; one autosing singularity on a S260 save, about 7 s; a full
heat on a S260 save in node, about 100 s.

## Pitfalls

- **A leftover Chrome on a debug port** gets driven instead of the new one: the scripts refuse to start then. Stop it
  by its PID (never by a name pattern: the developer's own Chrome has the same name). The scripts kill their whole
  Chrome tree at the end; a script killed from outside (a timeout) can leave one behind.
- **Two Chromes on the same profile fail to start**: run tests that share a profile one after the other.
- **A wait loop must throw when it gives up.** One that goes on silently lets a test "pass" on a game that never loaded.
  `waitGameReady` throws.
- **With synergism.cc blocked, the game asks a PseudoCoin Confirm at load** and keeps the loading screen until it is
  answered. `waitGameReady` answers it.
- **`importSave` skips the game's offline progress** (`offlinetick` set to now in the save; 1 s to import, against over
  3 minutes on a save a week old). `{ offline: true }`, or `OFFLINE=1` in `game-smoke` and `autosing-run`, keeps it, for
  a test of offline progress itself. Runs since this change start without offline gains: compare them with older
  autosing figures with care.
- **A profile keeps the game's last save**, and the game runs its offline progress at the next load, before any import:
  a stuck save blocks every later run on that profile. `launchChrome({ fresh: true })` empties the profile first
  (`game-smoke`, `autosing-run`); a one-off script does the same unless it needs what the profile holds.
- **To test a state, change the live player on one save** (`game.PLAYER`) rather than loading another save; another save
  only to reproduce a player's report, or for values the game recomputes at load (below).
- **`injectMod` sets `HS_LOADER_INITIALIZED`**: the mod takes itself for a userscript, even on `PATCH=0`. For a
  bookmarklet player, add the `/mod.js` script tag without that flag (it changes `HSPlatform` and subtab memory).
- **The "Hypersynergism loaded" notification covers the top of the header** for a few seconds: wait before clicking there.
- **Headless Chrome formats numbers in the system's locale** (`6,336e93` in French). Parse displayed numbers with that
  in mind, or read the player object (`game.PLAYER`) instead.
- **The game resets some values at load**: C1–C10 completions are set to their caps, Exalt completions are recomputed
  from `highestSingularityCompleted`. A test save that changes them must change what the game recomputes them from.
- **Console lines from before the last navigation** are replayed by `Runtime.enable`; `cdp.logs` keeps only those after
  `cdp.navigate()`.
- **The harness's Chrome never throttles timers** (`lib/chrome.cjs`), so a run can't show what a hidden tab does. To time one: a headed Chrome without those flags, no focus emulation, the game tab behind a second tab opened with `/json/new`. `/json/activate` and `Page.bringToFront` raise the window and take the keyboard from whoever is typing.
- **The heater's Import All uses the clipboard**: `autosing-run.cjs` grants the permission and emulates focus.
- **A `:hover` state can't be screenshotted**: force it with an extra style.
- **Under about 1000 px of width the game switches to its mobile layout**: the scripts use 1400–1600.
- **GDS formulas change between builds.** For a player's report, run their build: `git worktree add --detach <dir> <commit>`.
- **An https page can't reach `http://127.0.0.1`** (Chrome's local network protection): `loader-https.cjs` keeps the
  jsDelivr URL and answers it with the local `patcher.js` through CDP `Fetch.fulfillRequest` (works for a synchronous
  XHR too).
- **A save's `headerLayouts` never string-equals the live one**: the patcher's strip leaves empty `[]` slots the saved
  copy doesn't have. Compare `hidden` or the changed module instead.
- **Settings > Load from file** is `#settingstab` then `#switchSettingSubTab1` (subtab memory may open another subtab).
- **A count of processes matching a command line also counts the shell doing the search.**
- **Check a node run against the player's other loadout slots**: without PseudoCoin/quark data, the ambrosia, cube and
  octeract slots still matched exactly; quarks, Obtainium and Offerings were a few levels off.
- **A few fields of a backup's base64 `save`** can be read without the file: decode a copied fragment at offsets 0–3.

## Building blocks (`lib/`)

- `env.cjs`: paths (`paths.repo`, `gameDir`, `gameBundle`, `modBuild`, `patcher`, `accountDir`), `outDir()`, Chrome's path.
- `chrome.cjs`: `launchChrome({ port, profile, width, height })` → `{ pid, kill }`.
- `cdp.cjs`: `connectCdp(port)` → `send`, `on(method | 'log')`, `evaluate`, `waitFor`, `navigate`, `click` (trusted:
  `event.isTrusted` is true), `mouse`, `setFiles`, `screenshot`, `logs`.
- `game.cjs`: `startGameServer`, `interceptGameServer`, `waitGameReady`, `answerDialog`, `readSaveFile`, `decodeSave`,
  `importSave`, `restoreModData`, `injectMod`, `PLAYER` (the live player object's expression).
- `node-stubs.cjs`: the esbuild stubs to run the mod's code in node (`PRESETS`, `loadStubs`), for `node-run.mjs` and tests.

## Without the real game

**The mod's UI alone** (a layout or CSS check before an in-game test): an entry that imports the renderer and its styles
class, injects the CSS in a `<style>`, builds sample data by hand and sets `innerHTML`; bundle it with the repo's
esbuild (`format: 'iife'`, `tsconfig` given explicitly: a stray `tsconfig.json` in a parent or Temp folder breaks
esbuild's lookup) and a plugin stubbing `hs-core/hs-ui` (or the import pulls the whole mod in). The page:
`<base href>` pointing at the game source folder (`local/game/SynergismOfficial-master/`) so `Pictures/...` load, body
font "Segoe UI" (the game's default on Windows), dark background. The game's look: `<link rel="stylesheet"
href="Synergism.css">` plus the blocks needed cut out of the game's `index.html` (balanced `<div>` extraction); the
theme's text colours don't come with it. Without the game's CSS, buttons differ (`button { font-size: 0.75em;
min-height: 30px }` in the game) and widths are approximate: say so. Screenshot with
`chrome --headless=new --disable-gpu --allow-file-access-from-files --hide-scrollbars --force-device-scale-factor=2
--window-size=W,H --screenshot=<png> <page>` (from Git Bash, prefix `MSYS_NO_PATHCONV=1 MSYS2_ARG_CONV_EXCL="*"` or
the arguments are rewritten); measure by having the page write widths into a `data-` attribute read back with
`--dump-dom`, or through `lib/cdp.cjs`.

**Mod classes on a fake game page** (behaviour with real clicks): a small fake page served over http (not `file://`,
so `localStorage` and reloads behave), the real classes bundled in, driven with `lib/cdp.cjs`: `click` gives trusted
events, so code checking `event.isTrusted` or `window.event` can be tested; `evaluate` with a `setTimeout` stands for
mod code. Stub `hs-logger`, `hs-module-registry` and `settings/hs-settings` (an esbuild `onResolve` plugin);
`hs-gamestate`, `hs-global`, `hs-storage`, `hs-elementhooker` and `hs-utils` bundle as they are. Used for subtab
memory, the strategy editor windows (fake `Modal`), the timed export (an OPFS folder for the picked one) and the dev
tools (`--dump-dom` doesn't wait for IndexedDB: use CDP).
