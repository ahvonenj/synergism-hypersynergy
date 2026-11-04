import Decimal from "break_infinity.js";
import { HepteractEffectiveValues, RedAmbrosiaUpgradeCalculationCollection, SingularityChallengeDataKeys, ISingularityChallengeData, GoldenQuarkUpgradeKey, OcteractUpgradeKey, TalismanKeys, RuneKeys, SynergismLevelMilestones, SynergismLevelMilestoneDefinition, ShopUpgradeGroups, AchievementRewards } from "../../../types/data-types/hs-gamedata-api-types"
import type { GameData, SingularityChallengeRewards } from "../../../types/data-types/hs-player-savedata"

export const SHOP_UPGRADE_TYPE_KEYS: Record<ShopUpgradeGroups, string[]> = {
  [ShopUpgradeGroups.Offering]: [
    'offeringEX',
    'offeringEX2',
    'offeringEX3',
    'offeringAuto',
    'cashGrab',
    'cashGrab2',
    'shopPanthema'
  ],
  [ShopUpgradeGroups.Obtainium]: [
    'obtainiumEX',
    'obtainiumEX2',
    'obtainiumEX3',
    'obtainiumAuto',
    'cashGrab',
    'cashGrab2',
    'shopPanthema'
  ],
  [ShopUpgradeGroups.Cubes]: [
    'seasonPass',
    'seasonPass2',
    'seasonPass3',
    'seasonPassY',
    'seasonPassZ',
    'seasonPassLost',
    'seasonPassInfinity',
    'shopPanthema'
  ],
  [ShopUpgradeGroups.Speed]: [
    'chronometer',
    'chronometer2',
    'chronometer3',
    'chronometerZ',
    'shopPanthema',
    'chronometerInfinity',
  ],
  [ShopUpgradeGroups.Quark]: [
    'cubeToQuark',
    'tesseractToQuark',
    'hypercubeToQuark',
    'cubeToQuarkAll',
    'improveQuarkHept',
    'improveQuarkHept2',
    'improveQuarkHept3',
    'improveQuarkHept4',
    'improveQuarkHept5',
    'shopPanthema'
  ],
  [ShopUpgradeGroups.AmbrosiaLuck]: [
    'shopAmbrosiaLuck1',
    'shopAmbrosiaLuck2',
    'shopAmbrosiaLuck3',
    'shopAmbrosiaLuck4',
    'shopPanthema'
  ],
  [ShopUpgradeGroups.RedAmbrosiaLuck]: [
    'shopRedLuck1',
    'shopRedLuck2',
    'shopRedLuck3',
    'shopRedLuck4',
    'shopPanthema'
  ],
  [ShopUpgradeGroups.AmbrosiaGeneration]: [
    'shopAmbrosiaGeneration1',
    'shopAmbrosiaGeneration2',
    'shopAmbrosiaGeneration3',
    'shopAmbrosiaGeneration4',
    'shopPanthema'
  ],
  [ShopUpgradeGroups.InfinityUpgrades]: [
    'offeringEX3',
    'obtainiumEX3',
    'improveQuarkHept5',
    'chronometerInfinity',
    'seasonPassInfinity',
    'shopPanthema'
  ],
  [ShopUpgradeGroups.Utility]: [
    'shopTalisman',
    'infiniteAscent',
    'shopSadisticRune',
    'calculator',
    'calculator2',
    'calculator3',
    'calculator4',
    'calculator5',
    'calculator6',
    'calculator7',
    'autoWarp',
    'extraWarp',
    'powderAuto',
    'offeringAuto',
    'obtainiumAuto',
    'improveQuarkHept',
    'improveQuarkHept2',
    'improveQuarkHept3',
    'improveQuarkHept4',
    'improveQuarkHept5'
  ]
}

export const SHOP_UPGRADE_GROUPS_BY_KEY: Record<string, ShopUpgradeGroups[]> = Object.entries(SHOP_UPGRADE_TYPE_KEYS).reduce(
  (acc, [group, keys]) => {
    const groupKey = Number(group) as ShopUpgradeGroups
    for (const key of keys) {
      acc[key] = [...(acc[key] ?? []), groupKey]
    }
    return acc
  },
  {} as Record<string, ShopUpgradeGroups[]>
)

export const hepteractEffectiveValues: HepteractEffectiveValues = {
  chronos: {
    LIMIT: 1000,
    DR: 1 / 6
  },
  hyperrealism: {
    LIMIT: 1000,
    DR: 1 / 3
  },
  quark: {
    LIMIT: 1000,
    DR: 2
  },
  challenge: {
    LIMIT: 1000,
    DR: 1 / 6
  },
  abyss: {
    LIMIT: 1,
    DR: 1
  },
  accelerator: {
    LIMIT: 1000,
    DR: 0.2
  },
  acceleratorBoost: {
    LIMIT: 1000,
    DR: 0.2
  },
  multiplier: {
    LIMIT: 1000,
    DR: 0.2
  }
}

export const challenge15Rewards = {
  cube1: {
    value: 1,
    baseValue: 1,
    requirement: 750
  },
  ascensions: {
    value: 1,
    baseValue: 1,
    requirement: 1500
  },
  coinExponent: {
    value: 1,
    baseValue: 1,
    requirement: 3000
  },
  taxes: {
    value: 1,
    baseValue: 1,
    requirement: 5000
  },
  obtainium: {
    value: 1,
    baseValue: 1,
    requirement: 7500
  },
  offering: {
    value: 1,
    baseValue: 1,
    requirement: 7500
  },
  accelerator: {
    value: 1,
    baseValue: 1,
    requirement: 10000
  },
  multiplier: {
    value: 1,
    baseValue: 1,
    requirement: 10000
  },
  runeExp: {
    value: 1,
    baseValue: 1,
    requirement: 20000
  },
  runeBonus: {
    value: 1,
    baseValue: 1,
    requirement: 40000
  },
  cube2: {
    value: 1,
    baseValue: 1,
    requirement: 60000
  },
  transcendChallengeReduction: {
    value: 1,
    baseValue: 1,
    requirement: 100000
  },
  reincarnationChallengeReduction: {
    value: 1,
    baseValue: 1,
    requirement: 100000
  },
  antSpeed: {
    value: 1,
    baseValue: 1,
    requirement: 200000
  },
  bonusAntLevel: {
    value: 1,
    baseValue: 1,
    requirement: 500000
  },
  achievementUnlock: {
    value: 0,
    baseValue: 0,
    requirement: 666666
  },
  cube3: {
    value: 1,
    baseValue: 1,
    requirement: 1000000
  },
  talismanBonus: {
    value: 1,
    baseValue: 1,
    requirement: 3000000
  },
  globalSpeed: {
    value: 1,
    baseValue: 1,
    requirement: 1e7
  },
  blessingBonus: {
    value: 1,
    baseValue: 1,
    requirement: 3e7
  },
  constantBonus: {
    value: 1,
    baseValue: 1,
    requirement: 1e8
  },
  cube4: {
    value: 1,
    baseValue: 1,
    requirement: 5e8
  },
  spiritBonus: {
    value: 1,
    baseValue: 1,
    requirement: 2e9
  },
  wowCubes: {
    value: 1,
    baseValue: 1,
    requirement: 1e10
  },
  wowTesseracts: {
    value: 1,
    baseValue: 1,
    requirement: 1e10
  },
  wowHypercubes: {
    value: 1,
    baseValue: 1,
    requirement: 1e10
  },
  wowPlatonicCubes: {
    value: 1,
    baseValue: 1,
    requirement: 1e10
  },
  wowHepteracts: {
    value: 1,
    baseValue: 1,
    requirement: 1e15
  },
  wowOcteracts: {
    value: 1,
    baseValue: 1,
    requirement: 1e30
  },
  quarks: {
    value: 1,
    baseValue: 1,
    requirement: 1e11,
    HTMLColor: 'lightgoldenrodyellow'
  },
  hepteractsUnlocked: {
    value: 0,
    baseValue: 0,
    requirement: 1e15,
    HTMLColor: 'pink'
  },
  challengeHepteractUnlocked: {
    value: 0,
    baseValue: 0,
    requirement: 2e15,
    HTMLColor: 'red'
  },
  cube5: {
    value: 1,
    baseValue: 1,
    requirement: 4e15
  },
  powder: {
    value: 1,
    baseValue: 1,
    requirement: 7e15
  },
  abyssHepteractUnlocked: {
    value: 0,
    baseValue: 0,
    requirement: 1e16
  },
  exponent: {
    value: 1,
    baseValue: 1,
    requirement: 2e16
  },
  acceleratorHepteractUnlocked: {
    value: 0,
    baseValue: 0,
    requirement: 3.33e16,
    HTMLColor: 'orange'
  },
  acceleratorBoostHepteractUnlocked: {
    value: 0,
    baseValue: 0,
    requirement: 3.33e16,
    HTMLColor: 'cyan'
  },
  multiplierHepteractUnlocked: {
    value: 0,
    baseValue: 0,
    requirement: 3.33e16,
    HTMLColor: 'pink'
  },
  freeOrbs: {
    value: 0,
    baseValue: 0,
    requirement: 2e17,
    HTMLColor: 'pink',
    doNotUsePercentage: true
  },
  ascensionSpeed: {
    value: 1,
    baseValue: 1,
    requirement: 1.5e18,
    HTMLColor: 'orange'
  }
};

