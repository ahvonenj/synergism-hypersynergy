#!/usr/bin/env node
// Merges Live's latest release into Dev's master. The rules: docs/dev/releasing.md, "Merging a Live release into Dev".
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import {
    askYesNo, fatal, getOriginRepo, info, log, logWait, purgeAndCheckServedFiles, purgeUrlFor, run, runAndCheck, stop, success, warn,
} from './release-common.mjs';
import {
    BUNDLE_FILE, PACKAGE_FILES, carriedVersion, devCodeFiles, highestStableTag, restartedVersion, withVersion, withoutVersion,
} from './merge-live-plan.mjs';
import { parseTagList } from './release-version-tags.mjs';

// The files players get from @master (AGENTS.md, "Loading pipeline")
const SERVED_FILES = [BUNDLE_FILE, 'synergism_modloader/lib/patcher.js', 'src/loader/hypersynergism.user.js', 'src/loader/tampermonkey-bridge.user.js'];
// Written by the build, so it can differ after a merge
const BUILD_OUTPUT = 'src/mod/resource/json/strategies/manifest.json';
const LARGE_OUTPUT = { maxBuffer: 256 * 1024 * 1024 };

function printHelp() {
    log('merge-live-release.mjs: merges the Live remote\'s highest stable tag into master');
    log('');
    log('Usage: npm run merge-live [-- --dry-run]');
    log('');
    log('  1) Checks: on master, no merge in progress, no uncommitted change, not behind origin.');
    log('  2) Compares Dev with the tag. Only docs, scripts and version bumps since their merge base: Live has all the Dev');
    log('     code, so Live\'s bundle, <tag>-dev1, and the tag goes to the Dev repo. Otherwise Dev\'s bundle, no tag, and you');
    log('     are shown the commits and asked whether the numbering restarts or carries on.');
    log('  3) Merges without committing, sets the version and the bundle.');
    log('  4) Stops on a conflict elsewhere, for you to finish by hand; else runs the type check, the tests, the build.');
    log('  5) Commit, push master, push the tag, purge what changed on @master: y/N each.');
    log('');
    log('  --dry-run  Stops after step 2 and changes nothing but fetched refs.');
}

const argv = process.argv.slice(2);
if (argv.includes('-h') || argv.includes('--help')) {
    printHelp();
    process.exit(0);
}
const unknown = argv.find(arg => arg !== '--dry-run');
if (unknown) fatal(`Unknown argument ${unknown} (see --help)`);
const dryRun = argv.includes('--dry-run');

const git = (...args) => runAndCheck('git', args).stdout.trim();
const gitOk = (...args) => run('git', args).status === 0;
const lines = (text) => text.split(/\r?\n/).filter(Boolean);
const showFile = (ref, file) => {
    const r = run('git', ['show', `${ref}:${file}`], LARGE_OUTPUT);
    return r.status === 0 ? r.stdout : null;
};
const inMergeHint = 'The merge is left in progress: fix it and finish by hand (docs/dev/releasing.md), or undo it with `git merge --abort`.';

/** The commands below rely on master being untouched since the last push, with nothing half done. */
function checkRepoState() {
    const branch = git('rev-parse', '--abbrev-ref', 'HEAD');
    if (branch !== 'master') fatal(`On ${branch}: this merge is for master.`);
    if (gitOk('rev-parse', '-q', '--verify', 'MERGE_HEAD')) fatal('A merge is in progress. Finish it, or `git merge --abort`.');
    if (['rebase-merge', 'rebase-apply'].some(dir => existsSync(git('rev-parse', '--git-path', dir)))) {
        fatal('A rebase is in progress. Finish it first.');
    }
    // Untracked files stay out of the commit (only explicit paths are staged); git refuses a merge that would overwrite one
    // No trim(): the first line's leading space is its index column
    const dirty = lines(runAndCheck('git', ['status', '--porcelain', '--untracked-files=no']).stdout);
    if (dirty.length > 0) fatal(`Uncommitted changes:\n${dirty.join('\n')}`);
}

/** The Live remote, found by its URL: names differ between clones. Dev's origin must be another repository. */
function findLiveRemote() {
    const isLive = (url) => /[/:]Ferlieloi\/synergism-hypersynergy(\.git)?\/?$/i.test(url);
    const remote = lines(git('remote')).find(name => isLive(git('remote', 'get-url', name)) && name !== 'origin');
    if (isLive(git('remote', 'get-url', 'origin'))) fatal('`origin` is the Live repository: this merge is for a Dev clone.');
    if (!remote) fatal('No remote points to Ferlieloi/synergism-hypersynergy.');
    return remote;
}

