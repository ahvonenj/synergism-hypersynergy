// Updates the local copies of the game in local/game/ (git-ignored): the official source clone (cloned on the first
// run), and the live browser bundle in out.js (the replaced one is kept as out.prev.js), then runs patcher.js on it to
// see whether a game update broke a patch. The clone is read-only reference: never edit it.
// Usage: node scripts/tools/update-game.cjs
const { execFileSync } = require('node:child_process')
const crypto = require('node:crypto')
const fs = require('node:fs')
const path = require('node:path')

const REPO = path.resolve(__dirname, '../..')
const GAME_DIR = path.join(REPO, 'local', 'game')
const CLONE_DIR = path.join(GAME_DIR, 'SynergismOfficial-master')
const CLONE_URL = 'https://github.com/Pseudo-Corp/SynergismOfficial.git'
const BUNDLE_URL = 'https://synergism.cc/dist/out.js'
const BUNDLE_PATH = path.join(GAME_DIR, 'out.js')
const PREV_BUNDLE_PATH = path.join(GAME_DIR, 'out.prev.js')
const PATCHER_PATH = path.join(REPO, 'synergism_modloader', 'lib', 'patcher.js')

const git = (...args) => execFileSync('git', ['-C', CLONE_DIR, ...args], { encoding: 'utf8' }).trim()
const sha256 = text => crypto.createHash('sha256').update(text).digest('hex')
const kb = text => `${(Buffer.byteLength(text) / 1024).toFixed(0)} KB`

function updateSource() {
    console.log('── Game source')
    if (!fs.existsSync(CLONE_DIR)) {
        // Partial clone: old file versions are downloaded only when a history search reads them
        fs.mkdirSync(GAME_DIR, { recursive: true })
        execFileSync('git', ['clone', '--filter=blob:none', '--branch', 'master', '--config', 'core.autocrlf=false', CLONE_URL, CLONE_DIR], { stdio: 'inherit' })
        console.log(`Cloned at ${git('log', '-1', '--format=%h %ci %s')}`)
        return
    }
    // The clone is read-only: a local edit would make the pull fail or be mixed into the next diff
    const dirty = git('status', '--porcelain')
    if (dirty) {
        console.log(`Local changes in the clone, pull skipped (undo them with: git -C "${CLONE_DIR}" checkout .):\n${dirty}`)
        return
    }
    const before = git('rev-parse', 'HEAD')
    execFileSync('git', ['-C', CLONE_DIR, 'pull', '--ff-only', '--quiet'], { stdio: 'inherit' })
    const after = git('rev-parse', 'HEAD')
    if (before === after) {
        console.log(`Up to date at ${git('log', '-1', '--format=%h %ci %s')}`)
        return
    }
    console.log(`${before.slice(0, 8)} → ${after.slice(0, 8)}:\n${git('log', '--format=  %h %ci %s', `${before}..${after}`)}`)
    console.log(`Changed in src/: ${git('diff', '--shortstat', before, after, '--', 'src/') || 'nothing'}`)
    console.log(`Full diff: git -C "${CLONE_DIR}" diff ${before.slice(0, 8)} HEAD -- src/`)
}

async function updateBundle() {
    console.log('── Game bundle')
    const res = await fetch(BUNDLE_URL, { cache: 'no-store' })
    if (!res.ok) throw new Error(`${BUNDLE_URL} returned HTTP ${res.status}`)
    const code = await res.text()
    const old = fs.existsSync(BUNDLE_PATH) ? fs.readFileSync(BUNDLE_PATH, 'utf8') : null
    if (old !== null && sha256(old) === sha256(code)) {
        console.log(`out.js unchanged (${kb(code)})`)
        return code
    }
    if (old !== null) fs.renameSync(BUNDLE_PATH, PREV_BUNDLE_PATH)
    fs.writeFileSync(BUNDLE_PATH, code)
    console.log(old === null ? `out.js written (${kb(code)})` : `out.js updated: ${kb(old)} → ${kb(code)}, the old one is out.prev.js`)
    return code
}

function checkPatches(code) {
    console.log('── Patcher on the new bundle')
    const { patchBundle } = require(PATCHER_PATH)
    const lines = []
    patchBundle(code, { log: (...a) => lines.push(a.join(' ')), warn: (...a) => lines.push('WARNING ' + a.join(' ')) })
    // Only the warnings and the summary: the other lines say what each patch did
    for (const line of lines) {
        if (line.startsWith('WARNING ') || line.startsWith('Bundle patching complete')) console.log(line)
    }
}

async function main() {
    updateSource()
    const code = await updateBundle()
    checkPatches(code)
}

main().catch(err => {
    console.error(err.message || err)
    process.exitCode = 1
})
