import type { HeaterOptimizationResult, HeaterOptimizerInput } from './hs-heater-types'
import type { HeaterCubeExperimentDiagnostics, HeaterOptimizerLog } from '../../class/hs-modules/hs-heater/hs-heater-optimizer'

/** One timed step of a heat (the optimizer's stage records) */
export type HeaterOptimizerStage = HeaterCubeExperimentDiagnostics['stages'][number]

/** Decimal values cross the worker boundary as strings. Both sides use this protocol. */
export type SerializedHeaterOptimizerInput = Omit<
  HeaterOptimizerInput,
  'runeSiExp' | 'runeIaExp' | 'runeIaBonusLevelsTotal' | 'runeIaBonusLevelsTalisman' | 'baseTalismanPower'
> & {
  runeSiExp: string
  runeIaExp: string
  runeIaBonusLevelsTotal: string
  runeIaBonusLevelsTalisman: string
  baseTalismanPower: string
}

export type HeaterWorkerRequest = {
  id: number
  input: SerializedHeaterOptimizerInput
}

export type HeaterWorkerResponse =
  | { id: number; ok: true; result: HeaterOptimizationResult; logs: HeaterOptimizerLog[]; stages?: HeaterOptimizerStage[] }
  | { id: number; ok: false; error: string; logs: HeaterOptimizerLog[] }
