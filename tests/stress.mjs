import assert from "node:assert/strict";
import { createTestHarness } from "wrangler";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";

let holdMode=false, enteredResolve=()=>{}, releaseResolve=()=>{}, entered=Promise.resolve(), release=Promise.resolve();
function armHold(){
  holdMode=true;
  entered=new Promise(r=>{enteredResolve=r});
  release=new Promise(r=>{releaseResolve=r});
}
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

async function post(path,body){
  const r=await server.fetch(path,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(body)});
  return{status:r.status,body:await r.json().catch(()=>null)};
}
async function run(id,indicator="SP.POP.TOTL"){return post("/v1/run",{task_id:id,provider:"worldbank",operation:"indicator",timeout_seconds:60,args:{country:"CHN",indicator,date:"2023",limit:1}})}
async function reset(){await server.reset();holdMode=false;enteredResolve=()=>{};releaseResolve=()=>{};entered=Promise.resolve();release=Promise.resolve()}

try{
  await server.listen();

  // 1) One active task must exclude all concurrent unique contenders.
  await reset();armHold();
  const first=run("load-holder");await entered;
  const contenders=await Promise.all(Array.from({length:64},(_,i)=>run(`load-contender-${i}`)));
  assert.equal(contenders.filter(x=>x.status===409&&x.body?.error==="BUSY").length,64,"all concurrent unique contenders must be BUSY");
  letGo();assert.equal((await first).status,200);

  // 2) Same task_id cannot re-enter while active.
  await reset();armHold();
  const dupFirst=run("duplicate-id");await entered;
  const dup=await Promise.all(Array.from({length:64},()=>run("duplicate-id")));
  assert.equal(dup.filter(x=>x.status===409&&["DUPLICATE_TASK","BUSY"].includes(x.body?.error)).length,64,"duplicate task_id must never execute twice");
  letGo();assert.equal((await dupFirst).status,200);

  // 3) Cancellation must discard the upstream result and release the lock.
  await reset();armHold();
  const cancelRun=run("cancel-id");await entered;
  const cancel=await post("/v1/cancel",{task_id:"cancel-id"});assert.equal(cancel.status,202);
  letGo();const cancelled=await cancelRun;assert.equal(cancelled.status,409);assert.equal(cancelled.body?.error,"CANCELLED");
  assert.equal((await run("after-cancel")).status,200,"lock must be reusable after cancellation terminal path");

  // 4) Upstream failure must fail closed and release the lock.
  await reset();
  const failed=await run("upstream-fail","FAIL.X");assert.equal(failed.status,502);assert.equal(failed.body?.error,"UPSTREAM_HTTP_ERROR");
  assert.equal((await run("after-failure")).status,200,"lock must be reusable after upstream failure");

  // 5) Unknown operation and oversized body are rejected before live execution.
  await reset();
  const denied=await post("/v1/run",{task_id:"bad-op",provider:"worldbank",operation:"arbitrary_fetch",args:{}});assert.equal(denied.status,403);assert.equal(denied.body?.error,"POLICY_DENIED");
  const huge={task_id:"huge",provider:"worldbank",operation:"indicator",args:{country:"CHN",indicator:"SP.POP.TOTL",padding:"x".repeat(70000)}};
  const hr=await server.fetch("/v1/run",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(huge)});assert.equal(hr.status,413);

  // 6) Rate limiter under burst load: exactly the configured 300 pass the budget gate.
  await reset();
  const burst=await Promise.all(Array.from({length:320},(_,i)=>post("/v1/run",{task_id:`rate-${i}`,provider:"no_such_provider",operation:"x"})));
  assert.equal(burst.filter(x=>x.status===429&&x.body?.error==="RATE_LIMITED").length,20,"rate limiter must reject requests above 300/min test budget");

  // 7) Read-only health path remains responsive under a parallel burst.
  const health=await Promise.all(Array.from({length:256},()=>server.fetch("/health")));
  assert.equal(health.filter(r=>r.status===200).length,256,"health burst must stay fully responsive");

  console.log(JSON.stringify({ok:true,suite:"intelligence-stress",concurrency_contenders:64,duplicate_contenders:64,rate_burst:320,health_burst:256,tests:["single-lock","duplicate-id","cancel-release","failure-release","policy-deny","body-limit","rate-limit","read-burst"]}));
}catch(e){
  try{server.debug()}catch{}
  console.error(e);
  process.exitCode=1;
}finally{
  await server.close().catch(()=>{});
  network.close();
}
