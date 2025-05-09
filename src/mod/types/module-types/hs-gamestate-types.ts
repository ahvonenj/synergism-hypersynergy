import { CubeView, GameView, MainView, SingularityView } from "../../class/hs-core/hs-gamestate";

export type VIEW_TYPE = MAIN_VIEW | CUBE_VIEW | SINGULARITY_VIEW;
export type VIEW_KEY = 'MAIN_VIEW' | 'CUBE_VIEW' | 'SINGULARITY_VIEW';

export interface View {
    MAIN_VIEW: MainView;
    CUBE_VIEW: CubeView;
    SINGULARITY_VIEW: SingularityView;
}

export enum MAIN_VIEW {
    UNKNOWN = -1,

    BUILDINGS = 1,
    UPGRADES = 2,
    STATISTICS = 3,
    RUNES = 4,
    CHALLENGES = 5,
    RESEARCH = 6,
    ANTS = 7,
    CUBES = 8,
    CAMPAIGNS = 9,
    TRAITS = 10,
    SETTINGS = 11,
    SHOP = 12,
    SINGULARITY = 13,
    EVENT = 14,
    PSEUDOCOINS = 15
}

export enum CUBE_VIEW {
    UNKNOWN = -1,

    CUBE_TRIBUTES = 1,
    TESSERACT_GIFTS = 2,
    HYPERCUBE_BENEDICTIONS = 3,
    PLATONIC_STATUES = 4,
    CUBE_UPGRADES = 5,
    PLATONIC_UPGRADES = 6,
    HEPTERACT_FORGE = 7,
}

export enum SINGULARITY_VIEW {
    UNKNOWN = -1,

    SHOP = 1,
    PERKS = 2,
    OCTERACTS = 3,
    AMBROSIA = 4
}

export enum GAME_STATE_CHANGE {
    MAIN_VIEW = 1,
    CUBE_VIEW = 2,
    SINGULARITY_VIEW = 3,
}

export interface HSViewProperties {
    subViewIds: string[];
    subViewsSelector: string | string[];
    viewClassName: string;
}

export interface HSViewState<V extends GameView<VIEW_TYPE>> {
    currentView: V;
    previousView: V;
    viewChangeSubscribers: Map<string, (previousView: V, currentView: V) => void>;
}

export interface HSViewStateRecord {
    [key: string]: HSViewState<GameView<VIEW_TYPE>>;
}