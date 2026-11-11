import { HSLogger } from "./hs-logger";
import { HSUI } from "./hs-ui";
import { HSUIC } from "./hs-ui-components";
import { HSModuleRegistry } from "./module/hs-module-registry";
import { HSPlatform } from "./hs-platform";
import noticeCSS from "inline:../../resource/css/module/hs-bookmarklet-notice.css";
// The userscript itself, as it is in the repo: what the Copy button copies
import bridgeScript from "inline:../../../loader/tampermonkey-bridge.user.js";

// Same file, as served to players (its own @downloadURL). A userscript manager opens its install page
// when the browser goes to a URL ending in .user.js.
const INSTALL_URL = 'https://cdn.jsdelivr.net/gh/Ferlieloi/synergism-hypersynergy@master/src/loader/tampermonkey-bridge.user.js';
// Chrome-based browsers only run userscripts once the player allows it
const ALLOW_SCRIPTS_GUIDE_URL = 'https://www.tampermonkey.net/faq.php?q=Q209';

interface HSTampermonkeyStore {
    browser: string;
    url: string;
    // Chrome-based: needs the "Allow User Scripts" step
    isChromeBased: boolean;
}

/**
 * Class: HSBookmarkletNotice
 * IsExplicitHSModule: No
 * Description:
 *     Tells players who loaded the mod with the bookmark (after the game, so without the patcher) how to
 *     switch to the Tampermonkey userscript: a modal at each load, and a section at the top of the Tools tab
 *     to open it again. Static only.
 * Author: Shewchou
 */
export class HSBookmarkletNotice {
    static #context = 'HSBookmarkletNotice';
    static #toolsBtnId = 'hs-panel-bookmarklet-notice-btn';
    static #modalId?: string;
    static #isOpening = false;

    /**
     * True when the mod was loaded with the bookmark: in a browser, and by no userscript loader (they all set
     * HS_LOADER_INITIALIZED before the game runs). A userscript whose patch failed is not a bookmark load.
     */
    static isBookmarkletLoad(): boolean {
        return HSPlatform.get() === 'bookmarklet';
    }

