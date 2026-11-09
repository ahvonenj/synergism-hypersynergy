import { HSGlobal } from "../hs-global";
import { HSLogger } from "../hs-logger";
import { HSUI } from "../hs-ui";
import { HSSettings } from "../settings/hs-settings";
import { HSUtils } from "../../hs-utils/hs-utils";
import { HSHeaderModules } from "./hs-header-modules";
import challengeModuleCSS from "inline:../../../resource/css/module/hs-header-challenge-module.css";

type HSChallengeTier = 'ascension' | 'reincarnation' | 'transcension';
type HSChallengeResource = 'coins' | 'transcendShards' | 'challenge10Completions';

const MODULE_ID = 'hsChallengeProgress';
const REFRESH_MS = 250;
// Highest tier first: one line in this order, and the lines from the top
const TIERS: readonly HSChallengeTier[] = ['ascension', 'reincarnation', 'transcension'];
// The game's own progress line of each tier (its text is written on desktop only)
const GAME_TEXT_IDS: Record<HSChallengeTier, string> = {
    ascension: 'ascensionChallengeProgressText',
    reincarnation: 'reincarnationChallengeProgressText',
    transcension: 'transcensionChallengeProgressText',
};
// Short forms in every language (user's choice): the game's words were too long for the requirement column
const SHORT_RESOURCES: Partial<Record<HSChallengeResource, string>> = {
    transcendShards: 'Mythos',
    challenge10Completions: 'C10s',
};
// The game's line height of progress modules
const LINE_HEIGHT = 1.2;
// The lines layout's room: two lines for one or two challenges (entering a second one keeps the size), three for
// three; twice that with the requirement on its own line
const MIN_ROOM = 2;

/** A challenge's parts, empty when not shown: one cell each in the lines layout. */
interface HSChallengeLine {
    tier: HSChallengeTier;
    label: string;
    completions: string;
    amount: string;
    separator: string;
    required: string;
    resource: string;
}

interface HSChallengePlayer {
    unlocks?: { transcend?: boolean };
    currentChallenge?: Partial<Record<HSChallengeTier, number>>;
    challengecompletions?: number[];
    challenge15Exponent?: number;
}

/**
 * Class: HSHeaderChallengeModule
 * IsExplicitHSModule: No
 * Description:
 *     "Challenge progress", a module of the game's header (HSHeaderModules, id hsChallengeProgress) for the challenges
 *     the player is in, highest tier first: on one line ("C14 > C7 > C5") or one line each, filled from the top.
 *     Details (settings challengeProgressLayout / challengeProgressDetails): none, completions ("C14 (90/96)", the
 *     C15 score in their place), or completions and requirement (one line each only). Read from the live player
 *     every 250 ms while the module is seen; the requirement is copied from the game's own progress line (its gold
 *     numbers), which the game writes on desktop only. Empty outside a challenge, or a grey "CØ"
 *     (challengeProgressShowNone). At the game's 1x2 size (Tall, one column) the requirement goes on a line of its
 *     own. The lines layout's text fills the module's height for two lines (one or two challenges) or three (four
 *     or six with the requirement on its own line), above the module's own size if the cell is tall, and shrinks to
 *     fit the width. Not for players without the live player (bookmarklet).
 * Author: Shewchou
 */
export class HSHeaderChallengeModule {
    static #context = 'HSHeaderChallengeModule';
    static #element?: HTMLElement;
    static #textElement?: HTMLElement;
    static #timer?: ReturnType<typeof setInterval>;
    // What was last drawn, and the module's size it was fitted to
    static #drawn = '';
    static #fittedWidth = -1;
    static #fittedHeight = -1;
    static #fittedSize = '';

