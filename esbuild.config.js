const esbuild = require('esbuild');
const inlineImport = require('esbuild-plugin-inline-import');

const baseOptions = {
    entryPoints: ['src/mod/index.ts'],
    bundle: true,
    outfile: 'out.js',
    plugins: [
        inlineImport({
            filter: /^inline:/
        })
    ],
    legalComments: 'none',
    logLevel: 'info'
};

// Build function with environment-specific options
async function build(env) {
    try {
        const options = {
            ...baseOptions,
            outfile: env === 'release' ? 'release/mod/hypersynergism_release.js' : 'build/hypersynergism.js',
            minify: env === 'release',
            sourcemap: false,
        };

        if (env === 'dev') {
            // For watch mode
            const ctx = await esbuild.context(options);
            await ctx.watch();
        } else {
            // For build and release
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
