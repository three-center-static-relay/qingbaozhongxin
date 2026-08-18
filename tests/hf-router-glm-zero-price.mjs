import assert from "node:assert/strict";

const TARGET="zai-org/GLM-4.7-Flash";
const controller=new AbortController();
const timer=setTimeout(()=>controller.abort(),20000);

try{
  const response=await fetch("https://router.huggingface.co/v1/models",{signal:controller.signal,headers:{accept:"application/json"}});
  const body=await response.json();
  assert.equal(response.status,200,`HF Router model list HTTP ${response.status}`);
  const model=Array.isArray(body?.data)?body.data.find(m=>m?.id===TARGET):null;
  assert.ok(model,"GLM-4.7-Flash must exist in HF Router list");
  assert.ok(Array.isArray(model.providers)&&model.providers.length>0,"GLM-4.7-Flash must have provider metadata");
  const zero=model.providers.filter(p=>Number(p?.pricing?.input)===0&&Number(p?.pricing?.output)===0);
  assert.ok(zero.length>0,"GLM-4.7-Flash must have at least one provider with explicit 0/0 token pricing");
  console.log(JSON.stringify({ok:true,model_id:TARGET,provider_count:model.providers.length,zero_price_provider_count:zero.length,zero_price_providers:zero.map(p=>({provider:p.provider,status:p.status,is_free:typeof p?.is_free==="boolean"?p.is_free:null,pricing:p.pricing}))}));
}finally{clearTimeout(timer)}
