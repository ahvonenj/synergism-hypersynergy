#!/usr/bin/env node
import { existsSync, readFileSync, writeFileSync } from 'fs';
import { join, relative, resolve } from 'path';
import {
    askForInput, askYesNo, fatal, getOriginRepo, info, log, logWait, purgeJsDelivrPath, purgeUrlFor, run, runAndCheck,
    setSkipPrompts, skipPrompts, stop, success, warn,
} from './release-common.mjs';
import { parseTagList, semverSort } from './release-version-tags.mjs';


// =============================
// --- Initialization / Help ---
// =============================

const argv = process.argv.slice(2);

function printHelp() {
    log('===============================================================');
    log('release-and-tag-helper.mjs — release and tag helper');
    log('===============================================================');
    log('');
    log('Usage: node scripts/release-and-tag-helper.mjs [-h|--help] [-y|--yes] [--notes-file <path>]');
    log('');
    log('Description:');
    log('  Every choice is asked before any change (unless --yes), then the release runs:');
    log('    1) checks git state: no merge/rebase, not detached, branch not behind its upstream');
    log('    2) chooses the tag: the package.json version, a bump when that tag exists, or resuming a release whose tag is on HEAD');
    log('    3) dirty working tree: asks to stage all of it into the release commit (No stops the script)');
    log('    4) checks loader versions (offers to bump the bridge @version and the patcher loaderVersion when the file changed)');
    log('    5) builds the release with esbuild, stages it with package.json, package-lock.json and the strategy manifest, commits');
    log('    6) creates an annotated v<version> tag');
    log('    7) prompts to push branch and tag to origin');
    log('    8) prompts to create the GitHub release with the gh CLI (title: the tag; text: the tag message without its');
    log('       first line; marked Latest, unless the Latest release is a loader-v* one), unless it exists');
    log('    9) prompts to purge jsDelivr (the mod, plus loader files changed since the previous release), waits 10s, purges');
    log('');
    log('Flags:');
    log('  -h, --help           Show this help and exit');
    log('  -y, --yes            Answer yes to every question (a bump included); stops on a dirty working tree instead of staging it');
    log('  --notes-file <path>  Release notes (Markdown) for the tag message: "Release v<version>", an empty line,');
    log('                       then the file as is (# headings kept); replaces the one-line suffix prompt.');
    log('                       A relative path is read from the folder the command was run from.');
    log('');
    log('Examples:');
    log('  node scripts/release-and-tag-helper.mjs          # run release workflow with interactive confirmation');
    log('  node scripts/release-and-tag-helper.mjs --yes    # run full workflow non-interactively (auto yes)');
    log('  npm run release-and-tag-helper -- --notes-file changelog.md   # tag message carries the changelog');
    log('  node scripts/release-and-tag-helper.mjs --help   # show this help and exit');
    log('');
    log('Notes:');
    log('  - When the tag already exists: [r]esume (tag on HEAD and the same on origin: push, GitHub release and purge only,');
    log('    e.g. after a failed push, release or purge), [d]elete (local-only tag: create it again on this release), or [b]ump to the next free version.');
    log('  - The last question before the commit lists the staged files; answering No leaves the build in the working tree.');
    log('  - In detached HEAD mode, the script aborts and asks you to checkout a branch.');
    log('  - The GitHub release needs the gh CLI, logged in (gh auth login). Without it, the step only warns.');
    log('===============================================================');
}

// Early exit if help argument is passed
if (argv.includes('-h') || argv.includes('--help')) {
    printHelp();
    process.exit(0);
}

const opts = { yes: false, notesFile: null };
for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '-y' || arg === '--yes') {
        opts.yes = true;
        continue;
    }
    if (arg === '--notes-file' || arg.startsWith('--notes-file=')) {
        opts.notesFile = arg === '--notes-file' ? argv[++i] : arg.slice('--notes-file='.length);
        if (!opts.notesFile) fatal('--notes-file needs a path.');
        continue;
    }
    if (arg.startsWith('-')) fatal(`Unknown flag ${arg} (see --help)`);
    fatal('Positional arguments are not accepted.');
}
setSkipPrompts(opts.yes);

log('release-and-tag-helper.mjs (--help for the steps and flags)');

