import base,{CenterGate as BaseCenterGate} from "./index.js";
const json=(x,s=200)=>Response.json(x,{status:s,headers:{"cache-control":"no-store"}});

// Harden the Durable Object gate so even the same task_id cannot re-enter while active.
// Durable Object requests are serialized, so this closes the last simultaneous duplicate-dispatch window.
export class CenterGate extends BaseCenterGate{
  constructor(state,env){super(state,env);this._state=state}
  async fetch(req){
    const u=new URL(req.url);
    if(req.method==="POST"&&u.pathname==="/acquire"){
      const a=await this._state.storage.get("active");
      if(a&&a.expires_at_ms<=Date.now())await this._state.storage.delete("active");
      else if(a)return json({ok:false,error:"BUSY",active:a,duplicate_reentry_blocked:true},409);
    }
    return super.fetch(req);
  }
}
function gate(env){return env.CENTER_GATE.get(env.CENTER_GATE.idFromName("global"))}
async function g(env,p,m="GET",b){const i={method:m,headers:{"content-type":"application/json"}};if(b!==undefined)i.body=JSON.stringify(b);const r=await gate(env).fetch(new Request(`https://gate.internal${p}`,i));return{http:r.status,...await r.json().catch(()=>({ok:false,error:"GATE_BAD_RESPONSE"}))}}
async function cancel(req,env){const b=await req.json().catch(()=>({})),id=String(b.task_id||"");if(!id)return json({ok:false,error:"INVALID_REQUEST",message:"task_id required"},400);const t=await g(env,`/task/${encodeURIComponent(id)}`);if(!t.task)return json({ok:false,error:"INVALID_REQUEST",message:"Task not found"},404);const r=await g(env,`/task/${encodeURIComponent(id)}/cancel`,"POST",{});return json({ok:r.ok,task:r.task||t.task,cancellation_pending:true,lock_retained:true,note:"Cancellation never releases the single-task lock before the execution path reaches a terminal state or the lease expires."},202)}
async function selftest(env,ctx){
  const taskId=`selftest-intelligence-${crypto.randomUUID()}`;
  const request=new Request("https://intelligence.internal/v1/run",{method:"POST",headers:{"content-type":"application/json","x-three-center-selftest":"1"},body:JSON.stringify({task_id:taskId,provider:"worldbank",operation:"indicator",timeout_seconds:30,args:{country:"CHN",indicator:"SP.POP.TOTL",date:"2023",limit:1}})});
  const started=Date.now();
  const r=await base.fetch(request,env,ctx),body=await r.json().catch(()=>null),items=body?.result?.items;
  const nonempty=Array.isArray(items)&&items.length>0,hasDigest=typeof body?.result_digest==="string"&&body.result_digest.length===64,task=await g(env,`/task/${encodeURIComponent(taskId)}`),terminal=task?.task?.status==="pass";
  const lock=await g(env,"/state"),released=!lock?.active;
  const ok=r.ok&&body?.ok===true&&nonempty&&hasDigest&&terminal&&released;
  return json({ok,business_e2e:true,cost_class:"public-zero-key",provider:"worldbank",operation:"indicator",task_id:taskId,http_status:r.status,nonempty,result_digest:hasDigest?body.result_digest:null,terminal_status:task?.task?.status||null,lock_released:released,elapsed_ms:Date.now()-started},ok?200:503);
}
async function readiness(provider,env,ctx){const r=await base.fetch(new Request(`https://intelligence.internal/v1/provider/${encodeURIComponent(provider)}/readiness`),env,ctx);const b=await r.json().catch(()=>null);return{http:r.status,configured:b?.configured===true,live_adapter:b?.live_adapter===true,operations:b?.operations||[]}}
async function probe(provider,operation,args,env,ctx){const ready=await readiness(provider,env,ctx);if(!ready.configured)return{provider,operation,status:"NOT_CONFIGURED",...ready};if(!ready.operations.includes(operation))return{provider,operation,status:"NO_LIVE_OPERATION",...ready};const taskId=`diag-google-${provider}-${crypto.randomUUID()}`;const req=new Request("https://intelligence.internal/v1/run",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({task_id:taskId,provider,operation,timeout_seconds:45,args})});const started=Date.now(),r=await base.fetch(req,env,ctx),b=await r.json().catch(()=>null);return{provider,operation,status:r.ok&&b?.ok===true?"PASS":"FAIL",configured:true,http:r.status,error:b?.error||null,message:b?.message||null,details:b?.details||null,elapsed_ms:Date.now()-started}}
async function googleSuite(env,ctx){
  const tests=[
    ["youtube","search",{query:"NASA",type:"video",limit:1}],
    ["google_books","search",{query:"China",limit:1}],
    ["google_factcheck","search",{query:"climate change",limit:1}],
    ["google_civic","elections",{}],
    ["google_knowledge_graph","search",{query:"Google",limit:1}],
    ["google_crux","record",{url:"https://www.google.com/",form_factor:"PHONE"}],
    ["google_pagespeed","analyze",{url:"https://www.google.com/",strategy:"mobile",categories:["PERFORMANCE"]}],
    ["bigquery","query",{query:"SELECT word, word_count FROM `bigquery-public-data.samples.shakespeare` LIMIT 1",maximum_bytes_billed:10000000}],
    ["earthengine","asset_get",{asset:"COPERNICUS/S2_SR_HARMONIZED"}]
  ];
  const results=[];for(const t of tests)results.push(await probe(t[0],t[1],t[2],env,ctx));
  const trends=await readiness("google_trends_alpha",env,ctx);
  results.push({provider:"google_trends_alpha",operation:null,status:trends.configured?"CATALOG_ONLY":"NOT_CONFIGURED",...trends});
  const pass=results.filter(x=>x.status==="PASS").length,fail=results.filter(x=>x.status==="FAIL").length,not_configured=results.filter(x=>x.status==="NOT_CONFIGURED").length;
  return json({ok:fail===0,diagnostic:"google-suite-20260815",pass,fail,not_configured,results},200)
}
export default{async fetch(req,env,ctx){try{const u=new URL(req.url);if(req.method==="POST"&&u.pathname==="/v1/cancel")return await cancel(req,env);if(req.method==="POST"&&u.pathname==="/v1/selftest"){if(u.hostname!=="intelligence.internal")return json({ok:false,error:"POLICY_DENIED",message:"selftest is service-binding internal only"},403);return await selftest(env,ctx)}if(req.method==="GET"&&u.pathname==="/v1/diag/google-suite-20260815-1504")return await googleSuite(env,ctx);return await base.fetch(req,env,ctx)}catch(e){return json({ok:false,error:e?.message||"INTERNAL_ERROR",message:"Request failed"},e?.status||500)}}};
