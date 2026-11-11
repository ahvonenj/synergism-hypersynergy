import type { HeaterOptimizerInput, HeaterOptimizationResult } from '../../../types/data-types/hs-heater-types';
import { createHeaterOptimizerEngine } from './hs-heater-optimizer-engine';
import type { HeaterCubeExperimentConfig, HeaterCubeExperimentDiagnostics } from './hs-heater-optimizer-engine';

export type { HeaterCubeExperimentUpgrade, HeaterCubeExperimentConfig, HeaterCubeExperimentSpending, HeaterCubeExperimentDiagnostics } from './hs-heater-optimizer-engine';
export { takeHeaterOptimizerLogs } from './hs-heater-optimizer-log';
export type { HeaterOptimizerLog } from './hs-heater-optimizer-log';

// Each worker has its own module instance; fallback heats run synchronously.
const optimizerEngine = createHeaterOptimizerEngine();

/*
    Class: HSHeaterOptimizer
    IsExplicitHSModule: No
    Description: Runs Heater calculations with optional diagnostics.
    Author: XxMolkxX
*/
export class HSHeaterOptimizer {
    static runExperiment(
        input: HeaterOptimizerInput,
        config: HeaterCubeExperimentConfig = {},
    ): { result: HeaterOptimizationResult; diagnostics: HeaterCubeExperimentDiagnostics } {
        const startedAt = this.#now();
        const diagnostics: HeaterCubeExperimentDiagnostics = {
            stages: [], chainTiers: [], searchPartitions: [], elapsedMs: 0,
        };
        const result = optimizerEngine.createResult(input, config, diagnostics);
        diagnostics.elapsedMs = this.#now() - startedAt;
        return { result, diagnostics };
    }

    static runCubeExperiment(
      input: HeaterOptimizerInput,
      config: HeaterCubeExperimentConfig = {},
    ): { result: HeaterOptimizationResult; diagnostics: HeaterCubeExperimentDiagnostics } {
      const cubeInput: HeaterOptimizerInput = {
        ...input,
        heaterOptions: Object.fromEntries(
          Object.keys(input.heaterOptions).map(branch => [branch, branch === "cubes"]),
        ) as HeaterOptimizerInput["heaterOptions"],
      }
      return this.runExperiment(cubeInput, config)
    }

    static createHeaterOptimizerResultFromInput(input: HeaterOptimizerInput): HeaterOptimizationResult {
        return optimizerEngine.createResult(input);
    }

    static #now(): number {
        return typeof performance !== 'undefined' ? performance.now() : Date.now();
    }
}
