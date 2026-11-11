/** How the mod was loaded: the Steam game (desktop loader), a browser userscript (Tampermonkey), or the bookmark */
export type HSPlatformName = 'steam' | 'userscript' | 'bookmarklet';

/**
 * Class: HSPlatform
 * IsExplicitHSModule: No
 * Description:
 *     Tells how the mod was loaded. Every userscript loader sets HS_LOADER_INITIALIZED before the game runs,
 *     so a userscript whose patch failed still counts as a userscript. Static only.
 * Author: Shewchou
 */
export class HSPlatform {
    static #platform?: HSPlatformName;

    /** Known from the start: the Steam bridge and the userscripts' flag are set before the mod runs */
    static get(): HSPlatformName {
        HSPlatform.#platform ??= HSPlatform.#isSteamElectron() ? 'steam'
            : window.HS_LOADER_INITIALIZED ? 'userscript' : 'bookmarklet';
        return HSPlatform.#platform;
    }

    /**
     * Returns true when the current renderer environment appears to be Steam/Electron.
     * Uses the exposed Steam bridge plus Electron-specific runtime hints.
     */
    static #isSteamElectron(): boolean {
        const steam = (window as unknown as { steam?: unknown }).steam as any;
        const hasSteamBridge = typeof steam === 'object' && steam !== null
            && typeof steam.cloudWriteFile === 'function'
            && typeof steam.getSteamId === 'function';

        const hasElectronUserAgent = typeof navigator === 'object'
            && typeof navigator.userAgent === 'string'
            && /\bElectron\b/.test(navigator.userAgent);

        const hasElectronProcess = typeof (window as any).process === 'object'
            && typeof (window as any).process?.versions?.electron === 'string';

        return hasSteamBridge || hasElectronUserAgent || hasElectronProcess;
    }
}
