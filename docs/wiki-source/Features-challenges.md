# Corruption & challenge displays

Current versions use a single corruption level. The old corruption-loadout modules are no longer part of the mod.

## On this page

- [Current and next corruption level](#current-and-next-corruption-level)
- [Corruption controls from the header](#corruption-controls-from-the-header)
- [Corruption level controls in the module](#corruption-level-controls-in-the-module)
- [Keep corruption visible before C11](#keep-corruption-visible-before-c11)
- [One module for all active challenges](#one-module-for-all-active-challenges)
- [Compact the game's own challenge modules](#compact-the-games-own-challenge-modules)

### Current and next corruption level

Adds an arrow to the next ascension's level when it differs from the displayed level.

**Where:** Header → game's Corruption level module

- The current value remains the game's value, including zero inside an ascension challenge.
- The next-level indicator and popover controls share one toggle.

**Related settings:** [`corruptionHeaderControls`](Settings-Reference#corruptionheadercontrols)

**Source:** [header-corruption.md](https://github.com/Ferlieloi/synergism-hypersynergy/blob/master/docs/features/header-corruption.md) · [header-challenge-progress.md](https://github.com/Ferlieloi/synergism-hypersynergy/blob/master/docs/features/header-challenge-progress.md)

### Corruption controls from the header

Changes the next level without opening the Corruption tab.

**Where:** Click the Corruption level header module

- The popover provides 0, −10, −1, a numeric input, +1, +10 and Max through the game's controls.
- Auto-climb and Cleanse to highest toggles mirror the game. Cleanse needs two clicks, with the confirmation cleared when the popover closes.
- Escape, an outside press, a second module click or entering edit mode closes the popover.

**Availability and limits**

- The game clamps levels to those currently available. Cleanse changes the current ascension immediately; changing the next level normally applies on the next ascension.

**Source:** [header-corruption.md](https://github.com/Ferlieloi/synergism-hypersynergy/blob/master/docs/features/header-corruption.md) · [header-challenge-progress.md](https://github.com/Ferlieloi/synergism-hypersynergy/blob/master/docs/features/header-challenge-progress.md)

### Corruption level controls in the module

Changes the next level in the module itself, without opening the popover.

**Where:** Header → game's Corruption level module, at size M or L

- At M: ‹ and › step by 1, by 10 with Shift, and repeat while held. Click the number to type a level. Click /max to set the maximum.
- At L: also 0, Max, the cleanse (two clicks) and Auto-climb.
- At S or stacked, the module keeps its usual text. The icon and the current level still open the popover, which has every control.

**Related settings:** [`corruptionHeaderInline`](Settings-Reference#corruptionheaderinline)

**Source:** [header-corruption.md](https://github.com/Ferlieloi/synergism-hypersynergy/blob/master/docs/features/header-corruption.md) · [header-challenge-progress.md](https://github.com/Ferlieloi/synergism-hypersynergy/blob/master/docs/features/header-challenge-progress.md)

### Keep corruption visible before C11

Keeps the module available at the start of later singularities.

**Where:** [HS] Header → Corruption module → Keep visible

- After the first singularity, the module can remain visible before C11. A 0/0 display before corruption unlock is expected; the toggles are still useful.

**Availability and limits**

- Requires the header-modules patch.

**Related settings:** [`corruptionHeaderAlwaysShown`](Settings-Reference#corruptionheaderalwaysshown)

**Source:** [header-corruption.md](https://github.com/Ferlieloi/synergism-hypersynergy/blob/master/docs/features/header-corruption.md) · [header-challenge-progress.md](https://github.com/Ferlieloi/synergism-hypersynergy/blob/master/docs/features/header-challenge-progress.md)

### One module for all active challenges

Combines the active challenge tiers in one place.

**Where:** [HS] Header → Mod modules → Challenge progress

- Shows higher-tier challenges first. Choose all on one line or one line per tier.
- Details can be hidden, show completions (C15 score instead), or add resource progress and requirements.
- Tall 1×2 is supported; optional CØ marks the module when no challenge is active.

**Availability and limits**

- Needs live-player access. Requirement detail is not offered on mobile because the game does not supply those progress lines there.

**Related settings:** [`challengeProgressHeader`](Settings-Reference#challengeprogressheader), [`challengeProgressLayout`](Settings-Reference#challengeprogresslayout), [`challengeProgressDetails`](Settings-Reference#challengeprogressdetails), [`challengeProgressShowNone`](Settings-Reference#challengeprogressshownone)

**Source:** [header-corruption.md](https://github.com/Ferlieloi/synergism-hypersynergy/blob/master/docs/features/header-corruption.md) · [header-challenge-progress.md](https://github.com/Ferlieloi/synergism-hypersynergy/blob/master/docs/features/header-challenge-progress.md)

### Compact the game's own challenge modules

Removes repeated challenge names from native progress text.

**Where:** [HS] Header → Challenge progress → Game's modules: numbers only

- Keeps current/required values or C15 score, with the full description available on hover.
- The game's inactive editor previews remain recognizable.
- On a patched game, tall native challenge modules use one row in this mode. Turning it off restores their saved size.

**Related settings:** [`compactChallengeText`](Settings-Reference#compactchallengetext)

**Source:** [header-corruption.md](https://github.com/Ferlieloi/synergism-hypersynergy/blob/master/docs/features/header-corruption.md) · [header-challenge-progress.md](https://github.com/Ferlieloi/synergism-hypersynergy/blob/master/docs/features/header-challenge-progress.md)
