import { HSUI } from "../../hs-core/hs-ui";
import { HSIcons, type HSIcon } from "../../hs-utils/hs-icons";

export interface HSQuickbarIconPickerOptions<TSlotKey> {
    shouldIgnoreClickTarget: (target: Element) => boolean;
    setSlotPickModeVisual: (slotKey: TSlotKey, active: boolean) => void;
    clearAllSlotPickModeVisuals: () => void;
    assignIconToSlot: (slotKey: TSlotKey, iconUrl: string) => void;
}

export class HSQuickbarIconPickerController<TSlotKey> {
    #isPicking = false;
    #targetSlot: TSlotKey | null = null;
    #docClickListener: ((event: MouseEvent) => void) | null = null;
    #pickSequence = 0;
    readonly #options: HSQuickbarIconPickerOptions<TSlotKey>;

    constructor(options: HSQuickbarIconPickerOptions<TSlotKey>) {
        this.#options = options;
    }

    start(slotKey: TSlotKey): void {
        if (this.#isPicking) {
            HSUI.Notify(
                "Icon picker is already active. Click an in-game icon/image to assign, or click anywhere to cancel.",
                { position: "topRight", notificationType: "default" }
            );
            return;
        }

        this.#pickSequence += 1;
        this.#isPicking = true;
        this.#targetSlot = slotKey;
        this.#options.clearAllSlotPickModeVisuals();
        this.#options.setSlotPickModeVisual(slotKey, true);

        HSUI.Notify(
            "Icon picker active: click an in-game icon/image to assign to this slot. Any click ends mode.",
            { position: "topRight", notificationType: "default" }
        );

        this.#docClickListener = (event: MouseEvent) => {
            // Only the player's clicks count: the mod's own clicks (GDS on the save button every few ms,
            // autosing, quickbars) neither end the mode nor get taken as the icon
            if (!event.isTrusted) return;

            const target = event.target instanceof Element ? event.target : null;
            if (!target || this.#options.shouldIgnoreClickTarget(target)) {
                this.end();
                return;
            }
            if (this.#targetSlot === null) {
                this.end();
                return;
            }

            const icon = this.#findIconFromEventTarget(target);
            if (!icon) {
                HSUI.Notify(
                    "No usable icon found on the clicked element.",
                    { notificationType: "warning" }
                );
                this.end();
                return;
            }

            event.preventDefault();
            event.stopPropagation();

            const targetSlot = this.#targetSlot;
            const pickSequence = this.#pickSequence;
            this.end();
            void HSIcons.toUrl(icon).then(iconUrl => {
                if (pickSequence !== this.#pickSequence) return;
                this.#options.assignIconToSlot(targetSlot, iconUrl);
                HSUI.Notify("Slot icon set successfully", { notificationType: "success" });
            }).catch(() => {
                if (pickSequence !== this.#pickSequence) return;
                HSUI.Notify("Could not load the selected icon. Please try again.", { notificationType: "warning" });
            });
        };

        document.addEventListener("click", this.#docClickListener, true);
    }

    end(): void {
        this.#isPicking = false;
        this.#targetSlot = null;

        if (this.#docClickListener) {
            document.removeEventListener("click", this.#docClickListener, true);
            this.#docClickListener = null;
        }

        this.#options.clearAllSlotPickModeVisuals();
    }

    dispose(): void {
        this.#pickSequence += 1;
        this.end();
    }

    #findIconFromEventTarget(target: EventTarget | null): HSIcon | null {
        let element = target instanceof Element ? target : null;
        let depth = 0;

        while (element && element !== document.documentElement && depth < 8) {
            const icon = HSIcons.fromElement(element);
            if (icon) return icon;
            element = element.parentElement;
            depth += 1;
        }

        return null;
    }

}
