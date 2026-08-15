import assert from "node:assert/strict";
import {CATALOG,statusFor} from "../src/catalog.js";
import {OPERATIONS,runAdapter} from "../src/adapters.js";

const env={OPENALEX_API_KEY:"oa-test-key",SEMANTIC_SCHOLAR_API_KEY:"s2-test-key",BASE_API_KEY:"base-test-key"};
for(const p of ["openalex","semantic_scholar","base"]){
  assert.equal(statusFor(env,p)?.configured,true,`${p} should be configured`);
  assert.equal(statusFor(env,p)?.live_adapter,true,`${p} should be live`);
}
assert.equal(CATALOG.base.access,"key");
assert.deepEqual(CATALOG.base.secrets,["BASE_API_KEY"]);
assert.equal(CATALOG.base.adapter,"base.search");
assert.ok(OPERATIONS.openalex.includes("works"));
assert.ok(OPERATIONS.semantic_scholar.includes("paper_search"));
assert.ok(OPERATIONS.base.includes("search"));
await assert.rejects(()=>runAdapter("base","search",{query:"machine learning"},{}),/UPSTREAM_AUTH_FAILED/);

const oldFetch=globalThis.fetch;const calls=[];
globalThis.fetch=async(url,init={})=>{
  const u=new URL(String(url));calls.push({u,init});
  if(u.hostname==="api.openalex.org")return new Response(JSON.stringify({meta:{count:1},results:[{id:"W1",title:"OpenAlex test"}]}),{status:200,headers:{"content-type":"application/json"}});
  if(u.hostname==="api.semanticscholar.org")return new Response(JSON.stringify({total:1,data:[{paperId:"P1",title:"Semantic Scholar test"}]}),{status:200,headers:{"content-type":"application/json"}});
  if(u.hostname==="api.base-search.net")return new Response(JSON.stringify({response:{numFound:1,start:0,docs:[{dctitle:"BASE test",dccreator:["Tester"],dcyear:"2026",dcidentifier:["https://example.test/item"]}]}}),{status:200,headers:{"content-type":"application/json"}});
  throw new Error(`UNEXPECTED_FETCH:${u}`);
};
try{
  const oa=await runAdapter("openalex","works",{query:"machine learning",limit:1},env);assert.equal(oa.items.length,1);
  const s2=await runAdapter("semantic_scholar","paper_search",{query:"machine learning",limit:1},env);assert.equal(s2.items.length,1);
  const bs=await runAdapter("base","search",{query:"machine learning",limit:1},env);assert.equal(bs.items.length,1);assert.equal(bs.items[0].title,"BASE test");
  const oaCall=calls.find(x=>x.u.hostname==="api.openalex.org");assert.equal(oaCall.u.searchParams.get("api_key"),env.OPENALEX_API_KEY);
  const s2Call=calls.find(x=>x.u.hostname==="api.semanticscholar.org");assert.equal(s2Call.init.headers["x-api-key"],env.SEMANTIC_SCHOLAR_API_KEY);
  const baseCall=calls.find(x=>x.u.hostname==="api.base-search.net");assert.equal(baseCall.u.pathname,"/cgi-bin/BaseHttpSearchInterface.fcgi");assert.equal(baseCall.u.searchParams.get("func"),"PerformSearch");assert.equal(baseCall.u.searchParams.get("format"),"json");assert.equal(baseCall.u.searchParams.get("apikey"),env.BASE_API_KEY);assert.equal(baseCall.u.searchParams.get("hits"),"1");
}finally{globalThis.fetch=oldFetch}
console.log(JSON.stringify({ok:true,providers:["openalex","semantic_scholar","base"],base_live:true,secrets_redacted:true}));
