const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const Module = require('node:module');
const esbuild = require('esbuild');

// The mod's version check (hs-version-tags.ts) and the release helper (release-version-tags.mjs) must sort tags
// the same way: the helper picks the tag to release after, the mod tells players an update is out.
async function main() {
    const root = path.resolve(__dirname, '../..');
    const helper = await import(pathToFileURL(path.join(root, 'scripts/release-version-tags.mjs')).href);
    const bundled = await esbuild.build({
        entryPoints: [path.join(root, 'src/mod/class/hs-core/github/hs-version-tags.ts')],
        bundle: true, write: false, platform: 'node', format: 'cjs',
    });
    const runtime = new Module(path.join(root, 'version-tags-test-runtime.cjs'), module);
    runtime._compile(bundled.outputFiles[0].text, runtime.filename = path.join(root, 'version-tags-test-runtime.cjs'));
    const { compareVersionTags, latestVersionTag, isCurrentVersionLatest } = runtime.exports;

    // The repo's tags, with the loader's, plus shapes not tagged yet
    const tags = `loader-v0.2.10 loader-v0.2.4 loader-v0.2.9 v2.9.0 v2.10.0 v2.10.2 v2.10.2c
        v2.11.0-dev4 v2.11.0-dev9 v2.11.0-dev10 v2.11.0-dev15 v2.12.1-dev1 v2.12.2 v2.12.4 v2.12.4-dev1 v2.12.4-dev2
        v2.12.4-dev10 v2.13.0 v2.13.0-dev1 v2.13.1 v2.13.1-dev0 v2.13.5 v2.13.5b v2.13.5c v2.13.5d v2.13.9 v2.14.0
        v2.14.0a v2.14.1-dev v2.14.2-dev v2.14.3 v2.14.3-dev v2.14.3a v2.14.4 v2.14.4-dev3 v2.14.4a v2.14.4b
        v2.14.4b-dev1 v2.14.4b-dev5 v2.14.4c v2.14.4c-dev6 v2.14.4d v2.14.4d-dev8 v2.14.4e v2.14.4e-dev9 v2.14.5
        v2.14.5-dev10 v2.14.5-dev12 v2.14.6 v2.14.6a v2.14.6a-dev1 v2.14.6a-dev4 v2.14.7 v2.14.7-dev1 v2.14.7-dev1.2
        v2.14.7-rc1 v3.0.0 v10.0.0`.split(/\s+/);
    let scenarios = 0;

    // git tag and git ls-remote --tags output: v dropped, peeled tags once, loader tags left out
    const versions = helper.parseTagList(tags.join('\n'));
    assert.equal(versions.length, tags.filter(tag => tag.startsWith('v')).length);
    assert.ok(versions.every(version => /^\d/.test(version)));
    const remote = 'abc123\trefs/tags/v2.14.7\nabc124\trefs/tags/v2.14.7^{}\nabc125\trefs/tags/loader-v0.2.10\nabc126\trefs/tags/v2.14.6a-dev4';
    assert.deepEqual(helper.parseTagList(remote), ['2.14.7', '2.14.6a-dev4']);
    scenarios++;

    // Same order on every pair; the helper sees the versions without "v", the mod the tags as GitHub lists them
    for (const a of versions) {
        for (const b of versions) {
            assert.equal(Math.sign(helper.compareVersions(a, b)), Math.sign(compareVersionTags(`v${a}`, `v${b}`)), `${a} vs ${b}`);
            assert.equal(Math.sign(compareVersionTags(a, b)), Math.sign(compareVersionTags(`v${a}`, `v${b}`)), `${a} vs ${b} without v`);
        }
    }
    scenarios++;

    // The documented order (docs/features/version-check.md)
    const ascending = ['2.9.0', '2.10.0', '2.10.2', '2.10.2c', '2.14.4-dev3', '2.14.4a', '2.14.4b', '2.14.4b-dev1',
        '2.14.4b-dev5', '2.14.4c', '2.14.5-dev10', '2.14.5-dev12', '2.14.7', '2.14.7-dev1', '2.14.7-dev1.2', '3.0.0', '10.0.0'];
    assert.deepEqual(helper.semverSort([...ascending].reverse().sort()), [...ascending].reverse());
    assert.deepEqual([...ascending].sort().sort(compareVersionTags), ascending);
    scenarios++;

    // Players: stable tags only, or dev builds too on the Dev channel; a dev build of the latest release is current
    const entries = [...tags.filter(tag => tag !== 'v3.0.0' && tag !== 'v10.0.0'), 'not a tag'].map(name => ({ name }));
    assert.equal(latestVersionTag([...entries, null, { name: 42 }]), 'v2.14.7');
    assert.equal(latestVersionTag(entries, true), 'v2.14.7-rc1');
    assert.equal(latestVersionTag(entries.filter(entry => entry.name !== 'v2.14.7-rc1'), true), 'v2.14.7-dev1.2');
    assert.equal(latestVersionTag(entries.filter(entry => !entry.name.startsWith('v2.14.7'))), 'v2.14.6a');
    assert.equal(latestVersionTag([{ name: 'loader-v9.0.0' }]), null);
    assert.equal(isCurrentVersionLatest('v2.14.7-dev1', 'v2.14.7'), true);
    assert.equal(isCurrentVersionLatest('v2.14.7', 'v2.14.7'), true);
    assert.equal(isCurrentVersionLatest('v2.14.6a-dev4', 'v2.14.7'), false);
    scenarios++;

    console.log(`Passed ${scenarios} version tag scenarios.`);
}

main().catch(error => { console.error(error); process.exitCode = 1; });
