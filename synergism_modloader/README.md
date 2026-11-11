# Hypersynergism Loader

A small Electron app that finds your Steam copy of Synergism, patches an
extracted copy of it to load the Hypersynergism mod, and launches the
patched copy. Your original Steam executable is never modified — the patched
copy lives in `__hs_work_current` next to it, which Steam ignores and which
"Verify integrity of game files" will not touch. Close the patched game before
patching again so the loader can replace that folder safely.

## Requirements (on the machine that *runs* the loader)

- Windows (this targets the Windows Steam build of the game).
- Synergism installed via Steam.

7-Zip is not needed: the loader ships its own `7za.exe` (from the `7zip-bin`
package, copied into `resources/7zip-bin/` by `extraResources`). A player can
still point it at an installed 7-Zip's `7z.exe` on the first screen.

## Project layout

```
main.js               Electron main process: window + all IPC handlers
preload.js            contextBridge API exposed to the UI (window.loader)
renderer/             UI: index.html, style.css, renderer.js
lib/
  config.js             Channels, defaults + persisted user config (steam path, mod ref, last patch)
  steamLocator.js       Steam path detection, library-folder parsing, 7-Zip detection
  patchGame.js          The extract → patch → repack pipeline, mod and patcher URLs
  patcher.js            Local fallback copy of the out.js bundle patcher
  patcherSource.js      Downloads a build's patcher.js, and tells when it is not the one last used
  injectorTemplate.js   Builds the preload.js injector snippet for a given mod URL
  workspaceManager.js   The __hs_work_* folders: staging, swap, cleanup, running-game check
  archiveWriter.js      Repacks app.asar and waits for the file to be closed
  gameLauncher.js       Starts the patched game and remembers the build played
  modRefs.js            Branch and tag list of a channel's repo (GitHub API)
  modRefCache.js        The last list seen, for when GitHub can't be reached
  launcherUpdater.js    Loader self-update from GitHub Releases
  startupDiagnostics.js Startup log and error dialogs
test/                 node --test suites (npm test)
```

## Developing

```
npm install
npm start
```

`npm install` pulls in `electron` and `electron-builder` as dev
dependencies — this needs network access to npmjs.org and (for `electron`
itself) Electron's binary CDN.

## Building the Windows installer

```
npm run dist
```

This uses `electron-builder` with the per-user NSIS Windows target, producing
`HypersynergismLoader-Setup-<version>.exe` under `dist/`. Players run the
installer once; it does not require administrator rights or a separate
Node/Electron or 7-Zip installation.

The installer lets players choose the launcher installation folder. This does
not change where the patched game is stored: it still lives next to the Steam
copy of Synergism. Automatic launcher updates continue to use silent installation.

The standard build applies the HS icon to the launcher and installer EXEs.
Release builds verify both embedded icons before publishing.

## Launcher updates

The installed Windows launcher checks GitHub Releases on startup and when the
player clicks **Check for updates**. It downloads a newer installer in the
background, then offers **Restart to update**. Game patching must finish before
the launcher restarts. The loader's version is separate from the mod version.

To publish a launcher update, increase `version` in this directory's
`package.json` and `package-lock.json`, then push a matching tag such as
`loader-v0.2.10`. The `Release Windows loader` workflow builds the installer,
uploads it with `latest.yml` and its block map. The launcher selects the
newest published `loader-v*` release with update metadata. The workflow marks
the new loader release as GitHub's Latest release.

Create the tag with `git tag -a`, with a message made of a title line, an
empty line, then the release notes: the workflow publishes everything after
the title line as the release's notes, and refuses a tag without a message.

Players using the earlier 0.1.0 installer need to install an updater-enabled
release once. Future launcher releases can then update through the app.

The mod build dropdown lists the newest builds first. Published GitHub
releases use their publication date; other tags and branches use their latest
commit date. The loader remembers the channel and build after the game starts
successfully and selects that build on the next launch. Merely browsing the
dropdown does not change the remembered build.

If GitHub's build list is unavailable, the loader shows the last successful
list and keeps the last played build selected. The **Launch last played** button
on the first screen starts the existing patched copy with that build without
waiting for GitHub's build list. The mod script is still
fetched from the selected build's CDN URL when the game starts, so this feature
does not provide fully offline play. When that build needs a re-patch (see
below), the button reads **Patch & launch last played** and patches first.

## How the patch pipeline works

1. Extracts the game's NSIS-packaged exe with 7-Zip into a work folder.
   The loader's `7za` has no NSIS module: it finds `app-64.7z`, which the
   installer stores uncompressed, inside the exe, and extracts the real
   Electron app straight away.
