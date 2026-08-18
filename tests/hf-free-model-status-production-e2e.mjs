import assert from "node:assert/strict";

const BASE="https://intelligence-worker.a15280020511.workers.dev";
const controller=new AbortController();
const timer=setTimeout(()=>controller.abort(),30000);

try{
  const response=await fetch(`${BASE}/v1/run`,{
    method:"POST",
    signal:controller.signal,
    headers:{"content-type":"application/json",accept:"application/json"},
    body:JSON.stringify({
      task_id:`hf-free-status-http-${Date.now()}`,
      provider:"huggingface",
      operation:"free_model_status",
      timeout_seconds:25,
      args:{model_id:"zai-org/GLM-4.7-Flash"}
    })
  });
  const body=await response.json().catch(()=>null);
  assert.equal(response.status,200,`production free_model_status HTTP ${response.status}: ${body?.error||"unknown"}`);
  console.log(JSON.stringify({ok:true,stage:"production-http-200",http_status:response.status,response_ok:body?.ok??null,error:body?.error??null,provider:body?.provider??null,operation:body?.operation??null,secrets_redacted:true}));
}finally{clearTimeout(timer)}
