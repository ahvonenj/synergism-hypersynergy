import { HSGlobal } from "../hs-global";
import { HSLogger } from "../hs-logger";
import { HSStorage } from "../hs-storage";
import { HSTooltip } from "../hs-tooltip";
import { HSUI } from "../hs-ui";
import { HSBackup } from "../hs-backup";

import { HSModuleRegistry } from "../module/hs-module-registry";

import devToolsCSS from "inline:../../../resource/css/module/hs-dev-tools.css";

type HSDevValueKind = 'number' | 'decimal' | 'quarks' | 'cube' | 'boolean' | 'string';

interface HSDevRowDefinition {
    label: string;
    // Path into the player object, e.g. "hepteracts.quark.BAL"
    path: string;
    // Amounts get a suggested value (5 exponents above the current one); levels and counts don't
    suggest: boolean;
    pinned?: boolean;
}

interface HSDevRow {
    def: HSDevRowDefinition;
    current: HTMLElement;
    input: HTMLInputElement;
}

interface HSDevLeaf {
    parent: any;
    key: string;
    value: unknown;
    kind: HSDevValueKind;
}

interface HSDevStoredData {
    pinned: string[];
    freePath: string;
    // Restore moves the save's clock fields to now: no offline progress, same code timers, no daily reset
    skipOfflineProgress: boolean;
}

// What the snapshot list shows: a stored snapshot without its save
interface HSDevSnapshotInfo {
    id?: number;
    // Automatic ones (before the first edit, before a restore) are thinned out; named ones are kept
    kind: 'auto' | 'named';
    date: number;
    // When it was taken for an automatic one, the name the player gave for a named one
    label: string;
    singularity?: number;
}

interface HSDevSnapshot extends HSDevSnapshotInfo {
    // The save as the game serializes it (JSON, before its base64 encoding)
    save: string;
}

const STORAGE_KEY = 'dev-tools';
const SNAPSHOT_DB = 'hs-dev-tools';
const SNAPSHOT_STORE = 'snapshots';
const AUTO_SNAPSHOTS_KEPT = 5;
const REFRESH_MS = 500;
const SUGGESTION_EXPONENT_STEP = 5;
// The game caps cubes at 1e300, and a plain number ends at 1.8e308
const MAX_NUMBER_EXPONENT = 300;
const NUMERIC_INPUT = /^-?\d+(\.\d+)?(e[+-]?\d+)?$/i;
// The two singularity counts are kept in line with each other when one is set
const SINGULARITY_PATH = 'singularityCount';
const HIGHEST_SINGULARITY_PATH = 'highestSingularityCount';

// Shown behind the "?" of the Snapshots title: what can't be seen on screen
const SNAPSHOT_RULES = [
    `Automatic: taken before the first edit and before each restore. Only the last ${AUTO_SNAPSHOTS_KEPT} are kept.`,
    'Named: kept until you delete it. Saving under the same name replaces it.',
    'Import (⬆): a game export or a mod backup, added as a named snapshot under its file name (the list date is when it was saved).',
    'Restore keeps the current state as an automatic snapshot, then reloads the page.',
    'Skip offline progress (ticked): the state loads as it was saved, with the same Add and Time code timers and no daily reset. Unticked: loads as the game loads any save.',
    'Restore is refused while Auto-Sing is active.',
    'Stored in this browser only: the browser and Steam each have their own list.',
];

const ROW_GROUPS: { title: string, rows: HSDevRowDefinition[] }[] = [
    {
        title: 'Resources',
        rows: [
            { label: 'Quarks', path: 'worlds', suggest: true },
            { label: 'Golden Quarks', path: 'goldenQuarks', suggest: true },
            { label: 'Wow Cubes', path: 'wowCubes', suggest: true },
            { label: 'Tesseracts', path: 'wowTesseracts', suggest: true },
            { label: 'Hypercubes', path: 'wowHypercubes', suggest: true },
            { label: 'Platonic Cubes', path: 'wowPlatonicCubes', suggest: true },
            { label: 'Hepteracts', path: 'wowAbyssals', suggest: true },
            { label: 'Octeracts', path: 'wowOcteracts', suggest: true },
        ]
    },
    {
        title: 'Ambrosia',
        rows: [
            { label: 'Ambrosia', path: 'ambrosia', suggest: true },
            { label: 'Lifetime Ambrosia', path: 'lifetimeAmbrosia', suggest: true },
            { label: 'Red Ambrosia', path: 'redAmbrosia', suggest: true },
            { label: 'Lifetime Red Ambrosia', path: 'lifetimeRedAmbrosia', suggest: true },
        ]
    },
    {
        // Written into the running game, as the game's Elevator does going down and autosing at each singularity.
        // What the highest one unlocks is shown or hidden again by the game at the next tab change.
        title: 'Singularity (no reset; unlocks refresh at the next tab change)',
        rows: [
            { label: 'Singularity', path: SINGULARITY_PATH, suggest: false },
            { label: 'Highest singularity', path: HIGHEST_SINGULARITY_PATH, suggest: false },
        ]
    },
    {
        title: 'Other',
        rows: [
            { label: 'Cx11 level (0 to 100)', path: 'cubeUpgrades.61', suggest: false },
            { label: 'C15 score (exponent: 60 = 1e60)', path: 'challenge15Exponent', suggest: false },
        ]
    },
];

