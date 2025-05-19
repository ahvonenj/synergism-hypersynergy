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