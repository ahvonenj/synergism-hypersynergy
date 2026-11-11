const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const esbuild = require('esbuild');

async function main() {
    const root = path.resolve(__dirname, '../..');
    const stubs = {
        'hs-module-registry': 'export const HSModuleRegistry = {getModule: () => globalThis.__strategyValidationTest.storage};',
        'hs-storage': 'export class HSStorage {}',
        'hs-global': "export const HSGlobal = {HSSettings: {strategiesKey: 'strategies'}};",
        'hs-logger': 'export const HSLogger = globalThis.__strategyValidationTest.logger;',
        'hs-ui': 'export const HSUI = {Notify() {}};',
    };
    const bundle = await esbuild.build({
        entryPoints: [path.join(root, 'src/mod/class/hs-modules/hs-autosing/hs-strategy-manager.ts')],
        bundle: true, write: false, platform: 'node', format: 'cjs',
        plugins: [{ name: 'strategy-boundary', setup(build) {
            build.onResolve({ filter: /hs-[\w-]+$/ }, args => {
                const name = args.path.split('/').pop();
                if (stubs[name]) return {path: name, namespace: 'test'};
            });
            build.onLoad({filter: /.*/, namespace: 'test'}, args => ({contents: stubs[args.path], loader: 'ts'}));
        }}],
    });
    let stored, writes = 0;
    const warnings = [];
    const previous = globalThis.__strategyValidationTest;
    globalThis.__strategyValidationTest = {
        storage: {getData: () => structuredClone(stored), setData() { writes++; return true; }},
        logger: {warn: message => warnings.push(message), log() {}, error() {}, debug() {}},
    };
    try {
        const runtime = new Module(path.join(root, 'strategy-validation-runtime.cjs'), module);
        runtime.filename = path.join(root, 'strategy-validation-runtime.cjs');
        runtime.paths = module.paths;
        runtime._compile(bundle.outputFiles[0].text, runtime.filename);
        const {HSStrategyManager: manager} = runtime.exports;
        const directory = path.join(root, 'src/mod/resource/json/strategies');
        const fixture = JSON.parse(fs.readFileSync(path.join(directory, 'Basic v1.3-temp.json'), 'utf8'));
        const valid = () => ({...structuredClone(fixture), strategyName: 'Validation check'});
        const first = s => s.strategy[0].strat[0];
        let checks = 0;
        const invalidCases = [
            s => {s.strategyName = 7;}, s => {s.strategyName = ' ';}, s => {s.strategy = {};},
            s => {s.strategy[0] = null;}, s => {s.strategy[0].strat = {};}, s => {s.strategy[0].startPhase = 'unknown';},
            s => {s.strategy[0].strat[0] = {};}, s => {s.strategy[0].strat[0] = null;},
            s => {first(s).challengeNumber = 123456;}, s => {first(s).challengeNumber = 1.5;},
            s => {s.aoagPhase.strat[0].challengeNumber = 16;}, s => {first(s).comment = {};},
            s => {s.corruptionLoadouts = [null];}, s => {first(s).ifJump = [];},
            s => {first(s).challengeNumber = 200; delete first(s).ifJump;},
            s => {first(s).challengeNumber = 403; first(s).corruptionLevel = -1;},
        ];
        for (const field of ['challengeCompletions', 'challengeWaitBefore', 'challengeWaitTime', 'challengeMaxTime']) {
            for (const value of ['invalid', null, -1, Infinity, NaN]) invalidCases.push(s => {first(s)[field] = value;});
        }
        for (const mutate of invalidCases) {
            const s = valid(); mutate(s);
            assert.throws(() => manager.validateStrategy(s), Error);
            assert.throws(() => manager.saveStrategyToStorage(s), Error);
            checks++;
        }
        for (const value of [null, false, 7, 'strategy', []]) assert.throws(() => manager.validateStrategy(value), /must be an object/);
        assert.equal(writes, 0, 'invalid strategies never reach storage');

        const jumpStrategy = () => {
            const s = valid();
            s.strategy[0].strat[0] = {challengeNumber: 200, ifJump: {
                id: 'jump', ifJumpMode: 'challenges', ifJumpChallenge: 15, ifJumpOperator: '<', ifJumpValue: 1e110, ifJumpIndex: 0,
            }};
            return s;
        };
        for (const [key, values] of Object.entries({
            id: ['', 7], ifJumpMode: ['unknown', null], ifJumpChallenge: [0, 16, 1.5],
            ifJumpOperator: ['=', ''], ifJumpValue: ['1', null, Infinity], ifJumpIndex: [-1, 0.5, 1e6, '0'],
        })) for (const value of values) {
            const s = jumpStrategy(); first(s).ifJump[key] = value;
            assert.throws(() => manager.validateStrategy(s), /step 1/); checks++;
        }
        const s = jumpStrategy();
        delete first(s).ifJump.ifJumpMode;
        const before = structuredClone(s);
        assert.equal(first(manager.validateStrategy(s)).ifJump.ifJumpMode, 'challenges');
        assert.deepEqual(s, before, 'validation normalizes a copy');
        for (const destination of [0, 1, s.strategy[0].strat.length]) {
            first(s).ifJump.ifJumpIndex = destination;
            manager.validateStrategy(s); // backward jumps and the end-of-phase sentinel remain valid
        }
        first(s).ifJump.ifJumpMode = 'stored_c15';
        first(s).ifJump.ifJumpMultiplier = -2.5;
        delete first(s).ifJump.ifJumpValue;
        manager.validateStrategy(s);
        first(s).ifJump.ifJumpMultiplier = Infinity;
        assert.throws(() => manager.validateStrategy(s), /multiplier/);

        const legacy = valid();
        first(legacy).challengeNumber = 404;
        first(legacy).corruptionLevel = 20;
        delete first(legacy).ascendAfterCorruption;
        legacy.strategy.push(legacy.aoagPhase);
        delete legacy.aoagPhase;
        const migrated = manager.validateStrategy(legacy);
        assert.equal(first(migrated).challengeNumber, 403);
        assert.equal(first(migrated).ascendAfterCorruption, true);
        assert.equal(migrated.aoagPhase.phaseId, 'aoag');
        for (const file of fs.readdirSync(directory).filter(f => f.endsWith('.json') && f !== 'manifest.json')) {
            manager.validateStrategy(JSON.parse(fs.readFileSync(path.join(directory, file), 'utf8')));
        }
        const bad = valid(); first(bad).challengeNumber = 123456;
        stored = [valid(), bad, null];
        const diskBefore = structuredClone(stored);
        assert.equal(manager.parseStoredStrategies().length, 1, 'one bad stored strategy does not hide valid strategies');
        assert.equal(warnings.length, 2);
        assert.deepEqual(stored, diskBefore, 'invalid stored entries are kept for repair');
        assert.equal(writes, 0);
        console.log(`Passed ${checks} invalid-strategy checks, IF boundaries, normalization, legacy formats, all default strategies and mixed stored data.`);
    } finally {
        if (previous === undefined) delete globalThis.__strategyValidationTest;
        else globalThis.__strategyValidationTest = previous;
    }
}

main().catch(error => {console.error(error); process.exitCode = 1;});
