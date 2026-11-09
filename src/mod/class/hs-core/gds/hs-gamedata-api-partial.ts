import { CampaignData } from "../../../types/data-types/hs-campaign-data";
import { ConsumableGameEvents, VanillaGlobalEvent } from "../../../types/data-types/hs-event-data";
import { HSCalculationDefinition } from "../../../types/data-types/hs-gamedata-api-types";
import { MeData } from "../../../types/data-types/hs-me-data";
import { GameData } from "../../../types/data-types/hs-player-savedata";
import { PseudoGameData } from "../../../types/data-types/hs-pseudo-data";
import { HSModuleOptions } from "../../../types/hs-types";
import { HSLogger } from "../hs-logger";
import { HSModule } from "../module/hs-module";
import { HSModuleManager } from "../module/hs-module-manager";
import { HSCalculationDefinitions } from "./hs-calculation-definition";
import { HSGameData } from "./hs-gamedata";

/**
 * Class: HSGameDataAPIPartial
 * IsExplicitHSModule: Yes
 * Description: 
 *   The implementation here is a bit silly.
 *   I wanted a separate file for the GameDataAPI itself, which is this file
 *   and a separate file for calculation functions which use game data
 *
 *   However, the only "sane" way to do this is to have one class extends another,
 *   but the order we need to do in is a bit silly.
 *
 *   We will have two classes: HSGameDataAPIPartial and HSGameDataAPI
 *
 *   The silly thing here is that HSGameDataAPI will be the class which contains the calculations
 *   and HSGameDataAPIPartial will be the actual API class, so these classes are sort of the wrong way
 *
 *   We need HSGameDataAPI to be the main class so that we can give it to module manager with a good name
 *   and this means that HSGameDataAPI needs to be the class which extends from HSGameDataAPIPartial,
 *   which means that HSGameDataAPIPartial needs to contain the main HSGameDataAPI definitions,
 *   forcing HSGameDataAPI to contain the calculations.
 *    
 */
export abstract class HSGameDataAPIPartial extends HSModule {

    protected gameDataModule: HSGameData | undefined;

    protected gameData: GameData | undefined;
    protected meData: MeData | undefined;
    protected pseudoData: PseudoGameData | undefined;
    protected campaignData: CampaignData | undefined;
    protected eventData: ConsumableGameEvents | undefined;
    protected vanillaGlobalEvent: VanillaGlobalEvent | null = null;
    protected isEvent: boolean = false;

    static readonly Calculations: HSCalculationDefinition[] = HSCalculationDefinitions;

    constructor(moduleOptions: HSModuleOptions) {
        super(moduleOptions);
    }

    async init() {
        HSLogger.log(`Initializing HSGameDataAPI module`, this.context);
        this.gameDataModule = HSModuleManager.getModule<HSGameData>('HSGameData');

        this.isInitialized = true;
    }

    // All of these _update methods are called from HSGameData (hs-gamedata.ts)
    // when the game data updates
    _updateGameData(data: GameData) {
        this.gameData = data;
    }

    _updateMeData(data: MeData) {
        this.meData = data;
    }

    _updatePseudoData(data: PseudoGameData) {
        this.pseudoData = data;
    }

    // TODO: clean that...
    _updateEventData(data: ConsumableGameEvents) {
        this.eventData = data;

        this.isEvent = false;
        if (this.eventData && "HAPPY_HOUR_BELL" in this.eventData) {
            this.isEvent = this.eventData.HAPPY_HOUR_BELL.amount > 0;
        }

        if (!this.isEvent && this.vanillaGlobalEvent) {
            this.isEvent = true;
        }
    }

    // These get methods are meant to be the public methods to get data
    getCampaignData(): CampaignData | undefined {
        return this.campaignData;
    }

    getGameData(): GameData | undefined {
        return this.gameData;
    }

    getMeData(): MeData {
        if (this.meData) {
            return this.meData;
        } else {
            return {
                bonus: {
                    quark: 0
                },
                globalBonus: 0,
            }
        }
    }

    getPseudoData(): PseudoGameData | undefined {
        return this.pseudoData;
    }

    getEventData(): ConsumableGameEvents | undefined {
        return this.eventData;
    }

    getVanillaGlobalEvent(): VanillaGlobalEvent | null {
        return this.vanillaGlobalEvent;
    }

    // A Happy Hour Bell or a global event is active
    isEventActive(): boolean {
        return this.isEvent;
    }

    /**
     * Takes the game's own answer from https://synergism.cc/events/get (Event.ts eventCheck, handed over by the patcher;
     * the mod doesn't fetch it), and keeps it when the game would: a name, and now between start and end.
     * "Now" is the game's clock (getTimePinnedToLoadDate: the wall clock at page load plus performance.now()),
     * which performance.timeOrigin + performance.now() matches to within milliseconds, also after a clock change or a sleep.
     */
    _updateVanillaGlobalEvent(raw: unknown) {
        const apiEvent = raw as VanillaGlobalEvent | null;
        const now = performance.timeOrigin + performance.now();

        if (apiEvent && Array.isArray(apiEvent.name) && apiEvent.name.length > 0
            && typeof apiEvent.start === 'number' && typeof apiEvent.end === 'number'
            && now >= apiEvent.start && now <= apiEvent.end) {
            this.vanillaGlobalEvent = apiEvent;
        } else {
            this.vanillaGlobalEvent = null;
        }

        this.isEvent = false;
        if (this.eventData && "HAPPY_HOUR_BELL" in this.eventData) {
            this.isEvent = this.eventData.HAPPY_HOUR_BELL.amount > 0;
        }
        if (!this.isEvent && this.vanillaGlobalEvent) {
            this.isEvent = true;
        }
    }

    async getForcedGameData(): Promise<GameData | undefined> {
        if (this.gameDataModule) {
            await this.gameDataModule.forceRefreshGameData();
            // HSGameData will call _updateGameData internally
            return this.gameData;
        }
        return undefined;
    }

    async prepareForAutosing() {
        await this.gameDataModule?.prepareForAutosing();
    }

    async getLatestAutosingData(): Promise<{ quarks: number; goldenQuarks: number; quarksFromAnts: number; quarksThisSingularity: number; } | null> {
        return await this.gameDataModule?.getLatestAutosingData() || null;
    }

    static getCalculationDefinitions(filter?: {
        supportsReduce?: "true" | "false" | "both",
        toolingSupport?: "true" | "false" | "both"
    }): HSCalculationDefinition[] {
        const createFilter = (f?: string) => {
            if (f) {
                switch (f) {
                    case "true":
                        return (x: boolean) => x;
                    case "false":
                        return (x: boolean) => !x;
                    case "both":
                        return (...args: any[]) => true;
                }
            }

            return (...args: any[]) => true;
        }

        const fReduce = createFilter(filter?.supportsReduce);
        const fTooling = createFilter(filter?.toolingSupport);

        const filtered = this.Calculations.filter((calculationDef) => {
            return fReduce(calculationDef.supportsReduce) && fTooling(calculationDef.toolingSupport);
        });

        return filtered;
    }
}
