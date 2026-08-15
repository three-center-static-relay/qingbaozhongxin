import assert from "node:assert/strict";

const BASES=[
  "https://intelligence-worker.a15280020511.workers.dev",
  "https://intelligence-worker-zhabgjie16855.a15280020511.workers.dev"
];
const TIMEOUT_MS=12000;
async function request(url,init={}){const c=new AbortController(),t=setTimeout(()=>c.abort(),TIMEOUT_MS);try{return await fetch(url,{...init,signal:c.signal})}finally{clearTimeout(t)}}
async function json(url,init={}){const r=await request(url,init);let body=null;try{body=await r.json()}catch{}return{r,body}}
async function findBase(){for(const base of BASES){try{const {r,body}=await json(`${base}/health`);if(r.status===200&&body?.ok===true&&body?.service==="intelligence-worker")return base}catch{}}throw new Error("INTELLIGENCE_WORKER_NOT_REACHABLE")}
const base=await findBase();
const ready=await json(`${base}/v1/provider/tencent_maps/readiness`);
assert.equal(ready.r.status,200,"tencent_maps readiness endpoint");
assert.equal(ready.body?.configured,true,"Tencent key not visible to production runtime");
const bigReady=await json(`${base}/v1/provider/tencent_location_bigdata/readiness`);
assert.equal(bigReady.r.status,200,"tencent_location_bigdata readiness endpoint");
assert.equal(bigReady.body?.configured,true,"Tencent key not visible to big-data provider");
const task=`tencent-map-smoke-${Date.now()}`;
const geo=await json(`${base}/v1/run`,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({task_id:task,provider:"tencent_maps",operation:"geocode",timeout_seconds:30,args:{address:"福州市鼓楼区",region:"福州市"}})});
assert.equal(geo.r.status,200,`Tencent geocode failed: ${geo.body?.error||geo.r.status}`);
assert.equal(geo.body?.ok,true,"Tencent geocode did not return ok");
console.log(JSON.stringify({ok:true,stage:"tencent-map-runtime",base,readiness:true,geocode:true}));
