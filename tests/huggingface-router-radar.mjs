import assert from "node:assert/strict";
import {OPERATIONS,runAdapter} from "../src/adapters-core.js";

assert.deepEqual(
  OPERATIONS.huggingface,
  ["models","router_models","router_model","free_models"],
  "Hugging Face operation contract changed unexpectedly"
);

const originalFetch=globalThis.fetch;
const fixture={
  data:[
    {
      id:"zai-org/GLM-4.7-Flash",
      object:"model",
      created:1769644800,
      owned_by:"zai-org",
      architecture:{input_modalities:["text"],output_modalities:["text"]},
      providers:[
        {
          provider:"zai-org",
          status:"live",
          context_length:202752,
          pricing:{input:0,output:0},
          is_free:true,
          supports_tools:true,
          supports_structured_output:true,
          first_token_latency_ms:320,
          throughput:88.5,
          is_model_author:true
        },
        {
          provider:"deepinfra",
          status:"live",
          context_length:131072,
          pricing:{input:0.12,output:0.42},
          supports_tools:true,
          supports_structured_output:true,
          first_token_latency_ms:410,
          throughput:73.1,
          is_model_author:false
        }
      ]
    },
    {
      id:"example/Paid-Model",
      object:"model",
      owned_by:"example",
      providers:[
        {provider:"novita",status:"live",pricing:{input:1,output:2},is_free:false}
      ]
    }
  ]
};

globalThis.fetch=async input=>{
  const url=String(input);
  if(url==="https://router.huggingface.co/v1/models"){
    return new Response(JSON.stringify(fixture),{status:200,headers:{"content-type":"application/json"}});
  }
  if(url==="https://router.huggingface.co/v1/models/zai-org/GLM-4.7-Flash"){
    return new Response(JSON.stringify(fixture.data[0]),{status:200,headers:{"content-type":"application/json"}});
  }
  throw new Error(`unexpected fetch ${url}`);
};

try{
  const all=await runAdapter("huggingface","router_models",{query:"GLM-4.7",limit:10},{});
  assert.equal(all.source,"hf-router-v1-models");
  assert.equal(all.items.length,1);
  assert.equal(all.items[0].id,"zai-org/GLM-4.7-Flash");
  assert.equal(all.items[0].free_provider_count,1);
  assert.equal(all.items[0].free_providers[0].provider,"zai-org");
  assert.equal(all.items[0].providers[1].is_free,null,"missing is_free must remain unknown");
  assert.equal(all.items[0].providers[1].free_status,"unknown");

  const free=await runAdapter("huggingface","free_models",{limit:10},{});
  assert.equal(free.items.length,1,"paid-only models must be excluded from free radar");
  assert.equal(free.items[0].id,"zai-org/GLM-4.7-Flash");
  assert.equal(free.items[0].free_providers[0].is_free,true);
  assert.equal(free.pricing_unit,"USD_per_million_tokens");

  const one=await runAdapter("huggingface","router_model",{model_id:"zai-org/GLM-4.7-Flash"},{});
  assert.equal(one.item.has_explicit_free_provider,true);
  assert.equal(one.item.providers[0].supports_tools,true);
  assert.equal(one.item.providers[0].supports_structured_output,true);
  assert.equal(one.item.providers[0].context_length,202752);

  await assert.rejects(
    ()=>runAdapter("huggingface","router_model",{model_id:"https://evil.invalid/model"},{}),
    /INVALID_HF_MODEL_ID/,
    "router_model must reject arbitrary URLs"
  );
}finally{
  globalThis.fetch=originalFetch;
}

console.log("huggingface-router-radar: PASS");
