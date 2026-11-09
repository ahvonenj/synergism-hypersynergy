# Autosing strategies: format, conversions, default strategies

The autosing docs: `autosing.md` (the run), `autosing-strategies.md` (strategy format, conversions, default strategies), `autosing-editor.md` (strategy and actions windows). Players' guide: `docs/data/guides/autosing.md` (published to the website and wiki by `scripts/tools/build-docs.py`), updated with any change players see.

A strategy is JSON: phases (each from a start stage to an end stage, with its steps) plus an AOAG phase. Defaults live in `resource/json/strategies/`; validation and conversions are in `hs-strategy-manager.ts`.

## IF steps
- **Max jumps** (`ifJump.ifJumpMaxJumps`, optional): after that many jumps in one phase pass the IF goes on to the next step even when its condition holds; absent or 0 = no limit. Counted per IF (its index in the running list) from the start of each pass (`#executePhase`), not per singularity. A false condition doesn't count. Validation refuses anything but a whole number ≥ 0. The editor writes it only when > 0, so an old IF updated with ✎ stays unchanged.
- Reaching it writes a normal log line (`Step N - IF … : max jumps (5) reached, no jump`), not a debug line; no notification (a low-stat account hits it at every singularity). Logs are off during a run unless debug logs are on (`autosing.md`), so in practice it shows with debug logs on. Test: `test-autosing-corruption.cjs`.

## Corruption steps
- **A level is set only by "Set corruption level" (403)**, the level in the step's `corruptionLevel` (an actual level: the game adds the free levels, `autosing.md`). Phases have no level.
- **"Ascend immediately"** (`ascendAfterCorruption`): a strategy without the field gets `true` when loaded, and validation refuses a 403 step without a boolean. The step list shows "(ascend now)" or "(next ascension)" after the level. Test: `scripts/tests/test-autosing-corruption-editor.cjs`.
- **No named corruption loadouts** (a level is one number, nothing to name).
- **Removed actions**: 400 "Corrup 0*" (one corruption action less), 401 "Corruption level from phase (reapply)" (with the phase levels), 402 "Corrup Ants", 404 "Set corruption level minus free levels" (set the lowest level that reached the target once free levels were added; removed for 403's actual level). The `corruptionFreeLevels` patch went with 404 (`#RETIRED_PATCHES`, older installs still report it); GDS's `calculateFreeCorruptionLevels()` stays (Tools tab, effective level).

## Conversions (`normalizeCorruptions`)
Older formats are brought to the current one at load of the player's saved strategies, at import and at save, silently unless noted:
- A phase's level → a 403 step at the phase's start (later if-jumps +1), except in the first and AOAG phases (dropped).
- 401 → a 403 at its phase's level (removed when the phase had none).
- 404 → a 403 with the same number (now an actual level: a higher effective level than before).
- 400 → a 403 at level 0.
- A phase naming a corruption loadout (`corruptionLoadoutName`) gets its level, "None" an empty level.
- A "Load Corruption Loadout" step (202, `loadoutName`) → a 403 step with that level, the loadout's name as comment when it had none (removed when the loadout doesn't exist: it did nothing). `corruptionLoadouts` is dropped.
- Strategies from before the game's 4.4.0 (8-value `corruptions` / `loadout` objects, 402 steps): levels at 0 (no conversion of 8 values into a level), 402 steps removed with later if-jumps moved up one step, saved back, one warning.

## Default strategies
- **Corruption levels** (a simple base for their authors to tune): the first and AOAG phases start at 0 (`autosing.md`). Only two level steps: 20 right before the "Exit Ascension challenge" (103) that leaves the first C15 (so the next ascension gives hepteracts), and 50 as the first step of singularity → end.
- **The C15 loop of the last phase** (`IF C15 < 1e110` jumping back) has max jumps 5 in Demon King (BTMco), Demon King (rus), Quark Factory and Quark Molker: low-stat accounts stayed in it forever. Not TAS (its `C15 < 1e15` loop is in phase 2).
- **"-temp" suffix** on their names, file names included (players shouldn't expect them to run well yet). A default strategy is known by its file name, so renaming one makes a player who had it selected fall back to the first in the list.
- **Every phase resets somewhere** (checked when phase passes stopped ascending, `autosing.md`). Demon King (rus) "ascension → challenge13" ends inside C13, as it did with the old phase-start Ascend (`reset('ascension')` keeps `currentChallenge.ascension`; the game credits C11–C14 itself each tick once C10's completions reach the requirement). Its old behaviour is still kept exactly: an Ascend (104) as its step 1, IF targets +1. The other default phases have none.
