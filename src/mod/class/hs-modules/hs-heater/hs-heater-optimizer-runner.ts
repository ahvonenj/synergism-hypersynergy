import type {
  HeaterOptimizationResult,
  HeaterOptimizerInput,
  HeaterRedAmbUpgradeEffects,
} from '../../../types/data-types/hs-heater-types'
import type {
  HeaterOptimizerStage,
  HeaterWorkerRequest,
  HeaterWorkerResponse,
  SerializedHeaterOptimizerInput,
} from '../../../types/data-types/hs-heater-worker-types'
import { HEATER_BRANCH_DEFINITIONS } from './hs-heater-result-config'
import type { HeaterBranchId } from './hs-heater-result-config'
import { HEATER_ROW_LIMIT, HEATER_ROW_LIMIT_TEXT, HSHeaterOptimizer, takeHeaterOptimizerLogs } from './hs-heater-optimizer'
import type { HeaterOptimizerLog } from './hs-heater-optimizer'
import { HSLogger } from '../../hs-core/hs-logger'
import { escapeLogText } from './hs-heater-utils'
import HS_HEATER_WORKER_SOURCE from 'hs-heater-worker-source'

const LOG_CONTEXT = 'HSHeater'

// The worker counts a player can pick
export const HEATER_WORKER_COUNTS = [1, 2, 3] as const
export type HeaterWorkerCount = typeof HEATER_WORKER_COUNTS[number]

// A saved value that isn't a known count (an edited backup) counts as the default
export function heaterWorkerCount(value: unknown): HeaterWorkerCount {
  return value === 1 || value === 2 ? value : 3
}

// lanes: the group's lane with 2 and with 3 workers. With 1, all run one after the other.
type BranchGroup = { branches: readonly HeaterBranchId[]; lanes: { 2: 0 | 1; 3: 0 | 1 | 2 } }

const BRANCH_GROUPS: readonly BranchGroup[] = [
  // Groups run in disposable workers. Cube/SR reuse their Cube/Voucher and
  // Luck-Cube frontiers; Quarks/Obt/Off reuse their Luck, Rune and Voucher
  // inputs but keep separate objective-specific frontiers.
  // Purple reuses the Luck branch's luck and voucher tables.
  // Max Amb + Oct reuses the Oct branch's Octeract tables.
  // Each lane runs its groups one after the other. With 2 workers the two
  // largest (S260: ~0.8 GB peak each) share a lane, so they never run at once.
  // With 3 they do: docs/features/heater.md has the memory measured.
  { branches: ['hyperflux'], lanes: { 2: 0, 3: 0 } },
  { branches: ['cubes', 'sr'], lanes: { 2: 0, 3: 1 } },
  { branches: ['oct', 'ambOct'], lanes: { 2: 1, 3: 1 } },
  { branches: ['coinsC15'], lanes: { 2: 1, 3: 1 } },
  { branches: ['luck', 'purple'], lanes: { 2: 1, 3: 0 } },
  { branches: ['quarks', 'obtOff', 'obtAndOff'], lanes: { 2: 1, 3: 2 } },
]

const ALL_BRANCHES = BRANCH_GROUPS.flatMap(group => group.branches)
const RESULT_CACHE_LIMIT = 4
const resultCache = new Map<string, HeaterOptimizationResult>()

function serializeInput(input: HeaterOptimizerInput): SerializedHeaterOptimizerInput {
  return {
    ...input,
    runeSiExp: input.runeSiExp.toString(),
    runeIaExp: input.runeIaExp.toString(),
    runeIaBonusLevelsTotal: input.runeIaBonusLevelsTotal.toString(),
    runeIaBonusLevelsTalisman: input.runeIaBonusLevelsTalisman.toString(),
    baseTalismanPower: input.baseTalismanPower.toString(),
  }
}

function cacheResult(key: string, result: HeaterOptimizationResult): void {
  resultCache.delete(key)
  resultCache.set(key, result)
  while (resultCache.size > RESULT_CACHE_LIMIT) {
    const oldestKey = resultCache.keys().next().value as string | undefined
    if (oldestKey === undefined)
      break
    resultCache.delete(oldestKey)
  }
}

function activeBranchGroups(
  input: HeaterOptimizerInput,
): BranchGroup[] {
  return BRANCH_GROUPS
    .map(group => ({ ...group, branches: group.branches.filter(branch => input.heaterOptions[branch]) }))
    .filter(group => group.branches.length > 0)
}

