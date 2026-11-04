// Headless Chrome for the harnesses.
// synergism.cc and api.github.com never resolve: the game's dev asked for less traffic, and GitHub's API
// allows 60 requests per hour per IP, shared with the developer's own browser.
const { spawn, execFileSync } = require('node:child_process')
const fs = require('node:fs')
const { chromePath } = require('./env.cjs')

const BLOCKED_HOSTS = '--host-resolver-rules=MAP synergism.cc ~NOTFOUND, MAP *.synergism.cc ~NOTFOUND, MAP api.github.com ~NOTFOUND'

async function launchChrome({ port, profile, width = 1600, height = 1000, args = [], fresh = false }) {
    // A leftover Chrome on the debug port would be driven instead of this one
    if (await fetch(`http://127.0.0.1:${port}/json`).then(() => true, () => false)) {
        throw new Error(`port ${port} already in use: a leftover Chrome? Stop it by its PID`)
    }
    // An old profile holds the last run's save: the game would run its offline progress at load, before any import
    if (fresh) {
        fs.rmSync(profile, { recursive: true, force: true })
        fs.mkdirSync(profile, { recursive: true })
    }
    const proc = spawn(chromePath(), [
        '--headless=new', '--disable-gpu', `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`,
        `--window-size=${width},${height}`, BLOCKED_HOSTS,
        // The game's timers run at full speed while nothing is visible
        '--disable-background-timer-throttling', '--disable-renderer-backgrounding', '--disable-backgrounding-occluded-windows',
        ...args, 'about:blank',
    ], { stdio: 'ignore', detached: process.platform !== 'win32' })
    // The whole tree: Chrome's child processes outlive a plain kill
    const kill = () => {
        try {
            if (process.platform === 'win32') execFileSync('taskkill', ['/PID', String(proc.pid), '/T', '/F'], { stdio: 'ignore' })
            else process.kill(-proc.pid, 'SIGKILL')
        } catch { }
    }
    return { pid: proc.pid, port, kill }
}

module.exports = { launchChrome, BLOCKED_HOSTS }