export const redAmbrosiaUpgradeCalculationCollection: RedAmbrosiaUpgradeCalculationCollection = {
  // Row 1
  tutorial: {
    label: `A beginner's guide`,
    costFunction: (n: number, cpl: number) => cpl + 0 * n,
    maxLevel: 100,
    costPerLevel: 1,
    effects: (n: number) => {
      const amount = Math.pow(1.01, n)
      return {
        cubeMult: amount,
        obtainiumMult: amount,
        offeringMult: amount
      }
    },
    url: 'Pictures/RedAmbrosia/RedAmbrosiaTutorial.png'
  },
  freeTutorialLevels: {
    label: 'Tutorial Module Levels',
    costFunction: (n: number, cpl: number) => cpl + n,
    maxLevel: 5,
    costPerLevel: 1,
    effects: (n: number) => {
      return {
        freeLevels: n
      }
    },
    url: 'Pictures/RedAmbrosia/RedAmbrosiaFreeTutorialLevels.png'
  },
  conversionImprovement1: {
    label: 'Luck Converter',
    costFunction: (n: number, cpl: number) => cpl * Math.pow(2, n),
    maxLevel: 5,
    costPerLevel: 5,
    effects: (n: number) => {
      return {
        conversionImprovement: -n
      }
    },
    url: 'Pictures/RedAmbrosia/RedAmbrosiaConversionImprovement1.png'
  },
  blueberryGenerationSpeed: {
    label: 'The Sands of Time',
    costPerLevel: 1,
    maxLevel: 100,
    costFunction: (n: number, cpl: number) => cpl * (n + 1),
    effects: (n: number) => {
      const val = 1 + n / 500
      return {
        blueberryGenerationSpeed: val
      }
    },
    url: 'Pictures/RedAmbrosia/RedAmbrosiaBlueberryGenerationSpeed.png'
  },
  regularLuck: {
    label: 'Ossified Blueberry Tactics',
    costPerLevel: 1,
    maxLevel: 100,
    costFunction: (n: number, cpl: number) => cpl * (n + 1),
    effects: (n: number) => {
      return {
        ambrosiaLuck: 2 * n
      }
    },
    url: 'Pictures/RedAmbrosia/RedAmbrosiaRegularLuck.png'
  },
  blueberries: {
    label: 'Berries that are... blue?',
    costFunction: (level: number, _baseCost: number) => [100000, 1400000, 3000000, 3250000, 3500000][level] ?? 0,
    maxLevel: 5,
    costPerLevel: 1e5,
    effects: (n: number) => {
      return {
        blueberries: n
      }
    },
    url: 'Pictures/RedAmbrosia/RedAmbrosiaBlueberries.png'
  },
  redAmbrosiaFreeAccumulator: {
    label: 'Red DOAa',
    costFunction: (level: number, _cpl: number) => [100, 400, 1000, 3000, 10000, 25000, 70500, 140000, 400000, 1000000][level] ?? 0,
    maxLevel: 10,
    costPerLevel: 1,
    effects: (n: number) => {
      return {
        freeAccumulatorLevels: n / 1000 + 0.01 * +(n > 0),
        freeAccumulatorLevelCapIncrease: 0.1 * n
      }
    },
    url: 'Pictures/RedAmbrosia/RedAmbrosiaRedAmbrosiaFreeAccumulator.png'
  },
  // Row 2
  freeLevelsRow2: {
    label: 'More Blueberry Luck Module Levels!',
    costPerLevel: 10,
    maxLevel: 5,
    costFunction: (n: number, cpl: number) => cpl * Math.pow(2, n),
    effects: (n: number) => {
      return {
        freeLevels: n
      }
    },
    url: 'Pictures/RedAmbrosia/RedAmbrosiaFreeLevelsRow2.png'
  },
  redAmbrosiaCube: {
    label: 'Cubes "made" of Red Ambrosia',
    costFunction: (n: number, cpl: number) => cpl * (n + 1),
    maxLevel: 1,
    costPerLevel: 500,
    effects: (n: number) => {
      return {
        unlockedRedAmbrosiaCube: n > 0
      }
    },
    url: 'Pictures/RedAmbrosia/RedAmbrosiaRedAmbrosiaCube.png'
  },
  redAmbrosiaObtainium: {
    label: 'Obtainium "made" of Red Ambrosia',
    costFunction: (n: number, cpl: number) => cpl * (n + 1),
    maxLevel: 1,
    costPerLevel: 1250,
    effects: (n: number) => {
      return {
        unlockRedAmbrosiaObtainium: n > 0
      }
    },
    url: 'Pictures/RedAmbrosia/RedAmbrosiaObtainium.png'
  },
  redAmbrosiaOffering: {
    label: 'Offering "made" of Red Ambrosia',
    costFunction: (n: number, cpl: number) => cpl * (n + 1),
    maxLevel: 1,
    costPerLevel: 4000,
    effects: (n: number) => {
      return {
        unlockRedAmbrosiaOffering: n > 0
      }
    },
    url: 'Pictures/RedAmbrosia/RedAmbrosiaOffering.png'
  },
  freeOfferingUpgrades: {
    label: 'The Feast and the Famine',
    costFunction: (level: number, _cpl: number) => [1000, 3000, 9000, 27000, 81000][level] ?? 0,
    maxLevel: 5,
    costPerLevel: 1,
    effects: (n: number) => {
      return {
        levels: n
      }
    },
    url: 'Pictures/RedAmbrosia/RedAmbrosiaFreeOfferingUpgrades.png'
  },
  // Row 3
  freeLevelsRow3: {
    label: 'More Blueberry Resource and Utility Module Levels!',
    costPerLevel: 250,
    maxLevel: 5,
    costFunction: (n: number, cpl: number) => cpl * Math.pow(2, n),
    effects: (n: number) => {
      return {
        freeLevels: n
      }
    },
    url: 'Pictures/RedAmbrosia/RedAmbrosiaFreeLevelsRow3.png'
  },
  conversionImprovement2: {
    label: 'Luck Converter II',
    costFunction: (n: number, cpl: number) => cpl * Math.pow(4, n),
    maxLevel: 3,
    costPerLevel: 200,
    effects: (n: number) => {
      return {
        conversionImprovement: -n
      }
    },
    url: 'Pictures/RedAmbrosia/RedAmbrosiaConversionImprovement2.png'
  },
  redGenerationSpeed: {
    label: 'Millenium-Aged Red Ambrosia',
    costFunction: (n: number, cpl: number) => cpl * (n + 1),
    maxLevel: 100,
    costPerLevel: 12,
    effects: (n: number) => {
      return {
        redAmbrosiaGenerationSpeed: 1 + 3 * n / 1000
      }
    },
    url: 'Pictures/RedAmbrosia/RedAmbrosiaRedGenerationSpeed.png'
  },
  redGenerationSpeed2: {
    label: 'Era of Red Ambrosia',
    costFunction: (n: number, cpl: number) => cpl * (n + 1),
    maxLevel: 250,
    costPerLevel: 240,
    effects: (n: number) => ({
      redAmbrosiaGenerationSpeed: 1 + n / 1000
    }),
    url: 'Pictures/RedAmbrosia/RedAmbrosiaRedGenerationSpeed2.png'
  },
  redLuck: {
    label: 'The Dice that Decide Your Fate',
    costFunction: (n: number, cpl: number) => cpl * (n + 1),
    maxLevel: 100,
    costPerLevel: 4,
    effects: (n: number) => {
      return {
        redAmbrosiaLuck: n
      }
    },
    url: 'Pictures/RedAmbrosia/RedAmbrosiaRedLuck.png'
  },
  salvageYinYang: {
    label: 'Yin and Yang: Salvage Edition',
    costFunction: (n: number, baseCost: number) => baseCost * (n + 1),
    maxLevel: 100,
    costPerLevel: 200,
    effects: (n: number, gameData?: GameData) => {
      const disabled = gameData?.singularityChallenges.taxmanLastStand.enabled
      return disabled
        ? { positiveSalvage: 0, negativeSalvage: 0 }
        : { positiveSalvage: 10 * n, negativeSalvage: -10 * n }
    },
    url: 'Pictures/RedAmbrosia/RedAmbrosiaSalvageYinYang.png'
  },
  freeObtainiumUpgrades: {
    label: 'Weird Science',
    costFunction: (level: number, _cpl: number) => [1500, 4500, 13500, 40500, 121500][level] ?? 0,
    maxLevel: 5,
    costPerLevel: 1,
    effects: (n: number) => {
      return {
        levels: n
      }
    },
    url: 'Pictures/RedAmbrosia/RedAmbrosiaFreeObtainiumUpgrades.png'
  },
  // Row 4
  freeLevelsRow4: {
    label: 'More Blueberry Cube Module Levels!',
    costPerLevel: 5000,
    maxLevel: 5,
    costFunction: (n: number, cpl: number) => cpl * Math.pow(2, n),
    effects: (n: number) => {
      return {
        freeLevels: n
      }
    },
    url: 'Pictures/RedAmbrosia/RedAmbrosiaFreeLevelsRow4.png'
  },
  redAmbrosiaCubeImprover: {
    label: 'Hire Red Ambrosia Artisans',
    costFunction: (n: number, cpl: number) => cpl * (n + 1),
    maxLevel: 20,
    costPerLevel: 100,
    effects: (n: number) => {
      return {
        extraExponent: 0.01 * n
      }
    },
    url: 'Pictures/RedAmbrosia/RedAmbrosiaRedAmbrosiaCubeImprover.png'
  },
  infiniteShopUpgrades: {
    label: 'Red Infinity Shop Voucher',
    costFunction: (n: number, cpl: number) => cpl + 100 * n,
    maxLevel: 40,
    costPerLevel: 200,
    effects: (n: number) => {
      return {
        freeLevels: n
      }
    },
    url: 'Pictures/RedAmbrosia/RedAmbrosiaInfiniteShopLevels.png'
  },
  redAmbrosiaAccelerator: {
    label: 'Red-Blue Ultrafusion',
    costFunction: (n: number, cpl: number) => cpl + n * 0,
    maxLevel: 100,
    costPerLevel: 1000,
    effects: (n: number) => {
      return {
        ambrosiaTimePerRedAmbrosia: 0.02 * n + 1 * +(n > 0)
      }
    },
    url: 'Pictures/RedAmbrosia/RedAmbrosiaAccelerator.png'
  },
  freeCubeUpgrades: {
    label: `Livin' in a Box`,
    costFunction: (level: number, _cpl: number) => [10000, 30000, 90000, 270000, 810000][level] ?? 0,
    maxLevel: 5,
    costPerLevel: 1,
    effects: (n: number) => {
      return {
        levels: n
      }
    },
    url: 'Pictures/RedAmbrosia/RedAmbrosiaFreeCubeUpgrades.png'
  },
  // Row 5
  viscount: {
    label: 'Viscount of Ruby Guy',
    costPerLevel: 99999,
    maxLevel: 1,
    costFunction: (n: number, cpl: number) => cpl * (n + 1),
    effects: (n: number) => {
      return {
        roleUnlock: n > 0,
        quarkBonus: 1 + 0.1 * n,
        luckBonus: 125 * n,
        redLuckBonus: 25 * n
      }
    },
    url: 'Pictures/RedAmbrosia/RedAmbrosiaTutorial.png'
  },
  freeLevelsRow5: {
    label: 'More Blueberry Quark Module Levels!',
    costPerLevel: 50000,
    maxLevel: 5,
    costFunction: (n: number, cpl: number) => cpl * Math.pow(2, n),
    effects: (n: number) => {
      return {
        freeLevels: n
      }
    },
    url: 'Pictures/RedAmbrosia/RedAmbrosiaFreeLevelsRow5.png'
  },
  conversionImprovement3: {
    label: 'Luck Converter III',
    costFunction: (n: number, cpl: number) => cpl * Math.pow(10, n),
    maxLevel: 2,
    costPerLevel: 10000,
    effects: (n: number) => {
      return {
        conversionImprovement: -n
      }
    },
    url: 'Pictures/RedAmbrosia/RedAmbrosiaConversionImprovement3.png'
  },
  blueberryGenerationSpeed2: {
    label: 'The Sands of Time II',
    costPerLevel: 8000,
    maxLevel: 250,
    costFunction: (n: number, cpl: number) => cpl + 0 * n,
    effects: (n: number) => {
      const val = 1 + n / 1000
      return {
        blueberryGenerationSpeed: val
      }
    },
    url: 'Pictures/RedAmbrosia/RedAmbrosiaBlueberryGenerationSpeed.png'
  },
  regularLuck2: {
    label: 'Ossified Blueberry Tactics II',
    costPerLevel: 8000,
    maxLevel: 250,
    costFunction: (n: number, cpl: number) => cpl + 0 * n,
    effects: (n: number) => {
      return {
        ambrosiaLuck: 2 * n
      }
    },
    url: 'Pictures/RedAmbrosia/RedAmbrosiaRegularLuck.png'
  },
  freeSpeedUpgrades: {
    label: 'The Distance',
    costFunction: (level: number, _cpl: number) => [15000, 45000, 135000, 405000, 1215000][level] ?? 0,
    maxLevel: 5,
    costPerLevel: 1,
    effects: (n: number) => {
      return {
        levels: n
      }
    },
    url: 'Pictures/RedAmbrosia/RedAmbrosiaFreeSpeedUpgrades.png'
  }
}

