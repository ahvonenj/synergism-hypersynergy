export abstract class HSPatch {
    #patchName: string;

    constructor(patchName: string) {
        this.#patchName = patchName;
    }

    get patchName(): string {
        return this.#patchName;
    }

    abstract applyPatch(): void | Promise<void>;
    abstract revertPatch(): void | Promise<void>;
}