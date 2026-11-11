const fs = require('fs')
const path = require('path')

function createStartupDiagnostics({ app, dialog, shell }) {
    const logPath = path.join(app.getPath('userData'), 'loader-startup.log')
    let reporting = false

    function log(message) {
        try {
            fs.mkdirSync(path.dirname(logPath), { recursive: true })
            if (fs.existsSync(logPath) && fs.statSync(logPath).size > 256 * 1024) {
                fs.writeFileSync(logPath, '')
            }
            fs.appendFileSync(logPath, `${new Date().toISOString()} ${message}\n`, 'utf-8')
        } catch {
            // A diagnostic write failure must not prevent the loader opening.
        }
    }

    async function report(summary, error) {
        log(`${summary}: ${error?.stack || error?.message || String(error)}`)
        if (reporting) return
        reporting = true
        try {
            const { response } = await dialog.showMessageBox({
                type: 'error',
                title: 'Hypersynergism Loader could not start',
                message: summary,
                detail: `${error?.message || String(error)}\n\nStartup log (if writable): ${logPath}\n\nIf the window is blank, try launching once with --disable-gpu and include the log when reporting the problem.`,
                buttons: ['Close loader', 'Open log folder'],
                defaultId: 0,
                cancelId: 0
            })
            if (response === 1) await shell.openPath(path.dirname(logPath))
        } catch (dialogError) {
            log(`Could not display startup error: ${dialogError.message}`)
        } finally {
            app.quit()
        }
    }

    function watchWindow(window) {
        const contents = window.webContents
        contents.on('did-finish-load', () => log('Launcher page loaded'))
        contents.on('did-fail-load', (_event, code, description, _url, isMainFrame) => {
            if (isMainFrame && code !== -3) {
                void report('Could not load the launcher page', new Error(`${description} (${code})`))
            }
        })
        contents.on('preload-error', (_event, _preloadPath, error) => {
            void report('Could not initialize the launcher interface', error)
        })
        contents.on('render-process-gone', (_event, details) => {
            void report('The launcher renderer stopped', new Error(`${details.reason} (exit code ${details.exitCode})`))
        })
        contents.on('console-message', (_event, level, message, line, sourceId) => {
            if (level >= 2) log(`Renderer console: ${message} (${sourceId}:${line})`)
        })
        window.on('unresponsive', () => log('Launcher window is unresponsive'))
    }

    return { log, report, watchWindow, logPath }
}

module.exports = { createStartupDiagnostics }
