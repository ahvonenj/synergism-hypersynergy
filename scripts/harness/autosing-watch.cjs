// Prints a running autosing-run's key lines every 2 s and exits when the run ends.
// It reads the log in one go each time and never keeps it open (a `tail -f` locks it on Windows).
// Usage: node scripts/harness/autosing-watch.cjs <tag>
const fs = require('node:fs')
const path = require('node:path')
const { outDir } = require('./lib/env.cjs')

const tag = process.argv[2]
if (!tag) { console.error('usage: node scripts/harness/autosing-watch.cjs <tag>'); process.exit(1) }
const file = path.join(outDir('autosing', tag), 'console.log')
const KEY = / ## (branches|heat done|loadouts|synced|heat singularity|autosing stopped|time limit|STALLED|[0-9]+ singularities|ERROR)|Error during|Heater calculation failed|Quick Import failed/

let seen = 0
const timer = setInterval(() => {
    if (!fs.existsSync(file)) return
    const lines = fs.readFileSync(file, 'utf8').split('\n')
    for (const line of lines.slice(seen, -1)) if (KEY.test(line)) console.log(line)
    seen = Math.max(seen, lines.length - 1)
    if (lines.some(l => l.includes('## intercepted:'))) { clearInterval(timer) }
}, 2000)