export const talismanMaxLevels: Record<TalismanKeys, number> = {
  exemption: 180,
  chronos: 180,
  midas: 180,
  metaphysics: 180,
  polymath: 180,
  mortuus: 180,
  plastic: 180,
  wowSquare: 210,
  achievement: 40,
  purpleGem: 6,
  cookieGrandma: 6,
  horseShoe: 12,
}

// Talisman cost bases and progression ratios mirror SynergismOfficial/src/Talismans.ts.
export const talismanBaseMultipliers: Record<TalismanKeys, string> = {
  exemption: '1',
  chronos: '10',
  midas: '1e4',
  metaphysics: '1e8',
  polymath: '1e16',
  mortuus: '100',
  plastic: '1e5',
  wowSquare: '1e5',
  achievement: '1e30',
  purpleGem: '1e1100',
  cookieGrandma: '1e1000',
  horseShoe: '1e1000',
}

export const talismanCostTypes: Record<TalismanKeys, 'regular' | 'exponential'> = {
  exemption: 'regular',
  chronos: 'regular',
  midas: 'regular',
  metaphysics: 'regular',
  polymath: 'regular',
  mortuus: 'regular',
  plastic: 'regular',
  wowSquare: 'exponential',
  achievement: 'exponential',
  purpleGem: 'exponential',
  cookieGrandma: 'exponential',
  horseShoe: 'exponential',
}

export const talismanExponentialRatios: Record<TalismanKeys, number> = {
  exemption: 1,
  chronos: 1,
  midas: 1,
  metaphysics: 1,
  polymath: 1,
  mortuus: 1,
  plastic: 1,
  wowSquare: 2,
  achievement: 10,
  purpleGem: 1e2,
  cookieGrandma: 100,
  horseShoe: 100,
}

export const getTalismanMaxLevel = (t: TalismanKeys): number => talismanMaxLevels[t] ?? 180;
export const getTalismanBaseMult = (t: TalismanKeys): string => talismanBaseMultipliers[t] ?? '1';
export const getTalismanCostType = (t: TalismanKeys): 'regular' | 'exponential' => talismanCostTypes[t] ?? 'regular';
export const getTalismanExponentialRatio = (t: TalismanKeys): number => talismanExponentialRatios[t] ?? 1;

export const synergismLevelMilestones: Record<SynergismLevelMilestones, SynergismLevelMilestoneDefinition> = {
  offeringTimerScaling: {
    effect: () => 1,
    defaultValue: 0,
    levelReq: 5
  },
  autoPrestige: {
    effect: () => 1,
    defaultValue: 0,
    levelReq: 7
  },
  speedRune: {
    effect: function (this: any) {
      return 0.5 * (this.calculateSynergismLevel() - 19)
    },
    defaultValue: 0,
    levelReq: 20
  },
  duplicationRune: {
    effect: function (this: any) {
      return 0.4 * (this.calculateSynergismLevel() - 39)
    },
    defaultValue: 0,
    levelReq: 40
  },
  prismRune: {
    effect: function (this: any) {
      return 0.3 * (this.calculateSynergismLevel() - 59)
    },
    defaultValue: 0,
    levelReq: 60
  },
  thriftRune: {
    effect: function (this: any) {
      return 0.2 * (this.calculateSynergismLevel() - 79)
    },
    defaultValue: 0,
    levelReq: 80
  },
  SIRune: {
    effect: function (this: any) {
      return 0.1 * (this.calculateSynergismLevel() - 99)
    },
    defaultValue: 0,
    levelReq: 100
  },
  tier1CrystalAutobuy: {
    effect: () => 1,
    defaultValue: 0,
    levelReq: 6
  },
  tier2CrystalAutobuy: {
    effect: () => 1,
    defaultValue: 0,
    levelReq: 9
  },
  tier3CrystalAutobuy: {
    effect: () => 1,
    defaultValue: 0,
    levelReq: 12
  },
  tier4CrystalAutobuy: {
    effect: () => 1,
    defaultValue: 0,
    levelReq: 15
  },
  tier5CrystalAutobuy: {
    effect: () => 1,
    defaultValue: 0,
    levelReq: 20
  },
  achievementTalismanUnlock: {
    effect: () => 1,
    defaultValue: 0,
    levelReq: 100
  },
  runeAutobuyImprover: {
    effect: function (this: any) {
      return 1.1 + 0.01 * (this.calculateSynergismLevel() - 130)
    },
    defaultValue: 1,
    levelReq: 130
  },
  achievementTalismanEnhancement: {
    effect: function (this: any) {
      return this.calculateSynergismLevel()
    },
    defaultValue: 0,
    levelReq: 160
  },
  salvageChallengeBuff: {
    effect: function (this: any) {
      if (!this.gameData) return 0
      const data = this.gameData
      let baseVal = 25
      if (
        data.currentChallenge.transcension !== 0
        || data.currentChallenge.reincarnation !== 0
        || data.currentChallenge.ascension !== 0
      ) {
        baseVal *= 2
      }
      if (data.currentChallenge.ascension === 15) {
        baseVal *= 2
      }
      if (data.insideSingularityChallenge) {
        baseVal *= 3
      }
      return baseVal
    },
    defaultValue: 0,
    levelReq: 180
  },
  antSpeed2Autobuyer: {
    effect: () => 1,
    defaultValue: 0,
    levelReq: 65
  },
  wowCubesAutobuyer: {
    effect: () => 1,
    defaultValue: 0,
    levelReq: 80
  },
  ascensionScoreAutobuyer: {
    effect: () => 1,
    defaultValue: 0,
    levelReq: 80
  },
  mortuus2Autobuyer: {
    effect: () => 1,
    defaultValue: 0,
    levelReq: 225
  }
}

// TODO: Add all effects (and other useful data) from singularity.ts > goldenQuarkUpgrades
const MAX_PURCHASED_UPGRADE_LEVEL = 2 ** 31 - 1

