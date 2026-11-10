# AutoSing & strategy editor

An explicitly opt-in automation system for end-game singularity farming. This goes beyond strictly informational QoL.

Step by step: [Auto-Sing guide](Guide-autosing).

## On this page

- [Strategy-driven singularity farming](#strategy-driven-singularity-farming)
- [Pause, resume, restart, stop and Finish & Stop](#pause-resume-restart-stop-and-finish--stop)
- [Live run statistics, charts and review](#live-run-statistics-charts-and-review)
- [Step timings](#step-timings)
- [Create, copy, edit, import, export and delete strategies](#create-copy-edit-import-export-and-delete-strategies)
- [Phase editor with chained stage ranges](#phase-editor-with-chained-stage-ranges)
- [Action editor with ordering, duplicates and comments](#action-editor-with-ordering-duplicates-and-comments)
- [Conditional IF steps and jumps](#conditional-if-steps-and-jumps)
- [Undo, redo and unsaved-change protection](#undo-redo-and-unsaved-change-protection)
- [Explicit corruption-level strategy actions](#explicit-corruption-level-strategy-actions)
- [Six configurable Ambrosia roles](#six-configurable-ambrosia-roles)
- [Don't switch Ambrosia loadouts](#dont-switch-ambrosia-loadouts)
- [Keep the PC awake](#keep-the-pc-awake)
- [Advanced run settings and reset to defaults](#advanced-run-settings-and-reset-to-defaults)

### Strategy-driven singularity farming

Repeats singularities according to an editable strategy and farming target.

**Where:** Settings → Auto-Sing → Start/Stop Auto-Sing

- Choose the singularity to farm and a strategy appropriate to your save. Start validates the required game state and settings.
- AutoSing manages progression, the AOAG phase, end-of-singularity actions and the Exalt entry/exit used by its farming cycle.
- It restores the player's accessible tab/subtab after its own navigation; importing another save stops AutoSing.
- It keeps its speed when the game is in another tab. Chrome's Energy Saver can still freeze a hidden tab after 5 minutes: turn it off in chrome://settings/performance, or keep the game window in view.

**Availability and limits**

- Intended for S216+ after completing EXALT6 at least once. The code refuses a highest singularity below 40, warns below 216, and expects EXALT2 access for its cycle. A supplied strategy is not guaranteed to finish on every save.

**Related settings:** [`startAutosing`](Settings-Reference#startautosing), [`singularityNumber`](Settings-Reference#singularitynumber)

**Source:** [autosing.md](https://github.com/Ferlieloi/synergism-hypersynergy/blob/master/docs/features/autosing.md) · [autosing-strategies.md](https://github.com/Ferlieloi/synergism-hypersynergy/blob/master/docs/features/autosing-strategies.md) · [autosing-editor.md](https://github.com/Ferlieloi/synergism-hypersynergy/blob/master/docs/features/autosing-editor.md) · [hs-autosingModal.ts](https://github.com/Ferlieloi/synergism-hypersynergy/blob/master/src/mod/class/hs-modules/hs-autosing/hs-autosingModal.ts)

### Pause, resume, restart, stop and Finish & Stop

Controls the current run without editing its strategy.

**Where:** AutoSing timer window → controls

- Pause/resume suspends progression; restart begins another run; Stop ends the run immediately.
- Finish & Stop schedules stopping at the end of the current singularity. The timer window can be minimized, moved and resized.
- The footer reports patch completeness and whether slower fallback reads are in use.

**Source:** [autosing.md](https://github.com/Ferlieloi/synergism-hypersynergy/blob/master/docs/features/autosing.md) · [autosing-strategies.md](https://github.com/Ferlieloi/synergism-hypersynergy/blob/master/docs/features/autosing-strategies.md) · [autosing-editor.md](https://github.com/Ferlieloi/synergism-hypersynergy/blob/master/docs/features/autosing-editor.md) · [hs-autosingModal.ts](https://github.com/Ferlieloi/synergism-hypersynergy/blob/master/src/mod/class/hs-modules/hs-autosing/hs-autosingModal.ts)

### Live run statistics, charts and review

Tracks run pace, phase timings, Quarks, GQ and C15 statistics.

**Where:** AutoSing timer window → detailed data / charts

- Shows completed singularities, latest and rolling-average times, extrema and variation, and the share of the run's quarks that came from the Ants to Quark Corner.
- Expandable detailed views add phase histories and sparklines for timing, currencies and C15; stopped runs can be reviewed.

**Source:** [autosing.md](https://github.com/Ferlieloi/synergism-hypersynergy/blob/master/docs/features/autosing.md) · [autosing-strategies.md](https://github.com/Ferlieloi/synergism-hypersynergy/blob/master/docs/features/autosing-strategies.md) · [autosing-editor.md](https://github.com/Ferlieloi/synergism-hypersynergy/blob/master/docs/features/autosing-editor.md) · [hs-autosingModal.ts](https://github.com/Ferlieloi/synergism-hypersynergy/blob/master/src/mod/class/hs-modules/hs-autosing/hs-autosingModal.ts)

### Step timings

Shows where a singularity's time goes, step by step, to help tune a strategy.

**Where:** Settings → Auto-Sing → Record step timings; AutoSing timer window → 📋

- Off by default; it applies at the next start. Each step shows its runs, time, share of a singularity and Wait before, per singularity, plus the time spent between singularities and outside the steps.
- A click on a column's title sorts by it. Copy gives it as text with the strategy, target, loadouts, average time and hourly rates, to compare two runs or share one.

**Related settings:** [`autosingStepTimings`](Settings-Reference#autosingsteptimings)

**Source:** [hs-autosing-step-timings-window.ts](https://github.com/Ferlieloi/synergism-hypersynergy/blob/master/src/mod/class/hs-modules/hs-autosing/ui/hs-autosing-step-timings-window.ts) · [autosing.md](https://github.com/Ferlieloi/synergism-hypersynergy/blob/master/docs/features/autosing.md) · [autosing-strategies.md](https://github.com/Ferlieloi/synergism-hypersynergy/blob/master/docs/features/autosing-strategies.md) · [autosing-editor.md](https://github.com/Ferlieloi/synergism-hypersynergy/blob/master/docs/features/autosing-editor.md) · [hs-autosingModal.ts](https://github.com/Ferlieloi/synergism-hypersynergy/blob/master/src/mod/class/hs-modules/hs-autosing/hs-autosingModal.ts)

### Create, copy, edit, import, export and delete strategies

Keeps custom JSON strategies locally and shares them through import/export.

**Where:** Settings → Auto-Sing → strategy controls

- Inspect built-in strategies, then copy or create one for your own tuning.
- Imports are validated and older strategy formats are normalized. Exports copy shareable strategy JSON.
- The current bundled strategy names carry -temp: their authors still need to tune them for the changed corruption system.

**Related settings:** [`autosingStrategy`](Settings-Reference#autosingstrategy), [`editAutosingStrategy`](Settings-Reference#editautosingstrategy), [`createAutosingStrategy`](Settings-Reference#createautosingstrategy), [`deleteAutosingStrategy`](Settings-Reference#deleteautosingstrategy), [`importAutosingStrategy`](Settings-Reference#importautosingstrategy), [`exportAutosingStrategy`](Settings-Reference#exportautosingstrategy)

**Source:** [autosing.md](https://github.com/Ferlieloi/synergism-hypersynergy/blob/master/docs/features/autosing.md) · [autosing-strategies.md](https://github.com/Ferlieloi/synergism-hypersynergy/blob/master/docs/features/autosing-strategies.md) · [autosing-editor.md](https://github.com/Ferlieloi/synergism-hypersynergy/blob/master/docs/features/autosing-editor.md) · [hs-autosingModal.ts](https://github.com/Ferlieloi/synergism-hypersynergy/blob/master/src/mod/class/hs-modules/hs-autosing/hs-autosingModal.ts)

### Phase editor with chained stage ranges

Builds a continuous progression plan from start through end, plus AOAG.

**Where:** Strategy window → phase rows

- Add phases by selecting an end stage; insert a phase with the small + dropdown and edit its action list with the step-count button.
- Stage choices maintain a continuous chain and saving refuses empty or invalid ranges.
- Multiple strategies/actions windows can be compared; reopening an existing one brings it forward.

**Source:** [autosing.md](https://github.com/Ferlieloi/synergism-hypersynergy/blob/master/docs/features/autosing.md) · [autosing-strategies.md](https://github.com/Ferlieloi/synergism-hypersynergy/blob/master/docs/features/autosing-strategies.md) · [autosing-editor.md](https://github.com/Ferlieloi/synergism-hypersynergy/blob/master/docs/features/autosing-editor.md) · [hs-autosingModal.ts](https://github.com/Ferlieloi/synergism-hypersynergy/blob/master/src/mod/class/hs-modules/hs-autosing/hs-autosingModal.ts)

### Action editor with ordering, duplicates and comments

Edits challenges, resets, waits, game actions, loadouts, forge toggles and run controls.

**Where:** Phase → actions window

- Add, edit, duplicate, delete and drag steps; edge dragging auto-scrolls the list. Fields are shown only for actions that use them.
- Numeric inputs are checked as typed. Enter adds or updates from a typed field.
- Comments annotate steps, and the footer calculates the fixed wait time of one linear pass.

**Source:** [autosing.md](https://github.com/Ferlieloi/synergism-hypersynergy/blob/master/docs/features/autosing.md) · [autosing-strategies.md](https://github.com/Ferlieloi/synergism-hypersynergy/blob/master/docs/features/autosing-strategies.md) · [autosing-editor.md](https://github.com/Ferlieloi/synergism-hypersynergy/blob/master/docs/features/autosing-editor.md) · [hs-autosingModal.ts](https://github.com/Ferlieloi/synergism-hypersynergy/blob/master/src/mod/class/hs-modules/hs-autosing/hs-autosingModal.ts)

### Conditional IF steps and jumps

Branches or loops the phase based on configured game conditions.

**Where:** Actions window → Condition actions

- IF and Jump here rows show their linked step numbers, with clickable links and highlighted pairs.
- Looping targets are marked. Adding or deleting steps shifts targets; dragging keeps targets at their list positions, so review them after rearranging.

**Source:** [autosing.md](https://github.com/Ferlieloi/synergism-hypersynergy/blob/master/docs/features/autosing.md) · [autosing-strategies.md](https://github.com/Ferlieloi/synergism-hypersynergy/blob/master/docs/features/autosing-strategies.md) · [autosing-editor.md](https://github.com/Ferlieloi/synergism-hypersynergy/blob/master/docs/features/autosing-editor.md) · [hs-autosingModal.ts](https://github.com/Ferlieloi/synergism-hypersynergy/blob/master/src/mod/class/hs-modules/hs-autosing/hs-autosingModal.ts)

### Undo, redo and unsaved-change protection

Protects strategy edits while allowing experimentation.

**Where:** Actions window footer / strategy window close

- Undo/Redo cover additions, changes, duplicates, deletions and reordered steps; Ctrl+Z, Ctrl+Y and Ctrl+Shift+Z work in the last active actions window outside typed fields.
- Editors work on copies. Closing with changes asks whether to discard; the strategy cannot update while an actions window has unsaved edits.
- Deleting a strategy with an editor open is refused so an older editor cannot silently recreate it.

**Source:** [autosing.md](https://github.com/Ferlieloi/synergism-hypersynergy/blob/master/docs/features/autosing.md) · [autosing-strategies.md](https://github.com/Ferlieloi/synergism-hypersynergy/blob/master/docs/features/autosing-strategies.md) · [autosing-editor.md](https://github.com/Ferlieloi/synergism-hypersynergy/blob/master/docs/features/autosing-editor.md) · [hs-autosingModal.ts](https://github.com/Ferlieloi/synergism-hypersynergy/blob/master/src/mod/class/hs-modules/hs-autosing/hs-autosingModal.ts)

### Explicit corruption-level strategy actions

Sets actual corruption level, optionally ascending immediately.

**Where:** Actions window → 403 Set corruption level

- Ascend immediately is on by default; inside an ascension challenge it exits the challenge to apply the reset correctly. Untick it to defer the level until a later ascension.
- Phases do not implicitly ascend or set corruption. The AOAG transition explicitly uses level zero; the final push uses the game's Max action.
- Older named/eight-value corruption strategies are converted where possible and warn when a meaningful numeric conversion is unavailable.

**Availability and limits**

- The game may clamp levels. Strategy levels are actual levels, before the game's free reward levels.

**Source:** [autosing.md](https://github.com/Ferlieloi/synergism-hypersynergy/blob/master/docs/features/autosing.md) · [autosing-strategies.md](https://github.com/Ferlieloi/synergism-hypersynergy/blob/master/docs/features/autosing-strategies.md) · [autosing-editor.md](https://github.com/Ferlieloi/synergism-hypersynergy/blob/master/docs/features/autosing-editor.md) · [hs-autosingModal.ts](https://github.com/Ferlieloi/synergism-hypersynergy/blob/master/src/mod/class/hs-modules/hs-autosing/hs-autosingModal.ts)

### Six configurable Ambrosia roles

Assigns the Hyperflux (H), 3-7D Cubes, Quark, Obtainium, Offerings and Ambrosia slots; an Antiquities icon shows which are for pre-AOAG (dimmed) and post-AOAG (full colours).

**Where:** Settings → Auto-Sing → Ambrosia loadouts

- AutoSing switches through its own central loadout path at the relevant steps and final actions.
- Heater Sync settings can populate compatible role choices.

**Related settings:** [`autosingEarlyCubeLoadout`](Settings-Reference#autosingearlycubeloadout), [`autosingLateCubeLoadout`](Settings-Reference#autosinglatecubeloadout), [`autosingQuarkLoadout`](Settings-Reference#autosingquarkloadout), [`autosingObtLoadout`](Settings-Reference#autosingobtloadout), [`autosingOffLoadout`](Settings-Reference#autosingoffloadout), [`autosingAmbrosiaLoadout`](Settings-Reference#autosingambrosialoadout)

**Source:** [autosing.md](https://github.com/Ferlieloi/synergism-hypersynergy/blob/master/docs/features/autosing.md) · [autosing-strategies.md](https://github.com/Ferlieloi/synergism-hypersynergy/blob/master/docs/features/autosing-strategies.md) · [autosing-editor.md](https://github.com/Ferlieloi/synergism-hypersynergy/blob/master/docs/features/autosing-editor.md) · [hs-autosingModal.ts](https://github.com/Ferlieloi/synergism-hypersynergy/blob/master/src/mod/class/hs-modules/hs-autosing/hs-autosingModal.ts)

### Don't switch Ambrosia loadouts

Leaves the tree in place throughout the run to preserve bar progress.

**Where:** Settings → Auto-Sing → Don't switch ambrosia loadouts

- Skips every AutoSing tree load, including loadout actions, post-singularity switches and export/push switches.
- The footer shows no switch; configured loadout roles are not used in this mode.
- Can be changed during a run. Turning it off is refused while a role has no slot.

**Related settings:** [`autosingNoAmbrosiaSwitch`](Settings-Reference#autosingnoambrosiaswitch)

**Source:** [autosing.md](https://github.com/Ferlieloi/synergism-hypersynergy/blob/master/docs/features/autosing.md) · [autosing-strategies.md](https://github.com/Ferlieloi/synergism-hypersynergy/blob/master/docs/features/autosing-strategies.md) · [autosing-editor.md](https://github.com/Ferlieloi/synergism-hypersynergy/blob/master/docs/features/autosing-editor.md) · [hs-autosingModal.ts](https://github.com/Ferlieloi/synergism-hypersynergy/blob/master/src/mod/class/hs-modules/hs-autosing/hs-autosingModal.ts)

### Keep the PC awake

Keeps the screen on and stops the PC sleeping while AutoSing runs with the game in view.

**Where:** Settings → Auto-Sing → Keep the PC awake

- On by default, and can be changed during a run. If the browser refuses, a notification says so.

**Availability and limits**

- In a browser, the lock drops while the game is in another tab, minimized or fully covered, or the PC is locked, and comes back when the game returns. On Steam it stays while the window is minimized or covered and while the PC is locked.

**Related settings:** [`autosingKeepAwake`](Settings-Reference#autosingkeepawake)

**Source:** [autosing.md](https://github.com/Ferlieloi/synergism-hypersynergy/blob/master/docs/features/autosing.md) · [autosing-strategies.md](https://github.com/Ferlieloi/synergism-hypersynergy/blob/master/docs/features/autosing-strategies.md) · [autosing-editor.md](https://github.com/Ferlieloi/synergism-hypersynergy/blob/master/docs/features/autosing-editor.md) · [hs-autosingModal.ts](https://github.com/Ferlieloi/synergism-hypersynergy/blob/master/src/mod/class/hs-modules/hs-autosing/hs-autosingModal.ts)

### Advanced run settings and reset to defaults

Tunes cube opening, tesseract buying and auto-challenge timing.

**Where:** AutoSing advanced/timer settings

- Set 3–6D cube opening percentage, tesseract-building auto-buy percentage, and challenge start/enter/exit timers.
- Reset to default takes two clicks. The settings fixer checks relevant game switches for the run, including disabling corruption auto-climb.

**Related settings:** [`autosing3to6DCubeOpeningPercent`](Settings-Reference#autosing3to6dcubeopeningpercent), [`autosingTessBuildingAutoBuyPercent`](Settings-Reference#autosingtessbuildingautobuypercent), [`autosingAutoChallTimerStart`](Settings-Reference#autosingautochalltimerstart), [`autosingAutoChallTimerExit`](Settings-Reference#autosingautochalltimerexit), [`autosingAutoChallTimerEnter`](Settings-Reference#autosingautochalltimerenter), [`resetAutosingAdvanced`](Settings-Reference#resetautosingadvanced)

**Source:** [autosing.md](https://github.com/Ferlieloi/synergism-hypersynergy/blob/master/docs/features/autosing.md) · [autosing-strategies.md](https://github.com/Ferlieloi/synergism-hypersynergy/blob/master/docs/features/autosing-strategies.md) · [autosing-editor.md](https://github.com/Ferlieloi/synergism-hypersynergy/blob/master/docs/features/autosing-editor.md) · [hs-autosingModal.ts](https://github.com/Ferlieloi/synergism-hypersynergy/blob/master/src/mod/class/hs-modules/hs-autosing/hs-autosingModal.ts)
