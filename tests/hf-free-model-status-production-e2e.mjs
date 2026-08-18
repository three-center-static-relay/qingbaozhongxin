import assert from "node:assert/strict";

const BASE="https://intelligence-worker.a15280020511.workers.dev";
const DIAGNOSTIC_RUN="2026-08-18T22:15+08:00";
const controller=new AbortController();
const timer=setTimeout(()=>controller.abort(),30000);

try{
  const response=await fetch(`${BASE}/v1/run`,{
    method:"POST",
    signal:controller.signal,
    headers:{"content-type":"application/json",accept:"application/json"},
    body:JSON.stringify({
      task_id:`hf-free-status-envelope-${Date.now()}`,
      provider:"huggingface",
      operation:"free_model_status",
      timeout_seconds:25,
      args:{model_id:"zai-org/GLM-4.7-Flash"}
    })
  });
  const body=await response.json().catch(()=>null);
  assert.equal(response.status,200,`production free_model_status HTTP ${response.status}: ${body?.error||"unknown"}`);
  assert.equal(body?.ok,true,"production envelope must return ok=true");
  assert.equal(body?.provider,"huggingface");
  assert.equal(body?.operation,"free_model_status");
  assert.ok(body?.result&&typeof body.result==="object","production envelope must include result object");
  console.log(JSON.stringify({ok:true,stage:"production-envelope",diagnostic_run:DIAGNOSTIC_RUN,provider:body.provider,operation:body.operation,has_result:true,result_digest:body.result_digest??null,secrets_redacted:true}));
}finally{clearTimeout(timer)}