2. With a full 7-Zip (a player's own `7z.exe`), step 1 gives the installer's
   files instead, and this step extracts the embedded `app-64.7z`.
3. Unpacks `app.asar` with `@electron/asar`.
4. Runs `lib/patcher.js` (or a fresher version fetched from GitHub, if
   reachable) against `out.js` to expose a few internal game functions and
   hooks the mod needs (player state, stage info, max-challenges, an
   after-tick hook, auto-confirm support, corruption application).
5. Appends an injector snippet to `electron/preload.js` that fetches and
   runs the mod script you picked, at whatever branch or tag you selected.
6. Repacks `app.asar` and locates the launchable exe inside the extracted
   folder.

The loader builds each replacement in `__hs_work_staging`, waits for the
repacked archive to close, removes extraction inputs, and switches the game
into `__hs_work_current` only after patching succeeds. It retries cleanup of
old numbered folders left by earlier versions at startup and after patching.
Only folders named `__hs_work_<number>_<number>` are eligible; the current,
staging, and previous patch folders are kept. Startup cleanup checks for a
running patched game before removing anything. If Windows still holds a file
open, the loader reports how many folders remain and offers a retry button.
It tries again at the next startup. A failed patch leaves the current playable
copy in place.

The loader remembers the original exe's size/mtime at patch time, so it
can tell you when Synergism has been updated by Steam and a re-patch is a
good idea (the bundle patcher's anchor strings can drift between game
versions).

It also remembers which `patcher.js` that patch used. The patcher is only
applied by a patch, so when the selected build's patcher is not that one (a
mod release changed it, or you picked a build with another patcher), the
loader asks for a re-patch the same way: a banner on the last screen, with
**Launch only** and **Quick switch** disabled. A game patched by loader 0.2.8
or older has no recorded patcher and is asked to re-patch once. When the
patcher can't be downloaded for the check, nothing is asked.

Three more cases ask for a re-patch: the injector snippet written into the
game is not the one this loader version writes (a loader update changed it),
the patched copy is missing (the game was reinstalled, or moved to another
Steam library), and the patched copy was built by a loader version that built
it another way (a game patched by loader 0.2.9 or older is asked once: its
native modules were packed into `app.asar`, which broke logging in).

## Known limitations / things to be aware of

### A blank launcher window or a loader that will not close

The loader writes startup events, path detection progress, preload errors,
renderer failures, and GPU feature status to
`loader-startup.log` in Electron's user-data folder (normally
`%APPDATA%\Hypersynergism Loader`). Startup failures that it
can detect also show a Windows dialog with an option to open the log folder.
No configuration contents or credentials are written to this log.

Steam and 7-Zip registry queries run asynchronously, with a three-second limit
per query, so a stalled registry command cannot block the window or its Close
button. Detection falls back to common installation paths; players can still
choose paths manually if detection fails.

To help diagnose a white window, first end leftover **Hypersynergism Loader**
processes in Task Manager. Find the installed executable using the shortcut's
**Properties → Target**, and run it from PowerShell with Chromium logging:

```powershell
& 'C:\path\to\Hypersynergism Loader.exe' --enable-logging=file "--log-file=$env:TEMP\hypersynergism-chromium.log"
```

Repeat the same command with `--disable-gpu` added. If only that second run
works, the graphics acceleration path is implicated. Include both log files,
the loader installer filename/version, Windows version, and whether disabling
GPU rendering helped when reporting the issue. The earlier portable loader
working helps narrow the comparison, but does not by itself rule out a driver
or installation-specific issue.

### Patching limitations

- **Anchor-based patching is inherently fragile.** `lib/patcher.js`
  recognizes specific strings in the minified `out.js` bundle. A Synergism
  update can shift or rename those, in which case a given patch step logs
  a warning and is skipped rather than crashing the whole run — but that
  also means a mod feature can stop working until the patcher is updated.
  The loader's console shows these warnings in orange (`[PATCH] WARNING:`),
  and ends the patch with their count.
- **The bundled `7za` relies on `app-64.7z` being stored uncompressed in
  the game's installer** (electron-builder's NSIS installers do). If the
  game ever compresses it, `7za` finds nothing to extract, and the patch
  needs a full 7-Zip again.
- **The launchable-exe heuristic is a best guess** (first non-uninstaller
  `.exe` at the root of the extracted app folder). If a future build of
  the game ships multiple top-level exes, the loader will need a way to
  choose the right one.
