# Interface & remembered preferences

Small interface choices are remembered locally, including changes made through the game's own tab controls.

## On this page

- [Movable, resizable mod panel](#movable-resizable-mod-panel)
- [Quick access menu](#quick-access-menu)
- [Hide tabs and remember hidden tabs](#hide-tabs-and-remember-hidden-tabs)
- [Remember each tab's last subtab](#remember-each-tabs-last-subtab)
- [Search the singularity perks](#search-the-singularity-perks)
- [Optional offline-popup dismissal](#optional-offline-popup-dismissal)
- [Recover when the browser loader starts late](#recover-when-the-browser-loader-starts-late)
- [Remember dismissed game dialogs](#remember-dismissed-game-dialogs)
- [Show suppressed alerts as notifications](#show-suppressed-alerts-as-notifications)
- [Notification opacity](#notification-opacity)

### Movable, resizable mod panel

Groups settings, tools, logs and information in the game's visual style.

**Where:** Hypersynergism icon → mod panel

- Drag the panel, resize it, or minimize it while keeping the game accessible.
- Settings are grouped into pages; tooltips explain their individual controls.

**Source:** [hs-ui.ts](https://github.com/Ferlieloi/synergism-hypersynergy/blob/master/src/mod/class/hs-core/hs-ui.ts) · [hs-settings-ui.ts](https://github.com/Ferlieloi/synergism-hypersynergy/blob/master/src/mod/class/hs-core/settings/hs-settings-ui.ts) · [dialogs.md](https://github.com/Ferlieloi/synergism-hypersynergy/blob/master/docs/features/dialogs.md) · [subtab-memory.md](https://github.com/Ferlieloi/synergism-hypersynergy/blob/master/docs/features/subtab-memory.md) · [perks-find.md](https://github.com/Ferlieloi/synergism-hypersynergy/blob/master/docs/features/perks-find.md)

### Quick access menu

Opens common tools without navigating the full panel.

**Where:** Mod icon → quick access menu

- Provides quick access to the integrated Ambrosia Heater and Heater data export.
- Uses the same underlying actions as the Tools tab.

**Source:** [hs-ui.ts](https://github.com/Ferlieloi/synergism-hypersynergy/blob/master/src/mod/class/hs-core/hs-ui.ts) · [hs-settings-ui.ts](https://github.com/Ferlieloi/synergism-hypersynergy/blob/master/src/mod/class/hs-core/settings/hs-settings-ui.ts) · [dialogs.md](https://github.com/Ferlieloi/synergism-hypersynergy/blob/master/docs/features/dialogs.md) · [subtab-memory.md](https://github.com/Ferlieloi/synergism-hypersynergy/blob/master/docs/features/subtab-memory.md) · [perks-find.md](https://github.com/Ferlieloi/synergism-hypersynergy/blob/master/docs/features/perks-find.md)

### Hide tabs and remember hidden tabs

Keeps unwanted main tabs hidden across reloads.

**Where:** Settings → UI → Hide vanilla tabs; game's tab editor

- Select a tab in Hide vanilla tabs to hide it; select it again to restore it.
- Changes made with the game's own tab close/hide controls are synchronized back to the mod's saved preference.
- The PseudoCoins tab is also made hideable. Hidden tabs are retained in the game's ordered tab list so they can be restored.

**Related settings:** [`hiddenVanillaTabs`](Settings-Reference#hiddenvanillatabs)

**Source:** [hs-ui.ts](https://github.com/Ferlieloi/synergism-hypersynergy/blob/master/src/mod/class/hs-core/hs-ui.ts) · [hs-settings-ui.ts](https://github.com/Ferlieloi/synergism-hypersynergy/blob/master/src/mod/class/hs-core/settings/hs-settings-ui.ts) · [dialogs.md](https://github.com/Ferlieloi/synergism-hypersynergy/blob/master/docs/features/dialogs.md) · [subtab-memory.md](https://github.com/Ferlieloi/synergism-hypersynergy/blob/master/docs/features/subtab-memory.md) · [perks-find.md](https://github.com/Ferlieloi/synergism-hypersynergy/blob/master/docs/features/perks-find.md)

### Remember each tab's last subtab

Returns a tab to the subtab you last used after resets and reloads.

**Where:** Settings → UI → Remember last used subtab

- Remembers each main tab separately and stores the selection when you leave it.
- If a remembered subtab is locked, the choice is kept and retried when it becomes available.
- A subtab deliberately opened by another game action is generally left alone.

**Availability and limits**

- Disabling the feature forgets its remembered selections. Some reset and shortcut cases still follow the game's default behavior.

**Related settings:** [`rememberSubtabs`](Settings-Reference#remembersubtabs)

**Source:** [hs-ui.ts](https://github.com/Ferlieloi/synergism-hypersynergy/blob/master/src/mod/class/hs-core/hs-ui.ts) · [hs-settings-ui.ts](https://github.com/Ferlieloi/synergism-hypersynergy/blob/master/src/mod/class/hs-core/settings/hs-settings-ui.ts) · [dialogs.md](https://github.com/Ferlieloi/synergism-hypersynergy/blob/master/docs/features/dialogs.md) · [subtab-memory.md](https://github.com/Ferlieloi/synergism-hypersynergy/blob/master/docs/features/subtab-memory.md) · [perks-find.md](https://github.com/Ferlieloi/synergism-hypersynergy/blob/master/docs/features/perks-find.md)

### Search the singularity perks

Lists the tooltips of the perks matching what you type.

**Where:** Singularity → Perks / Penalties, above the penalties

- Results take the place of the penalties text while you search, and the other perks are dimmed in the tree. Clear the field or press Escape to bring the penalties back.
- Searches perk names and descriptions in your game language, by the start of words. Several words must all match.
- A row of clickable words (quark, cube, octeract, ant, luck, salvage, token, auto, challenge, purple) runs the common searches. The words are English; one that finds nothing is not shown.
- Perks the game hasn't shown you yet stay out of the results.

**Availability and limits**

- Perks only, not Golden Quark or octeract upgrades. Values in the results update at your next key press or when you come back to the subtab. Not available on touch devices.

**Related settings:** [`perksFind`](Settings-Reference#perksfind)

**Source:** [hs-ui.ts](https://github.com/Ferlieloi/synergism-hypersynergy/blob/master/src/mod/class/hs-core/hs-ui.ts) · [hs-settings-ui.ts](https://github.com/Ferlieloi/synergism-hypersynergy/blob/master/src/mod/class/hs-core/settings/hs-settings-ui.ts) · [dialogs.md](https://github.com/Ferlieloi/synergism-hypersynergy/blob/master/docs/features/dialogs.md) · [subtab-memory.md](https://github.com/Ferlieloi/synergism-hypersynergy/blob/master/docs/features/subtab-memory.md) · [perks-find.md](https://github.com/Ferlieloi/synergism-hypersynergy/blob/master/docs/features/perks-find.md)

### Optional offline-popup dismissal

Closes the offline progress summary automatically when the game loads.

**Where:** Settings → UI → Auto-dismiss offline popup

- Turn it off to read the game's offline summary. The preference takes effect on the next game load.

**Related settings:** [`autoDismissOfflinePopup`](Settings-Reference#autodismissofflinepopup)

**Source:** [hs-ui.ts](https://github.com/Ferlieloi/synergism-hypersynergy/blob/master/src/mod/class/hs-core/hs-ui.ts) · [hs-settings-ui.ts](https://github.com/Ferlieloi/synergism-hypersynergy/blob/master/src/mod/class/hs-core/settings/hs-settings-ui.ts) · [dialogs.md](https://github.com/Ferlieloi/synergism-hypersynergy/blob/master/docs/features/dialogs.md) · [subtab-memory.md](https://github.com/Ferlieloi/synergism-hypersynergy/blob/master/docs/features/subtab-memory.md) · [perks-find.md](https://github.com/Ferlieloi/synergism-hypersynergy/blob/master/docs/features/perks-find.md)

### Recover when the browser loader starts late

Retries loading when Tampermonkey starts after the game.

**Where:** Settings → UI → Reload when the loader starts late

- The browser bridge can reload up to three times, then shows a message asking you to refresh.
- Disable automatic retries to see the refresh message immediately.

**Availability and limits**

- Tampermonkey/browser only; this does not retry unrelated network or patch failures.

**Related settings:** [`reloadOnLateLoaderStart`](Settings-Reference#reloadonlateloaderstart)

**Source:** [hs-ui.ts](https://github.com/Ferlieloi/synergism-hypersynergy/blob/master/src/mod/class/hs-core/hs-ui.ts) · [hs-settings-ui.ts](https://github.com/Ferlieloi/synergism-hypersynergy/blob/master/src/mod/class/hs-core/settings/hs-settings-ui.ts) · [dialogs.md](https://github.com/Ferlieloi/synergism-hypersynergy/blob/master/docs/features/dialogs.md) · [subtab-memory.md](https://github.com/Ferlieloi/synergism-hypersynergy/blob/master/docs/features/subtab-memory.md) · [perks-find.md](https://github.com/Ferlieloi/synergism-hypersynergy/blob/master/docs/features/perks-find.md)

### Remember dismissed game dialogs

Adds Don't show again / Always confirm choices to supported game dialogs.

**Where:** Settings → UI → Hide game dialogs

- Hidden dialogs are answered OK without being displayed. Enabling the feature also suppresses a predefined set of repetitive dialogs.
- The hidden-dialog list is shown in settings so individual choices can be reviewed and restored.
- Supported dialog identities distinguish relevant message and prompt details instead of blindly dismissing every dialog.

**Availability and limits**

- Confirmations you choose to hide will be accepted automatically. The game's shared dialog queue is also used by mod actions.

**Related settings:** [`hideGameDialogs`](Settings-Reference#hidegamedialogs)

**Source:** [hs-ui.ts](https://github.com/Ferlieloi/synergism-hypersynergy/blob/master/src/mod/class/hs-core/hs-ui.ts) · [hs-settings-ui.ts](https://github.com/Ferlieloi/synergism-hypersynergy/blob/master/src/mod/class/hs-core/settings/hs-settings-ui.ts) · [dialogs.md](https://github.com/Ferlieloi/synergism-hypersynergy/blob/master/docs/features/dialogs.md) · [subtab-memory.md](https://github.com/Ferlieloi/synergism-hypersynergy/blob/master/docs/features/subtab-memory.md) · [perks-find.md](https://github.com/Ferlieloi/synergism-hypersynergy/blob/master/docs/features/perks-find.md)

### Show suppressed alerts as notifications

Preserves useful alert results without reopening a modal.

**Where:** Settings → UI → Show as notifications

- For example, a hidden multi-buy Alert can still report the number of purchased levels.
- Hidden Confirm dialogs are never turned into notifications.

**Related settings:** [`hideGameDialogsNotify`](Settings-Reference#hidegamedialogsnotify)

**Source:** [hs-ui.ts](https://github.com/Ferlieloi/synergism-hypersynergy/blob/master/src/mod/class/hs-core/hs-ui.ts) · [hs-settings-ui.ts](https://github.com/Ferlieloi/synergism-hypersynergy/blob/master/src/mod/class/hs-core/settings/hs-settings-ui.ts) · [dialogs.md](https://github.com/Ferlieloi/synergism-hypersynergy/blob/master/docs/features/dialogs.md) · [subtab-memory.md](https://github.com/Ferlieloi/synergism-hypersynergy/blob/master/docs/features/subtab-memory.md) · [perks-find.md](https://github.com/Ferlieloi/synergism-hypersynergy/blob/master/docs/features/perks-find.md)

### Notification opacity

Makes the game's notifications less intrusive.

**Where:** Settings → UI → Notification opacity

- Adjusts in-game notification opacity, including achievement notifications; the configured value is remembered.

**Related settings:** [`syncNotificationOpacity`](Settings-Reference#syncnotificationopacity)

**Source:** [hs-ui.ts](https://github.com/Ferlieloi/synergism-hypersynergy/blob/master/src/mod/class/hs-core/hs-ui.ts) · [hs-settings-ui.ts](https://github.com/Ferlieloi/synergism-hypersynergy/blob/master/src/mod/class/hs-core/settings/hs-settings-ui.ts) · [dialogs.md](https://github.com/Ferlieloi/synergism-hypersynergy/blob/master/docs/features/dialogs.md) · [subtab-memory.md](https://github.com/Ferlieloi/synergism-hypersynergy/blob/master/docs/features/subtab-memory.md) · [perks-find.md](https://github.com/Ferlieloi/synergism-hypersynergy/blob/master/docs/features/perks-find.md)
