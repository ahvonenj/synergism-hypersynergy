import { SINGULARITY_VIEW } from "../../../types/module-types/hs-gamestate-types";
import { HSLogger } from "../../hs-core/hs-logger";
import { HSUI } from "../../hs-core/hs-ui";
import { HSModule, type HSModuleOptions } from "../../hs-core/module/hs-module";
import { HSModuleRegistry } from "../../hs-core/module/hs-module-registry";
import { HSUpgradeGridSearch } from "./hs-singularity-search-grid";
import { HSPerksSearch } from "./hs-singularity-search-perks";
import singularitySearchCSS from "inline:../../../resource/css/module/hs-singularity-search.css";

const STYLE_ID = 'hs-singularity-search-css';

/**
 * Class: HSSingularitySearch
 * IsExplicitHSModule: Yes
 * Description:
 *     The search fields of the Singularity tab: Perks / Penalties (the matching perks' tooltips cover the penalties
 *     text), Golden Quarks and Octeracts (the upgrades that don't match are dimmed).
 *     The game gives no access to that data, so each tooltip is read by hovering its element through events and
 *     closing it in the same task: nothing is painted, and it works without a patch.
 *     Rules: docs/features/singularity-search.md.
 * Author: Shewchou
 */
export class HSSingularitySearch extends HSModule {
    #shown = false;
    readonly #perks: HSPerksSearch;
    readonly #goldenQuarks: HSUpgradeGridSearch;
    readonly #octeracts: HSUpgradeGridSearch;

    constructor(moduleOptions: HSModuleOptions) {
        super(moduleOptions);
        this.#perks = new HSPerksSearch(this.context);
        this.#goldenQuarks = new HSUpgradeGridSearch({
            name: 'Golden Quark',
            containerId: 'actualSingularityUpgradeContainer',
            apLineId: 'goldenQuarkUpgradeAP',
            upgradeSelector: '.singularityUpgrade',
            maxedToggleId: 'toggleMaxedGoldenQuarkUpgrades',
            placeholder: '[HS] Find an upgrade (cube, ambrosia...)',
        }, this.context);
        this.#octeracts = new HSUpgradeGridSearch({
            name: 'Octeract',
            containerId: 'octeractUpgradeContainer',
            apLineId: 'octeractUpgradeAP',
            upgradeSelector: '.octeractUpgrade',
            maxedToggleId: 'toggleMaxedOcteractUpgrades',
            placeholder: '[HS] Find an upgrade (cube, ambrosia...)',
        }, this.context);
    }

    async init(): Promise<void> {
        HSLogger.log('Initialising HSSingularitySearch module', this.context);

        // Values, what is shown and the language change while a subtab is closed. The game updates them when the
        // subtab opens, before this runs (a mutation observer).
        const gameState = HSModuleRegistry.getModule('HSGameState');
        const onOpen = (view: SINGULARITY_VIEW, part: { refresh(): void }) => {
            gameState?.subscribeSubtab('SINGULARITY_VIEW', view, (isActive) => {
                if (isActive && this.#shown) part.refresh();
            });
        };
        onOpen(SINGULARITY_VIEW.PERKS, this.#perks);
        onOpen(SINGULARITY_VIEW.SHOP, this.#goldenQuarks);
        onOpen(SINGULARITY_VIEW.OCTERACTS, this.#octeracts);

        // Shown by the singularitySearch setting's action (HSSettings.syncSettings)
        this.isInitialized = true;
    }

    async show(): Promise<void> {
        this.#shown = true;
        HSUI.injectStyle(singularitySearchCSS, STYLE_ID);
        HSUI.flushInjectedStyles();
        await Promise.all([this.#perks.show(), this.#goldenQuarks.show(), this.#octeracts.show()]);
    }

    hide(): void {
        this.#shown = false;
        this.#perks.hide();
        this.#goldenQuarks.hide();
        this.#octeracts.hide();
        HSUI.removeInjectedStyle(STYLE_ID);
    }
}
