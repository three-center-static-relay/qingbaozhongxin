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
  assert.equal(unavailable.access.registration_required,true);
}finally{
  globalThis.fetch=originalFetch;
}

console.log("huggingface-vendor-failover: PASS");
