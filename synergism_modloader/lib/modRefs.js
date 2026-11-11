const HEADERS = {
    'User-Agent': 'hypersynergism-loader',
    'Accept': 'application/vnd.github+json'
}

async function githubJson(repo, resource, fetchImpl) {
    const response = await fetchImpl(`https://api.github.com/repos/${repo}/${resource}`, { headers: HEADERS })
    if (!response.ok) throw new Error(`GitHub API request failed (${response.status})`)
    return response.json()
}

async function listModRefs(repo, cachedDates = {}, fetchImpl = fetch) {
    const [branches, tags] = await Promise.all([
        githubJson(repo, 'branches?per_page=100', fetchImpl),
        githubJson(repo, 'tags?per_page=100', fetchImpl)
    ])
    const refs = [
        ...branches.map(branch => ({ name: branch.name, type: 'branch', sha: branch.commit.sha })),
        ...tags.filter(tag => !tag.name.startsWith('loader-v'))
            .map(tag => ({ name: tag.name, type: 'tag', sha: tag.commit.sha }))
    ]
    const dates = { ...cachedDates }
    const releaseDates = new Map()

    try {
        const releases = await githubJson(repo, 'releases?per_page=100', fetchImpl)
        for (const release of releases) {
            if (!release.draft && release.published_at) {
                releaseDates.set(release.tag_name, release.published_at)
            }
        }
    } catch {
        // Commit dates still give a useful ordering when releases are unavailable.
    }

    const missing = new Set(refs
        .filter(ref => !(ref.type === 'tag' && releaseDates.has(ref.name)) && !dates[ref.sha])
        .map(ref => ref.sha))

    for (let page = 1; page <= 5 && missing.size; page++) {
        let commits
        try {
            commits = await githubJson(repo, `commits?per_page=100&page=${page}`, fetchImpl)
        } catch {
            break
        }
        for (const commit of commits) {
            if (!missing.has(commit.sha)) continue
            const date = commit.commit?.committer?.date || commit.commit?.author?.date
            if (date) {
                dates[commit.sha] = date
                missing.delete(commit.sha)
            }
        }
        if (commits.length < 100) break
    }

    // Tags from other branches may not appear in the default branch's history.
    const unmatched = [...missing].slice(0, 20)
    for (let i = 0; i < unmatched.length; i += 5) {
        await Promise.allSettled(unmatched.slice(i, i + 5).map(async sha => {
            const commit = await githubJson(repo, `commits/${sha}`, fetchImpl)
            const date = commit.commit?.committer?.date || commit.commit?.author?.date
            if (date) dates[sha] = date
        }))
    }

    const ordered = refs.map((ref, index) => ({
        name: ref.name,
        type: ref.type,
        date: (ref.type === 'tag' && releaseDates.get(ref.name)) || dates[ref.sha] || null,
        index
    }))
    ordered.sort((a, b) => {
        const byDate = (Date.parse(b.date) || 0) - (Date.parse(a.date) || 0)
        return byDate || a.index - b.index
    })

    return {
        refs: ordered.map(({ index, ...ref }) => ref),
        branchCount: branches.length,
        tagCount: tags.length - tags.filter(tag => tag.name.startsWith('loader-v')).length,
        dates,
        datesIncomplete: ordered.some(ref => !ref.date)
    }
}

module.exports = { listModRefs }
