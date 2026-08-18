import assert from "node:assert/strict";

const BASE="https://intelligence-worker.a15280020511.workers.dev";
const taskId=`hf-free-status-e2e-${Date.now()}-${Math.random().toString(36).slice(2,8)}`;
const controller=new AbortController();
const timer=setTimeout(()=>controller.abort(),30000);

try{
  const response=await fetch(`${BASE}/v1/run`,{
    method:"POST",
    signal:controller.signal,
    headers:{"content-type":"application/json",accept:"application/json"},
    body:JSON.stringify({
      task_id:taskId,
      provider:"huggingface",
      operation:"free_model_status",
      timeout_seconds:25,
      args:{model_id:"zai-org/GLM-4.7-Flash"}
    })
  });
  const body=await response.json().catch(()=>null);
  assert.equal(response.status,200,`production free_model_status HTTP ${response.status}: ${body?.error||"unknown"}`);
  assert.equal(body?.ok,true,"production free_model_status must return ok=true");
  assert.equal(body?.provider,"huggingface");
  assert.equal(body?.operation,"free_model_status");
  const result=body?.result;
  assert.equal(result?.final_free_status,"vendor_confirmed_free");
  assert.equal(result?.recommended_access,"vendor_direct_api");
  assert.equal(result?.vendor?.vendor_free_verified,true);
  assert.equal(result?.vendor?.vendor_free_status,"vendor_confirmed_free");
  assert.equal(result?.vendor?.access?.required_secret,"ZAI_API_KEY");
  assert.equal(result?.paid_fallback_allowed,false);
  assert.match(String(body?.result_digest||""),/^[a-f0-9]{64}$/,"production result must include digest");
  console.log(JSON.stringify({ok:true,production_e2e:true,model_id:result.model_id,final_free_status:result.final_free_status,recommended_access:result.recommended_access,vendor_free_verified:true,key_present:result.vendor.access.key_present,registration_required:result.vendor.access.registration_required,required_secret:result.vendor.access.required_secret,paid_fallback_allowed:false,result_digest:body.result_digest,secrets_redacted:true}));
}finally{clearTimeout(timer)}
