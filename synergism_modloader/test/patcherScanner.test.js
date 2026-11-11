const test = require('node:test')
const assert = require('node:assert/strict')
const { patchBundle } = require('../lib/patcher.js')

const scanner = import('../../src/loader/shared/scanner.mjs')

test('brace scanner separates regexes, division and nested template expressions', async () => {
    const { findMatchingBrace, walkBraces } = await scanner
    const source = [
        'f=()=>{',
        'const pattern=/[/}]/g; if(ok()) /[}]/.test(value);',
        'if(ok()){value=1} /[}]/.test(value);',
        'const ratio=of / ({ value: 2 }).value / count;',
        'const next=value++ / /[}]/.test(value);',
        'const text=`before ${`inside ${/[}]/.source}`} after }`;',
        '/* } */ // }\n',
        'return {value: ratio};',
        '}; trailing()',
    ].join('')
    const start = source.indexOf('{') + 1
    const end = source.lastIndexOf('};')
    assert.equal(findMatchingBrace(source, start), end)
    assert.equal(walkBraces(source, start, source.indexOf('value: 2')), 2)
    assert.equal(walkBraces(source, start, source.indexOf('value: ratio')), 2)
    assert.equal(walkBraces(source, start, source.indexOf('trailing')), 0)
    assert.equal(findMatchingBrace(source.slice(0, end), start), -1)
})

test('parameter scanner keeps commas inside defaults', async () => {
    const { splitParams } = await scanner
    assert.deepEqual(splitParams('one="x,y}", two=/[,}]/, three=`x,${`a,b`}`, four=f(a,b), reset=false'), [
        'one="x,y}"', 'two=/[,}]/', 'three=`x,${`a,b`}`', 'four=f(a,b)', 'reset=false',
    ])
})

test('a regex before a patch anchor does not truncate the function body', () => {
    const code = 'const save=(manual=!1)=>{const pattern=/[}]/;translate("testing.gameSaved");' +
        'let now=Date.now();(manual||now-last>=6e4)&&(last=now,sync());return pattern}';
    const patched = patchBundle(code, { steam: true, log() {}, warn() {} })
    assert.match(patched, /"steamAutoSync":true/)
    assert.ok(patched.includes('(now - last >= 6e4)&&(last=now,sync())'))
    assert.doesNotThrow(() => new Function(patched))
})
