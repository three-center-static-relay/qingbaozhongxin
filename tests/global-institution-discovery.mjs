import assert from "node:assert/strict";
import {CATALOG} from "../src/catalog.js";
import {OPERATIONS,runAdapter} from "../src/adapters.js";

for(const p of ["global_institution_discovery","gleif"]){
  assert.ok(CATALOG[p],`${p} must be in the aggregated catalog`);
  assert.ok(OPERATIONS[p]?.includes("search"),`${p}.search must be live-routable`);
  assert.equal(CATALOG[p].arbitrary_url,false);
  assert.equal(CATALOG[p].write,false);
}
assert.deepEqual(CATALOG.global_institution_discovery.secrets,["EXA_API_KEY","TAVILY_API_KEY"]);
assert.match(CATALOG.global_institution_discovery.selection_policy,/top-tier-free only/);
for(const removed of ["opencorporates_global","whed_global","opendoar_global","edinet_japan"])assert.equal(CATALOG[removed],undefined,`${removed} must not be in top-tier-free catalog until free machine access is independently verified`);

const realFetch=globalThis.fetch;
const calls=[];
function response(body,status=200){return new Response(JSON.stringify(body),{status,headers:{"content-type":"application/json"}})}
try{
  globalThis.fetch=async(url,init={})=>{
    const u=new URL(String(url));
    let body={};try{body=JSON.parse(init.body||"{}") }catch{}
    calls.push({host:u.hostname,body,headers:init.headers||{}});
    if(u.hostname==="api.exa.ai")return response({requestId:`exa-${calls.length}`,results:[
      {title:"National Statistics Office Official Data API",url:"https://statistics.example.gov/api",highlights:["national official free public API"]},
      {title:"City of Example Open Data Portal",url:"https://city.example.gov/data",highlights:["municipal local data"]}
    ],costDollars:{total:0.001}});
    if(u.hostname==="api.tavily.com")return response({request_id:`tv-${calls.length}`,results:[{title:"International Banking Standards Authority",url:"https://example.int/register",content:"global official public register",score:0.9}],usage:{credits:1}});
    if(u.hostname==="api.gleif.org")return response({meta:{pagination:{total:1}},data:[{id:"5493001KJTIIGC8Y1R12",attributes:{entity:{legalName:{name:"Example Corp"},legalAddress:{country:"US",city:"New York"}},registration:{status:"ISSUED"}}}]});
    throw new Error(`unexpected host ${u.hostname}`);
  };
  const env={EXA_API_KEY:"exa-key",TAVILY_API_KEY:"tv-key"};
  const out=await runAdapter("global_institution_discovery","search",{rounds:3,limit_per_engine:5,country:"Japan",industry:"semiconductors"},env);
  assert.equal(out.rounds.length,3);
  assert.equal(calls.filter(x=>x.host==="api.exa.ai").length,3);
  assert.equal(calls.filter(x=>x.host==="api.tavily.com").length,3);
  assert.equal(out.scope_profile,"top-tier-free");
  assert.equal(out.selection_policy.top_tier_only,true);
  assert.equal(out.selection_policy.free_only,true);
  assert.ok(out.items.length>=2);
  assert.equal(out.items.some(x=>/City of Example/i.test(x.title)),false,"obvious municipal/local source must be filtered out");
  assert.ok(out.rounds.every(x=>/free/i.test(x.query)&&/exclude/i.test(x.query)),"every discovery round must explicitly request free access and exclusions");
  assert.equal(out.discovery_only,true);
  assert.ok(out.rounds.every(x=>x.exa_ok&&x.tavily_ok));
  const gleif=await runAdapter("gleif","search",{query:"Example",limit:5});
  assert.equal(gleif.items.length,1);
  assert.equal(gleif.items[0].legal_name,"Example Corp");
  await assert.rejects(()=>runAdapter("global_institution_discovery","search",{rounds:1},{}),/DUAL_SEARCH_INCOMPLETE/);
  console.log(JSON.stringify({ok:true,suite:"global-institution-discovery",profile:"top-tier-free",dual_engine:true,rounds:3,providers:["exa","tavily"],aggregate_router:true,local_filter:true,discovery_only:true,write:false}));
}finally{globalThis.fetch=realFetch}
