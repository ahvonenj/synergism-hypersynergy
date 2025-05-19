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
    }
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