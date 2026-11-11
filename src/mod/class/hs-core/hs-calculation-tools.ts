import { HSLogger } from "./hs-logger";
import { HSUI } from "./hs-ui";
import { HSUIC } from "./hs-ui-components";
import { HSModuleRegistry } from "./module/hs-module-registry";
import { HSGameDataAPI } from "./gds/hs-gamedata-api";
import { HSInputType } from "../../types/module-types/hs-ui-types";
import { HSCalculationDefinition, HSCalculationParamOption, HSCalculationParams } from "../../types/data-types/hs-gamedata-api-types";
import calculationToolsCSS from "inline:../../resource/css/module/hs-calculation-tools.css";

// Build-time injected by esbuild via `define`: false in the release build only.
declare const HS_DEV_BUILD: boolean;

const BOOLEAN_OPTIONS: HSCalculationParamOption[] = [
    { label: 'false', value: false },
    { label: 'true', value: true },
];

/**
 * Class: HSCalculationTools
 * IsExplicitHSModule: No
 * Description:
 *     The "Calculation tools" section of the Tools tab: runs a GDS calculation of HSCalculationDefinitions
 *     (toolingSupport) on a save taken at the click, and shows its result.
 *     - Each param gets a control: a select of its options (true / false for a boolean), or a number field.
 *       With supportsReduce, the first param is reduce_vals, filled by the two buttons.
 *     - Options read from the save (a corruption loadout) are read again from the save taken at the click.
 *     - Errors are shown in the result line, and logged.
 * Author: Shewchou
 */
export class HSCalculationTools {
    static #context = 'HSCalculationTools';
    static readonly #selectId = 'hs-panel-test-calc-sel';
    static readonly #paramsId = 'hs-panel-calc-params';
    static readonly #resultId = 'hs-panel-test-calc-latest';
    static readonly #reducedBtnId = 'hs-panel-test-calc-redu-btn';
    static readonly #componentsBtnId = 'hs-panel-test-calc-comps-btn';
    static readonly #dumpCacheBtnId = 'hs-panel-test-calc-cache-dump-btn';


    // ===============================
    // ------- Tools tab section -----
    // ===============================

