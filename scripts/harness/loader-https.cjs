// The browser loader on the real game page (pseudo-corp.github.io/SynergismOfficial), with synergism.cc blocked:
// the userscript's body runs at document-start as Tampermonkey runs it, downloads patcher.js, patches the bundle and
// loads the mod. Reports the patch report, the loader's error if any, and whether the mod's "loaded" notification showed.
// Usage: node scripts/harness/loader-https.cjs
// Env: PATCHER=local (default: the repo's patcher.js answers the jsDelivr request) or live (the one on jsDelivr),
//      REPO=<GitHub owner the loader reads from> (default Ferlieloi, the userscript's default)
// An https page can't reach http://127.0.0.1 (Chrome's local network protection), hence the jsDelivr URL answered
// through Fetch interception rather than a local server.
const fs = require('node:fs')
const { paths, outDir } = require('./lib/env.cjs')
const { launchChrome } = require('./lib/chrome.cjs')
const { connectCdp, sleep } = require('./lib/cdp.cjs')

const PORT = Number(process.env.PORT ?? 9352)
const usePatcher = process.env.PATCHER || 'local'
const owner = process.env.REPO || 'Ferlieloi'
const patcherUrl = `https://cdn.jsdelivr.net/gh/${owner}/synergism-hypersynergy@master/synergism_modloader/lib/patcher.js`

const loader = `(() => {
    if (window.HS_LOADER_INITIALIZED) return;
    window.__HS_REPO = ${JSON.stringify(owner)}; window.__HS_VERSION = 'master';
    try {
        const xhr = new XMLHttpRequest(); xhr.open('GET', ${JSON.stringify(patcherUrl)} + '?t=' + Date.now(), false); xhr.send();
        if (xhr.status !== 200) throw new Error('HTTP ' + xhr.status);
        const m = { exports: {} };
        const shared = new Function('module', 'exports', xhr.responseText + '\\nreturn module.exports;')(m, m.exports);
        shared.startBrowserLoader({ dev: false });
    } catch (e) { console.error('[TEST] loader failed', e); }
})();`

;(async () => {
    const profile = outDir('profiles', 'loader-' + usePatcher)
    fs.rmSync(profile, { recursive: true, force: true })
    const chrome = await launchChrome({ port: PORT, profile, width: 1400, height: 900 })
    try {
        const cdp = await connectCdp(PORT)
        const requests = []
        cdp.on('Network.requestWillBeSent', p => requests.push(p.request.url))
        // Works for the loader's synchronous XHR too
        cdp.on('Fetch.requestPaused', ({ requestId }) => cdp.send('Fetch.fulfillRequest', {
            requestId, responseCode: 200,
            responseHeaders: [{ name: 'Content-Type', value: 'application/javascript' }, { name: 'Access-Control-Allow-Origin', value: '*' }],
            body: fs.readFileSync(paths.patcher).toString('base64'),
        }))
        await cdp.send('Network.enable')
        if (usePatcher === 'local') await cdp.send('Fetch.enable', { patterns: [{ urlPattern: '*synergism_modloader/lib/patcher.js*' }] })
        await cdp.send('Page.addScriptToEvaluateOnNewDocument', { source: loader })
        await cdp.navigate('https://pseudo-corp.github.io/SynergismOfficial/')

        let state
        for (let i = 0; i < 120; i++) {
            await sleep(1000)
            state = await cdp.evaluate(`(() => {
                const c = document.getElementById('confirm');
                if (c && /pseudo/i.test(c.textContent) && document.getElementById('confirmationBox')?.style.display !== 'none')
                    document.getElementById('ok_confirm')?.click();
                const off = document.getElementById('exitOffline'); if (off && off.offsetParent) off.click();
                return {
                    loaderError: window.__HS_LOADER_ERROR ?? null,
                    report: window.__HS_PATCH_REPORT ?? null,
                    stage: typeof window.__HS_synergismStage,
                    loaded: [...document.querySelectorAll('*')].some(e => e.childElementCount === 0 && /Hypersynergism v\\S+ loaded/.test(e.textContent))
                };
            })()`).catch(() => null)
            if (state?.loaded || state?.loaderError) break
        }
        const report = state?.report || {}
        console.log(JSON.stringify({
            patcher: usePatcher,
            loaderError: state?.loaderError,
            modLoadedNotification: state?.loaded,
            patches: Object.keys(report).length,
            failedPatches: Object.entries(report).filter(([, ok]) => !ok).map(([n]) => n),
            stageGlobal: state?.stage,
            bundleRequests: requests.filter(u => /out\.js/.test(u)),
            synergismCcRequests: requests.filter(u => /synergism\.cc/.test(u)).length,
        }, null, 2))
        console.log('--- HS log lines ---')
        for (const l of cdp.logs.filter(l => /HS|Hypersynergism|TEST|EXCEPTION/.test(l)).slice(0, 40)) console.log(l.slice(0, 220))
        cdp.close()
    } finally {
        chrome.kill()
    }
    process.exit(0)
})().catch(e => { console.error(e.stack || e); process.exit(1) })
