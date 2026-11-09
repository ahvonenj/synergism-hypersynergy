// Presses the real Hepteract Distributor on the real game (docs/features/hepteract-distributor.md), on states set
// through the dev tools (hsDev), and checks what the game ends on: an expansion paid back to the unit, a partial step
// ending the plan, a normal run.
// Usage: node scripts/harness/hepteract-distributor.cjs <save.json|save.txt>
// Env: TAG=<name> (output folder), PORT/HTTP_PORT
// The save needs Chronos, Hyperrealism, Challenge and Abyss unlocked, outside Exalts 3 and 7. A cost shown cut to 3 digits
// (C below) is why stocks are checked within 1%. Needs the dev build (npm run build).
const path = require('node:path')
const { outDir } = require('./lib/env.cjs')
const { launchChrome } = require('./lib/chrome.cjs')
const { connectCdp, sleep } = require('./lib/cdp.cjs')
const game = require('./lib/game.cjs')

const PORT = Number(process.env.PORT ?? 9367), HTTP = Number(process.env.HTTP_PORT ?? 8787)
const tag = process.env.TAG || 'hepteract-distributor'
const out = outDir('smoke', tag)
const saveFile = process.argv[2]
const P = game.PLAYER
const LABELS = { chronos: 'Chronos', hyperrealism: 'Hyperrealism', challenge: 'Challenge', abyss: 'Abyss', accelerator: 'Accelerator', acceleratorBoost: 'Accelerator Boost', multiplier: 'Multiplier' }
const KEYS = Object.keys(LABELS)

let failures = 0
const check = (name, ok, detail) => {
    if (!ok) failures++
    console.log(`${ok ? 'ok  ' : 'FAIL'} ${name}: ${detail}`)
}
const near = (value, expected) => Math.abs(value - expected) <= Math.abs(expected) * 0.01

