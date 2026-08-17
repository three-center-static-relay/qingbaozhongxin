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
  const s=body?.hardware_summary||{};
  assert.ok(Number(s?.all_count)>0,`No hardware rows parsed: ${JSON.stringify(body)}`);
  assert.ok(Number(s?.free_count)>0,`No explicitly-free hardware parsed: ${JSON.stringify(body)}`);
  assert.ok(Number(s?.eligible_count)>0,`No explicitly-free >=8CPU >=30GiB candidate: ${JSON.stringify(body)}`);
  const h=body?.free_cpu_candidate||s?.selected;
  assert.ok(h&&typeof h==="object",`No selected free CPU candidate: ${JSON.stringify(body)}`);
  assert.equal(h?.free,true);
  assert.ok(Number(h?.cpu)>=8,`Candidate CPU below 8: ${JSON.stringify(h)}`);
  assert.ok(Number(h?.memory_gb)>=30,`Candidate memory below 30 GiB: ${JSON.stringify(h)}`);
  assert.ok(String(h?.name||"").length>0,"Candidate hardware name required for Studio settings");
  console.log(JSON.stringify({ok:true,suite:"modelscope-studio-candidate-v3-diagnostic",http_status:r.status,hardware_summary:{all_count:Number(s.all_count),free_count:Number(s.free_count),eligible_count:Number(s.eligible_count)},candidate:{name:h.name,label:h.label||null,cpu:h.cpu,memory_gb:h.memory_gb,free:true},studio_found:body?.studio_found===true,runtime_e2e_verified:body?.runtime_e2e_verified===true,error_class:body?.error_class||null,free_only:true,paid_fallback:false,secrets_redacted:true}));
}finally{clearTimeout(timer)}
