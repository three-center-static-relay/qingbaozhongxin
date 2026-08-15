import assert from "node:assert/strict";
const BASES=["https://intelligence-worker.a15280020511.workers.dev","https://intelligence-worker-zhabgjie16855.a15280020511.workers.dev"];
const TIMEOUT_MS=90000;
async function request(url,init={}){const c=new AbortController(),t=setTimeout(()=>c.abort(),TIMEOUT_MS);try{const r=await fetch(url,{...init,signal:c.signal});let j=null;try{j=await r.json()}catch{}return{r,j}}finally{clearTimeout(t)}}
async function findBase(){for(const base of BASES){try{const x=await request(`${base}/health`);if(x.r.ok&&x.j?.ok&&x.j?.service==="intelligence-worker")return base}catch{}}throw new Error("INTELLIGENCE_WORKER_NOT_REACHABLE")}
const base=await findBase(),provider="pkulaw";
const rd=await request(`${base}/v1/provider/${provider}/readiness`);
assert.equal(rd.r.status,200);assert.equal(rd.j?.configured,true,"pkulaw readiness false");
const task_id=`diag-pkulaw-auth-${Date.now()}-${crypto.randomUUID()}`;
const x=await request(`${base}/v1/run`,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({task_id,provider,operation:"page_info",timeout_seconds:70,args:{path:"https://www.pkulaw.com/"}})});
assert.equal(x.j?.error,"UPSTREAM_HTTP_ERROR",`unexpected error=${x.j?.error||"none"} worker_status=${x.r.status}`);
const hs=Number(x.j?.details?.http_status);
assert.ok([401,403].includes(hs),`expected BrowserFabric auth 401/403, got upstream_http_status=${hs} worker_status=${x.r.status}`);
console.log(JSON.stringify({ok:true,provider,classification:"BROWSERFABRIC_AUTH_401_403",upstream_http_status:hs,base}));
