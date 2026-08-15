import assert from "node:assert/strict";
const BASES=["https://intelligence-worker.a15280020511.workers.dev","https://intelligence-worker-zhabgjie16855.a15280020511.workers.dev"];
const TIMEOUT_MS=18000;
async function req(url,init={}){const c=new AbortController(),t=setTimeout(()=>c.abort(),TIMEOUT_MS);try{return await fetch(url,{...init,signal:c.signal})}finally{clearTimeout(t)}}
async function json(url,init={}){const r=await req(url,init);let body=null;try{body=await r.json()}catch{}return{r,body}}
async function base(){for(const b of BASES){try{const {r,body}=await json(`${b}/health`);if(r.status===200&&body?.ok===true&&body?.service==="intelligence-worker")return b}catch{}}throw new Error("INTELLIGENCE_WORKER_NOT_REACHABLE")}
const b=await base();
const ready=await json(`${b}/v1/provider/baidu_maps/readiness`);
assert.equal(ready.r.status,200,"baidu readiness endpoint");
assert.equal(ready.body?.configured,true,"BAIDU_MAP_AK / BAIDU_MAP_API_KEY not visible to production Worker");
console.log(JSON.stringify({ok:true,stage:"baidu-readiness",base:b,configured:true}));
