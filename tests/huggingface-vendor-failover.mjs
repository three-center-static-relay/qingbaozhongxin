import assert from "node:assert/strict";
import {verifyVendorFree} from "../src/vendor-free-policy.js";
import {runAdapter} from "../src/adapters-huggingface-v2.js";

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

  globalThis.fetch=async input=>{
    const url=String(input);
    if(url==="https://router.huggingface.co/v1/models")return new Response(JSON.stringify({error:"router unavailable"}),{status:503,headers:{"content-type":"application/json"}});
    if(url==="https://docs.z.ai/guides/overview/pricing")return new Response("<html><body>GLM-4.7-Flash Free</body></html>",{status:200});
    throw new Error(`unexpected router-degrade fetch ${url}`);
  };
  const degraded=await runAdapter("huggingface","free_model_status",{model_id:"zai-org/GLM-4.7-Flash"},{});
  assert.equal(degraded.final_free_status,"vendor_confirmed_free","vendor-primary proof must survive Router outage");
  assert.equal(degraded.recommended_access,"vendor_direct_api");
  assert.equal(degraded.router,null);
  assert.equal(degraded.router_evidence_available,false);
  assert.equal(degraded.router_error?.code,"UPSTREAM_HTTP_ERROR");
  assert.equal(degraded.vendor.vendor_free_verified,true);
  assert.equal(degraded.vendor.vendor_free_status,"vendor_confirmed_free");
  assert.equal(degraded.vendor.access.required_secret,"ZAI_API_KEY");
  assert.equal(degraded.vendor.access.registration_required,true);
  assert.equal(degraded.paid_fallback_allowed,false);

  globalThis.fetch=async input=>{
    const url=String(input);
    if(url==="https://router.huggingface.co/v1/models")return new Response(JSON.stringify({error:"router unavailable"}),{status:503,headers:{"content-type":"application/json"}});
    if(url.startsWith("https://docs.z.ai/"))return new Response("upstream unavailable",{status:503});
    throw new Error(`unexpected fail-closed fetch ${url}`);
  };
  await assert.rejects(
    ()=>runAdapter("huggingface","free_model_status",{model_id:"zai-org/GLM-4.7-Flash"},{}),
    error=>error?.message==="UPSTREAM_HTTP_ERROR"&&error?.status===502,
    "Router outage + unverified vendor evidence must remain fail-closed"
  );
}finally{
  globalThis.fetch=originalFetch;
}

console.log("huggingface-vendor-failover: PASS");