;(async () => {
    if (!saveFile) throw new Error('Usage: hepteract-distributor.cjs <save>')
    const server = game.startGameServer({ port: HTTP, patch: true })
    const chrome = await launchChrome({ port: PORT, profile: outDir('profiles', tag), width: 1600, height: 1000, fresh: true })
    try {
        const cdp = await connectCdp(PORT)
        await game.interceptGameServer(cdp, server.origin)
        await cdp.navigate(server.origin + '/')
        await cdp.waitFor(`!!document.getElementById('importfile')`)
        const onDialog = d => console.log('dialog answered: ' + d)
        await game.waitGameReady(cdp, { onDialog })
        await game.importSave(cdp, game.readSaveFile(saveFile).save, out, {})
        await sleep(2000)
        await game.waitGameReady(cdp, { onDialog })
        await game.injectMod(cdp)
        await sleep(15000)

        const js = code => cdp.evaluate(code)
        if (await js(`typeof window.hsDev?.set`) !== 'function') throw new Error('No hsDev: needs the dev build')

        // The forge, as a player opens it: a locked type's meter is only right while it is drawn
        await js(`document.getElementById('cubetab').click()`)
        await sleep(800)
        await js(`document.getElementById('switchCubeSubTab7').click()`)
        await sleep(1500)
        await js(`document.getElementById('hs-hept-distributor-open')?.click()`)
        await sleep(500)
        if (!await js(`!!document.getElementById('hs-hept-distributor')`)) throw new Error('No Distributor panel')

        const set = async (key, value) => {
            if (await js(`window.hsDev.set(${JSON.stringify(key)}, ${JSON.stringify(String(value))})`) === false) throw new Error('hsDev.set refused ' + key)
        }
        const setType = async (key, expansions, balance) => {
            await set(`hepteracts.${key}.TIMES_CAP_EXTENDED`, expansions)
            await set(`hepteracts.${key}.BAL`, balance)
        }
        const setRatios = values => js(`(() => { for (const [label, value] of ${JSON.stringify(KEYS.map(key => [LABELS[key], values[key] ?? 0]))}) {
            const input = document.querySelector('#hs-hept-distributor input[aria-label="' + label + ' ratio"]');
            input.value = String(value); input.dispatchEvent(new Event('input', { bubbles: true })); } })()`)
        const setPartial = on => js(`(() => { const box = [...document.querySelectorAll('#hs-hept-distributor label')].find(l => l.textContent.includes('Allow partly filled')).querySelector('input');
            if (box.checked !== ${on}) box.click(); })()`)
        const read = async () => JSON.parse(await js(`JSON.stringify({
            owned: ${P}.wowAbyssals,
            percentage: ${P}.hepteractAutoCraftPercentage,
            autos: ${JSON.stringify(KEYS)}.map(key => ${P}.hepteracts[key].AUTO),
            confirmation: ${P}.toggles[31],
            types: Object.fromEntries(${JSON.stringify(KEYS)}.map(key => [key, { balance: ${P}.hepteracts[key].BAL, expansions: ${P}.hepteracts[key].TIMES_CAP_EXTENDED, meter: document.getElementById(key + 'ProgressBarText')?.textContent }])),
        })`))
        // All Autos off, and no reward ascension to change the stock (the automations can complete Challenge 10 again)
        const prepare = async (stock) => {
            for (const key of KEYS) await js(`if (${P}.hepteracts[${JSON.stringify(key)}].AUTO) document.getElementById(${JSON.stringify(key + 'HepteractAuto')}).click()`)
            await set('wowAbyssals', stock)
            await set('challengecompletions.10', 0)
        }
        const press = async () => {
            await js(`document.querySelector('.hs-hept-distributor-status').textContent = ''; [...document.querySelectorAll('#hs-hept-distributor .hs-hept-distributor-actions button')].find(b => b.textContent === 'Distribute').click()`)
            for (let i = 0; i < 40; i++) {
                await sleep(250)
                const status = await js(`document.querySelector('.hs-hept-distributor-status').textContent`)
                // "Distributing…" is shown while the run waits for the game
                if (status && !status.startsWith('Distributing')) return status
            }
            throw new Error('The Distributor showed no status')
        }
        // The cost in the status follows the mod's number format, always with a dot
        const nextNeeds = status => Number(/which needs ([0-9.e+,]+) hepteracts/.exec(status)?.[1]?.replace(/,/g, ''))

        await js(`document.getElementById('chronosHepteract').dispatchEvent(new MouseEvent('mouseover', { bubbles: true }))`)
        const costText = await js(`document.getElementById('hepteractCostText').textContent`)
        // The harness's Chrome formats numbers in the system's locale
        const C = Number(/[0-9][0-9.,\s  ]*(e[0-9]+)?/i.exec(costText)?.[0].replace(/[\s  ]/g, '').replace(',', '.'))
        const double = Number(await js(`${P}.singularityChallenges?.limitedAscensions?.completions ?? 0`)) > 0
        const start = await read()
        console.log(`S${await js(`${P}.singularityCount`)}, a Chronos unit costs C = ${C}, double capacity: ${double}`)
        if (!(C > 0)) throw new Error('Could not read the cost: ' + costText)
        for (const key of ['chronos', 'hyperrealism', 'challenge', 'abyss']) {
            if (!String(start.types[key].meter).includes('/')) throw new Error(`${key} is locked on this save`)
        }

        // An expansion paid back to the unit: the balance stays, only the capacity shows it
        console.log('\nExpansion paid back to the unit')
        await setRatios({ abyss: 1 })
        await setPartial(true)
        await setType('abyss', 0, double ? 2 : 1)
        await prepare(15000 * C)
        await sleep(600)
        let status = await press()
        let end = await read()
        console.log(status.replace(/\n/g, ' | '))
        check('no error', status.includes('Done in 1 ascension'), status.split('\n')[0])
        check('Abyss keeps its balance', end.types.abyss.balance === (double ? 2 : 1), end.types.abyss.balance)
        check('Abyss expanded once', end.types.abyss.expansions === 1, end.types.abyss.meter)
        check('half a unit left', near(end.owned, 5000 * C), `${end.owned / C} x C`)
        check('Next: Abyss, a whole step', status.includes('Next: Abyss') && near(nextNeeds(status), (double ? 20000 : 10000) * C), `${nextNeeds(status) / C} x C`)

        // Abyss takes a partial step, and what is left could still fill Chronos partly: a partial step ends the plan.
        // Chronos was crafted before it: with a second partial step, Abyss would be crafted first and get 11
        console.log('\nA partial step ends the plan')
        await setRatios({ chronos: 1, abyss: 1 })
        await setPartial(true)
        await setType('chronos', 3, 0)
        await setType('abyss', 4, 0)
        await prepare((double ? 125000 : 117000) * C)
        await sleep(600)
        status = await press()
        end = await read()
        console.log(status.replace(/\n/g, ' | '))
        check('no error, no note', status.includes('Done in 2 ascensions') && !status.includes('not the planned'), status.split('\n')[0])
        check('Chronos on a full meter', end.types.chronos.balance === (double ? 16000 : 8000), end.types.chronos.meter)
        check('Abyss exactly as planned', end.types.abyss.balance === 10, end.types.abyss.meter)
        check('what is left stays', near(end.owned, 9000 * C), `${end.owned / C} x C`)
        check('Next: Chronos, a whole step', status.includes('Next: Chronos') && near(nextNeeds(status), (double ? 24000 : 16000) * C), `${nextNeeds(status) / C} x C`)

        // A normal run: full meters, and every switch put back
        console.log('\nA normal run')
        await setRatios({ chronos: 4, hyperrealism: 2, challenge: 1 })
        await setPartial(false)
        for (const key of ['chronos', 'hyperrealism', 'challenge']) await setType(key, 0, 0)
        await prepare(1e8 * C)
        await sleep(600)
        status = await press()
        end = await read()
        console.log(status.replace(/\n/g, ' | '))
        check('no error, no note', status.includes('Done in 3 ascensions') && !status.includes('not the planned'), status.split('\n')[0])
        for (const key of ['chronos', 'hyperrealism', 'challenge']) {
            const top = 1000 * 2 ** end.types[key].expansions * (double ? 2 : 1)
            check(`${key} on a full meter`, end.types[key].balance === top, end.types[key].meter)
        }
        const worth = key => end.types[key].balance * { chronos: 1, hyperrealism: 1, challenge: 5 }[key]
        check('ratios within one step', worth('chronos') / worth('hyperrealism') > 1 && worth('chronos') / worth('hyperrealism') < 4 && worth('hyperrealism') / worth('challenge') > 1 && worth('hyperrealism') / worth('challenge') < 4,
            `${worth('chronos') / worth('challenge')} : ${worth('hyperrealism') / worth('challenge')} : 1 (asked 4 : 2 : 1)`)
        check('autocraft percentage put back', end.percentage === start.percentage, end.percentage)
        check('ascension confirmation put back', end.confirmation === start.confirmation, end.confirmation)
        check('Autos still off', end.autos.every(auto => !auto), JSON.stringify(end.autos))
        check('Next shown', status.includes('Next: '), status.split('\n').find(line => line.startsWith('Next')))

        await cdp.screenshot(path.join(out, 'end.png'))
        console.log(`\nPage exceptions (with synergism.cc blocked, the game's own fetches can fail): ${cdp.logs.filter(l => l.startsWith('EXCEPTION')).length}`)
        console.log(`Screenshot: ${path.join(out, 'end.png')}`)
        console.log(failures ? `${failures} check(s) FAILED` : 'All checks passed')
        cdp.close()
    } finally {
        chrome.kill()
        server.close()
    }
    process.exit(failures ? 1 : 0)
})().catch(e => { console.error(e.stack || e); process.exit(1) })
