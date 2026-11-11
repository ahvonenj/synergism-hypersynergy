const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')
const {
    workspacePaths,
    ensureNoRunningWorkGames,
    prepareWorkspace,
    promoteWorkspace,
    discardExtractionInputs,
    cleanupOldWorkspaces,
    removeBestEffort
} = require('../lib/workspaceManager')

function gameDir(t) {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'hs-workspace-test-'))
    t.after(() => fs.rmSync(dir, { recursive: true, force: true }))
    return dir
}

test('repeated patches replace one active folder without creating numbered copies', async t => {
    const root = gameDir(t)
    const dirs = workspacePaths(root)

    prepareWorkspace(root)
    fs.writeFileSync(path.join(dirs.staging, 'build.txt'), 'first')
    await promoteWorkspace(dirs)
    assert.equal(fs.readFileSync(path.join(dirs.active, 'build.txt'), 'utf8'), 'first')

    prepareWorkspace(root)
    fs.writeFileSync(path.join(dirs.staging, 'build.txt'), 'second')
    await promoteWorkspace(dirs)
    assert.equal(fs.readFileSync(path.join(dirs.active, 'build.txt'), 'utf8'), 'second')
    assert.equal(fs.readFileSync(path.join(dirs.previous, 'build.txt'), 'utf8'), 'first')
    assert.equal(removeBestEffort(dirs.previous), true)
    assert.deepEqual(fs.readdirSync(root), ['__hs_work_current'])
})

test('an interrupted swap restores the previous working copy', async t => {
    const root = gameDir(t)
    const dirs = workspacePaths(root)
    fs.mkdirSync(dirs.active)
    fs.writeFileSync(path.join(dirs.active, 'build.txt'), 'working')
    await assert.rejects(promoteWorkspace(dirs), /ENOENT/)
    assert.equal(fs.readFileSync(path.join(dirs.active, 'build.txt'), 'utf8'), 'working')

    fs.renameSync(dirs.active, dirs.previous)
    prepareWorkspace(root)
    assert.equal(fs.readFileSync(path.join(dirs.active, 'build.txt'), 'utf8'), 'working')
})

test('retries a temporary Windows lock when activating a patch', async t => {
    const root = gameDir(t)
    const dirs = prepareWorkspace(root)
    const rename = fs.promises.rename
    let attempts = 0
    fs.promises.rename = async (...args) => {
        if (attempts++ < 3) {
            const error = new Error('temporarily locked')
            error.code = 'EPERM'
            throw error
        }
        return rename(...args)
    }
    try {
        await promoteWorkspace(dirs)
        assert.equal(attempts, 4)
        assert.equal(fs.existsSync(dirs.active), true)
    } finally {
        fs.promises.rename = rename
    }
})
test('legacy numbered folders are removed without touching current, staging, previous, or unrelated folders', async t => {
    const root = gameDir(t)
    const dirs = workspacePaths(root)
    fs.mkdirSync(dirs.active)
    fs.mkdirSync(dirs.staging)
    fs.mkdirSync(dirs.previous)
    fs.mkdirSync(path.join(root, '__hs_work_1785433843173_739326'))
    fs.mkdirSync(path.join(root, '__hs_work_1790534836286_164623'))
    fs.mkdirSync(path.join(root, '__hs_work_123'))
    fs.mkdirSync(path.join(root, '__hs_work_custom'))
    fs.writeFileSync(path.join(root, '__hs_work_111_222'), '')
    const result = await cleanupOldWorkspaces(root)
    assert.deepEqual(result, { found: 2, removed: 2, failed: 0, error: null })
    assert.deepEqual(fs.readdirSync(root), [
        '__hs_work_111_222', '__hs_work_123', '__hs_work_current', '__hs_work_custom', '__hs_work_previous', '__hs_work_staging'
    ])
})

test('cleanup waits for the running-game check and leaves locked folders for retry', async t => {
    const root = gameDir(t)
    const locked = path.join(root, '__hs_work_123_456')
    const free = path.join(root, '__hs_work_789_012')
    fs.mkdirSync(locked)
    fs.mkdirSync(free)
    await assert.rejects(cleanupOldWorkspaces(root, null, {
        beforeRemove: () => { throw new Error('game is running') }
    }), /game is running/)
    assert.equal(fs.existsSync(locked), true)
    assert.equal(fs.existsSync(free), true)

    const result = await cleanupOldWorkspaces(root, null, {
        remove: async dir => {
            if (dir === locked) throw Object.assign(new Error('in use'), { code: 'EPERM' })
            await fs.promises.rm(dir, { recursive: true })
        }
    })
    assert.deepEqual(result, { found: 2, removed: 1, failed: 1, error: null })
    assert.equal(fs.existsSync(locked), true)
    assert.equal(fs.existsSync(free), false)
})

test('finished patch keeps the game and discards extraction inputs', async t => {
    const root = gameDir(t)
    const dirs = prepareWorkspace(root)
    fs.mkdirSync(path.join(dirs.staging, 'app'))
    fs.writeFileSync(path.join(dirs.staging, 'app', 'game.exe'), '')
    fs.mkdirSync(path.join(dirs.staging, 'asar'))
    fs.writeFileSync(path.join(dirs.staging, 'asar', 'out.js'), '')
    fs.mkdirSync(path.join(dirs.staging, '$PLUGINSDIR'))

    discardExtractionInputs(dirs.staging)
    assert.deepEqual(fs.readdirSync(dirs.staging), ['app'])
    await promoteWorkspace(dirs)
    assert.equal(fs.existsSync(path.join(dirs.active, 'app', 'game.exe')), true)
})

test('patching stops when an existing patched game is running', async () => {
    const run = (_command, _args, _options, callback) => callback(null, '2\r\n')
    await assert.rejects(
        ensureNoRunningWorkGames('C:\\Games\\Synergism', { platform: 'win32', run }),
        /Close the running patched Synergism game/
    )
})
