import { HSElementHooker } from "../../hs-core/hs-elementhooker";
import { HSLogger } from "../../hs-core/hs-logger";
import { HSModuleManager } from "../../hs-core/module/hs-module-manager";
import { HSUtils } from "../../hs-utils/hs-utils";
import { HSNumberParser } from "../../hs-utils/hs-number-parser";
import type { HSGameDataAPI } from "../../hs-core/gds/hs-gamedata-api";
import { parseGameDataNumber } from "../../hs-core/gds/hs-gamedata-utils";
import { HEPTERACT_DATA, hepteractCapacities, hepteractUnitsToReach } from "./hs-hepteract-state";
import { AscensionIncomeSnapshot, formatDuration, HSAscensionIncome } from "./hs-ascension-income";

type PlatonicResourceEstimate = {
    resource: string;
    seconds: number;
    // Not owned yet: the next ascension's gain is needed
    needsAscension: boolean;
};

type PlatonicRequirement = {
    // As displayed: cut to 3 digits, up to 1% below the real cost
    amount: number;
    // The game's own check (lime cost colour)
    affordable: boolean;
};

/**
 * Class: HSPlatonicUpgradeTime
 * IsExplicitHSModule: No
 * Description:
 *     Created by HSHepteracts. Adds "[HS] Time until next level" and the longest requirement to the hovered
 *     Platonic upgrade's description: the cube costs (with the Wow! Cubes and Hepteracts the Abyss hepteracts
 *     still to craft cost) against the owned amounts and the ascension income. Offerings and Obtainium are only
 *     reported as short, and Abyss hepteracts still to craft are reminded once nothing else is waited for.
 *     The game's cost colours correct the 3-digit displayed costs.
 *     Warns when Exalt 7 is past its time limit.
 * Author: XxMolkxX, Shewchou
 */
export class HSPlatonicUpgradeTime {
    #context: string;
    #income: HSAscensionIncome;

    #platonicUpgradeDescriptions?: HTMLElement;
    #hoveredPlatonicUpgradeId: number | null = null;

    constructor(context: string, income: HSAscensionIncome) {
        this.#context = context;
        this.#income = income;
    }

    async init(): Promise<void> {
        this.#platonicUpgradeDescriptions = await HSElementHooker.HookElement('#platonicUpgradeDescriptions') as HTMLElement;
        document.querySelectorAll<HTMLImageElement>('.platonicUpgradeImage').forEach((upgradeImage, index) => {
            const upgradeId = index + 1;

            upgradeImage.addEventListener('mouseover', () => {
                this.#hoveredPlatonicUpgradeId = upgradeId;
                this.#showPlatonicUpgradeEstimate('Calculating upgrade time...');
                void HSUtils.yield().then(() => this.#updatePlatonicUpgradeEstimate(upgradeId));
            });

            upgradeImage.addEventListener('mouseleave', () => {
                if (this.#hoveredPlatonicUpgradeId === upgradeId) {
                    this.#hoveredPlatonicUpgradeId = null;
                    this.#removePlatonicUpgradeEstimate();
                }
            });
        });
    }

    #showPlatonicUpgradeEstimate(text: string) {
        if (!this.#platonicUpgradeDescriptions) return;

        let estimateElement = this.#platonicUpgradeDescriptions.querySelector('#hs-platonic-upgrade-estimate') as HTMLParagraphElement | null;
        if (!estimateElement) {
            estimateElement = document.createElement('p');
            estimateElement.id = 'hs-platonic-upgrade-estimate';
            estimateElement.className = 'platonicPortion';
            estimateElement.style.color = 'cyan';
            this.#platonicUpgradeDescriptions.appendChild(estimateElement);
        }
        estimateElement.innerText = `[HS] ${text}`;
    }

    #removePlatonicUpgradeEstimate() {
        this.#platonicUpgradeDescriptions?.querySelector('#hs-platonic-upgrade-estimate')?.remove();
    }

    #readPlatonicRequirement(elementId: string): PlatonicRequirement | null {
        const element = document.querySelector<HTMLElement>(`#${elementId}`);
        const text = element?.textContent ?? '';
        const parsed = HSNumberParser.parse(text.slice(text.lastIndexOf('/') + 1));
        return Number.isNaN(parsed) ? null : { amount: parsed, affordable: this.#isShownAffordable(element) };
    }

