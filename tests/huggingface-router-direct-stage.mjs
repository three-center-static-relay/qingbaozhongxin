import assert from "node:assert/strict";

const TARGET="zai-org/GLM-4.7-Flash";
const URL=`https://router.huggingface.co/v1/models/${TARGET}`;
const controller=new AbortController();
const timer=setTimeout(()=>controller.abort(),20000);

try{
  const response=await fetch(URL,{signal:controller.signal,headers:{accept:"application/json"}});
  assert.equal(response.status,200,`HF Router direct metadata HTTP ${response.status}`);
  console.log(JSON.stringify({ok:true,stage:"http-200",http_status:response.status,content_type:response.headers.get("content-type")||null}));
}finally{clearTimeout(timer)}
