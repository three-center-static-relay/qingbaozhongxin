import assert from "node:assert/strict";
import {runAdapter} from "../src/adapters-extra18.js";
const realFetch=globalThis.fetch;
function json(body,status=200,headers={}){return new Response(JSON.stringify(body),{status,headers:{"content-type":"application/json",...headers}})}
try{
  const pkCalls=[];
  globalThis.fetch=async(url,init={})=>{const body=JSON.parse(init.body||"{}");pkCalls.push({url:String(url),headers:init.headers||{},body});
    if(body.method==="tools/list")return json({jsonrpc:"2.0",id:1,result:{tools:[{name:"get_law_list",description:"test",inputSchema:{type:"object",properties:{title:{type:"string"}}}}]}});
    if(body.method==="tools/call")return json({jsonrpc:"2.0",id:2,result:{content:[{type:"text",text:"劳动合同法测试结果"}],isError:false}});
    throw new Error(`unexpected pkulaw call ${JSON.stringify(body)}`)
  };
  const pk=await runAdapter("pkulaw","mcp_call",{service:"mcp-law",tool:"get_law_list",arguments:{title:"劳动合同法"}},{PKULAW_MCP_TOKEN:"unit-token"});
  assert.equal(pk.integration,"official-cli-direct-jsonrpc");assert.equal(pk.data?.content?.[0]?.text,"劳动合同法测试结果");assert.equal(pkCalls.length,2);
  for(const call of pkCalls){assert.equal(call.headers.authorization,"Bearer unit-token");assert.equal(call.headers["mcp-session-id"],undefined);assert.equal(call.headers["mcp-protocol-version"],undefined);assert.equal(call.body.jsonrpc,"2.0");assert.ok(Number.isInteger(call.body.id))}
  assert.equal(pkCalls[0].body.method,"tools/list");assert.equal(pkCalls[1].body.method,"tools/call");assert.deepEqual(pkCalls[1].body.params,{name:"get_law_list",arguments:{title:"劳动合同法"}});

  const gCalls=[];
  globalThis.fetch=async(url)=>{const u=new URL(String(url));gCalls.push(u);if(u.hostname==="www.googleapis.com"&&u.pathname.includes("civicinfo"))return json({elections:[{id:"1"}]});if(u.hostname==="kgsearch.googleapis.com")return json({itemListElement:[{"@type":"EntitySearchResult"}]});if(u.hostname==="www.googleapis.com"&&u.pathname.includes("pagespeedonline")){if(u.searchParams.has("key"))return json({error:{message:"Requests to this API pagespeedonline method pagespeedonline.pagespeedapi.runpagespeed are blocked."}},403);return json({id:"https://example.com",analysisUTCTimestamp:"2026-08-15T00:00:00Z",lighthouseResult:{categories:{performance:{score:1}}}})}throw new Error(`unexpected google url ${u}`)};
  const env={GOOGLE_API_KEY:"common-key",GOOGLE_CIVIC_API_KEY:"civic-key",GOOGLE_KNOWLEDGE_GRAPH_API_KEY:"kg-key",GOOGLE_PAGESPEED_API_KEY:"pagespeed-key"};
  const civic=await runAdapter("google_civic","elections",{},env);assert.equal(civic.items.length,1);assert.equal(gCalls[0].searchParams.get("key"),"civic-key");
  const kg=await runAdapter("google_knowledge_graph","search",{query:"China",limit:1},env);assert.equal(kg.items.length,1);assert.equal(gCalls[1].searchParams.get("key"),"kg-key");
  const ps=await runAdapter("google_pagespeed","analyze",{url:"https://example.com",strategy:"mobile",category:"performance"},env);assert.equal(ps.data.id,"https://example.com");assert.equal(ps.timeout_ms,35000);assert.equal(gCalls[2].searchParams.get("key"),"pagespeed-key");assert.equal(gCalls[3].searchParams.has("key"),false);
  console.log(JSON.stringify({ok:true,suite:"runtime-repairs",pkulaw_official_cli_direct_jsonrpc:true,pkulaw_timeout_ms:60000,google_provider_specific_keys:true,pagespeed_timeout_ms:35000,pagespeed_optional_key_fallback:true}));
}finally{globalThis.fetch=realFetch}
