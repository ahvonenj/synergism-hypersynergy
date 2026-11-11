const assert = require('node:assert/strict');
const path = require('node:path');
const Module = require('node:module');
const esbuild = require('esbuild');

async function main() {
    const root = path.resolve(__dirname, '../..');
    const bundled = await esbuild.build({
        entryPoints:[path.join(root,'src/mod/class/hs-modules/hs-heater/hs-heater-optimizer-runner.ts')],
        bundle:true,write:false,platform:'node',format:'cjs',
        plugins:[{name:'heater-runner-boundary',setup(build){
            const stubs={
                'hs-heater-worker-source':'export default "test worker";',
                'hs-logger':`export const HSLogger={info(){},warn(){},error(){},debug(message){
                    if(globalThis.runnerTest.debug)globalThis.runnerTest.logs.push(typeof message==='function'?message():message)
                }};`,
                'hs-heater-optimizer':'export const HSHeaterOptimizer={};export const takeHeaterOptimizerLogs=()=>[];export const HEATER_ROW_LIMIT=500000;export const HEATER_ROW_LIMIT_TEXT="500000-row limit";',
            };
            build.onResolve({filter:/hs-[\w-]+$/},args=>{
                const name=args.path.split('/').pop();if(stubs[name])return{path:name,namespace:'test'};
            });
            build.onLoad({filter:/.*/,namespace:'test'},args=>({contents:stubs[args.path],loader:'ts'}));
        }}],
    });
    const input={heaterOptions:{oct:true,ambOct:true,hyperflux:true},runeSiExp:1,runeIaExp:1,
        runeIaBonusLevelsTotal:0,runeIaBonusLevelsTalisman:0,baseTalismanPower:1};
    const original={Worker:global.Worker,runnerTest:global.runnerTest};
    const originalNavigator=Object.getOwnPropertyDescriptor(global,'navigator');
    try {
        global.Worker=class {
            postMessage({id,input}) {
                global.runnerTest.started?.push(Object.keys(input.heaterOptions).filter(key=>input.heaterOptions[key]).join('+'));
                const result=Object.fromEntries(Object.keys(input.heaterOptions).filter(key=>input.heaterOptions[key]).map(key=>[key,[[key]]]));
                queueMicrotask(()=>this.onmessage({data:global.runnerTest.error
                    ?{id,ok:false,error:global.runnerTest.error,logs:[]}
                    :{id,ok:true,result,logs:[],...global.runnerTest.diagnostics}}));
            }
            terminate() {}
        };
        for(const debug of [true,false])for(const diagnostics of [{},{stages:[{name:'oct-search',elapsedMs:100}]}]) {
            global.runnerTest={debug,diagnostics,logs:[]};
            const runtime=new Module(path.join(root,'heater-runner-runtime.cjs'),module);
            runtime.filename=path.join(root,'heater-runner-runtime.cjs');runtime.paths=module.paths;
            runtime._compile(bundled.outputFiles[0].text,runtime.filename);
            const result=await runtime.exports.HSHeaterOptimizerRunner.createResult(input,undefined,3);
            for(const key of ['oct','ambOct','hyperflux'])assert.deepEqual(result[key],[[key]],'valid results survive missing stage times');
            assert.equal(global.runnerTest.logs.some(line=>line.includes('oct-search')),debug&&Boolean(diagnostics.stages));
        }
        global.runnerTest={debug:true,error:'real calculation failure',logs:[]};
        const runtime=new Module(path.join(root,'heater-error-runtime.cjs'),module);
        runtime.filename=path.join(root,'heater-error-runtime.cjs');runtime.paths=module.paths;
        runtime._compile(bundled.outputFiles[0].text,runtime.filename);
        await assert.rejects(runtime.exports.HSHeaterOptimizerRunner.createResult(input),error=>
            /real calculation failure/.test(error.message)&&!(error instanceof runtime.exports.HSHeaterRowLimitError));
        // The row limit names the failing group's branches by their input labels; the optimizer's text stays for the log
        global.runnerTest={debug:false,error:'Error: Heater cube table passed its 500000-row limit',logs:[]};
        await assert.rejects(runtime.exports.HSHeaterOptimizerRunner.createResult({...input,heaterOptions:{cubes:true,sr:true}}),error=>
            error instanceof runtime.exports.HSHeaterRowLimitError
            &&error.playerMessage==='Heater stopped: the 3-7D Cubes / Max SR search passed its 500,000-row limit.'
            &&error.message.includes('cube table'));

        // The lanes: which groups start together, and the fallback to one worker
        const allBranches={hyperflux:true,cubes:true,sr:true,oct:true,ambOct:true,coinsC15:true,luck:true,purple:true,quarks:true,obtOff:true,obtAndOff:false};
        const lanesOf=async(workers,heaterOptions,navigatorStub={deviceMemory:16,hardwareConcurrency:8})=>{
            global.runnerTest={debug:false,diagnostics:{},logs:[],started:[]};
            Object.defineProperty(global,'navigator',{value:navigatorStub,configurable:true,writable:true});
            const laneRuntime=new Module(path.join(root,'heater-lanes-runtime.cjs'),module);
            laneRuntime.filename=path.join(root,'heater-lanes-runtime.cjs');laneRuntime.paths=module.paths;
            laneRuntime._compile(bundled.outputFiles[0].text,laneRuntime.filename);
            const pending=laneRuntime.exports.HSHeaterOptimizerRunner.createResult({...input,heaterOptions},undefined,workers);
            // Every lane's first group has started before any worker can answer
            const firstStarted=[...global.runnerTest.started];
            const result=await pending;
            return {firstStarted,result,exports:laneRuntime.exports};
        };
        const first=async(...args)=>(await lanesOf(...args)).firstStarted;
        assert.deepEqual(await first(1,allBranches),['hyperflux']);
        assert.deepEqual(await first(2,allBranches),['hyperflux','oct+ambOct']);
        assert.deepEqual(await first(3,allBranches),['hyperflux','cubes+sr','quarks+obtOff']);
        // A lane left without a group starts no worker
        assert.deepEqual(await first(3,{...allBranches,quarks:false,obtOff:false}),['hyperflux','cubes+sr']);
        // Below the minimum PC: one worker, whichever count was picked
        assert.deepEqual(await first(3,allBranches,{deviceMemory:4,hardwareConcurrency:8}),['hyperflux']);
        assert.deepEqual(await first(3,allBranches,{deviceMemory:16,hardwareConcurrency:2}),['hyperflux']);
        // Unknown counts as enough
        assert.equal((await first(3,allBranches,{})).length,3);
        // Every group's result arrives at every count
        const every=(await lanesOf(3,allBranches));
        for(const key of ['hyperflux','cubes','sr','oct','ambOct','coinsC15','luck','purple','quarks','obtOff'])assert.deepEqual(every.result[key],[[key]]);
        // A saved value that isn't a known count counts as the default
        const {heaterWorkerCount}=every.exports;
        assert.deepEqual([1,2,3,0,4,'2',null,undefined,true].map(heaterWorkerCount),[1,2,3,3,3,3,3,3,3]);
        console.log('Passed Heater runner checks: missing/current diagnostics, debug on/off, parallel results, real failures, row limit, lanes and fallback.');
    } finally {
        if(originalNavigator)Object.defineProperty(global,'navigator',originalNavigator);else delete global.navigator;
        for(const [key,value]of Object.entries(original)){if(value===undefined)delete global[key];else global[key]=value}
    }
}
main().catch(error=>{console.error(error);process.exitCode=1});
