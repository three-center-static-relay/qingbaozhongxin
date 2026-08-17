import assert from "node:assert/strict";

const url="https://compute-worker.a15280020511.workers.dev/v1/selftest/modelscope-inference";
const controller=new AbortController();
const timer=setTimeout(()=>controller.abort(),55000);
try{
  const r=await fetch(url,{headers:{accept:"application/json"},signal:controller.signal});
  const body=await r.json().catch(()=>null);
  assert.equal(body?.selftest,"modelscope-inference",`Unexpected compute selftest response: HTTP ${r.status}`);
  assert.equal(body?.canary_revision,"qwen3.5-27b-stream-math-v3r2-20260817",`Streaming canary revision not deployed; observed=${body?.canary_revision||"none"}`);
  assert.equal(body?.response_mode,"sse-stream");
  assert.equal(body?.secrets_redacted,true);
  console.log(JSON.stringify({ok:true,suite:"compute-modelscope-streaming-revision-probe",http_status:r.status,revision:body.canary_revision,response_mode:body.response_mode,inference_ok:body?.inference_ok===true,correct:body?.correct===true,error_class:body?.error_class||null,stream_events:Number(body?.stream_events||0),content_chars:Number(body?.content_chars||0),reasoning_chars:Number(body?.reasoning_chars||0),secrets_redacted:true}));
}finally{clearTimeout(timer)}
