// Generated from src/loader/shared by npm run build:loaders.
"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/loader/shared/scanner.mjs
function isLineBreak(char) {
  return char === "\n" || char === "\r" || char === "\u2028" || char === "\u2029";
}
function isWordChar(code) {
  return code >= 48 && code <= 57 || code >= 65 && code <= 90 || code >= 97 && code <= 122 || code === 95 || code === 36;
}
function skipString(source, start, quote) {
  for (let i = start + 1; i < source.length; i++) {
    if (source[i] === "\\") i++;
    else if (source[i] === quote) return i;
  }
  return source.length;
}
function skipTemplate(source, start) {
  for (let i = start + 1; i < source.length; i++) {
    if (source[i] === "\\") i++;
    else if (source[i] === "`") return i;
    else if (source[i] === "$" && source[i + 1] === "{") {
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
    if (char === "\\") i++;
    else if (char === "[") inClass = true;
    else if (char === "]") inClass = false;
    else if (char === "/" && !inClass) {
      while (isWordChar(source.charCodeAt(i + 1))) i++;
      return i;
    }
  }
  return -1;
}
function scanDelimiters(source, start, limit, visit) {
  let regexAllowed = true;
  let previous = "";
  const parens = [];
  const blocks = [];
  for (let i = start; i < limit; i++) {
    const char = source[i];
    const next = source[i + 1];
    if (char <= " " || isLineBreak(char)) continue;
    if (char === "/" && next === "/") {
      while (i + 1 < limit && !isLineBreak(source[i + 1])) i++;
      continue;
    }
    if (char === "/" && next === "*") {
      const end = source.indexOf("*/", i + 2);
      if (end === -1) return -1;
      i = end + 1;
      continue;
    }
    if (char === '"' || char === "'" || char === "`") {
      i = char === "`" ? skipTemplate(source, i) : skipString(source, i, char);
      previous = "value";
      regexAllowed = false;
      continue;
    }
    if (char === "/" && regexAllowed) {
      const end = skipRegExp(source, i);
      if (end !== -1) {
        i = end;
        previous = "value";
        regexAllowed = false;
        continue;
      }
    }
    if (isWordChar(source.charCodeAt(i))) {
      const wordStart = i;
      while (isWordChar(source.charCodeAt(i + 1))) i++;
      const word = source.slice(wordStart, i + 1);
      const member = previous === ".";
      previous = member ? "value" : word;
      regexAllowed = !member && EXPRESSION_PREFIXES.has(word);
      continue;
    }
    if ("()[]{},".includes(char) && visit(char, i)) return i;
    if (char === "(") parens.push(CONTROL_HEADERS.has(previous));
    if (char === "{") blocks.push(BLOCK_PREFIXES.has(previous));
    if (char === ")") {
      regexAllowed = parens.pop() === true;
      previous = regexAllowed ? "condition" : char;
    } else if (char === "}") {
      regexAllowed = blocks.pop() === true;
      previous = regexAllowed ? "block" : char;
    } else if ((char === "+" || char === "-") && next === char) {
      i++;
      previous = char;
    } else {
      regexAllowed = "([{,;:=!?&|^~+-%*/<>".includes(char);
      previous = char;
    }
  }
  return -1;
}
function walkBraces(source, bodyStart, until = -1) {
  let depth = 1;
  const closingBrace = scanDelimiters(source, bodyStart, until < 0 ? source.length : until, (char) => {
    if (char === "{") depth++;
    else if (char === "}") return --depth === 0;
    return false;
  });
  return until < 0 ? closingBrace : depth;
}
function findMatchingBrace(source, bodyStart) {
  return walkBraces(source, bodyStart);
}
function splitParams(list) {
  const params = [];
  let depth = 0;
  let start = 0;
  scanDelimiters(list, 0, list.length, (char, index) => {
    if ("([{".includes(char)) depth++;
    else if (")]}".includes(char)) depth--;
    else if (char === "," && depth === 0) {
      params.push(list.slice(start, index).trim());
      start = index + 1;
    }
    return false;
  });
  const last = list.slice(start).trim();
  if (last) params.push(last);
  return params;
}
var PARAMS, CONTROL_HEADERS, BLOCK_PREFIXES, EXPRESSION_PREFIXES;
var init_scanner = __esm({
  "src/loader/shared/scanner.mjs"() {
    "use strict";
    PARAMS = String.raw`\((?:[^()]|\([^()]*\))*\)`;
    CONTROL_HEADERS = /* @__PURE__ */ new Set(["if", "for", "while", "with", "switch", "catch"]);
    BLOCK_PREFIXES = /* @__PURE__ */ new Set(["condition", "else", "do", "try", "finally", "block"]);
    EXPRESSION_PREFIXES = /* @__PURE__ */ new Set([
      "return",
      "throw",
      "case",
      "delete",
      "void",
      "typeof",
      "new",
      "in",
      "instanceof",
      "yield",
      "await",
      "else",
      "do"
    ]);
  }
});

// src/loader/shared/patch-finders.mjs
function createPatchFinders(warnIfAmbiguous) {
  const findFunctionBodyByName = (src, fnName) => {
    const escapedName = fnName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const notInName = "(?<![\\w$])";
    const headerPatterns = [
      new RegExp(`${notInName}${escapedName}\\s*=\\s*(?:async\\s*)?(?:${PARAMS}|[a-zA-Z_$][\\w$]*)\\s*=>\\s*\\{`, "g"),
      new RegExp(`${notInName}${escapedName}\\s*=\\s*(?:async\\s+)?function\\s*${PARAMS}\\s*\\{`, "g"),
      new RegExp(`(?:async\\s+)?function\\s+${escapedName}\\s*${PARAMS}\\s*\\{`, "g")
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
  const functionHeaders = () => [
    new RegExp(String.raw`([a-zA-Z_$][\w$]*)\s*=\s*(?:async\s*)?(?:${PARAMS}|[a-zA-Z_$][\w$]*)\s*=>\s*\{`, "g"),
    new RegExp(String.raw`([a-zA-Z_$][\w$]*)\s*=\s*(?:async\s+)?function\s*${PARAMS}\s*\{`, "g"),
    new RegExp(String.raw`(?:async\s+)?function\s+([a-zA-Z_$][\w$]*)\s*${PARAMS}\s*\{`, "g")
  ];
  const findFunctionAround = (src, index, markers) => {
    const start = Math.max(0, index - 1e5);
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
      if (markers.every((marker) => body.includes(marker))) return { ...candidate, bodyEnd };
    }
    return null;
  };
  const findEnclosingFunction = (src, anchorRe, markers, label) => {
    const found = [];
    anchorRe.lastIndex = 0;
    let anchor;
    while ((anchor = anchorRe.exec(src)) !== null) {
      const result = findFunctionAround(src, anchor.index, markers);
      if (result && !found.some((f) => f.bodyStart === result.bodyStart)) found.push(result);
    }
    warnIfAmbiguous(label, found.map((f) => f.fnName));
    return found[0] ?? null;
  };
  const findAssignedObjectLiteral = (src, keyRe, markers, label) => {
    const found = [];
    keyRe.lastIndex = 0;
    let key;
    while ((key = keyRe.exec(src)) !== null) {
      const windowStart = Math.max(0, key.index - 1e5);
      const assignOpen = /([a-zA-Z_$][\w$]*)\s*=\s*\{/g;
      const opens = [];
      let open;
      while ((open = assignOpen.exec(src.slice(windowStart, key.index))) !== null) {
        opens.push({ start: windowStart + open.index + open[0].length - 1, name: open[1] });
      }
      for (const candidate of opens.reverse()) {
        const depth = walkBraces(src, candidate.start + 1, key.index);
        if (depth === 0) continue;
        if (depth === 1) {
          const end = findMatchingBrace(src, candidate.start + 1);
          const literal = src.slice(candidate.start, end);
          if (end > key.index && markers.every((marker) => literal.includes(marker)) && !found.some((f) => f.start === candidate.start)) {
            found.push({ ...candidate, end });
          }
        }
        break;
      }
    }
    warnIfAmbiguous(label, found.map((f) => f.name));
    return found[0] ?? null;
  };
  const exposeFunction = (src, result, globalName) => {
    const escapedFn = result.fnName.replace(/\$/g, "\\$");
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
      code: src.slice(0, result.bodyStart) + `
window.${globalName}=${result.fnName};
` + src.slice(result.bodyStart),
      atDefinition: false
    };
  };
  return { findFunctionBodyByName, findFunctionAround, findEnclosingFunction, findAssignedObjectLiteral, exposeFunction };
}
var init_patch_finders = __esm({
  "src/loader/shared/patch-finders.mjs"() {
    "use strict";
    init_scanner();
  }
});

// src/loader/shared/patch-bundle.mjs
var patch_bundle_exports = {};
__export(patch_bundle_exports, {
  patchBundle: () => patchBundle
});
function capSaveSeeds(player) {
  const seeds = player && player.seed;
  if (!Array.isArray(seeds)) return player;
  const now = Date.now();
  if (!seeds.some((seed) => seed > now)) return player;
  return Object.assign({}, player, { seed: seeds.map((seed) => Math.min(seed, now)) });
}
function stripHeaderModules(player) {
  const isMod = (id) => typeof id === "string" && /^hs[A-Z]/.test(id);
  const layouts = player && player.headerLayouts;
  if (!layouts || typeof layouts !== "object") return player;
  const withoutMod = (record) => {
    if (!record || typeof record !== "object" || !Object.keys(record).some(isMod)) return record;
    const copy = Object.assign({}, record);
    for (const id of Object.keys(copy)) if (isMod(id)) delete copy[id];
    return copy;
  };
  let changed = false;
  const strippedLayouts = {};
  for (const key of Object.keys(layouts)) {
    const layout = layouts[key];
    strippedLayouts[key] = layout;
    if (!layout || typeof layout !== "object" || !layout.regions || typeof layout.regions !== "object") continue;
    let found = false;
    const unstacked = [];
    const regions = {};
    for (const region of Object.keys(layout.regions)) {
      const slots = layout.regions[region];
      regions[region] = !Array.isArray(slots) ? slots : slots.map((slot) => {
        if (!Array.isArray(slot) || !slot.some(isMod)) return slot;
        found = true;
        const kept = slot.filter((id) => !isMod(id));
        if (kept.length === 1) unstacked.push(kept[0]);
        return kept;
      });
    }
    let sizes = withoutMod(layout.sizes);
    const positions = withoutMod(layout.positions);
    const hidden = Array.isArray(layout.hidden) ? layout.hidden.filter((id) => !isMod(id)) : layout.hidden;
    if (!found && sizes === layout.sizes && positions === layout.positions && (!Array.isArray(hidden) || hidden.length === layout.hidden.length)) continue;
    if (sizes && typeof sizes === "object" && unstacked.some((id) => sizes[id] === "S")) {
      sizes = Object.assign({}, sizes);
      for (const id of unstacked) if (sizes[id] === "S") delete sizes[id];
    }
    strippedLayouts[key] = Object.assign({}, layout, { regions, sizes, hidden, positions });
    changed = true;
  }
  return changed ? Object.assign({}, player, { headerLayouts: strippedLayouts }) : player;
}
function patchBundle(code, options = {}) {
  const log = options.log || ((...a) => console.log("[PATCH]", ...a));
  const warn = options.warn || ((...a) => console.warn("[PATCH]", ...a));
  const report = {};
  const ambiguous = [];
  const topLines = [];
  const warnIfAmbiguous = (label, names) => {
    if (names.length > 1) {
      ambiguous.push(label);
      warn(`${label}: ${names.length} places match its anchor — patched ${names[0]}, also ${names.slice(1).join(", ")}. Applied, but check this patch`);
    }
  };
  const {
    findFunctionBodyByName,
    findFunctionAround,
    findEnclosingFunction,
    findAssignedObjectLiteral,
    exposeFunction
  } = createPatchFinders(warnIfAmbiguous);
  const findExportFunctionFromClickHandler = (src) => {
    const listenerPrefix = `[a-zA-Z_$][\\w$]*\\(\\s*["']exportgame["']\\s*\\)\\s*\\.addEventListener\\(\\s*["']click["']\\s*,\\s*`;
    const listenerPatterns = [
      new RegExp(
        listenerPrefix + `(?:async\\s*)?\\(\\s*\\)\\s*=>\\s*(?:\\{\\s*)?(?:void\\s+)?([a-zA-Z_$][\\w$]*)\\s*\\(`,
        "g"
      ),
      new RegExp(listenerPrefix + `([a-zA-Z_$][\\w$]*)\\s*\\)`, "g")
    ];
    for (const pattern of listenerPatterns) {
      const match = pattern.exec(src);
      if (!match) continue;
      const result = findFunctionBodyByName(src, match[1]);
      if (result) return result;
    }
    return null;
  };
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
  const writesSaveOut = (src, fnResult) => {
    const body = src.slice(fnResult.bodyStart, fnResult.bodyEnd);
    return (body.includes('"saveType"') || body.includes("'saveType'")) && (body.includes("clipboard") || body.includes("createObjectURL") || body.includes("Blob"));
  };
  const findExportDataFunction = (src, fnResult) => {
    if (!fnResult || fnResult.bodyEnd < fnResult.bodyStart) return null;
    for (const step of findAwaitedFunctions(src, fnResult)) {
      if (writesSaveOut(src, step)) return step;
      if (findAwaitedFunctions(src, step).some((inner) => writesSaveOut(src, inner))) return step;
    }
    return null;
  };
  report.export = false;
  report.exportOutput = false;
  try {
    const exportSemanticResult = findEnclosingFunction(
      code,
      /["']exportGQPerHour["']/g,
      [".lastExportedSave", ".offlinetick"],
      "exportSynergism"
    );
    const exportResult = exportSemanticResult || findExportFunctionFromClickHandler(code);
    if (exportResult) {
      const exportFn = exportResult.fnName;
      const exportDataResult = findExportDataFunction(code, exportResult);
      const exportDataFn = exportDataResult?.fnName;
      let suppressOutput = "";
      if (exportDataResult && exportDataFn) {
        suppressOutput = `
if(window.__HS_SUPPRESS_EXPORT_ONCE){window.__HS_SUPPRESS_EXPORT_ONCE=false;console.log('[HS-PATCH] ✅ Save output suppressed (quarks awarded)');return;}
`;
        log(`Patched exportData output guard (fn=${exportDataFn})`);
      } else {
        warn('Found exportSynergism but not its save output step (no awaited function writing the save out by "saveType")');
      }
      const expose = `
if(!window.__HS_EXPORT_EXPOSED){window.__HS_exportSynergism=${exportFn};` + (exportDataFn ? `window.__HS_exportData=${exportDataFn};window.__HS_EXPORT_OUTPUT_PATCHED=true;` : "") + `window.__HS_EXPORT_EXPOSED=true;console.log('[HS-PATCH] ✅ exportSynergism exposed');}if(window.__HS_SILENT_EXPORT)return;
`;
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
      log(`Patched exportSynergism (fn=${exportFn}, output=${exportDataFn ?? "unavailable"}, via=${exportSemanticResult ? "golden-quark-export" : "click-handler"})`);
    } else {
      warn("Could not patch exportSynergism — neither the golden quark export nor the exportgame click handler matched");
    }
  } catch (e) {
    warn("Error while patching exportSynergism", e);
  }
  report.stage = false;
  try {
    const stageAnchor = /["']gameStageStatistic["']/;
    const stageResult = findEnclosingFunction(code, new RegExp(stageAnchor.source, "g"), ["miscStats"], "stage");
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
        const expose = `
if(!window.__HS_STAGE_EXPOSED){window.DOMCacheGetOrSet=${domFn};window.__HS_synergismStage=${stageFn};window.__HS_i18next=${i18nObj};window.__HS_STAGE_EXPOSED=true;window.__HS_EXPOSED=true;console.log('[HS-PATCH] ✅ Stage exposed (dom=${domFn} stage=${stageFn} i18n=${i18nObj})');}
`;
        code = code.slice(0, stageResult.bodyStart) + expose + code.slice(stageResult.bodyStart);
        report.stage = true;
        log(`Patched stage at fn entry (fn=${stageResult.fnName} dom=${domFn} stage=${stageFn} i18n=${i18nObj})`);
      } else {
        warn(`Stage var extraction failed — dom=${domFn} stage=${stageFn} i18n=${i18nObj}`);
      }
    }
  } catch (e) {
    warn("Error while patching stage", e);
  }
  report.player = false;
  try {
    const player = findAssignedObjectLiteral(
      code,
      /(?<![\w$.])["']?firstPlayed["']?\s*:/g,
      ["challengecompletions", "worlds"],
      "player initializer"
    );
    if (player) {
      const capture = '(function(player){window.symp=window.symp||Symbol();Object.defineProperty(window,window.symp,{enumerable:false,configurable:true,writable:true,value:player});console.log("[HS-PATCH] ✅ Symbol exposed");return player})(';
      code = code.slice(0, player.start) + capture + code.slice(player.start, player.end + 1) + ")" + code.slice(player.end + 1);
      report.player = true;
      log(`Patched player initializer (variable=${player.name})`);
    } else {
      warn("Could not find player initializer in game bundle");
    }
  } catch (e) {
    warn("Error while patching player initializer", e);
  }
  report.talismans = false;
  try {
    const talismans = findAssignedObjectLiteral(
      code,
      /(?<![\w$.])["']?exemption["']?\s*:/g,
      ["baseMult", "horseShoe"],
      "talismans"
    );
    if (talismans) {
      const capture = "(function(o){window.__HS_talismans=o;return o})(";
      code = code.slice(0, talismans.start) + capture + code.slice(talismans.start, talismans.end + 1) + ")" + code.slice(talismans.end + 1);
      report.talismans = true;
      log(`Patched talismans (variable=${talismans.name})`);
    } else {
      warn("Could not find the talismans object in game bundle");
    }
  } catch (e) {
    warn("Error while patching talismans", e);
  }
  report.getMaxChallenges = false;
  try {
    const gmcResult = findEnclosingFunction(
      code,
      /\.cubeUpgrades\s*\[\s*29\s*\]/g,
      ["researches[105]", "oneChallengeCap", "reincarnationChallengeCap"],
      "getMaxChallenges"
    );
    if (gmcResult) {
      const gmcFn = gmcResult.fnName;
      const expose = `
if(!window.__HS_CHALLENGES_EXPOSED){window.__HS_getMaxChallenges=${gmcFn};window.__HS_CHALLENGES_EXPOSED=true;console.log('[HS-PATCH] ✅ getMaxChallenges exposed (fn=${gmcFn})');}
`;
      code = code.slice(0, gmcResult.bodyStart) + expose + code.slice(gmcResult.bodyStart);
      report.getMaxChallenges = true;
      log(`Patched getMaxChallenges (fn=${gmcFn})`);
    } else {
      warn("Could not patch getMaxChallenges — challenge-cap behavior not found in bundle");
    }
  } catch (e) {
    warn("Error while patching getMaxChallenges", e);
  }
  report.tack = false;
  try {
    const tackResult = findEnclosingFunction(
      code,
      /\.timeWarp\b/g,
      ["autoPotion", "purpleReactor", "runeSacrifice"],
      "tack()"
    );
    if (tackResult) {
      const tackPatch = `if(!window.__HS_TACK_PATCHED){window.__HS_TACK_PATCHED=true;window.__HS_tackHooks=[];window.__HS_onAfterTack=function(fn){window.__HS_tackHooks.push(fn);};console.log('[HS-PATCH] ✅ tack() patched (fn=${tackResult.fnName})');}queueMicrotask(()=>{const h=window.__HS_tackHooks.splice(0);for(let i=0;i<h.length;i++)h[i]();});`;
      code = code.slice(0, tackResult.bodyStart) + tackPatch + code.slice(tackResult.bodyStart);
      report.tack = true;
      log(`Patched tack() (fn=${tackResult.fnName})`);
    } else {
      warn("Could not patch tack() — game-time timer behavior not found in bundle");
    }
  } catch (e) {
    warn("Error while patching tack()", e);
  }
  report.dialogHook = false;
  try {
    const dialogKinds = {
      confirmWrapper: "confirm",
      alertWrapper: "alert",
      infoAlertWrapper: "infoAlert",
      promptWrapper: "prompt",
      purchasePromptWrapper: "purchasePrompt"
    };
    const wrapperRe = /["'](confirmWrapper|alertWrapper|infoAlertWrapper|promptWrapper|purchasePromptWrapper)["']/g;
    const actionRe = /[\w$.]+\.enqueue\(\s*(?:async\s*)?\(\s*\)\s*=>\s*\{/g;
    const dialogHeaderRe = new RegExp(String.raw`(?<![\w$.])[\w$]+\s*=\s*(?:async\s*)?(${PARAMS}|[\w$]+)\s*=>\s*$`, "d");
    const hiddenRe = /^\s*\)\s*\.style\.display\s*=\s*["']none["']/;
    const sites = [];
    let action;
    while ((action = actionRe.exec(code)) !== null) {
      const bodyStart = action.index + action[0].length;
      const bodyEnd = findMatchingBrace(code, bodyStart);
      if (bodyEnd < 0) continue;
      const body = code.slice(bodyStart, bodyEnd);
      if (!body.includes("confirmationBox")) continue;
      const own = /* @__PURE__ */ new Set();
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
        kind: dialogKinds[[...own][0]],
        params: header[1],
        paramsStart: headerStart + paramsStart,
        paramsEnd: headerStart + paramsEnd,
        bodyStart
      });
    }
    const foundKinds = sites.map((site) => site.kind);
    const allFoundOnce = Object.values(dialogKinds).every((kind) => foundKinds.filter((k) => k === kind).length === 1);
    if (!allFoundOnce) {
      warn(`Could not patch the game dialogs — expected each of the 5 once, found: [${foundKinds.join(", ")}]`);
    } else {
      const edits = [];
      for (const site of sites) {
        const list = site.params.startsWith("(") ? site.params.slice(1, -1).trim() : site.params.trim();
        const firstParam = splitParams(list)[0] ?? "";
        const originArgs = /^[\w$]+$/.test(firstParam) ? `"${site.kind}",${firstParam}` : `"${site.kind}"`;
        const originParam = `__hsO=window.__HS_dialogOrigin?.(${originArgs})`;
        edits.push({
          start: site.paramsStart,
          end: site.paramsEnd,
          text: `(${list ? `${list},` : ""}${originParam})`
        });
        edits.push({
          start: site.bodyStart,
          end: site.bodyStart,
          text: `
const __hsA=window.__HS_onDialog?.("${site.kind}",__hsO);if(__hsA)return Promise.resolve(__hsA.value);
`
        });
      }
      edits.sort((a, b) => b.start - a.start);
      for (const edit of edits) {
        code = code.slice(0, edit.start) + edit.text + code.slice(edit.end);
      }
      topLines.push("window.__HS_DIALOG_HOOK_PATCHED = true;");
      report.dialogHook = true;
      log("Patched the 5 game dialogs (dialog hook)");
    }
  } catch (e) {
    warn("Error while patching the game dialogs", e);
  }
  report.validateBlueberryTree = false;
  try {
    const vbtResult = findEnclosingFunction(
      code,
      /["']Exalt9x1["']/g,
      ["lifetimeAmbrosia", "Exalt1x1", "Exalt5x1"],
      "validateBlueberryTree"
    );
    if (vbtResult) {
      const exposed = exposeFunction(code, vbtResult, "__HS_validateBlueberryTree");
      code = exposed.code;
      report.validateBlueberryTree = true;
      log(`Patched validateBlueberryTree${exposed.atDefinition ? "" : " at its first call"} (fn=${vbtResult.fnName})`);
    } else {
      warn("Could not patch validateBlueberryTree — Exalt unlock check not found in bundle");
    }
  } catch (e) {
    warn("Error while patching validateBlueberryTree", e);
  }
  report.saveImportHook = false;
  try {
    const importResult = findEnclosingFunction(
      code,
      /["']importexport\.loadTestInLive["']/g,
      ["importexport.unableImport", "exporttest"],
      "save import hook"
    );
    if (importResult) {
      const header = code.slice(Math.max(0, importResult.bodyStart - 300), importResult.bodyStart);
      const params = new RegExp(String.raw`(${PARAMS})\s*(?:=>\s*)?\{$`).exec(header);
      const resetParam = params && splitParams(params[1].slice(1, -1))[1]?.split("=")[0].trim();
      if (resetParam && /^[\w$]+$/.test(resetParam)) {
        code = code.slice(0, importResult.bodyStart) + `
try{window.__HS_onSaveImport?.(${resetParam})}catch(__hsE){}
` + code.slice(importResult.bodyStart);
        topLines.push("window.__HS_SAVE_IMPORT_HOOK_PATCHED = true;");
        report.saveImportHook = true;
        log(`Patched importSynergism (save import hook, fn=${importResult.fnName})`);
      } else {
        warn("Could not patch the save import hook — importSynergism has no second (reset) parameter");
      }
    } else {
      warn("Could not patch the save import hook — importSynergism not found in bundle");
    }
  } catch (e) {
    warn("Error while patching the save import hook", e);
  }
  report.manualAscension = false;
  const ascensionLabel = "manualAscension";
  const confirmation = findEnclosingFunction(
    code,
    /["']main\.ascendPrompt["']/g,
    ["main.transcendPrompt", "main.reincarnatePrompt"],
    ascensionLabel
  );
  if (confirmation && !ambiguous.includes(ascensionLabel)) {
    const body = code.slice(confirmation.bodyStart, confirmation.bodyEnd);
    const resets = [...body.matchAll(/(?<![\w$.])[a-zA-Z_$][\w$]*\s*\(\s*["']ascension["']\s*\)/g)];
    if (resets.length === 1) {
      const [reset] = resets;
      const call = reset[0];
      const wrapped = `(__hsManual&&window.__HS_runManualAscension?window.__HS_runManualAscension(()=>${call}):${call})`;
      code = code.slice(0, confirmation.bodyStart) + "\nconst __hsManual=window.event?.isTrusted;\n" + body.slice(0, reset.index) + wrapped + body.slice(reset.index + call.length) + code.slice(confirmation.bodyEnd);
      report.manualAscension = true;
      log(`Patched resetConfirmation (manual ascension, fn=${confirmation.fnName})`);
    }
  }
  if (!report.manualAscension) warn("Could not patch manual ascension — confirmed ascension reset not uniquely identified");
  report.consumables = false;
  try {
    const record = findAssignedObjectLiteral(
      code,
      /(?<![\w$.])["']?HAPPY_HOUR_BELL["']?\s*:\s*\{/g,
      ["amount", "ends", "displayName"],
      "consumables"
    );
    if (record) {
      const capture = "(function(o){window.__HS_consumables=o;return o})(";
      code = code.slice(0, record.start) + capture + code.slice(record.start, record.end + 1) + ")" + code.slice(record.end + 1);
      report.consumables = true;
      log(`Patched consumables (window.__HS_consumables, variable=${record.name})`);
    } else {
      warn("Could not patch consumables — the HAPPY_HOUR_BELL initializer was not found in bundle");
    }
  } catch (e) {
    warn("Error while patching consumables", e);
  }
  report.pcoinLevels = false;
  try {
    const initResult = findEnclosingFunction(
      code,
      /\.internalName\s*\]\s*=/g,
      ["Object.keys(", ".level"],
      "pcoinLevels"
    );
    const initBody = initResult ? code.slice(initResult.bodyStart, initResult.bodyEnd) : "";
    const levelsVar = /Object\.keys\(\s*([a-zA-Z_$][\w$]*)\s*\)/.exec(initBody)?.[1];
    const escapedVar = levelsVar?.replace(/\$/g, "\\$");
    const writesLevels = escapedVar && new RegExp(
      String.raw`(?<![\w$.])${escapedVar}\s*\[\s*[a-zA-Z_$][\w$]*\.internalName\s*\]\s*=`
    ).test(initBody);
    const updateResults = [];
    if (writesLevels) {
      const write = new RegExp(String.raw`(?<![\w$.])${escapedVar}\s*\[\s*[a-zA-Z_$][\w$]*\s*\]\s*=\s*[a-zA-Z_$][\w$]*(?![\w$.\[(])`, "g");
      let match;
      while ((match = write.exec(code)) !== null) {
        const result = findFunctionAround(code, match.index, []);
        if (result && result.bodyStart !== initResult.bodyStart && !updateResults.some((r) => r.bodyStart === result.bodyStart)) updateResults.push(result);
      }
    }
    if (writesLevels && updateResults.length === 1) {
      const updateResult = updateResults[0];
      const notify = "\n;window.__HS_pcoinLevelsLoaded=true;try{window.__HS_onPCoinChange?.()}catch(__hsE){}\n";
      const inserts = [
        { at: initResult.bodyStart, text: `
window.__HS_pcoinLevels=${levelsVar};
` },
        { at: initResult.bodyEnd, text: notify },
        { at: updateResult.bodyEnd, text: notify }
      ].sort((a, b) => b.at - a.at);
      for (const insert of inserts) code = code.slice(0, insert.at) + insert.text + code.slice(insert.at);
      report.pcoinLevels = true;
      log(`Patched PseudoCoin levels (variable=${levelsVar}, init=${initResult.fnName}, update=${updateResult.fnName})`);
    } else {
      warn(!initResult ? 'Could not patch PseudoCoin levels — initializePCoinCache ("[….internalName]=" with "Object.keys(") not found' : !writesLevels ? `Could not patch PseudoCoin levels — the levels object was not found in ${initResult.fnName}` : `Could not patch PseudoCoin levels — expected 1 updatePCoinCache writing ${levelsVar}, found ${updateResults.length}`);
    }
  } catch (e) {
    warn("Error while patching PseudoCoin levels", e);
  }
  report.quarkBonus = false;
  try {
    const uiResult = findEnclosingFunction(
      code,
      /["']settings\.quarkBonusExtended["']/g,
      ["settings.quarkBonusSimple", "currentBonus"],
      "quark bonus"
    );
    const header = uiResult ? code.slice(Math.max(0, uiResult.bodyStart - 300), uiResult.bodyStart) : "";
    const paramList = new RegExp(String.raw`(${PARAMS})\s*(?:=>\s*)?\{$`).exec(header)?.[1];
    const params = paramList ? splitParams(paramList.slice(1, -1)).map((p) => p.split("=")[0].trim()) : [];
    const body = uiResult ? code.slice(uiResult.bodyStart, uiResult.bodyEnd) : "";
    const globalParam = params.find((p) => new RegExp(
      String.raw`globalBonus\s*:\s*${p.replace(/\$/g, "\\$")}(?![\w$.\[(])`
    ).test(body));
    const personalParam = params.find((p) => p !== globalParam);
    if (uiResult && params.length === 2 && params.every((p) => /^[\w$]+$/.test(p)) && globalParam && personalParam) {
      code = code.slice(0, uiResult.bodyStart) + `
try{window.__HS_quarkBonus={personal:${personalParam},global:${globalParam}};window.__HS_onQuarkBonusChange?.()}catch(__hsE){}
` + code.slice(uiResult.bodyStart);
      report.quarkBonus = true;
      log(`Patched quark bonus (fn=${uiResult.fnName}, personal=${personalParam}, global=${globalParam})`);
    } else {
      warn(!uiResult ? 'Could not patch the quark bonus — updateQuarkUI ("settings.quarkBonusExtended") not found' : `Could not patch the quark bonus — the personal and global bonus parameters of ${uiResult.fnName} were not found`);
    }
  } catch (e) {
    warn("Error while patching the quark bonus", e);
  }
  report.globalEvent = false;
  try {
    const eventResult = findEnclosingFunction(
      code,
      /["']https:\/\/synergism\.cc\/events\/get["']/g,
      ["dayCheck", ".json()"],
      "global event"
    );
    if (eventResult) {
      const shadow = "\nconst fetch=(...__hsA)=>window.fetch(...__hsA).then(__hsR=>{try{if(__hsR&&__hsR.ok)__hsR.clone().json().then(__hsJ=>{window.__HS_globalEvent=__hsJ;try{window.__HS_onGlobalEvent?.(__hsJ)}catch(__hsE){}},()=>{})}catch(__hsE){}return __hsR});\n";
      code = code.slice(0, eventResult.bodyStart) + shadow + code.slice(eventResult.bodyStart);
      topLines.push("window.__HS_GLOBAL_EVENT_PATCHED = true;");
      report.globalEvent = true;
      log(`Patched eventCheck (global event, fn=${eventResult.fnName})`);
    } else {
      warn("Could not patch the global event — eventCheck not found in bundle");
    }
  } catch (e) {
    warn("Error while patching the global event", e);
  }
  report.headerModules = false;
  try {
    let next = code;
    const problems = [];
    const saveResult = findEnclosingFunction(next, /["']testing\.gameSaved["']/g, ["offlinetick"], "header modules (saveSynergy)");
    const schemaParse = /(?<![\w$.])(?!JSON\.)([a-zA-Z_$][\w$]*)\.parse\(\s*([a-zA-Z_$][\w$]*)\s*\)/g;
    const saveParses = saveResult ? [...next.slice(saveResult.bodyStart, saveResult.bodyEnd).matchAll(schemaParse)] : [];
    if (saveParses.length === 1) {
      const [match, schema, playerVar] = saveParses[0];
      const at = saveResult.bodyStart + saveParses[0].index;
      next = next.slice(0, at) + `${schema}.parse(window.__HS_stripHeaderModules(${playerVar}))` + next.slice(at + match.length);
    } else {
      problems.push(saveResult ? `expected 1 schema parse in saveSynergy (fn=${saveResult.fnName}), found ${saveParses.length}` : 'saveSynergy ("testing.gameSaved") not found');
    }
    const loadResult = findEnclosingFunction(next, /["']testing\.saveInLive2["']/g, [], "header modules (loadSynergy)");
    const loadParseAt = loadResult ? next.slice(loadResult.bodyStart, loadResult.bodyEnd).search(/(?<![\w$.])JSON\.parse\(/) : -1;
    if (loadParseAt >= 0) {
      const at = loadResult.bodyStart + loadParseAt;
      next = next.slice(0, at) + "window.__HS_parseSave(" + next.slice(at + "JSON.parse(".length);
    } else {
      problems.push(loadResult ? `no JSON.parse in loadSynergy (fn=${loadResult.fnName})` : 'loadSynergy ("testing.saveInLive2") not found');
    }
    const unlocks = findAssignedObjectLiteral(
      next,
      /(?<![\w$.])["']?ascCubeStats["']?\s*:/g,
      ["singularitybtn", "ascensionChallengeProgress"],
      "header modules (headerModuleUnlocks)"
    );
    if (unlocks) {
      const capture = "(function(o){window.__HS_headerModuleUnlocks=o;return o})(";
      next = next.slice(0, unlocks.start) + capture + next.slice(unlocks.start, unlocks.end + 1) + ")" + next.slice(unlocks.end + 1);
    } else {
      problems.push("headerModuleUnlocks (ascCubeStats … singularitybtn) not found");
    }
    const renderResult = findEnclosingFunction(next, /["']--header-button-slots["']/g, ["headerTray"], "header modules (renderHeaderLayout)");
    if (renderResult) {
      next = next.slice(0, renderResult.bodyStart) + "\ntry{window.__HS_beforeHeaderRender?.()}catch(__hsE){}\n" + next.slice(renderResult.bodyStart);
      next = exposeFunction(next, renderResult, "__HS_renderHeaderLayout").code;
    } else {
      problems.push('renderHeaderLayout ("--header-button-slots") not found');
    }
    if (problems.length === 0) {
      code = next;
      topLines.push(`window.__HS_stripHeaderModules=${String(stripHeaderModules)};window.__HS_parseSave=function(t){return window.__HS_stripHeaderModules(JSON.parse(t))};window.__HS_HEADER_MODULES_PATCHED = true;`);
      report.headerModules = true;
      log(`Patched the header modules (save=${saveResult.fnName}, load=${loadResult.fnName}, unlocks=${unlocks.name}, render=${renderResult.fnName})`);
    } else {
      warn(`Could not patch the header modules — ${problems.join("; ")}`);
    }
  } catch (e) {
    warn("Error while patching the header modules", e);
  }
  report.saveSeedCap = false;
  try {
    const saveResult = findEnclosingFunction(code, /["']testing\.gameSaved["']/g, ["offlinetick"], "save seed cap");
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
    warn("Error while patching the save seed cap", e);
  }
  report.headerChallengeSize = false;
  try {
    const size = findEnclosingFunction(
      code,
      /\.sizes\s*\[[^\]]+\][^;{}]{0,100}["']M["']/g,
      [],
      "header challenge size (sizeOf)"
    );
    if (!size) throw new Error("header size reader (.sizes with M fallback) not found");
    const match = /\(([^()]+)\)\s*(?:=>\s*)?\{$/.exec(code.slice(Math.max(0, size.bodyStart - 300), size.bodyStart));
    const names = match ? match[1].split(",").map((name) => name.trim()) : [];
    if (names.length !== 2 || !names.every((name) => /^[a-zA-Z_$][\w$]*$/.test(name))) {
      throw new Error("unreadable header size reader parameters");
    }
    const [layout, id] = names;
    const hook = `if(window.__HS_compactChallengeText&&/^(transcension|reincarnation|ascension)ChallengeProgress$/.test(${id})&&${layout}.sizes[${id}]==="Tall")return"M";`;
    code = code.slice(0, size.bodyStart) + hook + code.slice(size.bodyStart);
    topLines.push("window.__HS_HEADER_CHALLENGE_SIZE_PATCHED=true;");
    report.headerChallengeSize = true;
    log(`Patched compact challenge module size (fn=${size.fnName})`);
  } catch (error) {
    warn("Could not patch compact challenge module size", error.message);
  }
  report.headerButtons = false;
  try {
    const renderResult = findEnclosingFunction(code, /["']--header-button-slots["']/g, ["headerTray"], "header buttons (render)");
    const renderBody = renderResult ? code.slice(renderResult.bodyStart, renderResult.bodyEnd) : "";
    const propertyStart = renderBody.indexOf("--header-button-slots");
    const propertyEnd = renderBody.indexOf(";", propertyStart);
    const capacityProperty = renderBody.slice(propertyStart, propertyEnd < 0 ? renderBody.length : propertyEnd);
    const readers = [...code.matchAll(/(?<![\w$.])([a-zA-Z_$][\w$]*)\s*=\s*\(\s*\)\s*=>\s*([a-zA-Z_$][\w$]*)\s*\[\s*([a-zA-Z_$][\w$]*)\s*\(\s*\)\s*\]/g)].filter((match) => new RegExp(`(?<![\\w$.])${match[1].replace(/\$/g, "\\$")}\\(\\s*\\)`).test(capacityProperty));
    if (readers.length !== 1) throw new Error(`expected one capacity reader, found ${readers.length}`);
    const reader = readers[0];
    const capacity = reader[2].replace(/\$/g, "\\$");
    const access = `${capacity}\\s*\\[\\s*[a-zA-Z_$][\\w$]*\\s*\\]`;
    const splitPattern = new RegExp(`([a-zA-Z_$][\\w$]*\\(\\s*[a-zA-Z_$][\\w$]*\\.filter\\(\\s*[a-zA-Z_$][\\w$]*\\s*\\)\\s*,\\s*)(${access})(\\s*\\))`, "g");
    const limitPattern = new RegExp(`(<\\s*)(${access})`, "g");
    const splits = [...code.matchAll(splitPattern)];
    const limits = [...code.matchAll(limitPattern)];
    if (splits.length !== 1 || limits.length !== 1) {
      throw new Error(`expected one slot split and one position limit, found ${splits.length} and ${limits.length}`);
    }
    const joinPattern = new RegExp(`([a-zA-Z_$][\\w$]*)\\.includes\\(\\s*([a-zA-Z_$][\\w$]*)\\s*\\)\\s*\\|\\|\\s*\\1\\.length\\s*<\\s*${reader[1].replace(/\$/g, "\\$")}\\(\\s*\\)`, "g");
    const joins = [...code.matchAll(joinPattern)];
    if (joins.length !== 1) throw new Error(`expected one button join check, found ${joins.length}`);
    const move = findEnclosingFunction(code, /\.positions\s*\[/g, [".join", ".hidden", ".splice(", ".push("], "header buttons (move)");
    const parameters = (fn, count) => {
      if (!fn) throw new Error("header button drop handler not found");
      const match = /\(([^()]+)\)\s*(?:=>\s*)?\{$/.exec(code.slice(Math.max(0, fn.bodyStart - 300), fn.bodyStart));
      const names = match ? match[1].split(",").map((name) => name.trim()) : [];
      if (names.length !== count || !names.every((name) => /^[a-zA-Z_$][\w$]*$/.test(name))) {
        throw new Error(`unreadable parameters for ${fn.fnName}`);
      }
      return names.join(",");
    };
    const moveArguments = parameters(move, 4);
    const expression = `${reader[2]}[${reader[3]}()]`;
    const arrow = reader[0].indexOf("=>") + 2;
    const edits = [
      {
        at: reader.index + arrow,
        length: reader[0].length - arrow,
        text: `(window.__HS_headerButtonCapacity?.(${expression})??${expression})`
      },
      {
        at: splits[0].index,
        length: splits[0][0].length,
        text: `${splits[0][1]}Math.max(8,${splits[0][2]})${splits[0][3]}`
      },
      {
        at: limits[0].index,
        length: limits[0][0].length,
        text: `${limits[0][1]}Math.max(8,${limits[0][2]})`
      },
      {
        at: joins[0].index,
        length: joins[0][0].length,
        text: `(window.__HS_canJoinHeaderButtons?.(${joins[0][1]},${joins[0][2]})??(${joins[0][0]}))`
      },
      {
        at: move.bodyStart,
        length: 0,
        text: `if(window.__HS_moveHeaderButton?.(${moveArguments}))return;`
      }
    ];
    for (const edit of edits.sort((a, b) => b.at - a.at)) {
      code = code.slice(0, edit.at) + edit.text + code.slice(edit.at + edit.length);
    }
    topLines.push("window.__HS_HEADER_BUTTONS_PATCHED=true;");
    report.headerButtons = true;
    log(`Patched header button capacity (fn=${reader[1]})`);
  } catch (error) {
    warn("Could not patch header button capacity", error.message);
  }
  report.headerLongPress = false;
  try {
    const down = findEnclosingFunction(
      code,
      /window\.setTimeout\s*\(/g,
      [".headerRegion", ".pointerId", "getBoundingClientRect"],
      "header long press"
    );
    const timers = down ? [...code.slice(down.bodyStart, down.bodyEnd).matchAll(/(?<![\w$.])([a-zA-Z_$][\w$]*)\s*=\s*window\.setTimeout\s*\(/g)] : [];
    if (timers.length !== 1) throw new Error(`expected one header hold timer, found ${timers.length}`);
    const at = down.bodyStart + timers[0].index;
    code = code.slice(0, at) + `${timers[0][1]}=window.__HS_headerLongPressEnabled===false?undefined:window.setTimeout(` + code.slice(at + timers[0][0].length);
    topLines.push("window.__HS_HEADER_LONG_PRESS_PATCHED=true;");
    report.headerLongPress = true;
    log(`Patched optional header long press (fn=${down.fnName})`);
  } catch (error) {
    warn("Could not patch header long press", error.message);
  }
  if (options.steam) {
    report.steamAutoSync = false;
    try {
      const saveResult = findEnclosingFunction(code, /["']testing\.gameSaved["']/g, [], "Steam auto-sync");
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
      warn("Error while patching Steam auto-sync", e);
    }
  }
  topLines.unshift(`window.__HS_PATCH_REPORT=${JSON.stringify(report)};window.__HS_PATCH_AMBIGUOUS=${JSON.stringify(ambiguous)};`);
  const prologue = /^\s*(?:(["'])use strict\1\s*;?)?/.exec(code)[0];
  const prologueEnd = prologue.trim() && !prologue.trim().endsWith(";") ? ";" : "";
  code = prologue + prologueEnd + "\n" + topLines.join("\n") + "\n" + code.slice(prologue.length);
  const patchNames = Object.keys(report);
  const missing = patchNames.filter((name) => !report[name]);
  log(`Bundle patching complete: ${patchNames.length - missing.length}/${patchNames.length} applied` + (missing.length ? ` — missing: ${missing.join(", ")}` : "") + (ambiguous.length ? ` — to check (several matches): ${ambiguous.join(", ")}` : ""));
  return code;
}
var init_patch_bundle = __esm({
  "src/loader/shared/patch-bundle.mjs"() {
    "use strict";
    init_scanner();
    init_patch_finders();
  }
});

// src/loader/shared/loader-urls.mjs
function defaultRepo(dev) {
  return dev ? "maenhiir" : "Ferlieloi";
}
function repositoryRoot(repo, version) {
  return `https://cdn.jsdelivr.net/gh/${repo}/synergism-hypersynergy@${version}`;
}
var DEV_SERVER_ORIGIN;
var init_loader_urls = __esm({
  "src/loader/shared/loader-urls.mjs"() {
    "use strict";
    DEV_SERVER_ORIGIN = "http://127.0.0.1:8080";
  }
});

// src/loader/shared/browser-loader.mjs
var browser_loader_exports = {};
__export(browser_loader_exports, {
  startBrowserLoader: () => startBrowserLoader
});
function guardBrowserGameElements(getPatchedScript, onBlocked) {
  const gameElements = ["tab-row", "sub-tab"];
  const assertUnclaimed = () => {
    if (gameElements.some((name) => customElements.get(name))) {
      const error = new Error("The original game registered its UI before the loader started. Enable the userscript at document-start and refresh.");
      error.hsGameStartedFirst = true;
      throw error;
    }
  };
  assertUnclaimed();
  const cancelled = /* @__PURE__ */ new WeakSet();
  window.addEventListener("error", (event) => {
    if (event.error && cancelled.has(event.error)) event.preventDefault();
  }, true);
  const wrap = (define) => function(name, ctor, options) {
    if (gameElements.includes(name) && (!getPatchedScript() || document.currentScript !== getPatchedScript())) {
      const cancellation = new Error("Hypersynergism cancelled an unpatched game bundle");
      cancelled.add(cancellation);
      onBlocked();
      throw cancellation;
    }
    return define.call(this, name, ctor, options);
  };
  let guardedDefine = wrap(customElements.define);
  Object.defineProperty(customElements, "define", {
    configurable: true,
    get: () => guardedDefine,
    // Allow the game's polyfill to replace define without losing the guard.
    // Each wrapper captures its own delegate to avoid recursive delegation.
    set: (define) => {
      guardedDefine = wrap(define);
    }
  });
  return assertUnclaimed;
}
function startBrowserLoader(options) {
  "use strict";
  const { dev = false } = options || {};
  if (window.HS_LOADER_INITIALIZED) return;
  window.HS_LOADER_INITIALIZED = true;
  const loaderVersion = "4.11";
  const startTime = performance.now();
  const log = (...a) => console.log(`%c[HS-LOADER v${loaderVersion} +${(performance.now() - startTime).toFixed(0)}ms]`, "color:#4af", ...a);
  const warn = (...a) => console.warn(`%c[HS-LOADER v${loaderVersion} +${(performance.now() - startTime).toFixed(0)}ms]`, "color:#fa4", ...a);
  const debug = (...a) => console.debug(`%c[HS-LOADER v${loaderVersion} +${(performance.now() - startTime).toFixed(0)}ms]`, "color:#aaa", ...a);
  const originalFetch = window.fetch.bind(window);
  const isFirefox = navigator.userAgent.includes("Firefox");
  log(`Browser: ${isFirefox ? "Firefox" : "Not Firefox"}`);
  let gameScriptDetected = false;
  let patchedScript = null;
  const LATE_START_KEY = "hs-loader-late-start-reloads";
  const LATE_START_MAX_RELOADS = 3;
  const LATE_START_WINDOW_MS = 6e4;
  const LATE_START_RELOAD_DELAY_MS = 1500;
  function readLateStartReloads() {
    try {
      const saved = JSON.parse(sessionStorage.getItem(LATE_START_KEY) || "null");
      return saved && Date.now() - saved.at < LATE_START_WINDOW_MS ? saved.count : 0;
    } catch {
      return null;
    }
  }
  function clearLateStartReloads() {
    try {
      sessionStorage.removeItem(LATE_START_KEY);
    } catch {
    }
  }
  function showLoaderBanner(text, closable) {
    const show = () => {
      const banner = document.createElement("div");
      banner.style.cssText = "position:fixed;top:0;left:0;right:0;z-index:2147483647;padding:8px 36px;background:#2b2108;color:#ffd27a;border-bottom:2px solid #fa4;font:14px/1.4 sans-serif;text-align:center;";
      banner.textContent = text;
      if (closable) {
        const close = document.createElement("button");
        close.textContent = "✕";
        close.style.cssText = "position:absolute;top:4px;right:8px;background:none;border:none;color:inherit;font-size:16px;cursor:pointer;";
        close.addEventListener("click", () => banner.remove());
        banner.appendChild(close);
      }
      (document.body || document.documentElement).appendChild(banner);
    };
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", show, { once: true });
    else show();
  }
  function recoverFromLateStart() {
    const reloads = readModBooleanSetting("reloadOnLateLoaderStart", true) ? readLateStartReloads() : null;
    if (reloads !== null && reloads < LATE_START_MAX_RELOADS) {
      try {
        sessionStorage.setItem(LATE_START_KEY, JSON.stringify({ count: reloads + 1, at: Date.now() }));
      } catch {
      }
      log(`Game started before the loader: reloading (${reloads + 1}/${LATE_START_MAX_RELOADS})`);
      showLoaderBanner(`HyperSynergism: the game started before the mod's loader. Reloading… (${reloads + 1}/${LATE_START_MAX_RELOADS})`, false);
      setTimeout(() => location.reload(), LATE_START_RELOAD_DELAY_MS);
      return;
    }
    clearLateStartReloads();
    showLoaderBanner("HyperSynergism could not start: Tampermonkey ran the loader too late. Refresh the page." + (isFirefox ? "" : ` If it keeps happening, turn on "Allow User Scripts" in Chrome's extension details for Tampermonkey.`), true);
  }
  const fail = (error) => {
    window.__HS_LOADER_ERROR = String(error?.message || error);
    warn("Loader stopped:", error);
    if (error?.hsGameStartedFirst) recoverFromLateStart();
  };
  let assertUnclaimed;
  try {
    assertUnclaimed = guardBrowserGameElements(() => patchedScript, () => {
      debug("Cancelled an escaped original game bundle before UI construction");
      gameScriptDetected = true;
      queueMicrotask(() => injectPatchedBundle().catch(fail));
    });
  } catch (error) {
    fail(error);
    return;
  }
  window.fetch = async function(input, init) {
    const url = typeof input === "string" ? input : input instanceof Request ? input.url : "";
    if (shouldBlockScript(url)) {
      debug(`Fetch blocked: ${url.substring(0, 80)}`);
      return new Response("", { status: 200 });
    }
    return originalFetch(input, init);
  };
  function shouldBlockScript(src) {
    return src.includes("rocket-loader") || /\/dist\/out.*\.js/.test(src);
  }
  function interceptInsertedGameScript(node) {
    if (node?.nodeType !== 1 || node.localName !== "script") return false;
    const src = node.src || node.getAttribute("src") || "";
    if (!/\/dist\/out.*\.js(?:[?#]|$)/.test(src)) return false;
    node.type = "application/x-hs-blocked";
    node.setAttribute("data-hs-inert", "");
    if (!gameScriptDetected) {
      gameScriptDetected = true;
      injectPatchedBundle().catch(fail);
    }
    debug(`Blocked game script before DOM insertion: ${src.substring(0, 80)}`);
    return true;
  }
  function acknowledgeBlockedScript(node) {
    queueMicrotask(() => {
      node.dispatchEvent(new Event("load"));
      node.remove();
    });
  }
  const nativeInsertBefore = Node.prototype.insertBefore;
  Node.prototype.insertBefore = function(node, referenceNode) {
    const blocked = interceptInsertedGameScript(node);
    const inserted = nativeInsertBefore.call(this, node, referenceNode);
    if (blocked) acknowledgeBlockedScript(node);
    return inserted;
  };
  const nativeAppendChild = Node.prototype.appendChild;
  Node.prototype.appendChild = function(node) {
    const blocked = interceptInsertedGameScript(node);
    const inserted = nativeAppendChild.call(this, node);
    if (blocked) acknowledgeBlockedScript(node);
    return inserted;
  };
  const nativeReplaceChild = Node.prototype.replaceChild;
  Node.prototype.replaceChild = function(node, oldNode) {
    const blocked = interceptInsertedGameScript(node);
    const replaced = nativeReplaceChild.call(this, node, oldNode);
    if (blocked) acknowledgeBlockedScript(node);
    return replaced;
  };
  let beforeScriptExecute;
  if (isFirefox) {
    beforeScriptExecute = function(e) {
      const src = e.target.src || "";
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
    document.addEventListener("beforescriptexecute", beforeScriptExecute, true);
  }
  const mo = new MutationObserver((muts) => {
    for (const m of muts) {
      for (const n of m.addedNodes) {
        if (n.tagName !== "SCRIPT") continue;
        if (n.hasAttribute("data-hs-inert")) continue;
        const src = n.src || "";
        if (shouldBlockScript(src)) {
          n.type = "javascript/blocked";
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
  function checkExistingScripts() {
    for (const script of Array.from(document.getElementsByTagName("script"))) {
      if (script.src && /\/dist\/out.*\.js/.test(script.src)) {
        script.type = "javascript/blocked";
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
  function waitFor(condition, timeoutMs, label, intervalMs = 200) {
    return new Promise((resolve, reject) => {
      const deadline = performance.now() + timeoutMs;
      (function poll() {
        const result = condition();
        if (result) {
          resolve(result);
          return;
        }
        if (performance.now() >= deadline) {
          reject(new Error(`waitFor timed out: ${label}`));
          return;
        }
        setTimeout(poll, intervalMs);
      })();
    });
  }
  async function clickWhenAvailable(id, timeoutMs = 2e4) {
    log(`Waiting for #${id}...`);
    try {
      await waitFor(() => document.getElementById(id), timeoutMs, `#${id} to appear`);
    } catch {
      warn(`Timed out waiting for #${id}`);
      return false;
    }
    const el = document.getElementById(id);
    for (const type of ["mousedown", "mouseup", "click"]) {
      el.dispatchEvent(new MouseEvent(type, { bubbles: true, cancelable: true, view: window }));
    }
    await new Promise((r) => setTimeout(r, 0));
    return true;
  }
  function gameBundleUrl() {
    if (location.hostname === "synergism.cc") return "https://synergism.cc/dist/out.js";
    return new URL("dist/out.js", document.baseURI).href;
  }
  async function injectPatchedBundle() {
    if (window.__HS_INJECTED__) return;
    window.__HS_INJECTED__ = true;
    log("Fetching game bundle...");
    let code;
    try {
      const res = await originalFetch(`${gameBundleUrl()}?t=${Date.now()}`, {
        cache: "no-store",
        // The mod's header (HSGlobal.Common.modRequestHeaders); the mod isn't loaded yet, so no version
        headers: { "Cache-Control": "no-cache, no-store, must-revalidate", "Pragma": "no-cache", "X-HyperSynergism-Version": "loader" }
      });
      if (!res.ok) throw new Error(`Game bundle returned HTTP ${res.status}`);
      code = await res.text();
      log(`Bundle fetched, size: ${(code.length / 1024).toFixed(0)}KB`);
    } catch (e) {
      fail(e);
      return;
    }
    code = patchBundle(code, { log, warn });
    if (document.readyState === "loading") {
      await new Promise(
        (resolve) => document.addEventListener("DOMContentLoaded", resolve, { once: true })
      );
    }
    assertUnclaimed();
    log("Injecting patched bundle");
    const gameScript = document.createElement("script");
    patchedScript = gameScript;
    window.__HS_BUNDLE_EXECUTED__ = false;
    gameScript.textContent = code + "\n;window.__HS_BUNDLE_EXECUTED__ = true;\n//# sourceURL=hypersynergism-patched-game.js";
    (document.body || document.head || document.documentElement).appendChild(gameScript);
    gameScript.textContent = "";
    if (!window.__HS_BUNDLE_EXECUTED__) {
      throw new Error("Patched game bundle did not finish executing; see the preceding script error.");
    }
    try {
      mo.disconnect();
    } catch {
    }
    if (isFirefox && beforeScriptExecute) {
      document.removeEventListener("beforescriptexecute", beforeScriptExecute, true);
    }
    window.fetch = originalFetch;
    clearLateStartReloads();
    log("Bundle executed; late original game copies remain guarded");
    if (document.readyState === "complete") {
      log("Dispatching synthetic load event to initialise game");
      window.dispatchEvent(new Event("load"));
    }
    initBackdoor();
    runPostLoadSequence();
  }
  function initBackdoor() {
    const s = document.createElement("script");
    s.textContent = `window.__HS_BACKDOOR__ = {get exposed() {return {synergismStage:      typeof window.__HS_synergismStage,DOMCacheGetOrSet:    typeof window.DOMCacheGetOrSet,i18next:             typeof window.__HS_i18next,exportSynergism:     typeof window.__HS_exportSynergism,exportData:          typeof window.__HS_exportData,exportOutputPatched: !!window.__HS_EXPORT_OUTPUT_PATCHED,getMaxChallenges:    typeof window.__HS_getMaxChallenges,validateBlueberryTree: typeof window.__HS_validateBlueberryTree,dialogHookPatched:   !!window.__HS_DIALOG_HOOK_PATCHED,saveImportHookPatched: !!window.__HS_SAVE_IMPORT_HOOK_PATCHED,headerModulesPatched: !!window.__HS_HEADER_MODULES_PATCHED,tackHooks:           Array.isArray(window.__HS_tackHooks) ? window.__HS_tackHooks.length : 'n/a'};}};`;
    (document.head || document.documentElement).appendChild(s);
    log("Backdoor ready");
  }
  function readModBooleanSetting(settingName, fallback) {
    try {
      const raw = localStorage.getItem("hs-settings");
      if (!raw) return fallback;
      let settings = JSON.parse(raw);
      if (typeof settings === "string") settings = JSON.parse(settings);
      const enabled = settings?.[settingName]?.enabled;
      return typeof enabled === "boolean" ? enabled : fallback;
    } catch (e) {
      return fallback;
    }
  }
  async function runPostLoadSequence() {
    try {
      log("Phase 4 — waiting for offlineContainer to appear...");
      await waitFor(
        () => {
          const el = document.getElementById("offlineContainer");
          return el && getComputedStyle(el).display !== "none" || !document.body.classList.contains("loading");
        },
        6e4,
        "offlineContainer to become visible"
      );
      log("Game is loaded (offlineContainer visible or already closed)");
      const patchReport = window.__HS_PATCH_REPORT || {};
      const stagePatched = patchReport.stage !== false;
      const exportPatched = patchReport.export !== false;
      const waitOrWarn = async (condition, label) => {
        try {
          await waitFor(condition, 2e4, label);
          return true;
        } catch {
          warn(`${label} not set after 20 s — loading the mod without it`);
          return false;
        }
      };
      const isOfflineOpen = () => {
        const el = document.getElementById("offlineContainer");
        return !!el && getComputedStyle(el).display !== "none";
      };
      const dismissOffline = async () => {
        if (!isOfflineOpen()) return;
        log("Dismissing offlineContainer...");
        const offlineContainer = document.getElementById("offlineContainer");
        const exitBtn = document.getElementById("exitOffline") || offlineContainer.querySelector("button");
        if (exitBtn) exitBtn.click();
        await new Promise((r) => setTimeout(r, 100));
      };
      const navigateForExposure = async () => {
        await clickWhenAvailable("settingstab");
        await new Promise((r) => setTimeout(r, 300));
        if (stagePatched) {
          await clickWhenAvailable("switchSettingSubTab4");
          await new Promise((r) => setTimeout(r, 300));
          await clickWhenAvailable("kMisc");
          await new Promise((r) => setTimeout(r, 300));
        }
        if (exportPatched) {
          window.__HS_SILENT_EXPORT = true;
          await clickWhenAvailable("exportgame");
          window.__HS_SILENT_EXPORT = false;
        }
      };
      if (stagePatched || exportPatched) {
        log("Phase 5 — navigating to Settings (behind the offline popup) to trigger exposure...");
        await navigateForExposure();
        if (exportPatched) await waitOrWarn(() => window.__HS_EXPORT_EXPOSED, "__HS_EXPORT_EXPOSED");
      } else {
        warn("Phase 5 skipped — neither the stage nor the export patch applied");
      }
      if (readModBooleanSetting("autoDismissOfflinePopup", true)) {
        await dismissOffline();
      }
      if (!stagePatched) {
        if (exportPatched) {
          await clickWhenAvailable("buildingstab");
          await new Promise((r) => setTimeout(r, 300));
        }
      } else if (!isOfflineOpen()) {
        log("Waiting for the stage exposure flag...");
        if (await waitOrWarn(() => window.__HS_EXPOSED, "__HS_EXPOSED")) {
          log("Exposure complete — stage and export are ready");
        }
        await clickWhenAvailable("buildingstab");
        await new Promise((r) => setTimeout(r, 300));
      } else {
        log("Keeping offlineContainer open (autoDismissOfflinePopup is off) — stage will be exposed when it closes");
        waitFor(() => window.__HS_EXPOSED, 24 * 3600 * 1e3, "__HS_EXPOSED").then(() => {
          log("Exposure complete — stage and export are ready");
          return clickWhenAvailable("buildingstab");
        }).catch((e) => warn("Stage exposure after the offline popup failed:", e));
      }
      await loadMod();
    } catch (e) {
      warn("Post-load sequence failed:", e);
    }
  }
  function loadMod() {
    const modSource = dev ? "LOCAL DEV SERVER" : "CDN";
    log(`Phase 6 — loading mod from ${modSource}...`);
    window.__HS_REPO = window.__HS_REPO || defaultRepo(dev);
    window.__HS_VERSION = window.__HS_VERSION ? window.__HS_VERSION : "master";
    return new Promise((resolve, reject) => {
      const s = document.createElement("script");
      const url = dev ? `${DEV_SERVER_ORIGIN}/hypersynergism.js?t=${Date.now()}` : `${repositoryRoot(window.__HS_REPO, window.__HS_VERSION)}/release/mod/hypersynergism_release.js?t=${Date.now()}`;
      s.src = url;
      s.onload = () => {
        log(`✅ Mod script loaded from ${modSource}: ${url}`);
        log("Mod entrypoint started initialization");
        resolve();
      };
      s.onerror = () => {
        warn(`❌ Mod failed to load from ${modSource}: ${url}`);
        reject(new Error("Mod load failed"));
      };
      (document.head || document.documentElement).appendChild(s);
    });
  }
  log(`HyperSynergism loader initialised`);
}
var init_browser_loader = __esm({
  "src/loader/shared/browser-loader.mjs"() {
    "use strict";
    init_patch_bundle();
    init_loader_urls();
  }
});

// src/loader/shared/patcher-entry.cjs
var { patchBundle: patchBundle2 } = (init_patch_bundle(), __toCommonJS(patch_bundle_exports));
var { startBrowserLoader: startBrowserLoader2 } = (init_browser_loader(), __toCommonJS(browser_loader_exports));
function patchSteamBundle(code, options = {}) {
  return patchBundle2(code, { ...options, steam: true });
}
patchSteamBundle.patchBundle = patchBundle2;
patchSteamBundle.startBrowserLoader = startBrowserLoader2;
module.exports = patchSteamBundle;
