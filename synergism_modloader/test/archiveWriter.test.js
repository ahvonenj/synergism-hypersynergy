const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')
const { Writable } = require('node:stream')
const { finished } = require('node:stream/promises')
const asar = require('@electron/asar')
const { createPackageAndWait, readUnpackedDirs } = require('../lib/archiveWriter')

test('waits for the archive output stream to close', async () => {
    const output = new Writable({ write(_chunk, _encoding, done) { done() } })
    let completed = false
    const packageTask = createPackageAndWait({ createPackageWithOptions: async () => output }, 'source', 'archive.asar')
        .then(() => { completed = true })

    await new Promise(resolve => setImmediate(resolve))
    assert.equal(completed, false)
    output.end()
    await packageTask
    assert.equal(output.closed, true)
    assert.equal(completed, true)
})

test('creates a readable archive before returning', async t => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'hs-asar-test-'))
    t.after(() => fs.rmSync(root, { recursive: true, force: true }))
    const source = path.join(root, 'source')
    const archive = path.join(root, 'app.asar')
    fs.mkdirSync(source)
    fs.writeFileSync(path.join(source, 'build.txt'), 'ready')

    await createPackageAndWait(asar, source, archive)
    assert.equal(asar.extractFile(archive, 'build.txt').toString(), 'ready')
})

// The files an archive keeps outside itself, as paths with forward slashes.
function unpackedFiles(archive) {
    asar.uncache(archive)
    const found = []
    const walk = (node, dir) => {
        for (const [name, child] of Object.entries(node.files || {})) {
            const childPath = dir ? `${dir}/${name}` : name
            if (child.files) walk(child, childPath)
            else if (child.unpacked) found.push(childPath)
        }
    }
    walk(asar.getRawHeader(archive).header, '')
    return found.sort()
}

// A game-like folder: a bundle, and two native modules in different places.
function writeGameFiles(source) {
    const files = {
        'dist/out.js': 'game',
        'node_modules/native.js/index.js': 'loader',
        'node_modules/native.js/dist/win64/native.node': 'binary',
        'node_modules/native.js/dist/win64/steam_api64.dll': 'dll',
        'node_modules/native.js-helper/index.js': 'packed',
        'node_modules/plain/index.js': 'packed',
        'extra/addon/addon.node': 'binary'
    }
    for (const [file, content] of Object.entries(files)) {
        fs.mkdirSync(path.dirname(path.join(source, file)), { recursive: true })
        fs.writeFileSync(path.join(source, file), content)
    }
}

async function repack(t, originalOptions) {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'hs-asar-test-'))
    t.after(() => fs.rmSync(root, { recursive: true, force: true }))
    const source = path.join(root, 'source')
    const archive = path.join(root, 'game', 'app.asar')
    const extracted = path.join(root, 'extracted')
    writeGameFiles(source)
    await finished(await asar.createPackageWithOptions(source, archive, originalOptions))

    const original = unpackedFiles(archive)
    const dirs = readUnpackedDirs(asar, archive)
    asar.extractAll(archive, extracted)
    fs.writeFileSync(path.join(extracted, 'dist', 'out.js'), 'patched game')
    await createPackageAndWait(asar, extracted, archive, dirs)
    return { archive, original, dirs }
}

test('a repack keeps outside the archive the directories the original keeps outside', async t => {
    const { archive, original, dirs } = await repack(t, { unpackDir: '{node_modules/native.js,extra/addon}' })
    assert.deepEqual(dirs.sort(), ['extra/addon', 'node_modules/native.js'])
    assert.deepEqual(original, [
        'extra/addon/addon.node',
        'node_modules/native.js/dist/win64/native.node',
        'node_modules/native.js/dist/win64/steam_api64.dll',
        'node_modules/native.js/index.js'
    ])
    assert.deepEqual(unpackedFiles(archive), original)
    assert.equal(asar.extractFile(archive, 'dist/out.js').toString(), 'patched game')
    assert.equal(fs.readFileSync(path.join(`${archive}.unpacked`, 'extra', 'addon', 'addon.node'), 'utf-8'), 'binary')
})

test('a single directory outside the archive is kept, and not its neighbour of a longer name', async t => {
    const { archive, original, dirs } = await repack(t, { unpackDir: 'node_modules/native.js' })
    assert.deepEqual(dirs, ['node_modules/native.js'])
    assert.equal(original.length, 3)
    assert.deepEqual(unpackedFiles(archive), original)
})

test('files kept outside on their own stay outside, with their directory', async t => {
    const { archive, original, dirs } = await repack(t, { unpack: '*.node' })
    assert.deepEqual(original, ['extra/addon/addon.node', 'node_modules/native.js/dist/win64/native.node'])
    assert.deepEqual(dirs.sort(), ['extra/addon', 'node_modules/native.js/dist/win64'])
    assert.deepEqual(unpackedFiles(archive), [
        'extra/addon/addon.node',
        'node_modules/native.js/dist/win64/native.node',
        'node_modules/native.js/dist/win64/steam_api64.dll'
    ])
})

test('an archive with nothing outside is repacked with nothing outside', async t => {
    const { archive, dirs } = await repack(t, {})
    assert.deepEqual(dirs, [])
    assert.deepEqual(unpackedFiles(archive), [])
})
