// The decisions of the Live merge (merge-live-release.mjs), apart so scripts/tests/ can load them without
// starting a merge. The rules: docs/dev/releasing.md, "Merging a Live release into Dev".
import { parseTagList, semverSort } from './release-version-tags.mjs';

export const BUNDLE_FILE = 'release/mod/hypersynergism_release.js';
export const PACKAGE_FILES = ['package.json', 'package-lock.json'];

// The two scripts the build runs; everything else in scripts/ stays out of the bundle
const BUILD_SCRIPTS = new Set(['scripts/generate-strategy-manifest.js', 'scripts/heater-worker-plugin.cjs']);

/**
 * Whether a file can't change what the bundle is built from. A list of what is safe, not of the build's inputs: an
 * unknown path counts as code, and wrongly keeping Dev's bundle only delays Live's fix for Dev players, where wrongly
 * taking Live's would remove Dev work from them. The bundle itself is safe: it is the build's output, and Dev's can
 * differ with no code behind it (a merge that kept it, a release of code Live has).
 */
export function isNotBundleSource(path) {
    if (BUILD_SCRIPTS.has(path)) return false;
    return path === BUNDLE_FILE
        || /^(docs|doc|guides|scripts|\.github)\//.test(path)
        || /^[^/]+\.md$/.test(path)
        || path === 'LICENSE' || path === '.gitignore' || path === '.nojekyll';
}

/** A package file's content without its own version, to tell a version bump from a real change. */
export function withoutVersion(text) {
    const json = JSON.parse(text);
    delete json.version;
    if (json.packages?.['']) delete json.packages[''].version;
    return JSON.stringify(json);
}

/** The file's text with `version` as its own version, written the way npm does. */
export function withVersion(text, version) {
    const json = JSON.parse(text);
    json.version = version;
    if (json.packages?.['']) json.packages[''].version = version;
    return JSON.stringify(json, null, 2) + '\n';
}

/**
 * The files showing that Dev has code Live's release doesn't, out of those changed on Dev since the merge base.
 * `versionOnly`: the package files in which only the version changed.
 */
export function devCodeFiles(changedFiles, versionOnly = []) {
    return changedFiles.filter(path => !isNotBundleSource(path) && !versionOnly.includes(path));
}

/** Live's highest stable tag ("v2.14.7c") from `git ls-remote --tags` output: no -dev name, no loader tag. '' if none. */
export function highestStableTag(lsRemoteOutput) {
    const stable = parseTagList(lsRemoteOutput).filter(version => !version.includes('-'));
    return stable.length > 0 ? `v${semverSort(stable)[0]}` : '';
}

function firstFreeDevVersion(liveVersion, number, takenVersions) {
    let n = number;
    while (takenVersions.has(`${liveVersion}-dev${n}`)) n++;
    return `${liveVersion}-dev${n}`;
}

/** The numbering restarts: Live took the whole Dev `master`. `takenVersions`: tag names without the "v". */
export function restartedVersion(liveVersion, takenVersions = new Set()) {
    return firstFreeDevVersion(liveVersion, 1, takenVersions);
}

/**
 * The build number carries on: 2.14.4b-dev5 -> 2.14.4c-dev6. package.json holds the name of the next release, so a
 * number with no tag yet was never used and stays.
 */
export function carriedVersion(liveVersion, devVersion, takenVersions = new Set()) {
    const match = devVersion.match(/-dev(\d+)$/);
    if (!match) return firstFreeDevVersion(liveVersion, 1, takenVersions);
    const number = Number(match[1]);
    return firstFreeDevVersion(liveVersion, takenVersions.has(devVersion) ? number + 1 : number, takenVersions);
}
