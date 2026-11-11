// Runs autosing-run.cjs once per singularity target, one after the other: heat at that target (HEAT=1), then
// SINGS timed singularities (default 10), ambrosia switches on. Prints each target's figures from modal.txt.
// Usage: node scripts/harness/autosing-sweep.cjs <backup.json> <target>... (275b = a second run of 275, tag s275b)
// Env: SINGS, MINUTES (default 10), and anything autosing-run.cjs reads (STRATEGIES, SETTINGS merged in...)
const { spawnSync } = require('node:child_process')
const fs = require('node:fs')
const path = require('node:path')
const { outDir } = require('./lib/env.cjs')

const [backup, ...targets] = process.argv.slice(2)
if (!backup || !targets.length) { console.error('usage: node scripts/harness/autosing-sweep.cjs <backup.json> <target>...'); process.exit(1) }

for (const target of targets) {
    const n = Number.parseInt(target, 10)
    const tag = 's' + target
    const settings = { ...JSON.parse(process.env.SETTINGS || '{}'), singularityNumber: n, autosingNoAmbrosiaSwitch: false }
    const run = spawnSync(process.execPath, [path.join(__dirname, 'autosing-run.cjs'), backup, process.env.SINGS ?? '10', process.env.MINUTES ?? '10'], {
        env: { ...process.env, TAG: tag, HEAT: '1', DEBUG: '0', SETTINGS: JSON.stringify(settings) },
        encoding: 'utf8',
    })
    const dir = outDir('autosing', tag)
    fs.writeFileSync(path.join(dir, 'stdout.txt'), run.stdout + run.stderr)
    const read = file => { try { return fs.readFileSync(path.join(dir, file), 'utf8') } catch { return '' } }
    const figures = read('modal.txt').split('\n').filter(l => /^(hs-avg-all|hs-gquarks-rate-val-hr|hs-quarks-rate-val-hr|hs-c15-top|hs-completed-sing-amount):/.test(l))
    const problems = read('console.log').split('\n').filter(l => /stopped by itself|time limit|STALLED|ERROR|switches are off/.test(l)).map(l => l.slice(0, 120))
    console.log(`== S${target} ${figures.join(' ')} ${problems.join(' ')}`)
}
