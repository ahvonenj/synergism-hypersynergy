# Header customization

Open the game's header editor with the pencil beside the mod icon, or Settings → UI → Edit game header. HS options live beside the game's module tray, not in a separate quickbar settings page.

## On this page

- [Header pencil and editor shortcut](#header-pencil-and-editor-shortcut)
- [Optional long-press editing](#optional-long-press-editing)
- [Header grid width slider and typed width](#header-grid-width-slider-and-typed-width)
- [Move the top row to the bottom](#move-the-top-row-to-the-bottom)
- [Remove unused space below the header](#remove-unused-space-below-the-header)
- [Per-cell horizontal and vertical alignment](#per-cell-horizontal-and-vertical-alignment)
- [Half-height cells](#half-height-cells)
- [Reset-button groups adapt to cell width](#reset-button-groups-adapt-to-cell-width)
- [Remember placement, size and stacks of mod modules](#remember-placement-size-and-stacks-of-mod-modules)
- [Resize minibars with drag handles](#resize-minibars-with-drag-handles)
- [Optional minibar frame](#optional-minibar-frame)
- [Fit loadout slots to their cell](#fit-loadout-slots-to-their-cell)
- [Choose how many loadout slots to show](#choose-how-many-loadout-slots-to-show)
- [Hide the leading Ambrosia bar icon](#hide-the-leading-ambrosia-bar-icon)
- [Pick any game image for a loadout slot](#pick-any-game-image-for-a-loadout-slot)
- [Match Octeract icon size](#match-octeract-icon-size)
- [Match Octeract unit text](#match-octeract-unit-text)
- [Singularity Elevator from the header](#singularity-elevator-from-the-header)
- [Keep your header when loading another save](#keep-your-header-when-loading-another-save)
- [Automation quickbar with mixed-state indicators](#automation-quickbar-with-mixed-state-indicators)

### Header pencil and editor shortcut

Opens header editing without waiting for a long press.

**Where:** Pencil next to mod icon; Settings → UI → Edit game header

- The pencil toggles edit mode and can itself be hidden in the Layout section. The panel's button opens the editor and closes the panel.
- Done saves the header and pending mod settings.

**Related settings:** [`headerEditButton`](Settings-Reference#headereditbutton), [`editGameHeader`](Settings-Reference#editgameheader)

**Source:** [header-edit-mode.md](https://github.com/Ferlieloi/synergism-hypersynergy/blob/master/docs/features/header-edit-mode.md) · [header-elevator.md](https://github.com/Ferlieloi/synergism-hypersynergy/blob/master/docs/features/header-elevator.md) · [header-loadouts.md](https://github.com/Ferlieloi/synergism-hypersynergy/blob/master/docs/features/header-loadouts.md) · [header-modules.md](https://github.com/Ferlieloi/synergism-hypersynergy/blob/master/docs/features/header-modules.md) · [hs-header-keep-on-import.ts](https://github.com/Ferlieloi/synergism-hypersynergy/blob/master/src/mod/class/hs-core/header/hs-header-keep-on-import.ts) · [hs-header-loadout-icons.ts](https://github.com/Ferlieloi/synergism-hypersynergy/blob/master/src/mod/class/hs-modules/hs-loadout-icons/hs-header-loadout-icons.ts)

### Optional long-press editing

Lets you disable accidental entry to header edit mode.

**Where:** [HS] Header → Layout → Long press to edit

- With it off, the pencil and panel shortcut remain available. Normal clicks and dragging inside edit mode are unchanged.

**Availability and limits**

- Shown only when the long-press patch is available.

**Related settings:** [`headerLongPressEditing`](Settings-Reference#headerlongpressediting)

**Source:** [header-edit-mode.md](https://github.com/Ferlieloi/synergism-hypersynergy/blob/master/docs/features/header-edit-mode.md) · [header-elevator.md](https://github.com/Ferlieloi/synergism-hypersynergy/blob/master/docs/features/header-elevator.md) · [header-loadouts.md](https://github.com/Ferlieloi/synergism-hypersynergy/blob/master/docs/features/header-loadouts.md) · [header-modules.md](https://github.com/Ferlieloi/synergism-hypersynergy/blob/master/docs/features/header-modules.md) · [hs-header-keep-on-import.ts](https://github.com/Ferlieloi/synergism-hypersynergy/blob/master/src/mod/class/hs-core/header/hs-header-keep-on-import.ts) · [hs-header-loadout-icons.ts](https://github.com/Ferlieloi/synergism-hypersynergy/blob/master/src/mod/class/hs-modules/hs-loadout-icons/hs-header-loadout-icons.ts)

### Header grid width slider and typed width

Adjusts the desktop grid's width cap, including a full-width option.

**Where:** [HS] Header → Layout → Grid width

- Drag the slider or type a pixel value. Reset restores the game's width cap.
- The chosen width is remembered locally and still shrinks with the window; it does not change the game's seven-column grid.

**Availability and limits**

- Desktop only, with the game's 1250px minimum. Mobile uses the game's own layout.

**Source:** [header-edit-mode.md](https://github.com/Ferlieloi/synergism-hypersynergy/blob/master/docs/features/header-edit-mode.md) · [header-elevator.md](https://github.com/Ferlieloi/synergism-hypersynergy/blob/master/docs/features/header-elevator.md) · [header-loadouts.md](https://github.com/Ferlieloi/synergism-hypersynergy/blob/master/docs/features/header-loadouts.md) · [header-modules.md](https://github.com/Ferlieloi/synergism-hypersynergy/blob/master/docs/features/header-modules.md) · [hs-header-keep-on-import.ts](https://github.com/Ferlieloi/synergism-hypersynergy/blob/master/src/mod/class/hs-core/header/hs-header-keep-on-import.ts) · [hs-header-loadout-icons.ts](https://github.com/Ferlieloi/synergism-hypersynergy/blob/master/src/mod/class/hs-modules/hs-loadout-icons/hs-header-loadout-icons.ts)

### Move the top row to the bottom

Places the top resource row beneath the header grid.

**Where:** [HS] Header → Layout → Top row at the bottom

- The main tabs stay below the header; module order inside the row is kept. The preference is local and remembered.

**Related settings:** [`headerStatsAtBottom`](Settings-Reference#headerstatsatbottom)

**Source:** [header-edit-mode.md](https://github.com/Ferlieloi/synergism-hypersynergy/blob/master/docs/features/header-edit-mode.md) · [header-elevator.md](https://github.com/Ferlieloi/synergism-hypersynergy/blob/master/docs/features/header-elevator.md) · [header-loadouts.md](https://github.com/Ferlieloi/synergism-hypersynergy/blob/master/docs/features/header-loadouts.md) · [header-modules.md](https://github.com/Ferlieloi/synergism-hypersynergy/blob/master/docs/features/header-modules.md) · [hs-header-keep-on-import.ts](https://github.com/Ferlieloi/synergism-hypersynergy/blob/master/src/mod/class/hs-core/header/hs-header-keep-on-import.ts) · [hs-header-loadout-icons.ts](https://github.com/Ferlieloi/synergism-hypersynergy/blob/master/src/mod/class/hs-modules/hs-loadout-icons/hs-header-loadout-icons.ts)

### Remove unused space below the header

Brings the main tabs up to the last visible header content.

**Where:** [HS] Header → Layout → Remove header gap

- Collapses unused trailing space and margins while restoring the full grid during editing.

**Related settings:** [`removeHeaderGap`](Settings-Reference#removeheadergap)

**Source:** [header-edit-mode.md](https://github.com/Ferlieloi/synergism-hypersynergy/blob/master/docs/features/header-edit-mode.md) · [header-elevator.md](https://github.com/Ferlieloi/synergism-hypersynergy/blob/master/docs/features/header-elevator.md) · [header-loadouts.md](https://github.com/Ferlieloi/synergism-hypersynergy/blob/master/docs/features/header-loadouts.md) · [header-modules.md](https://github.com/Ferlieloi/synergism-hypersynergy/blob/master/docs/features/header-modules.md) · [hs-header-keep-on-import.ts](https://github.com/Ferlieloi/synergism-hypersynergy/blob/master/src/mod/class/hs-core/header/hs-header-keep-on-import.ts) · [hs-header-loadout-icons.ts](https://github.com/Ferlieloi/synergism-hypersynergy/blob/master/src/mod/class/hs-modules/hs-loadout-icons/hs-header-loadout-icons.ts)

### Per-cell horizontal and vertical alignment

Aligns cell content left, center or right, and top, center or bottom.

**Where:** Header editor → select a cell → alignment controls

- Choices are remembered separately for desktop and mobile by cell position.
- Click the selected alignment again to remove the override and restore the game's layout.
- Stacked reset-button groups wrap in their saved order and honor the cell's horizontal alignment.

**Source:** [header-edit-mode.md](https://github.com/Ferlieloi/synergism-hypersynergy/blob/master/docs/features/header-edit-mode.md) · [header-elevator.md](https://github.com/Ferlieloi/synergism-hypersynergy/blob/master/docs/features/header-elevator.md) · [header-loadouts.md](https://github.com/Ferlieloi/synergism-hypersynergy/blob/master/docs/features/header-loadouts.md) · [header-modules.md](https://github.com/Ferlieloi/synergism-hypersynergy/blob/master/docs/features/header-modules.md) · [hs-header-keep-on-import.ts](https://github.com/Ferlieloi/synergism-hypersynergy/blob/master/src/mod/class/hs-core/header/hs-header-keep-on-import.ts) · [hs-header-loadout-icons.ts](https://github.com/Ferlieloi/synergism-hypersynergy/blob/master/src/mod/class/hs-modules/hs-loadout-icons/hs-header-loadout-icons.ts)

### Half-height cells

Fits eligible single modules into a more compact cell.

**Where:** Header editor → select a cell → Height: Full / Half

- Half height is a local visual setting, separate from the game's saved module size.
- Use Full or clear the override to return to the normal layout.

**Availability and limits**

- Not available for stacked cells or a Tall 1×2 module.

**Source:** [header-edit-mode.md](https://github.com/Ferlieloi/synergism-hypersynergy/blob/master/docs/features/header-edit-mode.md) · [header-elevator.md](https://github.com/Ferlieloi/synergism-hypersynergy/blob/master/docs/features/header-elevator.md) · [header-loadouts.md](https://github.com/Ferlieloi/synergism-hypersynergy/blob/master/docs/features/header-loadouts.md) · [header-modules.md](https://github.com/Ferlieloi/synergism-hypersynergy/blob/master/docs/features/header-modules.md) · [hs-header-keep-on-import.ts](https://github.com/Ferlieloi/synergism-hypersynergy/blob/master/src/mod/class/hs-core/header/hs-header-keep-on-import.ts) · [hs-header-loadout-icons.ts](https://github.com/Ferlieloi/synergism-hypersynergy/blob/master/src/mod/class/hs-modules/hs-loadout-icons/hs-header-loadout-icons.ts)

### Reset-button groups adapt to cell width

Fits more reset buttons in wide cells and wraps them on narrower windows.

**Where:** Header editor → grouped game reset buttons

- Capacity follows the cell width and button widths, up to eight buttons.
- An aligned group accepts a dragged button before the button under the pointer. Groups made on a wider window keep their buttons when the window becomes narrower.

**Availability and limits**

- The corresponding game patch is needed for the dynamic grouping behavior.

**Source:** [header-edit-mode.md](https://github.com/Ferlieloi/synergism-hypersynergy/blob/master/docs/features/header-edit-mode.md) · [header-elevator.md](https://github.com/Ferlieloi/synergism-hypersynergy/blob/master/docs/features/header-elevator.md) · [header-loadouts.md](https://github.com/Ferlieloi/synergism-hypersynergy/blob/master/docs/features/header-loadouts.md) · [header-modules.md](https://github.com/Ferlieloi/synergism-hypersynergy/blob/master/docs/features/header-modules.md) · [hs-header-keep-on-import.ts](https://github.com/Ferlieloi/synergism-hypersynergy/blob/master/src/mod/class/hs-core/header/hs-header-keep-on-import.ts) · [hs-header-loadout-icons.ts](https://github.com/Ferlieloi/synergism-hypersynergy/blob/master/src/mod/class/hs-modules/hs-loadout-icons/hs-header-loadout-icons.ts)

### Remember placement, size and stacks of mod modules

Treats mod modules like native modules without adding unknown IDs to game saves.

**Where:** Game's header editor and Hidden tray

- Move, hide, resize and stack the Automation bar, Ambrosia bars, hourly-rate modules and Challenge progress module.
- New modules start in the Hidden tray. Their positions and stack order are kept locally for each desktop/mobile layout.
- Turning a module off and back on restores its remembered place when available. The game's Reset clears that layout's mod placements.

**Availability and limits**

- Full integration requires the header-modules patch; older loaders retain a fallback row for supported bars.

**Source:** [header-edit-mode.md](https://github.com/Ferlieloi/synergism-hypersynergy/blob/master/docs/features/header-edit-mode.md) · [header-elevator.md](https://github.com/Ferlieloi/synergism-hypersynergy/blob/master/docs/features/header-elevator.md) · [header-loadouts.md](https://github.com/Ferlieloi/synergism-hypersynergy/blob/master/docs/features/header-loadouts.md) · [header-modules.md](https://github.com/Ferlieloi/synergism-hypersynergy/blob/master/docs/features/header-modules.md) · [hs-header-keep-on-import.ts](https://github.com/Ferlieloi/synergism-hypersynergy/blob/master/src/mod/class/hs-core/header/hs-header-keep-on-import.ts) · [hs-header-loadout-icons.ts](https://github.com/Ferlieloi/synergism-hypersynergy/blob/master/src/mod/class/hs-modules/hs-loadout-icons/hs-header-loadout-icons.ts)

### Resize minibars with drag handles

Changes minibar width and height with live size feedback.

**Where:** Header editor → Ambrosia minibars

- Use width, height or corner handles. Reset size restores the default.
- Dimensions are remembered separately for desktop and mobile; very small bars reduce the spacing between them.

**Source:** [header-edit-mode.md](https://github.com/Ferlieloi/synergism-hypersynergy/blob/master/docs/features/header-edit-mode.md) · [header-elevator.md](https://github.com/Ferlieloi/synergism-hypersynergy/blob/master/docs/features/header-elevator.md) · [header-loadouts.md](https://github.com/Ferlieloi/synergism-hypersynergy/blob/master/docs/features/header-loadouts.md) · [header-modules.md](https://github.com/Ferlieloi/synergism-hypersynergy/blob/master/docs/features/header-modules.md) · [hs-header-keep-on-import.ts](https://github.com/Ferlieloi/synergism-hypersynergy/blob/master/src/mod/class/hs-core/header/hs-header-keep-on-import.ts) · [hs-header-loadout-icons.ts](https://github.com/Ferlieloi/synergism-hypersynergy/blob/master/src/mod/class/hs-modules/hs-loadout-icons/hs-header-loadout-icons.ts)

### Optional minibar frame

Adds a single border around the progress-bar group.

**Where:** [HS] Header → Minibars border

- The frame surrounds the group so thin bars retain their full fill height; it is off by default.

**Related settings:** [`ambrosiaMinibarBorders`](Settings-Reference#ambrosiaminibarborders)

**Source:** [header-edit-mode.md](https://github.com/Ferlieloi/synergism-hypersynergy/blob/master/docs/features/header-edit-mode.md) · [header-elevator.md](https://github.com/Ferlieloi/synergism-hypersynergy/blob/master/docs/features/header-elevator.md) · [header-loadouts.md](https://github.com/Ferlieloi/synergism-hypersynergy/blob/master/docs/features/header-loadouts.md) · [header-modules.md](https://github.com/Ferlieloi/synergism-hypersynergy/blob/master/docs/features/header-modules.md) · [hs-header-keep-on-import.ts](https://github.com/Ferlieloi/synergism-hypersynergy/blob/master/src/mod/class/hs-core/header/hs-header-keep-on-import.ts) · [hs-header-loadout-icons.ts](https://github.com/Ferlieloi/synergism-hypersynergy/blob/master/src/mod/class/hs-modules/hs-loadout-icons/hs-header-loadout-icons.ts)

### Fit loadout slots to their cell

Sizes the header's Ambrosia slots to use the available grid width.

**Where:** [HS] Header → Ambrosia loadouts → Fit slots to the cell

- Slots use one row up to eight and two balanced rows above eight. Switch off to restore the game's original slot sizing and wrapping.

**Related settings:** [`headerFitLoadoutSlots`](Settings-Reference#headerfitloadoutslots)

**Source:** [header-edit-mode.md](https://github.com/Ferlieloi/synergism-hypersynergy/blob/master/docs/features/header-edit-mode.md) · [header-elevator.md](https://github.com/Ferlieloi/synergism-hypersynergy/blob/master/docs/features/header-elevator.md) · [header-loadouts.md](https://github.com/Ferlieloi/synergism-hypersynergy/blob/master/docs/features/header-loadouts.md) · [header-modules.md](https://github.com/Ferlieloi/synergism-hypersynergy/blob/master/docs/features/header-modules.md) · [hs-header-keep-on-import.ts](https://github.com/Ferlieloi/synergism-hypersynergy/blob/master/src/mod/class/hs-core/header/hs-header-keep-on-import.ts) · [hs-header-loadout-icons.ts](https://github.com/Ferlieloi/synergism-hypersynergy/blob/master/src/mod/class/hs-modules/hs-loadout-icons/hs-header-loadout-icons.ts)

### Choose how many loadout slots to show

Shows only the first N slots while leaving every slot usable elsewhere.

**Where:** [HS] Header → Ambrosia loadouts → − N +

- Choose from one through the available slots, or All. All also shows slots unlocked later.
- Hidden header slots still work on the Ambrosia tab, through hotkeys, AutoSing and Heater imports. The preference is kept across reloads.

**Related settings:** [`headerAmbrosiaSlotsShown`](Settings-Reference#headerambrosiaslotsshown)

**Source:** [header-edit-mode.md](https://github.com/Ferlieloi/synergism-hypersynergy/blob/master/docs/features/header-edit-mode.md) · [header-elevator.md](https://github.com/Ferlieloi/synergism-hypersynergy/blob/master/docs/features/header-elevator.md) · [header-loadouts.md](https://github.com/Ferlieloi/synergism-hypersynergy/blob/master/docs/features/header-loadouts.md) · [header-modules.md](https://github.com/Ferlieloi/synergism-hypersynergy/blob/master/docs/features/header-modules.md) · [hs-header-keep-on-import.ts](https://github.com/Ferlieloi/synergism-hypersynergy/blob/master/src/mod/class/hs-core/header/hs-header-keep-on-import.ts) · [hs-header-loadout-icons.ts](https://github.com/Ferlieloi/synergism-hypersynergy/blob/master/src/mod/class/hs-modules/hs-loadout-icons/hs-header-loadout-icons.ts)

### Hide the leading Ambrosia bar icon

Frees space by removing the full loadout module's leading icon.

**Where:** [HS] Header → Ambrosia loadouts → Hide ambrosia bar icon

- Applies in edit mode and the tray too. The paged loadout module keeps its leading icon because the area is also used to change pages.

**Related settings:** [`headerHideLoadoutIcons`](Settings-Reference#headerhideloadouticons)

**Source:** [header-edit-mode.md](https://github.com/Ferlieloi/synergism-hypersynergy/blob/master/docs/features/header-edit-mode.md) · [header-elevator.md](https://github.com/Ferlieloi/synergism-hypersynergy/blob/master/docs/features/header-elevator.md) · [header-loadouts.md](https://github.com/Ferlieloi/synergism-hypersynergy/blob/master/docs/features/header-loadouts.md) · [header-modules.md](https://github.com/Ferlieloi/synergism-hypersynergy/blob/master/docs/features/header-modules.md) · [hs-header-keep-on-import.ts](https://github.com/Ferlieloi/synergism-hypersynergy/blob/master/src/mod/class/hs-core/header/hs-header-keep-on-import.ts) · [hs-header-loadout-icons.ts](https://github.com/Ferlieloi/synergism-hypersynergy/blob/master/src/mod/class/hs-modules/hs-loadout-icons/hs-header-loadout-icons.ts)

### Pick any game image for a loadout slot

Extends the native icon chooser beyond Ambrosia upgrade icons.

**Where:** Header editor → loadout slot icon dialog → Pick any game icon

- Start the picker and click a game image to assign it. The custom image is kept per slot and reused in the full and paged header loadout modules, for desktop and mobile.
- Choosing a native icon or the plain number clears the mod override.

**Availability and limits**

- Custom icons are stored by the mod locally; the game's save schema only accepts its own icon names.

**Source:** [header-edit-mode.md](https://github.com/Ferlieloi/synergism-hypersynergy/blob/master/docs/features/header-edit-mode.md) · [header-elevator.md](https://github.com/Ferlieloi/synergism-hypersynergy/blob/master/docs/features/header-elevator.md) · [header-loadouts.md](https://github.com/Ferlieloi/synergism-hypersynergy/blob/master/docs/features/header-loadouts.md) · [header-modules.md](https://github.com/Ferlieloi/synergism-hypersynergy/blob/master/docs/features/header-modules.md) · [hs-header-keep-on-import.ts](https://github.com/Ferlieloi/synergism-hypersynergy/blob/master/src/mod/class/hs-core/header/hs-header-keep-on-import.ts) · [hs-header-loadout-icons.ts](https://github.com/Ferlieloi/synergism-hypersynergy/blob/master/src/mod/class/hs-modules/hs-loadout-icons/hs-header-loadout-icons.ts)

### Match Octeract icon size

Sizes the Octeract icon like the other cube resource icons.

**Where:** [HS] Header → Octeracts

- Follows the module's Small, Medium or Large size. Turn it off for the game's default look.

**Related settings:** [`matchOcteractIconSize`](Settings-Reference#matchocteracticonsize)

**Source:** [header-edit-mode.md](https://github.com/Ferlieloi/synergism-hypersynergy/blob/master/docs/features/header-edit-mode.md) · [header-elevator.md](https://github.com/Ferlieloi/synergism-hypersynergy/blob/master/docs/features/header-elevator.md) · [header-loadouts.md](https://github.com/Ferlieloi/synergism-hypersynergy/blob/master/docs/features/header-loadouts.md) · [header-modules.md](https://github.com/Ferlieloi/synergism-hypersynergy/blob/master/docs/features/header-modules.md) · [hs-header-keep-on-import.ts](https://github.com/Ferlieloi/synergism-hypersynergy/blob/master/src/mod/class/hs-core/header/hs-header-keep-on-import.ts) · [hs-header-loadout-icons.ts](https://github.com/Ferlieloi/synergism-hypersynergy/blob/master/src/mod/class/hs-modules/hs-loadout-icons/hs-header-loadout-icons.ts)

### Match Octeract unit text

Adds a white Oct or Oct/s unit beside the value.

**Where:** [HS] Header → Octeracts

- Clicking the module still switches between owned amount and production rate.

**Related settings:** [`matchOcteractText`](Settings-Reference#matchocteracttext)

**Source:** [header-edit-mode.md](https://github.com/Ferlieloi/synergism-hypersynergy/blob/master/docs/features/header-edit-mode.md) · [header-elevator.md](https://github.com/Ferlieloi/synergism-hypersynergy/blob/master/docs/features/header-elevator.md) · [header-loadouts.md](https://github.com/Ferlieloi/synergism-hypersynergy/blob/master/docs/features/header-loadouts.md) · [header-modules.md](https://github.com/Ferlieloi/synergism-hypersynergy/blob/master/docs/features/header-modules.md) · [hs-header-keep-on-import.ts](https://github.com/Ferlieloi/synergism-hypersynergy/blob/master/src/mod/class/hs-core/header/hs-header-keep-on-import.ts) · [hs-header-loadout-icons.ts](https://github.com/Ferlieloi/synergism-hypersynergy/blob/master/src/mod/class/hs-modules/hs-loadout-icons/hs-header-loadout-icons.ts)

### Singularity Elevator from the header

Uses the Elevator without opening the Singularity tab.

**Where:** Click the game's Singularity count header module; [HS] Header → Mod modules → Sing elevator popover

- The popover has the target, the Teleport button, both toggles and the status line, through the game's own controls. Teleport asks the game's usual confirmations.
- With future singularities locked, the status line names the target, where the next singularity really goes. The game's tab names the current singularity there.
- Escape, an outside press, a second module click or entering edit mode closes the popover.

**Availability and limits**

- Needs live-player access. Below singularity 10, it only shows the game's out-of-order message. Teleport is refused while AutoSing runs, because AutoSing answers every confirmation.

**Related settings:** [`singularityHeaderElevator`](Settings-Reference#singularityheaderelevator)

**Source:** [header-edit-mode.md](https://github.com/Ferlieloi/synergism-hypersynergy/blob/master/docs/features/header-edit-mode.md) · [header-elevator.md](https://github.com/Ferlieloi/synergism-hypersynergy/blob/master/docs/features/header-elevator.md) · [header-loadouts.md](https://github.com/Ferlieloi/synergism-hypersynergy/blob/master/docs/features/header-loadouts.md) · [header-modules.md](https://github.com/Ferlieloi/synergism-hypersynergy/blob/master/docs/features/header-modules.md) · [hs-header-keep-on-import.ts](https://github.com/Ferlieloi/synergism-hypersynergy/blob/master/src/mod/class/hs-core/header/hs-header-keep-on-import.ts) · [hs-header-loadout-icons.ts](https://github.com/Ferlieloi/synergism-hypersynergy/blob/master/src/mod/class/hs-modules/hs-loadout-icons/hs-header-loadout-icons.ts)

### Keep your header when loading another save

Keeps your desktop and mobile layouts instead of importing the other save's layouts.

**Where:** Game Settings → under Load from file → [HS] Keep my header layout

- The remembered checkbox applies to supported file, cloud and Steam-cloud save imports.
- Mod modules are restored through the mod's local placement store after the game reloads the layout.

**Availability and limits**

- Requires the save-import and header parsing patches. This checkbox is for the game's normal imports; Backup & Restore performs a broader local-state restore.

**Related settings:** [`keepHeaderLayoutOnImport`](Settings-Reference#keepheaderlayoutonimport)

**Source:** [header-edit-mode.md](https://github.com/Ferlieloi/synergism-hypersynergy/blob/master/docs/features/header-edit-mode.md) · [header-elevator.md](https://github.com/Ferlieloi/synergism-hypersynergy/blob/master/docs/features/header-elevator.md) · [header-loadouts.md](https://github.com/Ferlieloi/synergism-hypersynergy/blob/master/docs/features/header-loadouts.md) · [header-modules.md](https://github.com/Ferlieloi/synergism-hypersynergy/blob/master/docs/features/header-modules.md) · [hs-header-keep-on-import.ts](https://github.com/Ferlieloi/synergism-hypersynergy/blob/master/src/mod/class/hs-core/header/hs-header-keep-on-import.ts) · [hs-header-loadout-icons.ts](https://github.com/Ferlieloi/synergism-hypersynergy/blob/master/src/mod/class/hs-modules/hs-loadout-icons/hs-header-loadout-icons.ts)

### Automation quickbar with mixed-state indicators

Groups frequently used game automation toggles in a compact header module.

**Where:** [HS] Header → Mod modules → Automation quick bar

- Controls Auto-Challenge, buildings and upgrades, runes, research, auto-sacrifice, cube/hepteract auto-open and auto-ascend when available.
- Buttons show enabled, disabled or mixed states. Some permanently enabled groups disappear after their relevant singularity unlocks.
- The unpatched fallback row has a separate centering preference.

**Related settings:** [`enableAutomationQuickBar`](Settings-Reference#enableautomationquickbar), [`centerQuickbars`](Settings-Reference#centerquickbars)

**Source:** [hs-qolQuickbarAutomation.ts](https://github.com/Ferlieloi/synergism-hypersynergy/blob/master/src/mod/class/hs-modules/hs-qol-quickbar/hs-qolQuickbarAutomation.ts) · [header-edit-mode.md](https://github.com/Ferlieloi/synergism-hypersynergy/blob/master/docs/features/header-edit-mode.md) · [header-elevator.md](https://github.com/Ferlieloi/synergism-hypersynergy/blob/master/docs/features/header-elevator.md) · [header-loadouts.md](https://github.com/Ferlieloi/synergism-hypersynergy/blob/master/docs/features/header-loadouts.md) · [header-modules.md](https://github.com/Ferlieloi/synergism-hypersynergy/blob/master/docs/features/header-modules.md) · [hs-header-keep-on-import.ts](https://github.com/Ferlieloi/synergism-hypersynergy/blob/master/src/mod/class/hs-core/header/hs-header-keep-on-import.ts) · [hs-header-loadout-icons.ts](https://github.com/Ferlieloi/synergism-hypersynergy/blob/master/src/mod/class/hs-modules/hs-loadout-icons/hs-header-loadout-icons.ts)