    static enable(): void {
        if (HSHeaderChallengeModule.#timer !== undefined) return;

        const element = HSHeaderModules.register(MODULE_ID, () => {
            const player = HSGlobal.exposedPlayer as HSChallengePlayer | null;
            // As the game's transcension progress module
            return !!player?.unlocks?.transcend || (player?.currentChallenge?.transcension ?? 0) !== 0;
        }, { sizes: ['Tall'] });
        if (!element) {
            HSLogger.debug(() => 'No header modules patch: no challenge progress module', HSHeaderChallengeModule.#context);
            return;
        }

        if (!HSHeaderChallengeModule.#textElement) {
            HSUI.injectStyle(challengeModuleCSS, 'hs-header-challenge-module-css');
            HSUI.flushInjectedStyles();
            element.classList.add('hs-challenge-progress');
            const text = document.createElement('div');
            text.className = 'hs-cp-text';
            element.replaceChildren(text);
            HSHeaderChallengeModule.#element = element;
            HSHeaderChallengeModule.#textElement = text;
        }
        HSHeaderChallengeModule.#timer = setInterval(() => HSHeaderChallengeModule.#refresh(), REFRESH_MS);
        HSHeaderChallengeModule.#refresh();
    }

    /** Take the module out of the header (its place stays remembered). */
    static disable(): void {
        if (HSHeaderChallengeModule.#timer !== undefined) {
            clearInterval(HSHeaderChallengeModule.#timer);
            HSHeaderChallengeModule.#timer = undefined;
        }
        HSHeaderModules.unregister(MODULE_ID);
    }

    static #refresh(): void {
        const element = HSHeaderChallengeModule.#element;
        const text = HSHeaderChallengeModule.#textElement;
        if (!element || !text || document.hidden || !element.isConnected) return;
        // In the tray outside edit mode, or locked
        if (!(element.checkVisibility?.() ?? true)) return;

        try {
            const lines = HSHeaderChallengeModule.#lines();
            const multiLine = HSHeaderChallengeModule.layout() === 'lines';
            // 1x2 (the game's data-size): one column wide, so the requirement goes on a line of its own
            const split = multiLine && element.dataset.size === 'Tall' && HSHeaderChallengeModule.details() === 'requirement';
            const none = lines.length === 0 && HSSettings.getSetting('challengeProgressShowNone')?.isEnabled() === true;
            const room = !multiLine ? 1 : Math.max(MIN_ROOM, lines.length) * (split ? 2 : 1);
            const drawn = JSON.stringify([multiLine, split, lines, none]);
            if (drawn !== HSHeaderChallengeModule.#drawn) {
                HSHeaderChallengeModule.#drawn = drawn;
                text.classList.toggle('hs-cp-lines', multiLine);
                text.classList.toggle('hs-cp-split', split);
                text.style.setProperty('--hs-cp-room', String(room));
                if (none) text.replaceChildren(HSHeaderChallengeModule.#span('hs-cp-none', 'CØ'));
                else if (split) text.replaceChildren(...HSHeaderChallengeModule.#drawSplit(lines));
                else text.replaceChildren(...(multiLine ? HSHeaderChallengeModule.#drawLines(lines) : HSHeaderChallengeModule.#drawLine(lines)));
                HSHeaderChallengeModule.#fittedWidth = -1;
            }
            HSHeaderChallengeModule.#fit(element, text, room, multiLine);
        } catch (error) {
            HSLogger.warnOnce(`Could not draw the challenge progress module: ${error}`, 'hs-header-challenge-module');
        }
    }

    static #span(className: string, content: string): HTMLSpanElement {
        const span = document.createElement('span');
        span.className = className;
        span.textContent = content;
        return span;
    }

    /** "C14 (90/96) > C7 (100/120)": the challenges and their completions, inline. */
    static #drawLine(lines: HSChallengeLine[]): Node[] {
        const nodes: Node[] = [];
        for (const line of lines) {
            if (nodes.length > 0) nodes.push(HSHeaderChallengeModule.#span('hs-cp-arrow', ' > '));
            nodes.push(HSHeaderChallengeModule.#span(`hs-cp-label hs-cp-${line.tier}`, line.label));
            if (line.completions) nodes.push(HSHeaderChallengeModule.#span('hs-cp-comp', ` ${line.completions}`));
        }
        return nodes;
    }

    /** One row each, a cell per column (empty ones too): the CSS grid lines the columns up. */
    static #drawLines(lines: HSChallengeLine[]): Node[] {
        return lines.map(line => {
            const row = document.createElement('div');
            row.className = 'hs-cp-row';
            row.append(
                HSHeaderChallengeModule.#span(`hs-cp-label hs-cp-${line.tier}`, line.label),
                HSHeaderChallengeModule.#span('hs-cp-comp', line.completions),
                HSHeaderChallengeModule.#span('hs-cp-amount', line.amount),
                HSHeaderChallengeModule.#span('hs-cp-sep', line.separator),
                HSHeaderChallengeModule.#span('hs-cp-req', line.required),
                HSHeaderChallengeModule.#span('hs-cp-res', line.resource),
            );
            return row;
        });
    }

    /**
     * Two lines each: the challenge and its completions across the module, then the requirement below, in columns
     * that line the "/" up (none when the game gives no requirement).
     */
    static #drawSplit(lines: HSChallengeLine[]): Node[] {
        return lines.flatMap(line => {
            const head = document.createElement('div');
            head.className = 'hs-cp-head';
            head.append(
                HSHeaderChallengeModule.#span(`hs-cp-label hs-cp-${line.tier}`, line.label),
                HSHeaderChallengeModule.#span('hs-cp-comp', line.completions),
            );
            if (!line.separator) return [head];
            const row = document.createElement('div');
            row.className = 'hs-cp-row';
            row.append(
                HSHeaderChallengeModule.#span('hs-cp-amount', line.amount),
                HSHeaderChallengeModule.#span('hs-cp-sep', line.separator),
                HSHeaderChallengeModule.#span('hs-cp-req', line.required),
                HSHeaderChallengeModule.#span('hs-cp-res', line.resource),
            );
            return [head, row];
        });
    }

    /** The layout in use: one line unless the setting says lines. */
    static layout(): 'line' | 'lines' {
        return HSSettings.getSetting('challengeProgressLayout')?.getValue() === 'lines' ? 'lines' : 'line';
    }

    /** Whether the requirement can be shown: a line of its own, and the game's progress line (none on touch devices). */
    static canShowRequirement(): boolean {
        return HSHeaderChallengeModule.layout() === 'lines' && document.documentElement.dataset.mobile !== 'true';
    }

    /** The details in use: completions unless the setting says none, or the requirement where it can be shown. */
    static details(): 'none' | 'completions' | 'requirement' {
        const value = HSSettings.getSetting('challengeProgressDetails')?.getValue();
        if (value === 'none') return 'none';
        if (value === 'requirement' && HSHeaderChallengeModule.canShowRequirement()) return 'requirement';
        return 'completions';
    }

    /** One entry per challenge the player is in, highest tier first. */
    static #lines(): HSChallengeLine[] {
        const player = HSGlobal.exposedPlayer as HSChallengePlayer | null;
        const current = player?.currentChallenge;
        if (!current) return [];

        const details = HSHeaderChallengeModule.details();
        const lines: HSChallengeLine[] = [];
        for (const tier of TIERS) {
            const challenge = current[tier];
            if (typeof challenge !== 'number' || challenge < 1 || challenge > 15) continue;

            const line: HSChallengeLine = {
                tier, label: `C${challenge}`, completions: '', amount: '', separator: '', required: '', resource: ''
            };
            if (details !== 'none') {
                // The game's gold numbers: amount and requirement (C1-14); score, then coins or the projected score (C15)
                const numbers = Array.from(document.getElementById(GAME_TEXT_IDS[tier])?.querySelectorAll('span') ?? [],
                    span => span.textContent?.trim() ?? '');
                if (challenge === 15) {
                    line.completions = `(${numbers[0] || HSUtils.N(player?.challenge15Exponent ?? 0)})`;
                    if (details === 'requirement' && numbers.length === 3) {
                        Object.assign(line, {
                            amount: numbers[1], separator: '/', required: numbers[2],
                            resource: HSHeaderChallengeModule.#resource('coins')
                        });
                    } else if (details === 'requirement' && numbers.length === 2) {
                        Object.assign(line, { separator: '→', required: numbers[1] });
                    }
                } else {
                    const completions = player?.challengecompletions?.[challenge] ?? 0;
                    const max = window.__HS_getMaxChallenges?.(challenge);
                    line.completions = typeof max === 'number' ? `(${completions}/${max})` : `(${completions})`;
                    if (details === 'requirement' && numbers.length >= 2) {
                        Object.assign(line, {
                            amount: numbers[0], separator: '/', required: numbers[1],
                            resource: HSHeaderChallengeModule.#resource(HSHeaderChallengeModule.#resourceOf(challenge))
                        });
                    }
                }
            }
            lines.push(line);
        }
        return lines;
    }

    // As the game's getChallengeProgress
    static #resourceOf(challenge: number): HSChallengeResource {
        if (challenge <= 5) return 'coins';
        if (challenge <= 8) return 'transcendShards';
        if (challenge <= 10) return 'coins';
        return 'challenge10Completions';
    }

    static #resource(resource: HSChallengeResource): string {
        const short = SHORT_RESOURCES[resource];
        if (short) return short;
        // Coins: the game's word, in its language
        const key = `reset.challengeProgress.resources.${resource}`;
        const text = window.__HS_i18next?.t(key);
        return typeof text === 'string' && text !== key ? text : 'Coins';
    }

    /**
     * The text size that fits the room's lines in the module's height, then shrunk to its width. The lines layout can
     * go above the module's own size in the header's cells; never in the tray, where the text sizes the module (it
     * would grow with it).
     */
    static #fit(element: HTMLElement, text: HTMLElement, room: number, canGrow: boolean): void {
        const width = element.clientWidth;
        const height = element.clientHeight;
        // A size change (edit mode, the window) since the last fit, or new text
        if (width === HSHeaderChallengeModule.#fittedWidth && height === HSHeaderChallengeModule.#fittedHeight
            && text.style.fontSize === HSHeaderChallengeModule.#fittedSize) return;
        HSHeaderChallengeModule.#fittedWidth = width;
        HSHeaderChallengeModule.#fittedHeight = height;

        if (!width || !height || text.childElementCount === 0) {
            // The edit mode's placeholder at the module's own size
            text.style.fontSize = '';
        } else {
            let size = height / room / LINE_HEIGHT;
            if (!canGrow || !element.closest('.headerRegion')) {
                size = Math.min(size, Number.parseFloat(getComputedStyle(element).fontSize));
            }
            text.style.fontSize = `${size}px`;
            const available = width - 2;
            if (text.offsetWidth > available) {
                size *= available / text.offsetWidth;
                text.style.fontSize = `${size}px`;
            }
        }
        HSHeaderChallengeModule.#fittedSize = text.style.fontSize;
    }
}
