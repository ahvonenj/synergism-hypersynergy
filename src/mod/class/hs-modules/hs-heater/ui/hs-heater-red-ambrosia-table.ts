import { HSModuleRegistry } from "../../../hs-core/module/hs-module-registry";
import { HSUIC } from "../../../hs-core/hs-ui-components";
import { HSGameDataAPI } from "../../../hs-core/gds/hs-gamedata-api";
import { redAmbrosiaUpgradeCalculationCollection } from "../../../hs-core/gds/hs-gamedata-tables";
import { HSHeaterResultStore } from "../hs-heater-result-store";
import type { HeaterOptimizerInput, HeaterRedAmbCommonValues, HeaterRedAmbUpgradeEffects } from "../../../../types/data-types/hs-heater-types";
import type { RedAmbrosiaUpgradeCalculationConfig, RedAmbrosiaUpgradeKey } from "../../../../types/data-types/hs-gamedata-api-types";
import { applyHeaterBells, normalizeHeaterFusion, computeHeaterFusionValue, computeHeaterFusionGain, computeHeaterRedAmbrosiaSheetValue } from "../hs-heater-utils";
import { escapeHtml } from "../../../hs-utils/hs-escape";

export type RedAmbrosiaUpgradeCategoryEffectValue = number | "N / A" | "-";
export type RedAmbrosiaUpgradeCefLogValue = number | "-" | "N / A" | "Never";

export interface RedAmbrosiaUpgradeTableRow {
    upgradeKey: RedAmbrosiaUpgradeKey;
    label: string;
    iconUrl?: string;
    level: number;
    maxLevel: number;
    nextCost: number | "Maxed";
    ambrosiaEffectRaw?: RedAmbrosiaUpgradeCategoryEffectValue;
    ambrosiaEffect: RedAmbrosiaUpgradeCategoryEffectValue;
    ambrosiaCefLog: RedAmbrosiaUpgradeCefLogValue;
    redAmbrosiaEffectRaw?: RedAmbrosiaUpgradeCategoryEffectValue;
    redAmbrosiaEffect: RedAmbrosiaUpgradeCategoryEffectValue;
    redAmbrosiaCefLog: RedAmbrosiaUpgradeCefLogValue;
    octeractEffectRaw?: RedAmbrosiaUpgradeCategoryEffectValue;
    octeractEffect: RedAmbrosiaUpgradeCategoryEffectValue;
    octeractCefLog: RedAmbrosiaUpgradeCefLogValue;
}

const SHOW_RED_AMBROSIA_RAW_COLUMNS = false; // Set to true when debugging
const SHOW_RED_AMBROSIA_MAXED_ROWS = false;  // Set to true when debugging

const EXCLUDED_RED_AMBROSIA_UPGRADES: RedAmbrosiaUpgradeKey[] = [
    'redAmbrosiaFreeAccumulator',
    'redAmbrosiaObtainium',
    'redAmbrosiaOffering',
    'freeOfferingUpgrades',
    'salvageYinYang',
    'freeObtainiumUpgrades',
];

const BASE_AMBROSIA_EFFECT_KEYS = [
    'conversionImprovement1',
    'blueberryGenerationSpeed',
    'regularLuck',
    'blueberries',
    'freeLevelsRow2',
    'freeLevelsRow3',
    'conversionImprovement2',
    'redGenerationSpeed',
    'redGenerationSpeed2',
    'redLuck',
    'freeLevelsRow4',
    'viscount',
    'freeLevelsRow5',
    'conversionImprovement3',
    'blueberryGenerationSpeed2',
    'regularLuck2',
] as const;

const OCTERACT_EFFECT_KEYS = [
    'tutorial',
    'freeTutorialLevels',
    'regularLuck',
    'blueberries',
    'freeLevelsRow2',
    'redAmbrosiaCube',
    'freeLevelsRow3',
    'freeLevelsRow4',
    'redAmbrosiaCubeImprover',
    'infiniteShopUpgrades',
    'freeCubeUpgrades',
    'viscount',
    'freeLevelsRow5',
    'regularLuck2',
    'freeSpeedUpgrades',
] as const;

const RED_AMBROSIA_EFFECT_KEYS = BASE_AMBROSIA_EFFECT_KEYS;
const AMBROSIA_EFFECT_KEYS = [...BASE_AMBROSIA_EFFECT_KEYS, 'redAmbrosiaAccelerator'] as const;

const RED_AMBROSIA_EFFECT_KEY_SET = new Set<RedAmbrosiaEffectKey>(RED_AMBROSIA_EFFECT_KEYS as readonly RedAmbrosiaEffectKey[]);
const AMBROSIA_EFFECT_KEY_SET = new Set<AmbrosiaEffectKey>(AMBROSIA_EFFECT_KEYS as readonly AmbrosiaEffectKey[]);
const OCTERACT_EFFECT_KEY_SET = new Set<OcteractEffectKey>(OCTERACT_EFFECT_KEYS as readonly OcteractEffectKey[]);

