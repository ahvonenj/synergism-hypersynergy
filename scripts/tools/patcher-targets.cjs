// After a game update: runs patcher.js on a game bundle and prints each patch's log line with, for every function or
// variable it names, the start of that definition in the unpatched bundle, to check each patch found what it was meant
// for (docs/game/updating.md, step 2). The browser bundle is local/game/out.js (node scripts/tools/update-game.cjs);
// the Steam one: docs/features/loaders.md, "Checking the Steam bundle".
// Usage: node scripts/tools/patcher-targets.cjs <bundle> [steam]
const fs = require('node:fs')
const path = require('node:path')
const { patchBundle } = require(path.join(__dirname, '..', '..', 'synergism_modloader', 'lib', 'patcher.js'))

const [file, mode] = process.argv.slice(2)
if (!file) {
    console.error('Usage: node scripts/tools/patcher-targets.cjs <bundle> [steam]')
    process.exit(1)
}
const code = fs.readFileSync(file, 'utf8')
const steam = mode === 'steam'

const definition = (name) => {
    const n = name.replace(/\$/g, '\\$')
    const m = new RegExp(`(?:function\\s+${n}\\s*\\(|(?:^|[,;{}\\s])${n}\\s*=(?![=>]))`).exec(code)
    return m ? code.slice(m.index, m.index + 200).replace(/\s+/g, ' ') : 'NOT FOUND'
}

const lines = []
const out = patchBundle(code, {
    steam,
    log: (...a) => lines.push(a.join(' ')),
    warn: (...a) => lines.push('WARNING ' + a.join(' '))
})
console.log(`=== ${file} steam=${steam} size=${code.length} added=${out.length - code.length}`)
for (const line of lines) {
    console.log(line.slice(0, 200))
    for (const [, name] of line.matchAll(/\b(?:fn|save|load|unlocks|render|init|update)=([\w$]+)/g)) {
        console.log(`    ${name}: ${definition(name)}`)
    }
}
console.log('ambiguous anchors:', /__HS_PATCH_AMBIGUOUS\s*=\s*\[[^\]]+\]/.test(out))
