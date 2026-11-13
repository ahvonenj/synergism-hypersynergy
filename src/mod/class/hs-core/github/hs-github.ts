import { HSGlobal } from "../hs-global";
import { HSLogger } from "../hs-logger";
import { HSStorage } from "../hs-storage";
import { HSUI } from "../hs-ui";
import { setAnimatedBorder } from "../hs-animated-border";
import { HSModuleRegistry } from "../module/hs-module-registry";
import { compareVersionTags, isCurrentVersionLatest, latestVersionTag } from "./hs-version-tags";

const STORAGE_KEY = 'version-check';

/**
 * Class: HSGithub
 * IsExplicitHSModule: No
 * Description:
 *     Small helper to check if we have the latest mod version, using tags.
 *     The tags are those of the repo the mod was loaded from. Players of the
 *     Live repo follow its stable tags. Players of another repo (the Dev
 *     channel) follow that repo's dev builds too, and are told once about
 *     each Live release.
 */
export class HSGithub {
    static #context: string = 'HSGithub';
    static #pollInterval?: number;
    static #liveReleaseTag: string | null = null;
    static #announcedLiveTag: string | null = null;

    // Set by the browser loaders and by the Steam injector (loader 0.2.9 and later)
    static readonly owner: string | null = (typeof window.__HS_REPO === 'string' && window.__HS_REPO) ? window.__HS_REPO : null;
    static readonly currentTag: string = `v${HSGlobal.General.currentModVersion}`;

    // The latest Live release, as last read for a Dev channel player (null for a Live player)
    static get liveReleaseTag(): string | null {
        return HSGithub.#liveReleaseTag;
    }

    static async isLatestTag(): Promise<boolean> {
        return await this.#checkLatestTag();
    }

    static #liveOwner(): string {
        return HSGlobal.Release.githubOwner;
    }

    static #repoOwner(): string {
        return HSGithub.owner ?? HSGithub.#liveOwner();
    }

    static #isDevChannel(): boolean {
        return HSGithub.#repoOwner().toLowerCase() !== HSGithub.#liveOwner().toLowerCase();
    }

    static async #checkLatestTag(): Promise<boolean> {
        const isDevChannel = HSGithub.#isDevChannel();
        const repoOwner = HSGithub.#repoOwner();
        const tags = await HSGithub.#getRemoteTags(repoOwner);
        const latestTag = tags ? latestVersionTag(tags, isDevChannel) : null;

        if (isDevChannel) {
            await HSGithub.#checkLiveRelease();
        }

        if (!latestTag) {
            HSLogger.debug(() => `No latest tag available; assuming current version is latest.`, HSGithub.#context);
            return true;
        }

        const isLatest = isCurrentVersionLatest(HSGithub.currentTag, latestTag);

        if (isLatest) {
            HSLogger.log(`Up to date: running ${HSGithub.currentTag}, the latest tag of ${repoOwner} is ${latestTag}.`, HSGithub.#context);
        } else {
            HSLogger.log(`New version available: ${latestTag}!`, HSGithub.#context);
            HSGithub.#setNewVersionStyle();
        }

        return isLatest;
    }

    // A Live release above the running build is announced once to a Dev channel player.
    // No "new version" mark: a reload would give them the same Dev build.
    static async #checkLiveRelease(): Promise<void> {
        const tags = await HSGithub.#getRemoteTags(HSGithub.#liveOwner());
        const liveTag = tags ? latestVersionTag(tags) : null;
        if (!liveTag) return;

        HSGithub.#liveReleaseTag = liveTag;
        HSLogger.log(`Latest Live release: ${liveTag}.`, HSGithub.#context);

        if (compareVersionTags(liveTag, HSGithub.currentTag) <= 0) return;
        if (HSGithub.#wasLiveTagAnnounced(liveTag)) return;

        HSGithub.#announcedLiveTag = liveTag;
        HSModuleRegistry.getModule('HSStorage')?.setData(STORAGE_KEY, { announcedLiveTag: liveTag });
        void HSUI.Notify(`Live channel: ${liveTag} was released`, { position: 'top', displayDuration: 8000 });
    }

    static #wasLiveTagAnnounced(liveTag: string): boolean {
        if (HSGithub.#announcedLiveTag === liveTag) return true;

        const stored = HSModuleRegistry.getModule('HSStorage')?.getData<{ announcedLiveTag?: unknown }>(STORAGE_KEY);
        return stored?.announcedLiveTag === liveTag;
    }

    static async #getRemoteTags(githubOwner: string): Promise<unknown[] | null> {
        try {
            // GitHub's tags API does not promise chronological or version order.
            // Fetch a full page so a run of dev tags cannot hide a stable tag.
            const githubUrl = `https://api.github.com/repos/${githubOwner}/synergism-hypersynergy/tags?per_page=100`;
            const ghResp = await fetch(githubUrl);
            if (!ghResp.ok) {
                if (ghResp.status === 403) {
                    HSLogger.debug(() => `GitHub API returned 403 Forbidden. You may be rate-limited.`, HSGithub.#context);
                } else {
                    HSLogger.debug(() => `GitHub API request failed: HTTP ${ghResp.status} ${ghResp.statusText}`, HSGithub.#context);
                }
                return null;
            }
            const ghJson = await ghResp.json();
            if (!Array.isArray(ghJson) || ghJson.length === 0) {
                return null;
            }

            return ghJson;
        } catch (err) {
            HSLogger.debug(() => `GitHub API request threw an error: ${err}`, HSGithub.#context);
            return null;
        }
    }

    static startVersionPolling(intervalMs: number = HSGlobal.Release.checkIntervalMs): void {
        if (this.#pollInterval != null) {
            return;
        }

        const runCheck = async () => {
            const isLatest = await this.#checkLatestTag();
            if (!isLatest) {
                HSGithub.#stopVersionPolling();
            }
        };

        this.#pollInterval = window.setInterval(runCheck, intervalMs);

        // Run an initial check immediately instead of waiting for the first interval tick.
        // Otherwise a new version wouldn't surface until intervalMs (e.g. 30 minutes) after load
        void runCheck();
    }

    static #stopVersionPolling(): void {
        if (this.#pollInterval != null) {
            clearInterval(this.#pollInterval);
            this.#pollInterval = undefined;
        }
    }

    static #setNewVersionStyle(): void {
        const modIcon = document.querySelector('#hs-panel-control') as HTMLDivElement | null;
        const modPanelHead = document.querySelector('#hs-panel-version') as HTMLDivElement | null;

        if (modIcon && modPanelHead) {
            setAnimatedBorder(modIcon, 'rainbow');
            if (!modPanelHead.querySelector('#hs-panel-new-ver')) {
                modPanelHead.innerHTML += `: <span id="hs-panel-new-ver">New version available!</span>`;
            }
        }
    }
}
