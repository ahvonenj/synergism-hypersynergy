// Text matching of the perk search (docs/features/perks-find.md). Pure: no game or DOM access.

// Languages written without spaces: a word's start can't be told in them, any position counts
const NO_WORD_GAPS = /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}]/u;
const LETTER_OR_DIGIT = /[\p{L}\p{N}]/u;

/** Lower case, without accents: "Éternel" and "eternel" are the same. */
export function normalizeSearchText(text: string): string {
    return text.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();
}

export function searchTerms(query: string): string[] {
    return normalizeSearchText(query).split(/\s+/).filter(term => term !== '');
}

/** Whether every term is found in the text, at the start of a word. `text` comes from normalizeSearchText. */
export function matchesSearch(text: string, terms: string[]): boolean {
    return terms.every(term => termFound(text, term));
}

function termFound(text: string, term: string): boolean {
    if (NO_WORD_GAPS.test(term)) return text.includes(term);

    for (let index = text.indexOf(term); index !== -1; index = text.indexOf(term, index + 1)) {
        if (index === 0 || !insideWord(text[index - 1])) return true;
    }
    return false;
}

function insideWord(previous: string): boolean {
    return LETTER_OR_DIGIT.test(previous) && !NO_WORD_GAPS.test(previous);
}
