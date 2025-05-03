import { PlayerData } from "../../types/hs-player-savedata";
import { HSPerformance } from "../hs-utils/hs-performance";
import { HSUtils } from "../hs-utils/hs-utils";
import { HSGlobal } from "./hs-global";
import { HSLogger } from "./hs-logger";
import { HSModule } from "./hs-module";
import { HSBooleanSetting } from "./hs-setting";
import { HSSettings } from "./hs-settings";

export class HSGameData extends HSModule {
    #saveDataLocalStorageKey = 'Synergysave2';
    #lastSaveDataHash?: string;
    #saveData?: PlayerData;

    #saveDataCheckInterval?: number;

    constructor(moduleName: string, context: string, moduleColor?: string) {
        super(moduleName, context, moduleColor);
    }
    
    async init() {
        const self = this;
        HSLogger.log(`Initializing HSGameData module`, this.context);

        this.isInitialized = true;
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
                    return undefined
                }
            }

            return this.#saveData;
        } catch (error) {
            HSLogger.warn(`getSaveData() - Could not process save data`, this.context);
            this.#maybeStopSniffOnError();
        }
    }

    startSaveDataWatch() {
        const self = this;

        HSLogger.info(`Starting save data watch`, this.context);

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

    stopSaveDataWatch() {
        if (this.#saveDataCheckInterval) {
            clearInterval(this.#saveDataCheckInterval);

            this.#saveDataCheckInterval = undefined;
            this.#saveData = undefined;
            this.#lastSaveDataHash = undefined;

            HSLogger.info(`Stopped save data watch`, this.context);
        }
    }

    #processSaveData(storageKey: string = this.#saveDataLocalStorageKey) {
        try {
            const saveDataB64 = localStorage.getItem(storageKey);
            
            if (!saveDataB64) {
                HSLogger.debug(`<red>No save data found in localStorage</red>`, this.context);
                this.#maybeStopSniffOnError();
                return;
            }
            
            this.#saveData = JSON.parse(atob(saveDataB64)) as PlayerData;
        } catch (error) {
            HSLogger.debug(`<red>Error processing save data:</red> ${error}`, this.context);
            this.#maybeStopSniffOnError();
        }
    }

    async #hasDataChanged(storageKey: string = this.#saveDataLocalStorageKey): Promise<boolean> {
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
                this.stopSaveDataWatch();
            }
        } else {
            HSLogger.debug(`maybeStopSniffOnError() - Issue with fetching settings: ${useGameDataSetting}, ${stopSniffOnErrorSetting}`, this.context);
        }
    }
}