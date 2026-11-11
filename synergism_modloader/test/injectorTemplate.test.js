const assert = require('node:assert/strict')
const test = require('node:test')
const vm = require('node:vm')
const { buildInjectorCode, injectorHash } = require('../lib/injectorTemplate')

test('Steam injector waits for mod initialization and does not start it twice', async () => {
    let finishInitialization
    const initialization = new Promise(resolve => { finishInitialization = resolve })
    const messages = []
    let initCalls = 0
    const window = { hypersynergism: { init: () => { initCalls++ } } }
    const document = {
        createElement: () => ({ textContent: '' }),
        head: {
            appendChild() { window.__HS_INIT_PROMISE = initialization }
        }
    }
    const context = {
        window, document,
        process: { env: {} },
        fetch: async () => ({ ok: true, text: async () => 'mod source' }),
        console: { log: (...args) => messages.push(args.join(' ')), error: () => {} }
    }

    vm.runInNewContext(buildInjectorCode('https://example.test/mod.js'), context)
    await new Promise(resolve => setImmediate(resolve))
    assert.equal(initCalls, 0)
    assert.equal(messages.some(message => message.includes('Mod initialized')), false)

    finishInitialization()
    await new Promise(resolve => setImmediate(resolve))
    assert.equal(messages.some(message => message.includes('Mod initialized')), true)
})

test('Steam injector reports a failed mod download', async () => {
    const errors = []
    let appended = false
    const context = {
        window: {},
        document: {
            createElement: () => ({ textContent: '' }),
            head: { appendChild() { appended = true } }
        },
        process: { env: {} },
        fetch: async () => ({ ok: false, status: 503 }),
        console: { log: () => {}, error: (...args) => errors.push(args) }
    }

    vm.runInNewContext(buildInjectorCode('https://example.test/mod.js'), context)
    await new Promise(resolve => setImmediate(resolve))
    assert.equal(appended, false)
    assert.match(String(errors[0]?.[1]), /HTTP 503/)
})

// Runs the injector on a fake page and returns the text of each script it adds, in order
async function injectedScripts(modUrl, env = {}) {
    const scripts = []
    const context = {
        window: {},
        document: {
            createElement: () => ({ textContent: '' }),
            head: { appendChild(script) { scripts.push(script.textContent) } }
        },
        process: { env },
        fetch: async () => ({ ok: true, text: async () => 'mod source' }),
        console: { log: () => {}, warn: () => {}, error: () => {} }
    }
    vm.runInNewContext(buildInjectorCode(modUrl), context)
    await new Promise(resolve => setImmediate(resolve))
    return scripts
}

test('Steam injector tells the mod which repo and ref it was loaded from, before the mod runs', async () => {
    const scripts = await injectedScripts(
        'https://cdn.jsdelivr.net/gh/maenhiir/synergism-hypersynergy@v2.14.4b-dev4/release/mod/hypersynergism_release.js?t=123')
    assert.equal(scripts.length, 2)
    assert.equal(scripts[1], 'mod source')

    const page = {}
    vm.runInNewContext(scripts[0], { window: page })
    assert.deepEqual(page, { __HS_REPO: 'maenhiir', __HS_VERSION: 'v2.14.4b-dev4' })
})

test('Steam injector reads the repo and ref from the URL of the launch, not the patched one', async () => {
    const scripts = await injectedScripts(
        'https://cdn.jsdelivr.net/gh/Ferlieloi/synergism-hypersynergy@master/release/mod/hypersynergism_release.js?t=1',
        { HS_MOD_URL: 'https://cdn.jsdelivr.net/gh/maenhiir/synergism-hypersynergy@master/release/mod/hypersynergism_release.js?t=2' })
    const page = {}
    vm.runInNewContext(scripts[0], { window: page })
    assert.deepEqual(page, { __HS_REPO: 'maenhiir', __HS_VERSION: 'master' })
})

test('Steam injector sets no repo for a mod URL outside jsDelivr (local dev server)', async () => {
    assert.deepEqual(await injectedScripts('http://127.0.0.1:8080/hypersynergism.js?t=123'), ['mod source'])
})

test('the injector hash follows the injector code, not the mod URL', () => {
    assert.match(injectorHash(), /^[0-9a-f]{64}$/)
    assert.equal(injectorHash(), injectorHash())
    const withoutUrl = code => code.replace(/let resolvedUrl = .*;/, '')
    assert.equal(withoutUrl(buildInjectorCode('https://example.test/a.js')), withoutUrl(buildInjectorCode('')))
})