// Below this, several workers fall back to one. deviceMemory (GB) is Chromium
// only: unknown counts as enough.
const SEVERAL_WORKERS_MIN_MEMORY_GB = 8
const SEVERAL_WORKERS_MIN_THREADS = 4

// Why this computer can't take several workers, or null if it can
function severalWorkersBlocker(): string | null {
  const memory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory
  if (memory !== undefined && memory < SEVERAL_WORKERS_MIN_MEMORY_GB)
    return `${memory} GB of memory reported`
  const threads = navigator.hardwareConcurrency
  if (threads !== undefined && threads < SEVERAL_WORKERS_MIN_THREADS)
    return `${threads} CPU threads reported`
  return null
}

// The groups' indexes, per lane. A lane left without a group starts no worker.
function buildLanes(groups: readonly BranchGroup[], workers: HeaterWorkerCount): number[][] {
  const indexes = groups.map((_, index) => index)
  if (workers === 1)
    return [indexes]
  return Array.from({ length: workers }, (_, lane) => indexes.filter(index => groups[index].lanes[workers] === lane))
    .filter(lane => lane.length > 0)
}

function inputForBranches(input: HeaterOptimizerInput, branches: readonly HeaterBranchId[]): HeaterOptimizerInput {
  const enabled = new Set(branches)
  return {
    ...input,
    heaterOptions: Object.fromEntries(
      Object.keys(input.heaterOptions).map(branch => [branch, enabled.has(branch as HeaterBranchId)]),
    ) as Record<HeaterBranchId, boolean>,
  }
}

function mergeRedAmbEffects(
  target: HeaterRedAmbUpgradeEffects | undefined,
  source: HeaterRedAmbUpgradeEffects | undefined,
): HeaterRedAmbUpgradeEffects | undefined {
  if (source === undefined)
    return target
  const merged: HeaterRedAmbUpgradeEffects = { ...(target ?? {}) }
  for (const [name, effects] of Object.entries(source)) {
    const key = name as keyof HeaterRedAmbUpgradeEffects
    merged[key] = { ...(merged[key] ?? {}), ...effects }
  }
  return merged
}

function mergeResults(input: HeaterOptimizerInput, parts: HeaterOptimizationResult[]): HeaterOptimizationResult {
  const merged: HeaterOptimizationResult = { input }
  for (const part of parts) {
    for (const [key, value] of Object.entries(part)) {
      if (key === 'input' || key === 'redAmbUpgradeEffects')
        continue
      ;(merged as unknown as Record<string, unknown>)[key] = value
    }
    merged.redAmbUpgradeEffects = mergeRedAmbEffects(
      merged.redAmbUpgradeEffects,
      part.redAmbUpgradeEffects,
    )
  }
  return merged
}

// The optimizer's warnings and errors, written to the mod's log. The log tab
// renders a line as HTML, and a stack trace can hold "<anonymous>".
function writeOptimizerLogs(logs: readonly HeaterOptimizerLog[]): void {
  for (const log of logs) {
    if (log.level === 'error')
      HSLogger.error(escapeLogText(log.message), log.context)
    else
      HSLogger.warn(escapeLogText(log.message), log.context)
  }
}

function formatSeconds(ms: number): string {
  return `${(ms / 1000).toFixed(1)} s`
}

// One debug line per group with the optimizer's stage times. A stage that
// holds sub-stages is listed after them, with their total. label: the group,
// and in a worker its lane and timing.
function logStages(label: string, stages: readonly HeaterOptimizerStage[]): void {
  if (!stages.length) return
  HSLogger.debug(() => `Heat stages, ${label}: ${stages
    .filter(stage => stage.elapsedMs >= 50)
    .map(stage => `${stage.name} ${formatSeconds(stage.elapsedMs)}`)
    .join(', ') || 'none over 0.05 s'}`, LOG_CONTEXT)
}

// A heat the player cancelled: not a failure, and nothing of it is kept.
export class HSHeatCancelledError extends Error {
  constructor() {
    super('Heat cancelled')
    this.name = 'HSHeatCancelledError'
  }
}

// A heat stopped by the optimizer's row limit. playerMessage names the
// branches of the group that hit it, with their labels in the input modal.
// The optimizer's own message and stack are kept for the log.
export class HSHeaterRowLimitError extends Error {
  readonly playerMessage: string
  constructor(cause: Error, branches: readonly HeaterBranchId[]) {
    super(cause.message)
    this.name = 'HSHeaterRowLimitError'
    this.stack = cause.stack
    const labels = branches.map(branch => HEATER_BRANCH_DEFINITIONS.find(definition => definition.id === branch)?.label ?? branch)
    this.playerMessage = `Heater stopped: the ${labels.join(' / ')} search passed its ${HEATER_ROW_LIMIT.toLocaleString('en-US')}-row limit.`
  }
}

