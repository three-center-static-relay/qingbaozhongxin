import assert from "node:assert/strict";
const BASES=["https://intelligence-worker.a15280020511.workers.dev","https://intelligence-worker-zhabgjie16855.a15280020511.workers.dev"];
const TIMEOUT_MS=90000;
async function request(url,init={}){const c=new AbortController(),t=setTimeout(()=>c.abort(),TIMEOUT_MS);try{const r=await fetch(url,{...init,signal:c.signal});let j=null;try{j=await r.json()}catch{}return{r,j}}finally{clearTimeout(t)}}
async function findBase(){for(const b of BASES){try{const {r,j}=await request(`${b}/health`);if(r.ok&&j?.ok&&j?.service==="intelligence-worker")return b}catch{}}throw new Error("INTELLIGENCE_WORKER_NOT_REACHABLE")}
const base=await findBase();const rd=await request(`${base}/v1/provider/google_trends_public/readiness`);assert.equal(rd.r.status,200);assert.equal(rd.j?.configured,true,"Google Cloud credentials missing");
const task_id=`diag-google-trends-${Date.now()}`;const x=await request(`${base}/v1/run`,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({task_id,provider:"google_trends_public",operation:"top_terms",timeout_seconds:70,args:{country_code:"CN",limit:3,maximum_bytes_billed:50000000}})});
assert.equal(x.r.ok&&x.j?.ok===true,false,"Google Trends unexpectedly passed");assert.equal(x.r.status,403,`not 403; http=${x.r.status} error=${x.j?.error||"none"}`);console.log(JSON.stringify({ok:true,classification:"HTTP_403"}));
