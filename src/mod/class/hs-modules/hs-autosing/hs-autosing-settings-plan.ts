export type HSAutosingSettingValue = boolean | number | string;

export interface HSAutosingGameSetting {
    path: string;
    control: string;
    target: HSAutosingSettingValue;
    kind: 'toggle' | 'input' | 'buyAmount' | 'challenge';
    values?: readonly HSAutosingSettingValue[];
    challenge?: number;
}

export interface HSAutosingSettingsConfig {
    cubeOpeningPercent: number;
    tesseractBuyPercent: number;
    challengeStart: number;
    challengeExit: number;
    challengeEnter: number;
}

export type HSAutosingSettingsSnapshot = ReadonlyMap<string, HSAutosingSettingValue>;
export interface HSAutosingSettingChange {
    setting: HSAutosingGameSetting;
    value: HSAutosingSettingValue;
}

export const HS_AUTOSING_BUY_AMOUNTS = new Map([
    [1, 'one'], [10, 'ten'], [100, 'hundred'], [1000, 'thousand'], [10000, '10k'], [100000, '100k'],
]);

/** Saved fields and the native controls that own them. Shared by startup and restoration. */
export function getAutosingGameSettings(config: HSAutosingSettingsConfig): HSAutosingGameSetting[] {
    const settings: HSAutosingGameSetting[] = [];
    const toggle = (path: string, control: string, target: boolean) => {
        settings.push({ path, control, target, kind: 'toggle' });
    };
    for (const index of [1, 2, 3, 4, 5, 6, 7, 8, 10, 11, 12, 13, 14, 16, 17, 18, 19, 20, 22, 23, 24, 25, 26, 36, 37]) {
        toggle(`toggles.${index}`, `toggle${index}`, true);
    }
    for (const index of [15, 21, 27]) toggle(`toggles.${index}`, `toggle${index}`, false);
    for (let index = 1; index <= 5; index++) toggle(`autoTesseracts.${index}`, `tesseractAutoToggle${index}`, true);
    toggle('tesseractAutoBuyerToggle', 'tesseractautobuytoggle', true);
    settings.push({ path: 'resetToggleModes.ascension', control: 'tesseractautobuymode', target: 1, values: [0, 1], kind: 'toggle' });
    for (const type of ['coin', 'prestige', 'transcend', 'reincarnate', 'generators']) {
        toggle(`shoptoggles.${type}`, `${type}AutoUpgrade`, true);
    }
    toggle('autoSacrificeToggle', 'toggleautosacrifice', true);
    toggle('autoBuyFragment', 'toggleautoBuyFragments', true);
    toggle('autoFortifyToggle', 'toggleautofortify', true);
    toggle('autoChallengeRunning', 'toggleAutoChallengeStart', false);
    toggle('researchBuyMaxToggle', 'toggleresearchbuy', true);
    toggle('autoResearchToggle', 'toggleautoresearch', true);
    settings.push({ path: 'autoResearchMode', control: 'toggleautoresearchmode', target: 'cheapest', values: ['manual', 'cheapest'], kind: 'toggle' });
    toggle('ants.toggles.autoSacrificeEnabled', 'toggleAutoSacrificeAnt', false);
    toggle('autoCubeUpgradesToggle', 'toggleAutoCubeUpgrades', true);
    toggle('autoPlatonicUpgradesToggle', 'toggleAutoPlatonicUpgrades', true);
    for (const type of ['chronos', 'hyperrealism', 'quark', 'challenge', 'abyss', 'accelerator', 'acceleratorBoost', 'multiplier']) {
        toggle(`hepteracts.${type}.AUTO`, `${type}HepteractAuto`, type !== 'quark');
    }
    toggle('overfluxOrbsAutoBuy', 'hepteractToQuarkTradeAuto', true);
    toggle('autoAscend', 'ascensionAutoEnable', false);
    const cubes = [
        ['Cubes', 'openCubes', 'cubeOpensInput'],
        ['Tesseracts', 'openTesseracts', 'tesseractsOpensInput'],
        ['Hypercubes', 'openHypercubes', 'hypercubesOpensInput'],
        ['PlatonicsCubes', 'openPlatonicCube', 'platonicCubeOpensInput'],
    ];
    for (const [type, control] of cubes) toggle(`autoOpen${type}`, control, true);
    for (const type of ['coin', 'crystal', 'mythos', 'particle', 'tesseract', 'offering']) {
        settings.push({ path: `${type}buyamount`, control: type, target: 100000, values: [...HS_AUTOSING_BUY_AMOUNTS.keys()], kind: 'buyAmount' });
    }
    for (let index = 1; index <= 10; index++) {
        settings.push({ path: `autoChallengeToggles.${index}`, control: 'toggleAutoChallengeIgnore', target: true, kind: 'challenge', challenge: index });
    }
    const input = (path: string, control: string, target: number) => {
        settings.push({ path, control, target, kind: 'input' });
    };
    for (const [type, , control] of cubes) input(`open${type}`, control, config.cubeOpeningPercent);
    input('tesseractAutoBuyerAmount', 'tesseractAmount', config.tesseractBuyPercent);
    input('autoChallengeTimer.start', 'startAutoChallengeTimerInput', config.challengeStart);
    input('autoChallengeTimer.exit', 'exitAutoChallengeTimerInput', config.challengeExit);
    input('autoChallengeTimer.enter', 'enterAutoChallengeTimerInput', config.challengeEnter);
    input('runeBlessingBuyAmount', 'buyRuneBlessingInput', 1000000);
    input('runeSpiritBuyAmount', 'buyRuneSpiritInput', 1000000);
    toggle('corruptions.autoIncrease', 'corruptionAutoIncreaseToggle', false);
    settings.push({ path: 'blueberryLoadoutMode', control: 'blueberryToggleMode', target: 'loadTree', values: ['saveTree', 'loadTree'], kind: 'toggle' });
    return settings;
}

