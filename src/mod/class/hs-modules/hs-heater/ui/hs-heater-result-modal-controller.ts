import { HSModuleRegistry } from "../../../hs-core/module/hs-module-registry";
import { HSUI } from "../../../hs-core/hs-ui";
import { HSHeaterUIStyles } from "./hs-heater-ui-styles";
import { HSHeaterUIResult } from "./hs-heater-ui-result";
import { HSHeaterResultStore } from "../hs-heater-result-store";
import { buildResultTableHtmlFromNormalized } from "./hs-heater-ui-result-renderer";
import type { HeaterOptimizationResult } from "../../../../types/data-types/hs-heater-types";
import type { NormalizedHeaterResultEntry } from "../hs-heater-result-store";

export class HSHeaterResultModalController {
    static currentResultModalId: string | null = null;
    static currentResultParentModalId: string | null = null;

    // ================================================================
    // Result modal lifecycle / refresh API
    // ================================================================

    static async openHeaterResultModal(result: HeaterOptimizationResult, parentModalId?: string): Promise<void> {
        if (parentModalId) {
            this.currentResultParentModalId = parentModalId;
        }
        const hsui = HSModuleRegistry.getModule('HSUI');
        if (!hsui) {
            HSUI.Notify('Failed to open heater result modal because UI was unavailable.', { position: 'top', notificationType: 'error' });
            return;
        }

        HSHeaterUIStyles.ensureHeaterStylesInjected();

        const resultPosition = (() => {
            if (!parentModalId) { return undefined; }
            const parentModal = document.getElementById(parentModalId);
            if (!parentModal) { return undefined; }
            return {
                x: parentModal.offsetLeft + parentModal.offsetWidth + 2,
                y: parentModal.offsetTop,
            };
        })();

        HSHeaterResultStore.setResultFromRaw(result);
        const normalizedResult = HSHeaterResultStore.getCurrentNormalizedResult();
        if (!normalizedResult) return;

        const inputsModal = parentModalId ? document.getElementById(parentModalId) : null;
        const selectedSemanticIds = inputsModal
            ? HSHeaterResultStore.collectSelectedSemanticIds(inputsModal)
            : new Set<string>();

        if (inputsModal) {
            this.syncLoadoutAvailabilityState(inputsModal, normalizedResult);
        }

        if (this.currentResultModalId) {
            const existingModal = document.getElementById(this.currentResultModalId);
            if (existingModal) {
                const updated = HSHeaterUIResult.updateResultModalContent(existingModal, normalizedResult, selectedSemanticIds);
                if (parentModalId) {
                    this.currentResultParentModalId = parentModalId;
                }
                if (updated) {
                    return;
                }
            }
            this.currentResultModalId = null;
            this.currentResultParentModalId = null;
            HSHeaterUIResult.clearActiveResultModal();
        }

        const content = buildResultTableHtmlFromNormalized(normalizedResult, selectedSemanticIds);

        this.currentResultModalId = await hsui.Modal({
            title: 'Ambrosia Heater Results',
            htmlContent: content,
            position: resultPosition,
            parentModalId,
            headerClass: 'hs-heater-results-header',
            bodyClass: 'hs-heater-results-body',
            onClose: (modal) => {
                HSHeaterUIResult.detachResultModalHandlers(modal);
                if (this.currentResultModalId === modal.id) this.cleanupResultModalState();
            },
            styles: {
                width: 'auto',
                height: 'auto',
            }
        });

        const resultModal = this.currentResultModalId ? document.getElementById(this.currentResultModalId) : null;
        if (resultModal) {
            HSHeaterUIResult.setActiveResultModal(resultModal);
            HSHeaterUIResult.attachResultModalHandlers(this.currentResultModalId);
        } else {
            this.currentResultModalId = null;
        }
    }

