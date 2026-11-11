const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const esbuild = require('esbuild');

const SAVE_KEY = 'Synergysave2';
const DEV_TOOLS_KEY = 'hs-dev-tools';

const encodeSave = data => btoa(JSON.stringify(data));
const validSave = (extra = {}) => encodeSave({ exporttest: 'YES!', singularityCount: 42, highestSingularityCount: 300, ...extra });
const backup = (extra = {}) => JSON.stringify({ hsBackup: 1, info: { modVersion: 'x' }, ...extra });

// An in-memory localStorage. A class of its own each time: a successful import replaces its prototype's methods.
function installStorage(initial = {}, failOn = {}) {
    const values = new Map(Object.entries(initial));

    class FakeStorage {
        get length() { return values.size; }
        key(index) { return [...values.keys()][index] ?? null; }
        getItem(key) { return values.has(key) ? values.get(key) : null; }
        setItem(key, value) {
            if (failOn.always === key) throw new Error('quota');
            if (failOn.once === key) {
                failOn.once = undefined;
                throw new Error('quota');
            }
            values.set(key, String(value));
        }
        removeItem(key) { values.delete(key); }
        clear() { values.clear(); }
    }

    const storage = new FakeStorage();
    const page = { reloads: 0 };
    globalThis.Storage = FakeStorage;
    Object.defineProperty(globalThis, 'localStorage', { value: storage, configurable: true, writable: true });
    globalThis.window = {
        localStorage: storage,
        location: { reload() { page.reloads++; } },
        setTimeout() { },
    };

    return { storage, page, snapshot: () => Object.fromEntries(values) };
}

