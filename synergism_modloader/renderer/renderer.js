const els = {
  statusPill: document.getElementById('statusPill'),
  launcherUpdateStatus: document.getElementById('launcherUpdateStatus'),
  checkLauncherUpdateBtn: document.getElementById('checkLauncherUpdateBtn'),
  installLauncherUpdateBtn: document.getElementById('installLauncherUpdateBtn'),

  steamPathInput: document.getElementById('steamPathInput'),
  browseSteamBtn: document.getElementById('browseSteamBtn'),
  autodetectSteamBtn: document.getElementById('autodetectSteamBtn'),
  gameDirOutput: document.getElementById('gameDirOutput'),
  gameDirStatus: document.getElementById('gameDirStatus'),
  legacyCleanupStatus: document.getElementById('legacyCleanupStatus'),

  sevenZipInput: document.getElementById('sevenZipInput'),
  browse7zBtn: document.getElementById('browse7zBtn'),
  autodetect7zBtn: document.getElementById('autodetect7zBtn'),
  sevenZipStatus: document.getElementById('sevenZipStatus'),

  toStep2Btn: document.getElementById('toStep2Btn'),
  retryLegacyCleanupBtn: document.getElementById('retryLegacyCleanupBtn'),
  launchLastPlayedBtn: document.getElementById('launchLastPlayedBtn'),
  backTo1Btn: document.getElementById('backTo1Btn'),
  backTo2Btn: document.getElementById('backTo2Btn'),
  toStep3Btn: document.getElementById('toStep3Btn'),

  modRefSelect: document.getElementById('modRefSelect'),
  refreshRefsBtn: document.getElementById('refreshRefsBtn'),
  refsStatus: document.getElementById('refsStatus'),
  modUrlPreview: document.getElementById('modUrlPreview'),
  patcherUrlPreview: document.getElementById('patcherUrlPreview'),
  channelToggle: document.getElementById('channelToggle'),
  channelStatus: document.getElementById('channelStatus'),

  summaryGameDir: document.getElementById('summaryGameDir'),
  summaryChannel: document.getElementById('summaryChannel'),
  summaryModRef: document.getElementById('summaryModRef'),
  updateBanner: document.getElementById('updateBanner'),
  patcherBanner: document.getElementById('patcherBanner'),
  mismatchBanner: document.getElementById('mismatchBanner'),
  quickSwitchBtn: document.getElementById('quickSwitchBtn'),

  launchOnlyBtn: document.getElementById('launchOnlyBtn'),
  patchAndLaunchBtn: document.getElementById('patchAndLaunchBtn'),
  console: document.getElementById('console'),
  copyLogBtn: document.getElementById('copyLogBtn')
}

const EXE_NAME = 'Synergism-win-x64.exe'

let state = {
  steamPath: '',
  gameDir: '',
  sevenZipPath: '',
  channel: 'live',
  modRef: '',
  lastPatchedExe: '',
  lastPlayedChannel: '',
  lastPlayedModRef: '',
  lastPlayedNeedsPatch: false,
  refListCache: {},
  channels: []
}
let refsRequestId = 0
// While a patch runs, the main process refuses a launch or a build switch: their buttons stay disabled.
let patchRunning = false
let cleanupUiPromise = null

function renderLauncherUpdate(status) {
  const version = `Launcher v${status.currentVersion}`
  const available = status.availableVersion ? `v${status.availableVersion}` : 'the new version'
  let message

  switch (status.phase) {
    case 'checking':
      message = `${version} · Checking for updates…`
      break
    case 'downloading':
      message = `${version} · Downloading ${available} (${status.percent}%)…`
      break
    case 'ready':
      message = `${version} · ${available} is ready to install.`
      break
    case 'installing':
      message = `${version} · Restarting to install ${available}…`
      break
    case 'up-to-date':
      message = `${version} · Up to date.`
      break
    case 'no-release':
      message = `${version} · No launcher update has been published yet.`
      break
    case 'error':
      message = `${version} · Could not check for updates. Hover for details.`
      break
    case 'unavailable':
      message = `${version} · Updates work in the installed Windows app.`
      break
    default:
      message = `${version} · Updates are checked on startup.`
  }

  els.launcherUpdateStatus.textContent = message
  els.launcherUpdateStatus.title = status.error || ''
  els.checkLauncherUpdateBtn.disabled = ['checking', 'downloading', 'ready', 'installing', 'unavailable'].includes(status.phase)
  els.installLauncherUpdateBtn.classList.toggle('is-hidden', status.phase !== 'ready')
}