type AmbrosiaEffectKey    = typeof AMBROSIA_EFFECT_KEYS[number];
type RedAmbrosiaEffectKey = typeof RED_AMBROSIA_EFFECT_KEYS[number];
type OcteractEffectKey    = typeof OCTERACT_EFFECT_KEYS[number];

function isAmbrosiaEffectKey(upgradeKey: RedAmbrosiaUpgradeKey): upgradeKey is AmbrosiaEffectKey {
    return AMBROSIA_EFFECT_KEY_SET.has(upgradeKey as AmbrosiaEffectKey);
}
function isRedAmbrosiaEffectKey(upgradeKey: RedAmbrosiaUpgradeKey): upgradeKey is RedAmbrosiaEffectKey {
    return RED_AMBROSIA_EFFECT_KEY_SET.has(upgradeKey as RedAmbrosiaEffectKey);
}
function isOcteractEffectKey(upgradeKey: RedAmbrosiaUpgradeKey): upgradeKey is OcteractEffectKey {
    return OCTERACT_EFFECT_KEY_SET.has(upgradeKey as OcteractEffectKey);
}

function getCurrentHSGameDataAPI(): HSGameDataAPI | undefined {
    return HSModuleRegistry.getModule('HSGameDataAPI');
}

function getCurrentRedAmbrosiaOptimizerContext(gameDataApi?: HSGameDataAPI): {
    input?: HeaterOptimizerInput;
    commonValues?: HeaterRedAmbCommonValues;
    redAmbUpgradeEffects?: HeaterRedAmbUpgradeEffects;
    blueberryInventory?: number;
} {
    const inventory = (gameDataApi ?? getCurrentHSGameDataAPI())?.ambrosia.calculateBlueberryInventory(true);
    const blueberryInventory = typeof inventory === 'number' ? inventory : undefined;
    const result = HSHeaterResultStore.getCurrentRawResult();
    if (!result) { return { blueberryInventory }; }
    return {
        input: result.input,
        commonValues: result.redAmbCommonValues,
        redAmbUpgradeEffects: result.redAmbUpgradeEffects,
        blueberryInventory,
    };
}

function computeRedAmbrosiaEffectValue(
    upgradeKey: RedAmbrosiaEffectKey,
    level: number,
    context: ReturnType<typeof getCurrentRedAmbrosiaOptimizerContext>,
): number | undefined {
    const { input, commonValues, redAmbUpgradeEffects } = context;
    const luck = commonValues?.luck;
    const mLuck = commonValues?.mLuck;
    const totalRedLuck = commonValues?.totalRedLuck;
    const luckConversion = commonValues?.luckConversion;

    const hasLuckConversionStats = luck !== undefined && luckConversion !== undefined && totalRedLuck !== undefined;
    const hasMLuckConversionStats = mLuck !== undefined && luckConversion !== undefined && totalRedLuck !== undefined;

    switch (upgradeKey) {
        case 'conversionImprovement1':
        case 'conversionImprovement2':
        case 'conversionImprovement3': {
            if (!hasLuckConversionStats) { return undefined; }
            const denominator = luckConversion - 1;
            if (!(denominator > 0 && totalRedLuck > 0)) { return undefined; }
            return 1 + ((luck / denominator) - (luck / luckConversion)) / totalRedLuck;
        }
        case 'regularLuck':
        case 'regularLuck2': {
            if (!hasMLuckConversionStats) { return undefined; }
            return 1 + (2 * (1 + mLuck)) / luckConversion / totalRedLuck;
        }
        case 'blueberryGenerationSpeed':
        case 'blueberryGenerationSpeed2': {
            if (!input) { return undefined; }
            const fusion = applyHeaterBells(input).ambSpeed * (1 + input.patreonBonus);
            const coefficient = upgradeKey === 'blueberryGenerationSpeed' ? 0.002 : 0.001;
            const speed = fusion * (1 + coefficient * level);
            if (!(speed > 0)) { return 1; }
            const delta = fusion * coefficient;
            const numerator = (1 + delta / speed) * Math.min(speed + delta, 1000);
            const denominator = Math.min(speed, 1000);
            return Math.sqrt(numerator / denominator);
        }
        case 'redGenerationSpeed': {
            return 1 + 0.003 / (1 + 0.003 * level);
        }
        case 'redGenerationSpeed2': {
            return 1 + 0.001 / (1 + 0.001 * level);
        }
        case 'redLuck': {
            if (totalRedLuck === undefined) { return undefined; }
            return 1 + 1 / totalRedLuck;
        }
        case 'blueberries':
        case 'freeLevelsRow2':
        case 'freeLevelsRow3':
        case 'freeLevelsRow4':
        case 'freeLevelsRow5':
        case 'viscount': {
            if (!redAmbUpgradeEffects) { return undefined; }
            const effectValue = redAmbUpgradeEffects[upgradeKey]?.rEffect;
            return typeof effectValue === 'number' ? effectValue : undefined;
        }
        default:
            return undefined;
    }
}

