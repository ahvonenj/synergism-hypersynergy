const test = require('node:test')
const assert = require('node:assert/strict')
const { patchBundle } = require('../lib/patcher.js')

// The 5 game dialogs, in the shape of the minified bundle (see docs: dialog-queue-design.md, 4.1).
// Each body shows #confirmationBox and waits for the test to answer it.
const dialog = (header, wrapper, firstLocal = 't') =>
    `${header}Jf.enqueue(()=>{let ${firstLocal}=c("confirmationBox"),w=c("${wrapper}");${firstLocal}.style.display="block";` +
    `return new Promise(res=>shown.push({wrapper:"${wrapper}",res}))})`

const allDialogs = [
    dialog('je=async e=>', 'confirmWrapper'),
    dialog('D=e=>', 'alertWrapper'),
    dialog('Hy=(e,t)=>', 'infoAlertWrapper', 'r'),
    dialog('kn=(e,t)=>', 'promptWrapper', 'r'),
    dialog('is=e=>', 'purchasePromptWrapper'),
]

const queue = 'class KL{#i=[];#p=!1;enqueue(a){return new Promise((r,j)=>{this.#i.push({a,r,j});this.dequeue()})}' +
    'async dequeue(){if(this.#p)return;const x=this.#i.shift();if(!x)return;try{this.#p=!0;x.r(await x.a())}' +
    'catch(e){x.j(e)}finally{this.#p=!1;this.dequeue()}}}'

const bundle = dialogs => `"use strict";${queue}const box={style:{display:"none"}},c=id=>box,shown=[],Jf=new KL,` +
    `${dialogs.join(',')};return {Confirm:je,Alert:D,InfoAlert:Hy,Prompt:kn,PurchasePrompt:is,shown,box};`

const patchAndRun = (dialogs, window) => {
    const warnings = []
    const code = patchBundle(bundle(dialogs), { log() {}, warn: (...a) => warnings.push(a.join(' ')) })
    return { game: new Function('window', code)(window), warnings, code }
}

test('dialog hook: origin captured when queued, answer given at the front of the queue', async () => {
    const window = {}
    const { game } = patchAndRun(allDialogs, window)
    assert.equal(window.__HS_DIALOG_HOOK_PATCHED, true)

    const queued = []
    const front = []
    window.__HS_dialogOrigin = (kind, firstArg) => {
        const origin = { kind, firstArg }
        queued.push(origin)
        return origin
    }
    window.__HS_onDialog = (kind, origin) => {
        front.push({ kind, origin })
        return kind === 'confirm' ? { value: true } : undefined
    }

    // Answered by the hook: never shown
    assert.equal(await game.Confirm('Sure?'), true)
    assert.equal(game.shown.length, 0)

    // Shown: the next dialogs wait behind it, and keep the origin captured when they were queued
    const alert = game.Alert('Hello')
    const prompt = game.Prompt('Code?', 'default')
    const info = game.InfoAlert('Title', [])
    const purchase = game.PurchasePrompt({ title: 'Upgrade' })
    assert.deepEqual(queued.map(o => [o.kind, o.firstArg]), [
        ['confirm', 'Sure?'], ['alert', 'Hello'], ['prompt', 'Code?'], ['infoAlert', 'Title'],
        ['purchasePrompt', { title: 'Upgrade' }],
    ])
    assert.equal(game.shown.length, 1)
    assert.equal(game.shown[0].wrapper, 'alertWrapper')
    assert.equal(game.box.style.display, 'block')

    game.shown[0].res(undefined)
    await alert
    await new Promise(r => setTimeout(r, 0))
    assert.equal(game.shown[1].wrapper, 'promptWrapper')
    game.shown[1].res('42')
    assert.equal(await prompt, '42')
    await new Promise(r => setTimeout(r, 0))
    game.shown[2].res(undefined)
    await info
    await new Promise(r => setTimeout(r, 0))
    game.shown[3].res(null)
    assert.equal(await purchase, null)

    assert.deepEqual(front.map(f => f.kind), ['confirm', 'alert', 'prompt', 'infoAlert', 'purchasePrompt'])
    assert.ok(front.every(f => queued.includes(f.origin)))
})

test('dialog hook: without the mod, dialogs are shown (the legacy __HS_AUTO_CONFIRM is gone)', async () => {
    const window = { __HS_AUTO_CONFIRM: true }
    const { game, code } = patchAndRun(allDialogs, window)
    assert.ok(!code.includes('__HS_AUTO_CONFIRM'))

    void game.Confirm('Sure?')
    assert.equal(game.shown.length, 1)
    assert.equal(game.shown[0].wrapper, 'confirmWrapper')
})

test('dialog hook: each action hides the 4 other wrappers, lines in any order, defaults with parentheses', async () => {
    const wrappers = ['confirmWrapper', 'alertWrapper', 'infoAlertWrapper', 'promptWrapper', 'purchasePromptWrapper']
    // As in the game: every dialog hides the others; here before declaring its own, after other elements
    const hidingOthers = (header, wrapper) =>
        `${header}Jf.enqueue(()=>{let a=c("transparentBG");` +
        wrappers.filter(w => w !== wrapper).map(w => `c("${w}").style.display="none"`).join(',') +
        `;let t=c("confirmationBox"),w=c("${wrapper}");t.style.display="block";` +
        `return new Promise(res=>shown.push({wrapper:"${wrapper}",res}))})`
    const window = {}
    const { game, warnings } = patchAndRun([
        hidingOthers('je=async e=>', 'confirmWrapper'),
        hidingOthers('D=e=>', 'alertWrapper'),
        hidingOthers('Hy=(e,t=c("x"))=>', 'infoAlertWrapper'),
        hidingOthers('kn=(e,t)=>', 'promptWrapper'),
        hidingOthers('is=e=>', 'purchasePromptWrapper'),
    ], window)
    assert.deepEqual(warnings.filter(w => w.includes('dialogs')), [])
    assert.equal(window.__HS_DIALOG_HOOK_PATCHED, true)

    const queued = []
    window.__HS_dialogOrigin = (kind, firstArg) => { queued.push([kind, firstArg]); return kind }
    window.__HS_onDialog = kind => (kind === 'alert' ? undefined : { value: kind })
    assert.equal(await game.Confirm('Sure?'), 'confirm')
    assert.equal(await game.InfoAlert('Title'), 'infoAlert')
    assert.equal(await game.PurchasePrompt('Upgrade'), 'purchasePrompt')
    void game.Alert('Hello')
    assert.deepEqual(game.shown.map(s => s.wrapper), ['alertWrapper'])
    assert.deepEqual(queued, [['confirm', 'Sure?'], ['infoAlert', 'Title'], ['purchasePrompt', 'Upgrade'], ['alert', 'Hello']])
})

test('dialog hook: all 5 dialogs or none', () => {
    const window = {}
    const { code, warnings } = patchAndRun(allDialogs.slice(0, 4).concat('is=e=>null'), window)
    assert.equal(code.includes('__hsO'), false)
    assert.equal(code.includes('__HS_DIALOG_HOOK_PATCHED'), false)
    assert.ok(warnings.some(w => w.includes('Could not patch the game dialogs')))
})