window.loader.onLauncherUpdate(renderLauncherUpdate)

els.checkLauncherUpdateBtn.addEventListener('click', () => {
  void window.loader.checkLauncherUpdate()
})

els.installLauncherUpdateBtn.addEventListener('click', async () => {
  els.installLauncherUpdateBtn.disabled = true
  const result = await window.loader.installLauncherUpdate()
  if (!result.ok) {
    els.launcherUpdateStatus.textContent = result.error
    els.installLauncherUpdateBtn.disabled = false
  }
})

// ─── Step navigation ─────────────────────────────────────────────────────
const TAB_NAMES = ['locate', 'build', 'patch']

function goToStep(n) {
  // Show/hide step panels
  document.querySelectorAll('.step').forEach(el => {
    el.classList.toggle('is-active', Number(el.dataset.step) === n)
  })

  // Tab active state
  document.querySelectorAll('#tabs button').forEach(btn => {
    const idx = TAB_NAMES.indexOf(btn.dataset.tab) + 1
    btn.classList.toggle('tab-active', idx === n)
  })

  // Mini step indicator nodes
  for (let i = 1; i <= 3; i++) {
    const node = document.getElementById(`node${i}`)
    if (!node) continue
    node.classList.toggle('current', i === n)
    node.classList.toggle('done', i < n)
  }

  // Fill lines
  const fill1 = document.getElementById('fill1')
  const fill2 = document.getElementById('fill2')
  if (fill1) fill1.style.width = n > 1 ? '100%' : '0%'
  if (fill2) fill2.style.width = n > 2 ? '100%' : '0%'

  updateSummary()
}

// Allow clicking tabs to navigate back (not forward to unvisited steps)
document.querySelectorAll('#tabs button').forEach(btn => {
  btn.addEventListener('click', async () => {
    const target = TAB_NAMES.indexOf(btn.dataset.tab) + 1
    if (target === 3) {
      await window.loader.saveConfig({ channel: state.channel, modRef: state.modRef })
      updateSummary()
      await refreshUpdateBanner()
    }
    goToStep(target)
  })
})

els.toStep2Btn.addEventListener('click', async () => {
  await window.loader.saveConfig({
    steamPath: state.steamPath,
    gameDir: state.gameDir,
    sevenZipPath: state.sevenZipPath
  })
  void cleanupLegacyFolders()
  goToStep(2)
})
els.backTo1Btn.addEventListener('click', () => goToStep(1))
els.toStep3Btn.addEventListener('click', async () => {
  await window.loader.saveConfig({ channel: state.channel, modRef: state.modRef })
  updateSummary()
  await refreshUpdateBanner()
  goToStep(3)
})
els.backTo2Btn.addEventListener('click', () => goToStep(2))

// ─── Status pill ─────────────────────────────────────────────────────────
function setPill(text, kind) {
  els.statusPill.textContent = text
  els.statusPill.className = `pill pill-${kind}`
}

// ─── Step 1: Steam + 7-Zip detection ────────────────────────────────────
async function refreshGameDirFromSteamPath() {
  if (!state.steamPath) return
  const { gameDir } = await window.loader.locateGame(state.steamPath)
  state.gameDir = gameDir || ''
  els.gameDirOutput.value = gameDir || ''
  if (gameDir) {
    els.gameDirStatus.textContent = 'Found Synergism in this Steam library.'
    els.gameDirStatus.className = 'status-line ok'
  } else {
    els.gameDirStatus.textContent = "Couldn't find Synergism under this Steam install — check the path or that the game is installed."
    els.gameDirStatus.className = 'status-line error'
  }
  updateContinueButton()
}

els.steamPathInput.addEventListener('change', () => {
  state.steamPath = els.steamPathInput.value.trim()
  refreshGameDirFromSteamPath()
})

els.browseSteamBtn.addEventListener('click', async () => {
  const picked = await window.loader.selectSteamFolder()
  if (picked) {
    state.steamPath = picked
    els.steamPathInput.value = picked
    refreshGameDirFromSteamPath()
  }
})

