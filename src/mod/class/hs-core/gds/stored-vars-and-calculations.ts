import { HepteractEffectiveValues, RedAmbrosiaUpgradeCalculationCollection } from "../../../types/data-types/hs-gamedata-api-types"

export const redAmbrosiaUpgradeCalculationCollection: RedAmbrosiaUpgradeCalculationCollection = {
    blueberryGenerationSpeed: {
        costPerLevel: 1,
        maxLevel: 100,
        costFunction: (n: number, cpl: number) => cpl * (n + 1),
        levelFunction: (n: number) => 1 + n / 500
    },

    blueberryGenerationSpeed2: {
        costPerLevel: 2000,
        maxLevel: 500,
        costFunction: (n: number, cpl: number) => cpl + 0 * n,
        levelFunction: (n: number) => 1 + n / 1000
    },

    freeLevelsRow2: {
        costPerLevel: 10,
        maxLevel: 5,
        costFunction: (n: number, cpl: number) => cpl * Math.pow(2, n),
        levelFunction: (n: number) => n
    },

    freeLevelsRow3: {
        costPerLevel: 250,
        maxLevel: 5,
        costFunction: (n: number, cpl: number) => cpl * Math.pow(2, n),
        levelFunction: (n: number) => n
    },

    freeLevelsRow4: {
        costPerLevel: 5000,
        maxLevel: 5,
        costFunction: (n: number, cpl: number) => cpl * Math.pow(2, n),
        levelFunction: (n: number) => n
    },

    freeLevelsRow5: {
        costPerLevel: 50000,
        maxLevel: 5,
        costFunction: (n: number, cpl: number) => cpl * Math.pow(2, n),
        levelFunction: (n: number) => n
    },

    regularLuck: {
        costPerLevel: 1,
        maxLevel: 100,
        costFunction: (n: number, cpl: number) => cpl * (n + 1),
        levelFunction: (n: number) => 2 * n
    },

    regularLuck2: {
        costPerLevel: 2000,
        maxLevel: 500,
        costFunction: (n: number, cpl: number) => cpl + 0 * n,
        levelFunction: (n: number) => 2 * n
    },

    viscount: {
        costPerLevel: 99999,
        maxLevel: 1,
        costFunction: (n: number, cpl: number) => cpl * (n + 1),
        levelFunction: (n: number) => 125 * n
    },

    tutorial: {
        costFunction: (n: number, cpl: number) => cpl + 0 * n,
        levelFunction: (n: number) =>Math.pow(1.01, n),
        maxLevel: 100,
        costPerLevel: 1,
    },

    conversionImprovement1: {
        costFunction: (n: number, cpl: number) => cpl * Math.pow(2, n),
        levelFunction: (n: number) => -n,
        maxLevel: 5,
        costPerLevel: 5,
    },

    conversionImprovement2: {
        costFunction: (n: number, cpl: number) => cpl * Math.pow(4, n),
        levelFunction: (n: number) => -n,
        maxLevel: 3,
        costPerLevel: 200,
    },

    conversionImprovement3: {
        costFunction: (n: number, cpl: number) => cpl * Math.pow(10, n),
        levelFunction: (n: number) => -n,
        maxLevel: 2,
        costPerLevel: 10000,
    },

    freeTutorialLevels: {
        costFunction: (n: number, cpl: number) => cpl + n,
        levelFunction: (n: number) => n,
        maxLevel: 5,
        costPerLevel: 1,
    },

    redGenerationSpeed: {
        costFunction: (n: number, cpl: number) => cpl * (n + 1),
        levelFunction: (n: number) => 1 + 3 * n / 1000,
        maxLevel: 100,
        costPerLevel: 12,
    },

    redLuck: {
        costFunction: (n: number, cpl: number) => cpl * (n + 1),
        levelFunction: (n: number) => n,
        maxLevel: 100,
        costPerLevel: 4,
    },

    redAmbrosiaCube: {
        costFunction: (n: number, cpl: number) => cpl * (n + 1),
        levelFunction: (n: number) => n,
        maxLevel: 1,
        costPerLevel: 500
    },

    redAmbrosiaObtainium: {
        costFunction: (n: number, cpl: number) => cpl * (n + 1),
        levelFunction: (n: number) => n,
        maxLevel: 1,
        costPerLevel: 1250,
    },

    redAmbrosiaOffering: {
        costFunction: (n: number, cpl: number) => cpl * (n + 1),
        levelFunction: (n: number) => n,
        maxLevel: 1,
        costPerLevel: 4000,
    },

    redAmbrosiaCubeImprover: {
        costFunction: (n: number, cpl: number) => cpl * (n + 1),
        levelFunction: (n: number) => 0.01 * n,
        maxLevel: 20,
        costPerLevel: 100,
    },

    infiniteShopUpgrades: {
        costFunction: (n: number, cpl: number) => cpl + 100 * n,
        levelFunction: (n: number) => n,
        maxLevel: 40,
        costPerLevel: 200
    },

    redAmbrosiaAccelerator: {
        costFunction: (n: number, cpl: number) => cpl + n * 0,
        levelFunction: (n: number) => 0.02 * n + ((n > 0) ? 1 : 0),
        maxLevel: 100,
        costPerLevel: 1000
    },
};

