// Runs autosing headless on a player's HS backup: the real game (patched) + the mod's dev build.
// The backup's modData (settings, strategies, slots) goes into localStorage, its save is imported, the mod injected,
// autosing started, then the run is sampled every second until it has done N singularities.
// Usage: node scripts/harness/autosing-run.cjs <backup.json> [singularities=1] [maxMinutes=15]
// Env: TAG=<name> output folder (local/harness-out/autosing/<TAG>), DEBUG=0 mod debug logs off (they cost a little time),
//      SETTINGS='{"key":value}' setting overrides, STRATEGIES=<hs-strategies file>, SETTLE=<ms> after the mod loads,
//      STALL_MS=<ms> stop after that long without a singularity (default 90000),
//      HEAT=1 the heat routine below before the timed run, LOADOUTS=<heated.json of an earlier HEAT run>,
//      OFFLINE=1 keeps the save's offline progress
// Output: console.log (timestamped), samples.jsonl, modal.txt (the run panel's figures), timings.json (dev recorder), end.png
const fs = require('node:fs')
const path = require('node:path')
const { outDir } = require('./lib/env.cjs')
const { launchChrome } = require('./lib/chrome.cjs')
const { connectCdp, sleep } = require('./lib/cdp.cjs')
const game = require('./lib/game.cjs')

const PORT = Number(process.env.PORT ?? 9350), HTTP = Number(process.env.HTTP_PORT ?? 8770)
const backupPath = process.argv[2]
if (!backupPath) { console.error('usage: node scripts/harness/autosing-run.cjs <backup.json> [singularities] [maxMinutes]'); process.exit(1) }
const SINGS = Number(process.argv[3] ?? 1)
const MAX_MS = Number(process.argv[4] ?? 15) * 60000
const tag = process.env.TAG || 'run'
const out = outDir('autosing', tag)
const logFile = fs.createWriteStream(path.join(out, 'console.log'))
const sampleFile = fs.createWriteStream(path.join(out, 'samples.jsonl'))
const backup = game.readSaveFile(backupPath)
if (!backup.modData) { console.error('not an HS backup (no modData): export one from the mod panel'); process.exit(1) }

let t0 = Date.now()
const ts = () => ((Date.now() - t0) / 1000).toFixed(2).padStart(8)
const note = s => { const line = `${ts()} ## ${s}`; console.log(line); logFile.write(line + '\n') }
const P = game.PLAYER

