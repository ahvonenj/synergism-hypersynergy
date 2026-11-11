const API_URL = 'https://api.github.com/repos/Ferlieloi/synergism-hypersynergy'
const DOWNLOAD_URL = 'https://github.com/Ferlieloi/synergism-hypersynergy/releases/download'
const HEADERS = { Accept: 'application/vnd.github+json', 'User-Agent': 'Hypersynergism-Loader' }
// Newest loader tags tried before giving up: a tag whose release is still building (or failed) is skipped.
const MAX_RELEASE_LOOKUPS = 3

// The repo's release list also holds mod releases, which would push loader releases off
// any page of it. The loader tags are listed on their own instead, then looked up one by one.
async function latestLauncherTag(fetchImpl = fetch) {
    const response = await fetchImpl(`${API_URL}/git/matching-refs/tags/loader-v`, { headers: HEADERS })
    if (!response.ok) throw new Error(`GitHub release check failed (${response.status}).`)
    const refs = await response.json()
    if (!Array.isArray(refs)) throw new Error('GitHub returned an invalid tag list.')
    const tags = refs.map(ref => String(ref.ref).replace(/^refs\/tags\//, ''))
        .filter(tag => /^loader-v\d+\.\d+\.\d+$/.test(tag))
    tags.sort((a, b) => b.slice(8).localeCompare(a.slice(8), undefined, { numeric: true }))

    for (const tag of tags.slice(0, MAX_RELEASE_LOOKUPS)) {
        const releaseResponse = await fetchImpl(`${API_URL}/releases/tags/${encodeURIComponent(tag)}`, { headers: HEADERS })
        // 404: no published release for this tag yet (drafts are hidden from anonymous requests).
        if (releaseResponse.status === 404) continue
        if (!releaseResponse.ok) throw new Error(`GitHub release check failed (${releaseResponse.status}).`)
        const release = await releaseResponse.json()
        if (!release.draft && !release.prerelease
            && release.assets?.some(asset => asset.name === 'latest.yml')) {
            return tag
        }
    }
    return null
}

function createLauncherUpdater({ app, updater, notify, findRelease = latestLauncherTag, platform = process.platform }) {
    const supported = app.isPackaged && platform === 'win32'
    let status = {
        phase: supported ? 'idle' : 'unavailable',
        currentVersion: app.getVersion(),
        availableVersion: null,
        percent: 0,
        error: null
    }
    let checkInProgress = null

    function getStatus() {
        return { ...status }
    }

    function setStatus(patch) {
        status = { ...status, ...patch }
        notify(getStatus())
    }

    if (supported) {
        updater.autoDownload = true
        updater.autoInstallOnAppQuit = false

        updater.on('checking-for-update', () => setStatus({ phase: 'checking', error: null }))
        updater.on('update-not-available', () => setStatus({ phase: 'up-to-date', availableVersion: null, percent: 0 }))
        updater.on('update-available', info => setStatus({
            phase: 'downloading', availableVersion: info.version, percent: 0, error: null
        }))
        updater.on('download-progress', progress => setStatus({
            phase: 'downloading', percent: Math.max(0, Math.min(100, Math.round(progress.percent)))
        }))
        updater.on('update-downloaded', info => setStatus({
            phase: 'ready', availableVersion: info.version, percent: 100, error: null
        }))
        updater.on('update-cancelled', () => setStatus({
            phase: 'error', error: 'The update download was cancelled.'
        }))
        updater.on('error', error => setStatus({
            phase: 'error', error: error?.message || String(error)
        }))
    }

    function check() {
        if (!supported || status.phase === 'downloading' || status.phase === 'ready' || status.phase === 'installing') {
            return Promise.resolve(getStatus())
        }
        if (checkInProgress) return checkInProgress

        setStatus({ phase: 'checking', error: null })
        checkInProgress = Promise.resolve()
            .then(async () => {
                const tag = await findRelease()
                if (!tag) {
                    setStatus({ phase: 'no-release', error: null })
                    return
                }
                updater.setFeedURL({ provider: 'generic', url: `${DOWNLOAD_URL}/${encodeURIComponent(tag)}/` })
                await updater.checkForUpdates()
            })
            .catch(error => {
                setStatus({ phase: 'error', error: error?.message || String(error) })
            })
            .then(getStatus)
            .finally(() => { checkInProgress = null })
        return checkInProgress
    }

    function install() {
        if (!supported || status.phase !== 'ready') {
            return { ok: false, error: 'No launcher update is ready to install.' }
        }
        setStatus({ phase: 'installing' })
        setImmediate(() => {
            try {
                updater.quitAndInstall(true, true)
            } catch (error) {
                setStatus({ phase: 'error', error: error?.message || String(error) })
            }
        })
        return { ok: true }
    }

    return { getStatus, check, install }
}

module.exports = { createLauncherUpdater, latestLauncherTag }
