# Integrated Ambrosia Heater

An in-game optimizer for Ambrosia loadouts, with resource-aware result tables and direct imports. Results depend on the exported game state and selected options.

## On this page

- [Read the current game or edit Heater inputs](#read-the-current-game-or-edit-heater-inputs)
- [Choose and remember active optimization branches](#choose-and-remember-active-optimization-branches)
- [Common resource loadout optimization](#common-resource-loadout-optimization)
- [Coins in Challenge 15 optimization](#coins-in-challenge-15-optimization)
- [Purple Honey and Purple Ambrosia loadouts](#purple-honey-and-purple-ambrosia-loadouts)
- [Obtainium, Offerings and joint optimization](#obtainium-offerings-and-joint-optimization)
- [Hyperflux H0–H7 and Max SR trees](#hyperflux-h0h7-and-max-sr-trees)
- [Best H at the current P4x4](#best-h-at-the-current-p4x4)
- [Max Amb + Oct hybrid](#max-amb--oct-hybrid)
- [Affordability and limiting-resource explanations](#affordability-and-limiting-resource-explanations)
- [Assign, copy and import Heater loadouts](#assign-copy-and-import-heater-loadouts)
- [Sync icons and AutoSing loadout settings](#sync-icons-and-autosing-loadout-settings)
- [Red Ambrosia upgrade comparison table](#red-ambrosia-upgrade-comparison-table)
- [Background heating, progress and cancel](#background-heating-progress-and-cancel)
- [Extended Heater data export](#extended-heater-data-export)

### Read the current game or edit Heater inputs

Builds optimization inputs from the save and lets you adjust scenarios.

**Where:** Tools → Ambrosia Heater → inputs window

- Inputs cover Exalt, singularity, bells, event bonus, pre/post-AOAG mode, Ambrosia resources, unlocks, runes, talismans and shop upgrades.
- Exalts are displayed by name. A warning appears if you choose a different Exalt from the exported save's context.

**Availability and limits**

- Changing the Exalt selector does not reconstruct every base value from a save in that Exalt; export from the intended context for reliable comparisons.

**Source:** [heater.md](https://github.com/Ferlieloi/synergism-hypersynergy/blob/master/docs/features/heater.md) · [heater-optimizer.md](https://github.com/Ferlieloi/synergism-hypersynergy/blob/master/docs/features/heater-optimizer.md) · [hs-heater-result-config.ts](https://github.com/Ferlieloi/synergism-hypersynergy/blob/master/src/mod/class/hs-modules/hs-heater/hs-heater-result-config.ts) · [hs-heater-ui-result.ts](https://github.com/Ferlieloi/synergism-hypersynergy/blob/master/src/mod/class/hs-modules/hs-heater/ui/hs-heater-ui-result.ts)

### Choose and remember active optimization branches

Runs only the loadout families you need.

**Where:** Heater inputs → Loadouts to heat

- Branches include Ambrosia, Purple Ambrosia, Quarks, 3–7D Cubes, Octeracts, C15 coins, Obtainium/Offerings, joint Obt+Off, Hyperflux, Max SR and Max Amb+Oct.
- Shortcuts select branches needed by your assigned slots, all visible branches, or none. Choices are remembered; choosing a slot type enables its required branch.
- The slower joint Obt+Off branch starts unticked; Purple branches follow the save's unlocks.

**Related settings:** [`heaterUncheckedBranches`](Settings-Reference#heateruncheckedbranches), [`heaterTickedBranches`](Settings-Reference#heatertickedbranches)

**Source:** [heater.md](https://github.com/Ferlieloi/synergism-hypersynergy/blob/master/docs/features/heater.md) · [heater-optimizer.md](https://github.com/Ferlieloi/synergism-hypersynergy/blob/master/docs/features/heater-optimizer.md) · [hs-heater-result-config.ts](https://github.com/Ferlieloi/synergism-hypersynergy/blob/master/src/mod/class/hs-modules/hs-heater/hs-heater-result-config.ts) · [hs-heater-ui-result.ts](https://github.com/Ferlieloi/synergism-hypersynergy/blob/master/src/mod/class/hs-modules/hs-heater/ui/hs-heater-ui-result.ts)

### Common resource loadout optimization

Optimizes All Ambrosia, Blue Ambrosia, Red Ambrosia, Quarks, 3–7D Cubes and Octeracts.

**Where:** Heater results → Common Loadouts

- Compare the effect, resource cost and required Blueberries for each result.
- The 3–7D Cube and Octeract rows are intended for post-AOAG; pre-AOAG cube trees have their own Hyperflux section.

**Source:** [heater.md](https://github.com/Ferlieloi/synergism-hypersynergy/blob/master/docs/features/heater.md) · [heater-optimizer.md](https://github.com/Ferlieloi/synergism-hypersynergy/blob/master/docs/features/heater-optimizer.md) · [hs-heater-result-config.ts](https://github.com/Ferlieloi/synergism-hypersynergy/blob/master/src/mod/class/hs-modules/hs-heater/hs-heater-result-config.ts) · [hs-heater-ui-result.ts](https://github.com/Ferlieloi/synergism-hypersynergy/blob/master/src/mod/class/hs-modules/hs-heater/ui/hs-heater-ui-result.ts)

### Coins in Challenge 15 optimization

Optimizes coin income per real second under C15's tax-cap assumption.

**Where:** Heater → Coins in C15 branch

- The exporter models C15 on a copy of your save, so you do not have to be inside C15. It uses existing rune EXP, blessings, spirits and talismans.
- Effect compares with no purchased Ambrosia modules while holding other resources fixed.

**Availability and limits**

- Assumes the tax cap is reached. This is not a prediction of future rune or resource growth.

**Source:** [hs-heater-coins-export.ts](https://github.com/Ferlieloi/synergism-hypersynergy/blob/master/src/mod/class/hs-core/gds/hs-heater-coins-export.ts) · [heater.md](https://github.com/Ferlieloi/synergism-hypersynergy/blob/master/docs/features/heater.md) · [heater-optimizer.md](https://github.com/Ferlieloi/synergism-hypersynergy/blob/master/docs/features/heater-optimizer.md) · [hs-heater-result-config.ts](https://github.com/Ferlieloi/synergism-hypersynergy/blob/master/src/mod/class/hs-modules/hs-heater/hs-heater-result-config.ts) · [hs-heater-ui-result.ts](https://github.com/Ferlieloi/synergism-hypersynergy/blob/master/src/mod/class/hs-modules/hs-heater/ui/hs-heater-ui-result.ts)

### Purple Honey and Purple Ambrosia loadouts

Balances generation for Honey stockpiling or Purple Ambrosia crafting.

**Where:** Heater → Purple Ambrosia branch

- Purple Honey and Purple Ambrosia rows use current reactor routing; Phoney (best econ) and Pamb (best econ) optimize the tree and routing together.
- Purple Ambrosia production accounts for both Red Ambrosia and Purple Honey inputs.

**Availability and limits**

- Routing is not stored in Ambrosia loadouts. Applying optimized routing changes the income of your other trees too.

**Source:** [heater.md](https://github.com/Ferlieloi/synergism-hypersynergy/blob/master/docs/features/heater.md) · [heater-optimizer.md](https://github.com/Ferlieloi/synergism-hypersynergy/blob/master/docs/features/heater-optimizer.md) · [hs-heater-result-config.ts](https://github.com/Ferlieloi/synergism-hypersynergy/blob/master/src/mod/class/hs-modules/hs-heater/hs-heater-result-config.ts) · [hs-heater-ui-result.ts](https://github.com/Ferlieloi/synergism-hypersynergy/blob/master/src/mod/class/hs-modules/hs-heater/ui/hs-heater-ui-result.ts)

### Obtainium, Offerings and joint optimization

Produces specialized or combined trees for these two resources.

**Where:** Heater → Obt, Off / Obt + Off branches

- Choose pre-AOAG or post-AOAG inputs to match the intended use.
- Joint Obt+Off values equal relative improvements to either resource; its result reports both multipliers.

**Availability and limits**

- The combined search can take longer; it starts disabled.

**Source:** [heater.md](https://github.com/Ferlieloi/synergism-hypersynergy/blob/master/docs/features/heater.md) · [heater-optimizer.md](https://github.com/Ferlieloi/synergism-hypersynergy/blob/master/docs/features/heater-optimizer.md) · [hs-heater-result-config.ts](https://github.com/Ferlieloi/synergism-hypersynergy/blob/master/src/mod/class/hs-modules/hs-heater/hs-heater-result-config.ts) · [hs-heater-ui-result.ts](https://github.com/Ferlieloi/synergism-hypersynergy/blob/master/src/mod/class/hs-modules/hs-heater/ui/hs-heater-ui-result.ts)

### Hyperflux H0–H7 and Max SR trees

Compares cube trees across Hyperflux levels and singularity-reducer priorities.

**Where:** Heater results → p4x4 (pre-AOAG) Loadouts

- H0–H7 compare pre-AOAG cube effectiveness and show P4x4 equivalence thresholds.
- Max SR1 and Max SR2 prioritize their respective reducer first, then cubes, so you can see the cube cost of that choice.
- SR1 is evaluated outside an Exalt; SR2 inside one. Maxed comparisons respect upgrade prerequisites.

**Source:** [heater.md](https://github.com/Ferlieloi/synergism-hypersynergy/blob/master/docs/features/heater.md) · [heater-optimizer.md](https://github.com/Ferlieloi/synergism-hypersynergy/blob/master/docs/features/heater-optimizer.md) · [hs-heater-result-config.ts](https://github.com/Ferlieloi/synergism-hypersynergy/blob/master/src/mod/class/hs-modules/hs-heater/hs-heater-result-config.ts) · [hs-heater-ui-result.ts](https://github.com/Ferlieloi/synergism-hypersynergy/blob/master/src/mod/class/hs-modules/hs-heater/ui/hs-heater-ui-result.ts)

### Best H at the current P4x4

Selects the appropriate Hyperflux result when importing, using live P4x4.

**Where:** Heater → Your loadout order → Best H (P4x4 now)

- The selected row is marked ★ now. Import All reads P4x4 again rather than relying on its heat-time value.
- The choice is resolved once per import; it does not automatically switch trees as P4x4 rises.

**Availability and limits**

- Requires heated Hyperflux results and a readable P4x4 value.

**Source:** [heater.md](https://github.com/Ferlieloi/synergism-hypersynergy/blob/master/docs/features/heater.md) · [heater-optimizer.md](https://github.com/Ferlieloi/synergism-hypersynergy/blob/master/docs/features/heater-optimizer.md) · [hs-heater-result-config.ts](https://github.com/Ferlieloi/synergism-hypersynergy/blob/master/src/mod/class/hs-modules/hs-heater/hs-heater-result-config.ts) · [hs-heater-ui-result.ts](https://github.com/Ferlieloi/synergism-hypersynergy/blob/master/src/mod/class/hs-modules/hs-heater/ui/hs-heater-ui-result.ts)

### Max Amb + Oct hybrid

Combines maximized Ambrosia upgrades with Octeract optimization.

**Where:** Heater → Max Amb + Oct branch

- Intended for late-game budgets large enough to afford the full All Ambrosia base.
- The row remains visible as Unaffordable when its base cannot be bought.

**Source:** [heater.md](https://github.com/Ferlieloi/synergism-hypersynergy/blob/master/docs/features/heater.md) · [heater-optimizer.md](https://github.com/Ferlieloi/synergism-hypersynergy/blob/master/docs/features/heater-optimizer.md) · [hs-heater-result-config.ts](https://github.com/Ferlieloi/synergism-hypersynergy/blob/master/src/mod/class/hs-modules/hs-heater/hs-heater-result-config.ts) · [hs-heater-ui-result.ts](https://github.com/Ferlieloi/synergism-hypersynergy/blob/master/src/mod/class/hs-modules/hs-heater/ui/hs-heater-ui-result.ts)

### Affordability and limiting-resource explanations

Shows why a row is unavailable or not yet maxed.

**Where:** Heater results table

- Unaffordable rows identify insufficient Ambrosia and/or Blueberries where known.
- Non-maxed rows show limiting-resource icons. Missing branches and unaffordable assigned types use different slot-border colors.
- Hover a non-maxed row's ✘ to see the levels it still needs to be maxed, next to your loadout's; right-click to pin.
- Results include loadout, effect, cost and relevant routing or P4x4 comparisons.

**Source:** [heater.md](https://github.com/Ferlieloi/synergism-hypersynergy/blob/master/docs/features/heater.md) · [heater-optimizer.md](https://github.com/Ferlieloi/synergism-hypersynergy/blob/master/docs/features/heater-optimizer.md) · [hs-heater-result-config.ts](https://github.com/Ferlieloi/synergism-hypersynergy/blob/master/src/mod/class/hs-modules/hs-heater/hs-heater-result-config.ts) · [hs-heater-ui-result.ts](https://github.com/Ferlieloi/synergism-hypersynergy/blob/master/src/mod/class/hs-modules/hs-heater/ui/hs-heater-ui-result.ts)

### Assign, copy and import Heater loadouts

Moves optimized trees into the game's existing loadout slots.

**Where:** Heater results → Actions / Your loadout order / Import All

- Assign result types to slots, copy individual loadout data or import selected results.
- Import All preserves unticked slots, skips missing/unaffordable choices with appropriate feedback, and can resolve Best H at import time.
- The slot row reflects active borders and custom icons; slot assignments are remembered.

**Related settings:** [`heaterTypeLoadoutSelections`](Settings-Reference#heatertypeloadoutselections)

**Source:** [heater.md](https://github.com/Ferlieloi/synergism-hypersynergy/blob/master/docs/features/heater.md) · [heater-optimizer.md](https://github.com/Ferlieloi/synergism-hypersynergy/blob/master/docs/features/heater-optimizer.md) · [hs-heater-result-config.ts](https://github.com/Ferlieloi/synergism-hypersynergy/blob/master/src/mod/class/hs-modules/hs-heater/hs-heater-result-config.ts) · [hs-heater-ui-result.ts](https://github.com/Ferlieloi/synergism-hypersynergy/blob/master/src/mod/class/hs-modules/hs-heater/ui/hs-heater-ui-result.ts)

### Sync icons and AutoSing loadout settings

Reuses your Heater slot assignments in the rest of the mod.

**Where:** Heater results → Sync icons / Sync settings

- Sync icons assigns recognizable semantic icons to the chosen slot roles.
- Sync settings maps relevant roles into the AutoSing, ADD/TIME and timed export loadout settings; Best H remains a semantic choice rather than being stored as a fixed H row.

**Source:** [heater.md](https://github.com/Ferlieloi/synergism-hypersynergy/blob/master/docs/features/heater.md) · [heater-optimizer.md](https://github.com/Ferlieloi/synergism-hypersynergy/blob/master/docs/features/heater-optimizer.md) · [hs-heater-result-config.ts](https://github.com/Ferlieloi/synergism-hypersynergy/blob/master/src/mod/class/hs-modules/hs-heater/hs-heater-result-config.ts) · [hs-heater-ui-result.ts](https://github.com/Ferlieloi/synergism-hypersynergy/blob/master/src/mod/class/hs-modules/hs-heater/ui/hs-heater-ui-result.ts)

### Red Ambrosia upgrade comparison table

Compares supported upgrade effects and cost effectiveness.

**Where:** Heater → Red Ambrosia upgrades tool

- Uses Heater context to report available Ambrosia, Red Ambrosia and Octeract effects for modeled upgrades.
- Unavailable or unmodeled values are shown as such rather than invented.
- Switch between compact and expanded views; cost-effectiveness sort controls cycle ascending, descending and unsorted.

**Source:** [hs-heater-red-ambrosia-table.ts](https://github.com/Ferlieloi/synergism-hypersynergy/blob/master/src/mod/class/hs-modules/hs-heater/ui/hs-heater-red-ambrosia-table.ts) · [heater.md](https://github.com/Ferlieloi/synergism-hypersynergy/blob/master/docs/features/heater.md) · [heater-optimizer.md](https://github.com/Ferlieloi/synergism-hypersynergy/blob/master/docs/features/heater-optimizer.md) · [hs-heater-result-config.ts](https://github.com/Ferlieloi/synergism-hypersynergy/blob/master/src/mod/class/hs-modules/hs-heater/hs-heater-result-config.ts) · [hs-heater-ui-result.ts](https://github.com/Ferlieloi/synergism-hypersynergy/blob/master/src/mod/class/hs-modules/hs-heater/ui/hs-heater-ui-result.ts)

### Background heating, progress and cancel

Runs the optimizer in workers with elapsed-time and group progress.

**Where:** Heater → Heat / Heat with

- Heats with 1, 2 or 3 workers at once, 3 by default; lower-memory or lower-core devices fall back to 1.
- Cancel terminates an active worker heat. Identical already-heated inputs can reuse their result; the Log records heat timing or reuse.

**Availability and limits**

- Heating can use substantial memory. Without worker support, calculation can block the page and cannot offer the same cancellation behavior.

**Related settings:** [`heaterWorkers`](Settings-Reference#heaterworkers)

**Source:** [heater.md](https://github.com/Ferlieloi/synergism-hypersynergy/blob/master/docs/features/heater.md) · [heater-optimizer.md](https://github.com/Ferlieloi/synergism-hypersynergy/blob/master/docs/features/heater-optimizer.md) · [hs-heater-result-config.ts](https://github.com/Ferlieloi/synergism-hypersynergy/blob/master/src/mod/class/hs-modules/hs-heater/hs-heater-result-config.ts) · [hs-heater-ui-result.ts](https://github.com/Ferlieloi/synergism-hypersynergy/blob/master/src/mod/class/hs-modules/hs-heater/ui/hs-heater-ui-result.ts)

### Extended Heater data export

Copies an extended save string for the external Ambrosia Heater sheet.

**Where:** Tools → Copy Heater Data; quick access menu

- Includes calculated context beyond the base save, such as the mod's computed values and fetched game bonuses.
- The integrated Heater uses the same game-data infrastructure; the external sheet remains a separate tool.

**Source:** [heater.md](https://github.com/Ferlieloi/synergism-hypersynergy/blob/master/docs/features/heater.md) · [heater-optimizer.md](https://github.com/Ferlieloi/synergism-hypersynergy/blob/master/docs/features/heater-optimizer.md) · [hs-heater-result-config.ts](https://github.com/Ferlieloi/synergism-hypersynergy/blob/master/src/mod/class/hs-modules/hs-heater/hs-heater-result-config.ts) · [hs-heater-ui-result.ts](https://github.com/Ferlieloi/synergism-hypersynergy/blob/master/src/mod/class/hs-modules/hs-heater/ui/hs-heater-ui-result.ts)
