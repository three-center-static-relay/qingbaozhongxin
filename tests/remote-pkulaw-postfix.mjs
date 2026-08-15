import assert from "node:assert/strict";
const BASES=["https://intelligence-worker.a15280020511.workers.dev","https://intelligence-worker-zhabgjie16855.a15280020511.workers.dev"];
const TIMEOUT_MS=90000,PROBE_REV=3;
async function request(url,init={}){const c=new AbortController(),t=setTimeout(()=>c.abort(),TIMEOUT_MS);try{const r=await fetch(url,{...init,signal:c.signal});let j=null;try{j=await r.json()}catch{}return{r,j}}finally{clearTimeout(t)}}
async function findBase(){for(const base of BASES){try{const x=await request(`${base}/health`);if(x.r.ok&&x.j?.ok&&x.j?.service==="intelligence-worker")return base}catch{}}throw new Error("INTELLIGENCE_WORKER_NOT_REACHABLE")}
const base=await findBase(),provider="pkulaw";const rd=await request(`${base}/v1/provider/${provider}/readiness`);assert.equal(rd.r.status,200);assert.equal(rd.j?.configured,true);
const task_id=`diag-${provider}-${Date.now()}-${crypto.randomUUID()}`;const x=await request(`${base}/v1/run`,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({task_id,provider,operation:"page_info",timeout_seconds:70,args:{path:"https://www.pkulaw.com/"}})});
assert.equal(x.j?.error,"UPSTREAM_HTTP_ERROR",`unexpected error status=${x.r.status} error=${x.j?.error||"none"}`);
console.log(JSON.stringify({ok:true,provider,classification:"BROWSERFABRIC_HTTP_ERROR",upstream_http:x.j?.details?.http_status||null,probe_rev:PROBE_REV,base}));
