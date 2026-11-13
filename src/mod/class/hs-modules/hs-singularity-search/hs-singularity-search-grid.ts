import { HSElementHooker } from "../../hs-core/hs-elementhooker";
import { HSLogger } from "../../hs-core/hs-logger";
import { HSSearchField, readHoverTooltip } from "./hs-singularity-search-field";
import { matchesSearch, normalizeSearchText, searchTerms } from "./hs-singularity-search-match";

const ACTIVE_CLASS = 'hs-sing-search-active';
const HIT_CLASS = 'hs-sing-search-hit';
// The game's class on a maxed upgrade its "Maxed Upgrades: HIDE" toggle hides
const HIDDEN_MAXED_CLASS = 'upgradeHiddenByMaxLevel';

export interface HSUpgradeGridOptions {
    /** In the log: "Golden Quark", "Octeract" */
    name: string;
    containerId: string;
    /** The upgrade AP line at the top of the grid's box: the field goes right under it */
    apLineId: string;
    upgradeSelector: string;
    maxedToggleId: string;
    placeholder: string;
}

interface HSReadUpgrade {
    upgrade: HTMLElement;
    text: string;
}

/**
 * The search field of an upgrade grid (Golden Quarks, Octeracts): the matching upgrades stay lit, the others are
 * dimmed, the game's own tooltip still opens on each. Part of HSSingularitySearch.
 */
export class HSUpgradeGridSearch {
    readonly #options: HSUpgradeGridOptions;
    readonly #context: string;
    #shown = false;
    #container?: HTMLElement;
    #row?: HTMLElement;
    #field?: HSSearchField;
    #upgrades: HSReadUpgrade[] = [];

    constructor(options: HSUpgradeGridOptions, context: string) {
        this.#options = options;
        this.#context = context;
    }

    async show(): Promise<void> {
        this.#shown = true;
        const { name, containerId, upgradeSelector, maxedToggleId } = this.#options;

        this.#container ??= await HSElementHooker.HookElement(`#${containerId}`) ?? undefined;
        const firstUpgrade = await HSElementHooker.HookElement(`#${containerId} ${upgradeSelector}`);
        if (!this.#container || !firstUpgrade) {
            HSLogger.warn(`${name} upgrade search not added: game elements not found`, this.#context);
            return;
        }
        // Turned off again while waiting for the game
        if (!this.#shown) return;

        if (!readHoverTooltip(firstUpgrade, 'mouseout')) {
            HSLogger.log(`${name} upgrade search not added: upgrade tooltips only open on hover`, this.#context);
            return;
        }

        if (!this.#row) {
            this.#row = this.#build();
            // Showing or hiding the maxed upgrades changes the count. Read once the game's own listener has run.
            document.getElementById(maxedToggleId)?.addEventListener('click', () => {
                window.setTimeout(() => this.#search(), 0);
            });
        }
        this.refresh();
    }

    hide(): void {
        this.#shown = false;
        if (!this.#row || !this.#field) return;

        this.#field.clear();
        this.#row.remove();
        this.#upgrades = [];
    }

    /**
     * The subtab was opened, or the field added: the field is put back in place (the game rebuilds the octeract box
     * the first time its subtab opens) and the tooltips read again, for their current text and language.
     */
    refresh(): void {
        if (!this.#shown || !this.#row || !this.#container) return;

        if (!this.#row.isConnected) {
            const apLine = document.getElementById(this.#options.apLineId);
            if (apLine?.parentElement === this.#container) apLine.after(this.#row);
            else this.#container.prepend(this.#row);
        }

        this.#upgrades = this.#readUpgrades();
        this.#search();
    }

    #build(): HTMLElement {
        const row = document.createElement('div');
        row.className = 'hs-sing-search-row';
        this.#field = new HSSearchField(this.#options.placeholder, () => this.#search());
        row.append(this.#field.element);
        return row;
    }

    #search(): void {
        if (!this.#field || !this.#container) return;

        const terms = searchTerms(this.#field.value);
        const searching = terms.length > 0;
        const hits = new Set(searching
            ? this.#upgrades.filter(({ text }) => matchesSearch(text, terms)).map(({ upgrade }) => upgrade)
            : []);

        for (const { upgrade } of this.#upgrades) upgrade.classList.toggle(HIT_CLASS, hits.has(upgrade));
        this.#container.classList.toggle(ACTIVE_CLASS, searching);

        if (!searching) {
            this.#field.setCount('');
            return;
        }
        const hidden = [...hits].filter(upgrade => upgrade.classList.contains(HIDDEN_MAXED_CLASS)).length;
        const shown = hits.size - hidden;
        const results = `${shown} result${shown === 1 ? '' : 's'}`;
        if (hidden === 0) this.#field.setCount(results);
        else this.#field.setCount(`${results} (+${hidden} hidden)`, `${shown} (+${hidden})`);
    }

    /** Every upgrade of the grid, maxed ones hidden by the game's toggle included: they are counted apart. */
    #readUpgrades(): HSReadUpgrade[] {
        const upgrades: HSReadUpgrade[] = [];
        this.#container?.querySelectorAll<HTMLElement>(this.#options.upgradeSelector).forEach((upgrade) => {
            const tooltip = readHoverTooltip(upgrade, 'mouseout');
            if (tooltip) upgrades.push({ upgrade, text: HSUpgradeGridSearch.#searchableText(upgrade, tooltip) });
        });
        return upgrades;
    }

    /**
     * Name and description only: the level, cost and AP lines would make "level" or "quarks" match every upgrade.
     * The tooltip's first line is the name. Its description is the game's translated text, also on the button's
     * aria-label: taken from there, as the tooltip's lines carry no class.
     * textContent, as the tooltip's still hidden when it's read and innerText would be empty.
     */
    static #searchableText(upgrade: HTMLElement, tooltip: HTMLElement): string {
        const name = tooltip.querySelector(':scope > span')?.textContent ?? '';
        const description = upgrade.getAttribute('aria-label') ?? '';
        return normalizeSearchText(`${name} ${description}`);
    }
}