els.autodetectSteamBtn.addEventListener('click', async () => {
  els.gameDirStatus.textContent = 'Searching…'
  els.gameDirStatus.className = 'status-line'
  const { steamPath, gameDir } = await window.loader.autodetectSteam()
  if (steamPath) {
    state.steamPath = steamPath
    els.steamPathInput.value = steamPath
  }
  state.gameDir = gameDir || ''
  els.gameDirOutput.value = gameDir || ''
  if (gameDir) {
    els.gameDirStatus.textContent = 'Found Synergism automatically.'
    els.gameDirStatus.className = 'status-line ok'
  } else {
    els.gameDirStatus.textContent = steamPath
      ? "Found Steam, but couldn't find Synergism in any library — check it's installed."
      : "Couldn't find a Steam install automatically — set the folder manually."
    els.gameDirStatus.className = 'status-line error'
  }
  updateContinueButton()
})

els.sevenZipInput.addEventListener('change', () => {
  state.sevenZipPath = els.sevenZipInput.value.trim()
  updateContinueButton()
})

els.browse7zBtn.addEventListener('click', async () => {
  const picked = await window.loader.select7z()
  if (picked) {
    state.sevenZipPath = picked
    els.sevenZipInput.value = picked
    els.sevenZipStatus.textContent = ''
    updateContinueButton()
  }
})

els.autodetect7zBtn.addEventListener('click', async () => {
  const found = await window.loader.autodetect7z()
  if (found) {
    state.sevenZipPath = found
    els.sevenZipInput.value = found
    els.sevenZipStatus.textContent = 'Found 7-Zip automatically.'
    els.sevenZipStatus.className = 'status-line ok'
  } else {
    els.sevenZipStatus.textContent = 'Could not find 7-Zip — reinstall the loader, or browse to a 7z.exe.'
    els.sevenZipStatus.className = 'status-line error'
  }
  updateContinueButton()
})

function updateContinueButton() {
  els.toStep2Btn.disabled = !(state.gameDir && state.sevenZipPath)
}

function cleanupLegacyFolders() {
  if (cleanupUiPromise) return cleanupUiPromise
  cleanupUiPromise = runCleanupLegacyFolders().finally(() => { cleanupUiPromise = null })
  return cleanupUiPromise
}

async function runCleanupLegacyFolders() {
  els.retryLegacyCleanupBtn.disabled = true
  els.legacyCleanupStatus.textContent = 'Checking for old patch folders…'
  els.legacyCleanupStatus.className = 'status-line'
  let result
  try {
    result = await window.loader.cleanupLegacyWorkspaces()
  } catch (error) {
    result = { error: error.message }
  }
  if (result.error) {
    els.legacyCleanupStatus.textContent = `Old folder cleanup paused: ${result.error}`
    els.legacyCleanupStatus.className = 'status-line error'
    els.retryLegacyCleanupBtn.classList.remove('is-hidden')
  } else if (result.failed) {
    els.legacyCleanupStatus.textContent = `Removed ${result.removed} old patch folder(s); ${result.failed} could not be removed yet. Close Synergism or any old loader process, then retry.`
    els.legacyCleanupStatus.className = 'status-line error'
    els.retryLegacyCleanupBtn.classList.remove('is-hidden')
  } else if (result.removed) {
    els.legacyCleanupStatus.textContent = `Removed ${result.removed} old patch folder(s). Your current patch was kept.`
    els.legacyCleanupStatus.className = 'status-line ok'
    els.retryLegacyCleanupBtn.classList.add('is-hidden')
  } else {
    els.legacyCleanupStatus.textContent = ''
    els.retryLegacyCleanupBtn.classList.add('is-hidden')
  }
  els.retryLegacyCleanupBtn.disabled = false
}

els.retryLegacyCleanupBtn.addEventListener('click', () => { void cleanupLegacyFolders() })

function updateLastPlayedButton() {
  const available = Boolean(state.lastPatchedExe && state.lastPlayedChannel && state.lastPlayedModRef)
  const needsPatch = available && state.lastPlayedNeedsPatch
  els.launchLastPlayedBtn.disabled = !available || patchRunning
  els.launchLastPlayedBtn.textContent = available
    ? `${needsPatch ? 'Patch & launch' : 'Launch'} last played: ${state.lastPlayedModRef} (${state.lastPlayedChannel})`
    : 'Launch last played build'
  els.launchLastPlayedBtn.title = needsPatch
    ? 'A re-patch is needed first — the last screen says why.'
    : ''
}

