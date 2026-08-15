import assert from "node:assert/strict";
const BASES=["https://intelligence-worker.a15280020511.workers.dev","https://intelligence-worker-zhabgjie16855.a15280020511.workers.dev"];
const TIMEOUT_MS=60000;
async function request(url){const c=new AbortController(),t=setTimeout(()=>c.abort(),TIMEOUT_MS);try{const r=await fetch(url,{signal:c.signal});let j=null;try{j=await r.json()}catch{}return{r,j}}finally{clearTimeout(t)}}
async function findBase(){for(const b of BASES){try{const {r,j}=await request(`${b}/health`);if(r.ok&&j?.ok&&j?.service==="intelligence-worker")return b}catch{}}throw new Error("INTELLIGENCE_WORKER_NOT_REACHABLE")}
const base=await findBase();const rd=await request(`${base}/v1/provider/pkulaw/readiness`);assert.equal(rd.r.status,200);assert.equal(rd.j?.configured,false,"pkulaw credentials are configured; failure is BrowserFabric/context/upstream, not missing secrets");console.log(JSON.stringify({ok:true,classification:"PKULAW_NOT_CONFIGURED"}));
