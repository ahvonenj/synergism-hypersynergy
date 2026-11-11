import { defaultRepo, DEV_SERVER_ORIGIN, repositoryRoot } from './loader-urls.mjs';

function requestScript(url) {
    // At document-start, the loader must run before the game's own script.
    const xhr = new XMLHttpRequest();
    xhr.open('GET', url, false);
    xhr.send();
    return xhr;
}

function scriptWithSourceUrl(xhr, url) {
    return xhr.responseText + '\n//# sourceURL=' + url + '\n';
}

export function runBridge(dev, repo, version) {
    const baseUrl = dev
        ? `${DEV_SERVER_ORIGIN}/src/loader/hypersynergism.dev.js`
        : `${repositoryRoot(repo, version)}/src/loader/hypersynergism.user.js`;
    const url = `${baseUrl}?t=${Date.now()}`;
    window.__HS_REPO = repo;
    window.__HS_VERSION = version;

    try {
        const xhr = requestScript(url);
        if (xhr.status === 200) {
            new Function(scriptWithSourceUrl(xhr, url))();
            console.log(`%c[HS-BRIDGE] HS loader loaded fresh from ${url}`, 'color:#4af');
        } else {
            const message = dev ? 'Dev server returned' : 'Failed to fetch loader:';
            const hint = dev ? ' — is it running?' : '';
            console.error(`%c[HS-BRIDGE] ${message} ${xhr.status} — ${xhr.statusText} — ${url}${hint}`, 'color:#b02');
        }
    } catch (error) {
        console.error(`%c[HS-BRIDGE] Loader error: ${error}`, 'color:#b02');
    }
}

export function runBrowserLoader(dev) {
    if (window.HS_LOADER_INITIALIZED) return;

    const root = dev ? DEV_SERVER_ORIGIN : repositoryRoot(window.__HS_REPO || defaultRepo(dev), window.__HS_VERSION || 'master');
    const url = `${root}/synergism_modloader/lib/patcher.js?t=${Date.now()}`;
    try {
        const xhr = requestScript(url);
        if (xhr.status !== 200) throw new Error('Shared loader returned HTTP ' + xhr.status);

        const moduleShim = { exports: {} };
        const load = new Function('module', 'exports', scriptWithSourceUrl(xhr, url) + 'return module.exports;');
        load(moduleShim, moduleShim.exports).startBrowserLoader({ dev });
    } catch (error) {
        console.error('[HS-LOADER] Could not start shared loader from', url, error);
    }
}
