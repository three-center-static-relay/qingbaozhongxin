import assert from "node:assert/strict";
const BASES=["https://intelligence-worker.a15280020511.workers.dev","https://intelligence-worker-zhabgjie16855.a15280020511.workers.dev"];
const TIMEOUT_MS=20000;
async function req(url,init={}){const c=new AbortController(),t=setTimeout(()=>c.abort(),TIMEOUT_MS);try{return await fetch(url,{...init,signal:c.signal})}finally{clearTimeout(t)}}
async function json(url,init={}){const r=await req(url,init);let body=null;try{body=await r.json()}catch{}return{r,body}}
async function base(){for(const b of BASES){try{const {r,body}=await json(`${b}/health`);if(r.status===200&&body?.ok===true&&body?.service==="intelligence-worker")return b}catch{}}throw new Error("INTELLIGENCE_WORKER_NOT_REACHABLE")}
const b=await base();
const ready=await json(`${b}/v1/provider/baidu_maps/readiness`);
assert.equal(ready.r.status,200,"baidu readiness endpoint");
assert.equal(ready.body?.configured,true,"Baidu key not visible to production Worker");
const task_id=`smoke-baidu-${Date.now()}-${Math.random().toString(16).slice(2)}`;
const out=await json(`${b}/v1/run`,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({task_id,provider:"baidu_maps",operation:"geocode",timeout_seconds:30,args:{address:"福州市鼓楼区",city:"福州市"}})});
assert.equal(out.r.status,200,`Baidu geocode HTTP failed: ${out.body?.error||out.r.status}`);
assert.equal(out.body?.ok,true,`Baidu geocode task failed: ${out.body?.error||"unknown"}`);
assert.equal(Number(out.body?.result?.data?.status),0,"Baidu upstream business status is not 0");
const loc=out.body?.result?.data?.result?.location;
assert.equal(typeof loc?.lat,"number","Baidu result missing latitude");
assert.equal(typeof loc?.lng,"number","Baidu result missing longitude");
console.log(JSON.stringify({ok:true,stage:"baidu-live-geocode",base:b,lat:loc.lat,lng:loc.lng}));