function asRowLimitError(error: unknown, branches: readonly HeaterBranchId[]): unknown {
  return error instanceof Error && error.message.includes(HEATER_ROW_LIMIT_TEXT)
    ? new HSHeaterRowLimitError(error, branches)
    : error
}

// Each stops one running worker of the heat in progress
const runningWorkerStops = new Set<() => void>()
let heatCancelled = false

function stopRunningWorkers(): void {
  for (const stop of [...runningWorkerStops])
    stop()
}

function runWorker(
  sourceUrl: string,
  id: number,
  input: HeaterOptimizerInput,
): Promise<{ result: HeaterOptimizationResult; stages: HeaterOptimizerStage[] }> {
  return new Promise((resolve, reject) => {
    const worker = new Worker(sourceUrl)
    const stop = (): void => {
      cleanup()
      reject(new HSHeatCancelledError())
    }
    const cleanup = (): void => {
      runningWorkerStops.delete(stop)
      worker.terminate()
    }
    runningWorkerStops.add(stop)
    worker.onmessage = (event: MessageEvent<HeaterWorkerResponse>): void => {
      if (event.data.id !== id)
        return
      cleanup()
      writeOptimizerLogs(event.data.logs)
      if (event.data.ok)
        // An older embedded worker may omit optional diagnostics; its calculated result is still valid.
        resolve({ result: event.data.result, stages: event.data.stages ?? [] })
      else
        reject(new Error(event.data.error))
    }
    worker.onerror = (event): void => {
      cleanup()
      reject(new Error(event.message || 'Heater worker failed'))
    }
    const request: HeaterWorkerRequest = { id, input: serializeInput(input) }
    worker.postMessage(request)
  })
}

export class HSHeaterOptimizerRunner {
  // A heat can only be cancelled when it runs in a worker: without one it
  // runs on the page, which is frozen until it ends.
  static get canCancel(): boolean {
    return typeof Worker !== 'undefined' && typeof HS_HEATER_WORKER_SOURCE === 'string' && !!HS_HEATER_WORKER_SOURCE
  }

  // Cancels the heat in progress: its workers are terminated, the groups
  // already heated are dropped, and createResult rejects with
  // HSHeatCancelledError.
  static cancel(): void {
    heatCancelled = true
    stopRunningWorkers()
  }

