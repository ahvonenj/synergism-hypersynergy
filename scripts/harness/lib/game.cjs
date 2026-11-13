// The real game served from the local clone, with the patched bundle and the mod's dev build,
// plus the steps every in-game harness needs: load, import a save, restore the mod's data, inject the mod.
const fs = require('node:fs')
const http = require('node:http')
const path = require('node:path')
const { paths, mustExist } = require('./env.cjs')
const { sleep } = require('./cdp.cjs')

// The live player object, exposed by the patcher under a Symbol key
const PLAYER = 'window[window.symp]'

const TYPES = {
    '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png',
    '.svg': 'image/svg+xml', '.gif': 'image/gif', '.ico': 'image/x-icon', '.woff2': 'font/woff2', '.ttf': 'font/ttf',
    '.webp': 'image/webp', '.mp3': 'audio/mpeg',
}

// patch: false serves the game's bundle as it is (an unpatched player, like a bookmarklet one)
function startGameServer({ port, patch = true }) {
    mustExist(paths.gameDir, 'run node scripts/tools/update-game.cjs')
    const original = fs.readFileSync(mustExist(paths.gameBundle, 'run node scripts/tools/update-game.cjs'), 'utf8')
    const bundle = patch
        ? require(paths.patcher).patchBundle(original, { log() { }, warn: (...a) => console.log('PATCHER WARN', ...a) })
        : original
    const server = http.createServer((req, res) => {
        const url = decodeURIComponent(req.url.split('?')[0])
        const name = url === '/' ? '/index.html' : url
        let body
        try {
            if (url === '/dist/out.js') body = bundle
            else if (url === '/mod.js') body = fs.readFileSync(mustExist(paths.modBuild, 'run npm run build'))
            else body = fs.readFileSync(path.join(paths.gameDir, name))
        } catch { res.writeHead(404); return res.end() }
        // A wrong type matters: the root served as octet-stream makes Chrome download it
        res.writeHead(200, { 'Content-Type': TYPES[path.extname(name)] || 'application/octet-stream' })
        res.end(body)
    }).listen(port)
    return { origin: `http://127.0.0.1:${port}`, close: () => server.close() }
}

// Every request to synergism.cc stops in Chrome. The 3 account requests are answered from paths.accountDir when its
// files exist (the game then has the real PseudoCoin levels and quark bonus), every other one fails.
// Returns the count of intercepted requests by method and URL.
async function interceptGameServer(cdp, origin) {
    const replies = [
        [/\/stripe\/upgrades/, 'stripe-upgrades.json'],
        [/\/api\/v1\/quark-bonus/, 'quark-bonus.json'],
        [/\/api\/v1\/users\/me/, 'users-me.json'],
    ].map(([re, file]) => [re, path.join(paths.accountDir, file)]).filter(([, file]) => fs.existsSync(file))
    const counts = {}
    const cors = [
        { name: 'Access-Control-Allow-Origin', value: origin }, { name: 'Access-Control-Allow-Credentials', value: 'true' },
        { name: 'Access-Control-Allow-Headers', value: '*' }, { name: 'Access-Control-Allow-Methods', value: 'GET, POST, OPTIONS' },
    ]
    cdp.on('Fetch.requestPaused', ({ requestId, request }) => {
        const key = request.method + ' ' + request.url.replace(/\?.*/, '')
        counts[key] = (counts[key] || 0) + 1
        const hit = replies.find(([re]) => re.test(request.url))
        if (request.method === 'OPTIONS') cdp.send('Fetch.fulfillRequest', { requestId, responseCode: 204, responseHeaders: cors })
        else if (hit && request.method === 'GET') cdp.send('Fetch.fulfillRequest', { requestId, responseCode: 200, responseHeaders: [...cors, { name: 'Content-Type', value: 'application/json' }], body: fs.readFileSync(hit[1]).toString('base64') })
        else cdp.send('Fetch.failRequest', { requestId, errorReason: 'NameNotResolved' })
    })
    await cdp.send('Fetch.enable', { patterns: [{ urlPattern: '*synergism.cc*', requestStage: 'Request' }] })
    return { counts, answered: replies.length }
}

// Presses OK on the queued dialog shown, if any. Returns what it did.
const answerDialog = cdp => cdp.evaluate(`(() => { const box = document.getElementById('confirmationBox'); if (!box || getComputedStyle(box).display === 'none') return '';
    const text = box.innerText.slice(0, 120); for (const id of ['ok_confirm', 'ok_alert', 'ok_prompt']) { const b = document.getElementById(id); if (b && b.offsetParent) { b.click(); return id + ': ' + text; } } return 'open: ' + text; })()`).catch(() => '')

