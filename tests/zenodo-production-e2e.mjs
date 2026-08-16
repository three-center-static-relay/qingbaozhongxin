import assert from "node:assert/strict";

const BASE="https://intelligence-worker.a15280020511.workers.dev";
const timeoutMs=25000;

async function call(path,init={}){
  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(),timeoutMs);
  try{
    const response=await fetch(`${BASE}${path}`,{...init,signal:controller.signal,headers:{accept:"application/json",...(init.headers||{})}});
    const body=await response.json().catch(()=>null);
    return{http_status:response.status,body};
  }finally{clearTimeout(timer)}
}

const health=await call("/health");
assert.equal(health.http_status,200,"production health must return HTTP 200");
assert.equal(health.body?.ok,true,"production health must be ok");

const taskId=`zenodo-production-e2e-${Date.now()}-${Math.random().toString(36).slice(2,10)}`;
const result=await call("/v1/run",{
  method:"POST",
  headers:{"content-type":"application/json"},
  body:JSON.stringify({
    task_id:taskId,
    provider:"zenodo",
    operation:"search",
    timeout_seconds:30,
    args:{query:"climate",limit:1,page:1,sort:"bestmatch"}
  })
});

assert.equal(result.http_status,200,`Zenodo production E2E HTTP ${result.http_status}: ${result.body?.error||"unknown"}`);
assert.equal(result.body?.ok,true,"Zenodo production E2E must return ok=true");
assert.equal(result.body?.provider,"zenodo");
assert.equal(result.body?.operation,"search");
assert.ok(Array.isArray(result.body?.result?.items)&&result.body.result.items.length>0,"Zenodo production E2E must return non-empty real items");
assert.match(String(result.body?.result_digest||""),/^[a-f0-9]{64}$/,"Zenodo production E2E must return result digest");

console.log(JSON.stringify({ok:true,provider:"zenodo",production_e2e:true,http_status:result.http_status,item_count:result.body.result.items.length,result_digest:result.body.result_digest,secrets_redacted:true}));
