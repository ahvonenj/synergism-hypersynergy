// Loads the real game (patched) headless, optionally imports a save, injects the mod's dev build, and reports:
// patches that didn't apply, page exceptions, every request that tried to leave localhost, a screenshot.
// Also the starting point for a one-off test: copy it into local/ and add steps after "mod loaded".
// Usage: node scripts/harness/game-smoke.cjs [save.json|save.txt]
// Env: PATCH=0 serves the unpatched bundle, MOD=0 skips the mod, WAIT=<ms> after the mod loads (default 15000),
//      OFFLINE=1 keeps the save's offline progress, TAG=<name> (output folder), PORT/HTTP_PORT
const path = require('node:path')
const { outDir } = require('./lib/env.cjs')
const { launchChrome } = require('./lib/chrome.cjs')
const { connectCdp, sleep } = require('./lib/cdp.cjs')
const game = require('./lib/game.cjs')

const PORT = Number(process.env.PORT ?? 9351), HTTP = Number(process.env.HTTP_PORT ?? 8771)
const tag = process.env.TAG || 'smoke'
const out = outDir('smoke', tag)
const saveFile = process.argv[2]

;(async () => {
    const server = game.startGameServer({ port: HTTP, patch: process.env.PATCH !== '0' })
    const chrome = await launchChrome({ port: PORT, profile: outDir('profiles', 'smoke-' + tag), width: 1600, height: 1000, fresh: true })
    try {
        const cdp = await connectCdp(PORT)
        const requests = []
        cdp.on('Network.requestWillBeSent', p => requests.push(p.request.method + ' ' + p.request.url))
        await cdp.send('Network.enable')
        const intercepted = await game.interceptGameServer(cdp, server.origin)
        await cdp.navigate(server.origin + '/')
        await cdp.waitFor(`!!document.getElementById('importfile')`)
        const onDialog = d => console.log('dialog answered: ' + d)
        await game.waitGameReady(cdp, { onDialog })
        if (saveFile) {
            const backup = game.readSaveFile(saveFile)
            await game.importSave(cdp, backup.save, out, { offline: process.env.OFFLINE === '1' })
            await sleep(2000)
            await game.waitGameReady(cdp, { onDialog })
            console.log('save loaded: S' + await cdp.evaluate(`${game.PLAYER}?.singularityCount`))
        }
        if (process.env.MOD !== '0') {
            await game.injectMod(cdp)
            console.log('mod loaded')
            await sleep(Number(process.env.WAIT ?? 15000))
        }
        const report = await cdp.evaluate(`JSON.stringify(window.__HS_PATCH_REPORT ?? null)`)
        const failed = report && report !== 'null' ? Object.entries(JSON.parse(report)).filter(([, ok]) => !ok).map(([n]) => n) : null
        await cdp.screenshot(path.join(out, 'end.png'))
        console.log(JSON.stringify({
            patchReport: report === 'null' ? 'none (unpatched)' : `${Object.keys(JSON.parse(report)).length} patches`,
            failedPatches: failed,
            exceptions: cdp.logs.filter(l => l.startsWith('EXCEPTION')).slice(0, 10),
            accountRequestsAnswered: intercepted.answered,
            synergismCc: intercepted.counts,
            // Tried, never resolved
            githubApi: requests.filter(u => u.includes('api.github.com')),
            otherExternalRequests: requests.filter(u => !/ (http:\/\/127\.0\.0\.1|data:|blob:)|synergism\.cc|api\.github\.com/.test(u)),
            screenshot: path.join(out, 'end.png'),
        }, null, 2))
        cdp.close()
    } finally {
        chrome.kill()
        server.close()
    }
    process.exit(0)
})().catch(e => { console.error(e.stack || e); process.exit(1) })
