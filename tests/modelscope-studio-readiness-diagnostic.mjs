import assert from "node:assert/strict";

const url="https://compute-worker.a15280020511.workers.dev/v1/selftest/modelscope-studio";
const controller=new AbortController();
const hard=setTimeout(()=>{
  console.error(JSON.stringify({ok:false,suite:"modelscope-studio-free-inventory-stage",error:"HARD_TIMEOUT",timeout_ms:20000,free_only:true,paid_fallback:false,secrets_redacted:true}));
  process.exit(124);
},20000);
const abort=setTimeout(()=>controller.abort(),12000);
try{
  const r=await fetch(url,{headers:{accept:"application/json","cache-control":"no-cache"},signal:controller.signal});
  const body=await r.json().catch(()=>null);
  assert.equal(body?.selftest,"modelscope-studio-cpu",`Unexpected response HTTP ${r.status}: ${JSON.stringify(body)}`);
  assert.equal(body?.configured,true);
  assert.equal(body?.authenticated,true);
  assert.equal(body?.free_only,true);
  assert.equal(body?.paid_fallback,false);
  const s=body?.hardware_summary||{};
  assert.ok(Number(s?.all_count)>0,`No hardware rows parsed: ${JSON.stringify(body)}`);
  assert.ok(Number(s?.free_count)>0,`No explicitly-free hardware parsed: ${JSON.stringify(body)}`);
  console.log(JSON.stringify({ok:true,suite:"modelscope-studio-free-inventory-stage",http_status:r.status,hardware_summary:{all_count:Number(s.all_count),free_count:Number(s.free_count),eligible_count:Number(s.eligible_count||0)},candidate_present:Boolean(body?.free_cpu_candidate||s?.selected),error_class:body?.error_class||null,free_only:true,paid_fallback:false,secrets_redacted:true}));
}finally{
  clearTimeout(abort);
  clearTimeout(hard);
}