/**
 * Class: HSDevTools
 * IsExplicitHSModule: No
 * Description:
 *     Dev builds only: rows on the Debug tab that edit the live player object (quarks, cubes, hepteracts,
 *     ambrosia, any field by path), to set up a save for a test, and snapshots of the save to go back to
 *     (automatic and named, restored through HSBackup with a page reload).
 *     Never reaches players: its only use is under `if (HS_DEV_BUILD)`, a build-time constant that is false
 *     in the release build, so esbuild drops this file from the release bundle (the release build checks it).
 *     For that to hold, keep this class free of static fields and of imports that run code when loaded.
 * Author: Shewchou
 */
export class HSDevTools {
    #context = 'HSDevTools';

    #root?: HTMLElement;
    #rows: HSDevRow[] = [];
    #pinnedHolder?: HTMLElement;
    #snapshotStatus?: HTMLElement;
    #snapshotList?: HTMLElement;
    #snapshotListGeneration = 0;
    #restoring = false;
    #freePath?: HTMLInputElement;
    #freeCurrent?: HTMLElement;

    #data: HSDevStoredData = { pinned: [], freePath: '', skipOfflineProgress: true };

    // Taken before the first edit of the session (a page load)
    #sessionSnapshot?: HSDevSnapshot;
    // The player chose to edit without a snapshot, after the capture failed
    #snapshotWaived = false;