  // onProgress is called before each worker group starts, with the number
  // of groups started so far (from 1), only when the heat runs in a worker.
  // workers: run that many lanes of BRANCH_GROUPS at once, when this computer
  // reports enough memory and CPU threads.
  static async createResult(
    input: HeaterOptimizerInput,
    onProgress?: (group: number, groupCount: number) => void,
    workers: HeaterWorkerCount = 1,
  ): Promise<HeaterOptimizationResult> {
    if (!ALL_BRANCHES.some(branch => input.heaterOptions[branch]))
      return { input }

    const cacheKey = JSON.stringify(serializeInput(input))
    const activeGroups = activeBranchGroups(input)
    const groupName = (group: BranchGroup): string => group.branches.join('+')
    const branchNames = activeGroups.map(groupName).join(', ')
    const cached = resultCache.get(cacheKey)
    if (cached !== undefined) {
      resultCache.delete(cacheKey)
      resultCache.set(cacheKey, cached)
      HSLogger.info(`Heat: ${branchNames} (same input as an earlier heat, result reused)`, LOG_CONTEXT)
      return { ...cached, input }
    }

    const startedAt = performance.now()
    heatCancelled = false
    // For the log: the groups a cancel stopped, the group that failed
    const stoppedGroups: string[] = []
    let failedGroup: BranchGroup | null = null
    try {
      if (typeof Worker === 'undefined' || typeof HS_HEATER_WORKER_SOURCE !== 'string' || !HS_HEATER_WORKER_SOURCE) {
        await new Promise<void>(resolve => setTimeout(resolve, 0))
        let result: HeaterOptimizationResult
        try {
          const experiment = HSHeaterOptimizer.runExperiment(input)
          result = experiment.result
          logStages(branchNames, experiment.diagnostics.stages)
        } finally {
          writeOptimizerLogs(takeHeaterOptimizerLogs())
        }
        cacheResult(cacheKey, result)
        HSLogger.info(`Heat done in ${formatSeconds(performance.now() - startedAt)}, without a worker: ${branchNames}`, LOG_CONTEXT)
        return result
      }

      // A branch keeps several large Pareto frontiers alive at once. Running
      // multiple branches in parallel multiplies that peak and can exhaust the
      // browser process even though each individual search fits: one lane
      // runs its groups one at a time, and at most three lanes run at once.
      // Terminating a worker between groups also releases its entire heap
      // deterministically.
      const blocker = workers > 1 ? severalWorkersBlocker() : null
      const lanes = buildLanes(activeGroups, blocker === null ? workers : 1)
      // Which group runs where, when several lanes run or the check above dropped to one
      if (lanes.length > 1 || blocker !== null) {
        const plan = lanes.map((lane, number) => `${number + 1}: ${lane.map(index => groupName(activeGroups[index])).join(' → ')}`).join('; ')
        const count = lanes.length > 1 ? `${lanes.length} workers` : `1 worker (${blocker})`
        HSLogger.debug(() => `Heat plan, ${count}: ${plan}`, LOG_CONTEXT)
      }
      const sourceUrl = URL.createObjectURL(new Blob([HS_HEATER_WORKER_SOURCE], { type: 'text/javascript' }))
      try {
        // By group index, so the merge order doesn't depend on which lane ends first
        const results: HeaterOptimizationResult[] = []
        const groupTimes: string[] = []
        let started = 0
        let failure: unknown = null
        const runLane = async (lane: number[], laneIndex: number): Promise<void> => {
          const laneLabel = lanes.length > 1 ? `worker ${laneIndex + 1}, ` : ''
          for (const [position, index] of lane.entries()) {
            // Cancelled, or the other lane failed, while no worker of this lane was running
            if (heatCancelled || failure !== null)
              return
            const name = groupName(activeGroups[index])
            onProgress?.(++started, activeGroups.length)
            const groupStartedAt = performance.now()
            try {
              const { result: groupResult, stages } = await runWorker(sourceUrl, index, inputForBranches(input, activeGroups[index].branches))
              results[index] = groupResult
              const took = formatSeconds(performance.now() - groupStartedAt)
              logStages(`${laneLabel}${name} (started +${formatSeconds(groupStartedAt - startedAt)}, took ${took})`, stages)
              groupTimes[index] = `${name} ${took}`
            } catch (error) {
              // A worker stopped by a cancel, or by the other lane's failure
              if (error instanceof HSHeatCancelledError) {
                stoppedGroups.push(name)
                return
              }
              failedGroup = activeGroups[index]
              failure = error
              // The other lane's results would be dropped: stop it now
              stopRunningWorkers()
              return
            }
            // Let the browser dispose of the terminated worker's heap before a
            // second large branch starts allocating its own frontiers.
            if (position + 1 < lane.length)
              await new Promise<void>(resolve => setTimeout(resolve, 50))
          }
        }
        await Promise.all(lanes.map(runLane))
        if (failure !== null)
          throw failure
        if (heatCancelled)
          throw new HSHeatCancelledError()
        const result = mergeResults(input, results)
        cacheResult(cacheKey, result)
        const workersUsed = lanes.length > 1 ? ` (${lanes.length} workers)`
          : blocker !== null ? ` (1 worker: ${blocker})` : ''
        HSLogger.info(`Heat done in ${formatSeconds(performance.now() - startedAt)}${workersUsed}: ${groupTimes.filter(Boolean).join(', ')}`, LOG_CONTEXT)
        return result
      } finally {
        URL.revokeObjectURL(sourceUrl)
      }
    } catch (error) {
      if (error instanceof HSHeatCancelledError) {
        const stopped = stoppedGroups.length > 0 ? `while heating ${stoppedGroups.join(' and ')}` : 'between two groups'
        HSLogger.info(`Heat cancelled after ${formatSeconds(performance.now() - startedAt)}, ${stopped}`, LOG_CONTEXT)
        throw error
      }
      // The error itself is logged by the caller. The input is what reproduces it.
      // Set inside runLane, which TypeScript's narrowing doesn't see
      const failed = failedGroup as BranchGroup | null
      HSLogger.error(`Heat failed after ${formatSeconds(performance.now() - startedAt)}, while heating ${failed ? groupName(failed) : branchNames}. Input: ${escapeLogText(cacheKey)}`, LOG_CONTEXT)
      // Without a worker, every ticked branch ran in one call
      throw asRowLimitError(error, failed?.branches ?? activeGroups.flatMap(group => group.branches))
    }
  }
}
