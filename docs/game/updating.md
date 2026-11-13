# After a game update

The game updates often, and players get the new version at their next page load (Steam: at the next update). What to
check, in order, and how the 4.4.0 update went as a worked example.

## Checklist

1. **Get the new game.** `node scripts/tools/update-game.cjs` pulls the source and fetches the live bundle (the
   replaced one is kept as `local/game/out.prev.js`). `git log` / `git diff <old-commit> HEAD -- src/` in
   `local/game/SynergismOfficial-master` says what changed; GitHub's `master` can be ahead of the deployed game, and a
   live bundle can change with no source commit (compare `out.prev.js` and `out.js`). When an update reworks the
   colours, `node scripts/tools/game-diff-noncolour.cjs <old-commit> HEAD [paths]` leaves out the lines that only swap a
   colour. The game's changelog: https://changelog.synergism.cc. The game's `package.json` version is not kept up to
   date (4.4.0 still said 4.1.1).
2. **Patcher.** Run it on the browser bundle and the Steam one (`docs/features/loaders.md`, "Checking the Steam
   bundle"): `node scripts/tools/patcher-targets.cjs local/game/out.js`, then `<steam out.js> steam`. The summary must
   say "N/N applied" with no "to check", and the start of each function a patch names must be the one it was meant for
   (the patcher anchor rule in `AGENTS.md`). A patch the game made pointless is retired, not left failing: a failed
   patch shows every player the "patch missing" warning and can turn a fast path off.
3. **Player shape.** `node scripts/harness/gds-player-keys.cjs` compares vanilla `Player` keys with the mod's
   `GameDataFields`, then check the runtime shapes on the live game (`docs/features/gds.md`).
4. **DOM ids and names.** Tab and subtab ids are written once, in `MAIN_VIEW_TAB_IDS` and the `*_VIEW_BUTTON_IDS`
   records (`types/module-types/hs-gamestate-types.ts`); grep the mod for any other id the diff renamed or removed. Autosing
   has no hardcoded stage name (it calls the game's `synergismStage`), so renamed stages don't affect it. If the diff
   touches inline colours, grep the mod for the colours it reads (`.style.color`, `.style.backgroundColor`, `[style*=`):
   one comparison fails with no error. Prefer a non-colour signal (player state, a class the game's code reads).
5. **Event checks.** The mod drives game handlers with synthetic events (`.click()`, `dispatchEvent`, the header's
   long press in `HSHeaderEditSettings.openEditor`), which differ from a player's: `isTrusted` false, and
   `isPrimary` false unless set. `git diff <old-commit> HEAD -- src/ | grep -E '^\+.*(isTrusted|isPrimary|pointerType|event\.detail|\.button !==)'`
   lists the new checks; for each, grep the mod for events sent to that element. Missed in 4.4.1: an `isPrimary`
   test on the header's `pointerdown` stopped the ✎ button opening edit mode, with no error.
6. **Formulas.** For each game file GDS re-implements, compare the diff with the GDS code (`docs/game/formulas.md`),
   then check the numbers on real saves (below). Achievement ids and point values are copied from the game's
   `Achievements.ts` (`hs-gamedata-api-achievement.ts`): `node scripts/tools/achievements-vs-vanilla.cjs` compares
   them (`--print` writes the game's tables to paste). While GDS keeps its fallback for a game from before the rune
   rework (below), `node scripts/tools/coin-curve-vs-vanilla.cjs` checks its coin cost curve when `Buy.ts` changes,
   which the saves below can't (their paid amounts are Infinity).
7. **Smoke test.** `scripts/harness/game-smoke.cjs` on a real save: patches, page exceptions, a screenshot.
8. **A layout break reported right after the update** may be the browser's cached CSS (`docs/game/behaviours.md`).

## Checking GDS against the game

The reference is the game's own Stats for nerds, read at full precision. `scripts/harness/gds-vs-game.cjs <save>` runs
the real game headless on about 50 states of a save (Exalts, singularities, upgrades at zero and at their maximum,
random levels) and writes every value next to the player it was computed on, with no tick in between;
`scripts/tests/test-gds-formulas.cjs` replays that in node. After a game update:
1. Run it on your own save with `--write`, which replaces `scripts/fixtures/gds-reference.json`. If it stops on a bundle
   anchor or a stat id, the game changed: update the script.
2. `npm test`. A failure is a line that moved in the game and not in GDS, or an old GDS error: read the vanilla source.
3. Other saves: run it without `--write`, then `GDS_REFERENCE=local/harness-out/gds-vs-game/reference.json node
   scripts/tests/test-gds-formulas.cjs`. Worth doing on a low singularity and an Exalt save. A player's save never goes
   in the fixture.

Until step 1 runs, the test checks the old game: passing says nothing about a new one. A new check: the stat's id in
the script's `TOTALS` or `LINES` and the GDS value under the same id in the test.

Differences that aren't GDS errors, on a run of the script (never on a replay):
- **A state that raises the highest singularity** (an Exalt on a low save): the game counts its campaign tokens once at
  load, before raising it, and a reset refreshes them in real play. The Infinite Ascent rune is 1 or 2 levels off.
- **Rune lines off on one state only**: the game caches a rune's level and refreshes it periodically. Run that state
  again with `ONLY=`.

To read a stat by hand: Settings, `#settingstab`, then `#switchSettingSubTab4`; each `k…` button fills a container
whose `innerText` lists the lines (labels carry icons and non-breaking spaces, numbers follow the locale). GDS functions
return their components under the game's line names (`reduce_vals = false`, `docs/features/gds.md`). Traps:
- The game recomputes some values at load (`scripts/harness/README.md`, Pitfalls): a test save's C1–C10 changes never
  reach the game, and Exalt completions follow `highestSingularityCompleted`, so a test save must change both.
- A save from before the update goes through the game's migration at load, which can drop progress (4.4.0 dropped
  every campaign).

## Worked example: 4.4.0, "The Corrupted Update" (2026-10-24)

What changed in the game: the 8 corruptions became one level (`player.corruptions.used` / `next`, numbers, climbed
through `highestCleared`); campaigns were removed (tokens from `corruptions.tokenCompletions`); ascension score was
removed (cubes = cube bank × a per-level cube rate); `CalcECC` was removed (challenge completions count fully);
transcension challenges were capped at 400; the corruption loadout header modules became one `corruptionLevelHeader`
("level/max"); `acceleratorboostbtn` went; the Corruption subtabs and the stages were renamed.

How the mod followed, one step and one commit each, every step checked against the game on 5 to 14 saves:
1. Campaign tokens from the save (the DOM read of `#campaignTokenCount` removed).
2. Corruption level in GDS (`CorruptionHelper`, `hs-gamedata-api-corruption.ts`): the 9 effects, free levels, salvage.
3. Cubes: cube bank and per-level cube lines in the Tools tab (`docs/features/tools-tab.md`); the score chain removed.
4. `calcECC` removed from GDS (raw completions everywhere), accelerator caps, renamed subtab ids.
5. Header: every corruption header feature removed (`docs/features/header-modules.md`, `header-corruption.md`).
6. Autosing: corruption levels instead of loadouts (`docs/features/autosing.md`, `autosing-strategies.md`).

The game kept changing the new system for days (viscosity, cube rates, level caps): run the checklist again after each
game commit, not only after the announced update.

## 4.4.1 (2026-11-06)

What changed for the mod, one GDS commit each, checked by the replay (`test-gds-formulas.cjs`, 2754 checks):
- Campaign tokens: token upgrades, starting tokens, a multiplier on the total, capped token rewards, the Infinite
  Ascent free levels from a log2 formula. Cube rates per corruption level.
- Achievements: an `AchievementId` enum; ids and point values unchanged, the reward changes hit rewards GDS doesn't
  read.
- Buildings: counts no longer saved, only what was paid (`docs/game/formulas.md`).
- Exalt 10 reactor: fill chance and Ultrafusion cap (`docs/features/heater-optimizer.md`).
- Patcher: the `pcoinLevels` anchor.
- 2026-11-09 (game commit `a1fa5707`): new cube rates per corruption level, copied into GDS. The new Campaign token
  cube multiplier (`campaignTokenBonuses.cube`) isn't modelled: GDS stops at the corruption lines.

## Save format rework (2026-11-10, game commit `075dfeaa`)
The player became plain data: `worlds` and the wow cubes are numbers (their handlers are module objects now),
`codes` an array, sing challenges `{completions, highestSingularityCompleted, enabled}`, `autoAscendRules` a string,
`dayCheck` an ISO string, `skillCode` gone; `player.talismans` is the live store of the fragments (no
`fragmentsInvested` in the talismans object any more). No formula change. For the mod: three patcher anchors (talismans
by `baseMult`, saveSynergy by `offlinetick`), the talisman fragments read from the player. Readers of the counters
already went through `Number()`.

## Rune rework (2026-11-12, game commits `f7816c9d` to `0a0b943d`)
Save format again, no formula change (the replay matched with no GDS formula edit). Runes, blessings and spirits became
arrays indexed by the game's `RuneType` (Speed 0 … Top Hat 9): `runeEXP` / `runeLevels`, `blessingEXP` /
`blessingLevels`, `spiritEXP` / `spiritLevels`, instead of objects keyed by name (`runes`, `runeBlessings`,
`runeSpirits`). Building counts are saved again (`coinBuildings`, `diamondBuildings`, `mythosBuildings`,
`particleBuildings`, `accelerators`, `multipliers`, `acceleratorBoosts`, `ascendBuildingN.owned`) instead of what was
paid; `autoSacrifice` became `autoSacrificeRune`. Offerings now buy whole rune levels only (no partial EXP).
Bar fills (blue and red Ambrosia, the E10 reactor's, the Red Ambrosia Accelerator's) are counted in one step per tick
with one stochastic rounding (`calculateAmbrosiaBarFills`, `Helper.ts`) instead of a loop of rolls: same averages, so
the mod's expected-value bar income (`hs-ambrosia-bar-income.ts`) still matches.

Steam stayed on the previous game for a while (its bundle had no `runeLevels`): GDS reads both shapes, the EXP through
`getRuneEXP` / `getBlessingEXP` / `getSpiritEXP` (`hs-gamedata-utils.ts`) and the coin buildings from `coinBuildings`
or the 4.4.1 cost curve. Once the Steam bundle has `runeLevels`, the old shape goes: the optional fields in
`GameDataFields`, the cost curve in `hs-gamedata-api-building.ts` and `scripts/tools/coin-curve-vs-vanilla.cjs`.
