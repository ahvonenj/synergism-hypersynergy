import { HSGlobal } from "../hs-global";
import { HSLogger } from "../hs-logger";
import { HSUI } from "../hs-ui";
import { HSModuleRegistry } from "../module/hs-module-registry";
import type { HSAutosing } from "../../hs-modules/hs-autosing/hs-autosing";
import { HSHeaderPopover } from "./hs-header-popover";
import elevatorHeaderCSS from "inline:../../../resource/css/module/hs-elevator-header.css";

const MODULE_ID = 'ascSingularityCountStats';
const POPOVER_ID = 'hs-elevator-popover';
const ACTIVE_CLASS = 'hs-elevator-header';
const REFRESH_MS = 250;
// The game's check in updateSingularityElevatorVisibility: it only hides the controls below it, they still work
const ELEVATOR_UNLOCK = 10;

interface HSElevatorPlayer {
    singularityCount: number;
    highestSingularityCount: number;
    singularityElevatorTarget: number;
    singularityElevatorLocked: boolean;
    singularityElevatorSlowClimb: boolean;
}

interface HSElevatorControls {
    input: HTMLInputElement;
    teleport: HTMLElement;
    lock: HTMLInputElement;
    slowClimb: HTMLInputElement;
    status: HTMLElement;
}

interface HSElevatorToggle {
    label: HTMLElement;
    checkbox: HTMLInputElement;
    text: HTMLElement;
}

interface HSElevatorPopover {
    shell: HSHeaderPopover;
    title: HTMLElement;
    outOfOrder: HTMLElement;
    controls: HTMLElement;
    input: HTMLInputElement;
    max: HTMLElement;
    teleport: HTMLButtonElement;
    lock: HSElevatorToggle;
    slowClimb: HSElevatorToggle;
    status: HTMLElement;
}

/**
 * Class: HSElevatorHeader
 * IsExplicitHSModule: No
 * Description:
 *     A click on the game's Singularity count header module (setting singularityHeaderElevator) opens a popover with
 *     the Singularity tab's Elevator: target, Teleport, its two toggles and the status line. Everything goes through the
 *     game's own controls, which work while hidden, so the game checks the target and asks its own dialogs. The game
 *     only draws those controls when its subtab opens: the state comes from the live player, so no live player, no
 *     popover (bookmarklet). Read every 250 ms while open; a change makes the game redraw them, the popover copies them.
 * Author: Shewchou
 */
export class HSElevatorHeader {
    static #context = 'HSElevatorHeader';
    static #cssInjected = false;
    static #module?: HTMLElement;
    static #popover?: HSElevatorPopover;
    static #timer?: ReturnType<typeof setInterval>;
    // The player's elevator state the popover shows
    static #shownState = '';

    static enable(): void {
        if (HSElevatorHeader.#module) return;
        const module = document.getElementById(MODULE_ID);
        if (!module || !HSGlobal.exposedPlayer) {
            HSLogger.debug(() => 'No singularity count module or no live player: no elevator popover', HSElevatorHeader.#context);
            return;
        }
        if (!HSElevatorHeader.#cssInjected) {
            HSElevatorHeader.#cssInjected = true;
            HSUI.injectStyle(elevatorHeaderCSS, 'hs-elevator-header-css');
            HSUI.flushInjectedStyles();
        }
        HSElevatorHeader.#module = module;
        // In edit mode the game's capture listener stops the click before it reaches the module
        module.addEventListener('click', HSElevatorHeader.#onModuleClick);
        document.documentElement.classList.add(ACTIVE_CLASS);
    }

    static disable(): void {
        if (!HSElevatorHeader.#module) return;
        HSElevatorHeader.#popover?.shell.close();
        HSElevatorHeader.#module.removeEventListener('click', HSElevatorHeader.#onModuleClick);
        HSElevatorHeader.#module = undefined;
        document.documentElement.classList.remove(ACTIVE_CLASS);
    }

    static #player(): HSElevatorPlayer | null {
        return HSGlobal.exposedPlayer as unknown as HSElevatorPlayer | null;
    }

    static #stateOf(player: HSElevatorPlayer): string {
        return [
            player.singularityCount,
            player.highestSingularityCount,
            player.singularityElevatorTarget,
            player.singularityElevatorLocked,
            player.singularityElevatorSlowClimb,
        ].join('|');
    }

    /** The Elevator's controls on the game's Singularity tab, undefined if a game update changed them. */
    static #gameControls(): HSElevatorControls | undefined {
        const input = document.getElementById('elevatorTargetInput') as HTMLInputElement | null;
        const teleport = document.getElementById('elevatorTeleportButton');
        const lock = document.getElementById('elevatorLockToggle') as HTMLInputElement | null;
        const slowClimb = document.getElementById('elevatorSlowClimbToggle') as HTMLInputElement | null;
        const status = document.getElementById('elevatorLockStatus');
        if (!input || !teleport || !lock || !slowClimb || !status) {
            HSLogger.warnOnce('The game\'s Elevator controls were not found: no elevator popover', 'hs-elevator-header');
            return undefined;
        }
        return { input, teleport, lock, slowClimb, status };
    }

    static #gameText(selector: string, fallback: string): string {
        return document.querySelector(selector)?.textContent?.trim() || fallback;
    }

