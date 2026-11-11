const assert = require('node:assert/strict');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const esbuild = require('esbuild');

async function main() {
    const root = path.resolve(__dirname, '../..');
    const registry = 'src/mod/class/hs-core/module/hs-module-registry.ts';
    const built = await esbuild.build({
        absWorkingDir: root, entryPoints: [registry], bundle: true, write: false,
        platform: 'node', format: 'cjs', metafile: true,
    });
    assert.deepEqual(Object.keys(built.metafile.inputs), [registry], 'the registry has no runtime imports of feature classes or their dependencies');
    const sandbox = {module: {exports: {}}};
    vm.runInNewContext(built.outputFiles[0].text, sandbox);
    const {HSModuleRegistry: instances} = sandbox.module.exports;
    const ui = {moduleColor: 'blue'}, autosing = {moduleColor: 'green'};
    assert.equal(instances.getModule('HSUI'), undefined);
    instances.register('HSUI', ui);
    instances.register('HSAutosing', autosing);
    assert.equal(instances.getModule('HSUI'), ui);
    assert.equal(instances.getModule('HSAutosing'), autosing);
    assert.equal(instances.getModuleColor('HSAutosing'), 'green');
    assert.equal(instances.getModuleColor('Notify'), undefined);

    // Compile a virtual consumer against the real project types without adding test-only source to the mod.
    const configPath = path.join(root, 'tsconfig.json');
    const config = ts.parseJsonConfigFileContent(ts.readConfigFile(configPath, ts.sys.readFile).config, ts.sys, root);
    const virtualFile = path.join(root, 'src/mod/registry-type-check.ts').replaceAll('\\', '/');
    const source = `import {HSModuleRegistry} from './class/hs-core/module/hs-module-registry';
        import type {HSUI} from './class/hs-core/hs-ui';
        import type {HSAutosing} from './class/hs-modules/hs-autosing/hs-autosing';
        const ui: HSUI | undefined = HSModuleRegistry.getModule('HSUI');
        const autosing: HSAutosing | undefined = HSModuleRegistry.getModule('HSAutosing');
        // @ts-expect-error Unknown module names must be rejected.
        HSModuleRegistry.getModule('UnknownModule');
        // @ts-expect-error An instance type cannot be supplied independently of the name.
        HSModuleRegistry.getModule<HSUI>('HSAutosing');
        // @ts-expect-error The name determines the actual instance type.
        const wrong: HSUI | undefined = HSModuleRegistry.getModule('HSAutosing');
        // @ts-expect-error Registration also checks the name and instance type.
        HSModuleRegistry.register('HSUI', autosing!);
        void ui; void autosing; void wrong;`;
    const options = {...config.options, noEmit: true};
    const host = ts.createCompilerHost(options);
    const read = host.getSourceFile.bind(host);
    host.getSourceFile = (file, version, onError, createNew) => file.replaceAll('\\', '/') === virtualFile
        ? ts.createSourceFile(file, source, version, true) : read(file, version, onError, createNew);
    const program = ts.createProgram([...config.fileNames, virtualFile], options, host);
    const errors = ts.getPreEmitDiagnostics(program);
    assert.equal(errors.length, 0, ts.formatDiagnosticsWithColorAndContext(errors, {
        getCurrentDirectory: () => root, getCanonicalFileName: file => file, getNewLine: () => '\n',
    }));
    console.log('Passed module registry checks: independent runtime storage, inferred lookups, unknown-name rejection and matching registration types.');
}

main().catch(error => {console.error(error); process.exitCode = 1;});
