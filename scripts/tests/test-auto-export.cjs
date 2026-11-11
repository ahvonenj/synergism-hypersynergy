const assert = require('node:assert/strict');
const path = require('node:path');
const Module = require('node:module');
const esbuild = require('esbuild');

// Test the export workflow without opening file pickers or writing real save files.
async function main() {
    const root = path.resolve(__dirname, '../..');
    const stubs = {
        'hs-logger': 'export const HSLogger = Object.fromEntries(["log", "warn", "error"].map(level => [level, text => globalThis.__exportTest.logs.push(text)]));',
        'hs-ui': 'export const HSUI = { Notify(text) { globalThis.__exportTest.notices.push(text); } };',
        'hs-settings': 'export const HSSettings = { getSetting(key) { return globalThis.__exportTest.settings[key]; } };',
        'hs-global': 'export const HSGlobal = { get exposedPlayer() { return globalThis.__exportTest.player; } };',
        'hs-module-registry': 'export const HSModuleRegistry = { getModule(key) { return globalThis.__exportTest.modules[key]; } };',
        'hs-module': 'export class HSModule { constructor(options) { this.context = options.context; } }',
        'hs-auto-export-store': `export class HSAutoExportStore {
            async read(key) { return globalThis.__exportTest.stored.get(key); }
            async write(key, value) {
                if (value === undefined) globalThis.__exportTest.stored.delete(key);
                else globalThis.__exportTest.stored.set(key, Array.isArray(value) ? [...value] : value);
            }
        }`,
    };
    const bundled = await esbuild.build({
        stdin: { contents: `export { HSAutoExport } from './src/mod/class/hs-modules/hs-auto-export';
            export { HSAutoExportFolder } from './src/mod/class/hs-modules/hs-auto-export-folder';`,
            resolveDir: root, loader: 'ts' },
        bundle: true, write: false, platform: 'node', format: 'cjs',
        plugins: [{ name: 'export-browser-boundaries', setup(build) {
            build.onResolve({ filter: /hs-(?:logger|ui|settings|global|module-registry|module|auto-export-store)$/ }, args => {
                const name = args.path.split('/').pop();
                if (stubs[name]) return { path: name, namespace: 'test' };
            });
            build.onLoad({ filter: /.*/, namespace: 'test' }, args => ({ contents: stubs[args.path], loader: 'ts' }));
        } }],
    });
    const runtime = new Module(path.join(root, 'auto-export-test-runtime.cjs'), module);
    runtime.filename = path.join(root, 'auto-export-test-runtime.cjs');
    runtime.paths = module.paths;
    runtime._compile(bundled.outputFiles[0].text, runtime.filename);
    const { HSAutoExport, HSAutoExportFolder } = runtime.exports;
    const tick = () => new Promise(resolve => setTimeout(resolve, 10));
    const setting = (value, enabled = true) => ({ getValue: () => value, isEnabled: () => enabled });
    let state;
    class Anchor {
        attributes = {};
        setAttribute(key, value) { this.attributes[key] = value; if (key === 'id') this.id = value; }
        getAttribute(key) { return this.attributes[key] ?? null; }
        click() { state.downloads.push({ ...this.attributes }); }
    }
    const originalGlobals = Object.fromEntries(['window', 'document', 'HTMLAnchorElement', 'setInterval'].map(key => [key, globalThis[key]]));
    const reset = () => {
        state = globalThis.__exportTest = {
            logs: [], notices: [], downloads: [], stored: new Map(), handlers: {}, elements: {},
            player: { lastExportedSave: Date.now() },
            settings: { autoExportSave: setting(1), autoExportSaveKeep: setting(2), autoExportSaveLoadout: setting('') },
            modules: { HSGameData: { isSteam: false }, HSAutosing: { isAutosingActive: () => false } },
        };
        globalThis.window = { setTimeout, clearTimeout, addEventListener() {}, removeEventListener() {} };
        globalThis.document = {
            getElementById: id => state.elements[id] ?? null,
            createElement: tag => { assert.equal(tag, 'a'); return new Anchor(); },
            body: { appendChild() {}, removeChild() {} },
            addEventListener(name, fn) { (state.handlers[name] ??= []).push(fn); },
        };
        globalThis.HTMLAnchorElement = Anchor;
        globalThis.setInterval = fn => { state.interval = fn; return 1; };
    };
    const directory = (options = {}) => {
        const files = new Map([['unrelated.txt', 'keep me']]);
        const removed = [];
        let permission = options.permission ?? 'granted';
        const handle = {
            name: 'Exports', files, removed,
            isSameEntry: async other => other === handle,
            queryPermission: async () => permission,
            requestPermission: async () => { handle.requests++; return permission = options.answer ?? 'granted'; },
            requests: 0,
            async getFileHandle(name) {
                if (options.error) throw Object.assign(new Error('write refused'), { name: options.error });
                return { createWritable: async () => ({ write: async data => files.set(name, data), close: async () => {} }) };
            },
            async removeEntry(name) { removed.push(name); files.delete(name); },
        };
        return handle;
    };
    const folderController = (steam = false, enabled = () => true) => new HSAutoExportFolder('Test', () => steam, enabled);
    let scenarios = 0;
    try {
        reset();
        const browser = folderController();
        const steam = folderController(true);
        assert.equal(browser.canExport(), true);
        assert.equal(steam.canExport(), false);
        assert.equal(steam.canExport(), false);
        assert.equal(state.notices.length, 1, 'a missing Steam folder warns only once');
        scenarios++;

        reset();
        const first = directory();
        window.showDirectoryPicker = async () => first;
        const selected = folderController();
        await selected.chooseFolder();
        await selected.writeSave('first.txt', 'one');
        await selected.writeSave('second.txt', 'two');
        await selected.chooseFolder(); // Choosing the same folder must keep retention history.
        await selected.writeSave('third.txt', 'three');
        assert.deepEqual(first.removed, ['first.txt']);
        assert.equal(first.files.get('unrelated.txt'), 'keep me');
        assert.deepEqual(state.stored.get('files'), ['second.txt', 'third.txt']);
        // A reload keeps that history as well.
        const reloaded = folderController();
        await reloaded.load();
        await reloaded.writeSave('fourth.txt', 'four');
        assert.deepEqual(first.removed, ['first.txt', 'second.txt']);
        const other = directory();
        window.showDirectoryPicker = async () => other;
        await reloaded.chooseFolder();
        await reloaded.writeSave('other.txt', 'other');
        assert.deepEqual(other.removed, [], 'a different folder starts a new retention history');
        await reloaded.forgetFolder();
        assert.equal(state.stored.has('folder'), false);
        assert.equal(state.stored.has('files'), false);
        assert.equal(other.files.get('other.txt'), 'other', 'forgetting a folder does not delete files');
        scenarios++;

        for (const answer of ['granted', 'denied']) {
            reset();
            const handle = directory({ permission: 'prompt', answer });
            state.stored.set('folder', handle);
            let enabled = false;
            const controller = folderController(false, () => enabled);
            await controller.load();
            assert.equal(controller.canExport(), false);
            controller.onPlayerInput({ isTrusted: true });
            await tick();
            assert.equal(handle.requests, 0, 'a disabled timed export does not request permissions');
            enabled = true;
            controller.onPlayerInput({ isTrusted: false });
            await tick();
            assert.equal(handle.requests, 0, 'synthetic input does not request permissions');
            controller.onPlayerInput({ isTrusted: true });
            await tick();
            assert.equal(handle.requests, 1);
            assert.equal(controller.canExport(), answer === 'granted');
            scenarios++;
        }

        for (const steam of [false, true]) {
            reset();
            state.stored.set('folder', directory({ error: 'NotAllowedError' }));
            const controller = folderController(steam);
            await controller.load();
            await controller.writeSave('save.txt', 'save');
            assert.equal(controller.isReady, false, 'revoked access locks the folder again');
            assert.equal(state.downloads.length, steam ? 0 : 1, 'only browsers fall back to a normal download');
            assert.equal(state.stored.has('files'), false, 'failed writes do not enter retention history');
            scenarios++;
        }

        reset();
        const output = directory();
        state.stored.set('folder', output);
        state.elements.offlineContainer = { style: { display: 'none' } };
        state.elements.saveType = { checked: true };
        let exports = 0;
        let captured = false;
        state.elements.exportgame = { addEventListener() {}, click() {
            exports++;
            assert.equal(state.elements.saveType.checked, false);
            queueMicrotask(() => {
                const link = new Anchor();
                link.setAttribute('id', 'downloadSave');
                link.setAttribute('href', 'data:text/plain;charset=utf-8,synthetic-save');
                link.setAttribute('download', 'scheduled.txt');
                for (const fn of state.handlers.click) fn({ target: link, isTrusted: false, preventDefault() { captured = true; } });
            });
        } };
        const scheduler = new HSAutoExport({ context: 'Test' });
        await scheduler.init();
        state.interval();
        assert.equal(exports, 0, 'a recent manual export restarts the clock');
        state.player.lastExportedSave = 0;
        state.elements.offlineContainer.style.display = 'flex';
        state.interval();
        assert.equal(exports, 0, 'offline progress blocks timed exports');
        state.elements.offlineContainer.style.display = 'none';
        state.modules.HSAutosing.isAutosingActive = () => true;
        state.interval();
        assert.equal(exports, 0, 'Auto-Sing blocks timed exports');
        state.modules.HSAutosing.isAutosingActive = () => false;
        state.interval();
        await tick();
        assert.equal(exports, 1);
        assert.equal(captured, true);
        assert.equal(output.files.get('scheduled.txt'), 'synthetic-save');
        assert.equal(state.elements.saveType.checked, true, 'the clipboard preference is restored');
        state.interval();
        assert.equal(exports, 1, 'the timed export restarts its own clock');
        scenarios++;
    } finally {
        for (const [key, value] of Object.entries(originalGlobals)) {
            if (value === undefined) delete globalThis[key];
            else globalThis[key] = value;
        }
        delete globalThis.__exportTest;
    }
    console.log(`Passed ${scenarios} auto-export workflow scenarios`);
}

main().catch(error => { console.error(error); process.exitCode = 1; });
