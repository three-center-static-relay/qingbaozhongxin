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
  const official=model.providers.find(p=>p?.provider==="zai-org");
  assert.ok(official,"HF Router must expose the zai-org provider for GLM-4.7-Flash");
  console.log(JSON.stringify({ok:true,stage:"zai-provider-present",model_id:TARGET,provider_count:model.providers.length,zai_provider:{provider:official.provider,status:official.status,is_free:typeof official.is_free==="boolean"?official.is_free:null,pricing:official.pricing??null}}));
}finally{clearTimeout(timer)}
