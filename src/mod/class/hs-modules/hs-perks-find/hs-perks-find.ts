import { HSModuleOptions } from "../../../types/hs-types";
import { SINGULARITY_VIEW } from "../../../types/module-types/hs-gamestate-types";
import { HSElementHooker } from "../../hs-core/hs-elementhooker";
import type { HSGameState } from "../../hs-core/hs-gamestate";
import { HSLogger } from "../../hs-core/hs-logger";
import { HSUI } from "../../hs-core/hs-ui";
import { HSModule } from "../../hs-core/module/hs-module";
import { HSModuleRegistry } from "../../hs-core/module/hs-module-registry";
import { matchesSearch, normalizeSearchText, searchTerms } from "./hs-perks-find-match";
import perksFindCSS from "inline:../../../resource/css/module/hs-perks-find.css";

const STYLE_ID = 'hs-perks-find-css';
const PERK_SELECTOR = '#singularityPerksGrid .singularityPerkNode';
const ACTIVE_CLASS = 'hs-perks-find-active';
const HIT_CLASS = 'hs-perks-find-hit';
// The clickable words under the field: what fits on one row
const SUBJECTS = ['quark', 'cube', 'octeract', 'ant', 'luck', 'salvage', 'token', 'auto', 'challenge', 'purple'];

interface HSReadPerk {
    perk: HTMLElement;
    card: HTMLElement;
    text: string;
}

/**
 * Class: HSPerksFind
 * IsExplicitHSModule: Yes
 * Description:
 *     The search field of the Singularity tab's Perks / Penalties subtab: the tooltips of the matching perks
 *     cover the penalties text, the other perks are dimmed in the tree.
 *     The game gives no access to its perk data, so each tooltip is read by hovering the perk through events
 *     and closing it in the same task: nothing is painted, and it works without a patch.
 *     Rules: docs/features/perks-find.md.
 * Author: Shewchou
 */
export class HSPerksFind extends HSModule {
    #shown = false;
    #info?: HTMLElement;
    #root?: HTMLElement;
    #input?: HTMLInputElement;
    #clearButton?: HTMLElement;
    #count?: HTMLElement;
    #results?: HTMLElement;
    #subjectButtons = new Map<string, HTMLElement>();

    constructor(moduleOptions: HSModuleOptions) {
        super(moduleOptions);
    }

    async init(): Promise<void> {
        HSLogger.log('Initialising HSPerksFind module', this.context);

        // A perk's values and whether it is shown change while the subtab is closed. The game updates them when
        // the subtab opens, before this runs (a mutation observer).
        const gameState = HSModuleRegistry.getModule('HSGameState');
        gameState?.subscribeSubtab('SINGULARITY_VIEW', SINGULARITY_VIEW.PERKS, (isActive) => {
            if (isActive) this.#refresh();
        });

        // Shown by the perksFind setting's action (HSSettings.syncSettings)
        this.isInitialized = true;
    }

    async show(): Promise<void> {
        this.#shown = true;

        this.#info ??= await HSElementHooker.HookElement('#singularityInfo') ?? undefined;
        const firstPerk = await HSElementHooker.HookElement(PERK_SELECTOR);
        if (!this.#info || !firstPerk) {
            HSLogger.warn('Perk search not added: game elements not found', this.context);
            return;
        }
        // Turned off again while waiting for the game
        if (!this.#shown) return;

        // On a touch device the game opens a perk's tooltip with a click, which can't be read this way
        if (!HSPerksFind.#readTooltip(firstPerk)) {
            HSLogger.log('Perk search not added: perk tooltips only open on hover', this.context);
            return;
        }

        HSUI.injectStyle(perksFindCSS, STYLE_ID);
        HSUI.flushInjectedStyles();
        this.#root ??= this.#build();
        this.#info.append(this.#root);
        this.#refresh();
    }

    hide(): void {
        this.#shown = false;
        if (!this.#root || !this.#input) return;

        this.#input.value = '';
        this.#search();
        this.#root.remove();
        HSUI.removeInjectedStyle(STYLE_ID);
    }

    #build(): HTMLElement {
        const root = document.createElement('div');
        root.id = 'hs-perks-find';

        const field = document.createElement('div');
        field.id = 'hs-perks-find-field';

        const input = document.createElement('input');
        input.id = 'hs-perks-find-input';
        input.type = 'text';
        input.placeholder = '[HS] Find a perk (cube, quark...)';
        input.autocomplete = 'off';
        input.spellcheck = false;
        input.addEventListener('input', () => this.#search());
        input.addEventListener('keydown', (event) => {
            if (event.key !== 'Escape') return;
            // The focus leaves the field below: without this, the game's hotkeys would get the key
            event.stopPropagation();
            input.value = '';
            this.#search();
            input.blur();
        });

        const clearButton = document.createElement('button');
        clearButton.id = 'hs-perks-find-clear';
        clearButton.type = 'button';
        clearButton.textContent = 'Clear';
        clearButton.addEventListener('click', () => {
            input.value = '';
            this.#search();
            input.focus();
        });

        const count = document.createElement('span');
        count.id = 'hs-perks-find-count';

        const subjects = document.createElement('div');
        subjects.id = 'hs-perks-find-subjects';
        for (const word of SUBJECTS) {
            const button = document.createElement('button');
            button.type = 'button';
            button.textContent = word;
            button.addEventListener('click', () => {
                input.value = word;
                this.#search();
                input.focus();
            });
            subjects.append(button);
            this.#subjectButtons.set(word, button);
        }

        const results = document.createElement('div');
        results.id = 'hs-perks-find-results';

        field.append(input, clearButton, count);
        root.append(field, subjects, results);
        this.#input = input;
        this.#clearButton = clearButton;
        this.#count = count;
        this.#results = results;
        return root;
    }

    /**
     * The subtab was opened, or the field added. A word that finds nothing isn't offered: nothing unlocked yet on
     * that subject, or another wording in the game's language.
     */
    #refresh(): void {
        if (!this.#root) return;

        const perks = HSPerksFind.#readShownPerks();
        this.#subjectButtons.forEach((button, word) => {
            const terms = searchTerms(word);
            button.style.display = perks.some(({ text }) => matchesSearch(text, terms)) ? '' : 'none';
        });
        this.#showResults(perks);
    }

