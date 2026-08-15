import assert from "node:assert/strict";
const BASES=["https://intelligence-worker.a15280020511.workers.dev","https://intelligence-worker-zhabgjie16855.a15280020511.workers.dev"];
const TIMEOUT_MS=60000,PROBE_REV=5;
async function request(url){const c=new AbortController(),t=setTimeout(()=>c.abort(),TIMEOUT_MS);try{const r=await fetch(url,{signal:c.signal});let j=null;try{j=await r.json()}catch{}return{r,j}}finally{clearTimeout(t)}}
async function findBase(){for(const base of BASES){try{const x=await request(`${base}/health`);if(x.r.ok&&x.j?.ok&&x.j?.service==="intelligence-worker")return base}catch{}}throw new Error("INTELLIGENCE_WORKER_NOT_REACHABLE")}
const base=await findBase(),provider="pkulaw";const rd=await request(`${base}/v1/provider/${provider}/readiness`);
assert.equal(rd.r.status,200,`${provider} readiness route failed`);assert.equal(rd.j?.configured,false,`${provider} is configured; failure is downstream rather than missing runtime config`);
console.log(JSON.stringify({ok:true,provider,classification:"PRODUCTION_NOT_CONFIGURED",base,probe_rev:PROBE_REV}));
