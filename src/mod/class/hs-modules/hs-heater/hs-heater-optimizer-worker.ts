import type { HeaterOptimizerInput } from '../../../types/data-types/hs-heater-types'
import Decimal from 'break_infinity.js'
import { HSHeaterOptimizer, takeHeaterOptimizerLogs } from './hs-heater-optimizer'
import type { HeaterWorkerRequest, HeaterWorkerResponse } from '../../../types/data-types/hs-heater-worker-types'

const workerScope = self as unknown as {
  onmessage: ((event: MessageEvent<HeaterWorkerRequest>) => void) | null
  postMessage: (message: HeaterWorkerResponse) => void
}

workerScope.onmessage = (event): void => {
  const { id, input: serializedInput } = event.data
  try {
    const input: HeaterOptimizerInput = {
      ...serializedInput,
      runeSiExp: new Decimal(serializedInput.runeSiExp),
      runeIaExp: new Decimal(serializedInput.runeIaExp),
      runeIaBonusLevelsTotal: new Decimal(serializedInput.runeIaBonusLevelsTotal),
      runeIaBonusLevelsTalisman: new Decimal(serializedInput.runeIaBonusLevelsTalisman),
      baseTalismanPower: new Decimal(serializedInput.baseTalismanPower),
    }
    // runExperiment times each stage; only the stage times go back
    const { result, diagnostics } = HSHeaterOptimizer.runExperiment(input)
    workerScope.postMessage({ id, ok: true, result, logs: takeHeaterOptimizerLogs(), stages: diagnostics.stages })
  } catch (error) {
    workerScope.postMessage({
      id,
      ok: false,
      error: error instanceof Error ? error.stack ?? error.message : String(error),
      logs: takeHeaterOptimizerLogs(),
    })
  }
}
