# Ambrosia Heater: the optimizer

The heater docs: `heater.md` (the panel: heating, results, branches, inputs, Best H), `heater-optimizer.md` (how the optimizer models the game, row scores, speed, known limits).

The optimizer (`hs-heater-optimizer*.ts`) runs in a web worker: no DOM, no `HSLogger` (`heater.md`, "Heating").

Income objectives use the same [sustained Ambrosia calculation](gds.md#sustained-ambrosia-income) as the page and
header, with each candidate's loadout and routing. Starting tank contents do not affect a candidate's score.

## Platonic Tau
The game raises every cube multiplier (Wow! Cubes to Octeracts) to Tau's power (1.01 once bought, kept in every Exalt: QoL upgrade; `applyTauPower`, Calculate.ts).
- The heater's `cube`/`oct` stats stay untaued: the merge shortcuts multiply them by factors, and r^1.01 keeps every cube or oct ranking (H thresholds included).
- Tau (`tauPower` in the heater data, default 1) is applied only where it changes something: the `ambOct` score (allAmb × oct^tau) and the Effect shown on cube/oct rows (`generateOutput`).
- The Red Ambrosia table's Octeract effects don't apply it (same order, values ~1% low).

## Singularity penalty (SR relief)
- `Upgrade.singDebuff` mirrors the game's `calculateSingularityDebuff` and is only used as a ratio, singDebuff(s) / singDebuff(s − SR level).
- `mOff` is the Offering/Obtainium penalty times Global Speed's penalty, once (counting Global Speed twice, as the rus sync did, overstates SR's Obtainium/Offerings relief by ×1.13 to ×5). `cube` is the Cubes penalty times Ascension Speed's.
- Left out on purpose, since they cancel in the ratio (checked, under 1e-5): the HorseShoe shop multiplier, and No Octeract Effects' (completions + 1)³ on effective singularities (not in the export).
- Obtainium's diminishing returns (`illiteracy`, `calculateObtainium`) are left out too: they are ×1 outside Challenge 15. Inside it they raise the product of Obtainium multipliers to ^0.2–0.4 (Global Speed and Red Ambrosia excluded), which shrinks SR's penalty relief and Ambrosia Obtainium alike. The heater models no ascension challenge.

