import { Hypersynergism } from "./class/hypersynergism";
import { HS_MODULE_DEFINITIONS } from "./class/hs-core/module/hs-module-definitions";

// Loader won't find the hypersynergism instance in window without this declaration
declare global {
    interface Window {
        hypersynergism: Hypersynergism;
        __HS_INIT_PROMISE?: Promise<void>;
    }
}

// Essentially the "main" entrypoint
window.__HS_INIT_PROMISE = (async () => {
    const hypersynergism = new Hypersynergism(HS_MODULE_DEFINITIONS);
    window.hypersynergism = hypersynergism;

    await hypersynergism.init();
})();
void window.__HS_INIT_PROMISE.catch(error => console.error('[HS] Mod initialization failed', error));