// Nonzero unlock requirements from SynergismOfficial/src/singularity.ts.
// Upgrades omitted here are available from the first Singularity.
export const goldenQuarkUpgradeMinimumSingularity: Partial<Record<GoldenQuarkUpgradeKey, number>> = {
  cookies5: 209,
  singCitadel: 100,
  singCitadel2: 204,
  octeractUnlock: 8,
  singOcteractPatreonBonus: 12,
  offeringAutomatic: 222,
  intermediatePack: 4,
  advancedPack: 9,
  expertPack: 16,
  masterPack: 25,
  divinePack: 36,
  wowPass2: 9,
  wowPass3: 83,
  potionBuff: 4,
  potionBuff2: 119,
  potionBuff3: 191,
  singChallengeExtension: 11,
  singChallengeExtension2: 26,
  singChallengeExtension3: 51,
  singQuarkImprover1: 173,
  singQuarkHepteract: 5,
  singQuarkHepteract2: 30,
  singQuarkHepteract3: 61,
  singOcteractGain: 36,
  singOcteractGain2: 36,
  singOcteractGain3: 55,
  singOcteractGain4: 77,
  singOcteractGain5: 100,
  platonicTau: 29,
  platonicAlpha: 70,
  platonicDelta: 110,
  platonicPhi: 149,
  singFastForward: 50,
  singFastForward2: 147,
  singAscensionSpeed: 128,
  singAscensionSpeed2: 147,
  ultimatePen: 300,
  halfMind: 150,
  oneMind: 162,
  wowPass4: 147,
  wowPass5: 283,
  blueberries: 215,
  singAmbrosiaLuck: 187,
  singAmbrosiaLuck2: 50,
  singAmbrosiaLuck3: 119,
  singAmbrosiaLuck4: 256,
  singAmbrosiaGeneration: 187,
  singAmbrosiaGeneration2: 50,
  singAmbrosiaGeneration3: 119,
  singAmbrosiaGeneration4: 256,
  singBonusTokens1: 1,
  singBonusTokens2: 25,
  singBonusTokens3: 100,
  singBonusTokens4: 166,
  singInfiniteShopUpgrades: 233,
  singTalismanBonusRunes1: 1,
  singTalismanBonusRunes2: 27,
  singTalismanBonusRunes3: 99,
  singTalismanBonusRunes4: 211,
  favoriteUpgrade: 2,
};

// Cost metadata mirrors SynergismOfficial/src/singularity.ts. Current saves persist
// only the cumulative investment, so the purchased level must be reconstructed.
export const goldenQuarkUpgradeMaxLevels: Record<GoldenQuarkUpgradeKey, GoldenQuarkUpgradeDef> = {
  goldenQuarks1: { maxLevel: 15, canExceedCap: true, qualityOfLife: true, costPerLevel: 12, specialCostForm: 'Default' },
  goldenQuarks2: { maxLevel: 75, canExceedCap: true, qualityOfLife: true, costPerLevel: 60, specialCostForm: 'Default' },
  goldenQuarks3: { maxLevel: 1000, costPerLevel: 1000, specialCostForm: 'Default' },
  starterPack: { maxLevel: 1, costPerLevel: 10, specialCostForm: 'Default' },
  wowPass: { maxLevel: 1, qualityOfLife: true, costPerLevel: 350, specialCostForm: 'Default' },
  cookies: { maxLevel: 1, qualityOfLife: true, costPerLevel: 100, specialCostForm: 'Default' },
  cookies2: { maxLevel: 1, qualityOfLife: true, costPerLevel: 500, specialCostForm: 'Default' },
  cookies3: { maxLevel: 1, qualityOfLife: true, costPerLevel: 24_999, specialCostForm: 'Default' },
  cookies4: { maxLevel: 1, qualityOfLife: true, costPerLevel: 499_999, specialCostForm: 'Default' },
  cookies5: { maxLevel: 1, qualityOfLife: true, costPerLevel: 1.66e15, specialCostForm: 'Default' },
  ascensions: { maxLevel: MAX_PURCHASED_UPGRADE_LEVEL, costPerLevel: 5, specialCostForm: 'Default' },
  corruptionFourteen: {
    maxLevel: 1, costPerLevel: 1000, specialCostForm: 'Default',
    effect: (n: number) => {
      return n > 0 ? 1 : 0
    },
  },
  corruptionFifteen: { maxLevel: 1, costPerLevel: 40_000, specialCostForm: 'Default', effect: (n) => n },
  singOfferings1: { maxLevel: MAX_PURCHASED_UPGRADE_LEVEL, costPerLevel: 1, specialCostForm: 'Default' },
  singOfferings2: { maxLevel: 25, canExceedCap: true, costPerLevel: 25, specialCostForm: 'Default' },
  singOfferings3: { maxLevel: 40, canExceedCap: true, costPerLevel: 500, specialCostForm: 'Default' },
  singObtainium1: { maxLevel: MAX_PURCHASED_UPGRADE_LEVEL, costPerLevel: 1, specialCostForm: 'Default' },
  singObtainium2: { maxLevel: 25, canExceedCap: true, costPerLevel: 25, specialCostForm: 'Default' },
  singObtainium3: { maxLevel: 40, canExceedCap: true, costPerLevel: 500, specialCostForm: 'Default' },
  singCubes1: { maxLevel: MAX_PURCHASED_UPGRADE_LEVEL, costPerLevel: 1, specialCostForm: 'Default' },
  singCubes2: { maxLevel: 25, canExceedCap: true, costPerLevel: 25, specialCostForm: 'Default' },
  singCubes3: { maxLevel: 40, canExceedCap: true, costPerLevel: 500, specialCostForm: 'Default' },
  singCitadel: { maxLevel: MAX_PURCHASED_UPGRADE_LEVEL, costPerLevel: 500_000, specialCostForm: 'Default' },
  singCitadel2: { maxLevel: 100, costPerLevel: 1e14, specialCostForm: 'Quadratic' },
  octeractUnlock: { maxLevel: 1, qualityOfLife: true, costPerLevel: 8888, specialCostForm: 'Default' },
  singOcteractPatreonBonus: { maxLevel: 1, costPerLevel: 9999, specialCostForm: 'Default' },
  offeringAutomatic: { maxLevel: MAX_PURCHASED_UPGRADE_LEVEL, costPerLevel: 1e14, specialCostForm: 'Default' },
  intermediatePack: {
    maxLevel: 1, costPerLevel: 1, specialCostForm: 'Default',
    effect: (n, key) => key === 'globalSpeedMult' ? (n > 0 ? 2 : 1)
      : key === 'ascensionSpeedMult' ? (n > 0 ? 1.5 : 1)
        : (n > 0 ? 0.02 : 0),
  },
  advancedPack: {
    maxLevel: 1, costPerLevel: 200, specialCostForm: 'Default',
    effect: (n, key) => key === 'cubesBanked' ? (n > 0 ? 500 : 0) : (n > 0 ? 0.04 : 0),
  },
  expertPack: {
    maxLevel: 1, costPerLevel: 800, specialCostForm: 'Default',
    effect: (n, key) => key === 'addCodeAscensionTimeMult' ? (n > 0 ? 1.2 : 1)
      : key === 'freeCorruptionLevels' ? (n > 0 ? 1 : 0)
        : (n > 0 ? 0.06 : 0),
  },
  masterPack: {
    maxLevel: 1, costPerLevel: 3200, specialCostForm: 'Default',
    effect: (n, key) => key === 'freeCorruptionLevels' ? (n > 0 ? 1 : 0) : (n > 0 ? 0.08 : 0),
  },
  divinePack: { maxLevel: 1, costPerLevel: 12_800, specialCostForm: 'Default' },
  wowPass2: { maxLevel: 1, qualityOfLife: true, costPerLevel: 12_500, specialCostForm: 'Default' },
  wowPass3: { maxLevel: 1, qualityOfLife: true, costPerLevel: 3e7 - 1, specialCostForm: 'Default' },
  potionBuff: { maxLevel: 10, canExceedCap: true, costPerLevel: 999, specialCostForm: 'Default' },
  potionBuff2: { maxLevel: 10, canExceedCap: true, costPerLevel: 1e8, specialCostForm: 'Default' },
  potionBuff3: { maxLevel: 10, canExceedCap: true, costPerLevel: 1e12, specialCostForm: 'Default' },
  singChallengeExtension: { maxLevel: 4, costPerLevel: 999, specialCostForm: 'Default' },
  singChallengeExtension2: { maxLevel: 3, costPerLevel: 29_999, specialCostForm: 'Default' },
  singChallengeExtension3: { maxLevel: 3, costPerLevel: 749_999, specialCostForm: 'Default' },
  singQuarkImprover1: { maxLevel: 30, canExceedCap: true, qualityOfLife: true, costPerLevel: 1, specialCostForm: 'Exponential2' },
  singQuarkHepteract: { maxLevel: 10, qualityOfLife: true, costPerLevel: 14_999, specialCostForm: 'Quadratic', effect: (n) => n / 100 },
  singQuarkHepteract2: { maxLevel: 10, qualityOfLife: true, costPerLevel: 449_999, specialCostForm: 'Cubic', effect: (n) => n / 100 },
  singQuarkHepteract3: { maxLevel: 10, canExceedCap: true, qualityOfLife: true, costPerLevel: 13_370_000, specialCostForm: 'Exponential2', effect: (n) => n / 200 },
  singOcteractGain: { maxLevel: MAX_PURCHASED_UPGRADE_LEVEL, costPerLevel: 20_000, specialCostForm: 'Default' },
  singOcteractGain2: { maxLevel: 25, canExceedCap: true, costPerLevel: 40_000, specialCostForm: 'Default' },
  singOcteractGain3: { maxLevel: 50, canExceedCap: true, costPerLevel: 250_000, specialCostForm: 'Default' },
  singOcteractGain4: { maxLevel: 100, canExceedCap: true, costPerLevel: 750_000, specialCostForm: 'Default' },
  singOcteractGain5: { maxLevel: 200, canExceedCap: true, costPerLevel: 7_777_777, specialCostForm: 'Default' },
  platonicTau: {
    maxLevel: 1, costPerLevel: 100_000, specialCostForm: 'Default',
    qualityOfLife: true,
    effect: (n: number, key?: string) => {
      return key === 'tauPower' ? (n > 0 ? 1.01 : 1) : +(n > 0)
    },
  },
  platonicAlpha: { maxLevel: 1, qualityOfLife: true, costPerLevel: 2e7, specialCostForm: 'Default' },
  platonicDelta: { maxLevel: 1, costPerLevel: 5e9, specialCostForm: 'Default' },
  platonicPhi: { maxLevel: 1, qualityOfLife: true, costPerLevel: 2e11, specialCostForm: 'Default' },
  singFastForward: { maxLevel: 1, qualityOfLife: true, costPerLevel: 7e6 - 1, specialCostForm: 'Default' },
  singFastForward2: { maxLevel: 1, qualityOfLife: true, costPerLevel: 1e11 - 1, specialCostForm: 'Default' },
  singAscensionSpeed: { maxLevel: 1, costPerLevel: 1e10, specialCostForm: 'Default', effect: (n) => n > 0 ? 0.03 : 0 },
  singAscensionSpeed2: { maxLevel: 30, costPerLevel: 1e12, specialCostForm: 'Exponential2', effect: (n) => 0.001 * n },
  ultimatePen: { maxLevel: 1, costPerLevel: 2.22e26, specialCostForm: 'Default' },
  halfMind: { maxLevel: 1, qualityOfLife: true, costPerLevel: 1.66e12, specialCostForm: 'Default' },
  oneMind: { maxLevel: 1, qualityOfLife: true, costPerLevel: 1.66e13, specialCostForm: 'Default', effect: (n) => +(n > 0) },
  wowPass4: { maxLevel: 1, qualityOfLife: true, costPerLevel: 66_666_666_666, specialCostForm: 'Default' },
  wowPass5: { maxLevel: 1, qualityOfLife: true, costPerLevel: 4e27, specialCostForm: 'Default' },
  blueberries: { maxLevel: 10, qualityOfLife: true, costPerLevel: 1e16, specialCostForm: 'Exponential2', effect: (n) => n },
  singAmbrosiaLuck: { maxLevel: 75, qualityOfLife: true, costPerLevel: 1e9, specialCostForm: 'Exponential2', effect: (n) => 4 * n },
  singAmbrosiaLuck2: { maxLevel: 30, qualityOfLife: true, costPerLevel: 4e5, specialCostForm: 'Default', effect: (n) => 2 * n },
  singAmbrosiaLuck3: { maxLevel: 30, qualityOfLife: true, costPerLevel: 2e8, specialCostForm: 'Default', effect: (n) => 3 * n },
  singAmbrosiaLuck4: { maxLevel: 50, qualityOfLife: true, costPerLevel: 1e19, specialCostForm: 'Default', effect: (n) => 5 * n },
  singAmbrosiaGeneration: { maxLevel: 75, qualityOfLife: true, costPerLevel: 1e9, specialCostForm: 'Exponential2', effect: (n) => 1 + n / 100 },
  singAmbrosiaGeneration2: { maxLevel: 20, qualityOfLife: true, costPerLevel: 8e5, specialCostForm: 'Default', effect: (n) => 1 + n / 100 },
  singAmbrosiaGeneration3: { maxLevel: 35, qualityOfLife: true, costPerLevel: 3e8, specialCostForm: 'Default', effect: (n) => 1 + n / 100 },
  singAmbrosiaGeneration4: { maxLevel: 50, qualityOfLife: true, costPerLevel: 1e19, specialCostForm: 'Default', effect: (n) => 1 + 2 * n / 100 },
  // Effects copied from SynergismOfficial/src/singularity.ts.
  singBonusTokens1: { maxLevel: 5, costPerLevel: 25, specialCostForm: 'Exponential2', effect: (n) => n },
  singBonusTokens2: { maxLevel: 5, costPerLevel: 10_000, specialCostForm: 'Exponential2', effect: (n) => 1 + n / 100 },
  singBonusTokens3: { maxLevel: 5, costPerLevel: 1e8, specialCostForm: 'Exponential2', effect: (n) => 2 * n },
  singBonusTokens4: { maxLevel: 30, costPerLevel: 1e13, specialCostForm: 'Exponential2', effect: (n) => 5 * n },
  singInfiniteShopUpgrades: { maxLevel: 80, costPerLevel: 1e18, specialCostForm: 'Default', effect: (n) => n },
  singTalismanBonusRunes1: {
    maxLevel: 5, costPerLevel: 25, specialCostForm: 'Default',
    effect: (n: number) => {
      return n / 100
    },
  },
  singTalismanBonusRunes2: {
    maxLevel: 5, costPerLevel: 10_000, specialCostForm: 'Default',
    effect: (n: number) => {
      return n / 100
    },
  },
  singTalismanBonusRunes3: {
    maxLevel: 5, costPerLevel: 1e8, specialCostForm: 'Default',
    effect: (n: number) => {
      return n / 100
    },
  },
  singTalismanBonusRunes4: {
    maxLevel: 10, costPerLevel: 3e15, specialCostForm: 'Default',
    effect: (n: number) => {
      return n / 100
    },
  },
  favoriteUpgrade: { maxLevel: 100, qualityOfLife: true, costPerLevel: 1, specialCostForm: 'Exponential2' },
};