const root = process.cwd();
const pkgPath = join(root, 'package.json');
const esbuildScript = join(root, 'esbuild.config.js');
const releaseFilePath = join(root, 'release', 'mod', 'hypersynergism_release.js');
if (!existsSync(releaseFilePath)) fatal('Release file missing: ' + releaseFilePath);
const releaseFileRel = relative(root, releaseFilePath).replace(/\\/g, '/');
// Files the release build writes (esbuild.config.js regenerates the strategy manifest), staged for the release commit
const buildOutputs = [releaseFileRel, 'package.json', 'package-lock.json', 'src/mod/resource/json/strategies/manifest.json'];
// Files served to players from @master through jsDelivr: the mod (rebuilt by every release, always
// purged), and the web loader chain (bridge userscript -> hypersynergism.user.js -> patcher.js),
// purged only when changed since the previous release.
const purgeFiles = [
    { file: releaseFileRel, always: true },
    { file: 'synergism_modloader/lib/patcher.js' },
    { file: 'src/loader/hypersynergism.user.js' },
    { file: 'src/loader/tampermonkey-bridge.user.js' },
];
const originRepo = getOriginRepo();
const purgePathFor = (file) => `/gh/${originRepo}@master/${file}`;

// Read the notes now, so a wrong path or an empty file stops the script before any change
let releaseNotes = null;
if (opts.notesFile) {
    // npm run starts scripts in the repo root; INIT_CWD is the folder the command was typed in
    const notesPath = resolve(process.env.INIT_CWD || root, opts.notesFile);
    if (!existsSync(notesPath)) fatal(`Notes file not found: ${notesPath}`);
    // trim() also drops a BOM (U+FEFF counts as whitespace)
    releaseNotes = readFileSync(notesPath, 'utf8').replace(/\r\n/g, '\n').trim();
    if (!releaseNotes) fatal(`Notes file is empty: ${notesPath}`);
    info(`Release notes read from ${notesPath} (${releaseNotes.split('\n').length} lines).`);
}

logWait('Gathering data, please wait...');


// =============================
// -------- Git Helpers --------
// =============================

/** Validate basic git environment and abort on rebase/merge in progress. */
function checkGitBase() {
    runAndCheck('git', ['--version']);
    const gitDir = join(root, '.git');
    if (existsSync(join(gitDir, 'MERGE_HEAD')) || existsSync(join(gitDir, 'rebase-apply')) || existsSync(join(gitDir, 'rebase-merge'))) {
        fatal('A merge or rebase is in progress. Resolve it first.');
    }
}

/** Uncommitted changes, as `git status --porcelain` lines ("XY path": X the index, Y the working tree). */
function getWorkingTreeStatus() {
    const statusRes = run('git', ['status', '--porcelain']);
    if (statusRes.error || statusRes.status !== 0) fatal('git status failed', statusRes);
    // No trim(): the first line's leading space is its index column
    const lines = statusRes.stdout ? statusRes.stdout.toString().split(/\r?\n/).filter(Boolean) : [];
    return { isClean: lines.length === 0, lines };
}

/** The current branch's upstream and how far HEAD is ahead of and behind it; `name` is '' when there is none. */
function getUpstreamState() {
    const upstreamRes = run('git', ['rev-parse', '--abbrev-ref', '--symbolic-full-name', '@{u}']);
    if (upstreamRes.error || upstreamRes.status !== 0) return { name: '', ahead: 0, behind: 0 };
    const [behind, ahead] = runAndCheck('git', ['rev-list', '--left-right', '--count', '@{u}...HEAD']).stdout
        .trim().split(/\s+/).map(Number);
    return { name: String(upstreamRes.stdout).trim(), ahead: ahead || 0, behind: behind || 0 };
}

/** Check if the release artifact exists in a given Git ref. */
function refHasRelease(ref) {
    const res = run('git', ['cat-file', '-e', `${ref}:${releaseFileRel}`]);
    return res.status === 0 && !res.error;
}

/** Return true if a file is tracked in git index. */
function isTracked(filePath) {
    const r = run('git', ['ls-files', '--error-unmatch', filePath]);
    return !r.error && r.status === 0;
}

/**
 * The nearest mod release tag reachable from `ref` (e.g. "v2.14.4b"), or '' if none; `exclude` is a tag to skip.
 * Only "v<digit>..." tags: other tags (e.g. the launcher's loader-vX.Y.Z) are separate releases.
 */
function getPreviousReleaseTag(ref, exclude) {
    const excludeArgs = exclude ? ['--exclude', exclude] : [];
    const r = run('git', ['describe', '--tags', '--abbrev=0', '--match', 'v[0-9]*', ...excludeArgs, ref]);
    return r.status === 0 && !r.error ? String(r.stdout).trim() : '';
}

