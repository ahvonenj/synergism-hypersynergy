const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const esbuild = require('esbuild');

async function main() {
    const root = path.resolve(__dirname, '../..');
    const bundled = await esbuild.build({
        stdin: {contents: `export * from './src/mod/class/hs-core/settings/hs-settings-state';
            export {HSNumericSetting, HSBooleanSetting, HSButtonSetting, HSTextSetting, HSMultiSelectSetting} from './src/mod/class/hs-core/settings/hs-setting';`,
            resolveDir: root, loader: 'ts'},
        bundle: true, write: false, platform: 'node', format: 'cjs',
        plugins: [{name: 'settings-boundary', setup(build) {
            // The test's own objects (globalThis.__settingsTest), so it sees the saves, notifications and logs
            const stubs = {
                'hs-settings': 'export const HSSettings = globalThis.__settingsTest.HSSettings;',
                'hs-logger': 'export const HSLogger = globalThis.__settingsTest.HSLogger;',
                'hs-ui': 'export const HSUI = globalThis.__settingsTest.HSUI;',
            };
            build.onResolve({filter: /hs-[\w-]+$/}, args => {
                const name = args.path.split('/').pop();
                if (stubs[name]) return {path: name, namespace: 'test'};
            });
            build.onLoad({filter: /.*/, namespace: 'test'}, args => ({contents: stubs[args.path], loader: 'ts'}));
        }}],
    });
    const calls = [];
    const registry = {};
    let gdsRefused = false;
    globalThis.__settingsTest = {
        HSSettings: {
            saveSettingsToStorage: () => calls.push('save'),
            notifyStateChange: name => calls.push(`notify ${name}`),
            getSettings: () => registry,
            usesGameData: definition => definition.usesGameData === true,
            refuseWithoutGameData: () => gdsRefused,
        },
        HSLogger: {log: msg => calls.push(`log ${msg}`), warn() {}, error() {}, debug() {}, info() {}},
        HSUI: {Notify: msg => calls.push(`notify-player ${msg}`)},
    };
    const runtime = new Module(path.join(root, 'settings-state-test-runtime.cjs'), module);
    runtime.filename = path.join(root, 'settings-state-test-runtime.cjs');
    runtime.paths = module.paths;
    runtime._compile(bundled.outputFiles[0].text, runtime.filename);
    const {parseStoredSettingStates: parse, restoreSettingState: restore, serializeSettingStates: serialize,
        initializeSettingActions: initialize, HSNumericSetting, HSBooleanSetting, HSButtonSetting, HSTextSetting, HSMultiSelectSetting} = runtime.exports;
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
    });
    assert.equal(numeric.getCalculatedValue(), 400, 'recompute from the current 1000 multiplier');
    const hiddenDef = {...defaults.matchOcteractText, settingValue: false, calculatedSettingValue: 'stale'};
    delete hiddenDef.settingControl;
    const hidden = new HSBooleanSetting(hiddenDef, params => {
        events.push(['action', 'hidden', params.value, params.disable]);
    });
    const button = new HSButtonSetting({...defaults.editGameHeader}, () => {
        throw new Error('skipInit must prevent opening the header editor on load');
    });
    await initialize([numeric, hidden, button], setting => {
        events.push(['prepare', setting === numeric ? 'numeric' : setting === hidden ? 'hidden' : 'button']);
    });
    assert.deepEqual(events, [
        ['prepare', 'numeric'], ['action', 'numeric', 400, true],
        ['prepare', 'hidden'], ['action', 'hidden', hiddenDef.enabled, !hiddenDef.enabled],
        ['prepare', 'button'],
    ]);
    const string = new HSTextSetting({...defaults.autosingStrategy, calculatedSettingValue: 'stale'}, null);
    assert.equal(string.getCalculatedValue(), defaults.autosingStrategy.settingValue);
    const zeroMultiplier = new HSNumericSetting({...def, settingValueMultiplier: 0}, null);
    assert.equal(zeroMultiplier.getCalculatedValue(), 0);
    events.length = 0;
    await initialize([hidden]);
    assert.equal(events.length, 1, 'actions also run with no control preparation callback');

    // Typed numbers: clamped to the control's min/max (0..1 here), the field shows the value kept, multiplier applied
    const actionValues = [];
    const typedNumeric = new HSNumericSetting({...defaults.reactiveMouseHover, settingValue: 5}, params => {
        actionValues.push([params.value, params.disable]);
    });
    assert.equal(typedNumeric.getValue(), 1, 'a saved value out of range is clamped at load');
    assert.equal(typedNumeric.getCalculatedValue(), 1000);
    for (const [typed, kept, shown] of [['0.4', 0.4, '0.4'], ['7', 1, '1'], ['-3', 0, '0'], ['', 0, '0'], ['abc', 0, '0']]) {
        const input = {value: typed};
        calls.length = 0;
        await typedNumeric.handleChange({target: input});
        assert.equal(typedNumeric.getValue(), kept, `typed ${JSON.stringify(typed)}`);
        assert.equal(typedNumeric.getCalculatedValue(), kept * 1000);
        assert.equal(input.value, shown);
        assert.deepEqual(actionValues.at(-1), [kept * 1000, false]);
        assert.equal(calls.at(-1), 'save', 'saved after the action');
    }
    // setValue: no action, but the value is clamped and the computed value follows (the Advanced reset relies on it)
    actionValues.length = 0;
    typedNumeric.setValue(0.25);
    assert.equal(typedNumeric.getCalculatedValue(), 250);
    typedNumeric.setValue(9);
    assert.deepEqual([typedNumeric.getValue(), typedNumeric.getCalculatedValue()], [1, 1000]);
    assert.equal(actionValues.length, 0, 'setValue never runs the action');

    // Text and multi-select: read from the control, logged escaped, computed value follows setValue too
    const text = new HSTextSetting({...defaults.autosingStrategy}, null);
    calls.length = 0;
    await text.handleChange({target: {value: 'a<b'}});
    assert.deepEqual([text.getValue(), text.getCalculatedValue()], ['a<b', 'a<b']);
    assert.ok(calls.some(line => line.startsWith('log ') && line.includes('a&lt;b')), 'the log line is escaped');
    text.setValue('other');
    assert.equal(text.getCalculatedValue(), 'other');
    const multi = new HSMultiSelectSetting({...defaults.hiddenVanillaTabs, settingValue: []}, null);
    await multi.handleChange({target: {selectedOptions: [{value: 'buildings'}, {value: 'runes'}]}});
    assert.deepEqual([multi.getValue(), multi.getCalculatedValue()], [['buildings', 'runes'], ['buildings', 'runes']]);

    // Boolean setValue: its value is its on/off state; listeners told only on a change
    const flag = new HSBooleanSetting({...hiddenDef, enabled: false}, null);
    calls.length = 0;
    flag.setValue(true);
    flag.setValue(true);
    assert.deepEqual([flag.isEnabled(), flag.getValue(), flag.getCalculatedValue()], [true, true, true]);
    assert.equal(calls.filter(call => call.startsWith('notify ')).length, 1);

    // GDS off turns off the settings that use it, GDS on turns back on those it turned off
    const bare = (settingName, enabled, extra = {}) => ({settingName, settingDescription: settingName, settingType: 'boolean',
        enabled, settingValue: enabled, ...extra});
    const gds = new HSBooleanSetting(bare('useGameData', true), null);
    const usesOn = new HSBooleanSetting(bare('usesOn', true, {usesGameData: true}), null);
    const usesOff = new HSBooleanSetting(bare('usesOff', false, {usesGameData: true}), null);
    const other = new HSBooleanSetting(bare('other', true), null);
    Object.assign(registry, {useGameData: gds, usesOn, usesOff, other});
    calls.length = 0;
    gds.disable();
    assert.deepEqual([gds.isEnabled(), usesOn.isEnabled(), usesOff.isEnabled(), other.isEnabled()], [false, false, false, true]);
    assert.ok(calls.some(call => call.startsWith('notify-player ') && call.includes('usesOn')), 'the player is told what was turned off');
    gds.enable();
    assert.deepEqual([gds.isEnabled(), usesOn.isEnabled(), usesOff.isEnabled()], [true, true, false], 'only what GDS turned off comes back');
    gds.disable();
    gds.enable();
    gds.enable();
    assert.equal(usesOn.isEnabled(), true, 'a second enable() changes nothing');

    // The panel's switch flips the state unless the GDS check refuses it
    const switched = new HSBooleanSetting(bare('switched', false), null);
    switched.handleToggle();
    assert.equal(switched.isEnabled(), true);
    switched.handleToggle();
    assert.equal(switched.isEnabled(), false);
    gdsRefused = true;
    switched.handleToggle();
    assert.equal(switched.isEnabled(), false, 'refused');
    gdsRefused = false;

    console.log('Passed settings state checks: every default round-trips, legacy definitions cannot override configuration, values recalculate, control-free actions preserve order and skipInit, typed values clamp, setValue recomputes, and GDS turns its dependents off and back on.');
}

main().catch(error => {console.error(error); process.exitCode = 1;});
