import assert from "node:assert/strict";

const BASE="https://intelligence-worker.a15280020511.workers.dev";
const controller=new AbortController();
const timer=setTimeout(()=>controller.abort(),25000);

try{
  const response=await fetch(`${BASE}/v1/selftest/huggingface-router-runtime`,{
    signal:controller.signal,
    headers:{accept:"application/json"}
  });
  const body=await response.json().catch(()=>null);

  assert.equal(body?.selftest,"huggingface-router-runtime",`HF Router canary route is not present in served production; HTTP ${response.status}, error=${body?.error||"unknown"}`);

  console.log(JSON.stringify({
    ok:true,
    diagnostic:"hf-router-canary-route-present",
    http_status:response.status,
    selftest:body.selftest,
    runtime_ok:body.ok??null,
    upstream_http_status:body.upstream_http_status??null,
    error:body.error??null,
    provider_count:body.provider_count??null,
    free_status_verified:body.free_status_verified??null,
    has_explicit_free_provider:body.has_explicit_free_provider??null,
    secrets_redacted:true
  }));
}finally{
  clearTimeout(timer);
}
