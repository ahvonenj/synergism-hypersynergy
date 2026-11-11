const fs = require('fs')
const path = require('path')
const { execFile } = require('child_process')

async function queryRegistry(key, value, { run = execFile, platform = process.platform } = {}) {
    if (platform !== 'win32') return null
    return new Promise(resolve => {
        run('reg.exe', ['query', key, '/v', value], {
            encoding: 'utf-8', windowsHide: true, timeout: 3000
        }, (error, stdout) => {
            if (error) return resolve(null)
            const match = stdout.match(new RegExp(`${value}\\s+REG_SZ\\s+(.+)`))
            resolve(match ? match[1].trim() : null)
        })
    })
}

// ─── Steam install path (Windows registry) ─────────────────────────────────
async function detectSteamPathWindows(options) {
    const queries = [
        ['HKCU\\Software\\Valve\\Steam', 'SteamPath'],
        ['HKLM\\SOFTWARE\\WOW6432Node\\Valve\\Steam', 'InstallPath'],
        ['HKLM\\SOFTWARE\\Valve\\Steam', 'InstallPath']
    ]

    for (const [key, value] of queries) {
        try {
            const p = await queryRegistry(key, value, options)
            if (p && fs.existsSync(p)) return p
        } catch {
            // key not present, try next
        }
    }

    // Common fallback locations
    const fallbacks = [
        'C:\\Program Files (x86)\\Steam',
        'C:\\Program Files\\Steam'
    ]
    return fallbacks.find(p => fs.existsSync(p)) || null
}

// ─── Library folders (handles games installed on other drives) ────────────
function parseLibraryFolders(steamPath) {
    const vdfPath = path.join(steamPath, 'steamapps', 'libraryfolders.vdf')
    const libraries = [steamPath]

    try {
        const raw = fs.readFileSync(vdfPath, 'utf-8')
        // Lines look like:   "path"		"D:\\SteamLibrary"
        const re = /"path"\s*"([^"]+)"/g
        let m
        while ((m = re.exec(raw)) !== null) {
            const p = m[1].replace(/\\\\/g, '\\')
            if (!libraries.includes(p)) libraries.push(p)
        }
    } catch {
        // No libraryfolders.vdf — just use the main Steam path
    }

    return libraries
}

// ─── Find the installed game folder across all libraries ──────────────────
function findGameDir(steamPath, appName) {
    if (!steamPath || !fs.existsSync(steamPath)) return null

    for (const lib of parseLibraryFolders(steamPath)) {
        const candidate = path.join(lib, 'steamapps', 'common', appName)
        if (fs.existsSync(candidate)) return candidate
    }
    return null
}

// ─── The loader's own 7-Zip ───────────────────────────────────────────────
// 7za.exe from the 7zip-bin package, copied next to the app by extraResources (package.json).
// It has no NSIS module, but finds the game's app archive inside the exe (lib/patchGame.js).
function getBundledSevenZipPath(app) {
    const exe = app?.isPackaged
        ? path.join(process.resourcesPath, '7zip-bin', '7za.exe')
        : path.join(__dirname, '..', 'node_modules', '7zip-bin', 'win', 'x64', '7za.exe')
    return fs.existsSync(exe) ? exe : null
}

// ─── Find an installed 7-Zip (when the loader's own is missing) ──────────
async function detectSevenZip(options) {
    try {
        const installPath = await queryRegistry('HKLM\\SOFTWARE\\7-Zip', 'Path', options)
        if (installPath) {
            const exe = path.join(installPath, '7z.exe')
            if (fs.existsSync(exe)) return exe
        }
    } catch {
        // not found in registry
    }

    const fallbacks = [
        'C:\\Program Files\\7-Zip\\7z.exe',
        'C:\\Program Files (x86)\\7-Zip\\7z.exe'
    ]
    return fallbacks.find(p => fs.existsSync(p)) || null
}

module.exports = { detectSteamPathWindows, findGameDir, parseLibraryFolders, detectSevenZip, getBundledSevenZipPath }
