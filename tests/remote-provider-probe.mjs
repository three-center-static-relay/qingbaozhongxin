import assert from "node:assert/strict";
const BASES=["https://intelligence-worker.a15280020511.workers.dev","https://intelligence-worker-zhabgjie16855.a15280020511.workers.dev"];
const TIMEOUT_MS=90000,PROBE_REV=18;
async function request(url,init={}){const c=new AbortController(),t=setTimeout(()=>c.abort(),TIMEOUT_MS);try{const r=await fetch(url,{...init,signal:c.signal});let j=null;try{j=await r.json()}catch{}return{r,j}}finally{clearTimeout(t)}}
async function findBase(){for(const base of BASES){try{const x=await request(`${base}/health`);if(x.r.ok&&x.j?.ok&&x.j?.service==="intelligence-worker")return base}catch{}}throw new Error("INTELLIGENCE_WORKER_NOT_REACHABLE")}
const base=await findBase(),provider="youtube";const rd=await request(`${base}/v1/provider/${provider}/readiness`);assert.equal(rd.r.status,200);assert.equal(rd.j?.configured,true,`${provider} readiness false`);
const task_id=`diag-${provider}-${Date.now()}-${crypto.randomUUID()}`;const x=await request(`${base}/v1/run`,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({task_id,provider,operation:"popular",timeout_seconds:70,args:{region_code:"US",limit:1}})});
assert.equal(x.r.status,200,`${provider}.popular status=${x.r.status} error=${x.j?.error||"none"}`);assert.equal(x.j?.ok,true,`${provider}.popular ok=false error=${x.j?.error||"none"}`);assert.ok(Array.isArray(x.j?.result?.items)&&x.j.result.items.length>0,`${provider}.popular returned no items`);
console.log(JSON.stringify({ok:true,provider,operation:"popular",classification:"PRODUCTION_E2E_PASS",base,probe_rev:PROBE_REV}));
