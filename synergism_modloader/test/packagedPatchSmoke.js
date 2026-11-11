// Run with ELECTRON_RUN_AS_NODE=1 and the packaged launcher executable.
// Arguments: app.asar, original Synergism exe, 7z.exe.
const assert = require('node:assert/strict')
const fs = require('node:fs')
const rawFs = require('original-fs')
const os = require('node:os')
const path = require('node:path')

async function main() {
    const [, , archivePath, sourceExe, sevenZipPath] = process.argv
    if (!archivePath || !sourceExe || !sevenZipPath || !process.versions.electron) {
        throw new Error('Run this with the packaged Electron executable and three paths: app.asar, Synergism exe, 7z.exe.')
    }
    const { patchGame } = require(path.join(path.resolve(archivePath), 'lib', 'patchGame.js'))
    const fixture = fs.mkdtempSync(path.join(os.tmpdir(), 'hs-packaged-patch-smoke-'))
    const gameDir = path.join(fixture, 'Synergism')
    const originalNoAsar = process.noAsar

    try {
        fs.mkdirSync(gameDir)
        fs.copyFileSync(sourceExe, path.join(gameDir, 'Synergism-win-x64.exe'))
        for (let run = 1; run <= 3; run++) {
            console.log(`Patch ${run}/3`)
            const result = await patchGame({
                gameDir,
                exeName: 'Synergism-win-x64.exe',
                sevenZipPath,
                modUrl: 'https://example.invalid/hypersynergism_release.js',
                onLog: line => {
                    if (/^(Starting|Extracting|Repacking|Patch complete|Could not|Old patch folders)/.test(line)) console.log(line)
                }
            })
            assert.equal(fs.existsSync(result.launchExePath), true)
            assert.equal(process.noAsar, originalNoAsar)
            assert.deepEqual(
                fs.readdirSync(gameDir).filter(name => name.startsWith('__hs_work')),
                ['__hs_work_current']
            )
        }
        console.log('PASS: three packaged patches; no staging, previous, or numbered folders remain.')
    } finally {
        const resolvedFixture = path.resolve(fixture)
        const tempRoot = path.resolve(os.tmpdir()) + path.sep
        if (!resolvedFixture.startsWith(tempRoot) || !path.basename(resolvedFixture).startsWith('hs-packaged-patch-smoke-')) {
            throw new Error(`Refusing to remove unexpected fixture path: ${resolvedFixture}`)
        }
        rawFs.rmSync(resolvedFixture, { recursive: true, force: true, maxRetries: 8, retryDelay: 250 })
    }
}

main().catch(error => {
    console.error(error)
    process.exitCode = 1
})
