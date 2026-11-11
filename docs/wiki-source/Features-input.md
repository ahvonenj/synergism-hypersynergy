# Click-saving tools & input

Convenience controls use the game's own actions; optional repeated input is active only while its modifier is held.

## On this page

- [Clickable reusable promotion codes](#clickable-reusable-promotion-codes)
- [ADD ×10 shortcut](#add-10-shortcut)
- [Buy and consume potions ×10](#buy-and-consume-potions-10)
- [Repeat hover while holding left Shift](#repeat-hover-while-holding-left-shift)
- [Auto-click while holding left Ctrl](#auto-click-while-holding-left-ctrl)

### Clickable reusable promotion codes

Lists reusable codes and fills the input when a code is clicked.

**Where:** Game → promotion-code dialog

- The current injected list includes synergism2026, Khafra, :unsmith: and :antismith:.
- Selecting a code fills the game's field; it does not redeem it automatically.

**Availability and limits**

- Injection depends on recognizing the game's reusable-code prompt.

**Source:** [hs-codes.ts](https://github.com/Ferlieloi/synergism-hypersynergy/blob/master/src/mod/class/hs-modules/hs-codes.ts) · [hs-qol-buttons.ts](https://github.com/Ferlieloi/synergism-hypersynergy/blob/master/src/mod/class/hs-modules/hs-qol-buttons/hs-qol-buttons.ts) · [hs-mouse.ts](https://github.com/Ferlieloi/synergism-hypersynergy/blob/master/src/mod/class/hs-core/hs-mouse.ts)

### ADD ×10 shortcut

Requests ten ADD-code uses from one added button.

**Where:** Game → ADD code controls

- Answers the native ADD quantity prompt with 10 and dismisses its result alert; configured ADD Auto-Loadout also applies.
- Without a maxed calculator, the game's arithmetic question is still shown for you to answer.
- ADD/TIME information is refreshed after their queued dialogs finish so remaining uses do not stay stale.

**Availability and limits**

- The game still determines code availability and rewards.

**Source:** [hs-codes.ts](https://github.com/Ferlieloi/synergism-hypersynergy/blob/master/src/mod/class/hs-modules/hs-codes.ts) · [hs-qol-buttons.ts](https://github.com/Ferlieloi/synergism-hypersynergy/blob/master/src/mod/class/hs-modules/hs-qol-buttons/hs-qol-buttons.ts) · [hs-mouse.ts](https://github.com/Ferlieloi/synergism-hypersynergy/blob/master/src/mod/class/hs-core/hs-mouse.ts)

### Buy and consume potions ×10

Adds BUY 10× and CONSUME 10× next to the native potion buttons.

**Where:** Offering and Obtainium potion controls

- Consumption clicks the native action ten times. Buying handles the game's purchase modes, including Buy ANY's quantity prompt.
- Both Offering and Obtainium potions are supported.

**Availability and limits**

- Each action uses the game's costs and available stock.

**Source:** [hs-codes.ts](https://github.com/Ferlieloi/synergism-hypersynergy/blob/master/src/mod/class/hs-modules/hs-codes.ts) · [hs-qol-buttons.ts](https://github.com/Ferlieloi/synergism-hypersynergy/blob/master/src/mod/class/hs-modules/hs-qol-buttons/hs-qol-buttons.ts) · [hs-mouse.ts](https://github.com/Ferlieloi/synergism-hypersynergy/blob/master/src/mod/class/hs-core/hs-mouse.ts)

### Repeat hover while holding left Shift

Repeatedly refreshes the hover event under the pointer.

**Where:** Settings → Input → Repeat hover

- Enable the option and set the interval in seconds; hold left Shift to emit repeated mouseover events.
- Releasing the modifier, switching windows or hiding the page stops it.

**Related settings:** [`reactiveMouseHover`](Settings-Reference#reactivemousehover)

**Source:** [hs-codes.ts](https://github.com/Ferlieloi/synergism-hypersynergy/blob/master/src/mod/class/hs-modules/hs-codes.ts) · [hs-qol-buttons.ts](https://github.com/Ferlieloi/synergism-hypersynergy/blob/master/src/mod/class/hs-modules/hs-qol-buttons/hs-qol-buttons.ts) · [hs-mouse.ts](https://github.com/Ferlieloi/synergism-hypersynergy/blob/master/src/mod/class/hs-core/hs-mouse.ts)

### Auto-click while holding left Ctrl

Repeats clicks at the pointer with a configurable interval.

**Where:** Settings → Input → Auto click

- Enable it, choose the interval in seconds, then hold left Ctrl over the desired target.
- Releasing the modifier or leaving the page stops the timer. Skip risky buttons, under Auto click and on by default for new players, avoids selected controls.

**Availability and limits**

- Skip risky buttons is a convenience filter, not a guarantee against every unintended click.

**Related settings:** [`autoClick`](Settings-Reference#autoclick), [`autoClickIgnoreElements`](Settings-Reference#autoclickignoreelements)

**Source:** [hs-codes.ts](https://github.com/Ferlieloi/synergism-hypersynergy/blob/master/src/mod/class/hs-modules/hs-codes.ts) · [hs-qol-buttons.ts](https://github.com/Ferlieloi/synergism-hypersynergy/blob/master/src/mod/class/hs-modules/hs-qol-buttons/hs-qol-buttons.ts) · [hs-mouse.ts](https://github.com/Ferlieloi/synergism-hypersynergy/blob/master/src/mod/class/hs-core/hs-mouse.ts)