// Whether "Launch last played" has to patch first: the game was updated, or that build's patcher
// isn't the one the game was patched with. The click waits for the check that is running.
let lastPlayedCheck = Promise.resolve(false)

function refreshLastPlayedCheck() {
  const { lastPlayedChannel: channel, lastPlayedModRef: modRef } = state
  const check = (state.lastPatchedExe && channel && modRef)
    ? (async () => {
      if ((await checkGame()).needsRepatch) return true
      return (await window.loader.checkPatcherChanged({ channel, modRef })).needsRepatch
    })().catch(() => false)
    : Promise.resolve(false)
  lastPlayedCheck = check
  void check.then(needsPatch => {
    if (check !== lastPlayedCheck) return
    state.lastPlayedNeedsPatch = needsPatch
    updateLastPlayedButton()
  })
}

document.querySelectorAll('a[data-external]').forEach(a => {
  a.addEventListener('click', (e) => {
    e.preventDefault()
    window.loader.openExternal(a.dataset.external)
  })
})

// ─── Step 2: channel + mod build selection ──────────────────────────────
function renderChannelToggle() {
  els.channelToggle.innerHTML = ''
  for (const ch of state.channels) {
    const btn = document.createElement('button')
    btn.type = 'button'
    btn.className = 'btn-channel'
    btn.dataset.channel = ch.id
    btn.textContent = ch.label
    btn.classList.toggle('is-active', ch.id === state.channel)
    btn.addEventListener('click', async () => {
      if (state.channel === ch.id) return
      state.channel = ch.id
      state.modRef = ch.defaultRef
      renderChannelToggle()
      showRememberedRefs()
      await loadModRefs()
    })
    els.channelToggle.appendChild(btn)
  }
  const active = state.channels.find(c => c.id === state.channel)
  els.channelStatus.textContent = active ? `${active.description} (${active.repo})` : ''
  els.channelStatus.className = 'status-line'
}

function showRememberedRefs() {
  const channel = state.channels.find(ch => ch.id === state.channel)
  const cached = state.refListCache[state.channel] || []
  renderRefOptions(cached, channel?.defaultRef || 'master')
  void updateUrlPreviews()
}

function renderRefOptions(refs, defaultRef) {
  els.modRefSelect.innerHTML = ''
  for (const ref of refs) {
    const opt = document.createElement('option')
    opt.value = ref.name
    const date = ref.date ? ` · ${new Date(ref.date).toLocaleDateString()}` : ''
    opt.textContent = `${ref.name} (${ref.type})${date}`
    els.modRefSelect.appendChild(opt)
  }

  let options = [...els.modRefSelect.options]
  if (state.modRef && !options.some(o => o.value === state.modRef)) {
    const saved = document.createElement('option')
    saved.value = state.modRef
    saved.textContent = `${state.modRef} (previously selected)`
    els.modRefSelect.appendChild(saved)
    options = [...els.modRefSelect.options]
  }
  if (state.modRef && options.some(o => o.value === state.modRef)) {
    els.modRefSelect.value = state.modRef
  } else if (options.some(o => o.value === defaultRef)) {
    state.modRef = defaultRef
    els.modRefSelect.value = defaultRef
  } else if (options.length) {
    state.modRef = options[0].value
  } else {
    state.modRef = defaultRef
    const fallback = document.createElement('option')
    fallback.value = defaultRef
    fallback.textContent = `${defaultRef} (default branch)`
    els.modRefSelect.appendChild(fallback)
  }
}

async function loadModRefs() {
  els.refsStatus.textContent = 'Loading branches and tags…'
  els.refsStatus.className = 'status-line'
  const requestedChannel = state.channel
  const requestId = ++refsRequestId
  const { refs, branchCount, tagCount, defaultRef, datesIncomplete, message, error } = await window.loader.getModRefs(requestedChannel)
  if (requestedChannel !== state.channel || requestId !== refsRequestId) return

  renderRefOptions(refs, defaultRef)
  if (!error) state.refListCache[requestedChannel] = refs

  if (message) {
    els.refsStatus.textContent = message
    els.refsStatus.className = 'status-line ok'
  } else if (error) {
    const saved = refs.length > 1 || state.lastPlayedChannel === state.channel
    els.refsStatus.textContent = `Couldn't reach GitHub (${error}) — showing ${saved ? 'saved builds' : 'the default branch'}.`
    els.refsStatus.className = 'status-line error'
  } else {
    els.refsStatus.textContent = `${branchCount} branch(es), ${tagCount} tag(s) · newest first${datesIncomplete ? ' (some dates unavailable)' : ''}.`
    els.refsStatus.className = 'status-line ok'
  }
  await updateUrlPreviews()
}