function computeAmbrosiaEffectRawValue(
    upgradeKey: AmbrosiaEffectKey,
    level: number,
    redAmbRawEffect: number | undefined,
    acceleratorLevel: number,
    context: ReturnType<typeof getCurrentRedAmbrosiaOptimizerContext>,
): number | undefined {
    const { input, commonValues } = context;
    const totalRedLuck = commonValues?.totalRedLuck;
    if (!input || totalRedLuck === undefined) { return undefined; }

    const fusionValue = computeHeaterFusionValue(
        normalizeHeaterFusion(acceleratorLevel, input.rBar, input.rSpeed),
        totalRedLuck,
        1,
    );

    const requiresRawValue = new Set<AmbrosiaEffectKey>([
        'conversionImprovement1',
        'conversionImprovement2',
        'redGenerationSpeed',
        'redGenerationSpeed2',
        'redLuck',
        'conversionImprovement3',
        'blueberryGenerationSpeed',
        'blueberryGenerationSpeed2',
        'regularLuck',
        'regularLuck2',
    ]);

    if (redAmbRawEffect === undefined && requiresRawValue.has(upgradeKey)) { return undefined; }

    switch (upgradeKey) {
        case 'conversionImprovement1':
        case 'conversionImprovement2':
        case 'redGenerationSpeed':
        case 'redGenerationSpeed2':
        case 'redLuck':
        case 'conversionImprovement3':
            return computeHeaterFusionGain(fusionValue, redAmbRawEffect!);
        case 'blueberryGenerationSpeed':
            return computeHeaterRedAmbrosiaSheetValue(level, fusionValue, redAmbRawEffect!, 0.002);
        case 'blueberryGenerationSpeed2':
            return computeHeaterRedAmbrosiaSheetValue(level, fusionValue, redAmbRawEffect!, 0.001);
        case 'regularLuck':
        case 'regularLuck2':
            return redAmbRawEffect! * computeHeaterFusionGain(fusionValue, redAmbRawEffect!);
        case 'redAmbrosiaAccelerator': {
            if (input.rBar <= 0) { return undefined; }
            const rawFusion = input.rSpeed / input.rBar * totalRedLuck / 100;
            const normalized = (level > 0 ? 1 : 0) + 0.02 * level;
            return (1 + (1.02 + 0.02 * level) * rawFusion) / (1 + normalized * rawFusion);
        }
        case 'blueberries':
        case 'freeLevelsRow2':
        case 'freeLevelsRow3':
        case 'freeLevelsRow4':
        case 'freeLevelsRow5':
        case 'viscount': {
            const effectValue = context.redAmbUpgradeEffects?.[upgradeKey]?.bEffect;
            return typeof effectValue === 'number' ? effectValue : undefined;
        }
        default:
            return undefined;
    }
}

function computeRedAmbrosiaRawToDisplay(
    upgradeKey: RedAmbrosiaEffectKey,
    value: number | undefined,
    context: ReturnType<typeof getCurrentRedAmbrosiaOptimizerContext>,
): number | undefined {
    if (upgradeKey !== 'blueberries' || value === undefined) {
        return value;
    }

    const { input } = context;
    const speed = (input ? applyHeaterBells(input).ambSpeed : 0) * (1 + (input?.patreonBonus ?? 0));
    const blueberries = input?.blueberries ?? 0;
    if (!(speed > 0 && blueberries > 0)) {
        return value;
    }

    const delta = speed / blueberries;
    const numerator = (1 + delta / speed) * Math.min(speed + delta, 1000);
    const denominator = Math.min(speed, 1000);
    return value * Math.sqrt(numerator / denominator);
}

function computeAmbrosiaRawToDisplay(
    upgradeKey: AmbrosiaEffectKey,
    value: number | undefined,
    context: ReturnType<typeof getCurrentRedAmbrosiaOptimizerContext>,
): number | undefined {
    if (upgradeKey === 'blueberries') {
        const blueberries = [context.input?.blueberries, context.blueberryInventory]
            .find(count => count !== undefined && Number.isFinite(count) && count > 0);
        if (blueberries === undefined) {
            return value;
        }
        // One more blueberry always improves generation speed, even if the
        // optimizer's additional luck gain is missing or invalid.
        const optimizerGain = value !== undefined && Number.isFinite(value) && value > 1 ? value : 1;
        return optimizerGain * (1 + 1 / blueberries);
    }

    return value;
}

