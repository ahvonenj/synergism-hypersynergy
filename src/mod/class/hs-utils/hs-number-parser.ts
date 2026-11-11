import Decimal from "break_infinity.js";

interface HSNumberLocale {
    // Matches one displayed number: sign, integer, fraction, exponent sign, exponent, fraction of the exponent
    pattern: RegExp;
    group: string;
    // The locale's own digits (index = value), empty when they are 0-9
    digits: string[];
}

/**
 * Class: HSNumberParser
 * IsExplicitHSModule: No
 * Description:
 *     Reads back the numbers the game displays.
 *     The game formats them with Intl.NumberFormat(undefined, …) (format() in Synergism.ts), so they follow the
 *     browser locale, not the game language: "1,234.5" in English, "1 234,5" in French (no-break spaces),
 *     "1.234,5" in German, "١٬٢٣٤٫٥" in Arabic. The separators, the digits and the exponent symbols are read once
 *     from that same Intl, like the game's cached formatters.
 *     Only for text formatted that way: a raw JS number ("1.5") is misread where "." groups thousands.
 *     Not read (NaN): the notations the game uses above e1,000,000 ("1.23e1.234M", "E1.234e6").
 * Author: Shewchou
 */
export class HSNumberParser {
    static #locale?: HSNumberLocale;

    // Invisible direction marks that right-to-left locales put around the exponent sign
    static readonly #directionMarks = new RegExp(`[${String.fromCharCode(0x200e, 0x200f, 0x061c)}]`, 'g');
    static readonly #letter = /\p{L}/u;

    /** The first number in the text, NaN if there is none. Infinity above 1.8e308: see parseDecimal(). */
    static parse(text: string | null | undefined): number {
        const first = this.#find(text, true)[0];
        return first ? Number(first) : NaN;
    }

    /** Every number in the text, in order (e.g. both sides of "1,234 / 5,678"). */
    static parseAll(text: string | null | undefined): number[] {
        return this.#find(text, false).map(found => found ? Number(found) : NaN);
    }

    /** The first number in the text as a Decimal, for values that can exceed 1.8e308. Undefined if there is none. */
    static parseDecimal(text: string | null | undefined): Decimal | undefined {
        const first = this.#find(text, true)[0];
        return first ? new Decimal(first) : undefined;
    }

    /** The numbers found, each as a plain "-1234.5e6" string. An empty string is a notation that isn't read. */
    static #find(text: string | null | undefined, firstOnly: boolean): string[] {
        if (!text) return [];

        const locale = this.#locale ??= this.#readLocale();
        const clean = text.replace(this.#directionMarks, '');
        const found: string[] = [];

        for (const match of clean.matchAll(locale.pattern)) {
            const [, sign, integer, fraction, exponentSign, exponent, exponentFraction] = match;
            const index = match.index ?? 0;
            // "E1.234e6": an "E" on its own in front of the number
            const prefixed = /e/i.test(clean[index - 1] ?? '') && !this.#letter.test(clean[index - 2] ?? '');

            if (exponentFraction || prefixed) {
                found.push('');
            } else {
                let plain = (sign ? '-' : '') + this.#toAscii(integer, locale);
                if (fraction) plain += `.${this.#toAscii(fraction, locale)}`;
                if (exponent) plain += `e${exponentSign && exponentSign !== '+' ? '-' : ''}${this.#toAscii(exponent, locale)}`;
                found.push(plain);
            }

            if (firstOnly) break;
        }

        return found;
    }

    static #toAscii(digits: string, locale: HSNumberLocale): string {
        const ungrouped = locale.group ? digits.split(locale.group).join('') : digits;
        if (locale.digits.length === 0) return ungrouped;

        return [...ungrouped].map(char => {
            const value = locale.digits.indexOf(char);
            return value === -1 ? char : String(value);
        }).join('');
    }

    static #readLocale(): HSNumberLocale {
        const escape = (text: string) => text.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&');
        const escapeInClass = (text: string) => escape(text).replace(/-/g, '\\-');
        const unmark = (text: string) => text.replace(this.#directionMarks, '');

        const parts = new Intl.NumberFormat(undefined).formatToParts(1234567.5);
        const group = unmark(parts.find(part => part.type === 'group')?.value ?? '');
        const decimal = unmark(parts.find(part => part.type === 'decimal')?.value ?? '.');

        // "0123456789" in the locale's numbering system
        const zeroToNine = [...new Intl.NumberFormat(undefined, { useGrouping: false }).format(9876543210)].reverse();
        const digits = zeroToNine.length === 10 && zeroToNine.join('') !== '0123456789' ? zeroToNine : [];

        // Numbers below 0.001 are shown in Intl's scientific notation, lowercased by the game: "1.5e-7" in English,
        // "1,5×10^−7" in Swedish. Larger ones always use the game's own "e"
        const scientific = new Intl.NumberFormat(undefined, { notation: 'scientific' }).formatToParts(-1.5e-7);
        const exponentSeparator = unmark(scientific.find(part => part.type === 'exponentSeparator')?.value ?? 'E').toLowerCase();
        const exponentMinus = unmark(scientific.find(part => part.type === 'exponentMinusSign')?.value ?? '-');

        const digit = `[0-9${digits.map(escapeInClass).join('')}]`;
        // A group separator only counts between two digits
        const integer = group ? `${digit}(?:${escape(group)}?${digit})*` : `${digit}+`;
        const separators = [...new Set([exponentSeparator, 'e'])].sort((a, b) => b.length - a.length).map(escape).join('|');
        const signs = [...new Set(['+', '-', exponentMinus])].map(escapeInClass).join('');
        const fraction = `${escape(decimal)}(${digit}+)`;

        return {
            pattern: new RegExp(`(-)?(${integer})(?:${fraction})?(?:(?:${separators})([${signs}])?(${integer})(?:${fraction})?)?`, 'giu'),
            group,
            digits
        };
    }
}
