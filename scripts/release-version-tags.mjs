// Version tags for the release helper (release-and-tag-helper.mjs), apart so scripts/tests/ can load them
// without starting a release.

// Compares embedded numbers as numbers ("2.9.0" < "2.10.0"), not character by character
const versionCollator = new Intl.Collator('en', { numeric: true, sensitivity: 'base' });

/**
 * Compare two version strings like "2.10.0", "2.14.4b" or "2.14.4b-dev1".
 * The part before the first "-" is compared numerically (a letter suffix comes after the plain
 * version: 2.10.2 < 2.10.2c); a dev build ("-dev1") is named from the release it is built on, so it
 * comes after it: 2.14.4b < 2.14.4b-dev1. Same order as the mod's version check (hs-version-tags.ts).
 */
export function compareVersions(a, b) {
    const [aMain, ...aPreParts] = a.split('-');
    const [bMain, ...bPreParts] = b.split('-');
    const mainOrder = versionCollator.compare(aMain, bMain);
    if (mainOrder !== 0) return mainOrder;

    const aPre = aPreParts.join('-');
    const bPre = bPreParts.join('-');
    if (aPre === bPre) return 0;
    if (!aPre) return -1;
    if (!bPre) return 1;
    return versionCollator.compare(aPre, bPre);
}

/** Sort version strings in descending order (latest first). */
export function semverSort(array) {
    return array.slice().sort((a, b) => compareVersions(b, a));
}

/** Parse git tag output (local or remote) into normalized version strings. */
export function parseTagList(raw) {
    return Array.from(new Set((raw || '').split(/\r?\n/).filter(Boolean)
        .map(line => {
            const trimmed = line.trim();
            // remote `ls-remote --tags` lines are `hash\trefs/tags/v1.2.3` or `refs/tags/v1.2.3^{} `
            const remoteMatch = trimmed.match(/refs\/tags\/(?:v)?(.+?)(?:\^\{\})?$/);
            if (remoteMatch) return remoteMatch[1];
            // local tag names are direct lines from `git tag`, maybe with or without prefix v
            const localMatch = trimmed.match(/^(?:v)?(.+)$/);
            return localMatch ? localMatch[1] : null;
        })
        // Mod versions only: other tags (e.g. the launcher's loader-vX.Y.Z) have their own versioning
        .filter(version => version && /^\d/.test(version))
    ));
}