function computeOcteractFreeCubeRaw(level: number, input: HeaterOptimizerInput): number {
    const effects = [
        0.015,
        0.0075,
        0.01 * input.currentSingularity,
        0.001,
        0.005 * (1 + input.freeShopLevelsInfinity / 100),
    ];
    const baseValues = [100, 100, 1000, 1000, 0];
    const product = effects.reduce((current, effect, index) => {
        const denominator = 1 + effect * (baseValues[index] + 24.5 + level);
        return current * (1 + effect / denominator);
    }, 1);
    return product * Math.pow(1.012, 1.25);
}

function computeOcteractFreeSpeedRaw(level: number, input: HeaterOptimizerInput): number {
    const effects = [
        0.012,
        0.006,
        0.015,
        0.001 * input.currentSingularity,
        0.005 * (1 + input.freeShopLevelsInfinity / 100),
    ];
    const baseValues = [100, 100, 1000, 1000, 0];
    const product = effects.reduce((current, effect, index) => {
        const denominator = 1 + effect * (baseValues[index] + 24.5 + level);
        return current * (1 + effect / denominator);
    }, 1);
    const mind = input.oneMindUnlocked && input.ascSpeed >= 1
        ? 0.55 + input.transcription / 150
        : 0.5;
    return Math.pow(product * 1.006, (1 + input.ascSpread) * mind);
}

function computeOcteractEffectRawValue(
    upgradeKey: OcteractEffectKey,
    level: number,
    context: ReturnType<typeof getCurrentRedAmbrosiaOptimizerContext>,
): number | undefined {
    const { input, redAmbUpgradeEffects } = context;

    switch (upgradeKey) {
        case 'tutorial':
            return 1.01;
        case 'freeTutorialLevels':
            return 1 + 0.05 / (1.5 + 0.05 * level);
        case 'regularLuck':
        case 'regularLuck2':
            return redAmbUpgradeEffects?.ossifiedTactics?.octEffect ?? undefined;
        case 'blueberries':
            return redAmbUpgradeEffects?.blueberries?.octEffect ?? undefined;
        case 'freeLevelsRow2':
            return redAmbUpgradeEffects?.freeLevelsRow2?.octEffect ?? undefined;
        case 'redAmbrosiaCube':
            if (!input) { return undefined; }
            return 1 + Math.pow(input.ramb, 0.4) / 100;
        case 'freeLevelsRow3':
            return redAmbUpgradeEffects?.freeLevelsRow3?.octEffect ?? undefined;
        case 'freeLevelsRow4':
            return redAmbUpgradeEffects?.freeLevelsRow4?.octEffect ?? undefined;
        case 'redAmbrosiaCubeImprover':
            if (!input) { return undefined; }
            return (1 + Math.pow(input.ramb, 0.41 + level / 100) / 100)
                / (1 + Math.pow(input.ramb, 0.4 + level / 100) / 100);
        case 'infiniteShopUpgrades':
            if (!input) { return undefined; }
            const infiniteMind = input.oneMindUnlocked && input.ascSpeed >= 1
                ? 0.55 + input.transcription / 150
                : 0.5;
            return Math.pow(1.012, 1.25) * Math.pow(1.006, (1 + input.ascSpread) * infiniteMind);
        case 'freeCubeUpgrades':
            if (!input) { return undefined; }
            return computeOcteractFreeCubeRaw(level, input);
        case 'viscount':
            return redAmbUpgradeEffects?.viscount?.octEffect ?? undefined;
        case 'freeLevelsRow5':
            return redAmbUpgradeEffects?.freeLevelsRow5?.octEffect ?? undefined;
        case 'freeSpeedUpgrades':
            if (!input) { return undefined; }
            return computeOcteractFreeSpeedRaw(level, input);
        default:
            return undefined;
    }
}

function getRedAmbrosiaUpgradeCategoryEffect(
    reward: Record<string, unknown>,
    effectKeys: readonly string[],
): RedAmbrosiaUpgradeCategoryEffectValue {
    for (const key of effectKeys) {
        const value = reward[key];
        if (typeof value === 'number') {
            return value;
        }
    }
    return 'N / A';
}

function buildRedAmbrosiaUpgradeCefLog(
    effect: RedAmbrosiaUpgradeCategoryEffectValue,
    cost: number | "Maxed",
): RedAmbrosiaUpgradeCefLogValue {
    if (effect === 'N / A' || effect === '-') {
        return effect;
    }
    if (typeof cost !== 'number' || cost <= 0) {
        return '-';
    }
    if (!Number.isFinite(effect) || effect <= 1) {
        return '-';
    }
    const delta = Math.pow(effect, 1 / cost) - 1;
    if (!(delta > 0)) {
        return '-';
    }
    return -Math.log10(delta);
}

