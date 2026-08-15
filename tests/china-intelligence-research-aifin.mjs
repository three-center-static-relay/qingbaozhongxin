import assert from "node:assert/strict";
import fs from "node:fs";
import {CATALOG} from "../src/catalog.js";
import {OPERATIONS,runAdapter} from "../src/adapters.js";

const registry=JSON.parse(fs.readFileSync(new URL("../data-assets/china-intelligence-research-database-registry.json",import.meta.url),"utf8"));
assert.ok(Array.isArray(registry.sources));
assert.ok(registry.sources.length>=80,`expected >=80 China intelligence sources, got ${registry.sources.length}`);
const ids=new Set(registry.sources.map(x=>x.id));
for(const id of [
  "china_nbs","pbc","safe","customs","mof","ndrc","miit","nea","mee","mot","caac","samr","cnipa","ggzy","ccgp","creditchina","gsxt",
  "sse","szse","cninfo","chinabond","chinamoney","shfe","dce","czce",
  "npcssd","nstrs","ckcest","science_db_cas","geodata_cn",
  "cfps","charls","cgss","chfs","cmes","ceps","clds","clhls",
  "cnrds","csmar","resset","eps_data","cnki","wanfang",
  "drc","cicir","ciis","cciee","caict","ccid","cf40","nifd","pku_nsd","tsinghua_ciss",
  "cflp","caam","cec","cisa","iresearch","analysys","questmobile",
  "aifin_market","wind_terminal","ifind","eastmoney_choice"
]) assert.ok(ids.has(id),`missing China source ${id}`);

assert.ok(CATALOG.aifin_market,"AIFin Market missing from runtime catalog");
assert.equal(CATALOG.aifin_market.secrets?.[0],"WIND_API_KEY");
assert.equal(CATALOG.aifin_market.install_manifest,"https://aifinmarket.wind.com.cn/skill.md");
assert.equal(CATALOG.aifin_market.registration_url,"https://aifinmarket.wind.com.cn/#/user/overview");
assert.equal(CATALOG.aifin_market.adapter,"aifin_market.live-mcp");
assert.equal(CATALOG.aifin_market.official_tool_count,34);
assert.ok(CATALOG.aifin_market.scope.includes("A-share-HK-US-equities"));

const expectedTools=[
  "get_stock_price_indicators","get_risk_metrics","get_stock_events","get_stock_kline","get_stock_basicinfo","get_stock_equity_holders","get_stock_fundamentals","get_stock_quote","get_stock_technicals","search_stocks",
  "get_fund_price_indicators","get_fund_kline","get_fund_financials","get_fund_holdings","get_fund_company_info","get_fund_quote","get_fund_info","get_fund_holders","get_fund_performance","search_funds",
  "get_index_technicals","get_index_quote","get_index_kline","get_index_fundamentals","get_index_price_indicators","get_index_basicinfo",
  "get_bond_basicinfo","get_bond_issuer_info","get_bond_market_data","get_bond_financial_data",
  "get_company_announcements","get_financial_news","natural_language_get_edb_data","get_financial_data"
];
for(const tool of expectedTools)assert.ok(OPERATIONS.aifin_market?.includes(tool),`missing AIFin tool ${tool}`);
assert.ok(OPERATIONS.aifin_market?.includes("list_tools"));
assert.equal(expectedTools.length,34);

await assert.rejects(()=>runAdapter("aifin_market","get_stock_price_indicators",{windcode:"600519.SH"},{}),/UPSTREAM_AUTH_FAILED/);

const originalFetch=globalThis.fetch;
const calls=[];
globalThis.fetch=async(url,init={})=>{
  calls.push({url:String(url),headers:init.headers,body:JSON.parse(init.body)});
  const method=JSON.parse(init.body).method;
  return new Response(JSON.stringify({jsonrpc:"2.0",id:1,result:method==="initialize"?{protocolVersion:"2025-03-26",capabilities:{}}:{content:[{type:"text",text:JSON.stringify({data:{code:0,message:"OK",rows:[{"windcode":"600519.SH","price":1}]}})}]}}),{status:200,headers:{"content-type":"application/json"}});
};
try{
  const out=await runAdapter("aifin_market","get_stock_price_indicators",{windcode:"600519.SH"},{WIND_API_KEY:"test_key"});
  assert.equal(out.server_type,"stock_data");
  assert.equal(out.source,"Wind AIFin Market");
  assert.equal(calls.length,2,"expected initialize + tools/call only");
  assert.equal(calls[0].url,"https://mcp.wind.com.cn/vserver_stock_data/mcp/");
  assert.equal(calls[1].url,"https://mcp.wind.com.cn/vserver_stock_data/mcp/");
  assert.equal(calls[0].headers.Authorization,"Bearer test_key");
  assert.equal(calls[0].body.method,"initialize");
  assert.equal(calls[1].body.method,"tools/call");
  assert.equal(calls[1].body.params.name,"get_stock_price_indicators");
  assert.equal(calls[1].body.params.arguments.windcode,"600519.SH");
}finally{globalThis.fetch=originalFetch}

console.log(JSON.stringify({ok:true,china_sources:registry.sources.length,aifin_catalog:true,aifin_live:true,aifin_tools:expectedTools.length}));
