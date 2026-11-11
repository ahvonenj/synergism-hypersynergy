// Minified function headers accept defaults with one level of parentheses.
export const PARAMS = String.raw`\((?:[^()]|\([^()]*\))*\)`;

const CONTROL_HEADERS = new Set(['if', 'for', 'while', 'with', 'switch', 'catch']);
const BLOCK_PREFIXES = new Set(['condition', 'else', 'do', 'try', 'finally', 'block']);
const EXPRESSION_PREFIXES = new Set([
    'return', 'throw', 'case', 'delete', 'void', 'typeof', 'new', 'in', 'instanceof',
    'yield', 'await', 'else', 'do',
]);

function isLineBreak(char) {
    return char === '\n' || char === '\r' || char === '\u2028' || char === '\u2029';
}

function isWordChar(code) {
    return (code >= 48 && code <= 57) || (code >= 65 && code <= 90)
        || (code >= 97 && code <= 122) || code === 95 || code === 36;
}

function skipString(source, start, quote) {
    for (let i = start + 1; i < source.length; i++) {
        if (source[i] === '\\') i++;
        else if (source[i] === quote) return i;
    }
    return source.length;
}

function skipTemplate(source, start) {
    for (let i = start + 1; i < source.length; i++) {
        if (source[i] === '\\') i++;
        else if (source[i] === '`') return i;
        else if (source[i] === '$' && source[i + 1] === '{') {
            const end = findMatchingBrace(source, i + 2);
            if (end < 0) return source.length;
            i = end;
        }
    }
    return source.length;
}

function skipRegExp(source, start) {
    let inClass = false;
    for (let i = start + 1; i < source.length; i++) {
        const char = source[i];
        if (isLineBreak(char)) return -1;
        if (char === '\\') i++;
        else if (char === '[') inClass = true;
        else if (char === ']') inClass = false;
        else if (char === '/' && !inClass) {
            while (isWordChar(source.charCodeAt(i + 1))) i++;
            return i;
        }
    }
    return -1;
}

// Visits delimiters outside comments and literals. The preceding token distinguishes regexes from
// division in the expression and control-header shapes used by the minified bundle.
function scanDelimiters(source, start, limit, visit) {
    let regexAllowed = true;
    let previous = '';
    const parens = [];
    const blocks = [];

    for (let i = start; i < limit; i++) {
        const char = source[i];
        const next = source[i + 1];
        if (char <= ' ' || isLineBreak(char)) continue;

        if (char === '/' && next === '/') {
            while (i + 1 < limit && !isLineBreak(source[i + 1])) i++;
            continue;
        }
        if (char === '/' && next === '*') {
            const end = source.indexOf('*/', i + 2);
            if (end === -1) return -1;
            i = end + 1;
            continue;
        }

        if (char === '"' || char === "'" || char === '`') {
            i = char === '`' ? skipTemplate(source, i) : skipString(source, i, char);
            previous = 'value';
            regexAllowed = false;
            continue;
        }
        if (char === '/' && regexAllowed) {
            const end = skipRegExp(source, i);
            if (end !== -1) {
                i = end;
                previous = 'value';
                regexAllowed = false;
                continue;
            }
        }
        if (isWordChar(source.charCodeAt(i))) {
            const wordStart = i;
            while (isWordChar(source.charCodeAt(i + 1))) i++;
            const word = source.slice(wordStart, i + 1);
            const member = previous === '.';
            previous = member ? 'value' : word;
            regexAllowed = !member && EXPRESSION_PREFIXES.has(word);
            continue;
        }

        if ('()[]{},'.includes(char) && visit(char, i)) return i;
        if (char === '(') parens.push(CONTROL_HEADERS.has(previous));
        if (char === '{') blocks.push(BLOCK_PREFIXES.has(previous));
        if (char === ')') {
            regexAllowed = parens.pop() === true;
            previous = regexAllowed ? 'condition' : char;
        } else if (char === '}') {
            regexAllowed = blocks.pop() === true;
            previous = regexAllowed ? 'block' : char;
        } else if ((char === '+' || char === '-') && next === char) {
            // Prefix ++/-- keeps expecting an operand. Postfix ++/-- can precede division.
            i++;
            previous = char;
        } else {
            regexAllowed = '([{,;:=!?&|^~+-%*/<>'.includes(char);
            previous = char;
        }
    }
    return -1;
}

// bodyStart follows an opening brace. With until, return the depth at that offset instead.
export function walkBraces(source, bodyStart, until = -1) {
    let depth = 1;
    const closingBrace = scanDelimiters(source, bodyStart, until < 0 ? source.length : until, char => {
        if (char === '{') depth++;
        else if (char === '}') return --depth === 0;
        return false;
    });
    return until < 0 ? closingBrace : depth;
}

export function findMatchingBrace(source, bodyStart) {
    return walkBraces(source, bodyStart);
}

export function splitParams(list) {
    const params = [];
    let depth = 0;
    let start = 0;
    scanDelimiters(list, 0, list.length, (char, index) => {
        if ('([{'.includes(char)) depth++;
        else if (')]}'.includes(char)) depth--;
        else if (char === ',' && depth === 0) {
            params.push(list.slice(start, index).trim());
            start = index + 1;
        }
        return false;
    });
    const last = list.slice(start).trim();
    if (last) params.push(last);
    return params;
}