async function updateUrlPreviews() {
  els.modUrlPreview.value = await window.loader.resolveModUrl(state.channel, state.modRef)
  els.patcherUrlPreview.value = await window.loader.resolvePatcherUrl(state.channel, state.modRef)
}

els.modRefSelect.addEventListener('change', () => {
  state.modRef = els.modRefSelect.value
  updateUrlPreviews()
})

els.refreshRefsBtn.addEventListener('click', loadModRefs)

// ─── Step 3: summary, patch, launch ─────────────────────────────────────
function updateSummary() {
  els.summaryGameDir.textContent = state.gameDir || '—'
  const active = state.channels.find(c => c.id === state.channel)
  els.summaryChannel.textContent = active ? active.label : (state.channel || '—')
  els.summaryModRef.textContent = state.modRef || '—'
}

function appendConsoleLine(line, kind) {
  const div = document.createElement('div')
  if (kind) div.className = `line-${kind}`
  div.textContent = line
  els.console.appendChild(div)
  els.console.scrollTop = els.console.scrollHeight
}

let copyLogTimer = null
els.copyLogBtn.addEventListener('click', async () => {
  await window.loader.copyText(Array.from(els.console.children, line => line.textContent).join('\n'))
  els.copyLogBtn.textContent = 'Copied'
  clearTimeout(copyLogTimer)
  copyLogTimer = setTimeout(() => { els.copyLogBtn.textContent = 'Copy' }, 1500)
})

async function launchSelectedGame(exePath, modUrl, channel, modRef) {
  const result = await window.loader.launchGame(exePath, modUrl, channel, modRef)
  if (!result.ok) appendConsoleLine(`Launch failed: ${result.error}`, 'error')
  if (result.warning) appendConsoleLine(result.warning, 'error')
  if (result.ok && !result.warning) {
    state.lastPlayedChannel = channel
    state.lastPlayedModRef = modRef
    updateLastPlayedButton()
    refreshLastPlayedCheck()
  }
  return result
}

els.launchLastPlayedBtn.addEventListener('click', async () => {
  els.launchLastPlayedBtn.disabled = true
  const cfg = await window.loader.loadConfig()
  if (!cfg.lastPatchedExe || !cfg.lastPlayedChannel || !cfg.lastPlayedModRef) {
    updateLastPlayedButton()
    return
  }
  state.channel = cfg.lastPlayedChannel
  state.modRef = cfg.lastPlayedModRef
  renderChannelToggle()
  showRememberedRefs()
  goToStep(3)
  if (await lastPlayedCheck) {
    await patchAndLaunch()
    updateLastPlayedButton()
    return
  }
  appendConsoleLine(`Launching last played build "${cfg.lastPlayedModRef}"…`)
  const modUrl = await window.loader.resolveModUrl(cfg.lastPlayedChannel, cfg.lastPlayedModRef)
  const result = await launchSelectedGame(cfg.lastPatchedExe, modUrl, cfg.lastPlayedChannel, cfg.lastPlayedModRef)
  setPill(result.ok ? 'Launched' : 'Error', result.ok ? 'ok' : 'error')
  updateLastPlayedButton()
})

// A patcher warning is a patch step that could not be applied; lib/patchGame.js gives them this prefix.
const PATCH_WARNING_PREFIX = '[PATCH] WARNING:'

window.loader.onPatchLog((line) => {
  if (line.startsWith(PATCH_WARNING_PREFIX)) appendConsoleLine(line, 'warn')
  else appendConsoleLine(line, /error|fail/i.test(line) ? 'error' : null)
})

const PATCHER_BANNER_TEXT = {
  changed: "This build's patcher is not the one your game was patched with — re-patch to keep the mod working.",
  'no-hash': 'Your game was patched by an older loader, which did not record its patcher — re-patch once so the loader can tell when the patcher changes.',
  injector: 'This loader version changed what it adds to the game — re-patch to keep the mod working.'
}

const GAME_BANNER_TEXT = {
  updated: 'The game has updated since your last patch — re-patch to keep the mod working.',
  missing: 'The patched copy of the game is missing (the game was reinstalled or moved) — re-patch to create it again.',
  format: 'This loader version changed how it builds the patched game — re-patch to keep the mod working.'
}

