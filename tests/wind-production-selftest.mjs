import assert from "node:assert/strict";
import {createTestHarness} from "wrangler";
import {http,HttpResponse} from "msw";
import {setupServer} from "msw/node";

let calls=0;
const network=setupServer(
  http.post("https://mcp.wind.com.cn/vserver_stock_data/mcp/",async({request})=>{
    calls++;
    assert.equal(request.headers.get("authorization"),"Bearer unit-wind-key");
    const b=await request.json();
    if(b.method==="initialize")return HttpResponse.json({jsonrpc:"2.0",id:b.id,result:{protocolVersion:"2025-03-26",capabilities:{}}});
    if(b.method==="tools/list")return HttpResponse.json({jsonrpc:"2.0",id:b.id,result:{tools:[
      {name:"get_stock_price_indicators",description:"stock price indicators",inputSchema:{type:"object",properties:{windcode:{type:"string"}},required:["windcode"]}},
      {name:"get_stock_quote",description:"stock quote",inputSchema:{type:"object"}}
    ]}});
    return HttpResponse.json({jsonrpc:"2.0",id:b.id,error:{code:-32601,message:"unexpected method"}},{status:400});
  })
);
network.listen({onUnhandledRequest:"error"});
const server=createTestHarness({workers:[{configPath:"./wrangler.provider-selftest.jsonc"}]});
try{
  await server.listen();
  const r=await server.fetch("https://intelligence.internal/v1/selftest/wind",{method:"POST"}),b=await r.json();
  assert.equal(r.status,200);assert.equal(b.ok,true);assert.equal(b.selftest,"wind-aifin-readiness");assert.equal(b.protocol_e2e,true);assert.equal(b.business_e2e,false);assert.equal(b.provider,"aifin_market");assert.equal(b.source,"Wind AIFin Market");assert.equal(b.server_type,"stock_data");assert.equal(b.stock_price_tool,true);assert.equal(b.tool_count,2);assert.equal(b.transport,"mcp-streamable-http");assert.equal(b.auth,"bearer");assert.equal(b.ai_called,false);assert.equal(b.secrets_redacted,true);assert.match(b.receipt_digest,/^[a-f0-9]{64}$/);assert.equal(calls,2,"expected initialize + tools/list");
  const denied=await server.fetch("https://public.example/v1/selftest/wind",{method:"POST"});assert.equal(denied.status,403);const db=await denied.json();assert.equal(db.error,"POLICY_DENIED");
  console.log(JSON.stringify({ok:true,suite:"wind-production-selftest",internal_only:true,protocol_e2e:true,business_e2e:false,initialize_and_tools_list:true}));
}finally{await server.close().catch(()=>{});network.close()}
