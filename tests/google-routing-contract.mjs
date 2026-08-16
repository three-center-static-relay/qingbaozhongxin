import assert from "node:assert/strict";
import {OPERATIONS,runAdapter} from "../src/adapters.js";

const realFetch=globalThis.fetch;
const json=(body,status=200)=>Response.json(body,{status,headers:{"content-type":"application/json"}});
const calls=[];
let patentBigQueryCalls=0;

globalThis.fetch=async(url,init={})=>{
  const u=new URL(String(url)),method=String(init.method||"GET").toUpperCase();
  calls.push({host:u.hostname,path:u.pathname,method,key:u.searchParams.get("key")});

  if(u.hostname==="www.googleapis.com"&&u.pathname==="/youtube/v3/search"){
    assert.equal(u.searchParams.get("key"),"shared-key");
    return json({items:[{id:{videoId:"yt-1"}}],pageInfo:{totalResults:1}});
  }
  if(u.hostname==="www.googleapis.com"&&u.pathname==="/books/v1/volumes"){
    assert.equal(u.searchParams.has("key"),false,"Google Books must remain usable without a key");
    return json({items:[{id:"book-1"}],totalItems:1});
  }
  if(u.hostname==="factchecktools.googleapis.com"){
    assert.equal(u.searchParams.get("key"),"shared-key");
    return json({claims:[{text:"claim-1"}]});
  }
  if(u.hostname==="chromeuxreport.googleapis.com"){
    assert.equal(method,"POST");
    assert.equal(u.searchParams.get("key"),"shared-key");
    return json({record:{key:{origin:"https://example.com"}}});
  }
  if(u.hostname==="www.googleapis.com"&&u.pathname==="/civicinfo/v2/elections"){
    assert.equal(u.searchParams.get("key"),"civic-key");
    return json({elections:[{id:"election-1"}]});
  }
  if(u.hostname==="kgsearch.googleapis.com"){
    assert.equal(u.searchParams.get("key"),"kg-key");
    return json({itemListElement:[{"@type":"EntitySearchResult"}]});
  }
  if(u.hostname==="www.googleapis.com"&&u.pathname==="/pagespeedonline/v5/runPagespeed"){
    assert.equal(u.searchParams.get("key"),"pagespeed-key");
    return json({id:"https://example.com",analysisUTCTimestamp:"2026-08-16T00:00:00Z",lighthouseResult:{categories:{performance:{score:1}}}});
  }
  if(u.hostname==="bigquery.googleapis.com"){
    assert.equal(init.headers?.authorization,"Bearer cloud-token");
    const body=JSON.parse(String(init.body||"{}"));
    if(String(body.query||"").includes("patents-public-data")){
      patentBigQueryCalls++;
      throw new Error("Google Patents must never route to legacy BigQuery full-text search");
    }
    if(String(body.query||"").includes("INFORMATION_SCHEMA.PARTITIONS")){
      assert.equal(body.maximumBytesBilled,"20000000");
      return json({schema:{fields:[{name:"latest_partition",type:"STRING"}]},rows:[{f:[{v:"20260815"}]}],totalRows:"1",jobComplete:true,totalBytesProcessed:"10485760"});
    }
    if(String(body.query||"").includes("bigquery-public-data.google_trends.international_top_terms")){
      assert.ok(body.query.includes("refresh_date=DATE('2026-08-15')"));
      return json({schema:{fields:[{name:"refresh_date",type:"DATE"},{name:"country_code",type:"STRING"},{name:"term",type:"STRING"},{name:"rank",type:"INTEGER"}]},rows:[{f:[{v:"2026-08-15"},{v:"US"},{v:"routing test"},{v:"1"}]}],totalRows:"1",jobComplete:true,totalBytesProcessed:"1000"});
    }
    assert.ok(String(body.query||"").includes("bigquery-public-data.samples.shakespeare"));
    return json({schema:{fields:[{name:"word",type:"STRING"}]},rows:[{f:[{v:"the"}]}],totalRows:"1",jobComplete:true,totalBytesProcessed:"1000"});
  }
  if(u.hostname==="earthengine.googleapis.com"){
    assert.equal(init.headers?.authorization,"Bearer cloud-token");
    assert.ok(u.pathname.includes("projects/earthengine-public/assets/GOOGLE/DYNAMICWORLD/V1"));
    return json({name:"projects/earthengine-public/assets/GOOGLE/DYNAMICWORLD/V1",type:"IMAGE_COLLECTION"});
  }
  if(u.hostname==="patents.google.com"&&u.pathname==="/xhr/query"){
    assert.equal(method,"GET");
    assert.equal(u.searchParams.has("key"),false);
    return json({results:{total_num_results:1,total_num_pages:1,cluster:[{result:[{patent:{publication_number:"US123A1",title:"<b>Battery</b> routing",snippet:"test",priority_date:"2026-01-01",filing_date:"2026-01-02",publication_date:"2026-02-01",language:"en"}}]}]}});
  }
  throw new Error(`unexpected Google routing request ${method} ${u}`);
};

