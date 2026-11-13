# Log (`HSLogger`, `hs-core/hs-logger.ts`)

The mod panel's Log tab and the browser console. Static, not an `HSModule`: `HSModuleManager` attaches it to the panel right after `HSUI`'s init. How to write a log line (escaping, contexts and their colours, `debug`, `warnOnce`): `docs/dev/code.md`, "Logging".

- **Every line is recorded from the first one**, those logged before the Log tab exists included: they wait for it. The only filter is autosing's quiet mode: during a run without "Full log during Auto-Sing", warnings and errors only, no debug line, and a line at the start says so (`autosing.md`, "The log during a run"). Not log levels: no setting chooses one any more, and a level that started at "none" until the settings were read lost the startup lines, warnings and errors included.
- **Times and debug lines are always recorded; the "Timestamps" and "Debug logs" boxes next to Copy Log only show or hide them** (a class on the log). They are the settings `logTimestamp` and `showDebugLogs`, hidden from the Settings tab, off by default. A debug line goes to the console only while debug lines are shown.
- **Each kind has its own cap: 5000 lines, and 5000 debug lines** (`HSGlobal.HSLogger.logSize`, `debugLogSize`), so a debug-heavy run never pushes the other lines out. Lines not drawn yet are capped the same way.
- **Lines are drawn only while the panel is open on the Log tab, in batches at most every 250 ms**; opening it draws what waited. Each drawing lays out the whole log again, and autosing's full log writes about one line per frame: drawn one at a time, it cost +35% per singularity, growing with the log (measured in `autosing.md`).
- **A line is formatted (time, coloured context, colour tags) only when drawn or copied**: most debug lines of a long run are pushed out by the cap before the tab is opened.
- **A line identical to the one just before it (kind, context, text) raises that line's count, " (xN)"**, also once drawn; the time stays the first one's.
- **Scrolling:** new lines keep the log at the bottom if it was within 50 px of it; opening the tab scrolls to the new lines; otherwise the log stays where the player left it.
- **Copy Log copies every line kept, with its time**, hidden and not yet drawn included: the same text as a backup file's logs (`HSLogger.getLogLines()`, `backup.md`). Lines not drawn yet are turned into text in an inert document, so nothing in their HTML loads.
- **Fastest full-log autosing run:** Log tab closed and debug lines hidden, which keeps them out of the console.
