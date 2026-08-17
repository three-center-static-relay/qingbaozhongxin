import assert from "node:assert/strict";

const url="https://compute-worker.a15280020511.workers.dev/v1/selftest/modelscope-inference";
const controller=new AbortController();
const timer=setTimeout(()=>controller.abort(),60000);
try{
  const r=await fetch(url,{headers:{accept:"application/json"},signal:controller.signal});
  const body=await r.json().catch(()=>null);
  assert.equal(r.status,200,`ModelScope compute E2E HTTP ${r.status}: ${JSON.stringify(body)}`);
  assert.equal(body?.selftest,"modelscope-inference");
  assert.equal(body?.ok,true);
  assert.equal(body?.secret_present,true);
  assert.equal(body?.authenticated,true);
  assert.equal(body?.inference_ok,true);
  assert.equal(body?.correct,true);
  assert.equal(body?.expected,"323");
  assert.equal(body?.model,"Qwen/Qwen3.5-27B");
  assert.equal(body?.canary_revision,"qwen3.5-27b-stream-math-v3r2-20260817");
  assert.equal(body?.response_mode,"sse-stream");
  assert.ok(Number(body?.stream_events||0)>0,"Expected nonempty SSE stream");
  assert.ok(body?.output_digest,"Expected output digest");
  assert.equal(body?.free_only,true);
  assert.equal(body?.paid_fallback,false);
  assert.equal(body?.secrets_redacted,true);
  console.log(JSON.stringify({ok:true,suite:"modelscope-compute-hard-production-e2e",model:body.model,revision:body.canary_revision,expected:"323",correct:true,stream_events:Number(body.stream_events),output_digest:body.output_digest,free_only:true,paid_fallback:false,secrets_redacted:true}));
}finally{clearTimeout(timer)}
