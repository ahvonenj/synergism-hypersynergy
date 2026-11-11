const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const esbuild = require('esbuild');

async function main() {
    const root = path.resolve(__dirname, '../..');
    const state = { stored: [], acceptWrite: false, writes: 0, logs: [], beforeWrite() {} };
    const storage = {
        getData: () => structuredClone(state.stored),
        setData(_key, value) {
            state.beforeWrite();
            state.writes++;
            if (!state.acceptWrite) return false;
            state.stored = structuredClone(value);
            return true;
        },
    };
    const stubs = {
        'hs-module-registry': 'export const HSModuleRegistry = {getModule: () => globalThis.__strategyPersistenceTest.storage};',
        'hs-storage': 'export class HSStorage {}',
        'hs-global': "export const HSGlobal = {HSSettings: {strategiesKey: 'strategies'}};",
        'hs-logger': 'export const HSLogger = globalThis.__strategyPersistenceTest.logger;',
        'hs-ui': 'export const HSUI = {Notify() {}};',
    };
    const bundled = await esbuild.build({
        entryPoints: [path.join(root, 'src/mod/class/hs-modules/hs-autosing/hs-strategy-manager.ts')],
        bundle: true, write: false, platform: 'node', format: 'cjs',
        plugins: [{ name: 'strategy-storage-boundary', setup(build) {
            build.onResolve({ filter: /hs-[\w-]+$/ }, args => {
                const name = args.path.split('/').pop();
                if (stubs[name]) return { path: name, namespace: 'test' };
            });
            build.onLoad({ filter: /.*/, namespace: 'test' }, args => ({ contents: stubs[args.path], loader: 'ts' }));
        } }],
    });
    const originalState = globalThis.__strategyPersistenceTest;
    globalThis.__strategyPersistenceTest = { storage, logger: {
        log: message => state.logs.push(message), warn: message => state.logs.push(message),
        error: message => state.logs.push(message), debug() {},
    } };
    try {
        const runtime = new Module(path.join(root, 'strategy-persistence-test-runtime.cjs'), module);
        runtime.filename = path.join(root, 'strategy-persistence-test-runtime.cjs');
        runtime.paths = module.paths;
        runtime._compile(bundled.outputFiles[0].text, runtime.filename);
        const { HSStrategyManager: manager } = runtime.exports;
        const fixture = JSON.parse(fs.readFileSync(path.join(root, 'src/mod/resource/json/strategies/Basic v1.3-temp.json'), 'utf8'));
        const strategy = name => ({ ...structuredClone(fixture), strategyName: name });

        for (const operation of ['create', 'update', 'rename', 'delete']) {
            const existing = [strategy('Saved strategy'), strategy('Other strategy')];
            manager.setStrategies(existing);
            state.stored = structuredClone(existing);
            state.acceptWrite = false;
            state.logs = [];
            const before = structuredClone(existing);
            const draft = strategy(operation === 'create' ? 'New strategy' : operation === 'rename' ? 'Renamed strategy' : 'Saved strategy');
            draft.strategy[0].strat[0].comment = 'Edited draft';
            const draftBefore = structuredClone(draft);
            state.beforeWrite = () => {
                assert.equal(manager.getStrategies(), existing, `${operation}: memory stays unchanged until the write succeeds`);
                assert.deepEqual(manager.getStrategies(), before);
            };
            const execute = () => operation === 'delete'
                ? manager.deleteStrategyFromStorage('Saved strategy')
                : manager.saveStrategyToStorage(draft, operation === 'create' ? undefined : 'Saved strategy').saved;

            assert.equal(execute(), false, `${operation}: report write failure`);
            assert.equal(manager.getStrategies(), existing);
            assert.deepEqual(manager.getStrategies(), before);
            assert.deepEqual(state.stored, before);
            assert.deepEqual(draft, draftBefore, 'the editor draft is not changed by saving');
            assert.ok(!state.logs.some(message => message.includes('deleted.')), 'a failed deletion is not logged as successful');

            // A retry commits exactly once and survives reloading from storage.
            state.acceptWrite = true;
            assert.equal(execute(), true, `${operation}: retry succeeds`);
            assert.deepEqual(manager.getStrategies(), state.stored);
            assert.equal(state.stored.length, operation === 'create' ? 3 : operation === 'delete' ? 1 : 2);
            const committed = structuredClone(manager.getStrategies());
            manager.setStrategies(manager.parseStoredStrategies());
            assert.deepEqual(manager.getStrategies(), committed);
        }
        assert.equal(state.writes, 8);

        state.beforeWrite = () => {};
        const kept = strategy('Kept strategy');
        const malformed = [{ strategyName: 'Broken strategy', strategy: null }, null];
        state.stored = [kept, ...malformed];
        manager.setStrategies(manager.parseStoredStrategies());
        assert.deepEqual(manager.getStrategies(), [kept]);
        const added = strategy('Added strategy');
        assert.equal(manager.saveStrategyToStorage(added).saved, true);
        assert.deepEqual(state.stored, [kept, ...malformed, added]);
        assert.equal(manager.deleteStrategyFromStorage(kept.strategyName), true);
        assert.deepEqual(state.stored, [...malformed, added]);
        assert.deepEqual(manager.parseStoredStrategies(), [added]);

        state.stored = kept;
        manager.setStrategies(manager.parseStoredStrategies());
        assert.equal(manager.saveStrategyToStorage(added).saved, true);
        assert.deepEqual(state.stored, [kept, added], 'writing retains a legacy strategy stored outside an array');
        console.log('Passed strategy persistence checks for write failures, retries, mixed stored entries and the legacy single-strategy format.');
    } finally {
        if (originalState === undefined) delete globalThis.__strategyPersistenceTest;
        else globalThis.__strategyPersistenceTest = originalState;
    }
}

main().catch(error => { console.error(error); process.exitCode = 1; });