const OCTERACT_BLUEBERRY_COSTS = [0, 1, 1e3, 1e9, 1e27, 1e81, 1e111]

// Cost formulae mirror SynergismOfficial/src/Octeracts.ts for saved-level reconstruction.
export const octeractUpgradeMaxLevels: Record<OcteractUpgradeKey, OcteractUpgradeDef> = {
  octeractStarter: { maxLevel: 1, costFormula: (n) => 1e-15 * n },
  octeractGain: { maxLevel: 1e8, costFormula: (n) => 1e-8 * Math.pow(n, 6) },
  octeractGain2: { maxLevel: 200_000, costFormula: (n) => 1e10 * Math.pow(10, Math.sqrt(n) / 3) * Math.sqrt(n) },
  octeractQuarkGain: {
    maxLevel: 20_000,
    costFormula: (n) => n < 1000
      ? 1e-7 * Math.pow(n, 7)
      : n < 10_000
        ? 1e14 * Math.pow(10, (n - 1000) / 1000)
        : 1e23 * Math.pow(10, (n - 10_000) / 125),
  },
  octeractQuarkGain2: { maxLevel: 5, costFormula: (n) => 1e2 * (Math.pow(1e20, n) - 1) },
  octeractCorruption: { maxLevel: 2, costFormula: (n) => 10 * (Math.pow(1e10, n) - 1) / (1e10 - 1), effect: (n: number) => n },
  octeractGQCostReduce: { maxLevel: 50, costFormula: (n) => 1e-9 * (Math.pow(2, n) - 1) },
  octeractExportQuarks: { maxLevel: 100, costFormula: (n) => Math.pow(n * (n + 1) / 2, 2) },
  octeractImprovedDaily: { maxLevel: 50, qualityOfLife: true, costFormula: (n) => 1e-3 * (Math.pow(1.6, n) - 1) / 0.6 },
  octeractImprovedDaily2: { maxLevel: 50, qualityOfLife: true, costFormula: (n) => 1e-2 * (Math.pow(2, n) - 1) },
  octeractImprovedDaily3: { maxLevel: 100, qualityOfLife: true, costFormula: (n) => 1e20 * (Math.pow(20, n) - 1) / 19 },
  octeractImprovedQuarkHept: { maxLevel: 25, costFormula: (n) => 0.1 * (Math.pow(1e3, n) - 1) / 999, effect: (n) => n / 100 },
  octeractImprovedGlobalSpeed: { maxLevel: 1000, costFormula: (n) => 1e-5 * Math.pow(n * (n + 1) / 2, 2) },
  octeractImprovedAscensionSpeed: { maxLevel: 100, costFormula: (n) => 100 * (Math.pow(10 ** (9 / 100), n) - 1) / (10 ** (9 / 100) - 1), effect: (n) => 1 + n / 2000 },
  octeractImprovedAscensionSpeed2: { maxLevel: 250, costFormula: (n) => 1e5 * (Math.pow(10 ** (12 / 250), n) - 1) / (10 ** (12 / 250) - 1), effect: (n) => 1 + n / 2000 },
  octeractImprovedFree: {
    maxLevel: 1, costFormula: (n) => 100 * n, effect: (n: number, effectKey?: string) => {
      return effectKey === 'unlocked' ? +(n > 0) : 0.6 * n
    },
  },
  octeractImprovedFree2: {
    maxLevel: 1, costFormula: (n) => 1e7 * n, effect: (n: number) => {
      return 0.05 * n
    },
  },
  octeractImprovedFree3: {
    maxLevel: 1, costFormula: (n) => 1e17 * n, effect: (n: number) => {
      return 0.05 * n
    },
  },
  octeractImprovedFree4: {
    maxLevel: 40, costFormula: (n) => 1e20 * (Math.pow(10 ** 0.5, n) - 1) / (10 ** 0.5 - 1), effect: (n: number) => {
      return 0.001 * n + ((n > 0) ? 0.01 : 0)
    },
  },
  octeractSingUpgradeCap: {
    maxLevel: 10, qualityOfLife: true, costFormula: (n) => 1e10 * (Math.pow(1e3, n) - 1) / 999,
    effect: (n: number, effectKey?: string) => {
      return effectKey === 'goldenQuarkUpgradeCapIncrease' ? n : 0
    },
  },
  octeractOfferings1: { maxLevel: 4000, costFormula: (n) => (Math.pow(10 ** (1 / 25), n) - 1) / (10 ** (1 / 25) - 1) },
  octeractObtainium1: { maxLevel: 4000, costFormula: (n) => (Math.pow(10 ** (1 / 25), n) - 1) / (10 ** (1 / 25) - 1) },
  octeractAscensions: { maxLevel: 1_000_000, costFormula: (n) => Math.pow(n * (n + 1) / 2, 2) },
  octeractAscensions2: { maxLevel: 250_000, costFormula: (n) => 1e12 * Math.pow(10, Math.sqrt(n) / 3) * Math.sqrt(n) },
  octeractAscensionsOcteractGain: { maxLevel: 100, costFormula: (n) => 1000 * (Math.pow(40, n) - 1) / 39 },
  octeractFastForward: { maxLevel: 2, costFormula: (n) => Math.pow(1e8, n) - 1 },
  octeractAutoPotionSpeed: { maxLevel: 175, costFormula: (n) => 1e-10 * (Math.pow(10, n) - 1) / 9 },
  octeractAutoPotionEfficiency: { maxLevel: 100, costFormula: (n) => 1e-10 * Math.sqrt(10) * (Math.pow(10, n) - 1) / 9 },
  octeractOneMindImprover: {
    maxLevel: 20,
    qualityOfLife: true,
    costFormula: (n) => n >= 10 ? 10 ** (55 + (n - 10) * 9.2) : 1e25 * (Math.pow(1e3, n) - 1),
    effect: (n) => 0.55 + n / 150,
  },
  octeractAmbrosiaLuck: { maxLevel: 100, qualityOfLife: true, costFormula: (n) => 1e60 * (Math.pow(10, n) - 1) / 9, effect: (n) => 4 * n },
  octeractAmbrosiaLuck2: { maxLevel: 30, qualityOfLife: true, costFormula: (n) => Math.pow(n, 6), effect: (n) => 2 * n },
  octeractAmbrosiaLuck3: { maxLevel: 30, qualityOfLife: true, costFormula: (n) => 1e30 * Math.pow(n, 8), effect: (n) => 3 * n },
  octeractAmbrosiaLuck4: { maxLevel: 50, qualityOfLife: true, costFormula: (n) => 1e70 * (Math.pow(3, n) - 1) / 2, effect: (n) => 5 * n },
  octeractAmbrosiaGeneration: { maxLevel: 100, qualityOfLife: true, costFormula: (n) => 1e60 * (Math.pow(10, n) - 1), effect: (n) => 1 + n / 100 },
  octeractAmbrosiaGeneration2: { maxLevel: 20, qualityOfLife: true, costFormula: (n) => Math.pow(n, 6), effect: (n) => 1 + n / 100 },
  octeractAmbrosiaGeneration3: { maxLevel: 35, qualityOfLife: true, costFormula: (n) => 1e30 * Math.pow(n, 8), effect: (n) => 1 + n / 100 },
  octeractAmbrosiaGeneration4: { maxLevel: 50, qualityOfLife: true, costFormula: (n) => 1e70 * (Math.pow(3, n) - 1), effect: (n) => 1 + 2 * n / 100 },
  // Effects copied from SynergismOfficial/src/Octeracts.ts.
  octeractBonusTokens1: { maxLevel: 10, costFormula: (n) => 1e-5 * (Math.pow(1e2, n) - 1) / 99, effect: (n) => n },
  octeractBonusTokens2: { maxLevel: 5, costFormula: (n) => Math.pow(1e8, n) - 1, effect: (n) => 1 + n / 100 },
  octeractBonusTokens3: { maxLevel: 5, costFormula: (n) => 1e40 * (Math.pow(1e10, n) - 1), effect: (n) => n },
  octeractBonusTokens4: { maxLevel: 50, costFormula: (n) => 1e75 * (Math.pow(4, n) - 1), effect: (n) => 2 * n },
  octeractBlueberries: { maxLevel: 6, qualityOfLife: true, costFormula: (n) => OCTERACT_BLUEBERRY_COSTS[n] ?? Number.POSITIVE_INFINITY, effect: (n) => n },
  octeractInfiniteShopUpgrades: { maxLevel: 80, costFormula: (n) => 1e30 * (Math.pow(16, n) - 1), effect: (n) => n },
  octeractTalismanLevelCap1: { maxLevel: 25, costFormula: (n) => 1e-5 * Math.pow(n, 6), effect: (n: number) => n },
  octeractTalismanLevelCap2: { maxLevel: 35, costFormula: (n) => 1e10 * Math.pow(n, 10), effect: (n: number) => n },
  octeractTalismanLevelCap3: { maxLevel: 40, costFormula: (n) => 1e20 * Math.pow(n, 20), effect: (n: number) => n },
  octeractTalismanLevelCap4: { maxLevel: 120, costFormula: (n) => 1e40 * (Math.pow(10, n) - 1), effect: (n: number) => n },
};

