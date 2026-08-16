import assert from "node:assert/strict";

const BASE="https://intelligence-worker.a15280020511.workers.dev";
const controller=new AbortController();
const timer=setTimeout(()=>controller.abort(),25000);
try{
  const response=await fetch(`${BASE}/health`,{signal:controller.signal,headers:{accept:"application/json"}});
  const body=await response.json().catch(()=>null);
  assert.equal(response.status,200,"production health must return HTTP 200");
  assert.equal(body?.ok,true,"production health must be ok");
  assert.equal(body?.service,"intelligence-worker");
  console.log(JSON.stringify({ok:true,production_health_e2e:true,service:body.service}));
}finally{clearTimeout(timer)}
