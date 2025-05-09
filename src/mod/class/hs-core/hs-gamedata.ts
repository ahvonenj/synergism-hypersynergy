import { PlayerData } from "../../types/hs-player-savedata";
import { HSPerformance } from "../hs-utils/hs-performance";
import { HSUtils } from "../hs-utils/hs-utils";
import { HSElementHooker } from "./hs-elementhooker";
import { HSGlobal } from "./hs-global";
import { HSLogger } from "./hs-logger";
import { HSModule } from "./hs-module";
import { HSBooleanSetting } from "./hs-setting";
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
                    return undefined;
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
                this.stopSaveDataWatch();
            }
        } else {
            HSLogger.debug(`maybeStopSniffOnError() - Issue with fetching settings: ${useGameDataSetting}, ${stopSniffOnErrorSetting}`, this.context);
        }
    }

    async enableTurbo() {
        const self = this;

        if(this.#turboEnabled) return;

        const gameDataSetting = HSSettings.getSetting('useGameData') as HSBooleanSetting;

        if(gameDataSetting && !gameDataSetting.isEnabled()) {
            const gameDataTurboSetting = HSSettings.getSetting('gameDataTurbo') as HSBooleanSetting;

            if(gameDataTurboSetting) {
                gameDataTurboSetting.disable();
            }

            HSLogger.warn(`Please enable game data sniffing before enabling turbo mode.`, this.context); 
            return;
        }

        HSUI.injectStyle(this.#turboCSS, HSGlobal.HSGameData.turboCSSId);

        if(this.#turboInterval) {
            clearInterval(this.#turboInterval);
        }

        this.stopSaveDataWatch();

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

        this.#turboEnabled = true;
    }

    async disableTurbo() {
        if(this.#turboInterval) {
            clearInterval(this.#turboInterval);
            this.#turboInterval = undefined;
        }

        const gameDataSetting = HSSettings.getSetting('useGameData') as HSBooleanSetting;

        if(gameDataSetting && gameDataSetting.isEnabled()) {
            this.startSaveDataWatch();
        }

        HSUI.removeInjectedStyle(HSGlobal.HSGameData.turboCSSId);

        this.#turboEnabled = false;
    }

    #saveDataChanged() {
        this.#updateDebug();
    }

    #updateDebug() {
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