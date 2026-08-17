import assert from "node:assert/strict";

const BASE="https://intelligence-worker.a15280020511.workers.dev";
const timeoutMs=40000;
async function call(path,init={}){
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),timeoutMs);
  try{const response=await fetch(`${BASE}${path}`,{...init,signal:controller.signal,headers:{accept:"application/json",...(init.headers||{})}});const body=await response.json().catch(()=>null);return{http_status:response.status,body}}
  finally{clearTimeout(timer)}
}

const health=await call("/health");assert.equal(health.http_status,200,"production health must return HTTP 200");assert.equal(health.body?.ok,true,"production health must be ok");
const readiness=await call("/v1/provider/sciencedb/readiness");assert.equal(readiness.http_status,200,"ScienceDB readiness route must be live");assert.equal(readiness.body?.configured,true,"ScienceDB must be configured as public provider");assert.ok(readiness.body?.operations?.includes("list_records"),"ScienceDB list_records must be exposed");

const taskId=`sciencedb-oai-e2e-${Date.now()}-${Math.random().toString(36).slice(2,10)}`;
const result=await call("/v1/run",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({task_id:taskId,provider:"sciencedb",operation:"list_records",timeout_seconds:35,args:{limit:3}})});
assert.equal(result.http_status,200,`ScienceDB production E2E HTTP ${result.http_status}: ${result.body?.error||"unknown"}`);
assert.equal(result.body?.ok,true,"ScienceDB production E2E must return ok=true");assert.equal(result.body?.provider,"sciencedb");assert.equal(result.body?.operation,"list_records");
const items=result.body?.result?.items;assert.ok(Array.isArray(items)&&items.length>0,"ScienceDB OAI must return non-empty real metadata records");assert.ok(String(items[0]?.identifier||"").length>0,"ScienceDB first record must include OAI identifier");assert.ok(String(items[0]?.title||"").length>0,"ScienceDB first record must include title");assert.match(String(result.body?.result_digest||""),/^[a-f0-9]{64}$/,"ScienceDB must return SHA-256 result digest");
console.log(JSON.stringify({ok:true,provider:"sciencedb",operation:"list_records",production_e2e:true,http_status:result.http_status,item_count:items.length,first_identifier:items[0].identifier,first_title_present:true,result_digest:result.body.result_digest,secrets_redacted:true}));
