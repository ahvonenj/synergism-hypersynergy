const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const vm = require('node:vm');
const esbuild = require('esbuild');
const heaterWorkerPlugin = require('../heater-worker-plugin.cjs');

async function main() {
    const directory=fs.mkdtempSync(path.join(os.tmpdir(),'hs-worker-watch-'));
    let context;
    let pending;
    let timer;
    try {
        const shared=path.join(directory,'shared.ts'),worker=path.join(directory,'worker.ts'),main=path.join(directory,'main.ts');
        fs.writeFileSync(shared,'export const value=11;');
        fs.writeFileSync(worker,"import {value} from './shared';self.postMessage({value});");
        fs.writeFileSync(main,"export {default} from 'hs-heater-worker-source';");
        const nextBuild=()=>new Promise((resolve,reject)=>{
            pending={resolve,reject};timer=setTimeout(()=>reject(new Error('Worker source did not rebuild after its input changed')),5000);
        });
        context=await esbuild.context({
            absWorkingDir:directory,entryPoints:[main],bundle:true,write:false,format:'cjs',platform:'node',logLevel:'silent',
            plugins:[heaterWorkerPlugin({entryPoint:worker}),{name:'observe-build',setup(build){
                build.onEnd(result=>{
                    if(!pending)return;
                    clearTimeout(timer);
                    const waiter=pending;pending=undefined;
                    try {
                        if(result.errors.length)throw new Error(result.errors[0].text);
                        const outer={module:{exports:{}}};
                        vm.runInNewContext(result.outputFiles[0].text,outer);
                        let message;
                        vm.runInNewContext(outer.module.exports.default,{self:{postMessage:value=>{message=value}}});
                        waiter.resolve(JSON.parse(JSON.stringify(message)));
                    } catch(error) {waiter.reject(error)}
                });
            }}],
        });
        let built=nextBuild();await context.watch();
        assert.deepEqual(await built,{value:11});
        built=nextBuild();fs.writeFileSync(shared,'export const value=222;');
        assert.deepEqual(await built,{value:222},'changes to imported optimizer code rebuild the embedded worker');
        built=nextBuild();fs.writeFileSync(worker,"import {value} from './shared';self.postMessage({value,stages:[]});");
        assert.deepEqual(await built,{value:222,stages:[]},'worker protocol changes reach the main bundle');
        console.log('Passed worker watch checks: imported code and worker protocol refresh in the embedded source.');
    } finally {
        clearTimeout(timer);
        await context?.dispose();
        const resolved=path.resolve(directory);
        assert.equal(path.dirname(resolved),path.resolve(os.tmpdir()));
        assert.ok(path.basename(resolved).startsWith('hs-worker-watch-'));
        fs.rmSync(resolved,{recursive:true,force:true,maxRetries:5,retryDelay:200});
    }
}
main().catch(error=>{console.error(error);process.exitCode=1});
