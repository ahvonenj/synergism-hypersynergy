const test = require('node:test');
const assert = require('node:assert');
const path = require('path');
const { pathToFileURL } = require('url');

const root = path.resolve(__dirname, '..', '..');

// The rules: docs/dev/releasing.md, "Merging a Live release into Dev". The versions come from the real merges.
async function load() {
    return import(pathToFileURL(path.join(root, 'scripts/merge-live-plan.mjs')).href);
}

test('only a file that cannot reach the bundle counts as safe, an unknown one counts as code', async () => {
    const { isNotBundleSource } = await load();
    for (const safe of ['docs/dev/releasing.md', 'doc/proj/hs-social-logo.png', 'guides/autosing.md',
        'scripts/tests/test-version-tags.cjs', 'scripts/release-and-tag-helper.mjs', 'AGENTS.md', '.github/workflows/x.yml',
        'release/mod/hypersynergism_release.js']) {
        assert.equal(isNotBundleSource(safe), true, safe);
    }
    for (const code of ['src/mod/index.ts', 'esbuild.config.js', 'tsconfig.json', 'package.json', 'package-lock.json',
        'scripts/heater-worker-plugin.cjs', 'scripts/generate-strategy-manifest.js', 'release/loader/loader.js',
        'synergism_modloader/lib/patcher.js', 'something-new/file.js', 'src/mod/README.md']) {
        assert.equal(isNotBundleSource(code), false, code);
    }
});

test('a version bump in the package files is not code, a dependency is', async () => {
    const { devCodeFiles, withoutVersion } = await load();
    const pkg = (version, dep) => JSON.stringify({ name: 'x', version, dependencies: { a: dep } });
    assert.equal(withoutVersion(pkg('1.0.0', '^1')), withoutVersion(pkg('2.0.0-dev1', '^1')));
    assert.notEqual(withoutVersion(pkg('1.0.0', '^1')), withoutVersion(pkg('1.0.0', '^2')));

    const lock = (version, inner) => JSON.stringify({ version, packages: { '': { version }, 'node_modules/a': { version: inner } } });
    assert.equal(withoutVersion(lock('1.0.0', '3.0.0')), withoutVersion(lock('2.0.0', '3.0.0')));
    assert.notEqual(withoutVersion(lock('1.0.0', '3.0.0')), withoutVersion(lock('1.0.0', '3.0.1')));

    const changed = ['docs/a.md', 'package.json', 'package-lock.json', 'scripts/tests/a.cjs'];
    assert.deepEqual(devCodeFiles(changed, ['package.json', 'package-lock.json']), []);
    assert.deepEqual(devCodeFiles(changed, ['package-lock.json']), ['package.json']);
    assert.deepEqual(devCodeFiles(['src/mod/a.ts', 'docs/a.md'], []), ['src/mod/a.ts']);
});

test('setting the version leaves a dependency of the same version alone', async () => {
    const { withVersion } = await load();
    const lock = JSON.stringify({ version: '2.14.7', packages: { '': { version: '2.14.7' }, 'node_modules/a': { version: '2.14.7' } } });
    const written = withVersion(lock, '2.14.7a-dev1');
    const parsed = JSON.parse(written);
    assert.equal(parsed.version, '2.14.7a-dev1');
    assert.equal(parsed.packages[''].version, '2.14.7a-dev1');
    assert.equal(parsed.packages['node_modules/a'].version, '2.14.7');
    assert.ok(written.endsWith('}\n'));
});

test("Live's highest tag skips dev names and loader tags", async () => {
    const { highestStableTag } = await load();
    const line = (tag) => `abc123\trefs/tags/${tag}\nabc124\trefs/tags/${tag}^{}\n`;
    const output = ['v2.9.0', 'v2.14.7a', 'v2.14.7', 'v2.14.3-dev', 'v2.14.7c-dev4', 'loader-v9.9.9', 'v2.14.7c', 'v2.10.0'].map(line).join('');
    assert.equal(highestStableTag(output), 'v2.14.7c');
    assert.equal(highestStableTag(line('loader-v1.0.0')), '');
    assert.equal(highestStableTag(''), '');
});

test('a carried build number: the real merges', async () => {
    const { carriedVersion } = await load();
    assert.equal(carriedVersion('2.14.4c', '2.14.4b-dev5', new Set(['2.14.4b-dev5'])), '2.14.4c-dev6');
    assert.equal(carriedVersion('2.14.4e', '2.14.4d-dev8', new Set(['2.14.4d-dev8'])), '2.14.4e-dev9');
    assert.equal(carriedVersion('2.14.5', '2.14.4e-dev9', new Set(['2.14.4e-dev9'])), '2.14.5-dev10');
    assert.equal(carriedVersion('2.14.6', '2.14.5-dev12', new Set(['2.14.5-dev12'])), '2.14.6-dev13');
});

test('a build number never released stays, a taken one is skipped', async () => {
    const { carriedVersion, restartedVersion } = await load();
    assert.equal(carriedVersion('2.14.7d', '2.14.7c-dev1', new Set()), '2.14.7d-dev1');
    assert.equal(carriedVersion('2.14.7d', '2.14.7c-dev1', new Set(['2.14.7c-dev1'])), '2.14.7d-dev2');
    assert.equal(carriedVersion('2.14.7d', '2.14.7c-dev1', new Set(['2.14.7c-dev1', '2.14.7d-dev2'])), '2.14.7d-dev3');
    assert.equal(carriedVersion('2.14.8', '2.14.7', new Set()), '2.14.8-dev1');
    assert.equal(restartedVersion('2.14.7c'), '2.14.7c-dev1');
    assert.equal(restartedVersion('2.14.7c', new Set(['2.14.7c-dev1'])), '2.14.7c-dev2');
});
