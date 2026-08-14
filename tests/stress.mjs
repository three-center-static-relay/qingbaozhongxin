import assert from "node:assert/strict";
import { createTestHarness } from "wrangler";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";

const HARD_TIMEOUT_MS=45000;
const watchdog=setTimeout(()=>{console.error("STRESS_WATCHDOG_TIMEOUT");process.exit(124)},HARD_TIMEOUT_MS);
const within=(p,ms,label)=>Promise.race([p,new Promise((_,rej)=>setTimeout(()=>rej(new Error(`TIMEOUT:${label}`)),ms))]);
let holdMode=false, enteredResolve=()=>{}, releaseResolve=()=>{}, entered=Promise.resolve(), release=Promise.resolve();
function armHold(){holdMode=true;entered=new Promise(r=>{enteredResolve=r});release=new Promise(r=>{releaseResolve=r})}
function letGo(){holdMode=false;releaseResolve()}
const network=setupServer(
  http.get("https://api.worldbank.org/v2/country/:country/indicator/:indicator",async({params})=>{
    if(String(params.indicator)==="FAIL.X")return HttpResponse.json({error:"synthetic-upstream-failure"},{status:500});
    if(holdMode){enteredResolve();await release}
    return HttpResponse.json([{page:1,pages:1,total:1},[{country:{id:"CN",value:"China"},indicator:{id:String(params.indicator)},date:"2023",value:1}]])
  })
);
network.listen({onUnhandledRequest:"error"});
const server=createTestHarness({workers:[{configPath:"./wrangler.test.jsonc"}]});
async function post(path,body){const r=await server.fetch(path,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(body)});return{status:r.status,body:await r.json().catch(()=>null)}}
async function run(id,indicator="SP.POP.TOTL"){return post("/v1/run",{task_id:id,provider:"worldbank",operation:"indicator",timeout_seconds:60,args:{country:"CHN",indicator,date:"2023",limit:1}})}
async function reset(){await within(server.reset(),5000,"reset");holdMode=false;enteredResolve=()=>{};releaseResolve=()=>{};entered=Promise.resolve();release=Promise.resolve()}
let exitCode=0;
try{
  await within(server.listen(),10000,"listen");
  await reset();armHold();const first=run("load-holder");await within(entered,5000,"first-upstream-entry");const contenders=await within(Promise.all(Array.from({length:64},(_,i)=>run(`load-contender-${i}`))),10000,"unique-contenders");assert.equal(contenders.filter(x=>x.status===409&&x.body?.error==="BUSY").length,64);letGo();assert.equal((await within(first,5000,"first-finish")).status,200);
  await reset();armHold();const dupFirst=run("duplicate-id");await within(entered,5000,"dup-upstream-entry");const dup=await within(Promise.all(Array.from({length:64},()=>run("duplicate-id"))),10000,"duplicate-contenders");assert.equal(dup.filter(x=>x.status===409&&["DUPLICATE_TASK","BUSY"].includes(x.body?.error)).length,64);letGo();assert.equal((await within(dupFirst,5000,"dup-first-finish")).status,200);
  await reset();armHold();const cancelRun=run("cancel-id");await within(entered,5000,"cancel-upstream-entry");const cancel=await post("/v1/cancel",{task_id:"cancel-id"});assert.equal(cancel.status,202);letGo();const cancelled=await within(cancelRun,5000,"cancel-finish");assert.equal(cancelled.status,409);assert.equal(cancelled.body?.error,"CANCELLED");assert.equal((await run("after-cancel")).status,200);
  await reset();const failed=await run("upstream-fail","FAIL.X");assert.equal(failed.status,502);assert.equal(failed.body?.error,"UPSTREAM_HTTP_ERROR");assert.equal((await run("after-failure")).status,200);
  await reset();const denied=await post("/v1/run",{task_id:"bad-op",provider:"worldbank",operation:"arbitrary_fetch",args:{}});assert.equal(denied.status,403);assert.equal(denied.body?.error,"POLICY_DENIED");const huge={task_id:"huge",provider:"worldbank",operation:"indicator",args:{country:"CHN",indicator:"SP.POP.TOTL",padding:"x".repeat(70000)}};const hr=await server.fetch("/v1/run",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(huge)});assert.equal(hr.status,413);
  await reset();const burst=await within(Promise.all(Array.from({length:320},(_,i)=>post("/v1/run",{task_id:`rate-${i}`,provider:"no_such_provider",operation:"x"}))),15000,"rate-burst");assert.equal(burst.filter(x=>x.status===429&&x.body?.error==="RATE_LIMITED").length,20);
  const health=await within(Promise.all(Array.from({length:256},()=>server.fetch("/health"))),10000,"health-burst");assert.equal(health.filter(r=>r.status===200).length,256);
  console.log(JSON.stringify({ok:true,suite:"intelligence-stress",concurrency_contenders:64,duplicate_contenders:64,rate_burst:320,health_burst:256,tests:["single-lock","duplicate-id","cancel-release","failure-release","policy-deny","body-limit","rate-limit","read-burst"]}));
}catch(e){exitCode=1;try{server.debug()}catch{}console.error(e)}
try{await Promise.race([server.close(),new Promise(r=>setTimeout(r,2000))])}catch{}
network.close();clearTimeout(watchdog);process.exit(exitCode);
