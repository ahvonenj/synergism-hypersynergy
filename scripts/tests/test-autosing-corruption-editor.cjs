const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const esbuild = require('esbuild');

// Exercise the editor's real field loading, validation and serialization without opening a game window.
async function main() {
    const root = path.resolve(__dirname, '../..');
    const editor = path.join(root, 'src/mod/class/hs-modules/hs-autosing/ui/hs-autosing-challenge-modal.ts');
    const bundled = await esbuild.build({
        entryPoints: [editor], bundle: true, write: false, platform: 'node', format: 'cjs',
        plugins: [{ name: 'editor-boundary', setup(build) {
            build.onResolve({ filter: /hs-utils$/ }, () => ({ path: 'utils', namespace: 'test' }));
            build.onLoad({ filter: /.*/, namespace: 'test' }, () => ({
                contents: 'export const HSUtils = {uuidv4: () => "test-id"};', loader: 'ts',
            }));
            build.onLoad({ filter: /hs-autosing-challenge-modal\.ts$/ }, () => ({
                contents: fs.readFileSync(editor, 'utf8').replace('    constructor(', `
                    configureForTest() {
                        this.#fields = new Map(INPUT_ROWS.map(row => [row.key, {
                            value: '', checked: false, classList: {toggle() {}}
                        } as unknown as HTMLInputElement]));
                        this.#rows = FIELD_ROWS.map(row => ({row, element: {hidden: false} as HTMLElement}));
                        this.#addButton = {classList: {toggle() {}}} as unknown as HTMLElement;
                    }
                    loadForTest(step: Challenge | null) { this.#fillFields(step); }
                    setForTest(key: FieldKey, value: string | boolean) {
                        const field = this.#field(key) as HTMLInputElement;
                        if (typeof value === 'boolean') field.checked = value;
                        else field.value = value;
                        this.#showFields();
                    }
                    readForTest() {
                        return {checked: (this.#field('ascendAfterCorruption') as HTMLInputElement).checked,
                            hidden: this.#rows.find(entry => 'key' in entry.row && entry.row.key === 'ascendAfterCorruption')!.element.hidden,
                            error: this.#badReason, step: this.#buildStep(null)};
                    }
                    htmlForTest() { return this.#renderWindow(); }
                    labelForTest(step: Challenge) { return this.#renderStepText(step, 0); }
                    constructor(`),
                loader: 'ts',
            }));
        } }],
    });
    const runtime = new Module(path.join(root, 'editor-test-runtime.cjs'), module);
    runtime.filename = path.join(root, 'editor-test-runtime.cjs');
    runtime.paths = module.paths;
    runtime._compile(bundled.outputFiles[0].text, runtime.filename);
    const editorInstance = new runtime.exports.HSAutosingChallengeModal({}, [], 'Test', () => {});
    editorInstance.configureForTest();
    const corruption = {challengeNumber: 403, corruptionLevel: 20, challengeCompletions: 1,
        challengeWaitTime: 0, challengeMaxTime: 0, challengeWaitBefore: 50, comment: 'Keep this'};
    editorInstance.loadForTest(corruption);
    assert.deepEqual(editorInstance.readForTest(), {checked:true, hidden:false, error:null,
        step:{...corruption, challengeCompletions:0, ascendAfterCorruption:true}});
    assert.match(editorInstance.htmlForTest(), /<label[^>]*><input type="checkbox"[^>]*data-field="ascendAfterCorruption"[^>]*\/>Ascend immediately<\/label>/);

    editorInstance.setForTest('ascendAfterCorruption', false);
    const deferred = editorInstance.readForTest();
    assert.equal(deferred.error, null);
    assert.equal(deferred.step.ascendAfterCorruption, false);
    assert.match(editorInstance.labelForTest(deferred.step), /next ascension/);
    editorInstance.loadForTest(JSON.parse(JSON.stringify(deferred.step)));
    assert.equal(editorInstance.readForTest().checked, false);
    editorInstance.setForTest('ascendAfterCorruption', true);
    assert.match(editorInstance.labelForTest(editorInstance.readForTest().step), /ascend now/);

    editorInstance.setForTest('action', '152');
    assert.equal(editorInstance.readForTest().hidden, true);
    assert.equal(Object.hasOwn(editorInstance.readForTest().step, 'ascendAfterCorruption'), false);
    editorInstance.loadForTest(null);
    editorInstance.setForTest('action', '403');
    assert.equal(editorInstance.readForTest().checked, true);
    assert.equal(editorInstance.readForTest().error, null);
    console.log('Passed corruption editor checks: defaults, checkbox, mode labels, save/reload, and action switching.');
}
main().catch(error => { console.error(error); process.exitCode = 1; });
