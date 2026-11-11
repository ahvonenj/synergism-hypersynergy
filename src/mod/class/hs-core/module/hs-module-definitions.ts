import { HSCodes } from "../../hs-modules/hs-codes";
import { HSHepteracts } from "../../hs-modules/hs-hepteracts/hs-hepteracts";
import { HSHepteractDistributor } from "../../hs-modules/hs-hepteracts/hs-hepteract-distributor";
import { HSPerksFind } from "../../hs-modules/hs-perks-find";
import { HSUI } from "../hs-ui";
import { HSSettings } from "../settings/hs-settings";
import { HSPrototypes } from "../hs-prototypes";
import { HSMouse } from "../hs-mouse";
import { HSStorage } from "../hs-storage";
import { HSAmbrosia } from "../../hs-modules/hs-ambrosia/hs-ambrosia";
import { HSStats } from "../../hs-modules/hs-stats";
import { HSGameState } from "../hs-gamestate";
import { HSGameData } from "../gds/hs-gamedata";
import { HSGameDataAPI } from "../gds/hs-gamedata-api";
import { HSAutosing } from "../../hs-modules/hs-autosing/hs-autosing";
import { HSQOLButtons } from "../../hs-modules/hs-qol-buttons/hs-qol-buttons";
import { HSSubtabMemory } from "../../hs-modules/hs-subtab-memory";
import { HSAutoExport } from "../../hs-modules/hs-auto-export";
import { HSHeaderLoadoutIcons } from "../../hs-modules/hs-loadout-icons/hs-header-loadout-icons";
import type { HSModuleDefinition } from "../../../types/hs-types";

/** Constructors and startup options for every enabled module. Initialization follows this list and loadOrder. */
export const HS_MODULE_DEFINITIONS = [
    {
        className: 'HSPrototypes',
        moduleClass: HSPrototypes,
        context: 'HSPrototypes',
        moduleColor: 'crimson',
        loadOrder: 1,
        initImmediate: true
    },
    {
        className: 'HSUI',
        moduleClass: HSUI,
        context: 'HSUI',
        moduleColor: 'royalblue',
        loadOrder: 2,
        initImmediate: true
    },
    {
        className: 'HSStorage',
        moduleClass: HSStorage,
        context: 'HSStorage',
        moduleColor: 'wheat',
        loadOrder: 3,
        initImmediate: true
    },
    {
        className: 'HSSettings',
        moduleClass: HSSettings,
        context: 'HSSettings',
        moduleColor: 'slategray',
        loadOrder: 4,
    },
    {
        className: 'HSCodes',
        moduleClass: HSCodes,
        context: 'HSCodes',
        moduleColor: 'darkgoldenrod',
    },
    {
        className: 'HSHepteracts',
        moduleClass: HSHepteracts,
        context: 'HSHepteracts',
        moduleColor: 'slateblue',
    },
    {
        className: 'HSPerksFind',
        moduleClass: HSPerksFind,
        context: 'HSPerksFind',
        moduleColor: 'goldenrod',
    },
    {
        className: 'HSMouse',
        moduleClass: HSMouse,
        context: 'HSMouse',
        moduleColor: 'gold',
    },
    {
        className: 'HSStats',
        moduleClass: HSStats,
        context: 'HSStats',
        moduleColor: 'lawngreen',
    },
    {
        className: 'HSGameState',
        moduleClass: HSGameState,
        context: 'HSGameState',
        moduleColor: 'indianred',
    },
    {
        className: 'HSGameData',
        moduleClass: HSGameData,
        context: 'HSGameData',
        moduleColor: '#fbc531',
    },
    {
        className: 'HSGameDataAPI',
        moduleClass: HSGameDataAPI,
        context: 'HSGameDataAPI',
        moduleColor: '#fbc531',
    },
    {
        className: 'HSSubtabMemory',
        moduleClass: HSSubtabMemory,
        context: 'HSSubtabMemory',
        moduleColor: 'lightsalmon',
    },
    {
        className: 'HSAmbrosia',
        moduleClass: HSAmbrosia,
        context: 'HSAmbrosia',
        moduleColor: 'blueviolet',
    },
    {
        className: 'HSHeaderLoadoutIcons',
        moduleClass: HSHeaderLoadoutIcons,
        context: 'HSHeaderLoadoutIcons',
        moduleColor: 'khaki',
    },
    {
        className: 'HSHepteractDistributor',
        moduleClass: HSHepteractDistributor,
        context: 'HSHepteractDistributor',
        moduleColor: 'mediumslateblue',
    },
    {
        className: 'HSAutosing',
        moduleClass: HSAutosing,
        context: 'HSAutosing',
        moduleColor: '#00ff7f',
    },
    {
        className: 'HSQOLButtons',
        moduleClass: HSQOLButtons,
        context: 'HSQOLButtons',
        moduleColor: '#c0c0c0',
    },
    {
        className: 'HSAutoExport',
        moduleClass: HSAutoExport,
        context: 'HSAutoExport',
        moduleColor: '#7fb3d5',
    }
] as const satisfies readonly HSModuleDefinition[];

export type HSRegisteredModuleDefinition = typeof HS_MODULE_DEFINITIONS[number];
export type HSModuleInstances = {
    [Definition in HSRegisteredModuleDefinition as Definition["className"]]: InstanceType<Definition["moduleClass"]>;
};
