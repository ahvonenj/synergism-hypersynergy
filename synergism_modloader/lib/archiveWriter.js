const { finished } = require('stream/promises')

/**
 * The directories an archive keeps outside itself, in the `.unpacked` folder beside it. The game does
 * that for its native modules (steamworks-ffi-node, koffi): a `.node` file inside the archive is loaded from a copy
 * in the temp folder, where the DLLs it needs are not beside it.
 *
 * A file kept outside on its own counts as its directory: more files outside is harmless, fewer is not.
 * (Such a file at the archive's root is left out, there is no directory to name.)
 *
 * @param {object} asar
 * @param {string} archivePath
 * @returns {string[]} Paths inside the archive, with forward slashes
 */
function readUnpackedDirs(asar, archivePath) {
    const dirs = new Set()
    const walk = (node, dir) => {
        for (const [name, child] of Object.entries(node.files || {})) {
            const childPath = dir ? `${dir}/${name}` : name
            if (child.unpacked) {
                if (child.files) dirs.add(childPath)
                else if (dir) dirs.add(dir)
            } else if (child.files) {
                walk(child, childPath)
            }
        }
    }
    walk(asar.getRawHeader(archivePath).header, '')
    return [...dirs]
}

async function createPackageAndWait(asar, sourceDir, archivePath, unpackedDirs = []) {
    // `unpackDir` is one glob, matched against each directory's path with forward slashes.
    const unpackDir = unpackedDirs.length > 1 ? `{${unpackedDirs.join(',')}}` : unpackedDirs[0]
    // @electron/asar currently resolves createPackage with the output stream
    // immediately after calling end(). Wait for the stream to close before
    // moving or deleting the folder containing the archive on Windows.
    const output = await asar.createPackageWithOptions(sourceDir, archivePath, { unpackDir })
    if (output && typeof output.on === 'function') await finished(output)
}

module.exports = { createPackageAndWait, readUnpackedDirs }
