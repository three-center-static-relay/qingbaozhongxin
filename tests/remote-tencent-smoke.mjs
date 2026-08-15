import assert from "node:assert/strict";

const BASES=[
  "https://intelligence-worker.a15280020511.workers.dev",
  "https://intelligence-worker-zhabgjie16855.a15280020511.workers.dev"
];
const TIMEOUT_MS=25000;
async function request(url,init={}){const c=new AbortController(),t=setTimeout(()=>c.abort(),TIMEOUT_MS);try{return await fetch(url,{...init,signal:c.signal})}finally{clearTimeout(t)}}
async function json(url,init={}){const r=await request(url,init);let body=null;try{body=await r.json()}catch{}return{r,body}}
async function findBase(){for(const base of BASES){try{const {r,body}=await json(`${base}/health`);if(r.status===200&&body?.ok===true&&body?.service==="intelligence-worker")return base}catch{}}throw new Error("INTELLIGENCE_WORKER_NOT_REACHABLE")}
const base=await findBase();
const diag=await json(`${base}/v1/diag/tencent-bigdata-20260815`);
assert.equal(diag.r.status,200,`Tencent big-data MCP connectivity failed: ${diag.body?.error||diag.r.status}`);
assert.equal(diag.body?.ok,true,"Tencent big-data diagnostic did not return ok");
console.log(JSON.stringify({ok:true,stage:"tencent-bigdata-connectivity",available_count:diag.body?.available_count??null}));