export type GoldenQuarkCostForm = 'Default' | 'Quadratic' | 'Cubic' | 'Exponential2'

type GoldenQuarkUpgradeDef = {
  maxLevel: number
  canExceedCap?: boolean
  effect?: (n: number, key?: string) => number
  qualityOfLife?: boolean
  costPerLevel: number
  specialCostForm: GoldenQuarkCostForm
}

type OcteractUpgradeDef = {
  maxLevel: number
  effect?: (n: number, effectKey?: string) => number
  qualityOfLife?: boolean
  costFormula: (level: number) => number
}

export const SINGULARITY_CHALLENGE_DATA: {
  [K in SingularityChallengeDataKeys]: ISingularityChallengeData<SingularityChallengeRewards[K]>
} = {
  noSingularityUpgrades: {
    baseReq: 1,
    maxCompletions: 15,
    unlockSingularity: 25,
    HTMLTag: 'noSingularityUpgrades',
    singularityRequirement: (baseReq: number, completions: number) => {
      return baseReq + 16 * completions + 8 * (completions >= 9 ? 1 : 0)
    },
    achievementPointValue: (n: number) => {
      return 15 * n
    },
    scalingrewardcount: 2,
    uniquerewardcount: 5,
    effect: (n: number) => {
      return {
        cubes: 1 + n,
        goldenQuarks: 1 + 0.12 * +(n > 0),
        blueberries: +(n > 0),
        shopUpgrade: n >= 10,
        additiveLuckMult: n >= 15 ? 0.05 : 0,
        shopUpgrade2: n >= 15
      }
    }
  },
  oneChallengeCap: {
    baseReq: 10,
    maxCompletions: 15,
    unlockSingularity: 40,
    HTMLTag: 'oneChallengeCap',
    singularityRequirement: (baseReq: number, completions: number) => {
      return baseReq + 19 * completions - 2 * (completions >= 14 ? 1 : 0)
    },
    achievementPointValue: (n: number) => {
      return 15 * n
    },
    scalingrewardcount: 3,
    uniquerewardcount: 4,
    effect: (n: number) => {
      return {
        blueberrySpeedMult: (1 + n / 60),
        capIncrease: 3 * +(n > 0),
        freeCorruptionLevel: n >= 1 ? 1 + 0.2 * n : 0,
        shopUpgrade: n >= 12,
        reinCapIncrease2: 7 * +(n >= 15),
        ascCapIncrease2: 2 * +(n >= 15)
      }
    }
  },
  limitedAscensions: {
    baseReq: 7,
    maxCompletions: 10,
    unlockSingularity: 50,
    HTMLTag: 'limitedAscensions',
    singularityRequirement: (baseReq: number, completions: number) => {
      return baseReq + 27 * completions
    },
    achievementPointValue: (n: number) => {
      return 30 * n
    },
    scalingrewardcount: 2,
    uniquerewardcount: 3,
    effect: (n: number) => {
      return {
        ascensionSpeedMult: 1 + 0.25 * n / 100,
        hepteractCap: n > 0,
        shopUpgrade: n >= 8,
        shopUpgrade2: n >= 10
      }
    }
  },
  noQuarkUpgrades: {
    baseReq: 20,
    maxCompletions: 10,
    unlockSingularity: 66,
    HTMLTag: 'noQuarkUpgrades',
    singularityRequirement: (baseReq: number, completions: number) => {
      if (completions > 5) {
        return baseReq + 185 + 8 * (completions - 6)
      } else if (completions > 2) {
        return baseReq + 70 + 9 * (completions - 6)
      } else {
        return baseReq + 15 * completions
      }
    },
    achievementPointValue: (n: number) => {
      return 20 * n
    },
    scalingrewardcount: 6,
    uniquerewardcount: 3,
    effect: (n: number) => {
      return {
        freeObtainiumLevels: n,
        freeOfferingLevels: n,
        freeSpeedLevels: n,
        freeCubeLevels: n,
        freeQuarkLevel: n >= 5 ? 1 : 0,
        freeInfinityLevels: n,
        shopUpgrade: n >= 1,
        topHatUnlock: n >= 10
      }
    }
  },
  noOcteracts: {
    baseReq: 75,
    maxCompletions: 15,
    unlockSingularity: 100,
    HTMLTag: 'noOcteracts',
    singularityRequirement: (baseReq: number, completions: number) => {
      if (completions < 10) {
        return baseReq + 13 * completions
      } else {
        return baseReq + 13 * 9 + 10 * (completions - 9)
      }
    },
    achievementPointValue: (n: number) => {
      return 20 * n
    },
    scalingrewardcount: 2,
    uniquerewardcount: 3,
    effect: (n: number) => {
      return {
        octeractPow: (n <= 10) ? 0.02 * n : 0.2 + (n - 10) / 100,
        offeringBonus: n > 0,
        obtainiumBonus: n >= 10,
        shopUpgrade: n >= 10
      }
    }
  },
  noAmbrosiaUpgrades: {
    baseReq: 150,
    maxCompletions: 15,
    unlockSingularity: 166,
    HTMLTag: 'noAmbrosiaUpgrades',
    singularityRequirement: (baseReq: number, completions: number) => {
      if (completions < 10) {
        return baseReq + 12 * completions
      } else {
        return baseReq + 12 * 9 + 4 * (completions - 9)
      }
    },
    achievementPointValue: (n: number) => {
      return 25 * n
    },
    scalingrewardcount: 5,
    uniquerewardcount: 8,
    effect: (n: number) => {
      return {
        bonusAmbrosia: +(n > 0),
        blueberries: Math.floor(n / 5) + +(n > 0),
        additiveLuckMult: n / 200,
        ambrosiaLuck: 20 * n,
        redLuck: 4 * n,
        blueberrySpeedMult: 1 + n / 25,
        redSpeedMult: 1 + 2 * n / 100,
        shopUpgrade: n >= 8,
        shopUpgrade2: n >= 10
      }
    }
  },
  limitedTime: {
    baseReq: 203,
    maxCompletions: 15,
    unlockSingularity: 216,
    HTMLTag: 'limitedTime',
    singularityRequirement: (baseReq: number, completions: number) => {
      if (completions > 9) {
        return 277 + 2 * (completions - 10)
      } else {
        return baseReq + 8 * completions
      }
    },
    achievementPointValue: (n: number) => {
      return 30 * n
    },
    scalingrewardcount: 5,
    uniquerewardcount: 3,
    effect: (n: number) => {
      return {
        preserveQuarks: n > 0,
        quarkMult: 1 + 0.02 * n,
        globalSpeed: 1 + 0.12 * n,
        ascensionSpeed: 1 + 0.12 * n,
        barRequirementMultiplier: 1 - 0.01 * n,
        shopUpgrade: n >= 5,
        shopUpgrade2: n >= 10
      }
    },
  },
  sadisticPrequel: {
    baseReq: 120,
    maxCompletions: 15,
    unlockSingularity: 256,
    HTMLTag: 'sadisticPrequel',
    singularityRequirement: (baseReq: number, completions: number) => {
      return baseReq + 8 * completions
    },
    achievementPointValue: (n: number) => {
      return 40 * n
    },
    scalingrewardcount: 3,
    uniquerewardcount: 4,
    effect: (n: number) => {
      return {
        extraFree: 50 * +(n > 0),
        quarkMult: 1 + 0.06 * n,
        freeUpgradeMult: 1 + 0.06 * n,
        shopUpgrade: n >= 5,
        shopUpgrade2: n >= 10,
        shopUpgrade3: n >= 15
      }
    }
  },
  taxmanLastStand: {
    baseReq: 266,
    maxCompletions: 10,
    unlockSingularity: 281,
    HTMLTag: 'taxmanLastStand',
    singularityRequirement: (baseReq: number, completions: number) => {
      return baseReq + 2 * completions
    },
    achievementPointValue: (n: number) => {
      return 50 * n
    },
    scalingrewardcount: 5,
    uniquerewardcount: 3,
    effect: (n: number) => {
      return {
        horseShoeUnlock: n > 0,
        shopUpgrade: n >= 5,
        talismanUnlock: n >= 10,
        talismanFreeLevel: 25 * n,
        talismanRuneEffect: 0.03 * n,
        purpleHoneyLuck: 3 * n,
        purpleBarSize: 1 - 0.01 * n,
        antiquityOOM: 1 / 50 * n / 10,
        horseShoeOOM: 1 / 20 * n / 10
      }
    },
  },
  barDependence: {
    baseReq: 288,
    maxCompletions: 10,
    unlockSingularity: 290,
    HTMLTag: 'barDependence',
    singularityRequirement: (baseReq: number, completions: number) => baseReq + completions,
    achievementPointValue: (n: number) => 50 * n,
    scalingrewardcount: 2,
    uniquerewardcount: 2,
    effect: (n: number) => ({
      purpleAmbrosiaCostReduction: 1 - 0.05 * n,
      purpleHoneyLuck: 50 * +(n > 0),
      blueberries: n,
      shopUpgrade: n >= 2,
    }),
  }
}


