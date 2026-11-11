const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');
const { checkLoaders } = require('../build-loaders.cjs');

const root = path.resolve(__dirname, '../..');
const loaderPath = 'src/loader';
const patcherPath = 'synergism_modloader/lib/patcher.js';
const read = file => fs.readFileSync(path.join(root, file), 'utf8');

test('published loaders match the shared source', () => checkLoaders());

for (const dev of [false, true]) {
    test(`${dev ? 'Dev' : 'Live'} bridge and bootstrap use the expected download chain`, () => {
        const suffix = dev ? 'dev' : 'user';
        const repo = dev ? 'maenhiir' : 'Ferlieloi';
        const loader = `${loaderPath}/hypersynergism.${suffix}.js`;
        const origin = dev ? 'http://127.0.0.1:8080' : `https://cdn.jsdelivr.net/gh/${repo}/synergism-hypersynergy@master`;
        const expected = [`${origin}/${loader}`, `${origin}/${patcherPath}`];
        const requests = [];
        const errors = [];
        const window = {};
        const context = vm.createContext({ window, console: { log() {}, error: (...args) => errors.push(args) },
            XMLHttpRequest: class {
                open(method, url, async) {
                    assert.equal(method, 'GET');
                    assert.equal(async, false);
                    assert.match(url, /\?t=\d+$/);
                    requests.push(url.split('?')[0]);
                }
                send() {
                    this.status = 200;
                    this.responseText = requests.length === 1 ? read(loader) :
                        'module.exports = { startBrowserLoader({ dev }) { window.startedDev = dev; window.HS_LOADER_INITIALIZED = true; } };';
                }
            },
        });
        vm.runInContext(read(`${loaderPath}/tampermonkey-bridge.${suffix}.js`), context);
        vm.runInContext(read(loader), context);
        assert.deepEqual(errors, []);
        assert.deepEqual(requests, expected);
        assert.equal(window.__HS_REPO, repo);
        assert.equal(window.__HS_VERSION, 'master');
        assert.equal(window.startedDev, dev);
    });
}
