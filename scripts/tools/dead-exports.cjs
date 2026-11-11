// Lists exported declarations with no reference outside their own declaration,
// files not reachable from the entry points, and class members never referenced.
const path = require('path');
const root = process.argv[2];
const ts = require(path.join(root, 'node_modules/typescript'));

const configPath = path.join(root, 'tsconfig.json');
const cfg = ts.parseJsonConfigFileContent(ts.readConfigFile(configPath, ts.sys.readFile).config, ts.sys, root);
const files = cfg.fileNames.filter(f => f.endsWith('.ts'));
const versions = {};
const host = {
    getScriptFileNames: () => files,
    getScriptVersion: () => '1',
    getScriptSnapshot: f => ts.sys.fileExists(f) ? ts.ScriptSnapshot.fromString(ts.sys.readFile(f)) : undefined,
    getCurrentDirectory: () => root,
    getCompilationSettings: () => cfg.options,
    getDefaultLibFileName: o => ts.getDefaultLibFilePath(o),
    fileExists: ts.sys.fileExists, readFile: ts.sys.readFile, readDirectory: ts.sys.readDirectory,
    directoryExists: ts.sys.directoryExists, getDirectories: ts.sys.getDirectories,
};
const ls = ts.createLanguageService(host, ts.createDocumentRegistry());
const program = ls.getProgram();
const rel = f => path.relative(root, f).replace(/\\/g, '/');

const mode = process.argv[3] || 'exports';

function refsOutsideDecl(fileName, nameNode) {
    const refs = ls.findReferences(fileName, nameNode.getStart()) || [];
    let n = 0;
    for (const r of refs) for (const e of r.references) {
        if (e.isDefinition) continue;
        n++;
    }
    return n;
}

const out = [];
for (const sf of program.getSourceFiles()) {
    if (sf.isDeclarationFile || !files.includes(path.normalize(sf.fileName)) && !files.map(path.normalize).includes(path.normalize(sf.fileName))) continue;
    const visit = (node, inClass) => {
        if (mode === 'exports' && (ts.isFunctionDeclaration(node) || ts.isClassDeclaration(node) || ts.isInterfaceDeclaration(node) || ts.isTypeAliasDeclaration(node) || ts.isEnumDeclaration(node) || ts.isVariableStatement(node))) {
            const exported = (ts.getCombinedModifierFlags(node.declarationList ? node.declarationList.declarations[0] : node) & ts.ModifierFlags.Export) || (node.modifiers || []).some(m => m.kind === ts.SyntaxKind.ExportKeyword);
            if (exported) {
                const names = node.declarationList ? node.declarationList.declarations.map(d => d.name) : [node.name];
                for (const nm of names) {
                    if (!nm || !ts.isIdentifier(nm)) continue;
                    const n = refsOutsideDecl(sf.fileName, nm);
                    if (n === 0) out.push(`${rel(sf.fileName)}:${sf.getLineAndCharacterOfPosition(nm.getStart()).line + 1} ${nm.text}`);
                }
            }
        }
        if (mode === 'members' && (ts.isMethodDeclaration(node) || ts.isPropertyDeclaration(node) || ts.isGetAccessor(node) || ts.isSetAccessor(node)) && node.name && (ts.isIdentifier(node.name))) {
            if (ts.isClassLike(node.parent)) {
                const n = refsOutsideDecl(sf.fileName, node.name);
                if (n === 0) out.push(`${rel(sf.fileName)}:${sf.getLineAndCharacterOfPosition(node.name.getStart()).line + 1} ${node.parent.name ? node.parent.name.text : '?'}.${node.name.text}`);
            }
        }
        if (mode === 'members' && ts.isPropertySignature(node) && node.name && ts.isIdentifier(node.name) && ts.isInterfaceDeclaration(node.parent)) {
            const n = refsOutsideDecl(sf.fileName, node.name);
            if (n === 0) out.push(`${rel(sf.fileName)}:${sf.getLineAndCharacterOfPosition(node.name.getStart()).line + 1} ${node.parent.name.text}.${node.name.text} (iface)`);
        }
        ts.forEachChild(node, c => visit(c));
    };
    visit(sf);
}

if (mode === 'files') {
    const entries = ['src/mod/index.ts', 'src/mod/class/hs-modules/hs-heater/hs-heater-optimizer-worker.ts'].map(f => path.normalize(path.join(root, f)));
    const seen = new Set();
    const stack = [...entries];
    while (stack.length) {
        const f = stack.pop();
        if (seen.has(f)) continue;
        seen.add(f);
        const sf = program.getSourceFile(f) || program.getSourceFiles().find(s => path.normalize(s.fileName) === f);
        if (!sf) continue;
        for (const imp of sf.statements) {
            const spec = (ts.isImportDeclaration(imp) || ts.isExportDeclaration(imp)) && imp.moduleSpecifier && imp.moduleSpecifier.text;
            if (!spec) continue;
            const r = ts.resolveModuleName(spec, sf.fileName, cfg.options, ts.sys).resolvedModule;
            if (r && !r.isExternalLibraryImport) stack.push(path.normalize(r.resolvedFileName));
        }
        // dynamic import()
        const walk = n => { if (ts.isCallExpression(n) && n.expression.kind === ts.SyntaxKind.ImportKeyword && n.arguments[0] && ts.isStringLiteral(n.arguments[0])) { const r = ts.resolveModuleName(n.arguments[0].text, sf.fileName, cfg.options, ts.sys).resolvedModule; if (r) stack.push(path.normalize(r.resolvedFileName)); } ts.forEachChild(n, walk); };
        walk(sf);
    }
    for (const f of files) if (!seen.has(path.normalize(f))) out.push(rel(f));
}
console.log(out.join('\n'));
console.error(`${out.length} items`);
