const fs = require('node:fs');
const path = require('node:path');
const esbuild = require('esbuild');

const root = path.resolve(__dirname, '..');
const sourceDir = path.join(root, 'src/loader/shared');
const patcherPath = 'synergism_modloader/lib/patcher.js';
const bridgePath = 'src/loader/tampermonkey-bridge.user.js';

function bundle(options) {
    return esbuild.buildSync({
        absWorkingDir: root,
        bundle: true,
        charset: 'utf8',
        legalComments: 'none',
        write: false,
        ...options,
    }).outputFiles[0].text;
}

function userscriptHeader({ name, version, description, author, update }) {
    const updateUrl = `https://cdn.jsdelivr.net/gh/Ferlieloi/synergism-hypersynergy@master/${bridgePath}`;
    return [
        '// ==UserScript==',
        `// @name         ${name}`,
        '// @namespace    https://github.com/Ferlieloi',
        `// @version      ${version}`,
        `// @description  ${description}`,
        ...(author ? [`// @author       ${author}`] : []),
        '// @match        https://synergism.cc/*',
        '// @match        https://pseudo-corp.github.io/SynergismOfficial/*',
        '// @grant        none',
        '// @run-at       document-start',
        ...(update ? [`// @updateURL    ${updateUrl}`, `// @downloadURL  ${updateUrl}`] : []),
        ...(!author ? ['// @license      MIT'] : []),
        '// ==/UserScript==',
        '',
        '// Generated from src/loader/shared by npm run build:loaders.',
    ].join('\n');
}

function generateLoaders() {
    const versions = JSON.parse(fs.readFileSync(path.join(sourceDir, 'userscript-versions.json'), 'utf8'));
    const outputs = new Map([[patcherPath, bundle({
        entryPoints: ['src/loader/shared/patcher-entry.cjs'],
        format: 'cjs',
        banner: { js: '// Generated from src/loader/shared by npm run build:loaders.' },
    })]]);

    for (const dev of [false, true]) {
        const suffix = dev ? 'dev' : 'user';
        const options = {
            format: 'iife',
            stdin: { resolveDir: sourceDir, loader: 'js' },
        };
        const bridgeHeader = userscriptHeader({
            name: `HyperSynergism Bridge Loader${dev ? ' (Local Dev)' : ''}`,
            version: dev ? versions.devBridge : versions.liveBridge,
            description: dev ? 'Loads the local game loader synchronously at document-start' : 'Bridge to the official HyperSynergism mod',
            author: dev ? 'Developer' : 'Ferlieloi',
            update: !dev,
        });
        outputs.set(`src/loader/tampermonkey-bridge.${suffix}.js`, bundle({
            ...options,
            banner: { js: bridgeHeader },
            stdin: {
                ...options.stdin,
                sourcefile: 'bridge-entry.js',
                contents: `import { runBridge } from './userscript-entry.mjs';
import { defaultRepo } from './loader-urls.mjs';
const repo = defaultRepo(${dev});
const version = 'master';
runBridge(${dev}, repo, version);`,
            },
        }));
        outputs.set(`src/loader/hypersynergism.${suffix}.js`, bundle({
            ...options,
            banner: { js: userscriptHeader({
                name: 'HyperSynergism Loader',
                version: versions.bootstrap,
                description: 'Official loader for HyperSynergism mod',
            }) },
            stdin: {
                ...options.stdin,
                sourcefile: 'loader-entry.js',
                contents: `import { runBrowserLoader } from './userscript-entry.mjs'; runBrowserLoader(${dev});`,
            },
        }));
    }
    return outputs;
}

function writeLoaders(directory = root) {
    for (const [file, code] of generateLoaders()) {
        const destination = path.join(directory, file);
        fs.mkdirSync(path.dirname(destination), { recursive: true });
        if (!fs.existsSync(destination) || fs.readFileSync(destination, 'utf8') !== code) {
            fs.writeFileSync(destination, code);
        }
    }
}

function checkLoaders() {
    const stale = [];
    for (const [file, code] of generateLoaders()) {
        const destination = path.join(root, file);
        if (!fs.existsSync(destination) || fs.readFileSync(destination, 'utf8').replace(/\r\n/g, '\n') !== code) stale.push(file);
    }
    if (stale.length) throw new Error(`Regenerate loader files with npm run build:loaders: ${stale.join(', ')}`);
}

if (require.main === module) {
    if (process.argv[2] === '--check') checkLoaders();
    else writeLoaders();
}

module.exports = { writeLoaders, checkLoaders, sourceDir };
