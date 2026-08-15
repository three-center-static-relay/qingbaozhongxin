import assert from "node:assert/strict";
const BASES=["https://intelligence-worker.a15280020511.workers.dev","https://intelligence-worker-zhabgjie16855.a15280020511.workers.dev"];
const TIMEOUT_MS=90000,PROBE_REV=10;
async function request(url,init={}){const c=new AbortController(),t=setTimeout(()=>c.abort(),TIMEOUT_MS);try{const r=await fetch(url,{...init,signal:c.signal});let j=null;try{j=await r.json()}catch{}return{r,j}}finally{clearTimeout(t)}}
async function findBase(){for(const base of BASES){try{const x=await request(`${base}/health`);if(x.r.ok&&x.j?.ok&&x.j?.service==="intelligence-worker")return base}catch{}}throw new Error("INTELLIGENCE_WORKER_NOT_REACHABLE")}
const base=await findBase(),provider="base",operation="search";
const rd=await request(`${base}/v1/provider/${provider}/readiness`);assert.equal(rd.r.status,200,`readiness http=${rd.r.status}`);assert.equal(rd.j?.configured,true,`${provider} configured=false`);
const op=await request(`${base}/v1/provider/${provider}/operations`);assert.equal(op.r.status,200);assert.ok(Array.isArray(op.j?.operations)&&op.j.operations.includes(operation),`${operation} not exposed`);
const task_id=`diag-${provider}-${Date.now()}-${crypto.randomUUID()}`;const x=await request(`${base}/v1/run`,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({task_id,provider,operation,timeout_seconds:70,args:{query:"artificial intelligence medicine",limit:2}})});
assert.equal(x.r.status,200,`${provider}.${operation} status=${x.r.status} error=${x.j?.error||"none"} details=${JSON.stringify(x.j?.details||null)}`);assert.equal(x.j?.ok,true,`${provider}.${operation} ok=false`);assert.ok(Array.isArray(x.j?.result?.items),"no items array");
console.log(JSON.stringify({ok:true,provider,operation,classification:"PRODUCTION_E2E_PASS",item_count:x.j.result.items.length,total:x.j?.result?.total??null,base,probe_rev:PROBE_REV}));
