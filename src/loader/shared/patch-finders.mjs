import { findMatchingBrace, PARAMS, walkBraces } from './scanner.mjs';

export function createPatchFinders(warnIfAmbiguous) {
    const findFunctionBodyByName = (src, fnName) => {
        const escapedName = fnName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        // Not \b: minified names can start with "$" (e.g. "$w"), and \b never matches before a "$"
        const notInName = '(?<![\\w$])';
        const headerPatterns = [
            new RegExp(`${notInName}${escapedName}\\s*=\\s*(?:async\\s*)?(?:${PARAMS}|[a-zA-Z_$][\\w$]*)\\s*=>\\s*\\{`, 'g'),
            new RegExp(`${notInName}${escapedName}\\s*=\\s*(?:async\\s+)?function\\s*${PARAMS}\\s*\\{`, 'g'),
            new RegExp(`(?:async\\s+)?function\\s+${escapedName}\\s*${PARAMS}\\s*\\{`, 'g')
        ];

        for (const pattern of headerPatterns) {
            const match = pattern.exec(src);
            if (match) {
                const bodyStart = match.index + match[0].length;
                return { bodyStart, bodyEnd: findMatchingBrace(src, bodyStart), fnName };
            }
        }

        return null;
    };

    // The function headers minified code uses: x=(…)=>{  x=async e=>{  x=function(…){  function x(…){
    const functionHeaders = () => [
        new RegExp(String.raw`([a-zA-Z_$][\w$]*)\s*=\s*(?:async\s*)?(?:${PARAMS}|[a-zA-Z_$][\w$]*)\s*=>\s*\{`, 'g'),
        new RegExp(String.raw`([a-zA-Z_$][\w$]*)\s*=\s*(?:async\s+)?function\s*${PARAMS}\s*\{`, 'g'),
        new RegExp(String.raw`(?:async\s+)?function\s+([a-zA-Z_$][\w$]*)\s*${PARAMS}\s*\{`, 'g')
    ];

    // The nearest named function around src[index] whose body holds every marker, or null. Locates a minified
    // function from stable behavior inside its body instead of a minifier spelling (for example `true` vs `!0`).
    // Candidates are checked nearest-first, so nested callbacks between the function entry and the anchor are
    // skipped unless they also hold every marker.
    const findFunctionAround = (src, index, markers) => {
        const start = Math.max(0, index - 100000);
        const prefix = src.slice(start, index);
        const candidates = [];
        for (const header of functionHeaders()) {
            let match;
            while ((match = header.exec(prefix)) !== null) {
                candidates.push({ bodyStart: start + match.index + match[0].length, fnName: match[1] });
            }
        }
        candidates.sort((a, b) => b.bodyStart - a.bodyStart);
        for (const candidate of candidates) {
            const bodyEnd = findMatchingBrace(src, candidate.bodyStart);
            if (bodyEnd <= index) continue;
            const body = src.slice(candidate.bodyStart, bodyEnd);
            if (markers.every(marker => body.includes(marker))) return { ...candidate, bodyEnd };
        }
        return null;
    };

    // Find the function a patch targets by what it does: around each match of anchorRe (a /g regex), the nearest
    // named function holding every marker (findFunctionAround). Returns the first one; more than one is reported
    // under the patch's label.
    const findEnclosingFunction = (src, anchorRe, markers, label) => {
        const found = [];
        anchorRe.lastIndex = 0;
        let anchor;
        while ((anchor = anchorRe.exec(src)) !== null) {
            const result = findFunctionAround(src, anchor.index, markers);
            if (result && !found.some(f => f.bodyStart === result.bodyStart)) found.push(result);
        }
        warnIfAmbiguous(label, found.map(f => f.fnName));
        return found[0] ?? null;
    };

    // The object literal assigned to a variable (x={…}) that holds a key matched by keyRe (a /g regex) at its own
    // level, wherever the key sits in it, and every marker. Returns { start, end, name } (its braces) for the first
    // one; more than one is reported under the patch's label.
    const findAssignedObjectLiteral = (src, keyRe, markers, label) => {
        const found = [];
        keyRe.lastIndex = 0;
        let key;
        while ((key = keyRe.exec(src)) !== null) {
            const windowStart = Math.max(0, key.index - 100000);
            const assignOpen = /([a-zA-Z_$][\w$]*)\s*=\s*\{/g;
            const opens = [];
            let open;
            while ((open = assignOpen.exec(src.slice(windowStart, key.index))) !== null) {
                opens.push({ start: windowStart + open.index + open[0].length - 1, name: open[1] });
            }
            // Nearest first: skip the literals closed before the key; the first one around it must hold it directly
            for (const candidate of opens.reverse()) {
                const depth = walkBraces(src, candidate.start + 1, key.index);
                if (depth === 0) continue;
                if (depth === 1) {
                    const end = findMatchingBrace(src, candidate.start + 1);
                    const literal = src.slice(candidate.start, end);
                    if (end > key.index && markers.every(marker => literal.includes(marker))
                        && !found.some(f => f.start === candidate.start)) {
                        found.push({ ...candidate, end });
                    }
                }
                break;
            }
        }
        warnIfAmbiguous(label, found.map(f => f.name));
        return found[0] ?? null;
    };

    // Expose a function found by findEnclosingFunction as window[globalName], without calling or wrapping it.
    // Where it's defined when it's an arrow or a function expression, so it exists as soon as the bundle runs:
    //   eK=e=>{  becomes  eK=window.__HS_x=e=>{
    // Otherwise at the start of its body: it then exists once the game has called it.
    const exposeFunction = (src, result, globalName) => {
        // Escaped, and not \b: minified names can start with "$"
        const escapedFn = result.fnName.replace(/\$/g, '\\$');
        const headerStart = Math.max(0, result.bodyStart - 300);
        const header = src.slice(headerStart, result.bodyStart);
        const exprHeader = new RegExp(
            String.raw`(?<![\w$.])${escapedFn}\s*=\s*(?=(?:async\s*)?(?:${PARAMS}|[\w$]+)\s*=>\s*\{$|(?:async\s+)?function\s*${PARAMS}\s*\{$)`
        ).exec(header);
        if (exprHeader) {
            const insertAt = headerStart + exprHeader.index + exprHeader[0].length;
            return { code: src.slice(0, insertAt) + `window.${globalName}=` + src.slice(insertAt), atDefinition: true };
        }
        return {
            code: src.slice(0, result.bodyStart) + `\nwindow.${globalName}=${result.fnName};\n` + src.slice(result.bodyStart),
            atDefinition: false
        };
    };

    return { findFunctionBodyByName, findFunctionAround, findEnclosingFunction, findAssignedObjectLiteral, exposeFunction };
}
