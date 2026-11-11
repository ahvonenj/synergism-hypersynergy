// harness-stubs: gds
// HSGameDataAPI's real formulas in node on a player's save, without the game: to check a report about a mod figure
// (ambrosia per hour, luck, speeds). Copy it and print what the report is about.
// Usage: node scripts/harness/node-run.mjs scripts/harness/node/gds-on-save.ts <backup.json|save.txt> ['{"path.in.save": value}']
// PseudoCoin levels and the quark bonus are in no save: without them bar speeds are 4-10x off. A backup from a build
// with 59f71ca3 or later carries them (diagnostics.heater), so does a heater export (hs_data). Check the player's
// Exalt first (diagnostics.heater.exalt): it changes many formulas. GDS formulas change between builds: for a player's
// report, run their build from a `git worktree add --detach`.
import { readFileSync } from 'fs'
import { HSGameDataAPI } from '@repo/class/hs-core/gds/hs-gamedata-api'

const [file, overrides] = process.argv.slice(2)
if (!file) { console.error('usage: ... gds-on-save.ts <backup.json|save.txt> [overrides]'); process.exit(1) }
const text = readFileSync(file, 'utf8').trim()
const backup = text.startsWith('{') ? JSON.parse(text) : { save: text }
const save = JSON.parse(Buffer.from(backup.save, 'base64').toString('utf8'))
// A heater export: the save with the mod's data inside
const hsData = backup.diagnostics?.heater ?? save.hs_data
delete save.hs_data
for (const [p, v] of Object.entries(overrides ? JSON.parse(overrides) : {})) {
    const keys = p.split('.'); let o: any = save
    while (keys.length > 1) o = o[keys.shift()!]
    o[keys[0]] = v
}

const api: any = new HSGameDataAPI({ moduleName: 'HSGameDataAPI', context: 'HSGameDataAPI' } as any)
if (hsData?.me_data) api._updateMeData(hsData.me_data)
const levels = hsData?.pseudoCoinUpgrades?.pseudoCoinUpgradeLevels
if (levels) api._updatePseudoData({ coins: 0, upgrades: [], playerUpgrades: Object.entries(levels).map(([internalName, level], upgradeId) => ({ upgradeId, internalName, level })) })
if (hsData?.bellStacks) api._updateEventData({ HAPPY_HOUR_BELL: { amount: hsData.bellStacks, ends: [], displayName: '' } })
api._updateGameData(save)

console.log(`S${save.singularityCount}, Exalt ${hsData?.exalt ?? '?'}, PseudoCoin/quark data: ${levels ? 'yes' : 'NO (bar speeds will be low)'}`)
const income = api.ambrosia.calculateAmbrosiaBarIncome()
if (income) console.log('per hour', { blue: income.blueAmbrosiaPerSecond * 3600, red: income.redAmbrosiaPerSecond * 3600, purple: income.purpleHoneyPerSecond * 3600 })
console.log('luck', api.luck.calculateLuck().luckTotal)
// What the mod showed the player, to compare with
if (hsData?.totalRedBarPointsS !== undefined) console.log('mod at export: totalRedBarPointsS', hsData.totalRedBarPointsS)
process.exit(0)
