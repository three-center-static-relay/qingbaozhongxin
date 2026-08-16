import assert from "node:assert/strict";
import {runAdapter} from "../src/adapters.js";
import {CATALOG} from "../src/catalog.js";

for(const p of ["amap","baidu_maps","tencent_maps"]){assert.match(CATALOG[p].integration,/mcp/i);assert.equal(CATALOG[p].rest_fallback,false);assert.equal(CATALOG[p].arbitrary_url,false)}
assert.equal(CATALOG.tianditu.integration,"official-https-api");assert.match(CATALOG.tianditu.mcp_status,/no-public-official-mcp/);assert.equal(CATALOG.tianditu.compliance_policy.proxy_rotation,false);assert.equal(CATALOG.tianditu.compliance_policy.quota_evasion,false);assert.equal(CATALOG.tianditu.compliance_policy.bulk_mirroring,false);assert.equal(CATALOG.tianditu.compliance_policy.personal_trajectory,false);assert.equal(CATALOG.tianditu.compliance_policy.public_map_service,false);

const oldFetch=globalThis.fetch,calls=[],enc=new TextEncoder();let sseController;
try{
  globalThis.fetch=async(url,init={})=>{const u=String(url);calls.push({u,init});
    if(u.startsWith("https://mcp.amap.com/mcp")){const b=JSON.parse(init.body);if(b.method==="tools/list")return Response.json({jsonrpc:"2.0",id:b.id,result:{tools:[{name:"maps_geo",inputSchema:{type:"object",properties:{address:{type:"string"},city:{type:"string"}},required:["address"]}}]}});if(b.method==="tools/call")return Response.json({jsonrpc:"2.0",id:b.id,result:{structuredContent:{address:b.params.arguments.address},isError:false}})}
    if(u.startsWith("https://mcp.map.baidu.com/mcp")){const b=JSON.parse(init.body);if(b.method==="tools/list")return Response.json({jsonrpc:"2.0",id:b.id,result:{tools:[{name:"map_reverse_geocode",inputSchema:{type:"object",properties:{latitude:{type:"number"},longitude:{type:"number"}},required:["latitude","longitude"]}}]}});if(b.method==="tools/call")return Response.json({jsonrpc:"2.0",id:b.id,result:{structuredContent:{latitude:b.params.arguments.latitude,longitude:b.params.arguments.longitude},isError:false}})}
    if(u.startsWith("https://mcp.map.qq.com/sse")){const stream=new ReadableStream({start(c){sseController=c;c.enqueue(enc.encode("event: endpoint\ndata: https://mcp.map.qq.com/messages?session=1\n\n"))}});return new Response(stream,{status:200,headers:{"content-type":"text/event-stream"}})}
    if(u.startsWith("https://mcp.map.qq.com/messages")){const b=JSON.parse(init.body);if(b.id){let result={};if(b.method==="initialize")result={protocolVersion:"2024-11-05",capabilities:{}};if(b.method==="tools/list")result={tools:[{name:"geocoder",inputSchema:{type:"object",properties:{address:{type:"string"},region:{type:"string"}},required:["address"]}}]};if(b.method==="tools/call")result={structuredContent:{address:b.params.arguments.address},isError:false};queueMicrotask(()=>sseController.enqueue(enc.encode(`event: message\ndata: ${JSON.stringify({jsonrpc:"2.0",id:b.id,result})}\n\n`)))}return new Response("",{status:202})}
    if(u.startsWith("https://api.tianditu.gov.cn/v2/search")){const x=new URL(u);assert.equal(x.searchParams.get("tk"),"T");const q=JSON.parse(x.searchParams.get("postStr"));assert.equal(q.keyWord,"北京大学");return Response.json({resultType:1,count:1,keyword:"北京大学",pois:[{name:"北京大学",source:"天地图",lonlat:"116.31,39.99"}],status:{infocode:1000,cndesc:"OK"}})}
    throw new Error(`unexpected upstream ${u}`)
  };
  const a=await runAdapter("amap","geocode",{address:"天安门",city:"北京"},{AMAP_API_KEY:"A"});assert.equal(a.transport,"mcp-streamable-http");assert.equal(a.mcp_tool,"maps_geo");
  const b=await runAdapter("baidu_maps","reverse_geocode",{location:"39.9,116.4"},{BAIDU_MAP_AK:"B"});assert.equal(b.transport,"mcp-streamable-http");assert.equal(b.mcp_tool,"map_reverse_geocode");
  const q=await runAdapter("tencent_maps","geocode",{address:"深圳腾讯大厦",region:"深圳"},{TENCENT_LBS_API_KEY:"Q"});assert.equal(q.transport,"mcp-sse");assert.equal(q.mcp_tool,"geocoder");
  const td=await runAdapter("tianditu","search",{keyword:"北京大学",level:12,map_bound:"116.02524,39.83833,116.65592,39.99185",query_type:1,limit:1},{TIANDITU_TK:"T"});assert.equal(td.data.status.infocode,1000);
  assert.equal(calls.some(x=>/restapi\.amap\.com|api\.map\.baidu\.com|apis\.map\.qq\.com/.test(x.u)),false,"MCP-routed providers must not fall back to old REST endpoints");
  console.log(JSON.stringify({ok:true,suite:"maps-mcp-tianditu",amap_mcp:true,baidu_mcp:true,tencent_mcp:true,tianditu_official_api:true,no_rest_fallback:true,compliance_fences:true}));
}finally{globalThis.fetch=oldFetch}