    #search(): void {
        if (!this.#input) return;
        this.#showResults(searchTerms(this.#input.value).length > 0 ? HSPerksFind.#readShownPerks() : []);
    }

    #showResults(perks: HSReadPerk[]): void {
        if (!this.#input || !this.#clearButton || !this.#count || !this.#results || !this.#info) return;

        const terms = searchTerms(this.#input.value);
        const searching = terms.length > 0;
        const hits = searching ? perks.filter(({ text }) => matchesSearch(text, terms)) : [];
        const cards = hits.map(({ card }) => card);

        document.querySelectorAll(`.${HIT_CLASS}`).forEach(perk => perk.classList.remove(HIT_CLASS));
        hits.forEach(({ perk }) => perk.classList.add(HIT_CLASS));

        this.#info.classList.toggle(ACTIVE_CLASS, searching);
        this.#clearButton.style.visibility = this.#input.value === '' ? 'hidden' : 'visible';
        this.#count.textContent = searching ? `${cards.length} result${cards.length === 1 ? '' : 's'}` : '';
        this.#results.scrollTop = 0;
        // For its height down to the window's bottom (hs-perks-find.css)
        this.#results.style.setProperty('--hs-perks-find-results-top', `${this.#results.getBoundingClientRect().top}px`);

        if (searching && cards.length === 0) {
            const empty = document.createElement('div');
            empty.className = 'hs-perks-find-empty';
            empty.textContent = 'No perk found';
            this.#results.replaceChildren(empty);
        } else {
            this.#results.replaceChildren(...cards);
        }
    }

    /** The perks the game shows. What it hides stays hidden: the perks further than its next previews. */
    static #readShownPerks(): HSReadPerk[] {
        const perks: HSReadPerk[] = [];
        document.querySelectorAll<HTMLElement>(PERK_SELECTOR).forEach((perk) => {
            const card = perk.style.display !== 'none' ? HSPerksFind.#readTooltip(perk) : null;
            if (card) perks.push({ perk, card, text: HSPerksFind.#searchableText(card) });
        });
        return perks;
    }

    /** A copy of the perk's tooltip as the game draws it, or null when hovering opened none. */
    static #readTooltip(perk: HTMLElement): HTMLElement | null {
        perk.dispatchEvent(new MouseEvent('mousemove', { clientX: 0, clientY: 0 }));
        const tooltip = document.querySelector<HTMLElement>('#modalContent > .singularityPerkModal');
        const card = tooltip ? tooltip.cloneNode(true) as HTMLElement : null;
        perk.dispatchEvent(new MouseEvent('mouseleave'));
        return card;
    }

    // Name and description only: the level lines would make "level" match every perk.
    // textContent, as the tooltip's still hidden when it's read and innerText would be empty.
    static #searchableText(card: HTMLElement): string {
        const name = card.querySelector('.singularityPerkModalTitle')?.textContent ?? '';
        const description = card.querySelector('.singularityPerkModalDescription')?.textContent ?? '';
        return normalizeSearchText(`${name} ${description}`);
    }
}
