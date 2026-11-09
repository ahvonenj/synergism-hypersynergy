const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const esbuild = require('esbuild');

// Run the real phase/action executor, migration and corruption controls against a small game boundary.
// The test-only methods expose private entry points in memory; the shipped class has none of them.
async function main() {
    const root = path.resolve(__dirname, '../..');
    const autosing = path.join(root, 'src/mod/class/hs-modules/hs-autosing/hs-autosing.ts');
    const stubs = {
        'hs-module': 'export class HSModule { constructor() { this.context = "Test"; } }',
        'hs-module-manager': 'export const HSModuleManager = { getModule() {} };',
        'hs-global': 'export const HSGlobal = { get exposedPlayer() { return globalThis.__corruptionTest.live ? globalThis.__corruptionTest.player : null; } };',
        'hs-logger': 'export const HSLogger = { debug() {}, log(msg) { globalThis.__corruptionTest?.logs?.push(msg); }, warn() {}, error() {} };',
        'hs-ui': 'export const HSUI = { Notify() {} };',
        'hs-settings': 'export const HSSettings = {};',
        'hs-gamedata-api': 'export class HSGameDataAPI {}',
        'hs-autosingModal': 'export class HSAutosingModal {}',
        'hs-autosingSettingsFixer': 'export class HSAutosingSettingsFixer {}',
        'hs-gamestate': 'export class HSGameState {} export class MainView {}',
        'hs-subtab-memory': 'export class HSSubtabMemory {}',
        'hs-game-dialogs': `export const HSGameDialogs = {
            isQueueIdle: () => !globalThis.__corruptionTest.confirmation,
            whenQueueIdle: () => { globalThis.__corruptionTest.dialogWaits++; return globalThis.__corruptionTest.confirmation; }
        };`,
        'hs-utils': `export const HSUtils = {
            sleepUntilElapsed: async () => { globalThis.__corruptionTest.beforeWait?.(); },
            waitForNextTack() { throw new Error('Corruption actions must not wait for a game tick'); }
        };`,
    };
    const bundled = await esbuild.build({
        stdin: { contents: `export { HSAutosing } from './src/mod/class/hs-modules/hs-autosing/hs-autosing';
            export { HSStrategyManager } from './src/mod/class/hs-modules/hs-autosing/hs-strategy-manager';
            export { SPECIAL_ACTION_BY_ID } from './src/mod/types/module-types/hs-autosing-types';`, resolveDir: root, loader: 'ts' },
        bundle: true, write: false, platform: 'node', format: 'cjs', define: { HS_DEV_BUILD: 'false' },
        plugins: [{ name: 'autosing-game-boundary', setup(build) {
            build.onResolve({ filter: /hs-[\w-]+$/ }, args => {
                const name = args.path.split('/').pop();
                if (stubs[name]) return { path: name, namespace: 'test' };
            });
            build.onLoad({ filter: /.*/, namespace: 'test' }, args => ({ contents: stubs[args.path], loader: 'ts' }));
            build.onLoad({ filter: /hs-autosing\.ts$/ }, () => ({
                contents: fs.readFileSync(autosing, 'utf8').replace('    init(): Promise<void> {', `
                    configureForTest(ascend: any, exit: any, action: any, progress: any) {
                        this.#autosingEnabled = true;
                        this.#corruptionManager = new HSAutosingCorruption();
                        this.#ascendBtn = ascend;
                        this.#exitAscBtn = exit;
                        this.#antSacrifice = action;
                        this.#exposedPlayer = HSGlobal.exposedPlayer;
                        this.#hasLivePlayer = !!this.#exposedPlayer;
                        this.#challengeProgressElements[2] = progress;
                    }
                    runPhaseForTest(phase: AutosingStrategyPhase) { return this.#executePhase(phase); }
                    runFinalStageForTest(aoagPhase: AutosingStrategyPhase) {
                        this.#strategy = { strategyName: 'Test', strategy: [], aoagPhase };
                        this.#strategyPhaseRanges = [];
                        this.#finalPhaseConfig = { startPhase: 'singularity', endPhase: 'end', strat: [] };
                        this.#ambrosiaSwitchesOff = true;
                        return this.#performFinalStage();
                    }
                    cancelForTest() { this.#autosingEnabled = false; }
                    init(): Promise<void> {`),
                loader: 'ts',
            }));
        } }],
    });
    const runtime = new Module(path.join(root, 'autosing-test-runtime.cjs'), module);
    runtime.filename = path.join(root, 'autosing-test-runtime.cjs');
    runtime.paths = module.paths;
    runtime._compile(bundled.outputFiles[0].text, runtime.filename);
    const { HSAutosing, HSStrategyManager, SPECIAL_ACTION_BY_ID } = runtime.exports;
    const step = (challengeNumber, extra = {}) => ({
        challengeNumber, challengeCompletions: 0, challengeWaitTime: 0, challengeMaxTime: 0, ...extra,
    });
    const phase = steps => ({ startPhase: 'challenge10', endPhase: 'end', strat: steps });
    const originalDocument = globalThis.document;
    const originalWindow = globalThis.window;
    const originalState = globalThis.__corruptionTest;
    let scenarios = 0;
    try {
        globalThis.window = {};
        const setup = ({ next = 5, used = 5, cap = 100, live = true, confirm = false, challenge = 0 } = {}) => {
            const state = globalThis.__corruptionTest = {
                player: { corruptions: { next, used }, currentChallenge: { ascension: challenge } },
                live, events: [], logs: [], dialogWaits: 0, c15Coins: 42, savedC15Score: 0,
            };
            const progress = { textContent: challenge ? 'Challenge 15: 42' : '' };
            const input = {
                value: String(next),
                dispatchEvent(event) {
                    assert.equal(event.type, 'change');
                    state.player.corruptions.next = Math.min(cap, Math.max(0, Math.floor(Number(input.value))));
                    input.value = String(state.player.corruptions.next);
                    state.events.push(['select', state.player.corruptions.next]);
                },
            };
            globalThis.document = { getElementById: id => id === 'corruptionLevelInput' ? input : null };
            const apply = () => {
                state.player.corruptions.used = state.player.corruptions.next;
                state.c15Coins = 0;
                state.events.push(['ascend', state.player.corruptions.used]);
            };
            const ascend = {
                matches: () => true,
                click() {
                    if (!confirm) return apply();
                    state.confirmation = new Promise(resolve => { state.confirm = () => {
                        apply(); state.confirmation = undefined; resolve();
                    }; });
                },
            };
            const exit = {
                matches: () => true,
                click() {
                    if (!state.player.currentChallenge.ascension) return;
                    state.savedC15Score = state.c15Coins;
                    state.player.currentChallenge.ascension = 0;
                    progress.textContent = '';
                    ascend.click();
                },
            };
            const runner = new HSAutosing({});
            runner.configureForTest(ascend, exit, { click: () => state.events.push(['action', state.player.corruptions.used]) }, progress);
            return { runner, state };
        };

        // A migrated phase starts with its requested level, with exactly one ascension.
        const migrated = HSStrategyManager.normalizeCorruptions({ strategyName: 'legacy', strategy: [
            { startPhase: 'start', endPhase: 'challenge10', strat: [step(152)] },
            { ...phase([step(152)]), corruptionLevel: 20 },
        ] });
        let { runner, state } = setup();
        await runner.runPhaseForTest(migrated.strategy[1]);
        assert.deepEqual(state.events, [['select', 20], ['ascend', 20], ['action', 20]]);
        assert.equal(state.dialogWaits, 0);
        scenarios++;

        // Explicit immediate mode also applies a pending level, regardless of the unused completions field.
        ({ runner, state } = setup());
        await runner.runPhaseForTest(phase([step(403, { corruptionLevel: 20, ascendAfterCorruption: true, challengeCompletions: 1 }), step(152)]));
        assert.deepEqual(state.events, [['select', 20], ['ascend', 20], ['action', 20]]);
        scenarios++;

        // Load-only changes `next` without resetting, leaving C15 and its coins untouched until an explicit exit.
        for (const live of [true, false]) for (const challenge of [0, 15]) {
            ({ runner, state } = setup({ live, challenge, confirm: true }));
            const loadOnly = phase([step(403, { corruptionLevel: 20, ascendAfterCorruption: false }), step(152)]);
            await runner.runPhaseForTest(loadOnly);
            await runner.runPhaseForTest(loadOnly);
            assert.deepEqual(state.events, [['select', 20], ['action', 5], ['action', 5]]);
            assert.equal(state.player.corruptions.next, 20);
            assert.equal(state.player.corruptions.used, 5);
            assert.equal(state.player.currentChallenge.ascension, challenge);
            assert.equal(state.c15Coins, 42);
            assert.equal(state.dialogWaits, 0);
            const applyLater = runner.runPhaseForTest(phase([step(403, { corruptionLevel: 20, ascendAfterCorruption: true }), step(152)]));
            state.confirm();
            await applyLater;
            assert.deepEqual(state.events.slice(-2), [['ascend', 20], ['action', 20]]);
            if (challenge) assert.equal(state.savedC15Score, 42);
            scenarios++;
        }

        // A plain Ascend following load-only applies the selected level, exactly once.
        ({ runner, state } = setup());
        await runner.runPhaseForTest(phase([
            step(403, { corruptionLevel: 20, ascendAfterCorruption: false }), step(104), step(152),
        ]));
        assert.deepEqual(state.events, [['select', 20], ['ascend', 20], ['action', 20]]);
        scenarios++;

        // Load-only uses the game's cap without applying the clamped level yet.
        ({ runner, state } = setup({ cap: 12 }));
        await runner.runPhaseForTest(phase([step(403, { corruptionLevel: 20, ascendAfterCorruption: false }), step(152)]));
        assert.deepEqual(state.events, [['select', 12], ['action', 5]]);
        scenarios++;

        // Ordinary phase passes preserve the current run, including C15's coins, with no implicit reset.
        ({ runner, state } = setup({ challenge: 15 }));
        await runner.runPhaseForTest(phase([step(152)]));
        await runner.runPhaseForTest(phase([step(152)]));
        assert.deepEqual(state.events, [['action', 5], ['action', 5]]);
        assert.equal(state.c15Coins, 42);
        assert.equal(state.player.currentChallenge.ascension, 15);
        scenarios++;

        // An explicit Ascend still resets once before the following action.
        ({ runner, state } = setup());
        await runner.runPhaseForTest(phase([step(104), step(152)]));
        assert.deepEqual(state.events, [['ascend', 5], ['action', 5]]);
        scenarios++;

        // AOAG's hard-coded level 0 is applied before its actions, even outside a challenge.
        for (const challenge of [0, 15]) {
            ({ runner, state } = setup({ challenge }));
            await runner.runFinalStageForTest(phase([step(152)]));
            assert.deepEqual(state.events, [
                ['select', 0], ['ascend', 0], ['action', 0], ['ascend', 0],
            ], 'only the corruption reset and the explicit end-of-singularity reset should run');
            if (challenge) assert.equal(state.savedC15Score, 42);
            scenarios++;
        }

        // A stop while the AOAG reset is confirming must not run the AOAG or final phase afterwards.
        ({ runner, state } = setup({ confirm: true }));
        const stoppedFinal = runner.runFinalStageForTest(phase([step(152)]));
        runner.cancelForTest();
        state.confirm();
        await stoppedFinal;
        assert.deepEqual(state.events, [['select', 0], ['ascend', 0]]);
        scenarios++;

        // A corruption change inside C15 exits it before resetting, preserving the score; the old Exit step is a no-op.
        for (const live of [true, false]) {
            ({ runner, state } = setup({ challenge: 15, live }));
            await runner.runPhaseForTest(phase([
                step(403, { corruptionLevel: 20 }), ...(live ? [step(103)] : []), step(152),
            ]));
            assert.deepEqual(state.events, [['select', 20], ['ascend', 20], ['action', 20]]);
            assert.equal(state.savedC15Score, 42);
            assert.equal(state.player.currentChallenge.ascension, 0);
            scenarios++;
        }

        // Selecting an already pending level must still apply it to the current ascension.
        ({ runner, state } = setup({ next: 20, used: 5 }));
        await runner.runPhaseForTest(phase([step(403, { corruptionLevel: 20 }), step(152)]));
        assert.deepEqual(state.events, [['ascend', 20], ['action', 20]]);
        scenarios++;

        // A set-level action in the middle of a phase resets before the following action.
        ({ runner, state } = setup());
        await runner.runPhaseForTest(phase([step(152), step(403, { corruptionLevel: 20 }), step(152)]));
        assert.deepEqual(state.events, [['action', 5], ['select', 20], ['ascend', 20], ['action', 20]]);
        scenarios++;

        // The game's cap wins, on both the live-player and bookmarklet paths, including repeated phase passes.
        for (const live of [true, false]) {
            ({ runner, state } = setup({ cap: 12, live }));
            const capped = phase([step(403, { corruptionLevel: 20 }), step(152)]);
            await runner.runPhaseForTest(capped);
            await runner.runPhaseForTest(capped);
            assert.deepEqual(state.events, [
                ['select', 12], ['ascend', 12], ['action', 12],
                ['select', 12], ['ascend', 12], ['action', 12],
            ]);
            scenarios++;
        }

        // With an asynchronous game confirmation, no following action runs before the reset finishes.
        ({ runner, state } = setup({ confirm: true }));
        const pending = runner.runPhaseForTest(phase([step(403, { corruptionLevel: 20 }), step(152)]));
        assert.deepEqual(state.events, [['select', 20]]);
        assert.equal(state.dialogWaits, 1);
        state.confirm();
        await pending;
        assert.deepEqual(state.events, [['select', 20], ['ascend', 20], ['action', 20]]);
        scenarios++;

        // An IF with a max jumps jumps that many times, then goes on (one log line); the count restarts at each pass.
        ({ runner, state } = setup());
        state.player.challenge15Exponent = 10;
        const cappedLoop = phase([
            step(152),
            step(200, { ifJump: { id: 'cap', ifJumpMode: 'challenges', ifJumpChallenge: 15, ifJumpOperator: '<', ifJumpValue: 100, ifJumpIndex: 0, ifJumpMaxJumps: 3 } }),
            step(104),
        ]);
        const onePass = [['action', 5], ['action', 5], ['action', 5], ['action', 5], ['ascend', 5]];
        await runner.runPhaseForTest(cappedLoop);
        assert.deepEqual(state.events, onePass);
        await runner.runPhaseForTest(cappedLoop);
        assert.deepEqual(state.events, [...onePass, ...onePass]);
        assert.equal(state.logs.filter(line => line.includes('max jumps (3) reached')).length, 2);
        scenarios++;

        // A false condition never counts: the IF still jumps 3 times after it.
        ({ runner, state } = setup());
        state.player.challenge15Exponent = 10;
        const gated = structuredClone(cappedLoop);
        gated.strat.unshift(step(200, { ifJump: { id: 'never', ifJumpMode: 'challenges', ifJumpChallenge: 15, ifJumpOperator: '>', ifJumpValue: 100, ifJumpIndex: 3, ifJumpMaxJumps: 1 } }));
        gated.strat[2].ifJump.ifJumpIndex = 1;
        await runner.runPhaseForTest(gated);
        assert.deepEqual(state.events, onePass);
        assert.equal(state.logs.length, 1);
        scenarios++;

        // A stop during the leading step's wait must not select a level or ascend afterwards.
        ({ runner, state } = setup());
        state.beforeWait = () => runner.cancelForTest();
        await runner.runPhaseForTest(phase([step(403, { corruptionLevel: 20, challengeWaitBefore: 100 }), step(152)]));
        assert.deepEqual(state.events, []);
        scenarios++;

        // Retired action 404 migrates in both regular and AOAG phases, retaining targets, waits and IF indices.
        const old = { strategyName: 'old effective targets', strategy: [phase([
            step(404, { corruptionLevel: 20, challengeWaitBefore: 50, comment: 'target' }),
            step(200, { ifJump: { id: 'jump', ifJumpIndex: 0 } }),
        ])], aoagPhase: phase([step(404, { corruptionLevel: 50 })]) };
        const normalized = HSStrategyManager.normalizeCorruptions(old);
        assert.equal(normalized.strategy[0].strat[0].challengeNumber, 403);
        assert.equal(normalized.strategy[0].strat[0].corruptionLevel, 20);
        assert.equal(normalized.strategy[0].strat[0].ascendAfterCorruption, true);
        assert.equal(normalized.strategy[0].strat[0].challengeWaitBefore, 50);
        assert.equal(normalized.strategy[0].strat[0].comment, 'target');
        assert.equal(normalized.strategy[0].strat[1].ifJump.ifJumpIndex, 0);
        assert.equal(normalized.aoagPhase.strat[0].challengeNumber, 403);
        assert.equal(normalized.aoagPhase.strat[0].corruptionLevel, 50);
        assert.equal(normalized.aoagPhase.strat[0].ascendAfterCorruption, true);
        assert.deepEqual(HSStrategyManager.normalizeCorruptions(normalized), normalized);
        assert.equal(old.strategy[0].strat[0].challengeNumber, 404, 'normalization must not mutate its input');
        assert.equal(SPECIAL_ACTION_BY_ID.has(404), false);
        scenarios++;

        const deferred = HSStrategyManager.normalizeCorruptions({ strategyName: 'deferred', strategy: [phase([
            step(403, { corruptionLevel: 20, ascendAfterCorruption: false }), step(403, { corruptionLevel: 50 }),
        ])] });
        assert.equal(deferred.strategy[0].strat[0].ascendAfterCorruption, false);
        assert.equal(deferred.strategy[0].strat[1].ascendAfterCorruption, true);
        assert.deepEqual(HSStrategyManager.normalizeCorruptions(JSON.parse(JSON.stringify(deferred))), deferred);
        scenarios++;

        // Strategies from before the game's 4.4.0: removed steps pull later IF targets up, the step added at a
        // phase's start pushes them down. Each step reads [action, level, IF target].
        const legacy = { strategyName: 'legacy', corruptionLoadouts: [{ name: 'Push', level: 12 }, { name: 'Bad', level: -1 }], strategy: [
            { ...phase([
                step(402),
                step(400),
                step(202, { loadoutName: 'Push' }),
                step(202, { loadoutName: 'Gone' }),
                step(401),
                step(200, { ifJump: { id: 'a', ifJumpIndex: 4 } }),
                step(200, { ifJump: { id: 'a2', ifJumpIndex: 3 } }),
            ]), corruptionLoadoutName: 'Push' },
            { ...phase([step(401), step(200, { ifJump: { id: 'b', ifJumpIndex: 0 } })]), corruptionLevel: 30 },
            { ...phase([step(401), step(152), step(200, { ifJump: { id: 'c', ifJumpIndex: 1 } })]), corruptionLoadoutName: null },
            { ...phase([step(202, { loadoutName: 'Bad', comment: 'kept' }), step(200, { ifJump: { id: 'd', ifJumpIndex: 0 } })]),
                corruptionLoadoutName: 'Missing', corruptionLevel: 7 },
            { ...phase([step(152)]), corruptions: [1, 2, 3, 4, 5, 6, 7, 8] },
            phase([step(401), step(152)]),
        ], aoagPhase: { ...phase([step(401), step(400)]), corruptionLevel: 50 } };
        const converted = HSStrategyManager.normalizeCorruptions(legacy);
        const steps = entry => entry.strat.map(action => [action.challengeNumber, action.corruptionLevel, action.ifJump?.ifJumpIndex]);
        assert.deepEqual(converted.strategy.map(steps), [
            // First phase: its level isn't added (autosing starts at 0); the jump to the 401 step still reaches it,
            // and a jump to a removed step (it did nothing) goes to the step after it
            [[403, 0, undefined], [403, 12, undefined], [403, 12, undefined], [200, undefined, 2], [200, undefined, 2]],
            [[403, 30, undefined], [403, 30, undefined], [200, undefined, 1]],
            // An empty level: its 401 step did nothing and goes
            [[152, undefined, undefined], [200, undefined, 0]],
            // A missing loadout name keeps the phase's level; a loadout with an invalid level gives 0
            [[403, 7, undefined], [403, 0, undefined], [200, undefined, 1]],
            // 8 corruption values don't make one level: 0, to set in the editor
            [[403, 0, undefined], [152, undefined, undefined]],
            // Current format: no phase level
            [[152, undefined, undefined]],
        ]);
        assert.deepEqual(steps(converted.aoagPhase), [[403, 50, undefined], [403, 0, undefined]]);
        assert.equal(converted.strategy[0].strat[1].comment, 'Push', 'a loadout step keeps its name as comment');
        assert.equal(converted.strategy[3].strat[1].comment, 'kept');
        for (const entry of [...converted.strategy, converted.aoagPhase]) {
            assert.ok(!('corruptionLevel' in entry) && !('corruptionLoadoutName' in entry) && !('corruptions' in entry));
            assert.ok(entry.strat.every(action => !('loadoutName' in action)));
            assert.ok(entry.strat.filter(action => action.challengeNumber === 403).every(action => action.ascendAfterCorruption === true));
        }
        assert.ok(!('corruptionLoadouts' in converted));
        assert.equal(HSStrategyManager.hasLegacyCorruptions(legacy), true);
        assert.equal(HSStrategyManager.hasLegacyCorruptions(converted), false);
        assert.deepEqual(HSStrategyManager.normalizeCorruptions(converted), converted);
        scenarios++;

        const directory = path.join(root, 'src/mod/resource/json/strategies');
        for (const filename of fs.readdirSync(directory).filter(name => name.endsWith('.json') && name !== 'manifest.json')) {
            const strategy = JSON.parse(fs.readFileSync(path.join(directory, filename), 'utf8'));
            HSStrategyManager.validateStrategy(strategy);
            for (const entry of [...strategy.strategy, strategy.aoagPhase].filter(Boolean)) {
                assert.ok(entry.strat.every(action => action.challengeNumber !== 404), filename);
                assert.ok(entry.strat.filter(action => action.challengeNumber === 403).every(action => action.ascendAfterCorruption === true), filename);
            }
            const invalid = structuredClone(strategy);
            const corruption = invalid.strategy.flatMap(entry => entry.strat).find(action => action.challengeNumber === 403);
            corruption.ascendAfterCorruption = 'false';
            assert.throws(() => HSStrategyManager.validateStrategy(invalid), /corruption ascension option/);
            const ifStep = strategy.strategy.flatMap(entry => entry.strat).find(action => action.ifJump);
            if (ifStep) for (const bad of [-1, 1.5, '5']) {
                const badMax = structuredClone(strategy);
                badMax.strategy.flatMap(entry => entry.strat).find(action => action.ifJump).ifJump.ifJumpMaxJumps = bad;
                assert.throws(() => HSStrategyManager.validateStrategy(badMax), /invalid max jumps/, `${filename}: ${bad}`);
            }
            scenarios++;
        }
        console.log(`Passed ${scenarios} Autosing corruption scenarios.`);
    } finally {
        if (originalDocument === undefined) delete globalThis.document;
        else globalThis.document = originalDocument;
        if (originalWindow === undefined) delete globalThis.window;
        else globalThis.window = originalWindow;
        if (originalState === undefined) delete globalThis.__corruptionTest;
        else globalThis.__corruptionTest = originalState;
    }
}

main().catch(error => { console.error(error); process.exitCode = 1; });
