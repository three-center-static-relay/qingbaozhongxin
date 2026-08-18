import assert from "node:assert/strict";
import {verifyVendorFree} from "../src/vendor-free-policy.js";

const originalFetch=globalThis.fetch;

try{
  const calls=[];
  globalThis.fetch=async input=>{
    const url=String(input);calls.push(url);
    if(url==="https://docs.z.ai/guides/overview/pricing")return new Response("temporary upstream failure",{status:503});
    if(url==="https://docs.z.ai/guides/llm/glm-4.7")return new Response("<html>GLM-4.7-Flash Lightweight, Completely Free</html>",{status:200});
    throw new Error(`unexpected fallback fetch ${url}`);
  };

  const recovered=await verifyVendorFree("zai-org/GLM-4.7-Flash",{});
  assert.equal(recovered.vendor_free_verified,true,"second official source must recover a failed pricing page");
  assert.equal(recovered.vendor_free_status,"vendor_confirmed_free");
  assert.equal(recovered.evidence.source_type,"vendor_primary_model_guide");
  assert.equal(recovered.sources_checked,2);
  assert.equal(recovered.reachable_source_count,1);
  assert.equal(recovered.verification_degraded,true);
  assert.equal(recovered.source_attempts[0].reachable,false);
  assert.equal(recovered.source_attempts[1].free_evidence_found,true);
  assert.equal(recovered.access.registration_required,true,"verified free + missing key should request registration");
  assert.deepEqual(calls,[
    "https://docs.z.ai/guides/overview/pricing",
    "https://docs.z.ai/guides/llm/glm-4.7"
  ]);

  globalThis.fetch=async()=>new Response("upstream unavailable",{status:503});
  const unavailable=await verifyVendorFree("zai-org/GLM-4.7-Flash",{});
  assert.equal(unavailable.vendor_free_verified,false,"all-source failure must never infer free");
  assert.equal(unavailable.vendor_free_status,"unverified");
  assert.equal(unavailable.sources_checked,3);
  assert.equal(unavailable.reachable_source_count,0);
  assert.equal(unavailable.verification_degraded,true);
  assert.equal(unavailable.access.required_secret,"ZAI_API_KEY");
  assert.equal(unavailable.access.registration_required,false,"unverified free status must not ask the operator to register a key");
}finally{
  globalThis.fetch=originalFetch;
}

console.log("huggingface-vendor-failover: PASS");

// Temporary fail-closed production acceptance probe. Remove after final acceptance.
{
  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(),60000);
  try{
    const response=await fetch("https://intelligence-worker.a15280020511.workers.dev/v1/run",{
      method:"POST",
      signal:controller.signal,
      headers:{"content-type":"application/json",accept:"application/json"},
      body:JSON.stringify({
        task_id:`hf-free-status-main-http200-${Date.now()}`,
        provider:"huggingface",
        operation:"free_model_status",
        timeout_seconds:50,
        args:{model_id:"zai-org/GLM-4.7-Flash"}
      })
    });
    const raw=await response.text();
    assert.equal(response.status,200,`production free_model_status must return HTTP 200; got ${response.status}; body=${raw.slice(0,300)}`);
    console.log(JSON.stringify({ok:true,stage:"production-http-200",http_status:response.status,body_prefix:raw.slice(0,300),secrets_redacted:true}));
  }finally{
    clearTimeout(timer);
  }
}
