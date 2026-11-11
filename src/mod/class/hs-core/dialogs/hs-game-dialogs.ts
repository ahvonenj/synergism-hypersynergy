import { HSLogger } from "../hs-logger";
import { HSHiddenDialogs, HSHideableDialogKind } from "./hs-hidden-dialogs";

export type HSDialogKind = 'confirm' | 'alert' | 'infoAlert' | 'prompt' | 'purchasePrompt';

/**
 * How a session answers each kind of dialog. A kind left out isn't claimed by the session.
 * 'show': the dialog is shown, and the feature fills or answers it through the DOM.
 */
export interface HSDialogAnswers {
    confirm?: 'ok' | 'cancel' | 'show';
    alert?: 'dismiss' | 'show';
    infoAlert?: 'dismiss' | 'show';
    // { ok }: a value typed for one Prompt, so it answers only the first Prompt of its act (e.g. the Add code's
    // amount, not the sum Prompt that follows). Later Prompts aren't claimed.
    prompt?: { ok: string } | 'cancel' | 'show';
    // The mod can't build a purchase quote: buying goes through the shown dialog
    purchasePrompt?: 'cancel' | 'show';
}

type HSDialogAnswer = NonNullable<HSDialogAnswers[HSDialogKind]>;

export interface HSDialogRunOptions {
    /** The lock is released and the session ended past this time (default 30 s). */
    timeLimitMs?: number;
}

/**
 * Recorded when a dialog is queued: the session claiming it, whether autosing was active, whether a run() held
 * the lock, and for the other Confirms and Alerts (hidden dialogs setting on) their translation keys and text.
 */
interface HSDialogOrigin {
    session?: HSDialogSession;
    answers?: HSDialogAnswers;
    autosing: boolean;
    lockHeld?: boolean;
    keys?: string[];
    text?: unknown;
}

/** A session's claim on the dialogs queued while it acts (see HSGameDialogs.#getOrigin). */
interface HSActWindow {
    session: HSDialogSession;
    answers: HSDialogAnswers;
    event: Event | undefined;
    running: boolean;
}

/**
 * A mod feature's turn with the game dialogs. Dialogs it queues while acting get its answers,
 * as long as the session hasn't ended when they reach the front of the queue (else they're orphans).
 */
export class HSDialogSession {
    readonly owner: string;
    #ended = false;

    constructor(owner: string) {
        this.owner = owner;
    }

    get ended(): boolean {
        return this.#ended;
    }

    /**
     * Runs fn (synchronous, e.g. a click on a game button) with these answers for the dialogs it queues.
     * @returns false if the session has ended: fn isn't run.
     */
    act(answers: HSDialogAnswers, fn: () => void): boolean {
        if (this.#ended) return false;
        HSGameDialogs.actFor(this, answers, fn);
        return true;
    }

    /** Called by HSGameDialogs only. */
    end(): void {
        this.#ended = true;
    }
}

/**
 * Class: HSGameDialogs
 * IsExplicitHSModule: No
 * Description:
 *     Shares the game's dialog queue (Confirm, Alert, InfoAlert, Prompt, PurchasePrompt) between mod features.
 *     With the patcher's dialog hook, each dialog's origin is recorded when it's queued (the mod session claiming
 *     it, whether autosing was active), and the mod can answer it before it's shown: a session's dialogs get its
 *     answers, and while autosing is active every other Confirm and Alert is answered. Outside autosing, the
 *     Confirms and Alerts the player chose to hide (HSHiddenDialogs) are answered too.
 *     Without the hook (bookmarklet, older patcher), sessions answer their dialogs through the DOM, and hidden
 *     dialogs are answered once shown.
 *     Features use act() for synchronous actions, and run() for longer ones: run() waits for an idle queue and
 *     holds a lock, so two features never interleave their dialogs.
 * Author: Shewchou
 */
export class HSGameDialogs {
    static #context = 'HSGameDialogs';
    static readonly DEFAULT_TIME_LIMIT_MS = 30000;

    static #initialized = false;
    static #hookPatched = false;
    static #box: HTMLElement | null = null;
    static #boxOpen = false;

