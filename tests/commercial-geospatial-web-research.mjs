import assert from "node:assert/strict";
import {OPERATIONS,runAdapter} from "../src/adapters-extra39.js";
import {FREE_COMMERCIAL_SPATIAL_CATALOG} from "../src/catalog-free-commercial-spatial.js";
import {GEOSPATIAL_COMMERCIAL_DOMAIN} from "../src/domains/geospatial-commercial.js";

assert.deepEqual(OPERATIONS.commercial_web_research,["multi_search"]);
assert.ok(FREE_COMMERCIAL_SPATIAL_CATALOG.commercial_web_research);
assert.equal(FREE_COMMERCIAL_SPATIAL_CATALOG.commercial_web_research.write,false);
assert.ok(GEOSPATIAL_COMMERCIAL_DOMAIN.provider_groups.web_market_intelligence.includes("commercial_web_research"));
assert.ok(!GEOSPATIAL_COMMERCIAL_DOMAIN.provider_groups.air_quality_environment);
assert.ok(!GEOSPATIAL_COMMERCIAL_DOMAIN.feature_layers.includes("air_quality_exposure"));

const realFetch=globalThis.fetch;
const calls=[];
function response(body,status=200){return new Response(JSON.stringify(body),{status,headers:{"content-type":"application/json"}})}
try{
  globalThis.fetch=async(url,init={})=>{
    const u=new URL(String(url));
    const headers=Object.fromEntries(Object.entries(init.headers||{}).map(([k,v])=>[String(k).toLowerCase(),String(v)]));
    let body={};try{body=JSON.parse(init.body||"{}") }catch{}
    calls.push({u,headers,body});
    const n=calls.length;
    if(u.hostname==="api.exa.ai")return response({requestId:`exa-${n}`,results:[{title:`Exa ${n}`,url:`https://example.com/exa-${n}`,highlights:["planning market evidence"]}],costDollars:{total:0.001}});
    if(u.hostname==="api.tavily.com")return response({request_id:`tv-${n}`,results:[{title:`Tavily ${n}`,url:`https://example.com/tavily-${n}`,content:"commercial evidence",score:0.9}],usage:{credits:1}});
    if(u.hostname==="api.firecrawl.dev")return response({success:true,data:{web:[{title:`Firecrawl ${n}`,url:`https://example.com/firecrawl-${n}`,description:"market evidence"}]}});
    throw new Error(`unexpected host ${u.hostname}`)
  };

  const env={EXA_API_KEY:"exa-key",TAVILY_API_KEY:"tv-key",FIRECRAWL_API_KEY:"fc-key"};
  const out=await runAdapter("commercial_web_research","multi_search",{query:"购物中心",city:"福州",rounds:2,limit_per_provider:2},env);
  assert.equal(out.domain,"geospatial-commercial");
  assert.equal(out.observed_mobile_lbs,false);
  assert.equal(out.round_count,2);
  assert.equal(out.provider_count,3);
  assert.equal(out.runs.length,6);
  assert.equal(out.failures.length,0);
  assert.equal(out.items.length,6);
  assert.equal(calls.length,6);
  assert.equal(calls.filter(x=>x.u.hostname==="api.exa.ai").length,2);
  assert.equal(calls.filter(x=>x.u.hostname==="api.tavily.com").length,2);
  assert.equal(calls.filter(x=>x.u.hostname==="api.firecrawl.dev").length,2);
  assert.ok(out.queries.every(q=>q.includes("福州")));

  calls.length=0;
  const degraded=await runAdapter("commercial_web_research","multi_search",{query:"商业项目",city:"福州",rounds:1},{TAVILY_API_KEY:"tv-key"});
  assert.equal(degraded.provider_count,1);
  assert.equal(degraded.runs[0].provider,"tavily");
  assert.equal(degraded.observed_mobile_lbs,false);
  assert.equal(calls.length,1);

  await assert.rejects(()=>runAdapter("commercial_web_research","multi_search",{query:"x"},{}),/UPSTREAM_AUTH_FAILED/);
  console.log(JSON.stringify({ok:true,suite:"commercial-geospatial-web-research",providers:["exa","tavily","firecrawl"],rounds_max:3,observed_mobile_lbs:false,air_quality_removed_from_domain:true}));
}finally{globalThis.fetch=realFetch}
