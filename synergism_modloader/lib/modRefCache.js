function rememberedRefs(config, channelId, defaultRef) {
    const cached = config.refListCache?.[channelId] || []
    const refs = Array.isArray(cached) ? cached.filter(ref => ref && typeof ref.name === 'string' && ref.name).map(ref => ({ ...ref })) : []
    const names = new Set(refs.map(ref => ref.name))

    const add = (name, label) => {
        if (typeof name === 'string' && name && !names.has(name)) {
            refs.push({ name, type: label, date: null })
            names.add(name)
        }
    }

    if (config.lastPlayedChannel === channelId) add(config.lastPlayedModRef, 'last played')
    if (config.lastPatchedChannel === channelId) add(config.lastPatchedModRef, 'last patched')
    if (config.channel === channelId) add(config.modRef, 'selected')
    add(defaultRef, 'branch')
    return refs
}

module.exports = { rememberedRefs }