// https://github.com/Pseudo-Corp/SynergismOfficial/blob/master/src/Calculate.ts#L1678
export const calculateSigmoid = (
  constant: number,
  factor: number,
  divisor: number
) => {
  return 1 + (constant - 1) * (1 - Math.pow(2, -factor / divisor))
}



// challenge15ScoreReward and challenge15CubeReward in SynergismOfficial/src/Variables.ts
const challenge15ScoreReward = (e: number, divisor: number) => {
  const softcap = Math.max(divisor, 1e20)
  return 1 + (1 / 4) * Math.pow(Math.max(divisor, Math.min(e, softcap)) / divisor, 1 / 4)
    * Math.pow(Math.max(e, softcap) / softcap, 1 / 8)
}

const challenge15CubeReward = (e: number, power: number, divisor = 1e10) => {
  const softcapped = challenge15ScoreReward(Math.min(e, 1e30), divisor)
  const excess = challenge15ScoreReward(Math.max(e, 1e30), divisor) / challenge15ScoreReward(1e30, divisor)
  return Math.pow(softcapped, power) * Math.pow(excess, power / 2)
}

// https://github.com/Pseudo-Corp/SynergismOfficial/blob/master/src/Variables.ts#L454
export const c15Functions: { [key in keyof typeof challenge15Rewards]: (e: number) => number } = {
  cube1: (e: number) => 1 + ((1 / 50) * Math.log2(e / 175)),
  ascensions: (e: number) => 1 + ((1 / 20) * Math.log2(e / 375)),
  coinExponent: (e: number) => 1 + ((1 / 150) * Math.log2(e / 750)),
  taxes: (e: number) => Math.pow(0.98, Math.log(e / 1.25e3) / Math.log(2)),
  obtainium: (e: number) => 1 + (1 / 4) * Math.pow(e / 7.5e3, 0.6),
  offering: (e: number) => 1 + (1 / 4) * Math.pow(e / 7.5e3, 0.8),
  accelerator: (e: number) => 1 + ((1 / 20) * Math.log(e / 2.5e3)) / Math.log(2),
  multiplier: (e: number) => 1 + ((1 / 20) * Math.log(e / 2.5e3)) / Math.log(2),
  runeExp: (e: number) => 1 + Math.pow(e / 2e4, 1.5),
  runeBonus: (e: number) => 1 + ((1 / 33) * Math.log(e / 1e4)) / Math.log(2),
  cube2: (e: number) => 1 + ((1 / 100) * Math.log(e / 1.5e4)) / Math.log(2),
  transcendChallengeReduction: (e: number) => Math.pow(0.98, Math.log(e / 2.5e4) / Math.log(2)),
  reincarnationChallengeReduction: (e: number) => Math.pow(0.98, Math.log(e / 2.5e4) / Math.log(2)),
  antSpeed: (e: number) => Math.pow(1 + Math.log(e / 2e5) / Math.log(2), 4),
  bonusAntLevel: (e: number) => 1 + ((1 / 20) * Math.log(e / 1.5e5)) / Math.log(2),
  achievementUnlock: (e: number) => e >= 666666 ? 1 : 0,
  cube3: (e: number) => 1 + ((1 / 150) * Math.log(e / 2.5e5)) / Math.log(2),
  talismanBonus: (e: number) =>
    e >= 7.5e5
      ? 1 + 0.02 + ((1 / 1000) * Math.log(e / 7.5e5)) / Math.log(2)
      : 1,
  globalSpeed: (e: number) => 1 + ((1 / 20) * Math.log(e / 2.5e6)) / Math.log(2),
  blessingBonus: (e: number) => 1 + (1 / 5) * Math.pow(e / 3e7, 1 / 4),
  constantBonus: (e: number) => 1 + (1 / 5) * Math.pow(e / 1e8, 2 / 3),
  cube4: (e: number) => 1 + ((1 / 200) * Math.log(e / 1.25e8)) / Math.log(2),
  spiritBonus: (e: number) => 1 + (1 / 5) * Math.pow(e / 2e9, 1 / 4),
  wowCubes: (e: number) => challenge15CubeReward(e, 1 / 4.1),
  wowTesseracts: (e: number) => challenge15CubeReward(e, 0.35),
  wowHypercubes: (e: number) => challenge15CubeReward(e, 0.5),
  wowPlatonicCubes: (e: number) => challenge15CubeReward(e, 0.75),
  wowHepteracts: (e: number) => challenge15CubeReward(e, 0.85, 1e15),
  wowOcteracts: (e: number) => Math.sqrt(challenge15ScoreReward(e, 1e30)),
  quarks: (e: number) => 1 + (3 / 400) * Math.log2(e * 32 / 1e11),
  hepteractsUnlocked: (e: number) => e >= 1e15 ? 1 : 0,
  challengeHepteractUnlocked: (e: number) => e >= 2e15 ? 1 : 0,
  cube5: (e: number) => 1 + (1 / 300) * Math.log2(e / (4e15 / 1024)),
  powder: (e: number) => 1 + (1 / 50) * Math.log2(e / (7e15 / 32)),
  abyssHepteractUnlocked: (e: number) => e >= 1e16 ? 1 : 0,
  exponent: (e: number) => calculateSigmoid(1.05, e, 1e18),
  acceleratorHepteractUnlocked: (e: number) => e >= 3.33e16 ? 1 : 0,
  acceleratorBoostHepteractUnlocked: (e: number) => e >= 3.33e16 ? 1 : 0,
  multiplierHepteractUnlocked: (e: number) => e >= 3.33e16 ? 1 : 0,
  freeOrbs: (e: number) => Math.floor(200 * Math.pow(e / 2e17, 0.5)),
  ascensionSpeed: (e: number) => 1 + 5 / 100 + (2 * Math.log2(e / 1.5e18)) / 100
}

export const TALISMAN_RARITY_VALUES: Record<number, number> = {
  0: 0,
  1: 1,
  2: 1.2,
  3: 1.5,
  4: 1.8,
  5: 2.1,
  6: 2.5,
  7: 3,
  8: 3.25,
  9: 3.5,
  10: 4
}