/** What a local tag points to (the tag object for an annotated tag), or '' if there is no such tag. */
function getLocalTagObject(tag) {
    const r = run('git', ['rev-parse', '--verify', '--quiet', `refs/tags/${tag}`]);
    return r.status === 0 && !r.error ? String(r.stdout).trim() : '';
}

/** The commit a local tag points to, or ''. */
function getTagCommit(tag) {
    const r = run('git', ['rev-parse', '--verify', '--quiet', `refs/tags/${tag}^{commit}`]);
    return r.status === 0 && !r.error ? String(r.stdout).trim() : '';
}

/**
 * What the tag points to on `origin`, or '' if it isn't there. `ls-remote` gives the tag object for an
 * annotated tag, so compare it with getLocalTagObject(), not with the tagged commit.
 */
function getRemoteTagObject(tag) {
    const r = run('git', ['ls-remote', '--tags', 'origin', `refs/tags/${tag}`]);
    if (r.error || r.status !== 0) fatal('ls-remote failed.', r);
    const line = String(r.stdout).split(/\r?\n/).find(l => l.trim().endsWith(`refs/tags/${tag}`));
    return line ? line.trim().split(/\s+/)[0] : '';
}


// =====================================
// --- Check pkg.version + Infos dump ---
// =====================================

/** Read and validate package.json version field. */
function readPackage() {
    if (!existsSync(pkgPath)) fatal('package.json not found');
    const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'));
    if (!pkg.version) fatal('package.json missing version');
    return pkg;
}

/** Collect all status metadata required for release and tagging decisions. */
function collectStatus() {
    checkGitBase();

    const branch = runAndCheck('git', ['rev-parse', '--abbrev-ref', 'HEAD']).stdout.trim();
    if (branch === 'HEAD') fatal('Detached HEAD detected. Please checkout a branch before running this script.');
    const head = runAndCheck('git', ['rev-parse', 'HEAD']).stdout.trim();

    // Fetch first: the upstream comparison and the tag lists need the remote's current state
    runAndCheck('git', ['fetch', '--tags', '--quiet']);

    const pkg = readPackage();
    const untracked = buildOutputs.filter(file => !isTracked(file));

    return {
        branch,
        head,
        headShort: head.substring(0, 7),
        upstream: getUpstreamState(),
        tree: getWorkingTreeStatus(),

        localTags: semverSort(parseTagList(runAndCheck('git', ['tag']).stdout)),
        remoteTags: semverSort(parseTagList(runAndCheck('git', ['ls-remote', '--tags', 'origin']).stdout)),

        // package metadata and target tag/version (changed by applyBump)
        pkg,
        pkgVersion: pkg.version,
        targetTag: `v${pkg.version}`,

        headHasLatestReleaseFile: refHasRelease('HEAD'),
        untracked,
    };
}

/** Print current git and release status to console. */
function printStatus(status) {
    info(`Branch: ${status.branch}`);
    info(`HEAD: ${status.headShort} - ${status.head}`);
    info(`package.json version: ${status.pkgVersion}`);

    if (!status.tree.isClean) {
        warn('Working tree is dirty, staged/unstaged changes exist:');
        status.tree.lines.forEach(l => warn(`  ${l}`));
    }
    info(`Working tree clean: ${status.tree.isClean ? 'yes' : 'no'}`);

    info(`Latest release is in HEAD: ${status.headHasLatestReleaseFile ? 'yes' : 'no'}`);
    info(`Local tags: ${status.localTags.length}, latest ${status.localTags[0] || '(none)'}`);
    info(`Remote tags: ${status.remoteTags.length}, latest ${status.remoteTags[0] || '(none)'}`);

    if (status.untracked.length > 0) warn(`Untracked files: ${status.untracked.join(', ')}`);
}

/** The branch must not be behind its upstream: the push would fail after the release commit and tag. */
function checkUpstream(status) {
    const { name, ahead, behind } = status.upstream;
    if (!name) {
        warn(`${status.branch} has no upstream: the push step will offer to set it.`);
        return;
    }
    if (behind > 0) fatal(`${status.branch} is ${behind} commit(s) behind ${name}: pull first.`);
    info(`${status.branch} is ${ahead} commit(s) ahead of ${name}.`);
}


// =============================
// --- Tag and Version Choice ---
// =============================

