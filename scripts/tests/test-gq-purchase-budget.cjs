const assert = require('node:assert/strict');
const path = require('node:path');
const Module = require('node:module');
const esbuild = require('esbuild');

const root = path.resolve(__dirname, '../..');
const runtimeFile = path.join(root, 'gq-purchase-budget-test.cjs');
const runtime = new Module(runtimeFile, module);
runtime._compile(esbuild.buildSync({
    entryPoints: [path.join(root, 'src/mod/class/hs-modules/hs-qol-buttons/hs-gq-purchase-budget.ts')],
    bundle: true, write: false, platform: 'node', format: 'cjs',
}).outputFiles[0].text, runtimeFile);
const { formatGQPurchaseBudget: format } = runtime.exports;

// Vanilla Synergism.ts parseFormattedNumber: separators follow the browser locale.
function gameParse(value, locale) {
    const parts = new Intl.NumberFormat(locale).formatToParts(1000.5);
    const group = parts.find(part => part.type === 'group')?.value ?? ',';
    const decimal = parts.find(part => part.type === 'decimal')?.value ?? '.';
    const normalized = value.replaceAll(group, '').replaceAll(/\s/g, '').replace(decimal, '.');
    return normalized === '' ? NaN : Number(normalized);
}

const reportedScaleBudget = 3.187499999637097e31;
assert.ok(gameParse(reportedScaleBudget.toString(), 'de-DE') > 7.35e32,
    'The old encoding exceeds the entire balance, turning an allocation into Buy MAX.');

const amounts = [0, 1, 1000, 1000001, Number.MAX_SAFE_INTEGER, 1e20, 1e21,
    reportedScaleBudget, 7.35e32, 1.234567890123456e100, Number.MAX_VALUE];
for (const locale of ['en-US', 'de-DE', 'nl-BE', 'fr-FR', 'sv-SE', 'hi-IN', 'ar-EG', 'fa-IR']) {
    for (const amount of amounts) {
        const encoded = format(amount);
        assert.match(encoded, /^\d+(?:e[+-]?\d+)?$/);
        assert.equal(gameParse(encoded, locale), amount, `${locale}: ${amount} must round-trip exactly`);
    }
}

// Sweep the scientific range with different significands; this includes values
// beyond the safe-integer range, where rounding upwards would break the budget.
for (let exponent = 21; exponent <= 308; exponent++) {
    for (const significand of [1, 1.000000000000001, 1.234567890123456, 3.187499999637097, 9.999999999999998]) {
        const amount = significand * 10 ** exponent;
        if (Number.isFinite(amount)) assert.equal(gameParse(format(amount), 'de-DE'), amount);
    }
}
for (const amount of [-1, 0.5, NaN, Infinity, -Infinity]) {
    assert.throws(() => format(amount), /Invalid GQ purchase budget/);
}
console.log('GQ purchase budgets round-trip without overspending across browser locales.');
