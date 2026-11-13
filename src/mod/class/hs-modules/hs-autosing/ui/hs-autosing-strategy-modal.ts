import { HSUI } from "../../../hs-core/hs-ui"
import { HSAutosingStrategy, AutosingStrategyPhase, AOAG_PHASE_ID, AOAG_PHASE_NAME, createDefaultAoagPhase, phases, PhaseOption, STRATEGY_FORMAT_VERSION } from "../hs-autosing-types"
import { HSModuleRegistry } from "../../../hs-core/module/hs-module-registry";
import { HSAutosingStrategyControls } from "./hs-autosing-strategy-controls";
import { HSStrategyManager } from "../hs-strategy-manager";
import { HSLogger } from '../../../hs-core/hs-logger';
import { HSUIXY } from "../../../../types/module-types/hs-ui-types";
import { canonicalJson, HSAutosingChallengeModal, openAutosingChallengesModal } from "./hs-autosing-challenge-modal";
import { escapeHtml, escapeLogText } from "../../../hs-utils/hs-escape";
import { HSIcons } from "../../../hs-utils/hs-icons";
import { HSGlobal } from "../../../hs-core/hs-global";

// The players' guide section on strategies (docs/data/guides/autosing.md, published on the mod's website)
const STRATEGY_GUIDE_PATH = "docs/wiki/autosing-guide.html#making-or-editing-a-strategy";

const AOAG_HELP = "Runs when the AOAG rune unlocks (P4x5): stops the current phase, runs these steps, then goes on "
    + "with the phase that ends at 'end'.";

type StrategyWindowMode = 'create' | 'edit' | 'copy';

// In the game's order
function renderEndOptions(ends: readonly PhaseOption[], selected?: PhaseOption): string {
    return ends.map(end => `<option value="${end}"${end === selected ? " selected" : ""}>${end}</option>`).join("");
}

// 30 px right of and 10 px below the last of these windows still in the page (none: HSUI's place)
function cascadePosition(modalIds: string[]): HSUIXY | undefined {
    for (let i = modalIds.length - 1; i >= 0; i--) {
        const modal = modalIds[i] === "" ? null : document.getElementById(modalIds[i]);
        if (modal) return { x: modal.offsetLeft + 30, y: modal.offsetTop + 10 };
    }
    return undefined;
}

/**
 * Class: HSAutosingStrategyModal
 * IsExplicitHSModule: No
 * Description:
 *     The strategy window of the strategy editor (create, edit, or view and copy a default strategy): its phases,
 *     each from the previous one's end to the end picked in its row, plus the AOAG phase. Works on a copy that
 *     Create/Update saves.
 *     - Several windows can be open, one per strategy (viewing a default strategy and editing a player's one are
 *       two) and one new strategy window. Opening one already open brings it to the front instead. Each works on
 *       its own copy: they once found their elements by fixed ids anywhere in the page, and a second copy wired
 *       itself to the first one and saved stale data over its changes.
 *     - A phase's ✎ opens its actions window (one per phase, several phases at once), which writes its steps into
 *       this window's copy on Save. A new window opens a little right of and below the last one of its kind.
 *     - The first phase starts at "start", each other one at the previous one's end. A phase's end dropdown only
 *       offers ends before the next phase's end, so a change never breaks the phases after it. The "+" above a
 *       phase inserts one before it, up to the point picked, where that phase then starts.
 *     - Cancel and the window's × ask before dropping changes, this window's or its actions windows', and close
 *       them all. Deleting a phase whose actions window is open asks first and closes it. Update is refused while
 *       an actions window has unsaved changes.
 * Author: XxMolkxX, Shewchou
 */
export class HSAutosingStrategyModal {
    static readonly #context = 'HSAutosingStrategyModal';
    // The windows open or opening, in opening order (some may have been closed since: see #openWindows)
    static #windows: HSAutosingStrategyModal[] = [];