export const TALISMAN_BASE_COEFFICIENTS: Record<TalismanKeys, Record<RuneKeys, number>> = {
  exemption: { speed: 0, duplication: 1.5, prism: 0.75, thrift: 0.75, superiorIntellect: 0, infiniteAscent: 0, antiquities: 0, horseShoe: 0, topHat: 0, finiteDescent: 0 },
  chronos: { speed: 1.5, duplication: 0, prism: 0, thrift: 0.75, superiorIntellect: 0.75, infiniteAscent: 0, antiquities: 0, horseShoe: 0, topHat: 0, finiteDescent: 0 },
  midas: { speed: 0, duplication: 0.75, prism: 0.75, thrift: 1.5, superiorIntellect: 0, infiniteAscent: 0, antiquities: 0, horseShoe: 0, topHat: 0, finiteDescent: 0 },
  metaphysics: { speed: 0.6, duplication: 0.6, prism: 0.6, thrift: 0.6, superiorIntellect: 0.6, infiniteAscent: 0, antiquities: 0, horseShoe: 0, topHat: 0, finiteDescent: 0 },
  polymath: { speed: 0.75, duplication: 0.75, prism: 0, thrift: 0, superiorIntellect: 1.5, infiniteAscent: 0, antiquities: 0, horseShoe: 0, topHat: 0, finiteDescent: 0 },
  mortuus: { speed: 0.6, duplication: 0.6, prism: 0.6, thrift: 0.6, superiorIntellect: 0.6, infiniteAscent: 0, antiquities: 0, horseShoe: 0, topHat: 0, finiteDescent: 0 },
  plastic: { speed: 0.75, duplication: 0, prism: 1.5, thrift: 0, superiorIntellect: 0.75, infiniteAscent: 0.005, antiquities: 0, horseShoe: 0, topHat: 0, finiteDescent: 0 },
  wowSquare: { speed: 0, duplication: 1, prism: 1, thrift: 0, superiorIntellect: 1, infiniteAscent: 0, antiquities: 0, horseShoe: 0, topHat: 0, finiteDescent: 0 },
  achievement: { speed: 1.4, duplication: 1.4, prism: 1.4, thrift: 1.4, superiorIntellect: 1.4, infiniteAscent: 0.01, antiquities: 0, horseShoe: 0, topHat: 0, finiteDescent: 0 },
  purpleGem: { speed: 1, duplication: 1, prism: 1, thrift: 1, superiorIntellect: 1, infiniteAscent: 0.01, antiquities: 0, horseShoe: 0, topHat: 0, finiteDescent: 0 },
  cookieGrandma: { speed: 1, duplication: 1, prism: 1, thrift: 1, superiorIntellect: 1, infiniteAscent: 0.01, antiquities: 0, horseShoe: 0, topHat: 0, finiteDescent: 0 },
  horseShoe: { speed: 1.2, duplication: 1.2, prism: 1.2, thrift: 1.2, superiorIntellect: 1.2, infiniteAscent: 0, antiquities: 0, horseShoe: 0.01, topHat: 0, finiteDescent: 0 }
}

export const talismanCostKeys = [
  'shard',
  'commonFragment',
  'uncommonFragment',
  'rareFragment',
  'epicFragment',
  'legendaryFragment',
  'mythicalFragment',
] as const;

export type TalismanCostKey = (typeof talismanCostKeys)[number];

export const regularCostProgressionDecimal = (baseMult: string, level: number): Record<TalismanCostKey, Decimal> => {
  const baseMultDecimal = new Decimal(baseMult);

  let priceMult = baseMultDecimal;
  if (level >= 120) {
    priceMult = priceMult.times((level - 90) / 30);
  }
  if (level >= 150) {
    priceMult = priceMult.times((level - 120) / 30);
  }
  if (level >= 180) {
    priceMult = priceMult.times((level - 170) / 10);
  }

  const getCost = (l: number, div: number): Decimal => {
    return l < 0
      ? new Decimal(0)
      : Decimal.pow(l, 3).div(div).add(1).floor().times(priceMult);
  };

  return {
    shard: getCost(level, 8),
    commonFragment: getCost(level - 30, 32),
    uncommonFragment: getCost(level - 60, 384),
    rareFragment: getCost(level - 90, 500),
    epicFragment: getCost(level - 120, 375),
    legendaryFragment: getCost(level - 150, 192),
    mythicalFragment: getCost(level - 150, 1280),
  };
};

export const exponentialCostProgressionDecimal = (baseMult: string, level: number, ratio: number): Record<TalismanCostKey, Decimal> => {
  const baseMultDecimal = new Decimal(baseMult);

  const getCost = (l: number, mult: number): Decimal => {
    return l < 0
      ? new Decimal(0)
      : Decimal.pow(ratio, l).times(baseMultDecimal).times(mult).floor();
  };

  return {
    shard: getCost(level, 100),
    commonFragment: getCost(level - 30, 50),
    uncommonFragment: getCost(level - 60, 25),
    rareFragment: getCost(level - 90, 20),
    epicFragment: getCost(level - 120, 15),
    legendaryFragment: getCost(level - 150, 10),
    mythicalFragment: getCost(level - 150, 5),
  };
};

export const RUNE_KEYS: RuneKeys[] = [
    'speed',
    'duplication',
    'prism',
    'thrift',
    'superiorIntellect',
    'infiniteAscent',
    'antiquities',
    'horseShoe',
    'topHat',
    'finiteDescent',
]

export const TALISMAN_EXEMPTION_INSCRIPT_VALUES = [0, -0.2, -0.3, -0.4, -0.45, -0.5, -0.55, -0.6, -0.61, -0.62, -0.65]
export const TALISMAN_CHRONOS_INSCRIPT_VALUES = [1, 1.04, 1.08, 1.12, 1.16, 1.20, 1.25, 1.30, 1.325, 1.35, 1.4]
export const TALISMAN_MIDAS_INSCRIPT_VALUES = [1, 1.04, 1.08, 1.12, 1.16, 1.20, 1.25, 1.30, 1.325, 1.35, 1.40]
export const TALISMAN_METAPHYSICS_INSCRIPT_VALUES = [1, 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 1.8, 1.9, 2]
export const TALISMAN_POLYMATH_INSCRIPT_VALUES = [1, 1.04, 1.08, 1.12, 1.16, 1.20, 1.25, 1.30, 1.325, 1.35, 1.40]
export const TALISMAN_MORTUUS_INSCRIPT_VALUES = [1, 1.05, 1.1, 1.15, 1.2, 1.3, 1.4, 1.5, 1.65, 1.8, 2]
export const TALISMAN_PLASTIC_INSCRIPT_VALUES = [1, 1.005, 1.01, 1.015, 1.02, 1.025, 1.03, 1.04, 1.045, 1.05, 1.0666]
export const TALISMAN_WOWSQUARE_INSCRIPT_VALUES = [1, 1.025, 1.05, 1.075, 1.1, 1.125, 1.15, 1.2, 1.225, 1.25, 1.30]
export const TALISMAN_ACHIEVEMENT_EFFECT_INSCRIPT_VALUES = [0, 0.001, 0.002, 0.003, 0.004, 0.006, 0.008, 0.01, 0.015, 0.02, 0.03]
export const TALISMAN_COOKIEGRANDMA_INSCRIPT_VALUES = [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1]
export const TALISMAN_HORSESHOE_INSCRIPT_VALUES = [0, 0.001, 0.002, 0.003, 0.004, 0.005, 0.007, 0.01, 0.012, 0.015, 0.02]

export const ACHIEVEMENT_REWARD_TYPES: AchievementRewards[] = [
    'acceleratorPower',
    'accelerators',
    'multipliers',
    'accelBoosts',
    'crystalMultiplier',
    'taxReduction',
    'particleGain',
    'conversionExponent',
    'chronosTalisman',
    'midasTalisman',
    'metaphysicsTalisman',
    'polymathTalisman',
    'talismanPower',
    'sacrificeMult',
    'antSpeed',
    'antSacrificeUnlock',
    'preserveAnthillCount',
    'preserveAnthillCountSingularity',
    'antAutobuyers',
    'inceptusAutobuy',
    'fortunaeAutobuy',
    'tributumAutobuy',
    'celeritasAutobuy',
    'exploratoremAutobuy',
    'sacrificiumAutobuy',
    'experientiaAutobuy',
    'hicAutobuy',
    'scientiaAutobuy',
    'praemoenioAutobuy',
    'phylacteriumAutobuy',
    'antELOAdditive',
    'antELOAdditiveMultiplier',
    'wowSquareTalisman',
    'ascensionCountMultiplier',
    'ascensionCountAdditive',
    'wowCubeGain',
    'wowTesseractGain',
    'wowHypercubeGain',
    'wowPlatonicGain',
    'quarkGain',
    'wowHepteractGain',
    'cubesBanked',
    'constUpgrade1Buff',
    'constUpgrade2Buff',
    'platonicToHypercubes',
    'statTracker',
    'ascensionRewardScaling',
    'overfluxConversionRate',
    'diamondUpgrade18',
    'diamondUpgrade19',
    'diamondUpgrade20',
    'prestigeCountMultiplier',
    'transcensionCountMultiplier',
    'reincarnationCountMultiplier',
    'duplicationRuneUnlock',
    'prismRuneUnlock',
    'thriftRuneUnlock',
    'salvage',
    'offeringBonus',
    'obtainiumBonus',
    'transcendToPrestige',
    'reincarnationToTranscend',
    'antSacrificeCountMultiplier',
    'freeAntUpgrades',
    'autoAntSacrifice',
    'antSpeed2UpgradeImprover',
    'antSacrificeToReincarnation'
] as const;

export const FAVORITE_UPGRADE_GQ_DEPENDENCIES = ['goldenQuarks1', 'platonicDelta', 'oneMind'] as const;
export const FAVORITE_UPGRADE_OCTERACT_DEPENDENCIES = ['octeractImprovedFree', 'octeractCorruption', 'octeractBlueberries'] as const;
export const FAVORITE_UPGRADE_RED_AMBROSIA_DEPENDENCIES = ['tutorial', 'infiniteShopUpgrades', 'blueberryGenerationSpeed2'] as const;

export const offeringPotionThresholds = [
    1,
    10,
    25,
    50,
    100,
    500,
    1000,
    10000,
    50000,
    100000,
    1000000,
    10000000,
    100000000,
    1000000000,
    10000000000,
    100000000000,
    1000000000000,
    10000000000000,
    100000000000000
]

export const obtainiumPotionThresholds = [
    1,
    20,
    50,
    250,
    1000,
    20000,
    400000,
    10000000,
    400000000,
    10000000000,
    100000000000,
    1000000000000,
    10000000000000,
    100000000000000,
    1000000000000000
]
