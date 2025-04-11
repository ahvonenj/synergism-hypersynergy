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
    
    QUARKS1 = 'ambrosiaQuarks1',
    CUBES1 = 'ambrosiaCubes1',
    LUCK1 = 'ambrosiaLuck1',

    CUBE_QUARK = 'ambrosiaCubeQuark1',
    LUCK_QUARK = 'ambrosiaLuckQuark1',
    LUCK_CUBE = 'ambrosiaLuckCube1',
    QUARK_CUBE = 'ambrosiaQuarkCube1',
    CUBE_LUCK = 'ambrosiaCubeLuck1',
    QUARK_LUCK = 'ambrosiaQuarkLuck1',
    QUARKS2 = 'ambrosiaQuarks2',
    CUBES2 = 'ambrosiaCubes2',
    LUCK2 = 'ambrosiaLuck2'
}

export type HSAmbrosiaLoadoutIconMapping = Map<AMBROSIA_ICON, HSAmbrosiaLoadoutIcon>;
export type HSAmbrosiaLoadoutState = Map<AMBROSIA_LOADOUT_SLOT, AMBROSIA_ICON>;

