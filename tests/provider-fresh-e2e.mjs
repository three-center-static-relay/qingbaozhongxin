import assert from "node:assert/strict";
import {createTestHarness} from "wrangler";
import {http,HttpResponse} from "msw";
import {setupServer} from "msw/node";

const j=x=>HttpResponse.json(x);
const network=setupServer(
  http.get("https://bigquery.googleapis.com/bigquery/v2/projects/bigquery-public-data/datasets/google_trends/tables/international_top_terms",()=>j({tableReference:{projectId:"bigquery-public-data",datasetId:"google_trends",tableId:"international_top_terms"}})),
  http.get("https://earthengine.googleapis.com/v1/projects/earthengine-public/assets/GOOGLE/DYNAMICWORLD/V1",()=>j({name:"projects/earthengine-public/assets/GOOGLE/DYNAMICWORLD/V1",type:"IMAGE_COLLECTION"})),
  http.get("https://patents.google.com/xhr/query",()=>j({results:{total_num_results:1,total_num_pages:1,cluster:[{result:[{patent:{publication_number:"US1A1",title:"Battery",snippet:"Battery",priority_date:"2025-01-01"}}]}]}})),
  http.get("https://secure.geonames.org/searchJSON",({request})=>{
    const u=new URL(request.url);assert.equal(u.searchParams.get("username"),"unit-geonames");assert.equal(u.searchParams.get("q"),"Fuzhou");assert.equal(u.searchParams.get("country"),"CN");return j({geonames:[{geonameId:1810821,name:"Fuzhou",countryCode:"CN",lat:"26.0614",lng:"119.3061"}]});
  }),
  http.post("https://api.mobilitydatabase.org/v1/tokens",async({request})=>{
    const b=await request.json();assert.equal(b.refresh_token,"unit-mobility-refresh");return j({access_token:"unit-mobility-access"});
  }),
  http.get("https://api.mobilitydatabase.org/v1/metadata",({request})=>{
    assert.equal(request.headers.get("authorization"),"Bearer unit-mobility-access");return j({metadata:{catalog:"MobilityDatabase",status:"ok"}});
  }),
  http.post("https://apim-gateway.pkulaw.com/:service",async({request,params})=>{
    const b=await request.json(),svc=String(params.service);
    if(b.method==="tools/list"){
      if(svc==="mcp-law")return j({jsonrpc:"2.0",id:b.id,result:{tools:[{name:"get_law_list",inputSchema:{type:"object",properties:{keyword:{type:"string"}},required:["keyword"]}}]}});
      if(svc==="mcp-law-search-service")return j({jsonrpc:"2.0",id:b.id,result:{tools:[{name:"search_article",inputSchema:{type:"object",properties:{query:{type:"string"},limit:{type:"integer"}},required:["query"]}}]}});
      if(svc==="mcp-case-search-service")return j({jsonrpc:"2.0",id:b.id,result:{tools:[{name:"search_case",inputSchema:{type:"object",properties:{query:{type:"string"},size:{type:"integer"}},required:["query"]}}]}});
      return j({jsonrpc:"2.0",id:b.id,result:{tools:[]}});
    }
    if(b.method==="tools/call"){
      if(svc==="mcp-law")return j({jsonrpc:"2.0",id:b.id,result:{content:[{type:"text",text:'{"Data":[],"Total":0,"Message":"未找到数据"}'}],structuredContent:{Data:[],Total:0},isError:false}});
      if(svc==="mcp-law-search-service")return j({jsonrpc:"2.0",id:b.id,result:{structuredContent:{result:[{title:"劳动合同法"}]},isError:false}});
      if(svc==="mcp-case-search-service")return j({jsonrpc:"2.0",id:b.id,result:{content:[{type:"text",text:'[{"title":"劳动合同纠纷案"}]'}],isError:false}});
    }
    return j({error:"unexpected"},{status:500});
  }),
  http.post("https://mcp.wind.com.cn/vserver_stock_data/mcp/",async({request})=>{
    assert.equal(request.headers.get("authorization"),"Bearer unit-wind-key");
    const b=await request.json();
    if(b.method==="initialize")return j({jsonrpc:"2.0",id:b.id,result:{protocolVersion:"2025-03-26",capabilities:{}}});
    if(b.method==="tools/call"){
      assert.equal(b.params?.name,"get_stock_price_indicators");
      assert.equal(b.params?.arguments?.windcode,"600519.SH");
      return j({jsonrpc:"2.0",id:b.id,result:{content:[{type:"text",text:JSON.stringify({data:{code:0,message:"OK",rows:[{windcode:"600519.SH",price:1}]}})}],isError:false}});
    }
    return j({jsonrpc:"2.0",id:b.id,error:{code:-32601,message:"unexpected method"}},{status:400});
  })
);
network.listen({onUnhandledRequest:"error"});
const server=createTestHarness({workers:[{configPath:"./wrangler.provider-selftest.jsonc"}]});
try{
  await server.listen();
  const r=await server.fetch("https://intelligence.internal/v1/selftest/providers",{method:"POST"}),b=await r.json();
  assert.equal(r.status,200);assert.equal(b.ok,true);assert.equal(b.selftest,"provider-fresh-e2e");assert.equal(b.ai_called,false);assert.equal(b.providers_checked,7);assert.equal(b.bigquery_query_scan,false);assert.equal(b.bigquery_bytes_billed,0);assert.equal(b.checks.length,7);assert.ok(b.checks.every(x=>x.ok===true&&x.terminal_status==="pass"&&x.lock_released===true));assert.equal(b.checks.find(x=>x.id==="pkulaw-health")?.status,"healthy");assert.equal(b.checks.find(x=>x.id==="google-patents-public")?.bigquery_bytes_billed,0);const wind=b.checks.find(x=>x.id==="wind-aifin-stock");assert.equal(wind?.source,"Wind AIFin Market");assert.equal(wind?.server_type,"stock_data");assert.equal(wind?.has_data,true);assert.equal(wind?.tool,"get_stock_price_indicators");const geo=b.checks.find(x=>x.id==="geonames-fuzhou");assert.equal(geo?.free_tier_only,true);assert.ok(geo?.item_count>0);assert.equal(geo?.first_country,"CN");const mobility=b.checks.find(x=>x.id==="mobilitydatabase-metadata");assert.equal(mobility?.free_account_only,true);assert.equal(mobility?.has_data,true);assert.equal(mobility?.refresh_token_supported,true);assert.match(b.receipt_digest,/^[a-f0-9]{64}$/);
  const denied=await server.fetch("https://public.example/v1/selftest/providers",{method:"POST"});assert.equal(denied.status,403);
  console.log(JSON.stringify({ok:true,suite:"provider-fresh-e2e",checks:7,internal_only:true,bigquery_zero_scan:true,pkulaw_health:true,wind_aifin:true,geonames:true,mobilitydatabase_refresh_token:true}));
}finally{await server.close().catch(()=>{});network.close()}
