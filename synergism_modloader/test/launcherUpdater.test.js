const test = require('node:test')
const assert = require('node:assert/strict')
const { EventEmitter } = require('node:events')
const { createLauncherUpdater, latestLauncherTag } = require('../lib/launcherUpdater')

function setup(isPackaged = true, findRelease = async () => 'loader-v0.2.1') {
    const updater = new EventEmitter()
    const states = []
    const feeds = []
    updater.setFeedURL = options => feeds.push(options)
    const controller = createLauncherUpdater({
        app: { isPackaged, getVersion: () => '0.2.0' },
        updater,
        notify: state => states.push(state),
        findRelease,
        platform: 'win32'
    })
    return { updater, states, controller, feeds }
}

test('downloads a newer launcher and installs only after explicit restart', async () => {
    const { updater, controller, feeds } = setup()
    let installs = 0
    updater.checkForUpdates = async () => {
        updater.emit('update-available', { version: '0.2.1' })
    }
    updater.quitAndInstall = (silent, runAfter) => {
        assert.equal(silent, true)
        assert.equal(runAfter, true)
        installs++
    }

    assert.equal(updater.autoDownload, true)
    assert.equal(updater.autoInstallOnAppQuit, false)
    assert.equal(controller.install().ok, false)
    await controller.check()
    assert.deepEqual(feeds, [{ provider: 'generic', url: 'https://github.com/Ferlieloi/synergism-hypersynergy/releases/download/loader-v0.2.1/' }])
    assert.equal(controller.getStatus().phase, 'downloading')
    updater.emit('download-progress', { percent: 51.7 })
    assert.equal(controller.getStatus().percent, 52)
    updater.emit('update-downloaded', { version: '0.2.1' })
    assert.equal(controller.getStatus().phase, 'ready')
    assert.equal(installs, 0)

    assert.equal(controller.install().ok, true)
    await new Promise(resolve => setImmediate(resolve))
    assert.equal(installs, 1)
})

test('coalesces update checks and allows retry after an error', async () => {
    const { updater, controller } = setup()
    let checks = 0
    let finishCheck
    updater.checkForUpdates = () => {
        checks++
        return new Promise(resolve => { finishCheck = resolve })
    }

    const first = controller.check()
    const second = controller.check()
    assert.equal(first, second)
    await new Promise(resolve => setImmediate(resolve))
    assert.equal(checks, 1)
    updater.emit('update-not-available')
    finishCheck()
    await first
    assert.equal(controller.getStatus().phase, 'up-to-date')

    updater.checkForUpdates = async () => { throw new Error('Network unavailable') }
    await controller.check()
    assert.equal(controller.getStatus().phase, 'error')
    assert.match(controller.getStatus().error, /Network unavailable/)
})

test('does not check for updates in the development app', async () => {
    const { controller } = setup(false)
    assert.equal((await controller.check()).phase, 'unavailable')
    assert.equal(controller.install().ok, false)
})

test('does not check for Windows installer updates on other platforms', async () => {
    const controller = createLauncherUpdater({
        app: { isPackaged: true, getVersion: () => '0.2.7' },
        updater: {},
        notify: () => assert.fail('Unexpected updater notification'),
        platform: 'linux'
    })
    assert.equal((await controller.check()).phase, 'unavailable')
    assert.equal(controller.install().ok, false)
})

function fakeGitHub(tags, releases) {
    const requests = []
    const fetchImpl = async url => {
        requests.push(url)
        const json = body => ({ ok: true, status: 200, json: async () => body })
        if (url.endsWith('/git/matching-refs/tags/loader-v')) {
            return json(tags.map(tag => ({ ref: `refs/tags/${tag}` })))
        }
        const tag = decodeURIComponent(url.split('/releases/tags/')[1] || '')
        return releases[tag] ? json(releases[tag]) : { ok: false, status: 404, json: async () => ({}) }
    }
    return { fetchImpl, requests }
}

test('selects the newest published launcher with update metadata from the loader tags', async () => {
    const { fetchImpl, requests } = fakeGitHub(
        ['loader-v0.2.9', 'loader-v0.2.10', 'loader-v0.2.11', 'loader-v0.2.12', 'loader-v0.2.x'],
        {
            'loader-v0.2.9': { assets: [{ name: 'latest.yml' }] },
            'loader-v0.2.10': { assets: [{ name: 'latest.yml' }] },
            'loader-v0.2.11': { assets: [] }
            // loader-v0.2.12: tag pushed, release not published yet (404)
        })
    assert.equal(await latestLauncherTag(fetchImpl), 'loader-v0.2.10')
    assert.equal(requests.length, 4)
    assert.ok(requests.every(url => !url.includes('/releases?')))
})

test('skips draft and prerelease launchers, and gives up after a few tags', async () => {
    const { fetchImpl, requests } = fakeGitHub(
        ['loader-v0.2.1', 'loader-v0.2.2', 'loader-v0.2.3', 'loader-v0.2.4'],
        {
            'loader-v0.2.1': { assets: [{ name: 'latest.yml' }] },
            'loader-v0.2.3': { prerelease: true, assets: [{ name: 'latest.yml' }] },
            'loader-v0.2.4': { draft: true, assets: [{ name: 'latest.yml' }] }
        })
    assert.equal(await latestLauncherTag(fetchImpl), null)
    assert.equal(requests.length, 4)
})

test('reports a failed release lookup instead of skipping it', async () => {
    const fetchImpl = async url => url.includes('/releases/tags/')
        ? { ok: false, status: 403, json: async () => ({}) }
        : { ok: true, status: 200, json: async () => [{ ref: 'refs/tags/loader-v0.2.10' }] }
    await assert.rejects(latestLauncherTag(fetchImpl), /403/)
})

test('reports an unpublished launcher without calling the updater', async () => {
    const { updater, controller, feeds } = setup(true, async () => null)
    updater.checkForUpdates = () => { throw new Error('Should not check without release files') }
    await controller.check()
    assert.equal(controller.getStatus().phase, 'no-release')
    assert.deepEqual(feeds, [])
})