function buildRedAmbrosiaUpgradeRow(
    upgradeKey: RedAmbrosiaUpgradeKey,
    label: string,
    iconUrl: string | undefined,
    level: number,
    maxLevel: number,
    nextCost: number | "Maxed",
    computedRedAmbrosiaEffectRaw: number | undefined,
    computedAmbrosiaEffectRaw: number | undefined,
    computedOcteractEffectRaw: number | undefined,
    rewardAmbrosiaEffect: RedAmbrosiaUpgradeCategoryEffectValue,
    rewardRedAmbrosiaEffect: RedAmbrosiaUpgradeCategoryEffectValue,
    optimizerContext: ReturnType<typeof getCurrentRedAmbrosiaOptimizerContext>,
): RedAmbrosiaUpgradeTableRow {
    const ambrosiaEffect = isAmbrosiaEffectKey(upgradeKey)
        ? computeAmbrosiaRawToDisplay(upgradeKey, computedAmbrosiaEffectRaw, optimizerContext) ?? rewardAmbrosiaEffect
        : rewardAmbrosiaEffect;
    const redAmbrosiaEffect: RedAmbrosiaUpgradeCategoryEffectValue = isRedAmbrosiaEffectKey(upgradeKey)
        ? computeRedAmbrosiaRawToDisplay(upgradeKey, computedRedAmbrosiaEffectRaw, optimizerContext) ?? rewardRedAmbrosiaEffect
        : rewardRedAmbrosiaEffect;
    const octeractEffect: RedAmbrosiaUpgradeCategoryEffectValue = isOcteractEffectKey(upgradeKey)
        ? computedOcteractEffectRaw ?? '-'
        : '-';

    return {
        upgradeKey,
        label,
        iconUrl,
        level,
        maxLevel,
        nextCost,
        ambrosiaEffectRaw: computedAmbrosiaEffectRaw,
        ambrosiaEffect,
        ambrosiaCefLog: buildRedAmbrosiaUpgradeCefLog(ambrosiaEffect, nextCost),
        redAmbrosiaEffectRaw: computedRedAmbrosiaEffectRaw,
        redAmbrosiaEffect,
        redAmbrosiaCefLog: buildRedAmbrosiaUpgradeCefLog(redAmbrosiaEffect, nextCost),
        octeractEffectRaw: computedOcteractEffectRaw,
        octeractEffect,
        octeractCefLog: buildRedAmbrosiaUpgradeCefLog(octeractEffect, nextCost),
    };
}

function formatRedAmbrosiaUpgradeCategoryValue(value: RedAmbrosiaUpgradeCategoryEffectValue | undefined): string {
    if (value === undefined || value === 'N / A' || value === '-') { return value === undefined ? '-' : value; }
    return value.toFixed(9);
}

export type RedAmbrosiaUpgradeSortKey = 'ambrosiaCefLog' | 'redAmbrosiaCefLog' | 'octeractCefLog';
export type RedAmbrosiaUpgradeSortDirection = 'ascending' | 'descending';

export interface RedAmbrosiaUpgradeSortState {
    key: RedAmbrosiaUpgradeSortKey | null;
    direction: RedAmbrosiaUpgradeSortDirection | null;
}

type CefLogKey = RedAmbrosiaUpgradeSortKey;

type CefLogRange = {
    min: number;
    max: number;
};

function computeCefLogRange(rows: RedAmbrosiaUpgradeTableRow[], key: CefLogKey): CefLogRange | null {
    let min = Infinity;
    let max = -Infinity;
    for (const row of rows) {
        const value = row[key];
        if (typeof value === 'number') {
            min = Math.min(min, value);
            max = Math.max(max, value);
        }
    }
    return min === Infinity ? null : { min, max };
}

function buildCefLogCellHtml(value: RedAmbrosiaUpgradeCefLogValue, range: CefLogRange | null, columnClass = ''): string {
    const innerText = escapeHtml(formatRedAmbrosiaUpgradeCefLogValue(value));
    const classNames = ['hs-heater-red-ambrosia-cef-log-cell', columnClass].filter(Boolean).join(' ');

    if (typeof value !== 'number' || range === null || range.max <= range.min) {
        return `<td class="${classNames}">${innerText}</td>`;
    }

    const normalized = (value - range.min) / (range.max - range.min);
    const alpha = Math.max(0, 0.35 * (1 - normalized));
    return `<td class="${classNames}" style="--cef-log-alpha: ${alpha.toFixed(3)}">${innerText}</td>`;
}

function formatRedAmbrosiaUpgradeCefLogValue(value: RedAmbrosiaUpgradeCefLogValue): string {
    if (typeof value !== 'number') { return value; }
    return value.toFixed(9);
}

