import assert from "node:assert/strict";

const url="https://compute-worker.a15280020511.workers.dev/v1/selftest/modelscope-studio-bootstrap-once";
const controller=new AbortController();
const timer=setTimeout(()=>controller.abort(),100000);
try{
  const r=await fetch(url,{method:"POST",headers:{accept:"application/json","x-three-center-selftest":"studio-cpu-once-v1-20260817"},signal:controller.signal});
  const body=await r.json().catch(()=>null);
  assert.equal(r.status,200,`ModelScope Studio CPU E2E HTTP ${r.status}: ${JSON.stringify(body)}`);
  assert.equal(body?.ok,true);
  assert.equal(body?.selftest,"modelscope-studio-bootstrap-once");
  assert.ok(["runtime-verified","already-verified"].includes(body?.stage),`Unexpected stage ${body?.stage}`);
  assert.equal(body?.free_only,true);
  assert.equal(body?.paid_fallback,false);
  const h=body?.hardware||{};
  assert.equal(h?.free,true);
  assert.ok(Number(h?.cpu)>=8,`Hardware CPU ${h?.cpu}`);
  assert.ok(Number(h?.memory_gb)>=30,`Hardware memory ${h?.memory_gb}`);
  const receipt=body?.runtime_receipt||{};
  assert.equal(receipt?.ok,true);
  assert.equal(receipt?.revision,"studio-cpu-runtime-v1-20260817");
  assert.ok(Number(receipt?.cpu_effective)>=8,`Effective CPU ${receipt?.cpu_effective}`);
  assert.ok(Number(receipt?.memory_gb_effective)>=30,`Effective memory ${receipt?.memory_gb_effective}`);
  assert.equal(receipt?.square_sum_correct,true);
  assert.match(String(receipt?.result_digest||""),/^[a-f0-9]{64}$/i);
  console.log(JSON.stringify({ok:true,suite:"modelscope-studio-cpu-hard-production-e2e",stage:body.stage,hardware:{name:h.name,cpu:h.cpu,memory_gb:h.memory_gb,free:true},runtime_receipt:{revision:receipt.revision,cpu_effective:receipt.cpu_effective,memory_gb_effective:receipt.memory_gb_effective,square_sum_correct:true,result_digest:receipt.result_digest,python:receipt.python,numpy:receipt.numpy,torch:receipt.torch},free_only:true,paid_fallback:false,secrets_redacted:true}));
}finally{clearTimeout(timer)}
