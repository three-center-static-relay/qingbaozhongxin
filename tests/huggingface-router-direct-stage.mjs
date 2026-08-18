import assert from "node:assert/strict";

const TARGET="zai-org/GLM-4.7-Flash";
const URL=`https://router.huggingface.co/v1/models/${TARGET}`;
const controller=new AbortController();
const timer=setTimeout(()=>controller.abort(),20000);

try{
  const response=await fetch(URL,{signal:controller.signal,headers:{accept:"application/json"}});
  assert.ok(Number.isInteger(response.status)&&response.status>=100,"HF Router must return an HTTP response");
  console.log(JSON.stringify({ok:true,stage:"transport-only",http_status:response.status,content_type:response.headers.get("content-type")||null}));
}finally{clearTimeout(timer)}
