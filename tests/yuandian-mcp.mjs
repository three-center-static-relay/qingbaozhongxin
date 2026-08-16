import assert from "node:assert/strict";
import fs from "node:fs";

const path=new URL("../src/adapters-extra7.js",import.meta.url);
const source=fs.readFileSync(path,"utf8");
for(const marker of [
  "https://open.chineselaw.com/mcp/law/stream",
  "https://open.chineselaw.com/mcp/case/stream",
  "https://open.chineselaw.com/mcp/company/stream",
  "yuandian_law_vector_search",
  "yuandian_case_vector_search",
  "yuandian_rh_enterpriseSearch",
  "notifications/initialized",
  "tools/call",
  "mcp-protocol-version",
  "mcp-session-id",
  "authorization:`Bearer ${key}`"
]) assert.equal(source.includes(marker),true,`missing MCP marker: ${marker}`);
assert.equal(source.includes("https://open.chineselaw.com/open/law_vector_search"),false,"YuanDian law REST execution must not remain");
assert.equal(source.includes("X-API-Key"),false,"YuanDian MCP must use Bearer auth, not REST X-API-Key");

const moduleUrl=`data:text/javascript;base64,${Buffer.from(source).toString("base64")}`;
const {runAdapter}=await import(moduleUrl);
const calls=[];
globalThis.fetch=async(url,init={})=>{
  const headers=Object.fromEntries(new Headers(init.headers));
  const body=init.body?JSON.parse(init.body):null;
  calls.push({url:String(url),headers,body});
  if(body?.method==="initialize")return new Response(JSON.stringify({jsonrpc:"2.0",id:body.id,result:{protocolVersion:"2025-11-25",capabilities:{tools:{}}}}),{status:200,headers:{"content-type":"application/json","mcp-session-id":"test-session"}});
  if(body?.method==="notifications/initialized")return new Response("",{status:202});
  if(body?.method==="tools/call")return new Response(JSON.stringify({jsonrpc:"2.0",id:body.id,result:{content:[{type:"text",text:JSON.stringify({code:201,extra:{fatiao:[{fgtitle:"地图管理条例"}]}})}]}}),{status:200,headers:{"content-type":"application/json"}});
  throw new Error(`unexpected fetch ${url}`);
};
const out=await runAdapter("yuandian","law_search",{query:"地图管理条例 第三十四条",return_num:3},{YD_API_KEY:"test-key"});
assert.equal(out.transport,"mcp-streamable-http");
assert.equal(out.mcp_tool,"yuandian_law_vector_search");
assert.equal(out.data?.extra?.fatiao?.[0]?.fgtitle,"地图管理条例");
assert.deepEqual(calls.map(x=>x.body?.method),["initialize","notifications/initialized","tools/call"]);
assert.equal(calls[0].headers.authorization,"Bearer test-key");
assert.equal(calls[2].headers["mcp-session-id"],"test-session");
assert.equal(calls[2].headers["mcp-protocol-version"],"2025-11-25");
assert.equal(calls[2].headers["mcp-name"],"yuandian_law_vector_search");
console.log(JSON.stringify({ok:true,test:"yuandian-mcp",transport:out.transport,tool:out.mcp_tool}));