function sortRedAmbrosiaUpgradeRows(
    rows: RedAmbrosiaUpgradeTableRow[],
    sortState: RedAmbrosiaUpgradeSortState,
): RedAmbrosiaUpgradeTableRow[] {
    if (!sortState.key || !sortState.direction) return rows;

    const directionMultiplier = sortState.direction === 'ascending' ? 1 : -1;
    return rows
        .map((row, originalIndex) => ({ row, originalIndex }))
        .sort((left, right) => {
            const leftValue = left.row[sortState.key!];
            const rightValue = right.row[sortState.key!];
            const leftIsNumber = typeof leftValue === 'number' && Number.isFinite(leftValue);
            const rightIsNumber = typeof rightValue === 'number' && Number.isFinite(rightValue);

            if (leftIsNumber !== rightIsNumber) return leftIsNumber ? -1 : 1;
            if (leftIsNumber && rightIsNumber && leftValue !== rightValue) {
                return (leftValue - rightValue) * directionMultiplier;
            }
            return left.originalIndex - right.originalIndex;
        })
        .map(({ row }) => row);
}

export function computeRedAmbrosiaUpgradeRows(gameDataApi?: HSGameDataAPI): RedAmbrosiaUpgradeTableRow[] {
    const api = gameDataApi ?? getCurrentHSGameDataAPI();
    const gameData = api?.getGameData?.();
    const optimizerContext = getCurrentRedAmbrosiaOptimizerContext(api);
    const redAmbrosiaAcceleratorLevel = api?.ambrosia.calculateRedAmbrosiaUpgradeValue('redAmbrosiaAccelerator') ?? 0;

    return (Object.entries(redAmbrosiaUpgradeCalculationCollection) as [RedAmbrosiaUpgradeKey, RedAmbrosiaUpgradeCalculationConfig<any>][]) 
        .filter(([upgradeKey]) => !EXCLUDED_RED_AMBROSIA_UPGRADES.includes(upgradeKey))
        .map(([upgradeKey, config]) => {
            const level = api?.ambrosia.calculateRedAmbrosiaUpgradeValue(upgradeKey) ?? 0;
            const maxLevel = config.maxLevel;
            const isMaxLevel = level >= maxLevel;
            const nextCost = isMaxLevel ? 'Maxed' : config.costFunction(level, config.costPerLevel);
            const label = config.label;
            const iconUrl = config.url;

            const computedRedAmbrosiaEffectRaw = isRedAmbrosiaEffectKey(upgradeKey)
                ? computeRedAmbrosiaEffectValue(upgradeKey, level, optimizerContext)
                : undefined;
            const computedAmbrosiaEffectRaw = isAmbrosiaEffectKey(upgradeKey)
                ? computeAmbrosiaEffectRawValue(upgradeKey, level, computedRedAmbrosiaEffectRaw, redAmbrosiaAcceleratorLevel, optimizerContext)
                : undefined;
            const computedOcteractEffectRaw = isOcteractEffectKey(upgradeKey)
                ? computeOcteractEffectRawValue(upgradeKey, level, optimizerContext)
                : undefined;

            const reward = config.effects(level, gameData) as Record<string, unknown>;
            const rewardAmbrosiaEffect = getRedAmbrosiaUpgradeCategoryEffect(reward, AMBROSIA_EFFECT_KEYS);
            const rewardRedAmbrosiaEffect = getRedAmbrosiaUpgradeCategoryEffect(reward, RED_AMBROSIA_EFFECT_KEYS);

            const row = buildRedAmbrosiaUpgradeRow(
                upgradeKey,
                label,
                iconUrl,
                level,
                maxLevel,
                nextCost,
                computedRedAmbrosiaEffectRaw,
                computedAmbrosiaEffectRaw,
                computedOcteractEffectRaw,
                rewardAmbrosiaEffect,
                rewardRedAmbrosiaEffect,
                optimizerContext,
            );

            return row;
        })
        .filter((row) => SHOW_RED_AMBROSIA_MAXED_ROWS || row.nextCost !== 'Maxed');
}

