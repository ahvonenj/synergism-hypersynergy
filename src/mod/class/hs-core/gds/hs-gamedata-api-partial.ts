import { CampaignData } from "../../../types/data-types/hs-campaign-data";
import { ConsumableGameEvents } from "../../../types/data-types/hs-event-data";
import { MeData } from "../../../types/data-types/hs-me-data";
import { PlayerData } from "../../../types/data-types/hs-player-savedata";
import { PseudoGameData } from "../../../types/data-types/hs-pseudo-data";
import { HSModuleOptions } from "../../../types/hs-types";
import { HSLogger } from "../hs-logger";
import { HSModule } from "../module/hs-module";

/*
    The implementation here is a bit silly.
    I wanted a separate file for the GameDataAPI itself, which is this file
    and a separate file for calculation functions which use game data

    However, the only "sane" way to do this is to have one class extends another,
    but the order we need to do in is a bit silly.

    We will have two classes: HSGameDataAPIPartial and HSGameDataAPI

    The silly thing here is that HSGameDataAPI will be the class which contains the calculations
    and HSGameDataAPIPartial will be the actual API class, so these classes are sort of the wrong way

    We need HSGameDataAPI to be the main class so that we can give it to module manager with a good name
    and this means that HSGameDataAPI needs to be the class which extends from HSGameDataAPIPartial,
    which means that HSGameDataAPIPartial needs to contain the main HSGameDataAPI definitions,
    forcing HSGameDataAPI to contain the calculations.
    
*/
export abstract class HSGameDataAPIPartial extends HSModule {

    protected gameData: PlayerData | undefined;
    protected meData: MeData | undefined;
    protected pseudoData: PseudoGameData | undefined;
    protected campaignData: CampaignData | undefined;
    protected eventData: ConsumableGameEvents | undefined;
    protected isEvent: boolean = false;

    constructor(moduleOptions : HSModuleOptions) {
        super(moduleOptions);
    }
        
    async init() {
        const self = this;
        HSLogger.log(`Initializing HSGameDataAPI module`, this.context);

        this.isInitialized = true;
    }

    // All of these _update methods are called from HSGameData (hs-gamedata.ts)
    // when the game data updates
    _updateGameData(data: PlayerData) {
        this.gameData = data;
    }

    _updateMeData(data: MeData) {
        this.meData = data;
    }

    _updatePseudoData(data: PseudoGameData) {
        this.pseudoData = data;
    }

    _updateCampaignData(data: CampaignData) {
        this.campaignData = data;
    }

    _updateEventData(data: ConsumableGameEvents) {
        this.eventData = data;

        if(this.eventData) {
            if("HAPPY_HOUR_BELL" in this.eventData) {
                this.isEvent = this.eventData.HAPPY_HOUR_BELL.amount > 0;
            }
        }
    }

    // These get methods are meant to be the public methods to get data
    getCampaignData(): CampaignData | undefined {
        return this.campaignData;
    }

    getGameData(): PlayerData | undefined {
        return this.gameData;
    }

    getMeData(): MeData {
        if(this.meData) {
            return this.meData;
        } else {
            return {
                bonus: {
                    quarkBonus: 0
                },
                globalBonus: 0,
                personalBonus: 0,
            }
        }
    }

    getPseudoData(): PseudoGameData | undefined {
        return this.pseudoData;
    }

    getEventData(): ConsumableGameEvents | undefined {
        return this.eventData;
    }
}