    /** The section's grid cells, to put under its header. */
    static buildToolsSection(): string[] {
        HSUI.injectStyle(calculationToolsCSS, 'hs-calculation-tools-css');

        const definitions = HSCalculationTools.#definitions();
        if (HS_DEV_BUILD) HSCalculationTools.#checkDefinitions(definitions);

        return [
            HSUIC.Div({
                class: 'hs-panel-grid-full-span hs-panel-grid-hint',
                html: 'Runs a calculation on the current save. "(C)": can also list its components.'
            }),
            HSUIC.Select({
                class: 'hs-panel-setting-block-select-input hs-panel-grid-full-span',
                id: HSCalculationTools.#selectId,
                type: HSInputType.TEXT
            }, definitions.map((def) => ({
                text: def.supportsReduce ? `${def.calculationName} (C)` : def.calculationName,
                value: def.fnName,
            }))),
            HSUIC.Div({ id: HSCalculationTools.#paramsId, class: 'hs-panel-grid-full-span hs-calc-params' }),
            HSUIC.Button({ id: HSCalculationTools.#reducedBtnId, text: 'Calc. reduced', class: 'hs-panel-btn-auto-width' }),
            HSUIC.Button({ id: HSCalculationTools.#componentsBtnId, text: 'Calc. components', class: 'hs-panel-btn-auto-width' }),
            HSUIC.Button({ id: HSCalculationTools.#dumpCacheBtnId, text: 'Dump cache' }),
            HSUIC.Div({ id: HSCalculationTools.#resultId, class: 'hs-panel-grid-full-span hs-calc-result' }),
        ];
    }

    static bindToolsSection(): void {
        document.getElementById(HSCalculationTools.#selectId)?.addEventListener('change', () => void HSCalculationTools.#renderParams());
        document.getElementById(HSCalculationTools.#reducedBtnId)?.addEventListener('click', () => void HSCalculationTools.#run('reduced'));
        document.getElementById(HSCalculationTools.#componentsBtnId)?.addEventListener('click', () => void HSCalculationTools.#run('components'));
        document.getElementById(HSCalculationTools.#dumpCacheBtnId)?.addEventListener('click', () => HSCalculationTools.#dumpCache());

        void HSCalculationTools.#renderParams();
    }


    // ===============================
    // ------------ Params -----------
    // ===============================

    // A→Z: names start with their topic ("Ambrosia Luck: Shop Upgrade"), so related entries sit together
    static #definitions(): HSCalculationDefinition[] {
        return HSGameDataAPI.getCalculationDefinitions({ toolingSupport: "true" })
            .sort((a, b) => a.calculationName.localeCompare(b.calculationName, 'en'));
    }

    static #selectedDefinition(): HSCalculationDefinition | undefined {
        const select = document.getElementById(HSCalculationTools.#selectId) as HTMLSelectElement | null;
        return HSCalculationTools.#definitions().find((def) => def.fnName === select?.value);
    }

    // Every param but reduce_vals
    static #shownParams(definition: HSCalculationDefinition): HSCalculationParams[] {
        return definition.supportsReduce ? definition.fnParams.slice(1) : definition.fnParams;
    }

    static #paramOptions(param: HSCalculationParams): readonly HSCalculationParamOption[] | undefined {
        if (typeof param.options === 'function') {
            return param.options(HSModuleRegistry.getModule('HSGameDataAPI')?.getGameData());
        }
        return param.options ?? (param.paramType === 'boolean' ? BOOLEAN_OPTIONS : undefined);
    }

    // "ignoreTwoMind" -> "Ignore two mind", "true_base" -> "True base"
    static #paramLabel(param: HSCalculationParams): string {
        if (param.label) return param.label;
        const words = param.paramName.replace(/_/g, ' ').replace(/([a-z])([A-Z])/g, '$1 $2').toLowerCase();
        return words.charAt(0).toUpperCase() + words.slice(1);
    }

    static #paramControlId(index: number): string {
        return `hs-panel-calc-param-${index}`;
    }

    // Redrawn at each pick: one label and one control per param
    static async #renderParams(): Promise<void> {
        const container = document.getElementById(HSCalculationTools.#paramsId);
        if (!container) return;

        const definition = HSCalculationTools.#selectedDefinition();
        const params = definition ? HSCalculationTools.#shownParams(definition) : [];

        // A list read from the save needs one: none yet when GDS has been off since the page load
        const dataModule = HSModuleRegistry.getModule('HSGameDataAPI');
        if (params.some((param) => typeof param.options === 'function') && !dataModule?.getGameData()) {
            await dataModule?.getForcedGameData();
            // Another pick during the save draws its own params
            if (HSCalculationTools.#selectedDefinition() !== definition) return;
        }

        container.replaceChildren();

        params.forEach((param, index) => {
            const label = document.createElement('label');
            label.htmlFor = HSCalculationTools.#paramControlId(index);
            label.textContent = HSCalculationTools.#paramLabel(param);

            const options = HSCalculationTools.#paramOptions(param);

            let control: HTMLSelectElement | HTMLInputElement;
            if (options) {
                const select = document.createElement('select');
                select.className = 'hs-panel-setting-block-select-input';
                options.forEach((option, optionIndex) => {
                    select.add(new Option(option.label, String(optionIndex), false, option.value === param.defaultValue));
                });
                control = select;
            } else {
                control = document.createElement('input');
                control.type = 'number';
                control.className = 'hs-panel-setting-block-num-input';
                control.value = String(param.defaultValue ?? 0);
            }
            control.id = HSCalculationTools.#paramControlId(index);

            container.append(label, control);
        });
    }

    // The shown params' values in order, or undefined when a number field isn't a number.
    // Options read from the save are read again, from the save just taken: a select's value is the option's index.
    static #readParams(definition: HSCalculationDefinition): unknown[] | undefined {
        const values: unknown[] = [];
        const params = HSCalculationTools.#shownParams(definition);

        for (let index = 0; index < params.length; index++) {
            const control = document.getElementById(HSCalculationTools.#paramControlId(index)) as HTMLSelectElement | HTMLInputElement | null;
            if (!control) return undefined;

            if (control instanceof HTMLSelectElement) {
                values.push(HSCalculationTools.#paramOptions(params[index])?.[Number(control.value)]?.value);
            } else {
                const value = control.value.trim() === '' ? NaN : Number(control.value);
                if (!Number.isFinite(value)) return undefined;
                values.push(value);
            }
        }

        return values;
    }


    // ===============================
    // ------------- Run -------------
    // ===============================

    static async #run(mode: 'reduced' | 'components'): Promise<void> {
        const dataModule = HSModuleRegistry.getModule('HSGameDataAPI');
        const definition = HSCalculationTools.#selectedDefinition();
        if (!dataModule || !definition) {
            HSCalculationTools.#showError('No calculation to run');
            return;
        }

        const { fnName } = definition;
        // Components asked of a calculation without them: its reduced result, with a note
        const noComponents = mode === 'components' && !definition.supportsReduce;
        const isComponentMode = mode === 'components' && !noComponents;

        const calcFn = dataModule.getCalculationFunction(fnName);
        if (typeof calcFn !== 'function') {
            HSCalculationTools.#showError(`${fnName} is not a function`);
            return;
        }

        // A save taken now, also with GDS off or paused. The new snapshot clears the calculation cache.
        if (!await dataModule.getForcedGameData()) {
            HSCalculationTools.#showError('Could not read the save');
            return;
        }

        const params = HSCalculationTools.#readParams(definition);
        if (!params) {
            HSCalculationTools.#showError('Every number field needs a number');
            return;
        }
        const args = definition.supportsReduce ? [!isComponentMode, ...params] : params;

        let result: unknown;
        let total: unknown;
        try {
            result = calcFn(...args);
            // The function's own total, on the same save: some multiply their components, luck returns { luckBase, luckMult, luckTotal }
            if (isComponentMode) total = calcFn(true, ...params);
        } catch (err) {
            HSCalculationTools.#showError(`${fnName} failed: ${err}`);
            return;
        }

        if (isComponentMode && !HSCalculationTools.#isPlainObject(result)) {
            HSCalculationTools.#showError(`${fnName} did not return its components`);
            return;
        }

        console.log(`--- CALCULATED ${fnName} ---`, ...args);
        console.log(result);
        if (isComponentMode) console.log(total);

        const text = isComponentMode
            ? HSCalculationTools.#formatComponents(result as Record<string, unknown>, total)
            : HSCalculationTools.#formatResult(result);
        HSCalculationTools.#showResult(`Last calc result: ${text}${noComponents ? ' (no components)' : ''}`, false);
    }

    static #showError(message: string): void {
        HSLogger.warn(message, HSCalculationTools.#context);
        HSCalculationTools.#showResult(`Error: ${message}`, true);
    }

    static #showResult(text: string, isError: boolean): void {
        const resultDiv = document.getElementById(HSCalculationTools.#resultId) as HTMLDivElement | null;
        if (!resultDiv) return;

        resultDiv.innerText = text;
        resultDiv.classList.toggle('hs-calc-result-error', isError);
    }

    static #isPlainObject(value: unknown): value is Record<string, unknown> {
        return typeof value === 'object' && value !== null && !Array.isArray(value);
    }

    // A number, or an object of numbers or objects (named components; calculateLuck returns { luckBase, luckMult, luckTotal },
    // each a list of components in components mode): one key per line, a nested object's keys indented under it
    static #formatResult(result: unknown, depth = 0): string {
        if (Array.isArray(result)) return `[${result.map((value) => HSCalculationTools.#formatResult(value, depth)).join(', ')}]`;
        if (HSCalculationTools.#isPlainObject(result)) {
            const indent = '    '.repeat(depth);
            return Object.entries(result)
                .map(([key, value]) => `\n${indent}${key}: ${HSCalculationTools.#formatResult(value, depth + 1)}`)
                .join('');
        }
        return typeof result === 'number' ? HSCalculationTools.#formatNumber(result) : String(result);
    }

    // 3 decimals; scientific notation above 1e6 and below 0.01, where 3 decimals would lose the value's significant digits
    static #formatNumber(value: number): string {
        const size = Math.abs(value);
        return size > 1_000_000 || (size > 0 && size < 0.01)
            ? value.toExponential(3).replace('+', '')
            : value.toFixed(3);
    }

    // Components indented under their total. A total object (luck) gives its own keys first (luckTotal),
    // then each group of components under its subtotal (luckBase, luckMult).
    static #formatComponents(components: Record<string, unknown>, total: unknown): string {
        const format = HSCalculationTools.#formatResult;
        if (!HSCalculationTools.#isPlainObject(total)) return `\nTotal: ${format(total)}${format(components, 1)}`;

        const totalsOnly = Object.entries(total)
            .filter(([key]) => !(key in components))
            .map(([key, value]) => `\n${key}: ${format(value)}`);
        const groups = Object.entries(components)
            .map(([key, value]) => HSCalculationTools.#isPlainObject(value)
                ? `\n${key}: ${format(total[key])}${format(value, 1)}`
                : `\n${key}: ${format(value)}`);
        return [...totalsOnly, ...groups].join('');
    }

    static #dumpCache(): void {
        const dataModule = HSModuleRegistry.getModule('HSGameDataAPI');
        if (!dataModule) return;

        HSLogger.log('Calculation cache dump', HSCalculationTools.#context);
        dataModule.dumpCache();
    }


    // ===============================
    // ---------- Dev check ----------
    // ===============================

    // A misspelled fnName, or a param the Tools tab can't set, would only show when the player picks it
    static #checkDefinitions(definitions: HSCalculationDefinition[]): void {
        const dataModule = HSModuleRegistry.getModule('HSGameDataAPI');

        for (const definition of definitions) {
            if (typeof dataModule?.getCalculationFunction(definition.fnName) !== 'function') {
                HSLogger.warn(`Calculation tools: no function for ${definition.fnName}`, HSCalculationTools.#context);
            }

            const unsettable = HSCalculationTools.#shownParams(definition)
                .filter((param) => !param.options && param.paramType !== 'boolean' && param.paramType !== 'number');
            if (unsettable.length > 0) {
                HSLogger.warn(`Calculation tools: no options for ${definition.fnName}'s ${unsettable.map((param) => param.paramName).join(', ')}`, HSCalculationTools.#context);
            }
        }
    }
}