function renderRedAmbrosiaUpgradeRowHtml(
    row: RedAmbrosiaUpgradeTableRow,
    cefLogRanges: Record<CefLogKey, CefLogRange | null>,
    showRawColumns = false,
    compactView = false,
): string {
    const isMaxed = row.nextCost === 'Maxed';
    const iconCell = row.iconUrl
        ? `<img src="${escapeHtml(row.iconUrl)}" alt="${escapeHtml(row.label)}" class="hs-heater-red-ambrosia-icon">`
        : '';

    if (compactView) {
        return `
            <tr class="hs-heater-red-ambrosia-row${isMaxed ? ' hs-heater-red-ambrosia-maxed-row' : ''}">
                <td class="hs-heater-red-ambrosia-icon-cell">${iconCell}</td>
                <td>${escapeHtml(row.label)}</td>
                ${buildCefLogCellHtml(row.ambrosiaCefLog, cefLogRanges.ambrosiaCefLog, 'hs-heater-red-ambrosia-cef-log-cell--ambrosia')}
                ${buildCefLogCellHtml(row.redAmbrosiaCefLog, cefLogRanges.redAmbrosiaCefLog, 'hs-heater-red-ambrosia-cef-log-cell--red-ambrosia')}
                ${buildCefLogCellHtml(row.octeractCefLog, cefLogRanges.octeractCefLog, 'hs-heater-red-ambrosia-cef-log-cell--octeract')}
            </tr>
        `;
    }

    const costCell = isMaxed ? 'Maxed' : String(row.nextCost);

    return `
        <tr class="hs-heater-red-ambrosia-row${isMaxed ? ' hs-heater-red-ambrosia-maxed-row' : ''}">
            <td class="hs-heater-red-ambrosia-icon-cell">${iconCell}</td>
            <td>${escapeHtml(row.label)}</td>
            <td>${escapeHtml(String(row.level))}</td>
            <td>${escapeHtml(String(row.maxLevel))}</td>
            <td>${escapeHtml(costCell)}</td>
            ${showRawColumns ? `<td>${escapeHtml(formatRedAmbrosiaUpgradeCategoryValue(row.ambrosiaEffectRaw))}</td>` : ''}
            <td>${escapeHtml(formatRedAmbrosiaUpgradeCategoryValue(row.ambrosiaEffect))}</td>
            ${buildCefLogCellHtml(row.ambrosiaCefLog, cefLogRanges.ambrosiaCefLog, 'hs-heater-red-ambrosia-cef-log-cell--ambrosia')}
            ${showRawColumns ? `<td>${escapeHtml(formatRedAmbrosiaUpgradeCategoryValue(row.redAmbrosiaEffectRaw))}</td>` : ''}
            <td>${escapeHtml(formatRedAmbrosiaUpgradeCategoryValue(row.redAmbrosiaEffect))}</td>
            ${buildCefLogCellHtml(row.redAmbrosiaCefLog, cefLogRanges.redAmbrosiaCefLog, 'hs-heater-red-ambrosia-cef-log-cell--red-ambrosia')}
            ${showRawColumns ? `<td>${escapeHtml(formatRedAmbrosiaUpgradeCategoryValue(row.octeractEffectRaw))}</td>` : ''}
            <td>${escapeHtml(formatRedAmbrosiaUpgradeCategoryValue(row.octeractEffect))}</td>
            ${buildCefLogCellHtml(row.octeractCefLog, cefLogRanges.octeractCefLog, 'hs-heater-red-ambrosia-cef-log-cell--octeract')}
        </tr>
    `;
}

function renderCefLogSortHeaderHtml(
    label: string,
    sortKey: CefLogKey,
    sortState: RedAmbrosiaUpgradeSortState,
): string {
    const isActive = sortState.key === sortKey && sortState.direction !== null;
    const ariaSort = isActive ? ` aria-sort="${sortState.direction}"` : '';
    const indicator = isActive
        ? (sortState.direction === 'ascending' ? '&#8593;' : '&#8595;')
        : '&#8597;';
    const directionLabel = isActive ? `, currently ${sortState.direction}` : '';

    return `<th${ariaSort}><button type="button" class="hs-heater-red-ambrosia-sort-button" data-cef-sort-key="${sortKey}" aria-label="Sort by ${label} CEF-LOG${directionLabel}">${label}<span aria-hidden="true">${indicator}</span></button></th>`;
}

function renderRedAmbrosiaUpgradeTableHeaderHtml(
    showRawColumns = false,
    compactView = false,
    sortState: RedAmbrosiaUpgradeSortState = { key: null, direction: null },
): string {
    if (compactView) {
        return `
            <thead>
                <tr>
                    <th></th>
                    <th>Upgrade</th>
                    ${renderCefLogSortHeaderHtml('Amb', 'ambrosiaCefLog', sortState)}
                    ${renderCefLogSortHeaderHtml('Red Amb', 'redAmbrosiaCefLog', sortState)}
                    ${renderCefLogSortHeaderHtml('Oct', 'octeractCefLog', sortState)}
                </tr>
            </thead>
        `;
    }

    const ambrosiaColspan = showRawColumns ? 3 : 2;
    const redAmbrosiaColspan = showRawColumns ? 3 : 2;
    const octeractColspan = showRawColumns ? 3 : 2;
    return `
        <thead>
            <tr>
                <th rowspan="2"></th>
                <th rowspan="2">Upgrade</th>
                <th rowspan="2">Level</th>
                <th rowspan="2">Max</th>
                <th rowspan="2">Cost</th>
                <th colspan="${ambrosiaColspan}">Ambrosia</th>
                <th colspan="${redAmbrosiaColspan}">Red Ambrosia</th>
                <th colspan="${octeractColspan}">Octeracts</th>
            </tr>
            <tr>
                ${showRawColumns ? '<th>Raw</th>' : ''}
                <th>Effect</th>
                ${renderCefLogSortHeaderHtml('Ambrosia', 'ambrosiaCefLog', sortState)}
                ${showRawColumns ? '<th>Raw</th>' : ''}
                <th>Effect</th>
                ${renderCefLogSortHeaderHtml('Red Ambrosia', 'redAmbrosiaCefLog', sortState)}
                ${showRawColumns ? '<th>Raw</th>' : ''}
                <th>Effect</th>
                ${renderCefLogSortHeaderHtml('Octeracts', 'octeractCefLog', sortState)}
            </tr>
        </thead>
    `;
}

