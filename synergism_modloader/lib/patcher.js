// Shared bundle patcher for browser userscripts and the desktop launcher.
// The browser startup code below uses this same function with Steam changes disabled.

// For the header modules patch (see there). Self-contained: its source is written into the game bundle.
// A copy of the player without the mod's module ids ("hs" then a capital letter) in its headerLayouts (slots, hidden,
// sizes, positions), or the same object when there are none. Never changes what it's given.
function capSaveSeeds(player) {
    const seeds = player && player.seed;
    if (!Array.isArray(seeds)) return player;
    const now = Date.now();
    if (!seeds.some(seed => seed > now)) return player;
    return Object.assign({}, player, { seed: seeds.map(seed => Math.min(seed, now)) });
}

function stripHeaderModules(player) {
    const isMod = id => typeof id === 'string' && /^hs[A-Z]/.test(id);
    const layouts = player && player.headerLayouts;
    if (!layouts || typeof layouts !== 'object') return player;
    const withoutMod = record => {
        if (!record || typeof record !== 'object' || !Object.keys(record).some(isMod)) return record;
        const copy = Object.assign({}, record);
        for (const id of Object.keys(copy)) if (isMod(id)) delete copy[id];
        return copy;
    };
    let changed = false;
    const strippedLayouts = {};
    for (const key of Object.keys(layouts)) {
        const layout = layouts[key];
        strippedLayouts[key] = layout;
        if (!layout || typeof layout !== 'object' || !layout.regions || typeof layout.regions !== 'object') continue;
        let found = false;
        // Left alone in a slot, a module loses the stack's S size, as when the game unstacks it
        const unstacked = [];
        const regions = {};
        for (const region of Object.keys(layout.regions)) {
            const slots = layout.regions[region];
            regions[region] = !Array.isArray(slots) ? slots : slots.map(slot => {
                if (!Array.isArray(slot) || !slot.some(isMod)) return slot;
                found = true;
                const kept = slot.filter(id => !isMod(id));
                if (kept.length === 1) unstacked.push(kept[0]);
                return kept;
            });
        }
        let sizes = withoutMod(layout.sizes);
        const positions = withoutMod(layout.positions);
        const hidden = Array.isArray(layout.hidden) ? layout.hidden.filter(id => !isMod(id)) : layout.hidden;
        if (!found && sizes === layout.sizes && positions === layout.positions
            && (!Array.isArray(hidden) || hidden.length === layout.hidden.length)) continue;
        if (sizes && typeof sizes === 'object' && unstacked.some(id => sizes[id] === 'S')) {
            sizes = Object.assign({}, sizes);
            for (const id of unstacked) if (sizes[id] === 'S') delete sizes[id];
        }
        strippedLayouts[key] = Object.assign({}, layout, { regions, sizes, hidden, positions });
        changed = true;
    }
    return changed ? Object.assign({}, player, { headerLayouts: strippedLayouts }) : player;
}

