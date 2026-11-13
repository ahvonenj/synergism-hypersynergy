# Feature audit and maintenance

The reviewed catalogue is `docs/data/feature-catalogue.json`. Website pages, `docs/FEATURES.md` and `docs/wiki-source/` are generated; edit the catalogue, then run `python scripts/tools/build-docs.py`.

Audit source: [43cf692e14e9263a4fdb99d391fdc635ae726d78](https://github.com/Ferlieloi/synergism-hypersynergy/commit/43cf692e14e9263a4fdb99d391fdc635ae726d78). The generator reads the package version, settings registry and calculation registry from the checkout. When re-auditing, update the audit commit only after reviewing behavior changes.

## Coverage

- 115 feature entries in 12 categories.
- All 95 settings are associated with a feature, including hidden settings.
- Shared framework modules and development-only tools are identified separately.
- Source and developer-document references are checked to exist.

| Category | Features | Primary evidence |
| --- | --- | --- |
| Installation & updates | 5 | [tampermonkey-bridge.user.js](https://github.com/Ferlieloi/synergism-hypersynergy/blob/master/src/loader/tampermonkey-bridge.user.js) · [loaders.md](https://github.com/Ferlieloi/synergism-hypersynergy/blob/master/docs/features/loaders.md) · [README.md](https://github.com/Ferlieloi/synergism-hypersynergy/blob/master/synergism_modloader/README.md) |
| Interface & remembered preferences | 11 | [hs-ui.ts](https://github.com/Ferlieloi/synergism-hypersynergy/blob/master/src/mod/class/hs-core/hs-ui.ts) · [hs-settings-ui.ts](https://github.com/Ferlieloi/synergism-hypersynergy/blob/master/src/mod/class/hs-core/settings/hs-settings-ui.ts) · [dialogs.md](https://github.com/Ferlieloi/synergism-hypersynergy/blob/master/docs/features/dialogs.md) · [subtab-memory.md](https://github.com/Ferlieloi/synergism-hypersynergy/blob/master/docs/features/subtab-memory.md) · [singularity-search.md](https://github.com/Ferlieloi/synergism-hypersynergy/blob/master/docs/features/singularity-search.md) |
| Click-saving tools & input | 5 | [hs-codes.ts](https://github.com/Ferlieloi/synergism-hypersynergy/blob/master/src/mod/class/hs-modules/hs-codes.ts) · [hs-qol-buttons.ts](https://github.com/Ferlieloi/synergism-hypersynergy/blob/master/src/mod/class/hs-modules/hs-qol-buttons/hs-qol-buttons.ts) · [hs-mouse.ts](https://github.com/Ferlieloi/synergism-hypersynergy/blob/master/src/mod/class/hs-core/hs-mouse.ts) |
| Ambrosia loadouts & income | 8 | [hs-ambrosia.ts](https://github.com/Ferlieloi/synergism-hypersynergy/blob/master/src/mod/class/hs-modules/hs-ambrosia/hs-ambrosia.ts) · [hs-ambrosia-quick-import.ts](https://github.com/Ferlieloi/synergism-hypersynergy/blob/master/src/mod/class/hs-modules/hs-ambrosia/hs-ambrosia-quick-import.ts) · [hs-ambrosia-rates.ts](https://github.com/Ferlieloi/synergism-hypersynergy/blob/master/src/mod/class/hs-modules/hs-ambrosia/hs-ambrosia-rates.ts) · [header-loadouts.md](https://github.com/Ferlieloi/synergism-hypersynergy/blob/master/docs/features/header-loadouts.md) · [header-modules.md](https://github.com/Ferlieloi/synergism-hypersynergy/blob/master/docs/features/header-modules.md) |
| Header customization | 20 | [header-edit-mode.md](https://github.com/Ferlieloi/synergism-hypersynergy/blob/master/docs/features/header-edit-mode.md) · [header-elevator.md](https://github.com/Ferlieloi/synergism-hypersynergy/blob/master/docs/features/header-elevator.md) · [header-loadouts.md](https://github.com/Ferlieloi/synergism-hypersynergy/blob/master/docs/features/header-loadouts.md) · [header-modules.md](https://github.com/Ferlieloi/synergism-hypersynergy/blob/master/docs/features/header-modules.md) · [hs-header-keep-on-import.ts](https://github.com/Ferlieloi/synergism-hypersynergy/blob/master/src/mod/class/hs-core/header/hs-header-keep-on-import.ts) · [hs-header-loadout-icons.ts](https://github.com/Ferlieloi/synergism-hypersynergy/blob/master/src/mod/class/hs-modules/hs-loadout-icons/hs-header-loadout-icons.ts) |
| Corruption & challenge displays | 6 | [header-corruption.md](https://github.com/Ferlieloi/synergism-hypersynergy/blob/master/docs/features/header-corruption.md) · [header-challenge-progress.md](https://github.com/Ferlieloi/synergism-hypersynergy/blob/master/docs/features/header-challenge-progress.md) |
| Integrated Ambrosia Heater | 15 | [heater.md](https://github.com/Ferlieloi/synergism-hypersynergy/blob/master/docs/features/heater.md) · [heater-optimizer.md](https://github.com/Ferlieloi/synergism-hypersynergy/blob/master/docs/features/heater-optimizer.md) · [hs-heater-result-config.ts](https://github.com/Ferlieloi/synergism-hypersynergy/blob/master/src/mod/class/hs-modules/hs-heater/hs-heater-result-config.ts) · [hs-heater-ui-result.ts](https://github.com/Ferlieloi/synergism-hypersynergy/blob/master/src/mod/class/hs-modules/hs-heater/ui/hs-heater-ui-result.ts) |
| Hepteracts & Platonic upgrades | 10 | [hs-hepteracts.ts](https://github.com/Ferlieloi/synergism-hypersynergy/blob/master/src/mod/class/hs-modules/hs-hepteracts/hs-hepteracts.ts) · [hs-hepteract-ratios.ts](https://github.com/Ferlieloi/synergism-hypersynergy/blob/master/src/mod/class/hs-modules/hs-hepteracts/hs-hepteract-ratios.ts) · [hepteract-distributor.md](https://github.com/Ferlieloi/synergism-hypersynergy/blob/master/docs/features/hepteract-distributor.md) · [platonic-tooltip.md](https://github.com/Ferlieloi/synergism-hypersynergy/blob/master/docs/features/platonic-tooltip.md) |
| Golden Quarks & shop preferences | 6 | [gq-distributor.md](https://github.com/Ferlieloi/synergism-hypersynergy/blob/master/docs/features/gq-distributor.md) · [hs-qol-buttons.ts](https://github.com/Ferlieloi/synergism-hypersynergy/blob/master/src/mod/class/hs-modules/hs-qol-buttons/hs-qol-buttons.ts) |
| Save exports, backups & restore | 7 | [auto-export.md](https://github.com/Ferlieloi/synergism-hypersynergy/blob/master/docs/features/auto-export.md) · [backup.md](https://github.com/Ferlieloi/synergism-hypersynergy/blob/master/docs/features/backup.md) |
| AutoSing & strategy editor | 14 | [autosing.md](https://github.com/Ferlieloi/synergism-hypersynergy/blob/master/docs/features/autosing.md) · [autosing-strategies.md](https://github.com/Ferlieloi/synergism-hypersynergy/blob/master/docs/features/autosing-strategies.md) · [autosing-editor.md](https://github.com/Ferlieloi/synergism-hypersynergy/blob/master/docs/features/autosing-editor.md) · [hs-autosingModal.ts](https://github.com/Ferlieloi/synergism-hypersynergy/blob/master/src/mod/class/hs-modules/hs-autosing/hs-autosingModal.ts) |
| Calculations, logs & framework | 8 | [tools-tab.md](https://github.com/Ferlieloi/synergism-hypersynergy/blob/master/docs/features/tools-tab.md) · [gds.md](https://github.com/Ferlieloi/synergism-hypersynergy/blob/master/docs/features/gds.md) · [dev-tools.md](https://github.com/Ferlieloi/synergism-hypersynergy/blob/master/docs/features/dev-tools.md) · [hs-tools-tab.ts](https://github.com/Ferlieloi/synergism-hypersynergy/blob/master/src/mod/class/hs-core/hs-tools-tab.ts) · [hs-logger.ts](https://github.com/Ferlieloi/synergism-hypersynergy/blob/master/src/mod/class/hs-core/hs-logger.ts) |


## Reviewed distinctions

- GQ and Octeract hide-maxed buttons are native; the mod persists their selections.
- Native header modules/layout editing are enhanced by the mod; they were not invented by it.
- The old eight-corruption loadouts, corruption reference-sheet assumptions and separate mod Ambrosia quickbar are not current features.
- Incomplete legacy cube/ascension tools were removed; the calculation registry is used for the current reference.
- Developer live editing/recording is excluded from player releases. CSV collection is a separate hidden diagnostic setting.
- Retired settings or comments are not evidence of a currently exposed player feature.

## Verification limits

This was a source audit, not a complete playthrough on all progression levels or platforms. Existing developer docs were preserved. No game behavior or release bundle was changed.