    static reconnectToInputsModal(parentModalId: string): void {
        if (!this.currentResultModalId) return;
        const resultModal = document.getElementById(this.currentResultModalId);
        if (!resultModal) {
            this.cleanupResultModalState();
            return;
        }

        this.currentResultParentModalId = parentModalId;
        this.repositionResultModal(resultModal, parentModalId);

        const normalizedResult = HSHeaterResultStore.getCurrentNormalizedResult();
        if (!normalizedResult) return;

        const inputsModal = document.getElementById(parentModalId);
        if (!inputsModal) return;

        const selectedSemanticIds = HSHeaterResultStore.collectSelectedSemanticIds(inputsModal);
        HSHeaterUIResult.updateResultModalContent(resultModal, normalizedResult, selectedSemanticIds);
        this.syncLoadoutAvailabilityState(inputsModal, normalizedResult);
    }

    static refreshSelectedTypeHighlights(parentModalId: string, syncAvailability = true): void {
        const resultModal = this.currentResultModalId ? document.getElementById(this.currentResultModalId) : null;
        if (!resultModal && this.currentResultModalId) {
            this.cleanupResultModalState();
        }

        const normalizedResult = HSHeaterResultStore.getCurrentNormalizedResult();
        if (!normalizedResult) return;

        const inputsModal = document.getElementById(parentModalId);
        if (!inputsModal) return;

        const selectedSemanticIds = HSHeaterResultStore.collectSelectedSemanticIds(inputsModal);
        if (resultModal) {
            HSHeaterUIResult.updateResultModalContent(resultModal, normalizedResult, selectedSemanticIds);
        }

        if (syncAvailability) {
            this.syncLoadoutAvailabilityState(inputsModal, normalizedResult);
        }
    }

    
    // ================================================================
    // Result modal sync / DOM helper methods
    // ================================================================

    static syncLoadoutAvailabilityState(modal: HTMLElement, normalizedResult?: NormalizedHeaterResultEntry[] | null): void {
        const typeSelects = Array.from(modal.querySelectorAll('.hs-heater-type-select')) as HTMLSelectElement[];
        const typeCheckboxes = Array.from(modal.querySelectorAll('.hs-heater-type-select-checkbox')) as HTMLInputElement[];
        if (!normalizedResult) {
            typeSelects.forEach((select) => {
                select.classList.add('hs-heater-type-select-unavailable');
                select.classList.remove('hs-heater-type-select-unaffordable');
            });
            return;
        }

        const availableSemanticIds = new Set<string>(normalizedResult.map((entry) => entry.semanticId as string));

        for (let i = 0; i < typeSelects.length; i++) {
            const semanticId = (typeSelects[i].value || '').trim();
            const select = typeSelects[i];
            const checkbox = typeCheckboxes[i];
            const isAvailable = semanticId !== '' && semanticId !== 'none' && availableSemanticIds.has(HSHeaterResultStore.resolveSemanticId(semanticId));
            const isUnaffordable = HSHeaterResultStore.isSemanticIdUnaffordable(semanticId);

            // Nothing to import for a missing or an unaffordable type
            if (checkbox) {
                checkbox.checked = isAvailable && !isUnaffordable;
            }

            select.classList.toggle('hs-heater-type-select-unavailable', !isAvailable);
            select.classList.toggle('hs-heater-type-select-unaffordable', isUnaffordable);
        }
    }

    private static repositionResultModal(resultModal: HTMLElement, parentModalId: string): void {
        const parentModal = document.getElementById(parentModalId);
        if (!parentModal) return;

        const x = parentModal.offsetLeft + parentModal.offsetWidth + 2;
        const y = parentModal.offsetTop;
        resultModal.style.left = `${x}px`;
        resultModal.style.top = `${y}px`;
    }

    private static cleanupResultModalState(): void {
        const wasParentModalAvailable = this.currentResultParentModalId ? document.getElementById(this.currentResultParentModalId) !== null : false;
        this.currentResultModalId = null;
        this.currentResultParentModalId = null;
        HSHeaterUIResult.clearActiveResultModal();
        HSHeaterUIResult.clearResultModalResources();

        if (!wasParentModalAvailable) {
            HSHeaterResultStore.clearCurrentNormalizedResult();
        }
    }
}
