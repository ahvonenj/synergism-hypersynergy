import { HSLogger } from "../../hs-core/hs-logger";
import { HSHeaderModules } from "../../hs-core/header/hs-header-modules";
import { HSQOLAutomationQuickbar } from "./hs-qolQuickbarAutomation";
import { HSQuickbarManager } from "./hs-qolQuickbarManager";

/**
 * Class: HSAutomationQuickbarPlacement
 * IsExplicitHSModule: No
 * Description:
 *     Created by HSQOLButtons. Turns the Automation Quickbar on and off: a module of the game's header, or a section
 *     of the mod's quickbar row without the patcher's header modules patch.
 * Author: Shewchou
 */
export class HSAutomationQuickbarPlacement {
    #context: string;
    #automationQuickbarHandler: HSQOLAutomationQuickbar | null = null;
    // The Automation Quickbar's id as a module of the game's header (see HSHeaderModules)
    static readonly #AUTOMATION_HEADER_MODULE = 'hsAutomationHeader';

    constructor(context: string) {
        this.#context = context;
    }

    /**
     * Enable the Automation Quickbar: a module of the game's header, which the player places in the header's edit mode
     * (it starts in the tray), or the mod's quickbar row without the patcher's header modules patch.
     */
    enable(): void {
        if (!this.#automationQuickbarHandler) this.#automationQuickbarHandler = new HSQOLAutomationQuickbar();
        const handler = this.#automationQuickbarHandler;

        const headerModule = HSHeaderModules.register(HSAutomationQuickbarPlacement.#AUTOMATION_HEADER_MODULE);
        if (headerModule) {
            // Already filled: enabled twice
            if (headerModule.childElementCount > 0) return;
            const section = handler.createSection() as HTMLDivElement;
            headerModule.appendChild(section);
            handler.setup(section).catch(e => HSLogger.log(`Error during automation quickbar setup: ${e}`, this.#context));
            return;
        }

        const id = HSQuickbarManager.QUICKBAR_IDS.AUTOMATION;
        HSLogger.debug(() => `Enabling Quickbar: ${id}`, this.#context);
        void HSQuickbarManager.getInstance().enableQuickbar(
            id,
            () => ({
                element: handler.createSection(),
                teardown: () => {
                    HSLogger.debug(() => 'Automation quickbar teardown invoked', this.#context);
                    try { handler.teardown(); }
                    catch (e) { HSLogger.log(`Error during automation quickbar teardown: ${e}`, this.#context); }
                }
            }),
            (section) => { try { handler.setup(section as HTMLDivElement); } catch (e) { HSLogger.log(`Error during automation quickbar setup: ${e}`, this.#context); } }
        );
    }

    /** Disable the Automation Quickbar, wherever it is (its place in the header stays remembered). */
    disable(): void {
        const id = HSAutomationQuickbarPlacement.#AUTOMATION_HEADER_MODULE;
        if (HSHeaderModules.isRegistered(id)) {
            try { this.#automationQuickbarHandler?.teardown(); }
            catch (e) { HSLogger.log(`Error during automation quickbar teardown: ${e}`, this.#context); }
            // Taken before unregister() takes it out of the page; emptied so the next enable fills it again
            const headerModule = document.getElementById(id);
            HSHeaderModules.unregister(id);
            headerModule?.replaceChildren();
        } else {
            // Manager will call the stored teardown; just remove the section and drop handler reference.
            const quickbarId = HSQuickbarManager.QUICKBAR_IDS.AUTOMATION;
            HSLogger.debug(() => `Disabling Quickbar: ${quickbarId}`, this.#context);
            HSQuickbarManager.getInstance().disableQuickbar(quickbarId);
        }
        this.#automationQuickbarHandler = null;
    }
}
