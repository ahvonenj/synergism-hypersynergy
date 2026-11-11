const assert = require('node:assert/strict');
const path = require('node:path');
const Module = require('node:module');
const esbuild = require('esbuild');

// HSNumberParser under several browser locales, without Chrome: Intl.NumberFormat(undefined) is forced to each
// locale, and the parser is loaded again for each one (it reads the locale once).
async function main() {
    const root = path.resolve(__dirname, '../..');
    const bundled = await esbuild.build({
        entryPoints: [path.join(root, 'src/mod/class/hs-utils/hs-number-parser.ts')],
        bundle: true, write: false, platform: 'node', format: 'cjs',
    });
    const RealNumberFormat = Intl.NumberFormat;
    const loadParser = locale => {
        const Forced = function NumberFormat(locales, options) { return new RealNumberFormat(locales ?? locale, options); };
        Forced.prototype = RealNumberFormat.prototype;
        Forced.supportedLocalesOf = RealNumberFormat.supportedLocalesOf;
        Intl.NumberFormat = Forced;
        const runtime = new Module(path.join(root, 'number-parser-test-runtime.cjs'), module);
        runtime.paths = module.paths;
        runtime._compile(bundled.outputFiles[0].text, runtime.filename = path.join(root, 'number-parser-test-runtime.cjs'));
        return runtime.exports.HSNumberParser;
    };

    // Text shaped like the game's format() (Synergism.ts): signDisplay 'never' with its own "-" in front, tiny
    // numbers in Intl's scientific notation lowercased, large ones as mantissa + "e" + formatted power.
    const display = (locale, value, { digits = 2, power } = {}) => {
        const sign = value < 0 || power?.negative ? '-' : '';
        const options = { roundingMode: 'trunc', signDisplay: 'never' };
        if (power) {
            const mantissa = new RealNumberFormat(locale, { ...options, maximumFractionDigits: 2 }).format(power.mantissa);
            return `${sign}${mantissa}e${new RealNumberFormat(locale, { ...options, maximumFractionDigits: 0 }).format(power.exponent)}`;
        }
        if (value !== 0 && Math.abs(value) < 1e-3) {
            return sign + new RealNumberFormat(locale, { ...options, notation: 'scientific', maximumSignificantDigits: 3 }).format(value).toLowerCase();
        }
        return sign + new RealNumberFormat(locale, { ...options, maximumFractionDigits: digits }).format(value);
    };

    let scenarios = 0;
    try {
        // de-CH groups with ’, sv-SE writes "1,5×10^−7", ar-EG and fa-IR have their own digits and direction marks,
        // hi-IN groups by two above the thousands
        for (const locale of ['en-US', 'fr-FR', 'de-DE', 'de-CH', 'sv-SE', 'ar-EG', 'fa-IR', 'hi-IN']) {
            const parser = loadParser(locale);
            for (const value of [0, 7, -12345, 1234567.5, 0.25, 98765.43, 1.5e-7, -2.5e-5]) {
                const text = display(locale, value);
                assert.equal(parser.parse(text), value, `${locale}: ${JSON.stringify(text)}`);
                assert.equal(parser.parse(`Cost: ${text} Obtainium`), value, `${locale}: ${JSON.stringify(text)} in a sentence`);
            }
            const large = display(locale, 0, { power: { mantissa: 4.56, exponent: 12 } });
            assert.equal(parser.parse(large), 4.56e12, `${locale}: ${JSON.stringify(large)}`);
            const huge = display(locale, 0, { power: { mantissa: 1.23, exponent: 45678 } });
            assert.equal(parser.parse(huge), Infinity, `${locale}: ${JSON.stringify(huge)}`);
            const decimal = parser.parseDecimal(huge);
            assert.equal(decimal.exponent, 45678, `${locale}: ${JSON.stringify(huge)} as a Decimal`);
            assert.ok(Math.abs(decimal.mantissa - 1.23) < 1e-9, `${locale}: ${JSON.stringify(huge)} as a Decimal`);
            const pair = `${display(locale, 1234)} / ${display(locale, 5678)}`;
            assert.deepEqual(parser.parseAll(pair), [1234, 5678], `${locale}: ${JSON.stringify(pair)}`);
            // Above e1,000,000 the game's notations aren't read
            assert.ok(Number.isNaN(parser.parse(`${display(locale, 1.23)}e${display(locale, 1.234, { digits: 3 })}M`)), locale);
            assert.ok(Number.isNaN(parser.parse(`E${display(locale, 1.234, { digits: 3 })}e6`)), locale);
            assert.equal(parser.parseDecimal('E1e6'), undefined);
            assert.ok(Number.isNaN(parser.parse('no number')));
            assert.ok(Number.isNaN(parser.parse(null)));
            assert.deepEqual(parser.parseAll(''), []);
            scenarios++;
        }

        // Written by hand, so the checks above don't only compare Intl with itself
        const handWritten = {
            'en-US': [['1,234.5', 1234.5], ['1,234 / 5,678', [1234, 5678]], ['1.5e-7', 1.5e-7], ['2.50e1,234', Infinity]],
            'fr-FR': [['1 234,5', 1234.5], ['1,5e-7', 1.5e-7], ['12 345 678', 12345678]],
            // The trap the parser exists for: "1.234" is a thousand and more in German
            'de-DE': [['1.234', 1234], ['1.234,5', 1234.5], ['0,25', 0.25]],
            'ar-EG': [['١٬٢٣٤٫٥', 1234.5]],
        };
        for (const [locale, cases] of Object.entries(handWritten)) {
            const parser = loadParser(locale);
            for (const [text, expected] of cases) {
                if (Array.isArray(expected)) assert.deepEqual(parser.parseAll(text), expected, `${locale}: ${text}`);
                else assert.equal(parser.parse(text), expected, `${locale}: ${text}`);
            }
            scenarios++;
        }
        console.log(`Passed ${scenarios} number parser scenarios.`);
    } finally {
        Intl.NumberFormat = RealNumberFormat;
    }
}

main().catch(error => { console.error(error); process.exitCode = 1; });