// The game side of the re-patch check: the game was updated by Steam, the patched copy is gone,
// or it was built by a loader that patched another way.
async function checkGame() {
  if (!state.gameDir) return { needsRepatch: false }
  return window.loader.checkUpdateNeeded({ gameDir: state.gameDir, exeName: EXE_NAME })
}

// `game` is the game check's result; `patcher` is the patcher check's result, or null while it runs.
function renderRepatchState({ game, mismatch, patcher }) {
  const checking = patcher === null
  const gameUpdated = game.needsRepatch
  const patcherChanged = Boolean(patcher?.needsRepatch)
  const needsRepatch = gameUpdated || patcherChanged
  // Without a patched game there is no last patch to compare with: "Patch & launch" is the only way on.
  els.updateBanner.classList.toggle('is-hidden', !gameUpdated || !state.lastPatchedExe)
  if (gameUpdated) els.updateBanner.textContent = GAME_BANNER_TEXT[game.reason] || GAME_BANNER_TEXT.updated
  els.patcherBanner.classList.toggle('is-hidden', !patcherChanged)
  if (patcherChanged) els.patcherBanner.textContent = PATCHER_BANNER_TEXT[patcher.reason] || PATCHER_BANNER_TEXT.changed

  // The mismatch banner points at Quick switch, which can't be used while a re-patch is needed.
  els.mismatchBanner.classList.toggle('is-hidden', !mismatch || !state.lastPatchedExe || needsRepatch || checking)
  els.quickSwitchBtn.style.display = (mismatch && state.lastPatchedExe) ? '' : 'none'
  els.quickSwitchBtn.disabled = needsRepatch || checking || patchRunning

  els.launchOnlyBtn.disabled = needsRepatch || checking || patchRunning || !state.lastPatchedExe || mismatch
}

function notePatcherCheckFailed(error) {
  const line = `Could not check this build's patcher (${error || 'unknown error'}) — the game stays as last patched.`
  if (els.console.lastElementChild?.textContent !== line) appendConsoleLine(line)
}

let repatchCheckId = 0

async function refreshUpdateBanner() {
  if (!state.gameDir) return
  const checkId = ++repatchCheckId
  const game = await checkGame()

  // Check if the selected channel/ref differs from what was last patched
  const { mismatch } = await window.loader.checkVersionMismatch({
    channel: state.channel,
    modRef: state.modRef
  })
  if (checkId !== repatchCheckId) return

  // The game side may already ask for a patch. Otherwise the selected build's patcher is downloaded
  // and compared: the launch buttons wait for it, the caller doesn't.
  const patcherCheckNeeded = !game.needsRepatch && Boolean(state.lastPatchedExe)
  renderRepatchState({ game, mismatch, patcher: patcherCheckNeeded ? null : { needsRepatch: false } })
  if (!patcherCheckNeeded) return

  void window.loader.checkPatcherChanged({ channel: state.channel, modRef: state.modRef })
    .catch(error => ({ needsRepatch: false, reason: 'unknown', error: error.message }))
    .then(patcher => {
      if (checkId !== repatchCheckId) return
      renderRepatchState({ game, mismatch, patcher })
      if (patcher.reason === 'unknown') notePatcherCheckFailed(patcher.error)
    })
}

async function patchAndLaunch() {
  if (patchRunning) return
  patchRunning = true
  els.console.innerHTML = ''
  els.patchAndLaunchBtn.disabled = true
  els.launchOnlyBtn.disabled = true
  els.quickSwitchBtn.disabled = true
  updateLastPlayedButton()
  setPill('Patching…', 'busy')
  appendConsoleLine(`Patching with "${state.channel}" build "${state.modRef}"…`)

  try {
    const result = await window.loader.runPatch({
      gameDir: state.gameDir,
      sevenZipPath: state.sevenZipPath,
      channel: state.channel,
      modRef: state.modRef
    })

    if (result.ok) {
      state.lastPatchedExe = result.launchExePath
      setPill('Patched', 'ok')
      appendConsoleLine(`Launching ${result.launchExePath}`, 'ok')
      const modUrl = await window.loader.resolveModUrl(state.channel, state.modRef)
      const launch = await launchSelectedGame(result.launchExePath, modUrl, state.channel, state.modRef)
      // A launch that is remembered refreshes it itself.
      if (!launch.ok || launch.warning) refreshLastPlayedCheck()
      if (result.patchWarnings) {
        appendConsoleLine(`The patch finished with ${result.patchWarnings} warning(s), the "${PATCH_WARNING_PREFIX}" lines above: some mod features may be missing or slower. This usually follows a game update — look for a newer mod build.`, 'warn')
      }
    } else {
      setPill('Error', 'error')
      appendConsoleLine(`Patch failed: ${result.error}`, 'error')
    }
  } catch (error) {
    setPill('Error', 'error')
    appendConsoleLine(`Patch failed: ${error.message}`, 'error')
  } finally {
    patchRunning = false
    els.patchAndLaunchBtn.disabled = false
    updateLastPlayedButton()
    await refreshUpdateBanner()
  }
}