/** Everything needed to decide, without changing anything: the tag, and what Dev has that it hasn't. */
function readPlan(liveRemote) {
    logWait('Fetching...');
    runAndCheck('git', ['fetch', 'origin', '--tags', '--quiet']);
    const behind = Number(git('rev-list', '--count', 'HEAD..origin/master'));
    if (behind > 0) fatal(`master is ${behind} commit(s) behind origin/master: pull first.`);

    const tag = highestStableTag(git('ls-remote', '--tags', liveRemote));
    if (!tag) fatal(`No stable tag on ${liveRemote}.`);
    // By name: `--tags` would fail on a local tag that differs from Live's, for tags this merge doesn't need
    runAndCheck('git', ['fetch', '--quiet', '--no-tags', liveRemote, `+refs/heads/master:refs/remotes/${liveRemote}/master`, `refs/tags/${tag}:refs/tags/${tag}`]);

    const pastTag = lines(git('log', '--oneline', `${tag}..${liveRemote}/master`, '--not', 'HEAD'));
    const alreadyMerged = gitOk('merge-base', '--is-ancestor', tag, 'HEAD');
    if (pastTag.length > 0) {
        warn(`${liveRemote}/master has ${pastTag.length} commit(s) past ${tag} that this merge doesn't bring (the next release will, or merge them by hand):`);
        pastTag.slice(0, 10).forEach(line => warn(`  ${line}`));
    }
    if (alreadyMerged) stop(`Nothing to merge: master already has ${tag}.`);

    const base = git('merge-base', 'HEAD', tag);
    // --no-renames: a moved file counts by both its paths
    const changed = lines(git('diff', '--name-only', '--no-renames', base, 'HEAD'));
    const versionOnly = PACKAGE_FILES.filter(file => {
        const before = showFile(base, file);
        const after = showFile('HEAD', file);
        return before && after && withoutVersion(before) === withoutVersion(after);
    });
    const devCode = devCodeFiles(changed, versionOnly);
    const devVersion = JSON.parse(showFile('HEAD', 'package.json')).version;
    const liveVersion = tag.slice(1);
    const taken = new Set(parseTagList(git('tag', '--list', 'v*')));

    return {
        tag, base, devCode, changedCount: changed.length, devVersion,
        restarted: restartedVersion(liveVersion, taken),
        carried: carriedVersion(liveVersion, devVersion, taken),
        liveHasAll: devCode.length === 0,
    };
}

function printPlan(plan) {
    info(`Live release: ${plan.tag}; Dev is at ${plan.devVersion}.`);
    if (plan.liveHasAll) {
        info(`Live has all the Dev code (${plan.changedCount} file(s) changed since the merge base, none of them bundle source).`);
        info(`Bundle: Live's. Version: ${plan.restarted}. ${plan.tag} goes to the Dev repo after master.`);
        return;
    }
    info(`Dev has code Live's release doesn't, ${plan.devCode.length} file(s): ${plan.devCode.slice(0, 5).join(', ')}${plan.devCode.length > 5 ? ', ...' : ''}`);
    const versions = plan.carried === plan.restarted ? plan.carried : `${plan.carried} (carries on), or ${plan.restarted} if Live took the whole Dev master`;
    info(`Bundle: Dev's. No tag pushed. Version: ${versions}.`);
    log(git('log', '--oneline', '--no-merges', '--max-count=15', `${plan.base}..HEAD`, '--', ...plan.devCode));
}

/** Rewrites a conflicted package file from its three versions, all with the target version: only real conflicts remain. */
function resolvePackageConflict(file, version) {
    const dir = mkdtempSync(join(tmpdir(), 'hs-merge-live-'));
    try {
        const paths = [2, 1, 3].map(stage => {
            const r = run('git', ['show', `:${stage}:${file}`], LARGE_OUTPUT);
            if (r.status !== 0) fatal(`${file} has no stage ${stage}. ${inMergeHint}`);
            const path = join(dir, `stage${stage}`);
            writeFileSync(path, withVersion(String(r.stdout), version));
            return path;
        });
        const merged = run('git', ['merge-file', '-p', ...paths], LARGE_OUTPUT);
        if (merged.status !== 0) fatal(`${file} conflicts outside its version. ${inMergeHint}`);
        writeFileSync(file, merged.stdout);
    } finally {
        rmSync(dir, { recursive: true, force: true });
    }
}

/** Merges the tag without committing, then sets the version and the bundle. */
function mergeAndResolve(plan, version) {
    logWait(`Merging ${plan.tag}...`);
    const merge = run('git', ['merge', '--no-commit', '--no-ff', `refs/tags/${plan.tag}`]);
    const conflicted = lines(git('diff', '--name-only', '--diff-filter=U'));
    if (merge.status !== 0 && conflicted.length === 0) fatal('git merge failed.', merge);

    // Before stopping on other conflicts, so a merge finished by hand can't miss them
    for (const file of PACKAGE_FILES) {
        if (conflicted.includes(file)) resolvePackageConflict(file, version);
        else writeFileSync(file, withVersion(readFileSync(file, 'utf8'), version));
    }
    // Conflicting or not: when Dev didn't touch the bundle, git takes Live's silently
    const bundleRef = plan.liveHasAll ? `refs/tags/${plan.tag}` : 'HEAD';
    runAndCheck('git', ['checkout', bundleRef, '--', BUNDLE_FILE]);
    runAndCheck('git', ['add', '--', ...PACKAGE_FILES, BUNDLE_FILE]);

    if (git('rev-parse', `:${BUNDLE_FILE}`) !== git('rev-parse', `${bundleRef}:${BUNDLE_FILE}`)) {
        fatal(`The staged bundle is not the one from ${bundleRef}. ${inMergeHint}`);
    }
    success(`Merged; version ${version}, bundle from ${plan.liveHasAll ? plan.tag : 'Dev'}.`);

    const allowed = new Set([...PACKAGE_FILES, BUNDLE_FILE]);
    const others = conflicted.filter(file => !allowed.has(file));
    if (others.length > 0) {
        const pushes = `git push origin master${plan.liveHasAll ? `, then git push origin refs/tags/${plan.tag}` : ''}`;
        fatal(`Conflicts to resolve by hand:\n${others.join('\n')}\nThe version and the bundle are done. Then: git add those files; `
            + `npx tsc --noEmit, npm test, npm run build; git commit -m "${mergeSubject(plan)}"; ${pushes}; purge what changed on @master.\n`
            + 'Or undo it all with `git merge --abort`. Rules: docs/dev/releasing.md.');
    }
}

