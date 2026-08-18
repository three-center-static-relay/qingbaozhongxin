import assert from "node:assert/strict";

const BASE="https://intelligence-worker.a15280020511.workers.dev";
const controller=new AbortController();
const timer=setTimeout(()=>controller.abort(),60000);

try{
  const response=await fetch(`${BASE}/v1/run`,{
    method:"POST",
    signal:controller.signal,
    headers:{"content-type":"application/json",accept:"application/json"},
    body:JSON.stringify({
      task_id:`hf-free-status-transport-${Date.now()}`,
      provider:"huggingface",
      operation:"free_model_status",
      timeout_seconds:50,
      args:{model_id:"zai-org/GLM-4.7-Flash"}
    })
  });
  const raw=await response.text();
  assert.ok(Number.isInteger(response.status)&&response.status>=100&&response.status<=599,"transport must yield an HTTP response");
  console.log(JSON.stringify({ok:true,stage:"transport-only",http_status:response.status,body_prefix:raw.slice(0,300),secrets_redacted:true}));
}finally{clearTimeout(timer)}
