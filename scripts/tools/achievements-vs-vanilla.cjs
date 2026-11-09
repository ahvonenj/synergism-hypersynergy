// After a game update: the achievement ids and point values of the game's Achievements.ts against the mod's copy
// (AchievementId and ACHIEVEMENT_POINT_VALUES in hs-gamedata-api-achievement.ts). Needs the game source
// (node scripts/tools/update-game.cjs).
// Usage: node scripts/tools/achievements-vs-vanilla.cjs [--print]
//   --print writes the game's enum and point table in the mod's format, to paste over the mod's copy.
const fs = require('node:fs')
const path = require('node:path')

const root = path.resolve(__dirname, '../..')
const vanillaFile = path.join(root, 'local/game/SynergismOfficial-master/src/Achievements.ts')
const modFile = path.join(root, 'src/mod/class/hs-core/gds/hs-gamedata-api-achievement.ts')
if (!fs.existsSync(vanillaFile)) { console.error('no game source: run node scripts/tools/update-game.cjs'); process.exit(1) }

function enumOf(src, file) {
    const head = 'export enum AchievementId {'
    const start = src.indexOf(head)
    if (start < 0) throw new Error(`${file}: no AchievementId enum`)
    const body = src.slice(start + head.length, src.indexOf('\n}', start))
    const ids = {}
    for (const m of body.matchAll(/(\w+) = (\d+)/g)) ids[m[1]] = Number(m[2])
    const values = Object.values(ids)
    if (new Set(values).size !== values.length || Math.max(...values) !== values.length - 1) throw new Error(`${file}: ids are not 0..n-1`)
    return ids
}

// The game's point values, by id
const vanillaSrc = fs.readFileSync(vanillaFile, 'utf8')
const ids = enumOf(vanillaSrc, 'Achievements.ts')
const count = Object.keys(ids).length
const points = new Array(count)
for (const m of vanillaSrc.matchAll(/id:\s*AchievementId\.(\w+),\s*pointValue:\s*(\d+)/g)) {
    if (!(m[1] in ids)) throw new Error(`Achievements.ts: unknown id ${m[1]}`)
    if (points[ids[m[1]]] !== undefined) throw new Error(`Achievements.ts: ${m[1]} twice`)
    points[ids[m[1]]] = Number(m[2])
}
const missing = points.findIndex((p) => p === undefined)
if (missing !== -1) throw new Error(`Achievements.ts: no point value for id ${missing}, or the achievement shape changed: update this script`)

if (process.argv.includes('--print')) {
    const lines = ['export enum AchievementId {']
    const names = Object.entries(ids).sort((a, b) => a[1] - b[1])
    names.forEach(([name, id], i) => lines.push(`    ${name} = ${id}${i === names.length - 1 ? '' : ','}`))
    lines.push('}', '', 'const ACHIEVEMENT_POINT_VALUES: readonly number[] = [')
    for (let i = 0; i < count; i += 20) lines.push(`    /* ${String(i).padStart(3)} */ ${points.slice(i, i + 20).join(', ')},`)
    lines.push(']')
    process.stdout.write(lines.join('\n') + '\n')
    process.exit(0)
}

// The mod's copy
const modSrc = fs.readFileSync(modFile, 'utf8')
const modIds = enumOf(modSrc, 'hs-gamedata-api-achievement.ts')
const table = /const ACHIEVEMENT_POINT_VALUES[^=]*=\s*\[([\s\S]*?)\]/.exec(modSrc)
if (!table) throw new Error('hs-gamedata-api-achievement.ts: no ACHIEVEMENT_POINT_VALUES')
const modPoints = table[1].replace(/\/\*[\s\S]*?\*\//g, '').split(',').map((s) => s.trim()).filter(Boolean).map(Number)

const diffs = []
for (const [name, id] of Object.entries(ids)) {
    if (!(name in modIds)) diffs.push(`${name} (${id}): not in the mod`)
    else if (modIds[name] !== id) diffs.push(`${name}: id ${id} in the game, ${modIds[name]} in the mod`)
}
for (const name of Object.keys(modIds)) if (!(name in ids)) diffs.push(`${name} (${modIds[name]}): no longer in the game`)
if (modPoints.length !== count) diffs.push(`${count} point values in the game, ${modPoints.length} in the mod`)
for (let id = 0; id < Math.min(count, modPoints.length); id++) {
    if (modPoints[id] !== points[id]) diffs.push(`id ${id}: ${points[id]} points in the game, ${modPoints[id]} in the mod`)
}
const total = points.reduce((a, b) => a + b, 0)
if (diffs.length) {
    console.log(`${diffs.length} differences:\n${diffs.slice(0, 40).join('\n')}`)
    console.log('Refresh the mod\'s copy with --print, then check the rewards GDS reads by id.')
    process.exit(1)
}
console.log(`${count} achievements, ${total} points: the mod matches the game`)