    static #autosingActive = false;
    static #watcherInterval: number | null = null;
    // Autosing without any patch: its Confirms and Alerts are clicked as they open (#checkShownDialog)
    static #autosingAnswersByDom = false;
    // Clicks in a row (within one task) by #checkShownDialog for autosing, capped by MAX_ANSWERS_IN_A_ROW
    static #answersInARow = 0;
    static readonly MAX_ANSWERS_IN_A_ROW = 20;
    static readonly SAFETY_NET_POLL_MS = 250;
    // Without the hook: the Confirm or Alert last handled by #checkShownDialog (kind and text)
    static #lastShownDialog: string | null = null;
    static #origins = new WeakSet<HSDialogOrigin>();
    static #actWindows: HSActWindow[] = [];
    static #taskEndChannel: MessageChannel | null = null;
    static #taskEndPending = false;

    static #lockHolder: HSDialogSession | null = null;
    static #waiters: (() => void)[] = [];
    static #idleWaiters: (() => void)[] = [];

    static #domIds: Record<HSDialogKind, { wrapper: string, ok: string, cancel?: string }> = {
        confirm: { wrapper: 'confirmWrapper', ok: 'ok_confirm', cancel: 'cancel_confirm' },
        alert: { wrapper: 'alertWrapper', ok: 'ok_alert' },
        infoAlert: { wrapper: 'infoAlertWrapper', ok: 'ok_infoAlert' },
        prompt: { wrapper: 'promptWrapper', ok: 'ok_prompt', cancel: 'cancel_prompt' },
        purchasePrompt: { wrapper: 'purchasePromptWrapper', ok: 'ok_purchasePrompt', cancel: 'cancel_purchasePrompt' },
    };

