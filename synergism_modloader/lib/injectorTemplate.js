const crypto = require('crypto')

function buildInjectorCode(modUrl) {
    return `
// ==== HYPERSYNERGISM INJECTOR START ====
try {
    console.log('[HS] Injected preload running');

    let resolvedUrl = ${JSON.stringify(modUrl)};
    try {
        const override = process.env.HS_MOD_URL;
        if (override) resolvedUrl = override;
    } catch (e) {
        console.warn('[HS] Could not read CLI args, using baked-in URL:', e.message);
    }

    console.log('[HS] Loading mod from:', resolvedUrl);
    fetch(resolvedUrl)
        .then(r => {
            if (!r.ok) throw new Error('Mod download failed (HTTP ' + r.status + ')');
            return r.text();
        })
        .then(code => {
            // The mod reads the repo and ref it was loaded from (its version check), as set by the
            // browser loaders. The page doesn't see this preload's globals, so they go in a script
            // of their own: one put in front of the mod's code would cancel its "use strict".
            // A jsDelivr URL: https://cdn.jsdelivr.net/gh/<owner>/<repo>@<ref>/<path>?t=<timestamp>
            const parts = String(resolvedUrl).split('?')[0].split('/');
            const at = (parts[5] || '').indexOf('@');
            if (parts[2] === 'cdn.jsdelivr.net' && parts[3] === 'gh' && parts[4] && at > 0 && parts[5].length > at + 1) {
                const source = document.createElement('script');
                source.textContent = 'window.__HS_REPO = ' + JSON.stringify(parts[4])
                    + '; window.__HS_VERSION = ' + JSON.stringify(parts[5].slice(at + 1)) + ';';
                document.head.appendChild(source);
            }

            const script = document.createElement('script');
            script.textContent = code;
            document.head.appendChild(script);
            // The mod entrypoint starts its own async initialization.
            const initialization = window.__HS_INIT_PROMISE;
            if (initialization && typeof initialization.then === 'function') {
                initialization.then(
                    () => console.log('[HS] Mod initialized'),
                    () => {} // The mod entrypoint reports its own initialization error.
                );
            } else {
                console.log('[HS] Mod script injected; initialization started');
            }
        })
        .catch(e => console.error('[HS] Mod download or injection failed', e));
} catch (e) {
    console.error('[HS] Injection failed', e);
}
// ==== HYPERSYNERGISM INJECTOR END ====
`
}

// Identifies the injector, whatever the mod URL: the game takes the URL from HS_MOD_URL at each launch.
// The injector is only written by a patch, so a game patched with another one needs a patch.
function injectorHash() {
    return crypto.createHash('sha256').update(buildInjectorCode('')).digest('hex')
}

module.exports = { buildInjectorCode, injectorHash }
