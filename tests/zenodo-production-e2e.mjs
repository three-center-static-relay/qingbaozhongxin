import assert from "node:assert/strict";

const BASE="https://intelligence-worker.a15280020511.workers.dev";
const timeoutMs=25000;

async function call(path){
  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(),timeoutMs);
  try{
    const response=await fetch(`${BASE}${path}`,{signal:controller.signal,headers:{accept:"application/json"}});
    const body=await response.json().catch(()=>null);
    return{http_status:response.status,body};
  }finally{clearTimeout(timer)}
}

const health=await call("/health");
assert.equal(health.http_status,200,"production health must return HTTP 200");
assert.equal(health.body?.ok,true,"production health must be ok");
assert.equal(health.body?.service,"intelligence-worker","must reach the intended production Worker");

console.log(JSON.stringify({ok:true,production_health_e2e:true,http_status:health.http_status,service:health.body.service,catalog_version:health.body.catalog_version||null}));
