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

  assert.equal(response.status,200,`HF Router runtime route must exist in production; HTTP ${response.status}: ${body?.error||"unknown"}`);
  assert.equal(body?.selftest,"huggingface-router-runtime","must reach the deployed HF Router canary route");

  console.log(JSON.stringify({
    ok:true,
    diagnostic:"hf-router-production-route-reachable",
    http_status:response.status,
    selftest:body.selftest,
    model_id:body.model_id||null,
    provider_count:body.provider_count??null,
    free_status_verified:body.free_status_verified??null,
    has_explicit_free_provider:body.has_explicit_free_provider??null,
    free_provider_count:body.free_provider_count??null,
    inference_called:body.inference_called??null,
    cost_incurred:body.cost_incurred??null,
    secrets_redacted:true
  }));
}finally{
  clearTimeout(timer);
}
