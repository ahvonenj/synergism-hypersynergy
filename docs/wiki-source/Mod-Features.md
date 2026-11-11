# Mod features

114 documented features, grouped below. Open a guide for usage, settings and limitations.

## Installation & updates

Choose the browser userscript or the Windows Steam loader. Both patch the game before loading the mod.

- [Browser userscript](Features-getting-started#browser-userscript): Loads Hypersynergism automatically with the game.
- [Windows Steam loader](Features-getting-started#windows-steam-loader): Patches a copy of the Steam game and launches it with the mod.
- [Live and Dev channels](Features-getting-started#live-and-dev-channels): Choose between the Live and Dev repositories.
- [Legacy bookmarklet and migration help](Features-getting-started#legacy-bookmarklet-and-migration-help): Keeps a legacy loading path and shows how to switch to Tampermonkey.
- [Channel-aware update notifications](Features-getting-started#channel-aware-update-notifications): Marks a newer version with a rainbow icon border and a panel-title notice.

## Interface & remembered preferences

Small interface choices are remembered locally, including changes made through the game's own tab controls.

- [Movable, resizable mod panel](Features-interface#movable-resizable-mod-panel): Groups settings, tools, logs and information in the game's visual style.
- [Quick access menu](Features-interface#quick-access-menu): Opens common tools without navigating the full panel.
- [Hide tabs and remember hidden tabs](Features-interface#hide-tabs-and-remember-hidden-tabs): Keeps unwanted main tabs hidden across reloads.
- [Remember each tab's last subtab](Features-interface#remember-each-tabs-last-subtab): Returns a tab to the subtab you last used after resets and reloads.
- [Search the singularity perks](Features-interface#search-the-singularity-perks): Lists the tooltips of the perks matching what you type.
- [Optional offline-popup dismissal](Features-interface#optional-offline-popup-dismissal): Closes the offline progress summary automatically when the game loads.
- [Recover when the browser loader starts late](Features-interface#recover-when-the-browser-loader-starts-late): Retries loading when Tampermonkey starts after the game.
- [Remember dismissed game dialogs](Features-interface#remember-dismissed-game-dialogs): Adds Don't show again / Always confirm choices to supported game dialogs.
- [Show suppressed alerts as notifications](Features-interface#show-suppressed-alerts-as-notifications): Preserves useful alert results without reopening a modal.
- [Notification opacity](Features-interface#notification-opacity): Makes the game's notifications less intrusive.

## Click-saving tools & input

Convenience controls use the game's own actions; optional repeated input is active only while its modifier is held.

- [Clickable reusable promotion codes](Features-input#clickable-reusable-promotion-codes): Lists reusable codes and fills the input when a code is clicked.
- [ADD ×10 shortcut](Features-input#add-10-shortcut): Requests ten ADD-code uses from one added button.
- [Buy and consume potions ×10](Features-input#buy-and-consume-potions-10): Adds BUY 10× and CONSUME 10× next to the native potion buttons.
- [Repeat hover while holding left Shift](Features-input#repeat-hover-while-holding-left-shift): Repeatedly refreshes the hover event under the pointer.
- [Auto-click while holding left Ctrl](Features-input#auto-click-while-holding-left-ctrl): Repeats clicks at the pointer with a configurable interval.

## Ambrosia loadouts & income

The mod enhances the game's Ambrosia loadout controls and adds generation information for blue, red and purple resources.

- [Custom Ambrosia loadout icons](Features-ambrosia#custom-ambrosia-loadout-icons): Gives saved loadouts recognizable icons instead of only numbers.
- [Loaded-loadout indicator](Features-ambrosia#loaded-loadout-indicator): Distinguishes the game's confirmed active slot from a guessed match.
- [Quick Import one or multiple loadouts](Features-ambrosia#quick-import-one-or-multiple-loadouts): Imports one to sixteen newline-separated loadouts from the clipboard.
- [Keep Ambrosia upgrade levels visible](Features-ambrosia#keep-ambrosia-upgrade-levels-visible): Keeps the game's levels view pinned while the tree is idle.
- [Separate ADD and TIME Auto-Loadouts](Features-ambrosia#separate-add-and-time-auto-loadouts): Loads the configured tree before a code pays out and restores the previous loadout afterward.
- [Ascension loadout auto-switch](Features-ambrosia#ascension-loadout-auto-switch): Uses a chosen Ambrosia loadout for a manual ascension and restores the previous tree afterward.
- [Blue, red and purple progress minibars](Features-ambrosia#blue-red-and-purple-progress-minibars): Shows compact progress bars without keeping the Ambrosia tab open.
- [Expected Ambrosia income per hour](Features-ambrosia#expected-ambrosia-income-per-hour): Shows expected blue Ambrosia, red Ambrosia and purple honey income for the current tree.

## Header customization

Open the game's header editor with the pencil beside the mod icon, or Settings → UI → Edit game header. HS options live beside the game's module tray, not in a separate quickbar settings page.

- [Header pencil and editor shortcut](Features-header#header-pencil-and-editor-shortcut): Opens header editing without waiting for a long press.
- [Optional long-press editing](Features-header#optional-long-press-editing): Lets you disable accidental entry to header edit mode.
- [Header grid width slider and typed width](Features-header#header-grid-width-slider-and-typed-width): Adjusts the desktop grid's width cap, including a full-width option.
- [Move the top row to the bottom](Features-header#move-the-top-row-to-the-bottom): Places the top resource row beneath the header grid.
- [Remove unused space below the header](Features-header#remove-unused-space-below-the-header): Brings the main tabs up to the last visible header content.
- [Per-cell horizontal and vertical alignment](Features-header#per-cell-horizontal-and-vertical-alignment): Aligns cell content left, center or right, and top, center or bottom.
- [Half-height cells](Features-header#half-height-cells): Fits eligible single modules into a more compact cell.
- [Reset-button groups adapt to cell width](Features-header#reset-button-groups-adapt-to-cell-width): Fits more reset buttons in wide cells and wraps them on narrower windows.
- [Remember placement, size and stacks of mod modules](Features-header#remember-placement-size-and-stacks-of-mod-modules): Treats mod modules like native modules without adding unknown IDs to game saves.
- [Resize minibars with drag handles](Features-header#resize-minibars-with-drag-handles): Changes minibar width and height with live size feedback.
- [Optional minibar frame](Features-header#optional-minibar-frame): Adds a single border around the progress-bar group.
- [Fit loadout slots to their cell](Features-header#fit-loadout-slots-to-their-cell): Sizes the header's Ambrosia slots to use the available grid width.
- [Choose how many loadout slots to show](Features-header#choose-how-many-loadout-slots-to-show): Shows only the first N slots while leaving every slot usable elsewhere.
- [Hide the leading Ambrosia bar icon](Features-header#hide-the-leading-ambrosia-bar-icon): Frees space by removing the full loadout module's leading icon.
- [Pick any game image for a loadout slot](Features-header#pick-any-game-image-for-a-loadout-slot): Extends the native icon chooser beyond Ambrosia upgrade icons.
- [Match Octeract icon size](Features-header#match-octeract-icon-size): Sizes the Octeract icon like the other cube resource icons.
- [Match Octeract unit text](Features-header#match-octeract-unit-text): Adds a white Oct or Oct/s unit beside the value.
- [Singularity Elevator from the header](Features-header#singularity-elevator-from-the-header): Uses the Elevator without opening the Singularity tab.
- [Keep your header when loading another save](Features-header#keep-your-header-when-loading-another-save): Keeps your desktop and mobile layouts instead of importing the other save's layouts.
- [Automation quickbar with mixed-state indicators](Features-header#automation-quickbar-with-mixed-state-indicators): Groups frequently used game automation toggles in a compact header module.

## Corruption & challenge displays

Current versions use a single corruption level. The old corruption-loadout modules are no longer part of the mod.

- [Current and next corruption level](Features-challenges#current-and-next-corruption-level): Adds an arrow to the next ascension's level when it differs from the displayed level.
- [Corruption controls from the header](Features-challenges#corruption-controls-from-the-header): Changes the next level without opening the Corruption tab.
- [Corruption level controls in the module](Features-challenges#corruption-level-controls-in-the-module): Changes the next level in the module itself, without opening the popover.
- [Keep corruption visible before C11](Features-challenges#keep-corruption-visible-before-c11): Keeps the module available at the start of later singularities.
- [One module for all active challenges](Features-challenges#one-module-for-all-active-challenges): Combines the active challenge tiers in one place.
- [Compact the game's own challenge modules](Features-challenges#compact-the-games-own-challenge-modules): Removes repeated challenge names from native progress text.

## Integrated Ambrosia Heater

An in-game optimizer for Ambrosia loadouts, with resource-aware result tables and direct imports. Results depend on the exported game state and selected options.

- [Read the current game or edit Heater inputs](Features-heater#read-the-current-game-or-edit-heater-inputs): Builds optimization inputs from the save and lets you adjust scenarios.
- [Choose and remember active optimization branches](Features-heater#choose-and-remember-active-optimization-branches): Runs only the loadout families you need.
- [Common resource loadout optimization](Features-heater#common-resource-loadout-optimization): Optimizes All Ambrosia, Blue Ambrosia, Red Ambrosia, Quarks, 3–7D Cubes and Octeracts.
- [Coins in Challenge 15 optimization](Features-heater#coins-in-challenge-15-optimization): Optimizes coin income per real second under C15's tax-cap assumption.
- [Purple Honey and Purple Ambrosia loadouts](Features-heater#purple-honey-and-purple-ambrosia-loadouts): Balances generation for Honey stockpiling or Purple Ambrosia crafting.
- [Obtainium, Offerings and joint optimization](Features-heater#obtainium-offerings-and-joint-optimization): Produces specialized or combined trees for these two resources.
- [Hyperflux H0–H7 and Max SR trees](Features-heater#hyperflux-h0h7-and-max-sr-trees): Compares cube trees across Hyperflux levels and singularity-reducer priorities.
- [Best H at the current P4x4](Features-heater#best-h-at-the-current-p4x4): Selects the appropriate Hyperflux result when importing, using live P4x4.
- [Max Amb + Oct hybrid](Features-heater#max-amb--oct-hybrid): Combines maximized Ambrosia upgrades with Octeract optimization.
- [Affordability and limiting-resource explanations](Features-heater#affordability-and-limiting-resource-explanations): Shows why a row is unavailable or not yet maxed.
- [Assign, copy and import Heater loadouts](Features-heater#assign-copy-and-import-heater-loadouts): Moves optimized trees into the game's existing loadout slots.
- [Sync icons and AutoSing loadout settings](Features-heater#sync-icons-and-autosing-loadout-settings): Reuses your Heater slot assignments in the rest of the mod.
- [Red Ambrosia upgrade comparison table](Features-heater#red-ambrosia-upgrade-comparison-table): Compares supported upgrade effects and cost effectiveness.
- [Background heating, progress and cancel](Features-heater#background-heating-progress-and-cancel): Runs the optimizer in workers with elapsed-time and group progress.
- [Extended Heater data export](Features-heater#extended-heater-data-export): Copies an extended save string for the external Ambrosia Heater sheet.

## Hepteracts & Platonic upgrades

Forge shortcuts and distribution tools reduce repetitive crafting while exposing what an action will cost.

- [Live forge capacity ratios](Features-hepteracts#live-forge-capacity-ratios): Displays CHR/HYP/CHL, ACC/BST/MLT and CHR/ACC comparisons.
- [Quick expand and max](Features-hepteracts#quick-expand-and-max): Combines repetitive expansion and filling actions.
- [Quick-expand cost and affordability time](Features-hepteracts#quick-expand-cost-and-affordability-time): Shows the next quick action cost and its estimated wait.
- [Configurable quick-expand cost protection](Features-hepteracts#configurable-quick-expand-cost-protection): Refuses quick expansion when its cost crosses your chosen share of stock.
- [Hepteract Distributor with saved ratios](Features-hepteracts#hepteract-distributor-with-saved-ratios): Spends stock so final hepteract balances follow your configured ratios.
- [Keep a scaling Hepteract reserve](Features-hepteracts#keep-a-scaling-hepteract-reserve): Sets aside stock before Orbs and ratio-based crafting.
- [Buy Overflux Orbs first](Features-hepteracts#buy-overflux-orbs-first): Spends a chosen percentage of available stock on Orbs before distribution.
- [Optional partly filled meters](Features-hepteracts#optional-partly-filled-meters): Uses the remaining budget on the next under-target type.
- [Temporary singularity reducers and Talisman Power](Features-hepteracts#temporary-singularity-reducers-and-talisman-power): Can swap in a temporary crafting tree, then restore your original tree.
- [Time until the next Platonic upgrade level](Features-hepteracts#time-until-the-next-platonic-upgrade-level): Adds an estimated wait and the longest resource requirement.

## Golden Quarks & shop preferences

Shop helpers allocate a chosen budget and remember which completed upgrades you want out of the way.

- [Buy MAX in the GQ purchase dialog](Features-golden-quarks#buy-max-in-the-gq-purchase-dialog): Adds a shortcut for spending the available amount through the native purchase flow.
- [GQ Distributor with saved upgrade ratios](Features-golden-quarks#gq-distributor-with-saved-upgrade-ratios): Splits Golden Quarks among visible, unlocked, unmaxed upgrades.
- [Balance total investments or split new spending](Features-golden-quarks#balance-total-investments-or-split-new-spending): Chooses whether ratios apply to final investments or only the current budget.
- [Keep skipped upgrade shares unspent](Features-golden-quarks#keep-skipped-upgrade-shares-unspent): Controls what happens to shares assigned to upgrades skipped before planning.
- [Remember hidden maxed GQ upgrades](Features-golden-quarks#remember-hidden-maxed-gq-upgrades): Saves and restores your choice for the game's own hide-maxed toggle between sessions.
- [Remember hidden maxed Octeract upgrades](Features-golden-quarks#remember-hidden-maxed-octeract-upgrades): Saves and restores your choice for the game's own hide-maxed toggle between sessions.

## Save exports, backups & restore

Timed game exports collect native export rewards. A full HS backup is a separate action that also preserves local mod state.

- [Export every X minutes](Features-saves#export-every-x-minutes): Runs the game's Export action on a configurable schedule.
- [Choose and remember an export folder](Features-saves#choose-and-remember-an-export-folder): Writes timed exports directly to a folder on supported platforms.
- [Keep only the last X timed-export files](Features-saves#keep-only-the-last-x-timed-export-files): Limits saved timed exports in the chosen folder.
- [Dedicated Ambrosia export loadout](Features-saves#dedicated-ambrosia-export-loadout): Collects export rewards with the configured tree, then restores the original when possible.
- [One-file game and mod backup](Features-saves#one-file-game-and-mod-backup): Downloads the save, mod settings/data, game preferences, logs and diagnostic context together.
- [Restore a backup or ordinary game save](Features-saves#restore-a-backup-or-ordinary-game-save): Validates the file, lets you choose supported restore parts, then reloads.
- [Clear mod settings and reload](Features-saves#clear-mod-settings-and-reload): Resets the mod's main settings after confirmation.

## AutoSing & strategy editor

An explicitly opt-in automation system for end-game singularity farming. This goes beyond strictly informational QoL.

- [Strategy-driven singularity farming](Features-autosing#strategy-driven-singularity-farming): Repeats singularities according to an editable strategy and farming target.
- [Pause, resume, restart, stop and Finish & Stop](Features-autosing#pause-resume-restart-stop-and-finish--stop): Controls the current run without editing its strategy.
- [Live run statistics, charts and review](Features-autosing#live-run-statistics-charts-and-review): Tracks run pace, phase timings, Quarks, GQ and C15 statistics.
- [Step timings](Features-autosing#step-timings): Shows where a singularity's time goes, step by step, to help tune a strategy.
- [Create, copy, edit, import, export and delete strategies](Features-autosing#create-copy-edit-import-export-and-delete-strategies): Keeps custom JSON strategies locally and shares them through import/export.
- [Phase editor with chained stage ranges](Features-autosing#phase-editor-with-chained-stage-ranges): Builds a continuous progression plan from start through end, plus AOAG.
- [Action editor with ordering, duplicates and comments](Features-autosing#action-editor-with-ordering-duplicates-and-comments): Edits challenges, resets, waits, game actions, loadouts, forge toggles and run controls.
- [Conditional IF steps and jumps](Features-autosing#conditional-if-steps-and-jumps): Branches or loops the phase based on configured game conditions.
- [Undo, redo and unsaved-change protection](Features-autosing#undo-redo-and-unsaved-change-protection): Protects strategy edits while allowing experimentation.
- [Explicit corruption-level strategy actions](Features-autosing#explicit-corruption-level-strategy-actions): Sets actual corruption level, optionally ascending immediately.
- [Six configurable Ambrosia roles](Features-autosing#six-configurable-ambrosia-roles): Assigns the Hyperflux (H), 3-7D Cubes, Quark, Obtainium, Offerings and Ambrosia slots; an Antiquities icon shows which are for pre-AOAG (dimmed) and post-AOAG (full colours).
- [Don't switch Ambrosia loadouts](Features-autosing#dont-switch-ambrosia-loadouts): Leaves the tree in place throughout the run to preserve bar progress.
- [Keep the PC awake](Features-autosing#keep-the-pc-awake): Keeps the screen on and stops the PC sleeping while AutoSing runs with the game in view.
- [Advanced run settings and reset to defaults](Features-autosing#advanced-run-settings-and-reset-to-defaults): Tunes cube opening, tesseract buying and auto-challenge timing.

## Calculations, logs & framework

Information tools expose computed game values and diagnostics; developer-only tools are kept separate from player features.

- [Game Data Sniffing and live-game access](Features-tools#game-data-sniffing-and-live-game-access): Supplies current game state to information and optimization features.
- [Calculation picker with component breakdowns](Features-tools#calculation-picker-with-component-breakdowns): Computes supported values directly from your current save.
- [Color-coded mod log and diagnostics](Features-tools#color-coded-mod-log-and-diagnostics): Records initialization, tool actions, run messages, warnings and errors.
- [Dump settings and game variables](Features-tools#dump-settings-and-game-variables): Prints diagnostic snapshots to the browser or game developer console.
- [Fix Exalt Bug helper](Features-tools#fix-exalt-bug-helper): Attempts the recovery path for an inconsistent active-Exalt display.
- [Short and long notification previews](Features-tools#short-and-long-notification-previews): Previews the mod notification system.
- [Modular TypeScript framework](Features-tools#modular-typescript-framework): Organizes modules, settings, UI, storage, game hooks and calculations.
- [Development-only live editing and recording](Features-tools#development-only-live-editing-and-recording): Provides live-save inspection/editing and AutoSing recording for maintainers.
