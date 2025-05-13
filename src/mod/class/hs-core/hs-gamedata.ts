import { MeData } from "../../types/hs-me-data";
import { PlayerData } from "../../types/hs-player-savedata";
import { PseudoGameData } from "../../types/hs-pseudo-data";
import { HSPerformance } from "../hs-utils/hs-performance";
import { HSUtils } from "../hs-utils/hs-utils";
import { HSElementHooker } from "./hs-elementhooker";
import { HSGlobal } from "./hs-global";
import { HSLogger } from "./hs-logger";
import { HSModule } from "./hs-module";
import { HSBooleanSetting, HSSetting } from "./hs-setting";
import { HSSettings } from "./hs-settings";
import { HSUI } from "./hs-ui";

export class HSGameData extends HSModule {
    #saveDataLocalStorageKey = 'Synergysave2';
    
    #lastSaveDataHash?: string;
    #saveDataCheckInterval?: number;

    #saveData?: PlayerData;

    // Turbo mode
    #turboEnabled = false;
    #manualSaveButton?: HTMLButtonElement;
    #saveinfoElement?: HTMLParagraphElement;

    #turboCSS = `
        #savegame {
            display: none !important;
        }

        #saveinfo {
            display: none !important;
        }
    `;

    #turboInterval?: number;

    #gameDataDebugElement?: HTMLDivElement;

    #gameDataSubscribers: Map<string, (data: PlayerData) => void> = new Map<string, (data: PlayerData) => void>();

    #singularityButton?: HTMLImageElement;
    #singularityChallengeButtons?: HTMLDivElement[];
    #singularityEventHandler?: (e: MouseEvent) => Promise<void>;

    // These are not used
    #afterSingularityCheckerIntervalElapsed = 0;
    #afterSingularityCheckerInterval?: number;
    #wasUsingGDS = false;

    // Used maybe
    #singularityTargetType?: "challenge" | "normal";

    #playerPseudoUpgrades?: PseudoGameData;
    #meBonuses?: MeData;

    constructor(moduleName: string, context: string, moduleColor?: string) {
        super(moduleName, context, moduleColor);
    }
    
    async init() {
        const self = this;
        HSLogger.log(`Initializing HSGameData module`, this.context);

        this.#singularityButton = document.querySelector('#singularitybtn') as HTMLImageElement;
        this.#singularityChallengeButtons = Array.from(document.querySelectorAll('#singularityChallenges > div.singularityChallenges > div'));

        try {
            const upgradesQuery = await fetch('https://synergism.cc/stripe/upgrades');
            const data = await upgradesQuery.json() as PseudoGameData; 

            this.#playerPseudoUpgrades = data;
        } catch (err) {
            HSLogger.error(`Could not fetch pseudo data`, this.context);
        }

        try {
            const meQuery = await fetch('https://synergism.cc/api/v1/users/me');
            const data = await meQuery.json() as MeData; 

            this.#meBonuses = data;
        } catch (err) {
            HSLogger.error(`Could not fetch me data`, this.context);
        }

        this.isInitialized = true;
    }

    getPseudoData(): PseudoGameData | undefined {
        return this.#playerPseudoUpgrades;
    }

    getMeBonuses(): MeData {
        if(this.#meBonuses) {
            return this.#meBonuses;
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

    getCurrentData(): PlayerData | undefined {
        return this.#saveData;
    }

    async getSaveData(updateFirst = false, storageKey = this.#saveDataLocalStorageKey): Promise<PlayerData | undefined> {
        try {
            if(updateFirst) {
                const useGameDataSetting = HSSettings.getSetting('useGameData') as HSBooleanSetting;

                if(useGameDataSetting && useGameDataSetting.isEnabled()) {
                    const hasChanged = await this.#hasDataChanged(storageKey);
        
                    if (hasChanged) {
                        this.#processSaveData(storageKey);
                    }
                } else {
                    return undefined;
                }
            }

            return this.#saveData;
        } catch (error) {
            HSLogger.warn(`getSaveData() - Could not process save data`, this.context);
            this.#maybeStopSniffOnError();
        }
    }

    /*startSaveDataWatch(forTurbo = false) {
        const self = this;

        if(forTurbo) {
            HSLogger.debug(`Started save data watch because turbo was disabled`, this.context);
        } else {
            HSLogger.info(`Starting save data watch`, this.context);
        }

        if (this.#saveDataCheckInterval) {
            clearInterval(this.#saveDataCheckInterval);
        }

        this.#saveDataCheckInterval = setInterval(async () => {
            if(HSGlobal.Debug.performanceDebugMode) {
                try {
                    HSPerformance.beginMeasure('saveDataChangedMeasure');
                    const hasChanged = await self.#hasDataChanged();
                    const saveDataChangedMeasure = HSPerformance.endMeasure('saveDataChangedMeasure');
                    let saveDataProcessMeasure;

                    if (hasChanged) {
                        HSPerformance.beginMeasure('saveDataProcessMeasure');
                        self.#processSaveData();
                        saveDataProcessMeasure = HSPerformance.endMeasure('saveDataProcessMeasure');
                    }

                    saveDataChangedMeasure.logToConsole();
                    if (saveDataProcessMeasure) saveDataProcessMeasure.logToConsole();
                } catch (error) {
                    HSLogger.debug(`<red>Error in save data check interval:</red> ${error}`, self.context);
                    this.#maybeStopSniffOnError();
                }
            } else {
                const hasChanged = await self.#hasDataChanged();
                
                if (hasChanged) {
                    self.#processSaveData();
                }
            }
            
        }, HSGlobal.HSGameData.saveDataWatchInterval);
    }

    stopSaveDataWatch(forTurbo = false) {
        if (this.#saveDataCheckInterval) {
            clearInterval(this.#saveDataCheckInterval);

            this.#saveDataCheckInterval = undefined;
            this.#saveData = undefined;
            this.#lastSaveDataHash = undefined;

            if(forTurbo) {
                HSLogger.debug(`Stopped save data watch for turbo`, this.context);
            } else {
                HSLogger.info(`Stopped save data watch`, this.context);
            }
        }
    }*/

    #processSaveData(storageKey: string = this.#saveDataLocalStorageKey) {
        try {
            const saveDataB64 = localStorage.getItem(storageKey);
            
            if (!saveDataB64) {
                HSLogger.debug(`<red>No save data found in localStorage</red>`, this.context);
                this.#maybeStopSniffOnError();
                return;
            }
            
            this.#saveData = JSON.parse(atob(saveDataB64)) as PlayerData;
            this.#saveDataChanged();
        } catch (error) {
            HSLogger.debug(`<red>Error processing save data:</red> ${error}`, this.context);
            this.#maybeStopSniffOnError();
        }
    }

    async #hasDataChanged(storageKey: string = this.#saveDataLocalStorageKey): Promise<boolean> {
        // If hashing is disabled, we just say that the data has always changed
        if(!HSGlobal.HSGameData.saveDataHashing)
            return true;

        const currentSaveDataB64 = localStorage.getItem(storageKey);
        
        // If both are null, no change
        if (currentSaveDataB64 === null && this.#lastSaveDataHash === null) {
            return false;
        }
        
        // If one is null but not the other, there's a change
        if ((currentSaveDataB64 === null) !== (this.#lastSaveDataHash === null)) {
            if (currentSaveDataB64) {
                this.#lastSaveDataHash = await HSUtils.computeHash(currentSaveDataB64);
            } else {
                this.#lastSaveDataHash = undefined;
            }

            return true;
        }
        
        // Compute hash of current data
        const currentHash = await HSUtils.computeHash(currentSaveDataB64!);
        const hasChanged = currentHash !== this.#lastSaveDataHash;
        
        // Update the reference hash
        this.#lastSaveDataHash = currentHash;
        
        return hasChanged;
    }

    #maybeStopSniffOnError() {
        if (!this.#saveDataCheckInterval) return;

        const useGameDataSetting = HSSettings.getSetting('useGameData') as HSBooleanSetting;
        const stopSniffOnErrorSetting = HSSettings.getSetting('stopSniffOnError') as HSBooleanSetting;
        
        if(useGameDataSetting && stopSniffOnErrorSetting) {
            if(stopSniffOnErrorSetting.isEnabled()) {
                HSLogger.debug(`Stopped game data sniffing on error`, this.context);
                useGameDataSetting.disable();
            }
        } else {
            HSLogger.debug(`maybeStopSniffOnError() - Issue with fetching settings: ${useGameDataSetting}, ${stopSniffOnErrorSetting}`, this.context);
        }
    }

    async enableGDS() {
        const self = this;

        if(this.#turboEnabled) return;

        HSUI.injectStyle(this.#turboCSS, HSGlobal.HSGameData.turboCSSId);

        if(this.#turboInterval) {
            clearInterval(this.#turboInterval);
        }

        //this.stopSaveDataWatch(true);

        if(!this.#manualSaveButton) {
            this.#manualSaveButton = await HSElementHooker.HookElement('#savegame') as HTMLButtonElement;
        }

        if(!this.#saveinfoElement) {
            this.#saveinfoElement = await HSElementHooker.HookElement('#saveinfo') as HTMLParagraphElement;
        }

        this.#turboInterval = setInterval(() => {
            if(self.#manualSaveButton && self.#saveinfoElement) {
                self.#manualSaveButton.click();
                self.#processSaveData();
            }
        }, HSGlobal.HSGameData.turboModeSpeedMs);

        if(!this.#singularityButton)
            this.#singularityButton = await HSElementHooker.HookElement('#singularitybtn') as HTMLImageElement;

        if(!this.#singularityChallengeButtons)
            this.#singularityChallengeButtons = Array.from(document.querySelectorAll('#singularityChallenges > div.singularityChallenges > div'));

        if(!this.#singularityEventHandler)
            this.#singularityEventHandler = async (e: MouseEvent) => { self.#singularityHandler(e); } 

        this.#singularityButton.addEventListener('click', this.#singularityEventHandler, { capture: true });

        this.#singularityChallengeButtons.forEach((btn) => {
            btn.addEventListener('click', self.#singularityEventHandler!, { capture: true });
        })

        HSLogger.info(`GDS turbo = ON`, this.context);
        this.#turboEnabled = true;
    }

    async #singularityHandler(e: MouseEvent) {
        const target = e.target as HTMLElement;

        const challengeTargets = [
            'noSingularityUpgrades',
            'oneChallengeCap',
            'limitedAscensions',
            'noOcteracts',
            'noAmbrosiaUpgrades',
            'limitedTime',
            'sadisticPrequel',
        ];
        
        if(target) {
            let canSingularity;
            const styleString = target.getAttribute('style');

            // User pressed singularity challenge button
            if(target.id && challengeTargets.includes(target.id)) {
                this.#singularityTargetType = "challenge";

                // User pressed active sing challenge button (is trying to quit or complete it)
                if(styleString?.includes('orchid')) {
                    canSingularity = true;
                } else {
                    // User pressed non-active sing challenge button
                    // If any challenge is active, user can't sing
                    const anyChallengeActive = challengeTargets
                    .map((t) => document.querySelector(`#${t}`)?.getAttribute('style')?.includes('orchid'))
                    .some((b => b === true));

                    // User can't sing because they're trying to swap sing challenge
                    if(anyChallengeActive) {
                        canSingularity = false;
                    } else {
                        canSingularity = true;
                    }
                }
            } else {
                // User pressed the normal sing button
                // Check if the button is grayed out
                if(!styleString?.toLowerCase().includes('grayscale')) {
                    canSingularity = true;
                } else {
                    canSingularity = false;
                }
            }

            if(canSingularity) {
                const gameDataSetting = HSSettings.getSetting("useGameData") as HSSetting<boolean>;

                if(gameDataSetting && gameDataSetting.isEnabled()) {
                    this.#wasUsingGDS = true;
                    //this.#afterSingularityCheckerIntervalElapsed = 0;
                    //clearInterval(this.#afterSingularityCheckerInterval);

                    // From here on these are used
                    gameDataSetting.disable();

                    await HSUI.Notify('GDS temporarily disabled for Sing and will be re-enabled soon', {
                        position: 'topRight',
                        notificationType: 'warning'
                    });

                    await HSUtils.wait(4000);

                    const gdsSetting = HSSettings.getSetting('useGameData') as HSSetting<boolean>;
    
                    if(gdsSetting && this.#wasUsingGDS && !gdsSetting.isEnabled()) {
                        HSLogger.debug(`Re-enabled GDS`, this.context);
                        gdsSetting.enable();
                    } else {
                        HSLogger.debug(`GDS was already enabled (WoW fast!)`, this.context);
                    }

                    this.#wasUsingGDS = false;
                    //this.#afterSingularityCheckerIntervalElapsed = 0;
                    this.#singularityTargetType = undefined;  
                }
            }
        }
    }

    async disableGDS() {
        const self = this;

        if(this.#turboInterval) {
            clearInterval(this.#turboInterval);
            this.#turboInterval = undefined;
        }

        /*const gameDataSetting = HSSettings.getSetting('useGameData') as HSBooleanSetting;

        if(gameDataSetting && gameDataSetting.isEnabled()) {
            this.startSaveDataWatch(true);
        }*/

        HSUI.removeInjectedStyle(HSGlobal.HSGameData.turboCSSId);

        if(!this.#singularityButton)
            this.#singularityButton = await HSElementHooker.HookElement('#singularitybtn') as HTMLImageElement;

        if(!this.#singularityChallengeButtons)
            this.#singularityChallengeButtons = await HSElementHooker.HookElements('#singularityChallenges > div.singularityChallenges > div') as HTMLDivElement[];
        
        if(!this.#singularityEventHandler)
            this.#singularityEventHandler = async (e: MouseEvent) => { self.#singularityHandler(e); } 

        this.#singularityButton.removeEventListener('click', this.#singularityEventHandler, { capture: true });

        this.#singularityChallengeButtons.forEach((btn) => {
            btn.removeEventListener('click', self.#singularityEventHandler!, { capture: true });
        })

        HSLogger.info(`GDS turbo = OFF`, this.context);
        this.#turboEnabled = false;
    }

    subscribeGameDataChange(callback: (data: PlayerData) => void): string | undefined {
        const id = HSUtils.uuidv4();
        this.#gameDataSubscribers.set(id, callback);
        return id;
    }

    unsubscribeGameDataChange(id: string) {
        if(this.#gameDataSubscribers.has(id)) {
            this.#gameDataSubscribers.delete(id);
        } else {
            HSLogger.warn(`Could not unsubscribe from game data change. ID ${id} not found`, this.context);
        }
    }

    #saveDataChanged() {
        this.#updateDebug();

        this.#gameDataSubscribers.forEach((callback) => {
            if(this.#saveData) {
                callback(this.#saveData);
            } else {
                HSLogger.debug(`Could not call game data change callback. No save data found`, this.context);
            }
        });
    }

    #updateDebug() {
        if(!HSGlobal.Debug.gameDataDebugMode) return;

        let ambrosia = null;
        let ant = null;
        let dbg = '';

        if(this.#saveData) {
            ambrosia = Math.round(this.#saveData.blueberryTime);
            ant = this.#saveData.antPoints;
        }

        if(!this.#gameDataDebugElement || this.#gameDataDebugElement === undefined) {
            const debugElement = document.querySelector('#hs-panel-debug-gamedata-currentambrosia') as HTMLDivElement;

            if(debugElement) {
                this.#gameDataDebugElement = debugElement;
                this.#gameDataDebugElement.innerHTML = `Current ambrosia: ${ambrosia ? ambrosia : 'null'}<br>Current ant: ${ant ? ant : 'null'}`;
            }
        } else {
            this.#gameDataDebugElement.innerHTML = `Current ambrosia: ${ambrosia ? ambrosia : 'null'}<br>Current ant: ${ant ? ant : 'null'}`;
        }
    }
}