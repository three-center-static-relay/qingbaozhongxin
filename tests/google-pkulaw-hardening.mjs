import assert from "node:assert/strict";
import {runAdapter} from "../src/adapters-extra31.js";

const realFetch=globalThis.fetch;
const calls=[];
const j=(x,status=200,headers={"content-type":"application/json"})=>new Response(JSON.stringify(x),{status,headers});
const tools={
  "mcp-law":[{name:"get_law_list",description:"law list",inputSchema:{type:"object"}}],
  "mcp-law-search-service":[{name:"search_article",description:"law semantic search",inputSchema:{type:"object"}}],
  "mcp-case-search-service":[{name:"search_case",description:"case semantic search",inputSchema:{type:"object"}}]
};

globalThis.fetch=async(url,init={})=>{
  const u=String(url),method=String(init.method||"GET").toUpperCase();
  calls.push({u,method,headers:init.headers||{},body:init.body||null});
  if(u.startsWith("https://bigquery.googleapis.com/")){
    assert.equal(init.headers?.authorization,"Bearer unit-google-token");
    const body=JSON.parse(String(init.body||"{}"));
    if(body.query.includes("INFORMATION_SCHEMA.PARTITIONS")){
      assert.equal(body.maximumBytesBilled,"20000000");
      return j({schema:{fields:[{name:"latest_partition",type:"STRING"}]},rows:[{f:[{v:"20260813"}]}],totalRows:"1",jobComplete:true,totalBytesProcessed:"10485760"});
    }
    if(body.query.includes("bigquery-public-data.google_trends.international_top_terms")){
      assert.ok(body.query.includes("refresh_date=DATE('2026-08-13')"));
      assert.equal(body.maximumBytesBilled,"600000000");
      return j({schema:{fields:[{name:"refresh_date",type:"DATE"},{name:"country_code",type:"STRING"},{name:"term",type:"STRING"},{name:"rank",type:"INTEGER"}]},rows:[{f:[{v:"2026-08-13"},{v:"US"},{v:"test trend"},{v:"1"}]}],totalRows:"1",jobComplete:true,totalBytesProcessed:"509607936"});
    }
    throw new Error(`unexpected BigQuery query ${body.query}`);
  }
  if(u.startsWith("https://patents.google.com/xhr/query")){
    assert.equal(method,"GET");
    const q=new URL(u).searchParams.get("url")||"";
    assert.ok(q.includes("q=battery"));
    return j({results:{total_num_results:112795,total_num_pages:100,cluster:[{result:[{patent:{publication_number:"US1234567A1",title:"<b>Battery</b> management system",snippet:"A bounded <b>battery</b> system",priority_date:"2025-01-02",filing_date:"2025-02-03",publication_date:"2026-01-04",inventor:"A Inventor",assignee:"Example Corp",language:"en"}}]}]}});
  }
  if(u.startsWith("https://apim-gateway.pkulaw.com/")){
    assert.equal(init.headers?.authorization,"Bearer unit-token");
    const svc=u.slice("https://apim-gateway.pkulaw.com/".length),body=JSON.parse(String(init.body||"{}"));
    if(body.method==="tools/list")return j({jsonrpc:"2.0",id:body.id,result:{tools:tools[svc]||[]}});
    if(body.method==="tools/call"){
      if(svc==="mcp-law")return j({jsonrpc:"2.0",id:body.id,result:{content:[{type:"text",text:'{"Message":"未找到数据","Data":[],"Total":0}'}],structuredContent:{Message:"未找到数据",Data:[],Total:0},isError:false}});
      if(svc==="mcp-law-search-service")return j({jsonrpc:"2.0",id:body.id,result:{content:[{type:"text",text:'{"result":[]}'}],structuredContent:{result:[]},isError:false}});
      if(svc==="mcp-case-search-service")return j({jsonrpc:"2.0",id:body.id,result:{content:[{type:"text",text:'[{"title":"劳动合同纠纷案","case_number":"(2026)测1号"}]'}],isError:false}});
    }
    throw new Error(`unexpected PKULaw request ${svc} ${body.method}`);
  }
  throw new Error(`unexpected fetch ${u}`);
};

try{
  const genv={GOOGLE_CLOUD_ACCESS_TOKEN:"unit-google-token",GOOGLE_CLOUD_PROJECT:"unit-project"};
  const tr=await runAdapter("google_trends_public","top_terms",{country_code:"US",limit:1},genv);
  assert.equal(tr.latest_refresh_date,"2026-08-13");
  assert.equal(tr.refresh_date_source,"latest-partition-metadata");
  assert.equal(tr.partition_metadata_bytes_processed,"10485760");
  assert.equal(tr.data.rows.length,1);
  const pat=await runAdapter("google_patents_public","search",{query:"battery",country_code:"US",from_year:2025,limit:1},{});
  assert.equal(pat.bigquery_bytes_billed,0);
  assert.equal(pat.query_mode,"bounded-public-search-no-bigquery-scan");
  assert.equal(pat.items.length,1);
  assert.equal(pat.items[0].publication_number,"US1234567A1");
  assert.equal(pat.items[0].title,"Battery management system");
  const pk=await runAdapter("pkulaw","health_check",{}, {PKULAW_MCP_TOKEN:"Bearer unit-token"});
  assert.equal(pk.auth_ok,true);
  assert.equal(pk.transport_ok,true);
  assert.equal(pk.law_data_ok,false);
  assert.equal(pk.case_data_ok,true);
  assert.equal(pk.status,"degraded-law-data");
  assert.deepEqual(pk.checks,{law_list:"empty",law_search:"empty",case_search:"nonempty"});
  console.log(JSON.stringify({ok:true,suite:"google-pkulaw-hardening",trends_latest_partition:true,trends_bounded_bytes:true,patents_zero_bigquery_scan:true,pkulaw_split_health:true}));
}finally{globalThis.fetch=realFetch}