    #uiMod: HSUI;
    #mode: StrategyWindowMode;
    // What the window opened on: "create", or the mode and the strategy's name
    #key: string;
    // The saved name of the strategy edited (edit mode)
    #editedName: string | undefined;
    #draft: HSAutosingStrategy & { aoagPhase: AutosingStrategyPhase };
    // The draft as opened, to tell whether anything changed
    #initial: string;
    #modalId = "";
    #root!: HTMLElement;
    #list!: HTMLElement;
    #nameInput!: HTMLInputElement;
    #errorBox!: HTMLElement;
    #overlay!: HTMLElement;
    #overlayText!: HTMLElement;
    #overlayConfirm!: HTMLElement;
    // What the overlay's confirm button does
    #onOverlayConfirm: (() => void) | null = null;
    // The actions windows opened from this one, by the phase they edit (some may have been closed since: see #openActions)
    #actions = new Map<AutosingStrategyPhase, HSAutosingChallengeModal>();

    static async open(
        existingStrategy?: HSAutosingStrategy,
        options?: {
            duplicateFromDefault?: boolean;
            suggestedName?: string;
            parentModalId?: string;
        }
    ): Promise<void> {
        const uiMod = HSModuleRegistry.getModule('HSUI');
        if (!uiMod || !uiMod.uiReady) return;

        const mode: StrategyWindowMode = !existingStrategy ? 'create' : options?.duplicateFromDefault ? 'copy' : 'edit';
        const key = mode === 'create' ? 'create' : `${mode}:${existingStrategy!.strategyName}`;
        const open = HSAutosingStrategyModal.#openWindows();
        const twin = open.find(editor => editor.#key === key);
        if (twin) {
            // Still opening (a double click): nothing to show
            if (twin.#modalId === "") return;
            void uiMod.BringModalToFront(twin.#modalId);
            HSUI.Notify(mode === 'create' ? "A new strategy window is already open" : `"${existingStrategy!.strategyName}" is already open in a strategy window`, { notificationType: 'warning' });
            return;
        }

        // Listed before the first await, so that a double click opens one window
        const position = cascadePosition(open.map(editor => editor.#modalId));
        const editor = new HSAutosingStrategyModal(uiMod, mode, key, existingStrategy, options?.suggestedName);
        HSAutosingStrategyModal.#windows.push(editor);
        await editor.#open(options?.parentModalId, position);
    }

    /** True when a window (open or opening) edits this strategy: it is brought to the front. */
    static showEditorOf(strategyName: string): boolean {
        const editor = HSAutosingStrategyModal.#openWindows().find(w => w.#editedName === strategyName);
        if (!editor) return false;
        if (editor.#modalId !== "") void editor.#uiMod.BringModalToFront(editor.#modalId);
        return true;
    }

    // The windows closed (by any way) are dropped from the list
    static #openWindows(): HSAutosingStrategyModal[] {
        HSAutosingStrategyModal.#windows = HSAutosingStrategyModal.#windows.filter(editor => editor.#modalId === "" || editor.#isOpen());
        return HSAutosingStrategyModal.#windows;
    }

    private constructor(uiMod: HSUI, mode: StrategyWindowMode, key: string, existingStrategy: HSAutosingStrategy | undefined, suggestedName?: string) {
        this.#uiMod = uiMod;
        this.#mode = mode;
        this.#key = key;
        this.#editedName = this.#mode === 'edit' ? existingStrategy!.strategyName : undefined;

        const strategy: AutosingStrategyPhase[] = existingStrategy ? structuredClone(existingStrategy.strategy) : [];
        // An older format kept the AOAG phase in the list
        const aoagIndex = strategy.findIndex(p => p.phaseId === AOAG_PHASE_ID);
        const aoagFromList = aoagIndex === -1 ? undefined : strategy.splice(aoagIndex, 1)[0];
        const aoagPhase = existingStrategy?.aoagPhase ? structuredClone(existingStrategy.aoagPhase) : aoagFromList ?? createDefaultAoagPhase();
        aoagPhase.phaseId = AOAG_PHASE_ID;

        this.#draft = {
            strategyName: this.#mode === 'copy'
                ? (suggestedName ?? `${existingStrategy!.strategyName}_copy`)
                : existingStrategy?.strategyName ?? "",
            // Kept: a strategy not brought to the current format yet gets its AOAG level step when saved
            formatVersion: existingStrategy ? existingStrategy.formatVersion : STRATEGY_FORMAT_VERSION,
            strategy,
            aoagPhase
        };
        this.#fixPhaseChain();
        this.#initial = this.#canonical(this.#draft.strategyName);
    }

    async #open(parentModalId: string | undefined, position: HSUIXY | undefined): Promise<void> {
        const isEdit = this.#mode === 'edit';
        this.#modalId = await this.#uiMod.Modal({
            htmlContent: `
                <div class="hs-strategy-modal-container">
                    <div class="hs-strategy-input-section">
                        <div class="hs-strategy-input-label hs-strategy-name-label">
                            <span>Strategy Name</span>
                            <a class="hs-strategy-guide-link" href="${HSGlobal.General.modWebsiteUrl}${STRATEGY_GUIDE_PATH}" target="_blank" rel="noopener" title="How phases and steps work, in the Auto-Sing guide">How to make or edit a strategy ↗</a>
                        </div>
                        <input type="text" class="hs-strategy-name-input" placeholder="Enter strategy name..."
                            value="${escapeHtml(this.#draft.strategyName)}"${isEdit ? " disabled" : ""} />
                        ${this.#mode === 'copy' ? '<div class="hs-strategy-note">Default strategies are read-only; saving creates a user copy.</div>' : ''}
                    </div>
                    <div class="hs-strategy-input-section">
                        <div class="hs-strategy-input-label">Strategy Phases</div>
                        <div class="hs-strategy-phase-list"></div>
                    </div>
                    <div class="hs-strategy-error" hidden></div>
                    <div class="hs-strategy-btn-group">
                        <div class="hs-strategy-btn hs-strategy-btn-secondary" data-action="cancel">Cancel</div>
                        <div class="hs-strategy-btn hs-strategy-btn-primary" data-action="save">
                            ${isEdit ? 'Update Strategy' : (this.#mode === 'copy' ? 'Save as a new Strategy' : 'Create Strategy')}
                        </div>
                    </div>
                    <div class="hs-editor-overlay" hidden>
                        <div class="hs-editor-overlay-box">
                            <div class="hs-strategy-overlay-text"></div>
                            <div class="hs-editor-overlay-buttons">
                                <div class="hs-challenges-footer-btn hs-challenges-cancel-btn" data-action="overlay-keep">Keep</div>
                                <div class="hs-challenges-footer-btn hs-editor-overlay-confirm" data-action="overlay-confirm"></div>
                            </div>
                        </div>
                    </div>
                </div>
            `,
            title: isEdit ? "Edit Autosing Strategy" : (this.#mode === 'copy' ? "View / Copy Default Strategy" : "Create Autosing Strategy"),
            parentModalId,
            position
        });

        const modal = document.getElementById(this.#modalId);
        const root = modal?.querySelector<HTMLElement>(".hs-strategy-modal-container");
        if (!modal || !root) return;
        this.#root = root;
        this.#list = root.querySelector<HTMLElement>(".hs-strategy-phase-list")!;
        this.#nameInput = root.querySelector<HTMLInputElement>(".hs-strategy-name-input")!;
        this.#errorBox = root.querySelector<HTMLElement>(".hs-strategy-error")!;
        this.#overlay = root.querySelector<HTMLElement>(".hs-editor-overlay")!;
        this.#overlayText = root.querySelector<HTMLElement>(".hs-strategy-overlay-text")!;
        this.#overlayConfirm = root.querySelector<HTMLElement>('[data-action="overlay-confirm"]')!;

        root.addEventListener("click", e => this.#onClick(e));
        root.addEventListener("change", e => this.#onChange(e));
        // The window's ×: on its own button, so that HSUI's handler on the window never sees a click held back
        modal.querySelector<HTMLElement>(".hs-modal-close-btn")?.addEventListener("click", e => {
            if (this.#hasChanges()) {
                e.stopPropagation();
                this.#ask("Discard unsaved changes?", "Discard", () => this.#close());
            } else {
                this.#closeActions();
            }
        });

        this.#redraw();
    }

    // ----- Phases -----

    // The first phase starts at "start", each other one at the previous one's end
    #fixPhaseChain(): void {
        let start: PhaseOption = "start";
        for (const phase of this.#draft.strategy) {
            phase.startPhase = start;
            start = phase.endPhase;
        }
    }

    #lastEnd(): PhaseOption {
        return this.#draft.strategy.at(-1)?.endPhase ?? "start";
    }

    // After the phase's start, before the next phase's end (its current end kept, whatever it is)
    #endsOf(index: number): PhaseOption[] {
        const phase = this.#draft.strategy[index];
        const next = this.#draft.strategy[index + 1];
        const ends = phases.slice(phases.indexOf(phase.startPhase) + 1, next ? phases.indexOf(next.endPhase) : phases.length);
        return ends.includes(phase.endPhase) ? ends : [...ends, phase.endPhase];
    }

    #addPhase(endPhase: PhaseOption): void {
        this.#draft.strategy.push({ startPhase: this.#lastEnd(), endPhase, strat: [] });
        this.#redraw();
    }

    // A new phase before this one, from its start to the point picked, where this one now starts
    #insertPhase(index: number, endPhase: PhaseOption): void {
        this.#draft.strategy.splice(index, 0, { startPhase: this.#draft.strategy[index].startPhase, endPhase, strat: [] });
        this.#fixPhaseChain();
        this.#redraw();
    }