/**
 * The version after `version`: next pre-release number (2.14.4b-dev1 -> 2.14.4b-dev2), next letter
 * (2.14.4b -> 2.14.4c, after "z" the next patch) or next patch. null if the version can't be parsed.
 */
function nextVersion(version) {
    // Semver plus this project's optional letter suffix on the patch number: 2.14.4, 2.14.4b, 2.14.4b-dev1
    const semverMatch = version.match(/^(\d+)\.(\d+)\.(\d+)([a-z]?)(?:-([0-9A-Za-z-.]+))?$/);
    if (!semverMatch) return null;

    const major = Number(semverMatch[1]);
    const minor = Number(semverMatch[2]);
    const patch = Number(semverMatch[3]);
    const letter = semverMatch[4] || '';
    const pre = semverMatch[5] || '';
    const base = `${major}.${minor}.${patch}${letter}`;

    if (pre) {
        const preMatch = pre.match(/^([a-zA-Z-]+)(\d+)$/);
        return preMatch
            ? `${base}-${preMatch[1]}${Number(preMatch[2]) + 1}`
            : `${major}.${minor}.${patch + 1}`;
    }
    if (letter) {
        return letter === 'z'
            ? `${major}.${minor}.${patch + 1}`
            : `${major}.${minor}.${patch}${String.fromCharCode(letter.charCodeAt(0) + 1)}`;
    }
    return `${major}.${minor}.${patch + 1}`;
}

/** The first version after package.json's that has no tag, locally or on origin; null if it can't be parsed. */
function nextFreeVersion(status) {
    const taken = new Set([...status.localTags, ...status.remoteTags]);
    let version = nextVersion(status.pkgVersion);
    while (version && taken.has(version)) version = nextVersion(version);
    return version;
}

/**
 * Decide which tag this run creates, without changing anything yet. Returns { mode, newVersion }:
 * - mode 'new': create the tag; 'replace': create it again over a tag that exists only locally;
 *   'resume': the tag is already on HEAD (and the same on origin, if there), only push and purge.
 * - newVersion: the version package.json is bumped to before the build, or null.
 */
async function chooseTarget(status) {
    const tag = status.targetTag;
    const localObject = getLocalTagObject(tag);
    const remoteObject = getRemoteTagObject(tag);
    if (!localObject && !remoteObject) {
        info(`Target tag: ${tag}`);
        return { mode: 'new', newVersion: null };
    }

    const where = [localObject && 'locally', remoteObject && 'on origin'].filter(Boolean).join(' and ');
    warn(`The tag ${tag} already exists ${where}.`);

    const choices = [];
    if (localObject && getTagCommit(tag) === status.head && (!remoteObject || remoteObject === localObject)) {
        choices.push({ key: 'r', label: '[r]esume (push, GitHub release and purge with the existing tag)', mode: 'resume', newVersion: null });
    }
    if (localObject && !remoteObject) {
        choices.push({ key: 'd', label: `[d]elete the local tag and tag this release as ${tag}`, mode: 'replace', newVersion: null });
    }
    const newVersion = nextFreeVersion(status);
    if (newVersion) choices.push({ key: 'b', label: `[b]ump to v${newVersion}`, mode: 'new', newVersion });

    if (skipPrompts) {
        if (!newVersion) fatal(`Cannot bump ${status.pkgVersion}: expected a version like 2.10.0, 2.10.0b or 2.10.0b-dev3.`);
        info(`[auto] Bump to v${newVersion}`);
        return { mode: 'new', newVersion };
    }

    const answer = (await askForInput(`Choose: ${choices.map(c => c.label).join(', ')}, [a]bort:`)).toLowerCase();
    const choice = choices.find(c => answer.charAt(0) === c.key);
    if (!choice) stop('Aborted by user.');
    return { mode: choice.mode, newVersion: choice.newVersion };
}

/** Write the new version to package.json and package-lock.json, and update the status. */
function applyBump(status, newVersion) {
    status.pkg.version = newVersion;
    writeFileSync(pkgPath, JSON.stringify(status.pkg, null, 2) + '\n', 'utf8');

    const lockPath = join(root, 'package-lock.json');
    if (existsSync(lockPath)) {
        try {
            const lockRaw = readFileSync(lockPath, 'utf8');
            const lockJson = JSON.parse(lockRaw);
            lockJson.version = newVersion;
            writeFileSync(lockPath, JSON.stringify(lockJson, null, 2) + '\n', 'utf8');
            info(`package-lock.json version synchronized to ${newVersion}`);
        } catch (err) {
            warn(`Could not update package-lock.json version: ${err.message || err}`);
        }
    }

    status.pkgVersion = newVersion;
    status.targetTag = `v${newVersion}`;
    success(`Version bumped to ${newVersion}.`);
    info(`Target tag: ${status.targetTag}`);
}

