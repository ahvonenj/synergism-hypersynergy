import { HSUI } from "../../hs-core/hs-ui";
import { buildHeaterTypeSemanticId, getHeaterTypeEntries, HEATER_BEST_H_SEMANTIC_ID, resolveHeaterTypeIconSrc, resolveHeaterTypeLabel } from "./hs-heater-result-config";
import type { HeaterTypeSemanticId } from "../../../types/data-types/hs-heater-types";
export type { HeaterTypeSemanticId } from "../../../types/data-types/hs-heater-types";

export type HeaterIconOverrideChangeListener = (semanticId: string) => void;
export type HeaterTypeDropdownOption = {
    semanticId: HeaterTypeSemanticId;
    label: string;
};

const HEATER_RESULT_ICON_STORAGE_KEY = 'hs-heater-result-icons';
let heaterIconOverrides: Record<string, string> = {};
let didLoadHeaterIconOverrides = false;
const overrideChangeListeners = new Set<HeaterIconOverrideChangeListener>();


// ================================================================
// Icon override persistence / listener plumbing
// ================================================================

function loadHeaterIconOverrides(): void {
    try {
        const raw = localStorage.getItem(HEATER_RESULT_ICON_STORAGE_KEY);
        heaterIconOverrides = raw ? JSON.parse(raw) as Record<string, string> : {};
    } catch (error) {
        HSUI.Notify('Failed to load heater icon overrides.', { notificationType: 'warning' });
        heaterIconOverrides = {};
    }
}

function saveHeaterIconOverrides(): void {
    try {
        localStorage.setItem(HEATER_RESULT_ICON_STORAGE_KEY, JSON.stringify(heaterIconOverrides));
    } catch (error) { HSUI.Notify('Failed to save heater icon overrides.', { notificationType: 'warning' }); }
}

function ensureHeaterIconOverridesLoaded(): void {
    if (didLoadHeaterIconOverrides) return;
    loadHeaterIconOverrides();
    didLoadHeaterIconOverrides = true;
}

function notifyOverrideChange(semanticId: string): void {
    overrideChangeListeners.forEach((listener) => {
        try {
            listener(semanticId);
        } catch (error) { console.error('Heater icon override listener threw:', error); }
    });
}


// ================================================================
// Public heater icon helper API
// ================================================================

export function getHeaterTypeDropdownOptionsWithIcons(): HeaterTypeDropdownOption[] {
    const options: HeaterTypeDropdownOption[] = [
        { semanticId: "none", label: "None" },
    ];

    for (const [key, config] of getHeaterTypeEntries()) {
        if (config.rowLabels?.length) {
            config.rowLabels.forEach((rowLabel, rowIndex) => {
                options.push({
                    semanticId: buildHeaterTypeSemanticId(key, rowIndex),
                    label: rowLabel,
                });
            });
            if (key === "hyperflux") {
                options.push({ semanticId: HEATER_BEST_H_SEMANTIC_ID, label: resolveHeaterTypeLabel(HEATER_BEST_H_SEMANTIC_ID)! });
            }
            continue;
        }

        options.push({ semanticId: key as HeaterTypeSemanticId, label: config.label });
    }
    return options;
}

function getDefaultHeaterIconSrc(semanticId: string): string | null {
    return resolveHeaterTypeIconSrc(semanticId);
}

export function getOverrideHeaterIconSrc(semanticId: string): string | null {
    ensureHeaterIconOverridesLoaded();
    return heaterIconOverrides[semanticId] ?? null;
}

export function getEffectiveHeaterIconSrc(semanticId: string): string | null {
    return getOverrideHeaterIconSrc(semanticId) ?? getDefaultHeaterIconSrc(semanticId);
}

export function setHeaterIconOverride(semanticId: string, iconUrl: string): void {
    if (!semanticId || semanticId === 'none') return;
    ensureHeaterIconOverridesLoaded();
    heaterIconOverrides[semanticId] = iconUrl;
    saveHeaterIconOverrides();
    notifyOverrideChange(semanticId);
}

export function clearHeaterIconOverride(semanticId: string): void {
    if (!semanticId || semanticId === 'none') return;
    ensureHeaterIconOverridesLoaded();
    if (!(semanticId in heaterIconOverrides)) return;
    delete heaterIconOverrides[semanticId];
    saveHeaterIconOverrides();
    notifyOverrideChange(semanticId);
}

export function subscribeHeaterIconOverrideChanges(listener: HeaterIconOverrideChangeListener): void {
    overrideChangeListeners.add(listener);
}

export function unsubscribeHeaterIconOverrideChanges(listener: HeaterIconOverrideChangeListener): void {
    overrideChangeListeners.delete(listener);
}