    /** Adds the dev tools at the end of the Debug tab's grid. */
    build(parent: HTMLElement): void {
        this.#loadData();
        HSUI.injectStyle(devToolsCSS, 'hs-dev-tools-css');

        const root = this.#el('div', 'hs-panel-grid-full-span');
        root.id = 'hs-dev-tools';
        this.#root = root;

        root.append(this.#el('div', 'hs-panel-grid-section-header', 'Dev tools (dev build only)'));
        root.append(this.#buildSnapshotStatus());
        const snapshotsTitle = this.#el('div', 'hs-dev-tools-group hs-dev-tools-snapshots-title');
        const snapshotsTitleText = this.#el('span', '', 'Snapshots');
        snapshotsTitleText.append(this.#help(SNAPSHOT_RULES));
        snapshotsTitle.append(snapshotsTitleText, this.#buildSkipOfflineCheckbox());
        root.append(snapshotsTitle);
        root.append(this.#buildSnapshotNameRow());
        this.#snapshotList = this.#el('div', 'hs-dev-tools-snapshots');
        root.append(this.#snapshotList);
        void this.#renderSnapshotList();

        // Same actions from the console, so a test list can give a one-liner
        const hsDev: Record<string, unknown> = {
            snapshot: (name: string) => this.#saveNamedSnapshot(String(name)),
            restore: (name: string) => this.#restoreNamed(String(name)),
        };
        (window as any).hsDev = hsDev;

        if (!HSGlobal.exposedPlayer) {
            root.append(this.#el('div', '', 'No player object: these tools need the patched game.'));
            parent.append(root);
            return;
        }

        const hepteractRows: HSDevRowDefinition[] = [];
        for (const craft of Object.keys(HSGlobal.exposedPlayer.hepteracts ?? {})) {
            hepteractRows.push({ label: `${craft}: balance`, path: `hepteracts.${craft}.BAL`, suggest: true });
            hepteractRows.push({ label: `${craft}: cap expansions`, path: `hepteracts.${craft}.TIMES_CAP_EXTENDED`, suggest: false });
        }

        const groups = [...ROW_GROUPS];
        groups.splice(1, 0, { title: 'Hepteract crafts (each cap expansion doubles the cap)', rows: hepteractRows });
        for (const group of groups) {
            root.append(this.#el('div', 'hs-dev-tools-group', group.title));
            for (const def of group.rows) root.append(this.#buildRow(def));
        }

        root.append(this.#el('div', 'hs-dev-tools-group', 'Code timers'));
        const timers = this.#el('div', 'hs-dev-tools-buttons');
        timers.append(
            this.#button('Reset Add code timer', () => this.set('rngCode', '0', 'Add code timer')),
            this.#button('Reset Time code timer', () => this.set('promoCodeTiming.time', '0', 'Time code timer')),
        );
        root.append(timers);

        root.append(this.#el('div', 'hs-dev-tools-group', 'GDS source (back to the live player at a reload)'));
        root.append(this.#buildGDSSourceRow());

        root.append(this.#el('div', 'hs-dev-tools-group', 'Any player field (path, then value)'));
        root.append(this.#buildFreeRow());

        this.#pinnedHolder = this.#el('div', '');
        root.append(this.#pinnedHolder);
        this.#renderPinnedRows();

        parent.append(root);

        hsDev.get = (path: string) => {
            const leaf = this.#resolve(path);
            return typeof leaf === 'string' ? leaf : leaf.value;
        };
        hsDev.set = (path: string, value: unknown) => this.set(path, String(value));

        this.#refresh();
        window.setInterval(() => this.#refresh(), REFRESH_MS);
    }

    /**
     * Writes a value into the player object. Refused when the path doesn't lead to an existing single value,
     * so a typo can't create a field. The first edit of the session takes a snapshot of the save first.
     */
    set(path: string, text: string, label = path): boolean {
        const value = text.trim();
        if (value === '') return this.#fail('Type a value first');

        const leaf = this.#resolve(path);
        if (typeof leaf === 'string') return this.#fail(leaf);

        const key = this.#normalizePath(path);
        const isSingularity = key === SINGULARITY_PATH || key === HIGHEST_SINGULARITY_PATH;
        if (isSingularity && !/^\d+$/.test(value)) return this.#fail('A singularity is a whole number, 0 or more');

        if (!this.#ensureSnapshot()) return false;

        const before = this.#format(leaf);
        const error = this.#write(leaf, value);
        if (error) return this.#fail(error);

        const after = this.#resolve(path);
        HSLogger.log(`${label}: ${before} -> ${typeof after === 'string' ? '?' : this.#format(after)}`, this.#context);
        if (isSingularity) this.#alignSingularityCounts(key);
        this.#refresh();
        return true;
    }

    /**
     * The current singularity is never above the highest one: setting one moves the other when needed.
     * The game does the same on its own once Antiquities is bought, by raising the highest.
     * Allowed inside an Exalt too (an easier one for a test): there the game sets the count from the Exalt's
     * requirement when it is entered and at every load, so an edit lasts until the next reload.
     */
    #alignSingularityCounts(setKey: string): void {
        const player = HSGlobal.exposedPlayer as any;
        if (!player || player.singularityCount <= player.highestSingularityCount) return;

        if (setKey === SINGULARITY_PATH) {
            player.highestSingularityCount = player.singularityCount;
            HSLogger.log(`Highest singularity raised to ${player.singularityCount}`, this.#context);
        } else {
            player.singularityCount = player.highestSingularityCount;
            HSLogger.log(`Singularity lowered to ${player.highestSingularityCount}`, this.#context);
        }
    }

    #fail(message: string): false {
        HSLogger.warn(message, this.#context);
        void HSUI.Notify(message, { notificationType: 'error' });
        return false;
    }

    // ===================================
    // --- Reading and writing values ----
    // ===================================

    #normalizePath(path: string): string {
        const keys = path.trim().replace(/\[(\w+)\]/g, '.$1').split('.').filter(key => key !== '');
        if (keys[0] === 'player') keys.shift();
        return keys.join('.');
    }

    /** The value at the end of a path, with what holds it, or the reason why there's none. */
    #resolve(path: string): HSDevLeaf | string {
        const player = HSGlobal.exposedPlayer;
        if (!player) return 'No player object: the game is not patched';

        const keys = this.#normalizePath(path).split('.');
        if (keys[0] === '') return 'Empty path';

        // Own properties only, so "constructor" or "__proto__" lead nowhere
        const has = (holder: object, key: string) => Object.prototype.hasOwnProperty.call(holder, key);

        let parent: any = player;
        for (let i = 0; i < keys.length - 1; i++) {
            const next = has(parent, keys[i]) ? parent[keys[i]] : undefined;
            if (next === null || typeof next !== 'object') return `No object at "${keys.slice(0, i + 1).join('.')}"`;
            parent = next;
        }

        const key = keys[keys.length - 1];
        if (!has(parent, key)) return `No field "${keys.join('.')}"`;

        const value = parent[key];
        const kind = this.#kindOf(value);
        if (!kind) return `"${keys.join('.')}" is not a single value`;

        return { parent, key, value, kind };
    }

    #kindOf(value: unknown): HSDevValueKind | null {
        if (typeof value === 'number') return 'number';
        if (typeof value === 'boolean') return 'boolean';
        if (typeof value === 'string') return 'string';
        if (value === null || typeof value !== 'object') return null;

        const holder = value as any;
        // The game's Decimal (coins, offerings, obtainium...)
        if (typeof holder.mantissa === 'number' && typeof holder.exponent === 'number') return 'decimal';
        // The game's QuarkHandler and Cube classes keep their amount private, behind add() and sub()
        if (typeof holder.add !== 'function' || typeof holder.sub !== 'function' || typeof holder.valueOf() !== 'number') return null;
        return typeof holder.applyBonus === 'function' && typeof holder.reset === 'function' ? 'quarks' : 'cube';
    }

    /** Writes the typed text into the leaf. Returns why it was refused, or null once written. */
    #write(leaf: HSDevLeaf, text: string): string | null {
        if (leaf.kind === 'string') {
            leaf.parent[leaf.key] = text;
            return null;
        }
        if (leaf.kind === 'boolean') {
            if (text !== 'true' && text !== 'false') return 'This field takes true or false';
            leaf.parent[leaf.key] = text === 'true';
            return null;
        }

        if (!NUMERIC_INPUT.test(text)) return `"${text}" is not a number (examples: 1500, 2.5e12)`;

        if (leaf.kind === 'decimal') {
            // The game's own Decimal class, not the mod's copy of break_infinity
            leaf.parent[leaf.key] = new (leaf.value as any).constructor(text);
            return null;
        }

        const amount = Number(text);
        if (!Number.isFinite(amount)) return `${text} is too large for this field`;

        if (leaf.kind === 'number') {
            leaf.parent[leaf.key] = amount;
            return null;
        }

        if (amount < 0) return 'This field cannot be negative';
        const holder = leaf.value as any;
        if (leaf.kind === 'quarks') {
            holder.reset();
            // No quark bonus, and not counted in the quarks of this singularity
            holder.add(amount, false, false);
        } else {
            holder.sub(holder.valueOf());
            holder.add(amount);
        }
        return null;
    }

    #format(leaf: HSDevLeaf): string {
        if (leaf.kind === 'boolean' || leaf.kind === 'string') return String(leaf.value);
        if (leaf.kind === 'decimal') {
            const { mantissa, exponent } = leaf.value as { mantissa: number, exponent: number };
            return exponent < 6 ? this.#formatNumber(mantissa * 10 ** exponent) : `${Math.round(mantissa * 100) / 100}e${exponent}`;
        }
        return this.#formatNumber(Number(leaf.value));
    }

    #formatNumber(value: number): string {
        if (!Number.isFinite(value)) return String(value);
        if (Math.abs(value) < 1e6) return String(Math.round(value * 1000) / 1000);
        const [mantissa, exponent] = value.toExponential(2).split('e');
        return `${Number(mantissa)}e${Number(exponent)}`;
    }

    /** 1 followed by the current exponent + 5 (6e7 gives 1e12). Empty for values that aren't amounts. */
    #suggest(leaf: HSDevLeaf): string {
        if (leaf.kind === 'boolean' || leaf.kind === 'string') return '';

        if (leaf.kind === 'decimal') {
            const { mantissa, exponent } = leaf.value as { mantissa: number, exponent: number };
            return `1e${(mantissa === 0 ? 0 : Math.max(0, exponent)) + SUGGESTION_EXPONENT_STEP}`;
        }

        const current = Number(leaf.value);
        // toExponential, not Math.log10: no rounding surprise on exact powers of ten
        const exponent = Number.isFinite(current) && current >= 1 ? Number(current.toExponential().split('e')[1]) : 0;
        return `1e${Math.min(exponent + SUGGESTION_EXPONENT_STEP, MAX_NUMBER_EXPONENT)}`;
    }

    // ===================
    // --- Rows and UI ---
    // ===================

    #el(tag: string, className: string, text?: string): HTMLElement {
        const element = document.createElement(tag);
        if (className) element.className = className;
        if (text !== undefined) element.textContent = text;
        return element;
    }

    #button(text: string, onClick: () => void): HTMLElement {
        const button = this.#el('div', 'hs-panel-btn hs-dev-tools-btn', text);
        button.addEventListener('click', onClick);
        return button;
    }

    /** A square button showing one symbol, its action in the tooltip. */
    #iconButton(symbol: string, title: string, onClick: () => void): HTMLElement {
        const button = this.#button(symbol, onClick);
        button.classList.add('hs-dev-tools-btn-icon');
        button.title = title;
        return button;
    }

    /** A circled "?" for a group title, showing a list of rules while the mouse is over it. */
    #help(rules: string[]): HTMLElement {
        const help = this.#el('span', 'hs-dev-tools-help', '?');
        HSTooltip.set(help, { html: HSTooltip.list(rules), delay: 0 });
        return help;
    }

    #textInput(value: string, placeholder = ''): HTMLInputElement {
        const input = document.createElement('input');
        input.type = 'text';
        input.className = 'hs-dev-tools-input';
        input.spellcheck = false;
        input.value = value;
        input.placeholder = placeholder;
        return input;
    }

    #buildRow(def: HSDevRowDefinition): HTMLElement {
        const element = this.#el('div', 'hs-dev-tools-row');

        const label = this.#el('span', 'hs-dev-tools-label', def.label);
        label.title = def.path;
        const current = this.#el('span', 'hs-dev-tools-current');
        const input = this.#textInput('');

        // An empty field uses the suggestion shown in it. Once set, the field is emptied, so the next
        // suggestion shows (from the new value). Rows without a suggestion keep what was typed.
        const set = () => {
            const done = this.set(def.path, input.value.trim() || input.placeholder, def.label);
            if (done && def.suggest) input.value = '';
        };

        input.addEventListener('keydown', (e) => { if (e.key === 'Enter') set(); });

        element.append(label, current, input, this.#button('Set', set));
        if (def.pinned) element.append(this.#button('x', () => this.#unpin(def.path)));

        this.#rows.push({ def, current, input });
        return element;
    }

    /** Switches GDS between the live player and the save, so one session can test both paths on a patched game. */
    #buildGDSSourceRow(): HTMLElement {
        const element = this.#el('div', 'hs-dev-tools-buttons');
        const module = HSModuleRegistry.getModule('HSGameData');
        const choices: Array<{ text: string, forceSave: boolean }> = [
            { text: 'Live player', forceSave: false },
            { text: 'Save (forced)', forceSave: true },
        ];
        for (const choice of choices) {
            const label = this.#el('label', 'hs-dev-tools-radio');
            const radio = document.createElement('input');
            radio.type = 'radio';
            radio.name = 'hs-dev-tools-gds-source';
            radio.checked = (module?.isSaveSourceForced() ?? false) === choice.forceSave;
            radio.addEventListener('change', () => {
                if (radio.checked) void module?.setForceSaveSource(choice.forceSave);
            });
            label.append(radio, choice.text);
            element.append(label);
        }
        return element;
    }

    #buildFreeRow(): HTMLElement {
        const element = this.#el('div', 'hs-dev-tools-row');

        const path = this.#textInput(this.#data.freePath, 'cubeUpgrades.61');
        const current = this.#el('span', 'hs-dev-tools-current');
        const input = this.#textInput('', 'value');
        this.#freePath = path;
        this.#freeCurrent = current;

        const set = () => this.set(path.value, input.value);

        path.addEventListener('input', () => {
            this.#data.freePath = path.value;
            this.#saveData();
            this.#refreshFreeRow();
        });
        input.addEventListener('keydown', (e) => { if (e.key === 'Enter') set(); });

        element.append(path, current, input, this.#button('Set', set), this.#button('Pin', () => this.#pin(path.value)));
        return element;
    }

    #renderPinnedRows(): void {
        if (!this.#pinnedHolder) return;

        this.#rows = this.#rows.filter(row => !row.def.pinned);
        this.#pinnedHolder.replaceChildren();
        if (this.#data.pinned.length === 0) return;

        this.#pinnedHolder.append(this.#el('div', 'hs-dev-tools-group', 'Pinned fields'));
        for (const path of this.#data.pinned) {
            this.#pinnedHolder.append(this.#buildRow({ label: path, path, suggest: false, pinned: true }));
        }
        this.#refresh();
    }

    #pin(rawPath: string): void {
        const path = this.#normalizePath(rawPath);
        const leaf = this.#resolve(path);
        if (typeof leaf === 'string') { this.#fail(leaf); return; }
        if (this.#rows.some(row => row.def.path === path)) { this.#fail(`"${path}" already has a row`); return; }

        this.#data.pinned.push(path);
        this.#saveData();
        this.#renderPinnedRows();
    }

    #unpin(path: string): void {
        this.#data.pinned = this.#data.pinned.filter(pinned => pinned !== path);
        this.#saveData();
        this.#renderPinnedRows();
    }

    /** Current values and suggestions, read from the live player. Does nothing while the Debug tab is hidden. */
    #refresh(): void {
        if (!this.#root?.offsetParent) return;

        for (const row of this.#rows) {
            const leaf = this.#resolve(row.def.path);
            this.#showCurrent(row.current, leaf);

            const suggestion = typeof leaf !== 'string' && row.def.suggest ? this.#suggest(leaf) : '';
            if (row.input.placeholder !== suggestion) row.input.placeholder = suggestion;
        }
        this.#refreshFreeRow();
    }

    #refreshFreeRow(): void {
        if (!this.#freePath || !this.#freeCurrent) return;
        if (this.#freePath.value.trim() === '') {
            this.#freeCurrent.textContent = '';
            this.#freeCurrent.title = '';
            return;
        }
        this.#showCurrent(this.#freeCurrent, this.#resolve(this.#freePath.value));
    }

    #showCurrent(element: HTMLElement, leaf: HSDevLeaf | string): void {
        const text = typeof leaf === 'string' ? '-' : this.#format(leaf);
        const title = typeof leaf === 'string' ? leaf : leaf.kind;
        if (element.textContent !== text) element.textContent = text;
        if (element.title !== title) element.title = title;
    }

    // ====================================
    // --- Pinned rows, remembered path ---
    // ====================================

    #loadData(): void {
        const stored = HSModuleRegistry.getModule('HSStorage')?.getData<Partial<HSDevStoredData>>(STORAGE_KEY);

        this.#data = {
            pinned: Array.isArray(stored?.pinned) ? stored.pinned : [],
            freePath: typeof stored?.freePath === 'string' ? stored.freePath : '',
            skipOfflineProgress: typeof stored?.skipOfflineProgress === 'boolean' ? stored.skipOfflineProgress : true,
        };
    }

    #saveData(): void {
        HSModuleRegistry.getModule('HSStorage')?.setData(STORAGE_KEY, this.#data);
    }

    // =================
    // --- Snapshots ---
    // =================

    #buildSnapshotStatus(): HTMLElement {
        const element = this.#el('div', 'hs-dev-tools-status');
        this.#snapshotStatus = this.#el('span', '', 'No snapshot yet: one is taken before the first edit.');
        element.append(this.#snapshotStatus, this.#button('Download latest snapshot', () => { void this.#downloadLatestSnapshot(); }));
        return element;
    }

    #buildSnapshotNameRow(): HTMLElement {
        const element = this.#el('div', 'hs-dev-tools-snapshot-new');
        const name = this.#textInput('', 'snapshot name');

        const save = async () => {
            if (await this.#saveNamedSnapshot(name.value)) name.value = '';
        };
        name.addEventListener('keydown', (e) => { if (e.key === 'Enter') void save(); });

        element.append(
            name,
            this.#button('Save', () => { void save(); }),
            this.#iconButton('⬆', 'Import a save file (game export or mod backup) as a snapshot', () => this.#chooseSnapshotFile()),
        );
        return element;
    }

    /** On the Snapshots title line: it changes what the Restore buttons below do. */
    #buildSkipOfflineCheckbox(): HTMLElement {
        const skipOfflineProgress = this.#el('label', 'hs-dev-tools-radio hs-dev-tools-skip-offline');
        skipOfflineProgress.title = 'Restore: no offline progress, same code timers, no daily reset';
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.checked = this.#data.skipOfflineProgress;
        checkbox.addEventListener('change', () => {
            this.#data.skipOfflineProgress = checkbox.checked;
            this.#saveData();
        });
        skipOfflineProgress.append(checkbox, 'Skip offline progress');
        return skipOfflineProgress;
    }

    /** Adds a save file from the disk (a game export or a mod backup) to the list, as a named snapshot under its file name. */
    #chooseSnapshotFile(): void {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json,.txt,application/json,text/plain';
        input.addEventListener('change', () => {
            const file = input.files?.[0];
            if (file) void this.#importSnapshotFile(file);
        });
        input.click();
    }

    async #importSnapshotFile(file: File): Promise<void> {
        try {
            const result = HSBackup.saveFromFile(await file.text());
            if (typeof result === 'string') {
                this.#fail(`File not imported: ${result}`);
                return;
            }

            // GDS's atob hook keeps what it decodes only for the "Load from file" button, which clears it first
            const save = atob(result.save);
            const data = JSON.parse(save);
            const label = file.name.replace(/\.[^.]+$/, '').trim() || file.name;
            const singularity = typeof data.singularityCount === 'number' ? data.singularityCount : undefined;
            // When the save was made, as for the snapshots taken here
            const date = typeof data.offlinetick === 'number' ? data.offlinetick : Date.now();

            await this.#storeSnapshot({ kind: 'named', date, label, singularity, save });
        } catch (error) {
            this.#fail(`File not imported: ${error}`);
        }
    }

    /** The current state as a snapshot, or null when the game could not save (it refuses during a time warp). */
    #captureSnapshot(kind: HSDevSnapshot['kind'], label: string): HSDevSnapshot | null {
        const save = HSBackup.captureSave();
        if (save === null) return null;

        let singularity: number | undefined;
        try {
            const count = JSON.parse(save).singularityCount;
            if (typeof count === 'number') singularity = count;
        } catch {
            // Kept without its singularity
        }

        return { kind, date: Date.now(), label, singularity, save };
    }

    /**
     * Takes the session's snapshot if there is none yet: the save as it is before the first edit.
     * Returns false when the edit should not go ahead (no snapshot, and the player said no).
     */
    #ensureSnapshot(): boolean {
        if (this.#sessionSnapshot || this.#snapshotWaived) return true;

        const snapshot = this.#captureSnapshot('auto', 'Before the first edit');
        if (!snapshot) {
            this.#snapshotWaived = window.confirm('Dev tools: the save could not be captured, so there is no snapshot to go back to.\n\nEdit anyway, for the rest of this session?');
            return this.#snapshotWaived;
        }

        this.#sessionSnapshot = snapshot;
        if (this.#snapshotStatus) {
            this.#snapshotStatus.textContent = `Snapshot taken at ${new Date(snapshot.date).toLocaleTimeString()} (Singularity ${snapshot.singularity ?? '?'}), before the first edit.`;
        }

        // The edit doesn't wait for the storage: the snapshot is also kept in memory for the download button
        void this.#storeSnapshot(snapshot);
        return true;
    }

    /** A named snapshot of the current state. A name is used once: saving under it again replaces the snapshot. */
    async #saveNamedSnapshot(name: string): Promise<boolean> {
        const label = name.trim();
        if (label === '') return this.#fail('Type a snapshot name first');

        const snapshot = this.#captureSnapshot('named', label);
        if (!snapshot) return this.#fail('No snapshot: the game could not save right now (offline progress running?)');

        return this.#storeSnapshot(snapshot);
    }

