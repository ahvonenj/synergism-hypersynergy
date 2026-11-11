// The esbuild stubs that let the mod's code run in node: node-run.mjs and the tests that bundle GDS share them.
const { readFileSync } = require('node:fs')

const PRESETS = {
    // HSGameDataAPI's formulas on a save: the module system, the UI, settings and the GDS engine are stubbed
    gds: {
        stubs: /(hs-ui|hs-logger|hs-module-manager|[\\/]hs-gamedata|hs-settings|hs-storage)\.ts$/,
        banner: `globalThis.window ??= globalThis; globalThis.document ??= new Proxy({}, { get: () => () => null });`,
    },
    // The heater optimizer: its input builder runs, the UI around it is stubbed. hs-utils is stubbed too, so the
    // entry wraps the Decimal fields itself.
    heater: {
        stubs: /(hs-ui-components|hs-settings|hs-icons|hs-utils|hs-heater-icon-store|hs-heater-result-store)\.ts$/,
        banner: '',
    },
}

// Each stubbed module keeps its export names (a CommonJS Proxy would lose named imports), all bound to one
// Proxy that answers anything. Its `then` is undefined, or an `await` on it would hang.
function loadStubs(build, stubs) {
    build.onLoad({ filter: stubs }, a => {
        const names = [...readFileSync(a.path, 'utf8').matchAll(/export\s+(?:abstract\s+)?(?:class|const|function|let|enum)\s+(\w+)/g)].map(m => m[1])
        return {
            loader: 'js',
            contents: `const s = new Proxy(function () {}, { get: (t, k) => k === 'then' ? undefined : s, apply: () => s, construct: () => s });\n`
                + names.map(n => `export const ${n} = s;`).join('\n'),
        }
    })
}

module.exports = { PRESETS, loadStubs }