    /** Installs the hook's callbacks and the queue observer. Needs the game's DOM. */
    static init(): void {
        if (HSGameDialogs.#initialized) return;
        HSGameDialogs.#initialized = true;

        HSGameDialogs.#hookPatched = !!window.__HS_DIALOG_HOOK_PATCHED;
        window.__HS_dialogOrigin = (kind: HSDialogKind, firstArg?: unknown) => HSGameDialogs.#getOrigin(kind, firstArg);
        window.__HS_onDialog = (kind: HSDialogKind, origin: unknown) => HSGameDialogs.#onDialog(kind, origin);

        HSGameDialogs.#box = document.getElementById('confirmationBox');
        if (HSGameDialogs.#box) {
            HSGameDialogs.#boxOpen = !HSGameDialogs.isQueueIdle();
            new MutationObserver(() => HSGameDialogs.#onBoxMutation())
                .observe(HSGameDialogs.#box, { attributes: true, attributeFilter: ['style'] });
        } else {
            HSLogger.warn('#confirmationBox not found: the queue is always seen as idle', HSGameDialogs.#context);
        }
        if (!HSGameDialogs.#hookPatched) HSGameDialogs.#observeShownDialogs();

        if (HSGameDialogs.#hookPatched) {
            HSLogger.log('Game dialog hook available', HSGameDialogs.#context);
        } else {
            HSLogger.warn('Game dialog hook not patched: mod features answer their dialogs through the DOM', HSGameDialogs.#context);
        }
    }

    static isHookPatched(): boolean {
        return HSGameDialogs.#hookPatched;
    }

    /**
     * Set by autosing for its run (Restart included). With the hook, every Confirm and Alert queued meanwhile
     * is answered (OK, dismissed), unless a session claims it. Without the hook (bookmarklet, older patcher),
     * they're clicked as soon as they open (#checkShownDialog), with a slow poll as a safety net, for as long as autosing is active.
     */
    static setAutosingActive(active: boolean): void {
        HSGameDialogs.#autosingActive = active;
        const answersByDom = active && !HSGameDialogs.#hookPatched;
        HSGameDialogs.#autosingAnswersByDom = answersByDom;
        if (answersByDom) HSGameDialogs.#startWatcher();
        else HSGameDialogs.#stopWatcher();
    }

    /** No dialog is open. Every queued dialog is shown inside #confirmationBox, so a hidden box means an empty queue. */
    static isQueueIdle(): boolean {
        return HSGameDialogs.#box?.style.getPropertyValue('display') !== 'block';
    }

    /**
     * Resolves once the queue is idle, checked one task later: by then, the current action has queued its
     * dialogs, and those answered at once have chained theirs. Dialogs shown meanwhile (e.g. one waiting for
     * the player) delay it until the last one closes. Takes no lock.
     */
    static whenQueueIdle(): Promise<void> {
        return new Promise(resolve => {
            window.setTimeout(() => {
                if (HSGameDialogs.isQueueIdle()) resolve();
                else HSGameDialogs.#idleWaiters.push(resolve);
            }, 0);
        });
    }

    /**
     * For synchronous actions: runs fn with these answers for the dialogs it queues.
     * Its dialogs still waiting in the queue after the default time limit are orphans.
     */
    static act(owner: string, answers: HSDialogAnswers, fn: () => void): void {
        const session = new HSDialogSession(owner);
        window.setTimeout(() => session.end(), HSGameDialogs.DEFAULT_TIME_LIMIT_MS);
        HSGameDialogs.actFor(session, answers, fn);
    }

    /**
     * For longer actions: waits for the lock and an idle queue, then runs fn holding the lock.
     * Inside, the feature calls s.act() for each step. The lock is never held while waiting for the player:
     * it's taken only once the queue is idle. Past the time limit, the session ends (s.ended, s.act() refuses),
     * the lock is released and its dialogs still queued become orphans; fn should then stop.
     */
    static async run<T>(owner: string, options: HSDialogRunOptions, fn: (s: HSDialogSession) => Promise<T>): Promise<T> {
        const session = new HSDialogSession(owner);
        await new Promise<void>(resolve => {
            HSGameDialogs.#waiters.push(() => { HSGameDialogs.#lockHolder = session; resolve(); });
            HSGameDialogs.#pump();
        });

        const timeLimitMs = options.timeLimitMs ?? HSGameDialogs.DEFAULT_TIME_LIMIT_MS;
        const timer = window.setTimeout(() => {
            HSLogger.warn(`${owner} still holds the dialog lock after ${timeLimitMs} ms: released`, HSGameDialogs.#context);
            HSGameDialogs.#endSession(session);
        }, timeLimitMs);
        try {
            return await fn(session);
        } finally {
            window.clearTimeout(timer);
            HSGameDialogs.#endSession(session);
        }
    }

    /** Used by HSDialogSession.act(). */
    static actFor(session: HSDialogSession, answers: HSDialogAnswers, fn: () => void): void {
        // Kept until the end of the task: dialogs chained after an await (e.g. an Alert after a Confirm or a
        // PurchasePrompt) are queued in a later microtask. Within the same event only: when a player's click
        // runs this, the chained dialog still sees that click as window.event.
        const actWindow: HSActWindow = { session, answers, event: window.event, running: true };
        HSGameDialogs.#actWindows.push(actWindow);
        HSGameDialogs.#scheduleTaskEnd();
        const wasIdle = HSGameDialogs.isQueueIdle();
        try {
            fn();
        } finally {
            // Without the hook: a dialog fn opened is answered now, while this act still claims it. The observer
            // would answer it only at the next microtask checkpoint: inside a synthetic click nested in a player's
            // click (Auto-Loadout's quickbar click), that's after the player's listener, under another window.event.
            // Only a dialog fn opened (the queue was idle): never one that was already shown.
            if (!HSGameDialogs.#hookPatched && wasIdle && !HSGameDialogs.isQueueIdle()) HSGameDialogs.#answerShownByDom();
            actWindow.running = false;
        }
    }

    // ── Origins and answers (called by the patched game code) ────────────────────────────────────────

    /**
     * Called when a dialog is queued: the session acting right now, or earlier in the same task and event,
     * that claims this kind, and whether autosing is active (so a dialog autosing queued right before a stop
     * is still answered). For the other dialogs: whether a run() holds the lock, and their hidden dialogs keys
     * (never looked up during autosing, which answers first).
     */
    static #getOrigin(kind: HSDialogKind, firstArg: unknown): HSDialogOrigin | undefined {
        try {
            const claim = HSGameDialogs.#claim(kind, window.event);
            const autosing = HSGameDialogs.#autosingActive;
            let origin: HSDialogOrigin;
            if (claim) {
                origin = { session: claim.session, answers: claim.answers, autosing };
            } else if (autosing) {
                origin = { autosing };
            } else {
                const keys = HSHiddenDialogs.identify(kind, firstArg);
                origin = { autosing, lockHeld: !!HSGameDialogs.#lockHolder };
                if (keys) {
                    origin.keys = keys;
                    origin.text = firstArg;
                }
            }
            HSGameDialogs.#origins.add(origin);
            return origin;
        } catch (error) {
            HSLogger.warn(`Dialog origin failed: ${error}`, HSGameDialogs.#context);
            return undefined;
        }
    }

    /**
     * The act window claiming a dialog of this kind, with the answers it had then.
     * A prompt value ({ ok }) is used up by the first Prompt it claims.
     */
    static #claim(kind: HSDialogKind, event: Event | undefined): { session: HSDialogSession, answers: HSDialogAnswers } | undefined {
        const windows = HSGameDialogs.#actWindows;
        for (let i = windows.length - 1; i >= 0; i--) {
            const actWindow = windows[i];
            if (actWindow.answers[kind] === undefined) continue;
            if (!actWindow.running && actWindow.event !== event) continue;

            const answers = actWindow.answers;
            if (kind === 'prompt' && typeof answers.prompt === 'object') {
                actWindow.answers = { ...answers, prompt: undefined };
            }
            return { session: actWindow.session, answers };
        }
        return undefined;
    }

    /**
     * Called when a dialog reaches the front of the queue.
     * @returns { value } to resolve the dialog without showing it, undefined to show it.
     */
    static #onDialog(kind: HSDialogKind, rawOrigin: unknown): { value: unknown } | undefined {
        try {
            // A missing or foreign origin (dialog queued before the mod loaded, origin call failed): no session,
            // autosing's current state
            const origin: HSDialogOrigin = HSGameDialogs.#origins.has(rawOrigin as HSDialogOrigin)
                ? rawOrigin as HSDialogOrigin
                : { autosing: HSGameDialogs.#autosingActive };

            let answer: HSDialogAnswer | undefined;
            if (origin.session) {
                if (origin.session.ended) {
                    answer = HSGameDialogs.#orphanAnswer(kind);
                    HSLogger.log(`Orphan ${kind} of ${origin.session.owner}: answered "${HSGameDialogs.#describe(answer)}"`, HSGameDialogs.#context);
                } else {
                    answer = origin.answers?.[kind];
                }
            } else if (origin.autosing) {
                // As auto-confirm did. InfoAlerts are shown (the player opened them to read them), and so are
                // Prompts and PurchasePrompts: the mod can't guess their value
                if (kind === 'confirm') answer = 'ok';
                else if (kind === 'alert') answer = 'dismiss';
            } else if (!origin.lockHeld && origin.keys && HSGameDialogs.#isHideable(kind)
                && HSHiddenDialogs.isHidden(kind, origin.keys)) {
                // A dialog the player chose to hide. Not while a run() holds the lock: that feature may read it
                answer = kind === 'confirm' ? 'ok' : 'dismiss';
                HSHiddenDialogs.onHidden(kind, origin.keys, origin.text);
            }

            if (answer === undefined || answer === 'show') {
                // Shown right after this returns: offer the checkbox if the dialog was identified
                if (HSGameDialogs.#isHideable(kind)) HSHiddenDialogs.onShown(kind, origin.session ? undefined : origin.keys);
                return undefined;
            }
            return { value: HSGameDialogs.#toValue(kind, answer) };
        } catch (error) {
            HSLogger.warn(`Dialog hook failed, dialog shown: ${error}`, HSGameDialogs.#context);
            return undefined;
        }
    }

    static #isHideable(kind: HSDialogKind): kind is HSHideableDialogKind {
        return kind === 'confirm' || kind === 'alert';
    }

    static #orphanAnswer(kind: HSDialogKind): HSDialogAnswer {
        return kind === 'alert' || kind === 'infoAlert' ? 'dismiss' : 'cancel';
    }

    /** The value the game's dialog promise resolves to. */
    static #toValue(kind: HSDialogKind, answer: HSDialogAnswer): unknown {
        if (typeof answer === 'object') return answer.ok;
        if (answer === 'ok') return true;
        if (answer === 'cancel') return kind === 'confirm' ? false : null;
        return undefined;
    }

    static #describe(answer: HSDialogAnswer): string {
        return typeof answer === 'object' ? `ok: ${answer.ok}` : answer;
    }

    // ── Task scope ───────────────────────────────────────────────────────────────────────────────────

    /**
     * Clears the act windows once the current task has ended. One message for all: when it's delivered,
     * every task that opened one has finished (tasks don't interleave, microtasks run first).
     */
    static #scheduleTaskEnd(): void {
        if (HSGameDialogs.#taskEndPending) return;
        HSGameDialogs.#taskEndPending = true;
        if (!HSGameDialogs.#taskEndChannel) {
            HSGameDialogs.#taskEndChannel = new MessageChannel();
            HSGameDialogs.#taskEndChannel.port1.onmessage = () => {
                HSGameDialogs.#taskEndPending = false;
                HSGameDialogs.#actWindows = HSGameDialogs.#actWindows.filter(actWindow => actWindow.running);
            };
        }
        HSGameDialogs.#taskEndChannel.port2.postMessage(null);
    }

    // ── Queue observer ───────────────────────────────────────────────────────────────────────────────

    /** Runs when #confirmationBox's style changes, i.e. a dialog is shown or closed. Answered dialogs never show it. */
    static #onBoxMutation(): void {
        const open = !HSGameDialogs.isQueueIdle();
        if (open === HSGameDialogs.#boxOpen) return;
        HSGameDialogs.#boxOpen = open;

        if (open) {
            if (!HSGameDialogs.#hookPatched) HSGameDialogs.#answerShownByDom();
            return;
        }
        // One step later: the next queued dialog (or the next one of a chain) may open right after this one closed
        window.setTimeout(() => {
            HSGameDialogs.#pump();
            HSGameDialogs.#releaseIdleWaiters();
        }, 0);
    }

    static #releaseIdleWaiters(): void {
        if (HSGameDialogs.#idleWaiters.length === 0 || !HSGameDialogs.isQueueIdle()) return;
        const waiters = HSGameDialogs.#idleWaiters;
        HSGameDialogs.#idleWaiters = [];
        for (const resolve of waiters) resolve();
    }

    /** Without the hook: a session answers its dialog through the DOM once it's shown. */
    static #answerShownByDom(): void {
        const kind = (Object.keys(HSGameDialogs.#domIds) as HSDialogKind[])
            .find(k => document.getElementById(HSGameDialogs.#domIds[k].wrapper)?.style.display === 'block');
        if (!kind) return;
        const claim = HSGameDialogs.#claim(kind, window.event);
        if (!claim) return;
        const answer = claim.answers[kind];
        if (answer === undefined || answer === 'show') return;

        const ids = HSGameDialogs.#domIds[kind];
        if (typeof answer === 'object') {
            const input = document.getElementById('prompt_text') as HTMLInputElement | null;
            if (input) input.value = answer.ok;
        }
        const buttonId = answer === 'cancel' ? ids.cancel : ids.ok;
        if (buttonId) (document.getElementById(buttonId) as HTMLButtonElement | null)?.click();
    }

    // ── Shown Confirms and Alerts without the hook (hidden dialogs, autosing) ────────────────────────

    /**
     * Without the hook, a dialog can only be answered once shown. The box observer misses a dialog that opens as
     * the previous one closes (the box looks open all along), so the Confirm and Alert wrappers and texts are
     * watched too, and each opening is handled once. The game rewrites the text at every opening, so even a
     * dialog with the same text as the previous one is seen. The callback runs before the browser paints.
     */
    static #observeShownDialogs(): void {
        const observer = new MutationObserver(() => HSGameDialogs.#checkShownDialog());
        for (const kind of ['confirm', 'alert'] as HSHideableDialogKind[]) {
            const wrapper = document.getElementById(HSGameDialogs.#domIds[kind].wrapper);
            const text = document.querySelector(`#${kind} > p`);
            if (wrapper) observer.observe(wrapper, { attributes: true, attributeFilter: ['style'] });
            if (text) observer.observe(text, { childList: true, characterData: true, subtree: true });
        }
    }

    static #checkShownDialog(): void {
        const kind = (['confirm', 'alert'] as HSHideableDialogKind[])
            .find(k => document.getElementById(HSGameDialogs.#domIds[k].wrapper)?.style.display === 'block');
        if (!kind || HSGameDialogs.isQueueIdle()) {
            HSGameDialogs.#lastShownDialog = null;
            return;
        }
        const text = document.querySelector(`#${kind} > p`)?.textContent ?? '';
        const signature = `${kind}:${text}`;
        if (signature === HSGameDialogs.#lastShownDialog) return;
        HSGameDialogs.#lastShownDialog = signature;

        if (HSGameDialogs.#autosingAnswersByDom) {
            HSGameDialogs.#answerForAutosing(kind);
            return;
        }
        // A session's dialog is answered by #answerShownByDom. Autosing with an older patcher: by auto-confirm
        if (HSGameDialogs.#autosingActive || HSGameDialogs.#claimsShown(kind)) return;
        const keys = HSHiddenDialogs.identify(kind, text);
        // Not while a run() holds the lock: that feature may read the dialog
        if (!HSGameDialogs.#lockHolder && keys && HSHiddenDialogs.isHidden(kind, keys)) {
            HSGameDialogs.#lastShownDialog = null;
            (document.getElementById(HSGameDialogs.#domIds[kind].ok) as HTMLButtonElement | null)?.click();
            HSHiddenDialogs.onHidden(kind, keys, text);
            return;
        }
        HSHiddenDialogs.onShown(kind, keys);
    }

    /** An act window claims a dialog of this kind right now (without using up a Prompt value). */
    static #claimsShown(kind: HSDialogKind): boolean {
        return HSGameDialogs.#actWindows.some(actWindow => actWindow.answers[kind] !== undefined
            && (actWindow.running || actWindow.event === window.event));
    }

    /**
     * Autosing without any patch: OK on the Confirm or Alert that just opened, as the hook's autosing policy
     * answers them (no session answers a Confirm or Alert otherwise). At most MAX_ANSWERS_IN_A_ROW within one
     * task: a dialog reopening itself at every OK would otherwise freeze the page. Past it, the safety net poll
     * answers, one dialog per poll.
     */
    static #answerForAutosing(kind: HSHideableDialogKind): void {
        if (HSGameDialogs.#answersInARow >= HSGameDialogs.MAX_ANSWERS_IN_A_ROW) {
            HSLogger.debug(() => `${HSGameDialogs.MAX_ANSWERS_IN_A_ROW} dialogs answered in a row: left to the safety net`, HSGameDialogs.#context);
            return;
        }
        // A new task resets the count
        if (HSGameDialogs.#answersInARow++ === 0) window.setTimeout(() => { HSGameDialogs.#answersInARow = 0; }, 0);
        HSGameDialogs.#lastShownDialog = null;
        (document.getElementById(HSGameDialogs.#domIds[kind].ok) as HTMLButtonElement | null)?.click();
    }

    // ── Dialog watcher, safety net (no patch at all) ─────────────────────────────────────────────────

    /**
     * Clicks OK on a visible Confirm or Alert every SAFETY_NET_POLL_MS while autosing is active. #checkShownDialog
     * answers them as they open; this only catches what it couldn't (elements missing at load, a chain past
     * MAX_ANSWERS_IN_A_ROW): autosing's wait at Exalt has no time limit.
     */
    static #startWatcher(): void {
        if (HSGameDialogs.#watcherInterval !== null) return;
        HSLogger.debug(() => 'Dialog watcher (safety net) started', HSGameDialogs.#context);
        const kinds: HSDialogKind[] = ['confirm', 'alert'];
        HSGameDialogs.#watcherInterval = window.setInterval(() => {
            for (const kind of kinds) {
                const ids = HSGameDialogs.#domIds[kind];
                if (document.getElementById(ids.wrapper)?.style.display !== 'block') continue;
                HSLogger.debug(() => `Dialog watcher (safety net) answered a ${kind}`, HSGameDialogs.#context);
                (document.getElementById(ids.ok) as HTMLButtonElement | null)?.click();
            }
        }, HSGameDialogs.SAFETY_NET_POLL_MS);
    }

    static #stopWatcher(): void {
        if (HSGameDialogs.#watcherInterval === null) return;
        window.clearInterval(HSGameDialogs.#watcherInterval);
        HSGameDialogs.#watcherInterval = null;
        HSLogger.debug(() => 'Dialog watcher stopped', HSGameDialogs.#context);
    }

    // ── Lock ─────────────────────────────────────────────────────────────────────────────────────────

    /** Gives the lock to the next waiter (first come, first served) when it's free and the queue is idle. */
    static #pump(): void {
        if (HSGameDialogs.#lockHolder || HSGameDialogs.#waiters.length === 0 || !HSGameDialogs.isQueueIdle()) return;
        HSGameDialogs.#waiters.shift()!();
    }

    static #endSession(session: HSDialogSession): void {
        if (session.ended) return;
        session.end();
        if (HSGameDialogs.#lockHolder === session) {
            HSGameDialogs.#lockHolder = null;
            HSGameDialogs.#pump();
        }
    }
}
