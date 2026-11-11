const esbuild = require('esbuild');
const fs = require('node:fs');
const path = require('node:path');

// A virtual module, rather than a once-built define: changes to the worker and its imports also rebuild it in dev.
module.exports = function heaterWorkerPlugin({ entryPoint = 'src/mod/class/hs-modules/hs-heater/hs-heater-optimizer-worker.ts',
    minify = false, plugins = [], define = {} } = {}) {
    return {
        name: 'heater-worker-source',
        setup(build) {
            build.onResolve({ filter: /^hs-heater-worker-source$/ }, () => ({ path: 'source', namespace: 'heater-worker' }));
            build.onLoad({ filter: /.*/, namespace: 'heater-worker' }, async () => {
                const root = build.initialOptions.absWorkingDir ?? process.cwd();
                const result = await esbuild.build({
                    absWorkingDir: root, entryPoints: [entryPoint], bundle: true, write: false,
                    platform: 'browser', format: 'iife', minify, legalComments: 'none', logLevel: 'silent',
                    plugins, define, metafile: true,
                });
                const watchFiles = Object.keys(result.metafile.inputs)
                    .map(file => path.resolve(root, file.replace(/^inline:/, '')))
                    .filter(file => fs.existsSync(file));
                return { contents: `export default ${JSON.stringify(result.outputFiles[0].text)};`, loader: 'js', watchFiles };
            });
        },
    };
};
