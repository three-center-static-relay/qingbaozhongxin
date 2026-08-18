import assert from "node:assert/strict";
import {OPERATIONS,runAdapter} from "../src/adapters-huggingface-v2.js";

assert.ok(OPERATIONS.huggingface.includes("vendor_free_status"));
assert.ok(OPERATIONS.huggingface.includes("free_model_status"));
assert.ok(OPERATIONS.huggingface.includes("vendor_check_candidates"));

const originalFetch=globalThis.fetch;
const router={data:[{
  id:"zai-org/GLM-4.7-Flash",
  object:"model",
  owned_by:"zai-org",
  providers:[
    {provider:"zai-org",status:"live",is_free:false,is_model_author:true,pricing:null,supports_tools:true},
    {provider:"deepinfra",status:"live",is_free:false,is_model_author:false,pricing:{input:0.06,output:0.4},supports_tools:true}
  ]
}]};
const vendorHtml=`<html><body><table><tr><td>GLM-4.7-Flash</td><td>Free</td><td>Free</td><td>Free</td><td>Free</td></tr></table></body></html>`;

globalThis.fetch=async input=>{
  const url=String(input);
  if(url==="https://router.huggingface.co/v1/models")return new Response(JSON.stringify(router),{status:200,headers:{"content-type":"application/json"}});
  if(url==="https://docs.z.ai/guides/overview/pricing")return new Response(vendorHtml,{status:200,headers:{"content-type":"text/html"}});
  throw new Error(`unexpected fetch ${url}`);
};

try{
  const candidates=await runAdapter("huggingface","free_candidates",{query:"GLM-4.7",limit:10},{});
  assert.equal(candidates.items.length,1,"model-author provider must enter vendor-check candidate radar");
  assert.equal(candidates.items[0].free_radar_status,"vendor_check_candidate");
  assert.equal(candidates.items[0].vendor_policy_available,true);
  assert.equal(candidates.items[0].vendor_check_provider_count,1);

  const hfOnly=await runAdapter("huggingface","free_models",{query:"GLM-4.7",limit:10},{});
  assert.equal(hfOnly.items.length,0,"vendor-direct free must not be mislabeled as a free HF Router route");

  const vendor=await runAdapter("huggingface","vendor_free_status",{model_id:"zai-org/GLM-4.7-Flash"},{});
  assert.equal(vendor.vendor_free_verified,true);
  assert.equal(vendor.vendor_free_status,"vendor_confirmed_free");
  assert.equal(vendor.access.mode,"vendor_direct_api");
  assert.equal(vendor.access.api_model,"glm-4.7-flash");
  assert.equal(vendor.access.required_secret,"ZAI_API_KEY");
  assert.equal(vendor.access.key_present,false);
  assert.equal(vendor.access.registration_required,true);
  assert.equal(vendor.router_free_inference,false);

  const status=await runAdapter("huggingface","free_model_status",{model_id:"zai-org/GLM-4.7-Flash"},{});
  assert.equal(status.final_free_status,"vendor_confirmed_free");
  assert.equal(status.recommended_access,"vendor_direct_api");
  assert.equal(status.router.has_explicit_free_provider,false);
  assert.equal(status.router.zero_priced_provider_count,0);
  assert.equal(status.vendor.vendor_free_verified,true);
  assert.equal(status.paid_fallback_allowed,false);

  const withKey=await runAdapter("huggingface","vendor_free_status",{model_id:"zai-org/GLM-4.7-Flash"},{ZAI_API_KEY:"redacted-test-placeholder"});
  assert.equal(withKey.access.key_present,true);
  assert.equal(withKey.access.registration_required,false);

  const unknown=await runAdapter("huggingface","vendor_free_status",{model_id:"example/Unknown"},{});
  assert.equal(unknown.vendor_policy_available,false);
  assert.equal(unknown.vendor_free_verified,false);

  await assert.rejects(()=>runAdapter("huggingface","vendor_free_status",{model_id:"https://evil.invalid/model"},{}),/INVALID_HF_MODEL_ID/);
}finally{globalThis.fetch=originalFetch}

console.log("huggingface-vendor-free-status: PASS");
