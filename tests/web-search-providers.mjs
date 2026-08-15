import assert from "node:assert/strict";
import {OPERATIONS,runAdapter} from "../src/adapters-extra39.js";
import {OPERATIONS as ALL_OPERATIONS,runAdapter as runAll} from "../src/adapters.js";
import {WEB_SEARCH_CATALOG} from "../src/catalog-web-search.js";
import {CATALOG} from "../src/catalog.js";

for(const p of ["exa","tavily","firecrawl","jina"]){
  assert.deepEqual(OPERATIONS[p],["search"]);
  assert.deepEqual(ALL_OPERATIONS[p],["search"]);
  assert.ok(CATALOG[p],`${p} must be aggregated into the live catalog`);
  assert.equal(CATALOG[p].arbitrary_url,false);
  assert.equal(CATALOG[p].write,false);
  assert.equal(WEB_SEARCH_CATALOG[p].arbitrary_url,false);
  assert.equal(WEB_SEARCH_CATALOG[p].write,false);
  assert.ok(WEB_SEARCH_CATALOG[p].secrets?.length===1);
}

const realFetch=globalThis.fetch;
const calls=[];
function response(body,status=200){return new Response(JSON.stringify(body),{status,headers:{"content-type":"application/json"}})}
try{
  globalThis.fetch=async(url,init={})=>{const u=new URL(String(url));const headers=Object.fromEntries(Object.entries(init.headers||{}).map(([k,v])=>[String(k).toLowerCase(),String(v)]));let body={};try{body=JSON.parse(init.body||"{}") }catch{}calls.push({u,headers,body,method:init.method||"GET"});
    if(u.hostname==="api.exa.ai")return response({requestId:"exa-1",results:[{title:"Exa result",url:"https://example.com/exa",highlights:["h1"]}],costDollars:{total:0.007}});
    if(u.hostname==="api.tavily.com")return response({request_id:"tv-1",results:[{title:"Tavily result",url:"https://example.com/tavily",content:"snippet",score:0.9}],usage:{credits:1}});
    if(u.hostname==="api.firecrawl.dev")return response({success:true,data:{web:[{title:"Firecrawl result",url:"https://example.com/firecrawl",description:"snippet"}]}});
    if(u.hostname==="s.jina.ai")return response([{title:"Jina result",url:"https://example.com/jina",content:"snippet"}]);
    throw new Error(`unexpected host ${u.hostname}`)
  };
  const env={EXA_API_KEY:"exa-key",TAVILY_API_KEY:"tv-key",FIRECRAWL_API_KEY:"fc-key",JINA_API_KEY:"jina-key"};
  const exa=await runAll("exa","search",{query:"test",limit:3},env);assert.equal(exa.items.length,1);assert.equal(exa.items[0].highlights[0],"h1");
  const tavily=await runAll("tavily","search",{query:"test",limit:3},env);assert.equal(tavily.items.length,1);assert.equal(tavily.usage.credits,1);
  const firecrawl=await runAll("firecrawl","search",{query:"test",limit:3},env);assert.equal(firecrawl.items.length,1);assert.equal(firecrawl.success,true);
  const jina=await runAll("jina","search",{query:"test"},env);assert.equal(jina.items.length,1);
  assert.equal(calls.length,4);
  assert.equal(calls[0].u.href,"https://api.exa.ai/search");assert.equal(calls[0].headers["x-api-key"],"exa-key");assert.equal(calls[0].body.contents.highlights,true);assert.equal(calls[0].body.numResults,3);
  assert.equal(calls[1].u.href,"https://api.tavily.com/search");assert.equal(calls[1].headers.authorization,"Bearer tv-key");assert.equal(calls[1].body.search_depth,"basic");assert.equal(calls[1].body.include_answer,false);assert.equal(calls[1].body.include_raw_content,false);
  assert.equal(calls[2].u.href,"https://api.firecrawl.dev/v2/search");assert.equal(calls[2].headers.authorization,"Bearer fc-key");assert.deepEqual(calls[2].body.sources,["web"]);assert.equal(calls[2].body.scrapeOptions,undefined);
  assert.equal(calls[3].u.origin,"https://s.jina.ai");assert.equal(calls[3].u.searchParams.get("q"),"test");assert.equal(calls[3].headers.authorization,"Bearer jina-key");
  await assert.rejects(()=>runAdapter("exa","search",{query:"x"},{}),/UPSTREAM_AUTH_FAILED/);
  await assert.rejects(()=>runAdapter("tavily","search",{query:"x"},{}),/UPSTREAM_AUTH_FAILED/);
  await assert.rejects(()=>runAdapter("firecrawl","search",{query:"x"},{}),/UPSTREAM_AUTH_FAILED/);
  await assert.rejects(()=>runAdapter("jina","search",{query:"x"},{}),/UPSTREAM_AUTH_FAILED/);
  console.log(JSON.stringify({ok:true,suite:"web-search-providers",providers:["exa","tavily","firecrawl","jina"],operations:"search-only",catalog_aggregated:true,aggregate_router:true,arbitrary_url:false,write:false,bounded:true}));
}finally{globalThis.fetch=realFetch}