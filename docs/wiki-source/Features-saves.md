# Save exports, backups & restore

Timed game exports collect native export rewards. A full HS backup is a separate action that also preserves local mod state.

## On this page

- [Export every X minutes](#export-every-x-minutes)
- [Choose and remember an export folder](#choose-and-remember-an-export-folder)
- [Keep only the last X timed-export files](#keep-only-the-last-x-timed-export-files)
- [Dedicated Ambrosia export loadout](#dedicated-ambrosia-export-loadout)
- [One-file game and mod backup](#one-file-game-and-mod-backup)
- [Restore a backup or ordinary game save](#restore-a-backup-or-ordinary-game-save)
- [Clear mod settings and reload](#clear-mod-settings-and-reload)

### Export every X minutes

Runs the game's Export action on a configurable schedule.

**Where:** Settings → QoL →Export the save every X minutes

- Uses the last game export time, so exporting manually restarts the interval and reloads do not normally reset it.
- Collects native export rewards and makes a file even when your regular export preference is clipboard mode.
- Pauses while AutoSing runs or the offline popup is open.

**Availability and limits**

- Steam needs an export folder. Browser download permissions can affect plain downloads.

**Related settings:** [`autoExportSave`](Settings-Reference#autoexportsave)

**Source:** [auto-export.md](https://github.com/Ferlieloi/synergism-hypersynergy/blob/master/docs/features/auto-export.md) · [backup.md](https://github.com/Ferlieloi/synergism-hypersynergy/blob/master/docs/features/backup.md)

### Choose and remember an export folder

Writes timed exports directly to a folder on supported platforms.

**Where:** Settings → QoL → Choose folder / ✕

- The folder handle is remembered locally; after a restart, your first game click/key press can renew permission.
- ✕ forgets the folder: direct writes stop, existing files stay.
- Choose a subfolder if the platform refuses a protected system folder.

**Availability and limits**

- Supported on Steam and compatible Chromium browsers, not Firefox. Folder handles are not transferable in a backup.

**Related settings:** [`autoExportSaveFolder`](Settings-Reference#autoexportsavefolder), [`autoExportSaveForgetFolder`](Settings-Reference#autoexportsaveforgetfolder)

**Source:** [auto-export.md](https://github.com/Ferlieloi/synergism-hypersynergy/blob/master/docs/features/auto-export.md) · [backup.md](https://github.com/Ferlieloi/synergism-hypersynergy/blob/master/docs/features/backup.md)

### Keep only the last X timed-export files

Limits saved timed exports in the chosen folder.

**Where:** Settings → QoL →Keep only the last X files

- Deletes only files recorded as written by this feature. Other files in the folder are left alone.
- The setting does not delete plain browser downloads.

**Related settings:** [`autoExportSaveKeep`](Settings-Reference#autoexportsavekeep)

**Source:** [auto-export.md](https://github.com/Ferlieloi/synergism-hypersynergy/blob/master/docs/features/auto-export.md) · [backup.md](https://github.com/Ferlieloi/synergism-hypersynergy/blob/master/docs/features/backup.md)

### Dedicated Ambrosia export loadout

Collects export rewards with the configured tree, then restores the original when possible.

**Where:** Settings → QoL →Export loadout

- Choose None to leave the tree untouched. The exported save contains the export-time tree.
- The return path preserves unsaved tree changes when the required live-game validation is available.

**Availability and limits**

- Each tree load resets Ambrosia bars. Without a usable return slot, the export loadout remains loaded.

**Related settings:** [`autoExportSaveLoadout`](Settings-Reference#autoexportsaveloadout)

**Source:** [auto-export.md](https://github.com/Ferlieloi/synergism-hypersynergy/blob/master/docs/features/auto-export.md) · [backup.md](https://github.com/Ferlieloi/synergism-hypersynergy/blob/master/docs/features/backup.md)

### One-file game and mod backup

Downloads the save, mod settings/data, game preferences, logs and diagnostic context together.

**Where:** Tools → Backup & Restore → export backup

- Includes saved strategies, hidden tabs/dialogs, custom icons, header customization and other hs-prefixed stores, excluding development-only state.
- Adds version/platform information and Heater diagnostics where available; diagnostic export failure does not prevent the backup.

**Availability and limits**

- Does not collect game export rewards. Refused during AutoSing or when the game cannot save, such as a time warp. Keep backups private when they contain your save or logs.

**Source:** [auto-export.md](https://github.com/Ferlieloi/synergism-hypersynergy/blob/master/docs/features/auto-export.md) · [backup.md](https://github.com/Ferlieloi/synergism-hypersynergy/blob/master/docs/features/backup.md)

### Restore a backup or ordinary game save

Validates the file, lets you choose supported restore parts, then reloads.

**Where:** Tools → Backup & Restore → import

- The current-state backup and the actual import are separate clicks, allowing the backup download to finish first.
- Restoring mod data is exact: missing mod keys are removed. Only permitted game-preference keys are restored; logs and diagnostics are never imported.
- An ordinary current-format game export can also be loaded.
- "Skip offline progress" loads the save with no offline progress since it was made; code timers and the daily reset work as usual.

**Availability and limits**

- Import replaces the selected local state and reloads the page. Legacy compressed saves rejected by current validation are not restored; folder permissions and pending paid time skips are not copied.

**Source:** [auto-export.md](https://github.com/Ferlieloi/synergism-hypersynergy/blob/master/docs/features/auto-export.md) · [backup.md](https://github.com/Ferlieloi/synergism-hypersynergy/blob/master/docs/features/backup.md)

### Clear mod settings and reload

Resets the mod's main settings after confirmation.

**Where:** Tools → CLEAR SETTINGS

- Clears the settings store and reloads immediately so in-memory values cannot silently write the old settings back.

**Availability and limits**

- This clears the main settings key; it is not a promise to delete every separate mod store or the game save.

**Source:** [auto-export.md](https://github.com/Ferlieloi/synergism-hypersynergy/blob/master/docs/features/auto-export.md) · [backup.md](https://github.com/Ferlieloi/synergism-hypersynergy/blob/master/docs/features/backup.md)
