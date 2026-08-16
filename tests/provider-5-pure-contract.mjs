import assert from "node:assert/strict";
import {runAdapter as runWindAdapter} from "../src/adapters-extra32.js";
import {PROVIDER_CANARIES,runProviderSelftest} from "../src/provider-selftest.js";

const realFetch=globalThis.fetch;
const j=(x,status=200)=>new Response(JSON.stringify(x),{status,headers:{"content-type":"application/json"}});
let windInitialize=0,windToolCall=0;

globalThis.fetch=async(url,init={})=>{
  const u=String(url);
  assert.equal(u,"https://mcp.wind.com.cn/vserver_stock_data/mcp/");
  assert.equal(String(init.method||"GET").toUpperCase(),"POST");
  assert.equal(init.headers?.Authorization,"Bearer unit-wind-key");
  const body=JSON.parse(String(init.body||"{}"));
  if(body.method==="initialize"){
    windInitialize++;
    assert.equal(body.params?.protocolVersion,"2025-03-26");
    return j({jsonrpc:"2.0",id:body.id,result:{protocolVersion:"2025-03-26",capabilities:{}}});
  }
  if(body.method==="tools/call"){
    windToolCall++;
    assert.equal(body.params?.name,"get_stock_price_indicators");
    assert.equal(body.params?.arguments?.windcode,"600519.SH");
    assert.equal(body.params?._meta?.clientVersion,"2.0.1");
    return j({jsonrpc:"2.0",id:body.id,result:{content:[{type:"text",text:JSON.stringify({data:{code:0,message:"OK",rows:[{windcode:"600519.SH",price:1}]}})}],isError:false}});
  }
  throw new Error(`unexpected Wind MCP method ${body.method}`);
};

try{
  const windSpec=PROVIDER_CANARIES.find(x=>x.id==="wind-aifin-stock");
  assert.ok(windSpec,"Wind canary must be registered");
  assert.equal(PROVIDER_CANARIES.length,5);
  assert.equal(windSpec.provider,"aifin_market");
  assert.equal(windSpec.operation,"get_stock_price_indicators");
  assert.equal(windSpec.args?.windcode,"600519.SH");

  const wind=await runWindAdapter("aifin_market","get_stock_price_indicators",{windcode:"600519.SH"},{WIND_API_KEY:"unit-wind-key"});
  assert.equal(wind.source,"Wind AIFin Market");
  assert.equal(wind.server_type,"stock_data");
  assert.ok(wind.result);
  assert.equal(windInitialize,1);
  assert.equal(windToolCall,1);

  const results={
    "bigquery-metadata":{data:{tableReference:{projectId:"bigquery-public-data",datasetId:"google_trends",tableId:"international_top_terms"}}},
    "earthengine-public-asset":{data:{name:"projects/earthengine-public/assets/GOOGLE/DYNAMICWORLD/V1"}},
    "google-patents-public":{items:[{publication_number:"US1A1"}],bigquery_bytes_billed:0,query_mode:"bounded-public-search-no-bigquery-scan"},
    "pkulaw-health":{status:"healthy",auth_ok:true,transport_ok:true,law_data_ok:true,case_data_ok:true,checks:{law_search:"nonempty",case_search:"nonempty"}},
    "wind-aifin-stock":{source:"Wind AIFin Market",server_type:"stock_data",result:{content:[{type:"text",text:"{}"}],isError:false}}
  };
  const byProviderOperation=new Map(PROVIDER_CANARIES.map(x=>[`${x.provider}:${x.operation}`,x.id]));
  const app={
    fetch:async req=>{
      const body=await req.json();
      const id=byProviderOperation.get(`${body.provider}:${body.operation}`);
      assert.ok(id,`unexpected provider selftest ${body.provider}:${body.operation}`);
      assert.equal(body.timeout_seconds,90);
      return j({ok:true,result:results[id],result_digest:"a".repeat(64)});
    }
  };
  const gate={
    fetch:async req=>{
      const p=new URL(req.url).pathname;
      if(p==="/state")return j({ok:true,active:false});
      if(p.startsWith("/task/"))return j({ok:true,task:{status:"pass"}});
      return j({ok:false,error:"unexpected gate path"},404);
    }
  };
  const env={CENTER_GATE:{idFromName:name=>name,get:()=>gate}};
  const response=await runProviderSelftest(app,env,{});
  const body=await response.json();
  assert.equal(response.status,200);
  assert.equal(body.ok,true);
  assert.equal(body.selftest,"provider-fresh-e2e");
  assert.equal(body.providers_checked,5);
  assert.equal(body.bigquery_query_scan,false);
  assert.equal(body.bigquery_bytes_billed,0);
  assert.equal(body.checks.length,5);
  assert.ok(body.checks.every(x=>x.ok===true&&x.terminal_status==="pass"&&x.lock_released===true));
  assert.equal(body.checks.find(x=>x.id==="pkulaw-health")?.status,"healthy");
  const windCheck=body.checks.find(x=>x.id==="wind-aifin-stock");
  assert.equal(windCheck?.source,"Wind AIFin Market");
  assert.equal(windCheck?.server_type,"stock_data");
  assert.equal(windCheck?.has_data,true);
  assert.equal(windCheck?.tool,"get_stock_price_indicators");
  assert.match(body.receipt_digest,/^[a-f0-9]{64}$/);

  console.log(JSON.stringify({ok:true,suite:"provider-5-pure-contract",providers_checked:5,wind_mcp_initialize:true,wind_business_tool_call:true,wind_fixed_endpoint:true,bearer_auth:true,lock_release:true,result_digest:true,receipt_digest:true,bigquery_zero_scan_contract:true}));
}finally{
  globalThis.fetch=realFetch;
}
