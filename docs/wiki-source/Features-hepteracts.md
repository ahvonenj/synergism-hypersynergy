# Hepteracts & Platonic upgrades

Forge shortcuts and distribution tools reduce repetitive crafting while exposing what an action will cost.

## On this page

- [Live forge capacity ratios](#live-forge-capacity-ratios)
- [Quick expand and max](#quick-expand-and-max)
- [Quick-expand cost and affordability time](#quick-expand-cost-and-affordability-time)
- [Configurable quick-expand cost protection](#configurable-quick-expand-cost-protection)
- [Hepteract Distributor with saved ratios](#hepteract-distributor-with-saved-ratios)
- [Keep a scaling Hepteract reserve](#keep-a-scaling-hepteract-reserve)
- [Buy Overflux Orbs first](#buy-overflux-orbs-first)
- [Optional partly filled meters](#optional-partly-filled-meters)
- [Temporary singularity reducers and Talisman Power](#temporary-singularity-reducers-and-talisman-power)
- [Time until the next Platonic upgrade level](#time-until-the-next-platonic-upgrade-level)

### Live forge capacity ratios

Displays CHR/HYP/CHL, ACC/BST/MLT and CHR/ACC comparisons.

**Where:** Above the Hepteract Forge grid

- Ratios refresh as capacities change and use exact live values when patched.
- The full display appears once the required hepteracts have capacities.

**Source:** [hs-hepteracts.ts](https://github.com/Ferlieloi/synergism-hypersynergy/blob/master/src/mod/class/hs-modules/hs-hepteracts/hs-hepteracts.ts) · [hs-hepteract-ratios.ts](https://github.com/Ferlieloi/synergism-hypersynergy/blob/master/src/mod/class/hs-modules/hs-hepteracts/hs-hepteract-ratios.ts) · [hepteract-distributor.md](https://github.com/Ferlieloi/synergism-hypersynergy/blob/master/docs/features/hepteract-distributor.md) · [platonic-tooltip.md](https://github.com/Ferlieloi/synergism-hypersynergy/blob/master/docs/features/platonic-tooltip.md)

### Quick expand and max

Combines repetitive expansion and filling actions.

**Where:** Hepteract Forge → click a hepteract icon

- Uses the forge's native actions and reports next-fill costs on hover; Quark costs are shown as Quarks.
- Patched games use exact balances and capacities instead of rounded display numbers.

**Availability and limits**

- The Quark hepteract has special handling because it also spends Quarks; do not assume every forge shortcut treats it like the other types.

**Source:** [hs-hepteracts.ts](https://github.com/Ferlieloi/synergism-hypersynergy/blob/master/src/mod/class/hs-modules/hs-hepteracts/hs-hepteracts.ts) · [hs-hepteract-ratios.ts](https://github.com/Ferlieloi/synergism-hypersynergy/blob/master/src/mod/class/hs-modules/hs-hepteracts/hs-hepteract-ratios.ts) · [hepteract-distributor.md](https://github.com/Ferlieloi/synergism-hypersynergy/blob/master/docs/features/hepteract-distributor.md) · [platonic-tooltip.md](https://github.com/Ferlieloi/synergism-hypersynergy/blob/master/docs/features/platonic-tooltip.md)

### Quick-expand cost and affordability time

Shows the next quick action cost and its estimated wait.

**Where:** Hover a Hepteract Forge icon

- The hover text estimates when your stock plus pending ascension income can cover the quick-expand/fill action.
- Quark hepteracts show the Quark cost; other hepteracts use their relevant raw stock and the shared ascension-income reader.

**Availability and limits**

- An estimate depends on the current income and displayed forge requirements; it does not schedule a future action.

**Source:** [hs-hepteracts.ts](https://github.com/Ferlieloi/synergism-hypersynergy/blob/master/src/mod/class/hs-modules/hs-hepteracts/hs-hepteracts.ts) · [hs-hepteract-ratios.ts](https://github.com/Ferlieloi/synergism-hypersynergy/blob/master/src/mod/class/hs-modules/hs-hepteracts/hs-hepteract-ratios.ts) · [hepteract-distributor.md](https://github.com/Ferlieloi/synergism-hypersynergy/blob/master/docs/features/hepteract-distributor.md) · [platonic-tooltip.md](https://github.com/Ferlieloi/synergism-hypersynergy/blob/master/docs/features/platonic-tooltip.md)

### Configurable quick-expand cost protection

Refuses quick expansion when its cost crosses your chosen share of stock.

**Where:** Settings → QoL → Quick expand cost protection

- The saved fractional threshold applies to the relevant Hepteract cost check. A refused quick action is logged.
- Turn protection off only when you intend to allow the corresponding spend.

**Related settings:** [`expandCostProtection`](Settings-Reference#expandcostprotection)

**Source:** [hs-hepteracts.ts](https://github.com/Ferlieloi/synergism-hypersynergy/blob/master/src/mod/class/hs-modules/hs-hepteracts/hs-hepteracts.ts) · [hs-hepteract-ratios.ts](https://github.com/Ferlieloi/synergism-hypersynergy/blob/master/src/mod/class/hs-modules/hs-hepteracts/hs-hepteract-ratios.ts) · [hepteract-distributor.md](https://github.com/Ferlieloi/synergism-hypersynergy/blob/master/docs/features/hepteract-distributor.md) · [platonic-tooltip.md](https://github.com/Ferlieloi/synergism-hypersynergy/blob/master/docs/features/platonic-tooltip.md)

### Hepteract Distributor with saved ratios

Spends stock so final hepteract balances follow your configured ratios.

**Where:** Hepteract Forge → Distributor

- Ratios compare the Hepteract value of balances, not raw unit counts. A zero leaves a type alone; Match current derives ratios from current capacities.
- The panel remembers ratios and its open/closed state. It lists locked types and logs each run's status.
- The most under-target type receives its next fill/expand step. If that step cannot be paid, the run normally stops instead of overspending on cheaper types.

**Availability and limits**

- Uses repeated ascensions and native Auto craft. Requires a patched game and at least one singularity; unavailable during AutoSing and in limited-ascension/time Exalts. Quark hepteracts are excluded.

**Related settings:** [`enableHepteractDistributor`](Settings-Reference#enablehepteractdistributor), [`hepteractDistributorRatios`](Settings-Reference#hepteractdistributorratios), [`hepteractDistributorOpen`](Settings-Reference#hepteractdistributoropen)

**Source:** [hs-hepteracts.ts](https://github.com/Ferlieloi/synergism-hypersynergy/blob/master/src/mod/class/hs-modules/hs-hepteracts/hs-hepteracts.ts) · [hs-hepteract-ratios.ts](https://github.com/Ferlieloi/synergism-hypersynergy/blob/master/src/mod/class/hs-modules/hs-hepteracts/hs-hepteract-ratios.ts) · [hepteract-distributor.md](https://github.com/Ferlieloi/synergism-hypersynergy/blob/master/docs/features/hepteract-distributor.md) · [platonic-tooltip.md](https://github.com/Ferlieloi/synergism-hypersynergy/blob/master/docs/features/platonic-tooltip.md)

### Keep a scaling Hepteract reserve

Sets aside stock before Orbs and ratio-based crafting.

**Where:** Distributor → Keep 1e …

- Enter the power-of-ten exponent to keep. The remembered preference tracks its distance below your stock's order of magnitude, so the reserve grows with stock.
- Leave the field empty to keep nothing. The reserve is fixed once for the current distribution.

**Related settings:** [`hepteractDistributorKeep`](Settings-Reference#hepteractdistributorkeep)

**Source:** [hs-hepteracts.ts](https://github.com/Ferlieloi/synergism-hypersynergy/blob/master/src/mod/class/hs-modules/hs-hepteracts/hs-hepteracts.ts) · [hs-hepteract-ratios.ts](https://github.com/Ferlieloi/synergism-hypersynergy/blob/master/src/mod/class/hs-modules/hs-hepteracts/hs-hepteract-ratios.ts) · [hepteract-distributor.md](https://github.com/Ferlieloi/synergism-hypersynergy/blob/master/docs/features/hepteract-distributor.md) · [platonic-tooltip.md](https://github.com/Ferlieloi/synergism-hypersynergy/blob/master/docs/features/platonic-tooltip.md)

### Buy Overflux Orbs first

Spends a chosen percentage of available stock on Orbs before distribution.

**Where:** Distributor → Orbs percentage

- The percentage applies after the reserve; Orbs are separate from the hepteract ratio rows.

**Related settings:** [`hepteractDistributorOrbsPercent`](Settings-Reference#hepteractdistributororbspercent)

**Source:** [hs-hepteracts.ts](https://github.com/Ferlieloi/synergism-hypersynergy/blob/master/src/mod/class/hs-modules/hs-hepteracts/hs-hepteracts.ts) · [hs-hepteract-ratios.ts](https://github.com/Ferlieloi/synergism-hypersynergy/blob/master/src/mod/class/hs-modules/hs-hepteracts/hs-hepteract-ratios.ts) · [hepteract-distributor.md](https://github.com/Ferlieloi/synergism-hypersynergy/blob/master/docs/features/hepteract-distributor.md) · [platonic-tooltip.md](https://github.com/Ferlieloi/synergism-hypersynergy/blob/master/docs/features/platonic-tooltip.md)

### Optional partly filled meters

Uses the remaining budget on the next under-target type.

**Where:** Distributor → Allow partly filled meters

- Without the option, the planner stops at full-meter steps.
- With it, expansion is allowed only when enough can be crafted back to avoid reducing that type's balance.

**Related settings:** [`hepteractDistributorAllowPartial`](Settings-Reference#hepteractdistributorallowpartial)

**Source:** [hs-hepteracts.ts](https://github.com/Ferlieloi/synergism-hypersynergy/blob/master/src/mod/class/hs-modules/hs-hepteracts/hs-hepteracts.ts) · [hs-hepteract-ratios.ts](https://github.com/Ferlieloi/synergism-hypersynergy/blob/master/src/mod/class/hs-modules/hs-hepteracts/hs-hepteract-ratios.ts) · [hepteract-distributor.md](https://github.com/Ferlieloi/synergism-hypersynergy/blob/master/docs/features/hepteract-distributor.md) · [platonic-tooltip.md](https://github.com/Ferlieloi/synergism-hypersynergy/blob/master/docs/features/platonic-tooltip.md)

### Temporary singularity reducers and Talisman Power

Can swap in a temporary crafting tree, then restore your original tree.

**Where:** Distributor → Use singularity reducers and Talisman Power

- Uses affordable, available reductions to lower craft costs. The secondary stored preference controls the Talisman-Power-only case.
- Restores the original loadout/tree after the craft, including on errors, when the required patched loading path is available.

**Availability and limits**

- Loadout loads reset Ambrosia bars. If the game has no active slot and no exact remembered match, the run asks you to load or save a slot first. Unavailable reducers are reported and crafting can continue without them.

**Related settings:** [`hepteractDistributorUseReducers`](Settings-Reference#hepteractdistributorusereducers), [`hepteractDistributorTalismanAlone`](Settings-Reference#hepteractdistributortalismanalone)

**Source:** [hs-hepteracts.ts](https://github.com/Ferlieloi/synergism-hypersynergy/blob/master/src/mod/class/hs-modules/hs-hepteracts/hs-hepteracts.ts) · [hs-hepteract-ratios.ts](https://github.com/Ferlieloi/synergism-hypersynergy/blob/master/src/mod/class/hs-modules/hs-hepteracts/hs-hepteract-ratios.ts) · [hepteract-distributor.md](https://github.com/Ferlieloi/synergism-hypersynergy/blob/master/docs/features/hepteract-distributor.md) · [platonic-tooltip.md](https://github.com/Ferlieloi/synergism-hypersynergy/blob/master/docs/features/platonic-tooltip.md)

### Time until the next Platonic upgrade level

Adds an estimated wait and the longest resource requirement.

**Where:** Hover a Platonic upgrade

- Reports a duration, ready now, ready after ascending, or unknown when only unestimated resources remain.
- Includes cube income and the resource cost of missing Abyss Hepteracts, with a reminder to craft them when relevant.

**Availability and limits**

- Offerings and Obtainium shortages are reported but not timed. Limited-time Exalt overtime is warned about rather than modeled.

**Source:** [hs-hepteracts.ts](https://github.com/Ferlieloi/synergism-hypersynergy/blob/master/src/mod/class/hs-modules/hs-hepteracts/hs-hepteracts.ts) · [hs-hepteract-ratios.ts](https://github.com/Ferlieloi/synergism-hypersynergy/blob/master/src/mod/class/hs-modules/hs-hepteracts/hs-hepteract-ratios.ts) · [hepteract-distributor.md](https://github.com/Ferlieloi/synergism-hypersynergy/blob/master/docs/features/hepteract-distributor.md) · [platonic-tooltip.md](https://github.com/Ferlieloi/synergism-hypersynergy/blob/master/docs/features/platonic-tooltip.md)
