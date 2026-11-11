const test = require('node:test')
const assert = require('node:assert/strict')
const { patchBundle } = require('../lib/patcher.js')

function fixture({ dollar = false, spaces = false, missingLimit = false, duplicateSplit = false } = {}) {
    const name = value => dollar ? `$${value}` : value
    const c = name('capacity'), k = name('key'), r = name('read')
    const split = `chunk(ids.filter(isButton),${c}[layout])`
    let source = `const ${c}={desktop:4,mobile:4},${k}=()=>mobile?'mobile':'desktop',${r}=()=>${c}[${k}()];
        const columns={desktop:7,mobile:2},readColumns=()=>columns[${k}()];
        const chunk=(ids,n)=>Array.from({length:Math.ceil(ids.length/n)},(_,i)=>ids.slice(i*n,(i+1)*n));
        const isButton=id=>id.startsWith('button');
        const split=(ids,layout)=>${split};
        ${duplicateSplit ? `const otherSplit=(ids,layout)=>${split};` : ''}
        const valid=(position,layout)=>position>=0&&position<${missingLimit ? '4' : `${c}[layout]`};
        const render=()=>{document.getElementById('mainHeader').style.setProperty('--header-button-slots',''.concat(${r}()));document.getElementById('headerTray');return readColumns()};
        const join=(ids,id)=>ids.includes(id)||ids.length<${r}();
        const move=(layout,id,region,target)=>{
            if(target.join){layout.regions[region][target.index].push(id);layout.positions[id]=target.position}
            layout.hidden=layout.hidden.filter(member=>member!==id);layout.regions[region].splice(0,0);
        };
        return {read:${r},render,split,valid,join,move};`
    if (spaces) source = source.replaceAll('()=>', '( ) => ').replaceAll('][', '] [')
    const warnings = []
    const patched = patchBundle(source, { log() {}, warn: (...args) => warnings.push(args.join(' ')) })
    const window = {}
    const rendered = []
    const document = { getElementById: () => ({ style: { setProperty: (...args) => rendered.push(args) } }) }
    const run = mobile => Function('window', 'document', 'mobile', patched)(window, document, mobile)
    return { window, run, rendered, warnings }
}

for (const options of [{}, { dollar: true }, { spaces: true }]) {
    test(`header buttons: shared rendering/drop capacity and preserved save groups ${JSON.stringify(options)}`, () => {
        const { window, run, rendered } = fixture(options)
        const game = run(false)
        assert.equal(window.__HS_HEADER_BUTTONS_PATCHED, true)
        assert.equal(window.__HS_PATCH_REPORT.headerButtons, true)
        assert.equal(game.read(), 4, 'the game stays at its default before the mod loads')
        window.__HS_headerButtonCapacity = () => 6
        assert.equal(game.read(), 6)
        game.render()
        assert.deepEqual(rendered.at(-1), ['--header-button-slots', '6'])
        assert.equal(game.join(['a', 'b', 'c', 'd', 'e'], 'new'), true)
        assert.equal(game.join(['a', 'b', 'c', 'd', 'e', 'f'], 'new'), false)
        window.__HS_canJoinHeaderButtons = () => true
        assert.equal(game.join(Array(8).fill('button'), 'new'), true, 'the mod can use actual button widths')
        window.__HS_canJoinHeaderButtons = () => false
        assert.equal(game.join([], 'new'), false)
        delete window.__HS_canJoinHeaderButtons
        const layout = {regions:{headerGrid:[[]]},positions:{},hidden:[]}
        const target = {index:0,join:true,position:0}
        let moveArguments
        window.__HS_moveHeaderButton = (...args) => {moveArguments=args;return true}
        game.move(layout,'button0','headerGrid',target)
        assert.deepEqual(moveArguments,[layout,'button0','headerGrid',target])
        assert.deepEqual(layout.regions.headerGrid,[[]], 'a handled drop skips the native fixed-slot move')
        delete window.__HS_moveHeaderButton
        game.move(layout,'button0','headerGrid',target)
        assert.deepEqual(layout.regions.headerGrid,[['button0']], 'native movement remains the fallback')

        const buttons = Array.from({ length: 8 }, (_, i) => `button${i}`)
        assert.deepEqual(game.split(buttons, 'desktop'), [buttons])
        assert.equal(game.valid(7, 'desktop'), true)
        assert.equal(game.valid(8, 'desktop'), false)
        assert.equal(game.valid(-1, 'desktop'), false)
        window.__HS_headerButtonCapacity = () => 3
        assert.equal(game.join(buttons, 'new'), false)
        assert.equal(game.join(buttons, 'button0'), true, 'existing buttons can still be moved')
        assert.deepEqual(game.split(buttons, 'desktop'), [buttons], 'a narrower window must not change saved grouping')
        assert.equal(run(true).read(), 3)
    })
}

for (const options of [{ missingLimit: true }, { duplicateSplit: true }]) {
    test(`header buttons: an incomplete or ambiguous match leaves the feature off ${JSON.stringify(options)}`, () => {
        const { window, run, warnings } = fixture(options)
        const game = run(false)
        assert.equal(window.__HS_HEADER_BUTTONS_PATCHED, undefined)
        assert.equal(window.__HS_PATCH_REPORT.headerButtons, false)
        window.__HS_headerButtonCapacity = () => 8
        assert.equal(game.read(), 4)
        assert.ok(warnings.some(message => message.includes('Could not patch header button capacity')))
    })
}