;(async () => {
    const server = game.startGameServer({ port: HTTP })
    const chrome = await launchChrome({ port: PORT, profile: outDir('profiles', 'autosing-' + tag), fresh: true })
    fs.writeFileSync(path.join(out, 'pids.txt'), `chrome ${chrome.pid}\nnode ${process.pid}\n`)
    let intercepted = { counts: {} }
    try {
        const cdp = await connectCdp(PORT)
        const { evaluate, waitFor } = cdp
        cdp.on('log', line => logFile.write(`${ts()} ${line}\n`))
        intercepted = await game.interceptGameServer(cdp, server.origin)
        note(`account requests answered from files: ${intercepted.answered}/3`)
        // The heater's Import All goes through the clipboard
        await cdp.send('Browser.grantPermissions', { origin: server.origin, permissions: ['clipboardReadWrite', 'clipboardSanitizedWrite'] })
        await cdp.send('Emulation.setFocusEmulationEnabled', { enabled: true })
        await cdp.navigate(server.origin + '/')
        t0 = Date.now()
        await waitFor(`!!document.getElementById('importfile')`)

        const heated = process.env.LOADOUTS ? JSON.parse(fs.readFileSync(process.env.LOADOUTS, 'utf8')) : null
        await game.restoreModData(cdp, backup, {
            settings: { ...(heated?.settings ?? {}), ...JSON.parse(process.env.SETTINGS || '{}') },
            debugLogs: process.env.DEBUG !== '0',
            strategies: process.env.STRATEGIES ? fs.readFileSync(process.env.STRATEGIES, 'utf8') : undefined,
        })
        await sleep(2000)
        note('import save')
        await game.importSave(cdp, backup.save, out, { offline: process.env.OFFLINE === '1' })
        await game.waitGameReady(cdp, { until: `${P}?.singularityCount === ${backup.info.singularity}`, onDialog: d => note('dialog ' + d) })
        await sleep(3000)
        for (let i = 0; i < 10; i++) { const a = await game.answerDialog(cdp); if (!a) break; note('dialog ' + a); await sleep(300) }
        if (heated) {
            await evaluate(`(() => { const l = ${JSON.stringify(heated.blueberryLoadouts)}; const p = ${P}; for (const k of Object.keys(l)) p.blueberryLoadouts[k] = l[k]; })()`)
            note('heated loadouts written')
        }
        note('save loaded: ' + await evaluate(`JSON.stringify({ sing: ${P}.singularityCount, highest: ${P}.highestSingularityCount })`))

        note('inject mod')
        await game.injectMod(cdp)
        await waitFor(`!!document.getElementById('hs-setting-auto-sing-enabled')`, 60000)
        await sleep(Number(process.env.SETTLE ?? 15000))
        note('intercepted so far: ' + JSON.stringify(intercepted.counts))
        note('pcoin/quark: ' + await evaluate(`JSON.stringify({ pcoinLoaded: window.__HS_pcoinLevelsLoaded, quarkBonus: window.__HS_quarkBonus, failedPatches: Object.entries(window.__HS_PATCH_REPORT || {}).filter(([, v]) => !v).map(([k]) => k) })`).catch(e => String(e)))

        note('start autosing')
        await evaluate(`document.getElementById('hs-setting-auto-sing-enabled').click()`)
        if (process.env.HEAT === '1') await heatRoutine(cdp, out)

        // Sampling until N recorded singularities (the start one isn't counted) or the time limit
        const sample = `(() => { const p = ${P}; const box = document.getElementById('confirmationBox');
            let stage = ''; try { stage = window.__HS_synergismStage(0); } catch {}
            return { sing: p.singularityCount, asc: p.ascensionCount, stage, c15: p.challenge15Exponent, exalt: p.insideSingularityChallenge,
                chal: p.currentChallenge, cc: p.challengecompletions.slice(1, 16).join(','), corrNext: p.corruptions?.next, corrUsed: p.corruptions?.used,
                dialog: box && getComputedStyle(box).display !== 'none' ? box.innerText.slice(0, 80) : '', gq: Number(p.goldenQuarks),
                toggle: document.getElementById('hs-setting-auto-sing-enabled')?.className ?? '',
                done: Number(document.getElementById('hs-completed-sing-amount')?.textContent ?? 0),
                phase: document.getElementById('hs-phase-name-val')?.textContent?.trim() ?? '' }; })()`
        let lastDialog = '', dialogSince = 0, done = 0
        // A stop from before the timed run (the restart after heating) doesn't count
        const logsAtStart = cdp.logs.length
        const startAt = Date.now()
        const STALL_MS = Number(process.env.STALL_MS ?? 90000)
        let lastDone = 0, lastDoneAt = Date.now()
        while (Date.now() - startAt < MAX_MS) {
            await sleep(1000)
            const s = await evaluate(sample).catch(e => ({ error: String(e) }))
            s.t = +ts()
            sampleFile.write(JSON.stringify(s) + '\n')
            done = s.done || 0
            if (s.dialog && s.dialog === lastDialog) { if (Date.now() - dialogSince > 15000) { note('dialog open for 15 s: ' + s.dialog); dialogSince = Infinity } }
            else { lastDialog = s.dialog; dialogSince = Date.now() }
            if (done >= SINGS) { note(`${done} singularities done`); break }
            if (done !== lastDone) { lastDone = done; lastDoneAt = Date.now() }
            else if (Date.now() - lastDoneAt > STALL_MS) { note(`STALLED: no singularity for ${STALL_MS / 1000} s (done ${done}, phase ${s.phase}, stage ${s.stage}, cc ${s.cc})`); break }
            if (cdp.logs.slice(logsAtStart).some(l => /Autosing stopped\./.test(l))) { note('autosing stopped by itself'); break }
        }
        if (done < SINGS) note('time limit reached, singularities done: ' + done)

        await cdp.screenshot(path.join(out, 'end.png'))
        // The run panel's figures (textContent: its detailed rows can be hidden)
        const modal = await evaluate(`(() => { const ids = ['hs-completed-sing-amount', 'hs-avg-1', 'hs-avg-10', 'hs-avg-all', 'hs-min-time', 'hs-max-time', 'hs-total-time',
                'hs-quarks-rate-val', 'hs-quarks-rate-val-hr', 'hs-gquarks-rate-val', 'hs-gquarks-rate-val-hr', 'hs-gquarks-total-gains', 'hs-c15-top', 'hs-c15-sigma'];
            const lines = ids.map(id => id + ': ' + (document.getElementById(id)?.textContent ?? '?').replace(/\\s+/g, ' ').trim());
            const grid = document.getElementById('hs-phase-stats-container');
            if (grid) lines.push('--- phases', ...[...grid.children].map(e => e.textContent.replace(/\\s+/g, ' ').trim()));
            return lines.join('\\n'); })()`).catch(e => String(e))
        fs.writeFileSync(path.join(out, 'modal.txt'), modal || '')
        // The dev recorder's timings (HSAutosingRecorder), read before the stop below
        fs.writeFileSync(path.join(out, 'timings.json'), await evaluate(`JSON.stringify(window.__HS_autosingTimings ?? null)`).catch(e => JSON.stringify({ error: String(e) })) || 'null')
        note('intercepted: ' + JSON.stringify(intercepted.counts))
        await evaluate(`document.getElementById('hs-setting-auto-sing-enabled').click()`).catch(() => { })
        await sleep(1500)
        cdp.close()
    } catch (e) {
        note('ERROR ' + (e.stack || e))
    } finally {
        chrome.kill()
        server.close()
        logFile.end(); sampleFile.end()
        setTimeout(() => process.exit(0), 500)
    }
})()

