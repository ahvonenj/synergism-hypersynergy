import type { HSModule } from './hs-module';
import type { HSModuleInstances } from './hs-module-definitions';

/**
 * Class: HSModuleRegistry
 * IsExplicitHSModule: No
 * Description: Module instances and name-inferred lookups, with no runtime dependency on module constructors.
 * Author: XxMolkxX
 */
export class HSModuleRegistry {
    static #modules = new Map<string, HSModule>();

    static register<K extends keyof HSModuleInstances>(name: K, instance: HSModuleInstances[K]): void {
        this.#modules.set(name, instance);
    }

    static getModule<K extends keyof HSModuleInstances>(name: K): HSModuleInstances[K] | undefined {
        return this.#modules.get(name) as HSModuleInstances[K] | undefined;
    }

    /** Log contexts can also be arbitrary strings or CSS colours; they do not need a typed module instance. */
    static getModuleColor(context: string): string | undefined {
        return this.#modules.get(context)?.moduleColor;
    }
}