    #openSnapshotDb(): Promise<IDBDatabase> {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(SNAPSHOT_DB, 1);
            request.onupgradeneeded = () => {
                const store = request.result.createObjectStore(SNAPSHOT_STORE, { keyPath: 'id', autoIncrement: true });
                store.createIndex('kind', 'kind');
            };
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    /** Runs one transaction on the snapshot store. Resolves once it's complete, with what `work` left in `result.value`. */
    async #inSnapshotStore<T>(mode: IDBTransactionMode, work: (store: IDBObjectStore, result: { value?: T }) => void): Promise<T | undefined> {
        const db = await this.#openSnapshotDb();
        try {
            return await new Promise((resolve, reject) => {
                const transaction = db.transaction(SNAPSHOT_STORE, mode);
                const result: { value?: T } = {};
                work(transaction.objectStore(SNAPSHOT_STORE), result);

                transaction.oncomplete = () => resolve(result.value);
                transaction.onerror = () => reject(transaction.error);
                transaction.onabort = () => reject(transaction.error);
            });
        } finally {
            db.close();
        }
    }

    /** Stores a snapshot, then keeps only the last automatic ones. Returns whether it's stored. */
    async #storeSnapshot(snapshot: HSDevSnapshot): Promise<boolean> {
        try {
            await this.#inSnapshotStore('readwrite', (store) => {
                const add = () => {
                    store.add(snapshot);

                    // Keys come oldest first
                    const autoKeys = store.index('kind').getAllKeys('auto');
                    autoKeys.onsuccess = () => {
                        for (const key of autoKeys.result.slice(0, -AUTO_SNAPSHOTS_KEPT)) store.delete(key);
                    };
                };

                if (snapshot.kind !== 'named') {
                    add();
                    return;
                }

                // The ones already under this name go first. Added only once they're gone: the cursor would find the new one too.
                const named = store.index('kind').openCursor('named');
                named.onsuccess = () => {
                    const cursor = named.result;
                    if (!cursor) {
                        add();
                        return;
                    }
                    if (cursor.value.label === snapshot.label) cursor.delete();
                    cursor.continue();
                };
            });
        } catch (error) {
            this.#fail(`Snapshot not stored (${error}): download it now to keep it`);
            return false;
        }

        HSLogger.log(`Snapshot stored (${snapshot.label})`, this.#context);
        void this.#renderSnapshotList();
        return true;
    }

    /** The stored snapshots without their save, latest first. */
    async #listSnapshots(): Promise<HSDevSnapshotInfo[]> {
        const list = await this.#inSnapshotStore<HSDevSnapshotInfo[]>('readonly', (store, result) => {
            const snapshots: HSDevSnapshotInfo[] = [];
            result.value = snapshots;

            const request = store.openCursor(null, 'prev');
            request.onsuccess = () => {
                const cursor = request.result;
                if (!cursor) return;

                const { id, kind, date, label, singularity } = cursor.value as HSDevSnapshot;
                snapshots.push({ id, kind, date, label, singularity });
                cursor.continue();
            };
        });
        return list ?? [];
    }

    #storedSnapshot(id: number): Promise<HSDevSnapshot | undefined> {
        return this.#inSnapshotStore<HSDevSnapshot>('readonly', (store, result) => {
            const request = store.get(id);
            request.onsuccess = () => { result.value = request.result; };
        });
    }

    async #renderSnapshotList(): Promise<void> {
        const holder = this.#snapshotList;
        if (!holder) return;

        const generation = ++this.#snapshotListGeneration;
        let snapshots: HSDevSnapshotInfo[];
        try {
            snapshots = await this.#listSnapshots();
        } catch (error) {
            holder.textContent = `The stored snapshots could not be read: ${error}`;
            return;
        }
        // A later call is on its way with a newer list
        if (generation !== this.#snapshotListGeneration) return;

        if (snapshots.length === 0) {
            holder.textContent = 'No stored snapshot.';
            return;
        }

        holder.replaceChildren(...snapshots.map((snapshot) => {
            const id = snapshot.id as number;
            const line = this.#el('div', 'hs-dev-tools-snapshot');

            const singularity = snapshot.singularity !== undefined ? `, S${snapshot.singularity}` : '';
            const label = this.#el('span', `hs-dev-tools-label hs-dev-tools-snapshot-${snapshot.kind}`, `${snapshot.label}${singularity}`);
            label.title = label.textContent ?? '';

            const taken = new Date(snapshot.date);
            const date = this.#el('span', 'hs-dev-tools-snapshot-date');
            date.append(
                this.#el('span', '', taken.toLocaleDateString()),
                this.#el('span', '', taken.toLocaleTimeString()),
            );

            line.append(
                date,
                label,
                this.#button('Restore', () => { void this.#restore(id); }),
                this.#iconButton('⬇', 'Download', () => { void this.#downloadStored(id); }),
                this.#iconButton('×', 'Delete', () => { void this.#deleteSnapshot(snapshot); }),
            );
            return line;
        }));
    }

    async #deleteSnapshot(snapshot: HSDevSnapshotInfo): Promise<void> {
        // Automatic ones come and go; a named one was kept on purpose
        if (snapshot.kind === 'named' && !window.confirm(`Dev tools: delete the snapshot "${snapshot.label}"?`)) return;

        try {
            await this.#inSnapshotStore('readwrite', (store) => { store.delete(snapshot.id as number); });
            HSLogger.log(`Snapshot deleted (${snapshot.label})`, this.#context);
        } catch (error) {
            this.#fail(`Snapshot not deleted: ${error}`);
        }
        void this.#renderSnapshotList();
    }

    async #restoreNamed(name: string): Promise<void> {
        try {
            const snapshot = (await this.#listSnapshots()).find(stored => stored.kind === 'named' && stored.label === name.trim());
            if (snapshot) await this.#restore(snapshot.id as number);
            else this.#fail(`No snapshot named "${name}"`);
        } catch (error) {
            this.#fail(`Restore failed: ${error}`);
        }
    }

    /**
     * Loads a stored snapshot: its save is written as the game's stored save, then the page reloads (HSBackup).
     * The current state is kept as an automatic snapshot first.
     */
    async #restore(id: number): Promise<void> {
        if (this.#restoring) return;
        this.#restoring = true;
        let reloading = false;

        try {
            // Checked first, so a refused restore leaves no snapshot behind
            if (HSModuleRegistry.getModule('HSAutosing')?.isAutosingActive()) {
                this.#fail('Restore refused while Auto-Sing is active: stop it first');
                return;
            }

            const snapshot = await this.#storedSnapshot(id);
            if (!snapshot) {
                this.#fail('This snapshot is no longer stored');
                void this.#renderSnapshotList();
                return;
            }

            // Stored before the reload: the page going away would drop a write still in progress
            const current = this.#captureSnapshot('auto', 'Before a restore');
            const kept = current !== null && await this.#storeSnapshot(current);
            if (!kept && !window.confirm('Dev tools: the current state could not be kept as a snapshot.\n\nRestore anyway?')) return;

            // Ticked, the state loads as it was saved: no offline progress, same code timers, no daily reset.
            // Unticked, the game loads it as any save.
            const skipOfflineProgress = this.#data.skipOfflineProgress;
            let save = snapshot.save;
            if (skipOfflineProgress) {
                const data = JSON.parse(save);
                HSBackup.shiftSaveClock(data, Date.now(), { codeTimers: true, dailyReset: true });
                save = JSON.stringify(data);
            }

            HSLogger.log(`Restoring the snapshot "${snapshot.label}" (${new Date(snapshot.date).toLocaleString()}), ${skipOfflineProgress ? 'skipping offline progress' : 'as the game loads a save'}`, this.#context);
            const refusal = await HSBackup.importSaveAndReload(await HSBackup.encodeSave(save));
            if (refusal) this.#fail(`Snapshot not restored. ${refusal}`);
            // No refusal: the page is reloading, and a second restore must not start meanwhile
            else reloading = true;
        } catch (error) {
            this.#fail(`Restore failed: ${error}`);
        } finally {
            this.#restoring = reloading;
        }
    }

    /** Downloads the session's snapshot, or the last stored one. */
    async #downloadLatestSnapshot(): Promise<void> {
        try {
            const snapshot = this.#sessionSnapshot ?? await this.#inSnapshotStore<HSDevSnapshot>('readonly', (store, result) => {
                const request = store.openCursor(null, 'prev');
                request.onsuccess = () => { result.value = request.result?.value; };
            });

            if (snapshot) await this.#download(snapshot);
            else this.#fail('No snapshot yet');
        } catch (error) {
            this.#fail(`Snapshot download failed: ${error}`);
        }
    }

    async #downloadStored(id: number): Promise<void> {
        try {
            const snapshot = await this.#storedSnapshot(id);
            if (snapshot) await this.#download(snapshot);
            else this.#fail('This snapshot is no longer stored');
        } catch (error) {
            this.#fail(`Snapshot download failed: ${error}`);
        }
    }

    /** Downloads a snapshot as a file the game's "Load from file" reads. */
    async #download(snapshot: HSDevSnapshot): Promise<void> {
        const base64 = await HSBackup.encodeSave(snapshot.save);

        const date = new Date(snapshot.date);
        const pad = (value: number) => String(value).padStart(2, '0');
        const stamp = `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}-${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`;

        const link = document.createElement('a');
        link.href = URL.createObjectURL(new Blob([base64], { type: 'text/plain' }));
        link.download = `hs-snapshot-${stamp}.txt`;
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.setTimeout(() => URL.revokeObjectURL(link.href), 10000);

        HSLogger.log(`Snapshot downloaded (${snapshot.label}, ${date.toLocaleString()})`, this.#context);
    }
}
