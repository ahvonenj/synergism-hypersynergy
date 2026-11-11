const assert = require('node:assert/strict');
const path = require('node:path');
const Module = require('node:module');
const esbuild = require('esbuild');

// The perk search's text matching (docs/features/perks-find.md).
async function main() {
    const root = path.resolve(__dirname, '../..');
    const bundled = await esbuild.build({
        entryPoints: [path.join(root, 'src/mod/class/hs-modules/hs-perks-find/hs-perks-find-match.ts')],
        bundle: true, write: false, platform: 'node', format: 'cjs',
    });
    const runtime = new Module(path.join(root, 'perks-find-match-test-runtime.cjs'), module);
    runtime._compile(bundled.outputFiles[0].text, runtime.filename = path.join(root, 'perks-find-match-test-runtime.cjs'));
    const { matchesSearch, normalizeSearchText, searchTerms } = runtime.exports;
    const found = (text, query) => matchesSearch(normalizeSearchText(text), searchTerms(query));

    // Terms: spaces of any kind and any number, none is no search
    assert.deepEqual(searchTerms('  Cube   QUARK\t'), ['cube', 'quark']);
    assert.deepEqual(searchTerms('   '), []);

    // At the start of a word, not inside one: the real false hits of "ant" in the perks' texts
    assert.equal(found('Irish Ants', 'ant'), true);
    assert.equal(found('Antiquities of Ant God', 'ant'), true);
    for (const text of ['guaranteed free levels', 'Instant', 'grants', 'Accountants']) {
        assert.equal(found(text, 'ant'), false, text);
    }
    // Further in the text than a first match inside a word
    assert.equal(found('Instant ant speed', 'ant'), true);

    // The game's symbols and punctuation start a word
    assert.equal(found('Cool QoL ⬢ Cubes', 'cubes'), true);
    assert.equal(found('Wow! ⬢Cube Automated Shipping', 'cube'), true);
    assert.equal(found('(Hepteract) forge', 'hepteract'), true);
    assert.equal(found('Golden ❂ Quarks', 'quark'), true);

    // Numbers: a digit before doesn't start a word
    assert.equal(found('up to 900%', '900'), true);
    assert.equal(found('up to 1900%', '900'), false);

    // Every term has to be found, in any order
    assert.equal(found('Automatically buy Cube Upgrades', 'cube auto'), true);
    assert.equal(found('Automatically buy Cube Upgrades', 'cube quark'), false);

    // Case and accents, both ways
    assert.equal(found('Éternelles Ascensions', 'eternelles'), true);
    assert.equal(found('Eternal Ascensions', 'ÉTERNAL'), true);
    assert.equal(found('Куб Вау', 'куб'), true);
    assert.equal(found('Мощный куб', 'уб'), false);

    // Without word gaps: any position
    assert.equal(found('每次飞升获得立方体', '立方'), true);
    assert.equal(found('キューブを開ける', 'ーブ'), true);
    // A Latin term in these languages: right after their characters counts as a word start, inside a Latin word doesn't
    assert.equal(found('获得GQ', 'gq'), true);
    assert.equal(found('获得 GQ', 'gq'), true);
    assert.equal(found('获得AGQ', 'gq'), false);

    console.log('perks find matching: OK');
}

main().catch(error => {
    console.error(error);
    process.exit(1);
});
