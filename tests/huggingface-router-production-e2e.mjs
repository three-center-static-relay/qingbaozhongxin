import assert from "node:assert/strict";

const BASE="https://intelligence-worker.a15280020511.workers.dev";
const TARGET="zai-org/GLM-4.7-Flash";
const controller=new AbortController();
const timer=setTimeout(()=>controller.abort(),25000);

try{
  const response=await fetch(`${BASE}/v1/selftest/huggingface-router-runtime`,{
    signal:controller.signal,
    headers:{accept:"application/json"}
  });
  const body=await response.json().catch(()=>null);

  assert.equal(response.status,200,`HF Router production selftest HTTP ${response.status}: ${body?.error||"unknown"}`);
  assert.equal(body?.ok,true,"HF Router production selftest must return ok=true");
  assert.equal(body?.selftest,"huggingface-router-runtime");
  assert.equal(body?.model_id,TARGET);
  assert.equal(body?.source,"hf-router-v1-model");
  assert.ok(Number(body?.provider_count)>0,"Router must return at least one live/known provider record");
  assert.ok(Array.isArray(body?.providers)&&body.providers.length===body.provider_count,"Provider payload must be normalized and count-consistent");
  assert.equal(body?.free_status_verified,true,"At least one provider must explicitly expose boolean is_free; do not infer from zero pricing");
  assert.equal(body?.has_explicit_free_provider,true,"GLM-4.7-Flash must currently have at least one provider with is_free=true");
  assert.ok(Number(body?.free_provider_count)>=1,"At least one explicit free provider is required");
  assert.ok(body.providers.some(p=>p?.is_free===true),"Normalized providers must contain an explicit is_free=true record");
  assert.equal(body?.pricing_unit,"USD_per_million_tokens");
  assert.equal(body?.inference_called,false);
  assert.equal(body?.model_tokens_used,0);
  assert.equal(body?.cost_incurred,false);
  assert.equal(body?.secrets_redacted,true);

  const freeProviders=body.providers.filter(p=>p?.is_free===true).map(p=>({provider:p.provider,status:p.status,pricing:p.pricing,context_length:p.context_length,supports_tools:p.supports_tools,supports_structured_output:p.supports_structured_output}));
  console.log(JSON.stringify({
    ok:true,
    production_e2e:true,
    provider:"huggingface",
    model_id:TARGET,
    free_status_verified:true,
    has_explicit_free_provider:true,
    free_provider_count:freeProviders.length,
    free_providers:freeProviders,
    inference_called:false,
    model_tokens_used:0,
    cost_incurred:false,
    secrets_redacted:true
  }));
}finally{
  clearTimeout(timer);
}
