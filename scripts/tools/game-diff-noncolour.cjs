// After a game update: the game source diff between two commits without the lines that only swap a colour (a name,
// hex or rgb() for a var(--…) or another colour), for updates that rework the colours. Needs the game source
// (node scripts/tools/update-game.cjs).
// Usage: node scripts/tools/game-diff-noncolour.cjs <old> <new> [pathspec...]
const { execFileSync } = require('node:child_process')
const path = require('node:path')

const CLONE = path.join(__dirname, '..', '..', 'local', 'game', 'SynergismOfficial-master')
const [from, to, ...specs] = process.argv.slice(2)
const out = execFileSync('git', ['-C', CLONE, 'diff', '-U0', from, to, '--', ...(specs.length ? specs : ['src'])], {
    encoding: 'utf8',
    maxBuffer: 1 << 28
})

const NAMES = 'green|red|white|black|gold|orange|purple|cyan|crimson|lime|limegreen|silver|yellow|grey|gray|turquoise|orchid|brown|pink|blue|aquamarine|cornflowerblue|lightgoldenrodyellow|plum|violet|magenta|maroon|navy|teal|indigo|tomato|salmon|coral|khaki|lightblue|lightgreen|darkgreen|darkred|transparent|lightgrey|lightgray|darkorange|darkorchid|mediumorchid|skyblue|deepskyblue|hotpink|royalblue|steelblue|springgreen|yellowgreen|greenyellow|chartreuse|firebrick|forestgreen|goldenrod|indianred|lavender|lawngreen|lemonchiffon|mediumpurple|mediumseagreen|mediumslateblue|mediumspringgreen|mediumturquoise|mediumvioletred|paleturquoise|peachpuff|seagreen|sienna|slateblue|tan|thistle|wheat'
const COLOUR = new RegExp(`var\\(--[\\w-]+\\)|#[0-9a-fA-F]{3,8}\\b|rgba?\\([^)]*\\)|\\b(?:${NAMES})\\b`, 'gi')
const norm = (s) => s.replace(COLOUR, 'C').replace(/["'`]/g, "'").replace(/\s+/g, ' ').trim()

let file = ''
let printed = ''
let minus = []
let plus = []
const flush = () => {
    const m = new Map()
    for (const l of minus) m.set(norm(l), (m.get(norm(l)) ?? 0) + 1)
    const keptPlus = []
    for (const l of plus) {
        const n = norm(l)
        if (m.get(n)) m.set(n, m.get(n) - 1)
        else keptPlus.push(l)
    }
    const keptMinus = minus.filter((l) => {
        const n = norm(l)
        if (m.get(n)) {
            m.set(n, m.get(n) - 1)
            return true
        }
        return false
    })
    if (keptMinus.length || keptPlus.length) {
        if (printed !== file) {
            console.log(`\n=== ${file}`)
            printed = file
        }
        for (const l of keptMinus) console.log(`- ${l.trim().slice(0, 170)}`)
        for (const l of keptPlus) console.log(`+ ${l.trim().slice(0, 170)}`)
    }
    minus = []
    plus = []
}
for (const line of out.split('\n')) {
    if (line.startsWith('diff --git')) {
        flush()
        file = line.split(' b/')[1]
    } else if (line.startsWith('@@')) {
        flush()
    } else if (line.startsWith('---') || line.startsWith('+++')) {
        continue
    } else if (line.startsWith('-')) {
        minus.push(line.slice(1))
    } else if (line.startsWith('+')) {
        plus.push(line.slice(1))
    }
}
flush()