els.patchAndLaunchBtn.addEventListener('click', () => patchAndLaunch())

els.launchOnlyBtn.addEventListener('click', async () => {
  if (!state.lastPatchedExe) return
  const cfg = await window.loader.loadConfig()
  const channel = cfg.lastPatchedChannel || state.channel
  const modRef = cfg.lastPatchedModRef || state.modRef
  const modUrl = await window.loader.resolveModUrl(channel, modRef)
  await launchSelectedGame(state.lastPatchedExe, modUrl, channel, modRef)
})

els.quickSwitchBtn.addEventListener('click', async () => {
  els.quickSwitchBtn.disabled = true
  setPill('Switching…', 'busy')
  const modUrl = await window.loader.resolveModUrl(state.channel, state.modRef)
  const result = await window.loader.quickSwitchMod({ modUrl, channel: state.channel, modRef: state.modRef })
  if (result.ok) {
    setPill('Switched', 'ok')
    appendConsoleLine(`Mod URL switched to ${modUrl} — launching now.`, 'ok')
    await refreshUpdateBanner()
    await launchSelectedGame(state.lastPatchedExe, modUrl, state.channel, state.modRef)
  } else {
    setPill('Error', 'error')
    appendConsoleLine(`Quick switch failed: ${result.error}`, 'error')
  }
  els.quickSwitchBtn.disabled = false
})

  // ─── Startup: load persisted config and pre-fill everything ────────────
  ; (async function init() {
    renderLauncherUpdate(await window.loader.getLauncherUpdateStatus())
    const cfg = await window.loader.loadConfig()
    state.steamPath = cfg.steamPath || ''
    state.gameDir = cfg.gameDir || ''
    state.sevenZipPath = cfg.sevenZipPath || ''
    state.lastPatchedExe = cfg.lastPatchedExe || ''
    state.lastPlayedChannel = cfg.lastPlayedChannel || ''
    state.lastPlayedModRef = cfg.lastPlayedModRef || ''
    state.refListCache = cfg.refListCache || {}

    state.channels = await window.loader.getChannels()
    // The local channel is never "last played": its own flag selects it again, when it is offered.
    const localChannel = cfg.lastPlayedLocal ? state.channels.find(c => c.local) : null
    const preferredChannel = cfg.lastPlayedChannel || cfg.lastPatchedChannel || cfg.channel
    const preferredAvailable = Boolean(preferredChannel && state.channels.some(c => c.id === preferredChannel))
    if (localChannel) {
      state.channel = localChannel.id
      state.modRef = localChannel.defaultRef
    } else {
      state.channel = preferredAvailable ? preferredChannel : (state.channels[0]?.id || 'live')
      // A ref saved for a channel that isn't offered (e.g. the hidden local one) means nothing here.
      state.modRef = preferredAvailable ? (cfg.lastPlayedModRef || cfg.lastPatchedModRef || cfg.modRef || '') : ''
    }

    els.steamPathInput.value = state.steamPath
    els.gameDirOutput.value = state.gameDir
    els.sevenZipInput.value = state.sevenZipPath
    updateContinueButton()
    updateLastPlayedButton()

    renderChannelToggle()
    showRememberedRefs()
    updateSummary()
    goToStep(1)
    void cleanupLegacyFolders()
    void loadModRefs()
    refreshLastPlayedCheck()
    await refreshUpdateBanner()
  })().catch(error => {
    setPill('Startup failed', 'error')
    els.gameDirStatus.textContent = `Could not initialize the loader: ${error.message}`
    void window.loader.reportStartupError(error.stack || error.message)
  })
