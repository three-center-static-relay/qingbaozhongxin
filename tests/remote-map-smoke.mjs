import assert from "node:assert/strict";
const BASES=["https://intelligence-worker.a15280020511.workers.dev","https://intelligence-worker-zhabgjie16855.a15280020511.workers.dev"];
const TIMEOUT_MS=18000;
async function request(url,init={}){const c=new AbortController(),t=setTimeout(()=>c.abort(),TIMEOUT_MS);try{return await fetch(url,{...init,signal:c.signal})}finally{clearTimeout(t)}}
async function json(url,init={}){const r=await request(url,init);let body=null;try{body=await r.json()}catch{}return{r,body}}
async function findBase(){for(const base of BASES){try{const {r,body}=await json(`${base}/health`);if(r.status===200&&body?.ok===true&&body?.service==="intelligence-worker")return base}catch{}}throw new Error("INTELLIGENCE_WORKER_NOT_REACHABLE")}
async function run(base,provider,operation,args){const task_id=`smoke-${provider}-${Date.now()}-${Math.random().toString(16).slice(2)}`;return json(`${base}/v1/run`,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({task_id,provider,operation,timeout_seconds:30,args})})}
const base=await findBase();
const ready=await json(`${base}/v1/provider/baidu_maps/readiness`);assert.equal(ready.r.status,200,"baidu_maps readiness endpoint");assert.equal(ready.body?.configured,true,"Baidu Maps key not visible to production runtime");
const baidu=await run(base,"baidu_maps","geocode",{address:"福州市鼓楼区",city:"福州市"});assert.equal(baidu.r.status,200,`Baidu geocode failed: ${baidu.body?.error||baidu.r.status}`);assert.equal(baidu.body?.ok,true,"Baidu geocode did not return ok");
console.log(JSON.stringify({ok:true,stage:"baidu-runtime",base,baidu:true}));
