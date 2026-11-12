import { HSAutosingStrategy, AutosingStrategyPhase, Challenge, phases, AOAG_PHASE_ID, AOAG_PHASE_NAME, createDefaultAoagPhase, SET_CORRUPTION_LEVEL_VALUE, IF_JUMP_VALUE, SPECIAL_ACTION_BY_ID, isCorruptionLevelStep, isIfJumpMaxJumps } from "./hs-autosing-types";
import { HSModuleRegistry } from "../../hs-core/module/hs-module-registry";

import { HSGlobal } from "../../hs-core/hs-global";
import { HSLogger } from "../../hs-core/hs-logger";
import { HSUI } from "../../hs-core/hs-ui";
import manifest from '../../../resource/json/strategies/manifest.json';
import { escapeLogText } from '../../hs-utils/hs-escape';

// Fields of older strategy formats: 8 corruption values before the game's 4.4.0 (corruptions, loadout), named
// corruption loadouts, that phases (corruptionLoadoutName) and "Load Corruption Loadout" steps (loadoutName) referred to,
// and the level a phase set at its start (corruptionLevel, null: unchanged)
type LegacyLoadout = { name: string; level?: number; loadout?: unknown };
type LegacyStrategy = HSAutosingStrategy & { corruptionLoadouts?: LegacyLoadout[] };
type LegacyPhase = AutosingStrategyPhase & { corruptions?: unknown; corruptionLoadoutName?: string | null; corruptionLevel?: unknown };
type LegacyStep = Challenge & { loadoutName?: string };

// "Corrup Ants", removed with the game's 4.4.0
const REMOVED_ANT_CORRUPTIONS_ACTION = 402;
// "Load Corruption Loadout", replaced by "Set corruption level" (SET_CORRUPTION_LEVEL_VALUE)
const REMOVED_LOAD_LOADOUT_ACTION = 202;
// "Corrup 0*", replaced by "Set corruption level" at level 0
const REMOVED_ZERO_CORRUPTION_ACTION = 400;
// "Corruption level from phase (reapply)", replaced by "Set corruption level" at its phase's level
const REMOVED_PHASE_LEVEL_ACTION = 401;
// Retired effective-level action: retain its numeric target as an actual corruption level.
const REMOVED_MINUS_FREE_LEVELS_ACTION = 404;

const isCorruptionLevel = (level: unknown): level is number => Number.isInteger(level) && (level as number) >= 0;
const isRecord = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object' && !Array.isArray(value);

function storedStrategyList(value: unknown): unknown[] {
    if (Array.isArray(value)) return value;
    return value == null ? [] : [value];
}

function storedStrategyName(value: unknown): string | undefined {
    return isRecord(value) && typeof value.strategyName === 'string' ? value.strategyName : undefined;
}

/**
 * Class: HSStrategyManager
 * IsExplicitHSModule: No
 * Description: Autosing's strategies: the player's, kept in localStorage, and the default ones (resource/json/strategies).
 *     Validates them, and brings the ones written before the game's 4.4.0 to the current format.
 * Author: Shewchou
 */
export class HSStrategyManager {
    static #strategies: HSAutosingStrategy[] = [];

    static getStrategies(): HSAutosingStrategy[] {
        return this.#strategies;
    }

    static setStrategies(strategies: HSAutosingStrategy[]) {
        this.#strategies = strategies;
    }

    static addStrategy(strategy: HSAutosingStrategy) {
        this.#strategies.push(strategy);
    }

    static removeStrategyByName(strategyName: string) {
        this.#strategies = this.#strategies.filter(s => s.strategyName !== strategyName);
    }

    static getDefaultStrategyNames(): string[] {
        const manifestArr: string[] = Array.isArray(manifest) ? manifest : JSON.parse(manifest);
        return manifestArr.map((filename: string) => filename.replace(/\.json$/, ""));
    }

    static async loadDefaultStrategyByName(name: string, context = ''): Promise<HSAutosingStrategy | null> {
        try {
            // Dynamic import using the name
            const data = await import(`../../../resource/json/strategies/${name}.json`);
            return data.default || data;
        } catch (e) {
            HSLogger.error(escapeLogText(`Failed to load strategy '${name}': ${e}`), context);
            return null;
        }
    }

