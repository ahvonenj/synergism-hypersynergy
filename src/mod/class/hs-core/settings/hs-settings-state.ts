import type { HSSetting } from './hs-setting';
import type { HSSettingBase, HSSettingType } from '../../../types/module-types/hs-settings-types';

const isRecord = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object' && !Array.isArray(value);

/**
 * Renamed settings, old key → new key: a stored value under the old key is read as the new one's. The next save writes
 * only current keys, so the old one goes away.
 */
const RENAMED_SETTINGS: Readonly<Record<string, string>> = {
    perksFind: 'singularitySearch',
};

/** Reads the existing storage envelope; older backups may contain the object rather than its JSON string. */
export function parseStoredSettingStates(value: unknown): Record<string, unknown> | null {
    const parsed: unknown = typeof value === 'string' ? JSON.parse(value) : value;
    if (!isRecord(parsed)) return null;

    const states = { ...parsed };
    for (const [oldKey, newKey] of Object.entries(RENAMED_SETTINGS)) {
        if (Object.hasOwn(states, oldKey) && !Object.hasOwn(states, newKey)) states[newKey] = states[oldKey];
        delete states[oldKey];
    }
    return states;
}

/** Only player-owned fields can override the current definition, including when reading older full definitions. */
export function restoreSettingState<T extends HSSettingType>(definition: HSSettingBase<T>, stored: unknown): HSSettingBase<T> {
    const restored = { ...definition };
    if (!isRecord(stored)) return restored;
    if (typeof stored.enabled === 'boolean') restored.enabled = stored.enabled;
    const value = stored.settingValue;
    let valid = false;
    let normalized = value;
    switch (definition.settingType) {
        case 'numeric':
            if (typeof value === 'string' && value.trim() !== '') normalized = Number(value);
            valid = typeof normalized === 'number' && Number.isFinite(normalized);
            break;
        case 'selectstring':
            valid = typeof value === 'string' || (typeof value === 'number' && Number.isFinite(value));
            break;
        case 'string':
            valid = typeof value === 'string';
            break;
        case 'selectstrings':
            valid = Array.isArray(value) && value.every(item => typeof item === 'string');
            if (valid) normalized = [...value as string[]];
            break;
        case 'boolean':
            valid = typeof value === 'boolean';
            break;
        case 'button':
            valid = value === null || typeof value === 'string';
            break;
    }
    if (valid) restored.settingValue = normalized as T;
    return restored;
}

export function serializeSettingStates(settings: Readonly<Record<string, Pick<HSSetting<HSSettingType>, 'getDefinition'>>>): string {
    return JSON.stringify(Object.fromEntries(Object.entries(settings).map(([name, setting]) => {
        const definition = setting.getDefinition();
        return [name, {
            enabled: definition.enabled,
            settingValue: definition.settingType === 'boolean' ? definition.enabled : definition.settingValue,
        }];
    })));
}

/** Optional control preparation preserves startup order without making actions depend on controls. */
export async function initializeSettingActions(
    settings: Iterable<HSSetting<HSSettingType>>,
    prepare?: (setting: HSSetting<HSSettingType>) => void,
): Promise<void> {
    for (const setting of settings) {
        prepare?.(setting);
        await setting.initialAction('state', setting.getDefinition().enabled);
    }
}
