import assert from "node:assert/strict";
const BASES=["https://intelligence-worker.a15280020511.workers.dev","https://intelligence-worker-zhabgjie16855.a15280020511.workers.dev"];
const TIMEOUT_MS=20000;
async function get(url){const c=new AbortController(),t=setTimeout(()=>c.abort(),TIMEOUT_MS);try{const r=await fetch(url,{signal:c.signal,headers:{accept:"application/json"}}),j=await r.json();return{r,j}}finally{clearTimeout(t)}}
async function find(){for(const b of BASES){try{const {r,j}=await get(`${b}/health`);if(r.ok&&j?.ok&&j?.service==="intelligence-worker")return b}catch{}}throw new Error("INTELLIGENCE_WORKER_NOT_REACHABLE")}
const b=await find();
for(const p of ["bigquery","earthengine"]){const {r,j}=await get(`${b}/v1/provider/${p}/readiness`);assert.equal(r.status,200,`${p} readiness endpoint`);assert.equal(j?.configured,true,`${p} cloud credentials not visible`)}
console.log(JSON.stringify({ok:true,stage:"google-cloud-readiness",providers:2}));
