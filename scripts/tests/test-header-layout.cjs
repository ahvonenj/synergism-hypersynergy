const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { spawnSync } = require('node:child_process');
const esbuild = require('esbuild');

// Real browser geometry: equal button spacing, responsive capacity, wrapping, and typed width bounds.
async function main() {
    const browser = [process.env.CHROME_BIN,
        'C:/Program Files/Google/Chrome/Application/chrome.exe',
        'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
        '/usr/bin/chromium', '/usr/bin/google-chrome',
    ].find(file => file && fs.existsSync(file));
    if (!browser) { console.log('Header browser checks skipped: no Chromium browser installed.'); return; }
    const root = path.resolve(__dirname, '../..');
    const bundled = await esbuild.build({
        stdin: { contents: `export {HSHeaderButtons} from './src/mod/class/hs-core/header/hs-header-buttons';
            export {HSHeaderGridWidth} from './src/mod/class/hs-core/header/hs-header-grid-width';`,
            resolveDir: root, loader: 'ts' },
        bundle: true, write: false, platform: 'browser', format: 'iife', globalName: 'HeaderTest',
        plugins: [{ name: 'header-game-boundary', setup(build) {
            const stubs = {
                'hs-global': `export const HSGlobal = {HSStorage:{storagePrefix:'hs-'},get exposedPlayer(){return window.testPlayer}};`,
                'hs-module-registry': `export const HSModuleRegistry = {getModule(){return window.testStorage}};`,
                'hs-logger': 'export const HSLogger = {log(){},warn(){}};',
            };
            build.onResolve({ filter: /hs-[\w-]+$/ }, args => {
                const name = args.path.split('/').pop();
                if (stubs[name]) return {path:name, namespace:'test'};
            });
            build.onLoad({ filter: /.*/, namespace: 'test' }, args => ({contents:stubs[args.path],loader:'ts'}));
        } }],
    });
    const css = ['hs-header-cell-settings.css', 'hs-header-edit-settings.css']
        .map(name => fs.readFileSync(path.join(root, 'src/mod/resource/css/module', name), 'utf8')).join('\n');
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'hs-header-layout-'));
    try {
        const file = path.join(directory, 'test.html');
        fs.writeFileSync(file, `<!doctype html><html><head><style>
            body {margin:0;background:#151515;color:#eee;font:16px sans-serif}
            #mainHeader {width:2100px} #headerGrid {display:grid;grid-template-columns:repeat(7,minmax(0,1fr));--header-grid-columns:7;width:100%;min-width:1250px;max-width:1250px;justify-items:center}
            html.hs-header-grid-width #headerGrid {max-width:var(--hs-header-grid-width)}
            .headerStack {display:flex;flex-direction:column}
            .headerStack.headerStackRow {display:grid;grid-template-columns:repeat(var(--header-button-slots),1fr);justify-self:stretch;justify-items:center;align-items:start}
            .headerStackRow > * {grid-row:1} .resetbtn {width:32px;height:32px;margin-right:5px;background:#2977ab}
            .headerModuleLocked {display:none} .headerButtonSlot {border:1px dashed #999;grid-row:1}
            ${css}</style></head><body><div id="mainHeader"><div id="headerGrid" class="headerRegion"></div><div id="headerTray"></div></div>
            <div id="hs-header-edit-settings"></div><pre id="result">RUNNING</pre><script>${bundled.outputFiles[0].text}</script><script>
            window.onerror = error => document.getElementById('result').textContent='FAIL '+error;
            // Keep scheduled renders deterministic under headless Chromium's virtual clock.
            window.requestAnimationFrame = callback => setTimeout(callback,0);
            const check=(value,message)=>{if(!value)throw new Error(message)};
            const close=(a,b,message)=>check(Math.abs(a-b)<1,message+': '+a+' != '+b);
            const sleep=()=>new Promise(resolve=>setTimeout(resolve,100));
            const stored={}; window.testStorage={getData:key=>stored[key],setData:(key,value)=>(stored[key]=value,true),clearData:key=>delete stored[key]};
            const positions={a:0,b:1,c:2,d:0,e:1,f:2,g:3,h:4};
            const layout={positions,regions:{headerGrid:[['a','b','c'],['d','e','f','g','h']],ascensionStats:[]},hidden:[]};
            window.testPlayer={headerLayouts:{desktop:layout,mobile:layout}};
            let alignment='center',large=false,locked=false,editing=false;
            const header=document.getElementById('mainHeader'),grid=document.getElementById('headerGrid');
            window.__HS_HEADER_BUTTONS_PATCHED=true;
            window.__HS_renderHeaderLayout=()=>{
                header.classList.toggle('headerEditMode',editing);
                header.style.setProperty('--header-button-slots',String(window.__HS_headerButtonCapacity?.(4)??4));
                grid.replaceChildren();
                for(const [index,ids] of layout.regions.headerGrid.entries()){
                    const slot=document.createElement('div');slot.className='headerStack headerStackRow';slot.dataset.headerSlot=index;
                    slot.dataset.hsHeaderAlign=index===0?alignment:'left';
                    if(editing)for(let index=0;index<(window.__HS_headerButtonCapacity?.(4)??4);index++){
                        const placeholder=document.createElement('div');placeholder.className='headerButtonSlot';slot.append(placeholder)
                    }
                    for(const id of ids){const button=document.createElement('div');button.id=id;button.className='resetbtn headerModule';
                        if(id==='c'&&locked)button.classList.add('headerModuleLocked');
                        button.textContent=id;button.style.gridColumn=positions[id]+1;
                        if(large)button.style.width='48px';slot.append(button)}
                    grid.append(slot)
                }
                HeaderTest.HSHeaderButtons.refresh();
            };
            (async()=>{
                HeaderTest.HSHeaderGridWidth.install();
                document.getElementById('hs-header-edit-settings').append(HeaderTest.HSHeaderGridWidth.buildLine());
                window.__HS_renderHeaderLayout();HeaderTest.HSHeaderButtons.install();await sleep();
                const input=document.querySelector('.hs-hes-width-value'),slider=document.querySelector('input[type=range]');
                const commit=value=>{input.value=String(value);input.dispatchEvent(new Event('change'))};
                check(window.__HS_headerButtonCapacity(4)===4,'default capacity');
                const equalSpacing=()=>{
                    const slot=grid.firstElementChild,rect=slot.getBoundingClientRect();
                    const buttons=[...slot.children].filter(button=>!button.classList.contains('headerModuleLocked'));
                    if(buttons.length>1){const a=buttons[0].getBoundingClientRect(),b=buttons[1].getBoundingClientRect();close(b.left-a.left,rect.width/buttons.length,'equal shares')}
                    close(rect.width,grid.getBoundingClientRect().width/7,'centered slot fills cell');
                };
                equalSpacing();
                editing=true;window.__HS_renderHeaderLayout();equalSpacing();
                check(grid.querySelectorAll('.headerButtonSlot').length===0,'preview has no empty button placeholders');
                editing=false;window.__HS_renderHeaderLayout();
                slider.value='1750';slider.dispatchEvent(new Event('input'));await sleep();
                check(window.__HS_headerButtonCapacity(4)===6,'dragging the slider refreshes capacity before release');
                commit(1900);await sleep();
                check(window.__HS_headerButtonCapacity(4)===7,'wide grid admits extra buttons');equalSpacing();
                HeaderTest.HSHeaderButtons.refresh();equalSpacing();
                locked=true;window.__HS_renderHeaderLayout();equalSpacing();locked=false;
                commit(99999);await sleep();check(input.value==='2100','upper clamp');check(stored['header-grid-width'].width==='full','upper end follows window');
                header.style.width='1600px';window.dispatchEvent(new Event('resize'));await sleep();
                check(input.value==='1600','Full follows the resized header');
                check(window.__HS_headerButtonCapacity(4)===6,'resizing the header refreshes button capacity');
                header.style.width='2100px';window.dispatchEvent(new Event('resize'));await sleep();
                commit(100);await sleep();check(input.value==='1250','lower clamp');
                check(document.getElementById('h').style.gridRow==='2','existing overflow wraps');
                const d=document.getElementById('d').getBoundingClientRect(),h=document.getElementById('h').getBoundingClientRect();
                check(h.top>=d.bottom,'wrapped buttons do not overlap');
                HeaderTest.HSHeaderButtons.refresh();check(document.getElementById('h').style.gridRow==='2','refresh preserves saved positions');
                grid.children[1].dataset.hsHeaderAlign='center';HeaderTest.HSHeaderButtons.refresh();
                const partial=document.getElementById('h').getBoundingClientRect(),row=grid.children[1].getBoundingClientRect();
                close((partial.left+partial.right)/2,(row.left+row.right)/2,'a partial wrapped row ignores its empty columns');
                // Empty positions and locked buttons must contribute no width to an aligned group.
                positions.a=6;positions.b=0;positions.c=3;
                editing=true;
                for(const edge of ['left','right']){
                    alignment=edge;window.__HS_renderHeaderLayout();
                    const slot=grid.firstElementChild.getBoundingClientRect();
                    const b=document.getElementById('b').getBoundingClientRect(),c=document.getElementById('c').getBoundingClientRect(),a=document.getElementById('a').getBoundingClientRect();
                    close(c.left-b.right,5,edge+' packs first gap');close(a.left-c.right,5,edge+' packs second gap');
                    close(edge==='left'?b.left:a.right,edge==='left'?slot.left:slot.right,edge+' touches the cell edge');
                    check(a.top===b.top,'vacant native positions do not create a new row');
                }
                alignment='center';window.__HS_renderHeaderLayout();
                const centered=grid.firstElementChild.getBoundingClientRect();
                const left=document.getElementById('b').getBoundingClientRect(),middle=document.getElementById('c').getBoundingClientRect(),right=document.getElementById('a').getBoundingClientRect();
                close(middle.left-left.left,centered.width/3,'Center ignores vacant native positions');
                close(right.left-middle.left,centered.width/3,'Center keeps equal spacing');
                check(JSON.stringify(positions)===JSON.stringify({a:6,b:0,c:3,d:0,e:1,f:2,g:3,h:4}),'alignment never changes saved positions');
                positions.a=0;positions.b=1;positions.c=2;
                editing=false;
                alignment='left';window.__HS_renderHeaderLayout();check(document.getElementById('c').style.gridColumn==='3','alignment changes retain model positions');
                alignment='right';locked=true;window.__HS_renderHeaderLayout();
                close(document.getElementById('b').getBoundingClientRect().right,grid.firstElementChild.getBoundingClientRect().right,'Right ignores locked buttons');
                locked=false;alignment='left';window.__HS_renderHeaderLayout();
                commit('');check(input.value==='1250','blank entry restores current width');
                commit(1800);await sleep();large=true;window.__HS_renderHeaderLayout();await sleep();
                check(window.__HS_headerButtonCapacity(4)===4,'large buttons reduce capacity');
                large=false;editing=true;window.__HS_renderHeaderLayout();await sleep();
                check(window.__HS_headerButtonCapacity(4)===6,'edit mode uses same fit capacity');
                slider.value='1500';slider.dispatchEvent(new Event('input'));slider.dispatchEvent(new Event('change'));await sleep();
                check(input.value==='1500','slider updates typed field');
                input.value='1600';input.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',bubbles:true}));await sleep();
                check(stored['header-grid-width'].width===1600,'Enter commits numeric width');
                const reset=document.querySelector('.hs-hes-width-top button');reset.click();await sleep();
                check(!document.documentElement.classList.contains('hs-header-grid-width'),'Reset restores vanilla width');
                check(input.value==='1250','Reset refreshes numeric value');
                commit(1900);editing=true;alignment='center';window.__HS_renderHeaderLayout();await sleep();equalSpacing();
                const point=(x,y)=>header.dispatchEvent(new PointerEvent('pointerup',{bubbles:true,clientX:x,clientY:y}));
                let target=grid.firstElementChild.getBoundingClientRect();
                point(target.right-1,target.top+16);
                check(window.__HS_canJoinHeaderButtons(layout.regions.headerGrid[0],'d')===true,'a new button fits the group');
                check(window.__HS_moveHeaderButton(layout,'d','headerGrid',{index:0,join:true})===true,'insert using real buttons');
                check(layout.regions.headerGrid[0].join(',')==='a,b,c,d','drop appends without swapping a hidden position');
                check(layout.regions.headerGrid[1].join(',')==='e,f,g,h','drop removes the old copy');
                window.__HS_renderHeaderLayout();target=grid.firstElementChild.getBoundingClientRect();point(target.left+1,target.top+16);
                check(window.__HS_moveHeaderButton(layout,'d','headerGrid',{index:0,join:true})===true,'reorder within a group');
                check(layout.regions.headerGrid[0].join(',')==='d,a,b,c','the pointer determines insertion order');
                window.__HS_renderHeaderLayout();
                for(const id of layout.regions.headerGrid[0])document.getElementById(id).style.width='80px';
                const saved=JSON.stringify(layout);
                check(window.__HS_canJoinHeaderButtons(layout.regions.headerGrid[0],'e')===false,'reject a button that does not fit');
                check(window.__HS_moveHeaderButton(layout,'e','headerGrid',{index:0,join:true})===false,'full group is not changed');
                check(JSON.stringify(layout)===saved,'failed join preserves the layout');
                document.getElementById('result').textContent='PASS header preview, alignment, button insertion, capacity, wrapping and width controls';
            })().catch(error=>document.getElementById('result').textContent='FAIL '+error.stack);
            </script></body></html>`);
        const run = spawnSync(browser, ['--headless', '--disable-gpu', '--no-sandbox', '--no-first-run', '--no-default-browser-check',
            '--disable-background-networking', `--user-data-dir=${path.join(directory, 'profile')}`, '--virtual-time-budget=4000',
            '--dump-dom', pathToFileURL(file).href], {encoding:'utf8',timeout:25000,windowsHide:true,maxBuffer:2e6});
        if (run.error) throw run.error;
        const report = run.stdout.match(/<pre id="result">([\s\S]*?)<\/pre>/)?.[1];
        assert.ok(report?.startsWith('PASS '), report || run.stderr || 'Browser did not return a test result');
        console.log(report);
    } finally {
        // This unique test directory contains only our HTML and disposable browser profile.
        const resolved = path.resolve(directory);
        assert.equal(path.dirname(resolved), path.resolve(os.tmpdir()));
        assert.ok(path.basename(resolved).startsWith('hs-header-layout-'));
        fs.rmSync(resolved, {recursive:true,force:true,maxRetries:5,retryDelay:200});
    }
}
main().catch(error=>{console.error(error);process.exitCode=1});
