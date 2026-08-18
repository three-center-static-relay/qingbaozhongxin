import assert from "node:assert/strict";

const TARGET="zai-org/GLM-4.7-Flash";
const URL="https://router.huggingface.co/v1/models";
const controller=new AbortController();
const timer=setTimeout(()=>controller.abort(),20000);

try{
  const response=await fetch(URL,{signal:controller.signal,headers:{accept:"application/json"}});
  const body=await response.json();
  assert.equal(response.status,200,`HF Router model list HTTP ${response.status}`);
  assert.ok(Array.isArray(body?.data)&&body.data.length>0,"HF Router list must return data[]");
  const model=body.data.find(m=>m?.id===TARGET);
  assert.ok(model,"GLM-4.7-Flash must be present in Router model list");
  assert.ok(Array.isArray(model.providers)&&model.providers.length>0,"Target model must have provider metadata");
  const explicit=model.providers.filter(p=>typeof p?.is_free==="boolean");
  const free=model.providers.filter(p=>p?.is_free===true);
  assert.ok(explicit.length>0,"At least one target provider must expose boolean is_free");
  assert.ok(free.length>0,"GLM-4.7-Flash must currently have at least one provider with is_free=true");
  console.log(JSON.stringify({ok:true,stage:"router-list-explicit-free",model_id:model.id,provider_count:model.providers.length,explicit_signal_count:explicit.length,free_provider_count:free.length,free_providers:free.map(p=>({provider:p.provider,status:p.status,pricing:p.pricing??null,context_length:p.context_length??null,supports_tools:p.supports_tools??null,supports_structured_output:p.supports_structured_output??null}))}));
}finally{clearTimeout(timer)}