    // The game's own check, only shown as the cost's colour: var(--lime-color), plain lime in older builds.
    #isShownAffordable(element: HTMLElement | null): boolean {
        return element?.style.color.includes('lime') ?? false;
    }

    // The displayed cost is cut to 3 digits: when the game says it isn't
    // affordable but the displayed amount is owned, the real cost is above it,
    // at most 1% above the displayed amount.
    #requiredAmount(requirement: PlatonicRequirement | null, owned: number): number {
        if (!requirement) return 0;
        return !requirement.affordable && requirement.amount <= owned
            ? requirement.amount * 1.01
            : requirement.amount;
    }

    #timeUntilResource(
        resource: string,
        required: number,
        owned: number,
        income: AscensionIncomeSnapshot | null
    ): PlatonicResourceEstimate {
        const estimate = this.#estimateResourceSeconds(required, owned, income);
        HSLogger.debug(() => `${resource}: need ${required}, own ${owned}, `
            + (income ? `+${income.onAscension} on ascension, ${income.perSecond}/s real time` : 'no income read')
            + ` -> ${formatDuration(estimate)}`, this.#context);
        return { resource, seconds: estimate, needsAscension: required > owned };
    }

    #estimateResourceSeconds(required: number, owned: number, income: AscensionIncomeSnapshot | null): number {
        if (required <= owned) return 0;
        if (!income) return Number.POSITIVE_INFINITY;

        const remainingAfterAscension = Math.max(0, required - owned - income.onAscension);
        return remainingAfterAscension === 0
            ? 0
            : income.perSecond > 0
                ? remainingAfterAscension / income.perSecond
                : Number.POSITIVE_INFINITY;
    }

    async #updatePlatonicUpgradeEstimate(upgradeId: number) {
        if (this.#hoveredPlatonicUpgradeId !== upgradeId) return;

        const gameDataAPI = HSModuleManager.getModule<HSGameDataAPI>('HSGameDataAPI');
        if (!gameDataAPI || !gameDataAPI.getGameData()) {
            this.#showPlatonicUpgradeEstimate('Upgrade time unavailable: game data has not loaded yet.');
            return;
        }

        const levelText = document.querySelector('#platonicUpgradeLevel')?.textContent ?? '';
        const levelValues = HSNumberParser.parseAll(levelText);
        if (levelValues.length >= 2 && levelValues[0] >= levelValues[1]) {
            this.#showPlatonicUpgradeEstimate('Time until next level: maxed\nLongest requirement: none');
            return;
        }

        const requirements = {
            cubes: this.#readPlatonicRequirement('platonicCubeCost'),
            tesseracts: this.#readPlatonicRequirement('platonicTesseractCost'),
            hypercubes: this.#readPlatonicRequirement('platonicHypercubeCost'),
            platonics: this.#readPlatonicRequirement('platonicPlatonicCost'),
            abyssals: this.#readPlatonicRequirement('platonicHepteractCost')
        };

        if (Object.values(requirements).some(value => value === null)) {
            this.#showPlatonicUpgradeEstimate('Upgrade time unavailable: could not read every requirement.');
            return;
        }

        const startTime = performance.now();
        const income = await this.#income.readAllAscensionIncome();
        const incomeTime = performance.now();
        if (this.#hoveredPlatonicUpgradeId !== upgradeId) {
            HSLogger.debug(() => `Platonic upgrade ${upgradeId}: no longer hovered after the income read (${Math.round(incomeTime - startTime)} ms)`, this.#context);
            return;
        }

        // Read owned resources after sampling the header modes so the ETA does
        // not use the older periodic GDS snapshot. This forces one save-derived
        // refresh without enabling GDS.
        const gameData = await gameDataAPI.getForcedGameData();
        HSLogger.debug(() => `Platonic upgrade ${upgradeId}: income read in ${Math.round(incomeTime - startTime)} ms,`
            + ` save forced in ${Math.round(performance.now() - incomeTime)} ms`, this.#context);
        if (this.#hoveredPlatonicUpgradeId !== upgradeId) return;
        if (!gameData) {
            this.#showPlatonicUpgradeEstimate('Upgrade time unavailable: could not refresh current resources.');
            return;
        }

        const abyssHepteract = gameData.hepteracts?.abyss;
        const ownedAbyssals = parseGameDataNumber(abyssHepteract?.BAL ?? 0);
        const requiredAbyssals = this.#requiredAmount(requirements.abyssals, ownedAbyssals);
        const hasDoubleCapacity = Boolean(
            gameDataAPI.getSingularityChallengeEffect('limitedAscensions', 'hepteractCap')
        );
        const abyssalsToCraft = hepteractUnitsToReach(
            { balance: ownedAbyssals, ...hepteractCapacities('abyss', abyssHepteract?.TIMES_CAP_EXTENDED ?? 0, hasDoubleCapacity) },
            requiredAbyssals
        );
        const hepteractCostMultiplier = gameDataAPI.calculateSingularityDebuff('Hepteract Costs');
        const rawHepteractsNeeded = abyssalsToCraft * HEPTERACT_DATA.abyss.conversion * hepteractCostMultiplier;
        const abyssCraftCubeCost = abyssalsToCraft * 69 * hepteractCostMultiplier;

        const ownedCubes = parseGameDataNumber(gameData.wowCubes);
        const ownedTesseracts = parseGameDataNumber(gameData.wowTesseracts);
        const ownedHypercubes = parseGameDataNumber(gameData.wowHypercubes);
        const ownedPlatonics = parseGameDataNumber(gameData.wowPlatonicCubes);
        const estimates: PlatonicResourceEstimate[] = [
            this.#timeUntilResource(
                'Wow! Cubes',
                this.#requiredAmount(requirements.cubes, ownedCubes) + abyssCraftCubeCost,
                ownedCubes,
                income[0]
            ),
            this.#timeUntilResource('Wow! Tesseracts', this.#requiredAmount(requirements.tesseracts, ownedTesseracts), ownedTesseracts, income[1]),
            this.#timeUntilResource('Wow! Hypercubes', this.#requiredAmount(requirements.hypercubes, ownedHypercubes), ownedHypercubes, income[2]),
            this.#timeUntilResource('Platonic Cubes', this.#requiredAmount(requirements.platonics, ownedPlatonics), ownedPlatonics, income[3]),
            this.#timeUntilResource(
                'Hepteracts for Abyss Hepteracts',
                rawHepteractsNeeded,
                parseGameDataNumber(gameData.wowAbyssals),
                income[4]
            )
        ];

        const bottleneck = estimates.reduce((longest, current) => current.seconds > longest.seconds ? current : longest);
        // Offerings and Obtainium have no rate to estimate from: the game's own
        // check (its red/lime cost colour, set on hover) only tells whether they are short.
        const notEstimated = [
            { resource: 'Offerings', elementId: 'platonicOfferingCost' },
            { resource: 'Obtainium', elementId: 'platonicObtainiumCost' }
        ].filter(({ elementId }) => !this.#isShownAffordable(document.querySelector<HTMLElement>(`#${elementId}`)))
            .map(({ resource }) => resource);
        HSLogger.debug(() => `Platonic upgrade ${upgradeId}: short and not estimated: ${notEstimated.join(', ') || 'none'}`, this.#context);

        // The time follows the cubes; Offerings / Obtainium only matter once the
        // cubes are already owned (nothing left to wait for but them).
        let time: string;
        let longestRequirement = 'none';
        if (bottleneck.seconds > 0) {
            time = formatDuration(bottleneck.seconds);
            longestRequirement = bottleneck.resource;
        } else if (estimates.some(estimate => estimate.needsAscension)) {
            time = 'ready after ascending';
        } else if (notEstimated.length > 0) {
            time = 'unknown';
            longestRequirement = `${notEstimated.join(' and ')} (not estimated)`;
        } else {
            time = 'ready now';
        }
        // Nothing left to wait for on the cubes: the game still shows the Abyss
        // cost red until the hepteracts counted above are crafted.
        const craftAbyssFirst = abyssalsToCraft > 0 && bottleneck.seconds === 0;
        // Past Exalt 7's time limit, cube gains shrink every second, so a
        // duration (current rates kept) is too short.
        const limitedTime = gameData.singularityChallenges?.limitedTime;
        const exalt7Overtime = bottleneck.seconds > 0 && Number.isFinite(bottleneck.seconds)
            && limitedTime?.enabled === true
            && gameData.singChallengeTimer > this.#exalt7TimeLimit(limitedTime.completions);

        this.#showPlatonicUpgradeEstimate(
            `Time until next level: ${time}${exalt7Overtime ? ' (Exalt 7 overtime: will take longer)' : ''}`
            + `\nLongest requirement: ${longestRequirement}${craftAbyssFirst ? '; craft the Abyss Hepteracts first' : ''}`
        );
    }

    // The game's calculateExalt6TimeLimit (the game's code numbers Exalt 7 as 6).
    #exalt7TimeLimit(completions: number): number {
        return completions >= 10
            ? 114 - 6 * (completions - 10)
            : 660 - 60 * completions;
    }
}
