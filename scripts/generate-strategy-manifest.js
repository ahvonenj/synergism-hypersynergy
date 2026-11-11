// scripts/generate-strategy-manifest.js
const fs = require('fs');
const path = require('path');
const dir = path.join(__dirname, '../src/mod/resource/json/strategies');
const files = fs.readdirSync(dir).filter(f => f.endsWith('.json') && f !== 'manifest.json');
fs.writeFileSync(path.join(dir, 'manifest.json'), JSON.stringify(files, null, 2));
console.log('Strategy manifest generated:', files);