import assert from "node:assert/strict";
import {OPERATIONS,runAdapter} from "../src/adapters-huggingface-v2.js";

assert.deepEqual(OPERATIONS.huggingface,["router_models","router_model","free_models","free_candidates"]);

const originalFetch=globalThis.fetch;
const fixture={data:[
  {id:"zai-org/GLM-4.7-Flash",object:"model",owned_by:"zai-org",providers:[
    {provider:"zai-org",status:"live",pricing:{input:0,output:0},is_free:false,context_length:200000,supports_tools:true,supports_structured_output:true},
    {provider:"deepinfra",status:"live",pricing:{input:0.12,output:0.42},is_free:false}
  ]},
  {id:"example/Promo-Free",object:"model",owned_by:"example",providers:[
    {provider:"promo-provider",status:"live",pricing:{input:1,output:2},is_free:true}
  ]},
  {id:"example/Paid",object:"model",owned_by:"example",providers:[
    {provider:"paid-provider",status:"live",pricing:{input:1,output:2},is_free:false}
  ]}
]};

globalThis.fetch=async input=>{
  assert.equal(String(input),"https://router.huggingface.co/v1/models","v2 must use the stable global Router list");
  return new Response(JSON.stringify(fixture),{status:200,headers:{"content-type":"application/json"}});
};

try{
  const all=await runAdapter("huggingface","router_models",{query:"GLM-4.7",limit:10},{});
  assert.equal(all.items.length,1);
  const glm=all.items[0];
  assert.equal(glm.id,"zai-org/GLM-4.7-Flash");
  assert.equal(glm.free_radar_status,"zero_price_candidate");
  assert.equal(glm.promo_free_provider_count,0);
  assert.equal(glm.zero_priced_provider_count,1);
  assert.equal(glm.free_candidate_provider_count,1);
  assert.equal(glm.requires_vendor_confirmation,true);
  assert.equal(glm.zero_priced_providers[0].free_evidence,"zero_price_candidate");
  assert.equal(glm.zero_priced_providers[0].requires_vendor_confirmation,true);

  const candidates=await runAdapter("huggingface","free_models",{limit:10},{});
  assert.deepEqual(candidates.items.map(x=>x.id).sort(),["example/Promo-Free","zai-org/GLM-4.7-Flash"]);
  assert.ok(!candidates.items.some(x=>x.id==="example/Paid"));
  assert.match(candidates.free_semantics,/vendor confirmation/);

  const one=await runAdapter("huggingface","router_model",{model_id:"zai-org/GLM-4.7-Flash"},{});
  assert.equal(one.source,"hf-router-v1-models-list-filter");
  assert.equal(one.item.id,"zai-org/GLM-4.7-Flash");
  assert.equal(one.item.free_radar_status,"zero_price_candidate");

  await assert.rejects(()=>runAdapter("huggingface","router_model",{model_id:"https://evil.invalid/model"},{}),/INVALID_HF_MODEL_ID/);
}finally{globalThis.fetch=originalFetch}

console.log("huggingface-router-evidence-v2: PASS");
