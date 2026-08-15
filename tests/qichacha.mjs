import assert from "node:assert/strict";
import {__test,qichachaMeta,runAdapter} from "../src/adapters-extra13.js";

const meta=qichachaMeta();
assert.equal(meta.integration,"official-agent-mcp");
assert.equal(meta.secret_name,"QICHACHA_API_KEY");
assert.equal(Object.keys(meta.servers).length,10);
assert.equal(meta.servers.company.url,"https://agent.qcc.com/mcp/company/stream");
assert.equal(meta.servers.history.enterprise_verification_required,true);
assert.equal(meta.arbitrary_server,false);
assert.equal(meta.arbitrary_url,false);
assert.equal(meta.local_document_mcp,false);
assert.equal(__test.parseMcp('data: {"jsonrpc":"2.0","id":"1","result":{"ok":true}}\n\n',"text/event-stream").result.ok,true);

const oldFetch=globalThis.fetch;
try{
  const token="synthetic-qcc-agent-key";
  const calls=[];
  globalThis.fetch=async(url,init={})=>{
    const body=init.body?JSON.parse(String(init.body)):null;
    calls.push({url:String(url),headers:init.headers||{},body,method:init.method||"GET"});
    if(init.method==="DELETE")return new Response(null,{status:204});
    if(body?.method==="tools/list")return new Response(JSON.stringify({jsonrpc:"2.0",id:body.id,result:{tools:[{name:"get_company_registration_info",description:"企业工商登记信息",inputSchema:{type:"object",properties:{searchKey:{type:"string"}}}}]}}),{status:200,headers:{"content-type":"application/json"}});
    if(body?.method==="tools/call")return new Response(JSON.stringify({jsonrpc:"2.0",id:body.id,result:{content:[{type:"text",text:"企查查科技股份有限公司"}],isError:false}}),{status:200,headers:{"content-type":"application/json"}});
    throw new Error(`UNEXPECTED_MCP:${body?.method}`);
  };
  const list=await runAdapter("qichacha","tools_list",{server:"company"},{QICHACHA_API_KEY:token});
  assert.equal(list.server,"qcc-company");assert.equal(list.tools[0].name,"get_company_registration_info");
  const first=calls[0];assert.equal(first.url,"https://agent.qcc.com/mcp/company/stream");assert.equal(first.headers.authorization,`Bearer ${token}`);assert.equal(first.headers["mcp-protocol-version"],"2026-07-28");assert.equal(first.headers["mcp-method"],"tools/list");
  const out=await runAdapter("qichacha","tool_call",{server:"company",tool:"get_company_registration_info",arguments:{searchKey:"企查查科技股份有限公司"}},{QICHACHA_API_KEY:token});
  assert.equal(out.server,"qcc-company");assert.equal(out.tool,"get_company_registration_info");assert.equal(out.result.isError,false);
  const call=calls.find(x=>x.body?.method==="tools/call");assert.equal(call.headers["mcp-name"],"get_company_registration_info");assert.equal(call.body.params.arguments.searchKey,"企查查科技股份有限公司");
  assert.equal(JSON.stringify(out).includes(token),false);
  const servers=await runAdapter("qichacha","servers",{},{});assert.equal(Object.keys(servers.servers).length,10);
  await assert.rejects(()=>runAdapter("qichacha","tools_list",{server:"company"},{}),/UPSTREAM_AUTH_FAILED/);
  await assert.rejects(()=>runAdapter("qichacha","tools_list",{server:"evil"},{QICHACHA_API_KEY:token}),/INVALID_QICHACHA_SERVER/);
  await assert.rejects(()=>runAdapter("qichacha","tool_call",{server:"company",tool:"bad tool",arguments:{}},{QICHACHA_API_KEY:token}),/INVALID_QICHACHA_TOOL/);
  await assert.rejects(()=>runAdapter("qichacha","tool_call",{server:"company",tool:"x",arguments:{q:"x".repeat(12001)}},{QICHACHA_API_KEY:token}),/ARGUMENT_STRING_TOO_LONG/);
  console.log(JSON.stringify({ok:true,suite:"qichacha-agent-mcp-contract",single_bearer_key:true,ten_fixed_servers:true,stateless_mcp:true,sse_parse:true,tool_list:true,tool_call:true,secret_not_echoed:true,bounded_arguments:true,arbitrary_server_denied:true}));
}finally{globalThis.fetch=oldFetch}
