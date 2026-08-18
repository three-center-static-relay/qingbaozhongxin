import assert from "node:assert/strict";

const TARGET="zai-org/GLM-4.7-Flash";
const URL=`https://router.huggingface.co/v1/models/${TARGET}`;
const controller=new AbortController();
const timer=setTimeout(()=>controller.abort(),20000);

try{
  const response=await fetch(URL,{signal:controller.signal,headers:{accept:"application/json"}});
  const raw=await response.text();
  let body=null;try{body=raw?JSON.parse(raw):null}catch{}
  assert.equal(response.status,200,`HF Router direct metadata HTTP ${response.status}`);
  assert.equal(body?.id,TARGET,"HF Router must return the requested model id");
  assert.ok(Array.isArray(body?.providers)&&body.providers.length>0,"HF Router must return provider metadata");
  console.log(JSON.stringify({ok:true,stage:"router-reachable",model_id:body.id,provider_count:body.providers.length,providers:body.providers.map(p=>({provider:p.provider,status:p.status,is_free:p.is_free??null,pricing:p.pricing??null}))}));
}finally{clearTimeout(timer)}
