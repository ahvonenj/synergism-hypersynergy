import { patchBundle } from './patch-bundle.mjs';
import { defaultRepo, DEV_SERVER_ORIGIN, repositoryRoot } from './loader-urls.mjs';

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

export function startBrowserLoader(options) {
    'use strict';
    const { dev = false } = options || {};
    if (window.HS_LOADER_INITIALIZED) return;
    window.HS_LOADER_INITIALIZED = true;

    const loaderVersion = '4.11';
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
        window.__HS_REPO = window.__HS_REPO || defaultRepo(dev);
        window.__HS_VERSION = window.__HS_VERSION ? window.__HS_VERSION : 'master';
        return new Promise((resolve, reject) => {
            const s = document.createElement('script');
            const url = dev
                ? `${DEV_SERVER_ORIGIN}/hypersynergism.js?t=${Date.now()}`
                : `${repositoryRoot(window.__HS_REPO, window.__HS_VERSION)}/release/mod/hypersynergism_release.js?t=${Date.now()}`;
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