    /** The Tools tab section, empty unless the mod was loaded with the bookmark. */
    static buildToolsSection(): string[] {
        if (!HSBookmarkletNotice.isBookmarkletLoad()) return [];

        return [
            HSUIC.Div({
                class: 'hs-panel-grid-full-span',
                html: 'You loaded the mod with the bookmark: several features are missing, slower or less reliable. The Tampermonkey loader is the recommended way.'
            }),
            HSUIC.Button({ id: HSBookmarkletNotice.#toolsBtnId, text: 'How to switch' }),
        ];
    }

    static bindToolsSection(): void {
        document.getElementById(HSBookmarkletNotice.#toolsBtnId)?.addEventListener('click', () => void HSBookmarkletNotice.show());
    }

    /** Called at each load, once the mod is ready. */
    static async showIfBookmarklet(): Promise<void> {
        if (!HSBookmarkletNotice.isBookmarkletLoad()) return;

        HSLogger.log('Loaded with the bookmark, without the userscript loader: showing how to switch to Tampermonkey', HSBookmarkletNotice.#context);
        await HSBookmarkletNotice.show();
    }

    static async show(): Promise<void> {
        if (HSBookmarkletNotice.#isOpening) return;
        if (HSBookmarkletNotice.#modalId && document.getElementById(HSBookmarkletNotice.#modalId)) return;

        const hsui = HSModuleRegistry.getModule('HSUI');
        if (!hsui) return;

        HSBookmarkletNotice.#isOpening = true;
        try {
            HSUI.injectStyle(noticeCSS, 'hs-bookmarklet-notice-css');

            const modalId = await hsui.Modal({
                title: 'Switch to the Tampermonkey loader',
                htmlContent: HSBookmarkletNotice.#buildContent()
            });
            HSBookmarkletNotice.#modalId = modalId;

            document.getElementById(modalId)?.querySelector('.hs-bookmarklet-notice-copy')
                ?.addEventListener('click', () => void HSBookmarkletNotice.#copyScript());
        } finally {
            HSBookmarkletNotice.#isOpening = false;
        }
    }

    static #buildContent(): string {
        const store = HSBookmarkletNotice.#getStore();
        const link = (url: string, text: string) => `<a class="hs-link" href="${url}" target="_blank" rel="noopener">${text}</a>`;

        const allowStep = store.isChromeBased
            ? `<li>Allow it to run scripts: right-click the Tampermonkey icon, choose "Manage extension" and turn on "Allow User Scripts" (or "Developer mode" if that switch isn't there). ${link(ALLOW_SCRIPTS_GUIDE_URL, "Tampermonkey's guide")}</li>`
            : '';

        return `
            <div class="hs-bookmarklet-notice">
                <div>You loaded the mod with the <b>bookmark</b>. That way it starts after the game, so several features are missing, slower or less reliable (Auto-Sing among them).</div>
                <div>The recommended way is a userscript: the mod then loads by itself, with everything working. It takes a minute:</div>
                <ol>
                    <li>${link(store.url, `Install Tampermonkey${store.browser ? ` for ${store.browser}` : ''}`)}, a browser extension that runs userscripts.
                        <span class="hs-bookmarklet-notice-note">Other userscript managers may work too.</span></li>
                    ${allowStep}
                    <li>
                        <div class="hs-bookmarklet-notice-buttons">
                            <a class="hs-panel-btn hs-bookmarklet-notice-install" href="${INSTALL_URL}" target="_blank" rel="noopener">Install the script</a>
                            <div class="hs-panel-btn hs-bookmarklet-notice-copy">Copy the script</div>
                        </div>
                        Click "Install" on the page that opens.
                        <span class="hs-bookmarklet-notice-note">If it shows code instead, use Copy: in Tampermonkey, choose "Create a new script", replace everything with the copy and save (Ctrl+S).</span>
                    </li>
                    <li>Reload this page and delete the bookmark: the mod now loads by itself.</li>
                </ol>
            </div>`;
    }

    /** Tampermonkey's page in the store of the player's browser. Edge and Opera also say "Chrome" in their user agent. */
    static #getStore(): HSTampermonkeyStore {
        const userAgent = navigator.userAgent;

        if (userAgent.includes('Firefox/')) {
            return { browser: 'Firefox', url: 'https://addons.mozilla.org/firefox/addon/tampermonkey/', isChromeBased: false };
        }
        if (userAgent.includes('Edg/')) {
            return { browser: 'Edge', url: 'https://microsoftedge.microsoft.com/addons/detail/iikmkjmpaadaobahmlepeloendndfphd', isChromeBased: true };
        }
        if (userAgent.includes('OPR/')) {
            return { browser: 'Opera', url: 'https://addons.opera.com/extensions/details/tampermonkey-beta/', isChromeBased: true };
        }
        if (userAgent.includes('Chrome/')) {
            return { browser: 'Chrome', url: 'https://chromewebstore.google.com/detail/dhdgffkkebhmkfjojejmpbldmpobfkfo', isChromeBased: true };
        }
        // Safari and the rest: Tampermonkey's own site picks the right download
        return { browser: '', url: 'https://www.tampermonkey.net/', isChromeBased: false };
    }

    static async #copyScript(): Promise<void> {
        try {
            await navigator.clipboard.writeText(bridgeScript);
            HSUI.Notify('Loader script copied to clipboard', { position: 'top', notificationType: 'success' });
        } catch (error) {
            HSLogger.warn(`Could not copy the loader script: ${error}`, HSBookmarkletNotice.#context);
            HSUI.Notify('Could not copy the script: use "Install the script" instead', { position: 'top', notificationType: 'error' });
        }
    }
}
