import type { HeaterCoinRuneInput, HeaterCoinsC15Input } from '../../../types/data-types/hs-heater-coins-types';
import { AntUpgrades } from '../../../types/data-types/hs-gamedata-api-types';
import type { GameData } from '../../../types/data-types/hs-player-savedata';
import type { HSGameDataAPI } from './hs-gamedata-api';
import { parseGameDataDecimal } from './hs-gamedata-utils';
import { heaterCoinRunePurchasedLevel } from '../../hs-modules/hs-heater/hs-heater-coins';

/** Statistics.ts allTaxExponentStats/allGlobalSpeedStats, evaluated in C15 for this build only. */
export function buildHeaterCoinsC15Input(api: HSGameDataAPI, data: GameData, tokens: number): HeaterCoinsC15Input {
    // Keep the exported save intact. Nested challenges and other ascension challenges must not leak into this build.
    data = { ...data, currentChallenge: { transcension: 0, reincarnation: 0, ascension: 15 } };
    api = api.createCalculationSnapshot(data);
    const research = (index: number) => data.researches[index] ?? 0;
    const cube = (index: number) => data.cubeUpgrades[index] ?? 0;
    const platonic = (index: number) => data.platonicUpgrades[index] ?? 0;
    const challenge = (index: number) => data.challengecompletions[index] ?? 0;
    const log1p = (value: Parameters<typeof parseGameDataDecimal>[0]) => parseGameDataDecimal(value).plus(1).log10();
    const power = api.talisman.allTalismanRuneBonusStatsSum('true_base');
    const currentTalismans = api.talisman.getRuneBonusFromAllTalismansBatch();
    const baseTalismans = api.talisman.getRuneBonusFromAllTalismansBatch('true_base');
    const runes = {} as HeaterCoinsC15Input['runes'];
    for (const key of ['speed', 'duplication', 'thrift', 'horseShoe'] as const) {
        const definition = api.rune.runes[key];
        runes[key] = {
            exp: parseGameDataDecimal(data.runes[key]).toString(),
            costCoefficient: definition.costCoefficient.toString(),
            levelsPerOOM: key === 'horseShoe' ? api.rune.getLevelsPerOOM(key) : api.rune.getLevelsPerOOM(key, 'true_base'),
            freeLevelsWithoutTalismans: api.rune.getRuneFreeLevels(key) - currentTalismans[key],
            talismanLevelsPerPower: power > 0 ? baseTalismans[key] / power : 0,
            effectiveLevelMultiplier: definition.effectiveLevelMult(),
            unlocked: definition.isUnlocked(data),
        } satisfies HeaterCoinRuneInput;
    }
    const taxBlessingFactor = Math.log10(1 + (data.platonicBlessings.taxes ?? 0)) ** 1.5;
    const taxBlessing = taxBlessingFactor / (125 + taxBlessingFactor);
    // campaignTokenBonuses.tax (Campaign.ts): counts at most 8,000 tokens
    const taxTokens = Math.min(tokens, 8000);
    const campaignTax = tokens >= 250 && challenge(13) > 0
        ? 1 - 0.05 / 250 * Math.min(taxTokens - 250, 250) - 0.05 * Math.log2(Math.max(taxTokens, 500) / 500) : 1;
    const taxes = [
        1 + api.talisman.getTalismanEffects('exemption').taxReduction,
        data.currentChallenge.reincarnation === 6 ? 3 * (1 + challenge(6) / 25) ** 2 : 1,
        data.currentChallenge.reincarnation === 9 ? 0.005 : 1,
        0.000005,
        challenge(6) > 0 ? 1 / 1.075 : 1,
        0.965 ** challenge(6),
        0.966 ** challenge(13),
        api.calculateChallenge15Reward('taxes'),
        (1 - 0.06 * research(51)) * (1 - 0.05 * research(52)) * (1 - 0.05 * research(53))
            * (1 - 0.05 * research(54)) * (1 - 0.05 * research(55)),
        0.98 ** (3 / 5 * log1p(data.rareFragments) * research(159)),
        1 - 0.666 * research(200) / 100000,
        api.antUpgrade.getAntUpgradeEffectValue(AntUpgrades.Taxes, 'taxReduction'),
        1 / (1 + log1p(data.ascendShards)) ** (1 + challenge(10) * (data.upgrades[125] ?? 0) / 300
            + 0.1 * platonic(5) + 0.2 * platonic(10) + taxBlessing),
        data.upgrades[121] > 0 ? 0.5 : 1,
        1 - 0.666 * cube(50) / 100000,
        Number(api.achievement.AchRewards.taxReduction()),
        campaignTax,
        1 / api.purple.getPurpleAmbrosiaUpgradeEffects('taurus', 'taxDivisor'),
        data.highestSingularityCount >= 281 ? 0.5 : 1,
    ];
    const blessingLevel = heaterCoinRunePurchasedLevel(parseGameDataDecimal(data.runeBlessings.speed), 1e6, 4);
    const spiritLevel = heaterCoinRunePurchasedLevel(parseGameDataDecimal(data.runeSpirits.speed), 1e45, 2);
    const blessingCoefficient = blessingLevel / 1e6 * (1 + 6.9 * research(134) / 100)
        * api.talisman.getTalismanEffects('midas').blessingBonus
        * (1 + 0.1 * log1p(data.epicFragments) * research(174))
        * (1 + 2 * research(194) / 100) * (1 + 0.25 * research(160))
        * api.calculateChallenge15Reward('blessingBonus');
    const spiritCoefficient = spiritLevel / 777777 / 100 * blessingLevel
        * (1 + 8 * research(164) / 100) * (research(165) ? 2 : 1)
        * (1 + 0.15 * log1p(data.legendaryFragments) * research(189))
        * (1 + 2 * research(194) / 100) * api.calculateChallenge15Reward('spiritBonus') * 3;
    const blessing = (count: number, effect: number, dr: number) =>
        1 + effect * (count < 1000 ? count : 1000 ** (1 - dr) * count ** dr);
    const hyperSpeed = blessing(data.hypercubeBlessings.globalSpeed ?? 0,
        api.calculateHypercubeBlessingMultiplierPlatonicBlessing() / 1000, 1 / 64);
    const tesseractSpeed = blessing(data.tesseractBlessings.globalSpeed ?? 0, hyperSpeed / 1000, 1 / 32);
    const cubeSpeedCount = data.cubeBlessings.globalSpeed ?? 0;
    const extraDR = cube(34) / 1600;
    const cubeSpeed = cubeSpeedCount < 1000 ? (1 + tesseractSpeed / 1000 * cubeSpeedCount) ** (1 + extraDR)
        : Math.min(1e300, 1 + 1000 ** (1 - 1 / 16 + extraDR) * tesseractSpeed / 1000 * cubeSpeedCount ** (1 / 16 + extraDR));
    const purpleLevel = api.purple.getPurpleReactorUpgradeLevel('lifetimeHoneyGlobalSpeed');
    const speedFactors = [
        1 + log1p(data.maxObtainium) * (data.upgrades[70] ?? 0) / 300,
        1 + research(121) / 50,
        1 + 0.015 * research(136),
        1 + 0.012 * research(151),
        1 + 0.009 * research(166),
        1 + 0.006 * research(181),
        1 + 0.003 * research(196),
        cubeSpeed,
        1 + cube(18) / 5,
        api.antUpgrade.getAntUpgradeEffectValue(AntUpgrades.Mortuus, 'globalSpeed'),
        api.talisman.getTalismanEffects('chronos').globalSpeed,
        api.calculateChallenge15Reward('globalSpeed'),
        1 + 0.01 * cube(52),
        1e-24,
        1 + +(purpleLevel > 0) * (0.1 + 0.01 * purpleLevel) * Math.log(1 + (data.purpleReactor?.lifetimePurpleHoney ?? 0) / 100),
    ];
    return {
        runes,
        baselineCoefficientModuleLevel: api.ambrosia.getAmbrosiaUpgradeEffects('ambrosiaRuneOOMBonus', 'true_base').runeOOMBonus,
        baselineTalismanModuleLevel: api.ambrosia.getAmbrosiaUpgradeEffects('ambrosiaTalismanBonusRuneLevel', 'true_base').talismanBonusRuneLevel * 200,
        taxExponentWithoutRunes: taxes.reduce((value, factor) => value * factor, 1),
        taxmanMultiplier: (data.unlocks.ascensions ? 4 : 1) * ((data.highestchallengecompletions[14] ?? 0) > 0 ? 5 : 1),
        globalSpeedLog10WithoutRunesAndBrick: speedFactors.reduce((value, factor) => value + Math.log10(factor), 0),
        speedBlessingPerRuneLevel: blessingCoefficient,
        speedSpiritPerRuneLevel: spiritCoefficient,
        slowGlobalSpeedPower: 1 - platonic(7) / 20,
        horseShoeShopLevel: api.getSingularityChallengeEffect('barDependence', 'shopUpgrade') ? data.shopUpgrades.shopHorseShoe : 0,
        noOcteractsCompletions: data.singularityChallenges.noOcteracts.completions,
        challenge9: data.currentChallenge.reincarnation === 9,
    };
}