// Waits for the game to finish loading. With synergism.cc blocked the game asks a PseudoCoin Confirm that holds the
// loading screen, and a save imported with its offline time runs its offline progress first: both are answered here.
// until: an extra condition (an expression). Throws when the game never gets there: a wait that gives up silently
// makes a test "pass" on a game that never loaded.
async function waitGameReady(cdp, { until = 'true', ms = 90000, onDialog = () => { } } = {}) {
    const end = Date.now() + ms
    while (Date.now() < end) {
        const answered = await answerDialog(cdp)
        if (answered) onDialog(answered)
        await cdp.evaluate(`document.getElementById('exitOffline')?.offsetParent && document.getElementById('exitOffline').click()`).catch(() => { })
        if (await cdp.evaluate(`!document.body.classList.contains('loading') && (${until})`).catch(() => false)) return
        await sleep(300)
    }
    throw new Error('the game never finished loading' + (until !== 'true' ? ` (${until})` : ''))
}

// A save file the game imports: an HS backup (.json, base64 save in `save`) or a game export (.txt, base64)
function readSaveFile(file) {
    const text = fs.readFileSync(file, 'utf8').trim()
    return text.startsWith('{') ? JSON.parse(text) : { save: text }
}

// The save as an object. A heater export carries the mod's hs_data inside: removed.
function decodeSave(base64) {
    const save = JSON.parse(Buffer.from(base64, 'base64').toString('utf8'))
    delete save.hs_data
    return save
}

// The save as if just saved: the game has no offline time to run (over 3 minutes on a save a week old).
// Only the number changes, in the text: the rest of the save stays byte for byte. A save in another format is left as is.
function withoutOfflineTime(base64) {
    const text = Buffer.from(base64, 'base64').toString('latin1')
    return Buffer.from(text.replace(/"offlinetick":\s*[\d.e+]+/, `"offlinetick":${Date.now()}`), 'latin1').toString('base64')
}

// Imports through Settings > Load from file, as a player does. offline: true keeps the game's offline progress.
async function importSave(cdp, base64, dir, { offline = false } = {}) {
    const file = path.join(dir, 'save.txt')
    fs.writeFileSync(file, offline ? base64 : withoutOfflineTime(base64))
    await cdp.setFiles('#importfile', [file])
}

// Writes an HS backup's modData (settings, strategies, slots...) and gamePrefs into localStorage, before the mod loads.
// settings: { key: value } overrides; strategies: a hs-strategies file's text
// debugLogs: debug lines shown, and autosing's full log (else a run logs only warnings and errors)
async function restoreModData(cdp, backup, { settings: overrides = {}, debugLogs, strategies } = {}) {
    const modData = { ...backup.modData }
    if (modData['hs-settings']) {
        // Some versions stored the settings JSON stringified twice
        let settings = JSON.parse(modData['hs-settings'])
        const twice = typeof settings === 'string'
        if (twice) settings = JSON.parse(settings)
        if (debugLogs !== undefined) {
            // A backup older than a setting doesn't hold it: the mod reads the state alone
            for (const k of ['showDebugLogs', 'autosingFullLog']) settings[k] = { ...(settings[k] ?? {}), settingValue: debugLogs, enabled: debugLogs }
        }
        for (const [k, v] of Object.entries(overrides)) {
            if (!settings[k]) continue
            settings[k].settingValue = v
            if ('calculatedSettingValue' in settings[k]) settings[k].calculatedSettingValue = v
            if (typeof v === 'boolean') settings[k].enabled = v
        }
        modData['hs-settings'] = twice ? JSON.stringify(JSON.stringify(settings)) : JSON.stringify(settings)
    }
    if (strategies) modData['hs-strategies'] = strategies
    const data = { ...backup.gamePrefs, ...modData }
    await cdp.evaluate(`(() => { const d = ${JSON.stringify(data)}; for (const [k, v] of Object.entries(d)) localStorage.setItem(k, v); })()`)
}

// Injects build/hypersynergism.js as the loader would, and waits for the mod panel's settings
async function injectMod(cdp) {
    await cdp.evaluate(`new Promise(r => { window.HS_LOADER_INITIALIZED = true; const s = document.createElement('script'); s.src = '/mod.js'; s.onload = r; document.head.appendChild(s); })`)
    await cdp.waitFor(`!!document.querySelector('[id^="hs-setting-"]')`, 60000)
}

module.exports = { PLAYER, startGameServer, interceptGameServer, answerDialog, waitGameReady, readSaveFile, decodeSave, importSave, restoreModData, injectMod }