// A heat routine at a new singularity target: heat after the first C15 is left (Obt + early cube/Best H), heat again in
// the middle of singularity-end (late cube, quark, off, all ambrosia), sync the settings, then restart autosing for
// the timed singularities. heated.json keeps the result for later runs (LOADOUTS=).
async function heatRoutine(cdp, out) {
    const { evaluate, waitFor } = cdp
    const phase = `document.getElementById('hs-phase-name-val')?.textContent?.trim() ?? ''`
    const pause = async label => { await evaluate(`document.getElementById('hs-timer-ctrl-pause').click()`); note(label + ': ' + await evaluate(`document.getElementById('hs-timer-ctrl-pause').title`)) }
    const loadoutSettings = ['autosingEarlyCubeLoadout', 'autosingLateCubeLoadout', 'autosingQuarkLoadout', 'autosingObtLoadout', 'autosingOffLoadout', 'autosingAmbrosiaLoadout']
    const storedSettings = `(() => { const s = JSON.parse(localStorage.getItem('hs-settings')); return typeof s === 'string' ? JSON.parse(s) : s; })()`
    const heat = async wanted => {
        const before = JSON.parse(await evaluate(`JSON.stringify(${P}.blueberryLoadouts)`))
        await evaluate(`document.getElementById('hs-panel-amb-heater-compute-btn').click()`)
        await waitFor(`!!document.getElementById('hs-heater-recalculate-btn')`, 30000)
        await sleep(500)
        note('heater inputs: ' + await evaluate(`(() => { const v = k => document.querySelector('[data-field-key="' + k + '"]')?.closest('tr')?.querySelector('input,select')?.value; return JSON.stringify({ sing: v('currentSingularity'), postAoag: v('postAoag'), exalt: v('exalt'), p4x4: ${P}.platonicUpgrades[19] }); })()`))
        // Only the branches of the types imported
        const branchOf = { obt: 'obtOff', off: 'obtOff', 'hyperflux:best': 'hyperflux', cubes: 'cubes', quarks: 'quarks', allAmb: 'luck' }
        note('branches: ' + await evaluate(`(() => { const want = new Set(${JSON.stringify(wanted.map(w => branchOf[w]))}); const on = [];
            document.querySelectorAll('.hs-heater-active-checkbox').forEach(box => { const id = box.id.replace('hs-heater-input-active-', '');
                if (box.checked !== want.has(id)) { box.checked = want.has(id); box.dispatchEvent(new Event('change', { bubbles: true })); } if (box.checked) on.push(id); });
            return on.join(', '); })()`))
        const heatStart = Date.now()
        await evaluate(`document.getElementById('hs-heater-recalculate-btn').click()`)
        await sleep(500)
        await waitFor(`!document.getElementById('hs-heater-recalculate-btn').textContent.includes('Heating')`, 600000)
        note(`heat done in ${((Date.now() - heatStart) / 1000).toFixed(1)} s`)
        note('slots: ' + await evaluate(`(() => { const wanted = ${JSON.stringify(wanted)}; const out = [];
            document.querySelectorAll('.hs-heater-type-select-row').forEach((row, i) => { const sel = row.querySelector('select'), box = row.querySelector('input[type=checkbox]');
                const want = wanted.includes(sel.value); out.push('L' + (i + 1) + ' ' + sel.value + (box.checked ? '' : ' (unticked after heat)') + (want ? ' → import' : ''));
                if (box.checked !== want) { box.checked = want; box.dispatchEvent(new Event('change', { bubbles: true })); } });
            return out.join(', '); })()`))
        await evaluate(`document.getElementById('hs-heater-import-all-btn').click()`)
        await sleep(1500)
        const after = JSON.parse(await evaluate(`JSON.stringify(${P}.blueberryLoadouts)`))
        note('loadouts changed: ' + (Object.keys(after).filter(k => JSON.stringify(after[k]) !== JSON.stringify(before[k])).join(', ') || 'none'))
    }
    const closeHeater = () => evaluate(`[...document.querySelectorAll('[data-close]')].filter(e => document.getElementById(e.dataset.close)?.querySelector('[id^="hs-heater"], [class*="hs-heater"]')).forEach(e => e.click())`)

    await waitFor(`${phase} === 'start-challenge10'`, 60000)
    await waitFor(`${P}.challenge15Exponent > 0`, 60000)
    await pause('after the first C15')
    await heat(['obt', 'hyperflux:best'])
    await closeHeater(); await sleep(500)
    await pause('resume')

    await waitFor(`${phase} === 'singularity-end'`, 120000)
    await sleep(1200)
    await pause('mid singularity-end')
    await heat(['cubes', 'quarks', 'off', 'allAmb'])
    await evaluate(`document.getElementById('hs-heater-sync-settings-btn').click()`)
    await evaluate(`document.getElementById('hs-heater-sync-icons-btn').click()`)
    await sleep(500)
    note('synced: ' + await evaluate(`(() => { const o = ${storedSettings}; return ${JSON.stringify(loadoutSettings)}.map(k => k + '=' + o[k]?.settingValue).join(' '); })()`).catch(e => String(e)))
    await closeHeater(); await sleep(500)
    await pause('resume')

    await waitFor(`Number(document.getElementById('hs-completed-sing-amount')?.textContent) >= 1`, 120000)
    note('heat singularity done: restarting autosing for the timed run')
    fs.writeFileSync(path.join(out, 'heated.json'), await evaluate(`(() => { const o = ${storedSettings}; const settings = {};
        for (const k of ${JSON.stringify(loadoutSettings)}) settings[k] = o[k]?.settingValue;
        return JSON.stringify({ blueberryLoadouts: ${P}.blueberryLoadouts, settings }); })()`))
    await evaluate(`document.getElementById('hs-setting-auto-sing-enabled').click()`)
    await sleep(2500)
    await evaluate(`document.getElementById('hs-setting-auto-sing-enabled').click()`)
    await sleep(1000)
}
