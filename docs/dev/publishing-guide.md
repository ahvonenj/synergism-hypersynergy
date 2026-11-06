# Publishing the player guide and wiki

The site uses GitHub Pages, matching the original project. No Sites/Cloudflare project, database, runtime dependencies or additional hosting account is needed. Existing `docs/features/`, `docs/game/` and `docs/dev/` remain developer documentation.

## Update the content

1. Review the relevant mod implementation and developer feature docs.
2. Edit `docs/data/feature-catalogue.json`. It is the shared source for the public site, inventory and wiki; do not edit generated pages by hand.
3. Step-by-step guides are hand-written Markdown in `docs/data/guides/<category id>.md`, starting with a `# Title` line. Each becomes `docs/wiki/<category id>-guide.html` and the wiki page `Guide-<category id>`, linked from its category, the wiki index and the sidebar. Use only headings (`#` to `####`), paragraphs, flat `-` and `1.` lists, `---` rules (blank line above), `**bold**`, `` `code` `` and `[links](url)`: the generator refuses anything else.
4. When re-auditing behavior, update `audited_commit` to the reviewed source commit: it only records the audit in `docs/FEATURE-AUDIT.md`, source links follow `master`. The package version, settings registry and calculation picker entries are read from the checkout.
5. Run:

   ```sh
   python scripts/tools/build-docs.py
   python scripts/tools/build-docs.py --check
   node --check docs/js/guide.js
   ```

The generator refuses duplicate feature IDs, unknown settings, unmapped settings and missing source references. It does not access the network or change the mod. `--validate` runs only those catalogue checks and writes nothing: on Dev, use it instead of generating (`docs/dev/releasing.md`, "Porting a change to Live").

## Preview

Open `docs/index.html` directly in a browser: the complete site, wiki, relative assets and feature search work without a server. Alternatively run `python -m http.server 8080 --directory docs` and visit `http://localhost:8080/`. No game save is needed.

Check these flows at desktop and narrow/mobile widths:

- Home → each colored navigation tab → Back to top. The tab matches the page and text is readable.
- Features → search `hidden tabs`: the saved-tab preference appears. Reset restores all entries.
- Features → Header customization: all header options appear, including cell alignment, half height, grid width, slot count, icon picking, row placement and keep-on-import.
- Search nonsense: a clear no-results message appears. Clear the search or reset to restore the guide.
- Open a feature permalink: its details open even if the shared search query would otherwise hide it.
- Wiki → a category → a related setting → its feature link: each destination exists.
- Disable JavaScript: normal navigation and every feature/detail remain available; only search requires JavaScript.
- Keyboard Tab reaches navigation, search, category choice and detail controls with visible focus. With reduced motion enabled, the version animation stops.

## Publish the website

After the documentation changes are reviewed and committed to `master`:

1. Open `https://github.com/Ferlieloi/synergism-hypersynergy/settings/pages`.
2. Under Build and deployment, choose **Deploy from a branch**.
3. Select branch **master**, folder **/docs**, and Save.
4. Wait for the Pages deployment to finish. The expected address is `https://ferlieloi.github.io/synergism-hypersynergy/`; verify GitHub's reported URL before calling it live.

The tracked `.nojekyll` makes this a plain static deployment. No custom Actions workflow is required; future commits to `/docs` update the site through Pages. If Pages serves the repository root instead, the root `index.html` redirects visitors to `docs/`; the main website address works with either source selection. The original author's website is not changed.

Set the repository's About → Website field to the new URL only after it is confirmed live.

## Publish the native GitHub Wiki

`docs/wiki-source/` contains the GitHub-compatible Markdown: Home, Mod-Features, one page per category, the step-by-step guides, Settings-Reference, Calculation-Reference, sidebar and footer. The site also has a complete browsable HTML wiki under `docs/wiki/`, so the guide does not depend on the native wiki being initialized.

GitHub Wikis have a separate Git repository, not a `/wiki` directory in the main repo. The GitHub connector has no Wiki-writing or Pages-settings operation; an authenticated GitHub CLI can configure Pages and Git can publish an initialized wiki. If the wiki has not been initialized, first open `https://github.com/Ferlieloi/synergism-hypersynergy/wiki` and create its first page in GitHub's UI. Then, in an authenticated Git environment:

```sh
git clone https://github.com/Ferlieloi/synergism-hypersynergy.wiki.git ../hypersynergism-wiki
python scripts/tools/prepare-wiki.py ../hypersynergism-wiki
```

The preparation helper verifies the wiki remote and copies only its managed Markdown pages. It never deletes unrelated pages, commits, stages or pushes. Inspect the diff in the wiki checkout and commit/push only after explicit approval, as required by `AGENTS.md`.

Future updates: regenerate from the catalogue, pull the wiki checkout, run the helper again, review and publish its diff. Do not maintain a second independent feature list in the wiki.

## Scope and verification

This work changes documentation and its build helper only; it does not alter game features, loader behavior or release bundles. See `docs/FEATURE-AUDIT.md` for source scope and `docs/FEATURES.md` for the full inventory.
