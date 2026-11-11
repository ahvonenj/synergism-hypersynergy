// Counts how often each setting key, settingAction and controlGroup appears in the mod source.
const fs = require('fs'), path = require('path');
const root = process.argv[2];
const read = f => fs.readFileSync(path.join(root, f), 'utf8');
const s = JSON.parse(read('src/mod/resource/json/hs-settings.json'));
const groups = JSON.parse(read('src/mod/resource/json/hs-settings-control-groups.json'));
const pages = JSON.parse(read('src/mod/resource/json/hs-settings-control-pages.json'));
function walk(d) { return fs.readdirSync(d, { withFileTypes: true }).flatMap(e => e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]); }
const srcFiles = walk(path.join(root, 'src/mod')).filter(f => f.endsWith('.ts'));
const src = srcFiles.map(f => fs.readFileSync(f, 'utf8')).join('\n');
const count = w => (src.match(new RegExp('\\b' + w + '\\b', 'g')) || []).length;
console.log('settings', Object.keys(s).length, 'files', srcFiles.length);
for (const [k, v] of Object.entries(s)) {
    const n = count(k);
    const a = v.settingAction ? `${v.settingAction}=${count(v.settingAction)}` : '';
    if (n <= 2 || (v.settingAction && count(v.settingAction) <= 1)) console.log(`${k}=${n} ${a} group=${v.settingControl?.controlGroup} page=${v.settingControl?.controlPage}`);
}
const usedGroups = new Set(Object.values(s).map(v => v.settingControl?.controlGroup));
console.log('groups unused by settings:', Object.keys(groups).filter(g => !usedGroups.has(g)));
const usedPages = new Set([...Object.values(s).map(v => v.settingControl?.controlPage), ...Object.values(groups).map(g => g.controlPage || g.page)]);
console.log('pages:', Object.keys(pages), 'used:', [...usedPages]);
