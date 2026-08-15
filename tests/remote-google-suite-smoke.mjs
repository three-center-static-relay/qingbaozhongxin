import assert from "node:assert/strict";
const BASES=["https://intelligence-worker.a15280020511.workers.dev","https://intelligence-worker-zhabgjie16855.a15280020511.workers.dev"];
const TIMEOUT_MS=120000;
async function req(url){const c=new AbortController(),t=setTimeout(()=>c.abort(),TIMEOUT_MS);try{return await fetch(url,{signal:c.signal,headers:{accept:"application/json"}})}finally{clearTimeout(t)}}
async function find(){for(const b of BASES){try{const r=await req(`${b}/health`),j=await r.json();if(r.ok&&j?.ok&&j?.service==="intelligence-worker")return b}catch{}}throw new Error("INTELLIGENCE_WORKER_NOT_REACHABLE")}
const b=await find();const r=await req(`${b}/v1/diag/google-suite-20260815-1504`),j=await r.json();assert.equal(r.status,200);
const x=j?.results?.find(v=>v.provider==="earthengine");assert.ok(x,"missing earthengine");assert.equal(x.configured,false,`earthengine is configured; failure is upstream/permission, not missing credentials`);assert.equal(x.status,"NOT_CONFIGURED");
console.log(JSON.stringify({ok:true,stage:"earthengine-not-configured"}));
