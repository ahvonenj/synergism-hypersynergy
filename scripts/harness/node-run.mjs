// Bundles a TypeScript entry that imports the mod's code ('@repo/...' = src/mod) for node, with the modules that need
// the browser or the whole mod replaced by stubs, then runs it with the remaining arguments. No game, no Chrome.
// Usage: node scripts/harness/node-run.mjs <entry.ts> [args...]
// The entry picks its stubs with a comment in its first lines: // harness-stubs: gds | heater | <regex on file paths>
// Env: SWAP=<file name>=<path> bundles <path> in place of the repo's file of that name (a scratch copy to compare with)
import { spawnSync } from 'node:child_process'
import { mkdirSync, readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const require = createRequire(path.join(repo, 'package.json'))
const esbuild = require('esbuild')
const { PRESETS, loadStubs } = require('./scripts/harness/lib/node-stubs.cjs')

const [entry, ...args] = process.argv.slice(2)
if (!entry) { console.error('usage: node scripts/harness/node-run.mjs <entry.ts> [args...]'); process.exit(1) }
const directive = readFileSync(entry, 'utf8').split('\n').slice(0, 15).join('\n').match(/harness-stubs:\s*(\S+)/)?.[1]
const preset = PRESETS[directive] ?? { stubs: directive ? new RegExp(directive) : /^$/, banner: '' }
const [swapName, swapPath] = (process.env.SWAP ?? '').split('=')

const outDir = path.join(repo, 'local', 'harness-out', 'node')
mkdirSync(outDir, { recursive: true })
const outfile = path.join(outDir, path.basename(entry).replace(/\.ts$/, '') + '.mjs')

await esbuild.build({
    entryPoints: [entry], bundle: true, platform: 'node', format: 'esm', outfile,
    // Explicit: esbuild's lookup would otherwise pick up any stray tsconfig.json above a scratch folder
    tsconfig: path.join(repo, 'tsconfig.json'),
    nodePaths: [path.join(repo, 'node_modules')],
    alias: { '@repo': path.join(repo, 'src/mod') },
    define: { HS_DEV_BUILD: 'true', HS_BUILD_VERSION: '"harness"' },
    banner: { js: `${preset.banner} import { createRequire as __cr } from 'module'; const require = __cr(import.meta.url);` },
    logLevel: 'warning',
    plugins: [{
        name: 'harness-stubs',
        setup(build) {
            if (swapName && swapPath) build.onLoad({ filter: new RegExp(`[\\\\/]${swapName.replace(/\./g, '\\.')}$`) }, a => ({ loader: 'ts', contents: readFileSync(swapPath, 'utf8'), resolveDir: path.dirname(a.path) }))
            loadStubs(build, preset.stubs)
        },
    }],
})

// The entry ends with process.exit: something in the bundle keeps node alive otherwise
const run = spawnSync(process.execPath, [outfile, ...args], { stdio: 'inherit' })
process.exit(run.status ?? 1)