// The file filter and the import's writes (docs/features/backup.md), in an in-memory bundle: everything hs-backup.ts
// imports is stubbed except HSGlobal, for the real key prefix. The class's private methods are reached by a line
// added inside it, in this bundle only.
async function main() {
    const root = path.resolve(__dirname, '../..');
    const source = path.join(root, 'src/mod/class/hs-core/hs-backup.ts');
    const anchor = "static #context = 'HSBackup';";
    const bundled = await esbuild.build({
        entryPoints: [source],
        bundle: true, write: false, platform: 'node', format: 'cjs',
        define: { HS_DEV_BUILD: 'false', HS_BUILD_VERSION: '"test"' },
        plugins: [{ name: 'backup-test', setup(build) {
            build.onResolve({ filter: /.*/ }, args => (
                args.importer === source && !/hs-global$/.test(args.path) ? { path: args.path, namespace: 'backup-test-stub' } : undefined
            ));
            build.onLoad({ filter: /.*/, namespace: 'backup-test-stub' }, () => ({
                contents: `const logErrors = globalThis.__backupTestErrors;
                    export const HSLogger = { log() {}, warn() {}, error(message) { logErrors.push(message); } };
                    const stub = class {};
                    export { stub as HSUI, stub as HSUIC, stub as HSModuleRegistry, stub as HSGameData, stub as HSPlatform,
                        stub as HSGameDialogs, stub as HSAutosing };
                    export default '';`,
                loader: 'ts',
            }));
            build.onLoad({ filter: /hs-backup\.ts$/ }, () => {
                const code = fs.readFileSync(source, 'utf8');
                assert.ok(code.includes(anchor), `hs-backup.ts no longer has: ${anchor}`);
                return {
                    contents: code.replace(anchor, `${anchor}
                        static testAccess = {
                            parseFile: (text: string) => HSBackup.#parseFile(text),
                            applyImport: (write: HSBackupWrite) => HSBackup.#applyImport(write),
                        };`),
                    loader: 'ts',
                };
            });
        } }],
    });

    const logErrors = globalThis.__backupTestErrors = [];
    const runtime = new Module(path.join(root, 'backup-test-runtime.cjs'), module);
    runtime.paths = module.paths;
    runtime._compile(bundled.outputFiles[0].text, runtime.filename = path.join(root, 'backup-test-runtime.cjs'));
    const { HSBackup } = runtime.exports;
    const { parseFile, applyImport } = HSBackup.testAccess;
    let scenarios = 0;
    const scenario = (name, run) => {
        try {
            run();
        } catch (error) {
            error.message = `${name}: ${error.message}`;
            throw error;
        }
        scenarios++;
    };

    const NEWER = 'this file was made by a newer version of the mod';
    const NOT_LOADABLE = 'this file is neither a mod backup nor a save the game would load';
    const NOTHING = 'nothing to import in this file';

    // ---------- What a file can hold ----------

    scenario('a newer format is refused, whatever it holds', () => {
        assert.equal(parseFile(backup({ hsBackup: 2, save: validSave(), modData: { 'hs-settings': '{}' } })), NEWER);
    });

    scenario('a whole mod backup is read', () => {
        const content = parseFile(backup({
            logs: ['a', 'b', 'c'],
            diagnostics: { heater: { x: 1 } },
            gamePrefs: { language: 'fr' },
            modData: { 'hs-settings': '{"a":1}' },
            save: validSave(),
        }));
        assert.deepEqual(content.modData, { 'hs-settings': '{"a":1}' });
        assert.deepEqual(content.gamePrefs, { language: 'fr' });
        assert.equal(content.save, validSave());
        assert.equal(content.saveRefused, false);
        assert.equal(content.logCount, 3);
        assert.equal(content.hasHeaterData, true);
        assert.deepEqual(content.info, { modVersion: 'x' });
    });

    scenario('only the heater error, or a diagnostics of the wrong type, is no heater data', () => {
        const prefs = { gamePrefs: {} };
        assert.equal(parseFile(backup({ ...prefs, diagnostics: { heaterError: 'no' } })).hasHeaterData, false);
        assert.equal(parseFile(backup({ ...prefs, diagnostics: 'heater' })).hasHeaterData, false);
        assert.equal(parseFile(backup({ ...prefs, logs: 'not a list' })).logCount, 0);
        assert.equal(parseFile(backup({ ...prefs, info: 'not an object' })).info, undefined);
    });

    // ---------- modData: only the mod's own keys, as strings ----------

    scenario('modData keeps only the mod keys with string values', () => {
        const content = parseFile(backup({ modData: {
            'hs-settings': '{}',
            'hs-empty': '',
            'hs-number': 1,
            'hs-object': { a: 1 },
            'hs-null': null,
            [DEV_TOOLS_KEY]: 'edited',
            [SAVE_KEY]: 'overwritten',
            language: 'fr',
            hsnodash: 'x',
            'HS-upper': 'x',
        } }));
        assert.deepEqual(content.modData, { 'hs-settings': '{}', 'hs-empty': '' });
    });

    scenario('modData with nothing left counts as absent', () => {
        assert.equal(parseFile(backup({ modData: { [SAVE_KEY]: 'x', [DEV_TOOLS_KEY]: 'x' } })), NOTHING);
        assert.equal(parseFile(backup({ modData: {} })), NOTHING);
        assert.equal(parseFile(backup({ modData: ['hs-settings'] })), NOTHING);
        assert.equal(parseFile(backup({ modData: 'hs-settings' })), NOTHING);
    });

    // ---------- gamePrefs: only the listed keys, an empty list is valid ----------

    scenario('gamePrefs keeps only the listed keys with string values', () => {
        const content = parseFile(backup({ gamePrefs: {
            language: 'fr',
            theme: '',
            statSymbols: 'true',
            'synergism-tab-order': '[]',
            copyToClipboard: '',
            dismissedAnnouncements: '[]',
            firstPlayed: '2020',
            pendingTimeSkips: '9',
            [SAVE_KEY]: 'overwritten',
            'hs-settings': '{}',
        } }));
        assert.deepEqual(content.gamePrefs, {
            language: 'fr',
            theme: '',
            statSymbols: 'true',
            'synergism-tab-order': '[]',
            copyToClipboard: '',
            dismissedAnnouncements: '[]',
        });
        assert.deepEqual(parseFile(backup({ gamePrefs: { language: 1, theme: '' } })).gamePrefs, { theme: '' });
    });

    scenario('an empty gamePrefs is imported, one of the wrong type is absent', () => {
        assert.deepEqual(parseFile(backup({ gamePrefs: {} })).gamePrefs, {});
        assert.deepEqual(parseFile(backup({ gamePrefs: { firstPlayed: 'x' } })).gamePrefs, {});
        assert.equal(parseFile(backup({ gamePrefs: ['language'] })), NOTHING);
        assert.equal(parseFile(backup({ gamePrefs: 'language' })), NOTHING);
    });

    scenario('a __proto__ key in the file changes nothing', () => {
        const text = '{"hsBackup":1,"modData":{"__proto__":{"polluted":"x"},"hs-a":"1"},"gamePrefs":{"__proto__":{"polluted":"x"}}}';
        const content = parseFile(text);
        assert.deepEqual(Object.keys(content.modData), ['hs-a']);
        assert.deepEqual(Object.keys(content.gamePrefs), []);
        assert.equal(content.modData.polluted, undefined);
        assert.equal(content.gamePrefs.polluted, undefined);
        assert.equal({}.polluted, undefined);
    });

    // ---------- Saves ----------

    scenario('a raw game save is read, trimmed', () => {
        const save = validSave();
        for (const text of [save, `\n ${save}\r\n`]) {
            const content = parseFile(text);
            assert.equal(content.save, save);
            assert.equal(content.info, undefined);
            assert.equal(content.modData, undefined);
            assert.equal(content.gamePrefs, undefined);
        }
    });

    scenario('both exporttest values the game loads are read', () => {
        assert.ok(parseFile(encodeSave({ exporttest: 'YES!' })).save);
        assert.ok(parseFile(encodeSave({ exporttest: true })).save);
    });

    const refusedSaves = {
        'an old compressed save': 'N4IgdghgtgpiBcIBmAnA9gdwCYEsDmALgJYC2ANAA',
        'base64 of something else': btoa('\x1f\x8bnot json'),
        'a test-version save (false)': encodeSave({ exporttest: false }),
        'a test-version save (NO!)': encodeSave({ exporttest: 'NO!' }),
        'a save without exporttest': encodeSave({ singularityCount: 1 }),
        'exporttest with another string': encodeSave({ exporttest: 'yes' }),
        'a list': btoa('[{"exporttest":"YES!"}]'),
        'null': btoa('null'),
        'a number': btoa('1'),
        'plain text': 'hello, this is not a save',
        'a JSON file that is no backup': '{"exporttest":"YES!"}',
        'a backup version that is no number': '{"hsBackup":"1","gamePrefs":{}}',
    };

    scenario('a file that is no backup and no loadable save is refused', () => {
        for (const [label, text] of Object.entries(refusedSaves)) {
            assert.equal(parseFile(text), NOT_LOADABLE, label);
        }
    });

    scenario('a backup holding only a refused save is refused', () => {
        for (const [label, save] of Object.entries(refusedSaves)) {
            assert.equal(parseFile(backup({ save })), NOT_LOADABLE, label);
        }
    });

    scenario('the rest of a backup with a refused save is still imported, the save flagged', () => {
        const content = parseFile(backup({ save: refusedSaves['an old compressed save'], modData: { 'hs-a': '1' } }));
        assert.equal(content.save, undefined);
        assert.equal(content.saveRefused, true);
        assert.deepEqual(content.modData, { 'hs-a': '1' });
    });

    scenario('a file with nothing to import', () => {
        assert.equal(parseFile(''), NOTHING);
        assert.equal(parseFile('   \n'), NOTHING);
        assert.equal(parseFile(backup()), NOTHING);
        assert.equal(parseFile(backup({ save: '  ' })), NOTHING);
        assert.equal(parseFile(backup({ save: 123 })), NOTHING);
        assert.equal(parseFile(backup({ logs: ['a'], diagnostics: { heater: {} } })), NOTHING);
    });

    // ---------- The summary the file name and the modal show ----------

    scenario('the summary of a save', () => {
        assert.deepEqual(parseFile(validSave()).saveSummary, { singularity: 42, highestSingularity: 300 });
        assert.deepEqual(parseFile(encodeSave({ exporttest: true })).saveSummary, { singularity: undefined, highestSingularity: undefined });
        assert.deepEqual(parseFile(validSave({ singularityCount: '42', highestSingularityCount: null })).saveSummary, { singularity: undefined, highestSingularity: undefined });
    });

    scenario('the Exalt of a save follows the Exalt tab order', () => {
        const exaltOf = singularityChallenges => parseFile(validSave({ singularityChallenges })).saveSummary.exalt;
        assert.equal(exaltOf({ noSingularityUpgrades: { enabled: true } }), 1);
        assert.equal(exaltOf({ limitedTime: { enabled: true } }), 7);
        assert.equal(exaltOf({ barDependence: { enabled: true } }), 10);
        assert.equal(exaltOf({ noOcteracts: { enabled: false } }), undefined);
        assert.equal(exaltOf({ noOcteracts: { enabled: 'true' } }), undefined);
        assert.equal(exaltOf({ someFutureExalt: { enabled: true } }), undefined);
        assert.equal(parseFile(validSave()).saveSummary.exalt, undefined);
    });

    // ---------- saveFromFile: the save alone ----------

    scenario('saveFromFile', () => {
        const save = validSave();
        assert.deepEqual(HSBackup.saveFromFile(save), { save });
        assert.deepEqual(HSBackup.saveFromFile(backup({ save, modData: { 'hs-a': '1' } })), { save });
        assert.equal(HSBackup.saveFromFile(backup({ modData: { 'hs-a': '1' } })), 'this file holds no save');
        assert.equal(HSBackup.saveFromFile(backup({ gamePrefs: {} })), 'this file holds no save');
        assert.equal(HSBackup.saveFromFile(backup({ modData: { 'hs-a': '1' }, save: 'nope' })), 'the save in this file is not one the game would load');
        assert.equal(HSBackup.saveFromFile('nope'), NOT_LOADABLE);
        assert.equal(HSBackup.saveFromFile(backup()), NOTHING);
        assert.equal(HSBackup.saveFromFile(backup({ hsBackup: 2, save })), NEWER);
    });

    // ---------- The import's writes ----------

    const before = {
        [SAVE_KEY]: 'old save',
        [DEV_TOOLS_KEY]: 'dev',
        'hs-settings': 'old settings',
        'hs-only-here': 'old',
        language: 'en',
        theme: 'dark',
        firstPlayed: '2020',
        unrelated: 'kept',
    };
    const write = {
        save: 'new save',
        modData: { 'hs-settings': 'new settings', 'hs-only-in-file': 'new' },
        gamePrefs: { language: 'fr', statSymbols: 'true' },
    };

    scenario('an import is an exact restore of what it writes', () => {
        const { snapshot, page } = installStorage(before);
        assert.equal(applyImport(write), null);
        assert.deepEqual(snapshot(), {
            [SAVE_KEY]: 'new save',
            [DEV_TOOLS_KEY]: 'dev',
            'hs-settings': 'new settings',
            'hs-only-in-file': 'new',
            language: 'fr',
            statSymbols: 'true',
            firstPlayed: '2020',
            unrelated: 'kept',
        });
        assert.equal(page.reloads, 1);
    });

    scenario('an import leaves the parts it does not write alone', () => {
        const { snapshot } = installStorage(before);
        assert.equal(applyImport({ save: 'new save' }), null);
        assert.deepEqual(snapshot(), { ...before, [SAVE_KEY]: 'new save' });
    });

    scenario('until the reload, writes to the imported parts are dropped and the others go through', () => {
        const { storage, snapshot } = installStorage(before);
        applyImport(write);
        const imported = snapshot();

        storage.setItem(SAVE_KEY, 'autosave');
        storage.setItem('hs-settings', 'settings save');
        storage.setItem('hs-new', 'x');
        storage.setItem('language', 'de');
        storage.removeItem(SAVE_KEY);
        storage.removeItem('hs-only-in-file');
        storage.removeItem('statSymbols');
        storage.clear();
        assert.deepEqual(snapshot(), imported);

        storage.setItem('unrelated', 'changed');
        storage.removeItem('firstPlayed');
        assert.equal(snapshot().unrelated, 'changed');
        assert.equal(snapshot().firstPlayed, undefined);
    });

    scenario('a part not imported can still be written until the reload', () => {
        const { storage, snapshot } = installStorage(before);
        applyImport({ gamePrefs: {} });
        storage.setItem(SAVE_KEY, 'autosave');
        storage.setItem('hs-settings', 'settings save');
        storage.setItem('language', 'de');
        assert.equal(snapshot()[SAVE_KEY], 'autosave');
        assert.equal(snapshot()['hs-settings'], 'settings save');
        assert.equal(snapshot().language, undefined);
    });

    // ---------- A failed write puts everything back ----------

    const FAILED = 'The import failed (see the Log tab): nothing was changed.';

    for (const failing of ['hs-settings', 'hs-only-in-file', 'language', 'statSymbols', SAVE_KEY]) {
        scenario(`a write failing on ${failing} changes nothing, reloads nothing and blocks nothing`, () => {
            const { storage, snapshot, page } = installStorage(before, { once: failing });
            assert.equal(applyImport(write), FAILED);
            assert.deepEqual(snapshot(), before);
            assert.equal(page.reloads, 0);

            storage.setItem(SAVE_KEY, 'autosave');
            assert.equal(snapshot()[SAVE_KEY], 'autosave');
        });
    }

    scenario('a key that can not be put back does not stop the others, and is logged', () => {
        // hs-settings refuses every write: the first one fails the import, and putting it back fails too
        const { snapshot, page } = installStorage(before, { always: 'hs-settings' });
        logErrors.length = 0;
        assert.equal(applyImport(write), FAILED);

        const { 'hs-settings': lost, ...others } = before;
        assert.deepEqual(snapshot(), others);
        assert.equal(lost, 'old settings');
        assert.equal(page.reloads, 0);
        assert.ok(logErrors.some(line => line.includes('Could not put "hs-settings" back')));
        assert.ok(logErrors.some(line => line.includes('Import failed')));
    });

    console.log(`Passed ${scenarios} backup file scenarios.`);
}

main().catch(error => { console.error(error); process.exitCode = 1; });
