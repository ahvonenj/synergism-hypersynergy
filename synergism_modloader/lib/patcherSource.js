const fs = require('fs')
const path = require('path')
const crypto = require('crypto')

const BUNDLED_PATCHER_PATH = path.join(__dirname, 'patcher.js')

// Line endings are left out, so a copy checked out with CRLF hashes like the one served by the CDN.
function hashPatcher(code) {
    return crypto.createHash('sha256').update(code.replace(/\r\n/g, '\n')).digest('hex')
}

function readBundledPatcher() {
    return fs.readFileSync(BUNDLED_PATCHER_PATH, 'utf-8')
}

/**
 * Downloads the patcher.js of a ref.
 *
 * - `remote`: the ref has one, returned as `code`.
 * - `missing`: the ref has none (most older refs, and most of the "live" channel's history). That's
 *   expected and not an error: a patch then uses the copy shipped with the loader.
 * - `unreachable`: the download failed, so what the ref holds is unknown.
 *
 * @param {string} [patcherUrl]
 * @param {{ fetchImpl?: typeof fetch, timeoutMs?: number }} [opts]
 * @returns {Promise<{ status: 'remote', code: string } | { status: 'missing' | 'unreachable', reason: string }>}
 */
async function downloadPatcher(patcherUrl, { fetchImpl = fetch, timeoutMs } = {}) {
    if (!patcherUrl) return { status: 'missing', reason: 'no patcherUrl provided' }
    let code
    try {
        const res = await fetchImpl(patcherUrl, timeoutMs ? { signal: AbortSignal.timeout(timeoutMs) } : {})
        if (res.status === 404) return { status: 'missing', reason: `Request failed (404) for ${patcherUrl}` }
        if (!res.ok) return { status: 'unreachable', reason: `Request failed (${res.status}) for ${patcherUrl}` }
        code = await res.text()
    } catch (e) {
        return { status: 'unreachable', reason: e.cause?.message || e.message }
    }
    if (!code.includes('module.exports')) {
        return { status: 'missing', reason: 'fetched content doesn\'t look like patcher.js (no module.exports found)' }
    }
    return { status: 'remote', code }
}

/**
 * The patcher a patch of this ref uses: the ref's own, or the bundled copy when the ref has none or
 * the download fails (or takes longer than `timeoutMs`).
 *
 * @returns {Promise<{ code: string, hash: string, source: 'remote' | 'bundled' }>}
 */
async function loadPatcher(patcherUrl, { onLog, fetchImpl, timeoutMs } = {}) {
    if (patcherUrl) onLog?.(`Fetching ${patcherUrl}`)
    const download = await downloadPatcher(patcherUrl, { fetchImpl, timeoutMs })
    if (download.status === 'remote') {
        return { code: download.code, hash: hashPatcher(download.code), source: 'remote' }
    }
    const problem = download.status === 'missing' ? 'patcher.js not available at that ref' : 'patcher.js could not be downloaded'
    onLog?.(`${problem} — falling back to the bundled copy (${download.reason})`)
    const code = readBundledPatcher()
    return { code, hash: hashPatcher(code), source: 'bundled' }
}

/**
 * Whether the game must be patched again to get this ref's patcher.
 *
 * `lastHash` is the hash of the patcher used by the last patch. Loaders up to 0.2.8 stored none, and
 * a game they patched counts as needing a patch: its patcher can't be known. A failed download
 * never asks for a patch (`reason: 'unknown'`).
 *
 * @returns {Promise<{ needsRepatch: boolean, reason: 'no-hash' | 'changed' | 'same' | 'unknown', error?: string }>}
 */
async function checkPatcherChanged({ lastHash, patcherUrl, fetchImpl, timeoutMs }) {
    if (!lastHash) return { needsRepatch: true, reason: 'no-hash' }
    const download = await downloadPatcher(patcherUrl, { fetchImpl, timeoutMs })
    if (download.status === 'unreachable') return { needsRepatch: false, reason: 'unknown', error: download.reason }
    const code = download.status === 'remote' ? download.code : readBundledPatcher()
    const changed = hashPatcher(code) !== lastHash
    return { needsRepatch: changed, reason: changed ? 'changed' : 'same' }
}

module.exports = { hashPatcher, readBundledPatcher, downloadPatcher, loadPatcher, checkPatcherChanged }
