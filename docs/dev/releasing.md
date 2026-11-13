# Releasing

Two repos (`AGENTS.md`, "Loading pipeline"): Dev (`maenhiir`, Shewchou) and Live (`Ferlieloi`). Remote names differ from
one clone to another: check `git remote -v`.

## What players download, and when it changes

- **The mod bundle is `release/mod/hypersynergism_release.js`, rebuilt only by `npm run release`** (or the release
  helper). Ordinary commits leave it as it was, so jsDelivr at a commit (`@<sha>`) serves the last release build of
  that time, not that commit's code: a test on a pinned commit can run an old build and look like a regression. Check
  `git log -- release/mod/hypersynergism_release.js` first; to test current code, use the dev server.
- **The checked-in `patcher.js` and userscripts are served from the branch** (`master`), so they reach players at the next
  page load once jsDelivr serves them: a commit to them is a release for browser players. jsDelivr caches a branch for
  up to 12 hours unless the file is purged.
- **`@latest` resolves to the highest plain semver tag**: letter and `-dev` suffixes (`v2.14.4b`) are skipped. A player
  whose bookmark says `@latest` only gets a Live release tagged `vX.Y.Z` with no suffix; `@master` bookmarks and the
  userscript get every Live release. Purge `@latest` too after such a release.
- jsDelivr's data API keeps reporting the old version for a while: check the served file instead (with and without
  `?t=`).

## Mod release: `npm run release-and-tag-helper`

