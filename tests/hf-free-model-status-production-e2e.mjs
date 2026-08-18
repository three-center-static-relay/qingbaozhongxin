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
      task_id:`hf-free-status-stage-a-${Date.now()}`,
      provider:"huggingface",
      operation:"free_model_status",
      timeout_seconds:25,
      args:{model_id:"zai-org/GLM-4.7-Flash"}
    })
  });
  const body=await response.json().catch(()=>null);
  assert.equal(response.status,200,`stage-a HTTP ${response.status}: ${body?.error||"unknown"}`);
  assert.equal(body?.ok,true,"stage-a requires ok=true");
  assert.equal(body?.provider,"huggingface");
  assert.equal(body?.operation,"free_model_status");
  assert.ok(body?.result&&typeof body.result==="object","stage-a requires result object");
  console.log(JSON.stringify({ok:true,stage:"production-envelope-a",http_status:response.status,provider:body.provider,operation:body.operation,result_digest:body.result_digest??null,secrets_redacted:true}));
}finally{clearTimeout(timer)}
