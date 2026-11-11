// Paths and programs shared by the harnesses. Everything they write goes in local/harness-out/ (git-ignored).
const fs = require('node:fs')
const path = require('node:path')

const REPO = path.resolve(__dirname, '../../..')
const LOCAL = path.join(REPO, 'local')

const paths = {
    repo: REPO,
    // Created by scripts/tools/update-game.cjs
    gameDir: process.env.HS_GAME_DIR || path.join(LOCAL, 'game', 'SynergismOfficial-master'),
    gameBundle: process.env.HS_GAME_BUNDLE || path.join(LOCAL, 'game', 'out.js'),
    modBuild: path.join(REPO, 'build', 'hypersynergism.js'),
    patcher: path.join(REPO, 'synergism_modloader', 'lib', 'patcher.js'),
    // Optional: the developer's own answers to synergism.cc's account requests (see README)
    accountDir: process.env.HS_ACCOUNT_DIR || path.join(LOCAL, 'account'),
}

// A folder under local/harness-out/, created on demand
function outDir(...parts) {
    const dir = path.join(LOCAL, 'harness-out', ...parts)
    fs.mkdirSync(dir, { recursive: true })
    return dir
}

function chromePath() {
    if (process.env.CHROME_PATH) return process.env.CHROME_PATH
    const candidates = {
        win32: ['C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe'],
        darwin: ['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'],
        linux: ['/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser'],
    }[process.platform] ?? []
    const found = candidates.find(f => fs.existsSync(f))
    if (!found) throw new Error('Chrome not found: set CHROME_PATH')
    return found
}

function mustExist(file, hint) {
    if (!fs.existsSync(file)) throw new Error(`${file} not found: ${hint}`)
    return file
}

module.exports = { paths, outDir, chromePath, mustExist }