try{
  const env={
    GOOGLE_API_KEY:"shared-key",
    GOOGLE_CIVIC_API_KEY:"civic-key",
    GOOGLE_KNOWLEDGE_GRAPH_API_KEY:"kg-key",
    GOOGLE_PAGESPEED_API_KEY:"pagespeed-key",
    GOOGLE_CLOUD_ACCESS_TOKEN:"cloud-token",
    GOOGLE_CLOUD_PROJECT:"unit-project"
  };

  for(const [provider,operation] of [
    ["youtube","search"],["google_books","search"],["google_factcheck","search"],["google_crux","record"],
    ["google_civic","elections"],["google_knowledge_graph","search"],["google_pagespeed","analyze"],
    ["bigquery","query"],["earthengine","asset_get"],["google_earth_observation","catalog"],
    ["google_trends_public","top_terms"],["google_patents_public","search"]
  ]) assert.ok(OPERATIONS[provider]?.includes(operation),`${provider}.${operation} must be globally routable`);
  assert.equal(OPERATIONS.google_trends_alpha,undefined,"limited-alpha Trends must remain catalog-only until access is explicitly enabled");

  const yt=await runAdapter("youtube","search",{query:"OpenAI",limit:1},env);assert.equal(yt.items.length,1);
  const books=await runAdapter("google_books","search",{query:"economics",limit:1},{});assert.equal(books.items.length,1);
  const fact=await runAdapter("google_factcheck","search",{query:"test",limit:1},env);assert.equal(fact.items.length,1);
  const crux=await runAdapter("google_crux","record",{origin:"https://example.com"},env);assert.equal(crux.data.record.key.origin,"https://example.com");
  const civic=await runAdapter("google_civic","elections",{},env);assert.equal(civic.items.length,1);
  const kg=await runAdapter("google_knowledge_graph","search",{query:"China",limit:1},env);assert.equal(kg.items.length,1);
  const ps=await runAdapter("google_pagespeed","analyze",{url:"https://example.com",strategy:"mobile",category:"performance"},env);assert.equal(ps.data.id,"https://example.com");assert.equal(ps.timeout_ms,35000);

  const bq=await runAdapter("bigquery","query",{query:"SELECT word FROM `bigquery-public-data.samples.shakespeare` LIMIT 1",limit:1,maximum_bytes_billed:1000000},env);assert.equal(bq.data.rows.length,1);
  const ee=await runAdapter("earthengine","asset_get",{asset:"GOOGLE/DYNAMICWORLD/V1"},env);assert.match(ee.data.name,/GOOGLE\/DYNAMICWORLD\/V1/);
  const eo=await runAdapter("google_earth_observation","catalog",{},env);assert.ok(eo.items.some(x=>x.id==="COPERNICUS/S2_SR_HARMONIZED"));
  const trends=await runAdapter("google_trends_public","top_terms",{country_code:"US",limit:1},env);assert.equal(trends.latest_refresh_date,"2026-08-15");assert.equal(trends.data.rows.length,1);
  const patents=await runAdapter("google_patents_public","search",{query:"battery",country_code:"US",from_year:2026,limit:1},env);assert.equal(patents.items.length,1);assert.equal(patents.bigquery_bytes_billed,0);assert.equal(patents.query_mode,"bounded-public-search-no-bigquery-scan");
  assert.equal(patentBigQueryCalls,0);

  console.log(JSON.stringify({ok:true,suite:"google-routing-contract",global_router:true,api_key_group:true,cloud_credentials_group:true,provider_specific_keys:true,books_anonymous:true,trends_latest_partition:true,patents_zero_bigquery:true,earth_observation_catalog:true,google_trends_alpha_catalog_only:true,request_count:calls.length}));
}finally{globalThis.fetch=realFetch}
