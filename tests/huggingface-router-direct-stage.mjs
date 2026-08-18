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
  console.log(JSON.stringify({ok:true,stage:"router-list-target-shape",model_id:model.id,provider_count:model.providers.length,providers:model.providers.map(p=>({provider:p.provider,status:p.status,is_free:typeof p?.is_free==="boolean"?p.is_free:null,pricing:p.pricing??null}))}));
}finally{clearTimeout(timer)}