export const hepteractEffectiveValues: HepteractEffectiveValues = {
    chronos: {
        LIMIT: 1000,
        DR: 1 / 6
    },
    hyperrealism: {
        LIMIT: 1000,
        DR: 0.33
    },
    quark: {
        LIMIT: 1000,
        DR: 0.5
    },
    challenge: {
        LIMIT: 1000,
        DR: 1 / 6
    },
    abyss: {
        LIMIT: 1,
        DR: 0
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
    score: {
      value: 1,
      baseValue: 1,
      requirement: 1e10
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
      HTMLColor: 'purple'
    },
    freeOrbs: {
      value: 0,
      baseValue: 0,
      requirement: 2e17,
      HTMLColor: 'pink'
    },
    ascensionSpeed: {
      value: 1,
      baseValue: 1,
      requirement: 1.5e18,
      HTMLColor: 'orange'
    }
};

// https://github.com/Pseudo-Corp/SynergismOfficial/blob/master/src/Calculate.ts#L1678
export const calculateSigmoid = (
  constant: number,
  factor: number,
  divisor: number
) => {
  return 1 + (constant - 1) * (1 - Math.pow(2, -factor / divisor))
}

// https://github.com/Pseudo-Corp/SynergismOfficial/blob/master/src/Variables.ts#L454
export const c15Functions: {[key in keyof typeof challenge15Rewards]: (e: number) => number} = {
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
    cube3: (e: number) => 1 + ((1 / 150) * Math.log(e / 2.5e5)) / Math.log(2),
    talismanBonus: (e: number) => 1 + ((1 / 20) * Math.log(e / 7.5e5)) / Math.log(2),
    globalSpeed: (e: number) => 1 + ((1 / 20) * Math.log(e / 2.5e6)) / Math.log(2),
    blessingBonus: (e: number) => 1 + (1 / 5) * Math.pow(e / 3e7, 1 / 4),
    constantBonus: (e: number) => 1 + (1 / 5) * Math.pow(e / 1e8, 2 / 3),
    cube4: (e: number) => 1 + ((1 / 200) * Math.log(e / 1.25e8)) / Math.log(2),
    spiritBonus: (e: number) => 1 + (1 / 5) * Math.pow(e / 2e9, 1 / 4),
    score: (e: number) =>
      (e >= 1e20)
        ? 1 + (1 / 4) * Math.pow(e / 1e10, 1 / 8) * Math.pow(1e10, 1 / 8)
        : 1 + (1 / 4) * Math.pow(e / 1e10, 1 / 4),
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