/** Dirty working tree: all of it goes into the release commit, or the script stops. */
async function askStageAll(status) {
    if (status.tree.isClean) return false;
    if (skipPrompts) fatal('--yes does not stage a dirty working tree: commit or stash the changes listed above first.');
    if (!await askYesNo('The working tree has changes (listed above). Stage all of them into the release commit?')) {
        stop('Aborted by user: commit or stash the changes first.');
    }
    return true;
}

/** The one-line suffix of the tag message, '' for none. */
async function askTagMessageSuffix() {
    const answer = await askForInput('Optional tag message suffix (`y` or empty to skip):');
    return /^y?$/i.test(answer) ? '' : answer;
}


// ===============================
// --- Loader Version Checks -----
// ===============================

const bridgeFile = 'src/loader/tampermonkey-bridge.user.js';
const patcherFile = 'synergism_modloader/lib/patcher.js';
// Both: (before)(version)(after), as writeFileVersion() puts them back
const userscriptVersionRe = /^(\/\/\s*@version\s+)(\S+)()/m;
const patcherVersionRe = /(const loaderVersion\s*=\s*')([^']+)(')/;

/** Read a version from file content (current working tree, or `ref` when given). */
function readFileVersion(file, re, ref) {
    const content = ref
        ? (() => { const r = run('git', ['show', `${ref}:${file}`]); return r.status === 0 ? String(r.stdout) : ''; })()
        : (existsSync(join(root, file)) ? readFileSync(join(root, file), 'utf8') : '');
    return content.match(re)?.[2] ?? null;
}

/** "1.2" -> "1.3", "4.1.9" -> "4.1.10": increment the last numeric part. */
function bumpLastNumber(version) {
    return version.replace(/(\d+)(?!.*\d)/, (n) => String(Number(n) + 1));
}

/** Write `version` into `file` through `re` and stage the file for the release commit. */
function writeFileVersion(file, re, version) {
    const path = join(root, file);
    writeFileSync(path, readFileSync(path, 'utf8').replace(re, `$1${version}$3`), 'utf8');
    runAndCheck('git', ['add', file]);
}

/**
 * Before the release commit, compare the web loader files with the previous release, and offer to bump
 * the version of a changed file whose version is unchanged:
 * - the Tampermonkey bridge: players only receive an update if its @version increases;
 * - the patcher: its loaderVersion labels the console logs ([HS-LOADER vX]), telling which patcher a player runs.
 * (hypersynergism.user.js is downloaded fresh by the bridge on every load: its @version is never used.)
 */
async function checkLoaderVersions(status) {
    // Without the target tag: a local tag about to be replaced can sit on HEAD
    const previousTag = getPreviousReleaseTag('HEAD', status.targetTag);
    if (!previousTag) {
        info('No previous release tag found: skipping loader version checks.');
        return;
    }

    // Working tree vs previous release, so uncommitted changes going into this release count too
    const diff = run('git', ['diff', '--name-only', previousTag, '--', bridgeFile, patcherFile]);
    if (diff.status !== 0) {
        warn(`Could not compare loader files with ${previousTag}: skipping loader version checks.`);
        return;
    }
    const changed = new Set(String(diff.stdout).split(/\r?\n/).map(line => line.trim()).filter(Boolean));

    // 1) Bridge: a changed bridge needs a higher @version, or Tampermonkey never updates it
    if (changed.has(bridgeFile)) {
        const before = readFileVersion(bridgeFile, userscriptVersionRe, previousTag);
        const now = readFileVersion(bridgeFile, userscriptVersionRe);
        if (now && before === now) {
            const bumped = bumpLastNumber(now);
            warn(`${bridgeFile} changed since ${previousTag} but its @version is still ${now}: Tampermonkey won't update it for players.`);
            if (await askYesNo(`Bump the bridge @version from ${now} to ${bumped}?`)) {
                writeFileVersion(bridgeFile, userscriptVersionRe, bumped);
                success(`Bridge @version bumped to ${bumped} (staged for the release commit).`);
            } else {
                warn('Bridge @version not bumped: players with the bridge installed will keep the old one.');
            }
        }
    }

    // 2) Patcher: a changed patcher gets a new loaderVersion, so the console logs tell the two apart
    //    (last number only: a major bump is made by hand)
    if (changed.has(patcherFile)) {
        const before = readFileVersion(patcherFile, patcherVersionRe, previousTag);
        const now = readFileVersion(patcherFile, patcherVersionRe);
        if (now && before === now) {
            const bumped = bumpLastNumber(now);
            warn(`${patcherFile} changed since ${previousTag} but its loaderVersion is still ${now}.`);
            if (await askYesNo(`Bump the patcher loaderVersion from ${now} to ${bumped}?`)) {
                writeFileVersion(patcherFile, patcherVersionRe, bumped);
                success(`Patcher loaderVersion bumped to ${bumped} (staged for the release commit).`);
            } else {
                warn('Patcher loaderVersion not bumped: its console logs will show the same version as the previous release.');
            }
        }
    }
}


// ===============================
// --- Commit/Tag & Push Steps ---
// ===============================

/**
 * Build the release and commit it.
 *
 * Steps:
 *   1) Run `npm install --package-lock-only` (creates/updates package-lock.json).
 *   2) Run the release build (`node <esbuildScript> release`).
 *   3) Stage everything (`stageAll`, the dirty tree the user agreed to commit) or only the build outputs.
 *   4) Changes still unstaged after the build (made by the build itself): ask to stage them, or stop.
 *   5) Nothing staged: ask to tag the current commit. Otherwise confirm, then commit.
 */
async function commitFlow(status, stageAll) {
    runAndCheck('npm install --package-lock-only', [], { shell: true });
    runAndCheck('node', [esbuildScript, 'release'], { cwd: root });
    success('Release build complete.');

    if (stageAll) {
        runAndCheck('git', ['add', '-A']);
        success('Staged all changes.');
    } else {
        runAndCheck('git', ['add', '--', ...buildOutputs]);
    }

    // Read again after the build: a file it changed outside buildOutputs would be left out of the commit
    const leftovers = getWorkingTreeStatus().lines.filter(line => line[1] !== ' ');
    if (leftovers.length > 0) {
        warn('Changes not staged for the release commit:');
        leftovers.forEach(l => warn(`  ${l}`));
        if (skipPrompts) fatal('--yes does not stage changes made outside the release files.');
        if (!await askYesNo('Stage them too?')) {
            stop('Aborted by user: nothing committed. The build and version changes are still in the working tree.');
        }
        runAndCheck('git', ['add', '-A']);
    }

    const staged = runAndCheck('git', ['diff', '--cached', '--name-only']).stdout.trim();
    if (!staged) {
        const headInfo = runAndCheck('git', ['log', '-1', '--pretty=format:%h %s']).stdout.trim();
        if (!await askYesNo(`Nothing to commit. Tag the current commit (${headInfo}) as ${status.targetTag}?`)) {
            stop('Aborted by user.');
        }
        return;
    }

    success(`Files staged: ${staged.split(/\r?\n/).join(', ')}`);
    if (!await askYesNo(`Commit staged changes and tag ${status.targetTag}?`)) {
        stop('Aborted by user: nothing committed, the release files stay staged.');
    }
    runAndCheck('git', ['commit', '-m', `release: ${status.targetTag}`]);
    success('Commit created.');
}

/** Create the annotated tag on HEAD; `replace` overwrites a tag that exists only locally. */
function createTag(status, { replace, suffix }) {
    const tag = status.targetTag;
    // Title line, empty line, notes: the layout the loader release workflow reads too
    const message = releaseNotes
        ? `Release ${tag}\n\n${releaseNotes}`
        : (suffix ? `Release ${tag} - ${suffix}` : `Release ${tag}`);

    // The message goes through stdin; --cleanup=whitespace keeps the Markdown # headings (git's default strips them as comments)
    const forceArgs = replace ? ['-f'] : [];
    runAndCheck('git', ['tag', '-a', ...forceArgs, tag, '--cleanup=whitespace', '-F', '-'], { input: message });
    success(releaseNotes
        ? `Tag ${tag} created with the release notes (${releaseNotes.split('\n').length} lines).`
        : `Tag ${tag} created with message: ${message}`);
}

/**
 * pushFlow performs the post-tag push operations in a safe, interactive way.
 *
 * Steps:
 *   1) Verify the local tag exists.
 *   2) Ensure the tagged commit has the release artifact present (using `cat-file -e`).
 *   3) If origin already has the tag, it must be the same tag object as the local one.
 *   4) Ask user for push consent, and optionally configure upstream if missing.
 *   5) Push the current branch and the annotated tag to `origin`.
 *
 * @param {object} status
 *   - status.branch: current branch name.
 *   - status.targetTag: tag name to push (e.g. `v1.2.3`).
 */
async function pushFlow(status) {
    const localObject = getLocalTagObject(status.targetTag);
    if (!localObject) fatal(`Local tag ${status.targetTag} missing.`);

    // Ensure the release artifact actually exists in tagged commit.
    if (!refHasRelease(status.targetTag)) fatal(`Tagged commit does not contain ${releaseFileRel}.`);

    const remoteObject = getRemoteTagObject(status.targetTag);
    if (remoteObject) {
        if (remoteObject !== localObject) fatal(`The tag ${status.targetTag} on origin is not the local one: ${remoteObject} != ${localObject}`);
        info('The tag on origin is the local one.');
    }

    if (!(await askYesNo(`Push branch and tag ${status.targetTag} to origin?`))) {
        stop('Push skipped. You can do it manually with `git push --follow-tags`.');
    }

    const upstream = run('git', ['rev-parse', '--abbrev-ref', '--symbolic-full-name', '@{u}']);
    if (upstream.status !== 0) {
        if (!await askYesNo(`No upstream. Set upstream and push ${status.branch}?`)) stop('Aborted by user.');
        runAndCheck('git', ['push', '--set-upstream', 'origin', status.branch]);
        success('Set upstream and pushed branch.');
    } else {
        runAndCheck('git', ['push', 'origin', status.branch]);
        success('Pushed branch.');
    }

    runAndCheck('git', ['push', 'origin', `refs/tags/${status.targetTag}`]);
    success('Pushed tag.');
}

/**
 * The release notes from the tag message: everything after its title line ("Release v<version>"); for a
 * one-line message, its suffix ("Release v<version> - suffix"), or '' when there is none.
 */
function getTagNotes(tag) {
    const body = runAndCheck('git', ['tag', '--list', tag, '--format=%(contents:body)']).stdout.trim();
    if (body) return body;
    const subject = runAndCheck('git', ['tag', '--list', tag, '--format=%(contents:subject)']).stdout.trim();
    const title = `Release ${tag}`;
    return subject.startsWith(title) ? subject.slice(title.length).replace(/^\s*-\s*/, '').trim() : subject;
}

/**
 * Create the GitHub release of the pushed tag on `origin`'s repository with the gh CLI: titled with the tag,
 * the tag's notes as its text, marked Latest unless a loader release is. Skipped when the release already exists (e.g. on a resume).
 * Any failure only warns: the push is done, and the purge still has to run.
 */
async function createGithubRelease(status) {
    const tag = status.targetTag;
    if (!originRepo) {
        warn('Skipping the GitHub release: the `origin` remote is not a GitHub repository URL, so the pushed repository is unknown.');
        return;
    }
    const retryHint = `Run the helper again and choose [r]esume, or create it on https://github.com/${originRepo}/releases/new?tag=${encodeURIComponent(tag)}`;

    const view = run('gh', ['release', 'view', tag, '--repo', originRepo, '--json', 'url', '--jq', '.url']);
    if (view.error) {
        warn(`Skipping the GitHub release: gh CLI not found (${view.error.code || view.error.message}). Install it`
            + ` (winget install --id GitHub.cli) and log in (gh auth login). ${retryHint}`);
        return;
    }
    if (view.status === 0) {
        info(`The GitHub release ${tag} already exists: ${String(view.stdout).trim()}`);
        return;
    }
    if (!/release not found/i.test(String(view.stderr))) {
        warn(`Could not check the GitHub release ${tag}: ${String(view.stderr).trim()}`);
        warn(retryHint);
        return;
    }

    // A mod release never takes Latest from a loader release: on the repository that hosts the Steam loader,
    // the repository's page keeps showing the installer
    const latest = run('gh', ['release', 'view', '--repo', originRepo, '--json', 'tagName', '--jq', '.tagName']);
    if (latest.status !== 0 && !/release not found/i.test(String(latest.stderr))) {
        warn(`Could not read the Latest release of ${originRepo}: ${String(latest.stderr).trim()}`);
        warn(retryHint);
        return;
    }
    const latestTag = latest.status === 0 ? String(latest.stdout).trim() : '';
    const makeLatest = !latestTag.startsWith('loader-v');
    const latestLabel = makeLatest ? 'marked Latest' : `not marked Latest: ${latestTag}, a loader release, stays Latest`;

    if (!await askYesNo(`Create the GitHub release ${tag} on ${originRepo} (${latestLabel})?`)) {
        info(`GitHub release skipped. ${retryHint}`);
        return;
    }

    const notes = getTagNotes(tag);
    // Notes through stdin; --verify-tag: never let gh create a missing tag
    const notesArgs = notes ? ['--notes-file', '-'] : ['--notes', ''];
    const create = run('gh', ['release', 'create', tag, '--repo', originRepo, '--verify-tag', '--title', tag,
        makeLatest ? '--latest' : '--latest=false', ...notesArgs], { input: notes });
    if (create.error || create.status !== 0) {
        warn(`GitHub release not created: ${String(create.stderr || create.error?.message || '').trim()}`);
        warn(retryHint);
        return;
    }
    success(`GitHub release created: ${String(create.stdout).trim()}`);
}

/**
 * jsDelivr paths to purge: the mod file always, the loader files only if they changed between the
 * previous release tag and this one. Without a previous tag (first release), everything is purged.
 */
function getPurgePaths(status) {
    const previousTag = getPreviousReleaseTag(`${status.targetTag}^`);
    if (!previousTag) {
        warn('No previous release tag found: purging all jsDelivr files.');
        return purgeFiles.map(({ file }) => purgePathFor(file));
    }

    const optionalFiles = purgeFiles.filter(({ always }) => !always).map(({ file }) => file);
    const diff = run('git', ['diff', '--name-only', previousTag, status.targetTag, '--', ...optionalFiles]);
    if (diff.status !== 0) {
        warn(`Could not compare with ${previousTag}: purging all jsDelivr files.`);
        return purgeFiles.map(({ file }) => purgePathFor(file));
    }

    const changed = new Set(String(diff.stdout).split(/\r?\n/).map(line => line.trim()).filter(Boolean));
    const selected = purgeFiles.filter(({ file, always }) => always || changed.has(file));
    const skipped = purgeFiles.filter(entry => !selected.includes(entry));
    info(`Loader files compared with previous release ${previousTag}.`);
    if (skipped.length > 0) info(`Unchanged, not purged: ${skipped.map(({ file }) => file).join(', ')}`);
    return selected.map(({ file }) => purgePathFor(file));
}

async function purgeModCache(status) {
    if (status.branch !== 'master') {
        info('Skipping @master jsDelivr purge because this release was pushed from another branch.');
        return;
    }

    if (!originRepo) {
        warn('Skipping jsDelivr purge: the `origin` remote is not a GitHub repository URL, so the pushed repository is unknown.');
        return;
    }

    const purgePaths = getPurgePaths(status);
    const fileList = purgePaths.map(purgePath => purgePath.split('@master/')[1]).join(', ');
    if (!await askYesNo(`Purge the jsDelivr cache of ${originRepo}@master for ${purgePaths.length} file(s) (${fileList})?`)) {
        info('jsDelivr purge skipped. Purge manually later if needed:');
        purgePaths.forEach(purgePath => info(`  ${purgeUrlFor(purgePath)}`));
        return;
    }

    logWait('Waiting 10 seconds after the push before purging jsDelivr...');
    await new Promise(resolve => setTimeout(resolve, 10_000));

    // One request per file, each checked on its own
    for (const purgePath of purgePaths) await purgeJsDelivrPath(purgePath);
}

// ==========================
// ---------- Main ----------
// ==========================

(async () => {
    const status = collectStatus();
    printStatus(status);
    checkUpstream(status);

    // Every choice first, so the answers can't come after a build, a commit or a bump
    const target = await chooseTarget(status);
    if (target.mode === 'resume') {
        if (releaseNotes) warn('Resuming: the existing tag keeps its message, the notes file is not used.');
    } else {
        const stageAll = await askStageAll(status);
        const suffix = releaseNotes ? '' : await askTagMessageSuffix();

        if (target.newVersion) applyBump(status, target.newVersion);
        await checkLoaderVersions(status);
        await commitFlow(status, stageAll);
        createTag(status, { replace: target.mode === 'replace', suffix });
    }

    await pushFlow(status);
    await createGithubRelease(status);
    await purgeModCache(status);

    success(`Completed: ${status.targetTag}`);
})();
