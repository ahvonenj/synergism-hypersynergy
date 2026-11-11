const { patchBundle } = require('./patch-bundle.mjs');
const { startBrowserLoader } = require('./browser-loader.mjs');

// Loader 0.2.6 and older call module.exports directly. Keep that interface
// while exposing the named methods used by the browser loaders and newer code.
function patchSteamBundle(code, options = {}) {
    return patchBundle(code, { ...options, steam: true });
}

patchSteamBundle.patchBundle = patchBundle;
patchSteamBundle.startBrowserLoader = startBrowserLoader;
module.exports = patchSteamBundle;
