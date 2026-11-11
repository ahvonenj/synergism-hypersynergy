// After a game update: the top-level keys of vanilla's Player interface against the mod's GameDataFields.
// Then refresh the list, date and commit in the comment above GameDataFields (hs-player-savedata.ts).
// Usage: node scripts/harness/gds-player-keys.cjs
const fs = require('node:fs')
const path = require('node:path')
const { paths, mustExist } = require('./lib/env.cjs')
const ts = require(path.join(paths.repo, 'node_modules', 'typescript'))

function keys(file, name) {
    const src = ts.createSourceFile(file, fs.readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true)
    let out = null
    src.forEachChild(n => {
        if (ts.isInterfaceDeclaration(n) && n.name.text === name) out = new Set(n.members.filter(m => m.name).map(m => m.name.getText(src).replace(/['"]/g, '')))
    })
    if (!out) throw new Error(`interface ${name} not found in ${file}`)
    return out
}

const vanilla = keys(mustExist(path.join(paths.gameDir, 'src/types/Synergism.ts'), 'run node scripts/tools/update-game.cjs'), 'Player')
const mod = keys(path.join(paths.repo, 'src/mod/types/data-types/hs-player-savedata.ts'), 'GameDataFields')
const missing = [...vanilla].filter(k => !mod.has(k))
const extra = [...mod].filter(k => !vanilla.has(k))

console.log(`vanilla Player: ${vanilla.size} keys, GameData: ${mod.size} keys`)
console.log(`\nIn vanilla, not in GameData (${missing.length}):\n  ${missing.join('\n  ') || '-'}`)
console.log(`\nIn GameData, not in vanilla (${extra.length}, gone from the game?):\n  ${extra.join('\n  ') || '-'}`)
