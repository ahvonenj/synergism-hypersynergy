const esbuild = require('esbuild');
const inlineImport = require('esbuild-plugin-inline-import');
const fs = require('fs');
const path = require('path');
const heaterWorkerPlugin = require('./scripts/heater-worker-plugin.cjs');
const { writeLoaders, checkLoaders, sourceDir: loaderSourceDir } = require('./scripts/build-loaders.cjs');

const baseOptions = {
    entryPoints: ['src/mod/index.ts'],
    bundle: true,
    outfile: 'out.js',
    legalComments: 'none',
    logLevel: 'info',
    // 'node esbuild.config.js dev' needs to be restarted in order to pick up changes to the version
    define: {
        HS_BUILD_VERSION: JSON.stringify(require('./package.json').version)
    }
};

// Present in the dev tools' code (ids, CSS, storage), which must never reach the release bundle
const DEV_ONLY_MARKER = 'hs-dev-tools';

// JavaScript minification leaves the contents of embedded strings alone.
async function compactInlineAsset(contents, { path: filename }) {
    switch (path.extname(filename)) {
        case '.json':
            return JSON.stringify(JSON.parse(contents));
        case '.css': {
            const { code } = await esbuild.transform(contents, {
                loader: 'css',
                sourcefile: filename,
                minifyWhitespace: true,
                legalComments: 'inline',
            });
            return code;
        }
        default:
            return contents;
    }
}

// Build function with environment-specific options
async function build(env) {
    // Always generate the strategy manifest before building
    try {
        require('child_process').execSync('node scripts/generate-strategy-manifest.js', { stdio: 'inherit' });
    } catch (err) {
        console.error('Failed to generate strategy manifest:', err);
        process.exit(1);
    }
    try {
        const assetPlugins = [inlineImport({
            filter: /^inline:/,
            transform: env === 'release' ? compactInlineAsset : undefined,
        })];
        const options = {
            ...baseOptions,
            plugins: [...assetPlugins, heaterWorkerPlugin({
                minify: env === 'release', plugins: assetPlugins, define: baseOptions.define,
            })],
            outfile: env === 'release' ? 'release/mod/hypersynergism_release.js' : 'build/hypersynergism.js',
            minify: env === 'release',
            sourcemap: false,
            define: {
                ...baseOptions.define,
                // False in the release build only: code under `if (HS_DEV_BUILD)` (the dev tools) is left out of it
                HS_DEV_BUILD: JSON.stringify(env !== 'release'),
            },
        };

        const loaderBuildDir = path.join(__dirname, 'build');
        if (env === 'release') checkLoaders();
        else writeLoaders(loaderBuildDir);

        if (env === 'dev') {
            fs.watch(loaderSourceDir, () => {
                try {
                    writeLoaders(loaderBuildDir);
                } catch (error) {
                    console.error('Loader build failed:', error);
                }
            });
            console.log('Watching shared loader source for changes...');
            // For watch mode
            const ctx = await esbuild.context(options);
            await ctx.watch();
        } else if (env === 'release') {
            // Built in memory first: the bundle players get is only written once it's checked to hold no dev-only code
            const result = await esbuild.build({ ...options, write: false });
            const output = result.outputFiles[0];
            if (output.text.includes(DEV_ONLY_MARKER)) {
                console.error(`Release build refused: dev-only code ("${DEV_ONLY_MARKER}") ended up in the bundle. ${path.relative(__dirname, output.path)} was not written.`);
                process.exit(1);
            }
            fs.writeFileSync(output.path, output.contents);
            console.log(`Build completed for ${env} environment`);
        } else {
            await esbuild.build(options);
            console.log(`Build completed for ${env} environment`);
        }
    } catch (err) {
        console.error('Build failed:', err);
        process.exit(1);
    }
}

// Get environment from command line args
const env = process.argv[2] || 'build';
build(env);