- **Patch notes are required for every mod or loader release.** Follow [Writing patch notes](publishing-guide.md#writing-patch-notes) for the website, tag and GitHub release. Record verified version, date and source evidence in `docs/data/changelog.json`.
  - **On Live:** regenerate the whole site with `python scripts/tools/build-docs.py`, run `python scripts/tools/build-docs.py --check` and `python scripts/tests/test-changelog-validation.py`, and include the data and every regenerated page in the published changes. The whole site, not just the changelog page: it then describes the released build, and a PR of Dev's whole `master` carries no pages. A Live release is not finished until its changelog is visible on the website.
  - **On Dev:** check the entry with `python scripts/tools/build-docs.py --validate`, but never commit `docs/changelog.html`: like the site's other pages ("Porting a change to Live"), it is built from its checkout and the site is served from Live only. Dev entries appear on the website at Live's next regeneration.
- `package.json` holds the name of the **next** release; the helper only bumps when that tag already exists. Set a name
  by hand in `package.json` and `package-lock.json` (two version lines).
- `-- --notes-file <path>` puts the Markdown patch notes into the tag message.
- **Purges:** the bundle, and `synergism_modloader/lib/patcher.js`, `src/loader/hypersynergism.user.js` and
  `src/loader/tampermonkey-bridge.user.js` when they changed since the previous release tag (`getPurgePaths`). An
  accepted purge can still leave the old file served (once, v2.14.6a-dev1: the new bundle with the old `patcher.js`,
  cause unknown), so after the purges `purgeAndCheckServedFiles` (shared with `merge-live`) compares each served file
  with the commit, purges a stale one once more, and warns if it is still stale. Purge by hand:
  `curl https://purge.jsdelivr.net/gh/<owner>/synergism-hypersynergy@master/<path>`, then check the served file.
- **`loaderVersion` in `src/loader/shared/browser-loader.mjs`** (the `[HS-LOADER vX.Y]` console prefix): the helper offers a y/N bump (`--yes`
  bumps) only when `patcher.js` changed since the previous `v*` tag, last number + 1 (`bumpLastNumber`); a major bump is
  made by hand (Shewchou's choices, 2026-10-29). Port the source and version together, then run `npm run build:loaders`.
  The helper updates the source and regenerates the published files when it bumps the patcher or the Live bridge.
  The bridge version lives in `src/loader/shared/userscript-versions.json`.
- **The GitHub release** (`gh release create` on the origin repo): title = the tag, text = the tag message without its
  "Release vX" line, a normal release marked Latest (a `-devN` suffix only means "built after a Live release", not
  unstable), except that it never takes Latest from a `loader-v*` release (the helper reads the current Latest first).
  The loader's self-update lists `loader-v*` tags itself (`launcherUpdater.js`), so mod releases can't push loader
  releases out of its reach.
- **Testing the helper** without touching the real repo: a throwaway repo with a bare `origin.git` cloned to `work/`
  (a local-path origin makes `getOriginRepo()` return '' and skips the purge); in `work/`, a copy of the script and of
  `release-common.mjs` and `release-version-tags.mjs`, a `package.json`, a stub `esbuild.config.js` writing the bundle and the strategy manifest, a bridge userscript and a
  `patcher.js`. A node driver spawns the script, waits for each `❓` on stdout and writes the next answer; **end the
  child's stdin after the last answer**, or it prints "Completed" and hangs on readline. Each scenario is set up with
  plain git (a local-only tag, a tag on HEAD~1, a dirty file, a second clone that pushes so the branch is behind). For
  the GitHub release step: replace `getOriginRepo()` with `'test/repo'` in the script's copy, and put a fake `gh.exe` first in
  the child's PATH (Node won't run a `gh.cmd` without a shell); a small C# program compiled with
  `C:\Windows\Microsoft.NET\Framework64\v4.0.30319\csc.exe` that logs its args and stdin and answers by an env mode
  (missing / exists / viewerror / createfail). A real `gh release view` of a missing tag: stderr "release not found",
  exit 1. Not covered: the real build, the purge requests, the bridge `@version` bump.

## Merging a Live release into Dev

`npm run merge-live` (`-- --dry-run` to see its decisions and stop) applies the rules below to Live's highest stable tag:
it merges without committing, sets the version and the bundle, runs the checks, then asks before the commit, each push
and the purge of what changed on `@master`, and compares the served files with the commit. On a conflict elsewhere it
stops with the merge in progress, version and bundle done, and prints the steps left. It merges tags only: Live's
commits past its tag are listed, and arrive with the next release or a hand merge.

- **When:** before the next Dev release at the latest; earlier when the Live release has Ferlieloi's own code changes.
- **Version naming (Shewchou's rule):** once a Live release is merged, Dev builds are named from it. If Live has none
  or only part of the Dev work, the build number carries on (`2.14.4b-dev5` → `2.14.4c-dev6`). If Live merged all of
  it (the whole Dev `master` as a PR), it restarts at dev1 (`2.14.6-dev13` → `2.14.6a-dev1`).
- **Conflicts to expect:** the version in both package files, and the release bundle. Keep Dev's bundle: Dev players
  load it from Dev's `master`, and Live's has none of the Dev work; Live's fix reaches Dev players at the next dev
  release. When Dev didn't touch the package files or the bundle since the last merge, git takes Live's silently: set
  the version by hand anyway and `git checkout master -- release/mod/hypersynergism_release.js`. A file split or moved
  on Dev comes back as a modify/delete conflict: port Live's change into the new files, then `git rm` the old one.
  `docs/data/changelog.json` often conflicts at the top of `entries`, where both add theirs: keep both, newest first.
- **Except when Live has all the Dev code** (since the merge base, Dev changed nothing the bundle is built from: docs,
  `scripts/` apart from the two the build runs, a version bump, or the bundle itself, which is output and proves nothing;
  an unknown path counts as code, the harmless side to be wrong on): keep Live's bundle, so Dev
  players get the Live release without a Dev release, and push Live's stable tag to the Dev repo after `master`
  (`git push origin vX`), so their version check sees it. Otherwise stable tags are not pushed to the Dev repo: the tag
  would name a build Dev doesn't serve.
- **Restart or carry on can't be read from git** when Dev has code since the merge base: v2.14.6a restarted with 2 Dev
  commits, because Live had taken the whole `master` of its time. The script shows the commits and asks.
- **`git checkout --ours <file>` takes the whole file**, dropping what merged cleanly from Live's side (it once dropped
  a script line in `package.json`): compare with Live's `master` after resolving.
- Verify (`npx tsc --noEmit`, `npm test`, `npm run build`) before the merge commit.

## Merging Dev into Live

Use this procedure for a full Dev catch-up. For a single change, see [Porting a change to Live](#porting-a-change-to-live-pr-or-direct-release).

1. Check `git remote -v`, identify the Live and Dev repositories, and fetch the intended refs. Start a separate worktree from current Live `master`. Record that Live commit and the Dev commit being merged. Review the incoming commits and changes already on Live, including earlier ports.
2. Merge Dev into the worktree without committing. Resolve conflicts against the intended Live behavior. Restore `release/mod/hypersynergism_release.js` from the recorded Live commit even if Git merged it cleanly. Compare the staged bundle's Git blob ID with that commit's blob ID before committing. Any explicitly requested Live release builds the bundle in a separate release commit.
3. Preserve both channels' changelog entries and reconcile shared entries using [Writing patch notes](publishing-guide.md#writing-patch-notes). When publishing a release, regenerate the site on Live. Keep the website data as the source for the generated pages.
4. Review the patcher and published userscripts against the recorded Live commit. Changes to those files reach players from `master` even while the compiled mod bundle stays at its current release. Check compatibility with the bundle players will receive. Run `npx tsc --noEmit`, `npm test` and `npm run build`, plus the loader tests if the patcher changed.
5. Review the staged merge against Live, including the bundle check. After an authorized push, verify any changed branch-served files using the purge and verification procedure above. If this catch-up is part of an explicitly requested release, follow the release steps for the new bundle, tag, GitHub notes and website.

## Porting a change to Live (PR or direct release)

- **Port by hand in a separate worktree:** `git worktree add ../hs-pr-<topic> -b pr/<topic> <live remote>/master`,
  then `npm ci` (the main folder may hold other sessions' work). Dev is far ahead of Live and Live's files are older
  versions, so a cherry-pick conflicts: `git apply --3way` of the Dev diff, or `cherry-pick -n` then
  `git checkout HEAD -- <file>` and hand edits for the conflicting files (the Dev side of a conflict drags in Dev-only
  code). `patcher.js` usually needs a hand port (Live lacks later patches).
- **Check what the change relies on in Live's version**: a fix can need an earlier Dev commit ported first, as its own
  commit.
- **One topic per PR. No release bundle in a PR**: Ferlieloi builds his own release.
- **Website and wiki:** Dev commits edits to `docs/data/feature-catalogue.json` and `docs/data/guides/` with their feature, checked by
  `build-docs.py --validate`, but never the generated pages: the generator reads the version and settings of its
  checkout, so Dev's pages would show Dev's and conflict at every merge. In the worktree, port the topic's catalogue
  entries and guide changes, run `python scripts/tools/build-docs.py`, and commit the regenerated pages in the PR.
- Loader tests fail in a fresh worktree until `synergism_modloader` has its `node_modules`: not a regression.
- Check the target revision's Tools tab definitions before assuming a calculation is available there. Live includes
  the Tools tab; the node harness can also check GDS changes directly on a save.
- **Releasing on Live directly** (Shewchou can push to Live, after telling Ferlieloi): the release helper can't be used
  from the worktree (it pushes and checks tags on `origin` by name, and only purges from a branch named `master`). By
  hand: version in `package.json` + `package-lock.json`, `npm run release`, commit `release: vX` + annotated tag
  `Release vX`, push `HEAD:master` and the tag to the Live remote, purge `@master` (and `@latest` for a plain semver
  tag), check the served version. Then merge Live back into Dev (above).
- **A fix to Dev players without the unreleased Dev commits:** a worktree from the last Dev release tag, cherry-picks,
  a release commit tagged with the next dev number; Dev's `master` then gets a `release:` commit carrying that same
  bundle (its sources run ahead of the bundle until the next normal Dev release). Check that commits since the last
  release didn't touch `patcher.js` or the userscripts, which are served directly from `master`.

## Loader release (`synergism_modloader`)

No script: the release helper is for the mod only and ignores `loader-v` tags.
1. Commit the loader change, then a separate commit "release: Hypersynergism Loader X.Y.Z" bumping
   `synergism_modloader/package.json`, `package-lock.json` (the two top version lines only: a dependency further down
   has a similar version) and the example tag in `synergism_modloader/README.md`.
2. Push `master`.
3. `git tag -a loader-vX.Y.Z` with a message: a title line ("Hypersynergism Loader X.Y.Z"), an empty line, then the
   player-facing notes (Markdown rendered; bold lines as section titles; `--cleanup=whitespace` if a line starts with
   `#`). Push the tag to the **Live** remote: the workflow (`.github/workflows/loader-release.yml`) only runs on
   `Ferlieloi/synergism-hypersynergy`, the tag push alone triggers it, and Live's `master` doesn't move. It publishes
   the tag's message minus its first line, and refuses a tag without one.
4. The build takes about 2 minutes and the release is marked Latest; installed loaders update themselves from it.
   Watch it through the public API (no credentials needed, 60 requests per hour): `actions/runs?per_page=3`,
   `actions/runs/<id>/jobs`, `releases/tags/<tag>` (notes and the 3 assets), `releases/latest`.
- What a release carries: `git log loader-v<last>..HEAD -- synergism_modloader`, minus `patcher.js` (downloaded at
  each patch) and tests.
- The Windows installer is unsigned: not worth it for this project (cost, a real name as publisher; Shewchou,
  2026-10-10).
- `npm run dist` needs a Windows account that can create symlinks (electron-builder's code-signing tools archive holds
  some). Without it, it still leaves `dist/win-unpacked`, enough to check `resources/app.asar`. `dist/` is git-ignored.