function renderRedAmbrosiaUpgradeContextSummaryHtml(context: ReturnType<typeof getCurrentRedAmbrosiaOptimizerContext>): string {
    const commonValues = context.commonValues;

    const summaryRows = [
        ['Total Luck (Red Luck ldt)', formatRedAmbrosiaUpgradeCategoryValue(commonValues?.luck)],
        ['Total Red Luck', formatRedAmbrosiaUpgradeCategoryValue(commonValues?.totalRedLuck)],
        ['Luck Mult. (Red Luck ldt)', formatRedAmbrosiaUpgradeCategoryValue(commonValues?.mLuck)],
        ['Total Luck Conv.', formatRedAmbrosiaUpgradeCategoryValue(commonValues?.luckConversion)],
    ];

    const rowsHtml = `
            <tr>
                <td>${escapeHtml(summaryRows[0][0])}</td>
                <td>${escapeHtml(String(summaryRows[0][1]))}</td>
                <td>${escapeHtml(summaryRows[1][0])}</td>
                <td>${escapeHtml(String(summaryRows[1][1]))}</td>
            </tr>
            <tr>
                <td>${escapeHtml(summaryRows[2][0])}</td>
                <td>${escapeHtml(String(summaryRows[2][1]))}</td>
                <td>${escapeHtml(summaryRows[3][0])}</td>
                <td>${escapeHtml(String(summaryRows[3][1]))}</td>
            </tr>
        `;

    return `
        <div class="hs-heater-red-ambrosia-summary">
            <table class="hs-heater-redamb-summary-table">
                <tbody>
                    ${rowsHtml}
                </tbody>
            </table>
        </div>
    `;
}

function renderRedAmbrosiaUpgradeTableHtml(
    rows: RedAmbrosiaUpgradeTableRow[],
    context: ReturnType<typeof getCurrentRedAmbrosiaOptimizerContext>,
    compactView = false,
    sortState: RedAmbrosiaUpgradeSortState = { key: null, direction: null },
): string {
    if (!rows.length) {
        return `<div class="hs-heater-red-ambrosia-empty">No red ambrosia upgrade rows available.</div>`;
    }

    const sortedRows = sortRedAmbrosiaUpgradeRows(rows, sortState);
    const showRawColumns = SHOW_RED_AMBROSIA_RAW_COLUMNS;
    const cefLogRanges: Record<CefLogKey, CefLogRange | null> = {
        ambrosiaCefLog: computeCefLogRange(sortedRows, 'ambrosiaCefLog'),
        redAmbrosiaCefLog: computeCefLogRange(sortedRows, 'redAmbrosiaCefLog'),
        octeractCefLog: computeCefLogRange(sortedRows, 'octeractCefLog'),
    };
    const rowsHtml = sortedRows.map(row => renderRedAmbrosiaUpgradeRowHtml(row, cefLogRanges, showRawColumns, compactView)).join('');

    return `
        <div class="hs-heater-red-ambrosia-table-section${compactView ? ' hs-heater-red-ambrosia-compact-view' : ''}">
            <div class="hs-heater-redamb-table-wrapper">
                <table class="hs-heater-redamb-table hs-heater-red-ambrosia-table">
                    ${renderRedAmbrosiaUpgradeTableHeaderHtml(showRawColumns, compactView, sortState)}
                    <tbody>
                        ${rowsHtml}
                    </tbody>
                </table>
            </div>
            ${compactView ? '' : renderRedAmbrosiaUpgradeContextSummaryHtml(context)}
            <div class="hs-heater-red-ambrosia-footer">
                <div>${HSUIC.Button({ id: 'hs-heater-red-ambrosia-action-btn', class: 'redButton', text: 'Toggle Data' })}</div>
                <div id="hs-heater-red-ambrosia-footer-note">Lower value / brighter color = better</div>
            </div>
        </div>
    `;
}

export function buildRedAmbrosiaUpgradeTableHtml(
    gameDataApi?: HSGameDataAPI,
    compactView = false,
    sortState: RedAmbrosiaUpgradeSortState = { key: null, direction: null },
): string {
    const rows = computeRedAmbrosiaUpgradeRows(gameDataApi);
    const optimizerContext = getCurrentRedAmbrosiaOptimizerContext();
    return renderRedAmbrosiaUpgradeTableHtml(rows, optimizerContext, compactView, sortState);
}