    static ensureAoagPhase(strategy: HSAutosingStrategy): HSAutosingStrategy {
        if (!strategy) return strategy;

        const cloned = JSON.parse(JSON.stringify(strategy)) as HSAutosingStrategy;

        if (!Array.isArray(cloned.strategy)) cloned.strategy = [];

        if (!cloned.aoagPhase) {
            const aoagIndex = cloned.strategy.findIndex(p => p.phaseId === AOAG_PHASE_ID);
            if (aoagIndex !== -1) {
                const [aoagFromList] = cloned.strategy.splice(aoagIndex, 1);
                cloned.aoagPhase = aoagFromList;
            } else {
                cloned.aoagPhase = createDefaultAoagPhase();
            }
        }

        if (cloned.aoagPhase && cloned.aoagPhase.phaseId !== AOAG_PHASE_ID) {
            cloned.aoagPhase.phaseId = AOAG_PHASE_ID;
        }

        return cloned;
    }

    static #getPhases(strategy: HSAutosingStrategy): AutosingStrategyPhase[] {
        return [...(strategy.strategy ?? []), ...(strategy.aoagPhase ? [strategy.aoagPhase] : [])];
    }

    /** True for a strategy written before the game's 4.4.0: 8 corruption values instead of a level, or "Corrup Ants" steps. */
    static hasLegacyCorruptions(strategy: HSAutosingStrategy): boolean {
        return HSStrategyManager.#getPhases(strategy).some(phase => (phase as LegacyPhase).corruptions !== undefined
                || phase.strat?.some(step => step.challengeNumber === REMOVED_ANT_CORRUPTIONS_ACTION))
            || ((strategy as LegacyStrategy).corruptionLoadouts ?? []).some(loadout => loadout.loadout !== undefined);
    }

    /** Removes a phase's steps (in place). The if-jumps past a removed step move up one step. */
    static #removeSteps(phase: AutosingStrategyPhase, isRemoved: (step: Challenge) => boolean): void {
        for (let i = phase.strat.length - 1; i >= 0; i--) {
            if (!isRemoved(phase.strat[i])) continue;
            phase.strat.splice(i, 1);
            for (const step of phase.strat) {
                if (step.ifJump && step.ifJump.ifJumpIndex > i) step.ifJump.ifJumpIndex--;
            }
        }
    }

    /**
     * Brings a strategy to the current format, in place.
     * - Before the game's 4.4.0: its levels become 0, to set in the editor (8 corruption values don't make one level).
     *   Its "Corrup Ants" steps are removed.
     * - Named corruption loadouts are gone: a phase naming one gets its level ("None", null or "": an empty level,
     *   unchanged), a "Load Corruption Loadout" step becomes a "Set corruption level" step (removed when its loadout
     *   doesn't exist: it did nothing).
     * - "Corrup 0*" steps become "Set corruption level" steps at level 0.
     * - "Set corruption level minus free levels" steps become ordinary set-and-ascend steps with the same target.
     * - A phase's own level is gone: it becomes a "Set corruption level" step at the phase's start, and its
     *   "Corruption level from phase (reapply)" steps "Set corruption level" steps (removed when the phase had no
     *   level: they did nothing). Not in the first phase (autosing starts each singularity with one, which sets the
     *   level to 0) nor the AOAG phase (autosing sets 0 before it).
     */
    static #migrateCorruptions(strategy: HSAutosingStrategy): void {
        const legacy = strategy as LegacyStrategy;
        const levelByName = new Map((legacy.corruptionLoadouts ?? [])
            .map(l => [l.name, isCorruptionLevel(l.level) ? l.level : 0]));
        delete legacy.corruptionLoadouts;

        const firstPhase = strategy.strategy?.[0];
        for (const phase of HSStrategyManager.#getPhases(strategy) as LegacyPhase[]) {
            // No level in the current format; in the older ones a phase always had one (0 when it wasn't valid)
            const isOlderFormat = 'corruptionLevel' in phase || 'corruptionLoadoutName' in phase || 'corruptions' in phase;
            let level = phase.corruptionLevel;
            if ('corruptionLoadoutName' in phase) {
                const name = phase.corruptionLoadoutName;
                if (name === null || name === '') level = null;
                else if (name !== undefined && levelByName.has(name)) level = levelByName.get(name)!;
            }
            const phaseLevel = !isOlderFormat || level === null ? null : isCorruptionLevel(level) ? level : 0;
            delete phase.corruptionLoadoutName;
            delete phase.corruptionLevel;
            delete phase.corruptions;

            if (!Array.isArray(phase.strat)) continue;
            HSStrategyManager.#removeSteps(phase, step => step.challengeNumber === REMOVED_ANT_CORRUPTIONS_ACTION
                || (step.challengeNumber === REMOVED_LOAD_LOADOUT_ACTION && !levelByName.has((step as LegacyStep).loadoutName ?? ''))
                || (step.challengeNumber === REMOVED_PHASE_LEVEL_ACTION && phaseLevel === null));
            for (const step of phase.strat as LegacyStep[]) {
                if (step.challengeNumber === REMOVED_MINUS_FREE_LEVELS_ACTION) {
                    step.challengeNumber = SET_CORRUPTION_LEVEL_VALUE;
                    continue;
                }
                if (step.challengeNumber === REMOVED_ZERO_CORRUPTION_ACTION || step.challengeNumber === REMOVED_PHASE_LEVEL_ACTION) {
                    step.corruptionLevel = step.challengeNumber === REMOVED_ZERO_CORRUPTION_ACTION ? 0 : phaseLevel!;
                    step.challengeNumber = SET_CORRUPTION_LEVEL_VALUE;
                    continue;
                }
                if (step.challengeNumber !== REMOVED_LOAD_LOADOUT_ACTION) continue;
                step.challengeNumber = SET_CORRUPTION_LEVEL_VALUE;
                step.corruptionLevel = levelByName.get(step.loadoutName!)!;
                // The loadout's name says what the level is for: kept in the comment
                if (!step.comment) step.comment = step.loadoutName;
                delete step.loadoutName;
            }

            if (phaseLevel === null || phase === firstPhase || phase === strategy.aoagPhase) continue;
            phase.strat.unshift({
                challengeNumber: SET_CORRUPTION_LEVEL_VALUE,
                corruptionLevel: phaseLevel,
                challengeCompletions: 0,
                challengeWaitTime: 0,
                challengeMaxTime: 0,
            });
            for (const step of phase.strat) {
                if (step.ifJump) step.ifJump.ifJumpIndex++;
            }
        }
    }

    static normalizeCorruptions(strategy: HSAutosingStrategy): HSAutosingStrategy {
        if (!strategy) return strategy;

        const cloned = JSON.parse(JSON.stringify(strategy)) as HSAutosingStrategy;
        HSStrategyManager.#migrateCorruptions(cloned);
        for (const phase of HSStrategyManager.#getPhases(cloned)) {
            for (const step of phase.strat ?? []) {
                if (isCorruptionLevelStep(step.challengeNumber) && step.ascendAfterCorruption === undefined) {
                    step.ascendAfterCorruption = true;
                }
            }
        }
        return cloned;
    }

    /** Check untrusted shapes before the migrations traverse or JSON-clone them. */
    static #validateStructure(input: unknown): asserts input is HSAutosingStrategy {
        if (!isRecord(input)) throw new Error('Strategy must be an object');
        if (typeof input.strategyName !== 'string' || !input.strategyName.trim()) throw new Error('Strategy must have a nonempty strategyName');
        if (!Array.isArray(input.strategy)) throw new Error('Strategy.strategy must be an array');
        if (input.corruptionLoadouts !== undefined && (!Array.isArray(input.corruptionLoadouts)
            || input.corruptionLoadouts.some(loadout => !isRecord(loadout) || typeof loadout.name !== 'string'))) {
            throw new Error('Strategy corruptionLoadouts must be an array of named loadouts');
        }
        const entries = [...input.strategy, ...(input.aoagPhase !== undefined ? [input.aoagPhase] : [])];
        for (const [phaseIndex, phase] of entries.entries()) {
            const label = `Phase ${phaseIndex + 1}`;
            if (!isRecord(phase)) throw new Error(`${label} must be an object`);
            if (phase.phaseId !== undefined && typeof phase.phaseId !== 'string') throw new Error(`${label}: phaseId must be text`);
            if (!phases.includes(phase.startPhase as typeof phases[number]) || !phases.includes(phase.endPhase as typeof phases[number])) {
                throw new Error(`${label} must have valid startPhase and endPhase values`);
            }
            if (!Array.isArray(phase.strat)) throw new Error(`${label} actions must be an array`);
            for (const [index, step] of phase.strat.entries()) {
                const tag = `${label}, step ${index + 1}`;
                if (!isRecord(step)) throw new Error(`${tag} must be an object`);
                if (!Number.isInteger(step.challengeNumber)) throw new Error(`${tag} must have an integer challengeNumber`);
                for (const field of ['challengeCompletions', 'challengeWaitBefore', 'challengeWaitTime', 'challengeMaxTime'] as const) {
                    const value = step[field];
                    if (value !== undefined && (typeof value !== 'number' || !Number.isFinite(value) || value < 0)) {
                        throw new Error(`${tag}: ${field} must be a finite nonnegative number`);
                    }
                }
                if (step.comment !== undefined && typeof step.comment !== 'string') throw new Error(`${tag}: comment must be text`);
                if (step.ifJump !== undefined && !isRecord(step.ifJump)) throw new Error(`${tag}: ifJump must be an object`);
            }
        }
    }

    static #validateSteps(phase: AutosingStrategyPhase): void {
        const ids = new Set<string>();
        for (const [index, step] of phase.strat.entries()) {
            const tag = `Phase ${phase.startPhase} → ${phase.endPhase}, step ${index + 1}`;
            if (!(step.challengeNumber >= 1 && step.challengeNumber <= 15) && !SPECIAL_ACTION_BY_ID.has(step.challengeNumber)) {
                throw new Error(`${tag}: unknown action ${step.challengeNumber}`);
            }
            if (step.challengeNumber !== IF_JUMP_VALUE) continue;
            const jump = step.ifJump;
            if (!jump) throw new Error(`${tag}: IF action needs ifJump`);
            if (typeof jump.id !== 'string' || !jump.id.trim() || ids.has(jump.id)) throw new Error(`${tag}: IF id must be nonempty and unique within its phase`);
            ids.add(jump.id);
            // Older strategies omit the mode; the editor already treats these as challenge comparisons.
            if (jump.ifJumpMode === undefined) jump.ifJumpMode = 'challenges';
            if (jump.ifJumpMode !== 'challenges' && jump.ifJumpMode !== 'stored_c15') throw new Error(`${tag}: invalid IF mode`);
            if (jump.ifJumpOperator !== '>' && jump.ifJumpOperator !== '<') throw new Error(`${tag}: IF operator must be > or <`);
            if (!Number.isInteger(jump.ifJumpIndex) || jump.ifJumpIndex < 0 || jump.ifJumpIndex > phase.strat.length) {
                throw new Error(`${tag}: IF destination must be a step index from 0 to ${phase.strat.length} (end of phase)`);
            }
            if (jump.ifJumpMode === 'challenges') {
                if (!Number.isInteger(jump.ifJumpChallenge) || jump.ifJumpChallenge < 1 || jump.ifJumpChallenge > 15) throw new Error(`${tag}: IF challenge must be 1 to 15`);
                if (typeof jump.ifJumpValue !== 'number' || !Number.isFinite(jump.ifJumpValue)) throw new Error(`${tag}: IF value must be a finite number`);
            } else if (jump.ifJumpMultiplier !== undefined && (typeof jump.ifJumpMultiplier !== 'number' || !Number.isFinite(jump.ifJumpMultiplier))) {
                throw new Error(`${tag}: IF multiplier must be a finite number`);
            }
        }
    }

    static validateStrategy(input: unknown, context = ''): HSAutosingStrategy {
        HSStrategyManager.#validateStructure(input);
        const strategy = HSStrategyManager.normalizeCorruptions(HSStrategyManager.ensureAoagPhase(input));

        const components = strategy.strategy;
        if (components.length === 0) {
            throw new Error('Strategy has no components');
        }
        const aoagPhase = strategy.aoagPhase;
        if (!aoagPhase) {
            throw new Error(`Strategy is missing "${AOAG_PHASE_NAME}" phase`);
        }
        if (!Array.isArray(aoagPhase.strat) || aoagPhase.strat.length === 0) {
            throw new Error(`"${AOAG_PHASE_NAME}" phase must have at least one action`);
        }

        for (const phase of HSStrategyManager.#getPhases(strategy)) {
            HSStrategyManager.#validateSteps(phase);
            const index = phase.strat?.findIndex(step => isCorruptionLevelStep(step.challengeNumber)
                && !isCorruptionLevel(step.corruptionLevel)) ?? -1;
            if (index !== -1) {
                throw new Error(`Phase ${phase.startPhase} → ${phase.endPhase}: step ${index + 1} has no valid corruption level`);
            }
            const invalidAscend = phase.strat?.findIndex(step => isCorruptionLevelStep(step.challengeNumber)
                && typeof step.ascendAfterCorruption !== 'boolean') ?? -1;
            if (invalidAscend !== -1) {
                throw new Error(`Phase ${phase.startPhase} → ${phase.endPhase}: step ${invalidAscend + 1} has no valid corruption ascension option`);
            }
            const invalidMaxJumps = phase.strat?.findIndex(step => step.ifJump && !isIfJumpMaxJumps(step.ifJump.ifJumpMaxJumps)) ?? -1;
            if (invalidMaxJumps !== -1) {
                throw new Error(`Phase ${phase.startPhase} → ${phase.endPhase}: step ${invalidMaxJumps + 1} has an invalid max jumps (a whole number, 0 or more)`);
            }
        }

        let remainingPhases = [...phases];

        for (let i = 0; i < components.length; i++) {
            const component = components[i];
            const { startPhase, endPhase, strat: challenges } = component;

            if (!Array.isArray(challenges) || challenges.length === 0) {
                throw new Error(
                    `Component ${i + 1} (${startPhase} → ${endPhase}) must have at least one challenge`,
                );
            }

            if (remainingPhases[0] !== startPhase) {
                throw new Error(
                    `Component ${i + 1} must start at "${remainingPhases[0]}", got "${startPhase}"`,
                );
            }

            const endIndex = remainingPhases.indexOf(endPhase);
            if (endIndex === -1) {
                throw new Error(
                    `Component ${i + 1} ends at "${endPhase}", which is not valid or already consumed`,
                );
            }

            remainingPhases = remainingPhases.slice(endIndex);
        }

        if (remainingPhases.length > 1) {
            throw new Error(
                `Uncovered phases: ${remainingPhases.join(', ')}`,
            );
        }
        return strategy;
    }

    static getMergedStrategyOptions() {
        const defaultNames = HSStrategyManager.getDefaultStrategyNames();
        const manifestSet = new Set(defaultNames);
        const defaultStrategiesOptions = defaultNames.map(name => ({ text: name, value: name, isDefault: true }));
        const userStrategies = HSStrategyManager.getStrategies().filter(s => !manifestSet.has(s.strategyName));
        const userStrategiesOptions = userStrategies.map(s => ({ text: s.strategyName, value: s.strategyName, isDefault: false }));
        return { defaultStrategiesOptions, userStrategiesOptions };
    }

    static saveStrategyToStorage(
        strategy: HSAutosingStrategy,
        strategyName?: string,
        context = ''
    ): { strategy: HSAutosingStrategy; isUpdate: boolean; saved: boolean } {
        const storageMod = HSModuleRegistry.getModule('HSStorage');
        if (!storageMod) {
            throw new Error("Could not find Storage Module");
        }

        const strategies = storedStrategyList(storageMod.getData<unknown>(HSGlobal.HSSettings.strategiesKey));

        const normalizedStrategy = HSStrategyManager.validateStrategy(strategy, context);
        const isUpdate = !!strategyName;
        const nameExists = strategies.some(entry => {
            const name = storedStrategyName(entry);
            return name === normalizedStrategy.strategyName && (!isUpdate || name !== strategyName);
        });

        if (nameExists) {
            throw new Error(`Strategy with name "${normalizedStrategy.strategyName}" already exists.`);
        }

        let updatedStrategies = strategies;

        if (isUpdate) {
            updatedStrategies = strategies.filter(entry => storedStrategyName(entry) !== strategyName);
        }

        updatedStrategies = updatedStrategies.concat(normalizedStrategy);

        const defaultNames = HSStrategyManager.getDefaultStrategyNames();
        const saved = storageMod.setData(
            HSGlobal.HSSettings.strategiesKey,
            updatedStrategies.filter(entry => {
                const name = storedStrategyName(entry);
                return name === undefined || !defaultNames.includes(name);
            })
        );
        if (!saved) {
            HSLogger.warn(`Could not save Strategy to localStorage`, context);
        } else {
            if (isUpdate) HSStrategyManager.removeStrategyByName(strategyName!);
            HSStrategyManager.addStrategy(normalizedStrategy);
            HSLogger.debug(() => `<green>Strategy ${isUpdate ? "updated" : "saved"} to localStorage</green>`, context);
        }

        return { strategy: normalizedStrategy, isUpdate, saved };
    }

    /** Tells the player their strategies from before the game's 4.4.0 lost their corruption levels (see #migrateLegacyCorruptions). */
    static warnLegacyCorruptions(strategyNames: string[], context = ''): void {
        const names = strategyNames.map(name => `"${name}"`).join(', ');
        HSLogger.warn(`Autosing strategies from before the game's 4.4.0: ${escapeLogText(names)}. Their corruption levels are now 0 and their `
            + `"Corrup Ants" steps were removed.`, context);
        void HSUI.Notify(`Autosing: ${names} now use corruption level 0 everywhere. Set the levels in the strategy editor.`, {
            notificationType: 'warning',
            displayDuration: 10000
        });
    }

    static deleteStrategyFromStorage(strategyName: string, context = ''): boolean {
        const storageMod = HSModuleRegistry.getModule('HSStorage');
        if (!storageMod) {
            throw new Error("Could not find Storage Module");
        }

        const strategies = storedStrategyList(storageMod.getData<unknown>(HSGlobal.HSSettings.strategiesKey));
        const updatedStrategies = strategies.filter(entry => storedStrategyName(entry) !== strategyName);
        const saved = storageMod.setData(HSGlobal.HSSettings.strategiesKey, updatedStrategies);
        if (!saved) {
            HSLogger.warn(`Could not delete Strategy from localStorage`, context);
        } else {
            HSStrategyManager.removeStrategyByName(strategyName);
            HSLogger.log(`Strategy "${escapeLogText(strategyName)}" deleted.`, context);
        }
        return saved;
    }

    static parseStoredStrategies(context = ''): HSAutosingStrategy[] | null {
        const storageMod = HSModuleRegistry.getModule('HSStorage');
        if (!storageMod) { HSLogger.warn(`Could not find HSStorage module`, context); return null; }

        const loaded = storageMod.getData<unknown>(HSGlobal.HSSettings.strategiesKey);
        if (loaded === null) return null;

        const list = storedStrategyList(loaded);
        const defaultStrategyNames = new Set(HSStrategyManager.getDefaultStrategyNames());
        const normalized: HSAutosingStrategy[] = [];
        const legacyNames: string[] = [];
        let didDropDefaults = false;
        let rejected = false;
        for (const strategy of list) {
            const name = storedStrategyName(strategy);
            if (name !== undefined && defaultStrategyNames.has(name)) {
                didDropDefaults = true;
                continue;
            }
            try {
                const checked = HSStrategyManager.validateStrategy(strategy, context);
                normalized.push(checked);
                // Validation checked the original structure before normalizing the copy.
                if (HSStrategyManager.hasLegacyCorruptions(strategy as HSAutosingStrategy)) legacyNames.push(checked.strategyName);
            } catch (error) {
                rejected = true;
                HSLogger.warn(escapeLogText(`Stored Autosing strategy skipped: ${error}`), context);
            }
        }

        if (legacyNames.length > 0) {
            // Keep malformed entries on disk for repair; a load must not silently delete them.
            if (!rejected) storageMod.setData(HSGlobal.HSSettings.strategiesKey, normalized);
            HSStrategyManager.warnLegacyCorruptions(legacyNames, context);
        } else if (didDropDefaults && !rejected) {
            storageMod.setData(HSGlobal.HSSettings.strategiesKey, normalized);
        }

        return normalized;
    }
}
