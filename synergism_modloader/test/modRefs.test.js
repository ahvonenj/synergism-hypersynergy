const test = require('node:test')
const assert = require('node:assert/strict')
const { listModRefs } = require('../lib/modRefs')

function fakeFetch(responses) {
    return async url => {
        const resource = url.split('/repos/owner/repo/')[1]
        if (!(resource in responses)) return { ok: false, status: 404 }
        return { ok: true, json: async () => responses[resource] }
    }
}

test('orders refs by release date, then commit date, and excludes launcher tags', async () => {
    const result = await listModRefs('owner/repo', {}, fakeFetch({
        'branches?per_page=100': [{ name: 'master', commit: { sha: 'master-sha' } }],
        'tags?per_page=100': [
            { name: 'v2', commit: { sha: 'v2-sha' } },
            { name: 'v1', commit: { sha: 'v1-sha' } },
            { name: 'loader-v0.2.0', commit: { sha: 'loader-sha' } }
        ],
        'releases?per_page=100': [{ tag_name: 'v1', published_at: '2026-05-10T00:00:00Z', draft: false }],
        'commits?per_page=100&page=1': [
            { sha: 'master-sha', commit: { committer: { date: '2026-05-05T00:00:00Z' } } },
            { sha: 'v2-sha', commit: { committer: { date: '2026-05-08T00:00:00Z' } } }
        ]
    }))

    assert.deepEqual(result.refs.map(ref => ref.name), ['v1', 'v2', 'master'])
    assert.equal(result.refs[0].date, '2026-05-10T00:00:00Z')
    assert.equal(result.tagCount, 2)
    assert.equal(result.branchCount, 1)
    assert.equal(result.datesIncomplete, false)
})

test('uses cached dates and looks up tags outside the default branch', async () => {
    const result = await listModRefs('owner/repo', { 'master-sha': '2026-05-05T00:00:00Z' }, fakeFetch({
        'branches?per_page=100': [{ name: 'master', commit: { sha: 'master-sha' } }],
        'tags?per_page=100': [{ name: 'dev-tag', commit: { sha: 'dev-sha' } }],
        'releases?per_page=100': [],
        'commits?per_page=100&page=1': [],
        'commits/dev-sha': { commit: { committer: { date: '2026-05-06T00:00:00Z' } } }
    }))

    assert.deepEqual(result.refs.map(ref => ref.name), ['dev-tag', 'master'])
    assert.equal(result.dates['dev-sha'], '2026-05-06T00:00:00Z')
})
