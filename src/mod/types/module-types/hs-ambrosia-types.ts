export type HSAmbrosiaLoadoutIcon = {
    draggableIconId: AMBROSIA_ICON;
    url: string;
}

export enum AMBROSIA_LOADOUT_SLOT {
    SLOT_1 = 'blueberryLoadout1',
    SLOT_2 = 'blueberryLoadout2',
    SLOT_3 = 'blueberryLoadout3',
    SLOT_4 = 'blueberryLoadout4',
    SLOT_5 = 'blueberryLoadout5',
    SLOT_6 = 'blueberryLoadout6',
    SLOT_7 = 'blueberryLoadout7',
    SLOT_8 = 'blueberryLoadout8'
}

export enum AMBROSIA_ICON {
    TUTORIAL = 'ambrosiaTutorial',
    PATREON = 'ambrosiaPatreon',
    OBTAINIUM = 'ambrosiaObtainium1',
    OFFERING = 'ambrosiaOffering1',
    HYPEFLUX = 'ambrosiaHyperflux',

    RA_TUTORIAL = 'redAmbrosiaTutorial',
    RA_FREE = 'redAmbrosiaFreeTutorialLevels',
    RA_CONV1 = 'redAmbrosiaConversionImprovement1',
    RA_BLUEGEN = 'redAmbrosiaBlueberryGenerationSpeed',
    RA_REGLUCK = 'redAmbrosiaRegularLuck',

    QUARKS1 = 'ambrosiaQuarks1',
    CUBES1 = 'ambrosiaCubes1',
    LUCK1 = 'ambrosiaLuck1',

    BASE_OBT1 = 'ambrosiaBaseObtainium1',
    BASE_OFF1 = 'ambrosiaBaseOffering1',
    SING_RED1 = 'ambrosiaSingReduction1',

    RA_FREE2 = 'redAmbrosiaFreeLevelsRow2',
    RA_CUBE = 'redAmbrosiaRedAmbrosiaCube',
    RA_OBT = 'redAmbrosiaRedAmbrosiaObtainium',
    RA_OFF = 'redAmbrosiaRedAmbrosiaOffering',

    CUBE_QUARK = 'ambrosiaCubeQuark1',
    LUCK_QUARK = 'ambrosiaLuckQuark1',
    LUCK_CUBE = 'ambrosiaLuckCube1',
    QUARK_CUBE = 'ambrosiaQuarkCube1',
    CUBE_LUCK = 'ambrosiaCubeLuck1',
    QUARK_LUCK = 'ambrosiaQuarkLuck1',

    RA_FREE3 = 'redAmbrosiaFreeLevelsRow3',
    RA_CONV2 = 'redAmbrosiaConversionImprovement2',
    RA_REDGEN = 'redAmbrosiaRedGenerationSpeed',
    RA_REDLUCK = 'redAmbrosiaRedLuck',

    QUARKS2 = 'ambrosiaQuarks2',
    CUBES2 = 'ambrosiaCubes2',
    LUCK2 = 'ambrosiaLuck2',

    BASE_OBT2 = 'ambrosiaBaseObtainium2',
    BASE_OFF2 = 'ambrosiaBaseOffering2',
    INF_SHOP1 = 'ambrosiaInfiniteShopUpgrades1',

    RA_FREE4 = 'redAmbrosiaFreeLevelsRow4',
    RA_CUBE_IMPR = 'redAmbrosiaRedAmbrosiaCubeImprover',
    RA_INF_SHOP = 'redAmbrosiaInfiniteShopUpgrades',
    RA_ACC = 'redAmbrosiaRedAmbrosiaAccelerator',

    QUARKS3 = 'ambrosiaQuarks3',
    CUBES3 = 'ambrosiaCubes3',
    LUCK3 = 'ambrosiaLuck3',

    SING_RED2 = 'ambrosiaSingReduction2',
    INF_SHOP2 = 'ambrosiaInfiniteShopUpgrades2',

    RA_VISCOUNT = 'redAmbrosiaViscount',
    RA_FREE5 = 'redAmbrosiaFreeLevelsRow5',
    RA_CONV3 = 'redAmbrosiaConversionImprovement3',
    RA_BLUEGEN2 = 'redAmbrosiaBlueberryGenerationSpeed2',
    RA_REGLUCK2 = 'redAmbrosiaRegularLuck2'
}

export type HSAmbrosiaLoadoutIconMapping = Map<AMBROSIA_ICON, HSAmbrosiaLoadoutIcon>;
export type HSAmbrosiaLoadoutState = Map<AMBROSIA_LOADOUT_SLOT, AMBROSIA_ICON>;

