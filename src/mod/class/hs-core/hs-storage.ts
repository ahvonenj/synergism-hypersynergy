import { HSGlobal } from "./hs-global";
import { HSLogger } from "./hs-logger";
import { HSModule } from "./hs-module";

export class HSStorage extends HSModule {

    constructor(moduleName: string, context: string, moduleColor?: string) {
        super(moduleName, context, moduleColor);
    }

    async init(): Promise<void> { 

    }

    setData<T>(key: string, data: T): boolean {
        try {
            const serializedData = JSON.stringify(data);
            localStorage.setItem(`${HSGlobal.HSStorage.storagePrefix}${key}`, serializedData);
            return true;
        } catch (error) {
            if (error instanceof TypeError) {
                HSLogger.warn('Data serialization error', this.context);
            } else if (error instanceof DOMException) {
                HSLogger.warn('localStorage quota exceeded', this.context);
            } else {
                HSLogger.warn(`Error saving to localStorage: ${error}`, this.context);
            }

            return false;
        }
    }

    getData<T>(key: string): T | null {
        try {
            const item = localStorage.getItem(`${HSGlobal.HSStorage.storagePrefix}${key}`);

            if (item === null) {
                HSLogger.warn(`localStorage[${key}] is null`, this.context);
                return null;
            }

            return JSON.parse(item) as T;
        } catch (error) {
            HSLogger.warn(`Error retrieving from localStorage: ${error}`, this.context);
            return null;
        }
    }

    clearData(key: string) {
        try {
            localStorage.removeItem(`${HSGlobal.HSStorage.storagePrefix}${key}`);
        } catch (error) {
            HSLogger.warn(`Error clearing localStorage: ${error}`, this.context);
        }
    }
}