    // The "+" in the gap above a phase: the points between its start and its end (none: no "+")
    #insertSelect(index: number): string {
        const phase = this.#draft.strategy[index];
        const points = phases.slice(phases.indexOf(phase.startPhase) + 1, phases.indexOf(phase.endPhase));
        return points.length === 0 ? "" : `<span class="hs-strategy-insert" data-index="${index}" title="Insert a phase before this one">`
            + `<select class="hs-strategy-insert-select"><option value="" selected hidden></option>`
            + `<optgroup label="Insert a phase from ${phase.startPhase} to:">${renderEndOptions(points)}</optgroup></select></span>`;
    }

    #setEnd(index: number, endPhase: PhaseOption): void {
        this.#draft.strategy[index].endPhase = endPhase;
        this.#fixPhaseChain();
        this.#redraw();
    }

    // By object: the list may have changed since the click
    #deletePhase(phase: AutosingStrategyPhase): void {
        const index = this.#draft.strategy.indexOf(phase);
        if (index === -1) return;
        this.#draft.strategy.splice(index, 1);
        this.#fixPhaseChain();
        this.#redraw();
    }

    #phaseAt(element: HTMLElement): AutosingStrategyPhase | undefined {
        const row = element.closest<HTMLElement>(".hs-strategy-phase-item");
        if (!row) return undefined;
        return row.dataset.aoag !== undefined ? this.#draft.aoagPhase : this.#draft.strategy[Number(row.dataset.index)];
    }

    // ----- Actions windows -----

    #actionsTitle(phase: AutosingStrategyPhase): string {
        return phase === this.#draft.aoagPhase
            ? `Configure ${AOAG_PHASE_NAME}`
            : `Configure Strategy Actions (${phase.startPhase}-${phase.endPhase})`;
    }

    #phaseLabel(phase: AutosingStrategyPhase): string {
        return phase === this.#draft.aoagPhase ? AOAG_PHASE_NAME : `Phase ${this.#draft.strategy.indexOf(phase) + 1}`;
    }

    // The actions windows open or opening (the ones closed meanwhile are dropped)
    #openActions(): Map<AutosingStrategyPhase, HSAutosingChallengeModal> {
        for (const [phase, actionsWindow] of this.#actions) {
            if (!actionsWindow.isOpen()) this.#actions.delete(phase);
        }
        return this.#actions;
    }

    #closeActions(): void {
        for (const actionsWindow of this.#openActions().values()) actionsWindow.close();
    }

    #editActions(phase: AutosingStrategyPhase): void {
        const open = this.#openActions();
        const twin = open.get(phase);
        if (twin) {
            // Still opening (a double click): nothing to show
            if (twin.modalId === "") return;
            twin.bringToFront();
            HSUI.Notify(`${this.#phaseLabel(phase)}'s actions window is already open`, { notificationType: 'warning' });
            return;
        }
        const position = cascadePosition([...open.values()].map(actionsWindow => actionsWindow.modalId));
        open.set(phase, openAutosingChallengesModal(this.#uiMod, phase.strat, this.#actionsTitle(phase), this.#modalId, () => this.#redraw(), position));
    }

    // ----- Window -----

    // The game's Antiquities rune image; its path when the runes tab isn't built yet
    #aoagIcon(): string {
        const source = document.getElementById('antiquitiesRune');
        const icon = (source ? HSIcons.fromElement(source) : null) ?? { url: 'Pictures/Runes/Antiquities.png' };
        const element = document.createElement('span');
        element.className = 'hs-strategy-aoag-icon';
        HSIcons.applyBackground(element, icon, 18);
        return element.outerHTML;
    }

    #redraw(): void {
        const stepsButton = (phase: AutosingStrategyPhase) => {
            const count = phase.strat.length;
            return `<div class="hs-strategy-btn hs-strategy-btn-icon hs-strategy-btn-steps${count === 0 ? " hs-strategy-btn-steps-empty" : ""}" data-action="edit" title="Edit this phase's steps">✎ ${count} step${count === 1 ? "" : "s"}</div>`;
        };
        // Autosing runs it right before the phase that ends at "end" (the last one, if any); none yet: at the bottom
        const finalIndex = this.#draft.strategy.findIndex(phase => phase.endPhase === "end");
        // The final phase's "+" goes on the AOAG row, in the gap above it: inserting before that phase is inserting before AOAG
        const aoagRow = `
            <div class="hs-strategy-phase-item hs-strategy-aoag-item" data-aoag>
                ${finalIndex === -1 ? "" : this.#insertSelect(finalIndex)}
                <div class="hs-strategy-phase-text hs-strategy-aoag-label">
                    ${this.#aoagIcon()}<strong>${AOAG_PHASE_NAME}</strong>
                    <span class="hs-strategy-aoag-help" title="${escapeHtml(AOAG_HELP)}">?</span>
                </div>
                ${stepsButton(this.#draft.aoagPhase)}
                <span class="hs-strategy-btn-spacer"></span>
            </div>`;
        const phaseRows = this.#draft.strategy.length === 0
            ? '<div class="hs-strategy-empty-state">No strategy phases added yet.</div>'
            : this.#draft.strategy.map((phase, i) => `
                ${i === finalIndex ? aoagRow : ""}
                <div class="hs-strategy-phase-item" data-index="${i}">
                    ${i === finalIndex ? "" : this.#insertSelect(i)}
                    <div class="hs-strategy-phase-text hs-strategy-phase-start"><span>Phase ${i + 1}:</span> <span>${phase.startPhase} <span class="hs-strategy-phase-arrow">→</span></span></div>
                    <select class="hs-strategy-end-select" title="Where this phase ends">${renderEndOptions(this.#endsOf(i), phase.endPhase)}</select>
                    ${stepsButton(phase)}
                    <div class="hs-strategy-btn hs-strategy-btn-icon hs-strategy-btn-delete" data-action="delete" title="Delete this phase">×</div>
                </div>`).join("");
        // Below the last phase (none once a phase ends at "end")
        const lastEnd = this.#lastEnd();
        const addSelect = lastEnd === "end" ? "" : `<select class="hs-strategy-add-select" title="Add a phase after the last one">`
            + `<option value="" selected hidden>Add phase until…</option>${renderEndOptions(phases.slice(phases.indexOf(lastEnd) + 1))}</select>`;
        this.#list.innerHTML = phaseRows + (finalIndex === -1 ? aoagRow : "") + addSelect;

        for (const [phase, actionsWindow] of this.#openActions()) actionsWindow.setTitle(this.#actionsTitle(phase));
        // The last refused save's reason may no longer hold
        this.#errorBox.hidden = true;
    }

    #canonical(name: string): string {
        return canonicalJson({ name, strategy: this.#draft.strategy, aoagPhase: this.#draft.aoagPhase });
    }

    #hasChanges(): boolean {
        return this.#canonical(this.#nameInput.value) !== this.#initial || this.#actionsHaveChanges();
    }

    #actionsHaveChanges(): boolean {
        return [...this.#openActions().values()].some(actionsWindow => actionsWindow.hasUnsavedChanges());
    }

    #isOpen(): boolean {
        return this.#modalId !== "" && document.getElementById(this.#modalId) !== null;
    }

    #ask(text: string, confirmLabel: string, onConfirm: () => void): void {
        this.#overlayText.textContent = text;
        this.#overlayConfirm.textContent = confirmLabel;
        this.#onOverlayConfirm = onConfirm;
        this.#overlay.hidden = false;
    }

    #showError(message: string): void {
        this.#errorBox.textContent = message;
        this.#errorBox.hidden = false;
    }

    #close(): void {
        this.#closeActions();
        void this.#uiMod.CloseModal(this.#modalId);
    }

    #onChange(e: Event): void {
        const target = e.target as HTMLSelectElement;
        // The "+" holds its phase's index itself: the final phase's one is on the AOAG row
        const index = Number(target.closest<HTMLElement>("[data-index]")?.dataset.index);
        if (target.classList.contains("hs-strategy-add-select")) {
            if (target.value) this.#addPhase(target.value as PhaseOption);
        } else if (target.classList.contains("hs-strategy-end-select")) {
            this.#setEnd(index, target.value as PhaseOption);
        } else if (target.classList.contains("hs-strategy-insert-select")) {
            if (target.value) this.#insertPhase(index, target.value as PhaseOption);
        }
    }

    #onClick(e: MouseEvent): void {
        const target = e.target as HTMLElement;
        const action = target.closest<HTMLElement>("[data-action]")?.dataset.action;
        switch (action) {
            case "edit": {
                const phase = this.#phaseAt(target);
                if (phase) this.#editActions(phase);
                break;
            }
            case "delete": {
                const phase = this.#phaseAt(target);
                if (!phase) break;
                if (this.#openActions().has(phase)) {
                    this.#ask(`${this.#phaseLabel(phase)}'s actions window is open. Delete the phase and close it?`, "Delete", () => {
                        this.#openActions().get(phase)?.close();
                        this.#deletePhase(phase);
                    });
                } else {
                    this.#deletePhase(phase);
                }
                break;
            }
            case "cancel":
                if (this.#hasChanges()) this.#ask("Discard unsaved changes?", "Discard", () => this.#close());
                else this.#close();
                break;
            case "save":
                this.#save();
                break;
            case "overlay-keep":
                this.#overlay.hidden = true;
                break;
            case "overlay-confirm":
                this.#overlay.hidden = true;
                this.#onOverlayConfirm?.();
                break;
        }
    }

    #save(): void {
        const context = HSAutosingStrategyModal.#context;
        if (this.#actionsHaveChanges()) {
            this.#showError("Save or close the actions windows first");
            return;
        }
        this.#draft.strategyName = this.#nameInput.value || "Unnamed Strategy";
        try {
            const { saved } = HSStrategyManager.saveStrategyToStorage(this.#draft, this.#editedName, context);
            if (!saved) {
                HSUI.Notify("Failed to save strategy", { notificationType: "error" });
                return;
            }
            HSAutosingStrategyControls.updateStrategyDropdownList();
            HSAutosingStrategyControls.selectAutosingStrategyByName(this.#draft.strategyName);
            if (this.#mode === 'edit') {
                HSLogger.log(`Strategy "${escapeLogText(this.#draft.strategyName)}" updated.`, context);
                HSUI.Notify(`Strategy "${this.#draft.strategyName}" updated`, { notificationType: "success" });
            } else {
                HSUI.Notify(`Strategy "${this.#draft.strategyName}" ${this.#mode === 'copy' ? 'saved as new and selected' : 'created and selected'}.`, { notificationType: "success" });
            }
            this.#close();
        } catch (err) {
            this.#showError((err as Error).message);
        }
    }
}
