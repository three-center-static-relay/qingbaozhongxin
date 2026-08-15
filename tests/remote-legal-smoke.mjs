import assert from "node:assert/strict";
const BASES=["https://intelligence-worker.a15280020511.workers.dev","https://intelligence-worker-zhabgjie16855.a15280020511.workers.dev"];
const TIMEOUT_MS=90000;
async function request(url,init={}){const c=new AbortController(),t=setTimeout(()=>c.abort(),TIMEOUT_MS);try{const r=await fetch(url,{...init,signal:c.signal});let j=null;try{j=await r.json()}catch{}return{r,j}}finally{clearTimeout(t)}}
async function findBase(){for(const b of BASES){try{const {r,j}=await request(`${b}/health`);if(r.ok&&j?.ok&&j?.service==="intelligence-worker")return b}catch{}}throw new Error("INTELLIGENCE_WORKER_NOT_REACHABLE")}
const base=await findBase();
const rd=await request(`${base}/v1/provider/pkulaw/readiness`);assert.equal(rd.r.status,200);assert.equal(rd.j?.configured,true,"pkulaw runtime credentials missing");
const task_id=`smoke-pkulaw-${Date.now()}`;const x=await request(`${base}/v1/run`,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({task_id,provider:"pkulaw",operation:"page_info",timeout_seconds:70,args:{path:"https://www.pkulaw.com/"}})});
assert.equal(x.r.ok&&x.j?.ok===true,true,`pkulaw failed http=${x.r.status} error=${x.j?.error||"none"}`);
console.log(JSON.stringify({ok:true,provider:"pkulaw"}));