function patchBundle(code, options = {}) {
    const log = options.log || ((...a) => console.log('[PATCH]', ...a));
    const warn = options.warn || ((...a) => console.warn('[PATCH]', ...a));
    // What each patch did ({ name: applied }): one summary line at the end, and window.__HS_PATCH_REPORT in the
    // bundle, read by the browser loader and the mod
    const report = {};
    // The patches whose anchor matched more than one place (labels), as window.__HS_PATCH_AMBIGUOUS
    const ambiguous = [];
    // Lines for the top of the bundle, written after its "use strict" directive (see the end)
    const topLines = [];
    // ==================================================================================
    // ───────────────────────────────── BUNDLE PATCHES ─────────────────────────────────

    // Walks src from bodyStart (just after a `{`), skipping strings and comments. Returns the index of the matching
    // `}` (-1 if none), or, with `until`, the brace depth at that index (1 = directly inside, 0 = closed before it).
    const walkBraces = (src, bodyStart, until = -1) => {
        let depth = 1;
        let quote = null;
        let escaped = false;
        const notFound = () => (until >= 0 ? depth : -1);

        for (let i = bodyStart; i < src.length; i++) {
            if (until >= 0 && i >= until) return depth;
            const char = src[i];
            const next = src[i + 1];

            if (quote) {
                if (escaped) escaped = false;
                else if (char === '\\') escaped = true;
                else if (char === quote) quote = null;
                continue;
            }

            if (char === '"' || char === "'" || char === '`') {
                quote = char;
                continue;
            }
            if (char === '/' && next === '/') {
                i = src.indexOf('\n', i + 2);
                if (i === -1) return notFound();
                continue;
            }
            if (char === '/' && next === '*') {
                i = src.indexOf('*/', i + 2);
                if (i === -1) return notFound();
                i++;
                continue;
            }
            if (char === '{') depth++;
            else if (char === '}' && --depth === 0) return until >= 0 ? 0 : i;
        }

        return notFound();
    };
    const findMatchingBrace = (src, bodyStart) => walkBraces(src, bodyStart);

    // A parameter list, defaults with one level of parentheses included: (e,t=f())
    const PARAMS = String.raw`\((?:[^()]|\([^()]*\))*\)`;
    // A parameter list without its parentheses, split at its own commas: "e,t=f(a,b)" gives ["e", "t=f(a,b)"]
    const splitParams = list => {
        const params = [];
        let depth = 0;
        let current = '';
        for (const char of list) {
            if ('([{'.includes(char)) depth++;
            else if (')]}'.includes(char)) depth--;
            if (char === ',' && depth === 0) {
                params.push(current.trim());
                current = '';
            } else {
                current += char;
            }
        }
        if (current.trim()) params.push(current.trim());
        return params;
    };

    // Warn when an anchor no longer tells a patch's target apart: the tack patch once landed in addTimers that way.
    // The first place found is still patched, as before this warning existed.
    const warnIfAmbiguous = (label, names) => {
        if (names.length > 1) {
            ambiguous.push(label);
            warn(`${label}: ${names.length} places match its anchor — patched ${names[0]}, also ${names.slice(1).join(', ')}. Applied, but check this patch`);
        }
    };

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

    const findExportFunctionFromClickHandler = (src) => {
        const listenerPrefix =
            `[a-zA-Z_$][\\w$]*\\(\\s*["']exportgame["']\\s*\\)\\s*` +
            `\\.addEventListener\\(\\s*["']click["']\\s*,\\s*`;
        const listenerPatterns = [
            new RegExp(
                listenerPrefix +
                `(?:async\\s*)?\\(\\s*\\)\\s*=>\\s*(?:\\{\\s*)?(?:void\\s+)?([a-zA-Z_$][\\w$]*)\\s*\\(`,
                'g'
            ),
            new RegExp(listenerPrefix + `([a-zA-Z_$][\\w$]*)\\s*\\)`, 'g')
        ];

        for (const pattern of listenerPatterns) {
            const match = pattern.exec(src);
            if (!match) continue;
            const result = findFunctionBodyByName(src, match[1]);
            if (result) return result;
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

    // The functions a function awaits by name (`await xY(`), found by findFunctionBodyByName.
    const findAwaitedFunctions = (src, fnResult) => {
        const body = src.slice(fnResult.bodyStart, fnResult.bodyEnd);
        const awaitedCall = /(?<![\w$.])await\s+([a-zA-Z_$][\w$]*)\s*\(/g;
        const found = [];
        let match;
        while ((match = awaitedCall.exec(body)) !== null) {
            if (match[1] === fnResult.fnName) continue;
            const result = findFunctionBodyByName(src, match[1]);
            if (result && result.bodyEnd > result.bodyStart) found.push(result);
        }
        return found;
    };

    // ImportExport.ts exportData: writes the save to the clipboard or a file, as the "saveType" checkbox says.
    const writesSaveOut = (src, fnResult) => {
        const body = src.slice(fnResult.bodyStart, fnResult.bodyEnd);
        return (body.includes('"saveType"') || body.includes("'saveType'"))
            && (body.includes('clipboard') || body.includes('createObjectURL') || body.includes('Blob'));
    };

    // exportSynergism's output step: the function it awaits that writes the save out (exportData), or that awaits it.
    // Today exportSynergism awaits exportStoredSave (reads the stored save), which awaits exportData; older games
    // awaited exportData directly. The guard goes at the start of that step, so nothing is read or written.
    // No guess when neither shape is there: an await added after the output step must not get the guard.
    const findExportDataFunction = (src, fnResult) => {
        if (!fnResult || fnResult.bodyEnd < fnResult.bodyStart) return null;
        for (const step of findAwaitedFunctions(src, fnResult)) {
            if (writesSaveOut(src, step)) return step;
            if (findAwaitedFunctions(src, step).some(inner => writesSaveOut(src, inner))) return step;
        }
        return null;
    };

    // ==================================================================================
    // ────── EXPORT PATCH ─ Expose exportSynergism and suppress only its save output
    // when autosing requests a quark-only export.
    // Found by what it does: the function awarding the export's golden quarks ("exportGQPerHour") and stamping
    // the save (.lastExportedSave, .offlinetick). Fallback: the function the exportgame click listener calls.
    // Its output step: see findExportDataFunction.
    report.export = false;
    report.exportOutput = false;
    try {
        const exportSemanticResult = findEnclosingFunction(code, /["']exportGQPerHour["']/g,
            ['.lastExportedSave', '.offlinetick'], 'exportSynergism');
        const exportResult = exportSemanticResult || findExportFunctionFromClickHandler(code);
        if (exportResult) {
            const exportFn = exportResult.fnName;
            const exportDataResult = findExportDataFunction(code, exportResult);
            const exportDataFn = exportDataResult?.fnName;
            let suppressOutput = '';
            if (exportDataResult && exportDataFn) {
                suppressOutput = `\nif(window.__HS_SUPPRESS_EXPORT_ONCE){` +
                    `window.__HS_SUPPRESS_EXPORT_ONCE=false;` +
                    `console.log('[HS-PATCH] ✅ Save output suppressed (quarks awarded)');` +
                    `return;` +
                    `}\n`;
                log(`Patched exportData output guard (fn=${exportDataFn})`);
            } else {
                warn('Found exportSynergism but not its save output step (no awaited function writing the save out by "saveType")');
            }

            const expose =
                `\nif(!window.__HS_EXPORT_EXPOSED){` +
                `window.__HS_exportSynergism=${exportFn};` +
                (exportDataFn ? `window.__HS_exportData=${exportDataFn};window.__HS_EXPORT_OUTPUT_PATCHED=true;` : '') +
                `window.__HS_EXPORT_EXPOSED=true;` +
                `console.log('[HS-PATCH] ✅ exportSynergism exposed');` +
                `}` +
                `if(window.__HS_SILENT_EXPORT)return;` +
                `\n`;
            const insertions = [{ index: exportResult.bodyStart, text: expose }];
            if (exportDataResult && suppressOutput) {
                insertions.push({ index: exportDataResult.bodyStart, text: suppressOutput });
            }
            insertions.sort((a, b) => b.index - a.index);
            for (const insertion of insertions) {
                code = code.slice(0, insertion.index) + insertion.text + code.slice(insertion.index);
            }
            report.export = true;
            report.exportOutput = !!suppressOutput;
            log(`Patched exportSynergism (fn=${exportFn}, output=${exportDataFn ?? 'unavailable'}, via=${exportSemanticResult ? 'golden-quark-export' : 'click-handler'})`);
        } else {
            warn('Could not patch exportSynergism — neither the golden quark export nor the exportgame click handler matched');
        }
    } catch (e) {
        warn('Error while patching exportSynergism', e);
    }

    // ==================================================================================
    // ────── STAGE PATCH — inject at the entry of loadMiscellaneousStats.
    // Found by what it does: the function filling "gameStageStatistic" on the Misc stats ("miscStats").
    // The game's names are read from that statement, without the minifier's spelling of anything else:
    //   cQ=()=>{Be(w7,"miscStats",…),c("gameStageStatistic").innerHTML=s.t("statistics.gameStage",{stage:gk(0)})}
    // DOMCacheGetOrSet = the bare call holding the id (a member call such as document.getElementById is refused).
    report.stage = false;
    try {
        const stageAnchor = /["']gameStageStatistic["']/;
        const stageResult = findEnclosingFunction(code, new RegExp(stageAnchor.source, 'g'), ['miscStats'], 'stage');
        if (!stageResult) {
            warn('Could not patch stage — loadMiscellaneousStats ("gameStageStatistic" with "miscStats") not found in bundle');
        } else {
            const body = code.slice(stageResult.bodyStart, stageResult.bodyEnd);
            const anchorAt = body.search(stageAnchor);
            const domFn = /(?<![\w$.])([a-zA-Z_$][\w$]*)\(\s*$/.exec(body.slice(0, anchorAt))?.[1];
            const statement = body.slice(anchorAt);
            const i18nObj = /^["']gameStageStatistic["']\s*\)\s*\.innerHTML\s*=\s*([a-zA-Z_$][\w$]*)\.t\(/.exec(statement)?.[1];
            const stageFn = /(?<![\w$])stage\s*:\s*([a-zA-Z_$][\w$]*)\(/.exec(statement)?.[1];
            if (domFn && i18nObj && stageFn) {
                const expose =
                    `\nif(!window.__HS_STAGE_EXPOSED){` +
                    `window.DOMCacheGetOrSet=${domFn};` +
                    `window.__HS_synergismStage=${stageFn};` +
                    `window.__HS_i18next=${i18nObj};` +
                    `window.__HS_STAGE_EXPOSED=true;` +
                    `window.__HS_EXPOSED=true;` +
                    `console.log('[HS-PATCH] ✅ Stage exposed (dom=${domFn} stage=${stageFn} i18n=${i18nObj})');` +
                    `}\n`;
                code = code.slice(0, stageResult.bodyStart) + expose + code.slice(stageResult.bodyStart);
                report.stage = true;
                log(`Patched stage at fn entry (fn=${stageResult.fnName} dom=${domFn} stage=${stageFn} i18n=${i18nObj})`);
            } else {
                warn(`Stage var extraction failed — dom=${domFn} stage=${stageFn} i18n=${i18nObj}`);
            }
        }
    } catch (e) {
        warn('Error while patching stage', e);
    }

    // ==================================================================================
    // ────── PLAYER PATCH ─ Capture the game's player initializer regardless of its minified name.
    // Found by what it is: the object literal assigned to a variable with firstPlayed as one of its own keys,
    // wherever it sits, and the save's challengecompletions and worlds. Wrapped in a call that keeps a reference:
    //   n={firstPlayed:…}  becomes  n=(function(player){…;return player})({firstPlayed:…})
    report.player = false;
    try {
        const player = findAssignedObjectLiteral(code, /(?<![\w$.])["']?firstPlayed["']?\s*:/g,
            ['challengecompletions', 'worlds'], 'player initializer');
        if (player) {
            const capture = '(function(player){window.symp=window.symp||Symbol();' +
                'Object.defineProperty(window,window.symp,{enumerable:false,configurable:true,writable:true,value:player});' +
                'console.log("[HS-PATCH] ✅ Symbol exposed");return player})(';
            code = code.slice(0, player.start) + capture + code.slice(player.start, player.end + 1) + ')' + code.slice(player.end + 1);
            report.player = true;
            log(`Patched player initializer (variable=${player.name})`);
        } else {
            warn('Could not find player initializer in game bundle');
        }
    } catch (e) {
        warn('Error while patching player initializer', e);
    }

    // ==================================================================================
    // ── TALISMANS PATCH — capture Talismans.ts talismans as window.__HS_talismans
    // The fragments invested in each talisman live in talismans[k].fragmentsInvested; player.talismans only gets a copy
    // at each save. Found by what it is: the object literal assigned to a variable with exemption as one of its own keys,
    // holding fragmentsInvested and horseShoe. Wrapped in a call that keeps a reference:
    //   Te={exemption:{…},…}  becomes  Te=(function(o){window.__HS_talismans=o;return o})({exemption:{…},…})
    report.talismans = false;
    try {
        const talismans = findAssignedObjectLiteral(code, /(?<![\w$.])["']?exemption["']?\s*:/g,
            ['fragmentsInvested', 'horseShoe'], 'talismans');
        if (talismans) {
            const capture = '(function(o){window.__HS_talismans=o;return o})(';
            code = code.slice(0, talismans.start) + capture + code.slice(talismans.start, talismans.end + 1) + ')' + code.slice(talismans.end + 1);
            report.talismans = true;
            log(`Patched talismans (variable=${talismans.name})`);
        } else {
            warn('Could not find the talismans object in game bundle');
        }
    } catch (e) {
        warn('Error while patching talismans', e);
    }

    // ==================================================================================
    // ── GETMAXCHALLENGES PATCH — expose Challenges.ts getMaxChallenges as window.__HS_getMaxChallenges
    // Match challenge-cap behavior without assuming minified variable names.
    report.getMaxChallenges = false;
    try {
        const gmcResult = findEnclosingFunction(code, /\.cubeUpgrades\s*\[\s*29\s*\]/g,
            ['researches[105]', 'oneChallengeCap', 'reincarnationChallengeCap'], 'getMaxChallenges');
        if (gmcResult) {
            const gmcFn = gmcResult.fnName;
            const expose =
                `\nif(!window.__HS_CHALLENGES_EXPOSED){` +
                    `window.__HS_getMaxChallenges=${gmcFn};` +
                    `window.__HS_CHALLENGES_EXPOSED=true;` +
                    `console.log('[HS-PATCH] ✅ getMaxChallenges exposed (fn=${gmcFn})');` +
                `}\n`;
            code = code.slice(0, gmcResult.bodyStart) + expose + code.slice(gmcResult.bodyStart);
            report.getMaxChallenges = true;
            log(`Patched getMaxChallenges (fn=${gmcFn})`);
        } else {
            warn('Could not patch getMaxChallenges — challenge-cap behavior not found in bundle');
        }
    } catch (e) {
        warn('Error while patching getMaxChallenges', e);
    }

    // ==================================================================================
    // ── TACK PATCH — fire registered after-tack hooks after each game tick (Synergism.ts tack)
    // Found by what it does: the tick skipping its timers during a time warp (.timeWarp), adding time to every timer
    // (autoPotion and purpleReactor among them), then running the automatic tools (runeSacrifice).
    // addTimers, which tack calls, holds the same timer names but neither .timeWarp nor runeSacrifice. It must not get
    // the hook: the game also calls it outside a tick (codes, PseudoCoin time skips, offline progress).
    report.tack = false;
    try {
        const tackResult = findEnclosingFunction(code, /\.timeWarp\b/g,
            ['autoPotion', 'purpleReactor', 'runeSacrifice'], 'tack()');
        if (tackResult) {
            const tackPatch =
                `if(!window.__HS_TACK_PATCHED){` +
                    `window.__HS_TACK_PATCHED=true;` +
                    `window.__HS_tackHooks=[];` +
                    `window.__HS_onAfterTack=function(fn){window.__HS_tackHooks.push(fn);};` +
                    `console.log('[HS-PATCH] ✅ tack() patched (fn=${tackResult.fnName})');` +
                `}` +
                `queueMicrotask(()=>{const h=window.__HS_tackHooks.splice(0);for(let i=0;i<h.length;i++)h[i]();});`;
            code = code.slice(0, tackResult.bodyStart) + tackPatch + code.slice(tackResult.bodyStart);
            report.tack = true;
            log(`Patched tack() (fn=${tackResult.fnName})`);
        } else {
            warn('Could not patch tack() — game-time timer behavior not found in bundle');
        }
    } catch (e) {
        warn('Error while patching tack()', e);
    }

    // ==================================================================================
    // ── DIALOG HOOK PATCH — let the mod see every game dialog when it's queued, and answer it before it's shown.
    // The 5 dialog functions (Confirm, Alert, InfoAlert, Prompt, PurchasePrompt) share one queue and one shape:
    //   je=async e=>Jf.enqueue(()=>{let t=c("confirmationBox"),r=c("confirmWrapper"), …
    // Each queued action (`.enqueue(()=>{` holding "confirmationBox") is told apart by its own wrapper id (DOM ids the
    // mod already relies on): each action hides the 4 others (c("alertWrapper").style.display="none"), and reads
    // its own, whatever the order of its lines. Its dialog function returns that enqueue (`name=params=>` right before).
    // 1. An extra default parameter records the dialog's origin when it's queued (defaults are evaluated at call time):
    //    e=>  becomes  (e,__hsO=window.__HS_dialogOrigin?.("confirm",e))=>
    // 2. At the start of the queued action (when the dialog reaches the front of the queue), the mod may answer it:
    //    window.__HS_onDialog(kind, origin) returns { value } to resolve the dialog without showing it, or undefined to show it.
    // All 5 or none: with a partial match, the mod falls back to clicking dialogs through the DOM.
    report.dialogHook = false;
    try {
        const dialogKinds = {
            confirmWrapper: 'confirm',
            alertWrapper: 'alert',
            infoAlertWrapper: 'infoAlert',
            promptWrapper: 'prompt',
            purchasePromptWrapper: 'purchasePrompt'
        };
        const wrapperRe = /["'](confirmWrapper|alertWrapper|infoAlertWrapper|promptWrapper|purchasePromptWrapper)["']/g;
        const actionRe = /[\w$.]+\.enqueue\(\s*(?:async\s*)?\(\s*\)\s*=>\s*\{/g;
        const dialogHeaderRe = new RegExp(String.raw`(?<![\w$.])[\w$]+\s*=\s*(?:async\s*)?(${PARAMS}|[\w$]+)\s*=>\s*$`, 'd');

        const hiddenRe = /^\s*\)\s*\.style\.display\s*=\s*["']none["']/;

        const sites = [];
        let action;
        while ((action = actionRe.exec(code)) !== null) {
            const bodyStart = action.index + action[0].length;
            const bodyEnd = findMatchingBrace(code, bodyStart);
            if (bodyEnd < 0) continue;
            const body = code.slice(bodyStart, bodyEnd);
            if (!body.includes('confirmationBox')) continue;
            // Its own wrapper: read by the action itself (not a callback inside it), and not hidden right away
            const own = new Set();
            let m;
            wrapperRe.lastIndex = 0;
            while ((m = wrapperRe.exec(body)) !== null) {
                if (walkBraces(code, bodyStart, bodyStart + m.index) !== 1) continue;
                if (hiddenRe.test(body.slice(m.index + m[0].length))) continue;
                own.add(m[1]);
            }
            if (own.size !== 1) continue;
            const headerStart = Math.max(0, action.index - 300);
            const header = dialogHeaderRe.exec(code.slice(headerStart, action.index));
            if (!header) continue;
            const [paramsStart, paramsEnd] = header.indices[1];
            sites.push({
                kind: dialogKinds[[...own][0]], params: header[1],
                paramsStart: headerStart + paramsStart, paramsEnd: headerStart + paramsEnd, bodyStart
            });
        }

        const foundKinds = sites.map(site => site.kind);
        const allFoundOnce = Object.values(dialogKinds).every(kind => foundKinds.filter(k => k === kind).length === 1);
        if (!allFoundOnce) {
            warn(`Could not patch the game dialogs — expected each of the 5 once, found: [${foundKinds.join(', ')}]`);
        } else {
            // Highest index first, so earlier insertions don't move later ones
            const edits = [];
            for (const site of sites) {
                const list = site.params.startsWith('(') ? site.params.slice(1, -1).trim() : site.params.trim();
                const firstParam = splitParams(list)[0] ?? '';
                const originArgs = /^[\w$]+$/.test(firstParam) ? `"${site.kind}",${firstParam}` : `"${site.kind}"`;
                const originParam = `__hsO=window.__HS_dialogOrigin?.(${originArgs})`;
                edits.push({
                    start: site.paramsStart, end: site.paramsEnd,
                    text: `(${list ? `${list},` : ''}${originParam})`
                });
                edits.push({
                    start: site.bodyStart, end: site.bodyStart,
                    text: `\nconst __hsA=window.__HS_onDialog?.("${site.kind}",__hsO);if(__hsA)return Promise.resolve(__hsA.value);\n`
                });
            }
            edits.sort((a, b) => b.start - a.start);
            for (const edit of edits) {
                code = code.slice(0, edit.start) + edit.text + code.slice(edit.end);
            }
            topLines.push('window.__HS_DIALOG_HOOK_PATCHED = true;');
            report.dialogHook = true;
            log('Patched the 5 game dialogs (dialog hook)');
        }
    } catch (e) {
        warn('Error while patching the game dialogs', e);
    }

    // ==================================================================================
    // ── VALIDATEBLUEBERRYTREE PATCH — expose BlueberryUpgrades.ts validateBlueberryTree as window.__HS_validateBlueberryTree
    // Lets the mod check an ambrosia tree before writing it into a loadout slot itself (no import through the game,
    // which replaces the live tree and shows dialogs). It only reads the player's state.
    // Found by what it does, not by minified names or call shapes: the function checking the Exalt unlock criteria
    // (string literals "Exalt1x1", "Exalt5x1", "Exalt9x1") against the ambrosia budget (player.lifetimeAmbrosia).
    // Exposed where it's defined, so it exists as soon as the bundle runs (see exposeFunction):
    //   eK=e=>{  becomes  eK=window.__HS_validateBlueberryTree=e=>{
    // A function declaration is exposed once the game has validated a tree (at the first loadout load).
    report.validateBlueberryTree = false;
    try {
        const vbtResult = findEnclosingFunction(code, /["']Exalt9x1["']/g, ['lifetimeAmbrosia', 'Exalt1x1', 'Exalt5x1'],
            'validateBlueberryTree');
        if (vbtResult) {
            const exposed = exposeFunction(code, vbtResult, '__HS_validateBlueberryTree');
            code = exposed.code;
            report.validateBlueberryTree = true;
            log(`Patched validateBlueberryTree${exposed.atDefinition ? '' : ' at its first call'} (fn=${vbtResult.fnName})`);
        } else {
            warn('Could not patch validateBlueberryTree — Exalt unlock check not found in bundle');
        }
    } catch (e) {
        warn('Error while patching validateBlueberryTree', e);
    }

    // ==================================================================================
    // ── SAVE IMPORT HOOK PATCH — tell the mod when the game is about to load a save
    // ImportExport.ts importSynergism(input, reset) loads every save: a file, a cloud save, the Steam cloud, and with
    // reset = true a singularity, an Exalt and the game reset. The mod stops autosing on the first three.
    // Found by what it does, not by minified names or call shapes: the function holding the import's own error keys
    // ("importexport.loadTestInLive", "importexport.unableImport") and the save's "exporttest" check.
    // At the start of its body, with its second parameter (reset):
    //   Ic=(e,t=!1)=>{  becomes  Ic=(e,t=!1)=>{try{window.__HS_onSaveImport?.(t)}catch(__hsE){}
    // The try: importSynergism ends every singularity, and an error from the mod must not stop the game there.
    report.saveImportHook = false;
    try {
        const importResult = findEnclosingFunction(code, /["']importexport\.loadTestInLive["']/g,
            ['importexport.unableImport', 'exporttest'], 'save import hook');
        if (importResult) {
            const header = code.slice(Math.max(0, importResult.bodyStart - 300), importResult.bodyStart);
            const params = new RegExp(String.raw`(${PARAMS})\s*(?:=>\s*)?\{$`).exec(header);
            const resetParam = params && splitParams(params[1].slice(1, -1))[1]?.split('=')[0].trim();
            if (resetParam && /^[\w$]+$/.test(resetParam)) {
                code = code.slice(0, importResult.bodyStart) +
                    `\ntry{window.__HS_onSaveImport?.(${resetParam})}catch(__hsE){}\n` +
                    code.slice(importResult.bodyStart);
                topLines.push('window.__HS_SAVE_IMPORT_HOOK_PATCHED = true;');
                report.saveImportHook = true;
                log(`Patched importSynergism (save import hook, fn=${importResult.fnName})`);
            } else {
                warn('Could not patch the save import hook — importSynergism has no second (reset) parameter');
            }
        } else {
            warn('Could not patch the save import hook — importSynergism not found in bundle');
        }
    } catch (e) {
        warn('Error while patching the save import hook', e);
    }

    // ==================================================================================
    // ── CONSUMABLES PATCH — expose Login.ts allDurableConsumables as window.__HS_consumables
    // The game's own consumables WebSocket keeps the active Happy Hour Bells in that object; the mod
    // reads it instead of opening a second connection for the same account (refused by the server).
    // Captured by its initializer, the same way as the player: no minified name is read. Found by what it is: the
    // object literal assigned to a variable with a HAPPY_HOUR_BELL entry (amount, ends, displayName), wherever it sits.
    //   Ro={HAPPY_HOUR_BELL:{amount:0,ends:[],displayName:""}}
    //   becomes  Ro=(function(o){window.__HS_consumables=o;return o})({HAPPY_HOUR_BELL:{...}})
    // The game only replaces the entries of this object (resetWebSocket), never the object, so the reference stays live.
    report.consumables = false;
    try {
        const record = findAssignedObjectLiteral(code, /(?<![\w$.])["']?HAPPY_HOUR_BELL["']?\s*:\s*\{/g,
            ['amount', 'ends', 'displayName'], 'consumables');
        if (record) {
            const capture = '(function(o){window.__HS_consumables=o;return o})(';
            code = code.slice(0, record.start) + capture + code.slice(record.start, record.end + 1) + ')' + code.slice(record.end + 1);
            report.consumables = true;
            log(`Patched consumables (window.__HS_consumables, variable=${record.name})`);
        } else {
            warn('Could not patch consumables — the HAPPY_HOUR_BELL initializer was not found in bundle');
        }
    } catch (e) {
        warn('Error while patching consumables', e);
    }

    // ==================================================================================
    // ── PSEUDOCOIN LEVELS PATCH — expose PseudoCoinUpgrades.ts PCoinUpgrades as window.__HS_pcoinLevels
    // The game fetches the player's PseudoCoin upgrade levels once at load, hands them to initializePCoinCache, and
    // updates them in place after an in-game purchase (updatePCoinCache); its formulas read that object. The mod reads
    // it too, instead of fetching https://synergism.cc/stripe/upgrades again (the game's dev asked for less traffic).
    // At the end of both functions, window.__HS_pcoinLevelsLoaded says the levels are the server's (until then they
    // are all 0, as for a player who has none), and window.__HS_onPCoinChange tells the mod they changed.
    // initializePCoinCache is found by the levels it writes (by upgrade name) after its reset loop; the object by that
    // loop. Since the 2026-11-06 game update it gets the upgrades from its caller; before, it awaited the fetch itself:
    //   z_=e=>{for(let t of Object.keys(Nv))Nv[t]=0,Ww(t,0);for(let t of e)Nv[t.internalName]=t.level,Ww(...)}
    //   gF=async()=>{let e=await Ad.fetchUpgrades();for(let t of Object.keys(cv))cv[t]=0,TT(t,0);
    //       for(let t of e.playerUpgrades)cv[t.internalName]=t.level,TT(t.internalName,t.level)}
    // updatePCoinCache by the only other write of a variable into that object:  hF=async(e,t)=>{cv[e]=t,TT(e,t)}
    // The game never replaces the object, so the reference stays live. All three insertions or none.
    report.pcoinLevels = false;
    try {
        const initResult = findEnclosingFunction(code, /\.internalName\s*\]\s*=/g, ['Object.keys(', '.level'],
            'pcoinLevels');
        const initBody = initResult ? code.slice(initResult.bodyStart, initResult.bodyEnd) : '';
        const levelsVar = /Object\.keys\(\s*([a-zA-Z_$][\w$]*)\s*\)/.exec(initBody)?.[1];
        const escapedVar = levelsVar?.replace(/\$/g, '\\$');
        const writesLevels = escapedVar && new RegExp(
            String.raw`(?<![\w$.])${escapedVar}\s*\[\s*[a-zA-Z_$][\w$]*\.internalName\s*\]\s*=`).test(initBody);
        const updateResults = [];
        if (writesLevels) {
            const write = new RegExp(String.raw`(?<![\w$.])${escapedVar}\s*\[\s*[a-zA-Z_$][\w$]*\s*\]\s*=\s*[a-zA-Z_$][\w$]*(?![\w$.\[(])`, 'g');
            let match;
            while ((match = write.exec(code)) !== null) {
                const result = findFunctionAround(code, match.index, []);
                if (result && result.bodyStart !== initResult.bodyStart
                    && !updateResults.some(r => r.bodyStart === result.bodyStart)) updateResults.push(result);
            }
        }
        if (writesLevels && updateResults.length === 1) {
            const updateResult = updateResults[0];
            const notify = '\n;window.__HS_pcoinLevelsLoaded=true;try{window.__HS_onPCoinChange?.()}catch(__hsE){}\n';
            // From the end of the bundle backwards, so the earlier positions stay valid
            const inserts = [
                { at: initResult.bodyStart, text: `\nwindow.__HS_pcoinLevels=${levelsVar};\n` },
                { at: initResult.bodyEnd, text: notify },
                { at: updateResult.bodyEnd, text: notify }
            ].sort((a, b) => b.at - a.at);
            for (const insert of inserts) code = code.slice(0, insert.at) + insert.text + code.slice(insert.at);
            report.pcoinLevels = true;
            log(`Patched PseudoCoin levels (variable=${levelsVar}, init=${initResult.fnName}, update=${updateResult.fnName})`);
        } else {
            warn(!initResult
                ? 'Could not patch PseudoCoin levels — initializePCoinCache ("[….internalName]=" with "Object.keys(") not found'
                : !writesLevels
                    ? `Could not patch PseudoCoin levels — the levels object was not found in ${initResult.fnName}`
                    : `Could not patch PseudoCoin levels — expected 1 updatePCoinCache writing ${levelsVar}, found ${updateResults.length}`);
        }
    } catch (e) {
        warn('Error while patching PseudoCoin levels', e);
    }

    // ==================================================================================
    // ── QUARK BONUS PATCH — hand Quark.ts's personal and global quark bonuses to the mod (window.__HS_quarkBonus)
    // The game gets the personal bonus from https://synergism.cc/api/v1/users/me (at load and at a login) and the
    // global one from https://synergism.cc/api/v1/quark-bonus (at load, then every 15 minutes); the mod reads them
    // instead of fetching /users/me again (the game's dev asked for less traffic). Both setters call updateQuarkUI
    // with both current values. It is found by its two translation keys, and its global bonus is the parameter its
    // texts get as globalBonus:
    //   a$=(e,t)=>{let r=u("currentBonus");e>0?r.innerHTML=s.t("settings.quarkBonusExtended",{globalBonus:t,...
    //   becomes  a$=(e,t)=>{try{window.__HS_quarkBonus={personal:e,global:t};window.__HS_onQuarkBonusChange?.()}catch(__hsE){}...
    report.quarkBonus = false;
    try {
        const uiResult = findEnclosingFunction(code, /["']settings\.quarkBonusExtended["']/g,
            ['settings.quarkBonusSimple', 'currentBonus'], 'quark bonus');
        const header = uiResult ? code.slice(Math.max(0, uiResult.bodyStart - 300), uiResult.bodyStart) : '';
        const paramList = new RegExp(String.raw`(${PARAMS})\s*(?:=>\s*)?\{$`).exec(header)?.[1];
        const params = paramList ? splitParams(paramList.slice(1, -1)).map(p => p.split('=')[0].trim()) : [];
        const body = uiResult ? code.slice(uiResult.bodyStart, uiResult.bodyEnd) : '';
        const globalParam = params.find(p => new RegExp(
            String.raw`globalBonus\s*:\s*${p.replace(/\$/g, '\\$')}(?![\w$.\[(])`).test(body));
        const personalParam = params.find(p => p !== globalParam);
        if (uiResult && params.length === 2 && params.every(p => /^[\w$]+$/.test(p)) && globalParam && personalParam) {
            code = code.slice(0, uiResult.bodyStart) +
                `\ntry{window.__HS_quarkBonus={personal:${personalParam},global:${globalParam}};` +
                'window.__HS_onQuarkBonusChange?.()}catch(__hsE){}\n' +
                code.slice(uiResult.bodyStart);
            report.quarkBonus = true;
            log(`Patched quark bonus (fn=${uiResult.fnName}, personal=${personalParam}, global=${globalParam})`);
        } else {
            warn(!uiResult
                ? 'Could not patch the quark bonus — updateQuarkUI ("settings.quarkBonusExtended") not found'
                : `Could not patch the quark bonus — the personal and global bonus parameters of ${uiResult.fnName} were not found`);
        }
    } catch (e) {
        warn('Error while patching the quark bonus', e);
    }

    // ==================================================================================
    // ── GLOBAL EVENT PATCH — hand Event.ts eventCheck's answer to the mod (window.__HS_globalEvent / __HS_onGlobalEvent)
    // The game fetches https://synergism.cc/events/get at load and every 5 minutes; the mod reads that answer
    // instead of fetching it again (the game's dev asked for less traffic). Found by its URL string and the
    // save's dayCheck test. A local `fetch` at the start of its body shadows the browser's for this function only:
    //   oL=async()=>{if(!n.dayCheck)return;let e=await fetch("https://synergism.cc/events/get");...
    //   becomes  oL=async()=>{const fetch=(...a)=>window.fetch(...a).then(<copy of an ok answer to the mod>);if(!n.dayCheck)...
    // The game gets the browser's response untouched; the mod reads a clone. Nothing from the mod can throw into the game.
    report.globalEvent = false;
    try {
        const eventResult = findEnclosingFunction(code, /["']https:\/\/synergism\.cc\/events\/get["']/g,
            ['dayCheck', '.json()'], 'global event');
        if (eventResult) {
            const shadow =
                '\nconst fetch=(...__hsA)=>window.fetch(...__hsA).then(__hsR=>{try{if(__hsR&&__hsR.ok)' +
                '__hsR.clone().json().then(__hsJ=>{window.__HS_globalEvent=__hsJ;' +
                'try{window.__HS_onGlobalEvent?.(__hsJ)}catch(__hsE){}},()=>{})}catch(__hsE){}return __hsR});\n';
            code = code.slice(0, eventResult.bodyStart) + shadow + code.slice(eventResult.bodyStart);
            topLines.push('window.__HS_GLOBAL_EVENT_PATCHED = true;');
            report.globalEvent = true;
            log(`Patched eventCheck (global event, fn=${eventResult.fnName})`);
        } else {
            warn('Could not patch the global event — eventCheck not found in bundle');
        }
    } catch (e) {
        warn('Error while patching the global event', e);
    }

    // ==================================================================================
    // ── HEADER MODULES PATCH — let the mod add its own modules to the game's editable header (HeaderModules.ts)
    // The mod's module ids start with "hs" then a capital letter (no game id does). They live only in the live
    // player.headerLayouts: the game's save schema checks every id against its own list, and one unknown id resets the
    // whole layout. So no save ever holds them, and a save loaded by an unpatched game keeps the player's header.
    // The mod remembers where its modules are, and puts them back before each render.
    // 1. saveSynergy, found by its "testing.gameSaved" message and the talismans it writes (fragmentsInvested):
    //    its one schema parse of the player saves a copy without the mod's ids:
    //      let t=Yp.parse(n)  becomes  let t=Yp.parse(window.__HS_stripHeaderModules(n))
    // 2. loadSynergy, found by its "testing.saveInLive2" message: the save it parses loses the mod's ids (a singularity
    //    reloads the live layout, and importSynergism stores that save as is until the next saveSynergy):
    //      let t=JSON.parse(atob(e))  becomes  let t=window.__HS_parseSave(atob(e))
    // 3. headerModuleUnlocks, the object literal with a key per module (ascCubeStats … singularitybtn): captured as
    //    window.__HS_headerModuleUnlocks, where the mod adds its modules (the render calls it for each placed id).
    // 4. renderHeaderLayout, found by "--header-button-slots" and "headerTray": exposed as window.__HS_renderHeaderLayout,
    //    and calls window.__HS_beforeHeaderRender at the start (where the mod puts its modules back).
    // All four or none: without 1, a save would hold the mod's ids; without 2-4, the mod has nothing to add them with.
    report.headerModules = false;
    try {
        let next = code;
        const problems = [];

        const saveResult = findEnclosingFunction(next, /["']testing\.gameSaved["']/g, ['fragmentsInvested'], 'header modules (saveSynergy)');
        const schemaParse = /(?<![\w$.])(?!JSON\.)([a-zA-Z_$][\w$]*)\.parse\(\s*([a-zA-Z_$][\w$]*)\s*\)/g;
        const saveParses = saveResult ? [...next.slice(saveResult.bodyStart, saveResult.bodyEnd).matchAll(schemaParse)] : [];
        if (saveParses.length === 1) {
            const [match, schema, playerVar] = saveParses[0];
            const at = saveResult.bodyStart + saveParses[0].index;
            next = next.slice(0, at) + `${schema}.parse(window.__HS_stripHeaderModules(${playerVar}))` + next.slice(at + match.length);
        } else {
            problems.push(saveResult
                ? `expected 1 schema parse in saveSynergy (fn=${saveResult.fnName}), found ${saveParses.length}`
                : 'saveSynergy ("testing.gameSaved") not found');
        }

        const loadResult = findEnclosingFunction(next, /["']testing\.saveInLive2["']/g, [], 'header modules (loadSynergy)');
        const loadParseAt = loadResult ? next.slice(loadResult.bodyStart, loadResult.bodyEnd).search(/(?<![\w$.])JSON\.parse\(/) : -1;
        if (loadParseAt >= 0) {
            const at = loadResult.bodyStart + loadParseAt;
            next = next.slice(0, at) + 'window.__HS_parseSave(' + next.slice(at + 'JSON.parse('.length);
        } else {
            problems.push(loadResult ? `no JSON.parse in loadSynergy (fn=${loadResult.fnName})` : 'loadSynergy ("testing.saveInLive2") not found');
        }

        const unlocks = findAssignedObjectLiteral(next, /(?<![\w$.])["']?ascCubeStats["']?\s*:/g,
            ['singularitybtn', 'ascensionChallengeProgress'], 'header modules (headerModuleUnlocks)');
        if (unlocks) {
            const capture = '(function(o){window.__HS_headerModuleUnlocks=o;return o})(';
            next = next.slice(0, unlocks.start) + capture + next.slice(unlocks.start, unlocks.end + 1) + ')' + next.slice(unlocks.end + 1);
        } else {
            problems.push('headerModuleUnlocks (ascCubeStats … singularitybtn) not found');
        }

        const renderResult = findEnclosingFunction(next, /["']--header-button-slots["']/g, ['headerTray'], 'header modules (renderHeaderLayout)');
        if (renderResult) {
            next = next.slice(0, renderResult.bodyStart) + '\ntry{window.__HS_beforeHeaderRender?.()}catch(__hsE){}\n' +
                next.slice(renderResult.bodyStart);
            next = exposeFunction(next, renderResult, '__HS_renderHeaderLayout').code;
        } else {
            problems.push('renderHeaderLayout ("--header-button-slots") not found');
        }

        if (problems.length === 0) {
            code = next;
            topLines.push(`window.__HS_stripHeaderModules=${String(stripHeaderModules)};` +
                'window.__HS_parseSave=function(t){return window.__HS_stripHeaderModules(JSON.parse(t))};' +
                'window.__HS_HEADER_MODULES_PATCHED = true;');
            report.headerModules = true;
            log(`Patched the header modules (save=${saveResult.fnName}, load=${loadResult.fnName}, ` +
                `unlocks=${unlocks.name}, render=${renderResult.fnName})`);
        } else {
            warn(`Could not patch the header modules — ${problems.join('; ')}`);
        }
    } catch (e) {
        warn('Error while patching the header modules', e);
    }

    // ==================================================================================
    // ── SAVE SEED CAP — keep saves working when an RNG seed overtakes the clock (docs/game/behaviours.md)
    // The game's save schema wants each player.seed below Date.now() + 1000, and each draw adds 1 to a seed that began
    // as a timestamp in ms: over 1000 draws per second, every save throws, and the throw kills the autosave's interval.
    // saveSynergy, found by its "testing.gameSaved" message and the talismans it writes (fragmentsInvested): its one
    // schema parse saves a copy with the seeds capped at the clock, the live player's draws carry on untouched:
    //   let t=Yp.parse(n)  becomes  let t=Yp.parse(window.__HS_capSaveSeeds(n))
    // After the header modules patch: it applies with or without that one's edit of the same parse.
    report.saveSeedCap = false;
    try {
        const saveResult = findEnclosingFunction(code, /["']testing\.gameSaved["']/g, ['fragmentsInvested'], 'save seed cap');
        const schemaParse = /(?<![\w$.])(?!JSON\.)([a-zA-Z_$][\w$]*)\.parse\(\s*(window\.__HS_stripHeaderModules\(\s*[a-zA-Z_$][\w$]*\s*\)|[a-zA-Z_$][\w$]*)\s*\)/g;
        const saveParses = saveResult ? [...code.slice(saveResult.bodyStart, saveResult.bodyEnd).matchAll(schemaParse)] : [];
        if (saveParses.length === 1) {
            const [match, schema, argument] = saveParses[0];
            const at = saveResult.bodyStart + saveParses[0].index;
            code = code.slice(0, at) + `${schema}.parse(window.__HS_capSaveSeeds(${argument}))` + code.slice(at + match.length);
            topLines.push(`window.__HS_capSaveSeeds=${String(capSaveSeeds)};`);
            report.saveSeedCap = true;
            log(`Patched the save seed cap (save=${saveResult.fnName})`);
        } else if (saveResult) {
            warn(`Could not patch the save seed cap — expected 1 schema parse in saveSynergy (fn=${saveResult.fnName}), found ${saveParses.length}`);
        } else {
            warn('Could not patch the save seed cap — saveSynergy ("testing.gameSaved") not found');
        }
    } catch (e) {
        warn('Error while patching the save seed cap', e);
    }

    // ==================================================================================
    // Header reset buttons: rendering and drag targets use a width-dependent capacity supplied by the mod.
    // Saves retain groups/positions for all eight native buttons, even when loaded in a narrower window.
    // The mod wraps an existing oversized group; it only allows adding buttons while they fit.
    report.headerButtons = false;
    try {
        const renderResult = findEnclosingFunction(code, /["']--header-button-slots["']/g, ['headerTray'], 'header buttons (render)');
        const renderBody = renderResult ? code.slice(renderResult.bodyStart, renderResult.bodyEnd) : '';
        const propertyStart = renderBody.indexOf('--header-button-slots');
        const propertyEnd = renderBody.indexOf(';', propertyStart);
        const capacityProperty = renderBody.slice(propertyStart, propertyEnd < 0 ? renderBody.length : propertyEnd);
        const readers = [...code.matchAll(/(?<![\w$.])([a-zA-Z_$][\w$]*)\s*=\s*\(\s*\)\s*=>\s*([a-zA-Z_$][\w$]*)\s*\[\s*([a-zA-Z_$][\w$]*)\s*\(\s*\)\s*\]/g)]
            .filter(match => new RegExp(`(?<![\\w$.])${match[1].replace(/\$/g, '\\$')}\\(\\s*\\)`).test(capacityProperty));
        if (readers.length !== 1) throw new Error(`expected one capacity reader, found ${readers.length}`);
        const reader = readers[0];
        const capacity = reader[2].replace(/\$/g, '\\$');
        const access = `${capacity}\\s*\\[\\s*[a-zA-Z_$][\\w$]*\\s*\\]`;
        const splitPattern = new RegExp(`([a-zA-Z_$][\\w$]*\\(\\s*[a-zA-Z_$][\\w$]*\\.filter\\(\\s*[a-zA-Z_$][\\w$]*\\s*\\)\\s*,\\s*)(${access})(\\s*\\))`, 'g');
        const limitPattern = new RegExp(`(<\\s*)(${access})`, 'g');
        const splits = [...code.matchAll(splitPattern)];
        const limits = [...code.matchAll(limitPattern)];
        if (splits.length !== 1 || limits.length !== 1) {
            throw new Error(`expected one slot split and one position limit, found ${splits.length} and ${limits.length}`);
        }
        const joinPattern = new RegExp(`([a-zA-Z_$][\\w$]*)\\.includes\\(\\s*([a-zA-Z_$][\\w$]*)\\s*\\)\\s*\\|\\|\\s*\\1\\.length\\s*<\\s*${reader[1].replace(/\$/g, '\\$')}\\(\\s*\\)`, 'g');
        const joins = [...code.matchAll(joinPattern)];
        if (joins.length !== 1) throw new Error(`expected one button join check, found ${joins.length}`);
        const move = findEnclosingFunction(code, /\.positions\s*\[/g, ['.join', '.hidden', '.splice(', '.push('], 'header buttons (move)');
        const parameters = (fn, count) => {
            if (!fn) throw new Error('header button drop handler not found');
            const match = /\(([^()]+)\)\s*(?:=>\s*)?\{$/.exec(code.slice(Math.max(0, fn.bodyStart - 300), fn.bodyStart));
            const names = match ? match[1].split(',').map(name => name.trim()) : [];
            if (names.length !== count || !names.every(name => /^[a-zA-Z_$][\w$]*$/.test(name))) {
                throw new Error(`unreadable parameters for ${fn.fnName}`);
            }
            return names.join(',');
        };
        const moveArguments = parameters(move, 4);
        const expression = `${reader[2]}[${reader[3]}()]`;
        const arrow = reader[0].indexOf('=>') + 2;
        const edits = [
            { at: reader.index + arrow, length: reader[0].length - arrow,
                text: `(window.__HS_headerButtonCapacity?.(${expression})??${expression})` },
            { at: splits[0].index, length: splits[0][0].length,
                text: `${splits[0][1]}Math.max(8,${splits[0][2]})${splits[0][3]}` },
            { at: limits[0].index, length: limits[0][0].length,
                text: `${limits[0][1]}Math.max(8,${limits[0][2]})` },
            { at: joins[0].index, length: joins[0][0].length,
                text: `(window.__HS_canJoinHeaderButtons?.(${joins[0][1]},${joins[0][2]})??(${joins[0][0]}))` },
            { at: move.bodyStart, length: 0,
                text: `if(window.__HS_moveHeaderButton?.(${moveArguments}))return;` },
        ];
        for (const edit of edits.sort((a, b) => b.at - a.at)) {
            code = code.slice(0, edit.at) + edit.text + code.slice(edit.at + edit.length);
        }
        topLines.push('window.__HS_HEADER_BUTTONS_PATCHED=true;');
        report.headerButtons = true;
        log(`Patched header button capacity (fn=${reader[1]})`);
    } catch (error) {
        warn('Could not patch header button capacity', error.message);
    }

    // Only the timer that enters the header editor is optional; native pointer/click/drag handling stays intact.
    report.headerLongPress = false;
    try {
        const down = findEnclosingFunction(code, /window\.setTimeout\s*\(/g,
            ['.headerRegion', '.pointerId', 'getBoundingClientRect'], 'header long press');
        const timers = down ? [...code.slice(down.bodyStart, down.bodyEnd)
            .matchAll(/(?<![\w$.])([a-zA-Z_$][\w$]*)\s*=\s*window\.setTimeout\s*\(/g)] : [];
        if (timers.length !== 1) throw new Error(`expected one header hold timer, found ${timers.length}`);
        const at = down.bodyStart + timers[0].index;
        code = code.slice(0, at) + `${timers[0][1]}=window.__HS_headerLongPressEnabled===false?undefined:window.setTimeout(`
            + code.slice(at + timers[0][0].length);
        topLines.push('window.__HS_HEADER_LONG_PRESS_PATCHED=true;');
        report.headerLongPress = true;
        log(`Patched optional header long press (fn=${down.fnName})`);
    } catch (error) {
        warn('Could not patch header long press', error.message);
    }

    if (options.steam) {
        // ── STEAM AUTO-SYNC PATCH — sync the Steam cloud on its 60 s clock only, not at each manual save
        // (remove the manual trigger: e || ...). In saveSynergy, found by its "testing.gameSaved" message,
        // on the one throttle test there:
        //   {let o=Date.now();(e||o-eG>=6e4)&&(eG=o,zY(r))}  becomes  {let o=Date.now();(o - eG >= 6e4)&&(eG=o,zY(r))}
        report.steamAutoSync = false;
        try {
            const saveResult = findEnclosingFunction(code, /["']testing\.gameSaved["']/g, [], 'Steam auto-sync');
            const steamSyncRe = /\(\s*([a-zA-Z_$][\w$]*)\s*\|\|\s*([a-zA-Z_$][\w$]*)\s*-\s*([a-zA-Z_$][\w$]*)\s*>=\s*6e4\s*\)\s*&&/g;
            const matches = saveResult ? [...code.slice(saveResult.bodyStart, saveResult.bodyEnd).matchAll(steamSyncRe)] : [];
            if (matches.length === 1) {
                const [match, buttonVar, nowVar, lastVar] = matches[0];
                const at = saveResult.bodyStart + matches[0].index;
                code = code.slice(0, at) + `(${nowVar} - ${lastVar} >= 6e4)&&` + code.slice(at + match.length);
                report.steamAutoSync = true;
                log(`Patched Steam auto-sync (removed ${buttonVar} trigger)`);
            } else if (saveResult) {
                warn(`Could not patch Steam auto-sync — expected 1 throttle test in saveSynergy (fn=${saveResult.fnName}), found ${matches.length}`);
            } else {
                warn('Could not patch Steam auto-sync — saveSynergy ("testing.gameSaved") not found');
            }
        } catch (e) {
            warn('Error while patching Steam auto-sync', e);
        }
    }

    // ==================================================================================
    // Flags at the top of the bundle go after its "use strict" directive: a statement before it would make the
    // directive a plain string, and the whole game would run in sloppy mode.
    topLines.unshift(`window.__HS_PATCH_REPORT=${JSON.stringify(report)};window.__HS_PATCH_AMBIGUOUS=${JSON.stringify(ambiguous)};`);
    const prologue = /^\s*(?:(["'])use strict\1\s*;?)?/.exec(code)[0];
    const prologueEnd = prologue.trim() && !prologue.trim().endsWith(';') ? ';' : '';
    code = prologue + prologueEnd + '\n' + topLines.join('\n') + '\n' + code.slice(prologue.length);

    const patchNames = Object.keys(report);
    const missing = patchNames.filter(name => !report[name]);
    log(`Bundle patching complete: ${patchNames.length - missing.length}/${patchNames.length} applied` +
        (missing.length ? ` — missing: ${missing.join(', ')}` : '') +
        (ambiguous.length ? ` — to check (several matches): ${ambiguous.join(', ')}` : ''));
    return code;
}

// Removing an already prepared script cannot cancel its execution. Keep this
// narrowly scoped guard for the page lifetime, including after injection.
function guardBrowserGameElements(getPatchedScript, onBlocked) {
    const gameElements = ['tab-row', 'sub-tab'];
    const assertUnclaimed = () => {
        if (gameElements.some(name => customElements.get(name))) {
            const error = new Error('The original game registered its UI before the loader started. Enable the userscript at document-start and refresh.');
            error.hsGameStartedFirst = true;
            throw error;
        }
    };
    assertUnclaimed();

    const cancelled = new WeakSet();
    window.addEventListener('error', event => {
        // Suppress only our cancellation, never real errors matched by text.
        if (event.error && cancelled.has(event.error)) event.preventDefault();
    }, true);

    const wrap = define => function (name, ctor, options) {
        if (gameElements.includes(name) &&
            (!getPatchedScript() || document.currentScript !== getPatchedScript())) {
            const cancellation = new Error('Hypersynergism cancelled an unpatched game bundle');
            cancelled.add(cancellation);
            onBlocked();
            // Returning would let new TabRow() run with an unregistered
            // constructor, which causes the reported Illegal constructor.
            throw cancellation;
        }
        return define.call(this, name, ctor, options);
    };
    let guardedDefine = wrap(customElements.define);
    Object.defineProperty(customElements, 'define', {
        configurable: true,
        get: () => guardedDefine,
        // Allow the game's polyfill to replace define without losing the guard.
        // Each wrapper captures its own delegate to avoid recursive delegation.
        set: define => { guardedDefine = wrap(define); }
    });
    // Leave the polyfill's extends-br support probe intact, along with unrelated
    // registrations. A global define no-op invalidates feature detection.
    return assertUnclaimed;
}

function startBrowserLoader(options) {
    'use strict';
    const { dev = false } = options || {};
    if (window.HS_LOADER_INITIALIZED) return;
    window.HS_LOADER_INITIALIZED = true;

    const loaderVersion = '4.8';
    const startTime = performance.now();
    const log = (...a) => console.log(`%c[HS-LOADER v${loaderVersion} +${(performance.now() - startTime).toFixed(0)}ms]`, 'color:#4af', ...a);
    const warn = (...a) => console.warn(`%c[HS-LOADER v${loaderVersion} +${(performance.now() - startTime).toFixed(0)}ms]`, 'color:#fa4', ...a);
    const debug = (...a) => console.debug(`%c[HS-LOADER v${loaderVersion} +${(performance.now() - startTime).toFixed(0)}ms]`, 'color:#aaa', ...a);

    const originalFetch = window.fetch.bind(window);
    const isFirefox = navigator.userAgent.includes('Firefox');
    log(`Browser: ${isFirefox ? 'Firefox' : 'Not Firefox'}`);

    // ─── State ────────────────────────────────────────────────────────────────
    let gameScriptDetected = false;
    let patchedScript = null;

    // ─── Late start ───────────────────────────────────────────────────────────
    // The original game ran before the userscript (Tampermonkey injected it late, e.g. its
    // worker was asleep): it can't be patched any more. A reload usually wins the race.
    // At most LATE_START_MAX_RELOADS in a row, counted in sessionStorage so it can't loop.
    // The mod's reloadOnLateLoaderStart setting (read from localStorage) can turn the reload off.
    const LATE_START_KEY = 'hs-loader-late-start-reloads';
    const LATE_START_MAX_RELOADS = 3;
    const LATE_START_WINDOW_MS = 60000;
    const LATE_START_RELOAD_DELAY_MS = 1500;

    // null when sessionStorage can't be used: then no automatic reload, nothing would stop a loop
    function readLateStartReloads() {
        try {
            const saved = JSON.parse(sessionStorage.getItem(LATE_START_KEY) || 'null');
            return saved && Date.now() - saved.at < LATE_START_WINDOW_MS ? saved.count : 0;
        } catch {
            return null;
        }
    }

    function clearLateStartReloads() {
        try { sessionStorage.removeItem(LATE_START_KEY); } catch { }
    }

    function showLoaderBanner(text, closable) {
        const show = () => {
            const banner = document.createElement('div');
            banner.style.cssText = 'position:fixed;top:0;left:0;right:0;z-index:2147483647;padding:8px 36px;' +
                'background:#2b2108;color:#ffd27a;border-bottom:2px solid #fa4;font:14px/1.4 sans-serif;text-align:center;';
            banner.textContent = text;
            if (closable) {
                const close = document.createElement('button');
                close.textContent = '✕';
                close.style.cssText = 'position:absolute;top:4px;right:8px;background:none;border:none;color:inherit;font-size:16px;cursor:pointer;';
                close.addEventListener('click', () => banner.remove());
                banner.appendChild(close);
            }
            (document.body || document.documentElement).appendChild(banner);
        };
        if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', show, { once: true });
        else show();
    }

    function recoverFromLateStart() {
        const reloads = readModBooleanSetting('reloadOnLateLoaderStart', true) ? readLateStartReloads() : null;
        if (reloads !== null && reloads < LATE_START_MAX_RELOADS) {
            try {
                sessionStorage.setItem(LATE_START_KEY, JSON.stringify({ count: reloads + 1, at: Date.now() }));
            } catch { }
            log(`Game started before the loader: reloading (${reloads + 1}/${LATE_START_MAX_RELOADS})`);
            showLoaderBanner(`HyperSynergism: the game started before the mod's loader. Reloading… (${reloads + 1}/${LATE_START_MAX_RELOADS})`, false);
            setTimeout(() => location.reload(), LATE_START_RELOAD_DELAY_MS);
            return;
        }
        // A manual refresh gets its automatic reloads again
        clearLateStartReloads();
        showLoaderBanner('HyperSynergism could not start: Tampermonkey ran the loader too late. Refresh the page.' +
            (isFirefox ? '' : ' If it keeps happening, turn on "Allow User Scripts" in Chrome\'s extension details for Tampermonkey.'), true);
    }

    const fail = error => {
        window.__HS_LOADER_ERROR = String(error?.message || error);
        warn('Loader stopped:', error);
        if (error?.hsGameStartedFirst) recoverFromLateStart();
    };
    let assertUnclaimed;
    try {
        assertUnclaimed = guardBrowserGameElements(() => patchedScript, () => {
            debug('Cancelled an escaped original game bundle before UI construction');
            gameScriptDetected = true;
            // Leave the original script's stack before beginning injection.
            queueMicrotask(() => injectPatchedBundle().catch(fail));
        });
    } catch (error) {
        fail(error);
        return;
    }

    // ─── Fetch block ──────────────────────────────────────────────────────────
    window.fetch = async function (input, init) {
        const url = typeof input === 'string' ? input
            : input instanceof Request ? input.url
                : '';
        if (shouldBlockScript(url)) {
            debug(`Fetch blocked: ${url.substring(0, 80)}`);
            return new Response('', { status: 200 });
        }
        return originalFetch(input, init);
    };

    function shouldBlockScript(src) {
        return src.includes('rocket-loader') || /\/dist\/out.*\.js/.test(src);
    }

    // Rocket Loader can clone the original out.js and insert it before our
    // MutationObserver callback runs. Mark that clone inert before insertion.
    // Fire a synthetic load so Rocket Loader can advance its script queue.
    function interceptInsertedGameScript(node) {
        if (node?.nodeType !== 1 || node.localName !== 'script') return false;
        const src = node.src || node.getAttribute('src') || '';
        if (!/\/dist\/out.*\.js(?:[?#]|$)/.test(src)) return false;
        node.type = 'application/x-hs-blocked';
        node.setAttribute('data-hs-inert', '');
        if (!gameScriptDetected) {
            gameScriptDetected = true;
            injectPatchedBundle().catch(fail);
        }
        debug(`Blocked game script before DOM insertion: ${src.substring(0, 80)}`);
        return true;
    }

    function acknowledgeBlockedScript(node) {
        queueMicrotask(() => {
            node.dispatchEvent(new Event('load'));
            node.remove();
        });
    }

    const nativeInsertBefore = Node.prototype.insertBefore;
    Node.prototype.insertBefore = function (node, referenceNode) {
        const blocked = interceptInsertedGameScript(node);
        const inserted = nativeInsertBefore.call(this, node, referenceNode);
        if (blocked) acknowledgeBlockedScript(node);
        return inserted;
    };
    const nativeAppendChild = Node.prototype.appendChild;
    Node.prototype.appendChild = function (node) {
        const blocked = interceptInsertedGameScript(node);
        const inserted = nativeAppendChild.call(this, node);
        if (blocked) acknowledgeBlockedScript(node);
        return inserted;
    };
    const nativeReplaceChild = Node.prototype.replaceChild;
    Node.prototype.replaceChild = function (node, oldNode) {
        const blocked = interceptInsertedGameScript(node);
        const replaced = nativeReplaceChild.call(this, node, oldNode);
        if (blocked) acknowledgeBlockedScript(node);
        return replaced;
    };

    // ─── Script interception ──────────────────────────────────────────────────
    // We need to intercept the game's <script src="…/dist/out….js"> tag,
    // prevent it from running, then inject our patched version in its place.

    let beforeScriptExecute;
    if (isFirefox) {
        // Firefox supports beforescriptexecute which fires before the script runs.
        beforeScriptExecute = function (e) {
            const src = e.target.src || '';
            if (shouldBlockScript(src)) {
                e.preventDefault();
                e.stopPropagation();
                e.target.remove();
                log(`Blocked (beforescriptexecute): ${src.substring(0, 60)}`);
                if (!gameScriptDetected && /\/dist\/out.*\.js/.test(src)) {
                    gameScriptDetected = true;
                    injectPatchedBundle().catch(fail);
                }
            }
        };
        document.addEventListener('beforescriptexecute', beforeScriptExecute, true);
    }

    // Best-effort cleanup: observers run AFTER insertion and cannot cancel an
    // already prepared script. The custom-element guard handles escaped copies.
    const mo = new MutationObserver(muts => {
        for (const m of muts) {
            for (const n of m.addedNodes) {
                if (n.tagName !== 'SCRIPT') continue;
                if (n.hasAttribute('data-hs-inert')) continue;
                const src = n.src || '';
                if (shouldBlockScript(src)) {
                    n.type = 'javascript/blocked';
                    n.remove();
                    debug(`Blocked (MutationObserver): ${src.substring(0, 60)}`);
                    if (!gameScriptDetected && /\/dist\/out.*\.js/.test(src)) {
                        gameScriptDetected = true;
                        injectPatchedBundle().catch(fail);
                    }
                }
            }
        }
    });
    mo.observe(document, { childList: true, subtree: true });

    // Also check scripts that may already exist in the DOM at injection time.
    function checkExistingScripts() {
        for (const script of Array.from(document.getElementsByTagName('script'))) {
            if (script.src && /\/dist\/out.*\.js/.test(script.src)) {
                script.type = 'javascript/blocked';
                script.remove();
                if (!gameScriptDetected) {
                    gameScriptDetected = true;
                    injectPatchedBundle().catch(fail);
                }
            }
        }
    }
    checkExistingScripts();
    setTimeout(checkExistingScripts, 10);

    // ─── Utilities ────────────────────────────────────────────────────────────

    // Resolves when condition() returns truthy, or rejects after timeoutMs.
    // Uses setTimeout (not rAF) so it works reliably in background tabs.
    function waitFor(condition, timeoutMs, label, intervalMs = 200) {
        return new Promise((resolve, reject) => {
            const deadline = performance.now() + timeoutMs;
            (function poll() {
                const result = condition();
                if (result) { resolve(result); return; }
                if (performance.now() >= deadline) {
                    reject(new Error(`waitFor timed out: ${label}`));
                    return;
                }
                setTimeout(poll, intervalMs);
            })();
        });
    }

    // Waits for #id to exist, then clicks it. Returns true on success.
    async function clickWhenAvailable(id, timeoutMs = 20000) {
        log(`Waiting for #${id}...`);
        try {
            await waitFor(() => document.getElementById(id), timeoutMs, `#${id} to appear`);
        } catch {
            warn(`Timed out waiting for #${id}`);
            return false;
        }
        const el = document.getElementById(id);
        // Dispatch the full mouse event sequence the game expects.
        for (const type of ['mousedown', 'mouseup', 'click']) {
            el.dispatchEvent(new MouseEvent(type, { bubbles: true, cancelable: true, view: window }));
        }
        // Yield one tick so the game's event handler can run before we continue.
        await new Promise(r => setTimeout(r, 0));
        return true;
    }


    // ==================================================================================
    // ─── Phase 1 & 2: Fetch, patch, and inject the game bundle ───────────────
    // ==================================================================================

    // The bundle of the page's own copy of the game: the game is also served elsewhere (pseudo-corp.github.io/SynergismOfficial/,
    // for players whose network blocks synergism.cc), and its page loads "./dist/out.js" from wherever it is
    function gameBundleUrl() {
        if (location.hostname === 'synergism.cc') return 'https://synergism.cc/dist/out.js';
        return new URL('dist/out.js', document.baseURI).href;
    }

    async function injectPatchedBundle() {
        if (window.__HS_INJECTED__) return;
        window.__HS_INJECTED__ = true;

        log('Fetching game bundle...');
        let code;
        try {
            const res = await originalFetch(`${gameBundleUrl()}?t=${Date.now()}`, {
                cache: 'no-store',
                // The mod's header (HSGlobal.Common.modRequestHeaders); the mod isn't loaded yet, so no version
                headers: { 'Cache-Control': 'no-cache, no-store, must-revalidate', 'Pragma': 'no-cache', 'X-HyperSynergism-Version': 'loader' }
            });
            if (!res.ok) throw new Error(`Game bundle returned HTTP ${res.status}`);
            code = await res.text();
            log(`Bundle fetched, size: ${(code.length / 1024).toFixed(0)}KB`);
        } catch (e) {
            fail(e);
            return;
        }

        // ==================================================================================
        code = patchBundle(code, { log, warn });

        // Wait until the browser has finished parsing the HTML (DOMContentLoaded).
        // Checking document.body is not enough — the body element can exist while
        // the rest of the DOM is still being built, causing querySelector calls
        // inside the game bundle to hit null elements.
        if (document.readyState === 'loading') {
            await new Promise(resolve =>
                document.addEventListener('DOMContentLoaded', resolve, { once: true })
            );
        }


        // ==================================================================================
        // ── Phase 2: Inject patched bundle ────────────────────────────────────────────────
        // ==================================================================================

        assertUnclaimed();
        log('Injecting patched bundle');

        const gameScript = document.createElement('script');
        patchedScript = gameScript;
        window.__HS_BUNDLE_EXECUTED__ = false;
        gameScript.textContent = code + '\n;window.__HS_BUNDLE_EXECUTED__ = true;\n//# sourceURL=hypersynergism-patched-game.js';
        (document.body || document.head || document.documentElement).appendChild(gameScript);
        // The script has been parsed and executed — drop the source text so the
        // ~1.6 MB string can be garbage-collected.
        gameScript.textContent = '';
        if (!window.__HS_BUNDLE_EXECUTED__) {
            throw new Error('Patched game bundle did not finish executing; see the preceding script error.');
        }

        // Keep the element guard and insertion hooks: a prepared original can
        // execute even after this point. Only the best-effort observer is done.
        try { mo.disconnect(); } catch { }
        if (isFirefox && beforeScriptExecute) {
            document.removeEventListener('beforescriptexecute', beforeScriptExecute, true);
        }
        // Restore fetch — the block on /dist/out*.js is no longer needed.
        window.fetch = originalFetch;
        clearLateStartReloads();
        log('Bundle executed; late original game copies remain guarded');


        // ==================================================================================
        // ── Phase 3: Ensure the game initialises ──────────────────────────────────────────
        // ==================================================================================

        // The game hooks onto window's "load" event. When we inject the bundle
        // after window.load has already fired, the game never receives it, so
        // the player object is never set up. Replay only if load already fired;
        // otherwise the real event will initialize the game once.
        if (document.readyState === 'complete') {
            log('Dispatching synthetic load event to initialise game');
            window.dispatchEvent(new Event('load'));
        }

        // ── Proceed to post-load phases ───────────────────────────────────────
        initBackdoor();
        runPostLoadSequence();
    }

    // ─── Phase 3 helper: expose __HS_BACKDOOR__ for external diagnostics ──────
    function initBackdoor() {
        const s = document.createElement('script');
        s.textContent =
            `window.__HS_BACKDOOR__ = {` +
                `get exposed() {` +
                    `return {` +
                        `synergismStage:      typeof window.__HS_synergismStage,` +
                        `DOMCacheGetOrSet:    typeof window.DOMCacheGetOrSet,` +
                        `i18next:             typeof window.__HS_i18next,` +
                        `exportSynergism:     typeof window.__HS_exportSynergism,` +
                        `exportData:          typeof window.__HS_exportData,` +
                        `exportOutputPatched: !!window.__HS_EXPORT_OUTPUT_PATCHED,` +
                        `getMaxChallenges:    typeof window.__HS_getMaxChallenges,` +
                        `validateBlueberryTree: typeof window.__HS_validateBlueberryTree,` +
                        `dialogHookPatched:   !!window.__HS_DIALOG_HOOK_PATCHED,` +
                        `saveImportHookPatched: !!window.__HS_SAVE_IMPORT_HOOK_PATCHED,` +
                        `headerModulesPatched: !!window.__HS_HEADER_MODULES_PATCHED,` +
                        `tackHooks:           Array.isArray(window.__HS_tackHooks) ? window.__HS_tackHooks.length : 'n/a'` +
                    `};` +
                `}` +
            `};`;
        (document.head || document.documentElement).appendChild(s);
        log('Backdoor ready');
    }

    // ==================================================================================
    // ─── Phases 4–6: Wait for game, dismiss offline modal, expose, load mod ───────────
    // ==================================================================================

    // Read a boolean mod setting from the mod's own storage (HSSettings → HSStorage:
    // key 'hs-settings', JSON encoded twice, { [settingName]: { enabled, ... } }).
    // The mod isn't loaded yet at this point, so fall back to its default.
    function readModBooleanSetting(settingName, fallback) {
        try {
            const raw = localStorage.getItem('hs-settings');
            if (!raw) return fallback;
            let settings = JSON.parse(raw);
            if (typeof settings === 'string') settings = JSON.parse(settings);
            const enabled = settings?.[settingName]?.enabled;
            return typeof enabled === 'boolean' ? enabled : fallback;
        } catch (e) {
            return fallback;
        }
    }

    async function runPostLoadSequence() {
        try {
            // Phase 4: Wait for the game to finish loading.
            // The offline container is the game's own "loading done" signal —
            // it only appears after the save has been read and the UI is ready.
            // Also accept body.loading being gone: the page starts with it and only
            // the popup's exit removes it, so the player already closed the popup.
            log('Phase 4 — waiting for offlineContainer to appear...');
            await waitFor(
                () => {
                    const el = document.getElementById('offlineContainer');
                    return (el && getComputedStyle(el).display !== 'none')
                        || !document.body.classList.contains('loading');
                },
                60000,
                'offlineContainer to become visible'
            );
            log('Game is loaded (offlineContainer visible or already closed)');

            // What the bundle patch applied (written by patchBundle). A missing patch only costs what it adds:
            // the mod still loads, with its fallbacks for what's missing (as for bookmarklet players).
            const patchReport = window.__HS_PATCH_REPORT || {};
            const stagePatched = patchReport.stage !== false;
            const exportPatched = patchReport.export !== false;
            // A wait that times out is reported, and the sequence goes on
            const waitOrWarn = async (condition, label) => {
                try {
                    await waitFor(condition, 20000, label);
                    return true;
                } catch {
                    warn(`${label} not set after 20 s — loading the mod without it`);
                    return false;
                }
            };
            const isOfflineOpen = () => {
                const el = document.getElementById('offlineContainer');
                return !!el && getComputedStyle(el).display !== 'none';
            };
            const dismissOffline = async () => {
                if (!isOfflineOpen()) return;
                log('Dismissing offlineContainer...');
                const offlineContainer = document.getElementById('offlineContainer');
                const exitBtn = document.getElementById('exitOffline')
                    || offlineContainer.querySelector('button');
                if (exitBtn) exitBtn.click();
                // Wait 100 ms for the dismissal animation and any post-modal setup.
                await new Promise(r => setTimeout(r, 100));
            };
            const navigateForExposure = async () => {
                await clickWhenAvailable('settingstab');
                await new Promise(r => setTimeout(r, 300));
                if (stagePatched) {
                    await clickWhenAvailable('switchSettingSubTab4');
                    await new Promise(r => setTimeout(r, 300));
                    await clickWhenAvailable('kMisc');
                    await new Promise(r => setTimeout(r, 300));
                }

                // Trigger exportSynergism silently to expose both export functions. Never without the export
                // patch: the click would run a real export (a file or the clipboard, and its rewards).
                if (exportPatched) {
                    window.__HS_SILENT_EXPORT = true;
                    await clickWhenAvailable('exportgame');
                    window.__HS_SILENT_EXPORT = false;
                }
            };

            // Phase 5: Trigger exposure by navigating to Settings → Misc → Export.
            // Done behind the offline popup: the game's tab buttons don't check for it,
            // so the player doesn't see the tab switching. The export exposes itself
            // right away (its click handler runs it directly).
            if (stagePatched || exportPatched) {
                log('Phase 5 — navigating to Settings (behind the offline popup) to trigger exposure...');
                await navigateForExposure();
                if (exportPatched) await waitOrWarn(() => window.__HS_EXPORT_EXPOSED, '__HS_EXPORT_EXPOSED');
            } else {
                warn('Phase 5 skipped — neither the stage nor the export patch applied');
            }

            // The stage is only exposed when the game renders the Misc stats, and the game
            // pauses its display updates while the offline popup is open. So it happens on
            // the first update after the popup closes, with Misc still active behind it.
            if (readModBooleanSetting('autoDismissOfflinePopup', true)) {
                await dismissOffline();
            }

            if (!stagePatched) {
                // No stage to wait for: back to Buildings now (behind the popup when it's still open)
                if (exportPatched) {
                    await clickWhenAvailable('buildingstab');
                    await new Promise(r => setTimeout(r, 300));
                }
            } else if (!isOfflineOpen()) {
                log('Waiting for the stage exposure flag...');
                if (await waitOrWarn(() => window.__HS_EXPOSED, '__HS_EXPOSED')) {
                    log('Exposure complete — stage and export are ready');
                }

                // Return to Buildings tab so the game looks normal to the player.
                await clickWhenAvailable('buildingstab');
                await new Promise(r => setTimeout(r, 300));
            } else {
                // Popup kept open (autoDismissOfflinePopup is off): load the mod now, the stage
                // gets exposed when the player closes the popup, then go back to Buildings.
                log('Keeping offlineContainer open (autoDismissOfflinePopup is off) — stage will be exposed when it closes');
                waitFor(() => window.__HS_EXPOSED, 24 * 3600 * 1000, '__HS_EXPOSED')
                    .then(() => {
                        log('Exposure complete — stage and export are ready');
                        return clickWhenAvailable('buildingstab');
                    })
                    .catch(e => warn('Stage exposure after the offline popup failed:', e));
            }

            // Phase 6: Load the mod.
            await loadMod();

        } catch (e) {
            warn('Post-load sequence failed:', e);
        }
    }

    function loadMod() {
        const modSource = dev ? 'LOCAL DEV SERVER' : 'CDN';
        log(`Phase 6 — loading mod from ${modSource}...`);
        window.__HS_REPO = window.__HS_REPO || (dev ? 'maenhiir' : 'Ferlieloi');
        window.__HS_VERSION = window.__HS_VERSION ? window.__HS_VERSION : 'master';
        return new Promise((resolve, reject) => {
            const s = document.createElement('script');
            const url = dev
                ? `http://127.0.0.1:8080/hypersynergism.js?t=${Date.now()}`
                : `https://cdn.jsdelivr.net/gh/${window.__HS_REPO}/synergism-hypersynergy@${window.__HS_VERSION}/release/mod/hypersynergism_release.js?t=${Date.now()}`;
            s.src = url;
            s.onload = () => {
                log(`✅ Mod script loaded from ${modSource}: ${url}`);
                // src/mod/index.ts creates and initializes hypersynergism itself.
                // Calling init() here races that asynchronous initialization and
                // makes "Mod initialised" appear before the work has completed.
                log('Mod entrypoint started initialization');
                resolve();
            };
            s.onerror = () => {
                warn(`❌ Mod failed to load from ${modSource}: ${url}`);
                reject(new Error('Mod load failed'));
            };
            (document.head || document.documentElement).appendChild(s);
        });
    }

    log(`HyperSynergism loader initialised`);

}

// Loader 0.2.6 and older call module.exports directly. Keep that interface
// while exposing the named methods used by the browser loaders and newer code.
function patchSteamBundle(code, options = {}) {
    return patchBundle(code, { ...options, steam: true });
}

patchSteamBundle.patchBundle = patchBundle;
patchSteamBundle.startBrowserLoader = startBrowserLoader;
module.exports = patchSteamBundle;
