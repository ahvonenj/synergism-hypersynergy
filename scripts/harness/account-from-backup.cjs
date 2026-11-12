// Builds the answers to synergism.cc's 3 account requests from an HS backup's heater data (its PseudoCoin levels and
// quark bonus), for a run on another player's backup: local/account/ holds the developer's own account.
// Usage: node scripts/harness/account-from-backup.cjs <backup.json> [name]
// Writes local/harness-out/account/<name> (default "backup"); point a run at it with HS_ACCOUNT_DIR=<that folder>.
const fs = require('node:fs')
const path = require('node:path')
const { paths, outDir } = require('./lib/env.cjs')

// PseudoCoin upgrade ids (the shop's /stripe/upgrades catalogue); the game keys the levels by internal name
const UPGRADE_IDS = {
    INSTANT_UNLOCK_1: 1, INSTANT_UNLOCK_2: 2, CUBE_BUFF: 3, AMBROSIA_LUCK_BUFF: 4, AMBROSIA_GENERATION_BUFF: 5,
    GOLDEN_QUARK_BUFF: 8, FREE_UPGRADE_PROMOCODE_BUFF: 9, CORRUPTION_LOADOUT_SLOT_QOL: 10, AMBROSIA_LOADOUT_SLOT_QOL: 11,
    AUTO_POTION_FREE_POTIONS_QOL: 12, OFFLINE_TIMER_CAP_BUFF: 13, ADD_CODE_CAP_BUFF: 15, BASE_OFFERING_BUFF: 17,
    BASE_OBTAINIUM_BUFF: 18, RED_LUCK_BUFF: 19, RED_GENERATION_BUFF: 20, PURPLE_LUCK_BUFF: 21, PURPLE_HONEY_BUFF: 22,
    PURPLE_REACTOR_CAPACITY_BUFF: 23,
}

const [backupPath, name = 'backup'] = process.argv.slice(2)
if (!backupPath) { console.error('usage: node scripts/harness/account-from-backup.cjs <backup.json> [name]'); process.exit(1) }
const heater = JSON.parse(fs.readFileSync(backupPath, 'utf8')).diagnostics?.heater
const levels = heater?.pseudoCoinUpgrades?.pseudoCoinUpgradeLevels
if (!levels || !heater.me_data) { console.error('no PseudoCoin levels or quark bonus in this backup (made before 59f71ca3?)'); process.exit(1) }

// The catalogue only feeds the shop's display: the developer's copy when there is one, else empty
const ownCatalogue = path.join(paths.repo, 'local', 'account', 'stripe-upgrades.json')
const upgrades = fs.existsSync(ownCatalogue) ? JSON.parse(fs.readFileSync(ownCatalogue, 'utf8')).upgrades : []
const unknown = Object.keys(levels).filter(n => !(n in UPGRADE_IDS))
const playerUpgrades = Object.entries(levels)
    .filter(([n, level]) => n in UPGRADE_IDS && level > 0)
    .map(([internalName, level]) => ({ upgradeId: UPGRADE_IDS[internalName], level, internalName }))
const me = {
    accountType: 'discord',
    bonus: heater.me_data.bonus,
    globalBonus: heater.me_data.globalBonus,
    member: { user: { id: '0', username: 'harness' }, nick: 'harness', roles: [], premium_since: null },
    subscription: null,
    linkedAccounts: ['discord'],
}

const dir = outDir('account', name)
fs.writeFileSync(path.join(dir, 'stripe-upgrades.json'), JSON.stringify({ upgrades, playerUpgrades }))
fs.writeFileSync(path.join(dir, 'quark-bonus.json'), JSON.stringify({ bonus: heater.me_data.globalBonus }))
fs.writeFileSync(path.join(dir, 'users-me.json'), JSON.stringify(me))
console.log('PseudoCoin levels: ' + playerUpgrades.map(u => `${u.internalName} ${u.level}`).join(', '))
console.log(`quark bonus: global ${heater.me_data.globalBonus}, personal ${heater.me_data.bonus?.quark}`)
if (unknown.length) console.log('WARNING, upgrades without a known id (left out): ' + unknown.join(', '))
console.log(`HS_ACCOUNT_DIR=${path.relative(paths.repo, dir).replace(/\\/g, '/')}`)
