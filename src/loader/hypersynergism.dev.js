// ==UserScript==
// @name         HyperSynergism Loader
// @namespace    https://github.com/Ferlieloi
// @version      4.2
// @description  Official loader for HyperSynergism mod
// @match        https://synergism.cc/*
// @match        https://pseudo-corp.github.io/SynergismOfficial/*
// @grant        none
// @run-at       document-start
// @license      MIT
// ==/UserScript==

// Generated from src/loader/shared by npm run build:loaders.
(() => {
  // src/loader/shared/loader-urls.mjs
  var DEV_SERVER_ORIGIN = "http://127.0.0.1:8080";
  function defaultRepo(dev) {
    return dev ? "maenhiir" : "Ferlieloi";
  }
  function repositoryRoot(repo, version) {
    return `https://cdn.jsdelivr.net/gh/${repo}/synergism-hypersynergy@${version}`;
  }

  // src/loader/shared/userscript-entry.mjs
  function requestScript(url) {
    const xhr = new XMLHttpRequest();
    xhr.open("GET", url, false);
    xhr.send();
    return xhr;
  }
  function scriptWithSourceUrl(xhr, url) {
    return xhr.responseText + "\n//# sourceURL=" + url + "\n";
  }
  function runBrowserLoader(dev) {
    if (window.HS_LOADER_INITIALIZED) return;
    const root = dev ? DEV_SERVER_ORIGIN : repositoryRoot(window.__HS_REPO || defaultRepo(dev), window.__HS_VERSION || "master");
    const url = `${root}/synergism_modloader/lib/patcher.js?t=${Date.now()}`;
    try {
      const xhr = requestScript(url);
      if (xhr.status !== 200) throw new Error("Shared loader returned HTTP " + xhr.status);
      const moduleShim = { exports: {} };
      const load = new Function("module", "exports", scriptWithSourceUrl(xhr, url) + "return module.exports;");
      load(moduleShim, moduleShim.exports).startBrowserLoader({ dev });
    } catch (error) {
      console.error("[HS-LOADER] Could not start shared loader from", url, error);
    }
  }

  // src/loader/shared/loader-entry.js
  runBrowserLoader(true);
})();
