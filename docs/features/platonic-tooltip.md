# Platonic upgrade time (`HSPlatonicUpgradeTime`, `hs-modules/hs-hepteracts/hs-platonic-upgrade-time.ts`)

Created by `HSHepteracts`. Adds "[HS] Time until next level" and the longest requirement to the hovered Platonic
upgrade's description: the cube costs (plus the Wow! Cubes and Hepteracts that the Abyss hepteracts still to craft
cost) against the owned amounts and the ascension income (`HSAscensionIncome`).

- **The time follows the cubes only.** Offerings and Obtainium are only reported as short. The four cases, by
  Wording: a duration; "ready now"; "ready after ascending" when the pending ascension covers the cubes;
  "unknown" with "Offerings/Obtainium (not estimated)" as the longest requirement, only when the cubes are already
  owned and just those are short. No separate line for them, no "at least".
- **"; craft the Abyss Hepteracts first"** is appended to the longest requirement line when Abyss hepteracts are still
  to craft (`abyssalsToCraft > 0`) and nothing else is waited for (ready after ascending / unknown / ready now), never
  next to a duration. Why: a player saw "unknown / Offerings (not estimated)" while the Abyss
  hepteracts were red in the game. The game colours the crafted Abyss hepteracts owned; the tooltip counts the raw
  Hepteracts that can craft the missing ones (×1e8 each × the `Hepteract Costs` debuff, + 69 Wow! Cubes each, cap
  expansions included), so "unknown" meant the raw Hepteracts already covered the craft and only Offerings were short.
  The debug line `Hepteracts for Abyss Hepteracts: need …, own …` shows the raw count.
- **The game's cost colours correct the displayed costs** (cut to 3 digits, up to 1% low): a cost shown red although
  the displayed amount is at most the owned one is taken as displayed × 1.01. No message of its own.
- **Exalt 7 overtime is warned about, never modelled**: "(Exalt 7 overtime: will take longer)", only after a finite
  duration. Being in Exalt 7 past its time limit is rare, and Exalt 7 is a speedrun with no time to read tooltips.
- **Exalt 3 needs no fix**: late-game ascension rewards grow linearly with ascension time and its penalty only changes
  at an ascension, so "stay in this ascension, then ascend once" is exact.
- Built and reverted for the simpler version: an "Abyss crafting locked" case
  (`challenge15Exponent` < 1e16, never shown to be reachable), and "unknown (income not read)" instead of ∞ (only when
  header elements are missing, which is already logged). Merging every short-but-untimed cost into one list was
  offered and not taken.
