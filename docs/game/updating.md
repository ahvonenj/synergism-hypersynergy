# After a game update

The game updates often, and players get the new version at their next page load (Steam: at the next update). What to
check, in order, and how the 4.4.0 update went as a worked example.

## Checklist

1. **Get the new game.** `node scripts/tools/update-game.cjs` pulls the source and fetches the live bundle (the
   replaced one is kept as `local/game/out.prev.js`). `git log` / `git diff <old-commit> HEAD -- src/` in
   `local/game/SynergismOfficial-master` says what changed; GitHub's `master` can be ahead of the deployed game, and a
   live bundle can change with no source commit (compare `out.prev.js` and `out.js`). The game's changelog:
   https://changelog.synergism.cc. The game's `package.json` version is not kept up to date (4.4.0 still said 4.1.1).
2. **Patcher.** Run it on the browser bundle and the Steam one: the summary must say "N/N applied" with no "to check",
   and each patch must log the function it was meant for (`docs/features/loaders.md`, the patcher anchor rule in
   `AGENTS.md`). A patch the game made pointless is retired, not left failing: a failed patch shows every player the
   "patch missing" warning and can turn a fast path off.
3. **Player shape.** `node scripts/harness/gds-player-keys.cjs` compares vanilla `Player` keys with the mod's
   `GameDataFields`, then check the runtime shapes on the live game (`docs/features/gds.md`).
4. **DOM ids and names.** Subtab button ids are written once, in the `*_VIEW_BUTTON_IDS` records
   (`types/module-types/hs-gamestate-types.ts`); grep the mod for any other id the diff renamed or removed. Autosing
   has no hardcoded stage name (it calls the game's `synergismStage`), so renamed stages don't affect it. If the diff
   touches inline colours, grep the mod for the colours it reads (`.style.color`, `.style.backgroundColor`, `[style*=`):
   one comparison fails with no error. Prefer a non-colour signal (player state, a class the game's code reads).
5. **Formulas.** For each game file GDS re-implements, compare the diff with the GDS code (`docs/game/formulas.md`),
   then check the numbers on real saves (below).
6. **Smoke test.** `scripts/harness/game-smoke.cjs` on a real save: patches, page exceptions, a screenshot.
7. **A layout break reported right after the update** may be the browser's cached CSS (`docs/game/behaviours.md`).

## Checking GDS against the game

The reference is the game's own Stats for nerds (Settings, `#settingstab`, then `#switchSettingSubTab4`): each `k…`
button (`kFreeCorruptionLevels`, `kSalvage`, `kASCMult`…) fills a container whose `innerText` lists the lines, and
many stats have element ids (`statSalvPos2NT`, `statFreeAccel<N>`, `statFreeBoost<N>`). GDS functions return their
components under the game's line names when asked (`reduce_vals = false`, `docs/features/gds.md`), so the two lists
can be compared line by line.

The setup used for 4.4.0: the real patched game headless with the save loaded (`scripts/harness/lib/`), clicking those
buttons and reading the lines; `HSGameDataAPI` on the same save in node (`scripts/harness/node-run.mjs` with
`node/gds-on-save.ts`); a script that compares the two. Several test saves made from one real save by changing a
field (corruption level, Platonic upgrades…) cover more cases than one save. Traps:
- The game's line labels carry icons and non-breaking spaces: strip both before matching.
- Headless Chrome formats numbers in the system's locale (`6,336e93` in French).
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