    static #onModuleClick = (): void => {
        const popover = HSElevatorHeader.#popover;
        if (popover?.shell.isOpen) {
            popover.shell.close();
            return;
        }
        if (!HSElevatorHeader.#gameControls()) return;
        HSElevatorHeader.#openPopover();
    };

    static #openPopover(): void {
        const module = HSElevatorHeader.#module;
        if (!module) return;
        const popover = HSElevatorHeader.#popover ??= HSElevatorHeader.#buildPopover(module);
        popover.shell.open();
        HSElevatorHeader.#draw(true);
        HSElevatorHeader.#timer = setInterval(() => HSElevatorHeader.#onTick(), REFRESH_MS);
    }

    static #onClose = (): void => {
        clearInterval(HSElevatorHeader.#timer);
        HSElevatorHeader.#timer = undefined;
    };

    static #onTick(): void {
        const module = HSElevatorHeader.#module;
        if (!module || !(module.checkVisibility?.() ?? true) || HSHeaderPopover.isEditing()) {
            HSElevatorHeader.#popover?.shell.close();
            return;
        }
        if (!document.hidden) HSElevatorHeader.#draw(false);
    }

    static #buildPopover(module: HTMLElement): HSElevatorPopover {
        const shell = new HSHeaderPopover(POPOVER_ID, module, HSElevatorHeader.#onClose);

        const title = document.createElement('div');
        title.className = 'hs-elevator-title';
        const outOfOrder = document.createElement('div');
        outOfOrder.className = 'hs-elevator-out-of-order';

        const input = document.createElement('input');
        input.type = 'number';
        input.min = '1';
        input.step = '1';
        input.className = 'hs-elevator-input';
        input.addEventListener('change', () => HSElevatorHeader.#onTargetChange(input));
        // Applies the target, and only that: Teleport stays a click
        input.addEventListener('keydown', event => { if (event.key === 'Enter') input.blur(); });
        const max = document.createElement('span');
        max.className = 'hs-elevator-max';
        const teleport = document.createElement('button');
        teleport.type = 'button';
        teleport.className = 'hs-elevator-teleport';
        teleport.addEventListener('click', () => HSElevatorHeader.#onTeleportClick());
        const row = document.createElement('div');
        row.className = 'hs-elevator-row';
        row.append(input, max, teleport);

        const lock = HSElevatorHeader.#buildToggle('lock', 'singularityElevatorLocked', 'Lock Future Sings');
        const slowClimb = HSElevatorHeader.#buildToggle('slowClimb', 'singularityElevatorSlowClimb', 'Only go up 1 Sing');
        const toggles = document.createElement('div');
        toggles.className = 'hs-elevator-toggles';
        toggles.append(lock.label, slowClimb.label);

        const status = document.createElement('div');
        status.className = 'hs-elevator-status';

        const controls = document.createElement('div');
        controls.className = 'hs-elevator-controls';
        controls.append(row, toggles, status);

        shell.element.append(title, outOfOrder, controls);
        return { shell, title, outOfOrder, controls, input, max, teleport, lock, slowClimb, status };
    }

    static #buildToggle(control: 'lock' | 'slowClimb', key: 'singularityElevatorLocked' | 'singularityElevatorSlowClimb', name: string): HSElevatorToggle {
        const label = document.createElement('label');
        label.className = 'hs-elevator-toggle';
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.addEventListener('change', () => {
            const player = HSElevatorHeader.#player();
            const game = HSElevatorHeader.#gameControls();
            // The game's listener flips the player's value, whatever its own checkbox shows (only drawn when its subtab opens)
            if (player && game && player[key] !== checkbox.checked) game[control].click();
            HSLogger.debug(() => `Elevator ${key}: ${player?.[key]}`, HSElevatorHeader.#context);
            HSElevatorHeader.#draw(true);
        });
        const text = document.createElement('span');
        text.textContent = name;
        label.append(checkbox, text);
        return { label, checkbox, text };
    }

    static #onTargetChange(input: HTMLInputElement): void {
        // Closing (Escape, a press outside) drops what was typed: locked, it would change the next singularity unseen
        if (!HSElevatorHeader.#popover?.shell.isOpen) return;
        const game = HSElevatorHeader.#gameControls();
        const target = Math.floor(Number(input.value));
        // Emptied or not a number: the game would set 1
        if (game && input.value.trim() !== '' && Number.isFinite(target)) {
            game.input.value = String(target);
            game.input.dispatchEvent(new Event('change'));
            HSLogger.debug(() => `Elevator target: ${HSElevatorHeader.#player()?.singularityElevatorTarget}`, HSElevatorHeader.#context);
        }
        HSElevatorHeader.#draw(true);
    }

    static #onTeleportClick(): void {
        const game = HSElevatorHeader.#gameControls();
        if (!game) return;
        // Autosing answers every Confirm OK, the player's included: this click would teleport without a question.
        // Notify writes the log line too (none while autosing runs: it turns the log off)
        if (HSModuleRegistry.getModule('HSAutosing')?.isAutosingActive()) {
            void HSUI.Notify('Teleport not available while autosing is running.', { position: 'bottomLeft', notificationType: 'warning' });
            return;
        }
        HSLogger.debug(() => `Elevator teleport to ${HSElevatorHeader.#player()?.singularityElevatorTarget}`, HSElevatorHeader.#context);
        // What follows is the game's dialogs, and a singularity if the player confirms
        HSElevatorHeader.#popover?.shell.close();
        game.teleport.click();
    }

    /** `force`: at opening and after the player's own change. Otherwise only when the player's state changed. */
    static #draw(force: boolean): void {
        const popover = HSElevatorHeader.#popover;
        const player = HSElevatorHeader.#player();
        const game = HSElevatorHeader.#gameControls();
        if (!popover?.shell.isOpen || !player || !game) return;
        if (!force && HSElevatorHeader.#stateOf(player) === HSElevatorHeader.#shownState) return;

        const unlocked = player.highestSingularityCount >= ELEVATOR_UNLOCK;
        popover.controls.hidden = !unlocked;
        popover.outOfOrder.hidden = unlocked;
        if (unlocked) {
            popover.title.textContent = `[HS] ${HSElevatorHeader.#gameText('[i18n="singularity.elevator.title"]', 'Singularity Elevator')}`;
            HSElevatorHeader.#drawControls(popover, player, game, force);
        } else {
            popover.title.textContent = `[HS] ${HSElevatorHeader.#gameText('[i18n="singularity.elevator.lockedTitle"]', 'Singularity Elevator - OUT OF ORDER')}`;
            popover.outOfOrder.textContent = HSElevatorHeader.#gameText('#lockedElevatorDescription', 'This Elevator only operates if you\'ve seen the 10th Singularity.');
        }
        HSElevatorHeader.#shownState = HSElevatorHeader.#stateOf(player);
        popover.shell.place();
    }

    static #drawControls(popover: HSElevatorPopover, player: HSElevatorPlayer, game: HSElevatorControls, force: boolean): void {
        // The game draws its Elevator only when its subtab opens or one of its controls is used. The player's own
        // target: the game's input can hold an old value, which this change would make the target.
        game.input.value = String(player.singularityElevatorTarget);
        game.input.dispatchEvent(new Event('change'));

        // Not while the player types in it, unless it's their own change: it then shows what the game kept
        if (force || document.activeElement !== popover.input) popover.input.value = String(player.singularityElevatorTarget);
        popover.input.max = game.input.max;
        popover.max.textContent = `/ ${game.input.max}`;
        popover.teleport.textContent = game.teleport.textContent;

        // Short English names (user's choice), the game's sentence as their tooltip
        const locked = player.singularityElevatorLocked;
        popover.lock.checkbox.checked = locked;
        popover.lock.label.title = HSElevatorHeader.#gameText('[i18n="singularity.elevator.lockToggle"]', 'Lock Future Singularities');
        popover.slowClimb.checkbox.checked = player.singularityElevatorSlowClimb;
        popover.slowClimb.label.title = HSElevatorHeader.#gameText('[i18n="singularity.elevator.slowClimbToggle"]', 'Only go up 1 Singularity');
        // The game hides it while locked; greyed here so the popover doesn't change size
        popover.slowClimb.checkbox.disabled = locked;
        popover.slowClimb.label.classList.toggle('hs-elevator-disabled', locked);

        popover.status.innerHTML = HSElevatorHeader.#statusHtml(player, game);
    }

    /**
     * The game's status line, shortened (user's choice), in its colours. Locked, the target: the game's line names the
     * current singularity, while a singularity goes to the target. Unlocked, the game's next singularity, the last
     * number of its line (with "Only go up 1" off it depends on the lookahead); the game's line as it is without one.
     */
    static #statusHtml(player: HSElevatorPlayer, game: HSElevatorControls): string {
        const gold = (text: string) => `<span style="color:var(--gold-color, gold)">${text}</span>`;
        if (player.singularityElevatorLocked) {
            return `Future Sings <span style="color:var(--orange-color, orange)">LOCKED</span>. `
                + `You will repeat ${gold(`S${Math.floor(player.singularityElevatorTarget)}`)}.`;
        }
        const next = /(\d+)\D*$/.exec(game.status.textContent ?? '')?.[1];
        if (!next) return game.status.innerHTML;
        return `Future Sings <span style="color:var(--lime-color, lime)">UNLOCKED</span>. Next will be ${gold(`S${next}`)}`;
    }
}