## Exalt 10 (Bar Charging)
The bars give time instead of Ambrosia (blue fill: reward × 0.01 s of prestige/transcension/reincarnation/potion time; red fill: reward × 0.05 s of ascension time; `Helper.ts`), the bar lengths are fixed (Brick of Lead doesn't lengthen them), and each Purple extraction, instead of Honey, fills each of the blue and red bars at most once, each with chance `1 - 2^(-Purple Honey reward Luck / 100)` (`calculateBarEXALTPurpleFillChance`).
- `calculateAmbrosiaBarIncome` keeps `blue/redAmbrosiaPerSecond` at 0 there (the header's hourly rates read them) and gives the bar rewards in Ambrosia units in `blue/redRewardPerSecond`. The heater's Blue, Red and All scores read the reward fields: in Exalt 10 they mean global time, ascension time and their product (constant factors don't change the pick).
- With One Mind, ascension speed is a multiplier on cubes and ascension count (`Statistics.ts`, `OneMind` lines). Brick of Lead lowers it (×0.75 at max) and SR2 raises it (singularity penalty). The bar-time scores don't count it; how players weigh it against time in Exalt 10 was asked to two players (rus, Aceo).
- Checked on a player's Exalt 10 save (slot 4 = their hand-made tree): the heater picks that tree minus SR2, with Cube-Luck 1 and Quark-Luck 1 at 25, ×5.84 against ×5.26.

## Happy Hour bells (Active Bells field)
The heat is for the **Active Bells** field's bell count (default: the live count, so a default heat is unchanged), e.g. 0 to heat for outside Happy Hour.
- Bells change three heater inputs: the additive luck mult (+0.1 + 0.01·(n−1)), blue bar speed (×(1 + g + same)/(1 + g), g = the global event's BlueberryTime part, one factor in `Statistics.ts` 'Event'), and Base Red Luck through its share of Ambrosia luck (floor((luck − 100) / conversion), `calculateRedAmbrosiaLuck`). Quark, Cubes, Offering and Obtainium get their own `1 + buff` factor, the same on every loadout: no effect on picks. Red bar speed: none (no event line, no blue speed term).
- GDS exports the three without bells (`totalAdditiveLuckMultiplierNoAmbNoBells`, `finalAmbrosiaBarPointsSNoAmbNoBells`, `totalRedLuckNoAmbNoBells`: the terms GDS added, taken out) and g (`globalEventBlueBarBonus`); the old keys stay. The three fields are labelled "(no bells)"; g is the "Event Blue Bar Bonus" field.
- `applyHeaterBells` (`hs-heater-utils.ts`) adds the field's bells back; every reader of the three fields goes through it (worker's `fillStatsAndOptionsFromInput`, its `totalRedLuck` for the Red Ambrosia table and the dev diagnostics, the table's two speed reads). The table's `mLuck` comes from the worker, bells included.
- Exports are always live (`dumpDataForHeater`), so there is no fallback for an old export without the new keys.
- **When a new input field is added, check its formula for a bell term**: Base Red Luck's bell term was found late.
- Rejected: the modal rewriting the three fields when Active Bells changes, and the optimizer correcting them from the export's hidden bell count.

## Obt + Off row
One loadout for Obtainium and Offerings together (a player's request).
- Score obt × off (`obtAndOff` stat: +10% of either counts the same). Effect shows both multipliers ("Obt x / Off y"); "Maxed" compares the product with the max tree; follows the Post-AoAG (Obt/Off) field. Label "Obt + Off", default icon BlueberryObtainium; the Obt and Off rows' default icons are BlueberryBaseObtainium1 / BlueberryBaseOffering1.
- Its own branch `obtAndOff`, "Obt + Off (slower)", unticked until the player ticks it (`heater.md`, "Branches"). Same worker group as Quarks and Obt/Off (shares their Luck, Rune and Voucher tables). The older branch/section id `obtOff` stays (saved in the setting); its checkbox label is "Obt, Off".
- Cost (node bench): +7 s (S260), +24 s (S230, 90M), +39 s (S289, Exalt 10). The time is `findResourceVoucherOpt`'s bound pass (left frontier ~3.5× Obt's × 61 voucher rows, each fully scored) and, in Exalt 10, loose bounds (43 groups searched instead of 1). Not sound: a per-row Luck budget for the bound (a Blueberry repair can make an over-budget pair affordable).
- Autosing Sync Settings: Obt + Off is the second choice for Autosing Obt and Autosing Off.

## Coins in C15 row

The loadout with the most coins per real second inside Challenge 15, the tax cap
assumed reached.
- Its own branch `coinsC15` (option `calculateCoinsC15`, its own worker group in `hs-heater-optimizer-runner.ts`),
  offered only when the export holds its input.
- **Input** (`buildHeaterCoinsC15Input`, `hs-core/gds/hs-heater-coins-export.ts`, field `heaterCoinsC15` of the heater
  export): the game's tax exponent and global speed stats (`Statistics.ts`) evaluated on a copy of the save with the
  current challenges replaced by C15 alone, so the player needn't be in C15. Rune levels from the save's rune EXP,
  blessings, spirits and talismans (`heaterCoinRunePurchasedLevel` copies `Runes.ts updateLevelsFromEXP`, its
  floating point correction included).
- Rune cost coefficients are exported as decimal strings and parsed once by the evaluator, preserving Horseshoe's
  `1e500` cost through JSON. The exporter and Heater use the same string format.
- **Score**: a log10 ratio against the loadout with no purchased Ambrosia upgrades (`heaterCoinsC15LogRatio`,
  `hs-heater-coins.ts`); the factors the loadout doesn't change cancel out. Effect is that ratio as a multiplier
  (`formatHeaterCoinsC15Effect`). Post-AoAG applies to it too ("Post-AoAG (Obt/Off/Coins)").
- Test: `npm run test:heater-coins` (fixture `scripts/fixtures/heater-coins-upstream.json`). It expects English
  number formatting (`1.00`): under another node locale its `formatHeaterCoinsC15Effect(0)` check fails.

## Searches: exact and sampled
- **Cubes, Oct and the Hyperflux rows are exact**: they no longer use `findCubeLuckOpt`'s sampled upper bound, which assumed Luck-Cube rows score more as they cost more, false on that Ambrosia × Blueberries frontier; it dropped the best tree (a player's save: Cubes ×0.89 with 11 Blueberries and 20M Ambrosia left, H0-H3 too).
- **Max SR1/SR2 keep the sampled bound on purpose** (`sampledUpperBound`): their SR level is set before the search and their cubes are a bonus, while without the bound their Blueberry repairs took the SR stage from 8 to 29 s (S260 save).
- `findQuarkLuckOptSingleFixed` and `findLuckScaledResourceOpt` (Obt/Off) keep it too: see "Known limits".

## Speed: what was done and what was rejected
Heat time grows with the Ambrosia budget (Obt/Off: 3 s at 1M, ~150 s at 83.7M on a S230 save): the searches' early exits never fire when everything is affordable. Measure with `scripts/harness/node/heater-bench.ts` (node times match the browser's); a change must give the same rows on several backups and budgets, inside Exalts too (the bench takes `EXALT`).
- **Done:**
  - `findResourceVoucherOpt` bounds each voucher count × Obtainium I / Offering I group and searches from the highest bound down (from XxMolkxX's v2.14.4c code: quarks + Obt/Off 148 → 24 s in game).
  - Voucher merges sort only the new batch and merge it into the sorted frontier, trimming only when the batch is at least the frontier's size (the time was the trim, 564 re-sorts of a ~300k frontier; cube merge ~32 → ~9 s).
  - The sampled upper bound left Cubes, Oct and Hyperflux (exactness; the cube search got faster).
  - `shopLevel`'s group table hoisted (it was rebuilt per call), shop Obtainium/Offering multipliers cached per heat (`shopValueCaches`, cleared in `fillStatsAndOptionsFromInput`): every group 5–30% faster, whole default heat ~123 → ~113 s (S260).
- **Measured and rejected:**
  - Hyperflux in the Cubes+SR worker: ~10 s saved, peak memory 864 MB → 1,314 MB. The groups are split on purpose for memory; merging groups to avoid rebuilding shared tables (~15–18 s of ~250 s) stays rejected.
  - Merging Cubes/SR1/SR2 into one `findCubeLuckOptsForBudgets` pass: not exact (Purple Leo luck moves with SR's Blueberries; strict mode skips repaired pairs). Its exact part, scoring SR copies from the Cube search, gave the same rows in 26 configurations for SR 9.4 → 5.8 s, at ~45–55 subtle lines: shelved.
  - "Everything affordable → max tree": on a S230 save only SR1/SR2 qualify (≤ 10 s).
  - Precomputed maxed trees per type: the cheapest tree reaching the all-max value costs 154–214M Ambrosia and 34–42 Blueberries for Quarks/Oct/Cubes; late saves have ~90M and 31 Blueberries. Luck/Red/All/Purple already have the shortcut (`findAffordableFullLevelBarIncomeOpts`, full at 64–80M); only Obt/Off would qualify (full at 83.7M / 26 Blueberries outside Exalts, sing- and Exalt-dependent). A generalised version (best tree with unlimited Ambrosia, computed at heat time since the module set depends on the save) is designed and parked: small gain today, future-proofing.
  - Same-item prefilter in voucher merges (0 rows dropped), a growing batch in `createBatchedTable` / `mergeIndependentTables` (no gain beyond noise), starting Obt + Off from the Obt/Off results (no gain).

## Known limits
- **Few Blueberries with a lot of Ambrosia make the Cube search very slow.** `cubes+sr`, S260 save: 60M Ambrosia with 20 Blueberries 560 s, 90M with 20 stopped after 24 min, 90M with 25 77 s, 90M with 31 18.5 s. A profile of the 90M / 20 heat shows 99% of the time in `findCubeLuckOpt`, half of it in `fixBlueberryUpgrades`, 43% in `get blueberryCost`.
  - Likely cause (read from the code, pairs not counted): a pair over the Blueberry budget is repaired by removing upgrades, so its tree gets cheaper, the Ambrosia exits of `findCubeLuckOptSingleFixed`'s inner loop don't fire, and each left row walks the whole right table.
  - The real saves checked have 31 or more Blueberries at 90M and above (18–29 s). Recalculating `blueberryCost` less often in the repair would help but leaves the all-pairs search; not worth doing until a real save is this slow.
- **The Cube searches' frontier follows the Infinite Ascent rune's EXP**, far more than the budget, and not the singularity. As the EXP rises the rune table grows, probably because more `ambrosiaRuneOOMBonus` × `ambrosiaTalismanBonusRuneLevel` pairs give a distinct rune level past the `floor` in `runeLevelIA`. `cubes+sr`, S260 save at 90M Ambrosia and 31 Blueberries, only the EXP changed: 151k rows at 1e363 (rune table 399), 325k at 1e1075, 410k at 1e2000, 435k at 1e20000 (rune table 1700, its maximum: same at 1e5000). The limit is `HEATER_ROW_LIMIT`, 500k rows per table; 435k took 1.1 GB in node. Real backups reach 1e1501 (278k–314k rows at that budget).
- **Purple Leo luck on the Hyperflux rows H1–H7.** In `findCubeLuckOptsForBudgets` with `blueberryReserves`, the Blueberries reserved for Hyperflux (3, or 2 with its purple enchantment) still count as unassigned when a candidate is scored. Leo gives unassigned × level luck, only with 5 or more unassigned (max level 25), so a candidate can be credited up to 75 luck too much, or the whole Leo bonus when it really ends below 5 free.
  - The numbers shown are exact (each winner is re-scored at its Hyperflux level); only the choice between near-equal trees can be off, for trees leaving 5 or more Blueberries free before Hyperflux.
  - Fix idea: when `stats.purpleLeoLevel > 0`, correct the score in the same pass (`createCubeLuckEvaluator.evaluate`: the reserve only changes `purpleLeoDelta`, two cached scores per pair; ~30–40 lines in the hot function, no cost without Leo; only the plain Cube/Voucher table reserves, with two values, 0 and the Hyperflux Blueberries; the group merge in `findCubeLuckOptsForBudgets` also compares winners without the reserve and needs the same correction). Alternative: search H1+ on tables whose rows carry Hyperflux 1, only with Leo (exact, 6 passes instead of 3, about +40% on the Hyperflux stage). Test with a made-up Leo level or a Leo owner's export, against the separate-table version.
- **Unproven assumptions of the exact searches:** the `j` pointer in `findCubeLuckOptSingleFixed` / `findCubeLuckOptsForBudgets` assumes the best Luck-Cube row never moves back to a cheaper one from one cube row to the next, on an Ambrosia × Blueberries frontier. `findQuarkLuckOptSingleFixed` and `findLuckScaledResourceOpt` (Obt/Off) keep the sampled upper bound; whether their right tables are 2D frontiers wasn't checked. To check: capture the two tables before the search (`scripts/harness/node/heater-bench.ts`), fix one side and scan the other, after estimating the pair count.
