const assert = require('node:assert/strict');
const path = require('node:path');
const Module = require('node:module');
const esbuild = require('esbuild');

async function main() {
    const root = path.resolve(__dirname, '../..');
    const bundle = await esbuild.build({
        stdin: {
            contents: `export { serializeHeaterOptimizerResult } from './src/mod/class/hs-modules/hs-heater/hs-heater-optimizer-result';
                export { getHeaterTypeEntries } from './src/mod/class/hs-modules/hs-heater/hs-heater-result-config';`,
            resolveDir: root, loader: 'ts',
        },
        bundle: true, write: false, platform: 'node', format: 'cjs',
    });
    const runtime = new Module(path.join(root, 'heater-result-test-runtime.cjs'), module);
    runtime.filename = path.join(root, 'heater-result-test-runtime.cjs');
    runtime.paths = module.paths;
    runtime._compile(bundle.outputFiles[0].text, runtime.filename);
    const { serializeHeaterOptimizerResult, getHeaterTypeEntries } = runtime.exports;
    const affordable = {
        kind: 'affordable', loadoutJson: '{"ambrosiaLuck1":1}',
        blueberryCost: 1, cost: 100, effect: '1.25', p4x4Eq: '', isMaxed: false,
    };
    const limits = { ambrosia: true, blueberries: false };
    const shortfall = { blueberries: { need: 3, have: 2 }, atLeast: true };
    const base = [affordable.loadoutJson, null, 1, 100, '1.25', '', false];
    const unavailable = ['Unaffordable', null, 'N / A', 'N / A', 'N / A', 'N / A', false];
    const expectedTitle = [...base];
    expectedTitle[8] = 'Penalty relief';
    const expectedPreview = [...base];
    expectedPreview[9] = '{"example":1}';
    const examples = [
        [{ ...affordable, maxedReference: '{"example":1}' }, expectedPreview],
        [affordable, base],
        [{ ...affordable, limits }, [...base, limits]],
        [{ ...affordable, effectTitle: 'Penalty relief' }, expectedTitle],
        [{ ...affordable, limits, effectTitle: 'Penalty relief' }, [...base, limits, 'Penalty relief']],
        [{ kind: 'unaffordable', isMaxed: false }, unavailable],
        [{ kind: 'unaffordable', isMaxed: false, shortfall }, [...unavailable, shortfall]],
    ];
    const input = { marker: 'input identity' };
    const metadata = { luck: 100, mLuck: 2, luckConversion: 10, totalRedLuck: 50, rLuckEffectRatio: 1.1 };
    for (const [key] of getHeaterTypeEntries()) {
        const rows = examples.map(([row]) => structuredClone(row));
        const before = structuredClone(rows);
        const result = serializeHeaterOptimizerResult({ input, [key]: rows, redAmbCommonValues: metadata });
        assert.deepEqual(result[key], examples.map(([, expected]) => expected), `${key}: legacy row shape`);
        assert.equal(result.input, input);
        assert.equal(result.redAmbCommonValues, metadata);
        assert.deepEqual(Object.keys(result), ['input', key, 'redAmbCommonValues']);
        assert.deepEqual(rows, before, 'serialization must not mutate named results');
    }
    console.log('Passed Heater result format checks for every branch, optional details, sparse titles and metadata.');
}

main().catch(error => { console.error(error); process.exitCode = 1; });
