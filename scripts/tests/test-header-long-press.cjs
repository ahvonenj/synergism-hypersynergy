const assert = require('node:assert/strict');
const path = require('node:path');
const Module = require('node:module');
const esbuild = require('esbuild');
const {patchBundle} = require('../../synergism_modloader/lib/patcher');

async function main() {
    const root = path.resolve(__dirname, '../..');
    const stubs = {
        'hs-global': 'export const HSGlobal = {};',
        'hs-logger': 'export const HSLogger = {log(){},warn(){}};',
        'hs-ui': 'export const HSUI = {isModPanelOpen:()=>false};',
        'hs-settings': 'export const HSSettings = {};',
        'hs-header-cell-settings': 'export class HSHeaderCellSettings {}',
        'hs-header-challenge-module': 'export class HSHeaderChallengeModule {}',
        'hs-header-grid-width': 'export class HSHeaderGridWidth {}',
    };
    const bundled = await esbuild.build({
        entryPoints:[path.join(root,'src/mod/class/hs-core/header/hs-header-edit-settings.ts')],
        bundle:true,write:false,platform:'node',format:'cjs',
        plugins:[{name:'header-edit-boundary',setup(build){
            build.onResolve({filter:/hs-[\w-]+$/},args=>{
                const name=args.path.split('/').pop();
                if(stubs[name])return{path:name,namespace:'test'};
            });
            build.onResolve({filter:/^inline:/},()=>({path:'css',namespace:'test'}));
            build.onLoad({filter:/.*/,namespace:'test'},args=>({contents:stubs[args.path]??'export default "";',loader:'ts'}));
        }}],
    });
    const runtime=new Module(path.join(root,'header-hold-runtime.cjs'),module);
    runtime.filename=path.join(root,'header-hold-runtime.cjs');runtime.paths=module.paths;
    runtime._compile(bundled.outputFiles[0].text,runtime.filename);
    const source=`let editing=false,activePointer=null,holdTimer;
        const down=event=>{
            if(event.button!==0||!event.target.closest('.headerRegion'))return;
            activePointer=event.pointerId;
            if(editing){event.preventDefault();return}
            holdTimer=window.setTimeout(()=>{event.target.getBoundingClientRect();editing=true},650);
        };
        return{down,editing:()=>editing,active:()=>activePointer,exit:()=>{editing=false}};`;
    const code=patchBundle(source,{log(){},warn(){}});
    const original={window:global.window,document:global.document,PointerEvent:global.PointerEvent};
    try {
        const pending=[];
        global.window={setTimeout:callback=>(pending.push(callback),pending.length)};
        const game=Function('window',code)(window);
        assert.equal(window.__HS_PATCH_REPORT.headerLongPress,true);
        const region={closest:()=>region,getBoundingClientRect:()=>({left:0,top:0}),dispatchEvent(event){
            if(event.type==='pointerdown'){event.target=region;game.down(event)}
        }};
        global.PointerEvent=class {constructor(type,options){this.type=type;Object.assign(this,options)}preventDefault(){this.prevented=true}};
        const header={classList:{contains:()=>game.editing()},scrollIntoView(){}};
        global.document={getElementById:id=>id==='mainHeader'?header:id==='headerGrid'?region:{focus(){}}};
        const press=()=>{const event=new PointerEvent('pointerdown',{button:0,pointerId:9});region.dispatchEvent(event);return event};
        press();assert.equal(pending.length,1);pending.pop()();assert.equal(game.editing(),true);
        game.exit();window.__HS_headerLongPressEnabled=false;
        const disabled=press();assert.equal(pending.length,0);assert.equal(game.editing(),false);
        assert.equal(disabled.prevented,undefined,'normal pointer/click defaults are preserved');
        assert.equal(game.active(),9,'native pointer tracking still runs');
        const timer=window.setTimeout;
        await runtime.exports.HSHeaderEditSettings.openEditor(false);
        assert.equal(game.editing(),true,'explicit editor buttons bypass the long-press preference');
        assert.equal(window.__HS_headerLongPressEnabled,false,'the saved preference is restored');
        assert.equal(window.setTimeout,timer);
        assert.equal(press().prevented,true,'native dragging in edit mode remains available');
        game.exit();window.__HS_headerLongPressEnabled=true;
        press();assert.equal(pending.length,1);pending.pop()();assert.equal(game.editing(),true,'the option can be re-enabled');
        const missing=patchBundle(source.replace(".headerRegion",'.otherRegion'),{log(){},warn(){}});
        const unpatched={setTimeout:()=>1};Function('window',missing)(unpatched);
        assert.equal(unpatched.__HS_PATCH_REPORT.headerLongPress,false);
        console.log('Passed header long-press checks: enabled, disabled, explicit editor access, native editing, and re-enable.');
    } finally {
        for(const [key,value]of Object.entries(original)){if(value===undefined)delete global[key];else global[key]=value}
    }
}
main().catch(error=>{console.error(error);process.exitCode=1});
