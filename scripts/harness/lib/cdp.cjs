// A small DevTools protocol client over Node's built-in WebSocket (Node 22+): no package needed.
const fs = require('node:fs')

const sleep = ms => new Promise(r => setTimeout(r, ms))

async function connectCdp(port) {
    let pages
    for (let i = 0; i < 50 && !pages; i++) {
        try { pages = await (await fetch(`http://127.0.0.1:${port}/json`)).json() } catch { await sleep(200) }
    }
    const page = pages?.find(p => p.type === 'page')
    if (!page) throw new Error(`no page on debug port ${port}`)
    const ws = new WebSocket(page.webSocketDebuggerUrl)
    await new Promise(r => ws.addEventListener('open', r, { once: true }))

    let id = 0
    const pending = new Map()
    const handlers = new Map()
    const on = (method, fn) => handlers.set(method, [...(handlers.get(method) ?? []), fn])
    const emit = (method, params) => (handlers.get(method) ?? []).forEach(fn => fn(params))
    const send = (method, params = {}) => new Promise(r => { const i = ++id; pending.set(i, r); ws.send(JSON.stringify({ id: i, method, params })) })

    // Console lines, kept from the last navigate() on: Runtime.enable replays the previous page's messages,
    // which would show up as false hits when counting log lines
    const logs = []
    let recording = false
    ws.addEventListener('message', ev => {
        const m = JSON.parse(ev.data)
        if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id) }
        if (!m.method) return
        if (m.method === 'Runtime.consoleAPICalled' && recording) {
            const line = `${m.params.type}: ${m.params.args.map(a => a.value ?? a.description).join(' ')}`
            logs.push(line); emit('log', line)
        }
        if (m.method === 'Runtime.exceptionThrown' && recording) {
            const line = `EXCEPTION: ${m.params.exceptionDetails.exception?.description ?? m.params.exceptionDetails.text}`
            logs.push(line); emit('log', line)
        }
        // A native alert/confirm would freeze the page
        if (m.method === 'Page.javascriptDialogOpening') send('Page.handleJavaScriptDialog', { accept: true })
        emit(m.method, m.params)
    })

    const evaluate = async expression => {
        const r = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true })
        if (r.result?.exceptionDetails) throw new Error(r.result.exceptionDetails.exception?.description ?? r.result.exceptionDetails.text)
        return r.result?.result?.value
    }
    const waitFor = async (expression, ms = 20000) => {
        const end = Date.now() + ms
        while (Date.now() < end) {
            if (await evaluate(expression).catch(() => false)) return true
            await sleep(250)
        }
        throw new Error('timeout: ' + expression)
    }
    const navigate = async url => { logs.length = 0; recording = true; await send('Page.navigate', { url }) }

    // Trusted clicks: code that checks event.isTrusted sees a real one
    const mouse = (type, x, y) => send('Input.dispatchMouseEvent', { type, x, y, button: 'left', buttons: type === 'mouseReleased' ? 0 : 1, clickCount: 1, pointerType: 'mouse' })
    const rect = selector => evaluate(`(() => { const r = document.querySelector(${JSON.stringify(selector)}).getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2, w: r.width, h: r.height }; })()`)
    const click = async selector => { const r = await rect(selector); await mouse('mousePressed', r.x, r.y); await mouse('mouseReleased', r.x, r.y) }

    const setFiles = async (selector, files) => {
        const doc = await send('DOM.getDocument')
        const q = await send('DOM.querySelector', { nodeId: doc.result.root.nodeId, selector })
        await send('DOM.setFileInputFiles', { nodeId: q.result.nodeId, files })
    }
    const screenshot = async (file, clip) => {
        const r = await send('Page.captureScreenshot', { format: 'png', ...(clip ? { clip: { ...clip, scale: 1 } } : {}) })
        fs.writeFileSync(file, Buffer.from(r.result.data, 'base64'))
    }

    await send('Page.enable'); await send('Runtime.enable'); await send('DOM.enable')
    return { send, on, evaluate, waitFor, navigate, mouse, rect, click, setFiles, screenshot, logs, sleep, close: () => ws.close() }
}

module.exports = { connectCdp, sleep }
