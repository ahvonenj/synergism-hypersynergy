// Patch-letter tags such as v2.14.0a are stable releases in this project.
// Hyphenated tags (v2.14.4b-dev4) are dev builds: they must not prompt users
// of a stable release to update, and only count for players of the Dev channel.
const stableTagPattern = /^v?\d+\.\d+\.\d+[a-z]?$/;
const devTagPattern = /^v?\d+\.\d+\.\d+[a-z]?-[0-9A-Za-z.-]+$/;

// v2.14.4b-dev4: numbers 2.14.4, patch letter b, build dev4
function parseVersionTag(tag: string): { numbers: number[]; letter: string; build: Array<string | number> | null } {
    const normalized = tag.startsWith('v') ? tag.slice(1) : tag;
    // A tag of another shape: whatever follows the numbers is read as its build
    const match = normalized.match(/^(\d+(?:\.\d+)*)([a-z]?)(?:-(.+))?$/) ?? normalized.match(/^(\d+(?:\.\d+)*)()(.+)$/);
    const version = match?.[1] ?? normalized;
    const build = match?.[3] ?? null;
    const numbers = version.split('.').map((segment) => {
        const parsed = Number(segment);
        return Number.isFinite(parsed) ? parsed : 0;
    });
    const parsedBuild = build ? build.split('.').flatMap((part) => {
        const matches = part.match(/([0-9]+|[^0-9]+)/g);
        return matches ? matches.map((chunk) => /^[0-9]+$/.test(chunk) ? Number(chunk) : chunk) : [part];
    }) : null;
    return { numbers, letter: match?.[2] ?? '', build: parsedBuild };
}

export function compareVersionTags(a: string, b: string): number {
    const left = parseVersionTag(a);
    const right = parseVersionTag(b);

    const maxLen = Math.max(left.numbers.length, right.numbers.length);
    for (let i = 0; i < maxLen; i += 1) {
        const leftNum = left.numbers[i] ?? 0;
        const rightNum = right.numbers[i] ?? 0;
        if (leftNum !== rightNum) return leftNum < rightNum ? -1 : 1;
    }

    // A patch-letter release (v2.14.0a) follows its plain tag (v2.14.0), dev builds included:
    // v2.14.0-dev3 < v2.14.0a < v2.14.0a-dev1
    if (left.letter !== right.letter) return left.letter < right.letter ? -1 : 1;

    // A dev build is named from the release it is built on, so it follows it:
    // a current dev build of a stable version is still current.
    if (left.build === null || right.build === null) {
        if (left.build === right.build) return 0;
        return left.build === null ? -1 : 1;
    }

    const buildLen = Math.max(left.build.length, right.build.length);
    for (let i = 0; i < buildLen; i += 1) {
        const leftId = left.build[i];
        const rightId = right.build[i];
        if (leftId === undefined) return -1;
        if (rightId === undefined) return 1;
        if (leftId === rightId) continue;
        if (typeof leftId === 'number' && typeof rightId === 'number') return leftId < rightId ? -1 : 1;
        if (typeof leftId === 'number') return -1;
        if (typeof rightId === 'number') return 1;
        return leftId < rightId ? -1 : 1;
    }
    return 0;
}

// The highest version tag of a GitHub tag list: stable tags only, or dev builds too
export function latestVersionTag(entries: readonly unknown[], includeDev = false): string | null {
    let highestTag: string | null = null;
    for (const entry of entries) {
        const name = entry && typeof entry === 'object' && 'name' in entry ? entry.name : null;
        if (typeof name !== 'string') continue;
        if (!stableTagPattern.test(name) && !(includeDev && devTagPattern.test(name))) continue;
        if (!highestTag || compareVersionTags(name, highestTag) > 0) highestTag = name;
    }
    return highestTag;
}

export function isCurrentVersionLatest(currentTag: string, latestTag: string): boolean {
    return compareVersionTags(currentTag, latestTag) >= 0;
}
