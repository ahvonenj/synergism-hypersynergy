const assert = require('node:assert/strict');
const path = require('node:path');
const Module = require('node:module');
const esbuild = require('esbuild');

// Pure save/settings comparisons only: no game, DOM, timers, or network.
const root = path.resolve(__dirname, '../..');
const bundle = esbuild.buildSync({
    entryPoints: [path.join(root, 'src/mod/class/hs-modules/hs-autosing/hs-autosing-settings-plan.ts')],
    bundle: true, write: false, platform: 'node', format: 'cjs',
});
const runtime = new Module(path.join(root, 'autosing-settings-test.cjs'), module);
runtime.filename = path.join(root, 'autosing-settings-test.cjs');
runtime._compile(bundle.outputFiles[0].text, runtime.filename);
const { captureAutosingSettings: capture, getAutosingGameSettings: requirements,
    planAutosingSettings: plan, HS_AUTOSING_BUY_AMOUNTS: amounts } = runtime.exports;
const config = { cubeOpeningPercent: 80, tesseractBuyPercent: 50, challengeStart: 0.1, challengeExit: 0.2, challengeEnter: 0.1 };
const settings = requirements(config);
function put(save, path, value) {
    const keys = path.split('.');
    let target = save;
    for (const key of keys.slice(0, -1)) target = target[key] ??= {};
    target[keys.at(-1)] = value;
}
function fixture() {
    const save = { toggles: [], autoTesseracts: [], autoChallengeToggles: [], progress: 123 };
    for (const setting of settings) put(save, setting.path, setting.target);
    return save;
}
const values = changes => new Map(changes.map(({ setting, value }) => [setting.path, value]));

assert.equal(new Set(settings.map(s => s.path)).size, settings.length, 'each saved setting has one owner');
const correct = fixture();
assert.deepEqual(plan(settings, capture(correct, settings)), [], 'already correct settings require no action');
assert.equal(correct.toggles[9], undefined, 'unmanaged toggles are untouched');

// Mix enabled/disabled autobuyers, enums and numeric settings, regardless of their UI appearance.
const mixed = fixture();
for (const [path, value] of [
    ['toggles.1', false], ['toggles.15', true], ['autoTesseracts.3', false],
    ['ants.toggles.autoSacrificeEnabled', true], ['resetToggleModes.ascension', 0],
    ['autoResearchMode', 'manual'], ['autoOpenPlatonicsCubes', false], ['openPlatonicsCubes', 17],
    ['autoChallengeToggles.7', false], ['blueberryLoadoutMode', 'saveTree'], ['coinbuyamount', 10],
    ['autoChallengeTimer.exit', 1.75], ['runeSpiritBuyAmount', 42], ['corruptions.autoIncrease', true],
]) put(mixed, path, value);
const before = structuredClone(mixed);
const original = capture(mixed, settings);
const fixes = plan(settings, original);
assert.equal(fixes.length, 14);
assert.equal(values(fixes).get('toggles.1'), true);
assert.equal(values(fixes).get('toggles.15'), false);
assert.equal(values(fixes).get('autoResearchMode'), 'cheapest');
assert.equal(values(fixes).get('autoChallengeTimer.exit'), 0.2);
assert.deepEqual(mixed, before, 'reading and planning must not mutate a save');
for (const { setting, value } of fixes) put(mixed, setting.path, value);
assert.deepEqual(plan(settings, capture(mixed, settings)), []);

// Preserve the first snapshot through a restart and later strategy changes, including settings
// that did not need a startup correction. Changes to progress never become restoration actions.
put(mixed, 'autoAscend', true);
put(mixed, 'hepteracts.quark.AUTO', true);
put(mixed, 'toggles.33', true);
mixed.progress = 999;
const afterRun = capture(mixed, settings);
const restore = plan(settings, afterRun, original);
assert.equal(restore.length, 16);
assert.equal(values(restore).get('autoAscend'), false);
assert.equal(values(restore).get('hepteracts.quark.AUTO'), false);
for (const { setting, value } of restore) put(mixed, setting.path, value);
assert.deepEqual(capture(mixed, settings), original);
assert.equal(mixed.progress, 999);
assert.equal(mixed.toggles[33], true);
assert.deepEqual(plan(settings, capture(mixed, settings), original), [], 'restoration is idempotent');

// Snapshot values are independent of subsequent mutation of the parsed save.
put(mixed, 'autoChallengeTimer.exit', 9);
assert.equal(original.get('autoChallengeTimer.exit'), 1.75);
for (const amount of amounts.keys()) {
    const save = fixture();
    put(save, 'coinbuyamount', amount);
    const snapshot = capture(save, settings);
    assert.equal(snapshot.get('coinbuyamount'), amount);
    if (amount !== 100000) assert.equal(values(plan(settings, capture(fixture(), settings), snapshot)).get('coinbuyamount'), amount);
}

// Refuse unknown state before planning a blind toggle. No coercion of strings, null, or absent fields.
for (const [path, value] of [
    ['toggles.1', undefined], ['toggles.2', 'false'], ['autoTesseracts.1', null],
    ['ants.toggles.autoSacrificeEnabled', 0], ['resetToggleModes.ascension', 2],
    ['autoResearchMode', 'unknown'], ['coinbuyamount', 7], ['openCubes', NaN],
    ['autoChallengeTimer.start', Infinity], ['runeBlessingBuyAmount', -1],
]) {
    const save = fixture();
    put(save, path, value);
    assert.throws(() => capture(save, settings), error => error.message.includes(path), path);
}
assert.throws(() => capture({}, settings), /Unrecognized saved settings/);
assert.throws(() => plan(settings, new Map()), /Missing setting/);
assert.throws(() => plan(settings, original, new Map()), /Missing setting/);

// Configuration is read afresh on a restart; restoration still targets the original values.
const changed = requirements({ ...config, cubeOpeningPercent: 20, challengeStart: 2 });
const delta = values(plan(changed, capture(fixture(), changed)));
assert.equal(delta.size, 5);
assert.equal(delta.get('openCubes'), 20);
assert.equal(delta.get('autoChallengeTimer.start'), 2);
assert.deepEqual(capture(before, changed), original);
console.log(`Passed AutoSing settings planning and restoration checks (${settings.length} managed settings).`);
