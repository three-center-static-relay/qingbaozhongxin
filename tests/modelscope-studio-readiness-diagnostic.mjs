import assert from "node:assert/strict";

const url="https://compute-worker.a15280020511.workers.dev/v1/selftest/modelscope-studio";
const controller=new AbortController();
const timer=setTimeout(()=>controller.abort(),30000);
try{
  const r=await fetch(url,{headers:{accept:"application/json"},signal:controller.signal});
  const body=await r.json().catch(()=>null);
  assert.equal(body?.selftest,"modelscope-studio-cpu",`Unexpected response HTTP ${r.status}: ${JSON.stringify(body)}`);
  assert.equal(body?.configured,true);
  assert.equal(body?.authenticated,true);
  assert.equal(body?.free_only,true);
  assert.equal(body?.paid_fallback,false);
  console.log(JSON.stringify({ok:true,suite:"modelscope-studio-auth-only-diagnostic",http_status:r.status,configured:true,authenticated:true,candidate_present:Boolean(body?.free_cpu_candidate),studio_found:body?.studio_found===true,runtime_e2e_verified:body?.runtime_e2e_verified===true,error_class:body?.error_class||null,free_only:true,paid_fallback:false,secrets_redacted:true}));
}finally{clearTimeout(timer)}
