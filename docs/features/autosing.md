# Autosing (`hs-modules/hs-autosing/`)

The autosing docs: `autosing.md` (the run), `autosing-strategies.md` (strategy format, conversions, default strategies), `autosing-editor.md` (strategy and actions windows). Players' guide: `docs/data/guides/autosing.md` (published to the website and wiki by `scripts/tools/build-docs.py`), updated with any change players see. Autosing's place in the dialog queue: `docs/features/dialogs.md`.

Singularity automation driven by JSON "strategies" (`autosing-strategies.md`). The main loop is in `hs-autosing.ts`, the run panel (timer window) in `hs-autosingModal.ts`.

## Speed comes first where it counts
Autosing loops singularities for hours, so what runs inside its main loop, and the mod's background work and other features while it runs, must be as light as possible.
- No extra awaits, listeners or polling in the loop: plain boolean checks. Features may stay off during autosing for simplicity.
- Stop and pause latency doesn't matter (half a second later is fine), nor the "Finish & Stop" push at the end of a singularity (still maintained).
- No added complexity for negligible gains; prefer designs that survive game updates.

## Runs never overlap
A stopped chain sleeping past a restart would otherwise wake up, see the shared `#autosingEnabled` flag `true` again (the new run's) and run alongside the new run.
- The chain promises (the main loop, and the final stage started by the antiquities observer) are kept in `#chains` (`#trackChain`). `#startAutosing()` first waits for them (`#waitForPreviousChains`: after 10 s the start is cancelled with a warning and a notification), then runs `#isStartCancelled()`.
- Known limit, kept: an old chain can still do one action between its wake-up and its next flag check.
- Rejected (built and reverted: needlessly heavy, the smallest mechanism that removes the overlap wins): a per-run object passed to every chain function with a check after every await (66 checks, 24 signatures), throwing-wait or `AbortController` variants.

## Starting and stopping
- **The settings fixer uses a fresh game save on every loader**, including patched players (`HSGameData.forceCaptureRawSaveSync`). It compares saved scalar values with AutoSing's requirements and uses native controls only for differences, then verifies with another fresh save. It never infers state from labels, colours, borders, or hidden inputs, and never visits tabs. Selecting a challenge to change its auto-run toggle does not enter it.
- **The original values of all 92 managed game settings are kept in memory before the first change**, including toggles, modes, buy amounts, opening percentages, challenge timers, rune purchase amounts, corruption auto-increase and ambrosia load/save mode. Stop, Finish & Stop, and failed/cancelled starts restore those values from a fresh comparison after startup and the stopped strategy chains finish. Already-correct startup settings are captured too, since a strategy may change them later. Only these settings are restored; progress and settings outside the fixer are left alone. This is session-only: reloading the page loses the snapshot.
- **Restart keeps the first snapshot** and rechecks requirements from a fresh save; the eventual stop restores the pre-AutoSing values. Loading another save discards the snapshot immediately (including on the unpatched file-import path), so deferred cleanup never changes the imported save. Cancelling the import still leaves the snapshot discarded.
- **Unreadable or unrecognized saved settings cancel startup before any setting changes.** A missing/refused control fails verification, stops startup and attempts restoration; a restoration failure warns in the mod log and a notification. Game changes are synchronous; deferred cleanup is tracked with the previous run's chains so a new start waits for it.
- The three performance settings (`enableAutomationQuickBar`, `ambrosiaMinibars`, `ambrosiaRateHeader`) also keep their original on/off values through Restart and restore on stop. GDS is paused by reason and resumed separately; its setting is unchanged.
- **A save load stops autosing** (`docs/features/gds.md`, "Every save load"): notification "Auto-Sing stopped: a save was loaded". A game reset (delete save) during autosing is left alone (same `reset = true` as a singularity). No login path loads a save (account forms, Discord / Patreon, account linking), so logging in never stops autosing.
- **The timer window's footer shows the patch state** (`#showPatchState`, right of "Module Version"): "Patched", "Patch incomplete", "Patch incomplete · slow" or "Not patched · slow", the parts found as its tooltip (set once per start).
  - Each fast path only needs what it reads (`#hasStageFunc`, `#hasLivePlayer`, `#hasMaxChallenges`); "slow" means one of them falls back to the DOM, shown bold orange.
  - A missing dialog hook, tack hook or export output is "incomplete" without "slow" (`docs/features/dialogs.md`).
  - To see that state: a temporary `|| true` in the dialog hook's `if (!allFoundOnce)` in `patcher.js`, never committed.

## Exalt entry and exit in one go
`#enterAndLeaveExalt`, `#waitForExaltState`.
- The game sets `data-inside-singularity-challenge` on `<html>` inside the reset (`revealStuff()`, run by the reset's first tab change), so a `MutationObserver` on it fires right after the reset.
- With the dialogs answered at once (patcher hook), the entry, the exit and the tab restore happen in the task of the first click: no game tick runs inside the Exalt and Buildings is never painted.
- Patched players still read `player.insideSingularityChallenge` and still poll it at each game tick: the attribute only wakes them earlier, and without it (a game update) the tick ends the wait. Bookmarklet players read the attribute.
- With debug logs on, a line gives the time taken and how many waits a tick ended (0 when the attribute did).

## A hidden browser tab
`HSUtils.sleep`.
- The browser fires a hidden tab's normal timers once a second at most, and chained ones once a minute after 5 minutes; a worker's timers aren't throttled. The game's tick uses worker timers and keeps its speed. With normal timers, autosing's waits took a singularity from about 6 s to about 15 s (S260 save, first minute hidden).
- While `document.hidden`, `HSUtils.sleep` goes through a small worker created at the first such sleep. In a visible tab it is the normal timer plus one boolean check. If the worker fails: a warning, normal timers from then on, and a sleep running in it ends early rather than never.
- Always on: no setting, nothing is gained by turning it off.
- These stay on normal timers and can fire about 1 s late: the restart delay (button and action 902), the 5 s text refresh limit, and the challenge time limit in `#waitForCompletion`'s DOM fallback, the only one that can cost a run time (mainly bookmarklet players). The run panel doesn't draw while hidden, whatever the timer.
- The mod can't prevent Chrome's Energy Saver freeze, which suspends the page's tasks: players turn it off (the players' guide). Not a silent audio track: Chrome doesn't count it as sound. The wake lock below doesn't help here: the browser releases it when the tab is hidden.

## "Keep the PC awake" (`autosingKeepAwake`)
`HSAutosingWakeLock`.
- On by default: a player running autosing expects the PC to stay awake. Off, the mod never requests the lock.
- A screen wake lock, held from `#autosingEnabled` turning true to `#stopAutosingCore`, so every stop, restart and save load releases it. Changing the setting during a run applies at once.
- The browser releases it when the tab is hidden; a `visibilitychange` listener, there only during a run, requests it again when the tab comes back. So a session in another tab or a minimized window isn't protected. Nor, in Chrome on Windows, is a fully covered window or a locked PC: the lock goes, and comes back by itself (within 5 s of Win+L and of unlocking).
- On Steam the lock stays while the window is minimized or fully covered and while the PC is locked (measured for 1 minute locked), likely because the game's window sets `backgroundThrottling: false`.
- To check it on Windows: `powercfg /requests` in an administrator shell lists the browser or `Synergism.exe` with "Blink Wake Lock" under `DISPLAY` and `SYSTEM`.
- The web has no "PC awake, screen off" lock: the screen stays on, and the idle auto-lock can be blocked.
- A refusal gives one notification per start, and a log line: logs are off during a run unless debug logs are on. A tab hidden during the request isn't a refusal.

## The player's tab comes back
`#notePlayerTab` / `#showPlayerTab`.
- The tab is noted before each singularity, and before each DOM stage read (bookmarklet players: that read visits Settings > Stats).
- It is opened again right after the Exalt exit, and after each DOM stage read, through `HSSubtabMemory.openForPlayer` (subtab included).
- A locked tab (its button's computed `display` is `none`) is never clicked: the game would open the next unlocked one. The player stays where the game left them (Buildings), and that tab becomes the one to bring back until they open another.
- No return to a tab once it unlocks again: built as a setting and removed; don't propose it again.

## Going to the target singularity
Each Exalt exit lands on the highest singularity (the game's `exitChallenge`), then autosing goes down to its target.
- **With the live player**: `player.singularityCount` is written directly. The player's saved Elevator target stays as it is: locked, it decides their next singularity.
- **Without it** (bookmarklet players): the game's Teleport button, which goes to the saved target. So at each start, autosing writes its target into `#elevatorTargetInput` and sends `change`, the only event the game reads there; a reset keeps the target. It stays at autosing's value after the run, not restored: the next run needs it anyway.

## Corruption level
Since the game's 4.4.0: one level (`player.corruptions.next`, used from the next ascension) instead of 8 corruptions.
- **Setting it**: `HSAutosingCorruption` goes through the game's `#corruptionLevelInput` + a `change` event (the game's `setNextCorruptionLevel`: synchronous, no dialog, no patch, the same for bookmarklet players). It reads the level back from the live player, or from that input (the game writes the level it kept there).
- **The game lowers a level** above what the player can reach now, silently: 0 before C11 in the singularity, then `highestCleared` + 2 (+1 before singularity 2; `highestCleared` survives a singularity). No other cap since the game's commit `4823674d` (the 4/8/14/20 caps at C11–C14 and the Platonic / GQ / Octeract raises are gone). So a call is skipped only when the game's level already equals the target (not the last level asked): a lowered level is asked again by the next 403 step.
- **The game adds the free reward levels** on top of the actual level: a strategy sets actual levels, not effective ones (an "effective level" action was tried and removed: `autosing-strategies.md`).
- **Only 403 steps set a level** (no phase level), plus two fixed zeros:
  - each singularity starts at 0 (the game rebuilds `player.corruptions` at a singularity, `next` = 0: nothing to set for the first phase);
  - `#performFinalStage` calls `#setCorruptionLevelAndAscend(0)` before the AOAG phase (AOAG always needs 0).
- **The end-of-singularity push** uses the game's Max button (`#corruptionLevelMax`).
- **The settings fixer unticks the game's "auto increase"** (`#corruptionAutoIncreaseToggle`): each newly cleared level would raise the next level over the strategy's.

## "Set corruption level" (403) and resets
`#setCorruptionLevelAndAscend`. The step's "Ascend immediately" checkbox (`ascendAfterCorruption`):
- **Ticked** (default): sets the level, then resets at once: inside an ascension challenge it clicks Exit Ascension challenge (records C15's score; a plain Ascend there keeps the challenge and clears the coins), else Ascend; then waits for the dialog queue if a confirm is showing. It never skips the reset because `next` already matches. A 403 inside C15 leaves C15 at once. Corruption tests showed this fits how the game works.
- **Unticked**: only sets `next` (`HSAutosingCorruption.setLevel`), for a later Ascend or challenge to apply.
- "Exit Ascension challenge" (103) also applies `next` (`reset('ascensionChallenge')`), but only inside an ascension challenge: outside, the click does nothing.

**Phase passes don't ascend.** The main loop repeats a phase while the stage stays in its range, and a pass continues the current run; only Ascend (104), 403, Exit Ascension challenge (103) and ascension challenge entries reset. No migration adds an Ascend to players' phases. The default strategies were checked: `autosing-strategies.md`.

Test: `npm run test:autosing`.

## Ambrosia slot settings
- An Antiquities icon before the label (`controlAoagIcon`) says when the slot is meant to be used: dimmed pre-AOAG (Hyperflux (H), Obtainium), full colours post-AOAG (3-7D Cubes, Quark, Offerings, Ambrosia).

## "Don't switch ambrosia loadouts" (`autosingNoAmbrosiaSwitch`)
- Why: every ambrosia loadout load resets the ambrosia bars (the game's `createBlueberryTree` → `resetBlueberryTree` → `resetAmbrosiaBarProgress`: blueberry, red ambrosia and purple honey progress), even reloading the tree already in place (only the game's Auto Ascension rules skip a loaded tree).
- With the setting on, `#setAmbrosiaLoadout` does nothing: no switch after the singularity, at the start, before the quark export, in the push, nor for steps 301–306. Every switch must go through `#setAmbrosiaLoadout`.
- Read at the start in `#cacheAmbrosiaLoadoutButtons`, which then skips looking up the 6 slots (a slot at "None" no longer stops the start). The run panel's footer says "no switch".
- Changing it during a run applies from the next step, and the footer follows. Turning it off looks up the 6 slots at that moment; a slot at "None" refuses the change: the switch goes back on, a notification says why, and the run goes on without switches. The slot settings themselves are still only read at those two moments.
- A global switch was chosen over "None = skip that one switch" (an unset slot would silently switch nothing).

## Step numbers and logs
- The logs use the step list's numbers (`Step N`, from 1; IF rows counted, "Jump here" rows not; `autosing-editor.md`), no phase name (noisy).
- A `===== Executing phase: X =====` debug line at every phase run, kept at debug level (even though timeout warnings show without debug and then have no phase).
- Debug lines for every step, 403 and IF jumps included, with their outcome (a capped IF's jump with its count, "(2/5)"); the step is named on C1–C10 timeout warnings. An IF that reached its max jumps writes a normal log line instead (`autosing-strategies.md`, "IF steps").
- The first phase runs with "Anti buy coin bug" (999) inserted first and a leading 304 removed (`#insertAntiBuyCoinBugStep`), so `#stepNumber` corrects that phase's indices; the inserted step logs as Step 0.
- The current step in the run panel was refused (changes too often; the logs cover it).

## Run panel: quarks
- **"Gained" is the balance's rise** (`worlds`, read after the Exalt), so spending lowers it. Autosing is meant for players who completed Limited Time once: without it the game resets the balance at each singularity and "Gained" stays at `-`, which is expected.
- **`(12.34% ants)` after "Gained":** the run's total of `ants.quarksGainedFromAnts` over its total of `quarksThisSingularity`, in grey, shown with or without details; that total of ant quarks in its tooltip. Not over "Gained": spending would then raise the share with the ants earning the same.
- Both are read at the top of `#performSingularity`, before the Exalt click: the singularity resets both. The first singularity at the start isn't counted, like every other figure. A singularity crossing the real-life day change under-reports its ant quarks (the game resets the counter then too); negligible over a run.

## Step timings (`autosingStepTimings`)
For players tuning a strategy. `HSAutosingRecorder` records, `hs-autosingStepTable.ts` turns that into the table (pure, `test-autosing-step-table.cjs`), `ui/hs-autosing-step-timings-window.ts` shows it.
- **Off by default, read at each start.** Off, the main loop only checks `#recordTimings` / `passRecord` and the last run's timings are cleared. Autosing runs for hours and most players never read this.
- **The run panel's 📋 opens the window, or closes it if open**: shown when the run records, the panel not minimized and its details on; it stays in review mode. One window at most, closed with the panel. It opens beside the panel, on the right if it fits, at the panel's height at that moment; it doesn't follow the panel afterwards. CSV export: not this, it gave one row per singularity, which the panel already covers.
- **Built when it opens, then at most once per singularity while it is open**, in an animation frame (never while the tab is hidden). Closed, it costs nothing.
- **The table covers finished singularities whose steps are all held**: the one running is left out, and so is the oldest once the steps' cap has dropped part of it. The summary then says "Last 144 of 160 singularities", because its figures and the rows cover those only, unlike the run panel's "All".
- **The summary calculates as the run panel does:** σ divided by n, C15 as the geometric mean (not arithmetic: one high score would pull it, and the panel's `σlog` measures spread around the same mean). A score of 0 is skipped in both. Above a number's range only the panel still counts it. The recorder's 0.1 ms rounding can still change a last digit.
- **Rows, per singularity:** each step (a step's ms includes its Wait before), "Between singularities" (Exalt 2, teleport, Obtainium loadout, wait for an allowed stage), "Outside the steps" (what's left of the average: quark export, final Ascend, pauses). So the % add up to 100.
- **Sort:** longest first by default; a click on any title sorts by it, with a ▾ on that title (every title keeps its room, so nothing moves). Phase and Step give the strategy's order; a second click doesn't reverse (shortest first isn't useful). The rows that aren't steps stay last, except by ms and %. Copy always gives the strategy's order, tab-separated, so two runs line up.
- **Steps are numbered as in the editor** (`#stepNumber`); `index` in the timings is the running list's, from 0.
- **`window.__HS_autosingTimings`** (types in `hs-autosing-types.ts`), read by the window and `autosing-run.cjs`, which turns the setting on and writes `timings.json`. Cleared at each start. Lists, in ms, `sing` = recorded singularity (1 = the first after the start): `steps`, `passes`, `transitions` (one `#performSingularity`; `msBeforeRecord` counts in the previous singularity), `singularities`. About 125 steps and 16 KB per singularity (Basic, S275). Caps: 20000 steps (about 160 singularities), 2000 of each other list; the oldest tenth is dropped and counted in `dropped`.
- **Not recorded:** the quark export and Ascend after the final phase, the push before a stop, a pass ended by a thrown superseded wait (DOM path only). A singularity = its passes + its transition's part after the record + the next transition's `msBeforeRecord` + about 10 ms.
