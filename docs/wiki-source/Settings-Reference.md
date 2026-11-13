# Settings reference

Every setting in the audited source is listed below. Hidden means it is not a normal panel control: many hidden settings are edited in the header editor, a tool window or an inline game control. Some are internal state or diagnostics.

These are source-defined initial values, not a promise that an existing player's stored or migrated preferences match them. An enabled numeric/select setting does not necessarily mean its dependent feature is switched on.

## enableHepteractDistributor

Hepteract Distributor

- Source default: `true`; enabled flag: `true`.
- Location: Panel control / qol.
- Guide: [Hepteract Distributor with saved ratios](Features-hepteracts#hepteract-distributor-with-saved-ratios).

## expandCostProtection

Quick expand cost protection

- Source default: `0.5`; enabled flag: `true`.
- Location: Panel control / qol.
- Guide: [Configurable quick-expand cost protection](Features-hepteracts#configurable-quick-expand-cost-protection).

## hepteractDistributorOpen

Hepteract Distributor panel open

- Source default: `false`; enabled flag: `false`.
- Location: Hidden / inline or internal.
- Guide: [Hepteract Distributor with saved ratios](Features-hepteracts#hepteract-distributor-with-saved-ratios).

## keepHeaderLayoutOnImport

Keep my header layout when a save is loaded (checkbox under Load from file)

- Source default: `false`; enabled flag: `false`.
- Location: Hidden / inline or internal.
- Guide: [Keep your header when loading another save](Features-header#keep-your-header-when-loading-another-save).

## headerAmbrosiaSlotsShown

Ambrosia loadout slots shown in the header (block next to the header's edit tray, 16 = all)

- Source default: `16`; enabled flag: `true`.
- Location: Hidden / inline or internal.
- Guide: [Choose how many loadout slots to show](Features-header#choose-how-many-loadout-slots-to-show).

## hepteractDistributorAllowPartial

Hepteract Distributor: allow partly filled meters

- Source default: `false`; enabled flag: `false`.
- Location: Hidden / inline or internal.
- Guide: [Optional partly filled meters](Features-hepteracts#optional-partly-filled-meters).

## hepteractDistributorUseReducers

Hepteract Distributor: use singularity reducers

- Source default: `false`; enabled flag: `false`.
- Location: Hidden / inline or internal.
- Guide: [Temporary singularity reducers and Talisman Power](Features-hepteracts#temporary-singularity-reducers-and-talisman-power).

## hepteractDistributorTalismanAlone

Hepteract Distributor: replace the ambrosia tree for Talisman Power alone

- Source default: `false`; enabled flag: `false`.
- Location: Hidden / inline or internal.
- Guide: [Temporary singularity reducers and Talisman Power](Features-hepteracts#temporary-singularity-reducers-and-talisman-power).

## hepteractDistributorRatios

Hepteract Distributor saved ratios

- Source default: `""`; enabled flag: `true`.
- Location: Hidden / inline or internal.
- Guide: [Hepteract Distributor with saved ratios](Features-hepteracts#hepteract-distributor-with-saved-ratios).

## hepteractDistributorOrbsPercent

Hepteract Distributor: percentage of hepteracts for Overflux Orbs

- Source default: `0`; enabled flag: `true`.
- Location: Hidden / inline or internal.
- Guide: [Buy Overflux Orbs first](Features-hepteracts#buy-overflux-orbs-first).

## hepteractDistributorKeep

Hepteract Distributor: hepteracts never spent, as how many powers of ten below the stock's own (1 with 3.4e16 owned keeps 1e15, -1 keeps nothing)

- Source default: `-1`; enabled flag: `true`.
- Location: Hidden / inline or internal.
- Guide: [Keep a scaling Hepteract reserve](Features-hepteracts#keep-a-scaling-hepteract-reserve).

## editGameHeader

Edit game header

- Source default: `""`; enabled flag: `true`.
- Location: Panel control / ui.
- Guide: [Header pencil and editor shortcut](Features-header#header-pencil-and-editor-shortcut).

## hideGameDialogs

Hide game dialogs

- Source default: `false`; enabled flag: `false`.
- Location: Panel control / ui.
- Guide: [Remember dismissed game dialogs](Features-interface#remember-dismissed-game-dialogs).

## hideGameDialogsNotify

Show as notifications

- Source default: `false`; enabled flag: `false`.
- Location: Panel control / ui.
- Guide: [Show suppressed alerts as notifications](Features-interface#show-suppressed-alerts-as-notifications).

## compactChallengeText

Compact progress text in the game's challenge modules

- Source default: `false`; enabled flag: `false`.
- Location: Hidden / inline or internal / qol.
- Guide: [Compact the game's own challenge modules](Features-challenges#compact-the-games-own-challenge-modules).

## challengeProgressHeader

Challenge progress module in the header

- Source default: `true`; enabled flag: `true`.
- Location: Hidden / inline or internal / qol.
- Guide: [One module for all active challenges](Features-challenges#one-module-for-all-active-challenges).

## challengeProgressLayout

Challenge progress module: layout

- Source default: `"line"`; enabled flag: `true`.
- Location: Hidden / inline or internal.
- Guide: [One module for all active challenges](Features-challenges#one-module-for-all-active-challenges).

## challengeProgressDetails

Challenge progress module: details

- Source default: `"completions"`; enabled flag: `true`.
- Location: Hidden / inline or internal.
- Guide: [One module for all active challenges](Features-challenges#one-module-for-all-active-challenges).

## challengeProgressShowNone

Challenge progress module: CØ outside challenges

- Source default: `false`; enabled flag: `false`.
- Location: Hidden / inline or internal.
- Guide: [One module for all active challenges](Features-challenges#one-module-for-all-active-challenges).

## corruptionHeaderControls

Corruption module: next level and controls

- Source default: `true`; enabled flag: `true`.
- Location: Hidden / inline or internal / qol.
- Guide: [Current and next corruption level](Features-challenges#current-and-next-corruption-level).

## corruptionHeaderInline

Corruption module: level controls in the module

- Source default: `true`; enabled flag: `true`.
- Location: Hidden / inline or internal / qol.
- Guide: [Corruption level controls in the module](Features-challenges#corruption-level-controls-in-the-module).

## corruptionHeaderAlwaysShown

Keep the corruption module visible

- Source default: `true`; enabled flag: `true`.
- Location: Hidden / inline or internal / qol.
- Guide: [Keep corruption visible before C11](Features-challenges#keep-corruption-visible-before-c11).

## singularityHeaderElevator

Singularity module: Elevator popover

- Source default: `true`; enabled flag: `true`.
- Location: Hidden / inline or internal / qol.
- Guide: [Singularity Elevator from the header](Features-header#singularity-elevator-from-the-header).

## rememberSubtabs

Remember last used subtab

- Source default: `true`; enabled flag: `true`.
- Location: Panel control / ui.
- Guide: [Remember each tab's last subtab](Features-interface#remember-each-tabs-last-subtab).

## statsForNerdsGroups

Grouped Stats for Nerds list

- Source default: `false`; enabled flag: `false`.
- Location: Panel control / ui.
- Guide: [Grouped Stats for Nerds list](Features-interface#grouped-stats-for-nerds-list).

## hiddenVanillaTabs

Hide vanilla tabs

- Source default: `[]`; enabled flag: `true`.
- Location: Panel control / ui.
- Guide: [Hide tabs and remember hidden tabs](Features-interface#hide-tabs-and-remember-hidden-tabs).

## autoDismissOfflinePopup

Auto-dismiss offline popup

- Source default: `true`; enabled flag: `true`.
- Location: Panel control / ui.
- Guide: [Optional offline-popup dismissal](Features-interface#optional-offline-popup-dismissal).

## reloadOnLateLoaderStart

Reload when the loader starts late

- Source default: `true`; enabled flag: `true`.
- Location: Panel control / ui.
- Guide: [Recover when the browser loader starts late](Features-interface#recover-when-the-browser-loader-starts-late).

## syncNotificationOpacity

Notification opacity

- Source default: `0.6`; enabled flag: `true`.
- Location: Panel control / ui.
- Guide: [Notification opacity](Features-interface#notification-opacity).

## reactiveMouseHover

Repeat hover (hold left Shift)

- Source default: `0.2`; enabled flag: `false`.
- Location: Panel control / input.
- Guide: [Repeat hover while holding left Shift](Features-input#repeat-hover-while-holding-left-shift).

## autoClick

Auto click (hold left Ctrl)

- Source default: `0.15`; enabled flag: `false`.
- Location: Panel control / input.
- Guide: [Auto-click while holding left Ctrl](Features-input#auto-click-while-holding-left-ctrl).

## autoClickIgnoreElements

Skip risky buttons

- Source default: `true`; enabled flag: `true`.
- Location: Panel control / input.
- Guide: [Auto-click while holding left Ctrl](Features-input#auto-click-while-holding-left-ctrl).

## useGameData

Game Data Sniffing (GDS)

- Source default: `true`; enabled flag: `true`.
- Location: Panel control / qol.
- Guide: [Game Data Sniffing and live-game access](Features-tools#game-data-sniffing-and-live-game-access).

## autoExportSave

Export the save every X minutes

- Source default: `30`; enabled flag: `false`.
- Location: Panel control / qol.
- Guide: [Export every X minutes](Features-saves#export-every-x-minutes).

## autoExportSaveFolder

Choose folder

- Source default: `""`; enabled flag: `true`.
- Location: Panel control / qol.
- Guide: [Choose and remember an export folder](Features-saves#choose-and-remember-an-export-folder).

## autoExportSaveForgetFolder

✕

- Source default: `""`; enabled flag: `true`.
- Location: Panel control / qol.
- Guide: [Choose and remember an export folder](Features-saves#choose-and-remember-an-export-folder).

## autoExportSaveKeep

Keep only the last X files

- Source default: `20`; enabled flag: `true`.
- Location: Panel control / qol.
- Guide: [Keep only the last X timed-export files](Features-saves#keep-only-the-last-x-timed-export-files).

## autoExportSaveLoadout

Export loadout

- Source default: `""`; enabled flag: `true`.
- Location: Panel control / qol.
- Guide: [Dedicated Ambrosia export loadout](Features-saves#dedicated-ambrosia-export-loadout).

## persistentAmbrosiaLevels

Keep tree levels shown

- Source default: `true`; enabled flag: `true`.
- Location: Panel control / qol.
- Guide: [Keep Ambrosia upgrade levels visible](Features-ambrosia#keep-ambrosia-upgrade-levels-visible).

## addTimeAutoLoadouts

Add+Time loadouts auto-switch

- Source default: `false`; enabled flag: `false`.
- Location: Panel control / qol.
- Guide: [Separate ADD and TIME Auto-Loadouts](Features-ambrosia#separate-add-and-time-auto-loadouts).

## autoLoadoutAdd

ADD loadout

- Source default: `""`; enabled flag: `true`.
- Location: Panel control / qol.
- Guide: [Separate ADD and TIME Auto-Loadouts](Features-ambrosia#separate-add-and-time-auto-loadouts).

## autoLoadoutTime

TIME loadout

- Source default: `""`; enabled flag: `true`.
- Location: Panel control / qol.
- Guide: [Separate ADD and TIME Auto-Loadouts](Features-ambrosia#separate-add-and-time-auto-loadouts).

## ascensionAutoLoadout

Ascension loadout auto-switch

- Source default: `false`; enabled flag: `false`.
- Location: Panel control / qol.
- Guide: [Ascension loadout auto-switch](Features-ambrosia#ascension-loadout-auto-switch).

## autoLoadoutAscension

Ascension loadout

- Source default: `""`; enabled flag: `true`.
- Location: Panel control / qol.
- Guide: [Ascension loadout auto-switch](Features-ambrosia#ascension-loadout-auto-switch).

## startAutosing

Start/Stop Auto-Sing (S216+)

- Source default: `false`; enabled flag: `false`.
- Location: Panel control / auto-sing.
- Guide: [Strategy-driven singularity farming](Features-autosing#strategy-driven-singularity-farming).

## singularityNumber

Singularity to farm

- Source default: `200`; enabled flag: `true`.
- Location: Panel control / auto-sing.
- Guide: [Strategy-driven singularity farming](Features-autosing#strategy-driven-singularity-farming).

## autosingKeepAwake

Keep the PC awake

- Source default: `true`; enabled flag: `true`.
- Location: Panel control / auto-sing.
- Guide: [Keep the PC awake](Features-autosing#keep-the-pc-awake).

## autosingStepTimings

Record step timings

- Source default: `false`; enabled flag: `false`.
- Location: Panel control / auto-sing.
- Guide: [Step timings](Features-autosing#step-timings).

## autosingFullLog

Full log during Auto-Sing

- Source default: `false`; enabled flag: `false`.
- Location: Panel control / auto-sing.
- Guide: [Color-coded mod log and diagnostics](Features-tools#color-coded-mod-log-and-diagnostics).

## autosingStrategy

Auto-Sing Strategy

- Source default: `"1.TAS_v3.2"`; enabled flag: `true`.
- Location: Panel control / auto-sing.
- Guide: [Create, copy, edit, import, export and delete strategies](Features-autosing#create-copy-edit-import-export-and-delete-strategies).

## editAutosingStrategy

✏️ Edit

- Source default: `""`; enabled flag: `true`.
- Location: Panel control / auto-sing.
- Guide: [Create, copy, edit, import, export and delete strategies](Features-autosing#create-copy-edit-import-export-and-delete-strategies).

## createAutosingStrategy

➕ Create

- Source default: `""`; enabled flag: `true`.
- Location: Panel control / auto-sing.
- Guide: [Create, copy, edit, import, export and delete strategies](Features-autosing#create-copy-edit-import-export-and-delete-strategies).

## deleteAutosingStrategy

🗑️ Delete

- Source default: `""`; enabled flag: `true`.
- Location: Panel control / auto-sing.
- Guide: [Create, copy, edit, import, export and delete strategies](Features-autosing#create-copy-edit-import-export-and-delete-strategies).

## importAutosingStrategy

📥 Import

- Source default: `""`; enabled flag: `true`.
- Location: Panel control / auto-sing.
- Guide: [Create, copy, edit, import, export and delete strategies](Features-autosing#create-copy-edit-import-export-and-delete-strategies).

## exportAutosingStrategy

📤 Export

- Source default: `""`; enabled flag: `true`.
- Location: Panel control / auto-sing.
- Guide: [Create, copy, edit, import, export and delete strategies](Features-autosing#create-copy-edit-import-export-and-delete-strategies).

## autosingObtLoadout

Obtainium

- Source default: `""`; enabled flag: `true`.
- Location: Panel control / auto-sing.
- Guide: [Six configurable Ambrosia roles](Features-autosing#six-configurable-ambrosia-roles).

## autosingEarlyCubeLoadout

Hyperflux (H)

- Source default: `""`; enabled flag: `true`.
- Location: Panel control / auto-sing.
- Guide: [Six configurable Ambrosia roles](Features-autosing#six-configurable-ambrosia-roles).

## autosingLateCubeLoadout

3-7D Cubes

- Source default: `""`; enabled flag: `true`.
- Location: Panel control / auto-sing.
- Guide: [Six configurable Ambrosia roles](Features-autosing#six-configurable-ambrosia-roles).

## autosingQuarkLoadout

Quark

- Source default: `""`; enabled flag: `true`.
- Location: Panel control / auto-sing.
- Guide: [Six configurable Ambrosia roles](Features-autosing#six-configurable-ambrosia-roles).

## autosingOffLoadout

Offerings

- Source default: `""`; enabled flag: `true`.
- Location: Panel control / auto-sing.
- Guide: [Six configurable Ambrosia roles](Features-autosing#six-configurable-ambrosia-roles).

## autosingAmbrosiaLoadout

Ambrosia

- Source default: `""`; enabled flag: `true`.
- Location: Panel control / auto-sing.
- Guide: [Six configurable Ambrosia roles](Features-autosing#six-configurable-ambrosia-roles).

## autosingNoAmbrosiaSwitch

Don't switch ambrosia loadouts

- Source default: `false`; enabled flag: `false`.
- Location: Panel control / auto-sing.
- Guide: [Don't switch Ambrosia loadouts](Features-autosing#dont-switch-ambrosia-loadouts).

## ambrosiaMinibars

Ambrosia minibars (S25+)

- Source default: `true`; enabled flag: `true`.
- Location: Hidden / inline or internal / qol.
- Guide: [Blue, red and purple progress minibars](Features-ambrosia#blue-red-and-purple-progress-minibars).

## ambrosiaMinibarBorders

Ambrosia minibars border

- Source default: `false`; enabled flag: `false`.
- Location: Hidden / inline or internal / qol.
- Guide: [Optional minibar frame](Features-header#optional-minibar-frame).

## ambrosiaRateHeader

Ambrosia per hour in the header (S25+)

- Source default: `true`; enabled flag: `true`.
- Location: Hidden / inline or internal / qol.
- Guide: [Expected Ambrosia income per hour](Features-ambrosia#expected-ambrosia-income-per-hour).

## enableAutomationQuickBar

Automation quick bar

- Source default: `true`; enabled flag: `true`.
- Location: Hidden / inline or internal / qol.
- Guide: [Automation quickbar with mixed-state indicators](Features-header#automation-quickbar-with-mixed-state-indicators).

## matchOcteractIconSize

Match the octeract header icon size

- Source default: `false`; enabled flag: `false`.
- Location: Hidden / inline or internal / qol.
- Guide: [Match Octeract icon size](Features-header#match-octeract-icon-size).

## matchOcteractText

Match the octeract header text

- Source default: `false`; enabled flag: `false`.
- Location: Hidden / inline or internal / qol.
- Guide: [Match Octeract unit text](Features-header#match-octeract-unit-text).

## centerQuickbars

Center quick bars

- Source default: `false`; enabled flag: `false`.
- Location: Hidden / inline or internal / qol.
- Guide: [Automation quickbar with mixed-state indicators](Features-header#automation-quickbar-with-mixed-state-indicators).

## removeHeaderGap

Remove the gap below the header

- Source default: `false`; enabled flag: `false`.
- Location: Hidden / inline or internal / qol.
- Guide: [Remove unused space below the header](Features-header#remove-unused-space-below-the-header).

## headerHideLoadoutIcons

Hide the header's ambrosia bar icon

- Source default: `false`; enabled flag: `false`.
- Location: Hidden / inline or internal / qol.
- Guide: [Hide the leading Ambrosia bar icon](Features-header#hide-the-leading-ambrosia-bar-icon).

## headerFitLoadoutSlots

Fit the ambrosia loadout slots to their cell

- Source default: `true`; enabled flag: `true`.
- Location: Hidden / inline or internal / qol.
- Guide: [Fit loadout slots to their cell](Features-header#fit-loadout-slots-to-their-cell).

## headerEditButton

✎ Header edit button

- Source default: `true`; enabled flag: `true`.
- Location: Hidden / inline or internal / qol.
- Guide: [Header pencil and editor shortcut](Features-header#header-pencil-and-editor-shortcut).

## headerLongPressEditing

Long press to edit the header

- Source default: `true`; enabled flag: `true`.
- Location: Hidden / inline or internal / qol.
- Guide: [Optional long-press editing](Features-header#optional-long-press-editing).

## headerStatsAtBottom

Header top row at the bottom

- Source default: `false`; enabled flag: `false`.
- Location: Hidden / inline or internal / qol.
- Guide: [Move the top row to the bottom](Features-header#move-the-top-row-to-the-bottom).

## enableGQDistributor

GQ Distributor

- Source default: `true`; enabled flag: `true`.
- Location: Panel control / qol.
- Guide: [GQ Distributor with saved upgrade ratios](Features-golden-quarks#gq-distributor-with-saved-upgrade-ratios).

## singularitySearch

Search fields (Perks, GQ, Oct)

- Source default: `true`; enabled flag: `true`.
- Location: Panel control / qol.
- Guide: [Search the singularity perks and upgrades](Features-interface#search-the-singularity-perks-and-upgrades).

## hideMaxedGQUpgrades

Keep maxed GQ upgrades hidden

- Source default: `true`; enabled flag: `true`.
- Location: Panel control / qol.
- Guide: [Remember hidden maxed GQ upgrades](Features-golden-quarks#remember-hidden-maxed-gq-upgrades).

## hideMaxedOctUpgrades

Keep maxed Oct upgrades hidden

- Source default: `true`; enabled flag: `true`.
- Location: Panel control / qol.
- Guide: [Remember hidden maxed Octeract upgrades](Features-golden-quarks#remember-hidden-maxed-octeract-upgrades).

## gqDistributorOpen

GQ Distributor panel open

- Source default: `false`; enabled flag: `false`.
- Location: Hidden / inline or internal.
- Guide: [GQ Distributor with saved upgrade ratios](Features-golden-quarks#gq-distributor-with-saved-upgrade-ratios).

## gqDistributorBalanceInvestments

Balance total GQ investments toward distributor ratios

- Source default: `true`; enabled flag: `true`.
- Location: Hidden / inline or internal.
- Guide: [Balance total investments or split new spending](Features-golden-quarks#balance-total-investments-or-split-new-spending).

## gqDistributorKeepSkippedShare

Keep the GQ share of skipped distributor upgrades unspent

- Source default: `true`; enabled flag: `true`.
- Location: Hidden / inline or internal.
- Guide: [Keep skipped upgrade shares unspent](Features-golden-quarks#keep-skipped-upgrade-shares-unspent).

## gqDistributorRatios

GQ Distributor saved ratios

- Source default: `""`; enabled flag: `true`.
- Location: Hidden / inline or internal.
- Guide: [GQ Distributor with saved upgrade ratios](Features-golden-quarks#gq-distributor-with-saved-upgrade-ratios).

## showDebugLogs

Show debug logs

- Source default: `false`; enabled flag: `false`.
- Location: Hidden / inline or internal.
- Guide: [Color-coded mod log and diagnostics](Features-tools#color-coded-mod-log-and-diagnostics).

## logTimestamp

Show timestamps in log

- Source default: `false`; enabled flag: `false`.
- Location: Hidden / inline or internal.
- Guide: [Color-coded mod log and diagnostics](Features-tools#color-coded-mod-log-and-diagnostics).

## autosing3to6DCubeOpeningPercent

3-6D Cube opening %

- Source default: `80`; enabled flag: `true`.
- Location: Panel control / auto-sing.
- Guide: [Advanced run settings and reset to defaults](Features-autosing#advanced-run-settings-and-reset-to-defaults).

## autosingTessBuildingAutoBuyPercent

Tesseract building auto-buy %

- Source default: `50`; enabled flag: `true`.
- Location: Panel control / auto-sing.
- Guide: [Advanced run settings and reset to defaults](Features-autosing#advanced-run-settings-and-reset-to-defaults).

## autosingAutoChallTimerStart

Auto-challenge start timers

- Source default: `0.1`; enabled flag: `true`.
- Location: Panel control / auto-sing.
- Guide: [Advanced run settings and reset to defaults](Features-autosing#advanced-run-settings-and-reset-to-defaults).

## autosingAutoChallTimerExit

Auto-challenge exit timers

- Source default: `0.2`; enabled flag: `true`.
- Location: Panel control / auto-sing.
- Guide: [Advanced run settings and reset to defaults](Features-autosing#advanced-run-settings-and-reset-to-defaults).

## autosingAutoChallTimerEnter

Auto-challenge enter timers

- Source default: `0.1`; enabled flag: `true`.
- Location: Panel control / auto-sing.
- Guide: [Advanced run settings and reset to defaults](Features-autosing#advanced-run-settings-and-reset-to-defaults).

## resetAutosingAdvanced

Reset to default

- Source default: `""`; enabled flag: `true`.
- Location: Panel control / auto-sing.
- Guide: [Advanced run settings and reset to defaults](Features-autosing#advanced-run-settings-and-reset-to-defaults).

## heaterTypeLoadoutSelections

Heater type loadout selections

- Source default: `[]`; enabled flag: `true`.
- Location: Hidden / inline or internal.
- Guide: [Assign, copy and import Heater loadouts](Features-heater#assign-copy-and-import-heater-loadouts).

## heaterUncheckedBranches

Heater unticked branches

- Source default: `[]`; enabled flag: `true`.
- Location: Hidden / inline or internal.
- Guide: [Choose and remember active optimization branches](Features-heater#choose-and-remember-active-optimization-branches).

## heaterTickedBranches

Heater ticked branches

- Source default: `[]`; enabled flag: `true`.
- Location: Hidden / inline or internal.
- Guide: [Choose and remember active optimization branches](Features-heater#choose-and-remember-active-optimization-branches).

## heaterWorkers

Heater: workers running at once (select under the heat button)

- Source default: `3`; enabled flag: `true`.
- Location: Hidden / inline or internal.
- Guide: [Background heating, progress and cancel](Features-heater#background-heating-progress-and-cancel).
