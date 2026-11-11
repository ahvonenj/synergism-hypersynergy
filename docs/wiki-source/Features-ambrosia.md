# Ambrosia loadouts & income

The mod enhances the game's Ambrosia loadout controls and adds generation information for blue, red and purple resources.

## On this page

- [Custom Ambrosia loadout icons](#custom-ambrosia-loadout-icons)
- [Loaded-loadout indicator](#loaded-loadout-indicator)
- [Quick Import one or multiple loadouts](#quick-import-one-or-multiple-loadouts)
- [Keep Ambrosia upgrade levels visible](#keep-ambrosia-upgrade-levels-visible)
- [Separate ADD and TIME Auto-Loadouts](#separate-add-and-time-auto-loadouts)
- [Ascension loadout auto-switch](#ascension-loadout-auto-switch)
- [Blue, red and purple progress minibars](#blue-red-and-purple-progress-minibars)
- [Expected Ambrosia income per hour](#expected-ambrosia-income-per-hour)

### Custom Ambrosia loadout icons

Gives saved loadouts recognizable icons instead of only numbers.

**Where:** Header editor → slot icon chooser; Ambrosia tab

- Choose an icon through the header slot's icon dialog, including the mod's Pick any game icon option. The mod applies its stored custom icon to the matching Ambrosia-tab slot too.
- The same stored icon is reused by the Heater slot row; choosing a native icon or plain number clears the mod's custom override.

**Source:** [hs-ambrosia.ts](https://github.com/Ferlieloi/synergism-hypersynergy/blob/master/src/mod/class/hs-modules/hs-ambrosia/hs-ambrosia.ts) · [hs-ambrosia-quick-import.ts](https://github.com/Ferlieloi/synergism-hypersynergy/blob/master/src/mod/class/hs-modules/hs-ambrosia/hs-ambrosia-quick-import.ts) · [hs-ambrosia-rates.ts](https://github.com/Ferlieloi/synergism-hypersynergy/blob/master/src/mod/class/hs-modules/hs-ambrosia/hs-ambrosia-rates.ts) · [header-loadouts.md](https://github.com/Ferlieloi/synergism-hypersynergy/blob/master/docs/features/header-loadouts.md) · [header-modules.md](https://github.com/Ferlieloi/synergism-hypersynergy/blob/master/docs/features/header-modules.md)

### Loaded-loadout indicator

Distinguishes the game's confirmed active slot from a guessed match.

**Where:** Ambrosia tab and the game's header loadout modules

- A rainbow border means the game has marked the slot active; silver means the mod inferred the slot from the save.
- Indicators are restored after the game rebuilds its slot controls, including the paged header module.

**Availability and limits**

- A guessed slot is not a guarantee that the live tree exactly matches it; actions that need an exact match check separately.

**Source:** [hs-ambrosia.ts](https://github.com/Ferlieloi/synergism-hypersynergy/blob/master/src/mod/class/hs-modules/hs-ambrosia/hs-ambrosia.ts) · [hs-ambrosia-quick-import.ts](https://github.com/Ferlieloi/synergism-hypersynergy/blob/master/src/mod/class/hs-modules/hs-ambrosia/hs-ambrosia-quick-import.ts) · [hs-ambrosia-rates.ts](https://github.com/Ferlieloi/synergism-hypersynergy/blob/master/src/mod/class/hs-modules/hs-ambrosia/hs-ambrosia-rates.ts) · [header-loadouts.md](https://github.com/Ferlieloi/synergism-hypersynergy/blob/master/docs/features/header-loadouts.md) · [header-modules.md](https://github.com/Ferlieloi/synergism-hypersynergy/blob/master/docs/features/header-modules.md)

### Quick Import one or multiple loadouts

Imports one to sixteen newline-separated loadouts from the clipboard.

**Where:** Ambrosia tab → Quick Import

- One loadout is written to the slot shown as active; load a slot first when none is shown.
- Multiple lines map to slots 1–16 in order; empty lines are skipped. Locked or invalid slots are reported.
- Older loadout JSON is normalized with missing upgrade keys at zero. Patched games validate and write slots directly; legacy games use the game's import dialogs.

**Availability and limits**

- Clipboard read access is required. Importing into the active slot reloads its tree, resetting Ambrosia bar progress. The legacy import path is refused while AutoSing runs.

**Source:** [hs-ambrosia.ts](https://github.com/Ferlieloi/synergism-hypersynergy/blob/master/src/mod/class/hs-modules/hs-ambrosia/hs-ambrosia.ts) · [hs-ambrosia-quick-import.ts](https://github.com/Ferlieloi/synergism-hypersynergy/blob/master/src/mod/class/hs-modules/hs-ambrosia/hs-ambrosia-quick-import.ts) · [hs-ambrosia-rates.ts](https://github.com/Ferlieloi/synergism-hypersynergy/blob/master/src/mod/class/hs-modules/hs-ambrosia/hs-ambrosia-rates.ts) · [header-loadouts.md](https://github.com/Ferlieloi/synergism-hypersynergy/blob/master/docs/features/header-loadouts.md) · [header-modules.md](https://github.com/Ferlieloi/synergism-hypersynergy/blob/master/docs/features/header-modules.md)

### Keep Ambrosia upgrade levels visible

Keeps the game's levels view pinned while the tree is idle.

**Where:** Settings → QoL → Keep tree levels shown

- The display temporarily yields while the pointer is over the tree or a loadout, then returns to the pinned levels view.

**Related settings:** [`persistentAmbrosiaLevels`](Settings-Reference#persistentambrosialevels)

**Source:** [hs-ambrosia.ts](https://github.com/Ferlieloi/synergism-hypersynergy/blob/master/src/mod/class/hs-modules/hs-ambrosia/hs-ambrosia.ts) · [hs-ambrosia-quick-import.ts](https://github.com/Ferlieloi/synergism-hypersynergy/blob/master/src/mod/class/hs-modules/hs-ambrosia/hs-ambrosia-quick-import.ts) · [hs-ambrosia-rates.ts](https://github.com/Ferlieloi/synergism-hypersynergy/blob/master/src/mod/class/hs-modules/hs-ambrosia/hs-ambrosia-rates.ts) · [header-loadouts.md](https://github.com/Ferlieloi/synergism-hypersynergy/blob/master/docs/features/header-loadouts.md) · [header-modules.md](https://github.com/Ferlieloi/synergism-hypersynergy/blob/master/docs/features/header-modules.md)

### Separate ADD and TIME Auto-Loadouts

Loads the configured tree before a code pays out and restores the previous loadout afterward.

**Where:** Settings → QoL → Add+Time loadouts auto-switch

- Choose independent ADD and TIME slots, then enable Auto-Loadout. ADD shortcuts use the same switching path.
- TIME is automatically answered only when Cx11 is maxed on a patched game; below that, the timing dialog is left for you.
- AutoSing bypasses this feature because it manages its own loadouts.

**Availability and limits**

- Loading trees resets Ambrosia bars. The fallback and previous-slot availability can limit restoration.

**Related settings:** [`addTimeAutoLoadouts`](Settings-Reference#addtimeautoloadouts), [`autoLoadoutAdd`](Settings-Reference#autoloadoutadd), [`autoLoadoutTime`](Settings-Reference#autoloadouttime)

**Source:** [hs-ambrosia-auto-loadout.ts](https://github.com/Ferlieloi/synergism-hypersynergy/blob/master/src/mod/class/hs-modules/hs-ambrosia/hs-ambrosia-auto-loadout.ts) · [hs-ambrosia.ts](https://github.com/Ferlieloi/synergism-hypersynergy/blob/master/src/mod/class/hs-modules/hs-ambrosia/hs-ambrosia.ts) · [hs-ambrosia-quick-import.ts](https://github.com/Ferlieloi/synergism-hypersynergy/blob/master/src/mod/class/hs-modules/hs-ambrosia/hs-ambrosia-quick-import.ts) · [hs-ambrosia-rates.ts](https://github.com/Ferlieloi/synergism-hypersynergy/blob/master/src/mod/class/hs-modules/hs-ambrosia/hs-ambrosia-rates.ts) · [header-loadouts.md](https://github.com/Ferlieloi/synergism-hypersynergy/blob/master/docs/features/header-loadouts.md) · [header-modules.md](https://github.com/Ferlieloi/synergism-hypersynergy/blob/master/docs/features/header-modules.md)

### Ascension loadout auto-switch

Uses a chosen Ambrosia loadout for a manual ascension and restores the previous tree afterward.

**Where:** Settings → QoL → Ascension loadout auto-switch

- Enable the switch and choose a saved slot. The game confirms the ascension as usual.
- The Ascend button works with or without the patch. Shift+A uses the configured loadout when the game is patched.

**Availability and limits**

- Switching loadouts resets Ambrosia bar progress. Without the patch, the mod restores the saved contents of the previously marked slot, so save tree edits before ascending.

**Related settings:** [`ascensionAutoLoadout`](Settings-Reference#ascensionautoloadout), [`autoLoadoutAscension`](Settings-Reference#autoloadoutascension)

**Source:** [ascension-loadout.md](https://github.com/Ferlieloi/synergism-hypersynergy/blob/master/docs/features/ascension-loadout.md) · [hs-ambrosia-auto-loadout.ts](https://github.com/Ferlieloi/synergism-hypersynergy/blob/master/src/mod/class/hs-modules/hs-ambrosia/hs-ambrosia-auto-loadout.ts) · [hs-ambrosia.ts](https://github.com/Ferlieloi/synergism-hypersynergy/blob/master/src/mod/class/hs-modules/hs-ambrosia/hs-ambrosia.ts) · [hs-ambrosia-quick-import.ts](https://github.com/Ferlieloi/synergism-hypersynergy/blob/master/src/mod/class/hs-modules/hs-ambrosia/hs-ambrosia-quick-import.ts) · [hs-ambrosia-rates.ts](https://github.com/Ferlieloi/synergism-hypersynergy/blob/master/src/mod/class/hs-modules/hs-ambrosia/hs-ambrosia-rates.ts) · [header-loadouts.md](https://github.com/Ferlieloi/synergism-hypersynergy/blob/master/docs/features/header-loadouts.md) · [header-modules.md](https://github.com/Ferlieloi/synergism-hypersynergy/blob/master/docs/features/header-modules.md)

### Blue, red and purple progress minibars

Shows compact progress bars without keeping the Ambrosia tab open.

**Where:** Header editor → [HS] Header → Mod modules

- The bars follow the game's unlocks: blue Ambrosia, then red Ambrosia and purple honey when available.
- They are one movable header module; resizing and a group border are configured in header edit mode.
- Patched games read live progress; legacy loaders use the mod's fallback row and GDS.

**Related settings:** [`ambrosiaMinibars`](Settings-Reference#ambrosiaminibars)

**Source:** [hs-ambrosia.ts](https://github.com/Ferlieloi/synergism-hypersynergy/blob/master/src/mod/class/hs-modules/hs-ambrosia/hs-ambrosia.ts) · [hs-ambrosia-quick-import.ts](https://github.com/Ferlieloi/synergism-hypersynergy/blob/master/src/mod/class/hs-modules/hs-ambrosia/hs-ambrosia-quick-import.ts) · [hs-ambrosia-rates.ts](https://github.com/Ferlieloi/synergism-hypersynergy/blob/master/src/mod/class/hs-modules/hs-ambrosia/hs-ambrosia-rates.ts) · [header-loadouts.md](https://github.com/Ferlieloi/synergism-hypersynergy/blob/master/docs/features/header-loadouts.md) · [header-modules.md](https://github.com/Ferlieloi/synergism-hypersynergy/blob/master/docs/features/header-modules.md)

### Expected Ambrosia income per hour

Shows expected blue Ambrosia, red Ambrosia and purple honey income for the current tree.

**Where:** Ambrosia tab; header editor → Ambrosia per hour

- The header offers separate rate modules that can be moved, stacked or placed in the tray.
- Rates account for the current generation model, including Purple Reactor effects; they are expectations rather than a promise of individual random payouts.

**Related settings:** [`ambrosiaRateHeader`](Settings-Reference#ambrosiarateheader)

**Source:** [hs-ambrosia.ts](https://github.com/Ferlieloi/synergism-hypersynergy/blob/master/src/mod/class/hs-modules/hs-ambrosia/hs-ambrosia.ts) · [hs-ambrosia-quick-import.ts](https://github.com/Ferlieloi/synergism-hypersynergy/blob/master/src/mod/class/hs-modules/hs-ambrosia/hs-ambrosia-quick-import.ts) · [hs-ambrosia-rates.ts](https://github.com/Ferlieloi/synergism-hypersynergy/blob/master/src/mod/class/hs-modules/hs-ambrosia/hs-ambrosia-rates.ts) · [header-loadouts.md](https://github.com/Ferlieloi/synergism-hypersynergy/blob/master/docs/features/header-loadouts.md) · [header-modules.md](https://github.com/Ferlieloi/synergism-hypersynergy/blob/master/docs/features/header-modules.md)
