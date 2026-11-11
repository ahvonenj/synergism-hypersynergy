import { HSLogger } from "../../hs-core/hs-logger";
import { HSUtils } from "../../hs-utils/hs-utils";
import { HSNumberParser } from "../../hs-utils/hs-number-parser";

export type AscensionIncomeSnapshot = {
    perSecond: number;
    onAscension: number;
};

/**
 * Class: HSAscensionIncome
 * IsExplicitHSModule: No
 * Description:
 *     Reads the ascension resources' income from the header's ascension stats (Wow! Cubes to Hepteracts):
 *     the amount gained on ascension and the real-time rate per second (the /s amount times the ascension speed).
 *     Each read clicks the stat to switch between "/s" and "on ascension" and clicks it back, so reads are queued:
 *     one instance is shared by every reader.
 * Author: XxMolkxX, Shewchou
 */
export class HSAscensionIncome {
    #context: string;
    #readQueue: Promise<unknown> = Promise.resolve();

    constructor(context: string) {
        this.#context = context;
    }

    readHepteractIncome(): Promise<AscensionIncomeSnapshot | null> {
        return this.#queueRead(() => this.#readAscensionIncome(5));
    }

    /** Wow! Cubes, Tesseracts, Hypercubes, Platonic Cubes and Hepteracts, in that order. */
    readAllAscensionIncome(): Promise<Array<AscensionIncomeSnapshot | null>> {
        return this.#queueRead(() => Promise.all(
            [1, 2, 3, 4, 5].map(resourceId => this.#readAscensionIncome(resourceId))
        ));
    }

    #queueRead<T>(readIncome: () => Promise<T>): Promise<T> {
        const queuedRead = this.#readQueue.then(readIncome, readIncome);
        this.#readQueue = queuedRead.then(() => undefined, () => undefined);
        return queuedRead;
    }

    async #switchAscensionIncomeMode(
        statsElement: HTMLElement,
        incomeElement: HTMLElement,
        unitElement: HTMLElement,
        targetPerSecond: boolean,
        waitForAmount = true
    ): Promise<boolean> {
        const previousIncomeText = incomeElement.textContent ?? '';
        const incomeUpdated = !waitForAmount ? Promise.resolve(true) : HSUtils.waitForInnerText(
            incomeElement,
            text => text !== previousIncomeText,
            500
        ).then(() => true, () => {
            HSLogger.debug(() => `#${incomeElement.id}: amount still "${previousIncomeText}" 500 ms after switching to ${targetPerSecond ? '/s' : 'on ascension'}`, this.#context);
            return false;
        });

        statsElement.click();

        if ((unitElement.textContent?.trim() === '/s') !== targetPerSecond) {
            await incomeUpdated;
            return false;
        }

        // The mode marker changes synchronously, but the displayed amount is
        // updated separately by the game's visual refresh interval.
        await incomeUpdated;
        return true;
    }

    async #readAscensionIncome(resourceId: number): Promise<AscensionIncomeSnapshot | null> {
        const statsElementIds = ['', 'ascCubeStats', 'ascTessStats', 'ascHyperStats', 'ascPlatonicStats', 'ascHepteractStats'];
        const incomeElementIds = ['', 'ascCubes', 'ascTess', 'ascHyper', 'ascPlatonic', 'ascHepteract'];
        const statsElement = document.querySelector(`#${statsElementIds[resourceId]}`) as HTMLElement | null;
        const incomeElement = document.querySelector(`#${incomeElementIds[resourceId]}`) as HTMLElement | null;
        const unitElement = document.querySelector(`#unit${resourceId}`) as HTMLElement | null;
        const ascensionSpeedElement = document.querySelector('#ascAscensionTimeAccel') as HTMLElement | null;

        if (!statsElement || !incomeElement || !unitElement || !ascensionSpeedElement) {
            HSLogger.warn(`Could not find ascension resource ${resourceId} or its speed display`, this.#context);
            return null;
        }

        const wasPerSecond = unitElement.textContent?.trim() === '/s';
        const readDisplayedIncome = () => HSNumberParser.parse(incomeElement.innerText);
        let rawPerSecond: number;
        let onAscension: number;
        // Nothing on ascension means 0/s too: both modes show the same amount,
        // so waiting for it to change would only run into the timeout.
        let nothingOnAscension = false;

        try {
            if (wasPerSecond) {
                rawPerSecond = readDisplayedIncome();
                const switched = await this.#switchAscensionIncomeMode(
                    statsElement,
                    incomeElement,
                    unitElement,
                    false
                );

                if (!switched) {
                    HSLogger.warn(`Could not switch ascension resource ${resourceId} to ascension-gain mode`, this.#context);
                    return null;
                }

                onAscension = readDisplayedIncome();
                nothingOnAscension = onAscension === 0;
            } else {
                onAscension = readDisplayedIncome();
                nothingOnAscension = onAscension === 0;
                const switched = await this.#switchAscensionIncomeMode(
                    statsElement,
                    incomeElement,
                    unitElement,
                    true,
                    !nothingOnAscension
                );

                if (!switched) {
                    HSLogger.warn(`Could not switch ascension resource ${resourceId} to /s mode`, this.#context);
                    return null;
                }

                rawPerSecond = readDisplayedIncome();
            }

            const ascensionSpeedText = ascensionSpeedElement.innerText.trim();
            const ascensionSpeed = ascensionSpeedText.endsWith('*')
                ? 1e6
                : HSNumberParser.parse(ascensionSpeedText);

            HSLogger.debug(() => `#${incomeElementIds[resourceId]}: ${onAscension} on ascension, ${rawPerSecond}/s`
                + ` at ascension speed "${ascensionSpeedText}" (read as ${ascensionSpeed})`, this.#context);

            if (Number.isNaN(rawPerSecond) || Number.isNaN(onAscension) || Number.isNaN(ascensionSpeed)) {
                return null;
            }

            return {
                perSecond: rawPerSecond * ascensionSpeed,
                onAscension
            };
        } catch (e) {
            HSLogger.warn(`Error while reading ascension resource ${resourceId} income: ${e}`, this.#context);
            return null;
        } finally {
            const isPerSecond = unitElement.textContent?.trim() === '/s';
            if (isPerSecond !== wasPerSecond) {
                await this.#switchAscensionIncomeMode(
                    statsElement,
                    incomeElement,
                    unitElement,
                    wasPerSecond,
                    !nothingOnAscension
                );
            }
        }
    }
}

/** A duration as its two largest units ("3d 4h"); 'ready now' at 0 or less, '∞' when never. */
export function formatDuration(seconds: number): string {
    if (!Number.isFinite(seconds)) return '∞';
    if (seconds <= 0) return 'ready now';
    if (seconds < 1) return '<1s';

    let remaining = Math.floor(seconds);
    const units = [
        { label: 'y', seconds: 31_557_600 },
        { label: 'd', seconds: 86_400 },
        { label: 'h', seconds: 3_600 },
        { label: 'm', seconds: 60 },
        { label: 's', seconds: 1 }
    ];
    const parts: string[] = [];

    for (const unit of units) {
        const amount = Math.floor(remaining / unit.seconds);
        if (amount > 0) {
            parts.push(`${amount}${unit.label}`);
            remaining %= unit.seconds;
        }
        if (parts.length === 2) break;
    }

    return parts.join(' ');
}
