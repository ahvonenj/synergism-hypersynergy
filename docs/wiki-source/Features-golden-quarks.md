# Golden Quarks & shop preferences

Shop helpers allocate a chosen budget and remember which completed upgrades you want out of the way.

## On this page

- [Buy MAX in the GQ purchase dialog](#buy-max-in-the-gq-purchase-dialog)
- [GQ Distributor with saved upgrade ratios](#gq-distributor-with-saved-upgrade-ratios)
- [Balance total investments or split new spending](#balance-total-investments-or-split-new-spending)
- [Keep skipped upgrade shares unspent](#keep-skipped-upgrade-shares-unspent)
- [Remember hidden maxed GQ upgrades](#remember-hidden-maxed-gq-upgrades)
- [Remember hidden maxed Octeract upgrades](#remember-hidden-maxed-octeract-upgrades)

### Buy MAX in the GQ purchase dialog

Adds a shortcut for spending the available amount through the native purchase flow.

**Where:** Golden Quark upgrade purchase dialog

- The game still calculates purchasable levels, upgrade caps and final cost.

**Source:** [gq-distributor.md](https://github.com/Ferlieloi/synergism-hypersynergy/blob/master/docs/features/gq-distributor.md) · [hs-qol-buttons.ts](https://github.com/Ferlieloi/synergism-hypersynergy/blob/master/src/mod/class/hs-modules/hs-qol-buttons/hs-qol-buttons.ts)

### GQ Distributor with saved upgrade ratios

Splits Golden Quarks among visible, unlocked, unmaxed upgrades.

**Where:** Singularity → Shop → Distributor button

- The Distributor button above the upgrades opens the panel; a minimize button closes it, and the choice is remembered.
- Set a ratio for each upgrade; Match invested ratios derives weights from current investment and Reset zeros them.
- Ratios are remembered locally. Distribution goes through the game's purchase dialogs and reports skipped upgrades.

**Related settings:** [`enableGQDistributor`](Settings-Reference#enablegqdistributor), [`gqDistributorOpen`](Settings-Reference#gqdistributoropen), [`gqDistributorRatios`](Settings-Reference#gqdistributorratios)

**Source:** [gq-distributor.md](https://github.com/Ferlieloi/synergism-hypersynergy/blob/master/docs/features/gq-distributor.md) · [hs-qol-buttons.ts](https://github.com/Ferlieloi/synergism-hypersynergy/blob/master/src/mod/class/hs-modules/hs-qol-buttons/hs-qol-buttons.ts)

### Balance total investments or split new spending

Chooses whether ratios apply to final investments or only the current budget.

**Where:** GQ Distributor → Balance total investments

- Balance mode puts more into upgrades below their target ratio, without taking back previous purchases.
- With balance off, the current GQ budget is split directly by the configured ratios.

**Related settings:** [`gqDistributorBalanceInvestments`](Settings-Reference#gqdistributorbalanceinvestments)

**Source:** [gq-distributor.md](https://github.com/Ferlieloi/synergism-hypersynergy/blob/master/docs/features/gq-distributor.md) · [hs-qol-buttons.ts](https://github.com/Ferlieloi/synergism-hypersynergy/blob/master/src/mod/class/hs-modules/hs-qol-buttons/hs-qol-buttons.ts)

### Keep skipped upgrade shares unspent

Controls what happens to shares assigned to upgrades skipped before planning.

**Where:** GQ Distributor → Keep the share of skipped upgrades

- Keep share leaves that allocation unspent; switching it off redistributes it among the remaining candidates.
- A share too small to buy the next level is never spent. Status text explains the reason.

**Related settings:** [`gqDistributorKeepSkippedShare`](Settings-Reference#gqdistributorkeepskippedshare)

**Source:** [gq-distributor.md](https://github.com/Ferlieloi/synergism-hypersynergy/blob/master/docs/features/gq-distributor.md) · [hs-qol-buttons.ts](https://github.com/Ferlieloi/synergism-hypersynergy/blob/master/src/mod/class/hs-modules/hs-qol-buttons/hs-qol-buttons.ts)

### Remember hidden maxed GQ upgrades

Saves and restores your choice for the game's own hide-maxed toggle between sessions.

**Where:** Settings → QoL → Keep maxed GQ upgrades hidden; native shop toggle

- Using the game's own button synchronizes the remembered preference, and the mod reapplies it when revisiting the shop.

**Related settings:** [`hideMaxedGQUpgrades`](Settings-Reference#hidemaxedgqupgrades)

**Source:** [gq-distributor.md](https://github.com/Ferlieloi/synergism-hypersynergy/blob/master/docs/features/gq-distributor.md) · [hs-qol-buttons.ts](https://github.com/Ferlieloi/synergism-hypersynergy/blob/master/src/mod/class/hs-modules/hs-qol-buttons/hs-qol-buttons.ts)

### Remember hidden maxed Octeract upgrades

Saves and restores your choice for the game's own hide-maxed toggle between sessions.

**Where:** Settings → QoL → Keep maxed Oct upgrades hidden; native shop toggle

- The stored choice follows the game's own hide-maxed state and is restored on reload.

**Related settings:** [`hideMaxedOctUpgrades`](Settings-Reference#hidemaxedoctupgrades)

**Source:** [gq-distributor.md](https://github.com/Ferlieloi/synergism-hypersynergy/blob/master/docs/features/gq-distributor.md) · [hs-qol-buttons.ts](https://github.com/Ferlieloi/synergism-hypersynergy/blob/master/src/mod/class/hs-modules/hs-qol-buttons/hs-qol-buttons.ts)
