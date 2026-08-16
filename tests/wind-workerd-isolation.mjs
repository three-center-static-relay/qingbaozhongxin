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
    if(b.method==="tools/list")return HttpResponse.json({jsonrpc:"2.0",id:b.id,result:{tools:[{name:"get_stock_price_indicators",inputSchema:{type:"object"}},{name:"get_stock_quote",inputSchema:{type:"object"}}]}});
    return HttpResponse.json({jsonrpc:"2.0",id:b.id,error:{code:-32601,message:"unexpected method"}},{status:400});
  })
);
network.listen({onUnhandledRequest:"error"});
const server=createTestHarness({workers:[{configPath:"./wrangler.wind-test.jsonc"}]});
try{
  await server.listen();
  const r=await server.fetch("https://wind.test/wind",{method:"POST"}),b=await r.json();
  assert.equal(r.status,200);assert.equal(b.ok,true);assert.equal(b.source,"Wind AIFin Market");assert.equal(b.server_type,"stock_data");assert.ok(b.tools.includes("get_stock_price_indicators"));assert.equal(calls,2,"expected initialize + tools/list");
  console.log(JSON.stringify({ok:true,suite:"wind-workerd-isolation",adapter_runtime:true,initialize:true,tools_list:true,calls}));
}finally{await server.close().catch(()=>{});network.close()}