function isValidSettingValue(setting: HSAutosingGameSetting, value: unknown): value is HSAutosingSettingValue {
    return typeof value === typeof setting.target
        && !(typeof value === 'number' && (!Number.isFinite(value) || value < 0))
        && !(setting.values && !setting.values.includes(value as HSAutosingSettingValue));
}

/** Copy only scalar settings. Never retain the player object or a save's progress. */
export function captureAutosingSettings(save: unknown, settings: readonly HSAutosingGameSetting[]): HSAutosingSettingsSnapshot {
    const snapshot = new Map<string, HSAutosingSettingValue>();
    const invalid: string[] = [];
    for (const setting of settings) {
        let value: unknown = save;
        for (const key of setting.path.split('.')) {
            value = value !== null && typeof value === 'object' && Object.hasOwn(value, key)
                ? (value as Record<string, unknown>)[key] : undefined;
        }
        if (isValidSettingValue(setting, value)) snapshot.set(setting.path, value);
        else invalid.push(setting.path);
    }
    // A missing field is an incompatible save, never a reason to click an unknown toggle.
    if (invalid.length) throw new Error(`Unrecognized saved settings: ${invalid.join(', ')}`);
    return snapshot;
}

/** The same comparison is used against AutoSing's targets and the player's original values. */
export function planAutosingSettings(
    settings: readonly HSAutosingGameSetting[], current: HSAutosingSettingsSnapshot, original?: HSAutosingSettingsSnapshot,
): HSAutosingSettingChange[] {
    return settings.flatMap(setting => {
        const value = original ? original.get(setting.path) : setting.target;
        if (value === undefined || !current.has(setting.path)) throw new Error(`Missing setting: ${setting.path}`);
        return current.get(setting.path) === value ? [] : [{ setting, value }];
    });
}

/**
 * The snapshot kept in localStorage while AutoSing runs, so that a reload or a closed game still gets the
 * player's settings back. `firstPlayed` identifies the save it belongs to.
 */
export interface HSAutosingStoredSnapshot {
    firstPlayed: string;
    game: [string, HSAutosingSettingValue][];
    hs: [string, boolean][];
}

const isPair = <T>(entry: unknown, isValue: (value: unknown) => value is T): entry is [string, T] =>
    Array.isArray(entry) && entry.length === 2 && typeof entry[0] === 'string' && isValue(entry[1]);
const isScalar = (value: unknown): value is HSAutosingSettingValue =>
    typeof value === 'boolean' || typeof value === 'string' || (typeof value === 'number' && Number.isFinite(value));
const isBoolean = (value: unknown): value is boolean => typeof value === 'boolean';

/** Undefined for anything that isn't a stored snapshot. Malformed entries are dropped, not the whole snapshot. */
export function parseStoredAutosingSnapshot(data: unknown): HSAutosingStoredSnapshot | undefined {
    if (data === null || typeof data !== 'object') return undefined;
    const { firstPlayed, game, hs } = data as Record<string, unknown>;
    if (typeof firstPlayed !== 'string' || !Array.isArray(game) || !Array.isArray(hs)) return undefined;
    return {
        firstPlayed,
        game: game.filter(entry => isPair(entry, isScalar)),
        hs: hs.filter(entry => isPair(entry, isBoolean)),
    };
}

/**
 * The original values to restore from a stored snapshot. A setting missing from it or with a value it no
 * longer accepts (a mod update changed the list) keeps its current value: never a blind click.
 */
export function mergeStoredAutosingSettings(
    settings: readonly HSAutosingGameSetting[], stored: readonly [string, HSAutosingSettingValue][], current: HSAutosingSettingsSnapshot,
): HSAutosingSettingsSnapshot {
    const storedValues = new Map(stored);
    const merged = new Map<string, HSAutosingSettingValue>();
    for (const setting of settings) {
        const value = storedValues.get(setting.path);
        const fallback = current.get(setting.path);
        if (isValidSettingValue(setting, value)) merged.set(setting.path, value);
        else if (fallback !== undefined) merged.set(setting.path, fallback);
    }
    return merged;
}
