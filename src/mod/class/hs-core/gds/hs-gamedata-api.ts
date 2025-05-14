import { MeData } from "../../../types/data-types/hs-me-data";
import { PlayerData } from "../../../types/data-types/hs-player-savedata";
import { PseudoGameData } from "../../../types/data-types/hs-pseudo-data";
import { HSLogger } from "../hs-logger";
import { HSModule } from "../module/hs-module";

export class HSGameDataAPI extends HSModule {

    #gameData: PlayerData | undefined;
    #meData: MeData | undefined;
    #pseudoData: PseudoGameData | undefined;

    constructor(moduleName: string, context: string, moduleColor?: string) {
        super(moduleName, context, moduleColor);
    }
        
    async init() {
        const self = this;
        HSLogger.log(`Initializing HSGameDataAPI module`, this.context);

        this.isInitialized = true;
    }

    _updateGameData(data: PlayerData) {
        this.#gameData = data;
    }

    _updateMeData(data: MeData) {
        this.#meData = data;
    }

    _updatePseudoData(data: PseudoGameData) {
        this.#pseudoData = data;
    }
}