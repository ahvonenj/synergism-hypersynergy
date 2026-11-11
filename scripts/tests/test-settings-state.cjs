const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const esbuild = require('esbuild');

async function main() {
    const root = path.resolve(__dirname, '../..');
    const bundled = await esbuild.build({
        stdin: {contents: `export * from './src/mod/class/hs-core/settings/hs-settings-state';
            export {HSNumericSetting, HSBooleanSetting, HSButtonSetting, HSSelectStringSetting} from './src/mod/class/hs-core/settings/hs-setting';`,
            resolveDir: root, loader: 'ts'},
        bundle: true, write: false, platform: 'node', format: 'cjs',
        plugins: [{name: 'settings-boundary', setup(build) {
            const stubs = {
                'hs-settings': 'export const HSSettings = {};',
                'hs-utils': 'export const HSUtils = {};',
                'hs-global': 'export const HSGlobal = {};',
                'hs-logger': 'export const HSLogger = {};',
                'hs-ui': 'export const HSUI = {};',
            };
            build.onResolve({filter: /hs-[\w-]+$/}, args => {
                const name = args.path.split('/').pop();
                if (stubs[name]) return {path: name, namespace: 'test'};
            });
            build.onLoad({filter: /.*/, namespace: 'test'}, args => ({contents: stubs[args.path], loader: 'ts'}));
        }}],
    });
    const runtime = new Module(path.join(root, 'settings-state-test-runtime.cjs'), module);
    runtime.filename = path.join(root, 'settings-state-test-runtime.cjs');
    runtime.paths = module.paths;
    runtime._compile(bundled.outputFiles[0].text, runtime.filename);
    const {parseStoredSettingStates: parse, restoreSettingState: restore, serializeSettingStates: serialize,
        initializeSettingActions: initialize, HSNumericSetting, HSBooleanSetting, HSButtonSetting, HSSelectStringSetting} = runtime.exports;
    const defaults = JSON.parse(fs.readFileSync(path.join(root, 'src/mod/resource/json/hs-settings.json'), 'utf8'));
    const getters = Object.fromEntries(Object.entries(defaults).map(([name, def]) => [name, {getDefinition: () => def}]));
    const saved = serialize(getters);
    // Preserve the existing HSStorage envelope and the reader used by backups and the strategy dropdown.
    const disk = JSON.stringify(saved);
    const restored = parse(JSON.parse(disk));
    assert.equal(Object.keys(restored).length, Object.keys(defaults).length);
    for (const [name, entry] of Object.entries(restored)) {
        assert.deepEqual(Object.keys(entry).sort(), ['enabled', 'settingValue']);
        assert.equal(entry.enabled, defaults[name].enabled);
        assert.deepEqual(entry.settingValue, defaults[name].settingType === 'boolean' ? defaults[name].enabled : defaults[name].settingValue);
        assert.deepEqual(restore(defaults[name], entry).settingControl, defaults[name].settingControl);
    }
    const legacy = {reactiveMouseHover: {...defaults.reactiveMouseHover,
        enabled: false, settingValue: 0.4, calculatedSettingValue: 9000, settingValueMultiplier: 9000,
        settingName: 'wrong name', settingType: 'string', settingControl: {}, settingAction: 'wrong action',
        skipInit: true, hidden: true, platforms: ['invalid'], futureDefinitionField: 'old value'}};
    const before = structuredClone(legacy);
    const def = restore(defaults.reactiveMouseHover, parse(JSON.stringify(legacy)).reactiveMouseHover);
    assert.deepEqual(def, {...defaults.reactiveMouseHover, enabled: false, settingValue: 0.4});
    assert.deepEqual(legacy, before, 'restoring must not mutate the backup');
    assert.deepEqual(parse(legacy), legacy, 'object-valued older storage is also accepted');
    assert.equal(parse(null), null);
    assert.equal(parse('[]'), null);
    assert.throws(() => parse('{invalid'), SyntaxError);
    for (const value of [null, 'bad', Infinity, {}]) {
        assert.equal(restore(defaults.reactiveMouseHover, {settingValue: value}).settingValue, defaults.reactiveMouseHover.settingValue);
    }
    assert.equal(restore(defaults.reactiveMouseHover, {settingValue: '0.4'}).settingValue, 0.4);
    assert.deepEqual(restore(defaults.reactiveMouseHover, null), defaults.reactiveMouseHover);
    const arrays = {enabled: false, settingValue: ['buildings']};
    const arrayResult = restore(defaults.hiddenVanillaTabs, arrays);
    arrayResult.settingValue.push('runes');
    assert.deepEqual(arrays.settingValue, ['buildings']);
    assert.deepEqual(restore(defaults.hiddenVanillaTabs, {settingValue: [7]}).settingValue, defaults.hiddenVanillaTabs.settingValue);

    const events = [];
    const numeric = new HSNumericSetting(def, params => {
        events.push(['action', 'numeric', params.value, params.disable]);
    }, 'yes', 'no');
    assert.equal(numeric.getCalculatedValue(), 400, 'recompute from the current 1000 multiplier');
    const hiddenDef = {...defaults.matchOcteractText, settingValue: false, calculatedSettingValue: 'stale'};
    delete hiddenDef.settingControl;
    const hidden = new HSBooleanSetting(hiddenDef, params => {
        events.push(['action', 'hidden', params.value, params.disable]);
    }, 'yes', 'no');
    const button = new HSButtonSetting({...defaults.editGameHeader}, () => {
        throw new Error('skipInit must prevent opening the header editor on load');
    }, 'yes', 'no');
    await initialize([numeric, hidden, button], setting => {
        events.push(['prepare', setting === numeric ? 'numeric' : setting === hidden ? 'hidden' : 'button']);
    });
    assert.deepEqual(events, [
        ['prepare', 'numeric'], ['action', 'numeric', 400, true],
        ['prepare', 'hidden'], ['action', 'hidden', hiddenDef.enabled, !hiddenDef.enabled],
        ['prepare', 'button'],
    ]);
    const string = new HSSelectStringSetting({...defaults.autosingStrategy, calculatedSettingValue: 'stale'}, null, 'yes', 'no');
    assert.equal(string.getCalculatedValue(), defaults.autosingStrategy.settingValue);
    const zeroMultiplier = new HSNumericSetting({...def, settingValueMultiplier: 0}, null, 'yes', 'no');
    assert.equal(zeroMultiplier.getCalculatedValue(), 0);
    events.length = 0;
    await initialize([hidden]);
    assert.equal(events.length, 1, 'actions also run with no control preparation callback');
    console.log('Passed settings state checks: every default round-trips, legacy definitions cannot override configuration, values recalculate, and control-free actions preserve order and skipInit.');
}

main().catch(error => {console.error(error); process.exitCode = 1;});