function mergeSubject(plan) {
    return `Merge Live ${plan.tag} (Ferlieloi) into master`;
}

function verify() {
    for (const command of ['npx tsc --noEmit', 'npm test', 'npm run build']) {
        logWait(command);
        // No stdin: a check must neither wait for input nor take the answers meant for the questions
        const r = run(command, [], { shell: true, stdio: ['ignore', 'inherit', 'inherit'] });
        if (r.status !== 0) fatal(`${command} failed. ${inMergeHint} If Live changed a dependency, run \`npm ci\` first.`);
    }
    const unstaged = lines(git('diff', '--name-only'));
    const unexpected = unstaged.filter(file => file !== BUILD_OUTPUT);
    if (unexpected.length > 0) fatal(`The checks changed these files:\n${unexpected.join('\n')}\n${inMergeHint}`);
    if (unstaged.length > 0) runAndCheck('git', ['add', '--', BUILD_OUTPUT]);
    success('Type check, tests and build passed.');
}

/** The purge paths of the served files this merge changed on master. */
function changedServedFiles(preMerge) {
    return lines(git('diff', '--name-only', preMerge, 'HEAD', '--', ...SERVED_FILES));
}

async function purge(preMerge) {
    const repo = getOriginRepo();
    if (!repo) {
        warn('Skipping jsDelivr purge: the `origin` remote is not a GitHub repository URL.');
        return;
    }
    const files = changedServedFiles(preMerge);
    if (files.length === 0) {
        info('No file served from @master changed: nothing to purge.');
        return;
    }
    if (!await askYesNo(`Purge the jsDelivr cache of ${repo}@master for ${files.join(', ')}?`)) {
        info('Purge skipped. By hand:');
        files.forEach(file => info(`  ${purgeUrlFor(`/gh/${repo}@master/${file}`)}`));
        return;
    }
    logWait('Waiting 10 seconds after the push before purging jsDelivr...');
    await new Promise(resolve => setTimeout(resolve, 10_000));
    await purgeAndCheckServedFiles(repo, files);
}

async function main() {
    checkRepoState();
    const plan = readPlan(findLiveRemote());
    printPlan(plan);
    if (dryRun) stop('Dry run: nothing changed.');

    let version = plan.restarted;
    if (!plan.liveHasAll && plan.restarted !== plan.carried) {
        const restart = await askYesNo(`Did Live's release take the whole Dev master of its time? Yes: ${plan.restarted}. No: ${plan.carried}.`);
        version = restart ? plan.restarted : plan.carried;
    }
    if (!await askYesNo(`Merge ${plan.tag} into master as ${version}, with ${plan.liveHasAll ? "Live's" : "Dev's"} bundle?`)) stop('Aborted by user.');

    const preMerge = git('rev-parse', 'HEAD');
    mergeAndResolve(plan, version);
    verify();

    const subject = mergeSubject(plan);
    if (!await askYesNo(`Commit "${subject}"?`)) stop('Nothing committed: the merge stays staged.');
    runAndCheck('git', ['commit', '-m', subject]);
    success('Merge committed.');

    if (!await askYesNo('Push master to origin?')) {
        stop(`Not pushed. By hand: git push origin master${plan.liveHasAll ? `, then git push origin refs/tags/${plan.tag}` : ''}; then purge what changed on @master.`);
    }
    runAndCheck('git', ['push', 'origin', 'master']);
    success('Pushed master.');

    // After master: Dev players' version check must not see a tag naming a build Dev doesn't serve yet
    if (plan.liveHasAll) {
        if (await askYesNo(`Push ${plan.tag} to origin?`)) {
            runAndCheck('git', ['push', 'origin', `refs/tags/${plan.tag}`]);
            success('Pushed the tag.');
        } else {
            warn(`Tag not pushed: Dev players' version check won't see ${plan.tag}. By hand: git push origin refs/tags/${plan.tag}`);
        }
    }

    await purge(preMerge);
    success(`Completed: ${plan.tag} merged as ${version}.`);
}

main();
