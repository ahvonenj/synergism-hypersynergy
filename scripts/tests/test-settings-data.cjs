const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');

// Rules on the settings data that #validateSetting doesn't check at startup, most of them silent when broken
// (docs/dev/code.md, Settings). Only the file is read: this says nothing about what a setting does.
const root = path.resolve(__dirname, '../..');
const readJson = file => JSON.parse(fs.readFileSync(path.join(root, 'src/mod/resource/json', file), 'utf8'));

// The keys of #settingActions, from the syntax tree: the file imports the whole mod, so it can't run in node
function readActionNames() {
    const file = path.join(root, 'src/mod/class/hs-core/settings/hs-setting-action.ts');
    const source = ts.createSourceFile(file, fs.readFileSync(file, 'utf8'), ts.ScriptTarget.Latest);
    let names = null;

    const visit = node => {
        if (ts.isPropertyDeclaration(node) && ts.isPrivateIdentifier(node.name) && node.name.text === '#settingActions') {
            names = new Set(node.initializer.properties.map(property => {
                if (!property.name?.text) throw new Error(`#settingActions: can't read the key of "${property.getText(source)}"`);
                return property.name.text;
            }));
        }
        ts.forEachChild(node, visit);
    };
    visit(source);

    if (!names) throw new Error('#settingActions not found in hs-setting-action.ts');
    return names;
}

function findProblems(settings, pages, actionNames) {
    const problems = [];
    const idOwners = new Map();

    for (const [key, setting] of Object.entries(settings)) {
        const control = setting.settingControl;

        if (setting.settingAction) {
            if (!actionNames.has(setting.settingAction)) {
                problems.push(`${key}: no handler for settingAction "${setting.settingAction}", the setting would do nothing`);
            }
        }

        if (setting.settingHelpText?.includes('"')) {
            problems.push(`${key}: double quote in settingHelpText, it would break the title attribute of its buttons`);
        }

        if (!control) continue;

        if (setting.hidden !== true && !Object.hasOwn(pages, control.controlPage)) {
            problems.push(`${key}: controlPage "${control.controlPage}" doesn't exist, the setting would have no tab in the panel`);
        }

        for (const id of [control.controlId, control.controlEnabledId]) {
            if (!id) continue;
            if (idOwners.has(id)) {
                problems.push(`${key}: id "${id}" is also used by ${idOwners.get(id)}, the mod would update the other setting's control`);
            } else {
                idOwners.set(id, key);
            }
        }
    }

    return problems;
}

const settings = readJson('hs-settings.json');
const pages = readJson('hs-settings-control-pages.json');
const actionNames = readActionNames();
let scenarios = 0;

// The real data
const problems = findProblems(settings, pages, actionNames);
assert.equal(problems.length, 0, `\n${problems.join('\n')}`);
scenarios++;

// Each rule catches its mistake when made on the real data
const expectOneProblem = (change, expected) => {
    const broken = structuredClone(settings);
    change(broken);
    const found = findProblems(broken, pages, actionNames);
    assert.equal(found.length, 1, found.join('\n'));
    assert.match(found[0], expected);
    scenarios++;
};
const entries = Object.entries(settings);
const withAction = entries.find(([, setting]) => setting.settingAction && setting.settingControl)[0];
const withId = entries.filter(([, setting]) => setting.settingControl?.controlId).map(([key]) => key);
const withSwitch = entries.find(([, setting]) => setting.settingControl?.controlEnabledId)[0];
const shown = entries.find(([, setting]) => setting.settingControl && setting.hidden !== true)[0];

expectOneProblem(broken => { broken[withAction].settingAction += 'Typo'; }, /no handler/);
expectOneProblem(broken => { broken[shown].settingHelpText = 'A "quoted" word'; }, /double quote/);
expectOneProblem(broken => { broken[shown].settingControl.controlPage = 'noSuchPage'; }, /controlPage/);
expectOneProblem(broken => { broken[withId[1]].settingControl.controlId = settings[withId[0]].settingControl.controlId; }, /also used by/);

// An id is shared across both fields: a switch and a value control can clash too
const otherThanSwitch = withId.find(key => key !== withSwitch);
expectOneProblem(broken => { broken[otherThanSwitch].settingControl.controlId = settings[withSwitch].settingControl.controlEnabledId; }, /also used by/);

// A hidden setting's control is never built, so its page doesn't matter
{
    const broken = structuredClone(settings);
    broken[shown].hidden = true;
    broken[shown].settingControl.controlPage = 'noSuchPage';
    assert.deepEqual(findProblems(broken, pages, actionNames), []);
    scenarios++;
}

console.log(`Passed ${scenarios} settings data scenarios (${entries.length} settings, ${actionNames.size} actions).`);
