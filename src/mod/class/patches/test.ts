import { HSElementHooker } from "../hs-core/hs-elementhooker";
import { HSPatch } from "./hs-patch";

export class PATCH_TestPatch extends HSPatch {
    async applyPatch(): Promise<void> {
        const buildingBtn = await HSElementHooker.HookElement('#buildingstab') as HTMLButtonElement;
        buildingBtn.style.color = 'red';
    }

    async revertPatch(): Promise<void> {
        const buildingBtn = await HSElementHooker.HookElement('#buildingstab') as HTMLButtonElement;
        buildingBtn.style.color = '';
    }
}