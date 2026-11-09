// Shared by the release helper (release-and-tag-helper.mjs) and the Live merge (merge-live-release.mjs):
// console output, running commands, questions, the origin repository, jsDelivr purges.
import { spawnSync } from 'child_process';
import { createHash } from 'crypto';

/** Log Helpers */
export function log(msg) { console.log(msg); }
export function logWait(msg) { console.log(`⏳\t${msg}`); }
export function success(msg) { console.log(`✅\t${msg}`); }
export function info(msg) { console.log(`ℹ️\t${msg}`); }
export function warn(msg) { console.log(`⚠️\t${msg}`); }
export function fatal(msg, result) {
    console.error(`❌\tERROR: ${msg}`);
    if (result) {
        if (result.stdout) console.error(String(result.stdout));
        if (result.stderr) console.error(String(result.stderr));
        if (result.error) console.error(result.error.message || result.error);
        if (typeof result.status !== 'undefined') console.error('Exit code:', result.status);
        if (result.signal) console.error('Signal:', result.signal);
        if (result.error && result.error.code) console.error('Code:', result.error.code);
    }
    process.exit(1);
}
/** Stop without an error: the user said no, nothing more is done. */
export function stop(msg) {
    info(msg);
    process.exit(0);
}

/** Format a command + args for logging. */
function formatCommand(cmd, args) {
    const parts = Array.isArray(args) ? args : [args];
    return `${cmd} ${parts.map(a => `'${String(a).replace(/'/g, "\\'")}'`).join(' ')}`;
}

/** Run a command synchronously and return result. */
export function run(cmd, args, opts = {}) {
    return spawnSync(cmd, args, { stdio: 'pipe', ...opts });
}

/** Convenience wrapper for commands that must succeed. Uses `fatal()` on any failure. */
export function runAndCheck(cmd, args, opts = {}) {
    const r = run(cmd, args, opts);
    const out = r.stdout ? r.stdout.toString() : '';
    const err = r.stderr ? r.stderr.toString() : '';
    if (r.status !== 0) {
        fatal(`Command returned non-zero: ${formatCommand(cmd, args)}`, r);
    }
    return { stdout: out, stderr: err, status: r.status };
}

/** Answer yes to every question (--yes); an imported binding, so importers read the current value. */
export let skipPrompts = false;
export function setSkipPrompts(value) { skipPrompts = value; }

/** Ask user for y/n confirmation. */
export function askYesNo(question) {
    if (skipPrompts) {
        info(`[auto] ${question} -> yes`);
        return Promise.resolve(true);
    }
    return new Promise(async resolve => {
        const readline = await import('readline');
        const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
        rl.question(`❓ ${question} (y/N) `, ans => {
            rl.close();
            resolve(/^(y|yes)$/i.test((ans || '').trim()));
        });
    });
}

/** Ask user for free-form text input. */
export function askForInput(question) {
    if (skipPrompts) {
        info(`[auto] ${question} -> (default)`);
        return Promise.resolve('');
    }
    return new Promise(async resolve => {
        const readline = await import('readline');
        const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
        rl.question(`❓ ${question} `, ans => {
            rl.close();
            resolve((ans || '').trim());
        });
    });
}

/**
 * The GitHub repository releases are pushed to (from the `origin` remote), e.g. "maenhiir/synergism-hypersynergy"
 * for the dev fork, or '' if it can't be identified. No fallback: the GitHub release and the purge are for the
 * repository just pushed to, the only one with the new tag and files.
 */
export function getOriginRepo() {
    const r = run('git', ['remote', 'get-url', 'origin']);
    const url = r.status === 0 && !r.error ? String(r.stdout).trim() : '';
    // https://github.com/OWNER/REPO(.git) or git@github.com:OWNER/REPO(.git)
    const match = url.match(/github\.com[/:]([^/]+)\/([^/]+?)(?:\.git)?\/?$/);
    return match ? `${match[1]}/${match[2]}` : '';
}

export const purgeUrlFor = (purgePath) => `https://purge.jsdelivr.net${purgePath}`;

/** One purge request, checked on its own. A failure only warns, with the URL to purge by hand. */
export async function purgeJsDelivrPath(purgePath) {
    const purgeUrl = purgeUrlFor(purgePath);
    try {
        const response = await fetch(purgeUrl, { signal: AbortSignal.timeout(15_000) });
        const body = await response.text();
        if (!response.ok) throw new Error(`HTTP ${response.status}: ${body.slice(0, 200)}`);
        const result = JSON.parse(body);
        if (!result.paths?.[purgePath] || result.paths[purgePath].throttled || result.status === 'error') {
            throw new Error(`Purge was throttled or rejected: ${body.slice(0, 200)}`);
        }
        success(`jsDelivr purge request accepted: ${purgeUrl}`);
    } catch (error) {
        warn(`jsDelivr purge could not be confirmed (${error.message || error}). Purge manually: ${purgeUrl}`);
    }
}

const sha256 = (data) => createHash('sha256').update(data).digest('hex');
const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/** Whether jsDelivr serves `file` from `@master` as committed on HEAD: 3 tries, 15 s apart. */
async function servesCommittedFile(repo, file) {
    const committed = run('git', ['show', `HEAD:${file}`], { maxBuffer: 256 * 1024 * 1024 });
    if (committed.status !== 0) {
        info(`Could not read ${file} from HEAD: not checked.`);
        return true;
    }
    const expected = sha256(committed.stdout);
    const url = `https://cdn.jsdelivr.net/gh/${repo}@master/${file}`;
    for (let attempt = 1; attempt <= 3; attempt++) {
        try {
            const response = await fetch(url, { signal: AbortSignal.timeout(30_000) });
            if (response.ok && sha256(Buffer.from(await response.arrayBuffer())) === expected) return true;
        } catch (error) {
            info(`Could not read ${url}: ${error.message || error}`);
        }
        if (attempt < 3) await wait(15_000);
    }
    return false;
}

/**
 * Purges `files` on `repo@master`, then checks jsDelivr serves each as committed on HEAD. An accepted purge can
 * still leave the old file served (once: the new bundle with the old patcher.js), so a stale file is purged once
 * more and checked again; still stale, it warns with the URLs to check and purge by hand.
 */
export async function purgeAndCheckServedFiles(repo, files) {
    const purgePathOf = (file) => `/gh/${repo}@master/${file}`;
    for (const file of files) await purgeJsDelivrPath(purgePathOf(file));
    await wait(5_000);

    let stale = [];
    for (const file of files) {
        if (await servesCommittedFile(repo, file)) success(`Served file matches the commit: ${file}`);
        else stale.push(file);
    }
    if (stale.length === 0) return;

    info(`jsDelivr still serves an old ${stale.join(', ')}: purging again.`);
    for (const file of stale) await purgeJsDelivrPath(purgePathOf(file));
    await wait(5_000);
    for (const file of stale) {
        if (await servesCommittedFile(repo, file)) {
            success(`Served file matches the commit: ${file}`);
        } else {
            warn(`jsDelivr doesn't serve the committed ${file} yet. Check https://cdn.jsdelivr.net/gh/${repo}@master/${file}`
                + `, or purge it again: ${purgeUrlFor(purgePathOf(file))}`);
        }
    }
}
